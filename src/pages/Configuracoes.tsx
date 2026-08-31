import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, 
  ShieldCheck, 
  UserCheck, 
  UserX, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  AlertCircle, 
  Lock, 
  Layers, 
  Building2, 
  Calculator, 
  BarChart3, 
  Handshake, 
  GitBranch, 
  BookOpen, 
  FileText, 
  Settings,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  RefreshCw
} from 'lucide-react';
import { clsx } from 'clsx';

type Tab = 'usuarios' | 'permissoes';
type SubTabUsuarios = 'lista' | 'pendentes';

interface Profile {
  id: string;
  nome: string | null;
  email: string | null;
  cargo: string | null;
  created_at: string;
  status: 'ativo' | 'inativo' | string;
  approved: boolean;
  permitted_screens?: string[];
  permitted_users?: string[];
}

const MODULOS_SISTEMA = [
  { id: 'dashboard', name: 'Dashboard', icon: Layers, desc: 'Visão geral e métricas' },
  { id: 'orcamentos', name: 'Orçamentos & Cálculos', icon: Calculator, desc: 'Montagem e cálculos quantitativos' },
  { id: 'banco-proprio', name: 'Banco Próprio', icon: Building2, desc: 'Composições e Insumos da BRP' },
  { id: 'banco-sistema', name: 'Banco do Sistema', icon: Layers, desc: 'Bases públicas (SINAPI, SICRO, GOINFRA)' },
  { id: 'curva-abc', name: 'Curva ABC', icon: BarChart3, desc: 'Análise de curva S e Pareto' },
  { id: 'cotacoes', name: 'Cotações', icon: Handshake, desc: 'Quadro comparativo de propostas de fornecedores' },
  { id: 'fluxo-aprovacao', name: 'Fluxo de Aprovação', icon: GitBranch, desc: 'Aprovação de alçadas de orçamentos' },
  { id: 'padroes-tecnicos', name: 'Padrões Técnicos', icon: BookOpen, desc: 'Manuais técnicos e especificações' },
  { id: 'relatorios', name: 'Relatórios', icon: FileText, desc: 'Emissão de relatórios em XLSX/PDF' },
  { id: 'configuracoes', name: 'Configurações', icon: Settings, desc: 'Gestão de usuários e permissões de acesso' },
];

export default function Configuracoes() {
  const [activeTab, setActiveTab] = useState<Tab>('usuarios');
  const [subTabUsuarios, setSubTabUsuarios] = useState<SubTabUsuarios>('lista');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cargoFiltro, setCargoFiltro] = useState('Todos');
  const [isExclusiveTable, setIsExclusiveTable] = useState(false);

  // Estado para Edição de Usuário / Permissões
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [editCargo, setEditCargo] = useState('orcamentista');
  const [editStatus, setEditStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [editScreens, setEditScreens] = useState<string[]>([]);
  const [savingUser, setSavingUser] = useState(false);

  // Estado para Novo Cadastro Manual
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCargo, setNewCargo] = useState('orcamentista');

  // Estado para Ordenação
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);

    let dbProfiles: Profile[] = [];
    let isExclusive = false;

    // 1. Busca perfis de usuários salvos no banco
    const { data: engData, error: engError } = await supabase
      .schema('engenharia')
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: false });

    if (!engError && engData) {
      dbProfiles = engData.filter(p => p.email && p.nome !== 'Time Comercial' && p.status !== 'excluido');
      isExclusive = true;
    } else {
      const { data: pubData, error: pubError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!pubError && pubData) {
        dbProfiles = pubData.filter(p => p.email && p.nome !== 'Time Comercial' && p.status !== 'excluido');
      }
      isExclusive = false;
    }

    setIsExclusiveTable(isExclusive);

    // 2. Busca solicitações de cadastro pendentes enviadas da tela de login (LocalStorage + Supabase)
    let localPending: any[] = [];
    try {
      const savedSol = localStorage.getItem('brp_solicitacoes_cadastro_usuarios');
      if (savedSol) {
        const list = JSON.parse(savedSol);
        localPending = list.filter((s: any) => s.status === 'pendente');
      }
    } catch {}

    let dbPending: any[] = [];
    try {
      const { data } = await supabase
        .schema('engenharia')
        .from('solicitacoes_cadastro')
        .select('*')
        .eq('status', 'pendente');
      if (data) dbPending = data;
    } catch {}

    const pendingMap = new Map<string, Profile>();
    
    dbPending.forEach(s => {
      pendingMap.set(s.email.toLowerCase(), {
        id: s.id,
        nome: s.nome,
        email: s.email,
        cargo: s.cargo || 'orcamentista',
        status: 'pendente',
        approved: false,
        created_at: s.data_solicitacao || s.created_at || new Date().toISOString()
      });
    });

    localPending.forEach(s => {
      if (!pendingMap.has(s.email.toLowerCase())) {
        pendingMap.set(s.email.toLowerCase(), {
          id: s.id,
          nome: s.nome,
          email: s.email,
          cargo: s.cargo || 'orcamentista',
          status: 'pendente',
          approved: false,
          created_at: s.dataSolicitacao || new Date().toISOString()
        });
      }
    });

    const existingEmails = new Set(dbProfiles.map(p => (p.email || '').toLowerCase()));
    const finalPendingList: Profile[] = [];
    pendingMap.forEach((p, emailKey) => {
      if (emailKey && !existingEmails.has(emailKey)) {
        finalPendingList.push(p);
      }
    });

    setProfiles([...dbProfiles, ...finalPendingList]);
    setLoading(false);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else { setSortField(null); setSortDirection('asc'); }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filtragem de registros válidos (ignora contas de sistema sem e-mail e excluidos)
  const validProfiles = useMemo(() => {
    return profiles.filter(p => p.email && p.nome !== 'Time Comercial' && p.status !== 'excluido');
  }, [profiles]);

  // Separação entre Aprovados e Pendentes
  const approvedProfiles = useMemo(() => {
    return validProfiles.filter(p => p.approved !== false);
  }, [validProfiles]);

  // Seleciona automaticamente o primeiro colaborador na matriz de permissões
  useEffect(() => {
    if (activeTab === 'permissoes' && approvedProfiles.length > 0 && !selectedUser) {
      handleSelectUserForPermissions(approvedProfiles[0]);
    }
  }, [activeTab, approvedProfiles, selectedUser]);

  const pendingProfiles = useMemo(() => {
    return validProfiles.filter(p => p.approved === false);
  }, [validProfiles]);

  // Lista filtrada e ordenada de usuários ativos
  const filteredUsers = useMemo(() => {
    const targetList = subTabUsuarios === 'lista' ? approvedProfiles : pendingProfiles;

    let list = targetList.filter(p => {
      const matchSearch =
        (p.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchCargo = cargoFiltro === 'Todos' || p.cargo === cargoFiltro;
      return matchSearch && matchCargo;
    });

    if (sortField) {
      list.sort((a: any, b: any) => {
        let valA = a[sortField] || '';
        let valB = b[sortField] || '';
        let cmp = String(valA).localeCompare(String(valB), 'pt-BR', { numeric: true, sensitivity: 'base' });
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    return list;
  }, [approvedProfiles, pendingProfiles, subTabUsuarios, searchTerm, cargoFiltro, sortField, sortDirection]);

  // Aprovar Acesso de Usuário Pendente
  const handleAprovar = async (id: string, email?: string | null) => {
    try {
      if (isExclusiveTable) {
        await supabase.schema('engenharia').from('usuarios').update({ approved: true, status: 'ativo' }).eq('id', id);
      } else {
        await supabase.from('profiles').update({ approved: true, status: 'ativo' }).eq('id', id);
      }
    } catch {}

    try {
      await supabase.schema('engenharia').from('solicitacoes_cadastro').update({ status: 'aprovado' }).eq('id', id);
    } catch {}

    try {
      const saved = localStorage.getItem('brp_solicitacoes_cadastro_usuarios');
      if (saved) {
        const list = JSON.parse(saved);
        const updated = list.map((s: any) => 
          s.id === id || (email && s.email.toLowerCase() === email.toLowerCase()) 
            ? { ...s, status: 'aprovado' } 
            : s
        );
        localStorage.setItem('brp_solicitacoes_cadastro_usuarios', JSON.stringify(updated));
      }
    } catch {}

    window.dispatchEvent(new Event('storage'));
    fetchProfiles();
  };

  const handleRecusarOuExcluir = async (id: string, nome?: string | null, email?: string | null) => {
    if (!window.confirm(`Tem certeza que deseja recusar/excluir o cadastro de "${nome || 'selecionado'}"?`)) return;

    try {
      await supabase.schema('engenharia').from('solicitacoes_cadastro').delete().eq('id', id);
    } catch {}

    try {
      const saved = localStorage.getItem('brp_solicitacoes_cadastro_usuarios');
      if (saved) {
        const list = JSON.parse(saved);
        const updated = list.filter((s: any) => s.id !== id && (!email || s.email.toLowerCase() !== email.toLowerCase()));
        localStorage.setItem('brp_solicitacoes_cadastro_usuarios', JSON.stringify(updated));
      }
    } catch {}

    let query = isExclusiveTable
      ? supabase.schema('engenharia').from('usuarios').delete().eq('id', id)
      : supabase.from('profiles').delete().eq('id', id);

    await query;

    window.dispatchEvent(new Event('storage'));
    fetchProfiles();
  };

  // Alternar Status (Ativo / Inativo)
  const handleToggleStatus = async (user: Profile) => {
    const newStatus = user.status === 'ativo' ? 'inativo' : 'ativo';
    let query = isExclusiveTable
      ? supabase.schema('engenharia').from('usuarios').update({ status: newStatus }).eq('id', user.id)
      : supabase.from('profiles').update({ status: newStatus }).eq('id', user.id);

    const { error } = await query;

    if (error) {
      alert('Erro ao alterar status: ' + error.message);
    } else {
      fetchProfiles();
    }
  };

  // Selecionar Usuário apenas para matriz de permissões (sem abrir modal de edição)
  const handleSelectUserForPermissions = (user: Profile) => {
    setSelectedUser(user);
    setEditScreens(user.permitted_screens || MODULOS_SISTEMA.map(m => m.id));
  };

  // Abrir Modal de Edição (Somente quando clicado no ícone de editar da tabela)
  const handleOpenEdit = (user: Profile) => {
    setSelectedUser(user);
    setEditNome(user.nome || '');
    setEditCargo(user.cargo || 'orcamentista');
    setEditStatus((user.status as 'ativo' | 'inativo') || 'ativo');
    setEditScreens(user.permitted_screens || MODULOS_SISTEMA.map(m => m.id));
    setIsEditModalOpen(true);
  };

  // Salvar Edição de Usuário
  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    setSavingUser(true);

    const payload = {
      nome: editNome,
      cargo: editCargo,
      status: editStatus,
      permitted_screens: editScreens
    };

    let query = isExclusiveTable
      ? supabase.schema('engenharia').from('usuarios').update(payload).eq('id', selectedUser.id)
      : supabase.from('profiles').update(payload).eq('id', selectedUser.id);

    const { error } = await query;

    setSavingUser(false);
    if (error) {
      alert('Erro ao salvar usuário: ' + error.message);
    } else {
      setIsEditModalOpen(false);
      setSelectedUser(null);
      fetchProfiles();
    }
  };

  // Cadastrar Novo Usuário Manualmente
  const handleCreateNewUser = async () => {
    if (!newEmail.trim()) {
      alert('Preencha o e-mail do novo usuário.');
      return;
    }

    const payload = {
      nome: newNome.trim() || newEmail.split('@')[0],
      email: newEmail.trim().toLowerCase(),
      cargo: newCargo,
      status: 'ativo',
      approved: true,
      permitted_screens: MODULOS_SISTEMA.map(m => m.id)
    };

    let query = isExclusiveTable
      ? supabase.schema('engenharia').from('usuarios').insert(payload)
      : supabase.from('profiles').insert(payload);

    const { error } = await query;

    if (error) {
      alert('Erro ao cadastrar usuário: ' + error.message);
    } else {
      setIsNewUserModalOpen(false);
      setNewNome('');
      setNewEmail('');
      setNewCargo('orcamentista');
      fetchProfiles();
    }
  };

  const toggleScreenPermission = (screenId: string) => {
    setEditScreens(prev =>
      prev.includes(screenId)
        ? prev.filter(id => id !== screenId)
        : [...prev, screenId]
    );
  };

  const renderHeaderCell = (field: string, label: string, align: 'left' | 'center' | 'right' = 'center') => {
    const isSorted = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={clsx(
          "px-3 py-2.5 select-none overflow-hidden whitespace-nowrap truncate font-bold text-[11px] uppercase tracking-wider cursor-pointer transition-colors hover:bg-slate-200/80 group/head",
          align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center',
          isSorted ? "text-blue-700 bg-blue-50/70" : "text-slate-600"
        )}
      >
        <div className={clsx("flex items-center gap-1.5 w-full", align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center')}>
          <span>{label}</span>
          {isSorted ? (
            sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600 shrink-0" /> : <ArrowDown className="w-3 h-3 text-blue-600 shrink-0" />
          ) : (
            <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover/head:opacity-100 shrink-0 transition-opacity" />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Módulo */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Settings className="w-3 h-3" /> Configurações Gerais
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Gestão de Usuários & Controle de Acessos</h2>
          <p className="text-slate-500 text-xs">Gerencie os acessos dos colaboradores da BRP Engenharia e aprove novas solicitações</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchProfiles}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="Atualizar lista"
          >
            <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
          </button>

          <button
            onClick={() => setIsNewUserModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* Navegação por Abas Principais */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1.5 border shadow-2xs gap-1">
        <button
          onClick={() => setActiveTab('usuarios')}
          className={clsx(
            'flex-1 py-2.5 px-4 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer',
            activeTab === 'usuarios'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          )}
        >
          <Users className="w-4 h-4" />
          <span>Área de Usuários</span>
          {pendingProfiles.length > 0 && (
            <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
              {pendingProfiles.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('permissoes')}
          className={clsx(
            'flex-1 py-2.5 px-4 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer',
            activeTab === 'permissoes'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          )}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Liberação & Matriz de Acessos</span>
        </button>
      </div>

      {/* ABA 1: ÁREA DE USUÁRIOS */}
      {activeTab === 'usuarios' && (
        <div className="space-y-4">
          {/* Sub-abas: Lista de Usuários vs Permissão de Acesso / Solicitações Pendentes */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex gap-2">
              <button
                onClick={() => setSubTabUsuarios('lista')}
                className={clsx(
                  'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5',
                  subTabUsuarios === 'lista'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                )}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Usuários Ativos ({approvedProfiles.length})</span>
              </button>

              <button
                onClick={() => setSubTabUsuarios('pendentes')}
                className={clsx(
                  'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5',
                  subTabUsuarios === 'pendentes'
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                )}
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                <span>Permissão de Acesso / Pendentes ({pendingProfiles.length})</span>
              </button>
            </div>

            {/* Filtros da Tabela */}
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou e-mail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-xs"
                />
              </div>

              <select
                value={cargoFiltro}
                onChange={(e) => setCargoFiltro(e.target.value)}
                className="w-full sm:w-40 px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 cursor-pointer"
              >
                <option value="Todos">Todos os Cargos</option>
                <option value="gestor">Gestor</option>
                <option value="orcamentista">Orçamentista</option>
                <option value="engenheiro">Engenheiro</option>
                <option value="diretoria">Diretoria</option>
              </select>
            </div>
          </div>

          {/* Tabela de Usuários */}
          <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 table-fixed border-collapse">
                <thead className="bg-slate-100/80 text-slate-600 border-b border-slate-200 select-none font-bold text-[11px] uppercase tracking-wider">
                  <tr>
                    {renderHeaderCell('nome', 'Usuário / Colaborador', 'left')}
                    {renderHeaderCell('email', 'E-mail Corporativo', 'left')}
                    {renderHeaderCell('cargo', 'Cargo / Função', 'center')}
                    {renderHeaderCell('status', 'Status', 'center')}
                    {renderHeaderCell('created_at', 'Data de Cadastro', 'center')}
                    <th className="px-3 py-2.5 text-center font-bold text-[11px] uppercase tracking-wider text-slate-600">
                      {subTabUsuarios === 'pendentes' ? 'Aprovação de Gestor' : 'Ações'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={6} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-7 h-7 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        Carregando usuários...
                      </div>
                    </td></tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr><td colSpan={6} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="w-9 h-9 text-slate-300" />
                        <p className="font-bold text-xs text-slate-700">
                          {subTabUsuarios === 'pendentes'
                            ? 'Nenhuma solicitação de e-mail pendente de aprovação!'
                            : 'Nenhum usuário encontrado'}
                        </p>
                        <p className="text-xs">
                          {subTabUsuarios === 'pendentes'
                            ? 'Novos cadastros aparecerão nesta sub-aba automaticamente.'
                            : 'Ajuste os filtros de busca para encontrar registros.'}
                        </p>
                      </div>
                    </td></tr>
                  ) : filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-blue-50/40 transition-colors group">
                      <td className="px-3 py-2 text-left font-semibold text-slate-900 truncate">
                        <div className="flex items-center justify-start gap-2.5">
                          <div className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0">
                            {(user.nome || user.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate font-semibold">{user.nome || 'Sem nome'}</span>
                        </div>
                      </td>

                      <td className="px-3 py-2 text-left font-mono text-slate-600 truncate">{user.email || '-'}</td>

                      <td className="px-3 py-2 text-center truncate">
                        <span className={clsx(
                          'px-2 py-0.5 rounded font-bold text-[10px] uppercase border inline-block',
                          user.cargo === 'gestor'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : user.cargo === 'diretoria'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        )}>
                          {user.cargo || 'orçamentista'}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-center truncate">
                        {user.approved === false ? (
                          <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-bold text-[10px] uppercase">
                            Pendente
                          </span>
                        ) : (
                          <span className={clsx(
                            'px-2 py-0.5 rounded font-bold text-[10px] uppercase border inline-block',
                            user.status === 'ativo'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border-rose-200'
                          )}>
                            {user.status || 'ativo'}
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-2 text-center font-mono text-slate-500 text-[11px] truncate">
                        {new Date().toLocaleDateString('pt-BR')}
                      </td>

                      <td className="px-3 py-2 text-center">
                        {subTabUsuarios === 'pendentes' ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleAprovar(user.id, user.email)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              title="Permitir / Aprovar Acesso"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Permitir</span>
                            </button>
                            <button
                              onClick={() => handleRecusarOuExcluir(user.id, user.nome, user.email)}
                              className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                              title="Recusar Acesso"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Recusar</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(user)}
                              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Editar usuário e permissões"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleToggleStatus(user)}
                              className={clsx(
                                'p-1 rounded transition-colors',
                                user.status === 'ativo'
                                  ? 'text-emerald-600 hover:bg-emerald-50'
                                  : 'text-slate-400 hover:bg-slate-100'
                              )}
                              title={user.status === 'ativo' ? 'Desativar usuário' : 'Ativar usuário'}
                            >
                              {user.status === 'ativo' ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              onClick={() => handleRecusarOuExcluir(user.id, user.nome)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Excluir usuário"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: LIBERAÇÃO & MATRIZ DE ACESSOS */}
      {activeTab === 'permissoes' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-blue-600" />
              Matriz de Controle de Acesso aos Módulos
            </h3>
            <p className="text-slate-500 text-xs mb-4">
              Selecione um usuário para configurar quais módulos ele terá permissão para visualizar e operar.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Seleção do Usuário */}
              <div className="space-y-3 border-r border-slate-200 pr-4">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  1. Selecione o Colaborador
                </label>

                <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
                  {approvedProfiles.map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleSelectUserForPermissions(u)}
                      className={clsx(
                        'w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer',
                        selectedUser?.id === u.id
                          ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-2xs font-bold'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      )}
                    >
                      <div className="truncate">
                        <p className="font-bold truncate">{u.nome || 'Sem nome'}</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{u.email}</p>
                      </div>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 border text-slate-600 shrink-0">
                        {u.cargo || 'orçamentista'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Permissões do Usuário Selecionado */}
              <div className="md:col-span-2 space-y-4">
                {selectedUser ? (
                  <>
                    <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-blue-900">{selectedUser.nome} ({selectedUser.email})</p>
                        <p className="text-[11px] text-blue-700">Cargo: <strong className="uppercase">{selectedUser.cargo || 'Orçamentista'}</strong></p>
                      </div>
                      <button
                        onClick={handleSaveEdit}
                        disabled={savingUser}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>{savingUser ? 'Salvando...' : 'Salvar Permissões'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {MODULOS_SISTEMA.map(m => {
                        const Icon = m.icon;
                        const isPermitted = editScreens.includes(m.id);
                        return (
                          <div
                            key={m.id}
                            onClick={() => toggleScreenPermission(m.id)}
                            className={clsx(
                              'p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none',
                              isPermitted
                                ? 'bg-emerald-50/50 border-emerald-300 text-emerald-950'
                                : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60 hover:opacity-100'
                            )}
                          >
                            <div className={clsx(
                              'p-2 rounded-lg shrink-0',
                              isPermitted ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                            )}>
                              <Icon className="w-4 h-4" />
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-xs text-slate-900">{m.name}</h4>
                                <input
                                  type="checkbox"
                                  checked={isPermitted}
                                  onChange={() => {}}
                                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 pointer-events-none"
                                />
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">{m.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                    <ShieldCheck className="w-10 h-10 text-slate-300 mb-2" />
                    <p className="font-bold text-xs text-slate-700">Nenhum colaborador selecionado</p>
                    <p className="text-xs">Clique em um usuário na lista ao lado para alterar suas permissões.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE USUÁRIO E PERMISSÕES */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                Editar Cadastro de Colaborador
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">E-mail (Leitura)</label>
                <input
                  type="text"
                  disabled
                  value={selectedUser.email || ''}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-100 text-slate-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cargo / Nível</label>
                  <select
                    value={editCargo}
                    onChange={(e) => setEditCargo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value="gestor">Gestor</option>
                    <option value="orcamentista">Orçamentista</option>
                    <option value="engenheiro">Engenheiro</option>
                    <option value="diretoria">Diretoria</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 text-xs font-bold">
              <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg">
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingUser}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs disabled:opacity-50"
              >
                {savingUser ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CADASTRAR NOVO USUÁRIO */}
      {isNewUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                Cadastrar Novo Colaborador
              </h3>
              <button onClick={() => setIsNewUserModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  placeholder="Ex: João da Silva"
                  value={newNome}
                  onChange={(e) => setNewNome(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">E-mail Corporativo *</label>
                <input
                  type="email"
                  placeholder="nome@brp.eng.br"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cargo / Função</label>
                <select
                  value={newCargo}
                  onChange={(e) => setNewCargo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                >
                  <option value="orcamentista">Orçamentista</option>
                  <option value="gestor">Gestor</option>
                  <option value="engenheiro">Engenheiro</option>
                  <option value="diretoria">Diretoria</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 text-xs font-bold">
              <button onClick={() => setIsNewUserModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg">
                Cancelar
              </button>
              <button
                onClick={handleCreateNewUser}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs cursor-pointer"
              >
                Cadastrar Colaborador
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
