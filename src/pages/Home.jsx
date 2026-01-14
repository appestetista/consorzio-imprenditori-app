import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Video, Briefcase, Users, Zap, ShoppingBag, Sparkles, BookOpen } from 'lucide-react';
import { createPageUrl } from '@/utils';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import FeatureCard from '../components/home/FeatureCard';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import EventInvitePopup from '../components/calendario/EventInvitePopup';

export default function Home() {
  const [user, setUser] = useState(null);
  const [effectiveUser, setEffectiveUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { impersonation, setCurrentUserRole, appMode } = useImpersonation();
  const queryClient = useQueryClient();

  // DEBUG LOG TEMPORANEO
  useEffect(() => {
    console.log('[HOME] DEBUG INFO:', {
      'auth.user.id': user?.id,
      'auth.user.role': user?.role,
      appMode,
      previewUserId: impersonation.previewUserId,
      impersonationActive: impersonation.active
    });
  }, [user, appMode, impersonation]);

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      console.log('[HOME] loadUser - appMode:', appMode, 'previewUserId:', impersonation.previewUserId);
      try {
        const currentUser = await base44.auth.me();
        console.log('[HOME] currentUser loaded:', { id: currentUser.id, role: currentUser.role });
        setUser(currentUser);
        setCurrentUserRole(currentUser.role);
        
        // Se appMode === 'user-preview', carica l'utente impersonato via previewUserId
        if (appMode === 'user-preview' && impersonation.previewUserId) {
          console.log('[HOME] Loading impersonated user with ID:', impersonation.previewUserId);
          const users = await base44.entities.User.filter({ id: impersonation.previewUserId });
          console.log('[HOME] Impersonated user filter result:', { count: users.length, users });
          if (users.length > 0) {
            console.log('[HOME] Setting effectiveUser to impersonated user');
            setEffectiveUser(users[0]);
          } else {
            console.error('[HOME] No user found with ID:', impersonation.previewUserId);
            setEffectiveUser(null);
          }
        } else {
          console.log('[HOME] Using currentUser as effectiveUser');
          setEffectiveUser(currentUser);
        }
      } catch (e) {
        console.error('[HOME] Error loading user:', e);
        setEffectiveUser(null);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [appMode, impersonation.previewUserId]);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', effectiveUser?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: effectiveUser?.email, is_read: false }),
    enabled: !!effectiveUser?.email,
  });

  // Subscribe real-time alle notifiche
  useEffect(() => {
    if (!effectiveUser?.email) return;
    
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.data?.user_email === effectiveUser.email) {
        // Invalida la cache per aggiornare le notifiche
        queryClient.invalidateQueries({ queryKey: ['notifications', effectiveUser.email] });
      }
    });

    return unsubscribe;
  }, [effectiveUser?.email, queryClient]);

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', effectiveUser?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: effectiveUser?.email, is_read: false }),
    enabled: !!effectiveUser?.email,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['upcoming-events'],
    queryFn: () => base44.entities.Event.list('-date', 1),
  });

  // Count notifications by type
  const eventNotifications = notifications.filter(n => n.type === 'event').length;
  const videoNotifications = notifications.filter(n => n.type === 'video').length;
  const consultationNotifications = notifications.filter(n => n.type === 'consultation').length;

  const nextEvent = events[0];
  const permissions = effectiveUser?.permissions || {};
  const isBlocked = effectiveUser?.is_blocked && appMode !== 'user-preview' && effectiveUser?.role !== 'admin';
  const isAdmin = appMode === 'admin';

  if (loading || !effectiveUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🚫</span>
          </div>
          <h1 className="text-white text-xl font-bold mb-2">Accesso Bloccato</h1>
          <p className="text-slate-400">Il tuo account è stato sospeso. Contatta la direzione per maggiori informazioni.</p>
        </div>
      </div>
    );
  }

  const culturaAziendaleNotifications = notifications.filter(n => n.type === 'cultura_aziendale').length;

  const isConsultant = effectiveUser?.role === 'consulente';

  const features = [
    { title: 'Calendario\nincontri', icon: Calendar, page: 'CalendarioIncontri', notifications: eventNotifications, permission: 'calendario' },
    { title: 'Video\ninterviste', icon: Video, page: 'VideoInterviste', notifications: videoNotifications, permission: 'video_interviste' },
    { title: 'Academy', icon: BookOpen, page: 'CulturaAziendale', notifications: culturaAziendaleNotifications, permission: 'cultura_aziendale' },
    { title: isConsultant ? 'Richieste di\nConsulenza' : 'Consulenze', icon: Briefcase, page: 'Consulenze', notifications: consultationNotifications, permission: 'consulenze' },
    { title: 'Finanziamenti\nagevolati', icon: Sparkles, page: 'FinanziamentiAgevolati', notifications: 0, permission: 'finanziamenti' },
    { title: 'Utenti', icon: Users, page: 'GestioneMembri', notifications: 0, permission: 'contatta_membri' },
    { title: 'Risparmio\nenergetico', icon: Zap, page: 'RisparmioEnergetico', notifications: 0, permission: 'risparmio_energetico' },
    { title: 'market place', icon: ShoppingBag, page: 'Marketplace', notifications: 0, permission: 'marketplace' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={effectiveUser || user} totalNotifications={notifications.length} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        {/* Welcome Banner */}
        <div className="bg-lime-400 rounded-xl p-4 mb-6">
          <h2 className="text-slate-900 font-bold text-lg mb-1">Benvenuto nel Consorzio</h2>
          {nextEvent && (
            <p className="text-slate-800 text-sm">
              Prossimo incontro: {new Date(nextEvent.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })} ore {nextEvent.time} - {nextEvent.location}
            </p>
          )}
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {features.map((feature) => (
            <FeatureCard
              key={feature.page}
              title={feature.title}
              icon={feature.icon}
              pageName={feature.page}
              notificationCount={feature.notifications}
              disabled={permissions[feature.permission] === false}
            />
          ))}
        </div>
      </main>

      <BottomNav currentPage="Home" unreadMessages={messages.length} />

      {/* Popup invito evento - si mostra solo se ci sono inviti in attesa */}
      <EventInvitePopup user={effectiveUser} />
    </div>
  );
}