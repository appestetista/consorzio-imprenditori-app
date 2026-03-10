import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Heart, FileText, Gift, ShoppingBag, Send, History, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import BottomNavWithMenu from '../components/layout/BottomNavWithMenu';
import SectionConsultantPanel from '../components/consulenze/SectionConsultantPanel';
import WelfareNormativaTab from '../components/welfare/WelfareNormativaTab';
import WelfareCatalogoTab from '../components/welfare/WelfareCatalogoTab';
import WelfareOrdinaTab from '../components/welfare/WelfareOrdinaTab';

const PILLS = [
  { id: 'normativa', label: 'Normativa', icon: FileText },
  { id: 'catalogo-marchi', label: 'Marchi', icon: Gift },
  { id: 'catalogo-buoni', label: 'Buoni Pasto', icon: Store },
  { id: 'ordina', label: 'Ordina', icon: Send },
];

export default function WelfareAziendale() {
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState('normativa');

  useEffect(() => {
    window.scrollTo(0, 0);
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', user?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: user?.email, is_read: false }),
    enabled: !!user?.email,
  });

  return (
    <div className="min-h-screen bg-slate-900 pb-64">
      <main className="px-4 py-6 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Esplora?tab=strumenti')} className="text-pink-400 p-3 -m-3 rounded-full back-arrow-tap">
              <ArrowLeft className="w-7 h-7" />
            </Link>
            <h1 className="text-white text-xl font-bold">Benefit Dipendenti</h1>
          </div>
          <Link to={createPageUrl('WelfareStorico')} className="bg-slate-800 hover:bg-slate-700 rounded-xl px-3 py-2 flex items-center gap-2 border border-lime-400/30">
            <History className="w-4 h-4 text-lime-400" />
            <span className="text-white text-[10px] font-bold uppercase">Storico</span>
          </Link>
        </div>

        {/* Hero Card compatto */}
        <Card className="bg-gradient-to-br from-pink-500 to-rose-500 border-0 mb-5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-white text-lg font-bold">Benefit Dipendenti</h2>
                <p className="text-white/80 text-xs">Benefici e servizi per i tuoi dipendenti</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pill Navigation */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {PILLS.map(pill => {
            const Icon = pill.icon;
            const isActive = activeSection === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setActiveSection(pill.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                  isActive 
                    ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30' 
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-pink-400/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* Consulenti */}
        {user && (
          <div className="mb-5">
            <SectionConsultantPanel 
              sectionId="welfare_aziendale" 
              sectionLabel="Benefit Dipendenti" 
              user={user} 
            />
          </div>
        )}

        {/* Contenuto attivo */}
        {activeSection === 'normativa' && <WelfareNormativaTab />}
        {activeSection === 'catalogo-marchi' && <WelfareCatalogoTab tipo="marchi" />}
        {activeSection === 'catalogo-buoni' && <WelfareCatalogoTab tipo="buoni-pasto" />}
        {activeSection === 'ordina' && <WelfareOrdinaTab user={user} />}
      </main>

      <BottomNavWithMenu currentPage="WelfareAziendale" unreadMessages={messages.length} />
    </div>
  );
}