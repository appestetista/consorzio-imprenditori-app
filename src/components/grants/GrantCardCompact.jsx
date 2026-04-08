import React from 'react';
import { Calendar, Euro, Zap, ChevronRight, Clock, CheckCircle2, ExternalLink, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

/**
 * Card bando compatta — stile decisionale, non amministrativo.
 * Mostra: nome, importo, scadenza, stato, facilità d'accesso.
 */
export default function GrantCardCompact({ grant, onDetails, isRecommended = false }) {
  const daysToDeadline = grant.deadline ? Math.ceil((new Date(grant.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const isUrgent = daysToDeadline !== null && daysToDeadline <= 30 && daysToDeadline > 0;

  const formatAmount = () => {
    if (grant.max_amount) return `Fino a ${grant.max_amount.toLocaleString('it-IT')} €`;
    if (grant.min_amount) return `Da ${grant.min_amount.toLocaleString('it-IT')} €`;
    return null;
  };

  const amount = formatAmount();

  return (
    <button
      onClick={() => onDetails(grant)}
      className={`w-full text-left rounded-xl border p-4 transition-all active:scale-[0.98] ${
        isRecommended
          ? 'bg-gradient-to-br from-slate-800 to-slate-800/60 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
          : 'bg-slate-800/80 border-slate-700/50 hover:border-slate-600'
      }`}
    >
      {/* Top row: status + urgency */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
          grant.status === 'Aperto'
            ? 'bg-emerald-500/15 text-emerald-400'
            : grant.status === 'In apertura'
              ? 'bg-amber-500/15 text-amber-400'
              : 'bg-slate-700 text-slate-400'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            grant.status === 'Aperto' ? 'bg-emerald-400' : grant.status === 'In apertura' ? 'bg-amber-400' : 'bg-slate-500'
          }`} />
          {grant.status}
        </span>

        {grant.easy_access && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full">
            <Zap className="w-3 h-3" />
            Attivabile subito
          </span>
        )}

        {isUrgent && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3" />
            {daysToDeadline}g
          </span>
        )}

        {!grant.requires_cofinancing && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400/80 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            No cofin.
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-white font-semibold text-sm leading-snug mb-2 line-clamp-2">
        {grant.title}
      </h3>

      {/* Key metrics row */}
      <div className="flex items-center gap-4 text-xs">
        {amount && (
          <div className="flex items-center gap-1 text-emerald-400 font-semibold">
            <Euro className="w-3.5 h-3.5" />
            {amount}
          </div>
        )}

        {grant.deadline && !isNaN(new Date(grant.deadline).getTime()) && (
          <div className={`flex items-center gap-1 ${isUrgent ? 'text-red-400' : 'text-slate-400'}`}>
            <Calendar className="w-3.5 h-3.5" />
            {format(new Date(grant.deadline), 'd MMM yyyy', { locale: it })}
          </div>
        )}
      </div>

      {/* Coverage + region row */}
      <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
        {grant.coverage_percentage && (
          <span>Copertura {grant.coverage_percentage}%</span>
        )}
        {grant.eligible_regions?.length > 0 && (
          <span>{grant.eligible_regions.length > 2 ? `${grant.eligible_regions.slice(0,2).join(', ')}...` : grant.eligible_regions.join(', ')}</span>
        )}
        {(grant.livello === 'Nazionale' || grant.is_national) && (
          <span>🇮🇹 Nazionale</span>
        )}
        {grant.livello === 'Europeo' && (
          <span>🇪🇺 Europeo</span>
        )}
        {grant.confidence_level === 'alto' && (
          <span className="inline-flex items-center gap-0.5 text-emerald-400">
            <ShieldCheck className="w-3 h-3" />
            Verificato
          </span>
        )}
        {grant.confidence_level === 'medio' && (
          <span className="inline-flex items-center gap-0.5 text-amber-400">
            <ShieldQuestion className="w-3 h-3" />
            Da verificare
          </span>
        )}
      </div>

      {/* Bottom CTA hint */}
      <div className="flex items-center justify-end mt-3 text-xs text-slate-500">
        <span>Vedi dettagli</span>
        <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
      </div>
    </button>
  );
}