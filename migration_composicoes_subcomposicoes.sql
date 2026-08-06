-- 1. Alterar a coluna insumo_id para ser anulável (permitindo subcomposições)
ALTER TABLE engenharia.composicao_itens 
  ALTER COLUMN insumo_id DROP NOT NULL;

-- 2. Adicionar a coluna sub_composicao_id referenciando engenharia.composicoes
ALTER TABLE engenharia.composicao_itens 
  ADD COLUMN IF NOT EXISTS sub_composicao_id UUID REFERENCES engenharia.composicoes(id) ON DELETE CASCADE;

-- 3. Adicionar restrição check para garantir que o item seja ou um insumo ou uma subcomposição, nunca ambos
ALTER TABLE engenharia.composicao_itens 
  DROP CONSTRAINT IF EXISTS check_item_type;

ALTER TABLE engenharia.composicao_itens 
  ADD CONSTRAINT check_item_type CHECK (
    (insumo_id IS NOT NULL AND sub_composicao_id IS NULL) OR 
    (insumo_id IS NULL AND sub_composicao_id IS NOT NULL)
  );

-- 4. Criar a função recursiva fn_calcular_cdu_composicao para calcular o Custo Direto Unitário (CDU) para cada tipo de preço
CREATE OR REPLACE FUNCTION engenharia.fn_calcular_cdu_composicao(
  p_composicao_id UUID,
  p_tipo_preco TEXT DEFAULT 'sem_desoneracao'
)
RETURNS NUMERIC(15,6) AS $$
DECLARE
  v_total NUMERIC(15,6) := 0;
  v_item RECORD;
BEGIN
  FOR v_item IN 
    SELECT insumo_id, sub_composicao_id, coeficiente, perda_percentual 
    FROM engenharia.composicao_itens 
    WHERE composicao_id = p_composicao_id
  LOOP
    IF v_item.insumo_id IS NOT NULL THEN
      v_total := v_total + (
        SELECT CASE 
          WHEN p_tipo_preco = 'com_desoneracao' THEN COALESCE(valor_desonerado, valor, 0)
          WHEN p_tipo_preco = 'sem_encargos' THEN COALESCE(valor_sem_encargos, valor, 0)
          ELSE COALESCE(valor_nao_desonerado, valor, 0)
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

-- 5. Criar a view v_fontes_composicao para listar as bases de composições de forma dinâmica
CREATE OR REPLACE VIEW engenharia.v_fontes_composicao AS
SELECT DISTINCT fonte FROM engenharia.composicoes WHERE fonte IS NOT NULL;

-- 6. Criar a view v_composicoes_cdu para obter composições com o CDU calculado nas três modalidades
CREATE OR REPLACE VIEW engenharia.v_composicoes_cdu AS
SELECT 
  c.*, 
  engenharia.fn_calcular_cdu_composicao(c.id, 'sem_desoneracao') as cdu_sem_desoneracao,
  engenharia.fn_calcular_cdu_composicao(c.id, 'com_desoneracao') as cdu_desonerado,
  engenharia.fn_calcular_cdu_composicao(c.id, 'sem_encargos') as cdu_sem_encargos,
  engenharia.fn_calcular_cdu_composicao(c.id, 'sem_desoneracao') as cdu
FROM engenharia.composicoes c;
