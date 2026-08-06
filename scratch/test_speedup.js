import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dntpnrzevzkwooihqbbx.supabase.co';
const supabaseAnonKey = 'sb_publishable_qwnWAG0pELpkSf_6brrZ1A_cWiP477X';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    console.time("Count Query Time");
    const { count, error: err1 } = await supabase.schema('engenharia')
      .from('composicoes')
      .select('*', { count: 'exact', head: true })
      .eq('fonte', 'GOINFRA');
    console.timeEnd("Count Query Time");
    console.log("Count:", count, "Error:", err1);

    console.time("Data Rows Query Time");
    const { data, error: err2 } = await supabase.schema('engenharia')
      .from('v_composicoes_cdu')
      .select('*')
      .eq('fonte', 'GOINFRA')
      .order('codigo', { ascending: true })
      .range(0, 49);
    console.timeEnd("Data Rows Query Time");
    console.log("Rows returned:", data?.length, "Error:", err2);

  } catch (err) {
    console.error("Exception:", err);
  }
}
run();
