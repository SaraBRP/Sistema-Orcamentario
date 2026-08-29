import React, { useState } from 'react';
import { Plus, Trash2, HardHat, Boxes, Check, Target, CornerDownRight } from 'lucide-react';
import { ItemBindingInfoEye } from './ItemBindingInfoEye';
import { CroquiPremoldado, type TipoPremoldadoCroqui } from './CroquiPremoldado';
import type { TargetInsumoItem } from './TabelaSapatas';

export interface PremoldadoItem {
  id: string;
  nome: string;
  tipo: 'pilar' | 'viga';
  localizacao: string;
  comprimentoL: number;   // L (m)
  menorDimB: number;      // b (m)
  maiorDimH: number;      // h (m)
  quantidade: number;
  reaproveitamentoForma: number; // N vezes
}

export interface PremoldadosHeaderGlobal {
  consumoPregosKgM2: number;
  perdaMadeiraPerc: number;
  taxaMontagemPecasDia: number;
  carpinteiroHhM2: number;
  serventeFormaHhM2: number;
  pedreiroConcHhM3: number;
  serventeConcHhM3: number;
}

interface TabelaPremoldadosProps {
  headerGlobal: PremoldadosHeaderGlobal;
  onChangeHeaderGlobal: (header: PremoldadosHeaderGlobal) => void;
  list: PremoldadoItem[];
  onChangeList: (list: PremoldadoItem[]) => void;
  parentItem?: TargetInsumoItem;
  childItems?: TargetInsumoItem[];
  onApplySelectedMetric?: (metricKey: string, valorTotal: number, equacaoLiteral: string, substituicaoText: string, targetItemId?: string) => void;
}

export const TabelaPremoldados: React.FC<TabelaPremoldadosProps> = ({
  headerGlobal,
  onChangeHeaderGlobal,
  list,
  onChangeList,
  parentItem,
  childItems,
  onApplySelectedMetric
}) => {
  const [tipoCroqui, setTipoCroqui] = useState<TipoPremoldadoCroqui>('pilar');
  const [selectedMetric, setSelectedMetric] = useState<string>('vConcreto');

  const handleAddItem = () => {
    const isPilar = tipoCroqui === 'pilar';
    const newItem: PremoldadoItem = {
      id: `pre-${Date.now()}`,
      nome: isPilar ? `P-${list.length + 1}` : `V-${list.length + 1}`,
      tipo: tipoCroqui,
      localizacao: isPilar ? 'Galpão Principal' : 'Cobertura / Trava',
      comprimentoL: isPilar ? 19.50 : 9.50,
      menorDimB: isPilar ? 0.60 : 0.30,
      maiorDimH: isPilar ? 0.60 : 0.82,
      quantidade: isPilar ? 27 : 12,
      reaproveitamentoForma: isPilar ? 9 : 6
    };
    onChangeList([...list, newItem]);
  };

  const handleUpdateItem = (index: number, field: keyof PremoldadoItem, val: any) => {
    const copia = [...list];
    copia[index] = { ...copia[index], [field]: val };
    onChangeList(copia);
  };

  const handleRemoveItem = (index: number) => {
    const copia = list.filter((_, i) => i !== index);
    onChangeList(copia);
  };

  // CÁLCULOS MATEMÁTICOS DAS PEÇAS PRÉ-MOLDADAS (100% FIÉIS AO EXCEL COMP DE PRÉ MOLDADOS)
  const calcularMetricasPremoldado = (item: PremoldadoItem) => {
    const q = item.quantidade || 0;
    const l = item.comprimentoL || 0;
    const b = item.menorDimB || 0;
    const h = item.maiorDimH || 0;
    const reaprov = Math.max(1, item.reaproveitamentoForma || 1);

    const perda = 1 + (headerGlobal.perdaMadeiraPerc || 20) / 100; // 1.20
    const consPrego = headerGlobal.consumoPregosKgM2 || 0.20;

    // 1. Volume Unitário e Total de Concreto (m³)
    const vUnit = l * b * h;
    const vTotal = q * vUnit;

    // 2. Jogos de Fôrmas Necessários (UN)
    const jogosForma = Math.ceil(q / reaprov);

    // 3. Compensado Plastificado
    // Área de fôrma de 1 peça com folga (m²)
    const areaForma1PecaSemPerda = (b + 0.10) * l + (b + 0.10) * h;
    const areaCompensado1Peca = areaForma1PecaSemPerda * perda;
    const areaCompensadoTotalObra = areaCompensado1Peca * jogosForma;
    const coefCompensadoM2M3 = vTotal > 0 ? areaCompensadoTotalObra / vTotal : 0;

    // 4. Pregos (kg)
    const areaFormaConfecTotal = areaCompensado1Peca * q;
    const pesoPregosTotalKg = areaFormaConfecTotal * consPrego * perda;
    const coefPregosKgM3 = vTotal > 0 ? pesoPregosTotalKg / vTotal : 0;

    // 5. Sarrafos 1" x 4" (m)
    const sarrafos1Peca = (l * 4 + (l / 0.4) * b + h * ((b + 0.10) / 0.4) + (b + 0.10)) * perda;
    const compSarrafosTotalObra = sarrafos1Peca * jogosForma;
    const coefSarrafosMM3 = vTotal > 0 ? compSarrafosTotalObra / vTotal : 0;

    // 6. Pontaletes 3" x 3" (m)
    const pontaletes1Peca = (l * 4) * perda;
    const compPontaletesTotalObra = pontaletes1Peca * jogosForma;
    const coefPontaletesMM3 = vTotal > 0 ? compPontaletesTotalObra / vTotal : 0;

    // 7. Desmoldante e Tratamento Aparente (m²)
    const areaDesmoldante1Peca = l * b;
    const areaDesmoldanteTotalObra = areaDesmoldante1Peca * q;

    // 8. Mão de Obra de Fabricação (hh)
    const hhCarpinteiroTotal = areaFormaConfecTotal * headerGlobal.carpinteiroHhM2;
    const hhServenteFormaTotal = areaFormaConfecTotal * headerGlobal.serventeFormaHhM2;
    const hhPedreiroConcTotal = vTotal * headerGlobal.pedreiroConcHhM3;
    const hhServenteConcTotal = vTotal * headerGlobal.serventeConcHhM3;

    // 9. Montagem na Obra
    const taxaMont = Math.max(1, headerGlobal.taxaMontagemPecasDia || 10);
    const diasGuindaste = Math.ceil(q / taxaMont);
    const hhServenteMontagem = diasGuindaste * 20;
    const hhPedreiroMontagem = diasGuindaste * 20;
    const horasGuindaste50t = diasGuindaste * 10 + 20;

    return {
      vTotal,
      jogosForma,
      areaCompensadoTotalObra,
      coefCompensadoM2M3,
      pesoPregosTotalKg,
      coefPregosKgM3,
      compSarrafosTotalObra,
      coefSarrafosMM3,
      compPontaletesTotalObra,
      coefPontaletesMM3,
      areaDesmoldanteTotalObra,
      hhCarpinteiroTotal,
      hhServenteFormaTotal,
      hhPedreiroConcTotal,
      hhServenteConcTotal,
      diasGuindaste,
      hhServenteMontagem,
      hhPedreiroMontagem,
      horasGuindaste50t
    };
  };

  // Somatórios de Todos os Itens da Lista
  const totaisGerais = list.reduce((acc, item) => {
    const m = calcularMetricasPremoldado(item);
    acc.vTotal += m.vTotal;
    acc.areaCompensado += m.areaCompensadoTotalObra;
    acc.pesoPregos += m.pesoPregosTotalKg;
    acc.compSarrafos += m.compSarrafosTotalObra;
    acc.compPontaletes += m.compPontaletesTotalObra;
    acc.areaDesmoldante += m.areaDesmoldanteTotalObra;
    acc.hhCarpinteiro += m.hhCarpinteiroTotal;
    acc.hhServenteForma += m.hhServenteFormaTotal;
    acc.hhPedreiroConc += m.hhPedreiroConcTotal;
    acc.hhServenteConc += m.hhServenteConcTotal;
    acc.diasGuindaste += m.diasGuindaste;
    acc.hhServenteMontagem += m.hhServenteMontagem;
    acc.hhPedreiroMontagem += m.hhPedreiroMontagem;
    acc.horasGuindaste += m.horasGuindaste50t;
    return acc;
  }, {
    vTotal: 0,
    areaCompensado: 0,
    pesoPregos: 0,
    compSarrafos: 0,
    compPontaletes: 0,
    areaDesmoldante: 0,
    hhCarpinteiro: 0,
    hhServenteForma: 0,
    hhPedreiroConc: 0,
    hhServenteConc: 0,
    diasGuindaste: 0,
    hhServenteMontagem: 0,
    hhPedreiroMontagem: 0,
    horasGuindaste: 0
  });

  return (
    <div className="space-y-4">
      {/* SEÇÃO INTEGRADA: PARÂMETROS À ESQUERDA + CROQUI À DIREITA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        {/* Painel Global de Parâmetros de Projeto (ESQUERDA) */}
        <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200/80 pb-2">
              <HardHat className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Parâmetros de Projeto - Pré-Moldados</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs pt-1">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block">Consumo Pregos (kg/m²)</label>
                <input
                  type="number"
                  step="0.05"
                  value={headerGlobal.consumoPregosKgM2}
                  onChange={(e) => onChangeHeaderGlobal({ ...headerGlobal, consumoPregosKgM2: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block">Perda Madeira (%)</label>
                <input
                  type="number"
                  value={headerGlobal.perdaMadeiraPerc}
                  onChange={(e) => onChangeHeaderGlobal({ ...headerGlobal, perdaMadeiraPerc: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block">Montagem (Peças/Dia)</label>
                <input
                  type="number"
                  value={headerGlobal.taxaMontagemPecasDia}
                  onChange={(e) => onChangeHeaderGlobal({ ...headerGlobal, taxaMontagemPecasDia: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block">Carpinteiro Fôrma (hh/m²)</label>
                <input
                  type="number"
                  step="0.5"
                  value={headerGlobal.carpinteiroHhM2}
                  onChange={(e) => onChangeHeaderGlobal({ ...headerGlobal, carpinteiroHhM2: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Croqui CAD Esquemático Integrado (DIREITA) */}
        <div className="lg:col-span-7">
          <CroquiPremoldado tipoInicial={tipoCroqui} />
        </div>
      </div>

      {/* Tabela de Cadastro e Dimensionamento de Pilares e Vigas Pré-Moldados */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-xs uppercase tracking-wide">
              Dimensionamento de Elementos Estruturais Pré-Moldados ({list.length} peças)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTipoCroqui('pilar')}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${tipoCroqui === 'pilar' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}
            >
              + Pilar
            </button>
            <button
              type="button"
              onClick={() => setTipoCroqui('viga')}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${tipoCroqui === 'viga' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}
            >
              + Viga
            </button>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Peça</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-700 uppercase">
                <th className="py-2 px-3 border-r border-slate-200">Tipo / Nome</th>
                <th className="py-2 px-3 border-r border-slate-200">Localização</th>
                <th className="py-2 px-3 text-center border-r border-slate-200">Qtd (UN)</th>
                <th className="py-2 px-3 text-center border-r border-slate-200">Altura / Comprimento L (m)</th>
                <th className="py-2 px-3 text-center border-r border-slate-200">Menor Dim B (m)</th>
                <th className="py-2 px-3 text-center border-r border-slate-200">Maior Dim H (m)</th>
                <th className="py-2 px-3 text-center border-r border-slate-200">Reaprov. Fôrma</th>
                <th className="py-2 px-3 text-right border-r border-slate-200 bg-blue-50/50">Volume Concreto (m³)</th>
                <th className="py-2 px-3 text-right border-r border-slate-200 bg-blue-50/50">Compensado (m²)</th>
                <th className="py-2 px-3 text-right border-r border-slate-200 bg-blue-50/50">Pregos (kg)</th>
                <th className="py-2 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-6 text-center text-slate-400 italic">
                    Nenhuma peça pré-moldada cadastrada. Clique em "+ Pilar" ou "+ Viga" acima.
                  </td>
                </tr>
              ) : (
                list.map((item, idx) => {
                  const m = calcularMetricasPremoldado(item);
                  return (
                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-2 px-3 border-r border-slate-200 font-sans font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${item.tipo === 'pilar' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                            {item.tipo}
                          </span>
                          <input
                            type="text"
                            value={item.nome}
                            onChange={(e) => handleUpdateItem(idx, 'nome', e.target.value)}
                            className="w-20 font-mono font-bold text-slate-900 bg-white/80 border border-slate-300 rounded px-1 text-center outline-none focus:border-blue-600 focus:bg-white"
                          />
                        </div>
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">
                        <input
                          type="text"
                          value={item.localizacao}
                          onChange={(e) => handleUpdateItem(idx, 'localizacao', e.target.value)}
                          className="w-full font-sans text-slate-900 bg-white/80 border border-slate-300 rounded px-1 outline-none focus:border-blue-600 focus:bg-white"
                        />
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-200 font-bold">
                        <input
                          type="number"
                          value={item.quantidade}
                          onChange={(e) => handleUpdateItem(idx, 'quantidade', parseInt(e.target.value) || 0)}
                          className="w-14 text-center font-mono font-bold text-slate-900 bg-white/80 border border-slate-300 rounded px-1 outline-none focus:border-blue-600 focus:bg-white"
                        />
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-200">
                        <input
                          type="number"
                          step="0.1"
                          value={item.comprimentoL}
                          onChange={(e) => handleUpdateItem(idx, 'comprimentoL', parseFloat(e.target.value) || 0)}
                          className="w-16 text-center font-mono font-bold text-slate-900 bg-white/80 border border-slate-300 rounded px-1 outline-none focus:border-blue-600 focus:bg-white"
                        />
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-200">
                        <input
                          type="number"
                          step="0.05"
                          value={item.menorDimB}
                          onChange={(e) => handleUpdateItem(idx, 'menorDimB', parseFloat(e.target.value) || 0)}
                          className="w-16 text-center font-mono font-bold text-slate-900 bg-white/80 border border-slate-300 rounded px-1 outline-none focus:border-blue-600 focus:bg-white"
                        />
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-200">
                        <input
                          type="number"
                          step="0.05"
                          value={item.maiorDimH}
                          onChange={(e) => handleUpdateItem(idx, 'maiorDimH', parseFloat(e.target.value) || 0)}
                          className="w-16 text-center font-mono font-bold text-slate-900 bg-white/80 border border-slate-300 rounded px-1 outline-none focus:border-blue-600 focus:bg-white"
                        />
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-200">
                        <input
                          type="number"
                          value={item.reaproveitamentoForma}
                          onChange={(e) => handleUpdateItem(idx, 'reaproveitamentoForma', parseInt(e.target.value) || 1)}
                          className="w-14 text-center font-mono font-bold text-blue-700 bg-white/80 border border-slate-300 rounded px-1 outline-none focus:border-blue-600 focus:bg-white"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 border-r border-slate-200 bg-blue-50/20">
                        {m.vTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-blue-900 border-r border-slate-200 bg-blue-50/20">
                        {m.areaCompensadoTotalObra.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-900 border-r border-slate-200 bg-blue-50/20">
                        {m.pesoPregosTotalKg.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Remover Peça"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* RESULTADOS E VÍNCULO AO MEMORIAL DE CÁLCULO */}
      {(() => {
        const variaveisDerivadas = [
          { key: 'vConcreto', nome: 'Volume Total de Concreto', valor: totaisGerais.vTotal, unidade: 'm³' },
          { key: 'areaCompensado', nome: 'Fôrma de Compensado Plastificado', valor: totaisGerais.areaCompensado, unidade: 'm²' },
          { key: 'pesoPregos', nome: 'Total de Pregos de Fôrma', valor: totaisGerais.pesoPregos, unidade: 'kg' },
          { key: 'compSarrafos', nome: 'Sarrafos 1" x 4"', valor: totaisGerais.compSarrafos, unidade: 'm' },
          { key: 'compPontaletes', nome: 'Pontaletes 3" x 3"', valor: totaisGerais.compPontaletes, unidade: 'm' },
          { key: 'horasGuindaste', nome: 'Locação Guindaste 50t', valor: totaisGerais.horasGuindaste, unidade: 'horas' }
        ];

        const handleConfirmApply = (targetId?: string) => {
          if (!onApplySelectedMetric) return;
          const selMetric = variaveisDerivadas.find(v => v.key === selectedMetric) || variaveisDerivadas[0];
          const totalPecas = list.reduce((acc, i) => acc + (i.quantidade || 1), 0);
          const eqLit = `Σ Pré-Moldados [${totalPecas} peças] → ${selMetric.nome}`;
          const subNum = `${selMetric.valor.toFixed(2)} ${selMetric.unidade}`;
          onApplySelectedMetric(selMetric.key, selMetric.valor, eqLit, subNum, targetId);
        };

        const half = Math.ceil(variaveisDerivadas.length / 2);
        const col1 = variaveisDerivadas.slice(0, half);
        const col2 = variaveisDerivadas.slice(half);

        const renderSubTable = (items: typeof variaveisDerivadas) => (
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                  <th className="py-2 px-3">Descrição da Variável</th>
                  <th className="py-2 px-3 text-right">Resultado</th>
                  <th className="py-2 px-3 w-24 text-center">Seleção</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {items.map((tag) => {
                  const isSelected = selectedMetric === tag.key;
                  return (
                    <tr
                      key={tag.key}
                      onClick={() => setSelectedMetric(tag.key)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50/90 font-semibold text-blue-900'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-blue-600' : 'bg-slate-300'}`}></span>
                          <span className="truncate">{tag.nome}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {typeof tag.valor === 'number'
                          ? tag.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : tag.valor}{' '}
                        <span className="text-[10px] font-normal text-slate-500">{tag.unidade}</span>
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                            <Check className="w-3 h-3" /> Selecionado
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-normal hover:text-blue-600">
                            Selecionar
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );

        return (
          <div className="space-y-4 pt-2">
            {/* 2 TABELAS DE RESULTADOS LADO A LADO */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs space-y-0">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="font-semibold text-slate-800 text-xs uppercase tracking-wide">
                  Resumo Consolidado de Pré-Moldados ({variaveisDerivadas.length} Métricas)
                </span>
                <span className="text-[11px] text-slate-500 font-normal">
                  Clique em uma linha para selecionar o resultado a vincular
                </span>
              </div>

              <div className="p-2.5 grid grid-cols-1 md:grid-cols-2 gap-2.5 bg-slate-50/50">
                {renderSubTable(col1)}
                {renderSubTable(col2)}
              </div>
            </div>

            {/* PAINEL DE AÇÃO E SELEÇÃO DE INSUMOS */}
            {onApplySelectedMetric && (
              <div className="p-4 bg-slate-50 border border-blue-200 rounded-xl space-y-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <span className="font-bold text-slate-900 block text-xs flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-blue-600" />
                    Variável Selecionada para Vincular: <strong className="text-blue-700 font-mono bg-blue-100/70 px-2 py-0.5 rounded border border-blue-200">
                      {variaveisDerivadas.find(v => v.key === selectedMetric)?.nome} ({variaveisDerivadas.find(v => v.key === selectedMetric)?.valor.toFixed(2)} {variaveisDerivadas.find(v => v.key === selectedMetric)?.unidade})
                    </strong>
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Escolha na tabela abaixo a linha do insumo ou a linha principal para aplicar o valor calculado:
                  </span>
                </div>

                {/* TABELA DE INSUMOS DA COMPOSIÇÃO */}
                <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white shadow-2xs">
                  <table className="w-full min-w-[680px] text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                        <th className="py-2 px-3 w-20 shrink-0">EAP</th>
                        <th className="py-2 px-3">Item / Insumo da Composição</th>
                        <th className="py-2 px-3 w-16 text-center shrink-0">UND</th>
                        <th className="py-2.5 px-3 w-48 text-center shrink-0 whitespace-nowrap">Ação do Vínculo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {/* Linha Principal (Composição) */}
                      {parentItem && !parentItem.isSecao && (() => {
                        const hasBind = Boolean(parentItem.equacaoLiteral || parentItem.substituicaoNumerica || parentItem.observacaoMemoria);
                        return (
                          <tr className={`transition-colors ${hasBind ? 'bg-emerald-50/50 hover:bg-emerald-100/60' : 'hover:bg-blue-50/40'}`}>
                            <td className="py-2 px-3 font-mono font-bold text-blue-700 whitespace-nowrap">{parentItem.item_eap || '1.0'}</td>
                            <td className="py-2 px-3 font-bold text-slate-900">
                              <div className="flex items-center justify-between gap-2">
                                <span className="break-words">
                                  {parentItem.descricao} <span className="text-[10px] text-slate-400 font-normal ml-1 whitespace-nowrap">(Linha Principal)</span>
                                </span>
                                <ItemBindingInfoEye item={parentItem} />
                              </div>
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-slate-600 whitespace-nowrap">{parentItem.unidade || 'und'}</td>
                            <td className="py-2 px-3 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleConfirmApply(parentItem.id)}
                                className="px-3 py-1 bg-white hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 font-medium rounded-lg text-[11px] flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all mx-auto whitespace-nowrap"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Vincular a este Insumo</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })()}

                      {/* Lista de Insumos Filhos */}
                      {childItems && childItems.length > 0 ? (
                        childItems.map((child) => {
                          const level = child.level !== undefined ? child.level : (child.item_eap ? Math.max(1, child.item_eap.split('.').length - 1) : 1);
                          const isChild = level >= 2;
                          const indentPx = isChild ? (level - 1) * 16 : 0;
                          const hasBind = Boolean(child.equacaoLiteral || child.substituicaoNumerica || child.observacaoMemoria);

                          return (
                            <tr key={child.id} className={`transition-colors ${hasBind ? 'bg-emerald-50/50 hover:bg-emerald-100/60' : (isChild ? 'bg-slate-50/40 hover:bg-blue-50/40' : 'hover:bg-blue-50/40')}`}>
                              <td className={`py-2 px-3 font-mono whitespace-nowrap ${isChild ? 'font-normal text-slate-500 text-[11px]' : 'font-bold text-slate-700 text-xs'}`}>
                                {child.item_eap}
                              </td>
                              <td className="py-2 px-3" style={{ paddingLeft: `${indentPx + 12}px` }}>
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    {isChild && (
                                      <CornerDownRight className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                    )}
                                    <span className={isChild ? "font-normal text-slate-700 text-xs select-text break-words" : "font-semibold text-slate-900 text-xs uppercase select-text break-words"} title={child.descricao}>
                                      {child.descricao}
                                    </span>
                                  </div>
                                  <ItemBindingInfoEye item={child} />
                                </div>
                              </td>
                              <td className="py-2 px-3 text-center font-mono text-slate-500 text-xs whitespace-nowrap">{child.unidade || 'und'}</td>
                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleConfirmApply(child.id)}
                                  className="px-3 py-1 bg-white hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 font-medium rounded-lg text-[11px] flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all mx-auto whitespace-nowrap"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Vincular a este Insumo</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        (!parentItem || parentItem.isSecao) && (
                          <tr>
                            <td colSpan={4} className="py-3 px-3 text-center text-slate-400 italic text-xs">
                              Nenhum insumo ou composição selecionado para vincular.
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};
