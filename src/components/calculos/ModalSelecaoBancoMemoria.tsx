import React, { useState, useEffect } from 'react';
import { Search, X, Layers, Database, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export interface ItemBancoSelecionado {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  tipo: 'composicao' | 'insumo';
  fonte: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: ItemBancoSelecionado) => void;
}

export const ModalSelecaoBancoMemoria: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelect
}) => {
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'composicao' | 'insumo'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ItemBancoSelecionado[]>([]);

  useEffect(() => {
    if (isOpen) {
      buscarItens();
    }
  }, [isOpen, filtroTipo, searchTerm]);

  const buscarItens = async () => {
    setLoading(true);
    try {
      const term = searchTerm.trim();
      let items: ItemBancoSelecionado[] = [];

      // 1. Busca Composições EXCLUSIVAMENTE do Banco Próprio
      if (filtroTipo === 'todos' || filtroTipo === 'composicao') {
        let queryComp = supabase
          .schema('engenharia')
          .from('v_composicoes_cdu')
          .select('id, codigo, descricao, unidade, fonte')
          .eq('fonte', 'Própria');

        if (term) {
          queryComp = queryComp.or(`descricao.ilike.%${term}%,codigo.ilike.%${term}%`);
        }

        const { data: compData } = await queryComp.limit(40);

        if (compData && compData.length > 0) {
          items = items.concat(
            compData.map(c => ({
              id: c.id,
              codigo: c.codigo || 'COMP-PROP',
              descricao: c.descricao || 'Sem Descrição',
              unidade: c.unidade || 'UN',
              tipo: 'composicao',
              fonte: c.fonte || 'Própria'
            }))
          );
        }
      }

      // 2. Busca Insumos EXCLUSIVAMENTE do Banco Próprio / Cotações
      if (filtroTipo === 'todos' || filtroTipo === 'insumo') {
        let queryIns = supabase
          .schema('engenharia')
          .from('insumos')
          .select('id, codigo, descricao, unidade, fonte_preco')
          .in('fonte_preco', ['Cotação', 'Histórico', 'Próprio']);

        if (term) {
          queryIns = queryIns.or(`descricao.ilike.%${term}%,codigo.ilike.%${term}%`);
        }

        const { data: insData } = await queryIns.limit(40);

        if (insData && insData.length > 0) {
          items = items.concat(
            insData.map(i => ({
              id: i.id,
              codigo: i.codigo || 'INS-PROP',
              descricao: i.descricao || 'Sem Descrição',
              unidade: i.unidade || 'UN',
              tipo: 'insumo',
              fonte: i.fonte_preco || 'Próprio'
            }))
          );
        }
      }

      setResults(items);
    } catch (err) {
      console.error('Erro ao buscar itens do Banco Próprio:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header do Modal */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <span>Buscar Composição / Insumo do Banco Próprio BRP</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pesquise composições e insumos cadastrados exclusivamente no Banco Próprio para vincular à Memória.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas e Filtros */}
        <div className="p-4 border-b border-slate-200 bg-white space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs">
                <Layers className="w-3.5 h-3.5" />
                <span>🏛️ Banco Próprio BRP</span>
              </span>
            </div>

            {/* Filtro por tipo */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFiltroTipo('todos')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                  filtroTipo === 'todos' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipo('composicao')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                  filtroTipo === 'composicao' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Composições
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipo('insumo')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                  filtroTipo === 'insumo' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Insumos
              </button>
            </div>
          </div>

          {/* Campo de Pesquisa */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquise por código (ex: 74209/001) ou palavra-chave (ex: placa de obra, concreto, escavação)..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Lista de Resultados */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              Buscando itens no banco...
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              Nenhum item encontrado no Banco Próprio BRP. Tente alterar o termo da busca.
            </div>
          ) : (
            results.map(item => (
              <div
                key={item.id}
                onClick={() => {
                  onSelect(item);
                  onClose();
                }}
                className="p-3 bg-white hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 rounded-xl transition-all cursor-pointer flex items-center justify-between group shadow-2xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      {item.codigo}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      item.tipo === 'composicao' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {item.tipo === 'composicao' ? 'Composição' : 'Insumo'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      • Fonte: {item.fonte}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-800 group-hover:text-blue-900 leading-snug">
                    {item.descricao}
                  </h4>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {item.unidade}
                  </span>
                  <button
                    type="button"
                    className="px-3 py-1.5 bg-blue-600 group-hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Selecionar</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
