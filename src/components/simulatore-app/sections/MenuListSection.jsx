import React, { useState } from "react";

export default function MenuListSection({ title, subtitle, items, primaryColor }) {
  const [cart, setCart] = useState([]);
  const add = (item) => setCart(prev => [...prev, item]);
  const totale = cart.reduce((s, i) => s + (parseFloat(i.price) || 0), 0);

  return (
    <div className="px-4 py-5">
      {title && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-1">{subtitle || "MENU"}</p>
          <h3 className="text-lg font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>{title}</h3>
        </div>
      )}
      <div className="h-px bg-white/5 mb-4" />
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="group flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.06] transition-all duration-300">
            {/* Image or emoji */}
            {item.image_url ? (
              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" onError={(e) => { e.target.parentNode.innerHTML = `<div class="w-full h-full flex items-center justify-center text-lg" style="background:${primaryColor}15">${item.emoji || "🍽️"}</div>`; }} />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: primaryColor + "15" }}>
                {item.emoji || "🍽️"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white">{item.name}</p>
                {item.badge && (
                  <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: primaryColor + "20", color: primaryColor }}>
                    {item.badge}
                  </span>
                )}
              </div>
              {item.description && <p className="text-[11px] text-white/35 mt-0.5 leading-relaxed line-clamp-2">{item.description}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {item.price != null && (
                <span className="text-base font-black tabular-nums" style={{ color: primaryColor }}>
                  €{typeof item.price === "number" ? item.price.toFixed(2) : item.price}
                </span>
              )}
              <button
                onClick={() => add(item)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white transition-all active:scale-90"
                style={{ background: primaryColor + "25", color: primaryColor }}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
      {cart.length > 0 && (
        <div className="mt-4 p-3 rounded-2xl flex items-center justify-between" style={{ background: primaryColor + "10", border: `1px solid ${primaryColor}20` }}>
          <span className="text-xs text-white/50">{cart.length} element{cart.length > 1 ? "i" : "o"}</span>
          <span className="text-lg font-black text-white">€{totale.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}