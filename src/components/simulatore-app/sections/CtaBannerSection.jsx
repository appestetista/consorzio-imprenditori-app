import React, { useState } from "react";

export default function CtaBannerSection({ items, primaryColor, secondaryColor }) {
  const [clicked, setClicked] = useState(false);
  const item = items?.[0];
  if (!item) return null;

  return (
    <div className="px-4 py-3">
      <div className="relative overflow-hidden rounded-2xl p-5" style={{
        background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor || primaryColor}CC)`
      }}>
        {/* Glow */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 blur-3xl" />
        
        {item.badge && (
          <span className="inline-block text-[9px] font-bold uppercase tracking-[0.15em] px-2.5 py-0.5 rounded-full bg-white/20 text-white mb-3">
            {item.badge}
          </span>
        )}
        <p className="text-base font-bold text-white leading-snug relative z-10">{item.text}</p>
        {item.buttonText && (
          <button
            onClick={() => setClicked(true)}
            className="mt-4 px-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.95] relative z-10"
            style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(10px)", color: "white" }}
          >
            {clicked ? "✓ Fatto!" : item.buttonText}
          </button>
        )}
      </div>
    </div>
  );
}