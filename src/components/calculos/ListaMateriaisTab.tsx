import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, ChevronDown, ChevronRight, Search, CheckSquare, Square, 
  FileSpreadsheet, Check, ArrowLeft, Printer
} from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '../../lib/supabase';
import { resolveCidadeEstadoFromCliente, getClientesCadastrados, type ClienteData } from '../../lib/clientes';
import { getEmpresasCadastradas, type EmpresaData } from '../../lib/empresas';

type OrcamentoItem = {
  id: string;
  item_eap: string;
  codigo?: string | null;
  banco_fonte?: string | null;
  descricao: string;
  unidade: string;
  quantidade: number;
  valor_unitario?: number;
  valor_unitario_mat?: number;
  valor_unitario_mo?: number;
  total?: number;
  total_mat?: number;
  total_mo?: number;
  composicao_id?: string | null;
  parentCompositionId?: string | null;
  parent_composition_id?: string | null;
  isSummary?: boolean;
  isSecao?: boolean;
  is_secao?: boolean;
  hasChildren?: boolean;
  displayQuantidade?: number;
};

interface ListaMateriaisTabProps {
  orcamentoId?: string;
  itens: OrcamentoItem[];
  orcamentoInfo?: any;
}

export type TipoInsumoGroup = 'MATERIAL' | 'EQUIPAMENTOS' | 'MÃO DE OBRA' | 'OUTROS';

export interface AggregatedInsumo {
  key: string;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidadeTotal: number;
  tipoGroup: TipoInsumoGroup;
  bancoFonte?: string;
  itemCount: number;
  unitMat?: number;
  unitMo?: number;
}

export interface SolicitacaoItem extends AggregatedInsumo {
  unitMatInput: string;
  unitMoInput: string;
  valorUnitInput: string;
  valorTotalInput: string;
}

export default function ListaMateriaisTab({ orcamentoId, itens, orcamentoInfo }: ListaMateriaisTabProps) {
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<TipoInsumoGroup>>(new Set());
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [dbTiposMap, setDbTiposMap] = useState<Record<string, string>>({});
  const [loadingDbTipos, setLoadingDbTipos] = useState<boolean>(false);

  // Estado para controlar a visualização da Solicitação de Cotação
  const [showSolicitacaoView, setShowSolicitacaoView] = useState<boolean>(false);

  // Dados do formulário de Solicitação de Cotação
  const [solicitacaoForm, setSolicitacaoForm] = useState({
    emissao: '',
    empresa: '',
    orcamento: '',
    enderecoEntrega: '',
    cidade: '',
    estado: '',
    prazoRetorno: '',
    unidadeContratacao: '',
    // Dados Cadastrais Fornecedor
    razaoSocial: '',
    cnpj: '',
    ie: '',
    cep: '',
    telefone: '',
    cidadeFornecedor: '',
    estadoFornecedor: '',
    enderecoFornecedor: '',
    // Seções de texto
    anexos: '',
    observacoes: ''
  });

  // Lista de empresas e clientes cadastrados
  const [minhasEmpresas, setMinhasEmpresas] = useState<EmpresaData[]>([]);
  const [clientesList, setClientesList] = useState<ClienteData[]>([]);
  const [selectedRazaoSocialOption, setSelectedRazaoSocialOption] = useState<string>('');

  useEffect(() => {
    getEmpresasCadastradas().then(data => {
      if (data) setMinhasEmpresas(data);
    });
    getClientesCadastrados().then(data => {
      if (data) setClientesList(data);
    });
  }, [showSolicitacaoView]);

  const handleSelectRazaoSocial = (selectedVal: string) => {
    setSelectedRazaoSocialOption(selectedVal);
    if (!selectedVal) return;

    if (selectedVal.startsWith('emp_')) {
      const empId = selectedVal.replace('emp_', '');
      const emp = minhasEmpresas.find(e => e.id === empId);
      if (!emp) return;

      const addressParts = [
        emp.logradouro,
        emp.numero ? `Nº ${emp.numero}` : '',
        emp.bairro
      ].filter(Boolean);

      setSolicitacaoForm(prev => ({
        ...prev,
        razaoSocial: emp.razao_social,
        cnpj: emp.cnpj || '',
        ie: emp.inscricao_estadual || '',
        cep: emp.cep || '',
        telefone: emp.telefone || '',
        cidadeFornecedor: emp.cidade || '',
        estadoFornecedor: emp.uf || '',
        enderecoFornecedor: addressParts.join(', ')
      }));
    } else if (selectedVal.startsWith('cli_') || selectedVal.startsWith('client_orcamento')) {
      const clientName = orcamentoInfo?.cliente || orcamentoInfo?.cliente_nome || '';
      let cli: any = null;

      if (selectedVal.startsWith('cli_')) {
        const cliId = selectedVal.replace('cli_', '');
        cli = clientesList.find(c => c.id === cliId);
      } else {
        const targetName = clientName.toLowerCase().trim();
        cli = clientesList.find(c => (c.razao_social || '').toLowerCase().trim() === targetName || (c.nome_fantasia || '').toLowerCase().trim() === targetName);
      }

      const rawCity = cli?.cidade || orcamentoInfo?.cidade || orcamentoInfo?.dadosComplementares?.cidade || '';
      const rawState = cli?.uf || orcamentoInfo?.estado || orcamentoInfo?.dadosComplementares?.estado || '';
      const resolvedLoc = resolveCidadeEstadoFromCliente(cli?.razao_social || clientName, rawCity, rawState);

      const addressParts = [
        cli?.logradouro || cli?.endereco || '',
        cli?.numero ? `Nº ${cli.numero}` : '',
        cli?.bairro || ''
      ].filter(Boolean);

      setSolicitacaoForm(prev => ({
        ...prev,
        razaoSocial: cli?.razao_social || clientName,
        cnpj: cli?.cnpj || '',
        ie: cli?.inscricao_estadual || cli?.ie || '',
        cep: cli?.cep || '',
        telefone: cli?.telefone || '',
        cidadeFornecedor: resolvedLoc.cidade || cli?.cidade || '',
        estadoFornecedor: resolvedLoc.estado || cli?.uf || '',
        enderecoFornecedor: addressParts.join(', ')
      }));
    }
  };

  const handleAnexosChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let val = e.target.value;
    if (val && !val.startsWith('• ') && !val.startsWith('•')) {
      val = '• ' + val;
    } else if (val === '•') {
      val = '• ';
    }
    setSolicitacaoForm(prev => ({ ...prev, anexos: val }));
  };

  const handleAnexosKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    if (e.key === 'Enter') {
      e.preventDefault();
      const selectionStart = target.selectionStart;
      const selectionEnd = target.selectionEnd;
      const val = target.value;

      const before = val.substring(0, selectionStart);
      const after = val.substring(selectionEnd);

      const newVal = before + '\n• ' + after;
      setSolicitacaoForm(prev => ({ ...prev, anexos: newVal }));

      setTimeout(() => {
        target.selectionStart = target.selectionEnd = selectionStart + 3;
      }, 0);
    } else if (e.key === 'Backspace') {
      const selectionStart = target.selectionStart;
      const val = target.value;
      if (selectionStart > 0 && val.substring(selectionStart - 2, selectionStart) === '• ') {
        e.preventDefault();
        const before = val.substring(0, selectionStart - 2);
        const after = val.substring(selectionStart);
        const newVal = before + after;
        setSolicitacaoForm(prev => ({ ...prev, anexos: newVal }));
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = selectionStart - 2;
        }, 0);
      }
    }
  };

  const handleAnexosFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (!e.target.value) {
      setSolicitacaoForm(prev => ({ ...prev, anexos: '• ' }));
    }
  };

  // Ajusta dinamicamente a altura dos campos de texto (endereços, anexos, observações)
  useEffect(() => {
    if (showSolicitacaoView) {
      const textareas = document.querySelectorAll<HTMLTextAreaElement>('#solicitacao-cotacao-pdf textarea');
      textareas.forEach(ta => {
        ta.style.height = 'auto';
        ta.style.height = `${ta.scrollHeight}px`;
      });
    }
  }, [solicitacaoForm, showSolicitacaoView]);

  // Lista de itens da Solicitação de Cotação
  const [solicitacaoItems, setSolicitacaoItems] = useState<SolicitacaoItem[]>([]);

  // 1. Extração dos insumos (folhas / sem filhos) e agregação de quantidades
  const rawInsumos = useMemo(() => {
    if (!itens || itens.length === 0) return [];

    const eapSet = new Set(itens.map(i => (i.item_eap || '').trim()).filter(Boolean));
    const parentEaps = new Set<string>();
    eapSet.forEach(eap => {
      const parts = eap.split('.');
      for (let i = 1; i < parts.length; i++) {
        parentEaps.add(parts.slice(0, i).join('.'));
      }
    });

    return itens.filter(item => {
      const eap = (item.item_eap || '').trim();
      const isSecao = item.isSecao || item.is_secao || (!item.codigo && (!item.quantidade || item.quantidade === 0) && !item.unidade);
      const isParent = parentEaps.has(eap) || item.hasChildren || item.isSummary;
      const hasContent = Boolean((item.codigo && item.codigo.trim()) || (item.descricao && item.descricao.trim()));

      return hasContent && !isSecao && !isParent;
    });
  }, [itens]);

  // Carrega mapeamento de tipos do banco
  useEffect(() => {
    let isMounted = true;
    const fetchTiposFromDb = async () => {
      const codigos = Array.from(
        new Set(rawInsumos.map(i => (i.codigo || '').trim()).filter(Boolean))
      );
      if (codigos.length === 0) return;

      setLoadingDbTipos(true);
      try {
        const { data, error } = await supabase
          .schema('engenharia')
          .from('insumos')
          .select('codigo, tipo')
          .in('codigo', codigos);

        if (!error && data && isMounted) {
          const map: Record<string, string> = {};
          data.forEach(row => {
            if (row.codigo) map[row.codigo.trim().toUpperCase()] = row.tipo || '';
          });
          setDbTiposMap(map);
        }
      } catch (e) {
        console.error('Erro ao buscar tipos de insumos no DB:', e);
      } finally {
        if (isMounted) setLoadingDbTipos(false);
      }
    };

    fetchTiposFromDb();
    return () => { isMounted = false; };
  }, [rawInsumos]);

  // Classificador de tipo
  const classifyTipoInsumo = (codigo?: string | null, descricao?: string | null): TipoInsumoGroup => {
    const codUpper = (codigo || '').trim().toUpperCase();
    const descUpper = (descricao || '').trim().toUpperCase();

    if (codUpper && dbTiposMap[codUpper]) {
      const dbTipo = dbTiposMap[codUpper].toUpperCase();
      if (dbTipo.includes('EQUIP') || dbTipo.includes('MÁQUINA') || dbTipo.includes('MAQUINA')) return 'EQUIPAMENTOS';
      if (dbTipo.includes('MÃO') || dbTipo.includes('MAO') || dbTipo.includes('OBRA') || dbTipo.includes('SERVENTE') || dbTipo.includes('PEDREIRO')) return 'MÃO DE OBRA';
      if (dbTipo.includes('MATER') || dbTipo.includes('INSUMO')) return 'MATERIAL';
      if (dbTipo.includes('SERV') || dbTipo.includes('TERCEIR') || dbTipo.includes('OUTRO')) return 'OUTROS';
    }

    if (codUpper.startsWith('MAT') || codUpper.startsWith('MAT.')) return 'MATERIAL';
    if (codUpper.startsWith('EQP') || codUpper.startsWith('EQP.') || codUpper.startsWith('EQ')) return 'EQUIPAMENTOS';
    if (codUpper.startsWith('MO') || codUpper.startsWith('MO.') || codUpper.startsWith('MOD')) return 'MÃO DE OBRA';
    if (codUpper.startsWith('SERV') || codUpper.startsWith('OUT')) return 'OUTROS';

    if (descUpper.includes('EQUIPAMENTO') || descUpper.includes('MAQUINA') || descUpper.includes('VEICULO') || descUpper.includes('CAMINHAO') || descUpper.includes('BETONEIRA')) {
      return 'EQUIPAMENTOS';
    }
    if (descUpper.includes('MAO DE OBRA') || descUpper.includes('MÃO DE OBRA') || descUpper.includes('SERVENTE') || descUpper.includes('OPERADOR') || descUpper.includes('OFICIAL') || descUpper.includes('PEDREIRO') || descUpper.includes('CARPINTEIRO') || descUpper.includes('ARMADOR')) {
      return 'MÃO DE OBRA';
    }
    if (descUpper.includes('SERVIÇO DE TERCEIROS') || descUpper.includes('TAXA') || descUpper.includes('ENERGIA') || descUpper.includes('ALUGUEL')) {
      return 'OUTROS';
    }

    return 'MATERIAL';
  };

  // 2. Agrupa os insumos repetidos
  const aggregatedInsumos = useMemo<AggregatedInsumo[]>(() => {
    const map = new Map<string, AggregatedInsumo>();

    rawInsumos.forEach(item => {
      const cod = (item.codigo || '').trim();
      const desc = (item.descricao || '').trim();
      const uni = (item.unidade || '').trim().toUpperCase();
      
      const key = cod ? `COD:${cod.toUpperCase()}` : `DESC:${desc.toUpperCase()}|UNI:${uni}`;
      const qty = item.displayQuantidade !== undefined ? item.displayQuantidade : (item.quantidade || 0);
      const tipoGroup = classifyTipoInsumo(cod, desc);

      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.quantidadeTotal += qty;
        existing.itemCount += 1;
      } else {
        map.set(key, {
          key,
          codigo: cod || 'S/CÓD',
          descricao: desc,
          unidade: uni,
          quantidadeTotal: qty,
          tipoGroup,
          bancoFonte: item.banco_fonte || undefined,
          itemCount: 1,
          unitMat: item.valor_unitario_mat || 0,
          unitMo: item.valor_unitario_mo || 0
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [rawInsumos, dbTiposMap]);

  // Inicializa seleção
  useEffect(() => {
    if (aggregatedInsumos.length > 0 && selectedKeys.size === 0) {
      setSelectedKeys(new Set(aggregatedInsumos.map(i => i.key)));
    }
  }, [aggregatedInsumos]);

  // Filtro de busca
  const filteredInsumos = useMemo(() => {
    if (!searchFilter.trim()) return aggregatedInsumos;
    const term = searchFilter.toLowerCase();
    return aggregatedInsumos.filter(item => 
      item.codigo.toLowerCase().includes(term) || 
      item.descricao.toLowerCase().includes(term) ||
      item.unidade.toLowerCase().includes(term)
    );
  }, [aggregatedInsumos, searchFilter]);

  // Agrupamento por tipo
  const groupedByTipo = useMemo(() => {
    const groups: Record<TipoInsumoGroup, AggregatedInsumo[]> = {
      'MATERIAL': [],
      'EQUIPAMENTOS': [],
      'MÃO DE OBRA': [],
      'OUTROS': []
    };

    filteredInsumos.forEach(item => {
      groups[item.tipoGroup].push(item);
    });

    return groups;
  }, [filteredInsumos]);

  const groupOrder: TipoInsumoGroup[] = ['MATERIAL', 'EQUIPAMENTOS', 'MÃO DE OBRA', 'OUTROS'];

  // Handlers de seleção
  const toggleSelect = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleGroupSelect = (tipo: TipoInsumoGroup) => {
    const groupItems = groupedByTipo[tipo];
    if (groupItems.length === 0) return;

    const allSelected = groupItems.every(i => selectedKeys.has(i.key));
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (allSelected) {
        groupItems.forEach(i => next.delete(i.key));
      } else {
        groupItems.forEach(i => next.add(i.key));
      }
      return next;
    });
  };

  const toggleSelectAllGlobal = () => {
    if (selectedKeys.size === filteredInsumos.length && filteredInsumos.length > 0) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(filteredInsumos.map(i => i.key)));
    }
  };

  const toggleGroupCollapse = (tipo: TipoInsumoGroup) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(tipo)) next.delete(tipo);
      else next.add(tipo);
      return next;
    });
  };

  const totalSelected = selectedKeys.size;
  const isAllGlobalSelected = filteredInsumos.length > 0 && totalSelected === filteredInsumos.length;

  // ── AÇÃO DE GERAR A SOLICITAÇÃO DE COTAÇÃO ──────────────────
  const handleGerarSolicitacao = () => {
    const selected = aggregatedInsumos.filter(i => selectedKeys.has(i.key));
    if (selected.length === 0) return;

    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const defaultOrcamentoName = orcamentoInfo 
      ? `${orcamentoInfo.codigo ? `${orcamentoInfo.codigo} - ` : ''}${orcamentoInfo.nome || 'Orçamento'}`
      : 'Orçamento';

    const rawCity = orcamentoInfo?.cidade || orcamentoInfo?.dadosComplementares?.cidade || orcamentoInfo?.cidade_obra || '';
    const rawState = orcamentoInfo?.estado || orcamentoInfo?.dadosComplementares?.estado || orcamentoInfo?.uf || '';
    const clientName = orcamentoInfo?.cliente || orcamentoInfo?.cliente_nome || '';
    const resolvedLoc = resolveCidadeEstadoFromCliente(clientName, rawCity, rawState);

    const city = resolvedLoc.cidade;
    const state = resolvedLoc.estado;
    const emp = orcamentoInfo?.empresa || 'BRP Soluções Metálicas';

    setSolicitacaoForm({
      emissao: formattedDate,
      empresa: emp,
      orcamento: defaultOrcamentoName,
      enderecoEntrega: orcamentoInfo?.dadosComplementares?.enderecoEntrega || '',
      cidade: city,
      estado: state,
      prazoRetorno: '',
      unidadeContratacao: 'EMPREITADA GLOBAL',
      razaoSocial: '',
      cnpj: '',
      ie: '',
      cep: '',
      telefone: '',
      cidadeFornecedor: '',
      estadoFornecedor: '',
      enderecoFornecedor: '',
      anexos: '',
      observacoes: ''
    });

    const itemsForForm: SolicitacaoItem[] = selected.map(item => {
      return {
        ...item,
        unitMatInput: '',
        unitMoInput: '',
        valorUnitInput: '',
        valorTotalInput: ''
      };
    });

    setSolicitacaoItems(itemsForForm);
    setShowSolicitacaoView(true);
  };

  // Recalcula totais na tabela da Solicitação
  const handleUpdateItemValue = (key: string, field: 'unitMatInput' | 'unitMoInput' | 'valorUnitInput' | 'valorTotalInput', val: string) => {
    setSolicitacaoItems(prev => prev.map(item => {
      if (item.key !== key) return item;

      const updated = { ...item, [field]: val };

      if (field === 'unitMatInput' || field === 'unitMoInput') {
        const matNum = parseFloat(updated.unitMatInput.replace(',', '.')) || 0;
        const moNum = parseFloat(updated.unitMoInput.replace(',', '.')) || 0;
        const sumUnit = matNum + moNum;
        if (sumUnit > 0) {
          updated.valorUnitInput = sumUnit.toFixed(2);
          updated.valorTotalInput = (updated.quantidadeTotal * sumUnit).toFixed(2);
        }
      } else if (field === 'valorUnitInput') {
        const unitNum = parseFloat(updated.valorUnitInput.replace(',', '.')) || 0;
        if (unitNum > 0) {
          updated.valorTotalInput = (updated.quantidadeTotal * unitNum).toFixed(2);
        }
      }

      return updated;
    }));
  };

  // Agrupamento dos itens da Solicitação por Tipo
  const solicitacaoGrouped = useMemo(() => {
    const groups: Record<TipoInsumoGroup, SolicitacaoItem[]> = {
      'MATERIAL': [],
      'EQUIPAMENTOS': [],
      'MÃO DE OBRA': [],
      'OUTROS': []
    };
    solicitacaoItems.forEach(item => {
      groups[item.tipoGroup].push(item);
    });
    return groups;
  }, [solicitacaoItems]);

  // Handler de impressão / salvar PDF
  const handlePrintPdf = () => {
    window.print();
  };

  // Identificação dinâmica da logo da empresa selecionada/preenchida no orçamento
  const currentEmpresaName = (solicitacaoForm.empresa || orcamentoInfo?.empresa || '').toLowerCase();
  const isSolucoesMetalicas = currentEmpresaName.includes('soluç') || currentEmpresaName.includes('metálic') || currentEmpresaName.includes('metalic') || currentEmpresaName.includes('soluc');

  // ─────────────────────────────────────────────────────────────
  // RENDERING: VISTA DA SOLICITAÇÃO DE COTAÇÃO (MODO DOCUMENTO/PDF)
  // ─────────────────────────────────────────────────────────────
  if (showSolicitacaoView) {
    return (
      <div className="flex flex-col h-full bg-slate-100 overflow-auto">
        {/* Barra de Ferramentas Superior (Invisível na impressão) */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs sticky top-0 z-30 print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSolicitacaoView(false)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2 cursor-pointer border border-slate-200 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Seleção
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                Solicitação de Cotação
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {solicitacaoItems.length} itens selecionados
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Preencha os dados adicionais da solicitação e clique em Exportar PDF para gerar o documento oficial
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrintPdf}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm shadow-blue-500/20 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Exportar PDF / Imprimir
            </button>
          </div>
        </div>

        {/* ── DOCUMENTO DA SOLICITAÇÃO (MODELO CLEAN FIDEDIGNO AO PDF) ── */}
        <div className="p-4 md:p-8 flex justify-center">
          <div 
            id="solicitacao-cotacao-pdf"
            className="w-full max-w-[1000px] bg-white border border-slate-400 p-6 shadow-md text-slate-900 font-sans print:border-0 print:p-0 print:shadow-none print:w-full print:max-w-none text-[11px] leading-tight"
          >
            {/* Header: Logo BRP da Empresa + Emissão */}
            <div className="flex justify-between items-center border-b border-slate-400 pb-3 mb-3">
              <div className="flex items-center">
                {isSolucoesMetalicas ? (
                  <img 
                    src="/logo_brp_metalica_cinza.png" 
                    alt="Logo BRP Soluções Metálicas" 
                    className="h-12 max-h-14 w-auto object-contain"
                  />
                ) : (
                  <img 
                    src="/logo_brp.png" 
                    alt="Logo BRP Engenharia" 
                    className="h-12 max-h-14 w-auto object-contain"
                  />
                )}
              </div>

              <div className="flex items-center gap-2 font-bold text-slate-700">
                <span>EMISSÃO:</span>
                <span className="font-semibold text-slate-900">{solicitacaoForm.emissao}</span>
              </div>
            </div>

            {/* Cabeçalho de Informações do Orçamento (Campos Ineditáveis vêm do cadastro do orçamento) */}
            <table className="w-full border-collapse border border-slate-400 mb-3 text-[11px] bg-white">
              <tbody>
                {/* Linha 1 */}
                <tr className="border-b border-slate-400">
                  <td className="p-1.5 border-r border-slate-400 w-[50%]">
                    <div className="flex items-center gap-1.5 w-full">
                      <span className="font-bold text-slate-700 whitespace-nowrap shrink-0">EMPRESA:</span>
                      <span className="font-semibold text-slate-900 truncate">{solicitacaoForm.empresa || 'BRP ENGENHARIA'}</span>
                    </div>
                  </td>
                  <td className="p-1.5 border-r border-slate-400 w-[20%]">
                    <div className="flex items-center gap-1.5 w-full">
                      <span className="font-bold text-slate-700 whitespace-nowrap shrink-0">CIDADE:</span>
                      <span className="font-semibold text-slate-900 truncate">{solicitacaoForm.cidade || '-'}</span>
                    </div>
                  </td>
                  <td className="p-1.5 w-[30%]">
                    <div className="flex items-center gap-1.5 w-full">
                      <span className="font-bold text-slate-700 whitespace-nowrap shrink-0 text-[10px]">PRAZO RETORNO (DATA/HORA):</span>
                      <input
                        type="text"
                        placeholder="Ex: 20/09/2026 17:00"
                        value={solicitacaoForm.prazoRetorno}
                        onChange={e => setSolicitacaoForm(prev => ({ ...prev, prazoRetorno: e.target.value }))}
                        className="w-full min-w-0 bg-transparent border-0 outline-none p-0 text-[11px] font-medium text-slate-900 focus:outline-none placeholder-slate-400"
                      />
                    </div>
                  </td>
                </tr>

                {/* Linha 2 */}
                <tr className="border-b border-slate-400">
                  <td className="p-1.5 border-r border-slate-400">
                    <div className="flex items-center gap-1.5 w-full">
                      <span className="font-bold text-slate-700 whitespace-nowrap shrink-0">ORÇAMENTO:</span>
                      <span className="font-semibold text-slate-900 truncate">{solicitacaoForm.orcamento || '-'}</span>
                    </div>
                  </td>
                  <td className="p-1.5 border-r border-slate-400">
                    <div className="flex items-center gap-1.5 w-full">
                      <span className="font-bold text-slate-700 whitespace-nowrap shrink-0">ESTADO:</span>
                      <span className="font-semibold text-slate-900 truncate">{solicitacaoForm.estado || '-'}</span>
                    </div>
                  </td>
                  <td className="p-1.5">
                    <div className="flex items-center gap-1.5 w-full">
                      <span className="font-bold text-slate-700 whitespace-nowrap shrink-0 text-[10px]">UNIDADE DE CONTRATAÇÃO:</span>
                      <select
                        value={solicitacaoForm.unidadeContratacao}
                        onChange={e => setSolicitacaoForm(prev => ({ ...prev, unidadeContratacao: e.target.value }))}
                        className="w-full min-w-0 bg-transparent border-0 outline-none p-0 text-[11px] font-semibold text-slate-900 focus:outline-none cursor-pointer"
                      >
                        <option value="">Selecione...</option>
                        <option value="EMPREITADA GLOBAL">EMPREITADA GLOBAL</option>
                        <option value="PREÇO UNITÁRIO">PREÇO UNITÁRIO</option>
                        <option value="SERVIÇO APENAS">SERVIÇO APENAS</option>
                        <option value="M.O. APENAS">M.O. APENAS</option>
                      </select>
                    </div>
                  </td>
                </tr>

                {/* Linha 3 */}
                <tr>
                  <td colSpan={3} className="p-1.5">
                    <div className="flex items-start gap-1.5 w-full">
                      <span className="font-bold text-slate-700 whitespace-nowrap shrink-0 mt-0.5">ENDEREÇO DE ENTREGA:</span>
                      <textarea
                        rows={1}
                        placeholder="Rua, número, bairro, cidade - UF"
                        value={solicitacaoForm.enderecoEntrega}
                        onChange={e => setSolicitacaoForm(prev => ({ ...prev, enderecoEntrega: e.target.value }))}
                        className="w-full min-w-0 bg-transparent border-0 outline-none p-0 text-[11px] font-medium text-slate-900 focus:outline-none placeholder-slate-400 resize-none overflow-hidden leading-snug"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Seção DADOS CADASTRAIS (Fornecedor) - Campos sem bordas de input */}
            <div className="border border-slate-400 mb-3">
              <div className="bg-slate-200 text-center font-extrabold uppercase py-1 text-[11px] text-slate-800 tracking-wider border-b border-slate-400">
                DADOS CADASTRAIS
              </div>
              <table className="w-full border-collapse text-[11px] bg-white">
                <tbody>
                  <tr className="border-b border-slate-400">
                    <td className="p-1.5 border-r border-slate-400 w-[65%]">
                      <div className="flex items-center gap-1.5 w-full">
                        <span className="font-bold text-slate-700 whitespace-nowrap shrink-0">RAZÃO SOCIAL:</span>
                        {(Boolean(orcamentoInfo?.cliente || orcamentoInfo?.cliente_nome) || minhasEmpresas.length > 0 || clientesList.length > 0) && (
                          <select
                            value={selectedRazaoSocialOption}
                            onChange={e => handleSelectRazaoSocial(e.target.value)}
                            className="bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-[10px] px-1.5 py-0.5 font-medium text-slate-700 outline-none cursor-pointer print:hidden shrink-0 max-w-[180px] truncate"
                            title="Selecione uma empresa ou cliente para preencher os dados automaticamente"
                          >
                            <option value="">-- Selecionar Opção --</option>

                            {(orcamentoInfo?.cliente || orcamentoInfo?.cliente_nome) && (
                              <option value={`client_orcamento_${orcamentoInfo?.cliente || orcamentoInfo?.cliente_nome}`}>
                                ⭐ Cliente: {orcamentoInfo?.cliente || orcamentoInfo?.cliente_nome}
                              </option>
                            )}

                            {minhasEmpresas.length > 0 && (
                              <optgroup label="Minhas Empresas">
                                {minhasEmpresas.map(emp => (
                                  <option key={emp.id} value={`emp_${emp.id}`}>
                                    {emp.razao_social}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                        )}
                        <input
                          type="text"
                          placeholder="Digite ou selecione a razão social..."
                          value={solicitacaoForm.razaoSocial}
                          onChange={e => {
                            setSelectedRazaoSocialOption('');
                            setSolicitacaoForm(prev => ({ ...prev, razaoSocial: e.target.value }));
                          }}
                          className="w-full min-w-0 bg-transparent border-0 outline-none p-0 text-[11px] font-medium text-slate-900 focus:outline-none"
                        />
                      </div>
                    </td>
                    <td className="p-1.5 w-[35%]">
                      <div className="flex items-center gap-1.5 w-full">
                        <span className="font-bold text-slate-700 whitespace-nowrap shrink-0">TELEFONE:</span>
                        <input
                          type="text"
                          value={solicitacaoForm.telefone}
                          onChange={e => setSolicitacaoForm(prev => ({ ...prev, telefone: e.target.value }))}
                          className="w-full min-w-0 bg-transparent border-0 outline-none p-0 text-[11px] text-slate-900 focus:outline-none"
                        />
                      </div>
                    </td>
                  </tr>

                  <tr className="border-b border-slate-400">
                    <td className="p-1.5 border-r border-slate-400">
                      <div className="flex items-center gap-1.5 w-full">
                        <span className="font-bold text-slate-700 whitespace-nowrap shrink-0">CNPJ:</span>
                        <input
                          type="text"
                          value={solicitacaoForm.cnpj}
                          onChange={e => setSolicitacaoForm(prev => ({ ...prev, cnpj: e.target.value }))}
                          className="w-full min-w-0 bg-transparent border-0 outline-none p-0 text-[11px] text-slate-900 focus:outline-none"
                        />
                      </div>
                    </td>
                    <td className="p-1.5">
                      <div className="flex items-center gap-1.5 w-full">
                        <span className="font-bold text-slate-700 whitespace-nowrap shrink-0">CIDADE:</span>
                        <input
                          type="text"
                          value={solicitacaoForm.cidadeFornecedor}
                          onChange={e => setSolicitacaoForm(prev => ({ ...prev, cidadeFornecedor: e.target.value }))}
                          className="w-full min-w-0 bg-transparent border-0 outline-none p-0 text-[11px] text-slate-900 focus:outline-none"
                        />
                      </div>
                    </td>
                  </tr>

                  <tr className="border-b border-slate-400">
                    <td className="p-1.5 border-r border-slate-400">
                      <div className="flex items-center gap-1.5 w-full">
                        <span className="font-bold text-slate-700 whitespace-nowrap shrink-0">IE:</span>
                        <input
                          type="text"
                          value={solicitacaoForm.ie}
                          onChange={e => setSolicitacaoForm(prev => ({ ...prev, ie: e.target.value }))}
                          className="w-full min-w-0 bg-transparent border-0 outline-none p-0 text-[11px] text-slate-900 focus:outline-none"
                        />
                      </div>
                    </td>
                    <td className="p-1.5">
                      <div className="flex items-center gap-1.5 w-full">
                        <span className="font-bold text-slate-700 whitespace-nowrap shrink-0">ESTADO:</span>
                        <input
                          type="text"
                          value={solicitacaoForm.estadoFornecedor}
                          onChange={e => setSolicitacaoForm(prev => ({ ...prev, estadoFornecedor: e.target.value }))}
                          className="w-full min-w-0 bg-transparent border-0 outline-none p-0 text-[11px] text-slate-900 focus:outline-none"
                        />
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="p-1.5 border-r border-slate-400">
                      <div className="flex items-center gap-1.5 w-full">
                        <span className="font-bold text-slate-700 whitespace-nowrap shrink-0">CEP:</span>
                        <input
                          type="text"
                          value={solicitacaoForm.cep}
                          onChange={e => setSolicitacaoForm(prev => ({ ...prev, cep: e.target.value }))}
                          className="w-full min-w-0 bg-transparent border-0 outline-none p-0 text-[11px] text-slate-900 focus:outline-none"
                        />
                      </div>
                    </td>
                    <td className="p-1.5">
                      <div className="flex items-start gap-1.5 w-full">
                        <span className="font-bold text-slate-700 whitespace-nowrap shrink-0 mt-0.5">ENDEREÇO:</span>
                        <textarea
                          rows={1}
                          placeholder="Rua, número, bairro..."
                          value={solicitacaoForm.enderecoFornecedor}
                          onChange={e => setSolicitacaoForm(prev => ({ ...prev, enderecoFornecedor: e.target.value }))}
                          className="w-full min-w-0 bg-transparent border-0 outline-none p-0 text-[11px] font-medium text-slate-900 focus:outline-none resize-none overflow-hidden leading-snug"
                        />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Seção ANEXOS sem borda no textarea */}
            <div className="border border-slate-400 mb-3">
              <div className="bg-slate-200 text-center font-extrabold uppercase py-1 text-[11px] text-slate-800 tracking-wider border-b border-slate-400">
                ANEXOS
              </div>
              <div className="p-1.5 min-h-[45px] bg-white">
                <textarea
                  rows={2}
                  placeholder="• Descreva anexos, links de projetos, memoriais ou especificações técnicas..."
                  value={solicitacaoForm.anexos}
                  onFocus={handleAnexosFocus}
                  onChange={handleAnexosChange}
                  onKeyDown={handleAnexosKeyDown}
                  className="w-full bg-transparent border-0 outline-none p-0 text-[11px] text-slate-900 focus:outline-none resize-none overflow-hidden leading-relaxed placeholder-slate-400 font-normal"
                />
              </div>
            </div>

            {/* Seção LISTA DE MATERIAIS */}
            <div className="border border-slate-400 mb-3">
              <div className="bg-slate-200 text-center font-extrabold uppercase py-1 text-[11px] text-slate-800 tracking-wider border-b border-slate-400">
                LISTA DE MATERIAIS
              </div>

              <div className="bg-white">
                {groupOrder.map(tipo => {
                  const groupItems = solicitacaoGrouped[tipo];
                  if (groupItems.length === 0) return null;

                  return (
                    <div key={tipo} className="border-b border-slate-400 last:border-b-0">
                      {/* Linha de Subcabeçalho de Tipo */}
                      <div className="bg-slate-100 border-b border-slate-400 px-3 py-1 font-extrabold text-[11px] text-slate-800 flex gap-4">
                        <span className="text-slate-500">TIPO</span>
                        <span>{tipo}</span>
                      </div>

                      {/* Tabela de Itens */}
                      <table className="w-full border-collapse text-[10px]">
                        <thead>
                          <tr className="border-b border-slate-400 bg-slate-50 font-bold text-slate-700 text-left">
                            <th className="p-1.5 border-r border-slate-400 w-24">CÓDIGO</th>
                            <th className="p-1.5 border-r border-slate-400">DESCRIÇÃO</th>
                            <th className="p-1.5 border-r border-slate-400 w-24 text-right">QUANTIDADE</th>
                            <th className="p-1.5 border-r border-slate-400 w-16 text-center">UNIDADE</th>
                            <th className="p-1.5 border-r border-slate-400 w-20 text-right">UNIT. MAT.</th>
                            <th className="p-1.5 border-r border-slate-400 w-20 text-right">UNIT. M.O.</th>
                            <th className="p-1.5 border-r border-slate-400 w-24 text-right">VALOR UNIT.</th>
                            <th className="p-1.5 w-24 text-right">VALOR TOTAL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupItems.map(item => (
                            <tr key={item.key} className="border-b border-slate-300 last:border-b-0">
                              <td className="p-1.5 border-r border-slate-300 font-mono font-semibold text-slate-800">
                                {item.codigo}
                              </td>
                              <td className="p-1.5 border-r border-slate-300 text-slate-800 font-medium">
                                {item.descricao}
                              </td>
                              <td className="p-1.5 border-r border-slate-300 text-right font-semibold tabular-nums text-slate-800">
                                {item.quantidadeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}
                              </td>
                              <td className="p-1.5 border-r border-slate-300 text-center font-medium text-slate-700">
                                {item.unidade}
                              </td>
                              <td className="p-1 border-r border-slate-300 text-right">
                                <input
                                  type="text"
                                  placeholder=""
                                  value={item.unitMatInput}
                                  onChange={e => handleUpdateItemValue(item.key, 'unitMatInput', e.target.value)}
                                  className="w-full bg-transparent border-0 outline-none p-0 text-right text-[10px] text-slate-900 focus:outline-none"
                                />
                              </td>
                              <td className="p-1 border-r border-slate-300 text-right">
                                <input
                                  type="text"
                                  placeholder=""
                                  value={item.unitMoInput}
                                  onChange={e => handleUpdateItemValue(item.key, 'unitMoInput', e.target.value)}
                                  className="w-full bg-transparent border-0 outline-none p-0 text-right text-[10px] text-slate-900 focus:outline-none"
                                />
                              </td>
                              <td className="p-1 border-r border-slate-300 text-right">
                                <input
                                  type="text"
                                  placeholder=""
                                  value={item.valorUnitInput}
                                  onChange={e => handleUpdateItemValue(item.key, 'valorUnitInput', e.target.value)}
                                  className="w-full bg-transparent border-0 outline-none p-0 text-right text-[10px] font-medium text-slate-900 focus:outline-none"
                                />
                              </td>
                              <td className="p-1 text-right">
                                <input
                                  type="text"
                                  placeholder=""
                                  value={item.valorTotalInput}
                                  onChange={e => handleUpdateItemValue(item.key, 'valorTotalInput', e.target.value)}
                                  className="w-full bg-transparent border-0 outline-none p-0 text-right text-[10px] font-semibold text-slate-900 focus:outline-none"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Seção OBSERVAÇÕES sem bordas no textarea */}
            <div className="border border-slate-400">
              <div className="bg-slate-200 px-3 py-1 font-extrabold uppercase text-[11px] text-slate-800 tracking-wider border-b border-slate-400">
                OBSERVAÇÕES:
              </div>
              <div className="p-1.5 min-h-[60px] bg-white">
                <textarea
                  rows={3}
                  placeholder="Condições de pagamento, frete, prazo de entrega ou observações gerais para a cotação..."
                  value={solicitacaoForm.observacoes}
                  onChange={e => setSolicitacaoForm(prev => ({ ...prev, observacoes: e.target.value }))}
                  className="w-full bg-transparent border-0 outline-none p-0 text-[11px] text-slate-900 focus:outline-none resize-none placeholder-slate-400"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDERING: VISTA PADRÃO DA TABELA DE SELEÇÃO DE MATERIAIS
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* ── Top Bar Header ────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              Lista de Materiais
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                {aggregatedInsumos.length} {aggregatedInsumos.length === 1 ? 'insumo' : 'insumos'}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Insumos consolidados e agrupados por categoria para requisição e cotação
            </p>
          </div>
        </div>

        {/* Controles de Ação e Filtro */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar código ou descrição..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-white text-xs border border-slate-200 rounded-xl w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 placeholder-slate-400"
            />
          </div>

          <button
            onClick={toggleSelectAllGlobal}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            {isAllGlobalSelected ? (
              <>
                <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                Desmarcar Todos
              </>
            ) : (
              <>
                <Square className="w-3.5 h-3.5 text-slate-400" />
                Marcar Todos
              </>
            )}
          </button>

          <button
            disabled={totalSelected === 0}
            onClick={handleGerarSolicitacao}
            className={clsx(
              "px-4 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer",
              totalSelected > 0
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20"
                : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
            )}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Gerar Lista de Materiais ({totalSelected})
          </button>
        </div>
      </div>

      {/* ── Conteúdo da Tabela DE SELEÇÃO ───────────────────────────── */}
      <div className="flex-1 overflow-auto min-h-0 bg-white">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-20 bg-slate-100 border-b border-slate-300">
            <tr className="text-xs font-bold text-slate-700 uppercase tracking-wider select-none">
              <th className="py-3 px-4 border-r border-slate-300 w-28 text-center bg-slate-100">
                SELEÇÃO
              </th>
              <th className="py-3 px-4 border-r border-slate-300 w-40 text-left bg-slate-100">
                CÓDIGO
              </th>
              <th className="py-3 px-4 border-r border-slate-300 text-left bg-slate-100">
                DESCRIÇÃO
              </th>
              <th className="py-3 px-4 border-r border-slate-300 w-36 text-right bg-slate-100">
                QUANTIDADE
              </th>
              <th className="py-3 px-4 w-28 text-center bg-slate-100">
                UNIDADE
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-xs">
            {aggregatedInsumos.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center text-slate-400">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
                  <p className="font-semibold text-slate-600 text-sm">Nenhum insumo encontrado no orçamento</p>
                  <p className="text-xs mt-1 text-slate-400">Adicione composições ou insumos na Planilha Orçamentária para visualizar os materiais.</p>
                </td>
              </tr>
            ) : (
              groupOrder.map(tipo => {
                const groupItems = groupedByTipo[tipo];
                if (groupItems.length === 0) return null;

                const isCollapsed = collapsedGroups.has(tipo);
                const groupSelectedCount = groupItems.filter(i => selectedKeys.has(i.key)).length;
                const isGroupAllSelected = groupSelectedCount === groupItems.length;
                const isGroupSomeSelected = groupSelectedCount > 0 && groupSelectedCount < groupItems.length;

                return (
                  <React.Fragment key={tipo}>
                    {/* Linha Mãe do Grupo */}
                    <tr className="bg-slate-200/90 font-bold border-t border-b border-slate-300 text-slate-800 hover:bg-slate-200 transition-colors select-none">
                      <td className="py-2.5 px-4 border-r border-slate-300 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleGroupCollapse(tipo)}
                            className="p-0.5 text-slate-600 hover:bg-slate-300 rounded transition-colors cursor-pointer"
                            title={isCollapsed ? "Expandir grupo" : "Recolher grupo"}
                          >
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleGroupSelect(tipo)}
                            className="p-0.5 text-slate-700 hover:bg-slate-300 rounded transition-colors cursor-pointer"
                            title="Selecionar/Desmarcar todos do tipo"
                          >
                            {isGroupAllSelected ? (
                              <div className="w-4 h-4 bg-blue-600 text-white rounded flex items-center justify-center shadow-2xs">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            ) : isGroupSomeSelected ? (
                              <div className="w-4 h-4 bg-blue-100 border border-blue-600 text-blue-600 rounded flex items-center justify-center">
                                <div className="w-2 h-2 bg-blue-600 rounded-xs" />
                              </div>
                            ) : (
                              <div className="w-4 h-4 border border-slate-400 bg-white rounded hover:border-slate-600" />
                            )}
                          </button>
                          <span className="text-[11px] font-extrabold tracking-wide uppercase text-slate-700">
                            TIPO
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-4 border-r border-slate-300 font-extrabold uppercase text-slate-800 tracking-wider">
                        {tipo}
                      </td>

                      <td className="py-2.5 px-4 border-r border-slate-300 font-semibold text-slate-600">
                        <span className="text-[11px] bg-slate-300/60 px-2 py-0.5 rounded-full font-bold text-slate-700">
                          {groupItems.length} {groupItems.length === 1 ? 'item' : 'itens'}
                        </span>
                        {groupSelectedCount > 0 && (
                          <span className="ml-2 text-[11px] text-blue-700 font-medium">
                            ({groupSelectedCount} selecionados)
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-4 border-r border-slate-300 text-right" />
                      <td className="py-2.5 px-4 text-center" />
                    </tr>

                    {/* Linhas Filhas do Grupo */}
                    {!isCollapsed && groupItems.map(item => {
                      const isSelected = selectedKeys.has(item.key);

                      return (
                        <tr 
                          key={item.key}
                          onClick={() => toggleSelect(item.key)}
                          className={clsx(
                            "hover:bg-blue-50/50 transition-colors cursor-pointer border-b border-slate-200",
                            isSelected ? "bg-white" : "bg-slate-50/50 opacity-75"
                          )}
                        >
                          <td className="py-2 px-4 border-r border-slate-200 text-center">
                            <div className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(item.key)}
                                onClick={e => e.stopPropagation()}
                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                              />
                            </div>
                          </td>

                          <td className="py-2 px-4 border-r border-slate-200 font-mono font-semibold text-slate-800">
                            {item.codigo}
                          </td>

                          <td className="py-2 px-4 border-r border-slate-200 text-slate-800 font-medium">
                            {item.descricao}
                          </td>

                          <td className="py-2 px-4 border-r border-slate-200 text-right font-semibold text-slate-800 tabular-nums">
                            {item.quantidadeTotal.toLocaleString('pt-BR', { 
                              minimumFractionDigits: 0, 
                              maximumFractionDigits: 4 
                            })}
                          </td>

                          <td className="py-2 px-4 text-center text-slate-700 font-medium">
                            {item.unidade}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
