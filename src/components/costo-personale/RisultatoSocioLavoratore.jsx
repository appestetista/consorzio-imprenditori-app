import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import FooterNormativo from './FooterNormativo';

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

export default function RisultatoSocioLavoratore({ result, onReset }) {
  if (!result) {
    return (
      <Card className="bg-red-500/20 border-red-500/50">
        <CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span className="text-red-400 text-sm">Tabelle incomplete. Verificare dati normativi.</span>
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
            {result.tipo_societa && <div><span className="text-slate-500">Società:</span> <span className="text-white">{result.tipo_societa}</span></div>}
            {result.ruolo_operativo && <div><span className="text-slate-500">Ruolo:</span> <span className="text-white">{result.ruolo_operativo}</span></div>}
            <div><span className="text-slate-500">Compenso:</span> <span className="text-white font-semibold">€{fmt(result.compenso)}</span></div>
            <div><span className="text-slate-500">Gestione:</span> <span className="text-white">{result.label_gestione}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Contributi INPS */}
      <Card className="bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-amber-500/30">
        <CardContent className="p-4">
          <h3 className="text-amber-400 font-bold mb-3">🏛️ Contributi INPS — {result.label_gestione}</h3>
          <div className="space-y-2 text-sm">
            {det?.tipo === 'dipendente_coop' && (
              <>
                <Row label={`INPS datore (${(det.aliquota_datore * 100).toFixed(2)}%)`} value={fmt(det.inps_datore)} />
                <Row label={`INPS lavoratore (${(det.aliquota_lavoratore * 100).toFixed(2)}%)`} value={fmt(det.inps_lavoratore)} />
                <div className="border-t border-amber-500/30 pt-2 mt-1">
                  <Row label="Totale INPS" value={fmt(det.inps_datore + det.inps_lavoratore)} bold />
                </div>
              </>
            )}
            {(det?.tipo === 'commercianti' || det?.tipo === 'artigiani') && (
              <>
                <Row label="Contributo fisso su minimale" value={fmt(det.contributo_fisso_annuo)} bold />
                <div className="text-slate-500 text-xs pl-2">
                  Minimale: €{fmt(det.minimale_annuo)} — Aliquota: {(det.aliquota_percentuale * 100).toFixed(2)}%
                </div>
                {det.eccedenza > 0 && (
                  <Row label={`Eccedenza (€${fmt(det.eccedenza)} × ${(det.aliquota_percentuale * 100).toFixed(2)}%)`} value={fmt(det.contributo_su_eccedenza)} />
                )}
                <div className="border-t border-amber-500/30 pt-2 mt-1">
                  <Row label="Contributo totale" value={fmt(det.contributo_totale)} bold />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Costo azienda */}
      <Card className="bg-gradient-to-br from-red-500/20 to-orange-500/10 border-red-500/30">
        <CardContent className="p-4">
          <h3 className="text-red-400 font-bold mb-3">🏢 Costo per l'Azienda</h3>
          <div className="space-y-2 text-sm">
            <Row label="Compenso lordo" value={fmt(result.compenso)} />
            {det?.tipo === 'dipendente_coop' && <Row label="INPS datore" value={fmt(det.inps_datore)} />}
            {result.inail > 0 && <Row label="INAIL" value={fmt(result.inail)} />}
            <div className="border-t border-red-500/30 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-red-400 font-bold">COSTO TOTALE</span>
                <span className="text-red-400 font-bold text-lg">€{fmt(result.costo_azienda)}</span>
              </div>
              <Row label="Mensile (su 12 mesi)" value={fmt(result.costo_azienda / 12)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Netto */}
      <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-green-500/30">
        <CardContent className="p-4">
          <h3 className="text-green-400 font-bold mb-3">🧾 Netto Socio Lavoratore</h3>
          <div className="space-y-2 text-sm">
            <Row label="Reddito dichiarato" value={fmt(result.compenso)} />
            <Row label="- Contributi previdenziali deducibili" value={fmt(result.contributo_inps)} negative />
            <Row label="= Reddito imponibile IRPEF" value={fmt(result.imponibile_irpef)} bold />

            {/* Dettaglio scaglioni IRPEF */}
            <div className="pl-2 border-l-2 border-green-500/30 space-y-1">
              <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Scaglioni IRPEF 2026</p>
              {result.irpef_scaglione_1_importo > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">{(result.aliquota_scaglione_1 * 100).toFixed(0)}% fino a €{fmt(result.soglia_1)}</span>
                  <span className="text-red-300">-€{fmt(result.irpef_scaglione_1_importo)}</span>
                </div>
              )}
              {result.irpef_scaglione_2_importo > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">{(result.aliquota_scaglione_2 * 100).toFixed(0)}% €{fmt(result.soglia_1)}–€{fmt(result.soglia_2)}</span>
                  <span className="text-red-300">-€{fmt(result.irpef_scaglione_2_importo)}</span>
                </div>
              )}
              {result.irpef_scaglione_3_importo > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">{(result.aliquota_scaglione_3 * 100).toFixed(0)}% oltre €{fmt(result.soglia_2)}</span>
                  <span className="text-red-300">-€{fmt(result.irpef_scaglione_3_importo)}</span>
                </div>
              )}
            </div>

            <Row label="IRPEF lorda" value={fmt(result.irpef_lorda)} negative />
            {result.detrazione_lavoro > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">+ Detrazione lavoro (art. 13 TUIR)</span>
                <span className="text-green-400">+€{fmt(result.detrazione_lavoro)}</span>
              </div>
            )}
            <Row label="= IRPEF netta" value={fmt(result.irpef)} negative />
            <Row label={`- Addizionali reg./com. (~${(result.aliquota_addizionali * 100).toFixed(1)}%)`} value={fmt(result.addizionali)} negative />
            <div className="border-t border-green-500/30 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-green-400 font-bold">NETTO DISPONIBILE</span>
                <span className="text-green-400 font-bold text-lg">€{fmt(result.netto_annuo)}</span>
              </div>
              <Row label="Netto mensile" value={fmt(result.netto_mensile)} green />
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
              <p className="text-yellow-400 font-bold text-lg">{((1 - result.netto_annuo / result.costo_azienda) * 100).toFixed(1)}%</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-slate-400 text-[10px]">Costo/Netto</p>
              <p className="text-white font-bold text-lg">{(result.costo_azienda / Math.max(1, result.netto_annuo)).toFixed(2)}x</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-slate-400 text-[10px]">Gestione</p>
              <p className="text-white font-bold text-[11px]">{result.label_gestione}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <FooterNormativo anno={result.anno} fonti={result.fonti} dataAggiornamento={result.dataAggiornamento} />

      <Button onClick={onReset} variant="outline" className="w-full border-slate-600 text-slate-400 hover:bg-slate-800">
        Nuova Simulazione
      </Button>
    </div>
  );
}