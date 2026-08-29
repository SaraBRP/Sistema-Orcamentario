import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Search, Plus, Layers, Trash2, Edit2, X, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { clsx } from 'clsx';

export default function ComposicaoBuilder() {
  const { id } = useParams();
  const [composicao, setComposicao] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State para filtro unificado (código ou descrição) na tabela de itens
  const [searchTerm, setSearchTerm] = useState('');

  // States para ordenação interativa de colunas
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // States para o modal de adicionar item
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tipoItemAdicionar, setTipoItemAdicionar] = useState<'insumo' | 'subcomposicao'>('insumo');
  const [buscaInsumo, setBuscaInsumo] = useState('');
  const [itensEncontrados, setItensEncontrados] = useState<any[]>([]);
  const [isSearchingModal, setIsSearchingModal] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<any>(null);
  const [coeficiente, setCoeficiente] = useState<number | ''>('');
  const [perda, setPerda] = useState<number | ''>(0);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    // 1. Busca os dados da composição principal
    const { data: compData, error: compError } = await supabase
      .schema('engenharia')
      .from('composicoes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (compError) {
      console.error(compError);
      alert('Erro ao carregar composição.');
      setLoading(false);
      return;
    }
    setComposicao(compData);

    const { data: itensData, error: itensError } = await supabase
      .schema('engenharia')
      .from('composicao_itens')
      .select(`
        *,
        insumo:insumos (*),
        sub_composicao:composicoes!sub_composicao_id (*)
      `)
      .eq('composicao_id', id);

    if (itensError) {
      console.error(itensError);
      alert('Erro ao carregar itens da composição: ' + itensError.message);
    } else {
      let mergedItens = itensData || [];
      const subIds = mergedItens.map((i: any) => i.sub_composicao_id).filter(Boolean);
      if (subIds.length > 0) {
        try {
          const { data: cduData, error: cduError } = await supabase
            .schema('engenharia')
            .from('v_composicoes_cdu')
            .select('id, cdu, cdu_sem_desoneracao, cdu_desonerado, cdu_sem_encargos, mo_sem_desoneracao, mo_desonerado, mo_sem_encargos, mat_sem_desoneracao, mat_desonerado, mat_sem_encargos')
            .in('id', subIds);
          
          if (!cduError && cduData) {
            const cduMap = new Map(cduData.map((c: any) => [c.id, c]));
            mergedItens = mergedItens.map((item: any) => {
              if (item.sub_composicao_id && item.sub_composicao) {
                const cduInfo = cduMap.get(item.sub_composicao_id);
                if (cduInfo) {
                  return {
                     ...item,
                     sub_composicao: {
                       ...item.sub_composicao,
                       cdu: cduInfo.cdu,
                       cdu_sem_desoneracao: cduInfo.cdu_sem_desoneracao,
                       cdu_desonerado: cduInfo.cdu_desonerado,
                       cdu_sem_encargos: cduInfo.cdu_sem_encargos,
                       mo_sem_desoneracao: cduInfo.mo_sem_desoneracao,
                       mo_desonerado: cduInfo.mo_desonerado,
                       mo_sem_encargos: cduInfo.mo_sem_encargos,
                       mat_sem_desoneracao: cduInfo.mat_sem_desoneracao,
                       mat_desonerado: cduInfo.mat_desonerado,
                       mat_sem_encargos: cduInfo.mat_sem_encargos
                     }
                  };
                }
              }
              return item;
            });
          }
        } catch (cduErr) {
          console.error('Erro ao buscar CDUs das subcomposições:', cduErr);
        }
      }
      setItens(mergedItens);
    }
    
    setLoading(false);
  };

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

  const normalizeText = (text: string) => {
    return (text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  };

  const handleBuscarInsumos = useCallback(async () => {
    const termo = buscaInsumo.trim();
    if (termo.length < 2) {
      setItensEncontrados([]);
      setIsSearchingModal(false);
      return;
    }

    setIsSearchingModal(true);

    const tokens = termo.split(/\s+/).map(normalizeText).filter(Boolean);
    const mainToken = tokens.slice().sort((a, b) => b.length - a.length)[0] || '';

    let query = supabase
      .schema('engenharia')
      .from(tipoItemAdicionar === 'insumo' ? 'insumos' : 'v_composicoes_cdu')
      .select('*')
      .or(`descricao.ilike."%${mainToken}%",codigo.ilike."%${mainToken}%"`)
      .limit(300);

    if (tipoItemAdicionar === 'insumo') {
      query = query.in('fonte_preco', ['Cotação', 'Histórico']);
    } else {
      query = query.eq('fonte', 'Própria').neq('id', id);
    }
    
    const { data, error } = await query;
    setIsSearchingModal(false);
    
    if (!error && data) {
      // Filtra estritamente para garantir que TODAS as palavras digitadas estão no item
      const filtered = data.filter(item => {
        const fullText = normalizeText(`${item.codigo || ''} ${item.descricao || ''}`);
        return tokens.every(token => fullText.includes(token));
      });

      const sorted = filtered.sort((a, b) => {
        const aSource = a.fonte_preco || a.fonte || '';
        const bSource = b.fonte_preco || b.fonte || '';
        const aProprio = ['Cotação', 'Histórico', 'Própria'].includes(aSource);
        const bProprio = ['Cotação', 'Histórico', 'Própria'].includes(bSource);
        
        if (aProprio && !bProprio) return -1;
        if (!aProprio && bProprio) return 1;
        return (a.codigo || '').localeCompare(b.codigo || '');
      });
      setItensEncontrados(sorted);
    } else {
      console.error(error);
      setItensEncontrados([]);
    }
  }, [buscaInsumo, tipoItemAdicionar, id]);

  // Efeito de busca automática conforme o orçamentista digita no modal (AutoComplete com debounce de 200ms)
  useEffect(() => {
    if (!isModalOpen || itemSelecionado) return;
    const termo = buscaInsumo.trim();
    if (termo.length < 2) {
      setItensEncontrados([]);
      setIsSearchingModal(false);
      return;
    }
    const timer = setTimeout(() => {
      handleBuscarInsumos();
    }, 200);
    return () => clearTimeout(timer);
  }, [buscaInsumo, tipoItemAdicionar, isModalOpen, itemSelecionado, handleBuscarInsumos]);

  const handleAddItem = async () => {
    if (!itemSelecionado || !coeficiente) return;

    const payload: any = {
      composicao_id: id,
      coeficiente: typeof coeficiente === 'number' ? coeficiente : parseFloat(coeficiente),
      perda_percentual: typeof perda === 'number' ? perda : parseFloat(perda || '0')
    };

    if (tipoItemAdicionar === 'insumo') {
      payload.insumo_id = itemSelecionado.id;
    } else {
      payload.sub_composicao_id = itemSelecionado.id;
    }

    const { error } = await supabase
      .schema('engenharia')
      .from('composicao_itens')
      .insert(payload);

    if (error) {
      console.error(error);
      alert('Erro ao adicionar item: ' + error.message);
    } else {
      fecharModal();
      fetchData();
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem || coeficiente === '') return;

    const payload = {
      coeficiente: typeof coeficiente === 'number' ? coeficiente : parseFloat(coeficiente),
      perda_percentual: typeof perda === 'number' ? perda : parseFloat(perda || '0')
    };

    const { error } = await supabase
      .schema('engenharia')
      .from('composicao_itens')
      .update(payload)
      .eq('id', editingItem.id);

    if (error) {
      console.error(error);
      alert('Erro ao atualizar item: ' + error.message);
    } else {
      setEditingItem(null);
      setCoeficiente('');
      setPerda(0);
      fetchData();
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('Remover este item da composição?')) return;

    const { error } = await supabase
      .schema('engenharia')
      .from('composicao_itens')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error(error);
      alert('Erro ao remover item.');
    } else {
      fetchData();
    }
  };

  const fecharModal = () => {
    setIsModalOpen(false);
    setItemSelecionado(null);
    setBuscaInsumo('');
    setItensEncontrados([]);
    setCoeficiente('');
    setPerda(0);
  };

  const handleAbrirEdicao = (item: any) => {
    setEditingItem(item);
    setCoeficiente(item.coeficiente);
    setPerda(item.perda_percentual || 0);
  };

  // Cálculo Geral dos Totais
  const totalMat = itens.reduce((total, item) => {
    let valorUnitMat = 0;
    if (item.insumo) {
      if (item.insumo.tipo !== 'Mão de Obra') {
        valorUnitMat = item.insumo.valor_nao_desonerado_operativo ?? item.insumo.valor ?? item.insumo.valor_nao_desonerado ?? 0;
      }
    } else if (item.sub_composicao) {
      valorUnitMat = item.sub_composicao.mat_sem_desoneracao ?? item.sub_composicao.custo_sem_desoneracao ?? item.sub_composicao.cdu ?? 0;
    }
    const coef = parseFloat(item.coeficiente || '0');
    const p = parseFloat(item.perda_percentual || '0');
    return total + (valorUnitMat * coef * (1 + (p / 100)));
  }, 0);

  const totalMo = itens.reduce((total, item) => {
    let valorUnitMo = 0;
    if (item.insumo) {
      if (item.insumo.tipo === 'Mão de Obra') {
        valorUnitMo = item.insumo.valor_desonerado ?? item.insumo.valor ?? 0;
      }
    } else if (item.sub_composicao) {
      valorUnitMo = item.sub_composicao.mo_sem_desoneracao ?? 0;
    }
    const coef = parseFloat(item.coeficiente || '0');
    const p = parseFloat(item.perda_percentual || '0');
    return total + (valorUnitMo * coef * (1 + (p / 100)));
  }, 0);

  const cdu = totalMat + totalMo;

  // Processamento e Ordenação Dinâmica dos Itens
  const processedItens = useMemo(() => {
    const prepared = itens.map(item => {
      const insumo = item.insumo;
      const sub = item.sub_composicao;
      const valorUnit = insumo 
        ? (
            insumo.tipo === 'Equipamento'
              ? (insumo.valor_nao_desonerado_operativo ?? insumo.valor ?? 0)
              : (insumo.tipo === 'Mão de Obra'
                  ? (insumo.valor_desonerado ?? insumo.valor ?? 0)
                  : (insumo.valor ?? insumo.valor_nao_desonerado ?? 0)
                )
          )
        : (sub?.custo_sem_desoneracao || sub?.cdu || 0);
      const coef = parseFloat(item.coeficiente || '0');
      const p = parseFloat(item.perda_percentual || '0');
      
      let itemMat = 0;
      let itemMo = 0;
      if (insumo) {
        if (insumo.tipo === 'Mão de Obra') {
          itemMo = valorUnit * coef * (1 + (p / 100));
        } else {
          itemMat = valorUnit * coef * (1 + (p / 100));
        }
      } else if (sub) {
        const subMoUnit = sub.mo_sem_desoneracao ?? 0;
        const subMatUnit = sub.mat_sem_desoneracao ?? sub.custo_sem_desoneracao ?? sub.cdu ?? 0;
        itemMo = subMoUnit * coef * (1 + (p / 100));
        itemMat = subMatUnit * coef * (1 + (p / 100));
      }
      const custoTotal = itemMat + itemMo;
      
      const codigo = insumo ? insumo.codigo : sub?.codigo;
      const descricao = insumo ? insumo.descricao : sub?.descricao;
      const unidade = insumo ? insumo.unidade : sub?.unidade;
      const tipo = insumo ? insumo.tipo : 'Subcomposição';

      return {
        raw: item,
        insumo,
        sub,
        codigo: codigo || '',
        descricao: descricao || '',
        unidade: unidade || '',
        tipo: tipo || '',
        valorUnit,
        coef,
        p,
        itemMat,
        itemMo,
        custoTotal
      };
    });

    let filtered = prepared.filter(row => {
      if (!searchTerm.trim()) return true;
      const tokens = searchTerm.trim().split(/\s+/).map(normalizeText).filter(Boolean);
      const fullText = normalizeText(`${row.codigo} ${row.descricao} ${row.tipo} ${row.unidade}`);
      return tokens.every(token => fullText.includes(token));
    });

    if (sortField) {
      filtered.sort((a, b) => {
        let valA: any = '';
        let valB: any = '';
        switch (sortField) {
          case 'tipo':
            valA = a.tipo;
            valB = b.tipo;
            break;
          case 'codigo':
            valA = a.codigo;
            valB = b.codigo;
            break;
          case 'descricao':
            valA = a.descricao;
            valB = b.descricao;
            break;
          case 'unidade':
            valA = a.unidade;
            valB = b.unidade;
            break;
          case 'coeficiente':
            valA = a.coef;
            valB = b.coef;
            break;
          case 'perda':
            valA = a.p;
            valB = b.p;
            break;
          case 'valor_unit':
            valA = a.valorUnit;
            valB = b.valorUnit;
            break;
          case 'mat':
            valA = a.itemMat;
            valB = b.itemMat;
            break;
          case 'mo':
            valA = a.itemMo;
            valB = b.itemMo;
            break;
          case 'custo_total':
            valA = a.custoTotal;
            valB = b.custoTotal;
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

    return filtered;
  }, [itens, searchTerm, sortField, sortDirection]);

  const renderHeaderCell = (field: string, label: React.ReactNode | string, width: number) => {
    const isSorted = sortField === field;
    return (
      <th
        key={field}
        style={{ width, minWidth: width }}
        onClick={() => handleSort(field)}
        className={clsx(
          "px-2 py-2 select-none font-bold text-[10px] uppercase tracking-wider text-center cursor-pointer transition-colors hover:bg-slate-200/80 group/head align-middle",
          isSorted ? "text-blue-700 bg-blue-50/70" : "text-slate-600"
        )}
        title={`Clique para ordenar`}
      >
        <div className="flex items-center justify-center gap-1 w-full leading-tight">
          <span className="text-center whitespace-pre-line break-words">{label}</span>
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
      </th>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p>Carregando composição...</p>
      </div>
    );
  }

  if (!composicao) {
    return (
      <div className="py-20 text-center text-slate-500">
        Composição não encontrada.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 text-slate-500 text-sm mb-2">
          <Link to="/banco-proprio/composicoes" className="hover:text-blue-600 flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Banco Próprio
          </Link>
          <span>/</span>
          <span className="text-slate-400">Montagem de Composição</span>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full font-mono">
                {composicao.codigo}
              </span>
              <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded">
                {composicao.tipo_atividade || 'Geral'}
              </span>
              <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded">
                Und: <strong className="text-slate-800">{composicao.unidade}</strong>
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">{composicao.descricao}</h2>
            <p className="text-slate-500 text-sm mt-1">
              Fonte: {composicao.fonte} | Custo Direto Unitário calculado com base nos itens abaixo.
            </p>
          </div>
          
          <div className="bg-slate-50 px-6 py-4 rounded-xl border border-slate-200 min-w-[220px] text-right space-y-1.5">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Custo Direto Unitário</p>
              <p className="text-2xl font-bold text-slate-800">
                <span className="text-sm text-slate-400 font-normal mr-1">R$</span>
                {cdu.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="h-px bg-slate-200" />
            <div className="flex justify-between text-xs text-slate-600">
              <span>MAT:</span>
              <span className="font-semibold">R$ {totalMat.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>MO:</span>
              <span className="font-semibold">R$ {totalMo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Itens */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Barra de Ferramentas com Filtros por Código & Descrição */}
        <div className="p-3.5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 shrink-0 mr-1">
              <Layers className="w-4 h-4 text-blue-600" />
              Itens da Composição ({processedItens.length})
            </h3>
            
            {/* Campo Único de Filtro por Código ou Descrição */}
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Filtro código ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-normal placeholder:text-slate-500"
              />
            </div>
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Item</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 table-fixed border-collapse">
            <thead className="bg-slate-100/80 text-slate-600 border-b border-slate-200 select-none font-bold text-[11px] uppercase tracking-wider">
              <tr>
                {renderHeaderCell('tipo', 'Tipo', 110)}
                {renderHeaderCell('codigo', 'Código', 95)}
                {renderHeaderCell('descricao', 'Descrição', 240)}
                {renderHeaderCell('unidade', 'UN', 55)}
                {renderHeaderCell('coeficiente', 'Coefic. /\nQntd.', 95)}
                {renderHeaderCell('perda', 'Perda\n(%)', 75)}
                {renderHeaderCell('valor_unit', 'Valor Unit.\n(R$)', 115)}
                {renderHeaderCell('mat', 'MAT\n(R$)', 95)}
                {renderHeaderCell('mo', 'MO\n(R$)', 95)}
                {renderHeaderCell('custo_total', 'Custo Total\n(R$)', 120)}
                <th style={{ width: 60, minWidth: 60 }} className="px-2 py-2 text-center text-[10px] uppercase font-bold text-slate-600 align-middle">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedItens.length === 0 ? (
                <tr><td colSpan={11} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <Layers className="w-9 h-9 text-slate-300" />
                    <p className="font-bold text-xs text-slate-700">Nenhum item encontrado</p>
                    <p className="text-xs">Clique em "Adicionar Item" para montar o preço.</p>
                  </div>
                </td></tr>
              ) : processedItens.map(({ raw: item, insumo, codigo, descricao, unidade, tipo, valorUnit, coef, p, itemMat, itemMo, custoTotal }) => {
                return (
                  <tr key={item.id} className="hover:bg-blue-50/40 transition-colors group">
                    <td style={{ width: 110 }} className="px-2 py-2 text-center" title={tipo}>
                      <span className={clsx(
                        'text-[10px] px-2 py-0.5 rounded font-bold border inline-block max-w-full leading-tight text-center',
                        insumo 
                          ? 'bg-slate-100 text-slate-700 border-slate-200' 
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      )}>
                        {tipo}
                      </span>
                    </td>
                    <td style={{ width: 95 }} className="px-2 py-2 font-mono font-extrabold text-blue-700 text-xs text-center">{codigo}</td>
                    <td style={{ width: 240 }} className="px-3 py-2 font-normal text-slate-900 text-xs leading-snug" title={descricao}>{descricao}</td>
                    <td style={{ width: 55 }} className="px-2 py-2 text-slate-600 font-mono text-[11px] text-center">{unidade}</td>
                    <td style={{ width: 95 }} className="px-2 py-2 text-right font-mono font-normal text-slate-700">{coef.toLocaleString('pt-BR', { minimumFractionDigits: 4 })}</td>
                    <td style={{ width: 75 }} className="px-2 py-2 text-right text-slate-500 font-mono text-[11px]">{p > 0 ? `${p}%` : '-'}</td>
                    <td style={{ width: 115 }} className="px-2 py-2 text-right">
                      <div className="flex justify-between w-full select-none gap-1 text-[11px] font-mono">
                        <span className="text-slate-400 font-normal">R$</span>
                        <span className="text-slate-800 font-semibold tabular-nums">
                          {valorUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      {insumo && insumo.tipo === 'Equipamento' && (
                        <span className="text-[9px] text-slate-400 font-medium font-sans block text-right">Operativo</span>
                      )}
                      {insumo && insumo.tipo === 'Mão de Obra' && (
                        <span className="text-[9px] text-slate-400 font-medium font-sans block text-right">Desonerado</span>
                      )}
                    </td>
                    <td style={{ width: 95 }} className="px-2 py-2 text-right">
                      {itemMat > 0 ? (
                        <div className="flex justify-between w-full select-none gap-1 text-[11px] font-mono">
                          <span className="text-slate-400 font-normal">R$</span>
                          <span className="text-slate-800 font-semibold tabular-nums">
                            {itemMat.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-mono">-</span>
                      )}
                    </td>
                    <td style={{ width: 95 }} className="px-2 py-2 text-right">
                      {itemMo > 0 ? (
                        <div className="flex justify-between w-full select-none gap-1 text-[11px] font-mono">
                          <span className="text-slate-400 font-normal">R$</span>
                          <span className="text-slate-800 font-semibold tabular-nums">
                            {itemMo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-mono">-</span>
                      )}
                    </td>
                    <td style={{ width: 120 }} className="px-2 py-2 text-right">
                      <div className="flex justify-between w-full select-none gap-1 text-[11px] font-mono">
                        <span className="text-blue-500 font-semibold">R$</span>
                        <span className="text-slate-900 font-bold tabular-nums">
                          {custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </td>
                    <td style={{ width: 60 }} className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleAbrirEdicao(item)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteItem(item.id)} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors" title="Remover">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {itens.length > 0 && (
              <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-800 text-xs uppercase tracking-wider">
                <tr>
                  <td colSpan={7} className="px-3 py-2.5 text-right">Total da Composição:</td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex justify-between w-full select-none gap-1 text-xs font-mono">
                      <span className="text-slate-400 font-normal">R$</span>
                      <span className="text-slate-800 font-bold tabular-nums">
                        {totalMat.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex justify-between w-full select-none gap-1 text-xs font-mono">
                      <span className="text-slate-400 font-normal">R$</span>
                      <span className="text-slate-800 font-bold tabular-nums">
                        {totalMo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex justify-between w-full select-none gap-1 text-xs font-mono">
                      <span className="text-blue-500 font-bold">R$</span>
                      <span className="text-blue-700 font-extrabold tabular-nums">
                        {cdu.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal de Adicionar Item */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Adicionar Item (Insumo ou Subcomposição)</h2>
              <button onClick={fecharModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {!itemSelecionado ? (
                <>
                  {/* Abas de tipo de item */}
                  <div className="flex border-b border-slate-200">
                    <button
                      onClick={() => { setTipoItemAdicionar('insumo'); setItensEncontrados([]); setBuscaInsumo(''); }}
                      className={clsx(
                        'flex-1 py-2.5 font-bold text-sm border-b-2 text-center transition-colors',
                        tipoItemAdicionar === 'insumo'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      )}
                    >
                      Insumo Básico
                    </button>
                    <button
                      onClick={() => { setTipoItemAdicionar('subcomposicao'); setItensEncontrados([]); setBuscaInsumo(''); }}
                      className={clsx(
                        'flex-1 py-2.5 font-bold text-sm border-b-2 text-center transition-colors',
                        tipoItemAdicionar === 'subcomposicao'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      )}
                    >
                      Subcomposição
                    </button>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <div className="relative flex-1">
                      <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        value={buscaInsumo}
                        onChange={(e) => setBuscaInsumo(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleBuscarInsumos()}
                        placeholder={tipoItemAdicionar === 'insumo' ? "Comece a digitar o nome ou código do insumo..." : "Comece a digitar o nome ou código da subcomposição..."}
                        className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-xs text-slate-900 font-normal placeholder:text-slate-400 bg-white"
                        autoFocus
                      />
                      {isSearchingModal && (
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                      )}
                    </div>
                    <button onClick={handleBuscarInsumos} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm">
                      <Search className="w-4 h-4" />
                      <span>Buscar</span>
                    </button>
                  </div>

                  {/* Estado da Busca Automática */}
                  {isSearchingModal && (
                    <div className="py-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2 bg-slate-50 rounded-xl border border-slate-200 mt-4">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Buscando itens correspondentes...</span>
                    </div>
                  )}

                  {!isSearchingModal && buscaInsumo.trim().length >= 2 && itensEncontrados.length === 0 && (
                    <div className="py-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200 mt-4">
                      Nenhum {tipoItemAdicionar === 'insumo' ? 'insumo' : 'subcomposição'} encontrado contendo <strong>"{buscaInsumo}"</strong>.
                    </div>
                  )}

                  {!isSearchingModal && buscaInsumo.trim().length < 2 && (
                    <div className="py-8 text-center text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-slate-200/60 mt-4">
                      💡 Digite a partir de 2 caracteres no campo acima para exibir a lista automática de opções.
                    </div>
                  )}

                  {!isSearchingModal && itensEncontrados.length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden mt-4">
                      <div className="px-4 py-2 bg-slate-100/80 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-700">
                        <span>Resultados encontrados ({itensEncontrados.length})</span>
                        <span className="text-[10px] text-slate-400 font-normal">Clique em Selecionar no item desejado</span>
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider font-bold sticky top-0 border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-2">Código</th>
                              <th className="px-4 py-2">Descrição</th>
                              <th className="px-4 py-2">Und</th>
                              <th className="px-4 py-2">Fonte</th>
                              <th className="px-4 py-2 text-right">Valor Unit.</th>
                              <th className="px-4 py-2 text-right">Ação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {itensEncontrados.map(item => {
                              const val = tipoItemAdicionar === 'insumo'
                                ? (
                                    item.tipo === 'Equipamento'
                                      ? (item.valor_nao_desonerado_operativo ?? item.valor ?? 0)
                                      : (item.tipo === 'Mão de Obra'
                                          ? (item.valor_desonerado ?? item.valor ?? 0)
                                          : (item.valor ?? item.valor_nao_desonerado ?? 0)
                                        )
                                  )
                                : (item.cdu || 0);
                              const fonte = item.fonte_preco || item.fonte || '-';
                              return (
                                <tr key={item.id} className="hover:bg-blue-50/70 text-[11px] transition-colors">
                                  <td className="px-4 py-2 font-mono text-[11px] text-slate-700 font-bold">{item.codigo}</td>
                                  <td className="px-4 py-2 max-w-[360px] text-[11px] font-normal text-slate-900 leading-snug" title={item.descricao}>{item.descricao}</td>
                                  <td className="px-4 py-2 text-slate-600 text-[11px] font-mono">{item.unidade}</td>
                                  <td className="px-4 py-2 text-xs">
                                    <span className={clsx(
                                      'px-2 py-0.5 rounded font-semibold text-[9px] uppercase tracking-wide',
                                      ['Cotação', 'Histórico', 'Própria'].includes(fonte)
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-purple-100 text-purple-800'
                                    )}>
                                      {fonte}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-right font-medium text-[11px] text-slate-800">
                                    <div>R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                    {tipoItemAdicionar === 'insumo' && item.tipo === 'Equipamento' && (
                                      <span className="text-[9px] text-slate-400 font-medium">Operativo</span>
                                    )}
                                    {tipoItemAdicionar === 'insumo' && item.tipo === 'Mão de Obra' && (
                                      <span className="text-[9px] text-slate-400 font-medium">Desonerado</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    <button onClick={() => setItemSelecionado(item)} className="text-[11px] bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded font-bold transition-colors cursor-pointer shadow-xs">
                                      Selecionar
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-0.5 rounded font-mono">{itemSelecionado.codigo}</span>
                      <button onClick={() => setItemSelecionado(null)} className="text-xs text-slate-500 hover:text-slate-700 underline font-bold cursor-pointer">Trocar Item</button>
                    </div>
                    <p className="font-semibold text-slate-800">{itemSelecionado.descricao}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Unidade: {itemSelecionado.unidade} | Custo Unitário: R$ {(
                        tipoItemAdicionar === 'insumo'
                          ? (
                              itemSelecionado.tipo === 'Equipamento'
                                ? (itemSelecionado.valor_nao_desonerado_operativo ?? itemSelecionado.valor ?? 0)
                                : (itemSelecionado.tipo === 'Mão de Obra'
                                    ? (itemSelecionado.valor_desonerado ?? itemSelecionado.valor ?? 0)
                                    : (itemSelecionado.valor ?? itemSelecionado.valor_nao_desonerado ?? 0)
                                  )
                            )
                          : (itemSelecionado.cdu || 0)
                      ).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {tipoItemAdicionar === 'insumo' && itemSelecionado.tipo === 'Equipamento' && ' (Operativo)'}
                      {tipoItemAdicionar === 'insumo' && itemSelecionado.tipo === 'Mão de Obra' && ' (Desonerado)'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Coeficiente *</label>
                      <input 
                        type="number" 
                        step="0.000001" 
                        value={coeficiente} 
                        onChange={(e) => setCoeficiente(e.target.value ? parseFloat(e.target.value) : '')}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-xs"
                        placeholder="Ex: 1.5000"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Perda (%)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={perda} 
                        onChange={(e) => setPerda(e.target.value ? parseFloat(e.target.value) : '')}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                        placeholder="Ex: 5"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button onClick={fecharModal} className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-200 rounded-lg transition-colors text-xs cursor-pointer">
                Cancelar
              </button>
              <button 
                onClick={handleAddItem}
                disabled={!itemSelecionado || !coeficiente}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50 text-xs cursor-pointer"
              >
                Adicionar à Composição
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Editar Item */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 className="text-base font-bold text-slate-800">Editar Item da Composição</h2>
              <button onClick={() => setEditingItem(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-xs">
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-0.5 rounded font-mono">
                    {editingItem.insumo ? editingItem.insumo.codigo : editingItem.sub_composicao?.codigo}
                  </span>
                </div>
                <p className="font-semibold text-slate-800 text-sm">{editingItem.insumo ? editingItem.insumo.descricao : editingItem.sub_composicao?.descricao}</p>
                <p className="text-slate-500 mt-1">
                  Unidade: {editingItem.insumo ? editingItem.insumo.unidade : editingItem.sub_composicao?.unidade}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Coeficiente *</label>
                  <input 
                    type="number" 
                    step="0.000001" 
                    value={coeficiente} 
                    onChange={(e) => setCoeficiente(e.target.value ? parseFloat(e.target.value) : '')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-xs"
                    placeholder="Ex: 1.5000"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Perda (%)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={perda} 
                    onChange={(e) => setPerda(e.target.value ? parseFloat(e.target.value) : '')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                    placeholder="Ex: 5"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 text-xs font-medium">
              <button onClick={() => setEditingItem(null)} className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer">
                Cancelar
              </button>
              <button 
                onClick={handleUpdateItem}
                disabled={coeficiente === ''}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
