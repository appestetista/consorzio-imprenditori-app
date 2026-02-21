import React from 'react';
import ReactDOM from 'react-dom';
import { X, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FileMoveDialog({ file, cartelle = [], onMove, onClose }) {
  if (!file) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-slate-800 rounded-xl p-5 w-72 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-base">Sposta in cartella</h3>
          <button onClick={onClose} className="w-6 h-6 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-300" />
          </button>
        </div>

        {cartelle.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">Nessuna cartella disponibile.<br/>Crea prima una cartella.</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {cartelle.map((c) => (
              <button
                key={c.id}
                onClick={() => onMove(c.id)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <div className="relative w-7 h-6 flex-shrink-0">
                  <div 
                    className="absolute top-1 left-0 right-0 bottom-0.5 rounded"
                    style={{ background: `linear-gradient(180deg, ${c.colore}ee 0%, ${c.colore}cc 100%)` }}
                  >
                    <div 
                      className="absolute -top-1 left-0 w-3 h-1.5 rounded-t-sm"
                      style={{ background: c.colore }}
                    />
                  </div>
                  <div 
                    className="absolute top-2.5 left-0 right-0 bottom-0 rounded"
                    style={{ 
                      background: `linear-gradient(180deg, ${c.colore} 0%, ${c.colore}dd 100%)`,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.25)'
                    }}
                  />
                </div>
                <span className="text-sm text-white font-medium truncate">{c.nome}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}