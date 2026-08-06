import React, { useEffect, useState, useCallback, useMemo } from 'react';
import type { CalculoResultado, ResumoInsumoItem, TipoInsumoCategoria } from '../../../types/calculos';
import { 
  Package, CheckCircle2, Trash2, Search, X, 
  PieChart as PieChartIcon, Building2, Calculator, Box
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Props {
  parametros: Record<string, any>;
  onChangeParametros: (newParams: Record<string, any>) => void;
  onUpdateResultados: (resultados: CalculoResultado) => void;
}

export const SuperestruturaForm: React.FC<Props> = ({
  parametros,
  onChangeParametros,
  onUpdateResultados
}) => {
  // Navegação de Sub-Abas de Superestrutura
  const [activeSubTab, setActiveSubTab] = useState<'resumo' | 'inloco' | 'premoldado' | 'memoria' | 'composicao'>('resumo');

  // Modo Estrutural Principal
  const sistemaEstrutural = parametros.sistemaEstrutural || 'inloco'; // 'inloco' | 'premoldado'

  // --- ESTRUTURAS MOLDADAS IN-LOCO ---
  const elementoInLoco = parametros.elementoInLoco || 'pilar_retangular'; // 'pilar_retangular' | 'pilar_circular' | 'viga_inloco' | 'laje_macica' | 'laje_cubeta' | 'parede_concreto' | 'capa_laje_5cm'
  const qtdInLocoRaw = parametros.qtdInLoco !== undefined ? String(parametros.qtdInLoco) : '12';
  const dimensaoB1Raw = parametros.dimensaoB1 !== undefined ? String(parametros.dimensaoB1) : '0.40'; // Largura B ou Diâmetro (m)
  const dimensaoH1Raw = parametros.dimensaoH1 !== undefined ? String(parametros.dimensaoH1) : '0.50'; // Altura H ou Comprimento pilar (m)
  const comprimentoVigaLajeRaw = parametros.comprimentoVigaLaje !== undefined ? String(parametros.comprimentoVigaLaje) : '6.00'; // Comprimento L (m)
  const peDireitoCimbramentoRaw = parametros.peDireitoCimbramento !== undefined ? String(parametros.peDireitoCimbramento) : '3.50'; // H cimbramento (m)
  const taxaAcoInLocoRaw = parametros.taxaAcoInLoco !== undefined ? String(parametros.taxaAcoInLoco) : '110'; // kg/m³

  // --- ESTRUTURAS PRÉ-MOLDADAS ---
  const elementoPreMoldado = parametros.elementoPreMoldado || 'viga_premoldada'; // 'pilar_premoldado' | 'viga_premoldada' | 'laje_premoldada' | 'laje_alveolar_15' | 'laje_alveolar_20'
  const qtdPreMoldadoRaw = parametros.qtdPreMoldado !== undefined ? String(parametros.qtdPreMoldado) : '24';
  const larguraPreRaw = parametros.larguraPre !== undefined ? String(parametros.larguraPre) : '0.40';
  const alturaPreRaw = parametros.alturaPre !== undefined ? String(parametros.alturaPre) : '0.60';
  const comprimentoPreRaw = parametros.comprimentoPre !== undefined ? String(parametros.comprimentoPre) : '8.00';
  const taxaAcoPreRaw = parametros.taxaAcoPre !== undefined ? String(parametros.taxaAcoPre) : '95'; // kg/m³

  // Insumos do Resumo de Superestrutura
  const resumoInsumosState: ResumoInsumoItem[] = parametros.resumoInsumosSuperestrutura || [
    { id: '1', codigo: '1360', descricao: 'Concreto fck ≥ 35 MPa usinado para vigas, pilares e lajes', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm³', precoUnitario: 395.00, regraCalculo: 'concreto_superestrutura' },
    { id: '2', codigo: '260', descricao: 'Fôrma de compensado plastificado 18mm com gravatas e travas para superestrutura', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm²', precoUnitario: 54.00, regraCalculo: 'forma_superestrutura' },
    { id: '3', codigo: '730', descricao: 'Aço CA-50/60 cortado e dobrado para superestrutura', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'kg', precoUnitario: 6.85, regraCalculo: 'aco_superestrutura' },
    { id: '4', codigo: '385', descricao: 'Cimbramento e escoramento metálico pesado com forcados e vigas', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm³', precoUnitario: 26.00, regraCalculo: 'cimbramento_superestrutura' },
    { id: '5', codigo: '810', descricao: 'Montagem e içamento de peças pré-moldadas estruturais (Guindaste / Munck)', tipoInsumo: 'Mão de Obra', fase: 'fabricacao', unidade: 'un', precoUnitario: 450.00, regraCalculo: 'pecas_premoldadas' }
  ];

  // Modal de Busca no Banco Próprio BRP
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Conversões numéricas In-Loco
  const qtdInLoco = parseInt(qtdInLocoRaw, 10) || 0;
  const dimensaoB1 = parseFloat(dimensaoB1Raw.replace(',', '.')) || 0;
  const dimensaoH1 = parseFloat(dimensaoH1Raw.replace(',', '.')) || 0;
  const comprimentoVigaLaje = parseFloat(comprimentoVigaLajeRaw.replace(',', '.')) || 0;
  const peDireitoCimbramento = parseFloat(peDireitoCimbramentoRaw.replace(',', '.')) || 0;
  const taxaAcoInLoco = parseFloat(taxaAcoInLocoRaw.replace(',', '.')) || 0;

  // Conversões numéricas Pré-Moldados
  const qtdPreMoldado = parseInt(qtdPreMoldadoRaw, 10) || 0;
  const larguraPre = parseFloat(larguraPreRaw.replace(',', '.')) || 0;
  const alturaPre = parseFloat(alturaPreRaw.replace(',', '.')) || 0;
  const comprimentoPre = parseFloat(comprimentoPreRaw.replace(',', '.')) || 0;
  const taxaAcoPre = parseFloat(taxaAcoPreRaw.replace(',', '.')) || 0;

  // --------------------------------------------------------------------------
  // CÁLCULOS FÍSICO-GEOMÉTRICOS E CRITÉRIOS DA PLANILHA "Superestrutura"
  // --------------------------------------------------------------------------
  let volConcretoInLocoUnitM3 = 0;
  let areaFormaInLocoUnitM2 = 0;
  let volCimbramentoInLocoUnitM3 = 0;

  if (elementoInLoco === 'pilar_retangular') {
    // Pilar Retangular PIC: b * h * H
    volConcretoInLocoUnitM3 = dimensaoB1 * dimensaoH1 * peDireitoCimbramento;
    areaFormaInLocoUnitM2 = 2 * (dimensaoB1 + dimensaoH1) * peDireitoCimbramento;
    volCimbramentoInLocoUnitM3 = 0; // Pilares não levam cimbramento na planilha
  } else if (elementoInLoco === 'pilar_circular') {
    // Pilar Circular PLC: PI * (r^2) * H
    const raio = dimensaoB1 / 2;
    volConcretoInLocoUnitM3 = Math.PI * Math.pow(raio, 2) * peDireitoCimbramento;
    areaFormaInLocoUnitM2 = Math.PI * dimensaoB1 * peDireitoCimbramento;
    volCimbramentoInLocoUnitM3 = 0;
  } else if (elementoInLoco === 'viga_inloco') {
    // Viga In-Loco VIC: b * h * L
    volConcretoInLocoUnitM3 = dimensaoB1 * dimensaoH1 * comprimentoVigaLaje;
    areaFormaInLocoUnitM2 = (dimensaoB1 + 2 * dimensaoH1) * comprimentoVigaLaje;
    // Cimbramento Viga (Linha B64): considerado largura da viga + 0.60m de cada lado!
    volCimbramentoInLocoUnitM3 = (dimensaoB1 + 1.20) * comprimentoVigaLaje * peDireitoCimbramento;
  } else if (elementoInLoco === 'laje_macica' || elementoInLoco === 'laje_cubeta') {
    // Laje LIC / CUB: B * L * e
    volConcretoInLocoUnitM3 = dimensaoB1 * comprimentoVigaLaje * dimensaoH1;
    areaFormaInLocoUnitM2 = dimensaoB1 * comprimentoVigaLaje; // Fundo da laje
    volCimbramentoInLocoUnitM3 = dimensaoB1 * comprimentoVigaLaje * peDireitoCimbramento;
  } else if (elementoInLoco === 'capa_laje_5cm') {
    // Capa de Laje 5cm: B * L * 0.05
    volConcretoInLocoUnitM3 = dimensaoB1 * comprimentoVigaLaje * 0.05;
    areaFormaInLocoUnitM2 = 0;
    volCimbramentoInLocoUnitM3 = 0;
  } else {
    // Parede de Concreto PC: e * L * H
    volConcretoInLocoUnitM3 = dimensaoB1 * comprimentoVigaLaje * peDireitoCimbramento;
    areaFormaInLocoUnitM2 = 2 * comprimentoVigaLaje * peDireitoCimbramento;
    volCimbramentoInLocoUnitM3 = 0;
  }

  const volConcretoInLocoTotalM3 = Math.round(volConcretoInLocoUnitM3 * qtdInLoco * 100) / 100;
  const areaFormaInLocoTotalM2 = Math.round(areaFormaInLocoUnitM2 * qtdInLoco * 100) / 100;
  const volCimbramentoInLocoTotalM3 = Math.round(volCimbramentoInLocoUnitM3 * qtdInLoco * 100) / 100;
  const pesoAcoInLocoTotalKg = Math.round(volConcretoInLocoTotalM3 * taxaAcoInLoco * 100) / 100;

  // --------------------------------------------------------------------------
  // CÁLCULOS DA ESTRUTURA PRÉ-MOLDADA
  // --------------------------------------------------------------------------
  const volConcretoPreUnitM3 = larguraPre * alturaPre * comprimentoPre;
  const areaFormaPreUnitM2 = 2 * (larguraPre + alturaPre) * comprimentoPre;

  const volConcretoPreTotalM3 = Math.round(volConcretoPreUnitM3 * qtdPreMoldado * 100) / 100;
  const areaFormaPreTotalM2 = Math.round(areaFormaPreUnitM2 * qtdPreMoldado * 100) / 100;
  const pesoAcoPreTotalKg = Math.round(volConcretoPreTotalM3 * taxaAcoPre * 100) / 100;

  // --------------------------------------------------------------------------
  // CONSOLIDAÇÃO TOTAL DE SUPERESTRUTURA
  // --------------------------------------------------------------------------
  const volumeConcretoTotalM3 = sistemaEstrutural === 'inloco' ? volConcretoInLocoTotalM3 : volConcretoPreTotalM3;
  const areaFormaTotalM2 = sistemaEstrutural === 'inloco' ? areaFormaInLocoTotalM2 : areaFormaPreTotalM2;
  const volCimbramentoTotalM3 = sistemaEstrutural === 'inloco' ? volCimbramentoInLocoTotalM3 : 0;
  const pesoAcoTotalKg = sistemaEstrutural === 'inloco' ? pesoAcoInLocoTotalKg : pesoAcoPreTotalKg;
  const qtdPecasTotalUn = sistemaEstrutural === 'inloco' ? qtdInLoco : qtdPreMoldado;

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

  // Helper para determinar a regra de cálculo matemática de cada insumo de Superestrutura
  const calcularCoeficienteSuperestrutura = (item: ResumoInsumoItem): number => {
    const regra = item.regraCalculo;
    const desc = item.descricao.toLowerCase();

    if (regra === 'concreto_superestrutura' || desc.includes('concreto')) {
      return volumeConcretoTotalM3;
    }
    if (regra === 'forma_superestrutura' || desc.includes('fôrma') || desc.includes('forma')) {
      return areaFormaTotalM2;
    }
    if (regra === 'aco_superestrutura' || desc.includes('aço') || desc.includes('aco')) {
      return pesoAcoTotalKg;
    }
    if (regra === 'cimbramento_superestrutura' || desc.includes('cimbramento') || desc.includes('escoramento')) {
      return volCimbramentoTotalM3;
    }
    if (regra === 'pecas_premoldadas' || desc.includes('peça') || desc.includes('pré-moldada') || desc.includes('içamento')) {
      return qtdPecasTotalUn;
    }

    return item.taxaProdutividade ?? 1.0;
  };

  // Consolidação Financeira
  const calcularResumoConsolidado = (): ResumoInsumoItem[] => {
    return resumoInsumosState.map((item) => {
      const coefUnitario = calcularCoeficienteSuperestrutura(item);
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
  const custoTotalSuperestruturaR$ = resumoCalculadoList.reduce((acc, i) => acc + (i.custoTotalR$ || 0), 0);

  // Agrupamento de Gastos para o Gráfico
  const gastosCategorias = useMemo(() => {
    let concreto = 0;
    let forma = 0;
    let aco = 0;
    let cimbramentoPecas = 0;

    resumoCalculadoList.forEach(item => {
      const desc = item.descricao.toLowerCase();
      const val = item.custoTotalR$ || 0;

      if (desc.includes('concreto')) {
        concreto += val;
      } else if (desc.includes('fôrma') || desc.includes('forma')) {
        forma += val;
      } else if (desc.includes('aço') || desc.includes('aco')) {
        aco += val;
      } else {
        cimbramentoPecas += val;
      }
    });

    const total = custoTotalSuperestruturaR$ > 0 ? custoTotalSuperestruturaR$ : 1;

    return {
      concreto: Math.round(concreto * 100) / 100,
      forma: Math.round(forma * 100) / 100,
      aco: Math.round(aco * 100) / 100,
      cimbramentoPecas: Math.round(cimbramentoPecas * 100) / 100,

      percConcreto: Math.round((concreto / total) * 100),
      percForma: Math.round((forma / total) * 100),
      percAco: Math.round((aco / total) * 100),
      percCimbramentoPecas: Math.round((cimbramentoPecas / total) * 100)
    };
  }, [resumoCalculadoList, custoTotalSuperestruturaR$]);

  useEffect(() => {
    onUpdateResultados({
      volumeConcretoM3: volumeConcretoTotalM3,
      areaFormaM2: areaFormaTotalM2,
      pesoAcoKg: pesoAcoTotalKg,
      custoTotalEstimadoR$: Math.round(custoTotalSuperestruturaR$ * 100) / 100,

      detalhes: {
        'Sistema Estrutural': sistemaEstrutural === 'inloco' ? `Estrutura Moldada In-Loco (${elementoInLoco})` : `Estrutura Pré-Moldada (${elementoPreMoldado})`,
        'Quantidade Total de Peças': `${qtdPecasTotalUn} un`,
        'Volume Concreto Total': `${volumeConcretoTotalM3.toFixed(2)} m³`,
        'Área Total de Fôrmas': `${areaFormaTotalM2.toFixed(2)} m²`,
        'Aço CA-50 Total': `${pesoAcoTotalKg.toFixed(2)} kg`,
        'Volume de Cimbramento': sistemaEstrutural === 'inloco' ? `${volCimbramentoTotalM3.toFixed(2)} m³` : 'N/A (Pré-Moldado)',
        'Custo Total Estimado': `R$ ${custoTotalSuperestruturaR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      }
    });
  }, [sistemaEstrutural, elementoInLoco, elementoPreMoldado, qtdPecasTotalUn, volumeConcretoTotalM3, areaFormaTotalM2, pesoAcoTotalKg, volCimbramentoTotalM3, custoTotalSuperestruturaR$]);

  const updateParam = (key: string, val: any) => {
    onChangeParametros({ ...parametros, [key]: val });
  };

  const handleUpdateResumoItem = (id: string, field: keyof ResumoInsumoItem, val: any) => {
    const updated = resumoInsumosState.map(i => i.id === id ? { ...i, [field]: val } : i);
    updateParam('resumoInsumosSuperestrutura', updated);
  };

  const handleDeleteResumoItem = (id: string) => {
    const updated = resumoInsumosState.filter(i => i.id !== id);
    updateParam('resumoInsumosSuperestrutura', updated);
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
      unidade: item.unidade || 'm³',
      precoUnitario: preco,
      regraCalculo: 'fixo'
    };

    updateParam('resumoInsumosSuperestrutura', [...resumoInsumosState, newItem]);
    setIsSearchModalOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="space-y-6">
      {/* HEADER PRINCIPAL DE SUPERESTRUTURA */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wider">
              Modelo de Precisão "Superestruturas - Modelo.xlsx"
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Calculadora & Orçamento de Estruturas de Concreto / Aço
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cálculo físico-geométrico de pilares, vigas, lajes e peças pré-moldadas com critério oficial NBR
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-right">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Volume Concreto Total</span>
            <span className="text-base font-mono font-extrabold text-slate-900">
              {volumeConcretoTotalM3.toFixed(2)} <span className="text-xs font-normal text-slate-500">m³</span>
            </span>
          </div>

          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xs text-right min-w-[170px]">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Custo Total Estrutura</span>
            <span className="text-lg font-mono font-black text-emerald-400">
              R$ {custoTotalSuperestruturaR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* MODAL RADIO SWITCHER: ESTRUTURA MOLDADA IN-LOCO VS PRÉ-MOLDADA */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block mb-0.5">
            Sistema Construtivo da Superestrutura
          </span>
          <h4 className="text-sm font-bold">Selecione a Tecnologia de Execução da Estrutura:</h4>
        </div>

        <div className="flex items-center space-x-4 bg-slate-800 p-2 rounded-xl border border-slate-700">
          <label className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${sistemaEstrutural === 'inloco' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
            <input
              type="radio"
              name="sistemaEstrutural"
              value="inloco"
              checked={sistemaEstrutural === 'inloco'}
              onChange={() => updateParam('sistemaEstrutural', 'inloco')}
              className="w-4 h-4 text-blue-500 focus:ring-blue-500 cursor-pointer"
            />
            <span>(●) ESTRUTURA MOLDADA IN-LOCO</span>
          </label>

          <label className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${sistemaEstrutural === 'premoldado' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
            <input
              type="radio"
              name="sistemaEstrutural"
              value="premoldado"
              checked={sistemaEstrutural === 'premoldado'}
              onChange={() => updateParam('sistemaEstrutural', 'premoldado')}
              className="w-4 h-4 text-blue-500 focus:ring-blue-500 cursor-pointer"
            />
            <span>(●) ESTRUTURA PRÉ-MOLDADA</span>
          </label>
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
          onClick={() => setActiveSubTab('inloco')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'inloco'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-blue-400" />
          <span>🏢 Estruturas In-Loco</span>
        </button>

        <button
          onClick={() => setActiveSubTab('premoldado')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'premoldado'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          <Box className="w-3.5 h-3.5 text-amber-400" />
          <span>🏗️ Estruturas Pré-Moldadas</span>
        </button>

        <button
          onClick={() => setActiveSubTab('memoria')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'memoria'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          <Calculator className="w-3.5 h-3.5 text-emerald-400" />
          <span>📐 Memória de Cálculo Físico</span>
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
          {/* Bento Grid de Gastos */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-slate-700" />
                  Decomposição dos Custos da Superestrutura
                </h3>
                <p className="text-xs text-slate-500">Distribuição percentual entre Concreto, Fôrmas, Aço CA-50 e Cimbramento/Içamento</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-900 inline-block" /> Concreto ({gastosCategorias.percConcreto}%)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-600 inline-block" /> Fôrmas ({gastosCategorias.percForma}%)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" /> Aço CA-50 ({gastosCategorias.percAco}%)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Cimbramento/Peças ({gastosCategorias.percCimbramentoPecas}%)</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-5 w-full bg-slate-100 rounded-xl overflow-hidden flex shadow-inner">
                <div style={{ width: `${gastosCategorias.percConcreto}%` }} className="bg-slate-900 h-full transition-all duration-500" />
                <div style={{ width: `${gastosCategorias.percForma}%` }} className="bg-blue-600 h-full transition-all duration-500" />
                <div style={{ width: `${gastosCategorias.percAco}%` }} className="bg-emerald-600 h-full transition-all duration-500" />
                <div style={{ width: `${gastosCategorias.percCimbramentoPecas}%` }} className="bg-amber-500 h-full transition-all duration-500" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">1. Concreto Usinado</span>
                  <span className="text-sm font-mono font-extrabold text-slate-900 block">
                    {gastosCategorias.concreto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">{gastosCategorias.percConcreto}% do total</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">2. Fôrmas Compensado/Plastificado</span>
                  <span className="text-sm font-mono font-extrabold text-slate-900 block">
                    {gastosCategorias.forma.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">{gastosCategorias.percForma}% do total</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">3. Armadura de Aço CA-50/60</span>
                  <span className="text-sm font-mono font-extrabold text-slate-900 block">
                    {gastosCategorias.aco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">{gastosCategorias.percAco}% do total</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">4. Cimbramento / Içamento</span>
                  <span className="text-sm font-mono font-extrabold text-slate-900 block">
                    {gastosCategorias.cimbramentoPecas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">{gastosCategorias.percCimbramentoPecas}% do total</span>
                </div>
              </div>
            </div>
          </div>

          {/* Resumo Físico Consolidado */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Volume Concreto</span>
              <span className="text-lg font-mono font-black text-slate-900 block">{volumeConcretoTotalM3.toFixed(2)} m³</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Área de Fôrmas</span>
              <span className="text-lg font-mono font-black text-slate-900 block">{areaFormaTotalM2.toFixed(2)} m²</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Aço CA-50/60</span>
              <span className="text-lg font-mono font-black text-slate-900 block">{pesoAcoTotalKg.toFixed(2)} kg</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Cimbramento</span>
              <span className="text-lg font-mono font-black text-amber-600 block">{volCimbramentoTotalM3.toFixed(2)} m³</span>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA 2: ESTRUTURAS MOLDADAS IN-LOCO */}
      {activeSubTab === 'inloco' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-700" />
                Parâmetros de Elementos Moldados In-Loco (Aba "Superestrutura")
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Elemento Estrutural In-Loco</label>
                <select
                  value={elementoInLoco}
                  onChange={(e) => updateParam('elementoInLoco', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-800 outline-none focus:border-slate-700 shadow-2xs cursor-pointer"
                >
                  <option value="pilar_retangular">[PIC] Pilar In-Loco Retangular</option>
                  <option value="pilar_circular">[PLC] Pilar In-Loco Circular (Ø)</option>
                  <option value="viga_inloco">[VIC] Viga In-Loco Retangular</option>
                  <option value="laje_macica">[LIC] Laje In-Loco Maciça</option>
                  <option value="laje_cubeta">[CUB] Laje Cubeta / Nervurada</option>
                  <option value="parede_concreto">[PC] Parede de Concreto Armado</option>
                  <option value="capa_laje_5cm">[Capa 5cm] Capa de Concreto e=5cm</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Quantidade de Peças / Painéis</label>
                <input
                  type="number"
                  min="1"
                  placeholder="12"
                  value={qtdInLocoRaw}
                  onChange={(e) => updateParam('qtdInLoco', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {elementoInLoco === 'pilar_circular' ? 'Diâmetro Ø (m)' : 'Largura B (m)'}
                </label>
                <input
                  type="number"
                  step="0.05"
                  placeholder="0.40"
                  value={dimensaoB1Raw}
                  onChange={(e) => updateParam('dimensaoB1', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              {elementoInLoco !== 'pilar_circular' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {elementoInLoco === 'laje_macica' || elementoInLoco === 'laje_cubeta' ? 'Espessura e (m)' : 'Altura H (m)'}
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    placeholder="0.50"
                    value={dimensaoH1Raw}
                    onChange={(e) => updateParam('dimensaoH1', e.target.value)}
                    className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                  />
                </div>
              )}

              {elementoInLoco !== 'pilar_retangular' && elementoInLoco !== 'pilar_circular' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Comprimento Viga / Laje L (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="6.00"
                    value={comprimentoVigaLajeRaw}
                    onChange={(e) => updateParam('comprimentoVigaLaje', e.target.value)}
                    className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pé-Direito H cimbramento (m)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="3.50"
                  value={peDireitoCimbramentoRaw}
                  onChange={(e) => updateParam('peDireitoCimbramento', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Taxa de Aço CA-50 (kg/m³)</label>
                <input
                  type="number"
                  step="5"
                  placeholder="110"
                  value={taxaAcoInLocoRaw}
                  onChange={(e) => updateParam('taxaAcoInLoco', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA 3: ESTRUTURAS PRÉ-MOLDADAS */}
      {activeSubTab === 'premoldado' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Box className="w-4 h-4 text-slate-700" />
                Parâmetros de Elementos Pré-Moldados (Linhas A21:A29 na Planilha)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Peça Pré-Moldada</label>
                <select
                  value={elementoPreMoldado}
                  onChange={(e) => updateParam('elementoPreMoldado', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-800 outline-none focus:border-slate-700 shadow-2xs cursor-pointer"
                >
                  <option value="viga_premoldada">[VP] Viga Pré-Moldada Protendida</option>
                  <option value="pilar_premoldado">[PP] Pilar Pré-Moldado</option>
                  <option value="laje_premoldada">[LP] Laje Pré-Moldada Treliçada</option>
                  <option value="laje_alveolar_15">[LP15] Laje Alveolar 15cm</option>
                  <option value="laje_alveolar_20">[LP20] Laje Alveolar 20cm</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Quantidade de Peças (un)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="24"
                  value={qtdPreMoldadoRaw}
                  onChange={(e) => updateParam('qtdPreMoldado', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Largura B (m)</label>
                <input
                  type="number"
                  step="0.05"
                  placeholder="0.40"
                  value={larguraPreRaw}
                  onChange={(e) => updateParam('larguraPre', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Altura H (m)</label>
                <input
                  type="number"
                  step="0.05"
                  placeholder="0.60"
                  value={alturaPreRaw}
                  onChange={(e) => updateParam('alturaPre', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Comprimento L (m)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="8.00"
                  value={comprimentoPreRaw}
                  onChange={(e) => updateParam('comprimentoPre', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Taxa de Aço CA-50 (kg/m³)</label>
                <input
                  type="number"
                  step="5"
                  placeholder="95"
                  value={taxaAcoPreRaw}
                  onChange={(e) => updateParam('taxaAcoPre', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA 4: MEMÓRIA DE CÁLCULO FÍSICO */}
      {activeSubTab === 'memoria' && (
        <div className="space-y-5">
          <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 shadow-lg border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-400" />
                Critérios de Medição NBR (Modelo Oficial da Planilha)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block border-b border-slate-700 pb-1">1. Pilares & Colunas</span>
                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  <div>• <strong>Altura:</strong> Medida piso a piso (face superior da laje inferior à laje superior).</div>
                  <div>• <strong>Seção Nominal:</strong> {elementoInLoco === 'pilar_circular' ? `Diâmetro Ø=${dimensaoB1}m` : `${dimensaoB1}m × ${dimensaoH1}m`}</div>
                  <div className="pt-1 border-t border-slate-700 flex justify-between"><span>Volume Concreto:</span><span className="font-bold text-white">{volConcretoInLocoTotalM3.toFixed(2)} m³</span></div>
                </div>
              </div>

              <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block border-b border-slate-700 pb-1">2. Vigas & Cimbramento</span>
                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  <div>• <strong>Comprimento:</strong> Medido livre entre faces de pilares.</div>
                  <div>• <strong>Regra Cimbramento (B64):</strong> Largura viga + 1,20m de acréscimo lateral!</div>
                  <div className="pt-1 border-t border-slate-700 flex justify-between"><span>Cimbramento Total:</span><span className="font-bold text-amber-400">{volCimbramentoInLocoTotalM3.toFixed(2)} m³</span></div>
                </div>
              </div>

              <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block border-b border-slate-700 pb-1">3. Lajes & Fôrmas</span>
                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  <div>• <strong>Vão Livre:</strong> Entre faces de vigas suporte.</div>
                  <div>• <strong>Área de Fôrmas:</strong> {areaFormaTotalM2.toFixed(2)} m² (fundo da laje)</div>
                  <div className="pt-1 border-t border-slate-700 flex justify-between"><span>Peso Aço CA-50:</span><span className="font-bold text-emerald-400">{pesoAcoTotalKg.toFixed(2)} kg</span></div>
                </div>
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
                Lista Quantitativa de Compras e Serviços de Superestrutura (Base Própria BRP)
              </h3>
              <p className="text-xs text-slate-500">Insumos conectados com atribuição de Regra Paramétrica de Cálculo para recálculo financeiro dinâmico</p>
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
                  <th className="py-2.5 px-3">Descrição do Item de Superestrutura</th>
                  <th className="py-2.5 px-3 w-48">Regra Paramétrica</th>
                  <th className="py-2.5 px-3 w-16 text-center">UN</th>
                  <th className="py-2.5 px-3 text-right w-24">Qtd Total</th>
                  <th className="py-2.5 px-3 text-right w-32">Preço Unit. (R$)</th>
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
                        <option value="concreto_superestrutura">🏗️ Concreto Usinado (m³)</option>
                        <option value="forma_superestrutura">📐 Fôrmas Estruturais (m²)</option>
                        <option value="aco_superestrutura">⛓️ Aço CA-50/60 (kg)</option>
                        <option value="cimbramento_superestrutura">🪜 Cimbramento Teto/Viga (m³)</option>
                        <option value="pecas_premoldadas">🧱 Peças Pré-Moldadas (un)</option>
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
                        step="0.01"
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
                Consolidação do Orçamento de Superestrutura
              </span>
            </div>

            <div className="flex items-center gap-6 text-right">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Custo Total Global</span>
                <span className="text-lg font-mono font-black text-emerald-400">
                  R$ {custoTotalSuperestruturaR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE BUSCA NO BANCO PRÓPRIO BRP */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">Selecionar do Banco Próprio</h4>
                <p className="text-xs text-slate-400">Pesquise insumos ou composições para Superestruturas</p>
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
