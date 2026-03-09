import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ArrowLeft, Send, User, X, Paperclip, Camera, FileText, Image as ImageIcon, ShoppingBag, Video, Phone, Briefcase, MessageCircle, Filter, TrendingUp, Ship, FileCheck, Zap, Globe, Check, CheckCheck, ChevronRight, ChevronLeft, Star, Trash2, Shield, Flame, Leaf, Sun, Wifi, Euro, Heart, Handshake, Truck, Calendar, BookOpen, Gavel, Gift, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import GlobalTopIcons from '../components/layout/GlobalTopIcons';

export default function Messaggi() {
  const [user, setUser] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const [starredConversations, setStarredConversations] = useState(() => {
    const saved = localStorage.getItem('starredConversations');
    return saved ? JSON.parse(saved) : [];
  });
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const queryClient = useQueryClient();
  
  const { impersonation, appMode } = useImpersonation();
  
  // L'utente effettivo è quello impersonato se attivo, altrimenti l'utente loggato
  // Supporta sia impersonificazione utente (user-preview) che consulente
  const isImpersonating = impersonation?.active;
  const impersonatedUser = impersonation?.targetUserData || { 
    email: impersonation?.targetEmail, 
    full_name: impersonation?.targetName,
    logo_url: impersonation?.targetUserData?.logo_url
  };
  
  const effectiveUser = isImpersonating ? impersonatedUser : user;
  const effectiveEmail = isImpersonating ? impersonation?.targetEmail : user?.email;



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

  const [highlightedConversation, setHighlightedConversation] = useState(null);

  // Controlla se c'è un contact e/o source nell'URL per filtrare e evidenziare
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const contactEmail = urlParams.get('contact');
    const sourceParam = urlParams.get('source');
    if (sourceParam && sourceConfig[sourceParam]) {
      setActiveFilter(sourceParam);
      setFiltersCollapsed(true);
    }
    if (contactEmail) {
      const decodedEmail = decodeURIComponent(contactEmail);
      const source = sourceParam || 'consulenze';
      const convKey = `${decodedEmail}_${source}`;
      setHighlightedConversation(convKey);
    }
  }, []);

  const { data: allMessages = [], isLoading } = useQuery({
    queryKey: ['all-messages', effectiveEmail],
    queryFn: async () => {
      if (!effectiveEmail) return [];
      const sent = await base44.entities.Message.filter({ from_email: effectiveEmail });
      const received = await base44.entities.Message.filter({ to_email: effectiveEmail });
      return [...sent, ...received].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    enabled: !!effectiveEmail,
  });

  // Real-time subscription per messaggi - aggiorna solo se il messaggio riguarda l'utente corrente
  useEffect(() => {
    if (!effectiveEmail) return;
    
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      const messageData = event.data;
      // Aggiorna solo se l'utente è mittente o destinatario del messaggio
      if (messageData?.to_email === effectiveEmail || messageData?.from_email === effectiveEmail) {
        queryClient.invalidateQueries({ queryKey: ['all-messages'] });
        queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
      }
    });

    return () => unsubscribe();
  }, [effectiveEmail, queryClient]);

  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('listMembers');
        return response.data?.users || [];
      } catch (e) {
        console.error('Errore caricamento utenti:', e);
        return [];
      }
    },
    enabled: !!effectiveEmail,
  });

  // Configurazione sezioni messaggi - ALLINEATE con i nomi delle card in Home
  const sourceConfig = {
    diretto: { label: 'Diretto', icon: MessageCircle, color: 'bg-slate-500', key: 'diretto' },
    marketplace: { label: 'Market Place', icon: ShoppingBag, color: 'bg-purple-500', key: 'marketplace' },
    video: { label: 'Video interviste', icon: Video, color: 'bg-blue-500', key: 'video' },

    consulenze: { label: 'Consulenze', icon: Briefcase, color: 'bg-orange-500', key: 'consulenze' },
    import_export: { label: 'Import / Export', icon: Globe, color: 'bg-teal-500', key: 'import_export' },
    analisi_contratti: { label: 'Analisi Contratti', icon: FileCheck, color: 'bg-indigo-500', key: 'analisi_contratti' },
    calendario: { label: 'Calendario incontri', icon: Calendar, color: 'bg-pink-500', key: 'calendario' },
    cultura_aziendale: { label: 'Academy', icon: BookOpen, color: 'bg-amber-500', key: 'cultura_aziendale' },
    finanziamenti: { label: 'Finanziamenti agevolati', icon: TrendingUp, color: 'bg-emerald-500', key: 'finanziamenti' },
    imprenditori: { label: 'Consigli da Imprenditori', icon: Handshake, color: 'bg-cyan-500', key: 'imprenditori' },
    fornitori: { label: 'Ricerca Fornitori', icon: Truck, color: 'bg-rose-500', key: 'fornitori' },
    welfare: { label: 'Benefit Dipendenti', icon: Heart, color: 'bg-red-500', key: 'welfare' },
    compliance: { label: 'Evita Sanzioni', icon: Shield, color: 'bg-sky-500', key: 'compliance' },
    aste: { label: 'Aste Immobiliari', icon: Gavel, color: 'bg-violet-500', key: 'aste' },
    vantaggi: { label: 'Vantaggi Iscritti', icon: Gift, color: 'bg-amber-500', key: 'vantaggi' },
    // Risparmio Energetico - categorie separate
    risparmio_assicurazioni: { label: 'Risparmio Assicurazioni', icon: Shield, color: 'bg-green-600', key: 'risparmio_assicurazioni' },
    risparmio_luce: { label: 'Risparmio Luce', icon: Zap, color: 'bg-yellow-500', key: 'risparmio_luce' },
    risparmio_gas: { label: 'Risparmio Gas', icon: Flame, color: 'bg-orange-600', key: 'risparmio_gas' },
    risparmio_efficientamento: { label: 'Efficientamento', icon: Leaf, color: 'bg-green-500', key: 'risparmio_efficientamento' },
    risparmio_fotovoltaico: { label: 'Fotovoltaico', icon: Sun, color: 'bg-yellow-600', key: 'risparmio_fotovoltaico' },
    risparmio_telefonia: { label: 'Risparmio Telefonia', icon: Phone, color: 'bg-green-700', key: 'risparmio_telefonia' },
    risparmio_internet: { label: 'Risparmio Internet', icon: Wifi, color: 'bg-green-600', key: 'risparmio_internet' },
    fiscalita_energetica: { label: 'Fiscalità Energetica', icon: Euro, color: 'bg-green-800', key: 'fiscalita_energetica' }
  };

  // Group messages by conversation (con chiave che include source per separare conversazioni)
  const conversations = React.useMemo(() => {
    const convMap = {};
    allMessages.forEach(msg => {
      const otherEmail = msg.from_email === effectiveEmail ? msg.to_email : msg.from_email;
      const source = msg.source || 'diretto';
      const key = `${otherEmail}_${source}`;
      if (!convMap[key]) {
        convMap[key] = {
          email: otherEmail,
          source: source,
          messages: []
        };
      }
      convMap[key].messages.push(msg);
    });
    return convMap;
  }, [allMessages, effectiveEmail]);

  // Filtra conversazioni in base al filtro attivo
  const filteredConversations = React.useMemo(() => {
    if (activeFilter === 'all') return conversations;
    return Object.fromEntries(
      Object.entries(conversations).filter(([_, conv]) => conv.source === activeFilter)
    );
  }, [conversations, activeFilter]);

  // Conta messaggi non letti per ogni sezione
  const unreadBySource = React.useMemo(() => {
    const counts = { all: 0 };
    Object.values(sourceConfig).forEach(s => { counts[s.key] = 0; });
    
    allMessages.forEach(msg => {
      if (msg.to_email === effectiveEmail && !msg.is_read) {
        counts.all++;
        const source = msg.source || 'diretto';
        if (counts[source] !== undefined) {
          counts[source]++;
        }
      }
    });
    return counts;
  }, [allMessages, effectiveEmail]);

  const getOtherUser = (email) => {
    return users.find(u => u.email === email);
  };

  // Funzione per ottenere l'etichetta della sezione
  const getSourceLabel = (msg) => {
    // Prova prima con il campo source
    if (msg.source && sourceConfig[msg.source]) {
      return sourceConfig[msg.source];
    }
    
    // Fallback: controlla il contenuto del messaggio per compatibilità
    if (msg.content?.includes('annuncio "')) {
      return sourceConfig.marketplace;
    }
    
    return sourceConfig.diretto;
  };

  // Ottieni la source più recente per una conversazione
  const getConversationSource = (msgs) => {
    // Prendi l'ultimo messaggio con source definita
    const lastWithSource = [...msgs].reverse().find(m => m.source);
    if (lastWithSource) {
      return getSourceLabel(lastWithSource);
    }
    // Fallback al primo messaggio
    return getSourceLabel(msgs[0] || {});
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploading(true);
    try {
      const uploadedFiles = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedFiles.push({
          url: file_url,
          name: file.name,
          type: file.type
        });
      }
      setAttachments(prev => [...prev, ...uploadedFiles]);
      toast.success('File caricato');
    } catch (error) {
      toast.error('Errore durante il caricamento');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleCameraCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAttachments(prev => [...prev, {
        url: file_url,
        name: `Foto_${format(new Date(), 'dd-MM-yyyy_HH-mm')}`,
        type: file.type
      }]);
      toast.success('Foto caricata');
    } catch (error) {
      toast.error('Errore durante il caricamento');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      const conv = conversations[selectedConversation];
      const toEmail = conv?.email || selectedConversation;
      const source = conv?.source || 'diretto';
      const conversationId = [effectiveEmail, toEmail].sort().join('-') + '_' + source;
      
      // Crea il messaggio
      const message = await base44.entities.Message.create({
        from_email: effectiveEmail,
        to_email: toEmail,
        content: newMessage,
        conversation_id: conversationId,
        source: source,
        attachments: attachments.length > 0 ? attachments : undefined
      });
      
      // Crea notifica per il destinatario
      const sourceInfo = sourceConfig[source] || sourceConfig.diretto;
      const senderName = effectiveUser?.company_name || effectiveUser?.full_name || effectiveEmail;
      await base44.entities.Notification.create({
        user_email: toEmail,
        type: 'message',
        title: `Nuovo messaggio - ${sourceInfo.label}`,
        content: `${senderName}: ${newMessage.substring(0, 100)}${newMessage.length > 100 ? '...' : ''}`,
        reference_id: message.id,
        is_read: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-messages'] });
      setNewMessage('');
      setAttachments([]);
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageIds) => {
      for (const id of messageIds) {
        await base44.entities.Message.update(id, { is_read: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
    }
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      await base44.functions.invoke('deleteMessage', { messageId });
      // Elimina anche le notifiche correlate a questo messaggio
      try {
        const relatedNotifications = await base44.entities.Notification.filter({ reference_id: messageId });
        for (const notif of relatedNotifications) {
          await base44.entities.Notification.delete(notif.id);
        }
      } catch (e) {
        console.log('Errore eliminazione notifiche:', e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
      queryClient.invalidateQueries({ queryKey: ['header-notifications'] });
      setMessageToDelete(null);
      toast.success('Messaggio eliminato');
    },
    onError: (error) => {
      console.error('Errore eliminazione:', error);
      toast.error('Errore durante l\'eliminazione del messaggio');
    }
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationKey) => {
      const conv = conversations[conversationKey];
      if (!conv) return;
      // Elimina tutti i messaggi della conversazione
      for (const msg of conv.messages) {
        try {
          await base44.entities.Message.delete(msg.id);
          // Elimina anche le notifiche correlate a questo messaggio
          const relatedNotifications = await base44.entities.Notification.filter({ reference_id: msg.id });
          for (const notif of relatedNotifications) {
            await base44.entities.Notification.delete(notif.id);
          }
        } catch (e) {
          console.log('Errore eliminazione messaggio:', e);
        }
      }
      // Elimina anche eventuali notifiche di tipo message per questa conversazione
      try {
        const userNotifications = await base44.entities.Notification.filter({ 
          user_email: effectiveEmail,
          type: 'message'
        });
        for (const notif of userNotifications) {
          // Se la notifica è correlata a questa conversazione (stesso source)
          if (notif.content?.includes(conv.email) || conv.messages.some(m => m.id === notif.reference_id)) {
            await base44.entities.Notification.delete(notif.id);
          }
        }
      } catch (e) {
        console.log('Errore eliminazione notifiche:', e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
      queryClient.invalidateQueries({ queryKey: ['header-notifications'] });
      setConversationToDelete(null);
      toast.success('Conversazione eliminata');
    },
    onError: (error) => {
      console.error('Errore eliminazione conversazione:', error);
      toast.error('Errore durante l\'eliminazione');
    }
  });

  const toggleStarConversation = (conversationKey, e) => {
    e.stopPropagation();
    setStarredConversations(prev => {
      const newStarred = prev.includes(conversationKey)
        ? prev.filter(k => k !== conversationKey)
        : [...prev, conversationKey];
      localStorage.setItem('starredConversations', JSON.stringify(newStarred));
      return newStarred;
    });
  };

  const handleDeleteConversation = (conversationKey, e) => {
    e.stopPropagation();
    setConversationToDelete(conversationKey);
  };

  const canDeleteMessage = (msg) => {
    return msg.from_email === effectiveEmail || user?.role === 'admin';
  };

  useEffect(() => {
    if (selectedConversation && conversations[selectedConversation]) {
      const unreadIds = conversations[selectedConversation].messages
        .filter(m => m.to_email === effectiveEmail && !m.is_read)
        .map(m => m.id);
      if (unreadIds.length > 0) {
        markAsReadMutation.mutate(unreadIds);
      }
    }
  }, [selectedConversation, conversations, effectiveEmail]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, selectedConversation]);

  const totalUnreadCount = allMessages.filter(m => m.to_email === effectiveEmail && !m.is_read).length;

  if (selectedConversation) {
    const conv = conversations[selectedConversation];
    const conversationMessages = conv?.messages || [];
    const otherEmail = conv?.email || selectedConversation;
    const otherUser = getOtherUser(otherEmail);

    return (
      <div className="h-screen bg-slate-900 flex flex-col overflow-hidden pt-14">
        {/* Chat Header */}
        <div className="bg-slate-800 py-4 px-4 flex items-center gap-3 border-b border-slate-700 flex-shrink-0">
          <button onClick={() => setSelectedConversation(null)} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </button>
          {otherUser?.logo_url ? (
            <img 
              src={otherUser.logo_url} 
              alt={otherUser.company_name} 
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-lime-400/20 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-lime-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate">{otherUser?.company_name || otherUser?.full_name || selectedConversation}</p>
            {otherUser?.specializzazione && (
              <p className="text-lime-400 text-xs truncate">💼 {otherUser.specializzazione}</p>
            )}
            <div className="text-slate-400 text-xs space-y-0.5">
              {(otherUser?.city || otherUser?.region) && (
                <p className="truncate">
                  📍 {[otherUser.city, otherUser.province, otherUser.region].filter(Boolean).join(', ')}
                </p>
              )}
              {(otherUser?.referente || otherUser?.full_name) && (
                <p className="truncate">👤 {otherUser.referente || otherUser.full_name}</p>
              )}
              {!otherUser?.city && !otherUser?.region && !otherUser?.referente && !otherUser?.full_name && (
                <p className="truncate">{selectedConversation}</p>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {conversationMessages.map((msg) => {
                  const isMyMessage = msg.from_email === effectiveEmail;
                  const senderUser = isMyMessage ? effectiveUser : otherUser;

                  return (
                  <div
                    key={msg.id}
                    className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-end gap-2 ${isMyMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar */}
                      {isMyMessage && (
                        effectiveUser?.logo_url ? (
                          <img src={effectiveUser.logo_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-lime-400/30 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-lime-400" />
                          </div>
                        )
                      )}
                      {!isMyMessage && (
                        otherUser?.logo_url ? (
                          <img src={otherUser.logo_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-slate-400" />
                          </div>
                        )
                      )}
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                          isMyMessage
                            ? 'bg-[#d4af37] text-slate-900'
                            : 'bg-[#a0a0a0] text-slate-900'
                        }`}
                      >
                    {/* Allegati */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="space-y-2 mb-2">
                        {msg.attachments.map((att, idx) => (
                          <a
                            key={idx}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            {att.type?.startsWith('image/') ? (
                              <img 
                                src={att.url} 
                                alt={att.name} 
                                className="max-w-full rounded-lg max-h-48 object-cover"
                              />
                            ) : (
                              <div className={`flex items-center gap-2 p-2 rounded-lg ${
                                      isMyMessage ? 'bg-[#b8960b]/30' : 'bg-slate-500/50'
                                    }`}>
                                <FileText className="w-5 h-5" />
                                <span className="text-sm truncate">{att.name}</span>
                              </div>
                            )}
                          </a>
                        ))}
                      </div>
                    )}
                    {msg.content && <p className="text-sm whitespace-pre-wrap">{msg.content.charAt(0).toUpperCase() + msg.content.slice(1).toLowerCase()}</p>}
                    <div className={`flex items-center justify-end gap-1 mt-1 ${
                      isMyMessage ? 'text-slate-700' : 'text-slate-600'
                    }`}>
                      <span className="text-xs">
                        {format(new Date(msg.created_date), 'HH:mm', { locale: it })}
                        {new Date(msg.created_date).toDateString() !== new Date().toDateString() && (
                          <span className="ml-1">
                            · {format(new Date(msg.created_date), 'd MMM', { locale: it })}
                          </span>
                        )}
                      </span>
                      {/* Spunte stile WhatsApp - solo per i miei messaggi */}
                      {isMyMessage && (
                        msg.is_read ? (
                          <CheckCheck className="w-5 h-5 text-fuchsia-500 font-bold" strokeWidth={3} />
                        ) : (
                          <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                        )
                      )}
                    </div>
                    </div>
                    {canDeleteMessage(msg) && (
                    <button
                      onClick={() => setMessageToDelete(msg)}
                      className="text-slate-500 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    )}
                    </div>
                    </div>
                    );
                    })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input - sempre fisso in basso */}
        <div className="bg-slate-800 border-t border-slate-700 flex-shrink-0">
          {/* Anteprima allegati */}
          {attachments.length > 0 && (
            <div className="px-4 pt-3 flex gap-2 flex-wrap">
              {attachments.map((att, idx) => (
                <div key={idx} className="relative">
                  {att.type?.startsWith('image/') ? (
                    <img src={att.url} alt={att.name} className="w-16 h-16 object-cover rounded-lg" />
                  ) : (
                    <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-lime-400" />
                    </div>
                  )}
                  <button
                    onClick={() => removeAttachment(idx)}
                    className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="p-4 flex gap-2 items-center">
            {/* Input nascosti */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              multiple
            />
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleCameraCapture}
              accept="image/*"
              capture="environment"
              className="hidden"
            />
            
            {/* Pulsante allega */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-slate-400 hover:text-lime-400 transition-colors p-2"
            >
              <Paperclip className="w-6 h-6" />
            </button>
            
            {/* Pulsante fotocamera */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
              className="text-slate-400 hover:text-lime-400 transition-colors p-2"
            >
              <Camera className="w-6 h-6" />
            </button>
            
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Scrivi un messaggio..."
              className="bg-slate-900 border-slate-700 text-white h-14 text-base flex-1"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (newMessage.trim() || attachments.length > 0) sendMessageMutation.mutate();
                }
              }}
            />
            <Button
              onClick={() => sendMessageMutation.mutate()}
              disabled={(!newMessage.trim() && attachments.length === 0) || sendMessageMutation.isPending || uploading}
              className="bg-lime-400 hover:bg-lime-500 text-slate-900 h-14 w-14"
            >
              {uploading ? (
                <div className="animate-spin w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!messageToDelete} onOpenChange={() => setMessageToDelete(null)}>
          <AlertDialogContent className="bg-slate-800 border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Vuoi eliminare questo messaggio?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                Questa azione è permanente e non può essere annullata.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600 hover:text-white">
                Annulla
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMessageMutation.mutate(messageToDelete.id)}
                disabled={deleteMessageMutation.isPending}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {deleteMessageMutation.isPending ? 'Eliminazione...' : 'Conferma'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-64">
      <main className="px-2 flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
        {/* Header fisso con sezione attiva - SEMPRE VISIBILE */}
        <div className="flex items-center gap-2 px-2 py-3 bg-slate-900 flex-shrink-0">
          <h1 className="text-white text-xl font-bold">Messaggi</h1>
          {activeFilter !== 'all' && (
            <>
              <span className="text-slate-500">›</span>
              <span 
                className={`text-sm font-semibold px-2 py-0.5 rounded-full ${sourceConfig[activeFilter]?.color || 'bg-lime-400'} text-white`}
              >
                {sourceConfig[activeFilter]?.label || 'Tutti'}
              </span>
            </>
          )}
        </div>

        {/* Layout a 2 colonne con animazione */}
        <div className="flex gap-0 relative flex-1 min-h-0">
          
          {/* Colonna sinistra - Filtri con animazione slide */}
          <div className="flex flex-shrink-0 relative">
            <div 
              className={`bg-slate-800/50 rounded-xl p-2 transition-all duration-300 ease-in-out ${filtersCollapsed ? 'overflow-hidden cursor-pointer' : 'overflow-y-auto overflow-x-hidden'}`}
              style={{ 
                width: filtersCollapsed ? '56px' : '190px'
              }}
              onClick={() => filtersCollapsed && setFiltersCollapsed(false)}
            >
              {/* Contenuto filtri - allineato a destra così quando chiuso si vede la parte finale */}
              <div 
                className="flex flex-col gap-1.5"
                style={{ 
                  width: '174px',
                  marginLeft: filtersCollapsed ? '-126px' : '0px',
                  transition: 'margin-left 0.3s ease-in-out'
                }}
              >
              {/* Filtro Tutti */}
              <button
                onClick={(e) => {
                  if (!filtersCollapsed) {
                    e.stopPropagation();
                    setActiveFilter('all');
                    setFiltersCollapsed(true);
                  }
                }}
                className={`flex items-center px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeFilter === 'all' 
                    ? 'bg-lime-400 text-slate-900' 
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                <Filter className="w-4 h-4 flex-shrink-0 mr-2" />
                <span className="flex-1 text-left truncate">Tutti</span>
                <span className={`ml-1 w-6 h-5 flex items-center justify-center rounded-full text-[10px] flex-shrink-0 ${
                  activeFilter === 'all' ? 'bg-slate-900 text-lime-400' : unreadBySource.all > 0 ? 'bg-red-500 text-white' : 'bg-slate-600 text-slate-400'
                }`}>
                  {unreadBySource.all || 0}
                </span>
              </button>
              
              {/* Altri filtri */}
              {Object.values(sourceConfig).map((source) => {
                const SourceIcon = source.icon;
                const count = unreadBySource[source.key] || 0;
                return (
                  <button
                    key={source.key}
                    onClick={(e) => {
                      if (!filtersCollapsed) {
                        e.stopPropagation();
                        setActiveFilter(source.key);
                        setFiltersCollapsed(true);
                      }
                    }}
                    className={`flex items-center px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                      activeFilter === source.key 
                        ? `${source.color} text-white` 
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    <SourceIcon className="w-4 h-4 flex-shrink-0 mr-2" />
                    <span className="flex-1 text-left truncate">{source.label}</span>
                    <span className={`ml-1 w-6 h-5 flex items-center justify-center rounded-full text-[10px] flex-shrink-0 ${
                      activeFilter === source.key ? 'bg-white/20 text-white' : count > 0 ? 'bg-red-500 text-white' : 'bg-slate-600 text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
              </div>
            </div>

            {/* Freccia toggle - posizionata all'altezza del filtro attivo */}
            <button
              onClick={() => setFiltersCollapsed(!filtersCollapsed)}
              className="flex-shrink-0 w-7 flex items-start self-stretch"
              style={{
                paddingTop: `${(() => {
                  // Ogni pulsante: py-2.5 (10px top+bottom) + text ~16px + gap 6px ≈ 36px totali
                  // padding container 8px top
                  const btnHeight = 36;
                  if (activeFilter === 'all') return 8 + 8;
                  const keys = Object.keys(sourceConfig);
                  const idx = keys.indexOf(activeFilter);
                  if (idx === -1) return 8 + 8;
                  return 8 + (idx + 1) * btnHeight + 8;
                })()}px`
              }}
            >
              {filtersCollapsed ? (
                <ChevronRight className="w-6 h-6 text-lime-400" />
              ) : (
                <ChevronLeft className="w-6 h-6 text-lime-400" />
              )}
            </button>
          </div>

          {/* Colonna destra - Lista messaggi */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full"></div>
              </div>
            ) : Object.keys(filteredConversations).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <User className="w-12 h-12 text-slate-600 mb-3" />
                <p className="text-slate-400 text-sm">
                  {activeFilter === 'all' ? 'Nessuna conversazione' : 'Nessun messaggio'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 pr-1">
                {Object.entries(filteredConversations)
                  .sort((a, b) => {
                    const aStarred = starredConversations.includes(a[0]);
                    const bStarred = starredConversations.includes(b[0]);
                    if (aStarred && !bStarred) return -1;
                    if (!aStarred && bStarred) return 1;
                    const lastA = a[1].messages[a[1].messages.length - 1];
                    const lastB = b[1].messages[b[1].messages.length - 1];
                    return new Date(lastB?.created_date) - new Date(lastA?.created_date);
                  })
                  .map(([key, conv]) => {
                  const isStarred = starredConversations.includes(key);
                  const otherUser = getOtherUser(conv.email);
                  const msgs = conv.messages;
                  const lastMessage = msgs[msgs.length - 1];
                  const unreadCount = msgs.filter(m => m.to_email === effectiveEmail && !m.is_read).length;
                  const sourceInfo = sourceConfig[conv.source] || sourceConfig.diretto;
                  const SourceIcon = sourceInfo.icon;
                  
                  return (
                    <Card
                      key={key}
                      className={`bg-slate-800 border-slate-700 p-3 cursor-pointer hover:bg-slate-700 transition-colors relative ${isStarred ? 'border-l-4 border-l-yellow-500' : ''} ${highlightedConversation === key ? 'ring-2 ring-orange-400 bg-slate-700' : ''}`}
                      onClick={() => setSelectedConversation(key)}
                    >
                      {/* Stellina preferiti */}
                      <button
                        onClick={(e) => toggleStarConversation(key, e)}
                        className="absolute top-1.5 right-1.5 p-1 hover:bg-slate-600 rounded-full transition-colors"
                      >
                        <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-yellow-500 text-yellow-500' : 'text-slate-500'}`} />
                      </button>

                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-lime-400/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-lime-400" />
                        </div>
                        <div className="flex-1 min-w-0 pr-6">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`${sourceInfo.color} text-white text-[8px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5`}>
                              <SourceIcon className="w-2.5 h-2.5" />
                              {sourceInfo.label}
                            </span>
                            {unreadCount > 0 && (
                              <span className="bg-red-500 text-white text-[9px] rounded-full px-1.5 py-0.5">
                                {unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-white font-medium text-sm truncate">
                            {otherUser?.company_name || otherUser?.full_name || conv.email}
                          </p>
                          <p className="text-slate-400 text-xs truncate">{lastMessage?.content ? lastMessage.content.charAt(0).toUpperCase() + lastMessage.content.slice(1).toLowerCase() : ''}</p>
                          <p className="text-slate-500 text-[10px]">
                            {format(new Date(lastMessage?.created_date), 'd MMM, HH:mm', { locale: it })}
                          </p>
                        </div>
                        
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => handleDeleteConversation(key, e)}
                            className="p-1.5 hover:bg-red-500/20 rounded-full transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-lime-400" />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>


      <BottomNav currentPage="Messaggi" unreadMessages={totalUnreadCount} />

      {/* Delete Conversation Confirmation Dialog */}
      <AlertDialog open={!!conversationToDelete} onOpenChange={() => setConversationToDelete(null)}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Eliminare questa conversazione?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tutti i messaggi di questa conversazione verranno eliminati permanentemente. Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600 hover:text-white">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConversationMutation.mutate(conversationToDelete)}
              disabled={deleteConversationMutation.isPending}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {deleteConversationMutation.isPending ? 'Eliminazione...' : 'Elimina'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}