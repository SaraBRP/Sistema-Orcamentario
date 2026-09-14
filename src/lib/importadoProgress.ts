export interface ImportadoProgressItem {
  id?: string;
  item_eap?: string;
  quantidade?: number;
  composicao_id?: string | null;
  composicao?: any;
  insumo_id?: string | null;
  insumo?: any;
  tipo_vinculo?: string | null;
  texto_empresa?: string | null;
  status_linha?: string | null;
}

export const isMainClientItem = (item: ImportadoProgressItem): boolean => {
  return item.status_linha !== 'inativo' && item.status_linha !== 'desdobrado';
};

export const getDirectChildren = (eap: string, items: ImportadoProgressItem[]): ImportadoProgressItem[] => {
  if (!eap) return [];
  const prefix = eap.trim() + '.';
  return items.filter(i => {
    const itemEap = (i.item_eap || '').trim();
    if (!itemEap.startsWith(prefix)) return false;
    const remainder = itemEap.substring(prefix.length);
    return !remainder.includes('.');
  });
};

export const hasGrandchildren = (eap: string, items: ImportadoProgressItem[]): boolean => {
  const directChildren = getDirectChildren(eap, items);
  return directChildren.some(child => {
    if (!child.item_eap) return false;
    const childPrefix = child.item_eap.trim() + '.';
    return items.some(i => (i.item_eap || '').trim().startsWith(childPrefix));
  });
};

export const getItemEapRole = (item: ImportadoProgressItem, items: ImportadoProgressItem[]): 'secao_texto' | 'item_operacional' => {
  const isInsertedByEmpresa = item.status_linha === 'inserido_empresa' || item.status_linha === 'inserido_empresa_e_cliente';
  if (isInsertedByEmpresa) return 'item_operacional';
  if (item.status_linha === 'desdobrado') return 'item_operacional';
  if (item.composicao_id || item.insumo_id || item.composicao || item.insumo) return 'item_operacional';

  if (!item.quantidade || item.quantidade === 0) {
    return 'secao_texto';
  }

  if (item.item_eap) {
    const directChildren = getDirectChildren(item.item_eap, items);
    if (directChildren.length > 0) {
      return 'secao_texto';
    }
  }
  return 'item_operacional';
};

export const hasDirectDesdobrados = (itemEap: string, itemList: ImportadoProgressItem[]): boolean => {
  if (!itemEap) return false;
  return itemList.some(child => {
    if (child.status_linha !== 'desdobrado' || !child.item_eap) return false;
    const parts = child.item_eap.split('.');
    if (parts.length <= 1) return false;
    const parentEap = parts.slice(0, -1).join('.');
    return parentEap === itemEap;
  });
};

export const isItemLinked = (item: ImportadoProgressItem, itemList: ImportadoProgressItem[]): boolean => {
  if (item.status_linha === 'inativo' || item.status_linha === 'desdobrado') return true;

  const role = getItemEapRole(item, itemList);
  if (role === 'secao_texto') {
    return true;
  }

  const hasComp = !!(item.composicao_id || item.composicao);
  const hasInsumo = !!(item.insumo_id || item.insumo);
  const hasText = item.tipo_vinculo === 'texto' || !!(item.texto_empresa && String(item.texto_empresa).trim() !== '');
  const isInserted = item.status_linha === 'inserido_empresa' || item.status_linha === 'inserido_empresa_e_cliente';

  const itemEap = item.item_eap || '';
  const hasChildrenDesdobrados = hasDirectDesdobrados(itemEap, itemList);

  return hasComp || hasInsumo || hasText || isInserted || hasChildrenDesdobrados;
};

export const calculateImportadoProgressStats = (items: ImportadoProgressItem[]) => {
  if (!items || items.length === 0) {
    return { total: 0, linked: 0, percent: 0 };
  }
  const mainClientItems = items.filter(isMainClientItem);
  const total = mainClientItems.length;
  const linked = mainClientItems.filter(i => isItemLinked(i, items)).length;
  const percent = total > 0 ? Math.round((linked / total) * 100) : 100;
  return { total, linked, percent };
};
