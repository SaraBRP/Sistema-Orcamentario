import React from 'react';

interface CroquiSapataProps {
  compact?: boolean;
}

export const CroquiSapata: React.FC<CroquiSapataProps> = ({ compact = false }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Croqui Esquemático - Sapata Isolada</h4>
      </div>

      {/* Grid de Desenhos CAD (Planta + Corte) */}
      <div className={`grid ${compact ? 'grid-cols-1 gap-2' : 'grid-cols-1 md:grid-cols-2 gap-3'} bg-slate-50/60 rounded-lg p-2.5 border border-slate-100`}>
        
        {/* 1. PLANTA BAIXA (VISTA SUPERIOR CONFORME DESENHO CAD) */}
        <div className="flex flex-col items-center justify-center bg-white p-2 rounded-md border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Planta Baixa (Vista Superior)</span>
          <svg viewBox="0 0 240 220" className="w-full h-auto max-h-52 select-none">
            <defs>
              <marker id="arrow-red-sapata-cad" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
              </marker>
            </defs>

            {/* Base Retangular Maior (Cmaior x Lmaior) */}
            <rect x="35" y="60" width="150" height="100" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />

            {/* Topo Retangular Menor (Cmenor x Lmenor) */}
            <rect x="80" y="85" width="60" height="50" fill="#ffffff" stroke="#000000" strokeWidth="1.2" />

            {/* Pilar Central */}
            <rect x="95" y="97.5" width="30" height="25" fill="#ffffff" stroke="#000000" strokeWidth="1.2" />

            {/* Diagonais do Tronco de Pirâmide */}
            <line x1="35" y1="60" x2="80" y2="85" stroke="#000000" strokeWidth="1.2" />
            <line x1="185" y1="60" x2="140" y2="85" stroke="#000000" strokeWidth="1.2" />
            <line x1="35" y1="160" x2="80" y2="135" stroke="#000000" strokeWidth="1.2" />
            <line x1="185" y1="160" x2="140" y2="135" stroke="#000000" strokeWidth="1.2" />

            {/* Cotas Vermelhas Horizontais (Cmaior & Cmenor no Topo) */}
            {/* Cmaior (Topo Extremo) */}
            <line x1="35" y1="25" x2="185" y2="25" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-sapata-cad)" markerEnd="url(#arrow-red-sapata-cad)" />
            <line x1="35" y1="20" x2="35" y2="60" stroke="#dc2626" strokeWidth="0.8" />
            <line x1="185" y1="20" x2="185" y2="60" stroke="#dc2626" strokeWidth="0.8" />
            <text x="110" y="20" fill="#dc2626" fontSize="10" textAnchor="middle" fontWeight="bold">Cmaior</text>

            {/* Cmenor (Topo Interno) */}
            <line x1="80" y1="48" x2="140" y2="48" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-sapata-cad)" markerEnd="url(#arrow-red-sapata-cad)" />
            <line x1="80" y1="43" x2="80" y2="85" stroke="#dc2626" strokeWidth="0.8" />
            <line x1="140" y1="43" x2="140" y2="85" stroke="#dc2626" strokeWidth="0.8" />
            <text x="110" y="44" fill="#dc2626" fontSize="9" textAnchor="middle" fontWeight="bold">Cmenor</text>

            {/* Cotas Vermelhas Verticais (Lmaior & Lmenor na Direita) */}
            {/* Lmaior (Direita Extrema) */}
            <line x1="205" y1="60" x2="205" y2="160" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-sapata-cad)" markerEnd="url(#arrow-red-sapata-cad)" />
            <line x1="185" y1="60" x2="210" y2="60" stroke="#dc2626" strokeWidth="0.8" />
            <line x1="185" y1="160" x2="210" y2="160" stroke="#dc2626" strokeWidth="0.8" />
            <text x="212" y="113" fill="#dc2626" fontSize="10" textAnchor="start" fontWeight="bold">Lmaior</text>

            {/* Lmenor (Direita Interna) */}
            <line x1="160" y1="85" x2="160" y2="135" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-sapata-cad)" markerEnd="url(#arrow-red-sapata-cad)" />
            <line x1="140" y1="85" x2="165" y2="85" stroke="#dc2626" strokeWidth="0.8" />
            <line x1="140" y1="135" x2="165" y2="135" stroke="#dc2626" strokeWidth="0.8" />
            <text x="167" y="113" fill="#dc2626" fontSize="9" textAnchor="start" fontWeight="bold">Lmenor</text>
          </svg>
        </div>

        {/* 2. CORTE E ELEVAÇÃO (VISTA LATERAL CAD CONFORME PLANILHA) */}
        <div className="flex flex-col items-center justify-center bg-white p-2 rounded-md border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Corte Esquema (Elevação CAD)</span>
          <svg viewBox="0 0 280 260" className="w-full h-auto max-h-56 select-none">
            <defs>
              {/* Hachura de Solo */}
              <pattern id="hachura-solo-sap" width="8" height="8" patternUnits="userSpaceOnUse">
                <line x1="0" y1="8" x2="8" y2="0" stroke="#334155" strokeWidth="1" />
                <line x1="2" y1="8" x2="8" y2="2" stroke="#334155" strokeWidth="0.8" />
              </pattern>
            </defs>

            {/* ── 1. COTA SOLO & TERRENO HACHURADO ── */}
            <line x1="60" y1="45" x2="220" y2="45" stroke="#000000" strokeWidth="1.5" />
            {/* Hachura de solo à esquerda */}
            <rect x="70" y="46" width="35" height="12" fill="url(#hachura-solo-sap)" />
            {/* Triângulo Cota Solo */}
            <polygon points="170,45 164,35 176,35" fill="#dc2626" />
            <text x="170" y="31" fill="#dc2626" fontSize="9" textAnchor="middle" fontWeight="bold">Cota solo</text>

            {/* ── 2. PILAR DE ARRANQUE ── */}
            <rect x="110" y="20" width="30" height="90" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />

            {/* ── 3. SAPATA: TRONCO DE PIRÂMIDE (H2) & RODAPÉ RETO (H1) ── */}
            {/* Tronco de Pirâmide (H2) */}
            <polygon points="110,110 140,110 195,185 55,185" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />

            {/* Rodapé Retangular (H1) */}
            <rect x="55" y="185" width="140" height="35" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />

            {/* ── 4. COTA TOPO BLOCO ── */}
            <polygon points="145,110 139,100 151,100" fill="#dc2626" />
            <text x="145" y="96" fill="#dc2626" fontSize="8.5" textAnchor="middle" fontWeight="bold">Cota topo bloco</text>

            {/* ── 5. COTAS VERMELHAS H1 E H2 (ESQUERDA) ── */}
            {/* Linhas de chamada */}
            <line x1="20" y1="110" x2="110" y2="110" stroke="#dc2626" strokeWidth="0.8" />
            <line x1="20" y1="185" x2="55" y2="185" stroke="#dc2626" strokeWidth="0.8" />
            <line x1="20" y1="220" x2="55" y2="220" stroke="#dc2626" strokeWidth="0.8" />

            {/* Cota H2 (Tronco de Pirâmide) */}
            <line x1="30" y1="110" x2="30" y2="185" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-sapata-cad)" markerEnd="url(#arrow-red-sapata-cad)" />
            <text x="24" y="150" fill="#dc2626" fontSize="9" textAnchor="end" fontWeight="bold">H2</text>

            {/* Cota H1 (Rodapé Reto) */}
            <line x1="30" y1="185" x2="30" y2="220" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-sapata-cad)" markerEnd="url(#arrow-red-sapata-cad)" />
            <text x="24" y="205" fill="#dc2626" fontSize="9" textAnchor="end" fontWeight="bold">H1</text>
          </svg>
        </div>
      </div>
    </div>
  );
};
