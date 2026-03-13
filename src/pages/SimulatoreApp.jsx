import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import CategorySelector from "../components/simulatore-app/CategorySelector";
import PhoneFrame from "../components/simulatore-app/PhoneFrame";
import RistoranteTemplate from "../components/simulatore-app/templates/RistoranteTemplate";
import EcommerceTemplate from "../components/simulatore-app/templates/EcommerceTemplate";
import CentroEsteticoTemplate from "../components/simulatore-app/templates/CentroEsteticoTemplate";
import PalestraTemplate from "../components/simulatore-app/templates/PalestraTemplate";
import GestionaleTemplate from "../components/simulatore-app/templates/GestionaleTemplate";
import PortfolioTemplate from "../components/simulatore-app/templates/PortfolioTemplate";
import CTASection from "../components/simulatore-app/CTASection";

const CATEGORIES = [
  { id: "ristorante", label: "Ristorante", icon: "🍕", placeholder: "Es: Trattoria da Mario — cucina tradizionale italiana" },
  { id: "ecommerce", label: "E-commerce", icon: "🛒", placeholder: "Es: Negozio di abbigliamento vintage online" },
  { id: "centro_estetico", label: "Centro estetico", icon: "💅", placeholder: "Es: Beauty Lounge — trattamenti viso e corpo" },
  { id: "palestra", label: "Palestra", icon: "💪", placeholder: "Es: FitZone — corsi fitness e personal training" },
  { id: "gestionale", label: "Gestionale PMI", icon: "📊", placeholder: "Es: Gestionale per officina meccanica" },
  { id: "portfolio", label: "Portfolio", icon: "🎨", placeholder: "Es: Portfolio fotografo professionista" },
];

const TEMPLATES = {
  ristorante: RistoranteTemplate,
  ecommerce: EcommerceTemplate,
  centro_estetico: CentroEsteticoTemplate,
  palestra: PalestraTemplate,
  gestionale: GestionaleTemplate,
  portfolio: PortfolioTemplate,
};

export default function SimulatoreApp() {
  const [selected, setSelected] = useState(null);
  const [nomeAttivita, setNomeAttivita] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const cat = CATEGORIES.find(c => c.id === selected);
  const Template = selected ? TEMPLATES[selected] : null;

  const handleBuild = () => {
    if (!selected) return;
    setShowPreview(true);
  };

  const handleReset = () => {
    setShowPreview(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white pb-32">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0a0f1a]/90 backdrop-blur-md border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Link to="/Esplora" className="back-arrow-tap text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-base font-bold">App & Siti — Simulatore</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-8">
        {!showPreview ? (
          <>
            {/* Titolo */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black mb-2">Dimmi cosa vuoi. Te lo faccio vedere.</h2>
              <p className="text-sm text-gray-400">Scrivi la tua idea e guarda il tuo prodotto prendere vita davanti ai tuoi occhi.</p>
            </div>

            {/* Input nome attività */}
            <div className="mb-6">
              <input
                type="text"
                value={nomeAttivita}
                onChange={e => setNomeAttivita(e.target.value)}
                placeholder={cat?.placeholder || "Es: Un'app per il mio ristorante dove i clienti ordinano e pagano dal tavolo..."}
                className="w-full bg-[#1a2035] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>

            {/* Selezione categoria */}
            <CategorySelector
              categories={CATEGORIES}
              selected={selected}
              onSelect={setSelected}
            />

            {/* Bottone costruisci */}
            <button
              onClick={handleBuild}
              disabled={!selected}
              className={`w-full mt-6 py-3.5 rounded-xl font-bold text-sm transition-all ${
                selected
                  ? "bg-purple-600 hover:bg-purple-500 text-white"
                  : "bg-gray-800 text-gray-500 cursor-not-allowed"
              }`}
            >
              Costruisci il mio prodotto
            </button>
          </>
        ) : (
          <>
            {/* Anteprima mockup */}
            <div className="text-center mb-6">
              <button onClick={handleReset} className="text-xs text-purple-400 hover:text-purple-300 mb-4 inline-flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Cambia idea
              </button>
              <h2 className="text-xl font-black mb-1">Ecco il tuo prodotto.</h2>
              <p className="text-sm text-gray-400">Interagisci con i pulsanti — è tutto finto, ma sembra vero.</p>
            </div>

            <PhoneFrame>
              {Template && <Template nome={nomeAttivita || cat?.label} />}
            </PhoneFrame>

            {/* CTA finale */}
            <CTASection onReset={handleReset} />
          </>
        )}
      </div>
    </div>
  );
}