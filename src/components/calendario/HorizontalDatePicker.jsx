import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAYS_SHORT = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];
const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

export default function HorizontalDatePicker({ selectedDate, onDateSelect, onClose }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const scrollRef = useRef(null);
  const todayRef = useRef(null);

  // Genera tutti i giorni del mese corrente
  const getDaysInMonth = (month, year) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        day,
        date,
        dayOfWeek: date.getDay(), // 0 = Domenica, 6 = Sabato
        isToday: date.getTime() === today.getTime(),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        isSelected: selectedDate && date.toDateString() === new Date(selectedDate).toDateString()
      });
    }
    return days;
  };

  const days = getDaysInMonth(currentMonth, currentYear);

  // Scroll al giorno corrente quando si apre
  useEffect(() => {
    if (todayRef.current && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
      todayRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [currentMonth, currentYear]);

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  const handleDayClick = (dayData) => {
    if (onDateSelect) {
      onDateSelect(dayData.date);
    }
  };

  return (
    <div className="bg-slate-800 border-t border-slate-700 overflow-hidden">
      {/* Header con mese/anno e navigazione */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <button 
          onClick={goToPrevMonth}
          className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-400" />
        </button>
        
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold">
            {MONTHS[currentMonth]} {currentYear}
          </span>
          <button
            onClick={goToToday}
            className="text-xs bg-lime-400/20 text-lime-400 px-2 py-1 rounded-md hover:bg-lime-400/30 transition-colors"
          >
            Oggi
          </button>
        </div>
        
        <button 
          onClick={goToNextMonth}
          className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Calendario orizzontale scrollabile */}
      <div 
        ref={scrollRef}
        className="flex overflow-x-auto py-3 px-2 gap-1 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {days.map((dayData, idx) => (
          <div
            key={idx}
            ref={dayData.isToday ? todayRef : null}
            onClick={() => handleDayClick(dayData)}
            className={cn(
              "flex flex-col items-center justify-center min-w-[44px] h-[60px] rounded-lg cursor-pointer transition-all border-l border-slate-700/50",
              dayData.isToday && "bg-lime-400 text-slate-900",
              dayData.isSelected && !dayData.isToday && "bg-blue-500 text-white",
              !dayData.isToday && !dayData.isSelected && "hover:bg-slate-700",
              dayData.isWeekend && !dayData.isToday && !dayData.isSelected && "bg-slate-700/50"
            )}
          >
            {/* Numero del giorno */}
            <span className={cn(
              "text-lg font-bold",
              dayData.isToday ? "text-slate-900" : dayData.isSelected ? "text-white" : "text-white"
            )}>
              {dayData.day}
            </span>
            
            {/* Lettera del giorno della settimana */}
            <span className={cn(
              "text-xs font-medium",
              dayData.isToday ? "text-slate-700" : 
              dayData.isSelected ? "text-white/80" :
              dayData.isWeekend ? "text-orange-400" : "text-slate-400"
            )}>
              {DAYS_SHORT[dayData.dayOfWeek]}
            </span>
          </div>
        ))}
      </div>

      {/* Linea indicatore sotto */}
      <div className="h-1 bg-gradient-to-r from-slate-800 via-lime-400/30 to-slate-800" />
    </div>
  );
}