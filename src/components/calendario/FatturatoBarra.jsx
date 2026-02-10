import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Target } from 'lucide-react';
import { cn } from '@/lib/utils';

const MONTH_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#22c55e', '#eab308',
  '#f97316', '#ef4444', '#06b6d4', '#a855f7', '#6366f1', '#0ea5e9'
];

export default function FatturatoBarra({ selectedDate, userEmail }) {
  const [editingDay, setEditingDay] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [showObjectiveInput, setShowObjectiveInput] = useState(false);
  const [objectiveValue, setObjectiveValue] = useState('');
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  const today = new Date();
  const currentDate = selectedDate ? new Date(selectedDate) : today;
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  // Giorno di oggi nel mese visualizzato (null se mese diverso)
  const todayDay = today.getMonth() === currentMonth && today.getFullYear() === currentYear ? today.getDate() : null;
  const monthColor = MONTH_COLORS[currentMonth];

  // Fetch fatturati del mese corrente
  const { data: fatturatiMese = [] } = useQuery({
    queryKey: ['fatturato', userEmail, currentYear, currentMonth],
    queryFn: async () => {
      const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${daysInMonth}`;
      const all = await base44.entities.FatturatoGiornaliero.filter({ user_email: userEmail });
      return all.filter(f => f.data >= startDate && f.data <= endDate);
    },
    enabled: !!userEmail
  });

  // Fetch fatturati mese precedente
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const { data: fatturatiMesePrecedente = [] } = useQuery({
    queryKey: ['fatturato', userEmail, prevYear, prevMonth],
    queryFn: async () => {
      const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
      const startDate = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`;
      const endDate = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${daysInPrevMonth}`;
      const all = await base44.entities.FatturatoGiornaliero.filter({ user_email: userEmail });
      return all.filter(f => f.data >= startDate && f.data <= endDate);
    },
    enabled: !!userEmail
  });

  // Fetch fatturati stesso mese anno scorso
  const { data: fatturatiAnnoScorso = [] } = useQuery({
    queryKey: ['fatturato', userEmail, currentYear - 1, currentMonth],
    queryFn: async () => {
      const lastYear = currentYear - 1;
      const daysInMonthLastYear = new Date(lastYear, currentMonth + 1, 0).getDate();
      const startDate = `${lastYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const endDate = `${lastYear}-${String(currentMonth + 1).padStart(2, '0')}-${daysInMonthLastYear}`;
      const all = await base44.entities.FatturatoGiornaliero.filter({ user_email: userEmail });
      return all.filter(f => f.data >= startDate && f.data <= endDate);
    },
    enabled: !!userEmail
  });

  // Mutation per salvare fatturato
  const saveMutation = useMutation({
    mutationFn: async ({ data, importo }) => {
      const existing = fatturatiMese.find(f => f.data === data);
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
      // Salva obiettivo su tutti i giorni del mese (o sul primo)
      const firstDayData = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const existing = fatturatiMese.find(f => f.data === firstDayData);
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

  // Calcoli
  const totaleMese = fatturatiMese.reduce((sum, f) => sum + (f.importo || 0), 0);
  const obiettivo = fatturatiMese.find(f => f.obiettivo_mese)?.obiettivo_mese || 0;

  // Fatturato del giorno selezionato
  const selectedDayStr = selectedDate 
    ? `${new Date(selectedDate).getFullYear()}-${String(new Date(selectedDate).getMonth() + 1).padStart(2, '0')}-${String(new Date(selectedDate).getDate()).padStart(2, '0')}`
    : null;
  const fatturatoGiornoSelezionato = selectedDayStr 
    ? fatturatiMese.find(f => f.data === selectedDayStr)?.importo || 0 
    : 0;

  // Genera giorni del mese con fatturato cumulativo (solo fino a oggi)
  const days = [];
  let cumulative = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const fatturato = fatturatiMese.find(f => f.data === dateStr);
    const importo = fatturato?.importo || 0;
    
    // Solo giorni passati o oggi contribuiscono al cumulativo
    const isPastOrToday = todayDay ? d <= todayDay : false;
    if (isPastOrToday) {
      cumulative += importo;
    }
    
    days.push({
      day: d,
      date: dateStr,
      importo,
      cumulative: isPastOrToday ? cumulative : null, // null per giorni futuri
      hasData: !!fatturato?.importo && isPastOrToday,
      isToday: d === todayDay,
      isPast: todayDay ? d < todayDay : false,
      isFuture: todayDay ? d > todayDay : true
    });
  }

  // Il massimo per il grafico è l'obiettivo o il cumulativo attuale
  const maxValue = obiettivo > 0 ? Math.max(obiettivo, cumulative) : Math.max(cumulative, 1);

  const handleDayClick = (day) => {
    // Solo giorni passati o oggi possono essere modificati
    if (day.isFuture) return;
    setEditingDay(day.date);
    setInputValue(day.importo > 0 ? String(day.importo) : '');
  };

  const handleSave = () => {
    if (editingDay && inputValue) {
      saveMutation.mutate({ data: editingDay, importo: parseFloat(inputValue) });
    }
  };

  const handleObjectiveSave = () => {
    if (objectiveValue) {
      saveObjectiveMutation.mutate(parseFloat(objectiveValue));
    }
  };

  // Scroll al giorno selezionato
  useEffect(() => {
    if (scrollRef.current && selectedDate) {
      const dayNum = new Date(selectedDate).getDate();
      const el = scrollRef.current.querySelector(`[data-fatturato-day="${dayNum}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [selectedDate]);

  const formatCurrency = (val) => {
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return val.toFixed(0);
  };

  // Calcola il massimo incasso giornaliero (non cumulativo) per le barre
  const maxDailyAmount = Math.max(...days.filter(d => !d.isFuture).map(d => d.importo), 1);

  // Verifica se il giorno selezionato è futuro
  const selectedDayNum = selectedDate ? new Date(selectedDate).getDate() : null;
  const isSelectedDayFuture = selectedDayNum && todayDay ? selectedDayNum > todayDay : false;

  return (
    <div className="bg-slate-900">
      {/* Puntini giorni */}
      <div 
        ref={scrollRef}
        className="overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex px-1" style={{ width: `${daysInMonth * 22}px`, minWidth: '100%' }}>
          {days.map((day) => {
            const isSelected = selectedDate && new Date(selectedDate).getDate() === day.day;
            const isPastOrToday = !day.isFuture;
            
            return (
              <div
                key={day.day}
                data-fatturato-day={day.day}
                onClick={() => handleDayClick(day)}
                className={cn(
                  "flex flex-col items-center min-w-[22px] py-1",
                  isPastOrToday && "cursor-pointer",
                  day.isFuture && "cursor-not-allowed opacity-40"
                )}
              >
                {/* Puntino grande - giallo fluo per passati/oggi, grigio per futuri */}
                <div 
                  className={cn(
                    "w-4 h-4 rounded-full transition-all flex items-center justify-center",
                    day.isToday && "ring-2 ring-lime-400/50",
                    isSelected && "ring-2 ring-white"
                  )}
                  style={{ 
                    backgroundColor: isPastOrToday ? '#a3e635' : '#334155'
                  }}
                >
                  {/* Puntino nero interno solo se ha dati */}
                  {isPastOrToday && day.hasData && (
                    <div className="w-2 h-2 rounded-full bg-slate-900" />
                  )}
                </div>
                {/* Numero giorno */}
                <span 
                  className={cn(
                    "text-[8px] leading-tight mt-0.5 font-semibold",
                    day.isToday ? "text-lime-400" : (isPastOrToday ? "text-slate-400" : "text-slate-600")
                  )}
                >
                  {day.day}
                </span>
              </div>
            );
          })}
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
          <span className="text-[7px] text-slate-500 uppercase">Incasso {selectedDayNum || '-'}</span>
          {isSelectedDayFuture ? (
            <span className="text-[9px] text-red-400">Futuro</span>
          ) : (
            <input
              type="number"
              value={editingDay === selectedDayStr ? inputValue : (fatturatoGiornoSelezionato > 0 ? fatturatoGiornoSelezionato : '')}
              onChange={(e) => {
                setEditingDay(selectedDayStr);
                setInputValue(e.target.value);
              }}
              onBlur={() => {
                if (editingDay && inputValue) {
                  handleSave();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editingDay && inputValue) {
                  handleSave();
                }
              }}
              placeholder="€0"
              className="bg-transparent text-lime-400 text-sm font-bold w-full outline-none"
              disabled={isSelectedDayFuture}
            />
          )}
        </div>

        {/* Totale mese al centro */}
        <div className="flex flex-col items-center justify-center bg-slate-800 rounded px-3 py-1">
          <span className="text-[7px] text-slate-500 uppercase">Mese</span>
          <span className="text-sm font-bold" style={{ color: monthColor }}>
            €{formatCurrency(totaleMese)}
          </span>
        </div>

        {/* Obiettivo - input diretto */}
        <div 
          className="flex-1 flex flex-col items-end bg-slate-800 rounded px-2 py-1"
        >
          <span className="text-[7px] text-slate-500 uppercase flex items-center gap-0.5">
            <Target className="w-2 h-2" />
            Obiettivo
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
            className="bg-transparent text-lime-400 text-sm font-bold w-full text-right outline-none"
          />
        </div>
      </div>
    </div>
  );
}