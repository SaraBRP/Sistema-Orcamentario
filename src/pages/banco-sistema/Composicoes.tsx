import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Database, ExternalLink, Layers, FileSpreadsheet, X, Trash2, AlertTriangle, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';
import ImportadorComposicoesModal from '../../components/ImportadorComposicoesModal';

const renderValorContabil = (valor: number | null | undefined) => {
  if (valor === null || valor === undefined) {
    return (
      <div className="flex justify-between w-full select-none text-slate-455 text-xs">
        <span>R$</span>
        <span>-</span>
      </div>
    );
  }
  return (
    <div className="flex justify-between w-full select-none gap-2 text-xs">
      <span className="text-slate-400 font-normal">R$</span>
      <span className="text-slate-800 font-semibold tabular-nums">
        {Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );
};

// Composições do Banco do SISTEMA (SINAPI, SICRO, GOINFRA)
export default function BancoSistemaComposicoes() {
  const [bancos, setBancos] = useState<string[]>([]);
  const [composicoes, setComposicoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [bancoFiltro, setBancoFiltro] = useState('');
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Estado para deleção de base
  const [isDeletarModalOpen, setIsDeletarModalOpen] = useState(false);
  const [deletando, setDeletando] = useState(false);
  const [deletaProgresso, setDeletaProgresso] = useState('');

  // Estado para visualização de detalhes em Modal
  const [composicaoSelecionada, setComposicaoSelecionada] = useState<any | null>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [loadingItens, setLoadingItens] = useState(false);

  // CDU calculado on-demand para a composição selecionada no modal
  const [cduModal, setCduModal] = useState<{ sem_deson: number; desonerado: number; sem_encargos: number } | null>(null);
  const [loadingCdu, setLoadingCdu] = useState(false);

  // Paginação
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Estado de Ordenação Dinâmica por Coluna
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

  // Larguras das Colunas da Tabela Principal (Ajustáveis e Otimizadas)
  const [colWidths, setColWidths] = useState<Record<string, number>>({
    codigo: 95,
    descricao: 320,
    atividade: 150,
    unidade: 65,
    sem_deson: 110,
    desonerado: 110,
    sem_encargos: 110,
    data_base: 90,
    banco: 85,
    acao: 75
  });

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

  // Larguras das Colunas do Modal (Ajustáveis)
  const [modalColWidths, setModalColWidths] = useState<Record<string, number>>({
    tipo: 80,
    codigo: 90,
    descricao: 320,
    unidade: 60,
    coeficiente: 100,
    sem_deson: 140,
    desonerado: 140,
    sem_encargos: 140
  });

  const startModalResize = (col: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = modalColWidths[col] || 100;

    const doDrag = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(40, startWidth + (moveEvent.clientX - startX));
      setModalColWidths(prev => ({ ...prev, [col]: newWidth }));
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  const renderModalHeaderCell = (field: string, label: string, align: 'left' | 'right' | 'center' = 'left') => {
    const width = modalColWidths[field];
    return (
      <th
        style={{ width: width, minWidth: width, position: 'relative' }}
        className={`px-4 py-2.5 select-none overflow-hidden whitespace-nowrap truncate ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`}
      >
        <span className="truncate block">{label}</span>
        <div
          onMouseDown={(e) => startModalResize(field, e)}
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 bg-slate-200/50 transition-colors"
        />
      </th>
    );
  };

  // Busca inicial das fontes de composições dinâmicas
  useEffect(() => {
    fetchBancos();
  }, []);

  const fetchBancos = async () => {
    try {
      const { data, error } = await supabase.schema('engenharia').from('v_fontes_composicao').select('*');
      if (data && !error) {
        const final = data
          .map((i: any) => i.fonte)
          .filter(Boolean)
          .filter((f: string) => !['Própria', 'PROPRIA', 'Propria'].includes(f))
          .sort() as string[];
        setBancos(final);
        if (final.length > 0 && (!bancoFiltro || !final.includes(bancoFiltro))) {
          setBancoFiltro(final[0]);
        } else if (final.length === 0) {
          setBancoFiltro('');
        }
      }
    } catch (err) {
      console.error('Erro ao carregar fontes de composição:', err);
    }
  };

  // Carrega as categorias (grupos) da base selecionada
  useEffect(() => {
    if (bancoFiltro) {
      fetchCategorias();
      setPage(1);
      setComposicaoSelecionada(null);
    }
  }, [bancoFiltro]);

  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabase.schema('engenharia')
        .from('composicoes')
        .select('tipo_atividade')
        .eq('fonte', bancoFiltro);
      
      if (!error && data) {
        const unicas = Array.from(new Set(data.map(i => i.tipo_atividade).filter(Boolean))).sort() as string[];
        setCategorias(unicas);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Debounce do campo de busca
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
      setComposicaoSelecionada(null);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Carrega as composições
  useEffect(() => {
    if (bancoFiltro) {
      fetchComposicoes();
    }
  }, [bancoFiltro, page, debouncedSearch, categoriaFiltro, sortField, sortDirection]);

  const fetchComposicoes = async () => {
    setLoading(true);
    try {
      // Usa a tabela base (sem CDU calculado) para listagem - muito mais rápido
      // CDU é calculado on-demand apenas quando o usuário abre uma composição
      let query = supabase.schema('engenharia')
        .from('composicoes')
        .select('*', { count: 'exact' })
        .eq('fonte', bancoFiltro);

      if (debouncedSearch.trim()) {
        query = query.or(`descricao.ilike.%${debouncedSearch.trim()}%,codigo.ilike.%${debouncedSearch.trim()}%`);
      }

      if (categoriaFiltro) {
        query = query.eq('tipo_atividade', categoriaFiltro);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let sortCol = 'codigo';
      let sortAsc = true;
      if (sortField) {
        sortAsc = sortDirection === 'asc';
        switch (sortField) {
          case 'codigo': sortCol = 'codigo'; break;
          case 'descricao': sortCol = 'descricao'; break;
          case 'atividade': sortCol = 'tipo_atividade'; break;
          case 'unidade': sortCol = 'unidade'; break;
          case 'data_base': sortCol = 'data_base'; break;
          case 'banco': sortCol = 'fonte'; break;
          default: sortCol = 'codigo'; break;
        }
      }

      const { data, count, error } = await query
        .order(sortCol, { ascending: sortAsc })
        .range(from, to);

      if (error) {
        console.error(error);
      } else {
        setComposicoes(data || []);
        setTotalCount(count || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Calcula o CDU de um conjunto de itens diretamente no cliente
  const computeCduFromItens = (items: any[], comp: any) => {
    let sem_deson = 0;
    let desonerado = 0;
    let sem_encargos = 0;

    const isSicro = comp?.fonte?.toUpperCase().includes('SICRO');
    const producao = Number(comp?.producao_equipe ?? 1) || 1;
    const ficVal = Number(comp?.fic_factor ?? 0) || 0;
    const tempoFixo = Number(comp?.custo_tempo_fixo ?? 0) || 0;
    const custoTransporte = Number(comp?.custo_transporte ?? 0) || 0;

    if (isSicro) {
      let eq_total_sem_deson = 0;
      let eq_total_deson = 0;
      let eq_total_sem_enc = 0;
      
      let mo_total_sem_deson = 0;
      let mo_total_deson = 0;
      let mo_total_sem_enc = 0;

      let eq_improd_total_sem_deson = 0;
      let eq_improd_total_deson = 0;
      let eq_improd_total_sem_enc = 0;

      let mat_total_sem_deson = 0;
      let mat_total_deson = 0;
      let mat_total_sem_enc = 0;

      items.forEach((item: any) => {
        // Ignorar itens de Tempo Fixo (E) e Transporte (F) para evitar somá-los como materiais
        if (item.secao_sicro === 'E' || item.secao_sicro === 'F') return;

        const coef = Number(item.coeficiente) || 0;
        const perda = Number(item.perda_percentual) || 0;
        const mult = coef * (1 + perda / 100);

        if (item.insumo) {
          const ins = item.insumo;
          const vSemDeson   = Number(ins.valor_nao_desonerado ?? ins.valor ?? 0);
          const vDesonerado = Number(ins.valor_desonerado ?? ins.valor ?? 0);
          const vSemEnc     = Number(ins.valor_sem_encargos ?? ins.valor ?? 0);

          // Identificar se é equipamento ou mão de obra pela secao_sicro se disponível
          const isEq = item.secao_sicro ? item.secao_sicro === 'A' : (ins.tipo === 'Equipamento');
          const isMo = item.secao_sicro ? item.secao_sicro === 'B' : (ins.tipo === 'Mão de Obra');
          const isMat = item.secao_sicro ? item.secao_sicro === 'C' : (ins.tipo !== 'Equipamento' && ins.tipo !== 'Mão de Obra');

          if (isEq) {
            const vOpSemDeson = Number(ins.valor_nao_desonerado_operativo ?? 0);
            const vOpDesonerado = Number(ins.valor_desonerado_operativo ?? 0);
            
            const vImpSemDeson = Number(ins.valor_nao_desonerado_improdutivo ?? 0);
            const vImpDesonerado = Number(ins.valor_desonerado_improdutivo ?? 0);

            eq_total_sem_deson += (vOpSemDeson > 0 ? vOpSemDeson : vSemDeson) * mult;
            eq_total_deson     += (vOpDesonerado > 0 ? vOpDesonerado : vDesonerado) * mult;
            eq_total_sem_enc   += (vOpDesonerado > 0 ? vOpDesonerado : vSemEnc) * mult;

            eq_improd_total_sem_deson += vImpSemDeson * mult;
            eq_improd_total_deson     += vImpDesonerado * mult;
            eq_improd_total_sem_enc   += vImpDesonerado * mult;
          } else if (isMo) {
            mo_total_sem_deson += vSemDeson * mult;
            mo_total_deson     += vDesonerado * mult;
            mo_total_sem_enc   += vSemEnc * mult;
          } else if (isMat) {
            mat_total_sem_deson += vSemDeson * mult;
            mat_total_deson     += vDesonerado * mult;
            mat_total_sem_enc   += vSemEnc * mult;
          }
        } else if (item.sub_composicao) {
          mat_total_sem_deson += Number(item.sub_composicao.cdu_sem_desoneracao ?? 0) * mult;
          mat_total_deson     += Number(item.sub_composicao.cdu_desonerado ?? 0) * mult;
          mat_total_sem_enc   += Number(item.sub_composicao.cdu_sem_encargos ?? 0) * mult;
        }
      });

      // Custo Unitário de Execução
      const exec_sem_deson = (eq_total_sem_deson + mo_total_sem_deson) / producao;
      const exec_deson     = (eq_total_deson + mo_total_deson) / producao;
      const exec_sem_enc   = (eq_total_sem_enc   + mo_total_sem_enc) / producao;

      // Custo do FIC
      const fic_sem_deson = ((mo_total_sem_deson + eq_improd_total_sem_deson) * ficVal) / producao;
      const fic_deson     = ((mo_total_deson + eq_improd_total_deson) * ficVal) / producao;
      const fic_sem_enc   = ((mo_total_sem_enc + eq_improd_total_sem_enc) * ficVal) / producao;

      // NOTA: ativAux NÃO é adicionado aqui porque sub_composicao já é somado em mat_total_sem_deson acima!
      sem_deson    = exec_sem_deson + fic_sem_deson + mat_total_sem_deson + tempoFixo + custoTransporte;
      desonerado   = exec_deson + fic_deson + mat_total_deson + tempoFixo + custoTransporte;
      sem_encargos = exec_sem_enc + fic_sem_enc + mat_total_sem_enc + tempoFixo + custoTransporte;
    } else {
      // Outras fontes (SINAPI, GOINFRA)
      items.forEach((item: any) => {
        const coef = Number(item.coeficiente) || 0;
        const perda = Number(item.perda_percentual) || 0;
        const mult = coef * (1 + perda / 100);

        if (item.insumo) {
          const ins = item.insumo;
          const vSemDeson   = Number(ins.valor_nao_desonerado ?? ins.valor ?? 0);
          const vDesonerado = Number(ins.valor_desonerado ?? ins.valor ?? 0);
          const vSemEnc     = Number(ins.valor_sem_encargos ?? ins.valor ?? 0);

          const vOpSemDeson = Number(ins.valor_nao_desonerado_operativo ?? 0);
          const vOpDesonerado = Number(ins.valor_desonerado_operativo ?? 0);
          const useOp = ins.tipo === 'Equipamento' && vOpSemDeson > 0;

          sem_deson    += (useOp ? vOpSemDeson   : vSemDeson) * mult;
          desonerado   += (useOp ? vOpDesonerado : vDesonerado) * mult;
          sem_encargos += (useOp ? vOpDesonerado : vSemEnc) * mult;
        } else if (item.sub_composicao) {
          const subCostSemDeson = Number(item.sub_composicao.custo_sem_desoneracao || item.sub_composicao.cdu_sem_desoneracao || 0);
          const subCostDeson = Number(item.sub_composicao.custo_desonerado || item.sub_composicao.cdu_desonerado || 0);
          const subCostSemEnc = Number(item.sub_composicao.custo_sem_encargos || item.sub_composicao.cdu_sem_encargos || 0);

          sem_deson    += subCostSemDeson * mult;
          desonerado   += subCostDeson * mult;
          sem_encargos += subCostSemEnc * mult;
        }
      });
    }

    return { sem_deson, desonerado, sem_encargos };
  };

  // Carrega os itens e calcula o CDU totalmente no cliente (sem chamar a view lenta)
  useEffect(() => {
    if (composicaoSelecionada) {
      fetchItens(composicaoSelecionada.id);
    } else {
      setCduModal(null);
    }
  }, [composicaoSelecionada]);

  const fetchItens = async (compId: string) => {
    setLoadingItens(true);
    setLoadingCdu(true);
    setCduModal(null);
    try {
      const { data, error } = await supabase.schema('engenharia')
        .from('composicao_itens')
        .select(`
          *,
          insumo:insumos (*),
          sub_composicao:composicoes!composicao_itens_sub_composicao_id_fkey (*)
        `)
        .eq('composicao_id', compId);

      if (!error && data) {
        // Para cada subcomposição, busca seus próprios itens e calcula o CDU deles no cliente
        const subCompIds = data
          .map((item: any) => item.sub_composicao_id)
          .filter(Boolean);
        
        if (subCompIds.length > 0) {
          const { data: subItens } = await supabase.schema('engenharia')
            .from('composicao_itens')
            .select('composicao_id, coeficiente, perda_percentual, insumo:insumos(*)')
            .in('composicao_id', subCompIds)
            .is('sub_composicao_id', null); // apenas insumos diretos
          
          if (subItens) {
            // Agrupa itens por composição
            const subMap = new Map<string, any[]>();
            subItens.forEach((si: any) => {
              if (!subMap.has(si.composicao_id)) subMap.set(si.composicao_id, []);
              subMap.get(si.composicao_id)!.push(si);
            });

            data.forEach((item: any) => {
              if (item.sub_composicao && subMap.has(item.sub_composicao_id)) {
                const subItemsList = subMap.get(item.sub_composicao_id)!;
                const cdu = computeCduFromItens(subItemsList, item.sub_composicao);
                item.sub_composicao.cdu_sem_desoneracao = cdu.sem_deson;
                item.sub_composicao.cdu_desonerado = cdu.desonerado;
                item.sub_composicao.cdu_sem_encargos = cdu.sem_encargos;
              }
            });
          }
        }

        setItens(data || []);

        // Calcula o CDU total no cliente a partir dos itens já carregados
        const cduCalculado = computeCduFromItens(data, composicaoSelecionada);
        setCduModal(cduCalculado);

      } else if (error) {
        console.error('Erro na query de itens:', error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingItens(false);
      setLoadingCdu(false);
    }
  };

  // Clona uma composição do sistema para o Banco Próprio
  const handleImportarComposicao = async (comp: any) => {
    const novoCodigo = `${comp.codigo}-PROPRIO`;
    const confirmacao = window.confirm(
      `Deseja importar a composição "${comp.codigo}" para o Banco Próprio?\nEla será cadastrada como "${novoCodigo}" e poderá ser editada livremente.`
    );
    if (!confirmacao) return;

    try {
      // 1. Insere o cabeçalho no Banco Próprio
      const { data: novaComp, error: compError } = await supabase.schema('engenharia')
        .from('composicoes')
        .insert([{
          codigo: novoCodigo,
          descricao: `[CÓPIA] ${comp.descricao}`,
          unidade: comp.unidade,
          tipo_atividade: comp.tipo_atividade,
          fonte: 'Próprio',
          custo_sem_desoneracao: comp.custo_sem_desoneracao,
          custo_desonerado: comp.custo_desonerado,
          custo_sem_encargos: comp.custo_sem_encargos
        }])
        .select()
        .single();

      if (compError) {
        if (compError.message.includes('unique_violation') || compError.message.includes('already exists')) {
          alert('Esta composição já foi importada anteriormente para o Banco Próprio.');
        } else {
          alert(`Erro ao importar composição: ${compError.message}`);
        }
        return;
      }

      // 2. Busca os itens da composição original
      const { data: itensOriginais, error: itensError } = await supabase.schema('engenharia')
        .from('composicao_itens')
        .select('*')
        .eq('composicao_id', comp.id);

      if (itensError) throw itensError;

      // 3. Copia todos os itens
      if (itensOriginais && itensOriginais.length > 0) {
        const novosItens = itensOriginais.map(item => ({
          composicao_id: novaComp.id,
          insumo_id: item.insumo_id,
          sub_composicao_id: item.sub_composicao_id,
          coeficiente: item.coeficiente,
          perda_percentual: item.perda_percentual,
          secao_sicro: item.secao_sicro,
          codigo_auxiliar: item.codigo_auxiliar,
          codigo_ln: item.codigo_ln,
          codigo_rp: item.codigo_rp,
          codigo_p: item.codigo_p,
          preco_unitario: item.preco_unitario,
          preco_unitario_improdutivo: item.preco_unitario_improdutivo
        }));

        const { error: insertItensError } = await supabase.schema('engenharia')
          .from('composicao_itens')
          .insert(novosItens);

        if (insertItensError) throw insertItensError;
      }

      alert(`Composição importada com sucesso! Você pode encontrá-la na tela de Banco Próprio.`);
    } catch (err: any) {
      console.error(err);
      alert(`Erro no processo de importação: ${err.message}`);
    }
  };

  const handleMudarBanco = (banco: string) => {
    setBancoFiltro(banco);
    setCategoriaFiltro('');
    setPage(1);
  };

  const handleDeletarBase = async () => {
    if (!bancoFiltro) return;
    setDeletando(true);
    setDeletaProgresso(`Deletando composições da base "${bancoFiltro}"...`);
    try {
      // Deletar as composições (o CASCADE do PostgreSQL deleta composicao_itens automaticamente)
      const { error: delCompsErr } = await supabase.schema('engenharia')
        .from('composicoes')
        .delete()
        .eq('fonte', bancoFiltro);
      
      if (delCompsErr) throw delCompsErr;

      setDeletaProgresso(`✅ Base "${bancoFiltro}" deletada com sucesso! Atualizando...`);

      // Recarregar fontes e resetar
      await fetchBancos();
      setBancoFiltro('');
      setComposicoes([]);
      setTotalCount(0);
      setCategorias([]);
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
              ? 'bg-slate-800 text-white border-transparent'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          {pageNum}
        </button>
      );
    });
  };

  // Cômputo de totais específicos do SICRO para o Modal de Detalhes
  const sicro_isSicro = composicaoSelecionada?.fonte?.toUpperCase().includes('SICRO');
  const sicro_producao = Number(composicaoSelecionada?.producao_equipe ?? 1) || 1;
  const sicro_ficVal = Number(composicaoSelecionada?.fic_factor ?? 0) || 0;
  const sicro_tempoFixo = Number(composicaoSelecionada?.custo_tempo_fixo ?? 0) || 0;
  const sicro_ativAux = Number(composicaoSelecionada?.custo_atividades_auxiliares ?? 0) || 0;
  const sicro_custo_transporte = Number(composicaoSelecionada?.custo_transporte ?? 0) || 0;

  let sicro_eq_total_sem_deson = 0;
  let sicro_eq_total_deson = 0;
  let sicro_eq_total_sem_enc = 0;
  
  let sicro_mo_total_sem_deson = 0;
  let sicro_mo_total_deson = 0;
  let sicro_mo_total_sem_enc = 0;

  let sicro_eq_improd_total_sem_deson = 0;
  let sicro_eq_improd_total_deson = 0;
  let sicro_eq_improd_total_sem_enc = 0;

  let sicro_material_total_sem_deson = 0;
  let sicro_material_total_deson = 0;
  let sicro_material_total_sem_enc = 0;

  let sicro_ativAux_total_sem_deson = 0;
  let sicro_ativAux_total_deson = 0;
  let sicro_ativAux_total_sem_enc = 0;

  if (sicro_isSicro && itens.length > 0) {
    itens.forEach((item: any) => {
      // Ignorar Tempo Fixo (E) e Transporte (F) no somatório de custos direto do loop
      if (item.secao_sicro === 'E' || item.secao_sicro === 'F') return;

      const coef = Number(item.coeficiente) || 0;
      const perda = Number(item.perda_percentual) || 0;
      const mult = coef * (1 + perda / 100);

      const ins = item.insumo;
      const sub = item.sub_composicao;
      const secao = item.secao_sicro;

      // Classificar conforme a secao_sicro se disponível, senão pelo tipo do insumo
      const isEq = secao ? secao === 'A' : (ins && ins.tipo === 'Equipamento');
      const isMo = secao ? secao === 'B' : (ins && ins.tipo === 'Mão de Obra');
      const isMat = secao ? secao === 'C' : (ins && ins.tipo !== 'Equipamento' && ins.tipo !== 'Mão de Obra' && !sub);
      const isAux = secao ? secao === 'D' : !!sub;

      if (ins) {
        const vSemDeson   = Number(ins.valor_nao_desonerado ?? ins.valor ?? 0);
        const vDesonerado = Number(ins.valor_desonerado ?? ins.valor ?? 0);
        const vSemEnc     = Number(ins.valor_sem_encargos ?? ins.valor ?? 0);

        if (isEq) {
          const vOpSemDeson = Number(ins.valor_nao_desonerado_operativo ?? 0);
          const vOpDesonerado = Number(ins.valor_desonerado_operativo ?? 0);
          
          const vImpSemDeson = Number(ins.valor_nao_desonerado_improdutivo ?? 0);
          const vImpDesonerado = Number(ins.valor_desonerado_improdutivo ?? 0);

          sicro_eq_total_sem_deson += (vOpSemDeson > 0 ? vOpSemDeson : vSemDeson) * mult;
          sicro_eq_total_deson     += (vOpDesonerado > 0 ? vOpDesonerado : vDesonerado) * mult;
          sicro_eq_total_sem_enc   += (vOpDesonerado > 0 ? vOpDesonerado : vSemEnc) * mult;

          sicro_eq_improd_total_sem_deson += vImpSemDeson * mult;
          sicro_eq_improd_total_deson     += vImpDesonerado * mult;
          sicro_eq_improd_total_sem_enc   += vImpDesonerado * mult;
        } else if (isMo) {
          sicro_mo_total_sem_deson += vSemDeson * mult;
          sicro_mo_total_deson     += vDesonerado * mult;
          sicro_mo_total_sem_enc   += vSemEnc * mult;
        } else if (isMat) {
          sicro_material_total_sem_deson += vSemDeson * mult;
          sicro_material_total_deson     += vDesonerado * mult;
          sicro_material_total_sem_enc   += vSemEnc * mult;
        }
      } else if (sub && isAux) {
        sicro_ativAux_total_sem_deson += Number(sub.cdu_sem_desoneracao ?? 0) * mult;
        sicro_ativAux_total_deson     += Number(sub.cdu_desonerado ?? 0) * mult;
        sicro_ativAux_total_sem_enc   += Number(sub.cdu_sem_encargos ?? 0) * mult;
      }
    });
  }

  const final_ativAux_sem_deson = sicro_ativAux_total_sem_deson > 0 ? sicro_ativAux_total_sem_deson : sicro_ativAux;
  const final_ativAux_deson     = sicro_ativAux_total_deson > 0 ? sicro_ativAux_total_deson : sicro_ativAux;
  const final_ativAux_sem_enc   = sicro_ativAux_total_sem_enc > 0 ? sicro_ativAux_total_sem_enc : sicro_ativAux;

  const sicro_fic_total_sem_deson = ((sicro_mo_total_sem_deson + sicro_eq_improd_total_sem_deson) * sicro_ficVal) / sicro_producao;
  const sicro_fic_total_deson     = ((sicro_mo_total_deson + sicro_eq_improd_total_deson) * sicro_ficVal) / sicro_producao;
  const sicro_fic_total_sem_enc   = ((sicro_mo_total_sem_enc + sicro_eq_improd_total_sem_enc) * sicro_ficVal) / sicro_producao;

  const sicro_exec_unitario = (sicro_eq_total_sem_deson + sicro_mo_total_sem_deson) / sicro_producao;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-slate-700 text-slate-100 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
              Banco do Sistema
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Composições de Referência</h2>
          <p className="text-slate-500 text-sm">Base de composições pública para consulta e importação</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 text-sm text-slate-500 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
              <Database className="w-4 h-4 text-amber-600" />
              <span>Somente leitura — importe para o Banco Próprio para editar</span>
            </div>
            {bancoFiltro && (
              <button
                onClick={() => setIsDeletarModalOpen(true)}
                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 hover:border-red-400 px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
                title={`Deletar toda a base ${bancoFiltro}`}
              >
                <Trash2 className="w-4 h-4" />
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
      {bancos.length > 0 && (
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
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={bancoFiltro ? `Buscar em ${bancoFiltro}...` : "Buscar..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none bg-white text-sm"
            />
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={categoriaFiltro}
              onChange={(e) => { setCategoriaFiltro(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm min-w-[200px]"
            >
              <option value="">Todas as Categorias / Grupos</option>
              {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 table-fixed">
            <thead className="bg-slate-100/80 text-slate-600 border-b border-slate-200 select-none font-bold text-[11px] uppercase tracking-wider">
              <tr>
                {renderHeaderCell('codigo', 'CÓDIGO')}
                {renderHeaderCell('descricao', 'DESCRIÇÃO')}
                {renderHeaderCell('atividade', 'ATIVIDADE / GRUPO')}
                {renderHeaderCell('unidade', 'UN')}
                <th style={{ width: 110, minWidth: 110 }} className="px-3 py-2.5 text-center font-bold text-[11px] uppercase tracking-wider text-slate-600">CUSTOS (CDU)</th>
                {renderHeaderCell('data_base', 'DATA REF.')}
                {renderHeaderCell('banco', 'BANCO')}
                <th style={{ width: colWidths.acao, minWidth: colWidths.acao }} className="px-3 py-2.5 text-center font-bold text-[11px] uppercase tracking-wider text-slate-600">AÇÃO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={9} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-7 h-7 border-3 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                    Carregando composições...
                  </div>
                </td></tr>
              ) : bancos.length === 0 ? (
                <tr><td colSpan={9} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <Layers className="w-9 h-9 text-slate-300" />
                    <p className="font-semibold text-slate-700">Nenhuma base de composições cadastrada</p>
                    <p className="text-xs text-slate-400">Clique em "Importar Planilha" para carregar dados do SINAPI, SICRO ou GOINFRA.</p>
                  </div>
                </td></tr>
              ) : composicoes.length === 0 ? (
                <tr><td colSpan={9} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <Layers className="w-9 h-9 text-slate-300" />
                    <p className="font-medium text-xs">Nenhuma composição encontrada</p>
                  </div>
                </td></tr>
              ) : composicoes.map((comp) => (
                <tr key={comp.id} className="hover:bg-blue-50/40 transition-colors group">
                  <td 
                    style={{ width: colWidths.codigo, minWidth: colWidths.codigo, maxWidth: colWidths.codigo }}
                    onClick={() => setComposicaoSelecionada(comp)}
                    className="px-3 py-2 font-mono font-extrabold text-blue-600 hover:underline text-xs truncate cursor-pointer"
                  >
                    {comp.codigo}
                  </td>
                  <td 
                    style={{ width: colWidths.descricao, minWidth: colWidths.descricao, maxWidth: colWidths.descricao }}
                    onClick={() => setComposicaoSelecionada(comp)}
                    className="px-3 py-2 truncate font-semibold text-slate-900 hover:text-blue-600 cursor-pointer text-xs" 
                    title={comp.descricao}
                  >
                    {comp.descricao}
                  </td>
                  <td style={{ width: colWidths.atividade, minWidth: colWidths.atividade, maxWidth: colWidths.atividade }} className="px-3 py-2 truncate text-xs text-slate-600 font-medium text-center" title={comp.tipo_atividade}>
                    {comp.tipo_atividade || 'Geral'}
                  </td>
                  <td style={{ width: colWidths.unidade, minWidth: colWidths.unidade, maxWidth: colWidths.unidade }} className="px-3 py-2 text-slate-600 font-mono truncate text-[11px]">{comp.unidade}</td>
                  <td style={{ width: 110, minWidth: 110 }} className="px-3 py-2 text-center">
                    <button
                      onClick={() => setComposicaoSelecionada(comp)}
                      className="text-[11px] text-blue-700 font-bold flex items-center gap-0.5 mx-auto px-2 py-0.5 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors cursor-pointer"
                    >
                      Custos →
                    </button>
                  </td>
                  <td style={{ width: colWidths.data_base, minWidth: colWidths.data_base, maxWidth: colWidths.data_base }} className="px-3 py-2 text-slate-600 font-mono truncate text-[11px]">
                    {comp.data_base ? comp.data_base.split('-').reverse().join('/') : '-'}
                  </td>
                  <td style={{ width: colWidths.banco, minWidth: colWidths.banco, maxWidth: colWidths.banco }} className="px-3 py-2 truncate text-[11px]">
                    <span className="px-1.5 py-0.5 rounded font-bold border bg-blue-50 text-blue-700 border-blue-200">
                      {comp.fonte}
                    </span>
                  </td>
                  <td style={{ width: colWidths.acao, minWidth: colWidths.acao, maxWidth: colWidths.acao }} className="px-3 py-2 text-center">
                    <button 
                      onClick={() => handleImportarComposicao(comp)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-blue-700 font-bold flex items-center gap-1 mx-auto whitespace-nowrap px-2 py-0.5 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 cursor-pointer"
                    >
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
              <span className="font-semibold text-slate-700">{totalCount}</span> composições em {bancoFiltro}
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

      {/* Modal de Detalhes da Composição do Sistema */}
      {composicaoSelecionada && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-800">
                  Estrutura da Composição: {composicaoSelecionada.codigo}
                </h2>
              </div>
              <button 
                onClick={() => setComposicaoSelecionada(null)} 
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {/* Informações Principais */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <p className="font-semibold text-slate-800 text-lg">{composicaoSelecionada.descricao}</p>
                  <p className="text-xs text-slate-500">
                    Fonte: <strong className="text-slate-700">{composicaoSelecionada.fonte}</strong> | 
                    Grupo: <strong className="text-slate-700">{composicaoSelecionada.tipo_atividade || 'Geral'}</strong> | 
                    Unidade: <strong className="text-slate-700">{composicaoSelecionada.unidade}</strong>
                  </p>
                </div>
                
                {/* CDU calculado on-demand */}
                <div className="flex flex-row items-center gap-4 bg-white px-4 py-3 rounded-lg border border-slate-200 shrink-0">
                  {loadingCdu ? (
                    <span className="text-xs text-slate-400 animate-pulse">Calculando custos...</span>
                  ) : (
                    <>
                      <div className="flex flex-col min-w-[100px]">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Sem Deson.</span>
                        <span className="text-sm font-extrabold text-slate-800 tabular-nums mt-0.5">
                          {`R$ ${Number(composicaoSelecionada.custo_sem_desoneracao || cduModal?.sem_deson || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </span>
                      </div>
                      <div className="h-6 w-px bg-slate-200" />
                      <div className="flex flex-col min-w-[100px]">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Desonerado</span>
                        <span className="text-sm font-extrabold text-blue-600 tabular-nums mt-0.5">
                          {`R$ ${Number(composicaoSelecionada.custo_desonerado || cduModal?.desonerado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </span>
                      </div>
                      <div className="h-6 w-px bg-slate-200" />
                      <div className="flex flex-col min-w-[100px]">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Sem Encarg.</span>
                        <span className="text-sm font-extrabold text-slate-800 tabular-nums mt-0.5">
                          {`R$ ${Number(composicaoSelecionada.custo_sem_encargos || cduModal?.sem_encargos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Itens */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-200 font-bold text-slate-700 text-sm">
                  Itens da Composição (Insumos e Subcomposições)
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm table-fixed">
                    <thead className="bg-slate-50 text-slate-500 font-medium text-xs uppercase tracking-wider border-b border-slate-200 select-none">
                      <tr>
                        {renderModalHeaderCell('tipo', 'Tipo')}
                        {renderModalHeaderCell('codigo', 'Código')}
                        {renderModalHeaderCell('descricao', 'Descrição')}
                        {renderModalHeaderCell('unidade', 'Und')}
                        {renderModalHeaderCell('coeficiente', 'Coeficiente', 'right')}
                        {renderModalHeaderCell('sem_deson', 'Sem Deson.', 'right')}
                        {renderModalHeaderCell('desonerado', 'Desonerado', 'right')}
                        {renderModalHeaderCell('sem_encargos', 'Sem Encarg.', 'right')}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loadingItens ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            <div className="flex justify-center items-center gap-2">
                              <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                              Buscando itens...
                            </div>
                          </td>
                        </tr>
                      ) : itens.filter(item => !item.secao_sicro || !['E', 'F'].includes(item.secao_sicro)).length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                            Nenhum item padrão (A, B, C, D) associado a esta composição no banco de dados.
                          </td>
                        </tr>
                      ) : (
                        itens
                          .filter(item => !item.secao_sicro || !['E', 'F'].includes(item.secao_sicro))
                          .map(item => {
                          const ins = item.insumo;
                          const sub = item.sub_composicao;
                          
                          const codigo = ins ? ins.codigo : sub?.codigo;
                          const desc = ins ? ins.descricao : sub?.descricao;
                          const und = ins ? ins.unidade : sub?.unidade;
                          const tipo = ins ? ins.tipo : 'Subcomposição';

                          const valorSemDeson = ins
                            ? (ins.valor_nao_desonerado || ins.valor || 0)
                            : (sub?.custo_sem_desoneracao || sub?.cdu_sem_desoneracao || 0);

                          const valorDeson = ins
                            ? (ins.valor_desonerado || ins.valor || 0)
                            : (sub?.custo_desonerado || sub?.cdu_desonerado || 0);

                          const valorSemEncargos = ins
                            ? (ins.valor_sem_encargos || ins.valor || 0)
                            : (sub?.custo_sem_encargos || sub?.cdu_sem_encargos || 0);

                          const coef = parseFloat(item.coeficiente || '0');
                          
                          const totalSemDeson = valorSemDeson * coef;
                          const totalDeson = valorDeson * coef;
                          const totalSemEncargos = valorSemEncargos * coef;

                          return (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                              <td style={{ width: modalColWidths.tipo, minWidth: modalColWidths.tipo, maxWidth: modalColWidths.tipo }} className="px-4 py-2.5 truncate">
                                <span className={clsx(
                                  'text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase whitespace-nowrap',
                                  ins 
                                    ? 'bg-slate-100 text-slate-600 border-slate-200' 
                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                )}>
                                  {tipo}
                                </span>
                              </td>
                              {/* Código clicável redirecionando para a tela de Insumos */}
                              <td style={{ width: modalColWidths.codigo, minWidth: modalColWidths.codigo, maxWidth: modalColWidths.codigo }} className="px-4 py-2.5 font-mono text-xs text-slate-500 truncate">
                                {ins ? (
                                  <Link 
                                    to={`/banco-sistema/insumos?search=${codigo}&banco=${bancoFiltro}`}
                                    className="text-blue-600 hover:underline hover:text-blue-800 font-semibold"
                                    title="Ver insumo detalhado"
                                  >
                                    {codigo}
                                  </Link>
                                ) : (
                                  <span>{codigo}</span>
                                )}
                              </td>
                              <td style={{ width: modalColWidths.descricao, minWidth: modalColWidths.descricao, maxWidth: modalColWidths.descricao }} className="px-4 py-2.5 font-medium text-slate-800 truncate text-xs" title={desc}>{desc}</td>
                              <td style={{ width: modalColWidths.unidade, minWidth: modalColWidths.unidade, maxWidth: modalColWidths.unidade }} className="px-4 py-2.5 text-slate-500 truncate text-xs">{und}</td>
                              <td style={{ width: modalColWidths.coeficiente, minWidth: modalColWidths.coeficiente, maxWidth: modalColWidths.coeficiente }} className="px-4 py-2.5 text-right font-mono text-slate-700 tabular-nums text-xs">
                                {Number(item.coeficiente).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                              </td>
                              {/* Custo Sem Desoneração Contábil */}
                              <td style={{ width: modalColWidths.sem_deson, minWidth: modalColWidths.sem_deson, maxWidth: modalColWidths.sem_deson }} className="px-4 py-2.5 text-right tabular-nums">
                                {renderValorContabil(valorSemDeson)}
                                <div className="text-[10px] text-slate-400 mt-0.5 flex justify-between gap-1 select-none w-full border-t border-slate-100/60 pt-0.5">
                                  <span>T: R$</span>
                                  <span className="font-medium">
                                    {totalSemDeson.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </td>
                              {/* Custo Desonerado Contábil */}
                              <td style={{ width: modalColWidths.desonerado, minWidth: modalColWidths.desonerado, maxWidth: modalColWidths.desonerado }} className="px-4 py-2.5 text-right tabular-nums">
                                {renderValorContabil(valorDeson)}
                                <div className="text-[10px] text-slate-400 mt-0.5 flex justify-between gap-1 select-none w-full border-t border-slate-100/60 pt-0.5">
                                  <span>T: R$</span>
                                  <span className="font-medium">
                                    {totalDeson.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </td>
                              {/* Custo Sem Encargos Contábil */}
                              <td style={{ width: modalColWidths.sem_encargos, minWidth: modalColWidths.sem_encargos, maxWidth: modalColWidths.sem_encargos }} className="px-4 py-2.5 text-right tabular-nums">
                                {renderValorContabil(valorSemEncargos)}
                                <div className="text-[10px] text-slate-400 mt-0.5 flex justify-between gap-1 select-none w-full border-t border-slate-100/60 pt-0.5">
                                  <span>T: R$</span>
                                  <span className="font-medium">
                                    {totalSemEncargos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tabelas de Seções E e F (Tempo Fixo e Transporte) para SICRO */}
              {sicro_isSicro && itens.some(item => item.secao_sicro === 'E') && (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white mt-4">
                  <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-200 font-bold text-slate-700 text-sm">
                    E - TEMPO FIXO
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm table-fixed">
                      <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase border-b border-slate-200 select-none">
                        <tr>
                          <th className="px-4 py-2" style={{ width: '12%' }}>Código</th>
                          <th className="px-4 py-2" style={{ width: '33%' }}>Descrição do Material</th>
                          <th className="px-4 py-2" style={{ width: '15%' }}>Código Equip.</th>
                          <th className="px-4 py-2 text-right" style={{ width: '10%' }}>Quantidade</th>
                          <th className="px-4 py-2" style={{ width: '5%' }}>Unidade</th>
                          <th className="px-4 py-2 text-right" style={{ width: '12%' }}>Custo Unitário</th>
                          <th className="px-4 py-2 text-right" style={{ width: '13%' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {itens.filter(item => item.secao_sicro === 'E').map(item => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 font-mono text-xs text-slate-500 truncate">{item.insumo?.codigo || item.child_codigo}</td>
                            <td className="px-4 py-2.5 text-slate-800 text-xs truncate" title={item.insumo?.descricao}>{item.insumo?.descricao}</td>
                            <td className="px-4 py-2.5 font-mono text-xs text-slate-500 truncate">{item.codigo_auxiliar}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-700 text-xs">
                              {Number(item.coeficiente).toLocaleString('pt-BR', { minimumFractionDigits: 5, maximumFractionDigits: 5 })}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 text-xs">t</td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-700 text-xs">
                              {`R$ ${Number(item.preco_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-700 text-xs">
                              {`R$ ${Number((item.coeficiente || 0) * (item.preco_unitario || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {sicro_isSicro && itens.some(item => item.secao_sicro === 'F') && (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white mt-4">
                  <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-200 font-bold text-slate-700 text-sm">
                    F - MOMENTO DE TRANSPORTE
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm table-fixed">
                      <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase border-b border-slate-200 select-none">
                        <tr>
                          <th className="px-4 py-2" style={{ width: '15%' }}>Código</th>
                          <th className="px-4 py-2" style={{ width: '30%' }}>Descrição do Material</th>
                          <th className="px-4 py-2 text-right" style={{ width: '10%' }}>Quantidade</th>
                          <th className="px-4 py-2" style={{ width: '10%' }}>Unidade</th>
                          <th className="px-4 py-2" style={{ width: '11%' }}>LN</th>
                          <th className="px-4 py-2" style={{ width: '12%' }}>RP</th>
                          <th className="px-4 py-2" style={{ width: '12%' }}>P</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {itens.filter(item => item.secao_sicro === 'F').map(item => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 font-mono text-xs text-slate-500 truncate">{item.insumo?.codigo || item.child_codigo}</td>
                            <td className="px-4 py-2.5 text-slate-800 text-xs truncate" title={item.insumo?.descricao}>{item.insumo?.descricao}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-700 text-xs">
                              {Number(item.coeficiente).toLocaleString('pt-BR', { minimumFractionDigits: 5, maximumFractionDigits: 5 })}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 text-xs">tkm</td>
                            <td className="px-4 py-2.5 font-mono text-xs text-slate-500 truncate">{item.codigo_ln || '-'}</td>
                            <td className="px-4 py-2.5 font-mono text-xs text-slate-500 truncate">{item.codigo_rp || '-'}</td>
                            <td className="px-4 py-2.5 font-mono text-xs text-slate-500 truncate">{item.codigo_p || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {sicro_isSicro && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mt-4 space-y-4">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                      Detalhamento dos Custos (SICRO)
                    </h4>
                    <div className="flex gap-4 text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg font-medium">
                      <span>Produção da Equipe: <strong className="text-slate-800">{sicro_producao.toLocaleString('pt-BR', { minimumFractionDigits: 5 })} {composicaoSelecionada.unidade}</strong></span>
                      <span>Fator FIC: <strong className="text-slate-800">{(sicro_ficVal * 100).toLocaleString('pt-BR', { minimumFractionDigits: 3 })}%</strong></span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-200 bg-white rounded-lg overflow-hidden">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-4 py-2.5">Componente de Custo</th>
                          <th className="px-4 py-2.5 text-right">Sem Desoneração (R$)</th>
                          <th className="px-4 py-2.5 text-right">Desonerado (R$)</th>
                          <th className="px-4 py-2.5 text-right">Sem Encargos (R$)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                        <tr>
                          <td className="px-4 py-2.5 font-sans font-medium text-slate-600">Total Equipamentos (A - Horário)</td>
                          <td className="px-4 py-2.5 text-right">{sicro_eq_total_sem_deson.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                          <td className="px-4 py-2.5 text-right">{sicro_eq_total_deson.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                          <td className="px-4 py-2.5 text-right">{sicro_eq_total_sem_enc.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 font-sans font-medium text-slate-600">Total Mão de Obra (B - Horário)</td>
                          <td className="px-4 py-2.5 text-right">{sicro_mo_total_sem_deson.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                          <td className="px-4 py-2.5 text-right">{sicro_mo_total_deson.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                          <td className="px-4 py-2.5 text-right">{sicro_mo_total_sem_enc.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                        </tr>
                        <tr className="bg-slate-50/50 font-bold">
                          <td className="px-4 py-2.5 font-sans text-slate-800">1. Custo Unitário de Execução ((A + B) / Prod)</td>
                          <td className="px-4 py-2.5 text-right text-slate-800">{sicro_exec_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                          <td className="px-4 py-2.5 text-right text-slate-800">{( (sicro_eq_total_deson + sicro_mo_total_deson) / sicro_producao ).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                          <td className="px-4 py-2.5 text-right text-slate-800">{( (sicro_eq_total_sem_enc + sicro_mo_total_sem_enc) / sicro_producao ).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 font-sans font-medium text-slate-600">2. Custo do FIC (((B + Equip.Improd) * FIC) / Prod)</td>
                          <td className="px-4 py-2.5 text-right">{sicro_fic_total_sem_deson.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                          <td className="px-4 py-2.5 text-right">{sicro_fic_total_deson.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                          <td className="px-4 py-2.5 text-right">{sicro_fic_total_sem_enc.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 font-sans font-medium text-slate-600">3. Custo Unitário Total de Material (C)</td>
                          <td className="px-4 py-2.5 text-right">{sicro_material_total_sem_deson.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                          <td className="px-4 py-2.5 text-right">{sicro_material_total_deson.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                          <td className="px-4 py-2.5 text-right">{sicro_material_total_sem_enc.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 font-sans font-medium text-slate-600">4. Custo Total de Atividades Auxiliares (D)</td>
                          <td className="px-4 py-2.5 text-right">{final_ativAux_sem_deson.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                          <td className="px-4 py-2.5 text-right">{final_ativAux_deson.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                          <td className="px-4 py-2.5 text-right">{final_ativAux_sem_enc.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 font-sans font-medium text-slate-600">5. Custo Unitário Total de Tempo Fixo (E)</td>
                          <td className="px-4 py-2.5 text-right">{sicro_tempoFixo.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                          <td className="px-4 py-2.5 text-right">{sicro_tempoFixo.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                          <td className="px-4 py-2.5 text-right">{sicro_tempoFixo.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 font-sans font-medium text-slate-600">6. Custo Unitário Total de Transporte (F)</td>
                          <td className="px-4 py-2.5 text-right">{sicro_custo_transporte.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                          <td className="px-4 py-2.5 text-right">{sicro_custo_transporte.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                          <td className="px-4 py-2.5 text-right">{sicro_custo_transporte.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                        </tr>
                        <tr className="bg-blue-50/60 font-extrabold text-[13px] border-t-2 border-blue-200">
                          <td className="px-4 py-3.5 font-sans text-blue-800">CUSTO UNITÁRIO DIRETO TOTAL (Final)</td>
                          <td className="px-4 py-3.5 text-right text-blue-800">{( sicro_exec_unitario + sicro_fic_total_sem_deson + sicro_material_total_sem_deson + sicro_tempoFixo + final_ativAux_sem_deson + sicro_custo_transporte ).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3.5 text-right text-blue-800">{( ( (sicro_eq_total_deson + sicro_mo_total_deson) / sicro_producao ) + sicro_fic_total_deson + sicro_material_total_deson + sicro_tempoFixo + final_ativAux_deson + sicro_custo_transporte ).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3.5 text-right text-blue-800">{( ( (sicro_eq_total_sem_enc + sicro_mo_total_sem_enc) / sicro_producao ) + sicro_fic_total_sem_enc + sicro_material_total_sem_enc + sicro_tempoFixo + final_ativAux_sem_enc + sicro_custo_transporte ).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end items-center">
              <div className="flex gap-2">
                <button 
                  onClick={() => setComposicaoSelecionada(null)}
                  className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-200 rounded-lg transition-colors text-sm"
                >
                  Fechar
                </button>
                <button 
                  onClick={() => { handleImportarComposicao(composicaoSelecionada); setComposicaoSelecionada(null); }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-colors text-sm flex items-center gap-1.5"
                >
                  <ExternalLink className="w-4 h-4" />
                  Importar para Banco Próprio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ImportadorComposicoesModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={async (novoBanco) => {
          await fetchBancos();
          if (novoBanco) {
            setBancoFiltro(novoBanco);
            if (bancoFiltro === novoBanco) {
              fetchComposicoes();
            }
          } else {
            fetchComposicoes();
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
                        Todas as composições e seus itens vinculados a esta fonte serão removidos do banco de dados.
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
