import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";

const PILL_THRESHOLD = 6;

export default function MenuNavSection({ items, primaryColor, secondaryColor, onCategoryClick }) {
  const [active, setActive] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const isDark = !secondaryColor || secondaryColor.startsWith("#0") || secondaryColor.startsWith("#1") || secondaryColor === "#000";

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  const handleClick = (i, label) => {
    setActive(i);
    setDropdownOpen(false);
    if (onCategoryClick) onCategoryClick(label);
  };

  if (!items || items.length === 0) return null;

  const usePills = items.length <= PILL_THRESHOLD;
  const bgBase = isDark ? "#0a0a0a" : (secondaryColor || "#fafafa");

  // Pill mode — barra scrollabile orizzontale
  if (usePills) {
    return (
      <div className="sticky top-0 z-20" style={{ background: bgBase }}>
        <div className="flex gap-2 px-4 py-3 overflow-x-auto" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
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
      </div>
    );
  }

  // Dropdown mode — menu a tendina
  const activeLabel = items[active]?.label || items[active]?.name || "Menu";

  return (
    <div className="sticky top-0 z-20" style={{ background: bgBase }} ref={dropdownRef}>
      <div className="px-4 py-3">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
          style={{
            background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
            color: isDark ? "#fff" : "#1a1a1a",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
          }}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: primaryColor }} />
            <span>{activeLabel}</span>
            <span className="text-xs font-normal" style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)" }}>
              ({items.length} sezioni)
            </span>
          </div>
          <ChevronDown
            className="w-5 h-5 transition-transform"
            style={{
              color: primaryColor,
              transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>
      </div>

      {/* Dropdown panel */}
      {dropdownOpen && (
        <div
          className="absolute left-0 right-0 top-full mx-4 rounded-xl overflow-hidden shadow-2xl border"
          style={{
            background: isDark ? "#151520" : "#fff",
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
            maxHeight: 320,
            overflowY: "auto",
            zIndex: 50,
          }}
        >
          {items.map((item, i) => {
            const isActive = i === active;
            const label = item.label || item.name;
            return (
              <button
                key={i}
                onClick={() => handleClick(i, label)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all active:scale-[0.98]"
                style={{
                  background: isActive ? primaryColor + "15" : "transparent",
                  borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: isActive ? primaryColor : (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)") }}
                />
                <span
                  className="text-sm font-semibold flex-1"
                  style={{ color: isActive ? primaryColor : (isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)") }}
                >
                  {label}
                </span>
                {isActive && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: primaryColor + "20", color: primaryColor }}>
                    Attivo
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}