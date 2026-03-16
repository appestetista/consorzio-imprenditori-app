import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, ArrowLeft, Send, Check, Clock, Trash2, Eye, Film, Lock, ExternalLink, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import SectionHeaderIcons from '../components/layout/SectionHeaderIcons';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import VideoRecensioniExamples from '../components/video/VideoRecensioniExamples';

export default function VideoRecensioni() {
  const [user, setUser] = useState(null);
  const [effectiveUser, setEffectiveUser] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    client_company: '',
    notes: ''
  });
  const [requestSent, setRequestSent] = useState(false);
  const [showAttivaPopup, setShowAttivaPopup] = useState(false);
  const queryClient = useQueryClient();
  const { impersonation, appMode } = useImpersonation();

  useEffect(() => {
    window.scrollTo(0, 0);
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      if (appMode === 'user-preview' && impersonation.previewUserId) {
        const users = await base44.entities.User.filter({ id: impersonation.previewUserId });
        setEffectiveUser(users.length > 0 ? users[0] : currentUser);
      } else {
        setEffectiveUser(currentUser);
      }
    };
    loadUser();
  }, [appMode, impersonation.previewUserId]);

  const isAdmin = user?.role === 'admin' && !impersonation.active && appMode === 'admin';

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', effectiveUser?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: effectiveUser?.email, is_read: false }),
    enabled: !!effectiveUser?.email,
  });

  // Richieste dell'utente corrente
  const { data: myRequests = [] } = useQuery({
    queryKey: ['my-video-reviews', effectiveUser?.email],
    queryFn: () => base44.entities.VideoReviewRequest.filter({ requester_email: effectiveUser?.email }),
    enabled: !!effectiveUser?.email && !isAdmin,
  });

  // Tutte le richieste (admin)
  const { data: allRequests = [] } = useQuery({
    queryKey: ['all-video-reviews'],
    queryFn: () => base44.entities.VideoReviewRequest.list('-created_date'),
    enabled: isAdmin,
  });

  const pendingRequests = allRequests.filter(r => r.status === 'pending');

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Calcola numero video abbonamento prima di creare
      const abbonamentoCount = selectedPlan === 'abbonamento' 
        ? myRequests.filter(r => r.plan_type === 'abbonamento').length + 1
        : null;

      const request = await base44.entities.VideoReviewRequest.create({
        requester_email: effectiveUser.email,
        requester_company: effectiveUser.company_name || effectiveUser.full_name,
        client_name: formData.client_name,
        client_phone: formData.client_phone,
        client_email: formData.client_email || '',
        client_company: formData.client_company || '',
        notes: formData.notes || '',
        plan_type: selectedPlan,
        status: 'pending'
      });

      // Notifica admin in background
      setTimeout(async () => {
        try {
          const admins = await base44.entities.User.filter({ role: 'admin' });
          for (const admin of admins) {
            await base44.entities.Notification.create({
              user_email: admin.email,
              type: 'video',
              title: 'Nuova Richiesta Video Recensione',
              content: `${effectiveUser.company_name || effectiveUser.full_name} ha richiesto una video recensione (${selectedPlan === 'abbonamento' ? 'Abbonamento' : 'Singolo'})`,
              reference_id: request.id,
              is_read: false
            });
          }

          const pianoLabel = selectedPlan === 'abbonamento' 
            ? `Abbonamento mensile (€100/mese) — Video n° ${abbonamentoCount} di 12` 
            : 'Singolo filmato (€200)';

          await base44.integrations.Core.SendEmail({
            from_name: 'Piattaforma Consorzio',
            to: 'consorzioimprenditori@gmail.com',
            subject: `Richiesta Video Recensione - ${effectiveUser.company_name || effectiveUser.full_name}${selectedPlan === 'abbonamento' ? ` [Video ${abbonamentoCount}/12]` : ''}`,
            body: `
Nuova richiesta di video recensione:

AZIENDA COMMITTENTE: ${effectiveUser.company_name || 'N/A'}
REFERENTE: ${effectiveUser.full_name || 'N/A'}
EMAIL: ${effectiveUser.email}
PIANO: ${pianoLabel}

DATI CLIENTE DA RECENSIRE:
Nome: ${formData.client_name}
Telefono: ${formData.client_phone}
Email: ${formData.client_email || 'N/A'}
Azienda: ${formData.client_company || 'N/A'}

NOTE: ${formData.notes || 'Nessuna'}
            `
          });
        } catch (e) {
          console.log('Errore notifiche:', e);
        }
      }, 100);

      return request;
    },
    onSuccess: () => {
      setRequestSent(true);
      queryClient.invalidateQueries({ queryKey: ['my-video-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['all-video-reviews'] });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.VideoReviewRequest.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-video-reviews'] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.VideoReviewRequest.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-video-reviews'] })
  });

  const resetForm = () => {
    setSelectedPlan(null);
    setFormData({ client_name: '', client_phone: '', client_email: '', client_company: '', notes: '' });
    setRequestSent(false);
  };

  const statusLabel = {
    pending: { text: 'In attesa', color: 'bg-yellow-500' },
    in_progress: { text: 'In lavorazione', color: 'bg-blue-500' },
    completed: { text: 'Completato', color: 'bg-green-500' },
    cancelled: { text: 'Annullato', color: 'bg-red-500' }
  };

  return (
    <div className="min-h-screen bg-slate-900 pb-64">
      <main className="px-4 pt-16 pb-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white text-xl font-bold truncate">Video Recensioni</h1>
        </div>

        {isAdmin ? (
          /* VISTA ADMIN */
          <Tabs defaultValue="requests" className="w-full">
            <TabsList className="grid w-full grid-cols-1 bg-slate-800 mb-4">
              <TabsTrigger value="requests" className="data-[state=active]:bg-[#d4af37] data-[state=active]:text-slate-900">
                Richieste {pendingRequests.length > 0 && <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center font-bold">{pendingRequests.length}</span>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="requests">
              {allRequests.length === 0 ? (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-8 text-center">
                    <Star className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Nessuna richiesta ricevuta</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {allRequests.map((req) => {
                    const st = statusLabel[req.status] || statusLabel.pending;
                    return (
                      <Card key={req.id} className={`border ${req.status === 'pending' ? 'bg-slate-800 border-[#d4af37]/50' : 'bg-slate-800 border-slate-700'}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-white font-bold text-sm">{req.requester_company}</h3>
                            <span className={`${st.color} text-white text-[10px] font-bold px-2 py-0.5 rounded`}>{st.text}</span>
                          </div>
                          <p className="text-[#d4af37] text-xs font-semibold mb-2">
                            {req.plan_type === 'abbonamento' ? '📦 Abbonamento mensile' : '🎬 Singolo filmato'}
                          </p>
                          <div className="bg-slate-900 rounded-lg p-3 mb-2 space-y-1">
                            <p className="text-white text-sm font-medium">Cliente: {req.client_name}</p>
                            <p className="text-slate-400 text-xs">Tel: {req.client_phone}</p>
                            {req.client_email && <p className="text-slate-400 text-xs">Email: {req.client_email}</p>}
                            {req.client_company && <p className="text-slate-400 text-xs">Azienda: {req.client_company}</p>}
                            {req.notes && <p className="text-slate-300 text-xs mt-2">{req.notes}</p>}
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-slate-500 text-xs flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(req.created_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            <div className="flex items-center gap-2">
                              {req.status === 'pending' && (
                                <Button size="sm" variant="outline" className="border-blue-500 text-blue-400 hover:bg-blue-500/20 h-7 text-xs px-2"
                                  onClick={() => updateStatusMutation.mutate({ id: req.id, status: 'in_progress' })}>
                                  <Eye className="w-3 h-3 mr-1" /> In lavorazione
                                </Button>
                              )}
                              {req.status === 'in_progress' && (
                                <Button size="sm" variant="outline" className="border-green-500 text-green-400 hover:bg-green-500/20 h-7 text-xs px-2"
                                  onClick={() => updateStatusMutation.mutate({ id: req.id, status: 'completed' })}>
                                  <Check className="w-3 h-3 mr-1" /> Completato
                                </Button>
                              )}
                              <button onClick={() => { if (confirm('Eliminare questa richiesta?')) deleteMutation.mutate(req.id); }} className="text-red-400 hover:text-red-500 p-1">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          /* VISTA UTENTE */
          <>
            {/* Descrizione servizio */}
            <Card className="bg-[#0a2540] border-[#1a3a5c] mb-6">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Film className="w-5 h-5 text-[#d4af37]" />
                  <h2 className="text-white font-bold">Come funziona</h2>
                </div>
                <p className="text-slate-300 text-sm mb-3">
                  Richiedi una video recensione da parte di un tuo cliente. Inserisci i dati del cliente e noi ci occuperemo di tutto: contatto, intervista, montaggio e pubblicazione.
                </p>
                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                  <p className="text-slate-400 text-xs flex items-center gap-1">
                    🔒 <span className="font-medium text-slate-300">I dati del tuo cliente non verranno divulgati.</span>
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    Saranno utilizzati esclusivamente da noi per contattarlo e organizzare la video recensione.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Esempi video */}
            <VideoRecensioniExamples />

            {/* Scelta piano */}
            {!selectedPlan && !requestSent && (
              <div className="space-y-3 mb-6">
                <h3 className="text-white font-bold text-center mb-2">Scegli il tuo piano</h3>

                {/* Singolo */}
                <button
                  onClick={() => setSelectedPlan('singolo')}
                  className="w-full text-left bg-[#0a2540] border border-[#1a3a5c] rounded-xl p-4 hover:border-[#d4af37]/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-bold text-base">🎬 Singolo Filmato</span>
                    <span className="text-[#d4af37] font-bold text-lg">€ 200</span>
                  </div>
                  <p className="text-slate-400 text-sm">+ IVA — Una video recensione professionale del tuo cliente</p>
                </button>

                {/* Abbonamento */}
                {(() => {
                  const abbRequests = myRequests.filter(r => r.plan_type === 'abbonamento');
                  const hasAbbonamento = effectiveUser?.video_abbonamento_attivo === true;
                  const completedAbbonamento = abbRequests.length;

                  return (
                    <div className="w-full text-left bg-[#0a2540] border-2 border-[#d4af37]/40 rounded-xl p-4 relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-[#d4af37] text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-bl">
                        CONVENIENTE
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-bold text-base">📦 Abbonamento Mensile</span>
                        <span className="text-[#d4af37] font-bold text-lg">€ 100<span className="text-sm font-normal">/mese</span></span>
                      </div>
                      <p className="text-slate-400 text-sm">+ IVA — 1 video recensione al mese inclusa nell'abbonamento</p>

                      {/* Barra progresso 12 video */}
                      <div className={`mt-3 pt-3 border-t border-slate-700/50 ${!hasAbbonamento ? 'opacity-40' : ''}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-slate-400 text-xs">Video utilizzati</span>
                          <span className="text-[#d4af37] text-xs font-bold">{completedAbbonamento} / 12</span>
                        </div>
                        <div className="flex gap-1">
                          {Array.from({ length: 12 }).map((_, i) => (
                            <div
                              key={i}
                              className="flex-1 h-3 rounded-full transition-colors"
                              style={{
                                backgroundColor: i < completedAbbonamento ? '#d4af37' : '#1e293b',
                                boxShadow: i < completedAbbonamento ? '0 0 6px rgba(212,175,55,0.4)' : 'none'
                              }}
                            />
                          ))}
                        </div>
                        <p className="text-slate-500 text-[10px] mt-1 text-center">12 video inclusi nell'abbonamento annuale</p>
                      </div>

                      {/* Pulsanti azione abbonamento */}
                      <div className="mt-3 flex gap-2">
                        {!hasAbbonamento ? (
                          <>
                            <button
                              onClick={() => setShowAttivaPopup(true)}
                              className="flex-1 h-10 rounded-xl text-slate-900 font-bold text-sm transition-all hover:brightness-110 active:scale-[0.98]"
                              style={{
                                background: 'linear-gradient(to bottom, #f7d774 0%, #e6b93d 35%, #c6921b 60%, #9e6f0f 100%)',
                                boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.5), inset 0 -4px 6px rgba(0,0,0,0.35), 0 6px 14px rgba(0,0,0,0.5)'
                              }}
                            >
                              <Lock className="w-4 h-4 inline mr-1 -mt-0.5" />
                              Attiva Abbonamento
                            </button>
                          </>
                        ) : (
                          <>
                            {completedAbbonamento < 12 && (
                              <button
                                onClick={() => setSelectedPlan('abbonamento')}
                                className="flex-1 h-10 rounded-xl text-slate-900 font-bold text-sm transition-all hover:brightness-110 active:scale-[0.98]"
                                style={{
                                  background: 'linear-gradient(to bottom, #f7d774 0%, #e6b93d 35%, #c6921b 60%, #9e6f0f 100%)',
                                  boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.5), inset 0 -4px 6px rgba(0,0,0,0.35), 0 6px 14px rgba(0,0,0,0.5)'
                                }}
                              >
                                Richiedi Video {completedAbbonamento + 1}/12
                              </button>
                            )}
                            {completedAbbonamento >= 12 && (
                              <div className="flex-1 h-10 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                                <span className="text-green-400 font-bold text-sm">✅ Abbonamento completato</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {!hasAbbonamento && (
                        <p className="text-slate-500 text-[10px] mt-2 text-center flex items-center justify-center gap-1">
                          <Lock className="w-3 h-3" /> Abbonamento non ancora attivo — procedi al pagamento per sbloccare
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Form dati cliente */}
            {selectedPlan && !requestSent && (
              <Card className="bg-[#0a2540] border-[#1a3a5c] mb-6">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-bold">Dati del tuo cliente</h3>
                    <button onClick={() => setSelectedPlan(null)} className="text-slate-400 text-xs hover:text-white">← Cambia piano</button>
                  </div>

                  <div className="bg-[#d4af37]/10 rounded-lg p-3 border border-[#d4af37]/20">
                    <p className="text-[#d4af37] text-sm font-semibold">
                      {selectedPlan === 'abbonamento' ? '📦 Abbonamento Mensile — € 100/mese + IVA' : '🎬 Singolo Filmato — € 200 + IVA'}
                    </p>
                    {selectedPlan === 'abbonamento' && (() => {
                      const usedCount = myRequests.filter(r => r.plan_type === 'abbonamento').length;
                      const nextNumber = usedCount + 1;
                      return (
                        <div className="mt-2 pt-2 border-t border-[#d4af37]/20">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-slate-400 text-xs">Questo sarà il video n°</span>
                            <span className="text-[#d4af37] text-sm font-bold">{nextNumber} / 12</span>
                          </div>
                          <div className="flex gap-1">
                            {Array.from({ length: 12 }).map((_, i) => (
                              <div
                                key={i}
                                className="flex-1 h-2.5 rounded-full"
                                style={{
                                  backgroundColor: i < usedCount ? '#d4af37' : i === usedCount ? '#d4af37' + '80' : '#1e293b',
                                  boxShadow: i <= usedCount ? '0 0 4px rgba(212,175,55,0.3)' : 'none',
                                  animation: i === usedCount ? 'pulse 2s infinite' : 'none'
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Avviso pagamento singolo */}
                  {selectedPlan === 'singolo' && (
                    <div className="bg-amber-500/10 rounded-xl p-3 border border-amber-500/30">
                      <div className="flex items-start gap-2 mb-2">
                        <Lock className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-amber-300 text-sm font-semibold">Pagamento richiesto</p>
                          <p className="text-slate-400 text-xs mt-1">
                            Compila i dati e invia la richiesta. Riceverai un link per il pagamento di <span className="text-white font-semibold">€ 200 + IVA</span>. La lavorazione del video partirà solo dopo il pagamento confermato.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Input
                    placeholder="Nome e Cognome del cliente *"
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                  <Input
                    placeholder="Telefono del cliente *"
                    type="tel"
                    value={formData.client_phone}
                    onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                  <Input
                    placeholder="Email del cliente (opzionale)"
                    type="email"
                    value={formData.client_email}
                    onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                  <Input
                    placeholder="Azienda del cliente (opzionale)"
                    value={formData.client_company}
                    onChange={(e) => setFormData({ ...formData, client_company: e.target.value })}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                  <Textarea
                    placeholder="Note aggiuntive (opzionale)"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="bg-slate-900 border-slate-700 text-white min-h-[80px]"
                  />

                  <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                    <p className="text-slate-400 text-xs">
                      🔒 I dati del tuo cliente non verranno divulgati. Saranno utilizzati esclusivamente per contattarlo e organizzare la video recensione.
                    </p>
                  </div>

                  <button
                    onClick={() => submitMutation.mutate()}
                    disabled={submitMutation.isPending || !formData.client_name.trim() || !formData.client_phone.trim()}
                    className="w-full h-11 cursor-pointer transition-all duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-slate-900 font-semibold text-sm"
                    style={{
                      background: 'linear-gradient(to bottom, #f7d774 0%, #e6b93d 35%, #c6921b 60%, #9e6f0f 100%)',
                      borderRadius: '16px',
                      boxShadow: 'inset 0 3px 4px rgba(255,255,255,0.6), inset 0 -6px 8px rgba(0,0,0,0.45), 0 10px 22px rgba(0,0,0,0.6)',
                      border: 'none'
                    }}
                  >
                    <Send className="w-4 h-4" />
                    {submitMutation.isPending ? 'Invio in corso...' : 'Invia Richiesta'}
                  </button>
                </CardContent>
              </Card>
            )}

            {/* Conferma invio */}
            {requestSent && (
              <Card className="bg-green-500/10 border-green-500/30 mb-6">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="w-7 h-7 text-green-400" />
                  </div>
                  <p className="text-green-400 font-bold text-lg">Richiesta inviata!</p>
                  <p className="text-slate-400 text-sm mt-2">Ci occuperemo di contattare il tuo cliente e organizzare la video recensione.</p>
                  <Button onClick={resetForm} className="mt-4 bg-[#d4af37] hover:bg-[#b8960c] text-slate-900">
                    Invia un'altra richiesta
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Le mie richieste */}
            {myRequests.length > 0 && (
              <div className="mt-6">
                <h3 className="text-white font-bold mb-3">Le mie richieste</h3>
                <div className="space-y-3">
                  {myRequests.map((req) => {
                    const st = statusLabel[req.status] || statusLabel.pending;
                    return (
                      <Card key={req.id} className="bg-[#0a2540] border-[#1a3a5c]">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-white text-sm font-medium">{req.client_name}</p>
                            <span className={`${st.color} text-white text-[10px] font-bold px-2 py-0.5 rounded`}>{st.text}</span>
                          </div>
                          <p className="text-slate-400 text-xs">
                            {req.plan_type === 'abbonamento' ? '📦 Abbonamento' : '🎬 Singolo'} — {new Date(req.created_date).toLocaleDateString('it-IT')}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav currentPage="VideoRecensioni" unreadMessages={messages.length} />

      {/* Popup Attiva Abbonamento */}
      {showAttivaPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setShowAttivaPopup(false)}>
          <div className="bg-[#0a2540] rounded-2xl border border-[#d4af37]/30 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-lg">Attiva Abbonamento</h3>
                <button onClick={() => setShowAttivaPopup(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-[#d4af37]/10 rounded-xl p-4 border border-[#d4af37]/20 mb-4">
                <p className="text-[#d4af37] font-bold text-base mb-1">📦 Abbonamento Mensile</p>
                <p className="text-[#d4af37] text-2xl font-bold">€ 100<span className="text-sm font-normal">/mese + IVA</span></p>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-slate-300 text-sm">12 video recensioni incluse all'anno</p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-slate-300 text-sm">1 video al mese, montaggio professionale</p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-slate-300 text-sm">Pubblicazione sulla piattaforma</p>
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 mb-4">
                <p className="text-slate-400 text-xs">
                  Stai attivando l'abbonamento per <span className="text-white font-semibold">{effectiveUser?.company_name || effectiveUser?.full_name}</span>. Dopo il pagamento, il tuo abbonamento verrà attivato automaticamente e potrai richiedere i tuoi 12 video.
                </p>
              </div>

              <a
                href="https://buy.stripe.com/test_PLACEHOLDER"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-12 rounded-xl text-slate-900 font-bold text-sm transition-all hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(to bottom, #f7d774 0%, #e6b93d 35%, #c6921b 60%, #9e6f0f 100%)',
                  boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.5), inset 0 -4px 6px rgba(0,0,0,0.35), 0 6px 14px rgba(0,0,0,0.5)'
                }}
              >
                <ExternalLink className="w-4 h-4" />
                Procedi al Pagamento
              </a>

              <p className="text-slate-500 text-[10px] mt-3 text-center">
                Dopo il pagamento il consorzio attiverà il tuo abbonamento entro 24 ore
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}