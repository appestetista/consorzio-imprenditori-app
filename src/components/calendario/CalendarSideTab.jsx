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

      {/* Pannello calendario - si apre dal basso */}
      <div
        className={cn(
          "fixed left-0 right-0 bottom-0 z-50 transition-transform duration-300 ease-out",
          "bg-slate-900 border-t border-lime-400/30 shadow-2xl",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
        style={{ height: 'min(220px, 35vh)' }}
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

        {/* Etichette come tab attaccate al contenuto sotto */}
        {selectedDate && (
          <div className="flex justify-between items-end px-2">
            {/* Torna Oggi a sinistra - solo se NON è oggi */}
            {new Date(selectedDate).toDateString() !== new Date().toDateString() ? (
              <button
                onClick={() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  if (onDateSelect) {
                    onDateSelect(today);
                  }
                  goToTodayRef.current?.();
                }}
                className="px-3 py-1 rounded-t-lg text-[11px] font-semibold bg-lime-400/20 text-lime-400"
              >
                torna oggi
              </button>
            ) : (
              <div />
            )}
            
            {/* Mese/anno a destra + X chiudi */}
            <div className="flex items-end gap-1">
              <span 
                className="px-3 py-1 rounded-t-lg text-[11px] font-semibold"
                style={{ 
                  backgroundColor: new Date(selectedDate).toDateString() === new Date().toDateString() ? 'rgba(163, 230, 53, 0.2)' : `${currentMonthColor}20`,
                  color: new Date(selectedDate).toDateString() === new Date().toDateString() ? '#a3e635' : currentMonthColor
                }}
              >
                {new Date(selectedDate).toLocaleDateString('it-IT', { month: 'short' }).toLowerCase()} {new Date(selectedDate).getFullYear()}
              </span>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowTimePicker(false);
                }}
                className="px-2 py-1 rounded-t-lg bg-slate-700/50 hover:bg-slate-700"
              >
                <X className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>
        )}

        {/* Calendario orizzontale */}
        <HorizontalDatePicker 
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          onGoToToday={goToTodayRef}
          onMonthColorChange={setCurrentMonthColor}
        />


      </div>

      {/* Pannello orari - copre tutto lo spazio sopra il calendario */}
      {isOpen && showTimePicker && selectedDate && (
        <div 
          className="fixed left-0 right-0 top-0 z-50 bg-slate-900"
          style={{ bottom: 'min(220px, 35vh)' }}
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
                if (goToTodayRef.scrollToDate) {
                  goToTodayRef.scrollToDate(newDate);
                }
              }, 100);
            }}
            monthColor={currentMonthColor}
          />
        </div>
      )}

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