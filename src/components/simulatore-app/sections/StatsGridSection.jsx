import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatsGridSection({ title, items, primaryColor }) {
  return (
    <div className="px-3 py-3">
      {title && <p className="text-xs font-bold text-gray-400 mb-2 px-1">{title}</p>}
      <div className="grid grid-cols-2 gap-2">
        {items.map((s, i) => (
          <div key={i} className="bg-[#1a1a2e] rounded-xl p-3 border border-white/5">
            <p className="text-[10px] text-gray-500">{s.label}</p>
            <p className="text-lg font-black text-white mt-0.5">{s.value}</p>
            {s.trend && (
              <span className={`flex items-center gap-0.5 text-[10px] mt-1 ${
                s.trendDirection === "up" ? "text-green-400" : "text-red-400"
              }`}>
                {s.trendDirection === "up"
                  ? <TrendingUp className="w-3 h-3" />
                  : <TrendingDown className="w-3 h-3" />}
                {s.trend}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}