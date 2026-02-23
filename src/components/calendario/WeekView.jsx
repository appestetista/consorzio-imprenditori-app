import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Plus, X, ChevronDown, ChevronLeft, ChevronRight, Check, FileText, CalendarPlus, StickyNote } from 'lucide-react';
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
const ITEM_W = 36;

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

// Genera il nastro continuo di giorni per un anno intero (gen-dic)
function generateYearDays(year) {
  const days = [];
  for (let m = 0; m < 12; m++) {
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(year, m, d));
    }
  }
  return days;
}

export default function WeekView({ selectedDate, monthColor, onMonthColorChange, onDateSelect, onSlotClick, onMonthChange, onRegisterMonthSelect, onBackToDaily, allMonthNotes = [], initialVisibleDay, initialVisibleMonth, initialVisibleYear, navigateToSlot, onNavigateToSlotDone, onFocusedMonthChange, onDaySummaryRequest }) {
  const [userEmail, setUserEmail] = useState(null);
  const [viewDate, setViewDate] = useState(() => selectedDate ? new Date(selectedDate) : new Date());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [highlightedDay, setHighlightedDay] = useState(null);
  const [openDropdownDay, setOpenDropdownDay] = useState(null);
  const [strikethroughItems, setStrikethroughItems] = useState({});
  
  const [slotMenuPos, setSlotMenuPos] = useState(null); // { date, time, x, y }
  const [expandedDayIdx, setExpandedDayIdx] = useState(null); // indice 0-6 della colonna giorno espansa
  const [previewNote, setPreviewNote] = useState(null); // { note, date, time, rect } — anteprima nota inline
  const [focusedDay, setFocusedDay] = useState(null); // "YYYY-MM-DD" — giorno evidenziato da navigazione popup, gli altri diventano grigi
  const [focusedMonth, setFocusedMonth] = useState(null); // indice mese evidenziato (0-11) quando focusedDay è attivo
  const focusedDayRef = useRef(null); // ref mirror per evitare stale closure in scroll handler
  const focusLockRef = useRef(false); // focus lock: quando true, handleRibbonScroll è bloccato. Si sblocca SOLO su interazione manuale utente.
  const clickLockRef = useRef(false); // lock temporaneo durante handleDayClick per evitare che lo smooth scroll sovrascriva la settimana
  const [showScrollArrows, setShowScrollArrows] = useState(false); // frecce laterali nel nastro durante focus
  // La settimana visualizzata (derivata dal giorno centrale visibile nel nastro)
  const [currentWeekDays, setCurrentWeekDays] = useState(() => getWeekDays(selectedDate || new Date()));
  // Cursore: posizione px nel nastro
  const [cursorLeft, setCursorLeft] = useState(0);
  const [cursorWidth, setCursorWidth] = useState(0);

  const scrollRef = useRef(null); // scroll verticale ore
  const ribbonRef = useRef(null); // scroll orizzontale nastro giorni
  const initialScrollDone = useRef(false);
  const skipAutoScrollToNow = useRef(false); // flag per evitare che lo scroll automatico all'ora corrente sovrascriva la navigazione
  const pendingScrollToSlot = useRef(null); // { h, m } — scroll verticale pendente da applicare dopo render

  const today = new Date(); today.setHours(0,0,0,0);
  const displayYear = viewDate.getFullYear();
  const yearDays = React.useMemo(() => generateYearDays(displayYear), [displayYear]);

  useEffect(() => { base44.auth.me().then(u => setUserEmail(u?.email)).catch(()=>{}); }, []);

  useEffect(() => {
    if (selectedDate) setViewDate(new Date(selectedDate));
  }, [selectedDate]);

  function getDayOfYear(date, year) {
    if (date.getFullYear() !== year) return -1;
    let count = 0;
    for (let m = 0; m < date.getMonth(); m++) {
      count += new Date(year, m + 1, 0).getDate();
    }
    return count + date.getDate() - 1;
  }

  // === UNICA FUNZIONE DI CENTRATURA ===
  // Calcola la posizione X del centro del mese nella MonthBar per un dato giorno.
  // MonthBar layout: pl-3 (12px) + 12 flex-1 items. Il ribbon ha la stessa larghezza.
  // Allineiamo il giorno del ribbon al centro del suo mese nella MonthBar.
  const getMonthCenterX = useCallback((date) => {
    if (!ribbonRef.current) return null;
    const barWidth = ribbonRef.current.clientWidth;
    const paddingLeft = 12; // pl-3
    const slotWidth = (barWidth - paddingLeft) / 12;
    const monthIdx = date.getMonth();
    return paddingLeft + slotWidth * monthIdx + slotWidth / 2;
  }, []);

  // Scrolla il nastro posizionando il giorno target esattamente sotto il centro del suo mese nella MonthBar
  const scrollRibbonToDate = useCallback((date, smooth = true) => {
    if (!ribbonRef.current) return;
    const dayIdx = getDayOfYear(date, displayYear);
    if (dayIdx < 0) return;
    const monthCenterX = getMonthCenterX(date);
    if (monthCenterX === null) return;
    const dayCenter = dayIdx * ITEM_W + ITEM_W / 2;
    const targetScrollLeft = dayCenter - monthCenterX;
    if (smooth) {
      ribbonRef.current.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
    } else {
      ribbonRef.current.scrollLeft = targetScrollLeft;
    }
  }, [displayYear, getMonthCenterX]);

  // Scroll verticale ore all'ora corrente — solo se NON stiamo navigando a uno slot specifico
  useEffect(() => {
    if (!scrollRef.current) return;
    if (skipAutoScrollToNow.current) {
      skipAutoScrollToNow.current = false;
      return;
    }
    const now = new Date();
    const idx = now.getHours() * 12 + Math.floor(now.getMinutes() / 5);
    if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, (idx - 5) * 26);
  }, [currentWeekDays]);

  // Resetta lo scroll iniziale ogni volta che cambiano i props visibili dalla giornaliera
  const prevInitialMonth = useRef(initialVisibleMonth);
  const prevInitialYear = useRef(initialVisibleYear);
  useEffect(() => {
    if (prevInitialMonth.current !== initialVisibleMonth || prevInitialYear.current !== initialVisibleYear) {
      initialScrollDone.current = false;
      prevInitialMonth.current = initialVisibleMonth;
      prevInitialYear.current = initialVisibleYear;
    }
  }, [initialVisibleMonth, initialVisibleYear]);

  // Scroll iniziale del nastro al giorno visibile nella vista giornaliera
  // useLayoutEffect per evitare il "bank" visivo: centra PRIMA del paint
  useLayoutEffect(() => {
    if (!ribbonRef.current || initialScrollDone.current) return;
    // Se il container non ha ancora dimensioni (transizione CSS in corso), ritenta al prossimo render
    if (ribbonRef.current.clientWidth === 0) return;
    let targetDate;
    if (initialVisibleDay && initialVisibleMonth !== undefined && initialVisibleYear) {
      targetDate = new Date(initialVisibleYear, initialVisibleMonth, initialVisibleDay);
    } else if (initialVisibleMonth !== undefined && initialVisibleYear) {
      targetDate = new Date(initialVisibleYear, initialVisibleMonth, 15);
    } else if (selectedDate) {
      targetDate = new Date(selectedDate);
    } else {
      targetDate = today;
    }
    scrollRibbonToDate(targetDate, false);
    const newWeek = getWeekDays(targetDate);
    setCurrentWeekDays(newWeek);
    updateCursorPosition(newWeek);
    // Scroll verticale all'ora corrente (sincrono, prima del paint)
    if (scrollRef.current) {
      const now = new Date();
      const idx = now.getHours() * 12 + Math.floor(now.getMinutes() / 5);
      scrollRef.current.scrollTop = Math.max(0, (idx - 5) * 26);
    }
    initialScrollDone.current = true;
  }, [yearDays, initialVisibleMonth, initialVisibleYear, scrollRibbonToDate]);

  // Sblocca focus lock su interazione manuale dell'utente sul nastro
  const handleUserInteraction = useCallback(() => {
    setExpandedDayIdx(null); // Chiudi espansione quando l'utente naviga
    if (showScrollArrows) setShowScrollArrows(false);
    if (focusLockRef.current) {
      focusLockRef.current = false;
      setFocusedDay(null);
      setFocusedMonth(null);
      focusedDayRef.current = null;
      if (onFocusedMonthChange) onFocusedMonthChange(null);
    }
  }, [onFocusedMonthChange, showScrollArrows]);

  // Quando il nastro scrolla, determina il giorno sotto il centro del mese corrente e aggiorna la settimana
  const handleRibbonScroll = useCallback(() => {
    if (!ribbonRef.current) return;
    // NON nascondere frecce durante click lock (scroll programmatico da handleDayClick)
    if (!clickLockRef.current) setShowScrollArrows(false);
    if (focusLockRef.current) return;
    if (clickLockRef.current) return; // blocca durante smooth scroll da handleDayClick

    const scrollLeft = ribbonRef.current.scrollLeft;
    const barWidth = ribbonRef.current.clientWidth;
    // Usa il centro dello schermo come riferimento (barWidth/2)
    const centerOffset = scrollLeft + barWidth / 2;
    const centerIdx = Math.floor(centerOffset / ITEM_W);
    const clampedIdx = Math.max(0, Math.min(yearDays.length - 1, centerIdx));
    const centerDate = yearDays[clampedIdx];
    if (!centerDate) return;

    const newWeek = getWeekDays(centerDate);
    setCurrentWeekDays(prev => {
      if (prev[0].getTime() !== newWeek[0].getTime()) return newWeek;
      return prev;
    });
    updateCursorPosition(newWeek);
  }, [yearDays]);

  const updateCursorPosition = useCallback((week) => {
    if (!ribbonRef.current) return;
    // Trova indice del primo e ultimo giorno della settimana nel nastro
    const firstDay = week[0];
    const lastDay = week[6];
    const firstIdx = getDayOfYear(firstDay, displayYear);
    const lastIdx = getDayOfYear(lastDay, displayYear);
    
    if (firstIdx >= 0 && lastIdx >= 0) {
      // Posizione assoluta nel nastro (non relativa allo scroll)
      const left = firstIdx * ITEM_W;
      const width = (lastIdx - firstIdx + 1) * ITEM_W;
      setCursorLeft(left);
      setCursorWidth(width);
    } else if (firstIdx >= 0) {
      // Settimana a cavallo di anno — mostra solo i giorni nell'anno corrente
      const lastInYear = yearDays.length - 1;
      const left = firstIdx * ITEM_W;
      const width = (lastInYear - firstIdx + 1) * ITEM_W;
      setCursorLeft(left);
      setCursorWidth(width);
    } else if (lastIdx >= 0) {
      setCursorLeft(0);
      setCursorWidth((lastIdx + 1) * ITEM_W);
    }
  }, [displayYear, yearDays.length]);

  // Aggiorna cursore iniziale
  useEffect(() => {
    updateCursorPosition(currentWeekDays);
  }, [currentWeekDays, updateCursorPosition]);

  const weekDays = currentWeekDays;
  const weekMainMonth = weekDays[3].getMonth();
  const ac = MONTH_COLORS[weekMainMonth];

  // Notifica parent
  useEffect(() => { if (onMonthColorChange) onMonthColorChange(ac); }, [ac]);
  useEffect(() => { if (onMonthChange) onMonthChange(weekMainMonth); }, [weekMainMonth]);

  // Registra navigazione mese dal parent (MonthBar click)
  useEffect(() => {
    if (onRegisterMonthSelect) {
      onRegisterMonthSelect((mIdx) => {
        if (!ribbonRef.current) return;
        const targetDate = new Date(displayYear, mIdx, 15);
        // Forza aggiornamento settimana immediatamente (non aspettare lo scroll asincrono)
        const newWeek = getWeekDays(targetDate);
        setCurrentWeekDays(newWeek);
        updateCursorPosition(newWeek);
        setHighlightedDay(null);
        setSelectedSlot(null);
        setExpandedDayIdx(null);
        if (onDateSelect) onDateSelect(targetDate);
        // Poi scrolla il nastro smooth
        scrollRibbonToDate(targetDate, true);
      });
    }
  }, [onRegisterMonthSelect, displayYear, scrollRibbonToDate, updateCursorPosition, onDateSelect]);

  // Quando cliccano un giorno nel nastro, aggiorna la settimana e scrolla
  const handleDayClick = useCallback((date) => {
    // Blocca PRIMA di tutto per evitare race condition con onScroll
    clickLockRef.current = true;
    
    setHighlightedDay({ day: date.getDate(), month: date.getMonth(), year: date.getFullYear() });
    setSelectedSlot(null);
    
    // Forza aggiornamento settimana al giorno cliccato
    const newWeek = getWeekDays(date);
    setCurrentWeekDays(newWeek);
    updateCursorPosition(newWeek);
    
    // Espandi subito la colonna del giorno cliccato
    const dayIdx = newWeek.findIndex(wd => wd.getDate() === date.getDate() && wd.getMonth() === date.getMonth() && wd.getFullYear() === date.getFullYear());
    if (dayIdx >= 0) setExpandedDayIdx(dayIdx);
    
    // Mostra frecce scroll laterali (si dissolveranno quando l'utente scrolla)
    setShowScrollArrows(true);
    
    // Scrolla il nastro — NON smooth, istantaneo, per evitare che eventi scroll intermedi sovrascrivano la settimana
    scrollRibbonToDate(date, false);
    
    // Notifica parent DOPO aver impostato tutto
    if (onDateSelect) onDateSelect(date);
    
    // Sblocca dopo un frame per sicurezza
    requestAnimationFrame(() => { clickLockRef.current = false; });
  }, [onDateSelect, displayYear, updateCursorPosition, scrollRibbonToDate]);

  // Quando selectedDate cambia dall'esterno, scrolla il nastro a quel giorno
  // MA NON durante focus lock (navigazione da popup)
  useEffect(() => {
    if (!selectedDate || !ribbonRef.current || !initialScrollDone.current) return;
    if (focusLockRef.current) return;
    const d = new Date(selectedDate);
    const dayIdx = getDayOfYear(d, displayYear);
    if (dayIdx >= 0) {
      const monthCenterX = getMonthCenterX(d);
      if (monthCenterX === null) return;
      const dayCenter = dayIdx * ITEM_W + ITEM_W / 2;
      const targetScrollLeft = dayCenter - monthCenterX;
      const currentScrollLeft = ribbonRef.current.scrollLeft;
      if (Math.abs(currentScrollLeft - targetScrollLeft) > 50) {
        ribbonRef.current.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
      }
    }
  }, [selectedDate, displayYear, getMonthCenterX]);

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
    const noteColor = MONTH_COLORS[noteMonth];
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

  // Conteggio note per giorno (tutto l'anno, per pallini)
  const noteCountByDayKey = {};
  allMonthNotes.forEach(n => {
    if (!n.data) return;
    noteCountByDayKey[n.data] = (noteCountByDayKey[n.data] || 0) + 1;
  });

  // Navigazione esterna a uno slot preciso (giorno + orario) dalla popup mensile
  const lastNavigateTs = useRef(null);
  
  const executeSlotNavigation = useCallback((navDate, navTime) => {
    const [y, mo, d] = navDate.split('-').map(Number);
    const targetDate = new Date(y, mo - 1, d);
    targetDate.setHours(0, 0, 0, 0);

    const targetMonth = mo - 1;

    // 1. Attiva focus lock — blocca handleRibbonScroll
    focusLockRef.current = true;

    // 2. Attiva modalità focus visuale — evidenzia solo il mese dell'appuntamento
    setFocusedDay(navDate);
    focusedDayRef.current = navDate;
    setFocusedMonth(targetMonth);
    setShowScrollArrows(true);
    if (onFocusedMonthChange) onFocusedMonthChange(targetMonth);

    // 3. Blocca scroll automatico all'ora corrente
    skipAutoScrollToNow.current = true;

    // 4. Imposta la settimana del giorno target + highlighted
    setHighlightedDay({ day: d, month: targetMonth, year: y });
    const newWeek = getWeekDays(targetDate);
    setCurrentWeekDays(newWeek);
    updateCursorPosition(newWeek);
    if (onDateSelect) onDateSelect(targetDate);

    // 4b. Espandi automaticamente la colonna del giorno target per vedere i titoli
    const dayIdx = newWeek.findIndex(wd => wd.getDate() === d && wd.getMonth() === targetMonth);
    if (dayIdx >= 0) setExpandedDayIdx(dayIdx);

    // 5. Scrolla il nastro: posiziona il giorno sotto il centro del suo mese nella MonthBar
    scrollRibbonToDate(targetDate, false);

    // 6. Evidenzia lo slot selezionato
    const [h, m] = navTime.split(':').map(Number);
    const sk = `${String(h).padStart(2,'0')}:${String(Math.floor(m/5)*5).padStart(2,'0')}`;
    setSelectedSlot({ date: navDate, time: sk });

    // 7. Scroll verticale all'orario preciso — posiziona lo slot a filo con la parte superiore della griglia
    pendingScrollToSlot.current = { h, m, alignTop: true };
    if (onNavigateToSlotDone) onNavigateToSlotDone();
  }, [displayYear, onDateSelect, onNavigateToSlotDone, updateCursorPosition, scrollRibbonToDate]);

  useEffect(() => {
    if (!navigateToSlot) return;
    const ts = navigateToSlot._ts || null;
    if (ts && ts === lastNavigateTs.current) return;
    lastNavigateTs.current = ts;
    executeSlotNavigation(navigateToSlot.date, navigateToSlot.time);
  }, [navigateToSlot, executeSlotNavigation]);

  // Applica scroll verticale pendente dopo che il DOM si è aggiornato con i nuovi dati settimana
  useEffect(() => {
    if (!pendingScrollToSlot.current) return;
    const { h, m } = pendingScrollToSlot.current;
    pendingScrollToSlot.current = null;
    // Usa doppio rAF per essere sicuri che il DOM sia renderizzato
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!scrollRef.current) return;
        const slotIdx = h * 12 + Math.floor(m / 5);
        let totalH = 0;
        for (let si = 0; si < slotIdx && si < TIME_SLOTS.length; si++) {
          totalH += TIME_SLOTS[si].isFullHour ? 40 : 24;
        }
        // Posiziona lo slot a filo con la parte superiore dell'area scrollabile
        scrollRef.current.scrollTop = totalH;
      });
    });
  }, [currentWeekDays, selectedSlot]);

  const handleSlotClick = (dayStr, timeLabel, e) => {
    const existingNote = notesByDateAndTime[dayStr]?.[timeLabel] || null;
    
    // Se c'è una nota in questo slot → mostra anteprima
    if (existingNote) {
      const rect = e?.currentTarget?.getBoundingClientRect();
      setPreviewNote({
        note: existingNote,
        date: dayStr,
        time: timeLabel,
        x: rect ? rect.left + rect.width / 2 : 100,
        y: rect ? rect.top : 100
      });
      return;
    }

    // Slot vuoto: apri direttamente l'editor nota
    setSlotMenuPos(null);
    setPreviewNote(null);
    setSelectedSlot({ date: dayStr, time: timeLabel });
    if (onSlotClick) {
      onSlotClick({ date: dayStr, time: timeLabel, existingNote: null });
    }
  };

  const nH = new Date().getHours(), nM = Math.floor(new Date().getMinutes()/5)*5;
  const nowSlot = `${String(nH).padStart(2,'0')}:${String(nM).padStart(2,'0')}`;

  // Scroll verticale al primo appuntamento >= ora attuale per il giorno dato
  const scrollToNextAppointment = useCallback((dayKey) => {
    if (!scrollRef.current) return;
    const dayItems = items[dayKey] || {};
    const slotKeys = Object.keys(dayItems).sort();
    const nowStr = nowSlot;
    // Trova il primo slot con appuntamento >= ora attuale
    const nextSlot = slotKeys.find(sk => sk >= nowStr) || slotKeys[0];
    if (!nextSlot) return;
    const [h, m] = nextSlot.split(':').map(Number);
    const slotIdx = h * 12 + Math.floor(m / 5);
    let totalH = 0;
    for (let si = 0; si < slotIdx && si < TIME_SLOTS.length; si++) {
      totalH += TIME_SLOTS[si].isFullHour ? 40 : 24;
    }
    scrollRef.current.scrollTop = totalH;
  }, [items, nowSlot]);

  const bgStyle = {
    backgroundColor: `color-mix(in srgb, ${ac} 15%, #0f172a)`,
    transition: 'background-color 1.2s ease'
  };

  // Larghezza totale del nastro
  const ribbonTotalWidth = yearDays.length * ITEM_W;

  return (
    <div className="flex flex-col h-full overflow-hidden relative" style={bgStyle}>

      {/* NASTRO GIORNI continuo gen-dic con cursore */}
      <div className="flex-shrink-0 flex flex-col border-b border-slate-700/30 relative">
        {/* Frecce navigazione settimana — appaiono quando un giorno è selezionato/espanso */}
        {(expandedDayIdx !== null || highlightedDay || showScrollArrows) && (
          <>
            <button 
              className="absolute left-0 top-0 bottom-0 z-20 flex items-center justify-center touch-manipulation active:scale-90"
              style={{ 
                background: 'linear-gradient(to right, rgba(15,23,42,0.95) 0%, transparent 100%)',
                width: '36px',
              }}
              onClick={() => {
                const prevWeekDate = new Date(weekDays[0]);
                prevWeekDate.setDate(prevWeekDate.getDate() - 1);
                handleDayClick(prevWeekDate);
              }}
            >
              <ChevronLeft className="w-5 h-5" style={{ color: ac }} />
            </button>
            <button 
              className="absolute right-0 top-0 bottom-0 z-20 flex items-center justify-center touch-manipulation active:scale-90"
              style={{ 
                background: 'linear-gradient(to left, rgba(15,23,42,0.95) 0%, transparent 100%)',
                width: '36px',
              }}
              onClick={() => {
                const nextWeekDate = new Date(weekDays[6]);
                nextWeekDate.setDate(nextWeekDate.getDate() + 1);
                handleDayClick(nextWeekDate);
              }}
            >
              <ChevronRight className="w-5 h-5" style={{ color: ac }} />
            </button>
          </>
        )}
        
        {/* Nastro scrollabile */}
        <div
          ref={ribbonRef}
          className="overflow-x-auto relative"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
          onScroll={handleRibbonScroll}
          onTouchStart={handleUserInteraction}
          onMouseDown={handleUserInteraction}
        >
          {/* Cursore settimana rimosso */}
          
          {/* Contenitore giorni a larghezza fissa */}
          <div className="flex" style={{ width: `${ribbonTotalWidth}px`, paddingTop: '4px' }}>
            {yearDays.map((dayDate, idx) => {
              const dayNum = dayDate.getDate();
              const mIdx = dayDate.getMonth();
              const dow = dayDate.getDay();
              const isWeekend = dow === 0 || dow === 6;
              const isToday = dayDate.getTime() === today.getTime();
              const dk = fk(dayDate);
              const dayNoteCount = noteCountByDayKey[dk] || 0;
              const isInWeek = false; // disabilitato: non evidenziare i giorni della settimana
              const isSelectedDay = selectedDate && dayDate.getTime() === new Date(new Date(selectedDate).setHours(0,0,0,0)).getTime();
              const isHL = highlightedDay && highlightedDay.day === dayNum && highlightedDay.month === mIdx && highlightedDay.year === displayYear;
              const mColor = MONTH_COLORS[mIdx];
              const isFirstOfMonth = dayNum === 1;
              // Focus mode: se focusedDay è attivo, solo quel giorno è colorato, il resto grigio
              const isFocused = focusedDay === dk;
              const isDimmed = focusedDay && !isFocused;

              return (
                <div
                  key={idx}
                  className="flex flex-col items-center cursor-pointer flex-shrink-0"
                  style={{ width: `${ITEM_W}px`, opacity: isDimmed ? 0.15 : 1, transition: 'opacity 0.4s ease' }}
                  onClick={() => { focusLockRef.current = false; setFocusedDay(null); focusedDayRef.current = null; setFocusedMonth(null); if (onFocusedMonthChange) onFocusedMonthChange(null); handleDayClick(dayDate); }}
                >
                  <div
                    className={cn("rounded-full flex items-center justify-center transition-all", isToday && !isDimmed && "animate-pulse")}
                    style={{
                      width: isFocused ? '28px' : '26px', height: isFocused ? '28px' : '26px',
                      backgroundColor: 'transparent',
                      border: isFocused ? '2px solid #f59e0b' : (isHL ? '2px solid #f59e0b' : (isSelectedDay && !isToday && !isDimmed ? `2px solid ${mColor}` : 'none')),
                      boxShadow: isFocused ? '0 0 12px rgba(249,115,22,0.6)' : 'none',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <span className={cn("font-bold leading-none", isToday && !isDimmed && "animate-pulse")} style={{
                      fontSize: isFocused ? '16px' : '14px',
                      color: isDimmed ? '#475569' : (isFocused ? '#f59e0b' : (isToday ? '#fff' : (isSelectedDay ? '#fff' : (isHL ? '#f59e0b' : (isInWeek ? '#fff' : mColor))))),
                      transition: 'all 0.3s ease'
                    }}>{dayNum}</span>
                  </div>
                  <span className={cn("text-[10px] font-bold leading-tight")} style={{
                    color: isDimmed ? '#334155' : (isWeekend ? '#ef4444' : (isInWeek ? '#94a3b8' : mColor + '80'))
                  }}>
                    {DAY_LETTERS[dow]}
                  </span>
                  {dayNoteCount > 0 && !isFocused ? (
                    <span 
                      className="text-[16px] font-bold leading-none cursor-pointer"
                      style={{ color: isDimmed ? '#334155' : '#a3e635', transition: 'color 0.4s ease' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFocusedDay(null);
                        // Aggiorna settimana e espandi il giorno cliccato
                        handleDayClick(dayDate);
                        if (onDaySummaryRequest) onDaySummaryRequest(dk);
                      }}
                    >{dayNoteCount}</span>
                  ) : (
                    <span className="text-[8px] leading-none" style={{ color: 'transparent' }}>0</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Griglia: header giorni settimana + corpo orari */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* HEADER GIORNI SETTIMANA */}
        <div className="flex flex-shrink-0 border-b border-slate-700/50">
          <div className="flex-shrink-0 flex items-center justify-center" style={{ width: '70px', paddingLeft: '4px', paddingRight: '4px', borderRight: '2px solid rgba(100,116,139,0.6)' }}>
            {onBackToDaily && (
              <button
                onClick={onBackToDaily}
                className="w-7 h-7 rounded-lg flex items-center justify-center touch-manipulation active:scale-90 transition-all"
                style={{ backgroundColor: '#a3e635', boxShadow: '0 0 10px rgba(163,230,53,0.5)' }}
              >
                <X className="w-3.5 h-3.5 text-slate-900" strokeWidth={3} />
              </button>
            )}
          </div>
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
              const isDayFocused = focusedDay === dk;
              const isDayDimmed = focusedDay && !isDayFocused;
              const isExpanded = expandedDayIdx === i;
              // flex: colonna espansa prende 3x, le altre si comprimono
              const flexVal = expandedDayIdx !== null ? (isExpanded ? 3 : 0.66) : 1;
              return (
                <div
                  key={i}
                  className={cn("flex border-l border-slate-700/50 relative", isT && !isDayDimmed && "bg-slate-800/40")}
                  style={{ minHeight: '38px', flex: flexVal, opacity: isDayDimmed ? 0.1 : 1, transition: 'flex 0.35s ease, opacity 0.4s ease', ...(isSel && !isT && !isDayDimmed ? { backgroundColor: ac + '20' } : {}) }}
                >
                  <div
                    className="flex-1 flex flex-col items-center justify-center cursor-pointer z-10 py-0.5"
                    onClick={() => {
                      if (isExpanded) {
                        // Se già espanso, chiudi
                        setExpandedDayIdx(null);
                      } else {
                        // Primo click: evidenzia + espandi subito
                        setHighlightedDay({ day: day.getDate(), month: day.getMonth(), year: day.getFullYear() });
                        setExpandedDayIdx(i);
                        // Scroll verticale al primo appuntamento >= ora attuale
                        scrollToNextAppointment(fk(day));
                      }
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
                      if (dayAllNotes.length > 0) { if (onDaySummaryRequest) onDaySummaryRequest(dk); } else { setOpenDropdownDay(isDropOpen ? null : i); }
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

        {/* CORPO — scroll ore verticale */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-none" style={{ scrollbarWidth:'none', msOverflowStyle:'none' }}>
          {TIME_SLOTS.map((slot) => {
            const isNow = weekDays.some(d => d.getTime() === today.getTime()) && slot.label === nowSlot;
            const isSlotRow = selectedSlot?.time === slot.label;
            return (
              <div key={slot.label} className={cn("flex", slot.isFullHour ? "h-10" : "h-6")}>
                {/* Colonna ore */}
                <div className={cn("flex-shrink-0 flex items-center justify-end px-0", isSlotRow && "bg-amber-500/10")} style={{ width: '70px', paddingRight: '6px', borderRight: '2px solid rgba(100,116,139,0.6)', backgroundColor: isSlotRow ? undefined : `color-mix(in srgb, ${ac} 15%, #0f172a)` }}>
                  {isSlotRow ? (
                    <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center mr-1 animate-pulse shadow-lg shadow-amber-500/40 flex-shrink-0"><Plus className="w-2.5 h-2.5 text-white" /></div>
                  ) : (
                    <div className="flex items-center mr-1.5"><div className={cn("h-[2px] rounded-full", isNow && "animate-pulse")} style={{ width: slot.isFullHour ? '16px' : '8px', backgroundColor: isNow ? '#fff' : (slot.isFullHour ? ac : '#475569') }} /></div>
                  )}
                  <span className={cn("font-mono text-[10px]", slot.isFullHour && "font-bold", isNow && "text-white font-bold animate-pulse")} style={{ color: isSlotRow ? '#f59e0b' : (isNow ? '#fff' : (slot.isFullHour ? ac : '#94a3b8')) }}>{slot.label}</span>
                </div>
                {/* 7 colonne giorni */}
                <div className="flex flex-1">
                  {weekDays.map((day, di) => {
                    const dk = fk(day);
                    const isT = day.getTime() === today.getTime();
                    const isNC = isT && slot.label === nowSlot;
                    const isSel = selectedDate && day.toDateString() === new Date(selectedDate).toDateString();
                    const its = items[dk]?.[slot.label] || [];
                    const isSlotSelected = selectedSlot?.date === dk && selectedSlot?.time === slot.label;
                    const isCellFocused = focusedDay === dk;
                    const isCellDimmed = focusedDay && !isCellFocused;
                    const isCellExpanded = expandedDayIdx === di;
                    const cellFlex = expandedDayIdx !== null ? (isCellExpanded ? 3 : 0.66) : 1;
                    return (
                      <div
                        key={di}
                        className={cn("border-l border-slate-700/20 relative cursor-pointer", isNC && !isCellDimmed && "bg-white/5", isT && !isCellDimmed && "bg-slate-800/20", isSel && !isT && !isCellDimmed && "bg-slate-700/15", isSlotSelected && "ring-1 ring-amber-500/60")}
                        style={{ flex: cellFlex, opacity: isCellDimmed ? 0.08 : 1, transition: 'flex 0.35s ease, opacity 0.4s ease', overflow: 'hidden' }}
                        onClick={(e) => handleSlotClick(dk, slot.label, e)}
                      >
                        {isNC && <div className="absolute left-0 right-0 top-0 h-[2px] bg-white animate-pulse z-10" />}
                        {isSlotSelected && its.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center z-10">
                            <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center animate-pulse shadow-lg shadow-amber-500/40"><Plus className="w-3.5 h-3.5 text-white" /></div>
                          </div>
                        )}
                        {its.map((it, ii) => (
                          <div key={ii} className="absolute inset-x-0.5 top-0.5 bottom-0.5 rounded overflow-hidden flex items-center" style={{ backgroundColor: it.color+'30', borderLeft: `2px solid ${it.color}` }}>
                            <span className="text-[14px] font-semibold px-0.5 truncate" style={{ color: it.color }}>{it.title}</span>
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

      {/* Menu opzioni slot */}
      {slotMenuPos && (
        <div 
          className="fixed inset-0 z-[60]" 
          onClick={() => setSlotMenuPos(null)}
        >
          <div 
            className="absolute z-[61] bg-black rounded-xl shadow-2xl border border-slate-700/50 overflow-hidden"
            style={{
              left: `${Math.min(slotMenuPos.x - 70, window.innerWidth - 160)}px`,
              top: `${Math.max(slotMenuPos.y - 110, 10)}px`,
              minWidth: '140px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-1">
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-800 transition-colors"
                onClick={() => {
                  setSlotMenuPos(null);
                  if (onSlotClick) {
                    const existingNote = notesByDateAndTime[slotMenuPos.date]?.[slotMenuPos.time] || null;
                    onSlotClick({ date: slotMenuPos.date, time: slotMenuPos.time, existingNote });
                  }
                }}
              >
                <StickyNote className="w-4 h-4" style={{ color: ac }} />
                <span className="text-xs text-white font-medium">Nuova nota</span>
              </button>
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-800 transition-colors"
                onClick={() => {
                  setSlotMenuPos(null);
                  // Futuro: creare evento
                }}
              >
                <CalendarPlus className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-white font-medium">Nuovo evento</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Anteprima nota — popup centrato sullo schermo */}
      {previewNote && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" 
          onClick={() => setPreviewNote(null)}
        >
          <div 
            className="z-[61] bg-black rounded-xl shadow-2xl border border-slate-700/50 overflow-hidden"
            style={{ width: '220px', maxWidth: '80%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono text-slate-400">{previewNote.time}</span>
                  <button
                    onClick={() => setPreviewNote(null)}
                    className="w-5 h-5 rounded-full flex items-center justify-center bg-slate-700 hover:bg-slate-600 transition-colors"
                  >
                    <X className="w-3 h-3 text-slate-300" />
                  </button>
                </div>
                <h4 className="text-sm font-semibold text-white leading-tight mb-1">{previewNote.note.title}</h4>
              {previewNote.note.content && (
                <p className="text-[11px] text-slate-400 leading-snug line-clamp-3">{previewNote.note.content}</p>
              )}
              {previewNote.note.checklist_items?.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1">
                  <Check className="w-3 h-3 text-slate-500" />
                  <span className="text-[10px] text-slate-500">{previewNote.note.checklist_items.filter(c => c.checked).length}/{previewNote.note.checklist_items.length}</span>
                </div>
              )}
              {previewNote.note.attachments?.length > 0 && (
                <div className="mt-1 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-500" />
                  <span className="text-[10px] text-slate-500">{previewNote.note.attachments.length} allegat{previewNote.note.attachments.length === 1 ? 'o' : 'i'}</span>
                </div>
              )}
              <button
                className="mt-2.5 w-full py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{ backgroundColor: MONTH_COLORS[parseInt(previewNote.date.split('-')[1]) - 1], color: '#0f172a' }}
                onClick={() => {
                  setPreviewNote(null);
                  if (onSlotClick) {
                    onSlotClick({ date: previewNote.date, time: previewNote.time, existingNote: previewNote.note });
                  }
                }}
              >
                Apri nota
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DayNotesSummaryPopup è gestito dal parent CalendarSideTab */}
    </div>
  );
}