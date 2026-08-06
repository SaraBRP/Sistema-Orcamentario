const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://dntpnrzevzkwooihqbbx.supabase.co';
const supabaseAnonKey = 'sb_publishable_qwnWAG0pELpkSf_6brrZ1A_cWiP477X';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Querying composicoes...');
  const { data, error } = await supabase
    .schema('engenharia')
    .from('composicoes')
    .select('id, codigo, descricao, fonte')
    .limit(10);
  
  if (error) {
    console.error('Fetch error:', error);
  } else {
    console.log('Fetched comps:', data);
  }
}
run();
