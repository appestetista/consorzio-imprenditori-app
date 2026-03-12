import React, { useState, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Building2, Check, ChevronRight, FileText, MapPin, Hash, CalendarClock, Users, Landmark, Briefcase, BookOpen, Calendar as CalendarIcon } from 'lucide-react';
import AtecoSearchInput from './AtecoSearchInput';
import { Input } from '@/components/ui/input';

const FORME_GIURIDICHE = [
  { value: 'Ditta individuale', label: 'Ditta individuale' },
  { value: 'RF', label: 'Regime Forfettario' },
  { value: 'SRL', label: 'S.R.L.' },
  { value: 'SRLU', label: 'S.R.L. Unipersonale' },
  { value: 'SNC', label: 'S.N.C.' },
  { value: 'SAS', label: 'S.A.S.' },
  { value: 'SPA', label: 'S.P.A.' },
  { value: 'SAPA', label: 'S.A.P.A.' },
  { value: 'SS', label: 'Società Semplice' },
  { value: 'COOP', label: 'Cooperativa' },
  { value: 'SE', label: 'Società Europea' },
  { value: 'Altro', label: 'Altro' },
];

const REGIMI_FISCALI = [
  { value: 'Forfettario', label: 'Forfettario' },
  { value: 'Ordinario', label: 'Ordinario' },
];

const REGIONI = [
  'Abruzzo','Basilicata','Calabria','Campania','Emilia-Romagna','Friuli Venezia Giulia',
  'Lazio','Liguria','Lombardia','Marche','Molise','Piemonte','Puglia','Sardegna',
  'Sicilia','Toscana','Trentino-Alto Adige','Umbria',"Valle d'Aosta",'Veneto'
];

// Forme giuridiche che sono società (hanno soci)
const SOCIETA_CON_SOCI = ['SRL', 'SNC', 'SAS', 'SPA', 'SAPA', 'SS', 'COOP', 'SE'];
// Forme che richiedono capitale sociale
const CON_CAPITALE_SOCIALE = ['SRL', 'SRLU', 'SPA', 'SAPA', 'SE', 'COOP'];
// Forme che possono avere compenso amministratore
const CON_COMPENSO_AMM = ['SRL', 'SRLU', 'SPA', 'SAPA', 'SE'];
// Forme con contabilità ordinaria obbligatoria (le altre possono scegliere)
const CONTABILITA_OBBLIGATA_ORDINARIA = ['SRL', 'SRLU', 'SPA', 'SAPA', 'SE', 'COOP'];

/**
 * Popup multi-step che raccoglie i dati fiscali mancanti.
 * Gli step sono DINAMICI: dipendono dalla forma giuridica.
 */
export default function FiscalPreFlightPopup({ user, onComplete }) {
  const [values, setValues] = useState({
    forma_giuridica: user?.forma_giuridica || null,
    regime_fiscale: user?.regime_fiscale || null,
    regione: user?.regione || user?.region || null,
    ateco_code: user?.ateco_code || '',
    periodicita_iva: user?.periodicita_iva || null,
    founding_date: user?.founding_date || '',
    numero_soci: user?.numero_soci || null,
    capitale_sociale: user?.capitale_sociale || null,
    gestione_inps: user?.gestione_inps || null,
    ha_compenso_amministratore: user?.ha_compenso_amministratore ?? null,
    tipo_contabilita: user?.tipo_contabilita || null,
  });
  const [saving, setSaving] = useState(false);

  // Ricalcola gli step necessari in base alla forma giuridica corrente
  const missingSteps = useMemo(() => {
    const fg = values.forma_giuridica || user?.forma_giuridica;
    const steps = [];
    
    // Step base — sempre necessari
    if (!user?.forma_giuridica) steps.push('forma_giuridica');
    if (!user?.regime_fiscale && fg !== 'RF') steps.push('regime_fiscale');
    if (!user?.regione && !user?.region) steps.push('regione');
    if (!user?.ateco_code) steps.push('ateco_code');
    
    // Step condizionali in base alla forma giuridica
    if (fg) {
      if (!user?.founding_date) steps.push('founding_date');
      
      if (SOCIETA_CON_SOCI.includes(fg) && !user?.numero_soci) steps.push('numero_soci');
      
      if (CON_CAPITALE_SOCIALE.includes(fg) && !user?.capitale_sociale) steps.push('capitale_sociale');
      
      if (!user?.gestione_inps && fg !== 'RF') steps.push('gestione_inps');
      
      if (CON_COMPENSO_AMM.includes(fg) && user?.ha_compenso_amministratore == null) steps.push('ha_compenso_amministratore');
      
      if (!CONTABILITA_OBBLIGATA_ORDINARIA.includes(fg) && fg !== 'RF' && !user?.tipo_contabilita) steps.push('tipo_contabilita');
      
      if (!user?.periodicita_iva && fg !== 'RF') steps.push('periodicita_iva');
    }
    
    return steps;
  }, [user, values.forma_giuridica]);

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const currentStep = missingSteps[currentStepIdx];
  const isLastStep = currentStepIdx === missingSteps.length - 1;

  const canProceed = useCallback(() => {
    if (!currentStep) return false;
    if (currentStep === 'forma_giuridica') return !!values.forma_giuridica;
    if (currentStep === 'regime_fiscale') return !!values.regime_fiscale;
    if (currentStep === 'regione') return !!values.regione;
    if (currentStep === 'ateco_code') return !!values.ateco_code;
    if (currentStep === 'periodicita_iva') return !!values.periodicita_iva;
    if (currentStep === 'founding_date') return !!values.founding_date;
    if (currentStep === 'numero_soci') return values.numero_soci > 0;
    if (currentStep === 'capitale_sociale') return values.capitale_sociale > 0;
    if (currentStep === 'gestione_inps') return !!values.gestione_inps;
    if (currentStep === 'ha_compenso_amministratore') return values.ha_compenso_amministratore !== null;
    if (currentStep === 'tipo_contabilita') return !!values.tipo_contabilita;
    return true;
  }, [currentStep, values]);

  const handleNext = async () => {
    // Dopo la forma giuridica, ricalcola gli step (gli step condizionali cambiano)
    if (currentStep === 'forma_giuridica') {
      // Il useMemo si aggiornerà automaticamente perché values.forma_giuridica cambia
      setCurrentStepIdx(prev => prev + 1);
      return;
    }

    if (isLastStep) {
      setSaving(true);
      const updateData = {};
      // Salva solo i campi che erano mancanti
      const allFields = ['forma_giuridica', 'regime_fiscale', 'regione', 'ateco_code', 
        'periodicita_iva', 'founding_date', 'numero_soci', 'capitale_sociale',
        'gestione_inps', 'ha_compenso_amministratore', 'tipo_contabilita'];
      
      for (const field of allFields) {
        if (missingSteps.includes(field) && values[field] !== null && values[field] !== '') {
          updateData[field] = values[field];
        }
      }
      
      // Se è RF, imposta automaticamente il regime
      if (values.forma_giuridica === 'RF') {
        updateData.regime_fiscale = 'Forfettario';
      }
      // Se contabilità obbligata ordinaria, imposta automaticamente
      if (CONTABILITA_OBBLIGATA_ORDINARIA.includes(values.forma_giuridica)) {
        updateData.tipo_contabilita = 'Ordinaria';
      }

      await base44.auth.updateMe(updateData);
      setSaving(false);
      onComplete({ ...values, ...updateData });
    } else {
      setCurrentStepIdx(prev => prev + 1);
    }
  };

  if (missingSteps.length === 0) return null;

  const stepConfig = {
    forma_giuridica: { icon: Building2, title: 'Forma Giuridica', desc: 'Seleziona il tipo di società' },
    regime_fiscale: { icon: FileText, title: 'Regime Fiscale', desc: 'Quale regime fiscale applichi?' },
    regione: { icon: MapPin, title: 'Regione Sede Legale', desc: 'Serve per calcolare IRAP regionale' },
    ateco_code: { icon: Hash, title: 'Codice ATECO', desc: 'Codice attività per aliquote corrette' },
    periodicita_iva: { icon: CalendarClock, title: 'Periodicità IVA', desc: "Liquidi l'IVA mensilmente o trimestralmente?" },
    founding_date: { icon: CalendarIcon, title: 'Data Costituzione', desc: "Quando è stata costituita l'impresa?" },
    numero_soci: { icon: Users, title: 'Numero Soci', desc: 'Quanti soci ha la società?' },
    capitale_sociale: { icon: Landmark, title: 'Capitale Sociale', desc: 'Capitale sociale versato in euro' },
    gestione_inps: { icon: Briefcase, title: 'Gestione INPS', desc: 'A quale gestione previdenziale sei iscritto?' },
    ha_compenso_amministratore: { icon: Briefcase, title: 'Compenso Amministratore', desc: "L'amministratore percepisce un compenso?" },
    tipo_contabilita: { icon: BookOpen, title: 'Tipo Contabilità', desc: 'Che tipo di contabilità adotti?' },
  };

  const cfg = stepConfig[currentStep];
  if (!cfg) return null;
  const Icon = cfg.icon;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4">
      <div className="bg-[#0a2540] border border-[#1a3a5c] rounded-2xl w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden">
        {/* Progress */}
        <div className="px-5 pt-4 flex gap-1">
          {missingSteps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= currentStepIdx ? 'bg-[#d4af37]' : 'bg-slate-700'}`} />
          ))}
        </div>

        {/* Header */}
        <div className="p-5 pb-3 text-center shrink-0">
          <div className="w-12 h-12 rounded-full bg-[#d4af37]/15 flex items-center justify-center mx-auto mb-3">
            <Icon className="w-6 h-6 text-[#d4af37]" />
          </div>
          <h2 className="text-white text-lg font-bold">{cfg.title}</h2>
          <p className="text-slate-400 text-sm mt-1">{cfg.desc}</p>
          <p className="text-slate-600 text-xs mt-2">Passo {currentStepIdx + 1} di {missingSteps.length}</p>
        </div>

        {/* Contenuto step */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          <StepContent step={currentStep} values={values} setValues={setValues} />
        </div>

        {/* Bottone */}
        <div className="p-4 pt-3 shrink-0">
          <button
            onClick={handleNext}
            disabled={!canProceed() || saving}
            className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              canProceed()
                ? 'bg-[#d4af37] text-slate-900 hover:bg-[#c9a432]'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {saving ? 'Salvataggio...' : isLastStep ? 'Conferma e continua' : 'Avanti'}
            {!isLastStep && canProceed() && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Componente per ogni singolo step — mantiene il file leggibile */
function StepContent({ step, values, setValues }) {
  if (step === 'forma_giuridica') {
    return (
      <div className="grid gap-2">
        {FORME_GIURIDICHE.map(fg => (
          <OptionButton key={fg.value} label={fg.label} selected={values.forma_giuridica === fg.value}
            onClick={() => setValues(prev => ({ ...prev, forma_giuridica: fg.value }))} />
        ))}
      </div>
    );
  }

  if (step === 'regime_fiscale') {
    return (
      <div className="grid gap-2">
        {REGIMI_FISCALI.map(rf => (
          <OptionButton key={rf.value} label={rf.label} selected={values.regime_fiscale === rf.value}
            onClick={() => setValues(prev => ({ ...prev, regime_fiscale: rf.value }))} />
        ))}
      </div>
    );
  }

  if (step === 'regione') {
    return (
      <div className="grid gap-2">
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
      </div>
    );
  }

  if (step === 'founding_date') {
    return (
      <div className="space-y-3">
        <Input
          type="date"
          value={values.founding_date || ''}
          onChange={(e) => setValues(prev => ({ ...prev, founding_date: e.target.value }))}
          className="bg-slate-800 border-slate-700 text-white text-sm"
          max={new Date().toISOString().split('T')[0]}
        />
        {values.founding_date && (
          <div className="bg-slate-800/60 rounded-xl p-3 text-center">
            <span className="text-slate-400 text-xs">Anni di attività: </span>
            <span className="text-[#d4af37] text-sm font-bold">
              {Math.floor((Date.now() - new Date(values.founding_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))}
            </span>
          </div>
        )}
      </div>
    );
  }

  if (step === 'numero_soci') {
    return (
      <div className="space-y-3">
        <Input
          type="number"
          min="2"
          placeholder="Inserisci numero soci..."
          value={values.numero_soci || ''}
          onChange={(e) => setValues(prev => ({ ...prev, numero_soci: parseInt(e.target.value) || null }))}
          className="bg-slate-800 border-slate-700 text-white text-sm text-center text-lg"
        />
        <p className="text-slate-500 text-[10px] text-center">Il numero dei soci influisce sulla ripartizione degli utili e dei contributi</p>
      </div>
    );
  }

  if (step === 'capitale_sociale') {
    return (
      <div className="space-y-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">€</span>
          <Input
            type="number"
            min="1"
            placeholder="10.000"
            value={values.capitale_sociale || ''}
            onChange={(e) => setValues(prev => ({ ...prev, capitale_sociale: parseFloat(e.target.value) || null }))}
            className="bg-slate-800 border-slate-700 text-white text-sm pl-8 text-center text-lg"
          />
        </div>
        <p className="text-slate-500 text-[10px] text-center">Capitale sociale effettivamente versato</p>
      </div>
    );
  }

  if (step === 'gestione_inps') {
    const options = [
      { value: 'Commercianti', label: 'Gestione Commercianti', desc: 'Attività commerciali e di servizi' },
      { value: 'Artigiani', label: 'Gestione Artigiani', desc: 'Attività artigianali e manifatturiere' },
      { value: 'Gestione separata', label: 'Gestione Separata', desc: 'Professionisti senza cassa, collaboratori' },
      { value: 'Cassa professionale', label: 'Cassa Professionale', desc: 'INARCASSA, Cassa Forense, ENPAM...' },
      { value: 'Non iscritto', label: 'Non iscritto INPS', desc: 'Nessuna gestione previdenziale diretta' },
    ];
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

  if (step === 'ha_compenso_amministratore') {
    return (
      <div className="grid gap-2">
        <OptionButton label="Sì, l'amministratore ha un compenso" desc="Compenso tassato come reddito assimilato a lavoro dipendente"
          selected={values.ha_compenso_amministratore === true}
          onClick={() => setValues(prev => ({ ...prev, ha_compenso_amministratore: true }))} />
        <OptionButton label="No, amministra a titolo gratuito" desc="Nessun compenso — solo eventuale distribuzione utili"
          selected={values.ha_compenso_amministratore === false}
          onClick={() => setValues(prev => ({ ...prev, ha_compenso_amministratore: false }))} />
      </div>
    );
  }

  if (step === 'tipo_contabilita') {
    return (
      <div className="grid gap-2">
        <OptionButton label="Ordinaria" desc="Obbligatoria sopra certi limiti di ricavi"
          selected={values.tipo_contabilita === 'Ordinaria'}
          onClick={() => setValues(prev => ({ ...prev, tipo_contabilita: 'Ordinaria' }))} />
        <OptionButton label="Semplificata" desc="Per imprese sotto i limiti di legge"
          selected={values.tipo_contabilita === 'Semplificata'}
          onClick={() => setValues(prev => ({ ...prev, tipo_contabilita: 'Semplificata' }))} />
      </div>
    );
  }

  if (step === 'periodicita_iva') {
    return (
      <div className="grid gap-2">
        <OptionButton label="Mensile" desc="Liquidazione IVA ogni mese (fatturato > €400K)"
          selected={values.periodicita_iva === 'Mensile'}
          onClick={() => setValues(prev => ({ ...prev, periodicita_iva: 'Mensile' }))} />
        <OptionButton label="Trimestrale" desc="Liquidazione IVA ogni 3 mesi"
          selected={values.periodicita_iva === 'Trimestrale'}
          onClick={() => setValues(prev => ({ ...prev, periodicita_iva: 'Trimestrale' }))} />
      </div>
    );
  }

  return null;
}

/** Bottone opzione riutilizzabile */
function OptionButton({ label, desc, selected, onClick, small }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between ${small ? 'py-2.5' : 'py-3'} px-4 rounded-xl text-left transition-all ${
        selected
          ? 'bg-[#d4af37] text-slate-900'
          : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
      }`}
    >
      <div>
        <span className="text-sm font-medium block">{label}</span>
        {desc && <span className={`text-[10px] ${selected ? 'text-slate-700' : 'text-slate-500'}`}>{desc}</span>}
      </div>
      {selected && <Check className="w-4 h-4 shrink-0" />}
    </button>
  );
}