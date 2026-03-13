import React from "react";

export default function FeaturesSection({ title, subtitle, items, primaryColor }) {
  return (
    <div className="px-4 py-5">
      {title && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-1">{subtitle || "FUNZIONALITÀ"}</p>
          <h3 className="text-lg font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>{title}</h3>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {items.map((f, i) => (
          <div key={i} className="rounded-2xl p-4 bg-white/[0.03] border border-white/[0.04] transition-all duration-300">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3" style={{ background: primaryColor + "12" }}>
              {f.emoji || "✨"}
            </div>
            <p className="text-xs font-bold text-white mb-1">{f.name}</p>
            <p className="text-[10px] text-white/30 leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}