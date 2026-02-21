import React from 'react';
import ReactDOM from 'react-dom';
import { Palette, Share2, Bell } from 'lucide-react';

export default function FileContextMenu({ file, onAction, onClose }) {
  if (!file) return null;

  const actions = [
    { id: 'colors', icon: Palette, label: 'Colori', color: '#f59e0b' },
    { id: 'share', icon: Share2, label: 'Condividi', color: '#22c55e' },
    { id: 'notify', icon: Bell, label: 'Promemoria', color: '#a855f7' },
  ];

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9998] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      
      <div 
        className="relative w-full max-w-sm mx-4 mb-8 bg-[#2a2420] rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'sheetUp 0.3s ease-out' }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="px-5 pb-3 border-b border-white/10">
          <p className="text-white/60 text-xs">File selezionato</p>
          <p className="text-white font-semibold text-base truncate">{file.titolo}</p>
        </div>

        <div className="grid grid-cols-3 gap-1 px-4 py-4">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => onAction(action.id)}
              className="flex flex-col items-center gap-2 py-3 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${action.color}25` }}
              >
                <action.icon className="w-5 h-5" style={{ color: action.color }} />
              </div>
              <span className="text-[10px] text-white/70 font-medium">{action.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3.5 border-t border-white/10 text-white/50 text-sm font-medium active:bg-white/5"
        >
          Annulla
        </button>
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