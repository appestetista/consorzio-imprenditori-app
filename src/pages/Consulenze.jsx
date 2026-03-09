import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Header from '../components/layout/Header';
import BottomNavWithMenu from '../components/layout/BottomNavWithMenu';
import MemberView from '../components/consulenze/MemberView';
import ConsultantView from '../components/consulenze/ConsultantView';
import AdminView from '../components/consulenze/AdminView';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import useNotificationSound from '../components/hooks/useNotificationSound';
import GlobalTopIcons from '../components/layout/GlobalTopIcons';


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
        console.log('[Consulenze] currentUser from auth.me():', currentUser);
        
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
          // Normalizza i dati: user_type e altri campi possono essere in data.*
          // base44.auth.me() restituisce dati con struttura diversa a seconda del contesto
          const normalizedUser = {
            ...currentUser,
            ...currentUser.data, // Flatten dei dati nested
            email: currentUser.email, // email è sempre nel root per auth.me()
            user_type: currentUser.user_type || currentUser.data?.user_type
          };
          console.log('[Consulenze] currentUser raw:', JSON.stringify(currentUser, null, 2));
          console.log('[Consulenze] normalizedUser:', normalizedUser);
          setEffectiveUser(normalizedUser);
        }
      } catch (e) {
        console.error('[Consulenze] Error loading user:', e);
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
  const effectiveEmail = effectiveUser?.email?.toLowerCase();
  const isConsultantByEntity = consultants.some(c => c.email?.toLowerCase() === effectiveEmail);
  
  // L'user_type può essere nel root o in data (struttura User entity)
  const effectiveUserType = effectiveUser?.user_type || effectiveUser?.data?.user_type;
  
  // Un utente è consulente se:
  // 1. È impersonificato come consulente (impersonation.role === 'consulente')
  // 2. Il suo user_type nell'entità User è 'consulente'
  // 3. La sua email corrisponde a un record nell'entità Consultant
  const isConsultant = (impersonation.active && impersonation.role === 'consulente') || 
                       effectiveUserType === 'consulente' ||
                       isConsultantByEntity;
  
  console.log('[Consulenze] Debug isConsultant:', {
    effectiveEmail,
    effectiveUserType,
    isConsultantByEntity,
    isConsultant,
    consultantEmails: consultants.map(c => c.email?.toLowerCase())
  });
  
  const isMember = !isAdmin && !isConsultant;

  // Segna come lette le notifiche consultation quando si apre la pagina
  useEffect(() => {
    if (!effectiveUser?.email) return;
    
    const markConsultationNotificationsAsRead = async () => {
      try {
        const unreadNotifications = await base44.entities.Notification.filter({
          user_email: effectiveUser.email,
          type: 'consultation',
          is_read: false
        });
        
        for (const notification of unreadNotifications) {
          await base44.entities.Notification.update(notification.id, { is_read: true });
        }
        
        if (unreadNotifications.length > 0) {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      } catch (e) {
        console.error('[Consulenze] Error marking notifications as read:', e);
      }
    };
    
    markConsultationNotificationsAsRead();
  }, [effectiveUser?.email, queryClient]);

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
        <p className="text-slate-400 ml-3">Caricamento utente...</p>
      </div>
    );
  }
  
  // Se sta ancora caricando i consulenti ma l'utente è già caricato, mostra loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full"></div>
        <p className="text-slate-400 ml-3">Caricamento consulenti...</p>
      </div>
    );
  }
  
  console.log('[Consulenze] Rendering view:', { isAdmin, isConsultant, isMember, effectiveUserEmail: effectiveUser?.email, consultantsCount: consultants.length });

  return (
    <div className="min-h-screen bg-slate-900 pb-64">
      <main className="px-4 py-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Esplora?tab=strumenti')} className="text-lime-400 p-3 -m-3 rounded-full back-arrow-tap">
              <ArrowLeft className="w-7 h-7" />
            </Link>
            <h1 className="text-white text-xl font-bold">
              {isAdmin ? 'GESTIONE CONSULENZE' : isConsultant ? 'RICHIESTE DI CONSULENZA' : 'CONSULENZE'}
            </h1>
          </div>
          {/* Icone gestite dal GlobalHeader */}
        </div>

        {/* Avatar 3D Consulenze */}
        <div className="flex flex-col items-center mb-6">
          <Avatar3DConsulente size={140} />
          <p className="text-slate-400 text-sm mt-2 text-center">
            {isAdmin ? 'Gestisci tutte le consulenze del consorzio' : isConsultant ? 'Visualizza e gestisci le richieste ricevute' : 'Prenota una consulenza con i nostri esperti'}
          </p>
        </div>

        {isAdmin && <AdminView consultants={consultants} adminEmail={user?.email} />}
        {isConsultant && <ConsultantView user={effectiveUser} />}
        {isMember && <MemberView user={effectiveUser} consultants={consultants} isLoading={isLoading} />}
      </main>

      <BottomNavWithMenu currentPage="Consulenze" unreadMessages={messages.length} />
    </div>
  );
}