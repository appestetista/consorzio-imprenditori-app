import React from "react";

export default function ActivityFeedSection({ title, subtitle, items, primaryColor }) {
  return (
    <div className="px-4 py-5">
      {title && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-1">{subtitle || "ATTIVITÀ"}</p>
          <h3 className="text-lg font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>{title}</h3>
        </div>
      )}
      <div className="space-y-2.5">
        {items.map((a, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.04]">
            {/* Timeline dot */}
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: a.valueColor || primaryColor }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white">{a.text}</p>
              {a.detail && <p className="text-[10px] text-white/25 mt-0.5">{a.detail}</p>}
            </div>
            <div className="text-right shrink-0">
              {a.valueText && (
                <p className="text-xs font-black tabular-nums" style={{ color: a.valueColor || primaryColor }}>{a.valueText}</p>
              )}
              {a.time && <p className="text-[9px] text-white/20 mt-0.5">{a.time}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}