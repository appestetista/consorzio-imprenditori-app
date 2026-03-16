import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Heart, CreditCard, ShoppingBag, Gift, History, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import BottomNavWithMenu from '../components/layout/BottomNavWithMenu';
import SectionConsultantPanel from '../components/consulenze/SectionConsultantPanel';
import WelfareBuonoSection from '../components/welfare/WelfareBuonoSection';
import WelfareCatalogoTab from '../components/welfare/WelfareCatalogoTab';

const PILLS = [
  { id: 'buoni_pasto', label: 'Buoni Pasto', icon: CreditCard },
  { id: 'buoni_spesa', label: 'Buoni Spesa', icon: ShoppingBag },
  { id: 'buoni_omaggio', label: 'Buoni Omaggio', icon: Gift },
];

export default function WelfareAziendale() {
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState('buoni_pasto');

  useEffect(() => {
    window.scrollTo(0, 0);
    base44.auth.me().then(setUser).catch(console.error);
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', user?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: user?.email, is_read: false }),
    enabled: !!user?.email,
  });

  return (
    <div className="min-h-screen pb-64" style={{ backgroundColor: 'var(--app-bg)' }}>
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

        {/* Hero Card */}
        <Card className="bg-gradient-to-br from-pink-500 to-rose-500 border-0 mb-5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-white text-lg font-bold">Benefit Dipendenti</h2>
                <p className="text-white/80 text-xs">Buoni pasto, spesa e omaggio per la tua azienda</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pill Navigation */}
        <div className="grid grid-cols-3 gap-1.5 mb-5">
          {PILLS.map(pill => {
            const Icon = pill.icon;
            const isActive = activeSection === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setActiveSection(pill.id)}
                className={`flex flex-col items-center justify-center gap-1 px-1 py-2.5 rounded-xl text-[10px] font-semibold transition-all ${
                  isActive
                    ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-pink-400/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="leading-tight text-center">{pill.label}</span>
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

        {/* Contenuto */}
        {activeSection === 'buoni_pasto' && <WelfareBuonoSection tipo="buoni_pasto" user={user} />}
        {activeSection === 'buoni_spesa' && <WelfareBuonoSection tipo="buoni_spesa" user={user} />}
        {activeSection === 'buoni_omaggio' && <WelfareBuonoSection tipo="buoni_omaggio" user={user} />}
      </main>

      <BottomNavWithMenu currentPage="WelfareAziendale" unreadMessages={messages.length} />
    </div>
  );
}