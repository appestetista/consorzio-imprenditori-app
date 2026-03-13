import React, { useState } from "react";

export default function CtaBannerSection({ items, primaryColor }) {
  const [clicked, setClicked] = useState(false);
  const item = items?.[0];
  if (!item) return null;

  return (
    <div className="px-3 py-3">
      <div className="rounded-xl p-4" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}99)` }}>
        <p className="text-sm font-bold text-white">{item.text}</p>
        <button
          onClick={() => setClicked(!clicked)}
          className={`mt-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
            clicked ? "bg-white/30 text-white" : "bg-white text-gray-900 hover:bg-white/90"
          }`}
        >
          {clicked ? "✓ Fatto!" : item.buttonText || "Scopri"}
        </button>
      </div>
    </div>
  );
}