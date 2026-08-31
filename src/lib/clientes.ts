import { supabase } from './supabase';

export interface ClienteData {
  id: string;
  razao_social: string;
  nome_fantasia?: string;
  cnpj?: string;
  cidade?: string;
  uf?: string;
  responsavel?: string;
  email?: string;
  telefone?: string;
  status: 'ativo' | 'inativo';
  created_at?: string;
}

export const LOCAL_STORAGE_CLIENTES_KEY = 'brp_clientes_cadastrados';

// Formatação utilitária de CNPJ: 00.000.000/0001-00
export function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (!digits) return '';
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

// Buscar todos os clientes cadastrados (Supabase + LocalStorage)
export async function getClientesCadastrados(): Promise<ClienteData[]> {
  let clientes: ClienteData[] = [];

  // 1. Tentar buscar do Supabase
  try {
    const { data, error } = await supabase
      .schema('engenharia')
      .from('clientes')
      .select('*')
      .order('razao_social', { ascending: true });

    if (!error && data && data.length > 0) {
      clientes = data.map(c => ({
        id: c.id,
        razao_social: c.razao_social || c.nome_empresa || c.nome || '',
        nome_fantasia: c.nome_fantasia || '',
        cnpj: c.cnpj || '',
        cidade: c.cidade || '',
        uf: c.uf || '',
        responsavel: c.responsavel || c.gestor_cliente || '',
        email: c.email || '',
        telefone: c.telefone || '',
        status: c.status || 'ativo',
        created_at: c.created_at || new Date().toISOString()
      }));
    } else {
      // Tentar schema public caso engenharia não possua a tabela
      const { data: pubData, error: pubError } = await supabase
        .from('clientes')
        .select('*')
        .order('razao_social', { ascending: true });

      if (!pubError && pubData && pubData.length > 0) {
        clientes = pubData.map(c => ({
          id: c.id,
          razao_social: c.razao_social || c.nome_empresa || c.nome || '',
          nome_fantasia: c.nome_fantasia || '',
          cnpj: c.cnpj || '',
          cidade: c.cidade || '',
          uf: c.uf || '',
          responsavel: c.responsavel || c.gestor_cliente || '',
          email: c.email || '',
          telefone: c.telefone || '',
          status: c.status || 'ativo',
          created_at: c.created_at || new Date().toISOString()
        }));
      }
    }
  } catch {}

  // 2. Mesclar/Fallback com LocalStorage
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_CLIENTES_KEY);
    if (saved) {
      const localList: ClienteData[] = JSON.parse(saved);
      const existingIds = new Set(clientes.map(c => c.id));
      const existingNames = new Set(clientes.map(c => c.razao_social.toLowerCase().trim()));

      localList.forEach(item => {
        if (!existingIds.has(item.id) && !existingNames.has(item.razao_social.toLowerCase().trim())) {
          clientes.push(item);
        }
      });
    }
  } catch {}

  // Se não houver nenhum cliente cadastrado ainda, fornece exemplos iniciais padrão
  if (clientes.length === 0) {
    clientes = [
      {
        id: 'cli_votorantim',
        razao_social: 'Votorantim Cimentos S.A.',
        nome_fantasia: 'Votorantim',
        cnpj: '01.637.892/0001-05',
        cidade: 'ANÁPOLIS',
        uf: 'GO',
        responsavel: 'Eng. Pamella',
        email: 'pamella.siqueira@brp.eng.br',
        telefone: '(62) 99999-8888',
        status: 'ativo',
        created_at: new Date().toISOString()
      },
      {
        id: 'cli_brp_metalica',
        razao_social: 'BRP Soluções Metálicas Ltda',
        nome_fantasia: 'BRP Metálica',
        cnpj: '12.345.678/0001-90',
        cidade: 'GOIÂNIA',
        uf: 'GO',
        responsavel: 'Eng. José Vicente',
        email: 'josevicente@brpmetalica.com',
        telefone: '(62) 98888-7777',
        status: 'ativo',
        created_at: new Date().toISOString()
      }
    ];
    try {
      localStorage.setItem(LOCAL_STORAGE_CLIENTES_KEY, JSON.stringify(clientes));
    } catch {}
  }

  return clientes;
}

// Salvar / Criar ou Atualizar Cliente
export async function saveCliente(cliente: ClienteData): Promise<ClienteData> {
  // 1. Salva no Supabase (se a tabela existir)
  try {
    const payload = {
      id: cliente.id,
      razao_social: cliente.razao_social,
      nome_fantasia: cliente.nome_fantasia || '',
      cnpj: cliente.cnpj || '',
      cidade: cliente.cidade || '',
      uf: cliente.uf || '',
      responsavel: cliente.responsavel || '',
      email: cliente.email || '',
      telefone: cliente.telefone || '',
      status: cliente.status || 'ativo'
    };

    await supabase.schema('engenharia').from('clientes').upsert(payload);
  } catch {}

  // 2. Salva no LocalStorage
  try {
    const current = await getClientesCadastrados();
    const index = current.findIndex(c => c.id === cliente.id);
    if (index >= 0) {
      current[index] = cliente;
    } else {
      current.push(cliente);
    }
    localStorage.setItem(LOCAL_STORAGE_CLIENTES_KEY, JSON.stringify(current));
  } catch {}

  return cliente;
}

// Deletar / Excluir Cliente
export async function deleteCliente(clienteId: string): Promise<boolean> {
  try {
    await supabase.schema('engenharia').from('clientes').delete().eq('id', clienteId);
  } catch {}

  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_CLIENTES_KEY);
    if (saved) {
      const list: ClienteData[] = JSON.parse(saved);
      const filtered = list.filter(c => c.id !== clienteId);
      localStorage.setItem(LOCAL_STORAGE_CLIENTES_KEY, JSON.stringify(filtered));
    }
  } catch {}

  return true;
}
