const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://dntpnrzevzkwooihqbbx.supabase.co';
const supabaseAnonKey = 'sb_publishable_qwnWAG0pELpkSf_6brrZ1A_cWiP477X';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkReferences() {
  try {
    console.log('1. Fetching SICRO composition IDs...');
    const { data: comps, error: err1 } = await supabase.schema('engenharia')
      .from('composicoes')
      .select('id, codigo')
      .eq('fonte', 'SICRO');
    
    if (err1) throw err1;
    console.log(`Found ${comps ? comps.length : 0} SICRO compositions.`);
    if (!comps || comps.length === 0) return;

    const compIds = comps.map(c => c.id);

    console.log('2. Checking if referenced in orcamento_itens...');
    const { data: orcItens, error: err2 } = await supabase.schema('engenharia')
      .from('orcamento_itens')
      .select('id, codigo, descricao')
      .in('composicao_id', compIds)
      .limit(10);
    
    if (err2) throw err2;
    console.log(`Referenced in orcamento_itens:`, orcItens);

    console.log('3. Checking if referenced in planilha_cliente_itens...');
    const { data: planItens, error: err3 } = await supabase.schema('engenharia')
      .from('planilha_cliente_itens')
      .select('id, descricao_cliente')
      .in('composicao_id', compIds)
      .limit(10);
    
    if (err3) throw err3;
    console.log(`Referenced in planilha_cliente_itens:`, planItens);

  } catch (e) {
    console.error('Error:', e);
  }
}

checkReferences();
