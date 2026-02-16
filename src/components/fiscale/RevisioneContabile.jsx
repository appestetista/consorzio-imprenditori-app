import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react';

const ESITO_CONFIG = {
  coerente: { icon: CheckCircle2, color: 'text-green-400', label: 'Coerente', bg: 'bg-green-900/10' },
  potenzialmente_incoerente: { icon: XCircle, color: 'text-red-400', label: 'Potenzialmente incoerente', bg: 'bg-red-900/10' },
  non_verificabile: { icon: MinusCircle, color: 'text-slate-500', label: 'Non verificabile', bg: 'bg-slate-800/30' },
};

export default function RevisioneContabile({ revisione }) {
  if (!revisione?.controlli?.length) return null;

  const superati = revisione.controlli.filter(c => c.esito === 'coerente');
  const anomalie = revisione.controlli.filter(c => c.esito === 'potenzialmente_incoerente');
  const nonVerificabili = revisione.controlli.filter(c => c.esito === 'non_verificabile');

  return (
    <div className="space-y-3">
      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Revisione contabile</p>

      {/* Riepilogo */}
      <div className="flex gap-2">
        {superati.length > 0 && (
          <div className="flex items-center gap-1.5 bg-green-900/20 border border-green-600/30 rounded-lg px-3 py-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            <span className="text-green-400 text-xs font-medium">{superati.length} superati</span>
          </div>
        )}
        {anomalie.length > 0 && (
          <div className="flex items-center gap-1.5 bg-red-900/20 border border-red-600/30 rounded-lg px-3 py-1.5">
            <XCircle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-red-400 text-xs font-medium">{anomalie.length} anomalie</span>
          </div>
        )}
        {nonVerificabili.length > 0 && (
          <div className="flex items-center gap-1.5 bg-slate-800/50 border border-slate-600/30 rounded-lg px-3 py-1.5">
            <MinusCircle className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 text-xs font-medium">{nonVerificabili.length} n/d</span>
          </div>
        )}
      </div>

      {/* Dettaglio controlli */}
      <Card className="bg-[#0a2540] border-[#1a3a5c]">
        <CardContent className="p-4 space-y-3">
          {revisione.controlli.map((controllo, i) => {
            const cfg = ESITO_CONFIG[controllo.esito] || ESITO_CONFIG.non_verificabile;
            const Icon = cfg.icon;

            return (
              <div key={i} className={`rounded-lg p-3 ${cfg.bg}`}>
                <div className="flex items-start gap-2.5">
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-200 text-xs font-medium">{controllo.nome}</span>
                      <span className={`text-[10px] font-semibold uppercase ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <p className="text-slate-500 text-[10px] mt-1 break-all">{controllo.dettaglio}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}