import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Info, Loader2, AlertTriangle } from 'lucide-react';
import { useTabelleContributive, calcolaCostoAmministratore } from './useTabelleContributive';

export default function SimulatoreAmministratore() {
  const tab = useTabelleContributive(2026);
  const [form, setForm] = useState({
    compenso_lordo: '',
    tipo_rapporto: 'gestione_separata',
    inail_applicabile: false,
  });
  const [result, setResult] = useState(null);

  const calcola = () => {
    const compenso = parseFloat(form.compenso_lordo);
    if (!compenso || compenso <= 0 || tab.isLoading) return;

    const res = calcolaCostoAmministratore({
      compenso,
      tipo_rapporto: form.tipo_rapporto,
      inail_applicabile: form.inail_applicabile,
    }, tab);

    setResult(res);
  };

  const fmt = (n) => n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (tab.isLoading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6 flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
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
            <Calculator className="w-5 h-5 text-indigo-400" />
            Compenso Amministratore
          </h3>

          <div>
            <label className="text-slate-400 text-sm mb-1 block">Compenso lordo annuo *</label>
            <Input type="number" placeholder="Es. 40000" value={form.compenso_lordo} onChange={(e) => setForm({ ...form, compenso_lordo: e.target.value })} className="bg-slate-900 border-slate-700 text-white" />
          </div>

          <div>
            <label className="text-slate-400 text-sm mb-1 block">Tipo rapporto previdenziale *</label>
            <Select value={form.tipo_rapporto} onValueChange={(v) => setForm({ ...form, tipo_rapporto: v })}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gestione_separata">Gestione Separata INPS</SelectItem>
                <SelectItem value="dipendente">Come dipendente (già iscritto altra gestione)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-slate-400 text-sm mb-1 block">INAIL applicabile?</label>
            <Select value={form.inail_applicabile ? 'si' : 'no'} onValueChange={(v) => setForm({ ...form, inail_applicabile: v === 'si' })}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="si">Sì</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={calcola} disabled={!form.compenso_lordo} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold">
            <Calculator className="w-4 h-4 mr-2" />
            Calcola Costo
          </Button>
        </CardContent>
      </Card>

      {result === null ? null : !result ? (
        <Card className="bg-red-500/20 border-red-500/50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-red-400 text-sm">Tabelle incomplete per il tipo selezionato. Verificare i dati normativi.</span>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Costo per la SRL */}
          <Card className="bg-gradient-to-br from-red-500/20 to-orange-500/10 border-red-500/30">
            <CardContent className="p-4">
              <h3 className="text-red-400 font-bold mb-3">🏢 Costo per la SRL</h3>
              <div className="space-y-2 text-sm">
                <Row label="Compenso lordo" value={fmt(result.compenso)} bold />
                <Row label={`Contributi INPS datore (${(result.aliquota_datore * 100).toFixed(2)}%)`} value={fmt(result.inps_datore)} />
                {result.inail > 0 && <Row label={`INAIL (${(result.aliquota_inail * 100).toFixed(1)}%)`} value={fmt(result.inail)} />}
                {result.tfr > 0 && <Row label="TFR" value={fmt(result.tfr)} />}
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
                <Row label="Deducibile IRES (compenso + INPS datore)" value={fmt(result.deducibile_ires)} />
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
                <Row label="Compenso lordo" value={fmt(result.compenso)} />
                <Row label={`- INPS amministratore (${(result.aliquota_amm * 100).toFixed(2)}%)`} value={fmt(result.inps_amministratore)} negative />
                <Row label="- IRPEF (scaglioni)" value={fmt(result.irpef)} negative />
                <Row label={`- Addizionali (~${(result.aliquota_addizionali * 100).toFixed(1)}%)`} value={fmt(result.addizionali)} negative />
                <div className="border-t border-green-500/30 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-green-400 font-bold">NETTO ANNUO</span>
                    <span className="text-green-400 font-bold text-lg">€{fmt(result.netto_amministratore)}</span>
                  </div>
                  <Row label="Netto mensile (su 12 mesi)" value={fmt(result.netto_amministratore / 12)} />
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
                  <p className="text-yellow-400 font-bold text-lg">{((1 - result.netto_amministratore / result.costo_totale_srl) * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <p className="text-slate-400 text-xs">Gestione</p>
                  <p className="text-white font-bold text-sm">{result.label_gestione}</p>
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
              Calcolo deterministico su tabelle normative {result.anno}. L'aliquota IRAP varia per regione. Non tiene conto di detrazioni specifiche.
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