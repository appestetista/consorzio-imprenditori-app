import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar, MapPin, Clock, Users, Check, X, Plus, ArrowLeft, Image, Upload, Edit, Briefcase, Bell, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import Header from '../components/layout/Header';
import BottomNavWithMenu from '../components/layout/BottomNavWithMenu';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import InviteEventDialog from '../components/calendario/InviteEventDialog';
import EventZoneManager from '../components/calendario/EventZoneManager';
import useNotificationSound from '../components/hooks/useNotificationSound';
import SectionHeaderIcons from '../components/layout/SectionHeaderIcons';

const MONTH_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#22c55e', '#eab308',
  '#f97316', '#ef4444', '#06b6d4', '#a855f7', '#6366f1', '#0ea5e9',
];

export default function CalendarioIncontri() {
  // Leggi il colore del mese dall'URL (passato dal calendario), fallback al mese corrente
  const urlParams = new URLSearchParams(window.location.search);
  const paramColor = urlParams.get('monthColor');
  const currentMonthColor = paramColor && paramColor.startsWith('#') ? paramColor : MONTH_COLORS[new Date().getMonth()];
  const [user, setUser] = useState(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showUserEventForm, setShowUserEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '', time: '', location: '', image_url: '', reminder_enabled: false });
  const [newUserEvent, setNewUserEvent] = useState({ title: '', description: '', date: '', time: '', location: '', image_url: '' });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingUserImage, setUploadingUserImage] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showEditEvent, setShowEditEvent] = useState(false);
  const [inviteDialogEvent, setInviteDialogEvent] = useState(null);
  const [inviteDialogType, setInviteDialogType] = useState(null);
  const [showParticipantsEvent, setShowParticipantsEvent] = useState(null);
  const [changeResponseEvent, setChangeResponseEvent] = useState(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showEditSuccessPopup, setShowEditSuccessPopup] = useState(false);
  const [zoneManagerEvent, setZoneManagerEvent] = useState(null);
  const [approvingEventId, setApprovingEventId] = useState(null);
  const queryClient = useQueryClient();
  const { impersonation } = useImpersonation();
  const { playSound } = useNotificationSound();
  
  // Stato per nuovi eventi (glow campanella)
  const [hasNewEvent, setHasNewEvent] = useState(false);
  const [lastEventCount, setLastEventCount] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
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

  const { data: allEvents = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('date'),
  });

  // Filtra eventi: admin vede tutto, utenti vedono solo approvati + i propri in attesa + filtro zone
  // Inoltre nasconde eventi passati (tranne per admin che li vede)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const events = allEvents
    .filter(event => {
      // Ignora eventi senza data valida
      if (!event.date) return false;
      
      // Nascondi eventi passati per non-admin
      if (!isAdmin) {
        const eventDate = new Date(event.date);
        if (isNaN(eventDate.getTime())) return false; // Data non valida
        eventDate.setHours(0, 0, 0, 0);
        if (eventDate < today) return false;
      }
      
      if (isAdmin) return true;
      // Mostra sempre i propri eventi (anche se pending o rejected) - il creatore vede subito il suo evento
      if (event.creator_email === user?.email) return true;
      // Per gli altri utenti: eventi non approvati non sono visibili
      if (event.approval_status !== 'approved' && event.approval_status) return false;
      
      // Filtra per zona e tipo utente usando zone_visibility
      const userZone = (user?.zona || user?.zone || '').toLowerCase();
      const isUserType = user?.user_type === 'utente' || (user?.role === 'user' && user?.user_type !== 'consulente');
      const isConsultantType = user?.user_type === 'consulente';
      
      if (event.zone_visibility && event.zone_visibility.length > 0) {
        // Cerca se c'è __all__ (tutte le zone)
        const allZonesConfig = event.zone_visibility.find(zv => zv.zone === '__all__');
        if (allZonesConfig) {
          // Evento per tutte le zone, controlla il target
          const target = allZonesConfig.target || 'all';
          if (target === 'all') return true;
          if (target === 'users' && isUserType) return true;
          if (target === 'consultants' && isConsultantType) return true;
          return false;
        }
        
        // Cerca la configurazione per la zona dell'utente (case-insensitive)
        const zoneConfig = event.zone_visibility.find(zv => 
          zv.zone?.toLowerCase() === userZone
        );
        if (!zoneConfig) return false; // La zona dell'utente non è nelle zone selezionate
        
        const target = zoneConfig.target || 'all';
        if (target === 'all') return true;
        if (target === 'users' && isUserType) return true;
        if (target === 'consultants' && isConsultantType) return true;
        return false;
      }
      
      // Retrocompatibilità: se c'è solo visible_to_zones senza zone_visibility (case-insensitive)
      if (event.visible_to_zones && event.visible_to_zones.length > 0) {
        if (!userZone || !event.visible_to_zones.some(z => z?.toLowerCase() === userZone)) return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      return dateA - dateB;
    }); // Ordina per data crescente
  
  // Conteggio eventi futuri (per il cerchio) - esclude eventi cancellati/annullati
  const futureEventsCount = events.filter(e => {
    if (!e.date) return false;
    const eventDate = new Date(e.date);
    if (isNaN(eventDate.getTime())) return false;
    eventDate.setHours(0, 0, 0, 0);
    return eventDate >= today && e.approval_status === 'approved' && !e.is_cancelled;
  }).length;

  // Subscribe real-time agli eventi per notifiche
  useEffect(() => {
    const unsubscribe = base44.entities.Event.subscribe((event) => {
      if (event.type === 'create') {
        if (playSound) playSound();
        setHasNewEvent(true);
      }
      queryClient.invalidateQueries({ queryKey: ['events'] });
    });

    return unsubscribe;
  }, [queryClient, playSound]);

  // Traccia quando cambiano gli eventi per attivare il glow
  useEffect(() => {
    if (futureEventsCount > lastEventCount && lastEventCount > 0) {
      setHasNewEvent(true);
      if (playSound) playSound();
    }
    setLastEventCount(futureEventsCount);
  }, [futureEventsCount, lastEventCount, playSound]);

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

  const handleUserImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingUserImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNewUserEvent({ ...newUserEvent, image_url: file_url });
    } catch (error) {
      console.error('Errore upload immagine:', error);
    } finally {
      setUploadingUserImage(false);
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
        event_type: 'consorzio',
        approval_status: 'approved',
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
    onSuccess: (createdEvent) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowAddEvent(false);
      setNewEvent({ title: '', description: '', date: '', time: '', location: '', image_url: '', reminder_enabled: false });
      // Apri automaticamente il gestore zone dopo la creazione
      if (createdEvent) {
        setTimeout(() => setZoneManagerEvent(createdEvent), 300);
      }
    }
  });

  // Mutation per creare evento utente (richiede approvazione)
  const createUserEventMutation = useMutation({
    mutationFn: async (eventData) => {
      // Validazione: max 1 evento ogni 30 giorni per utenti/consulenti (admin escluso)
      const userRole = user?.role;
      if (userRole !== 'admin') {
        const userEvents = await base44.entities.Event.filter({ creator_email: user?.email });
        if (userEvents.length > 0) {
          // Trova l'evento più recente creato dall'utente
          const sortedEvents = userEvents.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
          const lastEvent = sortedEvents[0];
          const lastEventDate = new Date(lastEvent.created_date);
          const today = new Date();
          const daysSinceLastEvent = Math.floor((today - lastEventDate) / (1000 * 60 * 60 * 24));
          
          if (daysSinceLastEvent < 30) {
            const daysRemaining = 30 - daysSinceLastEvent;
            throw new Error(`Puoi creare solo 1 evento ogni 30 giorni. Potrai creare un nuovo evento tra ${daysRemaining} giorni.`);
          }
        }
      }

      const event = await base44.entities.Event.create({
        ...eventData,
        event_type: 'utente',
        approval_status: 'pending',
        creator_email: user?.email,
        creator_name: user?.company_name || user?.full_name || user?.email,
        participants: [],
        declined: []
      });
      
      // Notifica agli admin per approvazione
      const admins = await base44.entities.User.filter({ role: 'admin' });
      for (const admin of admins) {
        await base44.entities.Notification.create({
          user_email: admin.email,
          type: 'event',
          title: 'Nuovo evento da approvare',
          content: `${user?.company_name || user?.full_name} ha proposto un evento: "${eventData.title}"`,
          reference_id: event.id,
          is_read: false
        });
      }
      
      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowUserEventForm(false);
      setNewUserEvent({ title: '', description: '', date: '', time: '', location: '', image_url: '' });
      setShowSuccessPopup(true);
    },
    onError: (error) => {
      alert(error.message || 'Errore durante la creazione dell\'evento');
    }
  });

  // Mutation per approvare/rifiutare evento
  const approveEventMutation = useMutation({
    mutationFn: async ({ eventId, approved, rejectionReason }) => {
      const event = allEvents.find(e => e.id === eventId);
      await base44.entities.Event.update(eventId, {
        approval_status: approved ? 'approved' : 'rejected',
        rejection_reason: rejectionReason || null
      });
      
      // Notifica al creatore
      if (event?.creator_email) {
        await base44.entities.Notification.create({
          user_email: event.creator_email,
          type: 'event',
          title: approved ? 'Evento approvato!' : 'Evento non approvato',
          content: approved 
            ? `Il tuo evento "${event.title}" è stato approvato ed è ora visibile nel calendario.`
            : `Il tuo evento "${event.title}" non è stato approvato. ${rejectionReason || ''}`,
          reference_id: eventId,
          is_read: false
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
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

      const updatedEvent = await base44.entities.Event.update(editingEvent.id, {
        title: eventData.title,
        description: eventData.description,
        date: eventData.date,
        time: eventData.time,
        location: eventData.location,
        image_url: eventData.image_url,
        data_blocco_partecipazione: dataBlocco?.toISOString(),
        reminder_enabled: eventData.reminder_enabled
      });

      // Invia notifica a tutti gli utenti invitati (sia per admin che per creatore)
      const partecipazioniEvento = partecipazioni.filter(p => p.evento_id === editingEvent.id);
      const modifierName = isAdmin ? 'l\'amministratore' : (user?.company_name || user?.full_name || 'il creatore');
      for (const p of partecipazioniEvento) {
        await base44.entities.Notification.create({
          user_email: p.user_email,
          type: 'event',
          title: 'Evento modificato',
          content: `L'evento "${eventData.title}" è stato modificato da ${modifierName}. Controlla i dettagli aggiornati.`,
          reference_id: editingEvent.id,
          is_read: false
        });
      }

      return updatedEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowEditEvent(false);
      setEditingEvent(null);
      setShowEditSuccessPopup(true);
    }
  });

  const respondToEventMutation = useMutation({
    mutationFn: async ({ eventId, response }) => {
      // Prendi l'email utente direttamente
      const userEmail = user?.email;
      if (!userEmail) {
        throw new Error('Utente non autenticato');
      }

      // Cerca l'evento sia in allEvents che in events
      const evento = allEvents.find(e => e.id === eventId) || events.find(e => e.id === eventId);
      
      // Verifica server-side: controlla se l'evento è bloccato
      if (evento?.data_blocco_partecipazione) {
        const now = new Date();
        const bloccoDate = new Date(evento.data_blocco_partecipazione);
        if (now >= bloccoDate) {
          throw new Error('Le iscrizioni per questo evento sono chiuse');
        }
      }

      const existingParticipations = await base44.entities.PartecipazioniEvento.filter({
        user_email: userEmail,
        evento_id: eventId
      });

      const newStato = response === 'accept' ? 'confermato' : 'non_confermato';

      let result;
      if (existingParticipations.length > 0) {
        // Aggiorna esistente
        result = await base44.entities.PartecipazioniEvento.update(existingParticipations[0].id, {
          stato: newStato
        });
      } else {
        // Crea nuova partecipazione
        result = await base44.entities.PartecipazioniEvento.create({
          user_email: userEmail,
          evento_id: eventId,
          stato: newStato
        });
      }

      return result;
    },
    onSuccess: () => {
      // Chiudi il dialog se aperto
      setChangeResponseEvent(null);
      // Invalida le query per aggiornare la UI
      queryClient.invalidateQueries({ queryKey: ['partecipazioni-eventi'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (error) => {
      console.error('Errore risposta evento:', error);
      alert(error.message || 'Si è verificato un errore');
    }
  });

  // Usa l'email dell'utente impersonificato se attivo, altrimenti l'utente reale
  const getEffectiveUserEmail = () => {
    if (impersonation.active && impersonation.targetEmail) {
      return impersonation.targetEmail;
    }
    return user?.email;
  };

  const getUserResponse = (eventoId) => {
    const effectiveEmail = getEffectiveUserEmail();
    if (!effectiveEmail) return null;
    const partecipazione = partecipazioni.find(
      p => p.user_email === effectiveEmail && p.evento_id === eventoId
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
    <div className="min-h-screen pb-64 overflow-x-hidden" style={{ backgroundColor: `color-mix(in srgb, ${currentMonthColor} 10%, #0f172a)` }}>
      <main className="px-4 pt-16 pb-6 max-w-md mx-auto w-full" id="calendario-incontri">
        <div className="flex items-center justify-between mb-6 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-shrink">
            <div className="w-9 h-9 rounded-full bg-lime-400 flex items-center justify-center flex-shrink-0">
              <span className="text-slate-900 font-bold text-base">{futureEventsCount}</span>
            </div>
            <h1 className="text-white text-lg font-bold truncate">Calendario Incontri</h1>
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
          {isAdmin && (
            <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-lime-400 hover:bg-lime-500 text-slate-900">
                  <Plus className="w-4 h-4 mr-1" />
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
                  
                  {/* Reminder Switch */}
                  <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-lime-400" />
                      <div>
                        <Label className="text-white text-sm">Promemoria automatici</Label>
                        <p className="text-slate-500 text-xs">Invia notifiche ogni 48h a chi non risponde</p>
                      </div>
                    </div>
                    <Switch
                      checked={newEvent.reminder_enabled}
                      onCheckedChange={(checked) => setNewEvent({...newEvent, reminder_enabled: checked})}
                    />
                  </div>

                  <div className="bg-amber-900/20 border border-amber-600/30 p-3 rounded-lg">
                    <p className="text-amber-400 text-sm">
                      💡 Dopo aver creato l'evento, potrai selezionare le zone e i destinatari dal pulsante "Gestisci Zone e Notifiche".
                    </p>
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
        </div>

        {/* Pulsante Proponi - full width sotto il titolo, solo per non-admin */}
        {!isAdmin && (
          <Button 
            className="w-full mb-6 bg-slate-700 hover:bg-slate-600 text-white h-12 text-base font-semibold"
            onClick={() => setShowUserEventForm(true)}
          >
            <Plus className="w-5 h-5 mr-2" />
            Proponi ad altri un tuo evento
          </Button>
        )}

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
              
              // Determina overlay basato su risposta utente o stato evento
              const getOverlayStyle = () => {
                if (event.is_cancelled) return 'cancelled';
                if (!isAdmin && event.creator_email !== user?.email && userResponse) {
                  return userResponse === 'accepted' ? 'accepted' : 'declined';
                }
                return null;
              };
              const overlayType = getOverlayStyle();

              return (
                <Card key={event.id} className={`overflow-hidden relative ${
                event.event_type === 'consorzio' || !event.event_type 
                  ? 'bg-slate-800 border-2 border-lime-400' 
                  : 'bg-slate-800/70 border-slate-700'
                }`}>
                  {/* Overlay basato su stato */}
                  {overlayType === 'cancelled' && (
                    <div className="absolute inset-0 bg-red-900/70 flex items-center justify-center z-10 pointer-events-none">
                      <div className="text-center transform -rotate-12">
                        <span className="text-white text-2xl font-black uppercase tracking-wider drop-shadow-lg border-4 border-white px-4 py-2">
                          EVENTO ANNULLATO
                        </span>
                      </div>
                    </div>
                  )}
                  {overlayType === 'accepted' && (
                    <div className="absolute inset-0 bg-green-900/40 z-10 pointer-events-none" />
                  )}
                  {overlayType === 'declined' && (
                    <div className="absolute inset-0 bg-red-900/40 z-10 pointer-events-none" />
                  )}
                  {/* Badge tipo evento e stato approvazione */}
                  <div className="flex items-center gap-2 px-4 pt-3">
                    {(event.event_type === 'consorzio' || !event.event_type) ? (
                      <span className="bg-lime-400 text-slate-900 text-xs font-bold px-2 py-1 rounded">
                        EVENTO CONSORZIO
                      </span>
                    ) : (
                      <span className="bg-slate-600 text-white text-xs font-medium px-2 py-1 rounded">
                        Evento di {event.creator_name || 'Membro'}
                      </span>
                    )}
                    {event.approval_status === 'pending' && (
                      <span className="bg-yellow-500 text-slate-900 text-xs font-bold px-2 py-1 rounded">
                        IN ATTESA
                      </span>
                    )}
                    {event.approval_status === 'rejected' && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                        NON APPROVATO
                      </span>
                    )}
                  </div>
                  {event.image_url && (
                    <div className="w-full mt-2 bg-slate-900">
                      <img 
                        src={event.image_url} 
                        alt={event.title}
                        className="w-full h-auto max-h-[400px] object-contain"
                      />
                    </div>
                  )}
                  <CardHeader className="pb-3">
                                            {event.date && (
                                              <p className="text-lime-400 text-sm font-bold uppercase mb-1">
                                                {format(new Date(event.date), 'MMMM', { locale: it })}
                                              </p>
                                            )}
                                            <CardTitle className="text-white text-lg">{event.title}</CardTitle>
                                          </CardHeader>
                  <CardContent className="space-y-3">
                    {event.description && (
                      <p className="text-slate-400 text-sm">{event.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-4 text-sm">
                      {event.date && (
                        <div className="flex items-center gap-2 text-lime-400">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(event.date), 'd MMMM yyyy', { locale: it })}</span>
                        </div>
                      )}
                      {event.time && (
                        <div className="flex items-center gap-2 text-lime-400">
                          <Clock className="w-4 h-4" />
                          <span>{event.time}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                      <MapPin className="w-4 h-4 text-lime-400 flex-shrink-0" />
                      <span>{event.location}</span>
                    </div>
                    
                    {/* Mostra partecipanti per admin O per il creatore dell'evento */}
                    {(isAdmin || event.creator_email === user?.email) && (
                                                <>
                                                  <div 
                                                    className="flex items-center gap-2 text-slate-300 text-sm cursor-pointer hover:text-lime-400"
                                                    onClick={async () => {
                                                      setShowParticipantsEvent(event);
                                                      // Segna come lette le notifiche di risposta per questo evento
                                                      if (user?.email) {
                                                        const notifs = await base44.entities.Notification.filter({
                                                          user_email: user.email,
                                                          type: 'event_response',
                                                          reference_id: event.id
                                                        });
                                                        for (const n of notifs) {
                                                          await base44.entities.Notification.delete(n.id);
                                                        }
                                                        queryClient.invalidateQueries({ queryKey: ['notifications'] });
                                                      }
                                                    }}
                                                  >
                                                    <Users className="w-4 h-4 text-lime-400" />
                                                    <span>{participantCount} partecipanti confermati</span>
                                                    <span className="text-xs text-slate-500">(clicca per lista)</span>
                                                  </div>

                                                  {isAdmin && (
                                                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                                                      <Users className="w-4 h-4 text-slate-500" />
                                                      <span>{getInvitedCount(event.id)} invitati totali</span>
                                                    </div>
                                                  )}
                                                </>
                                              )}

                    {isAdmin && (
                     <div className="pt-3 border-t border-slate-700 space-y-2">
                       {/* Pulsanti approvazione per eventi in attesa */}
                       {event.approval_status === 'pending' && (
                         <div className="grid grid-cols-2 gap-2 mb-2">
                           <Button
                             size="sm"
                             className="bg-green-600 hover:bg-green-700 text-white"
                             onClick={async () => {
                               if (approvingEventId === event.id) return; // Blocca doppio click
                               setApprovingEventId(event.id);
                               try {
                                 await approveEventMutation.mutateAsync({ eventId: event.id, approved: true });
                                 // Dopo approvazione, apri il gestore zone
                                 setTimeout(() => setZoneManagerEvent(event), 500);
                               } finally {
                                 setApprovingEventId(null);
                               }
                             }}
                             disabled={approveEventMutation.isPending || approvingEventId === event.id}
                           >
                             {approvingEventId === event.id ? (
                               <div className="w-4 h-4 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin" />
                             ) : (
                               <Check className="w-4 h-4 mr-1" />
                             )}
                             {approvingEventId === event.id ? 'Approvo...' : 'Approva'}
                           </Button>
                           <Button
                             size="sm"
                             className="bg-red-600 hover:bg-red-700 text-white"
                             onClick={async () => {
                               if (approvingEventId === event.id) return;
                               const reason = prompt('Motivo del rifiuto (opzionale):');
                               setApprovingEventId(event.id);
                               try {
                                 await approveEventMutation.mutateAsync({ eventId: event.id, approved: false, rejectionReason: reason });
                               } finally {
                                 setApprovingEventId(null);
                               }
                             }}
                             disabled={approveEventMutation.isPending || approvingEventId === event.id}
                           >
                             <X className="w-4 h-4 mr-1" />
                             Rifiuta
                           </Button>
                         </div>
                       )}
                       {/* Pulsante per gestire zone/notifiche per tutti gli eventi */}
                       <Button
                         size="sm"
                         className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 mb-2"
                         onClick={() => setZoneManagerEvent(event)}
                       >
                         <Send className="w-4 h-4 mr-1" />
                         {event.notifications_sent ? 'Gestisci Zone' : 'Gestisci Zone e Notifiche'}
                       </Button>

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

                         {/* Pulsanti cancella/elimina evento per admin */}
                         {!event.is_cancelled ? (
                           <Button
                             variant="outline"
                             size="sm"
                             className="w-full mt-2 border-orange-600 text-orange-400 hover:bg-orange-600/20"
                             onClick={async () => {
                               if (confirm('Cancellare questo evento? Rimarrà visibile con la scritta "CANCELLATO". Gli invitati riceveranno una notifica.')) {
                                 await base44.entities.Event.update(event.id, {
                                   is_cancelled: true,
                                   cancelled_at: new Date().toISOString()
                                 });
                                 const partecipazioniEvento = partecipazioni.filter(p => p.evento_id === event.id);
                                 for (const p of partecipazioniEvento) {
                                   await base44.entities.Notification.create({
                                     user_email: p.user_email,
                                     type: 'event',
                                     title: 'Evento cancellato',
                                     content: `L'evento "${event.title}" è stato cancellato.`,
                                     reference_id: event.id,
                                     is_read: false
                                   });
                                 }
                                 queryClient.invalidateQueries({ queryKey: ['events'] });
                               }
                             }}
                           >
                             <X className="w-4 h-4 mr-2" />
                             Cancella evento
                           </Button>
                         ) : (
                           <Button
                             variant="outline"
                             size="sm"
                             className="w-full mt-2 border-green-600 text-green-400 hover:bg-green-600/20"
                             onClick={async () => {
                               if (confirm('Ripristinare questo evento?')) {
                                 await base44.entities.Event.update(event.id, {
                                   is_cancelled: false,
                                   cancelled_at: null
                                 });
                                 queryClient.invalidateQueries({ queryKey: ['events'] });
                               }
                             }}
                           >
                             <Check className="w-4 h-4 mr-2" />
                             Ripristina evento
                           </Button>
                         )}
                         <Button
                           variant="destructive"
                           size="sm"
                           className="w-full mt-2"
                           onClick={async () => {
                             if (confirm('Eliminare DEFINITIVAMENTE questo evento? Questa azione è irreversibile e l\'evento non sarà più visibile.')) {
                               const partecipazioniEvento = partecipazioni.filter(p => p.evento_id === event.id);
                               for (const p of partecipazioniEvento) {
                                 await base44.entities.PartecipazioniEvento.delete(p.id);
                               }
                               await base44.entities.Event.delete(event.id);
                               queryClient.invalidateQueries({ queryKey: ['events'] });
                               queryClient.invalidateQueries({ queryKey: ['partecipazioni-eventi'] });
                             }
                           }}
                         >
                           <X className="w-4 h-4 mr-2" />
                           Elimina definitivamente
                         </Button>
                       </div>
                       )}

                    {/* Pulsanti modifica/cancella per il creatore dell'evento */}
                      {!isAdmin && event.creator_email === user?.email && event.approval_status === 'approved' && !event.is_cancelled && (
                        <div className="pt-3 border-t border-slate-700">
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-slate-600 text-slate-300 hover:bg-slate-700"
                              onClick={() => {
                                setEditingEvent(event);
                                setShowEditEvent(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Modifica
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-600 text-red-400 hover:bg-red-600/20"
                              onClick={async () => {
                                if (confirm('Sei sicuro di voler cancellare questo evento? Gli invitati riceveranno una notifica.')) {
                                  // Marca come cancellato invece di eliminare
                                  await base44.entities.Event.update(event.id, {
                                    is_cancelled: true,
                                    cancelled_at: new Date().toISOString()
                                  });
                                  // Notifica a tutti gli invitati
                                  const partecipazioniEvento = partecipazioni.filter(p => p.evento_id === event.id);
                                  for (const p of partecipazioniEvento) {
                                    await base44.entities.Notification.create({
                                      user_email: p.user_email,
                                      type: 'event',
                                      title: 'Evento cancellato',
                                      content: `L'evento "${event.title}" è stato cancellato dal creatore.`,
                                      reference_id: event.id,
                                      is_read: false
                                    });
                                  }
                                  queryClient.invalidateQueries({ queryKey: ['events'] });
                                }
                              }}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Cancella
                            </Button>
                          </div>
                        </div>
                      )}

                    {/* Stato partecipazione utente - solo per non-admin */}
                    {!isAdmin && event.creator_email !== user?.email && !event.is_cancelled && (
                      <div className="pt-3 border-t border-slate-700 relative z-20">
                        {userResponse ? (
                          <div className="space-y-3">
                            <div className={`p-3 rounded-lg ${
                              userResponse === 'accepted' ? 'bg-green-600/30 border border-green-500/50' : 'bg-red-600/30 border border-red-500/50'
                            }`}>
                              <p className={`text-sm font-bold ${
                                userResponse === 'accepted' ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {userResponse === 'accepted' 
                                  ? "✓ PARTECIPERAI A QUESTO EVENTO" 
                                  : "✗ NON PARTECIPERAI A QUESTO EVENTO"}
                              </p>
                            </div>
                            {!isBlocked && (
                              <Button
                                size="sm"
                                className="w-full bg-white hover:bg-slate-100 text-slate-900 font-medium"
                                onClick={() => setChangeResponseEvent(event)}
                              >
                                Cambia la tua risposta
                              </Button>
                            )}
                          </div>
                        ) : !isBlocked ? (
                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              className="bg-green-600 hover:bg-green-700 text-white flex items-center justify-center text-sm"
                              disabled={respondToEventMutation.isPending}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                respondToEventMutation.mutate({ eventId: event.id, response: 'accept' });
                              }}
                            >
                              <Check className="w-4 h-4 mr-1 flex-shrink-0" />
                              <span className="truncate">Parteciperò</span>
                            </Button>
                            <Button
                              className="bg-red-600 hover:bg-red-700 text-white flex items-center justify-center text-sm"
                              disabled={respondToEventMutation.isPending}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                respondToEventMutation.mutate({ eventId: event.id, response: 'decline' });
                              }}
                            >
                              <X className="w-4 h-4 mr-1 flex-shrink-0" />
                              <span className="truncate">Non parteciperò</span>
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    )}
                    {isBlocked && !userResponse && !isAdmin && event.creator_email !== user?.email && !event.is_cancelled && (
                      <div className="mt-3 p-3 bg-slate-700/50 rounded-lg relative z-20">
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
      <Dialog open={showEditEvent} onOpenChange={(open) => {
      if (!open) {
      setShowEditEvent(false);
      setEditingEvent(null);
      }
      }}>
      <DialogContent className="bg-slate-800 border-slate-700 max-h-[85vh] overflow-y-auto">
      <DialogHeader>
      <DialogTitle className="text-white">Modifica Incontro</DialogTitle>
      </DialogHeader>
      <button
      onClick={() => {
        setShowEditEvent(false);
        setEditingEvent(null);
      }}
      className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
      >
      <X className="h-4 w-4 text-slate-400" />
      </button>
      <div className="space-y-4 mt-4">
      <Input
        placeholder="Titolo"
        value={editingEvent.title || ''}
        onChange={(e) => setEditingEvent({...editingEvent, title: e.target.value})}
        className="bg-slate-900 border-slate-700 text-white"
      />
      <Textarea
        placeholder="Descrizione"
        value={editingEvent.description || ''}
        onChange={(e) => setEditingEvent({...editingEvent, description: e.target.value})}
        className="bg-slate-900 border-slate-700 text-white"
      />
      <Input
        type="date"
        value={editingEvent.date || ''}
        onChange={(e) => setEditingEvent({...editingEvent, date: e.target.value})}
        className="bg-slate-900 border-slate-700 text-white"
      />
      <Input
        type="time"
        value={editingEvent.time || ''}
        onChange={(e) => setEditingEvent({...editingEvent, time: e.target.value})}
        className="bg-slate-900 border-slate-700 text-white"
      />
      <Input
        placeholder="Luogo"
        value={editingEvent.location || ''}
        onChange={(e) => setEditingEvent({...editingEvent, location: e.target.value})}
        className="bg-slate-900 border-slate-700 text-white"
      />

      {/* Reminder Switch */}
      <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-700">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-lime-400" />
          <div>
            <Label className="text-white text-sm">Promemoria automatici</Label>
            <p className="text-slate-500 text-xs">Invia notifiche ogni 48h a chi non risponde</p>
          </div>
        </div>
        <Switch
          checked={editingEvent.reminder_enabled || false}
          onCheckedChange={(checked) => setEditingEvent({...editingEvent, reminder_enabled: checked})}
        />
      </div>

      <Button 
        onClick={() => updateEventMutation.mutate(editingEvent)}
        disabled={updateEventMutation.isPending}
        className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
      >
        {updateEventMutation.isPending ? 'Salvataggio...' : 'Salva Modifiche'}
      </Button>

      {/* Pulsante per gestire zone (solo admin) */}
      {isAdmin && (
        <Button 
          variant="outline"
          onClick={() => {
            setShowEditEvent(false);
            setZoneManagerEvent(editingEvent);
          }}
          className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          <Send className="w-4 h-4 mr-2" />
          Gestisci Zone e Destinatari
        </Button>
      )}
      </div>
      </DialogContent>
      </Dialog>
      )}

      <div style={{ backgroundColor: `color-mix(in srgb, ${currentMonthColor} 10%, #0f172a)` }}>
        <BottomNavWithMenu currentPage="CalendarioIncontri" unreadMessages={messages.length} />
      </div>

      {/* Dialog per creare evento utente */}
      <Dialog open={showUserEventForm} onOpenChange={setShowUserEventForm}>
        <DialogContent className="bg-slate-800 border-slate-700 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Proponi un Evento</DialogTitle>
          </DialogHeader>
          <button
            onClick={() => setShowUserEventForm(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
          <p className="text-slate-400 text-sm mb-4">
            Il tuo evento sarà subito visibile a te nel calendario. Gli altri utenti lo vedranno dopo l'approvazione del Consorzio.
          </p>
          <div className="space-y-4">
            <Input
              placeholder="Titolo evento"
              value={newUserEvent.title}
              onChange={(e) => setNewUserEvent({...newUserEvent, title: e.target.value})}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <Textarea
              placeholder="Descrizione"
              value={newUserEvent.description}
              onChange={(e) => setNewUserEvent({...newUserEvent, description: e.target.value})}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <Input
              type="date"
              value={newUserEvent.date}
              onChange={(e) => setNewUserEvent({...newUserEvent, date: e.target.value})}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <Input
              type="time"
              value={newUserEvent.time}
              onChange={(e) => setNewUserEvent({...newUserEvent, time: e.target.value})}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <Input
              placeholder="Luogo"
              value={newUserEvent.location}
              onChange={(e) => setNewUserEvent({...newUserEvent, location: e.target.value})}
              className="bg-slate-900 border-slate-700 text-white"
            />
            
            {/* Image Upload (opzionale) */}
            <div className="space-y-2">
              <Label className="text-slate-300">Locandina (opzionale)</Label>
              <div className="flex flex-col gap-3">
                {newUserEvent.image_url ? (
                  <div className="relative rounded-lg overflow-hidden border border-slate-700">
                    <img 
                      src={newUserEvent.image_url} 
                      alt="Locandina" 
                      className="w-full h-48 object-cover"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={() => setNewUserEvent({...newUserEvent, image_url: ''})}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Label 
                    htmlFor="user-event-image" 
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors"
                  >
                    {uploadingUserImage ? (
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
                      id="user-event-image"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUserImageUpload}
                      disabled={uploadingUserImage}
                    />
                  </Label>
                )}
              </div>
            </div>

            <Button 
              onClick={() => createUserEventMutation.mutate(newUserEvent)}
              disabled={createUserEventMutation.isPending || !newUserEvent.title || !newUserEvent.date || !newUserEvent.time || !newUserEvent.location}
              className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
            >
              {createUserEventMutation.isPending ? 'Invio...' : 'Invia per approvazione'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center justify-center text-sm"
                  disabled={respondToEventMutation.isPending}
                  onClick={() => {
                    respondToEventMutation.mutate({ eventId: changeResponseEvent.id, response: 'accept' });
                  }}
                >
                  {respondToEventMutation.isPending ? (
                    <div className="w-4 h-4 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-1 flex-shrink-0" />
                  )}
                  <span className="truncate">Parteciperò</span>
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white flex items-center justify-center text-sm"
                  disabled={respondToEventMutation.isPending}
                  onClick={() => {
                    respondToEventMutation.mutate({ eventId: changeResponseEvent.id, response: 'decline' });
                  }}
                >
                  {respondToEventMutation.isPending ? (
                    <div className="w-4 h-4 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <X className="w-4 h-4 mr-1 flex-shrink-0" />
                  )}
                  <span className="truncate">Non parteciperò</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Success Popup dopo modifica evento */}
      <Dialog open={showEditSuccessPopup} onOpenChange={setShowEditSuccessPopup}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-lime-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-lime-400" />
            </div>
            <h3 className="text-white text-lg font-bold mb-2">EVENTO MODIFICATO</h3>
            <p className="text-slate-400 text-sm">
              Le modifiche sono state salvate.<br />
              Tutti gli invitati sono stati notificati delle modifiche.
            </p>
            <Button 
              className="mt-6 bg-lime-400 hover:bg-lime-500 text-slate-900"
              onClick={() => setShowEditSuccessPopup(false)}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Popup dopo invio proposta evento */}
      <Dialog open={showSuccessPopup} onOpenChange={setShowSuccessPopup}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-lime-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-lime-400" />
            </div>
            <h3 className="text-white text-lg font-bold mb-2">Evento creato!</h3>
            <p className="text-slate-400 text-sm">
              Il tuo evento è ora visibile nel tuo calendario.<br />
              Gli altri utenti lo vedranno dopo l'approvazione del Consorzio.
            </p>
            <Button 
              className="mt-6 bg-lime-400 hover:bg-lime-500 text-slate-900"
              onClick={() => setShowSuccessPopup(false)}
            >
              OK, ho capito
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Zone Manager Dialog */}
      <EventZoneManager
        event={zoneManagerEvent}
        open={!!zoneManagerEvent}
        onClose={() => setZoneManagerEvent(null)}
      />

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