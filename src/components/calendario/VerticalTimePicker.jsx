import React, { useRef, useEffect } from 'react';
import { X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function VerticalTimePicker({ selectedDate, onClose, onTimeSelect }) {
  const scrollRef = useRef(null);
  const currentHourRef = useRef(null);

  // Genera tutte le ore del giorno con intervalli di 15 minuti
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const isFullHour = minute === 0;
        const isHalfHour = minute === 30;
        
        slots.push({
          hour,
          minute,
          timeString,
          isFullHour,
          isHalfHour
        });
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Scroll all'ora corrente
  useEffect(() => {
    if (currentHourRef.current) {
      setTimeout(() => {
        currentHourRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, []);

  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();

  const handleTimeClick = (slot) => {
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

  return (
    <div className="bg-slate-900 w-full flex flex-col h-full">
      {/* Lista orari scrollabile verticale */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-hide px-4 py-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {timeSlots.map((slot, idx) => {
          const isCurrentTime = slot.hour === currentHour && 
            currentMinute >= slot.minute && 
            currentMinute < slot.minute + 15;

          return (
            <div
              key={idx}
              ref={isCurrentTime ? currentHourRef : null}
              onClick={() => handleTimeClick(slot)}
              className={cn(
                "flex items-center justify-between cursor-pointer transition-all hover:bg-slate-700 rounded px-2",
                isCurrentTime && "bg-lime-400/20",
                slot.isFullHour ? "h-8" : "h-5"
              )}
            >
              {/* Orario a sinistra */}
              <span 
                className={cn(
                  "font-mono",
                  slot.isFullHour ? "text-sm font-bold" : "text-[10px]",
                  isCurrentTime ? "text-lime-400" : 
                    slot.isFullHour ? "text-white" : "text-slate-500"
                )}
              >
                {slot.timeString}
              </span>

              {/* Linea a destra */}
              <div 
                className="h-[2px] w-4 rounded-full"
                style={{ 
                  backgroundColor: isCurrentTime ? '#a3e635' : 
                    slot.isFullHour ? '#a3e635' : 
                    slot.isHalfHour ? '#64748b' : '#475569'
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Pulsante chiudi in basso */}
      <div className="px-4 py-2 border-t border-slate-700 flex justify-end">
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>
    </div>
  );
}