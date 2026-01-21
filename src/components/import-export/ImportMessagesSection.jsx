import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send, Loader2, FileText, Paperclip, Camera, X, Mail, Clock } from 'lucide-react';
import moment from 'moment';

export default function ImportMessagesSection({ user }) {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const queryClient = useQueryClient();

  // Messaggi ricevuti e inviati relativi a import_export
  const { data: allMessages = [], isLoading } = useQuery({
    queryKey: ['import-messages', user?.email],
    queryFn: async () => {
      const [received, sent] = await Promise.all([
        base44.entities.Message.filter({ to_email: user?.email, source: 'import_export' }),
        base44.entities.Message.filter({ from_email: user?.email, source: 'import_export' })
      ]);
      return [...received, ...sent].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    enabled: !!user?.email,
  });

  // Raggruppa messaggi per conversazione
  const conversations = React.useMemo(() => {
    const convMap = {};
    allMessages.forEach(msg => {
      const otherEmail = msg.from_email === user?.email ? msg.to_email : msg.from_email;
      if (!convMap[otherEmail]) {
        convMap[otherEmail] = {
          email: otherEmail,
          messages: [],
          lastMessage: null,
          unreadCount: 0
        };
      }
      convMap[otherEmail].messages.push(msg);
      if (!convMap[otherEmail].lastMessage || new Date(msg.created_date) > new Date(convMap[otherEmail].lastMessage.created_date)) {
        convMap[otherEmail].lastMessage = msg;
      }
      if (msg.to_email === user?.email && !msg.is_read) {
        convMap[otherEmail].unreadCount++;
      }
    });
    return Object.values(convMap).sort((a, b) => 
      new Date(b.lastMessage?.created_date) - new Date(a.lastMessage?.created_date)
    );
  }, [allMessages, user?.email]);

  // Marca messaggi come letti
  const markAsRead = async (conversation) => {
    const unreadMessages = conversation.messages.filter(
      m => m.to_email === user?.email && !m.is_read
    );
    for (const msg of unreadMessages) {
      await base44.entities.Message.update(msg.id, { is_read: true });
    }
    queryClient.invalidateQueries({ queryKey: ['import-messages'] });
    queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
  };

  const handleAttachmentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingAttachment(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setReplyAttachments(prev => [...prev, { name: file.name, url: file_url }]);
    } catch (err) {
      console.error('Errore upload:', err);
    } finally {
      setUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (index) => {
    setReplyAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const sendReplyMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Message.create({
        from_email: user.email,
        to_email: selectedConversation.email,
        content: replyMessage,
        source: 'import_export',
        source_reference: 'Import dalla Cina',
        attachments: replyAttachments.map(a => ({ url: a.url, name: a.name, type: 'document' }))
      });

      // Notifica al destinatario
      await base44.entities.Notification.create({
        user_email: selectedConversation.email,
        type: 'message',
        title: 'Nuovo messaggio Import/Export',
        content: `${user.company_name || user.full_name} ti ha inviato un messaggio`
      });

      // Email al destinatario
      await base44.integrations.Core.SendEmail({
        to: selectedConversation.email,
        subject: `Nuovo messaggio Import/Export da ${user.company_name || user.full_name}`,
        body: `Hai ricevuto un nuovo messaggio relativo all'import.\n\nDa: ${user.company_name || user.full_name}\n\n${replyMessage}\n\nAccedi all'app per rispondere.`
      });
    },
    onSuccess: () => {
      setReplyMessage('');
      setReplyAttachments([]);
      queryClient.invalidateQueries({ queryKey: ['import-messages'] });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-lime-400" />
      </div>
    );
  }

  // Vista singola conversazione
  if (selectedConversation) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedConversation(null)}
          className="flex items-center gap-2 text-lime-400 hover:text-lime-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Torna alle conversazioni
        </button>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-700">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-white font-medium">{selectedConversation.email}</p>
                <p className="text-slate-400 text-xs">Conversazione Import</p>
              </div>
            </div>

            {/* Messaggi */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto mb-4">
              {selectedConversation.messages.map((msg, idx) => {
                const isMe = msg.from_email === user?.email;
                return (
                  <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-xl p-3 ${
                      isMe 
                        ? 'bg-lime-400 text-slate-900' 
                        : 'bg-slate-700 text-white'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      {msg.attachments?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {msg.attachments.map((att, i) => (
                            <a
                              key={i}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-1 text-xs ${isMe ? 'text-slate-700' : 'text-lime-400'}`}
                            >
                              <FileText className="w-3 h-3" />
                              {att.name}
                            </a>
                          ))}
                        </div>
                      )}
                      <p className={`text-xs mt-1 ${isMe ? 'text-slate-700' : 'text-slate-400'}`}>
                        {moment(msg.created_date).format('DD/MM HH:mm')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Form risposta */}
            <div className="space-y-3 pt-3 border-t border-slate-700">
              <Textarea
                placeholder="Scrivi la tua risposta..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white min-h-[80px]"
              />
              
              <div className="flex gap-2">
                <label className="cursor-pointer">
                  <div className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg transition-colors text-sm">
                    <Paperclip className="w-4 h-4" />
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                    onChange={handleAttachmentUpload}
                    className="hidden"
                    disabled={uploadingAttachment}
                  />
                </label>
                <label className="cursor-pointer">
                  <div className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg transition-colors text-sm">
                    <Camera className="w-4 h-4" />
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

              {replyAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {replyAttachments.map((att, idx) => (
                    <div key={idx} className="bg-slate-700 rounded-lg px-2 py-1 flex items-center gap-2 text-xs">
                      <FileText className="w-3 h-3 text-lime-400" />
                      <span className="text-white truncate max-w-[100px]">{att.name}</span>
                      <button onClick={() => removeAttachment(idx)} className="text-red-400">
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
                    Invia
                  </>
                )}
              </Button>
            </div>
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
            <Mail className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Nessun messaggio</p>
            <p className="text-slate-500 text-sm mt-1">I messaggi relativi alle tue richieste di import appariranno qui</p>
          </CardContent>
        </Card>
      ) : (
        conversations.map((conv, idx) => (
          <Card
            key={idx}
            className="bg-slate-800 border-slate-700 cursor-pointer hover:bg-slate-750 transition-colors"
            onClick={() => {
              setSelectedConversation(conv);
              markAsRead(conv);
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center relative">
                    <Mail className="w-5 h-5 text-red-400" />
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">{conv.email}</p>
                    <p className="text-slate-400 text-sm truncate max-w-[200px]">
                      {conv.lastMessage?.content?.substring(0, 50)}...
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {moment(conv.lastMessage?.created_date).fromNow()}
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