import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Info, AlertTriangle, Shield } from 'lucide-react';

const ANNO_CORRENTE = 2026;

export default function FooterNormativo({ anno, fonti, fonteCcnl, dataAggiornamento }) {
  const annoDisallineato = anno && anno !== ANNO_CORRENTE;

  return (
    <>
      {/* Avviso anno diverso */}
      {annoDisallineato && (
        <Card className="bg-amber-500/20 border-amber-500/40">
          <CardContent className="p-3 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-300 text-sm font-semibold">Attenzione: anno normativo {anno}</p>
              <p className="text-amber-400/80 text-xs mt-1">
                Le aliquote utilizzate si riferiscono all'anno {anno}. L'anno normativo corrente è {ANNO_CORRENTE}. 
                Verificare che i dati siano aggiornati prima di utilizzare questa simulazione per decisioni operative.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fonti normative */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            <p className="text-slate-300 text-xs font-semibold">Anno normativo: {anno}</p>
          </div>

          {dataAggiornamento && (
            <p className="text-slate-500 text-[10px]">
              📅 Ultimo aggiornamento tabelle: {new Date(dataAggiornamento).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          )}

          <div>
            <p className="text-slate-500 text-[10px] mb-1">📚 Fonti aliquote:</p>
            <div className="flex flex-wrap gap-1">
              {fonti?.map((f, i) => (
                <span key={i} className="bg-slate-700/50 text-slate-400 text-[10px] px-2 py-0.5 rounded">{f}</span>
              ))}
              {fonteCcnl && (
                <span className="bg-lime-400/10 text-lime-400 text-[10px] px-2 py-0.5 rounded">{fonteCcnl}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 bg-slate-800/50 rounded-lg p-3">
        <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
        <p className="text-slate-500 text-xs">
          Calcolo deterministico su tabelle normative {anno}. Include: detrazioni lavoro dipendente (art. 13 TUIR), trattamento integrativo, addizionali regionali reali e comunale media. Non tiene conto di detrazioni per carichi familiari, bonus specifici o assegni.
        </p>
      </div>
    </>
  );
}