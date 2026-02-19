import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Info, Loader2, AlertTriangle, ChevronRight, ChevronLeft, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTabelleContributive, calcolaCostoDipendente } from './useTabelleContributive';
import { useCCNL, REGIONI, getQualificaINAIL } from './useCCNL';
import RisultatoDipendente from './RisultatoDipendente';
import ProfiloLavoratoreForm from './ProfiloLavoratoreForm';
import VerificaTabelleNormative from './VerificaTabelleNormative';
import StepIdentificazioneCCNL from './StepIdentificazioneCCNL';

const TIPI_CONTRATTO = [
  { key: 'indeterminato_fulltime', label: 'Tempo indeterminato — Full-time' },
  { key: 'indeterminato_parttime', label: 'Tempo indeterminato — Part-time' },
  { key: 'determinato_fulltime', label: 'Tempo determinato — Full-time' },
  { key: 'determinato_parttime', label: 'Tempo determinato — Part-time' },
  { key: 'apprendistato', label: 'Apprendistato professionalizzante' },
];

export default function SimulatoreDipendente() {
  const tab = useTabelleContributive(2026);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    ccnl: '',
    livello: '',
    tipo_contratto: '',
    ral: '',
    retribuzione_mensile: '',
    input_mode: 'ral', // 'ral' | 'mensile'
    regione: '',
    tfr_destinazione: 'azienda',
    percentuale_parttime: '50',
  });
  const [profiloLavoratore, setProfiloLavoratore] = useState({
    eta: '',
    donna_disoccupata: false,
    percettore_naspi: false,
  });
  const [result, setResult] = useState(null);

  const { livelli, isLoading: loadingCCNL } = useCCNL(form.ccnl, 2026);

  const selectedLivello = useMemo(() => {
    return livelli.find(l => l.livello === form.livello);
  }, [livelli, form.livello]);

  const tipiContrattoFiltrati = useMemo(() => {
    if (!selectedLivello) return TIPI_CONTRATTO;
    return TIPI_CONTRATTO.filter(tc => {
      if (tc.key === 'apprendistato') return selectedLivello.apprendistato_previsto;
      return true;
    });
  }, [selectedLivello]);

  const canNext = (s) => {
    switch (s) {
      case 1: return !!form.ccnl; // gestito internamente da StepIdentificazioneCCNL
      case 2: return !!form.livello;
      case 3: return !!form.tipo_contratto;
      case 4: return form.input_mode === 'ral' ? !!form.ral && parseFloat(form.ral) > 0 : !!form.retribuzione_mensile && parseFloat(form.retribuzione_mensile) > 0;
      case 5: return !!form.regione;
      default: return false;
    }
  };

  const handleCCNLComplete = (ccnlKey) => {
    setForm({ ...form, ccnl: ccnlKey, livello: '' });
    setStep(2);
  };

  const calcola = () => {
    let ral;
    if (form.input_mode === 'ral') {
      ral = parseFloat(form.ral);
    } else {
      const mensile = parseFloat(form.retribuzione_mensile);
      const men = selectedLivello?.mensilita || 14;
      ral = mensile * men;
    }

    // Part-time: la RAL è già ridotta dall'utente, ma se serve avvertimento
    const isPartTime = form.tipo_contratto.includes('parttime');
    if (isPartTime) {
      const pct = parseFloat(form.percentuale_parttime) / 100;
      ral = ral * pct;
    }

    const qualifica = getQualificaINAIL(form.ccnl, form.livello);
    const mensilita = selectedLivello?.mensilita || 14;

    const res = calcolaCostoDipendente({
      ral,
      qualifica,
      mensilita,
      tfr_destinazione: form.tfr_destinazione,
    }, tab);

    if (res) {
      res.ccnl = form.ccnl;
      res.livello = form.livello;
      res.tipo_contratto = form.tipo_contratto;
      res.regione = form.regione;
      res.fonte_ccnl = selectedLivello?.fonte_normativa || '';
      res.data_decorrenza = selectedLivello?.data_decorrenza || '';
      res.minimo_tabellare = selectedLivello?.minimo_tabellare_mensile || 0;
      res.isPartTime = isPartTime;
      res.percentuale_parttime = isPartTime ? form.percentuale_parttime : '100';
    }

    setResult(res);
    setStep(6);
  };

  const fmt = (n) => n?.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00';

  if (tab.isLoading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6 flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-lime-400" />
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
          <span className="text-red-400 text-sm">Tabelle contributive 2026 non disponibili. Contattare l'amministratore.</span>
        </CardContent>
      </Card>
    );
  }

  if (step === 6 && result) {
    return (
      <RisultatoDipendente
        result={result}
        profiloLavoratore={profiloLavoratore}
        onReset={() => { setResult(null); setStep(1); setForm({ ccnl: '', livello: '', tipo_contratto: '', ral: '', retribuzione_mensile: '', input_mode: 'ral', regione: '', tfr_destinazione: 'azienda', percentuale_parttime: '50' }); setProfiloLavoratore({ eta: '', donna_disoccupata: false, percettore_naspi: false }); }}
      />
    );
  }

  return (
    <VerificaTabelleNormative>
    <TooltipProvider>
      <div className="space-y-4">
        {/* Step indicator */}
        <div className="flex items-center gap-1 px-1">
          {[1, 2, 3, 4, 5, 5.5].map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${s <= step ? 'bg-lime-400' : 'bg-slate-700'}`} />
          ))}
        </div>

        {/* STEP 1 — Identificazione CCNL (5 sotto-step) */}
        {step === 1 && (
          <StepIdentificazioneCCNL
            onComplete={handleCCNLComplete}
            onBack={null}
          />
        )}

        {/* STEP 2 — Livello */}
        {step === 2 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-white font-semibold">Step 2 — Livello ({form.ccnl})</h3>
              {loadingCCNL ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Caricamento livelli...</div>
              ) : livelli.length === 0 ? (
                <p className="text-slate-400 text-sm">Nessun livello trovato per {form.ccnl} 2026. Contattare l'amministratore per inserire le tabelle.</p>
              ) : (
                <>
                  <Select value={form.livello} onValueChange={(v) => setForm({ ...form, livello: v })}>
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue placeholder="Seleziona livello" /></SelectTrigger>
                    <SelectContent>
                      {livelli.map(l => (
                        <SelectItem key={l.livello} value={l.livello}>
                          Livello {l.livello} — Min. €{l.minimo_tabellare_mensile?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}/mese
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedLivello && (
                    <Card className="bg-slate-700/50 border-slate-600">
                      <CardContent className="p-3 space-y-1">
                        <p className="text-lime-400 text-xs font-semibold">Minimo tabellare 2026</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-slate-400 text-xs">Minimo:</span><br /><span className="text-white font-semibold">€{fmt(selectedLivello.minimo_tabellare_mensile)}</span></div>
                          {selectedLivello.contingenza > 0 && <div><span className="text-slate-400 text-xs">Contingenza:</span><br /><span className="text-white">€{fmt(selectedLivello.contingenza)}</span></div>}
                          {selectedLivello.edr > 0 && <div><span className="text-slate-400 text-xs">EDR:</span><br /><span className="text-white">€{fmt(selectedLivello.edr)}</span></div>}
                          <div><span className="text-slate-400 text-xs">Mensilità:</span><br /><span className="text-white">{selectedLivello.mensilita}</span></div>
                          <div><span className="text-slate-400 text-xs">RAL minima:</span><br /><span className="text-white font-semibold">€{fmt(selectedLivello.ral_minima_annua)}</span></div>
                        </div>
                        <p className="text-slate-500 text-[10px] mt-2">{selectedLivello.fonte_normativa}</p>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 3 — Tipo contratto */}
        {step === 3 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-white font-semibold">Step 3 — Tipo contratto</h3>
              <Select value={form.tipo_contratto} onValueChange={(v) => setForm({ ...form, tipo_contratto: v })}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue placeholder="Seleziona tipo contratto" /></SelectTrigger>
                <SelectContent>
                  {tipiContrattoFiltrati.map(tc => <SelectItem key={tc.key} value={tc.key}>{tc.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.tipo_contratto.includes('parttime') && (
                <div>
                  <label className="text-slate-400 text-sm mb-1 block">Percentuale part-time (%)</label>
                  <Input type="number" min="10" max="90" step="5" value={form.percentuale_parttime} onChange={(e) => setForm({ ...form, percentuale_parttime: e.target.value })} className="bg-slate-900 border-slate-700 text-white" />
                </div>
              )}
              <div>
                <label className="text-slate-400 text-sm mb-1 block">Destinazione TFR</label>
                <Select value={form.tfr_destinazione} onValueChange={(v) => setForm({ ...form, tfr_destinazione: v })}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="azienda">In azienda</SelectItem>
                    <SelectItem value="fondo">Fondo pensione</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 4 — RAL / Retribuzione */}
        {step === 4 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-white font-semibold">Step 4 — Retribuzione</h3>
              <div className="flex gap-2 mb-2">
                <button onClick={() => setForm({ ...form, input_mode: 'ral' })} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${form.input_mode === 'ral' ? 'bg-lime-400 text-slate-900' : 'bg-slate-700 text-white'}`}>RAL annua</button>
                <button onClick={() => setForm({ ...form, input_mode: 'mensile' })} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${form.input_mode === 'mensile' ? 'bg-lime-400 text-slate-900' : 'bg-slate-700 text-white'}`}>Mensile lorda</button>
              </div>
              {form.input_mode === 'ral' ? (
                <div>
                  <label className="text-slate-400 text-sm mb-1 block">RAL (Retribuzione Annua Lorda) *</label>
                  <Input type="number" placeholder={selectedLivello ? `Min. ${fmt(selectedLivello.ral_minima_annua)}` : 'Es. 25000'} value={form.ral} onChange={(e) => setForm({ ...form, ral: e.target.value })} className="bg-slate-900 border-slate-700 text-white" />
                  {selectedLivello && form.ral && parseFloat(form.ral) < selectedLivello.ral_minima_annua && (
                    <p className="text-yellow-400 text-xs mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Attenzione: RAL inferiore al minimo tabellare (€{fmt(selectedLivello.ral_minima_annua)})</p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="text-slate-400 text-sm mb-1 block">Retribuzione mensile lorda *</label>
                  <Input type="number" placeholder={selectedLivello ? `Min. ${fmt(selectedLivello.minimo_tabellare_mensile + (selectedLivello.contingenza || 0) + (selectedLivello.edr || 0))}` : 'Es. 1800'} value={form.retribuzione_mensile} onChange={(e) => setForm({ ...form, retribuzione_mensile: e.target.value })} className="bg-slate-900 border-slate-700 text-white" />
                  {form.retribuzione_mensile && selectedLivello && (
                    <p className="text-slate-500 text-xs mt-1">RAL calcolata: €{fmt(parseFloat(form.retribuzione_mensile) * (selectedLivello.mensilita || 14))} ({selectedLivello.mensilita} mensilità)</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 5 — Regione */}
        {step === 5 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-white font-semibold">Step 5 — Regione sede lavoro</h3>
              <Select value={form.regione} onValueChange={(v) => setForm({ ...form, regione: v })}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue placeholder="Seleziona regione" /></SelectTrigger>
                <SelectContent>
                  {REGIONI.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-slate-500 text-xs flex items-center gap-1"><Info className="w-3 h-3" /> La regione incide sulle addizionali regionali IRPEF e sull'applicabilità incentivi ZES.</p>
            </CardContent>
          </Card>
        )}

        {/* STEP 5.5 — Profilo Lavoratore (incentivi) */}
        {step === 5.5 && (
          <ProfiloLavoratoreForm
            profilo={profiloLavoratore}
            onChange={setProfiloLavoratore}
          />
        )}

        {/* Navigation (solo per step > 1, step 1 ha navigazione interna) */}
        {step > 1 && (
          <div className="flex gap-3">
            <Button onClick={() => setStep(step === 5.5 ? 5 : step - 1)} variant="outline" className="border-slate-600 text-slate-400 hover:bg-slate-800">
              <ChevronLeft className="w-4 h-4 mr-1" /> Indietro
            </Button>
            <div className="flex-1" />
            {step >= 2 && step < 5 && (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext(step)} className="bg-lime-400 hover:bg-lime-500 text-slate-900 font-bold">
                Avanti <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            {step === 5 && (
              <Button onClick={() => setStep(5.5)} disabled={!canNext(5)} className="bg-lime-400 hover:bg-lime-500 text-slate-900 font-bold">
                Avanti <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            {step === 5.5 && (
              <Button onClick={calcola} disabled={!canNext(5)} className="bg-lime-400 hover:bg-lime-500 text-slate-900 font-bold">
                <Calculator className="w-4 h-4 mr-2" /> Calcola Costo
              </Button>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
    </VerificaTabelleNormative>
  );
}