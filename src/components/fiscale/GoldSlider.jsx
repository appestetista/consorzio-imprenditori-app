import React from 'react';

export default function GoldSlider({ value, min, max, step, onChange, label, formatValue }) {
  const perc = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className="space-y-2">
      {label && (
        <div className="flex justify-between items-center">
          <span className="text-slate-400 text-xs">{label}</span>
          <span className="text-white font-bold text-sm">{formatValue ? formatValue(value) : value}</span>
        </div>
      )}
      <div className="relative h-8 flex items-center">
        <div className="absolute inset-x-0 h-1.5 bg-slate-700 rounded-full">
          <div className="h-full bg-gradient-to-r from-[#d4af37] to-[#f0d060] rounded-full" style={{ width: `${perc}%` }} />
        </div>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-x-0 w-full h-8 opacity-0 cursor-pointer z-10"
        />
        <div
          className="absolute w-5 h-5 rounded-full bg-gradient-to-b from-[#f7d774] to-[#c6921b] border-2 border-white shadow-lg pointer-events-none"
          style={{ left: `calc(${perc}% - 10px)` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-600">
        <span>{formatValue ? formatValue(min) : min}</span>
        <span>{formatValue ? formatValue(max) : max}</span>
      </div>
    </div>
  );
}