import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import useNotificationSound from '../hooks/useNotificationSound';
import { MapPin, Building2, Search, MessageCircle, User, Briefcase, Navigation } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function MembersDirectory({ currentUserEmail }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [mode, setMode] = useState('useful'); // 'useful' = chi mi è utile, 'nearby' = chi mi è vicino
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { playSound } = useNotificationSound();

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

  // Filtra utenti in base alla ricerca e modalità
  const filteredUsers = useMemo(() => {
    const membersOnly = allUsers.filter(user => 
      user.user_type === 'utente' && 
      user.role !== 'admin' && 
      !user.is_blocked
    );

    let combined = [...membersOnly, ...demoMembers];
    
    // Filtra per ricerca
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      combined = combined.filter(user => 
        user.company_name?.toLowerCase().includes(search) ||
        user.full_name?.toLowerCase().includes(search) ||
        user.city?.toLowerCase().includes(search) ||
        user.specializzazione?.toLowerCase().includes(search) ||
        user.settore?.toLowerCase().includes(search)
      );
    }

    // Ordina in base alla modalità
    if (mode === 'nearby' && currentUser) {
      combined.sort((a, b) => {
        const scoreA = getProximityScore(a, currentUser);
        const scoreB = getProximityScore(b, currentUser);
        return scoreB - scoreA;
      });
    }

    return combined;
  }, [allUsers, demoMembers, searchTerm, mode, currentUser]);

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

  const placeholderText = mode === 'nearby'
    ? 'Cerca per città, provincia...'
    : 'Cerca per nome, azienda, settore...';

  return (
    <div className="space-y-4">
      {/* Toggle modalità */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('useful')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
            mode === 'useful'
              ? 'bg-lime-400 text-slate-900'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Chi mi è utile
        </button>
        <button
          onClick={() => setMode('nearby')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
            mode === 'nearby'
              ? 'bg-lime-400 text-slate-900'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}
        >
          <Navigation className="w-4 h-4" />
          Chi mi è vicino
        </button>
      </div>

      {/* Ricerca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder={placeholderText}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-slate-800 border-slate-700 text-white pl-10"
        />
      </div>

      {/* Lista Imprenditori */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">Nessun imprenditore trovato</p>
        ) : (
          filteredUsers.map(user => (
            <MemberCard 
              key={user.id} 
              user={user} 
              onChat={() => handleChat(user.email)}
              currentUserEmail={currentUserEmail}
              unreadCount={unreadCountByEmail[user.email] || 0}
              showProximity={mode === 'nearby'}
              currentUser={currentUser}
            />
          ))
        )}
      </div>
    </div>
  );
}

function getProximityScore(member, currentUser) {
  if (!currentUser) return 0;
  if (currentUser.city && member.city && currentUser.city === member.city) return 3;
  if (currentUser.province && member.province && currentUser.province === member.province) return 2;
  if (currentUser.region && member.region && currentUser.region === member.region) return 1;
  return 0;
}

function getProximityBadge(member, currentUser) {
  if (!currentUser) return null;
  if (currentUser.city && member.city && currentUser.city === member.city) {
    return { label: 'Stessa città', className: 'bg-emerald-500/20 text-emerald-400' };
  }
  if (currentUser.province && member.province && currentUser.province === member.province) {
    return { label: 'Stessa provincia', className: 'bg-cyan-500/20 text-cyan-400' };
  }
  if (currentUser.region && member.region && currentUser.region === member.region) {
    return { label: 'Stessa regione', className: 'bg-blue-500/20 text-blue-400' };
  }
  return null;
}

function MemberCard({ user, onChat, currentUserEmail, unreadCount, showProximity, currentUser }) {
  const isCurrentUser = user.email === currentUserEmail;
  const proximityBadge = showProximity ? getProximityBadge(user, currentUser) : null;
  
  return (
    <Card className="bg-slate-800 border-slate-700 p-4">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {user.logo_url ? (
          <img 
            src={user.logo_url} 
            alt={user.company_name} 
            className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-lime-400/20 to-emerald-400/20 flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-lime-400" />
          </div>
        )}

        {/* Info */}
        <div className="min-w-0 flex-1">
          {/* Nome imprenditore (in alto, principale) */}
          <p className="text-white font-semibold text-[15px] leading-tight">
            {user.referente || user.full_name}
          </p>

          {/* Nome azienda */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <Building2 className="w-3 h-3 text-slate-500 flex-shrink-0" />
            <p className="text-slate-300 text-sm">
              {user.company_name || 'Azienda'}
            </p>
          </div>

          {/* Specializzazione (completa, senza abbreviare) */}
          {user.specializzazione && (
            <p className="text-lime-400 text-xs mt-1 leading-snug">
              {user.specializzazione}
            </p>
          )}

          {/* Località */}
          <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {user.city ? `${user.city}${user.province ? ` (${user.province})` : ''}` : 'Località non specificata'}
          </p>

          {/* Badge prossimità */}
          {proximityBadge && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1.5 ${proximityBadge.className}`}>
              <Navigation className="w-2.5 h-2.5" />
              {proximityBadge.label}
            </span>
          )}

          {/* Badge DEMO in fondo */}
          {user._isDemo && (
            <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 mt-1.5">
              DEMO
            </span>
          )}
        </div>

        {/* Bottone chat */}
        {!isCurrentUser && (
          <div className="relative flex-shrink-0">
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center z-10">
                {unreadCount}
              </span>
            )}
            <button
              onClick={onChat}
              className="w-10 h-10 rounded-xl bg-lime-400 hover:bg-lime-500 flex items-center justify-center transition-colors active:scale-95"
            >
              <MessageCircle className="w-5 h-5 text-slate-900" />
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}