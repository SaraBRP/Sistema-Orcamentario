import { supabase } from './supabase';

/**
 * Extrai a sequência numérica de um código de orçamento no formato DDMM.SEQ.REV-ANO
 * apenas se o prefixo DDMM for exatamente o mesmo da data pesquisada.
 */
function extractSeqForDate(codigo: string | null | undefined, targetDdMm: string): number {
  if (!codigo || typeof codigo !== 'string') return 0;
  const cleanCode = codigo.trim();
  const parts = cleanCode.split('.');
  if (parts.length >= 2 && parts[0] === targetDdMm) {
    const seqNum = parseInt(parts[1], 10);
    return isNaN(seqNum) ? 0 : seqNum;
  }
  return 0;
}

/**
 * Função síncrona (rápida) para gerar o código com base nos dados locais (LocalStorage)
 */
export function generateFastOfficialOrcamentoCode(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const ddmm = `${dd}${mm}`;
  const year = now.getFullYear();

  let maxSeq = 0;

  try {
    const cachedOrcsStr = localStorage.getItem('brp_orcamentos_list');
    if (cachedOrcsStr) {
      const cachedOrcs = JSON.parse(cachedOrcsStr);
      if (Array.isArray(cachedOrcs)) {
        cachedOrcs.forEach((o: any) => {
          const seq = extractSeqForDate(o?.codigo, ddmm);
          if (seq > maxSeq) maxSeq = seq;
        });
      }
    }

    const cachedMemsStr = localStorage.getItem('brp_memoriais_calculo_list');
    if (cachedMemsStr) {
      const cachedMems = JSON.parse(cachedMemsStr);
      if (Array.isArray(cachedMems)) {
        cachedMems.forEach((m: any) => {
          const codeToUse = m?.codigoOrcamento || m?.codigo;
          const seq = extractSeqForDate(codeToUse, ddmm);
          if (seq > maxSeq) maxSeq = seq;
        });
      }
    }
  } catch (err) {
    console.warn('Erro ao ler localStorage para código rápido:', err);
  }

  const nextSeqStr = String(maxSeq + 1).padStart(3, '0');
  return `${ddmm}.${nextSeqStr}.0-${year}`;
}

/**
 * Função assíncrona (definitiva) para consultar o banco de dados Supabase e LocalStorage
 * garantindo sequência unificada por dia (DDMM).
 */
export async function generateOfficialOrcamentoCode(): Promise<string> {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const ddmm = `${dd}${mm}`;
  const year = now.getFullYear();

  let maxSeq = 0;

  try {
    // 1. Busca orçamentos no Supabase
    const { data: orcData } = await supabase
      .schema('engenharia')
      .from('orcamentos')
      .select('codigo');

    if (orcData && Array.isArray(orcData)) {
      orcData.forEach((o: any) => {
        const seq = extractSeqForDate(o?.codigo, ddmm);
        if (seq > maxSeq) maxSeq = seq;
      });
    }

    // 2. Busca memoriais de cálculo no Supabase
    const { data: memData } = await supabase
      .schema('engenharia')
      .from('memoriais_calculo')
      .select('codigo_orcamento');

    if (memData && Array.isArray(memData)) {
      memData.forEach((m: any) => {
        const seq = extractSeqForDate(m?.codigo_orcamento, ddmm);
        if (seq > maxSeq) maxSeq = seq;
      });
    }

    // 3. Checa também LocalStorage para garantir itens criados offline ou recém inseridos
    const fastCode = generateFastOfficialOrcamentoCode();
    const fastParts = fastCode.split('.');
    if (fastParts.length >= 2) {
      const fastSeq = parseInt(fastParts[1], 10);
      if (!isNaN(fastSeq) && fastSeq > maxSeq) {
        maxSeq = fastSeq - 1;
      }
    }
  } catch (err) {
    console.error('Erro ao consultar Supabase para gerar código oficial:', err);
    return generateFastOfficialOrcamentoCode();
  }

  const nextSeqStr = String(maxSeq + 1).padStart(3, '0');
  return `${ddmm}.${nextSeqStr}.0-${year}`;
}
