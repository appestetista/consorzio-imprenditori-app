import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Send, MapPin, Users, Check, Briefcase, ChevronRight, ChevronLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function EventZoneManager({ event, open, onClose }) {
  const [selectedZones, setSelectedZones] = useState([]);
  const [allZones, setAllZones] = useState(true);
  // Per ogni zona: chi può vedere (all, users, consultants)
  const [zoneVisibility, setZoneVisibility] = useState({});
  // Tipo destinatari globale (quando allZones=true)
  const [globalRecipientType, setGlobalRecipientType] = useState('all');
  const queryClient = useQueryClient();

  // Reset quando si apre il dialog
  useEffect(() => {
    if (open && event) {
      // Ricostruisci lo stato da event.zone_visibility se esiste
      const existingVisibility = {};
      if (event.zone_visibility && event.zone_visibility.length > 0) {
        event.zone_visibility.forEach(zv => {
          existingVisibility[zv.zone] = zv.target || 'all';
        });
        setZoneVisibility(existingVisibility);
        setSelectedZones(event.zone_visibility.map(zv => zv.zone));
        setAllZones(false);
      } else if (event.visible_to_zones && event.visible_to_zones.length > 0) {
        // Retrocompatibilità: se ci sono solo zone senza target, imposta 'all'
        event.visible_to_zones.forEach(z => {
          existingVisibility[z] = 'all';
        });
        setZoneVisibility(existingVisibility);
        setSelectedZones(event.visible_to_zones);
        setAllZones(false);
      } else {
        setZoneVisibility({});
        setSelectedZones([]);
        setAllZones(true);
      }
      setGlobalRecipientType('all');
    }
  }, [open, event]);

  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: () => base44.entities.Zone.filter({ is_active: true }),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-for-zones'],
    queryFn: () => base44.entities.User.list(),
  });

  const handleZoneToggle = (zoneName) => {
    if (selectedZones.includes(zoneName)) {
      setSelectedZones(selectedZones.filter(z => z !== zoneName));
      const newVisibility = { ...zoneVisibility };
      delete newVisibility[zoneName];
      setZoneVisibility(newVisibility);
    } else {
      setSelectedZones([...selectedZones, zoneName]);
      setZoneVisibility({ ...zoneVisibility, [zoneName]: 'all' });
    }
  };

  const handleZoneVisibilityChange = (zoneName, target) => {
    setZoneVisibility({ ...zoneVisibility, [zoneName]: target });
  };

  // Helper per estrarre dati utente (supporta struttura flat o annidata)
  const getUserData = (u) => {
    // I dati possono essere direttamente sull'oggetto o annidati in 'data'
    const dataObj = typeof u.data === 'object' && u.data !== null ? u.data : {};
    const zona = u.zona || u.zone || dataObj.zona || dataObj.zone || null;
    const userType = u.user_type || dataObj.user_type || null;
    return { zona, userType };
  };

  // Debug: log utenti al mount
  useEffect(() => {
    if (allUsers.length > 0) {
      console.log('[EventZoneManager] Utenti caricati:', allUsers.length);
      allUsers.slice(0, 3).forEach(u => {
        console.log('[EventZoneManager] Esempio utente:', { 
          email: u.email, 
          role: u.role,
          zona_direct: u.zona,
          zona_data: u.data?.zona,
          user_type_direct: u.user_type,
          user_type_data: u.data?.user_type,
          extracted: getUserData(u)
        });
      });
    }
  }, [allUsers]);

  // Calcola utenti target in base a zone e visibilità
  const getTargetUsers = () => {
    const targetUsers = [];
    
    // Normalizza zone selezionate per confronto case-insensitive
    const selectedZonesLower = selectedZones.map(z => z.toLowerCase());
    
    if (allZones) {
      // Tutte le zone con tipo globale
      allUsers.forEach(u => {
        if (u.role === 'admin') return;
        const { userType } = getUserData(u);
        const isUser = userType === 'utente' || (u.role === 'user' && !userType);
        const isConsultant = userType === 'consulente';
        
        if (globalRecipientType === 'all') {
          targetUsers.push(u);
        } else if (globalRecipientType === 'users' && isUser) {
          targetUsers.push(u);
        } else if (globalRecipientType === 'consultants' && isConsultant) {
          targetUsers.push(u);
        }
      });
    } else {
      // Zone specifiche con visibilità per zona
      allUsers.forEach(u => {
        if (u.role === 'admin') return;
        const { zona: userZone, userType } = getUserData(u);
        if (!userZone) return;
        
        // Confronto case-insensitive
        const userZoneLower = userZone.toLowerCase();
        const matchedZone = selectedZones.find(z => z.toLowerCase() === userZoneLower);
        if (!matchedZone) return;
        
        const zoneTarget = zoneVisibility[matchedZone] || 'all';
        const isUser = userType === 'utente' || (u.role === 'user' && !userType);
        const isConsultant = userType === 'consulente';
        
        if (zoneTarget === 'all') {
          targetUsers.push(u);
        } else if (zoneTarget === 'users' && isUser) {
          targetUsers.push(u);
        } else if (zoneTarget === 'consultants' && isConsultant) {
          targetUsers.push(u);
        }
      });
    }
    
    return targetUsers;
  };

  // Conta utenti per zona
  const getUserCountForZone = (zoneName) => {
    const target = zoneVisibility[zoneName] || 'all';
    return allUsers.filter(u => {
      if (u.role === 'admin') return false;
      const { zona: userZone, userType } = getUserData(u);
      if (userZone !== zoneName) return false;
      const isUser = userType === 'utente' || (u.role === 'user' && !userType);
      const isConsultant = userType === 'consulente';
      if (target === 'all') return true;
      if (target === 'users') return isUser;
      if (target === 'consultants') return isConsultant;
      return false;
    }).length;
  };

  const publishMutation = useMutation({
    mutationFn: async () => {
      const targetUsers = getTargetUsers();

      // Costruisci zone_visibility per salvare la configurazione
      let zoneVisibilityToSave = [];
      if (!allZones) {
        zoneVisibilityToSave = selectedZones.map(zone => ({
          zone,
          target: zoneVisibility[zone] || 'all'
        }));
      } else {
        // Se tutte le zone, salva con target globale
        zoneVisibilityToSave = [{ zone: '__all__', target: globalRecipientType }];
      }

      // Aggiorna evento con zone e visibilità
      await base44.entities.Event.update(event.id, {
        visible_to_zones: allZones ? [] : selectedZones,
        zone_visibility: zoneVisibilityToSave,
        notifications_sent: true
      });

      // Notifica al creatore dell'evento (se evento utente)
      if (event.creator_email && event.event_type === 'utente') {
        await base44.entities.Notification.create({
          user_email: event.creator_email,
          type: 'event',
          title: 'Il tuo evento è stato pubblicato!',
          content: `Il tuo evento "${event.title}" è stato approvato e pubblicato nel calendario.`,
          reference_id: event.id,
          is_read: false
        });
      }

      // Crea notifiche e partecipazioni per utenti target
      for (const user of targetUsers) {
        // Notifica
        await base44.entities.Notification.create({
          user_email: user.email,
          type: 'event',
          title: 'Nuovo evento disponibile',
          content: `È stato pubblicato un nuovo evento: "${event.title}"`,
          reference_id: event.id,
          is_read: false
        });

        // Partecipazione (se non esiste già)
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

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            Gestisci Zone e Destinatari
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Info evento */}
          <div className="bg-slate-900 p-3 rounded-lg">
            <p className="text-slate-400 text-sm">Evento:</p>
            <p className="text-lime-400 font-medium">{event.title}</p>
            {event.creator_name && (
              <p className="text-slate-500 text-xs mt-1">Proposto da: {event.creator_name}</p>
            )}
          </div>

          {/* Selezione Zone */}
          <div className="space-y-3">
            <Label className="text-white font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4 text-lime-400" />
              A quali zone rendere visibile l'evento?
            </Label>

            <div className="flex items-center space-x-2 p-3 bg-slate-900 rounded-lg">
              <Checkbox
                id="all-zones"
                checked={allZones}
                onCheckedChange={(checked) => {
                  setAllZones(checked);
                  if (checked) {
                    setSelectedZones([]);
                    setZoneVisibility({});
                  }
                }}
              />
              <Label htmlFor="all-zones" className="text-white cursor-pointer flex-1">
                Tutte le zone
              </Label>
              {allZones && (
                <Select value={globalRecipientType} onValueChange={setGlobalRecipientType}>
                  <SelectTrigger className="w-40 bg-slate-800 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="all" className="text-white">Tutti</SelectItem>
                    <SelectItem value="users" className="text-white">Solo Utenti</SelectItem>
                    <SelectItem value="consultants" className="text-white">Solo Consulenti</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {!allZones && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {zones.map((zone) => {
                  const isSelected = selectedZones.includes(zone.name);
                  const userCount = getUserCountForZone(zone.name);
                  return (
                    <div key={zone.id} className="flex items-center gap-2 p-3 bg-slate-900/50 rounded-lg">
                      <Checkbox
                        id={`zone-${zone.id}`}
                        checked={isSelected}
                        onCheckedChange={() => handleZoneToggle(zone.name)}
                      />
                      <Label htmlFor={`zone-${zone.id}`} className="text-slate-300 cursor-pointer flex-1">
                        {zone.name}
                        {isSelected && (
                          <span className="text-lime-400 text-xs ml-2">({userCount} dest.)</span>
                        )}
                      </Label>
                      {isSelected && (
                        <Select 
                          value={zoneVisibility[zone.name] || 'all'} 
                          onValueChange={(val) => handleZoneVisibilityChange(zone.name, val)}
                        >
                          <SelectTrigger className="w-36 bg-slate-800 border-slate-600 text-white text-xs h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600">
                            <SelectItem value="all" className="text-white text-xs">
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                <Briefcase className="w-3 h-3" />
                                Tutti
                              </div>
                            </SelectItem>
                            <SelectItem value="users" className="text-white text-xs">
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                Solo Utenti
                              </div>
                            </SelectItem>
                            <SelectItem value="consultants" className="text-white text-xs">
                              <div className="flex items-center gap-1">
                                <Briefcase className="w-3 h-3" />
                                Solo Consulenti
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  );
                })}
                {zones.length === 0 && (
                  <p className="text-slate-500 text-sm">Nessuna zona configurata</p>
                )}
              </div>
            )}
          </div>

          {/* Riepilogo destinatari */}
          <div className="bg-slate-700/50 p-3 rounded-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-lime-400" />
            <span className="text-slate-300">
              <span className="text-lime-400 font-bold">{getTargetUsers().length}</span> utenti riceveranno l'invito e la notifica
            </span>
          </div>

          {/* Note */}
          <div className="bg-amber-900/20 border border-amber-600/30 p-3 rounded-lg">
            <p className="text-amber-400 text-xs">
              ⚠️ Solo gli utenti selezionati vedranno l'evento nel calendario e riceveranno la notifica. Gli altri non potranno vederlo né ricevere inviti.
            </p>
          </div>

          <Button
            onClick={() => publishMutation.mutate()}
            disabled={publishMutation.isPending || getTargetUsers().length === 0}
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