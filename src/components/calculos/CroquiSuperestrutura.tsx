import React from 'react';
import { Layers } from 'lucide-react';

interface Props {
  larguraVigaM?: number; // 0.50
  alturaVigaM?: number; // 1.30
  larguraPilarM?: number; // 0.50
  alturaPilarM?: number; // 10.0
  espessuraLajeM?: number; // 0.15
  peDireitoM?: number; // 4.0
  tipoPilar?: 'RETANGULAR' | 'CIRCULAR';
}

export const CroquiSuperestrutura: React.FC<Props> = ({
  larguraVigaM = 0.50,
  alturaVigaM = 1.30,
  larguraPilarM = 0.50,
  alturaPilarM = 10.0,
  espessuraLajeM = 0.15,
  peDireitoM = 4.0,
  tipoPilar = 'RETANGULAR'
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
          <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>CROQUI CAD ESQUEMÁTICO - CORTE DE SUPERESTRUTURA (PILAR + VIGA + LAJE)</span>
          </h4>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-indigo-100 text-indigo-800">
          Superestrutura (In-Loco / Pré-Moldado)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Esquema Visual CAD */}
        <div className="bg-slate-900 rounded-xl p-4 flex flex-col items-center justify-center min-h-[210px] relative overflow-hidden text-white border border-slate-800 shadow-inner">
          <svg className="w-full h-48" viewBox="0 0 400 200">
            {/* Linha de Piso Inferior */}
            <line x1="20" y1="170" x2="380" y2="170" stroke="#64748b" strokeWidth="2" />
            <text x="30" y="185" fill="#94a3b8" fontSize="8" fontWeight="bold">Piso Inferior (Cota 0.00)</text>

            {/* Pilares Estruturais (Esquerda e Direita) */}
            {tipoPilar === 'CIRCULAR' ? (
              <>
                <rect x="70" y="55" width="30" height="115" fill="#4338ca" stroke="#818cf8" strokeWidth="1.5" rx="15" />
                <rect x="300" y="55" width="30" height="115" fill="#4338ca" stroke="#818cf8" strokeWidth="1.5" rx="15" />
                <text x="85" y="115" fill="#e0e7ff" fontSize="8" textAnchor="middle" writingMode="tb" fontWeight="bold">Pilar Ø{(larguraPilarM * 100).toFixed(0)}cm</text>
                <text x="315" y="115" fill="#e0e7ff" fontSize="8" textAnchor="middle" writingMode="tb" fontWeight="bold">Pilar Ø{(larguraPilarM * 100).toFixed(0)}cm</text>
              </>
            ) : (
              <>
                <rect x="70" y="55" width="30" height="115" fill="#4338ca" stroke="#818cf8" strokeWidth="1.5" />
                <rect x="300" y="55" width="30" height="115" fill="#4338ca" stroke="#818cf8" strokeWidth="1.5" />
                <text x="85" y="115" fill="#e0e7ff" fontSize="8" textAnchor="middle" writingMode="tb" fontWeight="bold">Pilar {(larguraPilarM * 100).toFixed(0)}cm</text>
                <text x="315" y="115" fill="#e0e7ff" fontSize="8" textAnchor="middle" writingMode="tb" fontWeight="bold">Pilar {(larguraPilarM * 100).toFixed(0)}cm</text>
              </>
            )}

            {/* Viga Transversal Monolítica */}
            <rect x="60" y="55" width="280" height="35" fill="#3730a3" stroke="#cbd5e1" strokeWidth="1.5" />
            <text x="200" y="77" fill="#ffffff" fontSize="9" textAnchor="middle" fontWeight="bold">
              Viga {(larguraVigaM * 100).toFixed(0)}cm × {(alturaVigaM * 100).toFixed(0)}cm
            </text>

            {/* Laje Superior Monolítica */}
            <rect x="40" y="42" width="320" height="13" fill="#6366f1" stroke="#a5b4fc" strokeWidth="1.5" />
            <text x="200" y="52" fill="#ffffff" fontSize="8" textAnchor="middle" fontWeight="bold">
              Laje Superior (e={(espessuraLajeM * 100).toFixed(0)}cm)
            </text>

            {/* Escoramento / Cimbramento Tubular */}
            <g stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 2" opacity="0.8">
              <line x1="130" y1="90" x2="130" y2="170" />
              <line x1="190" y1="90" x2="190" y2="170" />
              <line x1="250" y1="90" x2="250" y2="170" />
              <line x1="130" y1="130" x2="250" y2="130" />
            </g>
            <text x="190" y="145" fill="#fbbf24" fontSize="8" textAnchor="middle" fontWeight="bold">Cimbramento H={peDireitoM.toFixed(2)}m</text>

            {/* Cotas */}
            <line x1="365" y1="42" x2="365" y2="170" stroke="#ef4444" strokeWidth="1.5" />
            <polygon points="365,42 362,48 368,48" fill="#ef4444" />
            <polygon points="365,170 362,164 368,164" fill="#ef4444" />
            <text x="370" y="110" fill="#f87171" fontSize="9" fontWeight="bold">H={alturaPilarM.toFixed(2)}m</text>
          </svg>
        </div>

        {/* Especificações Normativas */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
          <h5 className="font-bold text-slate-800 uppercase tracking-wide text-[11px] border-b border-slate-200 pb-1">
            Parâmetros de Superestrutura (NBR 6118 / NBR 9062)
          </h5>
          <ul className="space-y-1.5 text-[11px] text-slate-600 list-disc pl-4">
            <li>
              <strong>Pilares Retangulares & Circulares:</strong> Perímetro de fôrma $P = 2(B+D)$ ou $P = \pi \varnothing$, com volume de concreto e armação de aço por taxa ($kg/m^3$).
            </li>
            <li>
              <strong>Vigas & Lajes (In-loco / Pré-moldadas):</strong> Fôrmas com desconto de espessura de laje e volume de cimbramento tubular (Vcimb = L × (B + 1.20m) × PéDireito).
            </li>
            <li>
              <strong>Classificação Estrutural:</strong> Suporte completo para Lajes Maciças, Alveolares (LP15/LP20), Nervuradas e Cubetas de Isopor/PVC.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
