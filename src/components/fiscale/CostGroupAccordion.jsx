import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const formatEuro = (n) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

function ItemSlider({ item, value, max, onChange }) {
  const perc = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="py-2 pl-3 border-l-2 border-slate-700/50">
      <div className="flex justify-between items-center mb-1">
        <span className="text-slate-400 text-[11px] leading-tight pr-2">{item.label}</span>
        <span className="text-white text-xs font-semibold whitespace-nowrap">{formatEuro(value)}</span>
      </div>
      <div className="relative h-6 flex items-center">
        <div className="absolute inset-x-0 h-1 bg-slate-800 rounded-full">
          <div className="h-full bg-slate-500 rounded-full transition-all" style={{ width: `${perc}%` }} />
        </div>
        <input
          type="range" min={0} max={max} step={500} value={value}
          onChange={(e) => onChange(item.id, Number(e.target.value))}
          className="absolute inset-x-0 w-full h-6 opacity-0 cursor-pointer z-10"
        />
        <div
          className="absolute w-3.5 h-3.5 rounded-full bg-white border border-slate-400 shadow pointer-events-none"
          style={{ left: `calc(${perc}% - 7px)` }}
        />
      </div>
    </div>
  );
}

export default function CostGroupAccordion({ group, itemValues, maxPerItem, onChange }) {
  const [open, setOpen] = useState(false);
  const groupTotal = group.items.reduce((s, i) => s + (itemValues[i.id] || 0), 0);

  return (
    <div className="border border-slate-700/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-800/40 hover:bg-slate-800/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{group.icon}</span>
          <span className="text-white text-xs font-semibold">{group.label}</span>
          <span className="text-slate-500 text-[10px]">{group.items.length} voci</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: group.color }}>{formatEuro(groupTotal)}</span>
          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && (
        <div className="px-3 py-2 space-y-0.5 bg-[#0a1929]">
          {group.items.map(item => (
            <ItemSlider
              key={item.id}
              item={item}
              value={itemValues[item.id] || 0}
              max={maxPerItem}
              onChange={onChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}