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

export default function ConsultantsList({ currentUserEmail, showChat = false }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConsultant, setSelectedConsultant] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { playSound } = useNotificationSound();

  const { data: consultants = [], isLoading } = useQuery({
    queryKey: ['consultants-list'],
    queryFn: () => base44.entities.Consultant.list()
  });

  // Carica messaggi non letti per mostrare notifiche
  const { data: unreadMessages = [] } = useQuery({
    queryKey: ['unread-messages-consultants', currentUserEmail],
    queryFn: async () => {
      const messages = await base44.entities.Message.filter({ to_email: currentUserEmail, is_read: false });
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

  // Subscribe real-time ai messaggi - suono per nuovi messaggi
  useEffect(() => {
    if (!currentUserEmail) return;

    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create' && event.data?.to_email === currentUserEmail) {
        playSound();
        queryClient.invalidateQueries({ queryKey: ['unread-messages-consultants', currentUserEmail] });
      }
    });

    return () => unsubscribe();
  }, [currentUserEmail, queryClient, playSound]);

  // Filtra consulenti in base alla ricerca
  const filteredConsultants = useMemo(() => {
    if (!searchTerm) return consultants;
    const search = searchTerm.toLowerCase();
    return consultants.filter(c => 
      c.name?.toLowerCase().includes(search) ||
      c.referente?.toLowerCase().includes(search) ||
      c.category?.toLowerCase().includes(search)
    );
  }, [consultants, searchTerm]);

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

function ConsultantCard({ consultant, onChat, currentUserEmail, unreadCount }) {
  const isCurrentUser = consultant.email === currentUserEmail;
  
  return (
    <Card className="bg-slate-800 border-slate-700 p-4">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-lg bg-amber-400/20 flex items-center justify-center flex-shrink-0">
          <Briefcase className="w-7 h-7 text-amber-400" />
        </div>
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
              <MessageCircle className="w-4 h-4 mr-1" />
              Chatta
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}