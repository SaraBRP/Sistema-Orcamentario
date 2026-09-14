import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, ChevronDown, ChevronRight, Search, CheckSquare, Square, 
  FileSpreadsheet, Check
} from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '../../lib/supabase';

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
}

export default function ListaMateriaisTab({ orcamentoId, itens }: ListaMateriaisTabProps) {
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<TipoInsumoGroup>>(new Set());
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [dbTiposMap, setDbTiposMap] = useState<Record<string, string>>({});
  const [loadingDbTipos, setLoadingDbTipos] = useState<boolean>(false);

  // 1. Extração dos insumos (folhas / sem filhos) e agregação de quantidades
  const rawInsumos = useMemo(() => {
    if (!itens || itens.length === 0) return [];

    // Identifica EAPs que possuem filhos na hierarquia
    const eapSet = new Set(itens.map(i => (i.item_eap || '').trim()).filter(Boolean));
    const parentEaps = new Set<string>();
    eapSet.forEach(eap => {
      const parts = eap.split('.');
      for (let i = 1; i < parts.length; i++) {
        parentEaps.add(parts.slice(0, i).join('.'));
      }
    });

    // Filtra apenas itens folha (que possuem código ou descrição preenchidos)
    return itens.filter(item => {
      const eap = (item.item_eap || '').trim();
      const isSecao = item.isSecao || item.is_secao || (!item.codigo && (!item.quantidade || item.quantidade === 0) && !item.unidade);
      const isParent = parentEaps.has(eap) || item.hasChildren || item.isSummary;
      const hasContent = Boolean((item.codigo && item.codigo.trim()) || (item.descricao && item.descricao.trim()));

      return hasContent && !isSecao && !isParent;
    });
  }, [itens]);

  // Carrega mapeamento de tipos da tabela `insumos` no Supabase para os códigos encontrados
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

  // Função auxiliar para classificar tipo do insumo
  const classifyTipoInsumo = (codigo?: string | null, descricao?: string | null): TipoInsumoGroup => {
    const codUpper = (codigo || '').trim().toUpperCase();
    const descUpper = (descricao || '').trim().toUpperCase();

    // 1. Consulta no mapa vindo do banco de dados
    if (codUpper && dbTiposMap[codUpper]) {
      const dbTipo = dbTiposMap[codUpper].toUpperCase();
      if (dbTipo.includes('EQUIP') || dbTipo.includes('MÁQUINA') || dbTipo.includes('MAQUINA')) return 'EQUIPAMENTOS';
      if (dbTipo.includes('MÃO') || dbTipo.includes('MAO') || dbTipo.includes('OBRA') || dbTipo.includes('SERVENTE') || dbTipo.includes('PEDREIRO')) return 'MÃO DE OBRA';
      if (dbTipo.includes('MATER') || dbTipo.includes('INSUMO')) return 'MATERIAL';
      if (dbTipo.includes('SERV') || dbTipo.includes('TERCEIR') || dbTipo.includes('OUTRO')) return 'OUTROS';
    }

    // 2. Prefixo de código
    if (codUpper.startsWith('MAT') || codUpper.startsWith('MAT.')) return 'MATERIAL';
    if (codUpper.startsWith('EQP') || codUpper.startsWith('EQP.') || codUpper.startsWith('EQ')) return 'EQUIPAMENTOS';
    if (codUpper.startsWith('MO') || codUpper.startsWith('MO.') || codUpper.startsWith('MOD')) return 'MÃO DE OBRA';
    if (codUpper.startsWith('SERV') || codUpper.startsWith('OUT')) return 'OUTROS';

    // 3. Palavras-chave na descrição
    if (descUpper.includes('EQUIPAMENTO') || descUpper.includes('MAQUINA') || descUpper.includes('VEICULO') || descUpper.includes('CAMINHAO') || descUpper.includes('BETONEIRA')) {
      return 'EQUIPAMENTOS';
    }
    if (descUpper.includes('MAO DE OBRA') || descUpper.includes('MÃO DE OBRA') || descUpper.includes('SERVENTE') || descUpper.includes('OPERADOR') || descUpper.includes('OFICIAL') || descUpper.includes('PEDREIRO') || descUpper.includes('CARPINTEIRO') || descUpper.includes('ARMADOR')) {
      return 'MÃO DE OBRA';
    }
    if (descUpper.includes('SERVIÇO DE TERCEIROS') || descUpper.includes('TAXA') || descUpper.includes('ENERGIA') || descUpper.includes('ALUGUEL')) {
      return 'OUTROS';
    }

    // Padrão: Material
    return 'MATERIAL';
  };

  // 2. Agrupa os insumos repetidos e soma suas quantidades
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
          itemCount: 1
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [rawInsumos, dbTiposMap]);

  // Inicializa a seleção de todos os itens por padrão quando a lista é carregada pela primeira vez
  useEffect(() => {
    if (aggregatedInsumos.length > 0 && selectedKeys.size === 0) {
      setSelectedKeys(new Set(aggregatedInsumos.map(i => i.key)));
    }
  }, [aggregatedInsumos]);

  // Filtra por termo de busca
  const filteredInsumos = useMemo(() => {
    if (!searchFilter.trim()) return aggregatedInsumos;
    const term = searchFilter.toLowerCase();
    return aggregatedInsumos.filter(item => 
      item.codigo.toLowerCase().includes(term) || 
      item.descricao.toLowerCase().includes(term) ||
      item.unidade.toLowerCase().includes(term)
    );
  }, [aggregatedInsumos, searchFilter]);

  // Agrupa por Tipo Insumo (MATERIAL, EQUIPAMENTOS, MÃO DE OBRA, OUTROS)
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

  // Handler de seleção individual
  const toggleSelect = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Handler de seleção do grupo mãe
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

  // Handler de seleção global (Selecionar Todos / Desmarcar Todos)
  const toggleSelectAllGlobal = () => {
    if (selectedKeys.size === filteredInsumos.length && filteredInsumos.length > 0) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(filteredInsumos.map(i => i.key)));
    }
  };

  // Handler de colapso de grupo
  const toggleGroupCollapse = (tipo: TipoInsumoGroup) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(tipo)) {
        next.delete(tipo);
      } else {
        next.add(tipo);
      }
      return next;
    });
  };

  const totalSelected = selectedKeys.size;
  const isAllGlobalSelected = filteredInsumos.length > 0 && totalSelected === filteredInsumos.length;

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
            onClick={() => {
              alert(`Lista de Materiais com ${totalSelected} itens selecionados.`);
            }}
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

      {/* ── Conteúdo da Tabela ────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto min-h-0 bg-white">
        <table className="w-full border-collapse text-left">
          {/* Header da Tabela */}
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
                    {/* Linha Mãe do Grupo (TIPO MATERIAL / EQUIPAMENTOS / MÃO DE OBRA) */}
                    <tr className="bg-slate-200/90 font-bold border-t border-b border-slate-300 text-slate-800 hover:bg-slate-200 transition-colors select-none">
                      {/* Coluna SELEÇÃO: mostra "TIPO" + Checkbox de grupo + Toggle colapso */}
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

                      {/* Coluna CÓDIGO: Nome do Tipo */}
                      <td className="py-2.5 px-4 border-r border-slate-300 font-extrabold uppercase text-slate-800 tracking-wider">
                        {tipo}
                      </td>

                      {/* Coluna DESCRIÇÃO */}
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

                      {/* Coluna QUANTIDADE */}
                      <td className="py-2.5 px-4 border-r border-slate-300 text-right">
                        {/* Vazio na mãe como no layout de referência */}
                      </td>

                      {/* Coluna UNIDADE */}
                      <td className="py-2.5 px-4 text-center">
                        {/* Vazio na mãe como no layout de referência */}
                      </td>
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
                          {/* Coluna SELEÇÃO */}
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

                          {/* Coluna CÓDIGO */}
                          <td className="py-2 px-4 border-r border-slate-200 font-mono font-semibold text-slate-800">
                            {item.codigo}
                          </td>

                          {/* Coluna DESCRIÇÃO */}
                          <td className="py-2 px-4 border-r border-slate-200 text-slate-800 font-medium">
                            {item.descricao}
                          </td>

                          {/* Coluna QUANTIDADE */}
                          <td className="py-2 px-4 border-r border-slate-200 text-right font-semibold text-slate-800 tabular-nums">
                            {item.quantidadeTotal.toLocaleString('pt-BR', { 
                              minimumFractionDigits: 0, 
                              maximumFractionDigits: 4 
                            })}
                          </td>

                          {/* Coluna UNIDADE */}
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
