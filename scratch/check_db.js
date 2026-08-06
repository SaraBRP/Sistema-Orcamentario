import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dntpnrzevzkwooihqbbx.supabase.co';
const supabaseAnonKey = 'sb_publishable_qwnWAG0pELpkSf_6brrZ1A_cWiP477X';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  try {
    // 1. Get recent imports
    const { data: imports, error: impErr } = await supabase
      .schema('engenharia')
      .from('orcamentos_importados')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (impErr) {
      console.error("Imports Error:", impErr);
      return;
    }

    console.log("Recent Imports:");
    imports.forEach(imp => {
      console.log(`ID: ${imp.id} | Projeto: ${imp.projeto} | File: ${imp.nome_arquivo} | Status: ${imp.status}`);
    });

    const targetImport = imports.find(imp => imp.projeto?.includes("PLANIL_1") || imp.nome_arquivo?.includes("PLANIL_1"));
    const importId = targetImport ? targetImport.id : imports[0]?.id;

    if (!importId) {
      console.log("No imports found.");
      return;
    }

    console.log(`\nFetching items for Import ID: ${importId}`);

    const { data: items, error: itemsErr } = await supabase
      .schema('engenharia')
      .from('orcamento_importado_itens')
      .select('*')
      .eq('orcamento_importado_id', importId);

    if (itemsErr) {
      console.error("Items Error:", itemsErr);
      return;
    }

    // Sort items by EAP using natural sorting
    const sortEap = (a, b) => {
      const partsA = (a || '').split('.');
      const partsB = (b || '').split('.');
      const len = Math.max(partsA.length, partsB.length);
      for (let i = 0; i < len; i++) {
        const numA = parseInt(partsA[i] || '0', 10);
        const numB = parseInt(partsB[i] || '0', 10);
        if (numA !== numB) return numA - numB;
      }
      return 0;
    };

    items.sort((a, b) => sortEap(a.item_eap, b.item_eap));

    console.log("\nItems:");
    items.forEach(it => {
      if (it.item_eap.startsWith("1.1")) {
        console.log(`EAP: ${it.item_eap} | Desc: ${it.descricao || '<empty>'} | Status: ${it.status_linha} | ValEmpresa: ${it.valor_unitario_empresa} | TotalEmpresa: ${it.total_empresa} | CompID: ${it.composicao_id} | InsumoID: ${it.insumo_id}`);
      }
    });

    // 4. Fetch from orcamentos and orcamento_itens
    console.log(`\nFetching generated budgets for Import ID: ${importId}`);
    const { data: orcs, error: orcsErr } = await supabase
      .schema('engenharia')
      .from('orcamentos')
      .select('*')
      .eq('orcamento_importado_id', importId);

    if (orcsErr) {
      console.error("Orcamentos Error:", orcsErr);
      return;
    }

    for (const orc of orcs) {
      console.log(`\nBudget ID: ${orc.id} | Codigo: ${orc.codigo} | Nome: ${orc.nome}`);
      const { data: oItems, error: oItemsErr } = await supabase
        .schema('engenharia')
        .from('orcamento_itens')
        .select('*')
        .eq('orcamento_id', orc.id);

      if (oItemsErr) {
        console.error("Orcamento Items Error:", oItemsErr);
        continue;
      }

      oItems.sort((a, b) => sortEap(a.item_eap, b.item_eap));
      console.log("Orcamento Items:");
      oItems.forEach(it => {
        if (it.item_eap.startsWith("1.1")) {
          console.log(`EAP: ${it.item_eap} | Cod: ${it.codigo} | Desc: ${it.descricao || '<empty>'} | Qtd: ${it.quantidade} | Unit: ${it.valor_unitario} | Total: ${it.total}`);
        }
      });
    }

  } catch (e) {
    console.error("Error:", e);
  }
}

check();
