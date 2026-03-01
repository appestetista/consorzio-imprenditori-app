import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Lock, Zap, ArrowRight } from 'lucide-react';

const MAX_CONSULENZE = 50;

export default function AIUsageBar({ piano, usate }) {
  const isPremium = piano === 'impresa_39';

  // Utente free: blocco chat
  if (!isPremium) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 px-4 py-3 flex items-center gap-3">
        <Lock className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 leading-relaxed">
            Per usare il consulente AI, attiva il Piano Impresa
          </p>
        </div>
        <Link
          to={createPageUrl('Pricing')}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold flex-shrink-0 transition-colors"
          style={{ backgroundColor: '#d4af37', color: '#1a1a2e' }}
        >
          Scopri il piano <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    );
  }

  const count = usate || 0;
  const remaining = MAX_CONSULENZE - count;
  const pct = Math.min((count / MAX_CONSULENZE) * 100, 100);
  const isExhausted = count >= MAX_CONSULENZE;

  // Blocco totale a 50/50
  if (isExhausted) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 space-y-2">
        <p className="text-xs text-red-300 font-medium leading-relaxed">
          Hai usato tutte le {MAX_CONSULENZE} consulenze di questo mese.
          Puoi continuare a usare gli strumenti gratuiti.
          Si rinnovano il 1° del mese.
        </p>
        <Link
          to={createPageUrl('Esplora?tab=strumenti')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600 text-[11px] font-semibold text-white hover:border-[#d4af37]/50 transition-colors"
        >
          Vai agli strumenti <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    );
  }

  // Colore barra
  let barColor = '#d4af37'; // oro
  let textColor = 'text-slate-400';
  let label = `🔶 ${count}/${MAX_CONSULENZE} consulenze AI usate questo mese`;

  if (remaining <= 2) {
    barColor = '#ef4444';
    textColor = 'text-red-400';
    label = `🔴 Ultime ${remaining} consulenz${remaining === 1 ? 'a' : 'e'} questo mese`;
  } else if (remaining <= 10) {
    barColor = '#f97316';
    textColor = 'text-orange-400';
    label = `🟠 ${remaining} consulenze rimaste`;
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className={`text-[11px] ${textColor}`}>{label}</p>
        <p className="text-[10px] text-slate-600">{count}/{MAX_CONSULENZE}</p>
      </div>
      <div className="w-full h-[2px] bg-slate-700/50 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

// Badge piccolo per le risposte
export function AIUsageBadge({ isAIResponse, usate, max = MAX_CONSULENZE }) {
  if (isAIResponse) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-700/50 text-[10px] text-slate-400">
        <Zap className="w-2.5 h-2.5" /> Consulenza AI {usate}/{max}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-700/50 text-[10px] text-slate-400">
      📚 Risposta gratuita
    </span>
  );
}