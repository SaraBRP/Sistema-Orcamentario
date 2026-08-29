import React from 'react';
import { Layers } from 'lucide-react';

interface Props {
  comprimentoM?: number; // Pint1 = 22.0
  larguraM?: number; // Pint2 = 17.5
  alturaM?: number; // Hint = 2.45
  espessuraParedeM?: number; // ep = 0.15
  espessuraLajeInfM?: number; // Linf = 0.15
  espessuraLajeSupM?: number; // Lsup = 0.15
  numDivisoria?: number; // Pdiv - 1 = 0 ou 1
  isImpermeabilizado?: boolean;
}

export const CroquiPitsReservatorios: React.FC<Props> = ({
  comprimentoM = 22.0,
  larguraM = 17.5,
  alturaM = 2.45,
  espessuraParedeM: _ep = 0.15,
  espessuraLajeInfM = 0.15,
  espessuraLajeSupM = 0.15,
  numDivisoria = 0,
  isImpermeabilizado = true
}) => {
  const hext = alturaM + espessuraLajeInfM + espessuraLajeSupM;
  const volAguaM3 = (comprimentoM * larguraM) * alturaM;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
          <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-cyan-600" />
            <span>CROQUI CAD ESQUEMÁTICO - CORTE TRANSVERSAL RESERVATÓRIO / PIT ENTERRADO</span>
          </h4>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${isImpermeabilizado ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-100 text-slate-700'}`}>
          {isImpermeabilizado ? 'Reservatório Impermeabilizado (Acumulação)' : 'PIT / Caixa de Retardo (Sem Impermeab.)'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Esquema Visual CAD */}
        <div className="bg-slate-900 rounded-xl p-4 flex flex-col items-center justify-center min-h-[210px] relative overflow-hidden text-white border border-slate-800 shadow-inner">
          <svg className="w-full h-48" viewBox="0 0 400 200">
            {/* Terreno de Fundo */}
            <pattern id="soil_pits" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 0 10 L 10 0 M 10 20 L 20 10" stroke="#334155" strokeWidth="1" />
            </pattern>
            <rect x="10" y="25" width="380" height="165" fill="url(#soil_pits)" opacity="0.7" />

            {/* Cota de Terreno Natural */}
            <line x1="10" y1="25" x2="390" y2="25" stroke="#10b981" strokeWidth="2.5" />
            <text x="20" y="20" fill="#34d399" fontSize="9" fontWeight="bold">Cota de Terreno (CT)</text>

            {/* Escavação Lateral */}
            <polygon points="60,25 340,25 320,175 80,175" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 4" />
            <text x="70" y="38" fill="#94a3b8" fontSize="8" fontWeight="bold">Escavação Lateral +1/3 H</text>

            {/* Lastro Magro e=5cm */}
            <rect x="95" y="168" width="210" height="8" fill="#64748b" stroke="#94a3b8" strokeWidth="1" />
            <text x="200" y="174" fill="#f8fafc" fontSize="8" textAnchor="middle">Lastro Magro e=5cm</text>

            {/* Laje Inferior / Fundo */}
            <rect x="100" y="156" width="200" height="12" fill="#475569" stroke="#cbd5e1" strokeWidth="1.5" />
            <text x="200" y="165" fill="#f8fafc" fontSize="8" textAnchor="middle" fontWeight="bold">Laje Inferior (e={(espessuraLajeInfM * 100).toFixed(0)}cm)</text>

            {/* Paredes Perimetrais */}
            <rect x="100" y="55" width="22" height="101" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
            <rect x="278" y="55" width="22" height="101" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />

            {/* Parede Divisória Central (se houver) */}
            {numDivisoria > 0 && (
              <rect x="189" y="55" width="22" height="101" fill="#0369a1" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 2" />
            )}

            {/* Nível de Água Interno */}
            <rect x="122" y="70" width="156" height="86" fill="#0284c7" opacity="0.35" />
            <line x1="122" y1="70" x2="278" y2="70" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 2" />
            <text x="200" y="85" fill="#e0f2fe" fontSize="10" textAnchor="middle" fontWeight="bold">
              Volume Útil ≈ {volAguaM3.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m³
            </text>

            {/* Manta de Impermeabilização (se ativada) */}
            {isImpermeabilizado && (
              <path d="M 122 55 L 122 156 L 278 156 L 278 55" fill="none" stroke="#ec4899" strokeWidth="2.5" strokeDasharray="3 1" />
            )}

            {/* Laje Superior / Tampa */}
            {espessuraLajeSupM > 0 ? (
              <>
                <rect x="100" y="45" width="200" height="10" fill="#475569" stroke="#cbd5e1" strokeWidth="1.5" />
                <text x="200" y="52" fill="#f8fafc" fontSize="8" textAnchor="middle" fontWeight="bold">Laje Superior / Tampa (e={(espessuraLajeSupM * 100).toFixed(0)}cm)</text>
              </>
            ) : (
              <text x="200" y="52" fill="#f59e0b" fontSize="9" textAnchor="middle" fontWeight="bold">RESERVATÓRIO ABERTO (SEM TAMPA)</text>
            )}

            {/* Cotas Internas */}
            <text x="200" y="125" fill="#f8fafc" fontSize="9" textAnchor="middle" fontWeight="bold">
              {comprimentoM.toFixed(2)}m × {larguraM.toFixed(2)}m (H = {alturaM.toFixed(2)}m)
            </text>

            {/* Cota da Altura */}
            <line x1="330" y1="45" x2="330" y2="168" stroke="#ef4444" strokeWidth="1.5" />
            <polygon points="330,45 327,51 333,51" fill="#ef4444" />
            <polygon points="330,168 327,162 333,162" fill="#ef4444" />
            <text x="336" y="110" fill="#f87171" fontSize="9" fontWeight="bold">Hext = {hext.toFixed(2)}m</text>
          </svg>
        </div>

        {/* Especificações Normativas */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
          <h5 className="font-bold text-slate-800 uppercase tracking-wide text-[11px] border-b border-slate-200 pb-1">
            Parâmetros do Modelo BRP (NBR 6118 / NBR 9575)
          </h5>
          <ul className="space-y-1.5 text-[11px] text-slate-600 list-disc pl-4">
            <li>
              <strong>Paredes Perimetrais & Divisórias:</strong> Concreto armado estrutural com taxas de aço parametrizáveis ($110$ a $150 \, kg/m^3$) e fôrmas duplas em ambos os lados.
            </li>
            <li>
              <strong>Laje Superior & Cimbramento:</strong> A laje superior de fechamento calcula fôrma de fundo e volume de cimbramento tubular/escoramento (Vcimb = Atampa × Hint).
            </li>
            <li>
              <strong>Impermeabilização & Bota-fora:</strong> Aplicação de manta impermeabilizante em área molhada interna (paredes + fundo + divisórias) com bota-fora a empolamento $1,20$.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
