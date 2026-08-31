import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutGrid, 
  X, 
  Search, 
  Clock, 
  User, 
  Sparkles,
  FileText,
  CheckCircle2,
  ExternalLink,
  Info
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface CardOrcamentoKanban {
  id: string;
  codigo: string;
  nome: string;
  cliente: string;
  valorTotal: number;
  revisao: string;
  status: 'em_andamento' | 'aguardando_aprovacao' | 'aprovado' | 'reprovado';
  dataUltimaModificacao: string;
  orcamentista: string;
}

interface ModalKanbanOrcamentosProps {
  isOpen: boolean;
  onClose: () => void;
}

// Verifica se a data está nos últimos 7 dias
function isDentroDos7Dias(dateStr: string): boolean {
  if (!dateStr) return true;
  try {
    const parts = dateStr.split(' ');
    const dParts = parts[0].split('/');
    if (dParts.length === 3) {
      const itemDate = new Date(parseInt(dParts[2]), parseInt(dParts[1]) - 1, parseInt(dParts[0]));
      const hoje = new Date();
      const diffTime = Math.abs(hoje.getTime() - itemDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }
  } catch {
    return true;
  }
  return true;
}

export function ModalKanbanOrcamentos({ isOpen, onClose }: ModalKanbanOrcamentosProps) {
  const navigate = useNavigate();
  const [orcamentos, setOrcamentos] = useState<CardOrcamentoKanban[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Busca orçamentos reais do Supabase e LocalStorage para o Kanban
  useEffect(() => {
    async function carregarOrcamentosBanco() {
      try {
        let dbData: any[] = [];
        try {
          const { data } = await supabase
            .schema('engenharia')
            .from('orcamentos')
            .select('*')
            .order('created_at', { ascending: false });
          if (data) dbData = data;
        } catch (e) {}

        let localData: any[] = [];
        try {
          const raw = localStorage.getItem('brp_orcamentos_list');
          if (raw) localData = JSON.parse(raw);
        } catch (e) {}

        const mapOrcs = new Map<string, any>();
        dbData.forEach(o => {
          if (o.id) mapOrcs.set(String(o.id), o);
          if (o.codigo) mapOrcs.set(String(o.codigo).trim(), o);
        });
        localData.forEach(o => {
          if (o.id && !mapOrcs.has(String(o.id))) mapOrcs.set(String(o.id), o);
          if (o.codigo && !mapOrcs.has(String(o.codigo).trim())) mapOrcs.set(String(o.codigo).trim(), o);
        });

        const allOrcs = Array.from(mapOrcs.values());

        const formatados: CardOrcamentoKanban[] = allOrcs.map((o: any) => {
          const stRaw = String(o.status || '').toLowerCase();
          let st: CardOrcamentoKanban['status'] = 'em_andamento';
          if (stRaw.includes('aprovado')) {
            st = 'aprovado';
          } else if (stRaw.includes('reprovado') || stRaw.includes('cancelad') || stRaw.includes('recusad')) {
            st = 'reprovado';
          } else if (stRaw.includes('aguardando') || stRaw.includes('valida') || stRaw.includes('análise')) {
            st = 'aguardando_aprovacao';
          }

          const rawDate = o.updated_at || o.created_at || o.dataCriacao;
          const dtFormated = rawDate 
            ? new Date(rawDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleDateString('pt-BR');

          const rev = o.revisao ? `R${o.revisao}` : 'R0';

          return {
            id: String(o.id),
            codigo: o.codigo || `ORÇ-${String(o.id).substring(0, 5)}`,
            nome: o.projeto || o.nome || 'Orçamento sem nome',
            cliente: o.cliente || 'Cliente BRP',
            valorTotal: Number(o.valor_total || o.valorTotal || 0),
            revisao: rev,
            status: st,
            dataUltimaModificacao: dtFormated,
            orcamentista: o.responsavel || 'Sara (Orçamentista)'
          };
        });

        setOrcamentos(formatados);
      } catch (err) {
        console.warn('Erro ao carregar orçamentos para o Kanban:', err);
        setOrcamentos([]);
      }
    }

    if (isOpen) {
      carregarOrcamentosBanco();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const orcamentosFiltrados = orcamentos.filter(o => 
    o.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.cliente.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const colunas = [
    {
      id: 'em_andamento',
      titulo: 'Em Andamento / Revisão',
      subtitulo: 'Orçamentos e revisões em elaboração',
      corHeader: 'bg-amber-50 text-amber-800 border-amber-200',
      badgeCor: 'bg-amber-100 text-amber-800',
      items: orcamentosFiltrados.filter(o => o.status === 'em_andamento')
    },
    {
      id: 'aguardando_aprovacao',
      titulo: 'Aguardando Aprovação',
      subtitulo: 'Enviados para análise técnica ou diretoria',
      corHeader: 'bg-blue-50 text-blue-800 border-blue-200',
      badgeCor: 'bg-blue-100 text-blue-800',
      items: orcamentosFiltrados.filter(o => o.status === 'aguardando_aprovacao')
    },
    {
      id: 'aprovado',
      titulo: 'Aprovados',
      subtitulo: 'Homologados (visíveis por até 7 dias)',
      corHeader: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      badgeCor: 'bg-emerald-100 text-emerald-800',
      // Aplica a regra dos 7 dias para homologados/aprovados
      items: orcamentosFiltrados.filter(o => o.status === 'aprovado' && isDentroDos7Dias(o.dataUltimaModificacao))
    },
    {
      id: 'reprovado',
      titulo: 'Reprovados / Cancelados',
      subtitulo: 'Arquivados (visíveis por até 7 dias)',
      corHeader: 'bg-rose-50 text-rose-800 border-rose-200',
      badgeCor: 'bg-rose-100 text-rose-800',
      // Aplica a regra dos 7 dias para reprovados/cancelados
      items: orcamentosFiltrados.filter(o => o.status === 'reprovado' && isDentroDos7Dias(o.dataUltimaModificacao))
    }
  ];

  const handleNavegacaoCard = (colunaId: string) => {
    onClose();
    if (colunaId === 'aguardando_aprovacao') {
      navigate('/fluxo-aprovacao');
    } else {
      navigate('/orcamentos/calculos');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 animate-in fade-in duration-200">
      <div className="bg-slate-100 rounded-3xl w-full max-w-7xl h-[92vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden">
        
        {/* Header do Kanban */}
        <div className="bg-white p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 shadow-2xs">
              <LayoutGrid className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900">Kanban de Orçamentos & Propostas</h2>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-md uppercase tracking-wider">OrçaBRP</span>
              </div>
              <p className="text-xs text-slate-500">
                Acompanhe propostas comerciais por fase. Aprovados e reprovados expiram em 7 dias sem novas revisões.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Barra de Busca de Orçamentos no Kanban */}
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por nome ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 font-medium"
              />
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Fechar Kanban"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quadro Kanban (4 Colunas) */}
        <div className="flex-1 p-4 overflow-x-auto overflow-y-hidden">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full min-w-[1000px]">
            {colunas.map((coluna) => {
              const valorTotalColuna = coluna.items.reduce((acc, curr) => acc + (curr.valorTotal || 0), 0);

              return (
                <div key={coluna.id} className="bg-slate-200/60 rounded-2xl flex flex-col h-full border border-slate-300/70 overflow-hidden">
                  
                  {/* Cabeçalho da Coluna */}
                  <div className={`p-3.5 border-b flex items-center justify-between ${coluna.corHeader}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-xs uppercase tracking-wider">{coluna.titulo}</h3>
                        <span className={`px-2 py-0.5 text-[10.5px] font-bold rounded-full ${coluna.badgeCor}`}>
                          {coluna.items.length}
                        </span>
                      </div>
                      <p className="text-[10px] opacity-80 mt-0.5 line-clamp-1">{coluna.subtitulo}</p>
                    </div>

                    <span className="font-mono font-extrabold text-xs">
                      R$ {valorTotalColuna.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>

                  {/* Cards da Coluna */}
                  <div className="flex-1 p-3 overflow-y-auto space-y-3">
                    {coluna.items.length === 0 ? (
                      <div className="h-32 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-center p-4 space-y-1">
                        <Info className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-400 font-medium italic">Nenhum orçamento nesta fase.</span>
                      </div>
                    ) : (
                      coluna.items.map((item) => (
                        <div 
                          key={item.id}
                          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-all space-y-3 group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                              {item.codigo}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-extrabold rounded uppercase tracking-wider">
                              {item.revisao}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                              {item.nome}
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              <span>{item.cliente}</span>
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <div className="font-mono font-extrabold text-xs text-emerald-700">
                              R$ {item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>

                            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {item.dataUltimaModificacao}
                            </span>
                          </div>

                          {/* Botão Único de Ação por Coluna */}
                          <div className="pt-2 border-t border-slate-100">
                            {coluna.id === 'em_andamento' && (
                              <button
                                type="button"
                                onClick={() => handleNavegacaoCard('em_andamento')}
                                className="w-full py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[11px] rounded-xl border border-amber-200/80 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5 text-amber-600" />
                                <span>Acessar Orçamento</span>
                              </button>
                            )}

                            {coluna.id === 'aguardando_aprovacao' && (
                              <button
                                type="button"
                                onClick={() => handleNavegacaoCard('aguardando_aprovacao')}
                                className="w-full py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-[11px] rounded-xl border border-blue-200/80 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                                <span>Acessar Fluxo de Validação</span>
                              </button>
                            )}

                            {(coluna.id === 'aprovado' || coluna.id === 'reprovado') && (
                              <button
                                type="button"
                                onClick={() => handleNavegacaoCard(coluna.id)}
                                className="w-full py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[11px] rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                                <span>Acessar Orçamento</span>
                              </button>
                            )}
                          </div>

                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer do Kanban */}
        <div className="bg-white p-3.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Total no Quadro: <strong>{orcamentosFiltrados.length} propostas</strong></span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
          >
            Fechar Quadro
          </button>
        </div>

      </div>
    </div>
  );
}
