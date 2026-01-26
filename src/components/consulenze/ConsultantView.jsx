import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Mail, User, Clock, CheckCircle, XCircle, Users, Plus, ChevronUp, ChevronDown, Bell, AlertTriangle, Calendar, Building2, Gift, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import ZoneUsersList from './ZoneUsersList';

// Mini calendario per selezionare data consulenza
function MiniCalendar({ selectedDate, onSelectDate, scheduledDate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Aggiungi giorni vuoti per allineamento
    const startDayOfWeek = firstDay.getDay() || 7; // Lunedì = 1
    for (let i = 1; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Aggiungi i giorni del mese
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    
    return days;
  }, [currentMonth]);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const scheduledDay = scheduledDate ? new Date(scheduledDate) : null;
  if (scheduledDay) scheduledDay.setHours(0, 0, 0, 0);
  
  const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  
  return (
    <div className="bg-slate-700/50 rounded-lg p-2">
      {/* Header mese */}
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
      
      {/* Giorni settimana */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d, i) => (
          <div key={i} className="text-center text-slate-500 text-[10px]">{d}</div>
        ))}
      </div>
      
      {/* Griglia giorni */}
      <div className="grid grid-cols-7 gap-1">
        {daysInMonth.map((day, i) => {
          if (!day) return <div key={i} />;
          
          const isPast = day < today;
          const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();
          const isScheduled = scheduledDay && day.toDateString() === scheduledDay.toDateString();
          const isToday = day.toDateString() === today.toDateString();
          
          return (
            <button
              key={i}
              disabled={isPast || isScheduled}
              onClick={() => !isPast && !isScheduled && onSelectDate(isSelected ? null : day)}
              className={`
                h-6 w-6 text-[10px] rounded flex items-center justify-center transition-all
                ${isPast ? 'text-slate-600 cursor-not-allowed' : 'hover:bg-slate-600 cursor-pointer'}
                ${isSelected ? 'bg-lime-400 text-slate-900 font-bold' : ''}
                ${isScheduled ? 'bg-blue-500 text-white font-bold' : ''}
                ${isToday && !isSelected && !isScheduled ? 'border border-lime-400/50 text-lime-400' : 'text-white'}
              `}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
      
      {scheduledDate && (
        <div className="mt-2 text-center">
          <Badge className="bg-blue-500 text-white text-[10px]">
            Appuntamento: {new Date(scheduledDate).toLocaleDateString('it-IT')}
          </Badge>
        </div>
      )}
    </div>
  );
}

export default function ConsultantView({ user }) {
    const queryClient = useQueryClient();
    const [creditsInput, setCreditsInput] = useState({});
    const [activeTab, setActiveTab] = useState('users'); // 'users' o 'requests'
    const [confirmDialog, setConfirmDialog] = useState({ open: false, bookingId: null, userEmail: null });
    const [selectedDates, setSelectedDates] = useState({}); // { bookingId: Date }
    const [selectedTimes, setSelectedTimes] = useState({}); // { bookingId: 'HH:MM' }

  const { data: myConsultantProfile } = useQuery({
    queryKey: ['my-consultant-profile', user?.email],
    queryFn: async () => {
      const consultants = await base44.entities.Consultant.list();
      return consultants.find(c => c.email === user?.email);
    },
    enabled: !!user?.email,
  });

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['consultant-bookings', myConsultantProfile?.id],
    queryFn: () => base44.entities.ConsultationBooking.filter({ consultant_id: myConsultantProfile.id }),
    enabled: !!myConsultantProfile?.id,
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: ['all-members-consultant'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users;
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['consultant-assignments', myConsultantProfile?.id],
    queryFn: async () => {
      if (!myConsultantProfile?.id) return [];
      const existingAssignments = await base44.entities.ConsultantAssignment.filter({ 
        consultant_id: myConsultantProfile.id 
      });
      
      // Crea automaticamente assignment per membri che non ne hanno
      const users = await base44.entities.User.list();
      for (const user of users) {
        const hasAssignment = existingAssignments.some(a => a.user_email === user.email);
        if (!hasAssignment) {
          await base44.entities.ConsultantAssignment.create({
            user_email: user.email,
            consultant_id: myConsultantProfile.id,
            available_consultations: 1,
            is_assigned: true
          });
        }
      }
      
      // Ricarica tutti gli assignment dopo la creazione
      return await base44.entities.ConsultantAssignment.filter({ 
        consultant_id: myConsultantProfile.id 
      });
    },
    enabled: !!myConsultantProfile?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status }) => {
      await base44.entities.ConsultationBooking.update(bookingId, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultant-bookings'] });
    }
  });

  const scheduleConsultationMutation = useMutation({
    mutationFn: async ({ bookingId, userEmail, scheduledDate }) => {
      await base44.entities.ConsultationBooking.update(bookingId, { 
        status: 'confirmed',
        scheduled_date: scheduledDate
      });

      // Notifica all'utente con data/ora programmata
      const formattedDate = new Date(scheduledDate).toLocaleString('it-IT', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      await base44.entities.Notification.create({
        user_email: userEmail,
        type: 'consultation',
        title: 'Consulenza confermata',
        content: `${myConsultantProfile?.name || 'Il consulente'} (${myConsultantProfile?.category || ''}) ha confermato la tua consulenza per ${formattedDate}.`,
        is_read: false,
        reference_id: bookingId
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consultant-bookings'] });
      // Reset selected date/time per questo booking
      setSelectedDates(prev => ({ ...prev, [variables.bookingId]: null }));
      setSelectedTimes(prev => ({ ...prev, [variables.bookingId]: '' }));
    }
  });

  const completeConsultationMutation = useMutation({
    mutationFn: async ({ bookingId, userEmail }) => {
      // Aggiorna lo stato della prenotazione - in attesa conferma utente
      await base44.entities.ConsultationBooking.update(bookingId, { 
        status: 'awaiting_user_confirmation',
        consultant_confirmed_at: new Date().toISOString()
      });

      // Invia notifica all'utente per confermare la consulenza
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
      queryClient.invalidateQueries({ queryKey: ['consultant-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['all-members-consultant'] });
    }
  });

  const recalculateTotalConsultations = async (userEmail) => {
    const allAssignments = await base44.entities.ConsultantAssignment.filter({ 
      user_email: userEmail,
      is_assigned: true 
    });
    const total = allAssignments.reduce((sum, a) => sum + (a.available_consultations || 0), 0);
    
    const users = await base44.entities.User.filter({ email: userEmail });
    if (users.length > 0) {
      await base44.entities.User.update(users[0].id, {
        consulenze_gratuite_totali: total
      });
    }
  };

  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ assignmentId, userEmail, newValue }) => {
      await base44.entities.ConsultantAssignment.update(assignmentId, { 
        available_consultations: newValue 
      });
      await recalculateTotalConsultations(userEmail);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultant-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['all-members-consultant'] });
    }
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async ({ userEmail, consultantId, value }) => {
      await base44.entities.ConsultantAssignment.create({
        user_email: userEmail,
        consultant_id: consultantId,
        available_consultations: value,
        is_assigned: true
      });
      await recalculateTotalConsultations(userEmail);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultant-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['all-members-consultant'] });
    }
  });

  const handleIncrement = (userEmail, currentCredits, assignment) => {
    if (assignment) {
      updateAssignmentMutation.mutate({ 
        assignmentId: assignment.id, 
        userEmail, 
        newValue: currentCredits + 1 
      });
    } else {
      createAssignmentMutation.mutate({ 
        userEmail, 
        consultantId: myConsultantProfile.id, 
        value: 1 
      });
    }
  };

  const handleDecrement = (userEmail, currentCredits, assignment) => {
    if (currentCredits > 0 && assignment) {
      updateAssignmentMutation.mutate({ 
        assignmentId: assignment.id, 
        userEmail, 
        newValue: currentCredits - 1 
      });
    }
  };

  const statusColors = {
    pending: 'bg-yellow-500',
    confirmed: 'bg-blue-500',
    awaiting_user_confirmation: 'bg-orange-500',
    completed: 'bg-green-600',
    cancelled: 'bg-red-500'
  };

  const statusLabels = {
    pending: 'In Attesa',
    confirmed: 'Confermata',
    awaiting_user_confirmation: 'In attesa conferma utente',
    completed: 'Completata',
    cancelled: 'Annullata'
  };

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
        </TabsTrigger>
      </TabsList>

      <TabsContent value="consulenze">
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-lime-400/30 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-lime-400 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-slate-900" />
                </div>
                <div>
                  <h2 className="text-white text-xl font-bold">{myConsultantProfile?.name || 'Consulente'}</h2>
                  <p className="text-lime-400 text-sm">{myConsultantProfile?.category}</p>
                </div>
              </div>
              <div className="relative">
                <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                  <Bell className="w-5 h-5 text-lime-400" />
                </div>
                {bookings.filter(b => b.status === 'pending').length > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{bookings.filter(b => b.status === 'pending').length}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

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
                const displayName = member?.company_name || member?.full_name || booking.user_email;
                const isCompleted = booking.status === 'completed';
                return (
                  <div key={booking.id} className="bg-slate-700/50 rounded-lg p-3 overflow-hidden">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="w-9 h-9 bg-lime-400 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-slate-900 font-bold text-xs">
                          {displayName[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-bold text-sm truncate">{displayName}</h3>
                        <p className="text-slate-400 text-xs truncate">{booking.user_email}</p>
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          <span>Richiesta: {new Date(booking.created_date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                        </div>
                        {isCompleted && booking.completed_date && (
                          <div className="flex items-center gap-1 text-xs text-green-400 mt-0.5">
                            <CheckCircle className="w-3 h-3 flex-shrink-0" />
                            <span>Completata: {new Date(booking.completed_date).toLocaleDateString('it-IT')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mb-2">
                      <Badge className={`${statusColors[booking.status]} text-white text-xs`}>
                        {statusLabels[booking.status]}
                      </Badge>
                    </div>
                    {/* Messaggio utente */}
                    <div className="bg-slate-600 rounded-lg px-3 py-2 mb-3">
                      <p className="text-white text-sm">{booking.subject}</p>
                    </div>

                    {/* Mini Calendario per programmare o vedere appuntamento */}
                    <MiniCalendar 
                      selectedDate={selectedDates[booking.id]}
                      onSelectDate={(date) => setSelectedDates(prev => ({ ...prev, [booking.id]: date }))}
                      scheduledDate={booking.scheduled_date}
                    />

                    {/* Se è selezionato un giorno, mostra selezione ora */}
                    {selectedDates[booking.id] && booking.status === 'pending' && (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={selectedTimes[booking.id] || ''}
                            onChange={(e) => setSelectedTimes(prev => ({ ...prev, [booking.id]: e.target.value }))}
                            className="bg-slate-900 border-slate-600 text-white text-sm h-8 flex-1"
                          />
                        </div>
                        <Button
                          size="sm"
                          className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xs"
                          disabled={!selectedTimes[booking.id] || scheduleConsultationMutation.isPending}
                          onClick={() => {
                            const date = selectedDates[booking.id];
                            const [hours, minutes] = selectedTimes[booking.id].split(':');
                            date.setHours(parseInt(hours), parseInt(minutes));
                            scheduleConsultationMutation.mutate({
                              bookingId: booking.id,
                              userEmail: booking.user_email,
                              scheduledDate: date.toISOString()
                            });
                          }}
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Invia Data Proposta
                        </Button>
                      </div>
                    )}

                    {/* Pulsante Completata */}
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
                        Completata
                      </Button>
                    </div>

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
              <span className="text-lime-400 font-semibold">Nota:</span> L'utente riceverà una notifica e dovrà confermare che la consulenza è effettivamente avvenuta. Solo dopo la sua conferma verrà decrementato il contatore delle consulenze gratuite.
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