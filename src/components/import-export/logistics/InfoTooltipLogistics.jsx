import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

export default function InfoTooltipLogistics({ text }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center ml-1">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="w-4 h-4 rounded-full bg-slate-600/50 flex items-center justify-center hover:bg-slate-500/50 transition-colors"
      >
        <HelpCircle className="w-3 h-3 text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[101] w-64 bg-slate-900 border border-white/15 rounded-xl p-3 shadow-xl">
            <div className="flex items-start gap-2">
              <p className="text-slate-300 text-[11px] leading-relaxed flex-1">{text}</p>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </span>
  );
}