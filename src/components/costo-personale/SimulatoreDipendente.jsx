import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Info, Loader2, AlertTriangle } from 'lucide-react';
import { useTabelleContributive, calcolaCostoDipendente } from './useTabelleContributive';

const QUALIFICHE = [
  { key: 'operaio_generico', label: 'Operaio generico' },
  { key: 'operaio_qualificato', label: 'Operaio qualificato' },
  { key: 'impiegato', label: 'Impiegato' },
  { key: 'quadro', label: 'Quadro' },
  { key: 'dirigente', label: 'Dirigente' },
];

export default function SimulatoreDipendente() {
  const tab = useTabelleContributive(2026);
  const [form, setForm] = useState({
    ral: '',
    qualifica: '',
    mensilita: '14',
    tfr_destinazione: 'azienda',
  });
  const [result, setResult] = useState(null);

  const calcola = () => {
    const ral = parseFloat(form.ral);
    if (!ral || ral <= 0 || !form.qualifica || tab.isLoading) return;

    const res = calcolaCostoDipendente({
      ral,
      qualifica: form.qualifica,
      mensilita: parseInt(form.mensilita),
      tfr_destinazione: form.tfr_destinazione,
    }, tab);

    setResult(res);
  };

  const fmt = (n) => n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (tab.isLoading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6 flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-lime-400" />
          <span className="text-slate-400 text-sm">Caricamento tabelle normative...</span>
        </CardContent>
      </Card>
    );
  }

  if (tab.error || !tab.tabelle || Object.keys(tab.tabelle).length === 0) {
    return (
      <Card className="bg-red-500/20 border-red-500/50">
        <CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span className="text-red-400 text-sm">Tabelle contributive {tab.anno} non disponibili. Contattare l'amministratore.</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Calculator className="w-5 h-5 text-lime-400" />
            Dati del dipendente
          </h3>

          <div>
            <label className="text-slate-400 text-sm mb-1 block">RAL (Retribuzione Annua Lorda) *</label>
            <Input type="number" placeholder="Es. 25000" value={form.ral} onChange={(e) => setForm({ ...form, ral: e.target.value })} className="bg-slate-900 border-slate-700 text-white" />
          </div>

          <div>
            <label className="text-slate-400 text-sm mb-1 block">Qualifica *</label>
            <Select value={form.qualifica} onValueChange={(v) => setForm({ ...form, qualifica: v })}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue placeholder="Seleziona qualifica" /></SelectTrigger>
              <SelectContent>
                {QUALIFICHE.map(q => <SelectItem key={q.key} value={q.key}>{q.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-sm mb-1 block">Mensilità</label>
              <Select value={form.mensilita} onValueChange={(v) => setForm({ ...form, mensilita: v })}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="13">13 mensilità</SelectItem>
                  <SelectItem value="14">14 mensilità</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-slate-400 text-sm mb-1 block">TFR destinazione</label>
              <Select value={form.tfr_destinazione} onValueChange={(v) => setForm({ ...form, tfr_destinazione: v })}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="azienda">In azienda</SelectItem>
                  <SelectItem value="fondo">Fondo pensione</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={calcola} disabled={!form.ral || !form.qualifica} className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 font-bold">
            <Calculator className="w-4 h-4 mr-2" />
            Calcola Costo
          </Button>
        </CardContent>
      </Card>

      {result === null ? null : !result ? (
        <Card className="bg-red-500/20 border-red-500/50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-red-400 text-sm">Tabelle incomplete per la qualifica selezionata. Verificare i dati normativi.</span>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Costo Datore */}
          <Card className="bg-gradient-to-br from-red-500/20 to-orange-500/10 border-red-500/30">
            <CardContent className="p-4">
              <h3 className="text-red-400 font-bold mb-3">💰 Costo per il Datore di Lavoro</h3>
              <div className="space-y-2 text-sm">
                <Row label="RAL" value={fmt(result.ral)} bold />
                <Row label={`Contributi INPS datore (${(result.aliquota_inps_datore * 100).toFixed(2)}%)`} value={fmt(result.inps_datore)} />
                <Row label={`INAIL (${(result.aliquota_inail * 100).toFixed(1)}%)`} value={fmt(result.inail)} />
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
                <Row label="- IRPEF (scaglioni)" value={fmt(result.irpef)} negative />
                <Row label={`- Addizionali (~${(result.aliquota_addizionali * 100).toFixed(1)}%)`} value={fmt(result.addizionali)} negative />
                <div className="border-t border-green-500/30 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-green-400 font-bold">NETTO ANNUO</span>
                    <span className="text-green-400 font-bold text-lg">€{fmt(result.netto_annuo)}</span>
                  </div>
                  <Row label={`Netto mensile (${result.mensilita} mensilità)`} value={fmt(result.netto_mensile)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Riepilogo */}
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <h3 className="text-white font-bold mb-3">📊 Riepilogo</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <p className="text-slate-400 text-xs">Cuneo fiscale</p>
                  <p className="text-yellow-400 font-bold text-lg">{((1 - result.netto_annuo / result.costo_totale_annuo) * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <p className="text-slate-400 text-xs">Costo / Netto</p>
                  <p className="text-white font-bold text-lg">{(result.costo_totale_annuo / result.netto_annuo).toFixed(2)}x</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fonti normative */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-3">
              <p className="text-slate-500 text-xs mb-2">📚 Anno normativo: {result.anno} — Fonti utilizzate:</p>
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
              Calcolo deterministico su tabelle normative {result.anno}. Non tiene conto di detrazioni specifiche, bonus, assegni familiari o CCNL specifici.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold, negative }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={`${bold ? 'font-semibold text-white' : ''} ${negative ? 'text-red-300' : 'text-white'}`}>
        {negative ? '-' : ''}€{value}
      </span>
    </div>
  );
}