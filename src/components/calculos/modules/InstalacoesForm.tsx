import React, { useEffect, useState, useCallback, useMemo } from 'react';
import type { CalculoResultado, ResumoInsumoItem, TipoInsumoCategoria } from '../../../types/calculos';
import { 
  Package, CheckCircle2, Trash2, Search, X, 
  PieChart as PieChartIcon, Building2, Calculator, Zap, Droplets, Wind
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Props {
  parametros: Record<string, any>;
  onChangeParametros: (newParams: Record<string, any>) => void;
  onUpdateResultados: (resultados: CalculoResultado) => void;
}

// TAXAS PADRÃO POR TIPOLOGIA (EXTRAÍDAS DE ESTIMATIVA INSTALAÇÕES - GERAL REV 00.XLSX)
const TAXAS_PADRAO_TIPOLOGIA: Record<string, { nome: string; txEletrica: number; txHidro: number; txIncendio: number; txHvac: number; txEspeciais: number }> = {
  'industrial': { nome: 'Planta Industrial / Galpão Logístico', txEletrica: 135.00, txHidro: 65.00, txIncendio: 60.00, txHvac: 75.00, txEspeciais: 45.00 },
  'hospitalar': { nome: 'Hospital / Centro de Diagnóstico (IT Médico)', txEletrica: 220.00, txHidro: 160.00, txIncendio: 50.00, txHvac: 280.00, txEspeciais: 95.00 },
  'comercial': { nome: 'Edifício Comercial / Escritórios (VRF/Chiller)', txEletrica: 110.00, txHidro: 55.00, txIncendio: 45.00, txHvac: 120.00, txEspeciais: 50.00 },
  'hotel': { nome: 'Hotelaria / Resort (Aquecimento Solar)', txEletrica: 105.00, txHidro: 90.00, txIncendio: 40.00, txHvac: 95.00, txEspeciais: 40.00 },
  'shopping': { nome: 'Shopping Center / Mall (Sprinklers FM Global)', txEletrica: 145.00, txHidro: 75.00, txIncendio: 65.00, txHvac: 195.00, txEspeciais: 60.00 }
};

export const InstalacoesForm: React.FC<Props> = ({
  parametros,
  onChangeParametros,
  onUpdateResultados
}) => {
  // Navegação de Sub-Abas de Instalações
  const [activeSubTab, setActiveSubTab] = useState<'resumo' | 'eletrica' | 'hidraulica' | 'hvac' | 'composicao'>('resumo');

  // Tipologia & Área Construída
  const tipologiaKey = parametros.tipologiaKey || 'industrial';
  const tipologiaInfo = TAXAS_PADRAO_TIPOLOGIA[tipologiaKey] || TAXAS_PADRAO_TIPOLOGIA['industrial'];
  const areaConstruidaM2Raw = parametros.areaConstruidaM2 !== undefined ? String(parametros.areaConstruidaM2) : '2500';

  // Taxas Personalizáveis (R$/m²)
  const txEletricaRaw = parametros.txEletrica !== undefined ? String(parametros.txEletrica) : String(tipologiaInfo.txEletrica);
  const txHidroRaw = parametros.txHidro !== undefined ? String(parametros.txHidro) : String(tipologiaInfo.txHidro);
  const txIncendioRaw = parametros.txIncendio !== undefined ? String(parametros.txIncendio) : String(tipologiaInfo.txIncendio);
  const txHvacRaw = parametros.txHvac !== undefined ? String(parametros.txHvac) : String(tipologiaInfo.txHvac);
  const txEspeciaisRaw = parametros.txEspeciais !== undefined ? String(parametros.txEspeciais) : String(tipologiaInfo.txEspeciais);

  // Parâmetros Específicos de Elétrica & SPDA
  const temSubestacaoTrafo = parametros.temSubestacaoTrafo !== undefined ? Boolean(parametros.temSubestacaoTrafo) : true;
  const temGeradorGmg = parametros.temGeradorGmg !== undefined ? Boolean(parametros.temGeradorGmg) : true;
  const temSpdaGaiola = parametros.temSpdaGaiola !== undefined ? Boolean(parametros.temSpdaGaiola) : true;

  // Parâmetros Específicos de Hidráulica & Incêndio
  const temAquecimentoSolar = parametros.temAquecimentoSolar !== undefined ? Boolean(parametros.temAquecimentoSolar) : false;
  const temSprinklersFmGlobal = parametros.temSprinklersFmGlobal !== undefined ? Boolean(parametros.temSprinklersFmGlobal) : (tipologiaKey === 'shopping' || tipologiaKey === 'industrial');

  // Conversões numéricas
  const areaConstruidaM2 = parseFloat(areaConstruidaM2Raw.replace(',', '.')) || 0;
  const txEletrica = parseFloat(txEletricaRaw.replace(',', '.')) || 0;
  const txHidro = parseFloat(txHidroRaw.replace(',', '.')) || 0;
  const txIncendio = parseFloat(txIncendioRaw.replace(',', '.')) || 0;
  const txHvac = parseFloat(txHvacRaw.replace(',', '.')) || 0;
  const txEspeciais = parseFloat(txEspeciaisRaw.replace(',', '.')) || 0;

  // Totalizadores Financeiros por Disciplina
  const custoTotalEletrica = areaConstruidaM2 * txEletrica;
  const custoTotalHidro = areaConstruidaM2 * txHidro;
  const custoTotalIncendio = areaConstruidaM2 * txIncendio;
  const custoTotalHvac = areaConstruidaM2 * txHvac;
  const custoTotalEspeciais = areaConstruidaM2 * txEspeciais;

  const custoTotalInstalacoesR$ = custoTotalEletrica + custoTotalHidro + custoTotalIncendio + custoTotalHvac + custoTotalEspeciais;
  const custoPorM2InstalacoesR$ = areaConstruidaM2 > 0 ? custoTotalInstalacoesR$ / areaConstruidaM2 : 0;

  // Insumos do Resumo de Instalações
  const resumoInsumosState: ResumoInsumoItem[] = parametros.resumoInsumosInstalacoes || [
    { id: '1', codigo: 'INS-ELE', descricao: 'Instalações Elétricas, Entradas MT, QGBT, Iluminação & SPDA', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm²', precoUnitario: txEletrica, regraCalculo: 'tx_eletrica' },
    { id: '2', codigo: 'INS-HID', descricao: 'Instalações Hidrossanitárias (Água Fria, Quente, Esgoto, Pluvial)', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm²', precoUnitario: txHidro, regraCalculo: 'tx_hidro' },
    { id: '3', codigo: 'INS-INC', descricao: 'Rede de Incêndio (Hidrantes e Sprinklers FM Global)', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm²', precoUnitario: txIncendio, regraCalculo: 'tx_incendio' },
    { id: '4', codigo: 'INS-VAC', descricao: 'Instalações de HVAC & Climatização (VRF / Chiller / Dutos)', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm²', precoUnitario: txHvac, regraCalculo: 'tx_hvac' },
    { id: '5', codigo: 'INS-ESP', descricao: 'Sistemas Especiais (Lógica, CFTV, Alarme de Incêndio SDAI e Automação)', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm²', precoUnitario: txEspeciais, regraCalculo: 'tx_especiais' }
  ];

  // Modal de Busca no Banco Próprio BRP
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Busca no Banco Próprio BRP
  const fetchBancoItems = useCallback(async (query: string = '') => {
    setLoadingSearch(true);
    try {
      let insQuery = supabase
        .schema('engenharia')
        .from('insumos')
        .select('*')
        .in('fonte_preco', ['Cotação', 'Histórico', 'BRP', 'Próprio', 'PROPRIO', 'Proprio']);

      let compQuery = supabase
        .schema('engenharia')
        .from('composicoes')
        .select('*')
        .or('fonte.eq.Próprio,fonte.eq.PROPRIO,fonte.eq.BRP,fonte.eq.Cotação,fonte.eq.Histórico,fonte.is.null');

      if (query.trim().length >= 2) {
        insQuery = insQuery.or(`descricao.ilike.%${query.trim()}%,codigo.ilike.%${query.trim()}%`);
        compQuery = compQuery.or(`descricao.ilike.%${query.trim()}%,codigo.ilike.%${query.trim()}%`);
      }

      const { data: insData } = await insQuery.limit(25);
      const { data: compData } = await compQuery.limit(25);

      const combined = [
        ...(insData || []).map(i => ({ ...i, tipoItem: 'Insumo' })),
        ...(compData || []).map(c => ({ ...c, tipoItem: 'Composição' }))
      ];
      setSearchResults(combined);
    } catch (err) {
      console.error('Erro na busca do banco próprio:', err);
    } finally {
      setLoadingSearch(false);
    }
  }, []);

  useEffect(() => {
    if (isSearchModalOpen) {
      fetchBancoItems(searchTerm);
    }
  }, [isSearchModalOpen, fetchBancoItems, searchTerm]);

  // Helper para determinar a regra de cálculo matemática de cada insumo de Instalações
  const calcularCoeficienteInstalacoes = (item: ResumoInsumoItem): number => {
    const regra = item.regraCalculo;
    const desc = item.descricao.toLowerCase();

    if (regra === 'tx_eletrica' || desc.includes('elétrica') || desc.includes('spda')) {
      return areaConstruidaM2;
    }
    if (regra === 'tx_hidro' || desc.includes('hidro') || desc.includes('água') || desc.includes('esgoto')) {
      return areaConstruidaM2;
    }
    if (regra === 'tx_incendio' || desc.includes('incêndio') || desc.includes('sprinkler') || desc.includes('hidrante')) {
      return areaConstruidaM2;
    }
    if (regra === 'tx_hvac' || desc.includes('hvac') || desc.includes('climatização') || desc.includes('ar condicionado')) {
      return areaConstruidaM2;
    }
    if (regra === 'tx_especiais' || desc.includes('especiais') || desc.includes('lógica') || desc.includes('cftv') || desc.includes('sdai')) {
      return areaConstruidaM2;
    }

    return item.taxaProdutividade ?? 1.0;
  };

  // Consolidação Financeira
  const calcularResumoConsolidado = (): ResumoInsumoItem[] => {
    return resumoInsumosState.map((item) => {
      const coefUnitario = calcularCoeficienteInstalacoes(item);
      const qtdTotal = coefUnitario;
      const custoTotal = qtdTotal * (item.precoUnitario || 0);

      return {
        ...item,
        quantidadeTotalCalculada: Number(qtdTotal.toFixed(2)),
        coeficienteCalculado: Number(coefUnitario.toFixed(2)),
        custoTotalR$: Number(custoTotal.toFixed(2))
      };
    });
  };

  const resumoCalculadoList = calcularResumoConsolidado();

  // Agrupamento de Gastos para o Gráfico
  const gastosCategorias = useMemo(() => {
    const total = custoTotalInstalacoesR$ > 0 ? custoTotalInstalacoesR$ : 1;

    return {
      eletrica: Math.round(custoTotalEletrica * 100) / 100,
      hidro: Math.round(custoTotalHidro * 100) / 100,
      incendio: Math.round(custoTotalIncendio * 100) / 100,
      hvac: Math.round(custoTotalHvac * 100) / 100,
      especiais: Math.round(custoTotalEspeciais * 100) / 100,

      percEletrica: Math.round((custoTotalEletrica / total) * 100),
      percHidro: Math.round((custoTotalHidro / total) * 100),
      percIncendio: Math.round((custoTotalIncendio / total) * 100),
      percHvac: Math.round((custoTotalHvac / total) * 100),
      percEspeciais: Math.round((custoTotalEspeciais / total) * 100)
    };
  }, [custoTotalEletrica, custoTotalHidro, custoTotalIncendio, custoTotalHvac, custoTotalEspeciais, custoTotalInstalacoesR$]);

  useEffect(() => {
    onUpdateResultados({
      areaLiquidaM2: areaConstruidaM2,
      comprimentoLinearM: 0,
      custoTotalEstimadoR$: Math.round(custoTotalInstalacoesR$ * 100) / 100,

      detalhes: {
        'Tipologia do Projeto': `${tipologiaInfo.nome} (${tipologiaKey})`,
        'Área Total Construída': `${areaConstruidaM2.toLocaleString('pt-BR')} m²`,
        'Custo Médio Unitário Globais': `R$ ${custoPorM2InstalacoesR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / m²`,
        'Instalações Elétricas & SPDA': `R$ ${custoTotalEletrica.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${txEletrica} R$/m²)`,
        'Instalações Hidrossanitárias': `R$ ${custoTotalHidro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${txHidro} R$/m²)`,
        'Rede de Combate a Incêndio': `R$ ${custoTotalIncendio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${txIncendio} R$/m²)`,
        'HVAC & Climatização': `R$ ${custoTotalHvac.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${txHvac} R$/m²)`,
        'Sistemas Especiais (Lógica/CFTV/SDAI)': `R$ ${custoTotalEspeciais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${txEspeciais} R$/m²)`,
        'Custo Total Estimado de Instalações': `R$ ${custoTotalInstalacoesR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      }
    });
  }, [tipologiaKey, tipologiaInfo, areaConstruidaM2, custoPorM2InstalacoesR$, custoTotalEletrica, txEletrica, custoTotalHidro, txHidro, custoTotalIncendio, txIncendio, custoTotalHvac, txHvac, custoTotalEspeciais, txEspeciais, custoTotalInstalacoesR$]);

  const updateParam = (key: string, val: any) => {
    onChangeParametros({ ...parametros, [key]: val });
  };

  const handleUpdateResumoItem = (id: string, field: keyof ResumoInsumoItem, val: any) => {
    const updated = resumoInsumosState.map(i => i.id === id ? { ...i, [field]: val } : i);
    updateParam('resumoInsumosInstalacoes', updated);
  };

  const handleDeleteResumoItem = (id: string) => {
    const updated = resumoInsumosState.filter(i => i.id !== id);
    updateParam('resumoInsumosInstalacoes', updated);
  };

  const handleSelectSearchResult = (item: any) => {
    const rawTipo = String(item.tipo || item.tipo_insumo || item.tipo_atividade || '').toUpperCase();
    let tipoCat: TipoInsumoCategoria = 'Material';

    if (rawTipo.includes('MÃO DE OBRA') || rawTipo.includes('MAO DE OBRA')) {
      tipoCat = 'Mão de Obra';
    } else {
      tipoCat = 'Material';
    }

    const preco = Number(item.valor ?? item.valor_desonerado ?? item.preco_unitario ?? 0);

    const newItem: ResumoInsumoItem = {
      id: String(Date.now()),
      codigo: item.codigo || '000',
      descricao: item.descricao || item.nome || 'Insumo Selecionado',
      tipoInsumo: tipoCat,
      fase: 'fabricacao',
      taxaProdutividade: 1.0,
      unidadeProdutividade: 'un',
      unidade: item.unidade || 'm²',
      precoUnitario: preco,
      regraCalculo: 'fixo'
    };

    updateParam('resumoInsumosInstalacoes', [...resumoInsumosState, newItem]);
    setIsSearchModalOpen(false);
    setSearchTerm('');
  };

  // Handler para troca de tipologia que reseta as taxas para os padrões recomendados da planilha
  const handleSelectTipologia = (newKey: string) => {
    const info = TAXAS_PADRAO_TIPOLOGIA[newKey] || TAXAS_PADRAO_TIPOLOGIA['industrial'];
    onChangeParametros({
      ...parametros,
      tipologiaKey: newKey,
      txEletrica: info.txEletrica,
      txHidro: info.txHidro,
      txIncendio: info.txIncendio,
      txHvac: info.txHvac,
      txEspeciais: info.txEspeciais
    });
  };

  return (
    <div className="space-y-6">
      {/* HEADER PRINCIPAL DE INSTALAÇÕES */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-wider">
              Modelo de Precisão "Estimativa Instalações - Geral rev 00.xlsx"
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Calculadora & Orçamento de Instalações Prediais & Industriais
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Estimativa paramétrica por m² cobrindo Elétrica, Hidráulica, Incêndio, HVAC e Sistemas Especiais
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-right">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Custo por m² Global</span>
            <span className="text-base font-mono font-extrabold text-slate-900">
              R$ {custoPorM2InstalacoesR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-500">/m²</span>
            </span>
          </div>

          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xs text-right min-w-[170px]">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Custo Total Instalações</span>
            <span className="text-lg font-mono font-black text-emerald-400">
              R$ {custoTotalInstalacoesR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* BARRA DE SUB-ABAS CONECTADAS */}
      <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('resumo')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'resumo'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          <PieChartIcon className="w-3.5 h-3.5" />
          <span>📊 Dashboard & Custos</span>
        </button>

        <button
          onClick={() => setActiveSubTab('eletrica')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'eletrica'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>⚡ Elétrica & SPDA</span>
        </button>

        <button
          onClick={() => setActiveSubTab('hidraulica')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'hidraulica'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          <Droplets className="w-3.5 h-3.5 text-blue-400" />
          <span>🚰 Hidráulica & Incêndio</span>
        </button>

        <button
          onClick={() => setActiveSubTab('hvac')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'hvac'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          <Wind className="w-3.5 h-3.5 text-cyan-400" />
          <span>❄️ HVAC & Sistemas Especiais</span>
        </button>

        <button
          onClick={() => setActiveSubTab('composicao')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'composicao'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>🛠️ Tabela de Insumos</span>
        </button>
      </div>

      {/* CONTEÚDO DA SUB-ABA 1: DASHBOARD DE RESUMO GERAL */}
      {activeSubTab === 'resumo' && (
        <div className="space-y-5">
          {/* Seletor de Tipologia da Edificação */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-700" />
                  Tipologia da Edificação & Área Construída
                </h3>
                <p className="text-xs text-slate-500">Selecione o perfil do projeto para carregar as taxas de referência da planilha</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Perfil do Empreendimento</label>
                <select
                  value={tipologiaKey}
                  onChange={(e) => handleSelectTipologia(e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-slate-700 shadow-2xs cursor-pointer text-xs"
                >
                  {Object.entries(TAXAS_PADRAO_TIPOLOGIA).map(([key, t]) => (
                    <option key={key} value={key}>
                      {t.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Área Total Construída (m²)</label>
                <input
                  type="number"
                  step="50"
                  placeholder="2500"
                  value={areaConstruidaM2Raw}
                  onChange={(e) => updateParam('areaConstruidaM2', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Bento Grid de Gastos */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-slate-700" />
                  Decomposição Financeira das Instalações
                </h3>
                <p className="text-xs text-slate-500">Distribuição percentual dos custos entre as 5 disciplinas técnicas</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Elétrica ({gastosCategorias.percEletrica}%)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-600 inline-block" /> Hidráulica ({gastosCategorias.percHidro}%)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-600 inline-block" /> Incêndio ({gastosCategorias.percIncendio}%)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-cyan-500 inline-block" /> HVAC ({gastosCategorias.percHvac}%)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-600 inline-block" /> Especiais ({gastosCategorias.percEspeciais}%)</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-5 w-full bg-slate-100 rounded-xl overflow-hidden flex shadow-inner">
                <div style={{ width: `${gastosCategorias.percEletrica}%` }} className="bg-amber-500 h-full transition-all duration-500" />
                <div style={{ width: `${gastosCategorias.percHidro}%` }} className="bg-blue-600 h-full transition-all duration-500" />
                <div style={{ width: `${gastosCategorias.percIncendio}%` }} className="bg-rose-600 h-full transition-all duration-500" />
                <div style={{ width: `${gastosCategorias.percHvac}%` }} className="bg-cyan-500 h-full transition-all duration-500" />
                <div style={{ width: `${gastosCategorias.percEspeciais}%` }} className="bg-purple-600 h-full transition-all duration-500" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">1. Elétrica & SPDA</span>
                  <span className="text-sm font-mono font-extrabold text-slate-900 block">
                    {gastosCategorias.eletrica.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">{txEletrica} R$/m² ({gastosCategorias.percEletrica}%)</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">2. Hidrossanitário</span>
                  <span className="text-sm font-mono font-extrabold text-slate-900 block">
                    {gastosCategorias.hidro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">{txHidro} R$/m² ({gastosCategorias.percHidro}%)</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">3. Combate a Incêndio</span>
                  <span className="text-sm font-mono font-extrabold text-slate-900 block">
                    {gastosCategorias.incendio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">{txIncendio} R$/m² ({gastosCategorias.percIncendio}%)</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">4. HVAC & Climatização</span>
                  <span className="text-sm font-mono font-extrabold text-slate-900 block">
                    {gastosCategorias.hvac.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">{txHvac} R$/m² ({gastosCategorias.percHvac}%)</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 col-span-2 md:col-span-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">5. Sistemas Especiais</span>
                  <span className="text-sm font-mono font-extrabold text-slate-900 block">
                    {gastosCategorias.especiais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">{txEspeciais} R$/m² ({gastosCategorias.percEspeciais}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA 2: ELÉTRICA & SPDA */}
      {activeSubTab === 'eletrica' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Parâmetros de Instalações Elétricas & SPDA
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Taxa Elétrica (R$/m²)</label>
                <input
                  type="number"
                  step="5"
                  value={txEletricaRaw}
                  onChange={(e) => updateParam('txEletrica', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-amber-600 font-extrabold text-sm outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <label className="block font-bold text-slate-700">Equipamentos & Infraestrutura Incluídos</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={temSubestacaoTrafo}
                      onChange={(e) => updateParam('temSubestacaoTrafo', e.target.checked)}
                      className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
                    />
                    <span className="font-semibold text-slate-700">Subestação Trafo</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={temGeradorGmg}
                      onChange={(e) => updateParam('temGeradorGmg', e.target.checked)}
                      className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
                    />
                    <span className="font-semibold text-slate-700">Gerador GMG</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={temSpdaGaiola}
                      onChange={(e) => updateParam('temSpdaGaiola', e.target.checked)}
                      className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
                    />
                    <span className="font-semibold text-slate-700">SPDA / Gaiola</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Apoio Civil Associado da Elétrica */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 shadow-lg border border-slate-800">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <Calculator className="w-4 h-4 text-amber-400" />
              Apoio Civil Associado (Mapeamento da Planilha Modelo)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono text-slate-300">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1">
                <span className="text-amber-400 font-bold block mb-1">• Obras Civis MT/BT</span>
                <div>- Abertura/Fechamento de Valas para Cabos MT/BT</div>
                <div>- Envelopamento em Concreto de Eletrodutos</div>
                <div>- Canaletas de Concreto com Tampa em Chapa Xadrez</div>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1">
                <span className="text-amber-400 font-bold block mb-1">• Bases de Equipamentos</span>
                <div>- Base de Concreto para Grupo Gerador (GMG)</div>
                <div>- Base de Concreto para Transformador (Trafo)</div>
                <div>- Bases e Canaletas para QGBTs e No-Breaks</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA 3: HIDRÁULICA & INCÊNDIO */}
      {activeSubTab === 'hidraulica' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-500" />
                Parâmetros de Instalações Hidrossanitárias & Incêndio
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Taxa Hidrossanitária (R$/m²)</label>
                <input
                  type="number"
                  step="5"
                  value={txHidroRaw}
                  onChange={(e) => updateParam('txHidro', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-blue-600 font-extrabold text-sm outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Taxa Incêndio (R$/m²)</label>
                <input
                  type="number"
                  step="5"
                  value={txIncendioRaw}
                  onChange={(e) => updateParam('txIncendio', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-rose-600 font-extrabold text-sm outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <label className="block font-bold text-slate-700">Sistemas Adicionais</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={temAquecimentoSolar}
                      onChange={(e) => updateParam('temAquecimentoSolar', e.target.checked)}
                      className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-700">Aquecimento Solar / Boiler</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={temSprinklersFmGlobal}
                      onChange={(e) => updateParam('temSprinklersFmGlobal', e.target.checked)}
                      className="w-4 h-4 text-rose-500 rounded focus:ring-rose-500"
                    />
                    <span className="font-semibold text-slate-700">Sprinklers FM Global</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA 4: HVAC & SISTEMAS ESPECIAIS */}
      {activeSubTab === 'hvac' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Wind className="w-4 h-4 text-cyan-500" />
                Parâmetros de HVAC & Sistemas Especiais (Lógica, CFTV, SDAI)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Taxa HVAC / Climatização (R$/m²)</label>
                <input
                  type="number"
                  step="5"
                  value={txHvacRaw}
                  onChange={(e) => updateParam('txHvac', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-cyan-600 font-extrabold text-sm outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Taxa Sistemas Especiais Lógica/CFTV/SDAI (R$/m²)</label>
                <input
                  type="number"
                  step="5"
                  value={txEspeciaisRaw}
                  onChange={(e) => updateParam('txEspeciais', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-purple-600 font-extrabold text-sm outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA 5: TABELA DE INSUMOS */}
      {(activeSubTab === 'composicao' || activeSubTab === 'resumo') && (
        <div className="lg:col-span-12 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs space-y-0">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-700" />
                Lista Quantitativa de Compras e Serviços de Instalações (Base Própria BRP)
              </h3>
              <p className="text-xs text-slate-500">Insumos conectados com atribuição de Regra Paramétrica por disciplina técnica</p>
            </div>

            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>+ Adicionar do Banco Próprio</span>
            </button>
          </div>

          <div className="p-4 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3 w-20">Código</th>
                  <th className="py-2.5 px-3">Descrição do Serviço / Disciplina de Instalações</th>
                  <th className="py-2.5 px-3 w-48">Regra Paramétrica</th>
                  <th className="py-2.5 px-3 w-16 text-center">UN</th>
                  <th className="py-2.5 px-3 text-right w-24">Qtd Área (m²)</th>
                  <th className="py-2.5 px-3 text-right w-32">Taxa (R$/m²)</th>
                  <th className="py-2.5 px-3 text-right w-32">Custo Total (R$)</th>
                  <th className="py-2.5 px-3 text-center w-12">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resumoCalculadoList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{item.codigo}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{item.descricao}</td>
                    
                    {/* SELETOR DE REGRA PARAMÉTRICA */}
                    <td className="py-2.5 px-3">
                      <select
                        value={item.regraCalculo || 'fixo'}
                        onChange={(e) => handleUpdateResumoItem(item.id, 'regraCalculo', e.target.value)}
                        className="w-full h-7 px-2 py-0.5 border border-slate-300 rounded bg-white text-[11px] font-bold text-slate-700 outline-none focus:border-slate-700 cursor-pointer"
                      >
                        <option value="tx_eletrica">⚡ Taxa Elétrica (Área m²)</option>
                        <option value="tx_hidro">🚰 Taxa Hidrossanitária (Área m²)</option>
                        <option value="tx_incendio">🔥 Taxa Incêndio (Área m²)</option>
                        <option value="tx_hvac">❄️ Taxa HVAC / Climatização (Área m²)</option>
                        <option value="tx_especiais">📡 Taxa Sistemas Especiais (Área m²)</option>
                        <option value="fixo">✏️ Coeficiente Fixo / Manual</option>
                      </select>
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-600">{item.unidade}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                      {item.quantidadeTotalCalculada?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        step="1"
                        value={item.precoUnitario || 0}
                        onChange={(e) => handleUpdateResumoItem(item.id, 'precoUnitario', parseFloat(e.target.value) || 0)}
                        className="w-24 h-7 text-right px-2 border border-slate-300 rounded bg-white font-mono font-bold text-slate-900 outline-none focus:border-slate-700"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      R$ {item.custoTotalR$?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => handleDeleteResumoItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                        title="Excluir item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-t border-slate-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
                Consolidação do Orçamento de Instalações Prediais & Industriais
              </span>
            </div>

            <div className="flex items-center gap-6 text-right">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Custo Total Global</span>
                <span className="text-lg font-mono font-black text-emerald-400">
                  R$ {custoTotalInstalacoesR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE BUSCA NO BANCO PRÓPRIO */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">Selecionar do Banco Próprio</h4>
                <p className="text-xs text-slate-400">Pesquise insumos ou composições para Instalações</p>
              </div>
              <button
                onClick={() => setIsSearchModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border-b border-slate-200">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Digite para filtrar por descrição ou código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-slate-700 outline-none font-medium"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100">
              {loadingSearch ? (
                <div className="p-8 text-center text-slate-500 text-xs font-semibold">Carregando itens do Banco Próprio...</div>
              ) : searchResults.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">Nenhum item encontrado no Banco Próprio.</div>
              ) : (
                searchResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectSearchResult(item)}
                    className="p-3 hover:bg-slate-100/80 transition-colors cursor-pointer rounded-lg flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900">{item.codigo}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {item.tipoItem}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium mt-0.5 group-hover:text-slate-900">
                        {item.descricao || item.nome}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-xs text-slate-900 block">
                        R$ {(item.valor ?? item.valor_desonerado ?? item.preco_unitario ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">{item.unidade || 'UN'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
