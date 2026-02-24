// Questa è la vecchia Home, rinominata Esplora
// Il contenuto originale viene importato e re-esportato
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Video, Briefcase, User, Euro, ShoppingBag, BookOpen, Handshake, Truck, Heart, FileSearch, Globe, Shield, PiggyBank, Gavel, Gift, QrCode, ScanLine, Star, Calculator, Users, ArrowLeft } from 'lucide-react';
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

export default function Esplora() {
  const [user, setUser] = useState(null);
  const [effectiveUser, setEffectiveUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { impersonation, setCurrentUserRole, appMode } = useImpersonation();
  const queryClient = useQueryClient();
  const { playSound } = useNotificationSound();
  const [showChangeResponse, setShowChangeResponse] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [lastNotificationCount, setLastNotificationCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      try {
        const currentUser = await base44.auth.me();
        if (!currentUser) {
          setEffectiveUser(null);
          setLoading(false);
          return;
        }
        setUser(currentUser);
        setCurrentUserRole(currentUser.role);

        if (appMode === 'user-preview' && impersonation.previewUserId) {
          const users = await base44.entities.User.filter({ id: impersonation.previewUserId });
          if (users.length > 0) {
            setEffectiveUser(normalizeUser(users[0]));
          } else {
            setEffectiveUser(null);
          }
        } else {
          setEffectiveUser(normalizeUser(currentUser));
        }
      } catch (e) {
        setEffectiveUser(null);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [appMode, impersonation.previewUserId, setCurrentUserRole]);

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
      const prefs = effectiveUser?.notification_preferences || {};
      return allNotifs.filter(n => {
        const sectionKey = notificationTypeToSection[n.type];
        if (!sectionKey) return true;
        return prefs[sectionKey] !== false;
      });
    },
    enabled: !!effectiveUser?.email,
  });

  const { data: consultationMessagesCount = 0 } = useQuery({
    queryKey: ['consultation-messages-unread', effectiveUser?.email],
    queryFn: async () => {
      const received = await base44.entities.Message.filter({ to_email: effectiveUser?.email, source: 'consulenze', is_read: false });
      return received.length;
    },
    enabled: !!effectiveUser?.email,
  });

  useEffect(() => {
    if (!effectiveUser?.email) return;
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.data?.user_email === effectiveUser.email) {
        if (event.type === 'create') { playSound(); setHasNewNotification(true); }
        queryClient.invalidateQueries({ queryKey: ['notifications', effectiveUser.email] });
      }
    });
    return unsubscribe;
  }, [effectiveUser?.email, queryClient, playSound]);

  useEffect(() => {
    if (notifications.length > lastNotificationCount && lastNotificationCount > 0) setHasNewNotification(true);
    setLastNotificationCount(notifications.length);
  }, [notifications.length, lastNotificationCount]);

  useEffect(() => {
    if (!effectiveUser?.email) return;
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create' && event.data?.to_email === effectiveUser.email && event.data?.source === 'consulenze') {
        playSound();
        queryClient.invalidateQueries({ queryKey: ['consultation-messages-unread', effectiveUser.email] });
      }
    });
    return unsubscribe;
  }, [effectiveUser?.email, queryClient, playSound]);

  useEffect(() => {
    if (!effectiveUser?.email) return;
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create' && event.data?.to_email === effectiveUser.email && event.data?.source === 'analisi_contratti') {
        playSound();
        queryClient.invalidateQueries({ queryKey: ['contract-messages-unread', effectiveUser.email] });
      }
    });
    return unsubscribe;
  }, [effectiveUser?.email, queryClient, playSound]);

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', effectiveUser?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: effectiveUser?.email, is_read: false }),
    enabled: !!effectiveUser?.email,
  });

  const { data: unviewedPollsCount = 0 } = useQuery({
    queryKey: ['unviewed-polls-count', effectiveUser?.email],
    queryFn: async () => {
      const n = await base44.entities.Notification.filter({ user_email: effectiveUser?.email, type: 'cultura_aziendale', is_read: false });
      return n.length;
    },
    enabled: !!effectiveUser?.email,
  });

  const { data: videosData = { newCount: 0, totalCount: 0, hasVisited: false, latestVideoDate: null } } = useQuery({
    queryKey: ['videos-data', effectiveUser?.email, effectiveUser?.last_video_view_at],
    queryFn: async () => {
      const allVideos = await base44.entities.Video.list('-created_date');
      const totalCount = allVideos.length;
      const latestVideoDate = allVideos[0]?.created_date || null;
      const lastViewAt = effectiveUser?.last_video_view_at || effectiveUser?._originalData?.last_video_view_at;
      const hasVisitedReal = !!lastViewAt;
      if (!hasVisitedReal) return { newCount: totalCount, totalCount, hasVisited: false, latestVideoDate };
      const lastViewedTs = new Date(lastViewAt).getTime();
      let newCount = 0;
      allVideos.forEach(v => {
        let dateStr = v.created_date;
        if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.includes('+')) dateStr = dateStr + 'Z';
        if (new Date(dateStr).getTime() > lastViewedTs) newCount++;
      });
      return { newCount, totalCount, hasVisited: true, latestVideoDate };
    },
    enabled: !!effectiveUser?.email,
    refetchInterval: 30000,
  });

  const { data: events = [] } = useQuery({ queryKey: ['upcoming-events'], queryFn: () => base44.entities.Event.list('-date', 1) });

  const { data: totalFutureEventsCount = 0 } = useQuery({
    queryKey: ['total-future-events-count'],
    queryFn: async () => {
      const allEvents = await base44.entities.Event.list('-date');
      const today = new Date(); today.setHours(0,0,0,0);
      return allEvents.filter(e => { const d = new Date(e.date); d.setHours(0,0,0,0); return d >= today && e.approval_status === 'approved' && !e.is_cancelled; }).length;
    },
  });

  const { data: allFutureEvents = [] } = useQuery({
    queryKey: ['all-future-events-home', effectiveUser?.email],
    queryFn: async () => {
      const allEvents = await base44.entities.Event.list('-date');
      const today = new Date(); today.setHours(0,0,0,0);
      const userZone = effectiveUser?.zona || effectiveUser?.zone;
      const isUserType = effectiveUser?.user_type === 'utente' || effectiveUser?.role === 'user';
      const isConsultantType = effectiveUser?.user_type === 'consulente' || effectiveUser?.role === 'consulente';
      return allEvents.filter(e => {
        const eventDate = new Date(e.date); eventDate.setHours(0,0,0,0);
        if (eventDate < today || e.approval_status !== 'approved' || e.is_cancelled) return false;
        if (e.zone_visibility && e.zone_visibility.length > 0) {
          const allZonesConfig = e.zone_visibility.find(zv => zv.zone === '__all__');
          if (allZonesConfig) { const target = allZonesConfig.target || 'all'; if (target === 'all') return true; if (target === 'users' && isUserType) return true; if (target === 'consultants' && isConsultantType) return true; return false; }
          const zoneConfig = e.zone_visibility.find(zv => zv.zone === userZone);
          if (!zoneConfig) return false;
          const target = zoneConfig.target || 'all'; if (target === 'all') return true; if (target === 'users' && isUserType) return true; if (target === 'consultants' && isConsultantType) return true; return false;
        }
        if (e.visible_to_zones && e.visible_to_zones.length > 0) { if (!userZone || !e.visible_to_zones.includes(userZone)) return false; }
        return true;
      });
    },
    enabled: !!effectiveUser,
  });

  useEffect(() => {
    const unsubscribe = base44.entities.Event.subscribe((event) => {
      if (event.type === 'create') playSound();
      queryClient.invalidateQueries({ queryKey: ['all-future-events-home'] });
      queryClient.invalidateQueries({ queryKey: ['total-future-events-count'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-events'] });
      queryClient.invalidateQueries({ queryKey: ['partecipazioni-home', effectiveUser?.email] });
    });
    return unsubscribe;
  }, [queryClient, playSound, effectiveUser?.email]);

  useEffect(() => {
    const unsubscribe = base44.entities.Video.subscribe((event) => {
      if (event.type === 'create') playSound();
      queryClient.invalidateQueries({ queryKey: ['videos-data'] });
    });
    return unsubscribe;
  }, [queryClient, playSound]);

  useEffect(() => {
    if (!effectiveUser?.email) return;
    const unsubscribe = base44.entities.PartecipazioniEvento.subscribe((event) => {
      if (event.type === 'create' && event.data?.user_email === effectiveUser.email) playSound();
      queryClient.invalidateQueries({ queryKey: ['partecipazioni-home', effectiveUser.email] });
    });
    return unsubscribe;
  }, [effectiveUser?.email, queryClient, playSound]);

  const { data: partecipazioni = [] } = useQuery({
    queryKey: ['partecipazioni-home', effectiveUser?.email],
    queryFn: () => base44.entities.PartecipazioniEvento.filter({ user_email: effectiveUser?.email }),
    enabled: !!effectiveUser?.email,
  });

  const pendingEventInvites = partecipazioni.filter(p => p.stato === 'nessuna_risposta').length;
  const effectiveRole = impersonation.active ? impersonation.role : effectiveUser?.role;
  const isNotAdmin = effectiveRole !== 'admin';

  const { data: userGrantView } = useQuery({
    queryKey: ['user-grant-view', effectiveUser?.email],
    queryFn: async () => { const views = await base44.entities.UserGrantView.filter({ user_email: effectiveUser?.email }); return views[0] || null; },
    enabled: !!effectiveUser?.email && isNotAdmin,
  });

  const { data: contractMessagesCount = 0 } = useQuery({
    queryKey: ['contract-messages-unread', effectiveUser?.email],
    queryFn: async () => { const r = await base44.entities.Message.filter({ to_email: effectiveUser?.email, source: 'analisi_contratti', is_read: false }); return r.length; },
    enabled: !!effectiveUser?.email,
  });

  const getCurrentMonthYear = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; };
  const { data: contractUsageData = { count: 0, limit: 5 } } = useQuery({
    queryKey: ['contract-usage-home', effectiveUser?.email, getCurrentMonthYear()],
    queryFn: async () => { const logs = await base44.entities.UsageLog.filter({ user_email: effectiveUser?.email, action_type: 'contract_analysis', month_year: getCurrentMonthYear() }); return { count: logs.length, limit: 5 }; },
    enabled: !!effectiveUser?.email,
  });

  const { data: complianceAlerts = 0 } = useQuery({
    queryKey: ['compliance-alerts', effectiveUser?.email],
    queryFn: async () => {
      const norms = await base44.entities.ComplianceNorm.filter({ user_email: effectiveUser?.email });
      const oggi = new Date(); oggi.setHours(0,0,0,0);
      return norms.filter(norm => { if (!norm.data_scadenza || norm.notifica_disabilitata) return false; const s = new Date(norm.data_scadenza); s.setHours(0,0,0,0); const g = Math.ceil((s-oggi)/(1000*60*60*24)); return g >= 0 && g <= 7; }).length;
    },
    enabled: !!effectiveUser?.email,
  });

  const { data: freeConsultationsCount = 0 } = useQuery({
    queryKey: ['free-consultations-count', effectiveUser?.email],
    queryFn: async () => { const a = await base44.entities.ConsultantAssignment.filter({ user_email: effectiveUser?.email, is_assigned: true }); return a.reduce((s, x) => s + (x.available_consultations || 0), 0); },
    enabled: !!effectiveUser?.email && !isUserConsultant(effectiveUser),
  });

  const { data: vantaggiNotificationsCount = 0 } = useQuery({
    queryKey: ['vantaggi-notifications', effectiveUser?.email],
    queryFn: async () => { const n = await base44.entities.Notification.filter({ user_email: effectiveUser?.email, is_read: false }); return n.filter(x => x.title?.toLowerCase().includes('vantaggio') || x.content?.toLowerCase().includes('vantaggio')).length; },
    enabled: !!effectiveUser?.email,
  });

  const { data: pendingConsultationRequests = 0 } = useQuery({
    queryKey: ['pending-consultation-requests', effectiveUser?.email],
    queryFn: async () => {
      const consultants = await base44.entities.Consultant.filter({ email: effectiveUser?.email });
      if (consultants.length === 0) return 0;
      const bookings = await base44.entities.ConsultationBooking.filter({ consultant_id: consultants[0].id });
      return bookings.filter(b => ['pending', 'dates_proposed'].includes(b.status)).length;
    },
    enabled: !!effectiveUser?.email && isUserConsultant(effectiveUser),
  });

  const { data: newGrantsCount = 0 } = useQuery({
    queryKey: ['new-grants-count', effectiveUser?.email, userGrantView?.last_viewed_at],
    queryFn: async () => {
      const today = new Date(); today.setHours(0,0,0,0);
      const allGrants = await base44.entities.FinancialGrant.list('-created_date');
      const validGrants = allGrants.filter(g => { if (g.deadline) { const d = new Date(g.deadline); d.setHours(0,0,0,0); return d >= today; } return true; });
      const matchesProfile = (grant) => {
        if (grant.eligible_company_sizes?.length > 0 && effectiveUser?.company_size) { if (!grant.eligible_company_sizes.includes(effectiveUser.company_size)) return false; }
        if (grant.eligible_regions?.length > 0) { const ur = effectiveUser?.interested_regions || (effectiveUser?.region ? [effectiveUser.region] : []); if (ur.length > 0 && !grant.eligible_regions.some(r => ur.includes(r))) return false; }
        if (grant.eligible_ateco_codes?.length > 0 && effectiveUser?.ateco_code) { if (!grant.eligible_ateco_codes.some(c => effectiveUser.ateco_code.startsWith(c) || c.startsWith(effectiveUser.ateco_code.substring(0,2)))) return false; }
        if (grant.eligible_legal_forms?.length > 0 && effectiveUser?.legal_form) { if (!grant.eligible_legal_forms.includes(effectiveUser.legal_form)) return false; }
        return true;
      };
      const compatible = validGrants.filter(matchesProfile);
      if (!userGrantView?.last_viewed_at) return compatible.length;
      const lastViewed = new Date(userGrantView.last_viewed_at);
      return compatible.filter(g => new Date(g.created_date) > lastViewed).length;
    },
    enabled: !!effectiveUser?.email && isNotAdmin,
  });

  const eventNotifications = pendingEventInvites;
  const videoNotifications = notifications.filter(n => n.type === 'video').length;
  const consultationNotifications = consultationMessagesCount;
  const nextEvent = events[0];
  const permissions = effectiveUser?.permissions || {};

  const getUserEventResponse = () => {
    if (!nextEvent || !effectiveUser?.email) return null;
    const p = partecipazioni.find(p => p.evento_id === nextEvent.id);
    if (!p) return null;
    if (p.stato === 'confermato') return 'accepted';
    if (p.stato === 'non_confermato') return 'declined';
    return null;
  };
  const eventResponse = getUserEventResponse();
  const isBlocked = effectiveUser?.is_blocked && appMode !== 'user-preview' && effectiveUser?.role !== 'admin';
  const isEmailNotAuthorized = effectiveUser?.block_reason === 'email_non_autorizzata';
  const isConsultant = isUserConsultant(effectiveUser);

  const urlParams = new URLSearchParams(window.location.search);
  const activeTab = urlParams.get('tab');

  const scrollRestoredRef = useRef(false);
  useLayoutEffect(() => {
    if (loading || scrollRestoredRef.current) return;
    try { const s = sessionStorage.getItem('esplora_scroll_y'); if (s) { sessionStorage.removeItem('esplora_scroll_y'); scrollRestoredRef.current = true; window.scrollTo(0, parseInt(s, 10)); } } catch {}
  }, [loading]);

  if (loading) {
    return (<div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-400"></div></div>);
  }

  if (!effectiveUser) {
    return (<div className="min-h-screen bg-slate-900 flex items-center justify-center p-4"><div className="text-center"><div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-4xl">⚠️</span></div><h1 className="text-white text-xl font-bold mb-2">Errore di caricamento</h1><p className="text-slate-400 mb-4">Non è stato possibile caricare il tuo profilo.</p><button onClick={() => window.location.reload()} className="bg-lime-400 text-slate-900 px-6 py-2 rounded-lg font-medium">Riprova</button></div></div>);
  }

  if (isBlocked && isEmailNotAuthorized) {
    return (<div className="min-h-screen bg-slate-900 flex items-center justify-center p-4"><div className="text-center max-w-md"><div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-4xl">📧</span></div><h1 className="text-white text-xl font-bold mb-3">Email non autorizzata</h1><p className="text-slate-300 mb-4">Per accedere devi utilizzare la mail concordata con l'amministrazione del Consorzio.</p><p className="text-slate-400 text-sm mb-6">Se non ricordi quale email utilizzare, chiama il:</p><a href="tel:3292005433" className="inline-flex items-center gap-2 bg-lime-400 text-slate-900 px-6 py-3 rounded-lg font-bold text-lg hover:bg-lime-500 transition-colors">📞 329 200 5433</a><button onClick={() => base44.auth.logout()} className="block w-full mt-4 text-slate-500 hover:text-slate-300 text-sm">Esci e riprova con un'altra email</button></div></div>);
  }

  if (isBlocked) {
    return (<div className="min-h-screen bg-slate-900 flex items-center justify-center p-4"><div className="text-center max-w-md"><div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-4xl">🚫</span></div><h1 className="text-white text-xl font-bold mb-3">Accesso Bloccato</h1><p className="text-slate-300 mb-4">Sei stato bloccato dalla direzione del consorzio.</p><p className="text-slate-400 text-sm mb-6">Per ulteriori spiegazioni chiama il:</p><a href="tel:3292005433" className="inline-flex items-center gap-2 bg-lime-400 text-slate-900 px-6 py-3 rounded-lg font-bold text-lg hover:bg-lime-500 transition-colors">📞 329 200 5433</a><button onClick={() => base44.auth.logout()} className="block w-full mt-4 text-slate-500 hover:text-slate-300 text-sm">Esci</button></div></div>);
  }

  const culturaAziendaleNotifications = notifications.filter(n => n.type === 'cultura_aziendale').length;
  const marketplaceNotifications = notifications.filter(n => n.type === 'message' && n.title?.includes('Marketplace')).length;

  const features = [
    { title: 'Calendario\nincontri', icon: Calendar, page: 'CalendarioIncontri', notifications: eventNotifications, permission: 'calendario', eventCount: totalFutureEventsCount, pendingInvites: pendingEventInvites, category: 'relazioni' },
    { title: 'Contatta\nImprenditori', icon: User, page: 'GestioneMembri', notifications: messages.length, permission: 'contatta_membri', category: 'relazioni' },
    { title: 'Consigli da\nImprenditori', icon: Handshake, page: 'Imprenditori', notifications: unviewedPollsCount, permission: 'imprenditori', category: 'relazioni' },
    { title: 'Academy', icon: BookOpen, page: 'CulturaAziendale', notifications: culturaAziendaleNotifications, permission: 'cultura_aziendale', category: 'relazioni' },
    { title: 'Video\ninterviste', icon: Video, page: 'VideoInterviste', notifications: videoNotifications, permission: 'video_interviste', newVideosCount: videosData.newCount, totalVideosCount: videosData.totalCount, hasVisitedVideos: videosData.hasVisited, latestVideoDate: videosData.latestVideoDate, category: 'relazioni' },
    { title: 'Video\nRecensioni', icon: Star, page: 'VideoRecensioni', notifications: 0, permission: 'video_interviste', category: 'relazioni' },
    { title: 'Analisi Contratti', icon: FileSearch, page: 'AnalisiContratti', notifications: contractMessagesCount, permission: 'analisi_contratti', category: 'strumenti', contractUsage: contractUsageData },
    { title: 'Ricerca\nFornitori', icon: Truck, page: 'Fornitori', notifications: 0, permission: 'fornitori', category: 'strumenti' },
    { title: 'Market Place', icon: ShoppingBag, page: 'Marketplace', notifications: marketplaceNotifications, permission: 'marketplace', category: 'strumenti' },
    { title: 'Evita\nSanzioni', icon: Shield, page: 'ComplianceAziendale', notifications: complianceAlerts, permission: 'compliance', variant: 'blue', category: 'strumenti' },
    { title: 'Benefit\nDipendenti', icon: Heart, page: 'WelfareAziendale', notifications: 0, permission: 'welfare_aziendale', variant: 'pink', category: 'strumenti' },
    { title: 'Simulatore\nFiscale', icon: Calculator, page: 'SimulatoreFiscale', notifications: 0, permission: 'simulatore_fiscale', category: 'strumenti' },
    { title: 'Costo del\nPersonale', icon: Users, page: 'SimulatoreCostoPersonale', notifications: 0, permission: 'simulatore_fiscale', category: 'strumenti' },
    { title: isConsultant ? 'Richieste di\nConsulenza' : 'Consulenze', icon: Briefcase, page: 'Consulenze', notifications: consultationNotifications, permission: 'consulenze', bottomBadge: isConsultant ? (pendingConsultationRequests > 0 ? pendingConsultationRequests : null) : (freeConsultationsCount > 0 ? freeConsultationsCount : null), bottomBadgeType: isConsultant ? 'requests' : 'consultations', category: 'consulenza' },
    { title: 'Import /\nExport', icon: Globe, page: 'ImportExport', notifications: 0, permission: 'import_export', category: 'consulenza' },
    { title: 'Risparmio', icon: PiggyBank, page: 'RisparmioEnergetico', notifications: 0, permission: 'risparmio_energetico', category: 'consulenza' },
    { title: 'Bandi', icon: Euro, page: 'FinanziamentiAgevolati', notifications: isNotAdmin ? newGrantsCount : 0, permission: 'finanziamenti', category: 'consulenza' },
    { title: 'Aste\nImmobiliari', icon: Gavel, page: 'AsteImmobiliari', notifications: 0, permission: 'aste_immobiliari', category: 'investimenti' },
    { title: 'Vantaggi\nIscritti', icon: Gift, page: 'VantaggiIscritti', notifications: vantaggiNotificationsCount, permission: 'vantaggi_iscritti', category: 'relazioni', variant: 'gold' },
  ];

  const filteredFeatures = activeTab ? features.filter(f => f.category === activeTab) : features;

  const renderFeatureCard = (feature) => (
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
      newVideosCount={feature.newVideosCount || 0}
      totalVideosCount={feature.totalVideosCount || 0}
      hasVisitedVideos={feature.hasVisitedVideos || false}
      latestVideoDate={feature.latestVideoDate || null}
      consulenzeMessagesCount={feature.page === 'Consulenze' ? consultationMessagesCount : 0}
      contractUsageCount={feature.contractUsage?.count || 0}
      contractUsageLimit={feature.contractUsage?.limit || 5}
      contractMessagesCount={feature.page === 'AnalisiContratti' ? contractMessagesCount : 0}
      vantaggiNotifications={feature.page === 'VantaggiIscritti' ? vantaggiNotificationsCount : 0}
    />
  );

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#001d3b' }}>
      {/* Header con freccia indietro */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3" style={{ backgroundColor: '#001d3b' }}>
        <button onClick={() => navigate(createPageUrl('Home'))} className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-[#d4af37]" />
        </button>
        <h1 className="text-[#d4af37] font-bold text-lg">Esplora</h1>
      </div>
      
      <main className="px-4 py-2 max-w-md mx-auto">
        {eventResponse === 'accepted' ? (
          <div className="bg-green-700 rounded-xl p-4 mb-6">
            <h2 className="text-white font-bold text-lg mb-1">✓ Hai scelto di partecipare</h2>
            {nextEvent && <p className="text-green-100 text-sm">Incontro "{nextEvent.title}" del {new Date(nextEvent.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })} ore {nextEvent.time} - {nextEvent.location}</p>}
            <button onClick={() => setShowChangeResponse(true)} className="text-white text-sm underline mt-2 inline-block hover:text-green-200">Hai cambiato idea?</button>
          </div>
        ) : eventResponse === 'declined' ? (
          <div className="bg-red-700 rounded-xl p-4 mb-6">
            <h2 className="text-white font-bold text-lg mb-1">✗ Hai scelto di non partecipare</h2>
            {nextEvent && <p className="text-red-100 text-sm">Incontro "{nextEvent.title}" del {new Date(nextEvent.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })} ore {nextEvent.time} - {nextEvent.location}</p>}
            <button onClick={() => setShowChangeResponse(true)} className="text-white text-sm underline mt-2 inline-block hover:text-red-200">Hai cambiato idea?</button>
          </div>
        ) : (
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[#d4af37] font-bold text-lg mb-1">Benvenuto nel Consorzio</h2>
              <div className="flex items-center gap-2">
                <Link to={createPageUrl('ScannerQRVantaggi')} className="p-2 rounded-lg bg-[#d4af37]/10 hover:bg-[#d4af37]/20 transition-colors" title="Scansiona QR"><ScanLine className="w-6 h-6 text-[#d4af37]" /></Link>
                <Link to={createPageUrl('MioQRCode')} className="p-2 rounded-lg bg-[#d4af37]/10 hover:bg-[#d4af37]/20 transition-colors" title="Il mio QR"><QrCode className="w-6 h-6 text-[#d4af37]" /></Link>
              </div>
            </div>
            {nextEvent && <p className="text-[#b8a070] text-sm">Prossimo incontro: {new Date(nextEvent.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })} ore {nextEvent.time} - {nextEvent.location}</p>}
          </div>
        )}

        {activeTab ? (
          <>
            <h3 className="text-[#d4af37] font-bold text-lg mb-4 capitalize flex items-center gap-2">
              {activeTab === 'relazioni' && <span>👥</span>}
              {activeTab === 'consulenza' && <span>💼</span>}
              {activeTab === 'strumenti' && <span>🔧</span>}
              {activeTab}
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">{filteredFeatures.map(renderFeatureCard)}</div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3 mt-2"><span className="text-lg">👥</span><h3 className="text-[#d4af37] font-bold text-base tracking-wide">RELAZIONI</h3><div className="flex-1 h-px bg-gradient-to-r from-[#d4af37]/40 to-transparent ml-2"></div></div>
            <div className="grid grid-cols-2 gap-4 mb-6">{features.filter(f => f.category === 'relazioni').map(renderFeatureCard)}</div>
            <div className="flex items-center gap-2 mb-3 mt-4"><span className="text-lg">💼</span><h3 className="text-[#d4af37] font-bold text-base tracking-wide">CONSULENZA</h3><div className="flex-1 h-px bg-gradient-to-r from-[#d4af37]/40 to-transparent ml-2"></div></div>
            <div className="grid grid-cols-2 gap-4 mb-6">{features.filter(f => f.category === 'consulenza').map(renderFeatureCard)}</div>
            <div className="flex items-center gap-2 mb-3 mt-4"><span className="text-lg">🔧</span><h3 className="text-[#d4af37] font-bold text-base tracking-wide">STRUMENTI</h3><div className="flex-1 h-px bg-gradient-to-r from-[#d4af37]/40 to-transparent ml-2"></div></div>
            <div className="grid grid-cols-2 gap-4 mb-6">{features.filter(f => f.category === 'strumenti').map(renderFeatureCard)}</div>
            <div className="flex items-center gap-2 mb-3 mt-4"><span className="text-lg">📈</span><h3 className="text-[#d4af37] font-bold text-base tracking-wide">INVESTIMENTI</h3><div className="flex-1 h-px bg-gradient-to-r from-[#d4af37]/40 to-transparent ml-2"></div></div>
            <div className="grid grid-cols-2 gap-4 mb-4">{features.filter(f => f.category === 'investimenti').map(renderFeatureCard)}</div>
          </>
        )}
      </main>

      <EventInvitePopup user={effectiveUser} />
      {showChangeResponse && nextEvent && <ChangeResponsePopup event={nextEvent} user={effectiveUser} onClose={() => setShowChangeResponse(false)} />}
      <ProfileCompletionModal user={effectiveUser} onProfileComplete={() => window.location.reload()} />
      <SoundPermissionPopup />
    </div>
  );
}