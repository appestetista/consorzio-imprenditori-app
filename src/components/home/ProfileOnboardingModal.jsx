import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronRight, ChevronLeft, Sparkles, CheckCircle2, Building2, BarChart3, Rocket } from 'lucide-react';

const FORME_GIURIDICHE = ['Ditta individuale', 'SRL', 'SAS/SNC', 'SPA', 'Cooperativa', 'Altro'];
const REGIMI_FISCALI = ['Forfettario', 'Ordinario', 'Non so'];
const FATTURATI = ['Fino a 100K', '100K-500K', '500K-2M', 'Oltre 2M'];
const DIPENDENTI = ['Solo io', '1-5', '6-15', '16-50', 'Oltre 50'];
const OBIETTIVI = ['Ridurre i costi', 'Crescere e assumere', 'Internazionalizzarsi', 'Mettermi in regola', 'Trovare finanziamenti'];

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#d4af37]/60 transition-colors appearance-none"
      >
        <option value="">Seleziona...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#d4af37]/60 transition-colors placeholder:text-slate-600"
      />
    </div>
  );
}

function RiepilogoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-800 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs text-white font-medium">{value}</span>
    </div>
  );
}

export default function ProfileOnboardingModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    settore: '',
    forma_giuridica: '',
    regime_fiscale: '',
    fatturato_annuo: '',
    numero_dipendenti: '',
    obiettivo_principale: '',
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const stepLabels = [
    { num: 1, title: 'Parlami della tua azienda', icon: Building2 },
    { num: 2, title: 'Quanto è grande?', icon: BarChart3 },
    { num: 3, title: 'Tutto pronto!', icon: Rocket },
  ];

  const currentStep = stepLabels[step - 1];
  const StepIcon = currentStep.icon;

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({
      ...form,
      profilo_completato: true,
    });
    setSaving(false);
    onClose();
  };

  const canGoStep2 = form.settore && form.forma_giuridica && form.regime_fiscale;
  const canGoStep3 = form.fatturato_annuo && form.numero_dipendenti && form.obiettivo_principale;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(10, 15, 26, 0.92)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-md bg-[#0f1629] border border-slate-700/60 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
        
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#d4af37] to-[#b8860b] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#d4af37]/20">
            <StepIcon className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-lg font-bold text-white">{currentStep.title}</h2>
          <p className="text-xs text-slate-400 mt-1">
            {step === 3 ? 'Verifica i dati e inizia' : `Step ${step} di 3 — Serve per personalizzare le risposte`}
          </p>

          {/* Progress bar 3 step */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 w-14 rounded-full transition-all duration-300 ${step >= s ? 'bg-[#d4af37]' : 'bg-slate-700'}`} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-2">
          {step === 1 && (
            <div className="space-y-4">
              <InputField label="Settore" value={form.settore} onChange={v => set('settore', v)} placeholder="Es. Ristorazione, Edilizia, IT..." />
              <SelectField label="Forma giuridica" value={form.forma_giuridica} onChange={v => set('forma_giuridica', v)} options={FORME_GIURIDICHE} />
              <SelectField label="Regime fiscale" value={form.regime_fiscale} onChange={v => set('regime_fiscale', v)} options={REGIMI_FISCALI} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <SelectField label="Fatturato annuo" value={form.fatturato_annuo} onChange={v => set('fatturato_annuo', v)} options={FATTURATI} />
              <SelectField label="Numero dipendenti" value={form.numero_dipendenti} onChange={v => set('numero_dipendenti', v)} options={DIPENDENTI} />
              <SelectField label="Obiettivo principale" value={form.obiettivo_principale} onChange={v => set('obiettivo_principale', v)} options={OBIETTIVI} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 px-4 py-3">
                <RiepilogoRow label="Settore" value={form.settore} />
                <RiepilogoRow label="Forma giuridica" value={form.forma_giuridica} />
                <RiepilogoRow label="Regime fiscale" value={form.regime_fiscale} />
                <RiepilogoRow label="Fatturato annuo" value={form.fatturato_annuo} />
                <RiepilogoRow label="Dipendenti" value={form.numero_dipendenti} />
                <RiepilogoRow label="Obiettivo" value={form.obiettivo_principale} />
              </div>
              <div className="flex items-start gap-2 bg-[#d4af37]/10 border border-[#d4af37]/20 rounded-xl px-3 py-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#d4af37] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300 leading-relaxed">
                  Userò questi dati per personalizzare ogni analisi: normative del tuo regime, costi del tuo settore, opportunità per la tua dimensione.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pt-4 pb-6">
          {step === 1 && (
            <div className="space-y-3">
              <button
                onClick={() => setStep(2)}
                disabled={!canGoStep2}
                className="w-full py-2.5 rounded-xl bg-[#d4af37] text-slate-900 text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-[#c8a931] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Avanti <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors py-1">
                Compila dopo
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-600 text-white text-sm font-medium flex items-center justify-center gap-1.5 hover:border-slate-500 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Indietro
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!canGoStep3}
                  className="flex-1 py-2.5 rounded-xl bg-[#d4af37] text-slate-900 text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-[#c8a931] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Avanti <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <button onClick={onClose} className="w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors py-1">
                Compila dopo
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-white text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-[#d4af37]/20"
              >
                <Sparkles className="w-4 h-4" />
                {saving ? 'Salvataggio...' : 'Inizia a usare il tuo consulente AI'}
              </button>
              <button
                onClick={() => setStep(2)}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors py-1"
              >
                ← Modifica dati
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}