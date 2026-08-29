import React, { useEffect, useState, useCallback, useMemo } from 'react';
import type { CalculoResultado, ResumoInsumoItem, TipoInsumoCategoria } from '../../../types/calculos';
import { 
  Package, CheckCircle2, Trash2, Search, X, 
  Ruler, PieChart as PieChartIcon, Building2, Calculator, Layers
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TabelaVigasBaldrames, type VigaBaldrameItem, type VigasBaldramesHeaderGlobal, calcularVigaBaldrameLinha } from '../TabelaVigasBaldrames';

interface Props {
  parametros: Record<string, any>;
  onChangeParametros: (newParams: Record<string, any>) => void;
  onUpdateResultados: (resultados: CalculoResultado) => void;
}

export const FundacoesForm: React.FC<Props> = ({
  parametros,
  onChangeParametros,
  onUpdateResultados
}) => {
  // Navegação de Sub-Abas de Fundações
  const [activeSubTab, setActiveSubTab] = useState<'resumo' | 'superficiais' | 'profundas' | 'memoria' | 'composicao'>('resumo');

  // Modo de Fundação
  const categoriaFundacao = parametros.categoriaFundacao || 'superficial'; // 'superficial' | 'profunda'

  // --- FUNDAÇÕES SUPERFICIAIS (SAPATAS, BLOCOS, BALDRAMES) ---
  const tipoSuperficial = parametros.tipoSuperficial || 'sapata_tronco'; // 'sapata_tronco' | 'sapata_reta' | 'bloco_coroamento' | 'viga_baldrame'
  const qtdSuperficialRaw = parametros.qtdSuperficial !== undefined ? String(parametros.qtdSuperficial) : '8';
  const larguraSuperficialRaw = parametros.larguraSuperficial !== undefined ? String(parametros.larguraSuperficial) : '1.80'; // B (m)
  const comprimentoSuperficialRaw = parametros.comprimentoSuperficial !== undefined ? String(parametros.comprimentoSuperficial) : '1.80'; // L (m)
  const alturaRodapeH1Raw = parametros.alturaRodapeH1 !== undefined ? String(parametros.alturaRodapeH1) : '0.30'; // h1 (m)
  const alturaPiramideH2Raw = parametros.alturaPiramideH2 !== undefined ? String(parametros.alturaPiramideH2) : '0.40'; // h2 (m)
  const pilarBesteRaw = parametros.pilarBeste !== undefined ? String(parametros.pilarBeste) : '0.40'; // b pilar (m)
  const pilarLesteRaw = parametros.pilarLeste !== undefined ? String(parametros.pilarLeste) : '0.40'; // l pilar (m)
  const profundidadeCavaRaw = parametros.profundidadeCava !== undefined ? String(parametros.profundidadeCava) : '1.50'; // H escavação (m)
  const taxaAcoSuperficialRaw = parametros.taxaAcoSuperficial !== undefined ? String(parametros.taxaAcoSuperficial) : '75'; // kg/m³

  // --- FUNDAÇÕES PROFUNDAS (ESTACAS HÉLICE, ESCAVADAS, TUBULÕES) ---
  const tipoProfunda = parametros.tipoProfunda || 'estaca_helice'; // 'estaca_helice' | 'estaca_escavada' | 'estaca_premoldada' | 'tubulao'
  const diametroEstacaMm = Number(parametros.diametroEstacaMm) || 400; // mm (300 a 1000)
  const qtdEstacasRaw = parametros.qtdEstacas !== undefined ? String(parametros.qtdEstacas) : '24';
  const profundidadeEstacaMRaw = parametros.profundidadeEstacaM !== undefined ? String(parametros.profundidadeEstacaM) : '12.0';
  const taxaAcoProfundaKgMRaw = parametros.taxaAcoProfundaKgM !== undefined ? String(parametros.taxaAcoProfundaKgM) : '18.5'; // kg/m estaca
  const sobreconsumoConcretoPercRaw = parametros.sobreconsumoConcretoPerc !== undefined ? String(parametros.sobreconsumoConcretoPerc) : '10'; // 10%

  // Insumos do Resumo de Fundações
  const resumoInsumosState: ResumoInsumoItem[] = parametros.resumoInsumosFundacoes || [
    { id: '1', codigo: '1350', descricao: 'Concreto fck ≥ 30 MPa usinado para fundações', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm³', precoUnitario: 380.00, regraCalculo: 'concreto_fundacao' },
    { id: '2', codigo: '250', descricao: 'Fôrma de madeira/compensada resinada para blocos e sapatas', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm²', precoUnitario: 48.00, regraCalculo: 'forma_fundacao' },
    { id: '3', codigo: '720', descricao: 'Aço CA-50/60 cortado e dobrado para estruturas de fundação', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'kg', precoUnitario: 6.80, regraCalculo: 'aco_fundacao' },
    { id: '4', codigo: '102', descricao: 'Escavação mecanizada de cavas/valas para fundação', tipoInsumo: 'Mão de Obra', fase: 'fabricacao', unidade: 'm³', precoUnitario: 26.00, regraCalculo: 'escavacao_solo' },
    { id: '5', codigo: '108', descricao: 'Lastro de brita/concreto magro e=5cm sob fundação', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm³', precoUnitario: 95.00, regraCalculo: 'lastro_brita' },
    { id: '6', codigo: '408', descricao: `Execução de Estaca Hélice Contínua Ø ${diametroEstacaMm}mm`, tipoInsumo: 'Mão de Obra', fase: 'fabricacao', unidade: 'm', precoUnitario: 65.00, regraCalculo: 'estaca_metro' }
  ];

  // Modal de Busca no Banco Próprio BRP
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Conversões numéricas
  const qtdSuperficial = parseInt(qtdSuperficialRaw, 10) || 0;
  const larguraSuperficial = parseFloat(larguraSuperficialRaw.replace(',', '.')) || 0;
  const comprimentoSuperficial = parseFloat(comprimentoSuperficialRaw.replace(',', '.')) || 0;
  const alturaRodapeH1 = parseFloat(alturaRodapeH1Raw.replace(',', '.')) || 0;
  const alturaPiramideH2 = parseFloat(alturaPiramideH2Raw.replace(',', '.')) || 0;
  const pilarBeste = parseFloat(pilarBesteRaw.replace(',', '.')) || 0;
  const pilarLeste = parseFloat(pilarLesteRaw.replace(',', '.')) || 0;
  const profundidadeCava = parseFloat(profundidadeCavaRaw.replace(',', '.')) || 0;
  const taxaAcoSuperficial = parseFloat(taxaAcoSuperficialRaw.replace(',', '.')) || 0;

  const qtdEstacas = parseInt(qtdEstacasRaw, 10) || 0;
  const profundidadeEstacaM = parseFloat(profundidadeEstacaMRaw.replace(',', '.')) || 0;
  const taxaAcoProfundaKgM = parseFloat(taxaAcoProfundaKgMRaw.replace(',', '.')) || 0;
  const sobreconsumoConcretoPerc = parseFloat(sobreconsumoConcretoPercRaw.replace(',', '.')) || 10;

  // --- VIGAS BALDRAMES (TABELA MULTI-ITEM MODELO BRP INFRAESTRUTURA) ---
  const headerVigasBaldrames: VigasBaldramesHeaderGlobal = parametros.headerVigasBaldrames || {
    taxaArmacaoKgM3: 90,
    empolamentoBotaForaPerc: 30,
    taxaArmacaoIndicadaPor: 'Engenharia / Projeto Estrutural',
    folgaValaM: 0.50,
    lastroEspessuraM: 0.05
  };

  const vigasBaldramesList: VigaBaldrameItem[] = parametros.vigasBaldramesList || [
    {
      id: 'vb-1',
      nome: 'VB-01',
      localizacao: 'Eixo Principal',
      cotaSolo: 0.00,
      cotaTopo: -0.30,
      talude: 1,
      quantidade: 1,
      largura: 0.20,
      altura: 0.40,
      comprimento: 15.00
    }
  ];

  const resultadosVigas = vigasBaldramesList.map(v => calcularVigaBaldrameLinha(v, headerVigasBaldrames));
  const volConcretoVigasM3 = resultadosVigas.reduce((acc, r) => acc + r.concretoM3, 0);
  const areaFormaVigasM2 = resultadosVigas.reduce((acc, r) => acc + r.formaM2, 0);
  const volEscavacaoVigasM3 = resultadosVigas.reduce((acc, r) => acc + r.escavacaoM3, 0);
  const volLastroVigasM3 = resultadosVigas.reduce((acc, r) => acc + r.lastroM3, 0);
  const pesoAcoVigasKg = resultadosVigas.reduce((acc, r) => acc + r.armacaoKg, 0);

  // --------------------------------------------------------------------------
  // CÁLCULOS FÍSICO-GEOMÉTRICOS DA ABA "Sapatas" & "Bloco" (MODELO INFRAESTRUTURA_R0)
  // --------------------------------------------------------------------------
  const alturaTotalSapata = alturaRodapeH1 + alturaPiramideH2;
  const areaBaseSapata = larguraSuperficial * comprimentoSuperficial;
  const areaTopoPilar = pilarBeste * pilarLeste;

  // Volume Sapata Tronco-Piramidal: V = B*L*h1 + (h2/3)*(A1 + A2 + sqrt(A1*A2))
  const volBaseRodapeM3 = areaBaseSapata * alturaRodapeH1;
  const volPiramideM3 = (alturaPiramideH2 / 3) * (areaBaseSapata + areaTopoPilar + Math.sqrt(areaBaseSapata * areaTopoPilar));
  const volSapataUnitarioM3 = tipoSuperficial === 'sapata_tronco' ? (volBaseRodapeM3 + volPiramideM3) : (areaBaseSapata * alturaTotalSapata);

  const volConcretoSuperficialTotalM3 = tipoSuperficial === 'viga_baldrame' 
    ? volConcretoVigasM3 
    : Math.round(volSapataUnitarioM3 * qtdSuperficial * 100) / 100;

  // Fôrmas Laterais das Sapatas/Blocos = 2*(B + L)*h1 * Qtd
  const areaFormaSapataUnitariaM2 = 2 * (larguraSuperficial + comprimentoSuperficial) * alturaRodapeH1;
  const areaFormaSuperficialTotalM2 = tipoSuperficial === 'viga_baldrame'
    ? areaFormaVigasM2
    : Math.round(areaFormaSapataUnitariaM2 * qtdSuperficial * 100) / 100;

  // Lastro de Brita/Concreto Magro e=5cm: (B+0.10)*(L+0.10)*0.05 * Qtd
  const volLastroSapataUnitarioM3 = (larguraSuperficial + 0.10) * (comprimentoSuperficial + 0.10) * 0.05;
  const volLastroSuperficialTotalM3 = tipoSuperficial === 'viga_baldrame'
    ? volLastroVigasM3
    : Math.round(volLastroSapataUnitarioM3 * qtdSuperficial * 100) / 100;

  // Escavação da Cava com Folga de 30cm: (B+0.60)*(L+0.60)*H_cava * Qtd
  const volEscavacaoSapataUnitariaM3 = (larguraSuperficial + 0.60) * (comprimentoSuperficial + 0.60) * profundidadeCava;
  const volEscavacaoSuperficialTotalM3 = tipoSuperficial === 'viga_baldrame'
    ? volEscavacaoVigasM3
    : Math.round(volEscavacaoSapataUnitariaM3 * qtdSuperficial * 100) / 100;

  // Aço CA-50 Superficial (kg)
  const pesoAcoSuperficialTotalKg = tipoSuperficial === 'viga_baldrame'
    ? pesoAcoVigasKg
    : Math.round(volConcretoSuperficialTotalM3 * taxaAcoSuperficial * 100) / 100;

  // --------------------------------------------------------------------------
  // CÁLCULOS FÍSICO-GEOMÉTRICOS DAS ESTACAS (HELISE / ESCAVADA)
  // --------------------------------------------------------------------------
  const raioEstacaM = (diametroEstacaMm / 2) / 1000;
  const metragemTotalEstacasM = profundidadeEstacaM * qtdEstacas;
  const volEstacaUnitarioM3 = Math.PI * Math.pow(raioEstacaM, 2) * profundidadeEstacaM;
  const volConcretoProfundaTotalM3 = Math.round(volEstacaUnitarioM3 * qtdEstacas * (1 + sobreconsumoConcretoPerc / 100) * 100) / 100;
  const pesoAcoProfundaTotalKg = Math.round(metragemTotalEstacasM * taxaAcoProfundaKgM * 100) / 100;
  const volEscavacaoProfundaTotalM3 = Math.round(volEstacaUnitarioM3 * qtdEstacas * 100) / 100;

  // --------------------------------------------------------------------------
  // CONSOLIDAÇÃO DOS QUANTITATIVOS DE INFRAESTRUTURA
  // --------------------------------------------------------------------------
  const volumeConcretoTotalM3 = categoriaFundacao === 'superficial' ? volConcretoSuperficialTotalM3 : volConcretoProfundaTotalM3;
  const areaFormaTotalM2 = categoriaFundacao === 'superficial' ? areaFormaSuperficialTotalM2 : 0;
  const escavacaoTotalM3 = categoriaFundacao === 'superficial' ? volEscavacaoSuperficialTotalM3 : volEscavacaoProfundaTotalM3;
  const lastroTotalM3 = categoriaFundacao === 'superficial' ? volLastroSuperficialTotalM3 : 0;
  const reaterroTotalM3 = Math.max(0, Math.round((escavacaoTotalM3 - volumeConcretoTotalM3 - lastroTotalM3) * 100) / 100);
  const pesoAcoTotalKg = categoriaFundacao === 'superficial' ? pesoAcoSuperficialTotalKg : pesoAcoProfundaTotalKg;

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

  // Helper para determinar a regra de cálculo matemática de cada insumo de Fundações
  const calcularCoeficienteFundacoes = (item: ResumoInsumoItem): number => {
    const regra = item.regraCalculo;
    const desc = item.descricao.toLowerCase();

    if (regra === 'concreto_fundacao' || desc.includes('concreto')) {
      return volumeConcretoTotalM3;
    }
    if (regra === 'forma_fundacao' || desc.includes('fôrma') || desc.includes('forma')) {
      return areaFormaTotalM2;
    }
    if (regra === 'aco_fundacao' || desc.includes('aço') || desc.includes('aco')) {
      return pesoAcoTotalKg;
    }
    if (regra === 'escavacao_solo' || desc.includes('escavação')) {
      return escavacaoTotalM3;
    }
    if (regra === 'lastro_brita' || desc.includes('lastro') || desc.includes('brita')) {
      return lastroTotalM3;
    }
    if (regra === 'estaca_metro' || desc.includes('estaca')) {
      return metragemTotalEstacasM;
    }

    return item.taxaProdutividade ?? 1.0;
  };

  // Consolidação Financeira
  const calcularResumoConsolidado = (): ResumoInsumoItem[] => {
    return resumoInsumosState.map((item) => {
      const coefUnitario = calcularCoeficienteFundacoes(item);
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
  const custoTotalFundacoesR$ = resumoCalculadoList.reduce((acc, i) => acc + (i.custoTotalR$ || 0), 0);

  // Agrupamento de Gastos para o Gráfico
  const gastosCategorias = useMemo(() => {
    let concreto = 0;
    let forma = 0;
    let aco = 0;
    let terraplenagemEstacas = 0;

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
        terraplenagemEstacas += val;
      }
    });

    const total = custoTotalFundacoesR$ > 0 ? custoTotalFundacoesR$ : 1;

    return {
      concreto: Math.round(concreto * 100) / 100,
      forma: Math.round(forma * 100) / 100,
      aco: Math.round(aco * 100) / 100,
      terraplenagemEstacas: Math.round(terraplenagemEstacas * 100) / 100,

      percConcreto: Math.round((concreto / total) * 100),
      percForma: Math.round((forma / total) * 100),
      percAco: Math.round((aco / total) * 100),
      percTerraplenagemEstacas: Math.round((terraplenagemEstacas / total) * 100)
    };
  }, [resumoCalculadoList, custoTotalFundacoesR$]);

  useEffect(() => {
    onUpdateResultados({
      volumeConcretoM3: volumeConcretoTotalM3,
      areaFormaM2: areaFormaTotalM2,
      escavacaoM3: escavacaoTotalM3,
      lastroM3: lastroTotalM3,
      reaterroM3: reaterroTotalM3,
      pesoAcoKg: pesoAcoTotalKg,
      comprimentoLinearM: categoriaFundacao === 'profunda' ? metragemTotalEstacasM : 0,
      custoTotalEstimadoR$: Math.round(custoTotalFundacoesR$ * 100) / 100,

      detalhes: {
        'Tipo de Fundação': categoriaFundacao === 'superficial' ? `Fundações Superficiais (${tipoSuperficial})` : `Fundações Profundas (${tipoProfunda} Ø${diametroEstacaMm}mm)`,
        'Volume Concreto Total': `${volumeConcretoTotalM3.toFixed(2)} m³`,
        'Fôrmas Totais': `${areaFormaTotalM2.toFixed(2)} m²`,
        'Aço CA-50 Total': `${pesoAcoTotalKg.toFixed(2)} kg`,
        'Escavação de Cava Total': `${escavacaoTotalM3.toFixed(2)} m³`,
        'Lastro de Brita Total': `${lastroTotalM3.toFixed(2)} m³`,
        'Reaterro Compactado': `${reaterroTotalM3.toFixed(2)} m³`,
        'Metragem de Estacas': categoriaFundacao === 'profunda' ? `${metragemTotalEstacasM.toFixed(2)} m (${qtdEstacas} un × ${profundidadeEstacaM}m)` : 'N/A',
        'Custo Total Estimado': `R$ ${custoTotalFundacoesR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      }
    });
  }, [categoriaFundacao, tipoSuperficial, tipoProfunda, diametroEstacaMm, volumeConcretoTotalM3, areaFormaTotalM2, escavacaoTotalM3, lastroTotalM3, reaterroTotalM3, pesoAcoTotalKg, metragemTotalEstacasM, qtdEstacas, profundidadeEstacaM, custoTotalFundacoesR$]);

  const updateParam = (key: string, val: any) => {
    onChangeParametros({ ...parametros, [key]: val });
  };

  const handleUpdateResumoItem = (id: string, field: keyof ResumoInsumoItem, val: any) => {
    const updated = resumoInsumosState.map(i => i.id === id ? { ...i, [field]: val } : i);
    updateParam('resumoInsumosFundacoes', updated);
  };

  const handleDeleteResumoItem = (id: string) => {
    const updated = resumoInsumosState.filter(i => i.id !== id);
    updateParam('resumoInsumosFundacoes', updated);
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

    updateParam('resumoInsumosFundacoes', [...resumoInsumosState, newItem]);
    setIsSearchModalOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="space-y-6">
      {/* HEADER PRINCIPAL DE FUNDAÇÕES */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider">
              Modelo de Precisão "Infraestrutura_R0 - Modelo.xlsx"
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Calculadora & Orçamento de Fundações & Infraestrutura
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cálculo físico-geométrico de sapatas tronco-piramidais, blocos, baldrames e estacas hélice contínua
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-right">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Volume de Concreto</span>
            <span className="text-base font-mono font-extrabold text-slate-900">
              {volumeConcretoTotalM3.toFixed(2)} <span className="text-xs font-normal text-slate-500">m³</span>
            </span>
          </div>

          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xs text-right min-w-[170px]">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Custo Total Fundações</span>
            <span className="text-lg font-mono font-black text-emerald-400">
              R$ {custoTotalFundacoesR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* MODAL RADIO SWITCHER: FUNDAÇÃO SUPERFICIAL VS PROFUNDA */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-0.5">
            Modalidade de Fundação
          </span>
          <h4 className="text-sm font-bold">Selecione o Tipo de Elemento Estrutural de Infraestrutura:</h4>
        </div>

        <div className="flex items-center space-x-4 bg-slate-800 p-2 rounded-xl border border-slate-700">
          <label className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${categoriaFundacao === 'superficial' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>
            <input
              type="radio"
              name="categoriaFundacao"
              value="superficial"
              checked={categoriaFundacao === 'superficial'}
              onChange={() => updateParam('categoriaFundacao', 'superficial')}
              className="w-4 h-4 text-amber-500 focus:ring-amber-500 cursor-pointer"
            />
            <span>(●) FUNDAÇÕES SUPERFICIAIS (SAPATAS / BLOCOS)</span>
          </label>

          <label className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${categoriaFundacao === 'profunda' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>
            <input
              type="radio"
              name="categoriaFundacao"
              value="profunda"
              checked={categoriaFundacao === 'profunda'}
              onChange={() => updateParam('categoriaFundacao', 'profunda')}
              className="w-4 h-4 text-amber-500 focus:ring-amber-500 cursor-pointer"
            />
            <span>(●) FUNDAÇÕES PROFUNDAS (ESTACAS / TUBULÕES)</span>
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
          onClick={() => setActiveSubTab('superficiais')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'superficiais'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>🧱 Fundações Superficiais</span>
        </button>

        <button
          onClick={() => setActiveSubTab('profundas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'profundas'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          <Ruler className="w-3.5 h-3.5 text-blue-400" />
          <span>🦯 Fundações Profundas</span>
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
                  Distribuição dos Custos de Fundação
                </h3>
                <p className="text-xs text-slate-500">Decomposição percentual entre Concreto, Fôrmas, Aço e Movimentação de Terra</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-900 inline-block" /> Concreto ({gastosCategorias.percConcreto}%)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Fôrmas ({gastosCategorias.percForma}%)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" /> Aço CA-50 ({gastosCategorias.percAco}%)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-400 inline-block" /> Escavação/Estacas ({gastosCategorias.percTerraplenagemEstacas}%)</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-5 w-full bg-slate-100 rounded-xl overflow-hidden flex shadow-inner">
                <div style={{ width: `${gastosCategorias.percConcreto}%` }} className="bg-slate-900 h-full transition-all duration-500" />
                <div style={{ width: `${gastosCategorias.percForma}%` }} className="bg-amber-500 h-full transition-all duration-500" />
                <div style={{ width: `${gastosCategorias.percAco}%` }} className="bg-emerald-600 h-full transition-all duration-500" />
                <div style={{ width: `${gastosCategorias.percTerraplenagemEstacas}%` }} className="bg-slate-400 h-full transition-all duration-500" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">1. Concreto Estrutural</span>
                  <span className="text-sm font-mono font-extrabold text-slate-900 block">
                    {gastosCategorias.concreto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">{gastosCategorias.percConcreto}% do total</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">2. Fôrmas Metálicas / Compensado</span>
                  <span className="text-sm font-mono font-extrabold text-slate-900 block">
                    {gastosCategorias.forma.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">{gastosCategorias.percForma}% do total</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">3. Armadura em Aço CA-50</span>
                  <span className="text-sm font-mono font-extrabold text-slate-900 block">
                    {gastosCategorias.aco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">{gastosCategorias.percAco}% do total</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">4. Escavação / Perfuração</span>
                  <span className="text-sm font-mono font-extrabold text-slate-900 block">
                    {gastosCategorias.terraplenagemEstacas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">{gastosCategorias.percTerraplenagemEstacas}% do total</span>
                </div>
              </div>
            </div>
          </div>

          {/* Resumo Físico Consolidado */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
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
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Escavação de Solo</span>
              <span className="text-lg font-mono font-black text-slate-900 block">{escavacaoTotalM3.toFixed(2)} m³</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Lastro de Brita</span>
              <span className="text-lg font-mono font-black text-slate-900 block">{lastroTotalM3.toFixed(2)} m³</span>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA 2: FUNDAÇÕES SUPERFICIAIS (SAPATAS / BLOCOS / BALDRAMES) */}
      {activeSubTab === 'superficiais' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-700" />
                Parâmetros de Sapatas, Blocos & Vigas Baldrames (Aba "Sapatas" / "Bloco")
              </h3>
            </div>

            <div className="mb-4">
              <label className="block font-bold text-slate-700 mb-1 text-xs">Geometria da Fundação Superficial</label>
              <select
                value={tipoSuperficial}
                onChange={(e) => updateParam('tipoSuperficial', e.target.value)}
                className="w-full md:w-1/2 h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-800 text-xs outline-none focus:border-slate-700 shadow-2xs cursor-pointer"
              >
                <option value="sapata_tronco">Sapata Tronco-Piramidal (B×L×h1+h2)</option>
                <option value="sapata_reta">Sapata Prismática Reta (B×L×H)</option>
                <option value="bloco_coroamento">Bloco de Coroamento para Estacas</option>
                <option value="viga_baldrame">Viga Baldrame de Travamento (Tabela Completa Modelo BRP)</option>
              </select>
            </div>

            {tipoSuperficial === 'viga_baldrame' ? (
              <TabelaVigasBaldrames
                header={headerVigasBaldrames}
                onChangeHeader={(h) => updateParam('headerVigasBaldrames', h)}
                vigas={vigasBaldramesList}
                onChangeVigas={(v) => updateParam('vigasBaldramesList', v)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quantidade de Peças</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="8"
                    value={qtdSuperficialRaw}
                    onChange={(e) => updateParam('qtdSuperficial', e.target.value)}
                    className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Largura B (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="1.80"
                    value={larguraSuperficialRaw}
                    onChange={(e) => updateParam('larguraSuperficial', e.target.value)}
                    className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Comprimento L (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="1.80"
                    value={comprimentoSuperficialRaw}
                    onChange={(e) => updateParam('comprimentoSuperficial', e.target.value)}
                    className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Altura Rodapé h1 (m)</label>
                  <input
                    type="number"
                    step="0.05"
                    placeholder="0.30"
                    value={alturaRodapeH1Raw}
                    onChange={(e) => updateParam('alturaRodapeH1', e.target.value)}
                    className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                  />
                </div>

                {tipoSuperficial === 'sapata_tronco' && (
                  <>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Altura Pirâmide h2 (m)</label>
                      <input
                        type="number"
                        step="0.05"
                        placeholder="0.40"
                        value={alturaPiramideH2Raw}
                        onChange={(e) => updateParam('alturaPiramideH2', e.target.value)}
                        className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">b topo pilar (m)</label>
                      <input
                        type="number"
                        step="0.05"
                        placeholder="0.40"
                        value={pilarBesteRaw}
                        onChange={(e) => updateParam('pilarBeste', e.target.value)}
                        className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">l topo pilar (m)</label>
                      <input
                        type="number"
                        step="0.05"
                        placeholder="0.40"
                        value={pilarLesteRaw}
                        onChange={(e) => updateParam('pilarLeste', e.target.value)}
                        className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Profundidade da Cava (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="1.50"
                    value={profundidadeCavaRaw}
                    onChange={(e) => updateParam('profundidadeCava', e.target.value)}
                    className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Taxa de Aço CA-50 (kg/m³)</label>
                  <input
                    type="number"
                    step="5"
                    placeholder="75"
                    value={taxaAcoSuperficialRaw}
                    onChange={(e) => updateParam('taxaAcoSuperficial', e.target.value)}
                    className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA 3: FUNDAÇÕES PROFUNDAS (ESTACAS / TUBULÕES) */}
      {activeSubTab === 'profundas' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Ruler className="w-4 h-4 text-slate-700" />
                Parâmetros de Estacas & Tubulões (Abas "Estaca Hélice" / "Estaca Escavada")
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Estaca</label>
                <select
                  value={tipoProfunda}
                  onChange={(e) => updateParam('tipoProfunda', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-800 outline-none focus:border-slate-700 shadow-2xs cursor-pointer"
                >
                  <option value="estaca_helice">Estaca Hélice Contínua</option>
                  <option value="estaca_escavada">Estaca Escavada sem Fluído</option>
                  <option value="estaca_premoldada">Estaca Pré-Moldada de Concreto</option>
                  <option value="tubulao">Tubulão a Céu Aberto</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Diâmetro Nominal (mm)</label>
                <select
                  value={diametroEstacaMm}
                  onChange={(e) => updateParam('diametroEstacaMm', Number(e.target.value))}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-800 outline-none focus:border-slate-700 shadow-2xs cursor-pointer"
                >
                  <option value={300}>Ø 300 mm</option>
                  <option value={400}>Ø 400 mm</option>
                  <option value={500}>Ø 500 mm</option>
                  <option value={600}>Ø 600 mm</option>
                  <option value={800}>Ø 800 mm</option>
                  <option value={1000}>Ø 1000 mm</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Quantidade de Estacas</label>
                <input
                  type="number"
                  min="1"
                  placeholder="24"
                  value={qtdEstacasRaw}
                  onChange={(e) => updateParam('qtdEstacas', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Profundidade Média (m)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="12.0"
                  value={profundidadeEstacaMRaw}
                  onChange={(e) => updateParam('profundidadeEstacaM', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Taxa Aço por Metro (kg/m)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="18.5"
                  value={taxaAcoProfundaKgMRaw}
                  onChange={(e) => updateParam('taxaAcoProfundaKgM', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Perda / Sobreconsumo Concreto (%)</label>
                <input
                  type="number"
                  step="1"
                  placeholder="10"
                  value={sobreconsumoConcretoPercRaw}
                  onChange={(e) => updateParam('sobreconsumoConcretoPerc', e.target.value)}
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
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-400" />
                Memória de Cálculo Físico de Fundações (Modelo Infraestrutura_R0)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block border-b border-slate-700 pb-1">Geometria da Fundação</span>
                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  <div className="flex justify-between"><span>Modalidade:</span><span className="font-bold text-white capitalize">{categoriaFundacao}</span></div>
                  <div className="flex justify-between"><span>Volume Concreto Unitário:</span><span className="font-bold text-white">{(volumeConcretoTotalM3 / (categoriaFundacao === 'superficial' ? qtdSuperficial : qtdEstacas)).toFixed(3)} m³</span></div>
                  <div className="flex justify-between"><span>Fôrma Unitária:</span><span className="font-bold text-white">{(areaFormaTotalM2 / (qtdSuperficial || 1)).toFixed(2)} m²</span></div>
                  <div className="flex justify-between pt-1 border-t border-slate-700"><span>Volume Total Concreto:</span><span className="font-bold text-amber-400">{volumeConcretoTotalM3.toFixed(2)} m³</span></div>
                </div>
              </div>

              <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block border-b border-slate-700 pb-1">Movimentação de Terra & Cava</span>
                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  <div className="flex justify-between"><span>Escavação Cava Unitária:</span><span className="font-bold text-white">{(escavacaoTotalM3 / (categoriaFundacao === 'superficial' ? qtdSuperficial : qtdEstacas)).toFixed(2)} m³</span></div>
                  <div className="flex justify-between"><span>Lastro Brita Unitário:</span><span className="font-bold text-white">{(lastroTotalM3 / (qtdSuperficial || 1)).toFixed(3)} m³</span></div>
                  <div className="flex justify-between"><span>Escavação Total:</span><span className="font-bold text-blue-300">{escavacaoTotalM3.toFixed(2)} m³</span></div>
                  <div className="flex justify-between pt-1 border-t border-slate-700"><span>Reaterro Compactado:</span><span className="font-bold text-emerald-400">{reaterroTotalM3.toFixed(2)} m³</span></div>
                </div>
              </div>

              <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block border-b border-slate-700 pb-1">Armadura Aço CA-50</span>
                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  <div className="flex justify-between"><span>Taxa Adotada:</span><span className="font-bold text-white">{categoriaFundacao === 'superficial' ? `${taxaAcoSuperficial} kg/m³` : `${taxaAcoProfundaKgM} kg/m`}</span></div>
                  <div className="flex justify-between"><span>Peso Aço por Peça:</span><span className="font-bold text-white">{(pesoAcoTotalKg / (categoriaFundacao === 'superficial' ? qtdSuperficial : qtdEstacas)).toFixed(2)} kg</span></div>
                  <div className="flex justify-between pt-1 border-t border-slate-700"><span>Peso Total Aço CA-50:</span><span className="font-bold text-amber-400">{pesoAcoTotalKg.toFixed(2)} kg</span></div>
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
                Lista Quantitativa de Compras e Serviços de Fundação (Base Própria BRP)
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
                  <th className="py-2.5 px-3">Descrição do Item de Fundação</th>
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
                        <option value="concreto_fundacao">🏗️ Concreto Fundação (m³)</option>
                        <option value="forma_fundacao">📐 Fôrmas Laterais (m²)</option>
                        <option value="aco_fundacao">⛓️ Aço CA-50/60 (kg)</option>
                        <option value="escavacao_solo">🚜 Escavação Cava (m³)</option>
                        <option value="lastro_brita">🪨 Lastro Brita (m³)</option>
                        <option value="estaca_metro">📏 Perfurado Estacas (m)</option>
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
                Consolidação do Orçamento de Fundações
              </span>
            </div>

            <div className="flex items-center gap-6 text-right">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Custo Total Global</span>
                <span className="text-lg font-mono font-black text-emerald-400">
                  R$ {custoTotalFundacoesR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                <p className="text-xs text-slate-400">Pesquise insumos ou composições para Fundações</p>
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
