import React, { useState } from 'react';
import { Plus, Trash2, Check, HardHat, Wrench, Target } from 'lucide-react';
import { CroquiDrenagem } from './CroquiDrenagem';
import type { TargetInsumoItem } from './TabelaSapatas';
import { ItemBindingInfoEye } from './ItemBindingInfoEye';

export interface CaixaDrenagemItem {
  id: string;
  codigo: string; // ex: 'PV1-01'
  tipo: 'PVAP' | 'CIAP' | 'CX-PASS' | 'SAÍDA';
  comprimentoM: number; // 1.60
  larguraM: number; // 1.60
  cotaTerrenoM: number; // 775.12
  cotaFundoM: number; // 773.62
  profundidadeM: number; // 1.50
  quantidade: number; // 1
  espessuraBlocoM: number; // 0.14 ou 0.19
  folgaEscavacaoM: number; // 0.30
  espessuraLastroM: number; // 0.05
  espessuraLajeFundoM: number; // 0.08
  espessuraLajeTampaM: number; // 0.08
  fechamento: 'Tampão FF' | 'Tampa de conc.' | 'Grelha' | 'Aberto';
}

export interface TubulacaoDrenagemItem {
  id: string;
  trecho: string; // ex: 'Trecho 1'
  diametroMm: number; // ex: 600
  comprimentoM: number; // ex: 25.00
  cotaTerrenoInicialM: number; // 775.12
  cotaFundoInicialM: number; // 773.62
  cotaTerrenoFinalM: number; // 774.50
  cotaFundoFinalM: number; // 772.80
  profundidadeMediaM: number; // 1.60
  folgaLarguraValaM: number; // 0.60
  espessuraLastroAreiaM: number; // 0.10
}

export interface DrenagemHeaderGlobal {
  fatorEmpolamentoBotaFora: number; // 1.10
  rendimentoPedreiroBlocoHhUn: number; // 0.096 (1.26h / 13 un)
  rendimentoServenteBlocoHhUn: number; // 0.096
  consumoArgamassaAlvenariaM3Un: number; // 0.00077 m³/un
  consumoArgamassaRevestimentoM3Un: number; // 0.0015 m³/un
  consumoTelaLajesKgM3: number; // 105 kg/m³
  listaCaixas: CaixaDrenagemItem[];
  listaTubulacoes: TubulacaoDrenagemItem[];
}

interface ServicoDrenagemCalculado {
  id: string;
  itemNum: number;
  descricao: string;
  formulaLiteral: string;
  unidade: string;
  quantidadeTotal: number;
  categoria: string;
}

interface Props {
  headerGlobal: DrenagemHeaderGlobal;
  onChangeHeaderGlobal: (header: DrenagemHeaderGlobal) => void;
  parentItem?: TargetInsumoItem;
  childItems?: TargetInsumoItem[];
  onApplySelectedMetric?: (chave: string, valor: number, equacao: string, substituicao: string, targetItemId?: string) => void;
}

export const TabelaDrenagem: React.FC<Props> = ({
  headerGlobal,
  onChangeHeaderGlobal,
  parentItem,
  childItems,
  onApplySelectedMetric
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'caixas' | 'tubulacoes'>('caixas');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedTargetItemId, setSelectedTargetItemId] = useState<string>('');
  const targetList = childItems && childItems.length > 0 ? childItems : (parentItem ? [parentItem] : []);

  const caixas = headerGlobal.listaCaixas || [];
  const tubulacoes = headerGlobal.listaTubulacoes || [];
  const empolamento = headerGlobal.fatorEmpolamentoBotaFora || 1.10;

  // 1. Cálculos Consolidados para Caixas de Drenagem
  let escavCaixasM3 = 0;
  let apilCaixasM2 = 0;
  let lastroCaixasM3 = 0;
  let concLajeFundoM3 = 0;
  let concLajeTampaM3 = 0;
  let blocoConcretoUn = 0;
  let argamassaAlvenariaM3 = 0;
  let argamassaRevestimentoM3 = 0;
  let formaLajesM2 = 0;
  let telaSoldadaLajesKg = 0;
  let reaterroCaixasM3 = 0;
  let botaForaCaixasM3 = 0;
  let tampaoFFUn = 0;
  let grelhaM2 = 0;

  caixas.forEach(cx => {
    const q = cx.quantidade || 1;
    const b = cx.comprimentoM || 1.60;
    const h = cx.larguraM || 1.60;
    const prof = cx.profundidadeM || (cx.cotaTerrenoM && cx.cotaFundoM ? cx.cotaTerrenoM - cx.cotaFundoM : 1.50);
    const eB = cx.espessuraBlocoM || 0.14;
    const fLat = cx.folgaEscavacaoM || 0.30;
    const eLastro = cx.espessuraLastroM || 0.05;
    const eFundo = cx.espessuraLajeFundoM || 0.08;
    const eTampa = cx.espessuraLajeTampaM || 0.08;

    // Escavação
    const volEscav1 = (b + 2 * eB + 2 * fLat) * (h + 2 * eB + 2 * fLat) * prof;
    escavCaixasM3 += volEscav1 * q;

    // Apiloamento
    const areaApil1 = (b + 2 * eB) * (h + 2 * eB);
    apilCaixasM2 += areaApil1 * q;

    // Lastro Magro de Fundo
    const volLastro1 = areaApil1 * eLastro + (b * h) * 0.07;
    lastroCaixasM3 += volLastro1 * q;

    // Concreto Laje Fundo
    const volFundo1 = areaApil1 * eFundo;
    concLajeFundoM3 += volFundo1 * q;

    // Blocos de Concreto (13.1 un/m²)
    const perimParedes = 2 * (b + eB) + 2 * (h + eB);
    const areaParedes = perimParedes * prof;
    const blocos1 = Math.ceil(areaParedes * 13.1);
    blocoConcretoUn += blocos1 * q;

    // Argamassas
    const consAlv = eB === 0.14 ? 0.010 : 0.015;
    argamassaAlvenariaM3 += (blocos1 / 13) * consAlv * q;
    argamassaRevestimentoM3 += 2 * (blocos1 / 13) * 0.02 * q;

    // Concreto Laje Tampa (com desconto de abertura Ø60cm)
    const areaAbertura = Math.PI * Math.pow(0.60 / 2, 2);
    const volTampa1 = cx.fechamento === 'Aberto' ? 0 : Math.max(0, volFundo1 - areaAbertura * eTampa);
    concLajeTampaM3 += volTampa1 * q;

    // Fôrmas das Lajes
    const areaForma1 = perimParedes * eTampa + (cx.fechamento === 'Tampão FF' ? b * h : 0);
    formaLajesM2 += areaForma1 * q;

    // Tela Soldada (105 kg/m³)
    telaSoldadaLajesKg += 105 * (volFundo1 + volTampa1) * q;

    // Reaterro e Bota-fora
    const volCaixaBruta = (b + 2 * eB) * (h + 2 * eB) * (prof + eFundo + eTampa);
    const reaterro1 = Math.max(0, volEscav1 - volCaixaBruta);
    reaterroCaixasM3 += reaterro1 * q;
    botaForaCaixasM3 += (volEscav1 - reaterro1 * empolamento) * q;

    // Fechamentos
    if (cx.fechamento === 'Tampão FF') tampaoFFUn += q;
    if (cx.fechamento === 'Grelha') grelhaM2 += (b * h) * q;
  });

  // 2. Cálculos Consolidados para Tubulações em Vala
  let escavValasM3 = 0;
  let apilValasM2 = 0;
  let lastroAreiaTubosM3 = 0;
  let reaterroValasM3 = 0;
  let botaForaValasM3 = 0;
  const assentamentoTubosPorDiametro: Record<number, number> = {};

  tubulacoes.forEach(tub => {
    const dMm = tub.diametroMm || 600;
    const lM = tub.comprimentoM || 0;
    const profMed = tub.profundidadeMediaM || (tub.cotaTerrenoInicialM && tub.cotaFundoInicialM ? tub.cotaTerrenoInicialM - tub.cotaFundoInicialM : 1.50);
    const dM = dMm / 1000;
    const bVala = dM + (tub.folgaLarguraValaM || 0.60);
    const eLastroAreia = tub.espessuraLastroAreiaM || 0.10;

    // Escavação da Vala
    const volEscavVala1 = bVala * profMed * lM;
    escavValasM3 += volEscavVala1;

    // Apiloamento da Vala
    apilValasM2 += bVala * lM;

    // Lastro de Areia / Brita
    const volLastroVala1 = bVala * eLastroAreia * lM;
    lastroAreiaTubosM3 += volLastroVala1;

    // Assentamento do Tubo por Diâmetro
    assentamentoTubosPorDiametro[dMm] = (assentamentoTubosPorDiametro[dMm] || 0) + lM;

    // Reaterro da Vala (descontando lastro e volume do tubo)
    const volTubo1 = Math.PI * Math.pow(dM / 2, 2) * lM;
    const volReaterroVala1 = Math.max(0, volEscavVala1 - volLastroVala1 - volTubo1);
    reaterroValasM3 += volReaterroVala1;

    // Bota-fora da Vala
    botaForaValasM3 += Math.max(0, volEscavVala1 - volReaterroVala1 * empolamento);
  });

  // Mão de obra de Pedreiro e Servente para alvenaria
  const pedreiroHh = (blocoConcretoUn / 13) * 1.26;
  const serventeHh = (blocoConcretoUn / 13) * 1.26;

  // 3. Montagem da Lista de Serviços Derivados de Drenagem
  const servicosCalculados: ServicoDrenagemCalculado[] = [
    {
      id: 'd1',
      itemNum: 1,
      descricao: 'Escavação mecânica/manual para caixas de drenagem e valas',
      formulaLiteral: 'Volume Escavação Caixas + Volume Escavação Valas',
      unidade: 'm³',
      quantidadeTotal: Number((escavCaixasM3 + escavValasM3).toFixed(2)),
      categoria: 'Terraplenagem & Escavação'
    },
    {
      id: 'd2',
      itemNum: 2,
      descricao: 'Apiloamento de fundo de caixas e valas de drenagem',
      formulaLiteral: 'Área Fundo Caixas + Área Fundo Valas',
      unidade: 'm²',
      quantidadeTotal: Number((apilCaixasM2 + apilValasM2).toFixed(2)),
      categoria: 'Preparação de Base'
    },
    {
      id: 'd3',
      itemNum: 3,
      descricao: 'Lastro de concreto magro e=5cm para laje de fundo de caixas',
      formulaLiteral: 'Área Fundo Caixas × 0,05m + Enchimento Interno',
      unidade: 'm³',
      quantidadeTotal: Number(lastroCaixasM3.toFixed(2)),
      categoria: 'Concreto & Fundações'
    },
    {
      id: 'd4',
      itemNum: 4,
      descricao: 'Concreto fck ≥ 25 MPa para laje de fundo e tampa de caixas',
      formulaLiteral: 'Volume Laje Fundo + Volume Laje Tampa (c/ desconto tampão)',
      unidade: 'm³',
      quantidadeTotal: Number((concLajeFundoM3 + concLajeTampaM3).toFixed(2)),
      categoria: 'Concreto & Estrutura'
    },
    {
      id: 'd5',
      itemNum: 5,
      descricao: 'Alvenaria em bloco de concreto 14cm / 19cm para poços e caixas',
      formulaLiteral: 'Perímetro Paredes × Profundidade × 13,1 un/m²',
      unidade: 'un',
      quantidadeTotal: Number(blocoConcretoUn.toFixed(0)),
      categoria: 'Alvenaria de Caixas'
    },
    {
      id: 'd6',
      itemNum: 6,
      descricao: 'Mão de obra de Pedreiro para execução de caixas',
      formulaLiteral: '(Blocos / 13) × 1,26h por caixa',
      unidade: 'h',
      quantidadeTotal: Number(pedreiroHh.toFixed(1)),
      categoria: 'Mão de Obra'
    },
    {
      id: 'd7',
      itemNum: 7,
      descricao: 'Mão de obra de Servente para execução de caixas',
      formulaLiteral: '(Blocos / 13) × 1,26h por caixa',
      unidade: 'h',
      quantidadeTotal: Number(serventeHh.toFixed(1)),
      categoria: 'Mão de Obra'
    },
    {
      id: 'd8',
      itemNum: 8,
      descricao: 'Argamassa 1:3 para alvenaria de blocos',
      formulaLiteral: '(Blocos / 13) × 0,010 m³/un',
      unidade: 'm³',
      quantidadeTotal: Number(argamassaAlvenariaM3.toFixed(2)),
      categoria: 'Argamassas & Revestimento'
    },
    {
      id: 'd9',
      itemNum: 9,
      descricao: 'Argamassa 1:3 para revestimento interno/externo (e=2cm)',
      formulaLiteral: '2 × (Blocos / 13) × 0,02 m³/un',
      unidade: 'm³',
      quantidadeTotal: Number(argamassaRevestimentoM3.toFixed(2)),
      categoria: 'Argamassas & Revestimento'
    },
    {
      id: 'd10',
      itemNum: 10,
      descricao: 'Fôrma de madeira compensada reaproveitamento 3X para lajes',
      formulaLiteral: 'Perímetro Lajes × Espessura Laje + Área Tampa',
      unidade: 'm²',
      quantidadeTotal: Number(formaLajesM2.toFixed(2)),
      categoria: 'Fôrmas & Estruturas'
    },
    {
      id: 'd11',
      itemNum: 11,
      descricao: 'Tela soldada de aço CA-60 para armação de lajes de fundo e tampa',
      formulaLiteral: '105 kg/m³ × Volume de Concreto das Lajes',
      unidade: 'kg',
      quantidadeTotal: Number(telaSoldadaLajesKg.toFixed(2)),
      categoria: 'Armação de Aço'
    },
    {
      id: 'd12',
      itemNum: 12,
      descricao: 'Lastro de areia ou brita e=10cm para berço de tubulações',
      formulaLiteral: 'Largura Vala × 0,10m × Comprimento Tubos',
      unidade: 'm³',
      quantidadeTotal: Number(lastroAreiaTubosM3.toFixed(2)),
      categoria: 'Berço & Tubulações'
    },
    {
      id: 'd13',
      itemNum: 13,
      descricao: 'Reaterro compactado de valas e caixas com maço mecânico',
      formulaLiteral: 'Reaterro Caixas + Reaterro Valas (descontando tubo)',
      unidade: 'm³',
      quantidadeTotal: Number((reaterroCaixasM3 + reaterroValasM3).toFixed(2)),
      categoria: 'Reaterro & Compactação'
    },
    {
      id: 'd14',
      itemNum: 14,
      descricao: 'Bota-fora de solo escavado excedente com carga e transporte',
      formulaLiteral: 'Escavação Total - Reaterro Total × Empolamento (1,10)',
      unidade: 'm³',
      quantidadeTotal: Number((botaForaCaixasM3 + botaForaValasM3).toFixed(2)),
      categoria: 'Bota-fora & Logística'
    },
    {
      id: 'd15',
      itemNum: 15,
      descricao: 'Tampão de ferro fundido dúctil articulado Ø60cm',
      formulaLiteral: 'Quantidade de caixas com Fechamento = Tampão FF',
      unidade: 'un',
      quantidadeTotal: tampaoFFUn,
      categoria: 'Acessórios & Tampões'
    },
    {
      id: 'd16',
      itemNum: 16,
      descricao: 'Grelha metálica de ferro fundido para caixas de captação',
      formulaLiteral: 'Área de Abertura das Caixas com Fechamento = Grelha',
      unidade: 'm²',
      quantidadeTotal: Number(grelhaM2.toFixed(2)),
      categoria: 'Acessórios & Grelhas'
    }
  ];

  // Adiciona linhas dinâmicas de assentamento de tubo por diâmetro cadastrado
  Object.keys(assentamentoTubosPorDiametro).forEach((diamStr, idx) => {
    const dMm = parseInt(diamStr);
    const compTotal = assentamentoTubosPorDiametro[dMm];
    servicosCalculados.push({
      id: `tubo_${dMm}`,
      itemNum: 17 + idx,
      descricao: `Assentamento de tubo de concreto / PVC de drenagem Ø ${dMm} mm`,
      formulaLiteral: `Soma dos comprimentos cadastrados de tubos Ø${dMm}mm`,
      unidade: 'm',
      quantidadeTotal: Number(compTotal.toFixed(2)),
      categoria: 'Assentamento de Tubos'
    });
  });

  // Funções de Manipulação da Lista de Caixas
  const addCaixa = () => {
    const nextNum = caixas.length + 1;
    const novaCaixa: CaixaDrenagemItem = {
      id: `cx-${Date.now()}`,
      codigo: `PV1-0${nextNum}`,
      tipo: 'PVAP',
      comprimentoM: 1.60,
      larguraM: 1.60,
      cotaTerrenoM: 775.00,
      cotaFundoM: 773.50,
      profundidadeM: 1.50,
      quantidade: 1,
      espessuraBlocoM: 0.14,
      folgaEscavacaoM: 0.30,
      espessuraLastroM: 0.05,
      espessuraLajeFundoM: 0.08,
      espessuraLajeTampaM: 0.08,
      fechamento: 'Tampão FF'
    };
    onChangeHeaderGlobal({
      ...headerGlobal,
      listaCaixas: [...caixas, novaCaixa]
    });
  };

  const removeCaixa = (id: string) => {
    onChangeHeaderGlobal({
      ...headerGlobal,
      listaCaixas: caixas.filter(c => c.id !== id)
    });
  };

  const updateCaixa = (id: string, updatedFields: Partial<CaixaDrenagemItem>) => {
    onChangeHeaderGlobal({
      ...headerGlobal,
      listaCaixas: caixas.map(c => c.id === id ? { ...c, ...updatedFields } : c)
    });
  };

  // Funções de Manipulação da Lista de Tubulações
  const addTubulacao = () => {
    const nextNum = tubulacoes.length + 1;
    const novaTubulacao: TubulacaoDrenagemItem = {
      id: `tub-${Date.now()}`,
      trecho: `Trecho ${nextNum}`,
      diametroMm: 600,
      comprimentoM: 25.00,
      cotaTerrenoInicialM: 775.00,
      cotaFundoInicialM: 773.50,
      cotaTerrenoFinalM: 774.50,
      cotaFundoFinalM: 772.80,
      profundidadeMediaM: 1.60,
      folgaLarguraValaM: 0.60,
      espessuraLastroAreiaM: 0.10
    };
    onChangeHeaderGlobal({
      ...headerGlobal,
      listaTubulacoes: [...tubulacoes, novaTubulacao]
    });
  };

  const removeTubulacao = (id: string) => {
    onChangeHeaderGlobal({
      ...headerGlobal,
      listaTubulacoes: tubulacoes.filter(t => t.id !== id)
    });
  };

  const updateTubulacao = (id: string, updatedFields: Partial<TubulacaoDrenagemItem>) => {
    onChangeHeaderGlobal({
      ...headerGlobal,
      listaTubulacoes: tubulacoes.map(t => t.id === id ? { ...t, ...updatedFields } : t)
    });
  };

  return (
    <div className="space-y-4">
      {/* Croqui CAD Esquemático Integrado */}
      <CroquiDrenagem
        vistaModo={activeSubTab === 'caixas' ? 'CAIXA' : 'TUBULACAO'}
        tipoCaixa={caixas[0]?.tipo || 'PVAP'}
        larguraCaixaM={caixas[0]?.larguraM || 1.60}
        comprimentoCaixaM={caixas[0]?.comprimentoM || 1.60}
        profundidadeM={caixas[0]?.profundidadeM || 1.50}
        diametroTuboMm={tubulacoes[0]?.diametroMm || 600}
        larguraValaM={(tubulacoes[0]?.diametroMm || 600) / 1000 + 0.60}
      />

      {/* Painel de Abas Principais de Cadastro (Caixas vs Tubulações) */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <HardHat className="w-4 h-4 text-blue-600" />
            <span>Dimensionamento Paramétrico de Drenagem Pluvial (NBR 10839 / Planilha BRP)</span>
          </div>

          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300">
            <button
              type="button"
              onClick={() => setActiveSubTab('caixas')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${activeSubTab === 'caixas' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              📦 Caixas & Poços de Visita ({caixas.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('tubulacoes')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${activeSubTab === 'tubulacoes' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              🌊 Tubulações & Valas ({tubulacoes.length})
            </button>
          </div>
        </div>

        {/* SUB-ABA 1: TABELA DE CAIXAS DE DRENAGEM */}
        {activeSubTab === 'caixas' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Lista de Caixas de Drenagem, Poços de Visita (PVAP) e Inspeção (CIAP)
              </h4>
              <button
                type="button"
                onClick={addCaixa}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Caixa</span>
              </button>
            </div>

            <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-700 uppercase">
                    <th className="py-2 px-3 border-r border-slate-200">Código</th>
                    <th className="py-2 px-3 border-r border-slate-200">Tipo</th>
                    <th className="py-2 px-3 text-center border-r border-slate-200">Comp. B (m)</th>
                    <th className="py-2 px-3 text-center border-r border-slate-200">Larg. H (m)</th>
                    <th className="py-2 px-3 text-center border-r border-slate-200">Cota CT (m)</th>
                    <th className="py-2 px-3 text-center border-r border-slate-200">Cota CF (m)</th>
                    <th className="py-2 px-3 text-center border-r border-slate-200">Prof. (m)</th>
                    <th className="py-2 px-3 text-center border-r border-slate-200">Qtd (un)</th>
                    <th className="py-2 px-3 text-center border-r border-slate-200">Bloco</th>
                    <th className="py-2 px-3 border-r border-slate-200">Fechamento</th>
                    <th className="py-2 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {caixas.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-4 text-center text-slate-400 font-sans">
                        Nenhuma caixa de drenagem cadastrada. Clique em "+ Adicionar Caixa".
                      </td>
                    </tr>
                  ) : (
                    caixas.map((cx) => (
                      <tr key={cx.id} className="hover:bg-slate-50">
                        <td className="py-1.5 px-2 border-r border-slate-200">
                          <input
                            type="text"
                            value={cx.codigo}
                            onChange={(e) => updateCaixa(cx.id, { codigo: e.target.value })}
                            className="w-full px-2 py-0.5 bg-white border border-slate-300 rounded font-bold text-slate-900"
                          />
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-200 font-sans">
                          <select
                            value={cx.tipo}
                            onChange={(e) => updateCaixa(cx.id, { tipo: e.target.value as any })}
                            className="w-full px-1.5 py-0.5 bg-white border border-slate-300 rounded font-bold text-blue-700"
                          >
                            <option value="PVAP">PVAP (Poço Visita)</option>
                            <option value="CIAP">CIAP (Caixa Inspeção)</option>
                            <option value="CX-PASS">CX-PASS (Passagem)</option>
                            <option value="SAÍDA">SAÍDA (Canal)</option>
                          </select>
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-200">
                          <input
                            type="number"
                            step="0.10"
                            value={cx.comprimentoM}
                            onChange={(e) => updateCaixa(cx.id, { comprimentoM: parseFloat(e.target.value) || 0 })}
                            className="w-full text-center px-1.5 py-0.5 bg-white border border-slate-300 rounded font-bold text-slate-900"
                          />
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-200">
                          <input
                            type="number"
                            step="0.10"
                            value={cx.larguraM}
                            onChange={(e) => updateCaixa(cx.id, { larguraM: parseFloat(e.target.value) || 0 })}
                            className="w-full text-center px-1.5 py-0.5 bg-white border border-slate-300 rounded font-bold text-slate-900"
                          />
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-200">
                          <input
                            type="number"
                            step="0.01"
                            value={cx.cotaTerrenoM}
                            onChange={(e) => {
                              const ct = parseFloat(e.target.value) || 0;
                              const prof = cx.cotaFundoM ? ct - cx.cotaFundoM : cx.profundidadeM;
                              updateCaixa(cx.id, { cotaTerrenoM: ct, profundidadeM: Math.max(0.1, prof) });
                            }}
                            className="w-full text-center px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-800"
                          />
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-200">
                          <input
                            type="number"
                            step="0.01"
                            value={cx.cotaFundoM}
                            onChange={(e) => {
                              const cf = parseFloat(e.target.value) || 0;
                              const prof = cx.cotaTerrenoM ? cx.cotaTerrenoM - cf : cx.profundidadeM;
                              updateCaixa(cx.id, { cotaFundoM: cf, profundidadeM: Math.max(0.1, prof) });
                            }}
                            className="w-full text-center px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-800"
                          />
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-200 font-bold text-amber-700 text-center bg-amber-50/30">
                          {cx.profundidadeM.toFixed(2)}
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-200">
                          <input
                            type="number"
                            value={cx.quantidade}
                            onChange={(e) => updateCaixa(cx.id, { quantidade: parseInt(e.target.value) || 1 })}
                            className="w-full text-center px-1.5 py-0.5 bg-white border border-slate-300 rounded font-bold text-slate-900"
                          />
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-200 font-sans">
                          <select
                            value={cx.espessuraBlocoM}
                            onChange={(e) => updateCaixa(cx.id, { espessuraBlocoM: parseFloat(e.target.value) || 0.14 })}
                            className="w-full px-1.5 py-0.5 bg-white border border-slate-300 rounded font-bold text-slate-900"
                          >
                            <option value={0.14}>Bloco 14cm</option>
                            <option value={0.19}>Bloco 19cm</option>
                          </select>
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-200 font-sans">
                          <select
                            value={cx.fechamento}
                            onChange={(e) => updateCaixa(cx.id, { fechamento: e.target.value as any })}
                            className="w-full px-1.5 py-0.5 bg-white border border-slate-300 rounded font-bold text-slate-900"
                          >
                            <option value="Tampão FF">Tampão FF (Ø60cm)</option>
                            <option value="Tampa de conc.">Tampa Concreto</option>
                            <option value="Grelha">Grelha Metálica</option>
                            <option value="Aberto">Aberto / Canal</option>
                          </select>
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeCaixa(cx.id)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUB-ABA 2: TABELA DE TUBULAÇÕES EM VALA */}
        {activeSubTab === 'tubulacoes' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Rede de Tubulações Pluviais e Valas de Drenagem
              </h4>
              <button
                type="button"
                onClick={addTubulacao}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Trecho de Tubo</span>
              </button>
            </div>

            <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-700 uppercase">
                    <th className="py-2 px-3 border-r border-slate-200">Trecho / Identificação</th>
                    <th className="py-2 px-3 text-center border-r border-slate-200">Diâmetro Ø (mm)</th>
                    <th className="py-2 px-3 text-center border-r border-slate-200">Comprimento L (m)</th>
                    <th className="py-2 px-3 text-center border-r border-slate-200">CT Inicial (m)</th>
                    <th className="py-2 px-3 text-center border-r border-slate-200">CF Inicial (m)</th>
                    <th className="py-2 px-3 text-center border-r border-slate-200">CT Final (m)</th>
                    <th className="py-2 px-3 text-center border-r border-slate-200">CF Final (m)</th>
                    <th className="py-2 px-3 text-center border-r border-slate-200">Prof. Média (m)</th>
                    <th className="py-2 px-3 text-center border-r border-slate-200">Largura Vala (m)</th>
                    <th className="py-2 px-3 text-center border-r border-slate-200">Declividade (%)</th>
                    <th className="py-2 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {tubulacoes.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-4 text-center text-slate-400 font-sans">
                        Nenhum trecho de tubulação cadastrado. Clique em "+ Adicionar Trecho de Tubo".
                      </td>
                    </tr>
                  ) : (
                    tubulacoes.map((tub) => {
                      const decliv = tub.comprimentoM > 0 && tub.cotaFundoInicialM && tub.cotaFundoFinalM
                        ? Math.abs(tub.cotaFundoInicialM - tub.cotaFundoFinalM) / tub.comprimentoM * 100
                        : 0;
                      const largVala = tub.diametroMm / 1000 + (tub.folgaLarguraValaM || 0.60);

                      return (
                        <tr key={tub.id} className="hover:bg-slate-50">
                          <td className="py-1.5 px-2 border-r border-slate-200 font-sans font-bold">
                            <input
                              type="text"
                              value={tub.trecho}
                              onChange={(e) => updateTubulacao(tub.id, { trecho: e.target.value })}
                              className="w-full px-2 py-0.5 bg-white border border-slate-300 rounded text-slate-900"
                            />
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200 font-sans">
                            <select
                              value={tub.diametroMm}
                              onChange={(e) => updateTubulacao(tub.id, { diametroMm: parseInt(e.target.value) || 600 })}
                              className="w-full px-1.5 py-0.5 bg-white border border-slate-300 rounded font-bold text-emerald-700"
                            >
                              {[100, 150, 200, 300, 350, 400, 500, 600, 700, 800, 900, 1000, 1500].map(d => (
                                <option key={d} value={d}>Ø {d} mm</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200">
                            <input
                              type="number"
                              step="0.50"
                              value={tub.comprimentoM}
                              onChange={(e) => updateTubulacao(tub.id, { comprimentoM: parseFloat(e.target.value) || 0 })}
                              className="w-full text-center px-1.5 py-0.5 bg-white border border-slate-300 rounded font-bold text-slate-900"
                            />
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200">
                            <input
                              type="number"
                              step="0.01"
                              value={tub.cotaTerrenoInicialM}
                              onChange={(e) => updateTubulacao(tub.id, { cotaTerrenoInicialM: parseFloat(e.target.value) || 0 })}
                              className="w-full text-center px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-800"
                            />
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200">
                            <input
                              type="number"
                              step="0.01"
                              value={tub.cotaFundoInicialM}
                              onChange={(e) => updateTubulacao(tub.id, { cotaFundoInicialM: parseFloat(e.target.value) || 0 })}
                              className="w-full text-center px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-800"
                            />
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200">
                            <input
                              type="number"
                              step="0.01"
                              value={tub.cotaTerrenoFinalM}
                              onChange={(e) => updateTubulacao(tub.id, { cotaTerrenoFinalM: parseFloat(e.target.value) || 0 })}
                              className="w-full text-center px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-800"
                            />
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200">
                            <input
                              type="number"
                              step="0.01"
                              value={tub.cotaFundoFinalM}
                              onChange={(e) => updateTubulacao(tub.id, { cotaFundoFinalM: parseFloat(e.target.value) || 0 })}
                              className="w-full text-center px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-800"
                            />
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200">
                            <input
                              type="number"
                              step="0.05"
                              value={tub.profundidadeMediaM}
                              onChange={(e) => updateTubulacao(tub.id, { profundidadeMediaM: parseFloat(e.target.value) || 0 })}
                              className="w-full text-center px-1.5 py-0.5 bg-white border border-slate-300 rounded font-bold text-amber-700"
                            />
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200 text-center font-bold text-slate-700 bg-slate-100/50">
                            {largVala.toFixed(2)} m
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200 text-center font-bold text-blue-700 bg-blue-50/20">
                            {decliv.toFixed(2)} %
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeTubulacao(tub.id)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Tabela de Insumos e Serviços Derivados para Composição / Orçamento */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-xs uppercase tracking-wide text-slate-800">
              Resumo Consolidado de Serviços de Drenagem ({servicosCalculados.length} itens)
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {targetList.length > 0 && (() => {
              const currentTargetItem = selectedTargetItemId
                ? (selectedTargetItemId === parentItem?.id ? parentItem : childItems?.find(c => c.id === selectedTargetItemId))
                : parentItem;
              return (
                <div className="flex items-center gap-1.5 text-xs">
                  <Target className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="text-slate-600 font-semibold">Aplicar ao Item:</span>
                  <select
                    value={selectedTargetItemId}
                    onChange={(e) => setSelectedTargetItemId(e.target.value)}
                    className="bg-white text-slate-800 font-semibold border border-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">Item Principal Selecionado</option>
                    {targetList.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.item_eap || t.id} - {t.descricao} ({t.unidade || 'un'})
                      </option>
                    ))}
                  </select>
                  <ItemBindingInfoEye item={currentTargetItem} />
                </div>
              );
            })()}
            <span className="text-[10px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded font-mono">
              SOMA CAIXAS + VALAS DE DRENAGEM
            </span>
          </div>
        </div>

        <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-2xs">
          <table className="w-full min-w-[750px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-700 uppercase">
                <th className="py-2 px-3 border-r border-slate-200 text-center w-12">Item</th>
                <th className="py-2 px-3 border-r border-slate-200">Descrição do Serviço / Insumo</th>
                <th className="py-2 px-3 border-r border-slate-200">Categoria</th>
                <th className="py-2 px-3 text-center border-r border-slate-200">Unidade</th>
                <th className="py-2 px-3 text-right border-r border-slate-200 bg-emerald-50/50">Quantidade Total Obra</th>
                <th className="py-2 px-3 border-r border-slate-200">Fórmula de Cálculo Integrada</th>
                {onApplySelectedMetric && <th className="py-2 px-3 text-center">Vincular</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
              {servicosCalculados.map((serv) => {
                const isSelected = selectedRowId === serv.id;
                return (
                  <tr 
                    key={serv.id} 
                    className={`hover:bg-blue-50/30 transition-colors ${isSelected ? 'bg-blue-50/60 font-bold' : ''}`}
                    onClick={() => setSelectedRowId(serv.id)}
                  >
                    <td className="py-2 px-3 border-r border-slate-200 text-center font-bold text-slate-500">
                      {serv.itemNum}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 font-sans font-bold text-slate-900">
                      {serv.descricao}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 font-sans text-slate-600">
                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-slate-100 border border-slate-200 text-slate-700">
                        {serv.categoria}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center border-r border-slate-200 font-bold text-blue-700">
                      {serv.unidade}
                    </td>
                    <td className="py-2 px-3 text-right border-r border-slate-200 font-bold text-emerald-700 bg-emerald-50/20">
                      {serv.quantidadeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 font-mono text-[10px] text-slate-600 truncate max-w-xs">
                      {serv.formulaLiteral}
                    </td>
                    {onApplySelectedMetric && (
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onApplySelectedMetric(
                              serv.id,
                              serv.quantidadeTotal,
                              serv.formulaLiteral,
                              `Drenagem: ${serv.descricao} => Total: ${serv.quantidadeTotal} ${serv.unidade}`,
                              selectedTargetItemId || undefined
                            );
                          }}
                          className="px-3 py-1 bg-white hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 font-medium rounded-lg text-[11px] flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all mx-auto"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Vincular</span>
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
