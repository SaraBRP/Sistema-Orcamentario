import ExcelJS from 'exceljs';
import { LOGO_SOLUCOES_B64, LOGO_ENGENHARIA_B64 } from './logos';

export interface ExportOrcamentoOptions {
  empresa?: string;
  codigo?: string;
  revisao?: string;
  cliente?: string;
  projeto?: string;
  gestor_cliente?: string;
  responsavel?: string;
  cidade?: string;
  estado?: string;
  itens?: any[];
  memoriaCalculo?: any[];
  distribuicaoEquipe?: any[];
  duracoesMap?: Record<string, string>;
  jornadasMap?: Record<string, string>;
}

export function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (!word) return '';
      return word.replace(/(?:^|[\/\-\(])\w/g, letter => letter.toUpperCase());
    })
    .join(' ');
}

export function buildDistribuicaoEquipeRows(
  itens: any[],
  duracoesMap: Record<string, string> = {},
  jornadasMap: Record<string, string> = {}
) {
  const isMaoDeObra = (item: any) => {
    const cod = (item.codigo || '').trim().toLowerCase();
    if (cod.startsWith('mo.') || cod.startsWith('mo') || cod.includes('mo.')) return true;
    const fonte = (item.banco_fonte || '').trim().toUpperCase();
    if (fonte.includes('MO') || fonte.includes('MÃO DE OBRA')) return true;
    const un = (item.unidade || '').trim().toLowerCase();
    if ((un === 'h' || un === 'hs' || un === 'hr' || un === 'hrs') && (item.valor_unitario_mo > 0 || (item.total_mo && item.total_mo > 0))) return true;
    return false;
  };

  const getDirectParentEap = (eap: string): string => {
    const parts = (eap || '').trim().split('.').filter(Boolean);
    if (parts.length <= 1) return '';
    return parts.slice(0, -1).join('.');
  };

  const compareEap = (a: string, b: string) => {
    const partsA = (a || '').split('.').map(n => parseInt(n, 10) || 0);
    const partsB = (b || '').split('.').map(n => parseInt(n, 10) || 0);
    const maxLen = Math.max(partsA.length, partsB.length);
    for (let i = 0; i < maxLen; i++) {
      const valA = partsA[i] ?? 0;
      const valB = partsB[i] ?? 0;
      if (valA !== valB) return valA - valB;
    }
    return 0;
  };

  const eapMap = new Map<string, any>();
  itens.forEach(i => {
    if (i.item_eap) eapMap.set(i.item_eap.trim(), i);
  });

  const findItemInMap = (targetEap: string): any => {
    const trimmed = targetEap.trim();
    if (eapMap.has(trimmed)) return eapMap.get(trimmed);
    if (eapMap.has(trimmed + '.0')) return eapMap.get(trimmed + '.0');
    if (eapMap.has(trimmed.replace(/\.0$/, ''))) return eapMap.get(trimmed.replace(/\.0$/, ''));
    for (const [key, item] of eapMap.entries()) {
      if ((item.isSecao || item.is_secao || !item.unidade) && (key === trimmed || key.startsWith(trimmed + '.'))) {
        return item;
      }
    }
    return undefined;
  };

  const getSectionForItem = (itemEap: string): { eap: string; descricao: string } => {
    const parts = itemEap.trim().split('.').filter(Boolean);
    const rootNum = parts[0] || '1';
    if (parts.length <= 1) {
      const item = findItemInMap(rootNum);
      return { eap: rootNum, descricao: item?.descricao || rootNum };
    }
    for (let len = parts.length - 1; len >= 1; len--) {
      const ancestorEap = parts.slice(0, len).join('.');
      const ancestorItem = findItemInMap(ancestorEap);
      if (ancestorItem && (ancestorItem.isSecao || ancestorItem.is_secao || !ancestorItem.unidade) && ancestorItem.descricao) {
        return { eap: ancestorEap, descricao: ancestorItem.descricao };
      }
    }
    const rootItem = findItemInMap(rootNum);
    return { eap: rootNum, descricao: rootItem?.descricao || rootNum };
  };

  const compsWithLaborMap = new Map<string, {
    comp: any;
    laborInsumos: Array<{ insumo: any; totalHoras: number }>;
  }>();

  itens.forEach(item => {
    const itemEap = (item.item_eap || '').trim();
    if (!itemEap) return;

    const directLaborChildren = itens.filter(child => {
      const parentEap = getDirectParentEap(child.item_eap);
      return parentEap === itemEap && isMaoDeObra(child);
    });

    if (directLaborChildren.length > 0) {
      directLaborChildren.sort((a, b) => compareEap(a.item_eap, b.item_eap));
      compsWithLaborMap.set(itemEap, {
        comp: item,
        laborInsumos: directLaborChildren.map(ins => ({
          insumo: ins,
          totalHoras: ins.displayQuantidade !== undefined ? ins.displayQuantidade : (ins.quantidade || 0)
        }))
      });
    }
  });

  const sectionsMap = new Map<string, {
    eap: string;
    descricao: string;
    compositions: Array<{
      comp: any;
      laborInsumos: Array<{ insumo: any; totalHoras: number }>;
    }>;
  }>();

  compsWithLaborMap.forEach(({ comp, laborInsumos }) => {
    const { eap: sectionEap, descricao: sectionDesc } = getSectionForItem(comp.item_eap);
    if (!sectionsMap.has(sectionEap)) {
      sectionsMap.set(sectionEap, { eap: sectionEap, descricao: sectionDesc, compositions: [] });
    }
    sectionsMap.get(sectionEap)!.compositions.push({ comp, laborInsumos });
  });

  const sortedSections = Array.from(sectionsMap.values()).sort((a, b) => compareEap(a.eap, b.eap));
  const exportRows: any[] = [];

  sortedSections.forEach(sec => {
    exportRows.push({
      item_eap: sec.eap,
      atividade: `SEÇÃO: ${sec.descricao}`,
      tipo: 'SEÇÃO',
      unidade: '',
      qtd_horas: '',
      duracao: '',
      carga_horaria: '',
      horas_disp: '',
      equipe: ''
    });

    sec.compositions.sort((a, b) => compareEap(a.comp.item_eap, b.comp.item_eap));

    sec.compositions.forEach(({ comp, laborInsumos }) => {
      const durStr = duracoesMap[comp.id] || '';
      const jorStr = jornadasMap[comp.id] || '';

      const dur = parseFloat(durStr);
      const jor = parseFloat(jorStr);

      const hasValidConfig = !isNaN(dur) && dur > 0 && !isNaN(jor) && jor > 0;
      const hrsDisp = hasValidConfig ? dur * jor : 0;

      exportRows.push({
        item_eap: comp.item_eap,
        atividade: comp.descricao,
        tipo: 'COMPOSIÇÃO',
        unidade: comp.unidade || '',
        qtd_horas: comp.quantidade || 0,
        duracao: hasValidConfig ? dur : '-',
        carga_horaria: hasValidConfig ? jor : '-',
        horas_disp: hasValidConfig ? hrsDisp : '-',
        equipe: '-'
      });

      laborInsumos.forEach(({ insumo, totalHoras }) => {
        const eqNecessaria = hasValidConfig && hrsDisp > 0 && totalHoras > 0
          ? Math.ceil(totalHoras / hrsDisp)
          : 0;

        exportRows.push({
          item_eap: insumo.item_eap,
          atividade: `↳ ${toTitleCase(insumo.descricao)}`,
          tipo: 'MÃO DE OBRA',
          unidade: insumo.unidade || 'H',
          qtd_horas: totalHoras,
          duracao: hasValidConfig ? dur : '-',
          carga_horaria: hasValidConfig ? jor : '-',
          horas_disp: hasValidConfig ? hrsDisp : '-',
          equipe: eqNecessaria > 0 ? `${eqNecessaria} Colaboradores` : '-'
        });
      });
    });
  });

  return exportRows;
}

export async function exportarOrcamentoExcelPadrao(options: ExportOrcamentoOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'OrçaBRP - BRP Engenharia';
  workbook.lastModifiedBy = 'OrçaBRP';
  workbook.created = new Date();

  const cliente = options.cliente || 'Não Informado';
  const projeto = options.projeto || 'Não Informado';
  const gestor = options.gestor_cliente || options.responsavel || 'Não Informado';
  const revisao = options.revisao || '00';
  const itens = options.itens && options.itens.length > 0 ? options.itens : [];

  // ==========================================
  // ABA 1: PLANILHA ORÇAMENTÁRIA
  // ==========================================
  const wsOrcamento = workbook.addWorksheet('Planilha Orçamentária', {
    views: [{ showGridLines: false }]
  });

  wsOrcamento.properties.outlineProperties = {
    summaryBelow: false,
    summaryRight: true
  };

  // Configuração de Larguras das Colunas (Iniciando na Coluna B)
  wsOrcamento.getColumn(1).width = 4;   // A
  wsOrcamento.getColumn(2).width = 12;  // B - Item EAP
  wsOrcamento.getColumn(3).width = 14;  // C - Código
  wsOrcamento.getColumn(4).width = 65;  // D - Descrição
  wsOrcamento.getColumn(5).width = 10;  // E - Unidade
  wsOrcamento.getColumn(6).width = 14;  // F - Quantidade
  wsOrcamento.getColumn(7).width = 20;  // G - Mat Unit
  wsOrcamento.getColumn(8).width = 20;  // H - MO Unit
  wsOrcamento.getColumn(9).width = 20;  // I - Valor Unit
  wsOrcamento.getColumn(10).width = 22; // J - Total Mat
  wsOrcamento.getColumn(11).width = 22; // K - Total MO
  wsOrcamento.getColumn(12).width = 24; // L - Total Geral

  // Configuração dos Metadados (Linhas 2 a 5)
  wsOrcamento.getCell('B2').value = 'CLIENTE:';
  wsOrcamento.getCell('B2').font = { bold: true, size: 10, color: { argb: 'FF1E293B' } };
  wsOrcamento.mergeCells('C2:D2');
  wsOrcamento.getCell('C2').value = cliente;
  wsOrcamento.getCell('C2').font = { bold: true, size: 11, color: { argb: 'FF0F172A' } };

  wsOrcamento.getCell('B3').value = 'PROJETO:';
  wsOrcamento.getCell('B3').font = { bold: true, size: 10, color: { argb: 'FF1E293B' } };
  wsOrcamento.mergeCells('C3:D3');
  wsOrcamento.getCell('C3').value = projeto;
  wsOrcamento.getCell('C3').font = { size: 10, color: { argb: 'FF334155' } };

  wsOrcamento.getCell('B4').value = 'GESTOR:';
  wsOrcamento.getCell('B4').font = { bold: true, size: 10, color: { argb: 'FF1E293B' } };
  wsOrcamento.mergeCells('C4:D4');
  wsOrcamento.getCell('C4').value = gestor;
  wsOrcamento.getCell('C4').font = { size: 10, color: { argb: 'FF334155' } };

  wsOrcamento.getCell('B5').value = 'REVISÃO:';
  wsOrcamento.getCell('B5').font = { bold: true, size: 10, color: { argb: 'FF1E293B' } };
  wsOrcamento.mergeCells('C5:D5');
  wsOrcamento.getCell('C5').value = `REV: ${revisao}`;
  wsOrcamento.getCell('C5').font = { size: 10, color: { argb: 'FF334155' } };

  // Aplicação de bordas no bloco de metadados (B2:D5)
  for (let r = 2; r <= 5; r++) {
    for (let c = 2; c <= 4; c++) {
      const cell = wsOrcamento.getCell(r, c);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } }
      };
    }
  }

  // Título Centralizado (Linhas 2 a 5 nas colunas E a J)
  wsOrcamento.mergeCells('E2:J5');
  const titleCell = wsOrcamento.getCell('E2');
  titleCell.value = 'PLANILHA ORÇAMENTÁRIA';
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF0F172A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' }
  };

  // Aplicação de bordas no bloco do título (E2:J5)
  for (let r = 2; r <= 5; r++) {
    for (let c = 5; c <= 10; c++) {
      const cell = wsOrcamento.getCell(r, c);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } }
      };
    }
  }

  // Mescla o bloco da Logo no Cabeçalho (K2:L4) para que as linhas não sobreponham a imagem
  wsOrcamento.mergeCells('K2:L4');
  for (let r = 2; r <= 4; r++) {
    for (let c = 11; c <= 12; c++) {
      const cell = wsOrcamento.getCell(r, c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFFFF' }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } }
      };
    }
  }

  // Inserção da Logo da Empresa no Cabeçalho (Colunas K e L, Linhas 2 a 4)
  const empresaName = options.empresa || 'BRP Soluções Metálicas';
  const empLower = empresaName.toLowerCase();
  const isEngenhariaOnly = empLower.includes('engenharia') && !empLower.includes('soluç') && !empLower.includes('metalic');
  const isSolucoesMetalicas = !isEngenhariaOnly;
  const logoBase64 = isSolucoesMetalicas ? LOGO_SOLUCOES_B64 : LOGO_ENGENHARIA_B64;

  const logoImageId = workbook.addImage({
    base64: logoBase64,
    extension: 'png'
  });

  wsOrcamento.addImage(logoImageId, {
    tl: { col: 10.15, row: 1.15 },
    ext: isSolucoesMetalicas ? { width: 140, height: 50 } : { width: 155, height: 48 }
  });

  // Linhas 8 em diante para dados
  const startRow = 8;
  let currentRow = startRow;

  // Track Nível 1 (Seções Principais) para o somatório final não duplicar/triplicar
  const level1RowIndices: number[] = [];

  if (itens.length === 0) {
    const row = wsOrcamento.getRow(currentRow);
    row.getCell(2).value = '1.0';
    row.getCell(3).value = 'COMP.001';
    row.getCell(4).value = 'SERVIÇOS PRELIMINARES DE INFRAESTRUTURA';
    row.getCell(5).value = 'vb';
    row.getCell(6).value = 1;
    row.getCell(7).value = 0;
    row.getCell(8).value = 0;
    row.getCell(9).value = { formula: `G${currentRow}+H${currentRow}` };
    row.getCell(10).value = { formula: `F${currentRow}*G${currentRow}` };
    row.getCell(11).value = { formula: `F${currentRow}*H${currentRow}` };
    row.getCell(12).value = { formula: `J${currentRow}+K${currentRow}` };
    level1RowIndices.push(currentRow);
    currentRow++;
  } else {
    itens.forEach((item, index) => {
      const row = wsOrcamento.getRow(currentRow);
      const isSeçao = item.isSecao || item.is_secao || item.isSummary || !item.codigo || item.codigo === '-';
      const codLower = String(item.codigo || '').trim().toLowerCase();

      const isInsumo = !isSeçao && (
        codLower.startsWith('mat.') ||
        codLower.startsWith('mo.') ||
        codLower.startsWith('eq.') ||
        codLower.startsWith('trans.') ||
        codLower.startsWith('alg.') ||
        codLower.startsWith('serv.') ||
        codLower.startsWith('ins.') ||
        codLower.startsWith('ver.')
      );

      const isComposicaoOuSeçao = !isInsumo;

      const itemEap = String(item.item_eap || item.item || `${index + 1}`).trim();
      row.outlineLevel = (itemEap.match(/\./g) || []).length;

      if (!itemEap.includes('.')) {
        level1RowIndices.push(currentRow);
      }

      const matUnit = Number(item.valor_unitario_mat ?? item.valor_material_unitario ?? item.mat_unit ?? 0);
      const moUnit = Number(item.valor_unitario_mo ?? item.valor_mao_obra_unitario ?? item.mo_unit ?? 0);
      const qtd = Number(item.quantidade ?? item.qtd ?? 0);

      const totalMat = Number(item.total_mat ?? (qtd * matUnit));
      const totalMo = Number(item.total_mo ?? (qtd * moUnit));

      const rawDesc = item.descricao || item.nome || '';
      const descricao = isInsumo ? toTitleCase(rawDesc) : rawDesc;

      row.getCell(2).value = itemEap;
      row.getCell(3).value = item.codigo || '-';
      row.getCell(4).value = descricao;
      row.getCell(5).value = isSeçao ? '' : (item.unidade || item.und || '');

      if (isSeçao) {
        row.getCell(6).value = '';
        row.getCell(7).value = '';
        row.getCell(8).value = '';
        row.getCell(9).value = '';
        row.getCell(10).value = totalMat;
        row.getCell(11).value = totalMo;
        row.getCell(12).value = { formula: `J${currentRow}+K${currentRow}` };
      } else {
        row.getCell(6).value = qtd;
        row.getCell(7).value = matUnit;
        row.getCell(8).value = moUnit;
        row.getCell(9).value = { formula: `G${currentRow}+H${currentRow}` };
        row.getCell(10).value = { formula: `F${currentRow}*G${currentRow}` };
        row.getCell(11).value = { formula: `F${currentRow}*H${currentRow}` };
        row.getCell(12).value = { formula: `J${currentRow}+K${currentRow}` };
      }

      // Estilização das linhas de dados: Negrito para Seções e Composições, Normal/TitleCase para Insumos
      const isLastRow = index === itens.length - 1;

      for (let col = 2; col <= 12; col++) {
        const cell = row.getCell(col);
        cell.font = { name: 'Calibri', size: 10, bold: isComposicaoOuSeçao, color: { argb: 'FF1E293B' } };
        
        if (isSeçao) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
        } else if (isComposicaoOuSeçao) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }

        cell.border = {
          top: { style: 'hair', color: { argb: 'FF94A3B8' } },
          bottom: { style: isLastRow ? 'thin' : 'hair', color: { argb: 'FF94A3B8' } },
          left: { style: col === 2 ? 'thin' : 'hair', color: { argb: 'FF94A3B8' } },
          right: { style: col === 12 ? 'thin' : 'hair', color: { argb: 'FF94A3B8' } }
        };

        // Alinhamento & Quebra Automática de Texto na Coluna 4 (Descrição)
        if (col === 4) {
          cell.alignment = { vertical: 'middle', wrapText: true };
        } else {
          cell.alignment = { vertical: 'middle' };
        }

        // Formatação numéricas (Contábil R$ para todas as colunas de valor/total 7 a 12, inclusive fórmulas)
        if (col === 6) cell.numFmt = '#,##0.00';
        if (col >= 7 && col <= 12) cell.numFmt = 'R$ #,##0.00';
      }

      currentRow++;
    });
  }

  const lastDataRow = currentRow - 1;
  const summaryHeaderRow = currentRow + 1;
  const summaryValueRow = currentRow + 2;

  // Badge Total no Cabeçalho (K5:L5) apontando dinamicamente para o Total Geral
  wsOrcamento.mergeCells('K5:L5');
  const badgeCell = wsOrcamento.getCell('K5');
  badgeCell.value = { formula: `L${summaryValueRow}` };
  badgeCell.font = { name: 'Calibri', bold: true, size: 14, color: { argb: 'FF0F172A' } };
  badgeCell.alignment = { horizontal: 'center', vertical: 'middle' };
  badgeCell.numFmt = 'R$ #,##0.00';
  badgeCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' }
  };
  for (let c = 11; c <= 12; c++) {
    const cell = wsOrcamento.getCell(5, c);
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } }
    };
  }

  // Cabeçalho da Tabela (Linha 7) - Cinza Escuro com Letras Brancas em Negrito
  const tableHeaderRow = wsOrcamento.getRow(7);
  tableHeaderRow.height = 26;
  const headersSheet1 = [
    'Item EAP', 'Código', 'Descrição do Serviço / Seção', 'Unidade', 'Quantidade',
    'Valor Mat. Unit (R$)', 'Valor M.O. Unit (R$)', 'Valor Unitário (R$)',
    'Total Material (R$)', 'Total Mão de Obra (R$)', 'Total Geral (R$)'
  ];

  headersSheet1.forEach((txt, idx) => {
    const colIdx = idx + 2;
    const cell = tableHeaderRow.getCell(colIdx);
    cell.value = txt;
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'hair', color: { argb: 'FF94A3B8' } },
      left: { style: colIdx === 2 ? 'thin' : 'hair', color: { argb: 'FF94A3B8' } },
      right: { style: colIdx === 12 ? 'thin' : 'hair', color: { argb: 'FF94A3B8' } }
    };
  });

  // Bloco de Totais do Rodapé (Após a tabela) - Bordas próprias isoladas
  wsOrcamento.getCell(`J${summaryHeaderRow}`).value = 'TOTAL MAT.';
  wsOrcamento.getCell(`K${summaryHeaderRow}`).value = 'TOTAL MO.';
  wsOrcamento.getCell(`L${summaryHeaderRow}`).value = 'VALOR TOTAL';

  [10, 11, 12].forEach(col => {
    const cell = wsOrcamento.getRow(summaryHeaderRow).getCell(col);
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF0F172A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } }
    };
  });

  // Fórmulas exatas de somatório evitando duplicação hierárquica
  if (level1RowIndices.length > 0) {
    const sumJ = level1RowIndices.map(r => `J${r}`).join('+');
    const sumK = level1RowIndices.map(r => `K${r}`).join('+');
    wsOrcamento.getCell(`J${summaryValueRow}`).value = { formula: sumJ };
    wsOrcamento.getCell(`K${summaryValueRow}`).value = { formula: sumK };
  } else {
    wsOrcamento.getCell(`J${summaryValueRow}`).value = { formula: `SUM(J8:J${lastDataRow})` };
    wsOrcamento.getCell(`K${summaryValueRow}`).value = { formula: `SUM(K8:K${lastDataRow})` };
  }
  wsOrcamento.getCell(`L${summaryValueRow}`).value = { formula: `J${summaryValueRow}+K${summaryValueRow}` };

  [10, 11, 12].forEach(col => {
    const cell = wsOrcamento.getRow(summaryValueRow).getCell(col);
    cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FF0F172A' } };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    cell.numFmt = 'R$ #,##0.00';
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } }
    };
  });

  // ==========================================
  // ABA 2: MEMÓRIA DE CÁLCULO
  // ==========================================
  const wsMemoria = workbook.addWorksheet('Memória de Cálculo', {
    views: [{ showGridLines: false }]
  });

  wsMemoria.properties.outlineProperties = {
    summaryBelow: false,
    summaryRight: true
  };

  wsMemoria.getColumn(1).width = 4;
  wsMemoria.getColumn(2).width = 12; // Item EAP
  wsMemoria.getColumn(3).width = 14; // Tipo
  wsMemoria.getColumn(4).width = 65; // Descrição
  wsMemoria.getColumn(5).width = 10; // Unidade
  wsMemoria.getColumn(6).width = 14; // Quantidade
  wsMemoria.getColumn(7).width = 25; // Equação Literal
  wsMemoria.getColumn(8).width = 25; // Substituição Numérica
  wsMemoria.getColumn(9).width = 40; // Observação / Memória

  wsMemoria.getCell('B2').value = 'CLIENTE:';
  wsMemoria.getCell('B2').font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF1E293B' } };
  wsMemoria.mergeCells('C2:D2');
  wsMemoria.getCell('C2').value = cliente;
  wsMemoria.getCell('C2').font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FF0F172A' } };

  wsMemoria.getCell('B3').value = 'PROJETO:';
  wsMemoria.getCell('B3').font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF1E293B' } };
  wsMemoria.mergeCells('C3:D3');
  wsMemoria.getCell('C3').value = projeto;
  wsMemoria.getCell('C3').font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };

  wsMemoria.getCell('B4').value = 'GESTOR:';
  wsMemoria.getCell('B4').font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF1E293B' } };
  wsMemoria.mergeCells('C4:D4');
  wsMemoria.getCell('C4').value = gestor;
  wsMemoria.getCell('C4').font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };

  wsMemoria.getCell('B5').value = 'REVISÃO:';
  wsMemoria.getCell('B5').font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF1E293B' } };
  wsMemoria.mergeCells('C5:D5');
  wsMemoria.getCell('C5').value = `REV: ${revisao}`;
  wsMemoria.getCell('C5').font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };

  // Aplicação de bordas no bloco de metadados (B2:D5)
  for (let r = 2; r <= 5; r++) {
    for (let c = 2; c <= 4; c++) {
      const cell = wsMemoria.getCell(r, c);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } }
      };
    }
  }

  wsMemoria.mergeCells('E2:I5');
  const titleMemoria = wsMemoria.getCell('E2');
  titleMemoria.value = 'MEMORIAL DE CÁLCULO';
  titleMemoria.font = { name: 'Calibri', bold: true, size: 14, color: { argb: 'FF0F172A' } };
  titleMemoria.alignment = { horizontal: 'center', vertical: 'middle' };
  titleMemoria.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

  // Aplicação de bordas no bloco do título (E2:I5)
  for (let r = 2; r <= 5; r++) {
    for (let c = 5; c <= 9; c++) {
      const cell = wsMemoria.getCell(r, c);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } }
      };
    }
  }

  const headerMemoriaRow = wsMemoria.getRow(7);
  headerMemoriaRow.height = 26;
  const headersSheet2 = [
    'Item EAP', 'Tipo', 'Descrição do Serviço', 'Unidade', 'Quantidade',
    'Equação Literal', 'Substituição Numérica', 'Observação / Memória'
  ];

  headersSheet2.forEach((txt, idx) => {
    const colIdx = idx + 2;
    const cell = headerMemoriaRow.getCell(colIdx);
    cell.value = txt;
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'hair', color: { argb: 'FF94A3B8' } },
      left: { style: colIdx === 2 ? 'thin' : 'hair', color: { argb: 'FF94A3B8' } },
      right: { style: colIdx === 9 ? 'thin' : 'hair', color: { argb: 'FF94A3B8' } }
    };
  });

  const memoriaRows = options.memoriaCalculo && options.memoriaCalculo.length > 0
    ? options.memoriaCalculo
    : itens.map((item, i) => ({
        item_eap: item.item_eap || `${i + 1}`,
        tipo: item.codigo ? 'Composição' : 'Seção',
        descricao: item.descricao || item.nome,
        unidade: item.unidade || item.und,
        quantidade: item.quantidade || item.qtd || 0,
        equacao_literal: '',
        substituicao_numerica: '',
        observacao: ''
      }));

  memoriaRows.forEach((m, i) => {
    const rIdx = 8 + i;
    const row = wsMemoria.getRow(rIdx);
    const itemEap = String(m.item_eap || `${i + 1}`).trim();
    row.outlineLevel = (itemEap.match(/\./g) || []).length;

    const codLower = String(m.codigo || '').trim().toLowerCase();
    const isSeçao = m.isSecao || m.is_secao || !m.codigo || m.codigo === '-';
    const isInsumo = !isSeçao && (
      codLower.startsWith('mat.') ||
      codLower.startsWith('mo.') ||
      codLower.startsWith('eq.') ||
      codLower.startsWith('trans.') ||
      codLower.startsWith('alg.') ||
      codLower.startsWith('serv.') ||
      codLower.startsWith('ins.') ||
      m.tipo === 'Insumo'
    );
    const isComposicaoOuSeçao = !isInsumo;

    const rawDesc = m.descricao || '';
    const descricao = isInsumo ? toTitleCase(rawDesc) : rawDesc;
    const isLastRow = i === memoriaRows.length - 1;

    row.getCell(2).value = itemEap;
    row.getCell(3).value = m.tipo || (isInsumo ? 'Insumo' : (m.codigo ? 'Composição' : 'Seção'));
    row.getCell(4).value = descricao;
    row.getCell(5).value = m.unidade || '';
    row.getCell(6).value = Number(m.quantidade || 0);
    row.getCell(7).value = m.equacaoLiteral || m.equacao_literal || '';
    row.getCell(8).value = m.substituicaoNumerica || m.substituicao_numerica || '';
    row.getCell(9).value = m.observacaoMemoria || m.observacao_memoria || m.observacao || '';

    for (let col = 2; col <= 9; col++) {
      const cell = row.getCell(col);
      cell.font = { name: 'Calibri', size: 10, bold: isComposicaoOuSeçao, color: { argb: 'FF1E293B' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isSeçao ? 'FFE2E8F0' : (isComposicaoOuSeçao ? 'FFF8FAFC' : 'FFFFFFFF') }
      };
      cell.border = {
        top: { style: 'hair', color: { argb: 'FF94A3B8' } },
        bottom: { style: isLastRow ? 'thin' : 'hair', color: { argb: 'FF94A3B8' } },
        left: { style: col === 2 ? 'thin' : 'hair', color: { argb: 'FF94A3B8' } },
        right: { style: col === 9 ? 'thin' : 'hair', color: { argb: 'FF94A3B8' } }
      };

      if (col === 4 || col === 7 || col === 8 || col === 9) {
        cell.alignment = { vertical: 'middle', wrapText: true };
      } else {
        cell.alignment = { vertical: 'middle' };
      }

      if (col === 6) cell.numFmt = '#,##0.00';
    }
  });

  // ==========================================
  // ABA 3: DISTRIBUIÇÃO DE EQUIPE
  // ==========================================
  const wsEquipe = workbook.addWorksheet('Distribuição de Equipe', {
    views: [{ showGridLines: false }]
  });

  wsEquipe.properties.outlineProperties = {
    summaryBelow: false,
    summaryRight: true
  };

  wsEquipe.getColumn(1).width = 4;
  wsEquipe.getColumn(2).width = 12; // Item EAP
  wsEquipe.getColumn(3).width = 55; // Estrutura / Mão de Obra
  wsEquipe.getColumn(4).width = 14; // Tipo
  wsEquipe.getColumn(5).width = 10; // Unidade
  wsEquipe.getColumn(6).width = 18; // Qtd Totais
  wsEquipe.getColumn(7).width = 14; // Duração (Dias)
  wsEquipe.getColumn(8).width = 16; // Carga Horária
  wsEquipe.getColumn(9).width = 22; // Horas Disp / Pessoa
  wsEquipe.getColumn(10).width = 18; // Equipe Necessária

  wsEquipe.getCell('B2').value = 'CLIENTE:';
  wsEquipe.getCell('B2').font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF1E293B' } };
  wsEquipe.mergeCells('C2:C2');
  wsEquipe.getCell('C2').value = cliente;
  wsEquipe.getCell('C2').font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FF0F172A' } };

  wsEquipe.getCell('B3').value = 'PROJETO:';
  wsEquipe.getCell('B3').font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF1E293B' } };
  wsEquipe.getCell('C3').value = projeto;
  wsEquipe.getCell('C3').font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };

  wsEquipe.getCell('B4').value = 'GESTOR:';
  wsEquipe.getCell('B4').font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF1E293B' } };
  wsEquipe.getCell('C4').value = gestor;
  wsEquipe.getCell('C4').font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };

  wsEquipe.getCell('B5').value = 'REVISÃO:';
  wsEquipe.getCell('B5').font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF1E293B' } };
  wsEquipe.getCell('C5').value = `REV: ${revisao}`;
  wsEquipe.getCell('C5').font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };

  // Aplicação de bordas no bloco de metadados (B2:C5)
  for (let r = 2; r <= 5; r++) {
    for (let c = 2; c <= 3; c++) {
      const cell = wsEquipe.getCell(r, c);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } }
      };
    }
  }

  wsEquipe.mergeCells('D2:J5');
  const titleEquipe = wsEquipe.getCell('D2');
  titleEquipe.value = 'DISTRIBUIÇÃO DE EQUIPE';
  titleEquipe.font = { name: 'Calibri', bold: true, size: 14, color: { argb: 'FF0F172A' } };
  titleEquipe.alignment = { horizontal: 'center', vertical: 'middle' };
  titleEquipe.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

  // Aplicação de bordas no bloco do título (D2:J5)
  for (let r = 2; r <= 5; r++) {
    for (let c = 4; c <= 10; c++) {
      const cell = wsEquipe.getCell(r, c);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } }
      };
    }
  }

  const headerEquipeRow = wsEquipe.getRow(7);
  headerEquipeRow.height = 26;
  const headersSheet3 = [
    'Item EAP', 'Estrutura / Seção / Atividade / Mão de Obra', 'Tipo', 'Unidade',
    'Qtd / Horas Totais', 'Duração (Dias)', 'Carga Horária (h/dia)',
    'Horas Disponíveis / Pessoa', 'Equipe Necessária'
  ];

  headersSheet3.forEach((txt, idx) => {
    const colIdx = idx + 2;
    const cell = headerEquipeRow.getCell(colIdx);
    cell.value = txt;
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'hair', color: { argb: 'FF94A3B8' } },
      left: { style: colIdx === 2 ? 'thin' : 'hair', color: { argb: 'FF94A3B8' } },
      right: { style: colIdx === 10 ? 'thin' : 'hair', color: { argb: 'FF94A3B8' } }
    };
  });

  // Constrói linhas reais da Distribuição de Equipe se não forem passadas
  const equipeRows = (options.distribuicaoEquipe && options.distribuicaoEquipe.length > 0)
    ? options.distribuicaoEquipe
    : buildDistribuicaoEquipeRows(itens, options.duracoesMap, options.jornadasMap);

  equipeRows.forEach((eq, i) => {
    const rIdx = 8 + i;
    const row = wsEquipe.getRow(rIdx);

    const itemEap = eq.item_eap || eq['Item EAP'] || `${i + 1}`;
    row.outlineLevel = (String(itemEap).match(/\./g) || []).length;

    const atividade = eq.atividade || eq['Estrutura / Seção / Atividade / Mão de Obra'] || eq.nome || '';
    const tipo = eq.tipo || eq['Tipo'] || 'MÃO DE OBRA';
    const unidade = eq.unidade || eq['Unidade'] || '';
    const qtdHoras = eq.qtd_horas ?? eq['Qtd / Horas Totais'] ?? '';
    const duracao = eq.duracao ?? eq['Duração (Dias)'] ?? '';
    const cargaHoraria = eq.carga_horaria ?? eq['Carga Horária (h/dia)'] ?? '';
    const horasDisp = eq.horas_disp ?? eq['Horas Disponíveis / Pessoa'] ?? '';
    const equipe = eq.equipe ?? eq['Equipe Necessária'] ?? '';

    const isComposicaoOuSeçao = tipo === 'SEÇÃO' || tipo === 'COMPOSIÇÃO';
    const isLastRow = i === equipeRows.length - 1;

    row.getCell(2).value = itemEap;
    row.getCell(3).value = atividade;
    row.getCell(4).value = tipo;
    row.getCell(5).value = unidade;
    row.getCell(6).value = typeof qtdHoras === 'number' ? qtdHoras : qtdHoras;
    row.getCell(7).value = typeof duracao === 'number' ? duracao : duracao;
    row.getCell(8).value = typeof cargaHoraria === 'number' ? cargaHoraria : cargaHoraria;
    row.getCell(9).value = typeof horasDisp === 'number' ? horasDisp : horasDisp;
    row.getCell(10).value = equipe;

    for (let col = 2; col <= 10; col++) {
      const cell = row.getCell(col);
      cell.font = { name: 'Calibri', size: 10, bold: isComposicaoOuSeçao, color: { argb: 'FF1E293B' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: (tipo === 'SEÇÃO') ? 'FFE2E8F0' : (tipo === 'COMPOSIÇÃO' ? 'FFF8FAFC' : 'FFFFFFFF') }
      };
      cell.border = {
        top: { style: 'hair', color: { argb: 'FF94A3B8' } },
        bottom: { style: isLastRow ? 'thin' : 'hair', color: { argb: 'FF94A3B8' } },
        left: { style: col === 2 ? 'thin' : 'hair', color: { argb: 'FF94A3B8' } },
        right: { style: col === 10 ? 'thin' : 'hair', color: { argb: 'FF94A3B8' } }
      };

      if (col === 3) {
        cell.alignment = { vertical: 'middle', wrapText: true };
      } else {
        cell.alignment = { vertical: 'middle' };
      }

      if ((col === 6 || col === 7 || col === 8 || col === 9) && typeof cell.value === 'number') {
        cell.numFmt = '#,##0.00';
      }
    }
  });

  // Gerar o buffer Excel e acionar o download no navegador
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const fileName = `Orçamento_${(options.codigo || 'BRP').replace(/\//g, '_')}_REV${revisao}.xlsx`;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

export async function exportarPlanilhaClientePreenchida(options: {
  nome_arquivo?: string;
  cliente?: string;
  projeto?: string;
  items: any[];
  bdiFactor?: number;
}) {
  const bdiFactor = options.bdiFactor || 1;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Planilha Orçamentária Cliente');

  sheet.views = [
    { state: 'frozen', xSplit: 0, ySplit: 4 }
  ];

  sheet.pageSetup.orientation = 'landscape';
  sheet.pageSetup.fitToPage = true;
  sheet.pageSetup.fitToWidth = 1;
  sheet.pageSetup.fitToHeight = 0;

  // Banner Header BRP
  sheet.mergeCells('A1:J1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'BRP ENGENHARIA - PLANILHA ORÇAMENTÁRIA DO CLIENTE PREENCHIDA';
  titleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 28;

  // Meta Informações
  sheet.mergeCells('A2:J2');
  const metaCell = sheet.getCell('A2');
  metaCell.value = `Projeto: ${options.projeto || 'Orçamento'} | Cliente: ${options.cliente || 'Não Informado'} | Data: ${new Date().toLocaleDateString('pt-BR')}`;
  metaCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: '475569' } };
  metaCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(2).height = 20;

  sheet.addRow([]);

  // Cabeçalhos das Colunas
  const headerRow = sheet.addRow([
    'EAP',
    'ITEM CLIENTE',
    'UND.',
    'QTDE.',
    'MAT. UNIT. (R$)',
    'M.O. UNIT. (R$)',
    'VALOR UNIT. (R$)',
    'MAT. TOTAL (R$)',
    'M.O. TOTAL (R$)',
    'TOTAL (R$)'
  ]);

  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E40AF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: '94A3B8' } },
      bottom: { style: 'medium', color: { argb: '1E3A8A' } },
      left: { style: 'thin', color: { argb: '94A3B8' } },
      right: { style: 'thin', color: { argb: '94A3B8' } }
    };
  });

  const validItems = (options.items || []).filter(i => i.status_linha !== 'inativo' && i.status_linha !== 'inserido_empresa');
  const exportableItems = validItems.filter(i => i.status_linha !== 'desdobrado');

  function getBreakdownForItem(item: any, allItems: any[]) {
    const isDescendant = (parentEap: string, childEap: string) => {
      if (!parentEap || !childEap || parentEap === childEap) return false;
      return childEap.startsWith(parentEap + '.');
    };

    const isMo = (ins: any) => {
      if (!ins) return false;
      const tipo = String(ins.tipo || ins.tipo_insumo || '').toLowerCase();
      const desc = String(ins.descricao || ins.nome || '').toLowerCase();
      return tipo.includes('mão') || tipo.includes('mao') || tipo.includes('serviço') || tipo.includes('servico') || desc.includes('mão de obra') || desc.includes('mao de obra');
    };

    const descendants = allItems.filter(it => it.status_linha !== 'inativo' && isDescendant(item.item_eap, it.item_eap));
    const leafInsumos = descendants.filter(it => it.status_linha === 'desdobrado' || (it.insumo_id && !allItems.some(c => c.status_linha !== 'inativo' && c.item_eap.startsWith(it.item_eap + '.'))));

    let matTotal = 0;
    let moTotal = 0;

    if (leafInsumos.length > 0) {
      leafInsumos.forEach(it => {
        if (isMo(it.insumo || it.composicao)) {
          moTotal += (it.total_empresa || 0);
        } else {
          matTotal += (it.total_empresa || 0);
        }
      });
    } else {
      const valTotal = item.total_empresa || 0;
      if (item.composicao && (item.composicao.valor_unitario_mat !== undefined || item.composicao.valor_unitario_mo !== undefined)) {
        const qty = item.quantidade || 1;
        matTotal = (item.composicao.valor_unitario_mat || 0) * qty;
        moTotal = (item.composicao.valor_unitario_mo || 0) * qty;
      } else if (item.valor_unitario_mat_empresa !== undefined || item.valor_unitario_mo_empresa !== undefined) {
        const qty = item.quantidade || 1;
        matTotal = (item.valor_unitario_mat_empresa || 0) * qty;
        moTotal = (item.valor_unitario_mo_empresa || 0) * qty;
      } else {
        const isMoType = isMo(item.insumo || item.composicao);
        if (isMoType) {
          moTotal = valTotal;
        } else {
          matTotal = valTotal;
        }
      }
    }

    const qty = item.quantidade || 1;
    const rawTotal = (matTotal + moTotal) > 0 ? (matTotal + moTotal) : (item.total_empresa || 0);
    const rawUnitTotal = item.valor_unitario_empresa || (qty > 0 ? rawTotal / qty : rawTotal);

    const matUnit = (qty > 0 ? matTotal / qty : matTotal) * bdiFactor;
    const moUnit = (qty > 0 ? moTotal / qty : moTotal) * bdiFactor;
    const unitTotal = rawUnitTotal * bdiFactor;
    const matTot = matTotal * bdiFactor;
    const moTot = moTotal * bdiFactor;
    const total = rawTotal * bdiFactor;

    return {
      matUnit,
      moUnit,
      unitTotal,
      matTotal: matTot,
      moTotal: moTot,
      total
    };
  }

  const getSectionSubtotals = (sectionEap: string) => {
    let matSum = 0;
    let moSum = 0;

    validItems.forEach(it => {
      const isChild = (it.item_eap || '').startsWith(sectionEap + '.');
      const isOperational = it.status_linha !== 'desdobrado' && (it.quantidade > 0 || it.composicao_id || it.insumo_id);
      if (isChild && isOperational) {
        const breakD = getBreakdownForItem(it, validItems);
        matSum += breakD.matTotal;
        moSum += breakD.moTotal;
      }
    });

    return { matTotal: matSum, moTotal: moSum, total: matSum + moSum };
  };

  let grandMatTotal = 0;
  let grandMoTotal = 0;

  exportableItems.forEach((item) => {
    const isSection = (!item.quantidade || item.quantidade === 0) && !item.composicao_id && !item.insumo_id && item.status_linha !== 'desdobrado';
    const breakdown = getBreakdownForItem(item, validItems);

    if (!isSection) {
      grandMatTotal += breakdown.matTotal;
      grandMoTotal += breakdown.moTotal;
    }

    let rowValues: any[];
    if (isSection) {
      const subtotals = getSectionSubtotals(item.item_eap);
      rowValues = [
        item.item_eap,
        item.descricao,
        '',
        '',
        '',
        '',
        '',
        subtotals.matTotal > 0 ? subtotals.matTotal : '',
        subtotals.moTotal > 0 ? subtotals.moTotal : '',
        subtotals.total > 0 ? subtotals.total : ''
      ];
    } else {
      rowValues = [
        item.item_eap,
        item.descricao,
        item.unidade || 'un',
        item.quantidade || 0,
        breakdown.matUnit > 0 ? breakdown.matUnit : 0,
        breakdown.moUnit > 0 ? breakdown.moUnit : 0,
        breakdown.unitTotal > 0 ? breakdown.unitTotal : 0,
        breakdown.matTotal > 0 ? breakdown.matTotal : 0,
        breakdown.moTotal > 0 ? breakdown.moTotal : 0,
        breakdown.total > 0 ? breakdown.total : 0
      ];
    }

    const row = sheet.addRow(rowValues);
    row.height = 20;

    const eapDepth = (item.item_eap || '').split('.').filter(Boolean).length;

    row.eachCell((cell, colNum) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'CBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
        left: { style: 'thin', color: { argb: 'CBD5E1' } },
        right: { style: 'thin', color: { argb: 'CBD5E1' } }
      };

      if (isSection) {
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '0F172A' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: eapDepth === 1 ? 'FFE2E8F0' : 'FFF1F5F9' }
        };
      } else {
        cell.font = { name: 'Calibri', size: 9.5, color: { argb: '334155' } };
      }

      if (colNum === 1) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else if (colNum === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else if (colNum === 3) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colNum === 4) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        if (typeof cell.value === 'number') {
          cell.numFmt = '#,##0.00';
        }
      } else if (colNum >= 5) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        if (typeof cell.value === 'number') {
          cell.numFmt = '"R$" #,##0.00';
        }
      }
    });
  });

  // Saltando uma linha em branco e adicionando a linha de TOTAL GERAL
  sheet.addRow([]);

  const grandTotal = grandMatTotal + grandMoTotal;

  const totalRowValues = [
    '',
    '',
    '',
    '',
    '',
    '',
    'TOTAL:',
    grandMatTotal > 0 ? grandMatTotal : 0,
    grandMoTotal > 0 ? grandMoTotal : 0,
    grandTotal > 0 ? grandTotal : 0
  ];

  const totalRow = sheet.addRow(totalRowValues);
  totalRow.height = 24;

  totalRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
    if (colNum >= 7 && colNum <= 10) {
      const isGrandTotal = colNum === 10;
      cell.font = {
        name: 'Calibri',
        size: 11,
        bold: true,
        color: { argb: isGrandTotal ? '1E3A8A' : '0F172A' }
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'E2E8F0' }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: '94A3B8' } },
        bottom: { style: 'medium', color: { argb: '1E3A8A' } },
        left: { style: 'thin', color: { argb: 'CBD5E1' } },
        right: { style: 'thin', color: { argb: 'CBD5E1' } }
      };

      if (colNum === 7) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        if (typeof cell.value === 'number') {
          cell.numFmt = '"R$" #,##0.00';
        }
      }
    }
  });

  sheet.getColumn(1).width = 12;
  sheet.getColumn(2).width = 55;
  sheet.getColumn(3).width = 8;
  sheet.getColumn(4).width = 12;
  sheet.getColumn(5).width = 16;
  sheet.getColumn(6).width = 16;
  sheet.getColumn(7).width = 16;
  sheet.getColumn(8).width = 18;
  sheet.getColumn(9).width = 18;
  sheet.getColumn(10).width = 20;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${(options.projeto || 'Orcamento').replace(/[\/\\]/g, '_')}_Planilha_Cliente_Preenchida.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
