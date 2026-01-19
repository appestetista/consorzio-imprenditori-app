import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, MessageSquare, Users, FileText, Video, 
  Handshake, Building2, ShoppingBag, BookOpen, PiggyBank,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { useImpersonation } from '../components/admin/ImpersonationContext';

const MENU_ITEMS = [
  { name: 'Calendario Incontri', page: 'CalendarioIncontri', icon: Calendar, color: 'lime' },
  { name: 'Messaggi', page: 'Messaggi', icon: MessageSquare, color: 'blue' },
  { name: 'Directory Membri', page: 'GestioneMembri', icon: Users, color: 'purple' },
  { name: 'Finanziamenti', page: 'FinanziamentiAgevolati', icon: FileText, color: 'green' },
  { name: 'Video Interviste', page: 'VideoInterviste', icon: Video, color: 'red' },
  { name: 'Consulenze', page: 'Consulenze', icon: Handshake, color: 'amber' },
  { name: 'Cultura Aziendale', page: 'CulturaAziendale', icon: BookOpen, color: 'indigo' },
  { name: 'Marketplace', page: 'Marketplace', icon: ShoppingBag, color: 'pink' },
  { name: 'Risparmio', page: 'RisparmioEnergetico', icon: PiggyBank, color: 'emerald' },
];

const colorClasses = {
  lime: 'bg-lime-400/20 text-lime-400 border-lime-400/30',
  blue: 'bg-blue-400/20 text-blue-400 border-blue-400/30',
  purple: 'bg-purple-400/20 text-purple-400 border-purple-400/30',
  green: 'bg-green-400/20 text-green-400 border-green-400/30',
  red: 'bg-red-400/20 text-red-400 border-red-400/30',
  amber: 'bg-amber-400/20 text-amber-400 border-amber-400/30',
  indigo: 'bg-indigo-400/20 text-indigo-400 border-indigo-400/30',
  pink: 'bg-pink-400/20 text-pink-400 border-pink-400/30',
  emerald: 'bg-emerald-400/20 text-emerald-400 border-emerald-400/30',
};

export default function Home() {
  const [user, setUser] = useState(null);
  const { impersonation } = useImpersonation();

  useEffect(() => {
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

  const isAdmin = user?.role === 'admin' && !impersonation.active;

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="mb-6">
          <h1 className="text-white text-2xl font-bold">
            Benvenuto{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {user?.company_name || 'Consorzio Imprenditori'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const colors = colorClasses[item.color];
            
            return (
              <Link key={item.page} to={createPageUrl(item.page)}>
                <Card className={`bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors h-full`}>
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <div className={`w-12 h-12 rounded-xl ${colors} flex items-center justify-center mb-3`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-white text-sm font-medium">{item.name}</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {isAdmin && (
          <Link to={createPageUrl('AdminPanel')}>
            <Card className="bg-gradient-to-r from-lime-400/20 to-emerald-400/20 border-lime-400/30 mt-6">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-lime-400/30 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-lime-400" />
                  </div>
                  <span className="text-white font-medium">Pannello Admin</span>
                </div>
                <ArrowRight className="w-5 h-5 text-lime-400" />
              </CardContent>
            </Card>
          </Link>
        )}
      </main>

      <BottomNav currentPage="Home" unreadMessages={messages.length} />
    </div>
  );
}