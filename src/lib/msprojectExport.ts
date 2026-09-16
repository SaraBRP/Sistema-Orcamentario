/**
 * Helper para Exportação de Cronograma no formato MS Project XML (.xml / .mpp)
 * Compatível com todas as versões do Microsoft Project (2010, 2013, 2016, 2019, 2021, Office 365)
 */

function escapeXml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface ExportMsProjectOptions {
  orcamentoInfo?: any;
  itens: any[];
  duracoesMap?: Record<string, string>;
  jornadasMap?: Record<string, string>;
}

export function classifyInsumoForMsProject(insumo: any): { type: number; group: string; label: string } {
  const codUpper = (insumo.codigo || '').trim().toUpperCase();
  const descUpper = (insumo.descricao || '').trim().toUpperCase();
  const fonteUpper = (insumo.banco_fonte || '').trim().toUpperCase();
  const uniUpper = (insumo.unidade || '').trim().toUpperCase();
  const tipoUpper = (insumo.tipo || insumo.tipo_item || insumo.categoria || insumo.grupo || '').trim().toUpperCase();

  // 1. Mão de Obra -> Tipo 1 (Trabalho / Work no MS Project XML), Grupo: Mão de obra
  const isMO = tipoUpper.includes('MÃO DE OBRA') || tipoUpper.includes('MAO DE OBRA') || tipoUpper === 'MO' ||
               codUpper.startsWith('MO.') || codUpper.startsWith('MO') || 
               fonteUpper.includes('MO') || fonteUpper.includes('MÃO DE OBRA') ||
               descUpper.includes('SERVENTE') || descUpper.includes('PEDREIRO') || 
               descUpper.includes('CARPINTEIRO') || descUpper.includes('ARMADOR') ||
               descUpper.includes('OPERADOR') || descUpper.includes('OFICIAL') ||
               descUpper.includes('ENCARREGADO') || descUpper.includes('AJUDANTE') ||
               descUpper.includes('MONTADOR') || descUpper.includes('SOLDADOR') ||
               descUpper.includes('MÃO DE OBRA') || descUpper.includes('MAO DE OBRA');

  if (isMO) {
    return { type: 1, group: 'Mão de obra', label: '' };
  }

  // 2. Equipamento para Aquisição Permanente -> Tipo 2 (Custo / Cost no MS Project XML), Grupo: Equipamento para aquisição permanente
  const isEqpPermanente = tipoUpper.includes('PERMANENTE') || descUpper.includes('AQUISIÇÃO PERMANENTE') || descUpper.includes('AQUISICAO PERMANENTE');
  if (isEqpPermanente) {
    return { type: 2, group: 'Equipamento para aquisição permanente', label: 'R$' };
  }

  // 3. Demais Categorias Específicas de Custo -> Tipo 2 (Custo / Cost no MS Project XML)
  if (tipoUpper.includes('TAXA') || descUpper.includes('TAXA') || descUpper.includes('IMPOSTO') || descUpper.includes('LICENÇA') || descUpper.includes('LICENCA')) {
    return { type: 2, group: 'Taxas', label: 'R$' };
  }
  if (tipoUpper.includes('ADMINISTRAÇÃO') || tipoUpper.includes('ADMINISTRACAO') || descUpper.includes('ADMINISTRAÇÃO') || descUpper.includes('ADMINISTRACAO') || descUpper.includes('SUPERVISÃO') || descUpper.includes('SUPERVISAO')) {
    return { type: 2, group: 'Administração', label: 'R$' };
  }
  if (tipoUpper.includes('ALUGUEL') || descUpper.includes('ALUGUEL')) {
    return { type: 2, group: 'Aluguel', label: 'R$' };
  }
  if (tipoUpper.includes('VERBA') || descUpper.includes('VERBA')) {
    return { type: 2, group: 'Verba', label: 'R$' };
  }
  if (tipoUpper.includes('TRANSPORTE') || tipoUpper.includes('LOGÍSTICA') || tipoUpper.includes('LOGISTICA') || descUpper.includes('TRANSPORTE') || descUpper.includes('FRETE') || descUpper.includes('LOGÍSTICA') || descUpper.includes('LOGISTICA')) {
    return { type: 2, group: 'Transporte e logistica', label: 'R$' };
  }

  // 4. Equipamento (Uso / Locação) -> Tipo 1 (Trabalho / Work no MS Project XML), Grupo: Equipamento
  const isEQP = tipoUpper.includes('EQUIPAMENTO') || tipoUpper === 'EQP' || tipoUpper === 'EQ' ||
                codUpper.startsWith('EQP.') || codUpper.startsWith('EQP') || codUpper.startsWith('EQ.') || codUpper.startsWith('EQ') ||
                descUpper.includes('EQUIPAMENTO') || descUpper.includes('MAQUINA') || descUpper.includes('MÁQUINA') ||
                descUpper.includes('CAMINHAO') || descUpper.includes('CAMINHÃO') || descUpper.includes('BETONEIRA') ||
                descUpper.includes('RETROESCAVADEIRA') || descUpper.includes('VIBRADOR') || descUpper.includes('COMPACTADOR') ||
                descUpper.includes('PERFURATRIZ') || descUpper.includes('PÁ CARREGADEIRA') || descUpper.includes('PA CARREGADEIRA');

  if (isEQP) {
    return { type: 1, group: 'Equipamento', label: '' };
  }

  // 5. Material -> Tipo 0 (Material no MS Project XML), Grupo: Material
  const isMAT = tipoUpper.includes('MATERIAL') || tipoUpper === 'MAT' ||
                codUpper.startsWith('MAT.') || codUpper.startsWith('MAT') ||
                descUpper.includes('AÇO') || descUpper.includes('ACO') || descUpper.includes('CONCRETO') ||
                descUpper.includes('PREGO') || descUpper.includes('ARAME') || descUpper.includes('TABUA') ||
                descUpper.includes('SARRAFO') || descUpper.includes('DESMOLDANTE') || descUpper.includes('VERGALHAO') ||
                descUpper.includes('ESPACADOR') || descUpper.includes('ESPAÇADOR') || descUpper.includes('CACAMBA') || descUpper.includes('CAÇAMBA') ||
                descUpper.includes('MATERIAL');

  if (isMAT) {
    return { type: 0, group: 'Material', label: uniUpper || 'UN' };
  }

  // 6. Outros -> Tipo 2 (Custo / Cost no MS Project XML), Grupo: Outros
  return { type: 2, group: 'Outros', label: 'R$' };
}

export function generateMsProjectXML({
  orcamentoInfo,
  itens,
  duracoesMap = {},
  jornadasMap = {}
}: ExportMsProjectOptions): string {
  const rawCodigo = orcamentoInfo?.codigo || 'ORÇAMENTO';
  const rawNome = orcamentoInfo?.nome || orcamentoInfo?.projeto || 'Cronograma';
  const empresa = orcamentoInfo?.empresa || 'BRP Soluções Metálicas';

  const now = new Date();
  const creationDateISO = now.toISOString().split('.')[0];

  // Helper para verificar se child é um item descendente de parent na planilha
  const isItemChildOf = (child: any, parent: any): boolean => {
    if (!child || !parent || child === parent) return false;
    if (child.parentCompositionId && String(child.parentCompositionId) === String(parent.id)) return true;
    if (child.parent_composition_id && String(child.parent_composition_id) === String(parent.id)) return true;
    const cEap = (child.item_eap || '').trim();
    const pEap = (parent.item_eap || '').trim();
    if (cEap && pEap && cEap.startsWith(pEap + '.')) return true;
    return false;
  };

  // Identifica se um item possui filhos na planilha orçamentária
  const hasChildItems = (item: any): boolean => {
    return itens.some(other => isItemChildOf(other, item));
  };

  // Classifica itens em Tarefas (Seções, Composições, Subcomposições) vs Recursos (Insumos Folhas)
  const taskItems: any[] = [];
  const childInsumoItems: any[] = [];

  itens.forEach(item => {
    const eapClean = (item.item_eap || '').trim();
    if (!eapClean) return;

    const hasChildren = hasChildItems(item);
    const isExplicitInsumo = Boolean(item.isChildInsumoOfComposition || item.is_child_insumo || item.parentCompositionId || item.parent_composition_id);

    // Um item é Insumo (Recurso) se NÃO possui filhos e for marcado como insumo filho ou estiver sob uma composição
    const isInsumo = !hasChildren && (
      isExplicitInsumo ||
      itens.some(parent => !parent.isSecao && !parent.is_secao && isItemChildOf(item, parent))
    );

    if (isInsumo) {
      childInsumoItems.push(item);
    } else {
      taskItems.push(item);
    }
  });

  // Mapeamento de parent task para cada insumo filho
  const getParentTaskForInsumo = (insumo: any): any | null => {
    let bestParent: any | null = null;
    let bestEapLen = -1;

    taskItems.forEach(t => {
      if (isItemChildOf(insumo, t)) {
        const pEap = (t.item_eap || '').trim();
        if (pEap.length > bestEapLen) {
          bestParent = t;
          bestEapLen = pEap.length;
        }
      }
    });

    return bestParent;
  };

  // Helper para verificar se uma tarefa é uma Seção (Linha de texto / Etapa resumo)
  const isSectionItem = (item: any): boolean => {
    return Boolean(item.isSecao || item.is_secao || (!item.codigo && (!item.quantidade || item.quantidade === 0) && !item.unidade));
  };

  // 1. Recalcula a EDT (WBS) das Tarefas no Cronograma MS Project
  // Todas as Composições e Subcomposições pertencentes a uma Seção viram Tarefas Folha de Nível 2 sob essa Seção
  const getParentSectionForTask = (task: any): any | null => {
    if (isSectionItem(task)) return null;

    let bestSection: any | null = null;
    let bestEapLen = -1;

    taskItems.forEach(sectionCandidate => {
      if (isSectionItem(sectionCandidate) && isItemChildOf(task, sectionCandidate)) {
        const pEap = (sectionCandidate.item_eap || '').trim();
        if (pEap.length > bestEapLen) {
          bestSection = sectionCandidate;
          bestEapLen = pEap.length;
        }
      }
    });

    return bestSection;
  };

  // Atribui nova EDT (WBS) ajustada sequencialmente por nível
  const childCounterMap = new Map<string, number>();

  taskItems.forEach(task => {
    const isSec = isSectionItem(task);
    const parentSection = isSec ? null : getParentSectionForTask(task);
    const parentKey = parentSection ? parentSection.id : 'root';

    const childIndex = (childCounterMap.get(parentKey) || 0) + 1;
    childCounterMap.set(parentKey, childIndex);

    const newWbs = parentSection ? `${parentSection._newWbs}.${childIndex}` : `${childIndex}`;
    task._newWbs = newWbs;
    task._parentTask = parentSection;
    task._outlineLevel = newWbs.split('.').length;
  });

  // 2. Mapeamento único de Recursos para a seção <Resources> do MS Project
  const resourcesMap = new Map<string, {
    uid: number;
    code: string;
    name: string;
    type: number;
    group: string;
    label: string;
  }>();

  let nextResourceUid = 1;

  childInsumoItems.forEach(item => {
    const desc = (item.descricao || '').trim();
    const cod = (item.codigo || '').trim();
    if (!desc && !cod) return;

    const key = cod ? `COD:${cod.toUpperCase()}` : `DESC:${desc.toUpperCase()}`;
    if (!resourcesMap.has(key)) {
      const cls = classifyInsumoForMsProject(item);
      resourcesMap.set(key, {
        uid: nextResourceUid++,
        code: cod,
        name: desc || cod,
        type: cls.type,
        group: cls.group,
        label: cls.label
      });
    }
  });

  // Geração do XML de Tarefas e Atribuições
  const tasksXml: string[] = [];
  const assignmentsXml: string[] = [];
  let nextTaskUid = 1;
  let nextAssignmentUid = 1;

  // Adiciona a Tarefa Resumo Raiz do Projeto (Nível 0 / Projeto)
  const rootProjectUid = nextTaskUid++;
  tasksXml.push(`    <Task>
      <UID>${rootProjectUid}</UID>
      <ID>0</ID>
      <Name>${escapeXml(`${rawCodigo} - ${rawNome}`)}</Name>
      <Type>1</Type>
      <IsNull>0</IsNull>
      <WBS>0</WBS>
      <OutlineNumber>0</OutlineNumber>
      <OutlineLevel>0</OutlineLevel>
      <Priority>500</Priority>
      <Start>${creationDateISO}</Start>
      <Duration>PT8H0M0S</Duration>
      <DurationFormat>7</DurationFormat>
      <Summary>1</Summary>
      <Critical>1</Critical>
    </Task>`);

  // Helpers para busca de duração e jornada (por id ou eap)
  const getDuracaoRaw = (item: any): string => {
    if (!duracoesMap) return '';
    if (item.id && duracoesMap[item.id] !== undefined && String(duracoesMap[item.id]).trim() !== '') {
      return String(duracoesMap[item.id]).trim();
    }
    const eapClean = (item.item_eap || '').trim();
    if (eapClean && duracoesMap[eapClean] !== undefined && String(duracoesMap[eapClean]).trim() !== '') {
      return String(duracoesMap[eapClean]).trim();
    }
    return '';
  };

  const getJornadaRaw = (item: any): string => {
    if (!jornadasMap) return '';
    if (item.id && jornadasMap[item.id] !== undefined && String(jornadasMap[item.id]).trim() !== '') {
      return String(jornadasMap[item.id]).trim();
    }
    const eapClean = (item.item_eap || '').trim();
    if (eapClean && jornadasMap[eapClean] !== undefined && String(jornadasMap[eapClean]).trim() !== '') {
      return String(jornadasMap[eapClean]).trim();
    }
    return '';
  };

  // Pré-calcula UIDs das Tarefas
  taskItems.forEach((item, index) => {
    item._msTaskUid = nextTaskUid++;
    item._msTaskId = index + 1;
  });

  // Monta as tarefas do cronograma respeitando a nova EAP / EDT ajustada
  taskItems.forEach(item => {
    const taskUid = item._msTaskUid;
    const taskId = item._msTaskId;
    const newWbs = item._newWbs;
    const outlineLevel = item._outlineLevel;

    const isSecao = isSectionItem(item);
    const isSummary = isSecao;

    // Duração vinda exclusivamente da Distribuição de Equipe
    const durStr = getDuracaoRaw(item);
    const durNum = parseFloat(durStr);
    const hasValidDuration = !isNaN(durNum) && durNum > 0;

    let durationXml = 'PT0H0M0S';
    let isEstimated = '1';

    if (isSummary) {
      durationXml = 'PT8H0M0S';
      isEstimated = '0';
    } else if (hasValidDuration) {
      const durHoras = durNum * 8;
      durationXml = `PT${Math.round(durHoras * 10) / 10}H0M0S`;
      isEstimated = '0';
    } else {
      durationXml = 'PT0H0M0S';
      isEstimated = '1';
    }

    tasksXml.push(`    <Task>
      <UID>${taskUid}</UID>
      <ID>${taskId}</ID>
      <Name>${escapeXml(item.descricao)}</Name>
      <Type>0</Type>
      <IsNull>0</IsNull>
      <WBS>${escapeXml(newWbs)}</WBS>
      <OutlineNumber>${escapeXml(newWbs)}</OutlineNumber>
      <OutlineLevel>${outlineLevel}</OutlineLevel>
      <Priority>500</Priority>
      <Start>${creationDateISO}</Start>
      <Duration>${durationXml}</Duration>
      <DurationFormat>7</DurationFormat>
      <Estimated>${isEstimated}</Estimated>
      <Summary>${isSummary ? '1' : '0'}</Summary>
    </Task>`);

    // Atribuições de Recursos (Assignments) para tarefas folha (composições / subcomposições)
    if (!isSummary) {
      const assignedInsumos = childInsumoItems.filter(insumo => getParentTaskForInsumo(insumo) === item);

      if (assignedInsumos.length > 0) {
        const jornadaStr = getJornadaRaw(item);
        const jornadaNum = parseFloat(jornadaStr) || 8;
        const horasDisponiveis = hasValidDuration ? (durNum * jornadaNum) : 0;

        assignedInsumos.forEach(insumo => {
          const cod = (insumo.codigo || '').trim();
          const desc = (insumo.descricao || '').trim();
          const key = cod ? `COD:${cod.toUpperCase()}` : `DESC:${desc.toUpperCase()}`;
          const resObj = resourcesMap.get(key);

          if (resObj) {
            const assignUid = nextAssignmentUid++;
            const totalHoras = insumo.displayQuantidade !== undefined ? insumo.displayQuantidade : (insumo.quantidade || 0);

            if (resObj.type === 1) {
              // Recurso Tipo Trabalho / Work (Mão de Obra ou Equipamento)
              let units = 1;
              if (resObj.group === 'Mão de obra') {
                const exatos = horasDisponiveis > 0 ? (totalHoras / horasDisponiveis) : 0;
                units = totalHoras > 0 && horasDisponiveis > 0 ? Math.max(1, Math.ceil(exatos)) : (insumo.quantidade || 1);
              } else {
                units = 1;
              }

              const workXml = `PT${Math.round(totalHoras * 10) / 10}H0M0S`;

              assignmentsXml.push(`    <Assignment>
      <UID>${assignUid}</UID>
      <TaskUID>${taskUid}</TaskUID>
      <ResourceUID>${resObj.uid}</ResourceUID>
      <Units>${units}</Units>
      <Work>${workXml}</Work>
    </Assignment>`);
            } else if (resObj.type === 0) {
              // Recurso Tipo Material
              const totalQtd = totalHoras > 0 ? totalHoras : 1;
              assignmentsXml.push(`    <Assignment>
      <UID>${assignUid}</UID>
      <TaskUID>${taskUid}</TaskUID>
      <ResourceUID>${resObj.uid}</ResourceUID>
      <Units>${totalQtd}</Units>
    </Assignment>`);
            } else {
              // Recurso Tipo Custo (Demais)
              const totalCost = (insumo.total || (totalHoras * (insumo.valor_unitario || 0))) || 0;
              assignmentsXml.push(`    <Assignment>
      <UID>${assignUid}</UID>
      <TaskUID>${taskUid}</TaskUID>
      <ResourceUID>${resObj.uid}</ResourceUID>
      <Cost>${totalCost.toFixed(2)}</Cost>
    </Assignment>`);
            }
          }
        });
      }
    }
  });

  // Monta o bloco XML de <Resources>
  const resourcesXml: string[] = [];
  resourcesMap.forEach(res => {
    resourcesXml.push(`    <Resource>
      <UID>${res.uid}</UID>
      <ID>${res.uid}</ID>
      <Name>${escapeXml(res.name)}</Name>
      <Type>${res.type}</Type>
      <Group>${escapeXml(res.group)}</Group>
      ${res.type === 0 ? `<MaterialLabel>${escapeXml(res.label)}</MaterialLabel>` : ''}
    </Resource>`);
  });

  // Documento completo MS Project XML
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <Name>${escapeXml(`${rawCodigo} - ${rawNome}`)}</Name>
  <Title>${escapeXml(`${rawCodigo} - ${rawNome}`)}</Title>
  <Company>${escapeXml(empresa)}</Company>
  <CreationDate>${creationDateISO}</CreationDate>
  <LastSaved>${creationDateISO}</LastSaved>
  <ScheduleFromStart>1</ScheduleFromStart>
  <StartDate>${creationDateISO}</StartDate>

  <FYStartDate>1</FYStartDate>
  <CriticalPathRange>0</CriticalPathRange>
  <CurrencyCode>BRL</CurrencyCode>
  <CurrencySymbol>R$</CurrencySymbol>
  <CurrencySymbolPosition>0</CurrencySymbolPosition>
  <CurrencyDigits>2</CurrencyDigits>
  <CalendarUID>1</CalendarUID>
  <DefaultStartTime>08:00:00</DefaultStartTime>
  <DefaultFinishTime>17:00:00</DefaultFinishTime>
  <MinutesPerDay>480</MinutesPerDay>
  <MinutesPerWeek>2400</MinutesPerWeek>
  <DaysPerMonth>20</DaysPerMonth>
  <DefaultTaskType>0</DefaultTaskType>
  <DefaultFixedCostAccrual>3</DefaultFixedCostAccrual>
  <DefaultStandardRate>0</DefaultStandardRate>
  <DefaultOvertimeRate>0</DefaultOvertimeRate>
  <DurationFormat>7</DurationFormat>
  <WorkFormat>2</WorkFormat>
  <EditableActualCosts>0</EditableActualCosts>
  <HonorConstraints>1</HonorConstraints>

  <Calendars>
    <Calendar>
      <UID>1</UID>
      <Name>Padrão</Name>
      <IsBaseCalendar>1</IsBaseCalendar>
      <WeekDays>
        <WeekDay><DayType>1</DayType><DayWorking>0</DayWorking></WeekDay>
        <WeekDay><DayType>2</DayType><DayWorking>1</DayWorking><WorkingTimes><WorkingTime><FromTime>08:00:00</FromTime><ToTime>12:00:00</ToTime></WorkingTime><WorkingTime><FromTime>13:00:00</FromTime><ToTime>17:00:00</ToTime></WorkingTime></WorkingTimes></WeekDay>
        <WeekDay><DayType>3</DayType><DayWorking>1</DayWorking><WorkingTimes><WorkingTime><FromTime>08:00:00</FromTime><ToTime>12:00:00</ToTime></WorkingTime><WorkingTime><FromTime>13:00:00</FromTime><ToTime>17:00:00</ToTime></WorkingTime></WorkingTimes></WeekDay>
        <WeekDay><DayType>4</DayType><DayWorking>1</DayWorking><WorkingTimes><WorkingTime><FromTime>08:00:00</FromTime><ToTime>12:00:00</ToTime></WorkingTime><WorkingTime><FromTime>13:00:00</FromTime><ToTime>17:00:00</ToTime></WorkingTime></WorkingTimes></WeekDay>
        <WeekDay><DayType>5</DayType><DayWorking>1</DayWorking><WorkingTimes><WorkingTime><FromTime>08:00:00</FromTime><ToTime>12:00:00</ToTime></WorkingTime><WorkingTime><FromTime>13:00:00</FromTime><ToTime>17:00:00</ToTime></WorkingTime></WorkingTimes></WeekDay>
        <WeekDay><DayType>6</DayType><DayWorking>1</DayWorking><WorkingTimes><WorkingTime><FromTime>08:00:00</FromTime><ToTime>12:00:00</ToTime></WorkingTime><WorkingTime><FromTime>13:00:00</FromTime><ToTime>17:00:00</ToTime></WorkingTime></WorkingTimes></WeekDay>
        <WeekDay><DayType>7</DayType><DayWorking>0</DayWorking></WeekDay>
      </WeekDays>
    </Calendar>
  </Calendars>

  <Tasks>
${tasksXml.join('\n')}
  </Tasks>

  <Resources>
${resourcesXml.join('\n')}
  </Resources>

  <Assignments>
${assignmentsXml.join('\n')}
  </Assignments>
</Project>`;
}

export function downloadMsProjectXML(options: ExportMsProjectOptions): void {
  const xmlContent = generateMsProjectXML(options);
  const rawCodigo = options.orcamentoInfo?.codigo || 'ORÇAMENTO';
  const rawNome = options.orcamentoInfo?.nome || options.orcamentoInfo?.projeto || 'Cronograma';
  
  const cleanName = `${rawCodigo} - ${rawNome} - Cronograma.xml`.replace(/[\/\:\*\?\"\<\>\|]/g, '_');
  
  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', cleanName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
