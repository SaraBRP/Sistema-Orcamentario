import ExcelJS from 'exceljs';

export interface CronogramaExportOptions {
  empresa?: string;
  codigo?: string;
  revisao?: string;
  cliente?: string;
  projeto?: string;
  gestor?: string;
  responsavel?: string;
  timelineInfo: {
    columns: Array<{ label: string; sublabel?: string; startDay: number; daySpan: number }>;
    startDate?: Date;
    endDate?: Date;
    totalDays?: number;
  };
  detailedResourceData: {
    moRows: Array<{
      id: string;
      eap: string;
      descricao: string;
      unidade: string;
      qtdTotal: number;
      valorTotal: number;
      periodValues: Array<{ qtd: number; val: number; colaboradores?: number }>;
    }>;
    materiaisRows: Array<{
      id: string;
      eap: string;
      descricao: string;
      unidade: string;
      qtdTotal: number;
      valorTotal: number;
      periodValues: Array<{ qtd: number; val: number }>;
    }>;
  };
  calculatedTasks: Array<{
    item: any;
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
  }>;
  histogramData?: Array<{
    periodo: string;
    sublabel?: string;
    mo: number;
    materiais: number;
    totalPeriodo: number;
    acumuladoR$: number;
    percentAcumulado: number;
  }>;
}

function getColLetter(colIdx: number): string {
  let temp = colIdx;
  let letter = '';
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}

export async function exportarCronogramaExcel(options: CronogramaExportOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'OrçaBRP - BRP Engenharia';
  workbook.lastModifiedBy = 'OrçaBRP';
  workbook.created = new Date();

  const cliente = options.cliente || 'Não Informado';
  const projeto = options.projeto || 'Não Informado';
  const gestor = options.gestor || options.responsavel || 'Não Informado';
  const revisao = options.revisao || '00';
  const revisaoFormatada = String(revisao).toUpperCase().startsWith('REV') ? revisao : `REV: ${revisao}`;

  const { timelineInfo, detailedResourceData, calculatedTasks, histogramData = [] } = options;
  const columns = timelineInfo.columns || [];

  // ==========================================================================
  // ABA 1: TABELA DETALHADA DE MÃO DE OBRA POR PERÍODO (DISTRIBUIÇÃO DE EQUIPE)
  // ==========================================================================
  const wsMO = workbook.addWorksheet('Mão de Obra por Período', {
    views: [{ showGridLines: false }]
  });

  wsMO.getColumn(1).width = 4;   // A
  wsMO.getColumn(2).width = 14;  // B - EAP / ORIGEM
  wsMO.getColumn(3).width = 45;  // C - RECURSO / MÃO DE OBRA
  wsMO.getColumn(4).width = 12;  // D - UNIDADE
  wsMO.getColumn(5).width = 16;  // E - QTD. TOTAL (h)
  wsMO.getColumn(6).width = 20;  // F - CUSTO TOTAL (R$)

  columns.forEach((_col, idx) => {
    wsMO.getColumn(7 + idx).width = 16; // G, H, I... Meses
  });

  // Metadados B2:C5
  wsMO.getCell('B2').value = 'CLIENTE:';
  wsMO.getCell('B2').font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF1E293B' } };
  wsMO.getCell('C2').value = cliente;
  wsMO.getCell('C2').font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FF0F172A' } };

  wsMO.getCell('B3').value = 'PROJETO:';
  wsMO.getCell('B3').font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF1E293B' } };
  wsMO.getCell('C3').value = projeto;
  wsMO.getCell('C3').font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };

  wsMO.getCell('B4').value = 'GESTOR:';
  wsMO.getCell('B4').font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF1E293B' } };
  wsMO.getCell('C4').value = gestor;
  wsMO.getCell('C4').font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };

  wsMO.getCell('B5').value = 'REVISÃO:';
  wsMO.getCell('B5').font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF1E293B' } };
  wsMO.getCell('C5').value = revisaoFormatada;
  wsMO.getCell('C5').font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF1E293B' } };

  for (let r = 2; r <= 5; r++) {
    for (let c = 2; c <= 3; c++) {
      wsMO.getRow(r).getCell(c).border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } }
      };
      wsMO.getRow(r).getCell(c).alignment = { vertical: 'middle' };
    }
  }

  // Título Mesclado D2:LastCol row 5
  const lastColMOIdx = Math.max(7, 6 + columns.length);
  const lastColMOLetter = getColLetter(lastColMOIdx);
  wsMO.mergeCells(`D2:${lastColMOLetter}5`);
  const titleCellMO = wsMO.getCell('D2');
  titleCellMO.value = 'TABELA DETALHADA DE MÃO DE OBRA POR PERÍODO (DISTRIBUIÇÃO DE EQUIPE)';
  titleCellMO.font = { name: 'Calibri', bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  titleCellMO.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  for (let r = 2; r <= 5; r++) {
    for (let c = 4; c <= lastColMOIdx; c++) {
      const cell = wsMO.getRow(r).getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } }
      };
    }
  }

  // Cabeçalho da Tabela MO (Linha 7)
  const headerRowMO = wsMO.getRow(7);
  headerRowMO.height = 26;
  const staticHeadersMO = ['EAP / ORIGEM', 'RECURSO / MÃO DE OBRA', 'UNID.', 'QTD. TOTAL', 'CUSTO TOTAL (R$)'];
  staticHeadersMO.forEach((txt, idx) => {
    const colIdx = idx + 2;
    const cell = headerRowMO.getCell(colIdx);
    cell.value = txt;
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: colIdx === 2 ? 'thin' : 'hair', color: { argb: 'FF94A3B8' } },
      right: { style: 'hair', color: { argb: 'FF94A3B8' } }
    };
  });

  columns.forEach((col, idx) => {
    const colIdx = 7 + idx;
    const cell = headerRowMO.getCell(colIdx);
    cell.value = col.label;
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'hair', color: { argb: 'FF94A3B8' } },
      right: { style: colIdx === lastColMOIdx ? 'thin' : 'hair', color: { argb: 'FF94A3B8' } }
    };
  });

  // Linhas de Dados MO (Linhas 8+)
  let curRowMO = 8;
  const moRows = detailedResourceData.moRows || [];

  moRows.forEach(row => {
    const r = wsMO.getRow(curRowMO);
    r.height = 20;

    r.getCell(2).value = row.eap || '-';
    r.getCell(3).value = row.descricao || '';
    r.getCell(4).value = row.unidade || 'PESSOAS';
    r.getCell(5).value = Number(row.qtdTotal || 0);
    r.getCell(6).value = Number(row.valorTotal || 0);

    for (let c = 2; c <= 6; c++) {
      const cell = r.getCell(c);
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      cell.border = {
        top: { style: 'hair', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'hair', color: { argb: 'FFCBD5E1' } },
        left: { style: c === 2 ? 'thin' : 'hair', color: { argb: 'FFCBD5E1' } },
        right: { style: 'hair', color: { argb: 'FFCBD5E1' } }
      };

      if (c === 2 || c === 4) cell.alignment = { horizontal: 'center', vertical: 'middle' };
      else if (c === 3) cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      else if (c === 5) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0.0" h"';
      } else if (c === 6) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '_-"R$" * #,##0.00_-;-"R$" * #,##0.00_-;_-"R$" * "-"??_-;_-@_-';
      }
    }

    // Colunas de Período
    columns.forEach((_col, pIdx) => {
      const colIdx = 7 + pIdx;
      const cell = r.getCell(colIdx);
      const pVal = row.periodValues[pIdx]?.val || 0;

      cell.border = {
        top: { style: 'hair', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'hair', color: { argb: 'FFCBD5E1' } },
        left: { style: 'hair', color: { argb: 'FFCBD5E1' } },
        right: { style: colIdx === lastColMOIdx ? 'thin' : 'hair', color: { argb: 'FFCBD5E1' } }
      };

      if (pVal > 0) {
        cell.value = pVal;
        cell.font = { name: 'Calibri', bold: true, size: 9.5, color: { argb: 'FF166534' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; // Soft green
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '_-"R$" * #,##0.00_-;-"R$" * #,##0.00_-;_-"R$" * "-"??_-;_-@_-';
      } else {
        cell.value = '-';
        cell.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF94A3B8' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });

    curRowMO++;
  });

  // Linha de Total MO
  const lastDataRowMO = curRowMO - 1;
  const totalRowMO = wsMO.getRow(curRowMO);
  totalRowMO.height = 24;

  totalRowMO.getCell(2).value = '';
  totalRowMO.getCell(3).value = 'TOTAL GERAL DA EQUIPE NO PERÍODO:';
  totalRowMO.getCell(4).value = '';
  totalRowMO.getCell(5).value = moRows.length > 0 ? { formula: `SUM(E8:E${lastDataRowMO})`, result: moRows.reduce((a, b) => a + b.qtdTotal, 0) } : 0;
  totalRowMO.getCell(6).value = moRows.length > 0 ? { formula: `SUM(F8:F${lastDataRowMO})`, result: moRows.reduce((a, b) => a + b.valorTotal, 0) } : 0;

  for (let c = 2; c <= 6; c++) {
    const cell = totalRowMO.getCell(c);
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: c === 2 ? 'thin' : 'hair', color: { argb: 'FF94A3B8' } },
      right: { style: 'hair', color: { argb: 'FF94A3B8' } }
    };
    if (c === 3) cell.alignment = { horizontal: 'right', vertical: 'middle' };
    else if (c === 5) {
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.numFmt = '#,##0.0" h"';
    } else if (c === 6) {
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.numFmt = '_-"R$" * #,##0.00_-;-"R$" * #,##0.00_-;_-"R$" * "-"??_-;_-@_-';
    }
  }

  columns.forEach((_col, pIdx) => {
    const colIdx = 7 + pIdx;
    const colLetter = getColLetter(colIdx);
    const cell = totalRowMO.getCell(colIdx);
    const colSum = moRows.reduce((acc, r) => acc + (r.periodValues[pIdx]?.val || 0), 0);

    cell.value = moRows.length > 0 ? { formula: `SUM(${colLetter}8:${colLetter}${lastDataRowMO})`, result: colSum } : colSum;
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'hair', color: { argb: 'FF94A3B8' } },
      right: { style: colIdx === lastColMOIdx ? 'thin' : 'hair', color: { argb: 'FF94A3B8' } }
    };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    cell.numFmt = '_-"R$" * #,##0.00_-;-"R$" * #,##0.00_-;_-"R$" * "-"??_-;_-@_-';
  });


  // ==========================================================================
  // ABA 2: TABELA DETALHADA DE SUPRIMENTOS & MATERIAIS POR PERÍODO
  // ==========================================================================
  const wsMat = workbook.addWorksheet('Suprimentos por Período', {
    views: [{ showGridLines: false }]
  });

  wsMat.getColumn(1).width = 4;   // A
  wsMat.getColumn(2).width = 14;  // B - EAP / ORIGEM
  wsMat.getColumn(3).width = 45;  // C - RECURSO / MATERIAL
  wsMat.getColumn(4).width = 12;  // D - UNIDADE
  wsMat.getColumn(5).width = 16;  // E - QTD. TOTAL
  wsMat.getColumn(6).width = 20;  // F - CUSTO TOTAL (R$)

  columns.forEach((_col, idx) => {
    wsMat.getColumn(7 + idx).width = 16;
  });

  // Metadados B2:C5
  wsMat.getCell('B2').value = 'CLIENTE:';
  wsMat.getCell('B2').font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF1E293B' } };
  wsMat.getCell('C2').value = cliente;
  wsMat.getCell('C2').font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FF0F172A' } };

  wsMat.getCell('B3').value = 'PROJETO:';
  wsMat.getCell('B3').font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF1E293B' } };
  wsMat.getCell('C3').value = projeto;
  wsMat.getCell('C3').font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };

  wsMat.getCell('B4').value = 'GESTOR:';
  wsMat.getCell('B4').font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF1E293B' } };
  wsMat.getCell('C4').value = gestor;
  wsMat.getCell('C4').font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };

  wsMat.getCell('B5').value = 'REVISÃO:';
  wsMat.getCell('B5').font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF1E293B' } };
  wsMat.getCell('C5').value = revisaoFormatada;
  wsMat.getCell('C5').font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF1E293B' } };

  for (let r = 2; r <= 5; r++) {
    for (let c = 2; c <= 3; c++) {
      wsMat.getRow(r).getCell(c).border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } }
      };
      wsMat.getRow(r).getCell(c).alignment = { vertical: 'middle' };
    }
  }

  // Título Mesclado D2:LastCol row 5
  const lastColMatIdx = Math.max(7, 6 + columns.length);
  const lastColMatLetter = getColLetter(lastColMatIdx);
  wsMat.mergeCells(`D2:${lastColMatLetter}5`);
  const titleCellMat = wsMat.getCell('D2');
  titleCellMat.value = 'TABELA DETALHADA DE SUPRIMENTOS & MATERIAIS POR PERÍODO (PLANILHA ORÇAMENTÁRIA)';
  titleCellMat.font = { name: 'Calibri', bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  titleCellMat.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  for (let r = 2; r <= 5; r++) {
    for (let c = 4; c <= lastColMatIdx; c++) {
      const cell = wsMat.getRow(r).getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } }
      };
    }
  }

  // Cabeçalho da Tabela Mat (Linha 7)
  const headerRowMat = wsMat.getRow(7);
  headerRowMat.height = 26;
  const staticHeadersMat = ['EAP / ORIGEM', 'RECURSO / MATERIAL', 'UNID.', 'QTD. TOTAL', 'CUSTO TOTAL (R$)'];
  staticHeadersMat.forEach((txt, idx) => {
    const colIdx = idx + 2;
    const cell = headerRowMat.getCell(colIdx);
    cell.value = txt;
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: colIdx === 2 ? 'thin' : 'hair', color: { argb: 'FF94A3B8' } },
      right: { style: 'hair', color: { argb: 'FF94A3B8' } }
    };
  });

  columns.forEach((col, idx) => {
    const colIdx = 7 + idx;
    const cell = headerRowMat.getCell(colIdx);
    cell.value = col.label;
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'hair', color: { argb: 'FF94A3B8' } },
      right: { style: colIdx === lastColMatIdx ? 'thin' : 'hair', color: { argb: 'FF94A3B8' } }
    };
  });

  // Linhas de Dados Mat (Linhas 8+)
  let curRowMat = 8;
  const matRows = detailedResourceData.materiaisRows || [];

  matRows.forEach(row => {
    const r = wsMat.getRow(curRowMat);
    r.height = 20;

    r.getCell(2).value = row.eap || '-';
    r.getCell(3).value = row.descricao || '';
    r.getCell(4).value = row.unidade || 'un';
    r.getCell(5).value = Number(row.qtdTotal || 0);
    r.getCell(6).value = Number(row.valorTotal || 0);

    for (let c = 2; c <= 6; c++) {
      const cell = r.getCell(c);
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      cell.border = {
        top: { style: 'hair', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'hair', color: { argb: 'FFCBD5E1' } },
        left: { style: c === 2 ? 'thin' : 'hair', color: { argb: 'FFCBD5E1' } },
        right: { style: 'hair', color: { argb: 'FFCBD5E1' } }
      };

      if (c === 2 || c === 4) cell.alignment = { horizontal: 'center', vertical: 'middle' };
      else if (c === 3) cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      else if (c === 5) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0.00';
      } else if (c === 6) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '_-"R$" * #,##0.00_-;-"R$" * #,##0.00_-;_-"R$" * "-"??_-;_-@_-';
      }
    }

    // Colunas de Período
    columns.forEach((_col, pIdx) => {
      const colIdx = 7 + pIdx;
      const cell = r.getCell(colIdx);
      const pVal = row.periodValues[pIdx]?.val || 0;

      cell.border = {
        top: { style: 'hair', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'hair', color: { argb: 'FFCBD5E1' } },
        left: { style: 'hair', color: { argb: 'FFCBD5E1' } },
        right: { style: colIdx === lastColMatIdx ? 'thin' : 'hair', color: { argb: 'FFCBD5E1' } }
      };

      if (pVal > 0) {
        cell.value = pVal;
        cell.font = { name: 'Calibri', bold: true, size: 9.5, color: { argb: 'FF1E40AF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }; // Soft blue
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '_-"R$" * #,##0.00_-;-"R$" * #,##0.00_-;_-"R$" * "-"??_-;_-@_-';
      } else {
        cell.value = '-';
        cell.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF94A3B8' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });

    curRowMat++;
  });

  // Linha de Total Mat
  const lastDataRowMat = curRowMat - 1;
  const totalRowMat = wsMat.getRow(curRowMat);
  totalRowMat.height = 24;

  totalRowMat.getCell(2).value = '';
  totalRowMat.getCell(3).value = 'TOTAL GERAL DE SUPRIMENTOS NO PERÍODO:';
  totalRowMat.getCell(4).value = '';
  totalRowMat.getCell(5).value = matRows.length > 0 ? { formula: `SUM(E8:E${lastDataRowMat})`, result: matRows.reduce((a, b) => a + b.qtdTotal, 0) } : 0;
  totalRowMat.getCell(6).value = matRows.length > 0 ? { formula: `SUM(F8:F${lastDataRowMat})`, result: matRows.reduce((a, b) => a + b.valorTotal, 0) } : 0;

  for (let c = 2; c <= 6; c++) {
    const cell = totalRowMat.getCell(c);
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: c === 2 ? 'thin' : 'hair', color: { argb: 'FF94A3B8' } },
      right: { style: 'hair', color: { argb: 'FF94A3B8' } }
    };
    if (c === 3) cell.alignment = { horizontal: 'right', vertical: 'middle' };
    else if (c === 5) {
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.numFmt = '#,##0.00';
    } else if (c === 6) {
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.numFmt = '_-"R$" * #,##0.00_-;-"R$" * #,##0.00_-;_-"R$" * "-"??_-;_-@_-';
    }
  }

  columns.forEach((_col, pIdx) => {
    const colIdx = 7 + pIdx;
    const colLetter = getColLetter(colIdx);
    const cell = totalRowMat.getCell(colIdx);
    const colSum = matRows.reduce((acc, r) => acc + (r.periodValues[pIdx]?.val || 0), 0);

    cell.value = matRows.length > 0 ? { formula: `SUM(${colLetter}8:${colLetter}${lastDataRowMat})`, result: colSum } : colSum;
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'hair', color: { argb: 'FF94A3B8' } },
      right: { style: colIdx === lastColMatIdx ? 'thin' : 'hair', color: { argb: 'FF94A3B8' } }
    };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    cell.numFmt = '_-"R$" * #,##0.00_-;-"R$" * #,##0.00_-;_-"R$" * "-"??_-;_-@_-';
  });


  // ==========================================================================
  // ABA 3: CRONOGRAMA FÍSICO-FINANCEIRO & CURVA S
  // ==========================================================================
  const wsCurvaS = workbook.addWorksheet('Curva S & Físico-Financeiro', {
    views: [{ showGridLines: false }]
  });

  wsCurvaS.getColumn(1).width = 4;   // A
  wsCurvaS.getColumn(2).width = 12;  // B - ITEM
  wsCurvaS.getColumn(3).width = 48;  // C - DESCRIÇÃO DA ETAPA
  wsCurvaS.getColumn(4).width = 14;  // D - DATA DE INÍCIO
  wsCurvaS.getColumn(5).width = 14;  // E - DATA FINAL
  wsCurvaS.getColumn(6).width = 14;  // F - DURAÇÃO (DIAS)
  wsCurvaS.getColumn(7).width = 20;  // G - VALOR PREVISTO (R$)
  wsCurvaS.getColumn(8).width = 12;  // H - % DO TOTAL

  columns.forEach((_col, idx) => {
    wsCurvaS.getColumn(9 + idx).width = 16; // I, J, K...
  });

  // Metadados B2:C5
  wsCurvaS.getCell('B2').value = 'CLIENTE:';
  wsCurvaS.getCell('B2').font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF1E293B' } };
  wsCurvaS.getCell('C2').value = cliente;
  wsCurvaS.getCell('C2').font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FF0F172A' } };

  wsCurvaS.getCell('B3').value = 'PROJETO:';
  wsCurvaS.getCell('B3').font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF1E293B' } };
  wsCurvaS.getCell('C3').value = projeto;
  wsCurvaS.getCell('C3').font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };

  wsCurvaS.getCell('B4').value = 'GESTOR:';
  wsCurvaS.getCell('B4').font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF1E293B' } };
  wsCurvaS.getCell('C4').value = gestor;
  wsCurvaS.getCell('C4').font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };

  wsCurvaS.getCell('B5').value = 'REVISÃO:';
  wsCurvaS.getCell('B5').font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF1E293B' } };
  wsCurvaS.getCell('C5').value = revisaoFormatada;
  wsCurvaS.getCell('C5').font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF1E293B' } };

  for (let r = 2; r <= 5; r++) {
    for (let c = 2; c <= 3; c++) {
      wsCurvaS.getRow(r).getCell(c).border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } }
      };
      wsCurvaS.getRow(r).getCell(c).alignment = { vertical: 'middle' };
    }
  }

  // Título Mesclado D2:LastCol row 5
  const lastColSIdx = Math.max(9, 8 + columns.length);
  const lastColSLetter = getColLetter(lastColSIdx);
  wsCurvaS.mergeCells(`D2:${lastColSLetter}5`);
  const titleCellS = wsCurvaS.getCell('D2');
  titleCellS.value = 'CRONOGRAMA GERAL DO EMPREENDIMENTO & CURVA S FÍSICO-FINANCEIRA';
  titleCellS.font = { name: 'Calibri', bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  titleCellS.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  for (let r = 2; r <= 5; r++) {
    for (let c = 4; c <= lastColSIdx; c++) {
      const cell = wsCurvaS.getRow(r).getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } }
      };
    }
  }

  // Cabeçalho da Tabela Curva S (Linha 7)
  const headerRowS = wsCurvaS.getRow(7);
  headerRowS.height = 26;
  const staticHeadersS = ['ITEM', 'DESCRIÇÃO DA ETAPA', 'DATA INÍCIO', 'DATA FINAL', 'DURAÇÃO (DIAS)', 'VALOR PREVISTO (R$)', '% TOTAL'];
  staticHeadersS.forEach((txt, idx) => {
    const colIdx = idx + 2;
    const cell = headerRowS.getCell(colIdx);
    cell.value = txt;
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: colIdx === 2 ? 'thin' : 'hair', color: { argb: 'FF94A3B8' } },
      right: { style: 'hair', color: { argb: 'FF94A3B8' } }
    };
  });

  columns.forEach((col, idx) => {
    const colIdx = 9 + idx;
    const cell = headerRowS.getCell(colIdx);
    cell.value = col.label;
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'hair', color: { argb: 'FF94A3B8' } },
      right: { style: colIdx === lastColSIdx ? 'thin' : 'hair', color: { argb: 'FF94A3B8' } }
    };
  });

  // Linhas de Dados Curva S (Linhas 8+)
  let curRowS = 8;
  const validTasks = calculatedTasks || [];
  const grandTotalPrevisto = validTasks.filter(t => !t.isSection).reduce((acc, t) => acc + (t.totalGeral || 0), 0);

  validTasks.forEach(task => {
    const r = wsCurvaS.getRow(curRowS);
    r.height = 20;

    const isSection = Boolean(task.isSection);
    const itemEap = task.item?.item_eap || '';
    const desc = task.item?.descricao || '';
    const durDias = Math.max(1, task.duracaoDias || 1);
    const totalVal = Number(task.totalGeral || 0);

    const dtInicioStr = task.startDate ? task.startDate.toLocaleDateString('pt-BR') : '';
    const dtFimStr = task.endDate ? task.endDate.toLocaleDateString('pt-BR') : '';

    r.getCell(2).value = itemEap;
    r.getCell(3).value = desc;
    r.getCell(4).value = dtInicioStr;
    r.getCell(5).value = dtFimStr;
    r.getCell(6).value = durDias;
    r.getCell(7).value = totalVal;
    r.getCell(8).value = (grandTotalPrevisto > 0 && totalVal > 0) ? (totalVal / grandTotalPrevisto) : 0;

    const rowBg = isSection ? 'FFE2E8F0' : 'FFFFFFFF';
    const rowFontColor = isSection ? 'FF0F172A' : 'FF1E293B';

    for (let c = 2; c <= 8; c++) {
      const cell = r.getCell(c);
      cell.font = { name: 'Calibri', bold: isSection, size: 10, color: { argb: rowFontColor } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.border = {
        top: { style: 'hair', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'hair', color: { argb: 'FFCBD5E1' } },
        left: { style: c === 2 ? 'thin' : 'hair', color: { argb: 'FFCBD5E1' } },
        right: { style: 'hair', color: { argb: 'FFCBD5E1' } }
      };

      if (c === 2 || c === 4 || c === 5 || c === 6) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (c === 3) {
        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      } else if (c === 7) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '_-"R$" * #,##0.00_-;-"R$" * #,##0.00_-;_-"R$" * "-"??_-;_-@_-';
      } else if (c === 8) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '0.0%';
      }
    }

    // Colunas de Período para a Atividade (Distribuição Mensal + Barra Gantt)
    const taskStartOffset = task.startOffsetDays || 0;
    const taskEndOffset = task.endOffsetDays || (taskStartOffset + durDias);

    columns.forEach((col, pIdx) => {
      const colIdx = 9 + pIdx;
      const cell = r.getCell(colIdx);
      const colStart = col.startDay;
      const colEnd = col.startDay + col.daySpan;

      const overlapStart = Math.max(taskStartOffset, colStart);
      const overlapEnd = Math.min(taskEndOffset, colEnd);
      const overlapDays = Math.max(0, overlapEnd - overlapStart);

      cell.border = {
        top: { style: 'hair', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'hair', color: { argb: 'FFCBD5E1' } },
        left: { style: 'hair', color: { argb: 'FFCBD5E1' } },
        right: { style: colIdx === lastColSIdx ? 'thin' : 'hair', color: { argb: 'FFCBD5E1' } }
      };

      if (!isSection && overlapDays > 0 && totalVal > 0) {
        const fraction = overlapDays / durDias;
        const monthVal = fraction * totalVal;

        cell.value = monthVal;
        cell.font = { name: 'Calibri', bold: true, size: 9.5, color: { argb: 'FF065F46' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }; // Soft emerald Gantt bar
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '_-"R$" * #,##0.00_-;-"R$" * #,##0.00_-;_-"R$" * "-"??_-;_-@_-';
      } else if (isSection) {
        cell.value = '';
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      } else {
        cell.value = '-';
        cell.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF94A3B8' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });

    curRowS++;
  });

  const lastTaskRowS = curRowS - 1;

  // ==========================================================================
  // QUADRO DE FECHAMENTO DA CURVA S NO RODAPÉ
  // ==========================================================================

  // Linha 1: DESEMBOLSO MENSAL (R$)
  const rowDesembolso = wsCurvaS.getRow(curRowS);
  rowDesembolso.height = 24;
  rowDesembolso.getCell(2).value = '';
  rowDesembolso.getCell(3).value = 'DESEMBOLSO NO PERÍODO (R$):';
  rowDesembolso.getCell(6).value = '';
  rowDesembolso.getCell(7).value = grandTotalPrevisto;
  rowDesembolso.getCell(8).value = 1.0;

  for (let c = 2; c <= 8; c++) {
    const cell = rowDesembolso.getCell(c);
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: c === 2 ? 'thin' : 'hair', color: { argb: 'FF94A3B8' } },
      right: { style: 'hair', color: { argb: 'FF94A3B8' } }
    };
    if (c === 3) cell.alignment = { horizontal: 'right', vertical: 'middle' };
    else if (c === 7) {
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.numFmt = '_-"R$" * #,##0.00_-;-"R$" * #,##0.00_-;_-"R$" * "-"??_-;_-@_-';
    } else if (c === 8) {
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.numFmt = '0.0%';
    }
  }

  columns.forEach((_col, pIdx) => {
    const colIdx = 9 + pIdx;
    const cell = rowDesembolso.getCell(colIdx);
    const pData = histogramData[pIdx];
    const monthVal = pData ? pData.totalPeriodo : 0;

    cell.value = monthVal;
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'hair', color: { argb: 'FF94A3B8' } },
      right: { style: colIdx === lastColSIdx ? 'thin' : 'hair', color: { argb: 'FF94A3B8' } }
    };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    cell.numFmt = '_-"R$" * #,##0.00_-;-"R$" * #,##0.00_-;_-"R$" * "-"??_-;_-@_-';
  });

  curRowS++;

  // Linha 2: % AVANÇO FÍSICO NO MÊS
  const rowAvancoMes = wsCurvaS.getRow(curRowS);
  rowAvancoMes.height = 22;
  rowAvancoMes.getCell(2).value = '';
  rowAvancoMes.getCell(3).value = '% AVANÇO FÍSICO NO PERÍODO:';

  for (let c = 2; c <= 8; c++) {
    const cell = rowAvancoMes.getCell(c);
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF334155' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    cell.border = {
      top: { style: 'hair', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'hair', color: { argb: 'FFCBD5E1' } },
      left: { style: c === 2 ? 'thin' : 'hair', color: { argb: 'FFCBD5E1' } },
      right: { style: 'hair', color: { argb: 'FFCBD5E1' } }
    };
    if (c === 3) cell.alignment = { horizontal: 'right', vertical: 'middle' };
  }

  columns.forEach((_col, pIdx) => {
    const colIdx = 9 + pIdx;
    const cell = rowAvancoMes.getCell(colIdx);
    const pData = histogramData[pIdx];
    const monthVal = pData ? pData.totalPeriodo : 0;
    const pct = grandTotalPrevisto > 0 ? (monthVal / grandTotalPrevisto) : 0;

    cell.value = pct;
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF2563EB' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    cell.border = {
      top: { style: 'hair', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'hair', color: { argb: 'FFCBD5E1' } },
      left: { style: 'hair', color: { argb: 'FFCBD5E1' } },
      right: { style: colIdx === lastColSIdx ? 'thin' : 'hair', color: { argb: 'FFCBD5E1' } }
    };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    cell.numFmt = '0.0%';
  });

  curRowS++;

  // Linha 3: DESEMBOLSO ACUMULADO (R$)
  const rowAcumR$ = wsCurvaS.getRow(curRowS);
  rowAcumR$.height = 22;
  rowAcumR$.getCell(2).value = '';
  rowAcumR$.getCell(3).value = 'DESEMBOLSO ACUMULADO (R$):';

  for (let c = 2; c <= 8; c++) {
    const cell = rowAcumR$.getCell(c);
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF312E81' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
    cell.border = {
      top: { style: 'hair', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'hair', color: { argb: 'FFCBD5E1' } },
      left: { style: c === 2 ? 'thin' : 'hair', color: { argb: 'FFCBD5E1' } },
      right: { style: 'hair', color: { argb: 'FFCBD5E1' } }
    };
    if (c === 3) cell.alignment = { horizontal: 'right', vertical: 'middle' };
  }

  columns.forEach((_col, pIdx) => {
    const colIdx = 9 + pIdx;
    const cell = rowAcumR$.getCell(colIdx);
    const pData = histogramData[pIdx];
    const acumVal = pData ? pData.acumuladoR$ : 0;

    cell.value = acumVal;
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF3730A3' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
    cell.border = {
      top: { style: 'hair', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'hair', color: { argb: 'FFCBD5E1' } },
      left: { style: 'hair', color: { argb: 'FFCBD5E1' } },
      right: { style: colIdx === lastColSIdx ? 'thin' : 'hair', color: { argb: 'FFCBD5E1' } }
    };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    cell.numFmt = '_-"R$" * #,##0.00_-;-"R$" * #,##0.00_-;_-"R$" * "-"??_-;_-@_-';
  });

  curRowS++;

  // Linha 4: % AVANÇO ACUMULADO (CURVA S)
  const rowCurvaS = wsCurvaS.getRow(curRowS);
  rowCurvaS.height = 24;
  rowCurvaS.getCell(2).value = '';
  rowCurvaS.getCell(3).value = '% AVANÇO ACUMULADO (CURVA S):';

  for (let c = 2; c <= 8; c++) {
    const cell = rowCurvaS.getCell(c);
    cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FF92400E' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // Soft amber
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFF59E0B' } },
      bottom: { style: 'medium', color: { argb: 'FFD97706' } },
      left: { style: c === 2 ? 'thin' : 'hair', color: { argb: 'FFF59E0B' } },
      right: { style: 'hair', color: { argb: 'FFF59E0B' } }
    };
    if (c === 3) cell.alignment = { horizontal: 'right', vertical: 'middle' };
  }

  columns.forEach((_col, pIdx) => {
    const colIdx = 9 + pIdx;
    const cell = rowCurvaS.getCell(colIdx);
    const pData = histogramData[pIdx];
    const pctAcum = pData ? pData.percentAcumulado : 0;

    cell.value = pctAcum / 100;
    cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFB45309' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFF59E0B' } },
      bottom: { style: 'medium', color: { argb: 'FFD97706' } },
      left: { style: 'hair', color: { argb: 'FFF59E0B' } },
      right: { style: colIdx === lastColSIdx ? 'thin' : 'hair', color: { argb: 'FFF59E0B' } }
    };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    cell.numFmt = '0.0%';
  });

  // ==========================================================================
  // GERAÇÃO E DOWNLOAD DO ARQUIVO
  // ==========================================================================
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const fileName = `Cronograma_Fisico_Financeiro_${(options.codigo || 'BRP').replace(/[\/\\]/g, '_')}_REV${revisao}.xlsx`;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
