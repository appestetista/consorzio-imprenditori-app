import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Mail, User, Clock, CheckCircle, XCircle, Users, Plus, ChevronUp, ChevronDown, Bell, AlertTriangle, Calendar, Building2, Gift, Send, ChevronLeft, ChevronRight, MessageCircle, X, Video, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import ZoneUsersList from './ZoneUsersList';
import useNotificationSound from '../hooks/useNotificationSound';

// Mini calendario per selezionare più date (consulente propone)
function MiniCalendarMulti({ selectedDates = [], onToggleDate, maxDates = 3, scheduledDate, proposedDates = [] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    const startDayOfWeek = firstDay.getDay() || 7;
    for (let i = 1; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    
    return days;
  }, [currentMonth]);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const scheduledDay = scheduledDate ? new Date(scheduledDate) : null;
  if (scheduledDay) scheduledDay.setHours(0, 0, 0, 0);
  
  const proposedDays = proposedDates.map(d => {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    return date;
  });
  
  const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  
  return (
    <div className="bg-slate-700/50 rounded-lg p-2">
      <div className="flex items-center justify-between mb-2">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0 text-slate-400"
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-white text-xs font-medium">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0 text-slate-400"
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d, i) => (
          <div key={i} className="text-center text-slate-500 text-[10px]">{d}</div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {daysInMonth.map((day, i) => {
          if (!day) return <div key={i} />;
          
          const isPast = day < today;
          const isSelected = selectedDates.some(d => d.toDateString() === day.toDateString());
          const isScheduled = scheduledDay && day.toDateString() === scheduledDay.toDateString();
          const isProposed = proposedDays.some(d => d.toDateString() === day.toDateString());
          const isToday = day.toDateString() === today.toDateString();
          const canSelect = !isPast && !isScheduled && (isSelected || selectedDates.length < maxDates);
          
          return (
            <button
              key={i}
              disabled={isPast || isScheduled || (!isSelected && selectedDates.length >= maxDates)}
              onClick={() => canSelect && onToggleDate(day)}
              className={`
                h-6 w-6 text-[10px] rounded flex items-center justify-center transition-all
                ${isPast ? 'text-slate-600 cursor-not-allowed' : 'hover:bg-slate-600 cursor-pointer'}
                ${isSelected ? 'bg-lime-400 text-slate-900 font-bold' : ''}
                ${isScheduled ? 'bg-green-500 text-white font-bold' : ''}
                ${isProposed && !isSelected ? 'bg-blue-500/50 text-white' : ''}
                ${isToday && !isSelected && !isScheduled && !isProposed ? 'border border-lime-400/50 text-lime-400' : 'text-white'}
              `}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
      
      {scheduledDate && (
        <div className="mt-2 text-center">
          <Badge className="bg-green-500 text-white text-[10px]">
            ✓ Confermato: {new Date(scheduledDate).toLocaleDateString('it-IT')}
          </Badge>
        </div>
      )}
      
      {proposedDates.length > 0 && !scheduledDate && (
        <div className="mt-2 text-center">
          <Badge className="bg-blue-500 text-white text-[10px]">
            Date proposte: {proposedDates.length}
          </Badge>
        </div>
      )}
    </div>
  );
}

export default function ConsultantView({ user }) {
    const queryClient = useQueryClient();
    const [confirmDialog, setConfirmDialog] = useState({ open: false, bookingId: null, userEmail: null });
    const [selectedDates, setSelectedDates] = useState({}); // { bookingId: [Date, Date] }
    const [selectedTimes, setSelectedTimes] = useState({}); // { bookingId: { dateIndex: 'HH:MM' } }
    const [confirmedMeetingModes, setConfirmedMeetingModes] = useState({}); // { bookingId: 'online' | 'sede_azienda' | 'sede_consulente' }
    const [meetingModeNotes, setMeetingModeNotes] = useState({}); // { bookingId: 'nota...' }
    const { playSound } = useNotificationSound();

  // L'email può essere nel root o in data (struttura User entity)
  const userEmail = user?.email || user?.data?.email;
  
  const { data: myConsultantProfile, isLoading: isLoadingProfile, error: profileError } = useQuery({
    queryKey: ['my-consultant-profile', userEmail?.toLowerCase()],
    queryFn: async () => {
      console.log('[ConsultantView] user ricevuto:', user);
      console.log('[ConsultantView] Cercando consulente per email:', userEmail);
      const consultants = await base44.entities.Consultant.list();
      console.log('[ConsultantView] Consulenti trovati:', consultants.map(c => c.email));
      const found = consultants.find(c => c.email?.toLowerCase() === userEmail?.toLowerCase());
      console.log('[ConsultantView] Profilo trovato:', found);
      return found || null;
    },
    enabled: !!userEmail,
  });

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['consultant-bookings', myConsultantProfile?.id],
    queryFn: () => base44.entities.ConsultationBooking.filter({ consultant_id: myConsultantProfile.id }),
    enabled: !!myConsultantProfile?.id,
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: ['all-members-consultant'],
    queryFn: async () => {
      const response = await base44.functions.invoke('listMembers');
      return response.data?.users || [];
    },
  });

  // Conta messaggi non letti per il tab Utenti
  const { data: unreadMessagesCount = 0 } = useQuery({
    queryKey: ['unread-messages-count-consultant', user?.email],
    queryFn: async () => {
      const messages = await base44.entities.Message.filter({ 
        to_email: user?.email, 
        is_read: false 
      });
      return messages.length;
    },
    enabled: !!user?.email
  });

  // Subscribe real-time ai messaggi
  useEffect(() => {
    if (!user?.email) return;

    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create' && event.data?.to_email === user?.email) {
        playSound();
        queryClient.invalidateQueries({ queryKey: ['unread-messages-count-consultant', user?.email] });
        queryClient.invalidateQueries({ queryKey: ['unread-messages-from-users', user?.email] });
      }
    });

    return () => unsubscribe();
  }, [user?.email, queryClient, playSound]);

  // Proponi date al cliente
  const proposeDatesMutation = useMutation({
    mutationFn: async ({ bookingId, userEmail, proposedDates, confirmedMode, modeNote }) => {
      const updateData = { 
        status: 'dates_proposed',
        proposed_dates: proposedDates.map(d => d.toISOString())
      };
      
      if (confirmedMode) {
        updateData.confirmed_meeting_mode = confirmedMode;
      }
      if (modeNote) {
        updateData.meeting_mode_note = modeNote;
      }
      
      await base44.entities.ConsultationBooking.update(bookingId, updateData);

      // Formatta le date per la notifica
      const formattedDates = proposedDates.map(d => 
        d.toLocaleString('it-IT', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        })
      ).join(' | ');

      await base44.entities.Notification.create({
        user_email: userEmail,
        type: 'consultation',
        title: 'Date disponibili per consulenza',
        content: `${myConsultantProfile?.name || 'Il consulente'} ti ha proposto le seguenti date: ${formattedDates}. Vai in Consulenze per confermare.`,
        is_read: false,
        reference_id: bookingId
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consultant-bookings'] });
      setSelectedDates(prev => ({ ...prev, [variables.bookingId]: [] }));
      setSelectedTimes(prev => ({ ...prev, [variables.bookingId]: {} }));
      setConfirmedMeetingModes(prev => ({ ...prev, [variables.bookingId]: '' }));
      setMeetingModeNotes(prev => ({ ...prev, [variables.bookingId]: '' }));
    }
  });

  const completeConsultationMutation = useMutation({
    mutationFn: async ({ bookingId, userEmail }) => {
      await base44.entities.ConsultationBooking.update(bookingId, { 
        status: 'awaiting_user_confirmation',
        consultant_confirmed_at: new Date().toISOString()
      });

      await base44.entities.Notification.create({
        user_email: userEmail,
        type: 'consultation',
        title: 'Conferma consulenza richiesta',
        content: `${myConsultantProfile?.name || 'Il consulente'} (${myConsultantProfile?.category || ''}) ha segnato la consulenza come completata. Confermi che la consulenza è avvenuta?`,
        is_read: false,
        reference_id: bookingId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultant-bookings'] });
    }
  });

  const handleToggleDate = (bookingId, date) => {
    setSelectedDates(prev => {
      const current = prev[bookingId] || [];
      const exists = current.findIndex(d => d.toDateString() === date.toDateString());
      if (exists >= 0) {
        // Rimuovi
        const newDates = [...current];
        newDates.splice(exists, 1);
        return { ...prev, [bookingId]: newDates };
      } else if (current.length < 3) {
        // Aggiungi
        return { ...prev, [bookingId]: [...current, date] };
      }
      return prev;
    });
  };

  const handleTimeChange = (bookingId, dateIndex, time) => {
    setSelectedTimes(prev => ({
      ...prev,
      [bookingId]: {
        ...(prev[bookingId] || {}),
        [dateIndex]: time
      }
    }));
  };

  const handleSendProposedDates = (bookingId, userEmail) => {
    const dates = selectedDates[bookingId] || [];
    const times = selectedTimes[bookingId] || {};
    
    // Combina date e orari
    const proposedDatesWithTime = dates.map((date, idx) => {
      const time = times[idx] || '10:00';
      const [hours, minutes] = time.split(':');
      const newDate = new Date(date);
      newDate.setHours(parseInt(hours), parseInt(minutes));
      return newDate;
    });
    
    proposeDatesMutation.mutate({
      bookingId,
      userEmail,
      proposedDates: proposedDatesWithTime,
      confirmedMode: confirmedMeetingModes[bookingId],
      modeNote: meetingModeNotes[bookingId]
    });
  };
  
  const getMeetingModeLabel = (mode) => {
    switch(mode) {
      case 'online': return 'Online (videochiamata)';
      case 'sede_azienda': return 'In presenza nella sede aziendale';
      case 'sede_consulente': return 'In presenza presso il nostro studio';
      default: return mode;
    }
  };
  
  const getMeetingModeIcon = (mode) => {
    switch(mode) {
      case 'online': return <Video className="w-4 h-4 text-blue-400" />;
      case 'sede_azienda': return <Building2 className="w-4 h-4 text-amber-400" />;
      case 'sede_consulente': return <Briefcase className="w-4 h-4 text-purple-400" />;
      default: return null;
    }
  };

  const statusColors = {
    pending: 'bg-yellow-500',
    dates_proposed: 'bg-blue-500',
    confirmed: 'bg-green-500',
    awaiting_user_confirmation: 'bg-orange-500',
    completed: 'bg-green-600',
    cancelled: 'bg-red-500'
  };

  const statusLabels = {
    pending: 'In Attesa',
    dates_proposed: 'Date proposte',
    confirmed: 'Confermata',
    awaiting_user_confirmation: 'Attesa conferma',
    completed: 'Completata',
    cancelled: 'Annullata'
  };

  // Se il profilo consulente non è stato ancora caricato, mostra loading
  if (isLoadingProfile) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto"></div>
        <p className="text-slate-400 mt-4">Caricamento profilo consulente...</p>
      </div>
    );
  }

  // Se c'è stato un errore nel caricamento
  if (profileError) {
    console.error('[ConsultantView] Errore caricamento profilo:', profileError);
    return (
      <Card className="bg-slate-800 border-red-400/30">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-white font-bold text-lg mb-2">Errore caricamento</h3>
          <p className="text-slate-400 text-sm">
            Si è verificato un errore nel caricamento del profilo. Riprova.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Se il profilo consulente non esiste, mostra errore
  if (!myConsultantProfile) {
    return (
      <Card className="bg-slate-800 border-red-400/30">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-white font-bold text-lg mb-2">Profilo consulente non trovato</h3>
          <p className="text-slate-400 text-sm mb-2">
            Non è stato trovato un profilo consulente associato alla tua email: <span className="text-lime-400">{userEmail}</span>
          </p>
          <p className="text-slate-500 text-xs">
            Contatta l'amministrazione per verificare che il tuo profilo sia configurato correttamente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="consulenze" className="w-full">
      <TabsList className="w-full bg-slate-800 border border-slate-700 mb-4">
        <TabsTrigger value="consulenze" className="flex-1 data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900">
          <Gift className="w-4 h-4 mr-2" />
          Consulenze
          {bookings.filter(b => b.status === 'pending').length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {bookings.filter(b => b.status === 'pending').length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="utenti" className="flex-1 data-[state=active]:bg-amber-500 data-[state=active]:text-white">
          <Building2 className="w-4 h-4 mr-2" />
          Utenti
          {unreadMessagesCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {unreadMessagesCount}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="consulenze">
        <Card className="bg-slate-800 border-lime-400/30">
        <CardHeader>
          <CardTitle className="text-white">Richieste di Consulenza</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Nessuna richiesta ricevuta</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => {
                const member = allMembers.find(m => m.email === booking.user_email);
                const companyName = member?.company_name || 'Azienda';
                const referente = member?.referente || member?.full_name || '-';
                const isCompleted = booking.status === 'completed';
                const bookingSelectedDates = selectedDates[booking.id] || [];
                const bookingSelectedTimes = selectedTimes[booking.id] || {};
                
                return (
                  <div key={booking.id} className="bg-slate-700/50 rounded-lg p-3 overflow-hidden">
                    {/* Intestazione con nome azienda */}
                    <div className="flex items-start gap-2 mb-2">
                      <div className="w-10 h-10 bg-lime-400 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-slate-900" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-bold text-sm truncate">{companyName}</h3>
                        <p className="text-slate-300 text-xs truncate">
                          <User className="w-3 h-3 inline mr-1" />
                          {referente}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-white mt-1">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          <span>Richiesta: {new Date(booking.created_date).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {isCompleted && booking.completed_date && (
                          <div className="flex items-center gap-1 text-xs text-green-400 mt-0.5">
                            <CheckCircle className="w-3 h-3 flex-shrink-0" />
                            <span>Completata: {new Date(booking.completed_date).toLocaleDateString('it-IT')}</span>
                          </div>
                        )}
                      </div>
                      <Badge className={`${statusColors[booking.status]} text-white text-xs flex-shrink-0`}>
                        {statusLabels[booking.status]}
                      </Badge>
                    </div>
                    


                    {/* Mostra preferenza modalità dell'utente */}
                    {booking.meeting_preference && (
                      <div className="bg-slate-600/50 rounded-lg p-2 mb-3">
                        <p className="text-slate-400 text-xs mb-1">Preferenza utente:</p>
                        <div className="flex items-center gap-2 text-white text-sm">
                          {getMeetingModeIcon(booking.meeting_preference)}
                          <span>{getMeetingModeLabel(booking.meeting_preference)}</span>
                        </div>
                        {booking.meeting_preference === 'online' && booking.meeting_link && (
                          <a 
                            href={booking.meeting_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 text-xs hover:underline mt-1 block truncate"
                          >
                            {booking.meeting_link}
                          </a>
                        )}
                      </div>
                    )}

                    {/* Per richieste pending: mostra calendario per proporre date */}
                    {booking.status === 'pending' && (
                      <>
                        <p className="text-lime-400 text-xs mb-2 font-medium">Seleziona fino a 3 date da proporre:</p>
                        <MiniCalendarMulti 
                          selectedDates={bookingSelectedDates}
                          onToggleDate={(date) => handleToggleDate(booking.id, date)}
                          maxDates={3}
                        />
                        
                        {/* Mostra orari per date selezionate */}
                        {bookingSelectedDates.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {bookingSelectedDates.map((date, idx) => (
                              <div key={idx} className="flex items-center gap-2 bg-slate-600/50 rounded p-2">
                                <span className="text-white text-xs flex-1">
                                  {date.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' })}
                                </span>
                                <Input
                                  type="time"
                                  value={bookingSelectedTimes[idx] || '10:00'}
                                  onChange={(e) => handleTimeChange(booking.id, idx, e.target.value)}
                                  className="bg-slate-900 border-slate-600 text-white text-xs h-7 w-24"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                                  onClick={() => handleToggleDate(booking.id, date)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                            
                            {/* Conferma modalità incontro */}
                            <div className="mt-3 bg-slate-600/30 rounded-lg p-2">
                              <Label className="text-slate-300 text-xs mb-2 block">Conferma modalità incontro:</Label>
                              <RadioGroup
                                value={confirmedMeetingModes[booking.id] || booking.meeting_preference || ''}
                                onValueChange={(value) => setConfirmedMeetingModes(prev => ({
                                  ...prev,
                                  [booking.id]: value
                                }))}
                                className="space-y-1"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="online" id={`conf-online-${booking.id}`} className="border-lime-400 text-lime-400 data-[state=checked]:bg-lime-400 h-3 w-3" />
                                  <Label htmlFor={`conf-online-${booking.id}`} className="text-white text-xs flex items-center gap-1 cursor-pointer">
                                    <Video className="w-3 h-3 text-blue-400" />
                                    Online
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="sede_azienda" id={`conf-sede_azienda-${booking.id}`} className="border-lime-400 text-lime-400 data-[state=checked]:bg-lime-400 h-3 w-3" />
                                  <Label htmlFor={`conf-sede_azienda-${booking.id}`} className="text-white text-xs flex items-center gap-1 cursor-pointer">
                                    <Building2 className="w-3 h-3 text-amber-400" />
                                    Sede aziendale
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="sede_consulente" id={`conf-sede_consulente-${booking.id}`} className="border-lime-400 text-lime-400 data-[state=checked]:bg-lime-400 h-3 w-3" />
                                  <Label htmlFor={`conf-sede_consulente-${booking.id}`} className="text-white text-xs flex items-center gap-1 cursor-pointer">
                                    <Briefcase className="w-3 h-3 text-purple-400" />
                                    Nostro studio
                                  </Label>
                                </div>
                              </RadioGroup>
                              
                              {/* Campo dinamico in base alla modalità scelta */}
                              {(confirmedMeetingModes[booking.id] || booking.meeting_preference) === 'online' && (
                                <div className="mt-2">
                                  <Input
                                    placeholder="Link videocall"
                                    value={meetingModeNotes[booking.id] || ''}
                                    onChange={(e) => setMeetingModeNotes(prev => ({
                                      ...prev,
                                      [booking.id]: e.target.value
                                    }))}
                                    className="bg-slate-900 border-blue-400/50 text-white text-xs"
                                  />
                                  <p className="text-lime-400 text-[10px] mt-1">Inserisci il link per la videocall (es. Google Meet, Zoom)</p>
                                </div>
                              )}
                              
                              
                              
                              {(confirmedMeetingModes[booking.id] || booking.meeting_preference) === 'sede_consulente' && (
                                <div className="mt-2">
                                  <Textarea
                                    placeholder="Spiega brevemente perché non riuscite a raggiungerlo presso la sua sede aziendale..."
                                    value={meetingModeNotes[booking.id] || ''}
                                    onChange={(e) => setMeetingModeNotes(prev => ({
                                      ...prev,
                                      [booking.id]: e.target.value
                                    }))}
                                    className="bg-slate-900 border-purple-400/50 text-white text-xs min-h-[50px]"
                                  />
                                </div>
                              )}
                            </div>
                            
                            <Button
                              size="sm"
                              className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xs mt-2"
                              disabled={bookingSelectedDates.length === 0 || proposeDatesMutation.isPending}
                              onClick={() => handleSendProposedDates(booking.id, booking.user_email)}
                            >
                              <Send className="w-3 h-3 mr-1" />
                              Invia {bookingSelectedDates.length} data/e proposta/e
                            </Button>
                          </div>
                        )}
                      </>
                    )}

                    {/* Per date proposte: mostra le date in attesa di conferma */}
                    {booking.status === 'dates_proposed' && booking.proposed_dates && (
                      <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3 mb-3">
                        <p className="text-blue-400 text-xs font-medium mb-2">Date proposte (in attesa di conferma):</p>
                        <div className="space-y-1">
                          {booking.proposed_dates.map((date, idx) => (
                            <div key={idx} className="text-white text-sm">
                              • {new Date(date).toLocaleString('it-IT', {
                                weekday: 'short',
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Per confermate: mostra data confermata */}
                    {booking.status === 'confirmed' && booking.scheduled_date && (
                      <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 mb-3">
                        <p className="text-green-400 text-xs font-medium mb-1">Appuntamento confermato:</p>
                        <p className="text-white text-sm font-bold">
                          {new Date(booking.scheduled_date).toLocaleString('it-IT', {
                            weekday: 'long',
                            day: '2-digit',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {booking.confirmed_meeting_mode && (
                          <div className="flex items-center gap-2 text-white text-sm mt-2">
                            {getMeetingModeIcon(booking.confirmed_meeting_mode)}
                            <span>{getMeetingModeLabel(booking.confirmed_meeting_mode)}</span>
                          </div>
                        )}
                        {booking.meeting_mode_note && (
                          <p className="text-slate-300 text-xs mt-1 italic">"{booking.meeting_mode_note}"</p>
                        )}
                      </div>
                    )}

                    {/* Pulsante Completata - solo per confermate o date_proposed */}
                    {['confirmed', 'dates_proposed'].includes(booking.status) && (
                      <div className="mt-3">
                        <Button
                          size="sm"
                          className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 text-xs"
                          onClick={() => setConfirmDialog({ 
                            open: true, 
                            bookingId: booking.id, 
                            userEmail: booking.user_email 
                          })}
                          disabled={completeConsultationMutation.isPending}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Segna come Completata
                        </Button>
                      </div>
                    )}

                    {booking.status === 'awaiting_user_confirmation' && (
                      <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-2 text-center mt-2">
                        <p className="text-orange-400 text-xs font-medium">In attesa conferma utente</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="utenti">
        <ZoneUsersList 
          consultantEmail={user?.email} 
          consultantZona={myConsultantProfile?.zona}
        />
      </TabsContent>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => {
        if (!open) {
          setConfirmDialog({ open: false, bookingId: null, userEmail: null });
        }
      }}>
        <AlertDialogContent className="bg-slate-800 border-lime-400/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Conferma Completamento
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              Stai per segnare questa consulenza come completata.
              <br /><br />
              <span className="text-lime-400 font-semibold">Nota:</span> L'utente riceverà una notifica e dovrà confermare che la consulenza è effettivamente avvenuta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white hover:bg-slate-600 border-slate-600">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-lime-400 text-slate-900 hover:bg-lime-500"
              onClick={() => {
                completeConsultationMutation.mutate({ 
                  bookingId: confirmDialog.bookingId, 
                  userEmail: confirmDialog.userEmail 
                });
                setConfirmDialog({ open: false, bookingId: null, userEmail: null });
              }}
            >
              Conferma Completamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      </Tabs>
  );
}