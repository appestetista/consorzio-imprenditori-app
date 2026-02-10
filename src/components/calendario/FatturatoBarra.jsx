import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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

  const currentDate = selectedDate ? new Date(selectedDate) : new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
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
  const totaleMesePrecedente = fatturatiMesePrecedente.reduce((sum, f) => sum + (f.importo || 0), 0);
  const totaleAnnoScorso = fatturatiAnnoScorso.reduce((sum, f) => sum + (f.importo || 0), 0);
  const obiettivo = fatturatiMese.find(f => f.obiettivo_mese)?.obiettivo_mese || 0;
  const progressoObiettivo = obiettivo > 0 ? Math.min((totaleMese / obiettivo) * 100, 100) : 0;

  // Variazioni percentuali
  const varMesePrecedente = totaleMesePrecedente > 0 ? ((totaleMese - totaleMesePrecedente) / totaleMesePrecedente) * 100 : 0;
  const varAnnoScorso = totaleAnnoScorso > 0 ? ((totaleMese - totaleAnnoScorso) / totaleAnnoScorso) * 100 : 0;

  // Genera giorni del mese
  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const fatturato = fatturatiMese.find(f => f.data === dateStr);
    days.push({
      day: d,
      date: dateStr,
      importo: fatturato?.importo || 0,
      hasData: !!fatturato?.importo
    });
  }

  const handleDayClick = (day) => {
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

  return (
    <div className="bg-slate-900 border-t border-slate-700">
      {/* Barra giorni fatturato */}
      <div 
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {days.map((day) => {
          const isSelected = selectedDate && new Date(selectedDate).getDate() === day.day;
          const barHeight = obiettivo > 0 ? Math.min((day.importo / obiettivo) * 100, 100) : (day.importo > 0 ? 50 : 0);
          
          return (
            <div
              key={day.day}
              data-fatturato-day={day.day}
              onClick={() => handleDayClick(day)}
              className={cn(
                "flex flex-col items-center cursor-pointer transition-all min-w-[20px] px-0.5 py-1",
                isSelected && "bg-slate-800"
              )}
            >
              {/* Mini barra fatturato */}
              <div className="h-6 w-3 bg-slate-700 rounded-sm overflow-hidden flex flex-col justify-end">
                {day.importo > 0 && (
                  <div 
                    className="w-full rounded-sm transition-all"
                    style={{ 
                      height: `${barHeight}%`,
                      backgroundColor: monthColor
                    }}
                  />
                )}
              </div>
              {/* Numero giorno */}
              <span 
                className={cn(
                  "text-[8px] mt-0.5",
                  day.hasData ? "font-bold" : "font-normal",
                  isSelected ? "text-white" : "text-slate-500"
                )}
                style={{ color: day.hasData ? monthColor : undefined }}
              >
                {day.day}
              </span>
            </div>
          );
        })}
      </div>

      {/* Input editing overlay */}
      {editingDay && (
        <div className="absolute left-0 right-0 bg-slate-800 border-t border-slate-600 p-2 flex items-center gap-2 z-20">
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

      {/* Riga info: obiettivo + totale + comparazioni */}
      <div className="flex items-center justify-between px-2 py-1 border-t border-slate-800">
        {/* Obiettivo */}
        <div 
          className="flex items-center gap-1 cursor-pointer"
          onClick={() => setShowObjectiveInput(true)}
        >
          <Target className="w-3 h-3 text-slate-500" />
          {obiettivo > 0 ? (
            <span className="text-[9px] text-slate-400">
              {formatCurrency(totaleMese)}/{formatCurrency(obiettivo)}€
            </span>
          ) : (
            <span className="text-[9px] text-slate-500">+obiettivo</span>
          )}
        </div>

        {/* Barra progresso obiettivo mini */}
        {obiettivo > 0 && (
          <div className="flex-1 mx-2 h-1.5 bg-slate-700 rounded-full overflow-hidden max-w-[80px]">
            <div 
              className="h-full rounded-full transition-all"
              style={{ width: `${progressoObiettivo}%`, backgroundColor: monthColor }}
            />
          </div>
        )}

        {/* Comparazioni */}
        <div className="flex items-center gap-2">
          {/* vs mese precedente */}
          {totaleMesePrecedente > 0 && (
            <div className="flex items-center gap-0.5">
              {varMesePrecedente > 0 ? (
                <TrendingUp className="w-3 h-3 text-green-400" />
              ) : varMesePrecedente < 0 ? (
                <TrendingDown className="w-3 h-3 text-red-400" />
              ) : (
                <Minus className="w-3 h-3 text-slate-400" />
              )}
              <span className={cn(
                "text-[9px] font-semibold",
                varMesePrecedente > 0 ? "text-green-400" : varMesePrecedente < 0 ? "text-red-400" : "text-slate-400"
              )}>
                {varMesePrecedente > 0 ? '+' : ''}{varMesePrecedente.toFixed(0)}%
              </span>
            </div>
          )}

          {/* vs anno scorso */}
          {totaleAnnoScorso > 0 && (
            <div className="flex items-center gap-0.5 border-l border-slate-700 pl-2">
              <span className="text-[8px] text-slate-500">YoY</span>
              <span className={cn(
                "text-[9px] font-semibold",
                varAnnoScorso > 0 ? "text-green-400" : varAnnoScorso < 0 ? "text-red-400" : "text-slate-400"
              )}>
                {varAnnoScorso > 0 ? '+' : ''}{varAnnoScorso.toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Input obiettivo overlay */}
      {showObjectiveInput && (
        <div className="absolute left-0 right-0 bg-slate-800 border-t border-slate-600 p-2 flex items-center gap-2 z-20">
          <Target className="w-4 h-4 text-slate-400" />
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
            className="px-2 py-1 text-xs font-semibold rounded"
            style={{ backgroundColor: monthColor, color: '#0f172a' }}
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