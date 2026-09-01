import { useState, useEffect, useRef } from 'react';
// Studio De-Para Exclusivo Banco Próprio com Botão Único "+ Vincular" e Insumos da Composição Linha a Linha
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import { 
  ArrowLeft, Search, Plus, Trash2, CheckCircle2, 
  Layers, Package, ArrowRight, RefreshCw, Calculator, FileSpreadsheet, X,
  ChevronDown, ChevronRight, Folder, FolderOpen, Strikethrough, Download, PlusCircle, GripVertical,
  FilePlus, FileMinus
} from 'lucide-react';
import { clsx } from 'clsx';

type ImportadoItem = {
  id: string;
  orcamento_importado_id: string;
  item_eap: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valor_unitario_orig: number;
  valor_unitario_mat_orig?: number;
  valor_unitario_mo_orig?: number;
  total_orig: number;
  total_mat_orig?: number;
  total_mo_orig?: number;
  composicao_id?: string;
  insumo_id?: string;
  tipo_vinculo?: 'composicao' | 'insumo' | 'texto';
  valor_unitario_empresa: number;
  total_empresa: number;
  is_summary?: boolean;
  status_linha?: 'ativo' | 'inativo' | 'inserido_empresa' | 'inserido_empresa_e_cliente' | 'desdobrado';
  // Campos populados do JOIN
  composicao?: any;
  insumo?: any;
};

const sortEap = (a: string, b: string) => {
  const cleanA = (a || '').trim();
  const cleanB = (b || '').trim();
  
  const partsA = cleanA.split('.');
  const partsB = cleanB.split('.');
  
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const partA = partsA[i] || '';
    const partB = partsB[i] || '';
    
    const numA = parseInt(partA, 10);
    const numB = parseInt(partB, 10);
    
    if (!isNaN(numA) && !isNaN(numB)) {
      if (numA !== numB) return numA - numB;
    } else {
      if (partA !== partB) return partA.localeCompare(partB);
    }
  }
  return 0;
};

const isDesdobradoEap = (itemEap: string, allItems: ImportadoItem[]) => {
  const parts = (itemEap || '').split('.');
  if (parts.length <= 1) return false;
  for (let i = 1; i < parts.length; i++) {
    const ancestorEap = parts.slice(0, i).join('.');
    const ancestor = allItems.find(it => it.item_eap === ancestorEap);
    if (ancestor && ancestor.composicao_id) {
      return true;
    }
  }
  return false;
};

const rebuildStudioEaps = (list: ImportadoItem[]): ImportadoItem[] => {
  const copy = list.map(item => ({ ...item }));
  let sectionSeq = 0;
  let compSeq = 0;
  let childSeq = 0;

  let currentSectionEap = '1';
  let currentCompEap = '1.1';

  for (let i = 0; i < copy.length; i++) {
    const item = copy[i];
    if (item.status_linha === 'inativo') continue;

    const origParts = (item.item_eap || '').split('.').filter(Boolean);
    const isDesdobrado = item.status_linha === 'desdobrado';
    const isExplicitSection = item.tipo_vinculo === 'texto' || (origParts.length === 1 && (item.quantidade === 0 || !item.quantidade));

    let level = 1;
    if (isExplicitSection) {
      level = 0;
    } else if (isDesdobrado || (item as any).isSubitem || origParts.length >= 3) {
      level = 2;
    } else {
      level = 1;
    }

    if (level === 0) {
      sectionSeq++;
      compSeq = 0;
      childSeq = 0;
      item.item_eap = String(sectionSeq);
      currentSectionEap = item.item_eap;
    } else if (level === 1) {
      compSeq++;
      childSeq = 0;
      item.item_eap = `${currentSectionEap}.${compSeq}`;
      currentCompEap = item.item_eap;
    } else if (level === 2) {
      childSeq++;
      item.item_eap = `${currentCompEap}.${childSeq}`;
    }
  }

  return copy;
};

export default function OrcamentoDeParaStudio() {
  const { importId } = useParams<{ importId: string }>();
  const navigate = useNavigate();
  const { sidebarCollapsed } = useOutletContext<{ sidebarCollapsed: boolean }>() || { sidebarCollapsed: false };

  const [importHeader, setImportHeader] = useState<any>(null);
  const [items, setItems] = useState<ImportadoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [selectedRowIndexes, setSelectedRowIndexes] = useState<Set<number>>(new Set());
  const [lastClickedRowIndex, setLastClickedRowIndex] = useState<number | null>(null);
  const [existingOrcamento, setExistingOrcamento] = useState<any>(null);

  // Estado para largura ajustável das colunas
  const [colWidths, setColWidths] = useState<Record<string, number>>({
    eap: 70,
    item_cliente: 420,
    und: 50,
    qtd: 60,
    mat_unit: 100,
    mo_unit: 100,
    unit_total: 100,
    mat_total: 100,
    mo_total: 100,
    preco_cliente: 110,
    ref_empresa: 420,
    mat_unit_empresa: 100,
    mo_unit_empresa: 100,
    unit_total_empresa: 100,
    mat_total_empresa: 100,
    mo_total_empresa: 100,
    preco_empresa: 110,
    acoes: 110
  });

  const handleMouseDown = (colId: string, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = colWidths[colId] || 100;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      setColWidths(prev => ({
        ...prev,
        [colId]: Math.max(30, startWidth + deltaX)
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const showMatUnit = !!importHeader?.config_mapeamento?.colMatUnit;
  const showMoUnit = !!importHeader?.config_mapeamento?.colMoUnit;
  const showUnitTotal = !!importHeader?.config_mapeamento?.colUnit;
  const showMatTotal = !!importHeader?.config_mapeamento?.colMatTotal;
  const showMoTotal = !!importHeader?.config_mapeamento?.colMoTotal;

  const getCompanyBreakdown = (item: ImportadoItem) => {
    const isDescendant = (parentEap: string, childEap: string) => {
      if (!parentEap || !childEap || parentEap === childEap) return false;
      return childEap.startsWith(parentEap + '.');
    };

    const isMo = (ins: any) => {
      return ins?.tipo === 'Mão de Obra';
    };

    // Se for insumo isolado na árvore
    if (item.insumo_id && !getDirectChildren(item.item_eap).length) {
      const isMoType = isMo(item.insumo);
      const valUnit = item.valor_unitario_empresa || 0;
      const valTotal = item.total_empresa || 0;
      return {
        matUnit: isMoType ? 0 : valUnit,
        moUnit: isMoType ? valUnit : 0,
        unitTotal: valUnit,
        matTotal: isMoType ? 0 : valTotal,
        moTotal: isMoType ? valTotal : 0
      };
    }

    const descendants = items.filter(it => it.status_linha !== 'inativo' && isDescendant(item.item_eap, it.item_eap));
    const leafInsumos = descendants.filter(it => it.insumo_id && !getDirectChildren(it.item_eap).length);

    let matTotal = 0;
    let moTotal = 0;

    if (leafInsumos.length > 0) {
      leafInsumos.forEach(it => {
        if (isMo(it.insumo)) {
          moTotal += (it.total_empresa || 0);
        } else {
          matTotal += (it.total_empresa || 0);
        }
      });
    } else {
      const isMoType = isMo(item.insumo || item.composicao);
      const valTotal = item.total_empresa || 0;
      if (isMoType) {
        moTotal = valTotal;
      } else {
        matTotal = valTotal;
      }
    }

    const unitTotal = item.valor_unitario_empresa || 0;
    const qty = item.quantidade || 1;
    
    return {
      matUnit: matTotal / qty,
      moUnit: moTotal / qty,
      unitTotal: unitTotal,
      matTotal: matTotal,
      moTotal: moTotal
    };
  };

  // Estado de Drag & Drop EXCLUSIVO do Lado Direito (Referência Empresa)
  const [draggedRightIndex, setDraggedRightIndex] = useState<number | null>(null);

  // Estado de Colapso de Tópicos EAP
  const [collapsedEaps, setCollapsedEaps] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`collapsed_eaps_${importId}`);
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
    return new Set();
  });

  useEffect(() => {
    if (importId) {
      try {
        localStorage.setItem(`collapsed_eaps_${importId}`, JSON.stringify(Array.from(collapsedEaps)));
      } catch (e) {
        console.error(e);
      }
    }
  }, [collapsedEaps, importId]);

  // Refs e Estados para Sincronização do Scroll Horizontal Fixo/Sticky
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const headerTableRef = useRef<HTMLDivElement>(null);
  const stickyScrollRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);

  useEffect(() => {
    const el = tableContainerRef.current;
    if (!el) return;

    const updateWidths = () => {
      setScrollWidth(el.scrollWidth);
      setClientWidth(el.clientWidth);
    };

    updateWidths();

    const observer = new ResizeObserver(updateWidths);
    observer.observe(el);

    const tableEl = el.querySelector('table');
    if (tableEl) {
      observer.observe(tableEl);
    }

    return () => {
      observer.disconnect();
    };
  }, [items]);

  useEffect(() => {
    const tableEl = tableContainerRef.current;
    const scrollEl = stickyScrollRef.current;
    const headerEl = headerTableRef.current;
    if (!tableEl) return;

    let isSyncing = false;

    const handleTableScroll = () => {
      if (isSyncing) return;
      isSyncing = true;
      if (scrollEl) scrollEl.scrollLeft = tableEl.scrollLeft;
      if (headerEl) headerEl.scrollLeft = tableEl.scrollLeft;
      isSyncing = false;
    };

    const handleStickyScroll = () => {
      if (isSyncing || !scrollEl) return;
      isSyncing = true;
      if (tableEl) tableEl.scrollLeft = scrollEl.scrollLeft;
      if (headerEl) headerEl.scrollLeft = scrollEl.scrollLeft;
      isSyncing = false;
    };

    tableEl.addEventListener('scroll', handleTableScroll, { passive: true });
    if (scrollEl) scrollEl.addEventListener('scroll', handleStickyScroll, { passive: true });

    return () => {
      tableEl.removeEventListener('scroll', handleTableScroll);
      if (scrollEl) scrollEl.removeEventListener('scroll', handleStickyScroll);
    };
  }, [scrollWidth, clientWidth]);



  // Drawer de busca de composições/insumos APENAS DO BANCO PRÓPRIO
  const [selectedItemForLink, setSelectedItemForLink] = useState<ImportadoItem | null>(null);
  const [showLinkDrawer, setShowLinkDrawer] = useState(false);
  const [searchTab, setSearchTab] = useState<'composicoes_propria' | 'insumos_proprios'>('composicoes_propria');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Modal de edição de Texto Customizado / Título da Seção
  const [editingCustomItem, setEditingCustomItem] = useState<ImportadoItem | null>(null);
  const [customText, setCustomText] = useState<string>('');

  // Edição inline direta na célula de Referência Empresa
  const [inlineEditingRowId, setInlineEditingRowId] = useState<string | null>(null);
  const [inlineTextValue, setInlineTextValue] = useState<string>('');

  const handleSaveInlineText = async (targetItem: ImportadoItem, newText: string) => {
    setInlineEditingRowId(null);
    const trimmed = newText.trim();

    try {
      const payload: any = {
        descricao: trimmed,
        tipo_vinculo: 'texto',
        composicao_id: null,
        insumo_id: null,
        valor_unitario_empresa: 0,
        total_empresa: 0
      };

      const { error } = await supabase
        .schema('engenharia')
        .from('orcamento_importado_itens')
        .update(payload)
        .eq('id', targetItem.id);

      if (error) throw error;

      setItems(prev => prev.map(item => {
        if (item.id === targetItem.id) {
          return {
            ...item,
            ...payload,
            composicao: undefined,
            insumo: undefined
          };
        }
        return item;
      }));

      updateImportStatus();
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (importId) {
      loadImportedBudget();
    }
  }, [importId]);

  const loadImportedBudget = async () => {
    setLoading(true);
    try {
      // 1. Carrega o cabeçalho do orçamento importado
      const { data: headerData, error: headerError } = await supabase
        .schema('engenharia')
        .from('orcamentos_importados')
        .select('*')
        .eq('id', importId)
        .single();

      if (headerError) throw headerError;
      setImportHeader(headerData);

      // 2. Carrega as linhas importadas
      const { data: rowsData, error: rowsError } = await supabase
        .schema('engenharia')
        .from('orcamento_importado_itens')
        .select('*')
        .eq('orcamento_importado_id', importId)
        .order('created_at', { ascending: true });

      if (rowsError) throw rowsError;

      // Busca dados de composições e insumos vinculados
      const itemsList = rowsData || [];
      const compIds = itemsList.map((i: any) => i.composicao_id).filter(Boolean);
      const insumoIds = itemsList.map((i: any) => i.insumo_id).filter(Boolean);

      const compsMap: Record<string, any> = {};
      const insumosMap: Record<string, any> = {};

      if (compIds.length > 0) {
        const { data: comps } = await supabase
          .schema('engenharia')
          .from('composicoes')
          .select('*')
          .in('id', compIds);
        if (comps) comps.forEach((c: any) => { compsMap[c.id] = c; });
      }

      if (insumoIds.length > 0) {
        const { data: insumos } = await supabase
          .schema('engenharia')
          .from('insumos')
          .select('*')
          .in('id', insumoIds);
        if (insumos) insumos.forEach((i: any) => { insumosMap[i.id] = i; });
      }

      const finalItems = itemsList.map((item: any) => ({
        ...item,
        status_linha: item.status_linha || 'ativo',
        composicao: item.composicao_id ? compsMap[item.composicao_id] : undefined,
        insumo: item.insumo_id ? insumosMap[item.insumo_id] : undefined
      }));

      // Ordenação EAP Natural
      const sortedItems = finalItems.sort((a: any, b: any) => sortEap(a.item_eap, b.item_eap));

      // 3. Busca o orçamento gerado e TODAS as suas revisões a partir desse importId
      const { data: generatedOrc, error: genError } = await supabase
        .schema('engenharia')
        .from('orcamentos')
        .select('id, codigo, nome, status, revisao, created_at')
        .eq('orcamento_importado_id', importId);

      let allRevisions: any[] = [];
      if (!genError && generatedOrc && generatedOrc.length > 0) {
        allRevisions = [...generatedOrc];

        // Busca também revisões que compartilham o mesmo código base (ex: 2907.001)
        const baseCodes = new Set<string>();
        generatedOrc.forEach((o: any) => {
          if (o.codigo) {
            const parts = String(o.codigo).split('.');
            if (parts.length >= 2) {
              baseCodes.add(`${parts[0]}.${parts[1]}`);
            }
          }
        });

        for (const baseCode of Array.from(baseCodes)) {
          const { data: revOrcs } = await supabase
            .schema('engenharia')
            .from('orcamentos')
            .select('id, codigo, nome, status, revisao, created_at')
            .ilike('codigo', `${baseCode}%`);
          
          if (revOrcs && revOrcs.length > 0) {
            revOrcs.forEach((r: any) => {
              if (!allRevisions.some(existing => existing.id === r.id)) {
                allRevisions.push(r);
              }
            });
          }
        }
      }

      if (allRevisions.length > 0) {
        // Ordena por maior número de revisão (ex: REV 02 > REV 01 > REV 00)
        const sortedOrcs = [...allRevisions].sort((a: any, b: any) => {
          const revA = parseInt(a.revisao || '0', 10);
          const revB = parseInt(b.revisao || '0', 10);
          if (revA !== revB) return revB - revA;
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });

        const latestOrc = sortedOrcs[0];
        setExistingOrcamento(latestOrc);

        // 4. Puxa os itens calculados da ÚLTIMA REVISÃO do orçamento para atualizar a Referência Empresa
        const { data: orcItemsData } = await supabase
          .schema('engenharia')
          .from('orcamento_itens')
          .select('item_eap, total, valor_unitario, valor_unitario_com_bdi, valor_unitario_mat, valor_unitario_mo, quantidade')
          .eq('orcamento_id', latestOrc.id);

        if (orcItemsData && orcItemsData.length > 0) {
          const orcMap: Record<string, any> = {};
          orcItemsData.forEach((oi: any) => {
            if (oi.item_eap) {
              orcMap[oi.item_eap.trim()] = oi;
            }
          });

          // Atualiza os valores da Referência Empresa nos itens do Studio De-Para com a última revisão
          const updatedFinalItems = sortedItems.map((item: any) => {
            const matchedOrcItem = orcMap[(item.item_eap || '').trim()];
            if (matchedOrcItem) {
              const uPrice = parseFloat(matchedOrcItem.valor_unitario_com_bdi || matchedOrcItem.valor_unitario || 0);
              const tot = parseFloat(matchedOrcItem.total || 0);
              return {
                ...item,
                valor_unitario_empresa: uPrice > 0 ? uPrice : item.valor_unitario_empresa,
                total_empresa: tot > 0 ? tot : item.total_empresa
              };
            }
            return item;
          });

          setItems(updatedFinalItems);
        } else {
          setItems(sortedItems);
        }
      } else {
        setItems(sortedItems);
      }
    } catch (err) {
      console.error('Erro ao carregar orçamento importado:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- CLASSIFICAÇÃO MATEMÁTICA EAP ---
  const getDirectChildren = (eap: string) => {
    if (!eap) return [];
    const prefix = eap.trim() + '.';
    return items.filter(i => {
      const itemEap = (i.item_eap || '').trim();
      if (!itemEap.startsWith(prefix)) return false;
      const remainder = itemEap.substring(prefix.length);
      return !remainder.includes('.');
    });
  };

  const hasGrandchildren = (eap: string) => {
    const directChildren = getDirectChildren(eap);
    return directChildren.some(child => {
      const childPrefix = child.item_eap.trim() + '.';
      return items.some(i => (i.item_eap || '').trim().startsWith(childPrefix));
    });
  };

  const getItemEapRole = (item: ImportadoItem): 'secao_texto' | 'item_operacional' => {
    const directChildren = getDirectChildren(item.item_eap);
    if (directChildren.length > 0 && hasGrandchildren(item.item_eap)) {
      return 'secao_texto';
    }
    return 'item_operacional';
  };

  // Funções de Colapso/Expansão EAP
  const toggleCollapse = (eap: string) => {
    setCollapsedEaps(prev => {
      const copy = new Set(prev);
      if (copy.has(eap)) copy.delete(eap);
      else copy.add(eap);
      return copy;
    });
  };

  const isRowHidden = (eap: string) => {
    if (!eap) return false;
    const parts = eap.split('.');
    for (let i = 1; i < parts.length; i++) {
      const ancestor = parts.slice(0, i).join('.');
      if (collapsedEaps.has(ancestor)) return true;
    }
    return false;
  };

  const collapseAll = () => {
    const parentEaps = items.filter(i => getDirectChildren(i.item_eap).length > 0).map(i => i.item_eap);
    setCollapsedEaps(new Set(parentEaps));
  };

  const expandAll = () => {
    setCollapsedEaps(new Set());
  };

  const expandToLevel = (targetLevel: number) => {
    const newCollapsed = new Set<string>();
    items.forEach(item => {
      const level = (item.item_eap || '').split('.').filter(Boolean).length;
      const hasChildren = getDirectChildren(item.item_eap).length > 0;
      if (hasChildren) {
        if (level < targetLevel) {
          // Keep expanded (do not add to collapsed)
        } else {
          newCollapsed.add(item.item_eap);
        }
      }
    });
    setCollapsedEaps(newCollapsed);
  };

  // --- ARRASTAR E SOLTAR EXCLUSIVO DO LADO DIREITO (REFERÊNCIA EMPRESA) ---
  const handleRightDragStart = (e: React.DragEvent, index: number) => {
    setDraggedRightIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleRightDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRightDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedRightIndex === null || draggedRightIndex === targetIndex) return;

    setItems(prev => {
      const copy = [...prev];
      const sourceItem = copy[draggedRightIndex];
      const targetItem = copy[targetIndex];

      // Troca APENAS os dados da Referência Empresa (lado direito)
      const sourceRightFields = {
        composicao_id: sourceItem.composicao_id,
        insumo_id: sourceItem.insumo_id,
        tipo_vinculo: sourceItem.tipo_vinculo,
        valor_unitario_empresa: sourceItem.valor_unitario_empresa,
        total_empresa: sourceItem.total_empresa,
        status_linha: sourceItem.status_linha,
        composicao: sourceItem.composicao,
        insumo: sourceItem.insumo
      };

      const targetRightFields = {
        composicao_id: targetItem.composicao_id,
        insumo_id: targetItem.insumo_id,
        tipo_vinculo: targetItem.tipo_vinculo,
        valor_unitario_empresa: targetItem.valor_unitario_empresa,
        total_empresa: targetItem.total_empresa,
        status_linha: targetItem.status_linha,
        composicao: targetItem.composicao,
        insumo: targetItem.insumo
      };

      copy[draggedRightIndex] = { ...sourceItem, ...targetRightFields };
      copy[targetIndex] = { ...targetItem, ...sourceRightFields };

      return copy;
    });

    setDraggedRightIndex(null);
  };

  // --- LÓGICA DE SELEÇÃO POR CLIQUE / TECLADO (CTRL, SHIFT, SETAS) ---
  const handleRowClick = (index: number, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedRowIndexes(prev => {
        const next = new Set(prev);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        return next;
      });
      setSelectedRowIndex(index);
      setLastClickedRowIndex(index);
    } else if (e.shiftKey && lastClickedRowIndex !== null) {
      const start = Math.min(lastClickedRowIndex, index);
      const end = Math.max(lastClickedRowIndex, index);
      const range = new Set<number>();
      for (let i = start; i <= end; i++) range.add(i);
      setSelectedRowIndexes(range);
      setSelectedRowIndex(index);
    } else {
      setSelectedRowIndexes(new Set([index]));
      setSelectedRowIndex(index);
      setLastClickedRowIndex(index);
    }
  };

  // --- RECUOS DE EAP NA BARRA SUPERIOR E VIA TECLADO (CTRL+SHIFT+SETA) ---
  const handleIndentSelectedRow = () => {
    const targetIndexes = Array.from(selectedRowIndexes);
    if (targetIndexes.length === 0 && selectedRowIndex !== null) {
      targetIndexes.push(selectedRowIndex);
    }
    if (targetIndexes.length === 0) return;

    targetIndexes.sort((a, b) => a - b);

    setItems(prev => {
      const copy = [...prev];
      targetIndexes.forEach(idx => {
        if (idx <= 0) return;
        const current = { ...copy[idx] };
        const prevItem = copy[idx - 1];
        if (!prevItem) return;

        const childrenOfPrev = copy.filter(i => (i.item_eap || '').startsWith(prevItem.item_eap + '.'));
        current.item_eap = `${prevItem.item_eap}.${childrenOfPrev.length + 1}`;
        copy[idx] = current;
      });
      return copy;
    });
  };

  const handleOutdentSelectedRow = () => {
    const targetIndexes = Array.from(selectedRowIndexes);
    if (targetIndexes.length === 0 && selectedRowIndex !== null) {
      targetIndexes.push(selectedRowIndex);
    }
    if (targetIndexes.length === 0) return;

    targetIndexes.sort((a, b) => a - b);

    setItems(prev => {
      const copy = [...prev];
      targetIndexes.forEach(idx => {
        const current = { ...copy[idx] };
        const parts = (current.item_eap || '').split('.');
        if (parts.length <= 1) return;

        parts.pop();
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) {
          parts[parts.length - 1] = String(lastNum + 1);
        }
        current.item_eap = parts.join('.');
        copy[idx] = current;
      });
      return copy;
    });
  };

  // --- ATALHOS DE TECLADO PARA NAVEGAÇÃO E RECUO DE LINHAS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
        return;
      }

      if (items.length === 0) return;

      const activeIdx = selectedRowIndex ?? 0;

      // 1. Ctrl + Shift + Setas (Recuar / Promover Nível EAP)
      if (e.ctrlKey && e.shiftKey) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          handleIndentSelectedRow();
          return;
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          handleOutdentSelectedRow();
          return;
        }
      }

      // 2. Ctrl + A (Selecionar Todos)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const allIndices = new Set(items.map((_, i) => i));
        setSelectedRowIndexes(allIndices);
        return;
      }

      // 3. Escape (Desmarcar Seleções)
      if (e.key === 'Escape') {
        setSelectedRowIndexes(new Set());
        setSelectedRowIndex(null);
        return;
      }

      // 4. Seta Para Baixo
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIdx = Math.min(items.length - 1, activeIdx + 1);
        if (e.shiftKey) {
          const start = lastClickedRowIndex !== null ? lastClickedRowIndex : activeIdx;
          const rangeStart = Math.min(start, nextIdx);
          const rangeEnd = Math.max(start, nextIdx);
          const range = new Set<number>();
          for (let i = rangeStart; i <= rangeEnd; i++) range.add(i);
          setSelectedRowIndexes(range);
        } else {
          setSelectedRowIndexes(new Set([nextIdx]));
          setLastClickedRowIndex(nextIdx);
        }
        setSelectedRowIndex(nextIdx);
        return;
      }

      // 5. Seta Para Cima
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIdx = Math.max(0, activeIdx - 1);
        if (e.shiftKey) {
          const start = lastClickedRowIndex !== null ? lastClickedRowIndex : activeIdx;
          const rangeStart = Math.min(start, prevIdx);
          const rangeEnd = Math.max(start, prevIdx);
          const range = new Set<number>();
          for (let i = rangeStart; i <= rangeEnd; i++) range.add(i);
          setSelectedRowIndexes(range);
        } else {
          setSelectedRowIndexes(new Set([prevIdx]));
          setLastClickedRowIndex(prevIdx);
        }
        setSelectedRowIndex(prevIdx);
        return;
      }

      // 6. Enter: Editar a linha ou vincular
      if (e.key === 'Enter' && selectedRowIndex !== null) {
        e.preventDefault();
        const item = items[selectedRowIndex];
        if (item) {
          if (item.tipo_vinculo === 'texto' || item.status_linha === 'inserido_empresa') {
            setEditingCustomItem(item);
            setCustomText(item.descricao || '');
          } else {
            setSelectedItemForLink(item);
            setShowLinkDrawer(true);
          }
        }
        return;
      }

      // 7. Tecla Insert: Inserir Linha acima da selecionada ou no final
      if (e.key === 'Insert') {
        e.preventDefault();
        handleInsertRow();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRowIndex, selectedRowIndexes, lastClickedRowIndex, items]);

  // --- INSERIR NOVA LINHA (ACIMA DA SELECIONADA OU NO FINAL) ---
  const handleInsertRow = async () => {
    let insertIndex = items.length;
    let targetEap = `${items.length + 1}`;

    if (selectedRowIndex !== null && selectedRowIndex >= 0 && selectedRowIndex < items.length) {
      insertIndex = selectedRowIndex;
      targetEap = items[selectedRowIndex].item_eap || '1';
    } else if (items.length > 0) {
      const lastEap = items[items.length - 1].item_eap || '1';
      const parts = lastEap.split('.');
      const lastNum = parseInt(parts[0], 10);
      targetEap = !isNaN(lastNum) ? String(lastNum + 1) : `${items.length + 1}`;
    }

    try {
      const payload: Omit<ImportadoItem, 'id'> = {
        orcamento_importado_id: importId!,
        item_eap: targetEap,
        descricao: 'Nova Linha Inserida',
        unidade: 'un',
        quantidade: 1,
        valor_unitario_orig: 0,
        total_orig: 0,
        valor_unitario_empresa: 0,
        total_empresa: 0,
        status_linha: 'inserido_empresa'
      };

      const { data, error } = await supabase
        .schema('engenharia')
        .from('orcamento_importado_itens')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      const newItem: ImportadoItem = {
        ...payload,
        id: data.id
      };

      setItems(prev => {
        const copy = [...prev];
        copy.splice(insertIndex, 0, newItem);
        const rebuilt = rebuildStudioEaps(copy);

        rebuilt.forEach(it => {
          if (it.id && !it.id.startsWith('temp-') && !it.id.startsWith('inserted-')) {
            supabase.schema('engenharia').from('orcamento_importado_itens').update({ item_eap: it.item_eap }).eq('id', it.id).then(() => {});
          }
        });

        return rebuilt;
      });

      setSelectedRowIndex(insertIndex);
      setSelectedRowIndexes(new Set([insertIndex]));
    } catch (err: any) {
      console.error(err);
      alert('Erro ao inserir linha: ' + err.message);
    }
  };

  // --- DELETAR LINHA INSERIDA ---
  const handleDeleteRow = async (targetItem: ImportadoItem) => {
    if (!window.confirm(`Deseja excluir a linha inserida?`)) return;
    try {
      // Deleta a linha em si
      const { error } = await supabase
        .schema('engenharia')
        .from('orcamento_importado_itens')
        .delete()
        .eq('id', targetItem.id);

      if (error) throw error;

      // Deleta também os sub-itens desdobrados do banco
      const subEapPattern = `${targetItem.item_eap}.`;
      await supabase
        .schema('engenharia')
        .from('orcamento_importado_itens')
        .delete()
        .eq('orcamento_importado_id', targetItem.orcamento_importado_id)
        .like('item_eap', `${subEapPattern}%`);

      setItems(prev => prev.filter(i => i.id !== targetItem.id && !i.item_eap.startsWith(subEapPattern)));
    } catch (err: any) {
      console.error(err);
      alert('Erro ao excluir linha: ' + err.message);
    }
  };

  // Buscar composições/insumos para vincular
  useEffect(() => {
    if (showLinkDrawer) {
      handleSearch();
    }
  }, [searchTab, searchTerm, showLinkDrawer]);

  const handleSearch = async () => {
    setLoadingSearch(true);
    try {
      const term = searchTerm.trim().toLowerCase();
      const isComp = searchTab === 'composicoes_propria';

      let data: any[] = [];
      let error: any = null;

      if (isComp) {
        // Busca Composições Próprias (fonte = 'Própria' ou código COMP.)
        let query = supabase
          .schema('engenharia')
          .from('composicoes')
          .select('*')
          .or('fonte.eq.Própria,codigo.ilike.COMP.%');

        if (term) {
          const words = term.split(/\s+/).filter(Boolean);
          words.forEach(word => {
            query = query.or(`codigo.ilike.%${word}%,descricao.ilike.%${word}%`);
          });
        }

        const res = await query.order('codigo', { ascending: true }).limit(100);
        data = res.data || [];
        error = res.error;
      } else {
        // Busca Insumos Próprios (fonte_preco = 'Cotação' ou 'Histórico')
        let query = supabase
          .schema('engenharia')
          .from('insumos')
          .select('*')
          .or('fonte_preco.eq.Cotação,fonte_preco.eq.Histórico,codigo.ilike.alg.%,codigo.ilike.COMP.%,codigo.ilike.mo.%,codigo.ilike.mat.%');

        if (term) {
          const words = term.split(/\s+/).filter(Boolean);
          words.forEach(word => {
            query = query.or(`codigo.ilike.%${word}%,descricao.ilike.%${word}%`);
          });
        }

        const res = await query.order('codigo', { ascending: true }).limit(100);
        data = res.data || [];
        error = res.error;
      }

      if (error) {
        console.error('Erro na busca:', error);
      }

      let results = data || [];

      if (term && results.length > 0) {
        const words = term.split(/\s+/).filter(Boolean);
        results = results.filter((item: any) => {
          const fullText = `${item.codigo || ''} ${item.descricao || ''}`.toLowerCase();
          return words.every(w => fullText.includes(w));
        });
      }
      setSearchResults(results);
    } catch (err) {
      console.error('Erro na busca:', err);
    } finally {
      setLoadingSearch(false);
    }
  };

  // Realizar o vínculo (De-Para) e desdobrar insumos/subcomposições constituintes do Banco Próprio
  const handleLinkItem = async (selected: any) => {
    if (!selectedItemForLink) return;

    const isComp = searchTab === 'composicoes_propria';
    const unitPrice = parseFloat(selected.valor_unitario || selected.preco_unitario || selected.custo_sem_desoneracao || selected.valor || 0);
    const totalPrice = selectedItemForLink.quantidade * unitPrice;

    try {
      const oldStatus = selectedItemForLink.status_linha;
      const finalStatus = (oldStatus === 'inserido_empresa' || oldStatus === 'inserido_empresa_e_cliente') ? oldStatus : 'ativo';

      const payload: any = {
        composicao_id: isComp ? selected.id : null,
        insumo_id: !isComp ? selected.id : null,
        tipo_vinculo: isComp ? 'composicao' : 'insumo',
        valor_unitario_empresa: unitPrice,
        total_empresa: totalPrice,
        status_linha: finalStatus
      };

      // 1. Apaga sub-itens desdobrados antigos desta EAP no banco de dados para evitar duplicações ao revincular
      const subEapPattern = `${selectedItemForLink.item_eap}.`;
      await supabase
        .schema('engenharia')
        .from('orcamento_importado_itens')
        .delete()
        .eq('orcamento_importado_id', importId)
        .eq('status_linha', 'desdobrado')
        .like('item_eap', `${subEapPattern}%`);

      await supabase
        .schema('engenharia')
        .from('orcamento_importado_itens')
        .update(payload)
        .eq('id', selectedItemForLink.id);

      // Se for composição vinculada, desdobra seus insumos e subcomposições do Banco Próprio
      let childRows: ImportadoItem[] = [];
      if (isComp) {
        let { data: compItens, error: compItensErr } = await supabase
          .schema('engenharia')
          .from('composicao_itens')
          .select(`
            *,
            insumo:insumos (*),
            sub_composicao:composicoes!sub_composicao_id (*)
          `)
          .eq('composicao_id', selected.id);

        if (compItensErr) {
          console.error('Erro ao buscar itens da composição:', compItensErr);
        }

        if (compItens && compItens.length > 0) {
          // Busca sub-itens inseridos existentes sob esta EAP para evitar colisões de numeração EAP
          const existingChildren = items.filter(i => (i.item_eap || '').startsWith(`${selectedItemForLink.item_eap}.`) && i.status_linha !== 'desdobrado');
          const existingPartNumbers = existingChildren.map(c => {
            const parts = c.item_eap.split('.');
            return parseInt(parts[parts.length - 1], 10);
          }).filter(n => !isNaN(n));
          const startSeq = existingPartNumbers.length > 0 ? Math.max(...existingPartNumbers) + 1 : 1;

          childRows = compItens.map((ci: any, index: number) => {
            const refObj = ci.insumo || ci.sub_composicao || {};
            const itemCode = refObj.codigo || ci.codigo || '';
            const itemDesc = refObj.descricao || ci.descricao || 'Insumo de Composição';
            const itemUnit = refObj.unidade || ci.unidade || 'un';
            const coef = parseFloat(ci.coeficiente || ci.quantidade || 1);
            const q = coef * (selectedItemForLink.quantidade || 1);
            
            // Resolve price correctly depending on whether it's an insumo or sub_composicao
            let uPrice = 0;
            if (ci.insumo) {
              uPrice = parseFloat(ci.insumo.valor ?? ci.insumo.valor_nao_desonerado ?? ci.insumo.valor_unitario ?? 0);
            } else if (ci.sub_composicao) {
              uPrice = parseFloat(ci.sub_composicao.custo_sem_desoneracao ?? ci.sub_composicao.custo_desonerado ?? ci.sub_composicao.valor_unitario ?? 0);
            }

            return {
              id: `inserted-comp-${Date.now()}-${index}`,
              orcamento_importado_id: importId!,
              item_eap: `${selectedItemForLink.item_eap}.${startSeq + index}`,
              descricao: '', // O lado cliente fica limpo! Sem texto de sub-item
              unidade: itemUnit,
              quantidade: q,
              valor_unitario_orig: 0,
              total_orig: 0,
              composicao_id: ci.sub_composicao_id || undefined,
              insumo_id: ci.insumo_id || undefined,
              tipo_vinculo: ci.insumo_id ? 'insumo' : 'composicao',
              valor_unitario_empresa: uPrice,
              total_empresa: q * uPrice,
              status_linha: 'desdobrado',
              composicao: ci.sub_composicao || (ci.sub_composicao_id ? { id: ci.sub_composicao_id, codigo: itemCode, descricao: itemDesc, unidade: itemUnit, custo_sem_desoneracao: uPrice } : undefined),
              insumo: ci.insumo || (ci.insumo_id || !ci.sub_composicao_id ? { id: ci.insumo_id, codigo: itemCode, descricao: itemDesc, unidade: itemUnit, valor: uPrice } : undefined)
            };
          });
        }
      }

      if (childRows.length > 0) {
        const dbPayloads = childRows.map(row => ({
          orcamento_importado_id: row.orcamento_importado_id,
          item_eap: row.item_eap,
          descricao: row.descricao || '',
          unidade: row.unidade || 'un',
          quantidade: row.quantidade || 0,
          valor_unitario_orig: 0,
          total_orig: 0,
          composicao_id: row.composicao_id || null,
          insumo_id: row.insumo_id || null,
          tipo_vinculo: row.tipo_vinculo || null,
          valor_unitario_empresa: row.valor_unitario_empresa || 0,
          total_empresa: row.total_empresa || 0,
          status_linha: 'desdobrado'
        }));

        const { data: insertedData, error: insertError } = await supabase
          .schema('engenharia')
          .from('orcamento_importado_itens')
          .insert(dbPayloads)
          .select();

        if (insertError) {
          console.error('Erro ao inserir sub-itens no banco:', insertError);
        } else if (insertedData) {
          childRows = childRows.map((row, idx) => ({
            ...row,
            id: insertedData[idx]?.id || row.id
          }));
        }
      }

      setItems(prev => {
        // Primeiro remove os sub-itens desdobrados antigos para evitar duplicidade
        const cleaned = prev.filter(i => !(i.item_eap.startsWith(subEapPattern) && i.status_linha === 'desdobrado'));
        const copy = [...cleaned];
        const parentIdx = copy.findIndex(i => i.id === selectedItemForLink.id);
        if (parentIdx === -1) return prev;

        const oldStatus = copy[parentIdx].status_linha;
        const finalStatus = (oldStatus === 'inserido_empresa' || oldStatus === 'inserido_empresa_e_cliente') ? oldStatus : 'ativo';

        copy[parentIdx] = {
          ...copy[parentIdx],
          ...payload,
          status_linha: finalStatus,
          composicao: isComp ? selected : undefined,
          insumo: !isComp ? selected : undefined
        };

        if (childRows.length > 0) {
          copy.splice(parentIdx + 1, 0, ...childRows);
        }

        return rebuildStudioEaps(copy);
      });

      updateImportStatus();
      setShowLinkDrawer(false);
      setSelectedItemForLink(null);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao vincular item: ' + err.message);
    }
  };

  // Desvincular Composição ou Insumo (Desfazer o De-Para) e remover desdobramentos
  const handleUnlinkItem = async (targetItem: ImportadoItem) => {
    if (!window.confirm("Deseja desvincular este item? Todos os insumos desdobrados serão removidos.")) return;

    const subEapPattern = `${targetItem.item_eap}.`;

    try {
      const payload = {
        composicao_id: null,
        insumo_id: null,
        tipo_vinculo: null,
        valor_unitario_empresa: 0,
        total_empresa: 0
      };

      await supabase
        .schema('engenharia')
        .from('orcamento_importado_itens')
        .update(payload)
        .eq('id', targetItem.id);

      // Deleta sub-itens desdobrados do banco
      await supabase
        .schema('engenharia')
        .from('orcamento_importado_itens')
        .delete()
        .eq('orcamento_importado_id', importId)
        .eq('status_linha', 'desdobrado')
        .like('item_eap', `${subEapPattern}%`);

      setItems(prev => {
        // Remove sub-itens desdobrados e restaura dados do pai na memória local
        const cleaned = prev.filter(i => !(i.item_eap.startsWith(subEapPattern) && i.status_linha === 'desdobrado'));
        const copy = [...cleaned];
        const parentIdx = copy.findIndex(i => i.id === targetItem.id);
        if (parentIdx !== -1) {
          copy[parentIdx] = {
            ...copy[parentIdx],
            composicao_id: undefined,
            insumo_id: undefined,
            tipo_vinculo: undefined,
            valor_unitario_empresa: 0,
            total_empresa: 0,
            composicao: undefined,
            insumo: undefined
          };
        }
        return copy;
      });

      updateImportStatus();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao desvincular item: ' + err.message);
    }
  };

  // Alternar Inativação (Riscar Item do Cliente `<s>`)
  const handleToggleInativar = async (targetItem: ImportadoItem) => {
    let resolvedStatus: 'ativo' | 'inativo' | 'inserido_empresa' | 'inserido_empresa_e_cliente' | 'desdobrado';

    if (targetItem.status_linha === 'inativo') {
      // Reactivating: calculate original status
      if (isDesdobradoEap(targetItem.item_eap, items)) {
        resolvedStatus = 'desdobrado';
      } else if (!targetItem.descricao) {
        resolvedStatus = 'inserido_empresa';
      } else {
        resolvedStatus = 'ativo';
      }
    } else {
      // Inactivating
      resolvedStatus = 'inativo';
    }

    try {
      const payload = {
        status_linha: resolvedStatus,
        total_empresa: resolvedStatus === 'inativo' ? 0 : targetItem.total_empresa
      };

      const { error } = await supabase
        .schema('engenharia')
        .from('orcamento_importado_itens')
        .update(payload)
        .eq('id', targetItem.id);

      if (error) throw error;

      setItems(prev => prev.map(i => {
        if (i.id === targetItem.id) {
          return { ...i, ...payload };
        }
        return i;
      }));

      updateImportStatus();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao inativar/reativar item: ' + err.message);
    }
  };

  // Alternar se item inserido pela empresa também vai para a planilha do cliente
  const handleToggleInserirCliente = async (targetItem: ImportadoItem) => {
    const parts = targetItem.item_eap.split('.');
    let originalStatus: 'desdobrado' | 'inserido_empresa' = 'inserido_empresa';
    if (parts.length > 1) {
      const parentEap = parts.slice(0, -1).join('.');
      const parent = items.find(i => i.item_eap === parentEap);
      if (parent && parent.composicao_id) {
        originalStatus = 'desdobrado';
      }
    }

    const newStatus = targetItem.status_linha === 'inserido_empresa_e_cliente'
      ? originalStatus
      : 'inserido_empresa_e_cliente';

    const refObj = targetItem.composicao || targetItem.insumo;
    const desc = targetItem.descricao || refObj?.descricao || 'Item Inserido';
    const unit = targetItem.unidade || refObj?.unidade || 'un';

    try {
      const payload: Partial<ImportadoItem> = {
        status_linha: newStatus,
        descricao: desc,
        unidade: unit,
        valor_unitario_orig: newStatus === 'inserido_empresa_e_cliente' ? targetItem.valor_unitario_empresa : 0,
        total_orig: newStatus === 'inserido_empresa_e_cliente' ? targetItem.total_empresa : 0
      };

      const { error } = await supabase
        .schema('engenharia')
        .from('orcamento_importado_itens')
        .update(payload)
        .eq('id', targetItem.id);

      if (error) throw error;

      setItems(prev => prev.map(i => {
        if (i.id === targetItem.id) {
          return { ...i, ...payload };
        }
        return i;
      }));

      updateImportStatus();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao alternar inserção no cliente: ' + err.message);
    }
  };

  // Definir Texto Customizado / Título da Seção
  const handleSaveCustomText = async () => {
    if (!editingCustomItem) return;

    try {
      const payload: any = {
        descricao: customText.trim() || editingCustomItem.descricao,
        tipo_vinculo: 'texto',
        composicao_id: null,
        insumo_id: null,
        valor_unitario_empresa: 0,
        total_empresa: 0
      };

      const { error } = await supabase
        .schema('engenharia')
        .from('orcamento_importado_itens')
        .update(payload)
        .eq('id', editingCustomItem.id);

      if (error) throw error;

      setItems(prev => prev.map(item => {
        if (item.id === editingCustomItem.id) {
          return {
            ...item,
            ...payload,
            composicao: undefined,
            insumo: undefined
          };
        }
        return item;
      }));

      updateImportStatus();
      setEditingCustomItem(null);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar texto customizado: ' + err.message);
    }
  };

  const isItemLinked = (item: ImportadoItem) => {
    const role = getItemEapRole(item);
    if (role === 'secao_texto') return true;
    return !!(item.composicao_id || item.insumo_id || item.tipo_vinculo === 'texto' || item.status_linha === 'inativo' || item.status_linha === 'inserido_empresa' || item.status_linha === 'inserido_empresa_e_cliente' || item.status_linha === 'desdobrado');
  };

  const updateImportStatus = async () => {
    const total = items.length;
    const linkedCount = items.filter(isItemLinked).length;

    let newStatus = 'Aguardando De-Para';
    if (linkedCount === total && total > 0) newStatus = 'Concluído';
    else if (linkedCount > 0) newStatus = 'Em Vinculação';

    await supabase
      .schema('engenharia')
      .from('orcamentos_importados')
      .update({ status: newStatus })
      .eq('id', importId);

    setImportHeader((prev: any) => ({ ...prev, status: newStatus }));
  };

  // Exportar Planilha De-Para Comparativa para Excel
  const handleExportExcel = () => {
    if (!items || items.length === 0) return;

    const exportRows = items.map(i => {
      const isHiddenOnClient = i.status_linha === 'inserido_empresa' || i.status_linha === 'desdobrado';
      return {
        EAP: i.item_eap,
        'Descrição Cliente': i.status_linha === 'inativo' ? `[INATIVADO / RISCADO] ${i.descricao}` : isHiddenOnClient ? '' : i.descricao,
        Unidade: isHiddenOnClient ? '' : i.unidade,
        Quantidade: isHiddenOnClient ? 0 : i.quantidade,
        'Preço Cliente (R$)': (i.status_linha === 'inativo' || isHiddenOnClient) ? 0 : i.total_orig,
        'Referência Empresa': i.composicao?.descricao || i.insumo?.descricao || (i.status_linha === 'inserido_empresa' ? '[ITEM INSERIDO APENAS NA EMPRESA]' : i.tipo_vinculo === 'texto' ? '[TÍTULO CUSTOMIZADO]' : '-'),
        'Preço Empresa (R$)': i.status_linha === 'inativo' ? 0 : i.total_empresa,
        Status: i.status_linha === 'inativo' ? 'INATIVADO' : i.status_linha === 'inserido_empresa' ? 'INSERIDO APENAS NA EMPRESA' : i.status_linha === 'inserido_empresa_e_cliente' ? 'INSERIDO NA PLANILHA DO CLIENTE' : 'VINCULADO'
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'De-Para Orçamento');
    XLSX.writeFile(wb, `${importHeader?.projeto || 'Orcamento'}_DePara_Comparativo.xlsx`);
  };

  // Gerar Orçamento Nativo da Empresa a partir do De-Para
  const handleGerarOrcamentoEmpresa = async () => {
    const unlinkedCount = items.filter(i => !isItemLinked(i)).length;
    if (unlinkedCount > 0) {
      alert(`⚠️ Por favor, vincule todos os itens (${unlinkedCount} itens pendentes) antes de gerar o orçamento empresa.`);
      return;
    }

    setSaving(true);
    try {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      const ddmm = `${dd}${mm}`;

      const { data: existing } = await supabase
        .schema('engenharia')
        .from('orcamentos')
        .select('codigo')
        .like('codigo', `${ddmm}.%`);

      let nextSeq = 1;
      if (existing && existing.length > 0) {
        const seqs = existing.map((o: any) => {
          const parts = o.codigo.split('.');
          return parts.length >= 2 ? parseInt(parts[1], 10) || 0 : 0;
        });
        nextSeq = Math.max(...seqs) + 1;
      }
      const codigo = `${ddmm}.${String(nextSeq).padStart(3, '0')}.0-${year}`;

      const { data: newOrc, error: newOrcError } = await supabase
        .schema('engenharia')
        .from('orcamentos')
        .insert({
          codigo,
          nome: importHeader.projeto || importHeader.nome_arquivo,
          descricao: `Gerado a partir da importação: ${importHeader.nome_arquivo}`,
          cliente: importHeader.cliente,
          projeto: importHeader.projeto,
          status: 'Em Elaboração',
          orcamento_importado_id: importId
        })
        .select('id')
        .single();

      if (newOrcError) throw newOrcError;

      // Marca a planilha importada como Concluída
      await supabase
        .schema('engenharia')
        .from('orcamentos_importados')
        .update({ status: 'Concluído' })
        .eq('id', importId);

      setImportHeader((prev: any) => ({ ...prev, status: 'Concluído' }));

      // Filtra apenas itens válidos (ignora linhas inativas E ignora desdobrados internos de composição do preview)
      const validItems = items.filter(i => i.status_linha !== 'inativo' && i.status_linha !== 'desdobrado');

      const itensPayload = validItems.map((item: any) => {
        const role = getItemEapRole(item);
        const linkedRef = item.composicao || item.insumo;
        const isHeader = role === 'secao_texto' || item.tipo_vinculo === 'texto' || item.quantidade === 0;

        if (isHeader) {
          return {
            orcamento_id: newOrc.id,
            item_eap: item.item_eap,
            codigo: null,
            banco_fonte: null,
            descricao: (item.descricao && item.descricao.trim() !== '') ? item.descricao : 'SEÇÃO / TÍTULO',
            unidade: '',
            quantidade: 0,
            valor_unitario_mat: 0,
            valor_unitario_mo: 0,
            valor_unitario: 0,
            valor_unitario_com_bdi: 0,
            total_mat: 0,
            total_mo: 0,
            total: 0,
            composicao_id: null
          };
        }

        const matVal = item.tipo_vinculo === 'insumo' ? item.valor_unitario_empresa : item.valor_unitario_empresa * 0.7;
        const moVal = item.tipo_vinculo === 'insumo' ? 0 : item.valor_unitario_empresa * 0.3;
        const itemDesc = (item.descricao && item.descricao.trim() !== '') ? item.descricao : (linkedRef?.descricao || 'Item sem descrição');

        return {
          orcamento_id: newOrc.id,
          item_eap: item.item_eap,
          codigo: linkedRef?.codigo || null,
          banco_fonte: 'Própria',
          descricao: itemDesc,
          unidade: item.unidade || linkedRef?.unidade || 'un',
          quantidade: item.quantidade || 0,
          valor_unitario_mat: matVal,
          valor_unitario_mo: moVal,
          valor_unitario: item.valor_unitario_empresa || item.valor_unitario_orig || 0,
          valor_unitario_com_bdi: item.valor_unitario_empresa || item.valor_unitario_orig || 0,
          total_mat: (item.quantidade || 0) * matVal,
          total_mo: (item.quantidade || 0) * moVal,
          total: item.total_empresa || item.total_orig || 0,
          composicao_id: item.composicao_id || null
        };
      });

      const { error: itemsError } = await supabase
        .schema('engenharia')
        .from('orcamento_itens')
        .insert(itensPayload);

      if (itemsError) throw itemsError;

      setExistingOrcamento({
        id: newOrc.id,
        codigo,
        nome: importHeader.projeto || importHeader.nome_arquivo,
        status: 'Em Elaboração'
      });

      alert(`✅ Orçamento Versão Empresa (${codigo}) criado com sucesso!`);
      navigate(`/orcamentos/${newOrc.id}`);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao gerar orçamento: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Estatísticas de Custo e Progresso
  const totalItemsCount = items.length;
  const linkedItemsCount = items.filter(isItemLinked).length;
  const isAllLinked = linkedItemsCount === totalItemsCount && totalItemsCount > 0;
  const progressPercent = totalItemsCount > 0 ? Math.round((linkedItemsCount / totalItemsCount) * 100) : 0;

  const totalCliente = items.filter(i => i.status_linha !== 'inativo').reduce((acc, i) => acc + (i.total_orig || 0), 0);
  const totalEmpresa = items.filter(i => i.status_linha !== 'inativo').reduce((acc, i) => acc + (i.total_empresa || i.total_orig || 0), 0);
  const deltaTotal = totalEmpresa - totalCliente;
  const deltaPercent = totalCliente > 0 ? (deltaTotal / totalCliente) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-500">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        Carregando Studio de De-Para...
      </div>
    );
  }

  return (
    <div className="space-y-4 relative pb-[250px] p-4 md:p-8" style={{ zoom: 0.8 }}>
      {/* Topbar Navigation */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/orcamentos?tab=importados');
              }
            }}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-800">{importHeader?.projeto || importHeader?.nome_arquivo}</h2>
              <span className="text-xs bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded border border-purple-100">
                Planilha do Cliente
              </span>
              {existingOrcamento && (
                <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2.5 py-0.5 rounded-lg border border-emerald-200 font-mono shadow-3xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  Orçamento: {existingOrcamento.codigo}
                </span>
              )}
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              Cliente: <span className="font-semibold text-slate-600">{importHeader?.cliente || 'Não informado'}</span> · Arquivo: <span className="font-mono text-slate-600">{importHeader?.nome_arquivo}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Exportar Excel Comparativo</span>
          </button>

          {!existingOrcamento ? (
            <button
              onClick={handleGerarOrcamentoEmpresa}
              disabled={saving || !isAllLinked}
              className={clsx(
                "px-5 py-2.5 font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer",
                isAllLinked ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"
              )}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Gerando Orçamento...' : isAllLinked ? 'Gerar Orçamento Versão Empresa' : `Vincule 100% para Criar Orçamento (${linkedItemsCount}/${totalItemsCount})`}</span>
            </button>
          ) : (
            <button
              onClick={() => navigate(`/orcamentos/${existingOrcamento.id}`)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer transition-all hover:scale-[1.02]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Acessar Orçamento Criado</span>
            </button>
          )}
        </div>
      </div>

      {/* Painel de Progresso & Comparativo Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card Progresso De-Para */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
            <span>Progresso de Vinculação (De-Para)</span>
            <span className={clsx(isAllLinked ? "text-emerald-600" : "text-blue-600")}>{linkedItemsCount} de {totalItemsCount} ({progressPercent}%)</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div className={clsx("h-full transition-all duration-300", isAllLinked ? "bg-emerald-600" : "bg-blue-600")} style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {/* Card Custo Cliente */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase">Total Planilha</span>
            <p className="text-base font-bold text-slate-800">{totalCliente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>
          <FileSpreadsheet className="w-7 h-7 text-slate-300" />
        </div>

        {/* Card Custo Empresa & Delta */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase">Total Orçamento Empresa</span>
            <div className="flex items-center gap-2">
              <p className="text-base font-extrabold text-blue-600">{totalEmpresa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              {deltaTotal !== 0 && (
                <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded", deltaTotal < 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                  {deltaTotal > 0 ? '+' : ''}{deltaPercent.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
          <Calculator className="w-7 h-7 text-blue-500" />
        </div>
      </div>

      {/* Tabela De-Para Lado a Lado */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
        {/* Barra de Ferramentas do Studio (Sempre no topo do Card) */}
        <div className="p-3 bg-slate-100 border-b border-slate-200 flex flex-wrap justify-between items-center gap-3 rounded-t-2xl z-30">
          {/* Título integrado */}
          <div className="text-left select-none">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <span>Studio de De-Para (EAP e Tópicos)</span>
              {selectedRowIndexes.size > 0 && (
                <span className="px-2 py-0.5 bg-blue-600 text-white font-mono text-[10px] font-bold rounded-full animate-in fade-in">
                  {selectedRowIndexes.size} {selectedRowIndexes.size === 1 ? 'linha selecionada' : 'linhas selecionadas'}
                </span>
              )}
            </h3>
            <p className="text-[10px] text-slate-500 font-semibold">
              Atalhos de Teclado: Setas (Navegar) · Shift+Setas (Seleção em Bloco) · Ctrl+Shift+Setas (Recuar / Promover) · Enter (Editar)
            </p>
          </div>
            
          {/* Ferramentas Superiores */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-2xs">
              <button
                onClick={handleInsertRow}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer shadow-xs transition-all"
                title="Inserir Nova Linha acima da selecionada (ou no final) [Tecla Insert]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Inserir Linha</span>
              </button>

              <div className="w-px h-4 bg-slate-200 mx-1"></div>

              <button
                onClick={handleOutdentSelectedRow}
                disabled={selectedRowIndex === null && selectedRowIndexes.size === 0}
                className="px-2 py-1 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Diminuir Nível EAP (Ctrl + Shift + Seta Esquerda)"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-purple-600" />
                <span>Promover Nível (⬅)</span>
              </button>
              <button
                onClick={handleIndentSelectedRow}
                disabled={selectedRowIndex === null && selectedRowIndexes.size === 0}
                className="px-2 py-1 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Aumentar Nível EAP (Ctrl + Shift + Seta Direita)"
              >
                <span>Recuar Nível (➔)</span>
                <ArrowRight className="w-3.5 h-3.5 text-purple-600" />
              </button>

              <div className="w-px h-4 bg-slate-200 mx-1"></div>

              <button
                onClick={() => {
                  const targetIdxs = Array.from(selectedRowIndexes);
                  if (targetIdxs.length === 0 && selectedRowIndex !== null) targetIdxs.push(selectedRowIndex);
                  targetIdxs.forEach(idx => {
                    if (items[idx]) handleToggleInativar(items[idx]);
                  });
                }}
                disabled={selectedRowIndex === null && selectedRowIndexes.size === 0}
                className={clsx(
                  "px-2 py-1 font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all",
                  selectedRowIndex !== null && items[selectedRowIndex]?.status_linha === 'inativo'
                    ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                )}
                title="Inativar ou Reativar Linha(s) Selecionada(s)"
              >
                <Strikethrough className="w-3.5 h-3.5" />
                <span>Inativar/Reativar</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-xl shadow-2xs">
              <button
                onClick={expandAll}
                className="px-2 py-1.5 hover:bg-slate-50 text-slate-600 font-bold rounded-lg text-[11.5px] flex items-center gap-1 cursor-pointer"
                title="Expandir todos os tópicos (Tudo)"
              >
                <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>Expandir Tudo</span>
              </button>
              <button
                onClick={collapseAll}
                className="px-2 py-1.5 hover:bg-slate-50 text-slate-600 font-bold rounded-lg text-[11.5px] flex items-center gap-1 cursor-pointer"
                title="Recolher todos os tópicos (Nenhum)"
              >
                <Folder className="w-3.5 h-3.5 text-slate-500" />
                <span>Recolher Tudo</span>
              </button>
              <div className="w-px h-4 bg-slate-200 mx-1"></div>
              <span className="text-[10px] text-slate-400 font-bold px-1 select-none">Exibir até Nível:</span>
              <select
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'all') expandAll();
                  else if (val === 'none') collapseAll();
                  else expandToLevel(Number(val));
                }}
                defaultValue="all"
                className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-lg px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer outline-none"
              >
                <option value="all">Ver Todos</option>
                <option value="1">Nível 1 (Capítulos)</option>
                <option value="2">Nível 2 (Sub-capítulos)</option>
                <option value="3">Nível 3 (Composições)</option>
                <option value="4">Nível 4 (Sub-composições)</option>
                <option value="5">Nível 5 (Insumos)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Custom scrollbar style tag */}
        <style>{`
          .custom-horizontal-scrollbar::-webkit-scrollbar {
            height: 12px;
            width: 8px;
          }
          .custom-horizontal-scrollbar::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 6px;
          }
          .custom-horizontal-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 6px;
            border: 2px solid #f1f5f9;
          }
          .custom-horizontal-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}</style>

        {/* Container da Tabela com Colunas com Larguras Exatas e Cabeçalho Sticky */}
        <div ref={tableContainerRef} className="overflow-auto max-h-[calc(100vh-250px)] custom-horizontal-scrollbar bg-white rounded-b-2xl relative">
          <table className="w-full min-w-[1300px] text-xs text-left border-collapse table-fixed relative">
            <colgroup>
              <col style={{ width: colWidths.eap }} />
              <col style={{ width: colWidths.item_cliente }} />
              <col style={{ width: colWidths.und }} />
              <col style={{ width: colWidths.qtd }} />
              {showMatUnit && <col style={{ width: colWidths.mat_unit }} />}
              {showMoUnit && <col style={{ width: colWidths.mo_unit }} />}
              {showUnitTotal && <col style={{ width: colWidths.unit_total }} />}
              {showMatTotal && <col style={{ width: colWidths.mat_total }} />}
              {showMoTotal && <col style={{ width: colWidths.mo_total }} />}
              <col style={{ width: colWidths.preco_cliente }} />
              <col style={{ width: colWidths.ref_empresa }} />
              {showMatUnit && <col style={{ width: colWidths.mat_unit_empresa }} />}
              {showMoUnit && <col style={{ width: colWidths.mo_unit_empresa }} />}
              {showUnitTotal && <col style={{ width: colWidths.unit_total_empresa }} />}
              {showMatTotal && <col style={{ width: colWidths.mat_total_empresa }} />}
              {showMoTotal && <col style={{ width: colWidths.mo_total_empresa }} />}
              <col style={{ width: colWidths.preco_empresa }} />
              <col style={{ width: colWidths.acoes }} />
            </colgroup>

            {/* Títulos das Colunas Congelados no Topo da Tabela */}
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-20 shadow-xs">
              <tr>
                <th className="p-2 bg-slate-100 relative select-none">
                  <span>EAP</span>
                  <div onMouseDown={(e) => handleMouseDown('eap', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 bg-slate-200/50 transition-colors z-30" />
                </th>
                <th className="p-3 bg-slate-100 relative select-none">
                  <span>Item Cliente (Original - Fixo)</span>
                  <div onMouseDown={(e) => handleMouseDown('item_cliente', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 bg-slate-200/50 transition-colors z-30" />
                </th>
                <th className="p-2 text-center bg-slate-100 font-bold relative select-none">
                  <span>Und</span>
                  <div onMouseDown={(e) => handleMouseDown('und', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 bg-slate-200/50 transition-colors z-30" />
                </th>
                <th className="p-2 text-right bg-slate-100 font-bold relative select-none">
                  <span>Qtd</span>
                  <div onMouseDown={(e) => handleMouseDown('qtd', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 bg-slate-200/50 transition-colors z-30" />
                </th>
                
                {showMatUnit && (
                  <th className="p-2 text-right bg-slate-100 font-bold relative select-none">
                    <span>Mat. Unit. (Cliente)</span>
                    <div onMouseDown={(e) => handleMouseDown('mat_unit', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 bg-slate-200/50 transition-colors z-30" />
                  </th>
                )}
                {showMoUnit && (
                  <th className="p-2 text-right bg-slate-100 font-bold relative select-none">
                    <span>M.O. Unit. (Cliente)</span>
                    <div onMouseDown={(e) => handleMouseDown('mo_unit', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 bg-slate-200/50 transition-colors z-30" />
                  </th>
                )}
                {showUnitTotal && (
                  <th className="p-2 text-right bg-slate-100 font-bold relative select-none">
                    <span>Unit. Total (Cliente)</span>
                    <div onMouseDown={(e) => handleMouseDown('unit_total', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 bg-slate-200/50 transition-colors z-30" />
                  </th>
                )}
                {showMatTotal && (
                  <th className="p-2 text-right bg-slate-100 font-bold relative select-none">
                    <span>Mat. Total (Cliente)</span>
                    <div onMouseDown={(e) => handleMouseDown('mat_total', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 bg-slate-200/50 transition-colors z-30" />
                  </th>
                )}
                {showMoTotal && (
                  <th className="p-2 text-right bg-slate-100 font-bold relative select-none">
                    <span>M.O. Total (Cliente)</span>
                    <div onMouseDown={(e) => handleMouseDown('mo_total', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 bg-slate-200/50 transition-colors z-30" />
                  </th>
                )}

                <th className="p-2 text-right bg-slate-100 font-bold relative select-none">
                  <span>Preço Cliente</span>
                  <div onMouseDown={(e) => handleMouseDown('preco_cliente', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 bg-slate-200/50 transition-colors z-30" />
                </th>
                <th className="p-3 border-l border-slate-200 bg-slate-100 relative select-none">
                  <span>Referência Empresa</span>
                  <div onMouseDown={(e) => handleMouseDown('ref_empresa', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 bg-slate-200/50 transition-colors z-30" />
                </th>
                
                {showMatUnit && (
                  <th className="p-2 text-right bg-slate-100 font-bold relative select-none">
                    <span>Mat. Unit. (Empresa)</span>
                    <div onMouseDown={(e) => handleMouseDown('mat_unit_empresa', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 bg-slate-200/50 transition-colors z-30" />
                  </th>
                )}
                {showMoUnit && (
                  <th className="p-2 text-right bg-slate-100 font-bold relative select-none">
                    <span>M.O. Unit. (Empresa)</span>
                    <div onMouseDown={(e) => handleMouseDown('mo_unit_empresa', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 bg-slate-200/50 transition-colors z-30" />
                  </th>
                )}
                {showUnitTotal && (
                  <th className="p-2 text-right bg-slate-100 font-bold relative select-none">
                    <span>Unit. Total (Empresa)</span>
                    <div onMouseDown={(e) => handleMouseDown('unit_total_empresa', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 bg-slate-200/50 transition-colors z-30" />
                  </th>
                )}
                {showMatTotal && (
                  <th className="p-2 text-right bg-slate-100 font-bold relative select-none">
                    <span>Mat. Total (Empresa)</span>
                    <div onMouseDown={(e) => handleMouseDown('mat_total_empresa', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 bg-slate-200/50 transition-colors z-30" />
                  </th>
                )}
                {showMoTotal && (
                  <th className="p-2 text-right bg-slate-100 font-bold relative select-none">
                    <span>M.O. Total (Empresa)</span>
                    <div onMouseDown={(e) => handleMouseDown('mo_total_empresa', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 bg-slate-200/50 transition-colors z-30" />
                  </th>
                )}

                <th className="p-2 text-right bg-slate-100 font-bold relative select-none">
                  <span>Preço Empresa</span>
                  <div onMouseDown={(e) => handleMouseDown('preco_empresa', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 bg-slate-200/50 transition-colors z-30" />
                </th>
                <th className="p-2 text-center bg-slate-100 relative select-none">
                  <span>Ações</span>
                  <div onMouseDown={(e) => handleMouseDown('acoes', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 bg-slate-200/50 transition-colors z-30" />
                </th>
              </tr>
            </thead>

            {/* CORPO DA TABELA */}
            <tbody className="divide-y divide-slate-100 bg-white">
              {items.map((item, index) => {
                if (isRowHidden(item.item_eap)) return null;

                const level = (item.item_eap || '').split('.').filter(Boolean).length;
                const hasChildrenBool = getDirectChildren(item.item_eap).length > 0;
                const isCollapsed = collapsedEaps.has(item.item_eap);

                const role = getItemEapRole(item);
                const isSecaoTexto = role === 'secao_texto' || hasChildrenBool;

                const linked = isItemLinked(item);
                const linkedRef = item.composicao || item.insumo;
                const isInactive = item.status_linha === 'inativo';
                const isInsertedByEmpresa = item.status_linha === 'inserido_empresa' || item.status_linha === 'inserido_empresa_e_cliente';
                const isInsertedOrDesdobrado = isInsertedByEmpresa || item.status_linha === 'desdobrado';
                const isSelected = selectedRowIndex === index || selectedRowIndexes.has(index);

                // Estilização EAP conforme papel na árvore
                let rowStyle = "hover:bg-slate-50/80 transition-colors cursor-pointer";
                let borderLeft = "";

                if (isSelected) {
                  rowStyle = "bg-blue-100/90 ring-2 ring-blue-500/80 font-bold transition-colors shadow-2xs";
                } else if (isInactive) {
                  rowStyle = "bg-slate-100/80 opacity-50 transition-colors";
                } else if (item.status_linha === 'inserido_empresa_e_cliente') {
                  rowStyle = "font-semibold text-amber-950 border-l-4 border-l-amber-500 shadow-2xs";
                } else if (item.status_linha === 'inserido_empresa') {
                  rowStyle = "font-semibold text-slate-800 border-l-4 border-l-amber-500 shadow-2xs";
                } else if (isSecaoTexto) {
                  rowStyle = "bg-purple-50/40 font-extrabold text-purple-950 border-l-4 border-l-purple-600 shadow-2xs";
                } else if (item.status_linha === 'desdobrado') {
                  rowStyle = "bg-slate-50/50 hover:bg-slate-100/70 text-slate-500 transition-colors";
                } else if (linked) {
                  rowStyle = "bg-emerald-50/25 hover:bg-emerald-100/40 font-semibold text-emerald-950 transition-colors";
                }

                const isRowHiddenOnClient = item.status_linha === 'inserido_empresa' || item.status_linha === 'desdobrado' || (item.status_linha === 'inativo' && (isDesdobradoEap(item.item_eap, items) || !item.descricao));
                const clientBg = item.status_linha === 'inserido_empresa_e_cliente' ? 'bg-amber-100/90' : '';
                const companyBg = (item.status_linha === 'inserido_empresa' || item.status_linha === 'inserido_empresa_e_cliente') ? 'bg-amber-100/90' : '';
                const breakdown = getCompanyBreakdown(item);

                return (
                  <tr
                    key={item.id}
                    onClick={(e) => handleRowClick(index, e)}
                    className={clsx(rowStyle, borderLeft)}
                  >
                    <td className={clsx("p-2 font-mono font-bold text-slate-700 text-[11px]", clientBg)}>{item.item_eap}</td>
                    
                    <td
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingCustomItem(item);
                        setCustomText(item.descricao || linkedRef?.descricao || '');
                      }}
                      className={clsx("p-2 font-medium text-slate-800 text-[11px] cursor-pointer", clientBg)}
                      title="Clique duas vezes para editar o texto desta linha"
                    >
                      <div className="flex items-center gap-1" style={{ paddingLeft: `${(level - 1) * 18}px` }}>
                        {hasChildrenBool ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCollapse(item.item_eap);
                            }}
                            className="p-0.5 hover:bg-slate-200/70 rounded text-slate-600 cursor-pointer transition-transform"
                          >
                            {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        ) : (
                          <span className="w-3 inline-block" />
                        )}
                        <span className={clsx("truncate flex-1 min-w-0", isInactive ? "line-through text-slate-400" : hasChildrenBool ? "font-bold" : "font-normal")}>
                          {isRowHiddenOnClient ? '' : (item.descricao || linkedRef?.descricao || '')}
                        </span>
                      </div>
                    </td>

                    <td className={clsx("p-2 text-center text-slate-500 font-medium text-[11px]", clientBg)}>
                      {isRowHiddenOnClient ? '' : (item.unidade || linkedRef?.unidade || 'un')}
                    </td>
                     <td className={clsx("p-2 text-right font-semibold text-slate-700 text-[11px]", clientBg)}>
                      {isRowHiddenOnClient ? '' : (item.quantidade > 0 ? item.quantidade : '')}
                    </td>
                    {showMatUnit && (
                      <td className={clsx("p-2 text-right text-slate-500 text-[11px]", clientBg)}>
                        {isRowHiddenOnClient ? '' : ((item.valor_unitario_mat_orig || 0) > 0 ? (item.valor_unitario_mat_orig || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-')}
                      </td>
                    )}
                    {showMoUnit && (
                      <td className={clsx("p-2 text-right text-slate-500 text-[11px]", clientBg)}>
                        {isRowHiddenOnClient ? '' : ((item.valor_unitario_mo_orig || 0) > 0 ? (item.valor_unitario_mo_orig || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-')}
                      </td>
                    )}
                    {showUnitTotal && (
                      <td className={clsx("p-2 text-right text-slate-500 text-[11px]", clientBg)}>
                        {isRowHiddenOnClient ? '' : ((item.valor_unitario_orig || 0) > 0 ? (item.valor_unitario_orig || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-')}
                      </td>
                    )}
                    {showMatTotal && (
                      <td className={clsx("p-2 text-right text-slate-500 text-[11px]", clientBg)}>
                        {isRowHiddenOnClient ? '' : ((item.total_mat_orig || 0) > 0 ? (item.total_mat_orig || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-')}
                      </td>
                    )}
                    {showMoTotal && (
                      <td className={clsx("p-2 text-right text-slate-500 text-[11px]", clientBg)}>
                        {isRowHiddenOnClient ? '' : ((item.total_mo_orig || 0) > 0 ? (item.total_mo_orig || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-')}
                      </td>
                    )}
                    <td className={clsx("p-2 text-right font-semibold text-slate-600 text-[11px]", clientBg)}>
                      {isRowHiddenOnClient ? '-' : (item.total_orig || 0) > 0 ? (item.total_orig || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                    </td>

                    {/* Coluna De-Para Empresa (Lado Direito ARRASTÁVEL com alça GripVertical ⋮⋮) */}
                    <td
                      draggable
                      onDragStart={e => handleRightDragStart(e, index)}
                      onDragOver={e => handleRightDragOver(e)}
                      onDrop={e => handleRightDrop(e, index)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (!linkedRef) {
                          setInlineEditingRowId(item.id);
                          const initialVal = (item.tipo_vinculo === 'texto' || isInsertedByEmpresa) ? (item.descricao || '') : '';
                          setInlineTextValue(initialVal);
                        }
                      }}
                      className={clsx(
                        "p-2 border-l border-slate-200 text-[11px] transition-all",
                        !linkedRef && "cursor-pointer hover:bg-purple-50/50",
                        companyBg ? companyBg : "bg-slate-50/40",
                        draggedRightIndex === index ? "opacity-30 border-2 border-dashed border-blue-500 bg-blue-100" : "hover:bg-blue-50/60"
                      )}
                      title={!linkedRef ? "Clique duas vezes para digitar/editar o texto da Referência Empresa" : "Item vinculado ao banco de dados (descrição não editável)"}
                    >
                      <div className={clsx("flex items-center gap-1.5", isInactive && "line-through text-slate-400 opacity-60")} style={{ paddingLeft: `${(level - 1) * 18}px` }}>
                        {/* Alça de Arraste Exclusiva do Lado Direito */}
                        {!isInactive && (
                          <div
                            title="Clique e arraste para mover este insumo/composição para outra linha do cliente"
                            className="text-slate-300 hover:text-blue-600 cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-blue-100"
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>
                        )}

                        {inlineEditingRowId === item.id ? (
                          <div className="flex items-center gap-1.5 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                            <input
                              type="text"
                              value={inlineTextValue}
                              onChange={e => setInlineTextValue(e.target.value)}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  await handleSaveInlineText(item, inlineTextValue);
                                } else if (e.key === 'Escape') {
                                  setInlineEditingRowId(null);
                                }
                              }}
                              onBlur={async () => {
                                await handleSaveInlineText(item, inlineTextValue);
                              }}
                              autoFocus
                              placeholder="Digite um texto..."
                              className="w-full bg-white border-2 border-purple-500 rounded-lg px-2 py-0.5 text-[11px] font-semibold text-slate-800 focus:outline-none shadow-xs"
                            />
                          </div>
                        ) : isInsertedByEmpresa && linkedRef ? (
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {hasChildrenBool && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCollapse(item.item_eap);
                                }}
                                className="p-0.5 hover:bg-slate-200 rounded text-slate-500 cursor-pointer mr-0.5"
                                title={isCollapsed ? "Expandir sub-itens" : "Recolher sub-itens"}
                              >
                                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />}
                              </button>
                            )}
                            <span className="text-[9px] bg-amber-200/80 text-amber-900 font-bold font-mono px-1 py-0.5 rounded">
                              {linkedRef?.codigo || 'INSERIDO'}
                            </span>
                            <span className="font-semibold text-amber-950 truncate flex-1 min-w-0">{linkedRef?.descricao}</span>
                          </div>
                        ) : item.status_linha === 'desdobrado' && linkedRef ? (
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            <span className="text-slate-400 font-extrabold text-xs mr-0.5">↳</span>
                            {hasChildrenBool && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCollapse(item.item_eap);
                                }}
                                className="p-0.5 hover:bg-slate-200 rounded text-slate-500 cursor-pointer mr-0.5"
                                title={isCollapsed ? "Expandir sub-itens" : "Recolher sub-itens"}
                              >
                                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />}
                              </button>
                            )}
                            <span className="text-[9px] bg-slate-200/90 text-slate-600 font-bold font-mono px-1 py-0.5 rounded">
                              {linkedRef?.codigo}
                            </span>
                            <span className="text-slate-500 truncate flex-1 min-w-0 font-normal text-[10.5px]">{linkedRef?.descricao}</span>
                          </div>
                        ) : linkedRef ? (
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {hasChildrenBool && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCollapse(item.item_eap);
                                }}
                                className="p-0.5 hover:bg-slate-200 rounded text-slate-500 cursor-pointer mr-0.5"
                                title={isCollapsed ? "Expandir sub-itens" : "Recolher sub-itens"}
                              >
                                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />}
                              </button>
                            )}
                            <span className="text-[9px] bg-blue-100 text-blue-800 font-bold font-mono px-1 py-0.5 rounded">
                              {linkedRef?.codigo || 'VINCULADO'}
                            </span>
                            <span className="font-semibold text-slate-800 truncate flex-1 min-w-0">{linkedRef?.descricao}</span>
                          </div>
                        ) : (item.tipo_vinculo === 'texto' || isInsertedByEmpresa) && item.descricao && item.descricao.trim().length > 0 ? (
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <span className="font-semibold text-slate-800 truncate flex-1 min-w-0">{item.descricao}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px] cursor-pointer hover:text-slate-600">Digite um texto</span>
                        )}
                      </div>
                    </td>

                    {showMatUnit && (
                      <td className={clsx("p-2 text-right text-slate-600 font-semibold text-[11px]", companyBg ? companyBg : "bg-slate-50/40")}>
                        {isInactive ? '-' : breakdown.matUnit > 0 ? breakdown.matUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                      </td>
                    )}
                    {showMoUnit && (
                      <td className={clsx("p-2 text-right text-slate-600 font-semibold text-[11px]", companyBg ? companyBg : "bg-slate-50/40")}>
                        {isInactive ? '-' : breakdown.moUnit > 0 ? breakdown.moUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                      </td>
                    )}
                    {showUnitTotal && (
                      <td className={clsx("p-2 text-right text-slate-600 font-semibold text-[11px]", companyBg ? companyBg : "bg-slate-50/40")}>
                        {isInactive ? '-' : breakdown.unitTotal > 0 ? breakdown.unitTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                      </td>
                    )}
                    {showMatTotal && (
                      <td className={clsx("p-2 text-right text-slate-600 font-semibold text-[11px]", companyBg ? companyBg : "bg-slate-50/40")}>
                        {isInactive ? '-' : breakdown.matTotal > 0 ? breakdown.matTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                      </td>
                    )}
                    {showMoTotal && (
                      <td className={clsx("p-2 text-right text-slate-600 font-semibold text-[11px]", companyBg ? companyBg : "bg-slate-50/40")}>
                        {isInactive ? '-' : breakdown.moTotal > 0 ? breakdown.moTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                      </td>
                    )}

                     <td className={clsx("p-2 text-right font-bold text-slate-800 text-[11px]", companyBg ? companyBg : "bg-slate-50/40")}>
                      {isInactive ? '-' : item.total_empresa > 0 ? item.total_empresa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                    </td>

                    {/* Ações completas para todos os itens operacionais */}
                    <td className={clsx("p-2 text-center", companyBg)} onClick={e => e.stopPropagation()}>
                       <div className="flex items-center justify-center gap-1 flex-wrap">
                          {/* Inativar / Reativar Linha */}
                          {!linkedRef && (
                            <button
                              onClick={() => handleToggleInativar(item)}
                              title={item.status_linha === 'inativo' ? "Reativar Linha" : "Inativar Linha"}
                              className={clsx(
                                "p-1 rounded-lg cursor-pointer transition-all",
                                item.status_linha === 'inativo'
                                  ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              )}
                            >
                              <Strikethrough className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {!isInactive && (!isSecaoTexto || linkedRef) && (
                            <button
                              onClick={() => {
                                setSelectedItemForLink(item);
                                setShowLinkDrawer(true);
                              }}
                              title={linkedRef ? "Trocar Vínculo (Banco Próprio)" : "Vincular do Banco Próprio"}
                              className={clsx(
                                "p-1 rounded-lg cursor-pointer transition-all",
                                linkedRef
                                  ? "text-blue-600 hover:text-blue-800 hover:bg-blue-50/60"
                                  : "text-amber-600 hover:text-amber-700 hover:bg-amber-50 bg-amber-50/80 font-bold border border-amber-200"
                              )}
                            >
                              {linkedRef ? <RefreshCw className="w-3.5 h-3.5" /> : <PlusCircle className="w-3.5 h-3.5" />}
                            </button>
                          )}
 
                          {!isInactive && linkedRef && (
                            <button
                              onClick={() => handleUnlinkItem(item)}
                              title="Desvincular Composição ou Insumo (Desfazer De-Para)"
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-all"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}

                        {/* Confirmar Inserção / Desinserção na Planilha do Cliente */}
                        {isInsertedOrDesdobrado && (
                          <button
                            onClick={() => handleToggleInserirCliente(item)}
                            title={item.status_linha === 'inserido_empresa_e_cliente' ? "Desinserir da Planilha do Cliente (Manter apenas na Referência Empresa)" : "Inserir na Planilha do Cliente (Exibir e Exportar na Proposta do Cliente)"}
                            className={clsx(
                              "p-1 rounded cursor-pointer transition-all",
                              item.status_linha === 'inserido_empresa_e_cliente'
                                ? "bg-amber-100 hover:bg-rose-100 text-amber-900 hover:text-rose-700 border border-amber-300"
                                : "hover:bg-blue-100 text-slate-400 hover:text-blue-700"
                            )}
                          >
                            {item.status_linha === 'inserido_empresa_e_cliente' ? <FileMinus className="w-3.5 h-3.5" /> : <FilePlus className="w-3.5 h-3.5" />}
                          </button>
                        )}

                        {/* Excluir Linha Inserida */}
                        {isInsertedOrDesdobrado && (
                          <button
                            onClick={() => handleDeleteRow(item)}
                            title="Excluir Linha Inserida"
                            className="p-1 hover:bg-rose-200 text-rose-700 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Editar Texto Customizado / Título da Seção */}
      {editingCustomItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">Definir Texto / Título da Empresa</h3>
              <button onClick={() => setEditingCustomItem(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Altere o texto da linha (ex: de <span className="font-semibold text-slate-700">"Novo Insumo"</span> para <span className="font-semibold text-blue-600">"Escavação Manual"</span>):
              </p>
              <textarea
                rows={3}
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button onClick={() => setEditingCustomItem(null)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer">
                Cancelar
              </button>
              <button onClick={handleSaveCustomText} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs">
                Salvar Texto Customizado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer Lateral de Seleção EXCLUSIVA de Composições e Insumos do BANCO PRÓPRIO */}
      {showLinkDrawer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-end z-50 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg h-full flex flex-col shadow-2xl border-l border-slate-200">
            {/* Header Drawer */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Vincular Item do Banco Próprio
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">Item Cliente: {selectedItemForLink?.descricao}</p>
              </div>
              <button onClick={() => setShowLinkDrawer(false)} className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Busca em Tempo Real & Abas do Banco Próprio */}
            <div className="p-4 space-y-3 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar por código ou descrição..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-medium"
                />
              </div>

              {/* Apenas 2 Abas: Composições Próprias e Insumos Próprios */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSearchTab('composicoes_propria')}
                  className={clsx(
                    "flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1.5",
                    searchTab === 'composicoes_propria' ? "bg-blue-50 border-blue-300 text-blue-700 shadow-xs" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Composições Próprias</span>
                </button>
                <button
                  onClick={() => setSearchTab('insumos_proprios')}
                  className={clsx(
                    "flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1.5",
                    searchTab === 'insumos_proprios' ? "bg-blue-50 border-blue-300 text-blue-700 shadow-xs" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Package className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Insumos Próprios</span>
                </button>
              </div>
            </div>

            {/* Lista de Resultados Filtrada */}
            <div className="flex-1 p-4 overflow-y-auto space-y-2">
              {loadingSearch ? (
                <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  Pesquisando no Banco Próprio...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Nenhum item encontrado no Banco Próprio {searchTerm ? `para "${searchTerm}"` : ''}.
                </div>
              ) : (
                searchResults.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleLinkItem(item)}
                    className="p-3 border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 rounded-xl cursor-pointer transition-all space-y-1 group shadow-xs"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        {item.codigo}
                      </span>
                      <span className="text-xs font-bold text-blue-600">
                        {parseFloat(item.valor_unitario || item.preco_unitario || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / {item.unidade}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-800 group-hover:text-blue-700">{item.descricao}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {scrollWidth > clientWidth && (
        <div 
          ref={stickyScrollRef}
          className={clsx(
            "fixed bottom-0 left-0 right-0 z-40 bg-slate-50 border-t border-slate-200 overflow-x-auto custom-horizontal-scrollbar shadow-[0_-4px_12px_rgba(0,0,0,0.05)] transition-all duration-300",
            sidebarCollapsed ? "md:left-16" : "md:left-64"
          )}
          style={{ height: '14px' }}
        >
          <div style={{ width: `${scrollWidth}px`, height: '1px' }} />
        </div>
      )}
    </div>
  );
}
