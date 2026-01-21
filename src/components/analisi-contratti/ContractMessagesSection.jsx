import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Send, Loader2, FileText, X, Paperclip, Camera, User, ChevronLeft } from 'lucide-react';

export default function ContractMessagesSection({ user, avvocati }) {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const queryClient = useQueryClient();

  // Raggruppa messaggi per conversazione (con lo stesso utente)
  const { data: allMessages = [], isLoading } = useQuery({
    queryKey: ['contract-messages-all', user?.email],
    queryFn: async () => {
      const received = await base44.entities.Message.filter({ 
        to_email: user?.email, 
        source: 'analisi_contratti' 
      }, '-created_date');
      const sent = await base44.entities.Message.filter({ 
        from_email: user?.email, 
        source: 'analisi_contratti' 
      }, '-created_date');
      return [...received, ...sent];
    },
    enabled: !!user?.email,
  });

  // Raggruppa per conversazione
  const conversations = React.useMemo(() => {
    const convMap = {};
    allMessages.forEach(msg => {
      const otherEmail = msg.from_email === user?.email ? msg.to_email : msg.from_email;
      if (!convMap[otherEmail]) {
        convMap[otherEmail] = {
          email: otherEmail,
          messages: [],
          unreadCount: 0,
          lastMessage: null
        };
      }
      convMap[otherEmail].messages.push(msg);
      if (msg.to_email === user?.email && !msg.is_read) {
        convMap[otherEmail].unreadCount++;
      }
      if (!convMap[otherEmail].lastMessage || new Date(msg.created_date) > new Date(convMap[otherEmail].lastMessage.created_date)) {
        convMap[otherEmail].lastMessage = msg;
      }
    });
    return Object.values(convMap).sort((a, b) => 
      new Date(b.lastMessage?.created_date) - new Date(a.lastMessage?.created_date)
    );
  }, [allMessages, user?.email]);

  // Trova nome avvocato dall'email
  const getAvvocatoName = (email) => {
    const avv = avvocati.find(a => a.email === email);
    return avv ? avv.name : email;
  };

  // Marca messaggi come letti quando apri la conversazione
  useEffect(() => {
    if (selectedConversation) {
      const unreadMessages = selectedConversation.messages.filter(
        m => m.to_email === user?.email && !m.is_read
      );
      unreadMessages.forEach(async (msg) => {
        await base44.entities.Message.update(msg.id, { is_read: true });
      });
      if (unreadMessages.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['contract-messages-all', user?.email] });
        queryClient.invalidateQueries({ queryKey: ['notifications', user?.email] });
      }
    }
  }, [selectedConversation, user?.email, queryClient]);

  const handleAttachmentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingAttachment(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAttachments(prev => [...prev, { name: file.name, url: file_url }]);
    } catch (err) {
      console.error('Errore upload:', err);
    } finally {
      setUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const sendReplyMutation = useMutation({
    mutationFn: async () => {
      const toEmail = selectedConversation.email;
      
      // Crea messaggio
      await base44.entities.Message.create({
        from_email: user.email,
        to_email: toEmail,
        content: replyMessage,
        source: 'analisi_contratti',
        source_reference: 'Risposta Analisi Contratti',
        attachments: attachments.map(a => ({ url: a.url, name: a.name, type: 'document' }))
      });

      // Crea notifica per il destinatario
      await base44.entities.Notification.create({
        user_email: toEmail,
        type: 'message',
        title: 'Nuovo messaggio - Analisi Contratti',
        content: `${user.company_name || user.full_name} ti ha inviato un messaggio`
      });

      // Invia email
      await base44.integrations.Core.SendEmail({
        to: toEmail,
        subject: `Nuovo messaggio - Analisi Contratti`,
        body: `Hai ricevuto un nuovo messaggio da ${user.company_name || user.full_name}.\n\n${replyMessage}\n\nAccedi all'app per rispondere.`
      });
    },
    onSuccess: () => {
      setReplyMessage('');
      setAttachments([]);
      queryClient.invalidateQueries({ queryKey: ['contract-messages-all', user?.email] });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-lime-400 animate-spin" />
      </div>
    );
  }

  // Vista conversazione singola
  if (selectedConversation) {
    const sortedMessages = [...selectedConversation.messages].sort(
      (a, b) => new Date(a.created_date) - new Date(b.created_date)
    );

    return (
      <div className="space-y-4">
        <Button
          onClick={() => setSelectedConversation(null)}
          variant="ghost"
          className="text-slate-400 hover:text-white pl-0"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Torna alle conversazioni
        </Button>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <h3 className="text-white font-semibold mb-1">
              {getAvvocatoName(selectedConversation.email)}
            </h3>
            <p className="text-slate-400 text-sm">{selectedConversation.email}</p>
          </CardContent>
        </Card>

        {/* Lista messaggi */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {sortedMessages.map((msg) => (
            <Card 
              key={msg.id} 
              className={`${msg.from_email === user?.email ? 'bg-lime-400/20 border-lime-400/30 ml-6' : 'bg-slate-800 border-slate-700 mr-6'}`}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-400 text-xs">
                    {msg.from_email === user?.email ? 'Tu' : getAvvocatoName(msg.from_email)}
                  </span>
                  <span className="text-slate-500 text-xs ml-auto">
                    {new Date(msg.created_date).toLocaleString('it-IT', { 
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                    })}
                  </span>
                </div>
                <p className="text-white text-sm whitespace-pre-wrap">{msg.content}</p>
                
                {msg.attachments?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {msg.attachments.map((att, idx) => (
                      <a 
                        key={idx} 
                        href={att.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-slate-700 rounded-lg px-2 py-1 flex items-center gap-1 text-xs text-lime-400 hover:bg-slate-600"
                      >
                        <FileText className="w-3 h-3" />
                        {att.name}
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Form risposta */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4 space-y-3">
            <Textarea
              placeholder="Scrivi la tua risposta..."
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white min-h-[80px]"
            />

            <div className="flex gap-2">
              <label className="cursor-pointer">
                <div className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-white py-1.5 px-2 rounded-lg text-xs">
                  <Paperclip className="w-3 h-3" />
                  Allega
                </div>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleAttachmentUpload}
                  className="hidden"
                  disabled={uploadingAttachment}
                />
              </label>
              <label className="cursor-pointer">
                <div className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-white py-1.5 px-2 rounded-lg text-xs">
                  <Camera className="w-3 h-3" />
                  Foto
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleAttachmentUpload}
                  className="hidden"
                  disabled={uploadingAttachment}
                />
              </label>
            </div>

            {uploadingAttachment && (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Caricamento...
              </div>
            )}

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((att, idx) => (
                  <div key={idx} className="bg-slate-700 rounded-lg px-2 py-1 flex items-center gap-1 text-xs">
                    <FileText className="w-3 h-3 text-lime-400" />
                    <span className="text-white truncate max-w-[100px]">{att.name}</span>
                    <button onClick={() => removeAttachment(idx)} className="text-red-400 hover:text-red-300">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={() => sendReplyMutation.mutate()}
              disabled={!replyMessage.trim() || sendReplyMutation.isPending}
              className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 font-semibold"
            >
              {sendReplyMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Invia Risposta
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Lista conversazioni
  return (
    <div className="space-y-3">
      {conversations.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6 text-center">
            <p className="text-slate-400">Nessun messaggio</p>
            <p className="text-slate-500 text-sm mt-1">Invia una richiesta a un avvocato per iniziare una conversazione</p>
          </CardContent>
        </Card>
      ) : (
        conversations.map((conv) => (
          <Card 
            key={conv.email} 
            className="bg-slate-800 border-slate-700 cursor-pointer hover:bg-slate-750 transition-colors"
            onClick={() => setSelectedConversation(conv)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-lime-400/20 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-lime-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-medium truncate">
                      {getAvvocatoName(conv.email)}
                    </h3>
                    {conv.unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm truncate">
                    {conv.lastMessage?.content?.substring(0, 50)}...
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    {new Date(conv.lastMessage?.created_date).toLocaleDateString('it-IT')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}