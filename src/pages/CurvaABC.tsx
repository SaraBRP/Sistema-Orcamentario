import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Download, Search, 
  BarChart3, Layers, Package, FileSpreadsheet, Check, X,
  ChevronDown, RefreshCw
} from 'lucide-react';
import { clsx } from 'clsx';
import * as XLSX from 'xlsx';
import { renderStatusBadge } from './Orcamentos';

type OrcamentoItem = {
  id: string;
  orcamento_id: string;
  item_eap: string;
  codigo?: string;
  banco_fonte?: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_unitario_com_bdi: number;
  total: number;
  total_mat: number;
  total_mo: number;
  composicao_id?: string | null;
};

type ProcessedABCItem = OrcamentoItem & {
  ranking: number;
  valWithBdi: number;
  percTotal: number;
  percAcumulado: number;
  classe: 'A' | 'B' | 'C';
};

export default function CurvaABC() {
  // Orçamentos State
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [loadingOrcamentos, setLoadingOrcamentos] = useState(true);
  const [selectedOrcamento, setSelectedOrcamento] = useState<any | null>(null);

  // Estados para o Campo de Pesquisa Interativo de Orçamentos
  const [orcamentoSearchQuery, setOrcamentoSearchQuery] = useState('');
  const [isOrcamentoDropdownOpen, setIsOrcamentoDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sincroniza o texto de pesquisa com o orçamento selecionado
  useEffect(() => {
    if (selectedOrcamento) {
      setOrcamentoSearchQuery(`[${selectedOrcamento.codigo}] ${selectedOrcamento.nome || selectedOrcamento.projeto || 'Sem título'} - ${selectedOrcamento.cliente || 'Sem Cliente'}`);
    } else {
      setOrcamentoSearchQuery('');
    }
  }, [selectedOrcamento]);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOrcamentoDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lista de orçamentos filtrada em tempo real conforme o usuário digita no campo
  const filteredOrcamentosList = useMemo(() => {
    if (!orcamentoSearchQuery.trim()) return orcamentos;

    const query = orcamentoSearchQuery.toLowerCase().trim();
    // Se a busca for idêntica ao rótulo do orçamento atualmente selecionado, exibe todos os orçamentos
    if (selectedOrcamento) {
      const selectedLabel = `[${selectedOrcamento.codigo}] ${selectedOrcamento.nome || selectedOrcamento.projeto || 'Sem título'} - ${selectedOrcamento.cliente || 'Sem Cliente'}`.toLowerCase();
      if (query === selectedLabel) {
        return orcamentos;
      }
    }

    return orcamentos.filter(orc => {
      const matchCodigo = (orc.codigo || '').toLowerCase().includes(query);
      const matchNome = (orc.nome || orc.projeto || '').toLowerCase().includes(query);
      const matchCliente = (orc.cliente || '').toLowerCase().includes(query);
      return matchCodigo || matchNome || matchCliente;
    });
  }, [orcamentos, orcamentoSearchQuery, selectedOrcamento]);

  // Itens & ABC State
  const [rawItems, setRawItems] = useState<OrcamentoItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [nivelVisao, setNivelVisao] = useState<'Pacote' | 'Servico' | 'Insumo'>('Insumo');
  const [itemSearch, setItemSearch] = useState('');
  const [filterClasse, setFilterClasse] = useState<'todos' | 'A' | 'B' | 'C'>('todos');
  const [chartLimit, setChartLimit] = useState<number>(15); // 10, 15, 30, ou 999
  const [hoveredChartIndex, setHoveredChartIndex] = useState<number | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // Multi-seleção com Ctrl+Click, Cmd+Click (Mac) ou Shift+Click (intervalo ou múltiplos)
  const handleItemClick = (itemId: string, e: React.MouseEvent) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);

      // Se Shift estiver pressionado e houver um item previamente clicado na lista
      if (e.shiftKey && lastSelectedId && filteredItems.length > 0) {
        const lastIdx = filteredItems.findIndex(i => i.id === lastSelectedId);
        const currIdx = filteredItems.findIndex(i => i.id === itemId);

        if (lastIdx >= 0 && currIdx >= 0) {
          const start = Math.min(lastIdx, currIdx);
          const end = Math.max(lastIdx, currIdx);
          for (let i = start; i <= end; i++) {
            next.add(filteredItems[i].id);
          }
          return next;
        }
      }

      // Se Ctrl, Cmd ou Shift estiver pressionado
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        if (next.has(itemId)) {
          next.delete(itemId);
        } else {
          next.add(itemId);
        }
      } else {
        // Clique simples
        if (next.size === 1 && next.has(itemId)) {
          next.clear();
        } else {
          next.clear();
          next.add(itemId);
        }
      }
      return next;
    });

    setLastSelectedId(itemId);
  };


  useEffect(() => {
    fetchOrcamentos();
  }, []);

  useEffect(() => {
    if (selectedOrcamento?.id) {
      fetchOrcamentoItems(selectedOrcamento.id);
    } else {
      setRawItems([]);
    }
  }, [selectedOrcamento?.id]);

  const fetchOrcamentos = async () => {
    setLoadingOrcamentos(true);
    try {
      const { data, error } = await supabase
        .schema('engenharia')
        .from('orcamentos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrcamentos(data || []);

      const urlParams = new URLSearchParams(window.location.search);
      const urlOrcId = urlParams.get('id') || urlParams.get('orcamentoId');

      if (urlOrcId && data) {
        const match = data.find(o => o.id === urlOrcId);
        if (match) {
          setSelectedOrcamento(match);
        } else if (data.length > 0) {
          setSelectedOrcamento(data[0]);
        }
      } else if (data && data.length > 0 && !selectedOrcamento) {
        setSelectedOrcamento(data[0]);
      }
    } catch (err) {
      console.error('Erro ao carregar orçamentos:', err);
    } finally {
      setLoadingOrcamentos(false);
    }
  };

  const fetchOrcamentoItems = async (orcamentoId: string) => {
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .schema('engenharia')
        .from('orcamento_itens')
        .select('*')
        .eq('orcamento_id', orcamentoId);

      if (error) throw error;
      setRawItems(data || []);
    } catch (err) {
      console.error('Erro ao carregar itens do orçamento:', err);
    } finally {
      setLoadingItems(false);
    }
  };

  // Fator de BDI do orçamento selecionado
  const bdiFactor = useMemo(() => {
    if (!selectedOrcamento) return 1;
    return 1 + 
      (selectedOrcamento.bdi_ac || 0) + 
      (selectedOrcamento.bdi_s || 0) + 
      (selectedOrcamento.bdi_g || 0) + 
      (selectedOrcamento.bdi_r || 0) + 
      (selectedOrcamento.bdi_df || 0) + 
      (selectedOrcamento.bdi_l || 0);
  }, [selectedOrcamento]);

  // Processa a Curva ABC ordenando em ordem decrescente de valor e acumulando %
  const abcResult = useMemo(() => {
    if (!rawItems || rawItems.length === 0) {
      return { 
        items: [] as ProcessedABCItem[], 
        totalGeral: 0, 
        stats: { 
          a: { count: 0, val: 0, perc: 0 }, 
          b: { count: 0, val: 0, perc: 0 }, 
          c: { count: 0, val: 0, perc: 0 } 
        } 
      };
    }

    // Identifica EAPs pais para distinguir resumos vs folhas
    const eapSet = new Set(rawItems.map(i => (i.item_eap || '').trim()).filter(Boolean));
    const parentEaps = new Set<string>();
    eapSet.forEach(eap => {
      const parts = eap.split('.');
      for (let i = 1; i < parts.length; i++) {
        parentEaps.add(parts.slice(0, i).join('.'));
      }
    });

    let candidateList: OrcamentoItem[] = [];

    if (nivelVisao === 'Insumo') {
      // Apenas itens folhas com valor positivo
      candidateList = rawItems.filter(i => {
        const eap = (i.item_eap || '').trim();
        const isParent = parentEaps.has(eap);
        const totalVal = (parseFloat(String(i.total || 0))) * bdiFactor;
        return !isParent && totalVal > 0;
      });
      if (candidateList.length === 0) {
        candidateList = rawItems.filter(i => (parseFloat(String(i.total || 0))) * bdiFactor > 0);
      }
    } else if (nivelVisao === 'Servico') {
      // Itens de composições ou nível intermediário de EAP
      candidateList = rawItems.filter(i => {
        const eap = (i.item_eap || '').trim();
        const parts = eap.split('.');
        const totalVal = (parseFloat(String(i.total || 0))) * bdiFactor;
        return totalVal > 0 && (parts.length >= 2 || i.composicao_id);
      });
      if (candidateList.length === 0) {
        candidateList = rawItems.filter(i => (parseFloat(String(i.total || 0))) * bdiFactor > 0);
      }
    } else {
      // Nível 1 de EAP (Pacotes principais)
      candidateList = rawItems.filter(i => {
        const eap = (i.item_eap || '').trim();
        const parts = eap.split('.');
        const totalVal = (parseFloat(String(i.total || 0))) * bdiFactor;
        return totalVal > 0 && parts.length === 1;
      });
      if (candidateList.length === 0) {
        candidateList = rawItems.filter(i => (parseFloat(String(i.total || 0))) * bdiFactor > 0);
      }
    }

    // --- CONSOLIDAÇÃO / AGRUPAMENTO DOS ITENS REPETIDOS (GROUP BY) ---
    const groupedMap = new Map<string, {
      firstItem: OrcamentoItem;
      codigo: string;
      descricao: string;
      unidade: string;
      totalQtd: number;
      totalMat: number;
      totalMo: number;
      totalVal: number;
      eaps: Set<string>;
      occurrencesCount: number;
    }>();

    candidateList.forEach(item => {
      const cod = (item.codigo || '').trim();
      const desc = (item.descricao || '').trim();
      
      let groupKey = '';
      if (nivelVisao === 'Pacote') {
        groupKey = (item.item_eap || '').split('.')[0] || desc.toUpperCase();
      } else {
        // Agrupa por Código se existir, ou por Descrição normalizada
        groupKey = cod ? cod.toUpperCase() : desc.toUpperCase();
      }

      const q = parseFloat(String(item.quantidade || 0));
      const totMat = parseFloat(String(item.total_mat || 0));
      const totMo = parseFloat(String(item.total_mo || 0));
      const tot = parseFloat(String(item.total || 0));

      if (groupedMap.has(groupKey)) {
        const existing = groupedMap.get(groupKey)!;
        existing.totalQtd += q;
        existing.totalMat += totMat;
        existing.totalMo += totMo;
        existing.totalVal += tot;
        existing.occurrencesCount += 1;
        if (item.item_eap) existing.eaps.add(item.item_eap);
      } else {
        const eaps = new Set<string>();
        if (item.item_eap) eaps.add(item.item_eap);
        groupedMap.set(groupKey, {
          firstItem: item,
          codigo: cod,
          descricao: desc,
          unidade: item.unidade || 'un',
          totalQtd: q,
          totalMat: totMat,
          totalMo: totMo,
          totalVal: tot,
          eaps,
          occurrencesCount: 1
        });
      }
    });

    // Converte os grupos consolidados em lista de OrcamentoItem
    const itemsWithVal: (OrcamentoItem & { valWithBdi: number })[] = [];
    groupedMap.forEach((grp, key) => {
      const eapArray = Array.from(grp.eaps);
      const eapLabel = grp.occurrencesCount > 1 
        ? `${eapArray.slice(0, 2).join(', ')}${eapArray.length > 2 ? '...' : ''}` 
        : (eapArray[0] || '');

      const unitPrice = grp.totalQtd > 0 ? (grp.totalVal / grp.totalQtd) : grp.firstItem.valor_unitario;

      itemsWithVal.push({
        id: `grouped-${key}-${grp.firstItem.id}`,
        orcamento_id: grp.firstItem.orcamento_id,
        item_eap: eapLabel,
        codigo: grp.codigo,
        banco_fonte: grp.firstItem.banco_fonte,
        descricao: grp.descricao,
        unidade: grp.unidade,
        quantidade: grp.totalQtd,
        valor_unitario: unitPrice,
        valor_unitario_com_bdi: unitPrice * bdiFactor,
        total: grp.totalVal,
        total_mat: grp.totalMat,
        total_mo: grp.totalMo,
        composicao_id: grp.firstItem.composicao_id,
        valWithBdi: grp.totalVal * bdiFactor
      });
    });

    // Ordenação decrescente por valor total (Curva S Pareto)
    itemsWithVal.sort((a, b) => b.valWithBdi - a.valWithBdi);

    const totalGeral = itemsWithVal.reduce((acc, curr) => acc + curr.valWithBdi, 0);

    if (totalGeral === 0) {
      return { 
        items: [] as ProcessedABCItem[], 
        totalGeral: 0, 
        stats: { 
          a: { count: 0, val: 0, perc: 0 }, 
          b: { count: 0, val: 0, perc: 0 }, 
          c: { count: 0, val: 0, perc: 0 } 
        } 
      };
    }

    let accumVal = 0;
    const stats = {
      a: { count: 0, val: 0, perc: 0 },
      b: { count: 0, val: 0, perc: 0 },
      c: { count: 0, val: 0, perc: 0 }
    };

    const processed: ProcessedABCItem[] = itemsWithVal.map((item, idx) => {
      accumVal += item.valWithBdi;
      const percTotal = (item.valWithBdi / totalGeral) * 100;
      const percAcumulado = (accumVal / totalGeral) * 100;

      const prevAccumPerc = ((accumVal - item.valWithBdi) / totalGeral) * 100;
      let classe: 'A' | 'B' | 'C' = 'C';
      if (prevAccumPerc < 80) {
        classe = 'A';
      } else if (prevAccumPerc < 95) {
        classe = 'B';
      } else {
        classe = 'C';
      }

      if (classe === 'A') {
        stats.a.count++;
        stats.a.val += item.valWithBdi;
      } else if (classe === 'B') {
        stats.b.count++;
        stats.b.val += item.valWithBdi;
      } else {
        stats.c.count++;
        stats.c.val += item.valWithBdi;
      }

      return {
        ...item,
        ranking: idx + 1,
        percTotal,
        percAcumulado,
        classe
      };
    });

    stats.a.perc = totalGeral > 0 ? (stats.a.val / totalGeral) * 100 : 0;
    stats.b.perc = totalGeral > 0 ? (stats.b.val / totalGeral) * 100 : 0;
    stats.c.perc = totalGeral > 0 ? (stats.c.val / totalGeral) * 100 : 0;

    return { items: processed, totalGeral, stats };
  }, [rawItems, bdiFactor, nivelVisao]);

  // Filtra itens da tabela por texto e por classe A/B/C
  const filteredItems = useMemo(() => {
    return abcResult.items.filter(item => {
      const matchesSearch = 
        !itemSearch ||
        item.descricao?.toLowerCase().includes(itemSearch.toLowerCase()) ||
        item.codigo?.toLowerCase().includes(itemSearch.toLowerCase()) ||
        item.item_eap?.toLowerCase().includes(itemSearch.toLowerCase());

      const matchesClasse = filterClasse === 'todos' || item.classe === filterClasse;

      return matchesSearch && matchesClasse;
    });
  }, [abcResult.items, itemSearch, filterClasse]);

  // Resumo da seleção múltipla (declarado após abcResult estar disponível)
  const selectionSummary = useMemo(() => {
    if (selectedItemIds.size === 0) return null;
    const selectedList = abcResult.items.filter(i => selectedItemIds.has(i.id));
    const totalVal = selectedList.reduce((acc, i) => acc + i.valWithBdi, 0);
    const totalPerc = abcResult.totalGeral > 0 ? (totalVal / abcResult.totalGeral) * 100 : 0;
    const byClasse = { A: 0, B: 0, C: 0 };
    selectedList.forEach(i => { byClasse[i.classe]++; });
    return { count: selectedItemIds.size, totalVal, totalPerc, byClasse };
  }, [selectedItemIds, abcResult]);

  // Exportar Excel
  const handleExportXLSX = () => {
    if (!selectedOrcamento || abcResult.items.length === 0) {
      alert('Selecione um orçamento com itens válidos para exportar.');
      return;
    }

    const dataToExport = abcResult.items.map(item => ({
      'Ranking': item.ranking,
      'Classe ABC': item.classe,
      'EAP': item.item_eap || '',
      'Código': item.codigo || '',
      'Descrição': item.descricao,
      'Unidade': item.unidade,
      'Quantidade': item.quantidade,
      'Valor Unitário (R$)': item.valor_unitario_com_bdi || item.valor_unitario * bdiFactor,
      'Valor Total (R$)': item.valWithBdi,
      '% do Total': Number(item.percTotal.toFixed(2)),
      '% Acumulado (Curva S)': Number(item.percAcumulado.toFixed(2))
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Curva ABC - ${nivelVisao}`);

    const fileName = `Curva_ABC_${(selectedOrcamento.codigo || 'Orcamento').replace(/[^a-zA-Z0-9.-]/g, '_')}_${nivelVisao}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Formatador resumido de moeda para o eixo Y (ex: R$ 50M, R$ 500k)
  const formatShortCurrency = (val: number) => {
    if (val >= 1_000_000_000) return `R$ ${(val / 1_000_000_000).toFixed(1)}B`;
    if (val >= 1_000_000) return `R$ ${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `R$ ${(val / 1_000).toFixed(0)}k`;
    return `R$ ${val.toFixed(0)}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Bar Header com Seletor de Orçamento */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        
        {/* Título & Seletor de Orçamento em Dropdown Elegante */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Curva ABC</h2>
            <p className="text-slate-500 text-xs mt-0.5">Análise de impacto financeiro e gráfico da Curva S Pareto</p>
          </div>

          {/* Seletor de Orçamento com Campo de Pesquisa Autocomplete */}
          <div className="relative w-full sm:w-96" ref={dropdownRef}>
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-blue-600 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={orcamentoSearchQuery}
                onFocus={() => setIsOrcamentoDropdownOpen(true)}
                onChange={(e) => {
                  setOrcamentoSearchQuery(e.target.value);
                  setIsOrcamentoDropdownOpen(true);
                }}
                placeholder="Pesquisar orçamento por código, nome ou cliente..."
                className="w-full pl-9 pr-16 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all shadow-2xs"
              />
              <div className="absolute right-2.5 flex items-center gap-1">
                {orcamentoSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setOrcamentoSearchQuery('');
                      setIsOrcamentoDropdownOpen(true);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
                    title="Limpar pesquisa"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOrcamentoDropdownOpen(!isOrcamentoDropdownOpen)}
                  className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <ChevronDown className={clsx("w-4 h-4 transition-transform", isOrcamentoDropdownOpen && "rotate-180")} />
                </button>
              </div>
            </div>

            {/* Dropdown de Resultados Filtrados em Tempo Real */}
            {isOrcamentoDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-72 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
                {loadingOrcamentos ? (
                  <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                    <span>Carregando orçamentos...</span>
                  </div>
                ) : filteredOrcamentosList.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Nenhum orçamento encontrado com o termo "{orcamentoSearchQuery}"
                  </div>
                ) : (
                  filteredOrcamentosList.map((orc) => {
                    const isSelected = selectedOrcamento?.id === orc.id;
                    return (
                      <button
                        key={orc.id}
                        type="button"
                        onClick={() => {
                          setSelectedOrcamento(orc);
                          setIsOrcamentoDropdownOpen(false);
                        }}
                        className={clsx(
                          "w-full text-left px-3.5 py-2.5 text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer hover:bg-blue-50/70",
                          isSelected ? "bg-blue-50/90 font-bold text-blue-900" : "text-slate-700"
                        )}
                      >
                        <div className="flex flex-col gap-0.5 truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[11px] border border-blue-100">
                              [{orc.codigo}]
                            </span>
                            <span className="font-semibold text-slate-900 truncate">
                              {orc.nome || orc.projeto || 'Sem título'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 truncate">
                            Cliente: <strong className="text-slate-600 font-semibold">{orc.cliente || 'Não informado'}</strong>
                          </span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Detalhes do Orçamento Selecionado & Exportar Button */}
        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          {selectedOrcamento && (
            <div className="flex items-center gap-3 text-xs">
              <div className="hidden sm:block text-slate-500">
                Cliente: <strong className="text-slate-700 font-bold">{selectedOrcamento.cliente || 'Não informado'}</strong>
              </div>
              <div className="hidden md:block text-slate-500">
                Gestor: <span className="text-slate-700">{selectedOrcamento.gestor_cliente || 'N/A'}</span>
              </div>
              <div>
                {renderStatusBadge(selectedOrcamento)}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if (selectedOrcamento?.id) {
                  fetchOrcamentoItems(selectedOrcamento.id);
                }
              }}
              disabled={!selectedOrcamento || loadingItems}
              className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold px-3 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-2xs transition-all cursor-pointer shrink-0 disabled:opacity-50"
              title="Recarregar dados atualizados do orçamento"
            >
              <RefreshCw className={clsx("w-4 h-4 text-blue-600", loadingItems && "animate-spin")} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            <button 
              onClick={handleExportXLSX}
              disabled={!selectedOrcamento || abcResult.items.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Exportar XLSX</span>
            </button>
          </div>
        </div>
      </div>

      {/* PAINEL PRINCIPAL DE ANÁLISE (LARGURA TOTAL 100%) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-6">
        
        {/* BARRA DE FILTROS ESPAÇOSA E BEM ORGANIZADA */}
        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Seletor de Nível de Visão */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider hidden sm:inline">Visão:</span>
              <div className="flex bg-slate-200/70 p-1 rounded-xl">
                {(['Pacote', 'Servico', 'Insumo'] as const).map(nivel => (
                  <button
                    key={nivel}
                    onClick={() => setNivelVisao(nivel)}
                    className={clsx(
                      "px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                      nivelVisao === nivel 
                        ? "bg-white text-blue-600 shadow-2xs" 
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {nivel === 'Pacote' && <Package className="w-4 h-4" />}
                    {nivel === 'Servico' && <Layers className="w-4 h-4" />}
                    {nivel === 'Insumo' && <FileSpreadsheet className="w-4 h-4" />}
                    <span>Por {nivel}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Filtro por Classe ABC */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider hidden sm:inline">Classe:</span>
              <div className="flex bg-slate-200/70 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setFilterClasse('todos')}
                  className={clsx("px-3.5 py-1.5 rounded-lg transition-all cursor-pointer", filterClasse === 'todos' ? "bg-white text-slate-800 shadow-2xs" : "text-slate-600")}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFilterClasse('A')}
                  className={clsx("px-3.5 py-1.5 rounded-lg transition-all cursor-pointer", filterClasse === 'A' ? "bg-blue-600 text-white shadow-2xs font-bold" : "text-blue-700 hover:text-blue-900")}
                >
                  Classe A
                </button>
                <button
                  onClick={() => setFilterClasse('B')}
                  className={clsx("px-3.5 py-1.5 rounded-lg transition-all cursor-pointer", filterClasse === 'B' ? "bg-emerald-600 text-white shadow-2xs font-bold" : "text-emerald-700 hover:text-emerald-900")}
                >
                  Classe B
                </button>
                <button
                  onClick={() => setFilterClasse('C')}
                  className={clsx("px-3.5 py-1.5 rounded-lg transition-all cursor-pointer", filterClasse === 'C' ? "bg-slate-600 text-white shadow-2xs font-bold" : "text-slate-700 hover:text-slate-900")}
                >
                  Classe C
                </button>
              </div>
            </div>
          </div>

          {/* Busca de Item na Tabela */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrar tabela por descrição do item, código ou EAP..."
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-white rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-medium shadow-2xs"
            />
          </div>
        </div>

        {/* Cards de Resumo das Faixas ABC */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Faixa A (Azul) */}
          <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/40 relative overflow-hidden space-y-2.5 shadow-2xs">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase text-blue-700 tracking-wider">Faixa A (Até 80%)</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                {abcResult.stats.a.count} {abcResult.stats.a.count === 1 ? 'item' : 'itens'}
              </span>
            </div>
            <div className="text-xl lg:text-2xl font-extrabold text-blue-900 tabular-nums truncate" title={abcResult.stats.a.val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}>
              {abcResult.stats.a.val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-blue-700">
                <span>Impacto no Orçamento:</span>
                <span>{abcResult.stats.a.perc.toFixed(1)}%</span>
              </div>
              <div className="h-2.5 w-full bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${Math.min(abcResult.stats.a.perc, 100)}%` }} />
              </div>
            </div>
          </div>

          {/* Faixa B (Verde/Esmeralda) */}
          <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 relative overflow-hidden space-y-2.5 shadow-2xs">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase text-emerald-700 tracking-wider">Faixa B (80% a 95%)</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {abcResult.stats.b.count} {abcResult.stats.b.count === 1 ? 'item' : 'itens'}
              </span>
            </div>
            <div className="text-xl lg:text-2xl font-extrabold text-emerald-900 tabular-nums truncate" title={abcResult.stats.b.val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}>
              {abcResult.stats.b.val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-emerald-700">
                <span>Impacto no Orçamento:</span>
                <span>{abcResult.stats.b.perc.toFixed(1)}%</span>
              </div>
              <div className="h-2.5 w-full bg-emerald-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full transition-all duration-300" style={{ width: `${Math.min(abcResult.stats.b.perc, 100)}%` }} />
              </div>
            </div>
          </div>

          {/* Faixa C (Cinza Neutral / Slate) */}
          <div className="p-5 rounded-2xl border border-slate-300 bg-slate-100/60 relative overflow-hidden space-y-2.5 shadow-2xs">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase text-slate-700 tracking-wider">Faixa C (95% a 100%)</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 border border-slate-300">
                {abcResult.stats.c.count} {abcResult.stats.c.count === 1 ? 'item' : 'itens'}
              </span>
            </div>
            <div className="text-xl lg:text-2xl font-extrabold text-slate-900 tabular-nums truncate" title={abcResult.stats.c.val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}>
              {abcResult.stats.c.val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Impacto no Orçamento:</span>
                <span>{abcResult.stats.c.perc.toFixed(1)}%</span>
              </div>
              <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-slate-500 rounded-full transition-all duration-300" style={{ width: `${Math.min(abcResult.stats.c.perc, 100)}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* GRÁFICO PROFISSIONAL DA CURVA ABC / PARETO (INTERATIVO COM TOOLTIPS E AZUL PARA FAIXA A) */}
        {loadingItems ? (
          <div className="py-16 text-center text-slate-400 font-medium">Processando Curva ABC...</div>
        ) : abcResult.items.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm relative">
            
            {/* Topo: Título, Legendas e Seletor de Densidade */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  Curva ABC (Pareto) - {selectedOrcamento?.nome || selectedOrcamento?.projeto}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-5 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-blue-600 inline-block shadow-2xs" />
                    <span>Faixa A (Principal)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-amber-400 inline-block shadow-2xs" />
                    <span>Faixa B</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-slate-500 inline-block shadow-2xs" />
                    <span>Faixa C</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-1 bg-teal-600 rounded inline-block" />
                    <span>Curva S %</span>
                  </div>
                </div>

                {/* Seletor de Itens Exibidos no Gráfico */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs border border-slate-200">
                  <span className="text-slate-500 pl-1 text-[11px]">Exibir:</span>
                  <button
                    onClick={() => setChartLimit(10)}
                    className={clsx("px-2.5 py-0.5 rounded-lg cursor-pointer transition-all", chartLimit === 10 ? "bg-white text-blue-700 font-bold shadow-2xs" : "text-slate-600")}
                  >
                    Top 10
                  </button>
                  <button
                    onClick={() => setChartLimit(15)}
                    className={clsx("px-2.5 py-0.5 rounded-lg cursor-pointer transition-all", chartLimit === 15 ? "bg-white text-blue-700 font-bold shadow-2xs" : "text-slate-600")}
                  >
                    Top 15
                  </button>
                  <button
                    onClick={() => setChartLimit(30)}
                    className={clsx("px-2.5 py-0.5 rounded-lg cursor-pointer transition-all", chartLimit === 30 ? "bg-white text-blue-700 font-bold shadow-2xs" : "text-slate-600")}
                  >
                    Top 30
                  </button>
                </div>
              </div>
            </div>

            {/* ÁREA DO GRÁFICO COM EIXOS Y ESQUERDO (R$), Y DIREITO (%) E INTERAÇÃO HOVER */}
            {(() => {
              const chartItems = abcResult.items.slice(0, chartLimit);
              const count = chartItems.length;
              const maxVal = Math.max(...chartItems.map(i => i.valWithBdi), 1);
              const yTicks = [1.0, 0.75, 0.50, 0.25, 0.0];

              return (
                <div className="space-y-2 pt-2">
                  
                  {/* Container Principal */}
                  <div className="flex items-stretch h-72 sm:h-80 relative">
                    
                    {/* EIXO Y ESQUERDO (Valores R$) */}
                    <div className="w-16 sm:w-20 flex flex-col justify-between items-end pr-2 text-[10px] font-mono font-semibold text-slate-400 py-1 shrink-0 select-none">
                      {yTicks.map((tickRatio, i) => (
                        <span key={i}>{formatShortCurrency(maxVal * tickRatio)}</span>
                      ))}
                    </div>

                    {/* ÁREA DO GRÁFICO */}
                    <div className="flex-1 relative border-l border-r border-slate-200 overflow-visible">
                      
                      {/* Grid Lines Horizontais */}
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none py-1 z-0">
                        {yTicks.map((_, i) => (
                          <div key={i} className="border-b border-slate-100 w-full" />
                        ))}
                      </div>

                      {/* Linha Tracejada 80% (Faixa A) */}
                      <div 
                        className="absolute left-0 right-0 border-b border-dashed border-blue-500 z-10 flex justify-end pr-2 pointer-events-none"
                        style={{ top: `${100 - 80}%` }}
                      >
                        <span className="text-[9px] font-bold text-blue-600 bg-blue-50/90 px-1.5 py-0.5 rounded border border-blue-200 -mt-2.5">
                          80% (Faixa A)
                        </span>
                      </div>

                      {/* Linha Tracejada 95% (Faixa B) */}
                      <div 
                        className="absolute left-0 right-0 border-b border-dashed border-emerald-500 z-10 flex justify-end pr-2 pointer-events-none"
                        style={{ top: `${100 - 95}%` }}
                      >
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50/90 px-1.5 py-0.5 rounded border border-emerald-200 -mt-2.5">
                          95% (Faixa B)
                        </span>
                      </div>

                      {/* LINHA CONTÍNUA SVG (Camada visual pointer-events-none z-10) */}
                      <svg className="w-full h-full overflow-visible absolute inset-0 pointer-events-none z-10" viewBox="0 0 1000 300" preserveAspectRatio="none">
                        <polyline
                          fill="none"
                          stroke="#0d9488"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={chartItems.map((item, idx) => {
                            const x = ((idx + 0.5) / count) * 1000;
                            const y = 300 - (item.percAcumulado / 100) * 300;
                            return `${x},${y}`;
                          }).join(' ')}
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>

                      {/* COLUNAS INTERATIVAS (Camada de evento z-30 pointer-events-auto) */}
                      <div className="absolute inset-0 flex items-end justify-around px-1 z-30">
                        {chartItems.map((item, idx) => {
                          const barHeight = Math.max((item.valWithBdi / maxVal) * 100, 4);
                          const isHovered = hoveredChartIndex === idx;
                          const isTableSelected = selectedItemIds.has(item.id);

                          // Faixa A = Azul (bg-blue-600), Faixa B = Amarelo (bg-amber-400), Faixa C = Cinza (bg-slate-400)
                          const barColor = item.classe === 'A' ? 'bg-blue-600 hover:bg-blue-700' : item.classe === 'B' ? 'bg-amber-400 hover:bg-amber-500' : 'bg-slate-400 hover:bg-slate-500';

                          const yDotPerc = 100 - item.percAcumulado;

                          return (
                            <div 
                              key={item.id}
                              style={{ width: `${Math.min(80 / count, 8)}%`, maxWidth: '80px' }}
                              className="h-full flex flex-col justify-end items-center group/column relative cursor-pointer pointer-events-auto"
                              onMouseEnter={() => setHoveredChartIndex(idx)}
                              onMouseLeave={() => setHoveredChartIndex(null)}
                              onClick={(e) => handleItemClick(item.id, e)}
                            >
                              {/* PONTO REDONDO NA CURVA S */}
                              <div
                                style={{ top: `${yDotPerc}%` }}
                                className={clsx(
                                  "w-3 h-3 rounded-full absolute top-0 -translate-y-1/2 transition-transform shadow-xs border-2 border-white pointer-events-none",
                                  isHovered ? "bg-teal-500 scale-150 ring-2 ring-teal-400" : "bg-teal-600"
                                )}
                              />

                              {/* BARRA VERTICAL */}
                              <div 
                                className={clsx(
                                  "w-full rounded-t-sm transition-all duration-150 shadow-2xs flex flex-col justify-end items-center pb-1 text-[10px] font-black text-white select-none",
                                  barColor,
                                  isHovered && "ring-2 ring-teal-400 brightness-110 scale-y-102",
                                  isTableSelected && "ring-2 ring-yellow-400 ring-offset-1"
                                )}
                                style={{ height: `${barHeight}%` }}
                              >
                                {barHeight > 8 && (
                                  <span>{item.classe}</span>
                                )}
                              </div>

                              {/* TOOLTIP INTERATIVO E EM DESTAQUE NO HOVER */}
                              {isHovered && (
                                <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-[11px] p-3.5 rounded-xl shadow-2xl w-64 pointer-events-none space-y-1.5 border border-slate-700 animate-in fade-in zoom-in-95 duration-150">
                                  <div className="font-bold text-blue-300 truncate pb-1 border-b border-slate-800 flex items-center justify-between gap-1">
                                    <span className="truncate">#{item.ranking} {item.descricao}</span>
                                    <span className="text-[9px] font-mono text-slate-400 shrink-0">{item.item_eap}</span>
                                  </div>
                                  <div className="flex justify-between text-slate-300">
                                    <span>Classe:</span>
                                    <span className={clsx("font-extrabold px-2 py-0.2 rounded text-[10px]", item.classe === 'A' ? "bg-blue-950 text-blue-300" : item.classe === 'B' ? "bg-amber-950 text-amber-300" : "bg-slate-800 text-slate-300")}>
                                      Faixa {item.classe}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-slate-300">
                                    <span>Valor Total:</span>
                                    <span className="font-mono font-bold text-white">{item.valWithBdi.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                  </div>
                                  <div className="flex justify-between text-slate-300">
                                    <span>% Individual:</span>
                                    <span className="font-bold text-emerald-400">{item.percTotal.toFixed(2)}%</span>
                                  </div>
                                  <div className="flex justify-between text-slate-300">
                                    <span>% Acumulado (Curva S):</span>
                                    <span className="font-bold text-teal-300">{item.percAcumulado.toFixed(2)}%</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                    </div>

                    {/* EIXO Y DIREITO (% Acumulado 0% a 100%) */}
                    <div className="w-12 sm:w-14 flex flex-col justify-between items-start pl-2 text-[10px] font-mono font-semibold text-teal-600 py-1 shrink-0 select-none">
                      <span>100,0%</span>
                      <span>75,0%</span>
                      <span>50,0%</span>
                      <span>25,0%</span>
                      <span>0,0%</span>
                    </div>

                  </div>

                  {/* EIXO X (Rótulos dos Itens na Base do Gráfico) */}
                  <div className="flex justify-around pl-16 sm:pl-20 pr-12 sm:pr-14 text-[9.5px] font-medium text-slate-500 pt-1">
                    {chartItems.map((item, idx) => (
                      <div 
                        key={item.id}
                        style={{ width: `${Math.min(80 / count, 8)}%`, maxWidth: '80px' }}
                        className={clsx(
                          "text-center truncate cursor-pointer transition-colors",
                          hoveredChartIndex === idx ? "text-blue-600 font-bold" : "hover:text-slate-800"
                        )}
                        onClick={(e) => handleItemClick(item.id, e)}
                        onMouseEnter={() => setHoveredChartIndex(idx)}
                        onMouseLeave={() => setHoveredChartIndex(null)}
                        title={`#${item.ranking} ${item.descricao}`}
                      >
                        <span className="truncate block font-mono text-[9px] font-bold text-slate-400">{item.item_eap || `#${item.ranking}`}</span>
                        <span className="truncate block hidden sm:block">{item.descricao}</span>
                      </div>
                    ))}
                  </div>

                </div>
              );
            })()}

          </div>
        )}

        {/* Barra de Resumo da Seleção Múltipla */}
        {selectionSummary && (
          <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-semibold border border-blue-600">
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-white/20 text-white px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-blue-200" />
                {selectionSummary.count} {selectionSummary.count === 1 ? 'item selecionado' : 'itens selecionados'}
              </span>
              <span className="text-blue-100">
                Valor Total: <strong className="font-mono text-white">{selectionSummary.totalVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
              </span>
              <span className="text-blue-200 font-normal">
                ({selectionSummary.totalPerc.toFixed(2)}% do orçamento)
              </span>
              <div className="flex items-center gap-2 text-[11px]">
                {selectionSummary.byClasse.A > 0 && (
                  <span className="bg-blue-500/40 text-blue-100 px-2 py-0.5 rounded-md border border-blue-400/50 font-bold">
                    A: {selectionSummary.byClasse.A}
                  </span>
                )}
                {selectionSummary.byClasse.B > 0 && (
                  <span className="bg-amber-500/40 text-amber-100 px-2 py-0.5 rounded-md border border-amber-400/50 font-bold">
                    B: {selectionSummary.byClasse.B}
                  </span>
                )}
                {selectionSummary.byClasse.C > 0 && (
                  <span className="bg-slate-500/40 text-slate-100 px-2 py-0.5 rounded-md border border-slate-400/50 font-bold">
                    C: {selectionSummary.byClasse.C}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-blue-300 text-[11px] font-normal hidden sm:block">Shift+Click ou Ctrl+Click para seleção múltipla</span>
              <button 
                onClick={() => setSelectedItemIds(new Set())}
                className="bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 border border-white/20"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            </div>
          </div>
        )}

        {/* Tabela de Dados Curva ABC */}
        {loadingItems ? (
          <div className="py-12 text-center text-slate-400 font-medium">Carregando itens...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-medium">
            {!selectedOrcamento ? 'Nenhum orçamento selecionado.' : 'Nenhum item encontrado para esta visualização ou filtro.'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-xs text-left border-collapse select-none">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-3 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={selectedItemIds.size === filteredItems.length && filteredItems.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItemIds(new Set(filteredItems.map(i => i.id)));
                        } else {
                          setSelectedItemIds(new Set());
                        }
                      }}
                      className="w-3.5 h-3.5 rounded cursor-pointer accent-blue-600"
                      title="Selecionar todos"
                    />
                  </th>
                  <th className="py-3.5 px-3 w-12 text-center">#</th>
                  <th className="py-3.5 px-3 w-16 text-center">Classe</th>
                  <th className="py-3.5 px-3 w-28">EAP / Cód</th>
                  <th className="py-3.5 px-4">Descrição do Item</th>
                  <th className="py-3.5 px-3 text-center w-16">Unid.</th>
                  <th className="py-3.5 px-3 text-right w-24">Qtd.</th>
                  <th className="py-3.5 px-3 text-right w-28">Valor Unit. (R$)</th>
                  <th className="py-3.5 px-3 text-right w-32">Valor Total (R$)</th>
                  <th className="py-3.5 px-3 text-right w-24">% do Total</th>
                  <th className="py-3.5 px-3 text-right w-28">% Acumulado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const valorUnit = item.valor_unitario_com_bdi || item.valor_unitario * bdiFactor;
                  const isSelected = selectedItemIds.has(item.id);
                  return (
                    <tr 
                      key={item.id}
                      onClick={(e) => handleItemClick(item.id, e)}
                      title={selectedItemIds.size > 0 ? 'Shift+Click para intervalo ou Ctrl+Click para seleção individual' : ''}
                      className={clsx(
                        "cursor-pointer transition-colors",
                        isSelected
                          ? "bg-blue-100 ring-1 ring-inset ring-blue-400"
                          : item.classe === 'A' ? "bg-blue-50/20 hover:bg-blue-50/60"
                          : item.classe === 'B' ? "bg-amber-50/20 hover:bg-amber-50/60"
                          : "hover:bg-slate-50 bg-white"
                      )}
                    >
                      {/* Checkbox de Seleção */}
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            setSelectedItemIds(prev => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(item.id);
                              else next.delete(item.id);
                              return next;
                            });
                          }}
                          className="w-3.5 h-3.5 rounded cursor-pointer accent-blue-600"
                        />
                      </td>

                      {/* Ranking */}
                      <td className="py-3 px-3 text-center font-bold text-slate-400 font-mono text-[11px]">
                        {item.ranking}º
                      </td>

                      {/* Badge de Classe ABC */}
                      <td className="py-3 px-3 text-center">
                        <span className={clsx(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-black border inline-block shadow-2xs",
                          item.classe === 'A' ? "bg-blue-50 text-blue-700 border-blue-300 font-bold" :
                          item.classe === 'B' ? "bg-amber-50 text-amber-800 border-amber-300 font-bold" :
                          "bg-slate-100 text-slate-700 border-slate-300 font-bold"
                        )}>
                          {item.classe}
                        </span>
                      </td>

                      {/* EAP / Código */}
                      <td className="py-3 px-3 font-mono text-[11px] font-semibold text-slate-600">
                        {item.item_eap || item.codigo || '-'}
                      </td>

                      {/* Descrição */}
                      <td className="py-3 px-4 font-semibold text-slate-800 text-xs">
                        {item.descricao}
                      </td>

                      {/* Unidade */}
                      <td className="py-3 px-3 text-center text-slate-500 font-medium">
                        {item.unidade || '-'}
                      </td>

                      {/* Quantidade */}
                      <td className="py-3 px-3 text-right font-medium text-slate-700 tabular-nums">
                        {Number(item.quantidade || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                      </td>

                      {/* Valor Unitário */}
                      <td className="py-3 px-3 text-right font-medium text-slate-700 tabular-nums">
                        {valorUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>

                      {/* Valor Total */}
                      <td className="py-3 px-3 text-right font-bold text-slate-900 tabular-nums">
                        {item.valWithBdi.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>

                      {/* % do Total */}
                      <td className="py-3 px-3 text-right font-bold text-slate-600 tabular-nums">
                        {item.percTotal.toFixed(2)}%
                      </td>

                      {/* % Acumulado (Curva S) */}
                      <td className="py-3 px-3 text-right font-bold text-teal-700 tabular-nums bg-teal-50/20">
                        {item.percAcumulado.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
