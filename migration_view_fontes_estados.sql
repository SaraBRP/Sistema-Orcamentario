-- MIGRATION: Cria a view v_fontes_estados para obter de forma barata os estados (UFs) disponíveis por fonte_preco
CREATE OR REPLACE VIEW engenharia.v_fontes_estados AS
SELECT DISTINCT fonte_preco, estado 
FROM engenharia.insumos 
WHERE fonte_preco IS NOT NULL AND estado IS NOT NULL;
