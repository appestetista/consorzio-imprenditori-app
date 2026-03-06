import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useNotificationSound from '../components/hooks/useNotificationSound';
import { Users, Briefcase, Settings, Bell, Clock, Trash2, Mail, Eye, MessageSquare, CalendarDays, MapPin, DollarSign, UserPlus, Search, Edit, Phone, PhoneOff, Save, Upload, X, ChevronRight, Calculator, Star, Globe, Database, Menu, Home, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import ImpersonationDialog from '../components/admin/ImpersonationDialog';
import InviteConsultantForm from '../components/admin/InviteConsultantForm';
import AdminMessagesView from '../components/admin/AdminMessagesView';
import ZoneManagerSimple from '../components/admin/ZoneManagerSimple';
import ImportAsteSection from '../components/admin/ImportAsteSection';
import RisparmioAdminPanel from '../components/admin/RisparmioAdminPanel';
import VantaggiAdminPanel from '../components/admin/VantaggiAdminPanel';
import SimulatoreFiscaleAdmin from '../components/admin/SimulatoreFiscaleAdmin';
import VideoRecensioniAdmin from '../components/admin/VideoRecensioniAdmin';
import ImportExportAdmin from '../components/admin/ImportExportAdmin';
import CostoPersonaleAdmin from '../components/admin/CostoPersonaleAdmin';
import KnowledgeBaseGenerator from '../components/admin/KnowledgeBaseGenerator';
import AbbonamentiAdmin from '../components/admin/AbbonamentiAdmin';

import AdminSectionGrid from '../components/admin/AdminSectionGrid';
import AdminRisparmioGrid from '../components/admin/AdminRisparmioGrid';
import AdminAltreSezGrid from '../components/admin/AdminAltreSezGrid';
import { AdminMessagesDialog, ConsultationMessagesDialog, VideoRequestsDialog } from '../components/admin/AdminDialogs';
import GlobalTopIcons from '../components/layout/GlobalTopIcons';

const CONSULTANT_CATEGORIES = [
  "Stampa Digitale e Cataloghi", "Assicurazioni Aziendali", "Agenzia di Comunicazione",
  "Commercialista", "Igiene e Sicurezza", "Internazionalizzazione/Export",
  "Broker Energetico", "Avvocato", "Bandi Europei",
  "Affitto Stampanti/Cyber Sicurezza", "Efficientamento Energetico/Centralini"
];

const SECTIONS = [
  { id: 'calendario', label: 'Calendario Incontri' }, { id: 'video_interviste', label: 'Video Interviste' },
  { id: 'cultura_aziendale', label: 'Academy' }, { id: 'consulenze', label: 'Consulenze' },
  { id: 'finanziamenti', label: 'Finanziamenti Agevolati' }, { id: 'contatta_membri', label: 'Contatta Imprenditori' },
  { id: 'risparmio_energetico', label: 'Risparmio' }, { id: 'marketplace', label: 'Marketplace' },
  { id: 'imprenditori', label: 'Consigli da Imprenditori' }, { id: 'fornitori', label: 'Ricerca Fornitori' },
  { id: 'welfare_aziendale', label: 'Welfare Aziendale' }, { id: 'analisi_contratti', label: 'Analisi Contratti' },
  { id: 'import_export', label: 'Import/Export' }, { id: 'compliance', label: 'Compliance Aziendale' },
];

export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [showImpersonationDialog, setShowImpersonationDialog] = useState(false);
  const { impersonation, startImpersonation, appMode } = useImpersonation();

  const [searchTermConsultant, setSearchTermConsultant] = useState('');
  const [selectedZoneConsultant, setSelectedZoneConsultant] = useState('all');
  const [selectedConsultant, setSelectedConsultant] = useState(null);
  const [showSections, setShowSections] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [formDataConsultant, setFormDataConsultant] = useState(null);
  const [sectionsData, setSectionsData] = useState([]);
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');
  const [bookingZoneFilter, setBookingZoneFilter] = useState('all');
  const [bookingConsultantFilter, setBookingConsultantFilter] = useState('all');

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { playSound } = useNotificationSound();
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [lastEventCount, setLastEventCount] = useState(0);

  const [showVideoRequests, setShowVideoRequests] = useState(false);
  const [showAllMessages, setShowAllMessages] = useState(false);
  const [showConsultationMessages, setShowConsultationMessages] = useState(false);
  const [showConsulenzePanel, setShowConsulenzePanel] = useState(false);
  const [showAdminMessages, setShowAdminMessages] = useState(false);
  const [showImportAste, setShowImportAste] = useState(false);
  const [selectedConsulenzaConversation, setSelectedConsulenzaConversation] = useState(null);
  const [showRisparmioPanel, setShowRisparmioPanel] = useState(false);
  const [selectedRisparmioCategory, setSelectedRisparmioCategory] = useState(null);
  const [showVantaggiPanel, setShowVantaggiPanel] = useState(false);
  const [showSimulatorePanel, setShowSimulatorePanel] = useState(false);
  const [showVideoRecensioniPanel, setShowVideoRecensioniPanel] = useState(false);
  const [showImportExportPanel, setShowImportExportPanel] = useState(false);
  const [showCostoPersonalePanel, setShowCostoPersonalePanel] = useState(false);
  const [showAbbonamentiPanel, setShowAbbonamentiPanel] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const loadUser = async () => {
      try { setUser(await base44.auth.me()); } catch (e) { console.error(e); }
    };
    loadUser();
  }, []);

  // ─── Queries ────────────────────────────────────────────
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [users, events, videos, consultants, vantaggi] = await Promise.all([
        base44.entities.User.list(), base44.entities.Event.list(), base44.entities.Video.list(),
        base44.entities.Consultant.list(), base44.entities.Vantaggio.list()
      ]);
      const today = new Date(); today.setHours(0,0,0,0);
      const validFutureEvents = events.filter(e => {
        if (!e.date) return false;
        const d = new Date(e.date); if (isNaN(d.getTime())) return false;
        d.setHours(0,0,0,0);
        return d >= today && e.approval_status === 'approved' && !e.is_cancelled;
      });
      return {
        totalUsers: users.length, activeUsers: users.filter(u => !u.is_blocked).length,
        totalEvents: validFutureEvents.length, totalVideos: videos.length,
        totalConsultants: consultants.length, totalVantaggi: vantaggi.filter(v => v.is_active).length
      };
    }
  });

  const { data: consultants = [], isLoading: isLoadingConsultants } = useQuery({ queryKey: ['consultants'], queryFn: () => base44.entities.Consultant.list() });
  const { data: zones = [] } = useQuery({ queryKey: ['zones'], queryFn: () => base44.entities.Zone.filter({ is_active: true }) });
  const { data: pendingInvitesConsultants = [] } = useQuery({ queryKey: ['pending-invites-consultants'], queryFn: async () => { const invites = await base44.entities.PendingInvite.filter({ user_type: 'consulente' }); return invites.filter(i => !i.is_registered); } });
  const { data: consultationBookings = [] } = useQuery({ queryKey: ['consultation-bookings-admin'], queryFn: () => base44.entities.ConsultationBooking.list('-created_date') });
  const pendingConsultationBookings = consultationBookings.filter(b => b.status === 'pending').length;

  const { data: consultationMessages = [] } = useQuery({
    queryKey: ['consultation-messages-admin'],
    queryFn: async () => {
      const [allMessages, users, consultantsList] = await Promise.all([
        base44.entities.Message.filter({ source: 'consulenze' }), base44.entities.User.list(), base44.entities.Consultant.list()
      ]);
      return allMessages.map(msg => {
        const fromUser = users.find(u => u.email === msg.from_email);
        const toUser = users.find(u => u.email === msg.to_email);
        const fromCons = consultantsList.find(c => c.email === msg.from_email);
        const toCons = consultantsList.find(c => c.email === msg.to_email);
        return { ...msg, from_name: fromUser?.company_name || fromUser?.full_name || fromCons?.name || msg.from_email, to_name: toUser?.company_name || toUser?.full_name || toCons?.name || msg.to_email, from_type: fromCons ? 'consulente' : 'utente', to_type: toCons ? 'consulente' : 'utente' };
      }).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  });
  const unreadConsultationMessages = consultationMessages.filter(m => !m.is_read).length;

  const { data: videoInterviewRequests = [] } = useQuery({ queryKey: ['video-interview-requests'], queryFn: () => base44.entities.VideoInterviewRequest.list('-created_date') });
  const pendingVideoRequests = videoInterviewRequests.filter(r => r.status === 'pending');

  const { data: eventResponseNotifications = [] } = useQuery({ queryKey: ['event-response-notifications', user?.email], queryFn: () => base44.entities.Notification.filter({ user_email: user?.email, type: 'event_response', is_read: false }), enabled: !!user?.email });
  const { data: allEvents = [] } = useQuery({ queryKey: ['all-events-admin'], queryFn: () => base44.entities.Event.list('-date') });
  const { data: messages = [] } = useQuery({ queryKey: ['unread-messages', user?.email], queryFn: () => base44.entities.Message.filter({ to_email: user?.email, is_read: false }), enabled: !!user?.email });

  const { data: allAdminMessages = [] } = useQuery({
    queryKey: ['all-admin-messages'],
    queryFn: async () => {
      const [allMessages, users, cons] = await Promise.all([base44.entities.Message.list('-created_date'), base44.entities.User.list(), base44.entities.Consultant.list()]);
      return allMessages.filter(m => m.to_email === user?.email && m.source !== 'consulenze').map(msg => {
        const sender = users.find(u => u.email === msg.from_email);
        const consultant = cons.find(c => c.email === msg.from_email);
        return { ...msg, sender_name: sender?.company_name || sender?.full_name || consultant?.name || msg.from_email, sender_type: consultant ? 'consulente' : 'utente' };
      });
    }, enabled: !!user?.email
  });
  const unreadAdminMessages = allAdminMessages.filter(m => !m.is_read);

  const futureEventsCount = (() => { const t = new Date(); t.setHours(0,0,0,0); return allEvents.filter(e => { const d = new Date(e.date); d.setHours(0,0,0,0); return d >= t && e.approval_status === 'approved' && !e.is_cancelled; }).length; })();
  const pendingApprovalEventsCount = allEvents.filter(e => e.approval_status === 'pending').length;

  // ─── Subscriptions ──────────────────────────────────────
  useEffect(() => {
    const unsub = base44.entities.Event.subscribe((event) => {
      if (event.type === 'create' && event.data?.approval_status === 'pending') { playSound(); setHasNewNotification(true); }
      queryClient.invalidateQueries({ queryKey: ['all-events-admin'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    });
    return unsub;
  }, [queryClient, playSound]);

  useEffect(() => {
    if (pendingApprovalEventsCount > lastEventCount && lastEventCount > 0) setHasNewNotification(true);
    setLastEventCount(pendingApprovalEventsCount);
  }, [pendingApprovalEventsCount, lastEventCount]);

  // ─── Mutations ──────────────────────────────────────────
  const markVideoRequestReadMutation = useMutation({ mutationFn: async (id) => { await base44.entities.VideoInterviewRequest.update(id, { status: 'read' }); }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['video-interview-requests'] }) });
  const deleteVideoRequestMutation = useMutation({ mutationFn: async (id) => { await base44.entities.VideoInterviewRequest.delete(id); }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['video-interview-requests'] }) });
  const markMessageReadMutation = useMutation({ mutationFn: async (id) => { await base44.entities.Message.update(id, { is_read: true }); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['all-admin-messages'] }); queryClient.invalidateQueries({ queryKey: ['unread-messages'] }); } });

  const toggleBlockConsultantMutation = useMutation({
    mutationFn: async ({ consultantId, isBlocked, consultantEmail }) => {
      await base44.entities.Consultant.update(consultantId, { is_blocked: !isBlocked });
      if (consultantEmail) { const users = await base44.entities.User.filter({ email: consultantEmail.toLowerCase() }); if (users.length > 0) await base44.entities.User.update(users[0].id, { is_blocked: !isBlocked, block_reason: !isBlocked ? 'bloccato_da_admin' : null }); }
    }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['consultants'] })
  });

  const updateConsultantMutation = useMutation({
    mutationFn: async ({ consultantId, data }) => base44.entities.Consultant.update(consultantId, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['consultants'] }); setShowEditForm(false); setFormDataConsultant(null); setSelectedConsultant(null); }
  });

  const updateSectionsMutation = useMutation({
    mutationFn: async ({ consultantId, sections }) => {
      await base44.entities.Consultant.update(consultantId, { assigned_sections: sections });
      const invite = pendingInvitesConsultants.find(i => i.email === selectedConsultant?.email);
      if (invite) await base44.entities.PendingInvite.update(invite.id, { assigned_sections: sections });
      if (selectedConsultant?.email) {
        const users = await base44.entities.User.filter({ email: selectedConsultant.email.toLowerCase() });
        if (users.length > 0) {
          const allSec = SECTIONS.map(s => s.id);
          const permissions = {}; allSec.forEach(s => { permissions[s] = false; }); sections.forEach(s => { permissions[s] = true; }); permissions.consulenze = true;
          await base44.entities.User.update(users[0].id, { permissions });
        }
      }
    }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['consultants'] }); queryClient.invalidateQueries({ queryKey: ['pending-invites-consultants'] }); setShowSections(false); setSelectedConsultant(null); }
  });

  const deleteConsultantMutation = useMutation({ mutationFn: async (id) => base44.entities.Consultant.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['consultants'] }) });
  const deleteInviteConsultantMutation = useMutation({ mutationFn: async (id) => base44.entities.PendingInvite.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pending-invites-consultants'] }) });

  // ─── Handlers ───────────────────────────────────────────
  const filteredConsultants = consultants.filter(c => {
    const s = searchTermConsultant.toLowerCase();
    return (c.name?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s) || c.category?.toLowerCase().includes(s)) && (selectedZoneConsultant === 'all' || c.zona === selectedZoneConsultant);
  });

  const handleEditConsultant = (c) => {
    setFormDataConsultant({ name: c.name||'', category: c.category||'', email: c.email||'', phone: c.phone||'', city: c.city||'', referente: c.referente||'', cellulare_referente: c.cellulare_referente||'', zona: c.zona||'', zone_assegnate: c.zone_assegnate || (c.zona ? [c.zona] : []), assigned_sections: c.assigned_sections||[], communication_sections: c.communication_sections||[], available_slots: c.available_slots ?? 100, free_consultations_per_user: c.free_consultations_per_user ?? 1, sede_azienda_disabled: c.sede_azienda_disabled ?? false, rimborso_carburante: c.rimborso_carburante ?? 0, block_calls_for_all: c.block_calls_for_all ?? false, blocked_users_calls: c.blocked_users_calls||[], logo_url: c.logo_url||'' });
    setSelectedConsultant(c); setShowEditForm(true);
  };

  const handleOpenSections = (c) => { const invite = pendingInvitesConsultants.find(i => i.email === c.email); setSectionsData(c.assigned_sections || invite?.assigned_sections || []); setSelectedConsultant(c); setShowSections(true); };
  const toggleSection = (id) => setSectionsData(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  if (!user) return null;
  if (appMode === 'user' && user.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-slate-900 pb-64">
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-green-400 text-sm font-semibold">Consorzio Imprenditori</h2>
            <h1 className="text-red-500 text-2xl font-bold">Pannello Admin</h1>
          </div>
          <div className="flex items-center gap-3">
            <GlobalTopIcons userEmail={user?.email} userRegime={null} />
            <p className="text-slate-400 text-xs">{new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Link to={createPageUrl('GestioneMembri')}><Card className="bg-slate-800 border-slate-700 hover:bg-slate-700"><CardContent className="p-2 text-center"><Users className="w-5 h-5 text-lime-400 mx-auto mb-1" /><p className="text-lg font-bold text-white">{stats?.activeUsers || 0}</p><p className="text-slate-400 text-[10px]">Utenti</p></CardContent></Card></Link>
          <Link to={createPageUrl('GestioneCostiAI')}><Card className="bg-slate-800 border-slate-700 hover:bg-slate-700"><CardContent className="p-2 text-center"><DollarSign className="w-5 h-5 text-lime-400 mx-auto mb-1" /><p className="text-lg font-bold text-white">AI</p><p className="text-slate-400 text-[10px]">Costi</p></CardContent></Card></Link>
          <Link to={createPageUrl('GestioneZone')}><Card className="bg-slate-800 border-slate-700 hover:bg-slate-700"><CardContent className="p-2 text-center"><MapPin className="w-5 h-5 text-lime-400 mx-auto mb-1" /><p className="text-lg font-bold text-white">Zone</p><p className="text-slate-400 text-[10px]">Gestione</p></CardContent></Card></Link>
        </div>

        {/* Section Grids (extracted components) */}
        <AdminSectionGrid stats={stats} pendingApprovalEventsCount={pendingApprovalEventsCount} pendingVideoRequests={pendingVideoRequests} pendingConsultationBookings={pendingConsultationBookings} onOpenConsulenze={() => setShowConsulenzePanel(true)} onOpenVantaggi={() => setShowVantaggiPanel(true)} />
        <AdminRisparmioGrid onSelectCategory={(cat) => { setSelectedRisparmioCategory(cat); setShowRisparmioPanel(true); }} />
        <AdminAltreSezGrid allAdminMessages={allAdminMessages} unreadAdminMessages={unreadAdminMessages} onOpenImportExport={() => setShowImportExportPanel(true)} onOpenSimulatore={() => setShowSimulatorePanel(true)} onOpenVideoRecensioni={() => setShowVideoRecensioniPanel(true)} onOpenCostoPersonale={() => setShowCostoPersonalePanel(true)} onOpenImportAste={() => setShowImportAste(true)} onOpenAdminMessages={() => setShowAdminMessages(true)} />

        {/* Abbonamenti */}
        <div className="mb-4">
          <Card className="bg-slate-800 border-slate-700 cursor-pointer hover:bg-slate-700" onClick={() => setShowAbbonamentiPanel(true)}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#d4af37]/20 flex items-center justify-center"><DollarSign className="w-5 h-5 text-[#d4af37]" /></div>
              <div><p className="text-white font-medium text-sm">Abbonamenti</p><p className="text-slate-400 text-[10px]">Gestisci richieste e attivazioni</p></div>
            </CardContent>
          </Card>
        </div>

        {/* Knowledge Base Generator */}
        <div className="mb-4">
          <KnowledgeBaseGenerator />
        </div>

        {/* Event Response Notifications */}
        {eventResponseNotifications.length > 0 && (
          <Card className="bg-slate-800 border-slate-700 mb-4">
            <CardContent className="p-3">
              <h3 className="text-white font-medium text-sm mb-2 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-lime-400" />Risposte Eventi ({eventResponseNotifications.length})</h3>
              <div className="space-y-2">
                {eventResponseNotifications.slice(0, 5).map((notif) => {
                  const evento = allEvents.find(e => e.id === notif.reference_id);
                  return (
                    <div key={notif.id} className="bg-lime-400/10 border border-lime-400/30 rounded-lg p-3">
                      <p className="text-white text-sm">{notif.content}</p>
                      {evento && <p className="text-slate-400 text-xs mt-1">Evento: {evento.title}</p>}
                      <p className="text-slate-500 text-xs mt-1">{notif.created_date ? new Date(notif.created_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</p>
                    </div>
                  );
                })}
                {eventResponseNotifications.length > 5 && <Link to={createPageUrl('CalendarioIncontri')} className="block"><p className="text-lime-400 text-xs text-center py-1 hover:underline">Vedi tutti ({eventResponseNotifications.length})</p></Link>}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav currentPage="AdminPanel" unreadMessages={messages.length} isAdmin={true} />
      <ImpersonationDialog open={showImpersonationDialog} onClose={() => setShowImpersonationDialog(false)} onStart={(role, id, email, name) => { startImpersonation(role, id, email, name); navigate(createPageUrl('Home')); }} />

      {/* Extracted Dialog Components */}
      <AdminMessagesDialog open={showAllMessages} onOpenChange={setShowAllMessages} messages={allAdminMessages} onMarkRead={(id) => markMessageReadMutation.mutate(id)} />
      <ConsultationMessagesDialog open={showConsultationMessages} onOpenChange={setShowConsultationMessages} messages={consultationMessages} />
      <VideoRequestsDialog open={showVideoRequests} onOpenChange={setShowVideoRequests} requests={videoInterviewRequests} onMarkRead={(id) => markVideoRequestReadMutation.mutate(id)} onDelete={(id) => deleteVideoRequestMutation.mutate(id)} />

      {/* Edit Consultant Dialog */}
      <Dialog open={showEditForm} onOpenChange={(open) => { setShowEditForm(open); if (!open) { setSelectedConsultant(null); setFormDataConsultant(null); } }}>
        <DialogContent className="bg-slate-800 border-slate-700 max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-white">Modifica Consulente</DialogTitle></DialogHeader>
          {formDataConsultant && (
            <div className="space-y-4 mt-4">
              <div className="border-l-4 border-lime-400 pl-4 py-2 bg-lime-400/5 rounded-r-lg">
                <div className="flex items-center gap-2 mb-3"><div className="w-2 h-2 rounded-full bg-lime-400" /><h3 className="text-lime-400 font-medium text-sm">🔒 Campi solo Admin</h3></div>
                <p className="text-slate-500 text-xs mb-4">Questi campi sono modificabili solo dall'amministratore</p>
                <div className="space-y-3">
                  <div><Label className="text-slate-300 text-sm">Categoria *</Label><Select value={formDataConsultant.category} onValueChange={(v) => setFormDataConsultant({...formDataConsultant, category: v})}><SelectTrigger className="bg-slate-900 border-lime-400/30 text-white mt-1"><SelectValue placeholder="Seleziona categoria..." /></SelectTrigger><SelectContent>{CONSULTANT_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label className="text-slate-300 text-sm">Email</Label><Input type="email" value={formDataConsultant.email} onChange={(e) => setFormDataConsultant({...formDataConsultant, email: e.target.value})} className="bg-slate-900 border-lime-400/30 text-white mt-1" /></div>
                  <div><Label className="text-slate-300 text-sm">Zone Assegnate *</Label>
                    <div className="bg-slate-900 border border-lime-400/50 rounded-md p-3 mt-1 space-y-2 max-h-40 overflow-y-auto">
                      {zones.map(z => (<div key={z.id} className="flex items-center gap-2"><Checkbox id={`ze-${z.id}`} checked={formDataConsultant.zone_assegnate?.includes(z.name)} onCheckedChange={(ch) => { const cur = formDataConsultant.zone_assegnate||[]; setFormDataConsultant({...formDataConsultant, zone_assegnate: ch ? [...cur,z.name] : cur.filter(x=>x!==z.name), zona: ch ? z.name : (cur.filter(x=>x!==z.name)[0]||'')}); }} className="border-slate-600 data-[state=checked]:bg-lime-400 data-[state=checked]:border-lime-400" /><Label htmlFor={`ze-${z.id}`} className="text-white text-sm cursor-pointer">{z.name}</Label></div>))}
                    </div>
                    {formDataConsultant.zone_assegnate?.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{formDataConsultant.zone_assegnate.map(z => <Badge key={z} className="bg-lime-400/20 text-lime-400 border-0 text-xs">{z}</Badge>)}</div>}
                  </div>
                  <div><Label className="text-slate-300 text-sm">Sezioni Visibili</Label><div className="bg-slate-900 border border-lime-400/30 rounded-md p-3 mt-1 space-y-2 max-h-40 overflow-y-auto">{SECTIONS.map(s => (<div key={s.id} className="flex items-center gap-2"><Checkbox id={`se-${s.id}`} checked={formDataConsultant.assigned_sections?.includes(s.id)} onCheckedChange={(ch) => { const cur = formDataConsultant.assigned_sections||[]; setFormDataConsultant({...formDataConsultant, assigned_sections: ch ? [...cur,s.id] : cur.filter(x=>x!==s.id)}); }} className="border-slate-600 data-[state=checked]:bg-lime-400 data-[state=checked]:border-lime-400" /><Label htmlFor={`se-${s.id}`} className="text-white text-sm cursor-pointer">{s.label}</Label></div>))}</div></div>
                  <div><Label className="text-slate-300 text-sm">Pannelli Comunicazione</Label><p className="text-slate-500 text-xs mb-1">Dove il consulente appare agli utenti</p><div className="bg-slate-900 border border-lime-400/30 rounded-md p-3 mt-1 space-y-2 max-h-40 overflow-y-auto">{SECTIONS.map(s => (<div key={`c-${s.id}`} className="flex items-center gap-2"><Checkbox id={`ce-${s.id}`} checked={formDataConsultant.communication_sections?.includes(s.id)} onCheckedChange={(ch) => { const cur = formDataConsultant.communication_sections||[]; setFormDataConsultant({...formDataConsultant, communication_sections: ch ? [...cur,s.id] : cur.filter(x=>x!==s.id)}); }} className="border-slate-600 data-[state=checked]:bg-lime-400 data-[state=checked]:border-lime-400" /><Label htmlFor={`ce-${s.id}`} className="text-white text-sm cursor-pointer">{s.label}</Label></div>))}</div>{formDataConsultant.communication_sections?.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{formDataConsultant.communication_sections.map(s => <Badge key={s} className="bg-lime-400/20 text-lime-400 border-0 text-xs">{SECTIONS.find(sec=>sec.id===s)?.label||s}</Badge>)}</div>}</div>
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-slate-700">
                <p className="text-slate-400 text-xs">Campi modificabili anche dal consulente:</p>
                <div><Label className="text-slate-300 text-sm">Nome/Studio *</Label><Input value={formDataConsultant.name} onChange={(e) => setFormDataConsultant({...formDataConsultant, name: e.target.value})} className="bg-slate-900 border-slate-700 text-white mt-1" /></div>
                <div><Label className="text-slate-300 text-sm">Telefono</Label><Input value={formDataConsultant.phone} onChange={(e) => setFormDataConsultant({...formDataConsultant, phone: e.target.value})} className="bg-slate-900 border-slate-700 text-white mt-1" /></div>
                <div><Label className="text-slate-300 text-sm">Città</Label><Input value={formDataConsultant.city} onChange={(e) => setFormDataConsultant({...formDataConsultant, city: e.target.value})} className="bg-slate-900 border-slate-700 text-white mt-1" /></div>
                <div><Label className="text-slate-300 text-sm">Referente</Label><Input value={formDataConsultant.referente} onChange={(e) => setFormDataConsultant({...formDataConsultant, referente: e.target.value})} className="bg-slate-900 border-slate-700 text-white mt-1" /></div>
                <div><Label className="text-slate-300 text-sm">Cellulare Referente</Label><Input value={formDataConsultant.cellulare_referente} onChange={(e) => setFormDataConsultant({...formDataConsultant, cellulare_referente: e.target.value})} className="bg-slate-900 border-slate-700 text-white mt-1" /></div>
              </div>
              <div className="border-l-4 border-purple-500 pl-4 py-2 bg-purple-500/5 rounded-r-lg mt-4">
                <div className="flex items-center gap-2 mb-3"><div className="w-2 h-2 rounded-full bg-purple-500" /><h3 className="text-purple-400 font-medium text-sm">👁️ Campi visibili al Consulente</h3></div>
                <div className="space-y-3">
                  <div><Label className="text-slate-300 text-xs">Logo Studio</Label><div className="mt-1 space-y-2">{formDataConsultant.logo_url && <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-2"><img src={formDataConsultant.logo_url} alt="Logo" className="w-12 h-12 object-contain rounded" /><Button type="button" variant="outline" size="sm" onClick={() => setFormDataConsultant({...formDataConsultant, logo_url: ''})} className="border-red-600 text-red-400 h-7 text-xs"><X className="w-3 h-3 mr-1" />Rimuovi</Button></div>}<label className="flex items-center justify-center gap-2 bg-slate-900 border border-dashed border-purple-500/50 rounded-lg p-3 cursor-pointer hover:border-purple-400"><input type="file" accept="image/jpeg,image/png,image/jpg" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const { file_url } = await base44.integrations.Core.UploadFile({ file: f }); setFormDataConsultant({...formDataConsultant, logo_url: file_url}); }} className="hidden" /><Upload className="w-4 h-4 text-purple-400" /><span className="text-slate-300 text-xs">Carica logo</span></label></div></div>
                  <div><Label className="text-slate-300 text-xs">Consulenze disponibili totali</Label><Input type="number" value={formDataConsultant.available_slots} onChange={(e) => setFormDataConsultant({...formDataConsultant, available_slots: parseInt(e.target.value)||0})} className="bg-slate-900 border-purple-500/30 text-white mt-1 h-8 text-sm" min="0" /></div>
                  <div><Label className="text-slate-300 text-xs">Consulenze gratuite per utente</Label><Input type="number" value={formDataConsultant.free_consultations_per_user} onChange={(e) => setFormDataConsultant({...formDataConsultant, free_consultations_per_user: parseInt(e.target.value)||0})} className="bg-slate-900 border-purple-500/30 text-white mt-1 h-8 text-sm" min="0" /></div>
                  <div><Label className="text-slate-300 text-xs">Rimborso carburante (€)</Label><Input type="number" value={formDataConsultant.rimborso_carburante} onChange={(e) => setFormDataConsultant({...formDataConsultant, rimborso_carburante: parseFloat(e.target.value)||0})} className="bg-slate-900 border-purple-500/30 text-white mt-1 h-8 text-sm" min="0" step="0.01" /></div>
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center gap-2"><Checkbox id="sede_dis" checked={formDataConsultant.sede_azienda_disabled} onCheckedChange={(ch) => setFormDataConsultant({...formDataConsultant, sede_azienda_disabled: ch})} className="border-purple-500/50 data-[state=checked]:bg-purple-500" /><Label htmlFor="sede_dis" className="text-white text-sm cursor-pointer">Disabilita "in sede aziendale"</Label></div>
                    <div className="flex items-center gap-2"><Checkbox id="block_all" checked={formDataConsultant.block_calls_for_all} onCheckedChange={(ch) => setFormDataConsultant({...formDataConsultant, block_calls_for_all: ch})} className="border-purple-500/50 data-[state=checked]:bg-red-500" /><Label htmlFor="block_all" className="text-red-400 text-sm cursor-pointer">Blocca chiamate da tutti</Label></div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-700">
                <Button variant="outline" onClick={() => setShowEditForm(false)} className="flex-1 border-slate-600 text-slate-400 hover:text-white">Annulla</Button>
                <Button onClick={() => updateConsultantMutation.mutate({ consultantId: selectedConsultant.id, data: formDataConsultant })} disabled={updateConsultantMutation.isPending || !formDataConsultant.name || !formDataConsultant.category} className="flex-1 bg-lime-400 hover:bg-lime-500 text-slate-900"><Save className="w-4 h-4 mr-2" />{updateConsultantMutation.isPending ? 'Salvataggio...' : 'Salva Modifiche'}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sections Dialog */}
      <Dialog open={showSections} onOpenChange={setShowSections}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader><DialogTitle className="text-white">Sezioni Visibili - {selectedConsultant?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">{sectionsData.length} sezioni selezionate</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setSectionsData(SECTIONS.map(s=>s.id))} className="text-lime-400 text-xs hover:underline">Tutte</button>
                <span className="text-slate-600">|</span>
                <button type="button" onClick={() => setSectionsData([])} className="text-slate-400 text-xs hover:underline">Nessuna</button>
              </div>
            </div>
            <div className="bg-slate-900 rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
              {SECTIONS.map(s => (<div key={s.id} className="flex items-center gap-2"><Checkbox id={`s-${s.id}`} checked={sectionsData.includes(s.id)} onCheckedChange={() => toggleSection(s.id)} className="border-slate-600 data-[state=checked]:bg-lime-400 data-[state=checked]:border-lime-400" /><Label htmlFor={`s-${s.id}`} className="text-white text-sm cursor-pointer">{s.label}</Label></div>))}
            </div>
          </div>
          <DialogFooter><Button onClick={() => updateSectionsMutation.mutate({ consultantId: selectedConsultant.id, sections: sectionsData })} disabled={updateSectionsMutation.isPending} className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900">{updateSectionsMutation.isPending ? 'Salvataggio...' : 'Salva Sezioni'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Consultant */}
      <Dialog open={showInviteForm} onOpenChange={setShowInviteForm}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-white flex items-center gap-2"><UserPlus className="w-5 h-5 text-lime-400" />Invita Nuovo Consulente</DialogTitle></DialogHeader>
          <InviteConsultantForm onSuccess={() => { setShowInviteForm(false); queryClient.invalidateQueries({ queryKey: ['consultants'] }); queryClient.invalidateQueries({ queryKey: ['pending-invites-consultants'] }); }} />
        </DialogContent>
      </Dialog>

      {/* Simple Panel Dialogs */}
      <Dialog open={showAdminMessages} onOpenChange={setShowAdminMessages}><DialogContent className="bg-slate-900 border-slate-700 max-w-lg max-h-[90vh] overflow-y-auto p-4"><AdminMessagesView onBack={() => setShowAdminMessages(false)} /></DialogContent></Dialog>
      <Dialog open={showImportAste} onOpenChange={setShowImportAste}><DialogContent className="bg-slate-900 border-slate-700 max-w-lg max-h-[90vh] overflow-y-auto p-4"><ImportAsteSection /></DialogContent></Dialog>
      <Dialog open={showRisparmioPanel} onOpenChange={setShowRisparmioPanel}><DialogContent className="bg-slate-900 border-slate-700 max-w-lg max-h-[90vh] overflow-y-auto p-4"><RisparmioAdminPanel category={selectedRisparmioCategory} onBack={() => setShowRisparmioPanel(false)} /></DialogContent></Dialog>
      <Dialog open={showVantaggiPanel} onOpenChange={setShowVantaggiPanel}><DialogContent className="bg-slate-900 border-slate-700 max-w-lg max-h-[90vh] overflow-y-auto p-4"><VantaggiAdminPanel onBack={() => setShowVantaggiPanel(false)} /></DialogContent></Dialog>

      <Dialog open={showSimulatorePanel} onOpenChange={setShowSimulatorePanel}><DialogContent className="bg-slate-900 border-slate-700 max-w-lg max-h-[90vh] overflow-y-auto p-0"><DialogHeader className="p-4 border-b border-slate-700 sticky top-0 bg-slate-900 z-10"><DialogTitle className="text-white flex items-center gap-2"><Calculator className="w-5 h-5 text-[#d4af37]" />Simulatore Fiscale</DialogTitle></DialogHeader><div className="p-4"><SimulatoreFiscaleAdmin user={user} /></div></DialogContent></Dialog>
      <Dialog open={showImportExportPanel} onOpenChange={setShowImportExportPanel}><DialogContent className="bg-slate-900 border-slate-700 max-w-lg max-h-[90vh] overflow-y-auto p-0"><DialogHeader className="p-4 border-b border-slate-700 sticky top-0 bg-slate-900 z-10"><DialogTitle className="text-white flex items-center gap-2"><Globe className="w-5 h-5 text-[#d4af37]" />Import / Export</DialogTitle></DialogHeader><div className="p-4"><ImportExportAdmin user={user} /></div></DialogContent></Dialog>
      <Dialog open={showCostoPersonalePanel} onOpenChange={setShowCostoPersonalePanel}><DialogContent className="bg-slate-900 border-slate-700 max-w-lg max-h-[90vh] overflow-y-auto p-0"><DialogHeader className="p-4 border-b border-slate-700 sticky top-0 bg-slate-900 z-10"><DialogTitle className="text-white flex items-center gap-2"><Database className="w-5 h-5 text-violet-400" />Costo del Personale — DB Normativo</DialogTitle></DialogHeader><div className="p-4"><CostoPersonaleAdmin user={user} /></div></DialogContent></Dialog>
      <Dialog open={showVideoRecensioniPanel} onOpenChange={setShowVideoRecensioniPanel}><DialogContent className="bg-slate-900 border-slate-700 max-w-lg max-h-[90vh] overflow-y-auto p-0"><DialogHeader className="p-4 border-b border-slate-700 sticky top-0 bg-slate-900 z-10"><DialogTitle className="text-white flex items-center gap-2"><Star className="w-5 h-5 text-[#d4af37]" />Video Recensioni</DialogTitle></DialogHeader><div className="p-4"><VideoRecensioniAdmin user={user} /></div></DialogContent></Dialog>

      <Dialog open={showAbbonamentiPanel} onOpenChange={setShowAbbonamentiPanel}><DialogContent className="bg-slate-900 border-slate-700 max-w-lg max-h-[90vh] overflow-y-auto p-0"><DialogHeader className="p-4 border-b border-slate-700 sticky top-0 bg-slate-900 z-10"><DialogTitle className="text-white flex items-center gap-2"><DollarSign className="w-5 h-5 text-[#d4af37]" />Gestione Abbonamenti</DialogTitle></DialogHeader><div className="p-4"><AbbonamentiAdmin /></div></DialogContent></Dialog>

      {/* Consulenze Panel */}
      <Dialog open={showConsulenzePanel} onOpenChange={setShowConsulenzePanel}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-lg max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 border-b border-slate-700 sticky top-0 bg-slate-900 z-10"><DialogTitle className="text-white flex items-center gap-2"><Briefcase className="w-5 h-5 text-lime-400" />Gestione Consulenze</DialogTitle></DialogHeader>
          <div className="p-4">
            <Tabs defaultValue="consulenti" className="w-full">
              <TabsList className="w-full bg-slate-800 border border-slate-700 mb-4 grid grid-cols-4">
                <TabsTrigger value="consulenti" className="text-[10px] data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900">Consulenti</TabsTrigger>
                <TabsTrigger value="prenotazioni" className="text-[10px] data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900 relative">Prenotazioni{pendingConsultationBookings > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center">{pendingConsultationBookings}</span>}</TabsTrigger>
                <TabsTrigger value="messaggi" className="text-[10px] data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900 relative">Messaggi{unreadConsultationMessages > 0 && <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center">{unreadConsultationMessages}</span>}</TabsTrigger>
                <TabsTrigger value="zone" className="text-[10px] data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900">Zone</TabsTrigger>
              </TabsList>

              <TabsContent value="consulenti" className="space-y-4">
                <div className="flex justify-end"><Button onClick={() => setShowInviteForm(true)} className="bg-lime-400 hover:bg-lime-500 text-slate-900"><UserPlus className="w-4 h-4 mr-2" />Invita</Button></div>
                <div className="space-y-2">
                  <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Cerca consulenti..." value={searchTermConsultant} onChange={(e) => setSearchTermConsultant(e.target.value)} className="bg-slate-800 border-slate-700 text-white pl-9 h-9 text-sm" /></div>
                  <Select value={selectedZoneConsultant} onValueChange={setSelectedZoneConsultant}><SelectTrigger className="bg-slate-800 border-slate-700 text-white h-9 text-sm"><SelectValue placeholder="Filtra per zona" /></SelectTrigger><SelectContent><SelectItem value="all">Tutte le zone</SelectItem>{zones.map(z => <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>)}</SelectContent></Select>
                </div>
                {pendingInvitesConsultants.length > 0 && <Card className="bg-amber-500/10 border-amber-500/30"><CardContent className="p-3"><div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-amber-400" /><h3 className="text-amber-400 font-medium text-xs">Inviti in attesa ({pendingInvitesConsultants.length})</h3></div><div className="space-y-2">{pendingInvitesConsultants.map(inv => <div key={inv.id} className="bg-slate-900 rounded-lg p-2 flex items-center justify-between"><div className="flex items-center gap-2"><Mail className="w-3 h-3 text-amber-400" /><div>{inv.consultant_name && <p className="text-white text-xs font-medium">{inv.consultant_name}</p>}<p className={`text-xs ${inv.consultant_name ? 'text-slate-400' : 'text-white'}`}>{inv.email}</p></div></div><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/20 h-6 w-6 p-0"><Trash2 className="w-3 h-3" /></Button></AlertDialogTrigger><AlertDialogContent className="bg-slate-800 border-slate-700"><AlertDialogHeader><AlertDialogTitle className="text-white">Cancellare?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600">Annulla</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteInviteConsultantMutation.mutate(inv.id)}>Elimina</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>)}</div></CardContent></Card>}
                {isLoadingConsultants ? <div className="text-center py-8"><div className="animate-spin w-6 h-6 border-2 border-lime-400 border-t-transparent rounded-full mx-auto" /></div> : (
                  <div className="space-y-2">
                    {filteredConsultants.length === 0 ? <Card className="bg-slate-800 border-slate-700"><CardContent className="p-4 text-center"><Briefcase className="w-10 h-10 text-slate-600 mx-auto mb-2" /><p className="text-slate-400 text-sm">Nessun consulente trovato</p></CardContent></Card> : filteredConsultants.map(c => (
                      <Card key={c.id} className="bg-slate-800 border-slate-700"><CardContent className="p-3">
                        <div className="flex items-start gap-2"><div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${c.is_blocked ? 'bg-red-500/20' : 'bg-lime-400/20'}`}><Briefcase className={`w-4 h-4 ${c.is_blocked ? 'text-red-400' : 'text-lime-400'}`} /></div><div className="flex-1 min-w-0"><div className="flex items-center gap-1 flex-wrap"><p className="text-white font-medium truncate text-xs">{c.name||'N/A'}</p>{c.is_blocked && <Badge className="bg-red-500/20 text-red-400 border-0 text-[10px]">Bloccato</Badge>}</div><p className="text-lime-400 text-[10px] truncate">{c.category}</p><p className="text-slate-400 text-[10px] truncate">{c.email}</p>{c.zona && <Badge className="bg-blue-500/20 text-blue-400 border-0 text-[10px] mt-0.5">{c.zona}</Badge>}</div></div>
                        <div className="flex gap-1 mt-2">
                          <Button variant="outline" size="sm" className="flex-1 border-lime-400 text-lime-400 hover:bg-lime-400/20 h-7 text-[10px]" onClick={() => handleEditConsultant(c)}><Edit className="w-3 h-3 mr-1" />Modifica</Button>
                          <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700 h-7 w-7 p-0" onClick={() => handleOpenSections(c)}><Settings className="w-3 h-3" /></Button>
                          <AlertDialog><AlertDialogTrigger asChild><Button variant="outline" size="sm" className={`h-7 w-7 p-0 ${c.is_blocked ? 'border-green-600 text-green-400 hover:bg-green-600/20' : 'border-red-600 text-red-400 hover:bg-red-600/20'}`}>{c.is_blocked ? <Phone className="w-3 h-3" /> : <PhoneOff className="w-3 h-3" />}</Button></AlertDialogTrigger><AlertDialogContent className="bg-slate-800 border-slate-700"><AlertDialogHeader><AlertDialogTitle className="text-white">{c.is_blocked ? 'Sbloccare?' : 'Bloccare?'}</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600">Annulla</AlertDialogCancel><AlertDialogAction className={c.is_blocked ? "bg-green-600" : "bg-red-600"} onClick={() => toggleBlockConsultantMutation.mutate({ consultantId: c.id, isBlocked: c.is_blocked, consultantEmail: c.email })}>{c.is_blocked ? 'Sblocca' : 'Blocca'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                          <AlertDialog><AlertDialogTrigger asChild><Button variant="outline" size="sm" className="border-red-600 text-red-400 hover:bg-red-600/20 h-7 w-7 p-0"><Trash2 className="w-3 h-3" /></Button></AlertDialogTrigger><AlertDialogContent className="bg-slate-800 border-slate-700"><AlertDialogHeader><AlertDialogTitle className="text-white">Eliminare?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600">Annulla</AlertDialogCancel><AlertDialogAction className="bg-red-600" onClick={() => deleteConsultantMutation.mutate(c.id)}>Elimina</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                        </div>
                      </CardContent></Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="prenotazioni" className="space-y-3">
                <h3 className="text-white font-medium text-sm">Prenotazioni Consulenze</h3>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={bookingStatusFilter} onValueChange={setBookingStatusFilter}><SelectTrigger className="bg-slate-800 border-slate-700 text-white h-8 text-[10px]"><SelectValue placeholder="Stato" /></SelectTrigger><SelectContent><SelectItem value="all">Tutti</SelectItem><SelectItem value="pending">In attesa</SelectItem><SelectItem value="dates_proposed">Date proposte</SelectItem><SelectItem value="confirmed">Confermata</SelectItem><SelectItem value="completed">Completata</SelectItem><SelectItem value="cancelled">Annullata</SelectItem></SelectContent></Select>
                  <Select value={bookingZoneFilter} onValueChange={setBookingZoneFilter}><SelectTrigger className="bg-slate-800 border-slate-700 text-white h-8 text-[10px]"><SelectValue placeholder="Zona" /></SelectTrigger><SelectContent><SelectItem value="all">Tutte</SelectItem>{zones.map(z => <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>)}</SelectContent></Select>
                  <Select value={bookingConsultantFilter} onValueChange={setBookingConsultantFilter}><SelectTrigger className="bg-slate-800 border-slate-700 text-white h-8 text-[10px]"><SelectValue placeholder="Consulente" /></SelectTrigger><SelectContent><SelectItem value="all">Tutti</SelectItem>{consultants.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
                </div>
                {(() => {
                  const fb = consultationBookings.filter(b => { const c = consultants.find(x => x.id === b.consultant_id); return (bookingStatusFilter === 'all' || b.status === bookingStatusFilter) && (bookingZoneFilter === 'all' || c?.zona === bookingZoneFilter) && (bookingConsultantFilter === 'all' || b.consultant_id === bookingConsultantFilter); });
                  if (fb.length === 0) return <p className="text-slate-400 text-xs text-center py-4">Nessuna prenotazione</p>;
                  const sc = { pending: 'bg-yellow-500', dates_proposed: 'bg-blue-500', confirmed: 'bg-green-600', awaiting_user_confirmation: 'bg-purple-500', completed: 'bg-slate-500', cancelled: 'bg-red-500' };
                  const sl = { pending: 'In attesa', dates_proposed: 'Date proposte', confirmed: 'Confermata', awaiting_user_confirmation: 'Attesa conferma', completed: 'Completata', cancelled: 'Annullata' };
                  return fb.map(b => { const c = consultants.find(x => x.id === b.consultant_id); return (
                    <Card key={b.id} className="bg-slate-800 border-slate-700"><CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2"><Badge className={`${sc[b.status]||'bg-slate-500'} text-white text-[10px]`}>{sl[b.status]||b.status}</Badge><span className="text-slate-400 text-[10px]">{new Date(b.created_date).toLocaleDateString('it-IT')}</span></div>
                      <p className="text-lime-400 font-medium text-xs">{c?.category||'N/D'}</p><p className="text-white text-xs">{c?.name||'N/D'}</p>
                      {c?.zona && <Badge className="bg-blue-500/20 text-blue-400 border-0 text-[10px] mt-1">{c.zona}</Badge>}
                      <p className="text-slate-400 text-[10px] mt-1">Utente: {b.user_email}</p>
                      {b.meeting_preference && <p className="text-slate-500 text-[10px]">Modalità: {b.meeting_preference === 'online' ? '💻 Online' : b.meeting_preference === 'sede_azienda' ? '🏢 Sede azienda' : '📍 Sede consulente'}</p>}
                      {b.scheduled_date && <p className="text-green-400 text-[10px]">📅 {new Date(b.scheduled_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>}
                      {b.subject && <div className="bg-slate-900 rounded p-2 mt-2"><p className="text-slate-300 text-[10px]">{b.subject}</p></div>}
                      <div className="flex gap-1 mt-2">
                        <Link to={`${createPageUrl('Messaggi')}?contact=${encodeURIComponent(b.user_email)}`} className="flex-1"><Button variant="outline" size="sm" className="w-full border-lime-400 text-lime-400 hover:bg-lime-400/20 h-6 text-[10px]"><Mail className="w-3 h-3 mr-1" />Utente</Button></Link>
                        {c?.email && <Link to={`${createPageUrl('Messaggi')}?contact=${encodeURIComponent(c.email)}`} className="flex-1"><Button variant="outline" size="sm" className="w-full border-blue-400 text-blue-400 hover:bg-blue-400/20 h-6 text-[10px]"><Mail className="w-3 h-3 mr-1" />Consulente</Button></Link>}
                        <AlertDialog><AlertDialogTrigger asChild><Button variant="outline" size="sm" className="border-red-600 text-red-400 hover:bg-red-600/20 h-6 w-6 p-0"><Trash2 className="w-3 h-3" /></Button></AlertDialogTrigger><AlertDialogContent className="bg-slate-800 border-slate-700"><AlertDialogHeader><AlertDialogTitle className="text-white">Eliminare?</AlertDialogTitle><AlertDialogDescription className="text-slate-400">La prenotazione verrà rimossa.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600">Annulla</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={async () => { await base44.entities.ConsultationBooking.delete(b.id); queryClient.invalidateQueries({ queryKey: ['consultation-bookings-admin'] }); }}>Elimina</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                      </div>
                    </CardContent></Card>
                  ); });
                })()}
              </TabsContent>

              <TabsContent value="messaggi" className="space-y-3">
                <h3 className="text-white font-medium text-sm">Conversazioni Utenti ↔ Consulenti</h3>
                {(() => {
                  const cmap = {};
                  consultationMessages.forEach(msg => { const emails = [msg.from_email, msg.to_email].sort(); const k = emails.join('_'); if (!cmap[k]) { const p1 = { email: emails[0], name: msg.from_email === emails[0] ? msg.from_name : msg.to_name, type: msg.from_email === emails[0] ? msg.from_type : msg.to_type }; const p2 = { email: emails[1], name: msg.from_email === emails[1] ? msg.from_name : msg.to_name, type: msg.from_email === emails[1] ? msg.from_type : msg.to_type }; const [az, co] = p1.type === 'consulente' ? [p2, p1] : [p1, p2]; cmap[k] = { key: k, azienda: az, consulente: co, messages: [], lastMessageDate: null }; } cmap[k].messages.push(msg); });
                  const convs = Object.values(cmap).map(c => { c.messages.sort((a,b) => new Date(a.created_date)-new Date(b.created_date)); c.lastMessageDate = c.messages[c.messages.length-1]?.created_date; c.totalMessages = c.messages.length; return c; }).sort((a,b) => new Date(b.lastMessageDate)-new Date(a.lastMessageDate));
                  if (convs.length === 0) return <p className="text-slate-400 text-xs text-center py-4">Nessuna conversazione</p>;
                  return convs.map(cv => (<Card key={cv.key} className="bg-slate-800 border-slate-700 cursor-pointer hover:bg-slate-700" onClick={() => setSelectedConsulenzaConversation(cv)}><CardContent className="p-3"><div className="flex items-center gap-3"><div className="flex-1 min-w-0"><p className="text-white text-sm"><span className="font-bold">{cv.azienda?.name}</span><span className="text-slate-500 mx-2">↔</span><span className="text-blue-400">{cv.consulente?.name}</span></p><p className="text-slate-400 text-xs mt-1">{cv.totalMessages} messaggi</p></div><ChevronRight className="w-5 h-5 text-slate-500" /></div></CardContent></Card>));
                })()}
                {selectedConsulenzaConversation && (
                  <Dialog open={!!selectedConsulenzaConversation} onOpenChange={() => setSelectedConsulenzaConversation(null)}>
                    <DialogContent className="bg-slate-900 border-slate-700 max-w-lg max-h-[80vh] overflow-y-auto">
                      <DialogHeader><DialogTitle className="text-white text-sm">{selectedConsulenzaConversation.azienda?.name} ↔ {selectedConsulenzaConversation.consulente?.name}</DialogTitle></DialogHeader>
                      <div className="space-y-3 max-h-[50vh] overflow-y-auto px-2 py-3 bg-slate-950 rounded-lg">
                        {selectedConsulenzaConversation.messages.map(msg => { const isA = msg.from_email === selectedConsulenzaConversation.azienda?.email; return (<div key={msg.id} className={`flex ${isA ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] rounded-2xl px-3 py-2 ${isA ? 'bg-lime-400 text-slate-900 rounded-br-sm' : 'bg-slate-600 text-white rounded-bl-sm'}`}><p className={`text-[10px] font-bold mb-1 ${isA ? 'text-slate-700' : 'text-slate-300'}`}>{msg.from_name} {isA ? '(Azienda)' : '(Consulente)'}</p><p className="text-sm whitespace-pre-wrap">{msg.content ? msg.content.charAt(0).toUpperCase() + msg.content.slice(1).toLowerCase() : ''}</p><p className={`text-[10px] mt-1 ${isA ? 'text-slate-600' : 'text-slate-400'}`}>{new Date(msg.created_date).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p></div></div>); })}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </TabsContent>

              <TabsContent value="zone" className="space-y-3"><ZoneManagerSimple /></TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}