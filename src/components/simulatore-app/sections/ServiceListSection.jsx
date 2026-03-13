import React, { useState } from "react";
import { Clock } from "lucide-react";

export default function ServiceListSection({ title, subtitle, items, primaryColor }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className="px-4 py-5">
      {title && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-1">{subtitle || "SERVIZI"}</p>
          <h3 className="text-lg font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>{title}</h3>
        </div>
      )}
      <div className="space-y-2.5">
        {items.map((s, i) => (
          <button
            key={i}
            onClick={() => setSelected(selected === i ? null : i)}
            className="w-full text-left rounded-2xl p-4 transition-all duration-300 border bg-white/[0.03] active:scale-[0.98]"
            style={{ borderColor: selected === i ? primaryColor + "40" : "rgba(255,255,255,0.04)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-white">{s.name}</p>
                  {s.badge && (
                    <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: primaryColor + "20", color: primaryColor }}>
                      {s.badge}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  {s.duration && (
                    <span className="flex items-center gap-1 text-[10px] text-white/30">
                      <Clock className="w-3 h-3" /> {s.duration}
                    </span>
                  )}
                  {s.description && <span className="text-[10px] text-white/25">{s.description}</span>}
                </div>
              </div>
              {s.price != null && (
                <span className="text-lg font-black tabular-nums shrink-0" style={{ color: primaryColor }}>
                  €{typeof s.price === "number" ? s.price : s.price}
                </span>
              )}
            </div>
            {selected === i && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <button
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all active:scale-[0.97]"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}CC)` }}
                >
                  Prenota ora
                </button>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}