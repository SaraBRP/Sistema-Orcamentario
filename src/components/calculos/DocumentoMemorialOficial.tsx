import React, { useState, useEffect } from 'react';
import { 
  Calculator, Plus, Trash2, BookOpen, ArrowUp, ArrowDown, ArrowLeft, Indent, Outdent, Type, CheckCircle2, ChevronRight, ChevronLeft, ChevronDown, CornerDownRight, GripVertical, Unlink, Sparkles, Globe, XCircle, FileText, Printer, Edit2, Check, Target, Search
} from 'lucide-react';
import type { 
  ItemMemoriaOficial, 
  DadosComplementaresHeader, 
  DadoComplementarItem, 
  FormulaBibliotecaItem,
  ParametroLinhaItem
} from '../../types/calculos';
import { CATALOGO_CAMPOS_SISTEMA } from '../../types/calculos';
import { BibliotecaFormulasModal } from './BibliotecaFormulasModal';
import { getFormulasDisponiveis } from './GerenciadorFormulas';
import { ModalSelecaoBancoMemoria, type ItemBancoSelecionado } from './ModalSelecaoBancoMemoria';
import { TabelaVigasBaldrames, type VigaBaldrameItem, type VigasBaldramesHeaderGlobal } from './TabelaVigasBaldrames';
import { TabelaSapatas, type SapataItem, type SapatasHeaderGlobal } from './TabelaSapatas';
import { TabelaBlocos, type BlocoItem, type BlocosHeaderGlobal } from './TabelaBlocos';
import { TabelaTubuloes, type TubulaoItem, type TubuloesHeaderGlobal } from './TabelaTubuloes';
import { TabelaEstacas, type EstacaItem, type EstacasHeaderGlobal } from './TabelaEstacas';
import { TabelaPremoldados, type PremoldadoItem, type PremoldadosHeaderGlobal } from './TabelaPremoldados';
import { TabelaPisoConcreto, type PisoConcretoHeaderGlobal } from './TabelaPisoConcreto';
import { TabelaDrenagem, type DrenagemHeaderGlobal } from './TabelaDrenagem';
import { TabelaPitsReservatorios, type PitsReservatoriosHeaderGlobal } from './TabelaPitsReservatorios';
import { TabelaSuperestrutura, type SuperestruturaHeaderGlobal } from './TabelaSuperestrutura';
import { TabelaEsquadriasAcabamentos, type ComodoItem, type HeaderGlobalEsquadriasAcabamentos } from './TabelaEsquadriasAcabamentos';
import { CroquiSapata } from './CroquiSapata';
import { ItemBindingInfoEye } from './ItemBindingInfoEye';
import { CroquiVigaBaldrame } from './CroquiVigaBaldrame';
import { CroquiBloco } from './CroquiBloco';
import { CroquiTubulao } from './CroquiTubulao';
import { CroquiEstaca } from './CroquiEstaca';
import { supabase } from '../../lib/supabase';
import { getParametrosCadastrados } from '../../utils/parametrosStorage';

export const ESTADOS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

// Helper unificado de avaliação reativa de fórmulas personalizadas
export function evaluateCustomFormula(
  literalInput: string,
  localParams: Array<{ nome: string; valor: any; unidade?: string }>,
  globalParams: Array<{ parametro: string; valor: any; unidade?: string }>
): {
  formulaName: string;
  expressionLiteral: string;
  fullLiteral: string;
  substitutedNumeric: string;
  mathResult: number;
  resultUnit: string;
} {
  if (!literalInput || !literalInput.trim()) {
    return {
      formulaName: '',
      expressionLiteral: '',
      fullLiteral: '',
      substitutedNumeric: '',
      mathResult: 0,
      resultUnit: (localParams[0] as any)?.unidade || 'm²'
    };
  }

  const raw = literalInput.trim();
  let formulaName = '';
  let expr = raw;

  // 1. Separar NomeMedida = expressão (estilo DAX)
  if (raw.includes('=')) {
    const eqIndex = raw.indexOf('=');
    formulaName = raw.substring(0, eqIndex).trim() || 'Medida';
    expr = raw.substring(eqIndex + 1).trim();
  } else {
    formulaName = 'Medida';
    expr = raw;
  }

  // Normaliza string para comparação: remove acentos, lowercase, trim
  const norm = (s: string): string =>
    (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

  const parseVal = (v: any): number => {
    if (typeof v === 'number') return isNaN(v) ? 0 : v;
    if (!v) return 0;
    const cleaned = String(v).replace(/\s/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // 2. Preparar listas de parâmetros
  const localList = (localParams || []).map((lp: any, idx: number) => ({
    idx,
    nome: String(lp.nome || '').trim(),
    valor: parseVal(lp.valor ?? lp.value),
    unidade: String(lp.unidade || 'm²').trim(),
  }));

  const globalList = (globalParams || []).map((gp: any) => ({
    nome: String(gp.parametro || gp.nome || gp.descricao || '').trim(),
    valor: parseVal(gp.valor ?? gp.value),
    unidade: String(gp.unidade || 'm²').trim(),
  }));

  const fmt = (num: number, unit: string): string =>
    `${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${unit}`;

  // 3. Substituição das tags [Nome] na expressão
  const substitute = (str: string, returnNum: boolean): string => {
    return str.replace(/\[\s*([^\]]+?)\s*\]/gi, (match, inner) => {
      const innerNorm = norm(inner);

      // Passo A: match exato por nome com parâmetros locais (comparação normalizada)
      for (const lp of localList) {
        if (lp.nome && norm(lp.nome) === innerNorm) {
          return returnNum ? String(lp.valor) : fmt(lp.valor, lp.unidade);
        }
      }

      // Passo B: match posicional — "Parâmetro 1", "parametro1", "p1", etc.
      const posMatch = innerNorm.match(/^(?:par[a-z]*|p)\s*(\d+)$/);
      if (posMatch) {
        const idx = parseInt(posMatch[1], 10) - 1;
        if (idx >= 0 && idx < localList.length) {
          const lp = localList[idx];
          return returnNum ? String(lp.valor) : fmt(lp.valor, lp.unidade);
        }
      }

      // Passo C: match exato por nome com parâmetros globais
      for (const gp of globalList) {
        if (gp.nome && norm(gp.nome) === innerNorm) {
          return returnNum ? String(gp.valor) : fmt(gp.valor, gp.unidade);
        }
      }

      // Sem match: mantém a tag original
      return match;
    });
  };

  const substStr = substitute(expr, false);
  const mathStr = substitute(expr, true);

  // 4. Avaliação matemática da expressão numérica
  let mathResult = 0;
  try {
    const sanitized = mathStr.replace(/[^0-9.\-+*/()]/g, '');
    if (sanitized.trim()) {
      const calculated = new Function(`return ${sanitized}`)();
      if (typeof calculated === 'number' && !isNaN(calculated) && isFinite(calculated)) {
        mathResult = calculated;
      }
    }
  } catch {
    // expressão ainda incompleta
  }

  const resultUnit = localList[0]?.unidade || globalList[0]?.unidade || 'm²';
  const prefixStr = formulaName ? `${formulaName} = ` : '';
  const mathResultFormatted = mathResult.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const substitutedNumeric = `${prefixStr}${substStr} = ${mathResultFormatted} ${resultUnit}`;

  return {
    formulaName,
    expressionLiteral: expr,
    fullLiteral: `${prefixStr}${expr}`,
    substitutedNumeric,
    mathResult,
    resultUnit
  };
}


// Calcula a soma automática dos valores e parâmetros de todas as filhas de uma linha mãe
export function calcularTotaisComposicaoMae(index: number, list: ItemMemoriaOficial[]): {
  qtdTotal: number;
  parametrosAgregados: ParametroLinhaItem[];
} {
  const parent = list[index];
  if (!parent || !parent.item_eap) return { qtdTotal: 0, parametrosAgregados: [] };

  const parentEap = (parent.item_eap || '').trim();
  const parentLevel = parent.level !== undefined ? parent.level : (parent.isSecao ? 0 : 1);
  const prefix = parentEap + '.';

  let qtdTotal = 0;
  const paramMap = new Map<string, { label: string; valor: number; unidade: string; categoria: string }>();

  for (let i = index + 1; i < list.length; i++) {
    const candidate = list[i];
    const candidateLevel = candidate.level !== undefined ? candidate.level : (candidate.isSecao ? 0 : 1);
    if (candidateLevel <= parentLevel) break;

    const candidateEap = (candidate.item_eap || '').trim();
    if (candidateEap.startsWith(prefix)) {
      let isLeaf = true;
      for (let j = i + 1; j < list.length; j++) {
        const nextItem = list[j];
        if (!nextItem) break;
        const nextLevel = nextItem.level !== undefined ? nextItem.level : (nextItem.isSecao ? 0 : 1);
        if (nextLevel <= candidateLevel) break;
        if ((nextItem.item_eap || '').trim().startsWith(candidateEap + '.')) {
          isLeaf = false;
          break;
        }
      }

      if (isLeaf) {
        qtdTotal += (candidate.quantidade || 0);

        if (candidate.parametrosLocais && candidate.parametrosLocais.length > 0) {
          candidate.parametrosLocais.forEach(p => {
            const key = p.chave || p.label;
            const valNum = typeof p.valor === 'number' ? p.valor : parseFloat(String(p.valor)) || 0;
            if (paramMap.has(key)) {
              const existing = paramMap.get(key)!;
              existing.valor += valNum;
            } else {
              paramMap.set(key, {
                label: p.label,
                valor: valNum,
                unidade: p.unidade || '',
                categoria: p.categoria || 'Geral'
              });
            }
          });
        }
      }
    }
  }

  const parametrosAgregados: ParametroLinhaItem[] = Array.from(paramMap.entries()).map(([key, item], idx) => ({
    id: `param-agg-${index}-${idx}`,
    chave: key,
    label: item.label,
    valor: Math.round(item.valor * 100) / 100,
    unidade: item.unidade,
    categoria: item.categoria
  }));

  return {
    qtdTotal: Math.round(qtdTotal * 100) / 100,
    parametrosAgregados
  };
}

export function recalcularEAPsMemoria(list: ItemMemoriaOficial[]): ItemMemoriaOficial[] {
  const counters: number[] = [];
  let prevLevel = 0;

  return list.map((item, idx) => {
    const isExplicitChild = Boolean(
      item.isChildInsumoOfComposition ||
      (item as any).composicao_id ||
      (item as any).parentCompositionId
    );

    const eapClean = (item.item_eap || '').replace(/\.+/g, '.').replace(/^\.|\.$/g, '').trim();
    const eapParts = eapClean.split('.').filter(Boolean);

    let isSecaoClean = false;
    if (isExplicitChild) {
      isSecaoClean = false;
    } else if (item.descricao && (item.descricao.toUpperCase().trim() === 'SAPATAS' || item.descricao.toUpperCase().trim() === 'ESTACAS')) {
      isSecaoClean = true;
    } else if (item.isSecao === false || (item as any).is_secao === false) {
      isSecaoClean = false;
    } else if (item.isSecao === true || (item as any).is_secao === true || Boolean((item as any).isTextLine)) {
      isSecaoClean = true;
    } else if (!(item as any).codigo && !(item as any).banco_fonte && (idx === 0 || eapParts.length <= 1 || eapClean.endsWith('.0'))) {
      isSecaoClean = true;
    } else {
      isSecaoClean = false;
    }
    let rawLevel = item.level !== undefined ? item.level : (isSecaoClean ? 0 : 1);
    if (idx === 0) {
      rawLevel = 0;
    }

    let level = rawLevel;
    if (idx > 0 && rawLevel > prevLevel + 1) {
      level = prevLevel + 1;
    }

    prevLevel = level;

    // Corta contadores mais profundos que o nível atual
    counters.length = level + 1;

    // Inicializa posições não definidas com 0
    for (let i = 0; i <= level; i++) {
      if (counters[i] === undefined || counters[i] === null) {
        counters[i] = 0;
      }
    }

    // Incrementa a posição do nível atual
    counters[level] += 1;

    let eap = '';
    if (level === 0) {
      eap = `${counters[0]}`;
    } else {
      eap = counters.slice(0, level + 1).join('.');
    }

    eap = eap.replace(/\.+/g, '.').replace(/^\.|\.$/g, '');

    return {
      ...item,
      isSecao: isSecaoClean,
      level,
      item_eap: eap
    };
  });
}

// Conta o número de itens filhos diretos/indiretos de um item pai (incluindo linhas de texto/seção)
export function contarItensFilhos(index: number, list: ItemMemoriaOficial[]): number {
  const parent = list[index];
  if (!parent || !parent.item_eap) return 0;
  const parentEap = (parent.item_eap || '').trim();
  if (!parentEap) return 0;

  const parentLevel = parent.level !== undefined 
    ? parent.level 
    : (parent.isSecao ? 0 : Math.max(1, parentEap.split('.').length - 1));

  const baseSectionNum = parentEap.split('.')[0];
  const isLevelZeroSecao = parent.isSecao || parentLevel === 0 || parentEap.endsWith('.0');

  let count = 0;

  for (let i = index + 1; i < list.length; i++) {
    const child = list[i];
    const childEap = (child?.item_eap || '').trim();
    if (!childEap) continue;

    const childLevel = child.level !== undefined 
      ? child.level 
      : (child.isSecao ? 0 : Math.max(1, childEap.split('.').length - 1));

    if (isLevelZeroSecao) {
      if ((child.isSecao || childLevel === 0) && i > index) {
        break; // Interrompe ao encontrar a próxima seção nível 0 (ex: 2.0 SAPATAS)
      }
      if (childEap.startsWith(baseSectionNum + '.')) {
        count++;
      } else {
        break;
      }
    } else {
      if (childEap.startsWith(parentEap + '.')) {
        count++;
      } else if (childLevel > parentLevel) {
        count++;
      } else {
        break;
      }
    }
  }
  return count;
}

// Verifica se um item de seção/texto possui sub-linhas de texto/seção abaixo dele
export function temSubSecaoTexto(index: number, list: ItemMemoriaOficial[]): boolean {
  const parent = list[index];
  if (!parent || !parent.item_eap || !parent.isSecao) return false;

  const parentEap = (parent.item_eap || '').trim();
  if (!parentEap) return false;
  const prefix = parentEap + '.';

  for (let i = index + 1; i < list.length; i++) {
    const candidate = list[i];
    const candidateEap = (candidate?.item_eap || '').trim();
    if (!candidateEap) continue;

    if (candidateEap.startsWith(prefix) && candidate.isSecao) {
      return true;
    } else if (!candidateEap.startsWith(prefix) && candidateEap.split('.').length <= parentEap.split('.').length) {
      break;
    }
  }
  return false;
}

// Verifica se uma linha deve ficar oculta por causa de algum ancestral colapsado
export function isLinhaOculta(index: number, list: ItemMemoriaOficial[]): boolean {
  const currentItem = list[index];
  if (!currentItem) return false;
  const currentEap = (currentItem.item_eap || '').trim();
  if (!currentEap) return false;

  const currentLevel = currentItem.level !== undefined 
    ? currentItem.level 
    : (currentItem.isSecao ? 0 : Math.max(1, currentEap.split('.').length - 1));

  for (let i = index - 1; i >= 0; i--) {
    const parentCandidate = list[i];
    if (!parentCandidate) continue;
    const parentEap = (parentCandidate.item_eap || '').trim();
    if (!parentEap) continue;

    const parentLevel = parentCandidate.level !== undefined 
      ? parentCandidate.level 
      : (parentCandidate.isSecao ? 0 : Math.max(1, parentEap.split('.').length - 1));
    const isLevelZeroSecao = parentCandidate.isSecao || parentLevel === 0 || parentEap.endsWith('.0');
    const baseSectionNum = parentEap.split('.')[0];

    // Se encontrou uma seção de nível 0 anterior que não é pai direto da linha atual, interrompe a busca de seções
    if (isLevelZeroSecao && !currentEap.startsWith(baseSectionNum + '.') && currentLevel === 0) {
      break;
    }

    if (parentCandidate.collapsed) {
      if (isLevelZeroSecao) {
        if (currentEap.startsWith(baseSectionNum + '.')) {
          return true;
        }
      } else {
        const isChildOfCandidate = currentEap.startsWith(parentEap + '.') || 
                                   (currentItem.isChildInsumoOfComposition && currentItem.parentCompositionId === parentCandidate.id);
        if (isChildOfCandidate) {
          return true;
        }
      }
    }
  }
  return false;
}

// Conta o número de filhos visíveis de um item (para calcular o rowSpan da célula de Memória de Cálculo)
export function contarFilhosVisiveisMemoria(index: number, list: ItemMemoriaOficial[]): number {
  const parent = list[index];
  if (!parent || !parent.item_eap || parent.isSecao || parent.collapsed) return 0;
  const parentEap = parent.item_eap.trim() + '.';

  let count = 0;
  for (let i = index + 1; i < list.length; i++) {
    if (isLinhaOculta(i, list)) break;

    const child = list[i];
    const childEap = (child?.item_eap || '').trim();

    if (childEap.startsWith(parentEap)) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

// Verifica se um item é uma Composição ou Sub-Composição que possui subitens/filhos
export function isComposicaoOuSub(index: number, list: ItemMemoriaOficial[]): boolean {
  const item = list[index];
  if (!item || !item.item_eap || item.isSecao) return false;
  return contarItensFilhos(index, list) > 0;
}

// Encontra o índice da linha de seção/texto pai direta de um item
export function getDirectParentSectionIndex(index: number, list: ItemMemoriaOficial[]): number {
  const currentItem = list[index];
  if (!currentItem || !currentItem.item_eap) return -1;
  const currentEap = (currentItem.item_eap || '').trim();

  for (let i = index - 1; i >= 0; i--) {
    const candidate = list[i];
    if (candidate.isSecao) {
      const candidateEap = (candidate.item_eap || '').trim() + '.';
      if (currentEap.startsWith(candidateEap) || candidate.level === 0) {
        return i;
      }
    }
  }
  return -1;
}

// Encontra o índice da composição/subcomposição mãe direta de uma linha filha
export function getDirectParentCompositionIndex(index: number, list: ItemMemoriaOficial[]): number {
  const currentItem = list[index];
  if (!currentItem || !currentItem.item_eap || currentItem.isSecao) return -1;
  const currentEap = (currentItem.item_eap || '').trim();

  for (let i = index - 1; i >= 0; i--) {
    const candidate = list[i];
    if (isLinhaOculta(i, list)) continue;

    const candidateEap = (candidate.item_eap || '').trim() + '.';
    if (currentEap.startsWith(candidateEap) && isComposicaoOuSub(i, list)) {
      return i;
    }
  }
  return -1;
}

// Verifica se o item é o início de um bloco contíguo de filhos do mesmo pai
export function isInicioBlocoFilhos(index: number, list: ItemMemoriaOficial[]): boolean {
  const parentIdx = getDirectParentCompositionIndex(index, list);
  if (parentIdx < 0) return false;
  if (isComposicaoOuSub(index, list)) return false;

  for (let i = index - 1; i > parentIdx; i--) {
    if (!isLinhaOculta(i, list)) {
      const prevParentIdx = getDirectParentCompositionIndex(i, list);
      if (prevParentIdx === parentIdx) {
        return false;
      }
      break;
    }
  }
  return true;
}

// Conta quantas linhas contíguas filhas visíveis pertencem ao mesmo pai a partir de index
export function contarBlocoFilhosContiguos(index: number, list: ItemMemoriaOficial[]): number {
  const parentIdx = getDirectParentCompositionIndex(index, list);
  if (parentIdx < 0) return 0;

  let count = 0;
  for (let i = index; i < list.length; i++) {
    if (isLinhaOculta(i, list)) continue;
    if (isComposicaoOuSub(i, list)) break;

    const currentParent = getDirectParentCompositionIndex(i, list);
    if (currentParent === parentIdx) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

// Verifica se a célula de Memória de Cálculo da linha atual está coberta por um rowSpan da composição mãe
export function isCobertoPorRowSpanMemoria(index: number, list: ItemMemoriaOficial[]): boolean {
  const currentItem = list[index];
  if (!currentItem || !currentItem.item_eap || currentItem.isSecao) return false;
  if (isLinhaOculta(index, list)) return false;

  const parentIdx = getDirectParentCompositionIndex(index, list);
  if (parentIdx < 0) return false;
  if (isComposicaoOuSub(index, list)) return false;

  return !isInicioBlocoFilhos(index, list);
}

interface DocumentoMemorialOficialProps {
  header: DadosComplementaresHeader;
  onChangeHeader: (h: DadosComplementaresHeader) => void;
  itens: ItemMemoriaOficial[];
  onChangeItens: (itens: ItemMemoriaOficial[]) => void;
  readonly?: boolean;
  onVoltar?: () => void;
}

export const DocumentoMemorialOficial: React.FC<DocumentoMemorialOficialProps> = ({
  header,
  onChangeHeader,
  itens,
  onChangeItens,
  readonly = false,
  onVoltar
}) => {
  const [editingItemModal, setEditingItemModal] = useState<ItemMemoriaOficial | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [targetBindingItemId, setTargetBindingItemId] = useState<string | null>(null);
  const [showBibliotecaModal, setShowBibliotecaModal] = useState(false);
  const [showBancoModal, setShowBancoModal] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set());
  const [undoStack, setUndoStack] = useState<ItemMemoriaOficial[][]>([]);
  const [draftDesc, setDraftDesc] = useState('');

  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleAddDraftSecao = (descText: string) => {
    if (!descText.trim()) return;
    pushUndoSnapshot(itens);
    const lastEap = itens.length > 0 ? (itens[itens.length - 1]?.item_eap || '0') : '0';
    const nextNum = Math.max(1, Math.floor(parseFloat(lastEap)) + 1);

    const novoItem: ItemMemoriaOficial = {
      id: generateUUID(),
      item_eap: `${nextNum}.0`,
      descricao: descText.trim().toUpperCase(),
      unidade: '',
      quantidade: 0,
      isSecao: true,
      level: 0,
      collapsed: false,
      parametrosLocais: [],
      equacaoLiteral: '',
      substituicaoNumerica: '',
      observacaoMemoria: ''
    };

    const copia = [...itens, novoItem];
    const novaLista = recalcularEAPsMemoria(copia);
    onChangeItens(novaLista);
    setSelectedRowIndex(copia.length - 1);
  };

  // Estado para modal de parâmetros e fórmulas por linha de seção
  const [paramEditorIndex, setParamEditorIndex] = useState<number | null>(null);
  const [paramModalTab, setParamModalTab] = useState<'parametros' | 'formulas'>('parametros');
  const [newParamData, setNewParamData] = useState<{ label: string; chave: string; valor: string; unidade: string; categoria?: string }>({ label: '', chave: '', valor: '', unidade: 'm²', categoria: 'Geral' });
  const [activeQuantityLinkIndex, setActiveQuantityLinkIndex] = useState<number | null>(null);
  const [memorialDetalhadoIndex, setMemorialDetalhadoIndex] = useState<number | null>(null);
  const [mostrarMemorialGlobal, setMostrarMemorialGlobal] = useState(false);

  // Insumos filhos da composição atual sendo editada no modal
  const childItemsOfComposition = React.useMemo(() => {
    if (!editingItemModal || !editingItemModal.item_eap) return [];
    const parentEap = editingItemModal.item_eap.trim();
    if (!parentEap) return [];
    const prefix = parentEap + '.';
    return itens.filter(i => (i.item_eap || '').trim().startsWith(prefix));
  }, [editingItemModal, itens]);

  // Lista dinâmica de fórmulas (padrão + customizadas do cadastro)
  const formulasDisponiveis = getFormulasDisponiveis();
  const [selectedFormula, setSelectedFormula] = useState<FormulaBibliotecaItem | null>(null);
  const [paramInputs, setParamInputs] = useState<Record<string, number>>({});
  const [customTextLiteral, setCustomTextLiteral] = useState('');
  const [customTextSubst, setCustomTextSubst] = useState('');
  const [customQtd, setCustomQtd] = useState<number>(0);
  const [customVarValues] = useState<Record<string, string>>({});
  const [_tempFormulas, setTempFormulas] = useState<Array<{ id: string; observacao?: string; equacaoLiteral?: string; substituicaoNumerica?: string; resultado?: number }>>([]);
  const [modoCalculoModal, setModoCalculoModal] = useState<'' | 'formula' | 'tabela_vigas' | 'tabela_sapatas' | 'tabela_blocos' | 'tabela_tubuloes' | 'tabela_estacas' | 'tabela_premoldados' | 'tabela_piso_concreto' | 'tabela_drenagem' | 'tabela_pits' | 'tabela_superestrutura' | 'tabela_esquadrias'>('');
  const [selectedActiveCalcId, setSelectedActiveCalcId] = useState<string | null>(null);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [customParamsList, setCustomParamsList] = useState<Array<{
    id: string;
    nome: string;
    parametroBaseId?: string;
    parametroNome: string;
    sigla: string;
    valor: number | string;
    unidade: string;
  }>>([]);

  const [novoGlobalNome, setNovoGlobalNome] = useState('');
  const [novoGlobalTipo, setNovoGlobalTipo] = useState(CATALOGO_CAMPOS_SISTEMA[0]?.label || '');
  const [novoGlobalValor, setNovoGlobalValor] = useState<number | ''>('');
  const [novoGlobalUnidade, setNovoGlobalUnidade] = useState(CATALOGO_CAMPOS_SISTEMA[0]?.unidade || 'm²');
  const [novoGlobalItemId, setNovoGlobalItemId] = useState('');
  const [editingGlobalIndex, setEditingGlobalIndex] = useState<number | null>(null);
  const [selectedGlobalParamIndex, setSelectedGlobalParamIndex] = useState<number>(0);

  const [savedCustomFormulas, setSavedCustomFormulas] = useState<Array<{
    id: string;
    equacaoLiteral: string;
    substituicaoNumerica: string;
    resultado: number;
    unidade: string;
  }>>([]);
  const [selectedCustomFormulaId, setSelectedCustomFormulaId] = useState<string | null>(null);
  const [selectedCustomParamId, setSelectedCustomParamId] = useState<string | null>(null);

  const selectedFormulaVar = React.useMemo(() => {
    // 1. Se houver um parâmetro diretamente selecionado na tabela de Parâmetros
    if (selectedCustomParamId) {
      const p = customParamsList.find(item => item.id === selectedCustomParamId);
      if (p) {
        const valNum = typeof p.valor === 'number' ? p.valor : parseFloat(String(p.valor || '0').replace(',', '.')) || 0;
        return {
          id: p.id,
          nome: p.nome || 'Parâmetro',
          resultado: valNum,
          resultadoFormatted: valNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          unidade: p.unidade || 'un',
          equacaoLiteral: `Parâmetro: [${p.nome}]`,
          substituicaoNumerica: `${p.nome} = ${valNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${p.unidade || ''}`.trim(),
          kind: 'parametro' as const
        };
      }
    }

    // 2. Se houver fórmulas calculadas salvas
    if (savedCustomFormulas.length > 0) {
      const found = savedCustomFormulas.find(s => s.id === selectedCustomFormulaId);
      const target = found || savedCustomFormulas[0];
      const idx = savedCustomFormulas.indexOf(target);
      
      let nome = `Fórmula #${idx + 1}`;
      if (target.equacaoLiteral && target.equacaoLiteral.includes('=')) {
        const prefix = target.equacaoLiteral.split('=')[0].trim();
        if (prefix) nome = prefix;
      }

      return {
        ...target,
        nome,
        resultadoFormatted: (target.resultado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        kind: 'formula' as const
      };
    }

    // 3. Fallback: Se não houver fórmulas salvas, seleciona por padrão o primeiro parâmetro se existir
    if (customParamsList.length > 0) {
      const p = customParamsList[0];
      const valNum = typeof p.valor === 'number' ? p.valor : parseFloat(String(p.valor || '0').replace(',', '.')) || 0;
      return {
        id: p.id,
        nome: p.nome || 'Parâmetro',
        resultado: valNum,
        resultadoFormatted: valNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        unidade: p.unidade || 'un',
        equacaoLiteral: `Parâmetro: [${p.nome}]`,
        substituicaoNumerica: `${p.nome} = ${valNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${p.unidade || ''}`.trim(),
        kind: 'parametro' as const
      };
    }

    return null;
  }, [savedCustomFormulas, selectedCustomFormulaId, customParamsList, selectedCustomParamId]);

  const [customParamsErrors, setCustomParamsErrors] = useState<Record<string, string>>({});

  const customParamsListRef = React.useRef(customParamsList);
  React.useEffect(() => { customParamsListRef.current = customParamsList; }, [customParamsList]);
  const [showParamPopover, setShowParamPopover] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);


  // Cálculo VIVO da substituição — computado diretamente no render sem intermediário de estado
  // Isso evita qualquer bug de closure obsoleta ou race condition no React
  const liveCalc = React.useMemo(() => {
    const literal = customTextLiteral || '';
    if (!literal.trim()) return { text: '', result: 0, unit: 'm²' };

    // Normalizar string para comparação (remove acentos, lowercase, trim)
    const norm = (s: string) =>
      (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

    const parseV = (v: any): number => {
      if (typeof v === 'number') return isNaN(v) ? 0 : v;
      if (!v) return 0;
      const c = String(v).replace(/\s/g, '').replace(',', '.');
      const n = parseFloat(c);
      return isNaN(n) ? 0 : n;
    };

    const fmt2 = (num: number, unit: string) =>
      `${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${unit}`.trim();

    // Parâmetros locais (customParamsList)
    const localList = customParamsList.map((lp, idx) => ({
      idx,
      nome: String(lp.nome || '').trim(),
      valor: parseV(lp.valor),
      unidade: String(lp.unidade || 'm²').trim(),
    }));

    // Parâmetros globais (header.dadosComplementares)
    const rawGlobals = header.dadosComplementares || (header as any)?.dados_complementares || [];
    const globalList = (rawGlobals as any[]).map((gp: any) => ({
      nome: String(gp.parametro || gp.nome || gp.descricao || '').trim(),
      valor: parseV(gp.valor ?? gp.value),
      unidade: String(gp.unidade || '').trim(),
    }));

    // Separar nome da medida e expressão (estilo DAX)
    let formulaName = '';
    let expr = literal.trim();
    if (expr.includes('=')) {
      const eq = expr.indexOf('=');
      formulaName = expr.substring(0, eq).trim() || '';
      expr = expr.substring(eq + 1).trim();
    }

    // Substituir tags [Nome] — local primeiro, depois posicional, depois global
    const subst = (str: string, numOnly: boolean): string =>
      str.replace(/\[\s*([^\]]+?)\s*\]/gi, (match, inner) => {
        const innerNorm = norm(inner);

        // 1. Match exato com parâmetro local (por nome normalizado)
        for (const lp of localList) {
          if (lp.nome && norm(lp.nome) === innerNorm) {
            return numOnly ? String(lp.valor) : fmt2(lp.valor, lp.unidade);
          }
        }

        // 2. Match posicional: [Parâmetro 1], [p1], [param 2], etc.
        const posMatch = innerNorm.match(/^(?:par[a-z]*|param[a-z]*|p)\s*(\d+)$/);
        if (posMatch) {
          const idx = parseInt(posMatch[1], 10) - 1;
          if (idx >= 0 && idx < localList.length) {
            const lp = localList[idx];
            return numOnly ? String(lp.valor) : fmt2(lp.valor, lp.unidade);
          }
        }

        // 3. Match exato com parâmetro global (por nome normalizado)
        for (const gp of globalList) {
          if (gp.nome && norm(gp.nome) === innerNorm) {
            return numOnly ? String(gp.valor) : fmt2(gp.valor, gp.unidade);
          }
        }

        return match; // sem match, mantém tag
      });

    const substStr = subst(expr, false);
    const mathStr = subst(expr, true);

    let mathResult = 0;
    try {
      const sanitized = mathStr.replace(/[^0-9.\-+*/()]/g, '');
      if (sanitized.trim()) {
        const calc = new Function(`return ${sanitized}`)();
        if (typeof calc === 'number' && !isNaN(calc) && isFinite(calc)) mathResult = calc;
      }
    } catch { /* fórmula incompleta */ }

    const unit = localList[0]?.unidade || globalList[0]?.unidade || 'm²';
    const prefix = formulaName ? `${formulaName} = ` : '';
    const mathFmt = mathResult.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return {
      text: `${prefix}${substStr} = ${mathFmt} ${unit}`.trim(),
      result: mathResult,
      unit,
    };
  }, [customTextLiteral, customParamsList, header.dadosComplementares, (header as any)?.dados_complementares]);



  // Função para calcular manualmente a substituição e resultado da fórmula ao clicar no botão "Calcular" ou pressionar Enter
  const handleExecuteCalculateFormula = () => {
    if (!customTextLiteral || !customTextLiteral.trim()) {
      setCustomTextSubst('');
      setCustomQtd(0);
      return;
    }

    // Use ref to always get the freshest params (avoids stale closure)
    const latestParams = customParamsListRef.current;
    const evalResult = evaluateCustomFormula(
      customTextLiteral,
      latestParams,
      header.dadosComplementares || (header as any)?.dados_complementares || []
    );

    console.log('[Calcular] latestParams:', latestParams.map(p => ({ nome: p.nome, valor: p.valor })));
    console.log('[Calcular] substitutedNumeric:', evalResult.substitutedNumeric);

    setCustomTextSubst(evalResult.substitutedNumeric);
    setCustomQtd(evalResult.mathResult);
    setShowParamPopover(false);
  };


  // Lista agregada de todos os cálculos aplicados a esta composição e seus insumos filhos
  const calculosAplicadosMemoria = React.useMemo(() => {
    if (!editingItemModal) return [];
    const list: Array<{
      id: string;
      targetItemId: string;
      targetItemDesc: string;
      observacao: string;
      equacaoLiteral: string;
      substituicaoNumerica: string;
      resultado: number;
      modoCalculo?: string;
    }> = [];

    const itemIdsSet = new Set<string>();

    const checkAndAddItemCalculations = (itemObj: ItemMemoriaOficial) => {
      const liveItem = itens.find(i => i.id === itemObj.id) || itemObj;
      if (itemIdsSet.has(liveItem.id)) return;
      itemIdsSet.add(liveItem.id);

      if (liveItem.formulasLista && liveItem.formulasLista.length > 0) {
        liveItem.formulasLista.forEach((f) => {
          list.push({
            id: f.id,
            targetItemId: liveItem.id,
            targetItemDesc: liveItem.descricao,
            observacao: f.observacao || 'Cálculo',
            equacaoLiteral: f.equacaoLiteral || '',
            substituicaoNumerica: f.substituicaoNumerica || '',
            resultado: f.resultado || 0,
            modoCalculo: (f as any).modoCalculo
          });
        });
      } else if (liveItem.equacaoLiteral || liveItem.observacaoMemoria) {
        list.push({
          id: `item-${liveItem.id}`,
          targetItemId: liveItem.id,
          targetItemDesc: liveItem.descricao,
          observacao: liveItem.observacaoMemoria || 'Cálculo',
          equacaoLiteral: liveItem.equacaoLiteral || '',
          substituicaoNumerica: liveItem.substituicaoNumerica || '',
          resultado: liveItem.quantidade || 0
        });
      }
    };

    // 1. Item Principal da Composição (apenas o item principal gera abas no menu lateral de cálculos)
    checkAndAddItemCalculations(editingItemModal);

    return list;
  }, [editingItemModal, itens]);

  const inferModoFromObs = (obs: string) => {
    const o = obs.toLowerCase();
    if (o.includes('estaca')) return 'tabela_estacas';
    if (o.includes('sapata')) return 'tabela_sapatas';
    if (o.includes('tubul')) return 'tabela_tubuloes';
    if (o.includes('bloco')) return 'tabela_blocos';
    if (o.includes('viga')) return 'tabela_vigas';
    if (o.includes('pré-moldad') || o.includes('premoldad')) return 'tabela_premoldados';
    if (o.includes('piso') || o.includes('industrial')) return 'tabela_piso_concreto';
    if (o.includes('drenagem') || o.includes('pluvial') || o.includes('canal')) return 'tabela_drenagem';
    if (o.includes('pit') || o.includes('reservat')) return 'tabela_pits';
    if (o.includes('superestrutur') || o.includes('laje')) return 'tabela_superestrutura';
    if (o.includes('esquadria') || o.includes('acabamento')) return 'tabela_esquadrias';
    return 'formula';
  };

  const handleRemoveAppliedCalc = (targetItemId: string, calcId: string) => {
    const targetIndex = itens.findIndex(i => i.id === targetItemId);
    if (targetIndex === -1) return;

    const copia = [...itens];
    const updatedTarget = { ...copia[targetIndex] };

    if (updatedTarget.formulasLista && updatedTarget.formulasLista.length > 0) {
      updatedTarget.formulasLista = updatedTarget.formulasLista.filter(f => f.id !== calcId);
      if (updatedTarget.formulasLista.length > 0) {
        const lastStep = updatedTarget.formulasLista[updatedTarget.formulasLista.length - 1];
        updatedTarget.quantidade = lastStep.resultado || 0;
        updatedTarget.equacaoLiteral = lastStep.equacaoLiteral;
        updatedTarget.substituicaoNumerica = lastStep.substituicaoNumerica;
        updatedTarget.observacaoMemoria = lastStep.observacao;
      } else {
        updatedTarget.equacaoLiteral = '';
        updatedTarget.substituicaoNumerica = '';
        updatedTarget.observacaoMemoria = '';
      }
    } else {
      updatedTarget.equacaoLiteral = '';
      updatedTarget.substituicaoNumerica = '';
      updatedTarget.observacaoMemoria = '';
    }

    copia[targetIndex] = updatedTarget;
    onChangeItens(copia);
    if (selectedActiveCalcId === calcId) {
      setSelectedActiveCalcId(null);
    }
  };

  const handleApplyMetric = (
    nomeArea: string,
    metricKey: string,
    valorTotal: number,
    equacaoLiteral: string,
    substituicaoText: string,
    targetItemId?: string
  ) => {
    if (!editingItemModal) return;

    const copia = [...itens];
    const mainIndex = copia.findIndex(i => i.id === editingItemModal.id);
    if (mainIndex === -1) return;

    const isChildBinding = Boolean(targetItemId && targetItemId !== editingItemModal.id);

    // 1. Se o vínculo for para um insumo filho da composição, atualiza a quantidade do insumo filho no memorial
    if (isChildBinding) {
      const childIndex = copia.findIndex(i => i.id === targetItemId);
      if (childIndex !== -1) {
        copia[childIndex] = {
          ...copia[childIndex],
          quantidade: valorTotal,
          equacaoLiteral: equacaoLiteral,
          substituicaoNumerica: substituicaoText,
          observacaoMemoria: `${nomeArea} (${metricKey})`
        };
      }
    }

    // 2. Atualizar o item principal da composição (editingItemModal) mantendo 1 única aba por tela de cálculo
    const updatedMain = { ...copia[mainIndex] };
    const existingFormulas = updatedMain.formulasLista ? [...updatedMain.formulasLista] : [];

    const stepObs = (modoCalculoModal === '' || modoCalculoModal === 'formula') ? 'Personalizar' : nomeArea;

    const existingStepIdx = existingFormulas.findIndex(f => 
      (editingTabId && f.id === editingTabId) ||
      f.observacao === stepObs ||
      (f.modoCalculo && f.modoCalculo === modoCalculoModal)
    );

    const stepId = existingStepIdx >= 0
      ? existingFormulas[existingStepIdx].id
      : `f-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const activeStep = {
      id: stepId,
      observacao: stepObs,
      equacaoLiteral: equacaoLiteral,
      substituicaoNumerica: substituicaoText,
      resultado: isChildBinding ? (existingStepIdx >= 0 ? existingFormulas[existingStepIdx].resultado : 0) : valorTotal,
      modoCalculo: modoCalculoModal
    };

    if (existingStepIdx >= 0) {
      existingFormulas[existingStepIdx] = activeStep;
    } else {
      existingFormulas.push(activeStep);
    }

    updatedMain.formulasLista = existingFormulas;

    // Se o vínculo foi no próprio item principal, atualiza a quantidade total do item principal
    if (!isChildBinding) {
      const totalQtd = updatedMain.formulasLista.reduce((acc, f) => acc + (typeof f.resultado === 'number' ? f.resultado : 0), 0);
      updatedMain.quantidade = totalQtd > 0 ? totalQtd : valorTotal;
      updatedMain.equacaoLiteral = equacaoLiteral;
      updatedMain.substituicaoNumerica = substituicaoText;
      updatedMain.observacaoMemoria = Array.from(new Set(updatedMain.formulasLista.map(f => f.observacao).filter(Boolean))).join(' + ');
    }

    copia[mainIndex] = updatedMain;
    onChangeItens(copia);
    setEditingItemModal(updatedMain);
    setSelectedActiveCalcId(activeStep.id);
    setEditingTabId(activeStep.id);
    // Permanece na tela de cálculo atual para permitir múltiplas vinculações sem fechar a tela
  };
  const [comodosListModal, setComodosListModal] = useState<ComodoItem[]>([]);
  const [esquadriasHeaderModal, setEsquadriasHeaderModal] = useState<HeaderGlobalEsquadriasAcabamentos>({
    aplicarRegraTCPO: false,
    alturaPadraoImpermeabilizacaoM: 0.60
  });
  const [premoldadosListModal, setPremoldadosListModal] = useState<PremoldadoItem[]>([]);
  const [premoldadosHeaderModal, setPremoldadosHeaderModal] = useState<PremoldadosHeaderGlobal>({
    consumoPregosKgM2: 0.20,
    perdaMadeiraPerc: 20,
    taxaMontagemPecasDia: 10,
    carpinteiroHhM2: 2,
    serventeFormaHhM2: 1,
    pedreiroConcHhM3: 1,
    serventeConcHhM3: 3
  });
  const [pisoConcretoHeaderModal, setPisoConcretoHeaderModal] = useState<PisoConcretoHeaderGlobal>({
    fctMk: 4.2,
    espessuraM: 0.16,
    modoArmacao: 'TELA',
    telaSuperior: 'Q246',
    qtdTelaSuperior: 1,
    telaInferior: 'Q138',
    qtdTelaInferior: 1,
    diametroCaranguejoMm: 8,
    comprimentoCaranguejoM: 1.0,
    qtdCaranguejoM2: 1,
    consumoFibraKgM3: 20,
    reforcoCa50Kg: 0,
    modulacaoLarguraM: 12.5,
    modulacaoComprimentoM: 10.0,
    percentualLabiopolimerico: 0,
    percentualPoliuretano: 0.8,
    percentualEpoxi: 0.2,
    barraTransferenciaDiametroMm: 25,
    barraTransferenciaEspacamentoCm: 30,
    barraTransferenciaComprimentoCm: 50,
    trelicaSustentacaoModelo: 'TG 8 L',
    areaPisoTotalM2: 7950
  });
  const [drenagemHeaderModal, setDrenagemHeaderModal] = useState<DrenagemHeaderGlobal>({
    fatorEmpolamentoBotaFora: 1.10,
    rendimentoPedreiroBlocoHhUn: 0.096,
    rendimentoServenteBlocoHhUn: 0.096,
    consumoArgamassaAlvenariaM3Un: 0.00077,
    consumoArgamassaRevestimentoM3Un: 0.0015,
    consumoTelaLajesKgM3: 105,
    listaCaixas: [
      {
        id: 'cx-1',
        codigo: 'PV1-01',
        tipo: 'PVAP',
        comprimentoM: 1.60,
        larguraM: 1.60,
        cotaTerrenoM: 775.12,
        cotaFundoM: 773.62,
        profundidadeM: 1.50,
        quantidade: 1,
        espessuraBlocoM: 0.14,
        folgaEscavacaoM: 0.30,
        espessuraLastroM: 0.05,
        espessuraLajeFundoM: 0.08,
        espessuraLajeTampaM: 0.08,
        fechamento: 'Tampão FF'
      }
    ],
    listaTubulacoes: [
      {
        id: 'tub-1',
        trecho: 'Trecho 1',
        diametroMm: 600,
        comprimentoM: 25.00,
        cotaTerrenoInicialM: 775.12,
        cotaFundoInicialM: 773.62,
        cotaTerrenoFinalM: 774.50,
        cotaFundoFinalM: 772.80,
        profundidadeMediaM: 1.60,
        folgaLarguraValaM: 0.60,
        espessuraLastroAreiaM: 0.10
      }
    ]
  });
  const [pitsHeaderModal, setPitsHeaderModal] = useState<PitsReservatoriosHeaderGlobal>({
    folgaEscavacaoLateralM: 0.50,
    fatorEmpolamentoPadrao: 1.20,
    taxaAcoPadraoKgM3: 150,
    espessuraLastroMagroM: 0.05,
    listaPits: [
      {
        id: 'pit-1',
        nomeCaixa: 'Caixa 1',
        numeroCaixas: 1,
        numeroCelulas: 1,
        comprimentoInternoM: 22.00,
        larguraInternaM: 17.50,
        alturaInternaM: 2.45,
        alturaLivreM: 0.00,
        espessuraParedeM: 0.15,
        espessuraLajeInfM: 0.15,
        espessuraLajeSupM: 0.15,
        numDivisoria: 1,
        espessuraDivisoriaM: 0.15,
        chanfroM: 0.00,
        taxaAcoKgM3: 150,
        fatorEmpolamento: 1.20,
        espessuraLastroM: 0.05,
        isImpermeabilizado: true
      }
    ]
  });
  const [superestruturaHeaderModal, setSuperestruturaHeaderModal] = useState<SuperestruturaHeaderGlobal>({
    taxaAcoPadraoKgM3: 100,
    peDireitoPadraoM: 4.0,
    listaPecas: [
      {
        id: 'peca-1',
        predio: 'DC',
        nomePeca: 'PILAR DC',
        numPavimentos: 1,
        numEdificacoes: 1,
        tipoPeca: 'P',
        modalidade: 'IN_LOCO',
        codigoEstrutural: 'PL',
        larguraM: 0.50,
        alturaM: 10.00,
        comprimentoM: 0.50,
        quantidadePavimento: 62,
        descontoEspessuraLajeM: 0,
        descontoFormaM2: 0,
        descontoConcretoM3: 0,
        taxaAcoKgM3: 100,
        peDireitoCimbramentoM: 4.0
      },
      {
        id: 'peca-2',
        predio: 'DC',
        nomePeca: 'VIGA DC',
        numPavimentos: 1,
        numEdificacoes: 1,
        tipoPeca: 'V',
        modalidade: 'IN_LOCO',
        codigoEstrutural: 'VL',
        larguraM: 0.50,
        alturaM: 1.30,
        comprimentoM: 18.00,
        quantidadePavimento: 9,
        descontoEspessuraLajeM: 0,
        descontoFormaM2: 0,
        descontoConcretoM3: 0,
        taxaAcoKgM3: 100,
        peDireitoCimbramentoM: 4.0
      }
    ]
  });

  // Coleta todos os parâmetros Globais da Obra e de qualquer Seção da EAP para vinculação direta
  const getHerancaParametrosEap = React.useCallback((_targetIndex: number, list: ItemMemoriaOficial[]) => {
    const accumulated: Array<{ itemEap: string; param: ParametroLinhaItem }> = [];

    // 1. INCLUI PRIMEIRO OS PARÂMETROS GLOBAIS DA OBRA (da seção de dados complementares do header)
    if (header.dadosComplementares && header.dadosComplementares.length > 0) {
      header.dadosComplementares.forEach(dc => {
        if (dc.parametro && dc.parametro.trim()) {
          const keyClean = dc.parametro.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
          const valNum = typeof dc.valor === 'number' ? dc.valor : (parseFloat(String(dc.valor || '0').replace(',', '.')) || 0);
          accumulated.push({
            itemEap: 'GLOBAL',
            param: {
              id: `param-global-${keyClean}`,
              chave: keyClean || 'param_global',
              label: dc.parametro,
              valor: valNum,
              unidade: dc.unidade || '',
              categoria: 'Parâmetro Global da Obra'
            }
          });
        }
      });
    }

    // 2. INCLUI TODOS OS PARÂMETROS CADASTRADOS EM QUALQUER SEÇÃO/ÁREA DA EAP DO ORÇAMENTO
    list.forEach(candidate => {
      const candidateEap = (candidate.item_eap || '').trim();
      if (candidate.parametrosLocais && candidate.parametrosLocais.length > 0) {
        candidate.parametrosLocais.forEach(p => {
          if (!accumulated.some(a => a.param.id === p.id)) {
            accumulated.push({
              itemEap: candidateEap || 'LOCAL',
              param: {
                ...p,
                categoria: p.categoria || (candidate.descricao ? `Seção ${candidateEap} - ${candidate.descricao}` : `Seção ${candidateEap}`)
              }
            });
          }
        });
      }
    });

    return accumulated;
  }, [header.dadosComplementares]);

  // Autocomplete & Lista Dinâmica de Campos / Variáveis da Obra com Herança EAP
  const variaveisAutoComplete = React.useMemo(() => {
    const list: { key: string; label: string; valorStr?: string; unidade?: string; categoria: string }[] = [];

    // 1. Dados Complementares do Header da Obra
    if (header.dadosComplementares && header.dadosComplementares.length > 0) {
      header.dadosComplementares.forEach(dc => {
        if (dc.parametro && dc.parametro.trim()) {
          const keyClean = dc.parametro.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
          list.push({
            key: keyClean || 'Parametro',
            label: dc.parametro,
            valorStr: dc.valor != null ? String(dc.valor).trim() : undefined,
            unidade: dc.unidade,
            categoria: 'Dados da Obra'
          });
        }
      });
    }

    // 2. Parâmetros Herdados da Árvore EAP (Linha Selecionada + Ancestrais)
    if (selectedRowIndex !== null && itens[selectedRowIndex]) {
      const heranca = getHerancaParametrosEap(selectedRowIndex, itens);
      heranca.forEach(({ itemEap, param }) => {
        list.push({
          key: param.chave,
          label: `${param.label} (${param.categoria || 'Geral'})`,
          valorStr: String(param.valor),
          unidade: param.unidade,
          categoria: `Linha EAP ${itemEap}`
        });
      });
    }

    // 3. Catálogo Oficial de Campos do Sistema
    CATALOGO_CAMPOS_SISTEMA.forEach(campo => {
      if (campo.chave !== 'personalizado') {
        list.push({
          key: campo.chave,
          label: campo.label,
          valorStr: undefined,
          unidade: campo.unidade,
          categoria: campo.categoria
        });
      }
    });

    return list;
  }, [header, selectedRowIndex, itens, getHerancaParametrosEap]);

  // Handler para adicionar parâmetro a uma linha de seção
  const handleAddParametroLinha = (rowIndex: number) => {
    if (!newParamData.label.trim()) return;
    const chaveClean = (newParamData.chave.trim() || newParamData.label.trim())
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

    const valNum = parseFloat(newParamData.valor.replace(/\./g, '').replace(',', '.')) || 0;

    const copia = [...itens];
    const item = copia[rowIndex];
    if (!item.parametrosLocais) item.parametrosLocais = [];

    item.parametrosLocais.push({
      id: `param-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      chave: chaveClean,
      label: newParamData.label.trim(),
      valor: valNum || newParamData.valor,
      unidade: newParamData.unidade || '',
      categoria: (newParamData as any).categoria || 'Geral'
    });

    onChangeItens(copia);
    setNewParamData({ label: '', chave: '', valor: '', unidade: 'm²' });
  };

  const handleRemoveParametroLinha = (rowIndex: number, paramId: string) => {
    const copia = [...itens];
    const item = copia[rowIndex];
    if (item && item.parametrosLocais) {
      item.parametrosLocais = item.parametrosLocais.filter(p => p.id !== paramId);
      onChangeItens(copia);
    }
  };

  // Extrai variáveis contidas na expressão manual do usuário
  const detectedVarsInLiteral = React.useMemo(() => {
    if (!customTextLiteral) return [];

    const bracketMatches = customTextLiteral.match(/\[(.*?)\]/g) || [];
    const extractedKeys = new Set<string>();

    bracketMatches.forEach(m => {
      const k = m.replace('[', '').replace(']', '').trim();
      if (k) extractedKeys.add(k);
    });

    variaveisAutoComplete.forEach(v => {
      if (customTextLiteral.includes(v.key) || customTextLiteral.includes(v.label)) {
        extractedKeys.add(v.key);
      }
    });

    return Array.from(extractedKeys).map(k => {
      const found = variaveisAutoComplete.find(v => v.key === k || v.label === k);
      const valStr = customVarValues[k] !== undefined ? customVarValues[k] : (found && found.valorStr ? found.valorStr : '');
      return {
        key: k,
        label: found ? found.label : k,
        valStr: valStr,
        unidade: found ? found.unidade : ''
      };
    });
  }, [customTextLiteral, variaveisAutoComplete, customVarValues]);

  // Avaliação matemática e substituição numérica em tempo real
  useEffect(() => {
    if (!customTextLiteral || modoCalculoModal !== 'formula') return;

    let expr = customTextLiteral.trim();
    if (expr.startsWith('=')) {
      expr = expr.substring(1).trim();
    }

    let substStr = expr;
    let mathExpr = expr;
    let isFullyEvaluated = detectedVarsInLiteral.length > 0;

    detectedVarsInLiteral.forEach(v => {
      const raw = (v.valStr || '').trim();
      const bRegex = new RegExp(`\\[${v.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g');
      const nameRegex = new RegExp(`\\b${v.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');

      if (raw !== '') {
        const numVal = parseFloat(raw.replace(/\./g, '').replace(',', '.')) || parseFloat(raw) || 0;
        const valFormatted = numVal.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
        const textWithUnit = `${valFormatted}${v.unidade ? ' ' + v.unidade : ''}`;

        substStr = substStr.replace(bRegex, textWithUnit);
        substStr = substStr.replace(nameRegex, textWithUnit);

        mathExpr = mathExpr.replace(bRegex, numVal.toString());
        mathExpr = mathExpr.replace(nameRegex, numVal.toString());
      } else {
        isFullyEvaluated = false;
        substStr = substStr.replace(bRegex, `[${v.key}]`);
      }
    });

    let resNum = 0;
    if (isFullyEvaluated) {
      try {
        const cleanMath = mathExpr.replace(/[^0-9\.\+\-\*\/\(\)\s]/g, '');
        if (cleanMath.trim()) {
          resNum = Function(`"use strict"; return (${cleanMath})`)();
        }
      } catch (e) {
        resNum = 0;
      }
    }

    if (isNaN(resNum) || !isFinite(resNum)) {
      resNum = 0;
    }

    if (isFullyEvaluated && resNum > 0) {
      setCustomQtd(resNum);
      setCustomTextSubst(`${substStr} = ${resNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`);
    } else {
      setCustomTextSubst(substStr);
      if (!isFullyEvaluated) {
        setCustomQtd(0);
      }
    }
  }, [customTextLiteral, customVarValues, detectedVarsInLiteral, modoCalculoModal]);

  // Estado local para a Tabela Completa de Vigas Baldrames no Modal
  const [vigasHeaderModal, setVigasHeaderModal] = useState<VigasBaldramesHeaderGlobal>({
    taxaArmacaoKgM3: 90,
    empolamentoBotaForaPerc: 30,
    taxaArmacaoIndicadaPor: 'Engenharia / Projeto Estrutural',
    folgaValaM: 0.50,
    lastroEspessuraM: 0.05
  });

  const [vigasListModal, setVigasListModal] = useState<VigaBaldrameItem[]>([
    {
      id: 'vb-1',
      nome: 'VB-01',
      localizacao: 'Eixo Principal',
      cotaSolo: 0.00,
      cotaTopo: -0.30,
      talude: 1, // 1: Prumo com Vala
      quantidade: 1,
      largura: 0.20,
      altura: 0.40,
      comprimento: 15.00
    }
  ]);

  // Estado local para a Tabela Completa de Sapatas Isoladas no Modal
  const [sapatasHeaderModal, setSapatasHeaderModal] = useState<SapatasHeaderGlobal>({
    taxaArmacaoKgM3: 90,
    empolamentoBotaForaPerc: 30,
    taxaArmacaoIndicadaPor: 'Engenharia / Projeto Estrutural',
    folgaValaM: 0.50,
    lastroEspessuraM: 0.05
  });

  const [sapatasListModal, setSapatasListModal] = useState<SapataItem[]>([
    {
      id: 'sap-1',
      nome: 'S-01',
      localizacao: 'Pilar P1',
      cotaSolo: 0.00,
      cotaTopo: -1.00,
      talude: 1, // 1: Prumo com Vala
      quantidade: 1,
      larguraMaior: 1.50,
      comprimentoMaior: 1.50,
      larguraMenor: 0.50,
      comprimentoMenor: 0.50,
      altura1: 0.30,
      altura2: 0.30
    }
  ]);

  // Estado local para Blocos de Fundação
  const [blocosHeaderModal, setBlocosHeaderModal] = useState<BlocosHeaderGlobal>({
    taxaArmacaoKgM3: 90,
    empolamentoBotaForaPerc: 30,
    taxaArmacaoIndicadaPor: 'Engenharia / Projeto Estrutural',
    folgaValaM: 0.50,
    lastroEspessuraM: 0.05
  });
  const [blocosListModal, setBlocosListModal] = useState<BlocoItem[]>([
    {
      id: 'bl-1',
      nome: 'B-01',
      localizacao: 'Pilar P1',
      tipoBloco: 'moldado',
      cotaSolo: 0.00,
      cotaTopo: -1.00,
      talude: 1,
      quantidade: 1,
      comprimentoA: 1.60,
      larguraB: 1.60,
      alturaH1: 0.40,
      alturaH2: 0.30
    }
  ]);

  // Estado local para Tubulões
  const [tubuloesHeaderModal, setTubuloesHeaderModal] = useState<TubuloesHeaderGlobal>({
    taxaArmacaoKgM3: 90,
    empolamentoBotaForaPerc: 30,
    taxaArmacaoIndicadaPor: 'Engenharia / Projeto Estrutural',
    folgaValaM: 0.50,
    lastroEspessuraM: 0.05
  });
  const [tubuloesListModal, setTubuloesListModal] = useState<TubulaoItem[]>([
    {
      id: 'tb-1',
      nome: 'TB-01',
      localizacao: 'Eixo Principal',
      cotaSolo: 0.00,
      cotaTopo: -0.50,
      quantidade: 1,
      diametroFusteM: 0.80,
      alturaFusteM: 4.00,
      diametroBaseM: 1.60,
      alturaBaseM: 0.70,
      alturaRodapeBaseM: 0.20
    }
  ]);

  // Estado local para Estacas
  const [estacasHeaderModal, setEstacasHeaderModal] = useState<EstacasHeaderGlobal>({
    taxaArmacaoKgM3: 60,
    perdaConcretoPerc: 20,
    empolamentoBotaForaPerc: 30
  });
  const [estacasListModal, setEstacasListModal] = useState<EstacaItem[]>([
    {
      id: 'est-1',
      nome: 'E-01',
      localizacao: 'Eixo Geral',
      tipoEstaca: 'helice',
      diametroM: 0.40,
      cargaTon: 40,
      cotaSoloM: 0.00,
      cotaArrasamentoM: -1.00,
      cotaApoioM: -12.00,
      comprimentoArmacaoM: 6.00,
      quantidade: 1
    }
  ]);

  // Drag and drop reordering state
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
  const [dragOverRowIndex, setDragOverRowIndex] = useState<number | null>(null);
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({});

  // Arrastar e soltar linha para reordenar (movendo o bloco inteiro de pai + filhas)
  const handleDropRow = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= itens.length || toIndex >= itens.length) return;

    pushUndoSnapshot(itens);
    const copia = [...itens];

    const numFilhosFrom = contarItensFilhos(fromIndex, copia);
    const blockSizeFrom = 1 + numFilhosFrom;

    if (toIndex >= fromIndex && toIndex < fromIndex + blockSizeFrom) {
      setDraggedRowIndex(null);
      setDragOverRowIndex(null);
      return;
    }

    const block = copia.splice(fromIndex, blockSizeFrom);

    let insertIndex = toIndex;
    if (fromIndex < toIndex) {
      const numFilhosTo = contarItensFilhos(toIndex, itens);
      insertIndex = Math.max(0, toIndex - blockSizeFrom + 1 + numFilhosTo);
    } else {
      insertIndex = toIndex;
    }

    if (insertIndex > copia.length) {
      insertIndex = copia.length;
    }

    copia.splice(insertIndex, 0, ...block);

    const novaLista = recalcularEAPsMemoria(copia);
    onChangeItens(novaLista);
    setDraggedRowIndex(null);
    setDragOverRowIndex(null);
  };

  // Navegação via teclado (Setas, Enter, Alt+Shift+Setas para recuo)
  const handleCellKeyDown = (
    e: React.KeyboardEvent,
    rowIndex: number,
    colIndex: number
  ) => {
    const key = e.key;

    // Atalho Alt + Shift + Seta Direita/Esquerda para Recuo EAP
    if (e.altKey && e.shiftKey) {
      if (key === 'ArrowRight') {
        e.preventDefault();
        handleIndent(rowIndex, 1);
        return;
      } else if (key === 'ArrowLeft') {
        e.preventDefault();
        handleIndent(rowIndex, -1);
        return;
      }
    }

    if (key === 'ArrowDown' || (key === 'Enter' && !e.shiftKey)) {
      e.preventDefault();
      const nextRow = getNextVisibleRowIndex(rowIndex, 'down', itens);
      focusCell(nextRow, colIndex);
    } else if (key === 'ArrowUp') {
      e.preventDefault();
      const prevRow = getNextVisibleRowIndex(rowIndex, 'up', itens);
      focusCell(prevRow, colIndex);
    } else if (key === 'ArrowRight') {
      const target = e.currentTarget as HTMLInputElement | HTMLTextAreaElement;
      if (!target.selectionStart || target.selectionStart === target.value.length) {
        if (colIndex < 3) {
          e.preventDefault();
          focusCell(rowIndex, colIndex + 1);
        }
      }
    } else if (key === 'ArrowLeft') {
      const target = e.currentTarget as HTMLInputElement | HTMLTextAreaElement;
      if (target.selectionStart === 0 && target.selectionEnd === 0) {
        if (colIndex > 0) {
          e.preventDefault();
          focusCell(rowIndex, colIndex - 1);
        }
      }
    }
  };

  const getNextVisibleRowIndex = (currentIndex: number, direction: 'up' | 'down', list: ItemMemoriaOficial[]): number => {
    const step = direction === 'down' ? 1 : -1;
    let idx = currentIndex + step;

    while (idx >= 0 && idx < list.length) {
      if (!isLinhaOculta(idx, list)) {
        return idx;
      }
      idx += step;
    }
    return currentIndex;
  };

  const focusCell = (targetRowIndex: number, colIndex: number) => {
    setTimeout(() => {
      const el = document.querySelector(`[data-row="${targetRowIndex}"][data-col="${colIndex}"]`) as HTMLElement;
      if (el) {
        el.focus();
        if ('select' in el && typeof (el as any).select === 'function') {
          (el as HTMLInputElement).select();
        }
      }
    }, 50);
  };

  const pushUndoSnapshot = (currentItens: ItemMemoriaOficial[]) => {
    setUndoStack(prev => [...prev.slice(-30), currentItens.map(i => ({ ...i }))]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, prev.length - 1));
    onChangeItens(previous);
  };

  const handleRowClick = (e: React.MouseEvent, index: number) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedRowIndices(prev => {
        const copy = new Set(prev);
        if (copy.has(index)) copy.delete(index);
        else copy.add(index);
        return copy;
      });
      setSelectedRowIndex(index);
    } else if (e.shiftKey && selectedRowIndex !== null) {
      const start = Math.min(selectedRowIndex, index);
      const end = Math.max(selectedRowIndex, index);
      const copy = new Set<number>();
      for (let i = start; i <= end; i++) {
        copy.add(i);
      }
      setSelectedRowIndices(copy);
    } else {
      setSelectedRowIndex(index);
      setSelectedRowIndices(new Set([index]));
    }
  };

  // Escuta global para atalhos no documento (Ctrl+Z, Insert para nova seção, Alt+Shift+Setas para recuo)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (readonly || showBancoModal || showBibliotecaModal || editingItemModal || paramEditorIndex !== null) return;

      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        handleUndo();
        return;
      }

      if (e.altKey && e.shiftKey) {
        if (e.key === 'ArrowRight' || e.code === 'ArrowRight') {
          e.preventDefault();
          handleIndentMultiple(1);
        } else if (e.key === 'ArrowLeft' || e.code === 'ArrowLeft') {
          e.preventDefault();
          handleIndentMultiple(-1);
        }
      } else if (e.key === 'Insert' || e.code === 'Insert') {
        e.preventDefault();
        handleAddSecaoTexto();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [readonly, selectedRowIndex, selectedRowIndices, itens, showBancoModal, showBibliotecaModal, editingItemModal, paramEditorIndex, undoStack]);

  // Alternar colapso/expansão de uma linha mãe
  const handleToggleCollapse = (index: number) => {
    pushUndoSnapshot(itens);
    const copia = itens.map(i => ({ ...i }));
    copia[index].collapsed = !copia[index].collapsed;
    onChangeItens(copia);
  };

  // Expandir ou recolher todas as seções e tópicos do orçamento
  const handleToggleExpandAll = (expand: boolean) => {
    pushUndoSnapshot(itens);
    const copia = itens.map(i => ({ ...i, collapsed: !expand }));
    onChangeItens(copia);
  };

  // Adicionar/Inserir nova linha de texto (Seção) ACIMA da linha selecionada
  const handleAddSecaoTexto = (overrideIndex?: number) => {
    pushUndoSnapshot(itens);
    const targetIndex = overrideIndex !== undefined ? overrideIndex : (selectedRowIndex !== null ? selectedRowIndex : itens.length);
    const parentLevel = targetIndex < itens.length ? (itens[targetIndex]?.level !== undefined ? itens[targetIndex].level : 0) : 0;

    const novoItem: ItemMemoriaOficial = {
      id: generateUUID(),
      item_eap: '',
      descricao: '',
      unidade: '',
      quantidade: 0,
      isSecao: true,
      level: parentLevel,
      collapsed: false,
      parametrosLocais: [],
      equacaoLiteral: '',
      substituicaoNumerica: '',
      observacaoMemoria: ''
    };

    const copia = [...itens];
    copia.splice(targetIndex, 0, novoItem);
    const novaLista = recalcularEAPsMemoria(copia);
    onChangeItens(novaLista);
    setSelectedRowIndex(targetIndex);
    focusCell(targetIndex, 1);
  };

  // Seleção de Composição / Insumo do Banco Próprio (Inserido ACIMA da linha selecionada ou ao final)
  const handleSelectBancoItem = async (itemBanco: ItemBancoSelecionado) => {
    const targetIndex = (selectedRowIndex !== null && selectedRowIndex < itens.length)
      ? selectedRowIndex
      : itens.length;
    
    // Toda nova linha inserida inicia sempre no Primeiro Nível (Level 0)
    const baseLevel = 0;

    const itemMae: ItemMemoriaOficial = {
      id: generateUUID(),
      item_eap: '',
      descricao: itemBanco.descricao,
      unidade: itemBanco.unidade || 'UN',
      quantidade: 0,
      isSecao: false,
      level: baseLevel,
      collapsed: false,
      equacaoLiteral: '',
      substituicaoNumerica: '',
      observacaoMemoria: ''
    };
    (itemMae as any).codigo = itemBanco.codigo || '';
    (itemMae as any).banco_fonte = (itemBanco as any).banco_fonte || '';

    let novosItens: ItemMemoriaOficial[] = [itemMae];

    // Se for Composição, busca insumos e subcomposições filhas e INICIA FECHADA (collapsed = true)
    if (itemBanco.tipo === 'composicao') {
      try {
        const { data: compItensData } = await supabase
          .schema('engenharia')
          .from('composicao_itens')
          .select(`
            *,
            insumo:insumos (*),
            sub_composicao:composicoes!sub_composicao_id (*)
          `)
          .eq('composicao_id', itemBanco.id);

        if (compItensData && compItensData.length > 0) {
          // A Composição Mãe inicia fechada/colapsada com as filhas ocultas por padrão
          itemMae.collapsed = true;

          const filhas: ItemMemoriaOficial[] = compItensData.map((ci, idx) => {
            const desc = ci.insumo?.descricao || ci.sub_composicao?.descricao || `Insumo / Subcomposição ${idx + 1}`;
            const und = ci.insumo?.unidade || ci.sub_composicao?.unidade || 'UN';

            return {
              id: generateUUID(),
              item_eap: '',
              descricao: desc,
              unidade: und,
              quantidade: 0,
              isSecao: false,
              level: baseLevel + 1, // Filha recuada (+1 nível em relação à mãe)
              collapsed: false,
              isChildInsumoOfComposition: true, // Marca como insumo filho que pertence à composição mãe
              parentCompositionId: itemMae.id,
              equacaoLiteral: '',
              substituicaoNumerica: '',
              observacaoMemoria: ''
            };
          });

          novosItens = [itemMae, ...filhas];
        }
      } catch (err) {
        console.error('Erro ao carregar itens da composição:', err);
      }
    }

    const isLinhaVazia = targetIndex < itens.length && itens[targetIndex].isSecao && !itens[targetIndex].descricao.trim();
    const copia = [...itens];
    if (isLinhaVazia) {
      copia.splice(targetIndex, 1, ...novosItens);
    } else {
      copia.splice(targetIndex, 0, ...novosItens);
    }

    const novaLista = recalcularEAPsMemoria(copia);
    onChangeItens(novaLista);
    setSelectedRowIndex(targetIndex);
  };



  // Alterar nível de recuo (Aumentar / Diminuir Recuo)
  const handleIndent = (index: number, delta: number) => {
    pushUndoSnapshot(itens);
    const copia = itens.map(i => ({ ...i }));
    const target = copia[index];
    const currentLevel = Math.max(0, target.level !== undefined ? target.level : (target.isSecao ? 0 : 1));

    // Proteção: Insumo filho de uma composição não pode ter o recuo diminuído além do nível da mãe!
    if (target.isChildInsumoOfComposition && delta < 0) {
      let parentLevel = 0;
      for (let i = index - 1; i >= 0; i--) {
        if (copia[i].id === target.parentCompositionId || (!copia[i].isChildInsumoOfComposition && (copia[i].level || 0) < currentLevel)) {
          parentLevel = copia[i].level || 0;
          break;
        }
      }
      if (currentLevel + delta <= parentLevel) {
        alert('Insumos pertencentes a uma composição não podem ser desvinculados de sua composição mãe.');
        return;
      }
    }

    // Limite máximo de nível permitido com base na linha anterior
    const prevItem = index > 0 ? copia[index - 1] : null;
    const prevLevel = prevItem ? Math.max(0, prevItem.level !== undefined ? prevItem.level : (prevItem.isSecao ? 0 : 1)) : 0;
    const maxAllowedLevel = delta > 0 ? prevLevel + 1 : 4;

    const newLevel = Math.max(0, Math.min(maxAllowedLevel, currentLevel + delta));
    const actualDelta = newLevel - currentLevel;

    target.level = newLevel;

    // Se o item foi recuado para dentro de uma mãe colapsada, expande a mãe
    if (delta > 0 && newLevel > currentLevel) {
      for (let i = index - 1; i >= 0; i--) {
        const candidate = copia[i];
        if (!candidate) continue;
        const candidateLevel = Math.max(0, candidate.level !== undefined ? candidate.level : (candidate.isSecao ? 0 : 1));
        if (candidateLevel < newLevel) {
          candidate.collapsed = false;
          if (candidateLevel === 0) break;
        }
      }
    }

    // Propaga o mesmo deslocamento (actualDelta) apenas para as filhas subordinadas da sub-árvore
    if (actualDelta !== 0) {
      const targetLevel = currentLevel;

      for (let j = index + 1; j < copia.length; j++) {
        const child = copia[j];
        if (!child) break;
        const childLevel = Math.max(0, child.level !== undefined ? child.level : (child.isSecao ? 0 : 1));

        const isDirectInsumo = child.isChildInsumoOfComposition && child.parentCompositionId === target.id;
        const isSubTreeChild = childLevel > targetLevel;

        if (isDirectInsumo || isSubTreeChild) {
          const childNewLevel = Math.max(0, Math.min(4, childLevel + actualDelta));
          child.level = childNewLevel;
        } else {
          break;
        }
      }
    }

    const novaLista = recalcularEAPsMemoria(copia);
    onChangeItens(novaLista);
  };

  // Alterar nível de recuo em lote para todas as linhas selecionadas
  const handleIndentMultiple = (delta: number) => {
    let targets = Array.from(selectedRowIndices);
    if (targets.length === 0 && selectedRowIndex !== null) {
      targets.push(selectedRowIndex);
    }
    if (targets.length === 0) return;

    pushUndoSnapshot(itens);
    let copia = itens.map(i => ({ ...i }));

    targets.sort((a, b) => a - b);

    const topTargets: number[] = [];
    targets.forEach(idx => {
      const item = copia[idx];
      if (!item) return;
      const itemEap = (item.item_eap || '').trim();
      const isChildOfOtherTarget = topTargets.some(topIdx => {
        const topItem = copia[topIdx];
        if (!topItem) return false;
        const topEap = (topItem.item_eap || '').trim();
        return (topEap && itemEap.startsWith(topEap + '.')) || (item.isChildInsumoOfComposition && item.parentCompositionId === topItem.id);
      });
      if (!isChildOfOtherTarget) {
        topTargets.push(idx);
      }
    });

    let altered = false;

    topTargets.forEach(index => {
      const target = copia[index];
      if (!target) return;
      const currentLevel = Math.max(0, target.level !== undefined ? target.level : (target.isSecao ? 0 : 1));

      if (target.isChildInsumoOfComposition && delta < 0) {
        let parentLevel = 0;
        for (let i = index - 1; i >= 0; i--) {
          if (copia[i].id === target.parentCompositionId || (!copia[i].isChildInsumoOfComposition && (copia[i].level || 0) < currentLevel)) {
            parentLevel = copia[i].level || 0;
            break;
          }
        }
        if (currentLevel + delta <= parentLevel) return;
      }

      const prevItem = index > 0 ? copia[index - 1] : null;
      const prevLevel = prevItem ? Math.max(0, prevItem.level !== undefined ? prevItem.level : (prevItem.isSecao ? 0 : 1)) : 0;
      const maxAllowedLevel = delta > 0 ? prevLevel + 1 : 4;

      const newLevel = Math.max(0, Math.min(maxAllowedLevel, currentLevel + delta));
      const actualDelta = newLevel - currentLevel;

      if (actualDelta === 0) return;

      target.level = newLevel;
      altered = true;

      if (delta > 0 && newLevel > currentLevel) {
        for (let i = index - 1; i >= 0; i--) {
          const candidate = copia[i];
          if (!candidate) continue;
          const candidateLevel = Math.max(0, candidate.level !== undefined ? candidate.level : (candidate.isSecao ? 0 : 1));
          if (candidateLevel < newLevel) {
            candidate.collapsed = false;
            if (candidateLevel === 0) break;
          }
        }
      }

      if (actualDelta !== 0) {
        const targetLevel = currentLevel;

        for (let j = index + 1; j < copia.length; j++) {
          const child = copia[j];
          if (!child) break;
          const childLevel = Math.max(0, child.level !== undefined ? child.level : (child.isSecao ? 0 : 1));

          const isDirectInsumo = child.isChildInsumoOfComposition && child.parentCompositionId === target.id;
          const isSubTreeChild = childLevel > targetLevel;

          if (isDirectInsumo || isSubTreeChild) {
            const childNewLevel = Math.max(0, Math.min(4, childLevel + actualDelta));
            child.level = childNewLevel;
          } else {
            break;
          }
        }
      }
    });

    if (altered) {
      const novaLista = recalcularEAPsMemoria(copia);
      onChangeItens(novaLista);
    }
  };

  // Reordenar linha (Mover para Cima / Baixo)
  const handleMoveRow = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === itens.length - 1) return;

    const item = itens[index];

    // Se for um insumo filho de composição, verifica se o movimento permanece dentro dos limites da mãe
    if (item.isChildInsumoOfComposition) {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      const targetItem = itens[targetIndex];

      if (direction === 'up' && (!targetItem.isChildInsumoOfComposition || targetItem.id === item.parentCompositionId)) {
        alert('Insumos pertencentes a uma composição não podem ser movidos para fora de sua composição mãe.');
        return;
      }
      if (direction === 'down' && (!targetItem.isChildInsumoOfComposition || targetItem.parentCompositionId !== item.parentCompositionId)) {
        alert('Insumos pertencentes a uma composição não podem ser movidos para fora de sua composição mãe.');
        return;
      }

      const copia = [...itens];
      const temp = copia[index];
      copia[index] = copia[targetIndex];
      copia[targetIndex] = temp;

      const novaLista = recalcularEAPsMemoria(copia);
      onChangeItens(novaLista);
      return;
    }

    // Se for um item pai (Composição ou Seção) que possui filhas, move todo o bloco de filhas junto!
    const numFilhos = contarItensFilhos(index, itens);
    const blockSize = numFilhos + 1;

    if (direction === 'up') {
      const prevIndex = index - 1;
      if (prevIndex < 0) return;

      const copia = [...itens];
      const movedBlock = copia.splice(index, blockSize);
      copia.splice(prevIndex, 0, ...movedBlock);

      const novaLista = recalcularEAPsMemoria(copia);
      onChangeItens(novaLista);
    } else {
      const nextIndex = index + blockSize;
      if (nextIndex >= itens.length) return;

      const numFilhosProximo = contarItensFilhos(nextIndex, itens);
      const nextBlockSize = numFilhosProximo + 1;

      const copia = [...itens];
      const movedBlock = copia.splice(index, blockSize);
      copia.splice(index + nextBlockSize, 0, ...movedBlock);

      const novaLista = recalcularEAPsMemoria(copia);
      onChangeItens(novaLista);
    }
  };

  const handleOpenCalcItem = (index: number) => {
    const item = itens[index];
    setEditingItemIndex(index);

    // Garante que o item possui um array formulasLista consistente
    if (!item.formulasLista) {
      item.formulasLista = [];
    }

    setEditingItemModal(item);
    setTargetBindingItemId(item.id);
    setSelectedActiveCalcId(null);
    setEditingTabId(null);

    // Inicializa a modal sem nenhuma fórmula pré-selecionada
    setModoCalculoModal('');

    const initialList = [...item.formulasLista];

    setTempFormulas(initialList);
    setSelectedFormula(null);
    setCustomTextLiteral('');
    setCustomTextSubst('');
    setCustomQtd(item.quantidade || 0);

    // Inicializa a lista de parâmetros da fórmula sempre limpa com 1 parâmetro inicial limpo (Parâmetro 1)
    const listaBase = getParametrosCadastrados();
    const defaultBase = listaBase.find(p => p.sigla === 'A' || p.unidade === 'm²') || listaBase[0];
    const initialParams = [{
      id: `cp-${Date.now()}-1`,
      nome: 'Parâmetro 1',
      parametroBaseId: defaultBase ? defaultBase.id : 'p-8',
      parametroNome: defaultBase ? defaultBase.parametro : 'Área de Superfície',
      sigla: defaultBase ? defaultBase.sigla : 'A',
      unidade: defaultBase ? defaultBase.unidade : 'm²',
      valor: ''
    }];
    setCustomParamsList(initialParams);
  };

  const handleAddFormulaStep = () => {
    if (!customTextLiteral || !customTextLiteral.trim()) return;

    let raw = customTextLiteral.trim();
    if (!raw.includes('=')) {
      alert("É obrigatório informar o nome da fórmula/medida seguido de '=' (Exemplo: Área de Cobertura = [Parâmetro 1] + [Parâmetro 2]).");
      return;
    }

    const eqIndex = raw.indexOf('=');
    const formulaName = raw.substring(0, eqIndex).trim();
    const expr = raw.substring(eqIndex + 1).trim();

    if (!formulaName) {
      alert("Informe o nome da fórmula/medida antes do '=' (Exemplo: Área de Cobertura = [Parâmetro 1] + [Parâmetro 2]).");
      return;
    }

    if (!expr) {
      alert("Informe a expressão matemática ou selecione parâmetros após o '='.");
      return;
    }

    const fullEqLiteral = `${formulaName} = ${expr}`;

    const newStep = {
      id: `fstep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      equacaoLiteral: fullEqLiteral,
      substituicaoNumerica: liveCalc.text || fullEqLiteral,
      resultado: liveCalc.result || 0,
      unidade: customParamsList[0]?.unidade || 'm²'
    };

    setSavedCustomFormulas(prev => [...prev, newStep]);
    setCustomTextLiteral('');
    setCustomTextSubst('');
    setCustomQtd(0);
  };

  const handleSaveItemFormula = () => {
    if (editingItemIndex === null && !editingItemModal) return;

    const copia = [...itens];
    const targetId = targetBindingItemId || (editingItemModal ? editingItemModal.id : null);
    const targetIndex = targetId ? copia.findIndex(i => i.id === targetId) : (editingItemIndex ?? -1);

    if (targetIndex !== -1) {
      const updatedTarget = { ...copia[targetIndex] };
      if (!updatedTarget.parametrosLocais) updatedTarget.parametrosLocais = [];

      const exportParams = (params: Array<{ chave: string; label: string; valor: number; unidade: string; categoria: string }>) => {
        params.forEach(p => {
          if (p.valor > 0) {
            const valNum = Math.round(p.valor * 100) / 100;
            const existingIdx = updatedTarget.parametrosLocais!.findIndex(existing => existing.chave === p.chave);
            if (existingIdx >= 0) {
              updatedTarget.parametrosLocais![existingIdx].valor = valNum;
            } else {
              updatedTarget.parametrosLocais!.push({
                id: `param-derived-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                chave: p.chave,
                label: p.label,
                valor: valNum,
                unidade: p.unidade,
                categoria: p.categoria
              });
            }
          }
        });
      };

      // Exporta os 8 parâmetros resolvidos em tempo real se o usuário estava na planilha de cálculo especializada
      if (modoCalculoModal === 'tabela_vigas') {
        const totConcreto = vigasListModal.reduce((acc, v) => acc + (v.quantidade * v.largura * v.altura * v.comprimento), 0);
        const totForma = vigasListModal.reduce((acc, v) => acc + (v.quantidade * (2 * v.altura + v.largura) * v.comprimento), 0);
        const totEscav = vigasListModal.reduce((acc, v) => acc + (v.quantidade * (v.largura + 2 * (vigasHeaderModal.folgaValaM || 0.5)) * (v.comprimento + 2 * (vigasHeaderModal.folgaValaM || 0.5)) * ((v.cotaSolo - v.cotaTopo) + v.altura + (vigasHeaderModal.lastroEspessuraM || 0.05))), 0);
        const totAco = totConcreto * (vigasHeaderModal.taxaArmacaoKgM3 || 90);
        const totLastro = vigasListModal.reduce((acc, v) => acc + (v.quantidade * (v.largura + 2 * (vigasHeaderModal.folgaValaM || 0.5)) * (v.comprimento + 2 * (vigasHeaderModal.folgaValaM || 0.5)) * (vigasHeaderModal.lastroEspessuraM || 0.05)), 0);
        const totImper = totForma;
        const totReaterro = Math.max(0, totEscav - totConcreto - totLastro);
        const totBotaFora = (totEscav - totReaterro) * (1 + (vigasHeaderModal.empolamentoBotaForaPerc || 30) / 100);

        exportParams([
          { chave: 'volume_concreto', label: 'Volume de Concreto', valor: totConcreto, unidade: 'm³', categoria: 'Estrutura & Fôrmas' },
          { chave: 'area_forma', label: 'Área de Fôrma Lateral', valor: totForma, unidade: 'm²', categoria: 'Estrutura & Fôrmas' },
          { chave: 'volume_escavacao', label: 'Volume de Escavação', valor: totEscav, unidade: 'm³', categoria: 'Terraplenagem & Solo' },
          { chave: 'peso_aco', label: 'Armação em Aço', valor: totAco, unidade: 'kg', categoria: 'Estrutura & Fôrmas' },
          { chave: 'volume_lastro', label: 'Lastro Concreto Magro', valor: totLastro, unidade: 'm³', categoria: 'Estrutura & Fôrmas' },
          { chave: 'area_impermeabilizacao', label: 'Área de Impermeabilização', valor: totImper, unidade: 'm²', categoria: 'Paredes & Vedações' },
          { chave: 'volume_reaterro', label: 'Volume de Reaterro', valor: totReaterro, unidade: 'm³', categoria: 'Terraplenagem & Solo' },
          { chave: 'volume_botafora', label: 'Solo Bota-fora (Empolado)', valor: totBotaFora, unidade: 'm³', categoria: 'Terraplenagem & Solo' },
        ]);
        updatedTarget.observacaoMemoria = 'Vigas Baldrames';
      } else if (modoCalculoModal === 'tabela_sapatas') {
        const totConcreto = sapatasListModal.reduce((acc, s) => acc + (s.quantidade * (s.larguraMaior * s.comprimentoMaior * s.altura1 + (s.larguraMaior * s.comprimentoMaior + s.larguraMenor * s.comprimentoMenor + Math.sqrt(s.larguraMaior * s.comprimentoMaior * s.larguraMenor * s.comprimentoMenor)) / 3 * s.altura2)), 0);
        const totForma = sapatasListModal.reduce((acc, s) => acc + (s.quantidade * (2 * (s.larguraMaior + s.comprimentoMaior) * s.altura1 + (s.larguraMaior + s.larguraMenor) * Math.sqrt(Math.pow((s.comprimentoMaior - s.comprimentoMenor)/2, 2) + Math.pow(s.altura2, 2)) + (s.comprimentoMaior + s.comprimentoMenor) * Math.sqrt(Math.pow((s.larguraMaior - s.larguraMenor)/2, 2) + Math.pow(s.altura2, 2)))), 0);
        const totEscav = sapatasListModal.reduce((acc, s) => acc + (s.quantidade * (s.larguraMaior + 2 * (sapatasHeaderModal.folgaValaM || 0.5)) * (s.comprimentoMaior + 2 * (sapatasHeaderModal.folgaValaM || 0.5)) * ((s.cotaSolo - s.cotaTopo) + s.altura1 + s.altura2 + (sapatasHeaderModal.lastroEspessuraM || 0.05))), 0);
        const totAco = totConcreto * (sapatasHeaderModal.taxaArmacaoKgM3 || 90);
        const totLastro = sapatasListModal.reduce((acc, s) => acc + (s.quantidade * (s.larguraMaior + 2 * (sapatasHeaderModal.folgaValaM || 0.5)) * (s.comprimentoMaior + 2 * (sapatasHeaderModal.folgaValaM || 0.5)) * (sapatasHeaderModal.lastroEspessuraM || 0.05)), 0);
        const totImper = sapatasListModal.reduce((acc, s) => acc + (s.quantidade * s.larguraMaior * s.comprimentoMaior), 0);
        const totReaterro = Math.max(0, totEscav - totConcreto - totLastro);
        const totBotaFora = (totEscav - totReaterro) * (1 + (sapatasHeaderModal.empolamentoBotaForaPerc || 30) / 100);

        exportParams([
          { chave: 'volume_concreto', label: 'Volume de Concreto Usinado', valor: totConcreto, unidade: 'm³', categoria: 'Estrutura & Fôrmas' },
          { chave: 'area_forma', label: 'Área de Fôrma', valor: totForma, unidade: 'm²', categoria: 'Estrutura & Fôrmas' },
          { chave: 'volume_escavacao', label: 'Volume de Escavação', valor: totEscav, unidade: 'm³', categoria: 'Terraplenagem & Solo' },
          { chave: 'peso_aco', label: 'Armação em Aço CA-50', valor: totAco, unidade: 'kg', categoria: 'Estrutura & Fôrmas' },
          { chave: 'volume_lastro', label: 'Lastro Concreto Magro', valor: totLastro, unidade: 'm³', categoria: 'Estrutura & Fôrmas' },
          { chave: 'area_impermeabilizacao', label: 'Área de Impermeabilização', valor: totImper, unidade: 'm²', categoria: 'Paredes & Vedações' },
          { chave: 'volume_reaterro', label: 'Volume de Reaterro', valor: totReaterro, unidade: 'm³', categoria: 'Terraplenagem & Solo' },
          { chave: 'volume_botafora', label: 'Solo Bota-fora (Empolado)', valor: totBotaFora, unidade: 'm³', categoria: 'Terraplenagem & Solo' },
        ]);
        updatedTarget.observacaoMemoria = 'Sapatas Isoladas';
      } else if (modoCalculoModal === 'tabela_blocos') {
        let totApil = 0, totLastro = 0, totConcreto = 0, totForma = 0, totEscav = 0, totAco = 0, totReaterro = 0, totBotaFora = 0;

        blocosListModal.forEach(b => {
          const q = b.quantidade || 0;
          const folgaLastro = 0.05;
          const folgaVala = blocosHeaderModal.folgaValaM || 0.15;
          const espLastro = blocosHeaderModal.lastroEspessuraM || 0.05;
          const taxaAco = blocosHeaderModal.taxaArmacaoKgM3 || 90;
          const hSoloTopo = Math.abs((b.cotaSolo || 0) - (b.cotaTopo || 0));

          let apilUnit = 0, concUnit = 0, formaUnit = 0, areaBaseExc = 0, hElem = 0;

          if (b.tipoBloco === 'moldado') {
            const l = b.comprimentoA || 1.6, c = b.larguraB || 1.6, h1 = b.alturaH1 || 0.6, h2 = b.alturaH2 || 0;
            hElem = h1 + h2;
            apilUnit = (l + 2 * folgaLastro) * (c + 2 * folgaLastro);
            concUnit = h2 > 0 ? (l * c * h1 + (h2 / 3) * (l * c + 0.25 + Math.sqrt(l * c * 0.25))) : (l * c * h1);
            formaUnit = 2 * h1 * (l + c);
            areaBaseExc = (l + 2 * folgaVala) * (c + 2 * folgaVala);
          } else if (b.tipoBloco === 'tres_estacas' || b.tipoBloco === 'tres_estacas_pre') {
            const b1 = b.b1Trap1 || 0.6, b2 = b.b2Trap1 || 1.8, hT1 = b.hTrap1 || 1.04;
            const b3 = b.b3Trap2 || 1.8, b4 = b.b4Trap2 || 0.6, hT2 = b.hTrap2 || 1.04;
            const hB = b.alturaH1 || 0.6;
            hElem = hB;
            apilUnit = ((b1 + 2*folgaLastro + b2 + 2*folgaLastro)/2)*(hT1 + folgaLastro) + ((b3 + 2*folgaLastro + b4 + 2*folgaLastro)/2)*(hT2 + folgaLastro);
            concUnit = (((b1 + b2)/2)*hT1 + ((b3 + b4)/2)*hT2) * hB;
            const lat1 = Math.sqrt(Math.pow(b2-b1,2) + Math.pow(hT1,2)), lat2 = Math.sqrt(Math.pow(b3-b4,2) + Math.pow(hT2,2));
            formaUnit = (b1 + b4 + 2*(lat1+lat2)) * hB;
            areaBaseExc = ((b1 + 2*folgaVala + b2 + 2*folgaVala)/2)*(hT1 + folgaVala) + ((b3 + 2*folgaVala + b4 + 2*folgaVala)/2)*(hT2 + folgaVala);
          } else {
            const l = b.comprimentoA || 1.6, c = b.larguraB || 1.6, hB = b.alturaH1 || 0.6;
            hElem = hB;
            apilUnit = (l + 2 * folgaLastro) * (c + 2 * folgaLastro);
            concUnit = l * c * hB;
            formaUnit = 2 * hB * (l + c);
            areaBaseExc = (l + 2 * folgaVala) * (c + 2 * folgaVala);
          }

          const hExc = hSoloTopo + hElem + espLastro;
          const excUnit = areaBaseExc * hExc;

          totApil += q * apilUnit;
          totLastro += q * apilUnit * espLastro;
          totConcreto += q * concUnit;
          totForma += q * formaUnit;
          totEscav += q * excUnit;
          totAco += q * concUnit * taxaAco;
        });

        totReaterro = Math.max(0, totEscav - totLastro - totConcreto);
        totBotaFora = (totEscav - totReaterro) * (1 + (blocosHeaderModal.empolamentoBotaForaPerc || 30) / 100);

        exportParams([
          { chave: 'area_apiloamento', label: 'Área de Apiloamento do Fundo', valor: totApil, unidade: 'm²', categoria: 'Terraplenagem & Solo' },
          { chave: 'volume_concreto', label: 'Volume de Concreto de Blocos', valor: totConcreto, unidade: 'm³', categoria: 'Estrutura & Fôrmas' },
          { chave: 'area_forma', label: 'Área de Fôrma de Blocos', valor: totForma, unidade: 'm²', categoria: 'Estrutura & Fôrmas' },
          { chave: 'volume_escavacao', label: 'Volume de Escavação', valor: totEscav, unidade: 'm³', categoria: 'Terraplenagem & Solo' },
          { chave: 'peso_aco', label: 'Armação em Aço CA-50', valor: totAco, unidade: 'kg', categoria: 'Estrutura & Fôrmas' },
          { chave: 'volume_lastro', label: 'Lastro Concreto Magro', valor: totLastro, unidade: 'm³', categoria: 'Estrutura & Fôrmas' },
          { chave: 'volume_reaterro', label: 'Volume de Reaterro', valor: totReaterro, unidade: 'm³', categoria: 'Terraplenagem & Solo' },
          { chave: 'volume_botafora', label: 'Solo Bota-fora (Empolado)', valor: totBotaFora, unidade: 'm³', categoria: 'Terraplenagem & Solo' },
        ]);
        updatedTarget.observacaoMemoria = 'Blocos de Fundação';
      } else if (modoCalculoModal === 'tabela_tubuloes') {
        let totConcreto = 0, totEscavFuste = 0, totEscavBase = 0, totEscav = 0, totAco = 0, totLastro = 0, totBotaFora = 0;

        tubuloesListModal.forEach(t => {
          const q = t.quantidade || 0;
          const dF = t.diametroFusteM || 0;
          const hF = t.alturaFusteM || 0;
          const dB = t.diametroBaseM || 0;
          const hB = t.alturaBaseM || 0;
          const hRod = t.alturaRodapeBaseM || 0.20;

          const vFusteUnit = (Math.PI * (dF * dF) / 4) * hF;
          const vTroncoConeUnit = (Math.PI * hB / 12) * (dB * dB + dB * dF + dF * dF);
          const vRodapeUnit = (Math.PI * (dB * dB) / 4) * hRod;
          const vBaseUnit = vTroncoConeUnit + vRodapeUnit;

          const vConcTot = q * (vFusteUnit + vBaseUnit);
          const vEscFuste = q * vFusteUnit;
          const vEscBase = q * vBaseUnit;
          const vEscTot = vEscFuste + vEscBase;
          const pAco = vConcTot * (tubuloesHeaderModal.taxaArmacaoKgM3 || 90);
          const vLastro = q * (Math.PI * (dB * dB) / 4) * (tubuloesHeaderModal.lastroEspessuraM || 0.05);
          const vBotaFora = vEscTot * (1 + (tubuloesHeaderModal.empolamentoBotaForaPerc || 30) / 100);

          totConcreto += vConcTot;
          totEscavFuste += vEscFuste;
          totEscavBase += vEscBase;
          totEscav += vEscTot;
          totAco += pAco;
          totLastro += vLastro;
          totBotaFora += vBotaFora;
        });

        exportParams([
          { chave: 'volume_concreto', label: 'Volume de Concreto de Tubulão', valor: totConcreto, unidade: 'm³', categoria: 'Fundação Profunda' },
          { chave: 'volume_escavacao_fuste', label: 'Escavação de Fuste Mecanizado', valor: totEscavFuste, unidade: 'm³', categoria: 'Fundação Profunda' },
          { chave: 'volume_escavacao_base', label: 'Escavação de Base Manual', valor: totEscavBase, unidade: 'm³', categoria: 'Fundação Profunda' },
          { chave: 'volume_escavacao_total', label: 'Volume Total de Escavação', valor: totEscav, unidade: 'm³', categoria: 'Fundação Profunda' },
          { chave: 'peso_aco', label: 'Armação em Aço CA-50/CA-60', valor: totAco, unidade: 'kg', categoria: 'Fundação Profunda' },
          { chave: 'volume_lastro', label: 'Lastro Concreto Magro', valor: totLastro, unidade: 'm³', categoria: 'Fundação Profunda' },
          { chave: 'volume_botafora', label: 'Bota-fora de Solo Excedente', valor: totBotaFora, unidade: 'm³', categoria: 'Fundação Profunda' }
        ]);
        updatedTarget.observacaoMemoria = 'Tubulões a Céu Aberto';
      } else if (modoCalculoModal === 'tabela_estacas') {
        let totConcreto = 0, totPerfuracao = 0, totAco = 0, totLama = 0, totArrasamento = 0, totBotaFora = 0;

        estacasListModal.forEach(e => {
          const q = e.quantidade || 0;
          const d = (e.diametroM || 0.40);
          const prof = Math.abs((e.cotaArrasamentoM || -1) - (e.cotaApoioM || -12));
          const hArr = Math.abs((e.cotaSoloM || 0) - (e.cotaArrasamentoM || -1));

          const areaSec = (Math.PI * (d * d)) / 4;
          const vEstaca = q * areaSec * prof;
          const perfLin = q * prof;
          const pAco = vEstaca * (estacasHeaderModal.taxaArmacaoKgM3 || 90);
          const vLama = e.tipoEstaca === 'escavada' ? vEstaca * 1.20 : 0;
          const vArras = q * areaSec * hArr;
          const vBotaFora = vEstaca * (1 + (estacasHeaderModal.empolamentoBotaForaPerc || 30) / 100);

          totConcreto += vEstaca;
          totPerfuracao += perfLin;
          totAco += pAco;
          totLama += vLama;
          totArrasamento += vArras;
          totBotaFora += vBotaFora;
        });

        exportParams([
          { chave: 'volume_concreto', label: 'Volume de Concreto para Estacas', valor: totConcreto, unidade: 'm³', categoria: 'Fundação Profunda' },
          { chave: 'metragem_perfuracao', label: 'Extensão de Perfuração de Solo', valor: totPerfuracao, unidade: 'm', categoria: 'Fundação Profunda' },
          { chave: 'peso_aco', label: 'Armação em Aço em Estacas', valor: totAco, unidade: 'kg', categoria: 'Fundação Profunda' },
          { chave: 'volume_lama_bentonitica', label: 'Volume de Lama Bentonítica / Polímero', valor: totLama, unidade: 'm³', categoria: 'Fundação Profunda' },
          { chave: 'volume_arrasamento', label: 'Volume de Concreto para Arrasamento', valor: totArrasamento, unidade: 'm³', categoria: 'Fundação Profunda' },
          { chave: 'volume_botafora', label: 'Bota-fora de Solo Excedente', valor: totBotaFora, unidade: 'm³', categoria: 'Fundação Profunda' }
        ]);
        updatedTarget.observacaoMemoria = 'Estacas de Fundação';
      } else if (modoCalculoModal === 'tabela_premoldados') {
        let totVol = 0, totComp = 0, totPregos = 0, totSarrafos = 0, totPontaletes = 0, totDesmoldante = 0, totGuindasteHoras = 0;

        premoldadosListModal.forEach(p => {
          const q = p.quantidade || 0;
          const l = p.comprimentoL || 0;
          const b = p.menorDimB || 0;
          const h = p.maiorDimH || 0;
          const reaprov = Math.max(1, p.reaproveitamentoForma || 1);
          const perda = 1 + (premoldadosHeaderModal.perdaMadeiraPerc || 20) / 100;
          const consPrego = premoldadosHeaderModal.consumoPregosKgM2 || 0.20;

          const vUnit = l * b * h;
          const vTotal = q * vUnit;
          const jogosForma = Math.ceil(q / reaprov);

          const areaForma1PecaSemPerda = (b + 0.10) * l + (b + 0.10) * h;
          const areaCompensado1Peca = areaForma1PecaSemPerda * perda;
          const areaCompensadoTotalObra = areaCompensado1Peca * jogosForma;

          const areaFormaConfecTotal = areaCompensado1Peca * q;
          const pesoPregosTotalKg = areaFormaConfecTotal * consPrego * perda;

          const sarrafos1Peca = (l * 4 + (l / 0.4) * b + h * ((b + 0.10) / 0.4) + (b + 0.10)) * perda;
          const compSarrafosTotalObra = sarrafos1Peca * jogosForma;

          const pontaletes1Peca = (l * 4) * perda;
          const compPontaletesTotalObra = pontaletes1Peca * jogosForma;

          const areaDesmoldante1Peca = l * b;
          const areaDesmoldanteTotalObra = areaDesmoldante1Peca * q;

          const taxaMont = Math.max(1, premoldadosHeaderModal.taxaMontagemPecasDia || 10);
          const diasGuindaste = Math.ceil(q / taxaMont);
          const horasGuindaste50t = diasGuindaste * 10 + 20;

          totVol += vTotal;
          totComp += areaCompensadoTotalObra;
          totPregos += pesoPregosTotalKg;
          totSarrafos += compSarrafosTotalObra;
          totPontaletes += compPontaletesTotalObra;
          totDesmoldante += areaDesmoldanteTotalObra;
          totGuindasteHoras += horasGuindaste50t;
        });

        exportParams([
          { chave: 'volume_concreto', label: 'Volume de Concreto Pré-Moldado', valor: totVol, unidade: 'm³', categoria: 'Estrutura & Fôrmas' },
          { chave: 'area_compensado', label: 'Compensado Plastificado / Resinado', valor: totComp, unidade: 'm²', categoria: 'Estrutura & Fôrmas' },
          { chave: 'peso_pregos', label: 'Pregos para Fôrma de Confecção', valor: totPregos, unidade: 'kg', categoria: 'Estrutura & Fôrmas' },
          { chave: 'comp_sarrafos', label: 'Sarrafos de Madeira 1" x 4"', valor: totSarrafos, unidade: 'm', categoria: 'Estrutura & Fôrmas' },
          { chave: 'comp_pontaletes', label: 'Pontaletes de Madeira 3" x 3"', valor: totPontaletes, unidade: 'm', categoria: 'Estrutura & Fôrmas' },
          { chave: 'area_desmoldante', label: 'Desmoldante / Concreto Aparente', valor: totDesmoldante, unidade: 'm²', categoria: 'Paredes & Vedações' },
          { chave: 'horas_guindaste', label: 'Guindaste 50 Ton (Montagem/Ereção)', valor: totGuindasteHoras, unidade: 'horas', categoria: 'Equipamentos & Logística' },
        ]);
        updatedTarget.observacaoMemoria = 'Planilha Esquemática de Elementos Pré-Moldados (7 Variáveis Exportadas)';
      } else if (modoCalculoModal === 'tabela_piso_concreto') {
        const areaPiso = pisoConcretoHeaderModal.areaPisoTotalM2 || 7950;
        const esp = pisoConcretoHeaderModal.espessuraM || 0.16;
        const volConc = areaPiso * esp * 1.05;

        const modW = Math.max(1, pisoConcretoHeaderModal.modulacaoLarguraM || 12.5);
        const modL = Math.max(1, pisoConcretoHeaderModal.modulacaoComprimentoM || 10.0);
        const extJuntasM2 = (2 * (modW + modL)) / (modW * modL);
        const extJuntasTotalM = extJuntasM2 * areaPiso;

        const dBarra = pisoConcretoHeaderModal.barraTransferenciaDiametroMm || 25;
        const pBarraLin = Math.ceil(Math.PI * Math.pow(dBarra / 2000, 2) * 7850 * 100) / 100;
        const espacBarra = Math.max(0.1, (pisoConcretoHeaderModal.barraTransferenciaEspacamentoCm || 30) / 100);
        const compBarra = (pisoConcretoHeaderModal.barraTransferenciaComprimentoCm || 50) / 100;
        const pesoBarraTotalKg = (extJuntasTotalM / espacBarra) * compBarra * pBarraLin;

        const isTela = pisoConcretoHeaderModal.modoArmacao === 'TELA';
        const pesoFibraKg = !isTela ? (pisoConcretoHeaderModal.consumoFibraKgM3 || 20) * volConc : 0;

        exportParams([
          { chave: 'volume_concreto', label: 'Volume de Concreto Usinado bombeável (5% Perda)', valor: volConc, unidade: 'm³', categoria: 'Pisos & Pavimentação' },
          { chave: 'extensao_juntas', label: 'Extensão Total de Juntas de Dilatação', valor: extJuntasTotalM, unidade: 'm', categoria: 'Pisos & Pavimentação' },
          { chave: 'peso_barras_transferencia', label: 'Massa de Barras de Transferência CA-50', valor: pesoBarraTotalKg, unidade: 'kg', categoria: 'Pisos & Pavimentação' },
          { chave: 'peso_fibra_aco', label: 'Massa de Fibra de Aço Estrutural', valor: pesoFibraKg, unidade: 'kg', categoria: 'Pisos & Pavimentação' },
          { chave: 'area_lona_plastica', label: 'Lona Plástica 0,15mm de Base (10% sobreposição)', valor: areaPiso * 1.10, unidade: 'm²', categoria: 'Pisos & Pavimentação' },
          { chave: 'metragem_trelicas', label: 'Treliça de Sustentação para Barras', valor: extJuntasTotalM * 2, unidade: 'm', categoria: 'Pisos & Pavimentação' },
          { chave: 'junta_labio_polimerico', label: 'Junta de Lábio Polimérico (Alta Solicitação)', valor: extJuntasTotalM * (pisoConcretoHeaderModal.percentualLabiopolimerico || 0), unidade: 'm', categoria: 'Pisos & Pavimentação' },
          { chave: 'junta_poliuretano', label: 'Junta Selada em Poliuretano (PU)', valor: extJuntasTotalM * (pisoConcretoHeaderModal.percentualPoliuretano ?? 0.8), unidade: 'm', categoria: 'Pisos & Pavimentação' },
          { chave: 'junta_epoxi', label: 'Junta Selada em Epóxi Semi-Rígido', valor: extJuntasTotalM * (pisoConcretoHeaderModal.percentualEpoxi ?? 0.2), unidade: 'm', categoria: 'Pisos & Pavimentação' },
        ]);
        updatedTarget.observacaoMemoria = 'Planilha Esquemática de Piso em Concreto Industrial (9 Variáveis Exportadas)';
      } else if (modoCalculoModal === 'tabela_drenagem') {
        const cxs = drenagemHeaderModal.listaCaixas || [];
        const tubs = drenagemHeaderModal.listaTubulacoes || [];
        const emp = drenagemHeaderModal.fatorEmpolamentoBotaFora || 1.10;

        let totEscav = 0;
        let totApil = 0;
        let totLastroConc = 0;
        let totConcLajes = 0;
        let totBlocos = 0;
        let totReaterro = 0;
        let totBotaFora = 0;
        let totTampaoFF = 0;

        cxs.forEach(cx => {
          const q = cx.quantidade || 1;
          const b = cx.comprimentoM || 1.60;
          const h = cx.larguraM || 1.60;
          const prof = cx.profundidadeM || 1.50;
          const eB = cx.espessuraBlocoM || 0.14;
          const fLat = cx.folgaEscavacaoM || 0.30;
          const eLastro = cx.espessuraLastroM || 0.05;
          const eFundo = cx.espessuraLajeFundoM || 0.08;
          const eTampa = cx.espessuraLajeTampaM || 0.08;

          const vEscav1 = (b + 2 * eB + 2 * fLat) * (h + 2 * eB + 2 * fLat) * prof;
          const aApil1 = (b + 2 * eB) * (h + 2 * eB);
          const vLastro1 = aApil1 * eLastro + (b * h) * 0.07;
          const vFundo1 = aApil1 * eFundo;
          const vTampa1 = cx.fechamento === 'Aberto' ? 0 : Math.max(0, vFundo1 - Math.PI * Math.pow(0.30, 2) * eTampa);
          const blocos1 = Math.ceil((2 * (b + eB) + 2 * (h + eB)) * prof * 13.1);
          const vCaixaBruta = (b + 2 * eB) * (h + 2 * eB) * (prof + eFundo + eTampa);
          const vReaterro1 = Math.max(0, vEscav1 - vCaixaBruta);

          totEscav += vEscav1 * q;
          totApil += aApil1 * q;
          totLastroConc += vLastro1 * q;
          totConcLajes += (vFundo1 + vTampa1) * q;
          totBlocos += blocos1 * q;
          totReaterro += vReaterro1 * q;
          totBotaFora += (vEscav1 - vReaterro1 * emp) * q;
          if (cx.fechamento === 'Tampão FF') totTampaoFF += q;
        });

        let totTubosExt = 0;
        let totLastroAreia = 0;

        tubs.forEach(tub => {
          const dM = (tub.diametroMm || 600) / 1000;
          const lM = tub.comprimentoM || 0;
          const profMed = tub.profundidadeMediaM || 1.50;
          const bVala = dM + (tub.folgaLarguraValaM || 0.60);
          const vEscavVala = bVala * profMed * lM;
          const vLastroVala = bVala * (tub.espessuraLastroAreiaM || 0.10) * lM;
          const vTubo = Math.PI * Math.pow(dM / 2, 2) * lM;
          const vReaterroVala = Math.max(0, vEscavVala - vLastroVala - vTubo);

          totEscav += vEscavVala;
          totApil += bVala * lM;
          totLastroAreia += vLastroVala;
          totTubosExt += lM;
          totReaterro += vReaterroVala;
          totBotaFora += Math.max(0, vEscavVala - vReaterroVala * emp);
        });

        exportParams([
          { chave: 'volume_escavacao', label: 'Volume de Escavação de Caixas e Valas', valor: totEscav, unidade: 'm³', categoria: 'Infraestrutura & Drenagem' },
          { chave: 'area_apiloamento', label: 'Apiloamento de Fundo de Caixas e Valas', valor: totApil, unidade: 'm²', categoria: 'Infraestrutura & Drenagem' },
          { chave: 'volume_lastro_concreto', label: 'Lastro Magro e=5cm para Caixas', valor: totLastroConc, unidade: 'm³', categoria: 'Infraestrutura & Drenagem' },
          { chave: 'volume_concreto_lajes', label: 'Concreto fck 25 MPa para Lajes de Caixas', valor: totConcLajes, unidade: 'm³', categoria: 'Infraestrutura & Drenagem' },
          { chave: 'quantidade_blocos', label: 'Bloco de Concreto Estrutural 14cm/19cm', valor: totBlocos, unidade: 'un', categoria: 'Infraestrutura & Drenagem' },
          { chave: 'lastro_areia_tubos', label: 'Lastro de Areia/Brita e=10cm sob Tubos', valor: totLastroAreia, unidade: 'm³', categoria: 'Infraestrutura & Drenagem' },
          { chave: 'extensao_tubulacoes', label: 'Extensão Total de Assentamento de Tubos', valor: totTubosExt, unidade: 'm', categoria: 'Infraestrutura & Drenagem' },
          { chave: 'volume_reaterro', label: 'Reaterro Compactado de Caixas e Valas', valor: totReaterro, unidade: 'm³', categoria: 'Infraestrutura & Drenagem' },
          { chave: 'volume_botafora', label: 'Bota-fora de Solo Excedente (Empolam 1.10)', valor: totBotaFora, unidade: 'm³', categoria: 'Infraestrutura & Drenagem' },
          { chave: 'tampao_ferro_fundido', label: 'Tampão de Ferro Fundido Dúctil Ø60cm', valor: totTampaoFF, unidade: 'un', categoria: 'Infraestrutura & Drenagem' }
        ]);
        updatedTarget.observacaoMemoria = 'Planilha Esquemática de Rede de Drenagem Pluvial (10 Variáveis Exportadas)';
      } else if (modoCalculoModal === 'tabela_pits') {
        const pits = pitsHeaderModal.listaPits || [];
        let volAguaTot = 0;
        let volConcTot = 0;
        let areaFormaTot = 0;
        let pesoAcoTot = 0;
        let volCimbTot = 0;
        let volLastroTot = 0;
        let volEscavTot = 0;
        let areaApilTot = 0;
        let volReaterroTot = 0;
        let volBotaForaTot = 0;
        let areaImperTot = 0;

        pits.forEach(pit => {
          const cx = pit.numeroCaixas || 1;
          const pint1 = pit.comprimentoInternoM || 22.00;
          const pint2 = pit.larguraInternaM || 17.50;
          const hint = pit.alturaInternaM || 2.45;
          const ep = pit.espessuraParedeM || 0.15;
          const linf = pit.espessuraLajeInfM || 0.15;
          const lsup = pit.espessuraLajeSupM || 0.15;
          const epdiv = pit.espessuraDivisoriaM || 0.15;
          const pdiv = Math.max(1, pit.numDivisoria || 1);
          const cf = pit.chanfroM || 0;
          const txAco = pit.taxaAcoKgM3 || 150;
          const emp = pit.fatorEmpolamento || 1.20;
          const eLastro = pit.espessuraLastroM || 0.05;

          const pext1 = pint1 + 2 * ep;
          const pext2 = pint2 + 2 * ep;
          const hext = hint + linf + lsup;

          const volAgua1 = (pint1 * pint2 - Math.pow(cf, 2) * 2) * hint - ((pint2 * 2 + pint1 * 2) * Math.pow(cf, 2) / 2) - pint1 * epdiv * hint * (pdiv - 1);
          const vParedes = ((pint1 + pint2) * 2 * ep + Math.pow(ep, 2) * 4 + Math.pow(cf, 2) * 2) * hint + (pint1 + pint2) * Math.pow(cf, 2);
          const aFormaParedes = (pint1 + pint2) * 2 * hint + (pext1 + pext2) * 2 * (hext - linf);
          const vDiv = (pint1 * hint * epdiv + Math.pow(cf, 2) * 2 * hint) * (pdiv - 1);
          const aFormaDiv = pint1 * hint * 2 * (pdiv - 1);
          const vInf = pext1 * pext2 * linf;
          const aFormaInf = (pext1 + pext2) * 2 * linf;
          const vSup = pext1 * pext2 * lsup;
          const aFormaSup = lsup > 0 ? pint1 * pint2 : 0;
          const cimb1 = aFormaSup * hint;

          const escavLat = pext1 / 3;
          const lastro1 = (pext1 * pext2) * eLastro;
          const volBrutoBox = pext1 * pext2 * (hext + eLastro);
          const vEscav1 = (pext1 + escavLat) * (pext2 + escavLat) * (hext + eLastro);
          const apil1 = pext1 * pext2;
          const vReaterro1 = Math.max(0, vEscav1 - volBrutoBox);
          const vBotaFora1 = Math.max(0, vEscav1 - vReaterro1 * emp);

          volAguaTot += volAgua1 * cx;
          volConcTot += (vParedes + vDiv + vInf + vSup) * cx;
          areaFormaTot += (aFormaParedes + aFormaDiv + aFormaInf + aFormaSup) * cx;
          pesoAcoTot += (vParedes + vDiv + vInf + vSup) * txAco * cx;
          volCimbTot += cimb1 * cx;
          volLastroTot += lastro1 * cx;
          volEscavTot += vEscav1 * cx;
          areaApilTot += apil1 * cx;
          volReaterroTot += vReaterro1 * cx;
          volBotaForaTot += vBotaFora1 * cx;

          if (pit.isImpermeabilizado) {
            areaImperTot += ((pint1 + pint2) * 2 * hint + (pint1 * pint2) + aFormaDiv) * cx;
          }
        });

        exportParams([
          { chave: 'volume_util_agua', label: 'Volume Útil Total de Água / Capacidade', valor: volAguaTot, unidade: 'm³', categoria: 'Reservatórios & PITs' },
          { chave: 'volume_concreto_estrutural', label: 'Concreto Armado fck 30 MPa (Paredes/Lajes)', valor: volConcTot, unidade: 'm³', categoria: 'Reservatórios & PITs' },
          { chave: 'area_forma_compensada', label: 'Fôrma de Madeira Plastificada 3X Uso', valor: areaFormaTot, unidade: 'm²', categoria: 'Reservatórios & PITs' },
          { chave: 'peso_aco_estrutural', label: 'Massa de Aço CA-50 Cortado/Dobrado', valor: pesoAcoTot, unidade: 'kg', categoria: 'Reservatórios & PITs' },
          { chave: 'volume_cimbramento_tampa', label: 'Cimbramento Tubular de Laje Superior', valor: volCimbTot, unidade: 'm³', categoria: 'Reservatórios & PITs' },
          { chave: 'volume_lastro_magro', label: 'Lastro Magro e=5cm para Fundo', valor: volLastroTot, unidade: 'm³', categoria: 'Reservatórios & PITs' },
          { chave: 'volume_escavacao', label: 'Escavação Mecânica com Folga Lateral', valor: volEscavTot, unidade: 'm³', categoria: 'Reservatórios & PITs' },
          { chave: 'area_apiloamento_fundo', label: 'Apiloamento do Fundo de Escavação', valor: areaApilTot, unidade: 'm²', categoria: 'Reservatórios & PITs' },
          { chave: 'volume_reaterro_compactado', label: 'Reaterro Compactado Lateral', valor: volReaterroTot, unidade: 'm³', categoria: 'Reservatórios & PITs' },
          { chave: 'volume_botafora_solo', label: 'Bota-fora Excedente (Empolamento 1.20)', valor: volBotaForaTot, unidade: 'm³', categoria: 'Reservatórios & PITs' },
          { chave: 'area_impermeabilizacao', label: 'Impermeabilização Múltipla Camada', valor: areaImperTot, unidade: 'm²', categoria: 'Reservatórios & PITs' }
        ]);
        updatedTarget.observacaoMemoria = 'Planilha Esquemática de Reservatório / PIT Enterrado (11 Variáveis Exportadas)';
      } else if (modoCalculoModal === 'tabela_superestrutura') {
        const pecas = superestruturaHeaderModal.listaPecas || [];
        let fInLoco = 0;
        let cInLoco = 0;
        let aInLoco = 0;
        let cimbInLoco = 0;

        let fPreMold = 0;
        let cPreMold = 0;
        let aPreMold = 0;
        let qPreMold = 0;

        pecas.forEach(p => {
          const rep = (p.numPavimentos || 1) * (p.numEdificacoes || 1);
          const q = p.quantidadePavimento || 1;
          const g = p.larguraM || 0;
          const h = p.alturaM || 0;
          const i = p.comprimentoM || 0;
          const k = p.descontoEspessuraLajeM || 0;
          const descForma = p.descontoFormaM2 || 0;
          const descConc = p.descontoConcretoM3 || 0;
          const txAco = p.taxaAcoKgM3 || 100;
          const peDireito = p.peDireitoCimbramentoM || 0;

          let perimForma = 0;
          if (p.tipoPeca === 'V') perimForma = (h * 2) + g - k;
          else if (p.tipoPeca === 'P') perimForma = (g + i) * 2;
          else if (p.tipoPeca === 'PC') perimForma = Math.PI * g;

          let areaForma1 = 0;
          if (p.tipoPeca === 'V') areaForma1 = ((i * perimForma) - descForma) * q;
          else if (p.tipoPeca === 'P') areaForma1 = ((h * perimForma) - descForma) * q;
          else if (p.tipoPeca === 'PC') areaForma1 = ((perimForma * h) - descForma) * q;
          else areaForma1 = ((g * i) - descForma) * q;

          const areaFormaTotal = Math.max(0, areaForma1 * rep);

          let volConc1 = 0;
          if (p.tipoPeca === 'PC') volConc1 = Math.max(0, (Math.PI * Math.pow(g, 2) / 4) * h * q - descConc * q);
          else volConc1 = Math.max(0, (g * h * i - descConc) * q);

          const volConcTotal = volConc1 * rep;
          const pesoAcoTotal = volConcTotal * txAco;
          const totalPecasUn = q * rep;

          let cimb1 = 0;
          if (p.tipoPeca === 'L') cimb1 = g * i * q * peDireito * rep;
          else if (p.tipoPeca === 'V') cimb1 = i * q * (g + 1.20) * peDireito * rep;

          if (p.modalidade === 'IN_LOCO') {
            fInLoco += areaFormaTotal;
            cInLoco += volConcTotal;
            aInLoco += pesoAcoTotal;
            cimbInLoco += cimb1;
          } else {
            fPreMold += areaFormaTotal;
            cPreMold += volConcTotal;
            aPreMold += pesoAcoTotal;
            qPreMold += totalPecasUn;
          }
        });

        exportParams([
          { chave: 'volume_concreto_inloco', label: 'Concreto Armado Usinado Estrutura In-Loco', valor: cInLoco, unidade: 'm³', categoria: 'Superestrutura' },
          { chave: 'area_forma_inloco', label: 'Fôrma de Madeira Compensada Estrutura In-Loco', valor: fInLoco, unidade: 'm²', categoria: 'Superestrutura' },
          { chave: 'peso_aco_inloco', label: 'Aço CA-50/CA-60 Estrutura In-Loco', valor: aInLoco, unidade: 'kg', categoria: 'Superestrutura' },
          { chave: 'volume_cimbramento_inloco', label: 'Cimbramento Tubular Vigas/Lajes In-Loco', valor: cimbInLoco, unidade: 'm³', categoria: 'Superestrutura' },
          { chave: 'volume_concreto_premoldado', label: 'Concreto para Peças Pré-Moldadas', valor: cPreMold, unidade: 'm³', categoria: 'Superestrutura' },
          { chave: 'area_forma_premoldado', label: 'Fôrma de Fábrica / Metálica Pré-Moldados', valor: fPreMold, unidade: 'm²', categoria: 'Superestrutura' },
          { chave: 'peso_aco_premoldado', label: 'Aço CA-50 / CP-190 Estrutura Pré-Moldada', valor: aPreMold, unidade: 'kg', categoria: 'Superestrutura' },
          { chave: 'quantidade_pecas_premoldadas', label: 'Total de Peças Pré-Moldadas Fabricadas', valor: qPreMold, unidade: 'un', categoria: 'Superestrutura' }
        ]);
        updatedTarget.observacaoMemoria = 'Planilha Esquemática de Superestrutura In-Loco/Pré-Moldada (8 Variáveis Exportadas)';
      } else if (modoCalculoModal === 'tabela_esquadrias') {
        let areaPisoTotal = 0;
        let areaTetoTotal = 0;
        let areaParedeBrutaTotal = 0;
        let descontoVaosParedeTotal = 0;
        let rodapeLiquidoTotal = 0;
        let areaCaixilhosTotal = 0;
        let areaPinturaEsquadriasTotal = 0;
        let areaVidrosTotal = 0;
        let areaImpermeabilizacaoTotal = 0;

        comodosListModal.forEach(c => {
          const qComodos = c.quantidadeComodos || 0;
          const nPav = c.numPavimentos || 0;
          const nEdif = c.numEdificios || 0;

          let repeticoes = qComodos;
          if (nPav + nEdif > 0) {
            if (nPav === 0 || nEdif === 0) repeticoes *= (nPav + nEdif);
            else repeticoes *= (nPav * nEdif);
          }

          const larg = c.larguraM || 0;
          const comp = c.comprimentoM || 0;
          const peDir = c.peDireitoM || 0;

          const perimetroTeorico = (larg > 0 && comp > 0) ? 2 * (larg + comp) : (larg + comp);

          const areaPisoUnit = larg * comp + (c.outrosPisoM2 || 0);
          const areaTetoUnit = larg * comp + (c.outrosTetoM2 || 0);
          const areaParedeBrutaUnit = perimetroTeorico * peDir + (c.outrosParedeM2 || 0);

          let descVaosParedeUnit = 0;
          let descRodapePortasUnit = 0;

          (c.vaos || []).forEach(v => {
            const qVao = v.quantidade || 0;
            const lVao = v.larguraM || 0;
            const hVao = v.alturaM || 0;
            const areaVao = lVao * hVao * qVao;

            let descVaoCalculado = areaVao;
            if (esquadriasHeaderModal.aplicarRegraTCPO) {
              descVaoCalculado = Math.max(0, areaVao - 2.0 * qVao);
            }

            descVaosParedeUnit += descVaoCalculado;

            if (v.tipo === 'porta') {
              descRodapePortasUnit += lVao * qVao;
            }

            const areaCaixilhoUnit = areaVao;
            const coefPint = v.coeficientePintura || 2;
            const areaPinturaUnit = (lVao * hVao * coefPint - v.descontoPinturaM2 * 2) * qVao;

            const lArred = Math.ceil(lVao / 0.05) * 0.05;
            const hArred = Math.ceil(hVao / 0.05) * 0.05;
            const areaVidroUnit = Math.max(0, (lArred * hArred * qVao) - (v.descontoVidroM2 * qVao));

            areaCaixilhosTotal += areaCaixilhoUnit * repeticoes;
            areaPinturaEsquadriasTotal += areaPinturaUnit * repeticoes;
            areaVidrosTotal += areaVidroUnit * repeticoes;
          });

          const rodapeLiquidoUnit = Math.max(0, perimetroTeorico - descRodapePortasUnit + (c.outrosRodapeM || 0));
          const areaImperUnit = areaPisoUnit + perimetroTeorico * (c.alturaImpermeabilizacaoM || 0.60);

          areaPisoTotal += areaPisoUnit * repeticoes;
          areaTetoTotal += areaTetoUnit * repeticoes;
          areaParedeBrutaTotal += areaParedeBrutaUnit * repeticoes;
          descontoVaosParedeTotal += descVaosParedeUnit * repeticoes;
          rodapeLiquidoTotal += rodapeLiquidoUnit * repeticoes;
          areaImpermeabilizacaoTotal += areaImperUnit * repeticoes;
        });

        const areaParedeLiquidaTotal = Math.max(0, areaParedeBrutaTotal - descontoVaosParedeTotal);

        exportParams([
          { chave: 'area_parede_liquida', label: 'Área Líquida de Parede / Alvenaria', valor: areaParedeLiquidaTotal, unidade: 'm²', categoria: 'Esquadrias & Acabamentos' },
          { chave: 'area_piso', label: 'Área de Piso Total', valor: areaPisoTotal, unidade: 'm²', categoria: 'Esquadrias & Acabamentos' },
          { chave: 'area_teto', label: 'Área de Teto / Forro', valor: areaTetoTotal, unidade: 'm²', categoria: 'Esquadrias & Acabamentos' },
          { chave: 'rodape_liquido', label: 'Extensão Líquida de Rodapé', valor: rodapeLiquidoTotal, unidade: 'm', categoria: 'Esquadrias & Acabamentos' },
          { chave: 'area_caixilhos', label: 'Área de Caixilhos / Esquadrias', valor: areaCaixilhosTotal, unidade: 'm²', categoria: 'Esquadrias & Acabamentos' },
          { chave: 'area_pintura_esquadrias', label: 'Área de Pintura em Esquadrias', valor: areaPinturaEsquadriasTotal, unidade: 'm²', categoria: 'Esquadrias & Acabamentos' },
          { chave: 'area_vidros', label: 'Área de Vidros (Mult. 5cm)', valor: areaVidrosTotal, unidade: 'm²', categoria: 'Esquadrias & Acabamentos' },
          { chave: 'area_impermeabilizacao', label: 'Área de Impermeabilização', valor: areaImpermeabilizacaoTotal, unidade: 'm²', categoria: 'Esquadrias & Acabamentos' },
          { chave: 'area_parede_bruta', label: 'Área Bruta de Parede', valor: areaParedeBrutaTotal, unidade: 'm²', categoria: 'Esquadrias & Acabamentos' },
          { chave: 'desconto_vaos', label: 'Desconto Total de Vãos', valor: descontoVaosParedeTotal, unidade: 'm²', categoria: 'Esquadrias & Acabamentos' }
        ]);
        updatedTarget.observacaoMemoria = 'Esquadrias, Alvenarias & Acabamentos';
      }

      if (!modoCalculoModal && savedCustomFormulas.length === 0) {
        setEditingItemModal(null);
        return;
      }

      // Garante o nome correto e individual para cada tipo de planilha de cálculo
      let stepObs = 'Cálculo de Engenharia';
      if (modoCalculoModal === 'tabela_estacas') stepObs = 'Estacas de Fundação';
      else if (modoCalculoModal === 'tabela_sapatas') stepObs = 'Sapatas Isoladas';
      else if (modoCalculoModal === 'tabela_blocos') stepObs = 'Blocos de Coroamento';
      else if (modoCalculoModal === 'tabela_vigas') stepObs = 'Vigas Baldrames';
      else if (modoCalculoModal === 'tabela_tubuloes') stepObs = 'Tubulões de Fundação';
      else if (modoCalculoModal === 'tabela_premoldados') stepObs = 'Elementos Pré-Moldados';
      else if (modoCalculoModal === 'tabela_piso_concreto') stepObs = 'Piso Industrial / Concreto';
      else if (modoCalculoModal === 'tabela_drenagem') stepObs = 'Drenagem Pluvial & Canais';
      else if (modoCalculoModal === 'tabela_pits') stepObs = 'Reservatórios & PITs';
      else if (modoCalculoModal === 'tabela_superestrutura') stepObs = 'Superestrutura & Lajes';
      else if (modoCalculoModal === 'tabela_esquadrias') stepObs = 'Esquadrias & Acabamentos';
      else if (modoCalculoModal === 'formula') stepObs = selectedFormula ? selectedFormula.nome : 'Personalizar';

      let stepEq = `${stepObs}`;
      let stepSubst = `${stepObs} = ${updatedTarget.quantidade || 0} ${updatedTarget.unidade || ''}`;
      let stepResult = updatedTarget.quantidade || 0;

      if (modoCalculoModal === 'tabela_vigas') {
        const totalConcreto = vigasListModal.reduce((acc, v) => acc + ((v as any).largura || 0) * ((v as any).altura || 0) * ((v as any).comprimento || 0) * (v.quantidade || 1), 0);
        stepResult = totalConcreto > 0 ? totalConcreto : updatedTarget.quantidade || 0;
        stepEq = `Vigas Baldrames (${vigasListModal.length} elem.)`;
        stepSubst = `Vol. Concreto = ${stepResult.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³`;
      } else if (modoCalculoModal === 'tabela_sapatas') {
        const totalConcreto = sapatasListModal.reduce((acc, s) => acc + ((s as any).larguraMaior || 0) * ((s as any).comprimentoMaior || 0) * ((s as any).altura1 || 0) * (s.quantidade || 1), 0);
        stepResult = totalConcreto > 0 ? totalConcreto : updatedTarget.quantidade || 0;
        stepEq = `Sapatas Isoladas (${sapatasListModal.length} elem.)`;
        stepSubst = `Vol. Concreto = ${stepResult.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³`;
      } else if (modoCalculoModal === 'tabela_estacas') {
        const totalConcreto = estacasListModal.reduce((acc, e) => {
          const r = ((e as any).diametro || 0) / 2;
          return acc + (Math.PI * r * r * ((e as any).comprimentoSolo || (e as any).comprimento || 0) * (e.quantidade || 1));
        }, 0);
        stepResult = totalConcreto > 0 ? totalConcreto : updatedTarget.quantidade || 0;
        stepEq = `Estacas de Fundação (${estacasListModal.length} elem.)`;
        stepSubst = `Vol. Concreto = ${stepResult.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³`;
      } else if (modoCalculoModal === 'tabela_blocos') {
        const totalConcreto = blocosListModal.reduce((acc, b) => acc + ((b as any).larguraB || 0) * ((b as any).comprimentoA || 0) * ((b as any).alturaH1 || 0) * (b.quantidade || 1), 0);
        stepResult = totalConcreto > 0 ? totalConcreto : updatedTarget.quantidade || 0;
        stepEq = `Blocos de Coroamento (${blocosListModal.length} elem.)`;
        stepSubst = `Vol. Concreto = ${stepResult.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³`;
      } else if (modoCalculoModal === 'tabela_tubuloes') {
        const totalConcreto = tubuloesListModal.reduce((acc, t) => {
          const r = ((t as any).diametroFuste || (t as any).diametro || 0) / 2;
          return acc + (Math.PI * r * r * ((t as any).alturaFuste || (t as any).altura || 0) * (t.quantidade || 1));
        }, 0);
        stepResult = totalConcreto > 0 ? totalConcreto : updatedTarget.quantidade || 0;
        stepEq = `Tubulões de Fundação (${tubuloesListModal.length} elem.)`;
        stepSubst = `Vol. Concreto = ${stepResult.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³`;
      } else if (modoCalculoModal === 'formula' && !selectedFormula) {
        if (customTextLiteral && customTextLiteral.trim()) {
          const newStep = {
            id: `fstep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            equacaoLiteral: customTextLiteral.trim(),
            substituicaoNumerica: customTextSubst || customTextLiteral.trim(),
            resultado: customQtd || 0,
            unidade: customParamsList[0]?.unidade || 'm²'
          };
          const nextSaved = [...savedCustomFormulas, newStep];
          setSavedCustomFormulas(nextSaved);

          stepEq = nextSaved.map(s => s.equacaoLiteral).join(' | ');
          stepSubst = nextSaved.map(s => s.substituicaoNumerica).join(' | ');
          stepResult = nextSaved.reduce((acc, s) => acc + (s.resultado || 0), 0);

          // Exporta os parâmetros das fórmulas calculadas para insumos e composições filhas
          const customExportParams = nextSaved.map((s, idx) => ({
            chave: `custom_formula_${idx + 1}`,
            label: `Fórmula Personalizada #${idx + 1}: ${s.equacaoLiteral}`,
            valor: s.resultado,
            unidade: s.unidade,
            categoria: 'Personalizar'
          }));
          exportParams(customExportParams);

          setCustomTextLiteral('');
          setCustomTextSubst('');
          setCustomQtd(0);
        } else if (savedCustomFormulas.length > 0) {
          stepEq = savedCustomFormulas.map(s => s.equacaoLiteral).join(' | ');
          stepSubst = savedCustomFormulas.map(s => s.substituicaoNumerica).join(' | ');
          stepResult = savedCustomFormulas.reduce((acc, s) => acc + (s.resultado || 0), 0);
        }
      } else if (updatedTarget.parametrosLocais && updatedTarget.parametrosLocais.length > 0) {
        const mainParam = updatedTarget.parametrosLocais.find(p => p.chave === 'volume_concreto' || p.chave === 'volume_escavacao') || updatedTarget.parametrosLocais[0];
        if (mainParam) {
          stepEq = `${stepObs}: ${mainParam.label}`;
          const valNum = typeof mainParam.valor === 'number' ? mainParam.valor : parseFloat(String(mainParam.valor)) || 0;
          stepSubst = `${mainParam.label} = ${valNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${mainParam.unidade}`;
          if (valNum > 0) stepResult = valNum;
        }
      }

      const existingSteps = updatedTarget.formulasLista ? [...updatedTarget.formulasLista] : [];

      // Migra cálculo único pré-existente para a lista de abas acumuladas apenas se for diferente do novo cálculo
      if (existingSteps.length === 0 && (updatedTarget.equacaoLiteral || updatedTarget.observacaoMemoria)) {
        const legacyObs = (updatedTarget.observacaoMemoria || '').trim();
        if (legacyObs && legacyObs !== stepObs && !stepObs.includes(legacyObs) && !legacyObs.includes(stepObs)) {
          existingSteps.push({
            id: `f-legacy-${Date.now()}`,
            observacao: legacyObs,
            equacaoLiteral: updatedTarget.equacaoLiteral || '',
            substituicaoNumerica: updatedTarget.substituicaoNumerica || '',
            resultado: updatedTarget.quantidade || 0,
            modoCalculo: inferModoFromObs(legacyObs) as any
          });
        }
      }

      const editingStep = editingTabId ? existingSteps.find(s => s.id === editingTabId) : undefined;
      const shouldReplace = Boolean(
        editingTabId &&
        editingStep &&
        editingStep.modoCalculo === modoCalculoModal &&
        editingStep.observacao === stepObs
      );
      const stepId = shouldReplace
        ? editingTabId!
        : `f-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const activeStep = {
        id: stepId,
        observacao: stepObs,
        equacaoLiteral: stepEq,
        substituicaoNumerica: stepSubst,
        resultado: stepResult,
        modoCalculo: modoCalculoModal
      };

      // Só substitui a aba quando o cálculo aplicado é o mesmo que estava selecionado.
      // Ao aplicar outra medida, mantém a aba anterior e cria uma nova.
      const filteredSteps = shouldReplace
        ? existingSteps.filter(s => s.id !== editingTabId)
        : existingSteps;

      updatedTarget.formulasLista = [...filteredSteps, activeStep];

      const totalQtd = updatedTarget.formulasLista.reduce((acc, step) => acc + (typeof step.resultado === 'number' ? step.resultado : 0), 0);
      const obsLabels = Array.from(new Set(updatedTarget.formulasLista.map(f => f.observacao).filter(Boolean)));

      updatedTarget.equacaoLiteral = stepEq;
      updatedTarget.substituicaoNumerica = stepSubst;
      updatedTarget.observacaoMemoria = obsLabels.join(' + ');
      if (!updatedTarget.isSecao) {
        updatedTarget.quantidade = totalQtd > 0 ? totalQtd : stepResult;
      }

      copia[targetIndex] = updatedTarget;
      onChangeItens(copia);
      if (editingItemModal && editingItemModal.id === updatedTarget.id) {
        setEditingItemModal(updatedTarget);
      }
      setSelectedActiveCalcId(null);
      setEditingTabId(null);
      setModoCalculoModal('');
    }
  };

  const handleClearItemFormula = (index: number) => {
    const copia = [...itens];
    if (!copia[index]) return;
    copia[index] = {
      ...copia[index],
      equacaoLiteral: '',
      substituicaoNumerica: '',
      observacaoMemoria: '',
      formulaNome: '',
      formulasLista: [],
      parametrosLocais: []
    };
    onChangeItens(copia);
  };

  const handleRemoveItem = (index: number) => {
    const item = itens[index];
    if (!item) return;

    // Identifica itens filhos pertencentes à composição/subcomposição por EAP ou por recuo
    const parentEap = (item.item_eap || '').trim();
    const childrenIndices: number[] = [];

    if (parentEap) {
      const prefix = parentEap + '.';
      itens.forEach((other, idx) => {
        if (idx !== index && (other.item_eap || '').trim().startsWith(prefix)) {
          childrenIndices.push(idx);
        }
      });
    }

    // Se não encontrou por EAP, tenta por nivelamento de recuo (row level)
    if (childrenIndices.length === 0 && item.level !== undefined) {
      for (let i = index + 1; i < itens.length; i++) {
        const nextItem = itens[i];
        if (nextItem.level !== undefined && nextItem.level > item.level) {
          childrenIndices.push(i);
        } else {
          break;
        }
      }
    }

    if (childrenIndices.length > 0) {
      const confirmMsg = `A composição "${item.descricao || 'selecionada'}" possui ${childrenIndices.length} item(ns) filho(s) (insumos/subcomposições).\n\nDeseja excluir a composição e TODOS os seus itens filhos?`;
      if (!window.confirm(confirmMsg)) return;
    } else {
      const itemNome = item.descricao ? `"${item.descricao}"` : 'este item';
      if (!window.confirm(`Deseja realmente excluir ${itemNome}?`)) return;
    }

    const removeSet = new Set([index, ...childrenIndices]);
    const copia = itens.filter((_, i) => !removeSet.has(i));
    const novaLista = recalcularEAPsMemoria(copia);
    onChangeItens(novaLista);
  };

  // Desvincular fórmula calculada da linha ou de seu pai
  const handleUnlinkFormula = (index: number) => {
    const copia = itens.map(i => ({ ...i }));
    const item = copia[index];
    if (!item) return;

    item.formulasLista = [];
    item.equacaoLiteral = '';
    item.substituicaoNumerica = '';
    item.observacaoMemoria = '';

    onChangeItens(copia);
  };

  // Alteração manual de quantidade na tabela do memorial recalcula filhos proporcionalmente
  const handleManualQuantityChange = (index: number, val: number) => {
    const copia = itens.map(i => ({ ...i }));
    const item = copia[index];
    if (!item) return;

    const oldQty = item.quantidade || 0;
    item.quantidade = val;

    // Se houver fórmula vinculada no próprio item, limpa a fórmula manual pois a quantidade foi sobrescrita
    item.formulasLista = [];
    item.equacaoLiteral = '';
    item.substituicaoNumerica = '';
    item.observacaoMemoria = '';

    // Se for uma composição ou subcomposição que possui insumos/sub-itens filhos, recalcula proporcionalmente
    if (item.item_eap) {
      const parentEap = item.item_eap;
      const scaleFactor = oldQty > 0 ? val / oldQty : val;

      copia.forEach(child => {
        if (child.id !== item.id && child.item_eap && child.item_eap.startsWith(parentEap + '.')) {
          const currentChildQty = child.quantidade || 0;
          child.quantidade = oldQty > 0 ? currentChildQty * scaleFactor : currentChildQty;
        }
      });
    }

    onChangeItens(copia);
  };

  const handleBindSectionParameter = (
    index: number,
    param: { label: string; valor: number | string; unidade?: string; categoria?: string }
  ) => {
    const copia = itens.map(i => ({ ...i }));
    const item = copia[index];
    if (!item) return;

    const valNum = parseFloat(String(param.valor)) || 0;
    const oldQty = item.quantidade || 0;

    item.quantidade = valNum;

    item.observacaoMemoria = '';
    item.equacaoLiteral = '';
    item.substituicaoNumerica = `${param.label} = ${valNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${param.unidade || ''}`.trim();

    item.formulasLista = [
      {
        id: `param-bind-${Date.now()}`,
        observacao: '',
        equacaoLiteral: '',
        substituicaoNumerica: item.substituicaoNumerica,
        resultado: valNum,
        modoCalculo: 'parametro'
      }
    ];

    if (item.item_eap) {
      const parentEap = item.item_eap;
      const scaleFactor = oldQty > 0 ? valNum / oldQty : valNum;

      copia.forEach(child => {
        if (child.id !== item.id && child.item_eap && child.item_eap.startsWith(parentEap + '.')) {
          const currentChildQty = child.quantidade || 0;
          child.quantidade = oldQty > 0 ? currentChildQty * scaleFactor : currentChildQty;
        }
      });
    }

    onChangeItens(copia);
  };

  const syncGlobalParametersToItens = (
    dadosCompList: DadoComplementarItem[],
    itensList: ItemMemoriaOficial[]
  ): ItemMemoriaOficial[] => {
    const itemToParamMap = new Map<string, DadoComplementarItem>();

    (dadosCompList || []).forEach(dc => {
      const linkedIds = dc.itemIds && dc.itemIds.length > 0 ? dc.itemIds : (dc.itemId ? [dc.itemId] : []);
      linkedIds.forEach(id => {
        if (id) itemToParamMap.set(id, dc);
      });
    });

    return itensList.map(it => {
      const boundParam = itemToParamMap.get(it.id);
      if (boundParam) {
        const valNum = typeof boundParam.valor === 'number' ? boundParam.valor : parseFloat(String(boundParam.valor)) || 0;
        const paramLabel = boundParam.parametro || boundParam.parametroNome || 'Parâmetro Global';
        const paramUnit = boundParam.unidade || '';

        const obs = '';
        const eqLit = '';
        const subst = `${paramLabel} = ${valNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${paramUnit}`.trim();

        return {
          ...it,
          quantidade: valNum > 0 ? valNum : it.quantidade,
          observacaoMemoria: obs,
          equacaoLiteral: eqLit,
          substituicaoNumerica: subst,
          formulasLista: [
            {
              id: `param-bind-${it.id}`,
              observacao: obs,
              equacaoLiteral: eqLit,
              substituicaoNumerica: subst,
              resultado: valNum,
              modoCalculo: 'parametro'
            }
          ]
        };
      } else {
        if (it.substituicaoNumerica && (it.observacaoMemoria?.startsWith('PARÂMETRO GLOBAL:') || !it.observacaoMemoria)) {
          return {
            ...it,
            observacaoMemoria: '',
            equacaoLiteral: '',
            substituicaoNumerica: '',
            formulasLista: []
          };
        }
        return it;
      }
    });
  };

  const handleAddDadoComplementar = () => {
    if (!novoGlobalNome || !novoGlobalNome.trim()) return;
    const valNum = typeof novoGlobalValor === 'number' ? novoGlobalValor : parseFloat(String(novoGlobalValor)) || 0;

    let linkedItemDesc = '';
    if (novoGlobalItemId) {
      const foundItem = itens.find(i => i.id === novoGlobalItemId);
      if (foundItem) {
        linkedItemDesc = `${foundItem.item_eap ? `${foundItem.item_eap} - ` : ''}${foundItem.descricao}`;
      }
    }

    const novo: DadoComplementarItem = {
      id: `dc-${Date.now()}`,
      parametro: novoGlobalNome.trim(),
      parametroNome: novoGlobalTipo,
      valor: valNum,
      unidade: novoGlobalUnidade,
      itemId: novoGlobalItemId || undefined,
      itemDescricao: linkedItemDesc || undefined
    };
    const atual = [...(header.dadosComplementares || []), novo];
    onChangeHeader({ ...header, dadosComplementares: atual });

    const syncedItens = syncGlobalParametersToItens(atual, itens);
    onChangeItens(syncedItens);

    setNovoGlobalNome('');
    setNovoGlobalValor('');
    setNovoGlobalItemId('');
  };

  const handleUpdateDadoComplementar = (index: number, campo: keyof DadoComplementarItem, val: any) => {
    const atual = [...(header.dadosComplementares || [])];
    const item = { ...atual[index], [campo]: val };
    if (campo === 'parametroNome') {
      const found = CATALOGO_CAMPOS_SISTEMA.find(c => c.label === val);
      if (found) item.unidade = found.unidade;
    }
    atual[index] = item;
    onChangeHeader({ ...header, dadosComplementares: atual });

    const syncedItens = syncGlobalParametersToItens(atual, itens);
    onChangeItens(syncedItens);
  };

  const handleRemoveDadoComplementar = (index: number) => {
    const atual = (header.dadosComplementares || []).filter((_, i) => i !== index);
    onChangeHeader({ ...header, dadosComplementares: atual });
    if (selectedGlobalParamIndex >= atual.length) {
      setSelectedGlobalParamIndex(Math.max(0, atual.length - 1));
    }
    const syncedItens = syncGlobalParametersToItens(atual, itens);
    onChangeItens(syncedItens);
  };

  const handleToggleItemLinkToParam = (paramIndex: number, itemIdToToggle: string) => {
    const atual = [...(header.dadosComplementares || [])];
    if (!atual[paramIndex]) return;

    const param = { ...atual[paramIndex] };
    const currentItemIds = param.itemIds ? [...param.itemIds] : (param.itemId ? [param.itemId] : []);

    const idxInArray = currentItemIds.indexOf(itemIdToToggle);
    if (idxInArray >= 0) {
      currentItemIds.splice(idxInArray, 1);
    } else {
      currentItemIds.push(itemIdToToggle);
    }

    param.itemIds = currentItemIds;
    param.itemId = currentItemIds[0] || undefined;

    if (currentItemIds.length > 0) {
      const firstFound = itens.find(i => i.id === currentItemIds[0]);
      const firstDesc = firstFound ? `${firstFound.item_eap ? `${firstFound.item_eap} - ` : ''}${firstFound.descricao}` : '';
      param.itemDescricao = currentItemIds.length === 1 ? firstDesc : `${currentItemIds.length} itens vinculados`;
    } else {
      param.itemDescricao = undefined;
    }

    atual[paramIndex] = param;
    onChangeHeader({ ...header, dadosComplementares: atual });

    const syncedItens = syncGlobalParametersToItens(atual, itens);
    onChangeItens(syncedItens);
  };

  return (
    <div className="space-y-6">
      {/* PAINEL CLEAN DE DADOS DO PROJETO */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden text-xs">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 font-semibold text-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onVoltar && (
              <button
                type="button"
                onClick={onVoltar}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Voltar para a lista de memoriais de cálculo"
              >
                <ArrowLeft className="w-4 h-4 text-blue-600" />
                <span>Voltar para Memoriais</span>
              </button>
            )}
            <span className="text-sm font-bold text-slate-900">Memória de Cálculo de Engenharia</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMostrarMemorialGlobal(true)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Visualizar o relatório oficial de memória de cálculo completo de todos os itens do orçamento"
            >
              <FileText className="w-4 h-4 text-blue-400" />
              <span>Memorial de Cálculo Completo</span>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 bg-white">
          {/* CADASTRO DE PARÂMETROS GLOBAIS DA OBRA */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-600" />
                Parâmetros Globais da Obra
              </span>
              <span className="text-[11px] font-medium text-slate-500">
                ({(header.dadosComplementares || []).length} cadastrados no orçamento)
              </span>
            </div>

            {!readonly && (
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 items-end">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Descrição / Nome do Cálculo</label>
                    <input
                      type="text"
                      placeholder="Ex: Área Cobertura Bloco A"
                      value={novoGlobalNome}
                      onChange={(e) => setNovoGlobalNome(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Parâmetro Ref. do Sistema</label>
                    <select
                      value={novoGlobalTipo}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNovoGlobalTipo(val);
                        const found = CATALOGO_CAMPOS_SISTEMA.find(c => c.label === val);
                        if (found) setNovoGlobalUnidade(found.unidade);
                      }}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 bg-white font-medium text-slate-800"
                    >
                      {CATALOGO_CAMPOS_SISTEMA.map(c => (
                        <option key={c.chave} value={c.label}>
                          {c.label} ({c.unidade})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Valor Total</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={novoGlobalValor}
                        onChange={(e) => setNovoGlobalValor(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold outline-none text-blue-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Unidade</label>
                      <input
                        type="text"
                        readOnly
                        value={novoGlobalUnidade}
                        className="w-full p-2 border border-slate-200 bg-slate-100 rounded-lg text-xs font-mono font-bold text-slate-600 outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddDadoComplementar}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cadastrar Parâmetro Global</span>
                  </button>
                </div>
              </div>
            )}

            {/* VINCULAÇÃO DE ITENS AOS PARÂMETROS GLOBAIS (POSICIONADA ACIMA DA TABELA) */}
            {(header.dadosComplementares || []).length > 0 && !readonly && (
              <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 space-y-3 shadow-2xs mt-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-blue-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-700 shrink-0" />
                    <span className="font-bold text-xs text-blue-950 uppercase tracking-wide">
                      Vincular Itens do Orçamento aos Parâmetros Globais
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-blue-800">
                    Marque abaixo os itens do orçamento aos quais o parâmetro global se aplica (pode vincular a mais de um item).
                  </span>
                </div>

                {(() => {
                  const paramList = header.dadosComplementares || [];
                  const safeIdx = Math.min(selectedGlobalParamIndex, Math.max(0, paramList.length - 1));
                  const activeParam = paramList[safeIdx];
                  const activeLinkedIds = activeParam
                    ? (activeParam.itemIds && activeParam.itemIds.length > 0 ? activeParam.itemIds : (activeParam.itemId ? [activeParam.itemId] : []))
                    : [];
                  const validItens = itens.filter(i => (i.item_eap || i.descricao));

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                      {/* Seleção do Parâmetro */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-blue-900 block">1. Escolha o Parâmetro Global:</label>
                        <select
                          value={safeIdx}
                          onChange={(e) => setSelectedGlobalParamIndex(parseInt(e.target.value, 10))}
                          className="w-full p-2 bg-white border border-blue-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
                        >
                          {paramList.map((dc, i) => (
                            <option key={dc.id || i} value={i}>
                              {dc.parametro} ({dc.valor} {dc.unidade})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Lista de Checkboxes de Itens */}
                      <div className="md:col-span-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-blue-900 block">
                            2. Marque os itens que utilizarão o valor de "{activeParam?.parametro || 'Parâmetro'}":
                          </label>
                          <span className="text-[10px] font-bold bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full">
                            {activeLinkedIds.length} item(ns) vinculado(s)
                          </span>
                        </div>

                        <div className="bg-white p-2 rounded-lg border border-blue-200 max-h-44 overflow-y-auto space-y-1 divide-y divide-slate-100 text-xs shadow-inner">
                          {validItens.length === 0 ? (
                            <div className="text-slate-400 text-xs italic p-2 text-center">Nenhum item cadastrado no orçamento.</div>
                          ) : (
                            validItens.map((it) => {
                              const isChecked = activeLinkedIds.includes(it.id);
                              return (
                                <label
                                  key={it.id}
                                  className={`flex items-center gap-2.5 p-1.5 rounded-md transition-colors cursor-pointer ${
                                    isChecked ? 'bg-blue-50 text-blue-950 font-bold' : 'hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleItemLinkToParam(safeIdx, it.id)}
                                    className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                  <span className="flex-1 text-xs">
                                    {it.item_eap ? <span className="font-mono text-blue-800 font-bold mr-1.5">{it.item_eap}</span> : null}
                                    <span>{it.descricao || 'Item sem descrição'}</span>
                                    {it.unidade ? <span className="text-slate-400 font-normal ml-1">({it.unidade})</span> : null}
                                  </span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* TABELA DE PARÂMETROS GLOBAIS DA OBRA CADASTRADOS */}
            {(header.dadosComplementares || []).length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs mt-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="p-2.5">Descrição do Parâmetro</th>
                      <th className="p-2.5">Parâmetro do Sistema</th>
                      <th className="p-2.5">Itens Vinculados</th>
                      <th className="p-2.5 text-right">Valor Global</th>
                      <th className="p-2.5 text-center">Unidade</th>
                      {!readonly && <th className="p-2.5 text-center">Ações</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {header.dadosComplementares!.map((dc, idx) => {
                      const isEditingThisRow = editingGlobalIndex === idx;

                      return (
                        <tr key={dc.id || idx} className={`transition-colors ${isEditingThisRow ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'}`}>
                          <td className="p-2.5 font-bold text-slate-900">
                            {isEditingThisRow && !readonly ? (
                              <input
                                type="text"
                                value={dc.parametro}
                                onChange={(e) => handleUpdateDadoComplementar(idx, 'parametro', e.target.value)}
                                className="w-full px-2 py-1 border border-blue-400 bg-white rounded text-xs font-bold text-slate-900 outline-none shadow-2xs"
                              />
                            ) : (
                              <span>{dc.parametro}</span>
                            )}
                          </td>

                          <td className="p-2.5 text-slate-600 font-medium">
                            {isEditingThisRow && !readonly ? (
                              <select
                                value={dc.parametroNome || CATALOGO_CAMPOS_SISTEMA[0]?.label}
                                onChange={(e) => handleUpdateDadoComplementar(idx, 'parametroNome', e.target.value)}
                                className="w-full px-2 py-1 border border-blue-400 bg-white rounded text-xs font-medium text-slate-700 outline-none shadow-2xs"
                              >
                                {CATALOGO_CAMPOS_SISTEMA.map(c => (
                                  <option key={c.chave} value={c.label}>{c.label}</option>
                                ))}
                              </select>
                            ) : (
                              <span>{dc.parametroNome || 'Geral'}</span>
                            )}
                          </td>

                          <td className="p-2.5 text-slate-700 text-xs font-medium min-w-[220px]">
                            {(() => {
                              const linkedIds = dc.itemIds && dc.itemIds.length > 0 ? dc.itemIds : (dc.itemId ? [dc.itemId] : []);
                              if (linkedIds.length === 0) {
                                return <span className="text-slate-400 text-xs italic">Geral (Nenhum)</span>;
                              }
                              const linkedItems = itens.filter(i => linkedIds.includes(i.id));
                              return (
                                <div className="flex flex-wrap gap-1 items-center max-w-[320px]">
                                  {linkedItems.map(it => (
                                    <span key={it.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-md font-semibold text-[11px]">
                                      <Target className="w-3 h-3 text-blue-600 shrink-0" />
                                      <span className="truncate max-w-[180px]" title={it.descricao}>
                                        {it.item_eap ? `${it.item_eap} - ` : ''}{it.descricao}
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              );
                            })()}
                          </td>

                          <td className="p-2.5 text-right font-mono font-bold text-blue-900">
                            {isEditingThisRow && !readonly ? (
                              <input
                                type="number"
                                step="0.01"
                                value={dc.valor}
                                onChange={(e) => handleUpdateDadoComplementar(idx, 'valor', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                className="w-28 px-2 py-1 text-right font-mono font-bold text-blue-900 border border-blue-400 bg-white rounded text-xs outline-none shadow-2xs"
                              />
                            ) : (
                              <span>
                                {(Number(dc.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </td>

                          <td className="p-2.5 text-center font-mono font-bold text-slate-500">{dc.unidade || '-'}</td>

                          {!readonly && (
                            <td className="p-2.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingGlobalIndex(isEditingThisRow ? null : idx)}
                                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                                    isEditingThisRow 
                                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-300' 
                                      : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
                                  }`}
                                  title={isEditingThisRow ? 'Concluir edição' : 'Editar parâmetro'}
                                >
                                  {isEditingThisRow ? <Check className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (editingGlobalIndex === idx) setEditingGlobalIndex(null);
                                    handleRemoveDadoComplementar(idx);
                                  }}
                                  className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                  title="Remover parâmetro global"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABELA LEVE E ELEGANTE DE MEMÓRIA DE CÁLCULO COM EAP HIERÁRQUICA */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              Detalhamento da Memória de Cálculo & Serviços
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Organize os serviços em seções e subitens. Use os botões de recuo e ordenação para ajustar a hierarquia.
            </p>
          </div>
          {!readonly && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* Botões de Expandir/Recolher Estrutura de Tópicos */}
              <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleToggleExpandAll(true)}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-slate-300/60 shadow-2xs"
                  title="Expandir todas as seções e tópicos do orçamento"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                  <span>Expandir Tudo</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleExpandAll(false)}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-slate-300/60 shadow-2xs"
                  title="Recolher todas as seções e tópicos do orçamento"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  <span>Recolher Tudo</span>
                </button>
              </div>

              {/* Botões Globais de Recuo e Mover EAP para Linha Selecionada */}
              <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl">
                <button
                  type="button"
                  title="Diminuir Recuo das Linhas Selecionadas"
                  onClick={() => handleIndentMultiple(-1)}
                  disabled={selectedRowIndex === null && selectedRowIndices.size === 0}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-slate-300/60 shadow-2xs"
                >
                  <Outdent className="w-3.5 h-3.5 text-blue-600" />
                  <span>Diminuir Recuo</span>
                </button>
                <button
                  type="button"
                  title="Aumentar Recuo (Tornar Subitem) das Linhas Selecionadas"
                  onClick={() => handleIndentMultiple(1)}
                  disabled={selectedRowIndex === null && selectedRowIndices.size === 0}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-slate-300/60 shadow-2xs"
                >
                  <Indent className="w-3.5 h-3.5 text-blue-600" />
                  <span>Aumentar Recuo</span>
                </button>
                <button
                  type="button"
                  title="Mover Linha Selecionada para Cima (Alt + Seta Cima)"
                  onClick={() => selectedRowIndex !== null && handleMoveRow(selectedRowIndex, 'up')}
                  disabled={selectedRowIndex === null || selectedRowIndex === 0}
                  className="px-2 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-slate-300/60 shadow-2xs"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-slate-700" />
                  <span>Subir</span>
                </button>
                <button
                  type="button"
                  title="Mover Linha Selecionada para Baixo (Alt + Seta Baixo)"
                  onClick={() => selectedRowIndex !== null && handleMoveRow(selectedRowIndex, 'down')}
                  disabled={selectedRowIndex === null || selectedRowIndex === itens.length - 1}
                  className="px-2 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-slate-300/60 shadow-2xs"
                >
                  <ArrowDown className="w-3.5 h-3.5 text-slate-700" />
                  <span>Descer</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleAddSecaoTexto()}
                title="Pressione Insert no teclado para inserir uma linha acima"
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Type className="w-3.5 h-3.5 text-slate-700" />
                <span>Linha de Texto (Seção / Insert)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowBancoModal(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Composição / Insumo do Banco</span>
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 font-semibold text-slate-600 uppercase text-[10px] tracking-wider">
                {!readonly && <th className="py-2.5 px-1 w-8 text-center border-r border-slate-200" title="Arrastar para reordenar"></th>}
                <th className="py-2.5 px-2 min-w-[95px] w-24 text-center border-r border-slate-200">ITEM</th>
                <th className="py-2.5 px-4 min-w-[280px] border-r border-slate-200">DESCRIÇÃO DOS SERVIÇOS</th>
                <th className="py-2.5 px-3 w-16 text-center border-r border-slate-200">UN</th>
                <th className="py-2.5 px-4 w-28 text-right border-r border-slate-200">QUANT.</th>
                <th className="py-2.5 px-5 min-w-[340px] border-r border-slate-200">MEMÓRIA DE CÁLCULO / FÓRMULA DETALHADA</th>
                {!readonly && <th className="py-2.5 px-2 w-20 text-center">AÇÕES</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {itens.length === 0 ? (
                <tr>
                  <td colSpan={readonly ? 5 : 7} className="py-12 text-center text-slate-400 font-medium">
                    Nenhum item cadastrado. Clique em "+ Linha de Texto (Seção)" ou "+ Adicionar Serviço" para começar.
                  </td>
                </tr>
              ) : (
                itens.map((item, index) => {
                  // Oculta a linha se algum pai/ancestral estiver colapsado
                  if (isLinhaOculta(index, itens)) {
                    return null;
                  }

                  const level = item.level !== undefined 
                    ? item.level 
                    : (item.isSecao ? 0 : (item.item_eap ? Math.max(1, item.item_eap.split('.').length - 1) : 1));
                  const indentPx = level === 0 ? 0 : level * 20;
                  const numFilhos = contarItensFilhos(index, itens);
                  const isParent = numFilhos > 0;

                  if (item.isSecao) {
                    return (
                      <tr 
                        key={item.id || index} 
                        onClick={(e) => handleRowClick(e, index)}
                        onDoubleClick={() => isParent && handleToggleCollapse(index)}
                        draggable={!readonly}
                        onDragStart={(e) => {
                          setDraggedRowIndex(index);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverRowIndex(index);
                        }}
                        onDragLeave={() => setDragOverRowIndex(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedRowIndex !== null) handleDropRow(draggedRowIndex, index);
                        }}
                        className={`bg-slate-100/90 font-bold border-y border-slate-300 text-slate-900 transition-colors cursor-pointer ${
                          (selectedRowIndex === index || selectedRowIndices.has(index)) ? 'ring-2 ring-blue-500/50 bg-blue-50/60' : ''
                        } ${
                          dragOverRowIndex === index ? 'bg-blue-100 border-t-2 border-blue-600' : ''
                        }`}
                      >
                        {/* HANDLE ARRASTAR */}
                        {!readonly && (
                          <td className="py-2 px-1 text-center border-r border-slate-200 align-middle cursor-grab active:cursor-grabbing hover:bg-slate-200/80 transition-colors" title="Clique e arraste para reordenar esta linha">
                            <GripVertical className="w-4 h-4 text-slate-400 hover:text-slate-700 mx-auto" />
                          </td>
                        )}

                        {/* ITEM EAP */}
                        <td className="py-2 px-2 text-center border-r border-slate-200 font-mono text-xs text-slate-700 align-middle min-w-[95px] w-24 relative whitespace-nowrap">
                          <span className="font-mono font-bold text-slate-800 text-center w-full block">{item.item_eap}</span>
                        </td>

                        {/* DESCRIÇÃO DE TEXTO DA SEÇÃO */}
                        <td colSpan={3} className="py-2 px-4 border-r border-slate-200 align-middle" style={{ paddingLeft: `${indentPx + 12}px` }}>
                          <div className="flex items-center justify-between gap-2 w-full">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {isParent && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleCollapse(index);
                                  }}
                                  className="p-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer shrink-0 transition-colors"
                                  title={item.collapsed ? `Expandir ${numFilhos} subitens` : `Recolher ${numFilhos} subitens`}
                                >
                                  {item.collapsed ? <ChevronRight className="w-4 h-4 text-blue-700 font-bold" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
                                </button>
                              )}
                              {readonly ? (
                                <span className="font-bold text-slate-900 uppercase truncate">{item.descricao || 'SEÇÃO'}</span>
                              ) : (
                                <div className="relative flex-1 flex items-center group/desc">
                                  <input
                                    type="text"
                                    data-row={index}
                                    data-col={1}
                                    onKeyDown={(e) => handleCellKeyDown(e, index, 1)}
                                    value={item.descricao}
                                    placeholder="Digite o título da seção ou pesquise no banco..."
                                    onChange={(e) => {
                                      const copia = [...itens];
                                      copia[index].descricao = e.target.value;
                                      onChangeItens(copia);
                                    }}
                                    className="w-full bg-transparent font-bold text-slate-900 outline-none uppercase focus:bg-white focus:ring-2 focus:ring-blue-500/30 rounded px-1.5 py-0.5 pr-7 placeholder:lowercase placeholder:font-normal placeholder:italic placeholder:text-slate-400"
                                  />
                                  {!readonly && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedRowIndex(index);
                                        setShowBancoModal(true);
                                      }}
                                      className="p-1 opacity-0 group-hover/desc:opacity-100 hover:bg-blue-100 text-slate-400 hover:text-blue-600 rounded transition-all cursor-pointer shrink-0 absolute right-1"
                                      title="Pesquisar Insumo ou Composição no Banco Próprio/Sistema"
                                    >
                                      <Search className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* MEMÓRIA DE CÁLCULO E PARÂMETROS DA LINHA DE SEÇÃO (TRANSCRIÇÃO PROFISSIONAL) */}
                        <td className="py-2.5 px-4 border-r border-slate-200 align-middle">
                          <div className="flex items-center gap-2">
                            {!readonly && item.isSecao && item.descricao.trim().length > 0 && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenCalcItem(index);
                                  }}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[11px] flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer inline-flex"
                                  title="Abrir Planilha de Cálculo Esquemática e Fórmulas de Engenharia"
                                >
                                  <Calculator className="w-3.5 h-3.5 text-white" />
                                  <span>Calcular</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMemorialDetalhadoIndex(index);
                                  }}
                                  className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200/80 cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
                                  title="Ver memorial de cálculo detalhado, planilhas esquemáticas e croquis"
                                >
                                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Acessar Memorial</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>

                        {/* BOTÕES DE AÇÃO REORDENAÇÃO & EXCLUSÃO */}
                        {!readonly && (
                          <td className="py-1.5 px-2 text-center align-middle">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                title="Mover para Cima"
                                onClick={() => handleMoveRow(index, 'up')}
                                disabled={index === 0}
                                className="p-1 text-slate-500 hover:text-blue-600 disabled:opacity-30 cursor-pointer hover:bg-slate-200 rounded"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Mover para Baixo"
                                onClick={() => handleMoveRow(index, 'down')}
                                disabled={index === itens.length - 1}
                                className="p-1 text-slate-500 hover:text-blue-600 disabled:opacity-30 cursor-pointer hover:bg-slate-200 rounded"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Excluir Linha"
                                onClick={() => handleRemoveItem(index)}
                                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer hover:bg-slate-200 rounded ml-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  }

                  const isCoberto = isCobertoPorRowSpanMemoria(index, itens);
                  const isChildRow = isCoberto || (!isParent && level >= 2);

                  return (
                    <tr 
                      key={item.id || index} 
                      id={item.item_eap ? `memoria-row-eap-${item.item_eap}` : undefined}
                      data-eap={item.item_eap || undefined}
                      onClick={(e) => handleRowClick(e, index)}
                      draggable={!readonly}
                      onDragStart={(e) => {
                        setDraggedRowIndex(index);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverRowIndex(index);
                      }}
                      onDragLeave={() => setDragOverRowIndex(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedRowIndex !== null) handleDropRow(draggedRowIndex, index);
                      }}
                      className={`transition-colors cursor-pointer border-b border-slate-100 ${
                        (selectedRowIndex === index || selectedRowIndices.has(index)) ? 'ring-2 ring-blue-500/50 bg-blue-50/40' : ''
                      } ${
                        dragOverRowIndex === index ? 'bg-blue-100 border-t-2 border-blue-600' :
                        isChildRow ? 'bg-slate-50/40 hover:bg-slate-100/50 text-slate-500' : 'bg-white hover:bg-slate-50/80 font-bold text-slate-900'
                      }`}
                    >
                      {/* HANDLE ARRASTAR */}
                      {!readonly && (
                        <td className="py-2.5 px-1 text-center border-r border-slate-200 align-middle cursor-grab active:cursor-grabbing hover:bg-slate-200/60 transition-colors" title="Clique e arraste para reordenar esta linha">
                          <GripVertical className="w-4 h-4 text-slate-400 hover:text-slate-700 mx-auto" />
                        </td>
                      )}

                      {/* ITEM EAP */}
                      <td className="py-2.5 px-2 text-center font-mono border-r border-slate-200 align-middle min-w-[95px] w-24 relative whitespace-nowrap">
                        {readonly ? (
                          <span className={isChildRow ? "font-mono text-slate-400 text-[10.5px] text-center w-full block" : "font-mono font-medium text-slate-900 text-xs text-center w-full block"}>{item.item_eap}</span>
                        ) : (
                          <input
                            type="text"
                            data-row={index}
                            data-col={0}
                            onKeyDown={(e) => handleCellKeyDown(e, index, 0)}
                            value={item.item_eap}
                            onChange={(e) => {
                              const copia = [...itens];
                              copia[index].item_eap = e.target.value;
                              onChangeItens(copia);
                            }}
                            className={`w-14 text-center font-mono shrink-0 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/30 rounded mx-auto ${
                              isChildRow ? "text-slate-400 text-[10.5px]" : "font-medium text-slate-900 text-xs"
                            }`}
                          />
                        )}
                      </td>

                      {/* DESCRIÇÃO COM MARGEM RECUADA HIERÁRQUICA E ESTILO DISCRETO PARA FILHAS */}
                      <td className="py-2.5 px-4 border-r border-slate-200 align-middle leading-relaxed" style={{ paddingLeft: `${(level >= 2 ? (level - 1) * 20 + 12 : level * 16 + 12)}px` }}>
                        <div className="flex items-center gap-1.5">
                          {isParent ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleCollapse(index);
                              }}
                              className="p-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer shrink-0 transition-colors"
                              title={item.collapsed ? `Expandir ${numFilhos} tarefas filhas` : `Recolher ${numFilhos} tarefas filhas`}
                            >
                              {item.collapsed ? <ChevronRight className="w-4 h-4 text-blue-700 font-bold" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
                            </button>
                          ) : level >= 1 ? (
                            <CornerDownRight className={`w-3.5 h-3.5 shrink-0 ${isChildRow ? "text-slate-300" : "text-blue-500 font-bold"}`} />
                          ) : null}

                          <div className="relative flex-1 flex items-center group/desc">
                            {(() => {
                              const hasUnitOrCode = Boolean(
                                (item.unidade && item.unidade.trim() !== '') ||
                                (item as any).codigo ||
                                (item as any).banco_fonte ||
                                item.isChildInsumoOfComposition ||
                                (item as any).composicao_id ||
                                (item as any).parentCompositionId
                              );
                              const isEditableTextLine = Boolean(item.isSecao && !hasUnitOrCode);

                              if (readonly || !isEditableTextLine) {
                                return (
                                  <div className="flex-1 flex items-center justify-between min-w-0 pr-6">
                                    <span className={
                                      isChildRow
                                        ? "font-normal text-slate-600 text-[11px] leading-snug select-text truncate"
                                        : "font-semibold text-slate-900 text-xs leading-snug select-text uppercase truncate"
                                    } title={item.descricao}>
                                      {item.descricao}
                                    </span>
                                    {!readonly && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedRowIndex(index);
                                          setShowBancoModal(true);
                                        }}
                                        className="p-1 opacity-0 group-hover/desc:opacity-100 hover:bg-blue-100 text-slate-400 hover:text-blue-600 rounded transition-all cursor-pointer shrink-0 absolute right-1"
                                        title="Pesquisar Insumo ou Composição no Banco Próprio/Sistema"
                                      >
                                        <Search className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                );
                              }

                              return (
                                <input
                                  type="text"
                                  data-row={index}
                                  data-col={1}
                                  onKeyDown={(e) => handleCellKeyDown(e, index, 1)}
                                  value={item.descricao}
                                  placeholder="Digite a descrição do serviço de texto..."
                                  onChange={(e) => {
                                    const copia = [...itens];
                                    copia[index].descricao = e.target.value;
                                    onChangeItens(copia);
                                  }}
                                  className={`w-full bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/30 rounded px-1.5 py-0.5 pr-7 ${
                                    isChildRow
                                      ? "font-normal text-slate-500 text-[11px] leading-snug placeholder:font-normal placeholder:italic placeholder:text-slate-400"
                                      : "font-bold text-slate-900 text-xs leading-snug uppercase placeholder:lowercase placeholder:font-normal placeholder:italic placeholder:text-slate-400"
                                  }`}
                                />
                              );
                            })()}
                          </div>
                        </div>
                      </td>

                      {/* UNID */}
                      <td className="py-2.5 px-3 text-center border-r border-slate-200 align-middle uppercase">
                        <span className={isChildRow ? "font-normal text-slate-400 text-[11px] uppercase" : "font-medium text-slate-800 text-xs uppercase"}>
                          {item.unidade}
                        </span>
                      </td>

                      {/* QUANT. COM VINCULAÇÃO A PARÂMETROS DA LINHA MÃE */}
                      <td className={`py-2 px-3 text-right font-mono border-r border-slate-200 align-middle ${isChildRow ? "text-slate-500 font-normal text-[11px]" : "text-slate-900 font-semibold text-xs"}`}>
                        {readonly ? (
                          item.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
                        ) : (
                          <div className="flex items-center justify-end gap-1 relative">
                            {(() => {
                              const heranca = getHerancaParametrosEap(index, itens);
                              if (heranca.length === 0) return null;
                              return (
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveQuantityLinkIndex(activeQuantityLinkIndex === index ? null : index);
                                    }}
                                    className="p-1 hover:bg-blue-100 text-blue-600 rounded transition-colors cursor-pointer shrink-0"
                                    title="Vincular quantidade a um parâmetro cadastrado na linha mãe / seção"
                                  >
                                    <Calculator className="w-3.5 h-3.5" />
                                  </button>

                                  {activeQuantityLinkIndex === index && (
                                    <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 text-left font-sans animate-in fade-in duration-150">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5 px-1">
                                        Vincular Parâmetro da Seção Mãe:
                                      </span>
                                      <div className="space-y-1 max-h-48 overflow-y-auto">
                                        {heranca.map(({ itemEap, param }, pIdx) => {
                                          const catIcon = param.categoria?.includes('Piso') ? '🏢' :
                                                         param.categoria?.includes('Parede') ? '🧱' :
                                                         param.categoria?.includes('Estrutura') ? '📐' :
                                                         param.categoria?.includes('Terraplenagem') ? '🚜' :
                                                         param.categoria?.includes('Cobertura') ? '🏠' : '📌';
                                          return (
                                            <button
                                              key={param.id || pIdx}
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleBindSectionParameter(index, param);
                                                setActiveQuantityLinkIndex(null);
                                              }}
                                              className="w-full text-left px-2 py-1.5 hover:bg-blue-50 rounded-lg flex items-center justify-between text-xs cursor-pointer border border-transparent hover:border-blue-200 transition-colors"
                                            >
                                              <div>
                                                <span className="font-semibold text-slate-800 block text-[11px]">
                                                  {catIcon} {param.label}
                                                </span>
                                                <span className="text-[9px] text-slate-400 font-mono">Linha EAP {itemEap}</span>
                                              </div>
                                              <span className="font-mono font-bold text-blue-700 text-xs">
                                                {param.valor} {param.unidade}
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            <input
                              type="text"
                              inputMode="decimal"
                              data-row={index}
                              data-col={2}
                              onKeyDown={(e) => handleCellKeyDown(e, index, 2)}
                              value={
                                quantityInputs[item.id] !== undefined
                                  ? quantityInputs[item.id]
                                  : (item.quantidade !== undefined && item.quantidade !== null && item.quantidade !== 0 ? String(item.quantidade).replace('.', ',') : '')
                              }
                              placeholder="0,00"
                              onChange={(e) => {
                                const raw = e.target.value;
                                setQuantityInputs(prev => ({ ...prev, [item.id]: raw }));
                                const parsedVal = parseFloat(raw.replace(',', '.'));
                                handleManualQuantityChange(index, isNaN(parsedVal) ? 0 : parsedVal);
                              }}
                              onBlur={(e) => {
                                setQuantityInputs(prev => {
                                  const c = { ...prev };
                                  delete c[item.id];
                                  return c;
                                });
                                const parsedVal = parseFloat(e.target.value.replace(',', '.'));
                                handleManualQuantityChange(index, isNaN(parsedVal) ? 0 : parsedVal);
                              }}
                              className={`w-20 px-2 py-1 text-right font-mono text-xs rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 ${
                                isChildRow 
                                  ? "text-slate-500 font-medium bg-slate-50/60 border border-slate-200" 
                                  : "text-slate-900 font-bold bg-white border border-slate-300"
                              }`}
                            />
                          </div>
                        )}
                      </td>

                      {/* MEMÓRIA DE CÁLCULO PASSO A PASSO / FÓRMULA VINCULADA À LINHA */}
                      {(() => {
                        if (item.isSecao) {
                          return (
                            <td className="py-2 px-5 text-slate-400 italic text-[11px] border-r border-slate-200">
                              Linha de Seção / Título
                            </td>
                          );
                        }

                        const equacao = item.equacaoLiteral;
                        const substituicao = item.substituicaoNumerica;
                        const obs = item.observacaoMemoria;
                        const temFormula = !!(equacao || substituicao || obs || (item.parametrosLocais && item.parametrosLocais.length > 0));

                        return (
                          <td className="py-2.5 px-4 text-left align-middle border-r border-slate-200">
                            <div className="flex items-center justify-between gap-2 w-full">
                              <div className="space-y-1 flex-1 min-w-0">
                                {obs && <div className="text-[10px] font-bold uppercase text-slate-700 truncate">{obs}</div>}
                                {equacao && <div className="text-[11px] font-medium text-slate-600 italic truncate">{equacao}</div>}
                                {substituicao ? (
                                  <div className="text-xs font-mono font-bold text-blue-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 inline-block">{substituicao}</div>
                                ) : !equacao && !obs ? (
                                  <span className="text-xs text-slate-400 italic">Nenhuma fórmula vinculada.</span>
                                ) : null}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {temFormula && !readonly && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleClearItemFormula(index);
                                    }}
                                    className="text-[10px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg border border-rose-200 shrink-0 cursor-pointer transition-colors flex items-center gap-1"
                                    title="Limpar cálculo/fórmula desta linha sem excluir o item do orçamento"
                                  >
                                    <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                    <span>Limpar Cálculo</span>
                                  </button>
                                )}

                                 {/* Botão Acessar Memorial removido das composições e insumos conforme solicitado */}
                              </div>
                            </div>
                          </td>
                        );
                      })()}

                      {/* BOTOES DE AÇÃO REORDENAÇÃO & EXCLUSÃO */}
                      {!readonly && (
                        <td className="py-2 px-2 text-center align-middle">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              title="Mover para Cima"
                              onClick={() => handleMoveRow(index, 'up')}
                              disabled={index === 0}
                              className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30 cursor-pointer hover:bg-slate-100 rounded"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Mover para Baixo"
                              onClick={() => handleMoveRow(index, 'down')}
                              disabled={index === itens.length - 1}
                              className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30 cursor-pointer hover:bg-slate-100 rounded"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Excluir Item do Orçamento (Linha + Composições/Insumos)"
                              onClick={() => {
                                if (window.confirm(`Deseja realmente excluir a linha "${item.descricao || 'selecionada'}" do orçamento?`)) {
                                  handleRemoveItem(index);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer hover:bg-slate-100 rounded ml-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}

              {/* LINHA RASCUNHO/NOVA NO FINAL DA TABELA (APENAS SE O ÚLTIMO ITEM NÃO FOR EM BRANCO) */}
              {!readonly && (itens.length === 0 || !!itens[itens.length - 1]?.descricao?.trim()) && (
                <tr className="bg-slate-50/50 hover:bg-slate-50 transition-colors border-t border-slate-200">
                  <td className="py-2.5 px-1 text-center border-r border-slate-200"></td>
                  <td className="py-2.5 px-2 text-center font-mono border-r border-slate-200 text-slate-400 text-xs italic">
                    {(() => {
                      const nextNum = itens.length > 0 ? (Math.floor(parseFloat(itens[itens.length - 1]?.item_eap || '0')) + 1) : 1;
                      return `${nextNum}`;
                    })()}
                  </td>
                  <td colSpan={3} className="py-2.5 px-4 border-r border-slate-200 align-middle">
                    <div className="relative flex-1 flex items-center group/draftdesc">
                      <input
                        type="text"
                        value={draftDesc}
                        placeholder="digite o título da seção ou pesquise no banco..."
                        onChange={(e) => setDraftDesc(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && draftDesc.trim()) {
                            e.preventDefault();
                            handleAddDraftSecao(draftDesc);
                            setDraftDesc('');
                          }
                        }}
                        onBlur={() => {
                          if (draftDesc.trim()) {
                            handleAddDraftSecao(draftDesc);
                            setDraftDesc('');
                          }
                        }}
                        className="w-full bg-transparent font-normal text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/30 rounded px-1.5 py-0.5 pr-7 placeholder:italic placeholder:text-slate-400 text-xs"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRowIndex(itens.length);
                          setShowBancoModal(true);
                        }}
                        className="p-1 opacity-0 group-hover/draftdesc:opacity-100 hover:bg-blue-100 text-slate-400 hover:text-blue-600 rounded transition-all cursor-pointer shrink-0 absolute right-1"
                        title="Pesquisar Insumo ou Composição no Banco Próprio/Sistema"
                      >
                        <Search className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 border-r border-slate-200 text-center text-slate-400 text-[11px] italic">
                    Pressione Enter para criar a linha
                  </td>
                  <td className="py-2.5 px-2 text-center"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CLEAN DE EDIÇÃO DE FÓRMULA DO ITEM */}
      {editingItemModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-[96vw] max-w-[1600px] overflow-hidden flex flex-col max-h-[95vh] transition-all duration-300">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Vincular & Calcular Fórmula</h3>
                  <p className="text-xs text-slate-500">Item: {editingItemModal.descricao}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingItemModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden bg-white">
              {/* SIDEBAR ESQUERDA DE CÁLCULOS APLICADOS (TEMA BRANCO COM DETALHES EM AZUL) */}
              <div className={`transition-all duration-300 border-r border-slate-200 flex flex-col shrink-0 bg-slate-50 text-slate-800 ${
                isSidebarCollapsed ? 'w-16' : 'w-72'
              }`}>
                {/* Header da Sidebar */}
                <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between shadow-2xs">
                  {!isSidebarCollapsed && (
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-xs uppercase tracking-wide text-blue-950">
                        Cálculos do Item
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="p-1 hover:bg-blue-50 rounded text-slate-500 hover:text-blue-700 transition-colors cursor-pointer mx-auto border border-transparent hover:border-blue-200"
                    title={isSidebarCollapsed ? "Expandir Menu de Cálculos" : "Minimizar Menu"}
                  >
                    {isSidebarCollapsed ? <ChevronRight className="w-4 h-4 text-blue-600" /> : <ChevronLeft className="w-4 h-4 text-blue-600" />}
                  </button>
                </div>

                {/* Lista de Abas de Cálculos Já Aplicados */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-50/60">
                  {!isSidebarCollapsed && (
                    <div className="flex items-center justify-between px-1 pt-1 pb-1.5 mb-1 border-b border-slate-200">
                      <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
                        Cálculos Realizados ({calculosAplicadosMemoria.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedActiveCalcId(null);
                          setEditingTabId(null);
                          setModoCalculoModal('');
                        }}
                        className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10.5px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="Adicionar um novo cálculo ao item sem alterar os já salvos"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Novo</span>
                      </button>
                    </div>
                  )}

                  {calculosAplicadosMemoria.map((calc, idx) => {
                    const isActive = selectedActiveCalcId === calc.id;
                    const displayTitle = calc.targetItemDesc !== editingItemModal?.descricao 
                      ? `${calc.targetItemDesc}: ${calc.observacao}`
                      : calc.observacao;

                    return (
                      <div
                        key={calc.id || idx}
                        onClick={() => {
                          if (selectedActiveCalcId === calc.id) {
                            setSelectedActiveCalcId(null);
                            setEditingTabId(null);
                            setModoCalculoModal('');
                          } else {
                            setSelectedActiveCalcId(calc.id);
                            setEditingTabId(calc.id);
                            const targetModo = calc.modoCalculo || inferModoFromObs(calc.observacao);
                            if (targetModo) setModoCalculoModal(targetModo as any);
                          }
                        }}
                        className={`group cursor-pointer rounded-xl transition-all p-2.5 flex items-center justify-between text-xs border ${
                          isActive
                            ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-xs'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 font-medium'
                        }`}
                        title={displayTitle}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-white' : 'bg-blue-600'}`} />
                          {!isSidebarCollapsed && (
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-xs leading-snug">{displayTitle}</div>
                              <div className={`font-mono text-[10.5px] ${isActive ? 'text-blue-100' : 'text-blue-700 font-semibold'}`}>
                                = {typeof calc.resultado === 'number' ? calc.resultado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : calc.resultado}
                              </div>
                            </div>
                          )}
                        </div>

                        {!isSidebarCollapsed && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveAppliedCalc(calc.targetItemId, calc.id);
                            }}
                            className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                              isActive ? 'text-blue-200 hover:text-white hover:bg-blue-700' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                            title="Excluir este cálculo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {calculosAplicadosMemoria.length === 0 && !isSidebarCollapsed && (
                    <div className="p-3 text-center text-slate-400 text-[11px] italic">
                      Nenhum cálculo salvo ainda nesta composição.
                    </div>
                  )}
                </div>
              </div>

              {/* ÁREA PRINCIPAL DO WORKSPACE DE CÁLCULO */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1 bg-white">
                {/* SELETOR UNIFICADO DE CÁLCULO DE ENGENHARIA (SEM EMOJIS, DESIGN LIMPO) */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-blue-600" />
                      <span>Selecione a Fórmula ou Tipo de Cálculo:</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-normal">
                      A tela expandirá abaixo com os parâmetros e campos do cálculo selecionado
                    </span>
                  </div>

                  <div className="relative">
                    <select
                      value={modoCalculoModal}
                      onChange={(e) => {
                        setModoCalculoModal(e.target.value as any);
                        setSelectedActiveCalcId(null);
                        setEditingTabId(null);
                      }}
                      className="w-full bg-white text-slate-800 font-medium text-xs md:text-sm py-2 px-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer shadow-2xs transition-all"
                    >
                      <option value="">-- Selecione a Fórmula ou Tipo de Cálculo --</option>
                      <option value="formula">Personalizar</option>
                      <option value="tabela_estacas">Estacas de Fundação</option>
                      <option value="tabela_sapatas">Sapatas Isoladas</option>
                      <option value="tabela_tubuloes">Tubulões de Fundação</option>
                      <option value="tabela_blocos">Blocos sobre Estacas</option>
                      <option value="tabela_vigas">Vigas Baldrames / Vigas</option>
                      <option value="tabela_premoldados">Pré-Moldados & Estruturas</option>
                      <option value="tabela_piso_concreto">Piso Industrial / Concreto</option>
                      <option value="tabela_drenagem">Drenagem Pluvial & Canais</option>
                      <option value="tabela_pits">Reservatórios & PITs</option>
                      <option value="tabela_superestrutura">Superestrutura & Lajes</option>
                      <option value="tabela_esquadrias">Esquadrias & Acabamentos</option>
                    </select>
                  </div>
                </div>

              {!modoCalculoModal ? (
                <div className="p-12 text-center bg-slate-50/70 border-2 border-dashed border-slate-200 rounded-2xl my-4 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
                    <Calculator className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">Nenhuma Fórmula ou Tipo de Cálculo Selecionado</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    Por favor, escolha a fórmula ou o tipo de cálculo desejado no menu suspenso acima para abrir os parâmetros, croquis e tabelas de dimensionamento.
                  </p>
                </div>
              ) : modoCalculoModal === 'tabela_vigas' ? (
                <div className="p-1 animate-in fade-in duration-150">
                  <TabelaVigasBaldrames
                    header={vigasHeaderModal}
                    onChangeHeader={setVigasHeaderModal}
                    vigas={vigasListModal}
                    onChangeVigas={setVigasListModal}
                    parentItem={editingItemModal || undefined}
                    childItems={childItemsOfComposition}
                    onApplySelectedMetric={(metricKey, valorTotal, equacaoLiteral, substituicaoText, targetItemId) =>
                      handleApplyMetric('Vigas Baldrames', metricKey, valorTotal, equacaoLiteral, substituicaoText, targetItemId)
                    }
                  />
                </div>
              ) : modoCalculoModal === 'tabela_sapatas' ? (
                <div className="p-1 animate-in fade-in duration-150">
                  <TabelaSapatas
                    header={sapatasHeaderModal}
                    onChangeHeader={setSapatasHeaderModal}
                    sapatas={sapatasListModal}
                    onChangeSapatas={setSapatasListModal}
                    parentItem={editingItemModal || undefined}
                    childItems={childItemsOfComposition}
                    onApplySelectedMetric={(metricKey, valorTotal, equacaoLiteral, substituicaoText, targetItemId) =>
                      handleApplyMetric('Sapatas Isoladas', metricKey, valorTotal, equacaoLiteral, substituicaoText, targetItemId)
                    }
                  />
                </div>
              ) : modoCalculoModal === 'tabela_blocos' ? (
                <div className="p-1 animate-in fade-in duration-150">
                  <TabelaBlocos
                    headerGlobal={blocosHeaderModal}
                    onChangeHeaderGlobal={setBlocosHeaderModal}
                    list={blocosListModal}
                    onChangeList={setBlocosListModal}
                    parentItem={editingItemModal || undefined}
                    childItems={childItemsOfComposition}
                    onApplySelectedMetric={(metricKey, valorTotal, equacaoLiteral, substituicaoText, targetItemId) =>
                      handleApplyMetric('Blocos de Coroamento', metricKey, valorTotal, equacaoLiteral, substituicaoText, targetItemId)
                    }
                  />
                </div>
              ) : modoCalculoModal === 'tabela_tubuloes' ? (
                <div className="p-1 animate-in fade-in duration-150">
                  <TabelaTubuloes
                    headerGlobal={tubuloesHeaderModal}
                    onChangeHeaderGlobal={setTubuloesHeaderModal}
                    list={tubuloesListModal}
                    onChangeList={setTubuloesListModal}
                    parentItem={editingItemModal || undefined}
                    childItems={childItemsOfComposition}
                    onApplySelectedMetric={(metricKey, valorTotal, equacaoLiteral, substituicaoText, targetItemId) =>
                      handleApplyMetric('Tubulões', metricKey, valorTotal, equacaoLiteral, substituicaoText, targetItemId)
                    }
                  />
                </div>
              ) : modoCalculoModal === 'tabela_estacas' ? (
                <div className="p-1 animate-in fade-in duration-150">
                  <TabelaEstacas
                    headerGlobal={estacasHeaderModal}
                    onChangeHeaderGlobal={setEstacasHeaderModal}
                    list={estacasListModal}
                    onChangeList={setEstacasListModal}
                    parentItem={editingItemModal || undefined}
                    childItems={childItemsOfComposition}
                    onApplySelectedMetric={(metricKey, valorTotal, equacaoLiteral, substituicaoText, targetItemId) =>
                      handleApplyMetric('Estacas', metricKey, valorTotal, equacaoLiteral, substituicaoText, targetItemId)
                    }
                  />
                </div>
              ) : modoCalculoModal === 'tabela_premoldados' ? (
                <div className="p-1 animate-in fade-in duration-150">
                  <TabelaPremoldados
                    headerGlobal={premoldadosHeaderModal}
                    onChangeHeaderGlobal={setPremoldadosHeaderModal}
                    list={premoldadosListModal}
                    onChangeList={setPremoldadosListModal}
                    parentItem={editingItemModal || undefined}
                    childItems={childItemsOfComposition}
                    onApplySelectedMetric={(metricKey, valorTotal, equacaoLiteral, substituicaoText, targetItemId) =>
                      handleApplyMetric('Pré-Moldados', metricKey, valorTotal, equacaoLiteral, substituicaoText, targetItemId)
                    }
                  />
                </div>
              ) : modoCalculoModal === 'tabela_piso_concreto' ? (
                <div className="p-1 animate-in fade-in duration-150">
                  <TabelaPisoConcreto
                    headerGlobal={pisoConcretoHeaderModal}
                    onChangeHeaderGlobal={setPisoConcretoHeaderModal}
                    parentItem={editingItemModal || undefined}
                    childItems={childItemsOfComposition}
                    onApplySelectedMetric={(metricKey, valorTotal, equacaoLiteral, substituicaoText, targetItemId) =>
                      handleApplyMetric('Piso Industrial', metricKey, valorTotal, equacaoLiteral, substituicaoText, targetItemId)
                    }
                  />
                </div>
              ) : modoCalculoModal === 'tabela_drenagem' ? (
                <div className="p-1 animate-in fade-in duration-150">
                  <TabelaDrenagem
                    headerGlobal={drenagemHeaderModal}
                    onChangeHeaderGlobal={setDrenagemHeaderModal}
                    parentItem={editingItemModal || undefined}
                    childItems={childItemsOfComposition}
                    onApplySelectedMetric={(metricKey, valorTotal, equacaoLiteral, substituicaoText, targetItemId) =>
                      handleApplyMetric('Drenagem Pluvial', metricKey, valorTotal, equacaoLiteral, substituicaoText, targetItemId)
                    }
                  />
                </div>
              ) : modoCalculoModal === 'tabela_pits' ? (
                <div className="p-1 animate-in fade-in duration-150">
                  <TabelaPitsReservatorios
                    headerGlobal={pitsHeaderModal}
                    onChangeHeaderGlobal={setPitsHeaderModal}
                    parentItem={editingItemModal || undefined}
                    childItems={childItemsOfComposition}
                    onApplySelectedMetric={(metricKey, valorTotal, equacaoLiteral, substituicaoText, targetItemId) =>
                      handleApplyMetric('Pits e Reservatórios', metricKey, valorTotal, equacaoLiteral, substituicaoText, targetItemId)
                    }
                  />
                </div>
              ) : modoCalculoModal === 'tabela_superestrutura' ? (
                <div className="p-1 animate-in fade-in duration-150">
                  <TabelaSuperestrutura
                    headerGlobal={superestruturaHeaderModal}
                    onChangeHeaderGlobal={setSuperestruturaHeaderModal}
                    parentItem={editingItemModal || undefined}
                    childItems={childItemsOfComposition}
                    onApplySelectedMetric={(metricKey, valorTotal, equacaoLiteral, substituicaoText, targetItemId) =>
                      handleApplyMetric('Superestrutura', metricKey, valorTotal, equacaoLiteral, substituicaoText, targetItemId)
                    }
                  />
                </div>
              ) : modoCalculoModal === 'tabela_esquadrias' ? (
                <div className="p-1 animate-in fade-in duration-150">
                  <TabelaEsquadriasAcabamentos
                    headerGlobal={esquadriasHeaderModal}
                    onChangeHeaderGlobal={setEsquadriasHeaderModal}
                    comodos={comodosListModal}
                    onChangeComodos={setComodosListModal}
                    parentItem={editingItemModal || undefined}
                    childItems={childItemsOfComposition}
                    onApplySelectedMetric={(metricKey, valorTotal, equacaoLiteral, substituicaoText, targetItemId) =>
                      handleApplyMetric('Esquadrias & Acabamentos', metricKey, valorTotal, equacaoLiteral, substituicaoText, targetItemId)
                    }
                  />
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {selectedFormula ? (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                      {/* Renderiza o Croqui Esquemático do Elemento Selecionado */}
                      {selectedFormula.id === 'viga_baldrame_completo' && <CroquiVigaBaldrame compact />}
                      {selectedFormula.id === 'sapata_isolada_completo' && <CroquiSapata compact />}
                      {selectedFormula.id === 'bloco_fundacao_completo' && (
                        <CroquiBloco 
                          compact 
                          tipoInicial={
                            paramInputs.tipoBloco === 2 ? 'tres_estacas' :
                            paramInputs.tipoBloco === 3 ? 'pre_moldado' :
                            paramInputs.tipoBloco === 4 ? 'tres_estacas_pre' : 'moldado'
                          } 
                        />
                      )}
                      {selectedFormula.id === 'tubulao_completo' && <CroquiTubulao compact />}
                      {selectedFormula.id === 'estaca_fundacao_completo' && <CroquiEstaca compact />}

                      <span className="text-xs font-semibold text-slate-700 block border-b border-slate-200 pb-2">
                        Variáveis exigidas pela fórmula "{selectedFormula.nome}":
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(selectedFormula.parametrosRequeridos || []).map(p => (
                          <div key={p.chave} className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-600 block">
                              {p.nome} {p.unidade ? `(${p.unidade})` : ''}
                            </label>
                            {p.chave === 'tipoBloco' ? (
                              <select
                                value={paramInputs[p.chave] ?? p.padrao ?? 1}
                                onChange={(e) => setParamInputs({ ...paramInputs, [p.chave]: parseInt(e.target.value) || 1 })}
                                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold outline-none focus:border-blue-500 bg-white text-blue-900"
                              >
                                <option value={1}>1 - Bloco Pilares Moldados In Loco</option>
                                <option value={2}>2 - Bloco para 3 Estacas</option>
                                <option value={3}>3 - Bloco Pilares Pré-Moldados (Cálice)</option>
                                <option value={4}>4 - Bloco 3 Estacas Pilares Pré (Cálice)</option>
                              </select>
                            ) : p.chave === 'talude' ? (
                              <select
                                value={paramInputs[p.chave] ?? p.padrao ?? 1}
                                onChange={(e) => setParamInputs({ ...paramInputs, [p.chave]: parseInt(e.target.value) || 1 })}
                                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold outline-none focus:border-blue-500 bg-white text-slate-800"
                              >
                                <option value={0}>0 - Sem Talude (Escavação Vertical)</option>
                                <option value={1}>1 - Em Prumo com Vala (0,50m)</option>
                                <option value={2}>2 - Talude 1:1 (45°)</option>
                                <option value={3}>3 - Talude 1:2 (26,5°)</option>
                              </select>
                            ) : (
                              <input
                                type="number"
                                step="0.01"
                                value={paramInputs[p.chave] ?? p.padrao ?? 0}
                                onChange={(e) => setParamInputs({ ...paramInputs, [p.chave]: parseFloat(e.target.value) || 0 })}
                                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-semibold outline-none focus:border-blue-500 bg-white text-slate-900"
                              />
                            )}
                          </div>
                        ))}
                      </div>

                      {(() => {
                        const res = selectedFormula.formatarExpressao ? selectedFormula.formatarExpressao(paramInputs) : {
                          literal: selectedFormula.equacaoExemplo || selectedFormula.nome,
                          substituicao: `Q = ${selectedFormula.nome}`,
                          resultado: 1
                        };
                        return (
                          <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-xs text-slate-800 space-y-2">
                            <div className="italic text-slate-600 font-sans">{res.literal}</div>
                            <div className="font-bold text-blue-900">{res.substituicao}</div>
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                              <span className="text-xs font-bold font-mono text-emerald-700">
                                Resultado = {res.resultado.toFixed(2)} {selectedFormula.unidadeResultante}
                              </span>
                              <button
                                type="button"
                                onClick={handleAddFormulaStep}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 shadow-2xs"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Adicionar esta Fórmula</span>
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-5">
                      {/* 1. SEÇÃO DE CADASTRO DE PARÂMETROS LOCAIS DA FÓRMULA LIVRE (TABELA COMPACTA) */}
                      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-bold text-slate-900">Parâmetros da Fórmula</span>
                            <span className="text-[11px] text-slate-500 font-medium">({customParamsList.length} cadastrados)</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const listaBase = getParametrosCadastrados();
                              const defaultBase = listaBase.find(p => p.sigla === 'A' || p.unidade === 'm²') || listaBase[0];
                              const newRow = {
                                id: `cp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                                nome: `Parâmetro ${customParamsList.length + 1}`,
                                parametroBaseId: defaultBase ? defaultBase.id : 'p-8',
                                parametroNome: defaultBase ? defaultBase.parametro : 'Área de Superfície',
                                sigla: defaultBase ? defaultBase.sigla : 'A',
                                unidade: defaultBase ? defaultBase.unidade : 'm²',
                                valor: ''
                              };
                              setCustomParamsList(prev => {
                                const nextList = [...prev, newRow];
                                if (customTextLiteral) {
                                  const evalResult = evaluateCustomFormula(
                                    customTextLiteral,
                                    nextList,
                                    header.dadosComplementares || (header as any)?.dados_complementares || []
                                  );
                                  setCustomTextSubst(evalResult.substitutedNumeric);
                                  setCustomQtd(evalResult.mathResult);
                                }
                                return nextList;
                              });
                            }}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Adicionar Parâmetro</span>
                          </button>
                        </div>

                        {/* TABELA COMPACTA DE PARÂMETROS COM LINHAS GRID (ESTILO EXCEL) */}
                        <div className="overflow-x-auto border-t border-slate-200">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase text-[10.5px] tracking-wider border-b border-slate-200">
                              <tr>
                                <th className="py-2 px-3 border-r border-slate-200">Descrição do Parâmetro</th>
                                <th className="py-2 px-3 border-r border-slate-200">Tipo de Parâmetro</th>
                                <th className="py-2 px-3 border-r border-slate-200 w-32">Valor</th>
                                <th className="py-2 px-3 border-r border-slate-200 text-center w-24">Unidade</th>
                                <th className="py-2 px-3 border-r border-slate-200 text-center w-28">SELEÇÃO</th>
                                <th className="py-2 px-3 text-center w-14">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                              {customParamsList.map((param, index) => {
                                const rowError = customParamsErrors[param.id];
                                const isSelected = selectedFormulaVar?.id === param.id;
                                return (
                                <tr key={param.id} className={`transition-colors ${isSelected ? 'bg-blue-50/60 font-semibold' : 'hover:bg-blue-50/30'} ${rowError ? 'bg-rose-50' : ''}`}>
                                  {/* DESCRIÇÃO - INPUT SEM BORDA PRÓPRIA */}
                                  <td className="py-1 px-2 border-r border-slate-200">
                                    <div>
                                    <input
                                      type="text"
                                      placeholder={`Ex: Área do Banheiro ${index + 1}`}
                                      value={param.nome}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setCustomParamsList(prev => {
                                          const nextList = prev.map(p => p.id === param.id ? { ...p, nome: val } : p);
                                          // Validação de unicidade (nome + tipo)
                                          const current = nextList.find(p => p.id === param.id)!;
                                          const normStr = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                                          const isDuplicate = nextList.some(p =>
                                            p.id !== param.id &&
                                            normStr(p.nome) === normStr(val) &&
                                            p.parametroBaseId === current.parametroBaseId
                                          );
                                          setCustomParamsErrors(prev2 => {
                                            const next2 = { ...prev2 };
                                            if (isDuplicate) {
                                              next2[param.id] = `Já existe um parâmetro com descrição "${val}" e o mesmo tipo.`;
                                            } else {
                                              delete next2[param.id];
                                            }
                                            return next2;
                                          });
                                          if (customTextLiteral) {
                                            const evalResult = evaluateCustomFormula(
                                              customTextLiteral,
                                              nextList,
                                              header.dadosComplementares || (header as any)?.dados_complementares || []
                                            );
                                            setCustomTextSubst(evalResult.substitutedNumeric);
                                            setCustomQtd(evalResult.mathResult);
                                          }
                                          return nextList;
                                        });
                                      }}
                                      className={`w-full px-2 py-1 bg-transparent text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded ${rowError ? 'ring-1 ring-rose-400' : ''}`}
                                    />
                                    {rowError && (
                                      <div className="text-[10px] text-rose-600 font-medium mt-0.5 px-1">{rowError}</div>
                                    )}
                                    </div>
                                  </td>

                                  {/* TIPO DE PARÂMETRO - SELECT SEM BORDA PRÓPRIA */}
                                  <td className="py-1 px-2 border-r border-slate-200">
                                    <select
                                      value={param.parametroBaseId}
                                      onChange={(e) => {
                                        const listaBase = getParametrosCadastrados();
                                        const selected = listaBase.find(b => b.id === e.target.value);
                                        if (selected) {
                                          setCustomParamsList(prev => {
                                            const nextList = prev.map(p => p.id === param.id ? {
                                              ...p,
                                              parametroBaseId: selected.id,
                                              parametroNome: selected.parametro,
                                              sigla: selected.sigla,
                                              unidade: selected.unidade
                                            } : p);
                                            // Validação de unicidade ao trocar tipo
                                            const current = nextList.find(p => p.id === param.id)!;
                                            const normStr = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                                            const isDuplicate = nextList.some(p =>
                                              p.id !== param.id &&
                                              normStr(p.nome) === normStr(current.nome) &&
                                              p.parametroBaseId === selected.id
                                            );
                                            setCustomParamsErrors(prev2 => {
                                              const next2 = { ...prev2 };
                                              if (isDuplicate) {
                                                next2[param.id] = `Já existe um parâmetro com descrição "${current.nome}" e tipo "${selected.parametro}".`;
                                              } else {
                                                delete next2[param.id];
                                              }
                                              return next2;
                                            });
                                            if (customTextLiteral) {
                                              const evalResult = evaluateCustomFormula(
                                                customTextLiteral,
                                                nextList,
                                                header.dadosComplementares || (header as any)?.dados_complementares || []
                                              );
                                              setCustomTextSubst(evalResult.substitutedNumeric);
                                              setCustomQtd(evalResult.mathResult);
                                            }
                                            return nextList;
                                          });
                                        }
                                      }}
                                      className="w-full px-2 py-1 bg-transparent text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded cursor-pointer"
                                    >
                                      {getParametrosCadastrados().map(b => (
                                        <option key={b.id} value={b.id}>
                                          {b.parametro} ({b.sigla} - {b.unidade})
                                        </option>
                                      ))}
                                    </select>
                                  </td>

                                  {/* VALOR - INPUT SEM BORDA PRÓPRIA */}
                                  <td className="py-1 px-2 border-r border-slate-200">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      placeholder="0,00"
                                      value={param.valor ?? ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setCustomParamsList(prev => {
                                          const nextList = prev.map(p => p.id === param.id ? { ...p, valor: val } : p);
                                          if (customTextLiteral) {
                                            const evalResult = evaluateCustomFormula(
                                              customTextLiteral,
                                              nextList,
                                              header.dadosComplementares || (header as any)?.dados_complementares || []
                                            );
                                            setCustomTextSubst(evalResult.substitutedNumeric);
                                            setCustomQtd(evalResult.mathResult);
                                          }
                                          return nextList;
                                        });
                                      }}
                                      className="w-full px-2 py-1 bg-transparent text-xs font-mono font-bold text-blue-900 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded"
                                    />
                                  </td>

                                  {/* UNIDADE DE MEDIÇÃO */}
                                  <td className="py-1 px-2 border-r border-slate-200 text-center">
                                    <span className="inline-block text-slate-700 font-mono font-bold text-xs">
                                      {param.unidade || 'un'}
                                    </span>
                                  </td>

                                  {/* SELEÇÃO DO PARÂMETRO PARA VÍNCULO DIRETO */}
                                  <td className="py-1 px-2 border-r border-slate-200 text-center">
                                    {isSelected ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 font-bold rounded-lg text-[11px] border border-blue-200 shadow-2xs">
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Selecionado</span>
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedCustomParamId(param.id);
                                          setSelectedCustomFormulaId(null);
                                        }}
                                        className="px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 font-medium rounded-lg text-[11px] border border-slate-300 hover:border-blue-300 transition-all cursor-pointer shadow-2xs"
                                      >
                                        Selecionar
                                      </button>
                                    )}
                                  </td>

                                  {/* LIXEIRA / AÇÕES */}
                                  <td className="py-1 px-2 text-center">
                                    {customParamsList.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCustomParamsList(prev => {
                                            const nextList = prev.filter(p => p.id !== param.id);
                                            if (customTextLiteral) {
                                              const evalResult = evaluateCustomFormula(
                                                customTextLiteral,
                                                nextList,
                                                header.dadosComplementares || (header as any)?.dados_complementares || []
                                              );
                                              setCustomTextSubst(evalResult.substitutedNumeric);
                                              setCustomQtd(evalResult.mathResult);
                                            }
                                            return nextList;
                                          });
                                        }}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                        title="Remover parâmetro"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* 2. ÁREA DE PERSONALIZAÇÃO DE FÓRMULA */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                        {/* LINHA DA FÓRMULA (EQUAÇÃO DAX / POWER BI) COM BOTÃO CALCULAR */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-bold text-slate-800 block">
                              Linha da Fórmula (Equação DAX) <span className="text-rose-500 font-bold">*</span>
                            </label>
                            <span className="text-[10.5px] text-slate-500 font-medium">
                              Obrigatorio: <strong className="text-blue-700 font-mono">NomeMedida = [Parâmetro 1] + [Parâmetro 2]</strong>
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type="text"
                                placeholder="Ex: Área de Cobertura = [Parâmetro 1] + [Parâmetro 2]"
                                value={customTextLiteral}
                                onFocus={() => setShowParamPopover(true)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleExecuteCalculateFormula();
                                  }
                                }}
                                onChange={(e) => {
                                  let val = e.target.value;
                                  // Impede o '=' se não houver um nome/texto válido antes dele
                                  if (val.includes('=')) {
                                    const beforeEq = val.split('=')[0].trim();
                                    if (!beforeEq) {
                                      val = val.replace(/=/g, '');
                                    }
                                  }
                                  setCustomTextLiteral(val);
                                  setShowParamPopover(true);
                                  const evalResult = evaluateCustomFormula(
                                    val,
                                    customParamsList,
                                    header.dadosComplementares || (header as any)?.dados_complementares || []
                                  );
                                  setCustomTextSubst(evalResult.substitutedNumeric);
                                  setCustomQtd(evalResult.mathResult);
                                }}
                                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono font-bold bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-900 shadow-2xs"
                              />

                              {/* LISTA DE SELEÇÃO ESTILO POWER BI (APARECE APENAS APÓS DIGITAR O '=' COM UM NOME ANTES) */}
                              {showParamPopover && customTextLiteral.includes('=') && customTextLiteral.split('=')[0].trim().length > 0 && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                                  {(() => {
                                    const rawGlobalList = header.dadosComplementares || (header as any)?.dados_complementares || [];
                                    const globalParamsAsCustom = rawGlobalList.map((dc: any, idx: number) => ({
                                      id: dc.id || `global-${idx}`,
                                      nome: dc.parametro || dc.nome || dc.descricao || `Parâmetro Global ${idx + 1}`,
                                      parametroNome: dc.parametroNome || dc.categoria || 'Parâmetro Global do Orçamento',
                                      sigla: 'GLOB',
                                      valor: dc.valor,
                                      unidade: dc.unidade || 'm²',
                                      isGlobal: true
                                    }));

                                    const allAvailableParams: any[] = [
                                      ...customParamsList.map((p: any) => ({ ...p, isGlobal: false })),
                                      ...globalParamsAsCustom.filter((gp: any) => !customParamsList.some((cp: any) => (cp.nome && cp.nome.trim().toLowerCase()) === (gp.nome && gp.nome.trim().toLowerCase())))
                                    ];

                                    const rhs = customTextLiteral.substring(customTextLiteral.indexOf('=') + 1);
                                    const searchMatch = rhs.match(/^(.*[\+\-\*\/\(\,\=]|^)(.*)$/s);
                                    const searchFilter = (searchMatch ? searchMatch[2] : rhs).trim().toLowerCase();

                                    const filteredParams = allAvailableParams.filter((p) => {
                                      if (!searchFilter) return true;
                                      const pName = (p.nome || '').toLowerCase();
                                      const pCat = (p.parametroNome || '').toLowerCase();
                                      return pName.includes(searchFilter) || pCat.includes(searchFilter);
                                    });

                                    if (filteredParams.length === 0) {
                                      return (
                                        <div className="p-3 text-center text-slate-400 text-xs italic">
                                          Nenhum parâmetro encontrado para "{searchFilter}".
                                        </div>
                                      );
                                    }

                                    return filteredParams.map((p) => {
                                      const tag = `[${p.nome || 'Parâmetro'}]`;
                                      return (
                                        <button
                                          key={p.id}
                                          type="button"
                                          onClick={() => {
                                            const pName = p.nome || 'Parâmetro';
                                            const insertedTag = `[${pName}]`;
                                            let nextStr = customTextLiteral;
                                            if (!nextStr.includes('=')) return;

                                            const eqIdx = nextStr.indexOf('=');
                                            const lhs = nextStr.substring(0, eqIdx + 1);
                                            const currentRhs = nextStr.substring(eqIdx + 1);

                                            if (/\]\s*$/.test(currentRhs) || /\d+\s*$/.test(currentRhs)) {
                                              nextStr = `${lhs}${currentRhs} + ${insertedTag}`;
                                            } else {
                                              const lastOpMatch = currentRhs.match(/^(.*[\+\-\*\/\(\,\=]|^)(.*)$/s);
                                              if (lastOpMatch) {
                                                const beforeSearchText = lastOpMatch[1];
                                                const cleanBefore = beforeSearchText.endsWith(' ') || beforeSearchText.endsWith('=') || beforeSearchText === '' 
                                                  ? beforeSearchText 
                                                  : `${beforeSearchText} `;
                                                nextStr = `${lhs}${cleanBefore}${insertedTag}`;
                                              } else {
                                                nextStr = `${lhs} ${insertedTag}`;
                                              }
                                            }

                                            setCustomTextLiteral(nextStr);
                                            const evalResult = evaluateCustomFormula(
                                              nextStr,
                                              allAvailableParams.filter((availableParam: any) => !availableParam.isGlobal),
                                              allAvailableParams.filter((availableParam: any) => availableParam.isGlobal)
                                            );
                                            setCustomTextSubst(evalResult.substitutedNumeric);
                                            setCustomQtd(evalResult.mathResult);
                                            setShowParamPopover(false);
                                          }}
                                          className="w-full text-left p-2.5 hover:bg-blue-50/80 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                                        >
                                          <div className="min-w-0 pr-2">
                                            <div className="font-bold text-slate-800 group-hover:text-blue-700 text-xs flex items-center gap-1.5 truncate">
                                              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${ (p as any).isGlobal ? 'bg-purple-600 ring-2 ring-purple-200' : 'bg-blue-600 ring-2 ring-blue-200' }`} />
                                              <span className="font-mono text-blue-950 font-extrabold">{tag}</span>
                                              {(p as any).isGlobal && (
                                                <span className="text-[9px] bg-purple-100 text-purple-800 font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                                  🌐 Global
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-[10.5px] text-slate-500 truncate">
                                              {(p as any).isGlobal ? '🌐 Parâmetro Global da Obra/Orçamento' : `Tipo: ${p.parametroNome || 'Parâmetro Local'}`}
                                            </div>
                                          </div>

                                          <div className="text-right shrink-0">
                                            <span className={`font-mono font-extrabold text-xs block ${ (p as any).isGlobal ? 'text-purple-900' : 'text-blue-900' }`}>
                                              {(Number(p.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-semibold uppercase">
                                              {p.unidade || 'm²'}
                                            </span>
                                          </div>
                                        </button>
                                      );
                                    });
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={handleExecuteCalculateFormula}
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shrink-0 h-[42px]"
                            title="Calcular substituição e resultado da fórmula (ou pressione Enter na caixa de texto)"
                          >
                            <Calculator className="w-4 h-4 text-white" />
                            <span>Calcular</span>
                          </button>
                        </div>
                      </div>

                        {/* VALORES SUBSTITUÍDOS E QUANTIDADE RESULTANTE */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                          <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">
                              Valores Substituídos (Expressão Numérica)
                            </label>
                            <input
                              type="text"
                              readOnly
                              placeholder="Será calculado automaticamente a partir dos parâmetros..."
                              value={liveCalc.text}
                              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono font-bold bg-slate-100 text-blue-900 outline-none cursor-not-allowed shadow-2xs"
                            />
                          </div>

                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <label className="text-xs font-semibold text-slate-700 block mb-1">Quantidade Resultante</label>
                              <input
                                type="number"
                                step="0.0001"
                                value={liveCalc.result}
                                onChange={(e) => setCustomQtd(parseFloat(e.target.value) || 0)}
                                className="w-full p-2 border border-slate-300 rounded-xl text-xs font-mono font-bold bg-white outline-none text-emerald-700"
                              />
                            </div>


                            <button
                              type="button"
                              onClick={handleAddFormulaStep}
                              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Adicionar esta Fórmula</span>
                            </button>
                          </div>
                        </div>

                        {/* TABELA DE FÓRMULAS CALCULADAS ADICIONADAS COM COLUNA DE DESCRIÇÃO DA VARIÁVEL E SELEÇÃO */}
                        {savedCustomFormulas.length > 0 && (
                          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden mt-3">
                            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Calculator className="w-4 h-4 text-emerald-600" />
                                <span className="text-xs font-bold text-slate-900">Fórmulas Calculadas Salvas</span>
                                <span className="text-[11px] text-slate-500 font-medium">({savedCustomFormulas.length} fórmulas)</span>
                              </div>
                              <div className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                                Soma Total: {savedCustomFormulas.reduce((acc, f) => acc + (f.resultado || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {savedCustomFormulas[0]?.unidade || 'm²'}
                              </div>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase text-[10.5px] tracking-wider border-b border-slate-200">
                                  <tr>
                                    <th className="py-2.5 px-3 border-r border-slate-200">DESCRIÇÃO DA VARIÁVEL</th>
                                    <th className="py-2.5 px-3 border-r border-slate-200">Fórmula (Equação Literal)</th>
                                    <th className="py-2.5 px-3 border-r border-slate-200">Valores Substituídos (Expressão Numérica)</th>
                                    <th className="py-2.5 px-3 border-r border-slate-200 text-right w-28">Resultado</th>
                                    <th className="py-2.5 px-3 border-r border-slate-200 text-center w-20">Unidade</th>
                                    <th className="py-2.5 px-3 border-r border-slate-200 text-center w-28">SELEÇÃO</th>
                                    <th className="py-2.5 px-3 text-center w-14">Ações</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white font-medium">
                                  {savedCustomFormulas.map((step, idx) => {
                                    let nome = `Fórmula #${idx + 1}`;
                                    if (step.equacaoLiteral && step.equacaoLiteral.includes('=')) {
                                      const prefix = step.equacaoLiteral.split('=')[0].trim();
                                      if (prefix) nome = prefix;
                                    }
                                    const isSelected = selectedFormulaVar?.id === step.id;

                                    return (
                                      <tr key={step.id} className={`transition-colors ${isSelected ? 'bg-blue-50/60 font-semibold text-blue-950' : 'hover:bg-slate-50 text-slate-800'}`}>
                                        <td className="py-2.5 px-3 border-r border-slate-200">
                                          <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-blue-600 ring-2 ring-blue-200' : 'bg-slate-400'}`} />
                                            <span className="font-bold text-slate-800 text-xs truncate" title={nome}>{nome}</span>
                                          </div>
                                        </td>
                                        <td className="py-2.5 px-3 border-r border-slate-200 font-mono text-slate-900">
                                          {step.equacaoLiteral}
                                        </td>
                                        <td className="py-2.5 px-3 border-r border-slate-200 font-mono text-blue-900">
                                          {step.substituicaoNumerica}
                                        </td>
                                        <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-bold text-emerald-700">
                                          {(step.resultado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-2.5 px-3 border-r border-slate-200 text-center font-mono font-bold text-slate-600">
                                          {step.unidade || 'm²'}
                                        </td>
                                        <td className="py-2.5 px-3 border-r border-slate-200 text-center">
                                          {isSelected ? (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 font-bold rounded-lg text-[11px] border border-blue-200 shadow-2xs">
                                              <Check className="w-3.5 h-3.5" />
                                              <span>Selecionado</span>
                                            </span>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedCustomFormulaId(step.id);
                                                setSelectedCustomParamId(null);
                                              }}
                                              className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-semibold rounded-lg text-[11px] border border-slate-200 shadow-2xs cursor-pointer transition-all"
                                            >
                                              Selecionar
                                            </button>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3 text-center">
                                          <button
                                            type="button"
                                            onClick={() => setSavedCustomFormulas(savedCustomFormulas.filter(s => s.id !== step.id))}
                                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                            title="Remover fórmula calculada"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* VÍNCULO DAS VARIÁVEIS AOS INSUMOS DA COMPOSIÇÃO */}
                        {savedCustomFormulas.length > 0 && selectedFormulaVar && (
                          <div className="p-4 bg-slate-50 border border-blue-200 rounded-xl space-y-3 shadow-2xs mt-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                                  <span className="font-bold text-slate-900 block text-xs flex items-center gap-1.5">
                                    <Target className="w-4 h-4 text-blue-600" />
                                    Variável Selecionada para Vincular:{" "}
                                    <strong className="text-blue-700 font-mono bg-blue-100/70 px-2 py-0.5 rounded border border-blue-200">
                                      {selectedFormulaVar.nome} ({selectedFormulaVar.resultadoFormatted} {selectedFormulaVar.unidade || 'm²'})
                                    </strong>
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    Escolha na tabela abaixo a linha do insumo ou a linha principal para aplicar o valor calculatedo:
                                  </span>
                                </div>

                                <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white shadow-2xs">
                                  <table className="w-full min-w-[680px] text-xs text-left border-collapse">
                                    <thead>
                                      <tr className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                                        <th className="py-2 px-3 w-20 shrink-0">EAP</th>
                                        <th className="py-2 px-3">Item / Insumo da Composição</th>
                                        <th className="py-2 px-3 w-16 text-center shrink-0">UND</th>
                                        <th className="py-2.5 px-3 w-48 text-center shrink-0 whitespace-nowrap">Ação do Vínculo</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                      {/* Linha Principal (Composição Principal) */}
                                      {editingItemModal && !editingItemModal.isSecao && (() => {
                                        const hasBind = Boolean(editingItemModal.equacaoLiteral || editingItemModal.substituicaoNumerica || editingItemModal.observacaoMemoria);
                                        return (
                                          <tr className={`transition-colors ${hasBind ? 'bg-emerald-50/50 hover:bg-emerald-100/60' : 'hover:bg-blue-50/40'}`}>
                                            <td className="py-2 px-3 font-mono font-bold text-blue-700 whitespace-nowrap">{editingItemModal.item_eap || '1.0'}</td>
                                            <td className="py-2 px-3 font-bold text-slate-900">
                                              <div className="flex items-center justify-between gap-2">
                                                <span className="break-words">
                                                  {editingItemModal.descricao} <span className="text-[10px] text-slate-400 font-normal ml-1 whitespace-nowrap">(Linha Principal)</span>
                                                </span>
                                                <ItemBindingInfoEye item={editingItemModal} />
                                              </div>
                                            </td>
                                            <td className="py-2 px-3 text-center font-mono text-slate-600 whitespace-nowrap">{editingItemModal.unidade || 'und'}</td>
                                            <td className="py-2 px-3 text-center whitespace-nowrap">
                                              <button
                                                type="button"
                                                onClick={() => handleApplyMetric('Personalizar', selectedFormulaVar.nome, selectedFormulaVar.resultado, selectedFormulaVar.equacaoLiteral, selectedFormulaVar.substituicaoNumerica, editingItemModal.id)}
                                                className="px-3 py-1 bg-white hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 font-medium rounded-lg text-[11px] flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all mx-auto whitespace-nowrap"
                                              >
                                                <Check className="w-3.5 h-3.5" />
                                                <span>Vincular a este Insumo</span>
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })()}

                                      {/* Lista de Insumos Filhos */}
                                      {childItemsOfComposition && childItemsOfComposition.length > 0 ? (
                                        childItemsOfComposition.map((child) => {
                                          const level = child.level !== undefined ? child.level : (child.item_eap ? Math.max(1, child.item_eap.split('.').length - 1) : 1);
                                          const isChild = level >= 2;
                                          const indentPx = isChild ? (level - 1) * 16 : 0;
                                          const hasBind = Boolean(child.equacaoLiteral || child.substituicaoNumerica || child.observacaoMemoria);

                                          return (
                                            <tr key={child.id} className={`transition-colors ${hasBind ? 'bg-emerald-50/50 hover:bg-emerald-100/60' : (isChild ? 'bg-slate-50/40 hover:bg-blue-50/40' : 'hover:bg-blue-50/40')}`}>
                                              <td className={`py-2 px-3 font-mono whitespace-nowrap ${isChild ? 'font-normal text-slate-500 text-[11px]' : 'font-bold text-slate-700 text-xs'}`}>
                                                {child.item_eap}
                                              </td>
                                              <td className="py-2 px-3" style={{ paddingLeft: `${indentPx + 12}px` }}>
                                                <div className="flex items-center justify-between gap-2">
                                                  <div className="flex items-center gap-1.5 min-w-0">
                                                    {isChild && (
                                                      <CornerDownRight className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                                    )}
                                                    <span className={isChild ? "font-normal text-slate-700 text-xs select-text break-words" : "font-semibold text-slate-900 text-xs uppercase select-text break-words"} title={child.descricao}>
                                                      {child.descricao}
                                                    </span>
                                                  </div>
                                                  <ItemBindingInfoEye item={child} />
                                                </div>
                                              </td>
                                              <td className="py-2 px-3 text-center font-mono text-slate-500 text-xs whitespace-nowrap">{child.unidade || 'und'}</td>
                                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                                <button
                                                  type="button"
                                                  onClick={() => handleApplyMetric('Personalizar', selectedFormulaVar.nome, selectedFormulaVar.resultado, selectedFormulaVar.equacaoLiteral, selectedFormulaVar.substituicaoNumerica, child.id)}
                                                  className="px-3 py-1 bg-white hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 font-medium rounded-lg text-[11px] flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all mx-auto whitespace-nowrap"
                                                >
                                                  <Check className="w-3.5 h-3.5" />
                                                  <span>Vincular a este Insumo</span>
                                                </button>
                                              </td>
                                            </tr>
                                          );
                                        })
                                      ) : (
                                        !editingItemModal && (
                                          <tr>
                                            <td colSpan={4} className="py-3 px-3 text-center text-slate-400 italic text-xs">
                                              Nenhum insumo encontrado nesta composição.
                                            </td>
                                          </tr>
                                        )
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingItemModal(null)}
                className="px-3.5 py-1.5 border border-slate-300 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveItemFormula}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Aplicar no Memorial</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showBibliotecaModal && (
        <BibliotecaFormulasModal
          isOpen={showBibliotecaModal}
          onClose={() => setShowBibliotecaModal(false)}
        />
      )}

      {showBancoModal && (
        <ModalSelecaoBancoMemoria
          isOpen={showBancoModal}
          onClose={() => setShowBancoModal(false)}
          onSelect={handleSelectBancoItem}
        />
      )}

      {/* MODAL DE GERENCIAMENTO DE PARÂMETROS E FÓRMULAS DA LINHA DE SEÇÃO */}
      {paramEditorIndex !== null && itens[paramEditorIndex] && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-[94vw] max-w-5xl p-5 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  <span>Configurações & Cálculos - Linha {itens[paramEditorIndex].item_eap}</span>
                </h3>
                <p className="text-[11px] text-slate-500 truncate max-w-sm mt-0.5">
                  {itens[paramEditorIndex].descricao || 'Seção / Setor'}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setParamEditorIndex(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer text-lg font-bold"
              >
                ×
              </button>
            </div>

            {/* NAVEGAÇÃO ENTRE ABAS DO MODAL */}
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setParamModalTab('parametros')}
                className={`px-4 py-2 text-xs font-bold border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
                  paramModalTab === 'parametros'
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>1. Parâmetros & Variáveis</span>
              </button>
              <button
                type="button"
                onClick={() => setParamModalTab('formulas')}
                className={`px-4 py-2 text-xs font-bold border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
                  paramModalTab === 'formulas'
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>2. Fórmulas & Cálculos da Linha</span>
              </button>
            </div>

            {/* ABA 1: PARÂMETROS & VARIÁVEIS DA LINHA */}
            {paramModalTab === 'parametros' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* PARÂMETROS HERDADOS (GLOBAIS DA OBRA + LINHAS MÃES/SEÇÕES ANCESTRAIS) */}
                {(() => {
                  const targetItemEap = (itens[paramEditorIndex]?.item_eap || '').trim();
                  const heranca = getHerancaParametrosEap(paramEditorIndex, itens).filter(h => h.itemEap !== targetItemEap);
                  if (heranca.length === 0) return null;

                  const herancaGlobais = heranca.filter(h => h.itemEap === 'GLOBAL');
                  const herancaAncestrais = heranca.filter(h => h.itemEap !== 'GLOBAL');

                  return (
                    <div className="space-y-3">
                      {/* Globais */}
                      {herancaGlobais.length > 0 && (
                        <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200/80 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                              <Globe className="w-3.5 h-3.5 text-emerald-600" />
                              <span>🌍 Parâmetros Globais da Obra (Acessíveis por todo o orçamento)</span>
                            </span>
                            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100/80 px-2 py-0.5 rounded-md">
                              Escopo Global
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {herancaGlobais.map(({ param }, hIdx) => {
                              const valNum = typeof param.valor === 'number' ? param.valor : parseFloat(String(param.valor)) || 0;
                              const valFormatted = valNum > 0 ? valNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(param.valor);
                              return (
                                <div key={param.id || hIdx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-emerald-200/60 shadow-2xs">
                                  <div>
                                    <span className="font-bold text-[11px] text-slate-800 block truncate">{param.label}</span>
                                    <span className="text-[9.5px] text-slate-500 font-mono">[{param.chave}]</span>
                                  </div>
                                  <span className="font-mono font-bold text-[11px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0 border border-emerald-200">
                                    {valFormatted} {param.unidade}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Herança Seção Pai */}
                      {herancaAncestrais.length > 0 && (
                        <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/80 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                              <span>📂 Parâmetros Herdados da Seção Pai ({herancaAncestrais[0].itemEap})</span>
                            </span>
                            <span className="text-[10px] text-blue-700 font-semibold bg-blue-100/80 px-2 py-0.5 rounded-md">
                              Herança EAP Pai
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {herancaAncestrais.map(({ itemEap, param }, hIdx) => {
                              const valNum = typeof param.valor === 'number' ? param.valor : parseFloat(String(param.valor)) || 0;
                              const valFormatted = valNum > 0 ? valNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(param.valor);
                              return (
                                <div key={param.id || hIdx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-blue-200/60 shadow-2xs">
                                  <div>
                                    <span className="font-bold text-[11px] text-slate-800 block truncate">{param.label}</span>
                                    <span className="text-[9.5px] text-slate-500 font-mono">[{param.chave}] • Linha EAP {itemEap}</span>
                                  </div>
                                  <span className="font-mono font-bold text-[11px] text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded shrink-0 border border-blue-200">
                                    {valFormatted} {param.unidade}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* LISTA DE PARÂMETROS JÁ CADASTRADOS */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(!itens[paramEditorIndex].parametrosLocais || itens[paramEditorIndex].parametrosLocais.length === 0) ? (
                    <div className="text-center py-4 text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      Nenhum parâmetro específico cadastrado para esta linha.
                    </div>
                  ) : (
                    itens[paramEditorIndex].parametrosLocais!.map(p => {
                      const catIcon = p.categoria?.includes('Piso') ? '🏢' :
                                     p.categoria?.includes('Parede') ? '🧱' :
                                     p.categoria?.includes('Estrutura') ? '📐' :
                                     p.categoria?.includes('Terraplenagem') ? '🚜' :
                                     p.categoria?.includes('Cobertura') ? '🏠' : '📌';
                      return (
                        <div key={p.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                          <div>
                            <span className="font-bold text-xs text-slate-800 flex items-center gap-1">
                              <span>{catIcon}</span>
                              <span>{p.label}</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">Variável: [{p.chave}] ({p.categoria || 'Geral'})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {p.valor} {p.unidade}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveParametroLinha(paramEditorIndex, p.id)}
                              className="text-slate-400 hover:text-rose-600 font-bold px-1 text-sm cursor-pointer"
                              title="Excluir parâmetro"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* FORMULÁRIO DE NOVO PARÂMETRO COM SELEÇÃO DE CAMPO PADRONIZADO */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Adicionar Novo Parâmetro do Sistema</h4>
                  
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">Selecione o Campo / Variável Oficial</label>
                      <select
                        value={newParamData.chave || ''}
                        onChange={(e) => {
                          const selectedChave = e.target.value;
                          const campo = CATALOGO_CAMPOS_SISTEMA.find(c => c.chave === selectedChave);
                          if (campo) {
                            if (campo.chave === 'personalizado') {
                              setNewParamData({ label: '', chave: 'personalizado', valor: newParamData.valor, unidade: '', categoria: 'Geral' });
                            } else {
                              setNewParamData({ label: campo.label, chave: campo.chave, valor: newParamData.valor, unidade: campo.unidade, categoria: campo.categoria });
                            }
                          }
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 bg-white cursor-pointer"
                      >
                        <option value="">-- Escolha um Campo do Catálogo --</option>
                        {Array.from(new Set(CATALOGO_CAMPOS_SISTEMA.map(c => c.categoria))).map(cat => (
                          <optgroup key={cat} label={cat} className="font-bold text-slate-800">
                            {CATALOGO_CAMPOS_SISTEMA.filter(c => c.categoria === cat).map(c => (
                              <option key={c.chave} value={c.chave} className="font-medium text-slate-900">
                                {c.label} {c.unidade ? `(${c.unidade})` : ''}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    {newParamData.chave === 'personalizado' && (
                      <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-150">
                        <div className="col-span-2">
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">Nome Personalizado</label>
                          <input
                            type="text"
                            value={newParamData.label}
                            onChange={(e) => {
                              const lbl = e.target.value;
                              const slug = lbl.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                              setNewParamData({ ...newParamData, label: lbl, chave: slug || 'personalizado' });
                            }}
                            placeholder="Ex: Área de Esquadrias"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 bg-white"
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">Valor</label>
                        <input
                          type="text"
                          value={newParamData.valor}
                          onChange={(e) => setNewParamData({ ...newParamData, valor: e.target.value })}
                          placeholder="Ex: 400"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-blue-500 bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">Unidade</label>
                        <input
                          type="text"
                          value={newParamData.unidade}
                          onChange={(e) => setNewParamData({ ...newParamData, unidade: e.target.value })}
                          placeholder="Ex: m², m, m³"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-blue-500 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setParamEditorIndex(null)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Concluir
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddParametroLinha(paramEditorIndex)}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
                    >
                      + Adicionar Parâmetro
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ABA 2: FÓRMULAS & CÁLCULOS DA LINHA */}
            {paramModalTab === 'formulas' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* BOTÕES DE ACESSO DIRETO ÀS PLANILHAS DE CÁLCULO ESPECIALIZADAS COM CROQUIS */}
                <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/80 space-y-2">
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span>Planilhas Esquemáticas de Engenharia (com Croquis & 8 Variáveis)</span>
                  </span>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Abra a planilha completa com croqui esquemático, tabela de elementos e cálculo simultâneo de Concreto, Fôrma, Escavação, Aço, Lastro, Impermeabilização e Reaterro:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const target = itens[paramEditorIndex];
                        setEditingItemModal(target);
                        setModoCalculoModal('tabela_vigas');
                        setParamEditorIndex(null);
                      }}
                      className="px-2.5 py-1.5 bg-white hover:bg-blue-100 text-blue-800 text-[11px] font-bold rounded-lg border border-blue-200 flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <span>🧱 Vigas Baldrames</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const target = itens[paramEditorIndex];
                        setEditingItemModal(target);
                        setModoCalculoModal('tabela_sapatas');
                        setParamEditorIndex(null);
                      }}
                      className="px-2.5 py-1.5 bg-white hover:bg-blue-100 text-blue-800 text-[11px] font-bold rounded-lg border border-blue-200 flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <span>📐 Sapatas Isoladas</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const target = itens[paramEditorIndex];
                        setEditingItemModal(target);
                        setModoCalculoModal('tabela_blocos');
                        setParamEditorIndex(null);
                      }}
                      className="px-2.5 py-1.5 bg-white hover:bg-blue-100 text-blue-800 text-[11px] font-bold rounded-lg border border-blue-200 flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <span>🧊 Blocos de Fundação</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const target = itens[paramEditorIndex];
                        setEditingItemModal(target);
                        setModoCalculoModal('tabela_tubuloes');
                        setParamEditorIndex(null);
                      }}
                      className="px-2.5 py-1.5 bg-white hover:bg-blue-100 text-blue-800 text-[11px] font-bold rounded-lg border border-blue-200 flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <span>⭕ Tubulões</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const target = itens[paramEditorIndex];
                        setEditingItemModal(target);
                        setModoCalculoModal('tabela_estacas');
                        setParamEditorIndex(null);
                      }}
                      className="px-2.5 py-1.5 bg-white hover:bg-blue-100 text-blue-800 text-[11px] font-bold rounded-lg border border-blue-200 flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <span>📍 Estacas</span>
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                  <span className="text-xs font-bold text-slate-800 block">
                    Ou Selecione uma Fórmula Simples da Biblioteca / Expressão:
                  </span>

                  <select
                    value={selectedFormula?.id || 'custom'}
                    onChange={(e) => {
                      const found = formulasDisponiveis.find(f => f.id === e.target.value);
                      setSelectedFormula(found || null);
                      if (found) {
                        const initialParams: Record<string, number> = {};
                        // Preenche parâmetros requeridos automaticamente com a herança EAP
                        const heranca = getHerancaParametrosEap(paramEditorIndex, itens);
                        (found.parametrosRequeridos || []).forEach(p => {
                          const matched = heranca.find(h => h.param.chave === p.chave);
                          initialParams[p.chave] = matched ? (parseFloat(String(matched.param.valor)) || 0) : (p.padrao || 0);
                        });
                        setParamInputs(initialParams);

                        // Se for uma fórmula de elemento estrutural completo, abre a planilha correspondente
                        if (found.id === 'viga_baldrame_completo' || found.categoria.includes('Vigas Baldrames')) {
                          setEditingItemModal(itens[paramEditorIndex]);
                          setModoCalculoModal('tabela_vigas');
                          setParamEditorIndex(null);
                        } else if (found.id === 'sapata_isolada_completo' || found.categoria.includes('Sapatas')) {
                          setEditingItemModal(itens[paramEditorIndex]);
                          setModoCalculoModal('tabela_sapatas');
                          setParamEditorIndex(null);
                        } else if (found.id === 'bloco_fundacao_completo' || found.categoria.includes('Blocos')) {
                          setEditingItemModal(itens[paramEditorIndex]);
                          setModoCalculoModal('tabela_blocos');
                          setParamEditorIndex(null);
                        } else if (found.id === 'tubulao_completo' || found.categoria.includes('Tubulões')) {
                          setEditingItemModal(itens[paramEditorIndex]);
                          setModoCalculoModal('tabela_tubuloes');
                          setParamEditorIndex(null);
                        } else if (found.id === 'estaca_fundacao_completo' || found.categoria.includes('Estacas')) {
                          setEditingItemModal(itens[paramEditorIndex]);
                          setModoCalculoModal('tabela_estacas');
                          setParamEditorIndex(null);
                        }
                      }
                    }}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold bg-white text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="custom">-- Digitar Fórmula Manual / Expressão --</option>
                    {formulasDisponiveis.map(f => (
                      <option key={f.id} value={f.id}>{f.nome} ({f.unidadeResultante})</option>
                    ))}
                  </select>

                  {selectedFormula ? (
                    <div className="space-y-3 pt-2">
                      <span className="text-[11px] font-bold text-slate-700 block border-b border-slate-200 pb-1">
                        Variáveis da Fórmula "{selectedFormula.nome}":
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {(selectedFormula.parametrosRequeridos || []).map(p => (
                          <div key={p.chave}>
                            <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                              {p.nome} {p.unidade ? `(${p.unidade})` : ''}
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={paramInputs[p.chave] ?? p.padrao ?? 0}
                              onChange={(e) => setParamInputs({ ...paramInputs, [p.chave]: parseFloat(e.target.value) || 0 })}
                              className="w-full px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 bg-white"
                            />
                          </div>
                        ))}
                      </div>

                      {(() => {
                        const res = selectedFormula.formatarExpressao ? selectedFormula.formatarExpressao(paramInputs) : {
                          literal: selectedFormula.equacaoExemplo || selectedFormula.nome,
                          substituicao: `Q = ${selectedFormula.nome}`,
                          resultado: 1
                        };
                        return (
                          <div className="bg-white p-3 rounded-xl border border-slate-200 font-mono text-xs space-y-2">
                            <div className="text-slate-600 italic font-sans">{res.literal}</div>
                            <div className="font-bold text-blue-900">{res.substituicao}</div>
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                              <span className="font-bold text-emerald-700 text-xs">
                                Quantidade = {res.resultado.toFixed(2)} {selectedFormula.unidadeResultante}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const copia = [...itens];
                                  const target = copia[paramEditorIndex];
                                  target.quantidade = res.resultado;
                                  target.formulaNome = selectedFormula.nome;
                                  target.equacaoLiteral = res.literal;
                                  target.substituicaoNumerica = res.substituicao;
                                  target.unidade = selectedFormula.unidadeResultante || target.unidade;
                                  onChangeItens(copia);
                                }}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                              >
                                ✓ Aplicar Resultado na Linha
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        Equação Literal Manual
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: = [area_parede] * [pe_direito]"
                        value={customTextLiteral}
                        onChange={(e) => setCustomTextLiteral(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-xl text-xs font-mono font-semibold bg-white text-slate-900 outline-none focus:border-blue-500"
                      />
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (!customTextLiteral.trim()) return;
                            const copia = [...itens];
                            const target = copia[paramEditorIndex];
                            target.equacaoLiteral = customTextLiteral;
                            onChangeItens(copia);
                            setCustomTextLiteral('');
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Salvar Fórmula Manual
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setParamEditorIndex(null)}
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE MEMORIAL DE CÁLCULO DETALHADO DA LINHA (ACESSAR MEMORIAL) */}
      {memorialDetalhadoIndex !== null && (() => {
        const targetItem = itens[memorialDetalhadoIndex];
        if (!targetItem) return null;

        const parentSecaoIdx = getDirectParentSectionIndex(memorialDetalhadoIndex, itens);
        const sectionItem = targetItem.isSecao ? targetItem : (parentSecaoIdx >= 0 ? itens[parentSecaoIdx] : targetItem);

        const displayParams = sectionItem.parametrosLocais || [];
        const heranca = getHerancaParametrosEap(memorialDetalhadoIndex, itens);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-[94vw] max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
              {/* Modal Header */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  <div>
                    <h3 className="font-bold text-sm tracking-tight text-white flex items-center gap-2">
                      <span>Detalhamento da Memória de Cálculo</span>
                      <span className="font-mono bg-blue-900/80 text-blue-200 px-2 py-0.5 rounded text-xs">Item EAP {sectionItem.item_eap}</span>
                    </h3>
                    <p className="text-[11px] text-slate-300 font-medium uppercase truncate max-w-xl">
                      {sectionItem.descricao || 'Detalhamento Técnico de Engenharia'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir Memória</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemorialDetalhadoIndex(null)}
                    className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer text-lg font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-6 text-xs text-slate-800 font-sans">
                {/* Fórmulas & Transcrições */}
                {(sectionItem.equacaoLiteral || sectionItem.substituicaoNumerica || sectionItem.observacaoMemoria) && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <span className="font-bold text-xs text-slate-800 uppercase tracking-wide block">
                      Fórmula & Passos Calculados
                    </span>
                    {sectionItem.observacaoMemoria && (
                      <div className="text-xs text-slate-700 font-bold uppercase">{sectionItem.observacaoMemoria}</div>
                    )}
                    {sectionItem.equacaoLiteral && (
                      <div className="font-mono text-xs text-slate-600 italic">{sectionItem.equacaoLiteral}</div>
                    )}
                    {sectionItem.substituicaoNumerica && (
                      <div className="font-mono font-bold text-sm text-blue-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs inline-block">
                        {sectionItem.substituicaoNumerica}
                      </div>
                    )}
                    {!readonly && (
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            handleUnlinkFormula(parentSecaoIdx >= 0 ? parentSecaoIdx : memorialDetalhadoIndex);
                            setMemorialDetalhadoIndex(null);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 flex items-center gap-1 cursor-pointer transition-colors"
                          title="Desvincular fórmula desta linha"
                        >
                          <Unlink className="w-3.5 h-3.5 text-rose-600" />
                          <span>Desvincular Fórmula</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Medidas e Parâmetros da Seção em Tabela Estruturada */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-1.5 flex items-center justify-between">
                    <span>Tabela de Parâmetros e Medições ({displayParams.length})</span>
                  </h4>

                  {displayParams.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      Nenhum parâmetro medido cadastrado para esta linha.
                    </div>
                  ) : (
                    <div className="overflow-hidden border border-slate-200 rounded-xl shadow-2xs">
                      <table className="w-full text-xs text-left border-collapse bg-white">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                            <th className="p-2.5 border-r border-slate-200">Categoria</th>
                            <th className="p-2.5 border-r border-slate-200">Descrição do Parâmetro</th>
                            <th className="p-2.5 border-r border-slate-200 font-mono">Chave</th>
                            <th className="p-2.5 text-right font-mono">Valor Medido</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayParams.map((p, idx) => {
                            const valNum = typeof p.valor === 'number' ? p.valor : parseFloat(String(p.valor)) || 0;
                            const valFormatted = valNum > 0 ? valNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(p.valor);
                            return (
                              <tr key={p.id || idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="p-2.5 border-r border-slate-200 text-slate-500 font-medium text-[11px]">{p.categoria || 'Geral'}</td>
                                <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900">{p.label}</td>
                                <td className="p-2.5 border-r border-slate-200 font-mono text-slate-500 text-[11px]">[{p.chave}]</td>
                                <td className="p-2.5 text-right font-mono font-bold text-blue-950 bg-blue-50/40">
                                  {valFormatted} {p.unidade}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Parâmetros Herdados dos Níveis Superiores em Tabela */}
                {heranca.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-1.5">
                      Parâmetros Herdados dos Níveis Superiores ({heranca.length})
                    </h4>
                    <div className="overflow-hidden border border-slate-200 rounded-xl shadow-2xs">
                      <table className="w-full text-xs text-left border-collapse bg-white">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                            <th className="p-2.5 border-r border-slate-200 font-mono">Origem EAP</th>
                            <th className="p-2.5 border-r border-slate-200">Descrição Parâmetro</th>
                            <th className="p-2.5 border-r border-slate-200 font-mono">Chave</th>
                            <th className="p-2.5 text-right font-mono">Valor Medido</th>
                          </tr>
                        </thead>
                        <tbody>
                          {heranca.map(({ itemEap, param }, hIdx) => {
                            const valNum = typeof param.valor === 'number' ? param.valor : parseFloat(String(param.valor)) || 0;
                            const valFormatted = valNum > 0 ? valNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(param.valor);
                            return (
                              <tr key={param.id || hIdx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="p-2.5 border-r border-slate-200 font-mono font-bold text-blue-700 text-[11px]">EAP {itemEap || 'Header'}</td>
                                <td className="p-2.5 border-r border-slate-200 font-bold text-slate-800">{param.label}</td>
                                <td className="p-2.5 border-r border-slate-200 font-mono text-slate-500 text-[11px]">[{param.chave}]</td>
                                <td className="p-2.5 text-right font-mono font-bold text-blue-900 bg-blue-50/30">
                                  {valFormatted} {param.unidade}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setMemorialDetalhadoIndex(null)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Concluir e Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL GLOBAL: RELATÓRIO DE MEMÓRIA DE CÁLCULO COMPLETO DO ORÇAMENTO */}
      {mostrarMemorialGlobal && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200 print:p-0 print:bg-white print:static print:block">
          <div className="bg-white rounded-2xl w-[96vw] max-w-5xl h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden print:w-full print:h-auto print:shadow-none print:border-none print:rounded-none">
            {/* Top Toolbar (Oculto na impressão) */}
            <div className="p-4 bg-slate-950 text-white flex items-center justify-between shrink-0 print:hidden">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-bold text-sm text-white tracking-tight">
                    Relatório Oficial de Memória de Cálculo & Engenharia
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    OrçaBRP • Documento estruturado para apresentação ao cliente / auditoria
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4 text-white" />
                  <span>Imprimir / Salvar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarMemorialGlobal(false)}
                  className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer text-lg font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Document Content */}
            <div className="p-8 overflow-y-auto space-y-8 bg-white font-sans text-slate-900 print:p-0 print:overflow-visible">
              {/* Paper Header */}
              <div className="border-b-2 border-slate-900 pb-6 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-blue-900 font-black text-xl tracking-tight mb-1">
                    <span>OrçaBRP</span>
                    <span className="text-slate-400 font-normal text-sm">| Engenharia & Custos</span>
                  </div>
                  <h1 className="text-lg font-extrabold text-slate-900 uppercase tracking-tight">
                    Relatório Técnico de Memória de Cálculo
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Detalhamento analítico de fórmulas, parâmetros de geometria e medições.
                  </p>
                </div>
                <div className="text-right text-xs space-y-1 font-mono text-slate-600">
                  <div>Data de Emissão: {new Date().toLocaleDateString('pt-BR')}</div>
                  <div>Status: <span className="font-bold text-slate-900 uppercase">Documento Final</span></div>
                </div>
              </div>

              {/* Seções e Tabelas de Composições por Área */}
              {(() => {
                const secoesGrouped: Array<{
                  secao: ItemMemoriaOficial | null;
                  items: ItemMemoriaOficial[];
                }> = [];

                let currentGroup: { secao: ItemMemoriaOficial | null; items: ItemMemoriaOficial[] } = {
                  secao: null,
                  items: []
                };

                itens.forEach(it => {
                  if (it.isSecao) {
                    if (currentGroup.secao || currentGroup.items.length > 0) {
                      secoesGrouped.push(currentGroup);
                    }
                    currentGroup = { secao: it, items: [] };
                  } else {
                    currentGroup.items.push(it);
                  }
                });
                if (currentGroup.secao || currentGroup.items.length > 0) {
                  secoesGrouped.push(currentGroup);
                }

                return (
                  <div className="space-y-10">
                    {secoesGrouped.map((grp, gIdx) => {
                      const { secao, items: childItems } = grp;
                      const secParams = secao?.parametrosLocais || (secao as any)?.parametros_locais || [];
                      const secFormulas = (secao as any)?.formulasLista || (secao as any)?.formulas_lista || [];
                      const secHasMath = !!(secao?.equacaoLiteral || secao?.substituicaoNumerica || secao?.observacaoMemoria);

                      return (
                        <div key={secao?.id || gIdx} className="space-y-4 print:break-inside-avoid">
                          {/* TÍTULO DA SEÇÃO / ÁREA (Ex: 1. SERVIÇOS DIVERSOS) */}
                          {secao && (
                            <div className="border-b-2 border-slate-900 pb-2">
                              <h2 className="text-base font-extrabold text-slate-900 uppercase flex items-center justify-between">
                                <span>{secao.item_eap}. {secao.descricao || 'SEÇÃO'}</span>
                                <span className="text-xs font-normal text-slate-500 font-mono">EAP {secao.item_eap}</span>
                              </h2>
                            </div>
                          )}

                          {/* CÁLCULOS E FÓRMULAS DETALHADAS DA ÁREA (TABELA ANALÍTICA SEM TRUNCAMENTO DE TEXTO) */}
                          {((secParams && secParams.length > 0) || (secFormulas && secFormulas.length > 0) || secHasMath) && (
                            <div className="my-3 border border-slate-300 rounded-xl overflow-hidden shadow-2xs bg-white">
                              <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-300 flex items-center justify-between">
                                <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                                  📐 Detalhamento Analítico de Fórmulas & Medições ({secao?.item_eap} {secao?.descricao})
                                </span>
                                <span className="text-[10px] font-mono font-bold bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                                  {secFormulas.length > 0 ? `${secFormulas.length} Fórmulas Calculadas` : `${secParams.length} Parâmetros de Geometria`}
                                </span>
                              </div>

                              <table className="w-full text-xs text-left border-collapse bg-white">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-800 font-bold uppercase text-[10px] border-b border-slate-300">
                                    <th className="py-2 px-3 border-r border-slate-300 w-1/3">Parâmetro / Medida Calculada</th>
                                    <th className="py-2 px-3 border-r border-slate-300 w-32 text-right font-mono">Resultado Final</th>
                                    <th className="py-2 px-3 font-mono">Fórmula & Equação Detalhada</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  {/* Renderiza Fórmulas Calculadas da Seção se existirem */}
                                  {secFormulas.length > 0 ? (
                                    secFormulas.map((f: any, fIdx: number) => {
                                      const valNum = typeof f.valor === 'number' ? f.valor : parseFloat(String(f.valor)) || 0;
                                      const valFormatted = valNum > 0 
                                        ? valNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) 
                                        : String(f.valor || '0,00');
                                      const eqLit = f.equacaoLiteral || f.formula || f.equacao || '';
                                      const subNum = f.substituicaoNumerica || '';

                                      return (
                                        <tr key={f.id || fIdx} className="hover:bg-slate-50/80 transition-colors">
                                          <td className="py-2 px-3 border-r border-slate-200 font-bold text-slate-900 text-xs">
                                            {f.label || f.nome || f.descricao || `Fórmula ${fIdx + 1}`}
                                          </td>
                                          <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-extrabold text-blue-950 text-xs">
                                            {valFormatted} <span className="text-slate-600 text-[10px] uppercase font-medium">{f.unidade}</span>
                                          </td>
                                          <td className="py-2 px-3 font-mono text-xs text-slate-800 bg-slate-50/40">
                                            {subNum ? (
                                              <div className="font-semibold text-blue-900">{subNum}</div>
                                            ) : eqLit ? (
                                              <div className="italic text-slate-700">{eqLit}</div>
                                            ) : (
                                              <span className="text-slate-400 italic text-[11px] font-sans">Valor calculado / Fator geométrico</span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })
                                  ) : (
                                    /* Renderiza Parâmetros da Seção se não houver lista de fórmulas salvas */
                                    secParams.map((p: any, pIdx: number) => {
                                      const valNum = typeof p.valor === 'number' ? p.valor : parseFloat(String(p.valor)) || 0;
                                      const valFormatted = valNum > 0 
                                        ? valNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) 
                                        : String(p.valor || '0,00');

                                      return (
                                        <tr key={p.id || pIdx} className="hover:bg-slate-50/80 transition-colors">
                                          <td className="py-2 px-3 border-r border-slate-200 font-semibold text-slate-800 text-xs">
                                            {p.label || p.nome || `Parâmetro ${pIdx + 1}`}
                                          </td>
                                          <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-extrabold text-blue-950 text-xs">
                                            {valFormatted} <span className="text-slate-600 text-[10px] uppercase font-medium">{p.unidade}</span>
                                          </td>
                                          <td className="py-2 px-3 font-mono text-xs text-slate-600 bg-slate-50/40">
                                            <span className="text-slate-400 italic text-[11px] font-sans">Parâmetro geométrico de entrada da seção</span>
                                          </td>
                                        </tr>
                                      );
                                    })
                                  )}

                                  {/* Linha adicional para cálculo principal da seção se preenchido */}
                                  {secHasMath && (
                                    <tr className="bg-blue-50/40 font-bold border-t border-slate-300">
                                      <td className="py-2 px-3 border-r border-slate-200 font-extrabold text-blue-950 text-xs uppercase">
                                        {secao?.observacaoMemoria || 'Cálculo da Seção'}
                                      </td>
                                      <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-black text-blue-950 text-xs">
                                        {secao?.substituicaoNumerica ? (secao.substituicaoNumerica.split('=').pop()?.trim() || '') : '-'}
                                      </td>
                                      <td className="py-2 px-3 font-mono text-xs text-blue-900">
                                        {secao?.equacaoLiteral && <div className="text-slate-600 text-[11px] italic font-normal">{secao.equacaoLiteral}</div>}
                                        {secao?.substituicaoNumerica && <div className="font-extrabold">{secao.substituicaoNumerica}</div>}
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* TABELA DE COMPOSIÇÕES E INSUMOS DA SEÇÃO */}
                          {childItems.length > 0 && (
                            <div className="overflow-hidden border border-slate-300 rounded-xl shadow-2xs">
                              <table className="w-full text-xs text-left border-collapse bg-white">
                                <thead>
                                  <tr className="bg-slate-100 text-slate-900 font-bold uppercase text-[10px] border-b border-slate-300">
                                    <th className="p-2.5 border-r border-slate-300 w-16 font-mono text-center">Item</th>
                                    <th className="p-2.5 border-r border-slate-300">Atividade / Descrição do Serviço</th>
                                    <th className="p-2.5 border-r border-slate-300 w-24 text-right font-mono">Qntd.</th>
                                    <th className="p-2.5 border-r border-slate-300 w-16 text-center uppercase">Un</th>
                                    <th className="p-2.5 font-mono">Medida / Fórmula Vinc.</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {childItems.map((ci, cIdx) => {
                                    const formulaStr = ci.substituicaoNumerica || ci.equacaoLiteral || (ci.observacaoMemoria ? ci.observacaoMemoria : '');
                                    const valNum = typeof ci.quantidade === 'number' ? ci.quantidade : parseFloat(String(ci.quantidade)) || 0;
                                    const valFormatted = valNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

                                    const eapParts = (ci.item_eap || '').split('.');
                                    const level = ci.level !== undefined ? ci.level : Math.max(1, eapParts.length - 1);
                                    const isChild = level >= 2;
                                    const indentPx = isChild ? (level - 1) * 16 : 0;

                                    return (
                                      <tr key={ci.id || cIdx} className={`border-b border-slate-200 transition-colors ${isChild ? 'bg-slate-50/40 hover:bg-slate-100/50' : 'bg-white hover:bg-slate-50'}`}>
                                        <td className={`p-2.5 border-r border-slate-200 font-mono text-center ${isChild ? 'font-normal text-slate-500 text-[11px]' : 'font-bold text-slate-800 text-xs'}`}>
                                          {ci.item_eap}
                                        </td>
                                        <td className="p-2.5 border-r border-slate-200" style={{ paddingLeft: `${indentPx + 12}px` }}>
                                          <div className="flex items-center gap-1.5">
                                            {isChild && (
                                              <CornerDownRight className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                            )}
                                            <span className={isChild ? "font-normal text-slate-700 text-xs select-text" : "font-semibold text-slate-900 text-xs uppercase select-text"}>
                                              {ci.descricao}
                                            </span>
                                          </div>
                                        </td>
                                        <td className={`p-2.5 border-r border-slate-200 text-right font-mono ${isChild ? 'font-normal text-slate-600 text-xs' : 'font-bold text-blue-950 text-xs'}`}>
                                          {valFormatted}
                                        </td>
                                        <td className="p-2.5 border-r border-slate-200 text-center text-slate-600 font-medium uppercase text-[11px]">
                                          {ci.unidade}
                                        </td>
                                        <td className="p-2.5 font-mono text-xs text-blue-900 bg-slate-50/30">
                                          {formulaStr ? (
                                            <span className={isChild ? "font-normal text-blue-800 text-[11px]" : "font-semibold text-blue-900"}>{formulaStr}</span>
                                          ) : (
                                            <span className="text-slate-300 italic font-sans text-[11px]">-</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Document Footer */}
              <div className="pt-8 border-t-2 border-slate-900 flex items-center justify-between text-xs text-slate-500 font-mono">
                <div>Memória de Cálculo Gerada Automaticamente pelo Sistema OrçaBRP</div>
                <div>Documento Oficial de Engenharia</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
