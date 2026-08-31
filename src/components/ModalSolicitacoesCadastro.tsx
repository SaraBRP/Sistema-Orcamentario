import { useState, useEffect } from 'react';
import { 
  UserCheck, 
  UserX, 
  Clock, 
  User, 
  Mail, 
  Briefcase, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface SolicitacaoCadastroUsuario {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  senhaHash?: string;
  status: 'pendente' | 'aprovado' | 'reprovado';
  dataSolicitacao: string;
  dataAnalise?: string;
  analisadoPor?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const LOCAL_STORAGE_SOLICITACOES_KEY = 'brp_solicitacoes_cadastro_usuarios';

export function ModalSolicitacoesCadastro({ isOpen, onClose }: Props) {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoCadastroUsuario[]>([]);
  const [filterTab, setFilterTab] = useState<'pendentes' | 'aprovados' | 'reprovados'>('pendentes');
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const carregarSolicitacoes = async () => {
    try {
      let localList: SolicitacaoCadastroUsuario[] = [];
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_SOLICITACOES_KEY);
        if (saved) localList = JSON.parse(saved);
      } catch {}

      let dbList: SolicitacaoCadastroUsuario[] = [];
      try {
        const { data } = await supabase
          .schema('engenharia')
          .from('solicitacoes_cadastro')
          .select('*')
          .order('created_at', { ascending: false });
        if (data) {
          dbList = data.map((d: any) => ({
            id: d.id,
            nome: d.nome,
            email: d.email,
            cargo: d.cargo || 'Orçamentista',
            status: d.status || 'pendente',
            dataSolicitacao: d.data_solicitacao || new Date(d.created_at || Date.now()).toLocaleDateString('pt-BR'),
            dataAnalise: d.data_analise,
            analisadoPor: d.analisado_por
          }));
        }
      } catch {}

      const map = new Map<string, SolicitacaoCadastroUsuario>();
      dbList.forEach(s => map.set(s.email.toLowerCase(), s));
      localList.forEach(s => {
        if (!map.has(s.email.toLowerCase())) {
          map.set(s.email.toLowerCase(), s);
        }
      });

      setSolicitacoes(Array.from(map.values()));
    } catch {
      setSolicitacoes([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      carregarSolicitacoes();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const salvarLista = (novaLista: SolicitacaoCadastroUsuario[]) => {
    setSolicitacoes(novaLista);
    try {
      localStorage.setItem(LOCAL_STORAGE_SOLICITACOES_KEY, JSON.stringify(novaLista));
    } catch {}
  };

  const handleAtualizarStatus = async (id: string, novoStatus: 'aprovado' | 'reprovado') => {
    const dataAnaliseStr = new Date().toLocaleString('pt-BR');
    const item = solicitacoes.find(s => s.id === id);
    if (!item) return;

    if (novoStatus === 'reprovado') {
      // Se for recusa, deleta/descarta completamente os dados do usuário para exigir um novo cadastro do zero
      const listaAtualizada = solicitacoes.filter(s => s.id !== id);
      salvarLista(listaAtualizada);

      try {
        await supabase
          .schema('engenharia')
          .from('solicitacoes_cadastro')
          .delete()
          .eq('id', id);
      } catch {}

      setFeedbackMessage({
        text: `Solicitação de ${item.nome} foi RECUSADA e os dados foram excluídos. O usuário deverá fazer um novo cadastro se desejar enviar outra solicitação.`,
        type: 'error'
      });
    } else {
      // Se for aprovação, marca o status como aprovado e libera o acesso
      const listaAtualizada = solicitacoes.map(s => {
        if (s.id === id) {
          return {
            ...s,
            status: 'aprovado' as const,
            dataAnalise: dataAnaliseStr,
            analisadoPor: 'Gestor (Sara)'
          };
        }
        return s;
      });

      salvarLista(listaAtualizada);

      try {
        await supabase
          .schema('engenharia')
          .from('solicitacoes_cadastro')
          .update({
            status: 'aprovado',
            data_analise: new Date().toISOString(),
            analisado_por: 'Gestor'
          })
          .eq('id', id);
      } catch {}

      setFeedbackMessage({
        text: `Cadastro de ${item.nome} APROVADO com sucesso! O usuário já pode acessar o sistema.`,
        type: 'success'
      });
    }

    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  const pendentes = solicitacoes.filter(s => s.status === 'pendente');
  const aprovados = solicitacoes.filter(s => s.status === 'aprovado');
  const reprovados = solicitacoes.filter(s => s.status === 'reprovado');

  const itensExibidos = 
    filterTab === 'pendentes' ? pendentes :
    filterTab === 'aprovados' ? aprovados : reprovados;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-3xl flex flex-col shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh]">
        
        {/* Header do Modal */}
        <div className="bg-slate-900 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 border border-blue-400/40 text-blue-300 rounded-2xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight">Aprovação de Cadastro de Usuários</h3>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-bold rounded uppercase tracking-wider border border-blue-400/30">
                  Área do Gestor
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Analise e libere o acesso para novos orçamentistas e engenheiros solicitantes.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert Toast */}
        {feedbackMessage && (
          <div className={`p-3 text-xs font-bold text-center flex items-center justify-center gap-2 transition-all ${
            feedbackMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200' : 'bg-rose-50 text-rose-800 border-b border-rose-200'
          }`}>
            {feedbackMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {/* Filtros de Aba */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setFilterTab('pendentes')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              filterTab === 'pendentes' ? 'bg-amber-500 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pendentes</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full ${filterTab === 'pendentes' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800'}`}>
              {pendentes.length}
            </span>
          </button>

          <button
            onClick={() => setFilterTab('aprovados')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              filterTab === 'aprovados' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Aprovados</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full ${filterTab === 'aprovados' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
              {aprovados.length}
            </span>
          </button>

          <button
            onClick={() => setFilterTab('reprovados')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              filterTab === 'reprovados' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <UserX className="w-3.5 h-3.5" />
            <span>Recusados</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full ${filterTab === 'reprovados' ? 'bg-rose-800 text-white' : 'bg-rose-100 text-rose-800'}`}>
              {reprovados.length}
            </span>
          </button>
        </div>

        {/* Lista de Solicitações */}
        <div className="flex-1 p-5 overflow-y-auto space-y-3">
          {itensExibidos.length === 0 ? (
            <div className="py-12 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-2">
              <User className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-bold text-sm text-slate-600">Nenhuma solicitação nesta aba</p>
              <p className="text-xs text-slate-400">Novas solicitações de cadastro enviadas pela tela de login aparecerão aqui.</p>
            </div>
          ) : (
            itensExibidos.map((sol) => (
              <div 
                key={sol.id} 
                className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs hover:shadow-sm transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900">{sol.nome}</span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px] rounded-md flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-blue-600" />
                      {sol.cargo}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-mono">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {sol.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Solicitado em: {sol.dataSolicitacao}
                    </span>
                  </div>
                </div>

                {/* Botões de Ação para o Gestor */}
                <div className="flex items-center gap-2 shrink-0">
                  {sol.status === 'pendente' && (
                    <>
                      <button
                        onClick={() => handleAtualizarStatus(sol.id, 'aprovado')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Aprovar Acesso</span>
                      </button>

                      <button
                        onClick={() => handleAtualizarStatus(sol.id, 'reprovado')}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <UserX className="w-4 h-4 text-rose-600" />
                        <span>Recusar</span>
                      </button>
                    </>
                  )}

                  {sol.status === 'aprovado' && (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Acesso Liberado
                      </span>
                      <button
                        onClick={() => handleAtualizarStatus(sol.id, 'reprovado')}
                        className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                      >
                        Revogar
                      </button>
                    </div>
                  )}

                  {sol.status === 'reprovado' && (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-rose-100 text-rose-800 font-bold text-xs rounded-xl flex items-center gap-1">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        Acesso Recusado
                      </span>
                      <button
                        onClick={() => handleAtualizarStatus(sol.id, 'aprovado')}
                        className="text-xs text-emerald-600 hover:underline font-semibold cursor-pointer"
                      >
                        Aprovar Agora
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Pendentes de aprovação: <strong>{pendentes.length} solicitações</strong></span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
          >
            Fechar Janela
          </button>
        </div>

      </div>
    </div>
  );
}
