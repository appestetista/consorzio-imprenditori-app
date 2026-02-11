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

const MONTHS_SHORT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

export default function HorizontalDatePicker({ selectedDate, onDateSelect, onGoToToday, onMonthColorChange, onVisibleMonthChange, onVisibleDayChange, onScrollSync, scrollRef: externalScrollRef }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const scrollRef = useRef(null);
  const todayRef = useRef(null);
  const [visibleMonth, setVisibleMonth] = useState({ name: MONTHS[today.getMonth()], year: today.getFullYear(), color: MONTH_COLORS[today.getMonth()] });
  const monthRefs = useRef({});
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(null); // Mese selezionato dalla barra in basso

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

  // Genera tutti i mesi dell'anno corrente (1 gen - 31 dic)
  const generateMonthsData = () => {
    const months = [];
    const displayYear = selectedDate ? new Date(selectedDate).getFullYear() : currentYear;
    
    for (let month = 0; month < 12; month++) {
      const daysInMonth = getDaysInMonth(month, displayYear);
      months.push({
        month,
        year: displayYear,
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

  // Esponi il ref dello scroll al parent per sincronizzazione
  useEffect(() => {
    if (externalScrollRef) {
      externalScrollRef.current = scrollRef.current;
    }
  }, [externalScrollRef]);

  // Observer per rilevare il mese visibile durante lo scroll - più reattivo
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      // Notifica il parent dello scroll per sincronizzazione
      if (onScrollSync) {
        onScrollSync(scrollContainer.scrollLeft);
      }
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

        // Estrai anche il giorno
        const dayMatch = closestElement.dataset.date?.split('-')[2];
        const dayNum = dayMatch ? parseInt(dayMatch) : 1;

        // Aggiorna solo se cambiato
        setVisibleMonth(prev => {
          if (prev.name !== MONTHS[monthIdx] || prev.year !== yearInt) {
            return { name: MONTHS[monthIdx], year: yearInt, color: MONTH_COLORS[monthIdx] };
          }
          return prev;
        });

        // Aggiorna anche la selezione del mese nella barra in basso (sincronizzazione)
        setSelectedMonthIdx(monthIdx);

        // Notifica il giorno visibile al parent per la barra laterale
        if (onVisibleDayChange) {
          onVisibleDayChange(dayNum, monthIdx, yearInt);
        }
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  // Aggiorna l'etichetta e la barra mesi quando selectedDate cambia (es. dal VerticalTimePicker)
  useEffect(() => {
    if (selectedDate) {
      const d = new Date(selectedDate);
      const newMonth = d.getMonth();
      const newYear = d.getFullYear();
      setVisibleMonth(prev => {
        if (prev.name !== MONTHS[newMonth] || prev.year !== newYear) {
          return { name: MONTHS[newMonth], year: newYear, color: MONTH_COLORS[newMonth] };
        }
        return prev;
      });
      // Sincronizza anche la barra mesi in basso
      setSelectedMonthIdx(newMonth);
    }
  }, [selectedDate]);

  // Notifica il colore e il mese al parent quando cambia visibleMonth (fuori dal rendering)
  useEffect(() => {
    if (onMonthColorChange) {
      onMonthColorChange(visibleMonth.color);
    }
    if (onVisibleMonthChange) {
      const monthIdx = MONTHS.indexOf(visibleMonth.name);
      onVisibleMonthChange(monthIdx, visibleMonth.year);
    }
  }, [visibleMonth, onMonthColorChange, onVisibleMonthChange]);

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setTimeout(() => {
      todayRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, 100);
    if (onGoToToday) onGoToToday();
  };

  const scrollToDate = (date) => {
    if (!scrollRef.current || !date) return;
    const d = new Date(date);
    const dateStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const dayElement = scrollRef.current.querySelector(`[data-date="${dateStr}"]`);
    if (dayElement) {
      dayElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  const scrollToMonth = (monthIdx) => {
    if (!scrollRef.current) return;
    // Usa l'anno della data selezionata o l'anno corrente
    const targetYear = selectedDate ? new Date(selectedDate).getFullYear() : currentYear;
    const monthElement = scrollRef.current.querySelector(`[data-month="${targetYear}-${monthIdx}"]`);
    if (monthElement) {
      monthElement.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    }
  };

  // Esponi la funzione goToToday e scrollToDate
  React.useEffect(() => {
    if (onGoToToday) {
      onGoToToday.current = goToToday;
      onGoToToday.scrollToDate = scrollToDate;
      onGoToToday.scrollToMonth = scrollToMonth;
    }
  }, [selectedDate, currentYear]);

  const handleDayClick = (dayData, monthData) => {
    if (onDateSelect) {
      onDateSelect(dayData.date);
    }
    // Aggiorna immediatamente l'etichetta del mese quando si clicca su un giorno
    const newMonth = dayData.date.getMonth();
    const newYear = dayData.date.getFullYear();
    setVisibleMonth({ 
      name: MONTHS[newMonth], 
      year: newYear, 
      color: MONTH_COLORS[newMonth] 
    });
    // Aggiorna anche la selezione del mese nella barra in basso
    setSelectedMonthIdx(newMonth);

    // Notifica il giorno visibile per sincronizzazione con fatturato
    if (onVisibleDayChange) {
      onVisibleDayChange(dayData.day, newMonth, newYear);
    }
  };

  // Calcola percentuale anno trascorso
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear() + 1, 0, 1);
  const yearProgress = ((now - startOfYear) / (endOfYear - startOfYear)) * 100;
  const yearRemaining = 100 - yearProgress;
  const currentMonthIdx = now.getMonth();

  return (
    <div className="bg-slate-900 overflow-hidden flex flex-col">
      {/* Calendario orizzontale scrollabile continuo - in alto */}
      <div 
        ref={scrollRef}
        className="flex overflow-x-auto px-1 pt-1 scrollbar-hide items-end flex-1"
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
                data-date={`${monthData.year}-${monthData.month}-${dayData.day}`}
                onClick={() => handleDayClick(dayData, monthData)}
                className={cn(
                  "flex flex-col items-center justify-end cursor-pointer transition-all",
                  "border-r border-slate-700/30",
                  "px-0.5 pb-0.5"
                )}
                style={{ minWidth: '22px' }}
              >
                {/* Linea verticale - colore mese per oggi e selezionato, bianco per altri */}
                <div 
                  className={cn(
                    "w-[2px] mb-0.5 rounded-full transition-all",
                    dayData.isToday && "animate-pulse"
                  )}
                  style={{ 
                    height: dayData.isWeekend ? '32px' : '18px',
                    backgroundColor: (dayData.isToday || dayData.isSelected) ? monthData.color : '#ffffff'
                  }}
                />

                {/* Numero del giorno */}
                <span 
                  className={cn(
                    "text-[10px] font-bold leading-tight",
                    dayData.isToday && "animate-pulse"
                  )}
                  style={{ 
                    color: (dayData.isToday || dayData.isSelected) ? monthData.color : '#ffffff'
                  }}
                >
                  {dayData.day}
                </span>

                {/* Lettera del giorno della settimana */}
                <span 
                  className={cn(
                    "text-[8px] font-medium leading-tight",
                    dayData.isToday && "animate-pulse"
                  )}
                  style={{ 
                    color: dayData.isWeekend ? '#ef4444' :
                      (dayData.isToday || dayData.isSelected) ? monthData.color : '#94a3b8'
                  }}
                >
                  {DAYS_SHORT[dayData.dayOfWeek]}
                </span>

                {/* Pulsante/indicatore - SOLO per oggi (pulsante) o selezionato (colore mese) */}
                {(dayData.isToday || dayData.isSelected) && (
                  <div 
                    className={cn(
                      "w-4 h-4 mt-0.5 rounded-full flex items-center justify-center transition-all",
                      dayData.isToday && "animate-pulse"
                    )}
                    style={{
                      backgroundColor: monthData.color
                    }}
                  >
                    {dayData.isSelected && (
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Barra mesi dell'anno con progress - in basso */}
      <div className="px-2 py-1 pb-2">
        {/* Etichette mesi sopra la barra */}
        <div className="flex items-center mb-1">
          {MONTHS_SHORT.map((m, idx) => {
            // Determina il colore:
            // - passato = grigio scuro
            // - mese attuale = lime
            // - futuro = bianco
            // - selezionato (cliccato) = colore del mese
            const isPast = idx < currentMonthIdx;
            const isCurrent = idx === currentMonthIdx;
            const isSelected = selectedMonthIdx === idx;
            
            let color;
            if (isSelected) {
              color = MONTH_COLORS[idx]; // Colore del mese quando cliccato
            } else if (isCurrent) {
              color = '#a3e635'; // Lime per mese attuale
            } else if (isPast) {
              color = '#334155'; // Grigio scuro per passati
            } else {
              color = '#ffffff'; // Bianco per futuri
            }
            
            return (
              <button
                key={idx}
                onClick={() => {
                  setSelectedMonthIdx(idx);
                  scrollToMonth(idx);
                }}
                className="flex-1 text-[10px] font-semibold text-center hover:opacity-70 transition-all"
                style={{ color }}
              >
                {m}
              </button>
            );
          })}
        </div>
        
        {/* Barra di riempimento sottile */}
        <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-lime-500 to-lime-400 transition-all"
            style={{ width: `${yearProgress}%` }}
          />
        </div>
        
        {/* Percentuali */}
        <div className="flex justify-between items-center mt-0.5">
          <span className="text-[10px] text-lime-400 font-bold">
            {yearProgress.toFixed(2).replace('.', ',')}% anno trascorso
          </span>
          <span className="text-[10px] text-slate-300 font-bold">
            {yearRemaining.toFixed(2).replace('.', ',')}% anno che rimane
          </span>
        </div>
        </div>
    </div>
  );
}