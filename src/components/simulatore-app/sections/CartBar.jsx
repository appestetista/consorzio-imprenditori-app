import React, { useState } from "react";
import { ShoppingCart, ChevronUp, Minus, Plus, X } from "lucide-react";

export default function CartBar({ cart, primaryColor, darkMode, onRemove, onUpdateQty }) {
  const [expanded, setExpanded] = useState(false);
  const isDark = darkMode !== false;

  if (!cart || cart.length === 0) return null;

  const totalQty = cart.reduce((s, c) => s + c.qty, 0);
  const totalPrice = cart.reduce((s, c) => s + (c.price * c.qty), 0);

  return (
    <>
      {/* Overlay when expanded */}
      {expanded && (
        <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm" onClick={() => setExpanded(false)} />
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40" style={{ maxWidth: 430, margin: "0 auto" }}>
        {/* Expanded cart detail */}
        {expanded && (
          <div
            className="mx-3 mb-1 rounded-2xl border overflow-hidden shadow-2xl"
            style={{
              background: isDark ? "#151520" : "#fff",
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
              maxHeight: 280,
              overflowY: "auto",
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
              <span className="text-sm font-bold" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>Il tuo ordine</span>
              <button onClick={() => setExpanded(false)} className="p-1 rounded-full" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            {cart.map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}` }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>{item.name}</p>
                  <p className="text-[10px]" style={{ color: primaryColor }}>€{(item.price * item.qty).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => item.qty <= 1 ? onRemove(i) : onUpdateQty(i, item.qty - 1)}
                    className="w-6 h-6 rounded-full flex items-center justify-center transition-all active:scale-90"
                    style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}
                  >
                    {item.qty <= 1 ? <X className="w-3 h-3" style={{ color: "#ef4444" }} /> : <Minus className="w-3 h-3" style={{ color: isDark ? "#fff" : "#000" }} />}
                  </button>
                  <span className="text-xs font-bold w-5 text-center" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>{item.qty}</span>
                  <button
                    onClick={() => onUpdateQty(i, item.qty + 1)}
                    className="w-6 h-6 rounded-full flex items-center justify-center transition-all active:scale-90"
                    style={{ background: primaryColor + "20", color: primaryColor }}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Main bar */}
        <div
          className="mx-3 mb-3 rounded-2xl flex items-center justify-between px-4 py-3 shadow-2xl border"
          style={{
            background: isDark
              ? `linear-gradient(135deg, ${primaryColor}20 0%, #151520 100%)`
              : `linear-gradient(135deg, ${primaryColor}10 0%, #fff 100%)`,
            borderColor: isDark ? primaryColor + "30" : primaryColor + "20",
          }}
        >
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative">
              <ShoppingCart className="w-5 h-5" style={{ color: primaryColor }} />
              <span
                className="absolute -top-1.5 -right-1.5 text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center text-white"
                style={{ background: primaryColor }}
              >
                {totalQty}
              </span>
            </div>
            <div className="text-left min-w-0">
              <p className="text-[10px] font-medium" style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }}>
                {totalQty} element{totalQty > 1 ? "i" : "o"}
              </p>
              <p className="text-lg font-black" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>€{totalPrice.toFixed(2)}</p>
            </div>
            <ChevronUp
              className="w-4 h-4 transition-transform"
              style={{ color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)", transform: expanded ? "rotate(180deg)" : "rotate(0)" }}
            />
          </button>

          <button
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95 shrink-0 ml-3"
            style={{ background: primaryColor, boxShadow: `0 4px 12px ${primaryColor}40` }}
            onClick={() => alert(`Ordine confermato! Totale: €${totalPrice.toFixed(2)}`)}
          >
            Ordina
          </button>
        </div>
      </div>
    </>
  );
}