import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Shield, Star, Sparkles, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import FeatureChecklist from "./FeatureChecklist";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "49",
    period: "/mese",
    desc: "Per chi inizia con la propria app",
    features: [
      "App personalizzata",
      "Design professionale",
      "Aggiornamenti mensili",
      "Supporto email",
    ],
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "professional",
    name: "Professional",
    price: "99",
    period: "/mese",
    desc: "Per chi vuole crescere seriamente",
    features: [
      "Tutto di Starter +",
      "Prenotazioni online",
      "Notifiche push",
      "Analytics avanzati",
      "Supporto prioritario",
    ],
    popular: true,
    color: "from-purple-600 to-indigo-600",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "199",
    period: "/mese",
    desc: "Per business che vogliono il massimo",
    features: [
      "Tutto di Professional +",
      "Pagamenti integrati",
      "API personalizzate",
      "Account manager dedicato",
      "Sviluppo funzionalità custom",
      "SLA garantito",
    ],
    color: "from-amber-500 to-orange-500",
  },
];

export default function SubscriptionFunnel({ selectedApp, businessType, onBack, onComplete }) {
  const [step, setStep] = useState(0); // 0=riepilogo, 1=piano, 2=info, 3=conferma
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [formData, setFormData] = useState({
    businessName: "",
    contactName: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!formData.email || !formData.businessName || !selectedPlan) return;
    setSubmitting(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      const requestedFeatures = selectedFeatures.length ? selectedFeatures : (selectedApp?.features || []);
      await base44.entities.AppProject.create({
        user_email: user?.email || formData.email,
        app_name: formData.businessName,
        category: businessType,
        description: `Richiesta abbonamento ${selectedPlan.name} (€${selectedPlan.price}/mese). App di riferimento: ${selectedApp?.name || "N/A"}. Funzioni richieste: ${requestedFeatures.join(", ")}. Note: ${formData.notes}`,
        status: "submitted",
        features_requested: requestedFeatures,
        note_cliente: formData.notes,
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Errore invio:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Step 0: Riepilogo app scelta
  if (step === 0) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white flex flex-col">
        <div className="sticky top-0 z-30 bg-[#0a0f1a]/90 backdrop-blur-md border-b border-white/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
            <h1 className="text-base font-bold">La tua app ideale</h1>
          </div>
        </div>
        <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-purple-500/30">
              <Star className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-black">Ottima scelta!</h2>
            <p className="text-sm text-gray-400 mt-1">Hai scelto come riferimento <span className="text-purple-400 font-bold">{selectedApp?.name}</span></p>
          </div>

          <FeatureChecklist
            selectedApp={selectedApp}
            selectedFeatures={selectedFeatures}
            onToggle={(feature) => {
              setSelectedFeatures((prev) =>
                prev.includes(feature)
                  ? prev.filter((item) => item !== feature)
                  : [...prev, feature]
              );
            }}
          />

          <div className="rounded-2xl bg-gradient-to-r from-purple-600/10 to-indigo-600/10 border border-purple-500/20 p-4 text-center">
            <p className="text-sm font-bold text-purple-300">I nostri programmatori creeranno un'app su misura per te</p>
            <p className="text-[11px] text-gray-400 mt-1">Ispirata a {selectedApp?.name}, con le funzioni che selezioni qui sotto</p>
          </div>

          <button
            onClick={() => setStep(1)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 active:scale-[0.97] transition-all shadow-lg shadow-purple-500/20"
          >
            Scegli il tuo piano
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Step 1: Scelta piano
  if (step === 1) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white flex flex-col">
        <div className="sticky top-0 z-30 bg-[#0a0f1a]/90 backdrop-blur-md border-b border-white/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep(0)} className="text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
            <h1 className="text-base font-bold">Scegli il piano</h1>
          </div>
        </div>
        <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full space-y-4">
          <div className="text-center mb-2">
            <h2 className="text-lg font-black">Quanto vuoi investire?</h2>
            <p className="text-xs text-gray-400 mt-1">Tutti i piani includono design e sviluppo professionale</p>
          </div>

          {PLANS.map(plan => {
            const isSelected = selectedPlan?.id === plan.id;
            return (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                className={`w-full text-left rounded-2xl border-2 p-4 transition-all active:scale-[0.98] relative ${
                  isSelected
                    ? "border-purple-500 bg-purple-600/10 ring-2 ring-purple-500/20"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/10"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full bg-purple-600 text-[9px] font-bold text-white uppercase tracking-wider">
                    Più scelto
                  </div>
                )}
                {isSelected && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-white">€{plan.price}</span>
                  <span className="text-sm text-gray-500">{plan.period}</span>
                </div>
                <p className="text-sm font-bold text-white mt-1">{plan.name}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{plan.desc}</p>
                <div className="mt-3 space-y-1.5">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] text-gray-300">
                      <Check className="w-3 h-3 text-green-400 shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}

          <button
            onClick={() => selectedPlan && setStep(2)}
            disabled={!selectedPlan}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold transition-all ${
              selectedPlan
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 active:scale-[0.97] shadow-lg shadow-purple-500/20"
                : "bg-gray-700/50 text-gray-600"
            }`}
          >
            Continua
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Dati contatto
  if (step === 2) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white flex flex-col">
        <div className="sticky top-0 z-30 bg-[#0a0f1a]/90 backdrop-blur-md border-b border-white/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep(1)} className="text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
            <h1 className="text-base font-bold">I tuoi dati</h1>
          </div>
        </div>
        <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full space-y-4">
          <div className="text-center mb-2">
            <h2 className="text-lg font-black">Quasi fatto!</h2>
            <p className="text-xs text-gray-400 mt-1">I nostri sviluppatori ti contatteranno entro 24 ore</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nome della tua attività *</label>
              <input
                value={formData.businessName}
                onChange={e => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                placeholder="Es. Ristorante Da Mario"
                className="w-full bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Il tuo nome *</label>
              <input
                value={formData.contactName}
                onChange={e => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                placeholder="Mario Rossi"
                className="w-full bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="mario@ristorante.it"
                className="w-full bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Telefono</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+39 333 1234567"
                className="w-full bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Note aggiuntive</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Descrivi brevemente cosa vorresti nella tua app..."
                rows={3}
                className="w-full bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30 resize-none"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-xs font-bold text-white">Riepilogo ordine</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Piano {selectedPlan?.name}</span>
              <span className="text-white font-bold">€{selectedPlan?.price}/mese</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-gray-500">Riferimento: {selectedApp?.name}</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-gray-500">Funzioni selezionate: {selectedFeatures.length}</span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!formData.email || !formData.businessName || submitting}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold transition-all ${
              formData.email && formData.businessName && !submitting
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 active:scale-[0.97] shadow-lg shadow-purple-500/20"
                : "bg-gray-700/50 text-gray-600"
            }`}
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Invia richiesta
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Stato finale: conferma (gestito da submitted)
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-black mb-2">Richiesta inviata!</h2>
          <p className="text-sm text-gray-400 mb-6">
            Ti contatteremo entro 24 ore per iniziare a creare la tua app.
            Controlla la tua email <span className="text-purple-400">{formData.email}</span>.
          </p>
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 mb-6">
            <div className="text-xs text-gray-500">Piano scelto</div>
            <div className="text-lg font-bold text-white">{selectedPlan?.name} — €{selectedPlan?.price}/mese</div>
          </div>
          <button
            onClick={() => onComplete?.()}
            className="w-full py-3.5 rounded-2xl font-bold bg-white/5 border border-white/10 text-gray-300 hover:text-white transition-colors"
          >
            Torna alla home
          </button>
        </div>
      </div>
    );
  }

  return null;
}