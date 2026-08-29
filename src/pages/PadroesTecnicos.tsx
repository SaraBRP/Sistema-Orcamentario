import { useState } from 'react';
import { BookOpen, Layers, Search, ShieldCheck, Database } from 'lucide-react';
import { 
  TELAS_SOLDADAS_MASTER, 
  TRELICAS_MASTER, 
  BARRAS_ACO_MASTER,
  type TelaNBRItem,
  type TrelicaItem,
  type AcoCAItem 
} from '../data/padroesTecnicosData';

export default function PadroesTecnicosPage() {
  const [activeSubTab, setActiveSubTab] = useState<'telas' | 'trelicas' | 'barras'>('telas');
  const [searchTerm, setSearchTerm] = useState('');

  const [telas] = useState<TelaNBRItem[]>(TELAS_SOLDADAS_MASTER);
  const [trelicas] = useState<TrelicaItem[]>(TRELICAS_MASTER);
  const [barras] = useState<AcoCAItem[]>(BARRAS_ACO_MASTER);

  // Filtros
  const telasFiltradas = telas.filter(t => t.codigo.toLowerCase().includes(searchTerm.toLowerCase()) || t.tipoMalha.toLowerCase().includes(searchTerm.toLowerCase()));
  const trelicasFiltradas = trelicas.filter(t => t.codigoGerdau.toLowerCase().includes(searchTerm.toLowerCase()) || t.codigoNBR.toLowerCase().includes(searchTerm.toLowerCase()));
  const barrasFiltradas = barras.filter(b => b.bitolaMm.toString().includes(searchTerm) || b.categoria.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 pb-12">
      {/* Header Principal */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider">
            Catálogos Oficiais NBR & Fabricantes
          </span>
        </div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-slate-700" />
          Padrões Técnicos & Catálogos Master (Gerdau / NBR)
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          Tabelas parametrizadas de especificações técnicas para automação automática dos coeficientes de consumo nos módulos de orçamento.
        </p>
      </div>

      {/* ABAS SUPERIORES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveSubTab('telas')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'telas'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Telas Soldadas NBR 7481</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200 text-slate-800">
              {telas.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('trelicas')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'trelicas'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Treliças Gerdau NBR 14862</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200 text-slate-800">
              {trelicas.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('barras')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'barras'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Database className="w-4 h-4 text-amber-400" />
            <span>Barras & Bitolas CA-25 / 50 / 60</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200 text-slate-800">
              {barras.length}
            </span>
          </button>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar código ou especificação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-slate-700 font-medium"
          />
        </div>
      </div>

      {/* CONTEÚDO DA ABA 1: TELAS SOLDADAS NBR 7481 */}
      {activeSubTab === 'telas' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Catálogo Master de Telas Soldadas (Aço CA-60 / Gerdau)</h3>
              <p className="text-xs text-slate-500">Tabela oficial NBR 7481 com pesos unitários automáticos para pisos e lajes</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Código / Designação</th>
                  <th className="py-3 px-3">Tipo Malha</th>
                  <th className="py-3 px-3">Espaçamento (mm)</th>
                  <th className="py-3 px-3 text-right">Diâmetro Fios (mm)</th>
                  <th className="py-3 px-4 text-right">Peso Unitário (kg/m²)</th>
                  <th className="py-3 px-4 text-right">Painel Padrão (2.45x6m)</th>
                  <th className="py-3 px-4 text-right">Peso por Peça (kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {telasFiltradas.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-extrabold text-slate-900">{item.codigo}</td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{item.tipoMalha}</td>
                    <td className="py-3 px-3 font-mono text-slate-800">{item.espacamentoMm}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">Ø {item.diametroMm} mm</td>
                    <td className="py-3 px-4 text-right font-mono font-black text-slate-900 bg-slate-50/60">
                      {item.pesoKgM2.toFixed(2)} kg/m²
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {item.larguraM}m x {item.comprimentoM}m
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      {item.pesoPecaKg.toFixed(2)} kg/pc
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 2: TRELIÇAS GERDAU NBR 14862 */}
      {activeSubTab === 'trelicas' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Catálogo Master de Treliças Gerdau / NBR 14862</h3>
              <p className="text-xs text-slate-500">Geometria e pesos lineares para sustentação de barras de transferência e lajes treliçadas</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Designação Gerdau</th>
                  <th className="py-3 px-3">Código NBR</th>
                  <th className="py-3 px-3 text-right">Altura h (cm)</th>
                  <th className="py-3 px-3 text-right">Banzo Sup. (mm)</th>
                  <th className="py-3 px-3 text-right">Diagonais (mm)</th>
                  <th className="py-3 px-3 text-right">Banzo Inf. (mm)</th>
                  <th className="py-3 px-4 text-right">Peso Linear (kg/m)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trelicasFiltradas.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-extrabold text-slate-900">{item.codigoGerdau}</td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-700">{item.codigoNBR}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">{item.alturaCm} cm</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800">Ø {item.banzoSuperiorMm} mm</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800">Ø {item.diagonaisMm} mm</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800">Ø {item.banzoInferiorMm} mm</td>
                    <td className="py-3 px-4 text-right font-mono font-black text-slate-900 bg-slate-50/60">
                      {item.pesoLinearKgM.toFixed(3)} kg/m
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 3: BARRAS & BITOLAS CA-25 / 50 / 60 */}
      {activeSubTab === 'barras' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Tabela de Propriedades do Aço Estrutural (NBR 7480)</h3>
              <p className="text-xs text-slate-500">Diâmetros nominais, seções transversais e pesos lineares para barras de transferência e armaduras</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Bitola Nominal Ø</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3 text-right">Seção (cm²)</th>
                  <th className="py-3 px-4 text-right">Peso Linear (kg/m)</th>
                  <th className="py-3 px-3 text-right">Perímetro (cm)</th>
                  <th className="py-3 px-4">Uso Típico em Engenharia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {barrasFiltradas.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-extrabold text-slate-900">Ø {item.bitolaMm.toFixed(1)} mm</td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{item.categoria}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800">{item.secaoCm2.toFixed(3)} cm²</td>
                    <td className="py-3 px-4 text-right font-mono font-black text-slate-900 bg-slate-50/60">
                      {item.pesoLinearKgM.toFixed(3)} kg/m
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">{item.perimetroCm.toFixed(2)} cm</td>
                    <td className="py-3 px-4 font-medium text-slate-600">{item.usoTipico}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
