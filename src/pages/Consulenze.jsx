import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import MemberView from '../components/consulenze/MemberView';
import ConsultantView from '../components/consulenze/ConsultantView';
import AdminView from '../components/consulenze/AdminView';
import { useImpersonation } from '../components/admin/ImpersonationContext';

export default function Consulenze() {
  const [user, setUser] = useState(null);
  const [effectiveUser, setEffectiveUser] = useState(null);
  const { impersonation } = useImpersonation();

  // Carica l'user corrente
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

  // Carica l'effective user (con impersonation)
  useEffect(() => {
    const loadEffectiveUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        
        if (impersonation.active) {
          if (impersonation.role === 'user') {
            const impersonatedUser = await base44.entities.User.filter({ id: impersonation.targetId });
            if (impersonatedUser.length > 0) {
              setEffectiveUser(impersonatedUser[0]);
            } else {
              setEffectiveUser(currentUser);
            }
          } else if (impersonation.role === 'consulente') {
            setEffectiveUser({ 
              ...currentUser, 
              email: impersonation.targetEmail,
              role: 'consulente' 
            });
          }
        } else {
          setEffectiveUser(currentUser);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadEffectiveUser();
  }, [impersonation.active, impersonation.targetId, impersonation.role, impersonation.targetEmail]);

  const { data: consultants = [], isLoading } = useQuery({
    queryKey: ['consultants'],
    queryFn: () => base44.entities.Consultant.list(),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', effectiveUser?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: effectiveUser?.email, is_read: false }),
    enabled: !!effectiveUser?.email,
  });

  const isAdmin = user?.role === 'admin' && !impersonation.active;
  const isConsultant = effectiveUser?.role === 'consulente' || (impersonation.active && impersonation.role === 'consulente');
  const isMember = effectiveUser?.role === 'user' || (impersonation.active && impersonation.role === 'user');

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={effectiveUser || user} />
      
      <main className="px-4 py-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('Home')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-white text-xl font-bold">
            {isAdmin ? 'GESTIONE CONSULENZE' : isConsultant ? 'LE MIE RICHIESTE' : 'CONSULENZE'}
          </h1>
        </div>

        {isAdmin && <AdminView consultants={consultants} />}
        {isConsultant && <ConsultantView user={effectiveUser} />}
        {isMember && <MemberView user={effectiveUser} consultants={consultants} isLoading={isLoading} />}
      </main>

      <BottomNav currentPage="Consulenze" unreadMessages={messages.length} />
    </div>
  );
}