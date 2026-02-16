import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Info } from 'lucide-react';

const LIVELLI_CCNL = [
  { label: 'Operaio generico', aliquota_inps: 0.2981, aliquota_inail: 0.035 },
  { label: 'Operaio qualificato', aliquota_inps: 0.2981, aliquota_inail: 0.030 },
  { label: 'Impiegato', aliquota_inps: 0.2981, aliquota_inail: 0.004 },
  { label: 'Quadro', aliquota_inps: 0.2981, aliquota_inail: 0.004 },
  { label: 'Dirigente', aliquota_inps: 0.2981, aliquota_inail: 0.004 },
];

export default function SimulatoreDipendente() {
  const [form, setForm] = useState({
    ral: '',
    livello: '',
    mensilita: '14',
    tfr_fondo: 'azienda',
  });
  const [result, setResult] = useState(null);

  const calcola = () => {
    const ral = parseFloat(form.ral);
    if (!ral || ral <= 0 || !form.livello) return;

    const livello = LIVELLI_CCNL.find(l => l.label === form.livello);
    if (!livello) return;

    const mensilita = parseInt(form.mensilita);

    // --- Contributi INPS datore ---
    const inps_datore = ral * livello.aliquota_inps;

    // --- INAIL ---
    const inail = ral * livello.aliquota_inail;

    // --- TFR ---
    // TFR annuo = RAL / 13.5
    const tfr_annuo = ral / 13.5;

    // --- Contributo TFR a fondo pensione (se scelto) ---
    // Se TFR va a fondo esterno, il datore paga contributo 0.20% al fondo di garanzia INPS
    const tfr_fondo_garanzia = form.tfr_fondo === 'fondo' ? ral * 0.002 : 0;

    // --- Costo totale annuo per il datore ---
    const costo_totale_annuo = ral + inps_datore + inail + tfr_annuo + tfr_fondo_garanzia;

    // --- Netto dipendente (stima) ---
    // Contributi INPS dipendente ~9.19%
    const inps_dipendente = ral * 0.0919;
    const imponibile_irpef = ral - inps_dipendente;

    // Scaglioni IRPEF 2025
    let irpef = 0;
    if (imponibile_irpef <= 28000) {
      irpef = imponibile_irpef * 0.23;
    } else if (imponibile_irpef <= 50000) {
      irpef = 28000 * 0.23 + (imponibile_irpef - 28000) * 0.35;
    } else {
      irpef = 28000 * 0.23 + 22000 * 0.35 + (imponibile_irpef - 50000) * 0.43;
    }

    // Addizionali regionali e comunali (stima media)
    const addizionali = imponibile_irpef * 0.025;

    const netto_annuo = ral - inps_dipendente - irpef - addizionali;
    const netto_mensile = netto_annuo / mensilita;
    const costo_mensile_datore = costo_totale_annuo / 12;

    setResult({
      ral,
      inps_datore,
      inail,
      tfr_annuo,
      tfr_fondo_garanzia,
      costo_totale_annuo,
      costo_mensile_datore,
      inps_dipendente,
      irpef,
      addizionali,
      netto_annuo,
      netto_mensile,
      mensilita,
      livello: form.livello,
      aliquota_inps_datore: livello.aliquota_inps,
      aliquota_inail: livello.aliquota_inail,
    });
  };

  const fmt = (n) => n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
            <Input
              type="number"
              placeholder="Es. 25000"
              value={form.ral}
              onChange={(e) => setForm({ ...form, ral: e.target.value })}
              className="bg-slate-900 border-slate-700 text-white"
            />
          </div>

          <div>
            <label className="text-slate-400 text-sm mb-1 block">Qualifica / Livello *</label>
            <Select value={form.livello} onValueChange={(v) => setForm({ ...form, livello: v })}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                <SelectValue placeholder="Seleziona qualifica" />
              </SelectTrigger>
              <SelectContent>
                {LIVELLI_CCNL.map(l => (
                  <SelectItem key={l.label} value={l.label}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-sm mb-1 block">Mensilità</label>
              <Select value={form.mensilita} onValueChange={(v) => setForm({ ...form, mensilita: v })}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="13">13 mensilità</SelectItem>
                  <SelectItem value="14">14 mensilità</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-slate-400 text-sm mb-1 block">TFR destinazione</label>
              <Select value={form.tfr_fondo} onValueChange={(v) => setForm({ ...form, tfr_fondo: v })}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="azienda">In azienda</SelectItem>
                  <SelectItem value="fondo">Fondo pensione</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={calcola}
            disabled={!form.ral || !form.livello}
            className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 font-bold"
          >
            <Calculator className="w-4 h-4 mr-2" />
            Calcola Costo
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          {/* Costo Datore */}
          <Card className="bg-gradient-to-br from-red-500/20 to-orange-500/10 border-red-500/30">
            <CardContent className="p-4">
              <h3 className="text-red-400 font-bold mb-3">💰 Costo per il Datore di Lavoro</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">RAL</span>
                  <span className="text-white font-semibold">€{fmt(result.ral)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Contributi INPS datore ({(result.aliquota_inps_datore * 100).toFixed(2)}%)</span>
                  <span className="text-white">€{fmt(result.inps_datore)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">INAIL ({(result.aliquota_inail * 100).toFixed(1)}%)</span>
                  <span className="text-white">€{fmt(result.inail)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">TFR (RAL / 13,5)</span>
                  <span className="text-white">€{fmt(result.tfr_annuo)}</span>
                </div>
                {result.tfr_fondo_garanzia > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fondo garanzia TFR (0,20%)</span>
                    <span className="text-white">€{fmt(result.tfr_fondo_garanzia)}</span>
                  </div>
                )}
                <div className="border-t border-red-500/30 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-red-400 font-bold">COSTO TOTALE ANNUO</span>
                    <span className="text-red-400 font-bold text-lg">€{fmt(result.costo_totale_annuo)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-slate-400">Costo mensile (su 12 mesi)</span>
                    <span className="text-white font-semibold">€{fmt(result.costo_mensile_datore)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Netto Dipendente */}
          <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-green-500/30">
            <CardContent className="p-4">
              <h3 className="text-green-400 font-bold mb-3">🧾 Netto Stimato Dipendente</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">RAL</span>
                  <span className="text-white">€{fmt(result.ral)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">- Contributi INPS dipendente (9,19%)</span>
                  <span className="text-red-300">-€{fmt(result.inps_dipendente)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">- IRPEF (scaglioni 2025)</span>
                  <span className="text-red-300">-€{fmt(result.irpef)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">- Addizionali reg./com. (~2,5%)</span>
                  <span className="text-red-300">-€{fmt(result.addizionali)}</span>
                </div>
                <div className="border-t border-green-500/30 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-green-400 font-bold">NETTO ANNUO</span>
                    <span className="text-green-400 font-bold text-lg">€{fmt(result.netto_annuo)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-slate-400">Netto mensile ({result.mensilita} mensilità)</span>
                    <span className="text-white font-semibold">€{fmt(result.netto_mensile)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Riepilogo rapido */}
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <h3 className="text-white font-bold mb-3">📊 Riepilogo</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <p className="text-slate-400 text-xs">Cuneo fiscale</p>
                  <p className="text-yellow-400 font-bold text-lg">
                    {((1 - result.netto_annuo / result.costo_totale_annuo) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <p className="text-slate-400 text-xs">Costo / Netto</p>
                  <p className="text-white font-bold text-lg">
                    {(result.costo_totale_annuo / result.netto_annuo).toFixed(2)}x
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-start gap-2 bg-slate-800/50 rounded-lg p-3">
            <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <p className="text-slate-500 text-xs">
              Calcolo indicativo basato su aliquote 2025. Non tiene conto di detrazioni specifiche, bonus, assegni familiari o CCNL specifici. Per un calcolo esatto consultare il commercialista.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}