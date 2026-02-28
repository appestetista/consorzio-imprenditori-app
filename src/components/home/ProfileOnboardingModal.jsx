import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

const SETTORI = ['Manifattura', 'Commercio', 'Servizi', 'Tecnologia', 'Ristorazione', 'Edilizia', 'Trasporti', 'Sanità', 'Professioni', 'Altro'];
const FORME_GIURIDICHE = ['Ditta individuale', 'SRL', 'SRLS', 'SAS', 'SNC', 'SPA', 'Cooperativa', 'Altro'];
const REGIMI_FISCALI = ['Forfettario', 'Semplificato', 'Ordinario', 'Non so'];
const FATTURATI = ['Sotto 100K', '100K-500K', '500K-1M', '1M-5M', '5M-10M', 'Oltre 10M'];
const DIPENDENTI = ['Solo io', '1-5', '6-15', '16-50', '51-200', 'Oltre 200'];
const OBIETTIVI = ['Crescita fatturato', 'Riduzione costi', 'Espansione mercato', 'Digitalizzazione', 'Passaggio generazionale', 'Altro'];

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

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({
      ...form,
      profilo_completato: true,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#d4af37] to-[#b8860b] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#d4af37]/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-lg font-bold text-white">Configuriamo il tuo consulente</h2>
          <p className="text-xs text-slate-400 mt-1">2 passaggi per analisi personalizzate</p>
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className={`h-1 w-12 rounded-full transition-colors ${step >= 1 ? 'bg-[#d4af37]' : 'bg-slate-700'}`} />
            <div className={`h-1 w-12 rounded-full transition-colors ${step >= 2 ? 'bg-[#d4af37]' : 'bg-slate-700'}`} />
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-2">
          {step === 1 ? (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-300">La tua azienda</p>
              <SelectField label="Settore" value={form.settore} onChange={v => set('settore', v)} options={SETTORI} />
              <SelectField label="Forma giuridica" value={form.forma_giuridica} onChange={v => set('forma_giuridica', v)} options={FORME_GIURIDICHE} />
              <SelectField label="Regime fiscale" value={form.regime_fiscale} onChange={v => set('regime_fiscale', v)} options={REGIMI_FISCALI} />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-300">Dimensioni e obiettivo</p>
              <SelectField label="Fatturato annuo" value={form.fatturato_annuo} onChange={v => set('fatturato_annuo', v)} options={FATTURATI} />
              <SelectField label="Numero dipendenti" value={form.numero_dipendenti} onChange={v => set('numero_dipendenti', v)} options={DIPENDENTI} />
              <SelectField label="Obiettivo principale" value={form.obiettivo_principale} onChange={v => set('obiettivo_principale', v)} options={OBIETTIVI} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pt-4 pb-6">
          {step === 1 ? (
            <div className="space-y-3">
              <button
                onClick={() => setStep(2)}
                className="w-full py-2.5 rounded-xl bg-[#d4af37] text-slate-900 text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-[#c8a931] transition-colors"
              >
                Avanti <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors py-1"
              >
                Compila dopo
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 rounded-xl border border-slate-600 text-white text-sm font-medium flex items-center justify-center gap-1.5 hover:border-slate-500 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Indietro
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-[#d4af37] text-slate-900 text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-[#c8a931] transition-colors disabled:opacity-50"
              >
                {saving ? 'Salvo...' : 'Inizia ad analizzare'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}