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

  // Genera path SVG per il grafico a linea (fatturato cumulativo) - solo fino a oggi
  const generateLinePath = () => {
    const width = daysInMonth * 24;
    const height = 20;
    const padding = 3;
    
    let path = '';
    let hasStarted = false;
    
    // Solo fino al giorno di oggi
    const lastDay = todayDay || 0;
    
    for (let i = 0; i < lastDay; i++) {
      const day = days[i];
      if (day.cumulative === 0 && !hasStarted) continue;
      hasStarted = true;
      
      const x = (i / (daysInMonth - 1)) * (width - padding * 2) + padding;
      const y = height - padding - ((day.cumulative / maxValue) * (height - padding * 2));
      
      if (path === '') {
        path += `M ${padding} ${height - padding} L ${x} ${y}`;
      } else {
        path += ` L ${x} ${y}`;
      }
    }
    
    return path || '';
  };

  return (
    <div className="bg-slate-900">
      {/* Grafico + puntini giorni */}
      <div 
        ref={scrollRef}
        className="overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div style={{ width: `${daysInMonth * 24}px`, minWidth: '100%' }}>
          {/* SVG Grafico a linea - solo fino a oggi, colore del mese, linea continua */}
          <svg 
            width={daysInMonth * 24} 
            height={20} 
            className="block"
          >
            {/* Linea fatturato cumulativo - solo fino a oggi */}
            <path
              d={generateLinePath()}
              stroke={monthColor}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Punto oggi che pulsa */}
            {todayDay && days[todayDay - 1] && days[todayDay - 1].cumulative !== null && (
              <>
                <circle
                  cx={(todayDay - 1) / (daysInMonth - 1) * (daysInMonth * 24 - 6) + 3}
                  cy={20 - 3 - ((days[todayDay - 1].cumulative / maxValue) * 14)}
                  r="4"
                  fill="#a3e635"
                  opacity="0.3"
                  className="animate-ping"
                />
                <circle
                  cx={(todayDay - 1) / (daysInMonth - 1) * (daysInMonth * 24 - 6) + 3}
                  cy={20 - 3 - ((days[todayDay - 1].cumulative / maxValue) * 14)}
                  r="3"
                  fill="#a3e635"
                  stroke="#0f172a"
                  strokeWidth="1"
                />
              </>
            )}
          </svg>

          {/* Puntini giorni */}
          <div className="flex">
            {days.map((day) => {
              const isSelected = selectedDate && new Date(selectedDate).getDate() === day.day;
              const isEditing = editingDay === day.date;
              
              return (
                <div
                  key={day.day}
                  data-fatturato-day={day.day}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "flex flex-col items-center min-w-[24px] py-0.5 rounded transition-all",
                    !day.isFuture && "cursor-pointer",
                    day.isFuture && "opacity-40 cursor-not-allowed",
                    isSelected && !day.isFuture && "bg-slate-800",
                    isEditing && "bg-slate-700"
                  )}
                >
                  {/* Puntino */}
                  <div 
                    className={cn(
                      "w-3.5 h-3.5 rounded-full transition-all flex items-center justify-center",
                      day.isToday && "animate-pulse ring-2 ring-lime-400/50",
                      isSelected && !day.isToday && !day.isFuture && "ring-2 ring-white"
                    )}
                    style={{ 
                      backgroundColor: day.isToday ? '#a3e635' : (day.hasData ? monthColor : '#334155'),
                      boxShadow: day.isToday ? '0 0 8px #a3e635' : (day.hasData ? `0 0 4px ${monthColor}50` : 'none')
                    }}
                  >
                    {day.isToday ? (
                      <div className="w-1 h-1 rounded-full bg-slate-900" />
                    ) : day.hasData ? (
                      <div className="w-1 h-1 rounded-full bg-white/80" />
                    ) : null}
                  </div>
                  {/* Numero giorno */}
                  <span 
                    className={cn(
                      "text-[7px] leading-tight mt-0.5",
                      day.hasData ? "font-bold" : "font-normal",
                      day.isToday ? "text-lime-400 font-bold" : (day.isFuture ? "text-slate-600" : (isSelected ? "text-white" : "text-slate-500"))
                    )}
                    style={{ color: day.hasData && !day.isToday ? monthColor : undefined }}
                  >
                    {day.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Input editing overlay */}
      {editingDay && (
        <div className="absolute left-0 right-0 bottom-0 bg-slate-800 border-t border-slate-600 p-2 flex items-center gap-2 z-20">
          <span className="text-slate-400 text-xs">€</span>
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Fatturato"
            className="flex-1 bg-slate-700 text-white text-sm px-2 py-1 rounded border-none outline-none"
            autoFocus
          />
          <button 
            onClick={handleSave}
            className="px-2 py-1 text-xs font-semibold rounded"
            style={{ backgroundColor: monthColor, color: '#0f172a' }}
          >
            Salva
          </button>
          <button 
            onClick={() => setEditingDay(null)}
            className="px-2 py-1 bg-slate-600 text-white text-xs rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* Riga info: fatturato a sinistra + fatturato giorno | obiettivo a destra */}
      <div className="flex items-center justify-between px-2 py-1">
        {/* Fatturato mese + giorno */}
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-400">Mese: <span className="font-bold" style={{ color: monthColor }}>€{formatCurrency(totaleMese)}</span></span>
          {selectedDate && (
            <span className="text-[8px] text-slate-500">
              Oggi: €{formatCurrency(fatturatoGiornoSelezionato)}
            </span>
          )}
        </div>

        {/* Obiettivo a destra - cliccabile */}
        <div 
          className="flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded hover:bg-slate-800 transition-colors"
          onClick={() => setShowObjectiveInput(true)}
        >
          <Target className="w-3 h-3 text-lime-400" />
          {obiettivo > 0 ? (
            <span className="text-[10px] font-bold text-lime-400">
              €{formatCurrency(obiettivo)}
            </span>
          ) : (
            <span className="text-[9px] text-slate-400">+ obiettivo</span>
          )}
        </div>
      </div>

      {/* Input obiettivo overlay */}
      {showObjectiveInput && (
        <div className="absolute left-0 right-0 bottom-0 bg-slate-800 border-t border-slate-600 p-2 flex items-center gap-2 z-20">
          <Target className="w-4 h-4 text-lime-400" />
          <input
            type="number"
            value={objectiveValue}
            onChange={(e) => setObjectiveValue(e.target.value)}
            placeholder="Obiettivo mese €"
            className="flex-1 bg-slate-700 text-white text-sm px-2 py-1 rounded border-none outline-none"
            autoFocus
          />
          <button 
            onClick={handleObjectiveSave}
            className="px-2 py-1 text-xs font-semibold rounded bg-lime-400 text-slate-900"
          >
            Salva
          </button>
          <button 
            onClick={() => setShowObjectiveInput(false)}
            className="px-2 py-1 bg-slate-600 text-white text-xs rounded"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}