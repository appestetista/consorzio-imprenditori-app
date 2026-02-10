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
        const isQuarter = minute === 15 || minute === 45;
        
        slots.push({
          hour,
          minute,
          timeString,
          isFullHour,
          isHalfHour,
          isQuarter
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
    <div className="bg-slate-800 border-l border-slate-700 h-full flex flex-col" style={{ width: '100px' }}>
      {/* Header */}
      <div className="p-2 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-lime-400" />
          <span className="text-white text-xs font-semibold">{formattedDate}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-700 transition-colors"
        >
          <X className="w-3 h-3 text-slate-400" />
        </button>
      </div>

      {/* Lista orari scrollabile */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-hide"
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
                "flex items-center px-2 cursor-pointer transition-all hover:bg-slate-700",
                isCurrentTime && "bg-lime-400/20"
              )}
              style={{
                height: slot.isFullHour ? '40px' : slot.isHalfHour ? '28px' : '20px'
              }}
            >
              {/* Linea orizzontale */}
              <div 
                className={cn(
                  "rounded-full mr-2",
                  slot.isFullHour ? "h-[3px] w-8" : slot.isHalfHour ? "h-[2px] w-5" : "h-[1px] w-3"
                )}
                style={{ 
                  backgroundColor: isCurrentTime ? '#a3e635' : 
                    slot.isFullHour ? '#a3e635' : 
                    slot.isHalfHour ? '#64748b' : '#475569'
                }}
              />
              
              {/* Orario */}
              <span 
                className={cn(
                  "font-mono",
                  slot.isFullHour ? "text-sm font-bold" : slot.isHalfHour ? "text-xs font-medium" : "text-[10px]",
                  isCurrentTime ? "text-lime-400" : 
                    slot.isFullHour ? "text-white" : "text-slate-500"
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