import React from 'react';
import ReactDOM from 'react-dom';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const FILE_COLORS = [
  '#e8c4b0', // beige/rosa chiaro (come Samsung default)
  '#c2185b', // rosa scuro
  '#e65100', // arancione scuro
  '#b8860b', // dorato
  '#1565c0', // blu
  '#00838f', // teal scuro
  '#00897b', // teal
  '#2e7d32', // verde scuro
  '#9c27b0', // viola
  '#ad1457', // magenta
  '#827717', // oliva
  '#546e7a', // grigio-blu
];

export default function FileColorPicker({ file, onSelectColor, onClose }) {
  if (!file) return null;
  const currentColor = file.colore || '#06b6d4';

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      
      <div 
        className="relative bg-[#2a2420] rounded-2xl p-6 w-72 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'popIn 0.2s ease-out' }}
      >
        <h3 className="text-white font-semibold text-lg mb-5">Colore nota</h3>

        <div className="grid grid-cols-4 gap-4 mb-2">
          {FILE_COLORS.map((c) => {
            const isSelected = currentColor === c;
            return (
              <button
                key={c}
                onClick={() => onSelectColor(c)}
                className="flex items-center justify-center"
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-full transition-all",
                    isSelected && "ring-2 ring-white ring-offset-2 ring-offset-[#2a2420]"
                  )}
                  style={{ backgroundColor: c }}
                >
                  {isSelected && (
                    <Check className="w-5 h-5 text-white mx-auto mt-3.5" strokeWidth={2.5} />
                  )}
                </div>
              </button>
            );
          })}
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