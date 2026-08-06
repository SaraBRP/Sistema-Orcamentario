import React, { useEffect, useState, useCallback } from 'react';
import type { CalculoResultado, ResumoInsumoItem, TipoInsumoCategoria } from '../../../types/calculos';
import { Building2, Package, CheckCircle2, Trash2, Layers, Search, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Props {
  parametros: Record<string, any>;
  onChangeParametros: (parametros: Record<string, any>) => void;
  onUpdateResultados: (resultados: CalculoResultado) => void;
}

export const PreMoldadosForm: React.FC<Props> = ({
  parametros,
  onChangeParametros,
  onUpdateResultados
}) => {
  // Inputs em Branco / Limpos
  const tipoPeca = parametros.tipoPeca || 'pilar';
  const comprimentoHRaw = parametros.comprimentoH !== undefined ? String(parametros.comprimentoH) : '';
  const larguraBRaw = parametros.larguraB !== undefined ? String(parametros.larguraB) : '';
  const alturaSecaoHRaw = parametros.alturaSecaoH !== undefined ? String(parametros.alturaSecaoH) : '';
  const quantidadeQRaw = parametros.quantidadeQ !== undefined ? String(parametros.quantidadeQ) : '';
  const reutilizacaoNaprovRaw = parametros.reutilizacaoNaprov !== undefined ? String(parametros.reutilizacaoNaprov) : '';
  const numJogosFormaRaw = parametros.numJogosForma !== undefined ? String(parametros.numJogosForma) : '';
  const perdaPercentualRaw = parametros.perdaPercentual !== undefined ? String(parametros.perdaPercentual) : '20';
  const pregoKgM2Raw = parametros.pregoKgM2 !== undefined ? String(parametros.pregoKgM2) : '0.20';

  // Divisores Dinâmicos do Resumo
  const divisorFabricacao: 'm3' | 'un' = parametros.divisorFabricacao || 'm3';
  const divisorMontagem: 'un' | 'm3' = parametros.divisorMontagem || 'un';

  // Lista de Insumos da Aba RESUMO
  const resumoInsumosState: ResumoInsumoItem[] = parametros.resumoInsumos || [];

  // Modal de Busca no Banco
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchPhase, setSearchPhase] = useState<'fabricacao' | 'montagem'>('fabricacao');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Conversões numéricas
  const comprimentoH = parseFloat(comprimentoHRaw.replace(',', '.')) || 0;
  const larguraB = parseFloat(larguraBRaw.replace(',', '.')) || 0;
  const alturaSecaoH = parseFloat(alturaSecaoHRaw.replace(',', '.')) || 0;
  const quantidadeQ = parseInt(quantidadeQRaw, 10) || 0;
  const reutilizacaoNaprov = parseFloat(reutilizacaoNaprovRaw.replace(',', '.')) || 0;
  const perdaPercentual = parseFloat(perdaPercentualRaw.replace(',', '.')) || 20;
  const pregoKgM2 = parseFloat(pregoKgM2Raw.replace(',', '.')) || 0.20;

  // Nº de jogos de fôrma (pode ser manual ou autocalculado)
  const numJogosManual = parseInt(numJogosFormaRaw, 10);
  const numJogosAutocalculado = (quantidadeQ > 0 && reutilizacaoNaprov > 0)
    ? Math.ceil(quantidadeQ / reutilizacaoNaprov)
    : 1;
  const numJogos = !isNaN(numJogosManual) && numJogosManual > 0 ? numJogosManual : numJogosAutocalculado;

  // 1. Cálculos Geométricos Básicos
  const volUnit = comprimentoH * larguraB * alturaSecaoH;
  const volTotal = volUnit * quantidadeQ;
  const perimetroSecao = 2 * (larguraB + alturaSecaoH);

  // Fôrmas
  const areaLateralComp = perimetroSecao * comprimentoH;
  const areaExecutaForma = numJogos > 0 ? (areaLateralComp * quantidadeQ) / numJogos : 0;
  const areaCompTotalObra = areaExecutaForma * (1 + perdaPercentual / 100);

  // Pregos & Acessórios
  const pesoPregosTotal = areaExecutaForma * pregoKgM2;
  const sarr1 = (comprimentoH + perimetroSecao) * 2;
  const sarrTotalObra = sarr1 * quantidadeQ;

  const pontalete1 = (comprimentoH * 2) + 4;
  const pontTotalObra = pontalete1 * quantidadeQ;

  const aparente1 = areaLateralComp;
  const aparenteTotalObra = aparente1 * quantidadeQ;

  // 2. Busca de itens do Banco Próprio (exclusivo Cotação/Histórico/BRP/Próprio)
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

  // 3. Função de Consolidação dos Insumos do Resumo
  const calcularResumoConsolidado = (): ResumoInsumoItem[] => {
    return resumoInsumosState.map((item) => {
      const isFabricacao = item.fase === 'fabricacao';
      const targetDivisorUnit = isFabricacao ? divisorFabricacao : divisorMontagem;
      const targetDivisorValue = targetDivisorUnit === 'm3' ? (volTotal > 0 ? volTotal : 1) : (quantidadeQ > 0 ? quantidadeQ : 1);

      let qtdTotal = 0;

      // Regra de consumo automática por código específico ou categoria do insumo
      if (item.codigo === '00562') {
        qtdTotal = areaCompTotalObra;
      } else if (item.codigo === '00005') {
        qtdTotal = pesoPregosTotal;
      } else if (item.codigo === '04491') {
        qtdTotal = sarrTotalObra;
      } else if (item.codigo === '04493') {
        qtdTotal = pontTotalObra;
      } else if (item.codigo === '00320') {
        qtdTotal = aparenteTotalObra;
      } else if (item.tipoInsumo === 'Mão de Obra') {
        const prod = item.taxaProdutividade ?? 1.0;
        if (item.unidadeProdutividade === 'hh/m3') {
          qtdTotal = volTotal * prod;
        } else if (item.unidadeProdutividade === 'hh/un') {
          qtdTotal = quantidadeQ * prod;
        } else { // hh/m2 por padrão para fôrmas/mão de obra
          qtdTotal = areaCompTotalObra * prod;
        }
      } else if (item.tipoInsumo === 'Equipamento' || item.tipoInsumo === 'Transporte e Logística') {
        qtdTotal = quantidadeQ * (item.taxaProdutividade ?? 0.5);
      } else if (item.tipoInsumo === 'Material') {
        qtdTotal = volTotal > 0 ? volTotal * (item.taxaProdutividade ?? 1.0) : quantidadeQ * (item.taxaProdutividade ?? 1.0);
      } else {
        qtdTotal = quantidadeQ * (item.taxaProdutividade ?? 1.0);
      }

      const coef = targetDivisorValue > 0 ? qtdTotal / targetDivisorValue : 0;
      const custoTotal = qtdTotal * (item.precoUnitario || 0);

      return {
        ...item,
        quantidadeTotalCalculada: Number(qtdTotal.toFixed(3)),
        coeficienteCalculado: Number(coef.toFixed(5)),
        custoTotalR$: Number(custoTotal.toFixed(2))
      };
    });
  };

  const resumoCalculadoList = calcularResumoConsolidado();
  const custoTotalGeralR$ = resumoCalculadoList.reduce((acc, i) => acc + (i.custoTotalR$ || 0), 0);

  useEffect(() => {
    if (volTotal <= 0) {
      onUpdateResultados({});
      return;
    }

    const coefComp = volTotal > 0 ? areaCompTotalObra / volTotal : 0;
    const coefPregos = volTotal > 0 ? pesoPregosTotal / volTotal : 0;
    const coefSarr = volTotal > 0 ? sarrTotalObra / volTotal : 0;
    const coefPont = volTotal > 0 ? pontTotalObra / volTotal : 0;
    const coefApar = volTotal > 0 ? aparenteTotalObra / volTotal : 0;

    onUpdateResultados({
      volumeConcretoM3: Math.round(volTotal * 100) / 100,
      areaFormaM2: Math.round(areaCompTotalObra * 100) / 100,
      quantidadeUnidades: quantidadeQ,
      numeroJogosForma: numJogos,
      custoTotalEstimadoR$: Math.round(custoTotalGeralR$ * 100) / 100,

      coefCompensadoM2M3: Number(coefComp.toFixed(5)),
      coefPregosKgM3: Number(coefPregos.toFixed(5)),
      coefSarrafoMM3: Number(coefSarr.toFixed(5)),
      coefPontaleteMM3: Number(coefPont.toFixed(5)),
      coefConcretoAparenteM2M3: Number(coefApar.toFixed(5)),

      detalhes: {
        'Tipo de Peça': tipoPeca === 'pilar' ? 'PILAR PRÉ-MOLDADO' : 'VIGA PRÉ-MOLDADA',
        'Quantidade Peças (Q)': quantidadeQ,
        'Dimensões (H x b x h)': `${comprimentoH}m x ${larguraB}m x ${alturaSecaoH}m`,
        'Vol. Unitário': `${volUnit.toFixed(3)} m³`,
        'Volume Total Concreto': `${volTotal.toFixed(2)} m³`,
        'Divisor Fabricação': divisorFabricacao.toUpperCase(),
        'Divisor Montagem': divisorMontagem.toUpperCase(),
        'Jogos Fôrma Adotados': `${numJogos} UN`,
        'Custo Insumos Consolidados': `R$ ${custoTotalGeralR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      }
    });
  }, [
    volTotal, areaCompTotalObra, pesoPregosTotal, sarrTotalObra, pontTotalObra, aparenteTotalObra,
    quantidadeQ, tipoPeca, comprimentoH, larguraB, alturaSecaoH, numJogos, divisorFabricacao, divisorMontagem,
    custoTotalGeralR$
  ]);

  const updateParam = (key: string, val: any) => {
    onChangeParametros({ ...parametros, [key]: val });
  };

  // Manipuladores de itens do Resumo
  const handleUpdateResumoItem = (id: string, field: keyof ResumoInsumoItem, val: any) => {
    const updated = resumoInsumosState.map(i => i.id === id ? { ...i, [field]: val } : i);
    updateParam('resumoInsumos', updated);
  };

  const handleDeleteResumoItem = (id: string) => {
    const updated = resumoInsumosState.filter(i => i.id !== id);
    updateParam('resumoInsumos', updated);
  };

  const handleSelectSearchResult = (item: any) => {
    // Extrai o tipo exato do insumo ou composição do banco de dados
    const rawTipo = String(item.tipo || item.tipo_insumo || item.tipo_atividade || '').toUpperCase();
    let tipoCat: TipoInsumoCategoria = 'Material';

    if (rawTipo.includes('MÃO DE OBRA') || rawTipo.includes('MAO DE OBRA') || rawTipo.includes('PEDREIRO') || rawTipo.includes('CARPINTEIRO') || rawTipo.includes('SERVENTE')) {
      tipoCat = 'Mão de Obra';
    } else if (rawTipo.includes('EQUIPAMENTO') || rawTipo.includes('MAQUINA')) {
      tipoCat = 'Equipamento';
    } else if (rawTipo.includes('TRANSPORTE') || rawTipo.includes('FRETE')) {
      tipoCat = 'Transporte e Logística';
    } else if (rawTipo.includes('SERVIÇO') || rawTipo.includes('SERVICO')) {
      tipoCat = 'Outros';
    } else {
      tipoCat = 'Material';
    }

    // Extrai o valor real do banco (valor, valor_desonerado, preco_unitario, custo_desonerado)
    const preco = Number(item.valor ?? item.valor_desonerado ?? item.preco_unitario ?? item.custo_desonerado ?? item.custo_sem_desoneracao ?? 0);

    const newItem: ResumoInsumoItem = {
      id: String(Date.now()),
      codigo: item.codigo || '000',
      descricao: item.descricao || item.nome || 'Insumo Selecionado',
      tipoInsumo: tipoCat,
      fase: searchPhase,
      taxaProdutividade: tipoCat === 'Mão de Obra' ? 1.0 : undefined,
      unidadeProdutividade: tipoCat === 'Mão de Obra' ? 'hh/m2' : 'un',
      unidade: item.unidade || (tipoCat === 'Mão de Obra' ? 'h' : 'UN'),
      precoUnitario: preco
    };

    updateParam('resumoInsumos', [...resumoInsumosState, newItem]);
    setIsSearchModalOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="space-y-5">
      {/* Banner Limpo e Profissional */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
          <Building2 className="w-4 h-4 text-slate-600" />
          <span>Calculadora de Coeficientes & Resumo de Insumos (Modelo BRP)</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Dimensionamento paramétrico de elementos pré-fabricados (pilares e vigas) com cálculo dinâmico de consumo por $m^3$ ou UN.
        </p>
      </div>

      {/* Formulário de Inputs Nivelados (3x3 Grid) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-2xs">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Package className="w-4 h-4 text-slate-700" />
          Parâmetros Geométricos & Operacionais
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* 1. Tipo de Peça */}
          <div className="flex flex-col justify-between">
            <label className="flex items-end min-h-[28px] mb-1 font-bold text-slate-700">
              Tipo de Peça
            </label>
            <select
              value={tipoPeca}
              onChange={(e) => updateParam('tipoPeca', e.target.value)}
              className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-slate-800 outline-none focus:border-slate-700 shadow-2xs cursor-pointer"
            >
              <option value="pilar">Pilar</option>
              <option value="viga">Viga / Calha</option>
            </select>
          </div>

          {/* 2. Comprimento / Altura H */}
          <div className="flex flex-col justify-between">
            <label className="flex items-end min-h-[28px] mb-1 font-bold text-slate-700">
              Comprimento / Altura H (m)
            </label>
            <input
              type="number"
              step="0.05"
              placeholder="Ex: 19,5"
              value={comprimentoHRaw}
              onChange={(e) => updateParam('comprimentoH', e.target.value)}
              className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-800 outline-none focus:border-slate-700 font-bold shadow-2xs placeholder:font-normal placeholder:text-slate-400"
            />
          </div>

          {/* 3. Largura b */}
          <div className="flex flex-col justify-between">
            <label className="flex items-end min-h-[28px] mb-1 font-bold text-slate-700">
              Largura b (m)
            </label>
            <input
              type="number"
              step="0.05"
              placeholder="Ex: 0,60"
              value={larguraBRaw}
              onChange={(e) => updateParam('larguraB', e.target.value)}
              className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-800 outline-none focus:border-slate-700 font-bold shadow-2xs placeholder:font-normal placeholder:text-slate-400"
            />
          </div>

          {/* 4. Altura da Seção h */}
          <div className="flex flex-col justify-between">
            <label className="flex items-end min-h-[28px] mb-1 font-bold text-slate-700">
              Altura da Seção h (m)
            </label>
            <input
              type="number"
              step="0.05"
              placeholder="Ex: 0,60"
              value={alturaSecaoHRaw}
              onChange={(e) => updateParam('alturaSecaoH', e.target.value)}
              className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-800 outline-none focus:border-slate-700 font-bold shadow-2xs placeholder:font-normal placeholder:text-slate-400"
            />
          </div>

          {/* 5. Quantidade Q */}
          <div className="flex flex-col justify-between">
            <label className="flex items-end min-h-[28px] mb-1 font-bold text-slate-700">
              Quantidade de Peças Q (UN)
            </label>
            <input
              type="number"
              placeholder="Ex: 27"
              value={quantidadeQRaw}
              onChange={(e) => updateParam('quantidadeQ', e.target.value)}
              className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-800 outline-none focus:border-slate-700 font-bold shadow-2xs placeholder:font-normal placeholder:text-slate-400"
            />
          </div>

          {/* 6. Fator Reutilização N_aprov */}
          <div className="flex flex-col justify-between">
            <label className="flex items-end min-h-[28px] mb-1 font-bold text-slate-700">
              Reaproveitamento (Nº Aprov)
            </label>
            <input
              type="number"
              placeholder="Ex: 9"
              value={reutilizacaoNaprovRaw}
              onChange={(e) => updateParam('reutilizacaoNaprov', e.target.value)}
              className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-800 outline-none focus:border-slate-700 font-bold shadow-2xs placeholder:font-normal placeholder:text-slate-400"
            />
          </div>

          {/* 7. Nº Jogos de Fôrma (UN) - Input Manual */}
          <div className="flex flex-col justify-between">
            <label className="flex items-end min-h-[28px] mb-1 font-bold text-slate-700">
              Nº Jogos de Fôrma (UN)
            </label>
            <input
              type="number"
              placeholder={`Sugerido: ${numJogosAutocalculado} UN`}
              value={numJogosFormaRaw}
              onChange={(e) => updateParam('numJogosForma', e.target.value)}
              className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-slate-50 font-mono text-slate-800 outline-none focus:border-slate-700 font-bold shadow-2xs placeholder:font-normal placeholder:text-slate-400"
            />
          </div>

          {/* 8. % Perda Padrão */}
          <div className="flex flex-col justify-between">
            <label className="flex items-end min-h-[28px] mb-1 font-bold text-slate-700">
              % de Perda Padrão
            </label>
            <div className="relative w-full h-9">
              <input
                type="number"
                placeholder="20"
                value={perdaPercentualRaw}
                onChange={(e) => updateParam('perdaPercentual', e.target.value)}
                className="w-full h-9 pl-3 pr-8 border border-slate-300 rounded-lg bg-white font-mono text-slate-800 outline-none focus:border-slate-700 font-bold shadow-2xs placeholder:font-normal placeholder:text-slate-400"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">%</span>
            </div>
          </div>

          {/* 9. Consumo Pregos por m² Fôrma */}
          <div className="flex flex-col justify-between">
            <label className="flex items-end min-h-[28px] mb-1 font-bold text-slate-700">
              Pregos por m² Fôrma
            </label>
            <div className="relative w-full h-9">
              <input
                type="number"
                step="0.05"
                placeholder="0,20"
                value={pregoKgM2Raw}
                onChange={(e) => updateParam('pregoKgM2', e.target.value)}
                className="w-full h-9 pl-3 pr-12 border border-slate-300 rounded-lg bg-white font-mono text-slate-800 outline-none focus:border-slate-700 font-bold shadow-2xs placeholder:font-normal placeholder:text-slate-400"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold pointer-events-none">kg/m²</span>
            </div>
          </div>
        </div>
      </div>

      {/* CONTROLES DO DIVISOR DINÂMICO E TABELA RESUMO */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs space-y-0">
        
        {/* Header Limpo com Seletor de Divisores */}
        <div className="bg-slate-100/90 text-slate-800 p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-700" />
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900">Aba Resumo de Insumos & Composições (Banco Próprio)</h4>
              <p className="text-[11px] text-slate-500">Ajuste os divisores dinâmicos para a consolidação técnica dos coeficientes</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white p-1.5 rounded-lg border border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Fabricação:</span>
              <select
                value={divisorFabricacao}
                onChange={(e) => updateParam('divisorFabricacao', e.target.value)}
                className="bg-slate-50 text-slate-900 font-bold px-2 py-1 rounded border border-slate-300 outline-none focus:border-slate-700 cursor-pointer"
              >
                <option value="m3">Por m³ (Padrão)</option>
                <option value="un">Por Unidade (UN)</option>
              </select>
            </div>

            <div className="h-4 w-px bg-slate-200" />

            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Montagem:</span>
              <select
                value={divisorMontagem}
                onChange={(e) => updateParam('divisorMontagem', e.target.value)}
                className="bg-slate-50 text-slate-900 font-bold px-2 py-1 rounded border border-slate-300 outline-none focus:border-slate-700 cursor-pointer"
              >
                <option value="un">Por Unidade (Padrão)</option>
                <option value="m3">Por m³</option>
              </select>
            </div>
          </div>
        </div>

        {/* TABELA DE FABRICAÇÃO */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block" />
              <h5 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                1. Insumos & Composições de Fabricação (Divisor: <span className="font-extrabold text-slate-900">{divisorFabricacao === 'm3' ? 'm³' : 'UN'}</span>)
              </h5>
            </div>
            <button
              onClick={() => { setSearchPhase('fabricacao'); setIsSearchModalOpen(true); }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>+ Adicionar do Banco Próprio</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3 w-24">Código</th>
                  <th className="py-2.5 px-3">Descrição da Composição / Insumo</th>
                  <th className="py-2.5 px-3 w-28">Tipo</th>
                  <th className="py-2.5 px-3 text-right w-44">Produtividade / Base</th>
                  <th className="py-2.5 px-3 text-right w-24">Qtd Total</th>
                  <th className="py-2.5 px-3 text-right w-28">Coeficiente</th>
                  <th className="py-2.5 px-3 text-right w-28">Preço Unit. (R$)</th>
                  <th className="py-2.5 px-3 text-right w-28">Total R$</th>
                  <th className="py-2.5 px-3 text-center w-12">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resumoCalculadoList.filter(i => i.fase === 'fabricacao').length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-400 italic">
                      Nenhum insumo ou composição de Fabricação adicionado. Clique em "+ Adicionar do Banco Próprio" acima.
                    </td>
                  </tr>
                ) : (
                  resumoCalculadoList.filter(i => i.fase === 'fabricacao').map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{item.codigo}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{item.descricao}</td>
                      <td className="py-2.5 px-3">
                        <select
                          value={item.tipoInsumo}
                          onChange={(e) => handleUpdateResumoItem(item.id, 'tipoInsumo', e.target.value as TipoInsumoCategoria)}
                          className="bg-white border border-slate-200 text-slate-700 text-[11px] font-medium rounded px-1.5 py-0.5 outline-none focus:border-slate-600"
                        >
                          <option value="Material">Material</option>
                          <option value="Mão de Obra">Mão de Obra</option>
                          <option value="Equipamento">Equipamento</option>
                          <option value="Transporte e Logística">Transporte</option>
                          <option value="Outros">Outros</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {item.tipoInsumo === 'Mão de Obra' ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              step="0.1"
                              value={item.taxaProdutividade ?? 1.0}
                              onChange={(e) => handleUpdateResumoItem(item.id, 'taxaProdutividade', parseFloat(e.target.value) || 0)}
                              className="w-14 h-7 text-right px-1.5 border border-slate-300 rounded bg-white font-mono font-bold text-slate-800"
                            />
                            <select
                              value={item.unidadeProdutividade || 'hh/m2'}
                              onChange={(e) => handleUpdateResumoItem(item.id, 'unidadeProdutividade', e.target.value)}
                              className="h-7 text-[10px] bg-slate-50 border border-slate-200 rounded px-1 font-semibold text-slate-700"
                            >
                              <option value="hh/m2">hh/m² fôrma</option>
                              <option value="hh/m3">hh/m³ conc</option>
                              <option value="hh/un">hh/unidade</option>
                            </select>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">Automático</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                        {item.quantidadeTotalCalculada?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900">
                        {item.coeficienteCalculado?.toFixed(4)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={item.precoUnitario || 0}
                          onChange={(e) => handleUpdateResumoItem(item.id, 'precoUnitario', parseFloat(e.target.value) || 0)}
                          className="w-20 h-7 text-right px-1.5 border border-slate-300 rounded bg-white font-mono font-bold text-slate-800"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                        R$ {item.custoTotalR$?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleDeleteResumoItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Excluir item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TABELA DE MONTAGEM */}
        <div className="p-4 space-y-3 bg-slate-50/50 border-t border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block" />
              <h5 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                2. Insumos & Serviços de Montagem (Divisor: <span className="font-extrabold text-slate-900">{divisorMontagem === 'un' ? 'UN' : 'm³'}</span>)
              </h5>
            </div>
            <button
              onClick={() => { setSearchPhase('montagem'); setIsSearchModalOpen(true); }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>+ Adicionar do Banco Próprio</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3 w-24">Código</th>
                  <th className="py-2.5 px-3">Descrição da Composição / Insumo</th>
                  <th className="py-2.5 px-3 w-28">Tipo</th>
                  <th className="py-2.5 px-3 text-right w-44">Produtividade / Base</th>
                  <th className="py-2.5 px-3 text-right w-24">Qtd Total</th>
                  <th className="py-2.5 px-3 text-right w-28">Coeficiente</th>
                  <th className="py-2.5 px-3 text-right w-28">Preço Unit. (R$)</th>
                  <th className="py-2.5 px-3 text-right w-28">Total R$</th>
                  <th className="py-2.5 px-3 text-center w-12">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resumoCalculadoList.filter(i => i.fase === 'montagem').length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-400 italic">
                      Nenhum insumo ou composição de Montagem adicionado. Clique em "+ Adicionar do Banco Próprio" acima.
                    </td>
                  </tr>
                ) : (
                  resumoCalculadoList.filter(i => i.fase === 'montagem').map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{item.codigo}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{item.descricao}</td>
                      <td className="py-2.5 px-3">
                        <select
                          value={item.tipoInsumo}
                          onChange={(e) => handleUpdateResumoItem(item.id, 'tipoInsumo', e.target.value as TipoInsumoCategoria)}
                          className="bg-white border border-slate-200 text-slate-700 text-[11px] font-medium rounded px-1.5 py-0.5 outline-none focus:border-slate-600"
                        >
                          <option value="Material">Material</option>
                          <option value="Mão de Obra">Mão de Obra</option>
                          <option value="Equipamento">Equipamento</option>
                          <option value="Transporte e Logística">Transporte</option>
                          <option value="Outros">Outros</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {item.tipoInsumo === 'Mão de Obra' ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              step="0.1"
                              value={item.taxaProdutividade ?? 1.0}
                              onChange={(e) => handleUpdateResumoItem(item.id, 'taxaProdutividade', parseFloat(e.target.value) || 0)}
                              className="w-14 h-7 text-right px-1.5 border border-slate-300 rounded bg-white font-mono font-bold text-slate-800"
                            />
                            <select
                              value={item.unidadeProdutividade || 'hh/un'}
                              onChange={(e) => handleUpdateResumoItem(item.id, 'unidadeProdutividade', e.target.value)}
                              className="h-7 text-[10px] bg-slate-50 border border-slate-200 rounded px-1 font-semibold text-slate-700"
                            >
                              <option value="hh/un">hh/unidade</option>
                              <option value="hh/m3">hh/m³ conc</option>
                              <option value="hh/m2">hh/m² fôrma</option>
                            </select>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">Automático</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                        {item.quantidadeTotalCalculada?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900">
                        {item.coeficienteCalculado?.toFixed(4)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={item.precoUnitario || 0}
                          onChange={(e) => handleUpdateResumoItem(item.id, 'precoUnitario', parseFloat(e.target.value) || 0)}
                          className="w-20 h-7 text-right px-1.5 border border-slate-300 rounded bg-white font-mono font-bold text-slate-800"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                        R$ {item.custoTotalR$?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleDeleteResumoItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Excluir item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Custo Total Consolidado Footer */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
              Custo Total de Insumos & Mão de Obra Consolidados
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Total da Planilha</span>
            <span className="text-lg font-mono font-black text-emerald-400">
              R$ {custoTotalGeralR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* MODAL DE BUSCA NO BANCO PRÓPRIO */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">Selecionar do Banco Próprio ({searchPhase === 'fabricacao' ? 'Fabricação' : 'Montagem'})</h4>
                <p className="text-xs text-slate-400">Pesquise insumos ou composições oficiais cadastrados no seu sistema</p>
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
                        {item.tipo && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {item.tipo}
                          </span>
                        )}
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
