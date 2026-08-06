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
}
