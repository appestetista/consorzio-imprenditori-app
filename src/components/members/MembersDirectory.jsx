import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useNotificationSound from '../hooks/useNotificationSound';
import { ChevronDown, ChevronRight, MapPin, Building2, Users, Search, MessageCircle, User, Briefcase } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function MembersDirectory({ currentUserEmail }) {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { playSound } = useNotificationSound();

  // Debug log
  console.log('[MembersDirectory] currentUserEmail:', currentUserEmail);

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['members-directory'],
    queryFn: async () => {
      // Usa la funzione backend per listare tutti gli utenti
      const response = await base44.functions.invoke('listMembers');
      return response.data?.users || [];
    }
  });

  // Carica messaggi non letti per mostrare notifiche
  const { data: unreadMessages = [] } = useQuery({
    queryKey: ['unread-messages-directory', currentUserEmail],
    queryFn: async () => {
      const messages = await base44.entities.Message.filter({ to_email: currentUserEmail, is_read: false });
      console.log('[MembersDirectory] Unread messages for', currentUserEmail, ':', messages);
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
        queryClient.invalidateQueries({ queryKey: ['unread-messages-directory', currentUserEmail] });
      }
    });

    return () => unsubscribe();
  }, [currentUserEmail, queryClient, playSound]);

  const isLoading = loadingUsers;

  // Demo: imprenditori finti visibili solo all'admin per anteprima
  const { data: currentUser } = useQuery({
    queryKey: ['current-user-role'],
    queryFn: () => base44.auth.me(),
  });

  const demoMembers = useMemo(() => {
    if (currentUser?.role !== 'admin') return [];
    return [
      { id: 'demo-1', company_name: 'Oleificio Ferrara Srl', full_name: 'Marco Ferrara', specializzazione: 'Produzione olio extravergine biologico', city: 'Andria', province: 'BT', user_type: 'utente', email: 'demo-ferrara@test.it', _isDemo: true },
      { id: 'demo-2', company_name: 'TechnoMec Srl', full_name: 'Laura Bianchi', specializzazione: 'Componentistica meccanica di precisione', city: 'Brescia', province: 'BS', user_type: 'utente', email: 'demo-technomec@test.it', _isDemo: true },
      { id: 'demo-3', company_name: 'Dolci Tradizioni', full_name: 'Giuseppe Amato', specializzazione: 'Pasticceria artigianale e export dolciumi', city: 'Napoli', province: 'NA', user_type: 'utente', email: 'demo-dolci@test.it', _isDemo: true },
      { id: 'demo-4', company_name: 'GreenBuild Italia SpA', full_name: 'Alessandra Conti', specializzazione: 'Edilizia sostenibile e certificazione LEED', city: 'Bologna', province: 'BO', user_type: 'utente', email: 'demo-greenbuild@test.it', _isDemo: true },
      { id: 'demo-5', company_name: 'Moda Tessile Marche', full_name: 'Francesca Rossi', specializzazione: 'Tessuti pregiati per alta moda', city: 'Fermo', province: 'FM', user_type: 'utente', email: 'demo-modatessile@test.it', _isDemo: true },
      { id: 'demo-6', company_name: 'Digital Solutions Srl', full_name: 'Andrea Marino', specializzazione: 'Sviluppo software e digitalizzazione PMI', city: 'Milano', province: 'MI', user_type: 'utente', email: 'demo-digital@test.it', _isDemo: true },
    ];
  }, [currentUser?.role]);

  // Filtra utenti in base alla ricerca - mostra solo utenti di tipo 'utente' (no admin, no consulenti)
  const filteredUsers = useMemo(() => {
    // Prima filtra per tipo utente
    const membersOnly = allUsers.filter(user => 
      user.user_type === 'utente' && 
      user.role !== 'admin' && 
      !user.is_blocked
    );

    const combined = [...membersOnly, ...demoMembers];
    
    if (!searchTerm) return combined;
    const search = searchTerm.toLowerCase();
    return combined.filter(user => 
      user.company_name?.toLowerCase().includes(search) ||
      user.full_name?.toLowerCase().includes(search) ||
      user.city?.toLowerCase().includes(search)
    );
  }, [allUsers, demoMembers, searchTerm]);

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

      {/* Lista Aziende */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
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
          <div className="flex items-center gap-1.5">
            <p className="text-white font-semibold truncate">
              {user.company_name || 'Azienda'}
            </p>
            {user._isDemo && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 flex-shrink-0">
                DEMO
              </span>
            )}
          </div>
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