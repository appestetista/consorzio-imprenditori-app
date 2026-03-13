import React from "react";

export default function FeaturesSection({ title, items, primaryColor }) {
  return (
    <div className="px-3 py-3">
      {title && <p className="text-xs font-bold text-gray-400 mb-2 px-1">{title}</p>}
      <div className="space-y-2">
        {items.map((f, i) => (
          <div key={i} className="bg-[#1a1a2e] rounded-xl p-3 border border-white/5 flex items-start gap-3">
            <span className="text-xl">{f.emoji || "✨"}</span>
            <div>
              <p className="text-sm font-bold text-white">{f.name}</p>
              {f.description && <p className="text-[10px] text-gray-400 mt-0.5">{f.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}