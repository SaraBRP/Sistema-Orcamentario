import React, { useEffect, useState, useCallback, useMemo } from 'react';
import type { CalculoResultado, ResumoInsumoItem, TipoInsumoCategoria } from '../../../types/calculos';
import { 
  Building2, Package, CheckCircle2, Trash2, Search, X, 
  Ruler, PieChart as PieChartIcon, AlertTriangle, Info, Calculator
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Props {
  parametros: Record<string, any>;
  onChangeParametros: (newParams: Record<string, any>) => void;
  onUpdateResultados: (resultados: CalculoResultado) => void;
}

// Tabela Oficial de Telas Soldadas NBR 7481 (CA-60 / Gerdau)
const TELAS_NBR_CATALOGO: Record<string, { nome: string; malha: string; diametro: number; pesoKgM2: number }> = {
  'Q92': { nome: 'Tela Q-92', malha: '15 x 15 cm', diametro: 4.2, pesoKgM2: 1.48 },
  'Q113': { nome: 'Tela Q-113', malha: '10 x 10 cm', diametro: 3.8, pesoKgM2: 1.80 },
  'Q138': { nome: 'Tela Q-138', malha: '10 x 10 cm', diametro: 4.2, pesoKgM2: 2.20 },
  'Q196': { nome: 'Tela Q-196', malha: '10 x 10 cm', diametro: 5.0, pesoKgM2: 3.11 },
  'Q246': { nome: 'Tela Q-246', malha: '10 x 10 cm', diametro: 5.6, pesoKgM2: 3.91 },
  'Q396': { nome: 'Tela Q-396', malha: '10 x 10 cm', diametro: 7.1, pesoKgM2: 6.28 },
  'Q503': { nome: 'Tela Q-503', malha: '10 x 10 cm', diametro: 8.0, pesoKgM2: 7.96 },
  'SEM_TELA': { nome: 'Nenhuma (Sem Tela)', malha: '-', diametro: 0, pesoKgM2: 0.00 }
};

// Tabela de Pesos Lineares de Barras de Transferência CA-25 / CA-50
const BARRAS_TRANSFERENCIA_CATALOGO: Record<number, number> = {
  12.5: 0.97,
  16.0: 1.58,
  20.0: 2.47,
  25.0: 3.86,
  32.0: 6.32
};

export const PisosForm: React.FC<Props> = ({
  parametros,
  onChangeParametros,
  onUpdateResultados
}) => {
  // Mode Switcher: TELA (L16=1) vs FIBRA DE AÇO (L16=2)
  const tipoArmacao = parametros.tipoArmacao || 'tela'; // 'tela' | 'fibra_metalica'

  // 1. Entrada de Dados de Concretagem ("0 Piso concreto" - Células Azuis da Planilha Modelo)
  const areaTotalRaw = parametros.areaTotal !== undefined ? String(parametros.areaTotal) : '7950';
  const espessuraCmRaw = parametros.espessuraCm !== undefined ? String(parametros.espessuraCm) : '16';
  const fctmkConcretoMpa = parametros.fctmkConcretoMpa || '4.2';

  // Telas Soldadas NBR (Células Azuis)
  const telaSuperior = parametros.telaSuperior || 'Q246';
  const multTelaSupRaw = parametros.multTelaSup !== undefined ? String(parametros.multTelaSup) : '1';
  const telaInferior = parametros.telaInferior || 'Q138';
  const multTelaInfRaw = parametros.multTelaInf !== undefined ? String(parametros.multTelaInf) : '1';

  // Caranguejos e Reforço CA-50 (Células Azuis)
  const diametroCaranguejoMm = Number(parametros.diametroCaranguejoMm) || 8;
  const compCaranguejoMRaw = parametros.compCaranguejoM !== undefined ? String(parametros.compCaranguejoM) : '1.0';
  const qtdCaranguejoUnM2Raw = parametros.qtdCaranguejoUnM2 !== undefined ? String(parametros.qtdCaranguejoUnM2) : '1.0';

  // Fibra de Aço / Polipropileno (Células Azuis)
  const consumoFibraKgM3Raw = parametros.consumoFibraKgM3 !== undefined ? String(parametros.consumoFibraKgM3) : '15.00';
  const especificacaoFibra = parametros.especificacaoFibra || 'Fibra de Aço Dramix 3D 65/35BG';

  // 2. Entrada de Dados de Juntas ("0 Planilha de juntas" - Células Azuis)
  const modulacaoL1Raw = parametros.modulacaoL1 !== undefined ? String(parametros.modulacaoL1) : '12.5';
  const modulacaoL2Raw = parametros.modulacaoL2 !== undefined ? String(parametros.modulacaoL2) : '10.0';
  const diametroBarraMm = Number(parametros.diametroBarraMm) || 25;
  const espacamentoBarraCm = Number(parametros.espacamentoBarraCm) || 30;
  const comprimentoBarraCm = Number(parametros.comprimentoBarraCm) || 50;
  const percSelantePuRaw = parametros.percSelantePu !== undefined ? String(parametros.percSelantePu) : '80';
  const percEpoxiRaw = parametros.percEpoxi !== undefined ? String(parametros.percEpoxi) : '20';

  // Lista de Insumos da Composição Orçamentária
  const resumoInsumosState: ResumoInsumoItem[] = parametros.resumoInsumos || [
    { id: '1', codigo: '1359', descricao: `Concreto fctM,k ≥ ${fctmkConcretoMpa} MPa, bombeável`, tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm³', precoUnitario: 260.00, regraCalculo: 'concreto' },
    { id: '2', codigo: '1360', descricao: 'Taxa de Bomba para Concreto', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm³', precoUnitario: 30.00, regraCalculo: 'bomba' },
    { id: '3', codigo: '738_SUP', descricao: `Tela superior: ${telaSuperior} (${multTelaSupRaw}X)`, tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'kg', precoUnitario: 4.17, regraCalculo: 'tela_sup' },
    { id: '4', codigo: '738_INF', descricao: `Tela inferior: ${telaInferior} (${multTelaInfRaw}X)`, tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'kg', precoUnitario: 4.17, regraCalculo: 'tela_inf' },
    { id: '5', codigo: '728', descricao: `Barra de transferência Ø${diametroBarraMm}mm CA-25/50`, tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'kg', precoUnitario: 3.49, regraCalculo: 'barra_transf' },
    { id: '6', codigo: '743', descricao: 'Treliça de sustentação para barra de transferência (TR 08644)', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm', precoUnitario: 3.70, regraCalculo: 'trelica' },
    { id: '7', codigo: '722', descricao: `Aço CA-50 Ø${diametroCaranguejoMm}mm para caranguejo (${qtdCaranguejoUnM2Raw} un/m²)`, tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'kg', precoUnitario: 3.49, regraCalculo: 'caranguejo' },
    { id: '8', codigo: '287', descricao: 'Mão de Obra corte, dobra e montagem de tela em aço', tipoInsumo: 'Mão de Obra', fase: 'fabricacao', unidade: 'kg', precoUnitario: 0.50, regraCalculo: 'mo_corte' },
    { id: '9', codigo: '733', descricao: `Fibra de aço ${especificacaoFibra}`, tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'kg', precoUnitario: 9.80, regraCalculo: 'fibra' },
    { id: '10', codigo: '614', descricao: 'Junta de poliuretano (PU) com primer', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm', precoUnitario: 14.00, regraCalculo: 'selante_pu' },
    { id: '11', codigo: '615', descricao: 'Tarugo delimitador de profundidade (Cordão de Polietileno 10mm)', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm', precoUnitario: 1.20, regraCalculo: 'tarugo' },
    { id: '12', codigo: '607', descricao: 'Junta de epóxi semi-rígido para tráfego pesado', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm', precoUnitario: 14.00, regraCalculo: 'junta_epoxi' },
    { id: '13', codigo: '632', descricao: 'Mão de Obra e equipamentos de nivelamento e acabamento a laser', tipoInsumo: 'Mão de Obra', fase: 'fabricacao', unidade: 'm²', precoUnitario: 9.90, regraCalculo: 'cura' },
    { id: '14', codigo: '1767', descricao: 'Lona plástica 0,15mm (sobreposição 15cm)', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm²', precoUnitario: 1.50, regraCalculo: 'lona' },
    { id: '15', codigo: '599', descricao: 'Cura química parafinada para piso', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm²', precoUnitario: 1.50, regraCalculo: 'cura' },
    { id: '16', codigo: '597', descricao: 'Líquido endurecedor de superfície base silicato de lítio', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm²', precoUnitario: 2.60, regraCalculo: 'cura' },
    { id: '17', codigo: '692', descricao: 'Agregado Mineral para camada de alta resistência', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'kg', precoUnitario: 0.30, regraCalculo: 'agregado' }
  ];

  // Modal de Busca no Banco Próprio
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Conversões numéricas das células azuis
  const areaTotal = parseFloat(areaTotalRaw.replace(',', '.')) || 0;
  const espessuraCm = parseFloat(espessuraCmRaw.replace(',', '.')) || 0;
  const espessuraM = espessuraCm / 100;
  const multTelaSup = parseFloat(multTelaSupRaw.replace(',', '.')) || 1;
  const multTelaInf = parseFloat(multTelaInfRaw.replace(',', '.')) || 1;

  const compCaranguejoM = parseFloat(compCaranguejoMRaw.replace(',', '.')) || 1.0;
  const qtdCaranguejoUnM2 = parseFloat(qtdCaranguejoUnM2Raw.replace(',', '.')) || 1.0;
  const consumoFibraKgM3 = parseFloat(consumoFibraKgM3Raw.replace(',', '.')) || 0.0;

  const modulacaoL1 = parseFloat(modulacaoL1Raw.replace(',', '.')) || 0;
  const modulacaoL2 = parseFloat(modulacaoL2Raw.replace(',', '.')) || 0;
  const percSelantePu = parseFloat(percSelantePuRaw.replace(',', '.')) || 80;
  const percEpoxi = parseFloat(percEpoxiRaw.replace(',', '.')) || 20;

  // 3. Módulo de Cálculo Geométrico Automático (Fórmulas da Planilha Modelo)
  const volumeConcretoTotal = areaTotal * espessuraM * 1.05;
  const volumeConcretoM3PorM2 = espessuraM * 1.05;

  // Juntas: Razão de Juntas (m/m²) = (L1 + L2) / (L1 * L2)
  const razaoJuntas = (modulacaoL1 > 0 && modulacaoL2 > 0)
    ? (modulacaoL1 + modulacaoL2) / (modulacaoL1 * modulacaoL2)
    : 0;

  const comprimentoLinearJuntasTotal = areaTotal * razaoJuntas;
  const metrageSelantePu = comprimentoLinearJuntasTotal * (percSelantePu / 100);
  const metrageTarugoDelimitador = metrageSelantePu; // 1:1 com o selante PU
  const metrageJuntaEpoxi = comprimentoLinearJuntasTotal * (percEpoxi / 100);

  // Telas NBR 7481
  const pesoUnitTelaSupNBR = TELAS_NBR_CATALOGO[telaSuperior]?.pesoKgM2 || 0;
  const pesoUnitTelaInfNBR = TELAS_NBR_CATALOGO[telaInferior]?.pesoKgM2 || 0;

  const coefTelaSuperior = tipoArmacao === 'tela' ? pesoUnitTelaSupNBR * 1.17 * multTelaSup : 0;
  const coefTelaInferior = tipoArmacao === 'tela' ? pesoUnitTelaInfNBR * 1.17 * multTelaInf : 0;
  const pesoTotalTelaM2 = coefTelaSuperior + coefTelaInferior;
  const pesoTotalTelasObra = areaTotal * pesoTotalTelaM2;

  // Fibra de Aço
  const coefFibraKgM2 = tipoArmacao !== 'tela' ? consumoFibraKgM3 * volumeConcretoM3PorM2 : 0;
  const pesoTotalFibraObra = areaTotal * coefFibraKgM2;

  // Barras de Transferência (Linhas 31-39 da Planilha de Juntas)
  const pesoLinearBarraKgM = BARRAS_TRANSFERENCIA_CATALOGO[diametroBarraMm] || (Math.ceil(Math.PI * Math.pow(diametroBarraMm / 2000, 2) * 7850 * 100) / 100);
  const compBarraM = comprimentoBarraCm / 100;
  const espacBarraM = espacamentoBarraCm / 100;

  // Peso Total a ser Utilizado (kg) = (Comprimento Total Juntas * Comp. Barra * Peso Linear) / Espaçamento
  const pesoTotalBarrasObra = (espacBarraM > 0)
    ? (comprimentoLinearJuntasTotal * compBarraM * pesoLinearBarraKgM) / espacBarraM
    : 0;

  // Peso por m² (kg/m²) = Peso Total / Área Total
  const coefBarraTransferencia = areaTotal > 0 ? pesoTotalBarrasObra / areaTotal : 0;

  // Treliça de Sustentação (Linhas 41-44 da Planilha de Juntas -> TR 08644 / TG 8 L = 0.735 kg/m)
  const pesoLinearTrelicaKgM = 0.735;
  // Consumo Linear (m/m²) = (2*L1 + 2*L2) / (L1 * L2) = 2 * Razão de Juntas
  const coefTrelicaLinearM2 = (modulacaoL1 > 0 && modulacaoL2 > 0) ? (2 * (modulacaoL1 + modulacaoL2)) / (modulacaoL1 * modulacaoL2) : 0;
  const coefTrelicaKgM2 = coefTrelicaLinearM2 * pesoLinearTrelicaKgM;
  const metragemTrelicaObra = areaTotal * coefTrelicaLinearM2;
  const pesoTotalTrelicaObra = areaTotal * coefTrelicaKgM2;

  // Consumo de Caranguejo CA-50 em kg/m² = (compCaranguejoM * qtdCaranguejoUnM2) * (peso linear da bitola)
  const pesoLinearCaranguejoKgM = BARRAS_TRANSFERENCIA_CATALOGO[diametroCaranguejoMm] || (Math.ceil(Math.PI * Math.pow(diametroCaranguejoMm / 2000, 2) * 7850 * 100) / 100);
  const coefCaranguejoKgM2 = compCaranguejoM * qtdCaranguejoUnM2 * pesoLinearCaranguejoKgM;

  // Busca no Banco Próprio
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

  // Helper para determinar a regra de cálculo matemática de cada insumo
  const calcularCoeficientePorRegra = (item: ResumoInsumoItem): number => {
    const regra = item.regraCalculo;
    const desc = item.descricao.toLowerCase();
    const cod = item.codigo;

    if (regra === 'concreto' || cod === '1359' || cod === '1324' || desc.includes('concreto')) {
      return espessuraM * 1.05;
    }
    if (regra === 'bomba' || cod === '1360' || desc.includes('bomba')) {
      return tipoArmacao === 'tela' ? espessuraM * 1.05 : 0;
    }
    if (regra === 'tela_sup' || cod === '738_SUP' || desc.includes('tela superior')) {
      return coefTelaSuperior;
    }
    if (regra === 'tela_inf' || cod === '738_INF' || desc.includes('tela inferior')) {
      return coefTelaInferior;
    }
    if (regra === 'fibra' || cod === '733' || desc.includes('fibra')) {
      return coefFibraKgM2;
    }
    if (regra === 'mo_corte' || cod === '287' || desc.includes('corte, dobra')) {
      return tipoArmacao === 'tela' ? pesoTotalTelaM2 : 0;
    }
    if (regra === 'barra_transf' || cod === '728' || desc.includes('barra de transfer')) {
      return coefBarraTransferencia;
    }
    if (regra === 'trelica' || cod === '743' || desc.includes('treliça')) {
      return coefTrelicaLinearM2;
    }
    if (regra === 'caranguejo' || cod === '722' || desc.includes('caranguejo')) {
      return coefCaranguejoKgM2;
    }
    if (regra === 'selante_pu' || cod === '614' || desc.includes('poliuretano') || desc.includes('selante pu')) {
      return razaoJuntas * (percSelantePu / 100);
    }
    if (regra === 'tarugo' || cod === '615' || desc.includes('tarugo') || desc.includes('cordão')) {
      return razaoJuntas * (percSelantePu / 100);
    }
    if (regra === 'junta_epoxi' || cod === '607' || desc.includes('epóxi') || desc.includes('epoxi')) {
      return razaoJuntas * (percEpoxi / 100);
    }
    if (regra === 'lona' || cod === '1767' || desc.includes('lona')) {
      return 1.10;
    }
    if (regra === 'cura' || cod === '599' || cod === '597' || cod === '632' || desc.includes('cura') || desc.includes('endurecedor') || desc.includes('nivelamento')) {
      return 1.00;
    }
    if (regra === 'agregado' || cod === '692' || desc.includes('agregado')) {
      return 4.00;
    }

    return item.taxaProdutividade ?? 1.0;
  };

  // 4. Consolidação da Lista Quantitativa de Compras e Custos
  const calcularResumoConsolidado = (): ResumoInsumoItem[] => {
    return resumoInsumosState.map((item) => {
      const coefUnitario = calcularCoeficientePorRegra(item);
      const qtdTotal = areaTotal * coefUnitario;
      const custoTotal = qtdTotal * (item.precoUnitario || 0);

      return {
        ...item,
        quantidadeTotalCalculada: Number(qtdTotal.toFixed(3)),
        coeficienteCalculado: Number(coefUnitario.toFixed(5)),
        custoTotalR$: Number(custoTotal.toFixed(2))
      };
    });
  };

  const resumoCalculadoList = calcularResumoConsolidado();
  const custoTotalPisoR$ = resumoCalculadoList.reduce((acc, i) => acc + (i.custoTotalR$ || 0), 0);
  const custoPorM2PisoR$ = areaTotal > 0 ? custoTotalPisoR$ / areaTotal : 0;

  // 5. Agrupamento dos Gastos para o Gráfico Comparativo Executivo
  const gastosCategorias = useMemo(() => {
    let concreto = 0;
    let aco = 0;
    let juntas = 0;
    let maoObra = 0;

    resumoCalculadoList.forEach(item => {
      const desc = item.descricao.toLowerCase();
      const cod = item.codigo;
      const val = item.custoTotalR$ || 0;

      if (cod === '1359' || cod === '1324' || cod === '1360' || desc.includes('concreto') || desc.includes('bomba')) {
        concreto += val;
      } else if (
        cod === '738_SUP' || cod === '738_INF' || cod === '728' || cod === '743' || cod === '722' || cod === '287' || cod === '733' ||
        desc.includes('tela') || desc.includes('barra') || desc.includes('treliça') || desc.includes('caranguejo') || desc.includes('aço') || desc.includes('fibra')
      ) {
        aco += val;
      } else if (
        cod === '614' || cod === '615' || cod === '607' || cod === '610' ||
        desc.includes('junta') || desc.includes('poliuretano') || desc.includes('tarugo') || desc.includes('epóxi') || desc.includes('selante')
      ) {
        juntas += val;
      } else {
        maoObra += val;
      }
    });

    const total = custoTotalPisoR$ > 0 ? custoTotalPisoR$ : 1;

    return {
      concreto: Math.round(concreto * 100) / 100,
      aco: Math.round(aco * 100) / 100,
      juntas: Math.round(juntas * 100) / 100,
      maoObra: Math.round(maoObra * 100) / 100,

      percConcreto: Math.round((concreto / total) * 100),
      percAco: Math.round((aco / total) * 100),
      percJuntas: Math.round((juntas / total) * 100),
      percMaoObra: Math.round((maoObra / total) * 100)
    };
  }, [resumoCalculadoList, custoTotalPisoR$]);

  useEffect(() => {
    if (areaTotal <= 0) {
      onUpdateResultados({});
      return;
    }

    const pesoAcoTotalCalculado = pesoTotalTelasObra + pesoTotalFibraObra + pesoTotalBarrasObra + pesoTotalTrelicaObra + (areaTotal * coefCaranguejoKgM2);

    onUpdateResultados({
      volumeConcretoM3: Math.round(volumeConcretoTotal * 100) / 100,
      areaFormaM2: 0,
      lastroM3: Math.round(areaTotal * 0.10 * 100) / 100,
      areaImpermeabilizacaoM2: Math.round(areaTotal * 1.10 * 100) / 100,
      comprimentoLinearM: Math.round(comprimentoLinearJuntasTotal * 100) / 100,
      pesoAcoKg: Math.round(pesoAcoTotalCalculado * 100) / 100,
      custoTotalEstimadoR$: Math.round(custoTotalPisoR$ * 100) / 100,

      detalhes: {
        'Modo do Piso': tipoArmacao === 'tela' ? 'Armação em Telas Soldadas NBR' : 'Reforço Estrutural em Fibra de Aço',
        'Área Total do Piso': `${areaTotal.toLocaleString('pt-BR')} m²`,
        'Espessura Nominal': `${espessuraCm} cm (${espessuraM.toFixed(3)} m)`,
        'fctM,k': `${fctmkConcretoMpa} MPa`,
        'Volume Concreto (5% perda)': `${volumeConcretoTotal.toFixed(2)} m³`,
        'Modulação de Placas': `${modulacaoL1}m x ${modulacaoL2}m (Razão: ${razaoJuntas.toFixed(4)} m/m²)`,
        'Comprimento Linear Juntas': `${comprimentoLinearJuntasTotal.toFixed(2)} m`,
        'Selante PU': `${metrageSelantePu.toFixed(2)} m`,
        'Tarugo Delimitador (Cordão)': `${metrageTarugoDelimitador.toFixed(2)} m`,
        'Epóxi Semi-rígido': `${metrageJuntaEpoxi.toFixed(2)} m`,
        'Barras de Transferência (Peso Total)': `${pesoTotalBarrasObra.toFixed(2)} kg (${coefBarraTransferencia.toFixed(3)} kg/m²)`,
        'Treliça de Sustentação (TR 08644)': `${metragemTrelicaObra.toFixed(2)} m (${coefTrelicaLinearM2.toFixed(3)} m/m² - ${coefTrelicaKgM2.toFixed(2)} kg/m²)`,
        'Tela Superior NBR': tipoArmacao === 'tela' ? `${TELAS_NBR_CATALOGO[telaSuperior]?.nome || telaSuperior} (${multTelaSup}X)` : 'Sem Tela (Modo Fibra)',
        'Tela Inferior NBR': tipoArmacao === 'tela' ? `${TELAS_NBR_CATALOGO[telaInferior]?.nome || telaInferior} (${multTelaInf}X)` : 'Sem Tela (Modo Fibra)',
        'Fibra de Aço (Dosagem)': tipoArmacao !== 'tela' ? `${consumoFibraKgM3} kg/m³ (${pesoTotalFibraObra.toFixed(1)} kg total)` : 'Sem Fibra (Modo Tela)',
        'Caranguejo CA-50': `Ø ${diametroCaranguejoMm}mm (${qtdCaranguejoUnM2} un/m²)`,
        'Custo Total do Piso': `R$ ${custoTotalPisoR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        'Custo por m² de Piso': `R$ ${custoPorM2PisoR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/m²`
      }
    });
  }, [
    tipoArmacao, areaTotal, espessuraCm, espessuraM, fctmkConcretoMpa, volumeConcretoTotal, modulacaoL1, modulacaoL2, razaoJuntas,
    comprimentoLinearJuntasTotal, metrageSelantePu, metrageTarugoDelimitador, metrageJuntaEpoxi, telaSuperior, multTelaSup, telaInferior, multTelaInf,
    consumoFibraKgM3, pesoTotalFibraObra, diametroBarraMm, espacamentoBarraCm, diametroCaranguejoMm, qtdCaranguejoUnM2, coefCaranguejoKgM2,
    pesoTotalTelasObra, pesoTotalBarrasObra, coefBarraTransferencia, metragemTrelicaObra, coefTrelicaLinearM2, coefTrelicaKgM2, pesoTotalTrelicaObra,
    custoTotalPisoR$, custoPorM2PisoR$
  ]);

  const updateParam = (key: string, val: any) => {
    onChangeParametros({ ...parametros, [key]: val });
  };

  const handleUpdateResumoItem = (id: string, field: keyof ResumoInsumoItem, val: any) => {
    const updated = resumoInsumosState.map(i => i.id === id ? { ...i, [field]: val } : i);
    updateParam('resumoInsumos', updated);
  };

  const handleDeleteResumoItem = (id: string) => {
    const updated = resumoInsumosState.filter(i => i.id !== id);
    updateParam('resumoInsumos', updated);
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

    updateParam('resumoInsumos', [...resumoInsumosState, newItem]);
    setIsSearchModalOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="space-y-6">
      {/* HEADER DE COMANDO & APRESENTACAO */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wider">
              Modelo de Precisão Planilha BRP
            </span>
            <span className="text-xs text-slate-500">• "Composição Piso em Concreto - Modelo.xlsx"</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Painel Paramétrico de Piso de Concreto & Juntas
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Alternância entre modo TELA (L16=1) e FIBRA DE AÇO (L16=2) com atribuição de Regra de Cálculo Paramétrica por Insumo
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-right">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Custo Total por m²</span>
            <span className="text-base font-mono font-extrabold text-slate-900">
              R$ {custoPorM2PisoR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-500">/m²</span>
            </span>
          </div>

          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xs text-right min-w-[170px]">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Custo Total da Obra</span>
            <span className="text-lg font-mono font-black text-emerald-400">
              R$ {custoTotalPisoR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* MODAL RADIO SWITCHER: TELA (L16=1) VS FIBRA DE AÇO (L16=2) */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block mb-0.5">
            Seleção do Modo de Armação (Célula L16 da Planilha Modelo)
          </span>
          <h4 className="text-sm font-bold">Defina o Tipo de Reforço Estrutural do Piso:</h4>
        </div>

        <div className="flex items-center space-x-4 bg-slate-800 p-2 rounded-xl border border-slate-700">
          <label className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${tipoArmacao === 'tela' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
            <input
              type="radio"
              name="tipoArmacao"
              value="tela"
              checked={tipoArmacao === 'tela'}
              onChange={() => updateParam('tipoArmacao', 'tela')}
              className="w-4 h-4 text-blue-500 focus:ring-blue-500 cursor-pointer"
            />
            <span>(●) ARMAÇÃO EM TELA SOLDADA</span>
          </label>

          <label className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${tipoArmacao === 'fibra_metalica' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
            <input
              type="radio"
              name="tipoArmacao"
              value="fibra_metalica"
              checked={tipoArmacao === 'fibra_metalica'}
              onChange={() => updateParam('tipoArmacao', 'fibra_metalica')}
              className="w-4 h-4 text-blue-500 focus:ring-blue-500 cursor-pointer"
            />
            <span>(●) REFORÇO EM FIBRA DE AÇO</span>
          </label>
        </div>
      </div>

      {/* AUDIT CHECKER ALERTS (Células K27, K29, K30, K31 da Planilha Modelo) */}
      {tipoArmacao === 'tela' && (pesoUnitTelaSupNBR === 0 && pesoUnitTelaInfNBR === 0) && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-2 text-xs font-bold text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>⚠️ Verificar necessidade de tela: O piso está configurado em Modo Tela, mas nenhuma tela NBR foi selecionada.</span>
        </div>
      )}

      {tipoArmacao === 'fibra_metalica' && consumoFibraKgM3 <= 0 && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-2 text-xs font-bold text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>⚠️ Informar consumo de fibra: O piso está configurado em Modo Fibra de Aço, mas o consumo (kg/m³) está zerado.</span>
        </div>
      )}

      {tipoArmacao === 'fibra_metalica' && (pesoUnitTelaSupNBR > 0 || pesoUnitTelaInfNBR > 0) && (
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold text-blue-800">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>ℹ️ Piso com Fibra de Aço ativado: Telas soldadas e mão de obra de corte/dobra foram desativadas automaticamente nas composições.</span>
        </div>
      )}

      {/* QUADRO 1: PARÂMETROS EDITÁVEIS DA PLANILHA MODELO (CÉLULAS AZUIS) */}
      <div className="bg-blue-50/40 border border-blue-200 rounded-2xl p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-blue-200 pb-3">
          <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            Parâmetros Editáveis da Concretagem & Armaduras (Aba "0 Piso Concreto")
          </h3>
          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            Valores Azuis Editáveis
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {/* fctM,k */}
          <div>
            <label className="block font-bold text-blue-900 mb-1">fctM,k do Concreto (MPa)</label>
            <input
              type="number"
              step="0.1"
              placeholder="4.2"
              value={fctmkConcretoMpa}
              onChange={(e) => updateParam('fctmkConcretoMpa', e.target.value)}
              className="w-full h-9 px-3 py-1.5 border border-blue-300 rounded-lg bg-white font-mono text-blue-700 font-black text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          {/* Espessura (m) */}
          <div>
            <label className="block font-bold text-blue-900 mb-1">Espessura (m)</label>
            <input
              type="number"
              step="0.005"
              placeholder="0.160"
              value={(espessuraM).toFixed(3)}
              onChange={(e) => updateParam('espessuraCm', Number(e.target.value) * 100)}
              className="w-full h-9 px-3 py-1.5 border border-blue-300 rounded-lg bg-white font-mono text-blue-700 font-black text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          {/* Tela Superior */}
          <div>
            <label className="block font-bold text-blue-900 mb-1">Tela Superior (NBR 7481)</label>
            <select
              value={telaSuperior}
              onChange={(e) => updateParam('telaSuperior', e.target.value)}
              disabled={tipoArmacao !== 'tela'}
              className="w-full h-9 px-2.5 py-1.5 border border-blue-300 rounded-lg bg-white font-bold text-blue-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
            >
              {Object.entries(TELAS_NBR_CATALOGO).map(([key, t]) => (
                <option key={key} value={key}>
                  {t.nome} ({t.pesoKgM2 > 0 ? `${t.pesoKgM2} kg/m²` : '-'})
                </option>
              ))}
            </select>
          </div>

          {/* Multiplicador Tela Superior */}
          <div>
            <label className="block font-bold text-blue-900 mb-1">Multiplicador Tela Superior</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                placeholder="1"
                value={multTelaSupRaw}
                onChange={(e) => updateParam('multTelaSup', e.target.value)}
                disabled={tipoArmacao !== 'tela'}
                className="w-full h-9 px-3 py-1.5 border border-blue-300 rounded-lg bg-white font-mono text-blue-700 font-black outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs disabled:bg-slate-100 disabled:text-slate-400"
              />
              <span className="font-bold text-blue-800">X</span>
            </div>
          </div>

          {/* Tela Inferior */}
          <div>
            <label className="block font-bold text-blue-900 mb-1">Tela Inferior (NBR 7481)</label>
            <select
              value={telaInferior}
              onChange={(e) => updateParam('telaInferior', e.target.value)}
              disabled={tipoArmacao !== 'tela'}
              className="w-full h-9 px-2.5 py-1.5 border border-blue-300 rounded-lg bg-white font-bold text-blue-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
            >
              {Object.entries(TELAS_NBR_CATALOGO).map(([key, t]) => (
                <option key={key} value={key}>
                  {t.nome} ({t.pesoKgM2 > 0 ? `${t.pesoKgM2} kg/m²` : '-'})
                </option>
              ))}
            </select>
          </div>

          {/* Multiplicador Tela Inferior */}
          <div>
            <label className="block font-bold text-blue-900 mb-1">Multiplicador Tela Inferior</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                placeholder="1"
                value={multTelaInfRaw}
                onChange={(e) => updateParam('multTelaInf', e.target.value)}
                disabled={tipoArmacao !== 'tela'}
                className="w-full h-9 px-3 py-1.5 border border-blue-300 rounded-lg bg-white font-mono text-blue-700 font-black outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs disabled:bg-slate-100 disabled:text-slate-400"
              />
              <span className="font-bold text-blue-800">X</span>
            </div>
          </div>

          {/* Ø Caranguejo */}
          <div>
            <label className="block font-bold text-blue-900 mb-1">Ø Caranguejo (mm)</label>
            <select
              value={diametroCaranguejoMm}
              onChange={(e) => updateParam('diametroCaranguejoMm', Number(e.target.value))}
              className="w-full h-9 px-2.5 py-1.5 border border-blue-300 rounded-lg bg-white font-bold text-blue-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
            >
              <option value={6.3}>Ø 6.3 mm</option>
              <option value={8.0}>Ø 8.0 mm</option>
              <option value={10.0}>Ø 10.0 mm</option>
              <option value={12.5}>Ø 12.5 mm</option>
            </select>
          </div>

          {/* Comprimento Caranguejo */}
          <div>
            <label className="block font-bold text-blue-900 mb-1">Comp. Caranguejo (m)</label>
            <input
              type="number"
              step="0.1"
              placeholder="1.0"
              value={compCaranguejoMRaw}
              onChange={(e) => updateParam('compCaranguejoM', e.target.value)}
              className="w-full h-9 px-3 py-1.5 border border-blue-300 rounded-lg bg-white font-mono text-blue-700 font-black outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          {/* Quantidade Caranguejo (un/m²) */}
          <div>
            <label className="block font-bold text-blue-900 mb-1">Quantidade Caranguejo (un/m²)</label>
            <input
              type="number"
              step="0.1"
              placeholder="1.0"
              value={qtdCaranguejoUnM2Raw}
              onChange={(e) => updateParam('qtdCaranguejoUnM2', e.target.value)}
              className="w-full h-9 px-3 py-1.5 border border-blue-300 rounded-lg bg-white font-mono text-blue-700 font-black outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          {/* Fibra de Aço (Consumo kg/m³) */}
          <div>
            <label className="block font-bold text-blue-900 mb-1">Fibra de Aço (Consumo kg/m³)</label>
            <input
              type="number"
              step="1"
              placeholder="15"
              value={consumoFibraKgM3Raw}
              onChange={(e) => updateParam('consumoFibraKgM3', e.target.value)}
              disabled={tipoArmacao === 'tela'}
              className="w-full h-9 px-3 py-1.5 border border-blue-300 rounded-lg bg-white font-mono text-blue-700 font-black outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs disabled:bg-slate-100 disabled:text-slate-400"
            />
          </div>

          {/* Fibra de Aço (Especificação) */}
          <div className="col-span-2">
            <label className="block font-bold text-blue-900 mb-1">Fibra de Aço (Especificação)</label>
            <input
              type="text"
              placeholder="Ex: Dramix 3D 65/35BG ou Polipropileno"
              value={especificacaoFibra}
              onChange={(e) => updateParam('especificacaoFibra', e.target.value)}
              disabled={tipoArmacao === 'tela'}
              className="w-full h-9 px-3 py-1.5 border border-blue-300 rounded-lg bg-white font-medium text-blue-900 text-xs outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs disabled:bg-slate-100 disabled:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* QUADRO 2: PARÂMETROS DE PAGINAÇÃO DE JUNTAS (ABA 02 - CÉLULAS AZUIS) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Ruler className="w-4 h-4 text-slate-700" />
            Parâmetros de Paginação & Barras de Transferência (Aba "0 Planilha de Juntas")
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Área Total do Piso (m²)</label>
            <input
              type="number"
              step="10"
              placeholder="7950"
              value={areaTotalRaw}
              onChange={(e) => updateParam('areaTotal', e.target.value)}
              className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
            />
          </div>

          <div>
            <label className="block font-bold text-blue-900 mb-1">Modulação L1 (m)</label>
            <input
              type="number"
              step="0.5"
              placeholder="12.5"
              value={modulacaoL1Raw}
              onChange={(e) => updateParam('modulacaoL1', e.target.value)}
              className="w-full h-9 px-3 py-1.5 border border-blue-300 rounded-lg bg-white font-mono text-blue-700 font-black text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="block font-bold text-blue-900 mb-1">Modulação L2 (m)</label>
            <input
              type="number"
              step="0.5"
              placeholder="10.0"
              value={modulacaoL2Raw}
              onChange={(e) => updateParam('modulacaoL2', e.target.value)}
              className="w-full h-9 px-3 py-1.5 border border-blue-300 rounded-lg bg-white font-mono text-blue-700 font-black text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Ø Barra Transferência (mm)</label>
            <select
              value={diametroBarraMm}
              onChange={(e) => updateParam('diametroBarraMm', Number(e.target.value))}
              className="w-full h-9 px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-800 outline-none focus:border-slate-700 shadow-2xs cursor-pointer text-[11px]"
            >
              <option value={12.5}>Ø 12,5 mm (0,97 kg/m)</option>
              <option value={16.0}>Ø 16,0 mm (1,58 kg/m)</option>
              <option value={20.0}>Ø 20,0 mm (2,47 kg/m)</option>
              <option value={25.0}>Ø 25,0 mm (3,86 kg/m)</option>
              <option value={32.0}>Ø 32,0 mm (6,32 kg/m)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Espaçamento Barras (cm)</label>
            <input
              type="number"
              placeholder="30"
              value={espacamentoBarraCm}
              onChange={(e) => updateParam('espacamentoBarraCm', Number(e.target.value))}
              className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-800 font-bold outline-none focus:border-slate-700 shadow-2xs"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Comprimento Barra (cm)</label>
            <input
              type="number"
              placeholder="50"
              value={comprimentoBarraCm}
              onChange={(e) => updateParam('comprimentoBarraCm', Number(e.target.value))}
              className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-800 font-bold outline-none focus:border-slate-700 shadow-2xs"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">% Juntas Selante PU</label>
            <input
              type="number"
              placeholder="80"
              value={percSelantePuRaw}
              onChange={(e) => updateParam('percSelantePu', e.target.value)}
              className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-800 font-bold outline-none focus:border-slate-700 shadow-2xs"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">% Juntas Epóxi Tráfego</label>
            <input
              type="number"
              placeholder="20"
              value={percEpoxiRaw}
              onChange={(e) => updateParam('percEpoxi', e.target.value)}
              className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-800 font-bold outline-none focus:border-slate-700 shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* QUADRO 3: MEMÓRIA DE CÁLCULO PASSO A PASSO DA ABA "0 PLANILHA DE JUNTAS" (EXATAMENTE DA IMAGEM DO EXCEL) */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 shadow-lg border border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-400" />
            Memória de Cálculo Físico da "Planilha de Juntas" (Modelagem Físico-Matemática)
          </h3>
          <span className="text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            Aba "0 Planilha de juntas"
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* CÁLCULO 1: QUANTIDADE DE JUNTAS */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">1. Quantidade de Juntas</span>
              <span className="font-mono text-[10px] text-blue-400">Linha 28-29</span>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-center">
              <span className="text-slate-300">{areaTotal.toLocaleString('pt-BR')} m²</span>
              <span className="text-slate-500 mx-1.5">X</span>
              <span className="text-blue-300">{razaoJuntas.toFixed(4)} m/m²</span>
              <span className="text-slate-500 mx-1.5">=</span>
              <span className="text-emerald-400 font-black text-sm">{comprimentoLinearJuntasTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m</span>
            </div>

            <div className="space-y-1 text-[11px] text-slate-300 pt-1">
              <div className="flex justify-between">
                <span className="text-slate-400">• Selante PU ({percSelantePu}%):</span>
                <span className="font-mono font-bold text-white">{metrageSelantePu.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">• Tarugo Delimitador (1:1):</span>
                <span className="font-mono font-bold text-white">{metrageTarugoDelimitador.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">• Junta Epóxi ({percEpoxi}%):</span>
                <span className="font-mono font-bold text-white">{metrageJuntaEpoxi.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m</span>
              </div>
            </div>
          </div>

          {/* CÁLCULO 2 & 3: BARRA DE TRANSFERÊNCIA */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">2. Barra de Transferência Ø{diametroBarraMm}mm</span>
              <span className="font-mono text-[10px] text-blue-400">Linhas 31-39</span>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-center space-y-1">
              <div className="text-[11px] text-slate-300">
                ({comprimentoLinearJuntasTotal.toFixed(0)}m × {(comprimentoBarraCm/100).toFixed(2)}m × {pesoLinearBarraKgM.toFixed(2)}kg/m) / {(espacamentoBarraCm/100).toFixed(2)}m
              </div>
              <div className="text-emerald-400 font-black text-sm">
                = {pesoTotalBarrasObra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} KG
              </div>
            </div>

            <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/60 flex items-center justify-between text-[11px] font-mono mt-2">
              <span className="text-slate-400">Consumo Unitário por m²:</span>
              <span className="font-bold text-blue-300">{coefBarraTransferencia.toFixed(3)} KG / M²</span>
            </div>
          </div>

          {/* CÁLCULO 4: TRELIÇA DE SUSTENTAÇÃO */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">3. Treliça de Sustentação (TR 08644)</span>
              <span className="font-mono text-[10px] text-blue-400">Linha 41-44</span>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-center space-y-1">
              <div className="text-[11px] text-slate-300">
                (2×{modulacaoL1} + 2×{modulacaoL2}) / ({modulacaoL1} × {modulacaoL2})
              </div>
              <div className="text-emerald-400 font-black text-sm">
                = {coefTrelicaLinearM2.toFixed(3)} m/m² <span className="text-xs text-slate-400 font-normal">({coefTrelicaKgM2.toFixed(2)} kg/m²)</span>
              </div>
            </div>

            <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/60 flex items-center justify-between text-[11px] font-mono mt-2">
              <span className="text-slate-400">Total Obra (TG 8 L - 0,735 kg/m):</span>
              <span className="font-bold text-white">{metragemTrelicaObra.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} m ({pesoTotalTrelicaObra.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} kg)</span>
            </div>
          </div>
        </div>
      </div>

      {/* DASHBOARD DE RESULTADOS E CUSTOS (CARD BENTO DE GASTOS & LISTA DE INSUMOS DO BANCO PRÓPRIO) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* CARD BENTO: Gráfico Comparativo Executivo de Gastos (Lg: 12 cols) */}
        <div className="lg:col-span-12 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-slate-700" />
                Distribuição dos Custos do Orçamento
              </h3>
              <p className="text-xs text-slate-500">Decomposição percentual dos custos calculados em tempo real</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-900 inline-block" /> Concreto ({gastosCategorias.percConcreto}%)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-600 inline-block" /> Aço / Fibra ({gastosCategorias.percAco}%)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" /> Juntas ({gastosCategorias.percJuntas}%)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-400 inline-block" /> Mão de Obra ({gastosCategorias.percMaoObra}%)</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-5 w-full bg-slate-100 rounded-xl overflow-hidden flex shadow-inner">
              <div style={{ width: `${gastosCategorias.percConcreto}%` }} className="bg-slate-900 h-full transition-all duration-500" />
              <div style={{ width: `${gastosCategorias.percAco}%` }} className="bg-slate-600 h-full transition-all duration-500" />
              <div style={{ width: `${gastosCategorias.percJuntas}%` }} className="bg-emerald-600 h-full transition-all duration-500" />
              <div style={{ width: `${gastosCategorias.percMaoObra}%` }} className="bg-slate-400 h-full transition-all duration-500" />
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
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">2. Armadura de Aço / Fibra</span>
                <span className="text-sm font-mono font-extrabold text-slate-900 block">
                  {gastosCategorias.aco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold">{gastosCategorias.percAco}% do total</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">3. Tratamento de Juntas</span>
                <span className="text-sm font-mono font-extrabold text-slate-900 block">
                  {gastosCategorias.juntas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold">{gastosCategorias.percJuntas}% do total</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">4. Mão de Obra & Serviços</span>
                <span className="text-sm font-mono font-extrabold text-slate-900 block">
                  {gastosCategorias.maoObra.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold">{gastosCategorias.percMaoObra}% do total</span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD BENTO: Lista Quantitativa de Compras Interativa com Atribuição de Regra de Cálculo Paramétrica */}
        <div className="lg:col-span-12 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs space-y-0">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-700" />
                Composição Paramétrica de Insumos (Base Própria & Atribuição de Fórmulas)
              </h3>
              <p className="text-xs text-slate-500">Atribua a cada insumo do seu banco próprio a sua Regra Paramétrica de Cálculo de coeficiente</p>
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
                  <th className="py-2.5 px-3">Descrição do Insumo / Composição</th>
                  <th className="py-2.5 px-3 w-48">Regra Paramétrica de Cálculo</th>
                  <th className="py-2.5 px-3 w-16 text-center">UN</th>
                  <th className="py-2.5 px-3 text-right w-24">Coeficiente</th>
                  <th className="py-2.5 px-3 text-right w-28">Qtd Compras</th>
                  <th className="py-2.5 px-3 text-right w-28">Preço Unit.</th>
                  <th className="py-2.5 px-3 text-right w-32">Custo Total</th>
                  <th className="py-2.5 px-3 text-center w-12">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resumoCalculadoList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{item.codigo}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{item.descricao}</td>
                    
                    {/* COLUNA DE ATRIBUIÇÃO DA REGRA DE CÁLCULO */}
                    <td className="py-2.5 px-3">
                      <select
                        value={item.regraCalculo || 'fixo'}
                        onChange={(e) => handleUpdateResumoItem(item.id, 'regraCalculo', e.target.value)}
                        className="w-full h-7 px-2 py-0.5 border border-slate-300 rounded bg-white text-[11px] font-bold text-slate-700 outline-none focus:border-slate-700 cursor-pointer"
                      >
                        <option value="concreto">🏗️ Concreto (Espessura × 1,05)</option>
                        <option value="bomba">💣 Taxa de Bomba (Modo Tela)</option>
                        <option value="tela_sup">🔳 Tela Superior NBR (Peso × 1.17)</option>
                        <option value="tela_inf">🔲 Tela Inferior NBR (Peso × 1.17)</option>
                        <option value="fibra">🌾 Fibra de Aço (Consumo kg/m³)</option>
                        <option value="mo_corte">🛠️ MO Corte/Dobra Tela</option>
                        <option value="barra_transf">🦯 Barra Transferência (Razão Juntas)</option>
                        <option value="trelica">🪜 Treliça Sustentação TR</option>
                        <option value="caranguejo">🦀 Caranguejo CA-50 (Qtd/m²)</option>
                        <option value="selante_pu">🧪 Selante PU (% Juntas)</option>
                        <option value="tarugo">🧵 Tarugo Delimitador (1:1 PU)</option>
                        <option value="junta_epoxi">🧪 Junta Epóxi Semi-rígida</option>
                        <option value="lona">📜 Lona Plástica (1.10 m²/m²)</option>
                        <option value="cura">🧴 Cura / Endurecedor / Laser</option>
                        <option value="agregado">🪨 Agregado Mineral (4.00 kg/m²)</option>
                        <option value="fixo">✏️ Coeficiente Fixo / Manual</option>
                      </select>
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-600">{item.unidade}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900">
                      {item.coeficienteCalculado?.toFixed(4)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                      {item.quantidadeTotalCalculada?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={item.precoUnitario || 0}
                        onChange={(e) => handleUpdateResumoItem(item.id, 'precoUnitario', parseFloat(e.target.value) || 0)}
                        className="w-20 h-7 text-right px-1.5 border border-slate-300 rounded bg-white font-mono font-bold text-slate-900 outline-none focus:border-slate-700"
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
                Consolidação Final do Piso
              </span>
            </div>

            <div className="flex items-center gap-6 text-right">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Custo Unitário</span>
                <span className="text-base font-mono font-extrabold text-blue-300">
                  R$ {custoPorM2PisoR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / m²
                </span>
              </div>

              <div className="h-8 w-px bg-slate-700" />

              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Custo Total Global</span>
                <span className="text-lg font-mono font-black text-emerald-400">
                  R$ {custoTotalPisoR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE BUSCA NO BANCO PRÓPRIO */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">Selecionar do Banco Próprio</h4>
                <p className="text-xs text-slate-400">Pesquise insumos ou composições exclusivamente da sua Base Própria</p>
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
