import React, { useState } from "react";
import { Mail, ExternalLink } from "lucide-react";

const WORKS = [
  { titolo: "Brand Identity Luxe", tag: "Branding", colore: "#a855f7" },
  { titolo: "E-commerce Redesign", tag: "Web Design", colore: "#3b82f6" },
  { titolo: "Campagna Social", tag: "Marketing", colore: "#ec4899" },
  { titolo: "App Mobile UX", tag: "UI/UX", colore: "#f59e0b" },
  { titolo: "Packaging Prodotto", tag: "Packaging", colore: "#10b981" },
  { titolo: "Video Aziendale", tag: "Video", colore: "#ef4444" },
];

export default function PortfolioTemplate({ nome }) {
  const [selected, setSelected] = useState(null);
  const [showContact, setShowContact] = useState(false);

  return (
    <div className="min-h-full flex flex-col bg-[#0a0a10]">
      {/* Hero */}
      <div className="px-4 pt-8 pb-5 text-center">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mx-auto mb-3 flex items-center justify-center text-xl font-black text-white">
          {(nome || "Studio")[0]}
        </div>
        <h2 className="text-lg font-black text-white">{nome || "Studio Creativo"}</h2>
        <p className="text-xs text-gray-400 mt-0.5">Design · Branding · Digital</p>
        <button
          onClick={() => setShowContact(!showContact)}
          className="mt-3 px-4 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs text-gray-300 hover:bg-white/15 transition-colors inline-flex items-center gap-1"
        >
          <Mail className="w-3 h-3" /> Contattami
        </button>
      </div>

      {showContact && (
        <div className="mx-3 mb-3 bg-purple-600/10 border border-purple-500/20 rounded-xl p-3 text-center">
          <p className="text-xs text-purple-300 font-medium">info@{(nome || "studio").toLowerCase().replace(/\s/g, "")}.it</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Rispondo entro 24h</p>
        </div>
      )}

      {/* Griglia lavori */}
      <div className="flex-1 px-3 pb-4">
        <p className="text-xs font-bold text-gray-400 mb-2">Lavori selezionati</p>
        <div className="grid grid-cols-2 gap-2">
          {WORKS.map((w, i) => (
            <button
              key={i}
              onClick={() => setSelected(selected === i ? null : i)}
              className={`rounded-xl overflow-hidden border transition-all ${
                selected === i ? "border-purple-500/40 scale-[0.97]" : "border-white/5"
              }`}
            >
              <div className="h-20 flex items-center justify-center" style={{ background: `${w.colore}20` }}>
                <span className="text-3xl">
                  {["🎨", "💻", "📱", "🎯", "📦", "🎬"][i]}
                </span>
              </div>
              <div className="p-2 bg-[#1a1a2e]">
                <p className="text-[11px] font-bold text-white truncate">{w.titolo}</p>
                <span className="text-[9px] px-1.5 py-0.5 rounded mt-1 inline-block" style={{ background: `${w.colore}20`, color: w.colore }}>
                  {w.tag}
                </span>
              </div>
            </button>
          ))}
        </div>

        {selected !== null && (
          <div className="mt-3 bg-[#1a1a2e] rounded-xl p-3 border border-white/10">
            <p className="text-sm font-bold text-white">{WORKS[selected].titolo}</p>
            <p className="text-xs text-gray-400 mt-1">
              Progetto realizzato per un cliente del settore. 
              Obiettivo: aumentare visibilità e conversioni del 40%.
            </p>
            <button className="mt-2 text-xs text-purple-400 flex items-center gap-1 hover:text-purple-300">
              <ExternalLink className="w-3 h-3" /> Vedi progetto completo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}