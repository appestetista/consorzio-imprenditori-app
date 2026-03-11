import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Building2, Check } from 'lucide-react';

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

export default function FormaGiuridicaPopup({ onSelected }) {
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    await base44.auth.updateMe({ forma_giuridica: selected });
    setSaving(false);
    onSelected(selected);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4">
      <div className="bg-[#0a2540] border border-[#1a3a5c] rounded-2xl w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 pb-3 text-center shrink-0">
          <div className="w-12 h-12 rounded-full bg-[#d4af37]/15 flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-6 h-6 text-[#d4af37]" />
          </div>
          <h2 className="text-white text-lg font-bold">Tipo di Società</h2>
          <p className="text-slate-400 text-sm mt-1">
            Seleziona la forma giuridica della tua impresa per personalizzare il simulatore fiscale
          </p>
        </div>

        {/* Lista scrollabile */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          <div className="grid gap-2">
            {FORME_GIURIDICHE.map(fg => (
              <button
                key={fg.value}
                onClick={() => setSelected(fg.value)}
                className={`w-full flex items-center justify-between py-3 px-4 rounded-xl text-left transition-all ${
                  selected === fg.value
                    ? 'bg-[#d4af37] text-slate-900'
                    : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
                }`}
              >
                <span className="text-sm font-medium">{fg.label}</span>
                {selected === fg.value && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>

        {/* Bottone conferma */}
        <div className="p-4 pt-3 shrink-0">
          <button
            onClick={handleConfirm}
            disabled={!selected || saving}
            className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
              selected
                ? 'bg-[#d4af37] text-slate-900 hover:bg-[#c9a432]'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {saving ? 'Salvataggio...' : 'Conferma e continua'}
          </button>
        </div>
      </div>
    </div>
  );
}