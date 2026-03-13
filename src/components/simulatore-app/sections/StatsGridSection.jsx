import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import EditableField from "../EditableField";

export default function StatsGridSection({ title, subtitle, items, primaryColor, editable, onItemChange, onSectionChange }) {
  const ec = editable ? true : false;

  return (
    <div className="px-4 py-5">
      {title && (
        <div className="mb-4">
          <EditableField value={subtitle || "STATISTICHE"} onChange={ec ? v => onSectionChange?.("subtitle", v) : null} tag="p" className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-1" />
          <EditableField value={title} onChange={ec ? v => onSectionChange?.("title", v) : null} tag="h3" className="text-lg font-bold text-white" style={{ fontFamily: "Georgia, serif" }} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {items.map((s, i) => (
          <div key={i} className="rounded-2xl p-4 bg-white/[0.03] border border-white/[0.04] transition-all duration-300">
            <EditableField value={s.label} onChange={ec ? v => onItemChange?.(i, "label", v) : null} className="text-[10px] font-semibold uppercase tracking-wider text-white/25" />
            <EditableField value={s.value} onChange={ec ? v => onItemChange?.(i, "value", v) : null} className="text-2xl font-black text-white mt-1.5 tabular-nums" style={{ letterSpacing: "-0.02em" }} />
            {s.trend && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold mt-1.5 px-2 py-0.5 rounded-full ${
                s.trendDirection === "up" ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10"
              }`}>
                {s.trendDirection === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {s.trend}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}