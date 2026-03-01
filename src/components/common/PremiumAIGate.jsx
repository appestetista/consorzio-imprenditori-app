import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Lock, ArrowRight, Sparkles } from 'lucide-react';

/**
 * Mostra un blocco se l'utente non ha piano_abbonamento = "impresa_39".
 * Wrappa il children: se l'utente ha il piano, mostra i children normalmente.
 * Se non ha il piano, mostra la card di upgrade.
 * 
 * Props:
 * - user: oggetto utente con piano_abbonamento
 * - children: contenuto da mostrare se ha il piano
 * - featureLabel: etichetta della feature (es. "Analisi Contratti AI")
 */
export default function PremiumAIGate({ user, children, featureLabel }) {
  const piano = user?.piano_abbonamento;
  const hasPremium = piano === 'impresa_39';

  if (hasPremium) return <>{children}</>;

  return (
    <div className="rounded-2xl border border-[#d4af37]/30 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-[#d4af37]/15 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-6 h-6 text-[#d4af37]" />
        </div>
        <div>
          <h3 className="text-white font-bold text-base">Questa funzione richiede il Piano Impresa</h3>
        </div>
      </div>
      
      <p className="text-slate-400 text-sm leading-relaxed">
        {featureLabel 
          ? `${featureLabel} è una funzionalità AI disponibile con il Piano Impresa.`
          : 'Analizza i tuoi contratti con l\'AI, verifica la compliance, esplora i mercati internazionali.'}
      </p>

      <Link
        to={createPageUrl('Pricing')}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:shadow-lg hover:shadow-[#d4af37]/25"
        style={{
          background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
          color: '#fff',
        }}
      >
        Attiva per 39€/mese <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}