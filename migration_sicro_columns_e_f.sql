-- MIGRATION: Adiciona suporte para os itens de Tempo Fixo (E) e Transporte (F)
-- e corrige a duplicidade de cálculo de Atividades Auxiliares.

-- 1. Adicionar colunas necessárias na tabela de itens de composição
ALTER TABLE engenharia.composicao_itens ADD COLUMN IF NOT EXISTS secao_sicro TEXT;
ALTER TABLE engenharia.composicao_itens ADD COLUMN IF NOT EXISTS codigo_auxiliar TEXT;
ALTER TABLE engenharia.composicao_itens ADD COLUMN IF NOT EXISTS codigo_ln TEXT;
ALTER TABLE engenharia.composicao_itens ADD COLUMN IF NOT EXISTS codigo_rp TEXT;
ALTER TABLE engenharia.composicao_itens ADD COLUMN IF NOT EXISTS codigo_p TEXT;

-- 2. Recriar a função de cálculo corrigindo a duplicidade de Atividades Auxiliares
-- e ignorando itens de Tempo Fixo (E) e Transporte (F) no loop principal (pois seus custos são somados via cabeçalho)
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
      AND (secao_sicro IS NULL OR secao_sicro NOT IN ('E', 'F')) -- Ignorar Tempo Fixo e Transporte no loop de insumos
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

  -- Adicionar FIC, Tempo Fixo, e Transporte se for SICRO
  -- NOTA: custo_atividades_auxiliares NÃO é adicionado aqui porque as subcomposições da Seção D já são somadas no loop acima!
  IF v_is_sicro THEN
    -- Custo do FIC = (Mão de Obra Horária + Equipamentos Improdutivos Horários) * FIC_factor / Produção
    v_total := v_total + ((v_mo_total + v_eq_improd_total) * v_fic_factor) / v_producao;
    -- Tempo Fixo
    v_total := v_total + v_custo_tempo_fixo;
    -- Transporte
    v_total := v_total + v_custo_transporte;
  END IF;

  RETURN COALESCE(v_total, 0);
END;
$$ LANGUAGE plpgsql;

-- 3. Recriar a view cdu para atualizar as referências
DROP VIEW IF EXISTS engenharia.v_composicoes_cdu CASCADE;

CREATE OR REPLACE VIEW engenharia.v_composicoes_cdu AS
SELECT 
  c.*, 
  engenharia.fn_calcular_cdu_composicao(c.id, 'sem_desoneracao') as cdu_sem_desoneracao,
  engenharia.fn_calcular_cdu_composicao(c.id, 'com_desoneracao') as cdu_desonerado,
  engenharia.fn_calcular_cdu_composicao(c.id, 'sem_encargos') as cdu_sem_encargos,
  engenharia.fn_calcular_cdu_composicao(c.id, 'sem_desoneracao') as cdu
FROM engenharia.composicoes c;
