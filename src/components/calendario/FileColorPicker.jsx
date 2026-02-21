import React from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const FILE_COLORS = [
  '#06b6d4', '#f59e0b', '#3b82f6', '#ec4899',
  '#22c55e', '#a855f7', '#ef4444', '#f97316',
  '#14b8a6', '#8b5cf6', '#eab308', '#64748b',
  '#be185d', '#0ea5e9', '#84cc16', '#78716c',
];

export default function FileColorPicker({ file, onSelectColor, onClose }) {
  if (!file) return null;
  const currentColor = file.colore || '#06b6d4';

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-slate-800 rounded-xl p-5 w-72 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-base">Colore file</h3>
          <button onClick={onClose} className="w-6 h-6 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-300" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-4">
          {FILE_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onSelectColor(c)}
              className={cn(
                "w-12 h-12 rounded-full transition-all mx-auto",
                currentColor === c && "ring-3 ring-white ring-offset-2 ring-offset-slate-800 scale-110"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}