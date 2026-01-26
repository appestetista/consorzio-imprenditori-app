import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Send, MapPin, Users, Check } from 'lucide-react';

export default function EventZoneManager({ event, open, onClose }) {
  const [selectedZones, setSelectedZones] = useState(event?.visible_to_zones || []);
  const [allZones, setAllZones] = useState(!event?.visible_to_zones || event?.visible_to_zones?.length === 0);
  const queryClient = useQueryClient();

  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: () => base44.entities.Zone.filter({ is_active: true }),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-for-zones'],
    queryFn: () => base44.entities.User.list(),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      // Aggiorna evento con zone selezionate
      const zonesToSave = allZones ? [] : selectedZones;
      await base44.entities.Event.update(event.id, {
        visible_to_zones: zonesToSave,
        notifications_sent: true
      });

      // Notifica al creatore dell'evento
      if (event.creator_email) {
        await base44.entities.Notification.create({
          user_email: event.creator_email,
          type: 'event',
          title: 'Il tuo evento è stato pubblicato!',
          content: `Il tuo evento "${event.title}" è stato approvato e pubblicato nel calendario.`,
          reference_id: event.id,
          is_read: false
        });
      }

      // Filtra utenti per zona
      let targetUsers = allUsers.filter(u => u.role !== 'admin');
      
      if (!allZones && selectedZones.length > 0) {
        targetUsers = targetUsers.filter(u => {
          const userZone = u.zona || u.zone;
          return userZone && selectedZones.includes(userZone);
        });
      }

      // Crea notifiche per tutti gli utenti target
      for (const user of targetUsers) {
        await base44.entities.Notification.create({
          user_email: user.email,
          type: 'event',
          title: 'Nuovo evento disponibile',
          content: `È stato pubblicato un nuovo evento: "${event.title}"`,
          reference_id: event.id,
          is_read: false
        });
      }

      // Crea partecipazioni per invitare automaticamente
      for (const user of targetUsers) {
        const existing = await base44.entities.PartecipazioniEvento.filter({
          user_email: user.email,
          evento_id: event.id
        });
        if (existing.length === 0) {
          await base44.entities.PartecipazioniEvento.create({
            user_email: user.email,
            evento_id: event.id,
            stato: 'nessuna_risposta'
          });
        }
      }

      return { notifiedCount: targetUsers.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['partecipazioni-eventi'] });
      onClose();
    }
  });

  const handleZoneToggle = (zoneName) => {
    if (selectedZones.includes(zoneName)) {
      setSelectedZones(selectedZones.filter(z => z !== zoneName));
    } else {
      setSelectedZones([...selectedZones, zoneName]);
    }
  };

  const getUserCountForZones = () => {
    if (allZones) {
      return allUsers.filter(u => u.role !== 'admin').length;
    }
    return allUsers.filter(u => {
      if (u.role === 'admin') return false;
      const userZone = u.zona || u.zone;
      return userZone && selectedZones.includes(userZone);
    }).length;
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Pubblica e Notifica Evento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="bg-slate-900 p-3 rounded-lg">
            <p className="text-slate-400 text-sm">Evento:</p>
            <p className="text-lime-400 font-medium">{event.title}</p>
            {event.creator_name && (
              <p className="text-slate-500 text-xs mt-1">Proposto da: {event.creator_name}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-white font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4 text-lime-400" />
              Seleziona zone destinatarie
            </Label>

            <div className="flex items-center space-x-2 p-3 bg-slate-900 rounded-lg">
              <Checkbox
                id="all-zones"
                checked={allZones}
                onCheckedChange={(checked) => {
                  setAllZones(checked);
                  if (checked) setSelectedZones([]);
                }}
              />
              <Label htmlFor="all-zones" className="text-white cursor-pointer">
                Tutte le zone
              </Label>
            </div>

            {!allZones && (
              <div className="space-y-2 pl-2">
                {zones.map((zone) => (
                  <div key={zone.id} className="flex items-center space-x-2 p-2 bg-slate-900/50 rounded-lg">
                    <Checkbox
                      id={`zone-${zone.id}`}
                      checked={selectedZones.includes(zone.name)}
                      onCheckedChange={() => handleZoneToggle(zone.name)}
                    />
                    <Label htmlFor={`zone-${zone.id}`} className="text-slate-300 cursor-pointer">
                      {zone.name}
                    </Label>
                  </div>
                ))}
                {zones.length === 0 && (
                  <p className="text-slate-500 text-sm">Nessuna zona configurata</p>
                )}
              </div>
            )}
          </div>

          <div className="bg-slate-700/50 p-3 rounded-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-lime-400" />
            <span className="text-slate-300">
              <span className="text-lime-400 font-bold">{getUserCountForZones()}</span> utenti riceveranno la notifica
            </span>
          </div>

          <Button
            onClick={() => publishMutation.mutate()}
            disabled={publishMutation.isPending || (!allZones && selectedZones.length === 0)}
            className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
          >
            {publishMutation.isPending ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full mr-2" />
                Invio notifiche...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Pubblica e Invia Notifiche
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}