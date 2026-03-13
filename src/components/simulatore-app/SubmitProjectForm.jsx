import React, { useState } from "react";
import { Rocket, X, Globe, CreditCard, Bell, Lock, Link2, MessageSquare, Loader2, Check } from "lucide-react";

const EXTRA_FEATURES = [
  { id: "dominio_custom", label: "Dominio personalizzato", icon: Globe, desc: "es. www.miaapp.it" },
  { id: "pagamenti", label: "Pagamenti online", icon: CreditCard, desc: "Stripe, PayPal, ecc." },
  { id: "notifiche_push", label: "Notifiche push", icon: Bell, desc: "Invio notifiche ai clienti" },
  { id: "login_utenti", label: "Login utenti", icon: Lock, desc: "Registrazione e accesso" },
  { id: "api_esterne", label: "Integrazioni API", icon: Link2, desc: "Collegamento a sistemi esterni" },
];

export default function SubmitProjectForm({ appData, onSubmit, onClose }) {
  const [dominio, setDominio] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState(
    (appData?.features_requested || []).reduce((acc, f) => ({ ...acc, [f]: true }), {})
  );
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggleFeature = (id) => {
    setSelectedFeatures(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const features = Object.entries(selectedFeatures).filter(([_, v]) => v).map(([k]) => k);
    await onSubmit({ dominio: dominio.trim(), features, note: note.trim() });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-[#12122a] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#12122a] border-b border-white/5 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Invia progetto</h3>
              <p className="text-[10px] text-gray-400">Specifiche per il nostro team</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Dominio */}
          <div>
            <label className="text-xs text-gray-400 font-semibold mb-1.5 block flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> Dominio desiderato (opzionale)
            </label>
            <input
              value={dominio}
              onChange={e => setDominio(e.target.value)}
              placeholder="es. www.miaattivita.it"
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30"
            />
          </div>

          {/* Funzionalità extra */}
          <div>
            <label className="text-xs text-gray-400 font-semibold mb-2 block">Funzionalità richieste</label>
            <div className="space-y-2">
              {EXTRA_FEATURES.map(f => {
                const active = selectedFeatures[f.id];
                return (
                  <button
                    key={f.id}
                    onClick={() => toggleFeature(f.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      active
                        ? "bg-purple-600/15 border-purple-500/40"
                        : "bg-white/[0.02] border-white/[0.06] hover:border-white/10"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-purple-500/20" : "bg-white/5"}`}>
                      <f.icon className={`w-4 h-4 ${active ? "text-purple-400" : "text-gray-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold ${active ? "text-white" : "text-gray-300"}`}>{f.label}</p>
                      <p className="text-[10px] text-gray-500">{f.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      active ? "border-purple-500 bg-purple-500" : "border-white/20"
                    }`}>
                      {active && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs text-gray-400 font-semibold mb-1.5 block flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> Note aggiuntive (opzionale)
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Altre richieste, dettagli, preferenze..."
              rows={3}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30 resize-none"
            />
          </div>
        </div>

        {/* Submit button */}
        <div className="sticky bottom-0 bg-[#12122a] border-t border-white/5 px-5 py-4">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3.5 rounded-2xl font-bold text-white bg-green-600 hover:bg-green-500 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Invio in corso...</>
            ) : (
              <><Rocket className="w-5 h-5" /> Invia al nostro team</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}