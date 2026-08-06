import { useState, useEffect } from 'react';
import { CalculosHub } from '../components/calculos/CalculosHub';
import type { CalculoItem } from '../types/calculos';
import { supabase } from '../lib/supabase';

const LOCAL_STORAGE_KEY = 'brp_calculos_quantitativos_global';

export default function CalculosQuantitativosPage() {
  const [calculos, setCalculos] = useState<CalculoItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Tenta carregar do Supabase ou faz fallback para localStorage
  useEffect(() => {
    const loadFromSupabase = async () => {
      try {
        const { data, error } = await supabase
          .schema('engenharia')
          .from('memoria_calculo')
          .select('*');

        if (!error && data && data.length > 0) {
          const loaded: CalculoItem[] = data.map((d: any) => ({
            id: d.id,
            orcamento_id: d.orcamento_id || '',
            modulo_id: d.modulo_id,
            nome: d.nome,
            predioSetor: d.predio_setor || '',
            dataCriacao: d.created_at || new Date().toISOString(),
            dataAtualizacao: d.updated_at || new Date().toISOString(),
            parametros: d.parametros || {},
            resultados: d.resultados || {},
            vinculos: d.vinculos || []
          }));
          setCalculos(loaded);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(loaded));
        }
      } catch (err) {
        console.log('Usando persistência local para memórias de cálculo');
      }
    };

    loadFromSupabase();
  }, []);

  const handleSaveCalculo = (calculoToSave: CalculoItem) => {
    setCalculos((prev) => {
      const index = prev.findIndex((c) => c.id === calculoToSave.id);
      let updated: CalculoItem[];
      if (index >= 0) {
        updated = [...prev];
        updated[index] = calculoToSave;
      } else {
        updated = [calculoToSave, ...prev];
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    // Salva em background no Supabase se a tabela existir
    (async () => {
      try {
        await supabase
          .schema('engenharia')
          .from('memoria_calculo')
          .upsert({
            id: calculoToSave.id,
            modulo_id: calculoToSave.modulo_id,
            nome: calculoToSave.nome,
            predio_setor: calculoToSave.predioSetor,
            parametros: calculoToSave.parametros,
            resultados: calculoToSave.resultados,
            vinculos: calculoToSave.vinculos,
            updated_at: new Date().toISOString()
          });
      } catch (err) {
        console.log('Persistido localmente no navegador.');
      }
    })();
  };

  const handleDeleteCalculo = (id: string) => {
    setCalculos((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    (async () => {
      try {
        await supabase
          .schema('engenharia')
          .from('memoria_calculo')
          .delete()
          .eq('id', id);
      } catch (err) {
        console.log('Removido localmente no navegador.');
      }
    })();
  };

  return (
    <div className="space-y-6">
      {/* Header da Página */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            🧮 Sistema de Cálculos Quantitativos & Memoriais BRP
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Selecione uma disciplina abaixo para realizar o levantamento paramétrico ou memórias de cálculo quantitativas.
          </p>
        </div>
      </div>

      {/* Hub de Cálculos */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <CalculosHub
          orcamentoId=""
          calculos={calculos}
          itensEap={[]}
          onSaveCalculo={handleSaveCalculo}
          onDeleteCalculo={handleDeleteCalculo}
        />
      </div>
    </div>
  );
}
