import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Building2, Calendar, DollarSign, Plus, Trash2, Edit3, CheckSquare, Square, 
  RotateCcw, Search, ShieldCheck, FileSpreadsheet,
  ChevronUp, ChevronDown, Sliders, Percent, Info, Calculator
} from 'lucide-react';
import { clsx } from 'clsx';
import type { IndiretoOrcamentoConfig, IndiretoGrupo, IndiretoItem, DestinoIndireto, UnidadeIndireto } from '../../types/indireto';
import { loadIndiretoConfig, saveIndiretoConfig, calculateIndiretoTotais, getDefaultIndiretoConfig, getGlobalIndiretoCatalogo, generateEapItemsFromIndiretos, type IndiretoSyncMode } from '../../lib/indiretoStorage';
import { supabase } from '../../lib/supabase';

interface CustosIndiretosTabProps {
  orcamentoId: string;
  duracaoMesesPadrao?: number;
  duracaoCronogramaDias?: number;
  totalCustoDireto?: number;
  currentBdiAc?: number;
  onSyncEap?: (itensEap: any[], options?: { syncMode: IndiretoSyncMode; specificGrupoId?: string | null }) => void;
  onApplyBdi?: (taxaAcPercent: number, modo: 'substituir' | 'somar') => void;
  onChangeConfig?: (config: IndiretoOrcamentoConfig) => void;
}

export default function CustosIndiretosTab({
  orcamentoId,
  duracaoMesesPadrao = 6,
  duracaoCronogramaDias,
  totalCustoDireto = 0,
  currentBdiAc = 0,
  onSyncEap,
  onApplyBdi,
  onChangeConfig
}: CustosIndiretosTabProps) {
  const [config, setConfig] = useState<IndiretoOrcamentoConfig>(() => 
    loadIndiretoConfig(orcamentoId, duracaoMesesPadrao)
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Estado de grupos colapsados
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Grupo selecionado ao abrir modal de criação de item
  const [targetGrupoIdForModal, setTargetGrupoIdForModal] = useState<string>('g1');

  // Modais
  const [isNovoGrupoModalOpen, setIsNovoGrupoModalOpen] = useState(false);
  const [novoGrupoNome, setNovoGrupoNome] = useState('');
  const [novoGrupoDesc, setNovoGrupoDesc] = useState('');

  const [isNovoItemModalOpen, setIsNovoItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IndiretoItem | null>(null);

  // Formulário de item
  const [itemFormData, setItemFormData] = useState({
    descricao: '',
    codigo: '',
    unidade: 'mês' as UnidadeIndireto,
    alocacaoMensal: 1,
    isCustoFixo: false,
    valorUnitario: 0,
    valorFixoEncargos: 0,
    observacao: ''
  });

  // Modal para buscar insumo do banco próprio
  const [isBuscaInsumoOpen, setIsBuscaInsumoOpen] = useState(false);
  const [buscaInsumoQuery, setBuscaInsumoQuery] = useState('');
  const [insumosEncontrados, setInsumosEncontrados] = useState<any[]>([]);
  const [loadingInsumos, setLoadingInsumos] = useState(false);

  // Modal de sincronização com EAP (Detalhado vs Sintético)
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncModalGrupoId, setSyncModalGrupoId] = useState<string | null>(null);
  const [syncMode, setSyncMode] = useState<IndiretoSyncMode>('detalhado');

  // Modal para aplicação de taxa no BDI
  const [isApplyBdiModalOpen, setIsApplyBdiModalOpen] = useState(false);
  const [bdiDirectBaseInput, setBdiDirectBaseInput] = useState<number | ''>('');
  const [bdiRateInput, setBdiRateInput] = useState<number | ''>('');
  const [bdiApplyMode, setBdiApplyMode] = useState<'substituir' | 'somar'>('substituir');
  const [isManualRateOverride, setIsManualRateOverride] = useState(false);

  // Atualiza prazo quando prop externa de duração muda
  useEffect(() => {
    if (duracaoMesesPadrao && duracaoMesesPadrao !== config.prazoObraMeses) {
      updatePrazoMeses(duracaoMesesPadrao);
    }
  }, [duracaoMesesPadrao]);

  // Recarrega configuração quando orcamentoId mudar para garantir sincronia com alterações feitas na Planilha Orçamentária
  useEffect(() => {
    const loaded = loadIndiretoConfig(orcamentoId, duracaoMesesPadrao);
    setConfig(loaded);
  }, [orcamentoId]);

  // Sincroniza as unidades dos itens do orçamento com as unidades originais do Banco Próprio
  useEffect(() => {
    const sincronizarUnidadesComBanco = async () => {
      try {
        const codigos = new Set<string>();
        const descricoes = new Set<string>();
        (config.grupos || []).forEach(g => {
          (g.itens || []).forEach(i => {
            if (i.codigo) codigos.add(i.codigo.trim().toLowerCase());
            if (i.descricao) descricoes.add(i.descricao.trim().toLowerCase());
          });
        });

        if (codigos.size === 0 && descricoes.size === 0) return;

        let { data: insumosDB, error } = await supabase
          .schema('engenharia')
          .from('insumos')
          .select('codigo, descricao, unidade');

        if ((error && error.code === '42P01') || (!error && (!insumosDB || insumosDB.length === 0))) {
          const resPublic = await supabase
            .from('insumos')
            .select('codigo, descricao, unidade');
          if (!resPublic.error && resPublic.data && resPublic.data.length > 0) {
            insumosDB = resPublic.data;
          }
        }

        if (!insumosDB || insumosDB.length === 0) return;

        const mapaPorCodigo = new Map<string, any>();
        const mapaPorDescricao = new Map<string, any>();
        insumosDB.forEach(ins => {
          if (ins.codigo) mapaPorCodigo.set(ins.codigo.trim().toLowerCase(), ins);
          if (ins.descricao) mapaPorDescricao.set(ins.descricao.trim().toLowerCase(), ins);
        });

        let houveAlteracao = false;
        const novosGrupos = config.grupos.map(g => ({
          ...g,
          itens: (g.itens || []).map(item => {
            const codKey = (item.codigo || '').trim().toLowerCase();
            const descKey = (item.descricao || '').trim().toLowerCase();
            const insumoEncontrado = mapaPorCodigo.get(codKey) || mapaPorDescricao.get(descKey);

            if (insumoEncontrado && insumoEncontrado.unidade && insumoEncontrado.unidade !== item.unidade) {
              houveAlteracao = true;
              return {
                ...item,
                unidade: insumoEncontrado.unidade
              };
            }
            return item;
          })
        }));

        if (houveAlteracao) {
          updateConfigState({ ...config, grupos: novosGrupos });
        }
      } catch (err) {
        console.error('Erro ao sincronizar unidades em CustosIndiretosTab:', err);
      }
    };

    sincronizarUnidadesComBanco();
  }, [orcamentoId]);

  // Salva no localStorage e notifica pai, garantindo sempre renumeração sequencial 1..N
  const updateConfigState = useCallback((newConfig: IndiretoOrcamentoConfig) => {
    const gruposSequenciais = (newConfig.grupos || []).map((g, idx) => ({
      ...g,
      numero: idx + 1
    }));
    const sanitizedConfig = {
      ...newConfig,
      grupos: gruposSequenciais
    };
    setConfig(sanitizedConfig);
    saveIndiretoConfig(orcamentoId, sanitizedConfig);
    if (onChangeConfig) {
      onChangeConfig(sanitizedConfig);
    }
  }, [orcamentoId, onChangeConfig]);

  // Atualiza prazo em meses do orçamento
  const updatePrazoMeses = (novosMeses: number) => {
    const prazo = Math.max(1, novosMeses);
    const gruposAtualizados = config.grupos.map(g => ({
      ...g,
      itens: g.itens.map(i => {
        const effectivePrazo = i.isCustoFixo ? 1 : (i.alocacaoMensal || 1);
        const unitU = i.valorUnitario || 0;
        const unitEncargos = i.valorFixoEncargos || 0;
        const totalQtd = i.quantidadeTotal || 0;
        return {
          ...i,
          valorTotal: (effectivePrazo * totalQtd * unitU) + unitEncargos
        };
      })
    }));

    const newConfig = {
      ...config,
      prazoObraMeses: prazo,
      grupos: gruposAtualizados
    };
    updateConfigState(newConfig);
  };

  // Totais calculados dinamicamente
  const totais = useMemo(() => {
    return calculateIndiretoTotais(config, totalCustoDireto);
  }, [config, totalCustoDireto]);

  // Alternar colapso de um grupo
  const toggleGroupCollapse = (grupoId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(grupoId)) next.delete(grupoId);
      else next.add(grupoId);
      return next;
    });
  };

  const expandAllGroups = () => setCollapsedGroups(new Set());
  const collapseAllGroups = () => setCollapsedGroups(new Set(config.grupos.map(g => g.id)));

  // Alterna ativação do item (checkbox)
  const toggleItemAtivo = (grupoId: string, itemId: string) => {
    const novosGrupos = config.grupos.map(g => {
      if (g.id !== grupoId) return g;
      return {
        ...g,
        itens: g.itens.map(i => i.id === itemId ? { ...i, ativo: !i.ativo } : i)
      };
    });
    updateConfigState({ ...config, grupos: novosGrupos });
  };

  // Altera valor unitário, encargos, prazo ou quantidade total direto na tabela
  const updateItemField = (
    grupoId: string, 
    itemId: string, 
    field: 'alocacaoMensal' | 'valorUnitario' | 'valorFixoEncargos' | 'isCustoFixo' | 'quantidadeTotal', 
    val: any
  ) => {
    const novosGrupos = config.grupos.map(g => {
      if (g.id !== grupoId) return g;
      return {
        ...g,
        itens: g.itens.map(i => {
          if (i.id !== itemId) return i;
          let aloc = i.alocacaoMensal;
          let isFixo = i.isCustoFixo;
          let unitU = i.valorUnitario || 0;
          let unitEncargos = i.valorFixoEncargos || 0;
          let totalQtd = i.quantidadeTotal;

          if (field === 'alocacaoMensal') {
            aloc = val === '' ? 0 : Math.max(0, parseFloat(val) || 0);
          } else if (field === 'quantidadeTotal') {
            totalQtd = val === '' ? 0 : Math.max(0, parseFloat(val) || 0);
          } else if (field === 'isCustoFixo') {
            isFixo = Boolean(val);
          } else if (field === 'valorUnitario') {
            unitU = val === '' ? 0 : Math.max(0, parseFloat(val) || 0);
          } else if (field === 'valorFixoEncargos') {
            unitEncargos = val === '' ? 0 : Math.max(0, parseFloat(val) || 0);
          }

          const effectivePrazo = isFixo ? 1 : aloc;
          // Se o prazo for 0 e não for fixo, zera a parte proporcional ao prazo mas preserva encargos/valores fixos
          const valorTotal = (!isFixo && effectivePrazo === 0)
            ? unitEncargos
            : (effectivePrazo * totalQtd * unitU) + unitEncargos;

          return {
            ...i,
            alocacaoMensal: aloc,
            isCustoFixo: isFixo,
            valorUnitario: unitU,
            valorFixoEncargos: unitEncargos,
            quantidadeTotal: totalQtd,
            valorTotal: valorTotal
          };
        })
      };
    });
    updateConfigState({ ...config, grupos: novosGrupos });
  };

  // Exclui item
  const deleteItem = (grupoId: string, itemId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este item de custo indireto?')) return;
    const novosGrupos = config.grupos.map(g => {
      if (g.id !== grupoId) return g;
      return {
        ...g,
        itens: g.itens.filter(i => i.id !== itemId)
      };
    });
    updateConfigState({ ...config, grupos: novosGrupos });
  };

  // Adicionar novo grupo
  const handleAdicionarGrupo = () => {
    if (!novoGrupoNome.trim()) return;
    const novoGrupo: IndiretoGrupo = {
      id: `g_custom_${Date.now()}`,
      numero: config.grupos.length + 1,
      nome: novoGrupoNome.toUpperCase().trim(),
      descricao: novoGrupoDesc.trim(),
      ativo: true,
      itens: []
    };

    const novosGrupos = [...config.grupos, novoGrupo].map((g, idx) => ({
      ...g,
      numero: idx + 1
    }));

    updateConfigState({
      ...config,
      grupos: novosGrupos
    });

    setNovoGrupoNome('');
    setNovoGrupoDesc('');
    setIsNovoGrupoModalOpen(false);
  };

  // Excluir tabela / grupo de indiretos deste orçamento
  const handleExcluirGrupo = (grupoId: string) => {
    if (config.grupos.length <= 1) {
      alert('Você precisa ter pelo menos uma tabela/grupo de indiretos no orçamento.');
      return;
    }
    const grupo = config.grupos.find(g => g.id === grupoId);
    const nome = grupo?.nome || 'esta tabela';
    if (!window.confirm(`Deseja excluir a tabela "${nome}" e todos os seus itens deste orçamento?`)) return;
    const novosGrupos = config.grupos
      .filter(g => g.id !== grupoId)
      .map((g, idx) => ({ ...g, numero: idx + 1 }));
    updateConfigState({ ...config, grupos: novosGrupos });
  };

  // Abrir modal de seleção do Banco Próprio (insumos Indireto / Ambos com fallback resiliente)
  const handleOpenNovoItemModal = (grupoId: string) => {
    setTargetGrupoIdForModal(grupoId);
    setEditingItem(null);
    setBuscaInsumoQuery('');
    setIsBuscaInsumoOpen(true);
  };

  // Abrir modal de edição de item existente
  const handleOpenEditarItemModal = (item: IndiretoItem) => {
    setEditingItem(item);
    setTargetGrupoIdForModal(item.grupoId);
    setItemFormData({
      descricao: item.descricao,
      codigo: item.codigo || '',
      unidade: item.unidade,
      alocacaoMensal: item.alocacaoMensal,
      quantidadeTotal: item.quantidadeTotal,
      isCustoFixo: Boolean(item.isCustoFixo),
      valorUnitario: item.valorUnitario,
      valorFixoEncargos: item.valorFixoEncargos || 0,
      observacao: item.observacao || ''
    });
    setIsNovoItemModalOpen(true);
  };

  // Salvar item (edição de item existente)
  const handleSalvarItemModal = () => {
    if (!itemFormData.descricao.trim()) {
      alert('Informe a descrição do item.');
      return;
    }

    const aloc = Math.max(0, itemFormData.alocacaoMensal || 0);
    const totalQtd = Math.max(0, itemFormData.quantidadeTotal || 0);
    const unitU = Math.max(0, itemFormData.valorUnitario || 0);
    const unitEncargos = Math.max(0, itemFormData.valorFixoEncargos || 0);
    const effectivePrazo = itemFormData.isCustoFixo ? 1 : aloc;
    const valorTotal = (effectivePrazo * totalQtd * unitU) + unitEncargos;

    if (editingItem) {
      // Edição
      const novosGrupos = config.grupos.map(g => {
        if (g.id !== editingItem.grupoId) return g;
        return {
          ...g,
          itens: g.itens.map(i => i.id === editingItem.id ? {
            ...i,
            descricao: itemFormData.descricao.trim(),
            codigo: itemFormData.codigo.trim(),
            unidade: itemFormData.unidade,
            alocacaoMensal: aloc,
            isCustoFixo: itemFormData.isCustoFixo,
            quantidadeTotal: totalQtd,
            valorUnitario: unitU,
            valorFixoEncargos: unitEncargos,
            valorTotal: valorTotal,
            destino: 'eap',
            observacao: itemFormData.observacao.trim()
          } : i)
        };
      });
      updateConfigState({ ...config, grupos: novosGrupos });
    }

    setIsNovoItemModalOpen(false);
  };

  // Buscar insumos no Banco Próprio (Filtrado por tipo_custo = indireto ou ambos, com fallback para tipo_uso e para todos os insumos)
  const fetchInsumosBancoIndireto = useCallback(async (queryParam?: string) => {
    const q = queryParam !== undefined ? queryParam : buscaInsumoQuery;
    setLoadingInsumos(true);
    try {
      const buildQuery = (filterType: 'tipo_custo' | 'tipo_uso' | 'none') => {
        let query = supabase
          .schema('engenharia')
          .from('insumos')
          .select('*')
          .order('descricao', { ascending: true })
          .limit(100);

        if (filterType === 'tipo_custo') {
          query = query.in('tipo_custo', ['indireto', 'ambos']);
        } else if (filterType === 'tipo_uso') {
          query = query.in('tipo_uso', ['indireto', 'ambos']);
        }

        if (q.trim()) {
          query = query.or(`descricao.ilike.%${q.trim()}%,codigo.ilike.%${q.trim()}%`);
        }

        return query;
      };

      // 1. Tentar filtrar por tipo_custo
      let { data, error } = await buildQuery('tipo_custo');

      // 2. Se falhar a coluna ou vier 0 itens, tentar por tipo_uso
      if ((error && error.code === '42703') || (!error && (!data || data.length === 0))) {
        const resTipoUso = await buildQuery('tipo_uso');
        if (!resTipoUso.error && resTipoUso.data && resTipoUso.data.length > 0) {
          data = resTipoUso.data;
          error = null;
        } else {
          // 3. Fallback: traz os insumos do Banco Próprio filtrados pela busca por texto (ou todos se vazio)
          const resAll = await buildQuery('none');
          if (!resAll.error && resAll.data) {
            data = resAll.data;
            error = null;
          }
        }
      }

      if (!error && data) {
        setInsumosEncontrados(data);
      } else {
        console.error('Erro ao buscar insumos no Banco Próprio:', error);
        setInsumosEncontrados([]);
      }
    } catch (err) {
      console.error(err);
      setInsumosEncontrados([]);
    } finally {
      setLoadingInsumos(false);
    }
  }, [buscaInsumoQuery]);

  // Carregamento automático ao abrir o modal e filtragem em tempo real enquanto digita
  useEffect(() => {
    if (isBuscaInsumoOpen) {
      const timer = setTimeout(() => {
        fetchInsumosBancoIndireto(buscaInsumoQuery);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isBuscaInsumoOpen, buscaInsumoQuery, fetchInsumosBancoIndireto]);

  // Selecionar insumo do Banco Próprio e adicionar diretamente ao grupo
  const handleSelecionarInsumoBanco = (insumo: any) => {
    const valUnit = parseFloat(insumo.valor || insumo.valor_nao_desonerado || 0);
    const isFixo = insumo.unidade !== 'mês' && insumo.unidade !== 'equipe/mês';
    const effectivePrazo = isFixo ? 1 : 1;
    const valorTotal = (effectivePrazo * 1 * valUnit) + 0;

    const novoItem: IndiretoItem = {
      id: `i_banco_${insumo.id}_${Date.now()}`,
      grupoId: targetGrupoIdForModal,
      descricao: insumo.descricao,
      codigo: insumo.codigo || `IND-${Date.now().toString().slice(-4)}`,
      unidade: insumo.unidade || 'un',
      alocacaoMensal: 1,
      quantidadeTotal: 1,
      isCustoFixo: isFixo,
      valorUnitario: valUnit,
      valorFixoEncargos: 0,
      valorTotal: valorTotal,
      destino: 'eap',
      ativo: true,
      observacao: `Importado do Banco Próprio (${insumo.fonte_preco || 'Cotação'})`,
      isCustom: false,
      tipo_custo: insumo.tipo_custo || 'indireto'
    };

    const novosGrupos = config.grupos.map(g => {
      if (g.id !== targetGrupoIdForModal) return g;
      return {
        ...g,
        itens: [...g.itens, novoItem]
      };
    });
    updateConfigState({ ...config, grupos: novosGrupos });
    setIsBuscaInsumoOpen(false);
  };

  // Limpar todos os itens de todos os grupos
  const handleLimparTodosItens = () => {
    if (!window.confirm('Deseja remover todos os insumos de todos os grupos de custos indiretos?')) return;
    const gruposLimpos = (config.grupos || []).map(g => ({ ...g, itens: [] }));
    updateConfigState({ ...config, grupos: gruposLimpos });
  };

  // Restaurar grupos do catálogo padrão
  const handleRestaurarTemplatePadrao = () => {
    if (!window.confirm('Deseja restaurar a estrutura padrão de grupos do Catálogo Global?')) return;
    const globalCat = getGlobalIndiretoCatalogo();
    const rawGrupos = Array.isArray(globalCat) ? globalCat : (globalCat as any).grupos || [];
    const gruposRestaurados = rawGrupos.map((g: IndiretoGrupo, idx: number) => ({
      ...g,
      numero: idx + 1
    }));
    updateConfigState({ ...config, grupos: gruposRestaurados });
  };

  // Abrir modal de sincronização (global ou para grupo específico)
  const handleAbrirModalSyncEap = (grupoId?: string) => {
    setSyncModalGrupoId(grupoId || null);
    setSyncMode('detalhado');
    setIsSyncModalOpen(true);
  };

  // Confirmar sincronização e enviar para a Planilha Orçamentária
  const handleConfirmarSyncEap = () => {
    if (onSyncEap) {
      const itensEap = generateEapItemsFromIndiretos(config, orcamentoId, syncMode, syncModalGrupoId || undefined);
      onSyncEap(itensEap, { syncMode, specificGrupoId: syncModalGrupoId });
      const grupoNome = syncModalGrupoId ? config.grupos.find(g => g.id === syncModalGrupoId)?.nome : null;
      const msg = grupoNome 
        ? `Grupo "${grupoNome}" inserido com sucesso na Planilha Orçamentária (${syncMode === 'sintetico' ? 'Modo Sintético' : 'Modo Detalhado'})!`
        : `Custos Indiretos inseridos com sucesso na EAP da Planilha Orçamentária (${syncMode === 'sintetico' ? 'Modo Sintético' : 'Modo Detalhado'})!`;
      setSyncFeedback(msg);
      setTimeout(() => setSyncFeedback(null), 4500);
    }
    setIsSyncModalOpen(false);
  };

  // Abrir modal de aplicação da taxa no BDI
  const handleAbrirModalApplyBdi = () => {
    const directBase = totalCustoDireto && totalCustoDireto > 0 ? totalCustoDireto : 0;
    setBdiDirectBaseInput(directBase > 0 ? directBase : '');
    
    const calculatedRate = directBase > 0 
      ? (totais.totalGeral / directBase) * 100 
      : 0;
    
    setBdiRateInput(calculatedRate > 0 ? Math.round(calculatedRate * 100) / 100 : '');
    setBdiApplyMode('substituir');
    setIsManualRateOverride(false);
    setIsApplyBdiModalOpen(true);
  };

  // Confirmar aplicação de taxa no BDI
  const handleConfirmarApplyBdi = () => {
    const rateToApply = Math.round((Number(bdiRateInput) || 0) * 100) / 100;
    if (rateToApply <= 0) {
      alert('Informe uma taxa percentual válida maior que zero para aplicar no BDI.');
      return;
    }
    if (onApplyBdi) {
      onApplyBdi(rateToApply, bdiApplyMode);
    }
    setIsApplyBdiModalOpen(false);
    setSyncFeedback(`Taxa de ${rateToApply.toFixed(2)}% aplicada com sucesso no BDI (Administração Central)!`);
    setTimeout(() => setSyncFeedback(null), 5000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 overflow-y-auto font-sans pb-12">
      
      {/* ── HEADER SUPERIOR E METRICAS (Clean & Clean Light Style) ────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-200/60">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Custos Indiretos & Canteiro de Obras
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                  {config.grupos.length} Grupos
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Ajuste as quantidades mensais e valores unitários. Os custos são calculados com base no prazo da obra.
              </p>
            </div>
          </div>

          {/* Botões Globais */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNovoGrupoModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-4 h-4 text-blue-600" />
              Novo Grupo
            </button>

            <button
              onClick={handleLimparTodosItens}
              className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition flex items-center gap-1.5 shadow-2xs"
              title="Remover todos os insumos de todos os grupos para cadastrar novos"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar Itens
            </button>

            <button
              onClick={handleRestaurarTemplatePadrao}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition flex items-center gap-1.5 shadow-2xs"
              title="Restaurar catálogo padrão BRP"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar Padrão
            </button>

            {onApplyBdi && (
              <button
                onClick={handleAbrirModalApplyBdi}
                className="px-4 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                title="Aplicar a taxa percentual calculada de custos indiretos no BDI (Administração Central) da obra"
              >
                <Percent className="w-4 h-4 text-emerald-700" />
                Aplicar Taxa no BDI
              </button>
            )}

            {onSyncEap && (
              <button
                onClick={() => handleAbrirModalSyncEap()}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition flex items-center gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Sincronizar com EAP
              </button>
            )}
          </div>
        </div>

        {/* Feedback de Sincronização */}
        {syncFeedback && (
          <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2 animate-fadeIn">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{syncFeedback}</span>
          </div>
        )}

        {/* Cards de Métricas Limpos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          
          {/* Prazo Obra */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">Duração da Obra</span>
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                  Cronograma
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-base font-extrabold text-slate-900 tabular-nums">
                  {duracaoCronogramaDias !== undefined && duracaoCronogramaDias > 0 
                    ? `${duracaoCronogramaDias} ${duracaoCronogramaDias === 1 ? 'dia' : 'dias'}` 
                    : `${config.prazoObraMeses * 30} dias`}
                </span>
              </div>
            </div>
            <Calendar className="w-5 h-5 text-emerald-600" />
          </div>

          {/* Total Indiretos */}
          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10.5px] font-bold text-blue-800 uppercase tracking-wider block">Total Custos Indiretos</span>
              <span className="text-base font-bold text-blue-950 mt-0.5 block tabular-nums">
                R$ {totais.totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <DollarSign className="w-5 h-5 text-blue-500/60" />
          </div>

          {/* % sobre Direto */}
          <div 
            onClick={onApplyBdi ? handleAbrirModalApplyBdi : undefined}
            className={clsx(
              "p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between transition-all select-none",
              onApplyBdi && "cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/40 group"
            )}
            title={onApplyBdi ? "Clique para abrir o painel e aplicar no BDI" : undefined}
          >
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">Indireto / Direto</span>
                {onApplyBdi && (
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-300/60 px-1 py-0.2 rounded group-hover:bg-emerald-200">
                    BDI
                  </span>
                )}
              </div>
              <span className="text-base font-bold text-slate-800 mt-0.5 block tabular-nums group-hover:text-emerald-800">
                {totalCustoDireto > 0 && totais.totalGeral > 0
                  ? `${((totais.totalGeral / totalCustoDireto) * 100).toFixed(2)}%`
                  : 'N/D'}
              </span>
            </div>
            <Percent className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>

          {/* Itens Ativos */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">Total de Itens</span>
              <span className="text-base font-bold text-slate-800 mt-0.5 block tabular-nums">
                {config.grupos.reduce((acc, g) => acc + g.itens.filter(i => i.ativo).length, 0)} ativos
              </span>
            </div>
            <Building2 className="w-5 h-5 text-slate-400" />
          </div>

        </div>

        {/* Filtro por Nome/Termo */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filtrar por insumo em todos os grupos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <button
              onClick={expandAllGroups}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition"
            >
              Expandir Todos
            </button>
            <button
              onClick={collapseAllGroups}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition"
            >
              Recolher Todos
            </button>
          </div>
        </div>
      </div>

      {/* ── LISTA VERTICAL DE TABELAS (LIMPA E SEM CABEÇALHOS ESCUROS) ──────────── */}
      <div className="max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {(config?.grupos || []).map((grupo) => {
          if (!grupo) return null;
          // Filtro por termo de busca
          const termo = (searchTerm || '').toLowerCase().trim();
          const grupoCombina = !termo || (grupo.nome || '').toLowerCase().includes(termo);
          const itensGrupo = Array.isArray(grupo.itens) ? grupo.itens : [];
          const itensFiltrados = itensGrupo.filter(i => i && (!termo || (i.descricao || '').toLowerCase().includes(termo) || (i.codigo || '').toLowerCase().includes(termo)));

          if (!grupoCombina && itensFiltrados.length === 0) {
            return null;
          }

          const isCollapsed = collapsedGroups.has(grupo.id);
          const subtotalGrupo = (totais && totais.totalPorGrupo && totais.totalPorGrupo[grupo.id]) || 0;
          const qtdItensAtivos = itensGrupo.filter(i => i && i.ativo).length;

          return (
            <div 
              key={grupo.id}
              className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition-all"
            >
              {/* HEADER DO GRUPO (LIMPO, SEM PREENCHIMENTO ESCURO / AZUL CARREGADO) */}
              <div 
                onClick={() => toggleGroupCollapse(grupo.id)}
                className="px-5 py-3 bg-slate-50/80 hover:bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 cursor-pointer select-none transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center shrink-0 border border-blue-200/80">
                    {grupo.numero}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      {grupo.nome}
                      {grupo.id.startsWith('g_custom_') && (
                        <span className="px-2 py-0.2 bg-slate-200 text-slate-700 text-[10px] rounded font-normal">
                          Personalizado
                        </span>
                      )}
                    </h3>
                    {grupo.descricao && (
                      <p className="text-[11px] text-slate-500 font-normal">
                        {grupo.descricao}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Qtd Itens Ativos */}
                  <span className="text-xs text-slate-500 font-medium hidden sm:inline-block">
                    <strong className="text-slate-800">{qtdItensAtivos}</strong> de {itensGrupo.length} itens
                  </span>

                  {/* Subtotal do Grupo */}
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Subtotal</span>
                    <span className="text-xs font-bold text-slate-900 tabular-nums">
                      R$ {subtotalGrupo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Botões de Ação do Grupo */}
                  <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3" onClick={(e) => e.stopPropagation()}>
                    {onSyncEap && (
                      <button
                        onClick={() => handleAbrirModalSyncEap(grupo.id)}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-lg transition flex items-center gap-1 shadow-2xs"
                        title="Inserir este grupo na Planilha Orçamentária"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">Inserir na EAP</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenNovoItemModal(grupo.id)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg transition flex items-center gap-1 shadow-2xs"
                      title="Adicionar item neste grupo"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-600" />
                      <span className="hidden sm:inline">Adicionar Item</span>
                    </button>

                    <button
                      onClick={() => handleExcluirGrupo(grupo.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition rounded cursor-pointer"
                      title={`Excluir tabela "${grupo.nome}" deste orçamento`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button 
                      onClick={() => toggleGroupCollapse(grupo.id)}
                      className="p-1 text-slate-400 hover:text-slate-700 transition"
                    >
                      {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* TABELA DE ITENS DO GRUPO (LIMPA, SEM COLUNA DESTINO) */}
              {!isCollapsed && (
                <div className="overflow-x-auto">
                  {grupo.itens.length > 0 ? (
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2 px-3 text-center w-10">Inc.</th>
                          <th className="py-2 px-3 text-left">Insumo / Descrição</th>
                          <th className="py-2 px-3 text-center w-24">Unidade</th>
                          <th className="py-2 px-3 text-center w-24">Prazo</th>
                          <th className="py-2 px-3 text-center w-16">Fixo?</th>
                          <th className="py-2 px-3 text-center w-24">Quantidade</th>
                          <th className="py-2 px-3 text-right w-28">Valor Unit. (R$)</th>
                          <th className="py-2 px-3 text-right w-36">Valor Fixo / Encargos (R$)</th>
                          <th className="py-2 px-3 text-right w-32">Total (R$)</th>
                          <th className="py-2 px-3 text-center w-12">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {itensFiltrados.map((item) => (
                          <tr 
                            key={item.id}
                            className={clsx(
                              "transition-colors hover:bg-slate-50",
                              !item.ativo && "opacity-40 bg-slate-50/50"
                            )}
                          >
                            {/* Checkbox de Inclusão */}
                            <td className="py-2 px-3 text-center">
                              <button
                                onClick={() => toggleItemAtivo(grupo.id, item.id)}
                                className={clsx(
                                  "p-1 rounded transition",
                                  item.ativo ? "text-blue-600 hover:text-blue-800" : "text-slate-400 hover:text-slate-600"
                                )}
                              >
                                {item.ativo ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                              </button>
                            </td>

                            {/* Descrição */}
                            <td className="py-2 px-3">
                              <div className="font-semibold text-slate-900">
                                {item.descricao}
                              </div>
                              {item.observacao && (
                                <span className="text-[10px] text-slate-400 block truncate">
                                  {item.observacao}
                                </span>
                              )}
                            </td>

                            {/* Unidade */}
                            <td className="py-2 px-3 text-center">
                              <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-semibold rounded">
                                {item.unidade}
                              </span>
                            </td>

                            {/* Prazo */}
                            <td className="py-2 px-3 text-center">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.alocacaoMensal === 0 ? '' : (item.alocacaoMensal ?? '')}
                                placeholder="0"
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => updateItemField(grupo.id, item.id, 'alocacaoMensal', e.target.value)}
                                className="w-20 text-center font-semibold bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none shadow-2xs"
                              />
                            </td>

                            {/* Custo Fixo? */}
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={Boolean(item.isCustoFixo)}
                                onChange={(e) => updateItemField(grupo.id, item.id, 'isCustoFixo', e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                title="Se marcado, a quantidade não é multiplicada pelo prazo da obra"
                              />
                            </td>

                            {/* Quantidade (Editável) */}
                            <td className="py-2 px-3 text-center">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.quantidadeTotal === 0 ? '' : (item.quantidadeTotal ?? '')}
                                placeholder="0"
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => updateItemField(grupo.id, item.id, 'quantidadeTotal', e.target.value)}
                                className="w-20 text-center font-semibold bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none tabular-nums shadow-2xs"
                              />
                            </td>

                            {/* Valor Unitário */}
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.valorUnitario === 0 ? '' : (item.valorUnitario ?? '')}
                                placeholder="0"
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => updateItemField(grupo.id, item.id, 'valorUnitario', e.target.value)}
                                className="w-24 text-right font-semibold bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none tabular-nums shadow-2xs"
                              />
                            </td>

                            {/* Valor Fixo / Encargos */}
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.valorFixoEncargos === 0 ? '' : (item.valorFixoEncargos ?? '')}
                                placeholder="0"
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => updateItemField(grupo.id, item.id, 'valorFixoEncargos', e.target.value)}
                                className="w-28 text-right font-semibold bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none tabular-nums shadow-2xs"
                              />
                            </td>

                            {/* Valor Total */}
                            <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums">
                              R$ {(item.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>

                            {/* Ações */}
                            <td className="py-2 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleOpenEditarItemModal(item)}
                                  className="p-1 text-slate-400 hover:text-blue-600 transition rounded"
                                  title="Editar item"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteItem(grupo.id, item.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 transition rounded"
                                  title="Excluir item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-5 text-center text-xs text-slate-400 bg-slate-50/50">
                      Nenhum item cadastrado neste grupo.{' '}
                      <button
                        onClick={() => handleOpenNovoItemModal(grupo.id)}
                        className="text-blue-600 font-bold hover:underline ml-1"
                      >
                        + Adicionar primeiro item
                      </button>
                    </div>
                  )}

                </div>
              )}
            </div>
          );
        })}

      </div>

      {/* ── MODAL: ADICIONAR NOVO GRUPO ────────────────────────────────────────── */}
      {isNovoGrupoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-fadeIn">
            <h3 className="text-base font-bold text-slate-900 mb-1">Criar Novo Grupo de Indireto</h3>
            <p className="text-xs text-slate-500 mb-4">Adicione um grupo personalizado para organizar custos específicos.</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Grupo *</label>
                <input
                  type="text"
                  placeholder="Ex: 15. GESTÃO AMBIENTAL E SUSTENTABILIDADE"
                  value={novoGrupoNome}
                  onChange={(e) => setNovoGrupoNome(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descrição Breve</label>
                <textarea
                  rows={2}
                  placeholder="Explicação do propósito deste grupo de custos..."
                  value={novoGrupoDesc}
                  onChange={(e) => setNovoGrupoDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsNovoGrupoModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdicionarGrupo}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-2xs"
              >
                Criar Grupo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADICIONAR / EDITAR ITEM ──────────────────────────────────────── */}
      {isNovoItemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingItem ? 'Editar Item Indireto' : 'Adicionar Novo Item Indireto'}
              </h3>
              
              <button
                onClick={() => setIsBuscaInsumoOpen(true)}
                className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                Buscar no Banco Próprio
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descrição do Insumo / Serviço *</label>
                <input
                  type="text"
                  placeholder="Ex: Engenheiro Residente / Aluguel de Container"
                  value={itemFormData.descricao}
                  onChange={(e) => setItemFormData({ ...itemFormData, descricao: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Código (Opcional)</label>
                  <input
                    type="text"
                    placeholder="IND-001"
                    value={itemFormData.codigo}
                    onChange={(e) => setItemFormData({ ...itemFormData, codigo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unidade *</label>
                  <select
                    value={itemFormData.unidade}
                    onChange={(e) => setItemFormData({ ...itemFormData, unidade: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="un">un (Unidade)</option>
                    <option value="unid">unid</option>
                    <option value="mês">mês</option>
                    <option value="equipe/mês">equipe/mês</option>
                    <option value="vb">vb (Verba)</option>
                    <option value="m">m</option>
                    <option value="m²">m²</option>
                    <option value="m³">m³</option>
                    <option value="kg">kg</option>
                    <option value="t">t</option>
                    <option value="h">h</option>
                    <option value="h/h">h/h</option>
                    <option value="dia">dia</option>
                    <option value="diária">diária</option>
                    <option value="km">km</option>
                    <option value="cj">cj</option>
                    {itemFormData.unidade && ![
                      'un', 'unid', 'mês', 'equipe/mês', 'vb', 'm', 'm²', 'm³', 'kg', 't', 'h', 'h/h', 'dia', 'diária', 'km', 'cj'
                    ].includes(itemFormData.unidade) && (
                      <option value={itemFormData.unidade}>{itemFormData.unidade}</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Prazo</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemFormData.alocacaoMensal}
                    onChange={(e) => setItemFormData({ ...itemFormData, alocacaoMensal: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quantidade *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemFormData.quantidadeTotal}
                    onChange={(e) => setItemFormData({ ...itemFormData, quantidadeTotal: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Valor Unit. (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemFormData.valorUnitario}
                    onChange={(e) => setItemFormData({ ...itemFormData, valorUnitario: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Valor Fixo / Encargos (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemFormData.valorFixoEncargos || 0}
                    onChange={(e) => setItemFormData({ ...itemFormData, valorFixoEncargos: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <input
                  type="checkbox"
                  id="chkFixo"
                  checked={itemFormData.isCustoFixo}
                  onChange={(e) => setItemFormData({ ...itemFormData, isCustoFixo: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="chkFixo" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Custo Fixo Único / Mobilização (Não multiplica pelos meses da obra)
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsNovoItemModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarItemModal}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-2xs"
              >
                Salvar Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: BUSCAR INSUMO DO BANCO PRÓPRIO (INDIRETO OU AMBOS) ───────────── */}
      {isBuscaInsumoOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 animate-fadeIn">
            <h3 className="text-base font-bold text-slate-900 mb-1">Adicionar Insumo do Banco Próprio</h3>
            <p className="text-xs text-slate-500 mb-4">Exibindo insumos do seu Banco Próprio cadastrados com o tipo <span className="font-semibold text-blue-700">Indireto</span> ou <span className="font-semibold text-purple-700">Ambos</span>.</p>

            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome ou código..."
                  value={buscaInsumoQuery}
                  onChange={(e) => setBuscaInsumoQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchInsumosBancoIndireto(buscaInsumoQuery)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => fetchInsumosBancoIndireto(buscaInsumoQuery)}
                disabled={loadingInsumos}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
              >
                {loadingInsumos ? 'Buscando...' : 'Buscar'}
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 mb-4">
              {insumosEncontrados.length > 0 ? (
                insumosEncontrados.map((insumo) => (
                  <div
                    key={insumo.id}
                    onClick={() => handleSelecionarInsumoBanco(insumo)}
                    className="p-3 hover:bg-blue-50 cursor-pointer transition flex items-center justify-between text-xs group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{insumo.descricao}</span>
                        <span className={clsx(
                          "px-1.5 py-0.2 text-[9px] font-bold rounded uppercase",
                          insumo.tipo_custo === 'ambos' ? "bg-purple-100 text-purple-800 border border-purple-200" : "bg-blue-100 text-blue-800 border border-blue-200"
                        )}>
                          {insumo.tipo_custo || 'Indireto'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {insumo.codigo ? `Cód: ${insumo.codigo} | ` : ''}Unid: {insumo.unidade} | Fonte: {insumo.fonte_preco || 'Própria'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-slate-900 tabular-nums text-xs">
                        R$ {Number(insumo.valor || insumo.valor_nao_desonerado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <button
                        className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-100 group-hover:bg-blue-600 group-hover:text-white rounded-md transition"
                      >
                        + Adicionar
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  {loadingInsumos ? 'Carregando insumos indiretos do Banco Próprio...' : 'Nenhum insumo do tipo Indireto ou Ambos cadastrado no seu Banco Próprio.'}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setIsBuscaInsumoOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIGURAÇÃO DE SINCRONIZAÇÃO COM A PLANILHA EAP ───────────── */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-fadeIn">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-200">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {syncModalGrupoId 
                    ? `Inserir Grupo "${config.grupos.find(g => g.id === syncModalGrupoId)?.nome}" na Planilha`
                    : 'Inserir Custos Indiretos na Planilha Orçamentária'
                  }
                </h3>
                <p className="text-xs text-slate-500">
                  Escolha o formato de exibição desejado para a Planilha Orçamentária.
                </p>
              </div>
            </div>

            <div className="space-y-3 my-4">
              {/* Opção 1: Detalhado */}
              <label 
                onClick={() => setSyncMode('detalhado')}
                className={clsx(
                  "p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3",
                  syncMode === 'detalhado' 
                    ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20 font-semibold" 
                    : "border-slate-200 hover:bg-slate-50"
                )}
              >
                <input
                  type="radio"
                  name="syncMode"
                  checked={syncMode === 'detalhado'}
                  onChange={() => setSyncMode('detalhado')}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block mb-0.5">
                    Modo Detalhado (Grupo + Insumos Filhos)
                  </span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Cria o título do grupo na planilha e insere cada insumo individualmente como sub-item com sua quantidade e valor unitário. Ideal para orçamento executivo e medição.
                  </p>
                </div>
              </label>

              {/* Opção 2: Sintético */}
              <label 
                onClick={() => setSyncMode('sintetico')}
                className={clsx(
                  "p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3",
                  syncMode === 'sintetico' 
                    ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20 font-semibold" 
                    : "border-slate-200 hover:bg-slate-50"
                )}
              >
                <input
                  type="radio"
                  name="syncMode"
                  checked={syncMode === 'sintetico'}
                  onChange={() => setSyncMode('sintetico')}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block mb-0.5">
                    Modo Sintético / Resumido (Linha Única por Grupo com Subtotal)
                  </span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Insere apenas 1 linha para o grupo com o valor total consolidado (verba/mês), sem expandir os insumos filhos. Ideal para propostas comerciais simplificadas.
                  </p>
                </div>
              </label>
            </div>

            {/* Aviso de Substituição Inteligente */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-start gap-2.5 mb-5">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Substituição Inteligente:</strong> Se esta tabela já tiver sido inserida na planilha (seja em modo sintético ou detalhado), a estrutura anterior será <strong>substituída pelo novo formato</strong> escolhido no mesmo local, eliminando duplicidades de valores.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIsSyncModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarSyncEap}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-2xs flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Inserir na Planilha Orçamentária
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: APLICAR TAXA NO BDI ────────────────────────────────────── */}
      {isApplyBdiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-scaleUp">
            
            {/* Header */}
            <div className="px-6 py-4 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/30 rounded-xl border border-emerald-400/40">
                  <Percent className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Aplicar Custos Indiretos no BDI</h3>
                  <p className="text-xs text-emerald-100">
                    Incorpore a taxa de indiretos na Administração Central (AC) do orçamento
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsApplyBdiModalOpen(false)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Corpo */}
            <div className="p-6 space-y-4">
              
              {/* Cards Comparativos / Resumo */}
              <div className="grid grid-cols-2 gap-3">
                {/* Total Custos Indiretos */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Total Custos Indiretos
                  </span>
                  <span className="text-base font-bold text-slate-900 tabular-nums">
                    {totais.totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-[10.5px] text-slate-400 block mt-0.5">
                    Calculado na aba atual
                  </span>
                </div>

                {/* Custo Direto da Obra */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
                      Custo Direto da Obra
                    </span>
                    {totalCustoDireto > 0 ? (
                      <span className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                        EAP Planilha
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                        Sem itens diretos
                      </span>
                    )}
                  </div>
                  <span className="text-base font-bold text-slate-900 tabular-nums">
                    {totalCustoDireto > 0 
                      ? totalCustoDireto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      : (bdiDirectBaseInput && Number(bdiDirectBaseInput) > 0 
                          ? Number(bdiDirectBaseInput).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                          : 'R$ 0,00')}
                  </span>
                  <span className="text-[10.5px] text-slate-400 block mt-0.5">
                    {totalCustoDireto > 0 ? 'Materiais e montagem da EAP' : 'Aguardando itens na planilha'}
                  </span>
                </div>
              </div>

              {/* Quando o Custo Direto for R$ 0,00: Alerta explicativo */}
              {totalCustoDireto <= 0 && (
                <div className="p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs text-amber-950 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <strong className="block font-bold text-amber-950">
                        Por que o Custo Direto está R$ 0,00?
                      </strong>
                      <p className="text-[11.5px] text-amber-800 leading-relaxed">
                        A taxa do BDI é uma porcentagem calculada pela divisão: <strong>(Custos Indiretos ÷ Custo Direto) × 100</strong>. Como esta planilha orçamentária ainda não possui itens diretos com valor (ex: perfis de aço, telhas, fabricação e montagem), não é possível dividir por zero.
                      </p>
                    </div>
                  </div>

                  {/* Campo para Simulação de Custo Direto */}
                  <div className="pt-2 border-t border-amber-200/60">
                    <label className="text-[11px] font-bold text-amber-900 block mb-1">
                      Simular com Custo Direto Estimado da Obra (opcional):
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-white border border-amber-300 rounded-lg px-2.5 py-1 flex-1">
                        <span className="text-xs font-bold text-slate-500">R$</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="Digite o valor estimado da obra (ex: 150000)"
                          value={bdiDirectBaseInput}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                            setBdiDirectBaseInput(val);
                            if (typeof val === 'number' && val > 0 && totais.totalGeral > 0) {
                              const rate = (totais.totalGeral / val) * 100;
                              setBdiRateInput(Math.round(rate * 100) / 100);
                            }
                          }}
                          className="w-full text-xs font-semibold text-slate-900 outline-none tabular-nums"
                        />
                      </div>
                      {bdiDirectBaseInput && Number(bdiDirectBaseInput) > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setBdiDirectBaseInput('');
                            setBdiRateInput('');
                          }}
                          className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Box de Taxa Calculada & Modo Automático */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200/90 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-950">Taxa de Indiretos para o BDI</span>
                  </div>
                  {bdiRateInput && Number(bdiRateInput) > 0 && (
                    <span className="text-[9.5px] font-extrabold px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md">
                      {isManualRateOverride ? 'Modo Manual' : '100% Automático'}
                    </span>
                  )}
                </div>

                {/* Exibição do Valor */}
                <div className="bg-white border border-emerald-200/80 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {bdiDirectBaseInput && Number(bdiDirectBaseInput) > 0 ? (
                        <>
                          Fórmula: ({totais.totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ÷ {Number(bdiDirectBaseInput).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) × 100
                        </>
                      ) : (
                        'Aguardando base de Custo Direto para cálculo'
                      )}
                    </div>
                    <div className="text-2xl font-black text-emerald-900 tabular-nums mt-0.5">
                      {bdiRateInput && Number(bdiRateInput) > 0 
                        ? `${Number(bdiRateInput).toFixed(2)}%`
                        : '0,00%'}
                    </div>
                  </div>

                  {bdiDirectBaseInput && Number(bdiDirectBaseInput) > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isManualRateOverride) {
                          // Redefine para o valor automático
                          const r = (totais.totalGeral / Number(bdiDirectBaseInput)) * 100;
                          setBdiRateInput(Math.round(r * 100) / 100);
                          setIsManualRateOverride(false);
                        } else {
                          setIsManualRateOverride(true);
                        }
                      }}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                    >
                      {isManualRateOverride ? 'Restaurar Taxa Automática' : 'Ajustar Manualmente'}
                    </button>
                  )}
                </div>

                {/* Campo manual (se ativado pelo botão Ajustar) ou quando não há custo direto */}
                {(isManualRateOverride || totalCustoDireto <= 0) && (
                  <div className="pt-2 flex items-center gap-2 border-t border-emerald-200/40 animate-fadeIn">
                    <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
                      {totalCustoDireto <= 0 ? 'Ou digite a taxa desejada:' : 'Taxa personalizada:'}
                    </span>
                    <div className="relative w-36">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="Ex: 12.50"
                        value={bdiRateInput}
                        onChange={(e) => setBdiRateInput(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="w-full text-sm font-bold text-slate-900 bg-white border border-emerald-400 rounded-md px-2.5 py-1 pr-6 focus:ring-1 focus:ring-emerald-500 outline-none tabular-nums"
                      />
                      <span className="absolute right-2 top-1.5 text-xs font-bold text-emerald-700">%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Modo de Aplicação no BDI */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  Como deseja aplicar na taxa de Administração Central (AC)?
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={clsx(
                      "p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5",
                      bdiApplyMode === 'substituir'
                        ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20 font-semibold"
                        : "border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <input
                      type="radio"
                      name="bdiApplyMode"
                      checked={bdiApplyMode === 'substituir'}
                      onChange={() => setBdiApplyMode('substituir')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block mb-0.5">
                        Substituir AC Atual
                      </span>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Substitui o valor atual ({currentBdiAc.toFixed(2)}%) diretamente pelo novo valor calculado ({Number(bdiRateInput || 0).toFixed(2)}%).
                      </p>
                    </div>
                  </label>

                  <label
                    className={clsx(
                      "p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5",
                      bdiApplyMode === 'somar'
                        ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20 font-semibold"
                        : "border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <input
                      type="radio"
                      name="bdiApplyMode"
                      checked={bdiApplyMode === 'somar'}
                      onChange={() => setBdiApplyMode('somar')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block mb-0.5">
                        Somar à AC Atual
                      </span>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Soma a taxa calculada ao que já está configurado ({currentBdiAc.toFixed(2)}% + {Number(bdiRateInput || 0).toFixed(2)}% = {(currentBdiAc + Number(bdiRateInput || 0)).toFixed(2)}%).
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Informação sobre o BDI */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  A taxa de <strong>Administração Central (AC)</strong> integra o cálculo do BDI geral da obra. Ao aplicar, todos os preços unitários de venda e totais da proposta serão recalculados instantaneamente.
                </span>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsApplyBdiModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-200/70 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarApplyBdi}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Percent className="w-4 h-4" />
                Confirmar e Aplicar no BDI
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
