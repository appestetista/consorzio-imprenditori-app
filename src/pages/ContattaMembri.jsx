import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Users, Compass, Handshake } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BottomNav from '../components/layout/BottomNav';
import SectionHeaderIcons from '../components/layout/SectionHeaderIcons';
import MemberCard from '../components/contatta-membri/MemberCard';
import MemberFilters from '../components/contatta-membri/MemberFilters';

export default function ContattaMembri() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('useful'); // 'useful' | 'nearby'
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ region: null, sector: null, size: null, city: null, specializzazione: null });
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(console.error);
  }, []);

  // Reset filtri e ricerca quando cambi modalità
  const handleModeChange = (newMode) => {
    setMode(newMode);
    setSearchTerm('');
    setFilters({ region: null, sector: null, size: null, city: null, specializzazione: null });
    setShowFilters(false);
  };

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members-directory'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', user?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: user?.email, is_read: false }),
    enabled: !!user?.email,
  });

  // Solo imprenditori
  const realMembers = useMemo(() => {
    return members.filter(m => {
      if (m.email === user?.email) return false;
      if (m.is_blocked) return false;
      if (m.role === 'admin') return false;
      if (m.user_type === 'consulente') return false;
      if (m.user_type !== 'utente') return false;
      return true;
    });
  }, [members, user?.email]);

  // Demo: imprenditori finti visibili solo all'admin per anteprima
  const demoMembers = useMemo(() => {
    if (user?.role !== 'admin') return [];
    return [
      { id: 'demo-1', company_name: 'Oleificio Ferrara Srl', full_name: 'Marco Ferrara', specializzazione: 'Produzione olio extravergine biologico', settore: 'Agroalimentare', city: 'Andria', province: 'BT', region: 'Puglia', company_size: 'Piccola', email: 'demo-ferrara@test.it', user_type: 'utente', _isDemo: true },
      { id: 'demo-2', company_name: 'TechnoMec Srl', full_name: 'Laura Bianchi', specializzazione: 'Componentistica meccanica di precisione', settore: 'Meccanica', city: 'Brescia', province: 'BS', region: 'Lombardia', company_size: 'Media', email: 'demo-technomec@test.it', user_type: 'utente', _isDemo: true },
      { id: 'demo-3', company_name: 'Dolci Tradizioni', full_name: 'Giuseppe Amato', specializzazione: 'Pasticceria artigianale e export dolciumi', settore: 'Alimentare', city: 'Napoli', province: 'NA', region: 'Campania', company_size: 'Micro', email: 'demo-dolci@test.it', user_type: 'utente', _isDemo: true },
      { id: 'demo-4', company_name: 'GreenBuild Italia SpA', full_name: 'Alessandra Conti', specializzazione: 'Edilizia sostenibile e certificazione LEED', settore: 'Edilizia', city: 'Bologna', province: 'BO', region: 'Emilia-Romagna', company_size: 'Grande', email: 'demo-greenbuild@test.it', user_type: 'utente', _isDemo: true },
      { id: 'demo-5', company_name: 'Moda Tessile Marche', full_name: 'Francesca Rossi', specializzazione: 'Tessuti pregiati per alta moda', settore: 'Tessile', city: 'Fermo', province: 'FM', region: 'Marche', company_size: 'Piccola', email: 'demo-modatessile@test.it', user_type: 'utente', _isDemo: true },
      { id: 'demo-6', company_name: 'Digital Solutions Srl', full_name: 'Andrea Marino', specializzazione: 'Sviluppo software e digitalizzazione PMI', settore: 'Informatica', city: 'Milano', province: 'MI', region: 'Lombardia', company_size: 'Piccola', email: 'demo-digital@test.it', user_type: 'utente', _isDemo: true },
    ];
  }, [user?.role]);

  const eligibleMembers = useMemo(() => {
    return [...realMembers, ...demoMembers];
  }, [realMembers, demoMembers]);

  // Applica filtri + ricerca + ordinamento in base alla modalità
  const filteredMembers = useMemo(() => {
    let result = eligibleMembers;

    // Filtri dropdown
    if (filters.region) result = result.filter(m => m.region === filters.region);
    if (filters.city) result = result.filter(m => m.city === filters.city);
    if (filters.sector) result = result.filter(m => (m.settore || m.sector) === filters.sector);
    if (filters.specializzazione) result = result.filter(m => m.specializzazione === filters.specializzazione);
    if (filters.size) result = result.filter(m => m.company_size === filters.size);

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
        m.province?.toLowerCase().includes(q) ||
        m.region?.toLowerCase().includes(q)
      );
    }

    // Ordinamento in base alla modalità
    if (mode === 'nearby') {
      // Priorità: stessa città > stessa provincia > stessa regione > resto
      result.sort((a, b) => {
        const scoreGeo = (m) => {
          let s = 0;
          if (user?.city && m.city === user.city) s += 100;
          if (user?.province && m.province === user.province) s += 50;
          if (user?.region && m.region === user.region) s += 20;
          return s;
        };
        const diff = scoreGeo(b) - scoreGeo(a);
        if (diff !== 0) return diff;
        return (a.company_name || a.full_name || '').localeCompare(b.company_name || b.full_name || '');
      });
    } else {
      // "Chi mi è utile": profilo completo prima, poi per nome
      result.sort((a, b) => {
        const score = (m) =>
          (m.company_name ? 1 : 0) +
          (m.specializzazione ? 2 : 0) +
          (m.settore || m.sector ? 1 : 0) +
          (m.city ? 1 : 0);
        const diff = score(b) - score(a);
        if (diff !== 0) return diff;
        return (a.company_name || a.full_name || '').localeCompare(b.company_name || b.full_name || '');
      });
    }

    return result;
  }, [eligibleMembers, filters, searchTerm, mode, user]);

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
              <h1 className="text-white text-xl font-bold">Imprenditori</h1>
              <p className="text-slate-500 text-xs">{eligibleMembers.length} iscritti</p>
            </div>
          </div>
          <SectionHeaderIcons userEmail={user?.email} />
        </div>

        {/* Toggle modalità: Utile / Vicino */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => handleModeChange('useful')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
              mode === 'useful'
                ? 'bg-lime-400 text-slate-900'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            <Handshake className="w-4 h-4" />
            Chi mi è utile
          </button>
          <button
            onClick={() => handleModeChange('nearby')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
              mode === 'nearby'
                ? 'bg-lime-400 text-slate-900'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            <Compass className="w-4 h-4" />
            Chi mi è vicino
          </button>
        </div>

        {/* Sottotitolo contestuale */}
        <p className="text-slate-500 text-xs mb-3 px-1">
          {mode === 'useful'
            ? 'Trova imprenditori per settore, specializzazione o competenza'
            : user?.city
              ? `Imprenditori vicini a ${user.city} — ordinati per prossimità`
              : 'Imprenditori nella tua zona — completa il profilo per risultati migliori'
          }
        </p>

        {/* Ricerca e Filtri */}
        <MemberFilters
          members={eligibleMembers}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filters={filters}
          onFiltersChange={setFilters}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          mode={mode}
        />

        {/* Counter */}
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
                highlightGeo={mode === 'nearby'}
                currentUser={user}
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav currentPage="ContattaMembri" unreadMessages={messages.length} />
    </div>
  );
}