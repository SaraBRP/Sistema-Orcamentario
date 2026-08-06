const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/Windows 11/BRP ENGENHARIA/BRP METALICA - Documentos/Geral Metalica/01- Equipe Metálica/02 - Sara/11- Agentes IA/Sistema Orçamentário/BD/Bases Orçamentárias/GOINFRA/Relatório_de_Composição_do_Servi.xls');
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

console.log('Total rows:', rows.length);

let printed = 0;
for (let i = 0; i < rows.length && printed < 200; i++) {
  const row = rows[i];
  if (!row) continue;
  
  // Find rows with Serviço: or section names
  const rowStr = row.map(c => String(c ?? '').trim()).join(' | ');
  if (rowStr.includes('Serviço:') || rowStr.includes('Servico:') || rowStr.includes('Mão') || rowStr.includes('Equipamento') || rowStr.includes('Material') || rowStr.includes('Mãos-de-obra')) {
    console.log(`Line ${i}:`, rowStr);
    printed++;
  }
}
