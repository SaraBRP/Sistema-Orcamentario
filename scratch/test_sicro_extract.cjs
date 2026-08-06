const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/Windows 11/BRP ENGENHARIA/BRP METALICA - Documentos/Geral Metalica/01- Equipe Metálica/02 - Sara/11- Agentes IA/Sistema Orçamentário/BD/Bases Orçamentárias/SICRO/GO/GO 01-2026 Relatório Analítico de Composições de Custos.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

const pN = (v) => { if (v === null || v === undefined || v === '' || v === '-') return 0; const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; };

let currentComp = null;

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  if (!row) continue;
  const col0 = row[0] !== undefined && row[0] !== null ? String(row[0]).trim() : '';

  if (col0 === 'SISTEMA DE CUSTOS REFERENCIAIS DE OBRAS - OBRAS - SICRO' ||
      col0 === 'SISTEMA DE CUSTOS REFERENCIAIS DE OBRAS - SICRO') {
    const unitRow = rows[i + 1] || [];
    const compRow = rows[i + 2] || [];

    const codigo    = compRow[0] ? String(compRow[0]).trim() : '';
    const descricao = compRow[1] ? String(compRow[1]).trim() : '';

    const ficIdx = row.findIndex(cell => String(cell).trim().toUpperCase() === 'FIC');
    const ficVal = (ficIdx !== -1 && row[ficIdx + 1] !== undefined) ? pN(row[ficIdx + 1]) : 0;

    const prodIdx = unitRow.findIndex(cell => String(cell).toLowerCase().includes('produ') && String(cell).toLowerCase().includes('equipe'));
    const prodQty = (prodIdx !== -1 && unitRow[prodIdx + 1] !== undefined) ? pN(unitRow[prodIdx + 1]) : 1;

    if (codigo === '0307084') {
      currentComp = {
        codigo,
        descricao,
        fic_factor: ficVal,
        producao_equipe: prodQty,
        custo_tempo_fixo: 0,
        custo_atividades_auxiliares: 0
      };
      console.log('Found Comp 0307084:', currentComp);
    } else if (currentComp) {
      // Next comp reached, stop
      break;
    }
    i += 2;
    continue;
  }

  if (currentComp) {
    // Check for tempo fixo or atividades auxiliares total rows
    if (col0 === '') {
      const rowStr = row.map(c => String(c ?? '').toLowerCase().trim()).join(' | ');
      if (rowStr.includes('tempo') && rowStr.includes('custo') && (rowStr.includes('total') || rowStr.includes('unitário'))) {
        currentComp.custo_tempo_fixo = pN(row[8]);
        console.log('Found Tempo Fixo Row:', rowStr, 'Val:', currentComp.custo_tempo_fixo);
      }
      if (rowStr.includes('auxiliares') && rowStr.includes('custo') && (rowStr.includes('total') || rowStr.includes('unitário'))) {
        currentComp.custo_atividades_auxiliares = pN(row[8]);
        console.log('Found Aux Row:', rowStr, 'Val:', currentComp.custo_atividades_auxiliares);
      }
    }
  }
}

console.log('Final Result for 0307084:', currentComp);
