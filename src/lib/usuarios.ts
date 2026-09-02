import { supabase } from './supabase';

export interface UsuarioData {
  id: string;
  nome: string;
  email?: string;
  cargo?: string;
  status?: string;
}

const formatUserDisplayName = (nome?: string | null, email?: string | null) => {
  if (nome && nome.trim() && nome !== 'Sem nome' && nome !== 'Time Comercial') return nome.trim();
  if (email) {
    const prefix = email.split('@')[0];
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }
  return '';
};

export async function getUsuariosCadastrados(): Promise<UsuarioData[]> {
  const usersMap = new Map<string, UsuarioData>();

  const addUser = (id: string, rawNome?: string | null, rawEmail?: string | null, cargo?: string, status?: string) => {
    const name = formatUserDisplayName(rawNome, rawEmail);
    if (!name || name === 'Time Comercial' || status === 'excluido') return;
    const key = name.toLowerCase();
    if (!usersMap.has(key)) {
      usersMap.set(key, {
        id: id || name,
        nome: name,
        email: rawEmail || '',
        cargo: cargo || 'orcamentista',
        status: status || 'ativo'
      });
    }
  };

  // 1. Buscando do Supabase (engenharia.usuarios)
  try {
    const { data: engData } = await supabase
      .schema('engenharia')
      .from('usuarios')
      .select('*')
      .order('nome', { ascending: true });

    if (engData) {
      engData.forEach(u => addUser(u.id, u.nome, u.email, u.cargo, u.status));
    }
  } catch {}

  // 2. Buscando do Supabase (public.profiles)
  try {
    const { data: pubData } = await supabase
      .from('profiles')
      .select('*')
      .order('nome', { ascending: true });

    if (pubData) {
      pubData.forEach(u => addUser(u.id, u.nome, u.email, u.cargo, u.status));
    }
  } catch {}

  // 3. Soluções/Aprovações de cadastro em LocalStorage
  try {
    const savedSol = localStorage.getItem('brp_solicitacoes_cadastro_usuarios');
    if (savedSol) {
      const localRequests: any[] = JSON.parse(savedSol);
      localRequests.forEach(s => {
        if (s.status === 'aprovado') {
          addUser(s.id, s.nome, s.email, s.cargo, 'ativo');
        }
      });
    }
  } catch {}

  // 4. Responsáveis cadastrados na tabela de orçamentos
  try {
    const { data: orcResps } = await supabase
      .schema('engenharia')
      .from('orcamentos')
      .select('responsavel');

    if (orcResps) {
      orcResps.forEach(r => {
        if (r.responsavel) addUser(r.responsavel, r.responsavel);
      });
    }
  } catch {}

  let result = Array.from(usersMap.values());
  result = result.filter(u => u.nome && u.nome !== 'Time Comercial');
  result.sort((a, b) => a.nome.localeCompare(b.nome));

  return result;
}
