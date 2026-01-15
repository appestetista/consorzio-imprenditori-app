import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar, MapPin, Clock, Check, X as XIcon, Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EventInvitePopup({ user }) {
  const [pendingInvite, setPendingInvite] = useState(null);
  const queryClient = useQueryClient();

  const { data: partecipazioni = [] } = useQuery({
    queryKey: ['partecipazioni-utente', user?.email],
    queryFn: () => base44.entities.PartecipazioniEvento.filter({ 
      user_email: user?.email,
      stato: 'nessuna_risposta'
    }),
    enabled: !!user?.email,
    refetchInterval: 5000, // Check ogni 5 secondi per nuovi inviti
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events-popup'],
    queryFn: () => base44.entities.Event.list('-date'),
    enabled: partecipazioni.length > 0,
  });

  // Trova il primo invito in attesa di risposta
  useEffect(() => {
    if (partecipazioni.length > 0 && events.length > 0) {
      const firstPendingInvite = partecipazioni[0];
      const evento = events.find(e => e.id === firstPendingInvite.evento_id);
      if (evento) {
        setPendingInvite({ partecipazione: firstPendingInvite, evento });
      }
    } else {
      setPendingInvite(null);
    }
  }, [partecipazioni, events]);

  const respondMutation = useMutation({
    mutationFn: async ({ partecipazioneId, response }) => {
      const newStato = response === 'accept' ? 'confermato' : 'non_confermato';
      return base44.entities.PartecipazioniEvento.update(partecipazioneId, {
        stato: newStato
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partecipazioni-utente'] });
      queryClient.invalidateQueries({ queryKey: ['partecipazioni-eventi'] });
      setPendingInvite(null);
    }
  });

  const [dismissed, setDismissed] = useState(false);

  if (!pendingInvite || dismissed) return null;

  const { evento, partecipazione } = pendingInvite;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 relative">
                    {/* Pulsante X per chiudere */}
                    <button
                      onClick={() => setDismissed(true)}
                      className="absolute top-3 right-3 z-10 bg-slate-700 hover:bg-slate-600 rounded-full p-1.5 transition-colors"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>

                    {/* Header con campanella */}
                    <div className="bg-lime-400 p-4 flex items-center justify-center gap-3">
          <Bell className="w-8 h-8 text-slate-900 animate-bounce" />
          <h2 className="text-slate-900 font-bold text-xl">Nuovo Invito!</h2>
        </div>

        {/* Immagine evento se presente */}
        {evento.image_url && (
          <div className="w-full h-40 overflow-hidden">
            <img 
              src={evento.image_url} 
              alt={evento.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Contenuto */}
        <div className="p-6 space-y-4">
          <h3 className="text-white text-xl font-bold text-center">{evento.title}</h3>
          
          {evento.description && (
            <p className="text-slate-400 text-sm text-center">{evento.description}</p>
          )}

          <div className="bg-slate-900 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3 text-lime-400">
              <Calendar className="w-5 h-5" />
              <span className="text-white">
                {format(new Date(evento.date), 'd MMMM yyyy', { locale: it })}
              </span>
            </div>
            <div className="flex items-center gap-3 text-lime-400">
              <Clock className="w-5 h-5" />
              <span className="text-white">{evento.time}</span>
            </div>
            <div className="flex items-center gap-3 text-lime-400">
              <MapPin className="w-5 h-5" />
              <span className="text-white">{evento.location}</span>
            </div>
          </div>

          <p className="text-center text-slate-300 text-sm">
            Conferma la tua partecipazione per continuare
          </p>

          {/* Pulsanti risposta */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="bg-green-600 hover:bg-green-700 text-white py-4 text-xs px-2"
              onClick={() => respondMutation.mutate({ 
                partecipazioneId: partecipazione.id, 
                response: 'accept' 
              })}
              disabled={respondMutation.isPending}
            >
              <Check className="w-4 h-4 mr-1 flex-shrink-0" />
              <span className="truncate">Parteciperò</span>
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white py-4 text-xs px-2"
              onClick={() => respondMutation.mutate({ 
                partecipazioneId: partecipazione.id, 
                response: 'decline' 
              })}
              disabled={respondMutation.isPending}
            >
              <X className="w-4 h-4 mr-1 flex-shrink-0" />
              <span className="truncate">Non parteciperò</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}