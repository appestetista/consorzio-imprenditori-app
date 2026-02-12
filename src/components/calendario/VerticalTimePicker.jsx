import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus, FileText, X, CalendarOff, ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NoteEditor from './NoteEditor';
import DayNotesSummaryPopup from './DayNotesSummaryPopup';

export default function VerticalTimePicker({ selectedDate, visibleDay, visibleMonth, visibleYear, onClose, onTimeSelect, onDateChange, monthColor = '#a3e635' }) {
  const scrollRef = useRef(null);
  const currentHourRef = useRef(null);
  const isScrollingRef = useRef(false);
  const lastScrollTop = useRef(0);
  const [selectedTime, setSelectedTime] = useState(null);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // timeString della nota da eliminare
  const [showDaySummary, setShowDaySummary] = useState(false);
    const noteEditorSaveRef = useRef(null);
    const queryClient = useQueryClient();

  // Carica utente
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setUserEmail(user?.email);
      } catch (e) {}
    };
    loadUser();
  }, []);

  // Genera tutte le ore del giorno con intervalli di 5 minuti
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const isFullHour = minute === 0;
        const isHalfHour = minute === 30;
        const isQuarterHour = minute === 15 || minute === 45;
        
        slots.push({
          hour,
          minute,
          timeString,
          isFullHour,
          isHalfHour,
          isQuarterHour
        });
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Data corrente per query
  const dateForQuery = selectedDate 
    ? `${new Date(selectedDate).getFullYear()}-${String(new Date(selectedDate).getMonth() + 1).padStart(2, '0')}-${String(new Date(selectedDate).getDate()).padStart(2, '0')}`
    : null;

  // Query note dal database per il giorno selezionato
  const { data: noteDelGiorno = [] } = useQuery({
    queryKey: ['note', userEmail, dateForQuery],
    queryFn: () => base44.entities.Nota.filter({ user_email: userEmail, data: dateForQuery }),
    enabled: !!userEmail && !!dateForQuery
  });

  // Query file delle cartelle con data corrispondente
  const { data: fileDelGiorno = [] } = useQuery({
    queryKey: ['fileCartella-day', userEmail, dateForQuery],
    queryFn: () => base44.entities.FileCartella.filter({ user_email: userEmail, data: dateForQuery }),
    enabled: !!userEmail && !!dateForQuery
  });

  // Query cartelle per mostrare nome/colore
  const { data: cartelle = [] } = useQuery({
    queryKey: ['cartelle', userEmail],
    queryFn: () => base44.entities.Cartella.filter({ user_email: userEmail }),
    enabled: !!userEmail
  });

  // Mappa file cartella per orario
  const cartellaFiles = {};
  fileDelGiorno.forEach(f => {
    const t = f.time || '00:00';
    if (!cartellaFiles[t]) cartellaFiles[t] = [];
    cartellaFiles[t].push(f);
  });

  // Mappa cartelle per id
  const cartelleMap = {};
  cartelle.forEach(c => { cartelleMap[c.id] = c; });

  // Mappa note per orario
  const savedNotes = {};
  noteDelGiorno.forEach(nota => {
    savedNotes[nota.time] = nota;
  });

  // Mutation salva nota
  const saveNoteMutation = useMutation({
    mutationFn: async (noteData) => {
      const existing = noteDelGiorno.find(n => n.time === noteData.time);
      if (existing) {
        return base44.entities.Nota.update(existing.id, {
          title: noteData.title,
          content: noteData.content || '',
          attachments: noteData.attachments || [],
          checklist_items: noteData.checklistItems || [],
          cartella_id: noteData.cartella_id || null
        });
      } else {
        return base44.entities.Nota.create({
          user_email: userEmail,
          data: dateForQuery,
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
      queryClient.invalidateQueries({ queryKey: ['note', userEmail, dateForQuery] });
    }
  });

  // Mutation elimina nota
  const deleteNoteMutation = useMutation({
    mutationFn: (notaId) => base44.entities.Nota.delete(notaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', userEmail, dateForQuery] });
      setDeleteConfirm(null);
    }
  });

  // Mutation rimuovi file dal calendario (togli data/time ma resta in cartella)
  const removeFileFromCalendarMutation = useMutation({
    mutationFn: (fileId) => base44.entities.FileCartella.update(fileId, { data: null, time: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fileCartella-day'] });
      queryClient.invalidateQueries({ queryKey: ['allFileCartella'] });
    }
  });

  // Colori per mese
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

  // Determina se è oggi
  const today = new Date();
  const displayDay = visibleDay || (selectedDate ? new Date(selectedDate).getDate() : today.getDate());
  const displayMonth = visibleMonth !== undefined ? visibleMonth : (selectedDate ? new Date(selectedDate).getMonth() : today.getMonth());
  const displayYear = visibleYear || (selectedDate ? new Date(selectedDate).getFullYear() : today.getFullYear());
  
  const isToday = displayDay === today.getDate() && displayMonth === today.getMonth() && displayYear === today.getFullYear();
  
  // Colore basato sul mese visibile (non selezionato)
  const currentMonthColor = MONTH_COLORS[displayMonth];
  
  // Colore da usare: lime se oggi, colore del mese altrimenti
  const activeColor = isToday ? '#a3e635' : currentMonthColor;

  // Scroll all'ora corrente quando è oggi (all'apertura o quando si torna a oggi)
  useEffect(() => {
    if (isToday && currentHourRef.current) {
      setTimeout(() => {
        currentHourRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [isToday, selectedDate]);

  // Gestisce il ciclo continuo: quando si raggiunge il top o il bottom, cambia giorno
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      if (isScrollingRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const scrollBottom = scrollHeight - scrollTop - clientHeight;
      
      // Se siamo arrivati in fondo (scrollando verso il basso)
      if (scrollBottom < 10 && scrollTop > lastScrollTop.current) {
        isScrollingRef.current = true;
        
        // Passa al giorno successivo
        if (onDateChange && selectedDate) {
          const nextDay = new Date(selectedDate);
          nextDay.setDate(nextDay.getDate() + 1);
          onDateChange(nextDay);
          
          // Riposiziona in alto dopo il cambio data
          setTimeout(() => {
            scrollContainer.scrollTop = 50;
            isScrollingRef.current = false;
          }, 50);
        } else {
          isScrollingRef.current = false;
        }
      }
      // Se siamo arrivati in cima (scrollando verso l'alto)
      else if (scrollTop < 10 && scrollTop < lastScrollTop.current) {
        isScrollingRef.current = true;
        
        // Passa al giorno precedente
        if (onDateChange && selectedDate) {
          const prevDay = new Date(selectedDate);
          prevDay.setDate(prevDay.getDate() - 1);
          onDateChange(prevDay);
          
          // Riposiziona in basso dopo il cambio data
          setTimeout(() => {
            scrollContainer.scrollTop = scrollHeight - clientHeight - 50;
            isScrollingRef.current = false;
          }, 50);
        } else {
          isScrollingRef.current = false;
        }
      }
      
      lastScrollTop.current = scrollTop;
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [selectedDate, onDateChange]);

  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();
  
  // Trova lo slot corrente (arrotondato ai 5 minuti)
  const currentSlotMinute = Math.floor(currentMinute / 5) * 5;

  const handleTimeClick = (slot) => {
    // Se c'è un popup di conferma eliminazione aperto, non fare nulla
    if (deleteConfirm) return;

    // Se clicco sullo stesso orario già aperto: salva e chiudi
    if (selectedTime === slot.timeString && showNoteEditor) {
      // Trigger salvataggio tramite ref
      if (noteEditorSaveRef.current) {
        noteEditorSaveRef.current();
      }
      setShowNoteEditor(false);
      setSelectedTime(null);
      return;
    }

    // Apri l'editor (sia per note esistenti che nuove)
    setSelectedTime(slot.timeString);
    setShowNoteEditor(true);

    if (onTimeSelect) {
      onTimeSelect(slot.timeString);
    }
  };

  const formattedDate = selectedDate 
    ? new Date(selectedDate).toLocaleDateString('it-IT', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short' 
      })
    : '';

  // Formatta la data per la fascia laterale
  const formattedDayNumber = selectedDate ? new Date(selectedDate).getDate() : '';
  const formattedMonth = selectedDate ? new Date(selectedDate).toLocaleDateString('it-IT', { month: 'short' }).toLowerCase() : '';

  // Formatta la data completa per la fascia laterale
  const displayDate = new Date(displayYear, displayMonth, displayDay);

  const formattedFullDate = `${displayDate.toLocaleDateString('it-IT', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })} ( ${displayDate.toLocaleDateString('it-IT', { weekday: 'long' })} )`;

  const handleNoteSave = (noteData) => {
    saveNoteMutation.mutate(noteData);
    setShowNoteEditor(false);
    setSelectedTime(null);
  };

  return (
    <div className="bg-slate-900 w-full flex h-full overflow-hidden">
      {/* Fascia verticale con data completa ruotata */}
      <div 
        className="flex flex-col items-center border-r border-slate-700"
        style={{ 
          backgroundColor: `color-mix(in srgb, ${currentMonthColor} 6%, #0f172a)`,
          transition: 'background-color 1.2s ease',
          minWidth: '32px'
        }}
      >
        {/* Data ruotata */}
        <div className="flex-1 flex items-center justify-center">
          <div 
            className="text-base font-bold whitespace-nowrap"
            style={{ 
              color: activeColor,
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)'
            }}
          >
            {formattedFullDate}
          </div>
          {/* Freccetta verde per riepilogo note del giorno */}
          {noteDelGiorno.length > 0 && (
            <button
              onClick={() => setShowDaySummary(true)}
              className="mt-2 flex items-center justify-center animate-pulse"
            >
              <ChevronDown className="w-5 h-5" style={{ color: '#a3e635', filter: 'drop-shadow(0 0 4px #a3e635)' }} />
            </button>
          )}
        </div>
      </div>

      {/* Lista orari scrollabile verticale */}
      <div 
        ref={scrollRef}
        className={cn(
          "overflow-y-auto scrollbar-hide px-4 py-2 min-h-0 transition-all",
          showNoteEditor ? "w-[100px] flex-shrink-0" : "flex-1"
        )}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {timeSlots.map((slot, idx) => {
          const isCurrentTime = slot.hour === currentHour && 
            slot.minute === currentSlotMinute;

          const isSelected = selectedTime === slot.timeString;
          const note = savedNotes[slot.timeString];
          const hasNote = !!note;
          const hasCartellaFile = !hasNote && cartellaFiles[slot.timeString]?.length > 0;

          return (
            <div
              key={idx}
              ref={isCurrentTime ? currentHourRef : null}
              data-time={slot.timeString}
              onClick={() => handleTimeClick(slot)}
              className={cn(
                "flex items-center cursor-pointer transition-all hover:bg-slate-700 rounded px-2",
                slot.isFullHour ? "h-10" : "h-6",
                isSelected && "bg-slate-700/50",
                hasNote && "bg-slate-800/60",
                hasCartellaFile && "bg-slate-800/40"
                )}
                style={{
                backgroundColor: isSelected ? 'rgba(100, 100, 100, 0.3)' : 
                  hasNote ? 'rgba(163, 230, 53, 0.08)' : 
                  hasCartellaFile ? `color-mix(in srgb, ${cartelleMap[cartellaFiles[slot.timeString]?.[0]?.cartella_id]?.colore || '#64748b'} 8%, transparent)` : undefined
                }}
            >
              {/* Pulsante + giallo se selezionato, altrimenti linea o icona nota */}
              {isSelected && !hasNote ? (
                <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center mr-2 animate-pulse shadow-lg shadow-amber-500/40">
                  <Plus className="w-4 h-4 text-white" />
                </div>
              ) : hasNote ? (
                <button
                  className="flex-shrink-0 mr-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTime(slot.timeString);
                    setShowNoteEditor(true);
                  }}
                >
                  <FileText className="w-4 h-4 text-lime-400" />
                </button>
              ) : (
                <div className="flex items-center mr-2">
                  {(isCurrentTime && isToday) ? (
                    <div 
                      className="h-[2px] rounded-full animate-pulse flex-shrink-0"
                      style={{ 
                        width: slot.isFullHour ? '20px' : '10px',
                        backgroundColor: '#ffffff' 
                      }}
                    />
                  ) : (
                    <div 
                      className="h-[2px] rounded-full"
                      style={{ 
                        width: slot.isFullHour ? '20px' : '10px',
                        backgroundColor: slot.isFullHour ? activeColor : '#475569'
                      }}
                    />
                  )}
                </div>
              )}

              {/* Orario */}
              <span 
                className={cn(
                  "font-mono text-xs flex-shrink-0",
                  slot.isFullHour && "font-bold",
                  (isCurrentTime && isToday) && "text-white font-bold animate-pulse"
                )}
                style={{
                  color: (isCurrentTime && isToday) ? '#ffffff' :
                    hasNote ? '#a3e635' :
                    slot.isFullHour ? activeColor : '#94a3b8'
                }}
              >
                {slot.timeString}
              </span>

              {/* Titolo nota salvata + X per eliminare */}
              {hasNote && (
                <div className="ml-2 flex items-center gap-1 flex-1 min-w-0">
                  <span className="text-xs truncate" style={{ color: note.cartella_id && cartelleMap[note.cartella_id] ? cartelleMap[note.cartella_id].colore : currentMonthColor }}>
                    📄 {note.title}
                    {note.cartella_id && cartelleMap[note.cartella_id] && (
                      <span style={{ color: cartelleMap[note.cartella_id].colore }}> / cartella {cartelleMap[note.cartella_id].nome}</span>
                    )}
                    {(note.content || note.checklist_items?.length > 0 || note.attachments?.length > 0) && (
                      <span className="ml-1" style={{ color: note.cartella_id && cartelleMap[note.cartella_id] ? cartelleMap[note.cartella_id].colore + '99' : currentMonthColor + '99' }}>•••</span>
                    )}
                  </span>
                  <button
                    onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteConfirm(slot.timeString); }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteConfirm(slot.timeString); }}
                    className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center ml-auto touch-manipulation"
                  >
                    <X className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              )}

              {/* File da cartelle con data corrispondente */}
              {!hasNote && cartellaFiles[slot.timeString]?.map((cf, cfIdx) => {
                const cart = cartelleMap[cf.cartella_id];
                return (
                  <div key={cfIdx} className="ml-2 flex items-center gap-1 flex-1 min-w-0">
                    <div 
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: cart?.colore || '#64748b' }}
                    />
                    <span className="text-xs truncate" style={{ color: cart?.colore || '#94a3b8' }}>
                      📁 {cf.titolo} / cartella {cart?.nome || ''}
                    </span>
                    <button
                      onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); removeFileFromCalendarMutation.mutate(cf.id); }}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFileFromCalendarMutation.mutate(cf.id); }}
                      className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500/20 hover:bg-orange-500/40 flex items-center justify-center ml-auto touch-manipulation"
                      title="Rimuovi dal calendario"
                    >
                      <CalendarOff className="w-3 h-3 text-orange-400" />
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Popup conferma eliminazione */}
      {deleteConfirm && savedNotes[deleteConfirm] && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-slate-800 rounded-xl p-5 w-72 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-semibold text-base mb-2">⚠️ Eliminare nota?</h3>
            <p className="text-slate-300 text-sm mb-1">
              <span className="font-semibold text-lime-400">{savedNotes[deleteConfirm].title}</span>
            </p>
            <p className="text-slate-400 text-xs mb-5">
              Questa azione non può essere annullata.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-sm"
              >
                Annulla
              </button>
              <button
                onClick={() => deleteNoteMutation.mutate(savedNotes[deleteConfirm].id)}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-sm font-semibold"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pannello NoteEditor affiancato a destra */}
      {showNoteEditor && (
        <div className="flex-1 border-l border-slate-700 overflow-hidden">
          <NoteEditor 
              key={selectedTime}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onClose={() => { setShowNoteEditor(false); setSelectedTime(null); }}
              onSave={handleNoteSave}
              inline={true}
              existingNote={savedNotes[selectedTime] ? {
                ...savedNotes[selectedTime],
                checklistItems: savedNotes[selectedTime].checklist_items || [],
                cartella_id: savedNotes[selectedTime].cartella_id || ''
              } : null}
              onRegisterSave={(saveFn) => { noteEditorSaveRef.current = saveFn; }}
            />
        </div>
      )}
    </div>
  );
}