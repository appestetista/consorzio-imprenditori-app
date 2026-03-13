import React, { useState } from "react";
import { ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import CategorySelector from "../components/simulatore-app/CategorySelector";
import PhoneFrame from "../components/simulatore-app/PhoneFrame";
import DynamicAppRenderer from "../components/simulatore-app/DynamicAppRenderer";
import CTASection from "../components/simulatore-app/CTASection";

const CATEGORIES = [
  { id: "ristorante", label: "Ristorante", icon: "🍕" },
  { id: "ecommerce", label: "E-commerce", icon: "🛒" },
  { id: "centro_estetico", label: "Centro estetico", icon: "💅" },
  { id: "palestra", label: "Palestra", icon: "💪" },
  { id: "gestionale", label: "Gestionale PMI", icon: "📊" },
  { id: "portfolio", label: "Portfolio", icon: "🎨" },
  { id: "altro", label: "Altro", icon: "✨" },
];

const PROMPT_TEMPLATE = `Sei un UI/UX designer professionista di livello mondiale. Crei interfacce mobile che sembrano app reali pubblicate su App Store.

L'utente vuole un'app per il settore "{category}".
Descrizione: "{description}"

REGOLE DI DESIGN FONDAMENTALI:
- Scegli una palette colori SOFISTICATA e moderna (non colori banali). Usa colori che creino atmosfera.
- Genera ALMENO 5-6 sezioni per dare profondità all'app.
- I contenuti devono essere IPER-REALISTICI: nomi di piatti veri, prezzi reali italiani, orari credibili, recensioni che sembrano vere.
- Pensa come se fosse un'app vera: aggiungi dettagli che un utente reale si aspetterebbe.
- Usa emoji pertinenti e varie per ogni prodotto/servizio.

STRUTTURA JSON richiesta:
- appName: nome dell'app professionale e accattivante
- tagline: sottotitolo breve ed efficace
- primaryColor: colore HEX primario (sceglilo con cura)
- secondaryColor: colore HEX secondario (complementare)
- headerStyle: "gradient" | "solid"
- sections: array di sezioni, ogni sezione ha:
  - type: uno tra "menu_list", "product_grid", "service_list", "stats_grid", "activity_feed", "gallery", "cta_banner", "booking", "contact", "pricing", "testimonials", "features"
  - title: titolo sezione
  - items: array di oggetti per tipo:
    "menu_list": {name, description, price} — almeno 5-6 items
    "product_grid": {name, price, tag, emoji} — almeno 4-6 items
    "service_list": {name, duration, price, description} — almeno 4 items
    "stats_grid": {label, value, trend, trendDirection} — 4 items
    "activity_feed": {text, detail, time, valueText, valueColor}
    "gallery": {title, tag} — almeno 4 items
    "cta_banner": {text, buttonText}
    "booking": {slots: ["09:00","10:30",...]} — almeno 6 slot
    "contact": {email, phone, address}
    "pricing": {name, price, period, features} — features è array di stringhe
    "testimonials": {name, text, rating} — almeno 3 con testi dettagliati
    "features": {name, description, emoji} — almeno 4
- bottomNav: array di {label, active} (4 voci)

Genera un'app che faccia dire "WOW, sembra vera!". Rispondi SOLO con il JSON.`;

export default function SimulatoreApp() {
  const [selected, setSelected] = useState(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [appData, setAppData] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const cat = CATEGORIES.find(c => c.id === selected);

  const handleBuild = async () => {
    if (!selected || !description.trim()) return;
    setLoading(true);
    setError(null);
    setAppData(null);

    const prompt = PROMPT_TEMPLATE
      .replace("{category}", cat.label)
      .replace("{description}", description.trim());

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            appName: { type: "string" },
            tagline: { type: "string" },
            primaryColor: { type: "string" },
            secondaryColor: { type: "string" },
            headerStyle: { type: "string" },
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  title: { type: "string" },
                  items: { type: "array", items: { type: "object" } },
                },
              },
            },
            bottomNav: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  active: { type: "boolean" },
                },
              },
            },
          },
        },
      });

      console.log("LLM result:", result);

      if (!result || !result.sections) {
        setError("L'AI non ha generato un risultato valido. Riprova.");
      } else {
        setAppData(result);
      }
    } catch (err) {
      console.error("Errore generazione:", err);
      setError("Si è verificato un errore. Riprova tra qualche secondo.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setAppData(null);
    setError(null);
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
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
            <p className="text-sm text-red-400 mb-2">{error}</p>
            <button onClick={() => { setError(null); }} className="text-xs text-red-300 underline">Chiudi</button>
          </div>
        )}
        {!appData && !loading ? (
          <>
            {/* Titolo */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black mb-2">Dimmi cosa vuoi. Te lo faccio vedere.</h2>
              <p className="text-sm text-gray-400">Scrivi la tua idea e guarda il tuo prodotto prendere vita davanti ai tuoi occhi.</p>
            </div>

            {/* Input descrizione */}
            <div className="mb-6">
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Es: Un'app per il mio ristorante dove i clienti ordinano e pagano dal tavolo. Il ristorante si chiama 'Trattoria da Mario', cucina tradizionale romana..."
                rows={3}
                className="w-full bg-[#1a2035] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
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
              disabled={!selected || !description.trim()}
              className={`w-full mt-6 py-3.5 rounded-xl font-bold text-sm transition-all ${
                selected && description.trim()
                  ? "bg-purple-600 hover:bg-purple-500 text-white"
                  : "bg-gray-800 text-gray-500 cursor-not-allowed"
              }`}
            >
              Costruisci il mio prodotto
            </button>
          </>
        ) : loading ? (
          <div className="text-center py-20">
            <Loader2 className="w-10 h-10 text-purple-500 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-1">Sto creando il tuo prodotto...</h3>
            <p className="text-sm text-gray-400">L'intelligenza artificiale sta progettando la tua app</p>
          </div>
        ) : appData ? (
          <>
            {/* Anteprima */}
            <div className="text-center mb-6">
              <button onClick={handleReset} className="text-xs text-purple-400 hover:text-purple-300 mb-4 inline-flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Cambia idea
              </button>
              <h2 className="text-xl font-black mb-1">Ecco {appData.appName}.</h2>
              <p className="text-sm text-gray-400">Interagisci con i pulsanti — è un'anteprima di come potrebbe essere.</p>
            </div>

            <PhoneFrame>
              <DynamicAppRenderer data={appData} />
            </PhoneFrame>

            {/* Link per aprire fullscreen */}
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  sessionStorage.setItem("simulatore_app_data", JSON.stringify(appData));
                  navigate("/AppPreview");
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Apri anteprima completa
              </button>
              <p className="text-xs text-gray-500 mt-2">Vedrai l'app a schermo intero e potrai modificarla</p>
            </div>

            <CTASection onReset={handleReset} />
          </>
        ) : null}
      </div>
    </div>
  );
}