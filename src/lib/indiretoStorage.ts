import type { IndiretoOrcamentoConfig, IndiretoGrupo, IndiretoItem, IndiretoResumoTotais } from '../types/indireto';
import { DEFAULT_INDIRETO_GRUPOS } from '../data/defaultIndiretoTemplate';

const STORAGE_PREFIX = 'brp_indireto_config_';
const GLOBAL_CATALOGO_KEY = 'brp_indireto_catalogo_global';

/**
 * Retorna o Catálogo Padrão de Indiretos cadastrado no Banco Próprio (nível empresa)
 */
export function getGlobalIndiretoCatalogo(): IndiretoGrupo[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(GLOBAL_CATALOGO_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((g, idx) => ({
          ...g,
          id: g.id || `g${idx + 1}`,
          numero: idx + 1,
          nome: g.nome || `GRUPO ${idx + 1}`,
          itens: Array.isArray(g.itens) ? g.itens : []
        }));
      }
    }
  } catch (err) {
    console.error('Erro ao carregar Catálogo Global de Indiretos:', err);
  }

  // Se ainda não salvou, inicializa com os 14 grupos estruturais padrão
  return DEFAULT_INDIRETO_GRUPOS.map((g, idx) => ({
    id: `g${idx + 1}`,
    numero: idx + 1,
    nome: g.nome,
    descricao: g.descricao,
    ativo: true,
    itens: []
  }));
}

/**
 * Salva a Matriz Padrão de Indiretos da empresa (Catálogo Global do Banco Próprio)
 */
export function saveGlobalIndiretoCatalogo(grupos: IndiretoGrupo[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      const sanitized = (grupos || []).map((g, idx) => ({
        ...g,
        numero: idx + 1
      }));
      localStorage.setItem(GLOBAL_CATALOGO_KEY, JSON.stringify(sanitized));
    }
  } catch (err) {
    console.error('Erro ao salvar Catálogo Global de Indiretos:', err);
  }
}

export function getDefaultIndiretoConfig(orcamentoId: string, prazoMeses: number = 6): IndiretoOrcamentoConfig {
  const globalGrupos = getGlobalIndiretoCatalogo();
  const grupos: IndiretoGrupo[] = (globalGrupos || []).map((g, idx) => ({
    ...g,
    numero: idx + 1,
    itens: (g.itens || []).map(item => {
      const aloc = item.alocacaoMensal !== undefined ? Number(item.alocacaoMensal) : 1;
      const isFixo = Boolean(item.isCustoFixo);
      const effectivePrazo = isFixo ? 1 : aloc;
      const totalQtd = item.quantidadeTotal !== undefined ? Number(item.quantidadeTotal) : 1;
      const unitU = Math.max(0, Number(item.valorUnitario) || 0);
      const unitEncargos = Math.max(0, Number(item.valorFixoEncargos) || 0);
      const valorTotal = (effectivePrazo * totalQtd * unitU) + unitEncargos;

      return {
        ...item,
        alocacaoMensal: aloc,
        isCustoFixo: isFixo,
        quantidadeTotal: totalQtd,
        valorUnitario: unitU,
        valorFixoEncargos: unitEncargos,
        valorTotal
      };
    })
  }));

  return {
    orcamentoId: orcamentoId || 'temp',
    prazoObraMeses: prazoMeses || 6,
    grupos,
    ultimaAtualizacao: new Date().toISOString()
  };
}

export function loadIndiretoConfig(orcamentoId: string, defaultPrazoMeses: number = 6): IndiretoOrcamentoConfig {
  if (!orcamentoId) {
    return getDefaultIndiretoConfig('temp', defaultPrazoMeses);
  }

  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(`${STORAGE_PREFIX}${orcamentoId}`) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.grupos) && parsed.grupos.length > 0) {
        const prazoAtual = defaultPrazoMeses || parsed.prazoObraMeses || 6;
        return recalculateIndiretoConfig(parsed, prazoAtual);
      }
    }
  } catch (err) {
    console.error('Erro ao carregar configurações de indiretos:', err);
  }

  return getDefaultIndiretoConfig(orcamentoId, defaultPrazoMeses);
}

export function saveIndiretoConfig(orcamentoId: string, config: IndiretoOrcamentoConfig): void {
  if (!orcamentoId || !config || typeof localStorage === 'undefined') return;
  try {
    const toSave = {
      ...config,
      grupos: (config.grupos || []).map((g, idx) => ({
        ...g,
        numero: idx + 1
      })),
      version: 2,
      ultimaAtualizacao: new Date().toISOString()
    };
    localStorage.setItem(`${STORAGE_PREFIX}${orcamentoId}`, JSON.stringify(toSave));
  } catch (err) {
    console.error('Erro ao salvar configurações de indiretos:', err);
  }
}

export function recalculateIndiretoConfig(config: IndiretoOrcamentoConfig, novoPrazoMeses?: number): IndiretoOrcamentoConfig {
  const prazoMeses = novoPrazoMeses !== undefined ? novoPrazoMeses : (config?.prazoObraMeses || 6);
  const grupos = (config && Array.isArray(config.grupos) && config.grupos.length > 0) 
    ? config.grupos 
    : getGlobalIndiretoCatalogo();

  const gruposAtualizados = grupos.map((grupo, idx) => {
    const itensAtualizados = (grupo.itens || []).map(item => {
      const aloc = item.alocacaoMensal !== undefined ? Number(item.alocacaoMensal) : 1;
      const isFixo = Boolean(item.isCustoFixo);
      const effectivePrazo = isFixo ? 1 : aloc;
      const totalQtd = item.quantidadeTotal !== undefined ? Number(item.quantidadeTotal) : 1;
      const unitU = Math.max(0, Number(item.valorUnitario) || 0);
      const unitEncargos = Math.max(0, Number(item.valorFixoEncargos) || 0);
      const valorTotal = (effectivePrazo * totalQtd * unitU) + unitEncargos;

      return {
        ...item,
        alocacaoMensal: aloc,
        isCustoFixo: isFixo,
        quantidadeTotal: totalQtd,
        valorUnitario: unitU,
        valorFixoEncargos: unitEncargos,
        valorTotal
      };
    });
    return {
      ...grupo,
      numero: idx + 1,
      itens: itensAtualizados
    };
  });

  return {
    ...config,
    prazoObraMeses: prazoMeses,
    grupos: gruposAtualizados
  };
}

export function calculateIndiretoTotais(config: IndiretoOrcamentoConfig, totalDireto: number = 0): IndiretoResumoTotais {
  let totalGeral = 0;
  let totalEap = 0;
  let totalBdi = 0;
  const totalPorGrupo: Record<string, number> = {};

  const grupos = (config && Array.isArray(config.grupos)) ? config.grupos : [];

  grupos.forEach(grupo => {
    if (grupo.ativo === false) return;

    let subtotalGrupo = 0;
    (grupo.itens || []).forEach(item => {
      if (!item.ativo) return;
      const v = Number(item.valorTotal) || 0;
      totalGeral += v;
      subtotalGrupo += v;

      if (item.destino === 'bdi') {
        totalBdi += v;
      } else {
        totalEap += v;
      }
    });

    totalPorGrupo[grupo.id] = subtotalGrupo;
  });

  const percentualSobreDireto = totalDireto > 0 ? (totalGeral / totalDireto) * 100 : undefined;

  return {
    totalGeral,
    totalEap,
    totalBdi,
    totalPorGrupo,
    percentualSobreDireto
  };
}

export type IndiretoSyncMode = 'detalhado' | 'sintetico';

/**
 * Gera itens EAP para serem inseridos/sincronizados na Planilha Orçamentária.
 * Suporta o modo 'detalhado' (seção + insumos filhos) e 'sintetico' (linha única por grupo com valor total).
 */
export function generateEapItemsFromIndiretos(
  config: IndiretoOrcamentoConfig, 
  orcamentoId: string,
  mode: IndiretoSyncMode = 'detalhado',
  specificGrupoId?: string
): any[] {
  const result: any[] = [];
  const rawGrupos = (config && Array.isArray(config.grupos)) ? config.grupos : [];
  const grupos = rawGrupos.map((g, idx) => ({ ...g, numero: idx + 1 }));

  const gruposParaProcessar = specificGrupoId
    ? grupos.filter(g => g.id === specificGrupoId)
    : grupos;

  if (gruposParaProcessar.length === 0) {
    return result;
  }

  // Linha resumo do capítulo principal apenas quando sincronizando todos os grupos
  if (!specificGrupoId) {
    result.push({
      id: `indireto-cap-1-${orcamentoId}`,
      orcamento_id: orcamentoId,
      item_eap: '1',
      codigo: '',
      banco_fonte: '',
      descricao: 'ADMINISTRAÇÃO LOCAL E CANTEIRO DE OBRAS',
      unidade: '',
      quantidade: 0,
      valor_unitario_mat: 0,
      valor_unitario_mo: 0,
      valor_unitario: 0,
      valor_unitario_com_bdi: 0,
      total_mat: 0,
      total_mo: 0,
      total: 0,
      isSecao: true,
      is_secao: true,
      level: 0
    });
  }

  gruposParaProcessar.forEach((grupo) => {
    if (grupo.ativo === false) return;
    const itensGrupo = (grupo.itens || []).filter(i => i.ativo && i.destino !== 'bdi');
    if (itensGrupo.length === 0) return;

    let totalMatGrupo = 0;
    let totalMoGrupo = 0;
    let totalGeralGrupo = 0;

    itensGrupo.forEach(item => {
      const isMaoDeObra = grupo.id === 'g1' || grupo.id === 'g11' ||
        grupo.nome.toLowerCase().includes('mão de obra') ||
        grupo.nome.toLowerCase().includes('equipe técnica') ||
        item.descricao.toLowerCase().includes('engenheiro') ||
        item.descricao.toLowerCase().includes('técnico') ||
        item.descricao.toLowerCase().includes('encarregado');
      const matTot = isMaoDeObra ? 0 : (item.valorTotal || 0);
      const moTot = isMaoDeObra ? (item.valorTotal || 0) : 0;

      totalMatGrupo += matTot;
      totalMoGrupo += moTot;
      totalGeralGrupo += (item.valorTotal || 0);
    });

    const subCapEap = specificGrupoId ? '' : `1.${grupo.numero}`;

    if (mode === 'sintetico') {
      // ── MODO SINTÉTICO: 1 linha única por grupo com valor total ──
      result.push({
        id: `indireto-sint-${grupo.id}-${orcamentoId}`,
        orcamento_id: orcamentoId,
        item_eap: subCapEap,
        codigo: `IND-GRP-${grupo.numero}`,
        banco_fonte: 'Própria',
        descricao: grupo.nome,
        unidade: 'verba',
        quantidade: 1,
        valor_unitario_mat: totalMatGrupo,
        valor_unitario_mo: totalMoGrupo,
        valor_unitario: totalGeralGrupo,
        valor_unitario_com_bdi: totalGeralGrupo,
        total_mat: totalMatGrupo,
        total_mo: totalMoGrupo,
        total: totalGeralGrupo,
        isSecao: false,
        is_secao: false,
        level: specificGrupoId ? 0 : 1
      });
    } else {
      // ── MODO DETALHADO: Seção do Grupo + Insumos Filhos ──
      result.push({
        id: `indireto-subcap-${grupo.id}-${orcamentoId}`,
        orcamento_id: orcamentoId,
        item_eap: subCapEap,
        codigo: '',
        banco_fonte: '',
        descricao: grupo.nome,
        unidade: '',
        quantidade: 0,
        valor_unitario_mat: 0,
        valor_unitario_mo: 0,
        valor_unitario: 0,
        valor_unitario_com_bdi: 0,
        total_mat: totalMatGrupo,
        total_mo: totalMoGrupo,
        total: totalGeralGrupo,
        isSecao: true,
        is_secao: true,
        level: specificGrupoId ? 0 : 1
      });

      itensGrupo.forEach((item, itemIdx) => {
        const itemEap = specificGrupoId ? '' : `${subCapEap}.${itemIdx + 1}`;
        const isMaoDeObra = grupo.id === 'g1' || grupo.id === 'g11' ||
          grupo.nome.toLowerCase().includes('mão de obra') ||
          grupo.nome.toLowerCase().includes('equipe técnica') ||
          (item.descricao || '').toLowerCase().includes('engenheiro') ||
          (item.descricao || '').toLowerCase().includes('técnico') ||
          (item.descricao || '').toLowerCase().includes('encarregado') ||
          (item.descricao || '').toLowerCase().includes('topografo');
        
        const q = (item.quantidadeTotal && item.quantidadeTotal > 0) ? item.quantidadeTotal : 1;
        const unitTotal = Math.round(((item.valorTotal || 0) / q) * 100) / 100;
        const matU = isMaoDeObra ? 0 : unitTotal;
        const moU = isMaoDeObra ? unitTotal : 0;
        const matTot = isMaoDeObra ? 0 : (item.valorTotal || 0);
        const moTot = isMaoDeObra ? (item.valorTotal || 0) : 0;

        result.push({
          id: `indireto-item-${item.id}-${orcamentoId}`,
          orcamento_id: orcamentoId,
          item_eap: itemEap,
          codigo: item.codigo || `IND-${item.id.toUpperCase()}`,
          banco_fonte: 'Própria',
          descricao: item.descricao,
          unidade: item.unidade,
          quantidade: q,
          valor_unitario_mat: matU,
          valor_unitario_mo: moU,
          valor_unitario: unitTotal,
          valor_unitario_com_bdi: unitTotal,
          total_mat: matTot,
          total_mo: moTot,
          total: item.valorTotal || 0,
          isSecao: false,
          is_secao: false,
          level: specificGrupoId ? 1 : 2
        });
      });
    }
  });

  return result;
}

/**
 * Atualiza automaticamente os valores dos itens EAP de custos indiretos que já existem na Planilha Orçamentária
 * sempre que a configuração de custos indiretos (quantidades, prazos, preços unitários) for alterada.
 */
export function updateSyncedEapItemsWithNewConfig(
  currentItens: any[],
  config: IndiretoOrcamentoConfig,
  orcamentoId: string
): any[] {
  if (!currentItens || currentItens.length === 0) return currentItens;

  const rawGrupos = (config && Array.isArray(config.grupos)) ? config.grupos : [];
  if (rawGrupos.length === 0) return currentItens;
  const grupos = rawGrupos.map((g, idx) => ({ ...g, numero: idx + 1 }));

  const grupoTotaisMap = new Map<string, { mat: number; mo: number; total: number }>();
  let grandTotalMat = 0;
  let grandTotalMo = 0;
  let grandTotalGeral = 0;

  grupos.forEach(grupo => {
    let matG = 0;
    let moG = 0;
    let totG = 0;

    (grupo.itens || []).forEach(item => {
      if (item.ativo && item.destino !== 'bdi') {
        const isMaoDeObra = grupo.id === 'g1' || grupo.id === 'g11' ||
          grupo.nome.toLowerCase().includes('mão de obra') ||
          grupo.nome.toLowerCase().includes('equipe técnica') ||
          (item.descricao || '').toLowerCase().includes('engenheiro') ||
          (item.descricao || '').toLowerCase().includes('técnico') ||
          (item.descricao || '').toLowerCase().includes('encarregado') ||
          (item.descricao || '').toLowerCase().includes('topografo');
        const matTot = isMaoDeObra ? 0 : (item.valorTotal || 0);
        const moTot = isMaoDeObra ? (item.valorTotal || 0) : 0;
        matG += matTot;
        moG += moTot;
        totG += (item.valorTotal || 0);
      }
    });

    grupoTotaisMap.set(grupo.id, { mat: matG, mo: moG, total: totG });
    grandTotalMat += matG;
    grandTotalMo += moG;
    grandTotalGeral += totG;
  });

  // Encontra o item do Capítulo Geral de Custos Indiretos
  const chapterItem = currentItens.find(item => {
    if (!item) return false;
    const idStr = String(item.id || '');
    const desc = String(item.descricao || '').toLowerCase();
    return idStr.startsWith('indireto-cap-') ||
      desc === 'administração local e canteiro de obras' ||
      desc.includes('administração local') ||
      desc.includes('canteiro de obras') ||
      desc.includes('custos indiretos');
  });

  const capEap = chapterItem ? (chapterItem.item_eap || '').trim() : '';

  // Estruturas de correspondência
  const itemByIdMap = new Map<string, { item: IndiretoItem; grupo: IndiretoGrupo }>();
  const grupoActiveItensMap = new Map<number, IndiretoItem[]>();
  const itemsByCodeQueue = new Map<string, { item: IndiretoItem; grupo: IndiretoGrupo }[]>();
  const itemsByDescQueue = new Map<string, { item: IndiretoItem; grupo: IndiretoGrupo }[]>();

  grupos.forEach(grupo => {
    const activeItens: IndiretoItem[] = [];
    (grupo.itens || []).forEach(item => {
      itemByIdMap.set(item.id, { item, grupo });
      if (item.ativo && item.destino !== 'bdi') {
        activeItens.push(item);

        if (item.codigo) {
          const c = item.codigo.trim().toLowerCase();
          if (!itemsByCodeQueue.has(c)) itemsByCodeQueue.set(c, []);
          itemsByCodeQueue.get(c)!.push({ item, grupo });
        }
        if (item.descricao) {
          const d = item.descricao.trim().toLowerCase();
          if (!itemsByDescQueue.has(d)) itemsByDescQueue.set(d, []);
          itemsByDescQueue.get(d)!.push({ item, grupo });
        }
      }
    });
    grupoActiveItensMap.set(grupo.numero, activeItens);
  });

  let hasChanges = false;
  const matchedItemIds = new Set<string>();

  // Filtra seções ou itens pertencentes a grupos que foram excluídos dos custos indiretos
  const filteredItens = currentItens.filter(eapItem => {
    if (!eapItem) return false;
    const itemIdStr = String(eapItem.id || '');
    const itemDesc = String(eapItem.descricao || '').trim().toLowerCase();
    const itemEap = (eapItem.item_eap || '').trim();

    if (itemIdStr.startsWith('indireto-subcap-') || itemIdStr.startsWith('indireto-sec-g-') || itemIdStr.startsWith('indireto-sint-')) {
      const match = itemIdStr.match(/^(?:indireto-subcap-|indireto-sec-g-|indireto-sint-)(.+?)-/);
      const gId = match ? match[1] : null;
      if (gId && !grupos.some(g => g.id === gId)) return false;
    }
    if (itemIdStr.startsWith('indireto-det-i-') || itemIdStr.startsWith('indireto-item-')) {
      const match = itemIdStr.match(/^(?:indireto-det-i-|indireto-item-)(.+?)-/);
      const iId = match ? match[1] : null;
      if (iId && !itemByIdMap.has(iId)) return false;
    }

    // Se estiver sob o capítulo de indiretos e for uma seção com descrição que não existe mais em nenhum grupo
    if (capEap !== '' && itemEap.startsWith(capEap + '.')) {
      const parts = itemEap.split('.').filter(Boolean);
      const capParts = capEap.split('.').filter(Boolean);
      if (parts.length === capParts.length + 1 && (eapItem.isSecao || (eapItem as any).is_secao)) {
        const belongsToAnyGrupo = grupos.some(g => 
          itemIdStr.includes(g.id) || 
          g.nome.trim().toLowerCase() === itemDesc
        );
        if (!belongsToAnyGrupo) return false;
      }
    }

    return true;
  });

  if (filteredItens.length !== currentItens.length) {
    hasChanges = true;
  }

  const updatedItens = filteredItens.map(eapItem => {
    if (!eapItem) return eapItem;
    const itemIdStr = String(eapItem.id || '');
    const itemCode = String(eapItem.codigo || '').trim().toLowerCase();
    const itemDesc = String(eapItem.descricao || '').trim().toLowerCase();
    const itemEap = (eapItem.item_eap || '').trim();

    // 1. Linha do Capítulo Geral
    if (
      itemIdStr.startsWith('indireto-cap-') ||
      (capEap !== '' && itemEap === capEap) ||
      itemDesc === 'administração local e canteiro de obras' ||
      itemDesc.includes('administração local')
    ) {
      hasChanges = true;
      return {
        ...eapItem,
        isSecao: true,
        is_secao: true,
        total_mat: grandTotalMat,
        total_mo: grandTotalMo,
        total: grandTotalGeral
      };
    }

    // 2. Linha de Seção / Subcapítulo do Grupo
    let matchedGrupoForSection: IndiretoGrupo | undefined;
    if (itemIdStr.startsWith('indireto-subcap-') || itemIdStr.startsWith('indireto-sec-g-') || itemIdStr.startsWith('indireto-sint-')) {
      const match = itemIdStr.match(/^(?:indireto-subcap-|indireto-sec-g-|indireto-sint-)(.+?)-/);
      const gId = match ? match[1] : null;
      if (gId) matchedGrupoForSection = grupos.find(g => g.id === gId);
    }

    if (!matchedGrupoForSection && capEap !== '' && itemEap.startsWith(capEap + '.')) {
      const parts = itemEap.split('.').filter(Boolean);
      const capParts = capEap.split('.').filter(Boolean);
      if (parts.length === capParts.length + 1) {
        const groupNum = parseInt(parts[capParts.length], 10);
        matchedGrupoForSection = grupos.find(g => g.numero === groupNum);
      }
    }

    if (!matchedGrupoForSection && (eapItem.isSecao || (eapItem as any).is_secao || itemDesc.length > 0)) {
      matchedGrupoForSection = grupos.find(g => g.nome.trim().toLowerCase() === itemDesc);
    }

    if (matchedGrupoForSection) {
      const gTot = grupoTotaisMap.get(matchedGrupoForSection.id) || { mat: 0, mo: 0, total: 0 };
      const isSintetico = itemIdStr.startsWith('indireto-sint-') || (eapItem.unidade && eapItem.unidade.toLowerCase() === 'verba');
      const expectedEap = capEap ? `${capEap}.${matchedGrupoForSection.numero}` : eapItem.item_eap;
      const expectedCodigo = isSintetico ? `IND-GRP-${matchedGrupoForSection.numero}` : (eapItem.codigo || '');

      hasChanges = true;
      if (isSintetico) {
        return {
          ...eapItem,
          item_eap: expectedEap,
          codigo: expectedCodigo,
          valor_unitario_mat: gTot.mat,
          valor_unitario_mo: gTot.mo,
          valor_unitario: gTot.total,
          valor_unitario_com_bdi: gTot.total,
          total_mat: gTot.mat,
          total_mo: gTot.mo,
          total: gTot.total
        };
      } else {
        return {
          ...eapItem,
          item_eap: expectedEap,
          isSecao: true,
          is_secao: true,
          total_mat: gTot.mat,
          total_mo: gTot.mo,
          total: gTot.total
        };
      }
    }

    // 3. Linha de Insumo Filho / Detalhado
    let matchedItemInfo: { item: IndiretoItem; grupo: IndiretoGrupo } | undefined;

    // A. Match direto por ID no prefixo
    if (itemIdStr.startsWith('indireto-det-i-') || itemIdStr.startsWith('indireto-item-')) {
      const match = itemIdStr.match(/^(?:indireto-det-i-|indireto-item-)(.+?)-/);
      const iId = match ? match[1] : null;
      if (iId && itemByIdMap.has(iId)) {
        matchedItemInfo = itemByIdMap.get(iId);
      }
    }

    // B. Match posicional pela hierarquia EAP (ex: cap = 3, item = 3.1.1 -> grupo 1, filho 0)
    if (!matchedItemInfo && capEap !== '' && itemEap.startsWith(capEap + '.')) {
      const parts = itemEap.split('.').filter(Boolean);
      const capParts = capEap.split('.').filter(Boolean);
      if (parts.length === capParts.length + 2) {
        const groupNum = parseInt(parts[capParts.length], 10);
        const childIdx = parseInt(parts[capParts.length + 1], 10) - 1;
        const activeItens = grupoActiveItensMap.get(groupNum);
        if (activeItens && childIdx >= 0 && childIdx < activeItens.length) {
          const item = activeItens[childIdx];
          const grupo = grupos.find(g => g.numero === groupNum)!;
          matchedItemInfo = { item, grupo };
        }
      }
    }

    // C. Match sequencial por código
    if (!matchedItemInfo && itemCode && itemsByCodeQueue.has(itemCode)) {
      const queue = itemsByCodeQueue.get(itemCode)!;
      const candidate = queue.find(q => !matchedItemIds.has(q.item.id));
      if (candidate) {
        matchedItemInfo = candidate;
      }
    }

    // D. Match sequencial por descrição
    if (!matchedItemInfo && itemDesc && itemsByDescQueue.has(itemDesc)) {
      const queue = itemsByDescQueue.get(itemDesc)!;
      const candidate = queue.find(q => !matchedItemIds.has(q.item.id));
      if (candidate) {
        matchedItemInfo = candidate;
      }
    }

    if (matchedItemInfo) {
      const { item, grupo } = matchedItemInfo;
      matchedItemIds.add(item.id);

      const isMaoDeObra = grupo.id === 'g1' || grupo.id === 'g11' || 
        grupo.nome.toLowerCase().includes('mão de obra') ||
        grupo.nome.toLowerCase().includes('equipe técnica') ||
        (item.descricao || '').toLowerCase().includes('engenheiro') || 
        (item.descricao || '').toLowerCase().includes('técnico') || 
        (item.descricao || '').toLowerCase().includes('encarregado') || 
        (item.descricao || '').toLowerCase().includes('topografo');

      const q = (item.quantidadeTotal && item.quantidadeTotal > 0) ? item.quantidadeTotal : 1;
      const unitTotal = Math.round(((item.valorTotal || 0) / q) * 100) / 100;
      const matU = isMaoDeObra ? 0 : unitTotal;
      const moU = isMaoDeObra ? unitTotal : 0;
      const matTot = isMaoDeObra ? 0 : (item.valorTotal || 0);
      const moTot = isMaoDeObra ? (item.valorTotal || 0) : 0;

      const activeItens = grupoActiveItensMap.get(grupo.numero) || [];
      const childIdx = activeItens.findIndex(ai => ai.id === item.id);
      let updatedItemEap = eapItem.item_eap;
      if (capEap && childIdx >= 0) {
        updatedItemEap = `${capEap}.${grupo.numero}.${childIdx + 1}`;
      }

      hasChanges = true;
      return {
        ...eapItem,
        item_eap: updatedItemEap,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: q,
        valor_unitario_mat: matU,
        valor_unitario_mo: moU,
        valor_unitario: unitTotal,
        valor_unitario_com_bdi: unitTotal,
        total_mat: matTot,
        total_mo: moTot,
        total: item.valorTotal || 0,
        isSecao: false,
        is_secao: false
      };
    }

    return eapItem;
  });

  return hasChanges ? updatedItens : currentItens;
}

/**
 * Atualiza a configuração de custos indiretos quando o usuário altera uma linha de custos indiretos
 * diretamente na Planilha Orçamentária (ex: alterando quantidade, valor unitário, descrição ou unidade).
 * Salva no localStorage e retorna a configuração atualizada.
 */
export function syncEapChangeToIndiretoConfig(
  orcamentoId: string,
  modifiedEapItem: any,
  field: string,
  value: any,
  allEapItems: any[]
): IndiretoOrcamentoConfig | null {
  if (!orcamentoId || !modifiedEapItem) return null;

  let config = loadIndiretoConfig(orcamentoId);
  if (!config || !Array.isArray(config.grupos) || config.grupos.length === 0) return null;

  const itemIdStr = String(modifiedEapItem.id || '');
  const itemEap = (modifiedEapItem.item_eap || '').trim();

  // Encontra o capítulo raiz de indiretos
  const chapterItem = (allEapItems || []).find(item => {
    if (!item) return false;
    const idStr = String(item.id || '');
    const desc = String(item.descricao || '').toLowerCase();
    return idStr.startsWith('indireto-cap-') ||
      desc === 'administração local e canteiro de obras' ||
      desc.includes('administração local') ||
      desc.includes('canteiro de obras') ||
      desc.includes('custos indiretos');
  });

  const capEap = chapterItem ? (chapterItem.item_eap || '').trim() : '';
  const isUnderChapter = capEap !== '' && itemEap.startsWith(capEap + '.');
  const isIndiretoId = itemIdStr.startsWith('indireto-');

  if (!isUnderChapter && !isIndiretoId) {
    return null; // Não é um item de custos indiretos
  }

  let matchedGrupo: IndiretoGrupo | undefined;
  let matchedItem: IndiretoItem | undefined;

  // A. Match por ID no prefixo
  if (itemIdStr.startsWith('indireto-item-') || itemIdStr.startsWith('indireto-det-i-')) {
    const match = itemIdStr.match(/^(?:indireto-item-|indireto-det-i-)(.+?)-/);
    const iId = match ? match[1] : null;
    if (iId) {
      for (const g of config.grupos) {
        const found = (g.itens || []).find(it => it.id === iId);
        if (found) {
          matchedGrupo = g;
          matchedItem = found;
          break;
        }
      }
    }
  }

  // B. Match posicional pela hierarquia EAP (ex: cap = 3, item = 3.1.2 -> grupo 1, filho 1)
  if (!matchedItem && capEap !== '' && itemEap.startsWith(capEap + '.')) {
    const parts = itemEap.split('.').filter(Boolean);
    const capParts = capEap.split('.').filter(Boolean);
    if (parts.length === capParts.length + 2) {
      const groupNum = parseInt(parts[capParts.length], 10);
      const childIdx = parseInt(parts[capParts.length + 1], 10) - 1;
      matchedGrupo = config.grupos.find(g => g.numero === groupNum);
      if (matchedGrupo) {
        const activeItens = (matchedGrupo.itens || []).filter(it => it.ativo && it.destino !== 'bdi');
        if (childIdx >= 0 && childIdx < activeItens.length) {
          matchedItem = activeItens[childIdx];
        }
      }
    }
  }

  // C. Fallback por código ou descrição
  if (!matchedItem) {
    const code = String(modifiedEapItem.codigo || '').trim().toLowerCase();
    const desc = String(modifiedEapItem.descricao || '').trim().toLowerCase();
    for (const g of config.grupos) {
      const found = (g.itens || []).find(it => 
        (code && it.codigo && it.codigo.trim().toLowerCase() === code) ||
        (desc && it.descricao && it.descricao.trim().toLowerCase() === desc)
      );
      if (found) {
        matchedGrupo = g;
        matchedItem = found;
        break;
      }
    }
  }

  if (!matchedItem) return null;

  let modified = false;

  if (field === 'quantidade') {
    const newQty = Math.max(0, parseFloat(value) || 0);
    matchedItem.quantidadeTotal = newQty;
    const effectivePrazo = matchedItem.isCustoFixo ? 1 : (matchedItem.alocacaoMensal || 1);
    matchedItem.valorTotal = (effectivePrazo * matchedItem.quantidadeTotal * (matchedItem.valorUnitario || 0)) + (matchedItem.valorFixoEncargos || 0);
    modified = true;
  } else if (field === 'valor_unitario_mo' || field === 'valor_unitario_mat' || field === 'valor_unitario') {
    const newUnit = Math.max(0, parseFloat(value) || 0);
    const effectivePrazo = matchedItem.isCustoFixo ? 1 : (matchedItem.alocacaoMensal || 1);
    const qty = (matchedItem.quantidadeTotal && matchedItem.quantidadeTotal > 0) ? matchedItem.quantidadeTotal : 1;

    if (matchedItem.valorFixoEncargos && matchedItem.valorFixoEncargos > 0) {
      const newTotal = newUnit * qty;
      const variablePart = effectivePrazo * qty * (matchedItem.valorUnitario || 0);
      matchedItem.valorFixoEncargos = Math.max(0, newTotal - variablePart);
      matchedItem.valorTotal = newTotal;
    } else {
      matchedItem.valorUnitario = effectivePrazo > 0 ? (newUnit / effectivePrazo) : newUnit;
      matchedItem.valorTotal = effectivePrazo * qty * matchedItem.valorUnitario;
    }
    modified = true;
  } else if (field === 'descricao') {
    matchedItem.descricao = String(value).trim();
    modified = true;
  } else if (field === 'unidade') {
    matchedItem.unidade = String(value).trim();
    modified = true;
  }

  if (modified) {
    const updatedGrupos = config.grupos.map(g => {
      if (g.id !== (matchedGrupo?.id || matchedItem?.grupoId)) return g;
      return {
        ...g,
        itens: g.itens.map(it => it.id === matchedItem!.id ? { ...matchedItem! } : it)
      };
    });

    const newConfig: IndiretoOrcamentoConfig = {
      ...config,
      grupos: updatedGrupos,
      ultimaAtualizacao: new Date().toISOString()
    };

    saveIndiretoConfig(orcamentoId, newConfig);
    return newConfig;
  }

  return null;
}

