import React, { useState } from 'react';
import { Plus, Trash2, Layers, HardHat, Check, Target, CornerDownRight } from 'lucide-react';
import { CroquiTubulao } from './CroquiTubulao';
import type { TargetInsumoItem } from './TabelaSapatas';
import { ItemBindingInfoEye } from './ItemBindingInfoEye';

export interface TubulaoItem {
  id: string;
  nome: string;
  localizacao: string;
  cotaSolo: number;
  cotaTopo: number;
  quantidade: number;
  diametroFusteM: number; // Dfuste (m)
  alturaFusteM: number; // Hfuste (m)
  diametroBaseM: number; // Dbase (m)
  alturaBaseM: number; // Hbase (m)
  alturaRodapeBaseM: number; // h0 rodapé da base (m)
}

export interface TubuloesHeaderGlobal {
  taxaArmacaoKgM3: number;
  empolamentoBotaForaPerc: number;
  taxaArmacaoIndicadaPor: string;
  folgaValaM: number;
  lastroEspessuraM: number;
}

interface TabelaTubuloesProps {
  headerGlobal: TubuloesHeaderGlobal;
  onChangeHeaderGlobal: (header: TubuloesHeaderGlobal) => void;
  list: TubulaoItem[];
  onChangeList: (list: TubulaoItem[]) => void;
  parentItem?: TargetInsumoItem;
  childItems?: TargetInsumoItem[];
  onApplySelectedMetric?: (metricKey: string, valorTotal: number, equacaoLiteral: string, substituicaoText: string, targetItemId?: string) => void;
}

export const TabelaTubuloes: React.FC<TabelaTubuloesProps> = ({
  headerGlobal,
  onChangeHeaderGlobal,
  list,
  onChangeList,
  parentItem,
  childItems,
  onApplySelectedMetric
}) => {
  const [selectedMetric, setSelectedMetric] = useState<string>('vConcreto');
  const handleAddItem = () => {
    const newItem: TubulaoItem = {
      id: `tubulao-${Date.now()}`,
      nome: `TB-0${list.length + 1}`,
      localizacao: 'Eixo Principal',
      cotaSolo: 0.00,
      cotaTopo: -0.50,
      quantidade: 1,
      diametroFusteM: 0.80,
      alturaFusteM: 4.00,
      diametroBaseM: 1.60,
      alturaBaseM: 0.70,
      alturaRodapeBaseM: 0.20
    };
    onChangeList([...list, newItem]);
  };

  const handleUpdateItem = (index: number, field: keyof TubulaoItem, val: any) => {
    const copia = [...list];
    copia[index] = { ...copia[index], [field]: val };
    onChangeList(copia);
  };

  const handleRemoveItem = (index: number) => {
    const copia = list.filter((_, i) => i !== index);
    onChangeList(copia);
  };

  // Metricas Derivadas
  const calcularMetricasTubulao = (item: TubulaoItem) => {
    const q = item.quantidade || 0;
    const dFuste = item.diametroFusteM || 0;
    const hFuste = item.alturaFusteM || 0;
    const dBase = item.diametroBaseM || 0;
    const hBase = item.alturaBaseM || 0;
    const hRod = item.alturaRodapeBaseM || 0.20;

    // Volume do fuste cilíndrico
    const vFusteUnit = (Math.PI * (dFuste * dFuste) / 4) * hFuste;

    // Volume da base (Tronco de Cone + Rodapé Cilíndrico)
    const vTroncoConeUnit = (Math.PI * hBase / 12) * (dBase * dBase + dBase * dFuste + dFuste * dFuste);
    const vRodapeUnit = (Math.PI * (dBase * dBase) / 4) * hRod;
    const vBaseUnit = vTroncoConeUnit + vRodapeUnit;

    const vConcretoTotal = q * (vFusteUnit + vBaseUnit);
    const vEscavacaoFusteTotal = q * vFusteUnit;
    const vEscavacaoBaseTotal = q * vBaseUnit;
    const vEscavacaoTotal = vEscavacaoFusteTotal + vEscavacaoBaseTotal;

    const areaFormaColarinhoTotal = q * Math.PI * dFuste * 0.50; // Colarinho de 50cm
    const areaLastroFundoTotal = q * (Math.PI * (dBase * dBase) / 4);
    const vLastroTotal = areaLastroFundoTotal * headerGlobal.lastroEspessuraM;
    const pesoAcoTotal = vConcretoTotal * headerGlobal.taxaArmacaoKgM3;
    const vBotaForaTotal = vEscavacaoTotal * (1 + headerGlobal.empolamentoBotaForaPerc / 100);

    return {
      vFusteUnit,
      vBaseUnit,
      vConcretoTotal,
      vEscavacaoFusteTotal,
      vEscavacaoBaseTotal,
      vEscavacaoTotal,
      areaFormaColarinhoTotal,
      vLastroTotal,
      pesoAcoTotal,
      vBotaForaTotal
    };
  };

  return (
    <div className="space-y-4">
      {/* SEÇÃO INTEGRADA: PARÂMETROS À ESQUERDA + CROQUI À DIREITA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        {/* Painel Global de Parâmetros de Projeto (ESQUERDA) */}
        <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200/80 pb-2">
              <HardHat className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Parâmetros Globais do Orçamento</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs pt-1">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block">Taxa Armação (kg/m³)</label>
                <input
                  type="number"
                  value={headerGlobal.taxaArmacaoKgM3}
                  onChange={(e) => onChangeHeaderGlobal({ ...headerGlobal, taxaArmacaoKgM3: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block">Empolamento Bota-fora (%)</label>
                <input
                  type="number"
                  value={headerGlobal.empolamentoBotaForaPerc}
                  onChange={(e) => onChangeHeaderGlobal({ ...headerGlobal, empolamentoBotaForaPerc: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block">Taxa Indicada por</label>
                <input
                  type="text"
                  value={headerGlobal.taxaArmacaoIndicadaPor}
                  onChange={(e) => onChangeHeaderGlobal({ ...headerGlobal, taxaArmacaoIndicadaPor: e.target.value })}
                  className="w-full mt-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-sans text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block">Folga Colarinho (m)</label>
                <input
                  type="number"
                  step="0.05"
                  value={headerGlobal.folgaValaM}
                  onChange={(e) => onChangeHeaderGlobal({ ...headerGlobal, folgaValaM: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-semibold text-slate-500 block">Espessura Lastro (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={headerGlobal.lastroEspessuraM}
                  onChange={(e) => onChangeHeaderGlobal({ ...headerGlobal, lastroEspessuraM: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Croqui CAD Esquemático Integrado (DIREITA) */}
        <div className="lg:col-span-7">
          <CroquiTubulao />
        </div>
      </div>

      {/* Tabela de Elementos de Tubulão */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Dimensionamento de Tubulões a Céu Aberto</h4>
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Tubulão</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3 border-r border-slate-200 w-24">CÓDIGO</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-16 text-center">QTD</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-24 text-right">D FUSTE (m)</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-24 text-right">H FUSTE (m)</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-24 text-right">D BASE (m)</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-24 text-right">H BASE (m)</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-28 text-right bg-blue-50/40">CONCRETO (m³)</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-28 text-right bg-amber-50/40">ESC. BASE (m³)</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-28 text-right bg-emerald-50/40">AÇO (kg)</th>
                <th className="py-2.5 px-3 text-center w-12">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 italic">
                    Nenhum tubulão cadastrado. Clique no botão acima para adicionar.
                  </td>
                </tr>
              ) : (
                list.map((item, idx) => {
                  const m = calcularMetricasTubulao(item);

                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 border-r border-slate-200">
                        <input
                          type="text"
                          value={item.nome}
                          onChange={(e) => handleUpdateItem(idx, 'nome', e.target.value)}
                          className="w-full px-2 py-1 font-mono font-bold text-slate-800 bg-white border border-slate-200 rounded outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-center">
                        <input
                          type="number"
                          value={item.quantidade}
                          onChange={(e) => handleUpdateItem(idx, 'quantidade', parseInt(e.target.value) || 0)}
                          className="w-12 text-center font-mono font-bold text-slate-900 bg-white border border-slate-200 rounded outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right">
                        <input
                          type="number"
                          step="0.05"
                          value={item.diametroFusteM}
                          onChange={(e) => handleUpdateItem(idx, 'diametroFusteM', parseFloat(e.target.value) || 0)}
                          className="w-16 text-right font-mono text-slate-800 bg-white border border-slate-200 rounded outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right">
                        <input
                          type="number"
                          step="0.10"
                          value={item.alturaFusteM}
                          onChange={(e) => handleUpdateItem(idx, 'alturaFusteM', parseFloat(e.target.value) || 0)}
                          className="w-16 text-right font-mono text-slate-800 bg-white border border-slate-200 rounded outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right">
                        <input
                          type="number"
                          step="0.05"
                          value={item.diametroBaseM}
                          onChange={(e) => handleUpdateItem(idx, 'diametroBaseM', parseFloat(e.target.value) || 0)}
                          className="w-16 text-right font-mono text-slate-800 bg-white border border-slate-200 rounded outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right">
                        <input
                          type="number"
                          step="0.05"
                          value={item.alturaBaseM}
                          onChange={(e) => handleUpdateItem(idx, 'alturaBaseM', parseFloat(e.target.value) || 0)}
                          className="w-16 text-right font-mono text-slate-800 bg-white border border-slate-200 rounded outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Resultados Derivados */}
                      <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-bold text-blue-900 bg-blue-50/20">
                        {m.vConcretoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-bold text-amber-900 bg-amber-50/20">
                        {m.vEscavacaoBaseTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-bold text-emerald-900 bg-emerald-50/20">
                        {m.pesoAcoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </td>

                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer hover:bg-slate-100 rounded"
                          title="Excluir Tubulão"
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
        const totaisGerais = list.reduce((acc, item) => {
          const m = calcularMetricasTubulao(item);
          acc.vConcreto += m.vConcretoTotal;
          acc.vEscavacaoBase += m.vEscavacaoBaseTotal;
          acc.pesoAco += m.pesoAcoTotal;
          acc.vEscavacaoTotal += m.vEscavacaoTotal;
          acc.vLastro += m.vLastroTotal;
          acc.areaForma += m.areaFormaColarinhoTotal;
          acc.vBotaFora += m.vBotaForaTotal;
          return acc;
        }, {
          vConcreto: 0,
          vEscavacaoBase: 0,
          pesoAco: 0,
          vEscavacaoTotal: 0,
          vLastro: 0,
          areaForma: 0,
          vBotaFora: 0
        });

        const variaveisDerivadas = [
          { key: 'vConcreto', nome: 'Volume de Concreto do Tubulão', valor: totaisGerais.vConcreto, unidade: 'm³' },
          { key: 'vEscavacaoBase', nome: 'Escavação de Base Alargada (Manual)', valor: totaisGerais.vEscavacaoBase, unidade: 'm³' },
          { key: 'pesoAco', nome: 'Armação em Aço CA-50/60', valor: totaisGerais.pesoAco, unidade: 'kg' },
          { key: 'vEscavacaoTotal', nome: 'Escavação Total (Fuste + Base)', valor: totaisGerais.vEscavacaoTotal, unidade: 'm³' },
          { key: 'vLastro', nome: 'Lastro de Concreto Magro', valor: totaisGerais.vLastro, unidade: 'm³' },
          { key: 'areaForma', nome: 'Fôrma de Madeira para Colarinho', valor: totaisGerais.areaForma, unidade: 'm²' },
          { key: 'vBotaFora', nome: 'Carga e Transporte Bota-Fora (Empolado)', valor: totaisGerais.vBotaFora, unidade: 'm³' }
        ];

        const handleConfirmApply = (targetId?: string) => {
          if (!onApplySelectedMetric) return;
          const selMetric = variaveisDerivadas.find(v => v.key === selectedMetric) || variaveisDerivadas[0];
          const totalEst = list.reduce((acc, i) => acc + (i.quantidade || 1), 0);
          const eqLit = `Σ Tubulões [${totalEst} un] → ${selMetric.nome}`;
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
                  Resultados do Cálculo ({variaveisDerivadas.length} Métricas)
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
