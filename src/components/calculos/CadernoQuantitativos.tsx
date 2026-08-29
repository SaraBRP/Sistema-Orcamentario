import React from 'react';
import { Plus, Trash2, Calculator, Info, HelpCircle } from 'lucide-react';
import type { LinhaMedicaoQuantitativo } from '../../types/calculos';

interface CadernoQuantitativosProps {
  linhas: LinhaMedicaoQuantitativo[];
  onChange: (novasLinhas: LinhaMedicaoQuantitativo[]) => void;
  unidadePadrao?: string;
  readonly?: boolean;
}

export function evalLinhaMedicao(linha: LinhaMedicaoQuantitativo): number {
  const rep = Number(linha.repeticoes) || 1;
  const l = Number(linha.comprimento) || 0;
  const w = Number(linha.largura) || 0;
  const h = Number(linha.altura) || 0;
  const d = Number(linha.desconto) || 0;

  switch (linha.formulaTipo) {
    case 'area':
      // Se informou L e H, usa L * H. Se informou L e W, usa L * W.
      const dim2 = (h > 0 ? h : (w > 0 ? w : 1));
      return Math.max(0, (rep * l * dim2) - d);

    case 'volume':
      const dimH = h > 0 ? h : 1;
      const dimW = w > 0 ? w : 1;
      return Math.max(0, (rep * l * dimW * dimH) - d);

    case 'extensao':
      return Math.max(0, (rep * l) - d);

    case 'peso_aco':
      // Se h representa a bitola em mm: peso linear = mm² / 162 kg/m
      const bitola = h > 0 ? h : 10;
      const pesoLinear = (bitola * bitola) / 162;
      return Math.max(0, (rep * l * pesoLinear) - d);

    case 'customizada':
      if (!linha.formulaCustom) return 0;
      try {
        // Expressão limpa substituindo variáveis legíveis
        let expr = linha.formulaCustom
          .replace(/Rep/gi, String(rep))
          .replace(/Comp|L/gi, String(l))
          .replace(/Larg|W/gi, String(w))
          .replace(/Alt|Esp|H/gi, String(h))
          .replace(/Desconto|D/gi, String(d));
        
        // Avaliação matemática segura sem eval global
        if (!/^[0-9\.\s\+\-\*\/\(\)]+$/.test(expr)) {
          return 0;
        }
        // eslint-disable-next-line no-new-func
        const res = Function(`"use strict"; return (${expr});`)();
        return typeof res === 'number' && !isNaN(res) ? Math.max(0, res) : 0;
      } catch {
        return 0;
      }

    default:
      return 0;
  }
}

export const CadernoQuantitativos: React.FC<CadernoQuantitativosProps> = ({
  linhas,
  onChange,
  unidadePadrao = 'un',
  readonly = false
}) => {
  const handleAddLinha = () => {
    const novaLinha: LinhaMedicaoQuantitativo = {
      id: `m-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      localizacao: '',
      repeticoes: 1,
      comprimento: 0,
      largura: 0,
      altura: 0,
      desconto: 0,
      formulaTipo: 'volume',
      resultadoLinha: 0
    };
    onChange([...linhas, novaLinha]);
  };

  const handleUpdateLinha = (index: number, campo: keyof LinhaMedicaoQuantitativo, valor: any) => {
    const copia = [...linhas];
    const itemAtualizado = { ...copia[index], [campo]: valor };
    itemAtualizado.resultadoLinha = evalLinhaMedicao(itemAtualizado);
    copia[index] = itemAtualizado;
    onChange(copia);
  };

  const handleRemoveLinha = (index: number) => {
    const copia = linhas.filter((_, i) => i !== index);
    onChange(copia);
  };

  const totalAcumulado = linhas.reduce((acc, l) => acc + (evalLinhaMedicao(l) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div>
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Calculator className="w-4 h-4 text-blue-600" />
            Caderno de Levantamento Métrico & Fórmulas
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Registre trechos, dimensões geométricas, vãos descontados ou fórmulas personalizadas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-2xs text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Levantado</span>
            <span className="text-base font-extrabold font-mono text-blue-700">
              {totalAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {unidadePadrao}
            </span>
          </div>

          {!readonly && (
            <button
              type="button"
              onClick={handleAddLinha}
              className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Trecho</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabela de Medição */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3 min-w-[200px]">Localização / Trecho / Pavimento</th>
                <th className="py-2.5 px-3 w-20 text-center">Rep.</th>
                <th className="py-2.5 px-3 w-24 text-right">Comp. (L)</th>
                <th className="py-2.5 px-3 w-24 text-right">Larg. (W)</th>
                <th className="py-2.5 px-3 w-24 text-right">Alt./Esp. (H)</th>
                <th className="py-2.5 px-3 min-w-[140px]">Preset / Fórmula</th>
                <th className="py-2.5 px-3 w-28 text-right">Desconto (D)</th>
                <th className="py-2.5 px-3 w-32 text-right">Subtotal</th>
                {!readonly && <th className="py-2.5 px-2 w-12 text-center"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {linhas.length === 0 ? (
                <tr>
                  <td colSpan={readonly ? 9 : 10} className="py-10 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <HelpCircle className="w-8 h-8 text-slate-300 stroke-1" />
                      <p>Nenhuma linha de medição cadastrada no caderno.</p>
                      {!readonly && (
                        <button
                          type="button"
                          onClick={handleAddLinha}
                          className="mt-1 text-xs font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                        >
                          Clique aqui para adicionar a primeira medição
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                linhas.map((linha, index) => {
                  const subtotal = evalLinhaMedicao(linha);
                  return (
                    <tr key={linha.id || index} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {index + 1}
                      </td>

                      {/* Localização */}
                      <td className="py-2 px-3">
                        {readonly ? (
                          <span>{linha.localizacao || 'Trecho Geral'}</span>
                        ) : (
                          <input
                            type="text"
                            placeholder="Ex: Pav. 1 - Viga V101"
                            value={linha.localizacao}
                            onChange={(e) => handleUpdateLinha(index, 'localizacao', e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs bg-white"
                          />
                        )}
                      </td>

                      {/* Repetições */}
                      <td className="py-2 px-3">
                        {readonly ? (
                          <span className="text-center block">{linha.repeticoes}</span>
                        ) : (
                          <input
                            type="number"
                            min="1"
                            value={linha.repeticoes || ''}
                            onChange={(e) => handleUpdateLinha(index, 'repeticoes', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-center font-mono text-xs bg-white"
                          />
                        )}
                      </td>

                      {/* Comprimento */}
                      <td className="py-2 px-3">
                        {readonly ? (
                          <span className="text-right block font-mono">{linha.comprimento}</span>
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={linha.comprimento || ''}
                            onChange={(e) => handleUpdateLinha(index, 'comprimento', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-right font-mono text-xs bg-white"
                          />
                        )}
                      </td>

                      {/* Largura */}
                      <td className="py-2 px-3">
                        {readonly ? (
                          <span className="text-right block font-mono">{linha.largura}</span>
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={linha.largura || ''}
                            onChange={(e) => handleUpdateLinha(index, 'largura', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-right font-mono text-xs bg-white"
                          />
                        )}
                      </td>

                      {/* Altura/Espessura */}
                      <td className="py-2 px-3">
                        {readonly ? (
                          <span className="text-right block font-mono">{linha.altura}</span>
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={linha.altura || ''}
                            onChange={(e) => handleUpdateLinha(index, 'altura', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-right font-mono text-xs bg-white"
                          />
                        )}
                      </td>

                      {/* Formula Preset */}
                      <td className="py-2 px-3">
                        {readonly ? (
                          <span className="capitalize">{linha.formulaTipo}</span>
                        ) : (
                          <div className="space-y-1">
                            <select
                              value={linha.formulaTipo}
                              onChange={(e) => handleUpdateLinha(index, 'formulaTipo', e.target.value as any)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-xs bg-white font-medium"
                            >
                              <option value="volume">Volume (Rep × L × W × H - D)</option>
                              <option value="area">Área (Rep × L × H - D)</option>
                              <option value="extensao">Extensão (Rep × L - D)</option>
                              <option value="peso_aco">Peso de Aço (Rep × L × Ø²/162)</option>
                              <option value="customizada">Fórmula Livre / Custom</option>
                            </select>

                            {linha.formulaTipo === 'customizada' && (
                              <input
                                type="text"
                                placeholder="Ex: (L * H * Rep) - D"
                                value={linha.formulaCustom || ''}
                                onChange={(e) => handleUpdateLinha(index, 'formulaCustom', e.target.value)}
                                className="w-full px-2 py-1 border border-blue-300 rounded font-mono text-[11px] bg-blue-50/50 text-blue-900 outline-none"
                              />
                            )}
                          </div>
                        )}
                      </td>

                      {/* Desconto */}
                      <td className="py-2 px-3">
                        {readonly ? (
                          <span className="text-right block font-mono text-rose-600">{linha.desconto ? `-${linha.desconto}` : '0'}</span>
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={linha.desconto || ''}
                            onChange={(e) => handleUpdateLinha(index, 'desconto', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-right font-mono text-xs bg-white text-rose-600 font-medium"
                          />
                        )}
                      </td>

                      {/* Subtotal */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 text-xs">
                        {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </td>

                      {/* Ações */}
                      {!readonly && (
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLinha(index)}
                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="Remover linha"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé com Dica */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-slate-500 text-[11px]">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>
              <b>Legenda Fórmulas:</b> Rep = Repetições, L = Comprimento, W = Largura, H = Altura/Espessura, D = Desconto.
            </span>
          </div>
          <span className="font-semibold text-slate-700">
            {linhas.length} {linhas.length === 1 ? 'trecho cadastrado' : 'trechos cadastrados'}
          </span>
        </div>
      </div>
    </div>
  );
};
