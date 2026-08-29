import React from 'react';

export type TipoPremoldadoCroqui = 'pilar' | 'viga';

interface CroquiPremoldadoProps {
  tipoInicial?: TipoPremoldadoCroqui;
}

export const CroquiPremoldado: React.FC<CroquiPremoldadoProps> = ({ tipoInicial = 'pilar' }) => {
  const [tipo, setTipo] = React.useState<TipoPremoldadoCroqui>(tipoInicial);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Croqui CAD Esquemático - Elementos Pré-Moldados
          </h4>
        </div>

        {/* Seletor de Tipo de Peça Pré-Moldada */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setTipo('pilar')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${tipo === 'pilar' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Pilar Pré-Moldado
          </button>
          <button
            type="button"
            onClick={() => setTipo('viga')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${tipo === 'viga' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Viga Pré-Moldada
          </button>
        </div>
      </div>

      {/* Grid de Desenhos CAD (Seção Transversal + Elevação 3D) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/60 rounded-lg p-2.5 border border-slate-100">
        {/* 1. SEÇÃO TRANSVERSAL */}
        <div className="flex flex-col items-center justify-center bg-white p-2 rounded-md border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">
            Seção Transversal ({tipo === 'pilar' ? 'B x H' : 'Largura x Altura'})
          </span>
          <svg viewBox="0 0 240 180" className="w-full h-auto max-h-40">
            <defs>
              <marker id="arrow-red-pre" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
              </marker>
            </defs>

            {/* Retângulo do Pilar/Viga */}
            <rect x="75" y="40" width="90" height="100" fill="#cbd5e1" stroke="#334155" strokeWidth="1.5" />
            
            {/* Indicação de Fôrmas Laterais / Compensado (Linhas Azuis Tracejadas) */}
            <line x1="68" y1="35" x2="68" y2="145" stroke="#2563eb" strokeWidth="2" strokeDasharray="4 2" />
            <line x1="172" y1="35" x2="172" y2="145" stroke="#2563eb" strokeWidth="2" strokeDasharray="4 2" />
            <text x="60" y="90" fill="#2563eb" fontSize="7" textAnchor="end" fontWeight="bold">Fôrma</text>
            <text x="180" y="90" fill="#2563eb" fontSize="7" textAnchor="start" fontWeight="bold">Fôrma</text>

            {/* Cota Vermelha Altura/Maior Dimensão H */}
            <line x1="195" y1="40" x2="195" y2="140" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-pre)" markerEnd="url(#arrow-red-pre)" />
            <text x="200" y="94" fill="#dc2626" fontSize="9" textAnchor="start" fontWeight="bold">H (Maior Dim)</text>

            {/* Cota Vermelha Largura/Menor Dimensão B */}
            <line x1="75" y1="158" x2="165" y2="158" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-pre)" markerEnd="url(#arrow-red-pre)" />
            <line x1="75" y1="145" x2="75" y2="165" stroke="#dc2626" strokeWidth="0.8" />
            <line x1="165" y1="145" x2="165" y2="165" stroke="#dc2626" strokeWidth="0.8" />
            <text x="120" y="172" fill="#dc2626" fontSize="9" textAnchor="middle" fontWeight="bold">B (Menor Dim)</text>
          </svg>
        </div>

        {/* 2. ELEVAÇÃO / PERSPECTIVA DE COMPRIMENTO */}
        <div className="flex flex-col items-center justify-center bg-white p-2 rounded-md border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">
            {tipo === 'pilar' ? 'Elevação do Pilar (Altura L)' : 'Perspectiva da Viga (Comprimento L)'}
          </span>
          <svg viewBox="0 0 240 180" className="w-full h-auto max-h-40">
            {tipo === 'pilar' ? (
              <>
                {/* Pilar Vertical 3D */}
                <polygon points="90,20 130,20 150,35 110,35" fill="#cbd5e1" stroke="#334155" strokeWidth="1" />
                <polygon points="130,20 130,140 150,155 150,35" fill="#94a3b8" stroke="#334155" strokeWidth="1" />
                <polygon points="90,20 130,20 130,140 90,140" fill="#e2e8f0" stroke="#334155" strokeWidth="1.5" />
                
                {/* Consolo do Pilar */}
                <polygon points="130,70 155,70 155,90 130,80" fill="#94a3b8" stroke="#334155" strokeWidth="1" />

                {/* Cota Comprimento/Altura L */}
                <line x1="60" y1="20" x2="60" y2="140" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-pre)" markerEnd="url(#arrow-red-pre)" />
                <text x="50" y="84" fill="#dc2626" fontSize="9" textAnchor="end" fontWeight="bold">L (Comprimento)</text>
              </>
            ) : (
              <>
                {/* Viga Horizontal 3D */}
                <polygon points="30,80 170,80 200,55 60,55" fill="#cbd5e1" stroke="#334155" strokeWidth="1" />
                <polygon points="170,80 170,130 200,105 200,55" fill="#94a3b8" stroke="#334155" strokeWidth="1" />
                <polygon points="30,80 170,80 170,130 30,130" fill="#e2e8f0" stroke="#334155" strokeWidth="1.5" />

                {/* Cota Comprimento L */}
                <line x1="30" y1="150" x2="170" y2="150" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-pre)" markerEnd="url(#arrow-red-pre)" />
                <line x1="30" y1="135" x2="30" y2="158" stroke="#dc2626" strokeWidth="0.8" />
                <line x1="170" y1="135" x2="170" y2="158" stroke="#dc2626" strokeWidth="0.8" />
                <text x="100" y="165" fill="#dc2626" fontSize="10" textAnchor="middle" fontWeight="bold">L (Comprimento)</text>
              </>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
};
