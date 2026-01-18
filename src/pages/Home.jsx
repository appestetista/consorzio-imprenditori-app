import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Video, Briefcase, Users, Zap, ShoppingBag, Sparkles, BookOpen } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import FeatureCard from '../components/home/FeatureCard';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import EventInvitePopup from '../components/calendario/EventInvitePopup';
import useNotificationSound from '../components/hooks/useNotificationSound';
import ChangeResponsePopup from '@/components/calendario/ChangeResponsePopup';
import ProfileCompletionModal from '@/components/profile/ProfileCompletionModal';

export default function Home() {
  const [user, setUser] = useState(null);
  const [effectiveUser, setEffectiveUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const { impersonation, setCurrentUserRole, appMode } = useImpersonation();
  const queryClient = useQueryClient();
  const { playSound } = useNotificationSound();
  const [showChangeResponse, setShowChangeResponse] = useState(false);
  const navigate = useNavigate();

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
  }, [appMode, impersonation.previewUserId, navigate]);

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
            // Suona notifica per nuove notifiche
            if (event.type === 'create') {
              playSound();
            }
            // Invalida la cache per aggiornare le notifiche
            queryClient.invalidateQueries({ queryKey: ['notifications', effectiveUser.email] });
          }
        });

        return unsubscribe;
      }, [effectiveUser?.email, queryClient, playSound]);

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', effectiveUser?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: effectiveUser?.email, is_read: false }),
    enabled: !!effectiveUser?.email,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['upcoming-events'],
    queryFn: () => base44.entities.Event.list('-date', 1),
  });

  const { data: partecipazioni = [] } = useQuery({
    queryKey: ['partecipazioni-home', effectiveUser?.email],
    queryFn: () => base44.entities.PartecipazioniEvento.filter({ user_email: effectiveUser?.email }),
    enabled: !!effectiveUser?.email,
  });

  // Per utenti/consulenti: conta nuovi bandi dalla loro ultima visita
  // In impersonation, usa il ruolo impersonato, non quello reale
  const effectiveRole = impersonation.active ? impersonation.role : effectiveUser?.role;
  const isNotAdmin = effectiveRole !== 'admin';

  const { data: userGrantView, refetch: refetchGrantView } = useQuery({
    queryKey: ['user-grant-view', effectiveUser?.email],
    queryFn: async () => {
      const views = await base44.entities.UserGrantView.filter({ user_email: effectiveUser?.email });
      return views[0] || null;
    },
    enabled: !!effectiveUser?.email && isNotAdmin,
  });

  const { data: newGrantsCount = 0 } = useQuery({
    queryKey: ['new-grants-count', effectiveUser?.email, userGrantView?.last_viewed_at],
    queryFn: async () => {
      // Recupera tutti i bandi non scaduti
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const allGrants = await base44.entities.FinancialGrant.list('-created_date');
      const validGrants = allGrants.filter(grant => {
        if (grant.deadline) {
          const deadlineDate = new Date(grant.deadline);
          deadlineDate.setHours(0, 0, 0, 0);
          return deadlineDate >= today;
        }
        return true;
      });

      // Filtra per profilo utente
      const matchesProfile = (grant) => {
        if (grant.eligible_company_sizes?.length > 0 && effectiveUser?.company_size) {
          if (!grant.eligible_company_sizes.includes(effectiveUser.company_size)) return false;
        }
        if (grant.eligible_regions?.length > 0) {
          const userRegions = effectiveUser?.interested_regions || (effectiveUser?.region ? [effectiveUser.region] : []);
          if (userRegions.length > 0 && !grant.eligible_regions.some(r => userRegions.includes(r))) return false;
        }
        if (grant.eligible_ateco_codes?.length > 0 && effectiveUser?.ateco_code) {
          if (!grant.eligible_ateco_codes.some(code => 
            effectiveUser.ateco_code.startsWith(code) || code.startsWith(effectiveUser.ateco_code.substring(0, 2))
          )) return false;
        }
        if (grant.eligible_legal_forms?.length > 0 && effectiveUser?.legal_form) {
          if (!grant.eligible_legal_forms.includes(effectiveUser.legal_form)) return false;
        }
        return true;
      };

      const compatibleGrants = validGrants.filter(matchesProfile);

      if (!userGrantView?.last_viewed_at) {
        // Prima visita - mostra tutti i bandi compatibili come nuovi
        return compatibleGrants.length;
      }
      const lastViewed = new Date(userGrantView.last_viewed_at);
      return compatibleGrants.filter(g => new Date(g.created_date) > lastViewed).length;
    },
    enabled: !!effectiveUser?.email && isNotAdmin,
  });

  // Count notifications by type - per eventi, mostra solo se non ha ancora risposto
      const eventNotifications = notifications.filter(n => {
        if (n.type !== 'event') return false;
        // Verifica se l'utente ha già risposto a questo evento
        const partecipazione = partecipazioni.find(p => p.evento_id === n.reference_id);
        if (partecipazione && (partecipazione.stato === 'confermato' || partecipazione.stato === 'non_confermato')) {
          return false; // Ha già risposto, non mostrare notifica
        }
        return true;
      }).length;
  const videoNotifications = notifications.filter(n => n.type === 'video').length;
  const consultationNotifications = notifications.filter(n => n.type === 'consultation').length;

  const nextEvent = events[0];
  const permissions = effectiveUser?.permissions || {};

  // Verifica stato partecipazione all'evento
  const getUserEventResponse = () => {
    if (!nextEvent || !effectiveUser?.email) return null;
    const partecipazione = partecipazioni.find(p => p.evento_id === nextEvent.id);
    if (!partecipazione) return null;
    if (partecipazione.stato === 'confermato') return 'accepted';
    if (partecipazione.stato === 'non_confermato') return 'declined';
    return null;
  };
  const eventResponse = getUserEventResponse();
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
    { title: 'Finanziamenti\nagevolati', icon: Sparkles, page: 'FinanziamentiAgevolati', notifications: isNotAdmin ? newGrantsCount : 0, permission: 'finanziamenti' },
    { title: 'Utenti', icon: Users, page: 'GestioneMembri', notifications: 0, permission: 'contatta_membri' },
    { title: 'Risparmio', icon: Zap, page: 'RisparmioEnergetico', notifications: 0, permission: 'risparmio_energetico' },
    { title: 'market place', icon: ShoppingBag, page: 'Marketplace', notifications: 0, permission: 'marketplace' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={effectiveUser || user} totalNotifications={notifications.length} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        {/* Welcome Banner */}
                  {eventResponse === 'accepted' ? (
                    <div className="bg-green-700 rounded-xl p-4 mb-6">
                      <h2 className="text-white font-bold text-lg mb-1">✓ Hai scelto di partecipare</h2>
                      {nextEvent && (
                        <p className="text-green-100 text-sm">
                          Incontro "{nextEvent.title}" del {new Date(nextEvent.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })} ore {nextEvent.time} - {nextEvent.location}
                        </p>
                      )}
                      <button 
                        onClick={() => setShowChangeResponse(true)}
                        className="text-white text-sm underline mt-2 inline-block hover:text-green-200"
                      >
                        Hai cambiato idea?
                      </button>
                    </div>
                  ) : eventResponse === 'declined' ? (
                    <div className="bg-red-700 rounded-xl p-4 mb-6">
                      <h2 className="text-white font-bold text-lg mb-1">✗ Hai scelto di non partecipare</h2>
                      {nextEvent && (
                        <p className="text-red-100 text-sm">
                          Incontro "{nextEvent.title}" del {new Date(nextEvent.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })} ore {nextEvent.time} - {nextEvent.location}
                        </p>
                      )}
                      <button 
                        onClick={() => setShowChangeResponse(true)}
                        className="text-white text-sm underline mt-2 inline-block hover:text-red-200"
                      >
                        Hai cambiato idea?
                      </button>
                    </div>
                  ) : (
          <div className="bg-lime-400 rounded-xl p-4 mb-6">
            <h2 className="text-slate-900 font-bold text-lg mb-1">Benvenuto nel Consorzio</h2>
            {nextEvent && (
              <p className="text-slate-800 text-sm">
                Prossimo incontro: {new Date(nextEvent.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })} ore {nextEvent.time} - {nextEvent.location}
              </p>
            )}
          </div>
        )}

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

              {/* Popup cambio risposta */}
              {showChangeResponse && nextEvent && (
                            <ChangeResponsePopup 
                              event={nextEvent}
                              user={effectiveUser}
                              onClose={() => setShowChangeResponse(false)}
                            />
                          )}

                  {/* Modal obbligatorio per completare il profilo */}
                  <ProfileCompletionModal 
                    user={effectiveUser} 
                    onProfileComplete={() => window.location.reload()}
                  />
                </div>
              );
              }