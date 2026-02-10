import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Target, TrendingUp, TrendingDown } from 'lucide-react';
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
  const totaleMesePrecedente = fatturatiMesePrecedente.reduce((sum, f) => sum + (f.importo || 0), 0);
  const totaleAnnoScorso = fatturatiAnnoScorso.reduce((sum, f) => sum + (f.importo || 0), 0);
  const obiettivo = fatturatiMese.find(f => f.obiettivo_mese)?.obiettivo_mese || 0;
  const progressoObiettivo = obiettivo > 0 ? Math.min((totaleMese / obiettivo) * 100, 100) : 0;

  // Variazioni percentuali
  const varMesePrecedente = totaleMesePrecedente > 0 ? ((totaleMese - totaleMesePrecedente) / totaleMesePrecedente) * 100 : 0;
  const varAnnoScorso = totaleAnnoScorso > 0 ? ((totaleMese - totaleAnnoScorso) / totaleAnnoScorso) * 100 : 0;

  // Genera giorni del mese con fatturato cumulativo
  const days = [];
  let cumulative = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const fatturato = fatturatiMese.find(f => f.data === dateStr);
    const importo = fatturato?.importo || 0;
    cumulative += importo;
    // Obiettivo giornaliero proporzionale
    const obiettivoGiornaliero = obiettivo > 0 ? (obiettivo / daysInMonth) * d : 0;
    days.push({
      day: d,
      date: dateStr,
      importo,
      cumulative,
      obiettivoGiornaliero,
      hasData: !!fatturato?.importo,
      isToday: d === todayDay,
      isPast: todayDay ? d <= todayDay : true // Permetti modifica anche giorni passati
    });
  }

  // L'obiettivo è sempre il tetto massimo del grafico
  const maxValue = obiettivo > 0 ? obiettivo : Math.max(cumulative, 1);

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

  // Genera path SVG per il grafico a linea (fatturato cumulativo)
  const generateLinePath = () => {
    const width = daysInMonth * 24;
    const height = 22;
    const padding = 3;
    
    let path = '';
    let hasStarted = false;
    
    days.forEach((day, i) => {
      if (day.cumulative === 0 && !hasStarted) return;
      hasStarted = true;
      
      const x = (i / (daysInMonth - 1)) * (width - padding * 2) + padding;
      const y = height - padding - ((day.cumulative / maxValue) * (height - padding * 2));
      
      if (path === '') {
        // Parti da 0 sul primo giorno con dati
        const startX = (i / (daysInMonth - 1)) * (width - padding * 2) + padding;
        path += `M ${startX} ${height - padding} L ${x} ${y}`;
      } else {
        path += ` L ${x} ${y}`;
      }
    });
    
    return path || `M ${padding} ${height - padding}`;
  };

  // Genera path per linea obiettivo (diagonale da 0 all'obiettivo)
  const generateObjectivePath = () => {
    if (obiettivo <= 0) return '';
    const width = daysInMonth * 24;
    const height = 22;
    const padding = 3;
    // Linea diagonale da (0,0) a (fine mese, obiettivo)
    const startY = height - padding;
    const endY = padding;
    return `M ${padding} ${startY} L ${width - padding} ${endY}`;
  };

  return (
    <div className="bg-slate-900 border-t border-slate-700">
      {/* Grafico + puntini giorni */}
      <div 
        ref={scrollRef}
        className="overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div style={{ width: `${daysInMonth * 24}px`, minWidth: '100%' }}>
          {/* SVG Grafico a linea */}
          <svg 
            width={daysInMonth * 24} 
            height={22} 
            className="block"
          >
            {/* Linea obiettivo tratteggiata (diagonale) */}
            {obiettivo > 0 && (
              <path
                d={generateObjectivePath()}
                stroke="#a3e635"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                fill="none"
                opacity="0.6"
              />
            )}
            
            {/* Linea fatturato cumulativo */}
            <path
              d={generateLinePath()}
              stroke={monthColor}
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Punto oggi che pulsa */}
            {todayDay && days[todayDay - 1] && (
              <>
                <circle
                  cx={(todayDay - 1) / (daysInMonth - 1) * (daysInMonth * 24 - 8) + 4}
                  cy={22 - 3 - ((days[todayDay - 1].cumulative / maxValue) * 16)}
                  r="5"
                  fill="#a3e635"
                  opacity="0.3"
                  className="animate-ping"
                />
                <circle
                  cx={(todayDay - 1) / (daysInMonth - 1) * (daysInMonth * 24 - 8) + 4}
                  cy={22 - 3 - ((days[todayDay - 1].cumulative / maxValue) * 16)}
                  r="4"
                  fill="#a3e635"
                  stroke="#0f172a"
                  strokeWidth="1"
                />
              </>
            )}
          </svg>

          {/* Puntini giorni - PIÙ GRANDI */}
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
                    "flex flex-col items-center cursor-pointer min-w-[24px] py-1 rounded transition-all",
                    isSelected && "bg-slate-800",
                    isEditing && "bg-slate-700"
                  )}
                >
                  {/* Puntino GRANDE */}
                  <div 
                    className={cn(
                      "w-4 h-4 rounded-full transition-all flex items-center justify-center",
                      day.isToday && "animate-pulse ring-2 ring-lime-400/50",
                      isSelected && !day.isToday && "ring-2 ring-white"
                    )}
                    style={{ 
                      backgroundColor: day.isToday ? '#a3e635' : (day.hasData ? monthColor : '#334155'),
                      boxShadow: day.isToday ? '0 0 8px #a3e635' : (day.hasData ? `0 0 6px ${monthColor}50` : 'none')
                    }}
                  >
                    {day.isToday ? (
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                    ) : day.hasData ? (
                      <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
                    ) : null}
                  </div>
                  {/* Numero giorno */}
                  <span 
                    className={cn(
                      "text-[8px] leading-tight mt-0.5",
                      day.hasData ? "font-bold" : "font-normal",
                      day.isToday ? "text-lime-400 font-bold" : (isSelected ? "text-white" : "text-slate-500")
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

      {/* Riga info: fatturato + obiettivo + comparazioni */}
      <div className="flex items-center justify-between px-2 py-1.5 border-t border-slate-800">
        {/* Fatturato attuale */}
        <div className="flex flex-col">
          <span className="text-[8px] text-slate-500 uppercase">Fatturato</span>
          <span className="text-sm font-bold" style={{ color: monthColor }}>
            €{formatCurrency(totaleMese)}
          </span>
        </div>

        {/* Obiettivo - cliccabile */}
        <div 
          className="flex flex-col items-center cursor-pointer px-2 py-1 rounded hover:bg-slate-800 transition-colors"
          onClick={() => setShowObjectiveInput(true)}
        >
          <span className="text-[8px] text-slate-500 uppercase flex items-center gap-1">
            <Target className="w-2.5 h-2.5" />
            Obiettivo
          </span>
          {obiettivo > 0 ? (
            <span className="text-sm font-bold text-green-400">
              €{formatCurrency(obiettivo)}
            </span>
          ) : (
            <span className="text-xs text-slate-400">+ imposta</span>
          )}
        </div>

        {/* Comparazioni */}
        <div className="flex flex-col items-end">
          {/* vs mese precedente */}
          {totaleMesePrecedente > 0 ? (
            <div className="flex items-center gap-1">
              {varMesePrecedente > 0 ? (
                <TrendingUp className="w-3 h-3 text-green-400" />
              ) : varMesePrecedente < 0 ? (
                <TrendingDown className="w-3 h-3 text-red-400" />
              ) : null}
              <span className={cn(
                "text-[10px] font-semibold",
                varMesePrecedente > 0 ? "text-green-400" : varMesePrecedente < 0 ? "text-red-400" : "text-slate-400"
              )}>
                {varMesePrecedente > 0 ? '+' : ''}{varMesePrecedente.toFixed(0)}% mese
              </span>
            </div>
          ) : (
            <span className="text-[9px] text-slate-600">vs mese -</span>
          )}
          
          {/* vs anno scorso */}
          {totaleAnnoScorso > 0 ? (
            <div className="flex items-center gap-1">
              <span className={cn(
                "text-[9px] font-medium",
                varAnnoScorso > 0 ? "text-green-400" : varAnnoScorso < 0 ? "text-red-400" : "text-slate-400"
              )}>
                {varAnnoScorso > 0 ? '+' : ''}{varAnnoScorso.toFixed(0)}% YoY
              </span>
            </div>
          ) : (
            <span className="text-[8px] text-slate-600">vs anno -</span>
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