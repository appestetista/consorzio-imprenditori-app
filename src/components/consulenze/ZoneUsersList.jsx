import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import useNotificationSound from '../hooks/useNotificationSound';
import { Search, MessageCircle, User, Building2, Bell, ArrowLeft, Phone, Send, MapPin, Briefcase } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ZoneUsersList({ consultantEmail, consultantZona, consultantZoneAssegnate, consultantLogo }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { playSound } = useNotificationSound();

  // Determina le zone da usare: zone_assegnate (array) ha priorità su zona (stringa singola)
  const effectiveZones = useMemo(() => {
    if (consultantZoneAssegnate && consultantZoneAssegnate.length > 0) {
      return consultantZoneAssegnate.map(z => z.trim().toLowerCase()).filter(Boolean);
    }
    if (consultantZona) {
      return consultantZona.split(',').map(z => z.trim().toLowerCase()).filter(Boolean);
    }
    return [];
  }, [consultantZona, consultantZoneAssegnate]);

  // Carica tutti gli utenti delle zone del consulente (usa backend function per bypassare restrizioni)
  const { data: zoneUsers = [], isLoading } = useQuery({
    queryKey: ['zone-users', effectiveZones.join(',')],
    queryFn: async () => {
      if (effectiveZones.length === 0) return [];
      const response = await base44.functions.invoke('listMembers');
      const users = response.data?.users || [];
      
      // Carica lista email dei consulenti per escluderli
      const consultantsRes = await base44.entities.Consultant.list();
      const consultantEmails = consultantsRes.map(c => c.email?.toLowerCase()).filter(Boolean);
      
      // Filtra utenti:
      // - della stessa zona (o una delle zone del consulente)
      // - escludendo admin
      // - escludendo il consulente stesso
      // - escludendo altri consulenti (user_type = 'consulente' oppure email presente in Consultant)
      return users.filter(u => {
        const userZona = (u.zona || '').trim().toLowerCase();
        const userEmail = (u.email || '').toLowerCase();
        const isInZone = userZona && effectiveZones.includes(userZona);
        const isNotAdmin = u.role !== 'admin';
        const isNotSelf = userEmail !== consultantEmail?.toLowerCase();
        const isNotConsultantByType = u.user_type !== 'consulente';
        const isNotConsultantByEmail = !consultantEmails.includes(userEmail);
        
        return isInZone && isNotAdmin && isNotSelf && isNotConsultantByType && isNotConsultantByEmail;
      });
    },
    enabled: effectiveZones.length > 0
  });

  // Carica messaggi non letti per mostrare notifiche (solo dalla sezione consulenze)
  const { data: unreadMessages = [] } = useQuery({
    queryKey: ['unread-messages-from-users', consultantEmail],
    queryFn: async () => {
      const messages = await base44.entities.Message.filter({ 
        to_email: consultantEmail, 
        source: 'consulenze',
        is_read: false 
      });
      return messages;
    },
    enabled: !!consultantEmail
  });

  // Subscribe real-time ai messaggi - suono per nuovi messaggi (solo dalla sezione consulenze)
  useEffect(() => {
    if (!consultantEmail) return;

    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create' && 
          event.data?.to_email === consultantEmail && 
          event.data?.source === 'consulenze') {
        playSound();
        queryClient.invalidateQueries({ queryKey: ['unread-messages-from-users', consultantEmail] });
      }
    });

    return () => unsubscribe();
  }, [consultantEmail, queryClient, playSound]);

  // Conta messaggi non letti per ogni mittente e trova il messaggio più vecchio non letto
  const unreadDataByEmail = useMemo(() => {
    const data = {};
    unreadMessages.forEach(msg => {
      if (!data[msg.from_email]) {
        data[msg.from_email] = {
          count: 0,
          oldestUnread: msg.created_date
        };
      }
      data[msg.from_email].count += 1;
      // Trova il messaggio più vecchio non letto
      if (msg.created_date < data[msg.from_email].oldestUnread) {
        data[msg.from_email].oldestUnread = msg.created_date;
      }
    });
    return data;
  }, [unreadMessages]);

  // Filtra utenti in base alla ricerca
  const filteredUsers = useMemo(() => {
    let users = zoneUsers;
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      users = users.filter(u => 
        u.company_name?.toLowerCase().includes(search) ||
        u.full_name?.toLowerCase().includes(search) ||
        u.referente?.toLowerCase().includes(search) ||
        u.email?.toLowerCase().includes(search)
      );
    }
    
    return users;
  }, [zoneUsers, searchTerm]);

  // Ordina: prima quelli con messaggi non letti (ordinati dal più vecchio), poi gli altri
  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      const aHasUnread = unreadDataByEmail[a.email]?.count > 0;
      const bHasUnread = unreadDataByEmail[b.email]?.count > 0;
      
      // Se entrambi hanno messaggi non letti, ordina per il più vecchio non letto
      if (aHasUnread && bHasUnread) {
        return new Date(unreadDataByEmail[a.email].oldestUnread) - new Date(unreadDataByEmail[b.email].oldestUnread);
      }
      
      // Se solo uno ha messaggi non letti, mettilo prima
      if (aHasUnread && !bHasUnread) return -1;
      if (!aHasUnread && bHasUnread) return 1;
      
      // Altrimenti ordina per nome
      const nameA = a.company_name || a.full_name || '';
      const nameB = b.company_name || b.full_name || '';
      return nameA.localeCompare(nameB);
    });
  }, [filteredUsers, unreadDataByEmail]);

  const handleChat = (user) => {
    setSelectedUser(user);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-lime-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (effectiveZones.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400">Nessuna zona assegnata. Contatta l'amministratore.</p>
      </div>
    );
  }

  // Se è selezionato un utente, mostra la chat
  if (selectedUser) {
    return (
      <FullChatWithUser 
        user={selectedUser}
        consultantEmail={consultantEmail}
        consultantLogo={consultantLogo}
        onBack={() => setSelectedUser(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con zone */}
      <div className="bg-slate-800 border border-lime-400/30 rounded-lg p-3">
        <p className="text-slate-400 text-sm">{effectiveZones.length > 1 ? 'Le tue zone:' : 'La tua zona:'}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {effectiveZones.map((zone, idx) => (
            <Badge key={idx} className="bg-lime-400/20 text-lime-400 border-0">{zone.toUpperCase()}</Badge>
          ))}
        </div>
        <p className="text-slate-500 text-xs mt-2">{sortedUsers.length} utenti nelle tue zone</p>
      </div>

      {/* Ricerca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Cerca utente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-slate-800 border-slate-700 text-white pl-10"
        />
      </div>

      {/* Lista Utenti */}
      <div className="space-y-3">
        {sortedUsers.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">Nessun utente trovato nella tua zona</p>
        ) : (
          sortedUsers.map(user => (
            <UserCard 
              key={user.id} 
              user={user} 
              onChat={() => handleChat(user)}
              unreadCount={unreadDataByEmail[user.email]?.count || 0}
            />
          ))
        )}
      </div>
    </div>
  );
}

function UserCard({ user, onChat, unreadCount }) {
  const displayName = user.company_name || user.full_name || user.email;
  const hasLogo = user.logo_url || user.company_logo;
  
  return (
    <Card className={`bg-slate-800 border-slate-700 p-4 ${unreadCount > 0 ? 'border-l-4 border-l-red-500' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden ${
          unreadCount > 0 ? 'bg-red-500/20' : hasLogo ? '' : 'bg-lime-400/20'
        }`}>
          {unreadCount > 0 ? (
            <div className="relative">
              <Bell className="w-7 h-7 text-red-400" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            </div>
          ) : hasLogo ? (
            <img 
              src={user.logo_url || user.company_logo} 
              alt={displayName}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <Building2 className="w-7 h-7 text-lime-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-white font-semibold truncate">
            {displayName}
          </p>
          {user.referente && (
            <p className="text-slate-400 text-sm truncate flex items-center gap-1">
              <User className="w-3 h-3" />
              {user.referente}
            </p>
          )}
          {/* Località */}
          {user.city && (
            <p className="text-slate-500 text-xs truncate flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" />
              {user.city}
            </p>
          )}
          {/* Specializzazione */}
          {(user.specializzazione || user.settore) && (
            <Badge className="bg-blue-400/20 text-blue-400 text-xs mt-1">
              <Briefcase className="w-3 h-3 mr-1" />
              {user.specializzazione || user.settore}
            </Badge>
          )}
        </div>
        <div className="flex-shrink-0">
          <Button
            onClick={onChat}
            size="sm"
            className={unreadCount > 0 
              ? "bg-red-500 hover:bg-red-600 text-white" 
              : "bg-lime-400 hover:bg-lime-500 text-slate-900"
            }
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function FullChatWithUser({ user, consultantEmail, consultantLogo, onBack }) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const queryClient = useQueryClient();
  const displayName = user.company_name || user.full_name || user.email;

  const { data: messages = [], refetch } = useQuery({
    queryKey: ['chat-messages-user', consultantEmail, user.email],
    queryFn: async () => {
      const sent = await base44.entities.Message.filter({ 
        from_email: consultantEmail, 
        to_email: user.email 
      });
      const received = await base44.entities.Message.filter({ 
        from_email: user.email, 
        to_email: consultantEmail 
      });
      
      // Segna come letti i messaggi ricevuti
      for (const msg of received) {
        if (!msg.is_read) {
          await base44.entities.Message.update(msg.id, { is_read: true });
        }
      }
      
      return [...sent, ...received].sort((a, b) => 
        new Date(a.created_date) - new Date(b.created_date)
      );
    },
    refetchInterval: 3000,
  });

  useEffect(() => {
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create') {
        const msg = event.data;
        if ((msg.from_email === consultantEmail && msg.to_email === user.email) ||
            (msg.from_email === user.email && msg.to_email === consultantEmail)) {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['unread-messages-from-users', consultantEmail] });
        }
      }
    });

    return () => unsubscribe();
  }, [consultantEmail, user.email, refetch, queryClient]);

  const handleSend = async () => {
    if (!message.trim() || isSending) return;
    
    setIsSending(true);
    try {
      await base44.entities.Message.create({
        from_email: consultantEmail,
        to_email: user.email,
        content: message.trim(),
        source: 'consulenze',
        source_reference: displayName,
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
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-slate-400 hover:text-white p-1"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="w-10 h-10 rounded-full bg-lime-400/20 flex items-center justify-center overflow-hidden">
          {(user.logo_url || user.company_logo) ? (
            <img src={user.logo_url || user.company_logo} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <Building2 className="w-5 h-5 text-lime-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold truncate">{displayName}</p>
          {user.referente && (
            <p className="text-slate-400 text-xs truncate">{user.referente}</p>
          )}
        </div>
        {user.phone && (
          <Button
            variant="ghost"
            size="sm"
            className="text-lime-400"
            onClick={() => window.open(`tel:${user.phone}`)}
          >
            <Phone className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Messaggi */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900">
        {messages.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nessun messaggio</p>
            <p className="text-xs">Inizia una conversazione</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isFromMe = msg.from_email === consultantEmail;
            const userLogo = user.logo_url || user.company_logo;
            return (
              <div key={msg.id} className={`flex items-end gap-2 ${isFromMe ? 'justify-end' : 'justify-start'}`}>
                {!isFromMe && (
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-slate-600">
                    {userLogo ? (
                      <img src={userLogo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-slate-400" />
                      </div>
                    )}
                  </div>
                )}
                <div className={`rounded-2xl px-4 py-2 max-w-[75%] ${
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
                {isFromMe && (
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-lime-400/20">
                    {consultantLogo ? (
                      <img src={consultantLogo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lime-400 text-xs font-bold">
                        Tu
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
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