import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Plus, FileText, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const DAYS_SHORT_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
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

export default function WeekView({ selectedDate, monthColor, onMonthColorChange, onDateSelect, onSlotClick }) {
  const [userEmail, setUserEmail] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null); // per evidenziazione visiva
  const scrollRef = useRef(null);
  const touchRef = useRef({ startX:0, startY:0, lastX:0, lastY:0, lastTime:0, velScroll:0, scrollTop0:0, dir:null, animFrame:null });

  useEffect(() => { base44.auth.me().then(u => setUserEmail(u?.email)).catch(()=>{}); }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    const now = new Date();
    const idx = now.getHours() * 12 + Math.floor(now.getMinutes() / 5);
    setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, (idx - 5) * 26); }, 100);
  }, [weekOffset]);

  // Touch — il contenuto è ruotato 90° CW con CSS transform.
  // Fisicamente: dito su/giù → clientY cambia, ma nel mondo ruotato questo corrisponde all'asse orizzontale (giorni/swipe)
  // Fisicamente: dito sinistra/destra → clientX cambia, ma nel mondo ruotato questo corrisponde all'asse verticale (scroll ore)
  // Quindi: clientX → scroll ore (verticale visivo), clientY → swipe settimane (orizzontale visivo)
  const onTS = (e) => {
    const t = e.touches[0];
    if (touchRef.current.animFrame) cancelAnimationFrame(touchRef.current.animFrame);
    setAnimating(false);
    touchRef.current = { startX:t.clientX, startY:t.clientY, lastX:t.clientX, lastY:t.clientY, lastTime:Date.now(), velScroll:0, scrollTop0:scrollRef.current?.scrollTop||0, dir:null, animFrame:null };
  };

  const onTM = (e) => {
    e.preventDefault();
    const t = e.touches[0]; const r = touchRef.current; const now = Date.now(); const dt = Math.max(1, now - r.lastTime);
    const tdx = Math.abs(t.clientX - r.startX), tdy = Math.abs(t.clientY - r.startY);
    if (!r.dir && (tdx > 8 || tdy > 8)) r.dir = tdx > tdy ? 'v' : 'h';

    if (r.dir === 'v') {
      // clientX cambia (dito sx/dx fisico) → scroll ore nel mondo ruotato
      // Dito verso DESTRA fisico (clientX+) = numeri salgono = scrollTop DIMINUISCE
      const dx = t.clientX - r.lastX;
      r.velScroll = 0.6 * r.velScroll + 0.4 * (dx / dt * 16);
      if (scrollRef.current) scrollRef.current.scrollTop = r.scrollTop0 - (t.clientX - r.startX);
    } else if (r.dir === 'h') {
      // clientY cambia (dito su/giù fisico) → swipe settimane nel mondo ruotato
      setDragX(t.clientY - r.startY);
    }
    r.lastX = t.clientX; r.lastY = t.clientY; r.lastTime = now;
  };

  const onTE = () => {
    const r = touchRef.current;
    if (r.dir === 'h') {
      const THRESHOLD = 60;
      if (Math.abs(dragX) > THRESHOLD) {
        const dir = dragX > 0 ? -1 : 1;
        setAnimating(true);
        setDragX(dragX > 0 ? 400 : -400);
        setTimeout(() => {
          setAnimating(false);
          setDragX(0);
          setWeekOffset(w => w + dir);
        }, 280);
      } else {
        setAnimating(true);
        setDragX(0);
        setTimeout(() => setAnimating(false), 280);
      }
      return;
    }
    if (r.dir === 'v') {
      let v = r.velScroll; if (Math.abs(v) < 0.5) return;
      const f = 0.95;
      const anim = () => { if (Math.abs(v) < 0.3 || !scrollRef.current) return; scrollRef.current.scrollTop += v; v *= f; touchRef.current.animFrame = requestAnimationFrame(anim); };
      touchRef.current.animFrame = requestAnimationFrame(anim);
    }
  };

  const base = selectedDate ? new Date(selectedDate) : new Date();
  const off = new Date(base); off.setDate(off.getDate() + weekOffset * 7);
  const weekDays = getWeekDays(off);
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
    // Primo tap: solo evidenzia il punto giallo + evidenzia l'orario
    setSelectedSlot({ date: dayStr, time: timeLabel });
  };

  // Colore basato sul mese della settimana visualizzata (mese del giovedì = mese predominante)
  const weekMainMonth = weekDays[3].getMonth();
  const ac = MONTH_COLORS[weekMainMonth];

  // Notifica il colore mese al parent quando cambia
  useEffect(() => {
    if (onMonthColorChange) onMonthColorChange(ac);
  }, [ac, onMonthColorChange]);
  const nH = new Date().getHours(), nM = Math.floor(new Date().getMinutes()/5)*5;
  const nowSlot = `${String(nH).padStart(2,'0')}:${String(nM).padStart(2,'0')}`;
  const todayInWeek = weekDays.some(d => d.getTime() === today.getTime());

  // Label mese
  const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  const wLabel = `${MONTHS_IT[weekMainMonth]} ${weekDays[3].getFullYear()}`;

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

  return (
    <div className="flex flex-col h-full overflow-hidden" style={bgStyle}>
        {/* Label mese + pulsante oggi */}
        <div className="flex-shrink-0 flex items-center justify-center gap-3 px-2 py-1 border-b border-slate-700/50">
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: ac }}>{wLabel}</span>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: ac, color: '#0f172a' }}>
              OGGI
            </button>
          )}
        </div>

        {/* AREA TOUCH */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ touchAction: 'none' }} onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}>

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

          {/* CORPO */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-none" style={{ scrollbarWidth:'none', msOverflowStyle:'none', touchAction:'none' }}>
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