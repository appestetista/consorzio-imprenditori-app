import React, { useState } from "react";
import { TrendingUp, TrendingDown, Users, FileText, Bell } from "lucide-react";

const ATTIVITA = [
  { tipo: "fattura", testo: "Fattura #124 — Mario Rossi", valore: "+€2.340", tempo: "2 ore fa", colore: "text-green-400" },
  { tipo: "scadenza", testo: "Scadenza F24 — IRPEF", valore: "-€1.890", tempo: "Domani", colore: "text-red-400" },
  { tipo: "cliente", testo: "Nuovo cliente — Bianchi Srl", valore: "", tempo: "5 ore fa", colore: "text-blue-400" },
  { tipo: "fattura", testo: "Fattura #123 — Verdi SpA", valore: "+€5.100", tempo: "Ieri", colore: "text-green-400" },
];

export default function GestionaleTemplate({ nome }) {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="min-h-full flex flex-col bg-[#0a0a15]">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 bg-[#12121f] border-b border-white/5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-white">{nome || "Gestionale"}</h2>
          <div className="relative">
            <Bell className="w-4 h-4 text-gray-400" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-2 p-3">
        <div className="bg-[#1a1a2e] rounded-xl p-3 border border-white/5">
          <p className="text-[10px] text-gray-500">Fatturato mese</p>
          <p className="text-lg font-black text-white mt-0.5">€23.450</p>
          <span className="flex items-center gap-0.5 text-[10px] text-green-400 mt-1">
            <TrendingUp className="w-3 h-3" /> +12%
          </span>
        </div>
        <div className="bg-[#1a1a2e] rounded-xl p-3 border border-white/5">
          <p className="text-[10px] text-gray-500">Da incassare</p>
          <p className="text-lg font-black text-amber-400 mt-0.5">€8.120</p>
          <span className="flex items-center gap-0.5 text-[10px] text-red-400 mt-1">
            <TrendingDown className="w-3 h-3" /> 3 scadute
          </span>
        </div>
        <div className="bg-[#1a1a2e] rounded-xl p-3 border border-white/5">
          <p className="text-[10px] text-gray-500">Clienti attivi</p>
          <p className="text-lg font-black text-white mt-0.5">47</p>
          <span className="flex items-center gap-0.5 text-[10px] text-green-400 mt-1">
            <Users className="w-3 h-3" /> +3 nuovi
          </span>
        </div>
        <div className="bg-[#1a1a2e] rounded-xl p-3 border border-white/5">
          <p className="text-[10px] text-gray-500">Fatture emesse</p>
          <p className="text-lg font-black text-white mt-0.5">124</p>
          <span className="flex items-center gap-0.5 text-[10px] text-gray-400 mt-1">
            <FileText className="w-3 h-3" /> questo mese
          </span>
        </div>
      </div>

      {/* Attività recente */}
      <div className="px-3 pb-4">
        <p className="text-xs font-bold text-gray-400 mb-2">Attività recente</p>
        <div className="space-y-2">
          {ATTIVITA.map((a, i) => (
            <div key={i} className="flex items-center justify-between bg-[#1a1a2e] rounded-xl px-3 py-2.5 border border-white/5">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white truncate">{a.testo}</p>
                <p className="text-[10px] text-gray-500">{a.tempo}</p>
              </div>
              {a.valore && (
                <span className={`text-sm font-bold ml-2 ${a.colore}`}>{a.valore}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="sticky bottom-0 bg-[#12121f] border-t border-white/5 flex justify-around py-2">
        {["Dashboard", "Fatture", "Clienti", "Report"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab.toLowerCase())}
            className={`text-[10px] font-medium py-1 px-2 ${
              activeTab === tab.toLowerCase() ? "text-blue-400" : "text-gray-500"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}