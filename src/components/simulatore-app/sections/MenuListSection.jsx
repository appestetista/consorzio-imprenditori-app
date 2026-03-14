import React, { useState } from "react";
import EditableField from "../EditableField";
import EditableImage from "../EditableImage";

export default function MenuListSection({ title, subtitle, items, primaryColor, secondaryColor, editable, onItemChange, onSectionChange, onAddToCart }) {
  const isDark = !secondaryColor || secondaryColor.startsWith("#0") || secondaryColor.startsWith("#1") || secondaryColor === "#000";
  const textColor = isDark ? "text-white" : "text-gray-900";
  const textMuted = isDark ? "text-white/35" : "text-gray-500";
  const subtitleColor = isDark ? "text-white/30" : "text-gray-400";
  const cardBg = isDark ? "bg-white/[0.03] border-white/[0.04] hover:bg-white/[0.06]" : "bg-white border-gray-100 hover:bg-gray-50 shadow-sm";

  const ec = editable ? true : false;

  return (
    <div className="px-4 py-5">
      {title && (
        <div className="mb-4">
          <EditableField value={subtitle || "MENU"} onChange={ec ? v => onSectionChange?.("subtitle", v) : null} tag="p" className={`text-[10px] font-semibold uppercase tracking-[0.15em] ${subtitleColor} mb-1`} />
          <EditableField value={title} onChange={ec ? v => onSectionChange?.("title", v) : null} tag="h3" className={`text-lg font-bold ${textColor}`} style={{ fontFamily: "Georgia, serif" }} />
        </div>
      )}
      <div className={`h-px ${isDark ? "bg-white/5" : "bg-gray-200"} mb-4`} />
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className={`group flex items-start gap-3 p-3 rounded-2xl border transition-all duration-300 ${cardBg}`}>
            {item.image_url ? (
              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                {ec ? (
                  <EditableImage src={item.image_url} alt={item.name} className="w-full h-full object-cover" onChange={url => onItemChange?.(i, "image_url", url)}>
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" onError={e => { e.target.parentNode.innerHTML = `<div class="w-full h-full flex items-center justify-center text-lg" style="background:${primaryColor}15">${item.emoji || "🍽️"}</div>`; }} />
                  </EditableImage>
                ) : (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" onError={e => { e.target.parentNode.innerHTML = `<div class="w-full h-full flex items-center justify-center text-lg" style="background:${primaryColor}15">${item.emoji || "🍽️"}</div>`; }} />
                )}
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: primaryColor + "15" }}>
                {ec ? (
                  <EditableImage src="" onChange={url => onItemChange?.(i, "image_url", url)}>
                    <span>{item.emoji || "🍽️"}</span>
                  </EditableImage>
                ) : (
                  item.emoji || "🍽️"
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <EditableField value={item.name} onChange={ec ? v => onItemChange?.(i, "name", v) : null} className={`text-sm font-bold ${textColor}`} />
                {item.badge && (
                  <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: primaryColor + "20", color: primaryColor }}>
                    {item.badge}
                  </span>
                )}
              </div>
              {item.description && <EditableField value={item.description} onChange={ec ? v => onItemChange?.(i, "description", v) : null} className={`text-[11px] ${textMuted} mt-0.5 leading-relaxed`} />}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {item.price != null && (
                <EditableField value={typeof item.price === "number" ? `€${item.price.toFixed(2)}` : `€${item.price}`} onChange={ec ? v => onItemChange?.(i, "price", v.replace("€", "").trim()) : null} className="text-base font-black tabular-nums" style={{ color: primaryColor }} />
              )}
              <button onClick={() => onAddToCart ? onAddToCart(item) : null} className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all active:scale-90" style={{ background: primaryColor + "20", color: primaryColor }}>+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}