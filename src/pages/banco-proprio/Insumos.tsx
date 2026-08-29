import { useState, useEffect, useRef, Fragment } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Edit2, Trash2, FileSpreadsheet, Copy, ChevronRight, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import InsumoFormModal from '../../components/InsumoFormModal';
import * as XLSX from 'xlsx';

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

const renderEquipamentoContabil4 = (
  opNaoDes: number | null | undefined,
  opDes: number | null | undefined,
  impNaoDes: number | null | undefined,
  impDes: number | null | undefined
) => {
  const format = (v: number | null | undefined) =>
    v !== null && v !== undefined
      ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '0,00';

  return (
    <div className="flex gap-3 justify-end text-[10px] select-none leading-tight py-0.5">
      {/* Coluna Operativo */}
      <div className="flex flex-col text-right">
        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Prod.</span>
        <span className="text-slate-800 font-semibold tabular-nums">
          R$ {format(opNaoDes)} <span className="text-[8px] text-slate-400 font-normal">ND</span>
        </span>
        <span className="text-slate-500 font-medium tabular-nums">
          R$ {format(opDes)} <span className="text-[8px] text-slate-400 font-normal">Des</span>
        </span>
      </div>

      {/* Coluna Improdutivo */}
      <div className="flex flex-col text-right">
        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Imp.</span>
        <span className="text-slate-800 font-semibold tabular-nums">
          R$ {format(impNaoDes)} <span className="text-[8px] text-slate-400 font-normal">ND</span>
        </span>
        <span className="text-slate-500 font-medium tabular-nums">
          R$ {format(impDes)} <span className="text-[8px] text-slate-400 font-normal">Des</span>
        </span>
      </div>
    </div>
  );
};

const renderMaoDeObraContabil = (
  naoDes: number | null | undefined,
  des: number | null | undefined,
  semEnc: number | null | undefined
) => {
  const format = (v: number | null | undefined) =>
    v !== null && v !== undefined
      ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '0,00';

  return (
    <div className="flex flex-col text-right text-[10px] select-none leading-tight py-0.5">
      <span className="text-slate-800 font-semibold tabular-nums">
        R$ {format(naoDes)} <span className="text-[8px] text-slate-400 font-normal">ND</span>
      </span>
      <span className="text-slate-600 font-medium tabular-nums">
        R$ {format(des)} <span className="text-[8px] text-slate-400 font-normal">Des</span>
      </span>
      <span className="text-slate-500 font-medium tabular-nums">
        R$ {format(semEnc)} <span className="text-[8px] text-slate-400 font-normal">S.Enc</span>
      </span>
    </div>
  );
};

const renderPrecoContabil = (insumo: any) => {
  const tipo = insumo.tipo;
  if (tipo === 'Equipamento') {
    return renderEquipamentoContabil4(
      insumo.valor_nao_desonerado_operativo,
      insumo.valor_desonerado_operativo,
      insumo.valor_nao_desonerado_improdutivo,
      insumo.valor_desonerado_improdutivo
    );
  } else if (tipo === 'Mão de Obra') {
    return renderMaoDeObraContabil(
      insumo.valor_nao_desonerado,
      insumo.valor_desonerado,
      insumo.valor_sem_encargos
    );
  } else {
    return renderValorContabil(insumo.valor ?? insumo.valor_nao_desonerado);
  }
};


// Insumos do Banco PRÓPRIO da empresa (cadastrados pela BRP, por estado, cotações etc.)
export default function BancoProprioInsumos() {
  const [insumos, setInsumos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [insumoToEdit, setInsumoToEdit] = useState<any | null>(null);
  const [isCopyMode, setIsCopyMode] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const getBaseCode = (codigo: string) => {
    if (!codigo) return '';
    const parts = codigo.split('.');
    if (parts.length > 2) {
      return parts.slice(0, 2).join('.');
    }
    return codigo;
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importandoHistorico, setImportandoHistorico] = useState(false);
  const [progressoHistorico, setProgressoHistorico] = useState('');

  // Paginação e Busca no Servidor
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [estadosDisponiveis, setEstadosDisponiveis] = useState<string[]>([]);

  const getPrefix = (tipo: string) => {
    switch (tipo) {
      case 'Material': return 'mat';
      case 'Equipamento': return 'eq';
      case 'Transporte e Logística': return 'trans';
      case 'Serviços de Terceiros': return 'srv';
      case 'Verba': return 'vrb';
      case 'Administração': return 'adm';
      case 'Mão de Obra': return 'mo';
      case 'Aluguel': return 'alg';
      case 'Taxas': return 'tx';
      default: return 'out';
    }
  };

  const handleImportarArquivo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportandoHistorico(true);
    setProgressoHistorico('Lendo arquivo Excel...');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

      if (rawRows.length < 2) {
        throw new Error('O arquivo está vazio ou não tem cabeçalho.');
      }

      setProgressoHistorico('Mapeando e processando insumos...');

      const prefixCounters: Record<string, number> = {
        'mat': 1,
        'eq': 1,
        'trans': 1,
        'srv': 1,
        'vrb': 1,
        'adm': 1,
        'mo': 1,
        'alg': 1,
        'tx': 1,
        'out': 1
      };

      const mappedInsumos: any[] = [];

      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length === 0 || !row[2]) continue;

        const unidade = String(row[0] || 'UN').trim();
        const valor = Number(row[1]) || 0;
        const descricao = String(row[2]).trim();
        const categOriginal = String(row[3] || 'Outros').trim();

        const tipo = categOriginal;

        const prefix = getPrefix(tipo);
        const counter = prefixCounters[prefix] || 1;
        const codigo = `${prefix}.${String(counter).padStart(3, '0')}`;
        
        prefixCounters[prefix] = counter + 1;

        const isMoOrEq = tipo === 'Mão de Obra' || tipo === 'Equipamento';

        mappedInsumos.push({
          codigo,
          descricao,
          unidade,
          tipo,
          fonte_preco: 'Histórico',
          estado: 'GO',
          data_base: '2026-07-01',
          valor,
          valor_nao_desonerado: valor,
          valor_desonerado: valor,
          valor_sem_encargos: valor,
          valor_nao_desonerado_operativo: isMoOrEq ? valor : null,
          valor_desonerado_operativo: isMoOrEq ? valor : null,
          valor_nao_desonerado_improdutivo: isMoOrEq ? valor : null,
          valor_desonerado_improdutivo: isMoOrEq ? valor : null
        });
      }

      setProgressoHistorico(`Gravando insumos no banco... (0/${mappedInsumos.length})`);

      const batchSize = 100;
      for (let i = 0; i < mappedInsumos.length; i += batchSize) {
        const batch = mappedInsumos.slice(i, i + batchSize);
        const { error } = await supabase
          .schema('engenharia')
          .from('insumos')
          .upsert(batch, { onConflict: 'codigo, fonte_preco, estado' });

        if (error) throw error;
        
        setProgressoHistorico(`Gravando insumos no banco... (${Math.min(i + batch.length, mappedInsumos.length)}/${mappedInsumos.length})`);
      }

      setProgressoHistorico('✅ Importação concluída com sucesso!');
      setTimeout(() => {
        setImportandoHistorico(false);
        setProgressoHistorico('');
        handleDatabaseChange();
      }, 2000);

    } catch (err: any) {
      console.error(err);
      setProgressoHistorico(`❌ Erro ao importar: ${err.message || 'Erro inesperado'}`);
      setTimeout(() => {
        setImportandoHistorico(false);
      }, 5000);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLimparHistorico = async () => {
    const totalHistorico = insumos.filter(i => i.fonte_preco === 'Histórico').length;
    if (totalHistorico === 0) {
      alert('Não há insumos com fonte "Histórico" cadastrados para limpar.');
      return;
    }

    const confirmacao = window.confirm(
      `Deseja realmente excluir TODOS os ${totalHistorico} insumos com fonte "Histórico" do Banco Próprio?\nEsta ação não poderá ser desfeita.`
    );
    if (!confirmacao) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .schema('engenharia')
        .from('insumos')
        .delete()
        .eq('fonte_preco', 'Histórico');

      if (error) throw error;

      alert('Base "Histórico" limpa com sucesso!');
      handleDatabaseChange();
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao limpar base: ${err.message || 'Erro inesperado'}`);
    } finally {
      setLoading(false);
    }
  };

  const [filtroEstado, setFiltroEstado] = useState('');
  const [sortColumn, setSortColumn] = useState('codigo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [colWidths, setColWidths] = useState<Record<string, number>>({
    codigo: 110,
    descricao: 340,
    unidade: 80,
    tipo: 120,
    estado: 70,
    valor: 180,
    fonte_preco: 100,
    estado_registro: 100,
  });

  const TIPOS = ['Todos', 'Material', 'Mão de Obra', 'Equipamento', 'Transporte e Logística', 'Verba', 'Aluguel', 'Administração', 'Taxas', 'Outros'];

  const fetchEstadosDisponiveis = async () => {
    try {
      const { data, error } = await supabase.schema('engenharia')
        .from('insumos')
        .select('estado')
        .in('fonte_preco', ['Cotação', 'Histórico']);
      if (data && !error) {
        const distinct = Array.from(new Set(data.map((i: any) => i.estado).filter(Boolean))).sort() as string[];
        setEstadosDisponiveis(distinct);
      }
    } catch (err) {
      console.error('Erro ao buscar estados disponíveis:', err);
    }
  };

  const handleDatabaseChange = () => {
    fetchEstadosDisponiveis();
    setPage(1);
    fetchInsumos();
  };

  useEffect(() => {
    fetchEstadosDisponiveis();
  }, []);

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
  }, [page, debouncedSearch, filtroEstado, tipoFiltro, sortColumn, sortOrder]);

  const limparSubitensOrfaos = async (items: any[]) => {
    const subitensNaLista = items.filter(item => item.subitem && item.codigo_pai);
    if (subitensNaLista.length === 0) return;

    for (const item of subitensNaLista) {
      try {
        const { count, error } = await supabase.schema('engenharia').from('insumos')
          .select('id', { count: 'exact', head: true })
          .eq('codigo_pai', item.codigo_pai);

        if (!error && count === 1) {
          console.log(`Revertendo subitem órfão: ${item.codigo} -> ${item.codigo_pai}`);
          await supabase.schema('engenharia').from('insumos')
            .update({
              codigo: item.codigo_pai,
              subitem: null,
              codigo_pai: null
            })
            .eq('id', item.id);
          
          handleDatabaseChange();
          break;
        }
      } catch (err) {
        console.error('Erro ao limpar subitem órfão:', err);
      }
    }
  };

  const fetchInsumos = async () => {
    setLoading(true);
    try {
      let query = supabase
        .schema('engenharia')
        .from('insumos')
        .select('*', { count: 'exact' })
        .in('fonte_preco', ['Cotação', 'Histórico']);

      if (debouncedSearch.trim()) {
        query = query.or(`descricao.ilike.%${debouncedSearch.trim()}%,codigo.ilike.%${debouncedSearch.trim()}%`);
      }

      if (filtroEstado) {
        query = query.eq('estado', filtroEstado);
      }

      if (tipoFiltro !== 'Todos') {
        if (tipoFiltro === 'Outros') {
          query = query.not('tipo', 'in', '("Material","Mão de Obra","Equipamento","Transporte e Logística","Verba","Aluguel","Administração","Taxas")');
        } else {
          query = query.eq('tipo', tipoFiltro);
        }
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await query
        .order(sortColumn, { ascending: sortOrder === 'asc' })
        .range(from, to);

      if (error) {
        console.error(error);
      } else {
        setInsumos(data || []);
        setTotalCount(count || 0);
        if (data && data.length > 0) {
          limparSubitensOrfaos(data);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar insumos:', err);
    } finally {
      setLoading(false);
    }
  };

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

  const handleOpenEdit = (insumo: any) => {
    setInsumoToEdit(insumo);
    setIsCopyMode(false);
    setIsModalOpen(true);
  };

  const handleOpenCopy = (insumo: any) => {
    setInsumoToEdit(insumo);
    setIsCopyMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, codigo: string) => {
    if (!window.confirm(`Excluir insumo ${codigo}?`)) return;

    try {
      setLoading(true);
      // 1. Obter informações do insumo que está prestes a ser deletado para checar se ele é subitem
      const { data: insumoDeletado } = await supabase.schema('engenharia').from('insumos')
        .select('codigo_pai, subitem, codigo').eq('id', id).maybeSingle();

      // 2. Deletar o insumo
      const { error } = await supabase.schema('engenharia').from('insumos').delete().eq('id', id);
      if (error) throw error;

      // 3. Se era um subitem, checar se restou apenas 1. Se sim, reverte para o formato normal
      if (insumoDeletado && insumoDeletado.codigo_pai) {
        const codigoPai = insumoDeletado.codigo_pai;
        const { data: restantes } = await supabase.schema('engenharia').from('insumos')
          .select('id, codigo, subitem')
          .eq('codigo_pai', codigoPai);
          
        if (restantes && restantes.length === 1) {
          const rem = restantes[0];
          const { error: revertError } = await supabase.schema('engenharia').from('insumos')
            .update({
              codigo: codigoPai,
              subitem: null,
              codigo_pai: null
            })
            .eq('id', rem.id);
          if (revertError) throw revertError;
        }
      }

      alert('Insumo excluído com sucesso!');
      handleDatabaseChange();
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao excluir insumo: ${err.message || 'Erro inesperado'}`);
    } finally {
      setLoading(false);
    }
  };


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

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  // Agrupamento de insumos por código base para exibição compacta (por estado)
  const groupedInsumos = (() => {
    const groups: Record<string, any[]> = {};
    
    insumos.forEach(item => {
      const key = item.codigo_pai || getBaseCode(item.codigo);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });
    
    return Object.entries(groups).map(([key, items]) => {
      if (items.length <= 1) {
        return {
          groupKey: key,
          isGroup: false,
          parent: items[0],
          children: []
        };
      }
      
      // Ordena por subitem
      items.sort((a, b) => (a.subitem || 0) - (b.subitem || 0));
      const parentRep = {
        ...items[0],
        codigo: key, // código pai (ex: alg.001)
        isRepresentative: true
      };
      
      return {
        groupKey: key,
        isGroup: true,
        parent: parentRep,
        children: items
      };
    });
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
              Banco Próprio
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Insumos Próprios</h2>
          <p className="text-slate-500 text-sm">Materiais, mão de obra e equipamentos cadastrados pela BRP</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportarArquivo}
            accept=".xlsx,.xls"
            className="hidden"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
            disabled={importandoHistorico}
          >
            <FileSpreadsheet className="w-5 h-5" />
            Importar Histórico
          </button>
           <button 
             onClick={handleLimparHistorico}
             className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
             disabled={importandoHistorico}
           >
             <Trash2 className="w-5 h-5" />
             Limpar Histórico
           </button>
           <button
             onClick={() => { setInsumoToEdit(null); setIsCopyMode(false); setIsModalOpen(true); }}
             className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
           >
             <Plus className="w-5 h-5" />
             Novo Insumo
           </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Filtros */}
        <div className="p-4 border-b border-slate-200 flex flex-col gap-4 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por código ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm text-slate-900 font-normal placeholder:text-slate-500"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <select
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-normal text-slate-900 min-w-[160px]"
              >
                <option value="Todos" className="text-slate-900 bg-white font-normal">Todos os Tipos</option>
                {TIPOS.filter(t => t !== 'Todos').map(tipo => (
                  <option key={tipo} value={tipo} className="text-slate-900 bg-white font-normal">{tipo}</option>
                ))}
              </select>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-normal text-slate-900 min-w-[150px]"
              >
                <option value="" className="text-slate-900 bg-white font-normal">Todos os Estados</option>
                {estadosDisponiveis.map(uf => <option key={uf} value={uf} className="text-slate-900 bg-white font-normal">{uf}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 table-fixed">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-medium text-xs uppercase tracking-wider">
              <tr>
                {renderHeader('codigo', 'Cód.')}
                {renderHeader('descricao', 'Descrição')}
                {renderHeader('unidade', 'UN')}
                {renderHeader('tipo', 'Tipo')}
                {renderHeader('estado', 'UF')}
                {renderHeader('valor', 'Valor (R$)', 'right')}
                {renderHeader('fonte_preco', 'Fonte')}
                {renderHeader('estado_registro', 'Status', 'center')}
                <th style={{ width: 105, minWidth: 105 }} className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={9} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    Carregando insumos...
                  </div>
                </td></tr>
              ) : insumos.length === 0 ? (
                <tr><td colSpan={9} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="w-10 h-10 text-slate-300" />
                    <p className="font-medium">Nenhum insumo encontrado</p>
                    <p className="text-sm">Clique em "Novo Insumo" para começar</p>
                  </div>
                </td></tr>
              ) : groupedInsumos.map((group) => {
                const insumo = group.parent;
                const hasChildren = group.isGroup && group.children.length > 0;
                const states = hasChildren
                  ? Array.from(new Set(group.children.map(c => c.estado).filter(Boolean))).sort().join(', ')
                  : (insumo.estado || '-');

                return (
                  <Fragment key={insumo.id}>
                    <tr className="hover:bg-blue-50/30 transition-colors group border-b border-slate-100">
                      <td style={{ width: colWidths.codigo, minWidth: colWidths.codigo, maxWidth: colWidths.codigo }} className="px-4 py-3 font-mono font-semibold text-slate-700 text-xs truncate">
                        <div className="flex items-center gap-1">
                          {hasChildren && (
                            <button
                              onClick={() => toggleGroup(group.groupKey)}
                              className="p-0.5 hover:bg-slate-200 rounded transition-colors text-slate-500"
                              title={expandedGroups[group.groupKey] ? "Recolher Estados" : "Expandir Estados"}
                            >
                              {expandedGroups[group.groupKey] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          <span className={clsx(hasChildren && "text-blue-700 font-bold")}>{insumo.codigo}</span>
                        </div>
                      </td>
                      <td style={{ width: colWidths.descricao, minWidth: colWidths.descricao, maxWidth: colWidths.descricao }} className="px-4 py-3 truncate font-medium text-slate-800" title={insumo.descricao}>{insumo.descricao}</td>
                      <td style={{ width: colWidths.unidade, minWidth: colWidths.unidade, maxWidth: colWidths.unidade }} className="px-4 py-3 text-slate-500 truncate">{insumo.unidade}</td>
                      <td style={{ width: colWidths.tipo, minWidth: colWidths.tipo, maxWidth: colWidths.tipo }} className="px-4 py-3 truncate">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                          {insumo.tipo}
                        </span>
                      </td>
                      <td style={{ width: colWidths.estado, minWidth: colWidths.estado, maxWidth: colWidths.estado }} className="px-4 py-3 text-slate-500 font-mono text-xs truncate">
                        {hasChildren ? (
                          <span className="bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded border border-slate-200 select-none">
                            {states}
                          </span>
                        ) : (
                          insumo.estado || '-'
                        )}
                      </td>
                      <td style={{ width: colWidths.valor, minWidth: colWidths.valor, maxWidth: colWidths.valor }} className="px-4 py-3 text-right font-semibold text-slate-800 tabular-nums">
                        {hasChildren ? (
                          <span className="text-slate-400 font-normal italic select-none text-[10px]">Vários (expanda)</span>
                        ) : (
                          renderPrecoContabil(insumo)
                        )}
                      </td>
                      <td style={{ width: colWidths.fonte_preco, minWidth: colWidths.fonte_preco, maxWidth: colWidths.fonte_preco }} className="px-4 py-3 truncate">
                        {hasChildren ? (
                          <span className="text-slate-400 font-normal italic select-none text-[10px]">-</span>
                        ) : (
                          <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">{insumo.fonte_preco}</span>
                        )}
                      </td>
                      <td style={{ width: colWidths.estado_registro, minWidth: colWidths.estado_registro, maxWidth: colWidths.estado_registro }} className="px-4 py-3 text-center truncate">
                        {hasChildren ? (
                          <span className="text-slate-400 font-normal italic select-none text-[10px]">-</span>
                        ) : (
                          <span className={clsx(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                            insumo.estado_registro === 'ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          )}>
                            {insumo.estado_registro === 'ativo' ? 'Ativo' : 'Inativo'}
                          </span>
                        )}
                      </td>
                      <td style={{ width: 105, minWidth: 105, maxWidth: 105 }} className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!hasChildren ? (
                            <>
                              <button onClick={() => handleOpenEdit(insumo)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Editar">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleOpenCopy(insumo)}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Criar Cópia">
                                <Copy className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(insumo.id, insumo.codigo)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Excluir">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-400 font-normal italic select-none text-[10px] pr-2">Use expandido</span>
                          )}
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Sub-table */}
                    {hasChildren && expandedGroups[group.groupKey] && (
                      <tr className="bg-slate-50/50">
                        <td colSpan={9} className="px-4 py-3 border-y border-slate-100">
                          <div className="pl-6 border-l-2 border-blue-500 space-y-2 py-1 bg-white rounded-lg shadow-sm p-3">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                              <span>Valores e Configurações por Estado ({group.children.length} estados cadastrados)</span>
                            </div>
                            <table className="w-full text-left text-xs text-slate-600 border border-slate-200 rounded-lg overflow-hidden">
                              <thead className="bg-slate-100 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                                <tr>
                                  <th className="px-4 py-2 w-28">Cód. Subitem</th>
                                  <th className="px-4 py-2 w-20 text-center">UF</th>
                                  <th className="px-4 py-2 text-right w-44">Valor (R$)</th>
                                  <th className="px-4 py-2 w-32">Fonte</th>
                                  <th className="px-4 py-2 w-32">Data Base</th>
                                  <th className="px-4 py-2 w-28 text-center">Status</th>
                                  <th className="px-4 py-2 text-center w-28">Ações</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {group.children.map((child) => (
                                  <tr key={child.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 font-mono font-medium text-slate-700">{child.codigo}</td>
                                    <td className="px-4 py-2 text-center font-mono font-semibold text-slate-800">{child.estado || '-'}</td>
                                    <td className="px-4 py-2 text-right font-semibold text-slate-800 tabular-nums">
                                      {renderPrecoContabil(child)}
                                    </td>
                                    <td className="px-4 py-2">
                                      <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 font-medium">{child.fonte_preco}</span>
                                    </td>
                                    <td className="px-4 py-2 text-slate-500">{child.data_base ? new Date(child.data_base).toLocaleDateString('pt-BR') : '-'}</td>
                                    <td className="px-4 py-2 text-center">
                                      <span className={clsx(
                                        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold',
                                        child.estado_registro === 'ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                      )}>
                                        {child.estado_registro === 'ativo' ? 'Ativo' : 'Inativo'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <button onClick={() => handleOpenEdit(child)}
                                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar">
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleOpenCopy(child)}
                                          className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Criar Cópia">
                                          <Copy className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleDelete(child.id, child.codigo)}
                                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors" title="Excluir">
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
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

      <InsumoFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setIsCopyMode(false); }}
        insumoToEdit={insumoToEdit}
        isCopyMode={isCopyMode}
        onSuccess={handleDatabaseChange}
        bancoProprio
      />

      {importandoHistorico && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <h3 className="font-bold text-slate-800 text-lg">Importando Insumos Históricos</h3>
            <p className="text-slate-600 text-sm font-medium">{progressoHistorico}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Declaração fora do escopo para resolver o TS
function Package({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
    </svg>
  );
}
