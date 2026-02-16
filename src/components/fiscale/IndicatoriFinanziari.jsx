import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, MinusCircle } from 'lucide-react';

const formatValore = (v, unita) => {
  if (unita === '€') {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
  }
  return `${v}%`;
};

export default function IndicatoriFinanziari({ dati }) {
  if (!dati?.indicatori?.length) return null;

  const calcolati = dati.indicatori.filter(i => i.valore != null);
  const nonCalcolabili = dati.indicatori.filter(i => i.valore == null);

  return (
    <div className="space-y-3">
      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Indicatori finanziari</p>

      {/* Calcolati */}
      {calcolati.length > 0 && (
        <Card className="bg-[#0a2540] border-[#1a3a5c]">
          <CardContent className="p-4 space-y-3">
            {calcolati.map((ind, i) => {
              const positivo = ind.unita === '%' ? ind.valore > 0 : ind.valore < 0; // PFN bassa = bene
              const Icon = ind.unita === '€' 
                ? (ind.valore <= 0 ? TrendingUp : TrendingDown)
                : (ind.valore > 0 ? TrendingUp : TrendingDown);
              const colore = ind.unita === '€'
                ? (ind.valore <= 0 ? 'text-green-400' : 'text-red-400')
                : (ind.valore > 5 ? 'text-green-400' : ind.valore >= 0 ? 'text-yellow-400' : 'text-red-400');

              return (
                <div key={i} className="rounded-lg bg-slate-800/40 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-200 text-xs font-medium">{ind.nome}</span>
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-3.5 h-3.5 ${colore}`} />
                      <span className={`text-sm font-bold ${colore}`}>
                        {formatValore(ind.valore, ind.unita)}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-600 text-[10px]">
                    <span className="text-slate-500">Formula:</span> {ind.formula}
                  </p>
                  <p className="text-slate-600 text-[10px]">
                    <span className="text-slate-500">Calcolo:</span> {ind.dettaglio}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Non calcolabili */}
      {nonCalcolabili.length > 0 && (
        <Card className="bg-slate-800/30 border-slate-700/50">
          <CardContent className="p-3 space-y-2">
            <p className="text-slate-500 text-[10px] font-semibold uppercase">Non calcolabili</p>
            {nonCalcolabili.map((ind, i) => (
              <div key={i} className="flex items-start gap-2">
                <MinusCircle className="w-3.5 h-3.5 text-slate-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-slate-400 text-xs">{ind.nome}</span>
                  <p className="text-slate-600 text-[10px]">{ind.motivo}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}