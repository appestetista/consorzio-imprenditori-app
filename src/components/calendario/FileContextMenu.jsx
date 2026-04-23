import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Check, ChevronDown, Mail, MessageCircle, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';

const FILE_COLORS = [
  '#e8c4b0', '#c2185b', '#e65100', '#b8860b',
  '#1565c0', '#00838f', '#00897b', '#2e7d32',
  '#9c27b0', '#ad1457', '#827717', '#546e7a',
];

const REPEAT_OPTIONS = [
  { value: 'none', label: 'Non si ripete' },
  { value: 'daily', label: 'Ogni giorno' },
  { value: 'weekly', label: 'Ogni settimana' },
  { value: 'monthly', label: 'Ogni mese' },
];

const TIME_OPTIONS = (() => {
  const opts = [];
  for (let h = 0; h < 24; h++) {
    for (let m of [0, 30]) {
      opts.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
    }
  }
  return opts;
})();

export default function FileContextMenu({ file, cartelle = [], onSave, onClose }) {
  const now = new Date();
  const [title, setTitle] = useState(file?.titolo || '');
  const [color, setColor] = useState(file?.colore || '#06b6d4');
  const [selectedCartella, setSelectedCartella] = useState(file?.cartella_id || '');
  const [remDate, setRemDate] = useState(file?.data || now.toISOString().split('T')[0]);
  const [remTime, setRemTime] = useState(file?.time || '19:00');
  const [remRepeat, setRemRepeat] = useState('none');
  const [openDropdown, setOpenDropdown] = useState(null);

  const dateOptions = useMemo(() => {
    const opts = [];
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      opts.push({ value: d.toISOString().split('T')[0], label: d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }) });
    }
    return opts;
  }, []);

  if (!file) return null;

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return 'Scegli data';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
  };

  const handleSave = () => {
    const data = {
      titolo: title.trim() || file.titolo,
      colore: color,
      data: remDate,
      time: remTime,
    };
    // Se ha scelto una cartella (o "nessuna")
    if (selectedCartella !== (file.cartella_id || '')) {
      data.cartella_id = selectedCartella || null;
    }
    onSave(data);
  };

  const handleShare = (type) => {
    const shareText = `📄 ${title || file.titolo}\n${file.contenuto || ''}`.trim();
    const encoded = encodeURIComponent(shareText);
    if (type === 'whatsapp') {
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    } else {
      window.open(`mailto:?subject=${encodeURIComponent(`File: ${title || file.titolo}`)}&body=${encoded}`, '_blank');
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />

      <div
        className="relative w-full max-w-sm mx-4 bg-[#2a2420] rounded-2xl overflow-hidden shadow-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'sheetUp 0.3s ease-out' }}
      >
        {/* Header con X */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
          <div />
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center transition-colors"
          >
            <span className="text-white text-lg font-bold leading-none">✕</span>
          </button>
        </div>

        {/* Contenuto scrollabile */}
        <div className="flex-1 overflow-y-auto px-5 pb-2" style={{ scrollbarWidth: 'none' }}>

          {/* Nome file editabile */}
          <div className="mb-4">
            <label className="text-white/50 text-[10px] uppercase tracking-wider mb-1 block">Nome</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titolo"
              className="w-full bg-[#3a3430] text-white text-sm rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>

          {/* Sezione Colore */}
          <div className="mb-4">
            <label className="text-white/50 text-[10px] uppercase tracking-wider mb-2 block">Colore</label>
            <div className="grid grid-cols-6 gap-3">
              {FILE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="flex items-center justify-center"
                >
                  <div
                    className={cn(
                      "w-9 h-9 rounded-full transition-all",
                      color === c && "ring-2 ring-white ring-offset-2 ring-offset-[#2a2420]"
                    )}
                    style={{ backgroundColor: c }}
                  >
                    {color === c && <Check className="w-4 h-4 text-white mx-auto mt-2.5" strokeWidth={2.5} />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sezione Condivisione */}
          <div className="mb-4">
            <label className="text-white/50 text-[10px] uppercase tracking-wider mb-2 block">Condividi</label>
            <div className="flex gap-3">
              <button
                onClick={() => handleShare('whatsapp')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600/20 hover:bg-green-600/30 active:bg-green-600/40 transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-green-400" />
                <span className="text-xs text-green-300 font-semibold">WhatsApp</span>
              </button>
              <button
                onClick={() => handleShare('email')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 active:bg-blue-600/40 transition-colors"
              >
                <Mail className="w-5 h-5 text-blue-400" />
                <span className="text-xs text-blue-300 font-semibold">Email</span>
              </button>
            </div>
          </div>

          {/* Sezione Cartella */}
          {cartelle.length > 0 && (
            <div className="mb-4">
              <label className="text-white/50 text-[10px] uppercase tracking-wider mb-2 block">Cartella</label>
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'folder' ? null : 'folder')}
                  className="w-full flex items-center justify-between bg-[#3a3430] rounded-xl px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-white/40" />
                    <span className="text-white text-sm">
                      {selectedCartella 
                        ? cartelle.find(c => c.id === selectedCartella)?.nome || 'Cartella'
                        : 'Nessuna cartella'}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-white/50" />
                </button>
                {openDropdown === 'folder' && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#3a3430] rounded-xl max-h-40 overflow-y-auto z-10 shadow-xl border border-white/10">
                    <button
                      onClick={() => { setSelectedCartella(''); setOpenDropdown(null); }}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 ${!selectedCartella ? 'text-[#e8c4b0] bg-white/5 font-semibold' : 'text-white/80 hover:bg-white/5'}`}
                    >
                      <span>Nessuna cartella</span>
                    </button>
                    {cartelle.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedCartella(c.id); setOpenDropdown(null); }}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 ${selectedCartella === c.id ? 'text-[#e8c4b0] bg-white/5 font-semibold' : 'text-white/80 hover:bg-white/5'}`}
                      >
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: c.colore || '#64748b' }} />
                        <span>{c.nome}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sezione Promemoria */}
          <div className="mb-2">
            <label className="text-white/50 text-[10px] uppercase tracking-wider mb-2 block">Promemoria</label>

            {/* Data */}
            <div className="mb-2 relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'date' ? null : 'date')}
                className="w-full flex items-center justify-between bg-[#3a3430] rounded-xl px-4 py-3"
              >
                <span className="text-white text-sm">{formatDateLabel(remDate)}</span>
                <ChevronDown className="w-4 h-4 text-white/50" />
              </button>
              {openDropdown === 'date' && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#3a3430] rounded-xl max-h-40 overflow-y-auto z-10 shadow-xl border border-white/10">
                  {dateOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setRemDate(opt.value); setOpenDropdown(null); }}
                      className={`w-full text-left px-4 py-2 text-sm ${remDate === opt.value ? 'text-[#e8c4b0] bg-white/5 font-semibold' : 'text-white/80 hover:bg-white/5'}`}
                    >{opt.label}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Ora */}
            <div className="mb-2 relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'time' ? null : 'time')}
                className="w-full flex items-center justify-between bg-[#3a3430] rounded-xl px-4 py-3"
              >
                <span className="text-white text-sm">{remTime}</span>
                <ChevronDown className="w-4 h-4 text-white/50" />
              </button>
              {openDropdown === 'time' && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#3a3430] rounded-xl max-h-40 overflow-y-auto z-10 shadow-xl border border-white/10">
                  {TIME_OPTIONS.map((t) => (
                    <button
                      key={t}
                      onClick={() => { setRemTime(t); setOpenDropdown(null); }}
                      className={`w-full text-left px-4 py-2 text-sm ${remTime === t ? 'text-[#e8c4b0] bg-white/5 font-semibold' : 'text-white/80 hover:bg-white/5'}`}
                    >{t}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Ripetizione */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'repeat' ? null : 'repeat')}
                className="w-full flex items-center justify-between bg-[#3a3430] rounded-xl px-4 py-3"
              >
                <span className="text-white text-sm">{REPEAT_OPTIONS.find(o => o.value === remRepeat)?.label}</span>
                <ChevronDown className="w-4 h-4 text-white/50" />
              </button>
              {openDropdown === 'repeat' && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#3a3430] rounded-xl max-h-40 overflow-y-auto z-10 shadow-xl border border-white/10">
                  {REPEAT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setRemRepeat(opt.value); setOpenDropdown(null); }}
                      className={`w-full text-left px-4 py-2 text-sm ${remRepeat === opt.value ? 'text-[#e8c4b0] bg-white/5 font-semibold' : 'text-white/80 hover:bg-white/5'}`}
                    >{opt.label}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pulsanti Salva / Annulla - fissi in basso */}
        <div className="flex gap-3 px-5 py-3 border-t border-white/10 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm font-semibold active:bg-white/10 transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-[#e8c4b0] text-[#2a2420] text-sm font-bold active:opacity-80 transition-opacity"
          >
            Salva
          </button>
        </div>
      </div>

      <style>{`
        @keyframes sheetUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  );
}