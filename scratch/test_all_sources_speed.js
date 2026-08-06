import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dntpnrzevzkwooihqbbx.supabase.co';
const supabaseAnonKey = 'sb_publishable_qwnWAG0pELpkSf_6brrZ1A_cWiP477X';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSource(fonte) {
  try {
    console.time(`Query Time for ${fonte}`);
    const { data, error } = await supabase.schema('engenharia')
      .from('v_composicoes_cdu')
      .select('*')
      .eq('fonte', fonte)
      .order('codigo', { ascending: true })
      .range(0, 9);
    console.timeEnd(`Query Time for ${fonte}`);
    console.log(`Source ${fonte} - Rows: ${data?.length}, Error:`, error);
  } catch (e) {
    console.log(`Exception for ${fonte}:`, e);
  }
}

async function run() {
  await testSource('SICRO');
  await testSource('SINAPI');
  await testSource('GOINFRA');
}
run();
