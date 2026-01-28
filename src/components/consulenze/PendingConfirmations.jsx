import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle, XCircle, Clock, AlertTriangle, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// Mini calendario per vedere e selezionare date proposte
function DateSelectionCalendar({ proposedDates, selectedDate, onSelectDate }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    // Inizia dal mese della prima data proposta
    if (proposedDates.length > 0) {
      return new Date(proposedDates[0]);
    }
    return new Date();
  });
  
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
  
  const proposedDays = proposedDates.map(d => {
    const date = new Date(d);
    return { date, dayOnly: new Date(date.getFullYear(), date.getMonth(), date.getDate()) };
  });
  
  const selectedDay = selectedDate ? new Date(selectedDate) : null;
  if (selectedDay) selectedDay.setHours(0, 0, 0, 0);
  
  const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  
  return (
    <div className="bg-slate-700/50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0 text-slate-400"
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-white text-sm font-medium">
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
          
          const isToday = day.toDateString() === today.toDateString();
          const proposedMatch = proposedDays.find(p => p.dayOnly.toDateString() === day.toDateString());
          const isProposed = !!proposedMatch;
          const isSelected = selectedDay && day.toDateString() === selectedDay.toDateString();
          
          return (
            <button
              key={i}
              disabled={!isProposed}
              onClick={() => isProposed && onSelectDate(proposedMatch.date.toISOString())}
              className={`
                h-8 w-8 text-xs rounded flex items-center justify-center transition-all
                ${!isProposed ? 'text-slate-600 cursor-default' : 'cursor-pointer'}
                ${isSelected ? 'bg-lime-400 text-slate-900 font-bold ring-2 ring-lime-300' : ''}
                ${isProposed && !isSelected ? 'bg-blue-500 text-white font-bold hover:bg-blue-400' : ''}
                ${isToday && !isSelected && !isProposed ? 'border border-slate-500 text-slate-400' : ''}
                ${!isProposed && !isToday ? 'text-slate-600' : ''}
              `}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
      
      {/* Lista date proposte con orari */}
      <div className="mt-3 space-y-2">
        <p className="text-slate-400 text-xs">Clicca su una data per confermarla:</p>
        {proposedDates.map((dateStr, idx) => {
          const date = new Date(dateStr);
          const isSelected = selectedDate === dateStr;
          return (
            <button
              key={idx}
              onClick={() => onSelectDate(dateStr)}
              className={`w-full text-left p-2 rounded-lg transition-all ${
                isSelected 
                  ? 'bg-lime-400 text-slate-900' 
                  : 'bg-slate-600/50 text-white hover:bg-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium">
                  {date.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long' })}
                </span>
                <span className="text-sm ml-auto font-bold">
                  {date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function PendingConfirmations({ userEmail }) {
  const queryClient = useQueryClient();
  const [denyDialog, setDenyDialog] = React.useState({ open: false, bookingId: null });
  const [selectedDates, setSelectedDates] = useState({}); // { bookingId: selectedDateISO }

  // Carica le consulenze in attesa di conferma (awaiting_user_confirmation) E quelle con date proposte (dates_proposed)
  const { data: pendingBookings = [], isLoading } = useQuery({
    queryKey: ['pending-confirmations', userEmail],
    queryFn: async () => {
      const awaitingConfirmation = await base44.entities.ConsultationBooking.filter({
        user_email: userEmail,
        status: 'awaiting_user_confirmation'
      });
      const datesProposed = await base44.entities.ConsultationBooking.filter({
        user_email: userEmail,
        status: 'dates_proposed'
      });
      return [...awaitingConfirmation, ...datesProposed];
    },
    enabled: !!userEmail
  });

  // Carica i consulenti per mostrare i nomi
  const { data: consultants = [] } = useQuery({
    queryKey: ['all-consultants'],
    queryFn: () => base44.entities.Consultant.list()
  });

  // Carica gli assignment per aggiornare i contatori
  const { data: assignments = [] } = useQuery({
    queryKey: ['user-assignments', userEmail],
    queryFn: () => base44.entities.ConsultantAssignment.filter({ 
      user_email: userEmail,
      is_assigned: true 
    }),
    enabled: !!userEmail
  });

  // Conferma una data proposta
  const confirmDateMutation = useMutation({
    mutationFn: async ({ bookingId, selectedDate }) => {
      const booking = pendingBookings.find(b => b.id === bookingId);
      if (!booking) return;

      await base44.entities.ConsultationBooking.update(bookingId, {
        status: 'confirmed',
        scheduled_date: selectedDate
      });

      // Notifica il consulente
      const consultant = consultants.find(c => c.id === booking.consultant_id);
      if (consultant) {
        const formattedDate = new Date(selectedDate).toLocaleString('it-IT', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit'
        });
        await base44.entities.Notification.create({
          user_email: consultant.email,
          type: 'consultation',
          title: 'Data confermata',
          content: `L'utente ha confermato la consulenza per ${formattedDate}.`,
          is_read: false,
          reference_id: bookingId
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-confirmations'] });
      queryClient.invalidateQueries({ queryKey: ['consultation-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['user-active-bookings'] });
    }
  });

  // Conferma che la consulenza è avvenuta
  const confirmCompletedMutation = useMutation({
    mutationFn: async (bookingId) => {
      console.log('[PendingConfirmations] Confirming booking:', bookingId);
      
      // Recupera la booking direttamente dal DB per sicurezza
      const allBookings = await base44.entities.ConsultationBooking.filter({ id: bookingId });
      const booking = allBookings[0];
      
      if (!booking) {
        console.error('[PendingConfirmations] Booking not found:', bookingId);
        throw new Error('Prenotazione non trovata');
      }

      console.log('[PendingConfirmations] Booking found:', booking);

      // Aggiorna lo stato della booking a completed
      await base44.entities.ConsultationBooking.update(bookingId, {
        status: 'completed',
        completed_date: new Date().toISOString(),
        user_confirmed_at: new Date().toISOString()
      });

      console.log('[PendingConfirmations] Booking updated to completed');

      // Aggiorna consulenze_usate sull'utente
      try {
        const users = await base44.entities.User.filter({ email: userEmail });
        if (users.length > 0) {
          const user = users[0];
          const currentUsed = user.consulenze_usate || [];
          if (!currentUsed.includes(bookingId)) {
            await base44.entities.User.update(user.id, {
              consulenze_usate: [...currentUsed, bookingId]
            });
          }
        }
      } catch (e) {
        console.log('[PendingConfirmations] Error updating user consulenze_usate:', e);
      }

      // Notifica il consulente
      const consultant = consultants.find(c => c.id === booking.consultant_id);
      if (consultant?.email) {
        await base44.entities.Notification.create({
          user_email: consultant.email,
          type: 'consultation',
          title: 'Consulenza confermata',
          content: `L'utente ha confermato che la consulenza è avvenuta.`,
          is_read: false,
          reference_id: bookingId
        });
        console.log('[PendingConfirmations] Notification sent to consultant:', consultant.email);
      }
    },
    onSuccess: () => {
      console.log('[PendingConfirmations] Mutation successful, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['pending-confirmations'] });
      queryClient.invalidateQueries({ queryKey: ['user-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['consultation-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['user-active-bookings'] });
    },
    onError: (error) => {
      console.error('[PendingConfirmations] Mutation error:', error);
    }
  });

  // Nega la consulenza (non è avvenuta)
  const denyMutation = useMutation({
    mutationFn: async (bookingId) => {
      const booking = pendingBookings.find(b => b.id === bookingId);
      if (!booking) return;

      await base44.entities.ConsultationBooking.update(bookingId, {
        status: 'pending',
        consultant_confirmed_at: null
      });

      const consultant = consultants.find(c => c.id === booking.consultant_id);
      if (consultant) {
        await base44.entities.Notification.create({
          user_email: consultant.email,
          type: 'consultation',
          title: 'Consulenza non confermata',
          content: `L'utente ha indicato che la consulenza non è ancora avvenuta. La richiesta è tornata in stato "In Attesa".`,
          is_read: false,
          reference_id: bookingId
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-confirmations'] });
      queryClient.invalidateQueries({ queryKey: ['consultation-bookings'] });
      setDenyDialog({ open: false, bookingId: null });
    }
  });

  if (isLoading || pendingBookings.length === 0) return null;

  const datesProposedBookings = pendingBookings.filter(b => b.status === 'dates_proposed');
  const awaitingConfirmationBookings = pendingBookings.filter(b => b.status === 'awaiting_user_confirmation');

  return (
    <>
      {/* Date proposte da confermare */}
      {datesProposedBookings.length > 0 && (
        <Card className="bg-blue-500/10 border-blue-500/50 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-blue-400 flex items-center gap-2 text-base">
              <Calendar className="w-5 h-5" />
              Scegli una data ({datesProposedBookings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-400 text-sm">
              Il consulente ti ha proposto delle date disponibili. Seleziona quella che preferisci.
            </p>
            
            {datesProposedBookings.map((booking) => {
              const consultant = consultants.find(c => c.id === booking.consultant_id);
              const selected = selectedDates[booking.id];
              
              return (
                <div key={booking.id} className="bg-slate-800 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-bold">{consultant?.name || 'Consulente'}</h3>
                      <p className="text-lime-400 text-sm">{consultant?.category}</p>
                    </div>
                    <Badge className="bg-blue-500">Date disponibili</Badge>
                  </div>
                  
                  {booking.subject && (
                    <div className="bg-slate-900/50 rounded-lg p-2 mb-3">
                      <p className="text-slate-300 text-sm">{booking.subject}</p>
                    </div>
                  )}
                  
                  {/* Calendario con date proposte */}
                  <DateSelectionCalendar 
                    proposedDates={booking.proposed_dates || []}
                    selectedDate={selected}
                    onSelectDate={(date) => setSelectedDates(prev => ({ ...prev, [booking.id]: date }))}
                  />
                  
                  {selected && (
                    <Button
                      className="w-full mt-3 bg-lime-400 hover:bg-lime-500 text-slate-900 font-bold"
                      onClick={() => confirmDateMutation.mutate({ bookingId: booking.id, selectedDate: selected })}
                      disabled={confirmDateMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Conferma questa data
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Consulenze in attesa conferma completamento */}
      {awaitingConfirmationBookings.length > 0 && (
        <Card className="bg-orange-500/10 border-orange-500/50 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-orange-400 flex items-center gap-2 text-base">
              <Clock className="w-5 h-5" />
              Conferma Consulenze ({awaitingConfirmationBookings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-slate-400 text-sm mb-3">
              I seguenti consulenti hanno segnato la consulenza come completata. Conferma se è avvenuta.
            </p>
            
            {awaitingConfirmationBookings.map((booking) => {
              const consultant = consultants.find(c => c.id === booking.consultant_id);
              return (
                <div key={booking.id} className="bg-slate-800 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-bold">{consultant?.name || 'Consulente'}</h3>
                      <p className="text-lime-400 text-sm">{consultant?.category}</p>
                      <p className="text-slate-400 text-xs mt-1">
                        Segnata il: {new Date(booking.consultant_confirmed_at).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    <Badge className="bg-orange-500">In attesa conferma</Badge>
                  </div>
                  
                  {booking.subject && (
                    <div className="bg-slate-900/50 rounded-lg p-2 mb-3">
                      <p className="text-slate-300 text-sm">{booking.subject}</p>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-lime-400 hover:bg-lime-500 text-slate-900 font-bold"
                      onClick={() => confirmCompletedMutation.mutate(booking.id)}
                      disabled={confirmCompletedMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confermo
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-red-500 text-red-400 hover:bg-red-500/20"
                      onClick={() => setDenyDialog({ open: true, bookingId: booking.id })}
                      disabled={denyMutation.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Non è avvenuta
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>

          <AlertDialog open={denyDialog.open} onOpenChange={(open) => {
            if (!open) setDenyDialog({ open: false, bookingId: null });
          }}>
            <AlertDialogContent className="bg-slate-800 border-slate-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  Consulenza non avvenuta
                </AlertDialogTitle>
                <AlertDialogDescription className="text-slate-300">
                  Confermi che questa consulenza <strong>non è ancora avvenuta</strong>?
                  <br /><br />
                  La richiesta tornerà in stato "In Attesa" e il consulente riceverà una notifica.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-slate-700 text-white hover:bg-slate-600 border-slate-600">
                  Annulla
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-500 text-white hover:bg-red-600"
                  onClick={() => denyMutation.mutate(denyDialog.bookingId)}
                >
                  Conferma
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Card>
      )}
    </>
  );
}