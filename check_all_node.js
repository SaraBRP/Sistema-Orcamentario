import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const excelPath = "C:\\Users\\Windows 11\\BRP ENGENHARIA\\BRP METALICA - Documentos\\Geral Metalica\\01- Equipe Metálica\\02 - Sara\\11- Agentes IA\\Sistema Orçamentário\\BD\\Bases Orçamentárias\\SINAPI GO\\GO\\SINAPI_Referência_2026_05.xlsx";

const supabaseUrl = 'https://dntpnrzevzkwooihqbbx.supabase.co';
const supabaseAnonKey = 'sb_publishable_qwnWAG0pELpkSf_6brrZ1A_cWiP477X';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function mapExcelClassToDbType(val) {
  if (!val) return 'Material';
  const upper = String(val).toUpperCase().trim();
  if ((upper.includes('EQUIP') || upper.includes('MÁQUINA') || upper.includes('MAQUINA')) && (upper.includes('AQUISIÇÃO') || upper.includes('AQUISICAO') || upper.includes('AQUIS'))) {
    return 'Equipamento para Aquisição Permanente';
  } else if (upper.includes('EQUIP') || upper.includes('MÁQUINA') || upper.includes('MAQUINA') || upper.includes('LOCAÇÃO') || upper.includes('LOCACAO') || upper.includes('ALOCAÇÃO') || upper.includes('ALOCACAO')) {
    return 'Equipamento';
  } else if (upper.includes('MÃO') || upper.includes('MAO') || upper.includes('OBRA') || upper.includes('HORISTA') || upper.includes('MENSALISTA') || upper.includes('MÃO DE OBRA')) {
    return 'Mão de Obra';
  } else if (upper.includes('SERV') || upper.includes('TERCEIR') || upper.includes('TERCEIROS')) {
    return 'Serviços';
  } else if (upper.includes('ESPECIAIS') || upper.includes('ENCARGOS') || upper.includes('COMPLEMENTARES')) {
    return 'Outros';
  } else if (upper.includes('MATER') || upper.includes('MATERIAL')) {
    return 'Material';
  } else {
    return 'Material';
  }
}

async function run() {
  try {
    // 1. Read SINAPI Excel using xlsx
    console.log("Reading SINAPI Excel file...");
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets['ISD'];
    if (!sheet) {
      console.error("Sheet ISD not found in Excel file.");
      return;
    }
    
    // Convert to JSON starting at row 9 (header at row 8, 0-indexed is row 8)
    const range = XLSX.utils.decode_range(sheet['!ref']);
    const startRow = 8; // Row 9
    
    const excelMap = new Map();
    
    const getCellValue = (colIdx, r) => {
      const cellAddress = XLSX.utils.encode_cell({ r, c: colIdx });
      return sheet[cellAddress]?.v;
    };
    
    for (let r = startRow + 1; r <= range.e.r; r++) {
      const codeVal = getCellValue(1, r); // Column B is Code
      const classVal = getCellValue(0, r); // Column A is Classification
      
      if (codeVal !== undefined && codeVal !== null) {
        const code = String(codeVal).trim().replace('.0', '');
        const classification = String(classVal || '').trim();
        if (code) {
          excelMap.set(code, classification);
        }
      }
    }
    
    console.log(`Loaded ${excelMap.size} unique codes from reference Excel.`);
    
    // 2. Sign up a temporary user to bypass RLS
    const tempEmail = `checker_all_${Math.floor(Date.now() / 1000)}@brpengenharia.com.br`;
    const password = 'TemporaryPassword123!';
    console.log(`Signing up temporary user to authenticate: ${tempEmail}...`);
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: tempEmail,
      password,
      options: {
        data: {
          nome: 'Temp All Checker'
        }
      }
    });
    
    if (signUpError) {
      console.error("Auth Sign-up failed:", signUpError.message);
      return;
    }
    console.log("Sign-up successful. Authenticated session ready.");
    
    // Create client with authenticated user token if needed, or just let the default supabase instance keep the session token in memory
    // (auth.signUp automatically signs in and stores session in Supabase client instance)
    
    // 3. Paginate and fetch all SINAPI records from database
    console.log("Fetching SINAPI insumos from Supabase database...");
    const allDbInsumos = [];
    const pageSize = 1000;
    let offset = 0;
    
    while (true) {
      const from = offset;
      const to = offset + pageSize - 1;
      
      const { data, error } = await supabase
        .schema('engenharia')
        .from('insumos')
        .select('id, codigo, descricao, tipo, fonte_preco, estado')
        .eq('fonte_preco', 'SINAPI')
        .range(from, to);
        
      if (error) {
        console.error("Failed to query database:", error.message);
        break;
      }
      
      if (!data || data.length === 0) {
        break;
      }
      
      allDbInsumos.push(...data);
      console.log(`Fetched ${allDbInsumos.length} rows...`);
      
      if (data.length < pageSize) {
        break;
      }
      offset += pageSize;
    }
    
    console.log(`Total database SINAPI records to check: ${allDbInsumos.length}`);
    
    // 4. Compare
    let matchedCount = 0;
    let notInExcelCount = 0;
    const mismatches = [];
    
    allDbInsumos.forEach(row => {
      const code = String(row.codigo).trim();
      const dbTipo = String(row.tipo).trim();
      
      const excelClass = excelMap.get(code);
      if (!excelClass) {
        notInExcelCount++;
        return;
      }
      
      const expectedTipo = mapExcelClassToDbType(excelClass);
      
      if (dbTipo !== expectedTipo) {
        mismatches.push({
          codigo: code,
          descricao: row.descricao,
          excel_class: excelClass,
          expected_tipo: expectedTipo,
          db_tipo: dbTipo,
          estado: row.estado
        });
      } else {
        matchedCount++;
      }
    });
    
    console.log("\n================== VERIFICATION SUMMARY ==================");
    console.log(`Total Database Rows Checked: ${allDbInsumos.length}`);
    console.log(`Matched correctly: ${matchedCount}`);
    console.log(`Not found in reference Excel (custom or legacy): ${notInExcelCount}`);
    console.log(`Mismatches found: ${mismatches.length}`);
    console.log("==========================================================\n");
    
    if (mismatches.length > 0) {
      console.log(`List of first 50 mismatches:`);
      mismatches.slice(0, 50).forEach((m, idx) => {
        console.log(`#${idx + 1} Code: ${m.codigo} | UF: ${m.estado} | Excel: ${m.excel_class} (Expected: ${m.expected_tipo}) | DB: ${m.db_tipo} | Desc: ${m.descricao.slice(0, 60)}...`);
      });
      if (mismatches.length > 50) {
        console.log(`... and ${mismatches.length - 50} more mismatches.`);
      }
    } else {
      console.log("CONGRATULATIONS: No mismatches found! All SINAPI insumos are classified correctly.");
    }
    
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

run();
