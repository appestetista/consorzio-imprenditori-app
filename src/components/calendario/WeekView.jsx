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

// Genera slot ogni 5 minuti per 24 ore (come VerticalTimePicker)
function generateTimeSlots() {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) {
      slots.push({
        hour: h,
        minute: m,
        label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        isFullHour: m === 0
      });
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

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

export default function WeekView({ selectedDate, monthColor }) {
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

  // Scroll all'ora corrente
  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      // Ogni slot = 5 min, 12 slot per ora
      const slotIndex = now.getHours() * 12 + Math.floor(now.getMinutes() / 5);
      const slotWidth = 44; // minWidth di ogni colonna slot
      const scrollTo = Math.max(0, (slotIndex - 3) * slotWidth);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ left: scrollTo, behavior: 'smooth' });
      }, 300);
    }
  }, [weekOffset]);

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

  // Mappa items per data + timeSlotLabel (es. "07:05")
  const itemsByDayTime = {};
  weekDays.forEach(d => { itemsByDayTime[formatDateKey(d)] = {}; });

  noteSettimana.forEach(nota => {
    if (!nota.data || !nota.time) return;
    // Arrotonda ai 5 min
    const [h, m] = nota.time.split(':').map(Number);
    const roundedM = Math.floor(m / 5) * 5;
    const slotKey = `${String(h).padStart(2, '0')}:${String(roundedM).padStart(2, '0')}`;
    if (!itemsByDayTime[nota.data]) itemsByDayTime[nota.data] = {};
    if (!itemsByDayTime[nota.data][slotKey]) itemsByDayTime[nota.data][slotKey] = [];
    itemsByDayTime[nota.data][slotKey].push({
      title: nota.title,
      time: nota.time,
      color: nota.cartella_id && cartelleMap[nota.cartella_id] ? cartelleMap[nota.cartella_id].colore : '#a3e635',
      cartellaName: nota.cartella_id && cartelleMap[nota.cartella_id] ? cartelleMap[nota.cartella_id].nome : null
    });
  });

  fileSettimana.forEach(file => {
    if (!file.data || !file.time) return;
    const [h, m] = file.time.split(':').map(Number);
    const roundedM = Math.floor(m / 5) * 5;
    const slotKey = `${String(h).padStart(2, '0')}:${String(roundedM).padStart(2, '0')}`;
    if (!itemsByDayTime[file.data]) itemsByDayTime[file.data] = {};
    if (!itemsByDayTime[file.data][slotKey]) itemsByDayTime[file.data][slotKey] = [];
    const cart = cartelleMap[file.cartella_id];
    itemsByDayTime[file.data][slotKey].push({
      title: file.titolo,
      time: file.time,
      color: cart?.colore || '#64748b',
      cartellaName: cart?.nome || ''
    });
  });

  const activeColor = monthColor || MONTH_COLORS[offsetDate.getMonth()];
  const weekLabel = `${weekDays[0].getDate()} ${weekDays[0].toLocaleDateString('it-IT', { month: 'short' })} - ${weekDays[6].getDate()} ${weekDays[6].toLocaleDateString('it-IT', { month: 'short' })}`;

  const nowHour = new Date().getHours();
  const nowMin = Math.floor(new Date().getMinutes() / 5) * 5;
  const nowSlotLabel = `${String(nowHour).padStart(2, '0')}:${String(nowMin).padStart(2, '0')}`;
  const isTodayInWeek = weekDays.some(d => d.getTime() === today.getTime());

  // Sincronizza scroll di tutte le righe + barra ore
  const syncScroll = (sourceEl) => {
    const scrollLeft = sourceEl.scrollLeft;
    const allScrollables = document.querySelectorAll('[data-week-scroll]');
    allScrollables.forEach(el => {
      if (el !== sourceEl) el.scrollLeft = scrollLeft;
    });
  };

  const SLOT_WIDTH = 44;

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Navigazione settimana */}
      <div className="flex items-center justify-center gap-3 px-2 py-1 flex-shrink-0">
        <button onClick={() => setWeekOffset(w => w - 1)} className="p-0.5 rounded hover:bg-slate-700">
          <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
        </button>
        <span className="text-[10px] font-semibold" style={{ color: activeColor }}>{weekLabel}</span>
        {weekOffset !== 0 && (
          <button 
            onClick={() => setWeekOffset(0)} 
            className="text-[8px] font-bold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: activeColor, color: '#0f172a' }}
          >
            OGGI
          </button>
        )}
        <button onClick={() => setWeekOffset(w => w + 1)} className="p-0.5 rounded hover:bg-slate-700">
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* Griglia: a sinistra i giorni, in alto le ore, scroll orizzontale condiviso */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* Barra ore in alto */}
        <div className="flex flex-shrink-0 border-b border-slate-700">
          {/* Angolo vuoto */}
          <div className="w-14 flex-shrink-0 border-r border-slate-700" />
          <div 
            data-week-scroll
            className="flex-1 overflow-x-auto scrollbar-hide flex"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onScroll={(e) => syncScroll(e.target)}
          >
            {TIME_SLOTS.map((slot) => {
              const isNow = isTodayInWeek && slot.label === nowSlotLabel;
              return (
                <div
                  key={slot.label}
                  className={cn(
                    "flex-shrink-0 flex items-center justify-center py-1",
                    slot.isFullHour ? "border-r border-slate-600" : "border-r border-slate-800/20"
                  )}
                  style={{ width: `${SLOT_WIDTH}px`, minWidth: `${SLOT_WIDTH}px` }}
                >
                  <span 
                    className={cn(
                      "font-mono font-bold",
                      slot.isFullHour ? "text-[10px]" : "text-[8px]",
                      isNow && "animate-pulse"
                    )}
                    style={{ color: isNow ? '#ffffff' : (slot.isFullHour ? activeColor : '#475569') }}
                  >
                    {slot.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Righe giorni */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {weekDays.map((day, dayIdx) => {
            const dateKey = formatDateKey(day);
            const isToday = day.getTime() === today.getTime();

            return (
              <div key={dayIdx} className="flex flex-1 min-h-0 border-b border-slate-800/40">
                {/* Label giorno fisso a sinistra */}
                <div 
                  className={cn(
                    "w-14 flex-shrink-0 flex flex-col items-center justify-center border-r border-slate-700 px-1",
                    isToday && "bg-slate-800/50"
                  )}
                >
                  <span className="text-[9px] font-semibold" style={{ color: isToday ? activeColor : '#64748b' }}>
                    {DAYS_SHORT_IT[dayIdx]}
                  </span>
                  <span 
                    className={cn("text-xs font-bold leading-none", isToday && "animate-pulse")}
                    style={{ color: isToday ? activeColor : '#e2e8f0' }}
                  >
                    {day.getDate()}
                  </span>
                </div>

                {/* Celle time slot scrollabili */}
                <div 
                  ref={dayIdx === 0 ? scrollRef : null}
                  data-week-scroll
                  className="flex-1 overflow-x-auto scrollbar-hide flex"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  onScroll={(e) => syncScroll(e.target)}
                >
                  {TIME_SLOTS.map((slot) => {
                    const items = itemsByDayTime[dateKey]?.[slot.label] || [];
                    const isNow = isToday && slot.label === nowSlotLabel;

                    return (
                      <div
                        key={slot.label}
                        className={cn(
                          "flex-shrink-0 relative flex flex-col justify-center px-px",
                          slot.isFullHour ? "border-r border-slate-700/40" : "border-r border-slate-800/15",
                          isNow && "bg-white/5"
                        )}
                        style={{ width: `${SLOT_WIDTH}px`, minWidth: `${SLOT_WIDTH}px` }}
                      >
                        {isNow && (
                          <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-white animate-pulse z-10" />
                        )}
                        {items.map((item, i) => (
                          <div
                            key={i}
                            className="rounded px-0.5 py-px truncate mx-px"
                            style={{ backgroundColor: item.color + '30', borderLeft: `2px solid ${item.color}` }}
                          >
                            <div className="text-[7px] font-medium truncate" style={{ color: item.color }}>
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
      </div>
    </div>
  );
}