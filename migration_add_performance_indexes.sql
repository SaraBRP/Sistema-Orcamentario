-- MIGRATION: Adiciona índices de performance para chaves estrangeiras e filtros
-- Isso corrige o erro de "statement timeout" durante a exclusão de bases grandes no banco.

CREATE INDEX IF NOT EXISTS idx_composicoes_fonte ON engenharia.composicoes(fonte);
CREATE INDEX IF NOT EXISTS idx_insumos_fonte_preco ON engenharia.insumos(fonte_preco);

CREATE INDEX IF NOT EXISTS idx_composicao_itens_composicao_id ON engenharia.composicao_itens(composicao_id);
CREATE INDEX IF NOT EXISTS idx_composicao_itens_insumo_id ON engenharia.composicao_itens(insumo_id);
CREATE INDEX IF NOT EXISTS idx_composicao_itens_sub_composicao_id ON engenharia.composicao_itens(sub_composicao_id);

CREATE INDEX IF NOT EXISTS idx_orcamento_itens_composicao_id ON engenharia.orcamento_itens(composicao_id);
CREATE INDEX IF NOT EXISTS idx_planilha_cliente_itens_composicao_id ON engenharia.planilha_cliente_itens(composicao_id);
CREATE INDEX IF NOT EXISTS idx_planilha_cliente_itens_insumo_id ON engenharia.planilha_cliente_itens(insumo_id);
