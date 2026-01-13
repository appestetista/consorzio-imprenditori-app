import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Phone, MessageCircle, ArrowLeft, Check, Gift, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';

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

export default function Consulenze() {
  const [user, setUser] = useState(null);
  const [effectiveUser, setEffectiveUser] = useState(null);
  const [consultationMessages, setConsultationMessages] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setEffectiveUser(currentUser);
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, []);

  const { data: consultants = [], isLoading } = useQuery({
    queryKey: ['consultants'],
    queryFn: () => base44.entities.Consultant.list(),
  });

  const { data: myBookings = [] } = useQuery({
    queryKey: ['my-bookings', effectiveUser?.email],
    queryFn: () => base44.entities.ConsultationBooking.filter({ user_email: effectiveUser?.email }),
    enabled: !!effectiveUser?.email,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', effectiveUser?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: effectiveUser?.email, is_read: false }),
    enabled: !!effectiveUser?.email,
  });

  const bookConsultationMutation = useMutation({
    mutationFn: async ({ consultantId, message }) => {
      const consultant = consultants.find(c => c.id === consultantId);
      
      // Create booking
      await base44.entities.ConsultationBooking.create({
        consultant_id: consultantId,
        user_email: effectiveUser.email,
        subject: message,
        status: 'pending'
      });
      
      // Decrement available slots
      await base44.entities.Consultant.update(consultantId, {
        available_slots: (consultant.available_slots || 100) - 1
      });
      
      // Update user's used consultations
      const usedConsultations = effectiveUser.consulenze_usate || [];
      await base44.auth.updateMe({
        consulenze_usate: [...usedConsultations, consultantId]
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      
      // Clear the message field
      setConsultationMessages(prev => ({
        ...prev,
        [variables.consultantId]: ''
      }));
      
      // Reload user data
      base44.auth.me().then((updatedUser) => {
        setUser(updatedUser);
        setEffectiveUser(updatedUser);
      });
    }
  });

  const hasUsedConsultant = (consultantId) => {
    return effectiveUser?.consulenze_usate?.includes(consultantId) || false;
  };

  const usedCount = effectiveUser?.consulenze_usate?.length || 0;
  const totalConsultants = CONSULTANT_CATEGORIES.length;

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={effectiveUser || user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('Home')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-white text-xl font-bold">CONSULENZE e PREVENTIVI</h1>
        </div>

        {/* Stats Card */}
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
                  <span className="text-3xl font-bold text-lime-400">{totalConsultants - usedCount}</span>
                  <p className="text-xs text-slate-400">disponibili</p>
                </div>
                <div>
                  <p className="text-slate-300 text-sm">Consulenze Utilizzate</p>
                  <p className="text-lime-400 font-bold">{usedCount}/{totalConsultants}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{totalConsultants} professionisti partner</span>
                <Badge variant="outline" className="bg-lime-400/20 text-lime-400 border-lime-400/30">
                  {totalConsultants - usedCount} crediti attivi
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Consultants List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {CONSULTANT_CATEGORIES.map((category, index) => {
              const consultant = consultants.find(c => c.category === category);
              const isUsed = consultant ? hasUsedConsultant(consultant.id) : false;
              
              return (
                <Card key={index} className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lime-400 text-base">{category}</CardTitle>
                      {isUsed && (
                        <Badge className="bg-green-600">
                          <Check className="w-3 h-3 mr-1" />
                          Utilizzata
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
      </main>

      <BottomNav currentPage="Consulenze" unreadMessages={messages.length} />
    </div>
  );
}