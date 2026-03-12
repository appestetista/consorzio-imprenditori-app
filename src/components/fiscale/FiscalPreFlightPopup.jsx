import React, { useState, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Building2, Check, ChevronRight, FileText, MapPin, Hash, CalendarClock, Users, Landmark, Briefcase, BookOpen, Calendar as CalendarIcon, Shield, Percent, HandCoins } from 'lucide-react';
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

/*
 * MATRICE REQUISITI PER FORMA GIURIDICA
 * Ogni forma giuridica ha requisiti specifici per il simulatore fiscale.
 * 
 * RF (Forfettario): ATECO (coeff. redditività), data cost. (aliquota 5%/15%), gestione INPS, riduzione 35%
 * Ditta individuale: regime, ATECO, regione (IRAP), gestione INPS (Comm/Art), contabilità, periodicità IVA, data cost.
 * SRL: regime, ATECO, regione, n.soci, capitale, gestione INPS, compenso amm., periodicità IVA, data cost.
 * SRLU: come SRL ma soci=1 automatico
 * SNC: regime, ATECO, regione, n.soci, gestione INPS (tutti obbligati), contabilità, periodicità IVA, data cost.
 * SAS: regime, ATECO, regione, soci accomandatari+accomandanti, gestione INPS, contabilità, periodicità IVA, data cost.
 * SPA/SAPA/SE: regime, ATECO, regione, n.soci, capitale, compenso amm., periodicità IVA, data cost.
 * SS: ATECO, regione, n.soci, gestione INPS, data cost. (no IVA, no contabilità obbligatoria)
 * COOP: regime, ATECO, regione, n.soci, capitale, tipo coop, mutualità prevalente, periodicità IVA, data cost.
 */

function computeMissingSteps(user, currentValues) {
  const fg = currentValues.forma_giuridica || user?.forma_giuridica;
  const steps = [];

  // 1. Forma giuridica — sempre primo step se manca
  if (!user?.forma_giuridica) steps.push('forma_giuridica');

  // Senza forma giuridica non possiamo sapere cos'altro serve
  if (!fg) return steps;

  // 2. Regime fiscale — non serve per RF (è forfettario per definizione) e SS (no attività commerciale)
  if (!user?.regime_fiscale && fg !== 'RF' && fg !== 'SS') {
    steps.push('regime_fiscale');
  }

  // 3. Regione — serve per IRAP. Non serve per RF (no IRAP) e SS (normalmente no IRAP)
  if (!user?.regione && !user?.region && fg !== 'RF' && fg !== 'SS') {
    steps.push('regione');
  }

  // 4. ATECO — serve sempre (per RF determina coefficiente redditività, per altri IRAP/classificazione)
  if (!user?.ateco_code) steps.push('ateco_code');

  // 5. Data costituzione — serve sempre (per RF determina aliquota 5%/15%, per altri agevolazioni startup)
  if (!user?.founding_date) steps.push('founding_date');

  // 6. Numero soci — per società con più soci
  //    SRLU = 1 socio per definizione, non chiediamo
  //    SAS ha logica separata (accomandatari/accomandanti)
  const CHIEDI_NUMERO_SOCI = ['SRL', 'SNC', 'SPA', 'SAPA', 'SS', 'COOP', 'SE'];
  if (CHIEDI_NUMERO_SOCI.includes(fg) && !user?.numero_soci) {
    steps.push('numero_soci');
  }

  // 7. Soci SAS — logica specifica: accomandatari (INPS obbligatorio) e accomandanti
  if (fg === 'SAS' && (!user?.soci_accomandatari || !user?.soci_accomandanti)) {
    steps.push('soci_sas');
  }

  // 8. Capitale sociale — obbligatorio per società di capitali
  const CON_CAPITALE = ['SRL', 'SRLU', 'SPA', 'SAPA', 'SE', 'COOP'];
  if (CON_CAPITALE.includes(fg) && !user?.capitale_sociale) {
    steps.push('capitale_sociale');
  }

  // 9. Gestione INPS — serve quasi sempre
  //    RF: serve (Commercianti/Artigiani/Gest.Separata)
  //    Ditta individuale: serve (Commercianti/Artigiani)
  //    SRL/SRLU: serve (soci lavoratori)
  //    SNC: tutti i soci obbligati (Commercianti/Artigiani)
  //    SAS: solo accomandatari
  //    SPA/SAPA/SE: solo se soci lavoratori (chiedere comunque)
  //    SS: se svolge attività professionale
  //    COOP: soci lavoratori
  if (!user?.gestione_inps) {
    steps.push('gestione_inps');
  }

  // 10. Riduzione contributiva 35% — SOLO per forfettario
  if (fg === 'RF' && user?.riduzione_contributiva_forfettario == null) {
    steps.push('riduzione_contributiva_forfettario');
  }

  // 11. Compenso amministratore — società di capitali
  const CON_COMPENSO = ['SRL', 'SRLU', 'SPA', 'SAPA', 'SE'];
  if (CON_COMPENSO.includes(fg) && user?.ha_compenso_amministratore == null) {
    steps.push('ha_compenso_amministratore');
  }

  // 12. Tipo cooperativa + mutualità prevalente — solo COOP
  if (fg === 'COOP') {
    if (!user?.tipo_cooperativa) steps.push('tipo_cooperativa');
    if (user?.mutualita_prevalente == null) steps.push('mutualita_prevalente');
  }

  // 13. Tipo contabilità — solo per chi può scegliere (Ditta, SNC, SAS, SS)
  //     SRL/SPA/COOP hanno contabilità ordinaria obbligatoria
  //     RF non ha contabilità
  const PUO_SCEGLIERE_CONTABILITA = ['Ditta individuale', 'SNC', 'SAS', 'SS', 'Altro'];
  if (PUO_SCEGLIERE_CONTABILITA.includes(fg) && !user?.tipo_contabilita) {
    steps.push('tipo_contabilita');
  }

  // 14. Periodicità IVA — non serve per RF (esente IVA) e SS (normalmente no IVA)
  if (!user?.periodicita_iva && fg !== 'RF' && fg !== 'SS') {
    steps.push('periodicita_iva');
  }

  return steps;
}

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
    tipo_cooperativa: user?.tipo_cooperativa || null,
    mutualita_prevalente: user?.mutualita_prevalente ?? null,
    soci_accomandatari: user?.soci_accomandatari || null,
    soci_accomandanti: user?.soci_accomandanti || null,
    riduzione_contributiva_forfettario: user?.riduzione_contributiva_forfettario ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  const missingSteps = useMemo(() => {
    return computeMissingSteps(user, values);
  }, [user, values.forma_giuridica]);

  const currentStep = missingSteps[currentStepIdx];
  const isLastStep = currentStepIdx === missingSteps.length - 1;

  const canProceed = useCallback(() => {
    if (!currentStep) return false;
    const v = values;
    switch (currentStep) {
      case 'forma_giuridica': return !!v.forma_giuridica;
      case 'regime_fiscale': return !!v.regime_fiscale;
      case 'regione': return !!v.regione;
      case 'ateco_code': return !!v.ateco_code;
      case 'periodicita_iva': return !!v.periodicita_iva;
      case 'founding_date': return !!v.founding_date;
      case 'numero_soci': return v.numero_soci > 0;
      case 'soci_sas': return v.soci_accomandatari > 0 && v.soci_accomandanti > 0;
      case 'capitale_sociale': return v.capitale_sociale > 0;
      case 'gestione_inps': return !!v.gestione_inps;
      case 'ha_compenso_amministratore': return v.ha_compenso_amministratore !== null;
      case 'tipo_contabilita': return !!v.tipo_contabilita;
      case 'tipo_cooperativa': return !!v.tipo_cooperativa;
      case 'mutualita_prevalente': return v.mutualita_prevalente !== null;
      case 'riduzione_contributiva_forfettario': return v.riduzione_contributiva_forfettario !== null;
      default: return true;
    }
  }, [currentStep, values]);

  const handleNext = async () => {
    if (currentStep === 'forma_giuridica') {
      // Steps ricalcolati automaticamente dal useMemo
      setCurrentStepIdx(prev => prev + 1);
      return;
    }

    if (isLastStep) {
      setSaving(true);
      const updateData = {};
      
      const allFields = [
        'forma_giuridica', 'regime_fiscale', 'regione', 'ateco_code', 
        'periodicita_iva', 'founding_date', 'numero_soci', 'capitale_sociale',
        'gestione_inps', 'ha_compenso_amministratore', 'tipo_contabilita',
        'tipo_cooperativa', 'mutualita_prevalente',
        'soci_accomandatari', 'soci_accomandanti', 'riduzione_contributiva_forfettario'
      ];
      
      for (const field of allFields) {
        if (values[field] !== null && values[field] !== '') {
          updateData[field] = values[field];
        }
      }

      // SAS: salva anche soci_accomandatari/accomandanti dal step soci_sas
      if (missingSteps.includes('soci_sas')) {
        updateData.soci_accomandatari = values.soci_accomandatari;
        updateData.soci_accomandanti = values.soci_accomandanti;
        // Numero soci totale calcolato
        updateData.numero_soci = (values.soci_accomandatari || 0) + (values.soci_accomandanti || 0);
      }

      // Valori automatici
      if (values.forma_giuridica === 'RF') {
        updateData.regime_fiscale = 'Forfettario';
      }
      if (values.forma_giuridica === 'SRLU') {
        updateData.numero_soci = 1;
      }
      const CONT_ORD_OBB = ['SRL', 'SRLU', 'SPA', 'SAPA', 'SE', 'COOP'];
      if (CONT_ORD_OBB.includes(values.forma_giuridica)) {
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
    forma_giuridica: { icon: Building2, title: 'Forma Giuridica', desc: 'Seleziona il tipo di impresa' },
    regime_fiscale: { icon: FileText, title: 'Regime Fiscale', desc: 'Quale regime fiscale applichi?' },
    regione: { icon: MapPin, title: 'Regione Sede Legale', desc: 'Serve per calcolare IRAP regionale' },
    ateco_code: { icon: Hash, title: 'Codice ATECO', desc: 'Codice attività per aliquote e coefficienti' },
    periodicita_iva: { icon: CalendarClock, title: 'Periodicità IVA', desc: "Liquidi l'IVA mensilmente o trimestralmente?" },
    founding_date: { icon: CalendarIcon, title: 'Data Costituzione', desc: "Quando è stata costituita/aperta l'impresa?" },
    numero_soci: { icon: Users, title: 'Numero Soci', desc: 'Quanti soci ha la società?' },
    soci_sas: { icon: Users, title: 'Composizione Soci SAS', desc: 'Distingui tra accomandatari e accomandanti' },
    capitale_sociale: { icon: Landmark, title: 'Capitale Sociale', desc: 'Capitale sociale versato (€)' },
    gestione_inps: { icon: Briefcase, title: 'Gestione INPS', desc: 'A quale gestione previdenziale sei iscritto?' },
    ha_compenso_amministratore: { icon: HandCoins, title: 'Compenso Amministratore', desc: "L'amministratore percepisce un compenso?" },
    tipo_contabilita: { icon: BookOpen, title: 'Tipo Contabilità', desc: 'Che tipo di contabilità adotti?' },
    tipo_cooperativa: { icon: Shield, title: 'Tipo Cooperativa', desc: 'Che tipo di cooperativa è?' },
    mutualita_prevalente: { icon: Shield, title: 'Mutualità Prevalente', desc: 'La cooperativa è a mutualità prevalente?' },
    riduzione_contributiva_forfettario: { icon: Percent, title: 'Riduzione Contributiva', desc: 'Hai richiesto la riduzione INPS del 35%?' },
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

function StepContent({ step, values, setValues }) {
  const fg = values.forma_giuridica;

  if (step === 'forma_giuridica') {
    return (
      <div className="grid gap-2">
        {FORME_GIURIDICHE.map(f => (
          <OptionButton key={f.value} label={f.label} selected={values.forma_giuridica === f.value}
            onClick={() => setValues(prev => ({ ...prev, forma_giuridica: f.value }))} />
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
        {fg === 'RF' && (
          <p className="text-amber-400/70 text-[10px] text-center mt-1">Nel forfettario, il codice ATECO determina il coefficiente di redditività (40%-86%)</p>
        )}
      </div>
    );
  }

  if (step === 'founding_date') {
    const yearsActive = values.founding_date
      ? Math.floor((Date.now() - new Date(values.founding_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;
    return (
      <div className="space-y-3">
        <Input type="date" value={values.founding_date || ''}
          onChange={(e) => setValues(prev => ({ ...prev, founding_date: e.target.value }))}
          className="bg-slate-800 border-slate-700 text-white text-sm"
          max={new Date().toISOString().split('T')[0]} />
        {yearsActive !== null && (
          <div className="bg-slate-800/60 rounded-xl p-3 text-center space-y-1">
            <div>
              <span className="text-slate-400 text-xs">Anni di attività: </span>
              <span className="text-[#d4af37] text-sm font-bold">{yearsActive}</span>
            </div>
            {fg === 'RF' && yearsActive < 5 && (
              <p className="text-green-400 text-[10px]">Hai diritto all'aliquota agevolata del 5% (primi 5 anni)</p>
            )}
            {fg === 'RF' && yearsActive >= 5 && (
              <p className="text-slate-500 text-[10px]">Aliquota ordinaria forfettario: 15%</p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (step === 'numero_soci') {
    const minSoci = fg === 'COOP' ? 3 : fg === 'SPA' || fg === 'SAPA' ? 2 : 2;
    return (
      <div className="space-y-3">
        <Input type="number" min={minSoci} placeholder={`Minimo ${minSoci} soci`}
          value={values.numero_soci || ''}
          onChange={(e) => setValues(prev => ({ ...prev, numero_soci: parseInt(e.target.value) || null }))}
          className="bg-slate-800 border-slate-700 text-white text-center text-lg" />
        {fg === 'COOP' && <p className="text-slate-500 text-[10px] text-center">Le cooperative richiedono almeno 3 soci</p>}
        {fg === 'SNC' && <p className="text-amber-400/70 text-[10px] text-center">In SNC tutti i soci sono obbligati INPS e hanno responsabilità illimitata</p>}
      </div>
    );
  }

  if (step === 'soci_sas') {
    return (
      <div className="space-y-4">
        <div>
          <label className="text-slate-300 text-xs font-medium mb-1 block">Soci Accomandatari (responsabilità illimitata)</label>
          <Input type="number" min="1" placeholder="1"
            value={values.soci_accomandatari || ''}
            onChange={(e) => setValues(prev => ({ ...prev, soci_accomandatari: parseInt(e.target.value) || null }))}
            className="bg-slate-800 border-slate-700 text-white text-center" />
          <p className="text-amber-400/70 text-[10px] mt-1">Iscritti INPS obbligatoriamente (Commercianti/Artigiani)</p>
        </div>
        <div>
          <label className="text-slate-300 text-xs font-medium mb-1 block">Soci Accomandanti (responsabilità limitata)</label>
          <Input type="number" min="1" placeholder="1"
            value={values.soci_accomandanti || ''}
            onChange={(e) => setValues(prev => ({ ...prev, soci_accomandanti: parseInt(e.target.value) || null }))}
            className="bg-slate-800 border-slate-700 text-white text-center" />
          <p className="text-slate-500 text-[10px] mt-1">Non obbligati INPS, tassati solo su utili percepiti</p>
        </div>
      </div>
    );
  }

  if (step === 'capitale_sociale') {
    const minCapitale = fg === 'SPA' || fg === 'SAPA' || fg === 'SE' ? 50000 : fg === 'COOP' ? 25 : 1;
    return (
      <div className="space-y-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">€</span>
          <Input type="number" min={minCapitale} placeholder={minCapitale >= 50000 ? 'Minimo €50.000' : 'Es. 10.000'}
            value={values.capitale_sociale || ''}
            onChange={(e) => setValues(prev => ({ ...prev, capitale_sociale: parseFloat(e.target.value) || null }))}
            className="bg-slate-800 border-slate-700 text-white pl-8 text-center text-lg" />
        </div>
        {(fg === 'SPA' || fg === 'SAPA' || fg === 'SE') && (
          <p className="text-slate-500 text-[10px] text-center">Per S.p.A. il capitale minimo è €50.000</p>
        )}
        {fg === 'SRL' && (
          <p className="text-slate-500 text-[10px] text-center">SRL: capitale minimo €1 (SRL semplificata) o €10.000 (ordinaria)</p>
        )}
      </div>
    );
  }

  if (step === 'gestione_inps') {
    // Opzioni filtrate per forma giuridica
    let options = [];
    
    if (fg === 'RF' || fg === 'Ditta individuale') {
      // Ditta/Forfettario: Commercianti, Artigiani, o Gestione Separata (professionisti)
      options = [
        { value: 'Commercianti', label: 'Gestione Commercianti', desc: 'Commercio, servizi, intermediazione' },
        { value: 'Artigiani', label: 'Gestione Artigiani', desc: 'Artigianato, manifattura, edilizia' },
        { value: 'Gestione separata', label: 'Gestione Separata', desc: 'Professionisti senza cassa di categoria' },
        { value: 'Cassa professionale', label: 'Cassa Professionale', desc: 'Avvocati, ingegneri, architetti, medici...' },
      ];
    } else if (fg === 'SNC' || fg === 'SAS') {
      // SNC/SAS: soci obbligati Commercianti o Artigiani
      options = [
        { value: 'Commercianti', label: 'Gestione Commercianti', desc: 'Attività commerciali e di servizi' },
        { value: 'Artigiani', label: 'Gestione Artigiani', desc: 'Attività artigianali e manifatturiere' },
      ];
    } else if (fg === 'SRL' || fg === 'SRLU') {
      // SRL: dipende se i soci lavorano nell'azienda
      options = [
        { value: 'Commercianti', label: 'Gestione Commercianti', desc: 'Soci lavoratori in attività commerciale' },
        { value: 'Artigiani', label: 'Gestione Artigiani', desc: 'Soci lavoratori in attività artigianale' },
        { value: 'Gestione separata', label: 'Gestione Separata', desc: 'Solo amministratore con compenso' },
        { value: 'Non iscritto', label: 'Non iscritto INPS', desc: 'Soci non lavoratori, solo percepiscono dividendi' },
      ];
    } else {
      // SPA, SAPA, SE, SS, COOP, Altro
      options = [
        { value: 'Commercianti', label: 'Gestione Commercianti', desc: 'Attività commerciali e di servizi' },
        { value: 'Artigiani', label: 'Gestione Artigiani', desc: 'Attività artigianali e manifatturiere' },
        { value: 'Gestione separata', label: 'Gestione Separata', desc: 'Professionisti senza cassa, collaboratori' },
        { value: 'Cassa professionale', label: 'Cassa Professionale', desc: 'INARCASSA, Cassa Forense, ENPAM...' },
        { value: 'Non iscritto', label: 'Non iscritto INPS', desc: 'Nessuna gestione previdenziale diretta' },
      ];
    }

    return (
      <div className="grid gap-2">
        {options.map(opt => (
          <OptionButton key={opt.value} label={opt.label} desc={opt.desc}
            selected={values.gestione_inps === opt.value}
            onClick={() => setValues(prev => ({ ...prev, gestione_inps: opt.value }))} />
        ))}
        {fg === 'SNC' && <p className="text-amber-400/70 text-[10px] text-center mt-1">In SNC tutti i soci sono iscritti INPS obbligatoriamente</p>}
      </div>
    );
  }

  if (step === 'riduzione_contributiva_forfettario') {
    return (
      <div className="grid gap-2">
        <OptionButton label="Sì, ho richiesto la riduzione 35%" desc="Contributi INPS ridotti del 35% — va richiesta entro il 28/02 di ogni anno"
          selected={values.riduzione_contributiva_forfettario === true}
          onClick={() => setValues(prev => ({ ...prev, riduzione_contributiva_forfettario: true }))} />
        <OptionButton label="No, pago contributi pieni" desc="Contributi INPS a importo pieno senza riduzione"
          selected={values.riduzione_contributiva_forfettario === false}
          onClick={() => setValues(prev => ({ ...prev, riduzione_contributiva_forfettario: false }))} />
      </div>
    );
  }

  if (step === 'ha_compenso_amministratore') {
    return (
      <div className="grid gap-2">
        <OptionButton label="Sì, l'amministratore ha un compenso"
          desc="Compenso tassato come reddito assimilato a lavoro dipendente + contributi INPS gestione separata"
          selected={values.ha_compenso_amministratore === true}
          onClick={() => setValues(prev => ({ ...prev, ha_compenso_amministratore: true }))} />
        <OptionButton label="No, amministra a titolo gratuito"
          desc="Nessun compenso — solo eventuale distribuzione utili/dividendi"
          selected={values.ha_compenso_amministratore === false}
          onClick={() => setValues(prev => ({ ...prev, ha_compenso_amministratore: false }))} />
      </div>
    );
  }

  if (step === 'tipo_cooperativa') {
    const tipi = [
      { value: 'Produzione e lavoro', desc: 'I soci sono i lavoratori della cooperativa' },
      { value: 'Sociale', desc: 'Tipo A (servizi socio-sanitari) o Tipo B (inserimento lavorativo)' },
      { value: 'Di consumo', desc: 'I soci sono i consumatori dei beni/servizi' },
      { value: 'Di servizi', desc: 'Fornisce servizi ai soci (es. cooperativa di trasporti)' },
      { value: 'Agricola', desc: 'Attività agricola con soci coltivatori' },
      { value: 'Edilizia', desc: 'Cooperativa di abitazione o edilizia' },
      { value: 'Altra', desc: 'Altro tipo di cooperativa' },
    ];
    return (
      <div className="grid gap-2">
        {tipi.map(t => (
          <OptionButton key={t.value} label={t.value} desc={t.desc}
            selected={values.tipo_cooperativa === t.value}
            onClick={() => setValues(prev => ({ ...prev, tipo_cooperativa: t.value }))} />
        ))}
      </div>
    );
  }

  if (step === 'mutualita_prevalente') {
    return (
      <div className="grid gap-2">
        <OptionButton label="Sì, mutualità prevalente"
          desc="Esenzione IRES dal 30% al 70% dell'utile netto — requisiti art. 2512 c.c."
          selected={values.mutualita_prevalente === true}
          onClick={() => setValues(prev => ({ ...prev, mutualita_prevalente: true }))} />
        <OptionButton label="No, senza mutualità prevalente"
          desc="Tassazione IRES piena come una normale società di capitali"
          selected={values.mutualita_prevalente === false}
          onClick={() => setValues(prev => ({ ...prev, mutualita_prevalente: false }))} />
      </div>
    );
  }

  if (step === 'tipo_contabilita') {
    return (
      <div className="grid gap-2">
        <OptionButton label="Ordinaria" desc="Obbligatoria sopra certi limiti di ricavi — contabilità completa"
          selected={values.tipo_contabilita === 'Ordinaria'}
          onClick={() => setValues(prev => ({ ...prev, tipo_contabilita: 'Ordinaria' }))} />
        <OptionButton label="Semplificata" desc="Per imprese sotto i limiti di legge — per cassa"
          selected={values.tipo_contabilita === 'Semplificata'}
          onClick={() => setValues(prev => ({ ...prev, tipo_contabilita: 'Semplificata' }))} />
      </div>
    );
  }

  if (step === 'periodicita_iva') {
    return (
      <div className="grid gap-2">
        <OptionButton label="Mensile" desc="Liquidazione IVA ogni mese (obbligatoria se fatturato > €400.000)"
          selected={values.periodicita_iva === 'Mensile'}
          onClick={() => setValues(prev => ({ ...prev, periodicita_iva: 'Mensile' }))} />
        <OptionButton label="Trimestrale" desc="Liquidazione IVA ogni 3 mesi + maggiorazione 1% interessi"
          selected={values.periodicita_iva === 'Trimestrale'}
          onClick={() => setValues(prev => ({ ...prev, periodicita_iva: 'Trimestrale' }))} />
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