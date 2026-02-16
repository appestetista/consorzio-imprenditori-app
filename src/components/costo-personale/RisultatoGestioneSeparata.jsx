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

export default function RisultatoGestioneSeparata({ result, onReset }) {
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

  return (
    <div className="space-y-4">
      {/* Riepilogo input */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {result.tipo_soggetto && <div><span className="text-slate-500">Soggetto:</span> <span className="text-white">{result.tipo_soggetto}</span></div>}
            <div><span className="text-slate-500">Compenso:</span> <span className="text-white font-semibold">€{fmt(result.compenso)}</span></div>
            <div><span className="text-slate-500">Altra copertura:</span> <span className="text-white">{result.ha_altra_copertura ? 'Sì (ridotta)' : 'No (piena)'}</span></div>
            <div><span className="text-slate-500">Aliquota:</span> <span className="text-cyan-400 font-semibold">{(result.aliquota_effettiva * 100).toFixed(2)}%</span></div>
          </div>
        </CardContent>
      </Card>

      {/* AREA PREVIDENZIALE */}
      <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border-cyan-500/30">
        <CardContent className="p-4">
          <h3 className="text-cyan-400 font-bold mb-3">🏛️ Area Previdenziale — Gestione Separata</h3>
          <div className="space-y-2 text-sm">
            <Row label="Compenso lordo" value={fmt(result.compenso)} bold />
            <div className="pl-2 border-l-2 border-cyan-500/30 space-y-1">
              <Row label={`Contributo totale (${(result.aliquota_effettiva * 100).toFixed(2)}%)`} value={fmt(result.contributo_totale)} />
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">↳ Quota committente (2/3)</span>
                <span className="text-slate-400">€{fmt(result.quota_committente)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">↳ Quota collaboratore (1/3)</span>
                <span className="text-slate-400">€{fmt(result.quota_collaboratore)}</span>
              </div>
            </div>
            <div className="border-t border-cyan-500/30 pt-2 mt-1">
              <div className="flex justify-between font-semibold">
                <span className="text-cyan-400">Costo committente</span>
                <span className="text-red-300">€{fmt(result.costo_committente)}</span>
              </div>
              <Row label="Mensile (su 12 mesi)" value={fmt(result.costo_committente / 12)} />
            </div>
            <div className="flex justify-between text-xs mt-1 pt-1 border-t border-cyan-500/20">
              <span className="text-slate-500">Incidenza contributiva sul compenso</span>
              <span className="text-cyan-400 font-bold">{result.compenso > 0 ? ((result.contributo_totale / result.compenso) * 100).toFixed(1) : '0.0'}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AREA FISCALE */}
      <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-green-500/30">
        <CardContent className="p-4">
          <h3 className="text-green-400 font-bold mb-3">🧾 Area Fiscale — IRPEF 2026</h3>
          <div className="space-y-2 text-sm">
            <Row label="Reddito imponibile IRPEF" value={fmt(result.imponibile_irpef)} bold />
            <p className="text-slate-500 text-xs pl-2">(Compenso €{fmt(result.compenso)} − Quota INPS collaboratore €{fmt(result.quota_collaboratore)})</p>

            <div className="pl-2 border-l-2 border-green-500/30 space-y-1">
              <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Scaglioni IRPEF</p>
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
            <div className="border-t border-green-500/30 pt-2 mt-1">
              <div className="flex justify-between font-semibold">
                <span className="text-white">IRPEF netta</span>
                <span className="text-red-300">-€{fmt(result.irpef)}</span>
              </div>
            </div>
            <Row label={`Addizionali reg./com. (~${(result.aliquota_addizionali * 100).toFixed(1)}%)`} value={fmt(result.addizionali)} negative />
            <div className="flex justify-between text-xs mt-1 pt-1 border-t border-green-500/20">
              <span className="text-slate-500">Incidenza fiscale sul compenso</span>
              <span className="text-green-400 font-bold">{result.compenso > 0 ? (((result.irpef + result.addizionali) / result.compenso) * 100).toFixed(1) : '0.0'}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NETTO FINALE */}
      <Card className="bg-gradient-to-br from-emerald-600/20 to-green-500/10 border-emerald-500/40">
        <CardContent className="p-4">
          <h3 className="text-green-400 font-bold mb-3">💰 Netto Finale</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-green-400 font-bold text-base">NETTO DISPONIBILE</span>
              <span className="text-green-400 font-bold text-xl">€{fmt(result.netto_annuo)}</span>
            </div>
            <Row label="Netto mensile (su 12 mesi)" value={fmt(result.netto_mensile)} green />
          </div>
        </CardContent>
      </Card>

      {/* KPI */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <h3 className="text-white font-bold mb-3">📊 Indicatori</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 text-center">
              <p className="text-slate-400 text-[10px]">Incidenza contributiva</p>
              <p className="text-cyan-400 font-bold text-lg">{result.compenso > 0 ? ((result.contributo_totale / result.compenso) * 100).toFixed(1) : '0.0'}%</p>
            </div>
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
              <p className="text-slate-400 text-[10px]">Incidenza fiscale</p>
              <p className="text-green-400 font-bold text-lg">{result.compenso > 0 ? (((result.irpef + result.addizionali) / result.compenso) * 100).toFixed(1) : '0.0'}%</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-slate-400 text-[10px]">Cuneo totale</p>
              <p className="text-yellow-400 font-bold text-lg">{((1 - result.netto_annuo / result.costo_committente) * 100).toFixed(1)}%</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-slate-400 text-[10px]">Costo/Netto</p>
              <p className="text-white font-bold text-lg">{(result.costo_committente / Math.max(1, result.netto_annuo)).toFixed(2)}x</p>
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