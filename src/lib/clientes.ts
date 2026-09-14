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
  // 1. Carrega imediatamente os clientes da base local e localStorage
  let localClientes: ClienteData[] = [];
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_CLIENTES_KEY);
    if (saved) {
      localClientes = JSON.parse(saved);
    }
  } catch {}

  const existingNames = new Set(localClientes.map(c => (c.razao_social || '').toLowerCase().trim()));
  CLIENTES_BASE_INICIAL.forEach(baseClient => {
    if (!existingNames.has((baseClient.razao_social || '').toLowerCase().trim())) {
      localClientes.push(baseClient);
      existingNames.add((baseClient.razao_social || '').toLowerCase().trim());
    }
  });

  localClientes = localClientes.filter(c => c.id !== 'cli_votorantim' && c.id !== 'cli_brp_metalica');
  localClientes.sort((a, b) => (a.razao_social || '').localeCompare(b.razao_social || ''));

  // 2. Busca no Supabase com limite de tempo (1.5s) para nunca congelar ou demorar a UI
  try {
    const fetchSupabase = async (): Promise<ClienteData[] | null> => {
      const { data, error } = await supabase
        .schema('engenharia')
        .from('clientes')
        .select('*')
        .order('razao_social', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map(c => ({
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
      return null;
    };

    const timeoutPromise = new Promise<null>(resolve => setTimeout(() => resolve(null), 1500));
    const remoteData = await Promise.race([fetchSupabase(), timeoutPromise]);

    if (remoteData && remoteData.length > 0) {
      const remoteNames = new Set(remoteData.map(c => c.razao_social.toLowerCase().trim()));
      localClientes.forEach(lc => {
        if (!remoteNames.has(lc.razao_social.toLowerCase().trim())) {
          remoteData.push(lc);
        }
      });
      remoteData.sort((a, b) => a.razao_social.localeCompare(b.razao_social));
      try {
        localStorage.setItem(LOCAL_STORAGE_CLIENTES_KEY, JSON.stringify(remoteData));
      } catch {}
      return remoteData;
    }
  } catch (e) {
    console.warn('Uso de base local de clientes ativado (Supabase indisponível/lento):', e);
  }

  // Atualiza LocalStorage sincronizado com a base inicial se ainda não salvo
  try {
    localStorage.setItem(LOCAL_STORAGE_CLIENTES_KEY, JSON.stringify(localClientes));
  } catch {}

  return localClientes;
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

// Resolver Cidade e Estado (UF) a partir do cadastro de cliente
export function resolveCidadeEstadoFromCliente(
  clientName?: string,
  currentCity?: string,
  currentState?: string
): { cidade: string; estado: string } {
  let cidade = (currentCity || '').trim();
  let estado = (currentState || '').trim();

  if (cidade && estado) {
    return { cidade, estado };
  }

  if (!clientName) {
    return { cidade, estado };
  }

  const searchName = clientName.toLowerCase().trim();

  let allClientes: ClienteData[] = CLIENTES_BASE_INICIAL;
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_CLIENTES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        allClientes = parsed;
      }
    }
  } catch {}

  const found = allClientes.find(c => {
    const rSocial = (c.razao_social || '').toLowerCase().trim();
    const nFantasia = (c.nome_fantasia || '').toLowerCase().trim();
    return (
      (rSocial && (searchName.includes(rSocial) || rSocial.includes(searchName))) ||
      (nFantasia && (searchName.includes(nFantasia) || nFantasia.includes(searchName)))
    );
  });

  if (found) {
    if (!cidade && found.cidade) cidade = found.cidade;
    if (!estado && found.uf) estado = found.uf;
  }

  return { cidade, estado };
}

