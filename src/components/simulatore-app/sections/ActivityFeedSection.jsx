import React from "react";
import EditableField from "../EditableField";

export default function ActivityFeedSection({ title, subtitle, items, primaryColor, editable, onItemChange, onSectionChange }) {
  const ec = editable ? true : false;

  return (
    <div className="px-4 py-5">
      {title && (
        <div className="mb-4">
          <EditableField value={subtitle || "ATTIVITÀ"} onChange={ec ? v => onSectionChange?.("subtitle", v) : null} tag="p" className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-1" />
          <EditableField value={title} onChange={ec ? v => onSectionChange?.("title", v) : null} tag="h3" className="text-lg font-bold text-white" style={{ fontFamily: "Georgia, serif" }} />
        </div>
      )}
      <div className="space-y-2.5">
        {items.map((a, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.04]">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: a.valueColor || primaryColor }} />
            <div className="flex-1 min-w-0">
              <EditableField value={a.text} onChange={ec ? v => onItemChange?.(i, "text", v) : null} className="text-xs font-semibold text-white" />
              {a.detail && <EditableField value={a.detail} onChange={ec ? v => onItemChange?.(i, "detail", v) : null} className="text-[10px] text-white/25 mt-0.5" />}
            </div>
            <div className="text-right shrink-0">
              {a.valueText && <EditableField value={a.valueText} onChange={ec ? v => onItemChange?.(i, "valueText", v) : null} className="text-xs font-black tabular-nums" style={{ color: a.valueColor || primaryColor }} />}
              {a.time && <p className="text-[9px] text-white/20 mt-0.5">{a.time}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}