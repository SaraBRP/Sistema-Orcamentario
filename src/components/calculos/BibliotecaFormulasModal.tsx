import React, { useState } from 'react';
import { X, BookOpen, Search, Check, Info } from 'lucide-react';
import type { FormulaBibliotecaItem } from '../../types/calculos';

export const CATALOGO_FORMULAS_PADRAO: FormulaBibliotecaItem[] = [
  {
    id: 'esquadrias_acabamentos_completo',
    nome: 'Esquadrias, Alvenarias e Acabamentos',
    categoria: 'Esquadrias, Alvenarias & Acabamentos',
    unidadeResultante: 'm² / m',
    equacaoExemplo: 'Múltiplas Fórmulas Derivadas (Área Líquida de Parede com Regra TCPO 13 / AF, Piso, Teto, Rodapé Líquido, Caixilhos, Pintura, Vidros)',
    descricao: 'Calculadora de Levantamento de Esquadrias, Alvenarias e Acabamentos. Cadastre livremente cômodos, dependências, portas e janelas. O sistema calcula automaticamente 10 variáveis derivadas (Piso, Parede Líquida, Teto, Rodapé com desconto de portas, Pintura, Vidros e Impermeabilização).',
    parametrosRequeridos: [
      { chave: 'quantidadeComodos', nome: 'Quantidade de Cômodos', unidade: 'und', padrao: 1 },
      { chave: 'largura', nome: 'Largura Cômodo', unidade: 'm', padrao: 3.00 },
      { chave: 'comprimento', nome: 'Comprimento Cômodo', unidade: 'm', padrao: 4.00 },
      { chave: 'peDireito', nome: 'Pé-Direito', unidade: 'm', padrao: 2.80 }
    ],
    formatarExpressao: (p) => {
      const q = p.quantidadeComodos || 1;
      const l = p.largura || 3.00;
      const c = p.comprimento || 4.00;
      const h = p.peDireito || 2.80;
      const areaPiso = Math.round(q * l * c * 100) / 100;
      const perim = (l > 0 && c > 0) ? 2 * (l + c) : (l + c);
      const areaParedeBruta = Math.round(q * perim * h * 100) / 100;
      return {
        literal: 'Levantamento Esquemático de Esquadrias, Alvenarias & Acabamentos',
        substituicao: `Geometria: ${q}x (${l.toFixed(2)}×${c.toFixed(2)}×${h.toFixed(2)}m) => Piso: ${areaPiso} m² | Parede Bruta: ${areaParedeBruta} m²`,
        resultado: areaPiso
      };
    }
  },
  {
    id: 'viga_baldrame_completo',
    nome: 'Viga Baldrame',
    categoria: 'Fundações Superficiais - Vigas Baldrames',
    unidadeResultante: 'm³ / m² / kg',
    equacaoExemplo: 'Múltiplas Fórmulas Derivadas (Concreto, Fôrma, Escavação, Lastro, Impermeabilização, Armação, Reaterro, Bota-fora)',
    descricao: 'Calculadora integrada de Vigas Baldrames. Insira a geometria dos elementos para que o sistema calcule e disponibilize automaticamente todas as 8 variáveis/tags derivadas para vincular às composições do orçamento.',
    parametrosRequeridos: [
      { chave: 'quantidade', nome: 'Quantidade de Vigas', unidade: 'und', padrao: 1 },
      { chave: 'largura', nome: 'Largura L', unidade: 'm', padrao: 0.20 },
      { chave: 'altura', nome: 'Altura H', unidade: 'm', padrao: 0.40 },
      { chave: 'comprimento', nome: 'Comprimento C', unidade: 'm', padrao: 15.00 },
      { chave: 'cotaSolo', nome: 'Cota Solo', unidade: 'm', padrao: 0.00 },
      { chave: 'cotaTopo', nome: 'Cota Topo Viga', unidade: 'm', padrao: -0.30 },
      { chave: 'talude', nome: 'Talude (0=Sem, 1=Prumo, 2=1:1, 3=1:2)', unidade: 'tipo', padrao: 1 }
    ],
    formatarExpressao: (p) => {
      const q = p.quantidade || 1;
      const l = p.largura || 0.20;
      const h = p.altura || 0.40;
      const c = p.comprimento || 15.00;
      const conc = Math.round(q * l * h * c * 100) / 100;
      const forma = Math.round(q * 2 * h * c * 100) / 100;
      return {
        literal: 'Modelo Integrado de Vigas Baldrames',
        substituicao: `Geometria: ${q}x (${l.toFixed(2)}×${h.toFixed(2)}×${c.toFixed(2)}m) => Concreto: ${conc} m³ | Fôrma: ${forma} m²`,
        resultado: conc
      };
    }
  },
  {
    id: 'sapata_isolada_completo',
    nome: 'Sapata Isolada',
    categoria: 'Fundações Superficiais - Sapatas',
    unidadeResultante: 'm³ / m² / kg',
    equacaoExemplo: 'Múltiplas Fórmulas Derivadas (Concreto Rodapé+Tronco, Fôrma Inclinada, Escavação, Lastro, Armação...)',
    descricao: 'Calculadora integrada de Sapatas Isoladas (Tronco de Pirâmide). Insira a geometria dos elementos para calcular e disponibilizar todas as 8 variáveis/tags derivadas para vincular às composições do orçamento.',
    parametrosRequeridos: [
      { chave: 'quantidade', nome: 'Quantidade de Sapatas', unidade: 'und', padrao: 1 },
      { chave: 'larguraMaior', nome: 'Largura Base L_maior', unidade: 'm', padrao: 1.50 },
      { chave: 'comprimentoMaior', nome: 'Comprimento Base C_maior', unidade: 'm', padrao: 1.50 },
      { chave: 'larguraMenor', nome: 'Largura Topo L_menor', unidade: 'm', padrao: 0.50 },
      { chave: 'comprimentoMenor', nome: 'Comprimento Topo C_menor', unidade: 'm', padrao: 0.50 },
      { chave: 'altura1', nome: 'Altura Rodapé H1', unidade: 'm', padrao: 0.30 },
      { chave: 'altura2', nome: 'Altura Tronco H2', unidade: 'm', padrao: 0.30 },
      { chave: 'cotaSolo', nome: 'Cota Solo', unidade: 'm', padrao: 0.00 },
      { chave: 'cotaTopo', nome: 'Cota Topo Sapata', unidade: 'm', padrao: -1.00 },
      { chave: 'talude', nome: 'Talude (0=Sem, 1=Prumo, 2=1:1, 3=1:2)', unidade: 'tipo', padrao: 1 }
    ],
    formatarExpressao: (p) => {
      const q = p.quantidade || 1;
      const lMaj = p.larguraMaior || 1.5;
      const cMaj = p.comprimentoMaior || 1.5;
      const h1 = p.altura1 || 0.3;
      const concRodape = q * lMaj * cMaj * h1;
      return {
        literal: 'Modelo Integrado de Sapatas Isoladas',
        substituicao: `Sapata: ${q}x (${lMaj}×${cMaj}m, H1=${h1}m) => Concreto Rodapé = ${concRodape.toFixed(2)} m³`,
        resultado: concRodape
      };
    }
  },
  {
    id: 'bloco_fundacao_completo',
    nome: 'Blocos de Fundação',
    categoria: 'Fundações Profundas - Blocos',
    unidadeResultante: 'm³ / m² / kg',
    equacaoExemplo: 'Múltiplas Fórmulas Derivadas (Pilar Moldado, 3 Estacas, Pilar Pré-Moldado e 3 Estacas Pré)',
    descricao: 'Calculadora integrada de Blocos de Fundação (Pilares Moldados In Loco, 3 Estacas, Pilares Pré-Moldados com Cálice e 3 Estacas Pré). Insira a geometria dos elementos para calcular e disponibilizar todas as variáveis/tags derivadas para o orçamento.',
    parametrosRequeridos: [
      { chave: 'tipoBloco', nome: 'Tipo de Bloco (1=Moldado, 2=3Estacas, 3=Pré, 4=3EstacasPré)', unidade: 'tipo', padrao: 1 },
      { chave: 'quantidade', nome: 'Quantidade de Blocos', unidade: 'und', padrao: 1 },
      { chave: 'comprimentoA', nome: 'Comprimento A', unidade: 'm', padrao: 1.60 },
      { chave: 'larguraB', nome: 'Largura B', unidade: 'm', padrao: 1.60 },
      { chave: 'altura1', nome: 'Altura Rodapé H1', unidade: 'm', padrao: 0.40 },
      { chave: 'altura2', nome: 'Altura Tronco H2', unidade: 'm', padrao: 0.30 },
      { chave: 'distanciaEixo', nome: 'Distância Eixos E (3 Estacas)', unidade: 'm', padrao: 1.20 },
      { chave: 'cotaSolo', nome: 'Cota Solo', unidade: 'm', padrao: 0.00 },
      { chave: 'cotaTopo', nome: 'Cota Topo Bloco', unidade: 'm', padrao: -1.00 }
    ],
    formatarExpressao: (p) => {
      const q = p.quantidade || 1;
      const a = p.comprimentoA || 1.6;
      const b = p.larguraB || 1.6;
      const h1 = p.altura1 || 0.4;
      const conc = q * a * b * h1;
      return {
        literal: 'Modelo Integrado de Blocos de Fundação',
        substituicao: `Bloco: ${q}x (${a}×${b}m, H1=${h1}m) => Concreto = ${conc.toFixed(2)} m³`,
        resultado: conc
      };
    }
  },
  {
    id: 'tubulao_completo',
    nome: 'Tubulão de Fundação',
    categoria: 'Fundações Profundas - Tubulões',
    unidadeResultante: 'm³ / m² / kg',
    equacaoExemplo: 'Múltiplas Fórmulas Derivadas (Concreto Fuste+Base, Escavação Mecân.+Manual, Fôrma Colarinho, Lastro, Armação, Bota-fora)',
    descricao: 'Calculadora integrada de Tubulões a Céu Aberto (Fuste Cilíndrico + Base Tronconica Alargada). Insira a geometria dos elementos para calcular e disponibilizar automaticamente todas as 7 variáveis/tags derivadas para vincular às composições do orçamento.',
    parametrosRequeridos: [
      { chave: 'quantidade', nome: 'Quantidade de Tubulões', unidade: 'und', padrao: 1 },
      { chave: 'diametroFuste', nome: 'Diâmetro Fuste D_fuste', unidade: 'm', padrao: 0.80 },
      { chave: 'alturaFuste', nome: 'Altura Fuste H_fuste', unidade: 'm', padrao: 4.00 },
      { chave: 'diametroBase', nome: 'Diâmetro Base D_base', unidade: 'm', padrao: 1.60 },
      { chave: 'alturaBase', nome: 'Altura Tronco Base H_base', unidade: 'm', padrao: 0.70 },
      { chave: 'cotaSolo', nome: 'Cota Solo', unidade: 'm', padrao: 0.00 },
      { chave: 'cotaTopo', nome: 'Cota Topo Tubulão', unidade: 'm', padrao: -0.50 }
    ],
    formatarExpressao: (p) => {
      const q = p.quantidade || 1;
      const dF = p.diametroFuste || 0.8;
      const hF = p.alturaFuste || 4.0;
      const dB = p.diametroBase || 1.6;
      const hB = p.alturaBase || 0.7;
      const vF = (Math.PI * dF * dF / 4) * hF;
      const vB = (Math.PI * hB / 12) * (dB * dB + dB * dF + dF * dF) + (Math.PI * dB * dB / 4) * 0.2;
      const conc = Math.round(q * (vF + vB) * 100) / 100;
      return {
        literal: 'Modelo Integrado de Tubulões de Fundação',
        substituicao: `Tubulão: ${q}x (Dfuste=${dF}m, Dbase=${dB}m) => Concreto (Fuste+Base) = ${conc.toFixed(2)} m³`,
        resultado: conc
      };
    }
  },
  {
    id: 'estaca_fundacao_completo',
    nome: 'Estação / Estacas de Fundação',
    categoria: 'Fundações Profundas - Estacas',
    unidadeResultante: 'm / m³ / kg',
    equacaoExemplo: 'Múltiplas Fórmulas Derivadas (Perfuração m/m³, Concreto c/ Perda m³, Armação Aço kg, Bota-fora m³)',
    descricao: 'Calculadora integrada de Estações e Estacas de Fundação (Hélice Contínua, Escavada, Pré-Moldada, Raiz e Perfil Metálico). Insira o diâmetro, cotas de solo/arrasamento/apoio e armação para calcular e vincular automaticamente todas as variáveis derivadas.',
    parametrosRequeridos: [
      { chave: 'quantidade', nome: 'Quantidade de Estacas', unidade: 'und', padrao: 1 },
      { chave: 'diametro', nome: 'Diâmetro Ø Estaca', unidade: 'm', padrao: 0.40 },
      { chave: 'cotaSolo', nome: 'Cota Solo', unidade: 'm', padrao: 0.00 },
      { chave: 'cotaArrasamento', nome: 'Cota Arrasamento', unidade: 'm', padrao: -1.00 },
      { chave: 'cotaApoio', nome: 'Cota Apoio (Fundo)', unidade: 'm', padrao: -12.00 },
      { chave: 'comprimentoArmacao', nome: 'Comprimento Armação', unidade: 'm', padrao: 6.00 }
    ],
    formatarExpressao: (p) => {
      const q = p.quantidade || 1;
      const d = p.diametro || 0.4;
      const cA = Math.abs((p.cotaArrasamento || -1) - (p.cotaApoio || -12));
      const conc = Math.round(q * (3.1416 / 4) * d * d * cA * 100) / 100;
      return {
        literal: 'Modelo Integrado de Estacão e Estacas de Fundação',
        substituicao: `Estaca: ${q}x (Ø ${d}m, H=${cA}m) => Concreto = ${conc} m³`,
        resultado: conc
      };
    }
  },
  {
    id: 'premoldados_completo',
    nome: 'Elementos Pré-Moldados',
    categoria: 'Estruturas - Pré-Moldados (Pilares e Vigas)',
    unidadeResultante: 'm³ / m² / kg',
    equacaoExemplo: 'Múltiplas Fórmulas Derivadas (Volume Concreto, Fôrma Compensada, Pregos, Sarrafos, Pontaletes, Desmoldante, Guindaste)',
    descricao: 'Calculadora integrada de Elementos Pré-Moldados (Pilares P1-P4 e Vigas V1-V3). Insira as dimensões das peças e o número de reaproveitamento para que o sistema calcule e disponibilize todas as variáveis derivadas para o orçamento.',
    parametrosRequeridos: [
      { chave: 'quantidade', nome: 'Quantidade de Peças', unidade: 'und', padrao: 10 },
      { chave: 'comprimentoL', nome: 'Comprimento L', unidade: 'm', padrao: 15.00 },
      { chave: 'menorDimB', nome: 'Menor Dimensão B', unidade: 'm', padrao: 0.60 },
      { chave: 'maiorDimH', nome: 'Maior Dimensão H', unidade: 'm', padrao: 0.60 },
      { chave: 'reaproveitamentoForma', nome: 'Reaproveitamento de Fôrma', unidade: 'ciclos', padrao: 9 }
    ],
    formatarExpressao: (p) => {
      const q = p.quantidade || 10;
      const l = p.comprimentoL || 15.0;
      const b = p.menorDimB || 0.6;
      const h = p.maiorDimH || 0.6;
      const conc = Math.round(q * l * b * h * 100) / 100;
      return {
        literal: 'Modelo Integrado de Elementos Pré-Moldados',
        substituicao: `Peça Pré-Moldada: ${q}x (${l.toFixed(2)}m × ${b.toFixed(2)}m × ${h.toFixed(2)}m) => Concreto = ${conc} m³`,
        resultado: conc
      };
    }
  },
  {
    id: 'piso_concreto_completo',
    nome: 'Piso de Concreto (Tela / Fibra)',
    categoria: 'Pisos & Pavimentação - Concreto',
    unidadeResultante: 'm³ / m² / kg / m',
    equacaoExemplo: 'Múltiplas Fórmulas Derivadas (ConcretoUsainado, Telas CA-60, Fibras de Aço, Caranguejos, Barras Transferência, Treliças, Juntas PU/Epóxi, Cura Química, Endurecedor, Lona)',
    descricao: 'Calculadora integrada de Piso de Concreto Industrial (NBR 14081). Insira a área do piso, espessura e modo de armação (Tela de Aço ou Fibra de Aço) para calcular automaticamente 21 componentes e variáveis derivadas para o orçamento.',
    parametrosRequeridos: [
      { chave: 'areaPisoTotalM2', nome: 'Área Total do Piso', unidade: 'm²', padrao: 7950 },
      { chave: 'espessuraM', nome: 'Espessura h', unidade: 'm', padrao: 0.16 },
      { chave: 'modoArmacao', nome: 'Modo (1=Tela, 2=Fibra)', unidade: 'tipo', padrao: 1 },
      { chave: 'consumoFibraKgM3', nome: 'Consumo Fibra de Aço', unidade: 'kg/m³', padrao: 20 }
    ],
    formatarExpressao: (p) => {
      const area = p.areaPisoTotalM2 || 7950;
      const esp = p.espessuraM || 0.16;
      const volConc = Math.round(area * esp * 1.05 * 100) / 100;
      return {
        literal: 'Modelo Integrado de Piso de Concreto Industrial',
        substituicao: `Piso Concreto: ${area} m² (h=${(esp*100).toFixed(0)}cm) => Concreto c/ 5% Perda = ${volConc} m³`,
        resultado: volConc
      };
    }
  },
  {
    id: 'drenagem_completo',
    nome: 'Rede de Drenagem (Caixas & Valas)',
    categoria: 'Infraestrutura & Drenagem Pluvial',
    unidadeResultante: 'm³ / m² / m / un / kg',
    equacaoExemplo: 'Múltiplas Fórmulas Derivadas (Escavação de Caixas e Valas, Apiloamento, Lastro Magro, Concreto de Lajes, Blocos de Concreto, Assentamento de Tubos, Tampões FF, Reaterro e Bota-fora)',
    descricao: 'Calculadora integrada de Drenagem Pluvial (NBR 10839 / Modelo BRP). Cadastre Poços de Visita (PVAP), Caixas de Inspeção/Passagem (CIAP, CX-PASS) e Rede de Tubulações (Ø100 a Ø1500mm) para calcular automaticamente 16 componentes e serviços derivados.',
    parametrosRequeridos: [
      { chave: 'qtdCaixas', nome: 'Quantidade Total de Caixas', unidade: 'un', padrao: 5 },
      { chave: 'extensaoTubosM', nome: 'Extensão Total de Tubos', unidade: 'm', padrao: 100 },
      { chave: 'profundidadeMediaM', nome: 'Profundidade Média', unidade: 'm', padrao: 1.50 }
    ],
    formatarExpressao: (p) => {
      const qCx = p.qtdCaixas || 5;
      const lTub = p.extensaoTubosM || 100;
      const prof = p.profundidadeMediaM || 1.50;
      const escavEst = Math.round(((qCx * 2.2 * 2.2 * prof) + (lTub * 1.2 * prof)) * 100) / 100;
      return {
        literal: 'Modelo Integrado de Sistema de Drenagem Pluvial',
        substituicao: `Drenagem: ${qCx} Caixas/PVs + ${lTub}m Tubos => Escavação Estimada = ${escavEst} m³`,
        resultado: escavEst
      };
    }
  },
  {
    id: 'pits_reservatorios_completo',
    nome: 'Reservatórios Enterrados, PITs e Canaletas',
    categoria: 'Infraestrutura & Reservatórios',
    unidadeResultante: 'm³ / m² / kg',
    equacaoExemplo: 'Múltiplas Fórmulas Derivadas (Volume Útil de Água, Concreto Armado fck 30 MPa, Fôrmas 3X, Aço CA-50, Cimbramento de Tampa, Lastro Magro, Escavação, Reaterro, Bota-fora e Impermeabilização Múltipla Camada)',
    descricao: 'Calculadora integrada de Reservatórios Enterrados, PITs Industriais e Canaletas (Modelo BRP / NBR 6118). Cadastre caixas subterrâneas, túneis e dimensões internas para calcular automaticamente 11 componentes estruturais e geotécnicos.',
    parametrosRequeridos: [
      { chave: 'comprimentoM', nome: 'Comprimento Interno Pint1', unidade: 'm', padrao: 22.00 },
      { chave: 'larguraM', nome: 'Largura Interna Pint2', unidade: 'm', padrao: 17.50 },
      { chave: 'alturaM', nome: 'Altura Interna Hint', unidade: 'm', padrao: 2.45 }
    ],
    formatarExpressao: (p) => {
      const b = p.comprimentoM || 22.00;
      const h = p.larguraM || 17.50;
      const alt = p.alturaM || 2.45;
      const volAgua = Math.round(b * h * alt * 100) / 100;
      return {
        literal: 'Modelo Integrado de Reservatório Enterrado / PIT',
        substituicao: `Reservatório: ${b}m × ${h}m (H=${alt}m) => Capacidade Útil = ${volAgua} m³`,
        resultado: volAgua
      };
    }
  },
  {
    id: 'superestrutura_completo',
    nome: 'Superestruturas (Pilares, Vigas, Lajes e Cimbramento)',
    categoria: 'Superestrutura & Estruturas',
    unidadeResultante: 'm³ / m² / kg / un',
    equacaoExemplo: 'Múltiplas Fórmulas Derivadas (Concreto fck 30 MPa In-loco/Pré-moldado, Fôrma Compensada 3X, Aço CA-50, Cimbramento Tubular, Peças Pré-moldadas)',
    descricao: 'Calculadora integrada de Superestruturas de Edificações (NBR 6118 / Modelo BRP). Cadastre Pilares (retangulares/circulares), Vigas e Lajes (In-loco ou Pré-moldadas) para calcular automaticamente 8 componentes estruturais e executivos.',
    parametrosRequeridos: [
      { chave: 'volumeConcretoM3', nome: 'Volume Total de Concreto', unidade: 'm³', padrao: 874.2 },
      { chave: 'areaFormaM2', nome: 'Área Total de Fôrma', unidade: 'm²', padrao: 11590.8 },
      { chave: 'pesoAcoKg', nome: 'Massa Total de Aço CA-50', unidade: 'kg', padrao: 87420 }
    ],
    formatarExpressao: (p) => {
      const vol = p.volumeConcretoM3 || 874.2;
      const forma = p.areaFormaM2 || 11590.8;
      return {
        literal: 'Modelo Integrado de Medição de Superestrutura',
        substituicao: `Superestrutura: Concreto Total = ${vol} m³ | Fôrma Total = ${forma} m²`,
        resultado: vol
      };
    }
  }
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectFormula?: (formula: FormulaBibliotecaItem) => void;
}

export const BibliotecaFormulasModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectFormula
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');

  if (!isOpen) return null;

  const categorias = Array.from(new Set(CATALOGO_FORMULAS_PADRAO.map(f => f.categoria)));

  const formulasFiltradas = CATALOGO_FORMULAS_PADRAO.filter(f => {
    const matchSearch = f.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        f.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        f.categoria.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoriaFiltro === 'todas' || f.categoria === categoriaFiltro;
    return matchSearch && matchCat;
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Central & Biblioteca de Fórmulas de Engenharia</h3>
              <p className="text-xs text-blue-200/80">
                Consulte as equações padrão e a expansão passo a passo dos cálculos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filtros e Busca */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar fórmula por nome ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              onClick={() => setCategoriaFiltro('todas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                categoriaFiltro === 'todas' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todas ({CATALOGO_FORMULAS_PADRAO.length})
            </button>
            {categorias.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoriaFiltro(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  categoriaFiltro === cat ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Fórmulas */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-slate-100/50">
          {formulasFiltradas.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Info className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
              <p className="font-medium text-sm">Nenhuma fórmula encontrada para este filtro.</p>
            </div>
          ) : (
            formulasFiltradas.map(formula => (
              <div
                key={formula.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 hover:border-blue-300 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wider">
                      {formula.categoria}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">{formula.nome}</h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md self-start sm:self-auto">
                    Unidade: <strong className="text-blue-700">{formula.unidadeResultante}</strong>
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {formula.descricao}
                </p>

                {/* Exemplo de Substituição */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-sans">Exemplo no Memorial:</span>
                  <pre className="whitespace-pre-wrap font-mono text-slate-800 leading-relaxed font-semibold">
                    {formula.equacaoExemplo}
                  </pre>
                </div>

                {/* Botão para aplicar a fórmula */}
                {onSelectFormula && (
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectFormula(formula);
                        onClose();
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Usar esta Fórmula na Linha</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Rodapé */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>O modelo de apresentação segue as especificações oficiais de memórias de cálculo operacionais.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
