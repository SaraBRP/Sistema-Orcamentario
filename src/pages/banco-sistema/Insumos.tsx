import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Database, ExternalLink, FileSpreadsheet, Trash2, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import ImportadorInsumosModal from '../../components/ImportadorInsumosModal';
import { useSearchParams } from 'react-router-dom';

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


const TIPOS_FILTRO = ['Material', 'Equipamento', 'Mão de Obra', 'Outros'];

// Insumos do Banco do SISTEMA
export default function BancoSistemaInsumos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialBanco = searchParams.get('banco') || 'SINAPI';

  const [bancos, setBancos] = useState<string[]>([initialBanco]);
  const [estadosDisponiveis, setEstadosDisponiveis] = useState<string[]>([]);
  const [insumos, setInsumos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [bancoFiltro, setBancoFiltro] = useState(initialBanco);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Sincroniza os filtros com a URL
  useEffect(() => {
    const params: any = {};
    if (searchTerm.trim()) params.search = searchTerm;
    if (bancoFiltro) params.banco = bancoFiltro;
    setSearchParams(params);
  }, [searchTerm, bancoFiltro]);

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

  const [isDeletarModalOpen, setIsDeletarModalOpen] = useState(false);
  const [deletando, setDeletando] = useState(false);
  const [deletaProgresso, setDeletaProgresso] = useState('');

  // Busca os bancos (fontes de preço) distintas na base de forma barata usando a view
  const fetchBancos = async () => {
    try {
      const { data, error } = await supabase.schema('engenharia').from('v_fontes_preco').select('*');
      if (data && !error) {
        const unicas = data.map((i: any) => i.fonte_preco).filter(Boolean);
        const final = Array.from(new Set(unicas))
          .filter(f => f !== 'Cotação' && f !== 'Histórico')
          .sort();
        setBancos(final as string[]);
        
        // Se a base atual não existir nas abas e 'unicas' tiver algo, seta a primeira
        if (!final.includes(bancoFiltro) && final.length > 0) {
          setBancoFiltro(final[0]);
        } else if (final.length === 0) {
          setBancoFiltro('');
        }
      } else if (error) {
        console.warn('View v_fontes_preco não encontrada ou erro na busca:', error.message);
      }
    } catch (err) {
      console.error('Erro ao buscar fontes da view:', err);
    }
  };

  const fetchEstadosDisponiveis = async (banco: string) => {
    if (!banco) {
      setEstadosDisponiveis([]);
      return;
    }
    try {
      const { data, error } = await supabase.schema('engenharia')
        .from('v_fontes_estados')
        .select('estado')
        .eq('fonte_preco', banco);
      if (data && !error) {
        const distinct = data.map((i: any) => i.estado).filter(Boolean).sort() as string[];
        setEstadosDisponiveis(distinct);
        
        // Se o estado atualmente selecionado no filtro não está disponível para esta base, reseta
        if (filtroEstado && !distinct.includes(filtroEstado)) {
          setFiltroEstado('');
        }
      }
    } catch (err) {
      console.error('Erro ao buscar estados da view:', err);
    }
  };

  useEffect(() => {
    fetchBancos();
  }, []);

  useEffect(() => {
    fetchEstadosDisponiveis(bancoFiltro);
  }, [bancoFiltro]);

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
  }, [bancoFiltro, page, debouncedSearch, filtroEstado, filtroTipo, sortColumn, sortOrder]);

  const fetchInsumos = async () => {
    setLoading(true);
    try {
      let query = supabase
        .schema('engenharia')
        .from('insumos')
        .select('*', { count: 'exact' })
        .eq('fonte_preco', bancoFiltro);

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
        console.error(error);
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

  const handleMudarBanco = (banco: string) => {
    setBancoFiltro(banco);
    setPage(1);
  };

  const handleDeletarBase = async () => {
    if (!bancoFiltro) return;
    setDeletando(true);
    setDeletaProgresso(`Deletando insumos da base "${bancoFiltro}"...`);
    try {
      // Deletar os insumos (as referências em planilha_cliente_itens e orcamento_itens usarão ON DELETE SET NULL)
      const { error: delErr } = await supabase.schema('engenharia')
        .from('insumos')
        .delete()
        .eq('fonte_preco', bancoFiltro);
      
      if (delErr) throw delErr;

      setDeletaProgresso(`✅ Base "${bancoFiltro}" deletada com sucesso! Atualizando...`);

      await fetchBancos();
      setBancoFiltro('');
      setInsumos([]);
      setTotalCount(0);
      setPage(1);

      setTimeout(() => {
        setIsDeletarModalOpen(false);
        setDeletaProgresso('');
        setDeletando(false);
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setDeletaProgresso(`❌ Erro: ${err.message || 'Falha ao deletar a base.'}`);
      setDeletando(false);
    }
  };

  const filteredInsumos = insumos;

  const renderPaginationButtons = () => {
    const totalPages = Math.ceil(totalCount / pageSize);
    if (totalPages <= 0) return null;

    const buttons: (number | string)[] = [];

    if (totalPages <= 7) {
      for (let p = 1; p <= totalPages; p++) {
        buttons.push(p);
      }
    } else {
      // Sempre incluir a página 1
      buttons.push(1);

      if (page > 4) {
        buttons.push('...');
      }

      const start = Math.max(2, page - 2);
      const end = Math.min(totalPages - 1, page + 2);

      let adjustStart = start;
      let adjustEnd = end;
      if (page <= 4) {
        adjustEnd = 5;
      }
      if (page >= totalPages - 3) {
        adjustStart = totalPages - 4;
      }

      for (let p = adjustStart; p <= adjustEnd; p++) {
        if (p > 1 && p < totalPages) {
          buttons.push(p);
        }
      }

      if (page < totalPages - 3) {
        buttons.push('...');
      }

      // Sempre incluir a última página
      buttons.push(totalPages);
    }

    return buttons.map((pageNum, idx) => {
      if (pageNum === '...') {
        return (
          <span key={`ell-${idx}`} className="px-2 text-slate-400 select-none font-bold">
            ...
          </span>
        );
      }

      return (
        <button
          key={pageNum}
          onClick={() => setPage(pageNum as number)}
          className={`px-3 py-1.5 rounded-lg border text-sm font-semibold transition-colors ${
            page === pageNum
              ? 'bg-blue-600 text-white border-transparent'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          {pageNum}
        </button>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-slate-700 text-slate-100 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
              Banco do Sistema
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Insumos de Referência</h2>
          <p className="text-slate-500 text-sm">Base de preços pública para consulta e importação</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 text-sm text-slate-500 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
            <Database className="w-4 h-4 text-amber-600" />
            <span>Somente leitura — importe para o Banco Próprio para editar</span>
          </div>
          {bancoFiltro && (
            <button
              onClick={() => setIsDeletarModalOpen(true)}
              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
              title="Deletar base de insumos selecionada"
            >
              <Trash2 className="w-5 h-5" />
              Deletar Base
            </button>
          )}
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
          >
            <FileSpreadsheet className="w-5 h-5" />
            Importar Planilha
          </button>
        </div>
      </div>

      {/* Seletor de Banco */}
      <div className="flex gap-2 flex-wrap">
        {bancos.map(banco => (
          <button
            key={banco}
            onClick={() => handleMudarBanco(banco)}
            className={clsx(
              'px-4 py-2 rounded-xl text-sm font-bold transition-all border-2',
              bancoFiltro === banco
                ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-100'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            )}
          >
            {banco}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Buscar em ${bancoFiltro}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none bg-white text-sm"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={filtroEstado}
              onChange={(e) => { setFiltroEstado(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm min-w-[120px]"
            >
              <option value="">Todos os Estados</option>
              {estadosDisponiveis.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>

            <select
              value={filtroTipo}
              onChange={(e) => { setFiltroTipo(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm min-w-[150px]"
            >
              <option value="">Todos os Tipos</option>
              {TIPOS_FILTRO.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 table-fixed">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-medium text-xs uppercase tracking-wider">
              <tr>
                {renderHeader('codigo', 'Cód.')}
                {renderHeader('descricao', 'Descrição')}
                {renderHeader('unidade', 'UN')}
                {renderHeader('tipo', 'Tipo')}
                {renderHeader('estado', 'Estado')}
                {renderHeader('valor_nao_desonerado', 'Sem Desoneração (R$)', 'right')}
                {renderHeader('valor_desonerado', 'Desonerado (R$)', 'right')}
                {renderHeader('valor_sem_encargos', 'Sem Encargos (R$)', 'right')}
                {renderHeader('fonte_preco', 'Banco')}
                {renderHeader('data_base', 'Data Ref.', 'center')}
                <th style={{ width: 80, minWidth: 80 }} className="px-4 py-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={11} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                    Carregando dados de {bancoFiltro}...
                  </div>
                </td></tr>
              ) : filteredInsumos.length === 0 ? (
                <tr><td colSpan={11} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <Database className="w-10 h-10 text-slate-300" />
                    <p className="font-medium">Nenhum insumo {bancoFiltro} encontrado</p>
                    <p className="text-sm">Os dados de {bancoFiltro} precisam ser importados via planilha</p>
                  </div>
                </td></tr>
              ) : filteredInsumos.map((insumo) => (
                <tr key={insumo.id} className="hover:bg-slate-50 transition-colors group">
                  <td style={{ width: colWidths.codigo, minWidth: colWidths.codigo, maxWidth: colWidths.codigo }} className="px-4 py-3 font-mono font-semibold text-slate-700 text-xs truncate">{insumo.codigo}</td>
                  <td style={{ width: colWidths.descricao, minWidth: colWidths.descricao, maxWidth: colWidths.descricao }} className="px-4 py-3 truncate font-medium text-slate-800" title={insumo.descricao}>{insumo.descricao}</td>
                  <td style={{ width: colWidths.unidade, minWidth: colWidths.unidade, maxWidth: colWidths.unidade }} className="px-4 py-3 text-slate-500 truncate">{insumo.unidade}</td>
                  <td style={{ width: colWidths.tipo, minWidth: colWidths.tipo, maxWidth: colWidths.tipo }} className="px-4 py-3 truncate">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{insumo.tipo}</span>
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
                  <td style={{ width: colWidths.fonte_preco, minWidth: colWidths.fonte_preco, maxWidth: colWidths.fonte_preco }} className="px-4 py-3 truncate">
                    <span className="text-xs px-2 py-0.5 rounded border bg-slate-50 text-slate-700 border-slate-200">
                      {insumo.fonte_preco}
                    </span>
                  </td>
                  <td style={{ width: colWidths.data_base, minWidth: colWidths.data_base, maxWidth: colWidths.data_base }} className="px-4 py-3 text-slate-400 text-xs font-mono text-center truncate">
                    {formatarDataBase(insumo.data_base)}
                  </td>
                  <td style={{ width: 80, minWidth: 80, maxWidth: 80 }} className="px-4 py-3 text-center">
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mx-auto whitespace-nowrap px-2 py-1 bg-blue-50 rounded-md">
                      <ExternalLink className="w-3 h-3" />
                      Importar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalCount > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-500">
            <div>
              Exibindo <span className="font-semibold text-slate-700">{Math.min(totalCount, (page - 1) * pageSize + 1)}</span> a{' '}
              <span className="font-semibold text-slate-700">{Math.min(totalCount, page * pageSize)}</span> de{' '}
              <span className="font-semibold text-slate-700">{totalCount}</span> insumos em {bancoFiltro}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              
              {renderPaginationButtons()}

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

      <ImportadorInsumosModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onSuccess={async (novoBanco) => {
          await fetchBancos();
          if (novoBanco) {
            await fetchEstadosDisponiveis(novoBanco);
            setBancoFiltro(novoBanco);
            if (bancoFiltro === novoBanco) {
              fetchInsumos();
            }
          } else {
            fetchInsumos();
          }
        }}
      />

      {/* ── Modal Confirmar Deleção de Base ──────────────────────── */}
      {isDeletarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !deletando && setIsDeletarModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-red-600 px-6 py-5 flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2">
                <Trash2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Deletar Base</h3>
                <p className="text-red-100 text-sm">Esta ação não pode ser desfeita</p>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              {!deletaProgresso ? (
                <>
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-red-800 text-sm">Você está prestes a deletar permanentemente:</p>
                      <p className="text-red-700 font-bold text-lg mt-1">Base "{bancoFiltro}"</p>
                      <p className="text-red-600 text-sm mt-1">
                        Todos os insumos (materiais, equipamentos e mão de obra) vinculados a esta fonte serão removidos do banco de dados.
                      </p>
                    </div>
                  </div>
                  <p className="text-slate-600 text-sm text-center">
                    Para confirmar, clique em <strong>Deletar Base</strong> abaixo.
                  </p>
                </>
              ) : (
                <div className={clsx(
                  'flex items-center gap-3 p-4 rounded-xl border',
                  deletaProgresso.startsWith('✅') ? 'bg-green-50 border-green-200 text-green-800' :
                  deletaProgresso.startsWith('❌') ? 'bg-red-50 border-red-200 text-red-800' :
                  'bg-blue-50 border-blue-200 text-blue-800'
                )}>
                  {!deletaProgresso.startsWith('✅') && !deletaProgresso.startsWith('❌') && (
                    <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  )}
                  <p className="text-sm font-medium">{deletaProgresso}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setIsDeletarModalOpen(false)}
                disabled={deletando}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors text-sm disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeletarBase}
                disabled={deletando || deletaProgresso.startsWith('✅')}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-bold rounded-lg transition-colors text-sm flex items-center gap-2 shadow-sm"
              >
                {deletando ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Deletando...</>
                ) : (
                  <><Trash2 className="w-4 h-4" /> Deletar Base</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
