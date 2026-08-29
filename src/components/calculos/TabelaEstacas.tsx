import React, { useState } from 'react';
import { Plus, Trash2, Layers, HardHat, Target, Check, ArrowRight, CornerDownRight } from 'lucide-react';
import { CroquiEstaca, type TipoEstacaCroqui } from './CroquiEstaca';
import type { TargetInsumoItem } from './TabelaSapatas';
import { ItemBindingInfoEye } from './ItemBindingInfoEye';

export interface EstacaItem {
  id: string;
  nome: string;
  localizacao: string;
  tipoEstaca: TipoEstacaCroqui;
  diametroM: number; // Ø estaca (m)
  cargaTon: number; // Carga (ton)
  cotaSoloM: number; // Cota solo (m)
  cotaArrasamentoM: number; // Cota arrasamento (m)
  cotaApoioM: number; // Cota apoio / fundo (m)
  comprimentoArmacaoM: number; // Comprimento armação (m)
  quantidade: number; // Quant. estacas
}

export interface EstacasHeaderGlobal {
  taxaArmacaoKgM3: number;
  perdaConcretoPerc: number;
  empolamentoBotaForaPerc: number;
}

interface TabelaEstacasProps {
  headerGlobal: EstacasHeaderGlobal;
  onChangeHeaderGlobal: (header: EstacasHeaderGlobal) => void;
  list: EstacaItem[];
  onChangeList: (list: EstacaItem[]) => void;
  parentItem?: TargetInsumoItem;
  childItems?: TargetInsumoItem[];
  onApplySelectedMetric?: (metricKey: string, valorTotal: number, equacaoLiteral: string, substituicaoText: string, targetItemId?: string) => void;
}

export const TabelaEstacas: React.FC<TabelaEstacasProps> = ({
  headerGlobal,
  onChangeHeaderGlobal,
  list,
  onChangeList,
  parentItem,
  childItems,
  onApplySelectedMetric
}) => {
  const [selectedMetric, setSelectedMetric] = useState<string>('concretoM3');
  const handleAddItem = () => {
    const newItem: EstacaItem = {
      id: `estaca-${Date.now()}`,
      nome: `E-0${list.length + 1}`,
      localizacao: 'Eixo Geral',
      tipoEstaca: 'helice',
      diametroM: 0.40,
      cargaTon: 40,
      cotaSoloM: 0.00,
      cotaArrasamentoM: -1.00,
      cotaApoioM: -12.00,
      comprimentoArmacaoM: 6.00,
      quantidade: 1
    };
    onChangeList([...list, newItem]);
  };

  const handleUpdateItem = (index: number, field: keyof EstacaItem, val: any) => {
    const copia = [...list];
    copia[index] = { ...copia[index], [field]: val };
    onChangeList(copia);
  };

  const handleRemoveItem = (index: number) => {
    const copia = list.filter((_, i) => i !== index);
    onChangeList(copia);
  };

  // Metricas Derivadas
  const calcularMetricasEstaca = (item: EstacaItem) => {
    const q = item.quantidade || 0;
    const dia = item.diametroM || 0;
    const cSolo = item.cotaSoloM || 0;
    const cArr = item.cotaArrasamentoM || 0;
    const cApoio = item.cotaApoioM || 0;
    const cArm = item.comprimentoArmacaoM || 0;

    // Comprimento Útil (m) = Cota Arrasamento - Cota Apoio
    const compUtilUnit = Math.max(0, Math.abs(cArr - cApoio));

    // Comprimento Total (m) = Cota Solo - Cota Apoio
    const compTotalUnit = Math.max(0, Math.abs(cSolo - cApoio));

    // Totais de Execução/Perfuração
    const compUtilTotal = q * compUtilUnit;
    const compTotalTotal = q * compTotalUnit;

    // Área da seção transversal (m²)
    const areaSecao = (Math.PI * (dia * dia)) / 4;

    // Volume de Concreto Usinado com Perda (m³)
    const vConcretoSemPerda = compUtilTotal * areaSecao;
    const vConcretoTotal = vConcretoSemPerda * (1 + (headerGlobal.perdaConcretoPerc || 0) / 100);

    // Escavação Total (m³)
    const vEscavacaoTotal = compTotalTotal * areaSecao;

    // Transporte e Bota-fora de Solo (m³)
    const vBotaForaTotal = vEscavacaoTotal * (1 + (headerGlobal.empolamentoBotaForaPerc || 0) / 100);

    // Armação de Aço CA-50 / CA-60 (kg)
    const vArmacaoConcreto = q * cArm * areaSecao;
    const pesoAcoTotal = vArmacaoConcreto * (headerGlobal.taxaArmacaoKgM3 || 0);

    return {
      compUtilUnit,
      compTotalUnit,
      compUtilTotal,
      compTotalTotal,
      areaSecao,
      vConcretoTotal,
      vEscavacaoTotal,
      vBotaForaTotal,
      pesoAcoTotal
    };
  };

  const totaisGerais = list.reduce(
    (acc, item) => {
      const res = calcularMetricasEstaca(item);
      acc.compUtil += res.compUtilTotal;
      acc.compTotal += res.compTotalTotal;
      acc.vConcreto += res.vConcretoTotal;
      acc.pesoAco += res.pesoAcoTotal;
      acc.botaFora += res.vBotaForaTotal;
      return acc;
    },
    { compUtil: 0, compTotal: 0, vConcreto: 0, pesoAco: 0, botaFora: 0 }
  );

  const variaveisDerivadas = [
    { key: 'concretoM3', nome: 'Volume de Concreto Usinado', valor: totaisGerais.vConcreto, unidade: 'm³', icone: '📦' },
    { key: 'perfuracaoM', nome: 'Comprimento Total de Perfuração', valor: totaisGerais.compTotal, unidade: 'm', icone: '🔩' },
    { key: 'compUtilM', nome: 'Comprimento Útil das Estacas', valor: totaisGerais.compUtil, unidade: 'm', icone: '📐' },
    { key: 'armacaoKg', nome: 'Armação em Aço CA-50', valor: totaisGerais.pesoAco, unidade: 'kg', icone: '🏗️' },
    { key: 'botaForaM3', nome: 'Solo Bota-fora (Empolamento)', valor: totaisGerais.botaFora, unidade: 'm³', icone: '🚛' }
  ];

  const handleConfirmApply = (targetItemId?: string) => {
    if (!onApplySelectedMetric) return;

    const selTag = variaveisDerivadas.find(v => v.key === selectedMetric) || variaveisDerivadas[0];
    const valorTotal = selTag.valor;
    const labelMetric = selTag.nome;
    const unidadeStr = selTag.unidade;

    const resumoStr = list.map(e => `${e.nome} (${e.quantidade}x Ø${e.diametroM}m, H=${Math.abs(e.cotaSoloM - e.cotaApoioM)}m)`).join(', ');
    const equacaoLiteral = `Estacas de Fundação (Modelo Completo BRP) - Variable Tag: [${labelMetric}]`;
    const substituicaoText = `${resumoStr} => ${labelMetric} = ${valorTotal.toFixed(2).replace('.', ',')} ${unidadeStr}`;

    onApplySelectedMetric(selectedMetric, valorTotal, equacaoLiteral, substituicaoText, targetItemId);
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

            <div className="space-y-2.5 text-xs pt-1">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block">Taxa de Armação (kg/m³)</label>
                <input
                  type="number"
                  value={headerGlobal.taxaArmacaoKgM3}
                  onChange={(e) => onChangeHeaderGlobal({ ...headerGlobal, taxaArmacaoKgM3: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block">Perda de Concreto / Argamassa (%)</label>
                <input
                  type="number"
                  value={headerGlobal.perdaConcretoPerc}
                  onChange={(e) => onChangeHeaderGlobal({ ...headerGlobal, perdaConcretoPerc: parseFloat(e.target.value) || 0 })}
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
            </div>
          </div>
        </div>

        {/* Croqui CAD Esquemático Integrado (DIREITA) */}
        <div className="lg:col-span-7">
          <CroquiEstaca />
        </div>
      </div>

      {/* Tabela de Elementos de Estaca */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Dimensionamento de Estacão / Estacas Profundas ({list.length} Elementos)
            </h4>
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Estaca</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                <th className="py-2.5 px-3 border-r border-slate-200 w-20">CÓDIGO</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-28">TIPO ESTACA</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-16 text-center">QTD</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-20 text-right">Ø (m)</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-20 text-right">COTA SOLO</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-20 text-right">ARRASAM.</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-20 text-right">APOIO</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-24 text-right bg-blue-50/40">COMP. ÚTIL (m)</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-24 text-right bg-blue-50/40">COMP. TOTAL (m)</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-28 text-right bg-emerald-50/40">CONCRETO (m³)</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-28 text-right bg-amber-50/40">AÇO (kg)</th>
                <th className="py-2.5 px-3 text-center w-12">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400 italic">
                    Nenhuma estaca cadastrada. Clique no botão acima para adicionar.
                  </td>
                </tr>
              ) : (
                list.map((item, idx) => {
                  const m = calcularMetricasEstaca(item);
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
                      <td className="py-2 px-3 border-r border-slate-200">
                        <select
                          value={item.tipoEstaca}
                          onChange={(e) => handleUpdateItem(idx, 'tipoEstaca', e.target.value as TipoEstacaCroqui)}
                          className="w-full px-2 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded outline-none focus:border-blue-500"
                        >
                          <option value="helice">Hélice Contínua</option>
                          <option value="escavada">Escavada</option>
                          <option value="pre_moldada">Pré-Moldada</option>
                          <option value="raiz">Estaca Raiz</option>
                          <option value="perfil_metalico">Perfil Metálico</option>
                        </select>
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
                          value={item.diametroM}
                          onChange={(e) => handleUpdateItem(idx, 'diametroM', parseFloat(e.target.value) || 0)}
                          className="w-16 text-right font-mono text-slate-800 bg-white border border-slate-200 rounded outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right">
                        <input
                          type="number"
                          step="0.10"
                          value={item.cotaSoloM}
                          onChange={(e) => handleUpdateItem(idx, 'cotaSoloM', parseFloat(e.target.value) || 0)}
                          className="w-16 text-right font-mono text-slate-800 bg-white border border-slate-200 rounded outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right">
                        <input
                          type="number"
                          step="0.10"
                          value={item.cotaArrasamentoM}
                          onChange={(e) => handleUpdateItem(idx, 'cotaArrasamentoM', parseFloat(e.target.value) || 0)}
                          className="w-16 text-right font-mono text-slate-800 bg-white border border-slate-200 rounded outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right">
                        <input
                          type="number"
                          step="0.50"
                          value={item.cotaApoioM}
                          onChange={(e) => handleUpdateItem(idx, 'cotaApoioM', parseFloat(e.target.value) || 0)}
                          className="w-16 text-right font-mono text-slate-800 bg-white border border-slate-200 rounded outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Resultados Derivados */}
                      <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-bold text-blue-900 bg-blue-50/20">
                        {m.compUtilTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-bold text-blue-900 bg-blue-50/20">
                        {m.compTotalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-bold text-emerald-900 bg-emerald-50/20">
                        {m.vConcretoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-bold text-amber-900 bg-amber-50/20">
                        {m.pesoAcoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </td>

                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer hover:bg-slate-100 rounded"
                          title="Excluir Estaca"
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

      {/* TABELA SIMPLES DE RESULTADOS DO CÁLCULO (DUAS TABELAS LADO A LADO) */}
      {(() => {
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
        );
      })()}

      {/* AÇÃO FINAL: SELEÇÃO E VÍNCULO DE INSUMOS DA COMPOSIÇÃO */}
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
                {/* Linha Principal (Item Pai) */}
                {parentItem && (() => {
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
                  !parentItem && (
                    <tr>
                      <td colSpan={4} className="py-3 px-3 text-center text-slate-400 italic text-xs">
                        Clique abaixo para aplicar diretamente à linha do memorial.
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          {!parentItem && !childItems?.length && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => handleConfirmApply()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Vincular Variável ao Memorial</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
