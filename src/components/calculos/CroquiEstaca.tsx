import React, { useState } from 'react';

export type TipoEstacaCroqui = 'helice' | 'escavada' | 'pre_moldada' | 'raiz' | 'perfil_metalico';

interface CroquiEstacaProps {
  compact?: boolean;
  tipoInicial?: TipoEstacaCroqui;
}

export const CroquiEstaca: React.FC<CroquiEstacaProps> = ({ 
  compact = false,
  tipoInicial = 'helice'
}) => {
  const [tipo, setTipo] = useState<TipoEstacaCroqui>(tipoInicial);

  const getTituloTipo = (t: TipoEstacaCroqui) => {
    switch (t) {
      case 'helice': return 'Estaca Hélice Contínua';
      case 'escavada': return 'Estaca Escavada com Trado / Lama';
      case 'pre_moldada': return 'Estaca Pré-Moldada de Concreto';
      case 'raiz': return 'Estaca Raiz (Injeção de Argamassa)';
      case 'perfil_metalico': return 'Perfil Metálico Estrutural (I / H)';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
      {/* Abas de Seleção do Tipo de Estaca */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 flex-wrap gap-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Croqui Esquemático - {getTituloTipo(tipo)}
          </h4>
        </div>

        {!compact && (
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-semibold">
            <button
              type="button"
              onClick={() => setTipo('helice')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${tipo === 'helice' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Hélice
            </button>
            <button
              type="button"
              onClick={() => setTipo('escavada')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${tipo === 'escavada' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Escavada
            </button>
            <button
              type="button"
              onClick={() => setTipo('pre_moldada')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${tipo === 'pre_moldada' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Pré-Moldada
            </button>
            <button
              type="button"
              onClick={() => setTipo('raiz')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${tipo === 'raiz' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Raiz
            </button>
            <button
              type="button"
              onClick={() => setTipo('perfil_metalico')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${tipo === 'perfil_metalico' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Perfil Metálico
            </button>
          </div>
        )}
      </div>

      {/* Grid CAD de Desenhos (Planta + Elevação) */}
      <div className={`grid ${compact ? 'grid-cols-1 gap-2' : 'grid-cols-1 md:grid-cols-2 gap-3'} bg-slate-50/60 rounded-lg p-2.5 border border-slate-100`}>
        
        {/* 1. PLANTA BAIXA (SEÇÃO TRANSVERSAL DA ESTACA) */}
        <div className="flex flex-col items-center justify-center bg-white p-2 rounded-md border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Seção Transversal (Ø Estaca)</span>
          <svg viewBox="0 0 240 180" className="w-full h-auto max-h-40">
            <defs>
              <marker id="arrow-red-estaca" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
              </marker>
            </defs>

            {tipo === 'perfil_metalico' ? (
              /* Perfil Metálico H / I */
              <g>
                <rect x="70" y="40" width="100" height="15" fill="#334155" />
                <rect x="70" y="125" width="100" height="15" fill="#334155" />
                <rect x="112" y="55" width="16" height="70" fill="#475569" />
                {/* Cotas do Perfil */}
                <line x1="50" y1="40" x2="50" y2="140" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-estaca)" markerEnd="url(#arrow-red-estaca)" />
                <text x="42" y="93" fill="#dc2626" fontSize="9" textAnchor="end" fontWeight="bold">Alt Perfil</text>
              </g>
            ) : (
              /* Estaca Circular (Hélice, Escavada, Pré-moldada, Raiz) */
              <g>
                <circle cx="120" cy="90" r="50" fill="#cbd5e1" stroke="#1e293b" strokeWidth="2" />
                
                {/* Armação Interna (Estribos / Barras) */}
                <circle cx="120" cy="90" r="38" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="3 2" />
                <circle cx="120" cy="52" r="3.5" fill="#1e3a8a" />
                <circle cx="120" cy="128" r="3.5" fill="#1e3a8a" />
                <circle cx="82" cy="90" r="3.5" fill="#1e3a8a" />
                <circle cx="158" cy="90" r="3.5" fill="#1e3a8a" />

                {/* Eixos */}
                <line x1="40" y1="90" x2="200" y2="90" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 2" />
                <line x1="120" y1="10" x2="120" y2="170" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 2" />

                {/* Cota Ø estaca */}
                <line x1="70" y1="90" x2="170" y2="90" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-estaca)" markerEnd="url(#arrow-red-estaca)" />
                <text x="120" y="83" fill="#dc2626" fontSize="10" textAnchor="middle" fontWeight="bold">Ø estaca</text>
              </g>
            )}
          </svg>
        </div>

        {/* 2. CORTE E ELEVAÇÃO (GEOMETRIA NÍVEIS CONFORME DESENHO CAD) */}
        <div className="flex flex-col items-center justify-center bg-white p-2 rounded-md border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Corte Elevação CAD (Geometria Níveis)</span>
          <svg viewBox="0 0 280 320" className="w-full h-auto max-h-64 select-none">
            <defs>
              {/* Marcador Seta Vermelha para Cotas */}
              <marker id="arrow-red-estaca-cad" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
              </marker>

              {/* Hachura de Solo */}
              <pattern id="hachura-solo" width="8" height="8" patternUnits="userSpaceOnUse">
                <line x1="0" y1="8" x2="8" y2="0" stroke="#334155" strokeWidth="1" />
                <line x1="2" y1="8" x2="8" y2="2" stroke="#334155" strokeWidth="0.8" />
              </pattern>
            </defs>

            {/* ── 1. COTA SOLO (Nível de Terreno Natural) ── */}
            <line x1="75" y1="30" x2="215" y2="30" stroke="#000000" strokeWidth="1.5" />
            {/* Bloco de hachura do solo */}
            <rect x="85" y="31" width="35" height="12" fill="url(#hachura-solo)" />
            {/* Triângulo Cota Solo */}
            <polygon points="175,30 169,20 181,20" fill="#dc2626" />
            <text x="175" y="16" fill="#dc2626" fontSize="9" textAnchor="middle" fontWeight="bold">Cota solo</text>

            {/* ── 2. BLOCO DE FUNDAÇÃO ── */}
            <rect x="90" y="70" width="110" height="55" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />
            {/* Triângulo Cota Topo Bloco */}
            <polygon points="145,70 139,60 151,60" fill="#dc2626" />
            <text x="145" y="56" fill="#dc2626" fontSize="8.5" textAnchor="middle" fontWeight="bold">Cota topo bloco</text>

            {/* ── 3. FUSTE DA ESTACA / SHAFTS ── */}
            {/* A cabeça da estaca penetra ligeiramente no bloco até a Cota Arrasamento */}
            <rect x="120" y="110" width="50" height="180" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />

            {/* Triângulo Cota Arrasamento (Cabeça da Estaca) */}
            <polygon points="145,110 139,100 151,100" fill="#dc2626" />
            <text x="145" y="96" fill="#dc2626" fontSize="8.5" textAnchor="middle" fontWeight="bold">Cota arrasamento</text>

            {/* Armação interna (gaiola da estaca) */}
            <line x1="126" y1="110" x2="126" y2="250" stroke="#2563eb" strokeWidth="1.2" strokeDasharray="3 2" />
            <line x1="164" y1="110" x2="164" y2="250" stroke="#2563eb" strokeWidth="1.2" strokeDasharray="3 2" />

            {/* ── 4. COTA APOIO (Fundo da Estaca) ── */}
            {/* Triângulo Cota Apoio */}
            <polygon points="145,290 139,280 151,280" fill="#dc2626" />
            <text x="145" y="276" fill="#dc2626" fontSize="8.5" textAnchor="middle" fontWeight="bold">Cota apoio</text>

            {/* ── 5. COTAS VERMELHAS DIREITAS (H solo-topo & H bloco) ── */}
            {/* Cota H solo-topo */}
            <line x1="215" y1="30" x2="255" y2="30" stroke="#dc2626" strokeWidth="0.8" />
            <line x1="200" y1="70" x2="255" y2="70" stroke="#dc2626" strokeWidth="0.8" />
            <line x1="245" y1="30" x2="245" y2="70" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-estaca-cad)" markerEnd="url(#arrow-red-estaca-cad)" />
            <text x="250" y="52" fill="#dc2626" fontSize="8.5" fontWeight="bold" textAnchor="start">H solo-topo</text>

            {/* Cota H bloco */}
            <line x1="200" y1="125" x2="255" y2="125" stroke="#dc2626" strokeWidth="0.8" />
            <line x1="245" y1="70" x2="245" y2="125" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-estaca-cad)" markerEnd="url(#arrow-red-estaca-cad)" />
            <text x="250" y="100" fill="#dc2626" fontSize="8.5" fontWeight="bold" textAnchor="start">H bloco</text>

            {/* ── 6. COTAS VERMELHAS ESQUERDAS (Comprimento Total & Comprimento Útil) ── */}
            {/* Linhas de chamada de altura */}
            <line x1="20" y1="30" x2="120" y2="30" stroke="#dc2626" strokeWidth="0.8" />
            <line x1="40" y1="110" x2="120" y2="110" stroke="#dc2626" strokeWidth="0.8" />
            <line x1="20" y1="290" x2="120" y2="290" stroke="#dc2626" strokeWidth="0.8" />

            {/* Comprimento Total (Far Left) */}
            <line x1="25" y1="30" x2="25" y2="290" stroke="#dc2626" strokeWidth="1.2" markerStart="url(#arrow-red-estaca-cad)" markerEnd="url(#arrow-red-estaca-cad)" />
            <text 
              x="18" 
              y="160" 
              fill="#dc2626" 
              fontSize="9" 
              fontWeight="bold" 
              textAnchor="middle" 
              transform="rotate(-90 18 160)"
            >
              Comprimento Total
            </text>

            {/* Comprimento Útil (Inner Left) */}
            <line x1="48" y1="110" x2="48" y2="290" stroke="#dc2626" strokeWidth="1.2" markerStart="url(#arrow-red-estaca-cad)" markerEnd="url(#arrow-red-estaca-cad)" />
            <text 
              x="41" 
              y="200" 
              fill="#dc2626" 
              fontSize="9" 
              fontWeight="bold" 
              textAnchor="middle" 
              transform="rotate(-90 41 200)"
            >
              Comprimento Útil
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
};
