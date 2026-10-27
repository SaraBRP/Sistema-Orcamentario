import type { OrcamentoItem } from '../types/calculos';

export function isItemSection(item: any, _allItems?: OrcamentoItem[]): boolean {
  if (!item) return false;

  const eapClean = (item.item_eap || '').replace(/\.+/g, '.').replace(/^\.|\.$/g, '').trim();
  const eapParts = eapClean.split('.').filter(Boolean);

  const isExplicitChildInsumoOrSubComp = Boolean(
    item.composicao_id ||
    item.parentCompositionId ||
    (item as any).parent_composition_id ||
    item.isChildInsumoOfComposition ||
    (item as any).is_child_insumo
  );
  if (isExplicitChildInsumoOrSubComp) {
    return false;
  }

  const isExplicitSecao = Boolean(
    item.isSecao || 
    item.is_secao || 
    item.isTextLine || 
    item.isSummary || 
    item.is_topico || 
    item.isTopico
  );

  const itemTipo = String(item.tipo || (item as any).tipo_item || (item as any).tipoItem || (item as any).tipo_vinculo || '').toLowerCase().trim();
  const isSecaoByTipo = ['secao', 'seção', 'texto', 'titulo', 'título', 'topico', 'tópico', 'linha_texto', 'insert'].includes(itemTipo);

  const isTopLevelEapByPattern = eapParts.length === 1 && eapClean.length > 0;

  if (isExplicitSecao || isSecaoByTipo || isTopLevelEapByPattern) {
    return true;
  }

  const hasCode = Boolean((item.codigo && item.codigo.trim()) || (item.banco_fonte && item.banco_fonte.trim()));
  if (!hasCode) {
    return true;
  }

  return false;
}

export function calculateCronogramaTotalDuration(
  itens: OrcamentoItem[],
  duracoesMap: Record<string, string> = {},
  predecessorasMap: Record<string, string> = {},
  dataInicioObra: string = '',
  nonActivityMap: Record<string, boolean> = {}
): { totalDays: number; totalMonths: number; minStart: Date | null; maxEnd: Date | null } {
  if (!itens || itens.length === 0) {
    return { totalDays: 0, totalMonths: 1, minStart: null, maxEnd: null };
  }

  const validItens = itens.filter(it => Boolean((it.item_eap || '').trim() || (it.descricao || '').trim()));
  if (validItens.length === 0) {
    return { totalDays: 0, totalMonths: 1, minStart: null, maxEnd: null };
  }

  const hasEapChildrenSet = new Set<string>();
  validItens.forEach(it => {
    const eap = (it.item_eap || '').trim();
    if (!eap) return;
    const parts = eap.split('.').filter(Boolean);
    for (let len = 1; len < parts.length; len++) {
      hasEapChildrenSet.add(parts.slice(0, len).join('.'));
    }
  });

  const isItemChildOf = (child: OrcamentoItem, parent: OrcamentoItem): boolean => {
    if (!child || !parent || child === parent) return false;
    const cId = (child as any).parentCompositionId || (child as any).parent_composition_id;
    if (cId && (String(cId) === String(parent.id) || (parent.composicao_id && String(cId) === String(parent.composicao_id)))) {
      return true;
    }
    const cEap = (child.item_eap || '').trim();
    const pEap = (parent.item_eap || '').trim();
    if (cEap && pEap && cEap.startsWith(pEap + '.')) return true;
    return false;
  };

  const tasks: OrcamentoItem[] = [];

  validItens.forEach(item => {
    const eapClean = (item.item_eap || '').trim();
    const parts = eapClean.split('.').filter(Boolean);

    const isExplicitInsumoFlag = Boolean(
      (item as any).isChildInsumoOfComposition || 
      (item as any).is_child_insumo
    );

    const hasChildrenInEap = eapClean ? hasEapChildrenSet.has(eapClean) : false;
    const isComposition = Boolean(item.composicao_id || (item as any).hasChildren || hasChildrenInEap);

    let parentIsComposition = false;
    let parentTask: OrcamentoItem | null = null;
    let bestLen = -1;

    validItens.forEach(t => {
      if (t !== item && isItemChildOf(item, t)) {
        const tEap = (t.item_eap || '').trim();
        if (tEap.length > bestLen) {
          parentTask = t;
          bestLen = tEap.length;
        }
      }
    });

    if (parentTask) {
      const pEap = ((parentTask as OrcamentoItem).item_eap || '').trim();
      const pParts = pEap.split('.').filter(Boolean);
      const pHasUnit = Boolean((parentTask as OrcamentoItem).unidade && (parentTask as OrcamentoItem).unidade.trim());
      const pHasCode = Boolean((parentTask as OrcamentoItem).codigo && (parentTask as OrcamentoItem).codigo.trim());
      parentIsComposition = pParts.length >= 2 || pHasUnit || pHasCode || Boolean((parentTask as OrcamentoItem).composicao_id);
    }

    const isLeafInsumoResource = !isComposition && (isExplicitInsumoFlag || (parentTask !== null && parentIsComposition));

    if (!isLeafInsumoResource || !parentTask) {
      tasks.push(item);
    }
  });

  if (tasks.length === 0) {
    return { totalDays: 0, totalMonths: 1, minStart: null, maxEnd: null };
  }

  let startBase = new Date((dataInicioObra || '').trim() + 'T00:00:00');
  if (isNaN(startBase.getTime())) {
    startBase = new Date();
    startBase.setHours(0, 0, 0, 0);
  }

  const eapMap = new Map<string, OrcamentoItem>();
  tasks.forEach(it => {
    if (it.item_eap) eapMap.set(it.item_eap.trim(), it);
    if (it.id) eapMap.set(it.id, it);
  });

  type TaskCalc = {
    item: OrcamentoItem;
    duracaoDias: number;
    startDate: Date;
    endDate: Date;
    isSection: boolean;
  };

  const taskMap = new Map<string, TaskCalc>();
  const visitedSet = new Set<string>();

  const getDirectParentItem = (item: OrcamentoItem): OrcamentoItem | null => {
    const eap = (item.item_eap || '').trim();
    const parts = eap.split('.').filter(Boolean);
    if (parts.length <= 1) return null;
    const parentEap = parts.slice(0, -1).join('.');
    return eapMap.get(parentEap) || null;
  };

  const computeTask = (it: OrcamentoItem): TaskCalc => {
    const eapKey = it.item_eap?.trim() || it.id;
    if (taskMap.has(eapKey)) return taskMap.get(eapKey)!;

    if (visitedSet.has(eapKey)) {
      const fallbackStart = new Date(startBase);
      const fallbackEnd = new Date(startBase);
      fallbackEnd.setDate(fallbackEnd.getDate() + 5);
      return {
        item: it,
        duracaoDias: 5,
        startDate: fallbackStart,
        endDate: fallbackEnd,
        isSection: false
      };
    }

    visitedSet.add(eapKey);

    try {
      const isRootSection = isItemSection(it, tasks);
      const isInherited = !isRootSection && Boolean(nonActivityMap[it.id] || nonActivityMap[eapKey]);

      let dur = 5;
      let startDate = new Date(startBase);
      let endDate = new Date(startBase);
      const predStr = predecessorasMap[it.id] || predecessorasMap[eapKey] || '';

      if (isInherited) {
        const parentItem = getDirectParentItem(it);
        const parentEapKey = parentItem ? (parentItem.item_eap?.trim() || parentItem.id) : null;
        if (parentItem && parentEapKey && !visitedSet.has(parentEapKey)) {
          const parentCalc = computeTask(parentItem);
          startDate = new Date(parentCalc.startDate);
          endDate = new Date(parentCalc.endDate);
          dur = parentCalc.duracaoDias;
        } else {
          dur = 5;
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + dur);
        }
      } else {
        const rawDur = duracoesMap[it.id] || duracoesMap[eapKey] || '';
        const parsedDur = parseFloat(rawDur);
        if (!isNaN(parsedDur) && parsedDur > 0) {
          dur = parsedDur;
        } else {
          dur = isRootSection ? 0 : 5;
        }

        if (predStr.trim() && !isRootSection) {
          const predEaps = predStr.split(/[,;]/).map(s => s.trim()).filter(Boolean);
          let maxCalculatedStart = new Date(startBase);

          predEaps.forEach(predEapRaw => {
            try {
              const match = predEapRaw.match(/^\s*([0-9\.]+)\s*(TI|FS|II|SS|TT|FF|IT|SF)?\s*([\+\-]\s*\d+(?:\s*d(?:ias?)?)?)?\s*/i);
              if (!match) return;

              const targetEap = match[1].trim();
              const relType = (match[2] || 'TI').toUpperCase();
              const lagDays = match[3] ? parseInt(match[3].replace(/\s+/g, ''), 10) : 0;

              const itEap = (it.item_eap || '').trim();
              if (targetEap === itEap || targetEap === it.id) return;

              const parentItem = eapMap.get(targetEap);
              if (!parentItem || parentItem.id === it.id) return;

              const isTargetInherited = Boolean(
                nonActivityMap[parentItem.id] || 
                nonActivityMap[parentItem.item_eap || ''] || 
                nonActivityMap[targetEap]
              );
              if (isTargetInherited) return;

              const isTargetRootSection = isItemSection(parentItem, tasks);
              if (isTargetRootSection && itEap.startsWith(targetEap + '.')) return;

              if (!visitedSet.has(targetEap)) {
                const predCalc = computeTask(parentItem);

                if (predCalc) {
                  let targetStart = new Date(startBase);

                  if (relType === 'TI' || relType === 'FS') {
                    targetStart = new Date(predCalc.endDate);
                    if (lagDays !== 0) targetStart.setDate(targetStart.getDate() + lagDays);
                  } else if (relType === 'II' || relType === 'SS') {
                    targetStart = new Date(predCalc.startDate);
                    if (lagDays !== 0) targetStart.setDate(targetStart.getDate() + lagDays);
                  } else if (relType === 'TT' || relType === 'FF') {
                    const targetEnd = new Date(predCalc.endDate);
                    if (lagDays !== 0) targetEnd.setDate(targetEnd.getDate() + lagDays);
                    targetStart = new Date(targetEnd);
                    targetStart.setDate(targetStart.getDate() - Math.max(1, Math.round(dur)));
                  } else if (relType === 'IT' || relType === 'SF') {
                    const targetEnd = new Date(predCalc.startDate);
                    if (lagDays !== 0) targetEnd.setDate(targetEnd.getDate() + lagDays);
                    targetStart = new Date(targetEnd);
                    targetStart.setDate(targetStart.getDate() - Math.max(1, Math.round(dur)));
                  }

                  if (targetStart > maxCalculatedStart) {
                    maxCalculatedStart = targetStart;
                  }
                }
              }
            } catch (err) {
              console.error('Erro ao calcular predecessora:', predEapRaw, err);
            }
          });

          startDate = maxCalculatedStart;
        }

        if (isRootSection && !rawDur) {
          const prefix = eapKey + '.';
          const childCalcs: TaskCalc[] = [];
          tasks.forEach(child => {
            const cEap = (child.item_eap || '').trim();
            if (cEap.startsWith(prefix) && cEap !== it.item_eap) {
              const childIsInherited = Boolean(nonActivityMap[child.id] || nonActivityMap[cEap]);
              if (!visitedSet.has(cEap) && !childIsInherited) {
                childCalcs.push(computeTask(child));
              }
            }
          });
          if (childCalcs.length > 0) {
            const validChildStarts = childCalcs.map(c => c.startDate.getTime()).filter(t => !isNaN(t));
            const validChildEnds = childCalcs.map(c => c.endDate.getTime()).filter(t => !isNaN(t));
            if (validChildStarts.length > 0 && validChildEnds.length > 0) {
              startDate = new Date(Math.min(...validChildStarts));
              const minEnd = new Date(Math.max(...validChildEnds));
              dur = Math.max(1, Math.round((minEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
            }
          }
        }

        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + Math.max(1, Math.round(dur)));
      }

      const res: TaskCalc = {
        item: it,
        duracaoDias: Math.round(dur),
        startDate,
        endDate,
        isSection: isRootSection
      };
      taskMap.set(eapKey, res);
      return res;
    } finally {
      visitedSet.delete(eapKey);
    }
  };

  tasks.forEach(it => computeTask(it));

  const allCalcs = tasks.map(it => taskMap.get(it.item_eap?.trim() || it.id)).filter(Boolean) as TaskCalc[];
  const nonSectionCalcs = allCalcs.filter(t => !t.isSection);
  const targetCalcs = nonSectionCalcs.length > 0 ? nonSectionCalcs : allCalcs;

  if (targetCalcs.length === 0) {
    return { totalDays: 0, totalMonths: 1, minStart: null, maxEnd: null };
  }

  const minStartMs = Math.min(...targetCalcs.map(t => t.startDate.getTime()));
  const maxEndMs = Math.max(...targetCalcs.map(t => t.endDate.getTime()));

  const minStart = new Date(minStartMs);
  const maxEnd = new Date(maxEndMs);

  const totalDays = Math.max(0, Math.ceil((maxEndMs - minStartMs) / (1000 * 60 * 60 * 24)));
  const totalMonths = totalDays > 0 ? Math.max(1, Math.ceil(totalDays / 30)) : 1;

  return {
    totalDays,
    totalMonths,
    minStart,
    maxEnd
  };
}
