import React from "react";
import EditableField from "../EditableField";

export default function FeaturesSection({ title, subtitle, items, primaryColor, editable, onItemChange, onSectionChange }) {
  const ec = editable ? true : false;

  return (
    <div className="px-4 py-5">
      {title && (
        <div className="mb-4">
          <EditableField value={subtitle || "FUNZIONALITÀ"} onChange={ec ? v => onSectionChange?.("subtitle", v) : null} tag="p" className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-1" />
          <EditableField value={title} onChange={ec ? v => onSectionChange?.("title", v) : null} tag="h3" className="text-lg font-bold text-white" style={{ fontFamily: "Georgia, serif" }} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {items.map((f, i) => (
          <div key={i} className="rounded-2xl p-4 bg-white/[0.03] border border-white/[0.04] transition-all duration-300">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3" style={{ background: primaryColor + "12" }}>
              {f.emoji || "✨"}
            </div>
            <EditableField value={f.name} onChange={ec ? v => onItemChange?.(i, "name", v) : null} className="text-xs font-bold text-white mb-1" />
            <EditableField value={f.description} onChange={ec ? v => onItemChange?.(i, "description", v) : null} className="text-[10px] text-white/30 leading-relaxed" />
          </div>
        ))}
      </div>
    </div>
  );
}