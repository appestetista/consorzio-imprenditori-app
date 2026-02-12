import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Plus, FileText, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const DAYS_SHORT_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const DAY_LETTERS = ['D', 'L', 'M', 'M', 'G', 'V', 'S']; // Dom=0 ... Sab=6
const MONTH_COLORS = [
  '#3b82f6','#8b5cf6','#ec4899','#14b8a6','#22c55e','#eab308',
  '#f97316','#ef4444','#06b6d4','#a855f7','#6366f1','#0ea5e9'
];

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

export default function WeekView({ selectedDate, monthColor, onMonthColorChange, onDateSelect, onSlotClick, onMonthChange, onRegisterMonthSelect }) {
  const [userEmail, setUserEmail] = useState(null);
  // viewDate è la data di riferimento per la settimana visualizzata
  const [viewDate, setViewDate] = useState(() => selectedDate ? new Date(selectedDate) : new Date());
  const [dragX, setDragX] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [highlightedDay, setHighlightedDay] = useState(null); // { day, month, year } — unico giorno con bordo arancione
  
  const scrollRef = useRef(null);
  const touchRef = useRef({ startX:0, startY:0, lastX:0, lastY:0, lastTime:0, velScroll:0, scrollTop0:0, dir:null, animFrame:null });


  useEffect(() => { base44.auth.me().then(u => setUserEmail(u?.email)).catch(()=>{}); }, []);

  // Sync viewDate quando selectedDate cambia dall'esterno (es. dal calendario orizzontale)
  useEffect(() => {
    if (selectedDate) {
      setViewDate(new Date(selectedDate));
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const now = new Date();
    const idx = now.getHours() * 12 + Math.floor(now.getMinutes() / 5);
    setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, (idx - 5) * 26); }, 100);
  }, [viewDate]);

  // Touch gestito SOLO per swipe settimane (asse orizzontale visivo).
  // Lo scroll ore è lasciato al browser nativo (overflow-y-auto).
  // Il parent ha rotate(90deg CW), quindi:
  //   - Visivamente "scorrere ore" = dito su/giù visivo = clientX fisico → lasciato nativo
  //   - Visivamente "swipe settimane" = dito sx/dx visivo = clientY fisico → gestito manualmente
  
  const onTS = (e) => {
    const t = e.touches[0];
    touchRef.current = { startX:t.clientX, startY:t.clientY, dir:null };
    setAnimating(false);
  };

  const onTM = (e) => {
    const t = e.touches[0]; const r = touchRef.current;
    const physDX = Math.abs(t.clientX - r.startX);
    const physDY = Math.abs(t.clientY - r.startY);
    // Decidi direzione solo una volta
    if (!r.dir && (physDX > 10 || physDY > 10)) {
      r.dir = physDY > physDX ? 'swipe' : 'scroll';
    }
    if (r.dir === 'swipe') {
      e.preventDefault(); // blocca solo durante swipe settimane
      setDragX(-(t.clientY - r.startY));
    }
    // se dir === 'scroll' o non deciso → non facciamo nulla, il browser scrolla nativamente
  };

  const onTE = () => {
    const r = touchRef.current;
    if (r.dir === 'swipe') {
      const THRESHOLD = 60;
      if (Math.abs(dragX) > THRESHOLD) {
        const dir = dragX > 0 ? -1 : 1;
        setAnimating(true);
        setDragX(dragX > 0 ? 400 : -400);
        setTimeout(() => {
          setAnimating(false);
          setDragX(0);
          setViewDate(prev => {
            const d = new Date(prev);
            d.setDate(d.getDate() + dir * 7);
            return d;
          });
        }, 280);
      } else {
        setAnimating(true);
        setDragX(0);
        setTimeout(() => setAnimating(false), 280);
      }
    }
  };

  const weekDays = getWeekDays(viewDate);
  const today = new Date(); today.setHours(0,0,0,0);
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
  // Mappa note per data per accesso diretto (per NoteEditor existingNote)
  const notesByDateAndTime = {};
  weekDays.forEach(d => { items[fk(d)] = {}; });
  notes.forEach(n => {
    if (!n.data || !n.time) return;
    const [h,m] = n.time.split(':').map(Number);
    const sk = `${String(h).padStart(2,'0')}:${String(Math.floor(m/5)*5).padStart(2,'0')}`;
    if (!items[n.data]) items[n.data] = {};
    if (!items[n.data][sk]) items[n.data][sk] = [];
    items[n.data][sk].push({ title: n.title, color: n.cartella_id && cm[n.cartella_id] ? cm[n.cartella_id].colore : '#a3e635' });
    // Mappa per NoteEditor
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
    // Se clicco sullo stesso slot già selezionato: apri la nota (secondo tap)
    if (selectedSlot?.date === dayStr && selectedSlot?.time === timeLabel) {
      if (onSlotClick) {
        const existingNote = notesByDateAndTime[dayStr]?.[timeLabel] || null;
        onSlotClick({ date: dayStr, time: timeLabel, existingNote });
      }
      return;
    }
    // Primo tap: evidenzia slot + aggiorna il pallino arancione nella barra mese
    setSelectedSlot({ date: dayStr, time: timeLabel });
    const [y, m, d] = dayStr.split('-').map(Number);
    setHighlightedDay({ day: d, month: m - 1, year: y });
  };

  // Colore basato sul mese della settimana visualizzata (mese del giovedì = mese predominante)
  const weekMainMonth = weekDays[3].getMonth();
  const ac = MONTH_COLORS[weekMainMonth];

  // Notifica il colore mese al parent quando cambia
  useEffect(() => {
    if (onMonthColorChange) onMonthColorChange(ac);
  }, [ac, onMonthColorChange]);

  // Notifica il mese corrente al parent
  useEffect(() => {
    if (onMonthChange) onMonthChange(weekMainMonth);
  }, [weekMainMonth, onMonthChange]);

  // Registra funzione per permettere al parent di cambiare mese
  useEffect(() => {
    if (onRegisterMonthSelect) {
      onRegisterMonthSelect((mIdx) => {
        const y = weekDays[3].getFullYear();
        // Usa il 15 del mese per garantire che il giovedì della settimana cada nel mese corretto
        setViewDate(new Date(y, mIdx, 15));
      });
    }
  }, [onRegisterMonthSelect]);
  const nH = new Date().getHours(), nM = Math.floor(new Date().getMinutes()/5)*5;
  const nowSlot = `${String(nH).padStart(2,'0')}:${String(nM).padStart(2,'0')}`;
  const todayInWeek = weekDays.some(d => d.getTime() === today.getTime());

  const MONTHS_IT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

  // Stile swipe per le colonne giorni
  const swipeStyle = {
    transform: `translateX(${dragX}px)`,
    transition: animating ? 'transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.28s ease' : 'none',
    opacity: animating && Math.abs(dragX) > 200 ? 0 : 1,
  };

  // Background stile vista giornaliera
  const bgStyle = {
    backgroundColor: `color-mix(in srgb, ${ac} 6%, #0f172a)`,
    transition: 'background-color 1.2s ease'
  };

  // Il mese si aggiorna automaticamente in base alla settimana visualizzata (weekMainMonth)

  return (
    <div className="flex flex-col h-full overflow-hidden" style={bgStyle}>


        {/* Barra pallini giorni del mese */}
        {(() => {
          const refMonth = weekMainMonth;
          const refYear = weekDays[3].getFullYear();
          const daysInMonth = new Date(refYear, refMonth + 1, 0).getDate();
          // Giorno dello slot selezionato (tap su orario nel calendario → cerchio arancione)
          const slotDayNum = (() => {
            if (!selectedSlot?.date) return null;
            const [y, m, d] = selectedSlot.date.split('-').map(Number);
            if (m - 1 === refMonth && y === refYear) return d;
            return null;
          })();
          
          return (
            <div className="flex-shrink-0 flex items-center px-0.5 py-1.5 border-b border-slate-700/30">
              {Array.from({ length: daysInMonth }, (_, i) => {
                const dayNum = i + 1;
                const dayDate = new Date(refYear, refMonth, dayNum);
                const dow = dayDate.getDay();
                const isWeekend = dow === 0 || dow === 6;
                const isToday = dayDate.getTime() === today.getTime();
                const isSlotDay = dayNum === slotDayNum;
                
                // Oggi → pieno col colore mese; tutto il resto (slot, bar, click) → solo bordo arancione, mai pieno
                const isSelected = isSlotDay || (selectedDayInBar && selectedDayInBar.day === dayNum && selectedDayInBar.month === refMonth && selectedDayInBar.year === refYear);

                return (
                  <div 
                    key={dayNum} 
                    className="flex flex-col items-center cursor-pointer"
                    style={{ flex: '1 1 0%', minWidth: 0 }}
                    onClick={() => {
                      const d = new Date(refYear, refMonth, dayNum);
                      d.setHours(0,0,0,0);
                      setSelectedDayInBar({ day: dayNum, month: refMonth, year: refYear });
                      setViewDate(d);
                      if (onDateSelect) onDateSelect(d);
                    }}
                  >
                    {(() => {
                      // Oggi: pieno col colore mese
                      // Selezionato (bar o slot): bordo arancione, sfondo trasparente
                      // Default: bordo tenue colore mese
                      const bgColor = isToday ? ac : 'transparent';
                      const borderColor = isSelected ? '#f59e0b' : (isToday ? ac : (isWeekend ? '#ef444450' : ac + '40'));
                      const borderWidth = isSelected ? '2px' : (isToday ? '2px' : '1.5px');
                      const numColor = isToday ? '#ffffff' : (isSelected ? '#f59e0b' : '#e2e8f0');
                      const letterColor = isWeekend ? '#ef4444' : (isToday ? ac : (isSelected ? '#f59e0b' : '#64748b'));
                      return (
                        <>
                          <div 
                            className="rounded-full flex items-center justify-center transition-all"
                            style={{ 
                              width: '22px',
                              height: '22px',
                              backgroundColor: bgColor,
                              border: `${borderWidth} solid ${borderColor}`,
                              boxShadow: isToday ? `0 0 8px ${ac}80` : (isSelected ? `0 0 6px #f59e0b80` : undefined)
                            }}
                          >
                            <span className="text-[8px] font-bold leading-none" style={{ color: numColor }}>
                              {dayNum}
                            </span>
                          </div>
                          <span className="text-[7px] font-bold leading-tight mt-[2px]" style={{ color: letterColor }}>
                            {isWeekend ? (dow === 6 ? 'S' : 'D') : DAY_LETTERS[dow]}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* AREA TOUCH — griglia ore (nativo) + swipe settimane (manuale) */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ touchAction: 'pan-x' }} onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}>

          {/* HEADER GIORNI */}
          <div className="flex flex-shrink-0 border-b border-slate-700/50 overflow-hidden">
            <div className="flex-shrink-0" style={{ width: '56px' }} />
            <div className="flex flex-1" style={swipeStyle}>
              {weekDays.map((day, i) => {
                const isT = day.getTime() === today.getTime();
                const isWe = i >= 5;
                const isSel = selectedDate && day.toDateString() === new Date(selectedDate).toDateString();
                return (
                  <div 
                    key={i} 
                    className={cn("flex-1 flex flex-col items-center py-0.5 border-l border-slate-700/50 cursor-pointer", isT && "bg-slate-800/40")}
                    onClick={() => onDateSelect && onDateSelect(day)}
                    style={isSel && !isT ? { backgroundColor: ac + '20' } : undefined}
                  >
                    <span className="text-[7px] font-semibold leading-tight" style={{ color: isWe ? '#ef4444' : (isSel ? ac : (isT ? ac : '#64748b')) }}>{DAYS_SHORT_IT[i]}</span>
                    <span className={cn("text-[10px] font-bold leading-tight", isT && "animate-pulse")} style={{ color: isSel || isT ? ac : '#e2e8f0' }}>{day.getDate()}</span>
                    {isSel && !isT && <div className="w-1 h-1 rounded-full mt-0.5" style={{ backgroundColor: ac }} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* CORPO — scroll ore nativo (il CSS rotate fa sì che pan-x = scroll verticale visivo) */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-none"
            style={{ scrollbarWidth:'none', msOverflowStyle:'none', touchAction: 'pan-x' }}
          >
            {TIME_SLOTS.map((slot) => {
              const isNow = todayInWeek && slot.label === nowSlot;
              return (
                <div key={slot.label} className={cn("flex", slot.isFullHour ? "h-10" : "h-6")}>
                  {/* Ore fisse - evidenzia se lo slot selezionato è su questa riga */}
                  {(() => {
                    const isSlotRow = selectedSlot?.time === slot.label;
                    return (
                      <div className={cn("flex-shrink-0 flex items-center px-1.5", isSlotRow && "bg-amber-500/10")} style={{ width: '56px' }}>
                        {isSlotRow ? (
                          <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center mr-1 animate-pulse shadow-lg shadow-amber-500/40 flex-shrink-0">
                            <Plus className="w-2.5 h-2.5 text-white" />
                          </div>
                        ) : (
                          <div className="flex items-center mr-1.5">
                            <div className={cn("h-[2px] rounded-full", isNow && "animate-pulse")} style={{ width: slot.isFullHour ? '16px' : '8px', backgroundColor: isNow ? '#fff' : (slot.isFullHour ? ac : '#475569') }} />
                          </div>
                        )}
                        <span className={cn("font-mono text-[10px]", slot.isFullHour && "font-bold", isNow && "text-white font-bold animate-pulse")} style={{ color: isSlotRow ? '#f59e0b' : (isNow ? '#fff' : (slot.isFullHour ? ac : '#94a3b8')) }}>{slot.label}</span>
                      </div>
                    );
                  })()}
                  {/* Giorni — si spostano col swipe */}
                  <div className="flex flex-1 overflow-hidden" style={swipeStyle}>
                    {weekDays.map((day, di) => {
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
                          {/* Pallino + giallo se selezionato e vuoto */}
                          {isSlotSelected && its.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center z-10">
                              <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center animate-pulse shadow-lg shadow-amber-500/40">
                                <Plus className="w-3.5 h-3.5 text-white" />
                              </div>
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
        </div>
    </div>
  );
}