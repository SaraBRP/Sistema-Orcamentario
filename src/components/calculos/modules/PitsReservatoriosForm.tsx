import React, { useEffect, useState, useCallback, useMemo } from 'react';
import type { CalculoResultado, ResumoInsumoItem, TipoInsumoCategoria } from '../../../types/calculos';
import { 
  Package, CheckCircle2, Trash2, Search, X, 
  Ruler, PieChart as PieChartIcon, Building2, Calculator, Waves
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Props {
  parametros: Record<string, any>;
  onChangeParametros: (newParams: Record<string, any>) => void;
  onUpdateResultados: (resultados: CalculoResultado) => void;
}

export const PitsReservatoriosForm: React.FC<Props> = ({
  parametros,
  onChangeParametros,
  onUpdateResultados
}) => {
  // Navegação de Sub-Abas de Pits & Reservatórios
  const [activeSubTab, setActiveSubTab] = useState<'resumo' | 'geometria' | 'impermeabilizacao' | 'memoria' | 'composicao'>('resumo');

  // Tipo & Finalidade do Reservatório
  const tipoFinalidade = parametros.tipoFinalidade || 'acumulacao'; // 'acumulacao' (com imperm) | 'retardo' (sem imperm) | 'pit_maquinario'
  const qtdCaixasRaw = parametros.qtdCaixas !== undefined ? String(parametros.qtdCaixas) : '1';
  const numCelulasDivisoriasRaw = parametros.numCelulasDivisorias !== undefined ? String(parametros.numCelulasDivisorias) : '1';

  // Dimensões Internas (m)
  const pint1ComprimentoRaw = parametros.pint1Comprimento !== undefined ? String(parametros.pint1Comprimento) : '14.0'; // Pint1 (m)
  const pint2LarguraRaw = parametros.pint2Largura !== undefined ? String(parametros.pint2Largura) : '27.5'; // Pint2 (m)
  const hintAlturaUtilRaw = parametros.hintAlturaUtil !== undefined ? String(parametros.hintAlturaUtil) : '2.45'; // Hint (m)

  // Espessuras Estruturais (m)
  const epParedeExtRaw = parametros.epParedeExt !== undefined ? String(parametros.epParedeExt) : '0.15'; // ep (m)
  const epdivParedeIntRaw = parametros.epdivParedeInt !== undefined ? String(parametros.epdivParedeInt) : '0.15'; // epdiv (m)
  const linfLajeFundoRaw = parametros.linfLajeFundo !== undefined ? String(parametros.linfLajeFundo) : '0.15'; // Linf (m)
  const lsupLajeTetoRaw = parametros.lsupLajeTeto !== undefined ? String(parametros.lsupLajeTeto) : '0.15'; // Lsup (m)
  const cfChanfroRaw = parametros.cfChanfro !== undefined ? String(parametros.cfChanfro) : '0.00'; // cf mossa de canto (m)

  // Parâmetros de Escavação e Aço
  const taxaAcoKgM3Raw = parametros.taxaAcoKgM3 !== undefined ? String(parametros.taxaAcoKgM3) : '150'; // kg/m³

  // Insumos do Resumo de Reservatórios
  const resumoInsumosState: ResumoInsumoItem[] = parametros.resumoInsumosReservatorios || [
    { id: '1', codigo: '1355', descricao: 'Concreto impermeável fck ≥ 30 MPa usinado para reservatórios', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm³', precoUnitario: 410.00, regraCalculo: 'concreto_reservatorio' },
    { id: '2', codigo: '255', descricao: 'Fôrma de compensado plastificado 18mm para paredes de reservatório', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm²', precoUnitario: 52.00, regraCalculo: 'forma_reservatorio' },
    { id: '3', codigo: '725', descricao: 'Aço CA-50 cortado e dobrado para paredes e lajes de reservatório', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'kg', precoUnitario: 6.90, regraCalculo: 'aco_reservatorio' },
    { id: '4', codigo: '380', descricao: 'Cimbramento metálico / tubo-braçadeira para laje de teto', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm³', precoUnitario: 24.00, regraCalculo: 'cimbramento_teto' },
    { id: '5', codigo: '510', descricao: 'Impermeabilização com manta asfáltica dupla 4mm ou argamassa polimérica', tipoInsumo: 'Mão de Obra', fase: 'fabricacao', unidade: 'm²', precoUnitario: 68.00, regraCalculo: 'impermeabilizacao_m2' },
    { id: '6', codigo: '104', descricao: 'Escavação mecanizada de cava para reservatório enterrado', tipoInsumo: 'Mão de Obra', fase: 'fabricacao', unidade: 'm³', precoUnitario: 28.00, regraCalculo: 'escavacao_cava' },
    { id: '7', codigo: '110', descricao: 'Lastro de brita/concreto magro e=5cm para regularização', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm³', precoUnitario: 95.00, regraCalculo: 'lastro_brita' }
  ];

  // Modal de Busca no Banco Próprio BRP
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Conversões numéricas
  const cxQtd = parseInt(qtdCaixasRaw, 10) || 1;
  const pdivNum = parseInt(numCelulasDivisoriasRaw, 10) || 1;
  const pint1Comprimento = parseFloat(pint1ComprimentoRaw.replace(',', '.')) || 0;
  const pint2Largura = parseFloat(pint2LarguraRaw.replace(',', '.')) || 0;
  const hintAlturaUtil = parseFloat(hintAlturaUtilRaw.replace(',', '.')) || 0;

  const epParedeExt = parseFloat(epParedeExtRaw.replace(',', '.')) || 0;
  const epdivParedeInt = parseFloat(epdivParedeIntRaw.replace(',', '.')) || 0;
  const linfLajeFundo = parseFloat(linfLajeFundoRaw.replace(',', '.')) || 0;
  const lsupLajeTeto = parseFloat(lsupLajeTetoRaw.replace(',', '.')) || 0;
  const cfChanfro = parseFloat(cfChanfroRaw.replace(',', '.')) || 0;

  const taxaAcoKgM3 = parseFloat(taxaAcoKgM3Raw.replace(',', '.')) || 0;

  // --------------------------------------------------------------------------
  // CÁLCULOS FÍSICO-GEOMÉTRICOS DA ABA "Caixa 1" (MODELO RESERVATÓRIOS ENTERRADOS)
  // --------------------------------------------------------------------------
  const pext1 = pint1Comprimento + 2 * epParedeExt;
  const pext2 = pint2Largura + 2 * epParedeExt;
  const hext = hintAlturaUtil + linfLajeFundo + lsupLajeTeto;

  // Volume Útil de Água (m³ e Litros): V_agua = (Pint1*Pint2 - 2*cf^2)*Hint - Pint1*epdiv*Hint*(Pdiv-1)
  const areaIntBruta = pint1Comprimento * pint2Largura;
  const areaDescontoChanfros = 2 * Math.pow(cfChanfro, 2);
  const areaEfetivaBaseInt = areaIntBruta - areaDescontoChanfros;
  const volAguaUnitarioM3 = (areaEfetivaBaseInt * hintAlturaUtil) - (pint1Comprimento * epdivParedeInt * hintAlturaUtil * (pdivNum - 1));
  const volAguaTotalM3 = Math.max(0, Math.round(volAguaUnitarioM3 * cxQtd * 100) / 100);
  const volumeAguaLitros = Math.round(volAguaTotalM3 * 1000);

  // Concreto Paredes Externas e Divisórias (m³)
  const volParedesExtUnitM3 = (((pint1Comprimento + pint2Largura) * 2 * epParedeExt) + (4 * Math.pow(epParedeExt, 2)) + (2 * Math.pow(cfChanfro, 2))) * hintAlturaUtil;
  const volParedesDivUnitM3 = (pint1Comprimento * hintAlturaUtil * epdivParedeInt + 2 * Math.pow(cfChanfro, 2) * hintAlturaUtil) * (pdivNum - 1);
  const volParedesTotalUnitM3 = volParedesExtUnitM3 + volParedesDivUnitM3;

  // Concreto Lajes Inferior e Superior (m³)
  const volLajeFundoUnitM3 = pext1 * pext2 * linfLajeFundo;
  const volLajeTetoUnitM3 = pext1 * pext2 * lsupLajeTeto;
  const volConcretoUnitarioM3 = volParedesTotalUnitM3 + volLajeFundoUnitM3 + volLajeTetoUnitM3;
  const volConcretoTotalM3 = Math.round(volConcretoUnitarioM3 * cxQtd * 100) / 100;

  // Fôrmas Paredes, Divisórias e Laje Superior (m²)
  const areaFormaParedesUnitM2 = (pint1Comprimento + pint2Largura) * 2 * hintAlturaUtil + (pext1 + pext2) * 2 * (hext - linfLajeFundo);
  const areaFormaDivisoriasUnitM2 = pint1Comprimento * hintAlturaUtil * 2 * (pdivNum - 1);
  const areaFormaLajeFundoUnitM2 = (pext1 + pext2) * 2 * linfLajeFundo;
  const areaFormaLajeTetoUnitM2 = lsupLajeTeto > 0 ? (pint1Comprimento * pint2Largura) : 0;

  const areaFormaUnitariaM2 = areaFormaParedesUnitM2 + areaFormaDivisoriasUnitM2 + areaFormaLajeFundoUnitM2 + areaFormaLajeTetoUnitM2;
  const areaFormaTotalM2 = Math.round(areaFormaUnitariaM2 * cxQtd * 100) / 100;

  // Cimbramento do Teto (m³): F59 * Hint
  const volCimbramentoUnitM3 = areaFormaLajeTetoUnitM2 * hintAlturaUtil;
  const volCimbramentoTotalM3 = Math.round(volCimbramentoUnitM3 * cxQtd * 100) / 100;

  // Aço CA-50 Total (kg): VolConcreto * taxaAco
  const pesoAcoTotalKg = Math.round(volConcretoTotalM3 * taxaAcoKgM3 * 100) / 100;

  // Impermeabilização (m²): Se caixa de acumulação -> Paredes + Piso + Divisórias
  const precisaImpermeabilizar = tipoFinalidade !== 'retardo';
  const areaImpermeabUnitM2 = precisaImpermeabilizar ? ((pint1Comprimento + pint2Largura) * 2 * hintAlturaUtil + areaIntBruta + areaFormaDivisoriasUnitM2) : 0;
  const areaImpermeabTotalM2 = Math.round(areaImpermeabUnitM2 * cxQtd * 100) / 100;

  // Escavação de Cava com Folga Lateral (F36 = pext1 / 3): (pext1 + F36)*(pext2 + F36)*(hext + 0.05)
  const folgaEscavacaoM = pext1 / 3;
  const volEscavacaoUnitM3 = (pext1 + folgaEscavacaoM) * (pext2 + folgaEscavacaoM) * (hext + 0.05);
  const volEscavacaoTotalM3 = Math.round(volEscavacaoUnitM3 * cxQtd * 100) / 100;

  // Lastro Magro e=5cm (m³)
  const volLastroUnitM3 = pext1 * pext2 * 0.05;
  const volLastroTotalM3 = Math.round(volLastroUnitM3 * cxQtd * 100) / 100;

  // Apiloamento do Fundo (m²) e Reaterro (m³)
  const areaApiloamentoTotalM2 = Math.round(pext1 * pext2 * cxQtd * 100) / 100;
  const volVolumeExternoTotalM3 = pext1 * pext2 * (hext + 0.05) * cxQtd;
  const volReaterroTotalM3 = Math.max(0, Math.round((volEscavacaoTotalM3 - volVolumeExternoTotalM3) * 100) / 100);

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

  // Helper para determinar a regra de cálculo matemática de cada insumo de Reservatório
  const calcularCoeficienteReservatorios = (item: ResumoInsumoItem): number => {
    const regra = item.regraCalculo;
    const desc = item.descricao.toLowerCase();

    if (regra === 'concreto_reservatorio' || desc.includes('concreto')) {
      return volConcretoTotalM3;
    }
    if (regra === 'forma_reservatorio' || desc.includes('fôrma') || desc.includes('forma')) {
      return areaFormaTotalM2;
    }
    if (regra === 'aco_reservatorio' || desc.includes('aço') || desc.includes('aco')) {
      return pesoAcoTotalKg;
    }
    if (regra === 'cimbramento_teto' || desc.includes('cimbramento')) {
      return volCimbramentoTotalM3;
    }
    if (regra === 'impermeabilizacao_m2' || desc.includes('impermeabilização') || desc.includes('manta')) {
      return areaImpermeabTotalM2;
    }
    if (regra === 'escavacao_cava' || desc.includes('escavação')) {
      return volEscavacaoTotalM3;
    }
    if (regra === 'lastro_brita' || desc.includes('lastro') || desc.includes('brita')) {
      return volLastroTotalM3;
    }

    return item.taxaProdutividade ?? 1.0;
  };

  // Consolidação Financeira
  const calcularResumoConsolidado = (): ResumoInsumoItem[] => {
    return resumoInsumosState.map((item) => {
      const coefUnitario = calcularCoeficienteReservatorios(item);
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
  const custoTotalReservatoriosR$ = resumoCalculadoList.reduce((acc, i) => acc + (i.custoTotalR$ || 0), 0);

  // Agrupamento de Gastos para o Gráfico
  const gastosCategorias = useMemo(() => {
    let concreto = 0;
    let formaCimbramento = 0;
    let aco = 0;
    let impermeabEscavacao = 0;

    resumoCalculadoList.forEach(item => {
      const desc = item.descricao.toLowerCase();
      const val = item.custoTotalR$ || 0;

      if (desc.includes('concreto')) {
        concreto += val;
      } else if (desc.includes('fôrma') || desc.includes('forma') || desc.includes('cimbramento')) {
        formaCimbramento += val;
      } else if (desc.includes('aço') || desc.includes('aco')) {
        aco += val;
      } else {
        impermeabEscavacao += val;
      }
    });

    const total = custoTotalReservatoriosR$ > 0 ? custoTotalReservatoriosR$ : 1;

    return {
      concreto: Math.round(concreto * 100) / 100,
      formaCimbramento: Math.round(formaCimbramento * 100) / 100,
      aco: Math.round(aco * 100) / 100,
      impermeabEscavacao: Math.round(impermeabEscavacao * 100) / 100,

      percConcreto: Math.round((concreto / total) * 100),
      percFormaCimbramento: Math.round((formaCimbramento / total) * 100),
      percAco: Math.round((aco / total) * 100),
      percImpermeabEscavacao: Math.round((impermeabEscavacao / total) * 100)
    };
  }, [resumoCalculadoList, custoTotalReservatoriosR$]);

  useEffect(() => {
    onUpdateResultados({
      volumeConcretoM3: volConcretoTotalM3,
      areaFormaM2: areaFormaTotalM2,
      areaImpermeabilizacaoM2: areaImpermeabTotalM2,
      escavacaoM3: volEscavacaoTotalM3,
      lastroM3: volLastroTotalM3,
      reaterroM3: volReaterroTotalM3,
      pesoAcoKg: pesoAcoTotalKg,
      custoTotalEstimadoR$: Math.round(custoTotalReservatoriosR$ * 100) / 100,

      detalhes: {
        'Finalidade do Reservatório': tipoFinalidade === 'acumulacao' ? 'Acumulação / Reúso de Água (Impermeabilização Obrigatória)' : tipoFinalidade === 'retardo' ? 'Bacia de Retardo / Contenção (Sem Impermeabilização)' : 'Pit de Maquinário / Poço Industrial',
        'Capacidade Útil de Água': `${volAguaTotalM3.toFixed(2)} m³ (${volumeAguaLitros.toLocaleString('pt-BR')} Litros)`,
        'Quantidade de Caixas / Células': `${cxQtd} caixa(s) com ${pdivNum} célula(s) interna(s)`,
        'Dimensões Internas (m)': `${pint1Comprimento.toFixed(2)}m x ${pint2Largura.toFixed(2)}m x ${hintAlturaUtil.toFixed(2)}m (H útil)`,
        'Dimensões Externas Totais (m)': `${pext1.toFixed(2)}m x ${pext2.toFixed(2)}m x ${hext.toFixed(2)}m (H ext)`,
        'Volume Concreto Paredes e Lajes': `${volConcretoTotalM3.toFixed(2)} m³`,
        'Fôrmas e Cimbramento': `${areaFormaTotalM2.toFixed(2)} m² (Fôrmas) | ${volCimbramentoTotalM3.toFixed(2)} m³ (Cimbramento)`,
        'Aço CA-50 Total': `${pesoAcoTotalKg.toFixed(2)} kg (Taxa ${taxaAcoKgM3} kg/m³)`,
        'Área Impermeabilizada Efetiva': precisaImpermeabilizar ? `${areaImpermeabTotalM2.toFixed(2)} m²` : 'Isento (Bacia de Retardo)',
        'Apiloamento do Fundo': `${areaApiloamentoTotalM2.toFixed(2)} m²`,
        'Escavação de Cava Total': `${volEscavacaoTotalM3.toFixed(2)} m³ (Folga ${folgaEscavacaoM.toFixed(2)}m)`,
        'Custo Total Estimado': `R$ ${custoTotalReservatoriosR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      }
    });
  }, [tipoFinalidade, volAguaTotalM3, volumeAguaLitros, cxQtd, pdivNum, pint1Comprimento, pint2Largura, hintAlturaUtil, pext1, pext2, hext, volConcretoTotalM3, areaFormaTotalM2, volCimbramentoTotalM3, pesoAcoTotalKg, taxaAcoKgM3, precisaImpermeabilizar, areaImpermeabTotalM2, areaApiloamentoTotalM2, volEscavacaoTotalM3, folgaEscavacaoM, volLastroTotalM3, volReaterroTotalM3, custoTotalReservatoriosR$]);

  const updateParam = (key: string, val: any) => {
    onChangeParametros({ ...parametros, [key]: val });
  };

  const handleUpdateResumoItem = (id: string, field: keyof ResumoInsumoItem, val: any) => {
    const updated = resumoInsumosState.map(i => i.id === id ? { ...i, [field]: val } : i);
    updateParam('resumoInsumosReservatorios', updated);
  };

  const handleDeleteResumoItem = (id: string) => {
    const updated = resumoInsumosState.filter(i => i.id !== id);
    updateParam('resumoInsumosReservatorios', updated);
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

    updateParam('resumoInsumosReservatorios', [...resumoInsumosState, newItem]);
    setIsSearchModalOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="space-y-6">
      {/* HEADER PRINCIPAL DE PITS, RESERVATÓRIOS & BACIAS */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-cyan-100 text-cyan-700 uppercase tracking-wider">
              Modelo de Precisão "Reservatórios Enterrados PITs e canaletas - Modelo.xlsx"
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Calculadora & Orçamento de Pits, Reservatórios & Bacias
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dimensionamento físico de reservatórios enterrados, volume útil em Litros, fôrmas, cimbramento e impermeabilização
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-cyan-50 p-3 rounded-xl border border-cyan-200 text-right">
            <span className="text-[10px] text-cyan-700 font-bold block uppercase tracking-wider">Capacidade Útil de Água</span>
            <span className="text-base font-mono font-extrabold text-cyan-950">
              {volAguaTotalM3.toFixed(2)} m³ <span className="text-xs font-normal text-cyan-700">({volumeAguaLitros.toLocaleString('pt-BR')} L)</span>
            </span>
          </div>

          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xs text-right min-w-[170px]">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Custo Total Reservatório</span>
            <span className="text-lg font-mono font-black text-emerald-400">
              R$ {custoTotalReservatoriosR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
          onClick={() => setActiveSubTab('geometria')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'geometria'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          <Ruler className="w-3.5 h-3.5 text-cyan-400" />
          <span>🧱 Geometria & Células</span>
        </button>

        <button
          onClick={() => setActiveSubTab('impermeabilizacao')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'impermeabilizacao'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          <Waves className="w-3.5 h-3.5 text-blue-400" />
          <span>🌊 Finalidade & Impermeabilização</span>
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
                  Decomposição Financeira do Reservatório / PIT
                </h3>
                <p className="text-xs text-slate-500">Distribuição percentual entre Concreto, Fôrmas/Cimbramento, Aço CA-50 e Impermeabilização/Cava</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-900 inline-block" /> Concreto ({gastosCategorias.percConcreto}%)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-cyan-500 inline-block" /> Fôrmas/Cimbramento ({gastosCategorias.percFormaCimbramento}%)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" /> Aço CA-50 ({gastosCategorias.percAco}%)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-600 inline-block" /> Impermeab/Cava ({gastosCategorias.percImpermeabEscavacao}%)</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-5 w-full bg-slate-100 rounded-xl overflow-hidden flex shadow-inner">
                <div style={{ width: `${gastosCategorias.percConcreto}%` }} className="bg-slate-900 h-full transition-all duration-500" />
                <div style={{ width: `${gastosCategorias.percFormaCimbramento}%` }} className="bg-cyan-500 h-full transition-all duration-500" />
                <div style={{ width: `${gastosCategorias.percAco}%` }} className="bg-emerald-600 h-full transition-all duration-500" />
                <div style={{ width: `${gastosCategorias.percImpermeabEscavacao}%` }} className="bg-blue-600 h-full transition-all duration-500" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">1. Concreto Impermeável</span>
                  <span className="text-sm font-mono font-extrabold text-slate-900 block">
                    {gastosCategorias.concreto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">{gastosCategorias.percConcreto}% do total</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">2. Fôrmas & Cimbramento Teto</span>
                  <span className="text-sm font-mono font-extrabold text-slate-900 block">
                    {gastosCategorias.formaCimbramento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">{gastosCategorias.percFormaCimbramento}% do total</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">3. Armadura de Aço CA-50</span>
                  <span className="text-sm font-mono font-extrabold text-slate-900 block">
                    {gastosCategorias.aco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">{gastosCategorias.percAco}% do total</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">4. Impermeabilização & Cava</span>
                  <span className="text-sm font-mono font-extrabold text-slate-900 block">
                    {gastosCategorias.impermeabEscavacao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">{gastosCategorias.percImpermeabEscavacao}% do total</span>
                </div>
              </div>
            </div>
          </div>

          {/* Resumo Físico Consolidado */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Volume Útil de Água</span>
              <span className="text-lg font-mono font-black text-cyan-600 block">{volAguaTotalM3.toFixed(2)} m³</span>
              <span className="text-[10px] text-slate-500 font-medium">{volumeAguaLitros.toLocaleString('pt-BR')} Litros</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Volume Concreto</span>
              <span className="text-lg font-mono font-black text-slate-900 block">{volConcretoTotalM3.toFixed(2)} m³</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Fôrmas Totais</span>
              <span className="text-lg font-mono font-black text-slate-900 block">{areaFormaTotalM2.toFixed(2)} m²</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Impermeabilização</span>
              <span className="text-lg font-mono font-black text-blue-600 block">{areaImpermeabTotalM2.toFixed(2)} m²</span>
              <span className="text-[10px] text-slate-500 font-medium">{precisaImpermeabilizar ? 'Manta / Polimérica' : 'Isento (Retardo)'}</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Escavação de Cava</span>
              <span className="text-lg font-mono font-black text-slate-900 block">{volEscavacaoTotalM3.toFixed(2)} m³</span>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA 2: GEOMETRIA & CÉLULAS */}
      {activeSubTab === 'geometria' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-700" />
                Dimensões Internas e Espessuras Estruturais (Aba "Caixa 1")
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Número de Caixas Identicas (cx)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={qtdCaixasRaw}
                  onChange={(e) => updateParam('qtdCaixas', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Número de Células Internas (Pdiv)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={numCelulasDivisoriasRaw}
                  onChange={(e) => updateParam('numCelulasDivisorias', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Comprimento Interno Pint1 (m)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="14.0"
                  value={pint1ComprimentoRaw}
                  onChange={(e) => updateParam('pint1Comprimento', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Largura Interna Pint2 (m)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="27.5"
                  value={pint2LarguraRaw}
                  onChange={(e) => updateParam('pint2Largura', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Altura Útil da Água Hint (m)</label>
                <input
                  type="number"
                  step="0.05"
                  placeholder="2.45"
                  value={hintAlturaUtilRaw}
                  onChange={(e) => updateParam('hintAlturaUtil', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-cyan-700 font-extrabold text-sm outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Espessura Paredes Ext ep (m)</label>
                <input
                  type="number"
                  step="0.05"
                  placeholder="0.15"
                  value={epParedeExtRaw}
                  onChange={(e) => updateParam('epParedeExt', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Espessura Paredes Div epdiv (m)</label>
                <input
                  type="number"
                  step="0.05"
                  placeholder="0.15"
                  value={epdivParedeIntRaw}
                  onChange={(e) => updateParam('epdivParedeInt', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Espessura Laje Fundo Linf (m)</label>
                <input
                  type="number"
                  step="0.05"
                  placeholder="0.15"
                  value={linfLajeFundoRaw}
                  onChange={(e) => updateParam('linfLajeFundo', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Espessura Laje Teto Lsup (m)</label>
                <input
                  type="number"
                  step="0.05"
                  placeholder="0.15"
                  value={lsupLajeTetoRaw}
                  onChange={(e) => updateParam('lsupLajeTeto', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Chanfro / Mossa de Canto cf (m)</label>
                <input
                  type="number"
                  step="0.05"
                  placeholder="0.00"
                  value={cfChanfroRaw}
                  onChange={(e) => updateParam('cfChanfro', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Taxa de Aço CA-50 (kg/m³)</label>
                <input
                  type="number"
                  step="5"
                  placeholder="150"
                  value={taxaAcoKgM3Raw}
                  onChange={(e) => updateParam('taxaAcoKgM3', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA 3: FINALIDADE & IMPERMEABILIZAÇÃO */}
      {activeSubTab === 'impermeabilizacao' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Waves className="w-4 h-4 text-blue-500" />
                Regra da Planilha Modelo para Impermeabilização (Linhas L83:L85)
              </h3>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50/50 cursor-pointer">
                <input
                  type="radio"
                  name="tipoFinalidade"
                  value="acumulacao"
                  checked={tipoFinalidade === 'acumulacao'}
                  onChange={() => updateParam('tipoFinalidade', 'acumulacao')}
                  className="w-4 h-4 text-blue-600 mt-0.5 focus:ring-blue-500 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-xs text-blue-950 block">💧 Caixa de Acumulação / Reúso de Água</span>
                  <span className="text-[11px] text-blue-700">
                    <strong>Regra Oficial da Planilha:</strong> Para caixas de acumulação ou reúso de água, é <strong className="underline">OBRIGATÓRIA</strong> a impermeabilização das paredes e do fundo ({areaImpermeabTotalM2.toFixed(2)} m² computados).
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="tipoFinalidade"
                  value="retardo"
                  checked={tipoFinalidade === 'retardo'}
                  onChange={() => updateParam('tipoFinalidade', 'retardo')}
                  className="w-4 h-4 text-slate-600 mt-0.5 focus:ring-slate-500 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-xs text-slate-900 block">🌧️ Caixa de Retardo / Bacia de Amortecimento de Cheias</span>
                  <span className="text-[11px] text-slate-600">
                    <strong>Regra Oficial da Planilha:</strong> Se a caixa for de retardo/drenagem temporária, <strong className="underline">NÃO é necessário impermeabilizar</strong> (área computada de impermeabilização = 0,00 m²).
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="tipoFinalidade"
                  value="pit_maquinario"
                  checked={tipoFinalidade === 'pit_maquinario'}
                  onChange={() => updateParam('tipoFinalidade', 'pit_maquinario')}
                  className="w-4 h-4 text-slate-600 mt-0.5 focus:ring-slate-500 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-xs text-slate-900 block">⚙️ Pit de Maquinário Industrial / Poço de Elevador</span>
                  <span className="text-[11px] text-slate-600">
                    Poço subterrâneo para estamparia, prensas ou elevadores industriais com impermeabilização contra umidade do lençol freático.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA 4: MEMÓRIA DE CÁLCULO FÍSICO */}
      {activeSubTab === 'memoria' && (
        <div className="space-y-5">
          <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 shadow-lg border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <Calculator className="w-4 h-4 text-cyan-400" />
                Memória de Cálculo Físico de Reservatórios (Modelo Oficial da Planilha)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block border-b border-slate-700 pb-1">1. Capacidade Útil & Concreto</span>
                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  <div className="flex justify-between"><span>Volume Útil Água:</span><span className="font-bold text-cyan-400">{volAguaTotalM3.toFixed(2)} m³</span></div>
                  <div className="flex justify-between"><span>Concreto Paredes:</span><span className="font-bold text-white">{(volParedesTotalUnitM3 * cxQtd).toFixed(2)} m³</span></div>
                  <div className="flex justify-between"><span>Concreto Laje Fundo:</span><span className="font-bold text-white">{(volLajeFundoUnitM3 * cxQtd).toFixed(2)} m³</span></div>
                  <div className="flex justify-between"><span>Concreto Laje Teto:</span><span className="font-bold text-white">{(volLajeTetoUnitM3 * cxQtd).toFixed(2)} m³</span></div>
                  <div className="flex justify-between pt-1 border-t border-slate-700"><span>Volume Total Concreto:</span><span className="font-bold text-white">{volConcretoTotalM3.toFixed(2)} m³</span></div>
                </div>
              </div>

              <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block border-b border-slate-700 pb-1">2. Fôrmas & Cimbramento</span>
                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  <div className="flex justify-between"><span>Fôrma Paredes Ext/Int:</span><span className="font-bold text-white">{(areaFormaParedesUnitM2 * cxQtd).toFixed(2)} m²</span></div>
                  <div className="flex justify-between"><span>Fôrma Laje Teto:</span><span className="font-bold text-white">{(areaFormaLajeTetoUnitM2 * cxQtd).toFixed(2)} m²</span></div>
                  <div className="flex justify-between"><span>Cimbramento do Teto:</span><span className="font-bold text-cyan-300">{volCimbramentoTotalM3.toFixed(2)} m³</span></div>
                  <div className="flex justify-between pt-1 border-t border-slate-700"><span>Área Total de Fôrmas:</span><span className="font-bold text-white">{areaFormaTotalM2.toFixed(2)} m²</span></div>
                </div>
              </div>

              <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block border-b border-slate-700 pb-1">3. Movimentação & Impermeabilização</span>
                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  <div className="flex justify-between"><span>Folga Escavação (Pext/3):</span><span className="font-bold text-white">{folgaEscavacaoM.toFixed(2)} m</span></div>
                  <div className="flex justify-between"><span>Escavação de Cava:</span><span className="font-bold text-white">{volEscavacaoTotalM3.toFixed(2)} m³</span></div>
                  <div className="flex justify-between"><span>Reaterro Compactado:</span><span className="font-bold text-emerald-400">{volReaterroTotalM3.toFixed(2)} m³</span></div>
                  <div className="flex justify-between pt-1 border-t border-slate-700"><span>Impermeabilização Efetiva:</span><span className="font-bold text-blue-400">{areaImpermeabTotalM2.toFixed(2)} m²</span></div>
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
                Lista Quantitativa de Compras e Serviços de Reservatórios (Base Própria BRP)
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
                  <th className="py-2.5 px-3">Descrição do Item do Reservatório</th>
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
                        <option value="concreto_reservatorio">🏗️ Concreto Impermeável (m³)</option>
                        <option value="forma_reservatorio">📐 Fôrmas Estruturais (m²)</option>
                        <option value="aco_reservatorio">⛓️ Aço CA-50 (kg)</option>
                        <option value="cimbramento_teto">🪜 Cimbramento do Teto (m³)</option>
                        <option value="impermeabilizacao_m2">💧 Impermeabilização (m²)</option>
                        <option value="escavacao_cava">🚜 Escavação Cava (m³)</option>
                        <option value="lastro_brita">🪨 Lastro Brita (m³)</option>
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
                Consolidação do Orçamento de Reservatório / PIT
              </span>
            </div>

            <div className="flex items-center gap-6 text-right">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Custo Total Global</span>
                <span className="text-lg font-mono font-black text-emerald-400">
                  R$ {custoTotalReservatoriosR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                <p className="text-xs text-slate-400">Pesquise insumos ou composições para Reservatórios & PITs</p>
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
