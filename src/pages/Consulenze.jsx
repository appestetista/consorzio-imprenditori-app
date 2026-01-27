import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import MemberView from '../components/consulenze/MemberView';
import ConsultantView from '../components/consulenze/ConsultantView';
import AdminView from '../components/consulenze/AdminView';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import useNotificationSound from '../components/hooks/useNotificationSound';

export default function Consulenze() {
  const [user, setUser] = useState(null);
  const [effectiveUser, setEffectiveUser] = useState(null);
  const { impersonation } = useImpersonation();
  const { playSound } = useNotificationSound();
  const queryClient = useQueryClient();

  // Carica l'user corrente
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

  // Carica l'effective user (con impersonation)
  useEffect(() => {
    const loadEffectiveUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        
        if (impersonation.active) {
          if (impersonation.role === 'user') {
            // Impersonificazione utente normale
            const impersonatedUser = await base44.entities.User.filter({ id: impersonation.targetId });
            if (impersonatedUser.length > 0) {
              setEffectiveUser(impersonatedUser[0]);
            } else {
              setEffectiveUser(currentUser);
            }
          } else if (impersonation.role === 'consulente') {
            // Impersonificazione consulente - carica i dati completi dell'utente consulente
            const consultantUsers = await base44.entities.User.filter({ email: impersonation.targetEmail });
            if (consultantUsers.length > 0) {
              setEffectiveUser({
                ...consultantUsers[0],
                user_type: 'consulente'
              });
            } else {
              // Fallback se non c'è un record User per il consulente
              setEffectiveUser({ 
                ...currentUser, 
                email: impersonation.targetEmail,
                user_type: 'consulente',
                full_name: impersonation.targetName
              });
            }
          }
        } else {
          setEffectiveUser(currentUser);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadEffectiveUser();
  }, [impersonation.active, impersonation.targetId, impersonation.role, impersonation.targetEmail, impersonation.targetName]);

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
  
  // Verifica se l'utente effettivo è un consulente controllando l'entità Consultant
  const isConsultantByEntity = consultants.some(c => c.email?.toLowerCase() === effectiveUser?.email?.toLowerCase());
  
  // Un utente è consulente se:
  // 1. È impersonificato come consulente (impersonation.role === 'consulente')
  // 2. Il suo user_type nell'entità User è 'consulente'
  // 3. La sua email corrisponde a un record nell'entità Consultant
  const isConsultant = (impersonation.active && impersonation.role === 'consulente') || 
                       effectiveUser?.user_type === 'consulente' ||
                       isConsultantByEntity;
  
  const isMember = !isAdmin && !isConsultant;

  // Real-time subscription per notifiche e bookings
  useEffect(() => {
    if (!effectiveUser?.email) return;

    const unsubNotifications = base44.entities.Notification.subscribe((event) => {
      if (event.data?.user_email === effectiveUser.email && event.type === 'create') {
        playSound();
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    });

    const unsubBookings = base44.entities.ConsultationBooking.subscribe((event) => {
      // Se il consulente riceve una nuova richiesta, suona
      if (event.type === 'create' && isConsultant) {
        const consultantProfile = consultants.find(c => c.email === effectiveUser.email);
        if (consultantProfile && event.data?.consultant_id === consultantProfile.id) {
          playSound();
          queryClient.invalidateQueries({ queryKey: ['consultant-bookings'] });
        }
      }
      // Se l'utente riceve un aggiornamento sulla sua prenotazione (conferma, schedulazione)
      if (event.type === 'update' && isMember && event.data?.user_email === effectiveUser.email) {
        playSound();
        queryClient.invalidateQueries({ queryKey: ['consultation-bookings'] });
      }
    });

    return () => {
      unsubNotifications();
      unsubBookings();
    };
  }, [effectiveUser?.email, isConsultant, isMember, consultants, playSound, queryClient]);

  // Loading state mentre si caricano i dati
  if (!effectiveUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={effectiveUser || user} />
      
      <main className="px-4 py-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('Home')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-white text-xl font-bold">
            {isAdmin ? 'GESTIONE CONSULENZE' : isConsultant ? 'RICHIESTE DI CONSULENZA' : 'CONSULENZE'}
          </h1>
        </div>

        {isAdmin && <AdminView consultants={consultants} adminEmail={user?.email} />}
        {isConsultant && <ConsultantView user={effectiveUser} />}
        {isMember && <MemberView user={effectiveUser} consultants={consultants} isLoading={isLoading} />}
      </main>

      <BottomNav currentPage="Consulenze" unreadMessages={messages.length} />
    </div>
  );
}