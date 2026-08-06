-- MIGRATION: Altera as chaves estrangeiras para ON DELETE SET NULL para evitar erros ao deletar bases de composições e insumos
-- IMPORTANTE: Execute este script no SQL Editor do Supabase para que a deleção de bases funcione sem erros de chave estrangeira.

ALTER TABLE engenharia.orcamento_itens 
  DROP CONSTRAINT IF EXISTS orcamento_itens_composicao_id_fkey,
  ADD CONSTRAINT orcamento_itens_composicao_id_fkey 
    FOREIGN KEY (composicao_id) 
    REFERENCES engenharia.composicoes(id) 
    ON DELETE SET NULL;

ALTER TABLE engenharia.planilha_cliente_itens 
  DROP CONSTRAINT IF EXISTS planilha_cliente_itens_composicao_id_fkey,
  ADD CONSTRAINT planilha_cliente_itens_composicao_id_fkey 
    FOREIGN KEY (composicao_id) 
    REFERENCES engenharia.composicoes(id) 
    ON DELETE SET NULL;

ALTER TABLE engenharia.planilha_cliente_itens 
  DROP CONSTRAINT IF EXISTS planilha_cliente_itens_insumo_id_fkey,
  ADD CONSTRAINT planilha_cliente_itens_insumo_id_fkey 
    FOREIGN KEY (insumo_id) 
    REFERENCES engenharia.insumos(id) 
    ON DELETE SET NULL;
