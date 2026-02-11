import React, { useState } from 'react';
import { ChevronLeft, Check, CheckCircle2, PlusCircle, AudioLines } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NoteEditor({ selectedDate, selectedTime, onClose, onSave, inline = false }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // Formatta la data per il display
  const today = new Date();
  const isToday = selectedDate && 
    new Date(selectedDate).toDateString() === today.toDateString();
  
  const formattedDate = isToday 
    ? 'Oggi' 
    : selectedDate 
      ? new Date(selectedDate).toLocaleDateString('it-IT', { 
          day: 'numeric', 
          month: 'long' 
        })
      : '';

  const handleSave = () => {
    if (onSave) {
      onSave({
        title: title || 'Senza titolo',
        content,
        date: selectedDate,
        time: selectedTime
      });
    }
    onClose();
  };

  return (
    <div className={cn(
      "bg-black flex flex-col",
      inline ? "h-full" : "fixed inset-0 z-[60]"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
        <button 
          onClick={onClose}
          className="p-1"
        >
          <ChevronLeft className="w-5 h-5 text-slate-400" />
        </button>
        
        {/* Data e ora nel header */}
        <div className="text-slate-400 text-xs">
          {formattedDate} {selectedTime}
        </div>
        
        <button 
          onClick={handleSave}
          className="p-1"
        >
          <Check className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-3 py-2 overflow-y-auto">
        {/* Titolo */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titolo"
          className={cn(
            "w-full bg-transparent text-white font-light outline-none placeholder:text-slate-500 mb-2",
            inline ? "text-xl" : "text-3xl"
          )}
          autoFocus
        />

        {/* Area contenuto */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Scrivi qui..."
          className="w-full flex-1 min-h-[200px] bg-transparent text-white text-sm outline-none placeholder:text-slate-600 resize-none"
        />
      </div>

      {/* Footer con azioni */}
      <div className="flex items-center justify-center gap-6 py-2 border-t border-slate-800">
        <button className="flex flex-col items-center gap-0.5">
          <CheckCircle2 className="w-5 h-5 text-slate-400" />
          <span className="text-[10px] text-slate-400">Elenco</span>
        </button>
        
        <button className="flex flex-col items-center gap-0.5">
          <PlusCircle className="w-5 h-5 text-slate-400" />
          <span className="text-[10px] text-slate-400">Aggiungi</span>
        </button>
        
        <button className="flex flex-col items-center gap-0.5">
          <AudioLines className="w-5 h-5 text-slate-400" />
          <span className="text-[10px] text-slate-400">Registra</span>
        </button>
      </div>
    </div>
  );
}