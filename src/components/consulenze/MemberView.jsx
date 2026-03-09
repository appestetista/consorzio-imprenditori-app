import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Gift, Users } from 'lucide-react';
import useNotificationSound from '../hooks/useNotificationSound';

import PendingConfirmations from './PendingConfirmations';

import ConsultantCard from './ConsultantCard';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Nessuna lista hardcoded — mostra dinamicamente tutte le categorie dei consulenti filtrati per zona

export default function MemberView({ user, consultants, isLoading }) {
  const [consultationMessages, setConsultationMessages] = useState({});
  const [meetingPreferences, setMeetingPreferences] = useState({});
  const [meetingLinks, setMeetingLinks] = useState({});
  const [requestedConsultants, setRequestedConsultants] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const queryClient = useQueryClient();
  const { playSound } = useNotificationSound();
  const navigate = useNavigate();

  // Carica messaggi non letti dai consulenti (con dettaglio per mittente)
  const { data: unreadMessages = [] } = useQuery({
    queryKey: ['unread-consultation-messages-member', user?.email],
    queryFn: async () => {
      return await base44.entities.Message.filter({ 
        to_email: user?.email, 
        source: 'consulenze',
        is_read: false 
      });
    },
    enabled: !!user?.email
  });

  const unreadConsultationMessages = unreadMessages.length;

  // Conta messaggi non letti per email del mittente
  const unreadCountByEmail = useMemo(() => {
    const counts = {};
    unreadMessages.forEach(msg => {
      counts[msg.from_email] = (counts[msg.from_email] || 0) + 1;
    });
    return counts;
  }, [unreadMessages]);

  // Subscribe real-time ai messaggi consulenze
  useEffect(() => {
    if (!user?.email) return;

    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create' && 
          event.data?.to_email === user.email && 
          event.data?.source === 'consulenze') {
        playSound();
        queryClient.invalidateQueries({ queryKey: ['unread-consultation-messages-member', user.email] });
      }
    });

    return () => unsubscribe();
  }, [user?.email, queryClient, playSound]);

  // Carica tutte le prenotazioni attive dell'utente (per mostrare la chat)
  const { data: activeBookings = [] } = useQuery({
    queryKey: ['user-active-bookings', user?.email],
    queryFn: async () => {
      const allBookings = await base44.entities.ConsultationBooking.filter({ user_email: user.email });
      // Filtra solo quelle che non sono completate o cancellate
      return allBookings.filter(b => !['completed', 'cancelled'].includes(b.status));
    },
    enabled: !!user?.email,
  });

  // Carica le assegnazioni dei consulenti per questo utente
  React.useEffect(() => {
    if (!user?.email) return;
    
    const loadData = async () => {
      const userAssignments = await base44.entities.ConsultantAssignment.filter({ 
        user_email: user.email,
        is_assigned: true
      });
      
      // Crea automaticamente assignment per consulenti che non ne hanno
      // usando il valore free_consultations_per_user del consulente
      // NON creare assignment se il consulente ha impostato 0 consulenze gratuite
      const allConsultants = await base44.entities.Consultant.list();
      for (const consultant of allConsultants) {
        const hasAssignment = userAssignments.some(a => a.consultant_id === consultant.id);
        // Usa il valore impostato dal consulente, default 1 se non specificato
        const freeConsultations = Math.max(1, consultant.free_consultations_per_user ?? 1);
        
        // Crea sempre assignment anche se 0 consulenze gratuite (assegna minimo 1)
        if (!hasAssignment) {
          try {
            await base44.entities.ConsultantAssignment.create({
              user_email: user.email,
              consultant_id: consultant.id,
              available_consultations: freeConsultations,
              is_assigned: true
            });
          } catch (error) {
            // Assignment potrebbe esistere già da un'altra richiesta, ignora
            console.log('[MemberView] Assignment already exists for', consultant.id);
          }
        }
      }
      
      // Ricarica gli assignment aggiornati
      const updatedAssignments = await base44.entities.ConsultantAssignment.filter({ 
        user_email: user.email,
        is_assigned: true
      });
      console.log('[MemberView] Loaded assignments for', user.email, ':', updatedAssignments);
      setAssignments(updatedAssignments);

      const userBookings = await base44.entities.ConsultationBooking.filter({ 
        user_email: user.email,
        status: 'completed'
      });
      setBookings(userBookings);
    };
    
    loadData();
  }, [user?.email]);

  // Subscribe to real-time updates for assignments
  React.useEffect(() => {
    if (!user?.email) return;

    const unsubAssignments = base44.entities.ConsultantAssignment.subscribe((event) => {
      if (event.data?.user_email === user.email) {
        base44.entities.ConsultantAssignment.filter({ 
          user_email: user.email,
          is_assigned: true
        }).then(userAssignments => {
          console.log('[MemberView] Assignments updated:', userAssignments);
          setAssignments(userAssignments);
        });
      }
    });

    const unsubBookings = base44.entities.ConsultationBooking.subscribe((event) => {
      if (event.data?.user_email === user.email && event.data?.status === 'completed') {
        base44.entities.ConsultationBooking.filter({ 
          user_email: user.email,
          status: 'completed'
        }).then(completedBookings => {
          console.log('[MemberView] Bookings updated:', completedBookings);
          setBookings(completedBookings);
        });
      }
    });

    return () => {
      unsubAssignments();
      unsubBookings();
    };
  }, [user?.email]);

  const bookConsultationMutation = useMutation({
    mutationFn: async ({ consultantId, message, preference, link }) => {
      // Trova il consulente per ottenere la sua email
      const consultant = consultants.find(c => c.id === consultantId);
      
      const bookingData = {
        consultant_id: consultantId,
        user_email: user.email,
        subject: message,
        meeting_preference: preference,
        status: 'pending'
      };
      
      if (preference === 'online' && link) {
        bookingData.meeting_link = link;
      }
      
      const newBooking = await base44.entities.ConsultationBooking.create(bookingData);
      
      // Crea il messaggio iniziale nella sezione consulenze
      // Così il consulente vedrà il messaggio anche nella pagina Messaggi
      if (consultant?.email && message) {
        const conversationId = `consultation_${newBooking.id}`;
        await base44.entities.Message.create({
          from_email: user.email,
          to_email: consultant.email,
          content: message,
          conversation_id: conversationId,
          source: 'consulenze',
          source_reference: `Consulenza #${newBooking.id.slice(-6)}`,
          is_read: false
        });
      }
      
      // Crea notifica per il consulente
      if (consultant?.email) {
        await base44.entities.Notification.create({
          user_email: consultant.email,
          type: 'consultation',
          title: 'Nuova richiesta di consulenza',
          content: `${user.company_name || user.full_name || user.email} ha richiesto una consulenza: "${message}"`,
          is_read: false,
          reference_id: consultantId
        });
      }
      
      // Diminuisci le consulenze disponibili per questo specifico consulente-utente
      const assignment = assignments.find(a => a.consultant_id === consultantId);
      if (assignment) {
        await base44.entities.ConsultantAssignment.update(assignment.id, {
          available_consultations: Math.max(0, assignment.available_consultations - 1)
        });
      }

      // Salva il consulente usato nell'user
      const usedConsultants = user.consultation_requests || [];
      if (!usedConsultants.includes(consultantId)) {
        await base44.auth.updateMe({
          consultation_requests: [...usedConsultants, consultantId]
        });
      }
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
      queryClient.invalidateQueries({ queryKey: ['consultation-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      
      // Ricarica le assegnazioni aggiornate
      const userAssignments = await base44.entities.ConsultantAssignment.filter({ 
        user_email: user.email, 
        is_assigned: true 
      });
      setAssignments(userAssignments);
      
      setRequestedConsultants(prev => [...prev, variables.consultantId]);
      
      setConsultationMessages(prev => ({
        ...prev,
        [variables.consultantId]: ''
      }));
      setMeetingPreferences(prev => ({
        ...prev,
        [variables.consultantId]: ''
      }));
      setMeetingLinks(prev => ({
        ...prev,
        [variables.consultantId]: ''
      }));
    }
  });

  const hasRequestedThisSession = (consultantId) => {
    return requestedConsultants.includes(consultantId);
  };

  // Mostra solo consulenti NON bloccati e ASSEGNATI alla zona dell'utente dall'admin
  // Se un consulente non ha zone_assegnate né zona, non viene mostrato a nessuno
  const userZona = user?.zona?.toLowerCase()?.trim();
  const filteredConsultants = consultants.filter(c => {
    if (c.is_blocked) return false;
    // Il consulente DEVE avere almeno una zona assegnata dall'admin
    const hasZones = (c.zone_assegnate?.length > 0) || !!c.zona;
    if (!hasZones) return false;
    // Se l'utente non ha zona, non può vedere nessun consulente zonale
    if (!userZona) return false;
    const consultantZones = c.zone_assegnate?.map(z => z.toLowerCase().trim()) || [];
    const singleZona = c.zona?.toLowerCase()?.trim();
    return consultantZones.includes(userZona) || singleZona === userZona;
  });

  // Estrai dinamicamente le categorie dai consulenti filtrati (ordine alfabetico)
  const visibleCategories = [...new Set(filteredConsultants.map(c => c.category).filter(Boolean))].sort();

  // Calcola il totale delle consulenze disponibili solo dai consulenti mostrati
  const visibleConsultantIds = filteredConsultants.map(c => c.id);
  
  const totalConsultations = assignments
    .filter(a => visibleConsultantIds.includes(a.consultant_id))
    .reduce((sum, assignment) => {
      return sum + (assignment.available_consultations || 0);
    }, 0);
  
  const completedCount = bookings.length;

  return (
    <div className="w-full">
        {/* Mostra consulenze in attesa di conferma */}
        <PendingConfirmations userEmail={user?.email} />



        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : (
          <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 px-3">
            {visibleCategories.map((category, index) => {
              const consultant = filteredConsultants.find(c => c.category === category);
              if (!consultant) return null;
              
              const assignment = assignments.find(a => a.consultant_id === consultant.id && a.is_assigned);
              const isRequested = hasRequestedThisSession(consultant.id);
              const defaultConsultations = consultant.free_consultations_per_user ?? 1;
              const availableConsultations = assignment ? assignment.available_consultations : defaultConsultations;
              const completedCount = bookings.filter(b => b.consultant_id === consultant.id).length;
              const activeBooking = activeBookings.find(b => b.consultant_id === consultant.id);
              
              return (
                <ConsultantCard
                  key={index}
                  consultant={consultant}
                  category={category}
                  assignment={assignment}
                  availableConsultations={availableConsultations}
                  completedBookings={completedCount}
                  isRequested={isRequested}
                  activeBooking={activeBooking}
                  consultationMessage={consultationMessages[consultant.id]}
                  meetingPreference={meetingPreferences[consultant.id]}
                  meetingLink={meetingLinks[consultant.id]}
                  onMessageChange={(val) => setConsultationMessages(prev => ({ ...prev, [consultant.id]: val }))}
                  onPreferenceChange={(val) => setMeetingPreferences(prev => ({ ...prev, [consultant.id]: val }))}
                  onLinkChange={(val) => setMeetingLinks(prev => ({ ...prev, [consultant.id]: val }))}
                  onSubmit={() => bookConsultationMutation.mutate({ 
                    consultantId: consultant.id, 
                    message: consultationMessages[consultant.id] || '',
                    preference: meetingPreferences[consultant.id],
                    link: meetingLinks[consultant.id] || ''
                  })}
                  isSubmitting={bookConsultationMutation.isPending}
                  unreadCount={unreadCountByEmail[consultant.email] || 0}
                  onChatOpen={(c) => navigate(createPageUrl('Messaggi') + `?contact=${encodeURIComponent(c.email)}&source=consulenze`)}
                />
              );
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent value="consulenti">
        <ConsultantsList currentUserEmail={user?.email} currentUserLogo={user?.logo_url} showChat={true} userZona={user?.zona} />
      </TabsContent>
    </Tabs>
  );
}