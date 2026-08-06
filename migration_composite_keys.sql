-- Alterar restrição de unicidade da tabela insumos para permitir códigos iguais em fontes ou estados diferentes
ALTER TABLE engenharia.insumos DROP CONSTRAINT IF EXISTS insumos_codigo_key;
ALTER TABLE engenharia.insumos DROP CONSTRAINT IF EXISTS insumos_codigo_fonte_estado_key;
ALTER TABLE engenharia.insumos ADD CONSTRAINT insumos_codigo_fonte_estado_key UNIQUE (codigo, fonte_preco, estado);

-- Alterar restrição de unicidade da tabela composicoes para permitir códigos iguais em fontes diferentes
ALTER TABLE engenharia.composicoes DROP CONSTRAINT IF EXISTS composicoes_codigo_key;
ALTER TABLE engenharia.composicoes DROP CONSTRAINT IF EXISTS composicoes_codigo_fonte_key;
ALTER TABLE engenharia.composicoes ADD CONSTRAINT composicoes_codigo_fonte_key UNIQUE (codigo, fonte);
