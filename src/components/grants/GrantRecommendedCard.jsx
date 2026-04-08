import React from 'react';
import { Calendar, Euro, Zap, ArrowRight, CheckCircle2, Clock, ExternalLink, Shield, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

/**
 * Card "consigliato" — il bando migliore, in evidenza, stile premium.
 */
export default function GrantRecommendedCard({ grant, onDetails, onRequestConsultation, userInterest }) {
  if (!grant) return null;

  const daysToDeadline = grant.deadline ? Math.ceil((new Date(grant.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const isUrgent = daysToDeadline !== null && daysToDeadline <= 30 && daysToDeadline > 0;

  const formatAmount = () => {
    if (grant.max_amount) return grant.max_amount.toLocaleString('it-IT') + ' €';
    if (grant.min_amount) return 'Da ' + grant.min_amount.toLocaleString('it-IT') + ' €';
    return 'Da definire';
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-800 via-slate-800 to-emerald-950/30 border border-emerald-500/20 overflow-hidden">
      {/* Top label */}
      <div className="bg-emerald-500/10 px-5 py-2 flex items-center gap-2">
        <Shield className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">Consigliato per te</span>
      </div>

      <div className="p-5 space-y-4">
        {/* Title */}
        <h3 className="text-white text-base font-bold leading-snug">
          {grant.title}
        </h3>

        {/* Key metrics grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Amount */}
          <div className="bg-black/20 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase tracking-wider mb-0.5">
              <Euro className="w-3 h-3" />
              Importo max per azienda
            </div>
            <p className="text-emerald-400 text-lg font-bold">{formatAmount()}</p>
          </div>

          {/* Coverage */}
          <div className="bg-black/20 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase tracking-wider mb-0.5">
              <TrendingUp className="w-3 h-3" />
              Copertura
            </div>
            <p className="text-white text-lg font-bold">
              {grant.coverage_percentage ? `${grant.coverage_percentage}%` : '—'}
            </p>
          </div>

          {/* Deadline */}
          <div className="bg-black/20 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase tracking-wider mb-0.5">
              <Calendar className="w-3 h-3" />
              Scadenza
            </div>
            <p className={`text-sm font-semibold ${isUrgent ? 'text-red-400' : 'text-white'}`}>
              {grant.deadline && !isNaN(new Date(grant.deadline).getTime())
                ? format(new Date(grant.deadline), 'd MMM yyyy', { locale: it })
                : 'A esaurimento'}
              {isUrgent && <span className="text-xs ml-1">({daysToDeadline}g)</span>}
            </p>
          </div>

          {/* Access */}
          <div className="bg-black/20 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase tracking-wider mb-0.5">
              <CheckCircle2 className="w-3 h-3" />
              Accesso
            </div>
            <div className="flex items-center gap-1.5">
              {grant.easy_access && <Zap className="w-3.5 h-3.5 text-amber-400" />}
              <p className="text-white text-sm font-semibold">
                {grant.easy_access ? 'Subito' : (grant.access_mode || 'Standard')}
              </p>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300">
            {grant.grant_type}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300">
            {grant.funding_type}
          </span>
          {!grant.requires_cofinancing && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
              Senza cofinanziamento
            </span>
          )}
          {(grant.livello === 'Nazionale' || grant.is_national) && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300">🇮🇹 Nazionale</span>
          )}
          {grant.livello === 'Europeo' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300">🇪🇺 Europeo</span>
          )}
        </div>

        {/* CTA */}
        <div className="space-y-2">
          <Button
            onClick={() => onDetails(grant)}
            className="w-full bg-white text-slate-900 hover:bg-slate-100 font-semibold h-11"
          >
            Vedi tutti i dettagli
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <div className="flex gap-2">
            {grant.website_url && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-slate-700 text-slate-300 hover:text-white text-xs h-9"
                onClick={() => window.open(grant.website_url, '_blank')}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Bando ufficiale
              </Button>
            )}
            <Button
              size="sm"
              className={`flex-1 text-xs h-9 ${
                userInterest?.requested_consultation 
                  ? 'bg-slate-700 text-slate-400' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
              onClick={onRequestConsultation}
              disabled={userInterest?.requested_consultation}
            >
              {userInterest?.requested_consultation ? 'Richiesta inviata' : 'Richiedi consulenza'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}