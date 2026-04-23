import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown } from 'lucide-react';

const REPEAT_OPTIONS = [
  { value: 'none', label: 'Non si ripete' },
  { value: 'daily', label: 'Ogni giorno' },
  { value: 'weekly', label: 'Ogni settimana' },
  { value: 'monthly', label: 'Ogni mese' },
];

// Genera orari ogni 30 min
const TIME_OPTIONS = (() => {
  const opts = [];
  for (let h = 0; h < 24; h++) {
    for (let m of [0, 30]) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      opts.push(`${hh}:${mm}`);
    }
  }
  return opts;
})();

export default function FileReminderDialog({ file, onSave, onClose }) {
  const now = new Date();
  const [date, setDate] = useState(now.toISOString().split('T')[0]);
  const [time, setTime] = useState('19:00');
  const [repeat, setRepeat] = useState('none');
  const [openDropdown, setOpenDropdown] = useState(null);

  const dateOptions = useMemo(() => {
    const opts = [];
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
      opts.push({ value: iso, label });
    }
    return opts;
  }, []);

  if (!file) return null;

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
  };

  const DropdownField = ({ id, value, label }) => (
    <button
      onClick={() => setOpenDropdown(openDropdown === id ? null : id)}
      className="w-full flex items-center justify-between bg-[#3a3430] rounded-xl px-4 py-3.5"
    >
      <span className="text-white text-sm font-medium">{label}</span>
      <ChevronDown className="w-4 h-4 text-white/50" />
    </button>
  );

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      
      <div 
        className="relative bg-[#2a2420] rounded-2xl p-6 w-80 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'popIn 0.2s ease-out' }}
      >
        <h3 className="text-white font-semibold text-lg mb-5">Scegli data e ora</h3>

        {/* Data */}
        <div className="mb-3 relative">
          <DropdownField id="date" value={date} label={formatDateLabel(date)} />
          {openDropdown === 'date' && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#3a3430] rounded-xl max-h-48 overflow-y-auto z-10 shadow-xl border border-white/10">
              {dateOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setDate(opt.value); setOpenDropdown(null); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    date === opt.value ? 'text-[#e8c4b0] bg-white/5 font-semibold' : 'text-white/80 hover:bg-white/5'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ora */}
        <div className="mb-3 relative">
          <DropdownField id="time" value={time} label={time} />
          {openDropdown === 'time' && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#3a3430] rounded-xl max-h-48 overflow-y-auto z-10 shadow-xl border border-white/10">
              {TIME_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => { setTime(t); setOpenDropdown(null); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    time === t ? 'text-[#e8c4b0] bg-white/5 font-semibold' : 'text-white/80 hover:bg-white/5'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ripetizione */}
        <div className="mb-5 relative">
          <DropdownField 
            id="repeat" 
            value={repeat} 
            label={REPEAT_OPTIONS.find(o => o.value === repeat)?.label} 
          />
          {openDropdown === 'repeat' && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#3a3430] rounded-xl max-h-48 overflow-y-auto z-10 shadow-xl border border-white/10">
              {REPEAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setRepeat(opt.value); setOpenDropdown(null); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    repeat === opt.value ? 'text-[#e8c4b0] bg-white/5 font-semibold' : 'text-white/80 hover:bg-white/5'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pulsanti */}
        <div className="flex items-center justify-end gap-4">
          <button
            onClick={onClose}
            className="px-5 py-2 text-[#e8c4b0] text-sm font-semibold rounded-full hover:bg-white/5 transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={() => onSave({ date, time, repeat })}
            className="px-5 py-2 text-[#e8c4b0] text-sm font-semibold rounded-full hover:bg-white/5 transition-colors"
          >
            Salva
          </button>
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  );
}