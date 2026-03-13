import React, { useState } from "react";
import { Clock, Star } from "lucide-react";

const SERVIZI = [
  { nome: "Pulizia Viso Profonda", durata: "60 min", prezzo: 55, rating: 4.9 },
  { nome: "Massaggio Rilassante", durata: "45 min", prezzo: 45, rating: 4.8 },
  { nome: "Manicure Semipermanente", durata: "40 min", prezzo: 30, rating: 4.7 },
  { nome: "Ceretta Completa", durata: "30 min", prezzo: 40, rating: 4.6 },
  { nome: "Trattamento Anti-Age", durata: "75 min", prezzo: 85, rating: 5.0 },
];

const ORARI = ["09:00", "10:00", "11:30", "14:00", "15:30", "17:00"];

export default function CentroEsteticoTemplate({ nome }) {
  const [selectedService, setSelectedService] = useState(null);
  const [selectedOrario, setSelectedOrario] = useState(null);
  const [booked, setBooked] = useState(false);

  return (
    <div className="min-h-full flex flex-col" style={{ background: "linear-gradient(180deg, #2d1b4e 0%, #1a1028 100%)" }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h2 className="text-lg font-black text-white">{nome || "Beauty Lounge"}</h2>
        <p className="text-xs text-purple-300/60 mt-0.5">Prenota il tuo trattamento</p>
      </div>

      {/* Promo */}
      <div className="mx-3 mb-4 rounded-xl p-3" style={{ background: "linear-gradient(135deg, #ec4899, #a855f7)" }}>
        <p className="text-xs font-bold text-white">✨ -20% sul primo appuntamento</p>
        <p className="text-[10px] text-white/70 mt-0.5">Usa il codice BENVENUTA</p>
      </div>

      {/* Lista servizi */}
      <div className="flex-1 px-3 space-y-2 pb-4">
        {SERVIZI.map((s, i) => {
          const isSelected = selectedService === i;
          return (
            <div key={i}>
              <button
                onClick={() => { setSelectedService(isSelected ? null : i); setSelectedOrario(null); setBooked(false); }}
                className={`w-full text-left rounded-xl p-3 transition-all border ${
                  isSelected
                    ? "bg-purple-600/20 border-purple-500/40"
                    : "bg-white/5 border-white/5 hover:border-white/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">{s.nome}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                        <Clock className="w-3 h-3" /> {s.durata}
                      </span>
                      <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                        <Star className="w-3 h-3 fill-amber-400" /> {s.rating}
                      </span>
                    </div>
                  </div>
                  <span className="text-base font-black text-pink-400">€{s.prezzo}</span>
                </div>
              </button>

              {/* Selezione orario */}
              {isSelected && !booked && (
                <div className="mt-2 px-1">
                  <p className="text-[10px] text-gray-400 mb-1.5">Scegli un orario per domani:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ORARI.map(o => (
                      <button
                        key={o}
                        onClick={() => setSelectedOrario(o)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selectedOrario === o
                            ? "bg-pink-600 text-white"
                            : "bg-white/5 text-gray-300 hover:bg-white/10"
                        }`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                  {selectedOrario && (
                    <button
                      onClick={() => setBooked(true)}
                      className="w-full mt-3 py-2 rounded-xl bg-pink-600 text-white text-xs font-bold hover:bg-pink-500 transition-colors"
                    >
                      Prenota alle {selectedOrario}
                    </button>
                  )}
                </div>
              )}

              {/* Conferma */}
              {isSelected && booked && (
                <div className="mt-2 px-1 py-2 rounded-xl bg-green-600/10 border border-green-500/20 text-center">
                  <p className="text-xs font-bold text-green-400">✓ Prenotato per domani alle {selectedOrario}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Riceverai conferma via SMS</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}