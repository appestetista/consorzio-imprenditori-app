import React, { useState } from 'react';
import { Calendar, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import HorizontalDatePicker from './HorizontalDatePicker';

export default function CalendarSideTab({ selectedDate, onDateSelect }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleCalendar = () => {
    setIsOpen(!isOpen);
  };

  const handleDateSelect = (date) => {
    if (onDateSelect) {
      onDateSelect(date);
    }
  };

  return (
    <>
      {/* Barra calendario orizzontale in basso, sopra il footer */}
      {!isOpen && (
        <button
          onClick={toggleCalendar}
          className="fixed left-0 right-0 z-40 bg-gradient-to-r from-lime-500 to-lime-400 text-slate-900 flex items-center justify-center gap-2 py-2.5 shadow-lg"
          style={{ bottom: '88px' }}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-sm font-bold tracking-wider">APRI CALENDARIO</span>
        </button>
      )}

      {/* Pannello calendario */}
      <div
        className={cn(
          "fixed right-0 top-0 bottom-0 z-50 transition-transform duration-300 ease-out",
          "w-full max-w-md bg-slate-900 border-l border-lime-400/30 shadow-2xl",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header del pannello */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-lime-400" />
            <span className="text-white font-semibold">Seleziona Data</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Data selezionata */}
        {selectedDate && (
          <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-700">
            <p className="text-slate-400 text-xs">Data selezionata:</p>
            <p className="text-lime-400 font-semibold">
              {new Date(selectedDate).toLocaleDateString('it-IT', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </p>
          </div>
        )}

        {/* Calendario */}
        <HorizontalDatePicker 
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
        />

        {/* Istruzioni */}
        <div className="p-4 text-center">
          <p className="text-slate-500 text-sm">
            Scorri orizzontalmente per vedere tutti i giorni del mese.
            <br />
            Usa le frecce per cambiare mese.
          </p>
        </div>
      </div>

      {/* Overlay scuro quando aperto */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}