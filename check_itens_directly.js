import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dntpnrzevzkwooihqbbx.supabase.co';
const supabaseAnonKey = 'sb_publishable_qwnWAG0pELpkSf_6brrZ1A_cWiP477X';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  try {
    console.log("Running the disambiguated query:");
    const { data: items, error } = await supabase
      .schema('engenharia')
      .from('composicao_itens')
      .select(`
        *,
        insumo:insumos (*),
        sub_composicao:composicoes!composicao_itens_sub_composicao_id_fkey (*)
      `)
      .limit(5);
    
    console.log("Error:", error);
    console.log("Items:", items);
  } catch (e) {
    console.error("Error:", e);
  }
}

check();
