import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import AdminView from '../components/consulenze/AdminView';
import ConsultantView from '../components/consulenze/ConsultantView';
import MemberView from '../components/consulenze/MemberView';
import { useQuery } from '@tanstack/react-query';

export default function Consulenze() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { impersonation, appMode } = useImpersonation();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
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
  const isConsultant = impersonation.active && impersonation.role === 'consulente';
  const isMember = !isAdmin && !isConsultant;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('Home')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-white text-xl font-bold">
            {isConsultant ? 'Richieste di Consulenza' : 'Consulenze'}
          </h1>
        </div>

        {isAdmin && <AdminView />}
        {isConsultant && <ConsultantView consultantId={impersonation.targetId} />}
        {isMember && <MemberView user={user} />}
      </main>

      <BottomNav currentPage="Consulenze" unreadMessages={messages.length} />
    </div>
  );
}