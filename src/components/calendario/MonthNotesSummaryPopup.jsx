import React, { useState } from 'react';
import { X, Check, Folder, Trash2 } from 'lucide-react';

const MONTH_COLORS = [
  '#3b82f6','#8b5cf6','#ec4899','#14b8a6','#22c55e','#eab308',
  '#f97316','#ef4444','#06b6d4','#a855f7','#6366f1','#0ea5e9'
];
const MONTHS_FULL = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

export default function MonthNotesSummaryPopup({ notes, cartelleMap, monthIndex, year, onClose, onNoteClick, onDeleteNote }) {
  const [completedNotes, setCompletedNotes] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null); // note id
  const mc = MONTH_COLORS[monthIndex];

  // Ordina note per data e poi per orario
  const sortedNotes = [...notes].sort((a, b) => {
    const dc = (a.data || '').localeCompare(b.data || '');
    if (dc !== 0) return dc;
    return (a.time || '00:00').localeCompare(b.time || '00:00');
  });

  const toggleCompleted = (noteId) => {
    setCompletedNotes(prev => ({ ...prev, [noteId]: !prev[noteId] }));
  };

  // Raggruppa per giorno
  let lastDay = null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/60 w-[90vw] max-w-sm max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
          <div>
            <h3 className="text-white font-bold text-sm">📋 Note di {MONTHS_FULL[monthIndex]} {year}</h3>
            <p className="text-[11px]" style={{ color: mc }}>{sortedNotes.length} {sortedNotes.length === 1 ? 'nota' : 'note'}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center hover:bg-slate-600">
            <X className="w-4 h-4 text-slate-300" />
          </button>
        </div>

        {/* Lista note */}
        <div className="flex-1 overflow-y-auto px-3 py-2" style={{ scrollbarWidth: 'none' }}>
          {sortedNotes.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">Nessuna nota questo mese</div>
          ) : (
            sortedNotes.map((note, idx) => {
              const noteTime = note.time || '00:00';
              const noteDay = note.data ? parseInt(note.data.split('-')[2]) : 0;
              const cart = note.cartella_id ? cartelleMap?.[note.cartella_id] : null;
              const noteColor = cart?.colore || mc;
              const isCompleted = !!completedNotes[note.id || idx];
              const showDayHeader = noteDay !== lastDay;
              lastDay = noteDay;

              // Nome giorno della settimana
              const dayLabel = note.data
                ? new Date(note.data + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' })
                : `${noteDay}`;

              return (
                <React.Fragment key={note.id || idx}>
                  {showDayHeader && (
                    <div className="flex items-center gap-2 mt-3 mb-1.5 px-1">
                      <span className="text-[11px] font-bold uppercase" style={{ color: mc }}>{dayLabel}</span>
                      <div className="flex-1 h-px" style={{ backgroundColor: mc + '30' }} />
                    </div>
                  )}
                  <div
                    className="flex items-center gap-2 py-2 border-b border-slate-800/40 last:border-b-0 rounded-lg px-1.5 transition-colors hover:bg-slate-800/30"
                  >
                    {/* Checkbox completamento */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleCompleted(note.id || idx); }}
                      className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border transition-all touch-manipulation ${
                        isCompleted 
                          ? 'border-lime-500 bg-lime-500/20' 
                          : 'border-slate-600 bg-transparent hover:border-slate-400'
                      }`}
                    >
                      {isCompleted && <Check className="w-3 h-3 text-lime-400" />}
                    </button>

                    {/* Contenuto nota - cliccabile per aprire */}
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => onNoteClick?.(note)}
                    >
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="text-[10px] font-mono font-bold flex-shrink-0" 
                          style={{ color: isCompleted ? '#475569' : noteColor }}
                        >
                          {noteTime}
                        </span>
                        <span 
                          className={`text-sm font-medium truncate ${isCompleted ? 'line-through text-slate-600' : 'text-white'}`}
                        >
                          {note.title}
                        </span>
                      </div>
                      {cart && (
                        <div className="flex items-center gap-1 ml-12 mt-0.5" style={{ color: isCompleted ? '#475569' : cart.colore }}>
                          <Folder className="w-3 h-3 flex-shrink-0" />
                          <span className="text-[10px]">/ {cart.nome}</span>
                        </div>
                      )}
                    </div>

                    {/* Cestino elimina nota (solo dalla data, non dalla cartella) */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(note); }}
                      className="w-6 h-6 rounded-full bg-red-500/15 hover:bg-red-500/30 flex items-center justify-center flex-shrink-0 touch-manipulation active:scale-90 transition-all"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-700/50 flex items-center justify-between">
          <span className="text-[10px] text-slate-500">
            {Object.values(completedNotes).filter(Boolean).length} / {sortedNotes.length} completate
          </span>
        </div>

        {/* Popup conferma eliminazione */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70" onClick={() => setDeleteConfirm(null)}>
            <div className="bg-slate-800 rounded-xl p-5 w-72 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-white font-semibold text-base mb-2">⚠️ Eliminare nota?</h3>
              <p className="text-slate-300 text-sm mb-1">
                <span className="font-semibold text-lime-400">{deleteConfirm.title}</span>
              </p>
              {deleteConfirm.cartella_id && cartelleMap?.[deleteConfirm.cartella_id] && (
                <p className="text-slate-400 text-xs mb-2 flex items-center gap-1">
                  <Folder className="w-3 h-3" style={{ color: cartelleMap[deleteConfirm.cartella_id].colore }} />
                  Resterà nella cartella "{cartelleMap[deleteConfirm.cartella_id].nome}"
                </p>
              )}
              <p className="text-slate-500 text-[11px] mb-4">
                La nota verrà rimossa dal calendario.{deleteConfirm.cartella_id ? ' I file nella cartella non verranno toccati.' : ''}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-sm"
                >
                  Annulla
                </button>
                <button
                  onClick={() => {
                    if (onDeleteNote) onDeleteNote(deleteConfirm);
                    setDeleteConfirm(null);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-sm font-semibold"
                >
                  Elimina
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}