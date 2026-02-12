import React, { useState } from 'react';
import { cn } from '@/lib/utils';

const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const MONTH_COLORS = [
  '#3b82f6','#8b5cf6','#ec4899','#14b8a6','#22c55e','#eab308',
  '#f97316','#ef4444','#06b6d4','#a855f7','#6366f1','#0ea5e9'
];

export default function WeekMonthDropdown({ currentMonth, currentYear, onSelectMonth, onClose }) {
  const [year, setYear] = useState(currentYear);

  return (
    <div 
      className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden"
        style={{ width: '260px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Anno con frecce */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <button 
            onClick={() => setYear(y => y - 1)}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-slate-700 active:bg-slate-600 text-slate-300 text-lg font-bold touch-manipulation"
          >
            ‹
          </button>
          <span className="text-lg font-bold text-slate-200">{year}</span>
          <button 
            onClick={() => setYear(y => y + 1)}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-slate-700 active:bg-slate-600 text-slate-300 text-lg font-bold touch-manipulation"
          >
            ›
          </button>
        </div>
        {/* Griglia 3x4 mesi */}
        <div className="grid grid-cols-3 gap-3 p-4">
          {MONTHS_IT.map((mName, mIdx) => {
            const isCurrent = mIdx === currentMonth && year === currentYear;
            const mColor = MONTH_COLORS[mIdx];
            return (
              <button
                key={mIdx}
                onClick={() => {
                  onSelectMonth(year, mIdx);
                  onClose();
                }}
                className={cn(
                  "py-4 rounded-lg text-sm font-semibold text-center touch-manipulation select-none active:scale-95 transition-transform",
                  isCurrent ? "text-slate-900 font-bold" : "text-slate-300"
                )}
                style={{ backgroundColor: isCurrent ? mColor : 'rgba(51,65,85,0.5)' }}
              >
                {mName.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}