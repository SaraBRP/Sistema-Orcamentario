import React from 'react';

interface CroquiVigaBaldrameProps {
  compact?: boolean;
}

export const CroquiVigaBaldrame: React.FC<CroquiVigaBaldrameProps> = ({ compact = false }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Croqui Esquemático - Viga Baldrame</h4>
      </div>

      {/* Grid de Desenhos CAD (Seção Transversal + Comprimento) */}
      <div className={`grid ${compact ? 'grid-cols-1 gap-2' : 'grid-cols-1 md:grid-cols-2 gap-3'} bg-slate-50/60 rounded-lg p-2.5 border border-slate-100`}>
        
        {/* 1. SEÇÃO TRANSVERSAL (L x H) */}
        <div className="flex flex-col items-center justify-center bg-white p-2 rounded-md border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Seção Transversal (L x H)</span>
          <svg viewBox="0 0 240 180" className="w-full h-auto max-h-40">
            <defs>
              <marker id="arrow-red-viga" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
              </marker>
            </defs>

            {/* Linha de Cota Solo (y=28) */}
            <line x1="20" y1="28" x2="220" y2="28" stroke="#475569" strokeWidth="1.2" />
            <polygon points="60,28 54,18 66,18" fill="#dc2626" />
            <text x="60" y="14" fill="#dc2626" fontSize="9" textAnchor="middle" fontWeight="bold">Cota solo</text>

            {/* Linha de Cota Topo Viga (y=60) */}
            <line x1="20" y1="60" x2="220" y2="60" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" />
            <polygon points="180,60 174,50 186,50" fill="#dc2626" />
            <text x="180" y="46" fill="#dc2626" fontSize="9" textAnchor="middle" fontWeight="bold">Cota topo viga</text>

            {/* Viga Baldrame (Retângulo x=75, y=60, width=90, height=75) */}
            <rect x="75" y="60" width="90" height="75" fill="#e2e8f0" stroke="#334155" strokeWidth="1.5" />

            {/* Lastro Magro (y=135, height=8) */}
            <rect x="65" y="135" width="110" height="8" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 1" />
            <text x="120" y="141" fill="#64748b" fontSize="7" textAnchor="middle">Lastro magro (5cm)</text>

            {/* Cota Vermelha Hsolo-topo (Esquerda: entre y=28 e y=60) */}
            <line x1="35" y1="28" x2="35" y2="60" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-viga)" markerEnd="url(#arrow-red-viga)" />
            <text x="30" y="47" fill="#dc2626" fontSize="8" textAnchor="end" fontWeight="bold">Hsolo-topo</text>

            {/* Cota Vermelha Altura H (Direita: entre y=60 e y=135) */}
            <line x1="180" y1="60" x2="180" y2="135" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-viga)" markerEnd="url(#arrow-red-viga)" />
            <text x="186" y="100" fill="#dc2626" fontSize="9" textAnchor="start" fontWeight="bold">H (Altura)</text>

            {/* Cota Vermelha Largura L (Abaixo da Viga: y=155, entre x=75 e x=165) */}
            <line x1="75" y1="155" x2="165" y2="155" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-viga)" markerEnd="url(#arrow-red-viga)" />
            <line x1="75" y1="145" x2="75" y2="162" stroke="#dc2626" strokeWidth="0.8" />
            <line x1="165" y1="145" x2="165" y2="162" stroke="#dc2626" strokeWidth="0.8" />
            <text x="120" y="170" fill="#dc2626" fontSize="9" textAnchor="middle" fontWeight="bold">L (Largura)</text>
          </svg>
        </div>

        {/* 2. PERSPECTIVA / ELEVAÇÃO DA VIGA */}
        <div className="flex flex-col items-center justify-center bg-white p-2 rounded-md border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Perspectiva de Comprimento (C)</span>
          <svg viewBox="0 0 240 180" className="w-full h-auto max-h-40">
            {/* Bloco 3D da Viga */}
            <polygon points="30,90 170,90 200,60 60,60" fill="#cbd5e1" stroke="#334155" strokeWidth="1.2" />
            <polygon points="170,90 170,135 200,105 200,60" fill="#94a3b8" stroke="#334155" strokeWidth="1.2" />
            <polygon points="30,90 170,90 170,135 30,135" fill="#e2e8f0" stroke="#334155" strokeWidth="1.5" />

            {/* Cota Comprimento (C) */}
            <line x1="30" y1="155" x2="170" y2="155" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-viga)" markerEnd="url(#arrow-red-viga)" />
            <line x1="30" y1="140" x2="30" y2="162" stroke="#dc2626" strokeWidth="0.8" />
            <line x1="170" y1="140" x2="170" y2="162" stroke="#dc2626" strokeWidth="0.8" />
            <text x="100" y="170" fill="#dc2626" fontSize="10" textAnchor="middle" fontWeight="bold">C (Comprimento)</text>
          </svg>
        </div>
      </div>
    </div>
  );
};
