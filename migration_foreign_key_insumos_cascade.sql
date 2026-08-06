-- MIGRATION: Altera a chave estrangeira composicao_itens_insumo_id_fkey para ON DELETE CASCADE
-- para evitar erros ao deletar insumos referenciados por composições do sistema.
ALTER TABLE engenharia.composicao_itens 
  DROP CONSTRAINT IF EXISTS composicao_itens_insumo_id_fkey,
  ADD CONSTRAINT composicao_itens_insumo_id_fkey 
    FOREIGN KEY (insumo_id) 
    REFERENCES engenharia.insumos(id) 
    ON DELETE CASCADE;
