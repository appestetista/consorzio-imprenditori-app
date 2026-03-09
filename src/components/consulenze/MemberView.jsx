import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Phone, Check, Gift, Users, MessageCircle, Clock, Calendar, Video, Building2, Briefcase } from 'lucide-react';
import useNotificationSound from '../hooks/useNotificationSound';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PendingConfirmations from './PendingConfirmations';
import ConsultantsList from './ConsultantsList';

const CONSULTANT_CATEGORIES = [
  "Stampa Digitale e Cataloghi",
  "Assicurazioni Aziendali",
  "Agenzia di Comunicazione",
  "Commercialista",
  "Igiene e Sicurezza",
  "Internazionalizzazione/Export",
  "Broker Energetico",
  "Avvocato",
  "Bandi Europei",
  "Affitto Stampanti/Cyber Sicurezza",
  "Efficientamento Energetico/Centralini"
];

export default function MemberView({ user, consultants, isLoading }) {
  const [consultationMessages, setConsultationMessages] = useState({});
  const [meetingPreferences, setMeetingPreferences] = useState({});
  const [meetingLinks, setMeetingLinks] = useState({});
  const [requestedConsultants, setRequestedConsultants] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const queryClient = useQueryClient();
  const { playSound } = useNotificationSound();

  // Conta messaggi non letti dai consulenti
  const { data: unreadConsultationMessages = 0 } = useQuery({
    queryKey: ['unread-consultation-messages-member', user?.email],
    queryFn: async () => {
      const messages = await base44.entities.Message.filter({ 
        to_email: user?.email, 
        source: 'consulenze',
        is_read: false 
      });
      return messages.length;
    },
    enabled: !!user?.email
  });

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
        const freeConsultations = consultant.free_consultations_per_user ?? 1;
        
        // Se il consulente ha 0 consulenze gratuite, non creare assignment automatico
        if (!hasAssignment && freeConsultations > 0) {
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

  // Filtra consulenti che hanno la zona dell'utente nelle zone_assegnate
  const userZona = user?.zona?.toLowerCase();
  const filteredConsultants = consultants.filter(c => {
    // Verifica se il consulente ha la zona dell'utente tra le sue zone_assegnate
    const consultantZones = c.zone_assegnate?.map(z => z.toLowerCase()) || [];
    const hasZona = c.zona?.toLowerCase();
    return consultantZones.includes(userZona) || hasZona === userZona;
  });

  // Calcola il totale delle consulenze disponibili solo dai consulenti mostrati
  const visibleConsultantIds = CONSULTANT_CATEGORIES
    .map(category => filteredConsultants.find(c => c.category === category)?.id)
    .filter(Boolean);
  
  const totalConsultations = assignments
    .filter(a => visibleConsultantIds.includes(a.consultant_id))
    .reduce((sum, assignment) => {
      return sum + (assignment.available_consultations || 0);
    }, 0);
  
  const completedCount = bookings.length;

  return (
    <Tabs defaultValue="consulenze" className="w-full">
      <TabsList className="w-full bg-slate-800 border border-slate-700 mb-4">
        <TabsTrigger value="consulenze" className="flex-1 data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900">
          <Gift className="w-4 h-4 mr-2" />
          Consulenze
        </TabsTrigger>
        <TabsTrigger value="consulenti" className="flex-1 data-[state=active]:bg-amber-500 data-[state=active]:text-white">
          <Users className="w-4 h-4 mr-2" />
          Consulenti
          {unreadConsultationMessages > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {unreadConsultationMessages}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="consulenze">
        {/* Mostra consulenze in attesa di conferma */}
        <PendingConfirmations userEmail={user?.email} />



        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {CONSULTANT_CATEGORIES.map((category, index) => {
              const consultant = filteredConsultants.find(c => c.category === category);
              
              // Non mostrare la categoria se non c'è un consulente disponibile
              if (!consultant) return null;
              
              const assignment = assignments.find(a => a.consultant_id === consultant.id && a.is_assigned);
              const isRequested = hasRequestedThisSession(consultant.id);
              // Usa il valore dell'assignment, oppure free_consultations_per_user del consulente
              const defaultConsultations = consultant.free_consultations_per_user ?? 1;
              const availableConsultations = assignment ? assignment.available_consultations : defaultConsultations;
              const completedBookings = bookings.filter(b => b.consultant_id === consultant.id).length;
              
              const hasAvailable = availableConsultations > 0;
              
              return (
                <Card key={index} className={`border-slate-700 ${hasAvailable ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lime-400 text-base">{category}</CardTitle>
                      {isRequested && (
                        <Badge className="bg-green-600">
                          <Check className="w-3 h-3 mr-1" />
                          Richiesta inviata
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        {consultant.logo_url && (
                          <img 
                            src={consultant.logo_url} 
                            alt={`Logo ${consultant.name}`}
                            className="w-14 h-14 object-contain rounded-lg bg-slate-800 border border-slate-700 flex-shrink-0"
                          />
                        )}
                        <div className="flex-1">
                          <p className="text-slate-400 text-xs mb-0.5">Consulente:</p>
                          <p className="text-white font-medium text-base mb-2">{consultant.name}</p>
                          <p className="text-slate-400 text-xs mb-0.5">Referente:</p>
                          <p className="text-lime-400 text-sm">{consultant.referente || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-lime-400 text-xl font-bold">{availableConsultations}</p>
                        <p className="text-slate-400 text-xs">disponibili</p>
                        <p className="text-green-400 text-sm mt-1">{completedBookings} completate</p>
                      </div>
                    </div>

                    {availableConsultations === 0 ? (
                      <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                        <p className="text-slate-400 text-sm">
                          Non hai consulenze gratuite disponibili presso questo consulente
                        </p>
                      </div>
                    ) : (
                      <>
                        <Textarea
                          placeholder="Scrivi qui brevemente l'oggetto della consulenza..."
                          value={consultationMessages[consultant.id] || ''}
                          onChange={(e) => setConsultationMessages(prev => ({
                            ...prev,
                            [consultant.id]: e.target.value
                          }))}
                          disabled={isRequested}
                          className="bg-slate-900 border-lime-400/30 text-white min-h-[80px] mb-3"
                        />

                        {/* Preferenza modalità incontro */}
                        <div className="mb-3">
                          <Label className="text-slate-300 text-sm mb-2 block">Preferenza modalità:</Label>
                          <RadioGroup
                            value={meetingPreferences[consultant.id] || ''}
                            onValueChange={(value) => setMeetingPreferences(prev => ({
                              ...prev,
                              [consultant.id]: value
                            }))}
                            disabled={isRequested}
                            className="space-y-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="online" id={`online-${consultant.id}`} className="border-lime-400 text-lime-400 data-[state=checked]:bg-lime-400" />
                              <Label htmlFor={`online-${consultant.id}`} className="text-white flex items-center gap-2 cursor-pointer">
                                <Video className="w-4 h-4 text-blue-400" />
                                Online (videochiamata)
                              </Label>
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="sede_azienda" id={`sede_azienda-${consultant.id}`} className="border-lime-400 text-lime-400 data-[state=checked]:bg-lime-400" disabled={consultant.sede_azienda_disabled} />
                                <Label htmlFor={`sede_azienda-${consultant.id}`} className={`flex items-center gap-2 cursor-pointer ${consultant.sede_azienda_disabled ? 'text-slate-500' : 'text-white'}`}>
                                  <Building2 className={`w-4 h-4 ${consultant.sede_azienda_disabled ? 'text-slate-500' : 'text-amber-400'}`} />
                                  In presenza presso la nostra azienda
                                  {consultant.sede_azienda_disabled && <span className="text-xs text-red-400">(non disponibile)</span>}
                                </Label>
                              </div>
                              {meetingPreferences[consultant.id] === 'sede_azienda' && !consultant.sede_azienda_disabled && consultant.rimborso_carburante > 0 && (
                                <p className="text-amber-400 text-xs mt-1 ml-6">
                                  ⚠️ Il consulente, anche se la consulenza è gratuita, richiede un piccolo rimborso carburante di €{consultant.rimborso_carburante}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="sede_consulente" id={`sede_consulente-${consultant.id}`} className="border-lime-400 text-lime-400 data-[state=checked]:bg-lime-400" />
                              <Label htmlFor={`sede_consulente-${consultant.id}`} className="text-white flex items-center gap-2 cursor-pointer">
                                <Briefcase className="w-4 h-4 text-purple-400" />
                                In presenza presso il nostro studio
                              </Label>
                            </div>
                          </RadioGroup>
                          
                          {meetingPreferences[consultant.id] === 'online' && (
                            <Input
                              placeholder="Inserisci il link per la call (es. Google Meet, Zoom...)"
                              value={meetingLinks[consultant.id] || ''}
                              onChange={(e) => setMeetingLinks(prev => ({
                                ...prev,
                                [consultant.id]: e.target.value
                              }))}
                              disabled={isRequested}
                              className="bg-slate-900 border-blue-400/30 text-white mt-2"
                            />
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-lime-400 hover:bg-lime-500 text-slate-900 border-0"
                            onClick={() => bookConsultationMutation.mutate({ 
                              consultantId: consultant.id, 
                              message: consultationMessages[consultant.id] || '',
                              preference: meetingPreferences[consultant.id],
                              link: meetingLinks[consultant.id] || ''
                            })}
                            disabled={isRequested || bookConsultationMutation.isPending || !consultationMessages[consultant.id]?.trim() || !meetingPreferences[consultant.id]}
                          >
                            invia
                          </Button>
                          {consultant.phone && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
                              onClick={() => window.open(`tel:${consultant.phone}`)}
                            >
                              <Phone className="w-4 h-4 mr-1" />
                              chiama
                            </Button>
                          )}
                        </div>
                      </>
                    )}

                    {/* Mostra appuntamento se programmato */}
                    {(() => {
                      const activeBooking = activeBookings.find(b => b.consultant_id === consultant.id);
                      if (activeBooking?.scheduled_date) {
                        return (
                          <div className="mt-3 bg-blue-500/20 border border-blue-500/50 rounded-lg p-2">
                            <div className="flex items-center gap-2 text-blue-400 text-xs">
                              <Calendar className="w-3 h-3" />
                              <span>Appuntamento: {new Date(activeBooking.scheduled_date).toLocaleString('it-IT', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    </CardContent>
                    </Card>
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