import React from 'react';
import { COST_GROUPS, ALL_ITEM_IDS } from './costGroups';

const formatEuro = (n) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

export default function CostCompositionBar({ itemValues, totaleCosti }) {
  if (!totaleCosti || totaleCosti <= 0) return null;

  const groupTotals = COST_GROUPS.map(g => ({
    ...g,
    total: g.items.reduce((s, i) => s + (itemValues[i.id] || 0), 0)
  })).filter(g => g.total > 0);

  return (
    <div className="space-y-2">
      {/* Barra composizione */}
      <div className="flex h-3 rounded-full overflow-hidden bg-slate-800">
        {groupTotals.map(g => {
          const perc = (g.total / totaleCosti) * 100;
          if (perc < 0.5) return null;
          return (
            <div
              key={g.id}
              style={{ width: `${perc}%`, backgroundColor: g.color }}
              className="h-full transition-all duration-300"
            />
          );
        })}
      </div>
      {/* Legenda */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {groupTotals.map(g => (
          <div key={g.id} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
            <span className="text-slate-400 text-[10px]">{g.icon} {formatEuro(g.total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}