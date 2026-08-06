import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dntpnrzevzkwooihqbbx.supabase.co';
const supabaseAnonKey = 'sb_publishable_qwnWAG0pELpkSf_6brrZ1A_cWiP477X';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    let allItems = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase.schema('engenharia')
        .from('composicao_itens')
        .select('composicao_id, sub_composicao_id')
        .not('sub_composicao_id', 'is', null)
        .range(from, from + limit - 1);

      if (error) {
        console.error("Error loading items:", error);
        return;
      }

      allItems = allItems.concat(data);
      console.log(`Loaded ${allItems.length} sub-composition relationships...`);

      if (data.length < limit) {
        hasMore = false;
      } else {
        from += limit;
      }
    }

    console.log(`\nChecking all ${allItems.length} relationships for cycles...`);

    // Build adjacency list
    const adj = new Map();
    allItems.forEach(it => {
      if (!adj.has(it.composicao_id)) {
        adj.set(it.composicao_id, []);
      }
      adj.get(it.composicao_id).push(it.sub_composicao_id);
    });

    // Detect cycle using DFS
    const visited = new Set();
    const recStack = new Set();
    let cyclePath = [];

    function dfs(node) {
      visited.add(node);
      recStack.add(node);
      cyclePath.push(node);

      const neighbors = adj.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          // Cycle found!
          cyclePath.push(neighbor);
          return true;
        }
      }

      recStack.delete(node);
      cyclePath.pop();
      return false;
    }

    let hasCycle = false;
    for (const node of adj.keys()) {
      if (!visited.has(node)) {
        if (dfs(node)) {
          hasCycle = true;
          break;
        }
      }
    }

    if (hasCycle) {
      console.log("\n⚠️ CIRCULAR REFERENCE DETECTED!");
      console.log("Path of the cycle:", cyclePath);
      
      const uniqueIds = Array.from(new Set(cyclePath));
      const { data: details } = await supabase.schema('engenharia')
        .from('composicoes')
        .select('id, codigo, descricao')
        .in('id', uniqueIds);

      const detailsMap = new Map(details?.map(d => [d.id, d]));
      console.log("\nDetailed Cycle Path:");
      cyclePath.forEach(id => {
        const comp = detailsMap.get(id);
        console.log(`  - Code: ${comp?.codigo} | Desc: ${comp?.descricao}`);
      });

    } else {
      console.log("\n✅ No circular references found in any of the sub-composition links!");
    }

  } catch (err) {
    console.error("Exception:", err);
  }
}
run();
