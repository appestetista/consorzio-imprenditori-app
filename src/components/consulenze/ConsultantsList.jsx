import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import useNotificationSound from '../hooks/useNotificationSound';
import { Search, MessageCircle, User, Briefcase, Users, Send, ArrowLeft, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ConsultantsList({ currentUserEmail, showChat = false, userZona = null }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConsultant, setSelectedConsultant] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { playSound } = useNotificationSound();

  const { data: consultants = [], isLoading } = useQuery({
    queryKey: ['consultants-list'],
    queryFn: () => base44.entities.Consultant.list()
  });

  // Filtra consulenti che servono la zona dell'utente
  const filteredByZone = useMemo(() => {
    if (!userZona) return consultants;
    const userZonaLower = userZona.toLowerCase();
    return consultants.filter(c => {
      const consultantZones = c.zone_assegnate?.map(z => z.toLowerCase()) || [];
      const hasZona = c.zona?.toLowerCase();
      return consultantZones.includes(userZonaLower) || hasZona === userZonaLower;
    });
  }, [consultants, userZona]);

  // Carica messaggi non letti per mostrare notifiche (solo dalla sezione consulenze)
  const { data: unreadMessages = [] } = useQuery({
    queryKey: ['unread-messages-consultants', currentUserEmail],
    queryFn: async () => {
      const messages = await base44.entities.Message.filter({ 
        to_email: currentUserEmail, 
        source: 'consulenze',
        is_read: false 
      });
      return messages;
    },
    enabled: !!currentUserEmail
  });

  // Conta messaggi non letti per ogni mittente
  const unreadCountByEmail = useMemo(() => {
    const counts = {};
    unreadMessages.forEach(msg => {
      counts[msg.from_email] = (counts[msg.from_email] || 0) + 1;
    });
    return counts;
  }, [unreadMessages]);

  // Subscribe real-time ai messaggi - suono per nuovi messaggi (solo dalla sezione consulenze)
  useEffect(() => {
    if (!currentUserEmail) return;

    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create' && 
          event.data?.to_email === currentUserEmail && 
          event.data?.source === 'consulenze') {
        playSound();
        queryClient.invalidateQueries({ queryKey: ['unread-messages-consultants', currentUserEmail] });
      }
    });

    return () => unsubscribe();
  }, [currentUserEmail, queryClient, playSound]);

  // Filtra consulenti in base alla ricerca
  const filteredConsultants = useMemo(() => {
    if (!searchTerm) return filteredByZone;
    const search = searchTerm.toLowerCase();
    return filteredByZone.filter(c => 
      c.name?.toLowerCase().includes(search) ||
      c.referente?.toLowerCase().includes(search) ||
      c.category?.toLowerCase().includes(search)
    );
  }, [filteredByZone, searchTerm]);

  // Totale messaggi non letti
  const totalUnread = useMemo(() => {
    return Object.values(unreadCountByEmail).reduce((sum, count) => sum + count, 0);
  }, [unreadCountByEmail]);

  const handleChat = (consultant) => {
    if (showChat) {
      setSelectedConsultant(consultant);
    } else {
      navigate(createPageUrl('Messaggi') + `?contact=${encodeURIComponent(consultant.email)}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-lime-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Se è selezionato un consulente e showChat è true, mostra la chat
  if (showChat && selectedConsultant) {
    return (
      <FullChat 
        consultant={selectedConsultant}
        currentUserEmail={currentUserEmail}
        onBack={() => setSelectedConsultant(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con titolo e badge totale */}
      {showChat && (
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            Consulenti
          </h3>
          {totalUnread > 0 && (
            <Badge className="bg-red-500 text-white">
              {totalUnread} messaggi
            </Badge>
          )}
        </div>
      )}

      {/* Ricerca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Cerca consulente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-slate-800 border-slate-700 text-white pl-10"
        />
      </div>

      {/* Lista Consulenti */}
      <div className="space-y-3">
        {filteredConsultants.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">Nessun consulente trovato</p>
        ) : (
          filteredConsultants.map(consultant => (
            <ConsultantCard 
              key={consultant.id} 
              consultant={consultant} 
              onChat={() => handleChat(consultant)}
              currentUserEmail={currentUserEmail}
              unreadCount={unreadCountByEmail[consultant.email] || 0}
              showChat={showChat}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ConsultantCard({ consultant, onChat, currentUserEmail, unreadCount, showChat }) {
  const isCurrentUser = consultant.email === currentUserEmail;
  
  return (
    <Card className="bg-slate-800 border-slate-700 p-4">
      <div className="flex items-center gap-3">
        {consultant.logo_url ? (
          <img 
            src={consultant.logo_url} 
            alt={`Logo ${consultant.name}`}
            className="w-14 h-14 object-contain rounded-lg bg-slate-900 border border-slate-700 flex-shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-amber-400/20 flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-7 h-7 text-amber-400" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-white font-semibold truncate">
            {consultant.name || 'Consulente'}
          </p>
          {consultant.referente && (
            <p className="text-slate-400 text-sm truncate flex items-center gap-1">
              <User className="w-3 h-3" />
              {consultant.referente}
            </p>
          )}
          <Badge className="bg-amber-400/20 text-amber-400 text-xs mt-1">
            {consultant.category || 'Consulente'}
          </Badge>
        </div>
        {!isCurrentUser && consultant.email && (
          <div className="relative flex-shrink-0">
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center z-10">
                {unreadCount}
              </span>
            )}
            <Button
              onClick={onChat}
              size="sm"
              className="bg-lime-400 hover:bg-lime-500 text-slate-900"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function FullChat({ consultant, currentUserEmail, onBack }) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const queryClient = useQueryClient();

  const { data: messages = [], refetch } = useQuery({
    queryKey: ['chat-messages', currentUserEmail, consultant.email],
    queryFn: async () => {
      const sent = await base44.entities.Message.filter({ 
        from_email: currentUserEmail, 
        to_email: consultant.email 
      });
      const received = await base44.entities.Message.filter({ 
        from_email: consultant.email, 
        to_email: currentUserEmail 
      });
      
      // Segna messaggi come letti
      const unreadMsgs = received.filter(m => !m.is_read);
      for (const msg of unreadMsgs) {
        await base44.entities.Message.update(msg.id, { is_read: true });
      }
      
      return [...sent, ...received].sort((a, b) => 
        new Date(a.created_date) - new Date(b.created_date)
      );
    },
    refetchInterval: 3000,
  });

  // Invalida query messaggi non letti quando si apre/aggiorna la chat
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['unread-messages-consultants', currentUserEmail] });
    queryClient.invalidateQueries({ queryKey: ['consultation-unread-messages'] });
  }, [messages, currentUserEmail, queryClient]);

  useEffect(() => {
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create') {
        const msg = event.data;
        if ((msg.from_email === currentUserEmail && msg.to_email === consultant.email) ||
            (msg.from_email === consultant.email && msg.to_email === currentUserEmail)) {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['unread-messages-consultants', currentUserEmail] });
        }
      }
    });

    return () => unsubscribe();
  }, [currentUserEmail, consultant.email, refetch, queryClient]);

  // Trova booking attivo per usare lo stesso conversation_id
  const { data: activeBooking } = useQuery({
    queryKey: ['active-booking-chat', currentUserEmail, consultant.id],
    queryFn: async () => {
      const bookings = await base44.entities.ConsultationBooking.filter({ 
        user_email: currentUserEmail,
        consultant_id: consultant.id
      });
      // Trova booking non completato/cancellato
      return bookings.find(b => !['completed', 'cancelled'].includes(b.status));
    },
    enabled: !!currentUserEmail && !!consultant.id
  });

  const handleSend = async () => {
    if (!message.trim() || isSending) return;
    
    setIsSending(true);
    try {
      // Usa conversation_id dalla consulenza se esiste
      const conversationId = activeBooking ? `consultation_${activeBooking.id}` : null;
      
      await base44.entities.Message.create({
        from_email: currentUserEmail,
        to_email: consultant.email,
        content: message.trim(),
        source: 'consulenze',
        source_reference: activeBooking ? `Consulenza #${activeBooking.id.slice(-6)}` : consultant.name,
        conversation_id: conversationId,
        is_read: false
      });
      setMessage('');
      refetch();
    } catch (e) {
      console.error('Errore invio messaggio:', e);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[400px]">
      <div className="bg-slate-800 border-b border-slate-700 p-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-slate-400 hover:text-white p-1"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        {consultant.logo_url ? (
          <img 
            src={consultant.logo_url} 
            alt={`Logo ${consultant.name}`}
            className="w-10 h-10 object-contain rounded-full bg-slate-900 border border-slate-700"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-amber-400/20 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-amber-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold truncate">{consultant.name}</p>
          <p className="text-amber-400 text-xs truncate">{consultant.category}</p>
        </div>
        {consultant.phone && (
          <Button
            variant="ghost"
            size="sm"
            className="text-lime-400"
            onClick={() => window.open(`tel:${consultant.phone}`)}
          >
            <Phone className="w-5 h-5" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900">
        {messages.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nessun messaggio</p>
            <p className="text-xs">Inizia una conversazione</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isFromMe = msg.from_email === currentUserEmail;
            return (
              <div key={msg.id} className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`rounded-2xl px-4 py-2 max-w-[80%] ${
                  isFromMe 
                    ? 'bg-lime-400 text-slate-900 rounded-tr-sm' 
                    : 'bg-slate-700 text-white rounded-tl-sm'
                }`}>
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isFromMe ? 'text-slate-700' : 'text-slate-400'}`}>
                    {new Date(msg.created_date).toLocaleTimeString('it-IT', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="bg-slate-800 border-t border-slate-700 p-3 flex gap-2">
        <Input
          placeholder="Scrivi un messaggio..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          className="bg-slate-900 border-slate-700 text-white flex-1"
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isSending}
          className="bg-lime-400 hover:bg-lime-500 text-slate-900"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}