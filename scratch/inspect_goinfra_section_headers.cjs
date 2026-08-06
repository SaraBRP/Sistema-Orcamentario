const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/Windows 11/BRP ENGENHARIA/BRP METALICA - Documentos/Geral Metalica/01- Equipe Metálica/02 - Sara/11- Agentes IA/Sistema Orçamentário/BD/Bases Orçamentárias/GOINFRA/Relatório_de_Composição_do_Servi.xls');
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

let foundCount = 0;
for (let i = 0; i < rows.length && foundCount < 30; i++) {
  const row = rows[i];
  if (!row) continue;
  
  // Search every cell in the row
  for (let c = 0; c < row.length; c++) {
    const val = String(row[c]).trim();
    if (val.includes('Mãos-de-obra') || val.includes('Maos-de-obra') || val.includes('Mão-de-obra') ||
        val.includes('Equipamento') || val.includes('Material') || val.includes('Materiais')) {
      console.log(`Row ${i} Col ${c}: "${val}"`);
      foundCount++;
    }
  }
}
