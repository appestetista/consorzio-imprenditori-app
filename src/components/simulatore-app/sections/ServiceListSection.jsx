import React, { useState } from "react";
import { Clock } from "lucide-react";

export default function ServiceListSection({ title, items, primaryColor }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className="px-3 py-3">
      {title && <p className="text-xs font-bold text-gray-400 mb-2 px-1">{title}</p>}
      <div className="space-y-2">
        {items.map((s, i) => (
          <button
            key={i}
            onClick={() => setSelected(selected === i ? null : i)}
            className={`w-full text-left rounded-xl p-3 transition-all border ${
              selected === i ? "border-opacity-40" : "border-white/5 hover:border-white/10"
            } bg-[#1a1a2e]`}
            style={selected === i ? { borderColor: primaryColor } : {}}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">{s.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  {s.duration && (
                    <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                      <Clock className="w-3 h-3" /> {s.duration}
                    </span>
                  )}
                  {s.description && <span className="text-[10px] text-gray-500">{s.description}</span>}
                </div>
              </div>
              {s.price && (
                <span className="text-base font-black" style={{ color: primaryColor }}>
                  {typeof s.price === "number" ? `€${s.price}` : s.price}
                </span>
              )}
            </div>
            {selected === i && (
              <div className="mt-2 pt-2 border-t border-white/5">
                <button
                  className="w-full py-2 rounded-lg text-xs font-bold text-white transition-colors"
                  style={{ background: primaryColor }}
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