// Questa è la vecchia Home, rinominata Esplora
// Il contenuto originale viene importato e re-esportato
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Calendar, Video, Briefcase, User, Euro, ShoppingBag, BookOpen, Handshake, Truck, Heart, FileSearch, Globe, Shield, PiggyBank, Gavel, Gift, QrCode, ScanLine, Star, Calculator, Users, Home, Menu, X, LogOut, Settings, Eye, XCircle, Phone, Megaphone, TrendingUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import FeatureCard from '../components/home/FeatureCard';
import ImportExportSplitCard from '../components/home/ImportExportSplitCard';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import EventInvitePopup from '../components/calendario/EventInvitePopup';
import useNotificationSound from '../components/hooks/useNotificationSound';
import ChangeResponsePopup from '@/components/calendario/ChangeResponsePopup';
import ProfileCompletionModal from '@/components/profile/ProfileCompletionModal';
import { normalizeUser, isUserConsultant, getUserPermissions } from '../components/utils/normalizeUser';
import SoundPermissionPopup from '../components/notifications/SoundPermissionPopup';
import ImpersonationDialog from '../components/admin/ImpersonationDialog';
import GlobalTopIcons from '../components/layout/GlobalTopIcons';
import { cn } from '@/lib/utils';
import { useTheme } from '../components/context/ThemeContext';

export default function Esplora() {
  const { user } = useAuth();
  const [effectiveUser, setEffectiveUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { impersonation, setCurrentUserRole, appMode, startImpersonation, stopImpersonation } = useImpersonation();
  const queryClient = useQueryClient();
  const { playSound } = useNotificationSound();
  const [showChangeResponse, setShowChangeResponse] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [lastNotificationCount, setLastNotificationCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [impersonationDialogOpen, setImpersonationDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { isDark } = useTheme();

  useEffect(() => {
    if (!user) { setLoading(true); return; }
    const loadEffective = async () => {
      setLoading(true);
      setCurrentUserRole(user.role);
      if (appMode === 'user-preview' && impersonation.previewUserId && user?.role === 'admin') {
        const users = await base44.entities.User.filter({ id: impersonation.previewUserId });
        setEffectiveUser(users.length > 0 ? normalizeUser(users[0]) : null);
      } else {
        // user da AuthContext è già normalizzato
        setEffectiveUser(user);
      }
      setLoading(false);
    };
    loadEffective();
  }, [user, appMode, impersonation.previewUserId, setCurrentUserRole]);

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
    return (<div className="min-h-screen bg-app flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--app-accent)' }}></div></div>);
  }

  if (!effectiveUser) {
    return (<div className="min-h-screen bg-app flex items-center justify-center p-4"><div className="text-center"><div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-4xl">⚠️</span></div><h1 className="text-app-primary text-xl font-bold mb-2">Errore di caricamento</h1><p className="text-app-secondary mb-4">Non è stato possibile caricare il tuo profilo.</p><button onClick={() => window.location.reload()} className="px-6 py-2 rounded-lg font-medium" style={{ backgroundColor: 'var(--app-accent-secondary)', color: 'var(--app-text-inverse)' }}>Riprova</button></div></div>);
  }

  if (isBlocked && isEmailNotAuthorized) {
    return (<div className="min-h-screen bg-app flex items-center justify-center p-4"><div className="text-center max-w-md"><div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-4xl">📧</span></div><h1 className="text-app-primary text-xl font-bold mb-3">Email non autorizzata</h1><p className="text-app-secondary mb-4">Per accedere devi utilizzare la mail concordata con l'amministrazione del Consorzio.</p><p className="text-app-muted text-sm mb-6">Se non ricordi quale email utilizzare, chiama il:</p><a href="tel:3292005433" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-lg transition-colors" style={{ backgroundColor: 'var(--app-accent-secondary)', color: 'var(--app-text-inverse)' }}>📞 329 200 5433</a><button onClick={() => base44.auth.logout()} className="block w-full mt-4 text-app-muted hover:text-app-secondary text-sm">Esci e riprova con un'altra email</button></div></div>);
  }

  if (isBlocked) {
    return (<div className="min-h-screen bg-app flex items-center justify-center p-4"><div className="text-center max-w-md"><div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-4xl">🚫</span></div><h1 className="text-app-primary text-xl font-bold mb-3">Accesso Bloccato</h1><p className="text-app-secondary mb-4">Sei stato bloccato dalla direzione del consorzio.</p><p className="text-app-muted text-sm mb-6">Per ulteriori spiegazioni chiama il:</p><a href="tel:3292005433" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-lg transition-colors" style={{ backgroundColor: 'var(--app-accent-secondary)', color: 'var(--app-text-inverse)' }}>📞 329 200 5433</a><button onClick={() => base44.auth.logout()} className="block w-full mt-4 text-app-muted hover:text-app-secondary text-sm">Esci</button></div></div>);
  }

  const culturaAziendaleNotifications = notifications.filter(n => n.type === 'cultura_aziendale').length;
  const marketplaceNotifications = notifications.filter(n => n.type === 'message' && n.title?.includes('Marketplace')).length;

  const strumentiItems = [
    // PRIORITÀ 1 — Soldi e Finanza
    { title: 'Bandi e\nAgevolazioni', icon: Euro, page: 'FinanziamentiAgevolati', notifications: isNotAdmin ? newGrantsCount : 0, permission: 'finanziamenti' },
    { title: 'Simulatore\nFiscale', icon: Calculator, page: 'SimulatoreFiscale', notifications: 0, permission: 'simulatore_fiscale' },
    { title: 'Risparmio\nBollette', icon: PiggyBank, page: 'RisparmioEnergetico', notifications: 0, permission: 'risparmio_energetico' },
    // PRIORITÀ 2 — Protezione legale
    { title: 'Evita\nSanzioni', icon: Shield, page: 'ComplianceAziendale', notifications: complianceAlerts, permission: 'compliance', variant: 'blue' },
    { title: 'Analisi\nContratti', icon: FileSearch, page: 'AnalisiContratti', notifications: contractMessagesCount, permission: 'analisi_contratti', contractUsage: contractUsageData },
    // PRIORITÀ 3 — Crescita e operatività
    { title: 'Export /\nImport', icon: Globe, page: 'ImportExport', notifications: 0, permission: 'import_export' },
    { title: isConsultant ? 'Richieste di\nConsulenza' : 'Consulenze', icon: Briefcase, page: 'Consulenze', notifications: consultationNotifications, permission: 'consulenze', bottomBadge: isConsultant ? (pendingConsultationRequests > 0 ? pendingConsultationRequests : null) : (freeConsultationsCount > 0 ? freeConsultationsCount : null), bottomBadgeType: isConsultant ? 'requests' : 'consultations' },
    { title: 'Costo del\nPersonale', icon: Users, page: 'SimulatoreCostoPersonale', notifications: 0, permission: 'simulatore_fiscale' },
    { title: 'Ricerca\nFornitori', icon: Truck, page: 'Fornitori', notifications: 0, permission: 'fornitori' },
    // PRIORITÀ 4 — HR e welfare
    { title: 'Benefit\nDipendenti', icon: Heart, page: 'WelfareAziendale', notifications: 0, permission: 'welfare_aziendale', variant: 'pink' },
    { title: 'Market Place', icon: ShoppingBag, page: 'Marketplace', notifications: marketplaceNotifications, permission: 'marketplace' },
    // PRIORITÀ 5 — Networking e community
    { title: 'Contatta\nImprenditori', icon: User, page: 'GestioneMembri', notifications: messages.length, permission: 'contatta_membri' },
    { title: 'Consigli da\nImprenditori', icon: Handshake, page: 'Imprenditori', notifications: unviewedPollsCount, permission: 'imprenditori' },
    { title: 'Video\nInterviste', icon: Video, page: 'VideoInterviste', notifications: videoNotifications, permission: 'video_interviste', newVideosCount: videosData.newCount, totalVideosCount: videosData.totalCount, hasVisitedVideos: videosData.hasVisited, latestVideoDate: videosData.latestVideoDate },
    { title: 'Video\nRecensioni', icon: Star, page: 'VideoRecensioni', notifications: 0, permission: 'video_interviste' },
    { title: 'Aste\nImmobiliari', icon: Gavel, page: 'AsteImmobiliari', notifications: 0, permission: 'aste_immobiliari' },
    // Coming soon
    { title: 'Marketing', icon: Megaphone, page: null, notifications: 0, comingSoon: true },
    { title: 'Investimenti', icon: TrendingUp, page: null, notifications: 0, comingSoon: true },
  ];

  const features = [
    ...strumentiItems.map(f => ({ ...f, category: 'strumenti' })),
    { title: 'Il Mio\nProfilo', icon: User, page: 'MyProfile', notifications: 0, category: 'personale' },
    { title: 'Calendario\nPersonale', icon: Calendar, page: 'CalendarioIncontri', notifications: 0, category: 'personale' },
    { title: 'Contatta\nil Consorzio', icon: Phone, page: 'ContattaConsorzio', notifications: 0, category: 'personale' },
    { title: 'Le Mie\nPrenotazioni', icon: Gift, page: 'MiePrenotazioniVantaggi', notifications: 0, category: 'personale' },
  ];

  const filteredFeatures = activeTab ? features.filter(f => f.category === activeTab) : features;

  const renderFeatureCard = (feature, index) => {
    // Card "coming soon" senza pagina
    if (feature.comingSoon || !feature.page) {
      const Icon = feature.icon;
      return (
        <div key={feature.title + (index || '')} className="relative">
          <div 
            className="relative min-h-[120px] opacity-60"
            style={{
              borderRadius: '20px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.2)',
            }}
          >
            <div className="absolute inset-0 rounded-[20px] p-[1px]" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.35) 0%, rgba(180,210,255,0.2) 30%, rgba(255,255,255,0.08) 70%, rgba(150,180,220,0.15) 100%)' }}>
              <div className="relative w-full h-full rounded-[19px] flex flex-col overflow-hidden backdrop-blur-sm" style={{ background: 'rgba(20, 40, 80, 0.28)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -1px 2px rgba(0,0,0,0.1)' }}>
                <div className="flex flex-col items-center justify-center flex-1 relative z-10 p-6">
                  {Icon && <Icon className="w-8 h-8 mb-2 text-white/50" />}
                  <span className="text-sm font-medium text-center leading-tight text-white/60 whitespace-pre-line">{feature.title}</span>
                  <span className="text-[10px] text-[#d4af37] font-semibold mt-1.5">PROSSIMAMENTE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    // Import/Export usa la split card dedicata
    if (feature.page === 'ImportExport') {
      return <ImportExportSplitCard key={feature.page} disabled={permissions[feature.permission] === false} />;
    }
    return (
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
  };

  return (
    <div className="min-h-screen pb-72" style={{ backgroundColor: 'var(--app-bg)' }}>
      {/* Top bar gestita dal GlobalHeader nel Layout */}

      {/* Menu Panel rimosso - il pulsante Menu naviga direttamente a MyProfile */}

      {/* Dialog Impersonation */}
      <ImpersonationDialog
        open={impersonationDialogOpen}
        onClose={() => setImpersonationDialogOpen(false)}
        onStart={(role, targetId, targetEmail, targetName, targetUserData) => {
          startImpersonation(role, targetId, targetEmail, targetName, targetUserData);
          setTimeout(() => { window.location.href = createPageUrl('Home'); }, 100);
        }}
      />
      
      <main className="px-4 pt-10 pb-2 max-w-md mx-auto">
        {eventResponse === 'accepted' ? (
          <div className="bg-green-700 rounded-xl p-4 mb-6">
            <h2 className="text-app-inverse font-bold text-lg mb-1">✓ Hai scelto di partecipare</h2>
            {nextEvent && <p className="text-green-100 text-sm">Incontro "{nextEvent.title}" del {new Date(nextEvent.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })} ore {nextEvent.time} - {nextEvent.location}</p>}
            <button onClick={() => setShowChangeResponse(true)} className="text-app-inverse text-sm underline mt-2 inline-block hover:text-green-200">Hai cambiato idea?</button>
          </div>
        ) : eventResponse === 'declined' ? (
          <div className="bg-red-700 rounded-xl p-4 mb-6">
            <h2 className="text-app-inverse font-bold text-lg mb-1">✗ Hai scelto di non partecipare</h2>
            {nextEvent && <p className="text-red-100 text-sm">Incontro "{nextEvent.title}" del {new Date(nextEvent.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })} ore {nextEvent.time} - {nextEvent.location}</p>}
            <button onClick={() => setShowChangeResponse(true)} className="text-app-inverse text-sm underline mt-2 inline-block hover:text-red-200">Hai cambiato idea?</button>
          </div>
        ) : (
          <div className="mb-6">
            {nextEvent && <p className="text-[#b8a070] text-sm">Prossimo incontro: {new Date(nextEvent.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })} ore {nextEvent.time} - {nextEvent.location}</p>}
          </div>
        )}

        {activeTab ? (
          <>
            <h3 className="text-[#d4af37] font-bold text-lg mb-4 capitalize flex items-center gap-2">
              {activeTab === 'strumenti' && <span>🔧</span>}
              {activeTab === 'personale' && <span>👤</span>}
              {activeTab === 'personale' ? 'Area Personale' : activeTab}
            </h3>
            {activeTab === 'personale' ? (
              <div className="rounded-xl p-8 text-center" style={{ border: '1px solid var(--app-border-accent)', backgroundColor: 'var(--app-bg-card)' }}>
                <p className="text-[#d4af37] font-semibold text-base">🚧 Questa sezione è in lavorazione</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {strumentiItems.map((f, i) => renderFeatureCard({ ...f, category: 'strumenti' }, i))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3 mt-2"><span className="text-lg">🔧</span><h3 className="font-bold text-base tracking-wide" style={{ color: isDark ? '#d4af37' : '#000000' }}>STRUMENTI</h3><div className="flex-1 h-px ml-2" style={{ background: isDark ? 'linear-gradient(to right, rgba(212,175,55,0.4), transparent)' : 'linear-gradient(to right, rgba(0,0,0,0.3), transparent)' }}></div></div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {strumentiItems.map((f, i) => renderFeatureCard({ ...f, category: 'strumenti' }, i))}
            </div>
            <div className="flex items-center gap-2 mb-3 mt-4"><span className="text-lg">👤</span><h3 className="font-bold text-base tracking-wide" style={{ color: isDark ? '#d4af37' : '#000000' }}>PERSONALE</h3><div className="flex-1 h-px ml-2" style={{ background: isDark ? 'linear-gradient(to right, rgba(212,175,55,0.4), transparent)' : 'linear-gradient(to right, rgba(0,0,0,0.3), transparent)' }}></div></div>
            <div className="grid grid-cols-2 gap-4 mb-6">{features.filter(f => f.category === 'personale').map(renderFeatureCard)}</div>
          </>
        )}
      </main>

      <EventInvitePopup user={effectiveUser} />
      {showChangeResponse && nextEvent && <ChangeResponsePopup event={nextEvent} user={effectiveUser} onClose={() => setShowChangeResponse(false)} />}
      <ProfileCompletionModal user={effectiveUser} onProfileComplete={() => window.location.reload()} />
      <SoundPermissionPopup />
      <BottomNav currentPage="Esplora" activeTab={activeTab} onMenuOpen={() => window.location.href = createPageUrl('MyProfile')} menuOpen={false} />
    </div>
  );
}