import React, { useState } from 'react';

export type TipoBlocoCroqui = 'moldado' | 'tres_estacas' | 'pre_moldado' | 'tres_estacas_pre';

interface CroquiBlocoProps {
  compact?: boolean;
  tipoInicial?: TipoBlocoCroqui;
}

export const CroquiBloco: React.FC<CroquiBlocoProps> = ({ compact = false, tipoInicial = 'moldado' }) => {
  const [tipo, setTipo] = useState<TipoBlocoCroqui>(tipoInicial);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Croqui Esquemático - Blocos de Fundação</h4>
        </div>

        {/* Abas de Seleção de Tipo de Bloco */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-[10.5px]">
          <button
            type="button"
            onClick={() => setTipo('moldado')}
            className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
              tipo === 'moldado' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Pilar Moldado In Loco
          </button>
          <button
            type="button"
            onClick={() => setTipo('tres_estacas')}
            className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
              tipo === 'tres_estacas' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            3 Estacas
          </button>
          <button
            type="button"
            onClick={() => setTipo('pre_moldado')}
            className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
              tipo === 'pre_moldado' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Pilar Pré-Moldado
          </button>
          <button
            type="button"
            onClick={() => setTipo('tres_estacas_pre')}
            className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
              tipo === 'tres_estacas_pre' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            3 Estacas Pré (Cálice)
          </button>
        </div>
      </div>

      {/* Grid CAD de Desenhos (Planta + Corte) */}
      <div className={`grid ${compact ? 'grid-cols-1 gap-2' : 'grid-cols-1 md:grid-cols-2 gap-3'} bg-slate-50/60 rounded-lg p-2.5 border border-slate-100`}>
        
        {/* 1. PLANTA BAIXA (VISTA SUPERIOR DADOS GEOMÉTRICOS) */}
        <div className="flex flex-col items-center justify-center bg-white p-2 rounded-md border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">
            Planta Baixa ({
              tipo === 'moldado' ? 'Pilar Moldado In Loco' :
              tipo === 'tres_estacas' ? 'Bloco para 3 Estacas' :
              tipo === 'pre_moldado' ? 'Bloco com Cálice Pré-Moldado' :
              'Bloco 3 Estacas Pré (Cálice)'
            })
          </span>

          <svg viewBox="0 0 240 180" className="w-full h-auto max-h-40">
            <defs>
              <marker id="arrow-red-bloco" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
              </marker>
            </defs>

            {/* TIPO 1: Pilar Moldado In Loco (Base Retangular + Tronco) */}
            {tipo === 'moldado' && (
              <>
                {/* Base Retangular A x B */}
                <rect x="40" y="35" width="160" height="100" fill="none" stroke="#334155" strokeWidth="2" />
                {/* Topo Tronco a x b */}
                <rect x="85" y="60" width="70" height="50" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
                {/* Pilar Central */}
                <rect x="105" y="75" width="30" height="20" fill="#cbd5e1" stroke="#1e293b" strokeWidth="1.5" />
                {/* Diagonais do Tronco */}
                <line x1="40" y1="35" x2="85" y2="60" stroke="#64748b" strokeWidth="1" strokeDasharray="3 2" />
                <line x1="200" y1="35" x2="155" y2="60" stroke="#64748b" strokeWidth="1" strokeDasharray="3 2" />
                <line x1="40" y1="135" x2="85" y2="110" stroke="#64748b" strokeWidth="1" strokeDasharray="3 2" />
                <line x1="200" y1="135" x2="155" y2="110" stroke="#64748b" strokeWidth="1" strokeDasharray="3 2" />

                {/* Cotas A & B */}
                <line x1="40" y1="20" x2="200" y2="20" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-bloco)" markerEnd="url(#arrow-red-bloco)" />
                <text x="120" y="16" fill="#dc2626" fontSize="10" textAnchor="middle" fontWeight="bold">A (Comprimento)</text>
                <line x1="215" y1="35" x2="215" y2="135" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-bloco)" markerEnd="url(#arrow-red-bloco)" />
                <text x="225" y="90" fill="#dc2626" fontSize="10" textAnchor="start" fontWeight="bold">B (Largura)</text>
              </>
            )}

            {/* TIPO 2: Bloco 3 Estacas (Geometria Triangular Prismática) */}
            {tipo === 'tres_estacas' && (
              <>
                {/* Triângulo do Bloco */}
                <polygon points="120,25 40,145 200,145" fill="#f8fafc" stroke="#334155" strokeWidth="2" />
                {/* 3 Estacas Circulares nos Vértices */}
                <circle cx="120" cy="55" r="14" fill="#e2e8f0" stroke="#0284c7" strokeWidth="1.5" />
                <circle cx="70" cy="125" r="14" fill="#e2e8f0" stroke="#0284c7" strokeWidth="1.5" />
                <circle cx="170" cy="125" r="14" fill="#e2e8f0" stroke="#0284c7" strokeWidth="1.5" />
                {/* Pilar Central */}
                <rect x="107" y="85" width="26" height="20" fill="#cbd5e1" stroke="#1e293b" strokeWidth="1.5" />

                {/* Cotas Eixo entre Estacas */}
                <line x1="70" y1="125" x2="170" y2="125" stroke="#dc2626" strokeWidth="1" strokeDasharray="3 2" />
                <line x1="70" y1="160" x2="170" y2="160" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-bloco)" markerEnd="url(#arrow-red-bloco)" />
                <text x="120" y="174" fill="#dc2626" fontSize="9" textAnchor="middle" fontWeight="bold">E (Distância eixos)</text>
              </>
            )}

            {/* TIPO 3: Pilar Pré-Moldado (Cálice de Encaixe) */}
            {tipo === 'pre_moldado' && (
              <>
                {/* Base do Bloco */}
                <rect x="40" y="35" width="160" height="100" fill="none" stroke="#334155" strokeWidth="2" />
                {/* Parede Colarinho do Cálice */}
                <rect x="75" y="55" width="90" height="60" fill="#f1f5f9" stroke="#475569" strokeWidth="1.5" />
                {/* Cavidade Interna do Cálice (a_cálice x b_cálice) */}
                <rect x="90" y="65" width="60" height="40" fill="#cbd5e1" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="4 2" />

                <text x="120" y="88" fill="#dc2626" fontSize="9" textAnchor="middle" fontWeight="bold">Cálice de Encaixe</text>
                <line x1="40" y1="20" x2="200" y2="20" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-bloco)" markerEnd="url(#arrow-red-bloco)" />
                <text x="120" y="16" fill="#dc2626" fontSize="9" textAnchor="middle" fontWeight="bold">A (Comprimento)</text>
                <line x1="215" y1="35" x2="215" y2="135" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-bloco)" markerEnd="url(#arrow-red-bloco)" />
                <text x="225" y="90" fill="#dc2626" fontSize="9" textAnchor="start" fontWeight="bold">B (Largura)</text>
              </>
            )}

            {/* TIPO 4: 3 Estacas Pré (Triangular com Cálice) */}
            {tipo === 'tres_estacas_pre' && (
              <>
                {/* Triângulo do Bloco */}
                <polygon points="120,25 40,145 200,145" fill="#f8fafc" stroke="#334155" strokeWidth="2" />
                {/* 3 Estacas */}
                <circle cx="120" cy="55" r="14" fill="#e2e8f0" stroke="#0284c7" strokeWidth="1.5" />
                <circle cx="70" cy="125" r="14" fill="#e2e8f0" stroke="#0284c7" strokeWidth="1.5" />
                <circle cx="170" cy="125" r="14" fill="#e2e8f0" stroke="#0284c7" strokeWidth="1.5" />
                {/* Cálice de Encaixe Central */}
                <rect x="95" y="80" width="50" height="35" fill="#cbd5e1" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="3 2" />
                <text x="120" y="101" fill="#dc2626" fontSize="8" textAnchor="middle" fontWeight="bold">Cálice Pré</text>

                <line x1="70" y1="160" x2="170" y2="160" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-bloco)" markerEnd="url(#arrow-red-bloco)" />
                <text x="120" y="174" fill="#dc2626" fontSize="9" textAnchor="middle" fontWeight="bold">E (Eixo Estacas)</text>
              </>
            )}
          </svg>
        </div>

        {/* 2. CORTE E ELEVAÇÃO (VISTA LATERAL CAD COM COTAS DE ALTURA) */}
        <div className="flex flex-col items-center justify-center bg-white p-2 rounded-md border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Corte Esquema (Elevação CAD)</span>
          <svg viewBox="0 0 240 180" className="w-full h-auto max-h-40">
            {/* Linha de Cota Solo */}
            <line x1="30" y1="28" x2="210" y2="28" stroke="#475569" strokeWidth="1.2" />
            <polygon points="120,28 114,18 126,18" fill="#dc2626" />
            <text x="120" y="14" fill="#dc2626" fontSize="9" textAnchor="middle" fontWeight="bold">Cota solo</text>

            {/* Linha Tracejada Cota Topo Bloco */}
            <line x1="30" y1="65" x2="210" y2="65" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" />
            <polygon points="75,65 69,55 81,55" fill="#dc2626" />
            <text x="75" y="50" fill="#dc2626" fontSize="9" textAnchor="middle" fontWeight="bold">Cota topo bloco</text>

            {/* Pilar / Bloco Geometria em Elevação */}
            {tipo === 'pre_moldado' || tipo === 'tres_estacas_pre' ? (
              <>
                {/* Bloco com Cavidade do Cálice */}
                <rect x="55" y="65" width="130" height="85" fill="#e2e8f0" stroke="#334155" strokeWidth="1.5" />
                {/* Cavidade Interna do Cálice */}
                <polygon points="90,65 150,65 145,115 95,115" fill="#ffffff" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="3 2" />
                <text x="120" y="90" fill="#dc2626" fontSize="8" textAnchor="middle">Cálice (h_cálice)</text>
              </>
            ) : (
              <>
                {/* Pilar In Loco */}
                <rect x="105" y="28" width="30" height="37" fill="#e2e8f0" stroke="#334155" strokeWidth="1.5" />
                {/* Bloco Retangular / Tronco */}
                <polygon points="105,65 135,65 185,95 55,95" fill="#f1f5f9" stroke="#334155" strokeWidth="1.5" />
                <rect x="55" y="95" width="130" height="55" fill="#e2e8f0" stroke="#334155" strokeWidth="1.5" />
              </>
            )}

            {/* Estacas de Fundação no fundo do bloco */}
            <rect x="70" y="150" width="20" height="15" fill="#cbd5e1" stroke="#0284c7" strokeWidth="1" />
            <rect x="150" y="150" width="20" height="15" fill="#cbd5e1" stroke="#0284c7" strokeWidth="1" />

            {/* Lastro Magro */}
            <rect x="50" y="150" width="140" height="6" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 1" />
            <text x="120" y="155" fill="#64748b" fontSize="7" textAnchor="middle">Lastro magro (5cm)</text>

            {/* Cotas Vermelhas Hsolo-topo e Altura Total H */}
            <line x1="195" y1="28" x2="195" y2="65" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-bloco)" markerEnd="url(#arrow-red-bloco)" />
            <text x="202" y="50" fill="#dc2626" fontSize="8" textAnchor="start" fontWeight="bold">Hsolo-topo</text>

            <line x1="45" y1="65" x2="45" y2="150" stroke="#dc2626" strokeWidth="1" markerStart="url(#arrow-red-bloco)" markerEnd="url(#arrow-red-bloco)" />
            <text x="38" y="110" fill="#dc2626" fontSize="9" textAnchor="end" fontWeight="bold">H total</text>
          </svg>
        </div>
      </div>
    </div>
  );
};
