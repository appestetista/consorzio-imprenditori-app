import React, { useState } from "react";
import { Heart } from "lucide-react";

export default function ProductGridSection({ title, subtitle, items, primaryColor }) {
  const [liked, setLiked] = useState([]);
  const toggle = (i) => setLiked(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i]);

  return (
    <div className="px-4 py-5">
      {title && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-1">{subtitle || "COLLEZIONE"}</p>
          <h3 className="text-lg font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>{title}</h3>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {items.map((p, i) => (
          <div key={i} className="group rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.04] transition-all duration-300 hover:border-white/10 active:scale-[0.97]">
            {/* Image area with gradient */}
            <div className="relative h-28 flex items-center justify-center overflow-hidden" style={{
              background: `linear-gradient(135deg, ${primaryColor}20 0%, ${primaryColor}08 100%)`
            }}>
              {/* Simulated light reflection */}
              <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent" />
              <span className="text-4xl relative z-10">{p.emoji || "📦"}</span>
              {p.tag && (
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider text-white" style={{ background: primaryColor }}>
                  {p.tag}
                </span>
              )}
              {p.badge && (
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider" style={{ background: primaryColor + "20", color: primaryColor }}>
                  {p.badge}
                </span>
              )}
              <button onClick={() => toggle(i)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center transition-all active:scale-90">
                <Heart className={`w-3.5 h-3.5 ${liked.includes(i) ? "fill-red-500 text-red-500" : "text-white/60"}`} />
              </button>
            </div>
            <div className="p-3">
              <p className="text-xs font-bold text-white truncate">{p.name}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-sm font-black tabular-nums" style={{ color: primaryColor }}>
                  €{typeof p.price === "number" ? p.price : p.price}
                </span>
                {p.originalPrice && (
                  <span className="text-[10px] text-white/25 line-through">€{p.originalPrice}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}