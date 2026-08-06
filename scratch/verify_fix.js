import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dntpnrzevzkwooihqbbx.supabase.co';
const supabaseAnonKey = 'sb_publishable_qwnWAG0pELpkSf_6brrZ1A_cWiP477X';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testListQuery(fonte) {
  console.time(`List Query ${fonte}`);
  const { data, count, error } = await supabase.schema('engenharia')
    .from('composicoes')
    .select('*', { count: 'exact' })
    .eq('fonte', fonte)
    .order('codigo', { ascending: true })
    .range(0, 49);
  console.timeEnd(`List Query ${fonte}`);
  console.log(`  → Rows: ${data?.length}, Count: ${count}, Error: ${error ? error.message : 'none'}`);
}

async function testCduSingle(id) {
  console.time(`CDU Single Row`);
  const { data, error } = await supabase.schema('engenharia')
    .from('v_composicoes_cdu')
    .select('cdu_sem_desoneracao, cdu_desonerado, cdu_sem_encargos')
    .eq('id', id)
    .single();
  console.timeEnd(`CDU Single Row`);
  console.log(`  → CDU data:`, data, `Error: ${error ? error.message : 'none'}`);
}

async function run() {
  console.log("=== Testing new LIST queries (fast base table) ===");
  await testListQuery('GOINFRA');
  await testListQuery('SICRO');

  console.log("\n=== Fetching a sample composition ID to test CDU on-demand ===");
  const { data: sample } = await supabase.schema('engenharia')
    .from('composicoes')
    .select('id, codigo')
    .eq('fonte', 'GOINFRA')
    .limit(1)
    .single();

  if (sample) {
    console.log(`Testing CDU on-demand for: ${sample.codigo} (${sample.id})`);
    await testCduSingle(sample.id);
  }
}
run();
