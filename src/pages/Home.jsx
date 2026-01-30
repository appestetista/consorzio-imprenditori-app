import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Video, Briefcase, User, Euro, ShoppingBag, Sparkles, BookOpen, Handshake, Truck, Heart, FileSearch, Globe, Shield } from 'lucide-react';
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
import { normalizeUser, isUserConsultant, getUserPermissions } from '../components/utils/normalizeUser';
import SoundPermissionPopup from '../components/notifications/SoundPermissionPopup';

export default function Home() {
  const [user, setUser] = useState(null);
  const [effectiveUser, setEffectiveUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const { impersonation, setCurrentUserRole, appMode } = useImpersonation();
  const queryClient = useQueryClient();
  const { playSound } = useNotificationSound();
  const [showChangeResponse, setShowChangeResponse] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [lastNotificationCount, setLastNotificationCount] = useState(0);
  const navigate = useNavigate();

  // DEBUG LOG
  useEffect(() => {
    console.log('[HOME] Effective user (normalized):', {
      id: effectiveUser?.id,
      email: effectiveUser?.email,
      role: effectiveUser?.role,
      user_type: effectiveUser?.user_type,
      permissions: effectiveUser?.permissions,
      is_blocked: effectiveUser?.is_blocked
    });
  }, [effectiveUser]);

  // Redirect automatico ad AdminPanel per admin (se non in impersonation)
  useEffect(() => {
    if (!loading && effectiveUser?.role === 'admin' && !impersonation.active) {
      console.log('[HOME] Admin detected, redirecting to AdminPanel');
      navigate(createPageUrl('AdminPanel'));
    }
  }, [loading, effectiveUser?.role, impersonation.active, navigate]);

  // Assegna automaticamente il tipo utente al primo login
  // SKIP se in impersonation mode (qualsiasi tipo di impersonation)
  useEffect(() => {
    const assignType = async () => {
      // Skip se siamo in impersonation mode (utente o consulente)
      if (impersonation.active) {
        console.log('[HOME] In impersonation mode, skip assignUserType');
        return;
      }
      
      try {
        const currentUser = await base44.auth.me();
        // Skip se l'utente è admin o ha già un tipo assegnato (incluso consulente)
        // Questo è il controllo PRINCIPALE - se user_type esiste, non fare MAI redirect
        if (currentUser?.role === 'admin' || currentUser?.user_type) {
          console.log('[HOME] Utente admin o già assegnato, skip assignUserType. user_type:', currentUser?.user_type);
          return;
        }

        const result = await base44.functions.invoke('assignUserType', {});
        console.log('[HOME] assignUserType result:', result.data);

        // Se già assegnato o già registrato, non fare nulla
        if (result.data?.already_assigned || result.data?.already_registered) {
          console.log('[HOME] Utente già configurato, user_type:', result.data?.user_type);
          return;
        }

        // Se il consulente è stato autorizzato da record esistente, non fare redirect
        if (result.data?.success && result.data?.message?.includes('Consulente autorizzato')) {
          console.log('[HOME] Consulente autorizzato da record esistente');
          return;
        }

        // Se l'utente è stato bloccato, ricarica per mostrare la schermata di blocco
        if (result.data?.blocked) {
          console.log('[HOME] Utente bloccato, ricarico pagina');
          window.location.reload();
          return;
        }

        // Se l'assegnazione è andata a buon fine e NON è un consulente, reindirizza al profilo per completarlo
        // I consulenti hanno già il profilo da completare in MyProfile > Profilo Studio
        // IMPORTANTE: redirect solo se user_type è stato APPENA assegnato (success=true)
        if (result.data?.success && result.data?.user_type && result.data.user_type !== 'consulente') {
          console.log('[HOME] Tipo utente assegnato:', result.data.user_type, '- reindirizzo al profilo');
          navigate(createPageUrl('MyProfile'));
        }
      } catch (e) {
        console.log('assignUserType non disponibile o errore:', e);
      }
    };
    assignType();
  }, [impersonation.active, navigate]);

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      console.log('[HOME] loadUser - appMode:', appMode, 'previewUserId:', impersonation.previewUserId);
      try {
        const currentUser = await base44.auth.me();
        console.log('[HOME] currentUser loaded:', currentUser);

        if (!currentUser) {
          console.error('[HOME] currentUser è null/undefined');
          setEffectiveUser(null);
          setLoading(false);
          return;
        }

        setUser(currentUser);
        setCurrentUserRole(currentUser.role);

        // Se appMode === 'user-preview', carica l'utente impersonato via previewUserId
        if (appMode === 'user-preview' && impersonation.previewUserId) {
          console.log('[HOME] Loading impersonated user with ID:', impersonation.previewUserId);
          const users = await base44.entities.User.filter({ id: impersonation.previewUserId });
          console.log('[HOME] Impersonated user filter result:', { count: users.length, users });
          if (users.length > 0) {
            console.log('[HOME] Setting effectiveUser to impersonated user (normalized)');
            // Normalizza i dati utente per avere sempre la stessa struttura
            setEffectiveUser(normalizeUser(users[0]));
          } else {
            console.error('[HOME] No user found with ID:', impersonation.previewUserId);
            setEffectiveUser(null);
          }
        } else {
          console.log('[HOME] Using currentUser as effectiveUser (normalized)');
          // Normalizza anche l'utente corrente
          setEffectiveUser(normalizeUser(currentUser));
        }
      } catch (e) {
        console.error('[HOME] Error loading user:', e);
        setEffectiveUser(null);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [appMode, impersonation.previewUserId, setCurrentUserRole]);

  // Mappa tipo notifica -> chiave preferenza sezione
  const notificationTypeToSection = {
    'event': 'calendario',
    'event_response': 'calendario',
    'video': 'video_interviste',
    'message': 'contatta_membri',
    'consultation': 'consulenze',
    'cultura_aziendale': 'cultura_aziendale'
  };

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', effectiveUser?.email, effectiveUser?.notification_preferences],
    queryFn: async () => {
      const allNotifs = await base44.entities.Notification.filter({ user_email: effectiveUser?.email, is_read: false });
      // Filtra in base alle preferenze utente
      const prefs = effectiveUser?.notification_preferences || {};
      return allNotifs.filter(n => {
        const sectionKey = notificationTypeToSection[n.type];
        // Se non c'è una preferenza specifica, mostra la notifica (default true)
        if (!sectionKey) return true;
        return prefs[sectionKey] !== false;
      });
    },
    enabled: !!effectiveUser?.email,
  });

  // Messaggi non letti per la sezione Consulenze (source: 'consulenze')
  const { data: consultationMessagesCount = 0 } = useQuery({
    queryKey: ['consultation-messages-unread', effectiveUser?.email],
    queryFn: async () => {
      const received = await base44.entities.Message.filter({ 
        to_email: effectiveUser?.email, 
        source: 'consulenze',
        is_read: false 
      });
      return received.length;
    },
    enabled: !!effectiveUser?.email,
  });

  // Subscribe real-time alle notifiche
  useEffect(() => {
    if (!effectiveUser?.email) return;

    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.data?.user_email === effectiveUser.email) {
        // Suona notifica per nuove notifiche e attiva glow
        if (event.type === 'create') {
          playSound();
          setHasNewNotification(true);
        }
        // Invalida la cache per aggiornare le notifiche
        queryClient.invalidateQueries({ queryKey: ['notifications', effectiveUser.email] });
      }
    });

    return unsubscribe;
  }, [effectiveUser?.email, queryClient, playSound]);

  // Traccia quando arrivano nuove notifiche per attivare il glow
  useEffect(() => {
    if (notifications.length > lastNotificationCount && lastNotificationCount > 0) {
      setHasNewNotification(true);
    }
    setLastNotificationCount(notifications.length);
  }, [notifications.length, lastNotificationCount]);

  // Subscribe real-time ai messaggi consulenze
  useEffect(() => {
    if (!effectiveUser?.email) return;

    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create' && 
          event.data?.to_email === effectiveUser.email && 
          event.data?.source === 'consulenze') {
        playSound();
        queryClient.invalidateQueries({ queryKey: ['consultation-messages-unread', effectiveUser.email] });
      }
    });

    return unsubscribe;
  }, [effectiveUser?.email, queryClient, playSound]);

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', effectiveUser?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: effectiveUser?.email, is_read: false }),
    enabled: !!effectiveUser?.email,
  });

  // Conta notifiche sondaggi non lette (tipo cultura_aziendale per sondaggi indirizzati)
  const { data: unviewedPollsCount = 0 } = useQuery({
    queryKey: ['unviewed-polls-count', effectiveUser?.email],
    queryFn: async () => {
      const notifications = await base44.entities.Notification.filter({
        user_email: effectiveUser?.email,
        type: 'cultura_aziendale',
        is_read: false
      });
      return notifications.length;
    },
    enabled: !!effectiveUser?.email,
  });

  // Conta nuovi video non ancora visti dall'utente
  const { data: newVideosCount = 0 } = useQuery({
    queryKey: ['new-videos-count', effectiveUser?.email, effectiveUser?.last_video_view_at],
    queryFn: async () => {
      const allVideos = await base44.entities.Video.list('-created_date');
      if (!effectiveUser?.last_video_view_at) {
        // Prima visita - tutti i video sono "nuovi"
        return allVideos.length;
      }
      const lastViewed = new Date(effectiveUser.last_video_view_at);
      return allVideos.filter(v => new Date(v.created_date) > lastViewed).length;
    },
    enabled: !!effectiveUser?.email,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['upcoming-events'],
    queryFn: () => base44.entities.Event.list('-date', 1),
  });

  // Conteggio TOTALE eventi futuri (per striscia informativa - senza filtri visibilità)
  const { data: totalFutureEventsCount = 0 } = useQuery({
    queryKey: ['total-future-events-count'],
    queryFn: async () => {
      const allEvents = await base44.entities.Event.list('-date');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return allEvents.filter(e => {
        const eventDate = new Date(e.date);
        eventDate.setHours(0, 0, 0, 0);
        // Solo filtro: non passati, approvati, non cancellati
        return eventDate >= today && e.approval_status === 'approved' && !e.is_cancelled;
      }).length;
    },
  });

  // Eventi futuri VISIBILI all'utente (per logica campanella/azioni)
  const { data: allFutureEvents = [] } = useQuery({
    queryKey: ['all-future-events-home', effectiveUser?.email],
    queryFn: async () => {
      const allEvents = await base44.entities.Event.list('-date');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const userZone = effectiveUser?.zona || effectiveUser?.zone;
      const isUserType = effectiveUser?.user_type === 'utente' || effectiveUser?.role === 'user';
      const isConsultantType = effectiveUser?.user_type === 'consulente' || effectiveUser?.role === 'consulente';
      
      return allEvents.filter(e => {
        const eventDate = new Date(e.date);
        eventDate.setHours(0, 0, 0, 0);
        // Escludi eventi passati, non approvati, o cancellati/annullati
        if (eventDate < today || e.approval_status !== 'approved' || e.is_cancelled) return false;
        
        // Filtra per zona e tipo utente usando zone_visibility
        if (e.zone_visibility && e.zone_visibility.length > 0) {
          const allZonesConfig = e.zone_visibility.find(zv => zv.zone === '__all__');
          if (allZonesConfig) {
            const target = allZonesConfig.target || 'all';
            if (target === 'all') return true;
            if (target === 'users' && isUserType) return true;
            if (target === 'consultants' && isConsultantType) return true;
            return false;
          }
          
          const zoneConfig = e.zone_visibility.find(zv => zv.zone === userZone);
          if (!zoneConfig) return false;
          
          const target = zoneConfig.target || 'all';
          if (target === 'all') return true;
          if (target === 'users' && isUserType) return true;
          if (target === 'consultants' && isConsultantType) return true;
          return false;
        }
        
        // Retrocompatibilità
        if (e.visible_to_zones && e.visible_to_zones.length > 0) {
          if (!userZone || !e.visible_to_zones.includes(userZone)) return false;
        }
        
        return true;
      });
    },
    enabled: !!effectiveUser,
  });

  // Subscribe real-time agli eventi
  useEffect(() => {
    const unsubscribe = base44.entities.Event.subscribe((event) => {
      if (event.type === 'create') {
        playSound();
      }
      queryClient.invalidateQueries({ queryKey: ['all-future-events-home'] });
      queryClient.invalidateQueries({ queryKey: ['total-future-events-count'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-events'] });
      queryClient.invalidateQueries({ queryKey: ['partecipazioni-home', effectiveUser?.email] });
    });

    return unsubscribe;
  }, [queryClient, playSound, effectiveUser?.email]);

  // Subscribe real-time alle partecipazioni - quando arriva un nuovo invito, suona
  useEffect(() => {
    if (!effectiveUser?.email) return;

    const unsubscribe = base44.entities.PartecipazioniEvento.subscribe((event) => {
      if (event.type === 'create' && event.data?.user_email === effectiveUser.email) {
        playSound();
      }
      queryClient.invalidateQueries({ queryKey: ['partecipazioni-home', effectiveUser.email] });
    });

    return unsubscribe;
  }, [effectiveUser?.email, queryClient, playSound]);

  const { data: partecipazioni = [] } = useQuery({
    queryKey: ['partecipazioni-home', effectiveUser?.email],
    queryFn: () => base44.entities.PartecipazioniEvento.filter({ user_email: effectiveUser?.email }),
    enabled: !!effectiveUser?.email,
  });

  // Conta inviti a eventi senza risposta (per il badge numerico)
  const pendingEventInvites = partecipazioni.filter(p => p.stato === 'nessuna_risposta').length;

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

  // Messaggi non letti per Analisi Contratti
  const { data: contractMessagesCount = 0 } = useQuery({
    queryKey: ['contract-messages-unread', effectiveUser?.email],
    queryFn: async () => {
      const received = await base44.entities.Message.filter({ 
        to_email: effectiveUser?.email, 
        source: 'analisi_contratti',
        is_read: false 
      });
      return received.length;
    },
    enabled: !!effectiveUser?.email,
  });

  // Conta scadenze compliance entro 7 giorni (non disabilitate)
  const { data: complianceAlerts = 0 } = useQuery({
    queryKey: ['compliance-alerts', effectiveUser?.email],
    queryFn: async () => {
      const norms = await base44.entities.ComplianceNorm.filter({ user_email: effectiveUser?.email });
      const oggi = new Date();
      oggi.setHours(0, 0, 0, 0);

      return norms.filter(norm => {
        if (!norm.data_scadenza || norm.notifica_disabilitata) return false;
        const scadenza = new Date(norm.data_scadenza);
        scadenza.setHours(0, 0, 0, 0);
        const giorniMancanti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
        return giorniMancanti >= 0 && giorniMancanti <= 7;
      }).length;
    },
    enabled: !!effectiveUser?.email,
  });

  // Conta consulenze gratuite disponibili per l'utente (solo per utenti, non consulenti)
  const { data: freeConsultationsCount = 0 } = useQuery({
    queryKey: ['free-consultations-count', effectiveUser?.email],
    queryFn: async () => {
      const assignments = await base44.entities.ConsultantAssignment.filter({ 
        user_email: effectiveUser?.email,
        is_assigned: true
      });
      return assignments.reduce((sum, a) => sum + (a.available_consultations || 0), 0);
    },
    enabled: !!effectiveUser?.email && !isUserConsultant(effectiveUser),
  });

  // Conta richieste di consulenza in attesa per i consulenti
  const { data: pendingConsultationRequests = 0 } = useQuery({
    queryKey: ['pending-consultation-requests', effectiveUser?.email],
    queryFn: async () => {
      // Prima trova il profilo consulente
      const consultants = await base44.entities.Consultant.filter({ email: effectiveUser?.email });
      if (consultants.length === 0) return 0;
      const consultant = consultants[0];
      
      // Conta le richieste in stato pending o dates_proposed (non ancora confermate)
      const bookings = await base44.entities.ConsultationBooking.filter({ 
        consultant_id: consultant.id
      });
      return bookings.filter(b => ['pending', 'dates_proposed'].includes(b.status)).length;
    },
    enabled: !!effectiveUser?.email && isUserConsultant(effectiveUser),
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

  // Count notifications by type - per eventi, mostra inviti in attesa di risposta
  const eventNotifications = pendingEventInvites;
  const videoNotifications = notifications.filter(n => n.type === 'video').length;
  // Notifiche consulenze: per utenti = messaggi non letti, per consulenti = solo messaggi (le richieste vanno nella fascia in basso)
  const consultationNotifications = consultationMessagesCount;

  const nextEvent = events[0];
  // I permessi sono già normalizzati grazie a normalizeUser()
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
  // Dati già normalizzati
  const isBlocked = effectiveUser?.is_blocked && appMode !== 'user-preview' && effectiveUser?.role !== 'admin';
  const isEmailNotAuthorized = effectiveUser?.block_reason === 'email_non_autorizzata';
  const isAdmin = appMode === 'admin';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  if (!effectiveUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">⚠️</span>
          </div>
          <h1 className="text-white text-xl font-bold mb-2">Errore di caricamento</h1>
          <p className="text-slate-400 mb-4">Non è stato possibile caricare il tuo profilo.</p>
          <p className="text-slate-500 text-sm mb-4">Se hai appena effettuato la registrazione, attendi qualche secondo e riprova.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-lime-400 text-slate-900 px-6 py-2 rounded-lg font-medium"
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  if (isBlocked && isEmailNotAuthorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">📧</span>
          </div>
          <h1 className="text-white text-xl font-bold mb-3">Email non autorizzata</h1>
          <p className="text-slate-300 mb-4">
            Per accedere devi utilizzare la mail concordata con l'amministrazione del Consorzio.
          </p>
          <p className="text-slate-400 text-sm mb-6">
            Se non ricordi quale email utilizzare, chiama il:
          </p>
          <a 
            href="tel:3292005433" 
            className="inline-flex items-center gap-2 bg-lime-400 text-slate-900 px-6 py-3 rounded-lg font-bold text-lg hover:bg-lime-500 transition-colors"
          >
            📞 329 200 5433
          </a>
          <button 
            onClick={() => base44.auth.logout()}
            className="block w-full mt-4 text-slate-500 hover:text-slate-300 text-sm"
          >
            Esci e riprova con un'altra email
          </button>
        </div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🚫</span>
          </div>
          <h1 className="text-white text-xl font-bold mb-3">Accesso Bloccato</h1>
          <p className="text-slate-300 mb-4">
            Sei stato bloccato dalla direzione del consorzio.
          </p>
          <p className="text-slate-400 text-sm mb-6">
            Per ulteriori spiegazioni chiama il:
          </p>
          <a 
            href="tel:3292005433" 
            className="inline-flex items-center gap-2 bg-lime-400 text-slate-900 px-6 py-3 rounded-lg font-bold text-lg hover:bg-lime-500 transition-colors"
          >
            📞 329 200 5433
          </a>
          <button 
            onClick={() => base44.auth.logout()}
            className="block w-full mt-4 text-slate-500 hover:text-slate-300 text-sm"
          >
            Esci
          </button>
        </div>
      </div>
    );
  }

  const culturaAziendaleNotifications = notifications.filter(n => n.type === 'cultura_aziendale').length;
  const marketplaceNotifications = notifications.filter(n => n.type === 'message' && n.title?.includes('Marketplace')).length;

  // Dati già normalizzati
  const isConsultant = isUserConsultant(effectiveUser);

  const features = [
    { title: 'Calendario\nincontri', icon: Calendar, page: 'CalendarioIncontri', notifications: eventNotifications, permission: 'calendario', eventCount: totalFutureEventsCount, pendingInvites: pendingEventInvites },
    { title: 'Video\ninterviste', icon: Video, page: 'VideoInterviste', notifications: videoNotifications, permission: 'video_interviste', newVideosCount: newVideosCount },
    { title: 'Academy', icon: BookOpen, page: 'CulturaAziendale', notifications: culturaAziendaleNotifications, permission: 'cultura_aziendale' },
    { title: isConsultant ? 'Richieste di\nConsulenza' : 'Consulenze', icon: Briefcase, page: 'Consulenze', notifications: consultationNotifications, permission: 'consulenze', bottomBadge: isConsultant ? (pendingConsultationRequests > 0 ? pendingConsultationRequests : null) : (freeConsultationsCount > 0 ? freeConsultationsCount : null), bottomBadgeType: isConsultant ? 'requests' : 'consultations' },
    { title: 'Finanziamenti\nagevolati', icon: Sparkles, page: 'FinanziamentiAgevolati', notifications: isNotAdmin ? newGrantsCount : 0, permission: 'finanziamenti' },
    { title: 'Contatta\nImprenditori', icon: User, page: 'GestioneMembri', notifications: messages.length, permission: 'contatta_membri' },
    { title: 'Risparmio', icon: Euro, page: 'RisparmioEnergetico', notifications: 0, permission: 'risparmio_energetico' },
    { title: 'market place', icon: ShoppingBag, page: 'Marketplace', notifications: marketplaceNotifications, permission: 'marketplace' },
    { title: 'Consigli da\nImprenditori', icon: Handshake, page: 'Imprenditori', notifications: unviewedPollsCount, permission: 'imprenditori' },
    { title: 'Ricerca\nFornitori', icon: Truck, page: 'Fornitori', notifications: 0, permission: 'fornitori' },
    { title: 'Welfare\nAziendale', icon: Heart, page: 'WelfareAziendale', notifications: 0, permission: 'welfare_aziendale', variant: 'pink' },
    { title: 'Analisi\nContratti', icon: FileSearch, page: 'AnalisiContratti', notifications: contractMessagesCount, permission: 'analisi_contratti' },
    { title: 'Import /\nExport', icon: Globe, page: 'ImportExport', notifications: 0, permission: 'import_export' },
    { title: 'Compliance\nAziendale', icon: Shield, page: 'ComplianceAziendale', notifications: complianceAlerts, permission: 'compliance', variant: 'blue' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={effectiveUser || user} />
      
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
                                variant={feature.variant}
                                bottomBadge={feature.bottomBadge}
                                bottomBadgeType={feature.bottomBadgeType}
                                eventCount={feature.eventCount || 0}
                                pendingInvites={feature.pendingInvites || 0}
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

                          {/* Popup per abilitare notifiche sonore al primo accesso */}
                          <SoundPermissionPopup />
                        </div>
                      );
                      }