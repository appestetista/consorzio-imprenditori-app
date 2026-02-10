import React, { useState } from 'react';
import { ChevronLeft, Check, CheckCircle2, PlusCircle, AudioLines } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NoteEditor({ selectedDate, selectedTime, onClose, onSave }) {
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
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button 
          onClick={onClose}
          className="p-2 -ml-2"
        >
          <ChevronLeft className="w-6 h-6 text-slate-400" />
        </button>
        
        <div className="w-6" /> {/* Spacer */}
        
        <button 
          onClick={handleSave}
          className="p-2 -mr-2"
        >
          <Check className="w-6 h-6 text-slate-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-2">
        {/* Titolo */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titolo"
          className="w-full bg-transparent text-white text-3xl font-light outline-none placeholder:text-slate-500 mb-2"
          autoFocus
        />
        
        {/* Data e ora */}
        <div className="text-slate-500 text-base mb-6">
          {formattedDate} {selectedTime}
        </div>

        {/* Area contenuto */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Scrivi qui..."
          className="w-full h-[calc(100%-120px)] bg-transparent text-white text-base outline-none placeholder:text-slate-600 resize-none"
        />
      </div>

      {/* Footer con azioni */}
      <div className="flex items-center justify-center gap-8 py-4 border-t border-slate-800">
        <button className="flex flex-col items-center gap-1">
          <CheckCircle2 className="w-6 h-6 text-slate-400" />
          <span className="text-xs text-slate-400">Elenco</span>
        </button>
        
        <button className="flex flex-col items-center gap-1">
          <PlusCircle className="w-6 h-6 text-slate-400" />
          <span className="text-xs text-slate-400">Aggiungi</span>
        </button>
        
        <button className="flex flex-col items-center gap-1">
          <AudioLines className="w-6 h-6 text-slate-400" />
          <span className="text-xs text-slate-400">Registra</span>
        </button>
      </div>
    </div>
  );
}