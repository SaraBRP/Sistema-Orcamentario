import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Link, Calculator, CheckCircle2 } from 'lucide-react';
import type { CalculoItem, ModuloCalculoId, CalculoResultado, VinculoEAP } from '../../types/calculos';
import { FundacoesForm } from './modules/FundacoesForm';
import { SuperestruturaForm } from './modules/SuperestruturaForm';
import { PreMoldadosForm } from './modules/PreMoldadosForm';
import { PisosForm } from './modules/PisosForm';
import { DrenagemForm } from './modules/DrenagemForm';
import { VedacoesForm } from './modules/VedacoesForm';
import { PitsReservatoriosForm } from './modules/PitsReservatoriosForm';
import { InstalacoesForm } from './modules/InstalacoesForm';

interface OrcamentoItemSimple {
  id: string;
  item_eap: string;
  descricao: string;
  unidade: string;
  quantidade: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  calculo: CalculoItem | null;
  moduloId: ModuloCalculoId;
  orcamentoId: string;
  itensEap: OrcamentoItemSimple[];
  onSaveCalculo: (calculo: CalculoItem) => void;
  onDeleteCalculo?: (id: string) => void;
}

export const CalculoDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  calculo,
  moduloId,
  orcamentoId,
  itensEap,
  onSaveCalculo,
  onDeleteCalculo
}) => {
  const [nome, setNome] = useState('');
  const [predioSetor, setPredioSetor] = useState('');
  const [parametros, setParametros] = useState<Record<string, any>>({});
  const [resultados, setResultados] = useState<CalculoResultado>({});
  const [vinculos, setVinculos] = useState<VinculoEAP[]>([]);
  const [currentModuloId, setCurrentModuloId] = useState<ModuloCalculoId>(moduloId);

  // Sync state when calculo or moduloId changes
  useEffect(() => {
    if (calculo) {
      setNome(calculo.nome);
      setPredioSetor(calculo.predioSetor || '');
      setParametros(calculo.parametros || {});
      setResultados(calculo.resultados || {});
      setVinculos(calculo.vinculos || []);
      setCurrentModuloId(calculo.modulo_id);
    } else {
      setNome('');
      setPredioSetor('');
      setParametros({});
      setResultados({});
      setVinculos([]);
      setCurrentModuloId(moduloId);
    }
  }, [calculo, moduloId, isOpen]);

  if (!isOpen) return null;

  const handleAddVinculo = () => {
    if (itensEap.length === 0) return;
    setVinculos([
      ...vinculos,
      {
        item_eap: itensEap[0].item_eap,
        itemId: itensEap[0].id,
        campoDestino: 'quantidade',
        fatorMultiplicativo: 1.0,
        chaveResultado: 'volumeConcretoM3'
      }
    ]);
  };

  const handleRemoveVinculo = (index: number) => {
    setVinculos(vinculos.filter((_, i) => i !== index));
  };

  const handleUpdateVinculo = (index: number, updated: Partial<VinculoEAP>) => {
    const next = [...vinculos];
    next[index] = { ...next[index], ...updated };
    setVinculos(next);
  };

  const handleSave = () => {
    const itemToSave: CalculoItem = {
      id: calculo?.id || `calc-${Date.now()}`,
      orcamento_id: orcamentoId,
      modulo_id: currentModuloId,
      nome: nome.trim() || `Cálculo de ${currentModuloId.replace('_', ' ')}`,
      predioSetor: predioSetor.trim(),
      dataCriacao: calculo?.dataCriacao || new Date().toISOString(),
      dataAtualizacao: new Date().toISOString(),
      parametros,
      resultados,
      vinculos
    };
    onSaveCalculo(itemToSave);
    onClose();
  };

  // Render form for selected module
  const renderModuleForm = () => {
    switch (currentModuloId) {
      case 'fundacoes':
        return <FundacoesForm parametros={parametros} onChangeParametros={setParametros} onUpdateResultados={setResultados} />;
      case 'superestrutura':
        return <SuperestruturaForm parametros={parametros} onChangeParametros={setParametros} onUpdateResultados={setResultados} />;
      case 'premoldados':
        return <PreMoldadosForm parametros={parametros} onChangeParametros={setParametros} onUpdateResultados={setResultados} />;
      case 'pisos':
        return <PisosForm parametros={parametros} onChangeParametros={setParametros} onUpdateResultados={setResultados} />;
      case 'drenagem':
        return <DrenagemForm parametros={parametros} onChangeParametros={setParametros} onUpdateResultados={setResultados} />;
      case 'vedacoes':
        return <VedacoesForm parametros={parametros} onChangeParametros={setParametros} onUpdateResultados={setResultados} />;
      case 'pits_reservatorios':
        return <PitsReservatoriosForm parametros={parametros} onChangeParametros={setParametros} onUpdateResultados={setResultados} />;
      case 'instalacoes_parametricas':
        return <InstalacoesForm parametros={parametros} onChangeParametros={setParametros} onUpdateResultados={setResultados} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Background overlay click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Janela Central de Trabalho (Modal Centrado Widescreen Extra Largo) */}
      <div className="relative w-full max-w-6xl w-[94vw] bg-white shadow-2xl rounded-2xl max-h-[92vh] flex flex-col z-10 border border-slate-200 overflow-hidden transform transition-all duration-300">
        
        {/* Drawer Header */}
        <div className="px-6 py-4 bg-white text-slate-900 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                {calculo ? 'Editar Memória de Cálculo' : 'Novo Levantamento de Quantitativos'}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                <span>Módulo:</span>
                <select
                  value={currentModuloId}
                  onChange={(e) => setCurrentModuloId(e.target.value as ModuloCalculoId)}
                  className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 outline-none cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  <option value="pisos">Pisos Industriais & Pavimentação</option>
                  <option value="drenagem">Drenagem & Redes Enterradas</option>
                  <option value="fundacoes">Fundações Fórmulas & Geometria</option>
                  <option value="superestrutura">Estruturas de Concreto / Aço</option>
                  <option value="premoldados">Pré-Moldados de Concreto</option>
                  <option value="vedacoes">Alvenarias & Vedações</option>
                  <option value="pits_reservatorios">Pits, Reservatórios & Bacias</option>
                  <option value="instalacoes_parametricas">Instalações Elétricas / Hidráulicas</option>
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">

          {/* Nome e Identificação */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Identificação do Elemento</h4>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nome do Cálculo / Peça</label>
                <input
                  type="text"
                  placeholder="Ex: Sapata S1 - Galpão Principal"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-slate-700 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Prédio / Setor</label>
                <input
                  type="text"
                  placeholder="Ex: Galpão 1"
                  value={predioSetor}
                  onChange={(e) => setPredioSetor(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-slate-700 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Módulo Form */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Parâmetros de Entrada & Geometria</h4>
            {renderModuleForm()}
          </div>

          {/* Quadro de Resultados Calculados */}
          <div className="bg-white text-slate-900 p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Resultados Calculados em Tempo Real
              </h4>
              <span className="text-[11px] text-slate-500 font-semibold">Precisão de Engenharia</span>
            </div>

            <div className="grid grid-cols-3 gap-3 my-2">
              {resultados.volumeConcretoM3 !== undefined && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">Concreto Estrutural</span>
                  <span className="text-lg font-extrabold text-slate-900 font-mono">{resultados.volumeConcretoM3.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-500">m³</span></span>
                </div>
              )}

              {resultados.areaFormaM2 !== undefined && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">Área de Fôrma</span>
                  <span className="text-lg font-extrabold text-slate-900 font-mono">{resultados.areaFormaM2.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-500">m²</span></span>
                </div>
              )}

              {resultados.pesoAcoKg !== undefined && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">Armação Aço</span>
                  <span className="text-lg font-extrabold text-slate-900 font-mono">{resultados.pesoAcoKg.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-500">kg</span></span>
                </div>
              )}

              {resultados.escavacaoM3 !== undefined && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">Escavação Solo</span>
                  <span className="text-lg font-bold text-slate-900 font-mono">{resultados.escavacaoM3.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-500">m³</span></span>
                </div>
              )}

              {resultados.lastroM3 !== undefined && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">Lastro Magro/Brita</span>
                  <span className="text-lg font-bold text-slate-900 font-mono">{resultados.lastroM3.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-500">m³</span></span>
                </div>
              )}

              {resultados.areaLiquidaM2 !== undefined && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">Área Líquida Parede</span>
                  <span className="text-lg font-extrabold text-slate-900 font-mono">{resultados.areaLiquidaM2.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-500">m²</span></span>
                </div>
              )}

              {resultados.comprimentoLinearM !== undefined && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">Metragem Linear</span>
                  <span className="text-lg font-bold text-cyan-300">{resultados.comprimentoLinearM.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-400">m</span></span>
                </div>
              )}

              {resultados.custoTotalEstimadoR$ !== undefined && (
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 col-span-2">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Custo Estimado Paramétrico</span>
                  <span className="text-xl font-extrabold text-emerald-400">{resultados.custoTotalEstimadoR$.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              )}
            </div>

            {/* Exibição dos Coeficientes de Pré-Moldados */}
            {resultados.coefCompensadoM2M3 !== undefined && (
              <div className="mt-4 pt-3 border-t border-slate-700/80">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block mb-2">
                  Coeficientes Ponderados por m³ (Modelo BRP)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                  <div className="bg-slate-950/60 p-2 rounded border border-slate-700">
                    <span className="text-[9px] text-slate-400 block font-sans">Compensado Plast.</span>
                    <span className="font-bold text-blue-300">{resultados.coefCompensadoM2M3.toFixed(5)} <span className="text-[9px] text-slate-400">m²/m³</span></span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded border border-slate-700">
                    <span className="text-[9px] text-slate-400 block font-sans">Pregos</span>
                    <span className="font-bold text-amber-300">{resultados.coefPregosKgM3?.toFixed(5)} <span className="text-[9px] text-slate-400">kg/m³</span></span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded border border-slate-700">
                    <span className="text-[9px] text-slate-400 block font-sans">Sarrafo 1"x4"</span>
                    <span className="font-bold text-emerald-300">{resultados.coefSarrafoMM3?.toFixed(5)} <span className="text-[9px] text-slate-400">m/m³</span></span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded border border-slate-700">
                    <span className="text-[9px] text-slate-400 block font-sans">Pontalete 3"x3"</span>
                    <span className="font-bold text-purple-300">{resultados.coefPontaleteMM3?.toFixed(5)} <span className="text-[9px] text-slate-400">m/m³</span></span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded border border-slate-700">
                    <span className="text-[9px] text-slate-400 block font-sans">Concreto Aparente</span>
                    <span className="font-bold text-teal-300">{resultados.coefConcretoAparenteM2M3?.toFixed(5)} <span className="text-[9px] text-slate-400">m²/m³</span></span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded border border-slate-700">
                    <span className="text-[9px] text-slate-400 block font-sans">Jogos de Fôrma</span>
                    <span className="font-bold text-slate-200">{resultados.numeroJogosForma} <span className="text-[9px] text-slate-400">UN</span></span>
                  </div>
                </div>
              </div>
            )}

            {/* Detalhes específicos */}
            {resultados.detalhes && (
              <div className="mt-3 pt-3 border-t border-slate-700/80 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-300">
                {Object.entries(resultados.detalhes).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-400">{k}:</span>
                    <span className="font-semibold text-slate-200">{String(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vínculo com a EAP do Orçamento */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Link className="w-4 h-4 text-blue-600" />
                  Vínculo com Itens da EAP
                </h4>
                <p className="text-[11px] text-slate-500">Associe o resultado deste cálculo diretamente a itens do orçamento</p>
              </div>

              <button
                onClick={handleAddVinculo}
                disabled={itensEap.length === 0}
                className="px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-xs font-medium transition-colors border border-blue-200 disabled:opacity-50"
              >
                + Adicionar Vínculo
              </button>
            </div>

            {vinculos.length === 0 ? (
              <div className="p-3 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center text-xs text-slate-500">
                Nenhum item da EAP vinculado a este cálculo. Clique acima para vincular.
              </div>
            ) : (
              <div className="space-y-2">
                {vinculos.map((vinc, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Item da EAP Destino</label>
                        <select
                          value={vinc.item_eap}
                          onChange={(e) => {
                            const selectedItem = itensEap.find(i => i.item_eap === e.target.value);
                            handleUpdateVinculo(idx, {
                              item_eap: e.target.value,
                              itemId: selectedItem?.id
                            });
                          }}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                        >
                          {itensEap.map((item) => (
                            <option key={item.id} value={item.item_eap}>
                              {item.item_eap} - {item.descricao} ({item.unidade})
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={() => handleRemoveVinculo(idx)}
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors mt-4"
                        title="Remover Vínculo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Valor Enviado</label>
                        <select
                          value={vinc.chaveResultado || 'volumeConcretoM3'}
                          onChange={(e) => handleUpdateVinculo(idx, { chaveResultado: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                        >
                          <option value="volumeConcretoM3">Volume de Concreto (m³)</option>
                          <option value="areaFormaM2">Área de Fôrma (m²)</option>
                          <option value="pesoAcoKg">Peso de Aço (kg)</option>
                          <option value="escavacaoM3">Volume de Escavação (m³)</option>
                          <option value="areaLiquidaM2">Área Líquida (m²)</option>
                          <option value="comprimentoLinearM">Metragem Linear (m)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Fator / Perda (Ex: 1.05 = +5%)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={vinc.fatorMultiplicativo || 1.0}
                          onChange={(e) => handleUpdateVinculo(idx, { fatorMultiplicativo: Number(e.target.value) || 1.0 })}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Drawer Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between">
          {calculo && onDeleteCalculo ? (
            <button
              onClick={() => {
                if (confirm('Tem certeza que deseja excluir esta memória de cálculo?')) {
                  onDeleteCalculo(calculo.id);
                  onClose();
                }
              }}
              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Excluir Cálculo
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>

            <button
              onClick={handleSave}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-4 h-4" />
              Salvar Memória de Cálculo
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
