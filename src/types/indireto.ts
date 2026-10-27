export type DestinoIndireto = 'eap' | 'bdi';

export type UnidadeIndireto = 'un' | 'unid' | 'mês' | 'equipe/mês' | 'vb' | 'm' | 'm²' | 'm³' | 'kg' | 't' | 'h' | 'h/h' | 'dia' | 'diária' | 'km' | 'cj';

export interface IndiretoItem {
  id: string;
  grupoId: string;
  codigo?: string;
  descricao: string;
  unidade: UnidadeIndireto | string;
  /** Quantidade ou fator por mês de obra (ex: 1.0 engenheiro/mês ou 2 containers/mês) */
  alocacaoMensal: number;
  /** Se true, a quantidade não se multiplica pela duração da obra em meses (ex: verba fixa, mobilização inicial) */
  isCustoFixo?: boolean;
  /** Quantidade total calculada = isCustoFixo ? alocacaoMensal : (alocacaoMensal * prazoMeses) */
  quantidadeTotal: number;
  valorUnitario: number;
  valorFixoEncargos?: number;
  valorTotal: number;
  destino: DestinoIndireto;
  ativo: boolean;
  observacao?: string;
  isCustom?: boolean;
  tipo_custo?: 'direto' | 'indireto' | 'ambos';
}

export interface IndiretoGrupo {
  id: string;
  numero: number;
  nome: string;
  descricao?: string;
  itens: IndiretoItem[];
  ativo?: boolean;
}

export interface IndiretoOrcamentoConfig {
  orcamentoId: string;
  prazoObraMeses: number;
  grupos: IndiretoGrupo[];
  ultimaAtualizacao?: string;
}

export interface IndiretoResumoTotais {
  totalGeral: number;
  totalEap: number;
  totalBdi: number;
  totalPorGrupo: Record<string, number>;
  percentualSobreDireto?: number;
}
