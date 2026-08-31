import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard,
  Package,
  Layers,
  Calculator,
  LogOut,
  Settings,
  Menu,
  X,
  BarChart3,
  Building2,
  Database,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  BookOpen,
  GitBranch,
  Handshake,
  GraduationCap,
  Bell,
  LayoutGrid,
  User,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ModalKanbanOrcamentos } from './ModalKanbanOrcamentos';
import { ModalEditarPerfil, type UserProfileData } from './ModalEditarPerfil';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface NotificacaoItem {
  id: string;
  tipo: 'aprovado' | 'reprovado' | 'revisao' | 'cotacao';
  titulo: string;
  mensagem: string;
  tempo: string;
  lida: boolean;
}

type NavSection = {
  name: string;
  icon: React.ElementType;
  path?: string;
  children?: { name: string; path: string; icon: React.ElementType }[];
};

const navSections: NavSection[] = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  {
    name: 'Orçamentos',
    icon: Calculator,
    path: '/orcamentos',
    children: [
      { name: 'Quantitativos', path: '/orcamentos/calculos', icon: Calculator },
    ],
  },
  {
    name: 'Banco Próprio',
    icon: Building2,
    children: [
      { name: 'Composições', path: '/banco-proprio/composicoes', icon: Layers },
      { name: 'Insumos', path: '/banco-proprio/insumos', icon: Package },
    ],
  },
  {
    name: 'Banco do Sistema',
    icon: Database,
    children: [
      { name: 'Composições', path: '/banco-sistema/composicoes', icon: Layers },
      { name: 'Insumos', path: '/banco-sistema/insumos', icon: Package },
    ],
  },
  { name: 'Curva ABC', path: '/curva-abc', icon: BarChart3 },
  { name: 'Cotações', path: '/cotacoes', icon: Handshake },
  { name: 'Fluxo de Aprovação', path: '/fluxo-aprovacao', icon: GitBranch },
  { name: 'Padrões Técnicos', path: '/padroes-tecnicos', icon: BookOpen },
  { name: 'Relatórios', path: '/relatorios', icon: FileText },
  { name: 'Aprendizado', path: '/aprendizado', icon: GraduationCap },
  { name: 'Configurações', path: '/configuracoes', icon: Settings },
];

export default function Layout() {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Estado do Perfil do Usuário (Persistido no localStorage)
  const [userProfile, setUserProfile] = useState<UserProfileData>(() => {
    try {
      const saved = localStorage.getItem('orcabrp_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          funcao: parsed.funcao === 'Gestor' ? 'Gestor' : 'Orçamentista'
        };
      }
    } catch {}
    return {
      nome: 'Sara',
      email: user?.email || 'sara.alves@brpmetalica.com',
      funcao: 'Orçamentista',
      avatarUrl: ''
    };
  });

  const handleSaveProfile = (updated: UserProfileData) => {
    setUserProfile(updated);
    try {
      localStorage.setItem('orcabrp_user_profile', JSON.stringify(updated));
    } catch {}
  };

  // Estados dos Modais e Popovers
  const [kanbanModalOpen, setKanbanModalOpen] = useState(false);
  const [editarPerfilModalOpen, setEditarPerfilModalOpen] = useState(false);
  const [notificacoesOpen, setNotificacoesOpen] = useState(false);
  const [perfilOpen, setPerfilOpen] = useState(false);

  const [notificacoes, setNotificacoes] = useState<NotificacaoItem[]>([]);
  const [kanbanUnreadCount, setKanbanUnreadCount] = useState<number>(0);

  useEffect(() => {
    const updateUnreadCount = () => {
      try {
        const lastViewedRaw = localStorage.getItem('kanban_last_viewed_time');
        
        // Se o usuário nunca abriu o Kanban nesta sessão/dispositivo, inicializamos com o timestamp atual
        // para que não mostre o badge "1" desnecessariamente sem haver mudança recente.
        if (!lastViewedRaw) {
          localStorage.setItem('kanban_last_viewed_time', String(Date.now()));
          setKanbanUnreadCount(0);
          return;
        }

        const lastViewed = parseInt(lastViewedRaw, 10);
        const saved = localStorage.getItem('brp_orcamentos_list');
        if (saved) {
          const list = JSON.parse(saved);
          if (Array.isArray(list)) {
            let unread = 0;
            list.forEach((item: any) => {
              const itemTime = item.updated_at ? new Date(item.updated_at).getTime() : (item.dataCriacao ? new Date(item.dataCriacao).getTime() : 0);
              if (itemTime > lastViewed) {
                unread++;
              }
            });
            setKanbanUnreadCount(unread);
          }
        }
      } catch (e) {
        setKanbanUnreadCount(0);
      }
    };

    updateUnreadCount();
    window.addEventListener('storage', updateUnreadCount);
    const interval = setInterval(updateUnreadCount, 8000);
    return () => {
      window.removeEventListener('storage', updateUnreadCount);
      clearInterval(interval);
    };
  }, []);

  const handleOpenKanban = () => {
    setKanbanModalOpen(true);
    setKanbanUnreadCount(0);
    try {
      localStorage.setItem('kanban_last_viewed_time', String(Date.now()));
    } catch (e) {}
  };

  const notificacoesNaoLidas = notificacoes.filter(n => !n.lida).length;

  const marcarTodasLidas = () => {
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
  };

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const [expandedSections, setExpandedSections] = useState<string[]>(['Orçamentos', 'Banco Próprio', 'Banco do Sistema']);

  const toggleSection = (name: string) => {
    setExpandedSections(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    );
  };

  const isPathActive = (path?: string) => {
    if (!path) return false;
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isSectionActive = (section: NavSection) => {
    if (section.path && isPathActive(section.path)) return true;
    if (section.children) {
      return section.children.some(child => isPathActive(child.path));
    }
    return false;
  };

  const obterTituloPagina = (pathname: string) => {
    if (pathname === '/') return 'Dashboard de Custos & Indicadores';
    if (pathname.includes('/calculos')) return 'Memorial de Cálculos Quantitativos';
    if (pathname.includes('/orcamentos')) return 'Gerenciamento de Orçamentos & Propostas';
    if (pathname.includes('/banco-proprio')) return 'Banco de Dados Próprio (Composições & Insumos)';
    if (pathname.includes('/banco-sistema')) return 'Banco de Dados do Sistema (SINAPI / ORSE / GOINFRA)';
    if (pathname.includes('/curva-abc')) return 'Curva ABC de Insumos & Serviços';
    if (pathname.includes('/cotacoes')) return 'Cotações de Fornecedores & Insumos';
    if (pathname.includes('/fluxo-aprovacao')) return 'Fluxo de Aprovação de Orçamentos';
    if (pathname.includes('/padroes-tecnicos')) return 'Padrões Técnicos & Especificações';
    if (pathname.includes('/relatorios')) return 'Emissão de Relatórios & Exportação XLSX/PDF';
    if (pathname.includes('/aprendizado')) return 'Central de Aprendizado & Guias Práticos';
    if (pathname.includes('/configuracoes')) return 'Configurações do Sistema';
    return 'OrçaBRP Engenharia';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row font-sans">
      
      {/* Modal Kanban de Orçamentos */}
      <ModalKanbanOrcamentos
        isOpen={kanbanModalOpen}
        onClose={() => setKanbanModalOpen(false)}
      />

      {/* Modal de Edição de Perfil (Ao Clicar no Avatar S) */}
      <ModalEditarPerfil
        isOpen={editarPerfilModalOpen}
        onClose={() => setEditarPerfilModalOpen(false)}
        profile={userProfile}
        onSaveProfile={handleSaveProfile}
      />

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-slate-900 border-b border-slate-800 p-3.5 z-30 relative">
        <div className="font-extrabold text-white flex items-center gap-3">
          <div className="flex items-center gap-1.5 shrink-0">
            <img src="/logo_brp.png" alt="Logo BRP Engenharia" className="h-7 w-auto object-contain drop-shadow" />
            <img src="/logo_brp_metalica.png" alt="Logo BRP Soluções Metálicas" className="h-7 w-auto object-contain drop-shadow" />
          </div>
          <div>
            <span className="text-base font-extrabold text-white block leading-none">OrçaBRP</span>
          </div>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-300 hover:text-white cursor-pointer">
          {sidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'bg-slate-900 flex flex-col transition-all duration-300 fixed md:sticky top-0 z-20 h-screen overflow-hidden border-r border-slate-800/80',
          sidebarCollapsed ? 'w-20' : 'w-64',
          !sidebarOpen && '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo Header */}
        <div className={cn("p-3.5 hidden md:flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40", sidebarCollapsed && "flex-col gap-2.5 py-3 px-2 text-center")}>
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center gap-2.5 w-full">
              <div 
                className="flex flex-col items-center gap-1.5 cursor-pointer group" 
                onClick={toggleSidebarCollapse} 
                title="Clique para Expandir Menu"
              >
                <img src="/logo_brp.png" alt="Logo BRP 1" className="h-6 w-auto object-contain drop-shadow-md group-hover:scale-110 transition-transform" />
                <img src="/logo_brp_metalica.png" alt="Logo BRP 2" className="h-6 w-auto object-contain drop-shadow-md group-hover:scale-110 transition-transform" />
              </div>
              <button
                onClick={toggleSidebarCollapse}
                className="p-1.5 bg-slate-800/80 hover:bg-blue-600 rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer shadow-xs border border-slate-700/80 mt-1 flex items-center justify-center"
                title="Expandir Menu Lateral"
              >
                <ChevronRight className="w-4 h-4 text-blue-400 hover:text-white transition-colors" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5 shrink-0">
                  <img src="/logo_brp.png" alt="Logo BRP Engenharia" className="h-7 w-auto object-contain drop-shadow-md hover:scale-105 transition-transform" />
                  <img src="/logo_brp_metalica.png" alt="Logo BRP Soluções Metálicas" className="h-7 w-auto object-contain drop-shadow-md hover:scale-105 transition-transform" />
                </div>
                <div>
                  <h2 className="font-extrabold text-white text-base leading-none tracking-tight">OrçaBRP</h2>
                </div>
              </div>
              <button
                onClick={toggleSidebarCollapse}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer ml-2"
                title="Recolher Menu"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navSections.map((section) => {
            if (section.children) {
              const expanded = !sidebarCollapsed && expandedSections.includes(section.name);
              const active = isSectionActive(section);
              const Icon = section.icon;

              return (
                <div key={section.name}>
                  {section.path ? (
                    <div
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                        active ? 'text-white bg-slate-700/60' : 'text-slate-400 hover:text-white hover:bg-slate-800/60',
                        sidebarCollapsed && 'justify-center'
                      )}
                    >
                      <Link
                        to={section.path}
                        className="flex items-center gap-3 flex-1 overflow-hidden"
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        {!sidebarCollapsed && <span>{section.name}</span>}
                      </Link>

                      {!sidebarCollapsed && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleSection(section.name);
                          }}
                          className="p-1 hover:bg-slate-600/50 rounded transition-colors text-slate-400 hover:text-white shrink-0 ml-1 cursor-pointer"
                        >
                          {expanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (sidebarCollapsed) {
                          setSidebarCollapsed(false);
                        } else {
                          toggleSection(section.name);
                        }
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group cursor-pointer',
                        active ? 'text-white bg-slate-700/60' : 'text-slate-400 hover:text-white hover:bg-slate-800/60',
                        sidebarCollapsed && 'justify-center'
                      )}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Icon className="w-5 h-5 shrink-0" />
                        {!sidebarCollapsed && <span>{section.name}</span>}
                      </div>

                      {!sidebarCollapsed && (
                        <span className="text-slate-400 group-hover:text-white transition-colors">
                          {expanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </span>
                      )}
                    </button>
                  )}

                  {expanded && !sidebarCollapsed && (
                    <div className="mt-1 ml-4 pl-3 border-l border-slate-700/60 space-y-1">
                      {section.children.map((child) => {
                        const childActive = isPathActive(child.path);
                        const ChildIcon = child.icon;
                        return (
                          <Link
                            key={child.path}
                            to={child.path}
                            className={cn(
                              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                              childActive
                                ? 'bg-blue-600/90 text-white font-bold shadow-2xs'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                            )}
                          >
                            <ChildIcon className="w-4 h-4 shrink-0" />
                            <span>{child.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const Icon = section.icon;
            const active = section.path ? isPathActive(section.path) : false;
            return (
              <Link
                key={section.name}
                to={section.path!}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  active ? 'bg-blue-600/90 text-white shadow-sm shadow-blue-900/40' : 'text-slate-400 hover:text-white hover:bg-slate-800/60',
                  sidebarCollapsed && 'justify-center'
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!sidebarCollapsed && <span>{section.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800/80">
          <button
            onClick={signOut}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-all w-full group cursor-pointer",
              sidebarCollapsed && "justify-center"
            )}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!sidebarCollapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-100">
        <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-2.5 flex items-center justify-between shadow-2xs z-10 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <span>{obterTituloPagina(location.pathname)}</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            
            {/* Botão 1: Kanban de Orçamentos (APENAS ÍCONE) */}
            <button
              type="button"
              onClick={handleOpenKanban}
              className="p-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl transition-all relative cursor-pointer border border-slate-200"
              title="Abrir Quadro Kanban de Orçamentos"
            >
              <LayoutGrid className="w-4.5 h-4.5 text-slate-700" />
              {kanbanUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white font-bold text-[9.5px] rounded-full flex items-center justify-center shadow-xs animate-pulse">
                  {kanbanUnreadCount}
                </span>
              )}
            </button>

            {/* Botão 2: Notificações com Badge */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotificacoesOpen(!notificacoesOpen);
                  setPerfilOpen(false);
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl transition-all relative cursor-pointer border border-slate-200"
                title="Notificações"
              >
                <Bell className="w-4.5 h-4.5" />
                {notificacoesNaoLidas > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white font-bold text-[9.5px] rounded-full flex items-center justify-center animate-pulse">
                    {notificacoesNaoLidas}
                  </span>
                )}
              </button>

              {notificacoesOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-4 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-blue-600" />
                      <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Notificações</h3>
                      {notificacoesNaoLidas > 0 && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full">
                          {notificacoesNaoLidas} novas
                        </span>
                      )}
                    </div>
                    {notificacoesNaoLidas > 0 && (
                      <button
                        type="button"
                        onClick={marcarTodasLidas}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                      >
                        Marcar lidas
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {notificacoes.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs font-medium space-y-1">
                        <Bell className="w-7 h-7 mx-auto text-slate-300 mb-1 opacity-60" />
                        <p className="font-semibold text-slate-600">Nenhuma notificação no momento</p>
                        <p className="text-[11px] text-slate-400">As notificações de aprovações e cotações surgirão aqui.</p>
                      </div>
                    ) : (
                      notificacoes.map((n) => (
                        <div 
                          key={n.id} 
                          className={`p-3 rounded-xl border text-xs space-y-1 transition-all ${
                            n.lida ? 'bg-slate-50 border-slate-200 opacity-75' : 'bg-blue-50/50 border-blue-200'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className={n.tipo === 'aprovado' ? 'text-emerald-700' : n.tipo === 'reprovado' ? 'text-rose-700' : 'text-blue-700'}>
                              {n.titulo}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">{n.tempo}</span>
                          </div>
                          <p className="text-slate-600 text-[11px] leading-relaxed">{n.mensagem}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setNotificacoesOpen(false);
                        setKanbanModalOpen(true);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>Ver todas no Kanban</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Avatar do Orçamentista (Bolinha no Canto Superior Direito - Clique abre Edição de Perfil!) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setEditarPerfilModalOpen(true)}
                className="flex items-center gap-2.5 p-1 hover:bg-slate-100 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-slate-200 group"
                title="Clique para editar seu nome e foto de perfil"
              >
                <div className="relative">
                  {userProfile.avatarUrl ? (
                    <img 
                      src={userProfile.avatarUrl} 
                      alt={userProfile.nome} 
                      className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-md group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white font-extrabold text-sm flex items-center justify-center shadow-md border-2 border-white group-hover:scale-105 transition-transform">
                      {userProfile.nome ? userProfile.nome[0].toUpperCase() : 'S'}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" title="Online"></span>
                </div>
                <div className="hidden lg:block text-left pr-1">
                  <span className="text-xs font-extrabold text-slate-900 block leading-tight group-hover:text-blue-600 transition-colors">
                    {userProfile.nome}
                  </span>
                  <span className="text-[10.5px] text-slate-500 block leading-tight font-semibold">
                    {userProfile.funcao}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
              </button>

              {/* Dropdown de Ações Rápidas do Perfil */}
              {perfilOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-3.5 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    {userProfile.avatarUrl ? (
                      <img src={userProfile.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover shadow" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-base flex items-center justify-center shadow">
                        {userProfile.nome ? userProfile.nome[0].toUpperCase() : 'S'}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{userProfile.nome}</h4>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{userProfile.email}</p>
                      <span className="inline-block mt-0.5 px-2 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9.5px] font-bold rounded-md uppercase">
                        {userProfile.funcao}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs font-semibold text-slate-700">
                    <button
                      type="button"
                      onClick={() => {
                        setPerfilOpen(false);
                        setEditarPerfilModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <User className="w-4 h-4 text-blue-600" />
                      <span>Editar Nome & Foto</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPerfilOpen(false);
                        navigate('/aprendizado');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <GraduationCap className="w-4 h-4 text-slate-500" />
                      <span>Central de Aprendizado</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={signOut}
                      className="w-full text-left px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sair do Sistema</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        {(() => {
          const isFullWidthPage = location.pathname.includes('/depara') || location.pathname.includes('/orcamentos/');
          return (
            <div className={cn("flex-1 overflow-auto bg-slate-50/50", isFullWidthPage ? "p-2 md:p-4" : "p-4 md:p-8")}>
              <div className={cn("mx-auto w-full", isFullWidthPage ? "max-w-full" : "max-w-7xl")}>
                <Outlet context={{ sidebarCollapsed }} />
              </div>
            </div>
          );
        })()}
      </main>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-10 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
