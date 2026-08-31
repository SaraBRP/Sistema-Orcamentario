import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { HardHat, UserPlus, LogIn, Clock, AlertCircle } from 'lucide-react';
import { LOCAL_STORAGE_SOLICITACOES_KEY, type SolicitacaoCadastroUsuario } from '../components/ModalSolicitacoesCadastro';

import { getUserSavedPermissions } from '../lib/permissions';

const isSystemAdminEmail = (email?: string | null) => {
  if (!email) return false;
  const lower = email.trim().toLowerCase();
  return lower === 'sara.alves@brpmetalica.com' || lower.includes('sara.alves');
};

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Estados de Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Estados de Cadastro (Campos iniciam 100% VAZIOS)
  const [nomeReg, setNomeReg] = useState('');
  const [emailReg, setEmailReg] = useState('');
  const [passwordReg, setPasswordReg] = useState('');
  const [confirmPasswordReg, setConfirmPasswordReg] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
  
  const { session } = useAuth();

  if (session) {
    return <Navigate to="/" replace />;
  }

  const handleSwitchMode = (targetMode: 'login' | 'register') => {
    setMode(targetMode);
    setError(null);
    setRegisterSuccess(null);
    setNomeReg('');
    setEmailReg('');
    setPasswordReg('');
    setConfirmPasswordReg('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRegisterSuccess(null);

    const emailTrim = email.trim().toLowerCase();

    // 1. Busca status da solicitação de cadastro (no LocalStorage e no Supabase)
    let statusSolicitacao: string | null = null;
    let dadosSolicitacao: any = null;

    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SOLICITACOES_KEY);
      if (saved) {
        const list: SolicitacaoCadastroUsuario[] = JSON.parse(saved);
        const item = list.find(s => s.email.toLowerCase() === emailTrim);
        if (item) {
          statusSolicitacao = item.status;
          dadosSolicitacao = item;
        }
      }
    } catch {}

    if (!statusSolicitacao) {
      try {
        const { data: dbSol } = await supabase
          .schema('engenharia')
          .from('solicitacoes_cadastro')
          .select('*')
          .eq('email', emailTrim)
          .maybeSingle();

        if (dbSol) {
          statusSolicitacao = dbSol.status;
          dadosSolicitacao = dbSol;
        }
      } catch {}
    }

    if (statusSolicitacao === 'pendente') {
      setError('⏳ Sua solicitação de cadastro está PENDENTE DE APROVAÇÃO pelo Gestor. Aguarde a liberação para acessar.');
      setLoading(false);
      return;
    }

    if (statusSolicitacao === 'reprovado') {
      setError('❌ A sua solicitação de cadastro foi RECUSADA pelo Gestor. Faça um novo cadastro.');
      setLoading(false);
      return;
    }

    // 2. Tenta autenticação no Supabase Auth
    const { error: authError } = await supabase.auth.signInWithPassword({ email: emailTrim, password });
    if (!authError) {
      let nome = emailTrim.split('@')[0];
      nome = nome.charAt(0).toUpperCase() + nome.slice(1);
      const isAdmin = isSystemAdminEmail(emailTrim);
      let cargo = isAdmin ? 'Administrador' : 'Orçamentista';

      if (dadosSolicitacao) {
        if (dadosSolicitacao.nome) nome = dadosSolicitacao.nome;
        if (dadosSolicitacao.cargo) cargo = dadosSolicitacao.cargo;
      }

      const funcaoFinal = isAdmin || cargo.toLowerCase() === 'administrador' ? 'Administrador' : (cargo === 'Gestor' || cargo === 'gestor' ? 'Gestor' : 'Orçamentista');
      const permittedScreens = getUserSavedPermissions(emailTrim, funcaoFinal);

      localStorage.setItem('orcabrp_user_profile', JSON.stringify({
        nome: isAdmin ? 'Sara' : nome,
        email: emailTrim,
        funcao: funcaoFinal,
        avatarUrl: '',
        permitted_screens: permittedScreens
      }));

      window.location.href = '/';
      return;
    }

    // 3. Se a conta for aprovada via Gestor (independente de ter conta no Supabase Auth)
    if (statusSolicitacao === 'aprovado' || (dadosSolicitacao && dadosSolicitacao.status === 'aprovado')) {
      const isAdmin = isSystemAdminEmail(emailTrim);
      const nome = dadosSolicitacao?.nome || emailTrim.split('@')[0];
      const cargo = dadosSolicitacao?.cargo || (isAdmin ? 'Administrador' : 'Orçamentista');

      const funcaoFinal = isAdmin || cargo.toLowerCase() === 'administrador' ? 'Administrador' : (cargo === 'Gestor' || cargo === 'gestor' ? 'Gestor' : 'Orçamentista');
      const permittedScreens = getUserSavedPermissions(emailTrim, funcaoFinal);

      localStorage.setItem('orcabrp_user_profile', JSON.stringify({
        nome: isAdmin ? 'Sara' : nome,
        email: emailTrim,
        funcao: funcaoFinal,
        avatarUrl: '',
        permitted_screens: permittedScreens
      }));

      window.location.href = '/';
      return;
    }

    // 4. Se o usuário foi excluído ou não possui cadastro ativo/aprovado no sistema
    setError('🔍 Usuário não encontrado. Por favor, solicite um novo cadastro para acessar.');
    setLoading(false);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRegisterSuccess(null);

    if (!nomeReg.trim() || !emailReg.trim() || !passwordReg || !confirmPasswordReg) {
      setError('Por favor, preencha todos os campos.');
      setLoading(false);
      return;
    }

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
        cargo: 'Pendente de Definição pelo Gestor',
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
            cargo: 'Pendente de Definição pelo Gestor',
            status: 'pendente'
          });
      } catch {}

      setRegisterSuccess(`Solicitação enviada com sucesso! A conta de "${nomeTrim}" foi enviada para análise e definição de perfil pelo Gestor.`);
      
      // Reseta campos
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
            <div className="mb-4 bg-rose-500/20 border border-rose-500/50 text-rose-200 p-3.5 rounded-xl text-xs leading-relaxed text-center flex flex-col items-center justify-center gap-2">
              <div className="flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
              {(error.includes('não encontrado') || error.includes('RECUSADA') || error.includes('recusada')) && (
                <button
                  type="button"
                  onClick={() => handleSwitchMode('register')}
                  className="mt-1 px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Criar Nova Conta / Solicitar Cadastro</span>
                </button>
              )}
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
                onClick={() => handleSwitchMode('login')}
                className="mt-2 text-xs text-sky-300 hover:underline font-bold cursor-pointer"
              >
                Voltar para a tela de Login →
              </button>
            </div>
          )}

          {/* Formulário de LOGIN */}
          {mode === 'login' && !registerSuccess && (
            <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">E-mail</label>
                <input
                  type="email"
                  name="user_email_login"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-900 font-normal text-xs placeholder:text-slate-400 outline-none transition-all shadow-2xs"
                  placeholder="seu.email@brpengenharia.com.br"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">Senha</label>
                <input
                  type="password"
                  name="user_password_login"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-900 font-normal text-xs placeholder:text-slate-400 outline-none transition-all shadow-2xs"
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
                  onClick={() => handleSwitchMode('register')}
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
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5" autoComplete="off">
              <div className="text-center mb-1">
                <span className="text-xs font-extrabold text-sky-300 uppercase tracking-wider">
                  Solicitação de Novo Acesso
                </span>
                <p className="text-[11px] text-slate-300">Digite seus dados para enviar ao Gestor</p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-200 mb-1">Nome Completo</label>
                <input
                  type="text"
                  name="reg_full_name"
                  id="reg_full_name"
                  autoComplete="off"
                  value={nomeReg}
                  onChange={(e) => setNomeReg(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-900 font-normal text-xs placeholder:text-slate-400 outline-none transition-all shadow-2xs"
                  placeholder="Digite seu nome completo"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-200 mb-1">E-mail Corporativo</label>
                <input
                  type="email"
                  name="reg_email"
                  id="reg_email"
                  autoComplete="off"
                  value={emailReg}
                  onChange={(e) => setEmailReg(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-900 font-normal text-xs placeholder:text-slate-400 outline-none transition-all shadow-2xs"
                  placeholder="seu.email@brpengenharia.com.br"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-200 mb-1">Senha</label>
                  <input
                    type="password"
                    name="reg_new_password"
                    id="reg_new_password"
                    autoComplete="new-password"
                    value={passwordReg}
                    onChange={(e) => setPasswordReg(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-900 font-normal text-xs placeholder:text-slate-400 outline-none transition-all shadow-2xs"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-200 mb-1">Confirmar Senha</label>
                  <input
                    type="password"
                    name="reg_confirm_password"
                    id="reg_confirm_password"
                    autoComplete="new-password"
                    value={confirmPasswordReg}
                    onChange={(e) => setConfirmPasswordReg(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-900 font-normal text-xs placeholder:text-slate-400 outline-none transition-all shadow-2xs"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none mt-3 cursor-pointer flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{loading ? 'Enviando Solicitação...' : 'Enviar Solicitação ao Gestor'}</span>
              </button>

              <div className="pt-3 border-t border-white/10 text-center">
                <button
                  type="button"
                  onClick={() => handleSwitchMode('login')}
                  className="text-xs text-slate-300 hover:text-white font-semibold cursor-pointer transition-colors inline-flex items-center gap-1.5"
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

