import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Filter, Layers, Edit2, Trash2 } from 'lucide-react';

export default function Composicoes() {
  const [composicoes, setComposicoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchComposicoes();
  }, []);

  const fetchComposicoes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .schema('engenharia')
      .from('composicoes')
      .select('*')
      .order('codigo', { ascending: true });
      
    if (error) {
      console.error('Erro ao buscar composições:', error);
    } else {
      setComposicoes(data || []);
    }
    setLoading(false);
  };

  const filteredComposicoes = composicoes.filter(c => 
    c.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Composições de Custo</h2>
          <p className="text-slate-500 text-sm">Monte seus serviços vinculando insumos e produtividade</p>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm">
          <Plus className="w-5 h-5" />
          Nova Composição
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar composição por código ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all bg-white"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            <Filter className="w-4 h-4" />
            Filtros
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-medium">
              <tr>
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Fonte</th>
                <th className="px-6 py-4">Atividade</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Unidade</th>
                <th className="px-6 py-4 text-right">CDU Calculado</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                      Carregando composições...
                    </div>
                  </td>
                </tr>
              ) : filteredComposicoes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Nenhuma composição encontrada.
                  </td>
                </tr>
              ) : (
                filteredComposicoes.map((comp) => (
                  <tr key={comp.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-800">{comp.codigo}</td>
                    <td className="px-6 py-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">{comp.fonte || 'Própria'}</span></td>
                    <td className="px-6 py-4 text-xs">{comp.tipo_atividade || '-'}</td>
                    <td className="px-6 py-4 max-w-md truncate" title={comp.descricao}>{comp.descricao}</td>
                    <td className="px-6 py-4">{comp.unidade}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-800">
                      R$ 0,00 {/* Será calculado dinamicamente */}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors" title="Editar Itens">
                          <Layers className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors" title="Editar">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
