import React from 'react';

interface CroquiTubulaoProps {
  compact?: boolean;
}

export const CroquiTubulao: React.FC<CroquiTubulaoProps> = ({ compact = false }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Croqui Esquemático - Tubulão de Fundação</h4>
      </div>

      {/* Grid CAD de Desenhos (Planta + Elevação) */}
      <div className={`grid ${compact ? 'grid-cols-1 gap-2' : 'grid-cols-1 md:grid-cols-2 gap-3'} bg-slate-50/60 rounded-lg p-2.5 border border-slate-100`}>
        
        {/* 1. PLANTA BAIXA (VISTA SUPERIOR DA BASE E FUSTE) */}
        <div className="flex flex-col items-center justify-center bg-white p-2 rounded-md border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Planta Baixa (Fuste & Base Alargada)</span>
          <svg viewBox="0 0 240 200" className="w-full h-auto max-h-48">
            <defs>
              <marker id="arrow-red-tubulao" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
              </marker>
            </defs>

            {/* Círculo Externo da Base Alargada (Diâmetro Base) */}
            <circle cx="120" cy="95" r="60" fill="#ffffff" stroke="#000000" strokeWidth="1.8" />

            {/* Círculo Interno do Fuste (Diâmetro Fuste) */}
            <circle cx="120" cy="95" r="28" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />

            {/* Linhas de Eixo Cruzadas */}
            <line x1="30" y1="95" x2="210" y2="95" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 2" />
            <line x1="120" y1="10" x2="120" y2="180" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 2" />

            {/* Cota Diâmetro Fuste (Diâmetro Interno) */}
            <line x1="92" y1="95" x2="148" y2="95" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-tubulao)" markerEnd="url(#arrow-red-tubulao)" />
            <text x="120" y="88" fill="#dc2626" fontSize="9" textAnchor="middle" fontWeight="bold">Diâmetro Fuste</text>

            {/* Cota Diâmetro Base (Diâmetro da Base Alargada) */}
            <line x1="60" y1="168" x2="180" y2="168" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-tubulao)" markerEnd="url(#arrow-red-tubulao)" />
            <line x1="60" y1="152" x2="60" y2="174" stroke="#dc2626" strokeWidth="0.8" />
            <line x1="180" y1="152" x2="180" y2="174" stroke="#dc2626" strokeWidth="0.8" />
            <text x="120" y="183" fill="#dc2626" fontSize="9" textAnchor="middle" fontWeight="bold">Diâmetro Base</text>
          </svg>
        </div>

        {/* 2. CORTE E ELEVAÇÃO (VISTA LATERAL CAD DO TUBULÃO CONFORME PLANILHA) */}
        <div className="flex flex-col items-center justify-center bg-white p-2 rounded-md border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Corte Esquema (Elevação CAD)</span>
          <svg viewBox="0 0 280 330" className="w-full h-auto max-h-64 select-none">
            <defs>
              <marker id="arrow-red-tubulao-cad" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
              </marker>

              {/* Hachura de Solo */}
              <pattern id="hachura-solo-tub" width="8" height="8" patternUnits="userSpaceOnUse">
                <line x1="0" y1="8" x2="8" y2="0" stroke="#334155" strokeWidth="1" />
                <line x1="2" y1="8" x2="8" y2="2" stroke="#334155" strokeWidth="0.8" />
              </pattern>
            </defs>

            {/* ── 1. COTA SOLO (Nível de Terreno Natural) ── */}
            <line x1="75" y1="30" x2="215" y2="30" stroke="#000000" strokeWidth="1.5" />
            {/* Bloco de hachura do solo */}
            <rect x="85" y="31" width="35" height="12" fill="url(#hachura-solo-tub)" />
            {/* Triângulo Cota Solo */}
            <polygon points="175,30 169,20 181,20" fill="#dc2626" />
            <text x="175" y="16" fill="#dc2626" fontSize="9" textAnchor="middle" fontWeight="bold">Cota solo</text>

            {/* ── 2. COTA ARRASAMENTO & FUSTE ── */}
            {/* Triângulo Cota Arrasamento */}
            <polygon points="145,90 139,80 151,80" fill="#dc2626" />
            <text x="145" y="76" fill="#dc2626" fontSize="8.5" textAnchor="middle" fontWeight="bold">Cota arrasamento</text>

            {/* Fuste Vertical */}
            <rect x="120" y="90" width="50" height="155" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />

            {/* Cota Diâmetro Fuste (Topo do Fuste) */}
            <line x1="120" y1="102" x2="170" y2="102" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-tubulao-cad)" markerEnd="url(#arrow-red-tubulao-cad)" />
            <text x="145" y="99" fill="#dc2626" fontSize="8" textAnchor="middle" fontWeight="bold">Diâmetro Fuste</text>

            {/* ── 3. BASE TRONCO-CÔNICA E RODAPÉ (SKIRT) ── */}
            {/* Parte Cônica (H2base) */}
            <polygon points="120,245 170,245 195,270 95,270" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />

            {/* Rodapé Reto (H1base) */}
            <rect x="95" y="270" width="100" height="20" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />

            {/* ── 4. COTA APOIO (Fundo do Tubulão) ── */}
            {/* Triângulo Cota Apoio */}
            <polygon points="145,290 139,280 151,280" fill="#dc2626" />
            <text x="145" y="276" fill="#dc2626" fontSize="8.5" textAnchor="middle" fontWeight="bold">Cota apoio</text>

            {/* Cota Diâmetro Base (Abaixo do Fundo) */}
            <line x1="95" y1="305" x2="195" y2="305" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-tubulao-cad)" markerEnd="url(#arrow-red-tubulao-cad)" />
            <line x1="95" y1="290" x2="95" y2="310" stroke="#dc2626" strokeWidth="0.8" />
            <line x1="195" y1="290" x2="195" y2="310" stroke="#dc2626" strokeWidth="0.8" />
            <text x="145" y="318" fill="#dc2626" fontSize="8.5" textAnchor="middle" fontWeight="bold">Diâmetro Base</text>

            {/* ── 5. COTAS VERMELHAS DIREITAS (H1base & H2base) ── */}
            {/* Linhas de chamada de altura da base */}
            <line x1="170" y1="245" x2="225" y2="245" stroke="#dc2626" strokeWidth="0.8" />
            <line x1="195" y1="270" x2="225" y2="270" stroke="#dc2626" strokeWidth="0.8" />
            <line x1="195" y1="290" x2="225" y2="290" stroke="#dc2626" strokeWidth="0.8" />

            {/* H2base (Parte cônica) */}
            <line x1="215" y1="245" x2="215" y2="270" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-tubulao-cad)" markerEnd="url(#arrow-red-tubulao-cad)" />
            <text x="220" y="260" fill="#dc2626" fontSize="8" fontWeight="bold" textAnchor="start">H2base</text>

            {/* H1base (Rodapé reto) */}
            <line x1="215" y1="270" x2="215" y2="290" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-tubulao-cad)" markerEnd="url(#arrow-red-tubulao-cad)" />
            <text x="220" y="283" fill="#dc2626" fontSize="8" fontWeight="bold" textAnchor="start">H1base</text>

            {/* ── 6. COTAS VERMELHAS ESQUERDAS (H Perfuração & H Útil Fuste) ── */}
            {/* Linhas de chamada de altura */}
            <line x1="20" y1="30" x2="120" y2="30" stroke="#dc2626" strokeWidth="0.8" />
            <line x1="40" y1="90" x2="120" y2="90" stroke="#dc2626" strokeWidth="0.8" />
            <line x1="20" y1="290" x2="95" y2="290" stroke="#dc2626" strokeWidth="0.8" />

            {/* H Perfuração (Far Left) */}
            <line x1="25" y1="30" x2="25" y2="290" stroke="#dc2626" strokeWidth="1.2" markerStart="url(#arrow-red-tubulao-cad)" markerEnd="url(#arrow-red-tubulao-cad)" />
            <text 
              x="18" 
              y="160" 
              fill="#dc2626" 
              fontSize="9" 
              fontWeight="bold" 
              textAnchor="middle" 
              transform="rotate(-90 18 160)"
            >
              H Perfuração
            </text>

            {/* H Útil Fuste (Inner Left) */}
            <line x1="48" y1="90" x2="48" y2="290" stroke="#dc2626" strokeWidth="1.2" markerStart="url(#arrow-red-tubulao-cad)" markerEnd="url(#arrow-red-tubulao-cad)" />
            <text 
              x="41" 
              y="190" 
              fill="#dc2626" 
              fontSize="9" 
              fontWeight="bold" 
              textAnchor="middle" 
              transform="rotate(-90 41 190)"
            >
              H Útil Fuste
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
};
