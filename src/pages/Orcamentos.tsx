import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Plus, Search, Calculator, GitBranch, Trash2, X, FileSpreadsheet,
  ChevronDown, ChevronRight, Filter, AlertTriangle, Edit2
} from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ModalImportarExcel } from '../components/ModalImportarExcel';
import { ClienteSelect } from '../components/ClienteSelect';
import { getUsuariosCadastrados } from '../lib/usuarios';

const statusBadgeClasses = (status: string) => {
  switch (status) {
    case 'Aprovado e Ag. Envio': return 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
    case 'Ag. Validação':        return 'bg-amber-50 text-amber-700 border-amber-300';
    case 'Recusado pelo Gestor': return 'bg-rose-50 text-rose-700 border-rose-300 font-bold';
    case 'Com Pendências':       return 'bg-amber-50 text-amber-800 border-amber-300 font-bold';
    case 'Enviada':              return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Cancelada':            return 'bg-rose-50 text-rose-700 border-rose-200';
    default:                    return 'bg-blue-50 text-blue-700 border-blue-200'; // Em andamento
  }
};

const statusEnvioBadgeClasses = (s: string) => {
  switch (s) {
    case 'Ag. Retorno':  return 'bg-violet-50 text-violet-700 border-violet-200';
    case 'Consolidada': return 'bg-teal-50 text-teal-700 border-teal-200';
    case 'Encerrada':   return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'Cancelada':   return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'Perdido':     return 'bg-gray-100 text-gray-600 border-gray-200';
    default:            return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

export const getOrcamentoEffectiveStatus = (orc: any): string => {
  if (!orc) return 'Em andamento';
  const st = (orc.status || 'Em andamento').trim();
  const isEnviada = st.toLowerCase() === 'enviada';
  const isEncerrada = st.toLowerCase() === 'encerrada' || orc.status_envio === 'Encerrada';
  const isCancelada = st.toLowerCase() === 'cancelada';
  const isAgValidacao = st.toLowerCase().includes('valida');
  const isAprov = orc.aprovado === true;

  if (isEncerrada) {
    return 'Encerrada';
  }

  if (isEnviada && orc.status_envio) {
    return orc.status_envio;
  }

  if (isCancelada) {
    return 'Cancelada';
  }

  const decisao = orc.decisao_gestor || (orc.id ? localStorage.getItem(`orcamento_decisao_${orc.id}`) : null);

  if (decisao === 'recusar') {
    return 'Recusado pelo Gestor';
  }

  if (decisao === 'aprovar_pendencia') {
    return 'Com Pendências';
  }

  if (isAgValidacao && !isAprov) {
    return 'Ag. Validação';
  }

  if (isAprov) {
    return 'Aprovado e Ag. Envio';
  }

  return 'Em andamento';
};

export const renderStatusBadge = (orc: any) => {
  const statusLabel = getOrcamentoEffectiveStatus(orc);
  const isEnvio = ['Ag. Retorno', 'Consolidada', 'Encerrada', 'Perdido'].includes(statusLabel);
  const badgeCls = isEnvio ? statusEnvioBadgeClasses(statusLabel) : statusBadgeClasses(statusLabel);

  return (
    <span className={clsx('text-[10px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap inline-block shadow-2xs', badgeCls)}>
      {statusLabel}
    </span>
  );
};

export const getImportadoEffectiveStatusInfo = (
  imp: any, 
  stats: { total: number; linked: number }, 
  createdOrc?: any
) => {
  if (createdOrc) {
    const statusMap: Record<string, { label: string; badgeCls: string }> = {
      'Ag. Validação': { label: 'Orçamento Ag. Validação', badgeCls: 'bg-amber-50 text-amber-800 border-amber-300 font-bold' },
      'Aprovado e Ag. Envio': { label: 'Orçamento Aprovado', badgeCls: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold' },
      'Recusado pelo Gestor': { label: 'Orçamento Recusado', badgeCls: 'bg-rose-50 text-rose-800 border-rose-300 font-bold' },
      'Ag. Retorno': { label: 'Orçamento Ag. Retorno', badgeCls: 'bg-purple-50 text-purple-800 border-purple-300 font-bold' },
      'Consolidado': { label: 'Orçamento Consolidado', badgeCls: 'bg-teal-50 text-teal-800 border-teal-300 font-bold' },
      'Cancelada': { label: 'Orçamento Cancelado', badgeCls: 'bg-rose-50 text-rose-700 border-rose-200 font-bold' },
      'Cancelado': { label: 'Orçamento Cancelado', badgeCls: 'bg-rose-50 text-rose-700 border-rose-200 font-bold' },
      'Encerrada': { label: 'Orçamento Encerrado', badgeCls: 'bg-slate-100 text-slate-700 border-slate-200 font-bold' },
      'Encerrado': { label: 'Orçamento Encerrado', badgeCls: 'bg-slate-100 text-slate-700 border-slate-200 font-bold' },
      'Perdido': { label: 'Orçamento Perdido', badgeCls: 'bg-slate-800 text-slate-100 border-slate-700 font-bold' },
    };

    if (createdOrc.status && statusMap[createdOrc.status]) {
      return statusMap[createdOrc.status];
    }
    return { label: 'Orçamento em Andamento', badgeCls: 'bg-blue-50 text-blue-800 border-blue-300 font-bold' };
  }

  const percent = stats.total > 0 ? Math.round((stats.linked / stats.total) * 100) : 0;
  const isAllLinked = (stats.total > 0 && stats.linked >= stats.total) || percent === 100 || imp.status === 'Concluído' || imp.status === 'Concluída';

  if (isAllLinked) {
    return { label: 'Vinculação Concluída', badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold' };
  }

  return { label: 'Em Vinculação', badgeCls: 'bg-amber-50 text-amber-700 border-amber-200 font-bold' };
};

export const renderEmpresaBadge = (empresaName?: string) => {
  const emp = (empresaName || 'BRP Soluções Metálicas').trim();
  const isEngenharia = emp.toLowerCase().includes('engenharia');

  if (isEngenharia) {
    return (
      <span className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-md font-bold text-[10.5px] inline-block shadow-2xs whitespace-nowrap">
        BRP Engenharia
      </span>
    );
  }

  return (
    <span className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-300 rounded-md font-bold text-[10.5px] inline-block shadow-2xs whitespace-nowrap">
      BRP Soluções Metálicas
    </span>
  );
};

export default function Orcamentos() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Abas Principais (Sincronizadas com URL ?tab=empresa / ?tab=importados)
  const tabFromUrl = (searchParams.get('tab') as 'empresa' | 'importados') || 'empresa';
  const [activeTabState, setActiveTabState] = useState<'empresa' | 'importados'>(tabFromUrl);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'empresa' || t === 'importados') {
      setActiveTabState(t);
    }
  }, [searchParams]);

  const activeTab = activeTabState;
  const setActiveTab = (tab: 'empresa' | 'importados') => {
    setActiveTabState(tab);
    setSearchParams({ tab }, { replace: true });
  };

  // Orçamentos da Empresa
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [orcamentosTotals, setOrcamentosTotals] = useState<Record<string, any>>({});

  // Orçamentos Importados (Cliente)
  const [importados, setImportados] = useState<any[]>([]);
  const [importadosStats, setImportadosStats] = useState<Record<string, { total: number; linked: number }>>({});
  const [createdImportadosMap, setCreatedImportadosMap] = useState<Record<string, any>>({});

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>('todas');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    targetId: string;
    targetCodigo: string;
    targetNome: string;
    targetRevisao: string;
    familyBaseKey: string;
    familyCount: number;
    familyIds: string[];
  } | null>(null);
  const [deleteMode, setDeleteMode] = useState<'single' | 'all'>('single');

  const [newOrcamentoData, setNewOrcamentoData] = useState({
    codigo: '',
    empresa: 'BRP Soluções Metálicas',
    descricao: '',
    cliente: '',
    projeto: '',
    gestor_cliente: '',
    responsavel: '',
    cidade: '',
    estado: 'GO'
  });

  // Modal de Edição de Orçamento
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editOrcamentoData, setEditOrcamentoData] = useState({
    id: '',
    codigo: '',
    empresa: 'BRP Soluções Metálicas',
    descricao: '',
    cliente: '',
    projeto: '',
    gestor_cliente: '',
    responsavel: '',
    cidade: '',
    estado: 'GO'
  });

  const handleOpenEditModal = (orc: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const localObra = orc.local_obra || '';
    const parts = localObra.split(' - ');
    const cidade = parts[0] || '';
    const estado = parts[1] || 'GO';

    setEditOrcamentoData({
      id: orc.id,
      codigo: orc.codigo || '',
      empresa: orc.empresa || 'BRP Soluções Metálicas',
      descricao: orc.descricao || '',
      cliente: orc.cliente || '',
      projeto: orc.projeto || orc.nome || '',
      gestor_cliente: orc.gestor_cliente || '',
      responsavel: orc.responsavel || (usuariosCadastrados[0]?.nome || ''),
      cidade,
      estado
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateOrcamento = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const cidadeFormatada = formatCidadeUpperNoAccents(editOrcamentoData.cidade).trim();
      const localObra = [cidadeFormatada, editOrcamentoData.estado].filter(Boolean).join(' - ');

      const { error } = await supabase
        .schema('engenharia')
        .from('orcamentos')
        .update({
          empresa: editOrcamentoData.empresa,
          nome: editOrcamentoData.projeto,
          projeto: editOrcamentoData.projeto,
          descricao: editOrcamentoData.descricao,
          cliente: editOrcamentoData.cliente,
          gestor_cliente: editOrcamentoData.gestor_cliente,
          responsavel: editOrcamentoData.responsavel,
          local_obra: localObra
        })
        .eq('id', editOrcamentoData.id);

      if (error) throw error;

      alert('Orçamento atualizado com sucesso!');
      setIsEditModalOpen(false);
      fetchOrcamentos();
    } catch (err: any) {
      console.error('Erro ao atualizar orçamento:', err);
      alert('Erro ao atualizar orçamento: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const [usuariosCadastrados, setUsuariosCadastrados] = useState<any[]>([]);

  const formatCidadeUpperNoAccents = (text: string) => {
    if (!text) return '';
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  };

  useEffect(() => {
    fetchOrcamentos();
    fetchImportados();
    getUsuariosCadastrados().then(setUsuariosCadastrados);
  }, []);

  // Função para calcular os totais reais do orçamento respeitando a hierarquia EAP (evitando triplicar/duplicar somas de seções e filhas)
  const calculateBudgetTotalsFromItems = (itensList: any[]) => {
    if (!itensList || itensList.length === 0) {
      return { mat: 0, mo: 0, total: 0 };
    }

    const computed = itensList.map(item => ({
      ...item,
      item_eap: (item.item_eap || '').trim(),
      effectiveMultiplier: 1,
      hasChildren: false,
      total_mat: parseFloat(item.total_mat || 0),
      total_mo: parseFloat(item.total_mo || 0),
      total: parseFloat(item.total || 0),
      quantidade: parseFloat(item.quantidade || 0),
      valor_unitario_mat: parseFloat(item.valor_unitario_mat || 0),
      valor_unitario_mo: parseFloat(item.valor_unitario_mo || 0)
    }));

    const eapToIdx = new Map<string, number>();
    computed.forEach((item, idx) => {
      if (item.item_eap) eapToIdx.set(item.item_eap, idx);
    });

    for (let i = 0; i < computed.length; i++) {
      const item = computed[i];
      if (!item.item_eap) continue;

      const parts = item.item_eap.split('.');
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

    for (let i = computed.length - 1; i >= 0; i--) {
      const item = computed[i];
      if (!item.item_eap) continue;

      const hasCode = Boolean(item.codigo && item.codigo.trim() !== '');
      const parts = item.item_eap.split('.').filter(Boolean);
      const isSectionHeader = parts.length === 1 || (parts.length === 2 && parts[1] === '0') || item.isSecao;

      let directChildren: typeof computed = [];

      if (isSectionHeader) {
        const rootNum = parts[0];
        directChildren = computed.filter(other => {
          if (!other.item_eap || other.item_eap === item.item_eap) return false;
          const otherParts = other.item_eap.split('.').filter(Boolean);
          return otherParts[0] === rootNum && (otherParts.length === 2 && otherParts[1] !== '0');
        });

        if (directChildren.length === 0) {
          const allDescendants = computed.filter(other => {
            if (!other.item_eap || other.item_eap === item.item_eap) return false;
            const otherParts = other.item_eap.split('.').filter(Boolean);
            return otherParts[0] === rootNum;
          });

          if (allDescendants.length > 0) {
            const minDepth = Math.min(...allDescendants.map(d => d.item_eap.split('.').filter(Boolean).length));
            directChildren = allDescendants.filter(other => other.item_eap.split('.').filter(Boolean).length === minDepth);
          }
        }
      } else {
        const prefix = item.item_eap + '.';
        directChildren = computed.filter(other => {
          if (!other.item_eap.startsWith(prefix)) return false;
          const rest = other.item_eap.slice(prefix.length);
          return rest.length > 0 && !rest.includes('.');
        });
      }

      if (directChildren.length === 0) {
        let calcQtd = item.quantidade || 0;
        if (item.coeficiente && item.coeficiente > 0) {
          calcQtd = item.coeficiente * item.effectiveMultiplier;
        } else if (item.effectiveMultiplier > 1) {
          calcQtd = (item.quantidade || 0) * item.effectiveMultiplier;
        }
        item.total_mat = calcQtd * (item.valor_unitario_mat || 0);
        item.total_mo  = calcQtd * (item.valor_unitario_mo || 0);
        item.total     = item.total_mat + item.total_mo;
      } else {
        const sumMat   = directChildren.reduce((s, d) => s + d.total_mat, 0);
        const sumMo    = directChildren.reduce((s, d) => s + d.total_mo,  0);
        const sumTotal = directChildren.reduce((s, d) => s + d.total,     0);

        if (hasCode) {
          if (sumTotal > 0 || sumMat > 0 || sumMo > 0) {
            item.total_mat = sumMat;
            item.total_mo  = sumMo;
            item.total     = sumTotal;
          } else {
            item.total_mat = (item.quantidade || 0) * (item.valor_unitario_mat || 0);
            item.total_mo  = (item.quantidade || 0) * (item.valor_unitario_mo || 0);
            item.total     = item.total_mat + item.total_mo;
          }
        } else {
          item.total_mat = sumMat;
          item.total_mo  = sumMo;
          item.total     = sumTotal;
        }
      }
    }

    const secaoRows = computed.filter(item => {
      if (!item.item_eap) return false;
      const parts = item.item_eap.split('.').filter(Boolean);
      return parts.length === 1 || (parts.length === 2 && parts[1] === '0') || item.isSecao;
    });

    if (secaoRows.length > 0) {
      return secaoRows.reduce((acc, item) => {
        acc.mat += item.total_mat || 0;
        acc.mo += item.total_mo || 0;
        acc.total += item.total || 0;
        return acc;
      }, { mat: 0, mo: 0, total: 0 });
    }

    const eapSet = new Set(computed.map(i => i.item_eap).filter(Boolean));
    return computed.reduce((acc, item) => {
      if (!item.item_eap) return acc;
      const parts = item.item_eap.split('.').filter(Boolean);
      let isRootLevel1 = false;
      if (parts.length === 2) {
        isRootLevel1 = true;
      } else if (parts.length > 2) {
        const parentEap = parts.slice(0, parts.length - 1).join('.');
        if (!eapSet.has(parentEap)) {
          isRootLevel1 = true;
        }
      }
      if (isRootLevel1) {
        acc.mat += item.total_mat || 0;
        acc.mo += item.total_mo || 0;
        acc.total += item.total || 0;
      }
      return acc;
    }, { mat: 0, mo: 0, total: 0 });
  };

  const fetchOrcamentos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .schema('engenharia')
        .from('orcamentos')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setOrcamentos(data || []);

      // Busca os itens completos de cada orçamento para calcular os totais WBS reais
      const { data: items, error: itemsError } = await supabase
        .schema('engenharia')
        .from('orcamento_itens')
        .select('orcamento_id, item_eap, total, total_mat, total_mo, valor_unitario_mat, valor_unitario_mo, quantidade, codigo, composicao_id');
      
      if (!itemsError && items) {
        const itemsByOrcamento: Record<string, any[]> = {};
        items.forEach((item: any) => {
          if (!itemsByOrcamento[item.orcamento_id]) {
            itemsByOrcamento[item.orcamento_id] = [];
          }
          itemsByOrcamento[item.orcamento_id].push(item);
        });

        const totals: Record<string, any> = {};
        Object.keys(itemsByOrcamento).forEach(orcId => {
          totals[orcId] = calculateBudgetTotalsFromItems(itemsByOrcamento[orcId]);
        });
        setOrcamentosTotals(totals);
      }
    } catch (err) {
      console.error('Erro ao buscar orçamentos:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchImportados = async () => {
    try {
      const { data, error } = await supabase
        .schema('engenharia')
        .from('orcamentos_importados')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImportados(data || []);

      // Busca contagem e progresso de itens por importação
      const { data: rows, error: rowsError } = await supabase
        .schema('engenharia')
        .from('orcamento_importado_itens')
        .select('orcamento_importado_id, composicao_id, insumo_id, tipo_vinculo, status_linha');

      if (!rowsError && rows) {
        const stats: Record<string, { total: number; linked: number }> = {};
        rows.forEach((r: any) => {
          const impId = r.orcamento_importado_id;
          if (!stats[impId]) {
            stats[impId] = { total: 0, linked: 0 };
          }
          stats[impId].total += 1;
          const isLinked = !!(
            r.composicao_id || 
            r.insumo_id || 
            r.tipo_vinculo === 'texto' || 
            r.status_linha === 'inativo' || 
            r.status_linha === 'inserido_empresa' || 
            r.status_linha === 'inserido_empresa_e_cliente' || 
            r.status_linha === 'desdobrado'
          );
          if (isLinked) {
            stats[impId].linked += 1;
          }
        });
        setImportadosStats(stats);
      }

      // Busca quais planilhas importadas já geraram um Orçamento Nativo da Empresa
      const { data: createdOrcs } = await supabase
        .schema('engenharia')
        .from('orcamentos')
        .select('*')
        .not('orcamento_importado_id', 'is', null);

      if (createdOrcs) {
        const map: Record<string, any> = {};
        createdOrcs.forEach((o: any) => {
          const impId = o.orcamento_importado_id;
          if (impId) {
            if (!map[impId]) {
              map[impId] = o;
            } else {
              const existingRev = parseInt(map[impId].revisao || '0', 10);
              const currentRev = parseInt(o.revisao || '0', 10);
              if (currentRev > existingRev || (currentRev === existingRev && new Date(o.created_at || 0) > new Date(map[impId].created_at || 0))) {
                map[impId] = o;
              }
            }
          }
        });
        setCreatedImportadosMap(map);
      }
    } catch (err) {
      console.error('Erro ao buscar orçamentos importados:', err);
    }
  };

  const generateNextOrcamentoCode = async () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const ddmm = `${dd}${mm}`;
    const year = today.getFullYear();

    const { data } = await supabase
      .schema('engenharia')
      .from('orcamentos')
      .select('codigo')
      .like('codigo', `${ddmm}.%`);

    let nextSeq = 1;
    if (data && data.length > 0) {
      const seqs = data.map((o: any) => {
        const parts = o.codigo.split('.');
        if (parts.length >= 2) {
          const num = parseInt(parts[1], 10);
          return isNaN(num) ? 0 : num;
        }
        return 0;
      });
      const maxSeq = Math.max(...seqs);
      nextSeq = maxSeq + 1;
    }

    const seqStr = String(nextSeq).padStart(3, '0');
    return `${ddmm}.${seqStr}.0-${year}`;
  };

  const handleOpenCreateModal = async () => {
    setIsCreateModalOpen(true);
    try {
      const suggestedCode = await generateNextOrcamentoCode();
      const defaultResp = usuariosCadastrados.length > 0 ? usuariosCadastrados[0].nome : '';
      setNewOrcamentoData({
        codigo: suggestedCode,
        empresa: 'BRP Soluções Metálicas',
        descricao: '',
        cliente: '',
        projeto: '',
        gestor_cliente: '',
        responsavel: defaultResp,
        cidade: '',
        estado: 'GO'
      });
    } catch (err) {
      console.error('Erro ao gerar código:', err);
    }
  };

  const handleCreateOrcamento = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const parts = newOrcamentoData.codigo.split('.');
      let revisao = '0';
      if (parts.length >= 3) {
        const rest = parts[2];
        revisao = rest.split('-')[0] || '0';
      }

      const { data: existente, error: checkError } = await supabase
        .schema('engenharia')
        .from('orcamentos')
        .select('id')
        .eq('codigo', newOrcamentoData.codigo)
        .eq('revisao', revisao)
        .maybeSingle();

      if (checkError) {
        console.error('Erro ao verificar duplicidade de código:', checkError);
      }

      if (existente) {
        alert(`❌ O código do orçamento "${newOrcamentoData.codigo}" já está sendo usado por outro orçamento.\n\nPor favor, escolha outro código.`);
        setLoading(false);
        return;
      }

      const cidadeFormatada = formatCidadeUpperNoAccents(newOrcamentoData.cidade).trim();
      const localObra = [cidadeFormatada, newOrcamentoData.estado].filter(Boolean).join(' - ');

      const payload: any = {
        codigo: newOrcamentoData.codigo,
        nome: newOrcamentoData.projeto,
        descricao: newOrcamentoData.descricao,
        empresa: newOrcamentoData.empresa || 'BRP Soluções Metálicas',
        cliente: newOrcamentoData.cliente,
        projeto: newOrcamentoData.projeto,
        gestor_cliente: newOrcamentoData.gestor_cliente,
        local_obra: localObra,
        revisao,
        status: 'Em Elaboração'
      };

      let { data, error } = await supabase
        .schema('engenharia')
        .from('orcamentos')
        .insert(payload)
        .select('id')
        .single();

      if (error && (error.message?.includes('empresa') || (error as any).code === 'PGRST204')) {
        delete payload.empresa;
        const retryRes = await supabase
          .schema('engenharia')
          .from('orcamentos')
          .insert(payload)
          .select('id')
          .single();
        data = retryRes.data;
        error = retryRes.error;
      }

      if (error) throw error;

      setIsCreateModalOpen(false);
      if (data?.id) {
        navigate(`/orcamentos/${data.id}`);
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro ao criar orçamento: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRevision = async (orc: any, e: React.MouseEvent) => {
    e.stopPropagation();

    const isEncerrada = getOrcamentoEffectiveStatus(orc) === 'Encerrada' || (orc.status === 'Enviada' && orc.status_envio === 'Encerrada');

    if (!isEncerrada) {
      const confirmEncerramento = window.confirm(
        `A proposta "${orc.nome || orc.codigo}" ainda não possui o status "Encerrada".\n\n` +
        `Para criar uma nova revisão, é necessário alterar o status da proposta atual para "Enviada" e o status de envio para "Encerrada".\n\n` +
        `Deseja encerrar esta proposta e criar a nova revisão agora?`
      );
      if (!confirmEncerramento) return;
    } else {
      const confirmCreate = window.confirm(
        `Criar nova revisão a partir de "${orc.nome || orc.codigo}"?\n\n` +
        `A nova revisão começará com o status "Em andamento".`
      );
      if (!confirmCreate) return;
    }

    try {
      setLoading(true);

      // 1. Se ainda não estava encerrado, encerra a proposta atual
      if (!isEncerrada) {
        const { error: updateErr } = await supabase
          .schema('engenharia')
          .from('orcamentos')
          .update({
            status: 'Enviada',
            status_envio: 'Encerrada',
            aprovado: true
          })
          .eq('id', orc.id);

        if (updateErr) throw updateErr;
      }

      const currentRev = parseInt(orc.revisao || '0', 10);
      const nextRev = currentRev + 1;
      const parts = orc.codigo.split('.');
      let newCode = orc.codigo;

      if (parts.length >= 3) {
        const dateSeq = `${parts[0]}.${parts[1]}`;
        const year = parts[2].split('-')[1] || new Date().getFullYear();
        newCode = `${dateSeq}.${nextRev}-${year}`;
      }

      // 2. Insere a nova revisão com status "Em andamento" e campos zerados
      const { data: newOrc, error: newOrcError } = await supabase
        .schema('engenharia')
        .from('orcamentos')
        .insert({
          codigo: newCode,
          nome: orc.nome,
          descricao: orc.descricao,
          cliente: orc.cliente,
          projeto: orc.projeto,
          gestor_cliente: orc.gestor_cliente,
          revisao: String(nextRev),
          status: 'Em andamento',
          status_envio: null,
          aprovado: false,
          aprovado_em: null,
          aprovado_por: null,
          proposta_id: orc.proposta_id,
          regra_arredondamento: orc.regra_arredondamento,
          bdi_ac: orc.bdi_ac,
          bdi_s: orc.bdi_s,
          bdi_g: orc.bdi_g,
          bdi_r: orc.bdi_r,
          bdi_df: orc.bdi_df,
          bdi_l: orc.bdi_l,
          bdi_i: orc.bdi_i
        })
        .select('id')
        .single();

      if (newOrcError) throw newOrcError;

      if (newOrc?.id) {
        localStorage.removeItem(`orcamento_decisao_${newOrc.id}`);
        localStorage.removeItem(`orcamento_obs_gestor_${newOrc.id}`);
      }

      // Clona os itens da proposta anterior para a nova revisão
      const { data: oldItems, error: itemsError } = await supabase
        .schema('engenharia')
        .from('orcamento_itens')
        .select('*')
        .eq('orcamento_id', orc.id);

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

      alert(`Revisão ${newCode} criada com sucesso!\nA proposta anterior foi Encerrada e a nova revisão está em andamento.`);
      fetchOrcamentos();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao criar revisão: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrcamento = (id: string, codigo: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetOrc = orcamentos.find(o => o.id === id);
    const { base, revisao } = parseCodeRevisionAndBase(codigo);

    // Identifica todos os orçamentos do mesmo grupo de revisões
    const familyOrcs = orcamentos.filter(o => parseCodeRevisionAndBase(o.codigo).base === base);
    const familyIds = familyOrcs.map(o => o.id);

    setDeleteMode('single');
    setDeleteModal({
      targetId: id,
      targetCodigo: codigo,
      targetNome: targetOrc?.nome || targetOrc?.projeto || 'Orçamento sem título',
      targetRevisao: String(targetOrc?.revisao || revisao),
      familyBaseKey: base,
      familyCount: familyIds.length,
      familyIds
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal) return;

    try {
      setLoading(true);
      const idsToDelete = deleteMode === 'all' ? deleteModal.familyIds : [deleteModal.targetId];

      // Exclui orcamento_itens primeiro
      await supabase
        .schema('engenharia')
        .from('orcamento_itens')
        .delete()
        .in('orcamento_id', idsToDelete);

      // Exclui os orçamentos do Supabase
      const { error } = await supabase
        .schema('engenharia')
        .from('orcamentos')
        .delete()
        .in('id', idsToDelete);

      if (error) console.error('Erro ao deletar do Supabase:', error);

      // Remove do localStorage brp_orcamentos_list
      try {
        const savedOrcs = JSON.parse(localStorage.getItem('brp_orcamentos_list') || '[]');
        const filteredOrcs = savedOrcs.filter((o: any) => !idsToDelete.includes(String(o.id)));
        localStorage.setItem('brp_orcamentos_list', JSON.stringify(filteredOrcs));
      } catch (e) {}

      // Exclui também os Memoriais de Cálculo vinculados do localStorage
      try {
        const targetCodigos = new Set([deleteModal.targetCodigo, deleteModal.familyBaseKey].filter(Boolean));
        const savedMems = JSON.parse(localStorage.getItem('brp_memoriais_calculo_list') || '[]');
        const filteredMems = savedMems.filter((m: any) => {
          if (m.orcamentoId && idsToDelete.includes(String(m.orcamentoId))) return false;
          if (m.id && idsToDelete.includes(String(m.id))) return false;
          if (m.codigoOrcamento && targetCodigos.has(m.codigoOrcamento)) return false;
          return true;
        });
        localStorage.setItem('brp_memoriais_calculo_list', JSON.stringify(filteredMems));
      } catch (e) {}

      // Limpa dados de cache dos orçamentos excluídos
      idsToDelete.forEach(idDel => {
        localStorage.removeItem(`orcamento_calculos_${idDel}`);
        localStorage.removeItem(`orcamento_parametros_${idDel}`);
        localStorage.removeItem(`orcamento_header_${idDel}`);
        localStorage.removeItem(`orcamento_dados_comp_${idDel}`);
        localStorage.removeItem(`brp_orcamento_itens_${idDel}`);
      });

      setDeleteModal(null);
      fetchOrcamentos();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao excluir orçamento: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImportado = async (id: string, nome: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirm = window.confirm(`Deseja excluir permanentemente a planilha importada "${nome}"?`);
    if (!confirm) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .schema('engenharia')
        .from('orcamentos_importados')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchImportados();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao excluir planilha importada: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const filteredOrcamentos = useMemo(() => {
    return orcamentos.filter(o => {
      const matchesSearch = 
        !searchTerm ||
        o.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        o.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.empresa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.projeto?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedEmpresa !== 'todas') {
        const emp = (o.empresa || 'BRP Soluções Metálicas').trim().toLowerCase();
        if (selectedEmpresa === 'BRP Soluções Metálicas' && !emp.includes('metálica') && !emp.includes('soluções') && !emp.includes('metalica')) {
          return false;
        }
        if (selectedEmpresa === 'BRP Engenharia' && !emp.includes('engenharia')) {
          return false;
        }
      }

      if (selectedStatus === 'todos') return true;

      const effStatus = getOrcamentoEffectiveStatus(o);
      return effStatus === selectedStatus;
    });
  }, [orcamentos, searchTerm, selectedStatus, selectedEmpresa]);

  const parseCodeRevisionAndBase = (codigo: string) => {
    if (!codigo) return { base: '', revisao: 0, year: '' };
    const parts = codigo.split('.');
    if (parts.length >= 3) {
      const dateSeq = `${parts[0]}.${parts[1]}`;
      const revYear = parts[2].split('-');
      const rev = parseInt(revYear[0], 10) || 0;
      const year = revYear[1] || '';
      return { base: `${dateSeq}-${year}`, revisao: rev, year };
    }
    return { base: codigo, revisao: 0, year: '' };
  };

  const orcamentoGroups = useMemo(() => {
    const groupsMap = new Map<string, any[]>();
    filteredOrcamentos.forEach(orc => {
      const { base } = parseCodeRevisionAndBase(orc.codigo);
      if (!groupsMap.has(base)) {
        groupsMap.set(base, []);
      }
      groupsMap.get(base)!.push(orc);
    });

    const groups: { parent: any; children: any[]; baseKey: string }[] = [];
    groupsMap.forEach((list, baseKey) => {
      list.sort((a, b) => {
        const revA = parseCodeRevisionAndBase(a.codigo).revisao;
        const revB = parseCodeRevisionAndBase(b.codigo).revisao;
        return revB - revA;
      });

      const [parent, ...children] = list;
      groups.push({
        parent,
        children: children || [],
        baseKey
      });
    });

    groups.sort((a, b) => {
      const dateA = new Date(a.parent.created_at || 0).getTime();
      const dateB = new Date(b.parent.created_at || 0).getTime();
      return dateB - dateA;
    });

    return groups;
  }, [filteredOrcamentos]);

  const toggleGroup = (baseKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(baseKey)) {
        next.delete(baseKey);
      } else {
        next.add(baseKey);
      }
      return next;
    });
  };

  const filteredImportados = importados.filter(i =>
    i.nome_arquivo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.projeto?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Meus Orçamentos</h2>
          <p className="text-slate-500 text-sm">Gerencie orçamentos da empresa e planilhas importadas de clientes</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Importar Planilha Excel</span>
          </button>
          
          <button 
            onClick={handleOpenCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Orçamento</span>
          </button>
        </div>
      </div>

      {/* Abas Superiores & Barra de Busca */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3">
          {/* Selector de Abas */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('empresa')}
              className={clsx(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2",
                activeTab === 'empresa' ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Calculator className="w-4 h-4" />
              <span>Orçamentos da Empresa ({orcamentos.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('importados')}
              className={clsx(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2",
                activeTab === 'importados' ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Importações / Clientes ({importados.length})</span>
            </button>
          </div>

          {/* Campo de Busca & Filtro de Status */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            {activeTab === 'empresa' && (
              <>
                {/* Filtro por Empresa Responsável */}
                <div className="relative shrink-0">
                  <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedEmpresa}
                    onChange={(e) => setSelectedEmpresa(e.target.value)}
                    className="w-full sm:w-auto pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-semibold text-slate-700 appearance-none cursor-pointer hover:bg-slate-100/70 transition-colors"
                  >
                    <option value="todas">Todas as Empresas</option>
                    <option value="BRP Soluções Metálicas">BRP Soluções Metálicas</option>
                    <option value="BRP Engenharia">BRP Engenharia</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                {/* Filtro por Status */}
                <div className="relative shrink-0">
                  <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full sm:w-auto pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-semibold text-slate-700 appearance-none cursor-pointer hover:bg-slate-100/70 transition-colors"
                  >
                    <option value="todos">Todos os Status</option>
                    <option value="Em andamento">Em andamento</option>
                    <option value="Ag. Validação">Ag. Validação</option>
                    <option value="Recusado pelo Gestor">Recusado pelo Gestor</option>
                    <option value="Com Pendências">Com Pendências</option>
                    <option value="Aprovado e Ag. Envio">Aprovado e Ag. Envio</option>
                    <option value="Ag. Retorno">Ag. Retorno</option>
                    <option value="Consolidada">Consolidada</option>
                    <option value="Encerrada">Encerrada</option>
                    <option value="Perdido">Perdido</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </>
            )}

            {/* Campo de Busca */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Buscar por código, cliente ou projeto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* ABA 1: ORÇAMENTOS DA EMPRESA */}
        {activeTab === 'empresa' && (
          <div>
            {loading ? (
              <div className="py-16 text-center text-slate-400 font-medium">Carregando orçamentos...</div>
            ) : filteredOrcamentos.length === 0 ? (
              <div className="py-16 text-center text-slate-400 font-medium">Nenhum orçamento encontrado.</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4 w-36">Código / Rev</th>
                      <th className="py-3 px-4">Empresa</th>
                      <th className="py-3 px-4">Nome do Orçamento / Projeto</th>
                      <th className="py-3 px-4">Cliente / Gestor</th>
                      <th className="py-3 px-4 w-32">Status</th>
                      <th className="py-3 px-4 text-right w-28">Total Mat.</th>
                      <th className="py-3 px-4 text-right w-28">Total M.O.</th>
                      <th className="py-3 px-4 text-right w-32">Valor Total</th>
                      <th className="py-3 px-4 text-center w-24">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orcamentoGroups.map((group) => {
                      const hasChildren = group.children.length > 0;
                      const isExpanded = expandedGroups.has(group.baseKey);

                      // Render Parent Row
                      const parent = group.parent;
                      const parentTotals = orcamentosTotals[parent.id] || { total: 0, mat: 0, mo: 0 };
                      const parentBdiFactor = 1 + (parent.bdi_ac || 0) + (parent.bdi_s || 0) + (parent.bdi_g || 0) + (parent.bdi_r || 0) + (parent.bdi_df || 0) + (parent.bdi_l || 0);

                      return (
                        <>
                          <tr 
                            key={parent.id}
                            onClick={() => navigate(`/orcamentos/${parent.id}`)}
                            className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                          >
                            <td className="py-3.5 px-4 font-mono text-slate-700">
                              <div className="flex items-center gap-1.5">
                                {hasChildren && (
                                  <button
                                    onClick={(e) => toggleGroup(group.baseKey, e)}
                                    className="p-1 hover:bg-slate-200/80 rounded text-slate-500 cursor-pointer transition-colors shrink-0"
                                  >
                                    {isExpanded ? <ChevronDown className="w-4 h-4 text-blue-600" /> : <ChevronRight className="w-4 h-4 text-blue-600" />}
                                  </button>
                                )}
                                {!hasChildren && <div className="w-6 shrink-0" />}
                                
                                <div>
                                  <div className="font-bold bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200/50 inline-block">
                                    {parent.codigo}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase">
                                    REVISÃO: {String(parent.revisao || '0').padStart(2, '0')}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              {renderEmpresaBadge(parent.empresa)}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors text-sm">
                                {parent.nome || 'Orçamento sem título'}
                              </div>
                              <div className="text-slate-400 text-[11px] mt-0.5 line-clamp-1 max-w-md">
                                {parent.descricao || 'Sem descrição adicional'}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 font-medium">
                              <div>{parent.cliente || 'Não informado'}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">Gestor: {parent.gestor_cliente || 'Não informado'}</div>
                            </td>
                            <td className="py-3.5 px-4">
                               {renderStatusBadge(parent)}
                             </td>
                            <td className="py-3.5 px-4 text-right font-medium text-slate-700 tabular-nums">
                              {(parentTotals.mat * parentBdiFactor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="py-3.5 px-4 text-right font-medium text-slate-700 tabular-nums">
                              {(parentTotals.mo * parentBdiFactor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-blue-600 tabular-nums">
                              {(parentTotals.total * parentBdiFactor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                <button 
                                  onClick={(e) => handleOpenEditModal(parent, e)}
                                  title="Editar Dados do Orçamento"
                                  className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {parent.status_envio === 'Encerrada' && (
                                  <button 
                                    onClick={(e) => handleCreateRevision(parent, e)}
                                    title="Criar Nova Revisão"
                                    className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <GitBranch className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button 
                                  onClick={(e) => handleDeleteOrcamento(parent.id, parent.codigo, e)}
                                  title="Excluir Orçamento"
                                  className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {isExpanded && group.children.map((child) => {
                            const childTotals = orcamentosTotals[child.id] || { total: 0, mat: 0, mo: 0 };
                            const childBdiFactor = 1 + (child.bdi_ac || 0) + (child.bdi_s || 0) + (child.bdi_g || 0) + (child.bdi_r || 0) + (child.bdi_df || 0) + (child.bdi_l || 0);

                            return (
                              <tr 
                                key={child.id}
                                onClick={() => navigate(`/orcamentos/${child.id}`)}
                                className="bg-slate-50/20 hover:bg-slate-50/40 transition-colors cursor-pointer group/child border-b border-slate-100/50 text-slate-400"
                              >
                                <td className="py-1.5 px-4 font-mono pl-10 relative">
                                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 font-medium text-xs">↳</span>
                                  <div className="font-normal bg-slate-100/40 px-1.5 py-0.5 rounded border border-slate-200/20 inline-block text-[10px] text-slate-500">
                                    {child.codigo}
                                  </div>
                                  <div className="text-[8.5px] text-slate-400 font-medium mt-0.5 uppercase">
                                    REVISÃO: {String(child.revisao || '0').padStart(2, '0')}
                                  </div>
                                </td>
                                <td className="py-1.5 px-4">
                                  {renderEmpresaBadge(child.empresa)}
                                </td>
                                <td className="py-1.5 px-4">
                                  <div className="font-medium text-slate-600 text-xs">
                                    {child.nome || 'Orçamento sem título'}
                                  </div>
                                  <div className="text-slate-400 text-[10px] mt-0.5 line-clamp-1 max-w-md">
                                    {child.descricao || 'Sem descrição adicional'}
                                  </div>
                                </td>
                                <td className="py-1.5 px-4 text-slate-500 text-[10.5px]">
                                  <div>{child.cliente || 'Não informado'}</div>
                                  <div className="text-[9px] text-slate-400 mt-0.5">Gestor: {child.gestor_cliente || 'Não informado'}</div>
                                </td>
                                 <td className="py-1.5 px-4">
                                   {renderStatusBadge(child)}
                                 </td>
                                <td className="py-1.5 px-4 text-right text-[10.5px] tabular-nums text-slate-500">
                                  {(childTotals.mat * childBdiFactor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                                <td className="py-1.5 px-4 text-right text-[10.5px] tabular-nums text-slate-500">
                                  {(childTotals.mo * childBdiFactor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                                <td className="py-1.5 px-4 text-right font-medium text-slate-600 text-[10.5px] tabular-nums">
                                  {(childTotals.total * childBdiFactor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                                <td className="py-1.5 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1 opacity-0 group-hover/child:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                    <button 
                                      onClick={(e) => handleOpenEditModal(child, e)}
                                      title="Editar Dados do Orçamento"
                                      className="p-1 hover:bg-blue-50 text-blue-600 rounded transition-colors cursor-pointer"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button 
                                      onClick={(e) => handleDeleteOrcamento(child.id, child.codigo, e)}
                                      title="Excluir Revisão Anterior"
                                      className="p-1 hover:bg-rose-50 text-rose-500 rounded transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3 text-rose-450" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ABA 2: IMPORTAÇÕES / CLIENTES */}
        {activeTab === 'importados' && (
          <div>
            {filteredImportados.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-slate-400 text-sm font-medium">Nenhuma planilha importada. Clique em "Importar Planilha Excel" para enviar um orçamento.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Projeto / Nome do Arquivo</th>
                      <th className="py-3 px-4 w-52">Cliente</th>
                      <th className="py-3 px-4 w-72">Progresso De-Para</th>
                      <th className="py-3 px-4 w-36">Status</th>
                      <th className="py-3 px-4 w-32">Importado Em</th>
                      <th className="py-3 px-4 text-center w-36">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredImportados.map((imp) => {
                      const stats = importadosStats[imp.id] || { total: 0, linked: 0 };
                      const percent = stats.total > 0 ? Math.round((stats.linked / stats.total) * 100) : 0;
                      const createdOrc = createdImportadosMap[imp.id];
                      const { label: statusLabel, badgeCls } = getImportadoEffectiveStatusInfo(imp, stats, createdOrc);

                      return (
                        <tr
                          key={imp.id}
                          onClick={() => navigate(`/orcamentos/depara/${imp.id}`)}
                          className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors text-sm">
                              {imp.projeto || imp.nome_arquivo}
                            </div>
                            <div className="text-slate-400 font-mono text-[10px] mt-0.5 max-w-sm truncate">
                              {imp.nome_arquivo}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-700">
                            {imp.cliente || 'Não informado'}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-1.5 max-w-[240px]">
                              <div className="flex justify-between text-[11px] font-bold text-slate-600">
                                <span>Vinculados:</span>
                                <span>{stats.linked} / {stats.total} ({percent}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${percent}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap inline-block shadow-2xs", badgeCls)}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 font-medium">
                            {imp.created_at ? new Date(imp.created_at).toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              {createdOrc && (
                                <button 
                                  onClick={() => navigate(`/orcamentos/${createdOrc.id}`)}
                                  title={`Abrir Orçamento ${createdOrc.codigo}`}
                                  className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center shadow-2xs"
                                >
                                  <Calculator className="w-3.5 h-3.5 text-blue-600" />
                                </button>
                              )}
                              <button
                                onClick={(e) => handleDeleteImportado(imp.id, imp.nome_arquivo, e)}
                                title="Excluir Planilha Importada"
                                className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Criar Novo Orçamento Nativo */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Novo Orçamento da Empresa</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrcamento} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Código do Orçamento</label>
                <input 
                  type="text"
                  required
                  value={newOrcamentoData.codigo}
                  onChange={(e) => setNewOrcamentoData({...newOrcamentoData, codigo: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-blue-600 outline-none focus:border-blue-500 bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Empresa Responsável</label>
                <select 
                  value={newOrcamentoData.empresa}
                  onChange={(e) => setNewOrcamentoData({...newOrcamentoData, empresa: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 font-semibold outline-none focus:border-blue-500 focus:bg-white bg-white cursor-pointer"
                >
                  <option value="BRP Soluções Metálicas">BRP Soluções Metálicas</option>
                  <option value="BRP Engenharia">BRP Engenharia</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome do Projeto / Obra</label>
                <input 
                  type="text"
                  required
                  value={newOrcamentoData.projeto}
                  onChange={(e) => setNewOrcamentoData({...newOrcamentoData, projeto: e.target.value})}
                  placeholder="Ex: Construção de Galpão Industrial"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 font-semibold outline-none focus:border-blue-500 focus:bg-white placeholder:text-slate-400 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cliente *</label>
                <ClienteSelect
                  value={newOrcamentoData.cliente}
                  onSelectClient={(c) => {
                    setNewOrcamentoData({
                      ...newOrcamentoData,
                      cliente: c.nome_fantasia || c.razao_social,
                      gestor_cliente: c.responsavel || '',
                      cidade: c.cidade || '',
                      estado: c.uf || 'GO'
                    });
                  }}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Gestor do Cliente (Auto)</label>
                <input 
                  type="text"
                  disabled
                  value={newOrcamentoData.gestor_cliente || ''}
                  placeholder="Preenchido automaticamente ao selecionar o cliente..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold bg-slate-100 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Responsável Técnico / Orçamentista</label>
                <select 
                  value={newOrcamentoData.responsavel}
                  onChange={(e) => setNewOrcamentoData({...newOrcamentoData, responsavel: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 font-semibold outline-none focus:border-blue-500 focus:bg-white bg-white cursor-pointer"
                >
                  <option value="" className="text-slate-500 font-normal">Selecione o Responsável / Orçamentista...</option>
                  {usuariosCadastrados.map((u: any) => (
                    <option key={u.id || u.nome} value={u.nome} className="text-slate-900 bg-white font-semibold">
                      {u.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Cidade da Obra (Auto)</label>
                  <input 
                    type="text"
                    disabled
                    value={newOrcamentoData.cidade || ''}
                    placeholder="Preenchido automaticamente..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold bg-slate-100 cursor-not-allowed uppercase"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">UF (Auto)</label>
                  <input 
                    type="text"
                    disabled
                    value={newOrcamentoData.estado || ''}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-700 font-bold bg-slate-100 cursor-not-allowed uppercase text-center"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-500 font-bold hover:text-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Criar Orçamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Orçamento Nativo */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Editar Orçamento</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateOrcamento} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Código do Orçamento</label>
                <input 
                  type="text"
                  disabled
                  value={editOrcamentoData.codigo}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-slate-500 bg-slate-100 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Empresa Responsável</label>
                <select 
                  value={editOrcamentoData.empresa}
                  onChange={(e) => setEditOrcamentoData({...editOrcamentoData, empresa: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 font-semibold outline-none focus:border-blue-500 focus:bg-white bg-white cursor-pointer"
                >
                  <option value="BRP Soluções Metálicas">BRP Soluções Metálicas</option>
                  <option value="BRP Engenharia">BRP Engenharia</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome do Projeto / Obra</label>
                <input 
                  type="text"
                  required
                  value={editOrcamentoData.projeto}
                  onChange={(e) => setEditOrcamentoData({...editOrcamentoData, projeto: e.target.value})}
                  placeholder="Ex: Construção de Galpão Industrial"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 font-semibold outline-none focus:border-blue-500 focus:bg-white placeholder:text-slate-400 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cliente *</label>
                <ClienteSelect
                  value={editOrcamentoData.cliente}
                  onSelectClient={(c) => {
                    setEditOrcamentoData({
                      ...editOrcamentoData,
                      cliente: c.nome_fantasia || c.razao_social,
                      gestor_cliente: c.responsavel || '',
                      cidade: c.cidade || '',
                      estado: c.uf || 'GO'
                    });
                  }}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Gestor do Cliente (Auto)</label>
                <input 
                  type="text"
                  disabled
                  value={editOrcamentoData.gestor_cliente || ''}
                  placeholder="Preenchido automaticamente ao selecionar o cliente..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold bg-slate-100 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Responsável Técnico / Orçamentista</label>
                <select 
                  value={editOrcamentoData.responsavel}
                  onChange={(e) => setEditOrcamentoData({...editOrcamentoData, responsavel: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 font-semibold outline-none focus:border-blue-500 focus:bg-white bg-white cursor-pointer"
                >
                  <option value="" className="text-slate-500 font-normal">Selecione o Responsável / Orçamentista...</option>
                  {usuariosCadastrados.map((u: any) => (
                    <option key={u.id || u.nome} value={u.nome} className="text-slate-900 bg-white font-semibold">
                      {u.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Cidade da Obra (Auto)</label>
                  <input 
                    type="text"
                    disabled
                    value={editOrcamentoData.cidade || ''}
                    placeholder="Preenchido automaticamente..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold bg-slate-100 cursor-not-allowed uppercase"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">UF (Auto)</label>
                  <input 
                    type="text"
                    disabled
                    value={editOrcamentoData.estado || ''}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-700 font-bold bg-slate-100 cursor-not-allowed uppercase text-center"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-slate-500 font-bold hover:text-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Importar Planilha Excel */}
      <ModalImportarExcel 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={(importedId) => {
          fetchImportados();
          setActiveTab('importados');
          navigate(`/orcamentos/depara/${importedId}`);
        }}
      />

      {/* Modal de Confirmação de Exclusão com Escolha de Revisões */}
      {deleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-rose-600">
                <div className="p-2 bg-rose-50 rounded-xl border border-rose-100">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Excluir Orçamento</h3>
                  <p className="text-xs text-slate-500 font-mono font-medium">{deleteModal.targetCodigo}</p>
                </div>
              </div>
              <button 
                onClick={() => setDeleteModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo dependendo se tem revisões ou não */}
            {deleteModal.familyCount > 1 ? (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-950">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Este orçamento possui {deleteModal.familyCount} revisões cadastradas!</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Escolha como deseja realizar a exclusão do orçamento <strong className="font-mono">{deleteModal.targetCodigo}</strong>:
                  </p>
                </div>

                <div className="space-y-2.5">
                  {/* Opção 1: Excluir Apenas a Revisão Atual */}
                  <label 
                    onClick={() => setDeleteMode('single')}
                    className={clsx(
                      "flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all",
                      deleteMode === 'single'
                        ? "border-blue-600 bg-blue-50/50 shadow-2xs ring-1 ring-blue-600"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <input 
                      type="radio" 
                      name="deleteMode" 
                      checked={deleteMode === 'single'} 
                      onChange={() => setDeleteMode('single')} 
                      className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <span className="font-bold text-xs text-slate-800 block">
                        Excluir apenas o orçamento/revisão atual ({deleteModal.targetCodigo})
                      </span>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        Remove somente esta revisão (Rev. {deleteModal.targetRevisao}). As outras {deleteModal.familyCount - 1} revisões deste orçamento continuarão salvas.
                      </p>
                    </div>
                  </label>

                  {/* Opção 2: Excluir O Orçamento e Todas as Revisões */}
                  <label 
                    onClick={() => setDeleteMode('all')}
                    className={clsx(
                      "flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all",
                      deleteMode === 'all'
                        ? "border-rose-600 bg-rose-50/50 shadow-2xs ring-1 ring-rose-600"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <input 
                      type="radio" 
                      name="deleteMode" 
                      checked={deleteMode === 'all'} 
                      onChange={() => setDeleteMode('all')} 
                      className="mt-0.5 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <span className="font-bold text-xs text-rose-950 block">
                        Excluir o orçamento atual e TODAS as suas revisões ({deleteModal.familyCount} revisões)
                      </span>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        Remove permanentemente a revisão atual e todas as revisões vinculadas a este código ({deleteModal.familyBaseKey}).
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-3 py-1">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Deseja realmente excluir permanentemente o orçamento <strong className="font-mono text-slate-800">{deleteModal.targetCodigo}</strong> ({deleteModal.targetNome})?
                </p>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-[11px] text-rose-700 font-semibold">
                  ⚠️ Esta ação não poderá ser desfeita e todos os itens deste orçamento serão removidos.
                </div>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleteMode === 'all' && deleteModal.familyCount > 1 ? `Excluir Tudo (${deleteModal.familyCount})` : 'Excluir Orçamento'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
