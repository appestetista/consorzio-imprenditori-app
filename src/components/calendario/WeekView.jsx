import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const DAYS_SHORT_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const MONTH_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#22c55e', '#eab308',
  '#f97316', '#ef4444', '#06b6d4', '#a855f7', '#6366f1', '#0ea5e9'
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getWeekDays(referenceDate) {
  const d = new Date(referenceDate);
  const dayOfWeek = d.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    days.push(day);
  }
  return days;
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function WeekView({ selectedDate, onClose, monthColor }) {
  const [userEmail, setUserEmail] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setUserEmail(user?.email);
    };
    loadUser();
  }, []);

  // Scroll all'ora corrente all'apertura
  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const hourWidth = 60; // larghezza minima per ora
      const scrollTo = Math.max(0, (now.getHours() - 2) * hourWidth);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ left: scrollTo, behavior: 'smooth' });
      }, 200);
    }
  }, []);

  const baseDate = selectedDate ? new Date(selectedDate) : new Date();
  const offsetDate = new Date(baseDate);
  offsetDate.setDate(offsetDate.getDate() + weekOffset * 7);
  const weekDays = getWeekDays(offsetDate);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDateStr = formatDateKey(weekDays[0]);
  const endDateStr = formatDateKey(weekDays[6]);

  const { data: noteSettimana = [] } = useQuery({
    queryKey: ['note-week', userEmail, startDateStr, endDateStr],
    queryFn: async () => {
      if (!userEmail) return [];
      const allNotes = await base44.entities.Nota.filter({ user_email: userEmail });
      return allNotes.filter(n => n.data >= startDateStr && n.data <= endDateStr);
    },
    enabled: !!userEmail
  });

  const { data: fileSettimana = [] } = useQuery({
    queryKey: ['file-week', userEmail, startDateStr, endDateStr],
    queryFn: async () => {
      if (!userEmail) return [];
      const allFiles = await base44.entities.FileCartella.filter({ user_email: userEmail });
      return allFiles.filter(f => f.data >= startDateStr && f.data <= endDateStr);
    },
    enabled: !!userEmail
  });

  const { data: cartelle = [] } = useQuery({
    queryKey: ['cartelle', userEmail],
    queryFn: () => base44.entities.Cartella.filter({ user_email: userEmail }),
    enabled: !!userEmail
  });

  const cartelleMap = {};
  cartelle.forEach(c => { cartelleMap[c.id] = c; });

  // Mappa items per data+ora
  const itemsByDayHour = {};
  weekDays.forEach(d => {
    const key = formatDateKey(d);
    itemsByDayHour[key] = {};
  });

  noteSettimana.forEach(nota => {
    if (!nota.data || !nota.time) return;
    const hour = parseInt(nota.time.split(':')[0]);
    if (!itemsByDayHour[nota.data]) itemsByDayHour[nota.data] = {};
    if (!itemsByDayHour[nota.data][hour]) itemsByDayHour[nota.data][hour] = [];
    itemsByDayHour[nota.data][hour].push({
      type: 'nota',
      title: nota.title,
      time: nota.time,
      color: nota.cartella_id && cartelleMap[nota.cartella_id] ? cartelleMap[nota.cartella_id].colore : '#a3e635',
      cartellaName: nota.cartella_id && cartelleMap[nota.cartella_id] ? cartelleMap[nota.cartella_id].nome : null
    });
  });

  fileSettimana.forEach(file => {
    if (!file.data || !file.time) return;
    const hour = parseInt(file.time.split(':')[0]);
    if (!itemsByDayHour[file.data]) itemsByDayHour[file.data] = {};
    if (!itemsByDayHour[file.data][hour]) itemsByDayHour[file.data][hour] = [];
    const cart = cartelleMap[file.cartella_id];
    itemsByDayHour[file.data][hour].push({
      type: 'file',
      title: file.titolo,
      time: file.time,
      color: cart?.colore || '#64748b',
      cartellaName: cart?.nome || ''
    });
  });

  const activeColor = monthColor || MONTH_COLORS[offsetDate.getMonth()];
  const weekLabel = `${weekDays[0].getDate()} ${weekDays[0].toLocaleDateString('it-IT', { month: 'short' })} - ${weekDays[6].getDate()} ${weekDays[6].toLocaleDateString('it-IT', { month: 'short' })}`;

  const currentHour = new Date().getHours();

  // Altezza per ogni riga giorno (dividiamo lo spazio disponibile per 7)
  // Larghezza per ogni colonna ora
  const HOUR_WIDTH = 60;

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header con navigazione settimana */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-700 flex-shrink-0">
        <button onClick={() => setWeekOffset(w => w - 1)} className="p-1 rounded hover:bg-slate-700">
          <ChevronLeft className="w-4 h-4 text-slate-400" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: activeColor }}>{weekLabel}</span>
          {weekOffset !== 0 && (
            <button 
              onClick={() => setWeekOffset(0)} 
              className="text-[9px] font-bold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: activeColor, color: '#0f172a' }}
            >
              OGGI
            </button>
          )}
        </div>
        <button onClick={() => setWeekOffset(w => w + 1)} className="p-1 rounded hover:bg-slate-700">
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Griglia ruotata: righe = giorni, colonne = ore, scroll orizzontale */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Contenitore scrollabile orizzontale (ore) */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Righe giorni */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {weekDays.map((day, dayIdx) => {
              const dateKey = formatDateKey(day);
              const isToday = day.getTime() === today.getTime();
              const isSelected = selectedDate && day.toDateString() === new Date(selectedDate).toDateString();
              const dayColor = MONTH_COLORS[day.getMonth()];

              return (
                <div key={dayIdx} className="flex flex-1 min-h-0 border-b border-slate-800/50">
                  {/* Label giorno fisso a sinistra */}
                  <div 
                    className={cn(
                      "w-10 flex-shrink-0 flex flex-col items-center justify-center border-r border-slate-700",
                      isToday && "bg-slate-800/60"
                    )}
                  >
                    <span className="text-[8px] font-medium" style={{ color: isToday ? activeColor : '#64748b' }}>
                      {DAYS_SHORT_IT[dayIdx]}
                    </span>
                    <span 
                      className={cn("text-[11px] font-bold leading-none", isToday && "animate-pulse")}
                      style={{ color: isToday ? activeColor : '#ffffff' }}
                    >
                      {day.getDate()}
                    </span>
                  </div>

                  {/* Celle ore scrollabili */}
                  <div 
                    ref={dayIdx === 0 ? scrollRef : null}
                    className="flex-1 overflow-x-auto scrollbar-hide flex"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    onScroll={(e) => {
                      // Sincronizza scroll tra tutte le righe
                      const scrollLeft = e.target.scrollLeft;
                      const container = e.target.closest('.flex-col')?.parentElement;
                      if (!container) return;
                      const rows = container.querySelectorAll('.overflow-x-auto');
                      rows.forEach(row => {
                        if (row !== e.target) row.scrollLeft = scrollLeft;
                      });
                    }}
                  >
                    {HOURS.map((hour) => {
                      const items = itemsByDayHour[dateKey]?.[hour] || [];
                      const isNow = isToday && currentHour === hour;

                      return (
                        <div
                          key={hour}
                          className={cn(
                            "flex-shrink-0 border-r border-slate-800/30 relative flex flex-col justify-center px-0.5",
                            isNow && "bg-slate-700/30"
                          )}
                          style={{ width: `${HOUR_WIDTH}px`, minWidth: `${HOUR_WIDTH}px` }}
                        >
                          {isNow && (
                            <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-white/50 animate-pulse" />
                          )}
                          {items.map((item, itemIdx) => (
                            <div
                              key={itemIdx}
                              className="rounded px-1 py-0.5 mb-px truncate"
                              style={{ backgroundColor: item.color + '25', borderLeft: `2px solid ${item.color}` }}
                            >
                              <div className="text-[8px] font-mono" style={{ color: item.color + 'cc' }}>{item.time}</div>
                              <div className="text-[9px] font-medium truncate" style={{ color: item.color }}>
                                {item.title}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Barra ore in basso - fissa */}
          <div className="flex-shrink-0 border-t border-slate-700 flex">
            <div className="w-10 flex-shrink-0 border-r border-slate-700" />
            <div 
              className="flex-1 overflow-x-auto scrollbar-hide flex"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              onScroll={(e) => {
                const scrollLeft = e.target.scrollLeft;
                const container = e.target.closest('.flex-col')?.parentElement;
                if (!container) return;
                const rows = container.querySelectorAll('.overflow-x-auto');
                rows.forEach(row => {
                  if (row !== e.target) row.scrollLeft = scrollLeft;
                });
              }}
            >
              {HOURS.map((hour) => {
                const isNow = today.getTime() === new Date(new Date().setHours(0,0,0,0)).getTime() && currentHour === hour;
                return (
                  <div
                    key={hour}
                    className="flex-shrink-0 flex items-center justify-center py-1 border-r border-slate-800/30"
                    style={{ width: `${HOUR_WIDTH}px`, minWidth: `${HOUR_WIDTH}px` }}
                  >
                    <span 
                      className={cn("text-[10px] font-mono font-bold", isNow && "animate-pulse")}
                      style={{ color: isNow ? activeColor : '#64748b' }}
                    >
                      {String(hour).padStart(2, '0')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}