import React, { useState } from 'react';
import { X, Users, Clock, CheckCircle2 } from 'lucide-react';
import type { DimensionamentoEquipeData } from '../../types/calculos';

interface DimensionamentoEquipeModalProps {
  nomeAtividade: string;
  quantidadeTotal: number;
  unidade: string;
  data?: DimensionamentoEquipeData;
  onSave: (data: DimensionamentoEquipeData) => void;
  onClose: () => void;
}

export const DimensionamentoEquipeModal: React.FC<DimensionamentoEquipeModalProps> = ({
  nomeAtividade,
  quantidadeTotal,
  unidade,
  data,
  onSave,
  onClose
}) => {
  const [modoCalculo, setModoCalculo] = useState<'prazo_para_equipe' | 'equipe_para_prazo'>('prazo_para_equipe');

  const [rupOficial, setRupOficial] = useState<number>(data?.rupOficial ?? 1.2);
  const [rupAjudante, setRupAjudante] = useState<number>(data?.rupAjudante ?? 1.2);
  const [jornadaDiariaHs, setJornadaDiariaHs] = useState<number>(data?.jornadaDiariaHs ?? 8.8);

  const [prazoDesejadoDias, setPrazoDesejadoDias] = useState<number>(data?.prazoDesejadoDias ?? 10);
  const [equipeDisponivelOficial, setEquipeDisponivelOficial] = useState<number>(data?.equipeDisponivelOficial ?? 2);
  const [equipeDisponivelAjudante, setEquipeDisponivelAjudante] = useState<number>(data?.equipeDisponivelAjudante ?? 2);

  // Cálculos dinâmicos
  const horasTotaisOficial = quantidadeTotal * rupOficial;
  const horasTotaisAjudante = quantidadeTotal * rupAjudante;

  // Modo A: Dado o prazo em dias -> Calcula equipe necessária
  const equipeNecessariaOficial = prazoDesejadoDias > 0 && jornadaDiariaHs > 0
    ? Math.ceil((horasTotaisOficial / (prazoDesejadoDias * jornadaDiariaHs)) * 10) / 10
    : 0;
  const equipeNecessariaAjudante = prazoDesejadoDias > 0 && jornadaDiariaHs > 0
    ? Math.ceil((horasTotaisAjudante / (prazoDesejadoDias * jornadaDiariaHs)) * 10) / 10
    : 0;

  // Modo B: Dada a equipe -> Calcula prazo em dias
  const capacidadeDiariaHsOficial = equipeDisponivelOficial * jornadaDiariaHs;
  const prazoCalculadoDias = capacidadeDiariaHsOficial > 0
    ? Math.ceil(horasTotaisOficial / capacidadeDiariaHsOficial)
    : 0;

  const handleSalvar = () => {
    const dataSalvar: DimensionamentoEquipeData = {
      rupOficial,
      rupAjudante,
      jornadaDiariaHs,
      prazoDesejadoDias: modoCalculo === 'prazo_para_equipe' ? prazoDesejadoDias : prazoCalculadoDias,
      equipeDisponivelOficial: modoCalculo === 'equipe_para_prazo' ? equipeDisponivelOficial : Math.ceil(equipeNecessariaOficial),
      equipeDisponivelAjudante: modoCalculo === 'equipe_para_prazo' ? equipeDisponivelAjudante : Math.ceil(equipeNecessariaAjudante),
      resultadoPrazoDias: modoCalculo === 'equipe_para_prazo' ? prazoCalculadoDias : prazoDesejadoDias,
      resultadoEquipeOficial: modoCalculo === 'prazo_para_equipe' ? equipeNecessariaOficial : equipeDisponivelOficial,
      resultadoEquipeAjudante: modoCalculo === 'prazo_para_equipe' ? equipeNecessariaAjudante : equipeDisponivelAjudante
    };
    onSave(dataSalvar);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Dimensionamento de Equipes & Produtividade</h3>
              <p className="text-xs text-blue-200/80">
                {nomeAtividade ? `Atividade: ${nomeAtividade}` : 'Dimensionamento Operacional da Atividade'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo da Atividade */}
        <div className="bg-blue-50/70 border-b border-blue-100 p-4 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Volume Total Levantado</span>
            <span className="text-sm font-extrabold text-blue-900 font-mono">
              {quantidadeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} {unidade}
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Jornada Diária Padrão</span>
            <span className="text-sm font-extrabold text-slate-800 font-mono">
              {jornadaDiariaHs} hs/dia (com descansos)
            </span>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Seletor de Modo de Dimensionamento */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setModoCalculo('prazo_para_equipe')}
              className={`p-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                modoCalculo === 'prazo_para_equipe'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Fixar Prazo $\rightarrow$ Achar Equipe</span>
              </div>
              <span className="text-[10px] font-normal text-slate-500">
                Defina os dias de prazo e descubra quantos operários precisa
              </span>
            </button>

            <button
              type="button"
              onClick={() => setModoCalculo('equipe_para_prazo')}
              className={`p-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                modoCalculo === 'equipe_para_prazo'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Fixar Equipe $\rightarrow$ Achar Prazo</span>
              </div>
              <span className="text-[10px] font-normal text-slate-500">
                Defina os operários disponíveis e descubra a duração da tarefa
              </span>
            </button>
          </div>

          {/* Seção 1: Produtividade RUP (Razão Unitária de Produção) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>1. Índices de Produtividade (RUP - hh/{unidade})</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">RUP Oficial (hh/{unidade})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={rupOficial}
                  onChange={(e) => setRupOficial(parseFloat(e.target.value) || 0.1)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold outline-none focus:border-blue-500 bg-white"
                />
                <span className="text-[10px] text-slate-400 block">Ex: Pedreiro, Carpinteiro</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">RUP Ajudante (hh/{unidade})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={rupAjudante}
                  onChange={(e) => setRupAjudante(parseFloat(e.target.value) || 0.1)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold outline-none focus:border-blue-500 bg-white"
                />
                <span className="text-[10px] text-slate-400 block">Ex: Servente, Ajudante</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">Jornada Diária (hs/dia)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="24"
                  value={jornadaDiariaHs}
                  onChange={(e) => setJornadaDiariaHs(parseFloat(e.target.value) || 8.8)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold outline-none focus:border-blue-500 bg-white"
                />
                <span className="text-[10px] text-slate-400 block">Padrão CLT: 8.8 horas</span>
              </div>
            </div>

            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200/60 text-xs text-blue-900 font-medium flex items-center justify-between">
              <span>Carga Horária Total Exigida para a Atividade:</span>
              <span className="font-mono font-extrabold text-blue-800 text-sm">
                {horasTotaisOficial.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} Homem-Hora (hh)
              </span>
            </div>
          </div>

          {/* Seção 2: Entradas & Resultados por Modo */}
          {modoCalculo === 'prazo_para_equipe' ? (
            <div className="space-y-4 pt-2 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Informe o Prazo Desejado
              </h4>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-700 block mb-1">Prazo Meta da Atividade (Dias Úteis)</label>
                    <input
                      type="number"
                      min="1"
                      value={prazoDesejadoDias}
                      onChange={(e) => setPrazoDesejadoDias(parseInt(e.target.value) || 1)}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm font-mono font-bold outline-none focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>

                {/* Card do Resultado */}
                <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 rounded-xl shadow-md space-y-2">
                  <span className="text-[10px] text-blue-200 font-bold uppercase tracking-wider block">
                    Equipe Necessária por Dia (para {prazoDesejadoDias} dias)
                  </span>
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <span className="text-xs text-blue-200 block">Oficiais (ex: Pedreiros)</span>
                      <span className="text-2xl font-extrabold font-mono text-white">
                        {equipeNecessariaOficial.toFixed(1)} <span className="text-xs font-normal text-blue-300">operários/dia</span>
                      </span>
                      <span className="text-[10px] text-blue-300 block">arredondado: {Math.ceil(equipeNecessariaOficial)} oficiais</span>
                    </div>

                    <div>
                      <span className="text-xs text-blue-200 block">Ajudantes (ex: Serventes)</span>
                      <span className="text-2xl font-extrabold font-mono text-white">
                        {equipeNecessariaAjudante.toFixed(1)} <span className="text-xs font-normal text-blue-300">operários/dia</span>
                      </span>
                      <span className="text-[10px] text-blue-300 block">arredondado: {Math.ceil(equipeNecessariaAjudante)} ajudantes</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Informe a Equipe Fixa Disponível
              </h4>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Nº de Oficiais Disponíveis</label>
                    <input
                      type="number"
                      min="1"
                      value={equipeDisponivelOficial}
                      onChange={(e) => setEquipeDisponivelOficial(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono font-bold outline-none focus:border-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Nº de Ajudantes Disponíveis</label>
                    <input
                      type="number"
                      min="0"
                      value={equipeDisponivelAjudante}
                      onChange={(e) => setEquipeDisponivelAjudante(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono font-bold outline-none focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>

                {/* Card do Resultado */}
                <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-4 rounded-xl shadow-md space-y-1">
                  <span className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider block">
                    Duração Estimada da Tarefa
                  </span>
                  <div className="flex items-baseline space-x-2 pt-1">
                    <span className="text-3xl font-extrabold font-mono text-white">{prazoCalculadoDias}</span>
                    <span className="text-sm font-bold text-emerald-200">dias úteis de execução</span>
                  </div>
                  <p className="text-[11px] text-emerald-200/90 pt-1">
                    Equipe de {equipeDisponivelOficial} Oficiais + {equipeDisponivelAjudante} Ajudantes produzindo {capacidadeDiariaHsOficial.toFixed(1)} hh/dia.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSalvar}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Salvar Dimensionamento</span>
          </button>
        </div>
      </div>
    </div>
  );
};
