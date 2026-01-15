import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar, MapPin, Clock, Users, Check, X, Plus, ArrowLeft, Image, Upload, Edit, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import InviteEventDialog from '../components/calendario/InviteEventDialog';

export default function CalendarioIncontri() {
  const [user, setUser] = useState(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '', time: '', location: '', image_url: '' });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showEditEvent, setShowEditEvent] = useState(false);
  const [inviteDialogEvent, setInviteDialogEvent] = useState(null);
  const [inviteDialogType, setInviteDialogType] = useState(null);
  const [showParticipantsEvent, setShowParticipantsEvent] = useState(null);
  const [changeResponseEvent, setChangeResponseEvent] = useState(null);
  const queryClient = useQueryClient();
  const { impersonation } = useImpersonation();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, []);

  const isAdmin = user?.role === 'admin' && !impersonation.active;

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-date'),
  });

  const { data: partecipazioni = [] } = useQuery({
    queryKey: ['partecipazioni-eventi'],
    queryFn: () => base44.entities.PartecipazioniEvento.list(),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', user?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: user?.email, is_read: false }),
    enabled: !!user?.email,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNewEvent({ ...newEvent, image_url: file_url });
    } catch (error) {
      console.error('Errore upload immagine:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const createEventMutation = useMutation({
    mutationFn: async (eventData) => {
      // Calcola data_blocco_partecipazione (48 ore prima dell'evento)
      let dataBlocco = null;
      if (eventData.date && eventData.time) {
        const eventDateTime = new Date(`${eventData.date}T${eventData.time}`);
        dataBlocco = new Date(eventDateTime.getTime() - (48 * 60 * 60 * 1000));
      }

      const event = await base44.entities.Event.create({
        ...eventData,
        data_blocco_partecipazione: dataBlocco?.toISOString(),
        participants: [],
        declined: []
      });
      
      // Create notifications for all users
      if (isAdmin && allUsers.length > 0) {
        const notifications = allUsers.map(u => ({
          user_email: u.email,
          type: 'event',
          title: 'Nuovo Incontro',
          content: `È stato programmato un nuovo incontro: ${eventData.title}`,
          reference_id: event.id
        }));
        await base44.entities.Notification.bulkCreate(notifications);
      }
      
      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowAddEvent(false);
      setNewEvent({ title: '', description: '', date: '', time: '', location: '', image_url: '' });
    }
  });

  const updateEventMutation = useMutation({
    mutationFn: async (eventData) => {
      // Calcola nuova data_blocco_partecipazione (48 ore prima del nuovo orario evento)
      let dataBlocco = null;
      if (eventData.date && eventData.time) {
        const eventDateTime = new Date(`${eventData.date}T${eventData.time}`);
        dataBlocco = new Date(eventDateTime.getTime() - (48 * 60 * 60 * 1000));
      }

      return base44.entities.Event.update(editingEvent.id, {
        title: eventData.title,
        description: eventData.description,
        date: eventData.date,
        time: eventData.time,
        location: eventData.location,
        image_url: eventData.image_url,
        data_blocco_partecipazione: dataBlocco?.toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowEditEvent(false);
      setEditingEvent(null);
    }
  });

  const respondToEventMutation = useMutation({
    mutationFn: async ({ eventId, response }) => {
      // Verifica server-side: controlla se l'evento è bloccato
      const evento = events.find(e => e.id === eventId);
      if (evento?.data_blocco_partecipazione) {
        const now = new Date();
        const bloccoDate = new Date(evento.data_blocco_partecipazione);
        if (now >= bloccoDate) {
          throw new Error('Le iscrizioni per questo evento sono chiuse');
        }
      }

      const existingParticipations = await base44.entities.PartecipazioniEvento.filter({
        user_email: user.email,
        evento_id: eventId
      });

      const newStato = response === 'accept' ? 'confermato' : 'non_confermato';

      if (existingParticipations.length > 0) {
        // Aggiorna esistente
        return base44.entities.PartecipazioniEvento.update(existingParticipations[0].id, {
          stato: newStato
        });
      } else {
        // Crea nuova partecipazione
        return base44.entities.PartecipazioniEvento.create({
          user_email: user.email,
          evento_id: eventId,
          stato: newStato
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partecipazioni-eventi'] });
    }
  });

  const getUserResponse = (eventoId) => {
    if (!user?.email) return null;
    const partecipazione = partecipazioni.find(
      p => p.user_email === user.email && p.evento_id === eventoId
    );
    if (!partecipazione) return null;
    // Solo se ha effettivamente risposto (non "nessuna_risposta")
    if (partecipazione.stato === 'confermato') return 'accepted';
    if (partecipazione.stato === 'non_confermato') return 'declined';
    // Se stato è 'nessuna_risposta' o altro, ritorna null (non ha ancora scelto)
    return null;
  };

  // Filtro per escludere pinko pallino
  const isHiddenUser = (email) => {
    const user = allUsers.find(u => u.email === email);
    if (!user) return false;
    return user.full_name?.toLowerCase().includes('pinko pallino') || 
           user.company_name?.toLowerCase().includes('pinko pallino');
  };

  const getParticipantCount = (eventoId) => {
    return partecipazioni.filter(
      p => p.evento_id === eventoId && p.stato === 'confermato' && !isHiddenUser(p.user_email)
    ).length;
  };

  const getInvitedCount = (eventoId) => {
    return partecipazioni.filter(
      p => p.evento_id === eventoId && !isHiddenUser(p.user_email)
    ).length;
  };

  const getConfirmedParticipants = (eventoId) => {
    return partecipazioni
      .filter(p => p.evento_id === eventoId && p.stato === 'confermato' && !isHiddenUser(p.user_email))
      .map(p => {
        const user = allUsers.find(u => u.email === p.user_email);
        return {
          email: p.user_email,
          name: user?.company_name || user?.full_name || p.user_email
        };
      });
  };

  const isEventBlocked = (event) => {
    if (!event.data_blocco_partecipazione) return false;
    const now = new Date();
    const bloccoDate = new Date(event.data_blocco_partecipazione);
    return now >= bloccoDate;
  };

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Home')} className="text-lime-400">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-white text-xl font-bold">Calendario Incontri</h1>
          </div>
          
          {isAdmin && (
            <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
              <DialogTrigger asChild>
                <Button className="bg-lime-400 hover:bg-lime-500 text-slate-900">
                  <Plus className="w-5 h-5 mr-1" />
                  Nuovo
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-white">Nuovo Incontro</DialogTitle>
                </DialogHeader>
                <button
                  onClick={() => setShowAddEvent(false)}
                  className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4 text-slate-400" />
                </button>
                <div className="space-y-4 mt-4">
                  <Input
                    placeholder="Titolo"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                  <Textarea
                    placeholder="Descrizione"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                  <Input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                  <Input
                    type="time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                  <Input
                    placeholder="Luogo"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                  
                  {/* Image Upload */}
                  <div className="space-y-2">
                    <Label className="text-slate-300">Locandina Evento</Label>
                    <div className="flex flex-col gap-3">
                      {newEvent.image_url ? (
                        <div className="relative rounded-lg overflow-hidden border border-slate-700">
                          <img 
                            src={newEvent.image_url} 
                            alt="Locandina" 
                            className="w-full h-48 object-cover"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-2 right-2"
                            onClick={() => setNewEvent({...newEvent, image_url: ''})}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Label 
                          htmlFor="event-image" 
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors"
                        >
                          {uploadingImage ? (
                            <div className="text-center">
                              <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto mb-2"></div>
                              <p className="text-sm text-slate-400">Caricamento...</p>
                            </div>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-slate-400 mb-2" />
                              <p className="text-sm text-slate-300">Carica locandina</p>
                              <p className="text-xs text-slate-500">PNG, JPG (max 5MB)</p>
                            </>
                          )}
                          <Input
                            id="event-image"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                            disabled={uploadingImage}
                          />
                        </Label>
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => createEventMutation.mutate(newEvent)}
                    disabled={createEventMutation.isPending || uploadingImage}
                    className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
                  >
                    {createEventMutation.isPending ? 'Creazione...' : 'Crea Incontro'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Nessun incontro programmato</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => {
              const userResponse = getUserResponse(event.id);
              const participantCount = getParticipantCount(event.id);
              const isBlocked = isEventBlocked(event);
              
              return (
                <Card key={event.id} className="bg-slate-800 border-slate-700 overflow-hidden">
                  {event.image_url && (
                    <div className="w-full h-48 overflow-hidden">
                      <img 
                        src={event.image_url} 
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className="pb-3">
                                            <p className="text-lime-400 text-sm font-bold uppercase mb-1">
                                              {format(new Date(event.date), 'MMMM', { locale: it })}
                                            </p>
                                            <CardTitle className="text-white text-lg">{event.title}</CardTitle>
                                          </CardHeader>
                  <CardContent className="space-y-3">
                    {event.description && (
                      <p className="text-slate-400 text-sm">{event.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2 text-lime-400">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(event.date), 'd MMMM yyyy', { locale: it })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-lime-400">
                        <Clock className="w-4 h-4" />
                        <span>{event.time}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                      <MapPin className="w-4 h-4 text-lime-400" />
                      <span>{event.location}</span>
                    </div>
                    
                    {isAdmin && (
                                                <>
                                                  <div 
                                                    className="flex items-center gap-2 text-slate-300 text-sm cursor-pointer hover:text-lime-400"
                                                    onClick={() => setShowParticipantsEvent(event)}
                                                  >
                                                    <Users className="w-4 h-4 text-lime-400" />
                                                    <span>{participantCount} partecipanti confermati</span>
                                                    <span className="text-xs text-slate-500">(clicca per lista)</span>
                                                  </div>

                                                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                                                    <Users className="w-4 h-4 text-slate-500" />
                                                    <span>{getInvitedCount(event.id)} invitati totali</span>
                                                  </div>
                                                </>
                                              )}

                    {isAdmin && (
                     <div className="pt-3 border-t border-slate-700 space-y-2">
                       <div className="grid grid-cols-2 gap-2">
                         <Button
                           variant="outline"
                           size="sm"
                           className="border-lime-400 text-lime-400 hover:bg-lime-400/20"
                           onClick={() => {
                             setInviteDialogEvent(event);
                             setInviteDialogType('users');
                           }}
                         >
                           <Users className="w-4 h-4 mr-1" />
                           Invita Utenti
                         </Button>
                         <Button
                           variant="outline"
                           size="sm"
                           className="border-lime-400 text-lime-400 hover:bg-lime-400/20"
                           onClick={() => {
                             setInviteDialogEvent(event);
                             setInviteDialogType('consultants');
                           }}
                         >
                           <Briefcase className="w-4 h-4 mr-1" />
                           Invita Consulenti
                         </Button>
                       </div>
                       <Button
                         variant="outline"
                         size="sm"
                         className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                         onClick={() => {
                           setEditingEvent(event);
                           setShowEditEvent(true);
                         }}
                       >
                         <Edit className="w-4 h-4 mr-2" />
                         Modifica evento
                       </Button>
                     </div>
                    )}

                    {/* Stato partecipazione utente - solo per non-admin */}
                    {userResponse && !isAdmin && (
                      <div className="pt-3 border-t border-slate-700">
                        <div className={`p-3 rounded-lg ${
                          userResponse === 'accepted' ? 'bg-green-600/20' : 'bg-red-600/20'
                        }`}>
                          <p className={`text-sm font-medium ${
                            userResponse === 'accepted' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {userResponse === 'accepted' 
                              ? "✓ Hai scelto di partecipare all'incontro" 
                              : "✗ Hai scelto di non partecipare all'incontro"}
                          </p>
                        </div>
                        {!isBlocked && (
                          <button
                            className="w-full mt-3 text-base text-lime-400 hover:text-lime-300 font-medium underline"
                            onClick={() => setChangeResponseEvent(event)}
                          >
                            Hai cambiato idea?
                          </button>
                        )}
                      </div>
                    )}
                    {isBlocked && (
                      <div className="mt-3 p-3 bg-slate-700/50 rounded-lg">
                        <p className="text-slate-300 text-xs leading-relaxed">
                          La conferma di partecipazione non è più modificabile. Siamo a ridosso dell'evento e non è più possibile confermare o annullare la presenza online. Per necessità urgenti, contatta direttamente il Consorzio.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Edit Event Dialog */}
      {editingEvent && (
        <Dialog open={showEditEvent} onOpenChange={setShowEditEvent}>
          <DialogContent className="bg-slate-800 border-slate-700 max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Modifica Incontro</DialogTitle>
            </DialogHeader>
            <button
              onClick={() => setShowEditEvent(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
            <div className="space-y-4 mt-4">
              <Input
                placeholder="Titolo"
                value={editingEvent.title}
                onChange={(e) => setEditingEvent({...editingEvent, title: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
              />
              <Textarea
                placeholder="Descrizione"
                value={editingEvent.description}
                onChange={(e) => setEditingEvent({...editingEvent, description: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
              />
              <Input
                type="date"
                value={editingEvent.date}
                onChange={(e) => setEditingEvent({...editingEvent, date: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
              />
              <Input
                type="time"
                value={editingEvent.time}
                onChange={(e) => setEditingEvent({...editingEvent, time: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
              />
              <Input
                placeholder="Luogo"
                value={editingEvent.location}
                onChange={(e) => setEditingEvent({...editingEvent, location: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
              />
              
              <Button 
                onClick={() => updateEventMutation.mutate(editingEvent)}
                disabled={updateEventMutation.isPending}
                className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
              >
                {updateEventMutation.isPending ? 'Salvataggio...' : 'Salva Modifiche'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <BottomNav currentPage="CalendarioIncontri" unreadMessages={messages.length} />

      {/* Invite Dialog */}
      <InviteEventDialog
        open={!!inviteDialogEvent && !!inviteDialogType}
        onClose={() => {
          setInviteDialogEvent(null);
          setInviteDialogType(null);
        }}
        event={inviteDialogEvent}
        type={inviteDialogType}
      />

      {/* Change Response Dialog */}
      {changeResponseEvent && (
        <Dialog open={!!changeResponseEvent} onOpenChange={() => setChangeResponseEvent(null)}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Modifica partecipazione</DialogTitle>
            </DialogHeader>
            <button
              onClick={() => setChangeResponseEvent(null)}
              className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
            <div className="mt-4 space-y-4">
              <p className="text-slate-400 text-sm">
                Evento: <span className="text-lime-400">{changeResponseEvent.title}</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    respondToEventMutation.mutate({ eventId: changeResponseEvent.id, response: 'accept' });
                    setChangeResponseEvent(null);
                  }}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Parteciperò
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => {
                    respondToEventMutation.mutate({ eventId: changeResponseEvent.id, response: 'decline' });
                    setChangeResponseEvent(null);
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Non parteciperò
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Participants List Dialog (Admin only) */}
      {showParticipantsEvent && (
        <Dialog open={!!showParticipantsEvent} onOpenChange={() => setShowParticipantsEvent(null)}>
          <DialogContent className="bg-slate-800 border-slate-700 max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Partecipanti Confermati</DialogTitle>
            </DialogHeader>
            <button
              onClick={() => setShowParticipantsEvent(null)}
              className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
            <div className="mt-4">
              <p className="text-slate-400 text-sm mb-4">Evento: <span className="text-lime-400">{showParticipantsEvent.title}</span></p>
              <div className="space-y-2">
                {getConfirmedParticipants(showParticipantsEvent.id).length === 0 ? (
                  <p className="text-slate-500 text-center py-4">Nessun partecipante confermato</p>
                ) : (
                  getConfirmedParticipants(showParticipantsEvent.id).map((p, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg">
                      <div className="w-8 h-8 bg-green-600/20 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-green-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{p.name}</p>
                        <p className="text-slate-500 text-xs">{p.email}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}