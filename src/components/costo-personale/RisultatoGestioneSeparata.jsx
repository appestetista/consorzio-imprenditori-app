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
      {/* Riepilogo */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-slate-500">Compenso:</span> <span className="text-white font-semibold">€{fmt(result.compenso)}</span></div>
            <div><span className="text-slate-500">Altra copertura:</span> <span className="text-white">{result.ha_altra_copertura ? 'Sì (ridotta)' : 'No (piena)'}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Contributi */}
      <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border-cyan-500/30">
        <CardContent className="p-4">
          <h3 className="text-cyan-400 font-bold mb-3">🏛️ Contributi Gestione Separata</h3>
          <div className="space-y-2 text-sm">
            <Row label={`Aliquota effettiva (${(result.aliquota_effettiva * 100).toFixed(2)}%)`} value={fmt(result.contributo_totale)} bold />
            <Row label={`  ↳ Quota committente 2/3`} value={fmt(result.quota_committente)} />
            <Row label={`  ↳ Quota collaboratore 1/3`} value={fmt(result.quota_collaboratore)} />
          </div>
        </CardContent>
      </Card>

      {/* Costo committente */}
      <Card className="bg-gradient-to-br from-red-500/20 to-orange-500/10 border-red-500/30">
        <CardContent className="p-4">
          <h3 className="text-red-400 font-bold mb-3">🏢 Costo per il Committente</h3>
          <div className="space-y-2 text-sm">
            <Row label="Compenso lordo" value={fmt(result.compenso)} />
            <Row label="+ Quota INPS committente (2/3)" value={fmt(result.quota_committente)} />
            <div className="border-t border-red-500/30 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-red-400 font-bold">COSTO TOTALE COMMITTENTE</span>
                <span className="text-red-400 font-bold text-lg">€{fmt(result.costo_committente)}</span>
              </div>
              <Row label="Mensile (su 12 mesi)" value={fmt(result.costo_committente / 12)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Netto collaboratore */}
      <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-green-500/30">
        <CardContent className="p-4">
          <h3 className="text-green-400 font-bold mb-3">🧾 Netto Collaboratore</h3>
          <div className="space-y-2 text-sm">
            <Row label="Compenso lordo" value={fmt(result.compenso)} />
            <Row label="- Quota INPS collaboratore (1/3)" value={fmt(result.quota_collaboratore)} negative />
            <Row label="= Imponibile IRPEF" value={fmt(result.imponibile_irpef)} bold />
            <Row label="- IRPEF (scaglioni 23/33/43%)" value={fmt(result.irpef)} negative />
            <Row label={`- Addizionali (~${(result.aliquota_addizionali * 100).toFixed(1)}%)`} value={fmt(result.addizionali)} negative />
            <div className="border-t border-green-500/30 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-green-400 font-bold">NETTO ANNUO</span>
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
              <p className="text-yellow-400 font-bold text-lg">{((1 - result.netto_annuo / result.costo_committente) * 100).toFixed(1)}%</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-slate-400 text-[10px]">Costo/Netto</p>
              <p className="text-white font-bold text-lg">{(result.costo_committente / Math.max(1, result.netto_annuo)).toFixed(2)}x</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-slate-400 text-[10px]">Aliquota</p>
              <p className="text-white font-bold text-lg">{(result.aliquota_effettiva * 100).toFixed(1)}%</p>
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