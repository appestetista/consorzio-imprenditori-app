import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, MapPin, Building2, Users, Search, MessageCircle, User, Briefcase } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function MembersDirectory({ currentUserEmail }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('aziende'); // 'aziende' o 'consulenti'
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['members-directory'],
    queryFn: async () => {
      // Usa la funzione backend per listare tutti gli utenti
      const response = await base44.functions.invoke('listMembers');
      return response.data?.users || [];
    }
  });

  const { data: consultants = [], isLoading: loadingConsultants } = useQuery({
    queryKey: ['consultants-directory'],
    queryFn: () => base44.entities.Consultant.list()
  });

  // Carica messaggi non letti per mostrare notifiche
  const { data: unreadMessages = [] } = useQuery({
    queryKey: ['unread-messages-directory', currentUserEmail],
    queryFn: () => base44.entities.Message.filter({ to_email: currentUserEmail, is_read: false }),
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

  const isLoading = loadingUsers || loadingConsultants;

  // Filtra utenti in base alla ricerca
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return allUsers;
    const search = searchTerm.toLowerCase();
    return allUsers.filter(user => 
      user.company_name?.toLowerCase().includes(search) ||
      user.full_name?.toLowerCase().includes(search) ||
      user.city?.toLowerCase().includes(search)
    );
  }, [allUsers, searchTerm]);

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

  const handleChat = (email) => {
    // Naviga direttamente alla pagina messaggi con la chat aperta
    navigate(createPageUrl('Messaggi') + `?contact=${encodeURIComponent(email)}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-lime-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Ricerca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Cerca per nome, azienda..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-slate-800 border-slate-700 text-white pl-10"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'aziende' ? 'default' : 'outline'}
          onClick={() => setActiveTab('aziende')}
          className={activeTab === 'aziende' 
            ? 'bg-lime-400 text-slate-900 hover:bg-lime-500' 
            : 'border-slate-700 text-slate-300 hover:bg-slate-800'}
        >
          <Building2 className="w-4 h-4 mr-2" />
          Aziende ({filteredUsers.length})
        </Button>
        <Button
          variant={activeTab === 'consulenti' ? 'default' : 'outline'}
          onClick={() => setActiveTab('consulenti')}
          className={activeTab === 'consulenti' 
            ? 'bg-amber-500 text-white hover:bg-amber-600 border-b-4 border-amber-600' 
            : 'border-2 border-amber-500 text-amber-500 hover:bg-amber-500/10'}
        >
          <Briefcase className="w-4 h-4 mr-2" />
          Consulenti ({filteredConsultants.length})
        </Button>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {activeTab === 'aziende' ? (
          filteredUsers.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Nessuna azienda trovata</p>
          ) : (
            filteredUsers.map(user => (
              <MemberCard 
                key={user.id} 
                user={user} 
                onChat={() => handleChat(user.email)}
                currentUserEmail={currentUserEmail}
                unreadCount={unreadCountByEmail[user.email] || 0}
              />
            ))
          )
        ) : (
          filteredConsultants.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Nessun consulente trovato</p>
          ) : (
            filteredConsultants.map(consultant => (
              <ConsultantCard 
                key={consultant.id} 
                consultant={consultant} 
                onChat={() => handleChat(consultant.email)}
                currentUserEmail={currentUserEmail}
                unreadCount={unreadCountByEmail[consultant.email] || 0}
              />
            ))
          )
        )}
      </div>
    </div>
  );
}

function MemberCard({ user, onChat, currentUserEmail, unreadCount }) {
  const isCurrentUser = user.email === currentUserEmail;
  
  return (
    <Card className="bg-slate-800 border-slate-700 p-4">
      <div className="flex items-center gap-3">
        {user.logo_url ? (
          <img 
            src={user.logo_url} 
            alt={user.company_name} 
            className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-7 h-7 text-slate-500" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-white font-semibold truncate">
            {user.company_name || 'Azienda'}
          </p>
          {user.specializzazione && (
            <p className="text-lime-400 text-xs truncate">
              {user.specializzazione}
            </p>
          )}
          <p className="text-slate-500 text-xs truncate flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {user.city ? `${user.city}${user.province ? ` (${user.province})` : ''}` : 'Località non specificata'}
          </p>
          {(user.referente || user.full_name) && (
            <div className="text-slate-400 text-sm mt-1 flex items-start gap-1">
              <User className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-slate-500 text-xs">Responsabile:</span>
                <p className="text-slate-300 truncate">{user.referente || user.full_name}</p>
              </div>
            </div>
          )}
        </div>
        {!isCurrentUser && (
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

function ConsultantCard({ consultant, onChat, currentUserEmail }) {
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
          <Button
            onClick={onChat}
            size="sm"
            className="bg-lime-400 hover:bg-lime-500 text-slate-900 flex-shrink-0"
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            Chatta
          </Button>
        )}
      </div>
    </Card>
  );
}