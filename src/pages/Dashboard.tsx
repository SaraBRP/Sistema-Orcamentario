import { useEffect, useState } from 'react';
import { Calculator, Building2, TrendingUp, BarChart3, PieChart as PieIcon, Clock } from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { supabase } from '../lib/supabase';

// Cores dos gráficos
const STATUS_COLORS: Record<string, string> = {
  'Em andamento': '#3b82f6', // Azul
  'Ag. Validação': '#f59e0b', // Amarelo/Laranja
  'Recusado pelo Gestor': '#ef4444', // Vermelho
  'Com Pendências': '#f97316', // Laranja Escuro
  'Aprovado e Ag. Envio': '#10b981', // Verde
  'Ag. Retorno': '#06b6d4', // Ciano
  'Consolidado': '#8b5cf6', // Roxo
  'Consolidada': '#8b5cf6',
  'Encerrado': '#64748b', // Cinza
  'Encerrada': '#64748b',
  'Cancelado': '#dc2626', // Vermelho Escuro
  'Cancelada': '#dc2626',
};

const DEFAULT_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

export default function Dashboard() {
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [totalClientes, setTotalClientes] = useState(0);
  const [memoriaisPendentesCount, setMemoriaisPendentesCount] = useState(0);

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
        // 1. Busca orçamentos da empresa (incluindo o ID do memorial importado vinculado)
        const { data: orcData, error: orcErr } = await supabase
          .schema('engenharia')
          .from('orcamentos')
          .select('id, codigo, cliente, projeto, status, valor_total, created_at, orcamento_importado_id');

        if (!orcErr && orcData) {
          setOrcamentos(orcData);
        }

        // 2. Busca memoriais de cálculo importados para contar os que AINDA NÃO tiveram orçamento gerado
        const { data: impData } = await supabase
          .schema('engenharia')
          .from('orcamentos_importados')
          .select('id');

        if (impData) {
          const linkedImpIds = new Set(
            (orcData || [])
              .map(o => o.orcamento_importado_id)
              .filter(Boolean)
          );
          // Memoriais criados que ainda NÃO possuem orçamento gerado
          const pendentes = impData.filter(imp => !linkedImpIds.has(imp.id)).length;
          setMemoriaisPendentesCount(pendentes);
        }

        // 3. Busca total de clientes cadastrados
        const { count: clientCount } = await supabase
          .schema('engenharia')
          .from('clientes')
          .select('*', { count: 'exact', head: true });

        if (clientCount !== null) {
          setTotalClientes(clientCount);
        }
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err);
      }
    };

    loadDashboardData();
  }, []);

  // Cálculos dos KPIs principais
  const totalOrcamentosCount = orcamentos.length;
  const valorTotalOrcado = orcamentos.reduce((acc, curr) => acc + (parseFloat(curr.valor_total) || 0), 0);

  const stats = [
    {
      name: 'Valor Total Orçado',
      value: valorTotalOrcado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      icon: Calculator,
      color: 'text-blue-600',
      bg: 'bg-blue-100'
    },
    {
      name: 'Total de Orçamentos',
      value: totalOrcamentosCount.toString(),
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100'
    },
    {
      name: 'Orçamentos Pendentes',
      value: memoriaisPendentesCount.toString(),
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-100'
    },
    {
      name: 'Clientes Cadastrados',
      value: totalClientes > 0 ? totalClientes.toString() : (new Set(orcamentos.map(o => o.cliente).filter(Boolean)).size).toString(),
      icon: Building2,
      color: 'text-purple-600',
      bg: 'bg-purple-100'
    },
  ];

  // 1. Dados para o Gráfico de Rosca: Distribuição dos Orçamentos por STATUS
  const statusCountsMap: Record<string, number> = {};
  orcamentos.forEach(o => {
    const status = o.status || 'Em andamento';
    statusCountsMap[status] = (statusCountsMap[status] || 0) + 1;
  });

  const statusData = Object.entries(statusCountsMap).map(([name, value]) => ({
    name,
    value,
    color: STATUS_COLORS[name] || DEFAULT_COLORS[Math.abs(name.length) % DEFAULT_COLORS.length]
  }));

  // Mock de dados ilustrativos se o banco ainda não tiver dados suficientes
  const statusChartData = statusData.length > 0 ? statusData : [
    { name: 'Em andamento', value: 5, color: '#3b82f6' },
    { name: 'Ag. Retorno', value: 4, color: '#06b6d4' },
    { name: 'Consolidado', value: 3, color: '#8b5cf6' },
    { name: 'Encerrado', value: 2, color: '#64748b' },
    { name: 'Cancelado', value: 1, color: '#dc2626' },
  ];

  // 2. Dados para o Gráfico de Barras Horizontais: Quantidade de Orçamentos por Cliente
  const clientCountsMap: Record<string, number> = {};
  orcamentos.forEach(o => {
    const clienteName = o.cliente || 'Não Informado';
    clientCountsMap[clienteName] = (clientCountsMap[clienteName] || 0) + 1;
  });

  const clientData = Object.entries(clientCountsMap)
    .map(([name, quantidade]) => ({ name, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 8); // Top 8 clientes

  // Mock de dados ilustrativos se o banco estiver limpo
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

  return (
    <div className="space-y-6">
      {/* Cards de Indicadores KPIs */}
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
              {orcamentos.length > 0 ? `${orcamentos.length} Orçamentos` : 'Exemplo'}
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

        {/* GRAFICO 2: Quantidade de Orçamentos por Cliente / Empresa com mais Orçamentos */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          {/* Cabeçalho Roxo (Estilo Referência) */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-3.5 flex justify-between items-center shadow-xs">
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

      </div>
    </div>
  );
}

