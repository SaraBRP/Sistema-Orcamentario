import React from 'react';
import { Layers } from 'lucide-react';

interface Props {
  vistaModo?: 'CAIXA' | 'TUBULACAO';
  tipoCaixa?: string; // 'PVAP', 'CIAP', 'CX-PASS'
  larguraCaixaM?: number; // 1.60
  comprimentoCaixaM?: number; // 1.60
  profundidadeM?: number; // 1.50
  diametroTuboMm?: number; // 600
  larguraValaM?: number; // 1.20
}

export const CroquiDrenagem: React.FC<Props> = ({
  vistaModo = 'CAIXA',
  tipoCaixa = 'PVAP',
  larguraCaixaM = 1.60,
  comprimentoCaixaM = 1.60,
  profundidadeM = 1.50,
  diametroTuboMm = 600,
  larguraValaM = 1.20
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
          <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>CROQUI CAD ESQUEMÁTICO - SISTEMA DE DRENAGEM PLUVIAL</span>
          </h4>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${vistaModo === 'CAIXA' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
          {vistaModo === 'CAIXA' ? `Caixa de Drenagem (${tipoCaixa})` : `Vala e Tubulação Pluvial (Ø${diametroTuboMm}mm)`}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Esquema Visual CAD */}
        <div className="bg-slate-900 rounded-xl p-4 flex flex-col items-center justify-center min-h-[210px] relative overflow-hidden text-white border border-slate-800 shadow-inner">
          <svg className="w-full h-48" viewBox="0 0 400 200">
            {/* Terreno de Fundo */}
            <pattern id="soil_drenagem" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 0 10 L 10 0 M 10 20 L 20 10" stroke="#334155" strokeWidth="1" />
            </pattern>
            <rect x="10" y="30" width="380" height="160" fill="url(#soil_drenagem)" opacity="0.7" />

            {/* Linha do Terreno Natural (CT) */}
            <line x1="10" y1="30" x2="390" y2="30" stroke="#10b981" strokeWidth="2.5" />
            <text x="20" y="24" fill="#34d399" fontSize="9" fontWeight="bold">Superfície / Cota de Terreno (CT)</text>

            {vistaModo === 'CAIXA' ? (
              <>
                {/* Reaterro em Volta da Caixa */}
                <rect x="80" y="30" width="240" height="135" fill="#1e293b" stroke="#475569" strokeWidth="1.5" strokeDasharray="4 4" rx="2" />
                <text x="90" y="44" fill="#94a3b8" fontSize="8" fontWeight="bold">Escavação Folga +30cm</text>

                {/* Lastro Magro da Laje de Fundo */}
                <rect x="100" y="155" width="200" height="10" fill="#64748b" stroke="#94a3b8" strokeWidth="1" />
                <text x="200" y="163" fill="#f8fafc" fontSize="8" textAnchor="middle">Lastro de Concreto e=5cm</text>

                {/* Laje de Fundo Estrutural */}
                <rect x="105" y="143" width="190" height="12" fill="#475569" stroke="#cbd5e1" strokeWidth="1.5" />

                {/* Paredes da Caixa em Alvenaria de Bloco 14cm/19cm */}
                <rect x="110" y="55" width="25" height="88" fill="#d97706" stroke="#fbbf24" strokeWidth="1.5" />
                <rect x="265" y="55" width="25" height="88" fill="#d97706" stroke="#fbbf24" strokeWidth="1.5" />
                <text x="122" y="100" fill="#fef3c7" fontSize="8" textAnchor="middle" writingMode="tb" fontWeight="bold">Bloco 14/19cm</text>

                {/* Laje de Tampa Superior */}
                <rect x="105" y="50" width="190" height="10" fill="#475569" stroke="#cbd5e1" strokeWidth="1.5" />

                {/* Tampão FF / Grelha Metalúrgica */}
                <rect x="175" y="26" width="50" height="8" fill="#3b82f6" stroke="#60a5fa" strokeWidth="2" rx="2" />
                <text x="200" y="22" fill="#60a5fa" fontSize="9" textAnchor="middle" fontWeight="bold">Tampão FF / Grelha (Ø60cm)</text>

                {/* Tubo de Entrada / Saída de Água */}
                <circle cx="110" cy="115" r="14" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
                <circle cx="290" cy="115" r="14" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
                <text x="200" y="118" fill="#38bdf8" fontSize="10" textAnchor="middle" fontWeight="bold">
                  {comprimentoCaixaM.toFixed(2)}m × {larguraCaixaM.toFixed(2)}m (prof={profundidadeM.toFixed(2)}m)
                </text>

                {/* Cota da Profundidade */}
                <line x1="330" y1="30" x2="330" y2="165" stroke="#ef4444" strokeWidth="1.5" />
                <polygon points="330,30 327,36 333,36" fill="#ef4444" />
                <polygon points="330,165 327,159 333,159" fill="#ef4444" />
                <text x="336" y="98" fill="#f87171" fontSize="9" fontWeight="bold">H = {profundidadeM.toFixed(2)}m</text>
              </>
            ) : (
              <>
                {/* Vala de Escavação para Tubulação */}
                <polygon points="110,30 290,30 270,165 130,165" fill="#1e293b" stroke="#64748b" strokeWidth="2" strokeDasharray="4 4" />
                <text x="200" y="45" fill="#94a3b8" fontSize="9" textAnchor="middle" fontWeight="bold">Vala Escavada (B = {larguraValaM.toFixed(2)}m)</text>

                {/* Lastro de Areia / Brita e=10cm */}
                <polygon points="132,150 268,150 270,165 130,165" fill="#f59e0b" opacity="0.8" />
                <text x="200" y="160" fill="#fef3c7" fontSize="8" textAnchor="middle" fontWeight="bold">Lastro de Areia / Brita (10cm)</text>

                {/* Seção Transversal do Tubo de Concreto Pluvial */}
                <circle cx="200" cy="110" r="32" fill="#0284c7" stroke="#e2e8f0" strokeWidth="4" />
                <circle cx="200" cy="110" r="26" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="200" y="114" fill="#38bdf8" fontSize="10" textAnchor="middle" fontWeight="bold">Ø {diametroTuboMm} mm</text>

                {/* Reaterro de Vala Compactado */}
                <text x="200" y="75" fill="#38bdf8" fontSize="8" textAnchor="middle">Reaterro Compactado de Vala</text>
              </>
            )}
          </svg>
        </div>

        {/* Especificações Normativas */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
          <h5 className="font-bold text-slate-800 uppercase tracking-wide text-[11px] border-b border-slate-200 pb-1">
            Parâmetros do Modelo BRP de Drenagem Pluvial (NBR 10839 / NBR 8882)
          </h5>
          <ul className="space-y-1.5 text-[11px] text-slate-600 list-disc pl-4">
            <li>
              <strong>Poços de Visita (PVAP) & Caixas (CIAP / CX-PASS):</strong> Alvenaria em blocos de concreto estrutural 14cm/19cm com argamassa 1:3, laje de fundo/tampa e lastro magro 5cm.
            </li>
            <li>
              <strong>Tampões & Fechamento:</strong> Tampão de Ferro Fundido Dúctil articulado Ø60cm para tráfego pesado ou Tampa Pré-Moldada de Concreto / Grelha.
            </li>
            <li>
              <strong>Rede de Tubulações em Vala:</strong> Largura da vala $B = \varnothing + 0,60m$, lastro de areia/brita 10cm, reaterro compactado e bota-fora com empolamento $1,10$.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
