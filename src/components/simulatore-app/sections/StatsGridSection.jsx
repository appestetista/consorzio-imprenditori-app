import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatsGridSection({ title, subtitle, items, primaryColor }) {
  return (
    <div className="px-4 py-5">
      {title && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-1">{subtitle || "STATISTICHE"}</p>
          <h3 className="text-lg font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>{title}</h3>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {items.map((s, i) => (
          <div key={i} className="rounded-2xl p-4 bg-white/[0.03] border border-white/[0.04] transition-all duration-300">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/25">{s.label}</p>
            <p className="text-2xl font-black text-white mt-1.5 tabular-nums" style={{ letterSpacing: "-0.02em" }}>
              {s.value}
            </p>
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