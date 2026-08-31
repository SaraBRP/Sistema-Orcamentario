import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { HardHat, UserPlus, LogIn, Clock, AlertCircle } from 'lucide-react';
import { LOCAL_STORAGE_SOLICITACOES_KEY, type SolicitacaoCadastroUsuario } from '../components/ModalSolicitacoesCadastro';

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Estados de Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Estados de Cadastro
  const [nomeReg, setNomeReg] = useState('');
  const [emailReg, setEmailReg] = useState('');
  const [cargoReg, setCargoReg] = useState('Orçamentista');
  const [passwordReg, setPasswordReg] = useState('');
  const [confirmPasswordReg, setConfirmPasswordReg] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
  
  const { session } = useAuth();

  if (session) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRegisterSuccess(null);

    const emailTrim = email.trim().toLowerCase();

    // 1. Verifica se há uma solicitação de cadastro para este e-mail no sistema
    try {
      let localList: SolicitacaoCadastroUsuario[] = [];
      const saved = localStorage.getItem(LOCAL_STORAGE_SOLICITACOES_KEY);
      if (saved) localList = JSON.parse(saved);

      const solicitacao = localList.find(s => s.email.toLowerCase() === emailTrim);
      if (solicitacao) {
        if (solicitacao.status === 'pendente') {
          setError('⏳ Sua solicitação de cadastro está PENDENTE DE APROVAÇÃO pelo Gestor. Aguarde a liberação para acessar.');
          setLoading(false);
          return;
        }
        if (solicitacao.status === 'reprovado') {
          setError('❌ A sua solicitação de cadastro foi RECUSADA pelo Gestor. Entre em contato com a Engenharia.');
          setLoading(false);
          return;
        }
      }
    } catch {}

    // 2. Tenta autenticação no Supabase ou Mock
    const { error } = await supabase.auth.signInWithPassword({ email: emailTrim, password });
    if (error) {
      // Se der erro no Supabase Auth, verifica se é um usuário recém aprovado localmente
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_SOLICITACOES_KEY);
        if (saved) {
          const list: SolicitacaoCadastroUsuario[] = JSON.parse(saved);
          const userApproved = list.find(s => s.email.toLowerCase() === emailTrim && s.status === 'aprovado');
          if (userApproved) {
            // Cria um perfil local aprovado
            localStorage.setItem('orcabrp_user_profile', JSON.stringify({
              nome: userApproved.nome,
              email: userApproved.email,
              funcao: userApproved.cargo || 'Orçamentista',
              avatarUrl: ''
            }));
            window.location.href = '/';
            return;
          }
        }
      } catch {}

      setError(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message);
    }
    setLoading(false);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRegisterSuccess(null);

    if (passwordReg !== confirmPasswordReg) {
      setError('As senhas digitadas não coincidem.');
      setLoading(false);
      return;
    }

    if (passwordReg.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.');
      setLoading(false);
      return;
    }

    const emailTrim = emailReg.trim().toLowerCase();
    const nomeTrim = nomeReg.trim();

    try {
      let localList: SolicitacaoCadastroUsuario[] = [];
      const saved = localStorage.getItem(LOCAL_STORAGE_SOLICITACOES_KEY);
      if (saved) localList = JSON.parse(saved);

      const existe = localList.find(s => s.email.toLowerCase() === emailTrim);
      if (existe) {
        if (existe.status === 'pendente') {
          setError('Já existe uma solicitação de cadastro pendente para este e-mail.');
          setLoading(false);
          return;
        }
        if (existe.status === 'aprovado') {
          setError('Este e-mail já está cadastrado e aprovado. Faça login diretamente.');
          setLoading(false);
          return;
        }
      }

      const novaSolicitacao: SolicitacaoCadastroUsuario = {
        id: `sol-${Date.now()}`,
        nome: nomeTrim,
        email: emailTrim,
        cargo: cargoReg,
        senhaHash: passwordReg,
        status: 'pendente',
        dataSolicitacao: new Date().toLocaleString('pt-BR')
      };

      const listaAtualizada = [novaSolicitacao, ...localList.filter(s => s.email.toLowerCase() !== emailTrim)];
      localStorage.setItem(LOCAL_STORAGE_SOLICITACOES_KEY, JSON.stringify(listaAtualizada));

      // Tenta gravar no Supabase se o banco estiver disponível
      try {
        await supabase
          .schema('engenharia')
          .from('solicitacoes_cadastro')
          .insert({
            id: novaSolicitacao.id,
            nome: nomeTrim,
            email: emailTrim,
            cargo: cargoReg,
            status: 'pendente'
          });
      } catch {}

      setRegisterSuccess(`Solicitação enviada com sucesso! A conta de "${nomeTrim}" está pendente de aprovação pelo Gestor.`);
      
      // Limpa formulário
      setNomeReg('');
      setEmailReg('');
      setPasswordReg('');
      setConfirmPasswordReg('');
    } catch (err: any) {
      setError('Erro ao processar a solicitação: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-600/20 to-transparent rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-sky-500/20 to-transparent rounded-full blur-3xl opacity-50"></div>
      </div>
      
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden relative z-10">
        <div className="p-8">
          
          {/* Logo e Cabeçalho */}
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-sky-400 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
              <HardHat className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black text-white text-center tracking-tight bg-gradient-to-r from-white via-slate-100 to-sky-400 bg-clip-text text-transparent">
              OrçaBRP
            </h1>
            <p className="text-sky-400/80 font-bold text-xs mt-1 uppercase tracking-widest">
              Sistema Orçamentário
            </p>
          </div>

          {/* Mensagens de Alerta */}
          {error && (
            <div className="mb-4 bg-rose-500/20 border border-rose-500/50 text-rose-200 p-3.5 rounded-xl text-xs leading-relaxed text-center flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {registerSuccess && (
            <div className="mb-4 bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 p-4 rounded-xl text-xs leading-relaxed text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5 font-bold text-sm text-emerald-300">
                <Clock className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Solicitação Enviada! ⏳</span>
              </div>
              <p>{registerSuccess}</p>
              <button
                onClick={() => { setMode('login'); setRegisterSuccess(null); }}
                className="mt-2 text-xs text-sky-300 hover:underline font-bold cursor-pointer"
              >
                Voltar para a tela de Login →
              </button>
            </div>
          )}

          {/* Formulário de LOGIN */}
          {mode === 'login' && !registerSuccess && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700/80 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent text-white placeholder-slate-500 outline-none text-xs font-medium transition-all"
                  placeholder="seu.email@brpengenharia.com.br"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700/80 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent text-white placeholder-slate-500 outline-none text-xs font-medium transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none mt-4 cursor-pointer flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Autenticando...' : 'Entrar no Sistema'}</span>
              </button>

              <div className="pt-4 border-t border-white/10 text-center">
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(null); setRegisterSuccess(null); }}
                  className="text-xs text-sky-400 hover:text-sky-300 font-semibold cursor-pointer transition-colors inline-flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Não tem uma conta? <strong>Solicitar Cadastro</strong></span>
                </button>
              </div>
            </form>
          )}

          {/* Formulário de CADASTRO */}
          {mode === 'register' && !registerSuccess && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="text-center mb-1">
                <span className="text-xs font-extrabold text-sky-300 uppercase tracking-wider">
                  Solicitação de Novo Acesso
                </span>
                <p className="text-[11px] text-slate-400">Preencha seus dados para enviar ao Gestor</p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={nomeReg}
                  onChange={(e) => setNomeReg(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800/60 border border-slate-700/80 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent text-white placeholder-slate-500 outline-none text-xs font-medium transition-all"
                  placeholder="Ex: João Silva"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">E-mail Corporativo</label>
                <input
                  type="email"
                  value={emailReg}
                  onChange={(e) => setEmailReg(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800/60 border border-slate-700/80 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent text-white placeholder-slate-500 outline-none text-xs font-medium transition-all"
                  placeholder="joao.silva@brpengenharia.com.br"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Cargo / Função</label>
                <select
                  value={cargoReg}
                  onChange={(e) => setCargoReg(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent text-white outline-none text-xs font-medium transition-all"
                >
                  <option value="Orçamentista">Orçamentista</option>
                  <option value="Engenheiro Civil">Engenheiro Civil</option>
                  <option value="Gestor de Projetos">Gestor de Projetos</option>
                  <option value="Analista de Propostas">Analista de Propostas</option>
                  <option value="Estagiário de Engenharia">Estagiário de Engenharia</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Senha</label>
                  <input
                    type="password"
                    value={passwordReg}
                    onChange={(e) => setPasswordReg(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/80 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent text-white placeholder-slate-500 outline-none text-xs font-medium transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Confirmar Senha</label>
                  <input
                    type="password"
                    value={confirmPasswordReg}
                    onChange={(e) => setConfirmPasswordReg(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/80 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent text-white placeholder-slate-500 outline-none text-xs font-medium transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none mt-3 cursor-pointer flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{loading ? 'Enviando Solicitação...' : 'Enviar Solicitação ao Gestor'}</span>
              </button>

              <div className="pt-3 border-t border-white/10 text-center">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); setRegisterSuccess(null); }}
                  className="text-xs text-slate-400 hover:text-white font-semibold cursor-pointer transition-colors inline-flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Já possui uma conta? <strong>Fazer Login</strong></span>
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

