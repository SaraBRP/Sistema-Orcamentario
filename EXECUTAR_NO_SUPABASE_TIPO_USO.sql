-- =========================================================================
-- ADICIONAR CAMPO TIPO_USO (DIRETO, INDIRETO, AMBOS) NA TABELA INSUMOS
-- Execute este script no SQL Editor do seu Supabase para criar a coluna e atualizar a base existente.
-- =========================================================================

-- 1. Criar coluna tipo_uso com valor padrão 'direto'
ALTER TABLE engenharia.insumos 
ADD COLUMN IF NOT EXISTS tipo_uso TEXT DEFAULT 'direto';

-- 2. Atualizar todos os insumos já cadastrados para 'direto' (conforme solicitado)
UPDATE engenharia.insumos 
SET tipo_uso = 'direto' 
WHERE tipo_uso IS NULL OR tipo_uso = '';

-- 3. Recarregar o schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
