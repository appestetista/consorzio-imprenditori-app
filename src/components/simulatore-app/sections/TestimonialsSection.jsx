import React from "react";
import { Star } from "lucide-react";

export default function TestimonialsSection({ title, items, primaryColor }) {
  return (
    <div className="px-3 py-3">
      {title && <p className="text-xs font-bold text-gray-400 mb-2 px-1">{title}</p>}
      <div className="space-y-2">
        {items.map((t, i) => (
          <div key={i} className="bg-[#1a1a2e] rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-1 mb-1">
              {Array.from({ length: t.rating || 5 }).map((_, j) => (
                <Star key={j} className="w-3 h-3 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-xs text-gray-300 italic">"{t.text}"</p>
            <p className="text-[10px] text-gray-500 mt-1.5 font-medium">— {t.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}