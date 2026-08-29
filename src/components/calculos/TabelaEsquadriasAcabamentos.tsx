import React, { useState } from 'react';
import { Plus, Trash2, Home, DoorOpen, Check, Target, Layers } from 'lucide-react';
import type { TargetInsumoItem } from './TabelaSapatas';
import { ItemBindingInfoEye } from './ItemBindingInfoEye';

export interface VaoItem {
  id: string;
  codigoDescricao: string; // ex: "Porta PM1-60", "Janela J1", "Vão de Passagem"
  tipo: 'porta' | 'janela' | 'vao_livre';
  larguraM: number;
  alturaM: number;
  quantidade: number;
  // Parâmetros de Pintura e Vidros
  coeficientePintura: number; // ex: 3 (com batente), 2 (sem batente), 5 (veneziana)
  descontoPinturaM2: number;
  descontoVidroM2: number;
}

export interface ComodoItem {
  id: string;
  predioSetor: string;
  dependenciaNome: string;
  quantidadeComodos: number;
  numPavimentos: number;
  numEdificios: number;
  larguraM: number;
  comprimentoM: number;
  peDireitoM: number;
  outrosPisoM2: number;
  outrosParedeM2: number;
  outrosTetoM2: number;
  outrosRodapeM: number;
  alturaImpermeabilizacaoM: number;
  vaos: VaoItem[];
}

export interface HeaderGlobalEsquadriasAcabamentos {
  aplicarRegraTCPO: boolean; // Se true, vãos menores que 2m² não são descontados em alvenaria conforme norma TCPO
  alturaPadraoImpermeabilizacaoM: number;
}

interface TabelaEsquadriasAcabamentosProps {
  headerGlobal: HeaderGlobalEsquadriasAcabamentos;
  onChangeHeaderGlobal: (header: HeaderGlobalEsquadriasAcabamentos) => void;
  comodos: ComodoItem[];
  onChangeComodos: (comodos: ComodoItem[]) => void;
  parentItem?: TargetInsumoItem;
  childItems?: TargetInsumoItem[];
  onApplySelectedMetric?: (metricKey: string, valorTotal: number, equacaoLiteral: string, substituicaoText: string, targetItemId?: string) => void;
}

export const TabelaEsquadriasAcabamentos: React.FC<TabelaEsquadriasAcabamentosProps> = ({
  headerGlobal,
  onChangeHeaderGlobal,
  comodos,
  onChangeComodos,
  parentItem,
  childItems,
  onApplySelectedMetric
}) => {
  const [selectedMetric, setSelectedMetric] = useState<string>('areaParedeLiquida');
  const [selectedTargetItemId, setSelectedTargetItemId] = useState<string>('');

  const targetList = childItems && childItems.length > 0 ? childItems : (parentItem ? [parentItem] : []);

  const handleAddComodo = () => {
    const newItem: ComodoItem = {
      id: `comodo-${Date.now()}`,
      predioSetor: '1º Pavimento',
      dependenciaNome: `Cômodo / Dependência ${comodos.length + 1}`,
      quantidadeComodos: 1,
      numPavimentos: 1,
      numEdificios: 1,
      larguraM: 3.00,
      comprimentoM: 4.00,
      peDireitoM: 2.80,
      outrosPisoM2: 0,
      outrosParedeM2: 0,
      outrosTetoM2: 0,
      outrosRodapeM: 0,
      alturaImpermeabilizacaoM: 0.60,
      vaos: [
        {
          id: `vao-${Date.now()}-1`,
          codigoDescricao: 'Porta P1 (0.80 x 2.10m)',
          tipo: 'porta',
          larguraM: 0.80,
          alturaM: 2.10,
          quantidade: 1,
          coeficientePintura: 3,
          descontoPinturaM2: 0,
          descontoVidroM2: 0
        },
        {
          id: `vao-${Date.now()}-2`,
          codigoDescricao: 'Janela J1 (1.20 x 1.00m)',
          tipo: 'janela',
          larguraM: 1.20,
          alturaM: 1.00,
          quantidade: 1,
          coeficientePintura: 2,
          descontoPinturaM2: 0,
          descontoVidroM2: 0
        }
      ]
    };
    onChangeComodos([...comodos, newItem]);
  };

  const handleUpdateComodo = (index: number, field: keyof ComodoItem, val: any) => {
    const copia = [...comodos];
    copia[index] = { ...copia[index], [field]: val };
    onChangeComodos(copia);
  };

  const handleRemoveComodo = (index: number) => {
    const copia = comodos.filter((_, i) => i !== index);
    onChangeComodos(copia);
  };

  const handleAddVao = (comodoIndex: number) => {
    const copia = [...comodos];
    const newVao: VaoItem = {
      id: `vao-${Date.now()}`,
      codigoDescricao: 'Nova Esquadria / Vão',
      tipo: 'janela',
      larguraM: 1.00,
      alturaM: 1.00,
      quantidade: 1,
      coeficientePintura: 2,
      descontoPinturaM2: 0,
      descontoVidroM2: 0
    };
    copia[comodoIndex].vaos.push(newVao);
    onChangeComodos(copia);
  };

  const handleUpdateVao = (comodoIndex: number, vaoIndex: number, field: keyof VaoItem, val: any) => {
    const copia = [...comodos];
    const vaos = [...copia[comodoIndex].vaos];
    vaos[vaoIndex] = { ...vaos[vaoIndex], [field]: val };
    copia[comodoIndex].vaos = vaos;
    onChangeComodos(copia);
  };

  const handleRemoveVao = (comodoIndex: number, vaoIndex: number) => {
    const copia = [...comodos];
    copia[comodoIndex].vaos = copia[comodoIndex].vaos.filter((_, i) => i !== vaoIndex);
    onChangeComodos(copia);
  };

  // CÁLCULO GERAL ACUMULADO
  const calcularMetricasGerais = () => {
    let areaPisoTotal = 0;
    let areaTetoTotal = 0;
    let areaParedeBrutaTotal = 0;
    let descontoVaosParedeTotal = 0;
    let rodapeLiquidoTotal = 0;
    let areaCaixilhosTotal = 0;
    let areaPinturaEsquadriasTotal = 0;
    let areaVidrosTotal = 0;
    let areaImpermeabilizacaoTotal = 0;

    comodos.forEach(c => {
      const qComodos = c.quantidadeComodos || 0;
      const nPav = c.numPavimentos || 0;
      const nEdif = c.numEdificios || 0;

      let repeticoes = qComodos;
      if (nPav + nEdif > 0) {
        if (nPav === 0 || nEdif === 0) repeticoes *= (nPav + nEdif);
        else repeticoes *= (nPav * nEdif);
      }

      const larg = c.larguraM || 0;
      const comp = c.comprimentoM || 0;
      const peDir = c.peDireitoM || 0;

      const perimetroTeorico = (larg > 0 && comp > 0) ? 2 * (larg + comp) : (larg + comp);

      const areaPisoUnit = larg * comp + (c.outrosPisoM2 || 0);
      const areaTetoUnit = larg * comp + (c.outrosTetoM2 || 0);
      const areaParedeBrutaUnit = perimetroTeorico * peDir + (c.outrosParedeM2 || 0);

      let descVaosParedeUnit = 0;
      let descRodapePortasUnit = 0;

      (c.vaos || []).forEach(v => {
        const qVao = v.quantidade || 0;
        const lVao = v.larguraM || 0;
        const hVao = v.alturaM || 0;
        const areaVao = lVao * hVao * qVao;

        let descVaoCalculado = areaVao;
        if (headerGlobal.aplicarRegraTCPO) {
          descVaoCalculado = Math.max(0, areaVao - 2.0 * qVao);
        }

        descVaosParedeUnit += descVaoCalculado;

        if (v.tipo === 'porta') {
          descRodapePortasUnit += lVao * qVao;
        }

        // Esquadrias globais acumuladas
        const areaCaixilhoUnit = areaVao;
        const coefPint = v.coeficientePintura || 2;
        const areaPinturaUnit = (lVao * hVao * coefPint - v.descontoPinturaM2 * 2) * qVao;

        const lArred = Math.ceil(lVao / 0.05) * 0.05;
        const hArred = Math.ceil(hVao / 0.05) * 0.05;
        const areaVidroUnit = Math.max(0, (lArred * hArred * qVao) - (v.descontoVidroM2 * qVao));

        areaCaixilhosTotal += areaCaixilhoUnit * repeticoes;
        areaPinturaEsquadriasTotal += areaPinturaUnit * repeticoes;
        areaVidrosTotal += areaVidroUnit * repeticoes;
      });

      const rodapeLiquidoUnit = Math.max(0, perimetroTeorico - descRodapePortasUnit + (c.outrosRodapeM || 0));
      const areaImperUnit = areaPisoUnit + perimetroTeorico * (c.alturaImpermeabilizacaoM || 0.60);

      areaPisoTotal += areaPisoUnit * repeticoes;
      areaTetoTotal += areaTetoUnit * repeticoes;
      areaParedeBrutaTotal += areaParedeBrutaUnit * repeticoes;
      descontoVaosParedeTotal += descVaosParedeUnit * repeticoes;
      rodapeLiquidoTotal += rodapeLiquidoUnit * repeticoes;
      areaImpermeabilizacaoTotal += areaImperUnit * repeticoes;
    });

    const areaParedeLiquidaTotal = Math.max(0, areaParedeBrutaTotal - descontoVaosParedeTotal);

    return {
      areaPisoTotal,
      areaTetoTotal,
      areaParedeBrutaTotal,
      descontoVaosParedeTotal,
      areaParedeLiquidaTotal,
      rodapeLiquidoTotal,
      areaCaixilhosTotal,
      areaPinturaEsquadriasTotal,
      areaVidrosTotal,
      areaImpermeabilizacaoTotal
    };
  };

  const metricas = calcularMetricasGerais();

  return (
    <div className="space-y-5">
      {/* PAINEL GLOBAL DE CRITÉRIOS TCPO E OPÇÕES */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
              Configurações do Levantamento de Esquadrias & Revestimentos
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
            <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs hover:bg-slate-50">
              <input
                type="checkbox"
                checked={headerGlobal.aplicarRegraTCPO}
                onChange={(e) => onChangeHeaderGlobal({ ...headerGlobal, aplicarRegraTCPO: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span>Aplicar Regra TCPO 13 / AF (Desconto de vãos a partir de 2,00m²)</span>
            </label>
          </div>
        </div>
      </div>

      {/* LISTA DE CÔMODOS & DEPENDÊNCIAS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
            <Home className="w-4 h-4 text-blue-600" />
            Dependências & Cômodos Levantados ({comodos.length})
          </h4>
          <button
            type="button"
            onClick={handleAddComodo}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-xl shadow-2xs cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Cômodo / Dependência</span>
          </button>
        </div>

        {comodos.map((c, cIdx) => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-2xs hover:border-slate-300 transition-colors">
            {/* CABEÇALHO DO CÔMODO */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                <span className="font-mono font-bold text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-lg">
                  #{cIdx + 1}
                </span>
                <input
                  type="text"
                  value={c.predioSetor}
                  onChange={(e) => handleUpdateComodo(cIdx, 'predioSetor', e.target.value)}
                  placeholder="Setor / Pavimento"
                  className="w-36 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  value={c.dependenciaNome}
                  onChange={(e) => handleUpdateComodo(cIdx, 'dependenciaNome', e.target.value)}
                  placeholder="Nome do Cômodo / Dependência"
                  className="flex-1 text-xs font-bold text-slate-900 border border-slate-200 rounded-lg px-2.5 py-1 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
                <div className="flex items-center gap-1">
                  <span>Qtd Cômodos:</span>
                  <input
                    type="number"
                    min="1"
                    value={c.quantidadeComodos}
                    onChange={(e) => handleUpdateComodo(cIdx, 'quantidadeComodos', parseFloat(e.target.value) || 1)}
                    className="w-14 text-center font-mono font-bold border border-slate-200 rounded-lg py-0.5"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span>Pavimentos:</span>
                  <input
                    type="number"
                    min="1"
                    value={c.numPavimentos}
                    onChange={(e) => handleUpdateComodo(cIdx, 'numPavimentos', parseFloat(e.target.value) || 1)}
                    className="w-14 text-center font-mono font-bold border border-slate-200 rounded-lg py-0.5"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveComodo(cIdx)}
                  className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors ml-2"
                  title="Remover Cômodo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* DIMENSÕES E PARÂMETROS DO CÔMODO */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 bg-slate-50/60 p-3 rounded-xl border border-slate-100 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Largura (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={c.larguraM}
                  onChange={(e) => handleUpdateComodo(cIdx, 'larguraM', parseFloat(e.target.value) || 0)}
                  className="w-full font-mono font-bold border border-slate-200 rounded-lg p-1.5 bg-white text-right outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Comprimento (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={c.comprimentoM}
                  onChange={(e) => handleUpdateComodo(cIdx, 'comprimentoM', parseFloat(e.target.value) || 0)}
                  className="w-full font-mono font-bold border border-slate-200 rounded-lg p-1.5 bg-white text-right outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Pé-Direito (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={c.peDireitoM}
                  onChange={(e) => handleUpdateComodo(cIdx, 'peDireitoM', parseFloat(e.target.value) || 0)}
                  className="w-full font-mono font-bold border border-slate-200 rounded-lg p-1.5 bg-white text-right outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Outros Piso (m²)</label>
                <input
                  type="number"
                  step="0.01"
                  value={c.outrosPisoM2}
                  onChange={(e) => handleUpdateComodo(cIdx, 'outrosPisoM2', parseFloat(e.target.value) || 0)}
                  className="w-full font-mono border border-slate-200 rounded-lg p-1.5 bg-white text-right outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Outros Parede (m²)</label>
                <input
                  type="number"
                  step="0.01"
                  value={c.outrosParedeM2}
                  onChange={(e) => handleUpdateComodo(cIdx, 'outrosParedeM2', parseFloat(e.target.value) || 0)}
                  className="w-full font-mono border border-slate-200 rounded-lg p-1.5 bg-white text-right outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Outros Rodapé (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={c.outrosRodapeM}
                  onChange={(e) => handleUpdateComodo(cIdx, 'outrosRodapeM', parseFloat(e.target.value) || 0)}
                  className="w-full font-mono border border-slate-200 rounded-lg p-1.5 bg-white text-right outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Alt. Imper. (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={c.alturaImpermeabilizacaoM}
                  onChange={(e) => handleUpdateComodo(cIdx, 'alturaImpermeabilizacaoM', parseFloat(e.target.value) || 0)}
                  className="w-full font-mono border border-slate-200 rounded-lg p-1.5 bg-white text-right outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* ESQUADRIAS E VÃOS DO CÔMODO */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <DoorOpen className="w-3.5 h-3.5 text-blue-600" />
                  Vãos & Esquadrias deste Cômodo ({c.vaos.length})
                </span>
                <button
                  type="button"
                  onClick={() => handleAddVao(cIdx)}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Incluir Vão / Esquadria</span>
                </button>
              </div>

              {c.vaos.length === 0 ? (
                <div className="p-2 text-center text-xs text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  Nenhum vão cadastrado. Clique em "Incluir Vão / Esquadria" para descontar portas/janelas.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/70 text-slate-600 text-[10px] uppercase tracking-wide border-b border-slate-200">
                        <th className="py-1.5 px-2">Descrição Livre do Vão / Esquadria</th>
                        <th className="py-1.5 px-2 text-center">Tipo</th>
                        <th className="py-1.5 px-2 text-right">Larg. (m)</th>
                        <th className="py-1.5 px-2 text-right">Alt. (m)</th>
                        <th className="py-1.5 px-2 text-center">Qtd (un)</th>
                        <th className="py-1.5 px-2 text-right">Área Vão (m²)</th>
                        <th className="py-1.5 px-2 text-center">Coef. Pintura</th>
                        <th className="py-1.5 px-2 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {c.vaos.map((v, vIdx) => {
                        const areaVaoUnit = (v.larguraM || 0) * (v.alturaM || 0) * (v.quantidade || 0);

                        return (
                          <tr key={v.id || vIdx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-1 px-2">
                              <input
                                type="text"
                                value={v.codigoDescricao}
                                onChange={(e) => handleUpdateVao(cIdx, vIdx, 'codigoDescricao', e.target.value)}
                                placeholder="ex: Porta P1 80x210"
                                className="w-full font-medium text-slate-800 border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500"
                              />
                            </td>
                            <td className="py-1 px-2 text-center">
                              <select
                                value={v.tipo}
                                onChange={(e) => handleUpdateVao(cIdx, vIdx, 'tipo', e.target.value as any)}
                                className="border border-slate-200 rounded px-1.5 py-1 text-slate-700 bg-white font-medium outline-none focus:border-blue-500"
                              >
                                <option value="porta">Porta</option>
                                <option value="janela">Janela</option>
                                <option value="vao_livre">Vão Livre</option>
                              </select>
                            </td>
                            <td className="py-1 px-2 text-right">
                              <input
                                type="number"
                                step="0.01"
                                value={v.larguraM}
                                onChange={(e) => handleUpdateVao(cIdx, vIdx, 'larguraM', parseFloat(e.target.value) || 0)}
                                className="w-16 font-mono text-right border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-blue-500"
                              />
                            </td>
                            <td className="py-1 px-2 text-right">
                              <input
                                type="number"
                                step="0.01"
                                value={v.alturaM}
                                onChange={(e) => handleUpdateVao(cIdx, vIdx, 'alturaM', parseFloat(e.target.value) || 0)}
                                className="w-16 font-mono text-right border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-blue-500"
                              />
                            </td>
                            <td className="py-1 px-2 text-center">
                              <input
                                type="number"
                                min="1"
                                value={v.quantidade}
                                onChange={(e) => handleUpdateVao(cIdx, vIdx, 'quantidade', parseFloat(e.target.value) || 1)}
                                className="w-14 font-mono font-bold text-center border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-blue-500"
                              />
                            </td>
                            <td className="py-1 px-2 text-right font-mono font-bold text-slate-800">
                              {areaVaoUnit.toFixed(2)}
                            </td>
                            <td className="py-1 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={v.coeficientePintura}
                                onChange={(e) => handleUpdateVao(cIdx, vIdx, 'coeficientePintura', parseFloat(e.target.value) || 0)}
                                className="w-14 font-mono text-center border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-blue-500"
                                title="Multiplicador de pintura (ex: 3 para porta com batente, 2 sem batente)"
                              />
                            </td>
                            <td className="py-1 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveVao(cIdx, vIdx)}
                                className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                                title="Excluir Vão"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* PAINEL DE SELEÇÃO E TRANSFERÊNCIA DE MÉTRICAS DERIVADAS (TABELA LIMPA E CLARA) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs space-y-0">
        <div className="p-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" />
            <h4 className="font-bold text-xs uppercase tracking-wide text-slate-800">
              Métricas Resultantes do Levantamento (10 Variáveis Exportadas)
            </h4>
          </div>

          {targetList.length > 0 && (() => {
            const currentTargetItem = selectedTargetItemId
              ? (selectedTargetItemId === parentItem?.id ? parentItem : childItems?.find(c => c.id === selectedTargetItemId))
              : parentItem;
            return (
              <div className="flex items-center gap-2 text-xs">
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
        </div>

        <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-2xs">
          <table className="w-full min-w-[750px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold text-slate-600 uppercase tracking-wide">
                <th className="py-2.5 px-3 border-r border-slate-200">Métrica / Descrição</th>
                <th className="py-2.5 px-3 border-r border-slate-200">Fórmula / Equação Literal</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-center w-20">Unidade</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-right w-36 bg-blue-50/40">Resultado Calculado</th>
                <th className="py-2.5 px-3 text-center w-36">Ação do Vínculo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-[11.5px]">
              {[
                { key: 'areaParedeLiquida', label: 'Parede Líquida (Alvenaria/Pintura)', val: metricas.areaParedeLiquidaTotal, unit: 'm²', eq: 'A_parede_liquida = A_parede_bruta - Desconto_Vãos', subst: `Área Parede Líquida = ${metricas.areaParedeBrutaTotal.toFixed(2)} m² - ${metricas.descontoVaosParedeTotal.toFixed(2)} m²` },
                { key: 'areaPiso', label: 'Área de Piso Total', val: metricas.areaPisoTotal, unit: 'm²', eq: 'A_piso = Σ (Largura × Comprimento + Outros)', subst: `Área Piso Total = ${metricas.areaPisoTotal.toFixed(2)} m²` },
                { key: 'areaTeto', label: 'Área de Teto / Forro', val: metricas.areaTetoTotal, unit: 'm²', eq: 'A_teto = Σ (Largura × Comprimento + Outros Teto)', subst: `Área Teto = ${metricas.areaTetoTotal.toFixed(2)} m²` },
                { key: 'rodapeLiquido', label: 'Rodapé Líquido', val: metricas.rodapeLiquidoTotal, unit: 'm', eq: 'R_liquido = Perímetro - Largura de Portas', subst: `Rodapé Líquido = ${metricas.rodapeLiquidoTotal.toFixed(2)} m` },
                { key: 'areaCaixilhos', label: 'Caixilhos / Esquadrias', val: metricas.areaCaixilhosTotal, unit: 'm²', eq: 'A_esquadrias = Σ (Largura × Altura × Qtd)', subst: `Área Esquadrias = ${metricas.areaCaixilhosTotal.toFixed(2)} m²` },
                { key: 'areaPinturaEsquadrias', label: 'Pintura em Esquadrias', val: metricas.areaPinturaEsquadriasTotal, unit: 'm²', eq: 'A_pintura_esq = Σ (Área Vão × Coef. Pintura)', subst: `Pintura Esquadrias = ${metricas.areaPinturaEsquadriasTotal.toFixed(2)} m²` },
                { key: 'areaVidros', label: 'Área de Vidros (Mult. 5cm)', val: metricas.areaVidrosTotal, unit: 'm²', eq: 'A_vidros = Σ (Arredondamento vãos a cada 5cm)', subst: `Área Vidros = ${metricas.areaVidrosTotal.toFixed(2)} m²` },
                { key: 'areaImpermeabilizacao', label: 'Impermeabilização', val: metricas.areaImpermeabilizacaoTotal, unit: 'm²', eq: 'A_imper = A_piso + Perímetro × h_imper', subst: `Área Impermeabilização = ${metricas.areaImpermeabilizacaoTotal.toFixed(2)} m²` },
              ].map(m => {
                const isSelected = selectedMetric === m.key;
                return (
                  <tr
                    key={m.key}
                    onClick={() => setSelectedMetric(m.key)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/80 font-semibold text-blue-950' : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <td className="py-2.5 px-3 border-r border-slate-200 font-sans font-bold">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-blue-600' : 'bg-slate-300'}`} />
                        <span>{m.label}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200 text-slate-600 font-mono text-[10.5px]">
                      {m.eq}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200 text-center font-bold text-blue-700">
                      {m.unit}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200 text-right font-extrabold text-blue-900 bg-blue-50/30">
                      {m.val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {onApplySelectedMetric ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMetric(m.key);
                            onApplySelectedMetric(
                              m.key,
                              m.val,
                              m.eq,
                              m.subst,
                              selectedTargetItemId || undefined
                            );
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer shadow-2xs ${
                            isSelected
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-white hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Aplicar</span>
                        </button>
                      ) : (
                        <span className="text-[10.5px] text-slate-400 font-normal">Calculado</span>
                      )}
                    </td>
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
