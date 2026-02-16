import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Loader2, AlertTriangle } from 'lucide-react';
import { useTabelleContributive, calcolaCostoSocioLavoratore } from './useTabelleContributive';
import VerificaTabelleNormative from './VerificaTabelleNormative';
import RisultatoSocioLavoratore from './RisultatoSocioLavoratore';

const GESTIONI = [
  { key: 'dipendente_coop', label: 'Dipendente Cooperativa', desc: 'Socio inquadrato come dipendente della cooperativa — contributi INPS standard datore + lavoratore' },
  { key: 'commercianti', label: 'Gestione Commercianti', desc: 'Socio lavoratore iscritto alla gestione Commercianti — minimale + eccedenza' },
  { key: 'artigiani', label: 'Gestione Artigiani', desc: 'Socio lavoratore iscritto alla gestione Artigiani — minimale + eccedenza' },
];

export default function SimulatoreSocioLavoratore() {
  const tab = useTabelleContributive(2026);
  const [form, setForm] = useState({
    compenso: '',
    gestione_inps: 'dipendente_coop',
    inail_applicabile: true,
  });
  const [result, setResult] = useState(null);

  const { data: contributiINPS, isLoading: loadingContributi } = useQuery({
    queryKey: ['contributi-inps', 2026],
    queryFn: () => base44.entities.ContributiINPS.filter({ anno: 2026 }),
    initialData: [],
  });

  const selectedGestione = GESTIONI.find(g => g.key === form.gestione_inps);

  const calcola = () => {
    const compenso = parseFloat(form.compenso);
    if (!compenso || compenso <= 0 || tab.isLoading) return;

    const res = calcolaCostoSocioLavoratore({
      compenso,
      gestione_inps: form.gestione_inps,
      inail_applicabile: form.inail_applicabile,
      contributiINPS,
    }, tab);

    setResult(res);
  };

  if (tab.isLoading || loadingContributi) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6 flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
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
    return <RisultatoSocioLavoratore result={result} onReset={() => setResult(null)} />;
  }

  return (
    <VerificaTabelleNormative>
      <div className="space-y-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4 space-y-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Calculator className="w-5 h-5 text-amber-400" />
              Socio Lavoratore
            </h3>

            <div>
              <label className="text-slate-400 text-sm mb-1 block">Compenso / Retribuzione annua lorda *</label>
              <Input type="number" placeholder="Es. 25000" value={form.compenso} onChange={(e) => setForm({ ...form, compenso: e.target.value })} className="bg-slate-900 border-slate-700 text-white" />
            </div>

            <div>
              <label className="text-slate-400 text-sm mb-1 block">Inquadramento previdenziale *</label>
              <Select value={form.gestione_inps} onValueChange={(v) => setForm({ ...form, gestione_inps: v })}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GESTIONI.map(g => <SelectItem key={g.key} value={g.key}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedGestione && <p className="text-slate-500 text-xs mt-1">{selectedGestione.desc}</p>}
            </div>

            <div>
              <label className="text-slate-400 text-sm mb-1 block">INAIL applicabile?</label>
              <Select value={form.inail_applicabile ? 'si' : 'no'} onValueChange={(v) => setForm({ ...form, inail_applicabile: v === 'si' })}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="si">Sì</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={calcola} disabled={!form.compenso} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold">
              <Calculator className="w-4 h-4 mr-2" />
              Calcola Costo
            </Button>
          </CardContent>
        </Card>
      </div>
    </VerificaTabelleNormative>
  );
}