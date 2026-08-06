import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dntpnrzevzkwooihqbbx.supabase.co';
const supabaseAnonKey = 'sb_publishable_qwnWAG0pELpkSf_6brrZ1A_cWiP477X';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    const { data, count, error } = await supabase.schema('engenharia')
      .from('v_composicoes_cdu')
      .select('*', { count: 'exact' })
      .eq('fonte', 'GOINFRA')
      .order('codigo', { ascending: true })
      .range(0, 49);

    console.log("Exact query results length:", data?.length);
    console.log("Exact query count:", count);
    console.log("Exact query error:", error);

  } catch (err) {
    console.error("Exception:", err);
  }
}
run();
