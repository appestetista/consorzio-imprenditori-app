import React, { useState } from "react";
import { Check } from "lucide-react";

export default function PricingSection({ title, items, primaryColor }) {
  const [selected, setSelected] = useState(0);

  return (
    <div className="px-3 py-3">
      {title && <p className="text-xs font-bold text-gray-400 mb-2 px-1">{title}</p>}
      <div className="space-y-2">
        {items.map((p, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={`w-full text-left rounded-xl p-3 transition-all border ${
              selected === i ? "border-opacity-40" : "border-white/5"
            } bg-[#1a1a2e]`}
            style={selected === i ? { borderColor: primaryColor } : {}}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white">{p.name}</p>
              <div className="text-right">
                <span className="text-lg font-black" style={{ color: primaryColor }}>{p.price}</span>
                {p.period && <span className="text-[10px] text-gray-500">/{p.period}</span>}
              </div>
            </div>
            {p.features && selected === i && (
              <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                {(Array.isArray(p.features) ? p.features : []).map((f, j) => (
                  <div key={j} className="flex items-center gap-1.5 text-[10px] text-gray-300">
                    <Check className="w-3 h-3" style={{ color: primaryColor }} />
                    {typeof f === "string" ? f : f.name || f.text || JSON.stringify(f)}
                  </div>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}