const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://omrnyzuzkbyklygthydo.supabase.co';
const envContent = fs.readFileSync('.env', 'utf8');
const lines = envContent.split('\n');
let key = '';
lines.forEach(line => {
  if (line.includes('VITE_SUPABASE_ANON_KEY')) {
    key = line.split('=')[1].trim().replace(/"/g, '').replace(/'/g, '');
  }
});

const supabase = createClient(supabaseUrl, key);

async function check() {
  const desc = 'CARGA, MANOBRA E DESCARGA DE SOLOS E MATERIAIS GRANULARES EM CAMINHÃO BASCULANTE 6 M³ - CARGA COM PÁ CARREGADEIRA';
  
  // 1. Busca todas as composições com essa descrição
  const { data: comps, error: errComp } = await supabase.schema('engenharia')
    .from('composicoes')
    .select('*')
    .ilike('descricao', desc);

  console.log('Composições encontradas:', comps);

  if (comps && comps.length > 0) {
    for (const comp of comps) {
      // 2. Busca os itens de cada uma
      const { data: itens, error: errItens } = await supabase.schema('engenharia')
        .from('composicao_itens')
        .select('*')
        .eq('composicao_id', comp.id);
      
      console.log(`Itens para a composição ${comp.codigo} (${comp.fonte}):`, itens);
    }
  }
}

check();
