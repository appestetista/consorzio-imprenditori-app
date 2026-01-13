import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Mail, User, Clock, CheckCircle, XCircle, Users, Plus, ChevronUp, ChevronDown, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function ConsultantView({ user }) {
  const queryClient = useQueryClient();
  const [creditsInput, setCreditsInput] = useState({});

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

  const updateStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status }) => {
      await base44.entities.ConsultationBooking.update(bookingId, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultant-bookings'] });
    }
  });

  const completeConsultationMutation = useMutation({
    mutationFn: async ({ bookingId, userEmail }) => {
      // Trova l'utente
      const users = await base44.entities.User.filter({ email: userEmail });
      if (users.length > 0) {
        const user = users[0];
        const currentUsed = user.consulenze_usate || [];
        // Aggiungi l'ID della consulenza completata
        await base44.entities.User.update(user.id, {
          consulenze_usate: [...currentUsed, bookingId]
        });
      }
      // Aggiorna lo stato della prenotazione
      await base44.entities.ConsultationBooking.update(bookingId, { status: 'completed' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultant-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['all-members-consultant'] });
    }
  });

  const updateCreditsMutation = useMutation({
    mutationFn: async ({ userId, newCredits }) => {
      await base44.entities.User.update(userId, { 
        consulenze_disponibili: newCredits 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-members-consultant'] });
    }
  });

  const handleIncrement = (userId, currentCredits) => {
    updateCreditsMutation.mutate({ userId, newCredits: currentCredits + 1 });
  };

  const handleDecrement = (userId, currentCredits) => {
    if (currentCredits > 1) {
      updateCreditsMutation.mutate({ userId, newCredits: currentCredits - 1 });
    }
  };

  const statusColors = {
    pending: 'bg-yellow-500',
    confirmed: 'bg-blue-500',
    completed: 'bg-green-600',
    cancelled: 'bg-red-500'
  };

  const statusLabels = {
    pending: 'In Attesa',
    confirmed: 'Confermata',
    completed: 'Completata',
    cancelled: 'Annullata'
  };

  return (
    <>
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
          <div className="flex gap-4 mt-4">
            <div className="bg-lime-400/20 rounded-lg p-3 flex-1 text-center">
              <p className="text-2xl font-bold text-lime-400">{bookings.filter(b => b.status === 'pending').length}</p>
              <p className="text-xs text-slate-400">Richieste in attesa</p>
            </div>
            <div className="bg-green-500/20 rounded-lg p-3 flex-1 text-center">
              <p className="text-2xl font-bold text-green-400">{bookings.filter(b => b.status === 'completed').length}</p>
              <p className="text-xs text-slate-400">Completate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-lime-400/30 mb-6">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-lime-400" />
            Lista Membri ({allMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {allMembers.map((member) => {
              const availableCredits = member.consulenze_disponibili || 1;
              const usedCredits = member.consulenze_usate?.length || 0;

              return (
                <div key={member.id} className="bg-slate-700/50 rounded-lg p-3">
                  <div className="mb-3">
                    <p className="text-white font-medium">{member.company_name || member.full_name}</p>
                    {member.referente && (
                      <p className="text-slate-400 text-xs">{member.referente}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="text-center">
                          <p className="text-lime-400 font-bold text-lg">{availableCredits}</p>
                          <p className="text-slate-500 text-xs">gratuite</p>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-5 w-5 p-0 bg-lime-400/20 text-lime-400 border-lime-400/30 hover:bg-lime-400 hover:text-slate-900"
                            disabled={updateCreditsMutation.isPending}
                            onClick={() => handleIncrement(member.id, availableCredits)}
                          >
                            <ChevronUp className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-5 w-5 p-0 bg-slate-600/50 text-slate-400 border-slate-600 hover:bg-slate-600 hover:text-white disabled:opacity-30"
                            disabled={availableCredits <= 1 || updateCreditsMutation.isPending}
                            onClick={() => handleDecrement(member.id, availableCredits)}
                          >
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <span className="text-slate-600">/</span>
                      <div className="text-center">
                        <p className="text-slate-400 font-bold text-lg">{usedCredits}</p>
                        <p className="text-slate-500 text-xs">usate</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
                return (
                  <div key={booking.id} className="bg-slate-700/50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-lime-400 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-slate-900 font-bold text-sm">
                            {(member?.company_name || booking.user_email)[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-white font-bold">{member?.company_name || booking.user_email}</h3>
                          {member?.referente && (
                            <p className="text-slate-300 text-sm">{member.referente}</p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(booking.created_date).toLocaleDateString('it-IT')}</span>
                          </div>
                        </div>
                      </div>
                      <Badge className={statusColors[booking.status]}>
                        {statusLabels[booking.status]}
                      </Badge>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3 mb-3">
                      <p className="text-white text-sm">{booking.subject}</p>
                    </div>
                    {booking.status !== 'completed' && (
                      <Button
                        className="bg-lime-400 hover:bg-lime-500 text-slate-900 w-full font-bold"
                        onClick={() => completeConsultationMutation.mutate({ 
                          bookingId: booking.id, 
                          userEmail: booking.user_email 
                        })}
                        disabled={completeConsultationMutation.isPending}
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Segna come Completata
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}