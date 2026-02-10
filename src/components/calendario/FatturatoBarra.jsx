import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Target, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const MONTH_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#22c55e', '#eab308',
  '#f97316', '#ef4444', '#06b6d4', '#a855f7', '#6366f1', '#0ea5e9'
];

export default function FatturatoBarra({ selectedDate, userEmail, onScrollSync, scrollRef: externalScrollRef, visibleMonth, visibleYear, monthColor: externalMonthColor, onDateSelect }) {
  const [editingDay, setEditingDay] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [showObjectiveInput, setShowObjectiveInput] = useState(false);
  const [objectiveValue, setObjectiveValue] = useState('');
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  const today = new Date();
  // Usa visibleMonth/Year se disponibili, altrimenti selectedDate
  const currentMonth = visibleMonth !== undefined ? visibleMonth : (selectedDate ? new Date(selectedDate).getMonth() : today.getMonth());
  const currentYear = visibleYear !== undefined ? visibleYear : (selectedDate ? new Date(selectedDate).getFullYear() : today.getFullYear());
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  // Giorno di oggi nel mese visualizzato (null se mese diverso)
  const todayDay = today.getMonth() === currentMonth && today.getFullYear() === currentYear ? today.getDate() : null;
  // Usa il colore passato dal parent (sincronizzato col calendario) oppure quello del mese corrente
  const monthColor = externalMonthColor || MONTH_COLORS[currentMonth];

  // Fetch fatturati di tutto l'anno
  const displayYear = selectedDate ? new Date(selectedDate).getFullYear() : currentYear;
  const { data: fatturatiAnno = [] } = useQuery({
    queryKey: ['fatturato', userEmail, displayYear],
    queryFn: async () => {
      const startDate = `${displayYear}-01-01`;
      const endDate = `${displayYear}-12-31`;
      const all = await base44.entities.FatturatoGiornaliero.filter({ user_email: userEmail });
      return all.filter(f => f.data >= startDate && f.data <= endDate);
    },
    enabled: !!userEmail
  });

  // Mutation per salvare fatturato
  const saveMutation = useMutation({
    mutationFn: async ({ data, importo }) => {
      const existing = fatturatiAnno.find(f => f.data === data);
      if (existing) {
        return base44.entities.FatturatoGiornaliero.update(existing.id, { importo });
      } else {
        return base44.entities.FatturatoGiornaliero.create({ user_email: userEmail, data, importo });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fatturato'] });
      setEditingDay(null);
      setInputValue('');
    }
  });

  // Mutation per salvare obiettivo
  const saveObjectiveMutation = useMutation({
    mutationFn: async (obiettivo) => {
      const firstDayData = `${displayYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const existing = fatturatiAnno.find(f => f.data === firstDayData);
      if (existing) {
        return base44.entities.FatturatoGiornaliero.update(existing.id, { obiettivo_mese: obiettivo });
      } else {
        return base44.entities.FatturatoGiornaliero.create({ 
          user_email: userEmail, 
          data: firstDayData, 
          importo: 0,
          obiettivo_mese: obiettivo 
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fatturato'] });
      setShowObjectiveInput(false);
      setObjectiveValue('');
    }
  });

  // Calcoli per il mese del giorno SELEZIONATO (non visibile)
  const selectedMonthForCalc = selectedDate ? new Date(selectedDate).getMonth() : currentMonth;
  const fatturatiMeseSelezionato = fatturatiAnno.filter(f => {
    const d = new Date(f.data);
    return d.getMonth() === selectedMonthForCalc;
  });
  const totaleMese = fatturatiMeseSelezionato.reduce((sum, f) => sum + (f.importo || 0), 0);
  const obiettivo = fatturatiMeseSelezionato.find(f => f.obiettivo_mese)?.obiettivo_mese || 0;

  // Fatturato del giorno selezionato
  const selectedDayStr = selectedDate 
    ? `${new Date(selectedDate).getFullYear()}-${String(new Date(selectedDate).getMonth() + 1).padStart(2, '0')}-${String(new Date(selectedDate).getDate()).padStart(2, '0')}`
    : null;
  const fatturatoGiornoSelezionato = selectedDayStr 
    ? fatturatiAnno.find(f => f.data === selectedDayStr)?.importo || 0 
    : 0;

  // Resetta inputValue quando cambia il giorno selezionato
  useEffect(() => {
    setInputValue('');
    setEditingDay(null);
  }, [selectedDayStr]);

  // Genera tutti i mesi dell'anno con i loro giorni (come il calendario sopra)
  const generateYearData = () => {
    const months = [];
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(displayYear, month + 1, 0).getDate();
      const monthDays = [];
      const todayInMonth = today.getMonth() === month && today.getFullYear() === displayYear ? today.getDate() : null;
      
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${displayYear}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const fatturato = fatturatiAnno.find(f => f.data === dateStr);
        const importo = fatturato?.importo || 0;
        const isPastOrToday = todayInMonth ? d <= todayInMonth : (month < today.getMonth() || displayYear < today.getFullYear());
        
        monthDays.push({
          day: d,
          month,
          date: dateStr,
          importo,
          hasData: !!fatturato?.importo && isPastOrToday,
          isToday: d === todayInMonth,
          isPast: todayInMonth ? d < todayInMonth : (month < today.getMonth() || displayYear < today.getFullYear()),
          isFuture: todayInMonth ? d > todayInMonth : (month > today.getMonth() && displayYear >= today.getFullYear())
        });
      }
      
      months.push({
        month,
        year: displayYear,
        color: MONTH_COLORS[month],
        days: monthDays
      });
    }
    return months;
  };

  const yearData = generateYearData();

  // Calcola il massimo incasso giornaliero di tutto l'anno per le barre
  const allDays = yearData.flatMap(m => m.days);
  const maxDailyAmount = Math.max(...allDays.filter(d => !d.isFuture).map(d => d.importo), 1);

  const handleDayClick = (day) => {
    if (day.isFuture) return;
    // Aggiorna la data selezionata nel parent
    if (onDateSelect) {
      const newDate = new Date(displayYear, day.month, day.day);
      onDateSelect(newDate);
    }
    setEditingDay(day.date);
    setInputValue('');
  };

  const handleSave = () => {
    if (editingDay && inputValue !== '') {
      saveMutation.mutate({ data: editingDay, importo: parseFloat(inputValue) || 0 });
    }
  };

  const handleObjectiveSave = () => {
    if (objectiveValue) {
      saveObjectiveMutation.mutate(parseFloat(objectiveValue));
    }
  };

  // Esponi il ref dello scroll al parent per sincronizzazione
  useEffect(() => {
    if (externalScrollRef) {
      externalScrollRef.current = scrollRef.current;
    }
  }, [externalScrollRef]);

  // Gestisci scroll e notifica il parent
  const handleScroll = () => {
    if (onScrollSync && scrollRef.current) {
      onScrollSync(scrollRef.current.scrollLeft);
    }
  };

  const formatCurrency = (val) => {
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return val.toFixed(0);
  };

  // Verifica se il giorno selezionato è futuro
  const selectedDayNum = selectedDate ? new Date(selectedDate).getDate() : null;
  const selectedMonthNum = selectedDate ? new Date(selectedDate).getMonth() : null;
  const isSelectedDayFuture = selectedDate ? (
    selectedMonthNum > today.getMonth() || 
    (selectedMonthNum === today.getMonth() && selectedDayNum > today.getDate())
  ) : false;

  return (
    <div className="bg-slate-900">
      {/* Barre + Puntini giorni - tutto l'anno */}
      <div 
        ref={scrollRef}
        className="overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onScroll={handleScroll}
      >
        <div className="flex items-end px-1">
          {yearData.map((monthData) => (
            <div key={monthData.month} className="flex items-end">
              {monthData.days.map((day) => {
                const isSelected = selectedDate && 
                  new Date(selectedDate).getDate() === day.day && 
                  new Date(selectedDate).getMonth() === day.month;
                const isPastOrToday = !day.isFuture;
                const isClickedDay = editingDay === day.date || isSelected;
                
                // Calcola altezza barra proporzionale alla quota giornaliera per raggiungere il target
                                  // quota_giornaliera = target_mensile / giorni_mese
                                  // Se non c'è obiettivo, usa il max giornaliero come riferimento
                                  const daysInThisMonth = new Date(displayYear, day.month + 1, 0).getDate();
                                  const monthObjective = fatturatiAnno.find(f => {
                                    const d = new Date(f.data);
                                    return d.getMonth() === day.month && f.obiettivo_mese;
                                  })?.obiettivo_mese || 0;

                                  const dailyQuota = monthObjective > 0 ? monthObjective / daysInThisMonth : maxDailyAmount;
                                  const barRatio = dailyQuota > 0 ? Math.min(day.importo / dailyQuota, 1) : 0;
                                  const barHeight = day.importo > 0 ? Math.max(4, barRatio * 40) : 0;
                
                return (
                  <div
                    key={day.date}
                    data-fatturato-day={`${day.month}-${day.day}`}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "flex flex-col items-center transition-all",
                      isPastOrToday && "cursor-pointer hover:bg-slate-700/50 rounded",
                      day.isFuture && "cursor-not-allowed"
                    )}
                    style={{ minWidth: '22px' }}
                  >
                    {/* Barra verticale proporzionale all'incasso */}
                    <div 
                      className="w-2 rounded-t transition-all mb-1"
                      style={{ 
                        height: `${barHeight}px`,
                        minHeight: isPastOrToday && day.importo > 0 ? '4px' : '0px',
                        backgroundColor: day.isToday ? '#a3e635' : (isPastOrToday ? monthData.color : '#334155')
                      }}
                    />
                    
                    {/* Puntino - stessa dimensione del calendario sopra (w-4 h-4) */}
                    <div 
                      className={cn(
                        "w-4 h-4 rounded-full transition-all flex items-center justify-center",
                        day.isToday && "ring-2 ring-lime-400/50",
                        isClickedDay && "ring-2 ring-white shadow-lg scale-110"
                      )}
                      style={{ 
                        backgroundColor: isPastOrToday ? '#94a3b8' : '#334155',
                        border: `2px solid ${day.isToday ? '#a3e635' : monthData.color}`
                      }}
                    >
                      {/* Puntino nero interno solo se ha dati */}
                      {isPastOrToday && day.hasData && (
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                      )}
                    </div>
                    {/* Numero giorno */}
                    <span 
                      className={cn(
                        "text-[10px] leading-tight mt-0.5 font-bold transition-all",
                        day.isToday ? "text-lime-400" : (isPastOrToday ? "text-slate-300" : "text-slate-600"),
                        isClickedDay && "text-white"
                      )}
                    >
                      {day.day}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Input inline: incasso giorno + mese + obiettivo */}
      <div className="flex items-stretch gap-1 px-2">
        {/* Incasso giorno - input diretto */}
        <div 
          className={cn(
            "flex-1 flex flex-col bg-slate-800 rounded px-2 py-1",
            isSelectedDayFuture && "opacity-40"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-white uppercase">
              Vendite / € giorno{selectedDayNum ? ` ${selectedDayNum}` : ''}
            </span>
            {/* X per azzerare */}
            {(inputValue !== '' || fatturatoGiornoSelezionato > 0) && selectedDayNum && !isSelectedDayFuture && (
              <button
                onClick={() => {
                  setInputValue('0');
                  if (selectedDayStr) {
                    saveMutation.mutate({ data: selectedDayStr, importo: 0 });
                  }
                }}
                className="p-0.5 rounded hover:bg-slate-700"
              >
                <X className="w-3 h-3 text-slate-400" />
              </button>
            )}
          </div>
          {isSelectedDayFuture ? (
            <span className="text-[10px] text-red-400">Futuro</span>
          ) : (
            <input
              type="number"
              value={inputValue}
              onChange={(e) => {
                setEditingDay(selectedDayStr);
                setInputValue(e.target.value);
              }}
              onBlur={() => {
                if (editingDay && inputValue !== '') {
                  handleSave();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editingDay && inputValue !== '') {
                  handleSave();
                }
              }}
              placeholder={fatturatoGiornoSelezionato > 0 ? `€${fatturatoGiornoSelezionato}` : '€0'}
              className="bg-transparent text-lime-400 text-base font-bold w-full outline-none"
              disabled={isSelectedDayFuture}
            />
          )}
        </div>

        {/* Totale mese al centro */}
        <div className="flex flex-col items-center justify-center bg-slate-800 rounded px-3 py-1">
          <span className="text-[9px] text-white uppercase">Vendite / € mese</span>
          <span className="text-base font-bold" style={{ color: monthColor }}>
            €{formatCurrency(totaleMese)}
          </span>
        </div>

        {/* Obiettivo - input diretto */}
        <div 
          className="flex-1 flex flex-col items-end bg-slate-800 rounded px-2 py-1"
        >
          <span className="text-[9px] text-white uppercase flex items-center gap-0.5">
            <Target className="w-2.5 h-2.5" />
            Obiettivo mese
          </span>
          <input
            type="number"
            value={showObjectiveInput ? objectiveValue : (obiettivo > 0 ? obiettivo : '')}
            onChange={(e) => {
              setShowObjectiveInput(true);
              setObjectiveValue(e.target.value);
            }}
            onBlur={() => {
              if (showObjectiveInput && objectiveValue) {
                handleObjectiveSave();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && showObjectiveInput && objectiveValue) {
                handleObjectiveSave();
              }
            }}
            placeholder="€0"
            className="bg-transparent text-lime-400 text-base font-bold w-full text-right outline-none"
          />
        </div>
      </div>
    </div>
  );
}