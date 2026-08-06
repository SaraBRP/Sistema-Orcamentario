import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dntpnrzevzkwooihqbbx.supabase.co';
const supabaseAnonKey = 'sb_publishable_qwnWAG0pELpkSf_6brrZ1A_cWiP477X';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    console.log("Altering function volatility to STABLE...");
    const { error: errAlter } = await supabase.rpc('execute_sql', {
      sql_query: "ALTER FUNCTION engenharia.fn_calcular_cdu_composicao(UUID, TEXT) STABLE;"
    });

    if (errAlter) {
      console.log("RPC execute_sql failed (maybe not defined), trying directly through another RPC or let's inspect the error.");
      console.log("Error:", errAlter);
    } else {
      console.log("Successfully altered function to STABLE!");
    }

    // Benchmark the query now
    console.time("Query after optimization");
    const { data, error: errQuery } = await supabase.schema('engenharia')
      .from('v_composicoes_cdu')
      .select('*')
      .eq('fonte', 'GOINFRA')
      .order('codigo', { ascending: true })
      .range(0, 49);
    console.timeEnd("Query after optimization");

    console.log("Rows returned:", data?.length, "Error:", errQuery);

  } catch (err) {
    console.error("Exception:", err);
  }
}
run();
