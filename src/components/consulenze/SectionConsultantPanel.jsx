import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send, Briefcase, User, Phone, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

/**
 * Pannello che mostra i consulenti disponibili per una specifica sezione
 * e permette all'utente di inviare messaggi
 * 
 * @param {string} sectionId - ID della sezione (es: 'finanziamenti', 'risparmio_energetico')
 * @param {string} sectionLabel - Label leggibile della sezione
 * @param {object} user - Utente corrente
 */
export default function SectionConsultantPanel({ sectionId, sectionLabel, user }) {
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [selectedConsultant, setSelectedConsultant] = useState(null);
  const [messageContent, setMessageContent] = useState('');
  
  const queryClient = useQueryClient();

  // Recupera i consulenti che hanno questa sezione attiva nei communication_sections
  // E che sono nella zona dell'utente (o in una delle zone_assegnate)
  const { data: availableConsultants = [], isLoading } = useQuery({
    queryKey: ['section-consultants', sectionId, user?.zona],
    queryFn: async () => {
      const allConsultants = await base44.entities.Consultant.list();
      
      // Filtra consulenti:
      // 1. Non bloccati
      // 2. Hanno questa sezione nei communication_sections
      // 3. Sono nella zona dell'utente (zona singola O zone_assegnate array)
      return allConsultants.filter(consultant => {
        // Non bloccato
        if (consultant.is_blocked) return false;
        
        // Ha questa sezione nei pannelli comunicazione
        const hasCommunicationSection = consultant.communication_sections?.includes(sectionId);
        if (!hasCommunicationSection) return false;
        
        // Verifica zona
        if (!user?.zona) return true; // Se l'utente non ha zona, mostra tutti
        
        // Controlla sia zona singola che zone_assegnate
        const consultantZones = consultant.zone_assegnate || (consultant.zona ? [consultant.zona] : []);
        const isInUserZone = consultantZones.includes(user.zona);
        
        return isInUserZone;
      });
    },
    enabled: !!user,
  });

  // Mutation per inviare messaggio
  const sendMessageMutation = useMutation({
    mutationFn: async ({ consultantEmail, content }) => {
      // Crea il messaggio
      await base44.entities.Message.create({
        from_email: user.email,
        to_email: consultantEmail,
        content: content,
        source: 'consulenze',
        source_reference: sectionLabel,
        conversation_id: `${sectionId}_${user.email}_${consultantEmail}`
      });

      // Crea notifica per il consulente
      await base44.entities.Notification.create({
        user_email: consultantEmail,
        type: 'message',
        title: `Nuovo messaggio da ${user.company_name || user.full_name}`,
        content: `Hai ricevuto un messaggio dalla sezione "${sectionLabel}"`,
        reference_id: `${sectionId}_${user.email}`
      });
    },
    onSuccess: () => {
      toast.success('Messaggio inviato al consulente!');
      setShowMessageDialog(false);
      setMessageContent('');
      setSelectedConsultant(null);
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (error) => {
      toast.error('Errore nell\'invio del messaggio');
      console.error(error);
    }
  });

  const handleOpenMessage = (consultant) => {
    setSelectedConsultant(consultant);
    setMessageContent('');
    setShowMessageDialog(true);
  };

  const handleSendMessage = () => {
    if (!messageContent.trim()) {
      toast.error('Scrivi un messaggio');
      return;
    }
    
    sendMessageMutation.mutate({
      consultantEmail: selectedConsultant.email,
      content: messageContent
    });
  };

  // Se non ci sono consulenti disponibili, non mostrare nulla
  if (isLoading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4 text-center">
          <Loader2 className="w-6 h-6 text-lime-400 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (availableConsultants.length === 0) {
    return null; // Non mostrare nulla se non ci sono consulenti
  }

  return (
    <>
      <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            <h3 className="text-white font-medium">Consulenti Disponibili</h3>
          </div>
          
          <p className="text-slate-400 text-sm mb-4">
            Contatta un consulente specializzato per questa sezione
          </p>

          <div className="space-y-3">
            {availableConsultants.map((consultant) => (
              <div 
                key={consultant.id}
                className="bg-slate-800 rounded-lg p-3 border border-slate-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-lime-400/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-5 h-5 text-lime-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{consultant.name}</p>
                      <Badge className="bg-blue-500/20 text-blue-400 border-0 text-xs mt-1">
                        {consultant.category}
                      </Badge>
                      {consultant.city && (
                        <p className="text-slate-500 text-xs mt-1">📍 {consultant.city}</p>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={() => handleOpenMessage(consultant)}
                    className="bg-lime-400 hover:bg-lime-500 text-slate-900"
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Contatta
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog Invio Messaggio */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-lime-400" />
              Contatta Consulente
            </DialogTitle>
          </DialogHeader>

          {selectedConsultant && (
            <div className="space-y-4 mt-4">
              {/* Info consulente */}
              <div className="bg-slate-900 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-lime-400/20 rounded-full flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-lime-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold">{selectedConsultant.name}</p>
                    <p className="text-lime-400 text-sm">{selectedConsultant.category}</p>
                    {selectedConsultant.referente && (
                      <p className="text-slate-400 text-xs flex items-center gap-1 mt-1">
                        <User className="w-3 h-3" /> {selectedConsultant.referente}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sezione di riferimento */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-slate-400 text-xs">Sezione:</p>
                <p className="text-blue-400 font-medium">{sectionLabel}</p>
              </div>

              {/* Campo messaggio */}
              <div>
                <label className="text-slate-300 text-sm mb-2 block">Il tuo messaggio</label>
                <Textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Scrivi qui la tua richiesta o domanda..."
                  className="bg-slate-900 border-slate-700 text-white min-h-[120px]"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowMessageDialog(false)}
              className="border-slate-600 text-slate-400"
            >
              Annulla
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={sendMessageMutation.isPending || !messageContent.trim()}
              className="bg-lime-400 hover:bg-lime-500 text-slate-900"
            >
              {sendMessageMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Invio...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Invia Messaggio
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}