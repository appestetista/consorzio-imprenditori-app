import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Send, MapPin, Users, Check, Briefcase, ChevronRight, ChevronLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function EventZoneManager({ event, open, onClose }) {
  const [step, setStep] = useState(1); // 1 = zone, 2 = destinatari
  const [selectedZones, setSelectedZones] = useState([]);
  const [allZones, setAllZones] = useState(true);
  const [recipientType, setRecipientType] = useState('all'); // 'all', 'users', 'consultants'
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectAllInType, setSelectAllInType] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  // Reset quando si apre il dialog
  useEffect(() => {
    if (open && event) {
      setStep(1);
      setSelectedZones(event.visible_to_zones || []);
      setAllZones(!event.visible_to_zones || event.visible_to_zones.length === 0);
      setRecipientType('all');
      setSelectedUsers([]);
      setSelectAllInType(true);
      setSearchTerm('');
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

  // Filtra utenti per zona selezionata
  const filteredByZone = allUsers.filter(u => {
    if (u.role === 'admin') return false;
    if (allZones) return true;
    const userZone = u.zona || u.zone;
    return userZone && selectedZones.includes(userZone);
  });

  // Separa utenti e consulenti
  const allUsersInZone = filteredByZone.filter(u => u.role === 'user' || u.user_type === 'utente');
  const allConsultantsInZone = filteredByZone.filter(u => u.role === 'consulente' || u.user_type === 'consulente');

  // Filtra per tipo destinatario selezionato
  const filteredByType = recipientType === 'all' 
    ? filteredByZone 
    : recipientType === 'users' 
      ? allUsersInZone 
      : allConsultantsInZone;

  // Filtra per ricerca
  const searchedUsers = filteredByType.filter(u => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(searchLower) ||
      u.company_name?.toLowerCase().includes(searchLower) ||
      u.email?.toLowerCase().includes(searchLower)
    );
  });

  const handleZoneToggle = (zoneName) => {
    if (selectedZones.includes(zoneName)) {
      setSelectedZones(selectedZones.filter(z => z !== zoneName));
    } else {
      setSelectedZones([...selectedZones, zoneName]);
    }
  };

  const handleUserToggle = (email) => {
    if (selectedUsers.includes(email)) {
      setSelectedUsers(selectedUsers.filter(e => e !== email));
    } else {
      setSelectedUsers([...selectedUsers, email]);
    }
    setSelectAllInType(false);
  };

  const handleSelectAllInType = (checked) => {
    setSelectAllInType(checked);
    if (checked) {
      setSelectedUsers([]);
    }
  };

  const getTargetUsers = () => {
    if (selectAllInType) {
      return filteredByType;
    }
    return filteredByType.filter(u => selectedUsers.includes(u.email));
  };

  const publishMutation = useMutation({
    mutationFn: async () => {
      const zonesToSave = allZones ? [] : selectedZones;
      const targetUsers = getTargetUsers();

      // Aggiorna evento con zone selezionate
      await base44.entities.Event.update(event.id, {
        visible_to_zones: zonesToSave,
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
            {step === 1 ? 'Seleziona Zone' : 'Seleziona Destinatari'}
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

          {/* Step 1: Selezione Zone */}
          {step === 1 && (
            <>
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
                      if (checked) setSelectedZones([]);
                    }}
                  />
                  <Label htmlFor="all-zones" className="text-white cursor-pointer">
                    Tutte le zone
                  </Label>
                </div>

                {!allZones && (
                  <div className="space-y-2 pl-2 max-h-48 overflow-y-auto">
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

              <div className="bg-slate-700/50 p-3 rounded-lg">
                <p className="text-slate-400 text-sm">
                  {allZones 
                    ? `L'evento sarà visibile a tutti (${filteredUsers.length} utenti)`
                    : selectedZones.length > 0
                      ? `L'evento sarà visibile a ${selectedZones.length} zone (${filteredUsers.length} utenti)`
                      : 'Seleziona almeno una zona'
                  }
                </p>
              </div>

              <Button
                onClick={() => setStep(2)}
                disabled={!allZones && selectedZones.length === 0}
                className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
              >
                Avanti - Seleziona Destinatari
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}

          {/* Step 2: Selezione Destinatari */}
          {step === 2 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(1)}
                className="text-slate-400 hover:text-white -mt-2"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Torna alle zone
              </Button>

              <div className="space-y-3">
                <Label className="text-white font-medium flex items-center gap-2">
                  <Users className="w-4 h-4 text-lime-400" />
                  Chi vuoi notificare?
                </Label>

                {/* Selezione tipo: Tutti, Solo Utenti, Solo Consulenti */}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={recipientType === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => { setRecipientType('all'); setSelectAllInType(true); setSelectedUsers([]); }}
                    className={recipientType === 'all' ? 'bg-lime-400 text-slate-900' : 'border-slate-600 text-slate-300'}
                  >
                    Tutti ({filteredByZone.length})
                  </Button>
                  <Button
                    variant={recipientType === 'users' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => { setRecipientType('users'); setSelectAllInType(true); setSelectedUsers([]); }}
                    className={recipientType === 'users' ? 'bg-lime-400 text-slate-900' : 'border-slate-600 text-slate-300'}
                  >
                    <Users className="w-3 h-3 mr-1" />
                    Utenti ({allUsersInZone.length})
                  </Button>
                  <Button
                    variant={recipientType === 'consultants' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => { setRecipientType('consultants'); setSelectAllInType(true); setSelectedUsers([]); }}
                    className={recipientType === 'consultants' ? 'bg-lime-400 text-slate-900' : 'border-slate-600 text-slate-300'}
                  >
                    <Briefcase className="w-3 h-3 mr-1" />
                    Consulenti ({allConsultantsInZone.length})
                  </Button>
                </div>

                <div className="flex items-center space-x-2 p-3 bg-slate-900 rounded-lg">
                  <Checkbox
                    id="all-in-type"
                    checked={selectAllInType}
                    onCheckedChange={handleSelectAllInType}
                  />
                  <Label htmlFor="all-in-type" className="text-white cursor-pointer">
                    {recipientType === 'all' && `Tutti (${filteredByType.length})`}
                    {recipientType === 'users' && `Tutti gli utenti (${filteredByType.length})`}
                    {recipientType === 'consultants' && `Tutti i consulenti (${filteredByType.length})`}
                  </Label>
                </div>

                {!selectAllInType && (
                  <>
                    <Input
                      placeholder="Cerca utente o azienda..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white"
                    />

                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {searchedUsers.map((user) => {
                        const isConsultant = user.role === 'consulente' || user.user_type === 'consulente';
                        return (
                          <div key={user.id} className="flex items-center space-x-2 p-2 bg-slate-900/50 rounded-lg">
                            <Checkbox
                              id={`user-${user.id}`}
                              checked={selectedUsers.includes(user.email)}
                              onCheckedChange={() => handleUserToggle(user.email)}
                            />
                            <Label htmlFor={`user-${user.id}`} className="text-slate-300 cursor-pointer text-sm flex-1 flex items-center gap-2">
                              {isConsultant ? <Briefcase className="w-3 h-3 text-slate-500" /> : <Users className="w-3 h-3 text-slate-500" />}
                              <span className="font-medium">{user.company_name || user.full_name}</span>
                              {user.zona && <span className="text-slate-500 text-xs">({user.zona})</span>}
                            </Label>
                          </div>
                        );
                      })}

                      {searchedUsers.length === 0 && (
                        <p className="text-slate-500 text-sm text-center py-4">Nessun utente trovato</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="bg-slate-700/50 p-3 rounded-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-lime-400" />
                <span className="text-slate-300">
                  <span className="text-lime-400 font-bold">{getTargetUsers().length}</span> utenti riceveranno la notifica
                </span>
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}