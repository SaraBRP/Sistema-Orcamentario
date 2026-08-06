// Helper parser for composition spreadsheets
import * as XLSX from 'xlsx';

export interface ParsedComposition {
  codigo: string;
  descricao: string;
  unidade: string;
  tipo_atividade: string;
  fonte: string;
  regra_medicao?: string;
  producao_equipe?: number;
  fic_factor?: number;
  custo_tempo_fixo?: number;
  custo_atividades_auxiliares?: number;
  custo_transporte?: number;
  custo_sem_desoneracao?: number;
  custo_desonerado?: number;
  custo_sem_encargos?: number;
}

export interface ParsedItem {
  parent_codigo: string;
  child_codigo: string;
  tipo_item: 'INSUMO' | 'COMPOSICAO';
  coeficiente: number;
  perda_percentual: number;
  descricao_sugestao: string;
  unidade_sugestao: string;
  preco_unitario?: number;
  preco_unitario_improdutivo?: number;
  tipo_sugestao?: string;
  secao_sicro?: string;
  codigo_auxiliar?: string;
  codigo_ln?: string;
  codigo_rp?: string;
  codigo_p?: string;
}

export function parseSpreadsheet(
  rows: any[][],
  layout: 'SINAPI' | 'SICRO' | 'GOINFRA',
  fonteDefault: string
): { composicoes: ParsedComposition[]; itens: ParsedItem[] } {
  const composicoes: ParsedComposition[] = [];
  const itens: ParsedItem[] = [];

  if (layout === 'SINAPI') {
    // SINAPI Analítico layout validation
    let headerIndex = -1;
    for (let i = 0; i < Math.min(100, rows.length); i++) {
      const row = rows[i];
      if (row && row.some(cell => {
        const str = String(cell).toLowerCase();
        return (str.includes('código') || str.includes('codigo')) && 
               (str.includes('composição') || str.includes('composicao') || str.includes('item'));
      })) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) {
      throw new Error(
        'A estrutura da planilha SINAPI é diferente da esperada (cabeçalho de colunas não identificado). Por favor, contate o suporte técnico para reconfiguração do importador.'
      );
    }

    const startIdx = headerIndex + 1;
    
    for (let i = startIdx; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 5) continue;

      const parentCode = row[1] ? String(row[1]).trim() : '';
      if (!parentCode) continue;

      const tipoItem = row[2] ? String(row[2]).trim().toUpperCase() : null; // INSUMO, COMPOSICAO, or null (parent)
      const desc = row[4] ? String(row[4]).trim() : '';
      const und = row[5] ? String(row[5]).trim() : 'UN';

      if (!tipoItem) {
        // Parent row
        composicoes.push({
          codigo: parentCode,
          descricao: desc,
          unidade: und,
          tipo_atividade: row[0] ? String(row[0]).trim() : 'Geral',
          fonte: fonteDefault
        });
      } else if (tipoItem === 'INSUMO' || tipoItem === 'COMPOSICAO') {
        // Child row
        const childCode = row[3] ? String(row[3]).trim() : '';
        const coef = row[6] ? parseFloat(String(row[6]).replace(',', '.')) : 0;
        
        if (childCode) {
          itens.push({
            parent_codigo: parentCode,
            child_codigo: childCode,
            tipo_item: tipoItem,
            coeficiente: isNaN(coef) ? 0 : coef,
            perda_percentual: 0,
            descricao_sugestao: desc,
            unidade_sugestao: und,
            preco_unitario: 0
          });
        }
      }
    }
  } else if (layout === 'SICRO') {
    // SICRO Analítico: planilha com seções A-Equipamentos, B-Mão de Obra, C-Material,
    // D-Atividades Auxiliares, E-Tempo Fixo (transporte), F-Momento de Transporte.
    // Seções E e F são de logística/frete e NÃO devem ser importadas como insumos.
    //
    // Estrutura de colunas [0..8] = [A..I]:
    //   A = código do insumo
    //   B = descrição
    //   C = quantidade / coeficiente
    //   D = und (seções B,C,D) | util_operativa (seção A)
    //   E = util_improdutiva (seção A) | vazio (outras)
    //   F = custo_prod_operativo (A) | custo_horário (B) | preço_unitário (C,D)
    //   G = custo_prod_improdutivo (A) | vazio (outras)
    //   H = vazio
    //   I = custo_total_item

    let hasSicroHeader = false;
    for (let i = 0; i < Math.min(100, rows.length); i++) {
      const firstVal = rows[i] && rows[i][0] ? String(rows[i][0]).trim() : '';
      if (firstVal.includes('SISTEMA DE CUSTOS REFERENCIAIS') || firstVal.includes('SICRO') || firstVal.includes('Custo Unit\u00e1rio de Refer\u00eancia')) {
        hasSicroHeader = true;
        break;
      }
    }
    if (!hasSicroHeader) {
      throw new Error('A estrutura da planilha SICRO \u00e9 diferente da esperada (cabe\u00e7alho oficial do SICRO n\u00e3o detectado).');
    }

    const pN = (v: any): number => {
      if (v === null || v === undefined || v === '' || v === '-') return 0;
      const n = parseFloat(String(v).replace(',', '.'));
      return isNaN(n) ? 0 : n;
    };
    const isCode = (s: string) => /^[EPMTD]\d{3,}$/.test(s) || /^\d{5,}$/.test(s);

    let currentComp: ParsedComposition | null = null;
    let currentSection = 'SKIP';
    let producaoEquipe = 1;

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

        let unidade = 'un';
        const maybeUnit = unitRow[8] ? String(unitRow[8]).trim() : '';
        if (maybeUnit && !/^\d/.test(maybeUnit) && maybeUnit.length <= 6) {
          unidade = maybeUnit;
        }

        const ficIdx = row.findIndex(cell => String(cell).trim().toUpperCase() === 'FIC');
        const ficVal = (ficIdx !== -1 && row[ficIdx + 1] !== undefined) ? pN(row[ficIdx + 1]) : 0;

        const prodIdx = unitRow.findIndex(cell => String(cell).toLowerCase().includes('produ') && String(cell).toLowerCase().includes('equipe'));
        const prodQty = (prodIdx !== -1 && unitRow[prodIdx + 1] !== undefined) ? pN(unitRow[prodIdx + 1]) : 1;
        producaoEquipe = (!isNaN(prodQty) && prodQty > 0) ? prodQty : 1;

        if (codigo && descricao) {
          currentComp = { 
            codigo, 
            descricao, 
            unidade, 
            tipo_atividade: getSicroActivity(codigo), 
            fonte: fonteDefault,
            regra_medicao: String(producaoEquipe),
            producao_equipe: producaoEquipe,
            fic_factor: ficVal,
            custo_tempo_fixo: 0,
            custo_atividades_auxiliares: 0,
            custo_transporte: 0
          };
          composicoes.push(currentComp);
        }
        currentSection = 'SKIP';
        i += 2;
        continue;
      }

      if (col0.startsWith('A - EQUIPAMENTOS'))      { currentSection = 'EQUIPAMENTOS'; continue; }
      if (col0.startsWith('B - M\u00c3O DE OBRA'))       { currentSection = 'MAO_DE_OBRA';  continue; }
      if (col0.startsWith('C - MATERIAL'))           { currentSection = 'MATERIAL';     continue; }
      if (col0.startsWith('D - ATIVIDADES'))         { currentSection = 'ATIVIDADES';   continue; }
      if (col0.startsWith('E - TEMPO'))              { currentSection = 'TEMPO_FIXO';   continue; }
      if (col0.startsWith('F - MOMENTO'))            { currentSection = 'TRANSPORTE';   continue; }

      if (!currentComp || currentSection === 'SKIP') continue;

      if (!col0) {
        // Analisa linhas de totais / resumos
        const rowStr = row.map(c => String(c ?? '').toLowerCase().trim()).join(' | ');
        if (rowStr.includes('tempo') && rowStr.includes('custo') && (rowStr.includes('total') || rowStr.includes('unitário'))) {
          currentComp.custo_tempo_fixo = pN(row[8]);
        }
        if (rowStr.includes('auxiliar') && rowStr.includes('custo') && (rowStr.includes('total') || rowStr.includes('unitário'))) {
          currentComp.custo_atividades_auxiliares = pN(row[8]);
        }
        if (rowStr.includes('transporte') && rowStr.includes('custo') && (rowStr.includes('total') || rowStr.includes('unitário'))) {
          currentComp.custo_transporte = pN(row[8]);
        }
        continue;
      }

      if (!isCode(col0)) continue;

      const col1 = row[1] ? String(row[1]).trim() : '';
      if (!col1) continue;

      let quantity = pN(row[2]);
      let unidadeItem = 'un';
      let precoUnit   = 0;
      let precoImprod = 0;
      let secaoSicro  = 'C';
      let codigoAuxiliar: string | undefined;
      let codigoLn: string | undefined;
      let codigoRp: string | undefined;
      let codigoP: string | undefined;

      const isSubComp = currentSection === 'ATIVIDADES' || /^\d{6,}$/.test(col0);

      if (currentSection === 'EQUIPAMENTOS') {
        secaoSicro = 'A';
        unidadeItem = 'h';
        precoUnit   = pN(row[5]);
        precoImprod = pN(row[6]);
      } else if (currentSection === 'MAO_DE_OBRA') {
        secaoSicro = 'B';
        unidadeItem = row[3] ? String(row[3]).trim() : 'h';
        precoUnit   = pN(row[5]);
      } else if (currentSection === 'MATERIAL') {
        secaoSicro = 'C';
        unidadeItem = row[3] ? String(row[3]).trim() : 'un';
        precoUnit   = pN(row[5]);
      } else if (currentSection === 'ATIVIDADES') {
        secaoSicro = 'D';
        unidadeItem = row[3] ? String(row[3]).trim() : 'un';
        precoUnit   = pN(row[5]) || pN(row[6]);
      } else if (currentSection === 'TEMPO_FIXO') {
        secaoSicro = 'E';
        codigoAuxiliar = row[2] ? String(row[2]).trim() : '';
        quantity = pN(row[3]);
        unidadeItem = row[4] ? String(row[4]).trim() : 't';
        precoUnit = pN(row[6]);
      } else if (currentSection === 'TRANSPORTE') {
        secaoSicro = 'F';
        quantity = pN(row[2]);
        unidadeItem = row[3] ? String(row[3]).trim() : 'tkm';
        codigoLn = row[4] ? String(row[4]).trim() : '';
        codigoRp = row[5] ? String(row[5]).trim() : '';
        codigoP  = row[6] ? String(row[6]).trim() : '';
        precoUnit = pN(row[8]);
      }

      if (quantity === 0) continue;

      let tipoSugestao = 'Material';
      if (currentSection === 'EQUIPAMENTOS') {
        tipoSugestao = 'Equipamento';
      } else if (currentSection === 'MAO_DE_OBRA') {
        tipoSugestao = 'Mão de Obra';
      }

      itens.push({
        parent_codigo: currentComp.codigo,
        child_codigo: col0,
        tipo_item: isSubComp ? 'COMPOSICAO' : 'INSUMO',
        coeficiente: quantity,
        perda_percentual: 0,
        descricao_sugestao: col1,
        unidade_sugestao: unidadeItem,
        tipo_sugestao: tipoSugestao,
        preco_unitario: precoUnit,
        preco_unitario_improdutivo: precoImprod,
        secao_sicro: secaoSicro,
        codigo_auxiliar: codigoAuxiliar,
        codigo_ln: codigoLn,
        codigo_rp: codigoRp,
        codigo_p: codigoP
      });
    }
  } else if (layout === 'GOINFRA') {
    // GOINFRA layout validation
    let hasGoinfraHeader = false;
    for (let i = 0; i < Math.min(100, rows.length); i++) {
      const firstVal = rows[i] && rows[i][0] ? String(rows[i][0]).trim() : '';
      if (firstVal.startsWith('Serviço:') || firstVal.startsWith('Servico:') || firstVal.includes('GOINFRA')) {
        hasGoinfraHeader = true;
        break;
      }
    }

    if (!hasGoinfraHeader) {
      throw new Error(
        'A estrutura da planilha GOINFRA é diferente da esperada (marcador "Serviço:" ou cabeçalho GOINFRA não detectado). Por favor, contate o suporte técnico para reconfiguração do importador.'
      );
    }

    let currentComp: ParsedComposition | null = null;
    let currentSection: 'EQUIPAMENTO' | 'MAO_DE_OBRA' | 'MATERIAL' | 'GERAL' = 'GERAL';

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      const firstCell = row[0] ? String(row[0]).trim() : '';

      // Check if it's the start of a composition
      if (firstCell.startsWith('Serviço:')) {
        const servicePart = firstCell.substring(8).trim();
        const dashIdx = servicePart.indexOf('-');
        
        let codigo = '';
        let descricao = '';
        if (dashIdx !== -1) {
          codigo = servicePart.substring(0, dashIdx).trim();
          descricao = servicePart.substring(dashIdx + 1).trim();
        } else {
          codigo = servicePart;
          descricao = servicePart;
        }

        if (fonteDefault === 'GOINFRA' && /^\d+$/.test(codigo)) {
          codigo = codigo.padStart(4, '0');
        }

        let unidade = 'un';
        for (let colIdx = 1; colIdx < row.length; colIdx++) {
          const cellVal = String(row[colIdx] || '');
          if (cellVal.includes('Unidade:')) {
            unidade = cellVal.replace('Unidade:', '').trim();
            break;
          }
        }
        
        if (codigo && descricao) {
          currentComp = {
            codigo,
            descricao,
            unidade,
            tipo_atividade: getGoinfraActivity(codigo),
            fonte: fonteDefault
          };
          composicoes.push(currentComp);
        }
        currentSection = 'GERAL';
        continue;
      }

      // Check for section headers inside the composition
      const rowStr = row.map(c => String(c ?? '').trim()).join(' | ');
      if (rowStr.includes('Mãos-de-obra') || rowStr.includes('Maos-de-obra') || rowStr.includes('Mão-de-obra')) {
        currentSection = 'MAO_DE_OBRA';
      } else if (rowStr.includes('Equipamento')) {
        currentSection = 'EQUIPAMENTO';
      } else if (rowStr.includes('Materiais') || rowStr.includes('Material')) {
        currentSection = 'MATERIAL';
      }

      // If we are inside a composition, check for items
      if (currentComp && firstCell) {
        if (
          firstCell.includes('Código Auxiliar') ||
          firstCell.includes('Total:') ||
          firstCell.includes('Custo direto total') ||
          firstCell.includes('BDI:') ||
          firstCell.includes('Preço unitário')
        ) {
          continue;
        }

        let codeClean = firstCell.trim();
        if (codeClean.length >= 1) {
          const desc = row[3] ? String(row[3]).trim() : '';
          const coefVal = row[14]; // Consumo column
          
          if (desc && coefVal !== undefined && coefVal !== null && coefVal !== '') {
            const coef = parseFloat(String(coefVal).replace(',', '.'));
            if (!isNaN(coef)) {
              // Se for numérico puro e GOINFRA, padroniza com zeros à esquerda
              if (fonteDefault === 'GOINFRA' && /^\d+$/.test(codeClean)) {
                codeClean = codeClean.padStart(4, '0');
              }

              const isSubComp = /^\d{6}$/.test(codeClean);
              
              const precoUnitRaw = row[8] ? parseFloat(String(row[8]).replace(',', '.')) : 0;
              const precoUnit = isNaN(precoUnitRaw) ? 0 : precoUnitRaw;

              let unidadeSugestao = 'un';
              let tipoSugestao = 'Material';
              if (currentSection === 'MAO_DE_OBRA') {
                unidadeSugestao = 'h';
                tipoSugestao = 'Mão de Obra';
              } else if (currentSection === 'EQUIPAMENTO') {
                unidadeSugestao = 'h';
                tipoSugestao = 'Equipamento';
              }

              itens.push({
                parent_codigo: currentComp.codigo,
                child_codigo: codeClean,
                tipo_item: isSubComp ? 'COMPOSICAO' : 'INSUMO',
                coeficiente: coef,
                perda_percentual: 0,
                descricao_sugestao: desc,
                unidade_sugestao: unidadeSugestao,
                tipo_sugestao: tipoSugestao,
                preco_unitario: precoUnit
              });
            }
          }
        }
      }
    }
  }

  return { composicoes, itens };
}

function getSicroActivity(code: string): string {
  const prefix = code.substring(0, 2);
  switch (prefix) {
    case '01': return 'Administração Local';
    case '02': return 'Trabalhos em Terra';
    case '03': return 'Fundações';
    case '04': return 'Estrutura';
    case '05': return 'Pavimentação';
    case '06': return 'Instalações';
    case '07': return 'Drenagem';
    case '08': return 'Obras de Arte Especiais';
    default: return 'Geral';
  }
}

function getGoinfraActivity(code: string): string {
  const prefix = code.substring(0, 2);
  switch (prefix) {
    case '01': return 'Administração Local';
    case '02': return 'Trabalhos em Terra';
    case '03': return 'Fundações';
    case '04': return 'Estrutura';
    case '05': return 'Esquadrias';
    case '06': return 'Instalações';
    case '07': return 'Acabamentos';
    case '08': return 'Cobertura';
    case '09': return 'Pintura';
    default: return 'Geral';
  }
}

export function parseSinapiSpreadsheet(
  workbook: XLSX.WorkBook,
  estado: string,
  colLetterOverride: string | undefined,
  fonteDefault: string,
  abaSemDeson?: string,
  abaComDeson?: string,
  abaSemEncargos?: string,
  linhaInicio?: number
): { composicoes: ParsedComposition[]; itens: ParsedItem[] } {
  // 1. Localizar as abas
  const sheets = workbook.SheetNames;
  const analiticoName = sheets.find((s: string) => s.includes('Anal') && !s.toLowerCase().includes('custo'));
  const csdName = sheets.find((s: string) => s.toUpperCase() === (abaSemDeson?.toUpperCase() || 'CSD'));
  const ccdName = sheets.find((s: string) => s.toUpperCase() === (abaComDeson?.toUpperCase() || 'CCD'));
  const cseName = sheets.find((s: string) => s.toUpperCase() === (abaSemEncargos?.toUpperCase() || 'CSE'));

  if (!analiticoName) {
    throw new Error('Aba Analítico não encontrada no arquivo.');
  }

  // 2. Ler a estrutura da aba Analítico
  const wsAnalitico = workbook.Sheets[analiticoName];
  const rowsAnalitico = XLSX.utils.sheet_to_json<any[]>(wsAnalitico, { header: 1 });
  
  // Executa o parser padrão do Analítico
  const { composicoes, itens } = parseSpreadsheet(rowsAnalitico, 'SINAPI', fonteDefault);

  // 3. Ler os custos de CSD, CCD e CSE se existirem
  const readCosts = (sheetName: string | undefined): Map<string, number> => {
    const costMap = new Map<string, number>();
    if (!sheetName) return costMap;

    const ws = workbook.Sheets[sheetName];
    if (!ws) return costMap;
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

    // Encontrar a linha dos estados (UFs) dinamicamente nas primeiras 20 linhas
    let stateRowIdx = -1;
    const ufsSet = new Set(['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']);
    for (let r = 0; r < Math.min(20, rows.length); r++) {
      const row = rows[r];
      if (!row) continue;
      const count = row.filter(cell => cell && ufsSet.has(String(cell).trim().toUpperCase())).length;
      if (count >= 3) {
        stateRowIdx = r;
        break;
      }
    }

    if (stateRowIdx === -1) {
      stateRowIdx = 8; // Fallback para linha 9
    }

    let stateColIdx = -1;
    if (colLetterOverride) {
      // Converter letra da coluna para índice 0-indexed
      let colIdx = 0;
      const cleanLetter = colLetterOverride.toUpperCase().replace(/[^A-Z]/g, '');
      for (let i = 0; i < cleanLetter.length; i++) {
        colIdx = colIdx * 26 + (cleanLetter.charCodeAt(i) - 64);
      }
      stateColIdx = colIdx - 1;
    } else {
      // Buscar a coluna pelo estado selecionado
      const row9 = rows[stateRowIdx];
      if (row9) {
        for (let c = 0; c < row9.length; c++) {
          if (String(row9[c]).trim().toUpperCase() === estado.toUpperCase()) {
            stateColIdx = c;
            break;
          }
        }
      }
    }

    if (stateColIdx === -1) {
      console.warn(`Estado ${estado} (ou override ${colLetterOverride}) não encontrado na aba ${sheetName}.`);
      return costMap;
    }

    // Linha de início dos dados
    const startRowIdx = linhaInicio !== undefined ? (linhaInicio - 1) : Math.max(stateRowIdx + 2, 10);

    // A partir da startRowIdx, ler os códigos e custos
    const getCompositionCode = (cell: any): string => {
      if (!cell) return '';
      if (cell.f) {
        const match = cell.f.match(/HYPERLINK\(.*,\s*["']?(\d+)["']?\s*\)/i);
        if (match && match[1]) {
          return match[1];
        }
      }
      return cell.v !== undefined && cell.v !== null ? String(cell.v).trim() : '';
    };

    for (let r = startRowIdx; r < rows.length; r++) {
      const cellAddress = XLSX.utils.encode_cell({ r, c: 1 }); // Coluna B é índice 1
      const cell = ws[cellAddress];
      const code = getCompositionCode(cell);
      
      if (code && code !== '0') {
        const val = rows[r][stateColIdx];
        if (val !== undefined && val !== null) {
          let numVal = 0;
          if (typeof val === 'number') {
            numVal = val;
          } else {
            const str = String(val).replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
            const parsed = parseFloat(str);
            numVal = isNaN(parsed) ? 0 : parsed;
          }
          costMap.set(code, numVal);
        }
      }
    }

    return costMap;
  };

  const mapCSD = readCosts(csdName); // Sem desoneração
  const mapCCD = readCosts(ccdName); // Com desoneração
  const mapCSE = readCosts(cseName); // Sem encargos

  // 4. Anexar os custos às composições correspondentes
  composicoes.forEach(comp => {
    comp.custo_sem_desoneracao = mapCSD.get(comp.codigo) || 0;
    comp.custo_desonerado = mapCCD.get(comp.codigo) || 0;
    comp.custo_sem_encargos = mapCSE.get(comp.codigo) || 0;
  });

  return { composicoes, itens };
}
