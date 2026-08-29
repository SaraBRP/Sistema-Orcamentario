import React, { useState } from 'react';
import { Wrench, HardHat, Check, Target } from 'lucide-react';
import { CroquiPisoConcreto } from './CroquiPisoConcreto';
import { TELAS_SOLDADAS_MASTER, TRELICAS_MASTER, BARRAS_ACO_MASTER } from '../../data/padroesTecnicosData';
import type { TargetInsumoItem } from './TabelaSapatas';
import { ItemBindingInfoEye } from './ItemBindingInfoEye';

export interface PisoConcretoHeaderGlobal {
  fctMk: number; // 4.2 ou 4.5 MPa
  espessuraM: number; // 0.16 m (16 cm)
  modoArmacao: 'TELA' | 'FIBRA';
  telaSuperior: string; // ex: 'Q246'
  qtdTelaSuperior: number; // 1
  telaInferior: string; // ex: 'Q138'
  qtdTelaInferior: number; // 1
  diametroCaranguejoMm: number; // 8 mm
  comprimentoCaranguejoM: number; // 1.0 m
  qtdCaranguejoM2: number; // 1 un/m²
  consumoFibraKgM3: number; // 20 kg/m³
  reforcoCa50Kg: number; // 0 kg
  modulacaoLarguraM: number; // 12.5 m
  modulacaoComprimentoM: number; // 10.0 m
  percentualLabiopolimerico: number; // 0%
  percentualPoliuretano: number; // 80% (0.8)
  percentualEpoxi: number; // 20% (0.2)
  barraTransferenciaDiametroMm: number; // 25 mm
  barraTransferenciaEspacamentoCm: number; // 30 cm
  barraTransferenciaComprimentoCm: number; // 50 cm
  trelicaSustentacaoModelo: string; // 'TG 8 L'
  areaPisoTotalM2: number; // ex: 7950 m²
}

interface ComponentePisoCalculado {
  id: string;
  itemNum: number;
  descricao: string;
  formulaLiteral: string;
  unidade: string;
  coeficienteM2: number;
  quantidadeTotal: number;
  categoria: string;
}

interface Props {
  headerGlobal: PisoConcretoHeaderGlobal;
  onChangeHeaderGlobal: (header: PisoConcretoHeaderGlobal) => void;
  parentItem?: TargetInsumoItem;
  childItems?: TargetInsumoItem[];
  onApplySelectedMetric?: (chave: string, valor: number, equacao: string, substituicao: string, targetItemId?: string) => void;
}

export const TabelaPisoConcreto: React.FC<Props> = ({
  headerGlobal,
  onChangeHeaderGlobal,
  parentItem,
  childItems,
  onApplySelectedMetric
}) => {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedTargetItemId, setSelectedTargetItemId] = useState<string>('');
  const targetList = childItems && childItems.length > 0 ? childItems : (parentItem ? [parentItem] : []);

  // 1. Cálculos de Geometria & Juntas
  const areaPiso = headerGlobal.areaPisoTotalM2 > 0 ? headerGlobal.areaPisoTotalM2 : 1000;
  const modLarg = Math.max(1, headerGlobal.modulacaoLarguraM || 12.5);
  const modComp = Math.max(1, headerGlobal.modulacaoComprimentoM || 10.0);
  const areaModulo = modLarg * modComp;
  const perimetroModulo = 2 * (modLarg + modComp);

  // Extensão de juntas por m² e Total da obra
  const extensaoJuntasM2 = areaModulo > 0 ? perimetroModulo / areaModulo : 0.36;
  const extensaoJuntasTotalM = extensaoJuntasM2 * areaPiso;

  // 2. Barra de Transferência (Peso linear e Peso total)
  const diamBarra = headerGlobal.barraTransferenciaDiametroMm || 25;
  const encontrouBarra = BARRAS_ACO_MASTER.find(b => b.bitolaMm === diamBarra);
  const pesoBarraLinearKgM = encontrouBarra 
    ? encontrouBarra.pesoLinearKgM 
    : Math.ceil(Math.PI * Math.pow(diamBarra / 2000, 2) * 7850 * 100) / 100;

  const espacamentoBarraM = Math.max(0.1, (headerGlobal.barraTransferenciaEspacamentoCm || 30) / 100);
  const compBarraM = (headerGlobal.barraTransferenciaComprimentoCm || 50) / 100;
  const qtdBarrasTransferencia = extensaoJuntasTotalM / espacamentoBarraM;
  const pesoBarraTransferenciaTotalKg = qtdBarrasTransferencia * compBarraM * pesoBarraLinearKgM;
  const pesoBarraTransferenciaM2 = pesoBarraTransferenciaTotalKg / areaPiso;

  // 3. Treliça de Sustentação
  const trelicaMetrosM2 = extensaoJuntasM2 * 2;
  const trelicaMetrosTotal = trelicaMetrosM2 * areaPiso;

  // 4. Telas Superior e Inferior (Peso m² da NBR)
  const telaSupObj = TELAS_SOLDADAS_MASTER.find(t => t.codigo === headerGlobal.telaSuperior) || TELAS_SOLDADAS_MASTER.find(t => t.codigo === 'Q246');
  const telaInfObj = TELAS_SOLDADAS_MASTER.find(t => t.codigo === headerGlobal.telaInferior) || TELAS_SOLDADAS_MASTER.find(t => t.codigo === 'Q138');

  const pesoTelaSupM2 = (telaSupObj ? telaSupObj.pesoKgM2 : 3.91) * (headerGlobal.qtdTelaSuperior || 1);
  const pesoTelaInfM2 = (telaInfObj ? telaInfObj.pesoKgM2 : 2.20) * (headerGlobal.qtdTelaInferior || 1);

  const pesoTelaSupTotalKg = headerGlobal.modoArmacao === 'TELA' ? pesoTelaSupM2 * areaPiso * 1.17 : 0;
  const pesoTelaInfTotalKg = headerGlobal.modoArmacao === 'TELA' ? pesoTelaInfM2 * areaPiso * 1.17 : 0;

  // 5. Caranguejo de Apoio
  const raioCarangM = (headerGlobal.diametroCaranguejoMm || 8) / 2000;
  const pesoCarangUn = Math.ceil(Math.PI * Math.pow(raioCarangM, 2) * 7850 * 100) / 100 * (headerGlobal.comprimentoCaranguejoM || 1.0);
  const pesoCarangM2 = pesoCarangUn * (headerGlobal.qtdCaranguejoM2 || 1);
  const pesoCarangTotalKg = headerGlobal.modoArmacao === 'TELA' ? (pesoCarangM2 * areaPiso) + (headerGlobal.reforcoCa50Kg || 0) : (headerGlobal.reforcoCa50Kg || 0);

  // 6. Concreto Usinado & Fibras
  const volConcretoM3 = headerGlobal.espessuraM * 1.05 * areaPiso; // 5% perda
  const volConcretoM2 = headerGlobal.espessuraM * 1.05;

  const pesoFibraAcoTotalKg = headerGlobal.modoArmacao === 'FIBRA' ? (headerGlobal.consumoFibraKgM3 || 20) * volConcretoM3 : 0;

  // 7. Lista Consolidada de Componentes Calculados
  const componentesCalculados: ComponentePisoCalculado[] = [
    {
      id: 'c1',
      itemNum: 1,
      descricao: 'Mão de obra de corte, dobra e montagem de tela soldada',
      formulaLiteral: 'Peso Telas (Sup + Inf) com traspasso de 17%',
      unidade: 'kg',
      coeficienteM2: Number(((pesoTelaSupTotalKg + pesoTelaInfTotalKg) / areaPiso).toFixed(3)),
      quantidadeTotal: Number((pesoTelaSupTotalKg + pesoTelaInfTotalKg).toFixed(2)),
      categoria: 'Mão de Obra & Serviços'
    },
    {
      id: 'c2',
      itemNum: 2,
      descricao: 'Líquido Endurecedor de Superfície base silicato',
      formulaLiteral: '1,00 m² por m² de piso',
      unidade: 'm²',
      coeficienteM2: 1.0,
      quantidadeTotal: Number(areaPiso.toFixed(2)),
      categoria: 'Tratamento de Superfície'
    },
    {
      id: 'c3',
      itemNum: 3,
      descricao: 'Cura química para concreto',
      formulaLiteral: '1,00 m² por m² de piso',
      unidade: 'm²',
      coeficienteM2: 1.0,
      quantidadeTotal: Number(areaPiso.toFixed(2)),
      categoria: 'Tratamento de Superfície'
    },
    {
      id: 'c4',
      itemNum: 4,
      descricao: 'Junta de lábio polimérico para alta solicitação',
      formulaLiteral: `Extensão de Juntas × ${(headerGlobal.percentualLabiopolimerico || 0) * 100}%`,
      unidade: 'm',
      coeficienteM2: Number((extensaoJuntasM2 * (headerGlobal.percentualLabiopolimerico || 0)).toFixed(4)),
      quantidadeTotal: Number((extensaoJuntasTotalM * (headerGlobal.percentualLabiopolimerico || 0)).toFixed(2)),
      categoria: 'Juntas & Selantes'
    },
    {
      id: 'c5',
      itemNum: 5,
      descricao: 'Junta de Poliuretano (PU) para selamento',
      formulaLiteral: `Extensão de Juntas × ${((headerGlobal.percentualPoliuretano ?? 0.8) * 100).toFixed(0)}%`,
      unidade: 'm',
      coeficienteM2: Number((extensaoJuntasM2 * (headerGlobal.percentualPoliuretano ?? 0.8)).toFixed(4)),
      quantidadeTotal: Number((extensaoJuntasTotalM * (headerGlobal.percentualPoliuretano ?? 0.8)).toFixed(2)),
      categoria: 'Juntas & Selantes'
    },
    {
      id: 'c6',
      itemNum: 6,
      descricao: 'Junta de Epóxi Semi-Rígido',
      formulaLiteral: `Extensão de Juntas × ${((headerGlobal.percentualEpoxi ?? 0.2) * 100).toFixed(0)}%`,
      unidade: 'm',
      coeficienteM2: Number((extensaoJuntasM2 * (headerGlobal.percentualEpoxi ?? 0.2)).toFixed(4)),
      quantidadeTotal: Number((extensaoJuntasTotalM * (headerGlobal.percentualEpoxi ?? 0.2)).toFixed(2)),
      categoria: 'Juntas & Selantes'
    },
    {
      id: 'c7',
      itemNum: 7,
      descricao: 'Mão de obra e equipamentos de nivelamento / lançamento de piso',
      formulaLiteral: '1,00 m² por m² de piso',
      unidade: 'm²',
      coeficienteM2: 1.0,
      quantidadeTotal: Number(areaPiso.toFixed(2)),
      categoria: 'Mão de Obra & Serviços'
    },
    {
      id: 'c8',
      itemNum: 8,
      descricao: 'Agregado Mineral de alta resistência',
      formulaLiteral: '4,00 kg por m² de piso',
      unidade: 'kg',
      coeficienteM2: 4.0,
      quantidadeTotal: Number((areaPiso * 4.0).toFixed(2)),
      categoria: 'Insumos & Aditivos'
    },
    {
      id: 'c9',
      itemNum: 9,
      descricao: 'Aço CA-50 para Caranguejo de apoio e reforços transversais',
      formulaLiteral: headerGlobal.modoArmacao === 'TELA' ? 'Peso Caranguejo Ø8mm + Reforço CA-50' : 'Reforço Adicional CA-50',
      unidade: 'kg',
      coeficienteM2: Number((pesoCarangTotalKg / areaPiso).toFixed(4)),
      quantidadeTotal: Number(pesoCarangTotalKg.toFixed(2)),
      categoria: 'Armação de Aço'
    },
    {
      id: 'c10',
      itemNum: 10,
      descricao: `Barra de Transferência Ø${diamBarra}mm (Comprimento ${headerGlobal.barraTransferenciaComprimentoCm || 50}cm)`,
      formulaLiteral: '(Extensão Juntas / Espaçamento) × Comprimento × Peso/m',
      unidade: 'kg',
      coeficienteM2: Number(pesoBarraTransferenciaM2.toFixed(4)),
      quantidadeTotal: Number(pesoBarraTransferenciaTotalKg.toFixed(2)),
      categoria: 'Armação & Transferência'
    },
    {
      id: 'c11',
      itemNum: 11,
      descricao: `Fibra de Aço de Alta Performance (${headerGlobal.consumoFibraKgM3 || 20} kg/m³)`,
      formulaLiteral: headerGlobal.modoArmacao === 'FIBRA' ? 'Consumo Fibra (kg/m³) × Vol. Concreto' : '0 (Piso Armado com Tela)',
      unidade: 'kg',
      coeficienteM2: Number((pesoFibraAcoTotalKg / areaPiso).toFixed(4)),
      quantidadeTotal: Number(pesoFibraAcoTotalKg.toFixed(2)),
      categoria: 'Armação & Fibras'
    },
    {
      id: 'c12',
      itemNum: 12,
      descricao: `Tela Superior Soldada CA-60 (${headerGlobal.telaSuperior || 'Q246'})`,
      formulaLiteral: headerGlobal.modoArmacao === 'TELA' ? 'Peso NBR × AreaPiso × 1,17 (traspasso)' : '0 (Piso Armado com Fibra)',
      unidade: 'kg',
      coeficienteM2: Number((pesoTelaSupTotalKg / areaPiso).toFixed(4)),
      quantidadeTotal: Number(pesoTelaSupTotalKg.toFixed(2)),
      categoria: 'Armação de Aço'
    },
    {
      id: 'c13',
      itemNum: 13,
      descricao: `Tela Inferior Soldada CA-60 (${headerGlobal.telaInferior || 'Q138'})`,
      formulaLiteral: headerGlobal.modoArmacao === 'TELA' ? 'Peso NBR × AreaPiso × 1,17 (traspasso)' : '0 (Piso Armado com Fibra)',
      unidade: 'kg',
      coeficienteM2: Number((pesoTelaInfTotalKg / areaPiso).toFixed(4)),
      quantidadeTotal: Number(pesoTelaInfTotalKg.toFixed(2)),
      categoria: 'Armação de Aço'
    },
    {
      id: 'c14',
      itemNum: 14,
      descricao: `Treliça de Sustentação Modelo ${headerGlobal.trelicaSustentacaoModelo || 'TG 8 L'}`,
      formulaLiteral: 'Extensão de Juntas (m) × 2,0',
      unidade: 'm',
      coeficienteM2: Number(trelicaMetrosM2.toFixed(4)),
      quantidadeTotal: Number(trelicaMetrosTotal.toFixed(2)),
      categoria: 'Suportes & Treliças'
    },
    {
      id: 'c15',
      itemNum: 15,
      descricao: `Concreto Usinado fctM,k ≥ ${headerGlobal.fctMk || 4.2} MPa (fck ≥ 30 MPa) com 5% de perda`,
      formulaLiteral: 'Espessura (m) × 1,05 × AreaPiso',
      unidade: 'm³',
      coeficienteM2: Number(volConcretoM2.toFixed(4)),
      quantidadeTotal: Number(volConcretoM3.toFixed(2)),
      categoria: 'Concreto Usinado'
    },
    {
      id: 'c16',
      itemNum: 16,
      descricao: 'Taxa de Bombeamento de Concreto',
      formulaLiteral: headerGlobal.modoArmacao === 'TELA' ? 'Volume de Concreto Usinado' : '0 (Lançamento Direto com Fibra)',
      unidade: 'm³',
      coeficienteM2: Number((headerGlobal.modoArmacao === 'TELA' ? volConcretoM2 : 0).toFixed(4)),
      quantidadeTotal: Number((headerGlobal.modoArmacao === 'TELA' ? volConcretoM3 : 0).toFixed(2)),
      categoria: 'Equipamentos & Lançamento'
    },
    {
      id: 'c17',
      itemNum: 17,
      descricao: 'Lona Plástica 0,15mm para impermeabilização de base (10% sobreposição)',
      formulaLiteral: '1,10 m² por m² de piso',
      unidade: 'm²',
      coeficienteM2: 1.10,
      quantidadeTotal: Number((areaPiso * 1.10).toFixed(2)),
      categoria: 'Impermeabilização & Base'
    },
    {
      id: 'c18',
      itemNum: 18,
      descricao: 'Placa de EPS / Isopor e=1cm para junta perimetral',
      formulaLiteral: '0,05 m² por m² de piso',
      unidade: 'm²',
      coeficienteM2: 0.05,
      quantidadeTotal: Number((areaPiso * 0.05).toFixed(2)),
      categoria: 'Juntas & Isolação'
    },
    {
      id: 'c19',
      itemNum: 19,
      descricao: 'Fibra de Polipropileno Monofilamento para combate à retração',
      formulaLiteral: '0,60 kg/m³ × Volume de Concreto',
      unidade: 'kg',
      coeficienteM2: Number(((volConcretoM3 * 0.60) / areaPiso).toFixed(4)),
      quantidadeTotal: Number((volConcretoM3 * 0.60).toFixed(2)),
      categoria: 'Fibras & Aditivos'
    },
    {
      id: 'c20',
      itemNum: 20,
      descricao: 'Espaçador de Plástico para posicionamento da armação',
      formulaLiteral: headerGlobal.modoArmacao === 'TELA' ? '1,00 m² por m² de piso' : '0 (Piso com Fibra)',
      unidade: 'm²',
      coeficienteM2: headerGlobal.modoArmacao === 'TELA' ? 1.0 : 0,
      quantidadeTotal: headerGlobal.modoArmacao === 'TELA' ? Number(areaPiso.toFixed(2)) : 0,
      categoria: 'Acessórios & Apoios'
    },
    {
      id: 'c21',
      itemNum: 21,
      descricao: 'Graxa desmoldante para Barra de Transferência',
      formulaLiteral: '0,005 kg por m² de piso',
      unidade: 'kg',
      coeficienteM2: 0.005,
      quantidadeTotal: Number((areaPiso * 0.005).toFixed(2)),
      categoria: 'Insumos & Auxiliares'
    }
  ];

  return (
    <div className="space-y-4">
      {/* SEÇÃO INTEGRADA: PARÂMETROS À ESQUERDA + CROQUI À DIREITA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        {/* Painel Global de Parâmetros de Projeto (ESQUERDA) */}
        <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/80 pb-2 gap-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <HardHat className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Parâmetros de Projeto - Piso</span>
              </div>

              {/* Seletor do Modo de Armação */}
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-300">
                <button
                  type="button"
                  onClick={() => onChangeHeaderGlobal({ ...headerGlobal, modoArmacao: 'TELA' })}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${headerGlobal.modoArmacao === 'TELA' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Tela
                </button>
                <button
                  type="button"
                  onClick={() => onChangeHeaderGlobal({ ...headerGlobal, modoArmacao: 'FIBRA' })}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${headerGlobal.modoArmacao === 'FIBRA' ? 'bg-purple-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Fibra
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block">Área Total (m²)</label>
                <input
                  type="number"
                  value={headerGlobal.areaPisoTotalM2}
                  onChange={(e) => onChangeHeaderGlobal({ ...headerGlobal, areaPisoTotalM2: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 block">Espessura h (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={headerGlobal.espessuraM}
                  onChange={(e) => onChangeHeaderGlobal({ ...headerGlobal, espessuraM: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 block">fctM,k (MPa)</label>
                <select
                  value={headerGlobal.fctMk}
                  onChange={(e) => onChangeHeaderGlobal({ ...headerGlobal, fctMk: parseFloat(e.target.value) || 4.2 })}
                  className="w-full mt-1 px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 outline-none focus:border-blue-500"
                >
                  <option value={4.2}>4.2 MPa (fck 30)</option>
                  <option value={4.5}>4.5 MPa (fck 35)</option>
                </select>
              </div>

              {headerGlobal.modoArmacao === 'TELA' ? (
                <>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block">Tela Sup. (CA-60)</label>
                    <select
                      value={headerGlobal.telaSuperior}
                      onChange={(e) => onChangeHeaderGlobal({ ...headerGlobal, telaSuperior: e.target.value })}
                      className="w-full mt-1 px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-blue-700 outline-none focus:border-blue-500"
                    >
                      {TELAS_SOLDADAS_MASTER.map(t => (
                        <option key={t.id} value={t.codigo}>{t.codigo} ({t.pesoKgM2}kg)</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block">Tela Inf. (CA-60)</label>
                    <select
                      value={headerGlobal.telaInferior}
                      onChange={(e) => onChangeHeaderGlobal({ ...headerGlobal, telaInferior: e.target.value })}
                      className="w-full mt-1 px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-blue-700 outline-none focus:border-blue-500"
                    >
                      {TELAS_SOLDADAS_MASTER.map(t => (
                        <option key={t.id} value={t.codigo}>{t.codigo} ({t.pesoKgM2}kg)</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block">Reforço CA-50 (kg)</label>
                    <input
                      type="number"
                      value={headerGlobal.reforcoCa50Kg}
                      onChange={(e) => onChangeHeaderGlobal({ ...headerGlobal, reforcoCa50Kg: parseFloat(e.target.value) || 0 })}
                      className="w-full mt-1 px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block">Fibra (kg/m³)</label>
                    <input
                      type="number"
                      value={headerGlobal.consumoFibraKgM3}
                      onChange={(e) => onChangeHeaderGlobal({ ...headerGlobal, consumoFibraKgM3: parseFloat(e.target.value) || 0 })}
                      className="w-full mt-1 px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-purple-700 outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block">Reforço CA-50 (kg)</label>
                    <input
                      type="number"
                      value={headerGlobal.reforcoCa50Kg}
                      onChange={(e) => onChangeHeaderGlobal({ ...headerGlobal, reforcoCa50Kg: parseFloat(e.target.value) || 0 })}
                      className="w-full mt-1 px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Croqui CAD Esquemático Integrado (DIREITA) */}
        <div className="lg:col-span-7">
          <CroquiPisoConcreto
            modoArmacao={headerGlobal.modoArmacao}
            espessuraM={headerGlobal.espessuraM}
            telaSuperior={headerGlobal.telaSuperior}
            telaInferior={headerGlobal.telaInferior}
            consumoFibraKgM3={headerGlobal.consumoFibraKgM3}
          />
        </div>
      </div>

      {/* Painel Específico de Parametrização & Dimensionamento de Juntas (Planilha de Juntas Oficial) */}
      <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <span className="text-amber-600 font-extrabold text-sm">📐</span>
            <span>Planilha de Juntas - Dimensionamento de Transferência & Selamento</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs">
            <span>Extensão Total:</span>
            <span className="text-blue-700">{extensaoJuntasM2.toFixed(2)} m/m²</span>
            <span className="text-slate-400">|</span>
            <span className="text-emerald-700">{extensaoJuntasTotalM.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3 text-xs">
          {/* Modulação das Placas */}
          <div>
            <label className="text-[10px] font-semibold text-slate-600 block">Modulação Módulo W x L (m)</label>
            <div className="flex items-center gap-1 mt-1">
              <input
                type="number"
                step="0.5"
                value={headerGlobal.modulacaoLarguraM}
                onChange={(e) => onChangeHeaderGlobal({ ...headerGlobal, modulacaoLarguraM: parseFloat(e.target.value) || 0 })}
                className="w-1/2 px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-center outline-none focus:border-amber-500"
                placeholder="W (m)"
              />
              <span className="text-slate-400 font-bold">x</span>
              <input
                type="number"
                step="0.5"
                value={headerGlobal.modulacaoComprimentoM}
                onChange={(e) => onChangeHeaderGlobal({ ...headerGlobal, modulacaoComprimentoM: parseFloat(e.target.value) || 0 })}
                className="w-1/2 px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-center outline-none focus:border-amber-500"
                placeholder="L (m)"
              />
            </div>
          </div>

          {/* Barra de Transferência - Bitola */}
          <div>
            <label className="text-[10px] font-semibold text-slate-600 block">Barra Transferência Ø (mm)</label>
            <select
              value={headerGlobal.barraTransferenciaDiametroMm}
              onChange={(e) => onChangeHeaderGlobal({ ...headerGlobal, barraTransferenciaDiametroMm: parseInt(e.target.value) || 25 })}
              className="w-full mt-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 outline-none focus:border-amber-500"
            >
              {BARRAS_ACO_MASTER.map(b => (
                <option key={b.id} value={b.bitolaMm}>Ø {b.bitolaMm} mm ({b.pesoLinearKgM} kg/m)</option>
              ))}
            </select>
          </div>

          {/* Barra de Transferência - Espaçamento */}
          <div>
            <label className="text-[10px] font-semibold text-slate-600 block">Espaçamento Barras (cm)</label>
            <input
              type="number"
              step="5"
              value={headerGlobal.barraTransferenciaEspacamentoCm}
              onChange={(e) => onChangeHeaderGlobal({ ...headerGlobal, barraTransferenciaEspacamentoCm: parseFloat(e.target.value) || 30 })}
              className="w-full mt-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 outline-none focus:border-amber-500"
            />
          </div>

          {/* Barra de Transferência - Comprimento */}
          <div>
            <label className="text-[10px] font-semibold text-slate-600 block">Comprimento Barra (cm)</label>
            <input
              type="number"
              step="5"
              value={headerGlobal.barraTransferenciaComprimentoCm}
              onChange={(e) => onChangeHeaderGlobal({ ...headerGlobal, barraTransferenciaComprimentoCm: parseFloat(e.target.value) || 50 })}
              className="w-full mt-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 outline-none focus:border-amber-500"
            />
          </div>

          {/* Treliça de Sustentação */}
          <div>
            <label className="text-[10px] font-semibold text-slate-600 block">Treliça Sustentação</label>
            <select
              value={headerGlobal.trelicaSustentacaoModelo}
              onChange={(e) => onChangeHeaderGlobal({ ...headerGlobal, trelicaSustentacaoModelo: e.target.value })}
              className="w-full mt-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 outline-none focus:border-amber-500"
            >
              {TRELICAS_MASTER.map(t => (
                <option key={t.id} value={t.codigoGerdau}>{t.codigoGerdau} ({t.pesoLinearKgM} kg/m)</option>
              ))}
            </select>
          </div>

          {/* % Lábio Polimérico */}
          <div>
            <label className="text-[10px] font-semibold text-slate-600 block">% Lábio Polimérico</label>
            <input
              type="number"
              step="5"
              value={Math.round((headerGlobal.percentualLabiopolimerico || 0) * 100)}
              onChange={(e) => {
                const percLab = (parseFloat(e.target.value) || 0) / 100;
                onChangeHeaderGlobal({ 
                  ...headerGlobal, 
                  percentualLabiopolimerico: percLab
                });
              }}
              className="w-full mt-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-emerald-700 outline-none focus:border-amber-500"
              placeholder="% Lábio"
            />
          </div>

          {/* % Poliuretano (PU) / Epóxi */}
          <div>
            <label className="text-[10px] font-semibold text-slate-600 block">% Selamento PU / Epóxi</label>
            <div className="flex items-center gap-1 mt-1">
              <input
                type="number"
                step="5"
                value={Math.round((headerGlobal.percentualPoliuretano ?? 0.8) * 100)}
                onChange={(e) => {
                  const percPu = (parseFloat(e.target.value) || 0) / 100;
                  onChangeHeaderGlobal({ 
                    ...headerGlobal, 
                    percentualPoliuretano: percPu
                  });
                }}
                className="w-1/2 px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-blue-700 text-center outline-none focus:border-amber-500"
                placeholder="% PU"
              />
              <span className="text-slate-400 font-bold">/</span>
              <input
                type="number"
                step="5"
                value={Math.round((headerGlobal.percentualEpoxi ?? 0.2) * 100)}
                onChange={(e) => {
                  const percEpoxi = (parseFloat(e.target.value) || 0) / 100;
                  onChangeHeaderGlobal({ 
                    ...headerGlobal, 
                    percentualEpoxi: percEpoxi
                  });
                }}
                className="w-1/2 px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-amber-700 text-center outline-none focus:border-amber-500"
                placeholder="% Epóxi"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Insumos e Componentes Derivados para Composição */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-3 bg-slate-100 border-b border-slate-200 text-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-xs uppercase tracking-wide text-slate-800">
              Componentes & Variáveis Derivadas do Piso de Concreto ({componentesCalculados.length} itens)
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
            <span className="text-[10px] text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded font-mono font-bold">
              {headerGlobal.modoArmacao === 'TELA' ? 'PISO COM TELA SOLDADA' : 'PISO COM FIBRA DE AÇO'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-2xs">
          <table className="w-full min-w-[750px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-700 uppercase">
                <th className="py-2 px-3 border-r border-slate-200 text-center w-12">Item</th>
                <th className="py-2 px-3 border-r border-slate-200">Descrição do Componente / Insumo</th>
                <th className="py-2 px-3 border-r border-slate-200">Categoria</th>
                <th className="py-2 px-3 text-center border-r border-slate-200">Unidade</th>
                <th className="py-2 px-3 text-right border-r border-slate-200 bg-blue-50/50">Coeficiente (por m²)</th>
                <th className="py-2 px-3 text-right border-r border-slate-200 bg-emerald-50/50">Quantidade Total Obra</th>
                <th className="py-2 px-3 border-r border-slate-200">Fórmula de Cálculo</th>
                {onApplySelectedMetric && <th className="py-2 px-3 text-center">Vincular</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
              {componentesCalculados.map((comp) => {
                const isSelected = selectedRowId === comp.id;
                return (
                  <tr 
                    key={comp.id} 
                    className={`hover:bg-blue-50/30 transition-colors ${isSelected ? 'bg-blue-50/60 font-bold' : ''}`}
                    onClick={() => setSelectedRowId(comp.id)}
                  >
                    <td className="py-2 px-3 border-r border-slate-200 text-center font-bold text-slate-500">
                      {comp.itemNum}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 font-sans font-bold text-slate-900">
                      {comp.descricao}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 font-sans text-slate-600">
                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-slate-100 border border-slate-200 text-slate-700">
                        {comp.categoria}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center border-r border-slate-200 font-bold text-blue-700">
                      {comp.unidade}
                    </td>
                    <td className="py-2 px-3 text-right border-r border-slate-200 font-bold text-blue-900 bg-blue-50/20">
                      {comp.coeficienteM2.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 4 })}
                    </td>
                    <td className="py-2 px-3 text-right border-r border-slate-200 font-bold text-emerald-700 bg-emerald-50/20">
                      {comp.quantidadeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 font-mono text-[10px] text-slate-600 truncate max-w-xs">
                      {comp.formulaLiteral}
                    </td>
                    {onApplySelectedMetric && (
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onApplySelectedMetric(
                              comp.id,
                              comp.quantidadeTotal,
                              comp.formulaLiteral,
                              `Componente Piso: ${comp.descricao} => Coef: ${comp.coeficienteM2} ${comp.unidade}/m²`,
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
