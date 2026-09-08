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
 * Apenas Orçamentistas e Gestores devem aparecer. Administradores e usuários de teste são excluídos.
 */
const isOrcamentistaOuGestorValido = (nome?: string | null, email?: string | null, cargo?: string | null): boolean => {
  const nameLower = (nome || '').toLowerCase().trim();
  const emailLower = (email || '').toLowerCase().trim();
  const cargoLower = (cargo || '').toLowerCase().trim();

  // Exclusões explícitas: Administrador Sara (sara.alves), usuários de teste e termos administrativos
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

  // Se houver cargo explícito, excluir cargos administrativos/diretores
  if (cargoLower) {
    if (
      cargoLower.includes('admin') || 
      cargoLower.includes('administrador') || 
      cargoLower.includes('diret') || 
      cargoLower.includes('ti')
    ) {
      return false;
    }
  }

  return true;
};

export async function getUsuariosCadastrados(): Promise<UsuarioData[]> {
  const usersMap = new Map<string, UsuarioData>();

  const addUser = (id: string, rawNome?: string | null, rawEmail?: string | null, cargo?: string, status?: string) => {
    const name = formatUserDisplayName(rawNome, rawEmail);
    if (!name || name === 'Time Comercial' || status === 'excluido') return;

    // Aplica o filtro estrito de Orçamentista e Gestor
    if (!isOrcamentistaOuGestorValido(name, rawEmail, cargo)) return;

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

  // 4. Responsáveis cadastrados na tabela de orçamentos (apenas se for um orçamentista/gestor válido)
  try {
    const { data: orcResps } = await supabase
      .schema('engenharia')
      .from('orcamentos')
      .select('responsavel');

    if (orcResps) {
      orcResps.forEach(r => {
        if (r.responsavel && isOrcamentistaOuGestorValido(r.responsavel, null, null)) {
          addUser(r.responsavel, r.responsavel);
        }
      });
    }
  } catch {}

  let result = Array.from(usersMap.values());
  result = result.filter(u => u.nome && u.nome !== 'Time Comercial' && isOrcamentistaOuGestorValido(u.nome, u.email, u.cargo));
  result.sort((a, b) => a.nome.localeCompare(b.nome));

  return result;
}
