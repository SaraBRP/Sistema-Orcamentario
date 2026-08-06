-- Desabilitar RLS (Row Level Security) para permitir acesso de leitura/escrita aos orçamentos e insumos
ALTER TABLE engenharia.orcamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE engenharia.orcamento_itens DISABLE ROW LEVEL SECURITY;
ALTER TABLE engenharia.insumos DISABLE ROW LEVEL SECURITY;
ALTER TABLE engenharia.composicoes DISABLE ROW LEVEL SECURITY;
