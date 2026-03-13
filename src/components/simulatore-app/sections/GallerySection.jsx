import React, { useState } from "react";

const EMOJIS = ["🎨", "💻", "📱", "🎯", "📦", "🎬", "📸", "🖼️", "✏️", "🎭"];

export default function GallerySection({ title, items, primaryColor }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className="px-3 py-3">
      {title && <p className="text-xs font-bold text-gray-400 mb-2 px-1">{title}</p>}
      <div className="grid grid-cols-2 gap-2">
        {items.map((w, i) => (
          <button
            key={i}
            onClick={() => setSelected(selected === i ? null : i)}
            className={`rounded-xl overflow-hidden border transition-all ${
              selected === i ? "border-opacity-40 scale-[0.97]" : "border-white/5"
            }`}
            style={selected === i ? { borderColor: primaryColor } : {}}
          >
            <div className="h-16 flex items-center justify-center text-2xl" style={{ background: primaryColor + "15" }}>
              {EMOJIS[i % EMOJIS.length]}
            </div>
            <div className="p-2 bg-[#1a1a2e]">
              <p className="text-[10px] font-bold text-white truncate">{w.title}</p>
              {w.tag && (
                <span className="text-[8px] px-1.5 py-0.5 rounded mt-0.5 inline-block" style={{ background: primaryColor + "20", color: primaryColor }}>
                  {w.tag}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}