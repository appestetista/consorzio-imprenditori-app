import React from 'react';
import { ChevronDown } from 'lucide-react';

const MONTH_COLORS = [
  '#3b82f6','#8b5cf6','#ec4899','#14b8a6','#22c55e','#eab308',
  '#f97316','#ef4444','#06b6d4','#a855f7','#6366f1','#0ea5e9'
];

export default function MonthNotesCountBar({ noteCountsByMonth, currentMonth, onMonthClick }) {
  return (
    <div className="flex items-center gap-0 pl-3 pr-0 w-full border-t border-slate-700/30">
      {Array.from({ length: 12 }, (_, mIdx) => {
        const count = noteCountsByMonth[mIdx] || 0;
        const isCurrent = mIdx === currentMonth;
        const mc = MONTH_COLORS[mIdx];
        return (
          <button
            key={mIdx}
            onClick={() => onMonthClick(mIdx)}
            className="flex-1 flex flex-col items-center justify-center py-0.5 transition-all touch-manipulation active:scale-90 select-none"
            style={{ minHeight: '24px' }}
          >
            <ChevronDown 
              className="transition-colors"
              style={{ 
                width: '12px', 
                height: '12px', 
                color: count > 0 ? (isCurrent ? mc : '#a3e635') : '#334155',
                filter: count > 0 ? `drop-shadow(0 0 2px ${isCurrent ? mc : '#a3e635'}50)` : 'none'
              }} 
            />
            {count > 0 && (
              <span 
                className="text-[11px] font-bold leading-none"
                style={{ color: isCurrent ? mc : '#a3e635' }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}