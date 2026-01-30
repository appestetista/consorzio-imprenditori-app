import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar, MapPin, Clock, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ChangeResponsePopup({ event, user, onClose }) {
  const queryClient = useQueryClient();
  const [respondingTo, setRespondingTo] = useState(null);

  const respondMutation = useMutation({
    mutationFn: async (response) => {
      const existingParticipations = await base44.entities.PartecipazioniEvento.filter({
        user_email: user.email,
        evento_id: event.id
      });

      const newStato = response === 'accept' ? 'confermato' : 'non_confermato';

      if (existingParticipations.length > 0) {
        return base44.entities.PartecipazioniEvento.update(existingParticipations[0].id, {
          stato: newStato
        });
      }
      return { response };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partecipazioni-home'] });
      queryClient.invalidateQueries({ queryKey: ['partecipazioni-eventi'] });
      // Mostra feedback prima di chiudere
      setTimeout(() => {
        onClose();
      }, 800);
    },
    onError: () => {
      setRespondingTo(null);
    }
  });

  const handleRespond = (response) => {
    setRespondingTo(response);
    respondMutation.mutate(response);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="bg-lime-400 p-4 flex items-center justify-center gap-3">
          <h2 className="text-slate-900 font-bold text-xl">Modifica Partecipazione</h2>
        </div>

        {/* Immagine evento se presente */}
        {event.image_url && (
          <div className="w-full h-40 overflow-hidden">
            <img 
              src={event.image_url} 
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Contenuto */}
        <div className="p-6 space-y-4">
          <h3 className="text-white text-xl font-bold text-center">{event.title}</h3>
          
          {event.description && (
            <p className="text-slate-400 text-sm text-center">{event.description}</p>
          )}

          <div className="bg-slate-900 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3 text-lime-400">
              <Calendar className="w-5 h-5" />
              <span className="text-white">
                {format(new Date(event.date), 'd MMMM yyyy', { locale: it })}
              </span>
            </div>
            <div className="flex items-center gap-3 text-lime-400">
              <Clock className="w-5 h-5" />
              <span className="text-white">{event.time}</span>
            </div>
            <div className="flex items-center gap-3 text-lime-400">
              <MapPin className="w-5 h-5" />
              <span className="text-white">{event.location}</span>
            </div>
          </div>

          <p className="text-center text-slate-300 text-sm">
            Vuoi modificare la tua risposta?
          </p>

          {/* Pulsanti risposta */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              className={`py-4 text-xs px-2 transition-all duration-300 ${
                respondingTo === 'accept' && respondMutation.isSuccess
                  ? 'bg-green-500 scale-105'
                  : 'bg-green-600 hover:bg-green-700'
              } text-white`}
              onClick={() => handleRespond('accept')}
              disabled={respondMutation.isPending || respondMutation.isSuccess}
            >
              {respondingTo === 'accept' && respondMutation.isPending ? (
                <div className="w-4 h-4 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : respondingTo === 'accept' && respondMutation.isSuccess ? (
                <Check className="w-5 h-5 mr-1 flex-shrink-0 animate-bounce" />
              ) : (
                <Check className="w-4 h-4 mr-1 flex-shrink-0" />
              )}
              <span className="truncate">
                {respondingTo === 'accept' && respondMutation.isSuccess ? 'Confermato!' : 'Parteciperò'}
              </span>
            </Button>
            <Button
              className={`py-4 text-xs px-2 transition-all duration-300 ${
                respondingTo === 'decline' && respondMutation.isSuccess
                  ? 'bg-red-500 scale-105'
                  : 'bg-red-600 hover:bg-red-700'
              } text-white`}
              onClick={() => handleRespond('decline')}
              disabled={respondMutation.isPending || respondMutation.isSuccess}
            >
              {respondingTo === 'decline' && respondMutation.isPending ? (
                <div className="w-4 h-4 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : respondingTo === 'decline' && respondMutation.isSuccess ? (
                <Check className="w-5 h-5 mr-1 flex-shrink-0 animate-bounce" />
              ) : (
                <X className="w-4 h-4 mr-1 flex-shrink-0" />
              )}
              <span className="truncate">
                {respondingTo === 'decline' && respondMutation.isSuccess ? 'Registrato!' : 'Non parteciperò'}
              </span>
            </Button>
          </div>

          {/* Pulsante chiudi */}
          <Button
            variant="ghost"
            className="w-full text-slate-400 hover:text-white"
            onClick={onClose}
          >
            Annulla
          </Button>
        </div>
      </div>
    </div>
  );
}