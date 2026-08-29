export type ModuloCalculoId = 
  | 'fundacoes'
  | 'superestrutura'
  | 'premoldados'
  | 'pisos'
  | 'drenagem'
  | 'vedacoes'
  | 'pits_reservatorios'
  | 'instalacoes_parametricas';

export interface ModuloInfo {
  id: ModuloCalculoId;
  titulo: string;
  subtitulo: string;
  disciplina: string;
  icone: string;
  corBg: string;
  corTexto: string;
  descricao: string;
}

export interface VinculoEAP {
  item_eap: string;       // Código EAP do item (ex: '1.2.1')
  itemId?: string;        // ID do item no orçamento
  campoDestino: 'quantidade' | 'total_mat' | 'total_mo'; // Campo que recebe o resultado
  fatorMultiplicativo?: number; // Ex: 1.0 (100%), ou fator de perda (ex: 1.05 para +5%)
  chaveResultado?: string; // Ex: 'volumeConcretoM3', 'areaFormaM2', 'pesoAcoKg'
}

export type TipoInsumoCategoria =
  | 'Material'
  | 'Mão de Obra'
  | 'Equipamento'
  | 'Equipamento para Aquisição Permanente'
  | 'Taxas'
  | 'Administração'
  | 'Aluguel'
  | 'Verba'
  | 'Transporte e Logística'
  | 'Outros';

export interface ResumoInsumoItem {
  id: string;
  codigo?: string;
  descricao: string;
  tipoInsumo: TipoInsumoCategoria;
  fase: 'fabricacao' | 'montagem';
  regraCalculo?: string;            // Regra paramétrica de cálculo (ex: 'concreto', 'tela_sup', 'fibra', 'barra_transf', 'selante_pu', 'fixo', etc.)
  taxaProdutividade?: number;       // Ex: 2.00 hh/m² ou 0.20 kg/m²
  unidadeProdutividade?: string;    // Ex: 'hh/m2', 'hh/m3', 'kg/m2', 'm/m3', 'un/dia'
  precoUnitario?: number;           // R$ unitário do insumo
  unidade: string;                  // Ex: 'm²', 'kg', 'm', 'hh', 'UN', 'm³'
  coeficienteCalculado?: number;     // Coeficiente final por divisor (m³ ou UN)
  quantidadeTotalCalculada?: number;// Quantidade acumulada total na obra
  custoTotalR$?: number;            // Custo R$ total na obra
}

export interface CalculoResultado {
  volumeConcretoM3?: number;
  areaFormaM2?: number;
  pesoAcoKg?: number;
  escavacaoM3?: number;
  lastroM3?: number;
  reaterroM3?: number;
  areaImpermeabilizacaoM2?: number;
  comprimentoLinearM?: number;
  areaLiquidaM2?: number;
  quantidadeUnidades?: number;
  custoTotalEstimadoR$?: number;

  // Coeficientes Ponderados por m³ de Pré-Moldado (Modelo BRP)
  coefCompensadoM2M3?: number;
  coefPregosKgM3?: number;
  coefSarrafoMM3?: number;
  coefPontaleteMM3?: number;
  coefConcretoAparenteM2M3?: number;
  numeroJogosForma?: number;

  // Resumo de Insumos & Divisores Dinâmicos
  divisorFabricacao?: 'm3' | 'un';
  divisorMontagem?: 'un' | 'm3';
  resumoInsumos?: ResumoInsumoItem[];

  detalhes?: Record<string, number | string>;
}

export interface LinhaMedicaoQuantitativo {
  id: string;
  localizacao: string;            // Ex: "Torre A - 2º Pavimento - Parede P1"
  repeticoes: number;             // Ex: 4 elementos iguais
  comprimento: number;            // m
  largura: number;                // m
  altura: number;                 // m
  desconto: number;               // Descontos/Vãos (área ou volume a subtrair)
  formulaTipo: 'area' | 'volume' | 'extensao' | 'peso_aco' | 'customizada';
  formulaCustom?: string;         // Ex: "(L * W * H * Rep) - Desconto"
  resultadoLinha: number;         // Resultado calculado desta linha
}

export interface DimensionamentoEquipeData {
  rupOficial: number;             // hh/un (Razão Unitária de Produção do Oficial, ex: 1.2 hh/m²)
  rupAjudante: number;            // hh/un (Razão Unitária de Produção do Ajudante, ex: 1.2 hh/m²)
  jornadaDiariaHs: number;        // Ex: 8.8h/dia
  prazoDesejadoDias?: number;     // Prazo alvo em dias úteis
  equipeDisponivelOficial?: number;  // Operários Oficiais disponíveis
  equipeDisponivelAjudante?: number; // Operários Ajudantes disponíveis
  resultadoPrazoDias?: number;        // Prazo calculado (se informado a equipe)
  resultadoEquipeOficial?: number;    // Oficiais necessários por dia (se informado o prazo)
  resultadoEquipeAjudante?: number;   // Ajudantes necessários por dia (se informado o prazo)
}

export interface FormulaLinhaItem {
  id: string;
  observacao?: string;
  equacaoLiteral?: string;
  substituicaoNumerica?: string;
  resultado?: number;
  modoCalculo?: string;
}

export interface CampoSistemaOption {
  chave: string;
  label: string;
  unidade: string;
  categoria: string;
}

export const CATALOGO_CAMPOS_SISTEMA: CampoSistemaOption[] = [
  // Estrutura & Fôrmas
  { chave: 'volume_concreto', label: 'Volume de Concreto Armado', unidade: 'm³', categoria: 'Estrutura & Fôrmas' },
  { chave: 'area_forma', label: 'Área de Fôrma de Madeira / Metal', unidade: 'm²', categoria: 'Estrutura & Fôrmas' },
  { chave: 'peso_aco', label: 'Armação em Aço CA-50 / CA-60', unidade: 'kg', categoria: 'Estrutura & Fôrmas' },
  { chave: 'taxa_aco', label: 'Taxa de Armação (Aço)', unidade: 'kg/m³', categoria: 'Estrutura & Fôrmas' },
  { chave: 'volume_lastro', label: 'Lastro Concreto Magro (e=5cm)', unidade: 'm³', categoria: 'Estrutura & Fôrmas' },
  { chave: 'area_impermeabilizacao', label: 'Área de Impermeabilização Flexível', unidade: 'm²', categoria: 'Estrutura & Fôrmas' },
  { chave: 'volume_cimbramento', label: 'Cimbramento / Escoramento Tubular', unidade: 'm³', categoria: 'Estrutura & Fôrmas' },

  // Superestrutura & Pré-Moldados
  { chave: 'volume_concreto_inloco', label: 'Concreto Armado Usinado In-Loco', unidade: 'm³', categoria: 'Superestrutura & Pré-Moldados' },
  { chave: 'area_forma_inloco', label: 'Fôrma de Madeira Compensada In-Loco', unidade: 'm²', categoria: 'Superestrutura & Pré-Moldados' },
  { chave: 'peso_aco_inloco', label: 'Aço CA-50 / CA-60 Estrutura In-Loco', unidade: 'kg', categoria: 'Superestrutura & Pré-Moldados' },
  { chave: 'volume_cimbramento_inloco', label: 'Cimbramento Tubular Vigas/Lajes In-Loco', unidade: 'm³', categoria: 'Superestrutura & Pré-Moldados' },
  { chave: 'volume_concreto_premoldado', label: 'Concreto para Peças Pré-Moldadas', unidade: 'm³', categoria: 'Superestrutura & Pré-Moldados' },
  { chave: 'area_forma_premoldado', label: 'Fôrma Metálica / Fábrica Pré-Moldados', unidade: 'm²', categoria: 'Superestrutura & Pré-Moldados' },
  { chave: 'peso_aco_premoldado', label: 'Aço CA-50 / CP-190 Estrutura Pré-Moldada', unidade: 'kg', categoria: 'Superestrutura & Pré-Moldados' },
  { chave: 'quantidade_pecas_premoldadas', label: 'Total de Peças Pré-Moldadas Fabricadas', unidade: 'und', categoria: 'Superestrutura & Pré-Moldados' },
  { chave: 'area_compensado', label: 'Compensado Plastificado / Resinado', unidade: 'm²', categoria: 'Superestrutura & Pré-Moldados' },
  { chave: 'peso_pregos', label: 'Pregos para Fôrma de Confecção', unidade: 'kg', categoria: 'Superestrutura & Pré-Moldados' },
  { chave: 'comp_sarrafos', label: 'Sarrafos de Madeira 1" x 4"', unidade: 'm', categoria: 'Superestrutura & Pré-Moldados' },
  { chave: 'comp_pontaletes', label: 'Pontaletes de Madeira 3" x 3"', unidade: 'm', categoria: 'Superestrutura & Pré-Moldados' },
  { chave: 'area_desmoldante', label: 'Desmoldante para Concreto Aparente', unidade: 'm²', categoria: 'Superestrutura & Pré-Moldados' },
  { chave: 'horas_guindaste', label: 'Horas de Guindaste 50t para Montagem', unidade: 'h', categoria: 'Superestrutura & Pré-Moldados' },

  // Fundações & Escavações
  { chave: 'profundidade_perfuracao', label: 'Profundidade de Perfuração de Estacas', unidade: 'm', categoria: 'Fundações & Escavações' },
  { chave: 'comprimento_util_estaca', label: 'Comprimento Útil da Estaca Concretada', unidade: 'm', categoria: 'Fundações & Escavações' },
  { chave: 'diametro_estaca', label: 'Diâmetro da Estaca / Hélice / Escavada', unidade: 'm', categoria: 'Fundações & Escavações' },
  { chave: 'cota_terreno', label: 'Cota Terreno / Solo Existente', unidade: 'm', categoria: 'Fundações & Escavações' },
  { chave: 'cota_arrasamento', label: 'Cota Arrasamento / Topo da Fundação', unidade: 'm', categoria: 'Fundações & Escavações' },
  { chave: 'cota_fundo', label: 'Cota Apoio / Fundo da Perfuração', unidade: 'm', categoria: 'Fundações & Escavações' },
  { chave: 'diametro_base_tubulao', label: 'Diâmetro da Base Alargada do Tubulão', unidade: 'm', categoria: 'Fundações & Escavações' },
  { chave: 'altura_tronco_tubulao', label: 'Altura do Tronco Cônico do Tubulão', unidade: 'm', categoria: 'Fundações & Escavações' },
  { chave: 'volume_ensacotamento_base', label: 'Volume de Pedra de Mão / Ensacotamento', unidade: 'm³', categoria: 'Fundações & Escavações' },

  // Terraplenagem & Solo
  { chave: 'volume_escavacao', label: 'Volume de Escavação Mecânica / Manual', unidade: 'm³', categoria: 'Terraplenagem & Solo' },
  { chave: 'area_apiloamento', label: 'Apiloamento e Compactação do Fundo', unidade: 'm²', categoria: 'Terraplenagem & Solo' },
  { chave: 'volume_reaterro', label: 'Volume de Reaterro Compactado', unidade: 'm³', categoria: 'Terraplenagem & Solo' },
  { chave: 'volume_botafora', label: 'Solo Bota-fora Empolado', unidade: 'm³', categoria: 'Terraplenagem & Solo' },
  { chave: 'empolamento', label: 'Empolamento do Solo', unidade: '%', categoria: 'Terraplenagem & Solo' },
  { chave: 'folga_escavacao', label: 'Folga Lateral de Escavação', unidade: 'm', categoria: 'Terraplenagem & Solo' },

  // Piso & Pavimento
  { chave: 'area_piso', label: 'Área do Piso / Pavimento', unidade: 'm²', categoria: 'Piso & Pavimento' },
  { chave: 'espessura_piso', label: 'Espessura do Piso', unidade: 'm', categoria: 'Piso & Pavimento' },
  { chave: 'extensao_juntas', label: 'Extensão Total de Juntas de Dilatação', unidade: 'm', categoria: 'Piso & Pavimento' },
  { chave: 'peso_barras_transferencia', label: 'Massa de Barras de Transferência CA-50', unidade: 'kg', categoria: 'Piso & Pavimento' },
  { chave: 'peso_fibra_aco', label: 'Massa de Fibra de Aço Estrutural', unidade: 'kg', categoria: 'Piso & Pavimento' },
  { chave: 'area_lona_plastica', label: 'Lona Plástica 0,15mm de Base', unidade: 'm²', categoria: 'Piso & Pavimento' },
  { chave: 'metragem_trelicas', label: 'Treliça de Sustentação para Barras', unidade: 'm', categoria: 'Piso & Pavimento' },
  { chave: 'junta_labio_polimerico', label: 'Junta de Lábio Polimérico', unidade: 'm', categoria: 'Piso & Pavimento' },
  { chave: 'junta_poliuretano', label: 'Junta Selada em Poliuretano (PU)', unidade: 'm', categoria: 'Piso & Pavimento' },
  { chave: 'junta_epoxi', label: 'Junta Selada em Epóxi Semi-Rígido', unidade: 'm', categoria: 'Piso & Pavimento' },

  // Paredes & Vedações
  { chave: 'area_parede', label: 'Área das Paredes / Alvenaria', unidade: 'm²', categoria: 'Paredes & Vedações' },
  { chave: 'perimetro', label: 'Perímetro do Setor / Edificação', unidade: 'm', categoria: 'Paredes & Vedações' },
  { chave: 'pe_direito', label: 'Pé-Direito / Altura Livre', unidade: 'm', categoria: 'Paredes & Vedações' },
  { chave: 'area_esquadrias', label: 'Área de Esquadrias / Aberturas', unidade: 'm²', categoria: 'Paredes & Vedações' },
  { chave: 'espessura_parede', label: 'Espessura da Alvenaria / Parede', unidade: 'm', categoria: 'Paredes & Vedações' },

  // Drenagem & Redes
  { chave: 'extensao_tubulacoes', label: 'Extensão Total de Assentamento de Tubos', unidade: 'm', categoria: 'Drenagem & Redes' },
  { chave: 'diametro_tubulacao', label: 'Diâmetro Nominal da Tubulação', unidade: 'mm', categoria: 'Drenagem & Redes' },
  { chave: 'lastro_areia_tubos', label: 'Lastro de Areia / Brita sob Tubos', unidade: 'm³', categoria: 'Drenagem & Redes' },
  { chave: 'quantidade_caixas', label: 'Quantidade de Caixas PVAP / CIAP', unidade: 'und', categoria: 'Drenagem & Redes' },
  { chave: 'quantidade_blocos', label: 'Bloco de Concreto Estrutural para Caixas', unidade: 'und', categoria: 'Drenagem & Redes' },
  { chave: 'volume_concreto_lajes', label: 'Concreto fck 25 MPa para Lajes de Caixas', unidade: 'm³', categoria: 'Drenagem & Redes' },
  { chave: 'tampao_ferro_fundido', label: 'Tampão de Ferro Fundido Dúctil Ø60cm', unidade: 'und', categoria: 'Drenagem & Redes' },

  // Reservatórios & PITs
  { chave: 'volume_util_agua', label: 'Volume Útil Total de Água / Capacidade', unidade: 'm³', categoria: 'Reservatórios & PITs' },
  { chave: 'numero_celulas', label: 'Número de Células / Divisórias Internas', unidade: 'und', categoria: 'Reservatórios & PITs' },
  { chave: 'espessura_laje_inf', label: 'Espessura da Laje de Fundo / Inferior', unidade: 'm', categoria: 'Reservatórios & PITs' },
  { chave: 'espessura_laje_sup', label: 'Espessura da Laje Superior / Tampa', unidade: 'm', categoria: 'Reservatórios & PITs' },

  // Cobertura & Forro
  { chave: 'area_cobertura', label: 'Área de Cobertura / Telhamento', unidade: 'm²', categoria: 'Cobertura & Forro' },
  { chave: 'area_forro', label: 'Área do Forro Falso / Placas', unidade: 'm²', categoria: 'Cobertura & Forro' },
  { chave: 'inclinacao_telhado', label: 'Inclinação do Telhado', unidade: '%', categoria: 'Cobertura & Forro' },

  // Geral
  { chave: 'comprimento', label: 'Comprimento Total', unidade: 'm', categoria: 'Geral' },
  { chave: 'largura', label: 'Largura', unidade: 'm', categoria: 'Geral' },
  { chave: 'altura', label: 'Altura / Espessura', unidade: 'm', categoria: 'Geral' },
  { chave: 'quantidade_elementos', label: 'Quantidade de Elementos / Peças', unidade: 'und', categoria: 'Geral' },
  { chave: 'massa_total', label: 'Massa Total', unidade: 'kg', categoria: 'Geral' },
  { chave: 'personalizado', label: 'Outro (Campo Personalizado)', unidade: '', categoria: 'Geral' },
];

export interface ParametroLinhaItem {
  id: string;
  chave: string;       // ex: "area_piso", "area_parede"
  label: string;       // ex: "Área do Piso"
  valor: number | string; // ex: 400
  unidade: string;     // ex: "m²", "m"
  categoria?: string;  // ex: "Piso & Pavimento"
}

export interface ItemMemoriaOficial {
  id: string;
  item_eap: string;               // Ex: "1", "1.1", "1.2"
  descricao: string;
  unidade: string;
  quantidade: number;
  isSecao?: boolean;              // Se true, é uma linha de texto / seção
  level?: number;                 // Nível hierárquico (0, 1, 2...) para recuos e subitens
  collapsed?: boolean;            // Se true, oculta os itens filhos na tabela
  formulaNome?: string;           // Nome da regra aplicada (ex: "Área da via + saias")
  equacaoLiteral?: string;        // Ex: "Area = comprimento da via x largura da plataforma + nº de saias x 4,0 x 6,0 m"
  substituicaoNumerica?: string;  // Ex: "Area = (457,92 x 7,00 m) + 8 x 4 x 6 = 3.397,44 m²"
  observacaoMemoria?: string;     // Linhas extras de texto (ex: "= 3 ENCARREGADOS\n14 MESES DE OBRA")
  isChildInsumoOfComposition?: boolean; // Se true, é um insumo pertencente a uma composição e não pode ser solto
  parentCompositionId?: string;       // ID da composição mãe vinculada
  parametrosUsados?: Record<string, number | string>;
  parametrosLocais?: ParametroLinhaItem[];
  formulasLista?: FormulaLinhaItem[];
}

export interface DadoComplementarItem {
  id: string;
  parametro: string;       // Ex: "Área Cobertura Bloco A"
  parametroNome?: string;   // Ex: "Área de Cobertura (Acob - m²)"
  valor: string | number;  // Ex: "150.00" ou 150.00
  unidade: string;         // Ex: "m²", "m³", "und"
  itemId?: string;         // ID do item do orçamento vinculado (opcional)
  itemDescricao?: string;  // Descrição/EAP do item vinculado (ex: "1.1 - ESCAVAÇÃO ESTACA...")
}

export interface DadosComplementaresHeader {
  codigoOrcamento?: string;       // Ex: "0908.001.0-2026"
  nomeProjeto?: string;           // Ex: "Construção de Galpão Industrial"
  cliente?: string;               // Ex: "Metalúrgica BRP Ltda"
  gestorCliente?: string;         // Ex: "Eng. Pamella"
  responsavel?: string;           // Ex: "Eng. Roberto Santos"
  cidade?: string;                // Ex: "Goiânia"
  estado?: string;                // Ex: "GO" (Sigla do Estado)
  objeto?: string;
  obra?: string;
  local?: string;
  trecho?: string;
  extensaoM?: number;
  utmInicio?: string;
  utmFim?: string;
  dadosComplementares?: DadoComplementarItem[];
}

export interface FormulaBibliotecaItem {
  id: string;
  nome: string;
  categoria: string;              // Ex: "Pavimentação", "Administração", "Estrutura", "Sinalização"
  unidadeResultante: string;      // Ex: "m²", "m³", "H", "m³xKm"
  equacaoExemplo: string;         // Ex: "Q = 12,00 X 3,00 = 36,00 H"
  descricao: string;
  parametrosRequeridos: Array<{
    chave: string;
    nome: string;
    unidade: string;
    padrao?: number;
  }>;
  formatarExpressao: (params: Record<string, number>) => {
    literal: string;
    substituicao: string;
    resultado: number;
  };
}

export interface CalculoItem {
  id: string;
  orcamento_id: string;
  modulo_id: ModuloCalculoId;
  nome: string;                 // Nome amigável (ex: "Sapata S1 - Galpão Principal")
  descricao?: string;
  predioSetor?: string;          // Ex: "Galpão 1", "Subsolo"
  dataCriacao: string;
  dataAtualizacao: string;
  parametros: Record<string, any>; // Variáveis de entrada (ex: { largura: 2, altura: 1.5, ... })
  resultados: CalculoResultado;
  vinculos: VinculoEAP[];        // Lista de vínculos com a EAP
  linhasMedicao?: LinhaMedicaoQuantitativo[]; // Linhas do Caderno de Quantitativos Flexível
  dimensionamentoEquipe?: DimensionamentoEquipeData; // Dimensionamento de Equipe e Produtividade
  itensMemoriaOficial?: ItemMemoriaOficial[]; // Lista oficial de itens de memória
  headerDadosComplementares?: DadosComplementaresHeader; // Dados complementares do projeto
}


