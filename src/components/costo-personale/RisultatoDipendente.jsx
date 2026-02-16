import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info, AlertTriangle } from 'lucide-react';

const fmt = (n) => n?.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00';

function Row({ label, value, bold, negative, green }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={`${bold ? 'font-semibold text-white' : ''} ${negative ? 'text-red-300' : ''} ${green ? 'text-green-400' : ''} ${!bold && !negative && !green ? 'text-white' : ''}`}>
        {negative ? '-' : ''}€{value}
      </span>
    </div>
  );
}

export default function RisultatoDipendente({ result, onReset }) {
  if (!result) {
    return (
      <Card className="bg-red-500/20 border-red-500/50">
        <CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span className="text-red-400 text-sm">Tabelle incomplete per la qualifica selezionata. Verificare i dati normativi.</span>
        </CardContent>
      </Card>
    );
  }

  const tipoLabel = {
    'indeterminato_fulltime': 'T. Indeterminato — Full-time',
    'indeterminato_parttime': 'T. Indeterminato — Part-time',
    'determinato_fulltime': 'T. Determinato — Full-time',
    'determinato_parttime': 'T. Determinato — Part-time',
    'apprendistato': 'Apprendistato',
  };

  return (
    <div className="space-y-4">
      {/* Riepilogo input */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-slate-500">CCNL:</span> <span className="text-white">{result.ccnl}</span></div>
            <div><span className="text-slate-500">Livello:</span> <span className="text-white">{result.livello}</span></div>
            <div><span className="text-slate-500">Contratto:</span> <span className="text-white">{tipoLabel[result.tipo_contratto] || result.tipo_contratto}</span></div>
            <div><span className="text-slate-500">Regione:</span> <span className="text-white">{result.regione}</span></div>
            {result.isPartTime && <div><span className="text-slate-500">Part-time:</span> <span className="text-white">{result.percentuale_parttime}%</span></div>}
            {result.minimo_tabellare > 0 && <div><span className="text-slate-500">Min. tab.:</span> <span className="text-white">€{fmt(result.minimo_tabellare)}/m</span></div>}
          </div>
        </CardContent>
      </Card>

      {/* Costo Datore */}
      <Card className="bg-gradient-to-br from-red-500/20 to-orange-500/10 border-red-500/30">
        <CardContent className="p-4">
          <h3 className="text-red-400 font-bold mb-3">💰 Costo per il Datore di Lavoro</h3>
          <div className="space-y-2 text-sm">
            <Row label="RAL" value={fmt(result.ral)} bold />
            <Row label={`Contributi INPS datore (${(result.aliquota_inps_datore * 100).toFixed(2)}%)`} value={fmt(result.inps_datore)} />
            <Row label={`INAIL (${(result.aliquota_inail * 100).toFixed(2)}%)`} value={fmt(result.inail)} />
            <Row label={`TFR (RAL / ${result.tfr_divisore})`} value={fmt(result.tfr_annuo)} />
            {result.tfr_fondo_garanzia_costo > 0 && (
              <Row label={`Fondo garanzia TFR (${(result.fondo_garanzia * 100).toFixed(2)}%)`} value={fmt(result.tfr_fondo_garanzia_costo)} />
            )}
            <div className="border-t border-red-500/30 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-red-400 font-bold">COSTO TOTALE ANNUO</span>
                <span className="text-red-400 font-bold text-lg">€{fmt(result.costo_totale_annuo)}</span>
              </div>
              <Row label="Costo mensile (su 12 mesi)" value={fmt(result.costo_mensile_datore)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Netto Dipendente */}
      <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-green-500/30">
        <CardContent className="p-4">
          <h3 className="text-green-400 font-bold mb-3">🧾 Netto Stimato Dipendente</h3>
          <div className="space-y-2 text-sm">
            <Row label="RAL" value={fmt(result.ral)} />
            <Row label={`- INPS dipendente (${(result.aliquota_inps_dip * 100).toFixed(2)}%)`} value={fmt(result.inps_dipendente)} negative />
            <Row label="= Imponibile IRPEF" value={fmt(result.ral - result.inps_dipendente)} bold />
            <Row label="- IRPEF (scaglioni 23/33/43%)" value={fmt(result.irpef)} negative />
            <Row label={`- Addizionali (~${(result.aliquota_addizionali * 100).toFixed(1)}%)`} value={fmt(result.addizionali)} negative />
            <div className="border-t border-green-500/30 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-green-400 font-bold">NETTO ANNUO</span>
                <span className="text-green-400 font-bold text-lg">€{fmt(result.netto_annuo)}</span>
              </div>
              <Row label={`Netto mensile (${result.mensilita} mensilità)`} value={fmt(result.netto_mensile)} green />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <h3 className="text-white font-bold mb-3">📊 Indicatori</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-slate-400 text-[10px]">Cuneo fiscale</p>
              <p className="text-yellow-400 font-bold text-lg">{((1 - result.netto_annuo / result.costo_totale_annuo) * 100).toFixed(1)}%</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-slate-400 text-[10px]">Costo / Netto</p>
              <p className="text-white font-bold text-lg">{(result.costo_totale_annuo / result.netto_annuo).toFixed(2)}x</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-slate-400 text-[10px]">Costo / RAL</p>
              <p className="text-white font-bold text-lg">{((result.costo_totale_annuo / result.ral) * 100).toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fonti normative */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-3">
          <p className="text-slate-500 text-xs mb-2 font-semibold">📚 Anno normativo: {result.anno} — Fonti utilizzate:</p>
          <div className="flex flex-wrap gap-1">
            {result.fonti.map((f, i) => (
              <span key={i} className="bg-slate-700/50 text-slate-400 text-[10px] px-2 py-0.5 rounded">{f}</span>
            ))}
            {result.fonte_ccnl && (
              <span className="bg-lime-400/10 text-lime-400 text-[10px] px-2 py-0.5 rounded">{result.fonte_ccnl}</span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 bg-slate-800/50 rounded-lg p-3">
        <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
        <p className="text-slate-500 text-xs">
          Calcolo deterministico su tabelle normative {result.anno}. INPS: Circ. 6/2026. IRPEF: L. Bilancio 2026 (33% 2° scaglione). Non tiene conto di detrazioni da lavoro dipendente, bonus, assegni familiari o specificità CCNL.
        </p>
      </div>

      <Button onClick={onReset} variant="outline" className="w-full border-slate-600 text-slate-400 hover:bg-slate-800">
        Nuova Simulazione
      </Button>
    </div>
  );
}