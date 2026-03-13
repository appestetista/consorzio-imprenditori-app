import React from "react";
import { Mail, Phone, MapPin } from "lucide-react";

export default function ContactSection({ title, items, primaryColor }) {
  const info = items?.[0];
  if (!info) return null;

  return (
    <div className="px-3 py-3">
      {title && <p className="text-xs font-bold text-gray-400 mb-2 px-1">{title}</p>}
      <div className="bg-[#1a1a2e] rounded-xl p-3 border border-white/5 space-y-2">
        {info.email && (
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <Mail className="w-3.5 h-3.5" style={{ color: primaryColor }} /> {info.email}
          </div>
        )}
        {info.phone && (
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <Phone className="w-3.5 h-3.5" style={{ color: primaryColor }} /> {info.phone}
          </div>
        )}
        {info.address && (
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <MapPin className="w-3.5 h-3.5" style={{ color: primaryColor }} /> {info.address}
          </div>
        )}
      </div>
    </div>
  );
}