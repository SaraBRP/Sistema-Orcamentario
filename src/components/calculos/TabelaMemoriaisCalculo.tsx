import React, { useState } from 'react';
import { Search, Trash2, Eye, Calendar, Building2, User, MapPin } from 'lucide-react';
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
}

export const TabelaMemoriaisCalculo: React.FC<Props> = ({
  memoriais,
  onSelectMemorial,
  onDeleteMemorial
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  const memoriaisFiltrados = memoriais.filter(m => {
    const term = searchTerm.toLowerCase();
    const matchSearch = 
      m.codigoOrcamento.toLowerCase().includes(term) ||
      m.nomeProjeto.toLowerCase().includes(term) ||
      m.cliente.toLowerCase().includes(term) ||
      m.responsavel.toLowerCase().includes(term) ||
      m.cidade.toLowerCase().includes(term);

    const matchStatus = statusFilter === 'todos' || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

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

      {/* Tabela Principal de Memoriais */}
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
              {memoriaisFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    Nenhum memorial de cálculo encontrado. Clique em "+ Criar Novo Memorial de Cálculo" para iniciar.
                  </td>
                </tr>
              ) : (
                memoriaisFiltrados.map((m) => (
                  <tr 
                    key={m.id}
                    onClick={() => onSelectMemorial(m)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-700 border-r border-slate-200">
                      {m.codigoOrcamento ? (
                        <span className="text-blue-900 font-bold">{m.codigoOrcamento}</span>
                      ) : (
                        <span className="text-slate-400 font-sans italic text-[11px] font-normal">Sem Orçamento</span>
                      )}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200 font-bold text-slate-800">
                      <div>{m.nomeProjeto || 'Nova Obra de Engenharia'}</div>
                      <div className="text-[11px] font-normal text-slate-400">
                        {m.itens?.filter(i => !i.isSecao).length || 0} serviços calculados
                      </div>
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{m.cliente || 'BRP Engenharia'}</span>
                      </div>
                      {m.gestorCliente && (
                        <div className="text-[11px] text-slate-500 pl-5">Gestor: {m.gestorCliente}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200">
                      <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{m.responsavel || 'Orçamentista BRP'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center border-r border-slate-200 font-semibold text-slate-600 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{m.cidade ? `${m.cidade} / ${m.estado}` : `${m.estado}`}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center border-r border-slate-200 text-slate-500 font-medium whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{m.dataAtualizacao}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center border-r border-slate-200 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        m.status === 'Concluído' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        m.status === 'Vinculado a Orçamento' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onSelectMemorial(m)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors border border-blue-200/80 cursor-pointer"
                          title="Abrir memorial para edições"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Abrir</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteMemorial(m.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Excluir memória de cálculo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
