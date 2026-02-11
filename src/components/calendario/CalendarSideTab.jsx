import React, { useState, useRef, useEffect } from 'react';
import { Calendar, X, LayoutGrid, Plus, AudioLines } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import HorizontalDatePicker from './HorizontalDatePicker';
import VerticalTimePicker from './VerticalTimePicker';
import FatturatoBarra from './FatturatoBarra';

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
  const [showFatturato, setShowFatturato] = useState(false);
  const goToTodayRef = useRef(null);
  const [currentMonthColor, setCurrentMonthColor] = useState(MONTH_COLORS[new Date().getMonth()]);
  const [visibleMonthLabel, setVisibleMonthLabel] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });
  const [visibleDay, setVisibleDay] = useState(new Date().getDate());
  const [userEmail, setUserEmail] = useState(null);
  
  // Refs per sincronizzazione scroll
  const calendarScrollRef = useRef(null);
  const fatturatoScrollRef = useRef(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setUserEmail(user?.email);
      } catch (e) {}
    };
    loadUser();
  }, []);

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

  // Sincronizza scroll tra calendario e fatturato
  const handleCalendarScroll = (scrollLeft) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    if (fatturatoScrollRef.current) {
      fatturatoScrollRef.current.scrollLeft = scrollLeft;
    }
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  };

  const handleFatturatoScroll = (scrollLeft) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    if (calendarScrollRef.current) {
      calendarScrollRef.current.scrollLeft = scrollLeft;
    }
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
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
          "fixed left-0 right-0 bottom-0 transition-all duration-300 ease-out",
          "bg-slate-900 shadow-2xl",
          isOpen ? "translate-y-0" : "translate-y-full",
          showTimePicker ? "z-[55]" : "z-50"
        )}
      >
        {/* Calendario orizzontale - senza spazio sopra */}
        <div>
          <HorizontalDatePicker
            goToTodayButton={
              new Date(selectedDate).toDateString() !== new Date().toDateString() ? (
                <button
                  onClick={() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (onDateSelect) {
                      onDateSelect(today);
                    }
                    goToTodayRef.current?.();
                  }}
                  className="px-2 py-0.5 rounded text-[10px] font-semibold text-slate-900 animate-pulse"
                  style={{ backgroundColor: currentMonthColor }}
                >
                  oggi
                </button>
              ) : null
            }
            monthLabelButton={
              <div className="flex items-start gap-1">
                <span 
                  className="px-2 py-0.5 rounded text-[10px] font-semibold"
                  style={{ 
                    backgroundColor: currentMonthColor,
                    color: '#0f172a'
                  }}
                >
                  {new Date(visibleMonthLabel.year, visibleMonthLabel.month).toLocaleDateString('it-IT', { month: 'short' }).toLowerCase()} {visibleMonthLabel.year}
                </span>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowTimePicker(false);
                  }}
                  className="p-0.5 rounded bg-slate-700/80 hover:bg-slate-600"
                >
                  <X className="w-4 h-4 text-slate-300" />
                </button>
              </div>
            } 
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onGoToToday={goToTodayRef}
            onMonthColorChange={setCurrentMonthColor}
            onVisibleMonthChange={(month, year) => setVisibleMonthLabel({ month, year })}
            onVisibleDayChange={(day, month, year) => {
              setVisibleDay(day);
              setVisibleMonthLabel({ month, year });
            }}
            onScrollSync={handleCalendarScroll}
            scrollRef={calendarScrollRef}
            showFatturato={showFatturato}
            currentMonthColor={currentMonthColor}
            onToggleFatturato={() => {
              const newShowFatturato = !showFatturato;
              setShowFatturato(newShowFatturato);
              // Sincronizza lo scroll quando si apre
              if (newShowFatturato && calendarScrollRef.current) {
                setTimeout(() => {
                  if (fatturatoScrollRef.current) {
                    fatturatoScrollRef.current.scrollLeft = calendarScrollRef.current.scrollLeft;
                  }
                }, 50);
              }
            }}
          />
        </div>

        {/* Barra fatturato - espandibile */}
        {showFatturato && userEmail && (
          <div className="w-full">
            <FatturatoBarra 
              selectedDate={selectedDate}
              userEmail={userEmail}
              onScrollSync={handleFatturatoScroll}
              scrollRef={fatturatoScrollRef}
              visibleMonth={visibleMonthLabel.month}
              visibleYear={visibleMonthLabel.year}
              monthColor={currentMonthColor}
              onDateSelect={handleDateSelect}
            />
          </div>
        )}
      </div>

      {/* Pannello orari - copre TUTTO lo spazio sopra il calendario fino in fondo */}
      {isOpen && showTimePicker && selectedDate && (
        <div 
          className="fixed inset-0 z-[60] bg-slate-900 flex flex-col"
          style={{ bottom: showFatturato ? '340px' : '220px' }}
        >
          <VerticalTimePicker 
            selectedDate={selectedDate}
            visibleDay={visibleDay}
            visibleMonth={visibleMonthLabel.month}
            visibleYear={visibleMonthLabel.year}
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

      {/* Overlay scuro quando il calendario è aperto */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900 z-40"
          onClick={() => {
            setIsOpen(false);
            setShowTimePicker(false);
          }}
        />
      )}
    </>
  );
}