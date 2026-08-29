import React, { useState, useMemo } from 'react';
import {
  Sliders,
  Plus,
  Search,
  Trash2,
  Edit2,
  Tag,
  X,
  HelpCircle
} from 'lucide-react';
import type { ParametroTecnicoItem } from '../../types/parametros';
import {
  getParametrosCadastrados,
  addParametroCustom,
  updateParametro,
  deleteParametro
} from '../../utils/parametrosStorage';

export function TabelaParametrosCadastro() {
  const [parametros, setParametros] = useState<ParametroTecnicoItem[]>(() => getParametrosCadastrados());
  const [searchTerm, setSearchTerm] = useState('');

  // Estado da Modal de Cadastro/Edição
  const [showModal, setShowModal] = useState(false);
  const [editingParamId, setEditingParamId] = useState<string | null>(null);

  // Form State
  const [formParametro, setFormParametro] = useState('');
  const [formSigla, setFormSigla] = useState('');
  const [formUnidade, setFormUnidade] = useState('');

  // Filtro Dinâmico por Busca
  const parametrosFiltrados = useMemo(() => {
    return parametros.filter(p => {
      const term = searchTerm.toLowerCase();
      return (
        (p.parametro || '').toLowerCase().includes(term) ||
        (p.sigla || '').toLowerCase().includes(term) ||
        (p.unidade || '').toLowerCase().includes(term)
      );
    });
  }, [parametros, searchTerm]);

  const handleOpenAddModal = () => {
    setEditingParamId(null);
    setFormParametro('');
    setFormSigla('');
    setFormUnidade('');
    setShowModal(true);
  };

  const handleOpenEditModal = (item: ParametroTecnicoItem) => {
    setEditingParamId(item.id);
    setFormParametro(item.parametro);
    setFormSigla(item.sigla);
    setFormUnidade(item.unidade);
    setShowModal(true);
  };

  const handleSelectParametroBase = (baseId: string) => {
    const baseItem = parametros.find(p => p.id === baseId);
    if (baseItem) {
      if (!formParametro) setFormParametro(baseItem.parametro);
      setFormSigla(baseItem.sigla);
      setFormUnidade(baseItem.unidade);
    }
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formParametro.trim()) return;

    if (editingParamId) {
      const atualizados = updateParametro(editingParamId, {
        parametro: formParametro.trim(),
        sigla: formSigla.trim() || 'P',
        unidade: formUnidade.trim() || 'un'
      });
      setParametros(atualizados);
    } else {
      const novo = addParametroCustom({
        parametro: formParametro.trim(),
        sigla: formSigla.trim() || 'P',
        unidade: formUnidade.trim() || 'un'
      });
      setParametros([novo, ...parametros.filter(p => p.id !== novo.id)]);
    }

    setShowModal(false);
  };

  const handleDelete = (item: ParametroTecnicoItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Deseja realmente excluir o parâmetro "${item.parametro}"? Ele não ficará mais disponível nas tabelas e fórmulas do sistema.`)) {
      const atualizados = deleteParametro(item.id);
      setParametros(atualizados);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER DA SEÇÃO */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Tabela de Parâmetros
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Cadastro de parâmetros, siglas e unidades de medida para uso nas fórmulas e medições
              </p>
            </div>
          </div>
        </div>

        {/* BOTOES DE AÇÃO */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Parâmetro</span>
          </button>
        </div>
      </div>

      {/* BARRA DE BUSCA E METRICAS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* CAMPO DE BUSCA */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar parâmetro, sigla (ex: H, As, Vc) ou unidade (ex: m, m², m³)..."
            className="w-full bg-slate-50 text-slate-800 text-xs font-medium pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* COUNTER */}
        <div className="flex items-center gap-2 shrink-0">
          <Tag className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-semibold text-slate-600">Total de Parâmetros:</span>
          <span className="font-mono text-sm font-bold bg-blue-50 text-blue-700 py-0.5 px-3 rounded-lg border border-blue-100">
            {parametros.length}
          </span>
        </div>
      </div>

      {/* TABELA DE PARAMETROS (LIMPA: APENAS PARÂMETRO, SIGLA, UNIDADE DE MEDIDA E AÇÕES) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th className="py-3.5 px-6">Parâmetro</th>
                <th className="py-3.5 px-6 text-center">Sigla</th>
                <th className="py-3.5 px-6 text-center">Unidade de Medida</th>
                <th className="py-3.5 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {parametrosFiltrados.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  <td className="py-3.5 px-6">
                    <div className="font-bold text-slate-900 text-xs">
                      {item.parametro}
                    </div>
                  </td>

                  <td className="py-3.5 px-6 text-center">
                    <span className="inline-block bg-slate-100 text-slate-900 font-mono font-bold px-3 py-1 rounded-lg border border-slate-200 text-xs">
                      {item.sigla}
                    </span>
                  </td>

                  <td className="py-3.5 px-6 text-center">
                    <span className="inline-block bg-blue-50 text-blue-700 font-mono font-bold px-3 py-1 rounded-lg border border-blue-100 text-xs">
                      {item.unidade}
                    </span>
                  </td>

                  <td className="py-3.5 px-6 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Editar parâmetro"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(item, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Excluir parâmetro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {parametrosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 text-xs italic">
                    Nenhum parâmetro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE CADASTRO / EDIÇÃO DE PARÂMETRO */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER */}
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {editingParamId ? 'Editar Parâmetro' : 'Cadastrar Novo Parâmetro'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Insira o nome do parâmetro, sigla e unidade de medida
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* MODAL FORM */}
            <form onSubmit={handleSaveModal} className="p-5 space-y-4">
              {/* SELETOR DE PARÂMETRO BASE (OPCIONAL) */}
              {!editingParamId && (
                <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 space-y-1.5">
                  <label className="text-xs font-semibold text-blue-950 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                    <span>Copiar de um Parâmetro Base (Opcional):</span>
                  </label>
                  <select
                    onChange={(e) => handleSelectParametroBase(e.target.value)}
                    defaultValue=""
                    className="w-full bg-white text-slate-800 font-medium text-xs py-2 px-3 rounded-lg border border-blue-200 outline-none cursor-pointer"
                  >
                    <option value="" disabled>Selecione um parâmetro para preencher sigla e unidade...</option>
                    {parametros.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.parametro} ({p.sigla} - {p.unidade})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* CAMPO: PARÂMETRO */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Parâmetro <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formParametro}
                  onChange={(e) => setFormParametro(e.target.value)}
                  placeholder="Ex: Altura, Área de Superfície, Volume de Concreto..."
                  className="w-full bg-white text-slate-800 text-xs font-medium py-2 px-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>

              {/* CAMPO: SIGLA E UNIDADE */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Sigla <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formSigla}
                    onChange={(e) => setFormSigla(e.target.value)}
                    placeholder="Ex: H, As, Vc, A"
                    className="w-full bg-white text-slate-800 text-xs font-mono font-bold py-2 px-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Unidade de Medida <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formUnidade}
                    onChange={(e) => setFormUnidade(e.target.value)}
                    placeholder="Ex: m, m², m³, kg, R$"
                    className="w-full bg-white text-slate-800 text-xs font-mono font-bold py-2 px-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* FOOTER DA MODAL */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  {editingParamId ? 'Salvar Alterações' : 'Cadastrar Parâmetro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
