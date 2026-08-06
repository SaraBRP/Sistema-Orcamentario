const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/Windows 11/BRP ENGENHARIA/BRP METALICA - Documentos/Geral Metalica/01- Equipe Metálica/02 - Sara/11- Agentes IA/Sistema Orçamentário/BD/Bases Orçamentárias/GOINFRA/Material.xls');
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

console.log('Total rows:', rows.length);
for (let i = 0; i < Math.min(50, rows.length); i++) {
  const row = rows[i];
  if (!row) continue;
  console.log(`Row ${i}:`, row.map(c => String(c ?? '').trim()).join(' | '));
}
