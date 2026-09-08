import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Trash2, Eye, Calendar, Building2, User, MapPin, Rocket, 
  ChevronRight, ChevronDown, CornerDownRight
} from 'lucide-react';
import type { DadosComplementaresHeader, ItemMemoriaOficial } from '../../types/calculos';

export interface MemorialCalculoRecord {
  id: string;
  codigoOrcamento: string;
  nomeProjeto: string;
  cliente: string;
  gestorCliente: string;
  responsavel: string;
  cidade: string;
  estado: string;
  status: 'Em Edição' | 'Concluído' | 'Vinculado a Orçamento';
  dataAtualizacao: string;
  header: DadosComplementaresHeader;
  itens: ItemMemoriaOficial[];
  isOrcamentoNativo?: boolean;
  orcamentoId?: string;
  isImportado?: boolean;
  importadoId?: string;
}

interface Props {
  memoriais: MemorialCalculoRecord[];
  onSelectMemorial: (memorial: MemorialCalculoRecord) => void;
  onDeleteMemorial: (id: string) => void;
  onGerarOrcamento?: (memorial: MemorialCalculoRecord) => void;
}

interface GroupedMemorial {
  baseKey: string;
  latest: MemorialCalculoRecord;
  revisions: MemorialCalculoRecord[];
  latestRevNum: number;
}

/**
 * Extrai a chave base do orçamento (ex: 2408.001-2026) e o número da revisão (ex: 1).
 */
const parseCodeRevision = (code: string | undefined): { baseKey: string; revNum: number } => {
  if (!code || typeof code !== 'string') return { baseKey: 'sem_codigo', revNum: 0 };
  const cleanCode = code.trim();
  const parts = cleanCode.split('.');
  if (parts.length >= 3) {
    // DDMM.SEQ.REV-YEAR (ex: 2408.001.1-2026)
    const revAndYear = parts[2].split('-');
    const revNum = parseInt(revAndYear[0], 10);
    const yearStr = revAndYear[1] ? `-${revAndYear[1]}` : '';
    const baseKey = `${parts[0]}.${parts[1]}${yearStr}`;
    return { baseKey, revNum: isNaN(revNum) ? 0 : revNum };
  } else if (parts.length === 2) {
    return { baseKey: `${parts[0]}.${parts[1]}`, revNum: 0 };
  }
  return { baseKey: cleanCode, revNum: 0 };
};

export const TabelaMemoriaisCalculo: React.FC<Props> = ({
  memoriais,
  onSelectMemorial,
  onDeleteMemorial,
  onGerarOrcamento
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const memoriaisFiltrados = useMemo(() => {
    return memoriais.filter(m => {
      const term = searchTerm.toLowerCase();
      const matchSearch = 
        (m.codigoOrcamento || '').toLowerCase().includes(term) ||
        (m.nomeProjeto || '').toLowerCase().includes(term) ||
        (m.cliente || '').toLowerCase().includes(term) ||
        (m.responsavel || '').toLowerCase().includes(term) ||
        (m.cidade || '').toLowerCase().includes(term);

      const matchStatus = statusFilter === 'todos' || m.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [memoriais, searchTerm, statusFilter]);

  // Agrupamento de Memoriais por Código Base do Orçamento
  const groupedMemoriais = useMemo(() => {
    const groupsMap = new Map<string, MemorialCalculoRecord[]>();

    memoriaisFiltrados.forEach(m => {
      const { baseKey } = parseCodeRevision(m.codigoOrcamento);
      const key = baseKey === 'sem_codigo' ? `id_${m.id}` : baseKey;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, []);
      }
      groupsMap.get(key)!.push(m);
    });

    const result: GroupedMemorial[] = [];

    groupsMap.forEach((items, baseKey) => {
      // Ordena: revisão maior primeiro (Rev 1 > Rev 0). Se igual, data de atualização mais recente.
      const sorted = [...items].sort((a, b) => {
        const revA = parseCodeRevision(a.codigoOrcamento).revNum;
        const revB = parseCodeRevision(b.codigoOrcamento).revNum;
        if (revA !== revB) return revB - revA;
        return new Date(b.dataAtualizacao || 0).getTime() - new Date(a.dataAtualizacao || 0).getTime();
      });

      const latestRevNum = parseCodeRevision(sorted[0].codigoOrcamento).revNum;

      result.push({
        baseKey,
        latest: sorted[0],
        revisions: sorted,
        latestRevNum
      });
    });

    return result;
  }, [memoriaisFiltrados]);

  // Expandir automaticamente todos os grupos quando houver busca ativa
  useEffect(() => {
    if (searchTerm.trim()) {
      const allKeys = new Set(groupedMemoriais.map(g => g.baseKey));
      setExpandedGroups(allKeys);
    }
  }, [searchTerm, groupedMemoriais]);

  const toggleGroup = (baseKey: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(baseKey)) next.delete(baseKey);
      else next.add(baseKey);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código, obra, cliente, orçamentista..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['todos', 'Em Edição', 'Concluído', 'Vinculado a Orçamento'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                statusFilter === st 
                  ? 'bg-slate-900 text-white shadow-2xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'todos' ? `Todos (${memoriais.length})` : st}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela Principal de Memoriais com Accordion */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 font-semibold text-slate-600 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4 border-r border-slate-200">CÓDIGO / ORÇAMENTO</th>
                <th className="py-3 px-4 min-w-[220px] border-r border-slate-200">NOME DO PROJETO / OBRA</th>
                <th className="py-3 px-4 border-r border-slate-200">CLIENTE / GESTOR</th>
                <th className="py-3 px-4 border-r border-slate-200">RESPONSÁVEL TÉCNICO</th>
                <th className="py-3 px-3 text-center border-r border-slate-200">LOCALIDADE</th>
                <th className="py-3 px-3 text-center border-r border-slate-200">ATUALIZAÇÃO</th>
                <th className="py-3 px-3 text-center border-r border-slate-200">STATUS</th>
                <th className="py-3 px-4 text-center w-36">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {groupedMemoriais.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    Nenhum memorial de cálculo encontrado. Clique em "+ Criar Novo Memorial de Cálculo" para iniciar.
                  </td>
                </tr>
              ) : (
                groupedMemoriais.map((group) => {
                  const main = group.latest;
                  const hasRevisions = group.revisions.length > 1;
                  const isExpanded = expandedGroups.has(group.baseKey);
                  const historicalRevisions = group.revisions.slice(1);

                  return (
                    <React.Fragment key={group.baseKey}>
                      {/* Linha Principal (Última Revisão / Versão Vigente) */}
                      <tr 
                        onClick={() => onSelectMemorial(main)}
                        className={`hover:bg-blue-50/40 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-blue-50/20' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-700 border-r border-slate-200">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {hasRevisions && (
                              <button
                                type="button"
                                onClick={(e) => toggleGroup(group.baseKey, e)}
                                className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                                title={isExpanded ? "Recolher revisões anteriores" : "Expandir histórico de revisões"}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-slate-500" />
                                )}
                              </button>
                            )}

                            {main.codigoOrcamento ? (
                              <span className="text-blue-900 font-bold">{main.codigoOrcamento}</span>
                            ) : (
                              <span className="text-slate-400 font-sans italic text-[11px] font-normal">Sem Orçamento</span>
                            )}

                            {main.codigoOrcamento && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                REV {group.latestRevNum}
                              </span>
                            )}

                            {hasRevisions && !isExpanded && (
                              <span 
                                onClick={(e) => toggleGroup(group.baseKey, e)}
                                className="text-[10px] text-blue-600 font-medium hover:underline cursor-pointer"
                              >
                                (+{historicalRevisions.length} rev. ant.)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 border-r border-slate-200 font-bold text-slate-800">
                          <div>{main.nomeProjeto || 'Nova Obra de Engenharia'}</div>
                          <div className="text-[11px] font-normal text-slate-400">
                            {main.itens?.filter(i => !i.isSecao).length || 0} serviços calculados
                          </div>
                        </td>
                        <td className="py-3 px-4 border-r border-slate-200">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{main.cliente || 'BRP Engenharia'}</span>
                          </div>
                          {main.gestorCliente && (
                            <div className="text-[11px] text-slate-500 pl-5">Gestor: {main.gestorCliente}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 border-r border-slate-200">
                          <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{main.responsavel || 'Orçamentista BRP'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center border-r border-slate-200 font-semibold text-slate-600 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{main.cidade ? `${main.cidade} / ${main.estado}` : `${main.estado}`}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center border-r border-slate-200 text-slate-500 font-medium whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{main.dataAtualizacao}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center border-r border-slate-200 whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            main.status === 'Concluído' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            main.status === 'Vinculado a Orçamento' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {main.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => onSelectMemorial(main)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors border border-blue-200/80 cursor-pointer"
                              title="Abrir memorial para edições"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Abrir</span>
                            </button>
                            {onGerarOrcamento && (
                              <button
                                type="button"
                                onClick={() => onGerarOrcamento(main)}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors border border-emerald-200/80 cursor-pointer"
                                title="Gerar Orçamento a partir deste Memorial"
                              >
                                <Rocket className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Orçamento</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onDeleteMemorial(main.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Excluir memória de cálculo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Sub-linhas desdobradas para Revisões Anteriores (Accordion) */}
                      {isExpanded && historicalRevisions.map((rev) => {
                        const revNum = parseCodeRevision(rev.codigoOrcamento).revNum;
                        return (
                          <tr
                            key={rev.id}
                            onClick={() => onSelectMemorial(rev)}
                            className="bg-slate-50/90 hover:bg-blue-50/50 transition-colors cursor-pointer border-l-4 border-l-blue-400"
                          >
                            <td className="py-2.5 px-4 font-mono font-medium text-slate-600 border-r border-slate-200 pl-8">
                              <div className="flex items-center gap-1.5">
                                <CornerDownRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span className="text-slate-700 font-semibold">{rev.codigoOrcamento}</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                                  REV {revNum}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 border-r border-slate-200 font-medium text-slate-700">
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-600 text-xs font-semibold">{rev.nomeProjeto || main.nomeProjeto}</span>
                                <span className="text-[10px] text-slate-400 font-normal italic">(Revisão Anterior)</span>
                              </div>
                              <div className="text-[10px] font-normal text-slate-400">
                                {rev.itens?.filter(i => !i.isSecao).length || 0} serviços calculados
                              </div>
                            </td>
                            <td className="py-2.5 px-4 border-r border-slate-200 text-slate-700">
                              <div className="font-medium text-slate-700 flex items-center gap-1.5">
                                <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{rev.cliente || main.cliente}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 border-r border-slate-200">
                              <div className="font-medium text-slate-700 flex items-center gap-1.5">
                                <User className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{rev.responsavel || main.responsavel}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center border-r border-slate-200 text-slate-600 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>{rev.cidade ? `${rev.cidade} / ${rev.estado}` : `${rev.estado}`}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center border-r border-slate-200 text-slate-500 font-medium whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span>{rev.dataAtualizacao}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center border-r border-slate-200 whitespace-nowrap">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                rev.status === 'Concluído' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                rev.status === 'Vinculado a Orçamento' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}>
                                {rev.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onSelectMemorial(rev)}
                                  className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-md text-[11px] flex items-center gap-1 transition-colors border border-blue-200 cursor-pointer"
                                  title="Abrir esta revisão do memorial"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Abrir</span>
                                </button>
                                {onGerarOrcamento && (
                                  <button
                                    type="button"
                                    onClick={() => onGerarOrcamento(rev)}
                                    className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-md text-[11px] flex items-center gap-1 transition-colors border border-emerald-200 cursor-pointer"
                                    title="Gerar Orçamento a partir desta revisão"
                                  >
                                    <Rocket className="w-3 h-3 text-emerald-600" />
                                    <span>Orçamento</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => onDeleteMemorial(rev.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                  title="Excluir esta revisão"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
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
    </div>
  );
};
