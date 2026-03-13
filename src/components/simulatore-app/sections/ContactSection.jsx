import React from "react";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

export default function ContactSection({ title, subtitle, items, primaryColor }) {
  const info = items?.[0];
  if (!info) return null;

  const rows = [
    { icon: Mail, value: info.email, label: "Email" },
    { icon: Phone, value: info.phone, label: "Telefono" },
    { icon: MapPin, value: info.address, label: "Indirizzo" },
    { icon: Clock, value: info.hours, label: "Orari" },
  ].filter(r => r.value);

  return (
    <div className="px-4 py-5">
      {title && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-1">{subtitle || "CONTATTI"}</p>
          <h3 className="text-lg font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>{title}</h3>
        </div>
      )}
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.04]">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: primaryColor + "15" }}>
              <r.icon className="w-4 h-4" style={{ color: primaryColor }} />
            </div>
            <div>
              <p className="text-[10px] text-white/25 font-semibold uppercase tracking-wider">{r.label}</p>
              <p className="text-xs text-white/70 mt-0.5">{r.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}