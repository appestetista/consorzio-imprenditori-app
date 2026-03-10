import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Heart, FileText, Gift, ShoppingBag, Send, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import Header from '../components/layout/Header';
import BottomNavWithMenu from '../components/layout/BottomNavWithMenu';
import SectionConsultantPanel from '../components/consulenze/SectionConsultantPanel';
import GlobalTopIcons from '../components/layout/GlobalTopIcons';

export default function WelfareAziendale() {
  const [user, setUser] = useState(null);

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

  const sections = [
    {
      icon: FileText,
      title: 'Normativa',
      description: 'Scopri le regole sui fringe benefit',
      page: 'WelfareNormativa'
    },
    {
      icon: Gift,
      title: 'Catalogo Marchi',
      description: 'I brand per i fringe benefit',
      page: 'WelfareTipologie'
    },
    {
      icon: ShoppingBag,
      title: 'Catalogo Buoni Pasto',
      description: 'Sfoglia il catalogo dei buoni pasto',
      page: 'CatalogoBuoniPasto'
    },
    {
      icon: Send,
      title: 'Ordina',
      description: 'Richiedi i buoni welfare per la tua azienda',
      page: 'WelfareOrdina'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900 pb-64">
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Esplora?tab=strumenti')} className="text-pink-400 p-3 -m-3 rounded-full back-arrow-tap">
              <ArrowLeft className="w-7 h-7" />
            </Link>
            <h1 className="text-white text-xl font-bold">Benefit Dipendenti</h1>
          </div>
          {/* Icone gestite dal GlobalHeader */}
        </div>

        {/* Hero Card */}
        <Card className="bg-gradient-to-br from-pink-500 to-rose-500 border-0 mb-6">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-white text-xl font-bold">Benefit Dipendenti</h2>
                  <p className="text-white/80 text-sm">Benefici e servizi per i tuoi dipendenti</p>
                </div>
              </div>
              <Link to={createPageUrl('WelfareStorico')} className="bg-slate-900 hover:bg-slate-800 transition-all hover:scale-105 rounded-2xl px-4 py-3 flex flex-col items-center gap-2 shadow-lg border border-lime-400/30 ml-6 -mr-2">
                <div className="w-10 h-10 bg-lime-400/20 rounded-full flex items-center justify-center">
                  <History className="w-5 h-5 text-lime-400" />
                </div>
                <span className="text-white text-[10px] font-bold text-center leading-tight uppercase tracking-wide">STORICO<br/>ORDINI</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Pannello Consulenti per questa sezione */}
        {user && (
          <div className="mb-6">
            <SectionConsultantPanel 
              sectionId="welfare_aziendale" 
              sectionLabel="Benefit Dipendenti" 
              user={user} 
            />
          </div>
        )}

        {/* Sections Grid */}
        <div className="grid grid-cols-2 gap-3">
          {sections.map((section, index) => (
            <Link key={index} to={createPageUrl(section.page)}>
              <Card className="bg-slate-800 border-slate-700 hover:border-pink-400/50 transition-colors h-full">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="w-14 h-14 bg-pink-400/20 rounded-xl flex items-center justify-center mb-3">
                    <section.icon className="w-7 h-7 text-pink-400" />
                  </div>
                  <h3 className="text-white font-semibold text-sm">{section.title}</h3>
                  <p className="text-slate-400 text-xs mt-1">{section.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>

      <BottomNavWithMenu currentPage="WelfareAziendale" unreadMessages={messages.length} />
    </div>
  );
}