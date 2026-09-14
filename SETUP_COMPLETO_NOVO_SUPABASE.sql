-- =========================================================================
-- SCRIPT DE MIGRAÇÃO / SETUP COMPLETO DO BANCO DE DADOS - SUPABASE
-- Execute este script no SQL Editor do seu NOVO projeto Supabase.
-- =========================================================================

-- 1. Criação do Schema Engenharia
CREATE SCHEMA IF NOT EXISTS engenharia;

-- 2. Enums
DO $$ BEGIN
  CREATE TYPE engenharia.tipo_insumo AS ENUM (
    'Equipamento',
    'Equipamento para Aquisição Permanente',
    'Mão de Obra',
    'Material',
    'Serviços de Terceiros',
    'Taxas',
    'Administração',
    'Aluguel',
    'Verba',
    'Transporte e Logística',
    'Outros'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE engenharia.fonte_preco AS ENUM (
    'Cotação',
    'SINAPI',
    'SBC',
    'SICRO 2',
    'SICRO 3',
    'TCPO',
    'Histórico'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE engenharia.papel_usuario AS ENUM (
    'Superintendente de Orçamentos',
    'Gerente de Orçamentos',
    'Coordenador de Orçamentos',
    'Orçamentista',
    'Analista de Orçamentos',
    'Assistente de Orçamentos',
    'Engenheiro de Planejamento',
    'Analista Administrativo',
    'Fornecedor'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Tabela Insumos
CREATE TABLE IF NOT EXISTS engenharia.insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo TEXT,
  codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  unidade TEXT NOT NULL,
  tipo TEXT NOT NULL,
  estado CHAR(2),
  valor NUMERIC(15,6),
  observacao TEXT,
  fonte_preco TEXT,
  data_base DATE,
  condicoes_frete BOOLEAN DEFAULT FALSE,
  condicoes_impostos BOOLEAN DEFAULT FALSE,
  condicoes_pagamento TEXT,
  estado_registro TEXT DEFAULT 'ativo' CHECK (estado_registro IN ('ativo', 'inativo')),
  valor_nao_desonerado_operativo NUMERIC(15,6),
  valor_desonerado_operativo     NUMERIC(15,6),
  valor_nao_desonerado_improdutivo NUMERIC(15,6),
  valor_desonerado_improdutivo   NUMERIC(15,6),
  valor_desonerado               NUMERIC(15,6),
  valor_nao_desonerado           NUMERIC(15,6),
  valor_sem_encargos             NUMERIC(15,6),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT insumos_codigo_fonte_estado_key UNIQUE (codigo, fonte_preco, estado)
);

-- 4. Tabela Composições
CREATE TABLE IF NOT EXISTS engenharia.composicoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL,
  fonte TEXT,
  tipo_atividade TEXT,
  descricao TEXT NOT NULL,
  unidade TEXT NOT NULL,
  escopo_incluso TEXT,
  escopo_excluso TEXT,
  regra_medicao TEXT,
  familia TEXT,
  fatores_condicao TEXT[],
  p10_coeficiente NUMERIC(10,4),
  p50_coeficiente NUMERIC(10,4),
  p90_coeficiente NUMERIC(10,4),
  producao_equipe NUMERIC(15,6) DEFAULT 1,
  fic_factor NUMERIC(15,6) DEFAULT 0,
  custo_tempo_fixo NUMERIC(15,6) DEFAULT 0,
  custo_atividades_auxiliares NUMERIC(15,6) DEFAULT 0,
  custo_transporte NUMERIC(15,6) DEFAULT 0,
  custo_equipamento_operativo NUMERIC(15,6) DEFAULT 0,
  custo_equipamento_improdutivo NUMERIC(15,6) DEFAULT 0,
  custo_mao_de_obra NUMERIC(15,6) DEFAULT 0,
  custo_material NUMERIC(15,6) DEFAULT 0,
  estado CHAR(2),
  data_base DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT composicoes_codigo_fonte_estado_key UNIQUE (codigo, fonte, estado)
);

-- 5. Tabela Itens da Composição
CREATE TABLE IF NOT EXISTS engenharia.composicao_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  composicao_id UUID NOT NULL REFERENCES engenharia.composicoes(id) ON DELETE CASCADE,
  insumo_id UUID REFERENCES engenharia.insumos(id) ON DELETE CASCADE,
  sub_composicao_id UUID REFERENCES engenharia.composicoes(id) ON DELETE SET NULL,
  coeficiente NUMERIC(15,6) NOT NULL,
  perda_percentual NUMERIC(5,2) DEFAULT 0,
  secao_sicro TEXT,
  origem_sicro TEXT,
  destino_sicro TEXT,
  distancia_sicro NUMERIC(15,6),
  tipo_pavimento_sicro TEXT,
  equipamento_id UUID REFERENCES engenharia.insumos(id) ON DELETE SET NULL,
  fator_carga_sicro NUMERIC(15,6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela Importações Excel
CREATE TABLE IF NOT EXISTS engenharia.orcamentos_importados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_arquivo TEXT NOT NULL,
    cliente TEXT,
    projeto TEXT,
    status TEXT DEFAULT 'Aguardando De-Para',
    config_mapeamento JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabela Itens de Importação Excel
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
    composicao_id UUID REFERENCES engenharia.composicoes(id) ON DELETE SET NULL,
    insumo_id UUID REFERENCES engenharia.insumos(id) ON DELETE SET NULL,
    tipo_vinculo TEXT,
    valor_unitario_empresa NUMERIC(18,6) DEFAULT 0,
    total_empresa NUMERIC(18,6) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabela Orçamentos
CREATE TABLE IF NOT EXISTS engenharia.orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL,
  revisao VARCHAR(10) DEFAULT '0',
  nome TEXT NOT NULL,
  cliente TEXT,
  projeto TEXT,
  gestor_cliente TEXT,
  tipo_orcamento TEXT NOT NULL,
  data_base DATE NOT NULL,
  estado CHAR(2) NOT NULL,
  bdi_padrao NUMERIC(5,2) DEFAULT 0,
  encargos_sociais NUMERIC(5,2) DEFAULT 0,
  desonerado BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'Em Elaboração',
  responsavel TEXT,
  orcamento_importado_id UUID REFERENCES engenharia.orcamentos_importados(id) ON DELETE SET NULL,
  memorial_calculo_global JSONB,
  caderno_quantitativos JSONB,
  bindings_quantitativos JSONB,
  banco_memoria_dados JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT orcamentos_codigo_revisao_key UNIQUE (codigo, revisao)
);

-- 9. Tabela Itens do Orçamento
CREATE TABLE IF NOT EXISTS engenharia.orcamento_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID NOT NULL REFERENCES engenharia.orcamentos(id) ON DELETE CASCADE,
  item_eap TEXT NOT NULL,
  descricao TEXT NOT NULL,
  unidade TEXT NOT NULL,
  quantidade NUMERIC(15,4) NOT NULL,
  composicao_id UUID REFERENCES engenharia.composicoes(id) ON DELETE SET NULL,
  insumo_id UUID REFERENCES engenharia.insumos(id) ON DELETE SET NULL,
  tipo_item TEXT CHECK (tipo_item IN ('composicao', 'insumo', 'verba')),
  valor_unitario_base NUMERIC(15,6) NOT NULL,
  valor_unitario_mat NUMERIC(15,6) DEFAULT 0,
  valor_unitario_mo NUMERIC(15,6) DEFAULT 0,
  total_mat NUMERIC(18,6) DEFAULT 0,
  total_mo NUMERIC(18,6) DEFAULT 0,
  bdi_especifico NUMERIC(5,2),
  valor_unitario_final NUMERIC(15,6),
  valor_total NUMERIC(18,2),
  ordem INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Tabela Solicitações de Cadastro
CREATE TABLE IF NOT EXISTS engenharia.solicitacoes_cadastro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  cargo TEXT NOT NULL,
  departamento TEXT NOT NULL,
  motivo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  data_solicitacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_resposta TIMESTAMPTZ,
  respondido_por TEXT
);

-- 11. Tabela Perfis de Usuário
CREATE TABLE IF NOT EXISTS engenharia.perfis_usuario (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  papel engenharia.papel_usuario NOT NULL DEFAULT 'Orçamentista',
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Tabela Clientes
CREATE TABLE IF NOT EXISTS engenharia.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  documento TEXT,
  contato TEXT,
  email TEXT,
  telefone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Índices de Performance
CREATE INDEX IF NOT EXISTS idx_insumos_codigo ON engenharia.insumos(codigo);
CREATE INDEX IF NOT EXISTS idx_insumos_fonte_estado ON engenharia.insumos(fonte_preco, estado);
CREATE INDEX IF NOT EXISTS idx_insumos_busca ON engenharia.insumos(descricao text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_composicoes_codigo ON engenharia.composicoes(codigo);
CREATE INDEX IF NOT EXISTS idx_composicoes_fonte_estado ON engenharia.composicoes(fonte, estado);
CREATE INDEX IF NOT EXISTS idx_composicoes_busca ON engenharia.composicoes(descricao text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_composicao_itens_comp_id ON engenharia.composicao_itens(composicao_id);
CREATE INDEX IF NOT EXISTS idx_composicao_itens_insumo_id ON engenharia.composicao_itens(insumo_id);
CREATE INDEX IF NOT EXISTS idx_composicao_itens_subcomp_id ON engenharia.composicao_itens(sub_composicao_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_itens_orc_id ON engenharia.orcamento_itens(orcamento_id);

-- 14. Permissões e Desativação de RLS (Para integração direta via API Client)
ALTER TABLE engenharia.insumos DISABLE ROW LEVEL SECURITY;
ALTER TABLE engenharia.composicoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE engenharia.composicao_itens DISABLE ROW LEVEL SECURITY;
ALTER TABLE engenharia.orcamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE engenharia.orcamento_itens DISABLE ROW LEVEL SECURITY;
ALTER TABLE engenharia.orcamentos_importados DISABLE ROW LEVEL SECURITY;
ALTER TABLE engenharia.orcamento_importado_itens DISABLE ROW LEVEL SECURITY;
ALTER TABLE engenharia.solicitacoes_cadastro DISABLE ROW LEVEL SECURITY;
ALTER TABLE engenharia.perfis_usuario DISABLE ROW LEVEL SECURITY;
ALTER TABLE engenharia.clientes DISABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA engenharia TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA engenharia TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA engenharia TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA engenharia TO anon, authenticated, service_role;

-- 15. Função de Cálculo de CDU de Composição
DROP VIEW IF EXISTS engenharia.v_composicoes_cdu CASCADE;
DROP FUNCTION IF EXISTS engenharia.fn_calcular_cdu_composicao(UUID, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION engenharia.fn_calcular_cdu_composicao(p_composicao_id UUID, p_tipo_preco TEXT)
RETURNS NUMERIC AS $$
DECLARE
  v_total NUMERIC(15,6) := 0;
  v_item RECORD;
  v_producao NUMERIC(15,6);
  v_fic_factor NUMERIC(15,6);
  v_custo_tempo_fixo NUMERIC(15,6);
  v_custo_ativ_aux NUMERIC(15,6);
  v_custo_transporte NUMERIC(15,6);
  v_comp_fonte TEXT;
  v_is_sicro BOOLEAN := FALSE;
  v_item_valor NUMERIC(15,6);
  v_item_improd_valor NUMERIC(15,6);
  v_mo_total NUMERIC(15,6) := 0;
  v_eq_improd_total NUMERIC(15,6) := 0;
BEGIN
  SELECT 
    COALESCE(producao_equipe, 1), 
    COALESCE(fic_factor, 0), 
    COALESCE(custo_tempo_fixo, 0), 
    COALESCE(custo_atividades_auxiliares, 0),
    COALESCE(custo_transporte, 0),
    fonte
  INTO 
    v_producao, 
    v_fic_factor, 
    v_custo_tempo_fixo, 
    v_custo_ativ_aux,
    v_custo_transporte,
    v_comp_fonte
  FROM engenharia.composicoes 
  WHERE id = p_composicao_id;

  IF v_producao <= 0 THEN
    v_producao := 1;
  END IF;

  IF v_comp_fonte ILIKE '%SICRO%' THEN
    v_is_sicro := TRUE;
  END IF;

  FOR v_item IN 
    SELECT insumo_id, sub_composicao_id, coeficiente, perda_percentual 
    FROM engenharia.composicao_itens 
    WHERE composicao_id = p_composicao_id
      AND (secao_sicro IS NULL OR secao_sicro NOT IN ('E', 'F'))
  LOOP
    IF v_item.insumo_id IS NOT NULL THEN
      SELECT 
        CASE 
          WHEN p_tipo_preco = 'com_desoneracao' THEN COALESCE(valor_desonerado, valor, 0)
          WHEN p_tipo_preco = 'sem_encargos' THEN COALESCE(valor_sem_encargos, valor, 0)
          ELSE COALESCE(valor_nao_desonerado, valor, 0)
        END,
        CASE
          WHEN p_tipo_preco = 'com_desoneracao' THEN COALESCE(valor_desonerado_improdutivo, valor_nao_desonerado_improdutivo, 0)
          ELSE COALESCE(valor_nao_desonerado_improdutivo, 0)
        END
      INTO 
        v_item_valor,
        v_item_improd_valor
      FROM engenharia.insumos 
      WHERE id = v_item.insumo_id;

      DECLARE
        v_ins_tipo TEXT;
      BEGIN
        SELECT tipo INTO v_ins_tipo FROM engenharia.insumos WHERE id = v_item.insumo_id;
        
        IF v_is_sicro AND (v_ins_tipo LIKE 'Equipamento%' OR v_ins_tipo LIKE 'Mão de Obra%') THEN
          v_total := v_total + (v_item_valor / v_producao) * v_item.coeficiente * (1 + v_item.perda_percentual / 100);
          IF v_ins_tipo LIKE 'Mão de Obra%' THEN
            v_mo_total := v_mo_total + v_item_valor * v_item.coeficiente;
          ELSIF v_ins_tipo LIKE 'Equipamento%' THEN
            v_eq_improd_total := v_eq_improd_total + v_item_improd_valor * v_item.coeficiente;
          END IF;
        ELSE
          v_total := v_total + v_item_valor * v_item.coeficiente * (1 + v_item.perda_percentual / 100);
        END IF;
      END;
      
    ELSIF v_item.sub_composicao_id IS NOT NULL THEN
      v_total := v_total + engenharia.fn_calcular_cdu_composicao(v_item.sub_composicao_id, p_tipo_preco) * v_item.coeficiente * (1 + v_item.perda_percentual / 100);
    END IF;
  END LOOP;

  IF v_is_sicro THEN
    v_total := v_total + (v_mo_total / v_producao) * (v_fic_factor / 100);
    v_total := v_total + (v_eq_improd_total / v_producao);
    v_total := v_total + v_custo_tempo_fixo + v_custo_ativ_aux + v_custo_transporte;
  END IF;

  RETURN COALESCE(v_total, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- 16. View de CDU de Composições
CREATE OR REPLACE VIEW engenharia.v_composicoes_cdu AS
SELECT 
  c.id,
  c.codigo,
  c.fonte,
  c.descricao,
  c.unidade,
  c.estado,
  engenharia.fn_calcular_cdu_composicao(c.id, 'nao_desonerado') AS cdu_nao_desonerado,
  engenharia.fn_calcular_cdu_composicao(c.id, 'com_desoneracao') AS cdu_desonerado,
  engenharia.fn_calcular_cdu_composicao(c.id, 'sem_encargos') AS cdu_sem_encargos
FROM engenharia.composicoes c;

-- 17. View de Fontes e Estados Disponíveis
CREATE OR REPLACE VIEW engenharia.v_fontes_estados AS
SELECT DISTINCT fonte_preco AS fonte, estado FROM engenharia.insumos WHERE fonte_preco IS NOT NULL
UNION
SELECT DISTINCT fonte AS fonte, estado FROM engenharia.composicoes WHERE fonte IS NOT NULL;

-- 18. Recarregar Cache de Esquema do PostgREST
NOTIFY pgrst, 'reload schema';
