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

export default function RisultatoAmministratore({ result, onReset }) {
  if (!result) {
    return (
      <Card className="bg-red-500/20 border-red-500/50">
        <CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span className="text-red-400 text-sm">Tabelle incomplete per la gestione selezionata. Verificare dati normativi.</span>
        </CardContent>
      </Card>
    );
  }

  const det = result.dettaglio_contributi;

  return (
    <div className="space-y-4">
      {/* Riepilogo input */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-slate-500">Compenso:</span> <span className="text-white font-semibold">€{fmt(result.compenso)}</span></div>
            <div><span className="text-slate-500">Gestione:</span> <span className="text-white">{result.label_gestione}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Dettaglio contributi INPS */}
      <Card className="bg-gradient-to-br from-indigo-500/20 to-violet-500/10 border-indigo-500/30">
        <CardContent className="p-4">
          <h3 className="text-indigo-400 font-bold mb-3">🏛️ Contributi INPS — {result.label_gestione}</h3>
          <div className="space-y-2 text-sm">
            {det?.tipo === 'gestione_separata' && (
              <>
                <Row label={`Aliquota totale (${(det.aliquota_totale * 100).toFixed(2)}%)`} value={fmt(result.inps_datore + result.inps_amministratore)} bold />
                <Row label={`  ↳ Quota SRL 2/3 (${(det.aliquota_totale * det.quota_datore_pct * 100).toFixed(2)}%)`} value={fmt(result.inps_datore)} />
                <Row label={`  ↳ Quota amministratore 1/3 (${(det.aliquota_totale * det.quota_iscritto_pct * 100).toFixed(2)}%)`} value={fmt(result.inps_amministratore)} />
              </>
            )}
            {(det?.tipo === 'commercianti' || det?.tipo === 'artigiani') && (
              <>
                <Row label="Contributo fisso su minimale" value={fmt(det.contributo_fisso_annuo)} bold />
                <div className="text-slate-500 text-xs pl-2">
                  Minimale: €{fmt(det.minimale_annuo)} — Aliquota: {(det.aliquota_percentuale * 100).toFixed(2)}%
                </div>
                {det.eccedenza > 0 && (
                  <>
                    <Row label={`Eccedenza (€${fmt(det.eccedenza)} × ${(det.aliquota_percentuale * 100).toFixed(2)}%)`} value={fmt(det.contributo_su_eccedenza)} />
                  </>
                )}
                <div className="border-t border-indigo-500/30 pt-2 mt-1">
                  <Row label="Contributo totale" value={fmt(det.contributo_totale)} bold />
                </div>
                <div className="text-slate-500 text-xs">
                  Massimale reddito: €{fmt(det.massimale_reddito)} — Interamente a carico del socio-amministratore
                </div>
              </>
            )}
            {det?.tipo === 'nessuna' && (
              <p className="text-slate-400 text-sm">Nessun contributo INPS applicabile.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Costo per la SRL */}
      <Card className="bg-gradient-to-br from-red-500/20 to-orange-500/10 border-red-500/30">
        <CardContent className="p-4">
          <h3 className="text-red-400 font-bold mb-3">🏢 Costo per la SRL</h3>
          <div className="space-y-2 text-sm">
            <Row label="Compenso lordo" value={fmt(result.compenso)} bold />
            {result.inps_datore > 0 && (
              <Row label="Contributi INPS a carico SRL" value={fmt(result.inps_datore)} />
            )}
            {result.inail > 0 && <Row label={`INAIL (${(result.aliquota_inail * 100).toFixed(2)}%)`} value={fmt(result.inail)} />}
            <div className="border-t border-red-500/30 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-red-400 font-bold">COSTO TOTALE SRL</span>
                <span className="text-red-400 font-bold text-lg">€{fmt(result.costo_totale_srl)}</span>
              </div>
              <Row label="Costo mensile (su 12 mesi)" value={fmt(result.costo_totale_srl / 12)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risparmio Fiscale SRL */}
      <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border-blue-500/30">
        <CardContent className="p-4">
          <h3 className="text-blue-400 font-bold mb-3">📉 Risparmio Fiscale SRL</h3>
          <div className="space-y-2 text-sm">
            <Row label="Deducibile IRES (compenso + INPS SRL)" value={fmt(result.deducibile_ires)} />
            <div className="flex justify-between">
              <span className="text-slate-400">→ Risparmio IRES ({(result.aliquota_ires * 100).toFixed(0)}%)</span>
              <span className="text-green-400">-€{fmt(result.risparmio_ires)}</span>
            </div>
            <Row label="Deducibile IRAP (solo compenso)" value={fmt(result.deducibile_irap)} />
            <div className="flex justify-between">
              <span className="text-slate-400">→ Risparmio IRAP (~{(result.aliquota_irap * 100).toFixed(1)}%)</span>
              <span className="text-green-400">-€{fmt(result.risparmio_irap)}</span>
            </div>
            <div className="border-t border-blue-500/30 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-blue-400 font-bold">COSTO NETTO SRL</span>
                <span className="text-blue-400 font-bold text-lg">€{fmt(result.costo_netto_srl)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Netto Amministratore */}
      <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-green-500/30">
        <CardContent className="p-4">
          <h3 className="text-green-400 font-bold mb-3">🧾 Netto Amministratore</h3>
          <div className="space-y-2 text-sm">
            <Row label="Compenso lordo" value={fmt(result.compenso)} />
            <Row label={`- Contributi INPS personali`} value={fmt(result.inps_amministratore)} negative />
            <Row label="= Imponibile IRPEF" value={fmt(result.imponibile_irpef)} bold />
            <Row label="- IRPEF (scaglioni 23/33/43%)" value={fmt(result.irpef)} negative />
            <Row label={`- Addizionali (~${(result.aliquota_addizionali * 100).toFixed(1)}%)`} value={fmt(result.addizionali)} negative />
            <div className="border-t border-green-500/30 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-green-400 font-bold">NETTO ANNUO</span>
                <span className="text-green-400 font-bold text-lg">€{fmt(result.netto_amministratore)}</span>
              </div>
              <Row label="Netto mensile (su 12 mesi)" value={fmt(result.netto_amministratore / 12)} green />
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
              <p className="text-yellow-400 font-bold text-lg">{((1 - result.netto_amministratore / result.costo_totale_srl) * 100).toFixed(1)}%</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-slate-400 text-[10px]">Costo/Netto</p>
              <p className="text-white font-bold text-lg">{(result.costo_totale_srl / Math.max(1, result.netto_amministratore)).toFixed(2)}x</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-slate-400 text-[10px]">Gestione</p>
              <p className="text-white font-bold text-[11px]">{det?.tipo === 'gestione_separata' ? 'Gest. Sep.' : det?.tipo === 'commercianti' ? 'Comm.' : det?.tipo === 'artigiani' ? 'Art.' : 'Nessuna'}</p>
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
          </div>
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 bg-slate-800/50 rounded-lg p-3">
        <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
        <p className="text-slate-500 text-xs">
          Calcolo deterministico su tabelle normative {result.anno}. L'IRAP varia per regione. Non tiene conto di detrazioni specifiche.
        </p>
      </div>

      <Button onClick={onReset} variant="outline" className="w-full border-slate-600 text-slate-400 hover:bg-slate-800">
        Nuova Simulazione
      </Button>
    </div>
  );
}