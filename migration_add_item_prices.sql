-- Adiciona colunas para salvar os preços unitários diretamente nos itens de composições, 
-- útil para armazenar tarifas de transporte das seções E e F do SICRO.
ALTER TABLE engenharia.composicao_itens 
ADD COLUMN IF NOT EXISTS preco_unitario NUMERIC(15,6) DEFAULT 0;

ALTER TABLE engenharia.composicao_itens 
ADD COLUMN IF NOT EXISTS preco_unitario_improdutivo NUMERIC(15,6) DEFAULT 0;
