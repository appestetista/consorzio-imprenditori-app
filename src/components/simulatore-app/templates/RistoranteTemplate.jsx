import React, { useState } from "react";

const MENU = {
  Antipasti: [
    { nome: "Bruschetta", desc: "Pomodoro fresco e basilico", prezzo: 7 },
    { nome: "Tagliere misto", desc: "Salumi e formaggi locali", prezzo: 14 },
    { nome: "Supplì al telefono", desc: "Riso, ragù e mozzarella", prezzo: 5 },
  ],
  Primi: [
    { nome: "Carbonara", desc: "La vera ricetta romana", prezzo: 12 },
    { nome: "Cacio e pepe", desc: "Pecorino DOP e pepe nero", prezzo: 11 },
    { nome: "Amatriciana", desc: "Guanciale croccante", prezzo: 12.5 },
  ],
  Secondi: [
    { nome: "Saltimbocca", desc: "Vitello, prosciutto e salvia", prezzo: 16 },
    { nome: "Grigliata mista", desc: "Carne alla brace", prezzo: 18 },
  ],
  Dolci: [
    { nome: "Tiramisù", desc: "Ricetta della nonna", prezzo: 7 },
    { nome: "Panna cotta", desc: "Con coulis di frutti rossi", prezzo: 6 },
  ],
};

const CATEGORIE = Object.keys(MENU);

export default function RistoranteTemplate({ nome }) {
  const [tab, setTab] = useState("Primi");
  const [carrello, setCarrello] = useState([]);
  const [showCarrello, setShowCarrello] = useState(false);

  const totale = carrello.reduce((s, item) => s + item.prezzo, 0);

  const aggiungi = (piatto) => {
    setCarrello(prev => [...prev, piatto]);
  };

  const rimuovi = (index) => {
    setCarrello(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-full flex flex-col">
      {/* Header ristorante */}
      <div className="px-4 pt-6 pb-5" style={{ background: "linear-gradient(135deg, #c2571a 0%, #e8912d 100%)" }}>
        <h2 className="text-xl font-black text-white">{nome || "Trattoria da Mario"}</h2>
        <p className="text-xs text-white/70 mt-0.5">Cucina tradizionale italiana</p>
        <div className="flex gap-2 mt-3">
          <span className="px-3 py-1 bg-black/20 rounded-full text-xs text-white font-medium">Tavolo 5</span>
          <span className="px-3 py-1 bg-white/20 rounded-full text-xs text-white font-medium border border-white/30">Ordina ora</span>
        </div>
      </div>

      {/* Tab categorie */}
      <div className="flex gap-1 px-3 py-2 overflow-x-auto bg-[#1a1a2e] border-b border-white/5">
        {CATEGORIE.map(cat => (
          <button
            key={cat}
            onClick={() => setTab(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              tab === cat ? "bg-orange-600 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Lista piatti */}
      <div className="flex-1 bg-[#12121f] px-4 py-3">
        <div className="space-y-3">
          {MENU[tab]?.map((piatto, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">{piatto.nome}</div>
                <div className="text-xs text-gray-500">{piatto.desc}</div>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <span className="text-sm font-bold text-orange-400">
                  {piatto.prezzo.toFixed(2).replace(".", ",")}
                </span>
                <button
                  onClick={() => aggiungi(piatto)}
                  className="w-7 h-7 rounded-full bg-orange-600/20 border border-orange-500/30 text-orange-400 flex items-center justify-center text-sm font-bold hover:bg-orange-600/40 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer carrello */}
      {carrello.length > 0 && (
        <div className="sticky bottom-0 bg-[#1a1a2e] border-t border-white/10 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] text-orange-400">Il tuo ordine ({carrello.length})</div>
              <div className="text-lg font-black text-white">{totale.toFixed(2).replace(".", ",")} EUR</div>
            </div>
            <button
              onClick={() => setShowCarrello(!showCarrello)}
              className="px-5 py-2 rounded-xl bg-orange-600 text-white font-bold text-sm hover:bg-orange-500 transition-colors"
            >
              Conferma
            </button>
          </div>
          {showCarrello && (
            <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
              {carrello.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs text-gray-300">
                  <span>{item.nome}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-400">{item.prezzo.toFixed(2)}</span>
                    <button onClick={() => rimuovi(i)} className="text-red-400 text-[10px]">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}