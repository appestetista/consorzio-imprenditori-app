import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Phone, Check, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

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
  const queryClient = useQueryClient();

  const bookConsultationMutation = useMutation({
    mutationFn: async ({ consultantId, message }) => {
      const consultant = consultants.find(c => c.id === consultantId);
      
      await base44.entities.ConsultationBooking.create({
        consultant_id: consultantId,
        user_email: user.email,
        subject: message,
        status: 'pending'
      });
      
      // Diminuisci gli slot disponibili del consulente
      await base44.entities.Consultant.update(consultantId, {
        available_slots: Math.max(0, (consultant.available_slots || 100) - 1)
      });

      // Salva il consulente usato nell'user
      const usedConsultants = user.consultation_requests || [];
      if (!usedConsultants.includes(consultantId)) {
        await base44.auth.updateMe({
          consultation_requests: [...usedConsultants, consultantId]
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
      queryClient.invalidateQueries({ queryKey: ['consultation-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      
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

  // Calcola consulenze usate basandosi sulle richieste inviate
  const usedCount = (user?.consultation_requests || []).length;
  const totalConsultants = CONSULTANT_CATEGORIES.length;
  const availableCount = totalConsultants - usedCount;

  return (
    <>
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-lime-400/30 mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-lime-400 mb-3">
            <Gift className="w-5 h-5" />
            <span className="font-bold">Consulenze Gratuite Partner del Consorzio</span>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            Accedi a {totalConsultants} professionisti qualificati con {totalConsultants} consulenze gratuite incluse
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-lime-400/20 rounded-xl p-4 text-center">
                <span className="text-3xl font-bold text-lime-400">{availableCount}</span>
                <p className="text-xs text-slate-400">disponibili</p>
              </div>
              <div>
                <p className="text-slate-300 text-sm">Consulenze Utilizzate</p>
                <p className="text-lime-400 font-bold">{usedCount}/{totalConsultants}</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-lime-400/20 text-lime-400 border-lime-400/30">
              {availableCount} crediti attivi
            </Badge>
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
            const isRequested = consultant ? hasRequestedThisSession(consultant.id) : false;
            
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
                  {consultant ? (
                    <>
                      <p className="text-white text-sm mb-3">referente: {consultant.name}</p>
                      
                      <Textarea
                        placeholder="Scrivi qui brevemente l'oggetto della consulenza..."
                        value={consultationMessages[consultant.id] || ''}
                        onChange={(e) => setConsultationMessages(prev => ({
                          ...prev,
                          [consultant.id]: e.target.value
                        }))}
                        disabled={isUsed}
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
                          disabled={isUsed || !consultationMessages[consultant.id]?.trim() || bookConsultationMutation.isPending}
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
                  ) : (
                    <p className="text-slate-400 text-sm">Consulente in fase di attivazione</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}