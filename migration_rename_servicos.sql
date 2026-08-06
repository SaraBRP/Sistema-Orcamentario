-- ################################################
-- MIGRAÇÃO: Altera tipo para TEXT e renomeia "Serviços de Terceiros" para "Serviços"
-- Execute este comando no SQL Editor do seu Supabase
-- ################################################

-- Altera o tipo da coluna 'tipo' para TEXT (removendo restrições de enum)
ALTER TABLE engenharia.insumos ALTER COLUMN tipo TYPE TEXT USING tipo::TEXT;

-- Atualiza os registros existentes
UPDATE engenharia.insumos SET tipo = 'Serviços' WHERE tipo = 'Serviços de Terceiros';
