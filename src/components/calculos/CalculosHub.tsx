import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calculator, Search, Layers, FileText, ChevronRight, 
  Trash2, Edit3, Building2, Plus, Copy, Users
} from 'lucide-react';
import type { CalculoItem, ModuloCalculoId, ModuloInfo } from '../../types/calculos';
import { CalculoDrawer } from './CalculoDrawer';
import { DimensionamentoEquipeModal } from './DimensionamentoEquipeModal';

const renderModuloIcon = (iconeName: string) => {
  switch (iconeName) {
    case 'Building2': return <Building2 className="w-5 h-5 text-white" />;
    case 'FileText': return <FileText className="w-5 h-5 text-white" />;
    case 'Calculator': return <Calculator className="w-5 h-5 text-white" />;
    case 'Layers':
    default: return <Layers className="w-5 h-5 text-white" />;
  }
};

const MODULOS_CATALOGO: ModuloInfo[] = [
  {
    id: 'fundacoes',
    titulo: 'Fundações Fórmulas & Geometria',
    subtitulo: 'Sapatas, Blocos e Estacas',
    disciplina: 'Fundações',
    icone: 'Layers',
    corBg: 'bg-gradient-to-br from-blue-600 to-blue-800 shadow-md shadow-blue-600/30 text-white',
    corTexto: 'text-blue-600',
    descricao: 'Cálculo paramétrico de volume de concreto, área de fôrmas, aço e escavação para sapatas isoladas/corridas.'
  },
  {
    id: 'superestrutura',
    titulo: 'Estruturas de Concreto / Aço',
    subtitulo: 'Pilares, Vigas e Lajes',
    disciplina: 'Estrutura',
    icone: 'Building2',
    corBg: 'bg-gradient-to-br from-blue-700 to-indigo-800 shadow-md shadow-blue-700/30 text-white',
    corTexto: 'text-blue-700',
    descricao: 'Estimativa de taxas de armadura (kg/m³), fôrmas por área e volumes de concreto para estrutura principal.'
  },
  {
    id: 'premoldados',
    titulo: 'Pré-Moldados de Concreto',
    subtitulo: 'Pilares P1-P4, Vigas V1-V4 e Terças',
    disciplina: 'Pré-Moldados',
    icone: 'Building2',
    corBg: 'bg-gradient-to-br from-indigo-600 to-slate-900 shadow-md shadow-indigo-600/30 text-white',
    corTexto: 'text-indigo-600',
    descricao: 'Cálculo de elementos pré-fabricados (P1 a P4, V1 a V4), consumo de concreto, fôrma metálica e taxas de aço.'
  },
  {
    id: 'pisos',
    titulo: 'Pisos Industriais & Pavimentação',
    subtitulo: 'Sub-base, Concreto e Malhas',
    disciplina: 'Pisos',
    icone: 'Layers',
    corBg: 'bg-gradient-to-br from-blue-600 to-sky-700 shadow-md shadow-sky-600/30 text-white',
    corTexto: 'text-sky-600',
    descricao: 'Dimensionamento de espessura de pisos, consumo de fibras/telas e volume de lastro de brita.'
  },
  {
    id: 'drenagem',
    titulo: 'Drenagem & Redes Enterradas',
    subtitulo: 'Tubulações, Canaletas e Caixas',
    disciplina: 'Infraestrutura',
    icone: 'Layers',
    corBg: 'bg-gradient-to-br from-blue-800 to-slate-950 shadow-md shadow-blue-800/30 text-white',
    corTexto: 'text-blue-800',
    descricao: 'Escavação de valas, berço de areia, tubulações de PEAD/Concreto e caixas de inspeção.'
  },
  {
    id: 'vedacoes',
    titulo: 'Alvenarias & Vedações',
    subtitulo: 'Blocos, Argamassa e Chapisco',
    disciplina: 'Arquitetura',
    icone: 'FileText',
    corBg: 'bg-gradient-to-br from-sky-600 to-blue-700 shadow-md shadow-sky-600/30 text-white',
    corTexto: 'text-sky-700',
    descricao: 'Cálculo de área líquida descontando vãos de portas/janelas, argamassa de assentamento e revestimentos.'
  },
  {
    id: 'pits_reservatorios',
    titulo: 'Pits, Reservatórios & Bacias',
    subtitulo: 'Estruturas Estanques & Impermeabilização',
    disciplina: 'Hidrossanitário / Especial',
    icone: 'Building2',
    corBg: 'bg-gradient-to-br from-blue-700 to-indigo-900 shadow-md shadow-blue-700/30 text-white',
    corTexto: 'text-indigo-700',
    descricao: 'Volume estanque, área de manta impermeabilizante e concreto para contenções profundas.'
  },
  {
    id: 'instalacoes_parametricas',
    titulo: 'Instalações Elétricas / Hidráulicas',
    subtitulo: 'Pontos por m² e Estimativas Rápida',
    disciplina: 'Instalações',
    icone: 'Calculator',
    corBg: 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-md shadow-blue-600/30 text-white',
    corTexto: 'text-blue-600',
    descricao: 'Densidade paramétrica de iluminação, tomadas e prumadas baseada em área construída.'
  }
];

interface OrcamentoItemSimple {
  id: string;
  item_eap: string;
  descricao: string;
  unidade: string;
  quantidade: number;
}

interface Props {
  orcamentoId: string;
  calculos: CalculoItem[];
  itensEap: OrcamentoItemSimple[];
  onSaveCalculo: (calculo: CalculoItem) => void;
  onDeleteCalculo: (id: string) => void;
  _onApplyCalculosToEap?: (calculos: CalculoItem[]) => void;
}

export const CalculosHub: React.FC<Props> = ({
  orcamentoId,
  calculos,
  itensEap,
  onSaveCalculo,
  onDeleteCalculo
}) => {
  // Chaves de armazenamento na sessão para persistência no F5
  const STORAGE_KEY_TAB = `brp_calc_tab_${orcamentoId || 'default'}`;
  const STORAGE_KEY_DRAWER = `brp_calc_drawer_${orcamentoId || 'default'}`;
  const STORAGE_KEY_MODULO = `brp_calc_modulo_${orcamentoId || 'default'}`;
  const STORAGE_KEY_EDIT_ID = `brp_calc_edit_id_${orcamentoId || 'default'}`;

  // Leitura do Estado Inicial (URL SearchParams > SessionStorage > Padrão)
  const getInitialState = () => {
    const params = new URLSearchParams(window.location.search);
    const paramTab = params.get('calcTab') as 'memoria' | 'modulos' | null;
    const storedTab = sessionStorage.getItem(STORAGE_KEY_TAB) as 'memoria' | 'modulos' | null;
    const initialTab = paramTab || storedTab || 'memoria';

    const paramModulo = params.get('calcModulo') as ModuloCalculoId | null;
    const paramEditId = params.get('calcEditId');
    const storedDrawer = sessionStorage.getItem(STORAGE_KEY_DRAWER) === 'true';
    const storedModulo = sessionStorage.getItem(STORAGE_KEY_MODULO) as ModuloCalculoId | null;
    const storedEditId = sessionStorage.getItem(STORAGE_KEY_EDIT_ID);

    const isDrawer = Boolean(paramModulo || paramEditId || storedDrawer);
    const initialModulo = paramModulo || storedModulo || 'fundacoes';
    const initialEditId = paramEditId || storedEditId || null;

    return { initialTab, isDrawer, initialModulo, initialEditId };
  };

  const init = getInitialState();

  // Controle de Abas Superiores
  const [activeTab, setActiveTab] = useState<'memoria' | 'modulos'>(init.initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [moduloFiltro, setModuloFiltro] = useState<string>('todos');
  const [drawerOpen, setDrawerOpen] = useState<boolean>(init.isDrawer);
  const [calculoEdicao, setCalculoEdicao] = useState<CalculoItem | null>(null);
  const [moduloDrawerId, setModuloDrawerId] = useState<ModuloCalculoId>(init.initialModulo);
  const [editIdToRestore, setEditIdToRestore] = useState<string | null>(init.initialEditId);
  const [showMemorialModal, setShowMemorialModal] = useState(false);
  const [dimensionandoItem, setDimensionandoItem] = useState<CalculoItem | null>(null);

  // Sincronizador de Estado com URL e SessionStorage
  const syncStateToUrl = useCallback((
    tab: 'memoria' | 'modulos',
    isOpen: boolean,
    modId: ModuloCalculoId,
    editItem: CalculoItem | null,
    pushHistory: boolean = false
  ) => {
    sessionStorage.setItem(STORAGE_KEY_TAB, tab);
    sessionStorage.setItem(STORAGE_KEY_DRAWER, String(isOpen));
    sessionStorage.setItem(STORAGE_KEY_MODULO, modId);
    if (editItem?.id) {
      sessionStorage.setItem(STORAGE_KEY_EDIT_ID, editItem.id);
    } else {
      sessionStorage.removeItem(STORAGE_KEY_EDIT_ID);
    }

    const url = new URL(window.location.href);
    url.searchParams.set('calcTab', tab);

    if (isOpen) {
      url.searchParams.set('calcModulo', modId);
      if (editItem?.id) {
        url.searchParams.set('calcEditId', editItem.id);
      } else {
        url.searchParams.delete('calcEditId');
      }
    } else {
      url.searchParams.delete('calcModulo');
      url.searchParams.delete('calcEditId');
    }

    if (pushHistory) {
      window.history.pushState({ calcTab: tab, isOpen, modId, editId: editItem?.id }, '', url.toString());
    } else {
      window.history.replaceState({ calcTab: tab, isOpen, modId, editId: editItem?.id }, '', url.toString());
    }
  }, [STORAGE_KEY_TAB, STORAGE_KEY_DRAWER, STORAGE_KEY_MODULO, STORAGE_KEY_EDIT_ID]);

  // Restauração de item em edição se vier via reload F5 ou URL
  useEffect(() => {
    if (editIdToRestore && calculos.length > 0) {
      const found = calculos.find(c => c.id === editIdToRestore);
      if (found) {
        setCalculoEdicao(found);
        setModuloDrawerId(found.modulo_id);
        setDrawerOpen(true);
      }
    }
  }, [calculos, editIdToRestore]);

  // Suporte à Navegação do Botão Voltar/Avançar do Navegador (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const pTab = (params.get('calcTab') as 'memoria' | 'modulos') || 'memoria';
      const pModulo = params.get('calcModulo') as ModuloCalculoId | null;
      const pEditId = params.get('calcEditId');

      setActiveTab(pTab);

      if (pModulo || pEditId) {
        if (pModulo) setModuloDrawerId(pModulo);
        if (pEditId && calculos.length > 0) {
          const item = calculos.find(c => c.id === pEditId);
          if (item) setCalculoEdicao(item);
        } else {
          setCalculoEdicao(null);
        }
        setDrawerOpen(true);
      } else {
        setDrawerOpen(false);
        setCalculoEdicao(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [calculos]);

  // Totais consolidados do orçamento
  const totaisGlobais = useMemo(() => {
    let concreto = 0;
    let forma = 0;
    let aco = 0;
    let escavacao = 0;
    let impermeab = 0;
    let custoTotal = 0;

    calculos.forEach(c => {
      concreto += c.resultados.volumeConcretoM3 || 0;
      forma += c.resultados.areaFormaM2 || 0;
      aco += c.resultados.pesoAcoKg || 0;
      escavacao += c.resultados.escavacaoM3 || 0;
      impermeab += c.resultados.areaImpermeabilizacaoM2 || 0;
      custoTotal += c.resultados.custoTotalEstimadoR$ || 0;
    });

    return {
      concreto: Math.round(concreto * 100) / 100,
      forma: Math.round(forma * 100) / 100,
      aco: Math.round(aco * 100) / 100,
      escavacao: Math.round(escavacao * 100) / 100,
      impermeab: Math.round(impermeab * 100) / 100,
      custoTotal: Math.round(custoTotal * 100) / 100
    };
  }, [calculos]);

  // Lista filtrada
  const calculosFiltrados = useMemo(() => {
    return calculos.filter(c => {
      const matchSearch = c.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (c.predioSetor && c.predioSetor.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchModulo = moduloFiltro === 'todos' || c.modulo_id === moduloFiltro;
      return matchSearch && matchModulo;
    });
  }, [calculos, searchTerm, moduloFiltro]);

  const handleTabChange = (tab: 'memoria' | 'modulos') => {
    setActiveTab(tab);
    syncStateToUrl(tab, drawerOpen, moduloDrawerId, calculoEdicao, true);
  };

  const handleOpenNovoCalculo = (moduloId: ModuloCalculoId) => {
    setCalculoEdicao(null);
    setModuloDrawerId(moduloId);
    setDrawerOpen(true);
    syncStateToUrl(activeTab, true, moduloId, null, true);
  };

  const handleOpenEditarCalculo = (calc: CalculoItem) => {
    setCalculoEdicao(calc);
    setModuloDrawerId(calc.modulo_id);
    setDrawerOpen(true);
    syncStateToUrl(activeTab, true, calc.modulo_id, calc, true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setCalculoEdicao(null);
    setEditIdToRestore(null);
    syncStateToUrl(activeTab, false, moduloDrawerId, null, true);
  };

  const handleDuplicarCalculo = (calc: CalculoItem) => {
    const cloneToSave: CalculoItem = {
      ...calc,
      id: `calc-${Date.now()}`,
      nome: `${calc.nome} (Cópia)`,
      dataCriacao: new Date().toISOString(),
      dataAtualizacao: new Date().toISOString()
    };
    onSaveCalculo(cloneToSave);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* ABAS NAVEGACIONAIS NA PARTE SUPERIOR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => handleTabChange('memoria')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'memoria'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Memórias de Cálculo Salvas</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'memoria' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {calculos.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('modulos')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'modulos'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>+ Novo Cálculo / Módulos</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleTabChange('modulos')}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Cálculo ao Memorial</span>
          </button>
          <button
            onClick={() => setShowMemorialModal(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-200 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-slate-600" />
            <span>Gerar Memorial Consolidado</span>
          </button>
        </div>
      </div>

      {/* CONTEÚDO DA ABA 1: MEMÓRIAS DE CÁLCULO SALVAS (VISÃO PRINCIPAL) */}
      {activeTab === 'memoria' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Tabela Formatada em Lista dos Cálculos Salvos */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Lista de Elementos e Cálculos do Orçamento</h3>
                <p className="text-xs text-slate-500">Alterne entre disciplinas e agregue múltiplos cálculos à mesma memória de cálculo</p>
              </div>

              <div className="flex items-center space-x-2">
                {/* Buscador */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar memória por nome ou setor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                {/* Filtro por Módulo */}
                <select
                  value={moduloFiltro}
                  onChange={(e) => setModuloFiltro(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-semibold focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todos">Todas as Disciplinas</option>
                  {MODULOS_CATALOGO.map(m => (
                    <option key={m.id} value={m.id}>{m.titulo}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tabela de Memórias em Formato Lista */}
            {calculosFiltrados.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Calculator className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
                <p className="text-xs font-semibold">Nenhuma memória de cálculo cadastrada neste orçamento.</p>
                <button
                  onClick={() => handleTabChange('modulos')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-2xs inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Criar Primeiro Cálculo</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Nome do Cálculo / Elemento</th>
                      <th className="py-3 px-4">Disciplina / Módulo</th>
                      <th className="py-3 px-4">Setor / Prédio</th>
                      <th className="py-3 px-4">Quantitativos Principais</th>
                      <th className="py-3 px-4 text-right">Custo Insumos</th>
                      <th className="py-3 px-4 text-center">Vínculo EAP</th>
                      <th className="py-3 px-4 text-center w-28">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {calculosFiltrados.map((calc) => {
                      const mod = MODULOS_CATALOGO.find(m => m.id === calc.modulo_id);
                      const res = calc.resultados;
                      const hasVinculo = (calc.vinculos && calc.vinculos.length > 0);

                      return (
                        <tr key={calc.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900 block">{calc.nome}</span>
                            <span className="text-[10px] text-slate-400">
                              Criado em: {new Date(calc.dataCriacao).toLocaleDateString('pt-BR')}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider inline-block">
                              {mod?.disciplina || calc.modulo_id}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              {calc.predioSetor || 'Geral'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                            <div className="flex items-center gap-3">
                              {res.volumeConcretoM3 !== undefined && (
                                <span><strong>{res.volumeConcretoM3}</strong> m³</span>
                              )}
                              {res.areaFormaM2 !== undefined && (
                                <span><strong>{res.areaFormaM2}</strong> m²</span>
                              )}
                              {res.pesoAcoKg !== undefined && (
                                <span><strong>{res.pesoAcoKg}</strong> kg</span>
                              )}
                              {res.escavacaoM3 !== undefined && (
                                <span><strong>{res.escavacaoM3}</strong> m³</span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 text-xs">
                            {res.custoTotalEstimadoR$ ? (
                              `R$ ${res.custoTotalEstimadoR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                            ) : '-'}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {hasVinculo ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                {calc.vinculos.length} item(ns) EAP
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-400">
                                Sem vínculo
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => setDimensionandoItem(calc)}
                                className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer border border-slate-200"
                                title="Dimensionar Equipes e RUP da atividade"
                              >
                                <Users className="w-3.5 h-3.5 text-blue-600" />
                                <span>Equipe</span>
                              </button>
                              <button
                                onClick={() => handleOpenEditarCalculo(calc)}
                                className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                title="Editar cálculo"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Editar</span>
                              </button>
                              <button
                                onClick={() => handleDuplicarCalculo(calc)}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                title="Duplicar cálculo"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteCalculo(calc.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Excluir"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 2: CATÁLOGO DE MÓDULOS DE CÁLCULO */}
      {activeTab === 'modulos' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <h3 className="font-bold text-slate-900 text-base">Selecione uma Disciplina para Criar um Novo Cálculo</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Escolha a disciplina técnica desejada para abrir a planilha paramétrica e gerar o quantitativo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {MODULOS_CATALOGO.map((mod) => (
              <div
                key={mod.id}
                onClick={() => handleOpenNovoCalculo(mod.id)}
                className="bg-white border border-slate-200 hover:border-slate-400 p-5 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-xl ${mod.corBg}`}>
                      {renderModuloIcon(mod.icone)}
                    </div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {mod.disciplina}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                      {mod.titulo}
                    </h4>
                    <span className="text-xs text-slate-400 font-medium block mt-0.5">
                      {mod.subtitulo}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    {mod.descricao}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-blue-600">
                  <span>Abrir Calculadora</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drawer Lateral / Modal Centrado de Edição */}
      <CalculoDrawer
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        calculo={calculoEdicao}
        moduloId={moduloDrawerId}
        orcamentoId={orcamentoId}
        itensEap={itensEap}
        onSaveCalculo={(item) => {
          onSaveCalculo(item);
          handleCloseDrawer();
        }}
        onDeleteCalculo={(id) => {
          if (onDeleteCalculo) onDeleteCalculo(id);
          handleCloseDrawer();
        }}
      />

      {/* Modal de Relatório: Memorial de Cálculo Consolidado */}
      {showMemorialModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Memorial de Cálculo de Quantitativos</h3>
                  <p className="text-xs text-slate-500">Relatório técnico consolidado da memória do orçamento</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  🖨️ Imprimir / PDF
                </button>
                <button
                  onClick={() => setShowMemorialModal(false)}
                  className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                >
                  Fechar
                </button>
              </div>
            </div>

            {/* Conteúdo do Memorial */}
            <div className="space-y-6 text-sm text-slate-700">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold">Total de Memórias</span>
                  <span className="text-base font-bold text-slate-800">{calculos.length} elementos</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Volume Concreto</span>
                  <span className="text-base font-bold text-blue-600">{totaisGlobais.concreto} m³</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Área Fôrmas</span>
                  <span className="text-base font-bold text-amber-600">{totaisGlobais.forma} m²</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Total Aço</span>
                  <span className="text-base font-bold text-emerald-600">{totaisGlobais.aco} kg</span>
                </div>
              </div>

              {/* Lista Detalhada de Itens */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 text-sm border-b border-slate-200 pb-2">Detalhamento por Elemento Calculado</h4>
                
                {calculos.map((calc, idx) => (
                  <div key={calc.id} className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>{idx + 1}. {calc.nome} ({calc.predioSetor || 'Geral'})</span>
                      <span className="text-blue-600 font-mono capitalize">{calc.modulo_id.replace('_', ' ')}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg text-slate-600">
                      <div>
                        <strong>Resultados:</strong> {Object.entries(calc.resultados)
                          .filter(([k]) => k !== 'detalhes' && k !== 'resumoInsumos')
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' | ')}
                      </div>
                      <div>
                        <strong>Vínculos EAP:</strong> {calc.vinculos.map(v => `${v.item_eap} (${v.fatorMultiplicativo || 1}x)`).join(', ') || 'Nenhum'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {dimensionandoItem && (
        <DimensionamentoEquipeModal
          nomeAtividade={dimensionandoItem.nome}
          quantidadeTotal={dimensionandoItem.resultados.volumeConcretoM3 || dimensionandoItem.resultados.areaFormaM2 || dimensionandoItem.resultados.areaLiquidaM2 || 100}
          unidade="m³"
          data={dimensionandoItem.dimensionamentoEquipe}
          onSave={(data) => {
            onSaveCalculo({
              ...dimensionandoItem,
              dimensionamentoEquipe: data
            });
            setDimensionandoItem(null);
          }}
          onClose={() => setDimensionandoItem(null)}
        />
      )}
    </div>
  );
};
