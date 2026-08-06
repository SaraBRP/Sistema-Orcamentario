import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dntpnrzevzkwooihqbbx.supabase.co';
const supabaseAnonKey = 'sb_publishable_qwnWAG0pELpkSf_6brrZ1A_cWiP477X';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    const { count, error } = await supabase.schema('engenharia')
      .from('v_composicoes_cdu')
      .select('id', { count: 'exact', head: true });

    console.log("Total rows in v_composicoes_cdu:", count, "Error:", error);

  } catch (err) {
    console.error("Exception:", err);
  }
}
run();
