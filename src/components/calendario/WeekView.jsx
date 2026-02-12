import React, { useState, useEffect } from 'react';
import { X, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const DAYS_FULL = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const DAYS_SHORT_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const MONTH_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#22c55e', '#eab308',
  '#f97316', '#ef4444', '#06b6d4', '#a855f7', '#6366f1', '#0ea5e9'
];

// Ore da mostrare (6-23)
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

function getWeekDays(referenceDate) {
  const d = new Date(referenceDate);
  const dayOfWeek = d.getDay(); // 0=dom, 1=lun...
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

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setUserEmail(user?.email);
    };
    loadUser();
  }, []);

  // Calcola i giorni della settimana corrente (con offset)
  const baseDate = selectedDate ? new Date(selectedDate) : new Date();
  const offsetDate = new Date(baseDate);
  offsetDate.setDate(offsetDate.getDate() + weekOffset * 7);
  const weekDays = getWeekDays(offsetDate);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Range date per query
  const startDateStr = formatDateKey(weekDays[0]);
  const endDateStr = formatDateKey(weekDays[6]);

  // Query note della settimana
  const { data: noteSettimana = [] } = useQuery({
    queryKey: ['note-week', userEmail, startDateStr, endDateStr],
    queryFn: async () => {
      if (!userEmail) return [];
      const allNotes = await base44.entities.Nota.filter({ user_email: userEmail });
      return allNotes.filter(n => n.data >= startDateStr && n.data <= endDateStr);
    },
    enabled: !!userEmail
  });

  // Query file cartella della settimana
  const { data: fileSettimana = [] } = useQuery({
    queryKey: ['file-week', userEmail, startDateStr, endDateStr],
    queryFn: async () => {
      if (!userEmail) return [];
      const allFiles = await base44.entities.FileCartella.filter({ user_email: userEmail });
      return allFiles.filter(f => f.data >= startDateStr && f.data <= endDateStr);
    },
    enabled: !!userEmail
  });

  // Query cartelle per colori
  const { data: cartelle = [] } = useQuery({
    queryKey: ['cartelle', userEmail],
    queryFn: () => base44.entities.Cartella.filter({ user_email: userEmail }),
    enabled: !!userEmail
  });

  const cartelleMap = {};
  cartelle.forEach(c => { cartelleMap[c.id] = c; });

  // Mappa note e file per data e ora
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

  // Colore del mese visibile
  const activeColor = monthColor || MONTH_COLORS[offsetDate.getMonth()];

  // Etichetta settimana
  const weekLabel = `${weekDays[0].getDate()} ${weekDays[0].toLocaleDateString('it-IT', { month: 'short' })} - ${weekDays[6].getDate()} ${weekDays[6].toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })}`;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700 flex-shrink-0">
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-700">
          <X className="w-5 h-5 text-slate-400" />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(w => w - 1)} className="p-1 rounded hover:bg-slate-700">
            <ChevronLeft className="w-4 h-4 text-slate-400" />
          </button>
          <span className="text-sm font-semibold" style={{ color: activeColor }}>{weekLabel}</span>
          <button onClick={() => setWeekOffset(w => w + 1)} className="p-1 rounded hover:bg-slate-700">
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <button 
          onClick={() => setWeekOffset(0)} 
          className="text-[10px] font-bold px-2 py-1 rounded"
          style={{ backgroundColor: activeColor, color: '#0f172a' }}
        >
          OGGI
        </button>
      </div>

      {/* Griglia settimanale - landscape style (ore a sinistra, giorni in colonne) */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-full">
          {/* Intestazioni giorni */}
          <div className="flex sticky top-0 z-10 bg-slate-900 border-b border-slate-700">
            {/* Cella vuota angolo ore */}
            <div className="w-12 flex-shrink-0 border-r border-slate-700" />
            {weekDays.map((day, idx) => {
              const isToday = day.getTime() === today.getTime();
              const isSelected = selectedDate && day.toDateString() === new Date(selectedDate).toDateString();
              const dayColor = MONTH_COLORS[day.getMonth()];
              return (
                <div
                  key={idx}
                  className={cn(
                    "flex-1 text-center py-1.5 border-r border-slate-700/50 min-w-[80px]",
                    isToday && "bg-slate-800/60"
                  )}
                >
                  <div className="text-[10px] font-medium" style={{ color: isToday ? activeColor : '#94a3b8' }}>
                    {DAYS_SHORT_IT[idx]}
                  </div>
                  <div
                    className={cn(
                      "text-sm font-bold leading-tight",
                      isToday && "animate-pulse"
                    )}
                    style={{ color: isToday ? activeColor : (isSelected ? dayColor : '#ffffff') }}
                  >
                    {day.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Righe ore */}
          {HOURS.map((hour) => (
            <div key={hour} className="flex border-b border-slate-800/50 min-h-[48px]">
              {/* Colonna ora */}
              <div className="w-12 flex-shrink-0 border-r border-slate-700 flex items-start justify-end pr-1 pt-0.5">
                <span className="text-[10px] font-mono text-slate-500">
                  {String(hour).padStart(2, '0')}:00
                </span>
              </div>
              {/* Celle giornaliere */}
              {weekDays.map((day, dayIdx) => {
                const dateKey = formatDateKey(day);
                const items = itemsByDayHour[dateKey]?.[hour] || [];
                const isToday = day.getTime() === today.getTime();
                const isNow = isToday && new Date().getHours() === hour;

                return (
                  <div
                    key={dayIdx}
                    className={cn(
                      "flex-1 border-r border-slate-800/30 px-0.5 py-0.5 min-w-[80px] relative",
                      isToday && "bg-slate-800/20",
                      isNow && "bg-slate-700/30"
                    )}
                  >
                    {isNow && (
                      <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-white/40 animate-pulse z-0" />
                    )}
                    {items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className="rounded px-1 py-0.5 mb-0.5 truncate relative z-10"
                        style={{ backgroundColor: item.color + '25', borderLeft: `2px solid ${item.color}` }}
                      >
                        <span className="text-[9px] font-mono text-slate-500 mr-1">{item.time}</span>
                        <span className="text-[10px] font-medium" style={{ color: item.color }}>
                          {item.title}
                        </span>
                        {item.cartellaName && (
                          <span className="text-[8px] ml-1" style={{ color: item.color + 'aa' }}>
                            / {item.cartellaName}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}