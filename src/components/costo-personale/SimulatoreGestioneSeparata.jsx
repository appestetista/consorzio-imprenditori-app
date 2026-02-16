import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Loader2, AlertTriangle, Info } from 'lucide-react';
import { useTabelleContributive, calcolaCostoGestioneSeparata } from './useTabelleContributive';
import VerificaTabelleNormative from './VerificaTabelleNormative';
import RisultatoGestioneSeparata from './RisultatoGestioneSeparata';

export default function SimulatoreGestioneSeparata() {
  const tab = useTabelleContributive(2026);
  const [form, setForm] = useState({
    compenso: '',
    ha_altra_copertura: false,
  });
  const [result, setResult] = useState(null);

  const calcola = () => {
    const compenso = parseFloat(form.compenso);
    if (!compenso || compenso <= 0 || tab.isLoading) return;

    const res = calcolaCostoGestioneSeparata({
      compenso,
      ha_altra_copertura: form.ha_altra_copertura,
    }, tab);

    setResult(res);
  };

  if (tab.isLoading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6 flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
          <span className="text-slate-400 text-sm">Caricamento tabelle normative 2026...</span>
        </CardContent>
      </Card>
    );
  }

  if (tab.error || !tab.tabelle || Object.keys(tab.tabelle).length === 0) {
    return (
      <Card className="bg-red-500/20 border-red-500/50">
        <CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span className="text-red-400 text-sm">Tabelle contributive 2026 non disponibili.</span>
        </CardContent>
      </Card>
    );
  }

  if (result) {
    return <RisultatoGestioneSeparata result={result} onReset={() => setResult(null)} />;
  }

  return (
    <VerificaTabelleNormative>
      <div className="space-y-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4 space-y-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Calculator className="w-5 h-5 text-cyan-400" />
              Gestione Separata INPS
            </h3>

            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
              <p className="text-cyan-400 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                Per collaboratori coordinati e continuativi (co.co.co.), collaboratori occasionali strutturati, amministratori senza altra copertura, e professionisti senza cassa.
              </p>
            </div>

            <div>
              <label className="text-slate-400 text-sm mb-1 block">Compenso annuo lordo *</label>
              <Input type="number" placeholder="Es. 30000" value={form.compenso} onChange={(e) => setForm({ ...form, compenso: e.target.value })} className="bg-slate-900 border-slate-700 text-white" />
            </div>

            <div>
              <label className="text-slate-400 text-sm mb-1 block">Ha altra copertura previdenziale obbligatoria?</label>
              <Select value={form.ha_altra_copertura ? 'si' : 'no'} onValueChange={(v) => setForm({ ...form, ha_altra_copertura: v === 'si' })}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No — Aliquota piena ({tab.get('inps_gestione_separata_totale') ? (tab.get('inps_gestione_separata_totale') * 100).toFixed(2) : '35.03'}%)</SelectItem>
                  <SelectItem value="si">Sì — Aliquota ridotta ({tab.get('inps_gestione_separata_totale') ? (tab.get('inps_gestione_separata_totale') * 0.75 * 100).toFixed(2) : '26.07'}%)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-slate-500 text-xs mt-1">
                {form.ha_altra_copertura
                  ? 'Iscritto ad altra gestione obbligatoria (es. dipendente con altra posizione INPS) → aliquota ridotta al 75%.'
                  : 'Nessuna altra copertura → aliquota piena. Contributo ripartito 2/3 committente, 1/3 collaboratore.'
                }
              </p>
            </div>

            <Button onClick={calcola} disabled={!form.compenso} className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold">
              <Calculator className="w-4 h-4 mr-2" />
              Calcola Costo
            </Button>
          </CardContent>
        </Card>
      </div>
    </VerificaTabelleNormative>
  );
}