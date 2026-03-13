import React, { useState } from "react";
import EditableField from "../EditableField";

export default function BookingSection({ title, subtitle, items, primaryColor, editable, onSectionChange }) {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [booked, setBooked] = useState(false);
  const ec = editable ? true : false;

  const rawSlots = items?.[0]?.slots || [];
  const slots = rawSlots.map(s => typeof s === "string" ? { time: s, available: true } : s);

  return (
    <div className="px-4 py-5">
      {title && (
        <div className="mb-4">
          <EditableField value={subtitle || "PRENOTAZIONE"} onChange={ec ? v => onSectionChange?.("subtitle", v) : null} tag="p" className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-1" />
          <EditableField value={title} onChange={ec ? v => onSectionChange?.("title", v) : null} tag="h3" className="text-lg font-bold text-white" style={{ fontFamily: "Georgia, serif" }} />
        </div>
      )}
      <div className="grid grid-cols-4 gap-2">
        {slots.map((s, i) => {
          const isSelected = selectedSlot === s.time;
          const isAvailable = s.available !== false;
          return (
            <button key={i} onClick={() => { if (isAvailable) { setSelectedSlot(s.time); setBooked(false); } }} disabled={!isAvailable}
              className={`py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-[0.95] ${
                !isAvailable ? "bg-white/[0.02] text-white/15 cursor-not-allowed" :
                isSelected ? "text-white shadow-lg" : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08]"
              }`}
              style={isSelected ? { background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}CC)` } : {}}>
              {s.time}
            </button>
          );
        })}
      </div>
      {selectedSlot && !booked && (
        <button onClick={() => setBooked(true)} className="w-full mt-4 py-3 rounded-2xl text-white text-sm font-bold transition-all active:scale-[0.97]" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}CC)` }}>
          Prenota alle {selectedSlot}
        </button>
      )}
      {booked && (
        <div className="mt-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <p className="text-sm font-bold text-emerald-400">✓ Prenotato per le {selectedSlot}</p>
        </div>
      )}
    </div>
  );
}