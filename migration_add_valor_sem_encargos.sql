-- ################################################
-- MIGRAÇÃO: Adiciona coluna valor_sem_encargos na tabela de insumos
-- Execute este comando no SQL Editor do seu Supabase
-- ################################################

ALTER TABLE engenharia.insumos 
ADD COLUMN IF NOT EXISTS valor_sem_encargos NUMERIC(15,6);
