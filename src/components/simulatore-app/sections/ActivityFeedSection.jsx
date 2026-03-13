import React from "react";

export default function ActivityFeedSection({ title, items }) {
  return (
    <div className="px-3 py-3">
      {title && <p className="text-xs font-bold text-gray-400 mb-2 px-1">{title}</p>}
      <div className="space-y-2">
        {items.map((a, i) => (
          <div key={i} className="flex items-center justify-between bg-[#1a1a2e] rounded-xl px-3 py-2.5 border border-white/5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate">{a.text}</p>
              {a.detail && <p className="text-[10px] text-gray-500">{a.detail}</p>}
              {a.time && <p className="text-[10px] text-gray-600">{a.time}</p>}
            </div>
            {a.valueText && (
              <span className={`text-sm font-bold ml-2 ${
                a.valueColor === "green" ? "text-green-400" :
                a.valueColor === "red" ? "text-red-400" :
                a.valueColor === "blue" ? "text-blue-400" : "text-white"
              }`}>{a.valueText}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}