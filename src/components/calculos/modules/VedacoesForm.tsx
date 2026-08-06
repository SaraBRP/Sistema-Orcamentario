import React, { useEffect, useState, useCallback, useMemo } from 'react';
import type { CalculoResultado, ResumoInsumoItem, TipoInsumoCategoria } from '../../../types/calculos';
import { 
  Package, CheckCircle2, Trash2, Search, X, 
  Ruler, PieChart as PieChartIcon, Building2, Calculator, Info
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Props {
  parametros: Record<string, any>;
  onChangeParametros: (newParams: Record<string, any>) => void;
  onUpdateResultados: (resultados: CalculoResultado) => void;
}

// CATÁLOGO OFICIAL DE BLOCOS E VEDAÇÕES (PLANILHA MODELO ESQUADRIA-ALVENARIA-ACABAMENTO)
const CATALOGO_VEDACOES: Record<string, { cod: string; desc: string; descarteExcedenteM2: number; consArgamassaM3M2: number }> = {
  'BCV09': { cod: 'BCV09', desc: 'Bloco de Concreto de Vedação de 9cm', descarteExcedenteM2: 2.00, consArgamassaM3M2: 0.015 },
  'BCV14': { cod: 'BCV14', desc: 'Bloco de Concreto de Vedação de 14cm', descarteExcedenteM2: 2.00, consArgamassaM3M2: 0.020 },
  'BCV19': { cod: 'BCV19', desc: 'Bloco de Concreto de Vedação de 19cm', descarteExcedenteM2: 2.00, consArgamassaM3M2: 0.025 },
  'BCE14': { cod: 'BCE14', desc: 'Bloco de Concreto Estrutural de 14cm', descarteExcedenteM2: 2.00, consArgamassaM3M2: 0.020 },
  'BCE19': { cod: 'BCE19', desc: 'Bloco de Concreto Estrutural de 19cm', descarteExcedenteM2: 2.00, consArgamassaM3M2: 0.025 },
  'BCA09': { cod: 'BCA09', desc: 'Bloco de Concreto Aparente de 9cm', descarteExcedenteM2: 2.00, consArgamassaM3M2: 0.015 },
  'BCA14': { cod: 'BCA14', desc: 'Bloco de Concreto Aparente de 14cm', descarteExcedenteM2: 2.00, consArgamassaM3M2: 0.020 },
  'BCA19': { cod: 'BCA19', desc: 'Bloco de Concreto Aparente de 19cm', descarteExcedenteM2: 2.00, consArgamassaM3M2: 0.025 },
  'DWV': { cod: 'DWV', desc: 'Dry-Wall Verde (RU - Áreas Molhadas)', descarteExcedenteM2: 0.00, consArgamassaM3M2: 0.000 },
  'DWB': { cod: 'DWB', desc: 'Dry-Wall Branco (ST - Standard)', descarteExcedenteM2: 0.00, consArgamassaM3M2: 0.000 },
  'DWR': { cod: 'DWR', desc: 'Dry-Wall Rosa (RF - Resistente ao Fogo)', descarteExcedenteM2: 0.00, consArgamassaM3M2: 0.000 },
  'BV': { cod: 'BV', desc: 'Bloco de Vidro Transparente / Colorido', descarteExcedenteM2: 0.00, consArgamassaM3M2: 0.012 },
  'DNEO': { cod: 'DNEO', desc: 'Divisória TS / Neocon (h=1,80m)', descarteExcedenteM2: 0.00, consArgamassaM3M2: 0.000 },
  'DGRA': { cod: 'DGRA', desc: 'Divisória Granito / Mármore (h=1,80m)', descarteExcedenteM2: 0.00, consArgamassaM3M2: 0.000 },
  'EV72': { cod: 'EV72', desc: 'Elemento Vazado (Cobogó 72A)', descarteExcedenteM2: 2.00, consArgamassaM3M2: 0.018 }
};

export const VedacoesForm: React.FC<Props> = ({
  parametros,
  onChangeParametros,
  onUpdateResultados
}) => {
  // Navegação de Sub-Abas da Alvenaria
  const [activeSubTab, setActiveSubTab] = useState<'resumo' | 'geometria' | 'memoria' | 'composicao'>('resumo');

  // Tipo de Vedação Selecionado
  const codigoVedacao = parametros.codigoVedacao || 'BCV14';
  const itemVedacaoInfo = CATALOGO_VEDACOES[codigoVedacao] || CATALOGO_VEDACOES['BCV14'];

  // Geometria da Parede
  const comprimentoParedeRaw = parametros.comprimentoParede !== undefined ? String(parametros.comprimentoParede) : '25.0';
  const peDireitoRaw = parametros.peDireito !== undefined ? String(parametros.peDireito) : '3.2';
  const alturaVigaDescontoRaw = parametros.alturaVigaDesconto !== undefined ? String(parametros.alturaVigaDesconto) : '0.4';
  const quantidadeRepeticoesRaw = parametros.quantidadeRepeticoes !== undefined ? String(parametros.quantidadeRepeticoes) : '1';

  // Esquadrias de desconto (até 3 tipos de portas/janelas na parede)
  const qtdEsq1Raw = parametros.qtdEsq1 !== undefined ? String(parametros.qtdEsq1) : '2';
  const largEsq1Raw = parametros.largEsq1 !== undefined ? String(parametros.largEsq1) : '0.9';
  const altEsq1Raw = parametros.altEsq1 !== undefined ? String(parametros.altEsq1) : '2.1';
  const nomeEsq1 = parametros.nomeEsq1 || 'Porta P1-90';

  const qtdEsq2Raw = parametros.qtdEsq2 !== undefined ? String(parametros.qtdEsq2) : '2';
  const largEsq2Raw = parametros.largEsq2 !== undefined ? String(parametros.largEsq2) : '1.2';
  const altEsq2Raw = parametros.altEsq2 !== undefined ? String(parametros.altEsq2) : '1.5';
  const nomeEsq2 = parametros.nomeEsq2 || 'Janela J1-120';

  const qtdEsq3Raw = parametros.qtdEsq3 !== undefined ? String(parametros.qtdEsq3) : '0';
  const largEsq3Raw = parametros.largEsq3 !== undefined ? String(parametros.largEsq3) : '1.5';
  const altEsq3Raw = parametros.altEsq3 !== undefined ? String(parametros.altEsq3) : '1.2';
  const nomeEsq3 = parametros.nomeEsq3 || 'Janela J2-150';

  // Insumos do Resumo de Alvenaria
  const resumoInsumosState: ResumoInsumoItem[] = parametros.resumoInsumosAlvenaria || [
    { id: '1', codigo: itemVedacaoInfo.cod, descricao: itemVedacaoInfo.desc, tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm²', precoUnitario: 52.00, regraCalculo: 'alvenaria_liquida' },
    { id: '2', codigo: '302', descricao: 'Argamassa industrializada de assentamento 1:3', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm³', precoUnitario: 280.00, regraCalculo: 'argamassa_assentamento' },
    { id: '3', codigo: '310', descricao: 'Chapisco de cimento e areia 1:3 e/t=5mm (ambas as faces)', tipoInsumo: 'Mão de Obra', fase: 'fabricacao', unidade: 'm²', precoUnitario: 8.50, regraCalculo: 'chapisco' },
    { id: '4', codigo: '320', descricao: 'Emboço/Massa Única de cimento, cal e areia e=20mm', tipoInsumo: 'Mão de Obra', fase: 'fabricacao', unidade: 'm²', precoUnitario: 26.00, regraCalculo: 'emboco_reboco' },
    { id: '5', codigo: '722', descricao: 'Verga e contraverga pré-moldada em concreto armado com aço CA-50', tipoInsumo: 'Material', fase: 'fabricacao', unidade: 'm', precoUnitario: 18.00, regraCalculo: 'verga_contraverga' },
    { id: '6', codigo: '292', descricao: 'Pintura látex acrílica premium 2 demãos sobre emboço', tipoInsumo: 'Mão de Obra', fase: 'fabricacao', unidade: 'm²', precoUnitario: 14.00, regraCalculo: 'pintura_latex' }
  ];

  // Modal de Busca no Banco Próprio
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Conversões numéricas
  const comprimentoParede = parseFloat(comprimentoParedeRaw.replace(',', '.')) || 0;
  const peDireito = parseFloat(peDireitoRaw.replace(',', '.')) || 0;
  const alturaVigaDesconto = parseFloat(alturaVigaDescontoRaw.replace(',', '.')) || 0;
  const quantidadeRepeticoes = parseInt(quantidadeRepeticoesRaw, 10) || 1;

  const qtdEsq1 = parseInt(qtdEsq1Raw, 10) || 0;
  const largEsq1 = parseFloat(largEsq1Raw.replace(',', '.')) || 0;
  const altEsq1 = parseFloat(altEsq1Raw.replace(',', '.')) || 0;

  const qtdEsq2 = parseInt(qtdEsq2Raw, 10) || 0;
  const largEsq2 = parseFloat(largEsq2Raw.replace(',', '.')) || 0;
  const altEsq2 = parseFloat(altEsq2Raw.replace(',', '.')) || 0;

  const qtdEsq3 = parseInt(qtdEsq3Raw, 10) || 0;
  const largEsq3 = parseFloat(largEsq3Raw.replace(',', '.')) || 0;
  const altEsq3 = parseFloat(altEsq3Raw.replace(',', '.')) || 0;

  // --------------------------------------------------------------------------
  // CÁLCULOS FÍSICO-GEOMÉTRICOS E REGRA TCPO 13 (DESCONTO DE VÃOS)
  // --------------------------------------------------------------------------
  const alturaEfetivaParede = Math.max(0.2, peDireito - alturaVigaDesconto);
  const areaBrutaParedeUnitaria = comprimentoParede * alturaEfetivaParede;
  const areaBrutaParedeTotal = areaBrutaParedeUnitaria * quantidadeRepeticoes;

  // Regra de Desconto TCPO 13:
  // Se for Alvenaria de Bloco (descarteExcedenteM2 = 2.00m²): Descontar apenas o que exceder 2.00 m² por vão.
  // Se for Drywall / Vidro / Divisória (descarteExcedenteM2 = 0.00m²): Descontar a área efetiva integral.
  const limiteDescontoM2 = itemVedacaoInfo.descarteExcedenteM2;

  const calcularDescontoVaoUnitario = (larg: number, alt: number) => {
    const areaVao = larg * alt;
    if (areaVao <= 0) return 0;
    if (limiteDescontoM2 > 0) {
      return Math.max(0, areaVao - limiteDescontoM2);
    }
    return areaVao;
  };

  const areaEfetivaVao1 = largEsq1 * altEsq1;
  const descontoVao1Unitario = calcularDescontoVaoUnitario(largEsq1, altEsq1);
  const descontoVao1Total = descontoVao1Unitario * qtdEsq1 * quantidadeRepeticoes;

  const areaEfetivaVao2 = largEsq2 * altEsq2;
  const descontoVao2Unitario = calcularDescontoVaoUnitario(largEsq2, altEsq2);
  const descontoVao2Total = descontoVao2Unitario * qtdEsq2 * quantidadeRepeticoes;

  const areaEfetivaVao3 = largEsq3 * altEsq3;
  const descontoVao3Unitario = calcularDescontoVaoUnitario(largEsq3, altEsq3);
  const descontoVao3Total = descontoVao3Unitario * qtdEsq3 * quantidadeRepeticoes;

  const areaDescontoTotal = descontoVao1Total + descontoVao2Total + descontoVao3Total;
  const areaLiquidaAlvenaria = Math.max(0, Math.round((areaBrutaParedeTotal - areaDescontoTotal) * 100) / 100);

  // Consumos Derivados
  const volArgamassaAssentamentoM3 = Math.round(areaLiquidaAlvenaria * itemVedacaoInfo.consArgamassaM3M2 * 100) / 100;
  const areaRevestimentoDuasFacesM2 = Math.round(areaLiquidaAlvenaria * 2 * 100) / 100;

  // Vergas e Contravergas (Perímetro dos vãos com transpasse de 30cm de cada lado)
  const metragemVergasM = ((largEsq1 > 0 ? (largEsq1 + 0.60) * qtdEsq1 : 0) +
                           (largEsq2 > 0 ? (largEsq2 + 0.60) * qtdEsq2 : 0) +
                           (largEsq3 > 0 ? (largEsq3 + 0.60) * qtdEsq3 : 0)) * quantidadeRepeticoes;

  // Busca no Banco Próprio BRP
  const fetchBancoItems = useCallback(async (query: string = '') => {
    setLoadingSearch(true);
    try {
      let insQuery = supabase
        .schema('engenharia')
        .from('insumos')
        .select('*')
        .in('fonte_preco', ['Cotação', 'Histórico', 'BRP', 'Próprio', 'PROPRIO', 'Proprio']);

      let compQuery = supabase
        .schema('engenharia')
        .from('composicoes')
        .select('*')
        .or('fonte.eq.Próprio,fonte.eq.PROPRIO,fonte.eq.BRP,fonte.eq.Cotação,fonte.eq.Histórico,fonte.is.null');

      if (query.trim().length >= 2) {
        insQuery = insQuery.or(`descricao.ilike.%${query.trim()}%,codigo.ilike.%${query.trim()}%`);
        compQuery = compQuery.or(`descricao.ilike.%${query.trim()}%,codigo.ilike.%${query.trim()}%`);
      }

      const { data: insData } = await insQuery.limit(25);
      const { data: compData } = await compQuery.limit(25);

      const combined = [
        ...(insData || []).map(i => ({ ...i, tipoItem: 'Insumo' })),
        ...(compData || []).map(c => ({ ...c, tipoItem: 'Composição' }))
      ];
      setSearchResults(combined);
    } catch (err) {
      console.error('Erro na busca do banco próprio:', err);
    } finally {
      setLoadingSearch(false);
    }
  }, []);

  useEffect(() => {
    if (isSearchModalOpen) {
      fetchBancoItems(searchTerm);
    }
  }, [isSearchModalOpen, fetchBancoItems, searchTerm]);

  // Helper para determinar a regra de cálculo matemática de cada insumo de Alvenaria
  const calcularCoeficienteAlvenaria = (item: ResumoInsumoItem): number => {
    const regra = item.regraCalculo;
    const desc = item.descricao.toLowerCase();

    if (regra === 'alvenaria_liquida' || desc.includes('bloco') || desc.includes('dry') || desc.includes('divisória')) {
      return areaLiquidaAlvenaria;
    }
    if (regra === 'argamassa_assentamento' || desc.includes('argamassa')) {
      return volArgamassaAssentamentoM3;
    }
    if (regra === 'chapisco' || desc.includes('chapisco')) {
      return areaRevestimentoDuasFacesM2;
    }
    if (regra === 'emboco_reboco' || desc.includes('emboço') || desc.includes('reboco') || desc.includes('massa única')) {
      return areaRevestimentoDuasFacesM2;
    }
    if (regra === 'verga_contraverga' || desc.includes('verga')) {
      return metragemVergasM;
    }
    if (regra === 'pintura_latex' || desc.includes('pintura') || desc.includes('látex') || desc.includes('acrílica')) {
      return areaRevestimentoDuasFacesM2;
    }

    return item.taxaProdutividade ?? 1.0;
  };

  // Consolidação Financeira
  const calcularResumoConsolidado = (): ResumoInsumoItem[] => {
    return resumoInsumosState.map((item) => {
      const coefUnitario = calcularCoeficienteAlvenaria(item);
      const qtdTotal = coefUnitario;
      const custoTotal = qtdTotal * (item.precoUnitario || 0);

      return {
        ...item,
        quantidadeTotalCalculada: Number(qtdTotal.toFixed(2)),
        coeficienteCalculado: Number(coefUnitario.toFixed(2)),
        custoTotalR$: Number(custoTotal.toFixed(2))
      };
    });
  };

  const resumoCalculadoList = calcularResumoConsolidado();
  const custoTotalAlvenariaR$ = resumoCalculadoList.reduce((acc, i) => acc + (i.custoTotalR$ || 0), 0);
  const custoPorM2AlvenariaR$ = areaLiquidaAlvenaria > 0 ? custoTotalAlvenariaR$ / areaLiquidaAlvenaria : 0;

  // Agrupamento de Gastos para o Gráfico
  const gastosCategorias = useMemo(() => {
    let blocosVedacao = 0;
    let argamassaRevestimento = 0;
    let vergasPintura = 0;

    resumoCalculadoList.forEach(item => {
      const desc = item.descricao.toLowerCase();
      const val = item.custoTotalR$ || 0;

      if (desc.includes('bloco') || desc.includes('dry') || desc.includes('divisória')) {
        blocosVedacao += val;
      } else if (desc.includes('argamassa') || desc.includes('emboço') || desc.includes('chapisco') || desc.includes('reboco')) {
        argamassaRevestimento += val;
      } else {
        vergasPintura += val;
      }
    });

    const total = custoTotalAlvenariaR$ > 0 ? custoTotalAlvenariaR$ : 1;

    return {
      blocosVedacao: Math.round(blocosVedacao * 100) / 100,
      argamassaRevestimento: Math.round(argamassaRevestimento * 100) / 100,
      vergasPintura: Math.round(vergasPintura * 100) / 100,

      percBlocos: Math.round((blocosVedacao / total) * 100),
      percArgamassa: Math.round((argamassaRevestimento / total) * 100),
      percVergasPintura: Math.round((vergasPintura / total) * 100)
    };
  }, [resumoCalculadoList, custoTotalAlvenariaR$]);

  useEffect(() => {
    onUpdateResultados({
      areaLiquidaM2: areaLiquidaAlvenaria,
      comprimentoLinearM: comprimentoParede * quantidadeRepeticoes,
      custoTotalEstimadoR$: Math.round(custoTotalAlvenariaR$ * 100) / 100,

      detalhes: {
        'Elemento de Vedação': `${itemVedacaoInfo.desc} (${itemVedacaoInfo.cod})`,
        'Área Bruta de Parede': `${areaBrutaParedeTotal.toFixed(2)} m² (${quantidadeRepeticoes}x ${comprimentoParede}m × ${alturaEfetivaParede.toFixed(2)}m)`,
        'Regra de Desconto Vãos': itemVedacaoInfo.descarteExcedenteM2 > 0 ? 'TCPO 13 (Descontar apenas o excedente a 2,00 m² por vão)' : 'Área Efetiva Integral (Desconto de 100% dos vãos)',
        'Desconto Computado dos Vãos': `${areaDescontoTotal.toFixed(2)} m²`,
        'Área Líquida de Alvenaria': `${areaLiquidaAlvenaria.toFixed(2)} m²`,
        'Argamassa de Assentamento': `${volArgamassaAssentamentoM3.toFixed(2)} m³ (${itemVedacaoInfo.consArgamassaM3M2} m³/m²)`,
        'Chapisco / Emboço (2 Faces)': `${areaRevestimentoDuasFacesM2.toFixed(2)} m²`,
        'Verga / Contraverga (CA-50)': `${metragemVergasM.toFixed(2)} m`,
        'Custo Total Estimado': `R$ ${custoTotalAlvenariaR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        'Custo por m² Líquido': `R$ ${custoPorM2AlvenariaR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / m²`
      }
    });
  }, [codigoVedacao, itemVedacaoInfo, areaBrutaParedeTotal, quantidadeRepeticoes, comprimentoParede, alturaEfetivaParede, areaDescontoTotal, areaLiquidaAlvenaria, volArgamassaAssentamentoM3, areaRevestimentoDuasFacesM2, metragemVergasM, custoTotalAlvenariaR$, custoPorM2AlvenariaR$]);

  const updateParam = (key: string, val: any) => {
    onChangeParametros({ ...parametros, [key]: val });
  };

  const handleUpdateResumoItem = (id: string, field: keyof ResumoInsumoItem, val: any) => {
    const updated = resumoInsumosState.map(i => i.id === id ? { ...i, [field]: val } : i);
    updateParam('resumoInsumosAlvenaria', updated);
  };

  const handleDeleteResumoItem = (id: string) => {
    const updated = resumoInsumosState.filter(i => i.id !== id);
    updateParam('resumoInsumosAlvenaria', updated);
  };

  const handleSelectSearchResult = (item: any) => {
    const rawTipo = String(item.tipo || item.tipo_insumo || item.tipo_atividade || '').toUpperCase();
    let tipoCat: TipoInsumoCategoria = 'Material';

    if (rawTipo.includes('MÃO DE OBRA') || rawTipo.includes('MAO DE OBRA')) {
      tipoCat = 'Mão de Obra';
    } else {
      tipoCat = 'Material';
    }

    const preco = Number(item.valor ?? item.valor_desonerado ?? item.preco_unitario ?? 0);

    const newItem: ResumoInsumoItem = {
      id: String(Date.now()),
      codigo: item.codigo || '000',
      descricao: item.descricao || item.nome || 'Insumo Selecionado',
      tipoInsumo: tipoCat,
      fase: 'fabricacao',
      taxaProdutividade: 1.0,
      unidadeProdutividade: 'un',
      unidade: item.unidade || 'm²',
      precoUnitario: preco,
      regraCalculo: 'fixo'
    };

    updateParam('resumoInsumosAlvenaria', [...resumoInsumosState, newItem]);
    setIsSearchModalOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="space-y-6">
      {/* HEADER PRINCIPAL DE ALVENARIAS & VEDAÇÕES */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-orange-100 text-orange-700 uppercase tracking-wider">
              Modelo de Precisão "Esquadria-Alvenaria-Acabamento - Modelo.xlsx"
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Calculadora & Orçamento de Alvenarias & Vedações
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cálculo paramétrico de vedações com desconto automático de vãos conforme regra TCPO 13
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-right">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Custo por m² Líquido</span>
            <span className="text-base font-mono font-extrabold text-slate-900">
              R$ {custoPorM2AlvenariaR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-500">/m²</span>
            </span>
          </div>

          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xs text-right min-w-[170px]">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Custo Total Alvenaria</span>
            <span className="text-lg font-mono font-black text-emerald-400">
              R$ {custoTotalAlvenariaR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* BARRA DE SUB-ABAS CONECTADAS */}
      <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('resumo')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'resumo'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          <PieChartIcon className="w-3.5 h-3.5" />
          <span>📊 Dashboard & Custos</span>
        </button>

        <button
          onClick={() => setActiveSubTab('geometria')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'geometria'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>🧱 Geometria & Desconto de Vãos</span>
        </button>

        <button
          onClick={() => setActiveSubTab('memoria')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'memoria'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>📐 Memória de Cálculo Físico</span>
        </button>

        <button
          onClick={() => setActiveSubTab('composicao')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'composicao'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>🛠️ Tabela de Insumos</span>
        </button>
      </div>

      {/* CONTEÚDO DA SUB-ABA 1: DASHBOARD DE RESUMO GERAL */}
      {activeSubTab === 'resumo' && (
        <div className="space-y-5">
          {/* Bento Grid de Gastos */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-slate-700" />
                  Distribuição dos Custos de Alvenaria & Vedações
                </h3>
                <p className="text-xs text-slate-500">Divisão percentual entre Blocos/Placas, Argamassas/Revestimentos e Vergas/Pintura</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-900 inline-block" /> Blocos / Placas ({gastosCategorias.percBlocos}%)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-600 inline-block" /> Argamassa / Revestimento ({gastosCategorias.percArgamassa}%)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" /> Vergas / Pintura ({gastosCategorias.percVergasPintura}%)</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-5 w-full bg-slate-100 rounded-xl overflow-hidden flex shadow-inner">
                <div style={{ width: `${gastosCategorias.percBlocos}%` }} className="bg-slate-900 h-full transition-all duration-500" />
                <div style={{ width: `${gastosCategorias.percArgamassa}%` }} className="bg-slate-600 h-full transition-all duration-500" />
                <div style={{ width: `${gastosCategorias.percVergasPintura}%` }} className="bg-emerald-600 h-full transition-all duration-500" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">1. Elemento de Vedação (Blocos/Placas)</span>
                  <span className="text-sm font-mono font-extrabold text-slate-900 block">
                    {gastosCategorias.blocosVedacao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">{gastosCategorias.percBlocos}% do total</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">2. Argamassa & Revestimentos</span>
                  <span className="text-sm font-mono font-extrabold text-slate-900 block">
                    {gastosCategorias.argamassaRevestimento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">{gastosCategorias.percArgamassa}% do total</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">3. Vergas, Contravergas & Pintura</span>
                  <span className="text-sm font-mono font-extrabold text-slate-900 block">
                    {gastosCategorias.vergasPintura.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">{gastosCategorias.percVergasPintura}% do total</span>
                </div>
              </div>
            </div>
          </div>

          {/* Resumo Físico Consolidado */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Área Bruta de Parede</span>
              <span className="text-lg font-mono font-black text-slate-900 block">{areaBrutaParedeTotal.toFixed(2)} m²</span>
              <span className="text-[10px] text-slate-500 font-medium">{quantidadeRepeticoes}x paredes ({comprimentoParede}m × {alturaEfetivaParede.toFixed(2)}m)</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Desconto de Vãos</span>
              <span className="text-lg font-mono font-black text-slate-900 block">{areaDescontoTotal.toFixed(2)} m²</span>
              <span className="text-[10px] text-slate-500 font-medium">Regra: {itemVedacaoInfo.descarteExcedenteM2 > 0 ? 'Excedente a 2m²' : 'Efetiva 100%'}</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Área Líquida de Alvenaria</span>
              <span className="text-lg font-mono font-black text-emerald-600 block">{areaLiquidaAlvenaria.toFixed(2)} m²</span>
              <span className="text-[10px] text-slate-500 font-medium">Qtd efetiva a executar</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Argamassa de Assentamento</span>
              <span className="text-lg font-mono font-black text-slate-900 block">{volArgamassaAssentamentoM3.toFixed(2)} m³</span>
              <span className="text-[10px] text-slate-500 font-medium">Taxa: {itemVedacaoInfo.consArgamassaM3M2} m³/m²</span>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA 2: GEOMETRIA & DESCONTO DE VÃOS */}
      {activeSubTab === 'geometria' && (
        <div className="space-y-5">
          {/* Quadro 1: Seleção do Elemento de Vedação */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-700" />
                Seleção do Elemento de Vedação (Tabela Oficial da Planilha Modelo)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Código & Sistema de Vedação</label>
                <select
                  value={codigoVedacao}
                  onChange={(e) => updateParam('codigoVedacao', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-slate-700 shadow-2xs cursor-pointer text-xs"
                >
                  {Object.entries(CATALOGO_VEDACOES).map(([key, v]) => (
                    <option key={key} value={key}>
                      [{v.cod}] {v.desc} ({v.descarteExcedenteM2 > 0 ? `TCPO 13: Descontar > ${v.descarteExcedenteM2}m²` : 'Desconto 100% Efetivo'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Quantidade de Repetições / Paredes</label>
                <input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={quantidadeRepeticoesRaw}
                  onChange={(e) => updateParam('quantidadeRepeticoes', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Quadro 2: Dimensões da Parede */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Ruler className="w-4 h-4 text-slate-700" />
                Dimensões do Vão Bruto da Parede
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Comprimento da Parede (m)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="25.0"
                  value={comprimentoParedeRaw}
                  onChange={(e) => updateParam('comprimentoParede', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pé-Direito H (m)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="3.2"
                  value={peDireitoRaw}
                  onChange={(e) => updateParam('peDireito', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Altura de Viga Descontar (m)</label>
                <input
                  type="number"
                  step="0.05"
                  placeholder="0.4"
                  value={alturaVigaDescontoRaw}
                  onChange={(e) => updateParam('alturaVigaDesconto', e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 font-extrabold outline-none focus:border-slate-700 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Quadro 3: Vãos de Esquadria para Desconto */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                Desconto de Vãos de Esquadrias (Critério TCPO 13)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                {itemVedacaoInfo.descarteExcedenteM2 > 0 ? 'Descontar > 2,00m² por vão' : 'Desconto 100% Efetivo'}
              </span>
            </div>

            <div className="space-y-3">
              {/* Esquadria 1 */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs items-end">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Identificação 1</label>
                  <input
                    type="text"
                    value={nomeEsq1}
                    onChange={(e) => updateParam('nomeEsq1', e.target.value)}
                    className="w-full h-8 px-2.5 border border-slate-300 rounded-lg bg-white font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Qtd Vãos</label>
                  <input
                    type="number"
                    min="0"
                    value={qtdEsq1Raw}
                    onChange={(e) => updateParam('qtdEsq1', e.target.value)}
                    className="w-full h-8 px-2.5 border border-slate-300 rounded-lg bg-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Largura × Altura (m)</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.05"
                      value={largEsq1Raw}
                      onChange={(e) => updateParam('largEsq1', e.target.value)}
                      className="w-full h-8 px-2 border border-slate-300 rounded-lg bg-white font-mono"
                    />
                    <span className="font-bold text-slate-400">×</span>
                    <input
                      type="number"
                      step="0.05"
                      value={altEsq1Raw}
                      onChange={(e) => updateParam('altEsq1', e.target.value)}
                      className="w-full h-8 px-2 border border-slate-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200 font-mono text-right">
                  <span className="text-[10px] text-slate-400 block">Área Vão: {areaEfetivaVao1.toFixed(2)}m²</span>
                  <span className="text-xs font-black text-blue-600">Desc: {descontoVao1Total.toFixed(2)} m²</span>
                </div>
              </div>

              {/* Esquadria 2 */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs items-end">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Identificação 2</label>
                  <input
                    type="text"
                    value={nomeEsq2}
                    onChange={(e) => updateParam('nomeEsq2', e.target.value)}
                    className="w-full h-8 px-2.5 border border-slate-300 rounded-lg bg-white font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Qtd Vãos</label>
                  <input
                    type="number"
                    min="0"
                    value={qtdEsq2Raw}
                    onChange={(e) => updateParam('qtdEsq2', e.target.value)}
                    className="w-full h-8 px-2.5 border border-slate-300 rounded-lg bg-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Largura × Altura (m)</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.05"
                      value={largEsq2Raw}
                      onChange={(e) => updateParam('largEsq2', e.target.value)}
                      className="w-full h-8 px-2 border border-slate-300 rounded-lg bg-white font-mono"
                    />
                    <span className="font-bold text-slate-400">×</span>
                    <input
                      type="number"
                      step="0.05"
                      value={altEsq2Raw}
                      onChange={(e) => updateParam('altEsq2', e.target.value)}
                      className="w-full h-8 px-2 border border-slate-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200 font-mono text-right">
                  <span className="text-[10px] text-slate-400 block">Área Vão: {areaEfetivaVao2.toFixed(2)}m²</span>
                  <span className="text-xs font-black text-blue-600">Desc: {descontoVao2Total.toFixed(2)} m²</span>
                </div>
              </div>

              {/* Esquadria 3 */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs items-end">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Identificação 3</label>
                  <input
                    type="text"
                    value={nomeEsq3}
                    onChange={(e) => updateParam('nomeEsq3', e.target.value)}
                    className="w-full h-8 px-2.5 border border-slate-300 rounded-lg bg-white font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Qtd Vãos</label>
                  <input
                    type="number"
                    min="0"
                    value={qtdEsq3Raw}
                    onChange={(e) => updateParam('qtdEsq3', e.target.value)}
                    className="w-full h-8 px-2.5 border border-slate-300 rounded-lg bg-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Largura × Altura (m)</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.05"
                      value={largEsq3Raw}
                      onChange={(e) => updateParam('largEsq3', e.target.value)}
                      className="w-full h-8 px-2 border border-slate-300 rounded-lg bg-white font-mono"
                    />
                    <span className="font-bold text-slate-400">×</span>
                    <input
                      type="number"
                      step="0.05"
                      value={altEsq3Raw}
                      onChange={(e) => updateParam('altEsq3', e.target.value)}
                      className="w-full h-8 px-2 border border-slate-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200 font-mono text-right">
                  <span className="text-[10px] text-slate-400 block">Área Vão: {areaEfetivaVao3.toFixed(2)}m²</span>
                  <span className="text-xs font-black text-blue-600">Desc: {descontoVao3Total.toFixed(2)} m²</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA 3: MEMÓRIA DE CÁLCULO FÍSICO */}
      {activeSubTab === 'memoria' && (
        <div className="space-y-5">
          <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 shadow-lg border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                <Calculator className="w-4 h-4 text-orange-400" />
                Memória de Cálculo Físico de Alvenarias (Modelagem TCPO 13)
              </h3>
              <span className="text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Aba "Memo_Alv"
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block border-b border-slate-700 pb-1">1. Área Bruta de Parede</span>
                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  <div className="flex justify-between"><span>Comprimento:</span><span className="font-bold text-white">{comprimentoParede} m</span></div>
                  <div className="flex justify-between"><span>Altura Efetiva:</span><span className="font-bold text-white">{alturaEfetivaParede.toFixed(2)} m</span></div>
                  <div className="flex justify-between"><span>Paredes / Repetições:</span><span className="font-bold text-white">{quantidadeRepeticoes}x</span></div>
                  <div className="flex justify-between pt-1 border-t border-slate-700"><span>Área Bruta Total:</span><span className="font-bold text-blue-300">{areaBrutaParedeTotal.toFixed(2)} m²</span></div>
                </div>
              </div>

              <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block border-b border-slate-700 pb-1">2. Regra de Desconto Vãos</span>
                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  <div className="flex justify-between"><span>Tipo de Alvenaria:</span><span className="font-bold text-white">{itemVedacaoInfo.cod}</span></div>
                  <div className="flex justify-between"><span>Limite Isenção TCPO:</span><span className="font-bold text-white">{itemVedacaoInfo.descarteExcedenteM2 > 0 ? '2,00 m²' : '0,00 m² (100%)'}</span></div>
                  <div className="flex justify-between"><span>Desconto Vãos:</span><span className="font-bold text-amber-400">-{areaDescontoTotal.toFixed(2)} m²</span></div>
                  <div className="flex justify-between pt-1 border-t border-slate-700"><span>Área Líquida:</span><span className="font-bold text-emerald-400">{areaLiquidaAlvenaria.toFixed(2)} m²</span></div>
                </div>
              </div>

              <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block border-b border-slate-700 pb-1">3. Insumos Derivados</span>
                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  <div className="flex justify-between"><span>Argamassa Assent.:</span><span className="font-bold text-white">{volArgamassaAssentamentoM3.toFixed(2)} m³</span></div>
                  <div className="flex justify-between"><span>Emboço/Chapisco (2 faces):</span><span className="font-bold text-white">{areaRevestimentoDuasFacesM2.toFixed(2)} m²</span></div>
                  <div className="flex justify-between"><span>Vergas e Contravergas:</span><span className="font-bold text-white">{metragemVergasM.toFixed(2)} m</span></div>
                  <div className="flex justify-between pt-1 border-t border-slate-700"><span>Pintura Líquida (2 faces):</span><span className="font-bold text-blue-300">{areaRevestimentoDuasFacesM2.toFixed(2)} m²</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA 4: TABELA DE INSUMOS */}
      {(activeSubTab === 'composicao' || activeSubTab === 'resumo') && (
        <div className="lg:col-span-12 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs space-y-0">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-700" />
                Lista Quantitativa de Compras e Serviços de Alvenaria
              </h3>
              <p className="text-xs text-slate-500">Insumos conectados com atribuição de Regra Paramétrica de Cálculo para recálculo financeiro dinâmico</p>
            </div>

            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>+ Adicionar do Banco Próprio</span>
            </button>
          </div>

          <div className="p-4 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3 w-20">Código</th>
                  <th className="py-2.5 px-3">Descrição do Item de Alvenaria</th>
                  <th className="py-2.5 px-3 w-48">Regra Paramétrica</th>
                  <th className="py-2.5 px-3 w-16 text-center">UN</th>
                  <th className="py-2.5 px-3 text-right w-24">Qtd Total</th>
                  <th className="py-2.5 px-3 text-right w-32">Preço Unit. (R$)</th>
                  <th className="py-2.5 px-3 text-right w-32">Custo Total (R$)</th>
                  <th className="py-2.5 px-3 text-center w-12">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resumoCalculadoList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{item.codigo}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{item.descricao}</td>
                    
                    {/* SELETOR DE REGRA PARAMÉTRICA */}
                    <td className="py-2.5 px-3">
                      <select
                        value={item.regraCalculo || 'fixo'}
                        onChange={(e) => handleUpdateResumoItem(item.id, 'regraCalculo', e.target.value)}
                        className="w-full h-7 px-2 py-0.5 border border-slate-300 rounded bg-white text-[11px] font-bold text-slate-700 outline-none focus:border-slate-700 cursor-pointer"
                      >
                        <option value="alvenaria_liquida">🧱 Alvenaria Líquida (m²)</option>
                        <option value="argamassa_assentamento">🧪 Argamassa Assentamento (m³)</option>
                        <option value="chapisco">🧱 Chapisco (2 Faces m²)</option>
                        <option value="emboco_reboco">🧱 Emboço / Reboco (2 Faces m²)</option>
                        <option value="verga_contraverga">🦯 Verga e Contraverga (m)</option>
                        <option value="pintura_latex">🎨 Pintura Látex/Acrílica (2 Faces m²)</option>
                        <option value="fixo">✏️ Coeficiente Fixo / Manual</option>
                      </select>
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-600">{item.unidade}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                      {item.quantidadeTotalCalculada?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={item.precoUnitario || 0}
                        onChange={(e) => handleUpdateResumoItem(item.id, 'precoUnitario', parseFloat(e.target.value) || 0)}
                        className="w-24 h-7 text-right px-2 border border-slate-300 rounded bg-white font-mono font-bold text-slate-900 outline-none focus:border-slate-700"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      R$ {item.custoTotalR$?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => handleDeleteResumoItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                        title="Excluir item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-t border-slate-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
                Consolidação do Orçamento de Alvenaria
              </span>
            </div>

            <div className="flex items-center gap-6 text-right">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Custo Total Global</span>
                <span className="text-lg font-mono font-black text-emerald-400">
                  R$ {custoTotalAlvenariaR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE BUSCA NO BANCO PRÓPRIO */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">Selecionar do Banco Próprio</h4>
                <p className="text-xs text-slate-400">Pesquise insumos ou composições para Alvenaria & Vedações</p>
              </div>
              <button
                onClick={() => setIsSearchModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border-b border-slate-200">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Digite para filtrar por descrição ou código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-slate-700 outline-none font-medium"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100">
              {loadingSearch ? (
                <div className="p-8 text-center text-slate-500 text-xs font-semibold">Carregando itens do Banco Próprio...</div>
              ) : searchResults.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">Nenhum item encontrado no Banco Próprio.</div>
              ) : (
                searchResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectSearchResult(item)}
                    className="p-3 hover:bg-slate-100/80 transition-colors cursor-pointer rounded-lg flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900">{item.codigo}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {item.tipoItem}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium mt-0.5 group-hover:text-slate-900">
                        {item.descricao || item.nome}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-xs text-slate-900 block">
                        R$ {(item.valor ?? item.valor_desonerado ?? item.preco_unitario ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">{item.unidade || 'UN'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
