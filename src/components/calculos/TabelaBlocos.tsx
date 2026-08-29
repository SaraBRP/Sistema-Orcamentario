import React, { useState } from 'react';
import { Plus, Trash2, Layers, HardHat, Check, Target, CornerDownRight } from 'lucide-react';
import { ItemBindingInfoEye } from './ItemBindingInfoEye';
import { CroquiBloco, type TipoBlocoCroqui } from './CroquiBloco';
import type { TargetInsumoItem } from './TabelaSapatas';

export interface BlocoItem {
  id: string;
  nome: string;
  tipoBloco: 'moldado' | 'tres_estacas' | 'pre_moldado' | 'tres_estacas_pre';
  localizacao: string;
  cotaSolo: number;
  cotaTopo: number;
  talude: number;
  quantidade: number;
  // Geometria Retangular / Moldado
  comprimentoA: number; // L (m)
  larguraB: number;     // C (m)
  alturaH1: number;     // H1 / Hbloco (m)
  alturaH2?: number;    // H2 tronco (m)
  
  // Geometria Poligonal 3 Estacas (2 Trapézios)
  b1Trap1?: number; // B1 (m)
  b2Trap1?: number; // B2 (m)
  hTrap1?: number;  // Htrap1 (m)
  b3Trap2?: number; // B3 (m)
  b4Trap2?: number; // B4 (m)
  hTrap2?: number;  // Htrap2 (m)
  
  // Colarinho (Pré-moldado)
  lColarinho?: number; // Lcol (m)
  cColarinho?: number; // Ccol (m)
  hColarinho?: number; // Hcol (m)
  
  // Nicho Piramidal Tronco (Pré-moldado)
  lNichoMaior?: number; // Lmaior (m)
  lNichoMenor?: number; // Lmenor (m)
  cNichoMaior?: number; // Cmaior (m)
  cNichoMenor?: number; // Cmenor (m)
  hNicho?: number;      // Hnicho (m)
}

export interface BlocosHeaderGlobal {
  taxaArmacaoKgM3: number;
  empolamentoBotaForaPerc: number;
  taxaArmacaoIndicadaPor: string;
  folgaValaM: number;
  lastroEspessuraM: number;
}

interface TabelaBlocosProps {
  headerGlobal: BlocosHeaderGlobal;
  onChangeHeaderGlobal: (header: BlocosHeaderGlobal) => void;
  list: BlocoItem[];
  onChangeList: (list: BlocoItem[]) => void;
  parentItem?: TargetInsumoItem;
  childItems?: TargetInsumoItem[];
  onApplySelectedMetric?: (metricKey: string, valorTotal: number, equacaoLiteral: string, substituicaoText: string, targetItemId?: string) => void;
}

export const TabelaBlocos: React.FC<TabelaBlocosProps> = ({
  headerGlobal,
  onChangeHeaderGlobal,
  list,
  onChangeList,
  parentItem,
  childItems,
  onApplySelectedMetric
}) => {
  const [tipoCroqui, setTipoCroqui] = useState<TipoBlocoCroqui>('moldado');
  const [selectedMetric, setSelectedMetric] = useState<string>('vConcreto');

  const handleAddItem = () => {
    const newItem: BlocoItem = {
      id: `bloco-${Date.now()}`,
      nome: `BLK-0${list.length + 1}`,
      tipoBloco: tipoCroqui,
      localizacao: 'Eixo Principal',
      cotaSolo: 0.00,
      cotaTopo: -1.00,
      talude: 1,
      quantidade: 1,
      comprimentoA: 1.60,
      larguraB: 1.60,
      alturaH1: 0.60,
      alturaH2: 0.00,
      b1Trap1: 0.60,
      b2Trap1: 1.80,
      hTrap1: 1.04,
      b3Trap2: 1.80,
      b4Trap2: 0.60,
      hTrap2: 1.04,
      lColarinho: 0.80,
      cColarinho: 0.80,
      hColarinho: 0.30,
      lNichoMaior: 0.60,
      lNichoMenor: 0.50,
      cNichoMaior: 0.60,
      cNichoMenor: 0.50,
      hNicho: 0.60
    };
    onChangeList([...list, newItem]);
  };

  const handleUpdateItem = (index: number, field: keyof BlocoItem, val: any) => {
    const copia = [...list];
    copia[index] = { ...copia[index], [field]: val };
    onChangeList(copia);
  };

  const handleRemoveItem = (index: number) => {
    const copia = list.filter((_, i) => i !== index);
    onChangeList(copia);
  };

  // Cálculos Derivados de Cada Bloco (100% FIÉIS ÀS FÓRMULAS DO EXCEL INFRAESTRUTURA_R0)
  const calcularMetricasBloco = (item: BlocoItem) => {
    const q = item.quantidade || 0;
    const folgaLastro = 0.05; // 5cm de folga lateral para lastro/apiloamento no Excel
    const folgaVala = headerGlobal.folgaValaM || 0.15;
    const espLastro = headerGlobal.lastroEspessuraM || 0.05;
    const empolamento = (headerGlobal.empolamentoBotaForaPerc || 30) / 100;
    const taxaAco = headerGlobal.taxaArmacaoKgM3 || 90;

    const hSoloTopo = Math.abs((item.cotaSolo || 0) - (item.cotaTopo || 0));

    let apiloamentoUnit = 0;
    let vConcretoUnit = 0;
    let areaFormaUnit = 0;

    let areaBasePrumoVala = 0;
    let hTotalElemento = 0;

    if (item.tipoBloco === 'moldado') {
      const l = item.comprimentoA || 1.6;
      const c = item.larguraB || 1.6;
      const h1 = item.alturaH1 || 0.6;
      const h2 = item.alturaH2 || 0;

      hTotalElemento = h1 + h2;
      apiloamentoUnit = (l + 2 * folgaLastro) * (c + 2 * folgaLastro);

      if (h2 > 0) {
        const aBase = l * c;
        const aTopo = 0.25; // 50x50cm pilar
        vConcretoUnit = aBase * h1 + (h2 / 3) * (aBase + aTopo + Math.sqrt(aBase * aTopo));
        const lateral1 = Math.sqrt(h2 * h2 + Math.pow((l - 0.5) / 2, 2));
        const lateral2 = Math.sqrt(h2 * h2 + Math.pow((c - 0.5) / 2, 2));
        areaFormaUnit = 2 * h1 * (l + c) + 2 * lateral1 * ((l + 0.5) / 2) + 2 * lateral2 * ((c + 0.5) / 2);
      } else {
        vConcretoUnit = l * c * h1;
        areaFormaUnit = 2 * h1 * (l + c);
      }

      areaBasePrumoVala = (l + 2 * folgaVala) * (c + 2 * folgaVala);

    } else if (item.tipoBloco === 'tres_estacas') {
      const b1 = item.b1Trap1 || 0.6;
      const b2 = item.b2Trap1 || 1.8;
      const hTrap1 = item.hTrap1 || 1.04;
      const b3 = item.b3Trap2 || 1.8;
      const b4 = item.b4Trap2 || 0.6;
      const hTrap2 = item.hTrap2 || 1.04;
      const hBloco = item.alturaH1 || 0.6;

      hTotalElemento = hBloco;

      const areaTrap1Apil = ((b1 + 2 * folgaLastro + b2 + 2 * folgaLastro) / 2) * (hTrap1 + folgaLastro);
      const areaTrap2Apil = ((b3 + 2 * folgaLastro + b4 + 2 * folgaLastro) / 2) * (hTrap2 + folgaLastro);
      apiloamentoUnit = areaTrap1Apil + areaTrap2Apil;

      const areaTrap1Conc = ((b1 + b2) / 2) * hTrap1;
      const areaTrap2Conc = ((b3 + b4) / 2) * hTrap2;
      vConcretoUnit = (areaTrap1Conc + areaTrap2Conc) * hBloco;

      const lat1 = Math.sqrt(Math.pow(b2 - b1, 2) + Math.pow(hTrap1, 2));
      const lat2 = Math.sqrt(Math.pow(b3 - b4, 2) + Math.pow(hTrap2, 2));
      const perimetro = b1 + b4 + 2 * (lat1 + lat2);
      areaFormaUnit = perimetro * hBloco;

      const areaTrap1Exc = ((b1 + 2 * folgaVala + b2 + 2 * folgaVala) / 2) * (hTrap1 + folgaVala);
      const areaTrap2Exc = ((b3 + 2 * folgaVala + b4 + 2 * folgaVala) / 2) * (hTrap2 + folgaVala);
      areaBasePrumoVala = areaTrap1Exc + areaTrap2Exc;

    } else if (item.tipoBloco === 'pre_moldado') {
      const l = item.comprimentoA || 1.6;
      const c = item.larguraB || 1.6;
      const hBloco = item.alturaH1 || 0.6;

      const lCol = item.lColarinho || 0.8;
      const cCol = item.cColarinho || 0.8;
      const hCol = item.hColarinho || 0.3;

      const lNMaior = item.lNichoMaior || 0.6;
      const lNMenor = item.lNichoMenor || 0.5;
      const cNMaior = item.cNichoMaior || 0.6;
      const cNMenor = item.cNichoMenor || 0.5;
      const hNicho = item.hNicho || 0.6;

      hTotalElemento = hBloco + hCol;
      apiloamentoUnit = (l + 2 * folgaLastro) * (c + 2 * folgaLastro);

      const vBruto = l * c * hBloco + lCol * cCol * hCol;
      const aNichoInf = lNMenor * cNMenor;
      const aNichoSup = lNMaior * cNMaior;
      const vNicho = (hNicho / 3) * (aNichoInf + aNichoSup + Math.sqrt(aNichoInf * aNichoSup));
      vConcretoUnit = Math.max(0, vBruto - vNicho);

      const latNichoL = Math.sqrt(Math.pow(hNicho, 2) + Math.pow((lNMaior - lNMenor) / 2, 2));
      const latNichoC = Math.sqrt(Math.pow(hNicho, 2) + Math.pow((cNMaior - cNMenor) / 2, 2));
      const areaFormaNicho = 2 * (((lNMaior + lNMenor) / 2) * latNichoL) + 2 * (((cNMaior + cNMenor) / 2) * latNichoC);

      areaFormaUnit = 2 * hBloco * (l + c) + 2 * hCol * (lCol + cCol) + areaFormaNicho;
      areaBasePrumoVala = (l + 2 * folgaVala) * (c + 2 * folgaVala);

    } else if (item.tipoBloco === 'tres_estacas_pre') {
      const b1 = item.b1Trap1 || 0.6;
      const b2 = item.b2Trap1 || 1.8;
      const hTrap1 = item.hTrap1 || 1.04;
      const b3 = item.b3Trap2 || 1.8;
      const b4 = item.b4Trap2 || 0.6;
      const hTrap2 = item.hTrap2 || 1.04;
      const hBloco = item.alturaH1 || 0.6;

      const lCol = item.lColarinho || 0.8;
      const cCol = item.cColarinho || 0.8;
      const hCol = item.hColarinho || 0.3;

      const lNMaior = item.lNichoMaior || 0.6;
      const lNMenor = item.lNichoMenor || 0.5;
      const cNMaior = item.cNichoMaior || 0.6;
      const cNMenor = item.cNichoMenor || 0.5;
      const hNicho = item.hNicho || 0.6;

      hTotalElemento = hBloco + hCol;

      const areaTrap1Apil = ((b1 + 2 * folgaLastro + b2 + 2 * folgaLastro) / 2) * (hTrap1 + folgaLastro);
      const areaTrap2Apil = ((b3 + 2 * folgaLastro + b4 + 2 * folgaLastro) / 2) * (hTrap2 + folgaLastro);
      apiloamentoUnit = areaTrap1Apil + areaTrap2Apil;

      const areaTrap1Conc = ((b1 + b2) / 2) * hTrap1;
      const areaTrap2Conc = ((b3 + b4) / 2) * hTrap2;
      const v3EstacasBruto = (areaTrap1Conc + areaTrap2Conc) * hBloco;
      const vColarinho = lCol * cCol * hCol;

      const aNichoInf = lNMenor * cNMenor;
      const aNichoSup = lNMaior * cNMaior;
      const vNicho = (hNicho / 3) * (aNichoInf + aNichoSup + Math.sqrt(aNichoInf * aNichoSup));
      vConcretoUnit = Math.max(0, v3EstacasBruto + vColarinho - vNicho);

      const lat1 = Math.sqrt(Math.pow(b2 - b1, 2) + Math.pow(hTrap1, 2));
      const lat2 = Math.sqrt(Math.pow(b3 - b4, 2) + Math.pow(hTrap2, 2));
      const perimetro3Estacas = b1 + b4 + 2 * (lat1 + lat2);

      const latNichoL = Math.sqrt(Math.pow(hNicho, 2) + Math.pow((lNMaior - lNMenor) / 2, 2));
      const latNichoC = Math.sqrt(Math.pow(hNicho, 2) + Math.pow((cNMaior - cNMenor) / 2, 2));
      const areaFormaNicho = 2 * (((lNMaior + lNMenor) / 2) * latNichoL) + 2 * (((cNMaior + cNMenor) / 2) * latNichoC);

      areaFormaUnit = perimetro3Estacas * hBloco + 2 * hCol * (lCol + cCol) + areaFormaNicho;

      const areaTrap1Exc = ((b1 + 2 * folgaVala + b2 + 2 * folgaVala) / 2) * (hTrap1 + folgaVala);
      const areaTrap2Exc = ((b3 + 2 * folgaVala + b4 + 2 * folgaVala) / 2) * (hTrap2 + folgaVala);
      areaBasePrumoVala = areaTrap1Exc + areaTrap2Exc;
    }

    const hExc = hSoloTopo + hTotalElemento + espLastro;

    let vEscavacaoUnit = areaBasePrumoVala * hExc;
    if (item.talude === 2) {
      const lExcSup = Math.sqrt(areaBasePrumoVala) + 2 * hExc;
      const aSupExc = lExcSup * lExcSup;
      vEscavacaoUnit = (hExc / 3) * (areaBasePrumoVala + aSupExc + Math.sqrt(areaBasePrumoVala * aSupExc));
    } else if (item.talude === 3) {
      const lExcSup = Math.sqrt(areaBasePrumoVala) + hExc;
      const aSupExc = lExcSup * lExcSup;
      vEscavacaoUnit = (hExc / 3) * (areaBasePrumoVala + aSupExc + Math.sqrt(areaBasePrumoVala * aSupExc));
    }

    const apiloamentoTotal = Math.round(q * apiloamentoUnit * 100) / 100;
    const vLastroTotal = Math.round(apiloamentoTotal * espLastro * 100) / 100;
    const vConcretoTotal = Math.round(q * vConcretoUnit * 100) / 100;
    const areaFormaTotal = Math.round(q * areaFormaUnit * 100) / 100;
    const vEscavacaoTotal = Math.round(q * vEscavacaoUnit * 100) / 100;
    const pesoAcoTotal = Math.round(vConcretoTotal * taxaAco * 100) / 100;
    const vReaterroTotal = Math.round(Math.max(0, vEscavacaoTotal - vLastroTotal - vConcretoTotal) * 100) / 100;
    const vBotaForaTotal = Math.round((vEscavacaoTotal - vReaterroTotal) * (1 + empolamento) * 100) / 100;

    return {
      apiloamentoTotal,
      vLastroTotal,
      vConcretoTotal,
      areaFormaTotal,
      vEscavacaoTotal,
      pesoAcoTotal,
      vReaterroTotal,
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
                <label className="text-[10px] font-semibold text-slate-500 block">Folga de Vala (m)</label>
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
          <CroquiBloco tipoInicial={tipoCroqui} />
        </div>
      </div>

      {/* Tabela de Elementos de Bloco */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Dimensionamento de Blocos de Fundação</h4>
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Bloco</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3 border-r border-slate-200 w-24">CÓDIGO</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-44">TIPO DE BLOCO</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-16 text-center">QTD</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-24 text-right">A (m)</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-24 text-right">B (m)</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-24 text-right">H1 (m)</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-24 text-right">H2 / H (m)</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-28 text-right bg-blue-50/40">CONCRETO (m³)</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-28 text-right bg-purple-50/40">FÔRMA (m²)</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-28 text-right bg-amber-50/40">AÇO (kg)</th>
                <th className="py-2.5 px-3 text-center w-12">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400 italic">
                    Nenhum bloco cadastrado. Clique no botão acima para adicionar.
                  </td>
                </tr>
              ) : (
                list.map((item, idx) => {
                  const m = calcularMetricasBloco(item);

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
                          value={item.tipoBloco}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            handleUpdateItem(idx, 'tipoBloco', val);
                            setTipoCroqui(val);
                          }}
                          className="w-full px-2 py-1 font-sans text-xs text-slate-700 bg-white border border-slate-200 rounded outline-none focus:border-blue-500"
                        >
                          <option value="moldado">Pilar Moldado In Loco</option>
                          <option value="tres_estacas">3 Estacas</option>
                          <option value="pre_moldado">Pilar Pré-Moldado</option>
                          <option value="tres_estacas_pre">3 Estacas Pré (Cálice)</option>
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
                          value={item.comprimentoA}
                          onChange={(e) => handleUpdateItem(idx, 'comprimentoA', parseFloat(e.target.value) || 0)}
                          className="w-16 text-right font-mono text-slate-800 bg-white border border-slate-200 rounded outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right">
                        <input
                          type="number"
                          step="0.05"
                          value={item.larguraB}
                          onChange={(e) => handleUpdateItem(idx, 'larguraB', parseFloat(e.target.value) || 0)}
                          className="w-16 text-right font-mono text-slate-800 bg-white border border-slate-200 rounded outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right">
                        <input
                          type="number"
                          step="0.05"
                          value={item.alturaH1}
                          onChange={(e) => handleUpdateItem(idx, 'alturaH1', parseFloat(e.target.value) || 0)}
                          className="w-16 text-right font-mono text-slate-800 bg-white border border-slate-200 rounded outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right">
                        <input
                          type="number"
                          step="0.05"
                          value={item.alturaH2}
                          onChange={(e) => handleUpdateItem(idx, 'alturaH2', parseFloat(e.target.value) || 0)}
                          className="w-16 text-right font-mono text-slate-800 bg-white border border-slate-200 rounded outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Resultados Derivados */}
                      <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-bold text-blue-900 bg-blue-50/20">
                        {m.vConcretoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-bold text-purple-900 bg-purple-50/20">
                        {m.areaFormaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-bold text-amber-900 bg-amber-50/20">
                        {m.pesoAcoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </td>

                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer hover:bg-slate-100 rounded"
                          title="Excluir Bloco"
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
          const m = calcularMetricasBloco(item);
          acc.vConcreto += m.vConcretoTotal;
          acc.areaForma += m.areaFormaTotal;
          acc.pesoAco += m.pesoAcoTotal;
          acc.vEscavacao += m.vEscavacaoTotal;
          acc.vLastro += m.vLastroTotal;
          acc.vReaterro += m.vReaterroTotal;
          acc.vBotaFora += m.vBotaForaTotal;
          return acc;
        }, {
          vConcreto: 0,
          areaForma: 0,
          pesoAco: 0,
          vEscavacao: 0,
          vLastro: 0,
          vReaterro: 0,
          vBotaFora: 0
        });

        const variaveisDerivadas = [
          { key: 'vConcreto', nome: 'Volume de Concreto do Bloco', valor: totaisGerais.vConcreto, unidade: 'm³' },
          { key: 'areaForma', nome: 'Área de Fôrma Lateral', valor: totaisGerais.areaForma, unidade: 'm²' },
          { key: 'pesoAco', nome: 'Armação em Aço CA-50/60', valor: totaisGerais.pesoAco, unidade: 'kg' },
          { key: 'vEscavacao', nome: 'Escavação de Vala', valor: totaisGerais.vEscavacao, unidade: 'm³' },
          { key: 'vLastro', nome: 'Lastro de Concreto Magro', valor: totaisGerais.vLastro, unidade: 'm³' },
          { key: 'vReaterro', nome: 'Reaterro Compactado', valor: totaisGerais.vReaterro, unidade: 'm³' },
          { key: 'vBotaFora', nome: 'Carga e Transporte Bota-Fora (Empolado)', valor: totaisGerais.vBotaFora, unidade: 'm³' }
        ];

        const handleConfirmApply = (targetId?: string) => {
          if (!onApplySelectedMetric) return;
          const selMetric = variaveisDerivadas.find(v => v.key === selectedMetric) || variaveisDerivadas[0];
          const totalEst = list.reduce((acc, i) => acc + (i.quantidade || 1), 0);
          const eqLit = `Σ Blocos [${totalEst} un] → ${selMetric.nome}`;
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
                    Escolha na tabela abaixo a linha do insumo ou a linha principal para aplicar o valor calculated:
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
