import React from 'react';

// SVG scontornati per container 20', container 40' HC, camion e aereo
export function Container20Icon({ className = "w-16 h-10" }) {
  return (
    <svg viewBox="0 0 120 60" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="12" width="116" height="44" rx="3" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="2"/>
      <rect x="10" y="18" width="20" height="32" rx="1" fill="#0f2847" stroke="#60a5fa" strokeWidth="1"/>
      <rect x="34" y="18" width="20" height="32" rx="1" fill="#0f2847" stroke="#60a5fa" strokeWidth="1"/>
      <rect x="58" y="18" width="20" height="32" rx="1" fill="#0f2847" stroke="#60a5fa" strokeWidth="1"/>
      <rect x="82" y="18" width="26" height="32" rx="1" fill="#0f2847" stroke="#60a5fa" strokeWidth="1"/>
      <line x1="108" y1="20" x2="108" y2="48" stroke="#60a5fa" strokeWidth="2"/>
      <text x="60" y="10" textAnchor="middle" fill="#60a5fa" fontSize="9" fontWeight="bold">20'</text>
    </svg>
  );
}

export function Container40Icon({ className = "w-20 h-10" }) {
  return (
    <svg viewBox="0 0 160 60" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="12" width="156" height="44" rx="3" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="2"/>
      {[10, 30, 50, 70, 90, 110, 130].map((x, i) => (
        <rect key={i} x={x} y="18" width="16" height="32" rx="1" fill="#0f2847" stroke="#60a5fa" strokeWidth="0.8"/>
      ))}
      <line x1="148" y1="20" x2="148" y2="48" stroke="#60a5fa" strokeWidth="2"/>
      <text x="80" y="10" textAnchor="middle" fill="#60a5fa" fontSize="9" fontWeight="bold">40' HC</text>
    </svg>
  );
}

export function TruckIcon({ className = "w-20 h-12" }) {
  return (
    <svg viewBox="0 0 160 70" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Rimorchio */}
      <rect x="2" y="10" width="110" height="42" rx="3" fill="#1e293b" stroke="#8b5cf6" strokeWidth="2"/>
      <rect x="8" y="14" width="98" height="34" rx="1" fill="#0f172a" stroke="#a78bfa" strokeWidth="0.8"/>
      {/* Cabina */}
      <rect x="112" y="20" width="36" height="32" rx="4" fill="#374151" stroke="#8b5cf6" strokeWidth="2"/>
      <rect x="118" y="24" width="14" height="12" rx="2" fill="#60a5fa" opacity="0.3"/>
      <rect x="134" y="24" width="10" height="12" rx="2" fill="#60a5fa" opacity="0.3"/>
      {/* Ruote */}
      <circle cx="30" cy="56" r="7" fill="#374151" stroke="#64748b" strokeWidth="2"/>
      <circle cx="60" cy="56" r="7" fill="#374151" stroke="#64748b" strokeWidth="2"/>
      <circle cx="130" cy="56" r="7" fill="#374151" stroke="#64748b" strokeWidth="2"/>
      <circle cx="30" cy="56" r="3" fill="#64748b"/>
      <circle cx="60" cy="56" r="3" fill="#64748b"/>
      <circle cx="130" cy="56" r="3" fill="#64748b"/>
      <text x="56" y="8" textAnchor="middle" fill="#a78bfa" fontSize="8" fontWeight="bold">13.6m</text>
    </svg>
  );
}

export function ShipIcon({ className = "w-16 h-12" }) {
  return (
    <svg viewBox="0 0 120 70" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Scafo */}
      <path d="M10 50 L20 62 L100 62 L110 50 Z" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="2"/>
      {/* Container sul ponte */}
      <rect x="25" y="26" width="18" height="22" rx="1" fill="#22c55e" stroke="#16a34a" strokeWidth="1"/>
      <rect x="45" y="26" width="18" height="22" rx="1" fill="#f59e0b" stroke="#d97706" strokeWidth="1"/>
      <rect x="65" y="26" width="18" height="22" rx="1" fill="#ef4444" stroke="#dc2626" strokeWidth="1"/>
      <rect x="35" y="6" width="18" height="18" rx="1" fill="#3b82f6" stroke="#2563eb" strokeWidth="1"/>
      <rect x="55" y="6" width="18" height="18" rx="1" fill="#8b5cf6" stroke="#7c3aed" strokeWidth="1"/>
      {/* Cabina */}
      <rect x="85" y="30" width="15" height="18" rx="2" fill="#374151" stroke="#64748b" strokeWidth="1"/>
      {/* Acqua */}
      <path d="M0 65 Q15 60 30 65 Q45 70 60 65 Q75 60 90 65 Q105 70 120 65" stroke="#60a5fa" strokeWidth="1.5" fill="none" opacity="0.5"/>
    </svg>
  );
}

export function PlaneIcon({ className = "w-16 h-12" }) {
  return (
    <svg viewBox="0 0 120 60" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Fusoliera */}
      <ellipse cx="60" cy="30" rx="50" ry="10" fill="#1e293b" stroke="#a855f7" strokeWidth="1.5"/>
      {/* Ala superiore */}
      <path d="M40 30 L20 14 L80 14 L60 30" fill="#374151" stroke="#a855f7" strokeWidth="1"/>
      {/* Coda */}
      <path d="M108 30 L116 16 L116 30" fill="#374151" stroke="#a855f7" strokeWidth="1"/>
      {/* Cargo bay */}
      <rect x="22" y="26" width="60" height="8" rx="2" fill="#a855f7" opacity="0.15"/>
      <text x="52" y="33" textAnchor="middle" fill="#c084fc" fontSize="6" fontWeight="bold">CARGO</text>
      {/* Muso */}
      <ellipse cx="12" cy="30" rx="3" ry="8" fill="#475569" stroke="#a855f7" strokeWidth="1"/>
    </svg>
  );
}