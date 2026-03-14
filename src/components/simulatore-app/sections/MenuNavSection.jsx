import React, { useState } from "react";

export default function MenuNavSection({ items, primaryColor, secondaryColor, onCategoryClick }) {
  const [active, setActive] = useState(0);
  const isDark = !secondaryColor || secondaryColor.startsWith("#0") || secondaryColor.startsWith("#1") || secondaryColor === "#000";

  const handleClick = (i, label) => {
    setActive(i);
    if (onCategoryClick) onCategoryClick(label);
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="sticky top-0 z-20" style={{ background: isDark ? "#0a0a0a" : (secondaryColor || "#fafafa") }}>
      <div className="flex gap-2 px-4 py-3 overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}>
        {items.map((item, i) => {
          const isActive = i === active;
          return (
            <button
              key={i}
              onClick={() => handleClick(i, item.label || item.name)}
              className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95"
              style={{
                background: isActive ? primaryColor : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"),
                color: isActive ? "#fff" : (isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"),
                border: isActive ? "none" : `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
              }}
            >
              {item.label || item.name}
            </button>
          );
        })}
      </div>
      <style>{`div::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}