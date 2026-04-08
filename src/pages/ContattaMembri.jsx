import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Users, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BottomNav from '../components/layout/BottomNav';
import SectionHeaderIcons from '../components/layout/SectionHeaderIcons';
import MemberCard from '../components/contatta-membri/MemberCard';
import MemberFilters from '../components/contatta-membri/MemberFilters';

export default function ContattaMembri() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ region: null, sector: null, size: null, city: null });
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(console.error);
  }, []);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members-directory'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', user?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: user?.email, is_read: false }),
    enabled: !!user?.email,
  });

  // Solo imprenditori (no admin, no consulenti, no se stesso, no bloccati)
  const eligibleMembers = useMemo(() => {
    return members.filter(m => {
      if (m.email === user?.email) return false;
      if (m.is_blocked) return false;
      if (m.role === 'admin') return false;
      if (m.user_type === 'consulente') return false;
      if (m.user_type !== 'utente') return false;
      return true;
    });
  }, [members, user?.email]);

  // Applica ricerca testuale + filtri
  const filteredMembers = useMemo(() => {
    let result = eligibleMembers;

    // Filtri dropdown
    if (filters.region) {
      result = result.filter(m => m.region === filters.region);
    }
    if (filters.city) {
      result = result.filter(m => m.city === filters.city);
    }
    if (filters.sector) {
      result = result.filter(m => (m.settore || m.sector) === filters.sector);
    }
    if (filters.size) {
      result = result.filter(m => m.company_size === filters.size);
    }

    // Ricerca testuale
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(m =>
        m.company_name?.toLowerCase().includes(q) ||
        m.full_name?.toLowerCase().includes(q) ||
        m.specializzazione?.toLowerCase().includes(q) ||
        m.settore?.toLowerCase().includes(q) ||
        m.sector?.toLowerCase().includes(q) ||
        m.city?.toLowerCase().includes(q) ||
        m.region?.toLowerCase().includes(q)
      );
    }

    // Ordina: chi ha profilo completo prima, poi per nome
    result.sort((a, b) => {
      const aScore = (a.company_name ? 1 : 0) + (a.city ? 1 : 0) + (a.settore || a.sector ? 1 : 0);
      const bScore = (b.company_name ? 1 : 0) + (b.city ? 1 : 0) + (b.settore || b.sector ? 1 : 0);
      if (bScore !== aScore) return bScore - aScore;
      return (a.company_name || a.full_name || '').localeCompare(b.company_name || b.full_name || '');
    });

    return result;
  }, [eligibleMembers, filters, searchTerm]);

  const handleContact = (email) => {
    navigate(createPageUrl('Messaggi') + `?contact=${encodeURIComponent(email)}&source=diretto`);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--app-bg)' }}>
        <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-64" style={{ backgroundColor: 'var(--app-bg)' }}>
      <main className="px-4 py-6 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(createPageUrl('Esplora?tab=strumenti'))}
              className="text-lime-400 p-3 -m-3 rounded-full back-arrow-tap"
            >
              <ArrowLeft className="w-7 h-7" />
            </button>
            <div>
              <h1 className="text-white text-xl font-bold">Directory Imprenditori</h1>
              <p className="text-slate-500 text-xs">{eligibleMembers.length} imprenditori iscritti</p>
            </div>
          </div>
          <SectionHeaderIcons userEmail={user?.email} />
        </div>

        {/* Ricerca e Filtri */}
        <MemberFilters
          members={eligibleMembers}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filters={filters}
          onFiltersChange={setFilters}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
        />

        {/* Counter risultati */}
        <div className="flex items-center justify-between mt-4 mb-3 px-1">
          <p className="text-slate-500 text-xs">
            {filteredMembers.length} {filteredMembers.length === 1 ? 'risultato' : 'risultati'}
          </p>
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-14 h-14 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">Nessun imprenditore trovato</p>
            <p className="text-slate-600 text-sm mt-1">Prova a cambiare i filtri o la ricerca</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMembers.map(member => (
              <MemberCard
                key={member.id}
                member={member}
                onContact={handleContact}
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav currentPage="ContattaMembri" unreadMessages={messages.length} />
    </div>
  );
}