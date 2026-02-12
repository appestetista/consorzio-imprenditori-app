import React, { useState, useRef, useEffect } from 'react';
import { Calendar, X, LayoutGrid, Plus, AudioLines } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import HorizontalDatePicker from './HorizontalDatePicker';
import VerticalTimePicker from './VerticalTimePicker';
import FatturatoBarra from './FatturatoBarra';
import WeekView from './WeekView';
import NoteEditor from './NoteEditor';
import WeekMonthDropdown from './WeekMonthDropdown';

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

export default function CalendarSideTab({ selectedDate, onDateSelect }) {
    const [isOpen, setIsOpen] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showFatturato, setShowFatturato] = useState(false);
    const [showWeekView, setShowWeekView] = useState(false);
    const [weekViewColor, setWeekViewColor] = useState(null);
    // NoteEditor dalla WeekView - orientamento normale
    const [weekNoteSlot, setWeekNoteSlot] = useState(null); // { date, time, existingNote }
    const [showWeekNoteEditor, setShowWeekNoteEditor] = useState(false);
    const weekNoteEditorSaveRef = useRef(null);
    const queryClient = useQueryClient();
  const goToTodayRef = useRef(null);
  const [currentMonthColor, setCurrentMonthColor] = useState(MONTH_COLORS[new Date().getMonth()]);
  const [visibleMonthLabel, setVisibleMonthLabel] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });
  const [visibleDay, setVisibleDay] = useState(new Date().getDate());
  const [userEmail, setUserEmail] = useState(null);
  
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
    weekSaveNoteMutation.mutate({
      ...noteData,
      dateStr: weekNoteSlot.date,
      time: weekNoteSlot.time,
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
    }
    setIsOpen(!isOpen);
  };

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
      {/* Linguetta laterale */}
      <button
        onClick={toggleCalendar}
        className={cn(
          "fixed right-0 top-1/2 -translate-y-1/2 z-40 transition-all duration-300",
          "bg-gradient-to-l from-lime-400 to-lime-500 text-slate-900",
          "rounded-l-xl shadow-lg shadow-lime-400/20",
          "flex items-center justify-center",
          "hover:pr-2 active:scale-95",
          isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
        style={{
          width: '32px',
          height: '80px',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed'
        }}
      >
        <div className="flex items-center gap-1 rotate-180">
          <Calendar className="w-4 h-4" />
          <span className="text-xs font-bold tracking-wider">DATA</span>
        </div>
      </button>

      {/* Pannello calendario - si apre dal basso */}
      <div
        className={cn(
          "fixed left-0 right-0 bottom-0 transition-all duration-300 ease-out",
          "bg-slate-900 shadow-2xl",
          isOpen ? "translate-y-0" : "translate-y-full",
          showTimePicker ? "z-[55]" : "z-50"
        )}
      >
        {/* Calendario orizzontale - senza spazio sopra */}
        <div>
          <HorizontalDatePicker
            goToTodayButton={
              new Date(selectedDate).toDateString() !== new Date().toDateString() ? (
                <button
                  onClick={() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (onDateSelect) {
                      onDateSelect(today);
                    }
                    goToTodayRef.current?.();
                  }}
                  className="px-2 py-0.5 rounded text-[10px] font-semibold text-slate-900 animate-pulse"
                  style={{ backgroundColor: currentMonthColor }}
                >
                  TORNA A OGGI
                </button>
              ) : null
            }
            monthLabelButton={
              <div className="flex items-start gap-1">
                <span 
                  className="px-2 py-0.5 rounded text-[10px] font-semibold"
                  style={{ 
                    backgroundColor: currentMonthColor,
                    color: '#0f172a'
                  }}
                >
                  {new Date(visibleMonthLabel.year, visibleMonthLabel.month).toLocaleDateString('it-IT', { month: 'short' }).toLowerCase()} {visibleMonthLabel.year}
                </span>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowTimePicker(false);
                  }}
                  className="p-0.5 rounded bg-slate-700/80 hover:bg-slate-600"
                >
                  <X className="w-4 h-4 text-slate-300" />
                </button>
              </div>
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
                backgroundColor: `color-mix(in srgb, ${weekViewColor || currentMonthColor} 6%, #0f172a)`,
                transition: 'background-color 1.2s ease, transform 0.7s ease-in-out'
              }}
            >
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
                {/* Pulsante Vista Giorno - per tornare alla vista giornaliera */}
                <div className="flex-shrink-0 flex items-center justify-center py-0.5 border-b border-slate-700/50">
                  <button
                    onClick={() => setShowWeekView(false)}
                    className="px-6 py-1 rounded-full touch-manipulation active:scale-95 transition-transform"
                    style={{ backgroundColor: weekViewColor || currentMonthColor || '#a3e635' }}
                  >
                    <span className="text-[9px] text-slate-900 font-bold uppercase">
                      ▼ Vista Giorno
                    </span>
                  </button>
                </div>
                {/* WeekView occupa tutto il resto */}
                <div className="flex-1 min-h-0">
                  <WeekView
                    selectedDate={selectedDate}
                    monthColor={currentMonthColor}
                    onMonthColorChange={setWeekViewColor}
                    onDateSelect={(date) => {
                      handleDateSelect(date);
                      setTimeout(() => {
                        if (goToTodayRef.scrollToDate) {
                          goToTodayRef.scrollToDate(date);
                        }
                      }, 100);
                    }}
                    onSlotClick={handleWeekSlotClick}
                  />
                </div>
              </div>
            </div>

            {/* NoteEditor dalla WeekView - orientamento NORMALE del telefono (non ruotato) */}
            {showWeekNoteEditor && weekNoteSlot && (
              <div className="fixed inset-0 z-[70] bg-black">
                {/* X grande per chiudere - posizionata più in basso vicino al titolo */}
                <button
                  onClick={() => { setShowWeekNoteEditor(false); setWeekNoteSlot(null); }}
                  className="absolute top-14 right-4 z-[71] w-10 h-10 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center active:scale-90 transition-transform"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
                <NoteEditor
                  key={`week-${weekNoteSlot.date}-${weekNoteSlot.time}`}
                  selectedDate={new Date(weekNoteSlot.date + 'T00:00:00')}
                  selectedTime={weekNoteSlot.time}
                  onClose={() => { setShowWeekNoteEditor(false); setWeekNoteSlot(null); }}
                  onSave={handleWeekNoteSave}
                  inline={false}
                  existingNote={weekNoteSlot.existingNote ? {
                    ...weekNoteSlot.existingNote,
                    checklistItems: weekNoteSlot.existingNote.checklist_items || [],
                    cartella_id: weekNoteSlot.existingNote.cartella_id || ''
                  } : null}
                  onRegisterSave={(saveFn) => { weekNoteEditorSaveRef.current = saveFn; }}
                />
              </div>
            )}

      {/* Pannello orari - copre TUTTO lo spazio sopra il calendario fino in fondo */}
            {isOpen && showTimePicker && selectedDate && (
        <div 
          className="fixed inset-0 z-[60] bg-slate-900 flex flex-col"
          style={{ bottom: showFatturato ? '340px' : '220px' }}
        >
          <VerticalTimePicker 
            selectedDate={selectedDate}
            visibleDay={visibleDay}
            visibleMonth={visibleMonthLabel.month}
            visibleYear={visibleMonthLabel.year}
            onClose={() => setShowTimePicker(false)}
            onTimeSelect={handleTimeSelect}
            onDateChange={(newDate) => {
              if (onDateSelect) {
                onDateSelect(newDate);
              }
              // Scrolla anche il calendario orizzontale alla nuova data
              setTimeout(() => {
                if (goToTodayRef.scrollToDate) {
                  goToTodayRef.scrollToDate(newDate);
                }
              }, 100);
            }}
            monthColor={currentMonthColor}
          />
        </div>
      )}

      {/* Overlay scuro quando il calendario è aperto */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900 z-40"
          onClick={() => {
            setIsOpen(false);
            setShowTimePicker(false);
          }}
        />
      )}
    </>
  );
}