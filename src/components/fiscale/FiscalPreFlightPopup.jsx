import React, { useState, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Building2, Check, ChevronRight, X, MapPin, Hash, Briefcase, Percent, HandCoins, CalendarClock } from 'lucide-react';
import AtecoSearchInput from './AtecoSearchInput';
import { Input } from '@/components/ui/input';

/* ═══════════════════════════════════════════════════════
   TASSONOMIA FISCALE ITALIANA — Logiche da commercialista
   ═══════════════════════════════════════════════════════
   
   FORME GIURIDICHE E VINCOLI:
   
   1. SOCIETÀ DI CAPITALI (SRL, SRLU, SPA, SAPA, SE):
      - Regime SEMPRE Ordinario (non possono essere forfettari)
      - Contabilità SEMPRE Ordinaria
      - IRAP: SÌ (serve Regione)
      - Hanno compenso amministratore + dividendi
      - INPS: Gestione Separata per l'amm.re co.co.co. (35,03% nel 2026)
      
   2. REGIME FORFETTARIO (RF):
      - È una PERSONA FISICA con P.IVA
      - Regime SEMPRE Forfettario (per definizione)
      - NO IRAP, NO contabilità, NO IVA
      - INPS: Commercianti/Artigiani/Gest.Separata
      - ATECO: determina coefficiente di redditività
      
   3. DITTA INDIVIDUALE:
      - Può essere Ordinaria o Semplificata (non forfettaria — se vuole il forfettario sceglie RF)
      - IRAP: SÌ
      - INPS: Commercianti/Artigiani
      
   4. SOCIETÀ DI PERSONE (SNC, SAS):
      - Regime Ordinario o Semplificata
      - IRAP: SÌ
      - INPS: Commercianti/Artigiani (obbligatorio per tutti i soci in SNC, solo accomandatari in SAS)
      - Tassazione per trasparenza (IRPEF sui soci)
      
   5. SOCIETÀ SEMPLICE (SS):
      - Solo attività non commerciali
      - NO IRAP (normalmente), NO IVA
      - INPS: varia
      
   6. COOPERATIVA (COOP):
      - Regime Ordinario
      - Agevolazioni IRES se mutualità prevalente
      - IRAP: SÌ
   ═══════════════════════════════════════════════════════ */

const FORME_GIURIDICHE = [
  // Società di capitali
  { value: 'SRL',   label: 'S.R.L.',              cat: 'capitale',  desc: 'Società a responsabilità limitata' },
  { value: 'SRLU',  label: 'S.R.L. Unipersonale', cat: 'capitale',  desc: 'SRL con socio unico' },
  { value: 'SPA',   label: 'S.P.A.',              cat: 'capitale',  desc: 'Società per azioni' },
  { value: 'SAPA',  label: 'S.A.P.A.',            cat: 'capitale',  desc: 'Società in accomandita per azioni' },
  { value: 'SE',    label: 'Società Europea',      cat: 'capitale',  desc: 'Societas Europaea' },
  // Persone fisiche
  { value: 'RF',    label: 'Regime Forfettario',   cat: 'persona',   desc: 'Persona fisica con P.IVA — imposta sostitutiva 5%/15%' },
  { value: 'Ditta individuale', label: 'Ditta Individuale', cat: 'persona', desc: 'Impresa individuale — IRPEF ordinaria' },
  // Società di persone
  { value: 'SNC',   label: 'S.N.C.',              cat: 'persone',   desc: 'Società in nome collettivo' },
  { value: 'SAS',   label: 'S.A.S.',              cat: 'persone',   desc: 'Società in accomandita semplice' },
  { value: 'SS',    label: 'Società Semplice',     cat: 'persone',   desc: 'Solo attività non commerciali' },
  // Cooperativa
  { value: 'COOP',  label: 'Cooperativa',          cat: 'coop',      desc: 'Società cooperativa' },
];

const REGIONI = [
  'Abruzzo','Basilicata','Calabria','Campania','Emilia-Romagna','Friuli Venezia Giulia',
  'Lazio','Liguria','Lombardia','Marche','Molise','Piemonte','Puglia','Sardegna',
  'Sicilia','Toscana','Trentino-Alto Adige','Umbria',"Valle d'Aosta",'Veneto'
];

/* ═══════════════════════════════════════════════════════
   REGOLE DI COERENZA — applicate automaticamente
   ═══════════════════════════════════════════════════════ */
function getAutoValues(fg) {
  const auto = {};
  const CAPITALI = ['SRL', 'SRLU', 'SPA', 'SAPA', 'SE'];
  
  if (CAPITALI.includes(fg)) {
    auto.regime_fiscale = 'Ordinario';
    auto.tipo_contabilita = 'Ordinaria';
    // INPS GS per amm.re co.co.co. è il default per società di capitali
    auto.gestione_inps = 'Gestione separata';
  }
  if (fg === 'RF') {
    auto.regime_fiscale = 'Forfettario';
    // no IRAP, no IVA, no contabilità
  }
  if (fg === 'SRLU') {
    auto.numero_soci = 1;
  }
  if (fg === 'COOP') {
    auto.regime_fiscale = 'Ordinario';
    auto.tipo_contabilita = 'Ordinaria';
  }
  return auto;
}

/* ═══════════════════════════════════════════════════════
   STEP OPZIONALI — solo quelli utili per la forma giuridica
   Non sono vincolanti: l'utente può saltarli tutti
   ═══════════════════════════════════════════════════════ */
function getOptionalSteps(fg) {
  if (!fg) return [];
  
  const CAPITALI = ['SRL', 'SRLU', 'SPA', 'SAPA', 'SE'];
  const CON_IRAP = ['SRL', 'SRLU', 'SPA', 'SAPA', 'SE', 'SNC', 'SAS', 'COOP', 'Ditta individuale'];
  
  const steps = [];
  
  // Regione (per IRAP) — non per RF e SS
  if (CON_IRAP.includes(fg)) steps.push('regione');
  
  // ATECO — utile per tutti
  steps.push('ateco_code');
  
  // Gestione INPS — per RF, Ditta, SNC, SAS (per capitali è automatico GS)
  if (['RF', 'Ditta individuale', 'SNC', 'SAS', 'SS'].includes(fg)) {
    steps.push('gestione_inps');
  }
  
  // Riduzione INPS 35% — solo forfettario
  if (fg === 'RF') {
    steps.push('riduzione_contributiva_forfettario');
  }
  
  return steps;
}

/* ═══════════════════════════════════════════════════════
   COMPONENTE PRINCIPALE
   ═══════════════════════════════════════════════════════ */
export default function FiscalPreFlightPopup({ user, onComplete }) {
  const [values, setValues] = useState({
    forma_giuridica: user?.forma_giuridica || null,
    regime_fiscale: user?.regime_fiscale || null,
    regione: user?.regione || null,
    ateco_code: user?.ateco_code || '',
    gestione_inps: user?.gestione_inps || null,
    riduzione_contributiva_forfettario: user?.riduzione_contributiva_forfettario ?? null,
  });
  const [phase, setPhase] = useState('forma'); // 'forma' | 'optional' | null
  const [optIdx, setOptIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  const fg = values.forma_giuridica;
  const autoValues = useMemo(() => fg ? getAutoValues(fg) : {}, [fg]);
  const optSteps = useMemo(() => getOptionalSteps(fg), [fg]);

  // Mostra info coerenza basata sulla forma giuridica selezionata
  const getCoherenceNote = useCallback((selectedFG) => {
    const CAPITALI = ['SRL', 'SRLU', 'SPA', 'SAPA', 'SE'];
    if (CAPITALI.includes(selectedFG)) {
      return '→ Regime Ordinario, contabilità ordinaria, INPS Gest. Separata per amm.re';
    }
    if (selectedFG === 'RF') {
      return '→ Imposta sostitutiva 5% o 15%, no IRAP, no IVA';
    }
    if (selectedFG === 'Ditta individuale') {
      return '→ IRPEF ordinaria, IRAP, IVA';
    }
    if (['SNC', 'SAS'].includes(selectedFG)) {
      return '→ Tassazione per trasparenza (IRPEF sui soci), IRAP';
    }
    if (selectedFG === 'COOP') {
      return '→ IRES (con agevolazioni se mutualità prevalente), IRAP';
    }
    return '';
  }, []);

  const handleSelectForma = (selectedFG) => {
    const auto = getAutoValues(selectedFG);
    setValues(prev => ({
      ...prev,
      forma_giuridica: selectedFG,
      // Applica valori automatici
      regime_fiscale: auto.regime_fiscale || prev.regime_fiscale,
      gestione_inps: auto.gestione_inps || prev.gestione_inps,
    }));
  };

  const handleConfirmForma = () => {
    if (!fg) return;
    const steps = getOptionalSteps(fg);
    
    // Filtra step che hanno già un valore dal profilo
    const missingSteps = steps.filter(s => {
      if (s === 'regione') return !values.regione;
      if (s === 'ateco_code') return !values.ateco_code;
      if (s === 'gestione_inps') return !values.gestione_inps;
      if (s === 'riduzione_contributiva_forfettario') return values.riduzione_contributiva_forfettario === null;
      return true;
    });
    
    if (missingSteps.length > 0) {
      setPhase('optional');
      setOptIdx(0);
    } else {
      // Tutto già compilato dal profilo
      finalize();
    }
  };

  const handleSkipStep = () => {
    // Filtra step mancanti
    const missingSteps = optSteps.filter(s => {
      if (s === 'regione') return !values.regione;
      if (s === 'ateco_code') return !values.ateco_code;
      if (s === 'gestione_inps') return !values.gestione_inps;
      if (s === 'riduzione_contributiva_forfettario') return values.riduzione_contributiva_forfettario === null;
      return true;
    });
    
    if (optIdx < missingSteps.length - 1) {
      setOptIdx(prev => prev + 1);
    } else {
      finalize();
    }
  };

  const handleNextOptional = () => {
    const missingSteps = optSteps.filter(s => {
      if (s === 'regione') return !values.regione;
      if (s === 'ateco_code') return !values.ateco_code;
      if (s === 'gestione_inps') return !values.gestione_inps;
      if (s === 'riduzione_contributiva_forfettario') return values.riduzione_contributiva_forfettario === null;
      return true;
    });
    
    if (optIdx < missingSteps.length - 1) {
      setOptIdx(prev => prev + 1);
    } else {
      finalize();
    }
  };

  const finalize = async () => {
    setSaving(true);
    const updateData = { ...autoValues };
    
    if (values.forma_giuridica) updateData.forma_giuridica = values.forma_giuridica;
    if (values.regione) updateData.regione = values.regione;
    if (values.ateco_code) updateData.ateco_code = values.ateco_code;
    if (values.gestione_inps) updateData.gestione_inps = values.gestione_inps;
    if (values.riduzione_contributiva_forfettario !== null) {
      updateData.riduzione_contributiva_forfettario = values.riduzione_contributiva_forfettario;
    }
    if (values.regime_fiscale) updateData.regime_fiscale = values.regime_fiscale;

    await base44.auth.updateMe(updateData);
    setSaving(false);
    onComplete({ ...values, ...updateData });
  };

  const handleSkipAll = () => {
    // Permetti di entrare nel simulatore anche senza dati
    // Il simulatore userà i default (SRL)
    onComplete(values);
  };

  // ═══ FASE 1: Selezione forma giuridica ═══
  if (phase === 'forma') {
    const categories = [
      { key: 'capitale', label: 'Società di capitali', emoji: '🏢' },
      { key: 'persona',  label: 'Persona fisica / P.IVA', emoji: '👤' },
      { key: 'persone',  label: 'Società di persone', emoji: '👥' },
      { key: 'coop',     label: 'Cooperativa', emoji: '🤝' },
    ];

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4">
        <div className="bg-[#0a2540] border border-[#1a3a5c] rounded-2xl w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-5 pb-3 text-center shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div />
              <button onClick={handleSkipAll} className="text-slate-500 hover:text-slate-300 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#d4af37]/15 flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-6 h-6 text-[#d4af37]" />
            </div>
            <h2 className="text-white text-lg font-bold">Che tipo di impresa hai?</h2>
            <p className="text-slate-400 text-sm mt-1">Il simulatore si adatta alla tua forma giuridica</p>
          </div>

          {/* Lista forme per categoria */}
          <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-4">
            {categories.map(cat => {
              const items = FORME_GIURIDICHE.filter(f => f.cat === cat.key);
              return (
                <div key={cat.key}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">{cat.emoji}</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{cat.label}</span>
                  </div>
                  <div className="space-y-1.5">
                    {items.map(f => (
                      <button key={f.value} onClick={() => handleSelectForma(f.value)}
                        className={`w-full flex items-center justify-between py-3 px-4 rounded-xl text-left transition-all ${
                          fg === f.value 
                            ? 'bg-[#d4af37] text-slate-900' 
                            : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
                        }`}>
                        <div>
                          <span className="text-sm font-medium block">{f.label}</span>
                          <span className={`text-[10px] ${fg === f.value ? 'text-slate-700' : 'text-slate-500'}`}>
                            {f.desc}
                          </span>
                        </div>
                        {fg === f.value && <Check className="w-4 h-4 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Nota coerenza + bottone */}
          <div className="p-4 pt-2 shrink-0 space-y-2">
            {fg && (
              <div className="bg-slate-800/60 rounded-lg px-3 py-2 text-center">
                <p className="text-[#d4af37] text-[11px] font-medium">{getCoherenceNote(fg)}</p>
              </div>
            )}
            <button
              onClick={handleConfirmForma}
              disabled={!fg}
              className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                fg ? 'bg-[#d4af37] text-slate-900 hover:bg-[#c9a432]' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}>
              Continua <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={handleSkipAll}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Salta e usa valori predefiniti (SRL)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══ FASE 2: Step opzionali (non vincolanti) ═══
  if (phase === 'optional') {
    const missingSteps = optSteps.filter(s => {
      if (s === 'regione') return !values.regione;
      if (s === 'ateco_code') return !values.ateco_code;
      if (s === 'gestione_inps') return !values.gestione_inps;
      if (s === 'riduzione_contributiva_forfettario') return values.riduzione_contributiva_forfettario === null;
      return true;
    });

    if (missingSteps.length === 0 || optIdx >= missingSteps.length) {
      finalize();
      return null;
    }

    const currentStep = missingSteps[optIdx];
    
    const stepCfg = {
      regione: { icon: MapPin, title: 'Regione Sede Legale', desc: 'Per calcolare l\'aliquota IRAP regionale' },
      ateco_code: { icon: Hash, title: 'Codice ATECO', desc: fg === 'RF' ? 'Determina il coefficiente di redditività' : 'Per classificazione e aliquote settoriali' },
      gestione_inps: { icon: Briefcase, title: 'Gestione INPS', desc: 'A quale gestione previdenziale sei iscritto?' },
      riduzione_contributiva_forfettario: { icon: Percent, title: 'Riduzione INPS 35%', desc: 'Hai richiesto la riduzione contributiva forfettari?' },
    };

    const cfg = stepCfg[currentStep];
    if (!cfg) { finalize(); return null; }
    const Icon = cfg.icon;

    const canNext = (() => {
      switch (currentStep) {
        case 'regione': return !!values.regione;
        case 'ateco_code': return !!values.ateco_code;
        case 'gestione_inps': return !!values.gestione_inps;
        case 'riduzione_contributiva_forfettario': return values.riduzione_contributiva_forfettario !== null;
        default: return true;
      }
    })();

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4">
        <div className="bg-[#0a2540] border border-[#1a3a5c] rounded-2xl w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden">
          {/* Progress */}
          <div className="px-5 pt-4 flex gap-1">
            {missingSteps.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= optIdx ? 'bg-[#d4af37]' : 'bg-slate-700'}`} />
            ))}
          </div>

          {/* Header */}
          <div className="p-5 pb-3 text-center shrink-0">
            <div className="w-12 h-12 rounded-full bg-[#d4af37]/15 flex items-center justify-center mx-auto mb-3">
              <Icon className="w-6 h-6 text-[#d4af37]" />
            </div>
            <h2 className="text-white text-lg font-bold">{cfg.title}</h2>
            <p className="text-slate-400 text-sm mt-1">{cfg.desc}</p>
            <p className="text-slate-600 text-xs mt-2">
              Opzionale — {optIdx + 1} di {missingSteps.length}
            </p>
          </div>

          {/* Contenuto */}
          <div className="flex-1 overflow-y-auto px-4 pb-2">
            <OptionalStepContent step={currentStep} values={values} setValues={setValues} fg={fg} />
          </div>

          {/* Bottoni */}
          <div className="p-4 pt-2 shrink-0 space-y-2">
            <button
              onClick={handleNextOptional}
              disabled={!canNext}
              className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                canNext ? 'bg-[#d4af37] text-slate-900 hover:bg-[#c9a432]' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}>
              {saving ? 'Salvataggio...' : optIdx === missingSteps.length - 1 ? 'Conferma e simula' : 'Avanti'}
              {!saving && canNext && <ChevronRight className="w-4 h-4" />}
            </button>
            <button onClick={handleSkipStep}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Salta questo passaggio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/* ═══════════════════════════════════════════════════════
   STEP OPZIONALI — Contenuto
   ═══════════════════════════════════════════════════════ */
function OptionalStepContent({ step, values, setValues, fg }) {
  if (step === 'regione') {
    return (
      <div className="grid gap-1.5">
        {REGIONI.map(r => (
          <OptionButton key={r} label={r} selected={values.regione === r} small
            onClick={() => setValues(prev => ({ ...prev, regione: r }))} />
        ))}
      </div>
    );
  }

  if (step === 'ateco_code') {
    return (
      <div className="space-y-3">
        <AtecoSearchInput value={values.ateco_code} onChange={(v) => setValues(prev => ({ ...prev, ateco_code: v }))} />
        {values.ateco_code && (
          <div className="bg-slate-800/60 rounded-xl p-3 flex items-center gap-2">
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-green-300 text-sm font-medium">{values.ateco_code}</span>
          </div>
        )}
        {fg === 'RF' && (
          <p className="text-amber-400/70 text-[10px] text-center mt-1">
            Nel forfettario, il codice ATECO determina il coefficiente di redditività (40%-86%)
          </p>
        )}
      </div>
    );
  }

  if (step === 'gestione_inps') {
    let options = [];
    if (fg === 'RF' || fg === 'Ditta individuale') {
      options = [
        { value: 'Commercianti', label: 'Gestione Commercianti', desc: 'Commercio, servizi, intermediazione' },
        { value: 'Artigiani', label: 'Gestione Artigiani', desc: 'Artigianato, manifattura, edilizia' },
        { value: 'Gestione separata', label: 'Gestione Separata', desc: 'Professionisti senza cassa di categoria' },
        { value: 'Cassa professionale', label: 'Cassa Professionale', desc: 'Avvocati, ingegneri, architetti, medici...' },
      ];
    } else if (fg === 'SNC' || fg === 'SAS') {
      options = [
        { value: 'Commercianti', label: 'Gestione Commercianti', desc: 'Attività commerciali e di servizi' },
        { value: 'Artigiani', label: 'Gestione Artigiani', desc: 'Attività artigianali e manifatturiere' },
      ];
    } else {
      options = [
        { value: 'Commercianti', label: 'Gestione Commercianti', desc: 'Attività commerciali' },
        { value: 'Artigiani', label: 'Gestione Artigiani', desc: 'Attività artigianali' },
        { value: 'Gestione separata', label: 'Gestione Separata', desc: 'Professionisti / collaboratori' },
      ];
    }
    return (
      <div className="grid gap-2">
        {options.map(opt => (
          <OptionButton key={opt.value} label={opt.label} desc={opt.desc}
            selected={values.gestione_inps === opt.value}
            onClick={() => setValues(prev => ({ ...prev, gestione_inps: opt.value }))} />
        ))}
      </div>
    );
  }

  if (step === 'riduzione_contributiva_forfettario') {
    return (
      <div className="grid gap-2">
        <OptionButton label="Sì, riduzione 35%" desc="Contributi INPS ridotti — va richiesta entro il 28/02"
          selected={values.riduzione_contributiva_forfettario === true}
          onClick={() => setValues(prev => ({ ...prev, riduzione_contributiva_forfettario: true }))} />
        <OptionButton label="No, contributi pieni" desc="Importo pieno senza riduzione"
          selected={values.riduzione_contributiva_forfettario === false}
          onClick={() => setValues(prev => ({ ...prev, riduzione_contributiva_forfettario: false }))} />
      </div>
    );
  }

  return null;
}

function OptionButton({ label, desc, selected, onClick, small }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center justify-between ${small ? 'py-2.5' : 'py-3'} px-4 rounded-xl text-left transition-all ${
        selected ? 'bg-[#d4af37] text-slate-900' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
      }`}>
      <div>
        <span className="text-sm font-medium block">{label}</span>
        {desc && <span className={`text-[10px] ${selected ? 'text-slate-700' : 'text-slate-500'}`}>{desc}</span>}
      </div>
      {selected && <Check className="w-4 h-4 shrink-0" />}
    </button>
  );
}