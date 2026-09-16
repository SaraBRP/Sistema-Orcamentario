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

  // 1. Mão de Obra -> Tipo 1 (Material), Grupo: Mão de Obra
  const isMO = codUpper.startsWith('MO.') || codUpper.startsWith('MO') || 
               fonteUpper.includes('MO') || fonteUpper.includes('MÃO DE OBRA') ||
               descUpper.includes('SERVENTE') || descUpper.includes('PEDREIRO') || 
               descUpper.includes('CARPINTEIRO') || descUpper.includes('ARMADOR') ||
               descUpper.includes('OPERADOR') || descUpper.includes('OFICIAL') ||
               descUpper.includes('MÃO DE OBRA') || descUpper.includes('MAO DE OBRA');

  if (isMO) {
    return { type: 1, group: 'Mão de Obra', label: 'UN' };
  }

  // 2. Equipamento -> Tipo 1 (Material), Grupo: Equipamento
  const isEQP = codUpper.startsWith('EQP.') || codUpper.startsWith('EQP') || codUpper.startsWith('EQ.') || codUpper.startsWith('EQ') ||
                descUpper.includes('EQUIPAMENTO') || descUpper.includes('MAQUINA') || descUpper.includes('MÁQUINA') ||
                descUpper.includes('CAMINHAO') || descUpper.includes('CAMINHÃO') || descUpper.includes('BETONEIRA') ||
                descUpper.includes('RETROESCAVADEIRA') || descUpper.includes('VIBRADOR') || descUpper.includes('COMPACTADOR');

  if (isEQP) {
    return { type: 1, group: 'Equipamento', label: uniUpper || 'UN' };
  }

  // 3. Material -> Tipo 1 (Material), Grupo: Material
  const isMAT = codUpper.startsWith('MAT.') || codUpper.startsWith('MAT') ||
                descUpper.includes('AÇO') || descUpper.includes('ACO') || descUpper.includes('CONCRETO') ||
                descUpper.includes('PREGO') || descUpper.includes('ARAME') || descUpper.includes('TABUA') ||
                descUpper.includes('SARRAFO') || descUpper.includes('DESMOLDANTE') || descUpper.includes('VERGALHAO') ||
                descUpper.includes('LOCACAO DE BANHEIRO') || descUpper.includes('LOCAÇÃO DE BANHEIRO');

  if (isMAT) {
    return { type: 1, group: 'Material', label: uniUpper || 'UN' };
  }

  // 4. Demais -> Tipo 2 (Custo / Cost), Grupo correspondente do sistema
  let groupName = 'Outros';
  if (descUpper.includes('ALUGUEL') || descUpper.includes('LOCACAO') || descUpper.includes('LOCAÇÃO')) {
    groupName = 'Aluguel';
  } else if (descUpper.includes('SERVIÇO') || descUpper.includes('SERVICO') || descUpper.includes('TERCEIRO')) {
    groupName = 'Serviços de Terceiros';
  } else if (descUpper.includes('TAXA') || descUpper.includes('IMPOSTO')) {
    groupName = 'Taxas';
  } else if (descUpper.includes('ADMINISTRAÇÃO') || descUpper.includes('ADMINISTRACAO')) {
    groupName = 'Administração';
  } else if (descUpper.includes('VERBA')) {
    groupName = 'Verba';
  } else if (descUpper.includes('TRANSPORTE') || descUpper.includes('FRETE') || descUpper.includes('LOGÍSTICA')) {
    groupName = 'Transporte e Logística';
  }

  return { type: 2, group: groupName, label: 'R$' };
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

  // Helper para extrair a EAP pai (ex: "1.2.1" -> "1.2")
  const getParentEap = (eap: string): string => {
    const parts = (eap || '').trim().split('.').filter(Boolean);
    if (parts.length <= 1) return '';
    return parts.slice(0, -1).join('.');
  };

  // Separa tarefas principais (Seções e Composições) dos insumos filhos
  const taskItems: any[] = [];
  const childInsumosByParentEap = new Map<string, any[]>();

  itens.forEach(item => {
    const eapClean = (item.item_eap || '').trim();
    if (!eapClean) return;

    const isChild = Boolean(
      item.isChildInsumoOfComposition ||
      item.is_child_insumo ||
      item.composicao_id ||
      item.parentCompositionId ||
      item.parent_composition_id
    );

    if (isChild) {
      const parentEap = getParentEap(eapClean);
      if (parentEap) {
        if (!childInsumosByParentEap.has(parentEap)) {
          childInsumosByParentEap.set(parentEap, []);
        }
        childInsumosByParentEap.get(parentEap)!.push(item);
      }
    } else {
      taskItems.push(item);
    }
  });

  // Mapeamento único de Recursos para a seção <Resources>
  const resourcesMap = new Map<string, {
    uid: number;
    code: string;
    name: string;
    type: number;
    group: string;
    label: string;
  }>();

  let nextResourceUid = 1;

  // Processa todos os insumos para cadastrar a lista global de Recursos do MS Project
  itens.forEach(item => {
    const isChild = Boolean(
      item.isChildInsumoOfComposition ||
      item.is_child_insumo ||
      item.composicao_id ||
      item.parentCompositionId ||
      item.parent_composition_id
    );

    if (isChild || (!item.isSecao && item.codigo)) {
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

  // Monta as tarefas do cronograma respeitando a EAP e EDT
  taskItems.forEach((item, index) => {
    const taskUid = nextTaskUid++;
    const taskId = index + 1;
    const eapClean = (item.item_eap || '').trim();
    const eapParts = eapClean.split('.').filter(Boolean);
    const outlineLevel = Math.max(1, eapParts.length);

    const isSecao = item.isSecao || item.is_secao || (!item.codigo && (!item.quantidade || item.quantidade === 0) && !item.unidade);
    
    // Duração em dias vinda da Distribuição de Equipe ou padrão (1 dia)
    const duracaoStr = duracoesMap[item.id] || '1';
    const duracaoDias = parseFloat(duracaoStr) || 1;
    const duracaoHoras = duracaoDias * 8;
    const durationXml = `PT${Math.round(duracaoHoras * 10) / 10}H0M0S`;

    tasksXml.push(`    <Task>
      <UID>${taskUid}</UID>
      <ID>${taskId}</ID>
      <Name>${escapeXml(item.descricao)}</Name>
      <Type>0</Type>
      <IsNull>0</IsNull>
      <WBS>${escapeXml(eapClean)}</WBS>
      <OutlineNumber>${escapeXml(eapClean)}</OutlineNumber>
      <OutlineLevel>${outlineLevel}</OutlineLevel>
      <Priority>500</Priority>
      <Start>${creationDateISO}</Start>
      <Duration>${isSecao ? 'PT8H0M0S' : durationXml}</Duration>
      <DurationFormat>7</DurationFormat>
      <Summary>${isSecao ? '1' : '0'}</Summary>
    </Task>`);

    // Atribuições de Recursos (Assignments) para cada composição
    const childInsumos = childInsumosByParentEap.get(eapClean) || [];
    if (childInsumos.length > 0 && !isSecao) {
      const jornadaStr = jornadasMap[item.id] || '8';
      const jornadaNum = parseFloat(jornadaStr) || 8;
      const horasDisponiveis = duracaoDias * jornadaNum;

      childInsumos.forEach(insumo => {
        const cod = (insumo.codigo || '').trim();
        const desc = (insumo.descricao || '').trim();
        const key = cod ? `COD:${cod.toUpperCase()}` : `DESC:${desc.toUpperCase()}`;
        const resObj = resourcesMap.get(key);

        if (resObj) {
          const assignUid = nextAssignmentUid++;
          const totalHoras = insumo.displayQuantidade !== undefined ? insumo.displayQuantidade : (insumo.quantidade || 0);

          if (resObj.type === 1) {
            // Recurso Tipo Material (Mão de Obra, Equipamento, Material)
            let units = 1;
            if (resObj.group === 'Mão de Obra') {
              const exatos = horasDisponiveis > 0 ? (totalHoras / horasDisponiveis) : 0;
              units = totalHoras > 0 && horasDisponiveis > 0 ? Math.max(1, Math.ceil(exatos)) : (insumo.quantidade || 1);
            } else {
              units = totalHoras > 0 ? totalHoras : 1;
            }

            assignmentsXml.push(`    <Assignment>
      <UID>${assignUid}</UID>
      <TaskUID>${taskUid}</TaskUID>
      <ResourceUID>${resObj.uid}</ResourceUID>
      <Units>${units}</Units>
    </Assignment>`);
          } else {
            // Recurso Tipo Custo (Demais)
            const totalCost = (insumo.total || (insumo.quantidade * (insumo.valor_unitario || 0))) || 0;
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
      ${res.type === 1 ? `<MaterialLabel>${escapeXml(res.label)}</MaterialLabel>` : ''}
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
