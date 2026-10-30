import React, { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { 
  Calendar, Clock, Layers, ArrowRight, RefreshCw, ChevronDown, ChevronRight, 
  BarChart3, TrendingUp, Package, HardHat, FileSpreadsheet, ZoomIn, ZoomOut, Filter,
  Sliders, Zap, ShieldAlert, Check, Link, Link2, Info, HelpCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, 
  CartesianGrid, AreaChart, Area, LineChart, Line 
} from 'recharts';

export type OrcamentoItem = {
  id: string;
  orcamento_id?: string;
  item_eap: string;
  codigo?: string | null;
  banco_fonte?: string | null;
  descricao: string;
  unidade: string;
  quantidade: number;
  valor_unitario_mat?: number;
  valor_unitario_mo?: number;
  valor_unitario?: number;
  total_mat?: number;
  total_mo?: number;
  total: number;
  composicao_id?: string | null;
  isSummary?: boolean;
  hasChildren?: boolean;
};

interface CronogramaTabProps {
  orcamentoId?: string;
  itens: OrcamentoItem[];
  duracoesMap?: Record<string, string>;
  predecessorasMap?: Record<string, string>;
  dataInicioObra?: string;
  onChangeCronogramaConfig?: (
    duracoes: Record<string, string>, 
    predecessoras: Record<string, string>, 
    dataInicio: string
  ) => void;
}

export type DistributionProfile = 'uniforme' | 'concentrado_inicio' | 'concentrado_fim' | 'pontual';

// Helper para classificar o perfil de distribuição com base no tipo / categoria do insumo ou item
export function getCategoryProfile(item: OrcamentoItem): { category: string; profile: DistributionProfile } {
  const codUpper = (item.codigo || '').trim().toUpperCase();
  const descUpper = (item.descricao || '').trim().toUpperCase();
  const fonteUpper = (item.banco_fonte || '').trim().toUpperCase();
  const uniUpper = (item.unidade || '').trim().toUpperCase();
  const tipoUpper = ((item as any).tipo || (item as any).tipo_item || (item as any).categoria || (item as any).grupo || '').trim().toUpperCase();

  // 1. Mão de Obra -> Uniforme
  if (tipoUpper.includes('MÃO DE OBRA') || tipoUpper.includes('MAO DE OBRA') || tipoUpper === 'MO' || codUpper.startsWith('MO') || fonteUpper.includes('MO')) {
    return { category: 'Mão de Obra', profile: 'uniforme' };
  }

  // 2. Transporte & Logística -> Concentrado Início
  if (tipoUpper.includes('TRANSPORTE') || tipoUpper.includes('LOGÍSTICA') || tipoUpper.includes('LOGISTICA') || descUpper.includes('TRANSPORTE') || descUpper.includes('FRETE')) {
    return { category: 'Transporte e Logística', profile: 'concentrado_inicio' };
  }

  // 3. Verba -> Pontual (Dia 1)
  if (tipoUpper.includes('VERBA') || descUpper.includes('VERBA')) {
    return { category: 'Verba', profile: 'pontual' };
  }

  // 4. Aluguel -> Uniforme
  if (tipoUpper.includes('ALUGUEL') || tipoUpper.includes('LOCACAO') || tipoUpper.includes('LOCAÇÃO') || descUpper.includes('ALUGUEL') || descUpper.includes('LOCACAO')) {
    return { category: 'Aluguel', profile: 'uniforme' };
  }

  // 5. Administração -> Uniforme
  if (tipoUpper.includes('ADMINISTRAÇÃO') || tipoUpper.includes('ADMINISTRACAO') || descUpper.includes('ADMINISTRAÇÃO') || descUpper.includes('ADMINISTRACAO')) {
    return { category: 'Administração', profile: 'uniforme' };
  }

  // 6. Taxas -> Pontual (Dia 1)
  if (tipoUpper.includes('TAXA') || descUpper.includes('TAXA') || descUpper.includes('ART') || descUpper.includes('RRT') || descUpper.includes('LICENÇA')) {
    return { category: 'Taxas', profile: 'pontual' };
  }

  // 7. Equipamento -> Uniforme
  if (tipoUpper.includes('EQUIPAMENTO') || descUpper.includes('EQUIPAMENTO') || descUpper.includes('MÁQUINA') || descUpper.includes('MAQUINA')) {
    return { category: 'Equipamento', profile: 'uniforme' };
  }

  // 8. Material -> Concentrado Início (compras na chegada da etapa)
  if (tipoUpper.includes('MATERIAL') || (item.total_mat || 0) > (item.total_mo || 0)) {
    return { category: 'Material', profile: 'concentrado_inicio' };
  }

  // 9. Outros -> Uniforme
  return { category: 'Outros', profile: 'uniforme' };
}

// Helper central para determinar se um item do orçamento é uma Seção, Tópico ou Linha de Texto (Resumo)
export function isItemSection(item: any, _allItems?: OrcamentoItem[]): boolean {
  if (!item) return false;

  const eapClean = (item.item_eap || '').replace(/\.+/g, '.').replace(/^\.|\.$/g, '').trim();
  const eapParts = eapClean.split('.').filter(Boolean);

  // 1. Insumos/Subcomposições vinculadas diretamente a uma composição mãe NUNCA são seções
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

  // 2. Marcas explícitas de Seção / Linha de Texto / Tópico / Resumo
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

  // Itens de 1º nível da EAP (ex: "1", "2", "3") são SEMPRE Seções / Capítulos / Tópicos Resumo!
  const isTopLevelEapByPattern = eapParts.length === 1 && eapClean.length > 0;

  if (isExplicitSecao || isSecaoByTipo || isTopLevelEapByPattern) {
    return true;
  }

  // 3. Se não possuir código de composição/fonte (SINAPI, OrçaBRP), é uma linha de texto/seção
  const hasCode = Boolean((item.codigo && item.codigo.trim()) || (item.banco_fonte && item.banco_fonte.trim()));
  if (!hasCode) {
    return true;
  }

  return false;
}

// Helper para validar e sanitizar rigorosamente a string de predecessoras no blur / enter ou salvamento
export function validateAndSanitizePredecessors(
  rawInput: string,
  eapMap?: Map<string, OrcamentoItem>,
  currentItemEap?: string,
  currentItemId?: string,
  nonActMap?: Record<string, boolean>
): string {
  if (!rawInput || !rawInput.trim()) return '';

  const tokens = rawInput.split(/[,;]/).map(s => s.trim()).filter(Boolean);
  const validTokens: string[] = [];

  tokens.forEach(token => {
    // Regex de sintaxe: EAP (ex: 1.2.5 ou 1.1), Tipo de relação (TI, FS, II, SS, TT, FF, IT, SF), Folga (+2, -1, +30d, +30dias)
    const match = token.match(/^\s*([0-9\.]+)\s*(TI|FS|II|SS|TT|FF|IT|SF)?\s*([\+\-]\s*\d+(?:\s*d(?:ias?)?)?)?\s*/i);
    if (!match) return; // Sintaxe totalmente inválida

    const targetEap = match[1].trim();

    // 1. EAP incompleta (ex: "1." ou "1.2.")
    if (targetEap.endsWith('.')) return;

    // 2. Auto-referência
    if ((currentItemEap && targetEap === currentItemEap) || (currentItemId && targetEap === currentItemId)) return;

    // 3. Validação de existência no orçamento (se o eapMap tiver sido fornecido)
    if (eapMap && eapMap.size > 0) {
      const targetItem = eapMap.get(targetEap);
      if (!targetItem) return; // Item não existe no orçamento (ex: 99.1)

      // 4. Não pode ser uma seção resumo / título do grupo / linha de texto
      if (isItemSection(targetItem)) return;
    }

    // 5. Não pode ser um item desmarcado (não-atividade)
    if (nonActMap) {
      const targetItem = eapMap?.get(targetEap);
      const targetId = targetItem?.id || targetEap;
      if (nonActMap[targetEap] || nonActMap[targetId]) return;
    }

    // Sanitiza tipo de relação e folga em dias corridos (acrescenta 'd' para explicitar dias)
    const relType = match[2] ? match[2].toUpperCase() : '';
    let lagStr = '';
    if (match[3]) {
      const numericLag = parseInt(match[3].replace(/[^\d\+\-]/g, ''), 10);
      if (!isNaN(numericLag) && numericLag !== 0) {
        lagStr = numericLag > 0 ? `+${numericLag}d` : `${numericLag}d`;
      }
    }

    const cleanToken = `${targetEap}${relType}${lagStr}`;
    if (!validTokens.includes(cleanToken)) {
      validTokens.push(cleanToken);
    }
  });

  return validTokens.join(';');
}

export function cleanPredecessorsString(predStr: string, nonActMap: Record<string, boolean>): string {
  return validateAndSanitizePredecessors(predStr, undefined, undefined, undefined, nonActMap);
}

interface PredecessorInputCellProps {
  taskId: string;
  eap: string;
  value: string;
  onChange: (val: string) => void;
  onCommit: (val: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, taskId: string, eap: string) => void;
}

function PredecessorInputCell({
  taskId,
  eap,
  value,
  onChange,
  onCommit,
  onKeyDown
}: PredecessorInputCellProps) {
  const [isFocused, setIsFocused] = useState(false);
  const measurerRef = useRef<HTMLSpanElement>(null);
  const [textWidth, setTextWidth] = useState(0);

  // Calcula a sugestão fantasma (ghost text) "dias"
  const ghostSuggestion = useMemo(() => {
    if (!value) return '';
    // Detecta se terminou de digitar um + ou - seguido de dígitos e opcionalmente início de 'dias'
    const match = value.match(/[\+\-]\s*(\d+)\s*([a-zA-Z]*)$/);
    if (!match) return '';

    const typedLetters = (match[2] || '').toLowerCase();
    const fullWord = 'dias';

    if (typedLetters === '') {
      return 'dias';
    } else if (fullWord.startsWith(typedLetters) && typedLetters !== fullWord) {
      return fullWord.slice(typedLetters.length);
    }
    return '';
  }, [value]);

  // Mede a largura exata em pixels do texto digitado
  useLayoutEffect(() => {
    if (measurerRef.current) {
      setTextWidth(measurerRef.current.offsetWidth);
    }
  }, [value]);

  return (
    <div className="relative w-full flex items-center justify-center overflow-hidden">
      {/* Elemento oculto que replica a tipografia para medir a largura com precisão milimétrica */}
      <span
        ref={measurerRef}
        aria-hidden="true"
        className="invisible absolute top-0 left-0 pointer-events-none text-xs font-semibold whitespace-pre select-none"
      >
        {value || ''}
      </span>

      {/* Input de texto real */}
      <input
        type="text"
        data-cronograma-predecessor="true"
        value={value}
        placeholder="ex: 1.2.5 ou 1.1TI+2"
        onFocus={() => setIsFocused(true)}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          setIsFocused(false);
          onCommit(e.target.value);
        }}
        onKeyDown={(e) => onKeyDown(e, taskId, eap)}
        className="w-full text-center bg-slate-50 border border-slate-200 focus:border-blue-500 text-slate-800 rounded py-0.5 px-1 text-xs font-semibold focus:ring-1 focus:ring-blue-500 outline-none"
        title="Digitando apenas o número (ex: 1.2.5), assume automaticamente Término-Início (TI). Também suporta TI, II, TT, IT com folgas (ex: 1.2.5+2 ou 1.1II-1)"
      />

      {/* Sugestão inline transparente (Ghost Text) com visualização 'dias' */}
      {ghostSuggestion && isFocused && (
        <span
          style={{
            left: `calc(50% + ${Math.round(textWidth / 2)}px)`
          }}
          className="absolute top-1/2 -translate-y-1/2 pointer-events-none text-slate-400/60 font-semibold text-xs whitespace-nowrap select-none italic"
        >
          {ghostSuggestion}
        </span>
      )}
    </div>
  );
}

export default function CronogramaTab({
  orcamentoId,
  itens,
  duracoesMap: externalDuracoes,
  predecessorasMap: externalPredecessoras,
  dataInicioObra: externalDataInicio,
  onChangeCronogramaConfig
}: CronogramaTabProps) {
  // Estado local para durações (sincronizado com equipe e com composições sem M.O.)
  const [duracoesMap, setDuracoesMap] = useState<Record<string, string>>(() => {
    if (externalDuracoes && Object.keys(externalDuracoes).length > 0) return externalDuracoes;
    if (orcamentoId) {
      try {
        const saved = localStorage.getItem(`orcamento_cronograma_${orcamentoId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed.duracoes || {};
        }
      } catch (e) {}
    }
    return {};
  });

  // Estado local para predecessoras
  const [predecessorasMap, setPredecessorasMap] = useState<Record<string, string>>(() => {
    if (externalPredecessoras && Object.keys(externalPredecessoras).length > 0) return externalPredecessoras;
    if (orcamentoId) {
      try {
        const saved = localStorage.getItem(`orcamento_cronograma_${orcamentoId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed.predecessoras || {};
        }
      } catch (e) {}
    }
    return {};
  });

  // Sobrescritas de perfil de distribuição por item/composição
  const [customProfilesMap, setCustomProfilesMap] = useState<Record<string, DistributionProfile>>(() => {
    if (orcamentoId) {
      try {
        const saved = localStorage.getItem(`orcamento_perfis_${orcamentoId}`);
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  // Mapeamento de quais itens NÃO são atividades independentes (herdam do pai)
  const [nonActivityMap, setNonActivityMap] = useState<Record<string, boolean>>(() => {
    if (orcamentoId) {
      try {
        const saved = localStorage.getItem(`orcamento_nao_atividades_${orcamentoId}`);
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  // Mapeamento id da composição -> carga horária diária (lido da Distribuição de Equipe)
  const [jornadasMap] = useState<Record<string, string>>(() => {
    if (orcamentoId) {
      try {
        const saved = localStorage.getItem(`orcamento_equipe_${orcamentoId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed.jornadas || {};
        }
      } catch (e) {}
    }
    return {};
  });

  // Data de início do projeto
  const [dataInicioObra, setDataInicioObra] = useState<string>(() => {
    if (externalDataInicio && externalDataInicio.trim()) return externalDataInicio;
    if (orcamentoId) {
      try {
        const saved = localStorage.getItem(`orcamento_cronograma_${orcamentoId}`);
        if (saved && JSON.parse(saved).dataInicio && String(JSON.parse(saved).dataInicio).trim()) {
          return JSON.parse(saved).dataInicio;
        }
      } catch (e) {}
    }
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Modos de visualização: 'meses' | 'semanas' | 'dias'
  const [viewMode, setViewMode] = useState<'meses' | 'semanas' | 'dias'>('meses');

  // Aba ativa dos histogramas: 'mao_de_obra' | 'materiais' | 'curva_s'
  const [histogramTab, setHistogramTab] = useState<'mao_de_obra' | 'materiais' | 'curva_s'>('mao_de_obra');

  // Seções recolhidas
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Largura configurável do painel esquerdo da tabela (Min: 380px, Max: 1100px)
  const [tablePanelWidth, setTablePanelWidth] = useState<number>(() => {
    if (orcamentoId) {
      try {
        const saved = localStorage.getItem(`cronograma_panel_width_${orcamentoId}`);
        if (saved) return parseInt(saved, 10);
      } catch (e) {}
    }
    return 620;
  });

  // Largura configurável da coluna de Descrição da Etapa (Min: 120px, Max: 600px)
  const [descricaoWidth, setDescricaoWidth] = useState<number>(() => {
    if (orcamentoId) {
      try {
        const saved = localStorage.getItem(`cronograma_desc_width_${orcamentoId}`);
        if (saved) return parseInt(saved, 10);
      } catch (e) {}
    }
    return 210;
  });

  const [isResizingPanel, setIsResizingPanel] = useState(false);
  const [isResizingDesc, setIsResizingDesc] = useState(false);
  const [resourceSearch, setResourceSearch] = useState('');

  // Resize handler para a largura total do painel da tabela (Divisor com o Gantt)
  const startResizingPanel = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingPanel(true);
    const startX = e.clientX;
    const startWidth = tablePanelWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(180, Math.min(1200, startWidth + (moveEvent.clientX - startX)));
      setTablePanelWidth(newWidth);
      if (orcamentoId) {
        try {
          localStorage.setItem(`cronograma_panel_width_${orcamentoId}`, String(newWidth));
        } catch (err) {}
      }
    };

    const onMouseUp = () => {
      setIsResizingPanel(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Resize handler para a coluna Descrição da Etapa (atualiza a descrição E move todas as colunas/Gantt para a frente)
  const startResizingDesc = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingDesc(true);
    const startX = e.clientX;
    const startDescWidth = descricaoWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newDescWidth = Math.max(100, Math.min(700, startDescWidth + (moveEvent.clientX - startX)));
      const newPanelWidth = newDescWidth + 470; // 60(Item) + 100(Modo) + 60(Dur) + 110(Predecessoras) + 140(Perfil) = 470
      setDescricaoWidth(newDescWidth);
      setTablePanelWidth(newPanelWidth);
      if (orcamentoId) {
        try {
          localStorage.setItem(`cronograma_desc_width_${orcamentoId}`, String(newDescWidth));
          localStorage.setItem(`cronograma_panel_width_${orcamentoId}`, String(newPanelWidth));
        } catch (err) {}
      }
    };

    const onMouseUp = () => {
      setIsResizingDesc(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Sincronizar props externas
  useEffect(() => {
    if (externalDuracoes && Object.keys(externalDuracoes).length > 0) {
      setDuracoesMap(externalDuracoes);
    }
  }, [externalDuracoes]);

  useEffect(() => {
    if (externalPredecessoras && Object.keys(externalPredecessoras).length > 0) {
      setPredecessorasMap(externalPredecessoras);
    }
  }, [externalPredecessoras]);

  useEffect(() => {
    if (externalDataInicio && externalDataInicio.trim()) {
      setDataInicioObra(externalDataInicio);
    }
  }, [externalDataInicio]);

  // Auxiliar de persistência
  const notifyChanges = (
    newDuracoes: Record<string, string>,
    newPreds: Record<string, string>,
    newInicio: string
  ) => {
    if (orcamentoId) {
      try {
        localStorage.setItem(`orcamento_cronograma_${orcamentoId}`, JSON.stringify({
          duracoes: newDuracoes,
          predecessoras: newPreds,
          dataInicio: newInicio
        }));
      } catch (e) {}
    }
    if (onChangeCronogramaConfig) {
      onChangeCronogramaConfig(newDuracoes, newPreds, newInicio);
    }
  };

  const handleDurationChange = (itemId: string, itemEap: string, val: string) => {
    const nextDur = { ...duracoesMap, [itemId]: val, [itemEap]: val };
    setDuracoesMap(nextDur);
    notifyChanges(nextDur, predecessorasMap, dataInicioObra);
  };

  const handlePredecessorasChange = (itemId: string, itemEap: string, val: string) => {
    const nextPreds = { ...predecessorasMap, [itemId]: val, [itemEap]: val };
    setPredecessorasMap(nextPreds);
    notifyChanges(duracoesMap, nextPreds, dataInicioObra);
  };

  const handleValidateAndCommitPredecessor = (itemId: string, itemEap: string, rawVal: string) => {
    const sanitized = validateAndSanitizePredecessors(rawVal, eapMap, itemEap, itemId, nonActivityMap);
    handlePredecessorasChange(itemId, itemEap, sanitized);
  };

  const handlePredecessorKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    itemId: string,
    itemEap: string
  ) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const target = e.currentTarget;
      const value = target.value;

      handleValidateAndCommitPredecessor(itemId, itemEap, value);

      const allInputs = Array.from(
        document.querySelectorAll<HTMLInputElement>('input[data-cronograma-predecessor="true"]')
      );

      const currentIndex = allInputs.indexOf(target);
      if (currentIndex !== -1) {
        if (e.key === 'Enter' || e.key === 'ArrowDown') {
          e.preventDefault();
          const nextInput = allInputs[currentIndex + 1];
          if (nextInput) {
            nextInput.focus();
            nextInput.select();
            nextInput.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prevInput = allInputs[currentIndex - 1];
          if (prevInput) {
            prevInput.focus();
            prevInput.select();
            prevInput.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }
      }
    }
  };

  const handleDataInicioChange = (val: string) => {
    const safeVal = val || new Date().toISOString().split('T')[0];
    setDataInicioObra(safeVal);
    notifyChanges(duracoesMap, predecessorasMap, safeVal);
  };

  const handleCustomProfileChange = (itemId: string, profile: DistributionProfile) => {
    const nextMap = { ...customProfilesMap, [itemId]: profile };
    setCustomProfilesMap(nextMap);
    if (orcamentoId) {
      try {
        localStorage.setItem(`orcamento_perfis_${orcamentoId}`, JSON.stringify(nextMap));
      } catch (e) {}
    }
  };

  const handleToggleNonActivity = (itemId: string, itemEap: string, isNonAct: boolean) => {
    const nextMap = { ...nonActivityMap, [itemId]: isNonAct, [itemEap]: isNonAct };
    setNonActivityMap(nextMap);
    if (orcamentoId) {
      try {
        localStorage.setItem(`orcamento_nao_atividades_${orcamentoId}`, JSON.stringify(nextMap));
      } catch (e) {}
    }

    if (isNonAct) {
      // Quando uma atividade é desmarcada, limpa ela da lista de predecessoras de todas as outras tarefas
      let updatedPredsMap = { ...predecessorasMap };
      let hasChanges = false;

      Object.keys(updatedPredsMap).forEach(key => {
        const currentVal = updatedPredsMap[key];
        if (currentVal) {
          const newVal = cleanPredecessorsString(currentVal, nextMap);
          if (newVal !== currentVal) {
            updatedPredsMap[key] = newVal;
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        setPredecessorasMap(updatedPredsMap);
        notifyChanges(duracoesMap, updatedPredsMap, dataInicioObra);
      }
    }
  };

  // Sanitização automática de predecessoras no carregamento se houver itens desmarcados
  useEffect(() => {
    if (Object.keys(nonActivityMap).length === 0 || Object.keys(predecessorasMap).length === 0) return;

    let hasChanges = false;
    const cleaned = { ...predecessorasMap };
    Object.keys(cleaned).forEach(key => {
      const val = cleaned[key];
      if (val) {
        const sanitized = cleanPredecessorsString(val, nonActivityMap);
        if (sanitized !== val) {
          cleaned[key] = sanitized;
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      setPredecessorasMap(cleaned);
      notifyChanges(duracoesMap, cleaned, dataInicioObra);
    }
  }, [nonActivityMap]);

  const toggleSection = (itemEap: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(itemEap)) next.delete(itemEap);
      else next.add(itemEap);
      return next;
    });
  };

  // --------------------------------------------------------------------------
  // FILTRAGEM DE TAREFAS: SEÇÕES, COMPOSIÇÕES E SUBCOMPOSIÇÕES
  // Exibe no cronograma apenas Tarefas (Seções, Composições e Subcomposições EAP).
  // Oculta insumos folhas (recursos M.O./Material) da tabela, agregando-os nos histogramas do pai.
  // --------------------------------------------------------------------------
  const { filteredTasks, insumoChildrenMap } = useMemo(() => {
    if (!itens || itens.length === 0) return { filteredTasks: [], insumoChildrenMap: new Map<string, OrcamentoItem[]>() };

    const insumoMap = new Map<string, OrcamentoItem[]>();
    const tasks: OrcamentoItem[] = [];

    // 1. Filtra apenas linhas válidas (que possuem descrição ou EAP)
    const validItens = itens.filter(it => Boolean((it.item_eap || '').trim() || (it.descricao || '').trim()));

    // 2. Mapeamento de quem possui filhos na EAP
    const hasEapChildrenSet = new Set<string>();
    validItens.forEach(it => {
      const eap = (it.item_eap || '').trim();
      if (!eap) return;
      const parts = eap.split('.').filter(Boolean);
      for (let len = 1; len < parts.length; len++) {
        const ancestorEap = parts.slice(0, len).join('.');
        hasEapChildrenSet.add(ancestorEap);
      }
    });

    // Auxiliary to check parent-child relationship
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

      // Um item é um INSUMO FOLHA RECURSO (deve ser escondido das linhas do cronograma e agregado no pai) SE:
      // - Não é uma composição nem possui filhos
      // - E é filho de uma composição/subcomposição
      const isLeafInsumoResource = !isComposition && (isExplicitInsumoFlag || (parentTask !== null && parentIsComposition));

      if (isLeafInsumoResource) {
        if (parentTask) {
          const pId = (parentTask as OrcamentoItem).id || (parentTask as OrcamentoItem).item_eap || '';
          const currentList = insumoMap.get(pId) || [];
          currentList.push(item);
          insumoMap.set(pId, currentList);

          if ((parentTask as OrcamentoItem).item_eap) {
            const eapKey = (parentTask as OrcamentoItem).item_eap!.trim();
            const eapList = insumoMap.get(eapKey) || [];
            eapList.push(item);
            insumoMap.set(eapKey, eapList);
          }
        } else {
          tasks.push(item);
        }
      } else {
        // É uma Seção, Composição ou Subcomposição da EAP (uma Tarefa no Cronograma)
        tasks.push(item);
      }
    });

    return { filteredTasks: tasks, insumoChildrenMap: insumoMap };
  }, [itens]);

  const eapMap = useMemo(() => {
    const map = new Map<string, OrcamentoItem>();
    (filteredTasks || []).forEach(it => {
      if (it.item_eap) map.set(it.item_eap.trim(), it);
      if (it.id) map.set(it.id, it);
    });
    return map;
  }, [filteredTasks]);

  // --------------------------------------------------------------------------
  // CÁLCULO TOPOLÓGICO DO CRONOGRAMA E DATAS (CPM GARANTIDO SEM FALHAS)
  // --------------------------------------------------------------------------
  const calculatedTasks = useMemo(() => {
    if (!filteredTasks || filteredTasks.length === 0) return [];

    let startBase = new Date((dataInicioObra || '').trim() + 'T00:00:00');
    if (isNaN(startBase.getTime())) {
      startBase = new Date();
      startBase.setHours(0, 0, 0, 0);
    }

    const eapMap = new Map<string, OrcamentoItem>();
    filteredTasks.forEach(it => {
      if (it.item_eap) eapMap.set(it.item_eap.trim(), it);
      if (it.id) eapMap.set(it.id, it);
    });

    type TaskCalc = {
      item: OrcamentoItem;
      duracaoDias: number;
      startDate: Date;
      endDate: Date;
      startOffsetDays: number;
      endOffsetDays: number;
      predecessorasStr: string;
      moTotal: number;
      matTotal: number;
      totalGeral: number;
      isSection: boolean;
      level: number;
      childInsumosList: OrcamentoItem[];
      defaultProfile: DistributionProfile;
      isInherited: boolean;
      isCritical?: boolean;
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

    const computeLeafTask = (it: OrcamentoItem): TaskCalc => {
      const eapKey = it.item_eap?.trim() || it.id;
      if (taskMap.has(eapKey)) return taskMap.get(eapKey)!;

      // Proteção contra recursão infinita / dependência circular na pilha atual
      if (visitedSet.has(eapKey)) {
        const fallbackStart = new Date(startBase);
        const fallbackEnd = new Date(startBase);
        fallbackEnd.setDate(fallbackEnd.getDate() + 5);
        return {
          item: it,
          duracaoDias: 5,
          startDate: fallbackStart,
          endDate: fallbackEnd,
          startOffsetDays: 0,
          endOffsetDays: 5,
          predecessorasStr: '',
          moTotal: 0,
          matTotal: 0,
          totalGeral: 0,
          isSection: false,
          level: 1,
          childInsumosList: [],
          defaultProfile: 'uniforme',
          isInherited: true,
          isCritical: false
        };
      }

      visitedSet.add(eapKey);

      try {
        // Seção Raiz / Título / Resumo / Linha de Texto (ex: 1. ESTACAS, 2. SAPATAS, 3.):
        const isRootSection = isItemSection(it, filteredTasks);

        const isInherited = !isRootSection && Boolean(nonActivityMap[it.id] || nonActivityMap[eapKey]);

        let dur = 5;
        let startDate = new Date(startBase);
        let endDate = new Date(startBase);
        const predStr = predecessorasMap[it.id] || predecessorasMap[eapKey] || '';

        if (isInherited) {
          const parentItem = getDirectParentItem(it);
          const parentEapKey = parentItem ? (parentItem.item_eap?.trim() || parentItem.id) : null;
          if (parentItem && parentEapKey && !visitedSet.has(parentEapKey)) {
            const parentCalc = computeLeafTask(parentItem);
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

                // Se a tarefa de onde vem a dependência tiver o campo "ATIVIDADE" desmarcado (isInherited), IGNORA esta predecessora!
                const isTargetInherited = Boolean(
                  nonActivityMap[parentItem.id] || 
                  nonActivityMap[parentItem.item_eap || ''] || 
                  nonActivityMap[targetEap]
                );
                if (isTargetInherited) return;

                // Evita circularidade apenas se o alvo for a seção resumo pai que contém este item
                const isTargetRootSection = isItemSection(parentItem, filteredTasks);
                if (isTargetRootSection && itEap.startsWith(targetEap + '.')) return;

                if (!visitedSet.has(targetEap)) {
                  const predCalc = computeLeafTask(parentItem);

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

          // Se for seção raiz e não tiver duração manual digitada, ajusta pelas datas dos filhos (ignorando filhos com isInherited)
          if (isRootSection && !rawDur) {
            const prefix = eapKey + '.';
            const childCalcs: TaskCalc[] = [];
            filteredTasks.forEach(child => {
              const cEap = (child.item_eap || '').trim();
              if (cEap.startsWith(prefix) && cEap !== it.item_eap) {
                const childIsInherited = Boolean(nonActivityMap[child.id] || nonActivityMap[cEap]);
                if (!visitedSet.has(cEap) && !childIsInherited) {
                  childCalcs.push(computeLeafTask(child));
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

        const startOffsetDays = Math.round((startDate.getTime() - startBase.getTime()) / (1000 * 60 * 60 * 24));
        const endOffsetDays = Math.round((endDate.getTime() - startBase.getTime()) / (1000 * 60 * 60 * 24));

        const childInsumos = insumoChildrenMap.get(it.id) || insumoChildrenMap.get(eapKey) || [];
        let moTotal = it.total_mo || ((it.valor_unitario_mo || 0) * (it.quantidade || 0));
        let matTotal = it.total_mat || ((it.valor_unitario_mat || 0) * (it.quantidade || 0));
        let totalGeral = it.total || (moTotal + matTotal);

        if (childInsumos.length > 0) {
          const sumChildMo = childInsumos.reduce((acc, c) => acc + (c.total_mo || ((c.valor_unitario_mo || 0) * (c.quantidade || 0))), 0);
          const sumChildMat = childInsumos.reduce((acc, c) => acc + (c.total_mat || ((c.valor_unitario_mat || 0) * (c.quantidade || 0))), 0);
          const sumChildTotal = childInsumos.reduce((acc, c) => acc + (c.total || 0), 0);

          if (sumChildMo > 0) moTotal = Math.max(moTotal, sumChildMo);
          if (sumChildMat > 0) matTotal = Math.max(matTotal, sumChildMat);
          if (sumChildTotal > 0) totalGeral = Math.max(totalGeral, sumChildTotal);
        }

        const level = (it.item_eap?.split('.').length || 1);
        const defaultProfInfo = getCategoryProfile(it);

        const result: TaskCalc = {
          item: it,
          duracaoDias: Math.round(dur),
          startDate,
          endDate,
          startOffsetDays,
          endOffsetDays,
          predecessorasStr: isInherited ? '' : predStr,
          moTotal,
          matTotal,
          totalGeral,
          isSection: isRootSection,
          level,
          childInsumosList: childInsumos,
          defaultProfile: customProfilesMap[it.id] || customProfilesMap[eapKey] || defaultProfInfo.profile,
          isInherited,
          isCritical: false
        };

        taskMap.set(eapKey, result);
        return result;
      } finally {
        visitedSet.delete(eapKey);
      }
    };

    // 1. Computa 100% dos itens (Forward Pass - Early Start & Early Finish)
    filteredTasks.forEach(it => {
      computeLeafTask(it);
    });

    const allCalcs = filteredTasks.map(it => taskMap.get(it.item_eap?.trim() || it.id)).filter(Boolean) as TaskCalc[];
    const nonSectionCalcs = allCalcs.filter(t => !t.isSection);

    if (nonSectionCalcs.length > 0) {
      // 2. Data máxima de término do projeto
      const maxProjectEndTime = Math.max(...nonSectionCalcs.map(t => t.endDate.getTime()));

      // 3. Mapeamento de sucessoras para o cálculo do Passe Retrógrado (Backward Pass)
      type SuccRel = { succKey: string; relType: string; lagMs: number };
      const successorRelationsMap = new Map<string, SuccRel[]>();

      allCalcs.forEach(t => {
        if (t.isSection || t.isInherited || !t.predecessorasStr) return;
        const succKey = t.item.item_eap?.trim() || t.id;

        const predEaps = t.predecessorasStr.split(/[,;]/).map(s => s.trim()).filter(Boolean);
        predEaps.forEach(predRaw => {
          const match = predRaw.match(/^\s*([0-9\.]+)\s*(TI|FS|II|SS|TT|FF|IT|SF)?\s*([\+\-]\s*\d+(?:\s*d(?:ias?)?)?)?\s*/i);
          if (!match) return;

          const predKey = match[1].trim();
          const relType = (match[2] || 'TI').toUpperCase();
          const lagDays = match[3] ? parseInt(match[3].replace(/[^\d\+\-]/g, ''), 10) : 0;
          const lagMs = (isNaN(lagDays) ? 0 : lagDays) * 24 * 60 * 60 * 1000;

          const list = successorRelationsMap.get(predKey) || [];
          list.push({ succKey, relType, lagMs });
          successorRelationsMap.set(predKey, list);
        });
      });

      // 4. Inicializa Late Finish (LF) e Late Start (LS) para o Backward Pass
      const lateFinishMap = new Map<string, number>();
      const lateStartMap = new Map<string, number>();

      allCalcs.forEach(t => {
        const key = t.item.item_eap?.trim() || t.id;
        lateFinishMap.set(key, maxProjectEndTime);
        const durMs = Math.max(1, t.duracaoDias) * 24 * 60 * 60 * 1000;
        lateStartMap.set(key, maxProjectEndTime - durMs);
      });

      // 5. Executa o Passe Retrógrado (Backward Pass) até estabilização de LF/LS
      for (let pass = 0; pass < allCalcs.length + 2; pass++) {
        let changed = false;

        allCalcs.forEach(t => {
          if (t.isSection) return;
          const key = t.item.item_eap?.trim() || t.id;
          const durMs = Math.max(1, t.duracaoDias) * 24 * 60 * 60 * 1000;
          const succs = successorRelationsMap.get(key) || [];

          let minLF = maxProjectEndTime;

          if (succs.length > 0) {
            succs.forEach(rel => {
              const succLS = lateStartMap.get(rel.succKey) ?? maxProjectEndTime;
              const succLF = lateFinishMap.get(rel.succKey) ?? maxProjectEndTime;

              if (rel.relType === 'TI' || rel.relType === 'FS') {
                const candidateLF = succLS - rel.lagMs;
                if (candidateLF < minLF) minLF = candidateLF;
              } else if (rel.relType === 'II' || rel.relType === 'SS') {
                const candidateLF = succLS - rel.lagMs + durMs;
                if (candidateLF < minLF) minLF = candidateLF;
              } else if (rel.relType === 'TT' || rel.relType === 'FF') {
                const candidateLF = succLF - rel.lagMs;
                if (candidateLF < minLF) minLF = candidateLF;
              } else if (rel.relType === 'IT' || rel.relType === 'SF') {
                const candidateLF = succLF - rel.lagMs + durMs;
                if (candidateLF < minLF) minLF = candidateLF;
              }
            });
          }

          const currentLF = lateFinishMap.get(key)!;
          if (Math.abs(minLF - currentLF) > 1000) {
            lateFinishMap.set(key, minLF);
            lateStartMap.set(key, minLF - durMs);
            changed = true;
          }
        });

        if (!changed) break;
      }

      // 6. Atribui isCritical se a Folga Total (Total Slack) <= 0.5 dias
      allCalcs.forEach(t => {
        if (t.isSection || t.isInherited) {
          t.isCritical = false;
        } else {
          const key = t.item.item_eap?.trim() || t.id;
          const earlyFinish = t.endDate.getTime();
          const lateFinish = lateFinishMap.get(key) ?? earlyFinish;
          const slackDays = (lateFinish - earlyFinish) / (1000 * 60 * 60 * 24);
          t.isCritical = slackDays <= 0.5;
        }
      });
    }

    return allCalcs;
  }, [filteredTasks, insumoChildrenMap, duracoesMap, predecessorasMap, customProfilesMap, nonActivityMap, dataInicioObra]);

  // --------------------------------------------------------------------------
  // CÁLCULO DA LINHA DO TEMPO (EIXO X)
  // --------------------------------------------------------------------------
  const timelineInfo = useMemo(() => {
    if (calculatedTasks.length === 0) {
      return { totalDays: 180, startDate: new Date(), endDate: new Date(), columns: [] };
    }

    const minStart = new Date(Math.min(...calculatedTasks.map(t => t.startDate.getTime())));
    const maxEnd = new Date(Math.max(...calculatedTasks.map(t => t.endDate.getTime())));

    maxEnd.setDate(maxEnd.getDate() + 15);

    const totalDays = Math.max(30, Math.ceil((maxEnd.getTime() - minStart.getTime()) / (1000 * 60 * 60 * 24)));

    const columns: Array<{ label: string; sublabel?: string; startDay: number; daySpan: number }> = [];

    if (viewMode === 'meses') {
      const curr = new Date(minStart);
      curr.setDate(1);
      while (curr <= maxEnd) {
        const monthLabel = curr.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase();
        const startDay = Math.max(0, Math.round((curr.getTime() - minStart.getTime()) / (1000 * 60 * 60 * 24)));

        const nextMonth = new Date(curr);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const daySpan = Math.round((nextMonth.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));

        columns.push({ label: monthLabel, startDay, daySpan });
        curr.setMonth(curr.getMonth() + 1);
      }
    } else if (viewMode === 'semanas') {
      const curr = new Date(minStart);
      let weekNum = 1;
      while (curr <= maxEnd) {
        const startDay = Math.max(0, Math.round((curr.getTime() - minStart.getTime()) / (1000 * 60 * 60 * 24)));
        const dateStr = curr.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        columns.push({ label: `Sem. ${weekNum}`, sublabel: dateStr, startDay, daySpan: 7 });
        curr.setDate(curr.getDate() + 7);
        weekNum++;
      }
    } else {
      const curr = new Date(minStart);
      const dayOfWeekInitials = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
      let dayCount = 0;
      while (curr <= maxEnd && dayCount < 120) {
        const startDay = Math.max(0, Math.round((curr.getTime() - minStart.getTime()) / (1000 * 60 * 60 * 24)));
        const dayLabel = curr.getDate().toString();
        const dayInitial = dayOfWeekInitials[curr.getDay()];
        const fullDate = curr.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
        columns.push({ label: dayLabel, sublabel: dayInitial, startDay, daySpan: 1, fullDate });
        curr.setDate(curr.getDate() + 1);
        dayCount++;
      }
    }

    return { totalDays, startDate: minStart, endDate: maxEnd, columns };
  }, [calculatedTasks, viewMode]);

  // --------------------------------------------------------------------------
  // CÁLCULO DOS HISTOGRAMAS COM ALGORITMO DE PERFIS DE DISTRIBUIÇÃO TEMPORAL
  // --------------------------------------------------------------------------
  const histogramData = useMemo(() => {
    if (calculatedTasks.length === 0 || timelineInfo.columns.length === 0) return [];

    const { startDate, endDate } = timelineInfo;
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const dailyMO = new Array(totalDays).fill(0);
    const dailyMat = new Array(totalDays).fill(0);

    const distributeValueByProfile = (
      val: number, 
      profile: DistributionProfile, 
      startOffset: number, 
      duration: number,
      targetArray: number[]
    ) => {
      if (val <= 0 || duration <= 0) return;

      const dur = Math.max(1, Math.round(duration));

      if (profile === 'pontual') {
        if (startOffset >= 0 && startOffset < totalDays) {
          targetArray[startOffset] += val;
        }
      } else if (profile === 'concentrado_inicio') {
        const half = Math.max(1, Math.ceil(dur / 2));
        const rest = Math.max(1, dur - half);

        const valFirstHalf = (val * 0.70) / half;
        const valSecondHalf = (val * 0.30) / rest;

        for (let d = 0; d < dur; d++) {
          const idx = startOffset + d;
          if (idx >= 0 && idx < totalDays) {
            if (d < half) targetArray[idx] += valFirstHalf;
            else targetArray[idx] += valSecondHalf;
          }
        }
      } else if (profile === 'concentrado_fim') {
        const half = Math.max(1, Math.ceil(dur / 2));
        const rest = Math.max(1, dur - half);

        const valFirstHalf = (val * 0.30) / half;
        const valSecondHalf = (val * 0.70) / rest;

        for (let d = 0; d < dur; d++) {
          const idx = startOffset + d;
          if (idx >= 0 && idx < totalDays) {
            if (d < half) targetArray[idx] += valFirstHalf;
            else targetArray[idx] += valSecondHalf;
          }
        }
      } else {
        const valPerDay = val / dur;
        for (let d = 0; d < dur; d++) {
          const idx = startOffset + d;
          if (idx >= 0 && idx < totalDays) {
            targetArray[idx] += valPerDay;
          }
        }
      }
    };

    calculatedTasks.forEach(t => {
      if (t.isSection) return;

      const startOffset = t.startOffsetDays;
      const dur = Math.max(1, t.duracaoDias);

      if (t.childInsumosList && t.childInsumosList.length > 0) {
        t.childInsumosList.forEach(insumo => {
          const cls = getCategoryProfile(insumo);
          const insumoProfile = customProfilesMap[insumo.id] || cls.profile;

          const moVal = insumo.total_mo || ((insumo.valor_unitario_mo || 0) * (insumo.quantidade || 0));
          const matVal = insumo.total_mat || ((insumo.valor_unitario_mat || 0) * (insumo.quantidade || 0));
          const totVal = insumo.total || (moVal + matVal);

          if (moVal > 0) {
            distributeValueByProfile(moVal, 'uniforme', startOffset, dur, dailyMO);
          }

          if (matVal > 0 || (totVal > moVal)) {
            const effectiveMat = matVal > 0 ? matVal : (totVal - moVal);
            distributeValueByProfile(effectiveMat, insumoProfile, startOffset, dur, dailyMat);
          }
        });
      } else {
        const taskProfile = t.defaultProfile || 'concentrado_inicio';
        distributeValueByProfile(t.moTotal, 'uniforme', startOffset, dur, dailyMO);
        distributeValueByProfile(t.matTotal, taskProfile, startOffset, dur, dailyMat);
      }
    });

    let runningAccumulatedTotal = 0;
    const totalOrcamentoGeral = calculatedTasks
      .filter(t => !t.isSection)
      .reduce((acc, t) => acc + t.totalGeral, 0);

    return timelineInfo.columns.map((col) => {
      let periodMO = 0;
      let periodMat = 0;

      const startIdx = col.startDay;
      const endIdx = Math.min(totalDays, col.startDay + col.daySpan);

      for (let i = startIdx; i < endIdx; i++) {
        periodMO += dailyMO[i] || 0;
        periodMat += dailyMat[i] || 0;
      }

      const periodTotal = periodMO + periodMat;
      runningAccumulatedTotal += periodTotal;

      const percentAcumulado = totalOrcamentoGeral > 0 
        ? Math.min(100, parseFloat(((runningAccumulatedTotal / totalOrcamentoGeral) * 100).toFixed(1)))
        : 0;

      return {
        periodo: col.label,
        sublabel: col.sublabel || '',
        mo: Math.round(periodMO),
        materiais: Math.round(periodMat),
        totalPeriodo: Math.round(periodTotal),
        acumuladoR$: Math.round(runningAccumulatedTotal),
        percentAcumulado: percentAcumulado
      };
    });
  }, [calculatedTasks, timelineInfo, customProfilesMap]);

  // --------------------------------------------------------------------------
  // CÁLCULO DA TABELA DETALHADA DE RECURSOS (MATERIAIS E MÃO DE OBRA POR PERÍODO)
  // --------------------------------------------------------------------------
  const detailedResourceData = useMemo(() => {
    if (calculatedTasks.length === 0 || timelineInfo.columns.length === 0) {
      return { materiaisRows: [], moRows: [] };
    }

    const { startDate, endDate } = timelineInfo;
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const materiaisRows: Array<{
      id: string;
      eap: string;
      descricao: string;
      unidade: string;
      qtdTotal: number;
      valorTotal: number;
      perfil: DistributionProfile;
      periodValues: Array<{ qtd: number; val: number }>;
    }> = [];



    const getDailyDistribution = (
      totalVal: number,
      profile: DistributionProfile,
      startOffset: number,
      duration: number
    ) => {
      const daily = new Array(totalDays).fill(0);
      if (totalVal <= 0 || duration <= 0) return daily;

      const dur = Math.max(1, Math.round(duration));

      if (profile === 'pontual') {
        if (startOffset >= 0 && startOffset < totalDays) {
          daily[startOffset] += totalVal;
        }
      } else if (profile === 'concentrado_inicio') {
        const half = Math.max(1, Math.ceil(dur / 2));
        const rest = Math.max(1, dur - half);
        const valFirst = (totalVal * 0.70) / half;
        const valSecond = (totalVal * 0.30) / rest;
        for (let d = 0; d < dur; d++) {
          const idx = startOffset + d;
          if (idx >= 0 && idx < totalDays) {
            daily[idx] += (d < half ? valFirst : valSecond);
          }
        }
      } else if (profile === 'concentrado_fim') {
        const half = Math.max(1, Math.ceil(dur / 2));
        const rest = Math.max(1, dur - half);
        const valFirst = (totalVal * 0.30) / half;
        const valSecond = (totalVal * 0.70) / rest;
        for (let d = 0; d < dur; d++) {
          const idx = startOffset + d;
          if (idx >= 0 && idx < totalDays) {
            daily[idx] += (d < half ? valFirst : valSecond);
          }
        }
      } else {
        const valPerDay = totalVal / dur;
        for (let d = 0; d < dur; d++) {
          const idx = startOffset + d;
          if (idx >= 0 && idx < totalDays) {
            daily[idx] += valPerDay;
          }
        }
      }
      return daily;
    };



    const rawMoEntries: Array<{
      id: string;
      eap: string;
      descricao: string;
      unidade: string;
      qtdTotal: number;
      valorTotal: number;
      colaboradoresConfigured: number;
      startOffset: number;
      dur: number;
      dailyVal: number[];
    }> = [];

    // Carrega o mapeamento atualizado de jornadas da Distribuição de Equipe
    let currentJornadasMap: Record<string, string> = {};
    if (orcamentoId) {
      try {
        const saved = localStorage.getItem(`orcamento_equipe_${orcamentoId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          currentJornadasMap = parsed.jornadas || {};
        }
      } catch (e) {}
    }

    calculatedTasks.forEach(t => {
      if (t.isSection) return;

      const startOffset = t.startOffsetDays;
      const dur = Math.max(1, t.duracaoDias);
      const eap = t.item.item_eap || '-';

      // Verifica se a jornada foi configurada em Distribuição de Equipe para esta atividade
      const jornadaRaw = currentJornadasMap[t.item.id] || jornadasMap[t.item.id] || '';
      const jornadaNum = parseFloat(jornadaRaw);
      const hasValidJornada = !isNaN(jornadaNum) && jornadaNum > 0;

      if (t.childInsumosList && t.childInsumosList.length > 0) {
        t.childInsumosList.forEach(insumo => {
          const cls = getCategoryProfile(insumo);
          const profile = customProfilesMap[insumo.id] || cls.profile;

          const moVal = insumo.total_mo || ((insumo.valor_unitario_mo || 0) * (insumo.quantidade || 0));
          const matVal = insumo.total_mat || ((insumo.valor_unitario_mat || 0) * (insumo.quantidade || 0));
          const totVal = insumo.total || (moVal + matVal);
          const effectiveMat = matVal > 0 ? matVal : Math.max(0, totVal - moVal);

          // Linha de Material (Planilha Orçamentária)
          if (effectiveMat > 0) {
            let totalQtdMat = 0;
            const compQtd = t.item.quantidade || 1;
            if ((insumo as any).displayQuantidade !== undefined && (insumo as any).displayQuantidade > 0) {
              totalQtdMat = (insumo as any).displayQuantidade;
            } else if ((insumo.valor_unitario_mat || 0) > 0 && effectiveMat > 0) {
              totalQtdMat = effectiveMat / insumo.valor_unitario_mat!;
            } else if ((insumo.valor_unitario || 0) > 0 && effectiveMat > 0) {
              totalQtdMat = effectiveMat / insumo.valor_unitario!;
            } else if (insumo.quantidade > 0) {
              totalQtdMat = (insumo.quantidade < 5 && compQtd > 1) ? insumo.quantidade * compQtd : insumo.quantidade;
            } else {
              totalQtdMat = insumo.quantidade || 1;
            }

            const dailyVal = getDailyDistribution(effectiveMat, profile, startOffset, dur);
            const periodValues = timelineInfo.columns.map(col => {
              let pVal = 0;
              const startIdx = col.startDay;
              const endIdx = Math.min(totalDays, col.startDay + col.daySpan);
              for (let i = startIdx; i < endIdx; i++) {
                pVal += dailyVal[i] || 0;
              }
              const pQtd = effectiveMat > 0 ? (pVal / effectiveMat) * totalQtdMat : 0;
              return { qtd: pQtd, val: pVal };
            });

            materiaisRows.push({
              id: insumo.id || `${t.item.id}_mat_${insumo.descricao}`,
              eap,
              descricao: insumo.descricao,
              unidade: insumo.unidade || 'un',
              qtdTotal: totalQtdMat,
              valorTotal: effectiveMat,
              perfil: profile,
              periodValues
            });
          }

          // Linha de Mão de Obra (Distribuição de Equipe)
          if (moVal > 0) {
            let totalHorasMO = 0;
            const compQtd = t.item.quantidade || 1;
            if ((insumo as any).displayQuantidade !== undefined && (insumo as any).displayQuantidade > 0) {
              totalHorasMO = (insumo as any).displayQuantidade;
            } else if ((insumo.valor_unitario_mo || 0) > 0 && moVal > 0) {
              totalHorasMO = moVal / insumo.valor_unitario_mo;
            } else if (insumo.quantidade > 0) {
              totalHorasMO = insumo.quantidade < 5 && compQtd > 1 ? insumo.quantidade * compQtd : insumo.quantidade;
            }

            let numColaboradores = 0;
            if (hasValidJornada && dur > 0 && totalHorasMO > 0) {
              const horasDisponiveis = dur * jornadaNum;
              if (horasDisponiveis > 0) {
                const exatos = totalHorasMO / horasDisponiveis;
                numColaboradores = Math.max(1, Math.ceil(exatos));
              }
            }

            const dailyVal = getDailyDistribution(moVal, 'uniforme', startOffset, dur);

            rawMoEntries.push({
              id: insumo.id || `${t.item.id}_mo_${insumo.descricao}`,
              eap,
              descricao: insumo.descricao,
              unidade: 'PESSOAS',
              qtdTotal: totalHorasMO,
              valorTotal: moVal,
              colaboradoresConfigured: numColaboradores,
              startOffset,
              dur,
              dailyVal
            });
          }
        });
      } else {
        // Tarefa Folha sem Insumos Individuais desmembrados
        if (t.matTotal > 0) {
          const profile = t.defaultProfile || 'concentrado_inicio';
          let totalQtdMat = (t.item as any).displayQuantidade || t.item.quantidade || 1;
          if ((t.item.valor_unitario_mat || 0) > 0) {
            totalQtdMat = t.matTotal / t.item.valor_unitario_mat!;
          }

          const dailyVal = getDailyDistribution(t.matTotal, profile, startOffset, dur);
          const periodValues = timelineInfo.columns.map(col => {
            let pVal = 0;
            const startIdx = col.startDay;
            const endIdx = Math.min(totalDays, col.startDay + col.daySpan);
            for (let i = startIdx; i < endIdx; i++) {
              pVal += dailyVal[i] || 0;
            }
            const pQtd = t.matTotal > 0 ? (pVal / t.matTotal) * totalQtdMat : 0;
            return { qtd: pQtd, val: pVal };
          });

          materiaisRows.push({
            id: `${t.item.id}_mat`,
            eap,
            descricao: `Material: ${t.item.descricao}`,
            unidade: t.item.unidade || 'vb',
            qtdTotal: totalQtdMat,
            valorTotal: t.matTotal,
            perfil: profile,
            periodValues
          });
        }

        if (t.moTotal > 0) {
          let totalHorasMO = (t.item as any).displayQuantidade || ((t.item.valor_unitario_mo || 0) > 0 ? t.moTotal / t.item.valor_unitario_mo : t.item.quantidade || 1);
          
          let numColaboradores = 0;
          if (hasValidJornada && dur > 0 && totalHorasMO > 0) {
            const horasDisponiveis = dur * jornadaNum;
            if (horasDisponiveis > 0) {
              const exatos = totalHorasMO / horasDisponiveis;
              numColaboradores = Math.max(1, Math.ceil(exatos));
            }
          }

          const dailyVal = getDailyDistribution(t.moTotal, 'uniforme', startOffset, dur);

          rawMoEntries.push({
            id: `${t.item.id}_mo`,
            eap,
            descricao: `Mão de Obra: ${t.item.descricao}`,
            unidade: 'PESSOAS',
            qtdTotal: totalHorasMO,
            valorTotal: t.moTotal,
            colaboradoresConfigured: numColaboradores,
            startOffset,
            dur,
            dailyVal
          });
        }
      }
    });

    // ------------------------------------------------------------------------
    // CONSOLIDAÇÃO DA MÃO DE OBRA COM CÁLCULO DE PICO DIÁRIO POR PERÍODO
    // ------------------------------------------------------------------------
    type ConsolidatedMoRow = {
      id: string;
      eap: string;
      descricao: string;
      unidade: string;
      qtdTotal: number;
      valorTotal: number;
      periodValues: Array<{ qtd: number; val: number; colaboradores: number }>;
    };

    const moGroupsMap = new Map<string, Array<typeof rawMoEntries[0]>>();

    rawMoEntries.forEach(entry => {
      const cleanDesc = entry.descricao.trim();
      const cleanUni = (entry.unidade || '').trim().toUpperCase();
      const key = `${cleanDesc.toUpperCase()}_${cleanUni}`;

      if (!moGroupsMap.has(key)) {
        moGroupsMap.set(key, []);
      }
      moGroupsMap.get(key)!.push(entry);
    });

    const moRows: ConsolidatedMoRow[] = [];

    moGroupsMap.forEach((entries, _key) => {
      const first = entries[0];
      const eapsSet = new Set<string>();
      let sumQtdTotal = 0;
      let sumValorTotal = 0;

      const dailyWorkers = new Array(totalDays).fill(0);
      const dailyCost = new Array(totalDays).fill(0);

      entries.forEach(entry => {
        if (entry.eap && entry.eap !== '-') eapsSet.add(entry.eap);
        sumQtdTotal += entry.qtdTotal;
        sumValorTotal += entry.valorTotal;

        const start = entry.startOffset;
        const end = Math.min(totalDays, entry.startOffset + entry.dur);

        for (let d = start; d < end; d++) {
          if (d >= 0 && d < totalDays) {
            dailyWorkers[d] += entry.colaboradoresConfigured;
            dailyCost[d] += (entry.dailyVal[d] || 0);
          }
        }
      });

      const periodValues = timelineInfo.columns.map(col => {
        const startIdx = Math.max(0, col.startDay);
        const endIdx = Math.min(totalDays, col.startDay + col.daySpan);

        let pVal = 0;
        let peakWorkersInPeriod = 0;

        for (let i = startIdx; i < endIdx; i++) {
          pVal += dailyCost[i] || 0;
          if (dailyWorkers[i] > peakWorkersInPeriod) {
            peakWorkersInPeriod = dailyWorkers[i];
          }
        }

        const pQtd = sumValorTotal > 0 ? (pVal / sumValorTotal) * sumQtdTotal : 0;
        return { qtd: pQtd, val: pVal, colaboradores: peakWorkersInPeriod };
      });

      const eapList = Array.from(eapsSet);
      const formattedEap = eapList.length > 3 
        ? `${eapList.length} itens` 
        : eapList.length > 0 
        ? eapList.join(', ') 
        : '-';

      moRows.push({
        id: first.id,
        eap: formattedEap,
        descricao: first.descricao,
        unidade: 'PESSOAS',
        qtdTotal: sumQtdTotal,
        valorTotal: sumValorTotal,
        periodValues
      });
    });

    moRows.sort((a, b) => b.valorTotal - a.valorTotal);

    // Consolidação padrão para Materiais
    const consolidateMateriais = (rawRows: typeof materiaisRows) => {
      const map = new Map<string, typeof materiaisRows[0] & { eapsSet: Set<string> }>();

      rawRows.forEach(row => {
        const cleanDesc = row.descricao.trim();
        const cleanUni = (row.unidade || '').trim().toUpperCase();
        const key = `${cleanDesc.toUpperCase()}_${cleanUni}`;

        if (!map.has(key)) {
          map.set(key, {
            ...row,
            eapsSet: new Set(row.eap && row.eap !== '-' ? [row.eap] : []),
            descricao: cleanDesc,
            unidade: row.unidade || '',
            periodValues: row.periodValues.map(p => ({ ...p }))
          });
        } else {
          const existing = map.get(key)!;
          if (row.eap && row.eap !== '-') {
            existing.eapsSet.add(row.eap);
          }
          existing.qtdTotal += row.qtdTotal;
          existing.valorTotal += row.valorTotal;

          row.periodValues.forEach((p, idx) => {
            if (existing.periodValues[idx]) {
              existing.periodValues[idx].qtd += p.qtd;
              existing.periodValues[idx].val += p.val;
            }
          });
        }
      });

      return Array.from(map.values())
        .map(item => {
          const eapList = Array.from(item.eapsSet || []);
          const formattedEap = eapList.length > 3 
            ? `${eapList.length} itens` 
            : eapList.length > 0 
            ? eapList.join(', ') 
            : '-';
          return {
            ...item,
            eap: formattedEap
          };
        })
        .sort((a, b) => b.valorTotal - a.valorTotal);
    };

    const consolidatedMateriais = consolidateMateriais(materiaisRows);

    return { materiaisRows: consolidatedMateriais, moRows };
  }, [calculatedTasks, timelineInfo, customProfilesMap, jornadasMap]);

  // Itens visíveis (respeitando seções recolhidas)
  const visibleTasks = useMemo(() => {
    const list: typeof calculatedTasks = [];
    const hiddenPrefixes: string[] = [];

    calculatedTasks.forEach(t => {
      const eap = t.item.item_eap || '';
      const isHidden = hiddenPrefixes.some(pref => eap.startsWith(pref + '.'));
      if (isHidden) return;

      list.push(t);

      if (t.isSection && collapsedSections.has(eap)) {
        hiddenPrefixes.push(eap);
      }
    });

    return list;
  }, [calculatedTasks, collapsedSections]);

  // Links de Predecessoras (Setas SVG Finas MS Project conectando tarefas no Gantt)
  const dependencyLinks = useMemo(() => {
    if (visibleTasks.length === 0 || timelineInfo.totalDays <= 0) return [];

    const visibleIndexMap = new Map<string, number>();
    visibleTasks.forEach((t, idx) => {
      const eap = (t.item.item_eap || '').trim();
      if (eap) visibleIndexMap.set(eap, idx);
      if (t.item.id) visibleIndexMap.set(t.item.id.trim(), idx);
    });

    const links: Array<{ pathD: string; isLag: boolean; key: string }> = [];
    const totalDays = timelineInfo.totalDays;
    const ROW_HEIGHT = 40;

    visibleTasks.forEach((succTask, succIdx) => {
      if (succTask.isSection || succTask.isInherited || !succTask.predecessorasStr) return;

      const predEaps = succTask.predecessorasStr.split(/[,;]/).map(s => s.trim()).filter(Boolean);

      predEaps.forEach((predRaw) => {
        const match = predRaw.match(/^\s*([0-9\.]+)\s*(TI|FS|II|SS|TT|FF|IT|SF)?\s*([\+\-]\s*\d+(?:\s*d(?:ias?)?)?)?\s*/i);
        if (!match) return;

        const targetEap = match[1].trim();
        const relType = (match[2] || 'TI').toUpperCase();
        const hasLag = !!match[3];

        const predIdx = visibleIndexMap.get(targetEap);
        if (predIdx === undefined || predIdx === succIdx) return;

        const predTask = visibleTasks[predIdx];
        if (!predTask || predTask.isInherited) return;

        // Não desenha conector entre uma seção resumo pai e seus próprios itens filhos internos
        const succEapClean = (succTask.item.item_eap || '').trim();
        const predEapClean = (predTask.item.item_eap || '').trim();
        if (predTask.isSection && succEapClean.startsWith(predEapClean + '.')) return;
        if (succTask.isSection && predEapClean.startsWith(succEapClean + '.')) return;

        const y1 = predIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
        const y2 = succIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

        // Mapeamento preciso do eixo X (com offset de 4px referente ao padding px-1 da célula do Gantt)
        const predStart_x = 4 + (predTask.startOffsetDays / totalDays) * 992;
        const predWidth_x = Math.max(15, (predTask.duracaoDias / totalDays) * 992);
        
        const succStart_x = 4 + (succTask.startOffsetDays / totalDays) * 992;
        const succWidth_x = Math.max(15, (succTask.duracaoDias / totalDays) * 992);

        let x1 = 0;
        let x2 = 0;

        if (relType === 'II' || relType === 'SS') {
          x1 = predStart_x;
          x2 = succStart_x;
        } else if (relType === 'TT' || relType === 'FF') {
          x1 = predStart_x + predWidth_x;
          x2 = succStart_x + succWidth_x;
        } else {
          // TI (FS) ou IT (SF) - Saída do fim exato da predecessora, entrada no início exato da sucessora
          x1 = predStart_x + predWidth_x;
          x2 = succStart_x;
        }

        // Roteamento padrão MS Project: sai 6px à direita de max(x1, x2), desce até a linha alvo e entra à esquerda na sucessora
        const exitX = Math.min(996, Math.max(x1, x2) + 6);
        const pathD = `M ${x1} ${y1} H ${exitX} V ${y2} H ${x2}`;

        links.push({
          pathD,
          isLag: hasLag,
          key: `${predTask.item.id || targetEap}->${succTask.item.id}`
        });
      });
    });

    return links;
  }, [visibleTasks, timelineInfo.totalDays]);

  const totalMOFormatted = useMemo(() => {
    const sum = calculatedTasks.filter(t => !t.isSection).reduce((a, b) => a + b.moTotal, 0);
    return sum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }, [calculatedTasks]);

  const totalMatFormatted = useMemo(() => {
    const sum = calculatedTasks.filter(t => !t.isSection).reduce((a, b) => a + b.matTotal, 0);
    return sum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }, [calculatedTasks]);

  const duracaoTotalDias = useMemo(() => {
    if (calculatedTasks.length === 0) return 0;
    const minStart = Math.min(...calculatedTasks.map(t => t.startDate.getTime()));
    const maxEnd = Math.max(...calculatedTasks.map(t => t.endDate.getTime()));
    return Math.round((maxEnd - minStart) / (1000 * 60 * 60 * 24));
  }, [calculatedTasks]);

  const getTaskColor = (level: number, isSection: boolean, isInherited: boolean, isCritical?: boolean) => {
    if (isSection) {
      if (level === 1) return 'bg-slate-800 border-slate-900 text-white font-bold';
      return 'bg-slate-700 border-slate-800 text-white font-semibold';
    }
    if (isCritical) {
      return 'bg-rose-600 border-rose-700 text-white shadow-xs font-bold ring-1 ring-rose-400';
    }
    if (isInherited) {
      return 'bg-slate-400/90 border-slate-500 text-white border-dashed';
    }
    return 'bg-slate-500 border-slate-600 text-white';
  };

  return (
    <div className="w-full flex flex-col space-y-6 pb-12">
      {/* ── BARRA SUPERIOR DE PARÂMETROS E RESUMO DO CRONOGRAMA ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-4 shadow-lg border border-slate-700/50 flex flex-wrap items-center justify-between gap-4">
        
        {/* Esquerda: Título & Início do Projeto */}
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-600/30 rounded-xl border border-blue-500/40 text-blue-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Cronograma Físico-Financeiro & Histogramas Inteligentes
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Relações MS Project (TI, II, TT, IT com folgas) & Perfis por Categoria
            </p>
          </div>
        </div>

        {/* Centro: Configurações de Data e Zoom */}
        <div className="flex items-center space-x-4 bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-300 font-medium">Início da Obra:</span>
            <input 
              type="date" 
              value={dataInicioObra}
              onChange={(e) => handleDataInicioChange(e.target.value)}
              style={{ colorScheme: 'light' }}
              className="bg-white border border-slate-300 text-slate-900 font-bold text-xs rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm cursor-pointer"
            />
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Botões de Zoom / Escala do Eixo X */}
          <div className="flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={() => setViewMode('meses')}
              className={`px-3 py-1 text-xs rounded-md font-semibold transition-all ${
                viewMode === 'meses' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Meses
            </button>
            <button
              onClick={() => setViewMode('semanas')}
              className={`px-3 py-1 text-xs rounded-md font-semibold transition-all ${
                viewMode === 'semanas' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semanas
            </button>
            <button
              onClick={() => setViewMode('dias')}
              className={`px-3 py-1 text-xs rounded-md font-semibold transition-all ${
                viewMode === 'dias' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dias
            </button>
          </div>
        </div>

        {/* Direita: Métricas Rápidas */}
        <div className="flex items-center space-x-6 text-right">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Duração Total</div>
            <div className="text-sm font-black text-amber-400 flex items-center justify-end gap-1">
              <Clock className="w-3.5 h-3.5" />
              {duracaoTotalDias} dias
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Total Mão de Obra</div>
            <div className="text-sm font-bold text-emerald-400">{totalMOFormatted}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Total Materiais</div>
            <div className="text-sm font-bold text-blue-400">{totalMatFormatted}</div>
          </div>
        </div>
      </div>

      {/* ── PAINEL PRINCIPAL: TABELA DE TAREFAS + LINHA DE BALANÇO (SPLIT SCREEN) ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto min-h-[420px] max-h-[600px] overflow-y-auto">
          <div className="inline-block min-w-full align-middle">
            
            {/* CABEÇALHO UNIFICADO */}
            <div className="flex border-b border-slate-300 bg-slate-100 text-slate-700 sticky top-0 z-40 font-bold text-xs select-none shadow-xs">
              
              {/* Colunas da Tabela (Fixo à esquerda com largura ajustável) */}
              <div 
                style={{ width: `${tablePanelWidth}px`, minWidth: `${tablePanelWidth}px`, maxWidth: `${tablePanelWidth}px` }}
                className="shrink-0 flex items-center border-r border-slate-300 relative bg-slate-100 py-2.5 px-1 font-bold text-xs"
              >
                <div className="w-[60px] shrink-0 text-center text-slate-800">ITEM</div>
                
                {/* Coluna Descrição da Etapa com Resizer Handle */}
                <div 
                  style={{ width: `${descricaoWidth}px`, minWidth: `${descricaoWidth}px`, maxWidth: `${descricaoWidth}px` }}
                  className="shrink-0 px-2 text-slate-800 relative flex items-center justify-between group"
                >
                  <span className="truncate">DESCRIÇÃO DA ETAPA</span>
                  {/* Resizer Handle da Coluna Descrição */}
                  <div 
                    onMouseDown={startResizingDesc}
                    className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500/50 flex items-center justify-center transition-colors z-50"
                    title="Arraste para redimensionar a largura da coluna de descrição"
                  >
                    <div className="w-0.5 h-4 bg-slate-400 group-hover:bg-blue-600 rounded-full" />
                  </div>
                </div>

                <div className="w-[100px] shrink-0 text-center text-slate-800">ATIVIDADE</div>
                <div className="w-[60px] shrink-0 text-center text-slate-800">DUR.(DIAS)</div>
                <div className="w-[110px] shrink-0 text-center text-slate-800">PREDECESSORAS</div>
                <div className="w-[140px] shrink-0 text-center text-slate-800 flex items-center justify-center gap-1">
                  <span>PERFIL</span>
                  <span className="text-blue-500 cursor-help" title="Perfil de distribuição temporal dos custos e materiais ao longo da duração da tarefa">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                </div>

                {/* Divisor Principal (Splitter) entre a Tabela e o Gráfico Gantt */}
                <div 
                  onMouseDown={startResizingPanel}
                  className={`absolute right-0 top-0 bottom-0 w-3 -mr-1.5 cursor-col-resize hover:bg-blue-600/40 z-50 flex items-center justify-center transition-colors group ${isResizingPanel ? 'bg-blue-600/50' : ''}`}
                  title="Arraste para redimensionar a largura da tabela vs gráfico Gantt"
                >
                  <div className="w-1 h-6 bg-slate-400 group-hover:bg-blue-600 rounded-full shadow-xs" />
                </div>
              </div>

              {/* Colunas do Eixo X (Gantt / Linha de Balanço à direita com fundo 100% opaco e z-40 para congelar no topo) */}
              <div className="flex-1 flex overflow-hidden bg-slate-100 z-40 border-l border-slate-300 shadow-2xs relative">
                {timelineInfo.columns.map((col: any, idx) => (
                  <div 
                    key={idx} 
                    title={col.fullDate || col.label}
                    className={`flex-1 ${viewMode === 'dias' ? 'min-w-[36px]' : 'min-w-[70px]'} text-center border-r border-slate-200 py-2 bg-slate-100 text-[11px]`}
                  >
                    <span className="font-extrabold text-slate-800">{col.label}</span>
                    {col.sublabel && (
                      <span className="block text-[9px] text-slate-600 font-bold">{col.sublabel}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* LINHAS DAS TAREFAS (SEÇÕES, COMPOSIÇÕES E SUBCOMPOSIÇÕES) */}
            <div className="bg-white relative">
              {/* OVERLAY SVG DE DEPENDÊNCIAS / PREDECESSORAS (SETAS FINAS MS PROJECT) */}
              {dependencyLinks.length > 0 && (
                <svg 
                  className="absolute top-0 bottom-0 right-0 pointer-events-none z-30" 
                  style={{ left: `${tablePanelWidth}px`, width: `calc(100% - ${tablePanelWidth}px)`, height: `${visibleTasks.length * 40}px` }}
                  viewBox={`0 0 1000 ${visibleTasks.length * 40}`}
                  preserveAspectRatio="none"
                >
                  <defs>
                    <marker
                      id="gantt-arrow"
                      viewBox="0 0 6 6"
                      refX="6"
                      refY="3"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto"
                    >
                      <path d="M 0 0 L 6 3 L 0 6 z" fill="#2563eb" />
                    </marker>
                  </defs>
                  {dependencyLinks.map((link) => (
                    <path
                      key={link.key}
                      d={link.pathD}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="1.2"
                      vectorEffect="non-scaling-stroke"
                      strokeDasharray={link.isLag ? "4,3" : undefined}
                      markerEnd="url(#gantt-arrow)"
                      className="opacity-80"
                    />
                  ))}
                </svg>
              )}

              {visibleTasks.map((t) => {
                const isSec = t.isSection;
                const eap = t.item.item_eap || t.item.id;
                const isCollapsed = collapsedSections.has(eap);
                const isInherited = t.isInherited;

                return (
                  <div 
                    key={t.item.id || eap}
                    className={`flex items-center h-10 hover:bg-slate-50/90 transition-colors text-xs ${
                      isSec ? 'bg-slate-100/70 font-bold' : isInherited ? 'bg-indigo-50/40' : 'bg-white'
                    }`}
                  >
                    {/* Tabela Esquerda (Inputs & Informações) */}
                    <div 
                      style={{ width: `${tablePanelWidth}px`, minWidth: `${tablePanelWidth}px`, maxWidth: `${tablePanelWidth}px` }}
                      className="shrink-0 relative z-10 border-r border-slate-300 border-b border-slate-200 overflow-hidden h-full flex items-center"
                    >
                      <div 
                        style={{ minWidth: `${descricaoWidth + 470}px` }}
                        className="flex items-center h-full w-full px-1 text-xs"
                      >
                        {/* Código EAP - Centralizado ao Meio */}
                        <div className="w-[60px] shrink-0 flex items-center justify-center gap-1 font-semibold text-slate-800 text-center truncate">
                          {isSec && (
                            <button 
                              onClick={() => toggleSection(eap)}
                              className="text-slate-500 hover:text-slate-800 p-0.5"
                            >
                              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          <span>{t.item.item_eap || '-'}</span>
                        </div>

                        {/* Descrição da Etapa (com tamanho de fonte reduzido e limite de 2 linhas) */}
                        <div 
                          style={{ width: `${descricaoWidth}px`, minWidth: `${descricaoWidth}px`, maxWidth: `${descricaoWidth}px`, paddingLeft: `${(t.level - 1) * 8 + 4}px` }}
                          className="shrink-0 text-slate-800 font-medium text-[10px] leading-tight line-clamp-2 pr-2 py-0.5"
                        >
                          <span title={t.item.descricao}>{t.item.descricao}</span>
                        </div>

                        {/* ATIVIDADE (Check = Atividade Independente / Uncheck = Herda Pai) */}
                        <div className="w-[100px] shrink-0 px-1 flex items-center justify-center">
                          {isSec ? (
                            <span className="text-slate-400 font-medium text-[11px]">—</span>
                          ) : (
                            <input
                              type="checkbox"
                              checked={!isInherited}
                              onChange={(e) => handleToggleNonActivity(t.item.id, eap, !e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shadow-2xs"
                              title={!isInherited ? "Atividade marcada (clique para desmarcar e herdar prazos do pai)" : "Herda pai desmarcado (clique para marcar como atividade)"}
                            />
                          )}
                        </div>

                        {/* Input Duração (Dias) */}
                        <div className="w-[60px] shrink-0 px-1 text-center">
                          {isSec ? (
                            <span className="text-slate-600 font-bold text-[11px]">{t.duracaoDias}d</span>
                          ) : isInherited ? (
                            <span className="text-indigo-700 font-bold text-[10px] flex items-center justify-center gap-0.5" title="Duração herdada automaticamente da atividade mãe">
                              <Link2 className="w-3 h-3 text-indigo-500" />
                              {t.duracaoDias}d
                            </span>
                          ) : (
                            <input 
                              type="number"
                              min="1"
                              value={duracoesMap[t.item.id] || duracoesMap[eap] || ''}
                              placeholder={`${t.duracaoDias}`}
                              onChange={(e) => handleDurationChange(t.item.id, eap, e.target.value)}
                              className="w-full text-center bg-blue-50/50 border border-blue-200 focus:border-blue-500 text-slate-900 rounded py-0.5 px-1 font-bold text-xs"
                              title="Altera a duração desta composição no Cronograma e na Distribuição de Equipes (se houver M.O.)"
                            />
                          )}
                        </div>

                        {/* Input Predecessoras - Suporta TI, II, TT, IT e Lags +dias / -dias */}
                        <div className="w-[110px] shrink-0 px-1 text-center">
                          {isSec || isInherited ? (
                            <span className="text-slate-400 text-[10px]" title={isInherited ? "Predecessora desativada para tarefas herdadas da mãe" : ""}>-</span>
                          ) : (
                            <PredecessorInputCell
                              taskId={t.item.id}
                              eap={eap}
                              value={predecessorasMap[t.item.id] || predecessorasMap[eap] || ''}
                              onChange={(val) => handlePredecessorasChange(t.item.id, eap, val)}
                              onCommit={(val) => handleValidateAndCommitPredecessor(t.item.id, eap, val)}
                              onKeyDown={handlePredecessorKeyDown}
                            />
                          )}
                        </div>

                        {/* Seletor de Perfil de Distribuição */}
                        <div className="w-[140px] shrink-0 px-1 text-center">
                          {isSec ? (
                            <span className="text-slate-400 text-[10px]">-</span>
                          ) : (
                            <select
                              value={t.defaultProfile}
                              onChange={(e) => handleCustomProfileChange(t.item.id, e.target.value as DistributionProfile)}
                              className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-[10.5px] rounded px-1.5 py-0.5 font-medium focus:ring-1 focus:ring-blue-500 cursor-pointer"
                              title={
                                t.defaultProfile === 'uniforme' ? 'Uniforme: Custos alocados de forma linear e constante em todos os dias' :
                                t.defaultProfile === 'concentrado_inicio' ? 'Conc. Início: 70% dos custos alocados na 1ª metade (materiais)' :
                                t.defaultProfile === 'concentrado_fim' ? 'Conc. Fim: 70% dos custos alocados na 2ª metade (entregas/subempreiteiros)' :
                                'Pontual: 100% dos custos alocados no 1º dia (taxas, verbas, mobilização)'
                              }
                            >
                              <option value="uniforme" title="Uniforme: Distribuição constante e linear ao longo dos dias (ex: mão de obra, aluguel)">Uniforme</option>
                              <option value="concentrado_inicio" title="Conc. Início: 70% dos custos alocados na primeira metade (ex: compra de materiais)">Conc. Início</option>
                              <option value="concentrado_fim" title="Conc. Fim: 70% dos custos alocados na segunda metade (ex: pagamentos de conclusão)">Conc. Fim</option>
                              <option value="pontual" title="Pontual: 100% dos custos alocados no 1º dia (ex: taxas, verbas de mobilização)">Pontual (Dia 1)</option>
                            </select>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Gráfico da Linha de Balanço / Gantt (Direita com fundo 100% opaco e z-10) */}
                    <div className={`flex-1 relative h-10 flex items-center px-1 overflow-hidden z-10 border-l border-slate-300 border-b border-slate-200 ${isSec ? 'bg-slate-100/80' : isInherited ? 'bg-indigo-50/30' : 'bg-white'}`}>
                      {/* Grid de fundo para os meses/semanas */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {timelineInfo.columns.map((_, idx) => (
                          <div key={idx} className="flex-1 border-r border-slate-200/60 h-full" />
                        ))}
                      </div>

                      {/* Barra Visual da Atividade */}
                      {timelineInfo.totalDays > 0 && (
                        isSec ? (
                          /* BARRA DE RESUMO ESTILO MS PROJECT (Linha fina preta com setas para baixo nas pontas) */
                          <div 
                            className="relative h-6 flex items-center shadow-xs transition-all group"
                            style={{
                              marginLeft: `${Math.max(0, (t.startOffsetDays / timelineInfo.totalDays) * 100)}%`,
                              width: `${Math.max(1.5, (t.duracaoDias / timelineInfo.totalDays) * 100)}%`
                            }}
                            title={`${t.item.item_eap} - ${t.item.descricao} (Resumo)\nInício: ${t.startDate.toLocaleDateString('pt-BR')}\nTérmino: ${t.endDate.toLocaleDateString('pt-BR')}\nDuração: ${t.duracaoDias} dias`}
                          >
                            <div className="w-full h-[5px] bg-slate-900 rounded-xs relative flex items-center justify-between">
                              {/* Setinha apontando para baixo na ponta esquerda */}
                              <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent border-t-slate-900 absolute -left-0.5 top-full" />
                              
                              {/* Rótulo centralizado */}
                              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[9px] font-extrabold text-slate-900 bg-slate-100/90 px-1 rounded shadow-2xs whitespace-nowrap">
                                {t.duracaoDias}d
                              </span>

                              {/* Setinha apontando para baixo na ponta direita */}
                              <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent border-t-slate-900 absolute -right-0.5 top-full" />
                            </div>
                          </div>
                        ) : (
                          <div 
                            className={`relative h-6 rounded-md border flex items-center justify-between px-2 text-[10px] shadow-xs transition-all ${getTaskColor(t.level, isSec, isInherited, t.isCritical)}`}
                            style={{
                              marginLeft: `${Math.max(0, (t.startOffsetDays / timelineInfo.totalDays) * 100)}%`,
                              width: `${Math.max(1.5, (t.duracaoDias / timelineInfo.totalDays) * 100)}%`
                            }}
                            title={`${t.item.item_eap} - ${t.item.descricao}\n${t.isCritical ? '🔥 CAMINHO CRÍTICO (Impacta a data final do projeto)\n' : ''}${isInherited ? '🔗 Herdada do Pai\n' : ''}Início: ${t.startDate.toLocaleDateString('pt-BR')}\nTérmino: ${t.endDate.toLocaleDateString('pt-BR')}\nDuração: ${t.duracaoDias} dias\nPerfil: ${t.defaultProfile}\nM.O.: ${t.moTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\nMateriais: ${t.matTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                          >
                            <span className="truncate font-semibold drop-shadow-xs flex items-center gap-1">
                              {isInherited && <Link2 className="w-3 h-3 text-slate-200 shrink-0" />}
                              {t.duracaoDias}d
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── BANNER DE OBSERVAÇÕES & GUIA DOS PERFIS DE DISTRIBUIÇÃO ── */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 shadow-2xs text-xs text-slate-700 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200/70 pb-2.5">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Observações & Guia sobre Perfis de Distribuição Temporal</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Define a curva de desembolso financeiro e consumo de insumos</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col justify-between space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">
                Uniforme
              </span>
              <span className="text-[9.5px] font-semibold text-slate-400">Linear</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Distribui o valor de forma <strong>constante e igual</strong> em cada dia da duração da tarefa.
            </p>
            <div className="text-[10px] text-slate-500 font-medium bg-slate-50 p-1.5 rounded-md border border-slate-100">
              <strong>Uso ideal:</strong> Mão de obra, aluguel de equipamentos e custos administrativos.
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col justify-between space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                Conc. Início
              </span>
              <span className="text-[9.5px] font-semibold text-slate-400">70% na 1ª metade</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Aloca <strong>70% do custo na primeira metade</strong> e 30% no restante da duração.
            </p>
            <div className="text-[10px] text-slate-500 font-medium bg-slate-50 p-1.5 rounded-md border border-slate-100">
              <strong>Uso ideal:</strong> Compra e entrega inicial de materiais no canteiro e fretes.
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col justify-between space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[11px] border border-purple-200">
                Conc. Fim
              </span>
              <span className="text-[9.5px] font-semibold text-slate-400">70% na 2ª metade</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Aloca <strong>30% no início e 70% dos custos na segunda metade</strong> da duração.
            </p>
            <div className="text-[10px] text-slate-500 font-medium bg-slate-50 p-1.5 rounded-md border border-slate-100">
              <strong>Uso ideal:</strong> Serviços de acabamento, medições finais e terceirizados.
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col justify-between space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200">
                Pontual (Dia 1)
              </span>
              <span className="text-[9.5px] font-semibold text-slate-400">100% no dia 1</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Concentra <strong>100% do custo no 1º dia</strong> do início da atividade.
            </p>
            <div className="text-[10px] text-slate-500 font-medium bg-slate-50 p-1.5 rounded-md border border-slate-100">
              <strong>Uso ideal:</strong> Taxas, licenças, verbas de mobilização e projetos.
            </div>
          </div>
        </div>
      </div>

      {/* ── PAINEL DE HISTOGRAMAS E CURVA S ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col space-y-4">
        
        {/* Seletor de Histograma */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h4 className="text-sm font-bold text-slate-800">
              Histogramas de Recursos & Planejamento Financeiro
            </h4>
          </div>

          {/* Abas dos Histogramas */}
          <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setHistogramTab('mao_de_obra')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                histogramTab === 'mao_de_obra' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <HardHat className="w-3.5 h-3.5" />
              Histograma Mão de Obra
            </button>

            <button
              onClick={() => setHistogramTab('materiais')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                histogramTab === 'materiais' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Histograma Materiais & Suprimentos
            </button>

            <button
              onClick={() => setHistogramTab('curva_s')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                histogramTab === 'curva_s' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Curva S Físico-Financeira
            </button>
          </div>
        </div>

        {/* ÁREA DO GRÁFICO RECHARTS */}
        <div className="h-[280px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {histogramTab === 'mao_de_obra' ? (
              <BarChart data={histogramData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="periodo" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(val: any) => [`R$ ${Number(val).toLocaleString('pt-BR')}`, 'Mão de Obra (Perfil Uniforme)']}
                  labelFormatter={(lbl) => `Período: ${lbl}`}
                  contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '12px', border: 'none' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="mo" name="Mão de Obra (R$)" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            ) : histogramTab === 'materiais' ? (
              <BarChart data={histogramData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="periodo" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(val: any) => [`R$ ${Number(val).toLocaleString('pt-BR')}`, 'Materiais & Suprimentos']}
                  labelFormatter={(lbl) => `Período: ${lbl}`}
                  contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '12px', border: 'none' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="materiais" name="Materiais (R$)" fill="#2563EB" radius={[6, 6, 0, 0]} />
              </BarChart>
            ) : (
              <AreaChart data={histogramData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCurvaS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="periodo" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis 
                  yAxisId="left"
                  stroke="#6366F1" 
                  fontSize={11} 
                  tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} 
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="#F59E0B" 
                  fontSize={11} 
                  unit="%" 
                  domain={[0, 100]}
                />
                <Tooltip 
                  formatter={(val: any, name: any) => [
                    name === 'percentAcumulado' ? `${val}%` : `R$ ${Number(val).toLocaleString('pt-BR')}`,
                    name === 'acumuladoR$' ? 'Acumulado R$' : '% Avanço Físico'
                  ]}
                  contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '12px', border: 'none' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="acumuladoR$" 
                  name="Desembolso Acumulado (R$)" 
                  stroke="#6366F1" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorCurvaS)" 
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="percentAcumulado" 
                  name="% Avanço Planejado Acumulado" 
                  stroke="#F59E0B" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#F59E0B' }}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* ── TABELA DETALHADA DE RECURSOS E ALOCAÇÃO POR PERÍODO ── */}
        <div className="mt-4 border-t border-slate-200 pt-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-4.5 h-4.5 text-blue-600" />
              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {histogramTab === 'materiais' 
                  ? 'Tabela Detalhada de Suprimentos & Materiais por Período (Planilha Orçamentária)' 
                  : histogramTab === 'mao_de_obra'
                  ? 'Tabela Detalhada de Mão de Obra por Período (Distribuição de Equipe)'
                  : 'Tabela de Desembolso Físico-Financeiro Acumulado (Curva S)'}
              </h5>
            </div>

            {histogramTab !== 'curva_s' && (
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Buscar recurso/material..."
                  value={resourceSearch}
                  onChange={(e) => setResourceSearch(e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg pl-8 pr-3 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none w-64 shadow-2xs"
                />
                <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[380px] overflow-y-auto shadow-2xs">
            <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 select-none">
                {histogramTab === 'curva_s' ? (
                  <tr>
                    <th className="py-2.5 px-3">PERÍODO</th>
                    <th className="py-2.5 px-3 text-right">MÃO DE OBRA (R$)</th>
                    <th className="py-2.5 px-3 text-right">MATERIAIS (R$)</th>
                    <th className="py-2.5 px-3 text-right">TOTAL PERÍODO (R$)</th>
                    <th className="py-2.5 px-3 text-right">ACUMULADO (R$)</th>
                    <th className="py-2.5 px-3 text-right">% AVANÇO FÍSICO</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="py-2.5 px-3 min-w-[90px]">EAP / ORIGEM</th>
                    <th className="py-2.5 px-3 min-w-[220px]">RECURSO / MATERIAL</th>
                    <th className="py-2.5 px-3 text-center min-w-[60px]">UNID.</th>
                    <th className="py-2.5 px-3 text-right min-w-[90px]">QTD. TOTAL</th>
                    <th className="py-2.5 px-3 text-right min-w-[110px]">CUSTO TOTAL (R$)</th>
                    {timelineInfo.columns.map((col: any, idx: number) => (
                      <th key={idx} className="py-2.5 px-2 text-center min-w-[110px] border-l border-slate-200 bg-slate-100/90">
                        <span className="block font-extrabold text-slate-800">{col.label}</span>
                        {col.sublabel && <span className="block text-[9px] text-slate-500 font-normal">{col.sublabel}</span>}
                      </th>
                    ))}
                  </tr>
                )}
              </thead>

              <tbody className="divide-y divide-slate-200 bg-white">
                {histogramTab === 'curva_s' ? (
                  histogramData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 font-medium">
                      <td className="py-2 px-3 font-bold text-slate-800">{row.periodo}</td>
                      <td className="py-2 px-3 text-right text-emerald-700 font-semibold">R$ {row.mo.toLocaleString('pt-BR')}</td>
                      <td className="py-2 px-3 text-right text-blue-700 font-semibold">R$ {row.materiais.toLocaleString('pt-BR')}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">R$ {row.totalPeriodo.toLocaleString('pt-BR')}</td>
                      <td className="py-2 px-3 text-right font-bold text-indigo-700">R$ {row.acumuladoR$.toLocaleString('pt-BR')}</td>
                      <td className="py-2 px-3 text-right font-extrabold text-amber-600">{row.percentAcumulado}%</td>
                    </tr>
                  ))
                ) : (
                  (() => {
                    const rows = histogramTab === 'materiais' ? detailedResourceData.materiaisRows : detailedResourceData.moRows;
                    const filtered = rows.filter(r => 
                      r.descricao.toLowerCase().includes(resourceSearch.toLowerCase()) || 
                      r.eap.toLowerCase().includes(resourceSearch.toLowerCase())
                    );

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5 + timelineInfo.columns.length} className="py-8 text-center text-slate-400 italic">
                            Nenhum recurso encontrado para a busca especificada.
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <>
                        {filtered.map((row) => {
                          const isMo = histogramTab === 'mao_de_obra';
                          return (
                            <tr key={row.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-bold text-slate-700">{row.eap}</td>
                              <td className="py-2 px-3 font-medium text-slate-900 leading-tight">{row.descricao}</td>
                              <td className="py-2 px-3 text-center text-slate-500 font-semibold">{row.unidade}</td>
                              <td className="py-2 px-3 text-right font-bold text-slate-800">
                                {isMo 
                                  ? `${row.qtdTotal.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`
                                  : row.qtdTotal.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900">
                                R$ {row.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              {row.periodValues.map((p, pIdx) => (
                                <td key={pIdx} className="py-2 px-2 text-center border-l border-slate-100 font-medium text-[11px]">
                                  {p.val > 0 ? (
                                    <div className="flex flex-col items-center">
                                      {isMo ? (
                                        <span className="font-extrabold text-emerald-800 text-[11.5px]">
                                          {p.colaboradores && p.colaboradores > 0 ? `${p.colaboradores} ${p.colaboradores === 1 ? 'Pessoa' : 'Pessoas'}` : `${p.qtd.toFixed(1)} h`}
                                        </span>
                                      ) : (
                                        <span className="font-bold text-slate-900">
                                          {p.qtd.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {row.unidade}
                                        </span>
                                      )}
                                      <span className={`text-[10px] font-semibold ${isMo ? 'text-emerald-600' : 'text-blue-600'}`}>
                                        R$ {Math.round(p.val).toLocaleString('pt-BR')}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-300 text-[10px]">-</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          );
                        })}

                        {/* LINHA DE TOTAIS DA TABELA */}
                        <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                          <td colSpan={3} className="py-3 px-3 uppercase tracking-wider text-right">
                            {histogramTab === 'mao_de_obra' ? 'TOTAL EQUIPE DO PERÍODO:' : 'TOTAL GERAL DO PERÍODO:'}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-800">
                            {histogramTab === 'mao_de_obra'
                              ? `${filtered.reduce((acc, r) => acc + r.qtdTotal, 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`
                              : `${filtered.reduce((acc, r) => acc + r.qtdTotal, 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`}
                          </td>
                          <td className="py-3 px-3 text-right text-blue-800">
                            R$ {filtered.reduce((acc, r) => acc + r.valorTotal, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          {timelineInfo.columns.map((col: any, cIdx: number) => {
                            const totalPeriodVal = filtered.reduce((acc, r) => acc + (r.periodValues[cIdx]?.val || 0), 0);
                            const totalPeriodColab = filtered.reduce((acc, r) => acc + ((r.periodValues[cIdx] as any)?.colaboradores || 0), 0);

                            return (
                              <td key={cIdx} className="py-3 px-2 text-center border-l border-slate-300 text-slate-900 text-xs">
                                {totalPeriodVal > 0 ? (
                                  <div className="flex flex-col items-center">
                                    {histogramTab === 'mao_de_obra' && totalPeriodColab > 0 && (
                                      <span className="font-black text-emerald-800 text-[11px]">{totalPeriodColab} PESSOAS</span>
                                    )}
                                    <span className={`font-bold ${histogramTab === 'mao_de_obra' ? 'text-emerald-600 text-[10px]' : 'text-blue-900'}`}>
                                      R$ {Math.round(totalPeriodVal).toLocaleString('pt-BR')}
                                    </span>
                                  </div>
                                ) : (
                                  '-'
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      </>
                    );
                  })()
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
