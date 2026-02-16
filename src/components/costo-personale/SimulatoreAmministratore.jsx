import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Info, Loader2, AlertTriangle } from 'lucide-react';
import { useTabelleContributive, calcolaCostoAmministratore } from './useTabelleContributive';
import RisultatoAmministratore from './RisultatoAmministratore';
import VerificaTabelleNormative from './VerificaTabelleNormative';

const GESTIONI = [
  { key: 'gestione_separata', label: 'Gestione Separata INPS', desc: 'Collaboratori/amministratori senza altra copertura — aliq. 35,03% (2/3 SRL, 1/3 amm.)' },
  { key: 'commercianti', label: 'Gestione Commercianti INPS', desc: 'Socio-amministratore iscritto alla gestione Commercianti — minimale + eccedenza' },
  { key: 'artigiani', label: 'Gestione Artigiani INPS', desc: 'Socio-amministratore iscritto alla gestione Artigiani — minimale + eccedenza' },
  { key: 'nessuna', label: 'Nessuna iscrizione previdenziale', desc: 'Amministratore non socio, con altra copertura obbligatoria prevalente' },
];

export default function SimulatoreAmministratore() {
  const tab = useTabelleContributive(2026);
  const [form, setForm] = useState({
    compenso_lordo: '',
    tipo_rapporto: 'gestione_separata',
    inail_applicabile: false,
  });
  const [result, setResult] = useState(null);

  // Carica dati ContributiINPS per commercianti/artigiani
  const { data: contributiINPS, isLoading: loadingContributi } = useQuery({
    queryKey: ['contributi-inps', 2026],
    queryFn: () => base44.entities.ContributiINPS.filter({ anno: 2026 }),
    initialData: [],
  });

  const selectedGestione = GESTIONI.find(g => g.key === form.tipo_rapporto);

  const calcola = () => {
    const compenso = parseFloat(form.compenso_lordo);
    if (!compenso || compenso <= 0 || tab.isLoading) return;

    const res = calcolaCostoAmministratore({
      compenso,
      tipo_rapporto: form.tipo_rapporto,
      inail_applicabile: form.inail_applicabile,
      contributiINPS,
    }, tab);

    setResult(res);
  };

  if (tab.isLoading || loadingContributi) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6 flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
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
          <span className="text-red-400 text-sm">Tabelle contributive {tab.anno} non disponibili.</span>
        </CardContent>
      </Card>
    );
  }

  if (result) {
    return (
      <RisultatoAmministratore
        result={result}
        onReset={() => setResult(null)}
      />
    );
  }

  return (
    <VerificaTabelleNormative>
    <div className="space-y-4">
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-400" />
            Compenso Amministratore SRL
          </h3>

          <div>
            <label className="text-slate-400 text-sm mb-1 block">Compenso annuo lordo *</label>
            <Input type="number" placeholder="Es. 40000" value={form.compenso_lordo} onChange={(e) => setForm({ ...form, compenso_lordo: e.target.value })} className="bg-slate-900 border-slate-700 text-white" />
          </div>

          <div>
            <label className="text-slate-400 text-sm mb-1 block">Iscrizione previdenziale *</label>
            <Select value={form.tipo_rapporto} onValueChange={(v) => setForm({ ...form, tipo_rapporto: v })}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {GESTIONI.map(g => (
                  <SelectItem key={g.key} value={g.key}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedGestione && (
              <p className="text-slate-500 text-xs mt-1">{selectedGestione.desc}</p>
            )}
          </div>

          {/* Info Commercianti/Artigiani da entity */}
          {(form.tipo_rapporto === 'commercianti' || form.tipo_rapporto === 'artigiani') && (
            <GestioneInfoCard tipo={form.tipo_rapporto} contributiINPS={contributiINPS} />
          )}

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
    </div>
    </VerificaTabelleNormative>
  );
}

function GestioneInfoCard({ tipo, contributiINPS }) {
  const gestKey = tipo === 'commercianti' ? 'Commercianti' : 'Artigiani';
  const dati = contributiINPS?.find(c => c.gestione === gestKey);
  if (!dati) return null;

  const fmt = (n) => n?.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '—';

  return (
    <Card className="bg-slate-700/50 border-slate-600">
      <CardContent className="p-3 space-y-1">
        <p className="text-indigo-400 text-xs font-semibold">Parametri {gestKey} 2026 (da entity)</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><span className="text-slate-400">Aliquota:</span> <span className="text-white font-semibold">{(dati.aliquota_percentuale * 100).toFixed(2)}%</span></div>
          <div><span className="text-slate-400">Minimale:</span> <span className="text-white font-semibold">€{fmt(dati.minimale_annuo)}</span></div>
          <div><span className="text-slate-400">Contributo fisso:</span> <span className="text-white font-semibold">€{fmt(dati.contributo_fisso_annuo)}</span></div>
          <div><span className="text-slate-400">Massimale:</span> <span className="text-white font-semibold">€{fmt(dati.massimale_reddito)}</span></div>
        </div>
        <p className="text-slate-500 text-[10px] mt-1">Fonte: Circ. INPS Artigiani e Commercianti 2026</p>
      </CardContent>
    </Card>
  );
}