import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Check, ChevronDown, ChevronUp, ArrowLeft, Sparkles, Crown, Shield, Zap, X, Loader2, MessageCircle } from 'lucide-react';

const FEATURES = [
  "50 consulenze AI al mese con dati verificati",
  "Ricerca dati in tempo reale su fonti ufficiali",
  "Tutti gli strumenti: Simulatore Fiscale, Costo Personale, Import/Export, Compliance, Contratti",
  "Strumenti gratuiti illimitati (non consumano consulenze)",
  "Bandi e finanziamenti aggiornati per la tua regione",
  "Calendario eventi e incontri",
  "Accesso alla rete di consulenti verificati",
  "Knowledge Base normativa sempre aggiornata",
];

const FAQS = [
  {
    q: "Cos'è una consulenza AI?",
    a: "Ogni volta che chiedi qualcosa nella chat e l'AI cerca dati su internet per risponderti, consumi 1 consulenza. Le domande generiche sulla normativa (es. cos'è l'IRPEF) sono gratuite e illimitate."
  },
  {
    q: "Cosa succede se finisco le 50 consulenze?",
    a: "Puoi continuare a usare tutti gli strumenti gratuiti (simulatore fiscale, costo personale, calendario, bandi). Le consulenze AI si rinnovano il 1° del mese."
  },
  {
    q: "Posso cancellare?",
    a: "Sì, in qualsiasi momento dalla tua area personale. Nessuna penale."
  },
  {
    q: "La fattura?",
    a: "Ricevi fattura elettronica automatica ogni mese."
  },
];

function FAQItem({ faq }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-800 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left"
      >
        <span className="text-sm font-medium text-white pr-4">{faq.q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </button>
      {open && (
        <p className="text-sm text-slate-400 pb-4 leading-relaxed">{faq.a}</p>
      )}
    </div>
  );
}

export default function Pricing() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const isSubscribed = user?.piano_abbonamento && user.piano_abbonamento !== 'free';

  const handleRichiestaAbbonamento = async () => {
    if (!user?.email) return;
    setSending(true);
    await base44.entities.RichiestaAbbonamento.create({
      user_id: user.id,
      email: user.email,
      stato: 'in_attesa',
      piano: 'impresa_39',
    });
    // Notifica admin via email
    try {
      const admins = await base44.entities.User.filter({ role: 'admin' });
      if (admins.length > 0) {
        await base44.integrations.Core.SendEmail({
          to: admins[0].email,
          subject: `Nuova richiesta abbonamento — ${user.email}`,
          body: `L'utente ${user.full_name || user.email} ha richiesto l'attivazione del Piano Impresa (39€/mese).\n\nEmail: ${user.email}\n\nVai nel Pannello Admin → Abbonamenti per attivarlo.`,
        });
      }
    } catch (e) { /* non bloccare se l'email fallisce */ }
    setSending(false);
    setSent(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0f1a' }}>
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#d4af37]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12" style={{ backgroundColor: '#0a0f1a' }}>
      {/* Top nav */}
      <div className="px-4 pt-4 pb-2">
        <Link to={createPageUrl('Home')} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Torna alla Home
        </Link>
      </div>

      {/* Header */}
      <div className="text-center px-6 pt-6 pb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#d4af37] to-[#b8860b] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#d4af37]/20">
          <Crown className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Il tuo consulente aziendale AI</h1>
        <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
          Tutto quello che serve alla tua impresa. Un solo piano, nessuna sorpresa.
        </p>
      </div>

      <div className="max-w-md mx-auto px-4">

        {/* Già abbonato */}
        {isSubscribed ? (
          <div className="rounded-2xl border border-[#d4af37]/40 p-6 text-center" style={{ backgroundColor: '#111827' }}>
            <div className="w-12 h-12 rounded-full bg-[#d4af37]/15 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-[#d4af37]" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Sei già abbonato al Piano Impresa ✓</h2>
            <p className="text-sm text-slate-400 mb-4">
              Il tuo piano si rinnova automaticamente ogni mese. Puoi gestirlo dal tuo profilo.
            </p>
            {user?.consulenze_usate_mese != null && (
              <p className="text-xs text-slate-500">
                Consulenze usate questo mese: <span className="text-[#d4af37] font-semibold">{user.consulenze_usate_mese}/50</span>
              </p>
            )}
            <Link
              to={createPageUrl('MyProfile')}
              className="inline-block mt-4 px-6 py-2.5 rounded-xl border border-slate-600 text-white text-sm font-medium hover:border-slate-500 transition-colors"
            >
              Gestisci abbonamento
            </Link>
          </div>
        ) : (
          <>
            {/* Card Piano */}
            <div className="rounded-2xl border border-[#d4af37]/30 overflow-hidden" style={{ backgroundColor: '#111827' }}>
              {/* Badge */}
              <div className="px-6 pt-6 pb-4">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-white mb-4">
                  Piano Impresa
                </span>

                {/* Prezzo */}
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-5xl font-extrabold text-white tracking-tight">39€</span>
                  <span className="text-base text-slate-400">/mese</span>
                </div>
                <p className="text-xs text-slate-500">IVA esclusa · Cancelli quando vuoi</p>
              </div>

              {/* Divider */}
              <div className="h-px bg-slate-800 mx-6" />

              {/* Features */}
              <div className="px-6 py-5 space-y-3.5">
                {FEATURES.map((f, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#d4af37]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-[#d4af37]" />
                    </div>
                    <span className="text-sm text-slate-300 leading-snug">{f}</span>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="h-px bg-slate-800 mx-6" />

              {/* Confronto */}
              <div className="px-6 py-4">
                <p className="text-xs text-slate-400 leading-relaxed text-center">
                  <span className="text-[#d4af37] font-semibold">Confronta:</span> un commercialista ti costa 100-200€ a chiamata. Qui hai 50 consulenze per 39€.
                </p>
              </div>

              {/* CTA */}
              <div className="px-6 pb-6">
                <button
                  className="w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-[#d4af37]/25"
                  style={{
                    background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
                    color: '#fff',
                  }}
                >
                  <Zap className="w-4 h-4" />
                  Attiva il Piano Impresa
                </button>
              </div>
            </div>

            {/* Garanzie sotto la card */}
            <div className="flex flex-col items-center gap-2 mt-5">
              {[
                "Cancelli in qualsiasi momento",
                "Nessun vincolo contrattuale",
                "Attivo in 30 secondi",
              ].map((g, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span className="text-xs text-slate-400">{g}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* FAQ */}
        <div className="mt-10">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 text-center">Domande frequenti</h3>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-5">
            {FAQS.map((faq, i) => (
              <FAQItem key={i} faq={faq} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}