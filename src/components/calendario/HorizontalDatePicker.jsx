import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar, Folder, FolderPlus, X, Pencil, ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import CartellaView from './CartellaView';
import FileStrip from './FileStrip.jsx';
import DayNotesSummaryPopup from './DayNotesSummaryPopup';

const DAYS_SHORT = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];
const DAYS_FULL = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MONTHS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
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

const MONTHS_SHORT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

export default function HorizontalDatePicker({ selectedDate, onDateSelect, onGoToToday, onMonthColorChange, onVisibleMonthChange, onVisibleDayChange, onScrollSync, scrollRef: externalScrollRef, goToTodayButton, monthNameLabel, monthLabelButton, incontriButton, showFatturato, onToggleFatturato, currentMonthColor, onClose, onOpenTools, hasSelectedTime, onFileClick, onNoteNavigate, }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  
  // Stati per cartelle
  const [showNewFolderPopup, setShowNewFolderPopup] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(null); // ID cartella da eliminare
  const [showEditPopup, setShowEditPopup] = useState(null); // Cartella da modificare
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#64748b');
  const [editFolderName, setEditFolderName] = useState('');
  const [editFolderColor, setEditFolderColor] = useState('#64748b');
  const [userEmail, setUserEmail] = useState(null);
  const queryClient = useQueryClient();

  // Colori disponibili per le cartelle
  const FOLDER_COLORS = [
    '#f59e0b', // amber
    '#3b82f6', // blue
    '#ec4899', // pink
    '#22c55e', // green
    '#a855f7', // purple
    '#ef4444', // red
    '#06b6d4', // cyan
    '#f97316', // orange
    '#14b8a6', // teal
    '#8b5cf6', // violet
    '#eab308', // yellow
    '#64748b', // slate
    '#be185d', // fuchsia
    '#0ea5e9', // sky
    '#84cc16', // lime
    '#78716c', // stone
  ];

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

  // Query cartelle
  const { data: cartelle = [] } = useQuery({
    queryKey: ['cartelle', userEmail],
    queryFn: () => base44.entities.Cartella.filter({ user_email: userEmail }),
    enabled: !!userEmail
  });

  // Query conteggio file per cartella
  const { data: tuttiFile = [] } = useQuery({
    queryKey: ['allFileCartella', userEmail],
    queryFn: () => base44.entities.FileCartella.filter({ user_email: userEmail }),
    enabled: !!userEmail
  });

  const { data: tutteNote = [] } = useQuery({
    queryKey: ['all-user-notes', userEmail],
    queryFn: () => base44.entities.Nota.filter({ user_email: userEmail }),
    enabled: !!userEmail
  });

  // Conteggio note + file con data per giorno (per badge sotto i numeri)
  const noteCountByDay = {};
  tutteNote.forEach(n => {
    if (n.data) noteCountByDay[n.data] = (noteCountByDay[n.data] || 0) + 1;
  });
  tuttiFile.forEach(f => {
    if (f.data) noteCountByDay[f.data] = (noteCountByDay[f.data] || 0) + 1;
  });

  // Mappa cartelle per popup
  const cartelleMap = {};
  cartelle.forEach(c => { cartelleMap[c.id] = c; });

  // Mappa conteggio per cartella_id
  const fileCountMap = {};
  tuttiFile.forEach(f => {
    if (f.cartella_id) fileCountMap[f.cartella_id] = (fileCountMap[f.cartella_id] || 0) + 1;
  });
  tutteNote.forEach(n => {
    if (n.cartella_id) fileCountMap[n.cartella_id] = (fileCountMap[n.cartella_id] || 0) + 1;
  });

  // Mutation crea cartella
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Cartella.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartelle'] });
      setShowNewFolderPopup(false);
      setNewFolderName('');
      setNewFolderColor('#64748b');
    }
  });

  // Mutation elimina cartella (scollega note ma non le elimina)
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // 1. Scollega le note associate (rimuovi cartella_id, la nota resta nel calendario)
      const noteCollegate = await base44.entities.Nota.filter({ cartella_id: id, user_email: userEmail });
      for (const nota of noteCollegate) {
        await base44.entities.Nota.update(nota.id, { cartella_id: null });
      }
      // 2. Elimina i FileCartella (questi sono solo dentro la cartella)
      const fileCollegati = await base44.entities.FileCartella.filter({ cartella_id: id, user_email: userEmail });
      for (const f of fileCollegati) {
        await base44.entities.FileCartella.delete(f.id);
      }
      // 3. Elimina la cartella
      return base44.entities.Cartella.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartelle'] });
      queryClient.invalidateQueries({ queryKey: ['note'] });
      queryClient.invalidateQueries({ queryKey: ['fileCartella'] });
      setShowDeletePopup(null);
    }
  });

  // Mutation modifica cartella
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Cartella.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartelle'] });
      setShowEditPopup(null);
      setEditFolderName('');
      setEditFolderColor('#64748b');
    }
  });

  

  const handleCreateFolder = () => {
    if (!newFolderName.trim() || !userEmail) return;
    createMutation.mutate({
      user_email: userEmail,
      nome: newFolderName.trim(),
      colore: newFolderColor
    });
  };

  const handleDeleteFolder = () => {
    if (showDeletePopup) {
      deleteMutation.mutate(showDeletePopup);
    }
  };

  const handleEditFolder = () => {
    if (showEditPopup && editFolderName.trim()) {
      updateMutation.mutate({
        id: showEditPopup.id,
        data: { nome: editFolderName.trim(), colore: editFolderColor }
      });
    }
  };

  const openEditPopup = (cartella) => {
    setEditFolderName(cartella.nome);
    setEditFolderColor(cartella.colore);
    setShowEditPopup(cartella);
  };
  const [deleteModeCartellaId, setDeleteModeCartellaId] = useState(null);
  const cartellaLongPressRef = useRef(null);

  const scrollRef = useRef(null);
  const todayRef = useRef(null);
  const [visibleMonth, setVisibleMonth] = useState({ name: MONTHS[today.getMonth()], year: today.getFullYear(), color: MONTH_COLORS[today.getMonth()] });
  const [bgColor, setBgColor] = useState(MONTH_COLORS[today.getMonth()]);
  const monthRefs = useRef({});
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(null); // Mese selezionato dalla barra in basso
  const [openCartella, setOpenCartella] = useState(null); // Cartella aperta in vista completa
  const [showToolsTooltip, setShowToolsTooltip] = useState(false); // Fumetto strumenti disabilitati
  const [dragOverFolderId, setDragOverFolderId] = useState(null); // Cartella evidenziata durante drag
  const [daySummaryDate, setDaySummaryDate] = useState(null); // data per popup appuntamenti
  const manualNavLockRef = useRef(false); // Blocca aggiornamento da scroll durante navigazione manuale

  // Ascolta evento drag-over da FileStrip
  useEffect(() => {
    const handler = (e) => setDragOverFolderId(e.detail?.cartellaId || null);
    document.addEventListener('file-drag-over-folder', handler);
    return () => document.removeEventListener('file-drag-over-folder', handler);
  }, []);

  // Genera tutti i giorni del mese corrente
  const getDaysInMonth = (month, year) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        day,
        date,
        dayOfWeek: date.getDay(), // 0 = Domenica, 6 = Sabato
        isToday: date.getTime() === today.getTime(),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        isSelected: selectedDate && date.toDateString() === new Date(selectedDate).toDateString()
      });
    }
    return days;
  };

  // Genera tutti i mesi dell'anno corrente (1 gen - 31 dic)
  const generateMonthsData = () => {
    const months = [];
    const displayYear = selectedDate ? new Date(selectedDate).getFullYear() : currentYear;
    
    for (let month = 0; month < 12; month++) {
      const daysInMonth = getDaysInMonth(month, displayYear);
      months.push({
        month,
        year: displayYear,
        monthName: MONTHS[month],
        color: MONTH_COLORS[month],
        days: daysInMonth
      });
    }
    return months;
  };

  const monthsData = generateMonthsData();

  // Scroll al giorno corrente quando si apre
  useEffect(() => {
    if (todayRef.current) {
      setTimeout(() => {
        todayRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }, 100);
    }
  }, []);

  // Esponi il ref dello scroll al parent per sincronizzazione
  useEffect(() => {
    if (externalScrollRef) {
      externalScrollRef.current = scrollRef.current;
    }
  }, [externalScrollRef]);

  // Observer per rilevare il mese visibile durante lo scroll - più reattivo
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      // Notifica il parent dello scroll per sincronizzazione
      if (onScrollSync) {
        onScrollSync(scrollContainer.scrollLeft);
      }

      // Blocca aggiornamenti da scroll durante navigazione manuale (click su mese/giorno)
      if (manualNavLockRef.current) return;

      const containerRect = scrollContainer.getBoundingClientRect();
      const centerX = containerRect.left + containerRect.width / 2;

      // Trova il giorno più vicino al centro dello scroll
      const dayElements = scrollContainer.querySelectorAll('[data-day-info]');
      let closestElement = null;
      let closestDistance = Infinity;

      dayElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const elCenterX = rect.left + rect.width / 2;
        const distance = Math.abs(elCenterX - centerX);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestElement = el;
        }
      });

      if (closestElement) {
        const [year, month] = closestElement.dataset.dayInfo.split('-');
        const monthIdx = parseInt(month);
        const yearInt = parseInt(year);

        // Estrai anche il giorno
        const dayMatch = closestElement.dataset.date?.split('-')[2];
        const dayNum = dayMatch ? parseInt(dayMatch) : 1;

        // Aggiorna solo se cambiato
        setVisibleMonth(prev => {
          if (prev.name !== MONTHS[monthIdx] || prev.year !== yearInt) {
            return { name: MONTHS[monthIdx], year: yearInt, color: MONTH_COLORS[monthIdx] };
          }
          return prev;
        });

        // Aggiorna anche la selezione del mese nella barra in basso (sincronizzazione)
        setSelectedMonthIdx(monthIdx);

        // Notifica il giorno visibile al parent per la barra laterale
        if (onVisibleDayChange) {
          onVisibleDayChange(dayNum, monthIdx, yearInt);
        }
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  // Aggiorna l'etichetta e la barra mesi quando selectedDate cambia (es. dal VerticalTimePicker)
  useEffect(() => {
    if (selectedDate) {
      const d = new Date(selectedDate);
      const newMonth = d.getMonth();
      const newYear = d.getFullYear();
      setVisibleMonth(prev => {
        if (prev.name !== MONTHS[newMonth] || prev.year !== newYear) {
          return { name: MONTHS[newMonth], year: newYear, color: MONTH_COLORS[newMonth] };
        }
        return prev;
      });
      // Sincronizza anche la barra mesi in basso
      setSelectedMonthIdx(newMonth);
    }
  }, [selectedDate]);

  // Aggiorna colore sfondo con transizione morbida
  useEffect(() => {
    setBgColor(visibleMonth.color);
  }, [visibleMonth.color]);

  // Notifica il colore e il mese al parent quando cambia visibleMonth (fuori dal rendering)
  const onMonthColorChangeRef = useRef(onMonthColorChange);
  const onVisibleMonthChangeRef = useRef(onVisibleMonthChange);
  onMonthColorChangeRef.current = onMonthColorChange;
  onVisibleMonthChangeRef.current = onVisibleMonthChange;

  useEffect(() => {
    if (onMonthColorChangeRef.current) {
      onMonthColorChangeRef.current(visibleMonth.color);
    }
    if (onVisibleMonthChangeRef.current) {
      const monthIdx = MONTHS.indexOf(visibleMonth.name);
      onVisibleMonthChangeRef.current(monthIdx, visibleMonth.year);
    }
  }, [visibleMonth]);

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setTimeout(() => {
      todayRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, 100);
    if (onGoToToday) onGoToToday();
  };

  const scrollToDate = (date) => {
    if (!scrollRef.current || !date) return;
    const d = new Date(date);
    const dateStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const dayElement = scrollRef.current.querySelector(`[data-date="${dateStr}"]`);
    if (dayElement) {
      dayElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  const scrollToMonth = (monthIdx) => {
    if (!scrollRef.current) return;
    // Blocca l'handler scroll durante la navigazione programmata
    manualNavLockRef.current = true;
    
    // Aggiorna subito il mese visibile e la barra
    setVisibleMonth({ name: MONTHS[monthIdx], year: selectedDate ? new Date(selectedDate).getFullYear() : currentYear, color: MONTH_COLORS[monthIdx] });
    setSelectedMonthIdx(monthIdx);
    
    const targetYear = selectedDate ? new Date(selectedDate).getFullYear() : currentYear;
    const monthElement = scrollRef.current.querySelector(`[data-month="${targetYear}-${monthIdx}"]`);
    if (monthElement) {
      monthElement.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    }
    
    // Sblocca dopo che lo smooth scroll è finito
    setTimeout(() => { manualNavLockRef.current = false; }, 800);
  };

  // Esponi la funzione goToToday e scrollToDate
  React.useEffect(() => {
    if (onGoToToday) {
      onGoToToday.current = goToToday;
      onGoToToday.scrollToDate = scrollToDate;
      onGoToToday.scrollToMonth = scrollToMonth;
    }
  }, [selectedDate, currentYear]);

  const handleDayClick = (dayData, monthData) => {
    // Se è già il giorno selezionato, non fare nulla (evita scroll/cambio involontario)
    if (selectedDate && dayData.date.toDateString() === new Date(selectedDate).toDateString()) {
      return;
    }
    
    // Blocca l'handler scroll durante il click su un giorno
    manualNavLockRef.current = true;
    
    if (onDateSelect) {
      onDateSelect(dayData.date);
    }
    // Aggiorna immediatamente l'etichetta del mese quando si clicca su un giorno
    const newMonth = dayData.date.getMonth();
    const newYear = dayData.date.getFullYear();
    setVisibleMonth({ 
      name: MONTHS[newMonth], 
      year: newYear, 
      color: MONTH_COLORS[newMonth] 
    });
    // Aggiorna anche la selezione del mese nella barra in basso
    setSelectedMonthIdx(newMonth);

    // Notifica il giorno visibile per sincronizzazione con fatturato
    if (onVisibleDayChange) {
      onVisibleDayChange(dayData.day, newMonth, newYear);
    }
    
    // Sblocca dopo un breve ritardo
    setTimeout(() => { manualNavLockRef.current = false; }, 500);
  };

  // Calcola percentuale anno trascorso
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear() + 1, 0, 1);
  const yearProgress = ((now - startOfYear) / (endOfYear - startOfYear)) * 100;
  const yearRemaining = 100 - yearProgress;
  const currentMonthIdx = now.getMonth();

  return (
    <div 
      className="overflow-hidden flex flex-col relative"
      style={{ 
        backgroundColor: `color-mix(in srgb, ${bgColor} 15%, #0f172a)`,
        transition: 'background-color 1.2s ease'
      }}
    >
      {/* Fascia file standalone orizzontale - SOPRA le cartelle */}
      <FileStrip 
        userEmail={userEmail} 
        cartelle={cartelle}
        onFileClick={(file) => onFileClick?.(file)}
        onFileDragToFolder={(fileId, cartellaId) => {
          queryClient.invalidateQueries({ queryKey: ['allFileCartella'] });
          queryClient.invalidateQueries({ queryKey: ['cartelle'] });
        }}
      />

      {/* Fascia cartelle scrollabile */}
      <div className="flex items-center gap-2 px-2 pt-1 pb-2 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* Pulsante nuova cartella */}
        <button 
          onClick={() => setShowNewFolderPopup(true)}
          className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 transition-colors"
        >
          <FolderPlus className="w-8 h-8 text-white" />
          <span className="text-[10px] text-slate-300 font-medium">Cartella</span>
        </button>
        
        {/* Cartelle dell'utente - stile cartella 3D come immagine */}
        {cartelle.map((cartella) => {
          const itemCount = fileCountMap[cartella.id] || 0;
          const hasDocuments = itemCount > 0;
          const isDragTarget = dragOverFolderId === cartella.id;
          
          return (
              <div key={cartella.id} data-cartella-id={cartella.id} className={cn(
                "relative flex-shrink-0 pt-2 pr-2 transition-transform duration-300",
                isDragTarget && "scale-125"
              )}
              onTouchStart={() => {
                if (cartellaLongPressRef.current) clearTimeout(cartellaLongPressRef.current);
                cartellaLongPressRef.current = setTimeout(() => {
                                  if (navigator.vibrate) navigator.vibrate(50);
                                  setDeleteModeCartellaId(cartella.id);
                                }, 1000);
              }}
              onTouchMove={() => {
                if (cartellaLongPressRef.current) { clearTimeout(cartellaLongPressRef.current); cartellaLongPressRef.current = null; }
              }}
              onTouchEnd={() => {
                if (cartellaLongPressRef.current) { clearTimeout(cartellaLongPressRef.current); cartellaLongPressRef.current = null; }
              }}
              >
                <button 
                  onClick={() => setOpenCartella(cartella)}
                className="flex flex-col items-center gap-1 px-0.5 rounded transition-all hover:scale-105 active:scale-95"
              >
                {/* Cartella 3D - aperta se drag target */}
                <div className={cn("relative transition-all duration-300", isDragTarget ? "w-9 h-8" : "w-7 h-6")}>
                  {/* Glow quando drag over */}
                  {isDragTarget && (
                    <div 
                      className="absolute -inset-2 rounded-lg animate-pulse"
                      style={{ boxShadow: '0 0 20px rgba(75,85,99,0.5), 0 0 40px rgba(55,65,81,0.3)' }}
                    />
                  )}

                  {/* Ombra morbida sotto */}
                  <div 
                    className="absolute bottom-0 left-0.5 right-0.5 h-1 rounded-full blur-sm opacity-40"
                    style={{ backgroundColor: '#374151' }}
                  />
                  
                  {/* Parte posteriore (dietro) - grigio scuro */}
                      <div 
                        className="absolute top-1 left-0 right-0 bottom-0.5 rounded"
                        style={{ 
                          background: 'linear-gradient(180deg, #374151 0%, #1f2937 100%)',
                          boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.15)'
                        }}
                      >
                        <div 
                          className="absolute -top-1 left-0 w-3 h-1.5 rounded-t-sm"
                          style={{ background: 'linear-gradient(180deg, #374151 0%, #2d3748 100%)' }}
                        />
                      </div>
                  
                  {/* Fogli bianchi */}
                  {hasDocuments && !isDragTarget && (
                    <>
                      <div className="absolute left-0.5 right-0.5 rounded-t-sm" style={{ top: '2px', height: '12px', background: 'linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 100%)' }} />
                      <div className="absolute left-1 right-1 rounded-t-sm" style={{ top: '4px', height: '10px', background: 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)' }} />
                    </>
                  )}
                  
                  {/* Parte frontale - abbassata se drag over (cartella aperta) - usa colore cartella */}
                  <div 
                    className="absolute left-0 right-0 bottom-0 rounded transition-all duration-300"
                    style={{ 
                      top: isDragTarget ? '65%' : '42%',
                      background: `linear-gradient(180deg, ${cartella.colore || '#4b5563'} 0%, color-mix(in srgb, ${cartella.colore || '#374151'} 80%, #000) 60%, color-mix(in srgb, ${cartella.colore || '#2d3748'} 65%, #000) 100%)`,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 2px rgba(0,0,0,0.1)',
                      transformOrigin: 'bottom center',
                      transform: isDragTarget ? 'perspective(40px) rotateX(8deg)' : 'none'
                    }}
                  >
                    <div className="absolute top-1 left-1 right-1 h-[1px] rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                  </div>

                  {/* Badge conteggio */}
                  {hasDocuments && !isDragTarget && (
                    <div className="absolute inset-0 flex items-center justify-center z-10" style={{ top: '6px' }}>
                      <span className="text-[9px] font-extrabold text-white leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">{itemCount}</span>
                    </div>
                  )}

                  {/* Freccia "entra qui" quando drag over */}
                  {isDragTarget && (
                    <div className="absolute inset-0 flex items-center justify-center z-10" style={{ top: '0px' }}>
                      <span className="text-white text-[10px] font-bold animate-bounce">↓</span>
                    </div>
                  )}
                </div>
                
                <span className={cn(
                  "text-[12px] font-medium transition-colors duration-300",
                  isDragTarget ? "text-white" : "text-slate-300"
                )}>
                  {cartella.nome.length > 6 ? cartella.nome.substring(0, 6) + '..' : cartella.nome}
                </span>
              </button>
              
              {/* X per eliminare - visibile solo dopo long press 3s */}
              {!isDragTarget && deleteModeCartellaId === cartella.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeletePopup(cartella.id);
                        setDeleteModeCartellaId(null);
                      }}
                      className="absolute top-0 right-0 w-5 h-5 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center shadow-lg animate-pulse"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  )}
            </div>
          );
        })}
      </div>

      {/* Popup nuova cartella - in alto con X */}
      {showNewFolderPopup && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 bg-black/60" onClick={() => setShowNewFolderPopup(false)}>
          <div className="bg-slate-800 rounded-xl p-5 w-80 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            {/* X per chiudere */}
            <button
              onClick={() => setShowNewFolderPopup(false)}
              className="absolute top-3 right-3 w-6 h-6 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-slate-300" />
            </button>
            
            <h3 className="text-white font-semibold text-base mb-4">Nuova Cartella</h3>
            
            {/* Nome */}
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nome cartella"
              className="w-full bg-slate-700 text-white text-sm rounded-lg px-4 py-3 mb-4 outline-none focus:ring-2 focus:ring-lime-400"
              autoFocus
            />
            
            {/* Colori - griglia più grande */}
            <div className="grid grid-cols-8 gap-2 mb-5">
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewFolderColor(color)}
                  className={cn(
                    "w-7 h-7 rounded-full transition-all",
                    newFolderColor === color && "ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-110"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            
            {/* Pulsanti */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowNewFolderPopup(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-sm"
              >
                Annulla
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-lime-500 hover:bg-lime-400 text-slate-900 text-sm font-semibold disabled:opacity-50"
              >
                Salva
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Popup modifica cartella - in alto con X */}
      {showEditPopup && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 bg-black/60" onClick={() => setShowEditPopup(null)}>
          <div className="bg-slate-800 rounded-xl p-5 w-80 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            {/* X per chiudere */}
            <button
              onClick={() => setShowEditPopup(null)}
              className="absolute top-3 right-3 w-6 h-6 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-slate-300" />
            </button>
            
            <h3 className="text-white font-semibold text-base mb-4">Modifica Cartella</h3>
            
            {/* Nome */}
            <input
              type="text"
              value={editFolderName}
              onChange={(e) => setEditFolderName(e.target.value)}
              placeholder="Nome cartella"
              className="w-full bg-slate-700 text-white text-sm rounded-lg px-4 py-3 mb-4 outline-none focus:ring-2 focus:ring-lime-400"
              autoFocus
            />
            
            {/* Colori - griglia più grande */}
            <div className="grid grid-cols-8 gap-2 mb-5">
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setEditFolderColor(color)}
                  className={cn(
                    "w-7 h-7 rounded-full transition-all",
                    editFolderColor === color && "ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-110"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            
            {/* Pulsanti */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowEditPopup(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-sm"
              >
                Annulla
              </button>
              <button
                onClick={handleEditFolder}
                disabled={!editFolderName.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-lime-500 hover:bg-lime-400 text-slate-900 text-sm font-semibold disabled:opacity-50"
              >
                Salva
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Popup conferma eliminazione - in alto con X */}
      {showDeletePopup && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 bg-black/60" onClick={() => setShowDeletePopup(null)}>
          <div className="bg-slate-800 rounded-xl p-5 w-80 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            {/* X per chiudere */}
            <button
              onClick={() => setShowDeletePopup(null)}
              className="absolute top-3 right-3 w-6 h-6 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-slate-300" />
            </button>
            
            <h3 className="text-white font-semibold text-base mb-3">⚠️ Attenzione</h3>
            <p className="text-slate-300 text-sm mb-2">
              Stai per eliminare questa cartella e i file al suo interno.
            </p>
            <p className="text-lime-400 text-xs mb-5">
              Le note salvate dal calendario NON verranno cancellate.
            </p>
            
            {/* Pulsanti */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeletePopup(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-sm"
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteFolder}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-sm font-semibold"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Pulsante Incontri rimosso da qui - ora è in basso */}
      {/* Pulsanti oggi + nome mese grande + etichetta giorno - stessa riga */}
          {(goToTodayButton || monthNameLabel || monthLabelButton) && (
            <div className="flex items-center justify-between px-2 pb-1">
              <div>
                {goToTodayButton}
              </div>
              <div>
                {monthNameLabel}
              </div>
              <div>
                {monthLabelButton}
              </div>
            </div>
          )}
      {/* Calendario orizzontale scrollabile continuo */}
      <div 
        ref={scrollRef}
        className="flex overflow-x-auto px-1 scrollbar-hide items-end flex-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {monthsData.map((monthData, monthIdx) => (
          <div 
            key={`${monthData.year}-${monthData.month}`}
            ref={(el) => monthRefs.current[`${monthData.year}-${monthData.month}`] = el}
            data-month={`${monthData.year}-${monthData.month}`}
            className="flex items-end"
          >
            {monthData.days.map((dayData, idx) => {
              const dayKey = `${monthData.year}-${String(monthData.month + 1).padStart(2, '0')}-${String(dayData.day).padStart(2, '0')}`;
              const noteCount = noteCountByDay[dayKey] || 0;

              return (
              <div
                key={`${monthData.year}-${monthData.month}-${idx}`}
                ref={dayData.isToday ? todayRef : null}
                data-day-info={`${monthData.year}-${monthData.month}`}
                data-date={`${monthData.year}-${monthData.month}-${dayData.day}`}
                onClick={() => handleDayClick(dayData, monthData)}
                className={cn(
                  "flex flex-col items-center justify-end cursor-pointer transition-all",
                  "py-1 px-1",
                  dayData.isSelected && "bg-white/5 rounded-lg"
                )}
                style={{ minWidth: '40px' }}
              >
                {/* Nome giorno abbreviato */}
                <span 
                  className={cn(
                    "text-[10px] font-semibold uppercase mb-1",
                    dayData.isToday && "animate-pulse"
                  )}
                  style={{ 
                    color: dayData.isWeekend ? '#ef4444' :
                      dayData.isSelected ? monthData.color : '#64748b'
                  }}
                >
                  {DAYS_FULL[dayData.dayOfWeek]}
                </span>

                {/* Numero del giorno */}
                <div className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-full transition-all",
                  dayData.isSelected && "border-2"
                )}
                style={{
                  borderColor: dayData.isSelected ? monthData.color : 'transparent'
                }}
                >
                  <span 
                    className={cn(
                      "text-lg font-bold leading-none",
                      dayData.isToday && !dayData.isSelected && "animate-pulse"
                    )}
                    style={{ 
                      color: dayData.isSelected ? monthData.color : '#ffffff'
                    }}
                  >
                    {dayData.day}
                  </span>
                </div>

                {/* Conteggio appuntamenti con freccettina */}
                {noteCount > 0 ? (
                  <div
                    className="flex flex-col items-center cursor-pointer mt-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDaySummaryDate(dayKey);
                    }}
                  >
                    <span className="text-[7px] leading-none" style={{ color: '#a3e635' }}>▼</span>
                    <span
                      className="text-[11px] font-bold leading-none"
                      style={{ color: '#a3e635' }}
                    >{noteCount}</span>
                  </div>
                ) : (
                  <span className="text-[11px] leading-none mt-0.5" style={{ color: 'transparent' }}>0</span>
                )}
              </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Barra mesi dell'anno - in basso */}
      <div className="pl-2 pr-2 py-1 pb-2">
        {/* Etichette mesi */}
        <div className="flex items-center mb-1">
          {MONTHS_SHORT.map((m, idx) => {
            const isPast = idx < currentMonthIdx;
            const isCurrent = idx === currentMonthIdx;
            const isSelected = selectedMonthIdx === idx;
            
            let color;
            if (isSelected) {
              color = MONTH_COLORS[idx];
            } else if (isPast) {
              color = '#334155';
            } else {
              color = '#ffffff';
            }
            
            return (
              <button
                key={idx}
                onClick={() => {
                  setSelectedMonthIdx(idx);
                  scrollToMonth(idx);
                }}
                className="flex-1 flex flex-col items-center hover:opacity-70 transition-all"
              >
                <span className="text-[10px] font-semibold" style={{ color }}>{m}</span>
                {isCurrent && !isSelected && (
                  <div className="w-3 h-[2px] rounded-full bg-white mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
        
        {/* Pulsanti: Incontri | Visione Mensile */}
        <div className="flex items-center gap-2 mt-1">
          {/* INCONTRI - a sinistra */}
          {incontriButton && (
            <div className="flex-shrink-0 flex justify-center pl-1 pr-2">
              {incontriButton}
            </div>
          )}
          
          {/* VISIONE MENSILE */}
          {onToggleFatturato && (
            <button
              onClick={onToggleFatturato}
              className="flex-1 h-8 rounded-md transition-all touch-manipulation active:scale-90 flex items-center justify-center bg-white"
            >
              <span className="text-[12px] font-bold uppercase text-black">Visione Mensile</span>
            </button>
          )}

          {/* CHIUDI - verde fluo pieno, verticale, affianco visione mensile */}
          {onClose && (
            <button
              onClick={onClose}
              className="flex-shrink-0 h-8 w-8 rounded-md transition-all touch-manipulation active:scale-90 flex items-center justify-center ml-2"
              style={{ backgroundColor: '#a3e635' }}
            >
              <X className="w-5 h-5 text-slate-900" strokeWidth={3} />
            </button>
          )}
        </div>
        </div>

      {/* Popup riepilogo appuntamenti del giorno */}
      {daySummaryDate && (
        <DayNotesSummaryPopup
          notes={tutteNote.filter(n => n.data === daySummaryDate)}
          files={tuttiFile.filter(f => f.data === daySummaryDate)}
          cartelleMap={cartelleMap}
          selectedDate={new Date(daySummaryDate + 'T00:00:00')}
          monthColor={MONTH_COLORS[parseInt(daySummaryDate.split('-')[1]) - 1]}
          onClose={() => setDaySummaryDate(null)}
          onNoteClick={(item) => {
            setDaySummaryDate(null);
            const d = item.data || item._type === 'file' ? item.data : null;
            if (d) {
              const [y, m, dd] = d.split('-').map(Number);
              const itemDate = new Date(y, m - 1, dd);
              itemDate.setHours(0, 0, 0, 0);
              if (onDateSelect) onDateSelect(itemDate);
              scrollToDate(itemDate);
              if (item.time && onNoteNavigate) onNoteNavigate(item);
            }
          }}
        />
      )}

      {/* Vista cartella aperta (full-screen overlay) */}
      {openCartella && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9998] bg-black">
          <CartellaView
            cartella={cartelle.find(c => c.id === openCartella.id) || openCartella}
            userEmail={userEmail}
            onClose={() => setOpenCartella(null)}
          />
        </div>,
        document.body
      )}
    </div>
  );
}