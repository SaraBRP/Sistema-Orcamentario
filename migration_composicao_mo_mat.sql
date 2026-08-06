-- ################################################
-- SISTEMA ORÇAMENTÁRIO - MIGRAÇÃO MO E MAT
-- Este script cria as funções recursivas para calcular o desdobramento
-- de Mão de Obra (MO) e Material/Outros (MAT) de composições e subcomposições,
-- e atualiza a view v_composicoes_cdu.
-- ################################################

-- 1. Função para calcular o total de Mão de Obra (MO)
CREATE OR REPLACE FUNCTION engenharia.fn_calcular_mo_composicao(
  p_composicao_id UUID,
  p_tipo_preco TEXT DEFAULT 'sem_desoneracao'
)
RETURNS NUMERIC(15,6) AS $$
DECLARE
  v_total NUMERIC(15,6) := 0;
  v_item RECORD;
  v_item_valor NUMERIC(15,6);
  v_ins_tipo TEXT;
BEGIN
  -- Se a composição não tiver itens, retorna 0
  IF NOT EXISTS (SELECT 1 FROM engenharia.composicao_itens WHERE composicao_id = p_composicao_id) THEN
    RETURN 0;
  END IF;

  FOR v_item IN 
    SELECT insumo_id, sub_composicao_id, coeficiente, perda_percentual 
    FROM engenharia.composicao_itens 
    WHERE composicao_id = p_composicao_id
  LOOP
    IF v_item.insumo_id IS NOT NULL THEN
      SELECT tipo INTO v_ins_tipo FROM engenharia.insumos WHERE id = v_item.insumo_id;
      
      IF v_ins_tipo = 'Mão de Obra' THEN
        SELECT COALESCE(valor_desonerado, valor, 0) INTO v_item_valor FROM engenharia.insumos WHERE id = v_item.insumo_id;
        v_total := v_total + v_item_valor * v_item.coeficiente * (1 + COALESCE(v_item.perda_percentual, 0) / 100);
      END IF;
      
    ELSIF v_item.sub_composicao_id IS NOT NULL THEN
      v_total := v_total + engenharia.fn_calcular_mo_composicao(v_item.sub_composicao_id, p_tipo_preco) * v_item.coeficiente * (1 + COALESCE(v_item.perda_percentual, 0) / 100);
    END IF;
  END LOOP;

  RETURN COALESCE(v_total, 0);
END;
$$ LANGUAGE plpgsql;

-- 2. Função para calcular o total de Material/Outros (MAT)
CREATE OR REPLACE FUNCTION engenharia.fn_calcular_mat_composicao(
  p_composicao_id UUID,
  p_tipo_preco TEXT DEFAULT 'sem_desoneracao'
)
RETURNS NUMERIC(15,6) AS $$
DECLARE
  v_total NUMERIC(15,6) := 0;
  v_item RECORD;
  v_item_valor NUMERIC(15,6);
  v_ins_tipo TEXT;
  v_custo_salvo NUMERIC(15,6);
BEGIN
  -- Se a composição não tiver itens (ex: composição de referência do sistema),
  -- considera o valor integral dela como MAT (Material)
  IF NOT EXISTS (SELECT 1 FROM engenharia.composicao_itens WHERE composicao_id = p_composicao_id) THEN
    SELECT 
      CASE 
        WHEN p_tipo_preco = 'com_desoneracao' THEN custo_desonerado
        WHEN p_tipo_preco = 'sem_encargos' THEN custo_sem_encargos
        ELSE custo_sem_desoneracao
      END
    INTO v_custo_salvo
    FROM engenharia.composicoes
    WHERE id = p_composicao_id;
    
    RETURN COALESCE(v_custo_salvo, 0);
  END IF;

  FOR v_item IN 
    SELECT insumo_id, sub_composicao_id, coeficiente, perda_percentual 
    FROM engenharia.composicao_itens 
    WHERE composicao_id = p_composicao_id
  LOOP
    IF v_item.insumo_id IS NOT NULL THEN
      SELECT tipo INTO v_ins_tipo FROM engenharia.insumos WHERE id = v_item.insumo_id;
      
      IF v_ins_tipo = 'Equipamento' THEN
        SELECT COALESCE(valor_nao_desonerado_operativo, valor, 0) INTO v_item_valor FROM engenharia.insumos WHERE id = v_item.insumo_id;
        v_total := v_total + v_item_valor * v_item.coeficiente * (1 + COALESCE(v_item.perda_percentual, 0) / 100);
      ELSIF v_ins_tipo <> 'Mão de Obra' OR v_ins_tipo IS NULL THEN
        SELECT COALESCE(valor, valor_nao_desonerado, 0) INTO v_item_valor FROM engenharia.insumos WHERE id = v_item.insumo_id;
        v_total := v_total + v_item_valor * v_item.coeficiente * (1 + COALESCE(v_item.perda_percentual, 0) / 100);
      END IF;
      
    ELSIF v_item.sub_composicao_id IS NOT NULL THEN
      v_total := v_total + engenharia.fn_calcular_mat_composicao(v_item.sub_composicao_id, p_tipo_preco) * v_item.coeficiente * (1 + COALESCE(v_item.perda_percentual, 0) / 100);
    END IF;
  END LOOP;

  RETURN COALESCE(v_total, 0);
END;
$$ LANGUAGE plpgsql;

-- 3. Recriar a view v_composicoes_cdu incluindo os desdobramentos de MO e MAT nas 3 modalidades de preço
DROP VIEW IF EXISTS engenharia.v_composicoes_cdu CASCADE;

CREATE OR REPLACE VIEW engenharia.v_composicoes_cdu AS
SELECT 
  c.*, 
  COALESCE(c.custo_sem_desoneracao, engenharia.fn_calcular_cdu_composicao(c.id, 'sem_desoneracao')) as cdu_sem_desoneracao,
  COALESCE(c.custo_desonerado,      engenharia.fn_calcular_cdu_composicao(c.id, 'com_desoneracao')) as cdu_desonerado,
  COALESCE(c.custo_sem_encargos,    engenharia.fn_calcular_cdu_composicao(c.id, 'sem_encargos')) as cdu_sem_encargos,
  COALESCE(c.custo_sem_desoneracao, engenharia.fn_calcular_cdu_composicao(c.id, 'sem_desoneracao')) as cdu,
  
  -- MO (Mão de Obra)
  engenharia.fn_calcular_mo_composicao(c.id, 'sem_desoneracao') as mo_sem_desoneracao,
  engenharia.fn_calcular_mo_composicao(c.id, 'com_desoneracao') as mo_desonerado,
  engenharia.fn_calcular_mo_composicao(c.id, 'sem_encargos') as mo_sem_encargos,
  
  -- MAT (Material e outros)
  engenharia.fn_calcular_mat_composicao(c.id, 'sem_desoneracao') as mat_sem_desoneracao,
  engenharia.fn_calcular_mat_composicao(c.id, 'com_desoneracao') as mat_desonerado,
  engenharia.fn_calcular_mat_composicao(c.id, 'sem_encargos') as mat_sem_encargos
FROM engenharia.composicoes c;
