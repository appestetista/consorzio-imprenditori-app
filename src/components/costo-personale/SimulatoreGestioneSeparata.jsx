import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calculator, Loader2, AlertTriangle, ChevronRight, ChevronLeft, Info, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTabelleContributive, calcolaCostoGestioneSeparata } from './useTabelleContributive';
import VerificaTabelleNormative from './VerificaTabelleNormative';
import RisultatoGestioneSeparata from './RisultatoGestioneSeparata';

const TIPI_SOGGETTO = [
  { key: 'cococo', label: 'Collaboratore Co.Co.Co.', desc: 'Collaborazione coordinata e continuativa (art. 409 c.p.c.). Tipico di incarichi di gestione, consulenza continuativa, sindaci e revisori.', tooltip: 'Il committente versa 2/3 dei contributi, il collaboratore 1/3. L\'aliquota è piena se non ha altra copertura previdenziale, ridotta se iscritto ad altra gestione obbligatoria.' },
  { key: 'professionista', label: 'Professionista senza cassa', desc: 'Professionista senza albo con cassa autonoma (es. consulente IT, formatore, web designer, traduttore).', tooltip: 'Obbligato alla Gestione Separata INPS ex L. 335/1995 art. 2 co. 26. Il contributo è interamente a suo carico, ma può addebitare il 4% in rivalsa al committente in fattura.' },
  { key: 'amministratore_gs', label: 'Amministratore iscritto Gestione Separata', desc: 'Amministratore di società (SRL, SPA) senza iscrizione ad altra gestione previdenziale obbligatoria.', tooltip: 'L\'amministratore che percepisce un compenso ed è privo di altra copertura previdenziale è obbligato alla Gestione Separata. Il contributo è ripartito 2/3 società, 1/3 amministratore.' },
];

const STEP_LABELS = [
  'Tipo soggetto',
  'Altra copertura previdenziale',
  'Compenso lordo',
  'Calcolo contributivo',
  'Calcolo fiscale',
  'Riepilogo',
];

export default function SimulatoreGestioneSeparata() {
  const tab = useTabelleContributive(2026);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    tipo_soggetto: '',
    ha_altra_copertura: false,
    compenso: '',
  });
  const [result, setResult] = useState(null);

  const { data: contributiINPS, isLoading: loadingContributi } = useQuery({
    queryKey: ['contributi-inps-gs', 2026],
    queryFn: () => base44.entities.ContributiINPS.filter({ anno: 2026 }),
    initialData: [],
  });

  const canNext = (s) => {
    switch (s) {
      case 1: return !!form.tipo_soggetto;
      case 2: return true; // sempre valido, è un sì/no con default
      case 3: return !!form.compenso && parseFloat(form.compenso) > 0;
      case 4: return true;
      case 5: return true;
      default: return false;
    }
  };

  const calcola = () => {
    const compenso = parseFloat(form.compenso);
    if (!compenso || compenso <= 0 || tab.isLoading) return;
    const res = calcolaCostoGestioneSeparata({ compenso, ha_altra_copertura: form.ha_altra_copertura, contributiINPS }, tab);
    if (res) {
      const ts = TIPI_SOGGETTO.find(t => t.key === form.tipo_soggetto);
      res.tipo_soggetto = ts?.label || form.tipo_soggetto;
    }
    setResult(res);
  };

  const goToStep = (target) => {
    if (target === 4 && !result) calcola();
    setStep(target);
  };

  const fmt = (n) => n?.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00';

  if (tab.isLoading || loadingContributi) {
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

  // Step 6 — Riepilogo
  if (step === 6 && result) {
    return (
      <RisultatoGestioneSeparata
        result={result}
        onReset={() => {
          setResult(null);
          setStep(1);
          setForm({ tipo_soggetto: '', ha_altra_copertura: false, compenso: '' });
        }}
      />
    );
  }

  const aliquotaPiena = tab.get('inps_gestione_separata_totale');
  const datiGS = contributiINPS?.find(c => c.gestione === 'GestioneSeparata');
  const aliquotaRidotta = datiGS?.aliquota_percentuale || (aliquotaPiena ? aliquotaPiena * 0.75 : null);
  const massimaleGS = datiGS?.massimale_reddito || null;
  const fonteGS = tab.getFonte('inps_gestione_separata_totale') || 'Circ. INPS n. 8/2026';

  return (
    <VerificaTabelleNormative>
    <TooltipProvider>
      <div className="space-y-4">
        {/* Step indicator */}
        <div className="flex items-center gap-1 px-1">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i + 1 <= step ? 'bg-cyan-400' : 'bg-slate-700'}`} />
          ))}
        </div>
        <p className="text-slate-500 text-xs text-center">Step {step} di 6 — {STEP_LABELS[step - 1]}</p>

        {/* STEP 1 — Tipo soggetto */}
        {step === 1 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-semibold">Step 1 — Tipo soggetto</h3>
                <Tooltip>
                  <TooltipTrigger><HelpCircle className="w-4 h-4 text-slate-500" /></TooltipTrigger>
                  <TooltipContent className="max-w-[280px] bg-slate-700 text-white border-slate-600">
                    <p className="text-xs">La Gestione Separata INPS è obbligatoria per collaboratori co.co.co., professionisti senza cassa, amministratori senza altra copertura (D.L. 98/2011, L. 335/1995 art. 2 co. 26).</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-slate-400 text-xs">Seleziona la tipologia di soggetto iscritto alla Gestione Separata INPS.</p>
              <div className="space-y-2">
                {TIPI_SOGGETTO.map(ts => (
                  <button
                    key={ts.key}
                    onClick={() => setForm({ ...form, tipo_soggetto: ts.key })}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${form.tipo_soggetto === ts.key ? 'bg-cyan-500/20 border-cyan-500/50' : 'bg-slate-900 border-slate-700 hover:border-slate-600'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${form.tipo_soggetto === ts.key ? 'text-cyan-400' : 'text-white'}`}>{ts.label}</span>
                      <Tooltip>
                        <TooltipTrigger asChild><span><HelpCircle className="w-3.5 h-3.5 text-slate-500" /></span></TooltipTrigger>
                        <TooltipContent className="max-w-[280px] bg-slate-700 text-white border-slate-600">
                          <p className="text-xs">{ts.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5">{ts.desc}</p>
                  </button>
                ))}
              </div>

              {/* Info card per selezione corrente */}
              {form.tipo_soggetto && (() => {
                const sel = TIPI_SOGGETTO.find(t => t.key === form.tipo_soggetto);
                if (!sel) return null;
                return (
                  <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                    <p className="text-cyan-400 text-xs font-semibold flex items-center gap-1 mb-1">
                      <Info className="w-3 h-3" /> {sel.label}
                    </p>
                    <p className="text-slate-300 text-xs">{sel.tooltip}</p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* STEP 2 — Altra copertura previdenziale */}
        {step === 2 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-semibold">Step 2 — Altra copertura previdenziale</h3>
                <Tooltip>
                  <TooltipTrigger><HelpCircle className="w-4 h-4 text-slate-500" /></TooltipTrigger>
                  <TooltipContent className="max-w-[280px] bg-slate-700 text-white border-slate-600">
                    <p className="text-xs">Se il soggetto è iscritto ad altra gestione previdenziale obbligatoria (es. dipendente con altra posizione INPS), l'aliquota si riduce al 75% di quella piena.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-slate-400 text-xs">Indica se il soggetto ha un'altra copertura previdenziale obbligatoria attiva.</p>

              <div className="space-y-2">
                <button
                  onClick={() => setForm({ ...form, ha_altra_copertura: false })}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${!form.ha_altra_copertura ? 'bg-cyan-500/20 border-cyan-500/50' : 'bg-slate-900 border-slate-700 hover:border-slate-600'}`}
                >
                  <span className={`text-sm font-medium ${!form.ha_altra_copertura ? 'text-cyan-400' : 'text-white'}`}>No — Aliquota piena</span>
                  <p className="text-slate-500 text-xs mt-0.5">Nessuna altra gestione obbligatoria → aliquota {aliquotaPiena ? (aliquotaPiena * 100).toFixed(2) : '35,03'}%</p>
                </button>
                <button
                  onClick={() => setForm({ ...form, ha_altra_copertura: true })}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${form.ha_altra_copertura ? 'bg-cyan-500/20 border-cyan-500/50' : 'bg-slate-900 border-slate-700 hover:border-slate-600'}`}
                >
                  <span className={`text-sm font-medium ${form.ha_altra_copertura ? 'text-cyan-400' : 'text-white'}`}>Sì — Aliquota ridotta</span>
                  <p className="text-slate-500 text-xs mt-0.5">Iscritto ad altra gestione obbligatoria → aliquota ridotta {aliquotaRidotta ? (aliquotaRidotta * 100).toFixed(2) : '26,07'}%</p>
                </button>
              </div>

              <div className={`rounded-lg p-3 border ${form.ha_altra_copertura ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-slate-700/50 border-slate-600'}`}>
                <p className="text-slate-300 text-xs">
                  {form.ha_altra_copertura
                    ? 'L\'aliquota è ridotta per soggetti iscritti contemporaneamente ad altra gestione previdenziale obbligatoria (es. lavoratore dipendente con posizione INPS attiva, pensionato).'
                    : 'L\'aliquota piena si applica a soggetti senza altra copertura previdenziale obbligatoria. Il contributo è ripartito: 2/3 a carico del committente, 1/3 a carico del collaboratore.'
                  }
                </p>
                {massimaleGS && (
                  <p className="text-slate-400 text-xs mt-1">Massimale di reddito 2026: €{massimaleGS.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                )}
                <p className="text-slate-500 text-[10px] mt-1">Fonte: {fonteGS}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3 — Compenso lordo */}
        {step === 3 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-white font-semibold">Step 3 — Compenso lordo annuo</h3>
              <p className="text-slate-400 text-xs">Inserisci il compenso annuo lordo su cui verranno calcolati i contributi.</p>
              <div>
                <label className="text-slate-400 text-sm mb-1 block">Compenso annuo lordo *</label>
                <Input
                  type="number"
                  placeholder="Es. 30000"
                  value={form.compenso}
                  onChange={(e) => setForm({ ...form, compenso: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white text-lg"
                />
              </div>

              {/* Riepilogo selezioni precedenti */}
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Soggetto:</span><span className="text-white">{TIPI_SOGGETTO.find(t => t.key === form.tipo_soggetto)?.label}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Altra copertura:</span><span className="text-white">{form.ha_altra_copertura ? 'Sì (ridotta)' : 'No (piena)'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Aliquota applicata:</span><span className="text-cyan-400 font-semibold">{form.ha_altra_copertura ? (aliquotaRidotta ? (aliquotaRidotta * 100).toFixed(2) : '26,07') : (aliquotaPiena ? (aliquotaPiena * 100).toFixed(2) : '35,03')}%</span></div>
                {massimaleGS && <div className="flex justify-between"><span className="text-slate-500">Massimale reddito:</span><span className="text-white">€{massimaleGS.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span></div>}
                <div className="flex justify-between"><span className="text-slate-500">Fonte:</span><span className="text-slate-400 text-[10px]">{fonteGS}</span></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 4 — Calcolo contributivo */}
        {step === 4 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-white font-semibold">Step 4 — Calcolo contributivo</h3>
              {!result ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Tabelle normative incomplete. Impossibile procedere.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 space-y-2 text-sm">
                    <p className="text-cyan-400 text-xs font-bold uppercase tracking-wider">Area Previdenziale — Gestione Separata</p>
                    <div className="flex justify-between"><span className="text-slate-400">Compenso lordo</span><span className="text-white font-semibold">€{fmt(result.compenso)}</span></div>
                    <div className="space-y-1 pl-2 border-l-2 border-cyan-500/30">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Aliquota applicata ({(result.aliquota_effettiva * 100).toFixed(2)}%)</span>
                        <span className="text-red-300">-€{fmt(result.contributo_totale)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">↳ Quota committente (2/3)</span>
                        <span className="text-slate-400">€{fmt(result.quota_committente)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">↳ Quota collaboratore (1/3)</span>
                        <span className="text-slate-400">€{fmt(result.quota_collaboratore)}</span>
                      </div>
                    </div>
                    <div className="border-t border-cyan-500/20 pt-2">
                      <div className="flex justify-between font-semibold">
                        <span className="text-cyan-400">Costo committente</span>
                        <span className="text-cyan-400">€{fmt(result.costo_committente)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-slate-500">Incidenza contributiva</span>
                      <span className="text-cyan-400 font-semibold">{result.compenso > 0 ? ((result.contributo_totale / result.compenso) * 100).toFixed(1) : '0.0'}%</span>
                    </div>
                  </div>

                  <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-2.5">
                    <p className="text-slate-500 text-xs">
                      <span className="font-semibold text-slate-400">Rif. normativo:</span> {result.fonte_gs || fonteGS} — Gestione Separata INPS. Aliquota {result.ha_altra_copertura ? 'ridotta' : 'piena'}: {(result.aliquota_effettiva * 100).toFixed(2)}%.{result.massimale_reddito ? ` Massimale: €${result.massimale_reddito.toLocaleString('it-IT')}.` : ''} Ripartizione: 2/3 committente, 1/3 collaboratore.
                    </p>
                  </div>

                  <p className="text-slate-500 text-xs flex items-center gap-1"><Info className="w-3 h-3" /> Prosegui per il dettaglio fiscale (IRPEF, addizionali, netto).</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 5 — Calcolo fiscale */}
        {step === 5 && result && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-white font-semibold">Step 5 — Calcolo fiscale</h3>

              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 space-y-2 text-sm">
                <p className="text-green-400 text-xs font-bold uppercase tracking-wider">Area Fiscale — IRPEF 2026</p>
                <div className="flex justify-between"><span className="text-slate-400">Reddito imponibile IRPEF</span><span className="text-white font-semibold">€{fmt(result.imponibile_irpef)}</span></div>
                <p className="text-slate-500 text-xs pl-2">(Compenso €{fmt(result.compenso)} − Quota INPS collaboratore €{fmt(result.quota_collaboratore)})</p>

                <div className="space-y-1 pl-2 border-l-2 border-green-500/30">
                  <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Scaglioni IRPEF</p>
                  {result.irpef_scaglione_1_importo > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">{(result.aliquota_scaglione_1 * 100).toFixed(0)}% fino a €{fmt(result.soglia_1)}</span>
                      <span className="text-red-300">-€{fmt(result.irpef_scaglione_1_importo)}</span>
                    </div>
                  )}
                  {result.irpef_scaglione_2_importo > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">{(result.aliquota_scaglione_2 * 100).toFixed(0)}% da €{fmt(result.soglia_1)} a €{fmt(result.soglia_2)}</span>
                      <span className="text-red-300">-€{fmt(result.irpef_scaglione_2_importo)}</span>
                    </div>
                  )}
                  {result.irpef_scaglione_3_importo > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">{(result.aliquota_scaglione_3 * 100).toFixed(0)}% oltre €{fmt(result.soglia_2)}</span>
                      <span className="text-red-300">-€{fmt(result.irpef_scaglione_3_importo)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t border-green-500/20 pt-1">
                    <span className="text-slate-300">IRPEF lorda</span>
                    <span className="text-red-300">-€{fmt(result.irpef_lorda)}</span>
                  </div>
                </div>

                {result.detrazione_lavoro > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Detrazione lavoro (art. 13 TUIR)</span>
                    <span className="text-green-400">+€{fmt(result.detrazione_lavoro)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold"><span className="text-white">IRPEF netta</span><span className="text-red-300">-€{fmt(result.irpef)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Addizionali reg./com. (~{(result.aliquota_addizionali * 100).toFixed(1)}%)</span><span className="text-red-300">-€{fmt(result.addizionali)}</span></div>

                <div className="flex justify-between text-xs mt-1">
                  <span className="text-slate-500">Incidenza fiscale</span>
                  <span className="text-green-400 font-semibold">{result.compenso > 0 ? (((result.irpef + result.addizionali) / result.compenso) * 100).toFixed(1) : '0.0'}%</span>
                </div>
              </div>

              {/* Netto finale */}
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3">
                <div className="flex justify-between"><span className="text-green-400 font-bold">NETTO DISPONIBILE</span><span className="text-green-400 font-bold text-lg">€{fmt(result.netto_annuo)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-400">Netto mensile</span><span className="text-green-400">€{fmt(result.netto_mensile)}</span></div>
              </div>

              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-2.5">
                <p className="text-slate-500 text-xs">
                  <span className="font-semibold text-slate-400">Rif. normativo:</span> L. Bilancio 2026 (L. 207/2025) — Art. 11 TUIR. Scaglioni: 23% fino a €28.000, 33% da €28.001 a €50.000, 43% oltre €50.000.
                </p>
              </div>

              <p className="text-slate-500 text-xs flex items-center gap-1"><Info className="w-3 h-3" /> Prosegui per il riepilogo professionale completo.</p>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 1 && (
            <Button onClick={() => setStep(step - 1)} variant="outline" className="border-slate-600 text-slate-400 hover:bg-slate-800">
              <ChevronLeft className="w-4 h-4 mr-1" /> Indietro
            </Button>
          )}
          <div className="flex-1" />
          {step < 6 && step !== 4 && step !== 5 && (
            <Button
              onClick={() => goToStep(step + 1)}
              disabled={!canNext(step)}
              className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold"
            >
              Avanti <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {step === 4 && result && (
            <Button onClick={() => setStep(5)} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold">
              Avanti <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {step === 5 && result && (
            <Button onClick={() => setStep(6)} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold">
              <Calculator className="w-4 h-4 mr-2" /> Vedi Riepilogo
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
    </VerificaTabelleNormative>
  );
}