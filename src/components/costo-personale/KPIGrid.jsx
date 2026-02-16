import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Griglia KPI uniforme per tutte le 4 categorie di simulazione.
 * Props:
 * - costoTotale: costo totale per il datore/committente/SRL
 * - nettoAnnuo: netto annuo del lavoratore
 * - contributiTotali: contributi totali (INPS + INAIL)
 * - imposteTotali: IRPEF netta + addizionali
 * - compensoLordo: RAL o compenso lordo di partenza
 * - anno: anno normativo
 */
export default function KPIGrid({ costoTotale, nettoAnnuo, contributiTotali, imposteTotali, compensoLordo, anno }) {
  const cuneo = costoTotale > 0 ? ((1 - nettoAnnuo / costoTotale) * 100).toFixed(1) : '0.0';
  const costoNetto = nettoAnnuo > 0 ? (costoTotale / nettoAnnuo).toFixed(2) : '0.00';
  const incContrib = compensoLordo > 0 ? ((contributiTotali / compensoLordo) * 100).toFixed(1) : '0.0';
  const incFiscale = compensoLordo > 0 ? ((imposteTotali / compensoLordo) * 100).toFixed(1) : '0.0';

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-4">
        <h3 className="text-white font-bold mb-3 text-sm">📊 Indicatori — Anno {anno}</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
            <p className="text-slate-400 text-[10px]">Incidenza contributiva</p>
            <p className="text-amber-400 font-bold text-lg">{incContrib}%</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
            <p className="text-slate-400 text-[10px]">Incidenza fiscale</p>
            <p className="text-green-400 font-bold text-lg">{incFiscale}%</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <p className="text-slate-400 text-[10px]">Cuneo totale</p>
            <p className="text-yellow-400 font-bold text-lg">{cuneo}%</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <p className="text-slate-400 text-[10px]">Costo / Netto</p>
            <p className="text-white font-bold text-lg">{costoNetto}x</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}