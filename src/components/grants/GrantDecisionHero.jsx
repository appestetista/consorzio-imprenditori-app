import React from 'react';
import { CheckCircle2, XCircle, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Hero "decision-first": risponde a "Ti conviene attivare un bando agevolato?"
 * Riceve i bandi compatibili (matched) e il profilo utente.
 */
export default function GrantDecisionHero({
  matchedGrants = [],
  isMatching = false,
  hasIncompleteProfile,
  onCompleteProfile,
  onShowBestGrant,
  totalGrants = 0,
}) {
  // Miglior bando compatibile (per max_amount, preferendo easy_access)
  const sortedByBest = [...matchedGrants]
    .sort((a, b) => {
      if (a.easy_access && !b.easy_access) return -1;
      if (!a.easy_access && b.easy_access) return 1;
      return (b.max_amount || 0) - (a.max_amount || 0);
    });
  const bestGrant = sortedByBest[0] || null;
  const hasMatch = matchedGrants.length > 0;

  if (isMatching) {
    return (
      <div className="rounded-2xl bg-slate-800/80 border border-slate-700/50 p-6 text-center">
        <Loader2 className="w-8 h-8 text-white/60 animate-spin mx-auto mb-3" />
        <p className="text-white/80 text-sm">Sto analizzando i bandi per il tuo profilo...</p>
      </div>
    );
  }

  if (hasIncompleteProfile) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl bg-gradient-to-br from-amber-950/40 to-slate-800/80 border-2 border-amber-500/40 p-6">
          <div className="text-center mb-4">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-7 h-7 text-amber-400" />
            </div>
            <h2 className="text-white text-xl font-bold leading-tight mb-2">
              Oggi ti conviene un bando agevolato?
            </h2>
            <p className="text-slate-400 text-sm">
              Compila il tuo profilo aziendale e scopri in pochi secondi quali bandi sono compatibili con la tua azienda.
            </p>
          </div>
          <Button
            onClick={onCompleteProfile}
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold w-full h-12 text-base"
          >
            Compila il profilo bandi
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>

        {totalGrants > 0 && (
          <button
            onClick={() => onShowBestGrant(null)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800/80 border border-slate-700/50 px-4 py-3.5 text-sm font-semibold text-white hover:bg-slate-700/60 transition-colors"
          >
            Esplora tutti i {totalGrants} bandi disponibili
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>
    );
  }

  // Importo massimo ottenibile dal singolo bando migliore
  const bestAmount = bestGrant?.max_amount || 0;

  return (
    <div className={`rounded-2xl border p-6 ${
      hasMatch
        ? 'bg-gradient-to-br from-emerald-950/40 to-slate-800/80 border-emerald-500/30'
        : 'bg-gradient-to-br from-slate-800 to-slate-800/60 border-slate-700/50'
    }`}>
      <p className="text-slate-400 text-xs uppercase tracking-wider font-medium mb-2">
        La tua situazione oggi
      </p>

      {hasMatch ? (
        <>
          {/* Importo bando migliore */}
          <div className="mb-3">
            <p className="text-slate-300 text-sm mb-1">Il bando più adatto a te vale fino a</p>
            <p className="text-emerald-400 text-3xl font-bold tracking-tight">
              {bestAmount > 0 ? `${bestAmount.toLocaleString('it-IT')} €` : 'importo da definire'}
            </p>
            <p className="text-slate-500 text-xs mt-1">
              + altri {matchedGrants.length - 1 > 0 ? matchedGrants.length - 1 : 0} bandi compatibili con il tuo profilo
            </p>
          </div>

          {/* Ti conviene agire */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-white text-lg font-bold leading-tight">
              Ti conviene partecipare
            </h2>
          </div>

          <Button
            onClick={() => onShowBestGrant(bestGrant)}
            className="bg-white text-slate-900 hover:bg-slate-100 font-semibold w-full h-12 text-base"
          >
            Mostrami il bando migliore
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center flex-shrink-0">
              <XCircle className="w-5 h-5 text-slate-500" />
            </div>
            <h2 className="text-white text-lg font-semibold leading-tight">
              Nessun bando compatibile al momento
            </h2>
          </div>
          <p className="text-slate-400 text-sm mb-2">
            Tra i {totalGrants} bandi disponibili, nessuno corrisponde al tuo profilo attuale.
          </p>
          <p className="text-slate-500 text-xs">
            Aggiorna il profilo bandi o esplora l'elenco completo per verificare.
          </p>
        </>
      )}
    </div>
  );
}