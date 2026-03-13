import React, { useState } from "react";

export default function DynamicBottomNav({ items, primaryColor }) {
  const [active, setActive] = useState(items.findIndex(i => i.active) || 0);

  return (
    <div className="sticky bottom-0 bg-[#12121f] border-t border-white/5 flex justify-around py-2.5">
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => setActive(i)}
          className="text-[10px] font-medium py-0.5 px-2 transition-colors"
          style={{ color: active === i ? primaryColor : "#6b7280" }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}