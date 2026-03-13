import React, { useState } from "react";

const NAV_ICONS = {
  home: "🏠", menu: "📋", ordini: "📦", profilo: "👤", cerca: "🔍",
  preferiti: "❤️", carrello: "🛒", impostazioni: "⚙️", chat: "💬",
  calendario: "📅", notifiche: "🔔", mappa: "📍", foto: "📷",
  servizi: "✨", prenota: "📝", offerte: "🏷️", categorie: "📂",
};

function getIcon(label, icon) {
  if (icon) return icon;
  const key = (label || "").toLowerCase().trim();
  return NAV_ICONS[key] || Object.entries(NAV_ICONS).find(([k]) => key.includes(k))?.[1] || "•";
}

export default function DynamicBottomNav({ items, primaryColor }) {
  const [active, setActive] = useState(items.findIndex(i => i.active) >= 0 ? items.findIndex(i => i.active) : 0);

  return (
    <div className="sticky bottom-0 bg-[#0a0a14]/90 backdrop-blur-xl border-t border-white/[0.04] flex justify-around py-2 px-1">
      {items.map((item, i) => {
        const isActive = active === i;
        return (
          <button
            key={i}
            onClick={() => setActive(i)}
            className="flex flex-col items-center gap-0.5 py-1 px-3 transition-all duration-200 active:scale-[0.9]"
          >
            <span className="text-base" style={{ opacity: isActive ? 1 : 0.35 }}>
              {getIcon(item.label, item.icon)}
            </span>
            <span className="text-[9px] font-semibold transition-colors" style={{ color: isActive ? primaryColor : "rgba(255,255,255,0.25)" }}>
              {item.label}
            </span>
            {isActive && (
              <div className="w-1 h-1 rounded-full mt-0.5" style={{ background: primaryColor }} />
            )}
          </button>
        );
      })}
    </div>
  );
}