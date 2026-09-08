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

/**
 * Valida se um usuário deve ser listado como Responsável Técnico / Orçamentista.
 * Exclui a conta de Administração Sara.alves, contas de teste e Time Comercial.
 * Mantém todos os orçamentistas e gestores da equipe.
 */
const isUsuarioValidoParaResponsavel = (nome?: string | null, email?: string | null): boolean => {
  const nameLower = (nome || '').toLowerCase().trim();
  const emailLower = (email || '').toLowerCase().trim();

  if (!nameLower || nameLower === 'time comercial') return false;

  // Exclusões explícitas: Usuária administradora Sara (sara.alves) e contas de teste
  if (
    nameLower.includes('sara.alves') || 
    emailLower.includes('sara.alves') || 
    nameLower === 'sara' || 
    nameLower === 'sara.alves' ||
    nameLower.includes('sara alves')
  ) {
    return false;
  }

  if (
    nameLower.includes('teste') || 
    emailLower.includes('teste') || 
    nameLower === 'testes'
  ) {
    return false;
  }

  return true;
};

export async function getUsuariosCadastrados(): Promise<UsuarioData[]> {
  const usersMap = new Map<string, UsuarioData>();

  const addUser = (id: string, rawNome?: string | null, rawEmail?: string | null, cargo?: string, status?: string) => {
    const name = formatUserDisplayName(rawNome, rawEmail);
    if (!name || status === 'excluido') return;

    if (!isUsuarioValidoParaResponsavel(name, rawEmail)) return;

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
        if (r.responsavel && isUsuarioValidoParaResponsavel(r.responsavel, null)) {
          addUser(r.responsavel, r.responsavel);
        }
      });
    }
  } catch {}

  let result = Array.from(usersMap.values());
  result = result.filter(u => u.nome && isUsuarioValidoParaResponsavel(u.nome, u.email));
  result.sort((a, b) => a.nome.localeCompare(b.nome));

  return result;
}
