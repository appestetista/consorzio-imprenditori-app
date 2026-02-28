import React from 'react';
import { ListChecks, User, Euro, Clock, Rocket, CheckSquare } from 'lucide-react';

export default function OperationalPlan({ plan }) {
  if (!plan) return null;

  return (
    <div className="space-y-3 mt-3">
      {/* Titolo piano */}
      <div className="text-base font-bold text-white">{plan.titolo_piano}</div>

      {/* Durata + Budget totale */}
      <div className="flex items-center gap-3 flex-wrap">
        {plan.durata_totale && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-400/10 border border-blue-400/30">
            <Clock className="w-3 h-3 text-blue-400" />
            <span className="text-[11px] font-semibold text-blue-400">{plan.durata_totale}</span>
          </div>
        )}
        {plan.budget_stimato && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/30">
            <Euro className="w-3 h-3 text-emerald-400" />
            <span className="text-[11px] font-semibold text-emerald-400">{plan.budget_stimato}</span>
          </div>
        )}
      </div>

      {/* Fasi */}
      {plan.fasi?.length > 0 && (
        <div className="space-y-2">
          {plan.fasi.map((fase, idx) => (
            <div key={idx} className="rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-[#d4af37]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-[#d4af37]">{fase.numero || idx + 1}</span>
                </div>
                <span className="text-sm font-semibold text-white flex-1">{fase.nome}</span>
              </div>

              {/* Meta: durata, responsabile, costo */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                {fase.durata && (
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock className="w-3 h-3" /> {fase.durata}
                  </span>
                )}
                {fase.responsabile && (
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <User className="w-3 h-3" /> {fase.responsabile}
                  </span>
                )}
                {fase.costo_stimato && (
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Euro className="w-3 h-3" /> {fase.costo_stimato}
                  </span>
                )}
              </div>

              {/* Azioni checklist */}
              {fase.azioni?.length > 0 && (
                <ul className="space-y-1">
                  {fase.azioni.map((azione, aIdx) => (
                    <li key={aIdx} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckSquare className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
                      <span>{azione}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Primo passo domani */}
      {plan.primo_passo_domani && (
        <div className="rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 px-4 py-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Rocket className="w-4 h-4 text-[#d4af37]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#d4af37]">Il tuo primo passo domani</span>
          </div>
          <p className="text-sm text-white leading-relaxed">{plan.primo_passo_domani}</p>
        </div>
      )}
    </div>
  );
}