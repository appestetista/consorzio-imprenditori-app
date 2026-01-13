import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Mail, User, Clock, CheckCircle, XCircle, Users, Plus } from 'lucide-react';
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
      return users.filter(u => u.role !== 'admin');
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

  const incrementCreditsMutation = useMutation({
    mutationFn: async ({ userId, additionalCredits }) => {
      const member = allMembers.find(m => m.id === userId);
      const currentCredits = member?.consulenze_disponibili || 0;
      await base44.entities.User.update(userId, { 
        consulenze_disponibili: currentCredits + additionalCredits 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-members-consultant'] });
      setCreditsInput({});
    }
  });

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
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-lime-400 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <h2 className="text-white text-xl font-bold">{myConsultantProfile?.name || 'Consulente'}</h2>
              <p className="text-lime-400 text-sm">{myConsultantProfile?.category}</p>
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
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <p className="text-white font-medium">{member.company_name || member.full_name}</p>
                      {member.referente && (
                        <p className="text-slate-400 text-xs">{member.referente}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-lime-400 font-bold text-lg">{availableCredits}</p>
                        <p className="text-slate-500 text-xs">gratuite</p>
                      </div>
                      <span className="text-slate-600">/</span>
                      <div className="text-center">
                        <p className="text-slate-400 font-bold text-lg">{usedCredits}</p>
                        <p className="text-slate-500 text-xs">usate</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="1"
                        placeholder="+"
                        value={creditsInput[member.id] || ''}
                        onChange={(e) => setCreditsInput({ ...creditsInput, [member.id]: parseInt(e.target.value) || '' })}
                        className="w-16 h-8 bg-slate-900 border-slate-700 text-white text-center"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 bg-lime-400/20 text-lime-400 border-lime-400/30 hover:bg-lime-400 hover:text-slate-900"
                        disabled={!creditsInput[member.id] || incrementCreditsMutation.isPending}
                        onClick={() => incrementCreditsMutation.mutate({ 
                          userId: member.id, 
                          additionalCredits: creditsInput[member.id] 
                        })}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <h3 className="text-white text-lg font-bold mb-4">Richieste di Consulenza</h3>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : bookings.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6 text-center">
            <Mail className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Nessuna richiesta ricevuta</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id} className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-base">{booking.user_email}</CardTitle>
                  <Badge className={statusColors[booking.status]}>
                    {statusLabels[booking.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-900 rounded-lg p-3 mb-3">
                  <p className="text-slate-300 text-sm">{booking.subject}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(booking.created_date).toLocaleDateString('it-IT', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
                {booking.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white flex-1"
                      onClick={() => updateStatusMutation.mutate({ bookingId: booking.id, status: 'confirmed' })}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Conferma
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600 flex-1"
                      onClick={() => updateStatusMutation.mutate({ bookingId: booking.id, status: 'completed' })}
                    >
                      Completa
                    </Button>
                  </div>
                )}
                {booking.status === 'confirmed' && (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white w-full"
                    onClick={() => updateStatusMutation.mutate({ bookingId: booking.id, status: 'completed' })}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Segna come Completata
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}