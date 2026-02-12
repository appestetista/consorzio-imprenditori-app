import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const DAYS_SHORT_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

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
        isFullHour: m === 0
      });
    }
  }
  return slots;
}
const TIME_SLOTS = generateTimeSlots();

function getWeekDays(referenceDate) {
  const d = new Date(referenceDate);
  const dow = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    days.push(day);
  }
  return days;
}

function fmtKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getDayOfWeekIdx(date) {
  const d = date.getDay();
  return d === 0 ? 6 : d - 1; // 0=Lun, 6=Dom
}

export default function WeekView({ selectedDate, monthColor }) {
  const [userEmail, setUserEmail] = useState(null);
  // scrollX continuo in px — 0 = settimana corrente centrata
  // ogni "settimana" è larga containerWidth px
  const [scrollX, setScrollX] = useState(0);
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const touchRef = useRef({
    startX: 0, startY: 0,
    lastX: 0, lastY: 0,
    lastTime: 0,
    velocityScroll: 0, velocitySwipe: 0,
    scrollStartTop: 0,
    scrollStartX: 0,
    animFrame: null,
    direction: null // 'scroll' | 'swipe' | null
  });

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setUserEmail(user?.email);
    };
    loadUser();
  }, []);

  // Scroll ore all'ora corrente
  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const slotIndex = now.getHours() * 12 + Math.floor(now.getMinutes() / 5);
      const scrollTo = Math.max(0, (slotIndex - 5) * 26);
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollTo;
      }, 100);
    }
  }, []);

  // Larghezza container per calcoli
  const getContainerWidth = useCallback(() => {
    return containerRef.current?.offsetWidth || 300;
  }, []);

  // Da scrollX ricava weekOffset intero
  const getWeekOffset = useCallback(() => {
    const w = getContainerWidth();
    if (w === 0) return 0;
    return Math.round(scrollX / w);
  }, [scrollX, getContainerWidth]);

  // Snap a settimana più vicina con animazione
  const snapToWeek = useCallback((currentScrollX, velocitySwipe) => {
    const w = getContainerWidth();
    if (w === 0) return;
    
    // Aggiungi impulso dalla velocità
    let projected = currentScrollX + velocitySwipe * 8;
    const targetOffset = Math.round(projected / w);
    const targetX = targetOffset * w;
    
    // Anima con spring
    let current = currentScrollX;
    const animate = () => {
      const diff = targetX - current;
      if (Math.abs(diff) < 0.5) {
        setScrollX(targetX);
        return;
      }
      current += diff * 0.15;
      setScrollX(current);
      touchRef.current.animFrame = requestAnimationFrame(animate);
    };
    touchRef.current.animFrame = requestAnimationFrame(animate);
  }, [getContainerWidth]);

  // Touch — ruotato 90°: clientX dito = scroll ore, clientY dito = swipe settimane
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    if (touchRef.current.animFrame) cancelAnimationFrame(touchRef.current.animFrame);
    touchRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      lastX: touch.clientX,
      lastY: touch.clientY,
      lastTime: Date.now(),
      velocityScroll: 0,
      velocitySwipe: 0,
      scrollStartTop: scrollRef.current?.scrollTop || 0,
      scrollStartX: scrollX,
      animFrame: null,
      direction: null
    };
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const t = touchRef.current;
    const now = Date.now();
    const dt = Math.max(1, now - t.lastTime);

    const totalDX = Math.abs(touch.clientX - t.startX);
    const totalDY = Math.abs(touch.clientY - t.startY);

    // Determina direzione dopo 8px
    if (t.direction === null && (totalDX > 8 || totalDY > 8)) {
      t.direction = totalDX > totalDY ? 'scroll' : 'swipe';
    }

    if (t.direction === 'scroll') {
      // Scroll ore
      const dx = touch.clientX - t.lastX;
      t.velocityScroll = 0.6 * t.velocityScroll + 0.4 * (-dx / dt * 16);
      const delta = t.startX - touch.clientX;
      if (scrollRef.current) {
        scrollRef.current.scrollTop = t.scrollStartTop + delta;
      }
    } else if (t.direction === 'swipe') {
      // Swipe settimane — continuo, segue il dito
      const dy = touch.clientY - t.lastY;
      t.velocitySwipe = 0.6 * t.velocitySwipe + 0.4 * (dy / dt * 16);
      const deltaY = touch.clientY - t.startY;
      setScrollX(t.scrollStartX + deltaY);
    }

    t.lastX = touch.clientX;
    t.lastY = touch.clientY;
    t.lastTime = now;
  };

  const handleTouchEnd = () => {
    const t = touchRef.current;

    if (t.direction === 'swipe') {
      snapToWeek(scrollX, t.velocitySwipe);
      return;
    }

    if (t.direction === 'scroll') {
      let vel = t.velocityScroll;
      if (Math.abs(vel) < 0.5) return;
      const friction = 0.95;
      const animate = () => {
        if (Math.abs(vel) < 0.3 || !scrollRef.current) return;
        scrollRef.current.scrollTop += vel;
        vel *= friction;
        touchRef.current.animFrame = requestAnimationFrame(animate);
      };
      touchRef.current.animFrame = requestAnimationFrame(animate);
    }
  };

  // Calcola le 3 settimane visibili (prev, current, next) per effetto continuo
  const baseDate = selectedDate ? new Date(selectedDate) : new Date();
  const weekOffset = getWeekOffset();
  const containerWidth = getContainerWidth();

  // Fractional offset per posizione intermedia
  const fractionalOffset = containerWidth > 0 ? scrollX / containerWidth : 0;

  // Genera 3 settimane: offset-1, offset, offset+1
  const weeks = [-1, 0, 1].map(delta => {
    const off = weekOffset + delta;
    const d = new Date(baseDate);
    d.setDate(d.getDate() + off * 7);
    return { offset: off, days: getWeekDays(d) };
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Date range per query (copre tutte e 3 le settimane)
  const allDays = weeks.flatMap(w => w.days);
  const startDateStr = fmtKey(allDays[0]);
  const endDateStr = fmtKey(allDays[allDays.length - 1]);

  const { data: noteSettimana = [] } = useQuery({
    queryKey: ['note-week', userEmail, startDateStr, endDateStr],
    queryFn: async () => {
      if (!userEmail) return [];
      const all = await base44.entities.Nota.filter({ user_email: userEmail });
      return all.filter(n => n.data >= startDateStr && n.data <= endDateStr);
    },
    enabled: !!userEmail
  });

  const { data: fileSettimana = [] } = useQuery({
    queryKey: ['file-week', userEmail, startDateStr, endDateStr],
    queryFn: async () => {
      if (!userEmail) return [];
      const all = await base44.entities.FileCartella.filter({ user_email: userEmail });
      return all.filter(f => f.data >= startDateStr && f.data <= endDateStr);
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

  // Mappa items globale
  const itemsByDayTime = {};
  noteSettimana.forEach(nota => {
    if (!nota.data || !nota.time) return;
    const [h, m] = nota.time.split(':').map(Number);
    const sk = `${String(h).padStart(2, '0')}:${String(Math.floor(m / 5) * 5).padStart(2, '0')}`;
    if (!itemsByDayTime[nota.data]) itemsByDayTime[nota.data] = {};
    if (!itemsByDayTime[nota.data][sk]) itemsByDayTime[nota.data][sk] = [];
    itemsByDayTime[nota.data][sk].push({
      title: nota.title,
      color: nota.cartella_id && cartelleMap[nota.cartella_id] ? cartelleMap[nota.cartella_id].colore : '#a3e635',
    });
  });
  fileSettimana.forEach(file => {
    if (!file.data || !file.time) return;
    const [h, m] = file.time.split(':').map(Number);
    const sk = `${String(h).padStart(2, '0')}:${String(Math.floor(m / 5) * 5).padStart(2, '0')}`;
    if (!itemsByDayTime[file.data]) itemsByDayTime[file.data] = {};
    if (!itemsByDayTime[file.data][sk]) itemsByDayTime[file.data][sk] = [];
    const cart = cartelleMap[file.cartella_id];
    itemsByDayTime[file.data][sk].push({
      title: file.titolo,
      color: cart?.colore || '#64748b',
    });
  });

  const activeColor = monthColor || MONTH_COLORS[new Date(baseDate.getTime() + weekOffset * 7 * 86400000).getMonth()];
  const nowH = new Date().getHours();
  const nowM = Math.floor(new Date().getMinutes() / 5) * 5;
  const nowSlot = `${String(nowH).padStart(2, '0')}:${String(nowM).padStart(2, '0')}`;
  const isTodayVisible = allDays.some(d => d.getTime() === today.getTime());

  // Posizione px della strip di settimane: la settimana "weekOffset" è centrata,
  // lo spostamento frazionario è (scrollX - weekOffset * containerWidth)
  const pixelShift = containerWidth > 0 ? scrollX - weekOffset * containerWidth : 0;

  // Barra progresso: posizione del cursore (0-1 nell'anno)
  const currentWeekDate = new Date(baseDate);
  currentWeekDate.setDate(currentWeekDate.getDate() + weekOffset * 7);
  const startOfYear = new Date(currentWeekDate.getFullYear(), 0, 1);
  const endOfYear = new Date(currentWeekDate.getFullYear(), 11, 31);
  const yearProgress = (currentWeekDate - startOfYear) / (endOfYear - startOfYear);

  // Label settimana corrente
  const currentWeekDays = weeks.find(w => w.offset === weekOffset)?.days || weeks[1].days;
  const weekLabel = `${currentWeekDays[0].getDate()}/${currentWeekDays[0].getMonth() + 1} – ${currentWeekDays[6].getDate()}/${currentWeekDays[6].getMonth() + 1}`;

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-slate-900 overflow-hidden">

      {/* Barra cursore settimana + label */}
      <div className="flex-shrink-0 px-3 py-1 border-b border-slate-800">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[9px] text-slate-500 font-medium">{currentWeekDays[0].getFullYear()}</span>
          <span className="text-[10px] font-bold" style={{ color: activeColor }}>{weekLabel}</span>
          {weekOffset !== 0 && (
            <button
              onClick={() => {
                if (touchRef.current.animFrame) cancelAnimationFrame(touchRef.current.animFrame);
                snapToWeek(scrollX, -scrollX * 0.05);
              }}
              className="text-[8px] font-bold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: activeColor, color: '#0f172a' }}
            >
              OGGI
            </button>
          )}
          {weekOffset === 0 && <span className="text-[9px] text-slate-500">•</span>}
        </div>
        {/* Barra slider */}
        <div className="h-1 rounded-full bg-slate-700 relative">
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-lg"
            style={{
              backgroundColor: activeColor,
              left: `${Math.min(100, Math.max(0, yearProgress * 100))}%`,
              transform: 'translate(-50%, -50%)',
              boxShadow: `0 0 6px ${activeColor}66`
            }}
          />
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, Math.max(0, yearProgress * 100))}%`,
              backgroundColor: activeColor + '40'
            }}
          />
        </div>
      </div>

      {/* AREA TOUCH */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ touchAction: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* HEADER GIORNI — strip continua che scorre */}
        <div className="flex flex-shrink-0 border-b border-slate-700 overflow-hidden">
          <div className="flex-shrink-0" style={{ width: '56px' }} />
          <div className="flex-1 relative overflow-hidden" style={{ height: '32px' }}>
            {weeks.map((week) => {
              const offsetPx = (week.offset - weekOffset) * containerWidth + pixelShift;
              return (
                <div
                  key={week.offset}
                  className="absolute top-0 bottom-0 flex"
                  style={{
                    width: `${containerWidth}px`,
                    left: `${offsetPx}px`,
                  }}
                >
                  {week.days.map((day, dayIdx) => {
                    const isToday = day.getTime() === today.getTime();
                    const isWeekend = dayIdx >= 5;
                    return (
                      <div
                        key={dayIdx}
                        className={cn(
                          "flex-1 flex flex-col items-center justify-center border-l border-slate-700/50",
                          isToday && "bg-slate-800/40"
                        )}
                      >
                        <span
                          className="text-[7px] font-semibold leading-tight"
                          style={{ color: isWeekend ? '#ef4444' : (isToday ? activeColor : '#64748b') }}
                        >
                          {DAYS_SHORT_IT[dayIdx]}
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
              );
            })}
          </div>
        </div>

        {/* CORPO ore + griglia */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overscroll-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', touchAction: 'none' }}
        >
          {TIME_SLOTS.map((slot) => {
            const isNow = isTodayVisible && slot.label === nowSlot;
            return (
              <div key={slot.label} className={cn("flex", slot.isFullHour ? "h-10" : "h-6")}>
                {/* Colonna ore fissa */}
                <div className="flex-shrink-0 flex items-center px-1.5" style={{ width: '56px' }}>
                  <div className="flex items-center mr-1.5">
                    <div
                      className={cn("h-[2px] rounded-full flex-shrink-0", isNow && "animate-pulse")}
                      style={{
                        width: slot.isFullHour ? '16px' : '8px',
                        backgroundColor: isNow ? '#fff' : (slot.isFullHour ? activeColor : '#475569')
                      }}
                    />
                  </div>
                  <span
                    className={cn(
                      "font-mono text-[10px] flex-shrink-0",
                      slot.isFullHour && "font-bold",
                      isNow && "text-white font-bold animate-pulse"
                    )}
                    style={{ color: isNow ? '#fff' : (slot.isFullHour ? activeColor : '#94a3b8') }}
                  >
                    {slot.label}
                  </span>
                </div>

                {/* Colonne giorno — strip continua */}
                <div className="flex-1 relative overflow-hidden">
                  {weeks.map((week) => {
                    const offsetPx = (week.offset - weekOffset) * containerWidth + pixelShift;
                    return (
                      <div
                        key={week.offset}
                        className="absolute top-0 bottom-0 flex"
                        style={{
                          width: `${containerWidth}px`,
                          left: `${offsetPx}px`,
                        }}
                      >
                        {week.days.map((day, dayIdx) => {
                          const dk = fmtKey(day);
                          const isDayToday = day.getTime() === today.getTime();
                          const isNowCell = isDayToday && slot.label === nowSlot;
                          const items = itemsByDayTime[dk]?.[slot.label] || [];
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
                                  <span className="text-[7px] font-medium px-0.5 truncate" style={{ color: item.color }}>
                                    {item.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        })}
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