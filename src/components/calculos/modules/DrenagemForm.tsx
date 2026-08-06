import React, { useEffect, useState, useCallback, useMemo } from 'react';
import type { CalculoResultado, ResumoInsumoItem, TipoInsumoCategoria } from '../../../types/calculos';
import { 
  Package, CheckCircle2, Trash2, Search, X, 
  Ruler, PieChart as PieChartIcon, Building2, Calculator
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Props {
  parametros: Record<string, any>;
  onChangeParametros: (newParams: Record<string, any>) => void;
  onUpdateResultados: (resultados: CalculoResultado) => void;
}

export const DrenagemForm: React.FC<Props> = ({
  parametros,
  onChangeParametros,
  onUpdateResultados
}) => {
  // Navegação de Sub-Abas da Drenagem
  const [activeSubTab, setActiveSubTab] = useState<'resumo' | 'tubulacao' | 'caixas' | 'composicao'>('resumo');

  // --- ABA 1: VALAS E TUBULAÇÕES (Aba "TUB_quant" & "Mem_Tubos") ---
  const diametroMm = Number(parametros.diametroMm) || 400; // mm (300 a 1500)
  const comprimentoMetrosRaw = parametros.comprimentoMetros !== undefined ? String(parametros.comprimentoMetros) : '50';
  const profundidadeMediaTubulacaoRaw = parametros.profundidadeMediaTubulacao !== undefined ? String(parametros.profundidadeMediaTubulacao) : '1.5';
  const anguloTaludeGraus = Number(parametros.anguloTaludeGraus) || 45; // 45 graus

  // --- ABA 2: POÇOS DE VISITA & CAIXAS (Aba "POÇO_quant" & "Mem_CX") ---
  const tipoCaixa = parametros.tipoCaixa || 'PVAP'; // 'PVAP' | 'PVET' | 'CX_BLOCO' | 'CX_CONCRETO'
  const quantidadeCaixasRaw = parametros.quantidadeCaixas !== undefined ? String(parametros.quantidadeCaixas) : '4';
  const dimensaoCaixaLRaw = parametros.dimensaoCaixaL !== undefined ? String(parametros.dimensaoCaixaL) : '1.6';
  const dimensaoCaixaBRaw = parametros.dimensaoCaixaB !== undefined ? String(parametros.dimensaoCaixaB) : '1.6';
  const profundidadeMediaCaixaRaw = parametros.profundidadeMediaCaixa !== undefined ? String(parametros.profundidadeMediaCaixa) : '1.8';
  const espessuraParedeCaixaM = Number(parametros.espessuraParedeCaixaM) || 0.14; // 14cm ou 19cm ou 15cm
  const fechamentoSuperior = parametros.fechamentoSuperior || 'Tampão FF'; // 'Tampão FF' | 'Grelha' | 'Laje Cega'

  // Insumos do Resumo de Drenagem (Base Própria BRP)
  const resumoInsumosState: ResumoInsumoItem[] = parametros.resumoInsumosDrenagem || [
    { id: '1', codigo: '401', descricao: `Tubo PEAD/Concreto Corrugado Ø ${diametroMm}mm para Drenagem`, tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm', precoUnitario: 145.00, regraCalculo: 'tubo' },
    { id: '2', codigo: '102', descricao: 'Escavação mecanizada de valas e cavas de drenagem', tipoInsumo: 'Mão de Obra', fase: 'fabricacao', unidade: 'm³', precoUnitario: 28.00, regraCalculo: 'escavacao' },
    { id: '3', codigo: '108', descricao: 'Berço de brita/areia de assentamento t=10cm a 20cm', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm³', precoUnitario: 95.00, regraCalculo: 'lastro' },
    { id: '4', codigo: '115', descricao: 'Reaterro e compactação mecanizada de vala', tipoInsumo: 'Mão de Obra', fase: 'fabricacao', unidade: 'm³', precoUnitario: 22.00, regraCalculo: 'reaterro' },
    { id: '5', codigo: '1350', descricao: 'Concreto fck ≥ 25 MPa para Poços de Visita (PVs) e caixas', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm³', precoUnitario: 390.00, regraCalculo: 'concreto_cx' },
    { id: '6', codigo: '250', descricao: 'Fôrma de madeira/metálica para caixas de passagem', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm²', precoUnitario: 45.00, regraCalculo: 'forma_cx' },
    { id: '7', codigo: '802', descricao: 'Tampão de ferro fundido articulado D400 para PV', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'un', precoUnitario: 650.00, regraCalculo: 'tampao_pv' }
  ];

  // Modal de Busca no Banco Próprio
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Conversões numéricas das abas
  const comprimentoMetros = parseFloat(comprimentoMetrosRaw.replace(',', '.')) || 0;
  const profundidadeMediaTubulacao = parseFloat(profundidadeMediaTubulacaoRaw.replace(',', '.')) || 0;
  const quantidadeCaixas = parseInt(quantidadeCaixasRaw, 10) || 0;
  const dimensaoCaixaL = parseFloat(dimensaoCaixaLRaw.replace(',', '.')) || 0;
  const dimensaoCaixaB = parseFloat(dimensaoCaixaBRaw.replace(',', '.')) || 0;
  const profundidadeMediaCaixa = parseFloat(profundidadeMediaCaixaRaw.replace(',', '.')) || 0;

  // --------------------------------------------------------------------------
  // CÁLCULOS FÍSICO-GEOMÉTRICOS DA ABA "TUB_quant" (VALAS & TUBULAÇÕES)
  // --------------------------------------------------------------------------
  const diametroM = diametroMm / 1000;
  // Parede do tubo: t = (Ø/10/1000) + 0.005m (Fórmula Célula F41 da Planilha)
  const paredeTuboM = (diametroMm / 10000) + 0.005;
  const diametroExternoM = diametroM + 2 * paredeTuboM;

  // Folga de vala f: 0.20m se Ø < 800mm; 0.25m se Ø = 800mm; 0.35m se Ø > 800mm (Fórmula Célula F46)
  const folgaValaF = diametroMm < 800 ? 0.20 : (diametroMm === 800 ? 0.25 : 0.35);
  // Largura da vala L = Ø + 2f (Fórmula Célula F47)
  const larguraValaL = diametroM + 2 * folgaValaF;

  // Berço de areia/brita: h1 = 0.1 * Ø; h2 = 0.20m (Fórmula Célula F44 & F45)
  const lastroH1 = 0.10 * diametroM;
  const lastroH2 = 0.20;
  const alturaTotalLastro = lastroH1 + lastroH2;

  // Profundidade total de escavação da vala = h_hidr + parede + h2
  const profundidadeTotalEscavacaoVala = profundidadeMediaTubulacao + paredeTuboM + lastroH2;

  // Consumos Unitários por Metro Linear de Vala (m³/m):
  // Escavação m³/m: I50 = L*h + h² / tan(rad(talude))
  const tanTalude = Math.tan((anguloTaludeGraus * Math.PI) / 180);
  const coefEscavacaoValaM3M = (larguraValaL * profundidadeTotalEscavacaoVala) + (Math.pow(profundidadeTotalEscavacaoVala, 2) / (tanTalude > 0 ? tanTalude : 1));
  const escavacaoValaTotalM3 = Math.round(coefEscavacaoValaM3M * comprimentoMetros * 100) / 100;

  // Lastro Brita m³/m: I51 = L * (h1 + h2)
  const coefLastroValaM3M = larguraValaL * alturaTotalLastro;
  const lastroValaTotalM3 = Math.round(coefLastroValaM3M * comprimentoMetros * 100) / 100;

  // Volume do tubo m³/m = π * (Ø_ext/2)² * 1.0
  const coefVolumeTuboM3M = Math.PI * Math.pow(diametroExternoM / 2, 2);

  // Reaterro Compactado m³/m = Escavação - Lastro - Vol Tubo
  const coefReaterroValaM3M = Math.max(0, coefEscavacaoValaM3M - coefLastroValaM3M - coefVolumeTuboM3M);
  const reaterroValaTotalM3 = Math.round(coefReaterroValaM3M * comprimentoMetros * 100) / 100;

  // Escoramento de vala m²/m = 2 * h (se h > 1.5m)
  const coefEscoramentoValaM2M = profundidadeTotalEscavacaoVala > 1.5 ? 2 * profundidadeTotalEscavacaoVala : 0;
  const escoramentoValaTotalM2 = Math.round(coefEscoramentoValaM2M * comprimentoMetros * 100) / 100;

  // --------------------------------------------------------------------------
  // CÁLCULOS FÍSICO-GEOMÉTRICOS DA ABA "POÇO_quant" (POÇOS DE VISITA & CAIXAS)
  // --------------------------------------------------------------------------
  const folgaEscavacaoLateralCaixa = 0.30; // 30cm folga lateral
  const espessuraLajeFundoM = 0.08; // 8cm
  const espessuraLajeTampaM = 0.08; // 8cm

  const LextCaixa = dimensaoCaixaL + 2 * espessuraParedeCaixaM;
  const BextCaixa = dimensaoCaixaB + 2 * espessuraParedeCaixaM;

  // Consumos Unitários por Unidade de Caixa (m³/un):
  // Escavação m³/un: (Lext + 2*folga) * (Bext + 2*folga) * h_media
  const coefEscavacaoCaixaM3Un = (LextCaixa + 2 * folgaEscavacaoLateralCaixa) * (BextCaixa + 2 * folgaEscavacaoLateralCaixa) * profundidadeMediaCaixa;
  const escavacaoCaixasTotalM3 = Math.round(coefEscavacaoCaixaM3Un * quantidadeCaixas * 100) / 100;

  // Lastro Concreto Fundo m³/un: (Lext*Bext)*0.05 + (Lint*Bint)*0.07
  const coefLastroCaixaM3Un = (LextCaixa * BextCaixa * 0.05) + (dimensaoCaixaL * dimensaoCaixaB * 0.07);
  const lastroCaixasTotalM3 = Math.round(coefLastroCaixaM3Un * quantidadeCaixas * 100) / 100;

  // Concreto Estrutural m³/un: Lajes + Paredes
  const volLajeFundoM3Un = LextCaixa * BextCaixa * espessuraLajeFundoM;
  const volLajeTampaM3Un = LextCaixa * BextCaixa * espessuraLajeTampaM;
  const volParedesM3Un = 2 * (LextCaixa + BextCaixa) * espessuraParedeCaixaM * profundidadeMediaCaixa;
  const coefConcretoCaixaM3Un = volLajeFundoM3Un + volLajeTampaM3Un + volParedesM3Un;
  const concretoCaixasTotalM3 = Math.round(coefConcretoCaixaM3Un * quantidadeCaixas * 100) / 100;

  // Fôrma m²/un: 2 * (Lext + Bext) * h + 2 * (Lint + Bint) * h
  const coefFormaCaixaM2Un = (2 * (LextCaixa + BextCaixa) * profundidadeMediaCaixa) + (2 * (dimensaoCaixaL + dimensaoCaixaB) * profundidadeMediaCaixa);
  const formaCaixasTotalM2 = Math.round(coefFormaCaixaM2Un * quantidadeCaixas * 100) / 100;

  // Reaterro Caixas m³/un
  const coefReaterroCaixaM3Un = Math.max(0, coefEscavacaoCaixaM3Un - coefLastroCaixaM3Un - coefConcretoCaixaM3Un);
  const reaterroCaixasTotalM3 = Math.round(coefReaterroCaixaM3Un * quantidadeCaixas * 100) / 100;

  // --------------------------------------------------------------------------
  // TOTALIZAÇÃO CONSOLIDADA DE AMBAS AS ABAS
  // --------------------------------------------------------------------------
  const escavacaoTotalGeralM3 = escavacaoValaTotalM3 + escavacaoCaixasTotalM3;
  const lastroTotalGeralM3 = lastroValaTotalM3 + lastroCaixasTotalM3;
  const reaterroTotalGeralM3 = reaterroValaTotalM3 + reaterroCaixasTotalM3;
  const concretoTotalGeralM3 = concretoCaixasTotalM3;
  const formaTotalGeralM2 = formaCaixasTotalM2;

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

  // Helper para determinar a regra de cálculo matemática de cada insumo de Drenagem
  const calcularCoeficienteDrenagem = (item: ResumoInsumoItem): number => {
    const regra = item.regraCalculo;
    const desc = item.descricao.toLowerCase();
    const cod = item.codigo;

    if (regra === 'tubo' || cod === '401' || desc.includes('tubo')) {
      return comprimentoMetros;
    }
    if (regra === 'escavacao' || cod === '102' || desc.includes('escavação')) {
      return escavacaoTotalGeralM3;
    }
    if (regra === 'lastro' || cod === '108' || desc.includes('berço') || desc.includes('brita') || desc.includes('lastro')) {
      return lastroTotalGeralM3;
    }
    if (regra === 'reaterro' || cod === '115' || desc.includes('reaterro')) {
      return reaterroTotalGeralM3;
    }
    if (regra === 'concreto_cx' || cod === '1350' || desc.includes('concreto')) {
      return concretoTotalGeralM3;
    }
    if (regra === 'forma_cx' || cod === '250' || desc.includes('fôrma') || desc.includes('forma')) {
      return formaTotalGeralM2;
    }
    if (regra === 'tampao_pv' || cod === '802' || desc.includes('tampão') || desc.includes('tampao')) {
      return quantidadeCaixas;
    }

    return item.taxaProdutividade ?? 1.0;
  };

  // Consolidação Financeira
  const calcularResumoConsolidado = (): ResumoInsumoItem[] => {
    return resumoInsumosState.map((item) => {
      const coefUnitario = calcularCoeficienteDrenagem(item);
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
  const custoTotalDrenagemR$ = resumoCalculadoList.reduce((acc, i) => acc + (i.custoTotalR$ || 0), 0);

  // Agrupamento de Gastos para o Gráfico
  const gastosCategorias = useMemo(() => {
    let tubulacao = 0;
    let escavacao = 0;
    let caixasConcreto = 0;
    let maoObraOutros = 0;

    resumoCalculadoList.forEach(item => {
      const desc = item.descricao.toLowerCase();
      const val = item.custoTotalR$ || 0;

      if (desc.includes('tubo') || desc.includes('pead')) {
        tubulacao += val;
      } else if (desc.includes('escavação') || desc.includes('reaterro') || desc.includes('berço')) {
        escavacao += val;
      } else if (desc.includes('concreto') || desc.includes('fôrma') || desc.includes('tampão')) {
        caixasConcreto += val;
      } else {
        maoObraOutros += val;
      }
    });

    const total = custoTotalDrenagemR$ > 0 ? custoTotalDrenagemR$ : 1;

    return {
      tubulacao: Math.round(tubulacao * 100) / 100,
      escavacao: Math.round(escavacao * 100) / 100,
      caixasConcreto: Math.round(caixasConcreto * 100) / 100,
      maoObraOutros: Math.round(maoObraOutros * 100) / 100,

      percTubulacao: Math.round((tubulacao / total) * 100),
      percEscavacao: Math.round((escavacao / total) * 100),
      percCaixasConcreto: Math.round((caixasConcreto / total) * 100),
      percMaoObraOutros: Math.round((maoObraOutros / total) * 100)
    };
  }, [resumoCalculadoList, custoTotalDrenagemR$]);

  useEffect(() => {
    onUpdateResultados({
      escavacaoM3: escavacaoTotalGeralM3,
      lastroM3: lastroTotalGeralM3,
      volumeConcretoM3: concretoTotalGeralM3,
      areaFormaM2: formaTotalGeralM2,
      comprimentoLinearM: comprimentoMetros,
      quantidadeUnidades: quantidadeCaixas,
      reaterroM3: reaterroTotalGeralM3,
      custoTotalEstimadoR$: Math.round(custoTotalDrenagemR$ * 100) / 100,

      detalhes: {
        'Tubulação Corrugada': `Ø ${diametroMm}mm (${comprimentoMetros} m)`,
        'Poços de Visita (PVs)': `${quantidadeCaixas} un (${tipoCaixa} - ${fechamentoSuperior})`,
        'Escavação Total Valas/Caixas': `${escavacaoTotalGeralM3.toFixed(2)} m³ (Valas: ${escavacaoValaTotalM3.toFixed(2)} m³ | Caixas: ${escavacaoCaixasTotalM3.toFixed(2)} m³)`,
        'Berço de Brita/Areia Total': `${lastroTotalGeralM3.toFixed(2)} m³ (Valas: ${lastroValaTotalM3.toFixed(2)} m³ | Caixas: ${lastroCaixasTotalM3.toFixed(2)} m³)`,
        'Reaterro Compactado Total': `${reaterroTotalGeralM3.toFixed(2)} m³`,
        'Escoramento de Vala': `${escoramentoValaTotalM2.toFixed(2)} m²`,
        'Concreto Estrutural PVs': `${concretoTotalGeralM3.toFixed(2)} m³ (Fôrma: ${formaTotalGeralM2.toFixed(2)} m²)`,
        'Custo Total Estimado': `R$ ${custoTotalDrenagemR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      }
    });
  }, [diametroMm, comprimentoMetros, quantidadeCaixas, tipoCaixa, fechamentoSuperior, escavacaoTotalGeralM3, escavacaoValaTotalM3, escavacaoCaixasTotalM3, lastroTotalGeralM3, lastroValaTotalM3, lastroCaixasTotalM3, reaterroTotalGeralM3, escoramentoValaTotalM2, concretoTotalGeralM3, formaTotalGeralM2, custoTotalDrenagemR$]);

  const updateParam = (key: string, val: any) => {
    onChangeParametros({ ...parametros, [key]: val });
  };

  const handleUpdateResumoItem = (id: string, field: keyof ResumoInsumoItem, val: any) => {
    const updated = resumoInsumosState.map(i => i.id === id ? { ...i, [field]: val } : i);
    updateParam('resumoInsumosDrenagem', updated);
  };

  const handleDeleteResumoItem = (id: string) => {
    const updated = resumoInsumosState.filter(i => i.id !== id);
    updateParam('resumoInsumosDrenagem', updated);
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
      unidade: item.unidade || 'm',
      precoUnitario: preco,
      regraCalculo: 'fixo'
    };

    updateParam('resumoInsumosDrenagem', [...resumoInsumosState, newItem]);
    setIsSearchModalOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="space-y-6">
      {/* HEADER PRINCIPAL DE DRENAGEM */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wider">
              Drenagem & Infraestrutura
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Calculadora & Orçamento de Drenagem e Redes Enterradas
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dimensionamento e orçamento integrados de redes pluviais, valas e poços de visita
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-right">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Metragem da Rede</span>
            <span className="text-base font-mono font-extrabold text-slate-900">
              {comprimentoMetros} <span className="text-xs font-normal text-slate-500">m</span> ({quantidadeCaixas} <span className="text-xs font-normal text-slate-500">PVs</span>)
            </span>
          </div>

          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xs text-right min-w-[170px]">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Custo Total Drenagem</span>
            <span className="text-lg font-mono font-black text-emerald-400">
              R$ {custoTotalDrenagemR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
          onClick={() => setActiveSubTab('tubulacao')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'tubulacao'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>📏 Valas & Tubulações</span>
        </button>

        <button
          onClick={() => setActiveSubTab('caixas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'caixas'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>🧱 Poços de Visita & Caixas</span>
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
                  Distribuição dos Custos de Drenagem
                </h3>
                <p className="text-xs text-slate-500">Divisão percentual entre Tubulação PEAD, Movimentação de Terra e Poços de Visita</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-900 inline-block" /> Tubulação ({gastosCategorias.percTubulacao}%)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-600 inline-block" /> Escavação/Reaterro ({gastosCategorias.percEscavacao}%)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" /> Caixas/PVs ({gastosCategorias.percCaixasConcreto}%)</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-5 w-full bg-slate-100 rounded-xl overflow-hidden flex shadow-inner">
                <div style={{ width: `${gastosCategorias.percTubulacao}%` }} className="bg-slate-900 h-full transition-all duration-500" />
                <div style={{ width: `${gastosCategorias.percEscavacao}%` }} className="bg-slate-600 h-full transition-all duration-500" />
                <div style={{ width: `${gastosCategorias.percCaixasConcreto}%` }} className="bg-emerald-600 h-full transition-all duration-500" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">1. Tubulação PEAD / Concreto</span>
                  <span className="text-sm font-mono font-extrabold text-slate-900 block">
                    {gastosCategorias.tubulacao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">{gastosCategorias.percTubulacao}% do total</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">2. Movimentação de Terra & Berço</span>
                  <span className="text-sm font-mono font-extrabold text-slate-900 block">
                    {gastosCategorias.escavacao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">{gastosCategorias.percEscavacao}% do total</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">3. Caixas de Passagem & PVs</span>
                  <span className="text-sm font-mono font-extrabold text-slate-900 block">
                    {gastosCategorias.caixasConcreto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">{gastosCategorias.percCaixasConcreto}% do total</span>
                </div>
              </div>
            </div>
          </div>

          {/* Resumo Físico Consolidado */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Escavação Total (Valas+PVs)</span>
              <span className="text-lg font-mono font-black text-slate-900 block">{escavacaoTotalGeralM3.toFixed(2)} m³</span>
              <span className="text-[10px] text-slate-500 font-medium">Valas: {escavacaoValaTotalM3}m³ | PVs: {escavacaoCaixasTotalM3}m³</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Berço de Brita/Areia</span>
              <span className="text-lg font-mono font-black text-slate-900 block">{lastroTotalGeralM3.toFixed(2)} m³</span>
              <span className="text-[10px] text-slate-500 font-medium">Camada {alturaTotalLastro.toFixed(2)}m sob tubo</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Reaterro Compactado</span>
              <span className="text-lg font-mono font-black text-slate-900 block">{reaterroTotalGeralM3.toFixed(2)} m³</span>
              <span className="text-[10px] text-slate-500 font-medium">Escavação - Lastro - Tubo</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Concreto Estrutural PVs</span>
              <span className="text-lg font-mono font-black text-slate-900 block">{concretoTotalGeralM3.toFixed(2)} m³</span>
              <span className="text-[10px] text-slate-500 font-medium">Fôrmas: {formaTotalGeralM2.toFixed(2)} m²</span>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA 2: VALAS E TUBULAÇÕES */}
      {activeSubTab === 'tubulacao' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Ruler className="w-4 h-4 text-slate-700" />
                Parâmetros de Valas e Tubulações
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Diâmetro Nominal (mm)</label>
                <select
                  value={diametroMm}
                  onChange={(e) => updateParam('diametroMm', Number(e.target.value))}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-800 outline-none focus:border-slate-700 shadow-2xs cursor-pointer"
                >
                  <option value={300}>Ø 300 mm (12")</option>
                  <option value={350}>Ø 350 mm (14")</option>
                  <option value={400}>Ø 400 mm (16")</option>
                  <option value={500}>Ø 500 mm (20")</option>
                  <option value={600}>Ø 600 mm (24")</option>
                  <option value={700}>Ø 700 mm (28")</option>
                  <option value={800}>Ø 800 mm (32")</option>
                  <option value={900}>Ø 900 mm (36")</option>
                  <option value={1000}>Ø 1000 mm (40")</option>
                  <option value={1500}>Ø 1500 mm (60")</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Comprimento da Rede (m)</label>
                <input
                  type="number"
                  step="1"
                  placeholder="Ex: 50"
                  value={comprimentoMetrosRaw}
                  onChange={(e) => updateParam('comprimentoMetros', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Profundidade Média Vala (m)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 1.5"
                  value={profundidadeMediaTubulacaoRaw}
                  onChange={(e) => updateParam('profundidadeMediaTubulacao', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ângulo do Talude (°)</label>
                <input
                  type="number"
                  placeholder="45"
                  value={anguloTaludeGraus}
                  onChange={(e) => updateParam('anguloTaludeGraus', Number(e.target.value))}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* MEMÓRIA DE CÁLCULO PASSO A PASSO DA VALA */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 shadow-lg border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-400" />
                Memória de Cálculo Geométrico da Vala
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block border-b border-slate-700 pb-1">Geometria da Vala</span>
                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  <div className="flex justify-between"><span>Parede Tubo (t):</span><span className="font-bold text-white">{(paredeTuboM * 100).toFixed(1)} cm</span></div>
                  <div className="flex justify-between"><span>Folga Vala (f):</span><span className="font-bold text-white">{(folgaValaF * 100).toFixed(0)} cm</span></div>
                  <div className="flex justify-between"><span>Largura Vala (L):</span><span className="font-bold text-blue-300">{larguraValaL.toFixed(2)} m</span></div>
                  <div className="flex justify-between"><span>Prof. Total (h):</span><span className="font-bold text-blue-300">{profundidadeTotalEscavacaoVala.toFixed(2)} m</span></div>
                </div>
              </div>

              <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block border-b border-slate-700 pb-1">Taxas por Metro (m³/m)</span>
                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  <div className="flex justify-between"><span>Escavação Vala:</span><span className="font-bold text-emerald-400">{coefEscavacaoValaM3M.toFixed(3)} m³/m</span></div>
                  <div className="flex justify-between"><span>Lastro Brita (h=20cm):</span><span className="font-bold text-emerald-400">{coefLastroValaM3M.toFixed(3)} m³/m</span></div>
                  <div className="flex justify-between"><span>Reaterro Compactado:</span><span className="font-bold text-emerald-400">{coefReaterroValaM3M.toFixed(3)} m³/m</span></div>
                  <div className="flex justify-between"><span>Escoramento Vala:</span><span className="font-bold text-blue-300">{coefEscoramentoValaM2M.toFixed(2)} m²/m</span></div>
                </div>
              </div>

              <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block border-b border-slate-700 pb-1">Totais na Obra ({comprimentoMetros}m)</span>
                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  <div className="flex justify-between"><span>Escavação Total:</span><span className="font-bold text-white">{escavacaoValaTotalM3.toFixed(2)} m³</span></div>
                  <div className="flex justify-between"><span>Lastro Brita Total:</span><span className="font-bold text-white">{lastroValaTotalM3.toFixed(2)} m³</span></div>
                  <div className="flex justify-between"><span>Reaterro Total:</span><span className="font-bold text-white">{reaterroValaTotalM3.toFixed(2)} m³</span></div>
                  <div className="flex justify-between"><span>Escoramento Total:</span><span className="font-bold text-white">{escoramentoValaTotalM2.toFixed(2)} m²</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA 3: POÇOS DE VISITA & CAIXAS */}
      {activeSubTab === 'caixas' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-700" />
                Parâmetros de Poços de Visita & Caixas
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Caixa / Poço</label>
                <select
                  value={tipoCaixa}
                  onChange={(e) => updateParam('tipoCaixa', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-800 outline-none focus:border-slate-700 shadow-2xs cursor-pointer"
                >
                  <option value="PVAP">PVAP - Poço de Visita Águas Pluviais (Tampão FF D400)</option>
                  <option value="PVET">PVET - Poço de Visita Esgoto/Entulhos</option>
                  <option value="CX_BLOCO">Caixa de Passagem em Bloco de Concreto (14cm / 19cm)</option>
                  <option value="CX_CONCRETO">Caixa de Passagem Moldada in Loco (Concreto)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Quantidade de Caixas/PVs</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Ex: 4"
                  value={quantidadeCaixasRaw}
                  onChange={(e) => updateParam('quantidadeCaixas', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Comprimento Interno Lint (m)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 1.6"
                  value={dimensaoCaixaLRaw}
                  onChange={(e) => updateParam('dimensaoCaixaL', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Largura Interna Bint (m)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 1.6"
                  value={dimensaoCaixaBRaw}
                  onChange={(e) => updateParam('dimensaoCaixaB', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Profundidade Média Caixa (m)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 1.8"
                  value={profundidadeMediaCaixaRaw}
                  onChange={(e) => updateParam('profundidadeMediaCaixa', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Espessura Parede (cm)</label>
                <select
                  value={espessuraParedeCaixaM}
                  onChange={(e) => updateParam('espessuraParedeCaixaM', Number(e.target.value))}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold text-slate-800 outline-none focus:border-slate-700 shadow-2xs cursor-pointer"
                >
                  <option value={0.14}>Bloco de Concreto 14 cm</option>
                  <option value={0.19}>Bloco de Concreto 19 cm</option>
                  <option value={0.15}>Concreto Estrutural 15 cm</option>
                  <option value={0.20}>Concreto Estrutural 20 cm</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fechamento Superior</label>
                <select
                  value={fechamentoSuperior}
                  onChange={(e) => updateParam('fechamentoSuperior', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold text-slate-800 outline-none focus:border-slate-700 shadow-2xs cursor-pointer"
                >
                  <option value="Tampão FF">Tampão de Ferro Fundido Articulado D400</option>
                  <option value="Grelha">Grelha Metálica / Concreto</option>
                  <option value="Laje Cega">Laje de Concreto Cega</option>
                </select>
              </div>
            </div>
          </div>

          {/* MEMÓRIA DE CÁLCULO PASSO A PASSO DE POÇOS DE VISITA */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 shadow-lg border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-400" />
                Memória de Cálculo Físico de Poços de Visita
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block border-b border-slate-700 pb-1">Geometria Externa PV</span>
                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  <div className="flex justify-between"><span>Comprimento Ext (Lext):</span><span className="font-bold text-white">{LextCaixa.toFixed(2)} m</span></div>
                  <div className="flex justify-between"><span>Largura Ext (Bext):</span><span className="font-bold text-white">{BextCaixa.toFixed(2)} m</span></div>
                  <div className="flex justify-between"><span>Folga Escavação:</span><span className="font-bold text-blue-300">30 cm</span></div>
                  <div className="flex justify-between"><span>Espessura Paredes:</span><span className="font-bold text-blue-300">{(espessuraParedeCaixaM * 100).toFixed(0)} cm</span></div>
                </div>
              </div>

              <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block border-b border-slate-700 pb-1">Taxas por Unidade (m³/un)</span>
                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  <div className="flex justify-between"><span>Escavação Vala/PV:</span><span className="font-bold text-emerald-400">{coefEscavacaoCaixaM3Un.toFixed(3)} m³/un</span></div>
                  <div className="flex justify-between"><span>Lastro Concreto Fundo:</span><span className="font-bold text-emerald-400">{coefLastroCaixaM3Un.toFixed(3)} m³/un</span></div>
                  <div className="flex justify-between"><span>Concreto Estrutural:</span><span className="font-bold text-emerald-400">{coefConcretoCaixaM3Un.toFixed(3)} m³/un</span></div>
                  <div className="flex justify-between"><span>Fôrmas Laje/Parede:</span><span className="font-bold text-blue-300">{coefFormaCaixaM2Un.toFixed(2)} m²/un</span></div>
                </div>
              </div>

              <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block border-b border-slate-700 pb-1">Totais na Obra ({quantidadeCaixas} un)</span>
                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  <div className="flex justify-between"><span>Escavação Caixas:</span><span className="font-bold text-white">{escavacaoCaixasTotalM3.toFixed(2)} m³</span></div>
                  <div className="flex justify-between"><span>Lastro Concreto Total:</span><span className="font-bold text-white">{lastroCaixasTotalM3.toFixed(2)} m³</span></div>
                  <div className="flex justify-between"><span>Concreto PVs Total:</span><span className="font-bold text-white">{concretoCaixasTotalM3.toFixed(2)} m³</span></div>
                  <div className="flex justify-between"><span>Fôrmas PVs Total:</span><span className="font-bold text-white">{formaCaixasTotalM2.toFixed(2)} m²</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA 4: TABELA DE INSUMOS */}
      {(activeSubTab === 'composicao' || activeSubTab === 'resumo') && (
        <div className="lg:col-span-12 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs space-y-0">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-700" />
                Lista Quantitativa de Compras e Serviços de Drenagem
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
                  <th className="py-2.5 px-3">Descrição do Item de Drenagem</th>
                  <th className="py-2.5 px-3 w-44">Regra Paramétrica</th>
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
                        <option value="tubo">📏 Tubulação (Comprimento)</option>
                        <option value="escavacao">🚜 Escavação Total (m³)</option>
                        <option value="lastro">🪨 Berço Brita/Areia (m³)</option>
                        <option value="reaterro">🌱 Reaterro Compactado (m³)</option>
                        <option value="concreto_cx">🏗️ Concreto PVs/Caixas (m³)</option>
                        <option value="forma_cx">📐 Fôrmas de Caixas (m²)</option>
                        <option value="tampao_pv">⭕ Tampão D400 FF (un)</option>
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
                Consolidação do Orçamento de Drenagem
              </span>
            </div>

            <div className="flex items-center gap-6 text-right">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Custo Total Global</span>
                <span className="text-lg font-mono font-black text-emerald-400">
                  R$ {custoTotalDrenagemR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                <p className="text-xs text-slate-400">Pesquise insumos ou composições para a Rede de Drenagem</p>
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
