import { supabase } from './supabase';

export interface EmpresaData {
  id: string;
  razao_social: string;
  nome_fantasia?: string;
  cnpj?: string;
  inscricao_estadual?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  logo_url?: string;
  is_padrao?: boolean;
  status: 'ativo' | 'inativo';
  created_at?: string;
}

export const LOCAL_STORAGE_EMPRESAS_KEY = 'brp_empresas_cadastradas';

export const EMPRESAS_BASE_INICIAL: EmpresaData[] = [
  {
    id: 'emp_brp_metalica',
    razao_social: 'BRP Soluções Metálicas Ltda',
    nome_fantasia: 'BRP Soluções Metálicas',
    cnpj: '34.891.123/0001-45',
    inscricao_estadual: '10.589.412-0',
    logradouro: 'Av. Industrial, Qd. 12 Lt. 05',
    numero: '1200',
    bairro: 'Distrito Industrial',
    cidade: 'Goiânia',
    uf: 'GO',
    cep: '74000-000',
    telefone: '(62) 3200-0000',
    email: 'contato@brpmetalica.com.br',
    logo_url: '/logo_brp_metalica_cinza.png',
    is_padrao: true,
    status: 'ativo',
    created_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'emp_brp_engenharia',
    razao_social: 'BRP Engenharia & Estruturas Ltda',
    nome_fantasia: 'BRP Engenharia',
    cnpj: '45.123.789/0001-80',
    inscricao_estadual: '10.987.654-3',
    logradouro: 'Rua das Indústrias, Qd. 08 Lt. 15',
    numero: '450',
    bairro: 'Setor Sul',
    cidade: 'Goiânia',
    uf: 'GO',
    cep: '74100-000',
    telefone: '(62) 3211-1111',
    email: 'contato@brp.eng.br',
    logo_url: '/logo_brp_color.png',
    is_padrao: false,
    status: 'ativo',
    created_at: '2026-01-01T00:00:00.000Z'
  }
];

export function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (!digits) return '';
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function formatCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (!digits) return '';
  return digits.replace(/^(\d{5})(\d)/, '$1-$2');
}

export function formatTelefone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export async function getEmpresasCadastradas(): Promise<EmpresaData[]> {
  let localEmpresas: EmpresaData[] = [];
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_EMPRESAS_KEY);
    if (saved) {
      localEmpresas = JSON.parse(saved);
    }
  } catch {}

  const existingIds = new Set(localEmpresas.map(e => e.id));
  EMPRESAS_BASE_INICIAL.forEach(baseEmp => {
    if (!existingIds.has(baseEmp.id)) {
      const alreadyByName = localEmpresas.some(
        e => (e.razao_social || '').toLowerCase().trim() === (baseEmp.razao_social || '').toLowerCase().trim()
      );
      if (!alreadyByName) {
        localEmpresas.push(baseEmp);
      }
    }
  });

  localEmpresas.sort((a, b) => (a.razao_social || '').localeCompare(b.razao_social || ''));

  try {
    const fetchSupabase = async (): Promise<EmpresaData[] | null> => {
      const { data, error } = await supabase
        .schema('engenharia')
        .from('empresas')
        .select('*')
        .order('razao_social', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map(e => ({
          id: e.id,
          razao_social: e.razao_social || e.nome || '',
          nome_fantasia: e.nome_fantasia || '',
          cnpj: e.cnpj || '',
          inscricao_estadual: e.inscricao_estadual || '',
          logradouro: e.logradouro || e.endereco || '',
          numero: e.numero || '',
          bairro: e.bairro || '',
          cidade: e.cidade || '',
          uf: e.uf || '',
          cep: e.cep || '',
          telefone: e.telefone || '',
          email: e.email || '',
          logo_url: e.logo_url || '',
          is_padrao: !!e.is_padrao,
          status: e.status || 'ativo',
          created_at: e.created_at || new Date().toISOString()
        }));
      }
      return null;
    };

    const timeoutPromise = new Promise<null>(resolve => setTimeout(() => resolve(null), 1200));
    const remoteData = await Promise.race([fetchSupabase(), timeoutPromise]);

    if (remoteData && remoteData.length > 0) {
      const remoteIds = new Set(remoteData.map(e => e.id));
      localEmpresas.forEach(le => {
        if (!remoteIds.has(le.id)) {
          remoteData.push(le);
        }
      });
      remoteData.sort((a, b) => a.razao_social.localeCompare(b.razao_social));
      try {
        localStorage.setItem(LOCAL_STORAGE_EMPRESAS_KEY, JSON.stringify(remoteData));
      } catch {}
      return remoteData;
    }
  } catch (e) {
    console.warn('Uso de base local de empresas ativado (Supabase indisponível/lento):', e);
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_EMPRESAS_KEY, JSON.stringify(localEmpresas));
  } catch {}
  return localEmpresas;
}

export async function saveEmpresa(data: Partial<EmpresaData> & { id?: string }): Promise<EmpresaData> {
  const empresas = await getEmpresasCadastradas();
  const id = data.id || `emp_${Date.now()}`;
  const now = new Date().toISOString();

  let isPadrao = !!data.is_padrao;
  if (empresas.length === 0) isPadrao = true;

  const newEmpresa: EmpresaData = {
    id,
    razao_social: (data.razao_social || 'Nova Empresa').trim(),
    nome_fantasia: (data.nome_fantasia || '').trim(),
    cnpj: (data.cnpj || '').trim(),
    inscricao_estadual: (data.inscricao_estadual || '').trim(),
    logradouro: (data.logradouro || '').trim(),
    numero: (data.numero || '').trim(),
    bairro: (data.bairro || '').trim(),
    cidade: (data.cidade || 'Goiânia').trim(),
    uf: (data.uf || 'GO').trim().toUpperCase(),
    cep: (data.cep || '').trim(),
    telefone: (data.telefone || '').trim(),
    email: (data.email || '').trim(),
    logo_url: (data.logo_url || '/logo_brp_metalica_cinza.png').trim(),
    is_padrao: isPadrao,
    status: data.status || 'ativo',
    created_at: data.created_at || now
  };

  const updatedList = empresas.map(e => {
    if (isPadrao) {
      return { ...e, is_padrao: e.id === id };
    }
    return e;
  });

  const existingIdx = updatedList.findIndex(e => e.id === id);
  if (existingIdx >= 0) {
    updatedList[existingIdx] = newEmpresa;
  } else {
    updatedList.push(newEmpresa);
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_EMPRESAS_KEY, JSON.stringify(updatedList));
  } catch {}

  try {
    await supabase
      .schema('engenharia')
      .from('empresas')
      .upsert({
        id: newEmpresa.id,
        razao_social: newEmpresa.razao_social,
        nome_fantasia: newEmpresa.nome_fantasia,
        cnpj: newEmpresa.cnpj,
        inscricao_estadual: newEmpresa.inscricao_estadual,
        logradouro: newEmpresa.logradouro,
        numero: newEmpresa.numero,
        bairro: newEmpresa.bairro,
        cidade: newEmpresa.cidade,
        uf: newEmpresa.uf,
        cep: newEmpresa.cep,
        telefone: newEmpresa.telefone,
        email: newEmpresa.email,
        logo_url: newEmpresa.logo_url,
        is_padrao: newEmpresa.is_padrao,
        status: newEmpresa.status,
        updated_at: now
      });
  } catch (e) {
    console.warn('Erro ao sincronizar empresa com o Supabase:', e);
  }

  return newEmpresa;
}

export async function deleteEmpresa(id: string): Promise<boolean> {
  let empresas = await getEmpresasCadastradas();
  empresas = empresas.filter(e => e.id !== id);

  if (empresas.length > 0 && !empresas.some(e => e.is_padrao)) {
    empresas[0].is_padrao = true;
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_EMPRESAS_KEY, JSON.stringify(empresas));
  } catch {}

  try {
    await supabase
      .schema('engenharia')
      .from('empresas')
      .delete()
      .eq('id', id);
  } catch (e) {
    console.warn('Erro ao excluir empresa no Supabase:', e);
  }

  return true;
}
