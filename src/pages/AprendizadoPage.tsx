import React, { useState } from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  Search, 
  Sparkles, 
  Calculator, 
  HardHat, 
  Layers, 
  ChevronRight, 
  Lightbulb, 
  CheckCircle2, 
  FileSpreadsheet, 
  BarChart3, 
  HelpCircle,
  Clock,
  Compass,
  Building2,
  Zap,
  Building,
  Check
} from 'lucide-react';
import { MEP_CHECKLISTS_DATA, type TipologiaMep } from '../data/mepChecklistsData';

interface ArtigoAprendizado {
  id: string;
  categoria: 'sistema' | 'infraestrutura' | 'custos' | 'dicas' | 'mep';
  titulo: string;
  resumo: string;
  tempoLeitura: string;
  nivel: 'Iniciante' | 'Intermediário' | 'Avançado';
  icone: React.ElementType;
  conteudo: {
    introducao: string;
    passos?: string[];
    dicaOuro?: string;
    exemploPratico?: string;
  };
}

const CATALOGO_ARTIGOS: ArtigoAprendizado[] = [
  {
    id: 'art-1',
    categoria: 'sistema',
    titulo: 'Como Utilizar a Central de Fórmulas e Memoriais de Cálculo',
    resumo: 'Aprenda a vincular equações literais, parâmetros geométricos e variáveis numéricas diretamente às composições de custo do orçamento.',
    tempoLeitura: '4 min',
    nivel: 'Iniciante',
    icone: Calculator,
    conteudo: {
      introducao: 'A Central de Fórmulas permite que o orçamentista deixe de calcular quantidades manualmente em planilhas externas. Ao vincular uma fórmula a um item do memorial, o sistema calcula dinamicamente os quantitativos e mantém a memória de cálculo 100% auditável.',
      passos: [
        'Acesse a aba "Cálculos Quantitativos" no menu principal.',
        'Clique sobre a quantidade de um item do memorial para abrir a janela "Vincular & Calcular Fórmula".',
        'Selecione a fórmula desejada no catálogo (ex: Viga Baldrame, Sapata Isolada, Blocos, Tubulões ou Estacas).',
        'Preencha a geometria do elemento (largura, altura, comprimento, cotas de solo e arrasamento).',
        'O sistema substituirá os valores e atualizará automaticamente a quantidade final no memorial.'
      ],
      dicaOuro: 'Se você alterar manualmente a quantidade de um item vinculado, o sistema desvinculará a fórmula de forma segura para preservar a integridade do seu cálculo.',
      exemploPratico: 'Para 10 Sapatas Isoladas (1,50x1,50m com H1=0,30m e H2=0,30m), o sistema calcula automaticamente 9,75 m³ de Concreto e 12,00 m² de Fôrma Inclinada.'
    }
  },
  {
    id: 'art-2',
    categoria: 'infraestrutura',
    titulo: 'Dimensionamento de Blocos de Fundação (3 Níveis)',
    resumo: 'Guia completo para orçar Blocos de Fundação (Pilares Moldados, 3 Estacas, Pilares Pré-Moldados com Cálice e 3 Estacas Pré).',
    tempoLeitura: '6 min',
    nivel: 'Intermediário',
    icone: Building2,
    conteudo: {
      introducao: 'Os blocos de fundação requerem atenção especial para desconto de cavidades internas (cálice de encaixe de pilares pré-moldados) e acréscimo de fôrmas internas de colarinho.',
      passos: [
        'Na lista de fórmulas, selecione "Blocos de Fundação".',
        'Escolha o Tipo de Bloco desejado (1=Moldado, 2=3Estacas, 3=Pré-Moldado Cálice, 4=3Estacas Pré).',
        'Informe as dimensões principais A, B, H1 (rodapé) e H2 (tronco piramidal).',
        'Caso utilize bloco pré-moldado, o sistema descontará a boca a x b x h do cálice no volume de concreto e adicionará a fôrma interna.',
        'Visualize o Croqui Esquemático CAD na tela para conferir o comportamento das cotas em tempo real.'
      ],
      dicaOuro: 'Lembre-se de configurar a taxa de armação (kg/m³) no painel global para calcular automaticamente a massa de aço CA-50/60 necessária.',
      exemploPratico: 'Em um Bloco Cálice (1,80x1,80m x H=0,90m com boca 0,60x0,60x0,60m), o volume líquido de concreto usinado é V = 2,70 m³ - 0,22 m³ = 2,48 m³ por bloco.'
    }
  },
  {
    id: 'art-3',
    categoria: 'infraestrutura',
    titulo: 'Cálculo de Estações / Estacas de Fundação e Bota-fora',
    resumo: 'Como dimensionar perfurações, volumes úteis com perda, armação e bota-fora de terraplenagem para estacas profundas.',
    tempoLeitura: '5 min',
    nivel: 'Intermediário',
    icone: HardHat,
    conteudo: {
      introducao: 'Estacas (Hélice Contínua, Escavadas, Pré-Moldadas, Raiz e Perfis Metálicos) possuem comprimentos distintos: Comprimento Total (perfuração) e Comprimento Útil (concretagem pós-arrasamento).',
      passos: [
        'Informe a Cota Solo (superfície do terreno) e a Cota Arrasamento (topo útil da estaca).',
        'Informe a Cota Apoio (fundo do poço perfurado).',
        'O sistema calcula a Perfuração Total (Cota Solo - Cota Apoio) e a Concretagem Útil (Cota Arrasamento - Cota Apoio).',
        'Configure o percentual de perda de concreto/argamassa (padrão 20%) e a taxa de empolamento do solo escavado (padrão 30%).'
      ],
      dicaOuro: 'O volume de bota-fora deve considerar o diâmetro da estaca multiplicado pelo Comprimento Total de perfuração com o fator de empolamento aplicado.',
      exemploPratico: 'Estaca Ø40cm com Solo (0,00m), Arrasamento (-1,00m) e Apoio (-12,00m): Perfuração = 12,00 m (1,51 m³ escavado). Concreto útil c/ perda = 1,66 m³.'
    }
  },
  {
    id: 'art-4',
    categoria: 'custos',
    titulo: 'Distribuição de Equipe e Produtividade da Mão de Obra',
    resumo: 'Configuração correta da carga horária (1h a 24h) e alocação de oficiais e ajudantes no orçamento.',
    tempoLeitura: '3 min',
    nivel: 'Iniciante',
    icone: Layers,
    conteudo: {
      introducao: 'A aba de Distribuição de Equipes permite dimensionar a quantidade de carpinteiros, pedreiros, armadores e ajudantes necessários para cumprir o cronograma do orçamento.',
      passos: [
        'No módulo de Cálculos, acesse a aba "Distribuição de Equipe".',
        'Insira os cargos da equipe e atribua a Carga Horária permitida (de 1h a 24h por dia).',
        'Defina a quantidade de oficiais e ajudantes por tipo de serviço.',
        'O sistema calculará o custo total homem-hora (HH) e multiplicará pelas composições do memorial.'
      ],
      dicaOuro: 'Mantenha a proporção padrão de 1 Oficial para 1 ou 2 Ajudantes para garantir índices realistas de produtividade no canteiro de obras.'
    }
  },
  {
    id: 'art-5',
    categoria: 'dicas',
    titulo: 'Boas Práticas: Margem de Perda e Empolamento de Solos',
    resumo: 'Evite prejuízos na obra aplicando taxas precisas de empolamento, lastro magro e perdas de insumos.',
    tempoLeitura: '5 min',
    nivel: 'Avançado',
    icone: Lightbulb,
    conteudo: {
      introducao: 'Pequenas variações na taxa de empolamento de solos ou no consumo de aço por metro cúbico podem impactar significativamente a margem de lucro de uma empreitada.',
      passos: [
        'Solos Argilosos: Empolamento entre 25% e 35%. Solos Arenosos: 15% a 20%.',
        'Lastro Magro de Regularização: Utilize espessura mínima de 5 cm (0,05m) sob sapatas, blocos e tubulões.',
        'Folga de Vala para Fôrmas: Considere folga perimétrica de 0,50m em cada face para circulação e travamento dos painéis de madeira.',
        'Taxas Médias de Armação: Vigas Baldrames (~90 kg/m³), Sapatas (~80 kg/m³), Blocos (~90-110 kg/m³), Estacas (~50-70 kg/m³).'
      ],
      dicaOuro: 'Sempre confira no memorial se as cotas de arrasamento estão abaixo do nível de solo existente antes de aprovar a medição de escavação.'
    }
  },
  {
    id: 'art-6',
    categoria: 'custos',
    titulo: 'Composição de BDI (Benefícios e Despesas Indiretas)',
    resumo: 'Como estruturar a taxa de BDI adequada sobre custos diretos de materiais e mão de obra.',
    tempoLeitura: '4 min',
    nivel: 'Avançado',
    icone: BarChart3,
    conteudo: {
      introducao: 'O BDI é o coeficiente aplicado sobre os custos diretos para cobrir despesas indiretas (administração central, seguros, riscos, tributos) e garantir a margem de lucro operacional.',
      passos: [
        'Administração Central (AC): 3.0% a 5.5%.',
        'Seguros e Garantias (S+G): 0.8% a 1.2%.',
        'Riscos e Imprevistos (R): 0.9% a 1.5%.',
        'Despesas Financeiras (DF): 1.0% a 1.5%.',
        'Margem de Lucro Bruto (L): 6.0% a 10.0%.',
        'Tributos (PIS/COFINS/ISS): Conforme regime tributário do orçamento.'
      ],
      dicaOuro: 'Utilize a fórmula oficial do acórdão do TCU para calcular o BDI sem distorções tributárias.'
    }
  },
  {
    id: 'art-7',
    categoria: 'mep',
    titulo: 'Guia & Checklist Completo de Instalações MEP + Apoio Civil Associado',
    resumo: 'Matriz detalhada de verificação para Instalações Elétricas, Hidráulicas, HVAC, Sistemas Especiais e Utilidades com todas as interfaces de Apoio Civil por tipologia (Hospital, Industrial, Comercial, Hotel, Shopping).',
    tempoLeitura: '8 min',
    nivel: 'Avançado',
    icone: Zap,
    conteudo: {
      introducao: 'Em orçamentos de engenharia, falhas de escopo em instalações MEP ocorrem frequentemente no esquecimento de equipamentos críticos de cotação direta ou nos serviços de Apoio Civil Associado (bases para geradores/trafos, abertura e envelopamento de valas, rasgos em paredes, furos em lajes/vigas e caixas de passagem). Este guia consolida o checklist paramétrico BRP para 5 grandes tipologias de obras.',
      passos: [
        'Selecione a Tipologia da Obra no painel interativo abaixo (Hospitalar, Industrial, Comercial, Hotelaria ou Shopping Centers).',
        'Verifique os itens marcados com asterisco (*): são equipamentos principais que exigem cotação direta de fornecedor (GMG, Trafo, QGBT, Reservatórios, Bombas, Chiller/VRF).',
        'Inclua sempre no orçamento o Apoio Civil Associado vinculado a cada disciplina para evitar aditivos durante a execução da obra.',
        'Cheque se os quadros elétricos exigem certificação TTA/PTTA e se os sistemas de combate a incêndio (Hidrantes/Sprinklers) exigem norma FM Global.'
      ],
      dicaOuro: 'Nunca orce barramentos blindados, cabines primárias ou chilled water sem mapear furos em vigas/lajes, caixas de passagem e abrigos/bases de concreto associados. O apoio civil responde por 5% a 12% do custo total da instalação MEP.'
    }
  }
];

export default function AprendizadoPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<'todas' | 'sistema' | 'infraestrutura' | 'custos' | 'dicas' | 'mep'>('todas');
  const [artigoSelecionado, setArtigoSelecionado] = useState<ArtigoAprendizado | null>(null);
  const [tipologiaMepAtiva, setTipologiaMepAtiva] = useState<TipologiaMep>('Hospital');

  const artigosFiltrados = CATALOGO_ARTIGOS.filter(art => {
    const matchCat = categoriaAtiva === 'todas' || art.categoria === categoriaAtiva;
    const term = searchTerm.toLowerCase().trim();
    const matchSearch = !term || 
      art.titulo.toLowerCase().includes(term) || 
      art.resumo.toLowerCase().includes(term) ||
      art.conteudo.introducao.toLowerCase().includes(term);
    return matchCat && matchSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* BANNER / HERO SECTION DE APRENDIZADO */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-8 shadow-xl border border-slate-800">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full border border-blue-400/30 text-xs font-semibold uppercase tracking-wider">
            <GraduationCap className="w-4 h-4 text-blue-400" />
            <span>Central de Aprendizado BRP Engenharia</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Aprenda a Dominar o Sistema & Boas Práticas de Orçamentação
          </h1>

          <p className="text-slate-300 text-sm leading-relaxed">
            Explore tutoriais passo a passo sobre como cadastrar fórmulas, memoriais e planilhas integradas, além de dicas de engenharia de custos para montagem de orçamentos precisos e lucrativos.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-400">
            <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span>{CATALOGO_ARTIGOS.length} Guias & Aulas</span>
            </span>
            <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Dicas de Engenharia Prática</span>
            </span>
            <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>100% Atualizado</span>
            </span>
          </div>
        </div>
      </div>

      {/* BARRA DE BUSCA E FILTROS DE CATEGORIA */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Campo de Pesquisa */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquise por aulas, tutoriais ou palavras-chave (ex: Tubulão, Fórmulas, Armação, BDI, Bota-fora)..."
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
        </div>

        {/* Botões de Filtro de Categoria */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
          <button
            type="button"
            onClick={() => setCategoriaAtiva('todas')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              categoriaAtiva === 'todas' 
                ? 'bg-blue-600 text-white shadow-2xs' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            📚 Todos os Guias
          </button>
          <button
            type="button"
            onClick={() => setCategoriaAtiva('sistema')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              categoriaAtiva === 'sistema' 
                ? 'bg-blue-600 text-white shadow-2xs' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            💻 Uso do Sistema & Fórmulas
          </button>
          <button
            type="button"
            onClick={() => setCategoriaAtiva('infraestrutura')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              categoriaAtiva === 'infraestrutura' 
                ? 'bg-blue-600 text-white shadow-2xs' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🏗️ Infraestrutura & Fundações
          </button>
          <button
            type="button"
            onClick={() => setCategoriaAtiva('mep')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              categoriaAtiva === 'mep' 
                ? 'bg-blue-600 text-white shadow-2xs' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ⚡ Instalações MEP & Apoio Civil
          </button>
          <button
            type="button"
            onClick={() => setCategoriaAtiva('custos')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              categoriaAtiva === 'custos' 
                ? 'bg-blue-600 text-white shadow-2xs' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            📊 Engenharia de Custos & EAP
          </button>
          <button
            type="button"
            onClick={() => setCategoriaAtiva('dicas')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              categoriaAtiva === 'dicas' 
                ? 'bg-blue-600 text-white shadow-2xs' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            💡 Dicas Práticas de Orçamento
          </button>
        </div>
      </div>

      {/* GRID DE CARDS DE APRENDIZADO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {artigosFiltrados.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
            <HelpCircle className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">Nenhum tutorial encontrado</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Tente buscar por outros termos ou selecione uma categoria diferente no menu acima.
            </p>
          </div>
        ) : (
          artigosFiltrados.map((artigo) => {
            const IconComponent = artigo.icone;

            return (
              <div 
                key={artigo.id}
                onClick={() => setArtigoSelecionado(artigo)}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md uppercase tracking-wider">
                        {artigo.nivel}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {artigo.tempoLeitura}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {artigo.titulo}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-3 leading-relaxed">
                      {artigo.resumo}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
                  <span>Ler Guia Completo</span>
                  <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL DETALHADO DO ARTIGO / GUIA DE APRENDIZADO */}
      {artigoSelecionado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            
            {/* Header Modal */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div className="space-y-1 pr-4">
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold uppercase tracking-wider border border-blue-200">
                  {artigoSelecionado.nivel} • Leitura {artigoSelecionado.tempoLeitura}
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600 shrink-0" />
                  <span>{artigoSelecionado.titulo}</span>
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setArtigoSelecionado(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo Principal */}
            <div className="space-y-5 text-xs text-slate-700 leading-relaxed font-sans">
              
              {/* Introdução */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-slate-800 text-xs leading-relaxed">
                <p className="font-medium">{artigoSelecionado.conteudo.introducao}</p>
              </div>

              {/* Passo a Passo */}
              {artigoSelecionado.conteudo.passos && artigoSelecionado.conteudo.passos.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-blue-600" />
                    <span>Passo a Passo Recomendado:</span>
                  </h4>
                  <ul className="space-y-2 pl-2">
                    {artigoSelecionado.conteudo.passos.map((passo, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                          {pIdx + 1}
                        </span>
                        <span className="font-medium text-slate-800">{passo}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Exemplo Prático Numerico */}
              {artigoSelecionado.conteudo.exemploPratico && (
                <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 text-emerald-950 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Exemplo Prático de Aplicação:</span>
                  </span>
                  <p className="font-mono text-xs font-semibold">{artigoSelecionado.conteudo.exemploPratico}</p>
                </div>
              )}

              {/* Dica de Ouro BRP */}
              {artigoSelecionado.conteudo.dicaOuro && (
                <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 text-amber-950 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                    <Lightbulb className="w-4 h-4 text-amber-600" />
                    <span>Dica de Ouro BRP Engenharia:</span>
                  </span>
                  <p className="font-medium text-xs leading-relaxed">{artigoSelecionado.conteudo.dicaOuro}</p>
                </div>
              )}

              {/* VISUALIZADOR DE TABELA INTERATIVA MEP (SE ARTIGO 7) */}
              {artigoSelecionado.id === 'art-7' && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-blue-600" />
                      <span>Selecione a Tipologia da Edificação:</span>
                    </h4>
                    <span className="text-[10px] text-slate-500 font-medium">
                      * Asterisco = Cotação direta de fornecedor
                    </span>
                  </div>

                  {/* Seletor de Tipologias */}
                  <div className="flex flex-wrap gap-2">
                    {(['Hospital', 'Industrial', 'Comercial', 'Hotel', 'Shopping'] as TipologiaMep[]).map((tip) => {
                      const count = MEP_CHECKLISTS_DATA[tip]?.length || 0;
                      const isActive = tipologiaMepAtiva === tip;
                      return (
                        <button
                          key={tip}
                          type="button"
                          onClick={() => setTipologiaMepAtiva(tip)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                            isActive
                              ? 'bg-slate-900 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <span>{tip === 'Hospital' ? '🏥 Hospitalar' : tip === 'Industrial' ? '🏭 Industrial' : tip === 'Comercial' ? '🏢 Comercial' : tip === 'Hotel' ? '🏨 Hotelaria' : '🛍️ Shopping'}</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Tabela de Levantamento de Instalações & Apoio Civil */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    <div className="max-h-[380px] overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-700 uppercase">
                          <tr>
                            <th className="py-2.5 px-3 border-r border-slate-200">Disciplina / Subsistema</th>
                            <th className="py-2.5 px-3 border-r border-slate-200">Equipamento / Infraestrutura MEP</th>
                            <th className="py-2.5 px-3 border-r border-slate-200 text-center w-24">Cotação Direta</th>
                            <th className="py-2.5 px-3 bg-amber-50/60 text-amber-900">Apoio Civil Associado (Obrigatório)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-[11px] font-sans">
                          {MEP_CHECKLISTS_DATA[tipologiaMepAtiva]?.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2 px-3 border-r border-slate-200 font-bold text-slate-800">
                                {item.disciplina}
                                {item.subsistema && (
                                  <div className="text-[10px] text-blue-600 font-normal">{item.subsistema}</div>
                                )}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-200 text-slate-900 font-medium">
                                {item.item || '-'}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-200 text-center">
                                {item.cotacaoDireta ? (
                                  <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    ★ Direta (*)
                                  </span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-slate-800 bg-amber-50/20 font-medium">
                                {item.apoioCivil ? (
                                  <span className="flex items-center gap-1 text-slate-900 font-semibold">
                                    <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>{item.apoioCivil}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-normal">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setArtigoSelecionado(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-2xs"
              >
                Concluir Leitura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
