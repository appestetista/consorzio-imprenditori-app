import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const DAYS_FULL_IT = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

const MONTH_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#22c55e', '#eab308',
  '#f97316', '#ef4444', '#06b6d4', '#a855f7', '#6366f1', '#0ea5e9'
];

function generateTimeSlots() {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) {
      slots.push({
        hour: h, minute: m,
        label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        isFullHour: m === 0, isHalfHour: m === 30
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

// Costruisce la mappa items per data+slot
function buildItemsMap(weekDays, notes, files, cartelleMap) {
  const map = {};
  weekDays.forEach(d => { map[formatDateKey(d)] = {}; });

  notes.forEach(nota => {
    if (!nota.data || !nota.time) return;
    const [h, m] = nota.time.split(':').map(Number);
    const slotKey = `${String(h).padStart(2, '0')}:${String(Math.floor(m / 5) * 5).padStart(2, '0')}`;
    if (!map[nota.data]) map[nota.data] = {};
    if (!map[nota.data][slotKey]) map[nota.data][slotKey] = [];
    map[nota.data][slotKey].push({
      title: nota.title, time: nota.time,
      color: nota.cartella_id && cartelleMap[nota.cartella_id] ? cartelleMap[nota.cartella_id].colore : '#a3e635',
    });
  });

  files.forEach(file => {
    if (!file.data || !file.time) return;
    const [h, m] = file.time.split(':').map(Number);
    const slotKey = `${String(h).padStart(2, '0')}:${String(Math.floor(m / 5) * 5).padStart(2, '0')}`;
    if (!map[file.data]) map[file.data] = {};
    if (!map[file.data][slotKey]) map[file.data][slotKey] = [];
    const cart = cartelleMap[file.cartella_id];
    map[file.data][slotKey].push({
      title: file.titolo, time: file.time,
      color: cart?.colore || '#64748b',
    });
  });

  return map;
}

export default function WeekView({ selectedDate, monthColor }) {
  const [userEmail, setUserEmail] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  // Swipe visivo: translateX in px applicato durante il drag
  const [swipeTranslateX, setSwipeTranslateX] = useState(0);
  // Transizione animata dopo rilascio
  const [isTransitioning, setIsTransitioning] = useState(false);

  const scrollRef = useRef(null);
  const touchRef = useRef({
    startX: 0, startY: 0,
    lastX: 0, lastY: 0,
    lastTime: 0,
    velocityX: 0, velocityY: 0,
    scrollStartTop: 0,
    animFrame: null,
    swipeTriggered: false,
    isVerticalScroll: null // null = non determinato, true = scroll ore, false = swipe settimana
  });

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setUserEmail(user?.email);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const slotIndex = now.getHours() * 12 + Math.floor(now.getMinutes() / 5);
      const slotHeight = 26;
      const scrollTo = Math.max(0, (slotIndex - 5) * slotHeight);
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollTo;
      }, 100);
    }
  }, [weekOffset]);

  const SWIPE_THRESHOLD = 60; // px per confermare cambio settimana

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    if (touchRef.current.animFrame) cancelAnimationFrame(touchRef.current.animFrame);
    setIsTransitioning(false);
    touchRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      lastX: touch.clientX,
      lastY: touch.clientY,
      lastTime: Date.now(),
      velocityX: 0,
      velocityY: 0,
      scrollStartTop: scrollRef.current?.scrollTop || 0,
      animFrame: null,
      swipeTriggered: false,
      isVerticalScroll: null
    };
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const t = touchRef.current;
    const now = Date.now();
    const dt = Math.max(1, now - t.lastTime);

    // Delta dal punto iniziale (nel mondo ruotato 90°)
    // clientX del dito → scroll verticale (ore)
    // clientY del dito → swipe orizzontale (settimane)
    const totalDeltaX = Math.abs(touch.clientX - t.startX);
    const totalDeltaY = Math.abs(touch.clientY - t.startY);

    // Determina direzione dominante dopo 10px di movimento
    if (t.isVerticalScroll === null && (totalDeltaX > 10 || totalDeltaY > 10)) {
      t.isVerticalScroll = totalDeltaX > totalDeltaY;
    }

    if (t.isVerticalScroll === true) {
      // Scroll ore (asse X dito → scrollTop)
      const dx = touch.clientX - t.lastX;
      t.velocityX = 0.6 * t.velocityX + 0.4 * (-dx / dt * 16);
      const deltaScroll = t.startX - touch.clientX;
      if (scrollRef.current) {
        scrollRef.current.scrollTop = t.scrollStartTop + deltaScroll;
      }
    } else if (t.isVerticalScroll === false) {
      // Swipe settimana (asse Y dito → translateX visivo)
      const deltaY = touch.clientY - t.startY;
      setSwipeTranslateX(deltaY);
    }

    t.lastX = touch.clientX;
    t.lastY = touch.clientY;
    t.lastTime = now;
  };

  const handleTouchEnd = () => {
    const t = touchRef.current;

    if (t.isVerticalScroll === false) {
      // Swipe settimana: controlla se supera la soglia
      const deltaY = t.lastY - t.startY;
      if (Math.abs(deltaY) > SWIPE_THRESHOLD) {
        // Anima fuori schermo, poi cambia settimana
        const direction = deltaY > 0 ? 1 : -1; // positivo = settimana precedente
        setIsTransitioning(true);
        setSwipeTranslateX(direction * 500); // fuori schermo
        setTimeout(() => {
          setWeekOffset(w => w - direction);
          setSwipeTranslateX(0);
          setIsTransitioning(false);
        }, 200);
      } else {
        // Non abbastanza: torna indietro con animazione
        setIsTransitioning(true);
        setSwipeTranslateX(0);
        setTimeout(() => setIsTransitioning(false), 200);
      }
      return;
    }

    // Inerzia scroll ore
    let velocity = t.velocityX;
    if (Math.abs(velocity) < 0.5) return;
    const friction = 0.95;
    const animate = () => {
      if (Math.abs(velocity) < 0.3 || !scrollRef.current) return;
      scrollRef.current.scrollTop += velocity;
      velocity *= friction;
      touchRef.current.animFrame = requestAnimationFrame(animate);
    };
    touchRef.current.animFrame = requestAnimationFrame(animate);
  };

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

  const itemsByDayTime = buildItemsMap(weekDays, noteSettimana, fileSettimana, cartelleMap);

  const activeColor = monthColor || MONTH_COLORS[offsetDate.getMonth()];
  const nowHour = new Date().getHours();
  const nowMin = Math.floor(new Date().getMinutes() / 5) * 5;
  const nowSlotLabel = `${String(nowHour).padStart(2, '0')}:${String(nowMin).padStart(2, '0')}`;
  const isTodayInWeek = weekDays.some(d => d.getTime() === today.getTime());

  // Stile translateX per swipe visivo (applicato solo alle colonne giorni, non alle ore)
  const swipeStyle = {
    transform: `translateX(${swipeTranslateX}px)`,
    transition: isTransitioning ? 'transform 0.2s ease-out' : 'none',
    opacity: isTransitioning && Math.abs(swipeTranslateX) > 100 ? 0 : 1
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden">
      {/* Navigazione settimana */}
      <div className="flex items-center justify-center gap-2 px-2 py-1 flex-shrink-0 border-b border-slate-800">
        <button onClick={() => setWeekOffset(w => w - 1)} className="p-0.5 rounded hover:bg-slate-700">
          <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
        </button>
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

      {/* AREA TOUCH */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ touchAction: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* HEADER GIORNI — si muove col swipe */}
        <div className="flex flex-shrink-0 border-b border-slate-700 overflow-hidden">
          {/* Colonna ore fissa */}
          <div className="flex-shrink-0" style={{ width: '56px' }} />
          {/* Giorni che si spostano */}
          <div className="flex flex-1" style={swipeStyle}>
            {weekDays.map((day, dayIdx) => {
              const isToday = day.getTime() === today.getTime();
              const isWeekend = dayIdx >= 5;
              return (
                <div
                  key={dayIdx}
                  className={cn(
                    "flex-1 flex flex-col items-center py-0.5 border-l border-slate-700/50",
                    isToday && "bg-slate-800/40"
                  )}
                >
                  <span
                    className="text-[7px] font-semibold leading-tight"
                    style={{ color: isWeekend ? '#ef4444' : (isToday ? activeColor : '#64748b') }}
                  >
                    {DAYS_FULL_IT[dayIdx].substring(0, 3)}
                  </span>
                  <span
                    className={cn("text-[10px] font-bold leading-tight", isToday && "animate-pulse")}
                    style={{ color: isToday ? activeColor : '#e2e8f0' }}
                  >
                    {day.getDate()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CORPO: ore + griglia */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overscroll-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', touchAction: 'none' }}
        >
          {TIME_SLOTS.map((slot) => {
            const isNow = isTodayInWeek && slot.label === nowSlotLabel;
            return (
              <div
                key={slot.label}
                className={cn("flex", slot.isFullHour ? "h-10" : "h-6")}
              >
                {/* Colonna ore — resta ferma */}
                <div className="flex-shrink-0 flex items-center px-1.5" style={{ width: '56px' }}>
                  <div className="flex items-center mr-1.5">
                    <div
                      className={cn("h-[2px] rounded-full flex-shrink-0", isNow && "animate-pulse")}
                      style={{
                        width: slot.isFullHour ? '16px' : '8px',
                        backgroundColor: isNow ? '#ffffff' : (slot.isFullHour ? activeColor : '#475569')
                      }}
                    />
                  </div>
                  <span
                    className={cn(
                      "font-mono text-[10px] flex-shrink-0",
                      slot.isFullHour && "font-bold",
                      isNow && "text-white font-bold animate-pulse"
                    )}
                    style={{ color: isNow ? '#ffffff' : (slot.isFullHour ? activeColor : '#94a3b8') }}
                  >
                    {slot.label}
                  </span>
                </div>

                {/* 7 colonne giorno — si muovono col swipe */}
                <div className="flex flex-1 overflow-hidden" style={swipeStyle}>
                  {weekDays.map((day, dayIdx) => {
                    const dateKey = formatDateKey(day);
                    const isDayToday = day.getTime() === today.getTime();
                    const isNowCell = isDayToday && slot.label === nowSlotLabel;
                    const items = itemsByDayTime[dateKey]?.[slot.label] || [];
                    return (
                      <div
                        key={dayIdx}
                        className={cn(
                          "flex-1 border-l border-slate-700/20 relative",
                          isNowCell && "bg-white/5",
                          isDayToday && "bg-slate-800/20"
                        )}
                      >
                        {isNowCell && (
                          <div className="absolute left-0 right-0 top-0 h-[2px] bg-white animate-pulse z-10" />
                        )}
                        {items.map((item, i) => (
                          <div
                            key={i}
                            className="absolute inset-x-0.5 top-0.5 bottom-0.5 rounded overflow-hidden flex items-center"
                            style={{ backgroundColor: item.color + '30', borderLeft: `2px solid ${item.color}` }}
                          >
                            <span
                              className="text-[7px] font-medium px-0.5 truncate leading-tight"
                              style={{ color: item.color }}
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