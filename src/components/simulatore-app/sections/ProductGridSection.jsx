import React, { useState } from "react";
import { Heart } from "lucide-react";

export default function ProductGridSection({ title, items, primaryColor }) {
  const [liked, setLiked] = useState([]);
  const toggle = (i) => setLiked(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i]);

  return (
    <div className="px-3 py-3">
      {title && <p className="text-xs font-bold text-gray-400 mb-2 px-1">{title}</p>}
      <div className="grid grid-cols-2 gap-2">
        {items.map((p, i) => (
          <div key={i} className="bg-[#1a1a2e] rounded-xl overflow-hidden border border-white/5">
            <div className="h-20 flex items-center justify-center text-3xl bg-[#12121f] relative">
              {p.emoji || "📦"}
              {p.tag && (
                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-bold text-white" style={{ background: primaryColor }}>
                  {p.tag}
                </span>
              )}
              <button onClick={() => toggle(i)} className="absolute top-1 right-1">
                <Heart className={`w-3.5 h-3.5 ${liked.includes(i) ? "fill-red-500 text-red-500" : "text-gray-500"}`} />
              </button>
            </div>
            <div className="p-2">
              <p className="text-[11px] font-bold text-white truncate">{p.name}</p>
              <span className="text-sm font-black" style={{ color: primaryColor }}>
                {typeof p.price === "number" ? `€${p.price}` : p.price}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}