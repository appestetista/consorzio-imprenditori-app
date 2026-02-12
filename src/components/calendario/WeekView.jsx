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

// Genera slot ogni 5 minuti (identico a VerticalTimePicker)
function generateTimeSlots() {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) {
      slots.push({
        hour: h,
        minute: m,
        label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        isFullHour: m === 0,
        isHalfHour: m === 30
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
      const slotIndex = now.getHours() * 12 + Math.floor(now.getMinutes() / 5);
      const ROW_HEIGHT = 26;
      const scrollTo = Math.max(0, (slotIndex - 4) * ROW_HEIGHT);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollTo, behavior: 'smooth' });
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

  // Mappa items per data + timeSlotLabel
  const itemsByDayTime = {};
  weekDays.forEach(d => { itemsByDayTime[formatDateKey(d)] = {}; });

  noteSettimana.forEach(nota => {
    if (!nota.data || !nota.time) return;
    const [h, m] = nota.time.split(':').map(Number);
    const roundedM = Math.floor(m / 5) * 5;
    const slotKey = `${String(h).padStart(2, '0')}:${String(roundedM).padStart(2, '0')}`;
    if (!itemsByDayTime[nota.data]) itemsByDayTime[nota.data] = {};
    if (!itemsByDayTime[nota.data][slotKey]) itemsByDayTime[nota.data][slotKey] = [];
    itemsByDayTime[nota.data][slotKey].push({
      title: nota.title,
      time: nota.time,
      color: nota.cartella_id && cartelleMap[nota.cartella_id] ? cartelleMap[nota.cartella_id].colore : '#a3e635',
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
    });
  });

  const activeColor = monthColor || MONTH_COLORS[offsetDate.getMonth()];
  const weekLabel = `${weekDays[0].getDate()} ${weekDays[0].toLocaleDateString('it-IT', { month: 'long' })} - ${weekDays[6].getDate()} ${weekDays[6].toLocaleDateString('it-IT', { month: 'long' })}`;

  const nowHour = new Date().getHours();
  const nowMin = Math.floor(new Date().getMinutes() / 5) * 5;
  const nowSlotLabel = `${String(nowHour).padStart(2, '0')}:${String(nowMin).padStart(2, '0')}`;
  const isTodayInWeek = weekDays.some(d => d.getTime() === today.getTime());

  // Sincronizza scroll verticale tra tutte le colonne
  const syncScroll = (sourceEl) => {
    const scrollTop = sourceEl.scrollTop;
    const allScrollables = document.querySelectorAll('[data-week-vscroll]');
    allScrollables.forEach(el => {
      if (el !== sourceEl) el.scrollTop = scrollTop;
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Layout: fascia laterale sinistra con data range ruotata + navigazione, poi griglia */}
      <div className="flex-1 flex min-h-0">

        {/* Fascia sinistra: navigazione + label settimana ruotata */}
        <div 
          className="flex flex-col items-center border-r border-slate-700 flex-shrink-0"
          style={{ 
            width: '32px',
            backgroundColor: `color-mix(in srgb, ${activeColor} 6%, #0f172a)`,
          }}
        >
          {/* Freccia su (settimana precedente) */}
          <button onClick={() => setWeekOffset(w => w - 1)} className="p-1 mt-1 rounded hover:bg-slate-700">
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {weekOffset !== 0 && (
            <button 
              onClick={() => setWeekOffset(0)} 
              className="text-[7px] font-bold px-1 py-0.5 rounded my-0.5"
              style={{ 
                writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                backgroundColor: activeColor, color: '#0f172a' 
              }}
            >
              OGGI
            </button>
          )}

          {/* Label settimana ruotata 90° */}
          <div className="flex-1 flex items-center justify-center">
            <span 
              className="text-[10px] font-bold whitespace-nowrap"
              style={{ 
                color: activeColor,
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)'
              }}
            >
              {weekLabel}
            </span>
          </div>

          {/* Freccia giù (settimana successiva) */}
          <button onClick={() => setWeekOffset(w => w + 1)} className="p-1 mb-1 rounded hover:bg-slate-700">
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Colonna ore/minuti (identica a VerticalTimePicker) - scrollabile verticalmente */}
        <div 
          ref={scrollRef}
          data-week-vscroll
          className="flex-shrink-0 overflow-y-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', width: '52px' }}
          onScroll={(e) => syncScroll(e.target)}
        >
          {TIME_SLOTS.map((slot) => {
            const isNow = isTodayInWeek && slot.label === nowSlotLabel;
            return (
              <div
                key={slot.label}
                className={cn(
                  "flex items-center px-1",
                  slot.isFullHour ? "h-10" : "h-6"
                )}
              >
                {/* Lineetta come VerticalTimePicker */}
                <div className="flex items-center mr-1">
                  {isNow ? (
                    <div 
                      className="h-[2px] rounded-full animate-pulse flex-shrink-0"
                      style={{ width: slot.isFullHour ? '12px' : '6px', backgroundColor: '#ffffff' }}
                    />
                  ) : (
                    <div 
                      className="h-[2px] rounded-full"
                      style={{ 
                        width: slot.isFullHour ? '12px' : '6px',
                        backgroundColor: slot.isFullHour ? activeColor : '#475569'
                      }}
                    />
                  )}
                </div>
                {/* Orario ruotato 90° */}
                <span 
                  className={cn(
                    "font-mono text-[9px] flex-shrink-0",
                    slot.isFullHour && "font-bold",
                    isNow && "text-white font-bold animate-pulse"
                  )}
                  style={{
                    color: isNow ? '#ffffff' : (slot.isFullHour ? activeColor : '#94a3b8'),
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)'
                  }}
                >
                  {slot.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Colonne giorni della settimana - header in alto (ruotato) + celle scrollabili */}
        <div className="flex-1 flex min-w-0 overflow-hidden">
          {weekDays.map((day, dayIdx) => {
            const dateKey = formatDateKey(day);
            const isToday = day.getTime() === today.getTime();
            const isWeekend = dayIdx >= 5; // Sab, Dom

            return (
              <div key={dayIdx} className="flex-1 flex flex-col min-w-0 border-r border-slate-800/30 last:border-r-0">
                {/* Header giorno - ruotato 90° */}
                <div 
                  className={cn(
                    "flex-shrink-0 flex flex-col items-center justify-center py-1.5 border-b border-slate-700",
                    isToday && "bg-slate-800/50"
                  )}
                >
                  <span 
                    className="text-[8px] font-semibold"
                    style={{ 
                      color: isWeekend ? '#ef4444' : (isToday ? activeColor : '#64748b'),
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)'
                    }}
                  >
                    {DAYS_SHORT_IT[dayIdx]}
                  </span>
                  <span 
                    className={cn("text-[10px] font-bold leading-none mt-0.5", isToday && "animate-pulse")}
                    style={{ 
                      color: isToday ? activeColor : '#e2e8f0',
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)'
                    }}
                  >
                    {day.getDate()}
                  </span>
                </div>

                {/* Celle time slot - scrollabile verticalmente sincronizzata */}
                <div 
                  data-week-vscroll
                  className="flex-1 overflow-y-auto scrollbar-hide"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  onScroll={(e) => syncScroll(e.target)}
                >
                  {TIME_SLOTS.map((slot) => {
                    const items = itemsByDayTime[dateKey]?.[slot.label] || [];
                    const isNow = isToday && slot.label === nowSlotLabel;
                    const hasItems = items.length > 0;

                    return (
                      <div
                        key={slot.label}
                        className={cn(
                          "relative border-b",
                          slot.isFullHour ? "h-10 border-slate-700/40" : "h-6 border-slate-800/15",
                          isNow && "bg-white/5"
                        )}
                      >
                        {/* Linea corrente */}
                        {isNow && (
                          <div className="absolute left-0 right-0 top-0 h-[2px] bg-white animate-pulse z-10" />
                        )}
                        {/* Items */}
                        {items.map((item, i) => (
                          <div
                            key={i}
                            className="absolute inset-x-0 top-0.5 bottom-0.5 mx-px rounded overflow-hidden"
                            style={{ backgroundColor: item.color + '30', borderLeft: `2px solid ${item.color}` }}
                          >
                            <span 
                              className="text-[7px] font-medium px-0.5 block truncate"
                              style={{ 
                                color: item.color,
                                writingMode: 'vertical-rl',
                                transform: 'rotate(180deg)',
                                height: '100%'
                              }}
                            >
                              {item.title}
                            </span>
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