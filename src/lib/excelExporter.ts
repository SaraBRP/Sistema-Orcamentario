import ExcelJS from 'exceljs';

export interface ExportOrcamentoOptions {
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
    views: [{ showGridLines: true }]
  });

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

  // Linhas 8 em diante para dados
  const startRow = 8;
  let currentRow = startRow;

  if (itens.length === 0) {
    // Exemplo de linha se não houver itens fornecidos
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
    currentRow++;
  } else {
    itens.forEach((item, index) => {
      const row = wsOrcamento.getRow(currentRow);
      const isSeçao = item.tipo === 'secao' || item.tipo === 'etapa' || !item.codigo;

      row.getCell(2).value = item.item_eap || item.item || `${index + 1}`;
      row.getCell(3).value = item.codigo || '-';
      row.getCell(4).value = item.descricao || item.nome || '';
      row.getCell(5).value = item.unidade || item.und || '';
      row.getCell(6).value = Number(item.quantidade || item.qtd || 0);
      row.getCell(7).value = Number(item.valor_material_unitario || item.mat_unit || 0);
      row.getCell(8).value = Number(item.valor_mao_obra_unitario || item.mo_unit || 0);

      // Fórmulas
      row.getCell(9).value = { formula: `G${currentRow}+H${currentRow}` };
      row.getCell(10).value = { formula: `F${currentRow}*G${currentRow}` };
      row.getCell(11).value = { formula: `F${currentRow}*H${currentRow}` };
      row.getCell(12).value = { formula: `J${currentRow}+K${currentRow}` };

      // Estilização das linhas de dados
      for (let col = 2; col <= 12; col++) {
        const cell = row.getCell(col);
        cell.font = { size: 10, bold: isSeçao, color: { argb: 'FF1E293B' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isSeçao ? 'FFE2E8F0' : 'FFF8FAFC' }
        };
        cell.border = {
          top: { style: 'dotted', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'dotted', color: { argb: 'FFCBD5E1' } },
          left: { style: 'dotted', color: { argb: 'FFCBD5E1' } },
          right: { style: 'dotted', color: { argb: 'FFCBD5E1' } }
        };

        // Formatação numéricas
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
  badgeCell.font = { bold: true, size: 14, color: { argb: 'FF0F172A' } };
  badgeCell.alignment = { horizontal: 'center', vertical: 'middle' };
  badgeCell.numFmt = 'R$ #,##0.00';
  badgeCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' }
  };
  badgeCell.border = {
    top: { style: 'medium', color: { argb: 'FF0F172A' } },
    bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
    left: { style: 'medium', color: { argb: 'FF0F172A' } },
    right: { style: 'medium', color: { argb: 'FF0F172A' } }
  };

  // Cabeçalho da Tabela (Linha 7) - Laranja com Letras Brancas em Negrito
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
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFED7D31' } // Laranja corporativo vibrante
    };
  });

  // Bloco de Totais do Rodapé (Após a tabela)
  wsOrcamento.getCell(`J${summaryHeaderRow}`).value = 'TOTAL MAT.';
  wsOrcamento.getCell(`K${summaryHeaderRow}`).value = 'TOTAL MO.';
  wsOrcamento.getCell(`L${summaryHeaderRow}`).value = 'VALOR TOTAL';

  [10, 11, 12].forEach(col => {
    const cell = wsOrcamento.getRow(summaryHeaderRow).getCell(col);
    cell.font = { bold: true, size: 10, color: { argb: 'FF0F172A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } }
    };
  });

  wsOrcamento.getCell(`J${summaryValueRow}`).value = { formula: `SUM(J8:J${lastDataRow})` };
  wsOrcamento.getCell(`K${summaryValueRow}`).value = { formula: `SUM(K8:K${lastDataRow})` };
  wsOrcamento.getCell(`L${summaryValueRow}`).value = { formula: `J${summaryValueRow}+K${summaryValueRow}` };

  [10, 11, 12].forEach(col => {
    const cell = wsOrcamento.getRow(summaryValueRow).getCell(col);
    cell.font = { bold: true, size: 11, color: { argb: 'FF0F172A' } };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    cell.numFmt = 'R$ #,##0.00';
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } }
    };
  });

  // Contorno Externo Preto Espesso na Tabela da Sheet 1
  for (let r = 7; r <= summaryValueRow; r++) {
    wsOrcamento.getRow(r).getCell(2).border = { ...wsOrcamento.getRow(r).getCell(2).border, left: { style: 'medium', color: { argb: 'FF000000' } } };
    wsOrcamento.getRow(r).getCell(12).border = { ...wsOrcamento.getRow(r).getCell(12).border, right: { style: 'medium', color: { argb: 'FF000000' } } };
  }
  for (let c = 2; c <= 12; c++) {
    wsOrcamento.getRow(7).getCell(c).border = { ...wsOrcamento.getRow(7).getCell(c).border, top: { style: 'medium', color: { argb: 'FF000000' } } };
    wsOrcamento.getRow(summaryValueRow).getCell(c).border = { ...wsOrcamento.getRow(summaryValueRow).getCell(c).border, bottom: { style: 'medium', color: { argb: 'FF000000' } } };
  }

  // ==========================================
  // ABA 2: MEMÓRIA DE CÁLCULO
  // ==========================================
  const wsMemoria = workbook.addWorksheet('Memória de Cálculo', {
    views: [{ showGridLines: true }]
  });

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
  wsMemoria.getCell('B2').font = { bold: true, size: 10 };
  wsMemoria.mergeCells('C2:D2');
  wsMemoria.getCell('C2').value = cliente;

  wsMemoria.getCell('B3').value = 'PROJETO:';
  wsMemoria.getCell('B3').font = { bold: true, size: 10 };
  wsMemoria.mergeCells('C3:D3');
  wsMemoria.getCell('C3').value = projeto;

  wsMemoria.getCell('B4').value = 'GESTOR:';
  wsMemoria.getCell('B4').font = { bold: true, size: 10 };
  wsMemoria.mergeCells('C4:D4');
  wsMemoria.getCell('C4').value = gestor;

  wsMemoria.getCell('B5').value = 'REVISÃO:';
  wsMemoria.getCell('B5').font = { bold: true, size: 10 };
  wsMemoria.mergeCells('C5:D5');
  wsMemoria.getCell('C5').value = `REV: ${revisao}`;

  wsMemoria.mergeCells('E2:I5');
  const titleMemoria = wsMemoria.getCell('E2');
  titleMemoria.value = 'MEMORIAL DE CÁLCULO';
  titleMemoria.font = { bold: true, size: 14, color: { argb: 'FF0F172A' } };
  titleMemoria.alignment = { horizontal: 'center', vertical: 'middle' };
  titleMemoria.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

  const headerMemoriaRow = wsMemoria.getRow(7);
  headerMemoriaRow.height = 26;
  const headersSheet2 = [
    'Item EAP', 'Tipo', 'Descrição do Serviço', 'Unidade', 'Quantidade',
    'Equação Literal', 'Substituição Numérica', 'Observação / Memória'
  ];

  headersSheet2.forEach((txt, idx) => {
    const cell = headerMemoriaRow.getCell(idx + 2);
    cell.value = txt;
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFED7D31' } };
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
    row.getCell(2).value = m.item_eap || `${i + 1}`;
    row.getCell(3).value = m.tipo || 'Composição';
    row.getCell(4).value = m.descricao || '';
    row.getCell(5).value = m.unidade || '';
    row.getCell(6).value = Number(m.quantidade || 0);
    row.getCell(7).value = m.equacao_literal || '';
    row.getCell(8).value = m.substituicao_numerica || '';
    row.getCell(9).value = m.observacao || '';

    for (let col = 2; col <= 9; col++) {
      const cell = row.getCell(col);
      cell.font = { size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      cell.border = {
        top: { style: 'dotted', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'dotted', color: { argb: 'FFCBD5E1' } },
        left: { style: 'dotted', color: { argb: 'FFCBD5E1' } },
        right: { style: 'dotted', color: { argb: 'FFCBD5E1' } }
      };
      if (col === 6) cell.numFmt = '#,##0.00';
    }
  });

  // ==========================================
  // ABA 3: DISTRIBUIÇÃO DE EQUIPE
  // ==========================================
  const wsEquipe = workbook.addWorksheet('Distribuição de Equipe', {
    views: [{ showGridLines: true }]
  });

  wsEquipe.getColumn(1).width = 4;
  wsEquipe.getColumn(2).width = 12; // Item EAP
  wsEquipe.getColumn(3).width = 50; // Estrutura / Mão de Obra
  wsEquipe.getColumn(4).width = 14; // Tipo
  wsEquipe.getColumn(5).width = 10; // Unidade
  wsEquipe.getColumn(6).width = 16; // Qtd Totais
  wsEquipe.getColumn(7).width = 14; // Duração (Dias)
  wsEquipe.getColumn(8).width = 16; // Carga Horária
  wsEquipe.getColumn(9).width = 20; // Horas Disp / Pessoa
  wsEquipe.getColumn(10).width = 16; // Equipe Necessária

  wsEquipe.getCell('B2').value = 'CLIENTE:';
  wsEquipe.getCell('B2').font = { bold: true, size: 10 };
  wsEquipe.mergeCells('C2:C2');
  wsEquipe.getCell('C2').value = cliente;

  wsEquipe.getCell('B3').value = 'PROJETO:';
  wsEquipe.getCell('B3').font = { bold: true, size: 10 };
  wsEquipe.getCell('C3').value = projeto;

  wsEquipe.getCell('B4').value = 'GESTOR:';
  wsEquipe.getCell('B4').font = { bold: true, size: 10 };
  wsEquipe.getCell('C4').value = gestor;

  wsEquipe.getCell('B5').value = 'REVISÃO:';
  wsEquipe.getCell('B5').font = { bold: true, size: 10 };
  wsEquipe.getCell('C5').value = `REV: ${revisao}`;

  wsEquipe.mergeCells('D2:J5');
  const titleEquipe = wsEquipe.getCell('D2');
  titleEquipe.value = 'DISTRIBUIÇÃO DE EQUIPE';
  titleEquipe.font = { bold: true, size: 14, color: { argb: 'FF0F172A' } };
  titleEquipe.alignment = { horizontal: 'center', vertical: 'middle' };
  titleEquipe.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

  const headerEquipeRow = wsEquipe.getRow(7);
  headerEquipeRow.height = 26;
  const headersSheet3 = [
    'Item EAP', 'Estrutura / Seção / Atividade / Mão de Obra', 'Tipo', 'Unidade',
    'Qtd / Horas Totais', 'Duração (Dias)', 'Carga Horária (h/dia)',
    'Horas Disponíveis / Pessoa', 'Equipe Necessária'
  ];

  headersSheet3.forEach((txt, idx) => {
    const cell = headerEquipeRow.getCell(idx + 2);
    cell.value = txt;
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFED7D31' } };
  });

  const equipeRows = options.distribuicaoEquipe && options.distribuicaoEquipe.length > 0
    ? options.distribuicaoEquipe
    : [
        { item_eap: '1', atividade: 'SEÇÃO: INFRAESTRUTURA', tipo: 'SEÇÃO', unidade: '', qtd_horas: '', duracao: '', carga_horaria: '', horas_disp: '', equipe: '' },
        { item_eap: '1.1', atividade: 'MONTAGEM E ESTRUTURA METÁLICA', tipo: 'COMPOSIÇÃO', unidade: 'H', qtd_horas: 120, duracao: 10, carga_horaria: 8, horas_disp: 80, equipe: 1.5 }
      ];

  equipeRows.forEach((eq, i) => {
    const rIdx = 8 + i;
    const row = wsEquipe.getRow(rIdx);
    row.getCell(2).value = eq.item_eap || `${i + 1}`;
    row.getCell(3).value = eq.atividade || eq.nome || '';
    row.getCell(4).value = eq.tipo || 'MÃO DE OBRA';
    row.getCell(5).value = eq.unidade || 'H';
    row.getCell(6).value = eq.qtd_horas || '';
    row.getCell(7).value = eq.duracao || '';
    row.getCell(8).value = eq.carga_horaria || '';
    row.getCell(9).value = eq.horas_disp || '';
    row.getCell(10).value = eq.equipe || '';

    for (let col = 2; col <= 10; col++) {
      const cell = row.getCell(col);
      cell.font = { size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      cell.border = {
        top: { style: 'dotted', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'dotted', color: { argb: 'FFCBD5E1' } },
        left: { style: 'dotted', color: { argb: 'FFCBD5E1' } },
        right: { style: 'dotted', color: { argb: 'FFCBD5E1' } }
      };
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
