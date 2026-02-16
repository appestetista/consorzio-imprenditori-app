import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Info } from 'lucide-react';

export default function SimulatoreAmministratore() {
  const [form, setForm] = useState({
    compenso_lordo: '',
    tipo_rapporto: 'gestione_separata', // gestione_separata | co.co.co | dipendente
    inail_applicabile: 'no',
  });
  const [result, setResult] = useState(null);

  const calcola = () => {
    const compenso = parseFloat(form.compenso_lordo);
    if (!compenso || compenso <= 0) return;

    let inps_datore = 0;
    let inps_amministratore = 0;
    let aliquota_inps_totale = 0;
    let aliquota_datore = 0;
    let aliquota_amm = 0;
    let label_gestione = '';

    if (form.tipo_rapporto === 'gestione_separata') {
      // Gestione Separata INPS 2025
      // Aliquota totale: 33.72% (di cui 2/3 datore, 1/3 amministratore)
      aliquota_inps_totale = 0.3372;
      aliquota_datore = aliquota_inps_totale * (2 / 3);
      aliquota_amm = aliquota_inps_totale * (1 / 3);
      inps_datore = compenso * aliquota_datore;
      inps_amministratore = compenso * aliquota_amm;
      label_gestione = 'Gestione Separata INPS';
    } else if (form.tipo_rapporto === 'dipendente') {
      // Come dipendente subordinato
      aliquota_datore = 0.2981;
      aliquota_amm = 0.0919;
      inps_datore = compenso * aliquota_datore;
      inps_amministratore = compenso * aliquota_amm;
      label_gestione = 'INPS come dipendente';
    }

    // INAIL (se applicabile)
    const inail = form.inail_applicabile === 'si' ? compenso * 0.004 : 0;

    // TFR non si applica all'amministratore in gestione separata
    const tfr = form.tipo_rapporto === 'dipendente' ? compenso / 13.5 : 0;

    // Costo totale per la SRL
    const costo_totale_srl = compenso + inps_datore + inail + tfr;

    // Deducibilità IRES/IRAP: il compenso + contributi datore sono deducibili
    const deducibile_ires = compenso + inps_datore;
    const risparmio_ires = deducibile_ires * 0.24; // IRES 24%
    const deducibile_irap = compenso; // Solo compenso è deducibile IRAP (contributi esclusi)
    const risparmio_irap = deducibile_irap * 0.039; // IRAP media ~3.9%

    // Costo netto per la SRL (dopo risparmio fiscale)
    const costo_netto_srl = costo_totale_srl - risparmio_ires - risparmio_irap;

    // Netto in tasca all'amministratore
    const imponibile_irpef = compenso - inps_amministratore;

    // IRPEF 2025
    let irpef = 0;
    if (imponibile_irpef <= 28000) {
      irpef = imponibile_irpef * 0.23;
    } else if (imponibile_irpef <= 50000) {
      irpef = 28000 * 0.23 + (imponibile_irpef - 28000) * 0.35;
    } else {
      irpef = 28000 * 0.23 + 22000 * 0.35 + (imponibile_irpef - 50000) * 0.43;
    }

    const addizionali = imponibile_irpef * 0.025;
    const netto_amministratore = compenso - inps_amministratore - irpef - addizionali;

    setResult({
      compenso,
      tipo_rapporto: form.tipo_rapporto,
      label_gestione,
      inps_datore,
      inps_amministratore,
      aliquota_datore,
      aliquota_amm,
      aliquota_inps_totale,
      inail,
      tfr,
      costo_totale_srl,
      deducibile_ires,
      risparmio_ires,
      deducibile_irap,
      risparmio_irap,
      costo_netto_srl,
      irpef,
      addizionali,
      netto_amministratore,
    });
  };

  const fmt = (n) => n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-4">
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-400" />
            Compenso Amministratore
          </h3>

          <div>
            <label className="text-slate-400 text-sm mb-1 block">Compenso lordo annuo *</label>
            <Input
              type="number"
              placeholder="Es. 40000"
              value={form.compenso_lordo}
              onChange={(e) => setForm({ ...form, compenso_lordo: e.target.value })}
              className="bg-slate-900 border-slate-700 text-white"
            />
          </div>

          <div>
            <label className="text-slate-400 text-sm mb-1 block">Tipo rapporto previdenziale *</label>
            <Select value={form.tipo_rapporto} onValueChange={(v) => setForm({ ...form, tipo_rapporto: v })}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gestione_separata">Gestione Separata INPS (33,72%)</SelectItem>
                <SelectItem value="dipendente">Come dipendente (già iscritto altra gestione)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-slate-400 text-sm mb-1 block">INAIL applicabile?</label>
            <Select value={form.inail_applicabile} onValueChange={(v) => setForm({ ...form, inail_applicabile: v })}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="si">Sì (0,4%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={calcola}
            disabled={!form.compenso_lordo}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold"
          >
            <Calculator className="w-4 h-4 mr-2" />
            Calcola Costo
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          {/* Costo per la SRL */}
          <Card className="bg-gradient-to-br from-red-500/20 to-orange-500/10 border-red-500/30">
            <CardContent className="p-4">
              <h3 className="text-red-400 font-bold mb-3">🏢 Costo per la SRL</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Compenso lordo</span>
                  <span className="text-white font-semibold">€{fmt(result.compenso)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Contributi INPS datore ({(result.aliquota_datore * 100).toFixed(2)}%)</span>
                  <span className="text-white">€{fmt(result.inps_datore)}</span>
                </div>
                {result.inail > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">INAIL (0,4%)</span>
                    <span className="text-white">€{fmt(result.inail)}</span>
                  </div>
                )}
                {result.tfr > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">TFR</span>
                    <span className="text-white">€{fmt(result.tfr)}</span>
                  </div>
                )}
                <div className="border-t border-red-500/30 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-red-400 font-bold">COSTO TOTALE SRL</span>
                    <span className="text-red-400 font-bold text-lg">€{fmt(result.costo_totale_srl)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-slate-400">Costo mensile (su 12 mesi)</span>
                    <span className="text-white font-semibold">€{fmt(result.costo_totale_srl / 12)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risparmio Fiscale SRL */}
          <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border-blue-500/30">
            <CardContent className="p-4">
              <h3 className="text-blue-400 font-bold mb-3">📉 Risparmio Fiscale SRL</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Deducibile IRES (compenso + INPS datore)</span>
                  <span className="text-white">€{fmt(result.deducibile_ires)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">→ Risparmio IRES (24%)</span>
                  <span className="text-green-400">-€{fmt(result.risparmio_ires)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Deducibile IRAP (solo compenso)</span>
                  <span className="text-white">€{fmt(result.deducibile_irap)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">→ Risparmio IRAP (~3,9%)</span>
                  <span className="text-green-400">-€{fmt(result.risparmio_irap)}</span>
                </div>
                <div className="border-t border-blue-500/30 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-blue-400 font-bold">COSTO NETTO SRL</span>
                    <span className="text-blue-400 font-bold text-lg">€{fmt(result.costo_netto_srl)}</span>
                  </div>
                  <p className="text-slate-500 text-xs mt-1">Costo totale meno risparmio fiscale derivante dalla deducibilità</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Netto Amministratore */}
          <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-green-500/30">
            <CardContent className="p-4">
              <h3 className="text-green-400 font-bold mb-3">🧾 Netto Amministratore</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Compenso lordo</span>
                  <span className="text-white">€{fmt(result.compenso)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">- INPS amministratore ({(result.aliquota_amm * 100).toFixed(2)}%)</span>
                  <span className="text-red-300">-€{fmt(result.inps_amministratore)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">- IRPEF (scaglioni 2025)</span>
                  <span className="text-red-300">-€{fmt(result.irpef)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">- Addizionali (~2,5%)</span>
                  <span className="text-red-300">-€{fmt(result.addizionali)}</span>
                </div>
                <div className="border-t border-green-500/30 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-green-400 font-bold">NETTO ANNUO</span>
                    <span className="text-green-400 font-bold text-lg">€{fmt(result.netto_amministratore)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-slate-400">Netto mensile (su 12 mesi)</span>
                    <span className="text-white font-semibold">€{fmt(result.netto_amministratore / 12)}</span>
                  </div>
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
                  <p className="text-yellow-400 font-bold text-lg">
                    {((1 - result.netto_amministratore / result.costo_totale_srl) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <p className="text-slate-400 text-xs">Gestione</p>
                  <p className="text-white font-bold text-sm">{result.label_gestione}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-start gap-2 bg-slate-800/50 rounded-lg p-3">
            <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <p className="text-slate-500 text-xs">
              Calcolo indicativo. L'aliquota IRAP varia per regione. Non tiene conto di detrazioni specifiche. Per un calcolo esatto consultare il commercialista.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}