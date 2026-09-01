import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Eye, Link2, X } from 'lucide-react';
import type { TargetInsumoItem } from './TabelaSapatas';

interface Props {
  item?: TargetInsumoItem;
  className?: string;
}

export function ItemBindingInfoEye({ item, className = '' }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  if (!item) return null;

  const hasBinding = Boolean(item.equacaoLiteral || item.substituicaoNumerica || item.observacaoMemoria);

  if (!hasBinding) return null;

  const handleOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const cardHeight = 240;
      const cardWidth = 320;

      // Se houver espaço acima do botão na tela, exibe acima, senão exibe abaixo
      let top = rect.top - cardHeight - 8;
      if (rect.top < cardHeight + 20) {
        top = rect.bottom + 8;
      }

      // Garante alinhamento dentro da janela visível
      let left = rect.left + rect.width / 2 - cardWidth / 2;
      left = Math.max(16, Math.min(left, window.innerWidth - cardWidth - 16));

      setCoords({ top, left });
      setIsOpen(true);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block text-left shrink-0 ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isOpen) {
            handleClose();
          } else {
            handleOpen();
          }
        }}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-md transition-all cursor-pointer flex items-center gap-1 shadow-2xs border border-emerald-300 font-medium text-[11px]"
        title="Clique para ver os detalhes do vínculo / fórmula"
      >
        <Eye className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
        <span className="font-bold text-[10.5px] text-emerald-900">Vinculado</span>
      </button>

      {isOpen && coords && createPortal(
        <div
          style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
          className="fixed z-[99999] w-80 p-3 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 text-xs animate-in fade-in zoom-in-95 duration-100 pointer-events-auto"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={handleClose}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabeçalho do Cartão Flutuante */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
              <Link2 className="w-3.5 h-3.5" />
              <span>Vínculo / Fórmula Ativa</span>
            </span>
            <div className="flex items-center gap-1">
              {item.item_eap && (
                <span className="text-[10px] text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold">
                  EAP: {item.item_eap}
                </span>
              )}
              <button 
                type="button"
                onClick={handleClose}
                className="p-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {/* Nome do Item */}
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Item / Insumo:</span>
              <span className="font-bold text-slate-100 text-xs truncate block" title={item.descricao}>
                {item.descricao}
              </span>
            </div>

            {/* Origem / Tela */}
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Origem do Vínculo:</span>
              <span className="font-bold text-blue-300 text-xs block">{item.observacaoMemoria || 'Fórmula do Memorial'}</span>
            </div>

            {/* Equação Literal */}
            {item.equacaoLiteral && (
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Fórmula (Equação Literal):</span>
                <span className="font-mono text-emerald-300 text-[11px] font-semibold block bg-slate-950 p-1.5 rounded border border-slate-800 break-all">
                  {item.equacaoLiteral}
                </span>
              </div>
            )}

            {/* Expressão Numérica / Valores Substituídos */}
            {item.substituicaoNumerica && (
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Valores Substituídos:</span>
                <span className="font-mono text-blue-200 text-[11px] block bg-slate-950 p-1.5 rounded border border-slate-800 break-all">
                  {item.substituicaoNumerica}
                </span>
              </div>
            )}

            {/* Quantidade Resultante */}
            <div className="pt-1.5 flex items-center justify-between border-t border-slate-800">
              <span className="text-[10.5px] text-slate-400 font-medium">Quantidade Resultante:</span>
              <span className="font-mono font-extrabold text-emerald-400 text-xs">
                {(item.quantidade || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.unidade || ''}
              </span>
            </div>

            <div className="text-[10px] text-slate-400 italic pt-1 text-center border-t border-slate-800/60">
              Caso queira alterar, selecione uma nova fórmula/parâmetro e vincule.
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
