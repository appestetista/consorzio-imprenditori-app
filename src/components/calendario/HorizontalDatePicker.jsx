import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAYS_SHORT = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];
const MONTHS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

export default function HorizontalDatePicker({ selectedDate, onDateSelect, onClose }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const scrollRef = useRef(null);
  const todayRef = useRef(null);
  const [visibleMonth, setVisibleMonth] = useState({ name: MONTHS[today.getMonth()], year: today.getFullYear() });
  const monthRefs = useRef({});

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

  // Observer per rilevare il mese visibile durante lo scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const [year, month] = entry.target.dataset.month.split('-');
            setVisibleMonth({ name: MONTHS[parseInt(month)], year: parseInt(year) });
          }
        });
      },
      {
        root: scrollRef.current,
        threshold: 0.5
      }
    );

    Object.values(monthRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [monthsData]);

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
          <div 
            key={`${monthData.year}-${monthData.month}`}
            ref={(el) => monthRefs.current[`${monthData.year}-${monthData.month}`] = el}
            data-month={`${monthData.year}-${monthData.month}`}
            className="flex items-end"
          >
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
          </div>
        ))}
      </div>

      {/* Nome mese corrente visibile */}
      <div className="bg-slate-900 border-t border-slate-700 py-2 text-center">
        <span className="text-lime-400 font-bold text-sm">
          {visibleMonth.name} {visibleMonth.year}
        </span>
      </div>
    </div>
  );
}