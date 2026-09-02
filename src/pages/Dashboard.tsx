import { useEffect, useState, useMemo } from 'react';
import { Calculator, TrendingUp, BarChart3, PieChart as PieIcon, Clock, Sparkles, Users, Building2, Hourglass } from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import clsx from 'clsx';
import { supabase } from '../lib/supabase';
import MapaOrcamentosBrasil from '../components/MapaOrcamentosBrasil';

// Cores dos gráficos
// Mapeamento e cores das 4 categorias personalizadas do Dashboard
const DASHBOARD_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  'Em andamento': { label: 'Em andamento', color: '#3b82f6' },  // Azul
  'Ag. Validação': { label: 'Ag. Validação', color: '#f59e0b' }, // Amarelo
  'Ag. Envio': { label: 'Ag. Envio', color: '#10b981' },     // Verde
  'Enviado': { label: 'Enviado', color: '#8b5cf6' },         // Roxo
};

// Função para categorizar cada orçamento conforme as regras de negócio solicitadas
const getDashboardStatusCategory = (orc: any): 'Em andamento' | 'Ag. Validação' | 'Ag. Envio' | 'Enviado' | null => {
  if (!orc) return null;
  const st = (orc.status || 'Em andamento').trim().toLowerCase();
  const statusEnvio = (orc.status_envio || '').trim();

  // 1. Orçamentos cancelados (antes ou depois do envio) NÃO aparecem no gráfico
  const isCancelado = st === 'cancelada' || st === 'cancelado' || statusEnvio === 'Cancelado' || statusEnvio === 'Cancelada';
  if (isCancelado) {
    return null;
  }

  // 2. Enviado: todos os orçamentos que foram enviados ao cliente (independente do status de envio específico)
  if (st === 'enviada' || statusEnvio !== '') {
    return 'Enviado';
  }

  // 3. Ag. Validação: aguardando validação do gestor
  const isAgValidacao = st.includes('valida') || st === 'ag. validação';
  const isAprovado = orc.aprovado === true || orc.decisao_gestor === 'aprovar';

  if (isAgValidacao && !isAprovado) {
    return 'Ag. Validação';
  }

  // 4. Ag. Envio: aprovado pelo gestor mas ainda não enviado ao cliente
  if (isAprovado) {
    return 'Ag. Envio';
  }

  // 5. Em andamento: em andamento normal, recusado pelo gestor ou aprovado com pendências
  return 'Em andamento';
};

// Helper para identificar a chave base do orçamento (sem o sufixo de revisão)
const getBudgetBaseKey = (o: any): string => {
  if (o.orcamento_importado_id) {
    return `imp_${o.orcamento_importado_id}`;
  }
  if (o.codigo) {
    const parts = o.codigo.split('.');
    if (parts.length >= 2) {
      const yearPart = o.codigo.includes('-') ? '-' + o.codigo.split('-')[1] : '';
      return `${parts[0]}.${parts[1]}${yearPart}`;
    }
    return o.codigo;
  }
  return o.parent_id || o.id;
};

// Função para filtrar e manter APENAS a última revisão de cada orçamento único
const filterLatestRevisions = (orcList: any[]): any[] => {
  const groups = new Map<string, any>();

  orcList.forEach(o => {
    const key = getBudgetBaseKey(o);
    const revNum = parseInt(o.revisao || '0', 10);

    if (!groups.has(key)) {
      groups.set(key, o);
    } else {
      const existing = groups.get(key);
      const existingRev = parseInt(existing.revisao || '0', 10);

      if (revNum > existingRev) {
        groups.set(key, o);
      } else if (revNum === existingRev) {
        const timeCurrent = new Date(o.created_at || 0).getTime();
        const timeExisting = new Date(existing.created_at || 0).getTime();
        if (timeCurrent > timeExisting) {
          groups.set(key, o);
        }
      }
    }
  });

  return Array.from(groups.values());
};

export default function Dashboard() {
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [memoriaisPendentesCount, setMemoriaisPendentesCount] = useState(0);
  const [mostUsedItems, setMostUsedItems] = useState<any[]>([]);
  const [itemTypeFilter, setItemTypeFilter] = useState<'todos' | 'composicao' | 'insumo'>('todos');
  const [empresaFilter, setEmpresaFilter] = useState<'todas' | 'brp_solucoes' | 'brp_engenharia'>('todas');

  // Migrações e correções automáticas no mount
  useEffect(() => {
    const runMigration = async () => {
      const migratedKey = 'brp_migration_servicos_to_material_done';
      if (!localStorage.getItem(migratedKey)) {
        const { data: session } = await supabase.auth.getSession();
        if (session?.session) {
          await supabase.schema('engenharia')
            .from('insumos')
            .update({ tipo: 'Material' })
            .in('tipo', ['Serviços', 'Serviços de Terceiros']);
          localStorage.setItem(migratedKey, 'true');
        }
      }
    };
    runMigration();
  }, []);

  // Busca dados de orçamentos e clientes no Supabase
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // 1. Busca orçamentos da empresa (incluindo número de revisão e empresa responsável)
        const { data: orcData, error: orcErr } = await supabase
          .schema('engenharia')
          .from('orcamentos')
          .select('id, codigo, cliente, projeto, status, valor_total, created_at, orcamento_importado_id, aprovado, decisao_gestor, status_envio, revisao, parent_id, responsavel, cidade, estado, local_obra, empresa, empresa_responsavel');

        if (!orcErr && orcData) {
          setOrcamentos(orcData);
        }

        // 2. Busca memoriais de cálculo importados para contar os que AINDA NÃO tiveram orçamento gerado
        const { data: impData } = await supabase
          .schema('engenharia')
          .from('orcamentos_importados')
          .select('id');

        if (impData && orcData) {
          const linkedImpIds = new Set(
            (orcData || [])
              .map(o => o.orcamento_importado_id)
              .filter(Boolean)
          );
          // Memoriais criados que ainda NÃO possuem orçamento gerado
          const pendentes = impData.filter(imp => !linkedImpIds.has(imp.id)).length;
          setMemoriaisPendentesCount(pendentes);
        }

        // 3. Busca itens de orçamento para calcular a tabela de itens mais usados
        const { data: itensData } = await supabase
          .schema('engenharia')
          .from('orcamento_itens')
          .select('descricao, unidade, composicao_id, insumo_id, tipo, status_linha');

        if (itensData && itensData.length > 0) {
          const itemsMap = new Map<string, { descricao: string; unidade: string; tipo: 'composicao' | 'insumo'; count: number }>();
          itensData.forEach((item: any) => {
            if (!item.descricao || item.status_linha === 'inativo') return;
            const desc = item.descricao.trim();
            const isComp = !!(item.composicao_id || item.tipo === 'composicao' || item.tipo === 'Composição' || item.status_linha === 'desdobrado');
            const itemType: 'composicao' | 'insumo' = isComp ? 'composicao' : 'insumo';
            const key = desc.toLowerCase();

            if (!itemsMap.has(key)) {
              itemsMap.set(key, {
                descricao: desc,
                unidade: item.unidade || 'un',
                tipo: itemType,
                count: 1
              });
            } else {
              const existing = itemsMap.get(key)!;
              existing.count += 1;
            }
          });

          setMostUsedItems(Array.from(itemsMap.values()));
        }
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err);
      }
    };

    loadDashboardData();
  }, []);

  // Filtragem de orçamentos conforme a Empresa Responsável selecionada
  const filteredOrcamentosByEmpresa = useMemo(() => {
    if (empresaFilter === 'todas') return orcamentos;

    return orcamentos.filter(o => {
      const emp = (o.empresa || o.empresa_responsavel || '').trim().toLowerCase();
      if (empresaFilter === 'brp_solucoes') {
        return emp.includes('soluç') || emp.includes('soluco') || emp.includes('metálica') || emp.includes('metalica') || emp === '';
      }
      if (empresaFilter === 'brp_engenharia') {
        return emp.includes('eng') || emp.includes('engenharia');
      }
      return true;
    });
  }, [orcamentos, empresaFilter]);

  // Filtra APENAS a última revisão de cada orçamento para os indicadores e gráficos
  const ultimasRevisoesOrcamentos = filterLatestRevisions(filteredOrcamentosByEmpresa);

  // Cálculos dos 4 KPIs principais considerando a última revisão e o filtro de empresa
  const valorTotalOrcado = ultimasRevisoesOrcamentos.reduce((acc, curr) => acc + (parseFloat(curr.valor_total) || 0), 0);
  const emAndamentoCount = ultimasRevisoesOrcamentos.filter(o => getDashboardStatusCategory(o) === 'Em andamento').length;
  const agValidacaoCount = ultimasRevisoesOrcamentos.filter(o => getDashboardStatusCategory(o) === 'Ag. Validação').length;

  const stats = [
    {
      name: 'Valor Total Orçado',
      value: valorTotalOrcado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      icon: Calculator,
      color: 'text-blue-600',
      bg: 'bg-blue-100'
    },
    {
      name: 'Orçamentos em Andamento',
      value: emAndamentoCount.toString(),
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100'
    },
    {
      name: 'Orçamentos Ag. Validação',
      value: agValidacaoCount.toString(),
      icon: Hourglass,
      color: 'text-amber-600',
      bg: 'bg-amber-100'
    },
    {
      name: 'Orçamentos Pendentes',
      value: memoriaisPendentesCount.toString(),
      icon: Clock,
      color: 'text-purple-600',
      bg: 'bg-purple-100'
    },
  ];

  // 1. Dados para o Gráfico de Rosca: Distribuição dos Orçamentos por STATUS (Considera APENAS a ÚLTIMA revisão de cada orçamento)
  const statusCountsMap: Record<string, number> = {
    'Em andamento': 0,
    'Ag. Validação': 0,
    'Ag. Envio': 0,
    'Enviado': 0,
  };

  ultimasRevisoesOrcamentos.forEach(o => {
    const category = getDashboardStatusCategory(o);
    if (category && statusCountsMap[category] !== undefined) {
      statusCountsMap[category] += 1;
    }
  });

  const realStatusData = Object.entries(statusCountsMap)
    .filter(([_, count]) => count > 0)
    .map(([name, value]) => ({
      name,
      value,
      color: DASHBOARD_STATUS_CONFIG[name]?.color || '#3b82f6'
    }));

  const hasRealStatusData = realStatusData.length > 0;

  const statusChartData = hasRealStatusData ? realStatusData : [
    { name: 'Em andamento', value: 5, color: '#3b82f6' },
    { name: 'Ag. Validação', value: 3, color: '#f59e0b' },
    { name: 'Ag. Envio', value: 4, color: '#10b981' },
    { name: 'Enviado', value: 6, color: '#8b5cf6' },
  ];

  // 2. Dados para o Gráfico de Barras Horizontais: Quantidade de Orçamentos por Cliente (Ignorando revisões repetidas)
  const clientBudgetsMap: Record<string, Set<string>> = {};
  orcamentos.forEach(o => {
    const clienteName = o.cliente || 'Não Informado';
    if (!clientBudgetsMap[clienteName]) {
      clientBudgetsMap[clienteName] = new Set<string>();
    }

    let budgetBaseKey = o.id;
    if (o.orcamento_importado_id) {
      budgetBaseKey = `imp_${o.orcamento_importado_id}`;
    } else if (o.codigo) {
      const parts = o.codigo.split('.');
      if (parts.length >= 2) {
        const yearPart = o.codigo.includes('-') ? '-' + o.codigo.split('-')[1] : '';
        budgetBaseKey = `${parts[0]}.${parts[1]}${yearPart}`;
      } else {
        budgetBaseKey = o.codigo;
      }
    }

    clientBudgetsMap[clienteName].add(budgetBaseKey);
  });

  const clientData = Object.entries(clientBudgetsMap)
    .map(([name, baseKeysSet]) => ({ 
      name, 
      quantidade: baseKeysSet.size
    }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 8); 

  const clientChartData = clientData.length > 0 ? clientData : [
    { name: 'Concessionária Fiat', quantidade: 5 },
    { name: 'Correios', quantidade: 3 },
    { name: 'Posto Petrobras', quantidade: 2 },
    { name: 'Prefeitura Municipal', quantidade: 2 },
    { name: 'Caixa Econômica Federal', quantidade: 2 },
    { name: 'LATAM Airlines Brasil', quantidade: 1 },
    { name: 'Exatta Orçamento', quantidade: 1 },
    { name: 'CSN MINERAÇÃO', quantidade: 1 },
  ];

  // 3. Dados para o Gráfico de Barras Clusterizadas: Desempenho por Orçamentista (Orçamentos em Andamento vs Memórias de Cálculo)
  const orcamentistasMap = new Map<string, { name: string; orcamentosEmAndamento: number; memoriasCalculo: number }>();

  // Contagem de Orçamentos em Andamento por Orçamentista (apenas a última revisão)
  ultimasRevisoesOrcamentos.forEach(o => {
    const respName = (o.responsavel || 'Não Atribuído').trim();
    if (!orcamentistasMap.has(respName)) {
      orcamentistasMap.set(respName, { name: respName, orcamentosEmAndamento: 0, memoriasCalculo: 0 });
    }
    if (getDashboardStatusCategory(o) === 'Em andamento') {
      orcamentistasMap.get(respName)!.orcamentosEmAndamento += 1;
    }
  });

  // Contagem de Memórias de Cálculo por Orçamentista (vinculadas aos orçamentos)
  orcamentos.forEach(o => {
    if (o.orcamento_importado_id) {
      const respName = (o.responsavel || 'Não Atribuído').trim();
      if (!orcamentistasMap.has(respName)) {
        orcamentistasMap.set(respName, { name: respName, orcamentosEmAndamento: 0, memoriasCalculo: 0 });
      }
      orcamentistasMap.get(respName)!.memoriasCalculo += 1;
    }
  });

  const realOrcamentistaData = Array.from(orcamentistasMap.values())
    .filter(item => item.orcamentosEmAndamento > 0 || item.memoriasCalculo > 0);

  const orcamentistaChartData = realOrcamentistaData.length > 0 ? realOrcamentistaData : [
    { name: 'Sara', orcamentosEmAndamento: 5, memoriasCalculo: 7 },
    { name: 'Carlos Santos', orcamentosEmAndamento: 3, memoriasCalculo: 4 },
    { name: 'Eng. Gabriel', orcamentosEmAndamento: 2, memoriasCalculo: 5 },
    { name: 'Mariana Lima', orcamentosEmAndamento: 1, memoriasCalculo: 3 },
  ];

  // 4. Filtragem e ordenação dos 10 Itens Mais Usados nos Orçamentos
  const filteredMostUsedItems = useMemo(() => {
    let list = mostUsedItems;

    // Se o banco ainda não tiver dados em orcamento_itens, exibe uma lista modelo realista
    if (list.length === 0) {
      list = [
        { descricao: 'Estrutura Metálica Treliçada em Aço ASTM A36', unidade: 'kg', tipo: 'composicao', count: 18 },
        { descricao: 'Solda MIG/MAG Contínua 1.2mm', unidade: 'm', tipo: 'insumo', count: 15 },
        { descricao: 'Pintura Epóxi Anticorrosiva de Alta Espessura', unidade: 'm²', tipo: 'composicao', count: 14 },
        { descricao: 'Aço Estrutural Perfil I / W 250x32.7', unidade: 'kg', tipo: 'insumo', count: 12 },
        { descricao: 'Montagem e Erguimento de Estrutura Metálica', unidade: 'h', tipo: 'composicao', count: 11 },
        { descricao: 'Chapa de Aço de Ligação t=12.5mm', unidade: 'kg', tipo: 'insumo', count: 10 },
        { descricao: 'Parafuso Sextavado de Alta Resistência ASTM A325 3/4"', unidade: 'un', tipo: 'insumo', count: 9 },
        { descricao: 'Telha Metálica Trapezoidal Termoacústica 40mm', unidade: 'm²', tipo: 'composicao', count: 8 },
        { descricao: 'Grauteamento de Base de Pilar NBR 15823', unidade: 'm³', tipo: 'composicao', count: 7 },
        { descricao: 'Mão de Obra de Montador de Estrutura Metálica', unidade: 'h', tipo: 'insumo', count: 6 },
      ];
    }

    if (itemTypeFilter !== 'todos') {
      list = list.filter(i => i.tipo === itemTypeFilter);
    }

    list.sort((a, b) => b.count - a.count);
    return list.slice(0, 10);
  }, [mostUsedItems, itemTypeFilter]);

  const maxItemCount = useMemo(() => {
    if (filteredMostUsedItems.length === 0) return 1;
    return Math.max(...filteredMostUsedItems.map(i => i.count), 1);
  }, [filteredMostUsedItems]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página com Filtro de Empresa Responsável */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span>Filtro de Empresa Responsável</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">Filtre os indicadores do dashboard por unidade de negócios</p>
        </div>

        {/* Botões de Filtro: Todas / BRP Soluções Metálicas / BRP Engenharia */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl text-xs font-bold text-slate-600 w-full sm:w-auto">
          <button
            onClick={() => setEmpresaFilter('todas')}
            className={clsx(
              'px-3.5 py-2 rounded-lg transition-all cursor-pointer flex-1 sm:flex-none text-center',
              empresaFilter === 'todas' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            )}
          >
            Todas as Empresas
          </button>
          <button
            onClick={() => setEmpresaFilter('brp_solucoes')}
            className={clsx(
              'px-3.5 py-2 rounded-lg transition-all cursor-pointer flex-1 sm:flex-none text-center',
              empresaFilter === 'brp_solucoes' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-slate-900'
            )}
          >
            BRP Soluções Metálicas
          </button>
          <button
            onClick={() => setEmpresaFilter('brp_engenharia')}
            className={clsx(
              'px-3.5 py-2 rounded-lg transition-all cursor-pointer flex-1 sm:flex-none text-center',
              empresaFilter === 'brp_engenharia' ? 'bg-white text-purple-600 shadow-xs' : 'hover:text-slate-900'
            )}
          >
            BRP Engenharia
          </button>
        </div>
      </div>

      {/* Cards de Indicadores KPIs (4 Cartões em Grade) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 group hover:shadow-md transition-all">
              <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center shrink-0`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.name}</p>
                <h3 className="text-xl font-bold text-slate-800 mt-1 truncate">{stat.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Seção Principal de Gráficos Modelo BRP */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* GRAFICO 1: Distribuição dos Orçamentos por STATUS (Rosca) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          {/* Cabeçalho Vermelho (Estilo Referência) */}
          <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white px-5 py-3.5 flex justify-between items-center shadow-xs">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-white/90" />
              <span>Distribuição dos Orçamentos por STATUS</span>
            </h3>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
              {hasRealStatusData ? `${ultimasRevisoesOrcamentos.filter(o => getDashboardStatusCategory(o) !== null).length} Orçamentos` : 'Exemplo'}
            </span>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between items-center">
            {/* Legendas coloridas superiores (Estilo Referência) */}
            <div className="flex flex-wrap justify-center gap-3 mb-4 w-full">
              {statusChartData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 shadow-2xs">
                  <span className="w-3 h-3 rounded-xs shrink-0" style={{ backgroundColor: item.color }}></span>
                  <span className="truncate max-w-[140px]">{item.name}</span>
                  <span className="font-bold text-slate-900 ml-1">({item.value})</span>
                </div>
              ))}
            </div>

            {/* Gráfico Donut/Rosca Recharts */}
            <div className="w-full h-64 flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(val: any) => [`${val} Orçamento(s)`, 'Quantidade']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: '12px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* GRAFICO 2: Desempenho por Orçamentista (Barras Agrupadas Clusterizadas) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          {/* Cabeçalho Roxo */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-3.5 flex justify-between items-center shadow-xs">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-white/90" />
              <span>Desempenho por Orçamentista</span>
            </h3>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
              {orcamentistaChartData.length} Orçamentistas
            </span>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between">
            <h4 className="text-center text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Orçamentos em Andamento x Memórias de Cálculo
            </h4>

            {/* Gráfico de Barras Agrupadas Clusterizadas Recharts */}
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={orcamentistaChartData}
                  margin={{ top: 15, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontWeight: 600 }} />
                  <Bar dataKey="orcamentosEmAndamento" name="Orçamentos em Andamento" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={22} />
                  <Bar dataKey="memoriasCalculo" name="Memórias de Cálculo" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* GRAFICO 3: Empresa com mais Orçamentos */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          {/* Cabeçalho Azul */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-5 py-3.5 flex justify-between items-center shadow-xs">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-white/90" />
              <span>Empresa com mais Orçamentos</span>
            </h3>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
              {clientChartData.length} Clientes
            </span>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between">
            <h4 className="text-center text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Quantidade de Orçamentos por Cliente
            </h4>

            {/* Gráfico de Barras Horizontais Recharts */}
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={clientChartData}
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={140} 
                    tick={{ fontSize: 10, fill: '#334155', fontWeight: 600 }}
                  />
                  <RechartsTooltip
                    formatter={(val: any) => [`${val} Orçamento(s)`, 'Quantidade']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="quantidade" fill="#38bdf8" radius={[0, 6, 6, 0]} barSize={16}>
                    {clientChartData.map((_, index) => (
                      <Cell key={`bar-cell-${index}`} fill={index === 0 ? '#0284c7' : '#38bdf8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* GRAFICO 4: Distribuição Geográfica dos Orçamentos (Mapa do Brasil com Marcadores de Círculo) */}
        <MapaOrcamentosBrasil orcamentos={orcamentos} />

      </div>

      {/* TABELA: Itens Mais Usados nos Orçamentos com Minigráfico */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Cabeçalho da Tabela com Filtros */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>Itens Mais Usados nos Orçamentos</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Top 10 itens com maior frequência de utilização nas propostas
            </p>
          </div>

          {/* Filtros: Todos / Composições / Insumos */}
          <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              onClick={() => setItemTypeFilter('todos')}
              className={clsx(
                'px-3 py-1.5 rounded-lg transition-all cursor-pointer',
                itemTypeFilter === 'todos' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-slate-900'
              )}
            >
              Todos
            </button>
            <button
              onClick={() => setItemTypeFilter('composicao')}
              className={clsx(
                'px-3 py-1.5 rounded-lg transition-all cursor-pointer',
                itemTypeFilter === 'composicao' ? 'bg-white text-purple-600 shadow-xs' : 'hover:text-slate-900'
              )}
            >
              Composições
            </button>
            <button
              onClick={() => setItemTypeFilter('insumo')}
              className={clsx(
                'px-3 py-1.5 rounded-lg transition-all cursor-pointer',
                itemTypeFilter === 'insumo' ? 'bg-white text-emerald-600 shadow-xs' : 'hover:text-slate-900'
              )}
            >
              Insumos
            </button>
          </div>
        </div>

        {/* Tabela de Itens com Sparkline Bar */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Item / Descrição</th>
                <th className="py-3 px-4 w-32">Tipo</th>
                <th className="py-3 px-4 w-64 text-right">Frequência de Uso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredMostUsedItems.map((item, idx) => {
                const percentage = Math.max(8, Math.round((item.count / maxItemCount) * 100));
                const isComp = item.tipo === 'composicao';

                return (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-400 text-center">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-md" title={item.descricao}>{item.descricao}</span>
                        {item.unidade && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-mono shrink-0">
                            {item.unidade}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={clsx(
                        'px-2.5 py-1 rounded-full text-[10px] font-bold border inline-block shadow-2xs',
                        isComp ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      )}>
                        {isComp ? 'Composição' : 'Insumo'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-3">
                        <div className="w-36 bg-slate-100 rounded-full h-2.5 overflow-hidden flex shadow-inner">
                          <div 
                            className={clsx(
                              'h-full rounded-full transition-all duration-500',
                              isComp ? 'bg-gradient-to-r from-purple-500 to-indigo-600' : 'bg-gradient-to-r from-emerald-400 to-teal-600'
                            )} 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-800 w-10 text-right shrink-0">
                          {item.count}x
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
