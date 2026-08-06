import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dntpnrzevzkwooihqbbx.supabase.co';
const supabaseAnonKey = 'sb_publishable_qwnWAG0pELpkSf_6brrZ1A_cWiP477X';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    const { data: comps, error: err1 } = await supabase.schema('engenharia')
      .from('composicoes')
      .select('id, codigo, fonte, descricao')
      .limit(5);
    console.log("Composicoes sample rows:", comps, "Error:", err1);

    const { data: viewRows, error: err2 } = await supabase.schema('engenharia')
      .from('v_composicoes_cdu')
      .select('id, codigo, fonte, descricao')
      .limit(5);
    console.log("v_composicoes_cdu sample rows:", viewRows, "Error:", err2);

  } catch (err) {
    console.error("Exception:", err);
  }
}
run();
