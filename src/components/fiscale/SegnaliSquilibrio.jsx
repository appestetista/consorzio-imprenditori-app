import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

const AREA_COLORS = {
  Patrimoniale: 'border-l-purple-500',
  Reddituale: 'border-l-orange-500',
  Finanziaria: 'border-l-red-500',
};

const fmtValore = (v, u) => {
  if (u === '€') return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
  if (u === '%') return `${v}%`;
  if (u === 'x') return `${v}x`;
  return String(v);
};

export default function SegnaliSquilibrio({ dati }) {
  if (!dati) return null;

  if (dati.esito === 'nessun_segnale') {
    return (
      <div className="space-y-3">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Segnali di squilibrio</p>
        <Card className="bg-green-900/10 border-green-800/30">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="text-green-300 text-sm">Nessun segnale di squilibrio rilevato dai dati disponibili.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">
        Possibili segnali da monitorare ({dati.conteggio})
      </p>

      <Card className="bg-[#0a2540] border-[#1a3a5c]">
        <CardContent className="p-4 space-y-3">
          {dati.segnali.map((s, i) => (
            <div key={i} className={`rounded-lg p-3 bg-amber-900/10 border border-amber-800/20 border-l-4 ${AREA_COLORS[s.area] || 'border-l-slate-500'}`}>
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-slate-200 text-xs font-medium">{s.segnale}</span>
                    <span className="text-[10px] text-slate-500 bg-slate-800/60 rounded px-1.5 py-0.5">{s.area}</span>
                  </div>

                  {s.valore != null && (
                    <p className="text-amber-400 text-sm font-bold mt-1">{fmtValore(s.valore, s.unita)}</p>
                  )}

                  {s.formula && (
                    <p className="text-slate-600 text-[10px] mt-1">
                      <span className="text-slate-500">Formula:</span> {s.formula}
                    </p>
                  )}
                  {s.dettaglio && (
                    <p className="text-slate-600 text-[10px]">
                      <span className="text-slate-500">Calcolo:</span> {s.dettaglio}
                    </p>
                  )}

                  <p className="text-slate-400 text-[11px] mt-2 leading-relaxed">{s.descrizione}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}