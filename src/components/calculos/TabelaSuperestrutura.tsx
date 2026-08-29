import React, { useState } from 'react';
import { Plus, Trash2, Check, HardHat, Wrench, Target } from 'lucide-react';
import { CroquiSuperestrutura } from './CroquiSuperestrutura';
import type { TargetInsumoItem } from './TabelaSapatas';
import { ItemBindingInfoEye } from './ItemBindingInfoEye';

export interface PecaSuperestruturaItem {
  id: string;
  predio: string; // ex: 'DC', 'ADM', 'EXTERNA'
  nomePeca: string; // ex: 'PILAR', 'VIGA', 'LAJE', 'PILAR CIRCULAR'
  numPavimentos: number; // ex: 1
  numEdificacoes: number; // ex: 1
  tipoPeca: 'P' | 'V' | 'L' | 'PC'; // P=Pilar, V=Viga, L=Laje, PC=Pilar Circular
  modalidade: 'IN_LOCO' | 'PRE_MOLDADO';
  codigoEstrutural: string; // ex: 'PL', 'VL', 'LL', 'PP', 'VP', 'LP', 'PLC', 'CUB'
  larguraM: number; // G (0.50m)
  alturaM: number; // H (1.30m ou 10.0m)
  comprimentoM: number; // I (18.00m)
  quantidadePavimento: number; // J (9 un)
  descontoEspessuraLajeM: number; // K (0.00m)
  descontoFormaM2: number; // M (0.00m²)
  descontoConcretoM3: number; // O (0.00m³)
  taxaAcoKgM3: number; // Q (100 kg/m³)
  peDireitoCimbramentoM: number; // S (4.00m)
}

export interface SuperestruturaHeaderGlobal {
  taxaAcoPadraoKgM3: number; // 100
  peDireitoPadraoM: number; // 4.0
  listaPecas: PecaSuperestruturaItem[];
}

interface ServicoSuperestruturaCalculado {
  id: string;
  itemNum: number;
  descricao: string;
  formulaLiteral: string;
  unidade: string;
  quantidadeTotal: number;
  categoria: string;
}

interface Props {
  headerGlobal: SuperestruturaHeaderGlobal;
  onChangeHeaderGlobal: (header: SuperestruturaHeaderGlobal) => void;
  parentItem?: TargetInsumoItem;
  childItems?: TargetInsumoItem[];
  onApplySelectedMetric?: (chave: string, valor: number, equacao: string, substituicao: string, targetItemId?: string) => void;
}

export const TabelaSuperestrutura: React.FC<Props> = ({
  headerGlobal,
  onChangeHeaderGlobal,
  parentItem,
  childItems,
  onApplySelectedMetric
}) => {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedTargetItemId, setSelectedTargetItemId] = useState<string>('');
  const pecas = headerGlobal.listaPecas || [];
  const targetList = childItems && childItems.length > 0 ? childItems : (parentItem ? [parentItem] : []);

  // 1. Cálculos Consolidados para In-Loco vs Pré-Moldado
  let formaInLocoM2 = 0;
  let concInLocoM3 = 0;
  let acoInLocoKg = 0;
  let pecasInLocoUn = 0;
  let cimbramentoInLocoM3 = 0;

  let formaPreMoldM2 = 0;
  let concPreMoldM3 = 0;
  let acoPreMoldKg = 0;
  let pecasPreMoldUn = 0;

  pecas.forEach(p => {
    const rep = (p.numPavimentos || 1) * (p.numEdificacoes || 1);
    const q = p.quantidadePavimento || 1;
    const g = p.larguraM || 0;
    const h = p.alturaM || 0;
    const i = p.comprimentoM || 0;
    const k = p.descontoEspessuraLajeM || 0;
    const descForma = p.descontoFormaM2 || 0;
    const descConc = p.descontoConcretoM3 || 0;
    const txAco = p.taxaAcoKgM3 || 100;
    const peDireito = p.peDireitoCimbramentoM || 0;

    // Perímetro Molhado
    let perimForma = 0;
    if (p.tipoPeca === 'V') {
      perimForma = (h * 2) + g - k;
    } else if (p.tipoPeca === 'P') {
      perimForma = (g + i) * 2;
    } else if (p.tipoPeca === 'PC') {
      perimForma = Math.PI * g;
    } else {
      perimForma = 0; // Laje
    }

    // Área de Fôrma (m²)
    let areaForma1 = 0;
    if (p.tipoPeca === 'V') {
      areaForma1 = ((i * perimForma) - descForma) * q;
    } else if (p.tipoPeca === 'P') {
      areaForma1 = ((h * perimForma) - descForma) * q;
    } else if (p.tipoPeca === 'PC') {
      areaForma1 = ((perimForma * h) - descForma) * q;
    } else {
      // Laje
      areaForma1 = ((g * i) - descForma) * q;
    }
    const areaFormaTotal = Math.max(0, areaForma1 * rep);

    // Volume de Concreto (m³)
    let volConc1 = 0;
    if (p.tipoPeca === 'PC') {
      volConc1 = Math.max(0, (Math.PI * Math.pow(g, 2) / 4) * h * q - descConc * q);
    } else {
      volConc1 = Math.max(0, (g * h * i - descConc) * q);
    }
    const volConcTotal = Number((volConc1 * rep).toFixed(2));

    // Aço (kg)
    const pesoAcoTotal = Number((volConcTotal * txAco).toFixed(2));

    // Quantidade de Peças (un)
    const totalPecasUn = q * rep;

    // Cimbramento (m³)
    let cimb1 = 0;
    if (p.tipoPeca === 'L') {
      cimb1 = g * i * q * peDireito * rep;
    } else if (p.tipoPeca === 'V') {
      cimb1 = i * q * (g + 1.20) * peDireito * rep;
    }

    if (p.modalidade === 'IN_LOCO') {
      formaInLocoM2 += areaFormaTotal;
      concInLocoM3 += volConcTotal;
      acoInLocoKg += pesoAcoTotal;
      pecasInLocoUn += totalPecasUn;
      cimbramentoInLocoM3 += cimb1;
    } else {
      formaPreMoldM2 += areaFormaTotal;
      concPreMoldM3 += volConcTotal;
      acoPreMoldKg += pesoAcoTotal;
      pecasPreMoldUn += totalPecasUn;
    }
  });

  // 2. Lista Consolidada de Serviços de Superestrutura
  const servicosCalculados: ServicoSuperestruturaCalculado[] = [
    {
      id: 'sup1',
      itemNum: 1,
      descricao: 'Concreto Armado Usinado fck ≥ 30 MPa - Estrutura Moldada In-Loco',
      formulaLiteral: 'Soma dos volumes de Concreto de Pilares, Vigas e Lajes In-Loco',
      unidade: 'm³',
      quantidadeTotal: Number(concInLocoM3.toFixed(2)),
      categoria: 'Estrutura In-Loco'
    },
    {
      id: 'sup2',
      itemNum: 2,
      descricao: 'Fôrma de Madeira Compensada Plastificada 3X - Estrutura In-Loco',
      formulaLiteral: 'Soma das áreas de Fôrma de Pilares, Vigas e Lajes In-Loco',
      unidade: 'm²',
      quantidadeTotal: Number(formaInLocoM2.toFixed(2)),
      categoria: 'Estrutura In-Loco'
    },
    {
      id: 'sup3',
      itemNum: 3,
      descricao: 'Aço CA-50 / CA-60 Cortado e Dobrado - Estrutura In-Loco',
      formulaLiteral: 'Volume de Concreto In-Loco × Taxa de Aço (kg/m³)',
      unidade: 'kg',
      quantidadeTotal: Number(acoInLocoKg.toFixed(2)),
      categoria: 'Estrutura In-Loco'
    },
    {
      id: 'sup4',
      itemNum: 4,
      descricao: 'Cimbramento e Escoramento Tubular de Vigas e Lajes In-Loco',
      formulaLiteral: 'Volume de Cimbramento (Área Lajes/Vigas × Pé Direito)',
      unidade: 'm³',
      quantidadeTotal: Number(cimbramentoInLocoM3.toFixed(2)),
      categoria: 'Escoramento & Apoio'
    },
    {
      id: 'sup5',
      itemNum: 5,
      descricao: 'Concreto para Peças Pré-Moldadas (Pilares, Vigas e Lajes Alveolares)',
      formulaLiteral: 'Soma dos volumes de Concreto de Peças Pré-Moldadas',
      unidade: 'm³',
      quantidadeTotal: Number(concPreMoldM3.toFixed(2)),
      categoria: 'Estrutura Pré-Moldada'
    },
    {
      id: 'sup6',
      itemNum: 6,
      descricao: 'Fôrma de Fábrica / Fôrma Metálica - Estrutura Pré-Moldada',
      formulaLiteral: 'Soma das áreas de Fôrma das Peças Pré-Moldadas',
      unidade: 'm²',
      quantidadeTotal: Number(formaPreMoldM2.toFixed(2)),
      categoria: 'Estrutura Pré-Moldada'
    },
    {
      id: 'sup7',
      itemNum: 7,
      descricao: 'Aço CA-50 / CP-190 Protendido - Estrutura Pré-Moldada',
      formulaLiteral: 'Volume de Concreto Pré-Moldado × Taxa de Aço (kg/m³)',
      unidade: 'kg',
      quantidadeTotal: Number(acoPreMoldKg.toFixed(2)),
      categoria: 'Estrutura Pré-Moldada'
    },
    {
      id: 'sup8',
      itemNum: 8,
      descricao: 'Total de Peças Pré-Moldadas Fabricadas e Montadas',
      formulaLiteral: 'Soma da quantidade de peças pré-moldadas na obra',
      unidade: 'un',
      quantidadeTotal: pecasPreMoldUn,
      categoria: 'Peças & Montagem'
    }
  ];

  // Funções de Edição da Lista
  const addPeca = () => {
    const nextNum = pecas.length + 1;
    const novaPeca: PecaSuperestruturaItem = {
      id: `peca-${Date.now()}`,
      predio: 'DC',
      nomePeca: `VIGA ${nextNum}`,
      numPavimentos: 1,
      numEdificacoes: 1,
      tipoPeca: 'V',
      modalidade: 'IN_LOCO',
      codigoEstrutural: 'VL',
      larguraM: 0.50,
      alturaM: 1.30,
      comprimentoM: 18.00,
      quantidadePavimento: 1,
      descontoEspessuraLajeM: 0.00,
      descontoFormaM2: 0.00,
      descontoConcretoM3: 0.00,
      taxaAcoKgM3: 100,
      peDireitoCimbramentoM: 4.00
    };
    onChangeHeaderGlobal({
      ...headerGlobal,
      listaPecas: [...pecas, novaPeca]
    });
  };

  const removePeca = (id: string) => {
    onChangeHeaderGlobal({
      ...headerGlobal,
      listaPecas: pecas.filter(p => p.id !== id)
    });
  };

  const updatePeca = (id: string, updatedFields: Partial<PecaSuperestruturaItem>) => {
    onChangeHeaderGlobal({
      ...headerGlobal,
      listaPecas: pecas.map(p => p.id === id ? { ...p, ...updatedFields } : p)
    });
  };

  return (
    <div className="space-y-4">
      {/* Croqui CAD Esquemático Integrado */}
      <CroquiSuperestrutura
        larguraVigaM={pecas[0]?.larguraM || 0.50}
        alturaVigaM={pecas[0]?.alturaM || 1.30}
        larguraPilarM={pecas[0]?.tipoPeca === 'P' ? pecas[0]?.larguraM : 0.50}
        alturaPilarM={pecas[0]?.alturaM || 10.0}
        espessuraLajeM={pecas[0]?.tipoPeca === 'L' ? pecas[0]?.larguraM : 0.15}
        peDireitoM={pecas[0]?.peDireitoCimbramentoM || 4.0}
        tipoPilar={pecas[0]?.tipoPeca === 'PC' ? 'CIRCULAR' : 'RETANGULAR'}
      />

      {/* Tabela de Levantamento de Peças de Superestrutura */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <HardHat className="w-4 h-4 text-indigo-600" />
            <span>Medição Paramétrica de Superestrutura (In-Loco / Pré-Moldado - Modelo BRP)</span>
          </div>

          <button
            type="button"
            onClick={addPeca}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Peça Estrutural</span>
          </button>
        </div>

        <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-700 uppercase">
                <th className="py-2 px-2 border-r border-slate-200">Prédio / Célula</th>
                <th className="py-2 px-2 border-r border-slate-200">Nome Peça</th>
                <th className="py-2 px-2 border-r border-slate-200">Modalidade</th>
                <th className="py-2 px-2 border-r border-slate-200">Tipo</th>
                <th className="py-2 px-2 text-center border-r border-slate-200">Larg B (m)</th>
                <th className="py-2 px-2 text-center border-r border-slate-200">Alt H (m)</th>
                <th className="py-2 px-2 text-center border-r border-slate-200">Comp L (m)</th>
                <th className="py-2 px-2 text-center border-r border-slate-200">Qtd / Pav</th>
                <th className="py-2 px-2 text-center border-r border-slate-200">Pav / Edif</th>
                <th className="py-2 px-2 text-center border-r border-slate-200">Fôrma (m²)</th>
                <th className="py-2 px-2 text-center border-r border-slate-200">Conc (m³)</th>
                <th className="py-2 px-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
              {pecas.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-4 text-center text-slate-400 font-sans">
                    Nenhuma peça de superestrutura cadastrada. Clique em "+ Adicionar Peça Estrutural".
                  </td>
                </tr>
              ) : (
                pecas.map((p) => {
                  const rep = (p.numPavimentos || 1) * (p.numEdificacoes || 1);
                  const q = p.quantidadePavimento || 1;
                  const g = p.larguraM || 0;
                  const h = p.alturaM || 0;
                  const i = p.comprimentoM || 0;
                  const k = p.descontoEspessuraLajeM || 0;
                  const descForma = p.descontoFormaM2 || 0;
                  const descConc = p.descontoConcretoM3 || 0;

                  let perimForma = 0;
                  if (p.tipoPeca === 'V') perimForma = (h * 2) + g - k;
                  else if (p.tipoPeca === 'P') perimForma = (g + i) * 2;
                  else if (p.tipoPeca === 'PC') perimForma = Math.PI * g;

                  let areaForma1 = 0;
                  if (p.tipoPeca === 'V') areaForma1 = ((i * perimForma) - descForma) * q;
                  else if (p.tipoPeca === 'P') areaForma1 = ((h * perimForma) - descForma) * q;
                  else if (p.tipoPeca === 'PC') areaForma1 = ((perimForma * h) - descForma) * q;
                  else areaForma1 = ((g * i) - descForma) * q;

                  const calcFormaM2 = Math.max(0, areaForma1 * rep);

                  let volConc1 = 0;
                  if (p.tipoPeca === 'PC') volConc1 = Math.max(0, (Math.PI * Math.pow(g, 2) / 4) * h * q - descConc * q);
                  else volConc1 = Math.max(0, (g * h * i - descConc) * q);

                  const calcConcM3 = volConc1 * rep;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-1.5 px-2 border-r border-slate-200 font-sans">
                        <input
                          type="text"
                          value={p.predio}
                          onChange={(e) => updatePeca(p.id, { predio: e.target.value })}
                          className="w-full px-1.5 py-0.5 bg-white border border-slate-300 rounded font-bold text-slate-800"
                        />
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-200 font-sans font-bold">
                        <input
                          type="text"
                          value={p.nomePeca}
                          onChange={(e) => updatePeca(p.id, { nomePeca: e.target.value })}
                          className="w-full px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-900"
                        />
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-200 font-sans">
                        <select
                          value={p.modalidade}
                          onChange={(e) => updatePeca(p.id, { modalidade: e.target.value as any })}
                          className="w-full px-1 py-0.5 bg-white border border-slate-300 rounded font-bold text-indigo-700 text-[10px]"
                        >
                          <option value="IN_LOCO">In-Loco</option>
                          <option value="PRE_MOLDADO">Pré-Moldado</option>
                        </select>
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-200 font-sans">
                        <select
                          value={p.tipoPeca}
                          onChange={(e) => {
                            const tp = e.target.value as any;
                            const cod = p.modalidade === 'PRE_MOLDADO' ? (tp === 'V' ? 'VP' : tp === 'P' ? 'PP' : 'LP') : (tp === 'V' ? 'VL' : tp === 'P' ? 'PL' : 'LL');
                            updatePeca(p.id, { tipoPeca: tp, codigoEstrutural: cod });
                          }}
                          className="w-full px-1 py-0.5 bg-white border border-slate-300 rounded font-bold text-slate-800 text-[10px]"
                        >
                          <option value="V">Viga (V)</option>
                          <option value="P">Pilar (P)</option>
                          <option value="PC">Pilar Circ. (PC)</option>
                          <option value="L">Laje (L)</option>
                        </select>
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-200">
                        <input
                          type="number"
                          step="0.05"
                          value={p.larguraM}
                          onChange={(e) => updatePeca(p.id, { larguraM: parseFloat(e.target.value) || 0 })}
                          className="w-full text-center px-1 py-0.5 bg-white border border-slate-300 rounded font-bold text-slate-900"
                        />
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-200">
                        <input
                          type="number"
                          step="0.10"
                          value={p.alturaM}
                          onChange={(e) => updatePeca(p.id, { alturaM: parseFloat(e.target.value) || 0 })}
                          className="w-full text-center px-1 py-0.5 bg-white border border-slate-300 rounded font-bold text-amber-700"
                        />
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-200">
                        <input
                          type="number"
                          step="0.50"
                          value={p.comprimentoM}
                          onChange={(e) => updatePeca(p.id, { comprimentoM: parseFloat(e.target.value) || 0 })}
                          className="w-full text-center px-1 py-0.5 bg-white border border-slate-300 rounded font-bold text-slate-900"
                        />
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-200">
                        <input
                          type="number"
                          value={p.quantidadePavimento}
                          onChange={(e) => updatePeca(p.id, { quantidadePavimento: parseInt(e.target.value) || 1 })}
                          className="w-full text-center px-1 py-0.5 bg-white border border-slate-300 rounded font-bold text-slate-900"
                        />
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-200 text-center font-bold text-slate-600 bg-slate-100/40">
                        {rep} un
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-200 text-center font-bold text-blue-700 bg-blue-50/20">
                        {calcFormaM2.toFixed(1)}
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-200 text-center font-bold text-emerald-700 bg-emerald-50/20">
                        {calcConcM3.toFixed(1)}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => removePeca(p.id)}
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

      {/* Tabela de Insumos e Serviços Derivados para Composição / Orçamento */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-3 bg-slate-100 border-b border-slate-200 text-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-xs uppercase tracking-wide text-slate-800">
              Resumo Consolidado de Superestrutura ({servicosCalculados.length} itens)
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
              SOMA ESTRUTURA IN-LOCO + PRÉ-MOLDADO
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
                    className={`hover:bg-indigo-50/30 transition-colors ${isSelected ? 'bg-indigo-50/60 font-bold' : ''}`}
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
                    <td className="py-2 px-3 text-center border-r border-slate-200 font-bold text-indigo-700">
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
                              `Superestrutura: ${serv.descricao} => Total: ${serv.quantidadeTotal} ${serv.unidade}`,
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
