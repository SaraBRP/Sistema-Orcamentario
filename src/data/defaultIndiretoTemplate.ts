import type { IndiretoGrupo } from '../types/indireto';

export const DEFAULT_INDIRETO_GRUPOS: Omit<IndiretoGrupo, 'id'>[] = [
  {
    numero: 1,
    nome: 'EQUIPE TÉCNICA / ADMINISTRATIVA / APOIO',
    descricao: 'Gestão de obra, engenheiros, técnicos de segurança, almoxarifado e equipe administrativa',
    ativo: true,
    itens: []
  },
  {
    numero: 2,
    nome: 'TOPOGRAFIA',
    descricao: 'Serviços topográficos de locação, acompanhamento e medição de obra',
    ativo: true,
    itens: []
  },
  {
    numero: 3,
    nome: 'VIGILÂNCIA DE OBRA TERCEIRIZADA',
    descricao: 'Segurança patrimonial e controle de acesso no canteiro de obras',
    ativo: true,
    itens: []
  },
  {
    numero: 4,
    nome: 'EQUIP. LEVES / FERRAMENTAS',
    descricao: 'Ferramentas manuais, pequenas máquinas e equipamentos de apoio',
    ativo: true,
    itens: []
  },
  {
    numero: 5,
    nome: 'EQUIPAMENTOS PESADOS',
    descricao: 'Equipamentos de movimentação de carga, guindastes, elevação e escavação',
    ativo: true,
    itens: []
  },
  {
    numero: 6,
    nome: 'CANTEIRO & ESTRUTURA PROVISÓRIA',
    descricao: 'Locação de módulos habitáveis, sanitários, tapumes e instalações provisórias',
    ativo: true,
    itens: []
  },
  {
    numero: 7,
    nome: 'CONSUMOS DIVERSOS',
    descricao: 'Contas de utilidades, internet, energia, água e material de consumo de escritório',
    ativo: true,
    itens: []
  },
  {
    numero: 8,
    nome: 'MEIO AMBIENTE / LEED / RESÍDUOS',
    descricao: 'Destinação final de entulho, PGRS, caçambas RGR e condicionantes ambientais',
    ativo: true,
    itens: []
  },
  {
    numero: 9,
    nome: 'CONTROLE TECNOLÓGICO',
    descricao: 'Ensaios laboratoriais de concreto, solo, fundações e ensaios não-destrutivos em soldas',
    ativo: true,
    itens: []
  },
  {
    numero: 10,
    nome: 'PROJETOS E CONSULTORIAS',
    descricao: 'Desenvolvimento de As-Built, consultorias técnicas e laudos de vizinhança',
    ativo: true,
    itens: []
  },
  {
    numero: 11,
    nome: 'MÃO DE OBRA DE APOIO COM HORAS EXTRAS',
    descricao: 'Equipe de apoio para mutirões, limpeza continuada e operações de segurança',
    ativo: true,
    itens: []
  },
  {
    numero: 12,
    nome: 'ITENS COMPLEMENTARES',
    descricao: 'Serviços de limpeza final, sinalização, caminhão pipa e placas de obra',
    ativo: true,
    itens: []
  },
  {
    numero: 13,
    nome: 'OUTROS',
    descricao: 'Aluguel de veículos de apoio, combustível e taxas diversas',
    ativo: true,
    itens: []
  },
  {
    numero: 14,
    nome: 'APOIO LOJISTA & COMISSIONAMENTO',
    descricao: 'Acompanhamento técnico para recebimento de lojistas e comissionamento final',
    ativo: true,
    itens: []
  }
];
