import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Check, ChevronDown, ChevronUp, ArrowLeft, Sparkles, Crown, Shield, Zap, X, Loader2, MessageCircle } from 'lucide-react';
import EuroTokenConverter from '../components/pricing/EuroTokenConverter';

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
    <div className="min-h-screen pb-64" style={{ backgroundColor: '#0a0f1a' }}>
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
                  onClick={() => setShowModal(true)}
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

        {/* Convertitore Euro → Token */}
        <div className="mt-10">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 text-center">Quanto vale il tuo investimento?</h3>
          <EuroTokenConverter />
        </div>

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

      {/* Modale Attivazione */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(10, 15, 26, 0.92)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md bg-[#111827] border border-slate-700/60 rounded-2xl overflow-hidden shadow-2xl">
            {/* Header modale */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="text-white font-bold text-base">Attiva il Piano Impresa</h2>
              <button onClick={() => { setShowModal(false); setSent(false); }} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {sent ? (
              <div className="px-5 pb-6 text-center">
                <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-7 h-7 text-green-400" />
                </div>
                <h3 className="text-white font-bold text-lg mb-1">Richiesta inviata!</h3>
                <p className="text-slate-400 text-sm mb-4">Ti attiviamo entro 24h dalla ricezione del pagamento.</p>
                <button
                  onClick={() => { setShowModal(false); setSent(false); }}
                  className="px-6 py-2.5 rounded-xl border border-slate-600 text-white text-sm font-medium hover:border-slate-500 transition-colors"
                >
                  Chiudi
                </button>
              </div>
            ) : (
              <div className="px-5 pb-6 space-y-4">
                {/* Riepilogo */}
                <div className="bg-slate-800/60 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-slate-300">Piano Impresa</span>
                  <span className="text-white font-bold">39€/mese <span className="text-xs text-slate-500 font-normal">+ IVA</span></span>
                </div>

                <p className="text-sm text-slate-400">Per attivare il piano, effettua un bonifico o contattaci:</p>

                {/* IBAN */}
                <div className="bg-slate-900/80 rounded-xl px-4 py-3 border border-slate-700/50">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">IBAN</p>
                  <p className="text-white text-sm font-mono select-all">INSERISCI_IBAN</p>
                </div>

                {/* Causale */}
                <div className="bg-slate-900/80 rounded-xl px-4 py-3 border border-slate-700/50">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Causale</p>
                  <p className="text-white text-sm select-all">Abbonamento Consorzio — {user?.email || ''}</p>
                </div>

                {/* WhatsApp */}
                <a
                  href="https://wa.me/INSERISCI_NUMERO?text=Ciao,%20vorrei%20attivare%20il%20Piano%20Impresa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Contattaci su WhatsApp
                </a>

                <p className="text-[11px] text-slate-500 text-center">
                  Attiviamo il tuo account entro 24h dalla ricezione del pagamento.
                </p>

                {/* Bottone conferma richiesta */}
                <button
                  onClick={handleRichiestaAbbonamento}
                  disabled={sending}
                  className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
                    color: '#fff',
                  }}
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Ho effettuato il bonifico</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}