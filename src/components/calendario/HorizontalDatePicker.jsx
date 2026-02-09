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

  // Genera 12 mesi (6 prima e 6 dopo il mese corrente)
  const generateMonthsData = () => {
    const months = [];
    for (let i = -6; i <= 6; i++) {
      let month = currentMonth + i;
      let year = currentYear;
      
      while (month < 0) {
        month += 12;
        year -= 1;
      }
      while (month > 11) {
        month -= 12;
        year += 1;
      }
      
      const daysInMonth = getDaysInMonth(month, year);
      months.push({
        month,
        year,
        monthName: MONTHS[month],
        days: daysInMonth
      });
    }
    return months;
  };

  const monthsData = generateMonthsData();

  // Scroll al giorno corrente quando si apre
  useEffect(() => {
    if (todayRef.current) {
      setTimeout(() => {
        todayRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }, 100);
    }
  }, []);

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setTimeout(() => {
      todayRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, 100);
  };

  const handleDayClick = (dayData) => {
    if (onDateSelect) {
      onDateSelect(dayData.date);
    }
  };

  return (
    <div className="bg-slate-800 border-t border-slate-700 overflow-hidden">
      {/* Header con pulsante oggi */}
      <div className="flex items-center justify-center px-4 py-2 border-b border-slate-700">
        <button
          onClick={goToToday}
          className="text-xs bg-lime-400/20 text-lime-400 px-3 py-1.5 rounded-md hover:bg-lime-400/30 transition-colors font-semibold"
        >
          Vai a Oggi
        </button>
      </div>

      {/* Calendario orizzontale scrollabile continuo */}
      <div 
        ref={scrollRef}
        className="flex overflow-x-auto py-3 px-2 scrollbar-hide items-end"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {monthsData.map((monthData, monthIdx) => (
          <React.Fragment key={`${monthData.year}-${monthData.month}`}>
            {/* Separatore mese con nome */}
            {monthIdx > 0 && (
              <div className="flex flex-col items-center justify-end px-2 min-w-[50px]">
                <div className="w-[3px] h-[50px] bg-lime-400/50 rounded-full mb-1" />
                <span className="text-lime-400 text-[10px] font-bold whitespace-nowrap">
                  {monthData.monthName}
                </span>
                <span className="text-slate-500 text-[8px]">
                  {monthData.year}
                </span>
              </div>
            )}
            
            {/* Primo mese - mostra nome */}
            {monthIdx === 0 && (
              <div className="flex flex-col items-center justify-end px-2 min-w-[50px]">
                <div className="w-[3px] h-[50px] bg-lime-400/50 rounded-full mb-1" />
                <span className="text-lime-400 text-[10px] font-bold whitespace-nowrap">
                  {monthData.monthName}
                </span>
                <span className="text-slate-500 text-[8px]">
                  {monthData.year}
                </span>
              </div>
            )}
            
            {/* Giorni del mese */}
            {monthData.days.map((dayData, idx) => (
              <div
                key={`${monthData.year}-${monthData.month}-${idx}`}
                ref={dayData.isToday ? todayRef : null}
                onClick={() => handleDayClick(dayData)}
                className={cn(
                  "flex flex-col items-center justify-end cursor-pointer transition-all",
                  "border-r border-slate-700/30",
                  "px-1 pb-1"
                )}
                style={{ minWidth: '24px' }}
              >
                {/* Linea verticale */}
                <div 
                  className={cn(
                    "w-[2px] mb-1 rounded-full transition-all",
                    dayData.isToday ? "bg-lime-400" : 
                    dayData.isSelected ? "bg-blue-400" :
                    dayData.isWeekend ? "bg-orange-400/70" : "bg-slate-500"
                  )}
                  style={{ 
                    height: dayData.isWeekend ? '40px' : '24px'
                  }}
                />
                
                {/* Numero del giorno */}
                <span className={cn(
                  "text-xs font-bold leading-tight",
                  dayData.isToday ? "text-lime-400" : 
                  dayData.isSelected ? "text-blue-400" : 
                  dayData.isWeekend ? "text-orange-400" : "text-white"
                )}>
                  {dayData.day}
                </span>
                
                {/* Lettera del giorno della settimana */}
                <span className={cn(
                  "text-[9px] font-medium leading-tight",
                  dayData.isToday ? "text-lime-400" : 
                  dayData.isSelected ? "text-blue-400" :
                  dayData.isWeekend ? "text-orange-400" : "text-slate-400"
                )}>
                  {DAYS_SHORT[dayData.dayOfWeek]}
                </span>
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>

      {/* Linea indicatore sotto */}
      <div className="h-1 bg-gradient-to-r from-slate-800 via-lime-400/30 to-slate-800" />
    </div>
  );
}