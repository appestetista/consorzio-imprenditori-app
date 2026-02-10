import React, { useRef, useEffect } from 'react';
import { X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function VerticalTimePicker({ selectedDate, onClose, onTimeSelect }) {
  const scrollRef = useRef(null);
  const currentHourRef = useRef(null);

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

  // Determina se è oggi
  const isToday = selectedDate && new Date(selectedDate).toDateString() === new Date().toDateString();

  // Scroll all'ora corrente (se oggi) o alle 8:00 (se giorno futuro)
  useEffect(() => {
    setTimeout(() => {
      if (isToday && currentHourRef.current) {
        currentHourRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // Scroll alle 8:00 per giorni futuri
        const slot8am = scrollRef.current?.querySelector('[data-time="08:00"]');
        if (slot8am) {
          slot8am.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 100);
  }, [isToday, selectedDate]);

  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();
  
  // Trova lo slot corrente (arrotondato ai 5 minuti)
  const currentSlotMinute = Math.floor(currentMinute / 5) * 5;

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
            slot.minute === currentSlotMinute;

          return (
            <div
              key={idx}
              ref={isCurrentTime ? currentHourRef : null}
              data-time={slot.timeString}
              onClick={() => handleTimeClick(slot)}
              className={cn(
                "flex items-center cursor-pointer transition-all hover:bg-slate-700 rounded px-2",
                isCurrentTime && "bg-lime-400/20",
                slot.isFullHour ? "h-8" : slot.isHalfHour ? "h-6" : slot.isQuarterHour ? "h-5" : "h-4"
              )}
            >
              {/* Linea a sinistra */}
              <div 
                className="h-[2px] rounded-full mr-2"
                style={{ 
                  width: slot.isFullHour ? '20px' : slot.isHalfHour ? '14px' : slot.isQuarterHour ? '10px' : '6px',
                  backgroundColor: isCurrentTime ? '#a3e635' : 
                    slot.isFullHour ? '#a3e635' : 
                    slot.isHalfHour ? '#64748b' : 
                    slot.isQuarterHour ? '#475569' : '#334155'
                }}
              />

              {/* Orario a destra */}
              <span 
                className={cn(
                  "font-mono",
                  slot.isFullHour ? "text-sm font-bold" : 
                    slot.isHalfHour ? "text-xs" : 
                    slot.isQuarterHour ? "text-[10px]" : "text-[9px]",
                  isCurrentTime ? "text-lime-400" : 
                    slot.isFullHour ? "text-white" : 
                    slot.isHalfHour ? "text-slate-400" : "text-slate-500"
                )}
              >
                {slot.timeString}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}