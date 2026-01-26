import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import useNotificationSound from '../hooks/useNotificationSound';
import { Search, MessageCircle, User, Building2, Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ZoneUsersList({ consultantEmail, consultantZona }) {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { playSound } = useNotificationSound();

  // Carica tutti gli utenti della zona del consulente
  const { data: zoneUsers = [], isLoading } = useQuery({
    queryKey: ['zone-users', consultantZona],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      // Filtra utenti della stessa zona (escludendo admin e il consulente stesso)
      return users.filter(u => 
        u.zona === consultantZona && 
        u.role !== 'admin' && 
        u.email !== consultantEmail
      );
    },
    enabled: !!consultantZona
  });

  // Carica messaggi non letti per mostrare notifiche
  const { data: unreadMessages = [] } = useQuery({
    queryKey: ['unread-messages-from-users', consultantEmail],
    queryFn: async () => {
      const messages = await base44.entities.Message.filter({ 
        to_email: consultantEmail, 
        is_read: false 
      });
      return messages;
    },
    enabled: !!consultantEmail
  });

  // Subscribe real-time ai messaggi - suono per nuovi messaggi
  useEffect(() => {
    if (!consultantEmail) return;

    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create' && event.data?.to_email === consultantEmail) {
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

  const handleChat = (email) => {
    navigate(createPageUrl('Messaggi') + `?contact=${encodeURIComponent(email)}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-lime-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!consultantZona) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400">Nessuna zona assegnata. Contatta l'amministratore.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con zona */}
      <div className="bg-slate-800 border border-lime-400/30 rounded-lg p-3">
        <p className="text-slate-400 text-sm">La tua zona:</p>
        <p className="text-lime-400 font-bold">{consultantZona}</p>
        <p className="text-slate-500 text-xs mt-1">{sortedUsers.length} utenti nella tua zona</p>
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
              onChat={() => handleChat(user.email)}
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
  
  return (
    <Card className={`bg-slate-800 border-slate-700 p-4 ${unreadCount > 0 ? 'border-l-4 border-l-red-500' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 ${
          unreadCount > 0 ? 'bg-red-500/20' : 'bg-lime-400/20'
        }`}>
          {unreadCount > 0 ? (
            <div className="relative">
              <Bell className="w-7 h-7 text-red-400" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            </div>
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
          {user.settore && (
            <Badge className="bg-blue-400/20 text-blue-400 text-xs mt-1">
              {user.settore}
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
            <MessageCircle className="w-4 h-4 mr-1" />
            {unreadCount > 0 ? 'Rispondi' : 'Chatta'}
          </Button>
        </div>
      </div>
    </Card>
  );
}