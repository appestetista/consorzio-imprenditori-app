import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Calendar, X, LayoutGrid, Plus, AudioLines, Camera, Paperclip, ListChecks, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import HorizontalDatePicker from './HorizontalDatePicker';
import VerticalTimePicker from './VerticalTimePicker';
import FatturatoBarra from './FatturatoBarra';
import WeekView from './WeekView';
import NoteEditor from './NoteEditor';
import FileNoteEditor from './FileNoteEditor.jsx';
import WhisperDictation from './WhisperDictation';
import AudioRecorder from './AudioRecorder';
import MonthBar from './MonthBar';
import MonthNotesCountBar from './MonthNotesCountBar';
import MonthNotesSummaryPopup from './MonthNotesSummaryPopup';
import DayNotesSummaryPopup from './DayNotesSummaryPopup';
import { usePanels } from '../layout/GlobalTopIcons';


const MONTH_COLORS = [
  '#3b82f6', // Gennaio - blu
  '#8b5cf6', // Febbraio - viola
  '#ec4899', // Marzo - rosa
  '#14b8a6', // Aprile - teal
  '#22c55e', // Maggio - verde
  '#eab308', // Giugno - giallo
  '#f97316', // Luglio - arancione
  '#ef4444', // Agosto - rosso
  '#06b6d4', // Settembre - cyan
  '#a855f7', // Ottobre - purple
  '#6366f1', // Novembre - indigo
  '#0ea5e9', // Dicembre - sky
];

export default function CalendarSideTab({ selectedDate, onDateSelect, forceOpen, onForceOpenConsumed }) {
    const [isOpen, setIsOpen] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showFatturato, setShowFatturato] = useState(false);
    const [showWeekView, setShowWeekView] = useState(false);
    const [navExpanded, setNavExpanded] = useState(false);
    const { hideHeader, showHeader } = usePanels();

    // Ascolta toggle della bottom nav
    useEffect(() => {
      const handler = (e) => setNavExpanded(e.detail?.expanded ?? false);
      window.addEventListener('bottomnav-toggle', handler);
      return () => window.removeEventListener('bottomnav-toggle', handler);
    }, []);

    // Ascolta evento globale dal BottomNav per aprire il calendario
    useEffect(() => {
      const handler = () => {
        if (!isOpen) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (onDateSelect) onDateSelect(today);
          setIsOpen(true);
          setShowTimePicker(true);
          hideHeader();
        }
      };
      window.addEventListener('open-calendario-panel', handler);
      return () => window.removeEventListener('open-calendario-panel', handler);
    }, [isOpen]);
    const [weekViewColor, setWeekViewColor] = useState(null);
    const [weekViewMonth, setWeekViewMonth] = useState(new Date().getMonth());
    const weekViewMonthSelectRef = useRef(null);
    const [weekViewFocusedMonth, setWeekViewFocusedMonth] = useState(null); // mese evidenziato durante navigazione popup
    // NoteEditor dalla WeekView - orientamento normale
    const [weekNoteSlot, setWeekNoteSlot] = useState(null); // { date, time, existingNote }
    const [showWeekNoteEditor, setShowWeekNoteEditor] = useState(false);
    const [hasSelectedTime, setHasSelectedTime] = useState(false);
    const [showToolsPopup, setShowToolsPopup] = useState(false);
    const [editingFile, setEditingFile] = useState(null); // file aperto per modifica

    const weekNoteEditorSaveRef = useRef(null);
    const verticalTimePickerRef = useRef(null);
    const [pendingNoteNavigate, setPendingNoteNavigate] = useState(null);
    const queryClient = useQueryClient();
    const [monthNotesPopup, setMonthNotesPopup] = useState(null); // { monthIndex, year }
    const [pendingWeekSlotNavigate, setPendingWeekSlotNavigate] = useState(null); // { date, time }
    const [weekDaySummaryDate, setWeekDaySummaryDate] = useState(null); // "YYYY-MM-DD" per il popup giornaliero nella week view
  const goToTodayRef = useRef(null);
  const [currentMonthColor, setCurrentMonthColor] = useState(MONTH_COLORS[new Date().getMonth()]);
  const [visibleMonthLabel, setVisibleMonthLabel] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });
  const [visibleDay, setVisibleDay] = useState(new Date().getDate());
  const [userEmail, setUserEmail] = useState(null);
  const [futureEventsCount, setFutureEventsCount] = useState(0);
  const [hasNewEvent, setHasNewEvent] = useState(false);
  const lastEventCountRef = useRef(0);
  
  // Refs per sincronizzazione scroll
  const calendarScrollRef = useRef(null);
  const fatturatoScrollRef = useRef(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setUserEmail(user?.email);
      } catch (e) {}
    };
    loadUser();
  }, []);

  // Apri automaticamente il calendario quando forceOpen è true (ritorno da Incontri)
  useEffect(() => {
    if (forceOpen) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (onDateSelect) onDateSelect(today);
      setIsOpen(true);
      setShowTimePicker(true);
      if (onForceOpenConsumed) onForceOpenConsumed();
    }
  }, [forceOpen]);

  // Query tutte le note dell'utente per conteggio mensile nella week view
  const weekViewYear = new Date().getFullYear(); // anno corrente come riferimento
  const { data: allUserNotes = [] } = useQuery({
    queryKey: ['all-user-notes', userEmail],
    queryFn: () => base44.entities.Nota.filter({ user_email: userEmail }),
    enabled: !!userEmail && showWeekView
  });

  // Query eventi per campanella
  const { data: allEvents = [] } = useQuery({
    queryKey: ['events-calendar-tab'],
    queryFn: () => base44.entities.Event.list('date'),
    enabled: isOpen,
    refetchInterval: 30000,
  });

  // Calcola eventi futuri
  useEffect(() => {
    if (!allEvents.length) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const count = allEvents.filter(e => {
      if (!e.date) return false;
      const d = new Date(e.date);
      if (isNaN(d.getTime())) return false;
      d.setHours(0, 0, 0, 0);
      return d >= today && e.approval_status === 'approved' && !e.is_cancelled;
    }).length;
    if (count > lastEventCountRef.current && lastEventCountRef.current > 0) {
      setHasNewEvent(true);
    }
    lastEventCountRef.current = count;
    setFutureEventsCount(count);
  }, [allEvents]);

  // Subscribe real-time agli eventi
  useEffect(() => {
    const unsubscribe = base44.entities.Event.subscribe((event) => {
      if (event.type === 'create') setHasNewEvent(true);
      queryClient.invalidateQueries({ queryKey: ['events-calendar-tab'] });
    });
    return unsubscribe;
  }, [queryClient]);

  // Query cartelle per il popup
  const { data: cartelleForPopup = [] } = useQuery({
    queryKey: ['cartelle', userEmail],
    queryFn: () => base44.entities.Cartella.filter({ user_email: userEmail }),
    enabled: !!userEmail
  });
  const cartelleMapForPopup = {};
  cartelleForPopup.forEach(c => { cartelleMapForPopup[c.id] = c; });

  // Conta note per mese (anno corrente della settimana visualizzata)
  const noteCountsByMonth = {};
  allUserNotes.forEach(n => {
    if (!n.data) return;
    const [y, m] = n.data.split('-').map(Number);
    // Usa l'anno della settimana visualizzata
    const refYear = weekViewMonth !== undefined ? new Date().getFullYear() : weekViewYear;
    if (y === refYear) {
      const mIdx = m - 1;
      noteCountsByMonth[mIdx] = (noteCountsByMonth[mIdx] || 0) + 1;
    }
  });

  // Mutation salva nota dalla WeekView
  const weekSaveNoteMutation = useMutation({
    mutationFn: async (noteData) => {
      if (noteData.existingNote) {
        return base44.entities.Nota.update(noteData.existingNote.id, {
          title: noteData.title,
          content: noteData.content || '',
          attachments: noteData.attachments || [],
          checklist_items: noteData.checklistItems || [],
          cartella_id: noteData.cartella_id || null
        });
      } else {
        return base44.entities.Nota.create({
          user_email: userEmail,
          data: noteData.dateStr,
          time: noteData.time,
          title: noteData.title,
          content: noteData.content || '',
          attachments: noteData.attachments || [],
          checklist_items: noteData.checklistItems || [],
          cartella_id: noteData.cartella_id || null
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-week'] });
      queryClient.invalidateQueries({ queryKey: ['note'] });
      queryClient.invalidateQueries({ queryKey: ['noteCartella'] });
      queryClient.invalidateQueries({ queryKey: ['all-user-notes'] });
      // Chiudi editor e torna alla week view
      setShowWeekNoteEditor(false);
      setWeekNoteSlot(null);
    }
  });

  const handleWeekSlotClick = (slotInfo) => {
    setWeekNoteSlot(slotInfo);
    setShowWeekNoteEditor(true);
  };

  const handleWeekNoteSave = (noteData) => {
    if (!weekNoteSlot) return;
    // Usa data/ora dall'editor se disponibili, altrimenti fallback allo slot
    const dateStr = noteData.date
      ? (typeof noteData.date === 'string' && noteData.date.includes('-')
          ? noteData.date
          : (() => { const d = new Date(noteData.date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })())
      : weekNoteSlot.date;
    weekSaveNoteMutation.mutate({
      ...noteData,
      dateStr,
      time: noteData.time || weekNoteSlot.time,
      existingNote: weekNoteSlot.existingNote
    });
  };

  const toggleCalendar = () => {
    if (!isOpen) {
      // Quando apro il calendario, seleziono automaticamente oggi
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (onDateSelect) {
        onDateSelect(today);
      }
      setShowTimePicker(true);
      hideHeader(); // Nascondi header quando apro calendario giornaliero
    } else {
      showHeader(); // Mostra header quando chiudo
    }
    setIsOpen(!isOpen);
  };

  // Nascondi/mostra header quando si apre/chiude la week view (mensile)
  useEffect(() => {
    if (showWeekView) {
      hideHeader();
    } else if (!isOpen) {
      showHeader();
    }
  }, [showWeekView]);

  const handleDateSelect = (date) => {
    if (onDateSelect) {
      onDateSelect(date);
    }
    // Mostra il time picker quando si seleziona una data
    setShowTimePicker(true);
  };

  const handleTimeSelect = (time) => {
    console.log('Orario selezionato:', time);
    // Qui puoi gestire la selezione dell'orario
  };

  // Sincronizza scroll tra calendario e fatturato
  const handleCalendarScroll = (scrollLeft) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    if (fatturatoScrollRef.current) {
      fatturatoScrollRef.current.scrollLeft = scrollLeft;
    }
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  };

  const handleFatturatoScroll = (scrollLeft) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    if (calendarScrollRef.current) {
      calendarScrollRef.current.scrollLeft = scrollLeft;
    }
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  };

  return (
    <>
      {/* Linguette laterali rimosse — apertura gestita dal BottomNav */}

      {/* Pannello calendario - scorre da destra a sinistra orizzontalmente */}
      <div
        className={cn(
          "fixed inset-0 transition-transform duration-[800ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]",
          "bg-slate-900 shadow-2xl",
          isOpen ? "translate-x-0" : "translate-x-full",
          "z-[55]"
        )}
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        {/* VerticalTimePicker - occupa lo spazio sopra il calendario */}
        {showTimePicker && selectedDate && (
          <div className="flex-1 min-h-0 flex flex-col" style={{ marginRight: '42px' }}>
            <VerticalTimePicker 
              selectedDate={selectedDate}
              visibleDay={visibleDay}
              visibleMonth={visibleMonthLabel.month}
              visibleYear={visibleMonthLabel.year}
              onClose={() => setShowTimePicker(false)}
              onTimeSelect={handleTimeSelect}
              navigateToNote={pendingNoteNavigate}
              onNavigateToNoteDone={() => setPendingNoteNavigate(null)}
              onDateChange={(newDate) => {
                if (onDateSelect) {
                  onDateSelect(newDate);
                }
                setTimeout(() => {
                  if (goToTodayRef.scrollToDate) {
                    goToTodayRef.scrollToDate(newDate);
                  }
                }, 100);
              }}
              monthColor={currentMonthColor}
              onSelectedTimeChange={setHasSelectedTime}
            />
          </div>
        )}
        
        {/* Calendario orizzontale - in basso */}
        <div>
          <HorizontalDatePicker
            goToTodayButton={
              (() => {
                const now = new Date();
                const visibleIsToday = visibleDay === now.getDate() && visibleMonthLabel.month === now.getMonth() && visibleMonthLabel.year === now.getFullYear();
                return (
                  <button
                    onClick={() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      if (onDateSelect) {
                        onDateSelect(today);
                      }
                      // Scrolla il calendario orizzontale al giorno di oggi
                      if (goToTodayRef.scrollToDate) {
                        goToTodayRef.scrollToDate(today);
                      } else if (goToTodayRef.current) {
                        goToTodayRef.current();
                      }
                    }}
                    className="rounded text-[10px] font-semibold"
                    style={{ 
                      backgroundColor: visibleIsToday ? '#334155' : currentMonthColor,
                      color: visibleIsToday ? '#64748b' : '#0f172a',
                      width: '80px',
                      padding: '2px 0',
                      textAlign: 'center'
                    }}
                  >
                    {visibleIsToday ? 'OGGI' : 'TORNA A OGGI'}
                  </button>
                );
              })()
            }
            monthNameLabel={
              <span 
                className="text-xl font-bold capitalize text-center"
                style={{ color: currentMonthColor, minWidth: '100px', display: 'inline-block' }}
              >
                {new Date(visibleMonthLabel.year, visibleMonthLabel.month).toLocaleDateString('it-IT', { month: 'long' })} {visibleMonthLabel.year}
              </span>
            }
            incontriButton={
              <div className="flex flex-col items-center">
                <Link 
                  to={createPageUrl('CalendarioIncontri?monthColor=' + encodeURIComponent(currentMonthColor) + '&fromCalendar=1')}
                  className="relative flex-shrink-0 flex flex-col items-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    setShowTimePicker(false);
                    setHasNewEvent(false);
                  }}
                >
                  <div 
                    className="relative w-11 h-11 rounded-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200"
                    style={{
                      background: `linear-gradient(145deg, ${currentMonthColor}, color-mix(in srgb, ${currentMonthColor} 70%, #000))`,
                      boxShadow: `0 4px 12px ${currentMonthColor}55, 0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.15)`,
                      border: '1px solid rgba(255,255,255,0.2)',
                      transition: 'background 1.2s ease, box-shadow 1.2s ease'
                    }}
                  >
                    <Calendar className="w-5 h-5 text-slate-900" strokeWidth={2.5} />
                    <div className={cn(
                      "absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-all",
                      hasNewEvent ? "animate-bounce" : ""
                    )} style={{
                      background: 'linear-gradient(145deg, #475569, #334155)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <Bell className="w-3 h-3 text-white" />
                    </div>
                    {futureEventsCount > 0 && (
                      <span className="absolute -top-2.5 -right-2.5 bg-red-500 text-white text-[7px] rounded-full min-w-[15px] h-[15px] px-0.5 flex items-center justify-center font-bold z-10" style={{ boxShadow: '0 2px 4px rgba(239,68,68,0.5)' }}>
                        {futureEventsCount}
                      </span>
                    )}
                  </div>
                </Link>
                <span className="text-[12px] font-bold text-slate-300 mt-0.5">Incontri</span>
              </div>
            }
            monthLabelButton={
              selectedDate ? (
                <span 
                  className="px-2 py-0.5 rounded text-[10px] font-semibold"
                  style={{ 
                    backgroundColor: currentMonthColor,
                    color: '#0f172a'
                  }}
                >
                  {new Date(selectedDate).toLocaleDateString('it-IT', { weekday: 'long' })} {new Date(selectedDate).getDate()}
                </span>
              ) : (
                <span className="text-[9px] text-slate-500 italic text-right">
                  scegli un giorno
                </span>
              )
            } 
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onGoToToday={goToTodayRef}
            onMonthColorChange={setCurrentMonthColor}
            onVisibleMonthChange={(month, year) => setVisibleMonthLabel({ month, year })}
            onVisibleDayChange={(day, month, year) => {
              setVisibleDay(day);
              setVisibleMonthLabel({ month, year });
            }}
            onScrollSync={handleCalendarScroll}
            scrollRef={calendarScrollRef}
            showFatturato={showFatturato}
            currentMonthColor={currentMonthColor}
            onToggleFatturato={() => {
                setShowWeekView(true);
              }}
              onClose={() => {
                setIsOpen(false);
                setShowTimePicker(false);
                showHeader();
              }}
              hasSelectedTime={hasSelectedTime}
              onOpenTools={() => setShowToolsPopup(true)}
              onFileClick={(file) => setEditingFile(file)}
              onNoteNavigate={(note) => {
                // Setta la nota pendente — il VerticalTimePicker la leggerà per scrollare
                setPendingNoteNavigate(note);
              }}
            />
        </div>

        {/* Barra fatturato - espandibile */}
        {showFatturato && userEmail && (
          <div className="w-full">
            <FatturatoBarra 
              selectedDate={selectedDate}
              userEmail={userEmail}
              onScrollSync={handleFatturatoScroll}
              scrollRef={fatturatoScrollRef}
              visibleMonth={visibleMonthLabel.month}
              visibleYear={visibleMonthLabel.year}
              monthColor={currentMonthColor}
              onDateSelect={handleDateSelect}
            />
          </div>
        )}
      </div>

      {/* Vista settimanale - sale dal basso, contenuto ruotato 90° per landscape */}
            <div 
              className={cn(
                "fixed inset-0 z-[65] transition-transform duration-700 ease-in-out",
                showWeekView && !showWeekNoteEditor ? "translate-y-0" : "translate-y-full"
              )}
              style={{
                backgroundColor: `color-mix(in srgb, ${weekViewColor || currentMonthColor} 15%, #0f172a)`,
                transition: 'background-color 1.2s ease, transform 0.7s ease-in-out'
              }}
            >
              {/* Barra pulsante + mesi FUORI dal rotate ma orientata landscape (rotate 90deg) */}
              <div 
                className="fixed z-[66] flex flex-col"
                style={{
                  width: '100vh',
                  height: '52px',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%) rotate(90deg) translateY(calc(-50vw + 26px))',
                  transformOrigin: 'center center',
                  backgroundColor: `color-mix(in srgb, ${weekViewColor || currentMonthColor} 15%, #0f172a)`,
                  borderBottom: '1px solid rgba(51,65,85,0.5)',
                  pointerEvents: 'auto'
                }}
              >
                {/* Riga 1: spazio vuoto */}
                <div style={{ height: '1px' }} />
                {/* Riga 2: Barra mesi */}
                <div className="overflow-hidden flex items-center">
                  <MonthBar 
                    currentMonth={weekViewMonth}
                    onSelectMonth={(mIdx) => {
                      setWeekViewFocusedMonth(null); // resetta focus quando si seleziona un mese manualmente
                      if (weekViewMonthSelectRef.current) weekViewMonthSelectRef.current(mIdx);
                    }}
                    focusedMonth={weekViewFocusedMonth}
                  />
                </div>
                {/* Riga 3: Conteggio note per mese */}
                <div className="overflow-hidden flex items-center">
                  <MonthNotesCountBar 
                    noteCountsByMonth={noteCountsByMonth}
                    currentMonth={weekViewMonth}
                    onMonthClick={(mIdx) => {
                      setMonthNotesPopup({ monthIndex: mIdx, year: new Date().getFullYear() });
                    }}
                    focusedMonth={weekViewFocusedMonth}
                  />
                </div>
              </div>

              {/* Contenitore ruotato: tutto il contenuto è girato di 90° in senso orario */}
              <div 
                className="absolute flex flex-col"
                style={{
                  width: '100vh',
                  height: '100vw',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%) rotate(90deg)',
                  transformOrigin: 'center center'
                }}
              >
                {/* Spacer per la barra mesi + conteggio note (52px) */}
                <div className="flex-shrink-0" style={{ height: '52px' }} />
                {/* WeekView occupa tutto il resto */}
                <div className="flex-1 min-h-0">
                  <WeekView
                    selectedDate={selectedDate}
                    monthColor={currentMonthColor}
                    onMonthColorChange={(color) => setWeekViewColor(color)}
                    onDateSelect={(date) => {
                      handleDateSelect(date);
                      setTimeout(() => {
                        if (goToTodayRef.scrollToDate) {
                          goToTodayRef.scrollToDate(date);
                        }
                      }, 100);
                    }}
                    initialVisibleDay={visibleDay}
                    initialVisibleMonth={visibleMonthLabel.month}
                    initialVisibleYear={visibleMonthLabel.year}
                    onSlotClick={handleWeekSlotClick}
                    onMonthChange={(month) => setWeekViewMonth(month)}
                    onRegisterMonthSelect={(fn) => { weekViewMonthSelectRef.current = fn; }}
                      onFocusedMonthChange={setWeekViewFocusedMonth}
                      allMonthNotes={allUserNotes}
                    navigateToSlot={pendingWeekSlotNavigate}
                    onNavigateToSlotDone={() => setPendingWeekSlotNavigate(null)}
                    onBackToDaily={(highlightedDate) => {
                      // Se c'è un giorno evidenziato nella WeekView, vai a quel giorno specifico
                      let targetDate;
                      if (highlightedDate) {
                        targetDate = new Date(highlightedDate);
                        targetDate.setHours(0,0,0,0);
                      } else {
                        const nowYear = new Date().getFullYear();
                        targetDate = new Date(nowYear, weekViewMonth, 15);
                        targetDate.setHours(0,0,0,0);
                      }
                      handleDateSelect(targetDate);
                      setShowWeekView(false);
                      setIsOpen(true);
                      setShowTimePicker(true);
                      setTimeout(() => {
                        if (goToTodayRef.scrollToDate) {
                          goToTodayRef.scrollToDate(targetDate);
                        }
                      }, 200);
                    }}
                    onDaySummaryRequest={(dk) => setWeekDaySummaryDate(dk)}
                  />
                </div>
              </div>
            </div>

            {/* NoteEditor dalla WeekView - orientamento NORMALE del telefono (non ruotato) */}
            {showWeekNoteEditor && weekNoteSlot && (
              <div className="fixed inset-0 z-[70] bg-black">
                <NoteEditor
                  key={`week-${weekNoteSlot.date}-${weekNoteSlot.time}`}
                  selectedDate={new Date(weekNoteSlot.date + 'T00:00:00')}
                  selectedTime={weekNoteSlot.time}
                  onClose={() => { setShowWeekNoteEditor(false); setWeekNoteSlot(null); }}
                  onSave={handleWeekNoteSave}
                  onDelete={(note) => {
                    if (note?.id) {
                      base44.entities.Nota.delete(note.id).then(() => {
                          queryClient.invalidateQueries({ queryKey: ['note-week'] });
                          queryClient.invalidateQueries({ queryKey: ['note'] });
                          queryClient.invalidateQueries({ queryKey: ['noteCartella'] });
                          queryClient.invalidateQueries({ queryKey: ['all-user-notes'] });
                        });
                    }
                    setShowWeekNoteEditor(false);
                    setWeekNoteSlot(null);
                  }}
                  inline={false}
                  existingNote={weekNoteSlot.existingNote ? {
                    ...weekNoteSlot.existingNote,
                    checklistItems: weekNoteSlot.existingNote.checklist_items || [],
                    cartella_id: weekNoteSlot.existingNote.cartella_id || ''
                  } : null}
                  onRegisterSave={(saveFn) => { weekNoteEditorSaveRef.current = saveFn; }}
                  monthColor={weekViewColor || currentMonthColor}
                />
              </div>
            )}

      {/* Popup riepilogo note del mese - ruotato 90° come la week view */}
      {monthNotesPopup && (
        <div 
          className="fixed inset-0 z-[75]"
          style={{
            width: '100vh',
            height: '100vw',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(90deg)',
            transformOrigin: 'center center'
          }}
        >
          <MonthNotesSummaryPopup
              notes={allUserNotes.filter(n => {
                if (!n.data) return false;
                const [y, m] = n.data.split('-').map(Number);
                return y === monthNotesPopup.year && (m - 1) === monthNotesPopup.monthIndex;
              })}
              cartelleMap={cartelleMapForPopup}
              monthIndex={monthNotesPopup.monthIndex}
              year={monthNotesPopup.year}
              onClose={(lastNote) => {
                setMonthNotesPopup(null);
                // Quando chiudo il popup, naviga al giorno dell'ultima nota cliccata
                if (lastNote?.data) {
                  const [y, mo, d] = lastNote.data.split('-').map(Number);
                  const targetDate = new Date(y, mo - 1, d);
                  targetDate.setHours(0, 0, 0, 0);
                  handleDateSelect(targetDate);
                  setShowWeekView(false);
                  setIsOpen(true);
                  setShowTimePicker(true);
                  setTimeout(() => {
                    if (goToTodayRef.scrollToDate) {
                      goToTodayRef.scrollToDate(targetDate);
                    }
                  }, 200);
                  if (lastNote.time) {
                    setPendingNoteNavigate(lastNote);
                  }
                }
              }}
              onNoteClick={(note) => {
                if (note?.data && note.time) {
                  // Imposta navigazione PRIMA di chiudere il popup — React li batch insieme
                  setPendingWeekSlotNavigate({ date: note.data, time: note.time, _ts: Date.now() });
                  setMonthNotesPopup(null);
                } else if (note?.data) {
                  setMonthNotesPopup(null);
                  const [y, mo, d] = note.data.split('-').map(Number);
                  const targetDate = new Date(y, mo - 1, d);
                  targetDate.setHours(0, 0, 0, 0);
                  handleDateSelect(targetDate);
                  if (weekViewMonthSelectRef.current) {
                    weekViewMonthSelectRef.current(mo - 1);
                  }
                } else {
                  setMonthNotesPopup(null);
                }
              }}
              onDeleteNote={(note) => {
                if (note?.id) {
                  base44.entities.Nota.delete(note.id).then(() => {
                    queryClient.invalidateQueries({ queryKey: ['all-user-notes'] });
                    queryClient.invalidateQueries({ queryKey: ['note-week'] });
                    queryClient.invalidateQueries({ queryKey: ['note'] });
                    queryClient.invalidateQueries({ queryKey: ['noteCartella'] });
                  });
                }
              }}
            />
        </div>
      )}

      {/* Popup riepilogo note del giorno dalla WeekView - ruotato 90° */}
      {weekDaySummaryDate && (
        <div 
          className="fixed inset-0 z-[75]"
          style={{
            width: '100vh',
            height: '100vw',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(90deg)',
            transformOrigin: 'center center'
          }}
        >
          <div className="w-full h-full flex items-center justify-center bg-black/70" onClick={() => setWeekDaySummaryDate(null)}>
            <div onClick={(e) => e.stopPropagation()}>
              <DayNotesSummaryPopup
                notes={allUserNotes.filter(n => n.data === weekDaySummaryDate)}
                cartelleMap={cartelleMapForPopup}
                selectedDate={new Date(weekDaySummaryDate + 'T00:00:00')}
                monthColor={weekViewColor || currentMonthColor}
                onClose={() => setWeekDaySummaryDate(null)}
                onNoteClick={(note) => {
                  if (note?.data && note?.time) {
                    setPendingWeekSlotNavigate({ date: note.data, time: note.time, _ts: Date.now() });
                  }
                  setWeekDaySummaryDate(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Editor File - stessa struttura del NoteEditor */}
      {editingFile && (
        <div className="fixed inset-0 z-[70] bg-black">
          <FileNoteEditor
            key={`file-${editingFile.id}`}
            file={editingFile}
            onClose={() => setEditingFile(null)}
            onSave={() => setEditingFile(null)}
            onDelete={() => setEditingFile(null)}
            monthColor={currentMonthColor}
          />
        </div>
      )}

      {/* Popup Strumenti - overlay in sovraimpressione */}
      {showToolsPopup && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70" onClick={() => setShowToolsPopup(false)}>
          <div className="bg-slate-800 rounded-xl p-5 w-80 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowToolsPopup(false)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-slate-300" />
            </button>
            
            <h3 className="text-white font-semibold text-base mb-4">Strumenti</h3>
            
            <div className="grid grid-cols-3 gap-3">
              {/* Camera */}
              <button 
                onClick={() => {
                  setShowToolsPopup(false);
                  // Trigger camera via event dispatch
                  document.dispatchEvent(new CustomEvent('calendar-tool-camera'));
                }}
                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                <Camera className="w-6 h-6 text-slate-300" />
                <span className="text-[10px] text-slate-400">Foto</span>
              </button>
              {/* Allegato */}
              <button 
                onClick={() => {
                  setShowToolsPopup(false);
                  document.dispatchEvent(new CustomEvent('calendar-tool-attach'));
                }}
                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                <Paperclip className="w-6 h-6 text-slate-300" />
                <span className="text-[10px] text-slate-400">Allegato</span>
              </button>
              {/* Checklist */}
              <button 
                onClick={() => {
                  setShowToolsPopup(false);
                  document.dispatchEvent(new CustomEvent('calendar-tool-checklist'));
                }}
                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                <ListChecks className="w-6 h-6 text-slate-300" />
                <span className="text-[10px] text-slate-400">Checklist</span>
              </button>
            </div>

            {/* Dettatura e Registratore */}
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border border-slate-700 bg-slate-800/50">
                <WhisperDictation 
                  isDictating={false}
                  setIsDictating={() => {}}
                  onTranscription={(text) => {
                    document.dispatchEvent(new CustomEvent('calendar-tool-dictation', { detail: text }));
                  }}
                />
                <span className="text-[10px] text-slate-400">Dettatura</span>
              </div>
              <div className="flex-1 flex items-center justify-center p-3 rounded-lg border border-slate-700 bg-slate-800/50">
                <AudioRecorder
                  onAudioSaved={(audioAtt) => {
                    document.dispatchEvent(new CustomEvent('calendar-tool-audio', { detail: audioAtt }));
                  }}
                  onTranscription={(text) => {
                    document.dispatchEvent(new CustomEvent('calendar-tool-dictation', { detail: text }));
                  }}
                />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Semicerchio CHIUDI laterale - sul bordo destro del pannello calendario */}
      {isOpen && !showWeekView && (
        <button
          onClick={() => {
            setIsOpen(false);
            setShowTimePicker(false);
            showHeader();
          }}
          className="fixed z-[56] flex items-center justify-center"
          style={{
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: '42px',
            height: '120px',
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
            borderTopLeftRadius: '12px',
            borderBottomLeftRadius: '12px',
            borderLeft: `2px solid ${currentMonthColor}44`,
            borderTop: `1px solid ${currentMonthColor}33`,
            borderBottom: `1px solid ${currentMonthColor}33`,
            boxShadow: `-4px 0 12px rgba(0,0,0,0.3)`,
          }}
        >
          <span 
            className="text-[10px] font-bold tracking-widest"
            style={{ 
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              color: currentMonthColor,
              letterSpacing: '0.15em'
            }}
          >
            CHIUDI
          </span>
        </button>
      )}
            </>
            );
            }