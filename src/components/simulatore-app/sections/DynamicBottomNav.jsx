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

// Mappa label bottomNav → tipo sezione da scrollare
const SECTION_SCROLL_MAP = {
  home: null, // scroll to top
  menu: "menu_nav",
  servizi: "service_list",
  prenota: "booking",
  info: "contact",
  contatti: "contact",
  shop: "product_grid",
  carrello: null,
  corsi: "service_list",
  profilo: null,
};

export default function DynamicBottomNav({ items, primaryColor, darkMode }) {
  const [active, setActive] = useState(items.findIndex(i => i.active) >= 0 ? items.findIndex(i => i.active) : 0);
  const bgColor = darkMode === false ? "rgba(255,255,255,0.95)" : "rgba(10,10,20,0.9)";
  const inactiveColor = darkMode === false ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.25)";

  const handleClick = (i, label) => {
    setActive(i);
    const key = (label || "").toLowerCase().trim();
    const targetType = SECTION_SCROLL_MAP[key];
    
    if (targetType === null && key === "home") {
      // Scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    
    if (targetType) {
      // Cerca l'elemento con data-section-type
      const el = document.querySelector(`[data-section-type="${targetType}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
  };

  return (
    <div className="sticky bottom-0 backdrop-blur-xl border-t flex justify-around py-2 px-1 z-20" style={{ 
      background: bgColor,
      borderColor: darkMode === false ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.04)"
    }}>
      {items.map((item, i) => {
        const isActive = active === i;
        return (
          <button
            key={i}
            onClick={() => handleClick(i, item.label)}
            className="flex flex-col items-center gap-0.5 py-1 px-3 transition-all duration-200 active:scale-[0.9]"
          >
            <span className="text-base" style={{ opacity: isActive ? 1 : 0.35 }}>
              {getIcon(item.label, item.icon)}
            </span>
            <span className="text-[9px] font-semibold transition-colors" style={{ color: isActive ? primaryColor : inactiveColor }}>
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