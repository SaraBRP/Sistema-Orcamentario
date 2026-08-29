import React from 'react';
import { Layers } from 'lucide-react';

interface Props {
  modoArmacao?: 'TELA' | 'FIBRA';
  espessuraM?: number;
  telaSuperior?: string;
  telaInferior?: string;
  consumoFibraKgM3?: number;
}

export const CroquiPisoConcreto: React.FC<Props> = ({
  modoArmacao = 'TELA',
  espessuraM = 0.16,
  telaSuperior = 'Q246',
  telaInferior = 'Q138',
  consumoFibraKgM3 = 20
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>CROQUI CAD ESQUEMÁTICO - CORTE TRANSVERSAL DO PISO DE CONCRETO</span>
          </h4>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${modoArmacao === 'TELA' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
          Armação: {modoArmacao === 'TELA' ? 'Tela Soldada CA-60' : `Fibra de Aço (${consumoFibraKgM3} kg/m³)`}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Esquema Visual do Corte do Piso */}
        <div className="bg-slate-900 rounded-xl p-4 flex flex-col items-center justify-center min-h-[200px] relative overflow-hidden text-white border border-slate-800 shadow-inner">
          <svg className="w-full h-44" viewBox="0 0 400 180">
            {/* Solo / Sub-base */}
            <pattern id="soil" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 0 10 L 10 0 M 10 20 L 20 10" stroke="#475569" strokeWidth="1" />
            </pattern>
            <rect x="20" y="140" width="360" height="30" fill="url(#soil)" opacity="0.6" />
            <line x1="20" y1="140" x2="380" y2="140" stroke="#64748b" strokeWidth="2" strokeDasharray="4 4" />
            <text x="200" y="160" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="bold">TERRENO / SUB-BASE COMPACTADA</text>

            {/* Lona Plástica (Impermeabilização) */}
            <line x1="20" y1="138" x2="380" y2="138" stroke="#38bdf8" strokeWidth="3" />
            <text x="30" y="132" fill="#38bdf8" fontSize="9" fontWeight="bold">Lona Plástica (0.15mm)</text>

            {/* Placa de Concreto */}
            <rect x="20" y="40" width="360" height="96" fill="#334155" stroke="#94a3b8" strokeWidth="2" rx="2" />
            <text x="200" y="90" fill="#f8fafc" fontSize="11" textAnchor="middle" fontWeight="bold" opacity="0.8">
              PISO EM CONCRETO (e = {(espessuraM * 100).toFixed(0)} cm)
            </text>

            {/* Juntas de Indução de Trinca / Selante */}
            <line x1="200" y1="40" x2="200" y2="70" stroke="#f59e0b" strokeWidth="4" />
            <polygon points="196,40 204,40 200,55" fill="#f59e0b" />
            <text x="200" y="32" fill="#fbbf24" fontSize="9" textAnchor="middle" fontWeight="bold">Junta de Dilatação / Corte</text>

            {/* Barra de Transferência */}
            <rect x="150" y="85" width="100" height="8" fill="#e2e8f0" stroke="#0284c7" strokeWidth="1.5" rx="4" />
            <line x1="150" y1="89" x2="200" y2="89" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
            <text x="200" y="105" fill="#e2e8f0" fontSize="9" textAnchor="middle" fontWeight="bold">Barra de Transferência Ø25mm</text>

            {/* Armação em Tela ou Fibra */}
            {modoArmacao === 'TELA' ? (
              <>
                {/* Tela Superior */}
                <line x1="40" y1="56" x2="360" y2="56" stroke="#22c55e" strokeWidth="2.5" strokeDasharray="6 3" />
                <circle cx="80" cy="56" r="3" fill="#16a34a" />
                <circle cx="140" cy="56" r="3" fill="#16a34a" />
                <circle cx="260" cy="56" r="3" fill="#16a34a" />
                <circle cx="320" cy="56" r="3" fill="#16a34a" />
                <text x="350" y="52" fill="#4ade80" fontSize="9" textAnchor="end" fontWeight="bold">Tela Sup: {telaSuperior}</text>

                {/* Caranguejo de Apoio (CA-50 Ø8mm) */}
                <path d="M 80 120 L 80 56 M 320 120 L 320 56" stroke="#eab308" strokeWidth="2" strokeDasharray="3 2" />
                <text x="70" y="88" fill="#eab308" fontSize="8" textAnchor="end" fontWeight="bold">Caranguejo Ø8mm</text>

                {/* Tela Inferior */}
                <line x1="40" y1="120" x2="360" y2="120" stroke="#22c55e" strokeWidth="2.5" strokeDasharray="6 3" />
                <circle cx="80" cy="120" r="3" fill="#16a34a" />
                <circle cx="140" cy="120" r="3" fill="#16a34a" />
                <circle cx="260" cy="120" r="3" fill="#16a34a" />
                <circle cx="320" cy="120" r="3" fill="#16a34a" />
                <text x="350" y="132" fill="#4ade80" fontSize="9" textAnchor="end" fontWeight="bold">Tela Inf: {telaInferior}</text>
              </>
            ) : (
              <>
                {/* Distribuição Aleatória de Fibras de Aço */}
                <g stroke="#c084fc" strokeWidth="2" strokeLinecap="round">
                  <line x1="50" y1="60" x2="68" y2="72" />
                  <line x1="90" y1="110" x2="112" y2="105" />
                  <line x1="130" y1="70" x2="145" y2="88" />
                  <line x1="270" y1="65" x2="288" y2="78" />
                  <line x1="310" y1="115" x2="330" y2="100" />
                  <line x1="340" y1="75" x2="355" y2="92" />
                  <line x1="70" y1="95" x2="88" y2="85" />
                  <line x1="240" y1="120" x2="258" y2="110" />
                </g>
                <text x="350" y="60" fill="#d8b4fe" fontSize="9" textAnchor="end" fontWeight="bold">Fibra de Aço Matriz ({consumoFibraKgM3} kg/m³)</text>
              </>
            )}

            {/* Cota de Espessura */}
            <line x1="388" y1="40" x2="388" y2="136" stroke="#ef4444" strokeWidth="1.5" />
            <polygon points="388,40 385,46 391,46" fill="#ef4444" />
            <polygon points="388,136 385,130 391,130" fill="#ef4444" />
            <text x="394" y="90" fill="#f87171" fontSize="9" textAnchor="start" fontWeight="bold">h = {(espessuraM * 100).toFixed(0)}cm</text>
          </svg>
        </div>

        {/* Especificações e Normas Técnicas */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
          <h5 className="font-bold text-slate-800 uppercase tracking-wide text-[11px] border-b border-slate-200 pb-1">
            Diretrizes do Modelo NBR 14081 / ACI 360R-10
          </h5>
          <ul className="space-y-1.5 text-[11px] text-slate-600 list-disc pl-4">
            <li>
              <strong>Pisos Armados com Tela Soldada CA-60:</strong> Consideram transpasse padrão de 17% (multiplicador 1.17) e uso de caranguejos Ø8mm a cada 1m² com treliça de sustentação.
            </li>
            <li>
              <strong>Pisos com Fibra de Aço / Sintética:</strong> Dispensam armação dupla de tela, mantendo o consumo de fibras (kg/m³) dosado em matriz com lona de sobreposição.
            </li>
            <li>
              <strong>Juntas de Transferência:</strong> Modulação padrão com barras lisas Ø25mm a cada 30cm com bainha graxada e selamento em Poliuretano ou Epóxi Semi-Rígido.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
