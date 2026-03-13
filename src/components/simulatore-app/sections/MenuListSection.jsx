import React, { useState } from "react";

export default function MenuListSection({ title, items, primaryColor }) {
  const [cart, setCart] = useState([]);

  const add = (item) => setCart(prev => [...prev, item]);
  const totale = cart.reduce((s, i) => s + (parseFloat(i.price) || 0), 0);

  return (
    <div className="px-4 py-3">
      {title && <p className="text-xs font-bold text-gray-400 mb-2">{title}</p>}
      <div className="space-y-2.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">{item.name}</p>
              {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
            </div>
            <div className="flex items-center gap-2 ml-2">
              {item.price && (
                <span className="text-sm font-bold" style={{ color: primaryColor }}>
                  {typeof item.price === "number" ? `€${item.price.toFixed(2)}` : item.price}
                </span>
              )}
              <button
                onClick={() => add(item)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-colors"
                style={{ borderColor: primaryColor + "50", color: primaryColor, background: primaryColor + "15" }}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
      {cart.length > 0 && (
        <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-gray-400">{cart.length} element{cart.length > 1 ? "i" : "o"}</span>
          <span className="text-sm font-black text-white">€{totale.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}