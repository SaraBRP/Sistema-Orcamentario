import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const urlLine = env.split('\n').find(l => l.startsWith('VITE_SUPABASE_URL='));
const keyLine = env.split('\n').find(l => l.startsWith('VITE_SUPABASE_ANON_KEY='));

const url = urlLine.split('=')[1].trim();
const key = keyLine.split('=')[1].trim();

const supabase = createClient(url, key);

async function run() {
  try {
    console.log("Starting DB migration...");
    
    // 1. Add column to composicoes
    console.log("Adding column producao_equipe to composicoes...");
    const { data: d1, error: e1 } = await supabase.rpc('execute_sql', {
      sql_query: "ALTER TABLE engenharia.composicoes ADD COLUMN IF NOT EXISTS producao_equipe NUMERIC(15,6) DEFAULT 1;"
    });
    console.log("Step 1 result:", d1, "Error:", e1);

    // 2. Re-create function fn_calcular_cdu_composicao to divide by producao_equipe for Equipamento and Mão de Obra
    console.log("Updating fn_calcular_cdu_composicao...");
    const fnSql = `
CREATE OR REPLACE FUNCTION engenharia.fn_calcular_cdu_composicao(
  p_composicao_id UUID,
  p_tipo_preco TEXT DEFAULT 'sem_desoneracao'
)
RETURNS NUMERIC(15,6) AS $$
DECLARE
  v_total NUMERIC(15,6) := 0;
  v_item RECORD;
  v_producao NUMERIC(15,6) := 1;
BEGIN
  -- Buscar a producao da equipe
  SELECT COALESCE(producao_equipe, 1) INTO v_producao
  FROM engenharia.composicoes
  WHERE id = p_composicao_id;

  IF v_producao <= 0 THEN
    v_producao := 1;
  END IF;

  FOR v_item IN 
    SELECT insumo_id, sub_composicao_id, coeficiente, perda_percentual 
    FROM engenharia.composicao_itens 
    WHERE composicao_id = p_composicao_id
  LOOP
    IF v_item.insumo_id IS NOT NULL THEN
      v_total := v_total + (
        SELECT CASE 
          WHEN tipo LIKE 'Equipamento%' OR tipo LIKE 'Mão de Obra%' THEN
            (CASE 
              WHEN p_tipo_preco = 'com_desoneracao' THEN COALESCE(valor_desonerado, valor, 0)
              WHEN p_tipo_preco = 'sem_encargos' THEN COALESCE(valor_sem_encargos, valor, 0)
              ELSE COALESCE(valor_nao_desonerado, valor, 0)
            END) / v_producao
          ELSE
            CASE 
              WHEN p_tipo_preco = 'com_desoneracao' THEN COALESCE(valor_desonerado, valor, 0)
              WHEN p_tipo_preco = 'sem_encargos' THEN COALESCE(valor_sem_encargos, valor, 0)
              ELSE COALESCE(valor_nao_desonerado, valor, 0)
            END
        END
        FROM engenharia.insumos 
        WHERE id = v_item.insumo_id
      ) * v_item.coeficiente * (1 + v_item.perda_percentual / 100);
    ELSIF v_item.sub_composicao_id IS NOT NULL THEN
      v_total := v_total + (SELECT engenharia.fn_calcular_cdu_composicao(v_item.sub_composicao_id, p_tipo_preco)) 
        * v_item.coeficiente * (1 + v_item.perda_percentual / 100);
    END IF;
  END LOOP;
  RETURN COALESCE(v_total, 0);
END;
$$ LANGUAGE plpgsql;
    `;
    const { data: d2, error: e2 } = await supabase.rpc('execute_sql', {
      sql_query: fnSql
    });
    console.log("Step 2 result:", d2, "Error:", e2);

    console.log("Migration complete!");
  } catch (err) {
    console.error("Exception in run:", err);
  }
}
run();
