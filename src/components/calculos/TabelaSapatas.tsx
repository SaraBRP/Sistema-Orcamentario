import React, { useState } from 'react';
import { Plus, Trash2, Copy, Sparkles, Check, ArrowRight, Target, CornerDownRight } from 'lucide-react';
import { ItemBindingInfoEye } from './ItemBindingInfoEye';
import { CroquiSapata } from './CroquiSapata';

export interface SapataItem {
  id: string;
  nome: string;           // Ex: "S-01"
  localizacao: string;    // Ex: "Pilar P1"
  cotaSolo: number;       // m, ex: 0.00
  cotaTopo: number;       // m, ex: -1.00
  talude: number;         // 0: Sem Escavação, 1: Prumo c/ Vala, 2: Talude 1:1, 3: Talude 1:2
  quantidade: number;     // und, ex: 1
  larguraMaior: number;   // L_maior (m), ex: 1.50 (base da sapata)
  comprimentoMaior: number;// C_maior (m), ex: 1.50 (base da sapata)
  larguraMenor: number;   // L_menor (m), ex: 0.50 (topo do tronco)
  comprimentoMenor: number;// C_menor (m), ex: 0.50 (topo do tronco)
  altura1: number;        // H1 (m), ex: 0.30 (altura rodapé)
  altura2: number;        // H2 (m), ex: 0.30 (altura tronco pirâmide)
}

export interface SapatasHeaderGlobal {
  taxaArmacaoKgM3: number;        // ex: 90
  empolamentoBotaForaPerc: number;// ex: 30
  taxaArmacaoIndicadaPor: string; // ex: "Engenharia / Projeto Estrutural"
  folgaValaM: number;             // ex: 0.50
  lastroEspessuraM: number;       // ex: 0.05
}

export function calcularSapataLinha(item: SapataItem, header: SapatasHeaderGlobal) {
  const q = item.quantidade || 0;
  const lMaj = item.larguraMaior || 0;
  const cMaj = item.comprimentoMaior || 0;
  const lMin = item.larguraMenor || 0;
  const cMin = item.comprimentoMenor || 0;
  const h1 = item.altura1 || 0;
  const h2 = item.altura2 || 0;
  const cotaS = item.cotaSolo ?? 0;
  const cotaT = item.cotaTopo ?? 0;
  const talude = item.talude ?? 1;

  const vala = header.folgaValaM ?? 0.50;
  const lastroEsp = header.lastroEspessuraM ?? 0.05;
  const empolamento = (header.empolamentoBotaForaPerc ?? 30) / 100;
  const taxaAco = header.taxaArmacaoKgM3 ?? 90;

  const hSoloTopo = cotaS - cotaT;
  const hExc = h1 + h2 + hSoloTopo + lastroEsp;

  const areaBasePrumo = Math.round((lMaj + 2 * vala) * (cMaj + 2 * vala) * 100) / 100;
  const areaSup11 = Math.round((lMaj + 2 * vala + 2 * hExc) * (cMaj + 2 * vala + 2 * hExc) * 100) / 100;
  const areaSup12 = Math.round((lMaj + 2 * vala + hExc) * (cMaj + 2 * vala + hExc) * 100) / 100;

  let escavacaoM3 = 0;
  if (talude === 0) {
    escavacaoM3 = 0;
  } else if (talude === 1) {
    escavacaoM3 = Math.round(q * areaBasePrumo * hExc * 100) / 100;
  } else if (talude === 2) {
    escavacaoM3 = Math.round(q * (hExc / 3) * (areaBasePrumo + areaSup11 + Math.sqrt(areaBasePrumo * areaSup11)) * 100) / 100;
  } else if (talude === 3) {
    escavacaoM3 = Math.round(q * (hExc / 3) * (areaBasePrumo + areaSup12 + Math.sqrt(areaBasePrumo * areaSup12)) * 100) / 100;
  }

  const apiloamentoM2 = q > 0 ? Math.round(q * (lMaj + 2 * 0.05) * (cMaj + 2 * 0.05) * 100) / 100 : 0;
  const lastroM3 = Math.round(apiloamentoM2 * lastroEsp * 100) / 100;

  // Cálculo do Concreto: Rodapé (Retangular) + Tronco (Pirâmide)
  const volRodape = lMaj * cMaj * h1;
  let volTronco = 0;
  if (h2 > 0) {
    const a1 = lMaj * cMaj;
    const a2 = lMin * cMin;
    volTronco = (h2 / 3) * (a1 + a2 + Math.sqrt(a1 * a2));
  }
  const concretoM3 = q > 0 ? Math.round(q * (volRodape + volTronco) * 100) / 100 : 0;

  // Cálculo da Fôrma: Rodapé + Faces Inclinadas do Tronco
  const formaRodape = h1 * 2 * (lMaj + cMaj);
  let formaTronco = 0;
  if (h2 > 0) {
    const hIncL = Math.sqrt(Math.pow(h2, 2) + Math.pow((lMaj - lMin) / 2, 2));
    const hIncC = Math.sqrt(Math.pow(h2, 2) + Math.pow((cMaj - cMin) / 2, 2));
    formaTronco = 2 * hIncL * ((lMaj + lMin) / 2) + 2 * hIncC * ((cMaj + cMin) / 2);
  }
  const formaM2 = q > 0 ? Math.round(q * (formaRodape + formaTronco) * 100) / 100 : 0;

  const impermeabilizacaoM2 = q > 0 ? Math.round(q * (lMaj * cMaj + 2 * h1 * (lMaj + cMaj)) * 100) / 100 : 0;
  const reaterroM3 = Math.max(0, Math.round((escavacaoM3 - lastroM3 - concretoM3) * 100) / 100);
  const botaForaM3 = Math.round((escavacaoM3 - reaterroM3) * (1 + empolamento) * 100) / 100;
  const armacaoKg = taxaAco > 0 ? Math.round(concretoM3 * taxaAco * 100) / 100 : 0;

  return {
    hSoloTopo,
    hExc,
    areaBasePrumo,
    escavacaoM3,
    apiloamentoM2,
    lastroM3,
    concretoM3,
    formaM2,
    impermeabilizacaoM2,
    reaterroM3,
    botaForaM3,
    armacaoKg
  };
}

export const PARAMETROS_EXIGIDOS_SAPATA = [
  { simbolo: 'Quant', nome: 'Quantidade de Sapatas', unidade: 'und' },
  { simbolo: 'L_maior', nome: 'Largura Base Sapata', unidade: 'm' },
  { simbolo: 'C_maior', nome: 'Comprimento Base Sapata', unidade: 'm' },
  { simbolo: 'L_menor', nome: 'Largura Topo Tronco', unidade: 'm' },
  { simbolo: 'C_menor', nome: 'Comprimento Topo Tronco', unidade: 'm' },
  { simbolo: 'H1', nome: 'Altura Rodapé Retangular', unidade: 'm' },
  { simbolo: 'H2', nome: 'Altura Tronco de Pirâmide', unidade: 'm' },
  { simbolo: 'CotaSolo', nome: 'Cota do Terreno', unidade: 'm' },
  { simbolo: 'CotaTopo', nome: 'Cota Topo Sapata', unidade: 'm' },
  { simbolo: 'Talude', nome: 'Tipo de Geometria de Vala', unidade: '0, 1, 2, 3' }
];

export interface TargetInsumoItem {
  id: string;
  item_eap?: string;
  descricao: string;
  unidade?: string;
  isSecao?: boolean;
  level?: number;
  equacaoLiteral?: string;
  substituicaoNumerica?: string;
  observacaoMemoria?: string;
  quantidade?: number;
}

interface Props {
  header: SapatasHeaderGlobal;
  onChangeHeader: (h: SapatasHeaderGlobal) => void;
  sapatas: SapataItem[];
  onChangeSapatas: (sapatas: SapataItem[]) => void;
  parentItem?: TargetInsumoItem;
  childItems?: TargetInsumoItem[];
  onApplySelectedMetric?: (metricKey: string, valorTotal: number, equacaoLiteral: string, substituicaoText: string, targetItemId?: string) => void;
  readOnly?: boolean;
}

export const TabelaSapatas: React.FC<Props> = ({
  header,
  onChangeHeader,
  sapatas,
  onChangeSapatas,
  parentItem,
  childItems,
  onApplySelectedMetric,
  readOnly = false
}) => {
  const [selectedMetric, setSelectedMetric] = useState<string>('concretoM3');

  const handleAddSapata = () => {
    const nextNum = sapatas.length + 1;
    const newSapata: SapataItem = {
      id: `sap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      nome: `S-${nextNum < 10 ? '0' + nextNum : nextNum}`,
      localizacao: 'Pilar P1',
      cotaSolo: 0.00,
      cotaTopo: -1.00,
      talude: 1, // 1: Prumo com Vala
      quantidade: 1,
      larguraMaior: 1.50,
      comprimentoMaior: 1.50,
      larguraMenor: 0.50,
      comprimentoMenor: 0.50,
      altura1: 0.30,
      altura2: 0.30
    };
    onChangeSapatas([...sapatas, newSapata]);
  };

  const handleDuplicateSapata = (index: number) => {
    const original = sapatas[index];
    const duplicated: SapataItem = {
      ...original,
      id: `sap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      nome: `${original.nome}-CÓPIA`
    };
    const copy = [...sapatas];
    copy.splice(index + 1, 0, duplicated);
    onChangeSapatas(copy);
  };

  const handleRemoveSapata = (index: number) => {
    if (sapatas.length <= 1) return;
    onChangeSapatas(sapatas.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: keyof SapataItem, val: any) => {
    const copy = [...sapatas];
    copy[index] = { ...copy[index], [field]: val };
    onChangeSapatas(copy);
  };

  // Cálculos consolidados por linha
  const resultadosLinhas = sapatas.map(s => calcularSapataLinha(s, header));

  // Totais Finais
  const totalConcretoM3 = resultadosLinhas.reduce((acc, r) => acc + r.concretoM3, 0);
  const totalFormaM2 = resultadosLinhas.reduce((acc, r) => acc + r.formaM2, 0);
  const totalEscavacaoM3 = resultadosLinhas.reduce((acc, r) => acc + r.escavacaoM3, 0);
  const totalLastroM3 = resultadosLinhas.reduce((acc, r) => acc + r.lastroM3, 0);
  const totalImpermeabilizacaoM2 = resultadosLinhas.reduce((acc, r) => acc + r.impermeabilizacaoM2, 0);
  const totalReaterroM3 = resultadosLinhas.reduce((acc, r) => acc + r.reaterroM3, 0);
  const totalBotaForaM3 = resultadosLinhas.reduce((acc, r) => acc + r.botaForaM3, 0);
  const totalArmacaoKg = resultadosLinhas.reduce((acc, r) => acc + r.armacaoKg, 0);

  // Lista de Variáveis Derivadas Resolvidas em Tempo Real
  const variaveisDerivadas = [
    { key: 'concretoM3', nome: 'Volume de Concreto Usinado', valor: totalConcretoM3, unidade: 'm³', icone: '🧊' },
    { key: 'formaM2', nome: 'Área de Fôrma (Rodapé + Tronco)', valor: totalFormaM2, unidade: 'm²', icone: '📐' },
    { key: 'escavacaoM3', nome: 'Escavação de Vala', valor: totalEscavacaoM3, unidade: 'm³', icone: '🚜' },
    { key: 'armacaoKg', nome: 'Armação em Aço CA-50', valor: totalArmacaoKg, unidade: 'kg', icone: '🏗️' },
    { key: 'lastroM3', nome: 'Lastro de Concreto Magro', valor: totalLastroM3, unidade: 'm³', icone: '🧱' },
    { key: 'impermeabilizacaoM2', nome: 'Impermeabilização Asfáltica', valor: totalImpermeabilizacaoM2, unidade: 'm²', icone: '💧' },
    { key: 'reaterroM3', nome: 'Reaterro Compactado', valor: totalReaterroM3, unidade: 'm³', icone: '🛠️' },
    { key: 'botaForaM3', nome: 'Solo Bota-fora (Empolamento)', valor: totalBotaForaM3, unidade: 'm³', icone: '🚛' }
  ];

  const handleConfirmApply = (targetItemId?: string) => {
    if (!onApplySelectedMetric) return;

    const item = variaveisDerivadas.find(v => v.key === selectedMetric) || variaveisDerivadas[0];
    const valorTotal = item.valor;
    const labelMetric = item.nome;
    const unidadeStr = item.unidade;

    const resumoSapatasStr = sapatas.map(s => `${s.nome} (${s.quantidade}x ${s.larguraMaior}×${s.comprimentoMaior}m, H1=${s.altura1}m H2=${s.altura2}m)`).join(', ');
    const equacaoLiteral = `Sapata Isolada (Modelo Completo BRP) - Variable Tag: [${labelMetric}]`;
    const substituicaoText = `${resumoSapatasStr} => ${labelMetric} = ${valorTotal.toFixed(2).replace('.', ',')} ${unidadeStr}`;

    onApplySelectedMetric(selectedMetric, valorTotal, equacaoLiteral, substituicaoText, targetItemId);
  };

  return (
    <div className="space-y-4 text-xs font-sans">
      {/* SEÇÃO INTEGRADA: PARÂMETROS À ESQUERDA + CROQUI À DIREITA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        {/* 1. CABEÇALHO DE PARÂMETROS GLOBAIS DA OBRA (ESQUERDA) */}
        <div className="lg:col-span-5 bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 mb-2">
              <span className="font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5 text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                Parâmetros Globais do Orçamento
              </span>
              <span className="text-[10px] text-slate-400 font-mono">BRP Infra</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5 whitespace-nowrap">Taxa Armação (kg/m³)</label>
                <input
                  type="number"
                  step="1"
                  disabled={readOnly}
                  value={header.taxaArmacaoKgM3}
                  onChange={(e) => onChangeHeader({ ...header, taxaArmacaoKgM3: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 bg-white outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5 whitespace-nowrap">Empolamento Bota-fora (%)</label>
                <input
                  type="number"
                  step="1"
                  disabled={readOnly}
                  value={header.empolamentoBotaForaPerc}
                  onChange={(e) => onChangeHeader({ ...header, empolamentoBotaForaPerc: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 bg-white outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5 whitespace-nowrap">Taxa Indicada por</label>
                <input
                  type="text"
                  disabled={readOnly}
                  placeholder="Ex: Engenharia"
                  value={header.taxaArmacaoIndicadaPor}
                  onChange={(e) => onChangeHeader({ ...header, taxaArmacaoIndicadaPor: e.target.value })}
                  className="w-full px-2.5 py-1 border border-slate-300 rounded-lg font-medium text-slate-800 bg-white outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5 whitespace-nowrap">Folga de Vala (m)</label>
                <input
                  type="number"
                  step="0.05"
                  disabled={readOnly}
                  value={header.folgaValaM}
                  onChange={(e) => onChangeHeader({ ...header, folgaValaM: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 bg-white outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5 whitespace-nowrap">Espessura Lastro (m)</label>
                <input
                  type="number"
                  step="0.01"
                  disabled={readOnly}
                  value={header.lastroEspessuraM}
                  onChange={(e) => onChangeHeader({ ...header, lastroEspessuraM: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 bg-white outline-none focus:border-blue-500 text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. CROQUI ESQUEMÁTICO CAD DE SAPATAS (DIREITA) */}
        <div className="lg:col-span-7">
          <CroquiSapata />
        </div>
      </div>

      {/* 3. TABELA INTERATIVA DINÂMICA DE SAPATAS */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
        <div className="p-3 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 uppercase text-xs">Tabela de Sapatas Isoladas ({sapatas.length} elementos)</span>
            <span className="text-[10px] text-slate-500 font-medium">(Preencha as dimensões de rodapé H1 e tronco H2 para calcular)</span>
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={handleAddSapata}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Adicionar Sapata</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto max-h-80 scrollbar-thin">
          <table className="w-full border-collapse text-left text-xs min-w-[1300px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200 whitespace-nowrap">
                <th className="py-2.5 px-3 min-w-[100px] text-center border-r">NOME</th>
                <th className="py-2.5 px-3 min-w-[150px] border-r">LOCALIZAÇÃO</th>
                <th className="py-2.5 px-3 min-w-[100px] text-center border-r">COTA SOLO</th>
                <th className="py-2.5 px-3 min-w-[100px] text-center border-r">COTA TOPO</th>
                <th className="py-2.5 px-3 min-w-[140px] text-center border-r">TALUDE</th>
                <th className="py-2.5 px-3 min-w-[75px] text-center border-r">QUANT</th>
                <th className="py-2.5 px-3 min-w-[85px] text-center border-r">L MAIOR (m)</th>
                <th className="py-2.5 px-3 min-w-[85px] text-center border-r">C MAIOR (m)</th>
                <th className="py-2.5 px-3 min-w-[85px] text-center border-r">L MENOR (m)</th>
                <th className="py-2.5 px-3 min-w-[85px] text-center border-r">C MENOR (m)</th>
                <th className="py-2.5 px-3 min-w-[80px] text-center border-r">H1 (m)</th>
                <th className="py-2.5 px-3 min-w-[80px] text-center border-r">H2 (m)</th>
                <th className="py-2.5 px-3 min-w-[120px] text-right border-r bg-blue-50/50 font-mono text-blue-900">CONCRETO</th>
                <th className="py-2.5 px-3 min-w-[120px] text-right border-r bg-amber-50/50 font-mono text-amber-900">FÔRMA</th>
                <th className="py-2.5 px-3 min-w-[125px] text-right border-r bg-emerald-50/50 font-mono text-emerald-900">ESCAVAÇÃO</th>
                {!readOnly && <th className="py-2.5 px-3 min-w-[80px] text-center">AÇÕES</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sapatas.map((sapata, idx) => {
                const res = resultadosLinhas[idx];
                return (
                  <tr key={sapata.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-1.5 border-r text-center">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={sapata.nome}
                        onChange={(e) => handleUpdateItem(idx, 'nome', e.target.value)}
                        className="w-full px-2 py-1 text-center font-bold text-slate-900 bg-white border border-slate-300 rounded-md text-xs outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="p-1.5 border-r">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={sapata.localizacao}
                        onChange={(e) => handleUpdateItem(idx, 'localizacao', e.target.value)}
                        className="w-full px-2 py-1 font-medium text-slate-800 bg-white border border-slate-300 rounded-md text-xs outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="p-1.5 border-r text-center">
                      <input
                        type="number"
                        step="0.05"
                        disabled={readOnly}
                        value={sapata.cotaSolo}
                        onChange={(e) => handleUpdateItem(idx, 'cotaSolo', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-center font-mono font-semibold text-slate-800 bg-white border border-slate-300 rounded-md text-xs outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="p-1.5 border-r text-center">
                      <input
                        type="number"
                        step="0.05"
                        disabled={readOnly}
                        value={sapata.cotaTopo}
                        onChange={(e) => handleUpdateItem(idx, 'cotaTopo', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-center font-mono font-semibold text-slate-800 bg-white border border-slate-300 rounded-md text-xs outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="p-1.5 border-r text-center">
                      <select
                        disabled={readOnly}
                        value={sapata.talude}
                        onChange={(e) => handleUpdateItem(idx, 'talude', parseInt(e.target.value, 10))}
                        className="w-full px-2 py-1 text-center font-semibold text-slate-800 bg-white border border-slate-300 rounded-md text-xs outline-none cursor-pointer focus:border-blue-500"
                      >
                        <option value={0}>0 - Sem Escavação</option>
                        <option value={1}>1 - Prumo c/ Vala</option>
                        <option value={2}>2 - Talude 1:1</option>
                        <option value={3}>3 - Talude 1:2</option>
                      </select>
                    </td>
                    <td className="p-1.5 border-r text-center">
                      <input
                        type="number"
                        min="1"
                        disabled={readOnly}
                        value={sapata.quantidade}
                        onChange={(e) => handleUpdateItem(idx, 'quantidade', parseInt(e.target.value, 10) || 1)}
                        className="w-full px-2 py-1 text-center font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-md text-xs outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="p-1.5 border-r text-center">
                      <input
                        type="number"
                        step="0.05"
                        disabled={readOnly}
                        value={sapata.larguraMaior}
                        onChange={(e) => handleUpdateItem(idx, 'larguraMaior', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-center font-mono font-semibold text-slate-800 bg-white border border-slate-300 rounded-md text-xs outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="p-1.5 border-r text-center">
                      <input
                        type="number"
                        step="0.05"
                        disabled={readOnly}
                        value={sapata.comprimentoMaior}
                        onChange={(e) => handleUpdateItem(idx, 'comprimentoMaior', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-center font-mono font-semibold text-slate-800 bg-white border border-slate-300 rounded-md text-xs outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="p-1.5 border-r text-center">
                      <input
                        type="number"
                        step="0.05"
                        disabled={readOnly}
                        value={sapata.larguraMenor}
                        onChange={(e) => handleUpdateItem(idx, 'larguraMenor', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-center font-mono font-semibold text-slate-800 bg-white border border-slate-300 rounded-md text-xs outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="p-1.5 border-r text-center">
                      <input
                        type="number"
                        step="0.05"
                        disabled={readOnly}
                        value={sapata.comprimentoMenor}
                        onChange={(e) => handleUpdateItem(idx, 'comprimentoMenor', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-center font-mono font-semibold text-slate-800 bg-white border border-slate-300 rounded-md text-xs outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="p-1.5 border-r text-center">
                      <input
                        type="number"
                        step="0.05"
                        disabled={readOnly}
                        value={sapata.altura1}
                        onChange={(e) => handleUpdateItem(idx, 'altura1', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-center font-mono font-semibold text-slate-800 bg-white border border-slate-300 rounded-md text-xs outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="p-1.5 border-r text-center">
                      <input
                        type="number"
                        step="0.05"
                        disabled={readOnly}
                        value={sapata.altura2}
                        onChange={(e) => handleUpdateItem(idx, 'altura2', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-center font-mono font-semibold text-slate-800 bg-white border border-slate-300 rounded-md text-xs outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-900 border-r bg-blue-50/20 whitespace-nowrap">
                      {res.concretoM3.toFixed(2)} m³
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-900 border-r bg-amber-50/20 whitespace-nowrap">
                      {res.formaM2.toFixed(2)} m²
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-900 border-r bg-emerald-50/20 whitespace-nowrap">
                      {res.escavacaoM3.toFixed(2)} m³
                    </td>
                    {!readOnly && (
                      <td className="py-1.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            title="Duplicar Sapata"
                            onClick={() => handleDuplicateSapata(idx)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Excluir Sapata"
                            disabled={sapatas.length <= 1}
                            onClick={() => handleRemoveSapata(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. TABELA SIMPLES DE RESULTADOS DO CÁLCULO (DUAS TABELAS LADO A LADO) */}
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

      {/* 4. AÇÃO FINAL: SELEÇÃO E VÍNCULO DE INSUMOS DA COMPOSIÇÃO */}
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
                {/* Linha Principal (Composição / Serviço) */}
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
