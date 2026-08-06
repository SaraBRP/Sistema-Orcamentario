-- 1. Remover a restrição UNIQUE antiga de codigo na tabela engenharia.orcamentos
ALTER TABLE engenharia.orcamentos DROP CONSTRAINT IF EXISTS orcamentos_codigo_key;

-- 2. Adicionar as novas colunas à tabela engenharia.orcamentos
ALTER TABLE engenharia.orcamentos ADD COLUMN IF NOT EXISTS cliente TEXT;
ALTER TABLE engenharia.orcamentos ADD COLUMN IF NOT EXISTS projeto TEXT;
ALTER TABLE engenharia.orcamentos ADD COLUMN IF NOT EXISTS gestor_cliente TEXT;
ALTER TABLE engenharia.orcamentos ADD COLUMN IF NOT EXISTS revisao VARCHAR(10) DEFAULT '0';

-- 3. Criar a nova restrição UNIQUE composta por codigo e revisao
ALTER TABLE engenharia.orcamentos ADD CONSTRAINT orcamentos_codigo_revisao_key UNIQUE (codigo, revisao);

-- 4. Adicionar colunas de detalhamento de custo unitário e total à tabela engenharia.orcamento_itens
ALTER TABLE engenharia.orcamento_itens ADD COLUMN IF NOT EXISTS valor_unitario_mat NUMERIC(15,6) DEFAULT 0;
ALTER TABLE engenharia.orcamento_itens ADD COLUMN IF NOT EXISTS valor_unitario_mo NUMERIC(15,6) DEFAULT 0;
ALTER TABLE engenharia.orcamento_itens ADD COLUMN IF NOT EXISTS total_mat NUMERIC(18,6) DEFAULT 0;
ALTER TABLE engenharia.orcamento_itens ADD COLUMN IF NOT EXISTS total_mo NUMERIC(18,6) DEFAULT 0;
