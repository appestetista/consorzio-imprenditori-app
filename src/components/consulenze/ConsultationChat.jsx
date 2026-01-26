import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ConsultationChat({ bookingId, currentUserEmail, otherUserEmail, otherUserName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  // Crea un conversation_id unico per questa prenotazione
  const conversationId = `consultation_${bookingId}`;

  const { data: messages = [] } = useQuery({
    queryKey: ['consultation-messages', conversationId],
    queryFn: async () => {
      const allMessages = await base44.entities.Message.filter({ 
        conversation_id: conversationId 
      });
      return allMessages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    enabled: isOpen,
    refetchInterval: isOpen ? 5000 : false, // Refresh ogni 5 sec quando aperto
  });

  // Conta messaggi non letti
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['consultation-unread', conversationId, currentUserEmail],
    queryFn: async () => {
      const unread = await base44.entities.Message.filter({ 
        conversation_id: conversationId,
        to_email: currentUserEmail,
        is_read: false
      });
      return unread.length;
    },
    refetchInterval: 10000,
  });

  // Subscribe real-time ai messaggi
  useEffect(() => {
    const unsub = base44.entities.Message.subscribe((event) => {
      if (event.data?.conversation_id === conversationId) {
        queryClient.invalidateQueries({ queryKey: ['consultation-messages', conversationId] });
        queryClient.invalidateQueries({ queryKey: ['consultation-unread', conversationId, currentUserEmail] });
      }
    });
    return unsub;
  }, [conversationId, currentUserEmail, queryClient]);

  // Scroll automatico ai nuovi messaggi
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Marca come letti quando si apre la chat
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      const markAsRead = async () => {
        const unreadMessages = await base44.entities.Message.filter({ 
          conversation_id: conversationId,
          to_email: currentUserEmail,
          is_read: false
        });
        for (const msg of unreadMessages) {
          await base44.entities.Message.update(msg.id, { is_read: true });
        }
        queryClient.invalidateQueries({ queryKey: ['consultation-unread', conversationId, currentUserEmail] });
      };
      markAsRead();
    }
  }, [isOpen, unreadCount, conversationId, currentUserEmail, queryClient]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      await base44.entities.Message.create({
        from_email: currentUserEmail,
        to_email: otherUserEmail,
        content: content,
        conversation_id: conversationId,
        source: 'consulenze',
        source_reference: `Consulenza #${bookingId.slice(-6)}`,
        is_read: false
      });
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['consultation-messages', conversationId] });
    }
  });

  const handleSend = () => {
    if (message.trim()) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  return (
    <div className="mt-3 border-t border-slate-600 pt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-lime-400" />
          <span className="text-slate-300 text-sm">Chat con {otherUserName}</span>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="mt-3">
          {/* Area messaggi */}
          <div className="bg-slate-900 rounded-lg p-3 max-h-48 overflow-y-auto mb-2">
            {messages.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">
                Nessun messaggio. Inizia la conversazione!
              </p>
            ) : (
              <div className="space-y-2">
                {messages.map((msg) => {
                  const isMe = msg.from_email === currentUserEmail;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 ${
                          isMe
                            ? 'bg-lime-400 text-slate-900'
                            : 'bg-slate-700 text-white'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${isMe ? 'text-slate-700' : 'text-slate-400'}`}>
                          {new Date(msg.created_date).toLocaleTimeString('it-IT', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input messaggio */}
          <div className="flex gap-2">
            <Input
              placeholder="Scrivi un messaggio..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              className="bg-slate-900 border-slate-700 text-white flex-1"
            />
            <Button
              size="icon"
              className="bg-lime-400 hover:bg-lime-500 text-slate-900"
              onClick={handleSend}
              disabled={!message.trim() || sendMessageMutation.isPending}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}