import React, { useState } from "react";
import { Clock } from "lucide-react";
import EditableField from "../EditableField";
import EditableImage from "../EditableImage";

export default function ServiceListSection({ title, subtitle, items, primaryColor, editable, onItemChange, onSectionChange }) {
  const [selected, setSelected] = useState(null);
  const ec = editable ? true : false;

  return (
    <div className="px-4 py-5">
      {title && (
        <div className="mb-4">
          <EditableField value={subtitle || "SERVIZI"} onChange={ec ? v => onSectionChange?.("subtitle", v) : null} tag="p" className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-1" />
          <EditableField value={title} onChange={ec ? v => onSectionChange?.("title", v) : null} tag="h3" className="text-lg font-bold text-white" style={{ fontFamily: "Georgia, serif" }} />
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
            <div className="flex items-start gap-3">
              {s.image_url && (
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0">
                  {ec ? (
                    <EditableImage src={s.image_url} alt={s.name} onChange={url => onItemChange?.(i, "image_url", url)}>
                      <img src={s.image_url} alt={s.name} className="w-full h-full object-cover" onError={e => { e.target.parentNode.style.display = "none"; }} />
                    </EditableImage>
                  ) : (
                    <img src={s.image_url} alt={s.name} className="w-full h-full object-cover" onError={e => { e.target.parentNode.style.display = "none"; }} />
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <EditableField value={s.name} onChange={ec ? v => onItemChange?.(i, "name", v) : null} className="text-sm font-bold text-white" />
                  {s.badge && (
                    <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: primaryColor + "20", color: primaryColor }}>{s.badge}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  {s.duration && (
                    <span className="flex items-center gap-1 text-[10px] text-white/30"><Clock className="w-3 h-3" /> {s.duration}</span>
                  )}
                  {s.description && <EditableField value={s.description} onChange={ec ? v => onItemChange?.(i, "description", v) : null} className="text-[10px] text-white/25 line-clamp-1" />}
                </div>
              </div>
              {s.price != null && (
                <EditableField value={typeof s.price === "number" ? `€${s.price}` : `€${s.price}`} onChange={ec ? v => onItemChange?.(i, "price", v.replace("€", "").trim()) : null} className="text-lg font-black tabular-nums shrink-0" style={{ color: primaryColor }} />
              )}
            </div>
            {selected === i && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <button className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all active:scale-[0.97]" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}CC)` }}>
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