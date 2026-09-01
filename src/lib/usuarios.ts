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

  // 1. Buscando do Supabase (engenharia.usuarios ou public.profiles)
  try {
    const { data: engData, error: engError } = await supabase
      .schema('engenharia')
      .from('usuarios')
      .select('*')
      .order('nome', { ascending: true });

    if (!engError && engData && engData.length > 0) {
      engData.forEach(u => {
        const name = formatUserDisplayName(u.nome, u.email);
        if (name && name !== 'Time Comercial' && u.status !== 'excluido') {
          usersMap.set(u.id || name, {
            id: u.id,
            nome: name,
            email: u.email || '',
            cargo: u.cargo || 'orcamentista',
            status: u.status || 'ativo'
          });
        }
      });
    } else {
      const { data: pubData, error: pubError } = await supabase
        .from('profiles')
        .select('*')
        .order('nome', { ascending: true });

      if (!pubError && pubData) {
        pubData.forEach(u => {
          const name = formatUserDisplayName(u.nome, u.email);
          if (name && name !== 'Time Comercial' && u.status !== 'excluido') {
            usersMap.set(u.id || name, {
              id: u.id,
              nome: name,
              email: u.email || '',
              cargo: u.cargo || 'orcamentista',
              status: u.status || 'ativo'
            });
          }
        });
      }
    }
  } catch {}

  // 2. Soluções/Aprovações de cadastro em LocalStorage
  try {
    const savedSol = localStorage.getItem('brp_solicitacoes_cadastro_usuarios');
    if (savedSol) {
      const localRequests: any[] = JSON.parse(savedSol);
      localRequests.forEach(s => {
        if (s.status === 'aprovado' && s.nome) {
          const name = formatUserDisplayName(s.nome, s.email);
          if (name && name !== 'Time Comercial') {
            const key = s.id || name;
            if (!usersMap.has(key)) {
              usersMap.set(key, {
                id: s.id,
                nome: name,
                email: s.email || '',
                cargo: s.cargo || 'orcamentista',
                status: 'ativo'
              });
            }
          }
        }
      });
    }
  } catch {}

  let result = Array.from(usersMap.values());
  
  // Garantir remoção total de "Time Comercial"
  result = result.filter(u => u.nome && u.nome !== 'Time Comercial');

  // Ordenar alfabeticamente pelo nome
  result.sort((a, b) => a.nome.localeCompare(b.nome));

  return result;
}
