-- ################################################
-- SISTEMA ORÇAMENTÁRIO - ENGENHARIA
-- SETUP DO BANCO DE DADOS (SUPABASE / POSTGRESQL)
-- Este script cria um novo schema seguro 'engenharia' sem afetar o 'public'
-- ################################################

CREATE SCHEMA IF NOT EXISTS engenharia;

-- Enums
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

-- Tabela: Insumos
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
  -- Campos exclusivos para Equipamento
  valor_nao_desonerado_operativo NUMERIC(15,6),
  valor_desonerado_operativo     NUMERIC(15,6),
  valor_nao_desonerado_improdutivo NUMERIC(15,6),
  valor_desonerado_improdutivo   NUMERIC(15,6),
  -- Campos para Mão de Obra / Preços Diferenciados
  valor_desonerado               NUMERIC(15,6),
  valor_nao_desonerado           NUMERIC(15,6),
  valor_sem_encargos             NUMERIC(15,6),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT insumos_codigo_fonte_estado_key UNIQUE (codigo, fonte_preco, estado)
);

-- Tabela: Composições
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
  custo_sem_desoneracao NUMERIC(15,6),
  custo_desonerado      NUMERIC(15,6),
  custo_sem_encargos    NUMERIC(15,6),
  data_base             DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT composicoes_codigo_fonte_key UNIQUE (codigo, fonte)
);

-- Tabela: Itens da Composição
CREATE TABLE IF NOT EXISTS engenharia.composicao_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  composicao_id UUID REFERENCES engenharia.composicoes(id) ON DELETE CASCADE,
  insumo_id UUID REFERENCES engenharia.insumos(id) ON DELETE CASCADE,
  sub_composicao_id UUID REFERENCES engenharia.composicoes(id) ON DELETE CASCADE,
  coeficiente NUMERIC(15,6) NOT NULL,
  perda_percentual NUMERIC(5,2) DEFAULT 0,
  observacao TEXT,
  secao_sicro TEXT,
  codigo_auxiliar TEXT,
  codigo_ln TEXT,
  codigo_rp TEXT,
  codigo_p TEXT,
  preco_unitario NUMERIC(15,6) DEFAULT 0,
  preco_unitario_improdutivo NUMERIC(15,6) DEFAULT 0,
  CONSTRAINT check_item_type CHECK (
    (insumo_id IS NOT NULL AND sub_composicao_id IS NULL) OR 
    (insumo_id IS NULL AND sub_composicao_id IS NOT NULL)
  )
);

-- Tabela: Orçamentos (COM VÍNCULO AO COMERCIAL public.propostas)
CREATE TABLE IF NOT EXISTS engenharia.orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  local_obra TEXT,
  data_base DATE,
  versao INT DEFAULT 1,
  status TEXT DEFAULT 'Em Elaboração',
  responsavel_id UUID REFERENCES auth.users(id),
  proposta_id UUID REFERENCES public.propostas(id) ON DELETE SET NULL, -- Vínculo Comercial
  regra_arredondamento TEXT DEFAULT 'truncar_2' CHECK (
    regra_arredondamento IN ('truncar_2', 'arredondar_2', 'sem_arredondamento')
  ),
  bdi_ac NUMERIC(6,4) DEFAULT 0,
  bdi_s  NUMERIC(6,4) DEFAULT 0,
  bdi_g  NUMERIC(6,4) DEFAULT 0,
  bdi_r  NUMERIC(6,4) DEFAULT 0,
  bdi_df NUMERIC(6,4) DEFAULT 0,
  bdi_l  NUMERIC(6,4) DEFAULT 0,
  bdi_i  NUMERIC(6,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: Itens do Orçamento
CREATE TABLE IF NOT EXISTS engenharia.orcamento_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID REFERENCES engenharia.orcamentos(id) ON DELETE CASCADE,
  item_eap TEXT,
  codigo TEXT,
  banco_fonte TEXT,
  descricao TEXT NOT NULL,
  unidade TEXT,
  quantidade NUMERIC(15,4),
  valor_unitario NUMERIC(15,6),
  valor_unitario_com_bdi NUMERIC(15,6),
  total NUMERIC(18,6),
  peso_percentual NUMERIC(6,4),
  curva_abc CHAR(1),
  composicao_id UUID REFERENCES engenharia.composicoes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: Padrões Técnicos
CREATE TABLE IF NOT EXISTS engenharia.padroes_tecnicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT,
  descricao TEXT NOT NULL,
  categoria TEXT CHECK (categoria IN ('Metálica', 'Civil', 'Ambas')),
  subcategoria TEXT,
  unidade_padrao TEXT,
  observacoes_tecnicas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: Cotações Pacotes
CREATE TABLE IF NOT EXISTS engenharia.cotacoes_pacotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID REFERENCES engenharia.orcamentos(id),
  nome_pacote TEXT NOT NULL,
  prazo_cotacao TIMESTAMPTZ,
  escopo_incluso TEXT,
  escopo_excluso TEXT,
  unidade_contratacao TEXT,
  regra_medicao TEXT,
  prazo_execucao TEXT,
  condicoes_acesso TEXT,
  logistica TEXT,
  mobilizacao_inclusa BOOLEAN DEFAULT FALSE,
  garantias TEXT,
  impostos_modalidade TEXT,
  validade_proposta TEXT,
  contato_duvidas TEXT,
  status TEXT DEFAULT 'Aberto',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: Fluxo Aprovação
CREATE TABLE IF NOT EXISTS engenharia.fluxo_aprovacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID REFERENCES engenharia.orcamentos(id),
  etapa INT NOT NULL,
  nome_etapa TEXT NOT NULL,
  responsavel_papel TEXT,
  responsavel_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Em Andamento', 'Concluído', 'Bloqueado')),
  data_inicio TIMESTAMPTZ,
  data_conclusao TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: Usuários Papéis (Extensão dos Profiles)
CREATE TABLE IF NOT EXISTS engenharia.usuarios_papeis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  papel engenharia.papel_usuario NOT NULL
);

-- Tabela: Planilhas do Cliente (Módulo 14)
CREATE TABLE IF NOT EXISTS engenharia.planilhas_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID REFERENCES engenharia.orcamentos(id) ON DELETE CASCADE,
  nome_cliente TEXT,
  nome_arquivo_original TEXT NOT NULL,
  arquivo_storage_path TEXT NOT NULL,
  linha_inicio_dados INT NOT NULL,
  coluna_id TEXT,
  coluna_descricao TEXT NOT NULL,
  coluna_quantidade TEXT NOT NULL,
  coluna_unidade TEXT NOT NULL,
  coluna_valor_unitario TEXT,
  coluna_total TEXT,
  coluna_codigo_cliente TEXT,
  coluna_observacoes TEXT,
  status TEXT DEFAULT 'Em vinculação' CHECK (status IN ('Em vinculação', 'Em revisão', 'Exportado', 'Arquivado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: Itens da Planilha do Cliente (Módulo 14)
CREATE TABLE IF NOT EXISTS engenharia.planilha_cliente_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planilha_cliente_id UUID REFERENCES engenharia.planilhas_cliente(id) ON DELETE CASCADE,
  linha_original INT NOT NULL,
  id_cliente TEXT,
  descricao_cliente TEXT NOT NULL,
  quantidade NUMERIC(15,4),
  unidade TEXT,
  composicao_id UUID REFERENCES engenharia.composicoes(id) ON DELETE SET NULL,
  insumo_id UUID REFERENCES engenharia.insumos(id) ON DELETE SET NULL,
  preco_unitario_calculado NUMERIC(15,6),
  preco_unitario_manual NUMERIC(15,6),
  preco_unitario_final NUMERIC(15,6),
  total_calculado NUMERIC(18,6),
  status_vinculo TEXT DEFAULT 'Não vinculado' CHECK (status_vinculo IN ('Não vinculado', 'Vinculado', 'Preço Manual', 'Em revisão', 'Ignorado')),
  observacao_interna TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitando RLS para as tabelas principais (políticas de acesso liberais temporárias para dev, podem ser restritas depois)
ALTER TABLE engenharia.orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE engenharia.insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE engenharia.composicoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total aos orcamentos autenticado" ON engenharia.orcamentos FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total aos insumos autenticado" ON engenharia.insumos FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total as composicoes autenticado" ON engenharia.composicoes FOR ALL TO authenticated USING (true);

-- View para listar bancos (fontes de preço) de forma rápida
CREATE OR REPLACE VIEW engenharia.v_fontes_preco AS
SELECT DISTINCT fonte_preco FROM engenharia.insumos WHERE fonte_preco IS NOT NULL;

-- View para listar fontes de composições de forma dinâmica
CREATE OR REPLACE VIEW engenharia.v_fontes_composicao AS
SELECT DISTINCT fonte FROM engenharia.composicoes WHERE fonte IS NOT NULL;

-- View para listar estados (UFs) disponíveis por fonte_preco de forma rápida
CREATE OR REPLACE VIEW engenharia.v_fontes_estados AS
SELECT DISTINCT fonte_preco, estado FROM engenharia.insumos WHERE fonte_preco IS NOT NULL AND estado IS NOT NULL;

-- Função recursiva para calcular o Custo Direto Unitário (CDU) para cada tipo de preço
CREATE OR REPLACE FUNCTION engenharia.fn_calcular_cdu_composicao(
  p_composicao_id UUID,
  p_tipo_preco TEXT DEFAULT 'sem_desoneracao'
)
RETURNS NUMERIC(15,6) AS $$
DECLARE
  v_total NUMERIC(15,6) := 0;
  v_item RECORD;
  v_producao NUMERIC(15,6) := 1;
  v_fic_factor NUMERIC(15,6) := 0;
  v_custo_tempo_fixo NUMERIC(15,6) := 0;
  v_custo_ativ_aux NUMERIC(15,6) := 0;
  v_custo_transporte NUMERIC(15,6) := 0;
  v_mo_total NUMERIC(15,6) := 0;
  v_eq_improd_total NUMERIC(15,6) := 0;
  v_item_valor NUMERIC(15,6) := 0;
  v_item_improd_valor NUMERIC(15,6) := 0;
  v_comp_fonte TEXT;
  v_is_sicro BOOLEAN := FALSE;
BEGIN
  -- Buscar dados da composição
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
      -- Buscar valores do insumo
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

      -- Verificar se é mão de obra ou equipamento
      DECLARE
        v_ins_tipo TEXT;
      BEGIN
        SELECT tipo INTO v_ins_tipo FROM engenharia.insumos WHERE id = v_item.insumo_id;
        
        IF v_is_sicro AND (v_ins_tipo LIKE 'Equipamento%' OR v_ins_tipo LIKE 'Mão de Obra%') THEN
          -- Custo de Execução Unitário
          v_total := v_total + (v_item_valor / v_producao) * v_item.coeficiente * (1 + v_item.perda_percentual / 100);
          
          -- Acumular totais para o cálculo de FIC
          IF v_ins_tipo LIKE 'Mão de Obra%' THEN
            v_mo_total := v_mo_total + v_item_valor * v_item.coeficiente;
          ELSIF v_ins_tipo LIKE 'Equipamento%' THEN
            v_eq_improd_total := v_eq_improd_total + v_item_improd_valor * v_item.coeficiente;
          END IF;
        ELSE
          -- Materiais e Outros
          v_total := v_total + v_item_valor * v_item.coeficiente * (1 + v_item.perda_percentual / 100);
        END IF;
      END;
      
    ELSIF v_item.sub_composicao_id IS NOT NULL THEN
      -- Subcomposição: Se ela tiver custo de referência salvo no banco, usa ele. Caso contrário, calcula recursivamente.
      DECLARE
        v_sub_custo NUMERIC(15,6);
      BEGIN
        SELECT 
          CASE 
            WHEN p_tipo_preco = 'com_desoneracao' THEN custo_desonerado
            WHEN p_tipo_preco = 'sem_encargos' THEN custo_sem_encargos
            ELSE custo_sem_desoneracao
          END
        INTO v_sub_custo
        FROM engenharia.composicoes
        WHERE id = v_item.sub_composicao_id;

        IF v_sub_custo IS NOT NULL AND v_sub_custo > 0 THEN
          v_item_valor := v_sub_custo;
        ELSE
          v_item_valor := engenharia.fn_calcular_cdu_composicao(v_item.sub_composicao_id, p_tipo_preco);
        END IF;

        v_total := v_total + v_item_valor * v_item.coeficiente * (1 + v_item.perda_percentual / 100);
      END;
    END IF;
  END LOOP;

  -- Adicionar FIC, Tempo Fixo, e Transporte se for SICRO
  -- NOTA: custo_atividades_auxiliares NÃO é adicionado aqui porque as subcomposições da Seção D já são somadas no loop acima!
  IF v_is_sicro THEN
    -- Custo do FIC = (Mão de Obra Horária + Equipamentos Improdutivos Horários) * FIC_factor / Produção
    v_total := v_total + ((v_mo_total + v_eq_improd_total) * v_fic_factor) / v_producao;
    -- Tempo Fixo
    v_total := v_total + v_custo_tempo_fixo;
    -- Transporte
    v_total := v_total + v_custo_transporte;
  END IF;

  RETURN COALESCE(v_total, 0);
END;
$$ LANGUAGE plpgsql;

-- View para obter composições com o CDU calculado de forma dinâmica nas três modalidades (priorizando custos armazenados)
DROP VIEW IF EXISTS engenharia.v_composicoes_cdu CASCADE;

CREATE OR REPLACE VIEW engenharia.v_composicoes_cdu AS
SELECT 
  c.*, 
  COALESCE(c.custo_sem_desoneracao, engenharia.fn_calcular_cdu_composicao(c.id, 'sem_desoneracao')) as cdu_sem_desoneracao,
  COALESCE(c.custo_desonerado,      engenharia.fn_calcular_cdu_composicao(c.id, 'com_desoneracao')) as cdu_desonerado,
  COALESCE(c.custo_sem_encargos,    engenharia.fn_calcular_cdu_composicao(c.id, 'sem_encargos')) as cdu_sem_encargos,
  COALESCE(c.custo_sem_desoneracao, engenharia.fn_calcular_cdu_composicao(c.id, 'sem_desoneracao')) as cdu
FROM engenharia.composicoes c;

-- Índices de performance para chaves estrangeiras e filtros de exclusão
CREATE INDEX IF NOT EXISTS idx_composicoes_fonte ON engenharia.composicoes(fonte);
CREATE INDEX IF NOT EXISTS idx_insumos_fonte_preco ON engenharia.insumos(fonte_preco);

CREATE INDEX IF NOT EXISTS idx_composicao_itens_composicao_id ON engenharia.composicao_itens(composicao_id);
CREATE INDEX IF NOT EXISTS idx_composicao_itens_insumo_id ON engenharia.composicao_itens(insumo_id);
CREATE INDEX IF NOT EXISTS idx_composicao_itens_sub_composicao_id ON engenharia.composicao_itens(sub_composicao_id);

CREATE INDEX IF NOT EXISTS idx_orcamento_itens_composicao_id ON engenharia.orcamento_itens(composicao_id);
CREATE INDEX IF NOT EXISTS idx_planilha_cliente_itens_composicao_id ON engenharia.planilha_cliente_itens(composicao_id);
CREATE INDEX IF NOT EXISTS idx_planilha_cliente_itens_insumo_id ON engenharia.planilha_cliente_itens(insumo_id);

