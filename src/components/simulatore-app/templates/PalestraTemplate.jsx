import React, { useState } from "react";
import { Clock, Users, Flame } from "lucide-react";

const CORSI = [
  { nome: "CrossFit", orario: "07:00", durata: "60'", posti: 3, icon: "🏋️", cal: 650, colore: "#ef4444" },
  { nome: "Yoga Flow", orario: "09:00", durata: "50'", posti: 8, icon: "🧘", cal: 250, colore: "#8b5cf6" },
  { nome: "Spinning", orario: "12:30", durata: "45'", posti: 1, icon: "🚴", cal: 500, colore: "#f59e0b" },
  { nome: "Boxe Fitness", orario: "18:00", durata: "60'", posti: 5, icon: "🥊", cal: 700, colore: "#ef4444" },
  { nome: "Pilates", orario: "19:30", durata: "50'", posti: 12, icon: "🤸", cal: 300, colore: "#10b981" },
];

export default function PalestraTemplate({ nome }) {
  const [prenotati, setPrenotati] = useState([]);

  const togglePrenota = (i) => {
    setPrenotati(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  return (
    <div className="min-h-full flex flex-col bg-[#0a0a15]">
      {/* Header */}
      <div className="px-4 pt-5 pb-4" style={{ background: "linear-gradient(135deg, #16a34a 0%, #059669 100%)" }}>
        <h2 className="text-lg font-black text-white">{nome || "FitZone"}</h2>
        <p className="text-xs text-white/60 mt-0.5">Corsi di oggi</p>
        {/* Stats */}
        <div className="flex gap-3 mt-3">
          <div className="bg-black/20 rounded-lg px-3 py-1.5">
            <p className="text-[10px] text-white/60">Streak</p>
            <p className="text-sm font-black text-white">🔥 12 giorni</p>
          </div>
          <div className="bg-black/20 rounded-lg px-3 py-1.5">
            <p className="text-[10px] text-white/60">Questo mese</p>
            <p className="text-sm font-black text-white">18 sessioni</p>
          </div>
        </div>
      </div>

      {/* Lista corsi */}
      <div className="flex-1 px-3 py-3 space-y-2">
        {CORSI.map((c, i) => {
          const isBooked = prenotati.includes(i);
          return (
            <div key={i} className="bg-[#1a1a2e] rounded-xl p-3 border border-white/5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2.5">
                  <span className="text-2xl">{c.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{c.nome}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                      <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {c.orario} · {c.durata}</span>
                      <span className="flex items-center gap-0.5"><Flame className="w-3 h-3 text-orange-400" /> {c.cal} cal</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[10px]">
                      <Users className="w-3 h-3 text-gray-500" />
                      <span className={c.posti <= 3 ? "text-red-400 font-medium" : "text-gray-500"}>
                        {c.posti} post{c.posti === 1 ? "o" : "i"} rimast{c.posti === 1 ? "o" : "i"}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => togglePrenota(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isBooked
                      ? "bg-green-600/20 border border-green-500/30 text-green-400"
                      : "bg-green-600 text-white hover:bg-green-500"
                  }`}
                >
                  {isBooked ? "✓ Iscritto" : "Prenota"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}