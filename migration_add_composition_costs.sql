-- MIGRATION: Adiciona as colunas de custo de referência na tabela composicoes
-- e atualiza a view v_composicoes_cdu para utilizá-las como preferência (com fallback para o cálculo dinâmico).

ALTER TABLE engenharia.composicoes 
  ADD COLUMN IF NOT EXISTS custo_sem_desoneracao NUMERIC(15,6),
  ADD COLUMN IF NOT EXISTS custo_desonerado      NUMERIC(15,6),
  ADD COLUMN IF NOT EXISTS custo_sem_encargos    NUMERIC(15,6);

-- Recriar a view v_composicoes_cdu
DROP VIEW IF EXISTS engenharia.v_composicoes_cdu CASCADE;

CREATE OR REPLACE VIEW engenharia.v_composicoes_cdu AS
SELECT 
  c.*, 
  COALESCE(c.custo_sem_desoneracao, engenharia.fn_calcular_cdu_composicao(c.id, 'sem_desoneracao')) as cdu_sem_desoneracao,
  COALESCE(c.custo_desonerado,      engenharia.fn_calcular_cdu_composicao(c.id, 'com_desoneracao')) as cdu_desonerado,
  COALESCE(c.custo_sem_encargos,    engenharia.fn_calcular_cdu_composicao(c.id, 'sem_encargos')) as cdu_sem_encargos,
  COALESCE(c.custo_sem_desoneracao, engenharia.fn_calcular_cdu_composicao(c.id, 'sem_desoneracao')) as cdu
FROM engenharia.composicoes c;
