import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, ThumbsUp, AlertTriangle, Info } from 'lucide-react';

function Section({ icon: Icon, iconColor, title, items, emptyText, itemColor = 'text-slate-300' }) {
  if (!items || items.length === 0) {
    if (!emptyText) return null;
    return (
      <div className="rounded-lg bg-slate-800/30 p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <Icon className={`w-4 h-4 ${iconColor} flex-shrink-0`} />
          <span className="text-slate-200 text-xs font-semibold uppercase tracking-wide">{title}</span>
        </div>
        <p className="text-slate-500 text-xs italic ml-6">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-slate-800/30 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${iconColor} flex-shrink-0`} />
        <span className="text-slate-200 text-xs font-semibold uppercase tracking-wide">{title}</span>
      </div>
      <ul className="space-y-1.5 ml-6">
        {items.map((item, i) => (
          <li key={i} className={`text-xs leading-relaxed ${itemColor}`}>
            <span className="text-slate-600 mr-1.5">•</span>{item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SintesiImprenditoriale({ dati }) {
  if (!dati) return null;

  return (
    <div className="space-y-3">
      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Sintesi per l'imprenditore</p>

      <Card className="bg-[#0a2540] border-[#1a3a5c]">
        <CardContent className="p-4 space-y-3">
          <Section
            icon={Building2}
            iconColor="text-blue-400"
            title="Stato generale"
            items={dati.stato_generale}
            emptyText="Dati insufficienti per una sintesi generale."
          />

          <Section
            icon={ThumbsUp}
            iconColor="text-green-400"
            title="Punti di forza"
            items={dati.punti_forza}
            emptyText="Nessun punto di forza rilevato dai dati disponibili."
            itemColor="text-green-300/80"
          />

          <Section
            icon={AlertTriangle}
            iconColor="text-amber-400"
            title="Aree di attenzione"
            items={dati.aree_attenzione}
            emptyText="Nessuna area di attenzione rilevata."
            itemColor="text-amber-300/80"
          />

          <Section
            icon={Info}
            iconColor="text-slate-400"
            title="Limiti dell'analisi"
            items={dati.limiti}
            itemColor="text-slate-400"
          />

          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <p className="text-slate-500 text-[10px] leading-relaxed italic text-center">
              Analisi automatica basata esclusivamente sui dati forniti nel documento caricato.
              Il risultato ha finalità informative e non sostituisce la consulenza di un professionista abilitato.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}