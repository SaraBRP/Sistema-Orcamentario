import type { ParametroTecnicoItem } from '../types/parametros';
import { PARAMETROS_PADRAO_SISTEMA } from '../data/parametrosPadrao';

const PARAMETROS_STORAGE_KEY = 'sistema_orcamentario_parametros_tecnicos_v1';

export function getParametrosCadastrados(): ParametroTecnicoItem[] {
  try {
    const raw = localStorage.getItem(PARAMETROS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PARAMETROS_STORAGE_KEY, JSON.stringify(PARAMETROS_PADRAO_SISTEMA));
      return PARAMETROS_PADRAO_SISTEMA;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    console.error('Erro ao ler parâmetros do localStorage:', e);
  }
  return PARAMETROS_PADRAO_SISTEMA;
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
