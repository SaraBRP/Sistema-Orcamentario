import React, { useState } from 'react';
import { Plus, Trash2, Search, Save, Calculator, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';
import type { FormulaBibliotecaItem } from '../../types/calculos';
import { CATALOGO_FORMULAS_PADRAO } from './BibliotecaFormulasModal';
import { CroquiSapata } from './CroquiSapata';
import { CroquiVigaBaldrame } from './CroquiVigaBaldrame';
import { CroquiBloco } from './CroquiBloco';
import { CroquiTubulao } from './CroquiTubulao';
import { CroquiEstaca } from './CroquiEstaca';
import { CroquiPremoldado } from './CroquiPremoldado';
import { CroquiPisoConcreto } from './CroquiPisoConcreto';
import { CroquiDrenagem } from './CroquiDrenagem';
import { CroquiPitsReservatorios } from './CroquiPitsReservatorios';
import { CroquiSuperestrutura } from './CroquiSuperestrutura';

const LOCAL_STORAGE_FORMULAS_KEY = 'brp_custom_formulas_catalog';

export const getFormulasDisponiveis = (): FormulaBibliotecaItem[] => {
  try {
    const customSaved = localStorage.getItem(LOCAL_STORAGE_FORMULAS_KEY);
    const customList: FormulaBibliotecaItem[] = customSaved ? JSON.parse(customSaved) : [];
    // Recria funções de formatação simples para customizadas se necessário
    const formattedCustom = customList.map(item => {
      if (!item.formatarExpressao) {
        item.formatarExpressao = (p: Record<string, number>) => {
          let total = 1;
          let termos: string[] = [];
          (item.parametrosRequeridos || []).forEach(param => {
            const val = p[param.chave] ?? param.padrao ?? 1;
            total *= val;
            termos.push(`${param.nome}: ${val} ${param.unidade}`);
          });
          return {
            literal: item.equacaoExemplo || item.nome,
            substituicao: `${termos.join(' | ')} = ${total.toFixed(2)} ${item.unidadeResultante}`,
            resultado: total
          };
        };
      }
      return item;
    });
    return [...CATALOGO_FORMULAS_PADRAO, ...formattedCustom];
  } catch {
    return CATALOGO_FORMULAS_PADRAO;
  }
};

export const FORMULAS_FILHAS_BALDRAMES = [
  {
    id: 'child_baldrame_concreto',
    codigo: 'viga_baldrame_concreto',
    nome: 'Volume de Concreto Usinado',
    descricao: 'Cálculo de volume de concreto fck ≥ 30 MPa para vigas baldrames',
    categoria: 'Concreto Armado',
    unidade: 'm³',
    literal: 'Concreto = Quant × L × H × C',
    exemplo: '1 × 0,20m × 0,40m × 15,00m = 1,20 m³',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Vigas', unidade: 'und' },
      { simbolo: 'L', nome: 'Largura da Viga', unidade: 'm' },
      { simbolo: 'H', nome: 'Altura da Viga', unidade: 'm' },
      { simbolo: 'C', nome: 'Comprimento da Viga', unidade: 'm' }
    ]
  },
  {
    id: 'child_baldrame_escavacao',
    codigo: 'viga_baldrame_escavacao',
    nome: 'Escavação de Vala com Talude',
    descricao: 'Volume de escavação mecanizada de valas (Prumo, Talude 1:1 e 1:2)',
    categoria: 'Terraplenagem',
    unidade: 'm³',
    literal: 'Escavação = Quant × AreaBase × H_total',
    exemplo: '1 × 19,20m² × 0,75m = 14,40 m³',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Vigas', unidade: 'und' },
      { simbolo: 'L', nome: 'Largura da Viga', unidade: 'm' },
      { simbolo: 'H', nome: 'Altura da Viga', unidade: 'm' },
      { simbolo: 'C', nome: 'Comprimento da Viga', unidade: 'm' },
      { simbolo: 'CotaSolo', nome: 'Cota do Terreno', unidade: 'm' },
      { simbolo: 'CotaTopo', nome: 'Cota Topo Viga', unidade: 'm' },
      { simbolo: 'Talude', nome: 'Tipo de Geometria', unidade: '0, 1, 2, 3' },
      { simbolo: 'Folga', nome: 'Folga Lateral Vala', unidade: 'm' }
    ]
  },
  {
    id: 'child_baldrame_forma',
    codigo: 'viga_baldrame_forma',
    nome: 'Área de Fôrma Lateral Compensada',
    descricao: 'Área de fôrma de tábua/madeira compensada resinada',
    categoria: 'Fôrmas & Escoramento',
    unidade: 'm²',
    literal: 'Fôrma = Quant × 2 × H × C',
    exemplo: '1 × 2 × 0,40m × 15,00m = 12,00 m²',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Vigas', unidade: 'und' },
      { simbolo: 'H', nome: 'Altura da Viga', unidade: 'm' },
      { simbolo: 'C', nome: 'Comprimento da Viga', unidade: 'm' }
    ]
  },
  {
    id: 'child_baldrame_impermeabilizacao',
    codigo: 'viga_baldrame_impermeabilizacao',
    nome: 'Impermeabilização Asfáltica / Polimérica',
    descricao: 'Pintura asfáltica impermeabilizante na viga baldrame',
    categoria: 'Impermeabilização',
    unidade: 'm²',
    literal: 'Impermeab. = Quant × C × (L + 2 × Aba)',
    exemplo: '1 × 15,00m × (0,20m + 0,30m) = 7,50 m²',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Vigas', unidade: 'und' },
      { simbolo: 'L', nome: 'Largura da Viga', unidade: 'm' },
      { simbolo: 'C', nome: 'Comprimento da Viga', unidade: 'm' },
      { simbolo: 'Aba', nome: 'Aba Lateral', unidade: 'm' }
    ]
  },
  {
    id: 'child_baldrame_lastro',
    codigo: 'viga_baldrame_lastro',
    nome: 'Lastro de Concreto Magro / Brita',
    descricao: 'Camada de regularização e lastro de proteção',
    categoria: 'Regularização',
    unidade: 'm³',
    literal: 'Lastro = Quant × AreaApiloamento × e_lastro',
    exemplo: '1 × 0,30m × 15,10m × 0,05m = 0,23 m³',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Vigas', unidade: 'und' },
      { simbolo: 'L', nome: 'Largura da Viga', unidade: 'm' },
      { simbolo: 'C', nome: 'Comprimento da Viga', unidade: 'm' },
      { simbolo: 'Folga', nome: 'Folga Apiloamento', unidade: 'm' },
      { simbolo: 'e_lastro', nome: 'Espessura do Lastro', unidade: 'm' }
    ]
  },
  {
    id: 'child_baldrame_armacao',
    codigo: 'viga_baldrame_armacao',
    nome: 'Armação em Aço CA-50 / CA-60',
    descricao: 'Massa de aço estrutural cortado e dobrado',
    categoria: 'Armação de Aço',
    unidade: 'kg',
    literal: 'Armação = Volume Concreto × Taxa de Aço',
    exemplo: '1,20 m³ × 90,0 kg/m³ = 108,00 kg',
    parametrosList: [
      { simbolo: 'V_conc', nome: 'Volume de Concreto', unidade: 'm³' },
      { simbolo: 'TaxaAço', nome: 'Taxa de Armação', unidade: 'kg/m³' }
    ]
  },
  {
    id: 'child_baldrame_reaterro',
    codigo: 'viga_baldrame_reaterro',
    nome: 'Reaterro Compactado de Vala',
    descricao: 'Reaterro mecânico e compactado no entorno da vala',
    categoria: 'Terraplenagem',
    unidade: 'm³',
    literal: 'Reaterro = Escavação - Lastro - Concreto',
    exemplo: '14,40 m³ - 0,23 m³ - 1,20 m³ = 12,97 m³',
    parametrosList: [
      { simbolo: 'V_esc', nome: 'Volume de Escavação', unidade: 'm³' },
      { simbolo: 'V_lastro', nome: 'Volume de Lastro', unidade: 'm³' },
      { simbolo: 'V_conc', nome: 'Volume de Concreto', unidade: 'm³' }
    ]
  },
  {
    id: 'child_baldrame_bota_fora',
    codigo: 'viga_baldrame_bota_fora',
    nome: 'Transporte e Bota-fora de Solo Sobrante',
    descricao: 'Carga e transporte de solo com fator de empolamento',
    categoria: 'Bota-fora',
    unidade: 'm³',
    literal: 'Bota-fora = (Escav. - Reat.) × (1 + %Emp)',
    exemplo: '(14,40m³ - 12,97m³) × 1,30 = 1,86 m³',
    parametrosList: [
      { simbolo: 'V_esc', nome: 'Volume de Escavação', unidade: 'm³' },
      { simbolo: 'V_reat', nome: 'Volume de Reaterro', unidade: 'm³' },
      { simbolo: 'Emp%', nome: 'Fator de Empolamento', unidade: '%' }
    ]
  }
];

export const FORMULAS_FILHAS_SAPATAS = [
  {
    id: 'child_sapata_concreto',
    codigo: 'sapata_concreto',
    nome: 'Volume de Concreto Usinado (Rodapé + Tronco)',
    descricao: 'Volume de concreto usinado fck ≥ 30 MPa para sapata isolada',
    categoria: 'Concreto Armado',
    unidade: 'm³',
    literal: 'Concreto = Rodapé (L_maior×C_maior×H1) + Tronco (H2/3 × (A1+A2+√(A1×A2)))',
    exemplo: '1,50m × 1,50m × 0,30m + (0,30m/3 × (2,25 + 0,25 + 0,75)) = 0,675 + 0,325 = 1,00 m³',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Sapatas', unidade: 'und' },
      { simbolo: 'L_maior', nome: 'Largura Base Sapata', unidade: 'm' },
      { simbolo: 'C_maior', nome: 'Comprimento Base Sapata', unidade: 'm' },
      { simbolo: 'L_menor', nome: 'Largura Topo Tronco', unidade: 'm' },
      { simbolo: 'C_menor', nome: 'Comprimento Topo Tronco', unidade: 'm' },
      { simbolo: 'H1', nome: 'Altura Rodapé Retangular', unidade: 'm' },
      { simbolo: 'H2', nome: 'Altura Tronco de Pirâmide', unidade: 'm' }
    ]
  },
  {
    id: 'child_sapata_escavacao',
    codigo: 'sapata_escavacao',
    nome: 'Escavação de Cava/Vala com Talude',
    descricao: 'Volume de escavação mecanizada de cava de sapata (Prumo, Talude 1:1 e 1:2)',
    categoria: 'Terraplenagem',
    unidade: 'm³',
    literal: 'Escavação = Quant × AreaBasePrumo × H_exc',
    exemplo: '1 × (1,50m + 1,00m)² × 1,65m = 10,31 m³',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Sapatas', unidade: 'und' },
      { simbolo: 'L_maior', nome: 'Largura Base Sapata', unidade: 'm' },
      { simbolo: 'C_maior', nome: 'Comprimento Base Sapata', unidade: 'm' },
      { simbolo: 'CotaSolo', nome: 'Cota do Terreno', unidade: 'm' },
      { simbolo: 'CotaTopo', nome: 'Cota Topo Sapata', unidade: 'm' },
      { simbolo: 'Talude', nome: 'Tipo de Geometria', unidade: '0, 1, 2, 3' },
      { simbolo: 'Folga', nome: 'Folga Lateral Vala', unidade: 'm' }
    ]
  },
  {
    id: 'child_sapata_forma',
    codigo: 'sapata_forma',
    nome: 'Área de Fôrma Lateral (Rodapé + Faces Inclinadas)',
    descricao: 'Área de fôrma de tábua/madeira compensada para faces de sapata',
    categoria: 'Fôrmas & Escoramento',
    unidade: 'm²',
    literal: 'Fôrma = Fôrma Rodapé + Fôrma Tronco (Faces Inclinadas)',
    exemplo: '0,30m × 2 × (1,50 + 1,50) + 4 × (1,00m × 0,55m) = 3,60m² + 2,20m² = 5,80 m²',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Sapatas', unidade: 'und' },
      { simbolo: 'L_maior', nome: 'Largura Base Sapata', unidade: 'm' },
      { simbolo: 'C_maior', nome: 'Comprimento Base Sapata', unidade: 'm' },
      { simbolo: 'L_menor', nome: 'Largura Topo Tronco', unidade: 'm' },
      { simbolo: 'C_menor', nome: 'Comprimento Topo Tronco', unidade: 'm' },
      { simbolo: 'H1', nome: 'Altura Rodapé', unidade: 'm' },
      { simbolo: 'H2', nome: 'Altura Tronco Inclinado', unidade: 'm' }
    ]
  },
  {
    id: 'child_sapata_impermeabilizacao',
    codigo: 'sapata_impermeabilizacao',
    nome: 'Impermeabilização Asfáltica de Sapata',
    descricao: 'Pintura asfáltica impermeabilizante na base e rodapé',
    categoria: 'Impermeabilização',
    unidade: 'm²',
    literal: 'Impermeab. = Base (L_maior×C_maior) + Perímetro Rodapé (2×H1×(L_maior+C_maior))',
    exemplo: '2,25 m² + 3,60 m² = 5,85 m²',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Sapatas', unidade: 'und' },
      { simbolo: 'L_maior', nome: 'Largura Base', unidade: 'm' },
      { simbolo: 'C_maior', nome: 'Comprimento Base', unidade: 'm' },
      { simbolo: 'H1', nome: 'Altura Rodapé', unidade: 'm' }
    ]
  },
  {
    id: 'child_sapata_lastro',
    codigo: 'sapata_lastro',
    nome: 'Lastro de Concreto Magro',
    descricao: 'Camada de regularização e lastro de proteção',
    categoria: 'Regularização',
    unidade: 'm³',
    literal: 'Lastro = AreaApiloamento × e_lastro',
    exemplo: '1,60m × 1,60m × 0,05m = 0,128 m³',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Sapatas', unidade: 'und' },
      { simbolo: 'L_maior', nome: 'Largura Base', unidade: 'm' },
      { simbolo: 'C_maior', nome: 'Comprimento Base', unidade: 'm' },
      { simbolo: 'e_lastro', nome: 'Espessura do Lastro', unidade: 'm' }
    ]
  },
  {
    id: 'child_sapata_armacao',
    codigo: 'sapata_armacao',
    nome: 'Armação em Aço CA-50 / CA-60',
    descricao: 'Massa de aço estrutural cortado e dobrado',
    categoria: 'Armação de Aço',
    unidade: 'kg',
    literal: 'Armação = Volume Concreto × Taxa de Aço',
    exemplo: '1,00 m³ × 90,0 kg/m³ = 90,00 kg',
    parametrosList: [
      { simbolo: 'V_conc', nome: 'Volume de Concreto', unidade: 'm³' },
      { simbolo: 'TaxaAço', nome: 'Taxa de Armação', unidade: 'kg/m³' }
    ]
  },
  {
    id: 'child_sapata_reaterro',
    codigo: 'sapata_reaterro',
    nome: 'Reaterro Compactado de Cava',
    descricao: 'Reaterro mecânico e compactado no entorno da cava',
    categoria: 'Terraplenagem',
    unidade: 'm³',
    literal: 'Reaterro = Escavação - Lastro - Concreto',
    exemplo: '10,31 m³ - 0,13 m³ - 1,00 m³ = 9,18 m³',
    parametrosList: [
      { simbolo: 'V_esc', nome: 'Volume de Escavação', unidade: 'm³' },
      { simbolo: 'V_lastro', nome: 'Volume de Lastro', unidade: 'm³' },
      { simbolo: 'V_conc', nome: 'Volume de Concreto', unidade: 'm³' }
    ]
  },
  {
    id: 'child_sapata_bota_fora',
    codigo: 'sapata_bota_fora',
    nome: 'Transporte e Bota-fora de Solo Sobrante',
    descricao: 'Carga e transporte de solo com fator de empolamento',
    categoria: 'Bota-fora',
    unidade: 'm³',
    literal: 'Bota-fora = (Escav. - Reat.) × (1 + %Emp)',
    exemplo: '(10,31m³ - 9,18m³) × 1,30 = 1,47 m³',
    parametrosList: [
      { simbolo: 'V_esc', nome: 'Volume de Escavação', unidade: 'm³' },
      { simbolo: 'V_reat', nome: 'Volume de Reaterro', unidade: 'm³' },
      { simbolo: 'Emp%', nome: 'Fator de Empolamento', unidade: '%' }
    ]
  }
];

export const FORMULAS_FILHAS_BLOCO_MOLDADO = [
  {
    id: 'child_bloco_moldado_concreto',
    codigo: 'bloco_moldado_concreto',
    nome: 'Volume de Concreto (Rodapé + Tronco)',
    descricao: 'Volume de concreto fck ≥ 30 MPa para bloco de pilar moldado in loco',
    categoria: 'Concreto Armado',
    unidade: 'm³',
    literal: 'Concreto = Rodapé (A×B×H1) + Tronco (H2/3 × (A×B + a×b + √(A×B×a×b)))',
    exemplo: '1,60m × 1,60m × 0,40m + Tronco = 1,25 m³',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Blocos', unidade: 'und' },
      { simbolo: 'A', nome: 'Comprimento Base', unidade: 'm' },
      { simbolo: 'B', nome: 'Largura Base', unidade: 'm' },
      { simbolo: 'H1', nome: 'Altura Rodapé', unidade: 'm' },
      { simbolo: 'H2', nome: 'Altura Tronco', unidade: 'm' }
    ]
  },
  {
    id: 'child_bloco_moldado_forma',
    codigo: 'bloco_moldado_forma',
    nome: 'Área de Fôrma Lateral',
    descricao: 'Área de fôrma compensada para faces laterais do bloco',
    categoria: 'Fôrmas & Escoramento',
    unidade: 'm²',
    literal: 'Fôrma = 2 × H1 × (A + B) + Faces Inclinadas',
    exemplo: '2 × 0,40m × (1,60m + 1,60m) = 2,56 m²',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Blocos', unidade: 'und' },
      { simbolo: 'A', nome: 'Comprimento Base', unidade: 'm' },
      { simbolo: 'B', nome: 'Largura Base', unidade: 'm' },
      { simbolo: 'H1', nome: 'Altura Rodapé', unidade: 'm' }
    ]
  },
  {
    id: 'child_bloco_moldado_escavacao',
    codigo: 'bloco_moldado_escavacao',
    nome: 'Escavação de Cava com Folga',
    descricao: 'Volume de escavação mecanizada da cava do bloco',
    categoria: 'Terraplenagem',
    unidade: 'm³',
    literal: 'Escavação = Quant × (A + 2×Folga) × (B + 2×Folga) × H_exc',
    exemplo: '1 × (1,60 + 1,00)² × 1,75m = 11,83 m³',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Blocos', unidade: 'und' },
      { simbolo: 'A', nome: 'Comprimento Base', unidade: 'm' },
      { simbolo: 'B', nome: 'Largura Base', unidade: 'm' },
      { simbolo: 'Folga', nome: 'Folga de Vala', unidade: 'm' }
    ]
  },
  {
    id: 'child_bloco_moldado_armacao',
    codigo: 'bloco_moldado_armacao',
    nome: 'Armação de Aço CA-50 / CA-60',
    descricao: 'Massa de aço estrutural cortado e dobrado',
    categoria: 'Armação de Aço',
    unidade: 'kg',
    literal: 'Armação = Volume Concreto × Taxa de Aço',
    exemplo: '1,25 m³ × 90,0 kg/m³ = 112,50 kg',
    parametrosList: [
      { simbolo: 'V_conc', nome: 'Volume de Concreto', unidade: 'm³' },
      { simbolo: 'TaxaAço', nome: 'Taxa de Armação', unidade: 'kg/m³' }
    ]
  }
];

export const FORMULAS_FILHAS_BLOCO_3_ESTACAS = [
  {
    id: 'child_bloco_3estacas_concreto',
    codigo: 'bloco_3estacas_concreto',
    nome: 'Volume de Concreto Triangular',
    descricao: 'Volume de concreto usinado fck ≥ 30 MPa para bloco de 3 estacas',
    categoria: 'Concreto Armado',
    unidade: 'm³',
    literal: 'Concreto = Quant × (0,433 × L_tri²) × H',
    exemplo: '1 × 1,56m² × 0,80m = 1,25 m³',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Blocos', unidade: 'und' },
      { simbolo: 'E', nome: 'Distância entre Eixos', unidade: 'm' },
      { simbolo: 'H', nome: 'Altura do Bloco', unidade: 'm' }
    ]
  },
  {
    id: 'child_bloco_3estacas_forma',
    codigo: 'bloco_3estacas_forma',
    nome: 'Área de Fôrma Perimétrica Triangular',
    descricao: 'Área de fôrma para as 3 faces externas do bloco',
    categoria: 'Fôrmas & Escoramento',
    unidade: 'm²',
    literal: 'Fôrma = Quant × 3 × L_tri × H',
    exemplo: '1 × 3 × 1,80m × 0,80m = 4,32 m²',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Blocos', unidade: 'und' },
      { simbolo: 'E', nome: 'Distância entre Eixos', unidade: 'm' },
      { simbolo: 'H', nome: 'Altura do Bloco', unidade: 'm' }
    ]
  }
];

export const FORMULAS_FILHAS_BLOCO_PRE_MOLDADO = [
  {
    id: 'child_bloco_pre_concreto',
    codigo: 'bloco_pre_concreto',
    nome: 'Volume de Concreto com Desconto de Cálice',
    descricao: 'Volume de concreto usinado com cavidade de encaixe do pilar pré-moldado',
    categoria: 'Concreto Armado',
    unidade: 'm³',
    literal: 'Concreto = Quant × (A × B × H - a_cálice × b_cálice × h_cálice)',
    exemplo: '1 × (1,80m × 1,80m × 0,90m - 0,216m³) = 2,70 m³',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Blocos', unidade: 'und' },
      { simbolo: 'A', nome: 'Comprimento Base', unidade: 'm' },
      { simbolo: 'B', nome: 'Largura Base', unidade: 'm' },
      { simbolo: 'H', nome: 'Altura Bloco', unidade: 'm' },
      { simbolo: 'h_cálice', nome: 'Profundidade Cálice', unidade: 'm' }
    ]
  },
  {
    id: 'child_bloco_pre_forma',
    codigo: 'bloco_pre_forma',
    nome: 'Área de Fôrma Externa + Interna do Cálice',
    descricao: 'Área de fôrma compensada externa e do miolo do cálice',
    categoria: 'Fôrmas & Escoramento',
    unidade: 'm²',
    literal: 'Fôrma = 2×H×(A+B) + 2×h_cálice×(a_cálice+b_cálice)',
    exemplo: '6,48 m² + 1,44 m² = 7,92 m²',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Blocos', unidade: 'und' },
      { simbolo: 'A', nome: 'Comprimento Base', unidade: 'm' },
      { simbolo: 'B', nome: 'Largura Base', unidade: 'm' },
      { simbolo: 'H', nome: 'Altura Bloco', unidade: 'm' }
    ]
  }
];

export const FORMULAS_FILHAS_BLOCO_3_ESTACAS_PRE = [
  {
    id: 'child_bloco_3pre_concreto',
    codigo: 'bloco_3pre_concreto',
    nome: 'Volume de Concreto (3 Estacas + Cálice Pré)',
    descricao: 'Volume de concreto usinado para bloco de 3 estacas com cálice pré-moldado',
    categoria: 'Concreto Armado',
    unidade: 'm³',
    literal: 'Concreto = Quant × (A_tri × H - V_cálice)',
    exemplo: '1 × (2,10m³ - 0,22m³) = 1,88 m³',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Blocos', unidade: 'und' },
      { simbolo: 'E', nome: 'Distância Eixos', unidade: 'm' },
      { simbolo: 'H', nome: 'Altura Bloco', unidade: 'm' }
    ]
  }
];

export const FORMULAS_FILHAS_TUBULAO = [
  {
    id: 'child_tubulao_concreto',
    codigo: 'tubulao_concreto',
    nome: 'Volume de Concreto Usinado (Fuste + Base)',
    descricao: 'Volume total de concreto usinado fck ≥ 30 MPa para fuste e base alargada de tubulão',
    categoria: 'Concreto Armado',
    unidade: 'm³',
    literal: 'Concreto = V_fuste (π×D_fuste²/4 × H_fuste) + V_base (π×H_base/12 × (D_base² + D_base×D_fuste + D_fuste²))',
    exemplo: '1 × (2,01 m³ + 1,02 m³) = 3,03 m³',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Tubulões', unidade: 'und' },
      { simbolo: 'D_fuste', nome: 'Diâmetro do Fuste', unidade: 'm' },
      { simbolo: 'H_fuste', nome: 'Altura do Fuste', unidade: 'm' },
      { simbolo: 'D_base', nome: 'Diâmetro da Base Alargada', unidade: 'm' },
      { simbolo: 'H_base', nome: 'Altura Tronco da Base', unidade: 'm' }
    ]
  },
  {
    id: 'child_tubulao_escavacao_fuste',
    codigo: 'tubulao_escavacao_fuste',
    nome: 'Escavação Mecanizada de Fuste / Poço',
    descricao: 'Volume de escavação mecanizada ou manual de fuste circular',
    categoria: 'Terraplenagem',
    unidade: 'm³',
    literal: 'Escav. Fuste = Quant × (π × D_fuste² / 4) × H_fuste',
    exemplo: '1 × 0,503m² × 4,00m = 2,01 m³',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Tubulões', unidade: 'und' },
      { simbolo: 'D_fuste', nome: 'Diâmetro do Fuste', unidade: 'm' },
      { simbolo: 'H_fuste', nome: 'Altura do Fuste', unidade: 'm' }
    ]
  },
  {
    id: 'child_tubulao_escavacao_base',
    codigo: 'tubulao_escavacao_base',
    nome: 'Escavação Manual de Base Alargada',
    descricao: 'Volume de escavação manual com alargamento de base tronconica',
    categoria: 'Terraplenagem',
    unidade: 'm³',
    literal: 'Escav. Base = Quant × (V_tronco + V_rodapé)',
    exemplo: '1 × (0,82 m³ + 0,20 m³) = 1,02 m³',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Tubulões', unidade: 'und' },
      { simbolo: 'D_fuste', nome: 'Diâmetro do Fuste', unidade: 'm' },
      { simbolo: 'D_base', nome: 'Diâmetro da Base', unidade: 'm' },
      { simbolo: 'H_base', nome: 'Altura da Base', unidade: 'm' }
    ]
  },
  {
    id: 'child_tubulao_forma_colarinho',
    codigo: 'child_tubulao_forma_colarinho',
    nome: 'Área de Fôrma de Colarinho de Proteção',
    descricao: 'Fôrma circular de compensado para colarinho de boca do tubulão (50cm)',
    categoria: 'Fôrmas & Escoramento',
    unidade: 'm²',
    literal: 'Fôrma Colarinho = Quant × (π × D_fuste) × 0,50m',
    exemplo: '1 × (3,14 × 0,80m) × 0,50m = 1,26 m²',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Tubulões', unidade: 'und' },
      { simbolo: 'D_fuste', nome: 'Diâmetro do Fuste', unidade: 'm' }
    ]
  },
  {
    id: 'child_tubulao_lastro',
    codigo: 'child_tubulao_lastro',
    nome: 'Lastro Magro de Fundo da Base',
    descricao: 'Camada de regularização e lastro de fundo da base alargada',
    categoria: 'Regularização',
    unidade: 'm³',
    literal: 'Lastro = Quant × (π × D_base² / 4) × e_lastro',
    exemplo: '1 × 2,01m² × 0,05m = 0,10 m³',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Tubulões', unidade: 'und' },
      { simbolo: 'D_base', nome: 'Diâmetro da Base', unidade: 'm' },
      { simbolo: 'e_lastro', nome: 'Espessura do Lastro', unidade: 'm' }
    ]
  },
  {
    id: 'child_tubulao_armacao',
    codigo: 'tubulao_armacao',
    nome: 'Armação em Aço CA-50 / CA-60',
    descricao: 'Massa de aço estrutural cortado e dobrado para fuste de tubulão',
    categoria: 'Armação de Aço',
    unidade: 'kg',
    literal: 'Armação = Volume Concreto × Taxa de Aço',
    exemplo: '3,03 m³ × 90,0 kg/m³ = 272,70 kg',
    parametrosList: [
      { simbolo: 'V_conc', nome: 'Volume de Concreto', unidade: 'm³' },
      { simbolo: 'TaxaAço', nome: 'Taxa de Armação', unidade: 'kg/m³' }
    ]
  },
  {
    id: 'child_tubulao_bota_fora',
    codigo: 'tubulao_bota_fora',
    nome: 'Transporte e Bota-fora de Solo Escavado',
    descricao: 'Carga e transporte de solo com fator de empolamento',
    categoria: 'Bota-fora',
    unidade: 'm³',
    literal: 'Bota-fora = Escavação Total × (1 + %Emp)',
    exemplo: '3,03 m³ × 1,30 = 3,94 m³',
    parametrosList: [
      { simbolo: 'V_esc', nome: 'Volume de Escavação', unidade: 'm³' },
      { simbolo: 'Emp%', nome: 'Fator de Empolamento', unidade: '%' }
    ]
  }
];

export const FORMULAS_FILHAS_ESTACA = [
  {
    id: 'child_estaca_perfuracao_m',
    codigo: 'estaca_perfuracao_m',
    nome: 'Perfuração / Execução de Estaca (Comprimento Total)',
    descricao: 'Metragem linear total de perfuração/escavação da estaca (Cota Solo - Cota Apoio)',
    categoria: 'Perfuração',
    unidade: 'm',
    literal: 'Perfuração (m) = Quant × (Cota Solo - Cota Apoio)',
    exemplo: '1 × |0 - (-12,00m)| = 12,00 m',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Estacas', unidade: 'und' },
      { simbolo: 'CotaSolo', nome: 'Cota Solo', unidade: 'm' },
      { simbolo: 'CotaApoio', nome: 'Cota Apoio (Fundo)', unidade: 'm' }
    ]
  },
  {
    id: 'child_estaca_escavacao_m3',
    codigo: 'estaca_escavacao_m3',
    nome: 'Escavação / Perfuração de Estaca (Volume m³)',
    descricao: 'Volume bruto de escavação/perfuração de estaca fuste circular',
    categoria: 'Terraplenagem',
    unidade: 'm³',
    literal: 'Escav. Estaca = Quant × (π × Ø² / 4) × (Cota Solo - Cota Apoio)',
    exemplo: '1 × 0,126m² × 12,00m = 1,51 m³',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Estacas', unidade: 'und' },
      { simbolo: 'Ø', nome: 'Diâmetro da Estaca', unidade: 'm' },
      { simbolo: 'CompTotal', nome: 'Comprimento Total', unidade: 'm' }
    ]
  },
  {
    id: 'child_estaca_concreto',
    codigo: 'estaca_concreto',
    nome: 'Volume de Concreto Usinado com Perda (Comprimento Útil)',
    descricao: 'Volume útil de concreto usinado fck ≥ 30 MPa considerando taxa de perda (20%)',
    categoria: 'Concreto Armado',
    unidade: 'm³',
    literal: 'Concreto = Quant × (π × Ø² / 4) × (Cota Arrasamento - Cota Apoio) × (1 + %Perda)',
    exemplo: '1 × 0,126m² × 11,00m × 1,20 = 1,66 m³',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Estacas', unidade: 'und' },
      { simbolo: 'Ø', nome: 'Diâmetro da Estaca', unidade: 'm' },
      { simbolo: 'CompÚtil', nome: 'Comprimento Útil', unidade: 'm' },
      { simbolo: '%Perda', nome: 'Fator de Perda Concreto', unidade: '%' }
    ]
  },
  {
    id: 'child_estaca_armacao',
    codigo: 'estaca_armacao',
    nome: 'Armação em Aço CA-50 / CA-60',
    descricao: 'Massa de aço estrutural cortado e dobrado para gaiola de estaca',
    categoria: 'Armação de Aço',
    unidade: 'kg',
    literal: 'Armação = Quant × (π × Ø² / 4) × Comp_Armação × TaxaAço',
    exemplo: '1 × 0,126m² × 6,00m × 60,0 kg/m³ = 45,36 kg',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Estacas', unidade: 'und' },
      { simbolo: 'Ø', nome: 'Diâmetro da Estaca', unidade: 'm' },
      { simbolo: 'CArm', nome: 'Comprimento Armação', unidade: 'm' },
      { simbolo: 'TaxaAço', nome: 'Taxa de Armação', unidade: 'kg/m³' }
    ]
  },
  {
    id: 'child_estaca_bota_fora',
    codigo: 'estaca_bota_fora',
    nome: 'Transporte e Bota-fora de Solo Escavado',
    descricao: 'Carga e transporte de solo escavado da estaca com fator de empolamento (30%)',
    categoria: 'Bota-fora',
    unidade: 'm³',
    literal: 'Bota-fora = Volume Escavação × (1 + %Emp)',
    exemplo: '1,51 m³ × 1,30 = 1,96 m³',
    parametrosList: [
      { simbolo: 'V_esc', nome: 'Volume de Escavação', unidade: 'm³' },
      { simbolo: 'Emp%', nome: 'Fator de Empolamento', unidade: '%' }
    ]
  }
];

export const FORMULAS_FILHAS_PREMOLDADOS = [
  {
    id: 'child_premoldado_concreto',
    codigo: 'premoldado_concreto',
    nome: 'Volume de Concreto Usinado',
    descricao: 'Volume total de concreto de pilares (P1-P4) e vigas (V1-V3)',
    categoria: 'Concreto Armado',
    unidade: 'm³',
    literal: 'Concreto = Quant × L × B × H',
    exemplo: '27 × 19,50m × 0,60m × 0,60m = 189,54 m³',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Peças', unidade: 'und' },
      { simbolo: 'L', nome: 'Altura / Comprimento L', unidade: 'm' },
      { simbolo: 'B', nome: 'Menor Dimensão B', unidade: 'm' },
      { simbolo: 'H', nome: 'Maior Dimensão H', unidade: 'm' }
    ]
  },
  {
    id: 'child_premoldado_compensado',
    codigo: 'premoldado_compensado',
    nome: 'Fôrma de Madeira Compensada Plastificada',
    descricao: 'Área total de compensado plastificado 18mm com perdas',
    categoria: 'Fôrmas & Escoramento',
    unidade: 'm²',
    literal: 'Compensado = [ (B+0,10)×L + (B+0,10)×H ] × 1,20 × JogosFôrma',
    exemplo: '1,20 × 20,67 m² × 3 jogos = 74,41 m²',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Peças', unidade: 'und' },
      { simbolo: 'L', nome: 'Altura / Comprimento L', unidade: 'm' },
      { simbolo: 'B', nome: 'Menor Dimensão B', unidade: 'm' },
      { simbolo: 'H', nome: 'Maior Dimensão H', unidade: 'm' },
      { simbolo: 'Reaprov', nome: 'Número de Reaproveitamentos', unidade: 'ciclos' }
    ]
  },
  {
    id: 'child_premoldado_pregos',
    codigo: 'premoldado_pregos',
    nome: 'Pregos para Fôrma de Confecção',
    descricao: 'Massa total de pregos para confecção das fôrmas',
    categoria: 'Acessórios & Confecção',
    unidade: 'kg',
    literal: 'Pregos = Fôrma_Total × 0,20 kg/m² × 1,20',
    exemplo: '74,41 m² × 0,20 kg/m² × 1,20 = 17,86 kg',
    parametrosList: [
      { simbolo: 'Fôrma_Total', nome: 'Área Total de Fôrma', unidade: 'm²' },
      { simbolo: 'Consumo', nome: 'Taxa de Consumo', unidade: 'kg/m²' }
    ]
  },
  {
    id: 'child_premoldado_sarrafos',
    codigo: 'premoldado_sarrafos',
    nome: 'Sarrafos de Madeira 1" x 4"',
    descricao: 'Comprimento total de sarrafos para engradamento das fôrmas',
    categoria: 'Fôrmas & Escoramento',
    unidade: 'm',
    literal: 'Sarrafos = (L×4 + L/0,4×B + H×(B+0,1)/0,4 + B+0,1) × 1,20 × JogosFôrma',
    exemplo: '85,00 m × 3 jogos = 255,00 m',
    parametrosList: [
      { simbolo: 'L', nome: 'Altura / Comprimento L', unidade: 'm' },
      { simbolo: 'B', nome: 'Menor Dimensão B', unidade: 'm' },
      { simbolo: 'H', nome: 'Maior Dimensão H', unidade: 'm' }
    ]
  },
  {
    id: 'child_premoldado_pontaletes',
    codigo: 'premoldado_pontaletes',
    nome: 'Pontaletes de Madeira 3" x 3"',
    descricao: 'Comprimento total de pontaletes para alinhamento e trava',
    categoria: 'Fôrmas & Escoramento',
    unidade: 'm',
    literal: 'Pontaletes = (L × 4) × 1,20 × JogosFôrma',
    exemplo: '93,60 m × 3 jogos = 280,80 m',
    parametrosList: [
      { simbolo: 'L', nome: 'Altura / Comprimento L', unidade: 'm' }
    ]
  },
  {
    id: 'child_premoldado_desmoldante',
    codigo: 'premoldado_desmoldante',
    nome: 'Desmoldante / Concreto Aparente',
    descricao: 'Área de aplicação de agente desmoldante em fôrmas',
    categoria: 'Insumos / Auxiliar',
    unidade: 'm²',
    literal: 'Desmoldante = L × B × Quant',
    exemplo: '19,50m × 0,60m × 27 = 315,90 m²',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Peças', unidade: 'und' },
      { simbolo: 'L', nome: 'Altura / Comprimento L', unidade: 'm' },
      { simbolo: 'B', nome: 'Menor Dimensão B', unidade: 'm' }
    ]
  },
  {
    id: 'child_premoldado_guindaste',
    codigo: 'premoldado_guindaste',
    nome: 'Guindaste 50 Toneladas (Montagem & Ereção)',
    descricao: 'Horas operacionais de guindaste para içamento das peças',
    categoria: 'Equipamentos & Logística',
    unidade: 'horas',
    literal: 'Guindaste = (⌈Quant / 10⌉ × 10) + 20',
    exemplo: '(3 dias × 10h) + 20h = 50,00 horas',
    parametrosList: [
      { simbolo: 'Quant', nome: 'Quantidade de Peças', unidade: 'und' },
      { simbolo: 'TaxaMontagem', nome: 'Rendimento de Montagem', unidade: 'peças/dia' }
    ]
  }
];

export const FORMULAS_FILHAS_PISO_CONCRETO = [
  {
    id: 'child_piso_mo_montagem',
    codigo: 'piso_mo_montagem_tela',
    nome: 'MO Corte, Dobra e Montagem de Tela em Aço',
    descricao: 'Mão de obra para manuseio e colocação de telas soldadas CA-60',
    categoria: 'Mão de Obra & Serviços',
    unidade: 'kg',
    literal: 'MO Tela = (Peso Tela Sup + Peso Tela Inf) × 1,17',
    exemplo: '3,91 kg/m² + 2,20 kg/m² = 6,11 kg/m²',
    parametrosList: [
      { simbolo: 'PesoTelaSup', nome: 'Peso Tela Superior', unidade: 'kg/m²' },
      { simbolo: 'PesoTelaInf', nome: 'Peso Tela Inferior', unidade: 'kg/m²' }
    ]
  },
  {
    id: 'child_piso_endurecedor',
    codigo: 'piso_endurecedor_superficie',
    nome: 'Líquido Endurecedor de Superfície',
    descricao: 'Endurecedor de superfície mineral para pisos industriais',
    categoria: 'Tratamento de Superfície',
    unidade: 'm²',
    literal: 'Endurecedor = 1,00 × Área Total Piso',
    exemplo: '1,00 m²/m² × 7.950 m² = 7.950 m²',
    parametrosList: [
      { simbolo: 'AreaPiso', nome: 'Área Total do Piso', unidade: 'm²' }
    ]
  },
  {
    id: 'child_piso_cura_quimica',
    codigo: 'piso_cura_quimica',
    nome: 'Cura Química para Piso',
    descricao: 'Aplicação de membrana de cura química para retenção de água',
    categoria: 'Tratamento de Superfície',
    unidade: 'm²',
    literal: 'Cura Química = 1,00 × Área Total Piso',
    exemplo: '1,00 m²/m² × 7.950 m² = 7.950 m²',
    parametrosList: [
      { simbolo: 'AreaPiso', nome: 'Área Total do Piso', unidade: 'm²' }
    ]
  },
  {
    id: 'child_piso_junta_poliuretano',
    codigo: 'piso_junta_poliuretano',
    nome: 'Junta de Poliuretano (PU)',
    descricao: 'Selante de poliuretano elastomérico para tratamento de juntas',
    categoria: 'Juntas & Selantes',
    unidade: 'm',
    literal: 'Junta PU = (2×(W+L)/(W×L)) × AreaPiso × %PU',
    exemplo: '0,36 m/m² × 7.950 m² × 80% = 2.289,60 m',
    parametrosList: [
      { simbolo: 'W', nome: 'Largura do Módulo', unidade: 'm' },
      { simbolo: 'L', nome: 'Comprimento do Módulo', unidade: 'm' },
      { simbolo: 'AreaPiso', nome: 'Área Total do Piso', unidade: 'm²' }
    ]
  },
  {
    id: 'child_piso_junta_epoxi',
    codigo: 'piso_junta_epoxi',
    nome: 'Junta de Epóxi Semi-Rígido',
    descricao: 'Preenchimento de junta com resina epóxi semi-rígida',
    categoria: 'Juntas & Selantes',
    unidade: 'm',
    literal: 'Junta Epóxi = (2×(W+L)/(W×L)) × AreaPiso × %Epóxi',
    exemplo: '0,36 m/m² × 7.950 m² × 20% = 572,40 m',
    parametrosList: [
      { simbolo: 'W', nome: 'Largura do Módulo', unidade: 'm' },
      { simbolo: 'L', nome: 'Comprimento do Módulo', unidade: 'm' },
      { simbolo: 'AreaPiso', nome: 'Área Total do Piso', unidade: 'm²' }
    ]
  },
  {
    id: 'child_piso_barra_transferencia',
    codigo: 'piso_barra_transferencia',
    nome: 'Barra de Transferência Ø25mm (ou bitola especificada)',
    descricao: 'Massa de aço CA-50 em barras de transferência lisas graxadas',
    categoria: 'Armação & Transferência',
    unidade: 'kg',
    literal: 'Barras Transf = (Extensão Juntas / Espaçamento) × Comprimento × Peso/m',
    exemplo: '(2.862m / 0,30m) × 0,50m × 3,86 kg/m = 18.412,20 kg',
    parametrosList: [
      { simbolo: 'ØBarra', nome: 'Diâmetro da Barra', unidade: 'mm' },
      { simbolo: 'Espaçamento', nome: 'Espaçamento entre Barras', unidade: 'm' },
      { simbolo: 'Comprimento', nome: 'Comprimento da Barra', unidade: 'm' }
    ]
  },
  {
    id: 'child_piso_fibra_aco',
    codigo: 'piso_fibra_aco',
    nome: 'Fibra de Aço Matriz (Substituição de Tela)',
    descricao: 'Massa de fibra estrutural de aço dosada no concreto',
    categoria: 'Armação & Fibras',
    unidade: 'kg',
    literal: 'Fibra Aço = Consumo (kg/m³) × Vol. Concreto (m³)',
    exemplo: '20 kg/m³ × 1.335,60 m³ = 26.712,00 kg',
    parametrosList: [
      { simbolo: 'Consumo', nome: 'Consumo de Fibra', unidade: 'kg/m³' },
      { simbolo: 'VolConcreto', nome: 'Volume de Concreto', unidade: 'm³' }
    ]
  },
  {
    id: 'child_piso_concreto_usinado',
    codigo: 'piso_concreto_usinado',
    nome: 'Concreto Usinado fctM,k ≥ 4,2 MPa com 5% de perda',
    descricao: 'Volume de concreto usinado bombeável para piso industrial',
    categoria: 'Concreto Usinado',
    unidade: 'm³',
    literal: 'Concreto = Espessura × 1,05 × AreaPiso',
    exemplo: '0,16m × 1,05 × 7.950 m² = 1.335,60 m³',
    parametrosList: [
      { simbolo: 'Espessura', nome: 'Espessura do Piso', unidade: 'm' },
      { simbolo: 'AreaPiso', nome: 'Área Total do Piso', unidade: 'm²' }
    ]
  },
  {
    id: 'child_piso_lona_plastica',
    codigo: 'piso_lona_plastica',
    nome: 'Lona Plástica 0,15mm (Impermeabilização com 10% sobreposição)',
    descricao: 'Lona plástica sob o piso para contenção de umidade de solo',
    categoria: 'Impermeabilização & Base',
    unidade: 'm²',
    literal: 'Lona = 1,10 × AreaPiso',
    exemplo: '1,10 × 7.950 m² = 8.745,00 m²',
    parametrosList: [
      { simbolo: 'AreaPiso', nome: 'Área Total do Piso', unidade: 'm²' }
    ]
  }
];

export const FORMULAS_FILHAS_DRENAGEM = [
  {
    id: 'child_drenagem_escavacao',
    codigo: 'drenagem_escavacao',
    nome: 'Escavação Mecânica/Manual para Caixas e Valas',
    descricao: 'Volume total de solo escavado para poços, caixas e tubulações',
    categoria: 'Terraplenagem & Escavação',
    unidade: 'm³',
    literal: 'Vescav = Σ(B+2e+2f)×(H+2e+2f)×prof + Σ(Bvala×profMed×L)',
    exemplo: '5 caixas × 3,90m³ + 100m vala × 2,88m³ = 307,50 m³',
    parametrosList: [
      { simbolo: 'QtdCaixas', nome: 'Quantidade de Caixas', unidade: 'un' },
      { simbolo: 'CompTubos', nome: 'Extensão de Tubulação', unidade: 'm' }
    ]
  },
  {
    id: 'child_drenagem_lastro_magro',
    codigo: 'drenagem_lastro_magro_caixas',
    nome: 'Lastro de Concreto Magro e=5cm para Caixas',
    descricao: 'Regularização e limpeza de base para laje de fundo de caixas',
    categoria: 'Concreto & Fundações',
    unidade: 'm³',
    literal: 'Vlastro = ÁreaApiloamento × 0,05m + (B×H)×0,07',
    exemplo: '3,53 m² × 0,05m = 0,36 m³/un',
    parametrosList: [
      { simbolo: 'B', nome: 'Comprimento Interno', unidade: 'm' },
      { simbolo: 'H', nome: 'Largura Interna', unidade: 'm' }
    ]
  },
  {
    id: 'child_drenagem_alvenaria_blocos',
    codigo: 'drenagem_alvenaria_blocos',
    nome: 'Alvenaria de Bloco de Concreto Estrutural 14cm/19cm',
    descricao: 'Unidades de bloco de concreto para montagem das paredes das caixas',
    categoria: 'Alvenaria de Caixas',
    unidade: 'un',
    literal: 'Blocos = ⌈PerímetroParedes × Profundidade × 13,1⌉',
    exemplo: '7,44m × 1,50m × 13,1 = 147 un/caixa',
    parametrosList: [
      { simbolo: 'Profundidade', nome: 'Profundidade Média', unidade: 'm' }
    ]
  },
  {
    id: 'child_drenagem_lastro_areia',
    codigo: 'drenagem_lastro_areia_tubos',
    nome: 'Lastro de Areia/Brita e=10cm para Berço de Tubos',
    descricao: 'Colchão de assentamento de areia ou brita sob tubulação',
    categoria: 'Berço & Tubulações',
    unidade: 'm³',
    literal: 'VlastroTubo = LarguraVala × 0,10m × Comprimento',
    exemplo: '1,20m × 0,10m × 25m = 3,00 m³',
    parametrosList: [
      { simbolo: 'LarguraVala', nome: 'Largura da Vala', unidade: 'm' },
      { simbolo: 'Comprimento', nome: 'Comprimento do Trecho', unidade: 'm' }
    ]
  },
  {
    id: 'child_drenagem_assentamento_tubo',
    codigo: 'drenagem_assentamento_tubos',
    nome: 'Assentamento de Tubos de Concreto / PVC (Ø100 a Ø1500mm)',
    descricao: 'Comprimento linear de tubo assentado e rejuntado',
    categoria: 'Assentamento de Tubos',
    unidade: 'm',
    literal: 'Ltubo = Comprimento Total do Trecho',
    exemplo: 'Trecho 1 Ø600mm = 25,00 m',
    parametrosList: [
      { simbolo: 'Ømm', nome: 'Diâmetro Nominal', unidade: 'mm' },
      { simbolo: 'Comprimento', nome: 'Extensão do Trecho', unidade: 'm' }
    ]
  },
  {
    id: 'child_drenagem_tampao_ff',
    codigo: 'drenagem_tampao_ff',
    nome: 'Tampão de Ferro Fundido Dúctil Articulado Ø60cm',
    descricao: 'Fornecimento e colocação de tampão articulado classe 400',
    categoria: 'Acessórios & Tampões',
    unidade: 'un',
    literal: 'Tampão FF = Qtd de Caixas com Fechamento Tampão FF',
    exemplo: '5 Poços de Visita (PVAP) = 5 un',
    parametrosList: [
      { simbolo: 'QtdCaixas', nome: 'Quantidade de Caixas PVAP', unidade: 'un' }
    ]
  }
];

export const FORMULAS_FILHAS_PITS = [
  {
    id: 'child_pit_concreto_estrutural',
    codigo: 'pit_concreto_estrutural',
    nome: 'Concreto Armado Estrutural fck ≥ 30 MPa (Paredes, Lajes e Divisórias)',
    descricao: 'Volume total de concreto para estrutura monolítica do reservatório',
    categoria: 'Concreto Estrutural',
    unidade: 'm³',
    literal: 'Vconc = Vparedes + Vdivisoria + VlajeInf + VlajeSup',
    exemplo: '130,46m³ paredes + 65,74m³ laje inf + 65,74m³ laje sup = 261,94 m³',
    parametrosList: [
      { simbolo: 'Pint1', nome: 'Comprimento Interno', unidade: 'm' },
      { simbolo: 'Pint2', nome: 'Largura Interna', unidade: 'm' },
      { simbolo: 'Hint', nome: 'Altura Interna', unidade: 'm' }
    ]
  },
  {
    id: 'child_pit_forma_compensada',
    codigo: 'pit_forma_compensada',
    nome: 'Fôrma de Madeira Compensada Plastificada 3X Uso',
    descricao: 'Área total de fôrma para paredes internas/externas, divisórias e laje superior',
    categoria: 'Fôrmas & Escoramento',
    unidade: 'm²',
    literal: 'Aforma = AformaParedes + AformaDivisoria + AformaLajes',
    exemplo: '1.792,84m² paredes + 53,34m² laje inf + 385m² tampa = 2.231,18 m²',
    parametrosList: [
      { simbolo: 'Pext1', nome: 'Comprimento Externo', unidade: 'm' },
      { simbolo: 'Pext2', nome: 'Largura Externa', unidade: 'm' }
    ]
  },
  {
    id: 'child_pit_aco_ca50',
    codigo: 'pit_aco_ca50',
    nome: 'Aço CA-50 Cortado e Dobrado (Taxa Paramétrica 110-150 kg/m³)',
    descricao: 'Massa total de armação em barras de aço estrutural para o reservatório',
    categoria: 'Armação de Aço',
    unidade: 'kg',
    literal: 'Paço = VolumeConcretoTotal × TaxaAço (kg/m³)',
    exemplo: '261,94 m³ × 150 kg/m³ = 39.290,63 kg',
    parametrosList: [
      { simbolo: 'VolConcreto', nome: 'Volume de Concreto', unidade: 'm³' },
      { simbolo: 'TaxaAço', nome: 'Taxa de Aço', unidade: 'kg/m³' }
    ]
  },
  {
    id: 'child_pit_cimbramento_tampa',
    codigo: 'pit_cimbramento_tampa',
    nome: 'Cimbramento e Escoramento Tubular de Laje Superior',
    descricao: 'Volume de cimbramento de apoio para concretagem da laje de tampa',
    categoria: 'Escoramento & Apoio',
    unidade: 'm³',
    literal: 'Vcimb = ÁreaLajeSuperior × AlturaInterna',
    exemplo: '385 m² × 2,45 m = 943,25 m³',
    parametrosList: [
      { simbolo: 'ÁreaLaje', nome: 'Área da Laje Superior', unidade: 'm²' },
      { simbolo: 'Hint', nome: 'Altura Interna', unidade: 'm' }
    ]
  },
  {
    id: 'child_pit_impermeabilizacao',
    codigo: 'pit_impermeabilizacao_manta',
    nome: 'Impermeabilização Flexível Múltipla Camada (Acumulação / Reuso)',
    descricao: 'Área total de impermeabilização em manta/argamassa flexível interna',
    categoria: 'Impermeabilização & Isolação',
    unidade: 'm²',
    literal: 'Aimper = ParedesInternas + FundoInterno + Divisórias',
    exemplo: '2×(22+17,5)×2,45 + (22×17,5) = 1.253,28 m²',
    parametrosList: [
      { simbolo: 'ÁreaMolhada', nome: 'Área Interna Molhada', unidade: 'm²' }
    ]
  }
];

export const FORMULAS_FILHAS_SUPERESTRUTURA = [
  {
    id: 'child_sup_vigas_inloco',
    codigo: 'sup_vigas_inloco',
    nome: 'Vigas de Concreto Armado In-Loco (Retangulares)',
    descricao: 'Dimensionamento de fôrma, concreto e cimbramento para vigas moldadas no local',
    categoria: 'Vigas In-Loco',
    unidade: 'm³',
    literal: 'Vconc = (B × H × L - Desconto) × Qtd × Repetições',
    exemplo: '9 vigas 50×130cm × 18m = 105,30 m³',
    parametrosList: [
      { simbolo: 'B', nome: 'Largura da Viga', unidade: 'm' },
      { simbolo: 'H', nome: 'Altura da Viga', unidade: 'm' },
      { simbolo: 'L', nome: 'Comprimento', unidade: 'm' }
    ]
  },
  {
    id: 'child_sup_pilares_inloco',
    codigo: 'sup_pilares_inloco',
    nome: 'Pilares Retangulares e Circulares In-Loco',
    descricao: 'Fôrma e volume de concreto de pilares moldados no local',
    categoria: 'Pilares In-Loco',
    unidade: 'm³',
    literal: 'Vconc = (B × D × H - Desconto) × Qtd × Repetições',
    exemplo: '62 pilares 50×50cm × 10m = 155,00 m³',
    parametrosList: [
      { simbolo: 'B', nome: 'Largura/Seção 1', unidade: 'm' },
      { simbolo: 'D', nome: 'Profundidade/Seção 2', unidade: 'm' },
      { simbolo: 'H', nome: 'Altura/Pé-direito', unidade: 'm' }
    ]
  },
  {
    id: 'child_sup_lajes_inloco',
    codigo: 'sup_lajes_inloco',
    nome: 'Lajes Maciças, Nervuradas e Cubetas In-Loco',
    descricao: 'Área de fôrma, volume de concreto e cimbramento para lajes in-loco',
    categoria: 'Lajes In-Loco',
    unidade: 'm²',
    literal: 'Aforma = (B × L - Desconto) × Qtd × Repetições',
    exemplo: '1 laje 55×90m = 4.950,00 m²',
    parametrosList: [
      { simbolo: 'B', nome: 'Largura da Laje', unidade: 'm' },
      { simbolo: 'L', nome: 'Comprimento da Laje', unidade: 'm' }
    ]
  },
  {
    id: 'child_sup_cimbramento_escoramento',
    codigo: 'sup_cimbramento_escoramento',
    nome: 'Cimbramento e Escoramento Tubular de Vigas e Lajes',
    descricao: 'Volume total de escoramento para apoio das fôrmas de superestrutura',
    categoria: 'Escoramento & Apoio',
    unidade: 'm³',
    literal: 'Vcimb = L × Qtd × (B + 1,20m) × PéDireito × Repetições',
    exemplo: '4.950 m² laje × 4m pé-direito = 19.800,00 m³',
    parametrosList: [
      { simbolo: 'Área/Extensão', nome: 'Dimensão de Apoio', unidade: 'm²' },
      { simbolo: 'PéDireito', nome: 'Pé-direito Livre', unidade: 'm' }
    ]
  },
  {
    id: 'child_sup_pecas_premoldadas',
    codigo: 'sup_pecas_premoldadas',
    nome: 'Peças Pré-Moldadas Fabricadas e Montadas (Pilares, Vigas, Lajes)',
    descricao: 'Contagem e metragem de elementos pré-fabricados de concreto',
    categoria: 'Estrutura Pré-Moldada',
    unidade: 'un',
    literal: 'TotalPeças = Soma da quantidade de peças pré-moldadas',
    exemplo: '80 pilares + 99 vigas + 3 lajes = 182 un',
    parametrosList: [
      { simbolo: 'QtdPeças', nome: 'Quantidade de Peças', unidade: 'un' }
    ]
  }
];

export const GerenciadorFormulas: React.FC = () => {
  const [formulas, setFormulas] = useState<FormulaBibliotecaItem[]>(getFormulasDisponiveis);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');
  const [selectedFormulaModal, setSelectedFormulaModal] = useState<FormulaBibliotecaItem | null>(null);
  const [calcInputs, setCalcInputs] = useState<Record<string, number>>({});
  const [expandedMasterIds, setExpandedMasterIds] = useState<string[]>([
    'viga_baldrame_completo', 
    'sapata_isolada_completo',
    'bloco_fundacao_completo',
    'tubulao_completo',
    'estaca_fundacao_completo',
    'premoldados_completo',
    'piso_concreto_completo',
    'drenagem_completo',
    'pits_reservatorios_completo',
    'superestrutura_completo'
  ]);

  const toggleExpandMaster = (id: string) => {
    if (expandedMasterIds.includes(id)) {
      setExpandedMasterIds(expandedMasterIds.filter(i => i !== id));
    } else {
      setExpandedMasterIds([...expandedMasterIds, id]);
    }
  };

  // Form de criação de nova fórmula
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('Fundações & Estrutura');
  const [unidade, setUnidade] = useState('m³');
  const [descricao, setDescricao] = useState('');
  const [equacaoExemplo, setEquacaoExemplo] = useState('');
  const [variaveis, setVariaveis] = useState<Array<{ chave: string; nome: string; unidade: string; padrao: number }>>([
    { chave: 'comprimento', nome: 'Comprimento (L)', unidade: 'm', padrao: 2.0 },
    { chave: 'largura', nome: 'Largura (W)', unidade: 'm', padrao: 2.0 },
    { chave: 'altura', nome: 'Altura (H)', unidade: 'm', padrao: 1.0 }
  ]);

  const handleAddVariavel = () => {
    setVariaveis([
      ...variaveis,
      { chave: `var_${Date.now()}`, nome: 'Nova Variável', unidade: 'm', padrao: 1.0 }
    ]);
  };

  const handleRemoveVariavel = (index: number) => {
    setVariaveis(variaveis.filter((_, i) => i !== index));
  };

  const handleSaveNovaFormula = () => {
    if (!nome.trim()) {
      alert('Digite um nome para a fórmula.');
      return;
    }

    const novaForm: FormulaBibliotecaItem = {
      id: `form-custom-${Date.now()}`,
      nome: nome.trim(),
      categoria: categoria.trim() || 'Geral',
      unidadeResultante: unidade.trim() || 'm²',
      descricao: descricao.trim() || 'Fórmula cadastrada pelo orçamentista.',
      equacaoExemplo: equacaoExemplo.trim() || `${nome.trim()} = Variaveis Multiplicadas`,
      parametrosRequeridos: variaveis.map(v => ({
        chave: v.chave.trim() || 'var',
        nome: v.nome.trim() || 'Parâmetro',
        unidade: v.unidade.trim() || 'm',
        padrao: Number(v.padrao) || 1
      })),
      formatarExpressao: (p) => {
        let total = 1;
        let substitutive: string[] = [];
        variaveis.forEach(v => {
          const val = p[v.chave] ?? v.padrao ?? 1;
          total *= val;
          substitutive.push(`${v.nome}: ${val}`);
        });
        return {
          literal: equacaoExemplo || nome,
          substituicao: `${substitutive.join(' × ')} = ${total.toFixed(2)} ${unidade}`,
          resultado: total
        };
      }
    };

    const atualCustom = (() => {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_FORMULAS_KEY);
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    })();

    const proximoCustom = [novaForm, ...atualCustom];
    localStorage.setItem(LOCAL_STORAGE_FORMULAS_KEY, JSON.stringify(proximoCustom));

    setFormulas([...CATALOGO_FORMULAS_PADRAO, ...proximoCustom]);
    setShowCreateForm(false);
    setNome('');
    setDescricao('');
    setEquacaoExemplo('');
    alert(`Fórmula "${novaForm.nome}" cadastrada com sucesso! Ela já está disponível no dropdown do memorial.`);
  };

  const handleDeleteCustomFormula = (id: string) => {
    if (!confirm('Deseja excluir esta fórmula customizada?')) return;
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_FORMULAS_KEY);
      const list: FormulaBibliotecaItem[] = saved ? JSON.parse(saved) : [];
      const filtered = list.filter(f => f.id !== id);
      localStorage.setItem(LOCAL_STORAGE_FORMULAS_KEY, JSON.stringify(filtered));
      setFormulas([...CATALOGO_FORMULAS_PADRAO, ...filtered]);
    } catch {}
  };

  const categorias = Array.from(new Set(formulas.map(f => f.categoria)));

  const term = searchTerm.trim().toLowerCase();

  const isChildMatchingSearch = (child: typeof FORMULAS_FILHAS_BALDRAMES[0]) => {
    if (!term) return true;
    return (
      child.nome.toLowerCase().includes(term) ||
      child.codigo.toLowerCase().includes(term) ||
      child.descricao.toLowerCase().includes(term) ||
      child.categoria.toLowerCase().includes(term) ||
      child.literal.toLowerCase().includes(term) ||
      child.parametrosList.some(p => p.nome.toLowerCase().includes(term) || p.simbolo.toLowerCase().includes(term))
    );
  };

  const formulasFiltradas = formulas.filter(f => {
    const isMasterBaldrame = f.id === 'viga_baldrame_completo';
    const isMasterSapata = f.id === 'sapata_isolada_completo';

    const childMatchBaldrame = isMasterBaldrame && FORMULAS_FILHAS_BALDRAMES.some(isChildMatchingSearch);
    const childMatchSapata = isMasterSapata && FORMULAS_FILHAS_SAPATAS.some(isChildMatchingSearch);

    const matchSearch = !term || 
                        f.nome.toLowerCase().includes(term) || 
                        f.descricao.toLowerCase().includes(term) ||
                        f.categoria.toLowerCase().includes(term) ||
                        f.id.toLowerCase().includes(term) ||
                        childMatchBaldrame ||
                        childMatchSapata;

    const matchCat = categoriaFiltro === 'todas' || f.categoria === categoriaFiltro;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      {/* Header Limpo da Central de Fórmulas */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Cadastro & Central de Fórmulas de Engenharia
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastre novas equações e regras de cálculo para que seu orçamentista as selecione ao calcular serviços no memorial.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Cadastrar Nova Fórmula</span>
        </button>
      </div>

      {/* Formulário de Criação de Fórmula em Card Clean */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-2xl border border-blue-200 shadow-md space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-600" />
              Nova Fórmula Personalizada
            </h3>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-xs text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Nome da Fórmula</label>
              <input
                type="text"
                placeholder="Ex: Volume de Concreto Armado para Sapata"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unidade Resultante</label>
              <select
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-blue-500 font-medium bg-white"
              >
                <option value="m³">m³ (Volume)</option>
                <option value="m²">m² (Área)</option>
                <option value="m">m (Extensão)</option>
                <option value="kg">kg (Peso de Aço)</option>
                <option value="H">H (Homem-Hora)</option>
                <option value="m³xKm">m³xKm (Transporte)</option>
                <option value="UN">UN (Unidade)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Categoria da Disciplina</label>
              <input
                type="text"
                placeholder="Ex: Fundações, Pavimentação, Alvenaria"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-blue-500 font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Expressão Literal (Como aparece no Memorial)</label>
              <input
                type="text"
                placeholder="Ex: Volume = Comprimento (L) × Largura (W) × Altura (H) × Repetições"
                value={equacaoExemplo}
                onChange={(e) => setEquacaoExemplo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-blue-500 font-medium"
              />
            </div>
          </div>

          {/* Variáveis da Fórmula */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Variáveis & Parâmetros Exigidos:</span>
              <button
                type="button"
                onClick={handleAddVariavel}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                + Adicionar Variável
              </button>
            </div>

            <div className="space-y-2">
              {variaveis.map((v, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
                  <input
                    type="text"
                    placeholder="Chave (ex: comp)"
                    value={v.chave}
                    onChange={(e) => {
                      const copy = [...variaveis];
                      copy[idx].chave = e.target.value;
                      setVariaveis(copy);
                    }}
                    className="w-28 px-2 py-1 border border-slate-300 rounded-lg font-mono bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Nome de Exibição"
                    value={v.nome}
                    onChange={(e) => {
                      const copy = [...variaveis];
                      copy[idx].nome = e.target.value;
                      setVariaveis(copy);
                    }}
                    className="flex-1 px-2 py-1 border border-slate-300 rounded-lg font-medium bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Unid (m)"
                    value={v.unidade}
                    onChange={(e) => {
                      const copy = [...variaveis];
                      copy[idx].unidade = e.target.value;
                      setVariaveis(copy);
                    }}
                    className="w-16 px-2 py-1 border border-slate-300 rounded-lg text-center font-bold bg-white"
                  />
                  <input
                    type="number"
                    placeholder="Padrão"
                    value={v.padrao}
                    onChange={(e) => {
                      const copy = [...variaveis];
                      copy[idx].padrao = parseFloat(e.target.value) || 0;
                      setVariaveis(copy);
                    }}
                    className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-right font-mono font-bold bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveVariavel(idx)}
                    className="text-slate-400 hover:text-rose-600 px-1 cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveNovaFormula}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Fórmula no Catálogo</span>
            </button>
          </div>
        </div>
      )}

      {/* BUSCA DE FÓRMULAS E SELEÇÃO DE CATEGORIA POR LISTA */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        {/* Campo de Busca por Escrita em Tempo Real */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Digite para buscar fórmulas por nome, código ou variável (ex: Concreto, Escavação, Fôrma, Armação)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 font-medium text-slate-800 transition-all placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 font-bold text-xs p-0.5 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Dropdown de Categoria em Formato de Lista Suspensa */}
        <div className="w-full sm:w-72 shrink-0">
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
          >
            <option value="todas">-- Todas as Categorias ({formulas.length}) --</option>
            {categorias.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela de Fórmulas Cadastradas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 font-semibold text-slate-600 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4 min-w-[220px] border-r border-slate-200">NOME DA FÓRMULA</th>
                <th className="py-3 px-4 border-r border-slate-200">CATEGORIA</th>
                <th className="py-3 px-3 text-center border-r border-slate-200">SAÍDA</th>
                <th className="py-3 px-4 min-w-[260px] border-r border-slate-200">EQUAÇÃO LITERAL DE CÁLCULO</th>
                <th className="py-3 px-4 border-r border-slate-200">VARIÁVEIS EXIGIDAS</th>
                <th className="py-3 px-4">CÓD / ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {formulasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    Nenhuma fórmula encontrada no filtro selecionado.
                  </td>
                </tr>
              ) : (
                formulasFiltradas.map(formula => {
                  const isCustom = formula.id.startsWith('form-custom-');
                  const isMasterFormula = formula.id === 'viga_baldrame_completo' || formula.id === 'sapata_isolada_completo' || formula.id === 'bloco_fundacao_completo' || formula.id === 'tubulao_completo' || formula.id === 'estaca_fundacao_completo' || formula.id.includes('completo');
                  const isExpanded = expandedMasterIds.includes(formula.id);

                  return (
                    <React.Fragment key={formula.id}>
                      {/* LINHA PRINCIPAL PAI (MESTRE) */}
                      <tr 
                        onClick={() => {
                          if (isMasterFormula) {
                            toggleExpandMaster(formula.id);
                          } else {
                            setSelectedFormulaModal(formula);
                            const initObj: Record<string, number> = {};
                            (formula.parametrosRequeridos || []).forEach(p => {
                              initObj[p.chave] = p.padrao ?? 1;
                            });
                            setCalcInputs(initObj);
                          }
                        }}
                        className={`transition-colors cursor-pointer border-b border-slate-200 ${
                          isMasterFormula 
                            ? 'bg-slate-100/80 hover:bg-slate-200/70 font-medium' 
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-4 border-r border-slate-200">
                          <div className="flex items-center gap-2">
                            {isMasterFormula && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpandMaster(formula.id);
                                }}
                                className="p-1 hover:bg-slate-300/60 text-blue-600 rounded transition-colors cursor-pointer shrink-0"
                                title={isExpanded ? 'Minimizar Fórmulas Filhas' : 'Expandir Fórmulas Filhas'}
                              >
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                            )}
                            <div>
                              <div className="font-bold text-slate-900 text-xs">
                                {formula.nome}
                              </div>
                              <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                {formula.descricao}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 border-r border-slate-200">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider border border-slate-200/60">
                            {formula.categoria}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center border-r border-slate-200 font-mono font-bold text-blue-700 bg-blue-50/30">
                          {formula.unidadeResultante}
                        </td>

                        <td className="py-3 px-4 font-mono text-[11px] text-slate-800 border-r border-slate-200 bg-slate-50/50">
                          {formula.equacaoExemplo}
                        </td>

                        <td className="py-3 px-4 border-r border-slate-200 text-slate-700 font-sans text-[11px] leading-tight">
                          <div className="space-y-0.5">
                            {(formula.parametrosRequeridos || []).map(p => (
                              <div key={p.chave} className="whitespace-nowrap">
                                <strong className="text-slate-900 font-mono">{p.chave}:</strong> {p.nome} <span className="text-slate-400 font-mono">({p.unidade})</span>
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono font-medium text-slate-700 whitespace-nowrap text-[11px]">
                          <div className="flex items-center justify-between gap-2">
                            <span>{formula.id.replace('form-custom-', 'F-').replace('form-', 'F-')}</span>
                            {isCustom && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCustomFormula(formula.id);
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                                title="Excluir fórmula customizada"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* LINHAS FILHAS UNIFICADAS DIRETAMENTE NAS MESMAS COLUNAS DA TABELA MÃE */}
                      {formula.id === 'viga_baldrame_completo' && isExpanded && FORMULAS_FILHAS_BALDRAMES.map((child) => {
                        const createChildModalItem = (): FormulaBibliotecaItem => ({
                          id: child.codigo,
                          nome: child.nome,
                          categoria: `Viga Baldrame - ${child.categoria}`,
                          unidadeResultante: child.unidade,
                          descricao: `${child.descricao}. Exemplo Prático: ${child.exemplo}`,
                          equacaoExemplo: child.literal,
                          parametrosRequeridos: child.parametrosList.map(p => ({
                            chave: p.simbolo,
                            nome: p.nome,
                            unidade: p.unidade,
                            padrao: 1
                          })),
                          formatarExpressao: () => ({
                            literal: child.literal,
                            substituicao: `${child.nome} => Exemplo: ${child.exemplo}`,
                            resultado: 1.2
                          })
                        });

                        return (
                          <tr 
                            key={child.id} 
                            onClick={() => setSelectedFormulaModal(createChildModalItem())}
                            className="bg-slate-50/60 hover:bg-blue-50/30 transition-colors border-b border-slate-100 cursor-pointer"
                          >
                            <td className="py-2.5 px-4 border-r border-slate-200 pl-7">
                              <div className="flex items-center gap-1.5">
                                <span className="text-blue-400 font-sans font-bold">└─</span>
                                <div>
                                  <div className="font-bold text-slate-800 text-[11.5px]">{child.nome}</div>
                                  <div className="text-[10px] text-slate-500 line-clamp-1">{child.descricao}</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5 px-4 border-r border-slate-200">
                              <span className="px-2 py-0.5 rounded text-[9.5px] font-semibold bg-white border border-slate-200 text-slate-600 uppercase tracking-wider">
                                {child.categoria}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-center border-r border-slate-200 font-mono font-bold text-blue-700 bg-blue-50/20">
                              {child.unidade}
                            </td>

                            <td className="py-2.5 px-4 font-mono text-[10.5px] text-slate-800 border-r border-slate-200 bg-slate-50/40">
                              {child.literal}
                            </td>

                            <td className="py-2.5 px-4 border-r border-slate-200 text-slate-700 font-sans text-[10.5px] leading-tight">
                              <div className="space-y-0.5">
                                {child.parametrosList.map((p, pIdx) => (
                                  <div key={pIdx} className="whitespace-nowrap">
                                    <strong className="text-slate-900 font-mono">{p.simbolo}:</strong> {p.nome} <span className="text-slate-400 font-mono">({p.unidade})</span>
                                  </div>
                                ))}
                              </div>
                            </td>

                            <td className="py-2.5 px-4 font-mono font-medium text-slate-600 whitespace-nowrap text-[10.5px]">
                              {child.codigo}
                            </td>
                          </tr>
                        );
                      })}

                      {/* LINHAS FILHAS UNIFICADAS DE SAPATAS */}
                      {formula.id === 'sapata_isolada_completo' && isExpanded && FORMULAS_FILHAS_SAPATAS.map((child) => {
                        const createChildModalItem = (): FormulaBibliotecaItem => ({
                          id: child.codigo,
                          nome: child.nome,
                          categoria: `Sapata Isolada - ${child.categoria}`,
                          unidadeResultante: child.unidade,
                          descricao: `${child.descricao}. Exemplo Prático: ${child.exemplo}`,
                          equacaoExemplo: child.literal,
                          parametrosRequeridos: child.parametrosList.map(p => ({
                            chave: p.simbolo,
                            nome: p.nome,
                            unidade: p.unidade,
                            padrao: 1
                          })),
                          formatarExpressao: () => ({
                            literal: child.literal,
                            substituicao: `${child.nome} => Exemplo: ${child.exemplo}`,
                            resultado: 1.0
                          })
                        });

                        return (
                          <tr 
                            key={child.id} 
                            onClick={() => setSelectedFormulaModal(createChildModalItem())}
                            className="bg-slate-50/60 hover:bg-blue-50/30 transition-colors border-b border-slate-100 cursor-pointer"
                          >
                            <td className="py-2.5 px-4 border-r border-slate-200 pl-7">
                              <div className="flex items-center gap-1.5">
                                <span className="text-blue-400 font-sans font-bold">└─</span>
                                <div>
                                  <div className="font-bold text-slate-800 text-[11.5px]">{child.nome}</div>
                                  <div className="text-[10px] text-slate-500 line-clamp-1">{child.descricao}</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5 px-4 border-r border-slate-200">
                              <span className="px-2 py-0.5 rounded text-[9.5px] font-semibold bg-white border border-slate-200 text-slate-600 uppercase tracking-wider">
                                {child.categoria}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-center border-r border-slate-200 font-mono font-bold text-blue-700 bg-blue-50/20">
                              {child.unidade}
                            </td>

                            <td className="py-2.5 px-4 font-mono text-[10.5px] text-slate-800 border-r border-slate-200 bg-slate-50/40">
                              {child.literal}
                            </td>

                            <td className="py-2.5 px-4 border-r border-slate-200 text-slate-700 font-sans text-[10.5px] leading-tight">
                              <div className="space-y-0.5">
                                {child.parametrosList.map((p, pIdx) => (
                                  <div key={pIdx} className="whitespace-nowrap">
                                    <strong className="text-slate-900 font-mono">{p.simbolo}:</strong> {p.nome} <span className="text-slate-400 font-mono">({p.unidade})</span>
                                  </div>
                                ))}
                              </div>
                            </td>

                            <td className="py-2.5 px-4 font-mono font-medium text-slate-600 whitespace-nowrap text-[10.5px]">
                              {child.codigo}
                            </td>
                          </tr>
                        );
                      })}

                      {/* LINHAS FILHAS UNIFICADAS DE BLOCOS DE FUNDAÇÃO */}
                      {(formula.id === 'bloco_fundacao_completo' || formula.id.startsWith('bloco_')) && isExpanded && (
                        (() => {
                          const grupos = [
                            { titulo: 'BLOCO PILARES MOLDADOS IN LOCO', list: FORMULAS_FILHAS_BLOCO_MOLDADO },
                            { titulo: 'BLOCO PARA 3 ESTACAS', list: FORMULAS_FILHAS_BLOCO_3_ESTACAS },
                            { titulo: 'BLOCO PILARES PRÉ-MOLDADOS (CÁLICE)', list: FORMULAS_FILHAS_BLOCO_PRE_MOLDADO },
                            { titulo: 'BLOCO 3 ESTACAS PILARES PRÉ (CÁLICE)', list: FORMULAS_FILHAS_BLOCO_3_ESTACAS_PRE }
                          ];

                          return grupos.map((grupo, gIdx) => (
                            <React.Fragment key={gIdx}>
                              {/* Subcabeçalho de Tipo de Bloco */}
                              <tr className="bg-slate-100/90 font-bold text-slate-700 text-[11px] uppercase tracking-wider border-y border-slate-200">
                                <td colSpan={6} className="py-2 px-6">
                                  <div className="flex items-center gap-1.5 text-blue-800">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                                    <span>{grupo.titulo}</span>
                                  </div>
                                </td>
                              </tr>

                              {grupo.list.map((child) => {
                                const createChildModalItem = (): FormulaBibliotecaItem => ({
                                  id: child.codigo,
                                  nome: child.nome,
                                  categoria: `${grupo.titulo} - ${child.categoria}`,
                                  unidadeResultante: child.unidade,
                                  descricao: `${child.descricao}. Exemplo Prático: ${child.exemplo}`,
                                  equacaoExemplo: child.literal,
                                  parametrosRequeridos: child.parametrosList.map(p => ({
                                    chave: p.simbolo,
                                    nome: p.nome,
                                    unidade: p.unidade,
                                    padrao: 1
                                  })),
                                  formatarExpressao: () => ({
                                    literal: child.literal,
                                    substituicao: `${child.nome} => Exemplo: ${child.exemplo}`,
                                    resultado: 1.0
                                  })
                                });

                                return (
                                  <tr 
                                    key={child.id} 
                                    onClick={() => setSelectedFormulaModal(createChildModalItem())}
                                    className="bg-slate-50/60 hover:bg-blue-50/30 transition-colors border-b border-slate-100 cursor-pointer"
                                  >
                                    <td className="py-2.5 px-4 border-r border-slate-200 pl-9">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-blue-400 font-sans font-bold">└─</span>
                                        <div>
                                          <div className="font-bold text-slate-800 text-[11.5px]">{child.nome}</div>
                                          <div className="text-[10px] text-slate-500 line-clamp-1">{child.descricao}</div>
                                        </div>
                                      </div>
                                    </td>

                                    <td className="py-2.5 px-4 border-r border-slate-200">
                                      <span className="px-2 py-0.5 rounded text-[9.5px] font-semibold bg-white border border-slate-200 text-slate-600 uppercase tracking-wider">
                                        {child.categoria}
                                      </span>
                                    </td>

                                    <td className="py-2.5 px-3 text-center border-r border-slate-200 font-mono font-bold text-blue-700 bg-blue-50/20">
                                      {child.unidade}
                                    </td>

                                    <td className="py-2.5 px-4 font-mono text-[10.5px] text-slate-800 border-r border-slate-200 bg-slate-50/40">
                                      {child.literal}
                                    </td>

                                    <td className="py-2.5 px-4 border-r border-slate-200 text-slate-700 font-sans text-[10.5px] leading-tight">
                                      <div className="space-y-0.5">
                                        {child.parametrosList.map((p, pIdx) => (
                                          <div key={pIdx} className="whitespace-nowrap">
                                            <strong className="text-slate-900 font-mono">{p.simbolo}:</strong> {p.nome} <span className="text-slate-400 font-mono">({p.unidade})</span>
                                          </div>
                                        ))}
                                      </div>
                                    </td>

                                    <td className="py-2.5 px-4 font-mono font-medium text-slate-600 whitespace-nowrap text-[10.5px]">
                                      {child.codigo}
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          ));
                        })()
                      )}

                      {/* LINHAS FILHAS UNIFICADAS DE TUBULÕES DE FUNDAÇÃO */}
                      {(formula.id === 'tubulao_completo' || formula.id.startsWith('tubulao_')) && isExpanded && FORMULAS_FILHAS_TUBULAO.map((child) => {
                        const createChildModalItem = (): FormulaBibliotecaItem => ({
                          id: child.codigo,
                          nome: child.nome,
                          categoria: `Tubulão de Fundação - ${child.categoria}`,
                          unidadeResultante: child.unidade,
                          descricao: `${child.descricao}. Exemplo Prático: ${child.exemplo}`,
                          equacaoExemplo: child.literal,
                          parametrosRequeridos: child.parametrosList.map(p => ({
                            chave: p.simbolo,
                            nome: p.nome,
                            unidade: p.unidade,
                            padrao: 1
                          })),
                          formatarExpressao: () => ({
                            literal: child.literal,
                            substituicao: `${child.nome} => Exemplo: ${child.exemplo}`,
                            resultado: 1.0
                          })
                        });

                        return (
                          <tr 
                            key={child.id} 
                            onClick={() => setSelectedFormulaModal(createChildModalItem())}
                            className="bg-slate-50/60 hover:bg-blue-50/30 transition-colors border-b border-slate-100 cursor-pointer"
                          >
                            <td className="py-2.5 px-4 border-r border-slate-200 pl-7">
                              <div className="flex items-center gap-1.5">
                                <span className="text-blue-400 font-sans font-bold">└─</span>
                                <div>
                                  <div className="font-bold text-slate-800 text-[11.5px]">{child.nome}</div>
                                  <div className="text-[10px] text-slate-500 line-clamp-1">{child.descricao}</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5 px-4 border-r border-slate-200">
                              <span className="px-2 py-0.5 rounded text-[9.5px] font-semibold bg-white border border-slate-200 text-slate-600 uppercase tracking-wider">
                                {child.categoria}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-center border-r border-slate-200 font-mono font-bold text-blue-700 bg-blue-50/20">
                              {child.unidade}
                            </td>

                            <td className="py-2.5 px-4 font-mono text-[10.5px] text-slate-800 border-r border-slate-200 bg-slate-50/40">
                              {child.literal}
                            </td>

                            <td className="py-2.5 px-4 border-r border-slate-200 text-slate-700 font-sans text-[10.5px] leading-tight">
                              <div className="space-y-0.5">
                                {child.parametrosList.map((p, pIdx) => (
                                  <div key={pIdx} className="whitespace-nowrap">
                                    <strong className="text-slate-900 font-mono">{p.simbolo}:</strong> {p.nome} <span className="text-slate-400 font-mono">({p.unidade})</span>
                                  </div>
                                ))}
                              </div>
                            </td>

                            <td className="py-2.5 px-4 font-mono font-medium text-slate-600 whitespace-nowrap text-[10.5px]">
                              {child.codigo}
                            </td>
                          </tr>
                        );
                      })}

                      {/* LINHAS FILHAS UNIFICADAS DE ESTAÇÕES / ESTACAS DE FUNDAÇÃO */}
                      {(formula.id === 'estaca_fundacao_completo' || formula.id.startsWith('estaca_')) && isExpanded && FORMULAS_FILHAS_ESTACA.map((child) => {
                        const createChildModalItem = (): FormulaBibliotecaItem => ({
                          id: child.codigo,
                          nome: child.nome,
                          categoria: `Estaca de Fundação - ${child.categoria}`,
                          unidadeResultante: child.unidade,
                          descricao: `${child.descricao}. Exemplo Prático: ${child.exemplo}`,
                          equacaoExemplo: child.literal,
                          parametrosRequeridos: child.parametrosList.map(p => ({
                            chave: p.simbolo,
                            nome: p.nome,
                            unidade: p.unidade,
                            padrao: 1
                          })),
                          formatarExpressao: () => ({
                            literal: child.literal,
                            substituicao: `${child.nome} => Exemplo: ${child.exemplo}`,
                            resultado: 1.0
                          })
                        });

                        return (
                          <tr 
                            key={child.id} 
                            onClick={() => setSelectedFormulaModal(createChildModalItem())}
                            className="bg-slate-50/60 hover:bg-blue-50/30 transition-colors border-b border-slate-100 cursor-pointer"
                          >
                            <td className="py-2.5 px-4 border-r border-slate-200 pl-7">
                              <div className="flex items-center gap-1.5">
                                <span className="text-blue-400 font-sans font-bold">└─</span>
                                <div>
                                  <div className="font-bold text-slate-800 text-[11.5px]">{child.nome}</div>
                                  <div className="text-[10px] text-slate-500 line-clamp-1">{child.descricao}</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5 px-4 border-r border-slate-200">
                              <span className="px-2 py-0.5 rounded text-[9.5px] font-semibold bg-white border border-slate-200 text-slate-600 uppercase tracking-wider">
                                {child.categoria}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-center border-r border-slate-200 font-mono font-bold text-blue-700 bg-blue-50/20">
                              {child.unidade}
                            </td>

                            <td className="py-2.5 px-4 font-mono text-[10.5px] text-slate-800 border-r border-slate-200 bg-slate-50/40">
                              {child.literal}
                            </td>

                            <td className="py-2.5 px-4 border-r border-slate-200 text-slate-700 font-sans text-[10.5px] leading-tight">
                              <div className="space-y-0.5">
                                {child.parametrosList.map((p, pIdx) => (
                                  <div key={pIdx} className="whitespace-nowrap">
                                    <strong className="text-slate-900 font-mono">{p.simbolo}:</strong> {p.nome} <span className="text-slate-400 font-mono">({p.unidade})</span>
                                  </div>
                                ))}
                              </div>
                            </td>

                            <td className="py-2.5 px-4 font-mono font-medium text-slate-600 whitespace-nowrap text-[10.5px]">
                              {child.codigo}
                            </td>
                          </tr>
                        );
                      })}

                      {/* LINHAS FILHAS UNIFICADAS DE ELEMENTOS PRÉ-MOLDADOS */}
                      {(formula.id === 'premoldados_completo' || formula.id.startsWith('premoldado_')) && isExpanded && FORMULAS_FILHAS_PREMOLDADOS.map((child) => {
                        const createChildModalItem = (): FormulaBibliotecaItem => ({
                          id: child.codigo,
                          nome: child.nome,
                          categoria: `Pré-Moldado - ${child.categoria}`,
                          unidadeResultante: child.unidade,
                          descricao: `${child.descricao}. Exemplo Prático: ${child.exemplo}`,
                          equacaoExemplo: child.literal,
                          parametrosRequeridos: child.parametrosList.map(p => ({
                            chave: p.simbolo,
                            nome: p.nome,
                            unidade: p.unidade,
                            padrao: 1
                          })),
                          formatarExpressao: () => ({
                            literal: child.literal,
                            substituicao: `${child.nome} => Exemplo: ${child.exemplo}`,
                            resultado: 1.0
                          })
                        });

                        return (
                          <tr 
                            key={child.id} 
                            onClick={() => setSelectedFormulaModal(createChildModalItem())}
                            className="bg-slate-50/60 hover:bg-blue-50/30 transition-colors border-b border-slate-100 cursor-pointer"
                          >
                            <td className="py-2.5 px-4 border-r border-slate-200 pl-7">
                              <div className="flex items-center gap-1.5">
                                <span className="text-blue-400 font-sans font-bold">└─</span>
                                <div>
                                  <div className="font-bold text-slate-800 text-[11.5px]">{child.nome}</div>
                                  <div className="text-[10px] text-slate-500 line-clamp-1">{child.descricao}</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5 px-4 border-r border-slate-200">
                              <span className="px-2 py-0.5 rounded text-[9.5px] font-semibold bg-white border border-slate-200 text-slate-600 uppercase tracking-wider">
                                {child.categoria}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-center border-r border-slate-200 font-mono font-bold text-blue-700 bg-blue-50/20">
                              {child.unidade}
                            </td>

                            <td className="py-2.5 px-4 font-mono text-[10.5px] text-slate-800 border-r border-slate-200 bg-slate-50/40">
                              {child.literal}
                            </td>

                            <td className="py-2.5 px-4 border-r border-slate-200 text-slate-700 font-sans text-[10.5px] leading-tight">
                              <div className="space-y-0.5">
                                {child.parametrosList.map((p, pIdx) => (
                                  <div key={pIdx} className="whitespace-nowrap">
                                    <strong className="text-slate-900 font-mono">{p.simbolo}:</strong> {p.nome} <span className="text-slate-400 font-mono">({p.unidade})</span>
                                  </div>
                                ))}
                              </div>
                            </td>

                            <td className="py-2.5 px-4 font-mono font-medium text-slate-600 whitespace-nowrap text-[10.5px]">
                              {child.codigo}
                            </td>
                          </tr>
                        );
                      })}

                      {/* LINHAS FILHAS UNIFICADAS DE PISO DE CONCRETO */}
                      {(formula.id === 'piso_concreto_completo' || formula.id.startsWith('piso_')) && isExpanded && FORMULAS_FILHAS_PISO_CONCRETO.map((child) => {
                        const createChildModalItem = (): FormulaBibliotecaItem => ({
                          id: child.codigo,
                          nome: child.nome,
                          categoria: `Piso de Concreto - ${child.categoria}`,
                          unidadeResultante: child.unidade,
                          descricao: `${child.descricao}. Exemplo Prático: ${child.exemplo}`,
                          equacaoExemplo: child.literal,
                          parametrosRequeridos: child.parametrosList.map(p => ({
                            chave: p.simbolo,
                            nome: p.nome,
                            unidade: p.unidade,
                            padrao: 1
                          })),
                          formatarExpressao: () => ({
                            literal: child.literal,
                            substituicao: `${child.nome} => Exemplo: ${child.exemplo}`,
                            resultado: 1.0
                          })
                        });

                        return (
                          <tr 
                            key={child.id} 
                            onClick={() => setSelectedFormulaModal(createChildModalItem())}
                            className="bg-slate-50/60 hover:bg-blue-50/30 transition-colors border-b border-slate-100 cursor-pointer"
                          >
                            <td className="py-2.5 px-4 border-r border-slate-200 pl-7">
                              <div className="flex items-center gap-1.5">
                                <span className="text-blue-400 font-sans font-bold">└─</span>
                                <div>
                                  <div className="font-bold text-slate-800 text-[11.5px]">{child.nome}</div>
                                  <div className="text-[10px] text-slate-500 line-clamp-1">{child.descricao}</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5 px-4 border-r border-slate-200">
                              <span className="px-2 py-0.5 rounded text-[9.5px] font-semibold bg-white border border-slate-200 text-slate-600 uppercase tracking-wider">
                                {child.categoria}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-center border-r border-slate-200 font-mono font-bold text-blue-700 bg-blue-50/20">
                              {child.unidade}
                            </td>

                            <td className="py-2.5 px-4 font-mono text-[10.5px] text-slate-800 border-r border-slate-200 bg-slate-50/40">
                              {child.literal}
                            </td>

                            <td className="py-2.5 px-4 border-r border-slate-200 text-slate-700 font-sans text-[10.5px] leading-tight">
                              <div className="space-y-0.5">
                                {child.parametrosList.map((p, pIdx) => (
                                  <div key={pIdx} className="whitespace-nowrap">
                                    <strong className="text-slate-900 font-mono">{p.simbolo}:</strong> {p.nome} <span className="text-slate-400 font-mono">({p.unidade})</span>
                                  </div>
                                ))}
                              </div>
                            </td>

                            <td className="py-2.5 px-4 font-mono font-medium text-slate-600 whitespace-nowrap text-[10.5px]">
                              {child.codigo}
                            </td>
                          </tr>
                        );
                      })}

                      {/* LINHAS FILHAS UNIFICADAS DE REDE DE DRENAGEM PLUVIAL */}
                      {(formula.id === 'drenagem_completo' || formula.id.startsWith('drenagem_')) && isExpanded && FORMULAS_FILHAS_DRENAGEM.map((child) => {
                        const createChildModalItem = (): FormulaBibliotecaItem => ({
                          id: child.codigo,
                          nome: child.nome,
                          categoria: `Drenagem - ${child.categoria}`,
                          unidadeResultante: child.unidade,
                          descricao: `${child.descricao}. Exemplo Prático: ${child.exemplo}`,
                          equacaoExemplo: child.literal,
                          parametrosRequeridos: child.parametrosList.map(p => ({
                            chave: p.simbolo,
                            nome: p.nome,
                            unidade: p.unidade,
                            padrao: 1
                          })),
                          formatarExpressao: () => ({
                            literal: child.literal,
                            substituicao: `${child.nome} => Exemplo: ${child.exemplo}`,
                            resultado: 1.0
                          })
                        });

                        return (
                          <tr 
                            key={child.id} 
                            onClick={() => setSelectedFormulaModal(createChildModalItem())}
                            className="bg-slate-50/60 hover:bg-blue-50/30 transition-colors border-b border-slate-100 cursor-pointer"
                          >
                            <td className="py-2.5 px-4 border-r border-slate-200 pl-7">
                              <div className="flex items-center gap-1.5">
                                <span className="text-blue-400 font-sans font-bold">└─</span>
                                <div>
                                  <div className="font-bold text-slate-800 text-[11.5px]">{child.nome}</div>
                                  <div className="text-[10px] text-slate-500 line-clamp-1">{child.descricao}</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5 px-4 border-r border-slate-200">
                              <span className="px-2 py-0.5 rounded text-[9.5px] font-semibold bg-white border border-slate-200 text-slate-600 uppercase tracking-wider">
                                {child.categoria}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-center border-r border-slate-200 font-mono font-bold text-blue-700 bg-blue-50/20">
                              {child.unidade}
                            </td>

                            <td className="py-2.5 px-4 font-mono text-[10.5px] text-slate-800 border-r border-slate-200 bg-slate-50/40">
                              {child.literal}
                            </td>

                            <td className="py-2.5 px-4 border-r border-slate-200 text-slate-700 font-sans text-[10.5px] leading-tight">
                              <div className="space-y-0.5">
                                {child.parametrosList.map((p, pIdx) => (
                                  <div key={pIdx} className="whitespace-nowrap">
                                    <strong className="text-slate-900 font-mono">{p.simbolo}:</strong> {p.nome} <span className="text-slate-400 font-mono">({p.unidade})</span>
                                  </div>
                                ))}
                              </div>
                            </td>

                            <td className="py-2.5 px-4 font-mono font-medium text-slate-600 whitespace-nowrap text-[10.5px]">
                              {child.codigo}
                            </td>
                          </tr>
                        );
                      })}

                      {/* LINHAS FILHAS UNIFICADAS DE RESERVATÓRIOS, PITS E CANALETAS */}
                      {(formula.id === 'pits_reservatorios_completo' || formula.id.startsWith('pit_') || formula.id.startsWith('pits_')) && isExpanded && FORMULAS_FILHAS_PITS.map((child) => {
                        const createChildModalItem = (): FormulaBibliotecaItem => ({
                          id: child.codigo,
                          nome: child.nome,
                          categoria: `PITs - ${child.categoria}`,
                          unidadeResultante: child.unidade,
                          descricao: `${child.descricao}. Exemplo Prático: ${child.exemplo}`,
                          equacaoExemplo: child.literal,
                          parametrosRequeridos: child.parametrosList.map(p => ({
                            chave: p.simbolo,
                            nome: p.nome,
                            unidade: p.unidade,
                            padrao: 1
                          })),
                          formatarExpressao: () => ({
                            literal: child.literal,
                            substituicao: `${child.nome} => Exemplo: ${child.exemplo}`,
                            resultado: 1.0
                          })
                        });

                        return (
                          <tr 
                            key={child.id} 
                            onClick={() => setSelectedFormulaModal(createChildModalItem())}
                            className="bg-slate-50/60 hover:bg-cyan-50/30 transition-colors border-b border-slate-100 cursor-pointer"
                          >
                            <td className="py-2.5 px-4 border-r border-slate-200 pl-7">
                              <div className="flex items-center gap-1.5">
                                <span className="text-cyan-500 font-sans font-bold">└─</span>
                                <div>
                                  <div className="font-bold text-slate-800 text-[11.5px]">{child.nome}</div>
                                  <div className="text-[10px] text-slate-500 line-clamp-1">{child.descricao}</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5 px-4 border-r border-slate-200">
                              <span className="px-2 py-0.5 rounded text-[9.5px] font-semibold bg-white border border-slate-200 text-slate-600 uppercase tracking-wider">
                                {child.categoria}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-center border-r border-slate-200 font-mono font-bold text-cyan-700 bg-cyan-50/20">
                              {child.unidade}
                            </td>

                            <td className="py-2.5 px-4 font-mono text-[10.5px] text-slate-800 border-r border-slate-200 bg-slate-50/40">
                              {child.literal}
                            </td>

                            <td className="py-2.5 px-4 border-r border-slate-200 text-slate-700 font-sans text-[10.5px] leading-tight">
                              <div className="space-y-0.5">
                                {child.parametrosList.map((p, pIdx) => (
                                  <div key={pIdx} className="whitespace-nowrap">
                                    <strong className="text-slate-900 font-mono">{p.simbolo}:</strong> {p.nome} <span className="text-slate-400 font-mono">({p.unidade})</span>
                                  </div>
                                ))}
                              </div>
                            </td>

                            <td className="py-2.5 px-4 font-mono font-medium text-slate-600 whitespace-nowrap text-[10.5px]">
                              {child.codigo}
                            </td>
                          </tr>
                        );
                      })}

                      {/* LINHAS FILHAS UNIFICADAS DE SUPERESTRUTURA */}
                      {(formula.id === 'superestrutura_completo' || formula.id.startsWith('sup_') || formula.id.startsWith('superestrutura_')) && isExpanded && FORMULAS_FILHAS_SUPERESTRUTURA.map((child) => {
                        const createChildModalItem = (): FormulaBibliotecaItem => ({
                          id: child.codigo,
                          nome: child.nome,
                          categoria: `Superestrutura - ${child.categoria}`,
                          unidadeResultante: child.unidade,
                          descricao: `${child.descricao}. Exemplo Prático: ${child.exemplo}`,
                          equacaoExemplo: child.literal,
                          parametrosRequeridos: child.parametrosList.map(p => ({
                            chave: p.simbolo,
                            nome: p.nome,
                            unidade: p.unidade,
                            padrao: 1
                          })),
                          formatarExpressao: () => ({
                            literal: child.literal,
                            substituicao: `${child.nome} => Exemplo: ${child.exemplo}`,
                            resultado: 1.0
                          })
                        });

                        return (
                          <tr 
                            key={child.id} 
                            onClick={() => setSelectedFormulaModal(createChildModalItem())}
                            className="bg-slate-50/60 hover:bg-indigo-50/30 transition-colors border-b border-slate-100 cursor-pointer"
                          >
                            <td className="py-2.5 px-4 border-r border-slate-200 pl-7">
                              <div className="flex items-center gap-1.5">
                                <span className="text-indigo-500 font-sans font-bold">└─</span>
                                <div>
                                  <div className="font-bold text-slate-800 text-[11.5px]">{child.nome}</div>
                                  <div className="text-[10px] text-slate-500 line-clamp-1">{child.descricao}</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5 px-4 border-r border-slate-200">
                              <span className="px-2 py-0.5 rounded text-[9.5px] font-semibold bg-white border border-slate-200 text-slate-600 uppercase tracking-wider">
                                {child.categoria}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-center border-r border-slate-200 font-mono font-bold text-indigo-700 bg-indigo-50/20">
                              {child.unidade}
                            </td>

                            <td className="py-2.5 px-4 font-mono text-[10.5px] text-slate-800 border-r border-slate-200 bg-slate-50/40">
                              {child.literal}
                            </td>

                            <td className="py-2.5 px-4 border-r border-slate-200 text-slate-700 font-sans text-[10.5px] leading-tight">
                              <div className="space-y-0.5">
                                {child.parametrosList.map((p, pIdx) => (
                                  <div key={pIdx} className="whitespace-nowrap">
                                    <strong className="text-slate-900 font-mono">{p.simbolo}:</strong> {p.nome} <span className="text-slate-400 font-mono">({p.unidade})</span>
                                  </div>
                                ))}
                              </div>
                            </td>

                            <td className="py-2.5 px-4 font-mono font-medium text-slate-600 whitespace-nowrap text-[10.5px]">
                              {child.codigo}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalhes e Simulador da Fórmula */}
      {selectedFormulaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                  {selectedFormulaModal.categoria}
                </span>
                <h3 className="font-bold text-base text-slate-900 mt-1 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-blue-600" />
                  <span>{selectedFormulaModal.nome}</span>
                </h3>
              </div>

              <button
                onClick={() => setSelectedFormulaModal(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              {selectedFormulaModal.descricao}
            </p>

            {/* Renderiza o Croqui Esquemático correspondente */}
            {(selectedFormulaModal.id.includes('sapata') || selectedFormulaModal.categoria.toLowerCase().includes('sapata')) && (
              <CroquiSapata compact />
            )}
            {(selectedFormulaModal.id.includes('baldrame') || selectedFormulaModal.categoria.toLowerCase().includes('baldrame')) && (
              <CroquiVigaBaldrame compact />
            )}
            {(selectedFormulaModal.id.includes('bloco') || selectedFormulaModal.categoria.toLowerCase().includes('bloco')) && (
              <CroquiBloco compact />
            )}
            {(selectedFormulaModal.id.includes('tubulao') || selectedFormulaModal.categoria.toLowerCase().includes('tubulão')) && (
              <CroquiTubulao compact />
            )}
            {(selectedFormulaModal.id.includes('estaca') || selectedFormulaModal.categoria.toLowerCase().includes('estaca')) && (
              <CroquiEstaca compact />
            )}
            {(selectedFormulaModal.id.includes('premoldado') || selectedFormulaModal.categoria.toLowerCase().includes('pré-moldado')) && (
              <CroquiPremoldado />
            )}
            {(selectedFormulaModal.id.includes('piso') || selectedFormulaModal.categoria.toLowerCase().includes('piso')) && (
              <CroquiPisoConcreto />
            )}
            {(selectedFormulaModal.id.includes('drenagem') || selectedFormulaModal.categoria.toLowerCase().includes('drenagem')) && (
              <CroquiDrenagem />
            )}
            {(selectedFormulaModal.id.includes('pit') || selectedFormulaModal.categoria.toLowerCase().includes('reservatório') || selectedFormulaModal.categoria.toLowerCase().includes('pit')) && (
              <CroquiPitsReservatorios />
            )}
            {(selectedFormulaModal.id.includes('superestrutura') || selectedFormulaModal.categoria.toLowerCase().includes('superestrutura')) && (
              <CroquiSuperestrutura />
            )}

            {/* Equação Literal */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Expressão Literal da Fórmula:</label>
              <div className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-xs font-semibold overflow-x-auto shadow-inner">
                {selectedFormulaModal.equacaoExemplo}
              </div>
            </div>

            {/* Simulador Interativo */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Simulador de Teste da Fórmula:</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {(selectedFormulaModal.parametrosRequeridos || []).map((p) => (
                  <div key={p.chave} className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="flex justify-between font-semibold text-slate-700">
                      <span>{p.nome}</span>
                      <span className="text-slate-400 font-mono">({p.unidade})</span>
                    </div>
                    <input
                      type="number"
                      value={calcInputs[p.chave] ?? p.padrao ?? 1}
                      onChange={(e) => {
                        setCalcInputs({
                          ...calcInputs,
                          [p.chave]: parseFloat(e.target.value) || 0
                        });
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-mono font-bold text-right text-slate-900"
                    />
                  </div>
                ))}
              </div>

              {/* Resultado Calculado */}
              {selectedFormulaModal.formatarExpressao && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-xs space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Demonstrativo de Cálculo Substituído:</div>
                  <div className="font-mono font-semibold text-blue-950 text-sm">
                    {selectedFormulaModal.formatarExpressao(calcInputs).substituicao}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedFormulaModal(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
