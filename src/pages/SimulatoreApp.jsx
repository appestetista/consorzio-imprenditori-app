import React, { useState, useEffect } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import useDisablePullToRefresh from "../components/simulatore-app/useDisablePullToRefresh";
import SHOWCASE_APPS, { SHOWCASE_CATEGORY_MAP } from "../components/simulatore-app/showcaseAppsData";
import SectorShowcase from "../components/simulatore-app/SectorShowcase";
import SubscriptionFunnel from "../components/simulatore-app/SubscriptionFunnel";

const BUSINESS_TYPES = [
  { id: "ristorazione", label: "Ristorazione", emoji: "🍽️", desc: "Ristoranti, bar, pizzerie" },
  { id: "beauty", label: "Beauty & Wellness", emoji: "💆", desc: "Estetica, parrucchieri, spa" },
  { id: "fitness", label: "Fitness & Sport", emoji: "💪", desc: "Palestre, personal trainer" },
  { id: "ecommerce", label: "E-commerce", emoji: "🛍️", desc: "Vendita online, shop" },
  { id: "servizi", label: "Servizi professionali", emoji: "💼", desc: "Consulenze, studi, agenzie" },
  { id: "produzione", label: "Aziende di produzione", emoji: "🏭", desc: "Fabbriche, manifattura, industria" },
  { id: "artigiani", label: "Artigiani", emoji: "🛠️", desc: "Falegnami, fabbri, laboratori" },
  { id: "edilizia", label: "Edilizia & Impianti", emoji: "🏗️", desc: "Imprese edili, impiantisti, cantieri" },
  { id: "automotive", label: "Automotive", emoji: "🚗", desc: "Officine, concessionarie, noleggio" },
  { id: "logistica", label: "Logistica & Trasporti", emoji: "🚚", desc: "Spedizioni, corrieri, flotte" },
  { id: "tecnologia", label: "Tecnologia & Software", emoji: "💻", desc: "Software house, startup, IT" },
  { id: "immobiliare", label: "Immobiliare", emoji: "🏠", desc: "Agenzie, costruttori" },
  { id: "salute", label: "Salute & Medico", emoji: "🏥", desc: "Cliniche, studi medici" },
  { id: "turismo", label: "Turismo & Ospitalità", emoji: "✈️", desc: "Hotel, B&B, tour operator" },
  { id: "educazione", label: "Formazione", emoji: "📚", desc: "Scuole, corsi, coaching" },
  { id: "eventi", label: "Eventi & Matrimoni", emoji: "🎉", desc: "Event planner, wedding, fiere" },
  { id: "altro", label: "Altro", emoji: "✨", desc: "Qualsiasi altra attività" },
];

export default function SimulatoreApp() {
  const [selectedSector, setSelectedSector] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showFunnel, setShowFunnel] = useState(false);
  const navigate = useNavigate();

  useDisablePullToRefresh();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Funnel di acquisto
  if (showFunnel && selectedApp) {
    return (
      <SubscriptionFunnel
        selectedApp={selectedApp}
        businessType={selectedSector}
        onBack={() => setShowFunnel(false)}
        onComplete={() => navigate("/Esplora")}
      />
    );
  }

  // Showcase del settore selezionato
  if (selectedSector) {
    const sectorKey = SHOWCASE_CATEGORY_MAP[selectedSector] || selectedSector;
    const sectorLabel = BUSINESS_TYPES.find(t => t.id === selectedSector)?.label || selectedSector;

    return (
      <SectorShowcase
        sectorKey={sectorKey}
        sectorLabel={sectorLabel}
        onSelectApp={(app) => {
          setSelectedApp(app);
          setShowFunnel(true);
        }}
        onBack={() => setSelectedSector(null)}
      />
    );
  }

  // Selezione settore (home)
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0a0f1a]/90 backdrop-blur-md border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/Esplora" className="back-arrow-tap text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-base font-bold">Crea la tua App</h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-black">Vuoi un'app per la tua attività?</h2>
          <p className="text-sm text-gray-400 mt-2 leading-relaxed">
            Scopri le migliori app del tuo settore e lascia che i nostri programmatori ne creino una su misura per te.
          </p>
        </div>

        {/* Griglia settori */}
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase font-bold tracking-wider px-1">Seleziona il tuo settore</p>
          <div className="grid grid-cols-1 gap-2">
            {BUSINESS_TYPES.map(t => {
              const sectorKey = SHOWCASE_CATEGORY_MAP[t.id] || t.id;
              const appCount = SHOWCASE_APPS[sectorKey]?.length || 0;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedSector(t.id)}
                  className="flex items-center gap-3 p-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-purple-500/20 transition-all active:scale-[0.98] text-left"
                >
                  <span className="text-2xl">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{t.label}</p>
                    <p className="text-[11px] text-gray-500">{t.desc}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] text-purple-400 font-semibold">{appCount} app</span>
                    <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}