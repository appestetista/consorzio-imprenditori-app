import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Plus, FileText, X, ChevronDown, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import DayNotesSummaryPopup from './DayNotesSummaryPopup';

const DAYS_SHORT_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const DAY_LETTERS = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];
const MONTH_COLORS = [
  '#3b82f6','#8b5cf6','#ec4899','#14b8a6','#22c55e','#eab308',
  '#f97316','#ef4444','#06b6d4','#a855f7','#6366f1','#0ea5e9'
];
const MONTHS_IT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

function generateTimeSlots() {
  const slots = [];
  for (let h = 0; h < 24; h++)
    for (let m = 0; m < 60; m += 5)
      slots.push({ hour: h, minute: m, label: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`, isFullHour: m === 0 });
  return slots;
}
const TIME_SLOTS = generateTimeSlots();

function getWeekDays(ref) {
  const d = new Date(ref); const dow = d.getDay();
  const mon = new Date(d); mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1)); mon.setHours(0,0,0,0);
  return Array.from({length:7}, (_,i) => { const x = new Date(mon); x.setDate(mon.getDate()+i); return x; });
}
function fk(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

// Genera N settimane centrate su una data
function generateWeeks(centerDate, count = 53) {
  const weeks = [];
  const half = Math.floor(count / 2);
  const center = getWeekDays(centerDate);
  const centerMon = center[0];
  for (let i = -half; i <= half; i++) {
    const d = new Date(centerMon);
    d.setDate(d.getDate() + i * 7);
    weeks.push(getWeekDays(d));
  }
  return weeks;
}

export default function WeekView({ selectedDate, monthColor, onMonthColorChange, onDateSelect, onSlotClick, onMonthChange, onRegisterMonthSelect, onBackToDaily, allMonthNotes = [] }) {
  const [userEmail, setUserEmail] = useState(null);
  const [viewDate, setViewDate] = useState(() => selectedDate ? new Date(selectedDate) : new Date());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [highlightedDay, setHighlightedDay] = useState(null);
  const [openDropdownDay, setOpenDropdownDay] = useState(null);
  const [strikethroughItems, setStrikethroughItems] = useState({});
  const [daySummaryDate, setDaySummaryDate] = useState(null);
  const [visibleWeekIdx, setVisibleWeekIdx] = useState(null);

  const scrollRef = useRef(null);
  const weekScrollRef = useRef(null);
  const daysBarScrollRef = useRef(null);
  const isSyncingRef = useRef(false);
  const initialScrollDone = useRef(false);

  useEffect(() => { base44.auth.me().then(u => setUserEmail(u?.email)).catch(()=>{}); }, []);

  useEffect(() => {
    if (selectedDate) setViewDate(new Date(selectedDate));
  }, [selectedDate]);

  // Scroll verticale ore all'ora corrente
  useEffect(() => {
    if (!scrollRef.current) return;
    const now = new Date();
    const idx = now.getHours() * 12 + Math.floor(now.getMinutes() / 5);
    setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, (idx - 5) * 26); }, 100);
  }, [viewDate]);

  // Genera settimane
  const allWeeks = React.useMemo(() => generateWeeks(viewDate, 53), []);
  const centerIdx = Math.floor(allWeeks.length / 2);

  // Scroll iniziale al centro
  useEffect(() => {
    if (weekScrollRef.current && !initialScrollDone.current) {
      const container = weekScrollRef.current;
      const weekWidth = container.scrollWidth / allWeeks.length;
      container.scrollLeft = centerIdx * weekWidth;
      initialScrollDone.current = true;
      setVisibleWeekIdx(centerIdx);
    }
  }, [allWeeks.length, centerIdx]);

  // Calcola settimana visibile dallo scroll
  const handleWeekScroll = useCallback(() => {
    if (!weekScrollRef.current || isSyncingRef.current) return;
    const container = weekScrollRef.current;
    const weekWidth = container.scrollWidth / allWeeks.length;
    const idx = Math.round(container.scrollLeft / weekWidth);
    const clampedIdx = Math.max(0, Math.min(allWeeks.length - 1, idx));
    
    if (clampedIdx !== visibleWeekIdx) {
      setVisibleWeekIdx(clampedIdx);
    }

    // Sincronizza barra giorni
    if (daysBarScrollRef.current) {
      isSyncingRef.current = true;
      const week = allWeeks[clampedIdx];
      if (week) {
        const refMonth = week[3].getMonth();
        const refYear = week[3].getFullYear();
        const daysInMonth = new Date(refYear, refMonth + 1, 0).getDate();
        // Trova primo giorno settimana nel mese
        let firstInMonth = -1;
        week.forEach(wd => {
          if (wd.getMonth() === refMonth && wd.getFullYear() === refYear) {
            const d = wd.getDate();
            if (firstInMonth === -1 || d < firstInMonth) firstInMonth = d;
          }
        });
        if (firstInMonth > 0) {
          const itemWidth = 28;
          const barWidth = daysBarScrollRef.current.clientWidth;
          const scrollTarget = (firstInMonth - 1) * itemWidth - (barWidth / 2) + (itemWidth * 3.5);
          daysBarScrollRef.current.scrollLeft = Math.max(0, scrollTarget);
        }
      }
      requestAnimationFrame(() => { isSyncingRef.current = false; });
    }
  }, [allWeeks, visibleWeekIdx]);

  // La settimana attualmente visibile
  const currentWeekIdx = visibleWeekIdx ?? centerIdx;
  const weekDays = allWeeks[currentWeekIdx] || getWeekDays(viewDate);
  const today = new Date(); today.setHours(0,0,0,0);
  const weekMainMonth = weekDays[3].getMonth();
  const ac = MONTH_COLORS[weekMainMonth];

  // Notifica parent
  useEffect(() => { if (onMonthColorChange) onMonthColorChange(ac); }, [ac]);
  useEffect(() => { if (onMonthChange) onMonthChange(weekMainMonth); }, [weekMainMonth]);

  // Registra navigazione mese dal parent
  useEffect(() => {
    if (onRegisterMonthSelect) {
      onRegisterMonthSelect((mIdx) => {
        // Trova la settimana che contiene il 15 del mese
        const targetDate = new Date(weekDays[3].getFullYear(), mIdx, 15);
        const targetWeek = getWeekDays(targetDate);
        const targetMon = targetWeek[0].getTime();
        let bestIdx = centerIdx;
        let bestDist = Infinity;
        allWeeks.forEach((w, i) => {
          const dist = Math.abs(w[0].getTime() - targetMon);
          if (dist < bestDist) { bestDist = dist; bestIdx = i; }
        });
        if (weekScrollRef.current) {
          const weekWidth = weekScrollRef.current.scrollWidth / allWeeks.length;
          weekScrollRef.current.scrollTo({ left: bestIdx * weekWidth, behavior: 'smooth' });
        }
      });
    }
  }, [onRegisterMonthSelect, allWeeks, centerIdx]);

  // Scroll alla settimana corretta quando selectedDate cambia
  useEffect(() => {
    if (!selectedDate || !weekScrollRef.current || !initialScrollDone.current) return;
    const selWeek = getWeekDays(selectedDate);
    const selMon = selWeek[0].getTime();
    let bestIdx = currentWeekIdx;
    let bestDist = Infinity;
    allWeeks.forEach((w, i) => {
      const dist = Math.abs(w[0].getTime() - selMon);
      if (dist < bestDist) { bestDist = dist; bestIdx = i; }
    });
    if (bestIdx !== currentWeekIdx) {
      const weekWidth = weekScrollRef.current.scrollWidth / allWeeks.length;
      weekScrollRef.current.scrollTo({ left: bestIdx * weekWidth, behavior: 'smooth' });
    }
  }, [selectedDate]);

  // Query data
  const s0 = fk(weekDays[0]), s6 = fk(weekDays[6]);
  const { data: notes = [] } = useQuery({
    queryKey: ['note-week', userEmail, s0, s6],
    queryFn: async () => { if (!userEmail) return []; const a = await base44.entities.Nota.filter({ user_email: userEmail }); return a.filter(n => n.data >= s0 && n.data <= s6); },
    enabled: !!userEmail
  });
  const { data: files = [] } = useQuery({
    queryKey: ['file-week', userEmail, s0, s6],
    queryFn: async () => { if (!userEmail) return []; const a = await base44.entities.FileCartella.filter({ user_email: userEmail }); return a.filter(f => f.data >= s0 && f.data <= s6); },
    enabled: !!userEmail
  });
  const { data: cartelle = [] } = useQuery({
    queryKey: ['cartelle', userEmail],
    queryFn: () => base44.entities.Cartella.filter({ user_email: userEmail }),
    enabled: !!userEmail
  });

  const cm = {}; cartelle.forEach(c => { cm[c.id] = c; });
  const items = {};
  const notesByDateAndTime = {};
  weekDays.forEach(d => { items[fk(d)] = {}; });
  notes.forEach(n => {
    if (!n.data || !n.time) return;
    const [h,m] = n.time.split(':').map(Number);
    const sk = `${String(h).padStart(2,'0')}:${String(Math.floor(m/5)*5).padStart(2,'0')}`;
    if (!items[n.data]) items[n.data] = {};
    if (!items[n.data][sk]) items[n.data][sk] = [];
    const noteMonth = parseInt(n.data.split('-')[1]) - 1;
    const noteColor = n.cartella_id && cm[n.cartella_id] ? cm[n.cartella_id].colore : MONTH_COLORS[noteMonth];
    items[n.data][sk].push({ title: n.title, color: noteColor });
    if (!notesByDateAndTime[n.data]) notesByDateAndTime[n.data] = {};
    notesByDateAndTime[n.data][sk] = n;
  });
  files.forEach(f => {
    if (!f.data || !f.time) return;
    const [h,m] = f.time.split(':').map(Number);
    const sk = `${String(h).padStart(2,'0')}:${String(Math.floor(m/5)*5).padStart(2,'0')}`;
    if (!items[f.data]) items[f.data] = {};
    if (!items[f.data][sk]) items[f.data][sk] = [];
    items[f.data][sk].push({ title: f.titolo, color: cm[f.cartella_id]?.colore || '#64748b' });
  });

  const handleSlotClick = (dayStr, timeLabel) => {
    if (selectedSlot?.date === dayStr && selectedSlot?.time === timeLabel) {
      if (onSlotClick) {
        const existingNote = notesByDateAndTime[dayStr]?.[timeLabel] || null;
        onSlotClick({ date: dayStr, time: timeLabel, existingNote });
      }
      return;
    }
    setSelectedSlot({ date: dayStr, time: timeLabel });
    const [y, m, d] = dayStr.split('-').map(Number);
    setHighlightedDay(null);
    if (onDateSelect) {
      const newDate = new Date(y, m - 1, d);
      newDate.setHours(0, 0, 0, 0);
      onDateSelect(newDate);
    }
  };

  const nH = new Date().getHours(), nM = Math.floor(new Date().getMinutes()/5)*5;
  const nowSlot = `${String(nH).padStart(2,'0')}:${String(nM).padStart(2,'0')}`;
  const todayInWeek = weekDays.some(d => d.getTime() === today.getTime());

  const bgStyle = {
    backgroundColor: `color-mix(in srgb, ${ac} 6%, #0f172a)`,
    transition: 'background-color 1.2s ease'
  };

  // Barra giorni del mese
  const refMonth = weekMainMonth;
  const refYear = weekDays[3].getFullYear();
  const daysInMonth = new Date(refYear, refMonth + 1, 0).getDate();

  const noteCountByDay = {};
  allMonthNotes.forEach(n => {
    if (!n.data) return;
    const [y, m, d] = n.data.split('-').map(Number);
    if (y === refYear && (m - 1) === refMonth) {
      noteCountByDay[d] = (noteCountByDay[d] || 0) + 1;
    }
  });

  // Cursore: calcola posizione
  let cursorStartDay = -1, cursorEndDay = -1;
  weekDays.forEach(wd => {
    if (wd.getMonth() === refMonth && wd.getFullYear() === refYear) {
      const d = wd.getDate();
      if (cursorStartDay === -1 || d < cursorStartDay) cursorStartDay = d;
      if (d > cursorEndDay) cursorEndDay = d;
    }
  });

  // Gestisci scroll barra giorni → aggiorna settimana
  const handleDaysBarScroll = useCallback(() => {
    if (!daysBarScrollRef.current || isSyncingRef.current) return;
    // Non sincronizzare indietro, solo utente → settimana
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={bgStyle}>

      {/* Barra pallini giorni del mese */}
      <div className="flex-shrink-0 flex flex-col border-b border-slate-700/30">
        {/* Cursore bianco */}
        <div className="relative" style={{ height: '4px' }}>
          {cursorStartDay > 0 && (() => {
            const dayWidth = 100 / daysInMonth;
            const left = (cursorStartDay - 1) * dayWidth;
            const width = (cursorEndDay - cursorStartDay + 1) * dayWidth;
            return (
              <div
                className="absolute top-0 rounded-full"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  height: '4px',
                  backgroundColor: 'rgba(255,255,255,0.85)',
                  boxShadow: '0 0 8px rgba(255,255,255,0.4)',
                  transition: 'left 0.3s ease, width 0.3s ease'
                }}
              />
            );
          })()}
        </div>
        {/* Giorni scrollabili */}
        <div
          ref={daysBarScrollRef}
          className="flex items-center overflow-x-auto py-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', paddingLeft: '2px', paddingRight: '2px' }}
          onScroll={handleDaysBarScroll}
        >
          {Array.from({ length: daysInMonth }, (_, i) => {
            const dayNum = i + 1;
            const dayDate = new Date(refYear, refMonth, dayNum);
            const dow = dayDate.getDay();
            const isWeekend = dow === 0 || dow === 6;
            const isToday = dayDate.getTime() === today.getTime();
            const isSelected = highlightedDay && highlightedDay.day === dayNum && highlightedDay.month === refMonth && highlightedDay.year === refYear;
            const dayNoteCount = noteCountByDay[dayNum] || 0;
            const isInWeek = weekDays.some(wd => wd.getDate() === dayNum && wd.getMonth() === refMonth && wd.getFullYear() === refYear);
            const isSelectedDay = selectedDate && dayDate.getTime() === new Date(new Date(selectedDate).setHours(0,0,0,0)).getTime();

            return (
              <div
                key={dayNum}
                className="flex flex-col items-center cursor-pointer flex-shrink-0"
                style={{ width: '28px', minWidth: '28px' }}
                onClick={() => {
                  const d = new Date(refYear, refMonth, dayNum);
                  d.setHours(0,0,0,0);
                  setHighlightedDay({ day: dayNum, month: refMonth, year: refYear });
                  setSelectedSlot(null);
                  if (onDateSelect) onDateSelect(d);
                  // Scroll settimana a quella che contiene questo giorno
                  const targetWeek = getWeekDays(d);
                  const targetMon = targetWeek[0].getTime();
                  let bestIdx = currentWeekIdx;
                  let bestDist = Infinity;
                  allWeeks.forEach((w, wi) => {
                    const dist = Math.abs(w[0].getTime() - targetMon);
                    if (dist < bestDist) { bestDist = dist; bestIdx = wi; }
                  });
                  if (weekScrollRef.current) {
                    const weekWidth = weekScrollRef.current.scrollWidth / allWeeks.length;
                    weekScrollRef.current.scrollTo({ left: bestIdx * weekWidth, behavior: 'smooth' });
                  }
                }}
              >
                <div
                  className={cn("rounded-full flex items-center justify-center transition-all", isToday && "animate-pulse")}
                  style={{
                    width: '22px', height: '22px',
                    backgroundColor: isSelectedDay && !isToday ? ac : 'transparent',
                    border: isSelected ? '2px solid #f59e0b' : (isSelectedDay && !isToday ? `2px solid ${ac}` : '1.5px solid transparent'),
                    boxShadow: isSelectedDay && !isToday ? `0 0 8px ${ac}80` : (isSelected ? '0 0 6px #f59e0b80' : undefined)
                  }}
                >
                  <span className={cn("text-[9px] font-bold leading-none", isToday && "animate-pulse")} style={{
                    color: isToday ? '#ffffff' : (isSelectedDay ? '#ffffff' : (isSelected ? '#f59e0b' : (isInWeek ? '#ffffff' : '#64748b')))
                  }}>{dayNum}</span>
                </div>
                <span className={cn("text-[7px] font-bold leading-tight", isToday && "animate-pulse")} style={{
                  color: isWeekend ? '#ef4444' : (isToday ? '#ffffff' : (isSelectedDay ? ac : (isSelected ? '#f59e0b' : (isInWeek ? '#94a3b8' : '#475569'))))
                }}>
                  {isWeekend ? (dow === 6 ? 'S' : 'D') : DAY_LETTERS[dow]}
                </span>
                {dayNoteCount > 0 ? (
                  <span className="text-[9px] font-bold leading-none" style={{ color: '#a3e635' }}>{dayNoteCount}</span>
                ) : (
                  <span className="text-[9px] leading-none" style={{ color: 'transparent' }}>0</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Griglia: header + corpo orari con scroll orizzontale continuo per le settimane */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* HEADER GIORNI — scroll orizzontale sincronizzato */}
        <div className="flex flex-shrink-0 border-b border-slate-700/50 overflow-hidden">
          <div className="flex-shrink-0 flex items-center justify-end" style={{ width: '70px', paddingRight: '8px', borderRight: '2px solid rgba(100,116,139,0.6)' }}>
            {onBackToDaily && (
              <button
                onClick={onBackToDaily}
                className="w-9 h-9 rounded-lg flex items-center justify-center touch-manipulation active:scale-90 transition-all"
                style={{ backgroundColor: '#a3e635', boxShadow: '0 0 10px rgba(163,230,53,0.5)' }}
              >
                <X className="w-4 h-4 text-slate-900" strokeWidth={3} />
              </button>
            )}
          </div>
          {/* Header dei 7 giorni della settimana corrente */}
          <div className="flex flex-1">
            {weekDays.map((day, i) => {
              const isT = day.getTime() === today.getTime();
              const isWe = i >= 5;
              const isSel = selectedDate && day.toDateString() === new Date(selectedDate).toDateString();
              const isHL = highlightedDay && highlightedDay.day === day.getDate() && highlightedDay.month === day.getMonth() && highlightedDay.year === day.getFullYear();
              const dk = fk(day);
              const dayItems = items[dk] || {};
              const dayAllNotes = Object.entries(dayItems).flatMap(([time, arr]) => arr.map(a => ({ ...a, time })));
              const isDropOpen = openDropdownDay === i;
              return (
                <div
                  key={i}
                  className={cn("flex-1 flex border-l border-slate-700/50 relative", isT && "bg-slate-800/40")}
                  style={{ minHeight: '38px', ...(isSel && !isT ? { backgroundColor: ac + '20' } : {}) }}
                >
                  <div
                    className="flex-1 flex flex-col items-center justify-center cursor-pointer z-10 py-0.5"
                    onClick={() => {
                      setHighlightedDay({ day: day.getDate(), month: day.getMonth(), year: day.getFullYear() });
                      setSelectedSlot(null);
                      setOpenDropdownDay(null);
                      if (onDateSelect) onDateSelect(day);
                    }}
                  >
                    <span className={cn("text-[8px] font-bold leading-tight tracking-wide", isT && "animate-pulse")} style={{ color: isWe ? '#ef4444' : (isT ? '#ffffff' : (isHL ? '#f59e0b' : (isSel ? ac : '#94a3b8'))) }}>{DAYS_SHORT_IT[i]}</span>
                    <div
                      className={cn("flex items-center justify-center rounded-full", isT && "animate-pulse")}
                      style={isT ? { width: '18px', height: '18px' } : isHL ? { width: '18px', height: '18px', border: '2px solid #f59e0b', boxShadow: '0 0 6px #f59e0b80' } : isSel ? { width: '18px', height: '18px', backgroundColor: ac, borderRadius: '9999px', boxShadow: `0 0 8px ${ac}80` } : { width: '18px', height: '18px' }}
                    >
                      <span className={cn("text-[10px] font-bold leading-none", isT && "animate-pulse")} style={{ color: isT ? '#ffffff' : (isHL ? '#f59e0b' : (isSel ? '#fff' : '#e2e8f0')) }}>{day.getDate()}</span>
                    </div>
                  </div>

                  <div
                    className="absolute right-0 bottom-0 flex items-center cursor-pointer z-20 touch-manipulation active:scale-90 pb-0.5 pr-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (dayAllNotes.length > 0) { setDaySummaryDate(dk); } else { setOpenDropdownDay(isDropOpen ? null : i); }
                    }}
                  >
                    {dayAllNotes.length > 0 && <span className="text-[10px] font-bold leading-none" style={{ color: '#a3e635' }}>{dayAllNotes.length}</span>}
                    <ChevronDown className={cn("transition-all duration-200", isDropOpen && "rotate-180")} style={{ width: '14px', height: '14px', color: isDropOpen ? '#22d3ee' : (dayAllNotes.length > 0 ? '#a3e635' : '#64748b') }} />
                  </div>

                  {isDropOpen && (
                    <div className="absolute z-50 overflow-hidden" style={{ top: '100%', right: '-4px', minWidth: '160px', maxWidth: '200px', marginTop: '4px' }} onClick={(e) => e.stopPropagation()}>
                      <div className="absolute -top-[6px] right-3 w-0 h-0" style={{ borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '6px solid #000000' }} />
                      <div className="bg-black rounded-xl shadow-2xl overflow-hidden border border-slate-700/50" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                        {dayAllNotes.length === 0 ? (
                          <div className="px-3 py-3 text-[10px] text-slate-500 text-center">Nessun appuntamento</div>
                        ) : (
                          <div className="py-1.5">
                            {dayAllNotes.sort((a, b) => a.time.localeCompare(b.time)).map((item, idx) => {
                              const stKey = `${dk}-${item.time}-${idx}`;
                              const isStruck = !!strikethroughItems[stKey];
                              return (
                                <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-slate-900/50">
                                  <button onClick={(e) => { e.stopPropagation(); setStrikethroughItems(prev => ({ ...prev, [stKey]: !prev[stKey] })); }} className={cn("w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-all", isStruck ? "border-slate-500 bg-slate-700" : "border-slate-600 bg-transparent hover:border-slate-400")}>
                                    {isStruck && <Check className="w-2.5 h-2.5 text-slate-400" />}
                                  </button>
                                  <div className="min-w-0 flex-1">
                                    <span className={cn("text-[11px] font-medium block truncate", isStruck && "line-through opacity-40")} style={{ color: ac }}>— {item.time} {item.title}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* CORPO — scroll ore verticale (nativo) */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-none" style={{ scrollbarWidth:'none', msOverflowStyle:'none', touchAction: 'pan-x' }}>
          {/* Scroll orizzontale continuo per le settimane */}
          <div
            ref={weekScrollRef}
            className="overflow-x-auto"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory' }}
            onScroll={handleWeekScroll}
          >
            <div className="flex" style={{ width: `${allWeeks.length * 100}%` }}>
              {allWeeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex-shrink-0" style={{ width: `${100 / allWeeks.length}%`, scrollSnapAlign: 'start' }}>
                  {TIME_SLOTS.map((slot) => {
                    const isNow = week.some(d => d.getTime() === today.getTime()) && slot.label === nowSlot;
                    return (
                      <div key={slot.label} className={cn("flex", slot.isFullHour ? "h-10" : "h-6")}>
                        {/* Ore — solo per la settimana visibile */}
                        {weekIdx === currentWeekIdx && (() => {
                          const isSlotRow = selectedSlot?.time === slot.label;
                          return (
                            <div className={cn("flex-shrink-0 flex items-center justify-end px-0 sticky left-0 z-10", isSlotRow && "bg-amber-500/10")} style={{ width: '70px', paddingRight: '6px', borderRight: '2px solid rgba(100,116,139,0.6)', backgroundColor: isSlotRow ? undefined : `color-mix(in srgb, ${ac} 6%, #0f172a)` }}>
                              {isSlotRow ? (
                                <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center mr-1 animate-pulse shadow-lg shadow-amber-500/40 flex-shrink-0"><Plus className="w-2.5 h-2.5 text-white" /></div>
                              ) : (
                                <div className="flex items-center mr-1.5"><div className={cn("h-[2px] rounded-full", isNow && "animate-pulse")} style={{ width: slot.isFullHour ? '16px' : '8px', backgroundColor: isNow ? '#fff' : (slot.isFullHour ? ac : '#475569') }} /></div>
                              )}
                              <span className={cn("font-mono text-[10px]", slot.isFullHour && "font-bold", isNow && "text-white font-bold animate-pulse")} style={{ color: isSlotRow ? '#f59e0b' : (isNow ? '#fff' : (slot.isFullHour ? ac : '#94a3b8')) }}>{slot.label}</span>
                            </div>
                          );
                        })()}
                        {weekIdx !== currentWeekIdx && (
                          <div className="flex-shrink-0" style={{ width: '70px' }} />
                        )}
                        {/* 7 colonne giorni */}
                        <div className="flex flex-1">
                          {week.map((day, di) => {
                            const dk = fk(day);
                            const isT = day.getTime() === today.getTime();
                            const isNC = isT && slot.label === nowSlot;
                            const isSel = selectedDate && day.toDateString() === new Date(selectedDate).toDateString();
                            const its = items[dk]?.[slot.label] || [];
                            const isSlotSelected = selectedSlot?.date === dk && selectedSlot?.time === slot.label;
                            return (
                              <div
                                key={di}
                                className={cn("flex-1 border-l border-slate-700/20 relative cursor-pointer", isNC && "bg-white/5", isT && "bg-slate-800/20", isSel && !isT && "bg-slate-700/15", isSlotSelected && "ring-1 ring-amber-500/60")}
                                onClick={() => handleSlotClick(dk, slot.label)}
                              >
                                {isNC && <div className="absolute left-0 right-0 top-0 h-[2px] bg-white animate-pulse z-10" />}
                                {isSlotSelected && its.length === 0 && (
                                  <div className="absolute inset-0 flex items-center justify-center z-10">
                                    <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center animate-pulse shadow-lg shadow-amber-500/40"><Plus className="w-3.5 h-3.5 text-white" /></div>
                                  </div>
                                )}
                                {its.map((it, ii) => (
                                  <div key={ii} className="absolute inset-x-0.5 top-0.5 bottom-0.5 rounded overflow-hidden flex items-center" style={{ backgroundColor: it.color+'30', borderLeft: `2px solid ${it.color}` }}>
                                    <span className="text-[7px] font-medium px-0.5 truncate" style={{ color: it.color }}>{it.title}</span>
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
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Popup riepilogo note del giorno */}
      {daySummaryDate && (
        <DayNotesSummaryPopup
          notes={notes.filter(n => n.data === daySummaryDate)}
          cartelleMap={cm}
          selectedDate={new Date(daySummaryDate + 'T00:00:00')}
          monthColor={ac}
          onClose={() => setDaySummaryDate(null)}
          onNoteClick={(note) => {
            setDaySummaryDate(null);
            if (onSlotClick) {
              const [h, m] = (note.time || '00:00').split(':').map(Number);
              const sk = `${String(h).padStart(2,'0')}:${String(Math.floor(m/5)*5).padStart(2,'0')}`;
              onSlotClick({ date: note.data, time: sk, existingNote: note });
            }
          }}
        />
      )}
    </div>
  );
}