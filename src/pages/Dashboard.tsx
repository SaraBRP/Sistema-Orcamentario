import { useEffect } from 'react';
import { Calculator, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  useEffect(() => {
    const runMigration = async () => {
      const migratedKey = 'brp_migration_servicos_to_material_done';
      if (localStorage.getItem(migratedKey)) return;
      
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) return; // Wait until logged in
      
      console.log('Running type migration: Serviços -> Material...');
      const { error } = await supabase.schema('engenharia')
        .from('insumos')
        .update({ tipo: 'Material' })
        .in('tipo', ['Serviços', 'Serviços de Terceiros']);
        
      if (error) {
        console.error('Migration error:', error);
      } else {
        console.log('Migration successful!');
        localStorage.setItem(migratedKey, 'true');
      }

      // 2. Correção de unidades maiúsculas para minúsculas nos insumos
      try {
        const { data: insToFix } = await supabase.schema('engenharia')
          .from('insumos')
          .select('id, unidade')
          .or('unidade.eq.H,unidade.eq.MES,unidade.eq.UN,unidade.eq.KG,unidade.eq.M,unidade.eq.VB,unidade.eq.CX,unidade.eq.SC,unidade.eq.DIA');
          
        if (insToFix && insToFix.length > 0) {
          console.log(`Fixing ${insToFix.length} insumos with uppercase units...`);
          for (const item of insToFix) {
            await supabase.schema('engenharia')
              .from('insumos')
              .update({ unidade: item.unidade.toLowerCase().trim() })
              .eq('id', item.id);
          }
        }
      } catch (err) {
        console.error('Erro ao migrar unidades dos insumos:', err);
      }

      // 3. Correção de unidades maiúsculas para minúsculas nas composições
      try {
        const { data: compsToFix } = await supabase.schema('engenharia')
          .from('composicoes')
          .select('id, unidade')
          .or('unidade.eq.H,unidade.eq.MES,unidade.eq.UN,unidade.eq.KG,unidade.eq.M,unidade.eq.VB,unidade.eq.CX,unidade.eq.SC,unidade.eq.DIA');

        if (compsToFix && compsToFix.length > 0) {
          console.log(`Fixing ${compsToFix.length} compositions with uppercase units...`);
          for (const item of compsToFix) {
            await supabase.schema('engenharia')
              .from('composicoes')
              .update({ unidade: item.unidade.toLowerCase().trim() })
              .eq('id', item.id);
          }
        }
      } catch (err) {
        console.error('Erro ao migrar unidades das composições:', err);
      }
    };
    
    runMigration();
  }, []);

  const stats = [
    { name: 'Custo Total Ativo', value: 'R$ 0,00', icon: Calculator, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'BDI Atual', value: '0,00%', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { name: 'Curva A Cotada', value: '0%', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
    { name: 'Alertas Pendentes', value: '0', icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-100' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 group hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.name}</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico Placeholder */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Evolução do Orçamento</h3>
          <div className="h-64 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <span className="text-slate-400 font-medium">Gráfico de evolução (Em breve)</span>
          </div>
        </div>

        {/* Atividades Recentes */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Atividades Recentes</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-2 h-2 mt-2 rounded-full bg-emerald-500"></div>
              <div>
                <p className="text-sm font-medium text-slate-800">Sistema iniciado</p>
                <p className="text-xs text-slate-500">Agora mesmo</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
