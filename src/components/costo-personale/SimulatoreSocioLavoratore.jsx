import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Loader2, AlertTriangle, ChevronRight, ChevronLeft, Info, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTabelleContributive, calcolaCostoSocioLavoratore } from './useTabelleContributive';
import VerificaTabelleNormative from './VerificaTabelleNormative';
import RisultatoSocioLavoratore from './RisultatoSocioLavoratore';

const TIPI_SOCIETA = [
  { key: 'srl', label: 'SRL', tooltip: 'Società a responsabilità limitata. Il socio lavoratore può iscriversi alla Gestione Commercianti o Artigiani INPS, a scelta in base all\'attività svolta.' },
  { key: 'snc', label: 'SNC', tooltip: 'Società in nome collettivo. I soci che prestano attività sono obbligati all\'iscrizione INPS Artigiani o Commercianti in base all\'oggetto sociale.' },
  { key: 'sas', label: 'SAS', tooltip: 'Società in accomandita semplice. Il socio accomandatario che partecipa all\'attività ha obbligo di iscrizione INPS Artigiani o Commercianti.' },
  { key: 'artigiana', label: 'Società Artigiana', tooltip: 'Impresa iscritta all\'Albo delle Imprese Artigiane. Tutti i soci lavoratori sono obbligatoriamente iscritti alla Gestione Artigiani INPS.' },
  { key: 'commerciale', label: 'Società Commerciale', tooltip: 'Impresa con attività commerciale (vendita, servizi). I soci lavoratori sono obbligatoriamente iscritti alla Gestione Commercianti INPS.' },
];

const RUOLI_OPERATIVI = [
  { key: 'operaio', label: 'Operaio / Addetto produzione', desc: 'Attività manuale o produttiva' },
  { key: 'impiegato', label: 'Impiegato / Amministrativo', desc: 'Attività impiegatizia, gestionale, contabile' },
  { key: 'tecnico', label: 'Tecnico / Specialista', desc: 'Attività tecnica specializzata (IT, progettazione, manutenzione)' },
  { key: 'commerciale', label: 'Commerciale / Vendite', desc: 'Attività commerciale, relazione clienti, vendita' },
  { key: 'direttivo', label: 'Direttivo / Responsabile', desc: 'Ruolo di coordinamento e responsabilità' },
];

const GESTIONI_PREVIDENZIALI = [
  { key: 'commercianti', label: 'Gestione Commercianti INPS', desc: 'Obbligo per soci di società commerciale che partecipano all\'attività — minimale + eccedenza', societa: ['srl', 'snc', 'sas', 'commerciale'] },
  { key: 'artigiani', label: 'Gestione Artigiani INPS', desc: 'Obbligo per soci di impresa artigiana iscritta all\'Albo — minimale + eccedenza', societa: ['srl', 'snc', 'sas', 'artigiana'] },
];

// Mappa società → gestione INPS obbligatoria (auto-impostata, no scelta)
const GESTIONE_OBBLIGATORIA = {
  artigiana: 'artigiani',
  commerciale: 'commercianti',
  snc: null,   // obbligo ma scelta tra artigiani/commercianti
  sas: null,   // obbligo ma scelta tra artigiani/commercianti
  srl: null,   // libera scelta
};

const STEP_LABELS = [
  'Tipo società',
  'Ruolo operativo',
  'Iscrizione previdenziale',
  'Reddito annuo',
  'Calcolo contributivo',
  'Calcolo fiscale',
  'Riepilogo',
];

export default function SimulatoreSocioLavoratore() {
  const tab = useTabelleContributive(2026);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    tipo_societa: '',
    ruolo_operativo: '',
    gestione_inps: '',
    compenso: '',
    inail_applicabile: true,
  });
  const [result, setResult] = useState(null);

  const { data: contributiINPS, isLoading: loadingContributi } = useQuery({
    queryKey: ['contributi-inps', 2026],
    queryFn: () => base44.entities.ContributiINPS.filter({ anno: 2026 }),
    initialData: [],
  });

  // Gestione obbligatoria per il tipo di società selezionato
  const gestioneObbligatoria = form.tipo_societa ? GESTIONE_OBBLIGATORIA[form.tipo_societa] : null;
  const isGestioneObbligatoria = gestioneObbligatoria !== null && gestioneObbligatoria !== undefined;

  // Filtra gestioni previdenziali in base al tipo di società selezionato
  const gestioniFiltrate = GESTIONI_PREVIDENZIALI.filter(g =>
    !form.tipo_societa || g.societa.includes(form.tipo_societa)
  );

  const canNext = (s) => {
    switch (s) {
      case 1: return !!form.tipo_societa;
      case 2: return !!form.ruolo_operativo;
      case 3: return !!form.gestione_inps;
      case 4: return !!form.compenso && parseFloat(form.compenso) > 0;
      case 5: return true; // riepilogo contributi — sola lettura
      case 6: return true; // riepilogo fiscale — sola lettura
      default: return false;
    }
  };

  const calcola = () => {
    const compenso = parseFloat(form.compenso);
    if (!compenso || compenso <= 0 || tab.isLoading) return;

    const res = calcolaCostoSocioLavoratore({
      compenso,
      gestione_inps: form.gestione_inps,
      inail_applicabile: form.inail_applicabile,
      contributiINPS,
    }, tab);

    if (res) {
      const ts = TIPI_SOCIETA.find(t => t.key === form.tipo_societa);
      res.tipo_societa = ts?.label || form.tipo_societa;
      res.ruolo_operativo = RUOLI_OPERATIVI.find(r => r.key === form.ruolo_operativo)?.label || form.ruolo_operativo;
    }

    setResult(res);
  };

  // Gestisce il passaggio al prossimo step con logica condizionale
  const goToStep = (target) => {
    // Quando si esce dallo Step 1, se la gestione è obbligatoria auto-imposta
    if (step === 1 && target === 2 && form.tipo_societa) {
      const obbl = GESTIONE_OBBLIGATORIA[form.tipo_societa];
      if (obbl) {
        setForm(prev => ({ ...prev, gestione_inps: obbl }));
      } else {
        // Reset gestione se si torna a un tipo con scelta libera
        if (form.gestione_inps && !GESTIONI_PREVIDENZIALI.some(g => g.key === form.gestione_inps && g.societa.includes(form.tipo_societa))) {
          setForm(prev => ({ ...prev, gestione_inps: '' }));
        }
      }
    }
    if (target === 5 && !result) {
      calcola();
    }
    setStep(target);
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

  // Step 7 — Riepilogo professionale completo
  if (step === 7 && result) {
    return (
      <RisultatoSocioLavoratore
        result={result}
        onReset={() => {
          setResult(null);
          setStep(1);
          setForm({ tipo_societa: '', ruolo_operativo: '', gestione_inps: '', compenso: '', inail_applicabile: true });
        }}
      />
    );
  }

  const fmt = (n) => n?.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00';
  const selectedGestione = GESTIONI_PREVIDENZIALI.find(g => g.key === form.gestione_inps);

  return (
    <VerificaTabelleNormative>
      <div className="space-y-4">
        {/* Step indicator */}
        <div className="flex items-center gap-1 px-1">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i + 1 <= step ? 'bg-amber-400' : 'bg-slate-700'}`} />
          ))}
        </div>
        <p className="text-slate-500 text-xs text-center">Step {step} di 7 — {STEP_LABELS[step - 1]}</p>

        {/* STEP 1 — Tipo società */}
        {step === 1 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-white font-semibold">Step 1 — Tipo società</h3>
              <p className="text-slate-400 text-xs">Seleziona la forma giuridica della società in cui operi come socio lavoratore.</p>
              <div className="space-y-2">
                {TIPI_SOCIETA.map(ts => (
                  <button
                    key={ts.key}
                    onClick={() => setForm({ ...form, tipo_societa: ts.key, gestione_inps: '' })}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${form.tipo_societa === ts.key ? 'bg-amber-500/20 border-amber-500/50' : 'bg-slate-900 border-slate-700 hover:border-slate-600'}`}
                  >
                    <span className={`text-sm font-medium ${form.tipo_societa === ts.key ? 'text-amber-400' : 'text-white'}`}>{ts.label}</span>
                    <p className="text-slate-500 text-xs mt-0.5">{ts.desc}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2 — Ruolo operativo */}
        {step === 2 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-white font-semibold">Step 2 — Ruolo operativo</h3>
              <p className="text-slate-400 text-xs">Indica il tipo di attività che svolgi all'interno della società. Questo incide sull'aliquota INAIL.</p>
              <div className="space-y-2">
                {RUOLI_OPERATIVI.map(r => (
                  <button
                    key={r.key}
                    onClick={() => setForm({ ...form, ruolo_operativo: r.key })}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${form.ruolo_operativo === r.key ? 'bg-amber-500/20 border-amber-500/50' : 'bg-slate-900 border-slate-700 hover:border-slate-600'}`}
                  >
                    <span className={`text-sm font-medium ${form.ruolo_operativo === r.key ? 'text-amber-400' : 'text-white'}`}>{r.label}</span>
                    <p className="text-slate-500 text-xs mt-0.5">{r.desc}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3 — Iscrizione previdenziale */}
        {step === 3 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-white font-semibold">Step 3 — Iscrizione previdenziale</h3>
              <p className="text-slate-400 text-xs">L'inquadramento previdenziale dipende dalla forma societaria e dal tipo di attività svolta.</p>
              
              {gestioniFiltrate.length === 0 ? (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-yellow-400 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    Seleziona prima il tipo di società (Step 1).
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {gestioniFiltrate.map(g => (
                    <button
                      key={g.key}
                      onClick={() => setForm({ ...form, gestione_inps: g.key })}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${form.gestione_inps === g.key ? 'bg-amber-500/20 border-amber-500/50' : 'bg-slate-900 border-slate-700 hover:border-slate-600'}`}
                    >
                      <span className={`text-sm font-medium ${form.gestione_inps === g.key ? 'text-amber-400' : 'text-white'}`}>{g.label}</span>
                      <p className="text-slate-500 text-xs mt-0.5">{g.desc}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Mostra dati da entity ContributiINPS se gestione selezionata */}
              {(form.gestione_inps === 'commercianti' || form.gestione_inps === 'artigiani') && (() => {
                const gestKey = form.gestione_inps === 'commercianti' ? 'Commercianti' : 'Artigiani';
                const dati = contributiINPS?.find(c => c.gestione === gestKey);
                if (!dati) return null;
                return (
                  <Card className="bg-slate-700/50 border-slate-600">
                    <CardContent className="p-3 space-y-1">
                      <p className="text-amber-400 text-xs font-semibold">Parametri {gestKey} 2026</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-slate-400">Aliquota:</span> <span className="text-white font-semibold">{(dati.aliquota_percentuale * 100).toFixed(2)}%</span></div>
                        <div><span className="text-slate-400">Minimale:</span> <span className="text-white">€{fmt(dati.minimale_annuo)}</span></div>
                        <div><span className="text-slate-400">Contrib. fisso:</span> <span className="text-white">€{fmt(dati.contributo_fisso_annuo)}</span></div>
                        <div><span className="text-slate-400">Massimale:</span> <span className="text-white">€{fmt(dati.massimale_reddito)}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              <div>
                <label className="text-slate-400 text-sm mb-1 block">INAIL applicabile?</label>
                <Select value={form.inail_applicabile ? 'si' : 'no'} onValueChange={(v) => setForm({ ...form, inail_applicabile: v === 'si' })}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="si">Sì — soggetto a copertura INAIL</SelectItem>
                    <SelectItem value="no">No — esente INAIL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 4 — Reddito annuo */}
        {step === 4 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-white font-semibold">Step 4 — Reddito annuo</h3>
              <p className="text-slate-400 text-xs">
                {form.gestione_inps === 'dipendente_coop'
                  ? 'Inserisci la retribuzione annua lorda come dipendente della cooperativa.'
                  : 'Inserisci il reddito annuo su cui verranno calcolati i contributi previdenziali.'
                }
              </p>
              <div>
                <label className="text-slate-400 text-sm mb-1 block">
                  {form.gestione_inps === 'dipendente_coop' ? 'Retribuzione annua lorda (RAL) *' : 'Reddito annuo lordo *'}
                </label>
                <Input
                  type="number"
                  placeholder="Es. 30000"
                  value={form.compenso}
                  onChange={(e) => setForm({ ...form, compenso: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white text-lg"
                />
              </div>

              {/* Avviso minimale */}
              {(form.gestione_inps === 'commercianti' || form.gestione_inps === 'artigiani') && form.compenso && (() => {
                const gestKey = form.gestione_inps === 'commercianti' ? 'Commercianti' : 'Artigiani';
                const dati = contributiINPS?.find(c => c.gestione === gestKey);
                if (!dati) return null;
                const compenso = parseFloat(form.compenso);
                if (compenso < dati.minimale_annuo) {
                  return (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                      <p className="text-yellow-400 text-xs flex items-center gap-2">
                        <Info className="w-4 h-4 flex-shrink-0" />
                        Reddito inferiore al minimale (€{fmt(dati.minimale_annuo)}). Verranno comunque calcolati i contributi fissi sul minimale.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
            </CardContent>
          </Card>
        )}

        {/* STEP 5 — Calcolo contributivo (preview) */}
        {step === 5 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-white font-semibold">Step 5 — Calcolo contributivo</h3>
              {!result ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Tabelle normative incomplete per la gestione selezionata. Impossibile procedere.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-400">Reddito lordo</span><span className="text-white font-semibold">€{fmt(result.compenso)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Contributi INPS personali</span><span className="text-red-300">-€{fmt(result.contributo_inps)}</span></div>
                    {result.inail > 0 && <div className="flex justify-between"><span className="text-slate-400">INAIL</span><span className="text-red-300">-€{fmt(result.inail)}</span></div>}
                    <div className="border-t border-amber-500/30 pt-2">
                      <div className="flex justify-between"><span className="text-amber-400 font-bold">Costo azienda totale</span><span className="text-amber-400 font-bold">€{fmt(result.costo_azienda)}</span></div>
                    </div>
                  </div>
                  <p className="text-slate-500 text-xs flex items-center gap-1"><Info className="w-3 h-3" /> Prosegui per vedere il dettaglio fiscale (IRPEF, addizionali, netto).</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 6 — Calcolo fiscale (preview) */}
        {step === 6 && result && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-white font-semibold">Step 6 — Calcolo fiscale</h3>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">Imponibile IRPEF</span><span className="text-white font-semibold">€{fmt(result.imponibile_irpef)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">IRPEF (scaglioni)</span><span className="text-red-300">-€{fmt(result.irpef)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Addizionali (~{(result.aliquota_addizionali * 100).toFixed(1)}%)</span><span className="text-red-300">-€{fmt(result.addizionali)}</span></div>
                <div className="border-t border-green-500/30 pt-2">
                  <div className="flex justify-between"><span className="text-green-400 font-bold">NETTO ANNUO</span><span className="text-green-400 font-bold text-lg">€{fmt(result.netto_annuo)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Netto mensile</span><span className="text-green-400">€{fmt(result.netto_mensile)}</span></div>
                </div>
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
          {step < 7 && step !== 5 && step !== 6 && (
            <Button
              onClick={() => goToStep(step + 1)}
              disabled={!canNext(step)}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold"
            >
              Avanti <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {step === 5 && result && (
            <Button onClick={() => setStep(6)} className="bg-amber-500 hover:bg-amber-600 text-white font-bold">
              Avanti <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {step === 6 && result && (
            <Button onClick={() => setStep(7)} className="bg-amber-500 hover:bg-amber-600 text-white font-bold">
              <Calculator className="w-4 h-4 mr-2" /> Vedi Riepilogo
            </Button>
          )}
        </div>
      </div>
    </VerificaTabelleNormative>
  );
}