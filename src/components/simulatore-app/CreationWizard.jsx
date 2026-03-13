import React, { useState } from "react";
import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react";

const BUSINESS_TYPES = [
  { id: "ristorazione", label: "Ristorazione", emoji: "🍽️", desc: "Ristoranti, bar, pizzerie, pasticcerie" },
  { id: "beauty", label: "Beauty & Wellness", emoji: "💆", desc: "Estetica, parrucchieri, spa, centri benessere" },
  { id: "fitness", label: "Fitness & Sport", emoji: "💪", desc: "Palestre, personal trainer, centri sportivi" },
  { id: "ecommerce", label: "E-commerce", emoji: "🛍️", desc: "Vendita online, abbigliamento, accessori" },
  { id: "servizi", label: "Servizi professionali", emoji: "💼", desc: "Consulenze, studi, agenzie" },
  { id: "immobiliare", label: "Immobiliare", emoji: "🏠", desc: "Agenzie, costruttori, interior design" },
  { id: "salute", label: "Salute & Medico", emoji: "🏥", desc: "Cliniche, studi medici, farmacie" },
  { id: "turismo", label: "Turismo & Ospitalità", emoji: "✈️", desc: "Hotel, B&B, tour operator, guide" },
  { id: "educazione", label: "Formazione", emoji: "📚", desc: "Scuole, corsi, coaching, tutoring" },
  { id: "altro", label: "Altro", emoji: "✨", desc: "Qualsiasi altro tipo di attività" },
];

const STYLE_PRESETS = [
  { id: "dark_premium", label: "Dark Premium", desc: "Sfondo scuro, elegante e moderno", preview: "bg-gradient-to-br from-gray-900 to-gray-800" },
  { id: "light_clean", label: "Light & Clean", desc: "Chiaro, pulito, minimalista", preview: "bg-gradient-to-br from-white to-gray-100" },
  { id: "vibrant", label: "Colorato & Vivace", desc: "Colori forti, energia e dinamismo", preview: "bg-gradient-to-br from-purple-600 to-pink-500" },
  { id: "editorial", label: "Editoriale", desc: "Stile magazine, tipografia forte", preview: "bg-gradient-to-br from-slate-800 to-slate-600" },
];

export default function CreationWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    businessType: "",
    businessName: "",
    description: "",
    style: "",
    features: [],
  });

  const FEATURES = [
    { id: "menu", label: "Menu / Listino prezzi" },
    { id: "prenotazioni", label: "Prenotazioni online" },
    { id: "galleria", label: "Galleria immagini" },
    { id: "contatti", label: "Contatti & Mappa" },
    { id: "recensioni", label: "Recensioni clienti" },
    { id: "pagamenti", label: "Pagamenti online" },
    { id: "notifiche", label: "Notifiche push" },
    { id: "login", label: "Login utenti" },
    { id: "catalogo", label: "Catalogo prodotti" },
    { id: "loyalty", label: "Fidelity / Punti" },
  ];

  const toggleFeature = (id) => {
    setData(prev => ({
      ...prev,
      features: prev.features.includes(id) ? prev.features.filter(f => f !== id) : [...prev.features, id],
    }));
  };

  const canProceed = () => {
    if (step === 0) return !!data.businessType;
    if (step === 1) return !!data.businessName;
    if (step === 2) return !!data.style;
    return true;
  };

  const handleComplete = () => {
    const techFeatures = data.features.filter(f => ["pagamenti", "notifiche", "login", "loyalty"].includes(f));
    const visualFeatures = data.features.filter(f => !techFeatures.includes(f));

    const prompt = `Crea un'app per "${data.businessName}" — settore: ${data.businessType}. ${data.description ? `Dettagli: ${data.description}.` : ""} Stile visivo: ${data.style}. Sezioni richieste: ${visualFeatures.join(", ") || "scelta automatica in base al settore"}.${techFeatures.length > 0 ? ` Funzionalità tecniche richieste: ${techFeatures.join(", ")}.` : ""}`;

    onComplete(prompt, data);
  };

  const steps = [
    // Step 0: Tipo attività
    <div key="type" className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-lg font-black text-white">Che tipo di attività hai?</h2>
        <p className="text-xs text-gray-400 mt-1">Seleziona la categoria più vicina</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {BUSINESS_TYPES.map(t => (
          <button
            key={t.id}
            onClick={() => setData({ ...data, businessType: t.id })}
            className={`text-left p-3 rounded-xl border transition-all active:scale-[0.97] ${
              data.businessType === t.id
                ? "bg-purple-600/20 border-purple-500/50"
                : "bg-white/[0.03] border-white/[0.06] hover:border-white/10"
            }`}
          >
            <span className="text-xl">{t.emoji}</span>
            <p className="text-xs font-bold text-white mt-1">{t.label}</p>
            <p className="text-[10px] text-gray-500 leading-tight">{t.desc}</p>
          </button>
        ))}
      </div>
    </div>,

    // Step 1: Nome e descrizione
    <div key="name" className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-lg font-black text-white">Come si chiama la tua attività?</h2>
        <p className="text-xs text-gray-400 mt-1">Inserisci il nome e una breve descrizione</p>
      </div>
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Nome dell'attività *</label>
        <input
          value={data.businessName}
          onChange={e => setData({ ...data, businessName: e.target.value })}
          placeholder="Es. Ristorante Da Mario"
          className="w-full bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30"
        />
      </div>
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Descrizione (opzionale)</label>
        <textarea
          value={data.description}
          onChange={e => setData({ ...data, description: e.target.value })}
          placeholder="Racconta in poche parole cosa fai, cosa vuoi mostrare nell'app..."
          rows={3}
          className="w-full bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30 resize-none"
        />
      </div>
    </div>,

    // Step 2: Stile visivo
    <div key="style" className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-lg font-black text-white">Che stile preferisci?</h2>
        <p className="text-xs text-gray-400 mt-1">Potrai cambiarlo dopo</p>
      </div>
      <div className="space-y-2">
        {STYLE_PRESETS.map(s => (
          <button
            key={s.id}
            onClick={() => setData({ ...data, style: s.id })}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.98] ${
              data.style === s.id
                ? "bg-purple-600/20 border-purple-500/50"
                : "bg-white/[0.03] border-white/[0.06] hover:border-white/10"
            }`}
          >
            <div className={`w-10 h-10 rounded-lg ${s.preview} shrink-0`} />
            <div className="text-left">
              <p className="text-sm font-bold text-white">{s.label}</p>
              <p className="text-[10px] text-gray-500">{s.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>,

    // Step 3: Funzionalità
    <div key="features" className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-lg font-black text-white">Cosa vuoi nell'app?</h2>
        <p className="text-xs text-gray-400 mt-1">Seleziona le funzionalità — le tecniche verranno gestite dall'admin</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {FEATURES.map(f => {
          const isTech = ["pagamenti", "notifiche", "login", "loyalty"].includes(f.id);
          return (
            <button
              key={f.id}
              onClick={() => toggleFeature(f.id)}
              className={`text-left p-3 rounded-xl border transition-all active:scale-[0.97] ${
                data.features.includes(f.id)
                  ? isTech ? "bg-amber-600/20 border-amber-500/50" : "bg-purple-600/20 border-purple-500/50"
                  : "bg-white/[0.03] border-white/[0.06] hover:border-white/10"
              }`}
            >
              <p className="text-xs font-bold text-white">{f.label}</p>
              {isTech && <p className="text-[9px] text-amber-400 mt-0.5">⚙️ Richiede admin</p>}
            </button>
          );
        })}
      </div>
    </div>,
  ];

  return (
    <div className="flex-1 px-4 max-w-lg mx-auto w-full py-6">
      {/* Progress bar */}
      <div className="flex gap-1 mb-6">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`h-1 rounded-full flex-1 transition-all ${
            i <= step ? "bg-purple-500" : "bg-white/10"
          }`} />
        ))}
      </div>

      {steps[step]}

      {/* Navigation */}
      <div className="flex gap-3 mt-8">
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Indietro
          </button>
        )}
        {step < 3 ? (
          <button
            onClick={() => canProceed() && setStep(step + 1)}
            disabled={!canProceed()}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${
              canProceed() ? "bg-purple-600 text-white hover:bg-purple-500 active:scale-[0.97]" : "bg-gray-700/50 text-gray-600"
            }`}
          >
            Avanti
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleComplete}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold bg-purple-600 text-white hover:bg-purple-500 active:scale-[0.97] transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Genera la mia App
          </button>
        )}
      </div>
    </div>
  );
}