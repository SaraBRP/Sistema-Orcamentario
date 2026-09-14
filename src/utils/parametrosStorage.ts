import type { ParametroTecnicoItem } from '../types/parametros';
import { PARAMETROS_PADRAO_SISTEMA } from '../data/parametrosPadrao';
import { CATALOGO_CAMPOS_SISTEMA, type CampoSistemaOption } from '../types/calculos';

const PARAMETROS_STORAGE_KEY = 'sistema_orcamentario_parametros_tecnicos_v1';

export function getParametrosCadastrados(): ParametroTecnicoItem[] {
  let list: ParametroTecnicoItem[] = PARAMETROS_PADRAO_SISTEMA;
  try {
    const raw = localStorage.getItem(PARAMETROS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PARAMETROS_STORAGE_KEY, JSON.stringify(PARAMETROS_PADRAO_SISTEMA));
    } else {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        list = parsed;
      }
    }
  } catch (e) {
    console.error('Erro ao ler parâmetros do localStorage:', e);
  }
  return [...list].sort((a, b) => a.parametro.localeCompare(b.parametro, 'pt-BR', { sensitivity: 'base' }));
}

export function getListaParametrosRefSistema(): CampoSistemaOption[] {
  const customList = getParametrosCadastrados();
  const labelMap = new Map<string, CampoSistemaOption>();

  // 1. Inclui os campos padrão do catálogo oficial
  for (const item of CATALOGO_CAMPOS_SISTEMA) {
    if (item.chave === 'personalizado') continue;
    labelMap.set(item.label.toLowerCase().trim(), { ...item });
  }

  // 2. Inclui os parâmetros customizados e salvos pelo usuário
  for (const item of customList) {
    const key = item.parametro.toLowerCase().trim();
    if (!labelMap.has(key)) {
      labelMap.set(key, {
        chave: item.id || `custom_${key}`,
        label: item.parametro,
        unidade: item.unidade || '',
        categoria: item.categoria || 'Personalizados'
      });
    }
  }

  // 3. Ordena estritamente por ordem alfabética (pt-BR)
  return Array.from(labelMap.values()).sort((a, b) =>
    a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' })
  );
}

export function saveParametrosCadastrados(lista: ParametroTecnicoItem[]): void {
  try {
    localStorage.setItem(PARAMETROS_STORAGE_KEY, JSON.stringify(lista));
  } catch (e) {
    console.error('Erro ao salvar parâmetros no localStorage:', e);
  }
}

export function addParametroCustom(novo: Omit<ParametroTecnicoItem, 'id' | 'isCustom'>): ParametroTecnicoItem {
  const atuais = getParametrosCadastrados();
  const id = `param-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const itemCompleto: ParametroTecnicoItem = {
    ...novo,
    id,
    isCustom: true
  };
  const atualizados = [itemCompleto, ...atuais];
  saveParametrosCadastrados(atualizados);
  return itemCompleto;
}

export function updateParametro(id: string, alteracoes: Partial<ParametroTecnicoItem>): ParametroTecnicoItem[] {
  const atuais = getParametrosCadastrados();
  const atualizados = atuais.map(p => (p.id === id ? { ...p, ...alteracoes } : p));
  saveParametrosCadastrados(atualizados);
  return atualizados;
}

export function deleteParametro(id: string): ParametroTecnicoItem[] {
  const atuais = getParametrosCadastrados();
  const atualizados = atuais.filter(p => p.id !== id);
  saveParametrosCadastrados(atualizados);
  return atualizados;
}

export function resetParametrosParaPadrao(): ParametroTecnicoItem[] {
  saveParametrosCadastrados(PARAMETROS_PADRAO_SISTEMA);
  return PARAMETROS_PADRAO_SISTEMA;
}
