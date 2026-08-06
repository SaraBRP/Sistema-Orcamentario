import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { 
  ArrowLeft, ArrowRight, Save, Plus, Search, Trash2, Import, Calculator, 
  Settings2, FileSpreadsheet, Layers, X, Check, ChevronDown, ChevronRight,
  Indent, Outdent, GripVertical, AlertCircle, Send, Lock, CheckCircle2, XCircle, Clock, ChevronUp, MessageSquare, AlertTriangle, BarChart3
} from 'lucide-react';
import { clsx } from 'clsx';

import { CalculosHub } from '../components/calculos/CalculosHub';
import type { CalculoItem } from '../types/calculos';

type OrcamentoItem = {
  id: string;
  orcamento_id: string;
  item_eap: string;
  codigo?: string;
  banco_fonte?: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valor_unitario_mat: number;
  valor_unitario_mo: number;
  valor_unitario: number;
  valor_unitario_com_bdi: number;
  total_mat: number;
  total_mo: number;
  total: number;
  composicao_id?: string | null;
  isTemp?: boolean;
  /** Flag temporária: indica que o usuário recuou explicitamente este item,
   *  impedindo que rebuildEapCodes o re-promova automaticamente sob uma atividade mãe. */
  _manualLevel?: boolean;
  isSummary?: boolean;
  hasChildren?: boolean;
};

const STATUS_ENVIO_OPTIONS = ['Ag. Retorno', 'Cancelada', 'Encerrada', 'Consolidada', 'Perdido'];

// Função para calcular os totais hierárquicos (WBS/EAP) de forma dinâmica
// effectiveMultiplier = produto das quantidades de todas as composições ancestrais
const computeHierarchicalTotals = (itensList: OrcamentoItem[]): (OrcamentoItem & { isSummary: boolean; effectiveMultiplier: number; baseQuantidade: number; hasChildren: boolean })[] => {
  const computed = itensList.map(item => ({ ...item, isSummary: false, effectiveMultiplier: 1, baseQuantidade: item.quantidade, hasChildren: false }));

  // Constrói mapa EAP → índice para lookup eficiente
  const eapToIdx = new Map<string, number>();
  computed.forEach((item, idx) => {
    const eap = (item.item_eap || '').trim();
    if (eap) eapToIdx.set(eap, idx);
  });

  // Passo 1: calcula effectiveMultiplier e detecta quem tem filhos
  for (let i = 0; i < computed.length; i++) {
    const item = computed[i];
    const eap = (item.item_eap || '').trim();
    if (!eap) continue;

    const parts = eap.split('.');
    let multiplier = 1;
    for (let len = 1; len < parts.length; len++) {
      const ancestorEap = parts.slice(0, len).join('.');
      const aIdx = eapToIdx.get(ancestorEap);
      if (aIdx !== undefined) {
        const ancestor = computed[aIdx];
        if (ancestor.codigo && ancestor.codigo.trim() !== '') {
          const ancestorQ = ancestor.quantidade === 0 ? 1 : ancestor.quantidade;
          multiplier *= ancestorQ;
        }
        ancestor.hasChildren = true;
      }
    }
    item.effectiveMultiplier = multiplier;
  }

  // Passo 2: calcula totais BOTTOM-UP (de trás para frente)
  // Pais somam filhos diretos já calculados corretamente
  for (let i = computed.length - 1; i >= 0; i--) {
    const item = computed[i];
    const eap = (item.item_eap || '').trim();
    if (!eap) continue;

    const hasCode = item.codigo && item.codigo.trim() !== '';
    const prefix = eap + '.';

    // Filhos DIRETOS (apenas um nível abaixo)
    const directChildren = computed.filter(other => {
      const otherEap = (other.item_eap || '').trim();
      if (!otherEap.startsWith(prefix)) return false;
      const rest = otherEap.slice(prefix.length);
      return rest.length > 0 && !rest.includes('.');
    });

    if (directChildren.length === 0) {
      // Folha: sem filhos
      item.isSummary = false;
      if (hasCode) {
        const q = item.quantidade === 0 ? 1 : item.quantidade;
        item.total_mat = q * item.valor_unitario_mat * item.effectiveMultiplier;
        item.total_mo  = q * item.valor_unitario_mo  * item.effectiveMultiplier;
        item.total     = q * (item.valor_unitario_mat + item.valor_unitario_mo) * item.effectiveMultiplier;
      } else {
        item.total_mat = item.quantidade * item.valor_unitario_mat;
        item.total_mo  = item.quantidade * item.valor_unitario_mo;
        item.total     = item.quantidade * (item.valor_unitario_mat + item.valor_unitario_mo);
      }
    } else {
      // Pai: soma filhos diretos já processados (bottom-up garante que estão calculados)
      const sumMat   = directChildren.reduce((s, d) => s + d.total_mat, 0);
      const sumMo    = directChildren.reduce((s, d) => s + d.total_mo,  0);
      const sumTotal = directChildren.reduce((s, d) => s + d.total,     0);

      if (hasCode) {
        // Composição com filhos explodidos: agrega filhos mas NÃO é summary
        item.isSummary = false;
        item.total_mat = sumMat;
        item.total_mo  = sumMo;
        item.total     = sumTotal;
        // Mantém valores unitários do cadastro para referência (mat/mo unit)
      } else {
        // Etapa/atividade manual com filhos: é summary → zera campos editáveis
        item.isSummary = true;
        item.total_mat = sumMat;
        item.total_mo  = sumMo;
        item.total     = sumTotal;
        item.valor_unitario_mat = 0;
        item.valor_unitario_mo  = 0;
        item.valor_unitario     = 0;
        item.quantidade         = 0;
      }
    }
  }

  return computed;
};

// Busca filhos e subcomposições de uma composição recursivamente para explodir na planilha
const fetchCompositionChildrenRecursively = async (
  composicaoId: string,
  parentEap: string,
  orcamentoId: string,
  bFactor: number
): Promise<OrcamentoItem[]> => {
  const result: OrcamentoItem[] = [];

  try {
    const { data, error } = await supabase
      .schema('engenharia')
      .from('composicao_itens')
      .select(`
        *,
        insumo:insumos (*),
        sub_composicao:composicoes!sub_composicao_id (*)
      `)
      .eq('composicao_id', composicaoId);

    if (error || !data) return [];

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const childEap = `${parentEap}.${i + 1}`;

      if (item.sub_composicao_id && item.sub_composicao) {
        // Busca CDUs da subcomposição para obter os custos
        const { data: cduData } = await supabase
          .schema('engenharia')
          .from('v_composicoes_cdu')
          .select('*')
          .eq('id', item.sub_composicao_id)
          .single();

        const matCost = parseFloat(cduData?.mat_sem_desoneracao || cduData?.custo_sem_desoneracao || cduData?.cdu || 0);
        const moCost = parseFloat(cduData?.mo_sem_desoneracao || 0);

        const subcompItem: OrcamentoItem = {
          id: `temp-subcomp-${Date.now()}-${Math.random()}-${i}`,
          orcamento_id: orcamentoId,
          item_eap: childEap,
          codigo: item.sub_composicao.codigo,
          banco_fonte: item.sub_composicao.fonte || 'Própria',
          descricao: item.sub_composicao.descricao,
          unidade: item.sub_composicao.unidade || 'un',
          quantidade: parseFloat(item.coeficiente || 1),
          valor_unitario_mat: matCost,
          valor_unitario_mo: moCost,
          valor_unitario: matCost + moCost,
          valor_unitario_com_bdi: (matCost + moCost) * bFactor,
          total_mat: parseFloat(item.coeficiente || 1) * matCost,
          total_mo: parseFloat(item.coeficiente || 1) * moCost,
          total: parseFloat(item.coeficiente || 1) * (matCost + moCost),
          composicao_id: item.sub_composicao_id
        };

        result.push(subcompItem);

        // Busca descendentes recursivamente
        const descendants = await fetchCompositionChildrenRecursively(
          item.sub_composicao_id,
          childEap,
          orcamentoId,
          bFactor
        );

        // Multiplica a quantidade dos descendentes pelo coeficiente do pai
        descendants.forEach(d => {
          d.quantidade = d.quantidade * subcompItem.quantidade;
          d.total_mat = d.quantidade * d.valor_unitario_mat;
          d.total_mo = d.quantidade * d.valor_unitario_mo;
          d.total = d.quantidade * d.valor_unitario;
        });

        result.push(...descendants);
      } else if (item.insumo_id && item.insumo) {
        const val = parseFloat(item.insumo.valor || item.insumo.valor_nao_desonerado || 0);
        let matCost = 0;
        let moCost = 0;

        if (item.insumo.tipo === 'Mão de Obra') {
          moCost = val;
        } else {
          matCost = val;
        }

        const insumoItem: OrcamentoItem = {
          id: `temp-insumo-${Date.now()}-${Math.random()}-${i}`,
          orcamento_id: orcamentoId,
          item_eap: childEap,
          codigo: item.insumo.codigo,
          banco_fonte: item.insumo.fonte_preco || 'Própria',
          descricao: item.insumo.descricao,
          unidade: item.insumo.unidade || 'un',
          quantidade: parseFloat(item.coeficiente || 1),
          valor_unitario_mat: matCost,
          valor_unitario_mo: moCost,
          valor_unitario: matCost + moCost,
          valor_unitario_com_bdi: (matCost + moCost) * bFactor,
          total_mat: parseFloat(item.coeficiente || 1) * matCost,
          total_mo: parseFloat(item.coeficiente || 1) * moCost,
          total: parseFloat(item.coeficiente || 1) * (matCost + moCost),
          composicao_id: null
        };

        result.push(insumoItem);
      }
    }
  } catch (err) {
    console.error('Erro ao buscar filhos da composição:', err);
  }

  return result;
};

function ModalStatusEnvio({
  onClose,
  onSelectStatusEnvio,
}: {
  onClose: () => void;
  onSelectStatusEnvio: (statusEnvio: string) => void;
}) {
  const [selected, setSelected] = useState<string>('Ag. Retorno');

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-slate-800 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-base text-slate-800">Status de Envio ao Cliente</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 font-medium">
          Selecione a situação atual do envio deste orçamento para acompanhamento no pipeline comercial:
        </p>

        <div className="space-y-2">
          {STATUS_ENVIO_OPTIONS.map((opt) => (
            <label
              key={opt}
              onClick={() => setSelected(opt)}
              className={clsx(
                'flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all',
                selected === opt
                  ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 font-bold text-emerald-950'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
              )}
            >
              <div className="flex items-center gap-2.5 text-xs">
                <div
                  className={clsx(
                    'w-4 h-4 rounded-full border flex items-center justify-center',
                    selected === opt ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                  )}
                >
                  {selected === opt && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
                <span>{opt}</span>
              </div>
            </label>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSelectStatusEnvio(selected)}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirmar e Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrcamentoBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [orcamento, setOrcamento] = useState<any>(null);
  const [itens, setItens] = useState<OrcamentoItem[]>([]);
  const [calculos, setCalculos] = useState<CalculoItem[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'planilha' | 'memoria_calculo'>('planilha');
  const [higherRevisionObj, setHigherRevisionObj] = useState<any>(null);
  const [showStatusEnvioModal, setShowStatusEnvioModal] = useState(false);
  const [_pendingStatusEnvio, _setPendingStatusEnvio] = useState<string>('Ag. Retorno');

  const handleSaveCalculo = (novoCalculo: CalculoItem) => {
    setCalculos(prev => {
      const idx = prev.findIndex(c => c.id === novoCalculo.id);
      let nextList: CalculoItem[];
      if (idx >= 0) {
        nextList = [...prev];
        nextList[idx] = novoCalculo;
      } else {
        nextList = [...prev, novoCalculo];
      }
      if (id) {
        try {
          localStorage.setItem(`orcamento_calculos_${id}`, JSON.stringify(nextList));
        } catch (e) { console.error(e); }
      }
      return nextList;
    });

    if (novoCalculo.vinculos && novoCalculo.vinculos.length > 0) {
      setItens(prevItens => {
        const copy = [...prevItens];
        let updatedAny = false;

        novoCalculo.vinculos.forEach(vinc => {
          const itemIdx = copy.findIndex(i => (i.item_eap || '').trim() === vinc.item_eap.trim());
          if (itemIdx >= 0) {
            const fator = vinc.fatorMultiplicativo || 1;
            let valBase = 0;
            const chave = vinc.chaveResultado || (vinc as any).campoResultado;
            if (chave === 'volumeConcretoM3') valBase = novoCalculo.resultados.volumeConcretoM3 || 0;
            else if (chave === 'areaFormaM2') valBase = novoCalculo.resultados.areaFormaM2 || 0;
            else if (chave === 'pesoAcoKg') valBase = novoCalculo.resultados.pesoAcoKg || 0;
            else if (chave === 'areaLiquidaM2') valBase = novoCalculo.resultados.areaLiquidaM2 || 0;
            else if (chave === 'escavacaoM3') valBase = novoCalculo.resultados.escavacaoM3 || 0;

            const novaQtd = Math.round(valBase * fator * 100) / 100;
            if (copy[itemIdx].quantidade !== novaQtd) {
              const targetItem = copy[itemIdx];
              const total_mat = novaQtd * (targetItem.valor_unitario_mat || 0);
              const total_mo = novaQtd * (targetItem.valor_unitario_mo || 0);
              const total = novaQtd * (targetItem.valor_unitario || 0);
              copy[itemIdx] = { 
                ...targetItem, 
                quantidade: novaQtd,
                total_mat,
                total_mo,
                total 
              };
              updatedAny = true;
            }
          }
        });

        if (updatedAny) {
          setHasUnsavedChanges(true);
        }
        return copy;
      });
    }
  };

  const handleDeleteCalculo = (calcId: string) => {
    setCalculos(prev => {
      const next = prev.filter(c => c.id !== calcId);
      if (id) {
        try {
          localStorage.setItem(`orcamento_calculos_${id}`, JSON.stringify(next));
        } catch (e) { console.error(e); }
      }
      return next;
    });
  };

  const isReadOnly = useMemo(() => {
    return higherRevisionObj !== null;
  }, [higherRevisionObj]);

  // Memoiza os itens com cálculos hierárquicos aplicados
  const computedItens = useMemo(() => {
    return computeHierarchicalTotals(itens);
  }, [itens]);

  const [loading, setLoading] = useState(true);
  const [collapsedEaps, setCollapsedEaps] = useState<Set<string>>(() => {
    try {
      if (id) {
        const saved = localStorage.getItem(`orcamento_collapsed_${id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return new Set(parsed);
        }
      }
    } catch (e) {
      console.error(e);
    }
    return new Set();
  });
  const [showOutlineMenu, setShowOutlineMenu] = useState(false);

  // Persistência da Estrutura de Tópicos no LocalStorage por Orçamento
  useEffect(() => {
    if (id) {
      try {
        const saved = localStorage.getItem(`orcamento_collapsed_${id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setCollapsedEaps(new Set(parsed));
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [id]);

  useEffect(() => {
    if (id && collapsedEaps) {
      try {
        localStorage.setItem(`orcamento_collapsed_${id}`, JSON.stringify(Array.from(collapsedEaps)));
      } catch (e) {
        console.error(e);
      }
    }
  }, [collapsedEaps, id]);

  // Sistema de Desfazer (Ctrl + Z)
  const historyRef = useRef<OrcamentoItem[][]>([]);

  const pushUndoSnapshot = (currentItens: OrcamentoItem[]) => {
    if (!currentItens || currentItens.length === 0) return;
    const snapshot = currentItens.map(item => ({ ...item }));
    historyRef.current.push(snapshot);
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
    }
  };

  const handleUndo = () => {
    if (historyRef.current.length === 0) return;
    const previousState = historyRef.current.pop();
    if (previousState) {
      setItens(rebuildEapCodes(previousState));
      setHasUnsavedChanges(true);
    }
  };

  // Alterna o colapso/expansão de um item EAP
  const toggleCollapse = (eap: string) => {
    setCollapsedEaps(prev => {
      const copy = new Set(prev);
      if (copy.has(eap)) {
        copy.delete(eap);
      } else {
        copy.add(eap);
      }
      return copy;
    });
  };

  // Colapsa todas as atividades resumo e composições com filhos
  const collapseAll = () => {
    const collapsibleEaps = computedItens
      .filter(item => item.isSummary || item.hasChildren)
      .map(item => item.item_eap);
    setCollapsedEaps(new Set(collapsibleEaps));
    setShowOutlineMenu(false);
  };

  // Expande todas as atividades
  const expandAll = () => {
    setCollapsedEaps(new Set());
    setShowOutlineMenu(false);
  };

  // Colapsa a EAP até um nível específico
  const collapseToLevel = (targetLevel: number) => {
    const collapsibleEaps = computedItens
      .filter(item => (item.isSummary || item.hasChildren) && getEapLevel(item.item_eap) >= targetLevel)
      .map(item => item.item_eap);
    setCollapsedEaps(new Set(collapsibleEaps));
    setShowOutlineMenu(false);
  };

  // Verifica se uma linha deve ser ocultada (se algum ascendente estiver colapsado)
  const isRowHidden = (eap: string) => {
    if (!eap) return false;
    const parts = eap.split('.');
    for (let i = 1; i < parts.length; i++) {
      const ancestor = parts.slice(0, i).join('.');
      if (collapsedEaps.has(ancestor)) {
        return true;
      }
    }
    return false;
  };
  const [searchParams] = useSearchParams();
  const isGestorMode = searchParams.get('modo') === 'validacao' || searchParams.get('gestor') === 'true';

  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [removedItemIds, setRemovedItemIds] = useState<string[]>([]);
  
  // BDI & Config Drawer
  const [showConfig, setShowConfig] = useState(false);
  const [configData, setConfigData] = useState({
    nome: '',
    descricao: '',
    cliente: '',
    projeto: '',
    gestor_cliente: '',
    status: '',
    bdi_ac: 0,
    bdi_s: 0,
    bdi_g: 0,
    bdi_r: 0,
    bdi_df: 0,
    bdi_l: 0,
    bdi_i: 0
  });

  // Toggle de visualização de valores com BDI
  const [exibirBdi, setExibirBdi] = useState(false);

  // Import Drawer
  const [showImportDrawer, setShowImportDrawer] = useState(false);
  const [importTab, setImportTab] = useState<'insumos_proprios' | 'composicoes_proprias' | 'insumos_sistema' | 'composicoes_sistema'>('insumos_proprios');
  const [importSearch, setImportSearch] = useState('');
  const [importResults, setImportResults] = useState<any[]>([]);
  const [loadingImport, setLoadingImport] = useState(false);
  const [importedItemIds, setImportedItemIds] = useState<Record<string, boolean>>({});

  // Comparison Drawer State
  const [showComparisonDrawer, setShowComparisonDrawer] = useState(false);
  const [comparisonItem, setComparisonItem] = useState<OrcamentoItem | null>(null);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState<{
    proprio: { mat: number; mo: number } | null;
    sistema: { mat: number; mo: number; fonte?: string } | null;
  } | null>(null);

  const handleOpenComparison = async (item: OrcamentoItem) => {
    if (!item.codigo) return;
    setComparisonItem(item);
    setShowComparisonDrawer(true);
    setLoadingComparison(true);
    setComparisonData(null);

    try {
      let proprioData: { mat: number; mo: number } | null = null;
      let sistemaData: { mat: number; mo: number; fonte?: string } | null = null;

      // 1. Query v_composicoes_cdu
      const { data: compData, error: compErr } = await supabase
        .schema('engenharia')
        .from('v_composicoes_cdu')
        .select('*')
        .eq('codigo', item.codigo);

      if (!compErr && compData && compData.length > 0) {
        compData.forEach(row => {
          const mat = parseFloat(row.mat_sem_desoneracao || row.custo_sem_desoneracao || row.cdu || 0);
          const mo = parseFloat(row.mo_sem_desoneracao || 0);
          if (row.fonte === 'Própria') {
            proprioData = { mat, mo };
          } else {
            sistemaData = { mat, mo, fonte: row.fonte };
          }
        });
      }

      // 2. Query insumos
      const { data: insumoData, error: insumoErr } = await supabase
        .schema('engenharia')
        .from('insumos')
        .select('*')
        .eq('codigo', item.codigo);

      if (!insumoErr && insumoData && insumoData.length > 0) {
        insumoData.forEach(row => {
          const val = parseFloat(row.valor || row.valor_nao_desonerado || 0);
          let mat = 0;
          let mo = 0;
          if (row.tipo === 'Mão de Obra') {
            mo = val;
          } else {
            mat = val;
          }

          if (row.fonte_preco === 'Própria') {
            proprioData = { mat, mo };
          } else {
            sistemaData = { mat, mo, fonte: row.fonte_preco };
          }
        });
      }

      setComparisonData({ proprio: proprioData, sistema: sistemaData });
    } catch (err) {
      console.error('Erro ao buscar dados comparativos:', err);
    } finally {
      setLoadingComparison(false);
    }
  };

  const handleApplyReferencePrice = (type: 'proprio' | 'sistema') => {
    if (!comparisonItem || !comparisonData) return;
    const ref = type === 'proprio' ? comparisonData.proprio : comparisonData.sistema;
    if (!ref) return;

    setItens(prev => {
      return prev.map(item => {
        if (item.id === comparisonItem.id) {
          const newMat = ref.mat;
          const newMo = ref.mo;
          const newUnit = newMat + newMo;
          return {
            ...item,
            valor_unitario_mat: newMat,
            valor_unitario_mo: newMo,
            valor_unitario: newUnit,
            valor_unitario_com_bdi: newUnit * bdiFactor,
            total_mat: item.quantidade * newMat,
            total_mo: item.quantidade * newMo,
            total: item.quantidade * newUnit
          };
        }
        return item;
      });
    });
    setHasUnsavedChanges(true);
    setShowComparisonDrawer(false);
  };

  useEffect(() => {
    if (id) {
      loadOrcamento();
    }
  }, [id]);

  useEffect(() => {
    if (showImportDrawer) {
      searchImportItems();
    }
  }, [importTab, importSearch, showImportDrawer]);

  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set());
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
  const [targetImportRowIndex, setTargetImportRowIndex] = useState<number | null>(null);

  // Controle de Navegação por Células (Grid Excel Style)
  const [activeCell, setActiveCell] = useState<{ rowIndex: number; colIndex: number } | null>(null);
  const [isEditingCell, setIsEditingCell] = useState<boolean>(false);
  const [shouldSelectAll, setShouldSelectAll] = useState<boolean>(false);

  const isCellEditable = (item: OrcamentoItem, colIndex: number, exibirBdiParam: boolean): boolean => {
    if (!item || isReadOnly) return false;
    const itemIndex = itens.findIndex(x => x.id === item.id);
    const isChild = itemIndex !== -1 ? isChildOfComposition(itemIndex, itens) : false;

    switch (colIndex) {
      case 0: // item_eap
        return true;
      case 1: // descricao
        if (isChild) return false;
        return !item.codigo;
      case 2: // unidade
        if (isChild) return false;
        return !item.isSummary && !item.codigo;
      case 3: // quantidade
        return !item.isSummary;
      case 4: // valor_unitario_mat
        return !exibirBdiParam && !item.isSummary;
      case 5: // valor_unitario_mo
        return !exibirBdiParam && !item.isSummary;
      default:
        return false;
    }
  };

  const checkCurrentQuantityValid = (rowIndex: number): boolean => {
    const item = computedItens[rowIndex];
    if (!item) return true;
    const hasValues = (item.item_eap || '').trim() !== '' || (item.descricao || '').trim() !== '';
    if (!hasValues) return true;
    if (isCellEditable(item, 3, exibirBdi)) {
      return item.quantidade > 0;
    }
    return true;
  };

  const handleCellClick = (rowIndex: number, colIndex: number, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (activeCell && activeCell.rowIndex !== rowIndex) {
      if (!checkCurrentQuantityValid(activeCell.rowIndex)) {
        setIsEditingCell(true);
        return;
      }
    }
    setActiveCell({ rowIndex, colIndex });
    setIsEditingCell(false);
  };

  const navigateCell = (deltaRow: number, deltaCol: number) => {
    if (computedItens.length === 0) return;

    // Se o item atual estiver com quantidade zerada, bloqueia mudar de linha até preencher!
    if (activeCell && deltaRow !== 0) {
      if (!checkCurrentQuantityValid(activeCell.rowIndex)) {
        setIsEditingCell(true);
        return;
      }
    }

    setActiveCell(prev => {
      const currentRow = prev ? prev.rowIndex : 0;
      const currentCol = prev ? prev.colIndex : 0;

      let nextRow = currentRow;
      if (deltaRow !== 0) {
        const step = deltaRow > 0 ? 1 : -1;
        let checkRow = currentRow + step;
        while (checkRow >= 0 && checkRow < computedItens.length) {
          const item = computedItens[checkRow];
          if (item && !isRowHidden(item.item_eap)) {
            nextRow = checkRow;
            break;
          }
          checkRow += step;
        }
      }

      const nextCol = Math.max(0, Math.min(9, currentCol + deltaCol));
      setSelectedRowIndex(nextRow);
      setSelectedRowIndices(new Set([nextRow]));
      return { rowIndex: nextRow, colIndex: nextCol };
    });
    setIsEditingCell(false);
  };

  const getColField = (colIndex: number): keyof OrcamentoItem | null => {
    switch (colIndex) {
      case 0: return 'item_eap';
      case 1: return 'descricao';
      case 2: return 'unidade';
      case 3: return 'quantidade';
      case 4: return 'valor_unitario_mat';
      case 5: return 'valor_unitario_mo';
      default: return null;
    }
  };

  useEffect(() => {
    if (!activeCell) return;
    if (isEditingCell) {
      const input = document.getElementById(`cell-input-${activeCell.rowIndex}-${activeCell.colIndex}`) as HTMLInputElement | null;
      if (input) {
        input.focus();
        if (shouldSelectAll) {
          try {
            if (input.type === 'text' && input.setSelectionRange) {
              input.setSelectionRange(0, input.value.length);
            } else if (input.select) {
              input.select();
            }
          } catch (err) {
            // Safe fallback
          }
          setShouldSelectAll(false);
        }
      }
    } else {
      const td = document.getElementById(`cell-td-${activeCell.rowIndex}-${activeCell.colIndex}`);
      if (td) {
        td.focus();
      }
    }
  }, [activeCell, isEditingCell, shouldSelectAll]);

  const handleTdKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
    if (isEditingCell) return;

    const item = computedItens[rowIndex];
    const editable = item ? isCellEditable(item, colIndex, exibirBdi) : false;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      navigateCell(-1, 0);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      navigateCell(1, 0);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigateCell(0, -1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigateCell(0, 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (editable) {
        setShouldSelectAll(true);
        setIsEditingCell(true);
      } else {
        navigateCell(1, 0);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditingCell(false);
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      if (editable) {
        e.preventDefault();
        const field = getColField(colIndex);
        if (field) {
          handleCellChange(rowIndex, field, '');
        }
        setIsEditingCell(true);
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      if (editable) {
        e.preventDefault();
        const field = getColField(colIndex);
        if (field) {
          handleCellChange(rowIndex, field, e.key);
        }
        setIsEditingCell(true);
      }
    }
  };

  const handleInputKeyDownInCell = (e: React.KeyboardEvent, rowIndex: number, _colIndex: number) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsEditingCell(false);
      navigateCell(1, 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsEditingCell(false);
      navigateCell(-1, 0);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsEditingCell(false);
      navigateCell(1, 0);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditingCell(false);
    } else {
      handleKeyDown(e, rowIndex);
    }
  };

  // Controle de redimensionamento da coluna "Descrição"
  const [descColWidth, setDescColWidth] = useState(380);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = descColWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(200, startWidth + (moveEvent.clientX - startX));
      setDescColWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Insere uma nova linha em branco sobre a linha selecionada
  const insertRowAbove = (index: number) => {
    setItens(prev => {
      const copy = [...prev];
      const newRow = createBlankRow(id!, copy.length + 1);
      if (copy[index] && copy[index].item_eap) {
        newRow.item_eap = copy[index].item_eap;
      } else if (index > 0 && copy[index - 1] && copy[index - 1].item_eap) {
        newRow.item_eap = copy[index - 1].item_eap;
      } else {
        newRow.item_eap = '1';
      }
      copy.splice(index, 0, newRow);
      return rebuildEapCodes(copy);
    });
    setSelectedRowIndex(index);
    setHasUnsavedChanges(true);
  };

  // Calcula o EAP sequencial de acordo com a posição da linha
  // Para itens de texto digitado (sem código), não coloca dentro de composições
  const getSequentialEapForIndex = (index: number, currentList: OrcamentoItem[]): string => {
    if (index === 0) return '1';
    
    // Procura o último item preenchido acima do index atual
    let lastValidItem = null;
    for (let i = index - 1; i >= 0; i--) {
      const item = currentList[i];
      if ((item.item_eap || '').trim() !== '' || (item.descricao || '').trim() !== '') {
        lastValidItem = item;
        break;
      }
    }

    if (!lastValidItem || !lastValidItem.item_eap) return '1';

    const lastHasCode = lastValidItem.codigo && lastValidItem.codigo.trim() !== '';
    const lastLevel = getEapLevel(lastValidItem.item_eap);

    // Itens de texto digitado após composições/insumos vão para o nível da atividade-pai
    // (nunca entram automaticamente dentro da composição)
    if (lastHasCode) {
      // Sobe na hierarquia até encontrar um item sem código (atividade descritiva)
      // ou retorna ao nível 0 (raiz)
      if (lastLevel === 0) {
        // Próximo item raiz
        const rootNum = parseInt(lastValidItem.item_eap.split('.')[0], 10) || 1;
        return String(rootNum + 1);
      }
      // Está dentro de algo: sobe para o nível da composição-raiz do bloco
      const rootNum = parseInt((lastValidItem.item_eap || '').split('.')[0], 10) || 1;
      return String(rootNum + 1);
    }

    // Item anterior sem código: segue na sequência
    const parts = lastValidItem.item_eap.split('.');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      parts[parts.length - 1] = String(lastNum + 1);
      return parts.join('.');
    }
    return lastValidItem.item_eap + '.1';
  };

  // Reconstrói todos os códigos EAP baseados nos níveis hierárquicos após reordenação
  // Regras:
  // 1. Itens com código após itens sem código são auto-indentados (+1 nível)
  // 2. Filhos de um item promovido recebem o mesmo offset do pai
  // 3. Novos itens sem código e sem EAP após itens com código vão para nível 0
  const rebuildEapCodes = (list: OrcamentoItem[]): OrcamentoItem[] => {
    const copy = list.map(item => ({ ...item }));
    const counters: number[] = [];

    let prevItem: OrcamentoItem | null = null;
    let prevLevel = 0;

    // Rastreia quando um item é promovido (auto-indentado) e qual é o offset
    // para que seus filhos também sejam promovidos pelo mesmo valor
    let promotedOriginalEap: string | null = null;
    let promotedOffset = 0;

    for (let i = 0; i < copy.length; i++) {
      const item = copy[i];
      if ((item.item_eap || '').trim() === '' && (item.descricao || '').trim() === '') {
        continue;
      }

      const originalEap = (item.item_eap || '').trim();
      const hasCode = item.codigo && item.codigo.trim() !== '';

      let level = 0;
      if (originalEap !== '') {
        level = getEapLevel(originalEap);
      }

      // Verifica se está dentro da árvore do item promovido
      if (promotedOriginalEap !== null) {
        if (!item._manualLevel && originalEap.startsWith(promotedOriginalEap + '.')) {
          // Filho de um item promovido: aplica o mesmo offset
          level = level + promotedOffset;
        } else {
          // Saíu da árvore promovida (ou item marcado com nível manual explícito)
          promotedOriginalEap = null;
          promotedOffset = 0;
        }
      }

      // Regra de auto-indentação: item com código após item sem código
      // _manualLevel=true: usuário recuou explicitamente → não re-promover
      if (prevItem && promotedOriginalEap === null && !item._manualLevel) {
        const prevHasCode = prevItem.codigo && prevItem.codigo.trim() !== '';

        // Se o item anterior pertence a uma composição, não promove o item atual a seu filho
        const isPrevChildOfComposition = (() => {
          if (!prevItem) return false;
          const prevEap = (prevItem.item_eap || '').trim();
          if (!prevEap) return false;
          for (let k = i - 1; k >= 0; k--) {
            const possibleParent = copy[k];
            if (possibleParent.codigo && possibleParent.codigo.trim() !== '') {
              if (prevEap.startsWith(possibleParent.item_eap + '.')) {
                return true;
              }
            }
          }
          return false;
        })();

        if (hasCode && !prevHasCode && level <= prevLevel && !isPrevChildOfComposition) {
          const newLevel = prevLevel + 1;
          const offset = newLevel - level;
          // Registra a promoção para propagar aos filhos
          if (originalEap !== '') {
            promotedOriginalEap = originalEap;
            promotedOffset = offset;
          }
          level = newLevel;
        }

        // Novo item sem código e sem EAP após item com código: vai para nível 0
        if (!hasCode && prevHasCode && !originalEap) {
          level = 0;
        }
      }

      // Limpa a flag após ter sido respeitada nesta passagem
      if (item._manualLevel) {
        delete item._manualLevel;
      }

      counters.length = level + 1;
      
      if (counters[level] === undefined) {
        counters[level] = 1;
      } else {
        counters[level]++;
      }

      const parts = [];
      for (let j = 0; j <= level; j++) {
        parts.push(counters[j] || 1);
      }
      item.item_eap = parts.join('.');

      prevItem = item;
      prevLevel = level;
    }

    return copy;
  };

  // Manipuladores de Drag and Drop (Reordenação de Linhas)
  const handleDragStart = (e: React.DragEvent, index: number) => {
    const item = itens[index];
    if ((item.item_eap || '').trim() === '' && (item.descricao || '').trim() === '') {
      e.preventDefault();
      return;
    }
    setDraggedRowIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, _index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedRowIndex === null || draggedRowIndex === targetIndex) return;

    setItens(prev => {
      const copy = [...prev];
      const [draggedItem] = copy.splice(draggedRowIndex, 1);
      copy.splice(targetIndex, 0, draggedItem);
      return rebuildEapCodes(copy);
    });
    setDraggedRowIndex(null);
    setHasUnsavedChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedRowIndex(null);
  };

  const createBlankRow = (orcamentoId: string, seq: number): OrcamentoItem => {
    return {
      id: `blank-${Date.now()}-${seq}-${Math.random()}`,
      orcamento_id: orcamentoId,
      item_eap: '',
      descricao: '',
      unidade: '',
      quantidade: 0,
      valor_unitario_mat: 0,
      valor_unitario_mo: 0,
      valor_unitario: 0,
      valor_unitario_com_bdi: 0,
      total_mat: 0,
      total_mo: 0,
      total: 0
    };
  };

  const isBlankRow = (item: OrcamentoItem) => {
    return (item.item_eap || '').trim() === '' && 
           (item.descricao || '').trim() === '' && 
           (!item.codigo || item.codigo.trim() === '') &&
           (!item.quantidade || item.quantidade === 0) &&
           (!item.valor_unitario_mat || item.valor_unitario_mat === 0) &&
           (!item.valor_unitario_mo || item.valor_unitario_mo === 0);
  };

  const ensureSingleTrailingBlankRow = (list: OrcamentoItem[], orcamentoId: string): OrcamentoItem[] => {
    const copy = [...list];
    while (copy.length > 0 && isBlankRow(copy[copy.length - 1])) {
      copy.pop();
    }
    copy.push(createBlankRow(orcamentoId, copy.length + 1));
    return copy;
  };

  // Busca o nível máximo permitido para o item na linha 'index'
  const getMaxAllowedLevel = (index: number, list: OrcamentoItem[]): number => {
    for (let i = index - 1; i >= 0; i--) {
      const item = list[i];
      if (item.codigo && item.codigo.trim() !== '') {
        return getEapLevel(item.item_eap || '1');
      }
    }
    return index;
  };

  // Indentar linha (Recuar para a direita -> Torna-se subitem)
  const getTopLevelSelectedIndices = (indices: Set<number>, list: OrcamentoItem[]): number[] => {
    const sorted = Array.from(indices).sort((a, b) => a - b);
    const result: number[] = [];

    for (const idx of sorted) {
      const item = list[idx];
      if (!item) continue;

      // Verifica se este item é descendente de outro item já selecionado
      const hasSelectedAncestor = result.some(parentIdx => {
        const parent = list[parentIdx];
        return parent && item.item_eap.startsWith(parent.item_eap + '.');
      });

      if (!hasSelectedAncestor) {
        result.push(idx);
      }
    }

    return result;
  };

  const handleRowClick = (index: number, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Evita selecionar se o clique foi em um botão ou elemento interativo
    if (target.closest('button') || target.closest('a')) return;

    if (activeCell && activeCell.rowIndex !== index) {
      if (!checkCurrentQuantityValid(activeCell.rowIndex)) {
        setIsEditingCell(true);
        return;
      }
    }

    setSelectedRowIndex(index);

    setSelectedRowIndices(prev => {
      const copy = new Set(prev);
      if (e.ctrlKey || e.metaKey) {
        // Seleção múltipla com CTRL
        if (copy.has(index)) {
          copy.delete(index);
        } else {
          copy.add(index);
        }
      } else if (e.shiftKey && selectedRowIndex !== null) {
        // Seleção de intervalo com SHIFT
        copy.clear();
        const start = Math.min(selectedRowIndex, index);
        const end = Math.max(selectedRowIndex, index);
        for (let i = start; i <= end; i++) {
          copy.add(i);
        }
      } else {
        // Seleção única comum
        copy.clear();
        copy.add(index);
      }
      return copy;
    });
  };

  const handleInputFocus = (index: number) => {
    setSelectedRowIndex(index);
    setSelectedRowIndices(prev => {
      if (prev.has(index)) return prev;
      return new Set([index]);
    });
  };

  const indentMultipleRows = () => {
    const targets = Array.from(selectedRowIndices);
    if (targets.length === 0 && selectedRowIndex !== null) {
      targets.push(selectedRowIndex);
    }
    if (targets.length === 0) return;

    setItens(prev => {
      pushUndoSnapshot(prev);
      let copy = [...prev];
      const topSelected = getTopLevelSelectedIndices(new Set(targets), copy);

      let altered = false;
      for (const index of topSelected) {
        if (index === 0) continue; // Primeira linha não pode ser indentada

        // Insumos/subcomposições que pertencem a uma composição não podem ser desvinculados/indentados individualmente
        if (isChildOfComposition(index, copy)) {
          continue;
        }

        const current = { ...copy[index] };
        const oldEap = (current.item_eap || '').trim();
        const currentLevel = getEapLevel(oldEap || '1');
        const maxLevel = getMaxAllowedLevel(index, copy);

        if (currentLevel >= maxLevel) {
          continue;
        }

        current.item_eap = (current.item_eap || '1') + '.1';
        copy[index] = current;
        altered = true;

        if (oldEap) {
          const prefix = oldEap + '.';
          for (let j = index + 1; j < copy.length; j++) {
            const itemEap = (copy[j].item_eap || '').trim();
            if (itemEap.startsWith(prefix)) {
              copy[j] = {
                ...copy[j],
                item_eap: itemEap + '.1'
              };
            } else {
              break;
            }
          }
        }
      }

      if (!altered) return prev;
      return rebuildEapCodes(copy);
    });
    setHasUnsavedChanges(true);
  };

  const outdentMultipleRows = () => {
    const targets = Array.from(selectedRowIndices);
    if (targets.length === 0 && selectedRowIndex !== null) {
      targets.push(selectedRowIndex);
    }
    if (targets.length === 0) return;

    setItens(prev => {
      pushUndoSnapshot(prev);
      let copy = [...prev];
      const topSelected = getTopLevelSelectedIndices(new Set(targets), copy);

      let altered = false;
      for (const index of topSelected) {
        // Insumos/subcomposições que pertencem a uma composição não podem ser desvinculados/recuados individualmente
        if (isChildOfComposition(index, copy)) {
          continue;
        }

        const current = { ...copy[index] };
        const oldEap = (current.item_eap || '').trim();
        if (!oldEap) continue;

        const parts = oldEap.split('.');
        const hasCode = !!(current.codigo && current.codigo.trim() !== '');

        if (parts.length <= 1) {
          if (!hasCode) continue; // atividade manual já raiz → não faz nada
          // item com código no nível raiz: marca _manualLevel e continua
          // (rebuildEapCodes vai mantê-lo no nível 0 sem re-promover)
          copy[index] = { ...current, _manualLevel: true };
          altered = true;
          continue;
        }

        parts.pop();
        const newEap = parts.join('.');
        current.item_eap = newEap;
        current._manualLevel = true; // Sempre marca _manualLevel ao recuar manualmente
        copy[index] = current;
        altered = true;

        // Propaga o recuo para os filhos desta subárvore
        const prefix = oldEap + '.';
        for (let j = index + 1; j < copy.length; j++) {
          const itemEap = (copy[j].item_eap || '').trim();
          if (itemEap.startsWith(prefix)) {
            const cParts = itemEap.split('.');
            if (cParts.length > 1) {
              cParts.pop();
              copy[j] = {
                ...copy[j],
                item_eap: cParts.join('.')
              };
            }
          } else {
            break;
          }
        }
      }

      if (!altered) return prev;
      return rebuildEapCodes(copy);
    });
    setHasUnsavedChanges(true);
  };

  // Atalho de teclado Alt+Shift+Seta para a Direita / Esquerda e tecla Insert (evento local)
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.altKey && e.shiftKey) {
      if (e.key === 'ArrowRight' || e.key === 'Right') {
        e.preventDefault();
        indentMultipleRows();
      } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
        e.preventDefault();
        outdentMultipleRows();
      }
    } else if (e.key === 'Insert') {
      e.preventDefault();
      insertRowAbove(index);
    }
  };

  // Efeito global para capturar os atalhos de teclado de forma robusta
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isEditingInput = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        setIsEditingCell(false);
        handleUndo();
        return;
      }

      if (e.altKey && e.shiftKey) {
        if (e.key === 'ArrowRight' || e.key === 'Right') {
          e.preventDefault();
          indentMultipleRows();
        } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
          e.preventDefault();
          outdentMultipleRows();
        }
      } else if (e.key === 'Insert') {
        if (isEditingInput) return; // Evita inserir linha quando está digitando texto
        e.preventDefault();
        const targetIndex = selectedRowIndex !== null ? selectedRowIndex : (selectedRowIndices.size > 0 ? Math.min(...Array.from(selectedRowIndices)) : null);
        if (targetIndex !== null && targetIndex !== -1) {
          insertRowAbove(targetIndex);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [selectedRowIndices, selectedRowIndex, itens]);

  const loadOrcamento = async () => {
    setLoading(true);
    try {
      // 1. Carrega cabeçalho
      const { data: orcData, error: orcError } = await supabase
        .schema('engenharia')
        .from('orcamentos')
        .select('*')
        .eq('id', id)
        .single();
      
      if (orcError) throw orcError;
      const localObs = id ? localStorage.getItem(`orcamento_obs_gestor_${id}`) : null;
      const effectiveObs = orcData.observacao_gestor || localObs || '';
      setOrcamento({
        ...orcData,
        observacao_gestor: effectiveObs
      });
      if (effectiveObs) {
        setObservacaoGestorInput(effectiveObs);
      }
      
      setConfigData({
        nome: orcData.nome || '',
        descricao: orcData.descricao || '',
        cliente: orcData.cliente || '',
        projeto: orcData.projeto || '',
        gestor_cliente: orcData.gestor_cliente || '',
        status: orcData.status || '',
        bdi_ac: parseFloat(orcData.bdi_ac || 0) * 100,
        bdi_s: parseFloat(orcData.bdi_s || 0) * 100,
        bdi_g: parseFloat(orcData.bdi_g || 0) * 100,
        bdi_r: parseFloat(orcData.bdi_r || 0) * 100,
        bdi_df: parseFloat(orcData.bdi_df || 0) * 100,
        bdi_l: parseFloat(orcData.bdi_l || 0) * 100,
        bdi_i: parseFloat(orcData.bdi_i || 0) * 100
      });

      // 1.5. Verificar se existe alguma revisão posterior
      if (orcData.codigo) {
        const parts = String(orcData.codigo).split('.');
        if (parts.length >= 2) {
          const basePrefix = `${parts[0]}.${parts[1]}`;
          const curRev = parseInt(orcData.revisao || '0', 10);
          const { data: revs } = await supabase
            .schema('engenharia')
            .from('orcamentos')
            .select('id, codigo, revisao')
            .ilike('codigo', `${basePrefix}%`);
          
          if (revs && revs.length > 0) {
            const foundHigher = revs.find((r: any) => parseInt(r.revisao || '0', 10) > curRev);
            setHigherRevisionObj(foundHigher || null);
          } else {
            setHigherRevisionObj(null);
          }
        }
      }

      // 2. Carrega itens
      const { data: itensData, error: itensError } = await supabase
        .schema('engenharia')
        .from('orcamento_itens')
        .select('*')
        .eq('orcamento_id', id);

      if (itensError) throw itensError;

      // Ordenar por EAP lexicograficamente
      const sorted = (itensData || []).map((i: any) => ({
        ...i,
        quantidade: parseFloat(i.quantidade || 0),
        valor_unitario_mat: parseFloat(i.valor_unitario_mat || 0),
        valor_unitario_mo: parseFloat(i.valor_unitario_mo || 0),
        valor_unitario: parseFloat(i.valor_unitario || 0),
        valor_unitario_com_bdi: parseFloat(i.valor_unitario_com_bdi || 0),
        total_mat: parseFloat(i.total_mat || 0),
        total_mo: parseFloat(i.total_mo || 0),
        total: parseFloat(i.total || 0)
      })).sort(sortEap);

      // Garante exatamente 1 linha em branco no final da planilha
      setItens(ensureSingleTrailingBlankRow(sorted, id!));

      // Carrega memórias de cálculo associadas do LocalStorage
      if (id) {
        try {
          const savedCalcs = localStorage.getItem(`orcamento_calculos_${id}`);
          if (savedCalcs) {
            setCalculos(JSON.parse(savedCalcs));
          }
        } catch (e) { console.error(e); }
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro ao carregar orçamento: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const sortEap = (a: any, b: any) => {
    const aParts = String(a.item_eap || '').split('.').map(x => parseInt(x, 10) || 0);
    const bParts = String(b.item_eap || '').split('.').map(x => parseInt(x, 10) || 0);
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aVal = aParts[i] !== undefined ? aParts[i] : -1;
      const bVal = bParts[i] !== undefined ? bParts[i] : -1;
      if (aVal !== bVal) return aVal - bVal;
    }
    return 0;
  };

  const getRowStyles = (item: OrcamentoItem, index: number) => {
    const hasValues = (item.item_eap || '').trim() !== '' || (item.descricao || '').trim() !== '';
    if (!hasValues) {
      return {
        textClass: "text-xs font-normal text-slate-400",
        rowBgClass: "bg-white border-l-transparent"
      };
    }

    // 1. Atividade descritiva/manual (sem código) → Sempre Negrito, tamanho padrão
    if (!item.codigo) {
      return {
        textClass: "text-xs font-bold text-slate-800",
        rowBgClass: "bg-slate-300/60 hover:bg-slate-300/80 border-l-slate-400"
      };
    }

    // 2. Composição com filhos (hasChildren === true)
    if (item.codigo && item.hasChildren) {
      // Verifica se ela ou algum filho dela está ativo
      const isActive = selectedRowIndex !== null && (
        selectedRowIndex === index || 
        (itens[selectedRowIndex]?.item_eap || '').startsWith(item.item_eap + '.')
      );

      return {
        textClass: isActive 
          ? "text-xs font-bold text-slate-900" 
          : "text-xs font-medium text-slate-750",
        rowBgClass: "bg-slate-50 hover:bg-slate-100/80 border-l-blue-300"
      };
    }

    // 3. Insumos e subcomposições folhas (sem filhos, com código) → Fonte menor e peso normal
    return {
      textClass: "text-[11px] font-normal text-slate-650",
      rowBgClass: "bg-white hover:bg-slate-50 border-l-transparent"
    };
  };

  const getEapLevel = (eap: string) => {
    return (String(eap).match(/\./g) || []).length;
  };

  const isChildOfComposition = (index: number, list: OrcamentoItem[]): boolean => {
    const item = list[index];
    if (!item) return false;
    const eap = (item.item_eap || '').trim();
    if (!eap) return false;

    const parts = eap.split('.');
    if (parts.length <= 1) return false;

    // Constrói mapa EAP para lookup rápido
    const eapToIdx = new Map<string, number>();
    list.forEach((x, idx) => {
      const xeap = (x.item_eap || '').trim();
      if (xeap) eapToIdx.set(xeap, idx);
    });

    for (let len = 1; len < parts.length; len++) {
      const ancestorEap = parts.slice(0, len).join('.');
      const aIdx = eapToIdx.get(ancestorEap);
      if (aIdx !== undefined) {
        const ancestor = list[aIdx];
        if (ancestor && ancestor.codigo && ancestor.codigo.trim() !== '') {
          return true;
        }
      }
    }
    return false;
  };

  const calculateBdiPercentage = (data: typeof configData) => {
    const ac = data.bdi_ac / 100;
    const s = data.bdi_s / 100;
    const g = data.bdi_g / 100;
    const r = data.bdi_r / 100;
    const df = data.bdi_df / 100;
    const l = data.bdi_l / 100;
    const i = data.bdi_i / 100;

    const num = (1 + ac + s + r + g) * (1 + df) * (1 + l);
    const den = 1 - i;
    if (den <= 0) return 0;
    return (num / den - 1) * 100;
  };

  const bdiPercent = orcamento ? calculateBdiPercentage(configData) : 0;
  const bdiFactor = 1 + bdiPercent / 100;

  // Atualizar célula localmente
  const handleCellChange = (index: number, field: keyof OrcamentoItem, value: any) => {
    if (index < 0) return;
    setItens(prev => {
      if (!prev[index]) return prev;
      pushUndoSnapshot(prev);
      const copy = [...prev];
      const item = { ...copy[index] };

      if (field === 'quantidade') {
        item.quantidade = value === '' ? 0 : (parseFloat(value) || 0);
      } else if (field === 'valor_unitario_mat') {
        item.valor_unitario_mat = value === '' ? 0 : (parseFloat(value) || 0);
      } else if (field === 'valor_unitario_mo') {
        item.valor_unitario_mo = value === '' ? 0 : (parseFloat(value) || 0);
      } else {
        (item as any)[field] = value;
      }

      // Se alterou qualquer campo que não seja o item_eap, e o item_eap está vazio, preenche automaticamente com o sequencial
      if (field !== 'item_eap' && (!item.item_eap || item.item_eap.trim() === '')) {
        item.item_eap = getSequentialEapForIndex(index, copy);
      }

      // Re-calcula unitário, totais e BDI
      item.valor_unitario = (item.valor_unitario_mat || 0) + (item.valor_unitario_mo || 0);
      item.valor_unitario_com_bdi = item.valor_unitario * bdiFactor;
      item.total_mat = (item.quantidade || 0) * (item.valor_unitario_mat || 0);
      item.total_mo = (item.quantidade || 0) * (item.valor_unitario_mo || 0);
      item.total = (item.quantidade || 0) * item.valor_unitario;

      copy[index] = item;
      const rebuilt = rebuildEapCodes(copy);
      return ensureSingleTrailingBlankRow(rebuilt, id!);
    });

    setHasUnsavedChanges(true);
  };

  // Adicionar linha vazia
  const handleAddRow = () => {
    // Procura o último item preenchido para calcular a sequência EAP correta
    const validItens = itens.filter(item => (item.item_eap || '').trim() !== '' || (item.descricao || '').trim() !== '');
    const lastItem = validItens[validItens.length - 1];

    let nextEap = '';
    if (lastItem && lastItem.item_eap) {
      const parts = lastItem.item_eap.split('.');
      const lastNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNum)) {
        parts[parts.length - 1] = String(lastNum + 1);
        nextEap = parts.join('.');
      } else {
        nextEap = lastItem.item_eap + '.1';
      }
    }

    setItens(prev => {
      const copy = [...prev];
      const newRow = createBlankRow(id!, copy.length + 1);
      newRow.item_eap = nextEap;
      copy.push(newRow);
      return ensureSingleTrailingBlankRow(copy, id!);
    });

    setHasUnsavedChanges(true);
  };

  const handleRemoveRow = (computedIndex: number) => {
    const computedItem = computedItens[computedIndex];
    if (!computedItem) return;

    const indexInOriginal = itens.findIndex(x => x.id === computedItem.id);
    if (indexInOriginal === -1) return;

    const item = itens[indexInOriginal];
    const itemEap = (item.item_eap || '').trim();
    
    // Calcula indices a remover
    let indicesToRemove = new Set<number>([indexInOriginal]);
    if (itemEap) {
      const prefix = itemEap + '.';
      itens.forEach((other, i) => {
        if ((other.item_eap || '').trim().startsWith(prefix)) {
          indicesToRemove.add(i);
        }
      });
    }

    if (indicesToRemove.size > 1) {
      const confirmDelete = window.confirm(
        `Você está excluindo uma tarefa mãe (${item.descricao || 'sem descrição'}) que possui subtarefas. Deseja continuar e excluir ela e todas as suas tarefas filhas?`
      );
      if (!confirmDelete) return;
    }
    
    setItens(p => {
      pushUndoSnapshot(p);
      // Registra para deleção no banco todos os IDs reais (não temp/blank)
      indicesToRemove.forEach(i => {
        const it = p[i];
        if (it && it.id && !it.id.startsWith('temp-') && !it.id.startsWith('blank-')) {
          setRemovedItemIds(prev => [...prev, it.id]);
        }
      });

      const filtered = p.filter((_, i) => !indicesToRemove.has(i));
      return ensureSingleTrailingBlankRow(filtered, id!);
    });
    setHasUnsavedChanges(true);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Atualização de Status (sem precisar salvar itens)
  // ──────────────────────────────────────────────────────────────────────────
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showStatusEnvioMenu, setShowStatusEnvioMenu] = useState(false);

  const STATUS_ENVIO_OPTIONS = [
    'Ag. Retorno',
    'Consolidada',
    'Encerrada',
    'Cancelada',
    'Perdido',
  ];

  // Função para criar nova revisão automaticamente clonando dados e itens do orçamento atual
  const handleCreateRevisionFromCurrent = async () => {
    if (!orcamento || !id) return;

    const isEncerrado = orcamento.status === 'Enviada' && orcamento.status_envio === 'Encerrada';

    if (!isEncerrado) {
      const confirmEncerramento = window.confirm(
        `Esta proposta (${orcamento.codigo}) ainda não possui o status "Encerrada".\n\n` +
        `Para criar uma nova revisão, é necessário alterar o status para "Enviada" e o status de envio para "Encerrada".\n\n` +
        `Deseja encerrar esta proposta e criar a nova revisão agora?`
      );
      if (!confirmEncerramento) return;
    } else {
      const confirmCreate = window.confirm(
        `Deseja criar a nova revisão a partir de "${orcamento.codigo}"?\n\n` +
        `A nova revisão começará com o status "Em andamento".`
      );
      if (!confirmCreate) return;
    }

    setUpdatingStatus(true);
    try {
      // 1. Se não estava encerrada, encerra a proposta atual
      if (!isEncerrado) {
        const { error: updateOldErr } = await supabase
          .schema('engenharia')
          .from('orcamentos')
          .update({
            status: 'Enviada',
            status_envio: 'Encerrada',
            aprovado: true
          })
          .eq('id', id);

        if (updateOldErr) throw updateOldErr;

        setOrcamento((prev: any) => ({
          ...prev,
          status: 'Enviada',
          status_envio: 'Encerrada',
          aprovado: true
        }));
      }

      const currentRev = parseInt(orcamento.revisao || '0', 10);
      const nextRev = currentRev + 1;
      const parts = (orcamento.codigo || '').split('.');
      let newCode = orcamento.codigo;

      if (parts.length >= 3) {
        const dateSeq = `${parts[0]}.${parts[1]}`;
        const year = parts[2].split('-')[1] || new Date().getFullYear();
        newCode = `${dateSeq}.${nextRev}-${year}`;
      } else {
        newCode = `${orcamento.codigo}_REV${nextRev}`;
      }

      // 2. Insere a nova revisão em andamento com campos zerados
      const { data: newOrc, error: newOrcError } = await supabase
        .schema('engenharia')
        .from('orcamentos')
        .insert({
          codigo: newCode,
          nome: orcamento.nome,
          descricao: orcamento.descricao,
          cliente: orcamento.cliente,
          projeto: orcamento.projeto,
          gestor_cliente: orcamento.gestor_cliente,
          revisao: String(nextRev),
          status: 'Em andamento',
          status_envio: null,
          aprovado: false,
          aprovado_em: null,
          aprovado_por: null,
          proposta_id: orcamento.proposta_id,
          orcamento_importado_id: orcamento.orcamento_importado_id || null,
          regra_arredondamento: orcamento.regra_arredondamento,
          bdi_ac: orcamento.bdi_ac,
          bdi_s: orcamento.bdi_s,
          bdi_g: orcamento.bdi_g,
          bdi_r: orcamento.bdi_r,
          bdi_df: orcamento.bdi_df,
          bdi_l: orcamento.bdi_l,
          bdi_i: orcamento.bdi_i
        })
        .select('id')
        .single();

      if (newOrcError) throw newOrcError;

      if (newOrc?.id) {
        localStorage.removeItem(`orcamento_decisao_${newOrc.id}`);
        localStorage.removeItem(`orcamento_obs_gestor_${newOrc.id}`);
      }

      // Duplica todos os itens da planilha
      const { data: oldItems, error: itemsError } = await supabase
        .schema('engenharia')
        .from('orcamento_itens')
        .select('*')
        .eq('orcamento_id', id);

      if (itemsError) throw itemsError;

      if (oldItems && oldItems.length > 0) {
        const newItems = oldItems.map((item: any) => {
          const { id: itemId, created_at, ...rest } = item;
          return {
            ...rest,
            orcamento_id: newOrc.id
          };
        });

        const { error: insertItemsError } = await supabase
          .schema('engenharia')
          .from('orcamento_itens')
          .insert(newItems);

        if (insertItemsError) throw insertItemsError;
      }

      alert(`✨ Nova revisão ${newCode} (REV ${String(nextRev).padStart(2, '0')}) criada com sucesso!\nRedirecionando para a nova revisão...`);
      navigate(`/orcamentos/${newOrc.id}`);
    } catch (err: any) {
      alert('Erro ao criar nova revisão: ' + err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleUpdateStatus = async (
    newStatus: string,
    newStatusEnvio?: string | null
  ) => {
    if (!id) return;
    setUpdatingStatus(true);
    try {
      const payload: Record<string, any> = { status: newStatus };
      if (newStatus === 'Enviada') {
        payload.aprovado = true;
        payload.decisao_gestor = null;
        if (id) localStorage.removeItem(`orcamento_decisao_${id}`);
      } else if (newStatus === 'Em andamento') {
        payload.aprovado = false;
        payload.status_envio = null;
        payload.decisao_gestor = null;
        if (id) localStorage.removeItem(`orcamento_decisao_${id}`);
      } else if (newStatus === 'Ag. Validação') {
        payload.aprovado = null;
        payload.decisao_gestor = null;
        if (id) localStorage.removeItem(`orcamento_decisao_${id}`);
      }
      if (newStatusEnvio !== undefined) payload.status_envio = newStatusEnvio;

      const { error } = await supabase
        .schema('engenharia')
        .from('orcamentos')
        .update(payload)
        .eq('id', id);
      if (error) {
        delete payload.decisao_gestor;
        const { error: err2 } = await supabase
          .schema('engenharia')
          .from('orcamentos')
          .update(payload)
          .eq('id', id);
        if (err2) throw err2;
      }

      setOrcamento((prev: any) => ({
        ...prev,
        status: newStatus,
        aprovado: newStatus === 'Enviada' ? true : (newStatus === 'Ag. Validação' ? null : (newStatus === 'Em andamento' ? false : prev?.aprovado)),
        decisao_gestor: (newStatus === 'Enviada' || newStatus === 'Em andamento' || newStatus === 'Ag. Validação') ? null : prev?.decisao_gestor,
        status_envio: newStatusEnvio !== undefined ? newStatusEnvio : (newStatus === 'Em andamento' ? null : prev?.status_envio),
      }));

      // Se alterou para Encerrada, dispara a criação de nova revisão
      if (newStatusEnvio === 'Encerrada' || (newStatus === 'Enviada' && newStatusEnvio === 'Encerrada')) {
        setTimeout(() => {
          if (window.confirm('O status deste orçamento foi alterado para "Encerrada".\n\nDeseja criar a NOVA REVISÃO (clonando todos os itens) automaticamente agora?')) {
            handleCreateRevisionFromCurrent();
          }
        }, 150);
      }
    } catch (err: any) {
      alert('Erro ao atualizar status: ' + err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Observação do Gestor
  const [observacaoGestorInput, setObservacaoGestorInput] = useState('');

  // Renderiza o texto de observação do gestor detectando códigos EAP (ex: 1.2.1, 1.2, item 1.2.1, item 1)
  // e os transformando em spans clicáveis que rolam até a linha correspondente na tabela.
  const renderObsWithLinks = (text: string) => {
    if (!text) return null;

    // Regex para detectar códigos EAP com pontos (ex: 1.2.1, 10.3) ou menções tipo "item 1.2.1", "item 1", "item 2"
    const EAP_REGEX = /(\b(?:item\s+)?\d+(?:\.\d+)+\b|\bitem\s+\d+\b)/gi;
    const parts = text.split(EAP_REGEX);

    const handleEapClick = (rawCode: string) => {
      const eapCode = rawCode.replace(/^item\s+/i, '').trim();

      // Descolapsa ancestrais na árvore de tópicos para garantir que a linha esteja visível no DOM
      setCollapsedEaps(prev => {
        const next = new Set(prev);
        const codeParts = eapCode.split('.');
        let altered = false;
        for (let i = 1; i <= codeParts.length; i++) {
          const ancestor = codeParts.slice(0, i).join('.');
          if (next.has(ancestor)) {
            next.delete(ancestor);
            altered = true;
          }
        }
        return altered ? next : prev;
      });

      // Aguarda renderização do React e rola suavemente até a linha
      setTimeout(() => {
        const el = document.getElementById(`row-eap-${eapCode}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('!bg-amber-100', '!border-l-amber-500', 'ring-2', 'ring-amber-400', 'ring-inset');
          setTimeout(() => {
            el.classList.remove('!bg-amber-100', '!border-l-amber-500', 'ring-2', 'ring-amber-400', 'ring-inset');
          }, 3000);
        }
      }, 100);
    };

    return parts.map((part, i) => {
      const isMatch = /^(?:item\s+)?\d+(?:\.\d+)+$/i.test(part) || /^item\s+\d+$/i.test(part);
      if (isMatch) {
        return (
          <span
            key={i}
            onClick={() => handleEapClick(part)}
            className="underline decoration-2 underline-offset-2 font-bold cursor-pointer decoration-dotted text-blue-700 hover:text-blue-900 hover:bg-blue-100/80 rounded px-1 transition-all inline-flex items-center gap-0.5"
            title={`Clique para ir direto ao item ${part} na planilha`}
          >
            {part}
          </span>
        );
      }
      return (
        <span key={i}>
          {part.split('\n').map((line, j, arr) => (
            <span key={j}>
              {line}
              {j < arr.length - 1 ? <br /> : null}
            </span>
          ))}
        </span>
      );
    });
  };

  // Decisão do Gestor (Aprovar, Aprovar com Pendência, Recusar)
  const handleDecisaoGestor = async (
    tipoDecisao: 'aprovar' | 'aprovar_pendencia' | 'recusar'
  ) => {
    if (!id) return;

    let newStatus = 'Em andamento';
    let isAprovado = false;
    let confirmMsg = '';

    if (tipoDecisao === 'aprovar') {
      newStatus = 'Ag. Validação';
      isAprovado = true;
      confirmMsg = 'Aprovar este orçamento? Ele ficará liberado para envio ao cliente.';
    } else if (tipoDecisao === 'aprovar_pendencia') {
      newStatus = 'Em andamento';
      isAprovado = false;
      confirmMsg = 'Aprovar com pendências? O orçamento voltará para "Em andamento" com suas observações para o orçamentista ajustar.';
    } else {
      newStatus = 'Em andamento';
      isAprovado = false;
      confirmMsg = 'Recusar/Rejeitar este orçamento? Ele voltará para "Em andamento" com o motivo da recusa para o orçamentista.';
    }

    if (!window.confirm(confirmMsg)) return;

    setUpdatingStatus(true);
    try {
      const notes = observacaoGestorInput.trim() || orcamento?.observacao_gestor || null;
      if (notes) {
        localStorage.setItem(`orcamento_obs_gestor_${id}`, notes);
      } else {
        localStorage.removeItem(`orcamento_obs_gestor_${id}`);
      }
      localStorage.setItem(`orcamento_decisao_${id}`, tipoDecisao);

      const payload: Record<string, any> = {
        status: newStatus,
        aprovado: isAprovado,
        decisao_gestor: tipoDecisao,
        observacao_gestor: notes,
        aprovado_em: isAprovado ? new Date().toISOString() : null,
        aprovado_por: isAprovado ? (user?.email || 'gestor') : null,
      };

      const { error } = await supabase
        .schema('engenharia')
        .from('orcamentos')
        .update(payload)
        .eq('id', id);

      if (error) {
        // Fallback sem a coluna observacao_gestor caso ainda não exista na tabela do Supabase
        delete payload.decisao_gestor;
        delete payload.observacao_gestor;
        const { error: err2 } = await supabase
          .schema('engenharia')
          .from('orcamentos')
          .update(payload)
          .eq('id', id);
        if (err2) throw err2;
      }

      setOrcamento((prev: any) => ({
        ...prev,
        status: newStatus,
        aprovado: isAprovado,
        observacao_gestor: notes,
        aprovado_em: isAprovado ? new Date().toISOString() : null,
        aprovado_por: isAprovado ? (user?.email || 'gestor') : null,
      }));

      alert(
        tipoDecisao === 'aprovar'
          ? 'Orçamento Aprovado com Sucesso!'
          : tipoDecisao === 'aprovar_pendencia'
          ? 'Orçamento registrado com Pendências! Devolvido ao orçamentista.'
          : 'Orçamento Recusado! Devolvido ao orçamentista com as observações.'
      );
    } catch (err: any) {
      alert('Erro ao atualizar decisão do gestor: ' + err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Salvar planilha
  const handleSavePlanilha = async () => {
    setSaving(true);
    try {
      // 1. Atualizar cabeçalho se houver mudanças nas configs/BDI
      const { error: orcError } = await supabase
        .schema('engenharia')
        .from('orcamentos')
        .update({
          nome: configData.nome,
          descricao: configData.descricao,
          cliente: configData.cliente,
          projeto: configData.projeto,
          gestor_cliente: configData.gestor_cliente,
          status: configData.status,
          bdi_ac: configData.bdi_ac / 100,
          bdi_s: configData.bdi_s / 100,
          bdi_g: configData.bdi_g / 100,
          bdi_r: configData.bdi_r / 100,
          bdi_df: configData.bdi_df / 100,
          bdi_l: configData.bdi_l / 100,
          bdi_i: configData.bdi_i / 100
        })
        .eq('id', id);

      if (orcError) throw orcError;

      // 2. Deletar itens removidos
      if (removedItemIds.length > 0) {
        const { error: deleteError } = await supabase
          .schema('engenharia')
          .from('orcamento_itens')
          .delete()
          .in('id', removedItemIds);
        if (deleteError) throw deleteError;
        setRemovedItemIds([]);
      }

      // 2.5 Sincronizar com a planilha do cliente (orcamento_importado_itens)
      if (orcamento && orcamento.orcamento_importado_id) {
        const importId = orcamento.orcamento_importado_id;

        const { data: importRows, error: fetchImportError } = await supabase
          .schema('engenharia')
          .from('orcamento_importado_itens')
          .select('*')
          .eq('orcamento_importado_id', importId);

        if (fetchImportError) throw fetchImportError;

        const importRowsMap = new Map<string, any>();
        if (importRows) {
          importRows.forEach((r: any) => {
            importRowsMap.set(r.item_eap, r);
          });
        }

        const budgetItemsToSync = computedItens.filter(item => {
          const hasValues = (item.item_eap || '').trim() !== '' || (item.descricao || '').trim() !== '';
          if (!hasValues) return false;
          const idx = itens.findIndex(x => x.id === item.id);
          const isChild = idx !== -1 ? isChildOfComposition(idx, itens) : false;
          
          let parentIsLinked = false;
          if (isChild && item.item_eap.includes('.')) {
            const parts = item.item_eap.split('.');
            const parentEap = parts.slice(0, -1).join('.');
            const parentItem = computedItens.find(x => x.item_eap === parentEap);
            if (parentItem && parentItem.composicao_id) {
              parentIsLinked = true;
            }
          }

          const existsInClient = importRowsMap.has(item.item_eap);
          return !isChild || existsInClient || parentIsLinked;
        });

        const importItemsToUpsert: any[] = [];
        const importEapsToKeep = new Set<string>();

        const insumoCodigos = budgetItemsToSync
          .filter(item => item.codigo && !item.composicao_id)
          .map(item => item.codigo);

        const insumoMap: Record<string, string> = {};
        if (insumoCodigos.length > 0) {
          const { data: insumosDB } = await supabase
            .schema('engenharia')
            .from('insumos')
            .select('id, codigo')
            .in('codigo', insumoCodigos);
          if (insumosDB) {
            insumosDB.forEach(i => {
              insumoMap[i.codigo] = i.id;
            });
          }
        }

        const usedImportIds = new Set<string>();

        for (const bItem of budgetItemsToSync) {
          const existingImportRow = importRowsMap.get(bItem.item_eap);
          importEapsToKeep.add(bItem.item_eap);

          const insumoId = bItem.codigo && !bItem.composicao_id ? (insumoMap[bItem.codigo] || null) : null;
          const tipoVinculo = bItem.codigo ? (bItem.composicao_id ? 'composicao' : 'insumo') : 'texto';

          const payload: any = {
            orcamento_importado_id: importId,
            item_eap: bItem.item_eap,
            descricao: existingImportRow ? existingImportRow.descricao : bItem.descricao,
            unidade: existingImportRow ? existingImportRow.unidade : (bItem.isSummary ? '' : bItem.unidade),
            quantidade: existingImportRow ? existingImportRow.quantidade : (bItem.isSummary ? 0 : bItem.quantidade),
            valor_unitario_empresa: bItem.isSummary ? 0 : bItem.valor_unitario,
            total_empresa: bItem.total,
            tipo_vinculo: tipoVinculo,
            composicao_id: bItem.composicao_id || null,
            insumo_id: insumoId,
            status_linha: existingImportRow?.status_linha || 'inserido_empresa'
          };

          if (existingImportRow && !usedImportIds.has(existingImportRow.id)) {
            payload.id = existingImportRow.id;
            payload.valor_unitario_orig = existingImportRow.valor_unitario_orig;
            payload.total_orig = existingImportRow.total_orig;
            usedImportIds.add(existingImportRow.id);
          } else {
            payload.valor_unitario_orig = 0;
            payload.total_orig = 0;
          }

          importItemsToUpsert.push(payload);
        }

        if (importItemsToUpsert.length > 0) {
          const { error: upsertImportError } = await supabase
            .schema('engenharia')
            .from('orcamento_importado_itens')
            .upsert(importItemsToUpsert);
          if (upsertImportError) throw upsertImportError;
        }

        const importRowsToDelete: string[] = [];
        const importRowsToUnlink: string[] = [];

        importRowsMap.forEach((row, eap) => {
          if (!importEapsToKeep.has(eap)) {
            if (row.status_linha === 'inserido_empresa' || row.status_linha === 'desdobrado') {
              importRowsToDelete.push(row.id);
            } else {
              importRowsToUnlink.push(row.id);
            }
          }
        });

        if (importRowsToDelete.length > 0) {
          const { error: deleteImportError } = await supabase
            .schema('engenharia')
            .from('orcamento_importado_itens')
            .delete()
            .in('id', importRowsToDelete);
          if (deleteImportError) throw deleteImportError;
        }

        if (importRowsToUnlink.length > 0) {
          const { error: unlinkImportError } = await supabase
            .schema('engenharia')
            .from('orcamento_importado_itens')
            .update({
              composicao_id: null,
              insumo_id: null,
              tipo_vinculo: null,
              valor_unitario_empresa: 0,
              total_empresa: 0
            })
            .in('id', importRowsToUnlink);
          if (unlinkImportError) throw unlinkImportError;
        }
      }

      // 3. Upsert e Insert itens restantes (ignora os que estão completamente em branco)
      const itemsToUpdate: any[] = [];
      const itemsToInsert: any[] = [];

      computedItens
        .filter(item => (item.item_eap || '').trim() !== '' || (item.descricao || '').trim() !== '')
        .forEach(item => {
          const payload: any = {
            orcamento_id: id,
            item_eap: item.item_eap,
            codigo: item.codigo || null,
            banco_fonte: item.banco_fonte || 'Própria',
            descricao: item.descricao,
            unidade: item.isSummary ? '' : item.unidade,
            quantidade: item.isSummary ? 0 : item.quantidade,
            valor_unitario_mat: item.isSummary ? 0 : item.valor_unitario_mat,
            valor_unitario_mo: item.isSummary ? 0 : item.valor_unitario_mo,
            valor_unitario: item.isSummary ? 0 : item.valor_unitario,
            valor_unitario_com_bdi: item.isSummary ? 0 : item.valor_unitario * bdiFactor,
            total: item.total,
            total_mat: item.total_mat,
            total_mo: item.total_mo,
            composicao_id: item.composicao_id || null
          };

          if (item.id && !item.id.startsWith('temp-') && !item.id.startsWith('blank-')) {
            payload.id = item.id;
            itemsToUpdate.push(payload);
          } else {
            itemsToInsert.push(payload);
          }
        });

      if (itemsToUpdate.length > 0) {
        const { error: upsertError } = await supabase
          .schema('engenharia')
          .from('orcamento_itens')
          .upsert(itemsToUpdate);

        if (upsertError) throw upsertError;
      }

      if (itemsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .schema('engenharia')
          .from('orcamento_itens')
          .insert(itemsToInsert);

        if (insertError) throw insertError;
      }

      setHasUnsavedChanges(false);
      alert('Planilha orçamentária salva com sucesso!');
      loadOrcamento(); // recarrega para atualizar IDs temporários e ordenações
    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar planilha: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Buscar itens para importação
  const searchImportItems = async () => {
    setLoadingImport(true);
    try {
      const term = importSearch.trim();
      let query;

      if (importTab === 'insumos_proprios') {
        query = supabase.schema('engenharia').from('insumos')
          .select('*')
          .in('fonte_preco', ['Cotação', 'Histórico']);
        if (term) query = query.or(`descricao.ilike.%${term}%,codigo.ilike.%${term}%`);
      } else if (importTab === 'composicoes_proprias') {
        query = supabase.schema('engenharia').from('v_composicoes_cdu')
          .select('*')
          .eq('fonte', 'Própria');
        if (term) query = query.or(`descricao.ilike.%${term}%,codigo.ilike.%${term}%`);
      } else if (importTab === 'insumos_sistema') {
        query = supabase.schema('engenharia').from('insumos')
          .select('*')
          .not('fonte_preco', 'in', '("Cotação","Histórico")');
        if (term) query = query.or(`descricao.ilike.%${term}%,codigo.ilike.%${term}%`);
      } else {
        query = supabase.schema('engenharia').from('v_composicoes_cdu')
          .select('*')
          .neq('fonte', 'Própria');
        if (term) query = query.or(`descricao.ilike.%${term}%,codigo.ilike.%${term}%`);
      }

      const { data, error } = await query.limit(50);
      if (!error) {
        setImportResults(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingImport(false);
    }
  };

  const getImportTarget = (targetIndex: number | null, list: OrcamentoItem[]): { index: number; eap: string } => {
    if (targetIndex !== null && list[targetIndex]) {
      return { index: targetIndex, eap: list[targetIndex].item_eap || '1' };
    }

    let index = targetIndex;
    if (index === null) {
      index = list.findIndex(item => (item.item_eap || '').trim() === '' && (item.descricao || '').trim() === '');
      if (index === -1) index = list.length;
    }

    if (index === 0 || list.length === 0) {
      return { index, eap: '1' };
    }
    let prevIndex = index - 1;
    while (prevIndex >= 0 && (list[prevIndex].item_eap || '').trim() === '' && (list[prevIndex].descricao || '').trim() === '') {
      prevIndex--;
    }

    if (prevIndex < 0) {
      return { index, eap: '1' };
    }

    const prevItem = list[prevIndex];

    // Encontra se o prevItem ou algum de seus pais/ancestrais na árvore EAP tem código (insumo/composição)
    let parentCompIndex = -1;
    for (let k = prevIndex; k >= 0; k--) {
      const item = list[k];
      if (item.codigo && item.codigo.trim() !== '') {
        const prefix = item.item_eap + '.';
        if (prevItem.item_eap === item.item_eap || prevItem.item_eap.startsWith(prefix)) {
          parentCompIndex = k;
        }
      }
    }

    if (parentCompIndex !== -1) {
      // O item anterior faz parte de uma composição.
      // O novo item deve ser inserido após o último filho/descendente dessa composição.
      const parentItem = list[parentCompIndex];
      const prefix = parentItem.item_eap + '.';
      
      let lastChildIndex = parentCompIndex;
      for (let k = parentCompIndex + 1; k < list.length; k++) {
        if ((list[k].item_eap || '').trim().startsWith(prefix)) {
          lastChildIndex = k;
        } else {
          break;
        }
      }

      const targetInsertIndex = lastChildIndex + 1;

      // O EAP deve ser irmão do parentItem (mesmo nível da composição pai)
      const parts = parentItem.item_eap.split('.');
      const lastNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNum)) {
        parts[parts.length - 1] = String(lastNum + 1);
      } else {
        parts.push('1');
      }

      return { index: targetInsertIndex, eap: parts.join('.') };
    }

    // Caso contrário, herda o nível do item anterior e avança o sequencial
    const parts = prevItem.item_eap.split('.');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      parts[parts.length - 1] = String(lastNum + 1);
    } else {
      parts.push('1');
    }

    return { index, eap: parts.join('.') };
  };

  // Importar item selecionado do painel lateral para a planilha
  const handleImportItem = async (selected: any) => {
    let matCost = 0;
    let moCost = 0;

    const isComp = importTab.includes('composicoes');

    if (isComp) {
      matCost = parseFloat(selected.mat_sem_desoneracao || selected.custo_sem_desoneracao || selected.cdu || 0);
      moCost = parseFloat(selected.mo_sem_desoneracao || 0);
    } else {
      // Insumo
      const val = parseFloat(selected.valor || selected.valor_nao_desonerado || 0);
      if (selected.tipo === 'Mão de Obra') {
        moCost = val;
      } else {
        matCost = val;
      }
    }

    // Determina o índice e EAP correto para não ficar dentro de outra composição
    const target = getImportTarget(targetImportRowIndex, itens);
    const destIndex = target.index;
    const nextEap = target.eap;

    const newItem: OrcamentoItem = {
      id: destIndex !== null && destIndex !== -1 && itens[destIndex]?.id && !itens[destIndex].id.startsWith('temp-') && !itens[destIndex].id.startsWith('blank-') 
        ? itens[destIndex].id 
        : `temp-${Date.now()}-${Math.random()}`,
      orcamento_id: id!,
      item_eap: nextEap,
      codigo: selected.codigo,
      banco_fonte: isComp ? selected.fonte : selected.fonte_preco,
      descricao: selected.descricao,
      unidade: selected.unidade || 'vb',
      quantidade: 0,
      valor_unitario_mat: matCost,
      valor_unitario_mo: moCost,
      valor_unitario: matCost + moCost,
      valor_unitario_com_bdi: (matCost + moCost) * bdiFactor,
      total_mat: 0,
      total_mo: 0,
      total: 0,
      composicao_id: isComp ? selected.id : null,
      isTemp: true,
      _manualLevel: true  // Preserva o nível calculado; orçamentista decide hierarquia manualmente
    };

    let children: OrcamentoItem[] = [];
    if (isComp) {
      children = await fetchCompositionChildrenRecursively(selected.id, nextEap, id!, bdiFactor);
    }

    setItens(prev => {
      pushUndoSnapshot(prev);
      const copy = [...prev];
      if (destIndex !== null && destIndex !== -1) {
        // Protege os antigos filhos do item substituído: marca-os com _manualLevel
        // para que rebuildEapCodes não os promova automaticamente como filhos do
        // item recém importado (evita hierarquia automática indesejada).
        const replacedItem = copy[destIndex];
        const replacedEap = (replacedItem?.item_eap || '').trim();
        if (replacedEap) {
          const prefix = replacedEap + '.';
          for (let k = destIndex + 1; k < copy.length; k++) {
            const kEap = (copy[k].item_eap || '').trim();
            if (kEap.startsWith(prefix)) {
              copy[k] = { ...copy[k], _manualLevel: true };
            } else {
              break;
            }
          }
        }
        copy.splice(destIndex, 1, newItem, ...children);
      } else {
        copy.push(newItem, ...children);
      }
      return rebuildEapCodes(copy);
    });

    // Mantém o drawer de importação aberto para consecutivas inserções e avança o target index
    setTargetImportRowIndex(destIndex + 1 + children.length);
    setHasUnsavedChanges(true);

    // Marca o item como importado temporariamente (por 2 segundos)
    setImportedItemIds(prev => ({ ...prev, [selected.id]: true }));
    setTimeout(() => {
      setImportedItemIds(prev => ({ ...prev, [selected.id]: false }));
    }, 2000);
  };

  // Calcular totais gerais da planilha (somente linhas mãe de 1º nível: 1, 2, 3... para não duplicar somas das filhas)
  const totals = useMemo(() => {
    const eapSet = new Set(computedItens.map(i => (i.item_eap || '').trim()).filter(Boolean));

    return computedItens.reduce((acc, item) => {
      const eap = (item.item_eap || '').trim();
      const hasContent = eap !== '' || (item.descricao || '').trim() !== '';
      if (!hasContent) return acc;

      // Se o EAP não possui ponto (ex: "1", "2", "3"), é uma linha mãe raiz de 1º nível.
      // Se tem ponto (ex: "2.1"), verifica se o pai ("2") existe na planilha. Se o pai existir, ele já engloba o total.
      let isRoot = false;
      if (!eap.includes('.')) {
        isRoot = true;
      } else {
        const parentEap = eap.substring(0, eap.lastIndexOf('.'));
        if (!eapSet.has(parentEap)) {
          isRoot = true;
        }
      }

      if (isRoot) {
        acc.mat += item.total_mat || 0;
        acc.mo += item.total_mo || 0;
        acc.total += item.total || 0;
      }
      return acc;
    }, { mat: 0, mo: 0, total: 0 });
  }, [computedItens]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-500">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        Carregando planilha orçamentária...
      </div>
    );
  }

  return (
    <div className="space-y-6 relative pb-20">
      {/* Banner de Bloqueio se houver revisão posterior */}
      {isReadOnly && higherRevisionObj && (
        <div className="bg-amber-500 text-white px-4 py-3 rounded-2xl shadow-md flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-amber-100 shrink-0" />
            <span>
              <strong>Orçamento Encerrado com Nova Revisão.</strong> Este orçamento (REV {orcamento?.revisao || '00'}) está bloqueado para edições pois já existe a <strong>{higherRevisionObj.codigo} (REV {higherRevisionObj.revisao})</strong>.
            </span>
          </div>
          <button
            onClick={() => navigate(`/orcamentos/${higherRevisionObj.id}`)}
            className="bg-white text-amber-950 hover:bg-amber-100 px-3.5 py-1.5 rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1.5 shrink-0 transition-all shadow-xs"
          >
            Acessar {higherRevisionObj.codigo} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Barra Superior */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-start gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (hasUnsavedChanges && !window.confirm('Descartar alterações não salvas?')) return;
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/orcamentos?tab=empresa');
              }
            }}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors cursor-pointer mt-0.5"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            {/* Linha 1: Título + Código + REV + Ver Planilha */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="text-xl font-bold text-slate-800 leading-tight break-words">
                {orcamento?.nome || orcamento?.projeto || 'Orçamento'}
              </h2>
              {orcamento?.codigo && (
                <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded font-mono border border-slate-200/80 whitespace-nowrap shrink-0">
                  {orcamento.codigo}
                </span>
              )}
              <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded border border-blue-100 whitespace-nowrap shrink-0">
                REV {orcamento?.revisao ?? '0'}
              </span>
              {orcamento?.orcamento_importado_id && (
                <button
                  onClick={() => navigate(`/orcamentos/depara/${orcamento.orcamento_importado_id}`)}
                  className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold px-2.5 py-0.5 rounded border border-purple-100 text-[10px] cursor-pointer flex items-center gap-1 transition-all"
                  title="Acessar a planilha importada original e o Studio De-Para"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
                  <span>Ver Planilha Importada</span>
                </button>
              )}
            </div>
            {/* Linha 2: Badge de Status (abaixo do REV) */}
            {(() => {
              const s = (orcamento?.status || 'Em andamento').trim();
              const isAprovado = orcamento?.aprovado === true;
              const isAgValidacao = s.toLowerCase().includes('valida');
              const isEnviada = s.toLowerCase() === 'enviada';
              const isCancelada = s.toLowerCase() === 'cancelada';

              let label = s;
              let cls = 'bg-blue-50 text-blue-700 border-blue-200';
              let dot = 'bg-blue-500';

              if (isEnviada) {
                label = orcamento?.status_envio || 'Enviada';
                switch (orcamento?.status_envio) {
                  case 'Ag. Retorno':
                    cls = 'bg-violet-50 text-violet-700 border-violet-200';
                    dot = 'bg-violet-500';
                    break;
                  case 'Consolidada':
                    cls = 'bg-teal-50 text-teal-800 border-teal-300';
                    dot = 'bg-teal-500';
                    break;
                  case 'Encerrada':
                    cls = 'bg-slate-100 text-slate-700 border-slate-300';
                    dot = 'bg-slate-500';
                    break;
                  case 'Perdido':
                    cls = 'bg-gray-100 text-gray-700 border-gray-300';
                    dot = 'bg-gray-500';
                    break;
                  case 'Cancelada':
                    cls = 'bg-rose-50 text-rose-700 border-rose-200';
                    dot = 'bg-rose-500';
                    break;
                  default:
                    cls = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    dot = 'bg-emerald-500';
                    break;
                }
              } else if (isCancelada) {
                label = 'Cancelada';
                cls = 'bg-rose-50 text-rose-700 border-rose-200';
                dot = 'bg-rose-500';
              } else if (isAgValidacao && !isAprovado) {
                label = 'Ag. Validação';
                cls = 'bg-amber-50 text-amber-700 border-amber-300';
                dot = 'bg-amber-500';
              } else if (isAprovado) {
                label = 'Aprovado e Ag. Envio';
                cls = 'bg-emerald-50 text-emerald-800 border-emerald-300';
                dot = 'bg-emerald-500';
              } else {
                const decisao = orcamento?.decisao_gestor || (id ? localStorage.getItem(`orcamento_decisao_${id}`) : null);
                if (decisao === 'aprovar_pendencia') {
                  label = 'Com Pendências';
                  cls = 'bg-amber-50 text-amber-800 border-amber-300 font-bold';
                  dot = 'bg-amber-600';
                } else if (decisao === 'recusar') {
                  label = 'Recusado pelo Gestor';
                  cls = 'bg-rose-50 text-rose-700 border-rose-300 font-bold';
                  dot = 'bg-rose-600';
                } else {
                  label = 'Em andamento';
                  cls = 'bg-blue-50 text-blue-700 border-blue-200';
                  dot = 'bg-blue-500';
                }
              }

              const isPulsing = isAgValidacao && !isAprovado;
              return (
                <div className="flex items-center gap-2 mt-1">
                  <span className={clsx('inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap shadow-xs', cls)}>
                    <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dot, isPulsing && 'animate-pulse')} />
                    {label}
                  </span>
                </div>
              );
            })()}
            <p className="text-slate-400 text-xs mt-0.5">
              Cliente: <span className="font-semibold text-slate-600">{orcamento?.cliente || 'Não informado'}</span> · Gestor: <span className="font-semibold text-slate-600">{orcamento?.gestor_cliente || 'Não informado'}</span>
            </p>
          </div>
        </div>
        
        {/* ── Lado direito: ferramentas de edição ── */}
        <div className="flex items-start gap-2 shrink-0 flex-wrap justify-end">

          {/* Grupo BDI — empilhado verticalmente */}
          <div className="flex flex-col gap-1">
            <button 
              onClick={() => setExibirBdi(!exibirBdi)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5",
                exibirBdi 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              <Calculator className="w-3.5 h-3.5" />
              {exibirBdi ? 'COM BDI' : 'SEM BDI'}
            </button>
            <button 
              onClick={() => setShowConfig(!showConfig)}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5" />
              BDI / Config.
            </button>
          </div>

          <div className="w-px h-10 bg-slate-200 self-center" />

          {/* Ferramentas de linha e estrutura — empilhadas */}
          <div className="flex flex-col gap-1">
            <button
              type="button"
              disabled={selectedRowIndex === null && selectedRowIndices.size === 0}
              onClick={() => {
                const idx = selectedRowIndex !== null ? selectedRowIndex : (selectedRowIndices.size > 0 ? Math.min(...Array.from(selectedRowIndices)) : null);
                if (idx !== null && idx !== -1) insertRowAbove(idx);
              }}
              title="Inserir nova linha em branco sobre a selecionada"
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 disabled:opacity-50 disabled:hover:bg-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              Inserir Linha
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowOutlineMenu(!showOutlineMenu)}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm w-full"
              >
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Tópicos
                <ChevronDown className="w-3 h-3 text-slate-400 ml-auto" />
              </button>
              {showOutlineMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowOutlineMenu(false)} />
                  <div className="absolute right-0 mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-40 text-xs text-slate-700 font-medium">
                    <button type="button" onClick={expandAll} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-semibold">
                      <span className="text-blue-500 font-bold">+</span> Mostrar subtarefas (Expandir)
                    </button>
                    <button type="button" onClick={collapseAll} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-semibold">
                      <span className="text-red-500 font-bold">-</span> Ocultar subtarefas (Recolher)
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => collapseToLevel(lvl)}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 cursor-pointer font-medium flex items-center justify-between"
                      >
                        <span>Nível {lvl}</span>
                        <span className="text-[10px] text-slate-400">Até Nível {lvl}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Botões Indent/Outdent — empilhados */}
          <div className="flex flex-col border border-slate-200 rounded-lg p-0.5 bg-slate-50 gap-0.5 shadow-sm self-start">
            <button
              type="button"
              disabled={selectedRowIndices.size === 0 && selectedRowIndex === null}
              onClick={outdentMultipleRows}
              title="Recuar à Esquerda (Alt+Shift+←)"
              className="p-1.5 bg-white disabled:opacity-40 text-slate-600 hover:text-blue-600 rounded cursor-pointer transition-all border border-slate-200"
            >
              <Outdent className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={selectedRowIndices.size === 0 && selectedRowIndex === null}
              onClick={indentMultipleRows}
              title="Recuar à Direita (Alt+Shift+→)"
              className="p-1.5 bg-white disabled:opacity-40 text-slate-600 hover:text-blue-600 rounded cursor-pointer transition-all border border-slate-200"
            >
              <Indent className="w-4 h-4" />
            </button>
          </div>


          {/* Atalho para Curva ABC do Orçamento */}
          <div className="flex flex-col gap-1">
            <button 
              onClick={() => navigate(`/curva-abc?id=${id}`)}
              className="bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Abrir a Curva ABC deste orçamento"
            >
              <BarChart3 className="w-4 h-4 text-purple-600" />
              <span>Curva ABC</span>
            </button>

            {/* Botão de workflow — aparece abaixo de Importar conforme status */}
            {(() => {
              const rawStatus = (orcamento?.status || '').trim();
              const isAgValidacao = rawStatus.toLowerCase().includes('valida');
              const isEnviada = rawStatus.toLowerCase() === 'enviada';
              const isCancelada = rawStatus.toLowerCase() === 'cancelada';
              const isAprovado = orcamento?.aprovado === true;
              const isRecusado = (orcamento?.decisao_gestor === 'recusar' || (id ? localStorage.getItem(`orcamento_decisao_${id}`) === 'recusar' : false)) && !isAprovado;
              const isEmAndamento = !isAgValidacao && !isEnviada && !isCancelada;

              // 1. Se o parecer do gestor for APROVADO (e ainda não foi marcado como enviado nem cancelado):
              if (isAprovado && !isEnviada && !isCancelada) {
                return (
                  <div className="flex flex-col gap-1 w-full">
                    <button
                      disabled={updatingStatus || isReadOnly}
                      onClick={() => setShowStatusEnvioModal(true)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-emerald-400 text-emerald-800 bg-emerald-100 hover:bg-emerald-200 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-sm w-full justify-center whitespace-nowrap"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {updatingStatus ? 'Enviando...' : 'Enviar ao Cliente'}
                    </button>
                    <button
                      disabled={updatingStatus || isReadOnly}
                      onClick={() => { if (window.confirm('Tem certeza que deseja cancelar este orçamento?')) handleUpdateStatus('Cancelada'); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs w-full justify-center whitespace-nowrap"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      Cancelar Orçamento
                    </button>
                  </div>
                );
              }

              // 2. Se está aguardando validação do gestor (e não foi aprovado nem cancelado):
              if (isAgValidacao && !isAprovado && !isCancelada) {
                return (
                  <div className="flex flex-col gap-1 w-full">
                    <span className="px-3 py-1.5 rounded-lg text-[10px] font-semibold border border-amber-200 text-amber-600 bg-amber-50 flex items-center gap-1.5 whitespace-nowrap justify-center">
                      <Clock className="w-3 h-3 animate-pulse shrink-0" /> Ag. aprovação
                    </span>
                    <button
                      disabled={updatingStatus || isReadOnly}
                      onClick={() => { if (window.confirm('Cancelar este orçamento e remover do fluxo de aprovação?')) handleUpdateStatus('Cancelada'); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs w-full justify-center whitespace-nowrap"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      Cancelar Orçamento
                    </button>
                  </div>
                );
              }

              // 3. Se foi RECUSADO pelo gestor (devolvido em Em andamento sem aprovação):
              if (isRecusado && !isEnviada && !isCancelada) {
                return (
                  <div className="flex flex-col gap-1 w-full">
                    <button
                      disabled={updatingStatus || isReadOnly}
                      onClick={() => { if (window.confirm('Enviar esta planilha revisada para nova validação do gestor?')) handleUpdateStatus('Ag. Validação'); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-amber-400 text-amber-800 bg-amber-50 hover:bg-amber-100 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-sm w-full justify-center whitespace-nowrap"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {updatingStatus ? 'Enviando...' : 'Enviar p/ Validação'}
                    </button>

                    <button
                      disabled={updatingStatus || isReadOnly}
                      onClick={() => { if (window.confirm('Tem certeza que deseja cancelar este orçamento recusado?')) handleUpdateStatus('Cancelada'); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs w-full justify-center whitespace-nowrap"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      Cancelar Orçamento
                    </button>
                  </div>
                );
              }

              // 4. Se está Em andamento (início normal, com pendências, ou sem recusa prévia):
              if (isEmAndamento) {
                const decisao = orcamento?.decisao_gestor || (id ? localStorage.getItem(`orcamento_decisao_${id}`) : null);
                const isComPendencia = decisao === 'aprovar_pendencia';

                return (
                  <div className="flex flex-col gap-1 w-full">
                    <button
                      disabled={updatingStatus || isReadOnly}
                      onClick={() => { if (window.confirm('Enviar esta planilha para validação do gestor?')) handleUpdateStatus('Ag. Validação'); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-amber-400 text-amber-800 bg-amber-50 hover:bg-amber-100 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-sm w-full justify-center whitespace-nowrap"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {updatingStatus ? 'Enviando...' : 'Enviar p/ Validação'}
                    </button>

                    {isComPendencia && (
                      <button
                        disabled={updatingStatus || isReadOnly}
                        onClick={() => setShowStatusEnvioModal(true)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-sm w-full justify-center whitespace-nowrap"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {updatingStatus ? 'Enviando...' : 'Confirmar Envio'}
                      </button>
                    )}

                    <button
                      disabled={updatingStatus || isReadOnly}
                      onClick={() => { if (window.confirm('Tem certeza que deseja cancelar este orçamento?')) handleUpdateStatus('Cancelada'); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs w-full justify-center whitespace-nowrap"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      Cancelar Orçamento
                    </button>
                  </div>
                );
              }

              // 4. Se o status é Enviada:
              if (isEnviada) {
                return (
                  <div className="flex flex-col gap-1 w-full">
                    <div className="relative w-full">
                      <button
                        disabled={updatingStatus}
                        onClick={() => setShowStatusEnvioMenu(p => !p)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 w-full justify-between"
                      >
                        <span>Status de Envio</span>
                        {showStatusEnvioMenu ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      {showStatusEnvioMenu && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setShowStatusEnvioMenu(false)} />
                          <div className="absolute right-0 mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-40 text-xs text-slate-700 font-medium">
                            {STATUS_ENVIO_OPTIONS.map(opt => (
                              <button
                                key={opt}
                                onClick={() => {
                                  if (opt === 'Cancelada') {
                                    handleUpdateStatus('Cancelada', 'Cancelada');
                                  } else {
                                    handleUpdateStatus('Enviada', opt);
                                  }
                                  setShowStatusEnvioMenu(false);
                                }}
                                className={clsx('w-full text-left px-4 py-2 hover:bg-slate-50 cursor-pointer transition-colors', orcamento?.status_envio === opt && 'bg-blue-50 text-blue-700 font-bold')}
                              >
                                {opt}
                              </button>
                            ))}
                            <div className="border-t border-slate-100 my-1" />
                            <button
                              onClick={() => {
                                if (window.confirm('Deseja retornar este orçamento para o status "Em andamento"?')) {
                                  handleUpdateStatus('Em andamento', null);
                                  setShowStatusEnvioMenu(false);
                                }
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-amber-50 text-amber-700 font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" /> Voltar p/ Em andamento
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('Tem certeza que deseja cancelar este orçamento?')) {
                                  handleUpdateStatus('Cancelada', 'Cancelada');
                                  setShowStatusEnvioMenu(false);
                                }
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-rose-50 text-rose-600 font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-500" /> Cancelar Orçamento
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Botão de criar nova revisão se não houver revisão posterior e status de envio for Encerrada */}
                    {!isReadOnly && !higherRevisionObj && orcamento?.status_envio === 'Encerrada' && (
                      <button
                        disabled={updatingStatus}
                        onClick={handleCreateRevisionFromCurrent}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 transition-all cursor-pointer flex items-center gap-1.5 justify-center w-full shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> + Nova Revisão
                      </button>
                    )}
                  </div>
                );
              }

              // 5. Se foi Cancelada:
              if (isCancelada) {
                return (
                  <div className="flex flex-col gap-1 w-full">
                    <span className="px-3 py-1.5 rounded-lg text-[10px] font-bold border border-rose-200 text-rose-700 bg-rose-50 flex items-center gap-1.5 whitespace-nowrap justify-center">
                      <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" /> Orçamento Cancelado
                    </span>
                    <button
                      disabled={updatingStatus}
                      onClick={() => { if (window.confirm('Reabrir este orçamento para o status "Em andamento"?')) handleUpdateStatus('Em andamento', null); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 w-full justify-center shadow-xs"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Reabrir (Em andamento)
                    </button>
                  </div>
                );
              }

              return null;
            })()}
          </div>

        </div>
      </div>

      {/* ── Status de Aguardando Validação (Diferencia Modo Gestor vs Modo Orçamentista) ── */}
      {(() => {
        const rawStatus = (orcamento?.status || '').trim();
        const isAgValidacao = rawStatus.toLowerCase().includes('valida');
        const isAprovado = orcamento?.aprovado === true;

        if (!isAgValidacao || isAprovado) return null;

        // Se o orçamento foi aberto vindo da aba "Fluxo de Aprovação" (?modo=validacao), exibe o Painel Interativo do Gestor com botões e parecer
        if (isGestorMode) {
          return (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50/70 border-2 border-amber-300 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-amber-200/80 pb-3">
                <div>
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-base">
                    <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
                    <span>Painel de Validação do Gestor</span>
                  </div>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Analise a planilha e escolha se deseja Aprovar, Aprovar com Pendências ou Recusar para o orçamentista.
                  </p>
                </div>

                {/* Botões de Ação do Gestor */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    disabled={updatingStatus}
                    onClick={() => handleDecisaoGestor('recusar')}
                    className="px-3.5 py-2 rounded-xl border border-rose-300 text-rose-700 bg-white hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4 text-rose-600" />
                    Recusar / Rejeitar
                  </button>

                  <button
                    disabled={updatingStatus}
                    onClick={() => handleDecisaoGestor('aprovar_pendencia')}
                    className="px-3.5 py-2 rounded-xl border border-amber-300 text-amber-900 bg-amber-100 hover:bg-amber-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Aprovar c/ Pendência
                  </button>

                  <button
                    disabled={updatingStatus}
                    onClick={() => handleDecisaoGestor('aprovar')}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Aprovar Orçamento
                  </button>
                </div>
              </div>

              {/* Campo de Observações do Gestor */}
              <div>
                <label className="block text-xs font-bold text-amber-950 mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-amber-700" />
                  Observações / Parecer do Gestor (orientações ou motivos da recusa/pendência):
                </label>
                <textarea
                  value={observacaoGestorInput}
                  onChange={e => setObservacaoGestorInput(e.target.value)}
                  placeholder="Digite aqui observações, sugestões de melhoria ou o motivo da recusa..."
                  className="w-full text-xs p-3 rounded-xl border border-amber-300 bg-white text-slate-800 outline-none focus:ring-2 focus:ring-amber-500 min-h-[70px] shadow-inner"
                />
                <p className="text-[10px] text-amber-700/80 mt-1.5 flex items-center gap-1">
                  <span className="bg-amber-100 border border-amber-300 text-amber-800 px-1.5 py-0.5 rounded font-mono font-bold text-[10px]">💡</span>
                  Dica: mencione códigos EAP (ex: <span className="font-mono font-bold underline decoration-dotted">1.2.1</span>) — o orçamentista poderá clicar no código para ir direto à linha na planilha.
                </p>
              </div>
            </div>
          );
        }

        // Se foi aberto pela tela normal de Orçamentos pelo Orçamentista, exibe apenas informativo não editável
        return (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-300/80 rounded-2xl p-4 shadow-sm flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100/80 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <span>Orçamento Enviado para Validação do Gestor</span>
                <span className="bg-amber-200/70 text-amber-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-300/80">
                  Aguardando Análise
                </span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed font-medium">
                Este orçamento foi enviado para validação e está aguardando a análise e aprovação do gestor na tela de <b>Fluxo de Aprovação</b>.
              </p>

              {orcamento?.observacao_gestor && (
                <div className="mt-2.5 pt-2.5 border-t border-amber-200/70">
                  <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wider mb-1">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                    Observações / Parecer do Gestor:
                  </div>
                  <div className="text-xs text-slate-800 bg-white/80 p-3 rounded-xl border border-amber-200/80 font-medium leading-relaxed">
                    {renderObsWithLinks(orcamento.observacao_gestor)}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Banner de Observações do Gestor (para o orçamentista quando devolver em "Em andamento") ── */}
      {(() => {
        const rawStatus = (orcamento?.status || '').trim();
        const isEmAndamento = !rawStatus || rawStatus.toLowerCase() === 'em andamento';
        const hasNotes = Boolean(orcamento?.observacao_gestor);
        const decisao = orcamento?.decisao_gestor || (id ? localStorage.getItem(`orcamento_decisao_${id}`) : null);

        if (!isEmAndamento || !hasNotes) return null;

        if (decisao === 'aprovar_pendencia') {
          return (
            <div className="bg-gradient-to-r from-amber-50 via-yellow-50/50 to-amber-50 border-l-4 border-amber-500 rounded-2xl p-4.5 shadow-sm flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-extrabold text-amber-900 uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  PARECER DO GESTOR: APROVADO COM PENDÊNCIAS
                </div>
                <p className="text-xs text-amber-950 font-bold bg-white/80 p-2.5 rounded-xl border border-amber-200/80 leading-relaxed">
                  "{renderObsWithLinks(orcamento.observacao_gestor)}"
                </p>
                <p className="text-[11px] text-amber-800 font-medium mt-1">
                  Este orçamento foi pré-aprovado com pendências. Realize os ajustes solicitados acima e clique em <b>"Enviar p/ Validação"</b> para reenviar a planilha ao gestor.
                </p>
              </div>
              <button
                onClick={() => setOrcamento((p: any) => ({ ...p, observacao_gestor: null }))}
                className="text-amber-500 hover:text-amber-700 p-1 rounded-lg hover:bg-amber-100/50 transition-colors cursor-pointer shrink-0 mt-0.5"
                title="Dispensar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        }

        if (decisao === 'recusar') {
          return (
            <div className="bg-gradient-to-r from-rose-50 via-amber-50/50 to-rose-50 border-l-4 border-rose-500 rounded-2xl p-4.5 shadow-sm flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-extrabold text-rose-900 uppercase tracking-wider">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  ORÇAMENTO RECUSADO PELO GESTOR
                </div>
                <p className="text-xs text-rose-950 font-bold bg-white/80 p-2.5 rounded-xl border border-rose-200/80 leading-relaxed">
                  "{renderObsWithLinks(orcamento.observacao_gestor)}"
                </p>
                <p className="text-[11px] text-rose-800 font-medium mt-1">
                  Este orçamento foi recusado. Altere os itens na planilha e clique em <b>"Enviar p/ Validação"</b> para solicitar nova aprovação, ou clique em <b>"Cancelar Orçamento"</b> se o orçamento for descartado.
                </p>
              </div>
              <button
                onClick={() => setOrcamento((p: any) => ({ ...p, observacao_gestor: null }))}
                className="text-rose-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-100/50 transition-colors cursor-pointer shrink-0 mt-0.5"
                title="Dispensar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        }

        return (
          <div className="bg-gradient-to-r from-amber-50 to-amber-100/60 border-l-4 border-amber-500 rounded-2xl p-4 shadow-sm flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                <MessageSquare className="w-4 h-4 text-amber-600" />
                Parecer / Observações do Gestor
              </div>
              <p className="text-xs text-amber-950 font-semibold leading-relaxed">
                "{renderObsWithLinks(orcamento.observacao_gestor)}"
              </p>
              <p className="text-[11px] text-amber-700 mt-1">
                Ajuste os itens necessários na planilha e clique em <b>"Enviar p/ Validação"</b> para reenviar ao gestor.
              </p>
            </div>
            <button
              onClick={() => setOrcamento((p: any) => ({ ...p, observacao_gestor: null }))}
              className="text-amber-600 hover:text-amber-800 p-1 rounded-lg hover:bg-amber-200/50 transition-colors cursor-pointer shrink-0"
              title="Dispensar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })()}


      {/* \u2500\u2500 Painel de Configura\u00e7\u00f5es / BDI \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      {showConfig && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
              <Settings2 className="w-5 h-5 text-blue-600" />
              Configurações e Parâmetros de BDI
            </h3>
            <button onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nome do Orçamento</label>
              <input type="text" value={configData.nome} onChange={e => { setConfigData(p => ({ ...p, nome: e.target.value })); setHasUnsavedChanges(true); }}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nome do Projeto (Obra)</label>
              <input type="text" value={configData.projeto} onChange={e => { setConfigData(p => ({ ...p, projeto: e.target.value })); setHasUnsavedChanges(true); }}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Cliente</label>
              <input type="text" value={configData.cliente} onChange={e => { setConfigData(p => ({ ...p, cliente: e.target.value })); setHasUnsavedChanges(true); }}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Gestor do Cliente</label>
              <input type="text" value={configData.gestor_cliente} onChange={e => { setConfigData(p => ({ ...p, gestor_cliente: e.target.value })); setHasUnsavedChanges(true); }}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-3">Composição do BDI (%)</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Adm. Central (AC)</label>
                <input type="number" step="0.0001" value={configData.bdi_ac} 
                  onChange={e => { setConfigData(p => ({ ...p, bdi_ac: parseFloat(e.target.value) || 0 })); setHasUnsavedChanges(true); }}
                  className="w-full px-2.5 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Seguro (S)</label>
                <input type="number" step="0.0001" value={configData.bdi_s} 
                  onChange={e => { setConfigData(p => ({ ...p, bdi_s: parseFloat(e.target.value) || 0 })); setHasUnsavedChanges(true); }}
                  className="w-full px-2.5 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Garantia (G)</label>
                <input type="number" step="0.0001" value={configData.bdi_g} 
                  onChange={e => { setConfigData(p => ({ ...p, bdi_g: parseFloat(e.target.value) || 0 })); setHasUnsavedChanges(true); }}
                  className="w-full px-2.5 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Risco (R)</label>
                <input type="number" step="0.0001" value={configData.bdi_r} 
                  onChange={e => { setConfigData(p => ({ ...p, bdi_r: parseFloat(e.target.value) || 0 })); setHasUnsavedChanges(true); }}
                  className="w-full px-2.5 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Desp. Finan. (DF)</label>
                <input type="number" step="0.0001" value={configData.bdi_df} 
                  onChange={e => { setConfigData(p => ({ ...p, bdi_df: parseFloat(e.target.value) || 0 })); setHasUnsavedChanges(true); }}
                  className="w-full px-2.5 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Lucro (L)</label>
                <input type="number" step="0.0001" value={configData.bdi_l} 
                  onChange={e => { setConfigData(p => ({ ...p, bdi_l: parseFloat(e.target.value) || 0 })); setHasUnsavedChanges(true); }}
                  className="w-full px-2.5 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Impostos (I)</label>
                <input type="number" step="0.0001" value={configData.bdi_i} 
                  onChange={e => { setConfigData(p => ({ ...p, bdi_i: parseFloat(e.target.value) || 0 })); setHasUnsavedChanges(true); }}
                  className="w-full px-2.5 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center">
              <span className="text-xs text-slate-500 italic">
                * Valores expressos em porcentagem (ex: 15 para 15%)
              </span>
              <span className="text-sm font-bold text-slate-700">
                BDI Calculado: <span className="text-blue-600 font-extrabold text-base">{bdiPercent.toFixed(2)}%</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-Abas do Orçamento (Planilha Orçamentária vs Memória de Cálculo) ── */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('planilha')}
          className={clsx(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
            activeSubTab === 'planilha'
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          )}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Planilha Orçamentária
        </button>

        <button
          onClick={() => setActiveSubTab('memoria_calculo')}
          className={clsx(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer relative",
            activeSubTab === 'memoria_calculo'
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          )}
        >
          <Calculator className="w-4 h-4" />
          Memória de Cálculo (Hub BRP)
          {calculos.length > 0 && (
            <span className={clsx(
              "px-2 py-0.5 rounded-full text-[10px] font-extrabold",
              activeSubTab === 'memoria_calculo' ? "bg-white text-blue-700" : "bg-blue-100 text-blue-700"
            )}>
              {calculos.length}
            </span>
          )}
        </button>
      </div>

      {activeSubTab === 'memoria_calculo' ? (
        <CalculosHub
          orcamentoId={id!}
          calculos={calculos}
          itensEap={computedItens.map(i => ({
            id: i.id,
            item_eap: i.item_eap,
            descricao: i.descricao,
            unidade: i.unidade,
            quantidade: i.quantidade
          }))}
          onSaveCalculo={handleSaveCalculo}
          onDeleteCalculo={handleDeleteCalculo}
        />
      ) : (
      /* ── Tabela Orçamentária ────────────────────────────────────────── */
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="border border-slate-200/80 px-4 py-2 w-24">Item</th>
                <th 
                  className="border border-slate-200/80 px-6 py-2 relative select-none"
                  style={{ width: `${descColWidth}px`, minWidth: `${descColWidth}px`, maxWidth: `${descColWidth}px` }}
                >
                  <div className="flex items-center justify-between">
                    <span>Descrição</span>
                    <div
                      onMouseDown={handleResizeMouseDown}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize bg-slate-200 hover:bg-blue-500 transition-colors z-30"
                      title="Arraste para ajustar o tamanho da coluna"
                    />
                  </div>
                </th>
                <th className="border border-slate-200/80 px-4 py-2 w-20 text-center">Und.</th>
                <th className="border border-slate-200/80 px-4 py-2 w-24 text-right">Qtde.</th>
                <th className="border border-slate-200/80 px-4 py-2 w-32 text-right">Mat. Unit (R$)</th>
                <th className="border border-slate-200/80 px-4 py-2 w-32 text-right">M.O. Unit (R$)</th>
                <th className="border border-slate-200/80 px-4 py-2 w-32 text-right">Unit (R$)</th>
                <th className="border border-slate-200/80 px-4 py-2 w-36 text-right">Mat. Total (R$)</th>
                <th className="border border-slate-200/80 px-4 py-2 w-36 text-right">M.O. Total (R$)</th>
                <th className="border border-slate-200/80 px-4 py-2 w-36 text-right">Total (R$)</th>
                <th className="border border-slate-200/80 px-2 py-2 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {computedItens.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400 font-medium">
                    Nenhum item inserido no orçamento. Clique em "Adicionar Item" ou "Importar Item" para começar.
                  </td>
                </tr>
              ) : (
                computedItens.map((item, index) => {
                  // Oculta linhas colapsadas pela estrutura de tópicos
                  if (isRowHidden(item.item_eap)) return null;

                  const level = getEapLevel(item.item_eap);
                  const factor = exibirBdi ? bdiFactor : 1;

                  // Valores calculados multiplicados pelo fator BDI
                  const valMat = item.valor_unitario_mat * factor;
                  const valMo = item.valor_unitario_mo * factor;
                  const valUnit = item.valor_unitario * factor;
                  const styles = getRowStyles(item, index);
                  const totMat = item.total_mat * factor;
                  const totMo = item.total_mo * factor;
                  const totGrand = item.total * factor;
                  const hasValues = (item.item_eap || '').trim() !== '' || (item.descricao || '').trim() !== '';

                  const isCompActive = item.codigo && item.hasChildren && selectedRowIndex !== null && (
                    selectedRowIndex === index || 
                    (itens[selectedRowIndex]?.item_eap || '').startsWith(item.item_eap + '.')
                  );

                  return (
                    <tr 
                      key={item.id}
                      id={item.item_eap ? `row-eap-${item.item_eap.trim()}` : undefined}
                      draggable={hasValues}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => handleRowClick(index, e)}
                      className={clsx(
                        "transition-all group select-none border-l-4",
                        styles.rowBgClass,
                        // Linha selecionada sobrepõe
                        selectedRowIndices.has(index) ? "!bg-blue-50/70 !border-l-blue-500" : ""
                      )}
                    >
                      {/* EAP Item */}
                      <td
                        id={`cell-td-${index}-0`}
                        tabIndex={0}
                        onKeyDown={(e) => handleTdKeyDown(e, index, 0)}
                        onClick={(e) => handleCellClick(index, 0, e)}
                        onDoubleClick={() => {
                          setActiveCell({ rowIndex: index, colIndex: 0 });
                          if (isCellEditable(item, 0, exibirBdi)) {
                            setShouldSelectAll(true);
                            setIsEditingCell(true);
                          }
                        }}
                        className={clsx(
                          "border border-slate-200/60 p-0 relative outline-none",
                          activeCell?.rowIndex === index && activeCell?.colIndex === 0 ? "ring-2 ring-blue-600 ring-inset bg-blue-50/50 z-20" : ""
                        )}
                      >
                        <div className="flex items-center gap-1 px-1.5 w-full h-full bg-transparent">
                          {hasValues ? (
                            <GripVertical className="w-3.5 h-3.5 text-slate-300 cursor-grab active:cursor-grabbing hover:text-slate-500 transition-colors shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <input
                            type="text"
                            id={`cell-input-${index}-0`}
                            value={item.item_eap}
                            onFocus={() => handleInputFocus(index)}
                            onKeyDown={(e) => handleInputKeyDownInCell(e, index, 0)}
                            onChange={(e) => handleCellChange(index, 'item_eap', e.target.value)}
                            className={clsx(
                              "w-full h-full bg-transparent py-2 outline-none border border-transparent focus:border-blue-500 focus:bg-white font-mono transition-all",
                              styles.textClass,
                              (item.isSummary || item.hasChildren) && hasValues ? "cursor-pointer" : ""
                            )}
                          />
                        </div>
                      </td>

                      {/* Descrição */}
                      <td 
                        id={`cell-td-${index}-1`}
                        tabIndex={0}
                        onKeyDown={(e) => handleTdKeyDown(e, index, 1)}
                        onClick={(e) => handleCellClick(index, 1, e)}
                        onDoubleClick={() => {
                          setActiveCell({ rowIndex: index, colIndex: 1 });
                          if (isCellEditable(item, 1, exibirBdi)) {
                            setShouldSelectAll(true);
                            setIsEditingCell(true);
                          }
                        }}
                        className={clsx(
                          "border border-slate-200/60 p-0 relative align-middle outline-none",
                          activeCell?.rowIndex === index && activeCell?.colIndex === 1 ? "ring-2 ring-blue-600 ring-inset bg-blue-50/50 z-20" : ""
                        )}
                        style={{ width: `${descColWidth}px`, minWidth: `${descColWidth}px`, maxWidth: `${descColWidth}px` }}
                      >
                        <div className="flex items-center w-full h-full relative">
                          <div style={{ width: `${level * 16}px` }} className="shrink-0" />
                          {(item.isSummary || item.hasChildren) ? (
                            <button
                              type="button"
                              onClick={() => toggleCollapse(item.item_eap)}
                              className="p-1 hover:bg-slate-150 hover:text-slate-700 rounded text-slate-500 mr-1 shrink-0 cursor-pointer"
                            >
                              {collapsedEaps.has(item.item_eap) ? (
                                <ChevronRight className="w-3.5 h-3.5 text-slate-600 font-bold" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-600 font-bold" />
                              )}
                            </button>
                          ) : (
                            <div className="w-6 shrink-0" />
                          )}

                          {item.codigo ? (
                            <div
                              id={`cell-input-${index}-1`}
                              onClick={() => (item.isSummary || item.hasChildren) && hasValues ? toggleCollapse(item.item_eap) : undefined}
                              onFocus={() => handleInputFocus(index)}
                              onMouseDown={(e) => { if (e.ctrlKey || e.metaKey || e.shiftKey) e.preventDefault(); }}
                              tabIndex={0}
                              className={clsx(
                                "w-full bg-transparent pr-10 pl-1 py-2 outline-none break-words whitespace-normal leading-normal select-text",
                                styles.textClass,
                                (item.isSummary || item.hasChildren) && hasValues ? "cursor-pointer" : ""
                              )}
                              title={item.descricao}
                            >
                              {item.descricao}
                            </div>
                          ) : (
                            <input
                              type="text"
                              id={`cell-input-${index}-1`}
                              value={item.descricao}
                              onFocus={() => handleInputFocus(index)}
                              onMouseDown={(e) => { if (e.ctrlKey || e.metaKey || e.shiftKey) e.preventDefault(); }}
                              onKeyDown={(e) => handleInputKeyDownInCell(e, index, 1)}
                              onClick={() => (item.isSummary || item.hasChildren) && hasValues ? toggleCollapse(item.item_eap) : undefined}
                              onChange={(e) => handleCellChange(index, 'descricao', e.target.value)}
                              className={clsx(
                                "w-full h-full bg-transparent pr-10 py-2 outline-none border border-transparent focus:border-blue-500 focus:bg-white transition-all",
                                styles.textClass,
                                (item.isSummary || item.hasChildren) && hasValues ? "cursor-pointer" : ""
                              )}
                            />
                          )}

                          {selectedRowIndex === index && !item.codigo && (
                            <button
                              type="button"
                              onClick={() => {
                                setTargetImportRowIndex(index);
                                setShowImportDrawer(true);
                              }}
                              title="Importar insumo ou composição para esta linha"
                              className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-400 transition-colors cursor-pointer z-10"
                            >
                              <Search className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {hasValues && item.codigo && (
                            <button
                              type="button"
                              onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenComparison(item);
                              }}
                              title="Comparar preços com as bases de dados"
                              className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 hover:bg-emerald-50 hover:text-emerald-655 rounded-lg text-slate-455 hover:text-emerald-600 transition-colors cursor-pointer z-10"
                            >
                              <Calculator className="w-3.5 h-3.5 text-emerald-500" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Unidade */}
                      <td
                        id={`cell-td-${index}-2`}
                        tabIndex={0}
                        onKeyDown={(e) => handleTdKeyDown(e, index, 2)}
                        onClick={(e) => handleCellClick(index, 2, e)}
                        onDoubleClick={() => {
                          setActiveCell({ rowIndex: index, colIndex: 2 });
                          if (isCellEditable(item, 2, exibirBdi)) {
                            setShouldSelectAll(true);
                            setIsEditingCell(true);
                          }
                        }}
                        className={clsx(
                          "border border-slate-200/60 p-0 relative outline-none",
                          activeCell?.rowIndex === index && activeCell?.colIndex === 2 ? "ring-2 ring-blue-600 ring-inset bg-blue-50/50 z-20" : ""
                        )}
                      >
                        <input
                          type="text"
                          id={`cell-input-${index}-2`}
                          disabled={item.isSummary}
                          readOnly={!!item.codigo}
                          value={item.isSummary ? '' : item.unidade}
                          onFocus={() => handleInputFocus(index)}
                          onMouseDown={(e) => { if (e.ctrlKey || e.metaKey || e.shiftKey) e.preventDefault(); }}
                          onKeyDown={(e) => handleInputKeyDownInCell(e, index, 2)}
                          onChange={(e) => handleCellChange(index, 'unidade', e.target.value)}
                          className={clsx(
                            "w-full h-full bg-transparent text-center px-2 py-2 outline-none border border-transparent transition-all",
                            styles.textClass,
                            item.isSummary ? "cursor-not-allowed bg-slate-50/50 text-slate-400" : "focus:border-blue-500 focus:bg-white",
                            item.codigo && !item.isSummary ? "cursor-not-allowed text-slate-500/80" : ""
                          )}
                        />
                      </td>

                      {/* Quantidade */}
                      <td
                        id={`cell-td-${index}-3`}
                        tabIndex={0}
                        onKeyDown={(e) => handleTdKeyDown(e, index, 3)}
                        onClick={(e) => handleCellClick(index, 3, e)}
                        onDoubleClick={() => {
                          setActiveCell({ rowIndex: index, colIndex: 3 });
                          if (isCellEditable(item, 3, exibirBdi)) {
                            setShouldSelectAll(true);
                            setIsEditingCell(true);
                          }
                        }}
                        className={clsx(
                          "border border-slate-200/60 p-0 relative outline-none",
                          activeCell?.rowIndex === index && activeCell?.colIndex === 3 ? "ring-2 ring-blue-600 ring-inset bg-blue-50/50 z-20" : "",
                          hasValues && !item.isSummary && item.quantidade === 0 ? "bg-rose-50/60 ring-1 ring-rose-400" : ""
                        )}
                      >
                        {/* Balão de alerta flutuante quando a quantidade está vazia/zerada */}
                        {hasValues && !item.isSummary && item.quantidade === 0 && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 bg-rose-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-xl flex items-center gap-1.5 z-40 whitespace-nowrap pointer-events-none animate-pulse">
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-rose-600 w-0 h-0" />
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Preencha a quantidade!</span>
                          </div>
                        )}

                        {(() => {
                          const isChildOfComp = item.effectiveMultiplier > 1;
                          const displayQtd = isChildOfComp
                            ? item.baseQuantidade * item.effectiveMultiplier
                            : item.quantidade;
                          if (item.isSummary) {
                            return <div className="w-full h-full bg-slate-50/50 cursor-not-allowed" />;
                          }
                          
                          // Se estiver editando de fato a célula de quantidade
                          if (activeCell?.rowIndex === index && activeCell?.colIndex === 3 && isEditingCell) {
                            return (
                              <input
                                type="number"
                                id={`cell-input-${index}-3`}
                                placeholder=""
                                value={item.quantidade === 0 ? '' : item.quantidade}
                                onFocus={() => handleInputFocus(index)}
                                onMouseDown={(e) => { if (e.ctrlKey || e.metaKey || e.shiftKey) e.preventDefault(); }}
                                onKeyDown={(e) => handleInputKeyDownInCell(e, index, 3)}
                                onChange={(e) => handleCellChange(index, 'quantidade', e.target.value)}
                                className={clsx(
                                  "w-full h-full bg-transparent text-right px-3 py-2 outline-none border border-transparent focus:border-blue-500 focus:bg-white transition-all",
                                  styles.textClass
                                )}
                              />
                            );
                          }

                          if (isChildOfComp) {
                            return (
                              <div
                                className={clsx(
                                  "w-full h-full text-right px-3 py-2 select-none cursor-pointer",
                                  styles.textClass,
                                  displayQtd === 0 ? "text-rose-600 font-semibold" : ""
                                )}
                                title={`Coeficiente base: ${item.baseQuantidade} × ${item.effectiveMultiplier} (qtd. da composição)`}
                              >
                                {hasValues && displayQtd !== 0 ? displayQtd.toLocaleString('pt-BR', { maximumFractionDigits: 6 }) : ''}
                              </div>
                            );
                          }
                          return (
                            <div
                              className={clsx(
                                "w-full h-full text-right px-3 py-2 select-none cursor-pointer",
                                styles.textClass,
                                item.quantidade === 0 ? "text-rose-600 font-semibold" : ""
                              )}
                            >
                              {hasValues && item.quantidade !== 0 ? item.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 6 }) : ''}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Material Unitário */}
                      <td
                        id={`cell-td-${index}-4`}
                        tabIndex={0}
                        onKeyDown={(e) => handleTdKeyDown(e, index, 4)}
                        onClick={(e) => handleCellClick(index, 4, e)}
                        onDoubleClick={() => {
                          setActiveCell({ rowIndex: index, colIndex: 4 });
                          if (isCellEditable(item, 4, exibirBdi)) {
                            setShouldSelectAll(true);
                            setIsEditingCell(true);
                          }
                        }}
                        className={clsx(
                          "border border-slate-200/60 p-0 relative outline-none",
                          activeCell?.rowIndex === index && activeCell?.colIndex === 4 ? "ring-2 ring-blue-600 ring-inset bg-blue-50/50 z-20" : ""
                        )}
                      >
                        <input
                          type="number"
                          step="0.01"
                          id={`cell-input-${index}-4`}
                          disabled={exibirBdi || item.isSummary}
                          value={item.isSummary ? '' : (!hasValues ? '' : valMat)}
                          onFocus={() => handleInputFocus(index)}
                          onMouseDown={(e) => { if (e.ctrlKey || e.metaKey || e.shiftKey) e.preventDefault(); }}
                          onKeyDown={(e) => handleInputKeyDownInCell(e, index, 4)}
                          onChange={(e) => handleCellChange(index, 'valor_unitario_mat', e.target.value)}
                          className={clsx(
                            "w-full h-full bg-transparent text-right px-3 py-2 outline-none border border-transparent transition-all",
                            styles.textClass,
                            (exibirBdi || item.isSummary) ? "cursor-not-allowed bg-slate-50/30 text-slate-400" : "focus:border-blue-500 focus:bg-white"
                          )}
                        />
                      </td>

                      {/* Mão de Obra Unitária */}
                      <td
                        id={`cell-td-${index}-5`}
                        tabIndex={0}
                        onKeyDown={(e) => handleTdKeyDown(e, index, 5)}
                        onClick={(e) => handleCellClick(index, 5, e)}
                        onDoubleClick={() => {
                          setActiveCell({ rowIndex: index, colIndex: 5 });
                          if (isCellEditable(item, 5, exibirBdi)) {
                            setShouldSelectAll(true);
                            setIsEditingCell(true);
                          }
                        }}
                        className={clsx(
                          "border border-slate-200/60 p-0 relative outline-none",
                          activeCell?.rowIndex === index && activeCell?.colIndex === 5 ? "ring-2 ring-blue-600 ring-inset bg-blue-50/50 z-20" : ""
                        )}
                      >
                        <input
                          type="number"
                          step="0.01"
                          id={`cell-input-${index}-5`}
                          disabled={exibirBdi || item.isSummary}
                          value={item.isSummary ? '' : (!hasValues ? '' : valMo)}
                          onFocus={() => handleInputFocus(index)}
                          onMouseDown={(e) => { if (e.ctrlKey || e.metaKey || e.shiftKey) e.preventDefault(); }}
                          onKeyDown={(e) => handleInputKeyDownInCell(e, index, 5)}
                          onChange={(e) => handleCellChange(index, 'valor_unitario_mo', e.target.value)}
                          className={clsx(
                            "w-full h-full bg-transparent text-right px-3 py-2 outline-none border border-transparent transition-all",
                            styles.textClass,
                            (exibirBdi || item.isSummary) ? "cursor-not-allowed bg-slate-50/30 text-slate-400" : "focus:border-blue-500 focus:bg-white"
                          )}
                        />
                      </td>

                      {/* Unitário Total (Soma) */}
                      <td
                        id={`cell-td-${index}-6`}
                        tabIndex={0}
                        onKeyDown={(e) => handleTdKeyDown(e, index, 6)}
                        onClick={(e) => {
                          if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                            setActiveCell({ rowIndex: index, colIndex: 6 });
                            setIsEditingCell(false);
                          }
                        }}
                        className={clsx(
                          "border border-slate-200/60 px-3 py-2 text-right tabular-nums relative outline-none",
                          styles.textClass,
                          activeCell?.rowIndex === index && activeCell?.colIndex === 6 ? "ring-2 ring-blue-600 ring-inset bg-blue-50/50 z-20" : ""
                        )}
                      >
                        {hasValues && !item.isSummary && valUnit > 0 ? valUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : hasValues && item.isSummary ? '' : hasValues ? valUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                      </td>

                      {/* Material Total */}
                      <td
                        id={`cell-td-${index}-7`}
                        tabIndex={0}
                        onKeyDown={(e) => handleTdKeyDown(e, index, 7)}
                        onClick={(e) => {
                          if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                            setActiveCell({ rowIndex: index, colIndex: 7 });
                            setIsEditingCell(false);
                          }
                        }}
                        className={clsx(
                          "border border-slate-200/60 px-3 py-2 text-right tabular-nums relative outline-none",
                          item.isSummary && hasValues ? "font-bold text-slate-700" :
                          isCompActive ? "font-bold text-slate-800" :
                          item.hasChildren && hasValues ? "font-semibold text-slate-650" :
                          styles.textClass,
                          activeCell?.rowIndex === index && activeCell?.colIndex === 7 ? "ring-2 ring-blue-600 ring-inset bg-blue-50/50 z-20" : ""
                        )}
                      >
                        {hasValues ? totMat.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                      </td>

                      {/* Mão de Obra Total */}
                      <td
                        id={`cell-td-${index}-8`}
                        tabIndex={0}
                        onKeyDown={(e) => handleTdKeyDown(e, index, 8)}
                        onClick={(e) => {
                          if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                            setActiveCell({ rowIndex: index, colIndex: 8 });
                            setIsEditingCell(false);
                          }
                        }}
                        className={clsx(
                          "border border-slate-200/60 px-3 py-2 text-right tabular-nums relative outline-none",
                          item.isSummary && hasValues ? "font-bold text-slate-700" :
                          isCompActive ? "font-bold text-slate-800" :
                          item.hasChildren && hasValues ? "font-semibold text-slate-650" :
                          styles.textClass,
                          activeCell?.rowIndex === index && activeCell?.colIndex === 8 ? "ring-2 ring-blue-600 ring-inset bg-blue-50/50 z-20" : ""
                        )}
                      >
                        {hasValues ? totMo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                      </td>

                      {/* Total da Linha */}
                      <td
                        id={`cell-td-${index}-9`}
                        tabIndex={0}
                        onKeyDown={(e) => handleTdKeyDown(e, index, 9)}
                        onClick={(e) => {
                          if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                            setActiveCell({ rowIndex: index, colIndex: 9 });
                            setIsEditingCell(false);
                          }
                        }}
                        className={clsx(
                          "border border-slate-200/60 px-3 py-2 text-right tabular-nums relative outline-none",
                          item.isSummary && hasValues ? "font-extrabold text-slate-800 text-sm" :
                          isCompActive ? "font-bold text-blue-700" :
                          item.hasChildren && item.codigo && hasValues ? "font-semibold text-blue-600" :
                          styles.textClass,
                          activeCell?.rowIndex === index && activeCell?.colIndex === 9 ? "ring-2 ring-blue-600 ring-inset bg-blue-50/50 z-20" : ""
                        )}
                      >
                        {hasValues ? totGrand.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                      </td>

                      {/* Remover Linha */}
                      <td className="border border-slate-200/60 px-2 py-2 text-center">
                        <button 
                          onClick={() => handleRemoveRow(index)}
                          className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé Dinâmico */}
        <div className="bg-slate-50 p-5 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm font-bold text-slate-700">
          <button 
            onClick={handleAddRow}
            className="border-2 border-dashed border-blue-300 hover:border-blue-600 text-blue-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer bg-white"
          >
            <Plus className="w-4 h-4" />
            Adicionar Item Vazio
          </button>
          
          <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto text-right">
            <div>
              <span className="text-slate-400 text-xs font-semibold uppercase">Total Mat.</span>
              <p className="text-base text-slate-700 font-extrabold">
                {(totals.mat * (exibirBdi ? bdiFactor : 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
            <div>
              <span className="text-slate-400 text-xs font-semibold uppercase">Total M.O.</span>
              <p className="text-base text-slate-700 font-extrabold">
                {(totals.mo * (exibirBdi ? bdiFactor : 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
            <div>
              <span className="text-slate-400 text-xs font-semibold uppercase">Custo Geral {exibirBdi && '(c/ BDI)'}</span>
              <p className="text-base text-blue-600 font-extrabold">
                {(totals.total * (exibirBdi ? bdiFactor : 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ── Painel Flutuante de Salvar ─────────────────────────────────── */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 z-40 border border-slate-700/60 animate-bounce">
          <span className="text-xs font-medium">Você possui alterações não salvas na planilha</span>
          <div className="flex gap-2">
            <button 
              onClick={loadOrcamento}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full text-xs font-semibold transition-colors cursor-pointer"
            >
              Descartar
            </button>
            <button 
              onClick={handleSavePlanilha}
              disabled={saving}
              className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              {saving ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Save className="w-3 h-3" />
              )}
              {saving ? 'Salvando...' : 'Salvar Planilha'}
            </button>
          </div>
        </div>
      )}

      {/* ── Drawer Lateral de Importação ────────────────────────────────── */}
      {showImportDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowImportDrawer(false)} />
          
          <div className="bg-white w-full max-w-lg h-full flex flex-col shadow-2xl z-10 relative">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                <Import className="w-5 h-5 text-blue-600" />
                Importar da Base de Dados
              </h3>
              <button onClick={() => setShowImportDrawer(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Abas e Filtros */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-3">
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-bold text-center">
                <button 
                  onClick={() => setImportTab('insumos_proprios')}
                  className={clsx("py-1.5 rounded-md cursor-pointer", importTab === 'insumos_proprios' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800")}
                >
                  Insumos Próprios
                </button>
                <button 
                  onClick={() => setImportTab('composicoes_proprias')}
                  className={clsx("py-1.5 rounded-md cursor-pointer", importTab === 'composicoes_proprias' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800")}
                >
                  Composições Próprias
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Pesquisar por código ou descrição..."
                  value={importSearch}
                  onChange={e => setImportSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Listagem de Resultados */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
              {loadingImport ? (
                <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center">
                  <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                  Buscando itens...
                </div>
              ) : importResults.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Nenhum item encontrado.
                </div>
              ) : (
                importResults.map((item) => {
                  const isComp = importTab.includes('composicoes');
                  const cost = isComp 
                    ? parseFloat(item.cdu || item.custo_sem_desoneracao || 0)
                    : parseFloat(item.valor || item.valor_nao_desonerado || 0);

                  return (
                    <div key={item.id} className="p-3 hover:bg-slate-50 flex justify-between items-center gap-4 rounded-lg transition-colors group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="bg-slate-100 text-slate-600 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded">
                            {item.codigo}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">{item.unidade}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 break-words whitespace-normal" title={item.descricao}>{item.descricao}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          Ref: {item.fonte || item.fonte_preco} · Valor: {cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                      
                      {importedItemIds[item.id] ? (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold flex items-center gap-1 shrink-0 select-none animate-pulse">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Importado
                        </span>
                      ) : (
                        <button 
                          onClick={() => handleImportItem(item)}
                          className="px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <Plus className="w-3 h-3" />
                          Importar
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Drawer Lateral de Comparação de Preços ─────────────────────── */}
      {showComparisonDrawer && comparisonItem && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowComparisonDrawer(false)} />
          
          <div className="bg-white w-full max-w-lg h-full flex flex-col shadow-2xl z-10 relative border-l border-slate-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                <Calculator className="w-5 h-5 text-emerald-650" />
                Comparativo de Preços com as Bases
              </h3>
              <button onClick={() => setShowComparisonDrawer(false)} className="text-slate-400 hover:text-slate-650 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Item Information Card */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-slate-100 text-slate-700 font-mono text-xs font-bold px-2 py-0.5 rounded border border-slate-200">
                  {comparisonItem.codigo}
                </span>
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                  UND: {comparisonItem.unidade}
                </span>
              </div>
              <h4 className="font-bold text-slate-800 text-sm leading-snug">
                {comparisonItem.descricao}
              </h4>
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {loadingComparison ? (
                <div className="py-24 text-center text-slate-505 text-xs flex flex-col items-center justify-center">
                  <div className="w-8 h-8 border-3 border-emerald-650 border-t-transparent rounded-full animate-spin mb-3"></div>
                  Buscando dados comparativos nas bases...
                </div>
              ) : (
                <>
                  {/* Orçamento Atual Card */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <h5 className="text-xs font-extrabold text-slate-450 uppercase tracking-wider mb-3">Valor no Orçamento</h5>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <span className="text-[10px] text-slate-450 font-bold uppercase">Material Unit.</span>
                        <p className="text-xs font-extrabold text-slate-800 mt-0.5">
                          {comparisonItem.valor_unitario_mat.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-450 font-bold uppercase">M.O. Unit.</span>
                        <p className="text-xs font-extrabold text-slate-800 mt-0.5">
                          {comparisonItem.valor_unitario_mo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-450 font-bold uppercase">Unitário Total</span>
                        <p className="text-sm font-black text-slate-900 mt-0.5">
                          {comparisonItem.valor_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Comparativo com Banco Próprio */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Banco Próprio</h5>
                    {comparisonData?.proprio ? (
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <span className="text-[10px] text-slate-450 font-bold uppercase">Material Unit.</span>
                            <p className="text-xs font-semibold text-slate-800 mt-0.5">
                              {comparisonData.proprio.mat.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-450 font-bold uppercase">M.O. Unit.</span>
                            <p className="text-xs font-semibold text-slate-800 mt-0.5">
                              {comparisonData.proprio.mo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-450 font-bold uppercase">Unitário Total</span>
                            <p className="text-xs font-bold text-slate-800 mt-0.5">
                              {(comparisonData.proprio.mat + comparisonData.proprio.mo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>
                        </div>

                        {/* Deviation Calculations */}
                        {(() => {
                          const budgetVal = comparisonItem.valor_unitario;
                          const refVal = comparisonData.proprio.mat + comparisonData.proprio.mo;
                          const diff = budgetVal - refVal;
                          const pct = refVal > 0 ? (diff / refVal) * 100 : 0;

                          return (
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Desvio:</span>
                                {diff > 0.001 ? (
                                  <span className="bg-red-50 text-red-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-red-150">
                                    + {diff.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (+{pct.toFixed(1)}%)
                                  </span>
                                ) : diff < -0.001 ? (
                                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-150">
                                    {diff.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({pct.toFixed(1)}%)
                                  </span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-655 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                    Sem desvio (0%)
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleApplyReferencePrice('proprio')}
                                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                              >
                                Aplicar este preço
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-center text-slate-400 text-xs py-6">
                        Este item não está cadastrado no Banco Próprio.
                      </div>
                    )}
                  </div>

                  {/* Comparativo com Banco do Sistema (Sinapi/etc) */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-extrabold text-slate-505 uppercase tracking-wider">
                      Bancos do Sistema {comparisonData?.sistema?.fonte && `(${comparisonData.sistema.fonte})`}
                    </h5>
                    {comparisonData?.sistema ? (
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <span className="text-[10px] text-slate-450 font-bold uppercase">Material Unit.</span>
                            <p className="text-xs font-semibold text-slate-800 mt-0.5">
                              {comparisonData.sistema.mat.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-450 font-bold uppercase">M.O. Unit.</span>
                            <p className="text-xs font-semibold text-slate-800 mt-0.5">
                              {comparisonData.sistema.mo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-450 font-bold uppercase">Unitário Total</span>
                            <p className="text-xs font-bold text-slate-800 mt-0.5">
                              {(comparisonData.sistema.mat + comparisonData.sistema.mo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>
                        </div>

                        {/* Deviation Calculations */}
                        {(() => {
                          const budgetVal = comparisonItem.valor_unitario;
                          const refVal = comparisonData.sistema.mat + comparisonData.sistema.mo;
                          const diff = budgetVal - refVal;
                          const pct = refVal > 0 ? (diff / refVal) * 100 : 0;

                          return (
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Desvio:</span>
                                {diff > 0.001 ? (
                                  <span className="bg-red-50 text-red-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-red-150">
                                    + {diff.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (+{pct.toFixed(1)}%)
                                  </span>
                                ) : diff < -0.001 ? (
                                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-150">
                                    {diff.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({pct.toFixed(1)}%)
                                  </span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-655 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                    Sem desvio (0%)
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleApplyReferencePrice('sistema')}
                                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                              >
                                Aplicar este preço
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-center text-slate-400 text-xs py-6">
                        Este item não está cadastrado em nenhuma base do sistema.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Escolha do Status de Envio */}
      {showStatusEnvioModal && (
        <ModalStatusEnvio
          onClose={() => setShowStatusEnvioModal(false)}
          onSelectStatusEnvio={async (selectedStatusEnvio) => {
            setShowStatusEnvioModal(false);
            await handleUpdateStatus('Enviada', selectedStatusEnvio);
          }}
        />
      )}
    </div>
  );
}
