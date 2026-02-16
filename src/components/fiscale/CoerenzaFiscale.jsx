import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, MinusCircle } from 'lucide-react';

const ESITO_CFG = {
  coerente: { icon: CheckCircle2, color: 'text-green-400', label: 'Coerente', bg: 'bg-green-900/10', border: 'border-green-800/30' },
  da_verificare: { icon: AlertTriangle, color: 'text-amber-400', label: 'Da verificare', bg: 'bg-amber-900/10', border: 'border-amber-800/30' },
  non_verificabile: { icon: MinusCircle, color: 'text-slate-500', label: 'Non verificabile', bg: 'bg-slate-800/20', border: 'border-slate-700/30' },
};

export default function CoerenzaFiscale({ dati }) {
  if (!dati?.verifiche?.length) return null;

  return (
    <div className="space-y-3">
      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Coerenza fiscale</p>

      <Card className="bg-[#0a2540] border-[#1a3a5c]">
        <CardContent className="p-4 space-y-3">
          {dati.verifiche.map((v, i) => {
            const cfg = ESITO_CFG[v.esito] || ESITO_CFG.non_verificabile;
            const Icon = cfg.icon;

            return (
              <div key={i} className={`rounded-lg p-3 ${cfg.bg} border ${cfg.border}`}>
                <div className="flex items-start gap-2.5">
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-slate-200 text-xs font-medium">{v.nome}</span>
                      <span className={`text-[10px] font-semibold uppercase ${cfg.color}`}>{cfg.label}</span>
                    </div>

                    {v.aliquota_effettiva != null && (
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="bg-slate-800/60 rounded px-2 py-1">
                          <span className="text-[10px] text-slate-500">Effettiva</span>
                          <p className={`text-sm font-bold ${cfg.color}`}>{v.aliquota_effettiva}%</p>
                        </div>
                        {v.aliquota_nominale != null && (
                          <div className="bg-slate-800/60 rounded px-2 py-1">
                            <span className="text-[10px] text-slate-500">Nominale</span>
                            <p className="text-sm font-bold text-slate-300">{v.aliquota_nominale}%</p>
                          </div>
                        )}
                        {v.aliquota_nominale_min != null && (
                          <div className="bg-slate-800/60 rounded px-2 py-1">
                            <span className="text-[10px] text-slate-500">Range nominale</span>
                            <p className="text-sm font-bold text-slate-300">{v.aliquota_nominale_min}% – {v.aliquota_nominale_max}%</p>
                          </div>
                        )}
                      </div>
                    )}

                    {v.formula && v.esito !== 'non_verificabile' && (
                      <p className="text-slate-600 text-[10px] mt-1.5">
                        <span className="text-slate-500">Formula:</span> {v.formula}
                      </p>
                    )}
                    {v.dettaglio && (
                      <p className="text-slate-600 text-[10px]">
                        <span className="text-slate-500">Calcolo:</span> {v.dettaglio}
                      </p>
                    )}

                    <p className="text-slate-400 text-[11px] mt-2 leading-relaxed">{v.nota}</p>
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