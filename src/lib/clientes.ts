import { supabase } from './supabase';
import clientesImportadosData from './clientes_importados.json';

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
export const CLIENTES_BASE_INICIAL: ClienteData[] = clientesImportadosData as ClienteData[];

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

// Buscar todos os clientes cadastrados (Supabase + LocalStorage + Base Importada da planilha)
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

  // 2. Mesclar com LocalStorage
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

  // 3. Incluir clientes da planilha importada se ainda não existirem no cadastro
  const existingNames = new Set(clientes.map(c => c.razao_social.toLowerCase().trim()));
  CLIENTES_BASE_INICIAL.forEach(baseClient => {
    if (!existingNames.has(baseClient.razao_social.toLowerCase().trim())) {
      clientes.push(baseClient);
      existingNames.add(baseClient.razao_social.toLowerCase().trim());
    }
  });

  // Filtra/Remove quaisquer registros de teste antigos
  clientes = clientes.filter(c => 
    c.id !== 'cli_votorantim' && 
    c.id !== 'cli_brp_metalica'
  );

  // Ordena alfabeticamente pela razão social
  clientes.sort((a, b) => a.razao_social.localeCompare(b.razao_social));

  // Atualiza LocalStorage sincronizado com a base importada
  try {
    localStorage.setItem(LOCAL_STORAGE_CLIENTES_KEY, JSON.stringify(clientes));
  } catch {}

  // Tenta salvar/sincronizar no Supabase em segundo plano
  (async () => {
    try {
      await supabase.schema('engenharia').from('clientes').upsert(clientes);
    } catch {}
  })();

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
