import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import InsumoFormModal from '../components/InsumoFormModal';

const formatarDataBase = (db: string) => {
  if (!db) return '-';
  const parts = db.split('-');
  if (parts.length >= 2) {
    return `${parts[1]}/${parts[0]}`; // MM/YYYY
  }
  return db;
};

const renderValorContabil = (valor: number | null | undefined) => {
  if (valor === null || valor === undefined) {
    return (
      <div className="flex justify-between w-full select-none text-slate-400">
        <span>R$</span>
        <span>-</span>
      </div>
    );
  }
  return (
    <div className="flex justify-between w-full select-none gap-2">
      <span className="text-slate-400 font-normal">R$</span>
      <span className="text-slate-800 font-semibold tabular-nums">
        {Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );
};

const renderEquipamentoContabil = (
  operativo: number | null | undefined,
  improdutivo: number | null | undefined
) => {
  return (
    <div className="flex flex-col w-full gap-0.5">
      <div className="flex justify-between w-full select-none items-center gap-1">
        <span className="text-slate-400 font-normal text-[10px]">R$</span>
        <div className="flex items-center gap-1">
          <span className="text-slate-800 font-semibold tabular-nums">
            {operativo !== null && operativo !== undefined 
              ? Number(operativo).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : '0,00'}
          </span>
          <span className="text-[10px] text-slate-400 font-normal">(Prod.)</span>
        </div>
      </div>
      <div className="flex justify-between w-full select-none items-center gap-1">
        <span className="text-slate-400 font-normal text-[10px]">R$</span>
        <div className="flex items-center gap-1">
          <span className="text-slate-500 text-xs font-semibold tabular-nums">
            {improdutivo !== null && improdutivo !== undefined 
              ? Number(improdutivo).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : '0,00'}
          </span>
          <span className="text-[10px] text-slate-400 font-normal">(Imp.)</span>
        </div>
      </div>
    </div>
  );
};

const renderPrecoContabil = (
  tipo: string,
  valorOperativo: number | null | undefined,
  valorImprodutivo: number | null | undefined,
  valorGeral: number | null | undefined
) => {
  if (tipo === 'Equipamento') {
    const op = valorOperativo ?? valorGeral;
    if (op !== null && op !== undefined) {
      return renderEquipamentoContabil(op, valorImprodutivo);
    }
    return (
      <div className="flex justify-between w-full select-none text-slate-400">
        <span>R$</span>
        <span>-</span>
      </div>
    );
  } else {
    return renderValorContabil(valorGeral);
  }
};


const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const TIPOS_FILTRO = ['Material', 'Equipamento', 'Mão de Obra', 'Outros'];

export default function Insumos() {
  const [insumos, setInsumos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [insumoToEdit, setInsumoToEdit] = useState<any | null>(null);

  // Paginação e Busca no Servidor
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Novos Filtros e Ordenação / Tamanho de Coluna
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [sortColumn, setSortColumn] = useState('codigo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [colWidths, setColWidths] = useState<Record<string, number>>({
    codigo: 110,
    descricao: 340,
    unidade: 80,
    tipo: 120,
    estado: 70,
    valor_nao_desonerado: 160,
    valor_desonerado: 160,
    valor_sem_encargos: 160,
    fonte_preco: 100,
    data_base: 100,
  });

  const handleSort = (field: string) => {
    if (sortColumn === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const startResize = (col: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[col] || 150;

    const doDrag = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(60, startWidth + (moveEvent.clientX - startX));
      setColWidths(prev => ({ ...prev, [col]: newWidth }));
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  const renderHeader = (field: string, label: string, align: 'left' | 'right' | 'center' = 'left', sortable: boolean = true) => {
    const isSorted = sortColumn === field;
    const width = colWidths[field];
    return (
      <th
        style={{ width: width, minWidth: width, position: 'relative' }}
        className={`px-4 py-3 ${sortable ? 'cursor-pointer hover:bg-slate-100' : ''} transition-colors select-none group/th ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`}
        onClick={sortable ? () => handleSort(field) : undefined}
      >
        <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
          <span className="truncate">{label}</span>
          {sortable && (isSorted ? (
            sortOrder === 'asc' ? <span className="text-xs text-blue-600">▲</span> : <span className="text-xs text-blue-600">▼</span>
          ) : (
            <span className="text-xs text-slate-300 opacity-0 group-hover/th:opacity-100 transition-opacity">⇅</span>
          ))}
        </div>
        <div
          onMouseDown={(e) => startResize(field, e)}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 bg-slate-200/50 transition-colors"
        />
      </th>
    );
  };

  // Debounce do termo de busca
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reinicia para página 1 ao buscar
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    fetchInsumos();
  }, [page, debouncedSearch, filtroEstado, filtroTipo, sortColumn, sortOrder]);

  const fetchInsumos = async () => {
    setLoading(true);
    try {
      let query = supabase
        .schema('engenharia')
        .from('insumos')
        .select('*', { count: 'exact' });

      if (debouncedSearch.trim()) {
        query = query.or(`descricao.ilike.%${debouncedSearch.trim()}%,codigo.ilike.%${debouncedSearch.trim()}%`);
      }

      if (filtroEstado) {
        query = query.eq('estado', filtroEstado);
      }

      if (filtroTipo) {
        query = query.eq('tipo', filtroTipo);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let sortField = sortColumn;
      if (sortColumn === 'valor_nao_desonerado') {
        sortField = 'valor_nao_desonerado';
      }

      const { data, count, error } = await query
        .order(sortField, { ascending: sortOrder === 'asc' })
        .range(from, to);
        
      if (error) {
        console.error('Erro ao buscar insumos:', error);
      } else {
        setInsumos(data || []);
        setTotalCount(count || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredInsumos = insumos;

  const handleOpenNew = () => {
    setInsumoToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (insumo: any) => {
    setInsumoToEdit(insumo);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, codigo: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o insumo ${codigo}?`)) {
      const { error } = await supabase.schema('engenharia').from('insumos').delete().eq('id', id);
      if (error) {
        alert('Erro ao excluir: ' + error.message);
      } else {
        fetchInsumos();
      }
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Cadastro de Insumos</h2>
          <p className="text-slate-500 text-sm">Gerencie os materiais, equipamentos e mão de obra</p>
        </div>
        <button 
          onClick={handleOpenNew}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Novo Insumo
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full md:w-96">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all bg-white text-sm"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={filtroEstado}
              onChange={(e) => { setFiltroEstado(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm min-w-[120px]"
            >
              <option value="">Todos os Estados</option>
              {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>

            <select
              value={filtroTipo}
              onChange={(e) => { setFiltroTipo(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm min-w-[150px]"
            >
              <option value="">Todos os Tipos</option>
              {TIPOS_FILTRO.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 table-fixed">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-medium text-xs uppercase tracking-wider">
              <tr>
                {renderHeader('codigo', 'Cód.')}
                {renderHeader('descricao', 'Descrição')}
                {renderHeader('unidade', 'Unidade')}
                {renderHeader('tipo', 'Tipo')}
                {renderHeader('estado', 'UF')}
                {renderHeader('valor_nao_desonerado', 'Sem Desoneração (R$)', 'right')}
                {renderHeader('valor_desonerado', 'Desonerado (R$)', 'right')}
                {renderHeader('valor_sem_encargos', 'Sem Encargos (R$)', 'right')}
                {renderHeader('fonte_preco', 'Fonte')}
                {renderHeader('data_base', 'Data Ref.', 'center')}
                <th style={{ width: 80, minWidth: 80 }} className="px-4 py-3 text-center">Status</th>
                <th style={{ width: 80, minWidth: 80 }} className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                      Carregando insumos...
                    </div>
                  </td>
                </tr>
              ) : filteredInsumos.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-slate-500">
                    Nenhum insumo encontrado.
                  </td>
                </tr>
              ) : (
                filteredInsumos.map((insumo) => (
                  <tr key={insumo.id} className="hover:bg-slate-50 transition-colors group">
                    <td style={{ width: colWidths.codigo, minWidth: colWidths.codigo, maxWidth: colWidths.codigo }} className="px-4 py-3 font-mono font-semibold text-slate-700 text-xs truncate">{insumo.codigo}</td>
                    <td style={{ width: colWidths.descricao, minWidth: colWidths.descricao, maxWidth: colWidths.descricao }} className="px-4 py-3 truncate font-medium text-slate-800" title={insumo.descricao}>{insumo.descricao}</td>
                    <td style={{ width: colWidths.unidade, minWidth: colWidths.unidade, maxWidth: colWidths.unidade }} className="px-4 py-3 text-slate-500 truncate">{insumo.unidade}</td>
                    <td style={{ width: colWidths.tipo, minWidth: colWidths.tipo, maxWidth: colWidths.tipo }} className="px-4 py-3 truncate">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                        {insumo.tipo}
                      </span>
                    </td>
                    <td style={{ width: colWidths.estado, minWidth: colWidths.estado, maxWidth: colWidths.estado }} className="px-4 py-3 text-slate-500 font-mono text-xs truncate">{insumo.estado || '-'}</td>
                     <td style={{ width: colWidths.valor_nao_desonerado, minWidth: colWidths.valor_nao_desonerado, maxWidth: colWidths.valor_nao_desonerado }} className="px-4 py-3 text-right font-medium text-slate-800 tabular-nums">
                      {renderPrecoContabil(
                        insumo.tipo,
                        insumo.valor_nao_desonerado_operativo,
                        insumo.valor_nao_desonerado_improdutivo,
                        insumo.valor_nao_desonerado ?? insumo.valor
                      )}
                    </td>
                    <td style={{ width: colWidths.valor_desonerado, minWidth: colWidths.valor_desonerado, maxWidth: colWidths.valor_desonerado }} className="px-4 py-3 text-right font-medium text-slate-800 tabular-nums">
                      {renderPrecoContabil(
                        insumo.tipo,
                        insumo.valor_desonerado_operativo,
                        insumo.valor_desonerado_improdutivo,
                        insumo.valor_desonerado
                      )}
                    </td>
                    <td style={{ width: colWidths.valor_sem_encargos, minWidth: colWidths.valor_sem_encargos, maxWidth: colWidths.valor_sem_encargos }} className="px-4 py-3 text-right font-medium text-slate-800 tabular-nums">
                      {renderPrecoContabil(
                        insumo.tipo,
                        null,
                        null,
                        insumo.valor_sem_encargos
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">{insumo.fonte_preco}</td>
                    <td className="px-6 py-4 text-slate-400 text-xs font-mono text-center">
                      {formatarDataBase(insumo.data_base)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={clsx(
                        "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                        insumo.estado_registro === 'ativo' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                      )}>
                        {insumo.estado_registro === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenEdit(insumo)}
                          className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors" 
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(insumo.id, insumo.codigo)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" 
                          title="Excluir"
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
        
        {totalCount > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-500">
            <div>
              Exibindo <span className="font-semibold text-slate-700">{Math.min(totalCount, (page - 1) * pageSize + 1)}</span> a{' '}
              <span className="font-semibold text-slate-700">{Math.min(totalCount, page * pageSize)}</span> de{' '}
              <span className="font-semibold text-slate-700">{totalCount}</span> insumos
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              
              {Array.from({ length: Math.min(5, Math.ceil(totalCount / pageSize)) }, (_, idx) => {
                const totalPages = Math.ceil(totalCount / pageSize);
                let pageNum = idx + 1;
                if (page > 3 && totalPages > 5) {
                  pageNum = page - 3 + idx;
                  if (pageNum + (4 - idx) > totalPages) {
                    pageNum = totalPages - 4 + idx;
                  }
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-semibold transition-colors ${
                      page === pageNum
                        ? 'bg-blue-600 text-white border-transparent'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
                disabled={page >= Math.ceil(totalCount / pageSize) || loading}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>

      <InsumoFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        insumoToEdit={insumoToEdit}
        onSuccess={fetchInsumos}
      />
    </div>
  );
}
