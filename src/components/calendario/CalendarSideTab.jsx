import React, { useState } from 'react';
import { Calendar, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import HorizontalDatePicker from './HorizontalDatePicker';
import VerticalTimePicker from './VerticalTimePicker';

export default function CalendarSideTab({ selectedDate, onDateSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const toggleCalendar = () => {
    setIsOpen(!isOpen);
  };

  const handleDateSelect = (date) => {
    if (onDateSelect) {
      onDateSelect(date);
    }
    // Mostra il time picker quando si seleziona una data
    setShowTimePicker(true);
  };

  const handleTimeSelect = (time) => {
    console.log('Orario selezionato:', time);
    // Qui puoi gestire la selezione dell'orario
  };

  return (
    <>
      {/* Linguetta laterale */}
      <button
        onClick={toggleCalendar}
        className={cn(
          "fixed right-0 top-1/2 -translate-y-1/2 z-40 transition-all duration-300",
          "bg-gradient-to-l from-lime-400 to-lime-500 text-slate-900",
          "rounded-l-xl shadow-lg shadow-lime-400/20",
          "flex items-center justify-center",
          "hover:pr-2 active:scale-95",
          isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
        style={{
          width: '32px',
          height: '80px',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed'
        }}
      >
        <div className="flex items-center gap-1 rotate-180">
          <Calendar className="w-4 h-4" />
          <span className="text-xs font-bold tracking-wider">DATA</span>
        </div>
      </button>

      {/* Pannello orari - copre tutto lo spazio sopra il calendario */}
      {isOpen && showTimePicker && selectedDate && (
        <div 
          className="fixed left-0 right-0 top-0 z-50 bg-slate-900"
          style={{ bottom: '280px' }}
        >
          <VerticalTimePicker 
            selectedDate={selectedDate}
            onClose={() => setShowTimePicker(false)}
            onTimeSelect={handleTimeSelect}
          />
        </div>
      )}

      {/* Pannello calendario - si apre dal basso */}
      <div
        className={cn(
          "fixed left-0 right-0 bottom-0 z-50 transition-transform duration-300 ease-out",
          "bg-slate-900 border-t border-lime-400/30 shadow-2xl",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Header del pannello - visibile solo se NON c'è il time picker */}
        {!showTimePicker && (
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-lime-400" />
              <span className="text-white font-semibold">Seleziona Data</span>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                setShowTimePicker(false);
              }}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        )}

        {/* Calendario orizzontale */}
        <HorizontalDatePicker 
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
        />

        {/* Data selezionata */}
        {selectedDate && (
          <div className="px-4 py-3 bg-slate-800/50 border-t border-slate-700">
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