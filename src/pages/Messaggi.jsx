import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ArrowLeft, Send, User, X, Paperclip, Camera, FileText, Image as ImageIcon } from 'lucide-react';
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

export default function Messaggi() {
  const [user, setUser] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Controlla se c'è un contact nell'URL per aprire direttamente la chat
        const urlParams = new URLSearchParams(window.location.search);
        const contactEmail = urlParams.get('contact');
        if (contactEmail) {
          setSelectedConversation(contactEmail);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, []);

  const { data: allMessages = [], isLoading } = useQuery({
    queryKey: ['all-messages', user?.email],
    queryFn: async () => {
      const sent = await base44.entities.Message.filter({ from_email: user?.email });
      const received = await base44.entities.Message.filter({ to_email: user?.email });
      return [...sent, ...received].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    enabled: !!user?.email,
  });

  // Real-time subscription per messaggi - aggiorna solo se il messaggio riguarda l'utente corrente
  useEffect(() => {
    if (!user?.email) return;
    
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      const messageData = event.data;
      // Aggiorna solo se l'utente è mittente o destinatario del messaggio
      if (messageData?.to_email === user.email || messageData?.from_email === user.email) {
        queryClient.invalidateQueries({ queryKey: ['all-messages'] });
        queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
      }
    });

    return () => unsubscribe();
  }, [user?.email, queryClient]);

  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => base44.entities.User.list(),
  });

  // Group messages by conversation
  const conversations = React.useMemo(() => {
    const convMap = {};
    allMessages.forEach(msg => {
      const otherEmail = msg.from_email === user?.email ? msg.to_email : msg.from_email;
      if (!convMap[otherEmail]) {
        convMap[otherEmail] = [];
      }
      convMap[otherEmail].push(msg);
    });
    return convMap;
  }, [allMessages, user?.email]);

  const getOtherUser = (email) => {
    return users.find(u => u.email === email);
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
      const conversationId = [user.email, selectedConversation].sort().join('-');
      await base44.entities.Message.create({
        from_email: user.email,
        to_email: selectedConversation,
        content: newMessage,
        conversation_id: conversationId,
        attachments: attachments.length > 0 ? attachments : undefined
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
      setMessageToDelete(null);
      toast.success('Messaggio eliminato');
    },
    onError: (error) => {
      console.error('Errore eliminazione:', error);
      toast.error('Errore durante l\'eliminazione del messaggio');
    }
  });

  const canDeleteMessage = (msg) => {
    return msg.from_email === user?.email || user?.role === 'admin';
  };

  useEffect(() => {
    if (selectedConversation && conversations[selectedConversation]) {
      const unreadIds = conversations[selectedConversation]
        .filter(m => m.to_email === user?.email && !m.is_read)
        .map(m => m.id);
      if (unreadIds.length > 0) {
        markAsReadMutation.mutate(unreadIds);
      }
    }
  }, [selectedConversation, conversations, user?.email]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, selectedConversation]);

  const unreadMessages = allMessages.filter(m => m.to_email === user?.email && !m.is_read);

  if (selectedConversation) {
    const conversationMessages = conversations[selectedConversation] || [];
    const otherUser = getOtherUser(selectedConversation);

    return (
      <div className="h-screen bg-slate-900 flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="bg-slate-800 py-4 px-4 flex items-center gap-3 border-b border-slate-700 flex-shrink-0">
          <button onClick={() => setSelectedConversation(null)} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="w-10 h-10 bg-lime-400/20 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-lime-400" />
          </div>
          <div>
            <p className="text-white font-medium">{otherUser?.company_name || otherUser?.full_name || selectedConversation}</p>
            <p className="text-slate-400 text-sm">{selectedConversation}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {conversationMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.from_email === user?.email ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start gap-2 ${msg.from_email === user?.email ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      msg.from_email === user?.email
                        ? 'bg-lime-400 text-slate-900'
                        : 'bg-slate-700 text-white'
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
                                msg.from_email === user?.email ? 'bg-lime-500/30' : 'bg-slate-600'
                              }`}>
                                <FileText className="w-5 h-5" />
                                <span className="text-sm truncate">{att.name}</span>
                              </div>
                            )}
                          </a>
                        ))}
                      </div>
                    )}
                    {msg.content && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                    <p className={`text-xs mt-1 ${
                      msg.from_email === user?.email ? 'text-slate-700' : 'text-slate-400'
                    }`}>
                      {format(new Date(msg.created_date), 'HH:mm', { locale: it })}
                    </p>
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
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input - sempre fisso in basso */}
        <div className="bg-slate-800 p-4 border-t border-slate-700 flex-shrink-0">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Scrivi un messaggio..."
              className="bg-slate-900 border-slate-700 text-white h-14 text-base"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (newMessage.trim()) sendMessageMutation.mutate();
                }
              }}
            />
            <Button
              onClick={() => sendMessageMutation.mutate()}
              disabled={!newMessage.trim() || sendMessageMutation.isPending}
              className="bg-lime-400 hover:bg-lime-500 text-slate-900"
            >
              <Send className="w-5 h-5" />
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
              <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
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
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('Home')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-white text-xl font-bold">Messaggi</h1>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : Object.keys(conversations).length === 0 ? (
          <div className="text-center py-12">
            <User className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Nessuna conversazione</p>
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(conversations).map(([email, msgs]) => {
              const otherUser = getOtherUser(email);
              const lastMessage = msgs[msgs.length - 1];
              const unreadCount = msgs.filter(m => m.to_email === user?.email && !m.is_read).length;
              
              return (
                <Card
                  key={email}
                  className="bg-slate-800 border-slate-700 p-4 cursor-pointer hover:bg-slate-700 transition-colors"
                  onClick={() => setSelectedConversation(email)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-lime-400/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-lime-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-white font-medium truncate">
                          {otherUser?.company_name || otherUser?.full_name || email}
                        </p>
                        {unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-sm truncate">{lastMessage?.content}</p>
                      <p className="text-slate-500 text-xs">
                        {format(new Date(lastMessage?.created_date), 'd MMM, HH:mm', { locale: it })}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav currentPage="Messaggi" unreadMessages={unreadMessages.length} />
    </div>
  );
}