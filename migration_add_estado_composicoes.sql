-- MIGRATION: Adiciona a coluna estado na tabela composicoes
ALTER TABLE engenharia.composicoes 
  ADD COLUMN IF NOT EXISTS estado VARCHAR(2);

-- Recriar a view v_composicoes_cdu para garantir compatibilidade e incluir a coluna estado
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
