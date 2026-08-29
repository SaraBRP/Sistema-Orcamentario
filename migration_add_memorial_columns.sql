-- ################################################
-- MIGRAÇÃO PARA MEMÓRIA DE CÁLCULO E PARÂMETROS GLOBAIS
-- Executar este script no SQL Editor do Supabase
-- ################################################

-- 1. Adiciona a coluna dados_complementares na tabela de orçamentos (Parâmetros Globais da Obra)
ALTER TABLE engenharia.orcamentos 
ADD COLUMN IF NOT EXISTS dados_complementares JSONB DEFAULT '[]'::jsonb;

-- 2. Adiciona as colunas observacao_memoria e formulas_lista na tabela de itens do orçamento
ALTER TABLE engenharia.orcamento_itens 
ADD COLUMN IF NOT EXISTS observacao_memoria TEXT,
ADD COLUMN IF NOT EXISTS formulas_lista JSONB DEFAULT '[]'::jsonb;
