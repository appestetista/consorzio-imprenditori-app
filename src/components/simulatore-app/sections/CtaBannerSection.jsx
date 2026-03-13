import React, { useState } from "react";
import EditableField from "../EditableField";

export default function CtaBannerSection({ items, primaryColor, secondaryColor, editable, onItemChange }) {
  const [clicked, setClicked] = useState(false);
  const item = items?.[0];
  if (!item) return null;
  const ec = editable ? true : false;

  return (
    <div className="px-4 py-3">
      <div className="relative overflow-hidden rounded-2xl p-5" style={{
        background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor || primaryColor}CC)`
      }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 blur-3xl" />
        {item.badge && (
          <span className="inline-block text-[9px] font-bold uppercase tracking-[0.15em] px-2.5 py-0.5 rounded-full bg-white/20 text-white mb-3">
            <EditableField value={item.badge} onChange={ec ? v => onItemChange?.(0, "badge", v) : null} />
          </span>
        )}
        <EditableField value={item.text} onChange={ec ? v => onItemChange?.(0, "text", v) : null} className="text-base font-bold text-white leading-snug relative z-10" />
        {item.buttonText && (
          <button onClick={() => setClicked(true)} className="mt-4 px-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.95] relative z-10" style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(10px)", color: "white" }}>
            <EditableField value={clicked ? "✓ Fatto!" : item.buttonText} onChange={ec ? v => onItemChange?.(0, "buttonText", v) : null} />
          </button>
        )}
      </div>
    </div>
  );
}