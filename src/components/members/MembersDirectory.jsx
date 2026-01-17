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
      const users = await base44.entities.User.list();
      // Filtra admin e utenti di test
      return users.filter(u => 
        u.role !== 'admin' && 
        !u.full_name?.toLowerCase().includes('pinko pallino') &&
        !u.company_name?.toLowerCase().includes('pinko pallino')
      );
    }
  });

  const { data: consultants = [], isLoading: loadingConsultants } = useQuery({
    queryKey: ['consultants-directory'],
    queryFn: () => base44.entities.Consultant.list()
  });

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
    // Naviga alla pagina messaggi con l'email preselezionata
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
            ? 'bg-lime-400 text-slate-900 hover:bg-lime-500' 
            : 'border-slate-700 text-slate-300 hover:bg-slate-800'}
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
              />
            ))
          )
        )}
      </div>
    </div>
  );
}

function MemberCard({ user, compact = false }) {
  return (
    <div className={`bg-slate-800 rounded-lg ${compact ? 'p-2' : 'p-3'} flex items-center gap-3`}>
      {user.logo_url ? (
        <img 
          src={user.logo_url} 
          alt={user.company_name} 
          className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded object-cover flex-shrink-0`}
        />
      ) : (
        <div className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded bg-slate-700 flex items-center justify-center flex-shrink-0`}>
          <Building2 className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-slate-500`} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className={`text-white font-medium ${compact ? 'text-xs' : 'text-sm'} truncate`}>
          {user.company_name || user.full_name || 'N/A'}
        </p>
        {!compact && user.full_name && user.company_name && (
          <p className="text-slate-400 text-xs truncate">{user.full_name}</p>
        )}
      </div>
    </div>
  );
}