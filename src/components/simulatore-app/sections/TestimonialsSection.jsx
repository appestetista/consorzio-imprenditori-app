import React from "react";
import { Star } from "lucide-react";
import EditableField from "../EditableField";
import EditableImage from "../EditableImage";

export default function TestimonialsSection({ title, subtitle, items, primaryColor, editable, onItemChange, onSectionChange }) {
  const ec = editable ? true : false;

  return (
    <div className="px-4 py-5">
      {title && (
        <div className="mb-4">
          <EditableField value={subtitle || "RECENSIONI"} onChange={ec ? v => onSectionChange?.("subtitle", v) : null} tag="p" className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-1" />
          <EditableField value={title} onChange={ec ? v => onSectionChange?.("title", v) : null} tag="h3" className="text-lg font-bold text-white" style={{ fontFamily: "Georgia, serif" }} />
        </div>
      )}
      <div className="space-y-3">
        {items.map((t, i) => (
          <div key={i} className="rounded-2xl p-4 bg-white/[0.03] border border-white/[0.04] transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              {t.image_url ? (
                <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
                  {ec ? (
                    <EditableImage src={t.image_url} alt={t.name} onChange={url => onItemChange?.(i, "image_url", url)}>
                      <img src={t.image_url} alt={t.name} className="w-full h-full object-cover" onError={e => { e.target.parentNode.innerHTML = `<div class="w-full h-full flex items-center justify-center text-base" style="background:${primaryColor}15">👤</div>`; }} />
                    </EditableImage>
                  ) : (
                    <img src={t.image_url} alt={t.name} className="w-full h-full object-cover" onError={e => { e.target.parentNode.innerHTML = `<div class="w-full h-full flex items-center justify-center text-base" style="background:${primaryColor}15">👤</div>`; }} />
                  )}
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-base" style={{ background: primaryColor + "15" }}>
                  {t.avatar_emoji || "👤"}
                </div>
              )}
              <div className="flex-1">
                <EditableField value={t.name} onChange={ec ? v => onItemChange?.(i, "name", v) : null} className="text-xs font-bold text-white" />
                {t.role && <EditableField value={t.role} onChange={ec ? v => onItemChange?.(i, "role", v) : null} className="text-[10px] text-white/25" />}
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating || 5 }).map((_, j) => (
                  <Star key={j} className="w-3 h-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>
            <EditableField value={t.text} onChange={ec ? v => onItemChange?.(i, "text", v) : null} className="text-[11px] text-white/40 leading-relaxed italic" multiline />
          </div>
        ))}
      </div>
    </div>
  );
}