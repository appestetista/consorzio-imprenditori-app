import React, { useState, useRef } from 'react';
import { Calendar, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import HorizontalDatePicker from './HorizontalDatePicker';
import VerticalTimePicker from './VerticalTimePicker';

const MONTH_COLORS = [
  '#3b82f6', // Gennaio - blu
  '#8b5cf6', // Febbraio - viola
  '#ec4899', // Marzo - rosa
  '#14b8a6', // Aprile - teal
  '#22c55e', // Maggio - verde
  '#eab308', // Giugno - giallo
  '#f97316', // Luglio - arancione
  '#ef4444', // Agosto - rosso
  '#06b6d4', // Settembre - cyan
  '#a855f7', // Ottobre - purple
  '#6366f1', // Novembre - indigo
  '#0ea5e9', // Dicembre - sky
];

export default function CalendarSideTab({ selectedDate, onDateSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const goToTodayRef = useRef(null);
  const [currentMonthColor, setCurrentMonthColor] = useState(MONTH_COLORS[new Date().getMonth()]);

  const toggleCalendar = () => {
    if (!isOpen) {
      // Quando apro il calendario, seleziono automaticamente oggi
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (onDateSelect) {
        onDateSelect(today);
      }
      setShowTimePicker(true);
    }
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

      {/* Pannello orari - copre tutto lo spazio sopra il calendario, congiunto */}
      {isOpen && showTimePicker && selectedDate && (
        <div 
          className="fixed left-0 right-0 top-0 z-50 bg-slate-900 border-b border-slate-700"
          style={{ bottom: '220px' }}
        >
          <VerticalTimePicker 
            selectedDate={selectedDate}
            onClose={() => setShowTimePicker(false)}
            onTimeSelect={handleTimeSelect}
            onDateChange={(newDate) => {
              if (onDateSelect) {
                onDateSelect(newDate);
              }
              // Scrolla anche il calendario orizzontale alla nuova data
              setTimeout(() => {
                goToTodayRef.current?.();
              }, 100);
            }}
            monthColor={currentMonthColor}
          />
        </div>
      )}

      {/* Pannello calendario - si apre dal basso */}
      <div
        className={cn(
          "fixed left-0 right-0 bottom-0 z-50 transition-transform duration-300 ease-out",
          "bg-slate-900 border-t border-lime-400/30 shadow-2xl relative",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Etichetta mese/anno in alto a destra */}
        {selectedDate && (
          <div className="absolute top-0 right-0 z-10">
            <div 
              className="px-2 py-1 rounded-bl-lg text-xs font-semibold"
              style={{ 
                backgroundColor: new Date(selectedDate).toDateString() === new Date().toDateString() ? 'rgba(163, 230, 53, 0.2)' : `${currentMonthColor}20`,
                color: new Date(selectedDate).toDateString() === new Date().toDateString() ? '#a3e635' : currentMonthColor
              }}
            >
              {new Date(selectedDate).toLocaleDateString('it-IT', { month: 'short' }).toLowerCase()} {new Date(selectedDate).getFullYear()}
            </div>
          </div>
        )}

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
          onGoToToday={goToTodayRef}
          onMonthColorChange={setCurrentMonthColor}
        />

        {/* Data selezionata con Vai a Oggi e X in basso a destra */}
        {selectedDate && (
          <div className="px-4 py-3 bg-slate-800/50 border-t border-slate-700 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs">Data selezionata:</p>
              <p className="font-semibold" style={{ color: selectedDate && new Date(selectedDate).toDateString() === new Date().toDateString() ? '#a3e635' : currentMonthColor }}>
                {new Date(selectedDate).toLocaleDateString('it-IT', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Divisorio verticale */}
              <div className="w-px h-10 bg-slate-600 mx-1" />

              <div className="flex flex-col items-center">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">torna a</span>
                <button
                  onClick={() => {
                    // Seleziona oggi come data
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (onDateSelect) {
                      onDateSelect(today);
                    }
                    // Scrolla al giorno di oggi
                    goToTodayRef.current?.();
                  }}
                  className="text-xs bg-lime-400/20 text-lime-400 px-3 py-1.5 rounded-md hover:bg-lime-400/30 transition-colors font-semibold"
                >
                  Oggi
                </button>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowTimePicker(false);
                }}
                className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
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