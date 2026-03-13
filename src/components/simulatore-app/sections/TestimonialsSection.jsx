import React from "react";
import { Star } from "lucide-react";

export default function TestimonialsSection({ title, subtitle, items, primaryColor }) {
  return (
    <div className="px-4 py-5">
      {title && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-1">{subtitle || "RECENSIONI"}</p>
          <h3 className="text-lg font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>{title}</h3>
        </div>
      )}
      <div className="space-y-3">
        {items.map((t, i) => (
          <div key={i} className="rounded-2xl p-4 bg-white/[0.03] border border-white/[0.04] transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              {/* Avatar - image or emoji */}
              {t.image_url ? (
                <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
                  <img src={t.image_url} alt={t.name} className="w-full h-full object-cover" onError={(e) => { e.target.parentNode.innerHTML = `<div class="w-full h-full flex items-center justify-center text-base" style="background:${primaryColor}15">👤</div>`; }} />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-base" style={{ background: primaryColor + "15" }}>
                  {t.avatar_emoji || "👤"}
                </div>
              )}
              <div className="flex-1">
                <p className="text-xs font-bold text-white">{t.name}</p>
                {t.role && <p className="text-[10px] text-white/25">{t.role}</p>}
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating || 5 }).map((_, j) => (
                  <Star key={j} className="w-3 h-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>
            <p className="text-[11px] text-white/40 leading-relaxed italic">"{t.text}"</p>
          </div>
        ))}
      </div>
    </div>
  );
}