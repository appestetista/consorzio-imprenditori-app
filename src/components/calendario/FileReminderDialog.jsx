import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { cn } from '@/lib/utils';

const REPEAT_OPTIONS = [
  { value: 'none', label: 'Non si ripete' },
  { value: 'daily', label: 'Ogni giorno' },
  { value: 'weekly', label: 'Ogni settimana' },
  { value: 'monthly', label: 'Ogni mese' },
];

export default function FileReminderDialog({ file, onSave, onClose }) {
  if (!file) return null;

  const now = new Date();
  const [date, setDate] = useState(now.toISOString().split('T')[0]);
  const [time, setTime] = useState('19:00');
  const [repeat, setRepeat] = useState('none');

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
  };

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
        <div className="mb-3">
          <div className="relative">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#3a3430] text-white text-sm rounded-xl px-4 py-3.5 outline-none appearance-none"
              style={{ colorScheme: 'dark' }}
            />
            <div className="absolute inset-0 flex items-center px-4 pointer-events-none">
              <span className="text-white text-sm font-medium">{formatDateDisplay(date)}</span>
            </div>
          </div>
        </div>

        {/* Ora */}
        <div className="mb-3">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full bg-[#3a3430] text-white text-sm rounded-xl px-4 py-3.5 outline-none"
            style={{ colorScheme: 'dark' }}
          />
        </div>

        {/* Ripetizione */}
        <div className="mb-5">
          <select
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            className="w-full bg-[#3a3430] text-white text-sm rounded-xl px-4 py-3.5 outline-none appearance-none"
            style={{ colorScheme: 'dark' }}
          >
            {REPEAT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
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
            onClick={() => {
              onSave({ date, time, repeat });
            }}
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