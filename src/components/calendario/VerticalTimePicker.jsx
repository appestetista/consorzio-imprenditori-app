import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import NoteEditor from './NoteEditor';

export default function VerticalTimePicker({ selectedDate, visibleDay, visibleMonth, visibleYear, onClose, onTimeSelect, onDateChange, monthColor = '#a3e635' }) {
  const scrollRef = useRef(null);
  const currentHourRef = useRef(null);
  const isScrollingRef = useRef(false);
  const lastScrollTop = useRef(0);
  const [selectedTime, setSelectedTime] = useState(null);
  const [showNoteEditor, setShowNoteEditor] = useState(false);

  // Genera tutte le ore del giorno con intervalli di 5 minuti
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const isFullHour = minute === 0;
        const isHalfHour = minute === 30;
        const isQuarterHour = minute === 15 || minute === 45;
        
        slots.push({
          hour,
          minute,
          timeString,
          isFullHour,
          isHalfHour,
          isQuarterHour
        });
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Colori per mese
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

  // Determina se è oggi
  const today = new Date();
  const displayDay = visibleDay || (selectedDate ? new Date(selectedDate).getDate() : today.getDate());
  const displayMonth = visibleMonth !== undefined ? visibleMonth : (selectedDate ? new Date(selectedDate).getMonth() : today.getMonth());
  const displayYear = visibleYear || (selectedDate ? new Date(selectedDate).getFullYear() : today.getFullYear());
  
  const isToday = displayDay === today.getDate() && displayMonth === today.getMonth() && displayYear === today.getFullYear();
  
  // Colore basato sul mese visibile (non selezionato)
  const currentMonthColor = MONTH_COLORS[displayMonth];
  
  // Colore da usare: lime se oggi, colore del mese altrimenti
  const activeColor = isToday ? '#a3e635' : currentMonthColor;

  // Scroll all'ora corrente quando è oggi (all'apertura o quando si torna a oggi)
  useEffect(() => {
    if (isToday && currentHourRef.current) {
      setTimeout(() => {
        currentHourRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [isToday, selectedDate]);

  // Gestisce il ciclo continuo: quando si raggiunge il top o il bottom, cambia giorno
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      if (isScrollingRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const scrollBottom = scrollHeight - scrollTop - clientHeight;
      
      // Se siamo arrivati in fondo (scrollando verso il basso)
      if (scrollBottom < 10 && scrollTop > lastScrollTop.current) {
        isScrollingRef.current = true;
        
        // Passa al giorno successivo
        if (onDateChange && selectedDate) {
          const nextDay = new Date(selectedDate);
          nextDay.setDate(nextDay.getDate() + 1);
          onDateChange(nextDay);
          
          // Riposiziona in alto dopo il cambio data
          setTimeout(() => {
            scrollContainer.scrollTop = 50;
            isScrollingRef.current = false;
          }, 50);
        } else {
          isScrollingRef.current = false;
        }
      }
      // Se siamo arrivati in cima (scrollando verso l'alto)
      else if (scrollTop < 10 && scrollTop < lastScrollTop.current) {
        isScrollingRef.current = true;
        
        // Passa al giorno precedente
        if (onDateChange && selectedDate) {
          const prevDay = new Date(selectedDate);
          prevDay.setDate(prevDay.getDate() - 1);
          onDateChange(prevDay);
          
          // Riposiziona in basso dopo il cambio data
          setTimeout(() => {
            scrollContainer.scrollTop = scrollHeight - clientHeight - 50;
            isScrollingRef.current = false;
          }, 50);
        } else {
          isScrollingRef.current = false;
        }
      }
      
      lastScrollTop.current = scrollTop;
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [selectedDate, onDateChange]);

  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();
  
  // Trova lo slot corrente (arrotondato ai 5 minuti)
  const currentSlotMinute = Math.floor(currentMinute / 5) * 5;

  const handleTimeClick = (slot) => {
    // Toggle selezione: se clicco sullo stesso, deseleziono
    if (selectedTime === slot.timeString) {
      setSelectedTime(null);
    } else {
      setSelectedTime(slot.timeString);
    }
    if (onTimeSelect) {
      onTimeSelect(slot.timeString);
    }
  };

  const formattedDate = selectedDate 
    ? new Date(selectedDate).toLocaleDateString('it-IT', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short' 
      })
    : '';

  // Formatta la data per la fascia laterale
  const formattedDayNumber = selectedDate ? new Date(selectedDate).getDate() : '';
  const formattedMonth = selectedDate ? new Date(selectedDate).toLocaleDateString('it-IT', { month: 'short' }).toLowerCase() : '';

  // Formatta la data completa per la fascia laterale
  const displayDate = new Date(displayYear, displayMonth, displayDay);

  const formattedFullDate = `${displayDate.toLocaleDateString('it-IT', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })} ( ${displayDate.toLocaleDateString('it-IT', { weekday: 'long' })} )`;

  const handleNoteSave = (noteData) => {
    console.log('Nota salvata:', noteData);
    // TODO: salvare la nota nel database
    setShowNoteEditor(false);
  };

  return (
    <div className="bg-slate-900 w-full flex h-full overflow-hidden">
      {/* Fascia verticale con data completa ruotata */}
      <div 
        className="flex items-center justify-center border-r border-slate-700"
        style={{ 
          backgroundColor: isToday ? 'rgba(163, 230, 53, 0.1)' : `${currentMonthColor}15`,
          minWidth: '32px'
        }}
      >
        <div 
          className="text-base font-bold whitespace-nowrap"
          style={{ 
            color: activeColor,
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)'
          }}
        >
          {formattedFullDate}
        </div>
      </div>

      {/* Lista orari scrollabile verticale */}
      <div 
        ref={scrollRef}
        className={cn(
          "overflow-y-auto scrollbar-hide px-4 py-2 min-h-0 transition-all",
          showNoteEditor ? "w-[100px] flex-shrink-0" : "flex-1"
        )}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {timeSlots.map((slot, idx) => {
          const isCurrentTime = slot.hour === currentHour && 
            slot.minute === currentSlotMinute;

          const isSelected = selectedTime === slot.timeString;

          return (
            <div
              key={idx}
              ref={isCurrentTime ? currentHourRef : null}
              data-time={slot.timeString}
              onClick={() => handleTimeClick(slot)}
              className={cn(
                "flex items-center cursor-pointer transition-all hover:bg-slate-700 rounded px-2",
                slot.isFullHour ? "h-8" : "h-6",
                isSelected && "bg-slate-700/50"
              )}
              style={{
                backgroundColor: isSelected ? 'rgba(100, 100, 100, 0.3)' : 
                  (isCurrentTime && isToday) ? 'rgba(163, 230, 53, 0.2)' : undefined
              }}
            >
              {/* Pulsante + giallo se selezionato, altrimenti linea */}
              {isSelected ? (
                <button 
                  className="w-6 h-6 rounded-full bg-amber-500 hover:bg-amber-400 flex items-center justify-center mr-2 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNoteEditor(true);
                  }}
                >
                  <Plus className="w-4 h-4 text-white" />
                </button>
              ) : (
                <div 
                  className="h-[2px] rounded-full mr-2"
                  style={{ 
                    width: slot.isFullHour ? '20px' : '10px',
                    backgroundColor: (isCurrentTime && isToday) ? '#a3e635' : 
                      slot.isFullHour ? activeColor : '#475569'
                  }}
                />
              )}

              {/* Orario a destra */}
              <span 
                className={cn(
                  "font-mono text-xs",
                  slot.isFullHour && "font-bold"
                )}
                style={{
                  color: (isCurrentTime && isToday) ? '#a3e635' : 
                    slot.isFullHour ? activeColor : '#94a3b8'
                }}
              >
                {slot.timeString}
              </span>
            </div>
          );
        })}
      </div>

      {/* Pannello NoteEditor affiancato a destra */}
      {showNoteEditor && (
        <div className="flex-1 border-l border-slate-700 overflow-hidden">
          <NoteEditor 
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onClose={() => setShowNoteEditor(false)}
            onSave={handleNoteSave}
            inline={true}
          />
        </div>
      )}
    </div>
  );
}