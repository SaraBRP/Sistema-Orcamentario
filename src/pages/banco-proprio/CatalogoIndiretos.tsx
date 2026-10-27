import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, Plus, Trash2, CheckSquare, Square, 
  RotateCcw, Search, Save, Layers, ChevronUp, ChevronDown, CheckCircle2,
  Package, DollarSign
} from 'lucide-react';
import { clsx } from 'clsx';
import type { IndiretoGrupo, IndiretoItem, UnidadeIndireto } from '../../types/indireto';
import { getGlobalIndiretoCatalogo, saveGlobalIndiretoCatalogo } from '../../lib/indiretoStorage';
import { supabase } from '../../lib/supabase';

import BancoProprioInsumos, { INDIRETO_TIPOS } from './Insumos';

export default function CatalogoIndiretos() {
  const [activeSubTab, setActiveSubTab] = useState<'catalogo' | 'insumos'>('catalogo');
  const [grupos, setGrupos] = useState<IndiretoGrupo[]>(() => getGlobalIndiretoCatalogo());
  const [searchTerm, setSearchTerm] = useState('');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Modal para criar novo grupo
  const [isNovoGrupoModalOpen, setIsNovoGrupoModalOpen] = useState(false);
  const [novoGrupoNome, setNovoGrupoNome] = useState('');
  const [novoGrupoDesc, setNovoGrupoDesc] = useState('');

  // Modal para buscar e adicionar insumo do Banco Próprio
  const [targetGrupoIdForInsumo, setTargetGrupoIdForInsumo] = useState<string>('g1');
  const [isBuscaInsumoOpen, setIsBuscaInsumoOpen] = useState(false);
  const [buscaInsumoQuery, setBuscaInsumoQuery] = useState('');
  const [insumosEncontrados, setInsumosEncontrados] = useState<any[]>([]);
  const [loadingInsumos, setLoadingInsumos] = useState(false);


  const toggleGroupCollapse = (grupoId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(grupoId)) next.delete(grupoId);
      else next.add(grupoId);
      return next;
    });
  };

  const handleSalvarMatriz = (currentGrupos: IndiretoGrupo[] = grupos) => {
    saveGlobalIndiretoCatalogo(currentGrupos);
    setSaveFeedback('Matriz Padrão de Indiretos salva com sucesso no Banco Próprio!');
    setTimeout(() => setSaveFeedback(null), 4000);
  };

  const handleAdicionarGrupo = () => {
    if (!novoGrupoNome.trim()) return;
    const num = grupos.length + 1;
    const novoGrupo: IndiretoGrupo = {
      id: `g_custom_${Date.now()}`,
      numero: num,
      nome: novoGrupoNome.toUpperCase().trim(),
      descricao: novoGrupoDesc.trim(),
      ativo: true,
      itens: []
    };

    const novosGrupos = [...grupos, novoGrupo];
    setGrupos(novosGrupos);
    handleSalvarMatriz(novosGrupos);
    setNovoGrupoNome('');
    setNovoGrupoDesc('');
    setIsNovoGrupoModalOpen(false);
  };

  const handleExcluirGrupo = (grupoId: string) => {
    if (grupos.length <= 1) {
      alert('Você precisa ter pelo menos um grupo no catálogo.');
      return;
    }
    if (!window.confirm('Deseja excluir este grupo e todos os seus insumos do catálogo padrão?')) return;
    const novosGrupos = grupos.filter(g => g.id !== grupoId);
    setGrupos(novosGrupos);
    handleSalvarMatriz(novosGrupos);
  };

  useEffect(() => {
    if (isBuscaInsumoOpen) {
      const timer = setTimeout(() => {
        handleBuscarInsumosBanco();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isBuscaInsumoOpen, buscaInsumoQuery]);

  const handleBuscarInsumosBanco = async () => {
    setLoadingInsumos(true);
    try {
      const buildQuery = (filterType: 'tipo_custo' | 'tipo_uso' | 'none') => {
        let query = supabase
          .schema('engenharia')
          .from('insumos')
          .select('*')
          .order('descricao', { ascending: true })
          .limit(100);

        if (filterType === 'tipo_custo') {
          query = query.in('tipo_custo', ['indireto', 'ambos']);
        } else if (filterType === 'tipo_uso') {
          query = query.in('tipo_uso', ['indireto', 'ambos']);
        }

        if (buscaInsumoQuery.trim()) {
          query = query.or(`descricao.ilike.%${buscaInsumoQuery.trim()}%,codigo.ilike.%${buscaInsumoQuery.trim()}%`);
        }

        return query;
      };

      let { data, error } = await buildQuery('tipo_custo');

      if ((error && error.code === '42703') || (!error && (!data || data.length === 0))) {
        const resTipoUso = await buildQuery('tipo_uso');
        if (!resTipoUso.error && resTipoUso.data && resTipoUso.data.length > 0) {
          data = resTipoUso.data;
          error = null;
        } else {
          const resAll = await buildQuery('none');
          if (!resAll.error && resAll.data) {
            data = resAll.data;
            error = null;
          }
        }
      }

      if (!error && data) {
        setInsumosEncontrados(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInsumos(false);
    }
  };

  // Sincroniza as unidades dos insumos do catálogo com as unidades originais cadastradas no Banco Próprio
  const sincronizarUnidadesComBancoProprio = async (currentGrupos: IndiretoGrupo[]) => {
    try {
      const codigos = new Set<string>();
      const descricoes = new Set<string>();
      currentGrupos.forEach(g => {
        (g.itens || []).forEach(i => {
          if (i.codigo) codigos.add(i.codigo.trim().toLowerCase());
          if (i.descricao) descricoes.add(i.descricao.trim().toLowerCase());
        });
      });

      if (codigos.size === 0 && descricoes.size === 0) return;

      let { data: insumosDB, error } = await supabase
        .schema('engenharia')
        .from('insumos')
        .select('codigo, descricao, unidade, valor, valor_nao_desonerado, fonte_preco');

      if ((error && error.code === '42P01') || (!error && (!insumosDB || insumosDB.length === 0))) {
        const resPublic = await supabase
          .from('insumos')
          .select('codigo, descricao, unidade, valor, valor_nao_desonerado, fonte_preco');
        if (!resPublic.error && resPublic.data && resPublic.data.length > 0) {
          insumosDB = resPublic.data;
          error = null;
        }
      }

      if (error || !insumosDB || insumosDB.length === 0) return;

      const mapaPorCodigo = new Map<string, any>();
      const mapaPorDescricao = new Map<string, any>();
      insumosDB.forEach(ins => {
        if (ins.codigo) mapaPorCodigo.set(ins.codigo.trim().toLowerCase(), ins);
        if (ins.descricao) mapaPorDescricao.set(ins.descricao.trim().toLowerCase(), ins);
      });

      let houveAlteracao = false;
      const novosGrupos = currentGrupos.map(g => ({
        ...g,
        itens: (g.itens || []).map(item => {
          const codKey = (item.codigo || '').trim().toLowerCase();
          const descKey = (item.descricao || '').trim().toLowerCase();
          const insumoEncontrado = mapaPorCodigo.get(codKey) || mapaPorDescricao.get(descKey);

          if (insumoEncontrado && insumoEncontrado.unidade && insumoEncontrado.unidade !== item.unidade) {
            houveAlteracao = true;
            return {
              ...item,
              unidade: insumoEncontrado.unidade,
              codigo: insumoEncontrado.codigo || item.codigo
            };
          }
          return item;
        })
      }));

      if (houveAlteracao) {
        setGrupos(novosGrupos);
        saveGlobalIndiretoCatalogo(novosGrupos);
      }
    } catch (err) {
      console.error('Erro ao sincronizar unidades do catálogo com o Banco Próprio:', err);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'catalogo') {
      sincronizarUnidadesComBancoProprio(grupos);
    }
  }, [activeSubTab]);

  const handleAdicionarInsumoAoGrupo = (insumo: any) => {
    const valUnit = parseFloat(insumo.valor || insumo.valor_nao_desonerado || 0);
    const novoItem: IndiretoItem = {
      id: `item_cat_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      grupoId: targetGrupoIdForInsumo,
      codigo: insumo.codigo || '',
      descricao: insumo.descricao,
      unidade: insumo.unidade || 'un',
      alocacaoMensal: 1,
      isCustoFixo: false,
      quantidadeTotal: 1,
      valorUnitario: valUnit,
      valorTotal: valUnit,
      destino: 'eap',
      ativo: true,
      observacao: `Banco Próprio (${insumo.fonte_preco || 'Cotação'})`
    };

    const novosGrupos = grupos.map(g => {
      if (g.id !== targetGrupoIdForInsumo) return g;
      return {
        ...g,
        itens: [...(g.itens || []), novoItem]
      };
    });

    setGrupos(novosGrupos);
    handleSalvarMatriz(novosGrupos);
    setIsBuscaInsumoOpen(false);
  };

  const updateItemField = (grupoId: string, itemId: string, field: 'alocacaoMensal' | 'valorUnitario' | 'isCustoFixo', val: any) => {
    const novosGrupos = grupos.map(g => {
      if (g.id !== grupoId) return g;
      return {
        ...g,
        itens: (g.itens || []).map(i => {
          if (i.id !== itemId) return i;
          const aloc = field === 'alocacaoMensal' ? Math.max(0, parseFloat(val) || 0) : i.alocacaoMensal;
          const isFixo = field === 'isCustoFixo' ? Boolean(val) : i.isCustoFixo;
          const unitU = field === 'valorUnitario' ? Math.max(0, parseFloat(val) || 0) : i.valorUnitario;
          return {
            ...i,
            [field]: val,
            alocacaoMensal: aloc,
            isCustoFixo: isFixo,
            valorUnitario: unitU,
            valorTotal: aloc * unitU
          };
        })
      };
    });
    setGrupos(novosGrupos);
    handleSalvarMatriz(novosGrupos);
  };

  const handleDeleteItem = (grupoId: string, itemId: string) => {
    const novosGrupos = grupos.map(g => {
      if (g.id !== grupoId) return g;
      return {
        ...g,
        itens: (g.itens || []).filter(i => i.id !== itemId)
      };
    });
    setGrupos(novosGrupos);
    handleSalvarMatriz(novosGrupos);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-900 font-sans pb-16">
      
      {/* ── HEADER DE NAVEGAÇÃO / BARRA SUPERIOR ────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-8 pt-5 pb-0 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Gestão de Custos Indiretos
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-800 rounded-full border border-blue-200">
                  Banco Próprio
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Gerencie os insumos cadastrados no Banco Próprio e a matriz padrão de Grupos de Custos Indiretos da BRP.
              </p>
            </div>
          </div>

          {activeSubTab === 'catalogo' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsNovoGrupoModalOpen(true)}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="w-4 h-4 text-blue-600" />
                Novo Grupo
              </button>

              <button
                onClick={() => handleSalvarMatriz()}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Salvar Matriz Padrão
              </button>
            </div>
          )}
        </div>

        {/* ── NAVEGAÇÃO POR ABAS SUPERIORES ── */}
        <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('catalogo')}
            className={clsx(
              "pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer",
              activeSubTab === 'catalogo'
                ? "border-blue-600 text-blue-700 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <Building2 className="w-4 h-4" />
            Catálogo Padrão (Matriz de Grupos)
          </button>

          <button
            onClick={() => setActiveSubTab('insumos')}
            className={clsx(
              "pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer",
              activeSubTab === 'insumos'
                ? "border-blue-600 text-blue-700 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <Package className="w-4 h-4" />
            Insumos Cadastrados (Banco Próprio)
          </button>
        </div>
      </div>

      {/* ── CONTEÚDO PRINCIPAL (ABA CATÁLOGO OU ABA INSUMOS) ───────────────── */}
      {activeSubTab === 'catalogo' ? (
        <div className="max-w-7xl w-full mx-auto p-6 space-y-6">
          {saveFeedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-fadeIn shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{saveFeedback}</span>
            </div>
          )}

          {/* Métricas do Catálogo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">Grupos Cadastrados</span>
                <span className="text-base font-bold text-slate-900 mt-0.5 block">
                  {grupos.length} Grupos Padrão
                </span>
              </div>
              <Layers className="w-5 h-5 text-slate-400" />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">Total de Insumos no Catálogo</span>
                <span className="text-base font-bold text-slate-900 mt-0.5 block">
                  {grupos.reduce((acc, g) => acc + (g.itens || []).length, 0)} Insumos Viculados
                </span>
              </div>
              <Package className="w-5 h-5 text-slate-400" />
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10.5px] font-bold text-blue-800 uppercase tracking-wider block">Status da Matriz</span>
                <span className="text-xs font-bold text-blue-900 mt-0.5 block">
                  Vínculo Ativo com Banco Próprio
                </span>
              </div>
              <Building2 className="w-5 h-5 text-blue-500/60" />
            </div>
          </div>

          {/* Barra de Pesquisa */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Pesquisar insumo ou grupo no catálogo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          {/* Lista de Grupos Empilhados */}
          {grupos.map((grupo) => {
            const termo = searchTerm.toLowerCase().trim();
            const grupoCombina = !termo || grupo.nome.toLowerCase().includes(termo);
            const itensFiltrados = (grupo.itens || []).filter(i => !termo || i.descricao.toLowerCase().includes(termo) || (i.codigo || '').toLowerCase().includes(termo));

            if (!grupoCombina && itensFiltrados.length === 0) return null;

            const isCollapsed = collapsedGroups.has(grupo.id);

            return (
              <div 
                key={grupo.id}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition-all"
              >
                {/* HEADER DO GRUPO */}
                <div 
                  onClick={() => toggleGroupCollapse(grupo.id)}
                  className="px-5 py-3.5 bg-slate-50/80 hover:bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 cursor-pointer select-none transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center shrink-0 border border-blue-200/80">
                      {grupo.numero}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        {grupo.nome}
                        {grupo.id.startsWith('g_custom_') && (
                          <span className="px-2 py-0.2 bg-slate-200 text-slate-700 text-[10px] rounded font-normal">
                            Personalizado
                          </span>
                        )}
                      </h3>
                      {grupo.descricao && (
                        <p className="text-[11px] text-slate-500 font-normal">
                          {grupo.descricao}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-500 font-medium hidden sm:inline-block">
                      <strong className="text-slate-800">{(grupo.itens || []).length}</strong> insumos cadastrados
                    </span>

                    <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setTargetGrupoIdForInsumo(grupo.id);
                          setIsBuscaInsumoOpen(true);
                        }}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar Insumo do Banco Próprio
                      </button>

                      {grupo.id.startsWith('g_custom_') && (
                        <button
                          onClick={() => handleExcluirGrupo(grupo.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition rounded"
                          title="Excluir grupo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <button 
                        onClick={() => toggleGroupCollapse(grupo.id)}
                        className="p-1 text-slate-400 hover:text-slate-700 transition"
                      >
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* TABELA DO GRUPO */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    {(grupo.itens || []).length > 0 ? (
                      <table className="w-full border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                            <th className="py-2 px-3 text-left">Código</th>
                            <th className="py-2 px-3 text-left">Insumo Padrão / Descrição</th>
                            <th className="py-2 px-3 text-center w-24">Unidade</th>
                            <th className="py-2 px-3 text-center w-28">Alocação Padrão / Mês</th>
                            <th className="py-2 px-3 text-center w-20">Fixo?</th>
                            <th className="py-2 px-3 text-right w-36">Valor Vigente (R$)</th>
                            <th className="py-2 px-3 text-center w-14">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {itensFiltrados.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2 px-3 font-semibold text-slate-600">
                                {item.codigo || '-'}
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-900">
                                {item.descricao}
                                {item.observacao && (
                                  <span className="text-[10px] text-slate-400 block font-normal">
                                    {item.observacao}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-semibold rounded" title="Unidade cadastrada no Banco Próprio">
                                  {item.unidade || 'un'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.alocacaoMensal}
                                  onChange={(e) => updateItemField(grupo.id, item.id, 'alocacaoMensal', e.target.value)}
                                  className="w-20 text-center font-semibold bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                                />
                              </td>
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={Boolean(item.isCustoFixo)}
                                  onChange={(e) => updateItemField(grupo.id, item.id, 'isCustoFixo', e.target.checked)}
                                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                />
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums">
                                R$ {item.valorUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <button
                                  onClick={() => handleDeleteItem(grupo.id, item.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 transition rounded"
                                  title="Remover insumo do catálogo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-5 text-center text-xs text-slate-400 bg-slate-50/50">
                        Nenhum insumo vinculado a este grupo no catálogo padrão.{' '}
                        <button
                          onClick={() => {
                            setTargetGrupoIdForInsumo(grupo.id);
                            setIsBuscaInsumoOpen(true);
                          }}
                          className="text-blue-600 font-bold hover:underline ml-1"
                        >
                          + Vincular Insumo do Banco Próprio
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="max-w-7xl w-full mx-auto p-6">
          <BancoProprioInsumos embedded={true} scope="indireto" />
        </div>
      )}

      {/* ── MODAL: ADICIONAR NOVO GRUPO ────────────────────────────────────────── */}
      {isNovoGrupoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-fadeIn">
            <h3 className="text-base font-bold text-slate-900 mb-1">Criar Novo Grupo Padrão</h3>
            <p className="text-xs text-slate-500 mb-4">Adicione um grupo padrão na matriz da empresa.</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Grupo *</label>
                <input
                  type="text"
                  placeholder="Ex: 15. GESTÃO AMBIENTAL E SUSTENTABILIDADE"
                  value={novoGrupoNome}
                  onChange={(e) => setNovoGrupoNome(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descrição Breve</label>
                <textarea
                  rows={2}
                  placeholder="Explicação do propósito deste grupo de custos..."
                  value={novoGrupoDesc}
                  onChange={(e) => setNovoGrupoDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsNovoGrupoModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdicionarGrupo}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-2xs"
              >
                Criar Grupo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: BUSCAR E SELECIONAR INSUMO DO BANCO PRÓPRIO ───────────────── */}
      {isBuscaInsumoOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 animate-fadeIn">
            <h3 className="text-base font-bold text-slate-900 mb-1">Buscar Insumo no Banco Próprio</h3>
            <p className="text-xs text-slate-500 mb-4">Selecione o insumo cadastrado para vincular a esta categoria do catálogo.</p>

            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Digite o nome ou código do insumo (ex: Engenheiro, Container...)"
                  value={buscaInsumoQuery}
                  onChange={(e) => setBuscaInsumoQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBuscarInsumosBanco()}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleBuscarInsumosBanco}
                disabled={loadingInsumos}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
              >
                {loadingInsumos ? 'Buscando...' : 'Buscar'}
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 mb-4">
              {insumosEncontrados.length > 0 ? (
                insumosEncontrados.map((insumo) => (
                  <div
                    key={insumo.id}
                    onClick={() => handleAdicionarInsumoAoGrupo(insumo)}
                    className="p-2.5 hover:bg-blue-50 cursor-pointer transition flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{insumo.descricao}</span>
                      <span className="text-[10px] text-slate-400">
                        {insumo.codigo ? `Cód: ${insumo.codigo} | ` : ''}Tipo: {insumo.tipo || 'Material'} | Unid: {insumo.unidade}
                      </span>
                    </div>
                    <span className="font-extrabold text-blue-700 tabular-nums">
                      R$ {Number(insumo.valor || insumo.valor_nao_desonerado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 space-y-1">
                  <p className="font-semibold text-slate-700">Nenhum insumo indireto encontrado no Banco Próprio.</p>
                  <p className="text-[11px] text-slate-400">
                    Apenas insumos cadastrados com uso <strong className="text-amber-700">Indireto</strong> ou <strong className="text-purple-700">Ambos</strong> podem ser vinculados ao Catálogo Padrão.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setIsBuscaInsumoOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
