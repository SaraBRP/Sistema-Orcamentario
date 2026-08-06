import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dntpnrzevzkwooihqbbx.supabase.co';
const supabaseAnonKey = 'sb_publishable_qwnWAG0pELpkSf_6brrZ1A_cWiP477X';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    const { count: totalComps, error: err1 } = await supabase.schema('engenharia')
      .from('composicoes')
      .select('*', { count: 'exact', head: true });

    const { count: sicroComps, error: err2 } = await supabase.schema('engenharia')
      .from('composicoes')
      .select('*', { count: 'exact', head: true })
      .eq('fonte', 'SICRO');

    const { count: goinfraComps, error: err3 } = await supabase.schema('engenharia')
      .from('composicoes')
      .select('*', { count: 'exact', head: true })
      .eq('fonte', 'GOINFRA');

    const { data: sampleGoinfra, error: err4 } = await supabase.schema('engenharia')
      .from('v_composicoes_cdu')
      .select('*')
      .eq('fonte', 'GOINFRA')
      .limit(3);

    console.log("Total composicoes count:", totalComps, "Error:", err1);
    console.log("SICRO composicoes count:", sicroComps, "Error:", err2);
    console.log("GOINFRA composicoes count:", goinfraComps, "Error:", err3);
    console.log("GOINFRA sample in v_composicoes_cdu:", sampleGoinfra, "Error:", err4);

  } catch (err) {
    console.error("Exception:", err);
  }
}
run();
