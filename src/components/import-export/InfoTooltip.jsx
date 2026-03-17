import React, { useState } from 'react';
import { X } from 'lucide-react';

/**
 * Bottone "?" che apre un popup modale con spiegazione.
 * Usato accanto a ogni dato/termine per spiegarlo all'utente.
 */
export default function InfoTooltip({ title, children }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="w-[18px] h-[18px] rounded-full bg-white/10 border border-white/30 flex items-center justify-center hover:bg-white/20 transition-colors flex-shrink-0 ml-0.5"
        aria-label={`Spiegazione: ${title}`}
      >
        <span className="text-white text-[9px] font-bold leading-none">?</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 overflow-y-auto"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-slate-900 border border-white/10 rounded-2xl p-5 max-w-sm w-full shadow-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-sm">{title}</h3>
              <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-white/90 text-xs leading-relaxed space-y-2">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}