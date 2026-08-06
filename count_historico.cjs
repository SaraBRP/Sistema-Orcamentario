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
  const { data: list, error } = await supabase.schema('engenharia')
    .from('insumos')
    .select('tipo, fonte_preco')
    .limit(100000);

  if (error) {
    console.error('Error fetching:', error);
    return;
  }

  const counts = {};
  list.forEach(item => {
    const key = `${item.fonte_preco} - ${item.tipo}`;
    counts[key] = (counts[key] || 0) + 1;
  });

  console.log('Insumos counts by source and type:', counts);
}

check();
