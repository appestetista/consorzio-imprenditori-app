import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Phone, Check, Gift, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [requestedConsultants, setRequestedConsultants] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const queryClient = useQueryClient();

  // Carica le assegnazioni dei consulenti per questo utente
  React.useEffect(() => {
    if (!user?.email) return;
    
    const loadData = async () => {
      const userAssignments = await base44.entities.ConsultantAssignment.filter({ 
        user_email: user.email,
        is_assigned: true
      });
      
      // Crea automaticamente assignment per consulenti che non ne hanno
      const allConsultants = await base44.entities.Consultant.list();
      for (const consultant of allConsultants) {
        const hasAssignment = userAssignments.some(a => a.consultant_id === consultant.id);
        if (!hasAssignment) {
          try {
            await base44.entities.ConsultantAssignment.create({
              user_email: user.email,
              consultant_id: consultant.id,
              available_consultations: 1,
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
    mutationFn: async ({ consultantId, message }) => {
      await base44.entities.ConsultationBooking.create({
        consultant_id: consultantId,
        user_email: user.email,
        subject: message,
        status: 'pending'
      });
      
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
    }
  });

  const hasRequestedThisSession = (consultantId) => {
    return requestedConsultants.includes(consultantId);
  };

  // Calcola il totale delle consulenze disponibili solo dai consulenti mostrati
  const visibleConsultantIds = CONSULTANT_CATEGORIES
    .map(category => consultants.find(c => c.category === category)?.id)
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
        </TabsTrigger>
      </TabsList>

      <TabsContent value="consulenze">
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-lime-400/30 mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-lime-400 mb-3">
            <Gift className="w-5 h-5" />
            <span className="font-bold">Consulenze Gratuite Partner del Consorzio</span>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            Hai {totalConsultations} consulenze gratuite assegnate dai consulenti del consorzio
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-lime-400/20 rounded-xl p-4 text-center">
                <span className="text-3xl font-bold text-lime-400">{totalConsultations}</span>
                <p className="text-xs text-slate-400">disponibili</p>
              </div>
              <div>
                <p className="text-slate-300 text-sm">Consulenze Completate</p>
                <p className="text-lime-400 font-bold">{completedCount}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {CONSULTANT_CATEGORIES.map((category, index) => {
            const consultant = consultants.find(c => c.category === category);
            
            // Non mostrare la categoria se non c'è un consulente disponibile
            if (!consultant) return null;
            
            const assignment = assignments.find(a => a.consultant_id === consultant.id && a.is_assigned);
            const isRequested = hasRequestedThisSession(consultant.id);
            const availableConsultations = assignment ? assignment.available_consultations : 1;
            const completedBookings = bookings.filter(b => b.consultant_id === consultant.id).length;
            
            return (
              <Card key={index} className="bg-slate-800 border-slate-700">
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
                     <div className="flex-1">
                       <p className="text-slate-400 text-xs mb-0.5">Consulente:</p>
                       <p className="text-white font-medium text-base mb-2">{consultant.name}</p>
                       <p className="text-slate-400 text-xs mb-0.5">Referente:</p>
                       <p className="text-lime-400 text-sm">{consultant.referente || 'N/A'}</p>
                     </div>
                    <div className="flex-shrink-0 text-right">
                       <p className="text-lime-400 text-xl font-bold">{availableConsultations}</p>
                       <p className="text-slate-400 text-xs">disponibili</p>
                       <p className="text-green-400 text-sm mt-1">{completedBookings} completate</p>
                     </div>
                   </div>

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

                   <div className="flex gap-2">
                     <Button
                       size="sm"
                       className="bg-lime-400 hover:bg-lime-500 text-slate-900 border-0"
                       onClick={() => bookConsultationMutation.mutate({ 
                         consultantId: consultant.id, 
                         message: consultationMessages[consultant.id] || '' 
                       })}
                       disabled={isRequested || bookConsultationMutation.isPending || !consultationMessages[consultant.id]?.trim()}
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      </TabsContent>

      <TabsContent value="consulenti">
        <ConsultantsList currentUserEmail={user?.email} />
      </TabsContent>
    </Tabs>
  );
}