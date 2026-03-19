import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Loader2, X, Briefcase, User, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function ConsultantBubble({ sectionId, sectionLabel, user }) {
  const [open, setOpen] = useState(false);
  const [selectedConsultant, setSelectedConsultant] = useState(null);
  const [messageContent, setMessageContent] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const queryClient = useQueryClient();

  const { data: consultants = [], isLoading } = useQuery({
    queryKey: ['section-consultants-bubble', sectionId, user?.zona],
    queryFn: async () => {
      const all = await base44.entities.Consultant.list();
      return all.filter(c => {
        if (c.is_blocked) return false;
        if (!c.communication_sections?.includes(sectionId)) return false;
        if (!user?.zona) return true;
        const zones = c.zone_assegnate || (c.zona ? [c.zona] : []);
        return zones.includes(user.zona);
      });
    },
    enabled: !!user,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Message.create({
        from_email: user.email,
        to_email: selectedConsultant.email,
        content: messageContent,
        source: sectionId,
        source_reference: sectionLabel,
        conversation_id: `${sectionId}_${user.email}_${selectedConsultant.email}`
      });
      await base44.entities.Notification.create({
        user_email: selectedConsultant.email,
        type: 'message',
        title: `Nuovo messaggio da ${user.company_name || user.full_name}`,
        content: `Hai ricevuto un messaggio dalla sezione "${sectionLabel}"`,
        reference_id: `${sectionId}_${user.email}`
      });
    },
    onSuccess: () => {
      toast.success('Messaggio inviato!');
      setOpen(false);
      setMessageContent('');
      setSelectedConsultant(null);
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: () => toast.error('Errore nell\'invio'),
  });

  if (!user || (consultants.length === 0 && !isLoading)) return null;

  return (
    <>
      {/* Bolla flottante */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-24 right-4 z-50 w-20 h-20 rounded-full flex items-center justify-center active:scale-95 transition-transform"
        style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(132,255,0,0.18), rgba(132,255,0,0.06) 60%, transparent 80%)',
          boxShadow: '0 0 24px rgba(132,255,0,0.15), 0 4px 16px rgba(0,0,0,0.3)',
          border: '1.5px solid rgba(132,255,0,0.25)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <img
          src="https://media.base44.com/images/public/695e2f74bb7d2636b5606a98/7574416f9_ChatGPT_Image_9_mar_2026__10_54_20-removebg-preview.png"
          alt="Consulente"
          className="w-16 h-16 object-contain"
        />
      </button>

      {/* Pannello form */}
      {open && (
        <div className="fixed bottom-24 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, rgba(15,23,42,0.97), rgba(30,41,59,0.97))',
              border: '1px solid rgba(132,255,0,0.2)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 16px rgba(132,255,0,0.08)',
              backdropFilter: 'blur(16px)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <img
                  src="https://media.base44.com/images/public/695e2f74bb7d2636b5606a98/7574416f9_ChatGPT_Image_9_mar_2026__10_54_20-removebg-preview.png"
                  alt=""
                  className="w-8 h-8 object-contain"
                />
                <span className="text-white font-semibold text-sm">Contatta un Consulente</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-6 h-6 text-lime-400 animate-spin" />
                </div>
              ) : (
                <>
                  {/* Selettore consulente */}
                  <div>
                    <label className="text-slate-400 text-xs mb-1.5 block">Scegli consulente</label>
                    <div className="relative">
                      <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors"
                        style={{
                          background: 'rgba(15,23,42,0.8)',
                          border: '1px solid rgba(71,85,105,0.5)',
                        }}
                      >
                        {selectedConsultant ? (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-lime-400/20 rounded-full flex items-center justify-center flex-shrink-0">
                              <Briefcase className="w-4 h-4 text-lime-400" />
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">{selectedConsultant.name}</p>
                              <p className="text-slate-400 text-xs">{selectedConsultant.category}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-sm">Seleziona un consulente...</span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showDropdown && (
                        <div
                          className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden max-h-48 overflow-y-auto z-10"
                          style={{
                            background: 'rgba(15,23,42,0.98)',
                            border: '1px solid rgba(71,85,105,0.5)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                          }}
                        >
                          {consultants.map(c => (
                            <button
                              key={c.id}
                              onClick={() => {
                                setSelectedConsultant(c);
                                setShowDropdown(false);
                              }}
                              className="w-full flex items-center gap-2 p-3 hover:bg-slate-700/50 transition-colors text-left"
                            >
                              <div className="w-8 h-8 bg-lime-400/20 rounded-full flex items-center justify-center flex-shrink-0">
                                <Briefcase className="w-4 h-4 text-lime-400" />
                              </div>
                              <div>
                                <p className="text-white text-sm font-medium">{c.name}</p>
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-blue-500/20 text-blue-400 border-0 text-[10px] px-1.5 py-0">{c.category}</Badge>
                                  {c.city && <span className="text-slate-500 text-[10px]">📍 {c.city}</span>}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Messaggio */}
                  <div>
                    <label className="text-slate-400 text-xs mb-1.5 block">Messaggio</label>
                    <Textarea
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      placeholder="Scrivi qui la tua richiesta..."
                      className="bg-slate-900/80 border-slate-700/50 text-white min-h-[80px] text-sm rounded-xl resize-none"
                    />
                  </div>

                  {/* Invio */}
                  <Button
                    onClick={() => sendMutation.mutate()}
                    disabled={sendMutation.isPending || !messageContent.trim() || !selectedConsultant}
                    className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 font-semibold rounded-xl"
                  >
                    {sendMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Invio...</>
                    ) : (
                      <><Send className="w-4 h-4 mr-2" /> Invia Messaggio</>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}