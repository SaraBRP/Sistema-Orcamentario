import React, { useState } from 'react';
import { Plus, Trash2, Check, HardHat, Wrench, Target } from 'lucide-react';
import { CroquiPitsReservatorios } from './CroquiPitsReservatorios';
import type { TargetInsumoItem } from './TabelaSapatas';
import { ItemBindingInfoEye } from './ItemBindingInfoEye';

export interface PitReservatorioItem {
  id: string;
  nomeCaixa: string; // ex: 'Caixa 1'
  numeroCaixas: number; // cx (ex: 1)
  numeroCelulas: number; // n_celulas (ex: 1)
  comprimentoInternoM: number; // Pint1 (ex: 22.00m)
  larguraInternaM: number; // Pint2 (ex: 17.50m)
  alturaInternaM: number; // Hint (ex: 2.45m)
  alturaLivreM: number; // 0.00m
  espessuraParedeM: number; // ep (ex: 0.15m)
  espessuraLajeInfM: number; // Linf (ex: 0.15m)
  espessuraLajeSupM: number; // Lsup (ex: 0.15m)
  numDivisoria: number; // Pdiv (ex: 1 = sem divisória, 2 = 1 parede divisória)
  espessuraDivisoriaM: number; // epdiv (ex: 0.15m)
  chanfroM: number; // cf (ex: 0.00m)
  taxaAcoKgM3: number; // tx_aço (ex: 150 ou 110 kg/m³)
  fatorEmpolamento: number; // 1.20
  espessuraLastroM: number; // 0.05m
  isImpermeabilizado: boolean; // Sim=Acumulação, Não=Retardo
}

export interface PitsReservatoriosHeaderGlobal {
  folgaEscavacaoLateralM: number; // Pext1 / 3
  fatorEmpolamentoPadrao: number; // 1.20
  taxaAcoPadraoKgM3: number; // 150
  espessuraLastroMagroM: number; // 0.05
  listaPits: PitReservatorioItem[];
}

interface ServicoPitCalculado {
  id: string;
  itemNum: number;
  descricao: string;
  formulaLiteral: string;
  unidade: string;
  quantidadeTotal: number;
  categoria: string;
}

interface Props {
  headerGlobal: PitsReservatoriosHeaderGlobal;
  onChangeHeaderGlobal: (header: PitsReservatoriosHeaderGlobal) => void;
  parentItem?: TargetInsumoItem;
  childItems?: TargetInsumoItem[];
  onApplySelectedMetric?: (chave: string, valor: number, equacao: string, substituicao: string, targetItemId?: string) => void;
}

export const TabelaPitsReservatorios: React.FC<Props> = ({
  headerGlobal,
  onChangeHeaderGlobal,
  parentItem,
  childItems,
  onApplySelectedMetric
}) => {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedTargetItemId, setSelectedTargetItemId] = useState<string>('');
  const pits = headerGlobal.listaPits || [];
  const targetList = childItems && childItems.length > 0 ? childItems : (parentItem ? [parentItem] : []);

  // 1. Cálculos Consolidados para Reservatórios / PITs / Túneis
  let volAguaTotalM3 = 0;
  let concParedesM3 = 0;
  let concDivisoriaM3 = 0;
  let concLajeInfM3 = 0;
  let concLajeSupM3 = 0;

  let formaParedesM2 = 0;
  let formaDivisoriaM2 = 0;
  let formaLajeInfM2 = 0;
  let formaLajeSupM2 = 0;

  let acoParedesKg = 0;
  let acoDivisoriaKg = 0;
  let acoLajeInfKg = 0;
  let acoLajeSupKg = 0;

  let cimbramentoM3 = 0;
  let lastroMagroM3 = 0;
  let escavacaoM3 = 0;
  let apiloamentoM2 = 0;
  let reaterroM3 = 0;
  let botaForaM3 = 0;
  let impermeabilizacaoM2 = 0;

  pits.forEach(pit => {
    const cx = pit.numeroCaixas || 1;
    const pint1 = pit.comprimentoInternoM || 22.00;
    const pint2 = pit.larguraInternaM || 17.50;
    const hint = pit.alturaInternaM || 2.45;
    const hUtil = Math.max(0.1, hint - (pit.alturaLivreM || 0));
    const ep = pit.espessuraParedeM || 0.15;
    const linf = pit.espessuraLajeInfM || 0.15;
    const lsup = pit.espessuraLajeSupM || 0.15;
    const epdiv = pit.espessuraDivisoriaM || 0.15;
    const pdiv = Math.max(1, pit.numDivisoria || 1);
    const cf = pit.chanfroM || 0;
    const txAco = pit.taxaAcoKgM3 || 150;
    const emp = pit.fatorEmpolamento || 1.20;
    const eLastro = pit.espessuraLastroM || 0.05;

    const pext1 = pint1 + 2 * ep;
    const pext2 = pint2 + 2 * ep;
    const hext = hint + linf + lsup;

    // Volume Útil de Água (m³)
    const volAgua1 = (pint1 * pint2 - Math.pow(cf, 2) * 2) * hUtil - ((pint2 * 2 + pint1 * 2) * Math.pow(cf, 2) / 2) - pint1 * epdiv * hUtil * (pdiv - 1);
    volAguaTotalM3 += volAgua1 * cx;

    // Paredes Perimetrais
    const volConcParedes1 = ((pint1 + pint2) * 2 * ep + Math.pow(ep, 2) * 4 + Math.pow(cf, 2) * 2) * hint + (pint1 + pint2) * Math.pow(cf, 2);
    const areaFormaParedes1 = (pint1 + pint2) * 2 * hint + (pext1 + pext2) * 2 * (hext - linf);
    concParedesM3 += volConcParedes1 * cx;
    formaParedesM2 += areaFormaParedes1 * cx;
    acoParedesKg += volConcParedes1 * txAco * cx;

    // Paredes Divisórias Internas
    const volConcDiv1 = (pint1 * hint * epdiv + Math.pow(cf, 2) * 2 * hint) * (pdiv - 1);
    const areaFormaDiv1 = pint1 * hint * 2 * (pdiv - 1);
    concDivisoriaM3 += volConcDiv1 * cx;
    formaDivisoriaM2 += areaFormaDiv1 * cx;
    acoDivisoriaKg += volConcDiv1 * txAco * cx;

    // Laje Inferior / Fundo
    const volConcInf1 = pext1 * pext2 * linf;
    const areaFormaInf1 = (pext1 + pext2) * 2 * linf;
    concLajeInfM3 += volConcInf1 * cx;
    formaLajeInfM2 += areaFormaInf1 * cx;
    acoLajeInfKg += volConcInf1 * txAco * cx;

    // Laje Superior / Tampa
    const volConcSup1 = pext1 * pext2 * lsup;
    const areaFormaSup1 = lsup > 0 ? pint1 * pint2 : 0;
    const cimbramento1 = areaFormaSup1 * hint;
    concLajeSupM3 += volConcSup1 * cx;
    formaLajeSupM2 += areaFormaSup1 * cx;
    acoLajeSupKg += volConcSup1 * txAco * cx;
    cimbramentoM3 += cimbramento1 * cx;

    // Geotecnia & Terraplenagem
    const escavLat = pext1 / 3;
    const lastro1 = (pext1 * pext2) * eLastro;
    const volBrutoBox = pext1 * pext2 * (hext + eLastro);
    const volEscav1 = (pext1 + escavLat) * (pext2 + escavLat) * (hext + eLastro);
    const apil1 = pext1 * pext2;
    const reaterro1 = Math.max(0, volEscav1 - volBrutoBox);
    const botaFora1 = Math.max(0, volEscav1 - reaterro1 * emp);

    lastroMagroM3 += lastro1 * cx;
    escavacaoM3 += volEscav1 * cx;
    apiloamentoM2 += apil1 * cx;
    reaterroM3 += reaterro1 * cx;
    botaForaM3 += botaFora1 * cx;

    // Impermeabilização (se ativada)
    if (pit.isImpermeabilizado) {
      const areaImper1 = (pint1 + pint2) * 2 * hint + (pint1 * pint2) + areaFormaDiv1;
      impermeabilizacaoM2 += areaImper1 * cx;
    }
  });

  const concEstruturalTotalM3 = concParedesM3 + concDivisoriaM3 + concLajeInfM3 + concLajeSupM3;
  const formaEstruturalTotalM2 = formaParedesM2 + formaDivisoriaM2 + formaLajeInfM2 + formaLajeSupM2;
  const acoEstruturalTotalKg = acoParedesKg + acoDivisoriaKg + acoLajeInfKg + acoLajeSupKg;

  // 2. Montagem da Lista Consolidada de Serviços Calculados
  const servicosCalculados: ServicoPitCalculado[] = [
    {
      id: 'pit1',
      itemNum: 1,
      descricao: 'Volume Útil Total de Água / Capacidade de Armazenamento',
      formulaLiteral: 'Σ (Pint1 × Pint2 - Chanfros) × Altura Útil',
      unidade: 'm³',
      quantidadeTotal: Number(volAguaTotalM3.toFixed(2)),
      categoria: 'Capacidade & Geometria'
    },
    {
      id: 'pit2',
      itemNum: 2,
      descricao: 'Concreto Armado Estrutural fck ≥ 30 MPa (Paredes, Lajes e Divisórias)',
      formulaLiteral: 'Volume Paredes + Divisórias + Laje Inferior + Laje Superior',
      unidade: 'm³',
      quantidadeTotal: Number(concEstruturalTotalM3.toFixed(2)),
      categoria: 'Concreto Estrutural'
    },
    {
      id: 'pit3',
      itemNum: 3,
      descricao: 'Fôrma de Madeira Compensada Plastificada / Resonada (3X uso)',
      formulaLiteral: 'Área Fôrma Paredes Internas/Externas + Divisórias + Lajes',
      unidade: 'm²',
      quantidadeTotal: Number(formaEstruturalTotalM2.toFixed(2)),
      categoria: 'Fôrmas & Escoramento'
    },
    {
      id: 'pit4',
      itemNum: 4,
      descricao: 'Aço CA-50/CA-60 Cortado, Dobrado e Armado (Taxa Média Paramétrica)',
      formulaLiteral: 'Volume Total de Concreto Estrutural × Taxa de Aço (kg/m³)',
      unidade: 'kg',
      quantidadeTotal: Number(acoEstruturalTotalKg.toFixed(2)),
      categoria: 'Armação de Aço'
    },
    {
      id: 'pit5',
      itemNum: 5,
      descricao: 'Cimbramento e Escoramento Tubular de Laje Superior',
      formulaLiteral: 'Área da Laje Superior × Altura Interna',
      unidade: 'm³',
      quantidadeTotal: Number(cimbramentoM3.toFixed(2)),
      categoria: 'Escoramento & Apoio'
    },
    {
      id: 'pit6',
      itemNum: 6,
      descricao: 'Lastro de Concreto Magro e=5cm para regularização de fundo',
      formulaLiteral: 'Área Externa (Pext1 × Pext2) × 0,05m',
      unidade: 'm³',
      quantidadeTotal: Number(lastroMagroM3.toFixed(2)),
      categoria: 'Preparação de Base'
    },
    {
      id: 'pit7',
      itemNum: 7,
      descricao: 'Escavação Mecânica/Manual de solo com folga lateral',
      formulaLiteral: '(Pext1 + EscavLat) × (Pext2 + EscavLat) × Hext',
      unidade: 'm³',
      quantidadeTotal: Number(escavacaoM3.toFixed(2)),
      categoria: 'Terraplenagem & Escavação'
    },
    {
      id: 'pit8',
      itemNum: 8,
      descricao: 'Apiloamento e compactação mecânica do fundo de escavação',
      formulaLiteral: 'Área Externa da Base (Pext1 × Pext2)',
      unidade: 'm²',
      quantidadeTotal: Number(apiloamentoM2.toFixed(2)),
      categoria: 'Preparação de Base'
    },
    {
      id: 'pit9',
      itemNum: 9,
      descricao: 'Reaterro compactado lateral com maço mecânico em camadas',
      formulaLiteral: 'Volume Escavação - Volume Bruto da Caixa',
      unidade: 'm³',
      quantidadeTotal: Number(reaterroM3.toFixed(2)),
      categoria: 'Reaterro & Logística'
    },
    {
      id: 'pit10',
      itemNum: 10,
      descricao: 'Bota-fora de solo escavado excedente (Índice Empolamento 1,20)',
      formulaLiteral: 'Escavação Total - Reaterro Total × Empolamento (1,20)',
      unidade: 'm³',
      quantidadeTotal: Number(botaForaM3.toFixed(2)),
      categoria: 'Bota-fora & Logística'
    },
    {
      id: 'pit11',
      itemNum: 11,
      descricao: 'Impermeabilização flexível em manta asfáltica / argamassa polimérica',
      formulaLiteral: 'Área Molhada Interna (Paredes + Fundo + Divisórias)',
      unidade: 'm²',
      quantidadeTotal: Number(impermeabilizacaoM2.toFixed(2)),
      categoria: 'Impermeabilização & Isolação'
    }
  ];

  // Manipulação da Lista de PITs / Reservatórios
  const addPit = () => {
    const nextNum = pits.length + 1;
    const novoPit: PitReservatorioItem = {
      id: `pit-${Date.now()}`,
      nomeCaixa: `Caixa ${nextNum}`,
      numeroCaixas: 1,
      numeroCelulas: 1,
      comprimentoInternoM: 22.00,
      larguraInternaM: 17.50,
      alturaInternaM: 2.45,
      alturaLivreM: 0.00,
      espessuraParedeM: 0.15,
      espessuraLajeInfM: 0.15,
      espessuraLajeSupM: 0.15,
      numDivisoria: 1,
      espessuraDivisoriaM: 0.15,
      chanfroM: 0.00,
      taxaAcoKgM3: 150,
      fatorEmpolamento: 1.20,
      espessuraLastroM: 0.05,
      isImpermeabilizado: true
    };
    onChangeHeaderGlobal({
      ...headerGlobal,
      listaPits: [...pits, novoPit]
    });
  };

  const removePit = (id: string) => {
    onChangeHeaderGlobal({
      ...headerGlobal,
      listaPits: pits.filter(p => p.id !== id)
    });
  };

  const updatePit = (id: string, updatedFields: Partial<PitReservatorioItem>) => {
    onChangeHeaderGlobal({
      ...headerGlobal,
      listaPits: pits.map(p => p.id === id ? { ...p, ...updatedFields } : p)
    });
  };

  return (
    <div className="space-y-4">
      {/* Croqui CAD Esquemático Integrado */}
      <CroquiPitsReservatorios
        comprimentoM={pits[0]?.comprimentoInternoM || 22.00}
        larguraM={pits[0]?.larguraInternaM || 17.50}
        alturaM={pits[0]?.alturaInternaM || 2.45}
        espessuraParedeM={pits[0]?.espessuraParedeM || 0.15}
        espessuraLajeInfM={pits[0]?.espessuraLajeInfM || 0.15}
        espessuraLajeSupM={pits[0]?.espessuraLajeSupM || 0.15}
        numDivisoria={(pits[0]?.numDivisoria || 1) - 1}
        isImpermeabilizado={pits[0]?.isImpermeabilizado ?? true}
      />

      {/* Tabela de Cadastro e Edição de Reservatórios / PITs */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <HardHat className="w-4 h-4 text-cyan-600" />
            <span>Dimensionamento de Reservatórios, PITs Industriais e Túneis (Modelo BRP)</span>
          </div>

          <button
            type="button"
            onClick={addPit}
            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Reservatório / PIT</span>
          </button>
        </div>

        <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-700 uppercase">
                <th className="py-2 px-2 border-r border-slate-200">Identificação</th>
                <th className="py-2 px-2 text-center border-r border-slate-200">Qtd (cx)</th>
                <th className="py-2 px-2 text-center border-r border-slate-200">Comp. Pint1 (m)</th>
                <th className="py-2 px-2 text-center border-r border-slate-200">Larg. Pint2 (m)</th>
                <th className="py-2 px-2 text-center border-r border-slate-200">Alt. Hint (m)</th>
                <th className="py-2 px-2 text-center border-r border-slate-200">Parede ep (m)</th>
                <th className="py-2 px-2 text-center border-r border-slate-200">Laje Inf (m)</th>
                <th className="py-2 px-2 text-center border-r border-slate-200">Laje Sup (m)</th>
                <th className="py-2 px-2 text-center border-r border-slate-200">Taxa Aço (kg/m³)</th>
                <th className="py-2 px-2 text-center border-r border-slate-200">Impermeabilizar</th>
                <th className="py-2 px-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
              {pits.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-4 text-center text-slate-400 font-sans">
                    Nenhum reservatório / PIT cadastrado. Clique em "+ Adicionar Reservatório / PIT".
                  </td>
                </tr>
              ) : (
                pits.map((pit) => (
                  <tr key={pit.id} className="hover:bg-slate-50">
                    <td className="py-1.5 px-2 border-r border-slate-200 font-sans font-bold">
                      <input
                        type="text"
                        value={pit.nomeCaixa}
                        onChange={(e) => updatePit(pit.id, { nomeCaixa: e.target.value })}
                        className="w-full px-2 py-0.5 bg-white border border-slate-300 rounded text-slate-900"
                      />
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-200">
                      <input
                        type="number"
                        value={pit.numeroCaixas}
                        onChange={(e) => updatePit(pit.id, { numeroCaixas: parseInt(e.target.value) || 1 })}
                        className="w-full text-center px-1.5 py-0.5 bg-white border border-slate-300 rounded font-bold text-slate-900"
                      />
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-200">
                      <input
                        type="number"
                        step="0.50"
                        value={pit.comprimentoInternoM}
                        onChange={(e) => updatePit(pit.id, { comprimentoInternoM: parseFloat(e.target.value) || 0 })}
                        className="w-full text-center px-1.5 py-0.5 bg-white border border-slate-300 rounded font-bold text-slate-900"
                      />
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-200">
                      <input
                        type="number"
                        step="0.50"
                        value={pit.larguraInternaM}
                        onChange={(e) => updatePit(pit.id, { larguraInternaM: parseFloat(e.target.value) || 0 })}
                        className="w-full text-center px-1.5 py-0.5 bg-white border border-slate-300 rounded font-bold text-slate-900"
                      />
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-200">
                      <input
                        type="number"
                        step="0.10"
                        value={pit.alturaInternaM}
                        onChange={(e) => updatePit(pit.id, { alturaInternaM: parseFloat(e.target.value) || 0 })}
                        className="w-full text-center px-1.5 py-0.5 bg-white border border-slate-300 rounded font-bold text-amber-700"
                      />
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-200">
                      <input
                        type="number"
                        step="0.05"
                        value={pit.espessuraParedeM}
                        onChange={(e) => updatePit(pit.id, { espessuraParedeM: parseFloat(e.target.value) || 0 })}
                        className="w-full text-center px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-800"
                      />
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-200">
                      <input
                        type="number"
                        step="0.05"
                        value={pit.espessuraLajeInfM}
                        onChange={(e) => updatePit(pit.id, { espessuraLajeInfM: parseFloat(e.target.value) || 0 })}
                        className="w-full text-center px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-800"
                      />
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-200">
                      <input
                        type="number"
                        step="0.05"
                        value={pit.espessuraLajeSupM}
                        onChange={(e) => updatePit(pit.id, { espessuraLajeSupM: parseFloat(e.target.value) || 0 })}
                        className="w-full text-center px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-800"
                      />
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-200 font-sans">
                      <select
                        value={pit.taxaAcoKgM3}
                        onChange={(e) => updatePit(pit.id, { taxaAcoKgM3: parseFloat(e.target.value) || 150 })}
                        className="w-full px-1.5 py-0.5 bg-white border border-slate-300 rounded font-bold text-blue-700"
                      >
                        <option value={110}>110 kg/m³ (Média)</option>
                        <option value={130}>130 kg/m³ (Reforçado)</option>
                        <option value={150}>150 kg/m³ (Pesado)</option>
                      </select>
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-200 text-center font-sans">
                      <input
                        type="checkbox"
                        checked={pit.isImpermeabilizado}
                        onChange={(e) => updatePit(pit.id, { isImpermeabilizado: e.target.checked })}
                        className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => removePit(pit.id)}
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

      {/* Tabela de Insumos e Serviços Derivados para Composição / Orçamento */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-3 bg-slate-100 border-b border-slate-200 text-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-cyan-600" />
            <h3 className="font-bold text-xs uppercase tracking-wide text-slate-800">
              Resumo Consolidado do Reservatório / PIT ({servicosCalculados.length} itens)
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
              SUMARIZAÇÃO DOS PITS / TÚNEIS
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
                    className={`hover:bg-cyan-50/30 transition-colors ${isSelected ? 'bg-cyan-50/60 font-bold' : ''}`}
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
                    <td className="py-2 px-3 text-center border-r border-slate-200 font-bold text-cyan-700">
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
                              `PIT / Reservatório: ${serv.descricao} => Total: ${serv.quantidadeTotal} ${serv.unidade}`,
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
