import React, { useState } from "react";
import { Heart } from "lucide-react";
import EditableField from "../EditableField";
import EditableImage from "../EditableImage";

export default function ProductGridSection({ title, subtitle, items, primaryColor, editable, onItemChange, onSectionChange }) {
  const [liked, setLiked] = useState([]);
  const toggle = (i) => setLiked(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i]);
  const ec = editable ? true : false;

  return (
    <div className="px-4 py-5">
      {title && (
        <div className="mb-4">
          <EditableField value={subtitle || "COLLEZIONE"} onChange={ec ? v => onSectionChange?.("subtitle", v) : null} tag="p" className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-1" />
          <EditableField value={title} onChange={ec ? v => onSectionChange?.("title", v) : null} tag="h3" className="text-lg font-bold text-white" style={{ fontFamily: "Georgia, serif" }} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {items.map((p, i) => (
          <div key={i} className="group rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.04] transition-all duration-300 hover:border-white/10 active:scale-[0.97]">
            <div className="relative h-32 overflow-hidden" style={{
              background: p.image_url ? "#111" : `linear-gradient(135deg, ${primaryColor}20 0%, ${primaryColor}08 100%)`
            }}>
              {p.image_url ? (
                ec ? (
                  <EditableImage src={p.image_url} alt={p.name} onChange={url => onItemChange?.(i, "image_url", url)}>
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" onError={e => { e.target.style.display = "none"; }} />
                  </EditableImage>
                ) : (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" onError={e => { e.target.style.display = "none"; }} />
                )
              ) : (
                <div className="flex items-center justify-center h-full">
                  {ec ? (
                    <EditableImage src="" onChange={url => onItemChange?.(i, "image_url", url)}>
                      <span className="text-4xl relative z-10">{p.emoji || "📦"}</span>
                    </EditableImage>
                  ) : (
                    <span className="text-4xl relative z-10">{p.emoji || "📦"}</span>
                  )}
                </div>
              )}
              {p.tag && (
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider text-white z-20" style={{ background: primaryColor }}>{p.tag}</span>
              )}
              <button onClick={() => toggle(i)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center transition-all active:scale-90 z-20">
                <Heart className={`w-3.5 h-3.5 ${liked.includes(i) ? "fill-red-500 text-red-500" : "text-white/60"}`} />
              </button>
            </div>
            <div className="p-3">
              <EditableField value={p.name} onChange={ec ? v => onItemChange?.(i, "name", v) : null} className="text-xs font-bold text-white truncate" />
              {p.description && <EditableField value={p.description} onChange={ec ? v => onItemChange?.(i, "description", v) : null} className="text-[10px] text-white/30 mt-0.5 truncate" />}
              <div className="flex items-center gap-1.5 mt-1">
                <EditableField value={typeof p.price === "number" ? `€${p.price}` : `€${p.price}`} onChange={ec ? v => onItemChange?.(i, "price", v.replace("€", "").trim()) : null} className="text-sm font-black tabular-nums" style={{ color: primaryColor }} />
                {p.originalPrice && <span className="text-[10px] text-white/25 line-through">€{p.originalPrice}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}