import React, { useState } from "react";
import { Check } from "lucide-react";

export default function PricingSection({ title, subtitle, items, primaryColor }) {
  const [selected, setSelected] = useState(items.findIndex(p => p.popular) >= 0 ? items.findIndex(p => p.popular) : 0);

  return (
    <div className="px-4 py-5">
      {title && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-1">{subtitle || "PIANI"}</p>
          <h3 className="text-lg font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>{title}</h3>
        </div>
      )}
      <div className="space-y-3">
        {items.map((p, i) => {
          const isActive = selected === i;
          const isPopular = p.popular;
          return (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className="w-full text-left rounded-2xl p-4 transition-all duration-300 border active:scale-[0.98] relative overflow-hidden"
              style={{
                borderColor: isActive ? primaryColor + "50" : "rgba(255,255,255,0.04)",
                background: isActive ? primaryColor + "08" : "rgba(255,255,255,0.02)",
              }}
            >
              {isPopular && (
                <span className="absolute top-3 right-3 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white" style={{ background: primaryColor }}>
                  Consigliato
                </span>
              )}
              <p className="text-sm font-bold text-white">{p.name}</p>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-2xl font-black tabular-nums" style={{ color: isActive ? primaryColor : "white" }}>
                  {p.price}
                </span>
                {p.period && <span className="text-[10px] text-white/25">/{p.period}</span>}
              </div>
              {p.features && isActive && (
                <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                  {(Array.isArray(p.features) ? p.features : []).map((f, j) => (
                    <div key={j} className="flex items-center gap-2 text-[11px] text-white/40">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: primaryColor + "20" }}>
                        <Check className="w-2.5 h-2.5" style={{ color: primaryColor }} />
                      </div>
                      {typeof f === "string" ? f : f.name || f.text || ""}
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}