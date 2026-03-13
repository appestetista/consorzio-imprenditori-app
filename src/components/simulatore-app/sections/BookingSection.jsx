import React, { useState } from "react";

export default function BookingSection({ title, items, primaryColor }) {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [booked, setBooked] = useState(false);
  const slots = items?.[0]?.slots || [];

  return (
    <div className="px-3 py-3">
      {title && <p className="text-xs font-bold text-gray-400 mb-2 px-1">{title}</p>}
      <div className="flex flex-wrap gap-1.5">
        {slots.map((s, i) => (
          <button
            key={i}
            onClick={() => { setSelectedSlot(s); setBooked(false); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedSlot === s ? "text-white" : "bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
            style={selectedSlot === s ? { background: primaryColor } : {}}
          >
            {s}
          </button>
        ))}
      </div>
      {selectedSlot && !booked && (
        <button
          onClick={() => setBooked(true)}
          className="w-full mt-3 py-2 rounded-xl text-white text-xs font-bold transition-colors"
          style={{ background: primaryColor }}
        >
          Prenota alle {selectedSlot}
        </button>
      )}
      {booked && (
        <div className="mt-3 py-2 rounded-xl bg-green-600/10 border border-green-500/20 text-center">
          <p className="text-xs font-bold text-green-400">✓ Prenotato per le {selectedSlot}</p>
        </div>
      )}
    </div>
  );
}