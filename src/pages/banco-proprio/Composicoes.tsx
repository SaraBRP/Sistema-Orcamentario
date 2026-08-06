import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Layers, Edit2, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { clsx } from 'clsx';
import { Link, useNavigate } from 'react-router-dom';
import ComposicaoFormModal from '../../components/ComposicaoFormModal';

const renderValorContabil = (valor: number | null | undefined) => {
  if (valor === null || valor === undefined) {
    return (
      <div className="flex justify-between w-full select-none text-slate-400 text-xs font-mono">
        <span>R$</span>
        <span>-</span>
      </div>
    );
  }
  return (
    <div className="flex justify-between w-full select-none gap-1 text-xs font-mono">
      <span className="text-slate-400 font-normal">R$</span>
      <span className="text-slate-800 font-semibold tabular-nums">
        {Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );
};

const UFS_PADRAO = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

// Composições do Banco PRÓPRIO da empresa
export default function BancoProprioComposicoes() {
  const navigate = useNavigate();
  const [composicoes, setComposicoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [atividadeFiltro, setAtividadeFiltro] = useState('Todos');
  const [estadoFiltro, setEstadoFiltro] = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [composicaoEdit, setComposicaoEdit] = useState<any | null>(null);

  // Estado de Ordenação Dinâmica por Coluna
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const ATIVIDADES = ['Todos', 'Administração Local', 'Trabalhos em Terra', 'Fundações', 'Estrutura', 'Instalações', 'Acabamentos', 'Esquadrias', 'Pintura', 'Cobertura', 'Outros'];

  // Calcular UFs únicas das composições carregadas + lista padrão
  const estadosDisponiveis = Array.from(
    new Set([...composicoes.map(c => c.estado).filter(Boolean), ...UFS_PADRAO])
  ).sort() as string[];

  // Larguras Otimizadas das Colunas para caber 100% na tela
  const [colWidths, setColWidths] = useState<Record<string, number>>({
    codigo: 100,
    descricao: 320,
    atividade: 140,
    unidade: 60,
    estado: 65,
    mat: 110,
    mo: 110,
    custo_total: 120,
    acao: 90
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const startResize = (col: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[col] || 150;

    const doDrag = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(50, startWidth + (moveEvent.clientX - startX));
      setColWidths(prev => ({ ...prev, [col]: newWidth }));
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  const renderHeaderCell = (field: string, label: string) => {
    const width = colWidths[field];
    const isSorted = sortField === field;

    return (
      <th
        style={{ width: width, minWidth: width, position: 'relative' }}
        onClick={() => handleSort(field)}
        className={clsx(
          "px-3 py-2.5 select-none overflow-hidden whitespace-nowrap truncate font-bold text-[11px] uppercase tracking-wider text-center cursor-pointer transition-colors hover:bg-slate-200/80 group/head",
          isSorted ? "text-blue-700 bg-blue-50/70" : "text-slate-600"
        )}
        title={`Clique para ordenar por ${label}`}
      >
        <div className="flex items-center justify-center gap-1.5 w-full">
          <span className="truncate">{label}</span>
          {isSorted ? (
            sortDirection === 'asc' ? (
              <ArrowUp className="w-3 h-3 text-blue-600 shrink-0" />
            ) : (
              <ArrowDown className="w-3 h-3 text-blue-600 shrink-0" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover/head:opacity-100 shrink-0 transition-opacity" />
          )}
        </div>
        <div
          onMouseDown={(e) => startResize(field, e)}
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 bg-slate-200/50 transition-colors"
        />
      </th>
    );
  };

  useEffect(() => {
    fetchComposicoes();
  }, []);

  const fetchComposicoes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .schema('engenharia')
      .from('v_composicoes_cdu')
      .select('*')
      .not('fonte', 'in', '("SINAPI","SICRO 2","SICRO 3","SICRO","GOINFRA","TCPO","SBC")')
      .order('codigo', { ascending: true });

    if (error) console.error(error);
    else setComposicoes(data || []);
    setLoading(false);
  };

  const processedComposicoes = useMemo(() => {
    let list = composicoes.filter(c => {
      const matchSearch =
        c.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.codigo?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchAtiv = atividadeFiltro === 'Todos' || c.tipo_atividade === atividadeFiltro;
      const matchEst = estadoFiltro === 'Todos' || c.estado === estadoFiltro;
      return matchSearch && matchAtiv && matchEst;
    });

    if (sortField) {
      list.sort((a, b) => {
        let valA: any = '';
        let valB: any = '';

        switch (sortField) {
          case 'codigo':
            valA = a.codigo || '';
            valB = b.codigo || '';
            break;
          case 'descricao':
            valA = a.descricao || '';
            valB = b.descricao || '';
            break;
          case 'atividade':
            valA = a.tipo_atividade || '';
            valB = b.tipo_atividade || '';
            break;
          case 'unidade':
            valA = a.unidade || '';
            valB = b.unidade || '';
            break;
          case 'estado':
            valA = a.estado || '';
            valB = b.estado || '';
            break;
          case 'mat':
            valA = Number(a.mat_sem_desoneracao ?? 0);
            valB = Number(b.mat_sem_desoneracao ?? 0);
            break;
          case 'mo':
            valA = Number(a.mo_sem_desoneracao ?? 0);
            valB = Number(b.mo_sem_desoneracao ?? 0);
            break;
          case 'custo_total':
            valA = Number(a.cdu_sem_desoneracao ?? 0);
            valB = Number(b.cdu_sem_desoneracao ?? 0);
            break;
          default:
            valA = '';
            valB = '';
        }

        let cmp = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
          cmp = valA - valB;
        } else {
          cmp = String(valA).localeCompare(String(valB), 'pt-BR', { numeric: true, sensitivity: 'base' });
        }

        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    return list;
  }, [composicoes, searchTerm, atividadeFiltro, estadoFiltro, sortField, sortDirection]);

  const handleDelete = async (id: string, codigo: string) => {
    if (!window.confirm(`Excluir composição ${codigo}?`)) return;
    const { error } = await supabase.schema('engenharia').from('composicoes').delete().eq('id', id);
    if (error) alert('Erro: ' + error.message);
    else fetchComposicoes();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Banco Próprio
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Composições Próprias</h2>
          <p className="text-slate-500 text-xs">Composições de custo criadas pela BRP Engenharia</p>
        </div>
        <button 
          onClick={() => { setComposicaoEdit(null); setIsModalOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nova Composição</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 flex flex-col gap-3 bg-slate-50/50">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2.5 items-center w-full md:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar composição própria..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-xs"
                />
              </div>
              
              {/* Filtro por UF / Estado */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <select
                  value={estadoFiltro}
                  onChange={(e) => setEstadoFiltro(e.target.value)}
                  className="w-full sm:w-40 px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 cursor-pointer"
                >
                  <option value="Todos">Todas as UFs</option>
                  {estadosDisponiveis.map(uf => (
                    <option key={uf} value={uf}>UF: {uf}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full">
              {ATIVIDADES.map(a => (
                <button
                  key={a}
                  onClick={() => setAtividadeFiltro(a)}
                  className={clsx(
                    'px-2.5 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap border cursor-pointer',
                    atividadeFiltro === a
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 table-fixed border-collapse">
            <thead className="bg-slate-100/80 text-slate-600 border-b border-slate-200 select-none">
              <tr>
                {renderHeaderCell('codigo', 'Código')}
                {renderHeaderCell('descricao', 'Descrição')}
                {renderHeaderCell('atividade', 'Atividade')}
                {renderHeaderCell('unidade', 'Unid.')}
                {renderHeaderCell('estado', 'UF')}
                {renderHeaderCell('mat', 'MAT (R$)')}
                {renderHeaderCell('mo', 'MO (R$)')}
                {renderHeaderCell('custo_total', 'Custo Total (R$)')}
                <th style={{ width: colWidths.acao, minWidth: colWidths.acao }} className="px-3 py-2.5 text-center font-bold text-[11px] uppercase tracking-wider text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={9} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-7 h-7 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    Carregando composições...
                  </div>
                </td></tr>
              ) : processedComposicoes.length === 0 ? (
                <tr><td colSpan={9} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <Layers className="w-9 h-9 text-slate-300" />
                    <p className="font-bold text-xs text-slate-700">Nenhuma composição encontrada</p>
                    <p className="text-xs">Clique em "+ Nova Composição" para cadastrar</p>
                  </div>
                </td></tr>
              ) : processedComposicoes.map((comp) => (
                <tr key={comp.id} className="hover:bg-blue-50/40 transition-colors group">
                  <td style={{ width: colWidths.codigo, minWidth: colWidths.codigo, maxWidth: colWidths.codigo }} className="px-3 py-2 font-mono font-extrabold text-blue-700 text-xs truncate text-center">{comp.codigo}</td>
                  <td style={{ width: colWidths.descricao, minWidth: colWidths.descricao, maxWidth: colWidths.descricao }} className="px-3 py-2 truncate font-semibold text-slate-900 text-xs" title={comp.descricao}>{comp.descricao}</td>
                  <td style={{ width: colWidths.atividade, minWidth: colWidths.atividade, maxWidth: colWidths.atividade }} className="px-3 py-2 truncate text-xs text-slate-600 font-medium text-center" title={comp.tipo_atividade}>
                    {comp.tipo_atividade || 'Geral'}
                  </td>
                  <td style={{ width: colWidths.unidade, minWidth: colWidths.unidade, maxWidth: colWidths.unidade }} className="px-3 py-2 text-slate-600 font-mono text-[11px] truncate text-center">{comp.unidade}</td>
                  <td style={{ width: colWidths.estado, minWidth: colWidths.estado, maxWidth: colWidths.estado }} className="px-3 py-2 truncate text-[11px] font-semibold text-slate-700 text-center">
                    {comp.estado ? (
                      <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold border border-slate-200">
                        {comp.estado}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal">-</span>
                    )}
                  </td>
                  <td style={{ width: colWidths.mat, minWidth: colWidths.mat, maxWidth: colWidths.mat }} className="px-3 py-2 text-right">
                    {renderValorContabil(comp.mat_sem_desoneracao)}
                  </td>
                  <td style={{ width: colWidths.mo, minWidth: colWidths.mo, maxWidth: colWidths.mo }} className="px-3 py-2 text-right">
                    {renderValorContabil(comp.mo_sem_desoneracao)}
                  </td>
                  <td style={{ width: colWidths.custo_total, minWidth: colWidths.custo_total, maxWidth: colWidths.custo_total }} className="px-3 py-2 text-right">
                    {renderValorContabil(comp.cdu_sem_desoneracao)}
                  </td>
                  <td style={{ width: colWidths.acao, minWidth: colWidths.acao, maxWidth: colWidths.acao }} className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Link to={`/banco-proprio/composicoes/${comp.id}`} className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors font-bold flex items-center gap-0.5 text-[11px] border border-blue-200 bg-blue-50" title="Montar composição">
                        <Layers className="w-3.5 h-3.5" />
                      </Link>
                      <button onClick={() => { setComposicaoEdit(comp); setIsModalOpen(true); }} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(comp.id, comp.codigo)}
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

        {!loading && processedComposicoes.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-500 font-medium">
            {processedComposicoes.length} composiç{processedComposicoes.length !== 1 ? 'ões' : 'ão'} encontrada{processedComposicoes.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <ComposicaoFormModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setComposicaoEdit(null); }} 
        composicaoToEdit={composicaoEdit}
        onSuccess={(id) => {
          fetchComposicoes();
          setIsModalOpen(false);
          setComposicaoEdit(null);
          if (id && !composicaoEdit) {
            navigate(`/banco-proprio/composicoes/${id}`);
          }
        }}
        bancoProprio={true}
      />
    </div>
  );
}
