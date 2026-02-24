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
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-800/60 border border-amber-500/30 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-amber-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-white text-lg font-semibold leading-tight mb-1">
              Oggi ti conviene un bando agevolato?
            </h2>
            <p className="text-slate-400 text-sm mb-4">
              Completa il tuo profilo aziendale per scoprirlo in pochi secondi.
            </p>
            <Button
              onClick={onCompleteProfile}
              className="bg-white text-slate-900 hover:bg-slate-100 font-semibold w-full"
            >
              Completa il profilo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-white text-xl font-bold leading-tight">
              Sì, ti conviene agire.
            </h2>
          </div>

          {bestGrant && (bestGrant.max_amount || bestGrant.coverage_percentage) && (
            <div className="bg-black/20 rounded-xl px-4 py-3 mb-4">
              <p className="text-slate-400 text-xs mb-0.5">Miglior bando per te</p>
              {bestGrant.max_amount ? (
                <p className="text-emerald-400 text-2xl font-bold tracking-tight">
                  Fino a {bestGrant.max_amount.toLocaleString('it-IT')} €
                </p>
              ) : bestGrant.coverage_percentage ? (
                <p className="text-emerald-400 text-2xl font-bold tracking-tight">
                  Copertura {bestGrant.coverage_percentage}%
                </p>
              ) : null}
              <p className="text-slate-500 text-[10px] mt-0.5">
                {matchedGrants.length} bandi compatibili con il tuo profilo
              </p>
            </div>
          )}

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