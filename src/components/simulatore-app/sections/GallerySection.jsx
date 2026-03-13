import React, { useState } from "react";

const DEFAULT_GRADIENTS = [
  ["#667eea", "#764ba2"],
  ["#f093fb", "#f5576c"],
  ["#4facfe", "#00f2fe"],
  ["#43e97b", "#38f9d7"],
  ["#fa709a", "#fee140"],
  ["#a18cd1", "#fbc2eb"],
];

export default function GallerySection({ title, subtitle, items, primaryColor }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className="px-4 py-5">
      {title && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-1">{subtitle || "GALLERIA"}</p>
          <h3 className="text-lg font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>{title}</h3>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {items.map((w, i) => {
          const grad = w.gradient || DEFAULT_GRADIENTS[i % DEFAULT_GRADIENTS.length];
          const hasImage = w.image_url;
          return (
            <button
              key={i}
              onClick={() => setSelected(selected === i ? null : i)}
              className="rounded-2xl overflow-hidden border transition-all duration-300 active:scale-[0.95]"
              style={{ borderColor: selected === i ? primaryColor + "40" : "rgba(255,255,255,0.04)" }}
            >
              <div className="relative h-28 flex items-end p-3 overflow-hidden" style={{
                background: hasImage ? "#111" : `linear-gradient(135deg, ${grad[0]}, ${grad[1]})`
              }}>
                {hasImage && (
                  <img src={w.image_url} alt={w.title} className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
                )}
                {!hasImage && (
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" style={{ height: "50%" }} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="relative z-10">
                  <p className="text-[11px] font-bold text-white">{w.title}</p>
                  {w.tag && (
                    <span className="text-[8px] font-semibold uppercase tracking-wider text-white/60">{w.tag}</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}