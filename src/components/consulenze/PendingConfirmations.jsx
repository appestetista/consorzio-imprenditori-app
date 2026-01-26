import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function PendingConfirmations({ userEmail }) {
  const queryClient = useQueryClient();
  const [denyDialog, setDenyDialog] = React.useState({ open: false, bookingId: null });

  // Carica le consulenze in attesa di conferma
  const { data: pendingBookings = [], isLoading } = useQuery({
    queryKey: ['pending-confirmations', userEmail],
    queryFn: async () => {
      const bookings = await base44.entities.ConsultationBooking.filter({
        user_email: userEmail,
        status: 'awaiting_user_confirmation'
      });
      return bookings;
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

  // Conferma la consulenza
  const confirmMutation = useMutation({
    mutationFn: async (bookingId) => {
      const booking = pendingBookings.find(b => b.id === bookingId);
      if (!booking) return;

      // Trova l'utente per aggiornare consulenze_usate
      const users = await base44.entities.User.filter({ email: userEmail });
      if (users.length > 0) {
        const user = users[0];
        const currentUsed = user.consulenze_usate || [];
        await base44.entities.User.update(user.id, {
          consulenze_usate: [...currentUsed, bookingId]
        });
      }

      // Decrementa le consultazioni assegnate
      const assignment = assignments.find(a => a.consultant_id === booking.consultant_id && a.is_assigned);
      if (assignment && assignment.available_consultations > 0) {
        await base44.entities.ConsultantAssignment.update(assignment.id, {
          available_consultations: assignment.available_consultations - 1
        });
      }

      // Aggiorna lo stato della prenotazione
      await base44.entities.ConsultationBooking.update(bookingId, {
        status: 'completed',
        completed_date: new Date().toISOString(),
        user_confirmed_at: new Date().toISOString()
      });

      // Notifica il consulente
      const consultant = consultants.find(c => c.id === booking.consultant_id);
      if (consultant) {
        await base44.entities.Notification.create({
          user_email: consultant.email,
          type: 'consultation',
          title: 'Consulenza confermata',
          content: `L'utente ha confermato che la consulenza è avvenuta.`,
          is_read: false,
          reference_id: bookingId
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-confirmations'] });
      queryClient.invalidateQueries({ queryKey: ['user-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['consultation-bookings'] });
    }
  });

  // Nega la consulenza (non è avvenuta)
  const denyMutation = useMutation({
    mutationFn: async (bookingId) => {
      const booking = pendingBookings.find(b => b.id === bookingId);
      if (!booking) return;

      // Riporta lo stato a pending
      await base44.entities.ConsultationBooking.update(bookingId, {
        status: 'pending',
        consultant_confirmed_at: null
      });

      // Notifica il consulente
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

  return (
    <Card className="bg-orange-500/10 border-orange-500/50 mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-orange-400 flex items-center gap-2 text-base">
          <Clock className="w-5 h-5" />
          Conferma Consulenze ({pendingBookings.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-slate-400 text-sm mb-3">
          I seguenti consulenti hanno segnato la consulenza come completata. Conferma se è avvenuta.
        </p>
        
        {pendingBookings.map((booking) => {
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
                  onClick={() => confirmMutation.mutate(booking.id)}
                  disabled={confirmMutation.isPending}
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
  );
}