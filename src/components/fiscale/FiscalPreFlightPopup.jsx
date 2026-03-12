import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Building2, Check, ChevronRight, FileText, MapPin, Hash } from 'lucide-react';
import AtecoSearchInput from './AtecoSearchInput';

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

/**
 * Popup multi-step che raccoglie solo i dati fiscali mancanti dal profilo.
 * Mostra solo gli step necessari (se il dato è già nel profilo, lo salta).
 */
export default function FiscalPreFlightPopup({ user, onComplete }) {
  // Calcola quali step servono
  const missingSteps = useMemo(() => {
    const steps = [];
    if (!user?.forma_giuridica) steps.push('forma_giuridica');
    if (!user?.regime_fiscale) steps.push('regime_fiscale');
    if (!user?.regione && !user?.region) steps.push('regione');
    if (!user?.ateco_code) steps.push('ateco_code');
    return steps;
  }, [user]);

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [values, setValues] = useState({
    forma_giuridica: user?.forma_giuridica || null,
    regime_fiscale: user?.regime_fiscale || null,
    regione: user?.regione || user?.region || null,
    ateco_code: user?.ateco_code || '',
  });
  const [saving, setSaving] = useState(false);

  const currentStep = missingSteps[currentStepIdx];
  const isLastStep = currentStepIdx === missingSteps.length - 1;

  const canProceed = () => {
    if (currentStep === 'forma_giuridica') return !!values.forma_giuridica;
    if (currentStep === 'regime_fiscale') return !!values.regime_fiscale;
    if (currentStep === 'regione') return !!values.regione;
    if (currentStep === 'ateco_code') return !!values.ateco_code;
    return true;
  };

  const handleNext = async () => {
    if (isLastStep) {
      setSaving(true);
      const updateData = {};
      if (missingSteps.includes('forma_giuridica')) updateData.forma_giuridica = values.forma_giuridica;
      if (missingSteps.includes('regime_fiscale')) updateData.regime_fiscale = values.regime_fiscale;
      if (missingSteps.includes('regione')) updateData.regione = values.regione;
      if (missingSteps.includes('ateco_code')) updateData.ateco_code = values.ateco_code;
      await base44.auth.updateMe(updateData);
      setSaving(false);
      onComplete(values);
    } else {
      setCurrentStepIdx(prev => prev + 1);
    }
  };

  // Se non manca nulla, non mostrare niente
  if (missingSteps.length === 0) return null;

  const stepConfig = {
    forma_giuridica: { icon: Building2, title: 'Forma Giuridica', desc: 'Seleziona il tipo di società' },
    regime_fiscale: { icon: FileText, title: 'Regime Fiscale', desc: 'Quale regime fiscale applichi?' },
    regione: { icon: MapPin, title: 'Regione Sede Legale', desc: 'Serve per calcolare IRAP regionale' },
    ateco_code: { icon: Hash, title: 'Codice ATECO', desc: 'Codice attività per aliquote corrette' },
  };

  const cfg = stepConfig[currentStep];
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
          {currentStep === 'forma_giuridica' && (
            <div className="grid gap-2">
              {FORME_GIURIDICHE.map(fg => (
                <button
                  key={fg.value}
                  onClick={() => setValues(prev => ({ ...prev, forma_giuridica: fg.value }))}
                  className={`w-full flex items-center justify-between py-3 px-4 rounded-xl text-left transition-all ${
                    values.forma_giuridica === fg.value
                      ? 'bg-[#d4af37] text-slate-900'
                      : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
                  }`}
                >
                  <span className="text-sm font-medium">{fg.label}</span>
                  {values.forma_giuridica === fg.value && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          )}

          {currentStep === 'regime_fiscale' && (
            <div className="grid gap-2">
              {REGIMI_FISCALI.map(rf => (
                <button
                  key={rf.value}
                  onClick={() => setValues(prev => ({ ...prev, regime_fiscale: rf.value }))}
                  className={`w-full flex items-center justify-between py-3 px-4 rounded-xl text-left transition-all ${
                    values.regime_fiscale === rf.value
                      ? 'bg-[#d4af37] text-slate-900'
                      : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
                  }`}
                >
                  <span className="text-sm font-medium">{rf.label}</span>
                  {values.regime_fiscale === rf.value && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          )}

          {currentStep === 'regione' && (
            <div className="grid gap-2">
              {REGIONI.map(r => (
                <button
                  key={r}
                  onClick={() => setValues(prev => ({ ...prev, regione: r }))}
                  className={`w-full flex items-center justify-between py-2.5 px-4 rounded-xl text-left transition-all ${
                    values.regione === r
                      ? 'bg-[#d4af37] text-slate-900'
                      : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
                  }`}
                >
                  <span className="text-sm font-medium">{r}</span>
                  {values.regione === r && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          )}

          {currentStep === 'ateco_code' && (
            <div className="space-y-3">
              <AtecoSearchInput
                value={values.ateco_code}
                onChange={(v) => setValues(prev => ({ ...prev, ateco_code: v }))}
              />
              {values.ateco_code && (
                <div className="bg-slate-800/60 rounded-xl p-3 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-green-300 text-sm font-medium">{values.ateco_code}</span>
                </div>
              )}
            </div>
          )}
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