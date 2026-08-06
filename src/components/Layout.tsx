import { Link, Outlet, useLocation } from 'react-router-dom';
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
} from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
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
      { name: 'Cálculos Quantitativos', path: '/orcamentos/calculos', icon: Calculator },
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
  { name: 'Configurações', path: '/configuracoes', icon: Settings },
];

export default function Layout() {
  const { signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

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

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  const isSectionActive = (section: NavSection) => {
    if (section.path) return isActive(section.path);
    return section.children?.some(c => isActive(c.path)) ?? false;
  };


  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans text-slate-800">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-slate-900 border-b border-slate-800 p-3.5 z-30 relative">
        <div className="font-extrabold text-white flex items-center gap-3">
          <div className="flex items-center gap-1.5 shrink-0">
            <img src="/logo_brp.png" alt="Logo BRP Engenharia" className="h-7 w-auto object-contain drop-shadow" />
            <img src="/logo_brp_metalica.png" alt="Logo BRP Soluções Metálicas" className="h-7 w-auto object-contain drop-shadow" />
          </div>
          <div>
            <span className="text-xs font-extrabold text-white block leading-tight">Sistema Orçamentário</span>
            <span className="text-[9px] text-sky-400 font-extrabold uppercase tracking-wider block">BRP</span>
          </div>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-300 hover:text-white">
          {sidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'bg-slate-900 flex flex-col transition-all duration-300 fixed md:sticky top-0 z-20 h-screen overflow-hidden',
          sidebarCollapsed ? 'w-20' : 'w-64',
          !sidebarOpen && '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo Header */}
        <div className={cn("p-3.5 hidden md:flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40", sidebarCollapsed && "flex-col gap-2 py-3 px-2 text-center")}>
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center gap-2 cursor-pointer w-full" onClick={toggleSidebarCollapse} title="Expandir Menu">
              <img src="/logo_brp.png" alt="Logo BRP 1" className="h-6 w-auto object-contain drop-shadow-md hover:scale-110 transition-transform" />
              <img src="/logo_brp_metalica.png" alt="Logo BRP 2" className="h-6 w-auto object-contain drop-shadow-md hover:scale-110 transition-transform" />
              <button
                className="mt-1 p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Expandir Menu"
              >
                <ChevronRight className="w-4 h-4" />
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
                  <h2 className="font-extrabold text-white text-xs leading-tight tracking-tight">Sistema Orçamentário</h2>
                  <p className="text-[10px] text-sky-400 font-extrabold uppercase tracking-wider">BRP</p>
                </div>
              </div>
              <button
                onClick={toggleSidebarCollapse}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Recolher Menu"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Nav */}
        <style>{`
          .sidebar-no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .sidebar-no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto sidebar-no-scrollbar">
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
                        title={sidebarCollapsed ? section.name : undefined}
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
                          title="Mostrar / Minimizar Cálculos Quantitativos"
                        >
                          <ChevronDown
                            className={cn('w-4 h-4 transition-transform duration-200', expanded && 'rotate-180')}
                          />
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => !sidebarCollapsed && toggleSection(section.name)}
                      className={cn(
                        'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                        active ? 'text-white bg-slate-700/60' : 'text-slate-400 hover:text-white hover:bg-slate-800/60',
                        sidebarCollapsed && 'justify-center'
                      )}
                      title={sidebarCollapsed ? section.name : undefined}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 shrink-0" />
                        {!sidebarCollapsed && <span>{section.name}</span>}
                      </div>
                      {!sidebarCollapsed && (
                        <ChevronDown
                          className={cn('w-4 h-4 transition-transform duration-200 shrink-0', expanded && 'rotate-180')}
                        />
                      )}
                    </button>
                  )}

                  {/* Sub-items */}
                  {!sidebarCollapsed && (
                    <div className={cn(
                      'overflow-hidden transition-all duration-200',
                      expanded ? 'max-h-40 opacity-100 mt-0.5' : 'max-h-0 opacity-0'
                    )}>
                      <div className="ml-4 pl-3 border-l border-slate-700 space-y-0.5 py-0.5">
                        {section.children.map((child) => {
                          const ChildIcon = child.icon;
                          const childActive = isActive(child.path);
                          return (
                            <Link
                              key={child.path}
                              to={child.path}
                              className={cn(
                                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all',
                                childActive
                                  ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-900/50'
                                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                              )}
                            >
                              <ChildIcon className="w-4 h-4 shrink-0" />
                              <span>{child.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            // Itens simples
            const Icon = section.icon;
            const active = section.path ? isActive(section.path) : false;
            return (
              <Link
                key={section.name}
                to={section.path!}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  active ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40' : 'text-slate-400 hover:text-white hover:bg-slate-800/60',
                  sidebarCollapsed && 'justify-center'
                )}
                title={sidebarCollapsed ? section.name : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!sidebarCollapsed && <span>{section.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sair */}
        <div className="p-3 border-t border-slate-700/60">
          <button
            onClick={signOut}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-all w-full group",
              sidebarCollapsed && "justify-center"
            )}
            title={sidebarCollapsed ? "Sair" : undefined}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!sidebarCollapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className={cn("flex-1 overflow-auto bg-slate-50/50", location.pathname.includes('/depara') ? "p-0" : "p-4 md:p-8")}>
          <div className={cn("mx-auto w-full", location.pathname.includes('/depara') ? "max-w-full" : "max-w-7xl")}>
            <Outlet context={{ sidebarCollapsed }} />
          </div>
        </div>
      </main>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-10 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
