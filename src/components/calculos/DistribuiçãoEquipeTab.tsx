import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, ChevronDown, ChevronRight, 
  Search, HardHat
} from 'lucide-react';

type OrcamentoItem = {
  id: string;
  item_eap: string;
  codigo?: string | null;
  banco_fonte?: string | null;
  descricao: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_unitario_mat: number;
  valor_unitario_mo: number;
  total: number;
  total_mat: number;
  total_mo: number;
  composicao_id?: string | null;
  isSummary?: boolean;
  isSecao?: boolean;
  is_secao?: boolean;
  hasChildren?: boolean;
  displayQuantidade?: number;
};

interface DistribuiçãoEquipeTabProps {
  orcamentoId?: string;
  itens: OrcamentoItem[];
  duracoesMap?: Record<string, string>;
  jornadasMap?: Record<string, string>;
  onChangeEquipeConfig?: (duracoes: Record<string, string>, jornadas: Record<string, string>) => void;
}

export default function DistribuiçãoEquipeTab({ 
  orcamentoId, 
  itens, 
  duracoesMap: externalDuracoes, 
  jornadasMap: externalJornadas,
  onChangeEquipeConfig 
}: DistribuiçãoEquipeTabProps) {
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Mapeamento id da composição -> duração em dias
  const [duracoesMap, setDuracoesMap] = useState<Record<string, string>>(() => {
    if (externalDuracoes && Object.keys(externalDuracoes).length > 0) return externalDuracoes;
    if (orcamentoId) {
      try {
        const saved = localStorage.getItem(`orcamento_equipe_${orcamentoId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed.duracoes || {};
        }
      } catch (e) {}
    }
    return {};
  });

  // Mapeamento id da composição -> carga horária diária
  const [jornadasMap, setJornadasMap] = useState<Record<string, string>>(() => {
    if (externalJornadas && Object.keys(externalJornadas).length > 0) return externalJornadas;
    if (orcamentoId) {
      try {
        const saved = localStorage.getItem(`orcamento_equipe_${orcamentoId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed.jornadas || {};
        }
      } catch (e) {}
    }
    return {};
  });

  useEffect(() => {
    if (externalDuracoes && Object.keys(externalDuracoes).length > 0) {
      setDuracoesMap(externalDuracoes);
    }
  }, [externalDuracoes]);

  useEffect(() => {
    if (externalJornadas && Object.keys(externalJornadas).length > 0) {
      setJornadasMap(externalJornadas);
    }
  }, [externalJornadas]);

  const persistConfig = (newDuracoes: Record<string, string>, newJornadas: Record<string, string>) => {
    if (orcamentoId) {
      try {
        localStorage.setItem(`orcamento_equipe_${orcamentoId}`, JSON.stringify({
          duracoes: newDuracoes,
          jornadas: newJornadas
        }));
      } catch (e) {}
    }
    if (onChangeEquipeConfig) {
      onChangeEquipeConfig(newDuracoes, newJornadas);
    }
  };

  const handleDuracaoChange = (compId: string, val: string) => {
    const nextDuracoes = { ...duracoesMap, [compId]: val };
    setDuracoesMap(nextDuracoes);
    persistConfig(nextDuracoes, jornadasMap);
  };

  const handleJornadaChange = (compId: string, val: string) => {
    let finalVal = val;
    if (val !== '') {
      const num = parseFloat(val);
      if (!isNaN(num) && num > 24) {
        finalVal = '24';
      }
    }
    const nextJornadas = { ...jornadasMap, [compId]: finalVal };
    setJornadasMap(nextJornadas);
    persistConfig(duracoesMap, nextJornadas);
  };

  const toggleSection = (sectionEap: string) => {
    setCollapsedSections(prev => {
      const copy = new Set(prev);
      if (copy.has(sectionEap)) copy.delete(sectionEap);
      else copy.add(sectionEap);
      return copy;
    });
  };

  // --- HIERARQUIA E FILTRAGEM ESTRITA DE MÃO DE OBRA (CÓDIGO MO) ---
  const structuredData = useMemo(() => {
    // Função para verificar se o item é estritamente Mão de Obra
    const isMaoDeObra = (item: OrcamentoItem) => {
      const cod = (item.codigo || '').trim().toLowerCase();
      // Verificação principal: código iniciado por 'mo' (ex: mo.010, mo.015, mo.055)
      if (cod.startsWith('mo.') || cod.startsWith('mo') || cod.includes('mo.')) return true;

      // Verificação secundária por banco/unidade
      const fonte = (item.banco_fonte || '').trim().toUpperCase();
      if (fonte.includes('MO') || fonte.includes('MÃO DE OBRA')) return true;

      const un = (item.unidade || '').trim().toLowerCase();
      if ((un === 'h' || un === 'hs' || un === 'hr' || un === 'hrs') && item.valor_unitario_mo > 0) return true;

      return false;
    };

    // Helper para obter a EAP do pai direto (ex: "2.1.3.1" -> "2.1.3")
    const getDirectParentEap = (eap: string): string => {
      const parts = (eap || '').trim().split('.').filter(Boolean);
      if (parts.length <= 1) return '';
      return parts.slice(0, -1).join('.');
    };

    // Comparador EAP Numérico para ordenação natural ("1.1" < "1.1.2" < "1.2" < "1.2.2")
    const compareEap = (a: string, b: string) => {
      const partsA = (a || '').split('.').map(n => parseInt(n, 10) || 0);
      const partsB = (b || '').split('.').map(n => parseInt(n, 10) || 0);
      const maxLen = Math.max(partsA.length, partsB.length);
      for (let i = 0; i < maxLen; i++) {
        const valA = partsA[i] ?? 0;
        const valB = partsB[i] ?? 0;
        if (valA !== valB) return valA - valB;
      }
      return 0;
    };

    // Mapa EAP -> OrcamentoItem
    const eapMap = new Map<string, OrcamentoItem>();
    itens.forEach(i => {
      if (i.item_eap) eapMap.set(i.item_eap.trim(), i);
    });

    // Helper flexível para localizar item de seção no eapMap (trata equivalência entre "1" e "1.0")
    const findItemInMap = (targetEap: string): OrcamentoItem | undefined => {
      const trimmed = targetEap.trim();
      if (eapMap.has(trimmed)) return eapMap.get(trimmed);
      if (eapMap.has(trimmed + '.0')) return eapMap.get(trimmed + '.0');
      if (eapMap.has(trimmed.replace(/\.0$/, ''))) return eapMap.get(trimmed.replace(/\.0$/, ''));

      for (const [key, item] of eapMap.entries()) {
        if ((item.isSecao || item.is_secao || !item.unidade) && (key === trimmed || key.startsWith(trimmed + '.'))) {
          return item;
        }
      }
      return undefined;
    };

    // 1. Encontra a seção de cabeçalho correta para qualquer item da EAP
    const getSectionForItem = (itemEap: string): { eap: string; descricao: string } => {
      const parts = itemEap.trim().split('.').filter(Boolean);
      const rootNum = parts[0] || '1';

      if (parts.length <= 1) {
        const item = findItemInMap(rootNum);
        return {
          eap: rootNum,
          descricao: item?.descricao ? item.descricao : (rootItem => rootItem?.descricao || rootNum)(item)
        };
      }

      // Procura o ancestral mais próximo que seja marcado como SEÇÃO (isSecao === true)
      for (let len = parts.length - 1; len >= 1; len--) {
        const ancestorEap = parts.slice(0, len).join('.');
        const ancestorItem = findItemInMap(ancestorEap);
        if (ancestorItem && (ancestorItem.isSecao || ancestorItem.is_secao || !ancestorItem.unidade) && ancestorItem.descricao) {
          return {
            eap: ancestorEap,
            descricao: ancestorItem.descricao
          };
        }
      }

      // Se nenhum ancestral for isSecao, agrupa na Seção Raiz (ex: "1")
      const rootItem = findItemInMap(rootNum);
      return {
        eap: rootNum,
        descricao: rootItem?.descricao ? rootItem.descricao : rootNum
      };
    };

    // 2. Coleta todas as composições que têm insumos Mão de Obra diretos
    const compsWithLaborMap = new Map<string, {
      comp: OrcamentoItem;
      laborInsumos: Array<{ insumo: OrcamentoItem; totalHoras: number }>;
    }>();

    itens.forEach(item => {
      const itemEap = (item.item_eap || '').trim();
      if (!itemEap) return;

      const directLaborChildren = itens.filter(child => {
        const parentEap = getDirectParentEap(child.item_eap);
        return parentEap === itemEap && isMaoDeObra(child);
      });

      if (directLaborChildren.length > 0) {
        // Ordena insumos filhas por EAP
        directLaborChildren.sort((a, b) => compareEap(a.item_eap, b.item_eap));

        compsWithLaborMap.set(itemEap, {
          comp: item,
          laborInsumos: directLaborChildren.map(ins => ({
            insumo: ins,
            totalHoras: ins.displayQuantidade !== undefined ? ins.displayQuantidade : (ins.quantidade || 0)
          }))
        });
      }
    });

    // 3. Agrupa as composições por Seção Única
    const sectionsMap = new Map<string, {
      eap: string;
      descricao: string;
      compositions: Array<{
        comp: OrcamentoItem;
        laborInsumos: Array<{ insumo: OrcamentoItem; totalHoras: number }>;
      }>;
    }>();

    compsWithLaborMap.forEach(({ comp, laborInsumos }) => {
      const { eap: sectionEap, descricao: sectionDesc } = getSectionForItem(comp.item_eap);

      if (!sectionsMap.has(sectionEap)) {
        sectionsMap.set(sectionEap, {
          eap: sectionEap,
          descricao: sectionDesc,
          compositions: []
        });
      }

      sectionsMap.get(sectionEap)!.compositions.push({ comp, laborInsumos });
    });

    // 4. Ordena as seções por EAP e as composições de cada seção por EAP
    const result = Array.from(sectionsMap.values());
    result.sort((a, b) => compareEap(a.eap, b.eap));

    result.forEach(sec => {
      sec.compositions.sort((a, b) => compareEap(a.comp.item_eap, b.comp.item_eap));
    });

    return result;
  }, [itens]);

  // Filtragem por busca textual
  const filteredSections = useMemo(() => {
    if (!searchFilter.trim()) return structuredData;
    const term = searchFilter.toLowerCase();

    return structuredData.map(sec => {
      const matchSec = sec.descricao.toLowerCase().includes(term) || sec.eap.includes(term);
      const matchingComps = sec.compositions.filter(c => {
        const matchComp = c.comp.descricao.toLowerCase().includes(term) || (c.comp.codigo || '').toLowerCase().includes(term) || c.comp.item_eap.includes(term);
        const matchLabor = c.laborInsumos.some(l => l.insumo.descricao.toLowerCase().includes(term) || (l.insumo.codigo || '').toLowerCase().includes(term));
        return matchComp || matchLabor;
      });

      if (matchSec || matchingComps.length > 0) {
        return {
          ...sec,
          compositions: matchingComps
        };
      }
      return null;
    }).filter(Boolean) as typeof structuredData;
  }, [structuredData, searchFilter]);

  return (
    <div className="space-y-5">
      {/* Barra de Título & Filtro de Pesquisa */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Distribuição e Dimensionamento de Equipe</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Digite o prazo (dias, ex: 10 ou 10,5) e a jornada de trabalho (h/dia) para calcular a quantidade exata de colaboradores por função de mão de obra.
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por EAP, atividade ou insumo MO..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:bg-white shadow-2xs transition-colors"
          />
        </div>
      </div>

      {/* Tabela Principal */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs font-sans">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4 w-28 text-center border-r border-slate-200">ITEM EAP</th>
                <th className="py-3 px-4 min-w-[320px] border-r border-slate-200">SEÇÃO / ATIVIDADE / INSUMO MÃO DE OBRA (MO)</th>
                <th className="py-3 px-3 w-16 text-center border-r border-slate-200">UND.</th>
                <th className="py-3 px-4 w-32 text-right border-r border-slate-200">QTD / HORAS TOTAIS</th>
                <th className="py-3 px-3 w-36 text-center border-r border-slate-200 bg-blue-50/60">DURAÇÃO (DIAS)</th>
                <th className="py-3 px-3 w-36 text-center border-r border-slate-200 bg-purple-50/60">CARGA HORÁRIA</th>
                <th className="py-3 px-4 w-40 text-center border-r border-slate-200 bg-amber-50/40">HORAS DISPONÍVEIS</th>
                <th className="py-3 px-4 w-44 text-center bg-emerald-50/40">EQUIPE NECESSÁRIA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSections.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    Nenhum item de mão de obra (código MO) encontrado para as atividades.
                  </td>
                </tr>
              ) : (
                filteredSections.map((section) => {
                  const isCollapsed = collapsedSections.has(section.eap);

                  return (
                    <React.Fragment key={section.eap}>
                      {/* Linha de Seção (Tópico Ancestral) */}
                      <tr 
                        onClick={() => toggleSection(section.eap)}
                        className="bg-slate-100/90 hover:bg-slate-200/60 font-bold text-slate-800 cursor-pointer select-none transition-colors border-t border-b border-slate-300"
                      >
                        <td className="py-2.5 px-4 text-center font-mono border-r border-slate-200 text-blue-700 font-bold">
                          {section.eap}
                        </td>
                        <td colSpan={7} className="py-2.5 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-blue-600" />}
                              <span className="uppercase text-xs font-extrabold tracking-wide text-slate-800">{section.descricao}</span>
                            </div>
                            <span className="text-[10px] bg-white text-slate-600 px-2.5 py-0.5 rounded-full border border-slate-200 font-medium">
                              {section.compositions.length} {section.compositions.length === 1 ? 'Atividade' : 'Atividades'}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Composições Mães e seus Insumos MO Diretos */}
                      {!isCollapsed && section.compositions.map(({ comp, laborInsumos }) => {
                        const duracaoRaw = duracoesMap[comp.id] ?? '';
                        const jornadaRaw = jornadasMap[comp.id] ?? '';

                        const duracaoNum = parseFloat(duracaoRaw);
                        const jornadaNum = parseFloat(jornadaRaw);

                        const isValidDuracao = !isNaN(duracaoNum) && duracaoNum > 0;
                        const isValidJornada = !isNaN(jornadaNum) && jornadaNum > 0;

                        const horasDisponiveis = (isValidDuracao && isValidJornada) ? (duracaoNum * jornadaNum) : 0;
                        const compQtd = comp.displayQuantidade !== undefined ? comp.displayQuantidade : comp.quantidade;

                        return (
                          <React.Fragment key={comp.id}>
                            {/* Linha da Atividade / Composição Mãe (Texto Preto Normal) */}
                            <tr className="bg-white hover:bg-slate-50/80 border-b border-slate-200 text-slate-900 transition-colors">
                              <td className="py-2.5 px-4 text-center font-mono text-slate-900 font-semibold border-r border-slate-200 text-xs">
                                {comp.item_eap}
                              </td>
                              <td className="py-2.5 px-4 border-r border-slate-200">
                                <div className="flex items-center gap-2">
                                  {comp.codigo && (
                                    <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 font-medium">
                                      {comp.codigo}
                                    </span>
                                  )}
                                  <span className="text-slate-900 font-normal text-xs uppercase leading-snug">{comp.descricao}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-600 border-r border-slate-200 text-xs">
                                {comp.unidade}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-900 border-r border-slate-200 text-xs">
                                {compQtd.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                              </td>

                              {/* Input de Duração em Dias para a Atividade */}
                              <td className="py-1.5 px-2 text-center border-r border-slate-200 bg-blue-50/20">
                                <div className="flex items-center justify-center gap-1">
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0.5"
                                    placeholder="—"
                                    value={duracaoRaw}
                                    onChange={(e) => handleDuracaoChange(comp.id, e.target.value)}
                                    className="w-20 py-1 px-2 text-center bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 shadow-2xs placeholder-slate-300"
                                  />
                                  <span className="text-[10px] text-slate-500 font-normal">dias</span>
                                </div>
                              </td>

                              {/* Input de Jornada (h/dia) */}
                              <td className="py-1.5 px-2 text-center border-r border-slate-200 bg-purple-50/20">
                                <div className="flex items-center justify-center gap-1">
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="1"
                                    max="24"
                                    placeholder="—"
                                    value={jornadaRaw}
                                    onChange={(e) => handleJornadaChange(comp.id, e.target.value)}
                                    onBlur={(e) => {
                                      const val = e.target.value;
                                      if (val !== '') {
                                        let num = parseFloat(val);
                                        if (!isNaN(num)) {
                                          if (num < 1) num = 1;
                                          if (num > 24) num = 24;
                                          setJornadasMap(prev => ({ ...prev, [comp.id]: String(num) }));
                                        }
                                      }
                                    }}
                                    className="w-20 py-1 px-2 text-center bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 outline-none focus:border-purple-500 shadow-2xs placeholder-slate-300"
                                  />
                                  <span className="text-[10px] text-slate-500 font-normal">h/dia</span>
                                </div>
                              </td>

                              <td className="py-2.5 px-4 text-center font-mono font-medium border-r border-slate-200 bg-amber-50/20 text-xs">
                                {horasDisponiveis > 0 ? (
                                  <span className="text-slate-700 font-medium">{horasDisponiveis.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} h/pessoa</span>
                                ) : (
                                  <span className="text-slate-400 font-normal">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-4 text-center bg-emerald-50/10"></td>
                            </tr>

                            {/* Linhas Filhas Diretas: Insumos Mão de Obra (Texto Cinza Discreto) */}
                            {laborInsumos.map(({ insumo, totalHoras }) => {
                              const exatos = horasDisponiveis > 0 ? (totalHoras / horasDisponiveis) : 0;
                              const recomendados = totalHoras > 0 && horasDisponiveis > 0 ? Math.max(1, Math.ceil(exatos)) : 0;

                              return (
                                <tr key={insumo.id} className="bg-slate-50/40 hover:bg-slate-100/50 transition-colors text-slate-500 border-b border-slate-100">
                                  <td className="py-2 px-4 text-center font-mono text-[10.5px] text-slate-400 border-r border-slate-200">
                                    {insumo.item_eap}
                                  </td>
                                  <td className="py-2 px-6 border-r border-slate-200">
                                    <div className="flex items-center gap-2 pl-3">
                                      <span className="text-slate-300 font-normal text-xs">↳</span>
                                      {insumo.codigo && (
                                        <span className="text-[10px] font-mono bg-slate-100 text-slate-500 font-normal px-1.5 py-0.5 rounded border border-slate-200">
                                          {insumo.codigo}
                                        </span>
                                      )}
                                      <span className="font-normal text-slate-500 text-[11px] leading-snug">{insumo.descricao}</span>
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 text-center text-slate-400 text-[11px] border-r border-slate-200 uppercase">
                                    {insumo.unidade}
                                  </td>
                                  <td className="py-2 px-4 text-right font-mono font-normal text-slate-500 text-[11px] border-r border-slate-200">
                                    {totalHoras.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} h
                                  </td>
                                  <td className="py-2 px-3 text-center border-r border-slate-200 text-slate-400 text-[11px] font-normal">
                                    {isValidDuracao ? `${duracaoNum.toString().replace('.', ',')} dias` : '—'}
                                  </td>
                                  <td className="py-2 px-3 text-center border-r border-slate-200 text-slate-400 text-[11px] font-normal">
                                    {isValidJornada ? `${jornadaNum.toString().replace('.', ',')} h/dia` : '—'}
                                  </td>
                                  <td className="py-2 px-4 text-center font-mono text-slate-400 text-[11px] border-r border-slate-200">
                                    {horasDisponiveis > 0 ? `${horasDisponiveis.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} h/colaborador` : '—'}
                                  </td>

                                  {/* Quantidade de Colaboradores Limpa e Elegante */}
                                  <td className="py-2 px-4 text-center">
                                    {horasDisponiveis > 0 ? (
                                      <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700">
                                        <HardHat className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                        <span>{recomendados} {recomendados === 1 ? 'Colaborador' : 'Colaboradores'}</span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 font-normal text-xs">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
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
    </div>
  );
}

