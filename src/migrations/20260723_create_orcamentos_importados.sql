-- Migration: 20260723_create_orcamentos_importados.sql
-- Tabela para armazenar planilhas Excel importadas do cliente
CREATE TABLE IF NOT EXISTS engenharia.orcamentos_importados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_arquivo TEXT NOT NULL,
    cliente TEXT,
    projeto TEXT,
    status TEXT DEFAULT 'Aguardando De-Para', -- 'Aguardando De-Para', 'Em Vinculação', 'Concluído'
    config_mapeamento JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para armazenar as linhas individuais da planilha importada e os vínculos de De-Para
CREATE TABLE IF NOT EXISTS engenharia.orcamento_importado_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orcamento_importado_id UUID NOT NULL REFERENCES engenharia.orcamentos_importados(id) ON DELETE CASCADE,
    item_eap TEXT NOT NULL,
    descricao TEXT NOT NULL,
    unidade TEXT,
    quantidade NUMERIC(18,6) DEFAULT 0,
    valor_unitario_mat_orig NUMERIC(18,6) DEFAULT 0,
    valor_unitario_mo_orig NUMERIC(18,6) DEFAULT 0,
    valor_unitario_orig NUMERIC(18,6) DEFAULT 0,
    total_mat_orig NUMERIC(18,6) DEFAULT 0,
    total_mo_orig NUMERIC(18,6) DEFAULT 0,
    total_orig NUMERIC(18,6) DEFAULT 0,
    -- Vínculo com a base da empresa (De-Para)
    composicao_id UUID REFERENCES engenharia.composicoes(id) ON DELETE SET NULL,
    insumo_id UUID REFERENCES engenharia.insumos(id) ON DELETE SET NULL,
    tipo_vinculo TEXT, -- 'composicao' | 'insumo'
    valor_unitario_empresa NUMERIC(18,6) DEFAULT 0,
    total_empresa NUMERIC(18,6) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vínculo de orçamentos da empresa com a planilha de importação do cliente
ALTER TABLE engenharia.orcamentos ADD COLUMN IF NOT EXISTS orcamento_importado_id UUID REFERENCES engenharia.orcamentos_importados(id) ON DELETE SET NULL;

-- Permissões e RLS
ALTER TABLE engenharia.orcamentos_importados DISABLE ROW LEVEL SECURITY;
ALTER TABLE engenharia.orcamento_importado_itens DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE engenharia.orcamentos_importados TO anon, authenticated, service_role;
GRANT ALL ON TABLE engenharia.orcamento_importado_itens TO anon, authenticated, service_role;

-- Recarregar cache do PostgREST
NOTIFY pgrst, 'reload schema';
