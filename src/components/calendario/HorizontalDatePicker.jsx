import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAYS_SHORT = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];
const MONTHS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
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

export default function HorizontalDatePicker({ selectedDate, onDateSelect, onGoToToday }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const scrollRef = useRef(null);
  const todayRef = useRef(null);
  const [visibleMonth, setVisibleMonth] = useState({ name: MONTHS[today.getMonth()], year: today.getFullYear(), color: MONTH_COLORS[today.getMonth()] });
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
        color: MONTH_COLORS[month],
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

  // Observer per rilevare il mese visibile durante lo scroll - più reattivo
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const containerRect = scrollContainer.getBoundingClientRect();
      const centerX = containerRect.left + containerRect.width / 2;

      // Trova il giorno più vicino al centro dello scroll
      const dayElements = scrollContainer.querySelectorAll('[data-day-info]');
      let closestElement = null;
      let closestDistance = Infinity;

      dayElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const elCenterX = rect.left + rect.width / 2;
        const distance = Math.abs(elCenterX - centerX);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestElement = el;
        }
      });

      if (closestElement) {
        const [year, month] = closestElement.dataset.dayInfo.split('-');
        const monthIdx = parseInt(month);
        const yearInt = parseInt(year);

        // Aggiorna solo se cambiato
        setVisibleMonth(prev => {
          if (prev.name !== MONTHS[monthIdx] || prev.year !== yearInt) {
            return { name: MONTHS[monthIdx], year: yearInt, color: MONTH_COLORS[monthIdx] };
          }
          return prev;
        });
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setTimeout(() => {
      todayRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, 100);
    if (onGoToToday) onGoToToday();
  };

  // Esponi la funzione goToToday
  React.useEffect(() => {
    if (onGoToToday) {
      onGoToToday.current = goToToday;
    }
  }, []);

  const handleDayClick = (dayData) => {
    if (onDateSelect) {
      onDateSelect(dayData.date);
    }
  };

  return (
    <div className="bg-slate-800 border-t border-slate-700 overflow-hidden">


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
                data-day-info={`${monthData.year}-${monthData.month}`}
                onClick={() => handleDayClick(dayData)}
                className={cn(
                  "flex flex-col items-center justify-end cursor-pointer transition-all",
                  "border-r border-slate-700/30",
                  "px-1 pb-1"
                )}
                style={{ minWidth: '24px' }}
              >
                {/* Linea verticale - lime per oggi, colore mese per altri */}
                <div 
                  className="w-[2px] mb-1 rounded-full transition-all"
                  style={{ 
                    height: dayData.isWeekend ? '40px' : '24px',
                    backgroundColor: dayData.isToday ? '#a3e635' : monthData.color
                  }}
                />

                {/* Puntino rosso per weekend */}
                {dayData.isWeekend && !dayData.isToday && (
                  <div className="w-[4px] h-[4px] rounded-full bg-red-500 mb-0.5" />
                )}

                {/* Numero del giorno */}
                <span 
                  className="text-xs font-bold leading-tight"
                  style={{ 
                    color: dayData.isToday ? '#a3e635' : 
                           dayData.isWeekend ? '#ef4444' : '#ffffff'
                  }}
                >
                  {dayData.day}
                </span>

                {/* Lettera del giorno della settimana */}
                <span 
                  className="text-[9px] font-medium leading-tight"
                  style={{ 
                    color: dayData.isToday ? '#a3e635' : 
                           dayData.isWeekend ? '#ef4444' : '#94a3b8'
                  }}
                >
                  {DAYS_SHORT[dayData.dayOfWeek]}
                </span>

                {/* Pulsante/indicatore selezionabile - lime per oggi, colore mese per altri */}
                <div 
                  className={cn(
                    "w-5 h-5 mt-1 rounded-full flex items-center justify-center transition-all",
                    dayData.isSelected 
                      ? "scale-110" 
                      : "opacity-50 hover:opacity-80"
                  )}
                  style={{
                    backgroundColor: dayData.isToday ? '#a3e635' : monthData.color
                  }}
                >
                  {dayData.isSelected && (
                    <div className="w-2 h-2 rounded-full bg-slate-900" />
                  )}
                </div>

                {/* Trattino fisso sotto il puntino SOLO per oggi */}
                {dayData.isToday && (
                  <div className="w-4 h-[3px] mt-1 rounded-full bg-lime-400" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Nome mese corrente visibile */}
      <div className="bg-slate-900 border-t border-slate-700 py-2 text-center">
        <span className="font-bold text-sm" style={{ color: visibleMonth.color }}>
          {visibleMonth.name}
        </span>
        <span className="font-medium text-sm ml-2" style={{ color: visibleMonth.color }}>
          {visibleMonth.year}
        </span>
      </div>
    </div>
  );
}