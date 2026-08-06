-- MIGRATION: Adiciona coluna custo_transporte para suportar o Custo Unitário Total de Transporte do SICRO (Seção F)
-- IMPORTANTE: Execute este script no SQL Editor do Supabase para atualizar a estrutura de cálculo.

ALTER TABLE engenharia.composicoes ADD COLUMN IF NOT EXISTS custo_transporte NUMERIC(15,6) DEFAULT 0;

-- Recriar a função de cálculo de CDU (fn_calcular_cdu_composicao) incluindo custo_transporte
CREATE OR REPLACE FUNCTION engenharia.fn_calcular_cdu_composicao(
  p_composicao_id UUID,
  p_tipo_preco TEXT DEFAULT 'sem_desoneracao'
)
RETURNS NUMERIC(15,6) AS $$
DECLARE
  v_total NUMERIC(15,6) := 0;
  v_item RECORD;
  v_producao NUMERIC(15,6) := 1;
  v_fic_factor NUMERIC(15,6) := 0;
  v_custo_tempo_fixo NUMERIC(15,6) := 0;
  v_custo_ativ_aux NUMERIC(15,6) := 0;
  v_custo_transporte NUMERIC(15,6) := 0;
  v_mo_total NUMERIC(15,6) := 0;
  v_eq_improd_total NUMERIC(15,6) := 0;
  v_item_valor NUMERIC(15,6) := 0;
  v_item_improd_valor NUMERIC(15,6) := 0;
  v_comp_fonte TEXT;
  v_is_sicro BOOLEAN := FALSE;
BEGIN
  -- Buscar dados da composição
  SELECT 
    COALESCE(producao_equipe, 1), 
    COALESCE(fic_factor, 0), 
    COALESCE(custo_tempo_fixo, 0), 
    COALESCE(custo_atividades_auxiliares, 0),
    COALESCE(custo_transporte, 0),
    fonte
  INTO 
    v_producao, 
    v_fic_factor, 
    v_custo_tempo_fixo, 
    v_custo_ativ_aux,
    v_custo_transporte,
    v_comp_fonte
  FROM engenharia.composicoes 
  WHERE id = p_composicao_id;

  IF v_producao <= 0 THEN
    v_producao := 1;
  END IF;

  IF v_comp_fonte ILIKE '%SICRO%' THEN
    v_is_sicro := TRUE;
  END IF;

  FOR v_item IN 
    SELECT insumo_id, sub_composicao_id, coeficiente, perda_percentual 
    FROM engenharia.composicao_itens 
    WHERE composicao_id = p_composicao_id
  LOOP
    IF v_item.insumo_id IS NOT NULL THEN
      -- Buscar valores do insumo
      SELECT 
        CASE 
          WHEN p_tipo_preco = 'com_desoneracao' THEN COALESCE(valor_desonerado, valor, 0)
          WHEN p_tipo_preco = 'sem_encargos' THEN COALESCE(valor_sem_encargos, valor, 0)
          ELSE COALESCE(valor_nao_desonerado, valor, 0)
        END,
        CASE
          WHEN p_tipo_preco = 'com_desoneracao' THEN COALESCE(valor_desonerado_improdutivo, valor_nao_desonerado_improdutivo, 0)
          ELSE COALESCE(valor_nao_desonerado_improdutivo, 0)
        END
      INTO 
        v_item_valor,
        v_item_improd_valor
      FROM engenharia.insumos 
      WHERE id = v_item.insumo_id;

      -- Verificar se é mão de obra ou equipamento
      DECLARE
        v_ins_tipo TEXT;
      BEGIN
        SELECT tipo INTO v_ins_tipo FROM engenharia.insumos WHERE id = v_item.insumo_id;
        
        IF v_is_sicro AND (v_ins_tipo LIKE 'Equipamento%' OR v_ins_tipo LIKE 'Mão de Obra%') THEN
          -- Custo de Execução Unitário
          v_total := v_total + (v_item_valor / v_producao) * v_item.coeficiente * (1 + v_item.perda_percentual / 100);
          
          -- Acumular totais para o cálculo de FIC
          IF v_ins_tipo LIKE 'Mão de Obra%' THEN
            v_mo_total := v_mo_total + v_item_valor * v_item.coeficiente;
          ELSIF v_ins_tipo LIKE 'Equipamento%' THEN
            v_eq_improd_total := v_eq_improd_total + v_item_improd_valor * v_item.coeficiente;
          END IF;
        ELSE
          -- Materiais e Outros
          v_total := v_total + v_item_valor * v_item.coeficiente * (1 + v_item.perda_percentual / 100);
        END IF;
      END;
      
    ELSIF v_item.sub_composicao_id IS NOT NULL THEN
      -- Subcomposição
      v_total := v_total + (SELECT engenharia.fn_calcular_cdu_composicao(v_item.sub_composicao_id, p_tipo_preco)) 
        * v_item.coeficiente * (1 + v_item.perda_percentual / 100);
    END IF;
  END LOOP;

  -- Adicionar FIC, Tempo Fixo, Atividades Auxiliares e Transporte se for SICRO
  IF v_is_sicro THEN
    -- Custo do FIC = (Mão de Obra Horária + Equipamentos Improdutivos Horários) * FIC_factor / Produção
    v_total := v_total + ((v_mo_total + v_eq_improd_total) * v_fic_factor) / v_producao;
    -- Tempo Fixo
    v_total := v_total + v_custo_tempo_fixo;
    -- Atividades Auxiliares
    v_total := v_total + v_custo_ativ_aux;
    -- Transporte
    v_total := v_total + v_custo_transporte;
  END IF;

  RETURN COALESCE(v_total, 0);
END;
$$ LANGUAGE plpgsql;

-- Recriar a view cdu para atualizar as referências
DROP VIEW IF EXISTS engenharia.v_composicoes_cdu CASCADE;

CREATE OR REPLACE VIEW engenharia.v_composicoes_cdu AS
SELECT 
  c.*, 
  engenharia.fn_calcular_cdu_composicao(c.id, 'sem_desoneracao') as cdu_sem_desoneracao,
  engenharia.fn_calcular_cdu_composicao(c.id, 'com_desoneracao') as cdu_desonerado,
  engenharia.fn_calcular_cdu_composicao(c.id, 'sem_encargos') as cdu_sem_encargos,
  engenharia.fn_calcular_cdu_composicao(c.id, 'sem_desoneracao') as cdu
FROM engenharia.composicoes c;
