import React from 'react';

const MONTHS_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const MONTH_COLORS = [
  '#3b82f6','#8b5cf6','#ec4899','#14b8a6','#22c55e','#eab308',
  '#f97316','#ef4444','#06b6d4','#a855f7','#6366f1','#0ea5e9'
];

export default function MonthBar({ currentMonth, onSelectMonth }) {
  return (
    <div className="flex items-center gap-0 pl-3 pr-0 py-1 w-full">
      {MONTHS_SHORT.map((mName, mIdx) => {
        const isCurrent = mIdx === Number(currentMonth);
        const mColor = MONTH_COLORS[mIdx];
        return (
          <button
            key={mIdx}
            onClick={() => onSelectMonth(mIdx)}
            className="flex-1 flex items-center justify-center py-1 rounded transition-all touch-manipulation active:scale-90 select-none"
            style={{
              backgroundColor: isCurrent ? mColor : 'transparent',
              minHeight: '28px',
            }}
          >
            <span
              className="text-[11px] font-bold uppercase"
              style={{ color: isCurrent ? '#0f172a' : '#64748b' }}
            >
              {mName}
            </span>
          </button>
        );
      })}
    </div>
  );
}