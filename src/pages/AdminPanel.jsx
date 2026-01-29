import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Users, Video, Calendar, Briefcase, Settings, Bell, CheckCircle, XCircle, Clock, Trash2, Mail, Eye, MessageSquare, CalendarDays, MapPin, DollarSign, Sparkles, Euro, ShoppingBag, BookOpen, Handshake, Truck, Heart, FileSearch, Globe, Shield, User, UserPlus, Search, Edit, Phone, PhoneOff, Save, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import RisparmioRequestsAdmin from '../components/admin/RisparmioRequestsAdmin';
import InviteConsultantForm from '../components/admin/InviteConsultantForm';
import AdminMessagesView from '../components/admin/AdminMessagesView';

const CONSULTANT_CATEGORIES = [
  "Stampa Digitale e Cataloghi",
  "Assicurazioni Aziendali",
  "Agenzia di Comunicazione",
  "Commercialista",
  "Igiene e Sicurezza",
  "Internazionalizzazione/Export",
  "Broker Energetico",
  "Avvocato",
  "Bandi Europei",
  "Affitto Stampanti/Cyber Sicurezza",
  "Efficientamento Energetico/Centralini"
];

const SECTIONS = [
  { id: 'calendario', label: 'Calendario Incontri' },
  { id: 'video_interviste', label: 'Video Interviste' },
  { id: 'cultura_aziendale', label: 'Academy' },
  { id: 'consulenze', label: 'Consulenze' },
  { id: 'finanziamenti', label: 'Finanziamenti Agevolati' },
  { id: 'contatta_membri', label: 'Contatta Imprenditori' },
  { id: 'risparmio_energetico', label: 'Risparmio' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'imprenditori', label: 'Consigli da Imprenditori' },
  { id: 'fornitori', label: 'Ricerca Fornitori' },
  { id: 'welfare_aziendale', label: 'Welfare Aziendale' },
  { id: 'analisi_contratti', label: 'Analisi Contratti' },
  { id: 'import_export', label: 'Import/Export' },
  { id: 'compliance', label: 'Compliance Aziendale' },
];

export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [showImpersonationDialog, setShowImpersonationDialog] = useState(false);
  const { impersonation, startImpersonation, appMode } = useImpersonation();

  // Stati per tab Consulenze
  const [searchTermConsultant, setSearchTermConsultant] = useState('');
  const [selectedZoneConsultant, setSelectedZoneConsultant] = useState('all');
  const [selectedConsultant, setSelectedConsultant] = useState(null);
  const [showSections, setShowSections] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [formDataConsultant, setFormDataConsultant] = useState(null);
  const [sectionsData, setSectionsData] = useState([]);
  
  // Stati per filtri prenotazioni
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');
  const [bookingZoneFilter, setBookingZoneFilter] = useState('all');
  const [bookingConsultantFilter, setBookingConsultantFilter] = useState('all');

  const queryClient = useQueryClient();
  const navigate = useNavigate();

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



  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [users, events, videos, consultants] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Event.list(),
        base44.entities.Video.list(),
        base44.entities.Consultant.list()
      ]);
      console.log('[AdminPanel] Tutti gli utenti dal database:', users);
      const filteredUsers = users;
      return {
        totalUsers: filteredUsers.length,
        activeUsers: filteredUsers.filter(u => !u.is_blocked).length,
        totalEvents: events.length,
        totalVideos: videos.length,
        totalConsultants: consultants.length
      };
    }
  });

  const { data: consultants = [], isLoading: isLoadingConsultants } = useQuery({
    queryKey: ['consultants'],
    queryFn: () => base44.entities.Consultant.list(),
  });

  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: () => base44.entities.Zone.filter({ is_active: true }),
  });

  const { data: pendingInvitesConsultants = [] } = useQuery({
    queryKey: ['pending-invites-consultants'],
    queryFn: async () => {
      const invites = await base44.entities.PendingInvite.filter({ user_type: 'consulente' });
      return invites.filter(i => !i.is_registered);
    },
  });

  const { data: consultationBookings = [] } = useQuery({
    queryKey: ['consultation-bookings-admin'],
    queryFn: () => base44.entities.ConsultationBooking.list('-created_date'),
  });

  const pendingConsultationBookings = consultationBookings.filter(b => b.status === 'pending').length;

  // Messaggi nella sezione consulenze (tra utenti e consulenti)
  const { data: consultationMessages = [] } = useQuery({
    queryKey: ['consultation-messages-admin'],
    queryFn: async () => {
      const allMessages = await base44.entities.Message.filter({ source: 'consulenze' });
      const users = await base44.entities.User.list();
      const consultantsList = await base44.entities.Consultant.list();
      
      // Restituisci tutti i messaggi con info mittente/destinatario
      return allMessages.map(msg => {
        const fromUser = users.find(u => u.email === msg.from_email);
        const toUser = users.find(u => u.email === msg.to_email);
        const fromConsultant = consultantsList.find(c => c.email === msg.from_email);
        const toConsultant = consultantsList.find(c => c.email === msg.to_email);
        
        return {
          ...msg,
          from_name: fromUser?.company_name || fromUser?.full_name || fromConsultant?.name || msg.from_email,
          to_name: toUser?.company_name || toUser?.full_name || toConsultant?.name || msg.to_email,
          from_type: fromConsultant ? 'consulente' : 'utente',
          to_type: toConsultant ? 'consulente' : 'utente'
        };
      }).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
  });

  const unreadConsultationMessages = consultationMessages.filter(m => !m.is_read).length;

  const { data: consultationRequests = [] } = useQuery({
    queryKey: ['consultation-requests'],
    queryFn: async () => {
      const requests = await base44.entities.GrantInterest.filter({ 
        requested_consultation: true 
      });
      
      const users = await base44.entities.User.list();
      const grants = await base44.entities.FinancialGrant.list();
      
      return requests.map(req => ({
        ...req,
        user: users.find(u => u.email === req.user_email),
        grant: grants.find(g => g.id === req.grant_id)
      }));
    }
  });

  const { data: videoInterviewRequests = [] } = useQuery({
    queryKey: ['video-interview-requests'],
    queryFn: () => base44.entities.VideoInterviewRequest.list('-created_date'),
  });

  const pendingVideoRequests = videoInterviewRequests.filter(r => r.status === 'pending');

  // Notifiche risposte eventi
  const { data: eventResponseNotifications = [] } = useQuery({
    queryKey: ['event-response-notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ 
      user_email: user?.email, 
      type: 'event_response',
      is_read: false 
    }),
    enabled: !!user?.email,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-admin'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: allEvents = [] } = useQuery({
    queryKey: ['all-events-admin'],
    queryFn: () => base44.entities.Event.list('-date'),
  });

  const [showVideoRequests, setShowVideoRequests] = useState(false);
  const [showAllMessages, setShowAllMessages] = useState(false);
  const [showConsultationMessages, setShowConsultationMessages] = useState(false);
  const [activeTab, setActiveTab] = useState('richieste');
  const [showConsulenzePanel, setShowConsulenzePanel] = useState(false);
  const [showAdminMessages, setShowAdminMessages] = useState(false);

  const markVideoRequestReadMutation = useMutation({
    mutationFn: async (requestId) => {
      await base44.entities.VideoInterviewRequest.update(requestId, { status: 'read' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-interview-requests'] });
    }
  });

  const deleteVideoRequestMutation = useMutation({
    mutationFn: async (requestId) => {
      await base44.entities.VideoInterviewRequest.delete(requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-interview-requests'] });
    }
  });

  const pendingRequests = consultationRequests.filter(r => r.consultation_status === 'pending');

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', user?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: user?.email, is_read: false }),
    enabled: !!user?.email,
  });

  // Tutti i messaggi ricevuti dagli utenti e consulenti per l'admin (ESCLUSI quelli delle consulenze)
  const { data: allAdminMessages = [] } = useQuery({
    queryKey: ['all-admin-messages'],
    queryFn: async () => {
      const allMessages = await base44.entities.Message.list('-created_date');
      const users = await base44.entities.User.list();
      const consultants = await base44.entities.Consultant.list();
      
      // Filtra messaggi inviati all'admin ESCLUDENDO quelli con source 'consulenze'
      const adminMessages = allMessages.filter(m => m.to_email === user?.email && m.source !== 'consulenze');
      
      return adminMessages.map(msg => {
        const sender = users.find(u => u.email === msg.from_email);
        const consultant = consultants.find(c => c.email === msg.from_email);
        return {
          ...msg,
          sender_name: sender?.company_name || sender?.full_name || consultant?.name || msg.from_email,
          sender_type: consultant ? 'consulente' : 'utente'
        };
      });
    },
    enabled: !!user?.email,
  });

  const unreadAdminMessages = allAdminMessages.filter(m => !m.is_read);

  const markMessageReadMutation = useMutation({
    mutationFn: async (messageId) => {
      await base44.entities.Message.update(messageId, { is_read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-admin-messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
    }
  });

  const updateConsultationStatusMutation = useMutation({
    mutationFn: async ({ requestId, status, userEmail, grantTitle }) => {
      await base44.entities.GrantInterest.update(requestId, { consultation_status: status });
      
      if (status === 'accepted') {
        // Crea messaggio per l'utente
        await base44.entities.Message.create({
          from_email: user.email,
          to_email: userEmail,
          content: `La tua richiesta di consulenza per il bando "${grantTitle}" è stata presa in carico. Verrai contattato a breve da un nostro consulente.`,
          conversation_id: `admin_${user.email}_${userEmail}`
        });
        
        // Crea notifica
        await base44.entities.Notification.create({
          user_email: userEmail,
          type: 'consultation',
          title: 'Richiesta accettata',
          content: `La tua richiesta di consulenza per "${grantTitle}" è stata accettata`,
          reference_id: requestId
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultation-requests'] });
    }
  });

  const deleteConsultationRequestMutation = useMutation({
    mutationFn: async (requestId) => {
      await base44.entities.GrantInterest.delete(requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultation-requests'] });
    }
  });

  // Mutations per gestione consulenti
  const toggleBlockConsultantMutation = useMutation({
    mutationFn: async ({ consultantId, isBlocked, consultantEmail }) => {
      await base44.entities.Consultant.update(consultantId, { is_blocked: !isBlocked });
      if (consultantEmail) {
        const users = await base44.entities.User.filter({ email: consultantEmail.toLowerCase() });
        if (users.length > 0) {
          await base44.entities.User.update(users[0].id, { 
            is_blocked: !isBlocked,
            block_reason: !isBlocked ? 'bloccato_da_admin' : null
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    }
  });

  const updateConsultantMutation = useMutation({
    mutationFn: async ({ consultantId, data }) => {
      return base44.entities.Consultant.update(consultantId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
      setShowEditForm(false);
      setFormDataConsultant(null);
      setSelectedConsultant(null);
    }
  });

  const updateSectionsMutation = useMutation({
    mutationFn: async ({ consultantId, sections }) => {
      await base44.entities.Consultant.update(consultantId, { assigned_sections: sections });
      const invite = pendingInvitesConsultants.find(i => i.email === selectedConsultant?.email);
      if (invite) {
        await base44.entities.PendingInvite.update(invite.id, { assigned_sections: sections });
      }
      if (selectedConsultant?.email) {
        const users = await base44.entities.User.filter({ email: selectedConsultant.email.toLowerCase() });
        if (users.length > 0) {
          const userToUpdate = users[0];
          const allSections = ['calendario', 'video_interviste', 'cultura_aziendale', 'consulenze',
            'finanziamenti', 'contatta_membri', 'risparmio_energetico', 'marketplace',
            'imprenditori', 'fornitori', 'welfare_aziendale', 'analisi_contratti',
            'import_export', 'compliance'];
          const permissions = {};
          allSections.forEach(section => { permissions[section] = false; });
          sections.forEach(section => { permissions[section] = true; });
          permissions.consulenze = true;
          await base44.entities.User.update(userToUpdate.id, { permissions });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
      queryClient.invalidateQueries({ queryKey: ['pending-invites-consultants'] });
      setShowSections(false);
      setSelectedConsultant(null);
    }
  });

  const deleteConsultantMutation = useMutation({
    mutationFn: async (consultantId) => {
      return base44.entities.Consultant.delete(consultantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    }
  });

  const deleteInviteConsultantMutation = useMutation({
    mutationFn: async (inviteId) => {
      return base44.entities.PendingInvite.delete(inviteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invites-consultants'] });
    }
  });

  // Filtri e handlers consulenti
  const filteredConsultants = consultants.filter(consultant => {
    const searchLower = searchTermConsultant.toLowerCase();
    const matchesSearch = (
      consultant.name?.toLowerCase().includes(searchLower) ||
      consultant.email?.toLowerCase().includes(searchLower) ||
      consultant.category?.toLowerCase().includes(searchLower)
    );
    const matchesZone = selectedZoneConsultant === 'all' || consultant.zona === selectedZoneConsultant;
    return matchesSearch && matchesZone;
  });

  const handleEditConsultant = (consultant) => {
    setFormDataConsultant({
      name: consultant.name || '',
      category: consultant.category || '',
      email: consultant.email || '',
      phone: consultant.phone || '',
      city: consultant.city || '',
      referente: consultant.referente || '',
      cellulare_referente: consultant.cellulare_referente || '',
      zona: consultant.zona || '',
    });
    setSelectedConsultant(consultant);
    setShowEditForm(true);
  };

  const handleOpenSections = (consultant) => {
    const invite = pendingInvitesConsultants.find(i => i.email === consultant.email);
    const sections = consultant.assigned_sections || invite?.assigned_sections || [];
    setSectionsData(sections);
    setSelectedConsultant(consultant);
    setShowSections(true);
  };

  const toggleSection = (sectionId) => {
    setSectionsData(prev => 
      prev.includes(sectionId) 
        ? prev.filter(s => s !== sectionId)
        : [...prev, sectionId]
    );
  };

  const selectAllSections = () => {
    setSectionsData(SECTIONS.map(s => s.id));
  };

  const deselectAllSections = () => {
    setSectionsData([]);
  };

  if (!user) {
    return null;
  }
  
  if (appMode === 'user' && user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-white text-xl font-bold">Pannello Admin</h1>
          <p className="text-slate-400 text-xs">
            {new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
          </p>
        </div>

        {/* Stats Grid compatto */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Link to={createPageUrl('GestioneMembri')}>
            <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700">
              <CardContent className="p-2 text-center">
                <Users className="w-5 h-5 text-lime-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{stats?.activeUsers || 0}</p>
                <p className="text-slate-400 text-[10px]">Utenti</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Link rapidi Gestione */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Link to={createPageUrl('GestioneCostiAI')}>
            <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700">
              <CardContent className="p-2 text-center">
                <DollarSign className="w-5 h-5 text-lime-400 mx-auto mb-1" />
                <p className="text-white text-[10px]">Costi AI</p>
              </CardContent>
            </Card>
          </Link>
          <Link to={createPageUrl('GestioneZone')}>
            <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700">
              <CardContent className="p-2 text-center">
                <MapPin className="w-5 h-5 text-lime-400 mx-auto mb-1" />
                <p className="text-white text-[10px]">Zone</p>
              </CardContent>
            </Card>
          </Link>
        </div>
        
        {/* Link Bandi separato */}
        <div className="mb-4">
          <Link to={createPageUrl('GestioneBandi')}>
            <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700">
              <CardContent className="p-3 flex items-center justify-center gap-2">
                <Briefcase className="w-5 h-5 text-lime-400" />
                <p className="text-white text-xs">Gestione Bandi</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Sezioni Home - griglia di card linkate */}
        <div className="mb-6">
          <h2 className="text-white font-semibold text-sm mb-3">Sezioni Home</h2>
          <div className="grid grid-cols-3 gap-2">
            <Link to={createPageUrl('CalendarioIncontri')}>
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20 relative">
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <Calendar className="w-5 h-5 text-lime-400 mb-1" />
                  <p className="text-white text-[10px] text-center leading-tight">Calendario<br/>incontri</p>
                  <span className="absolute top-1 right-1 bg-lime-400 text-slate-900 text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {stats?.totalEvents || 0}
                  </span>
                  <span className="absolute top-1 left-1 text-slate-400">
                    <Bell className="w-3 h-3" />
                  </span>
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('VideoInterviste')}>
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20 relative">
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <Video className="w-5 h-5 text-lime-400 mb-1" />
                  <p className="text-white text-[10px] text-center leading-tight">Video<br/>interviste</p>
                  <span className="absolute top-1 right-1 bg-lime-400 text-slate-900 text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {stats?.totalVideos || 0}
                  </span>
                  {pendingVideoRequests.length > 0 ? (
                    <span className="absolute top-1 left-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                      <Bell className="w-2.5 h-2.5" />
                    </span>
                  ) : (
                    <span className="absolute top-1 left-1 text-slate-400">
                      <Bell className="w-3 h-3" />
                    </span>
                  )}
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('CulturaAziendale')}>
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20 relative">
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <BookOpen className="w-5 h-5 text-lime-400 mb-1" />
                  <p className="text-white text-[10px] text-center leading-tight">Academy</p>
                  <span className="absolute top-1 left-1 text-slate-400">
                    <Bell className="w-3 h-3" />
                  </span>
                </CardContent>
              </Card>
            </Link>
            <Card 
              className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20 relative cursor-pointer"
              onClick={() => setShowConsulenzePanel(true)}
            >
              <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                <Briefcase className="w-5 h-5 text-lime-400 mb-1" />
                <p className="text-white text-[10px] text-center leading-tight">Consulenze</p>
                {(stats?.totalConsultants || 0) > 0 && (
                  <span className="absolute top-1 right-1 bg-lime-400 text-slate-900 text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {stats?.totalConsultants || 0}
                  </span>
                )}
                {pendingConsultationBookings > 0 ? (
                  <span className="absolute top-1 left-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                    <Bell className="w-2.5 h-2.5" />
                  </span>
                ) : (
                  <span className="absolute top-1 left-1 text-slate-400">
                    <Bell className="w-3 h-3" />
                  </span>
                )}
              </CardContent>
            </Card>
            <Link to={createPageUrl('FinanziamentiAgevolati')}>
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20 relative">
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <Sparkles className="w-5 h-5 text-lime-400 mb-1" />
                  <p className="text-white text-[10px] text-center leading-tight">Finanziamenti<br/>agevolati</p>
                  <span className="absolute top-1 left-1 text-slate-400">
                    <Bell className="w-3 h-3" />
                  </span>
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('GestioneMembri')}>
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20 relative">
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <User className="w-5 h-5 text-lime-400 mb-1" />
                  <p className="text-white text-[10px] text-center leading-tight">Contatta<br/>Imprenditori</p>
                  <span className="absolute top-1 left-1 text-slate-400">
                    <Bell className="w-3 h-3" />
                  </span>
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('RisparmioEnergetico')}>
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20 relative">
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <Euro className="w-5 h-5 text-lime-400 mb-1" />
                  <p className="text-white text-[10px] text-center leading-tight">Risparmio</p>
                  <span className="absolute top-1 left-1 text-slate-400">
                    <Bell className="w-3 h-3" />
                  </span>
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('Marketplace')}>
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20 relative">
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <ShoppingBag className="w-5 h-5 text-lime-400 mb-1" />
                  <p className="text-white text-[10px] text-center leading-tight">Market<br/>place</p>
                  <span className="absolute top-1 left-1 text-slate-400">
                    <Bell className="w-3 h-3" />
                  </span>
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('Imprenditori')}>
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20 relative">
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <Handshake className="w-5 h-5 text-lime-400 mb-1" />
                  <p className="text-white text-[10px] text-center leading-tight">Consigli da<br/>Imprenditori</p>
                  <span className="absolute top-1 left-1 text-slate-400">
                    <Bell className="w-3 h-3" />
                  </span>
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('Fornitori')}>
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20 relative">
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <Truck className="w-5 h-5 text-lime-400 mb-1" />
                  <p className="text-white text-[10px] text-center leading-tight">Ricerca<br/>Fornitori</p>
                  <span className="absolute top-1 left-1 text-slate-400">
                    <Bell className="w-3 h-3" />
                  </span>
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('WelfareAziendale')}>
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20 relative">
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <Heart className="w-5 h-5 text-pink-400 mb-1" />
                  <p className="text-white text-[10px] text-center leading-tight">Welfare<br/>Aziendale</p>
                  <span className="absolute top-1 left-1 text-slate-400">
                    <Bell className="w-3 h-3" />
                  </span>
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('AnalisiContratti')}>
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20 relative">
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <FileSearch className="w-5 h-5 text-lime-400 mb-1" />
                  <p className="text-white text-[10px] text-center leading-tight">Analisi<br/>Contratti</p>
                  <span className="absolute top-1 left-1 text-slate-400">
                    <Bell className="w-3 h-3" />
                  </span>
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('ImportExport')}>
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20 relative">
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <Globe className="w-5 h-5 text-lime-400 mb-1" />
                  <p className="text-white text-[10px] text-center leading-tight">Import /<br/>Export</p>
                  <span className="absolute top-1 left-1 text-slate-400">
                    <Bell className="w-3 h-3" />
                  </span>
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('ComplianceAziendale')}>
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20 relative">
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <Shield className="w-5 h-5 text-blue-400 mb-1" />
                  <p className="text-white text-[10px] text-center leading-tight">Compliance<br/>Aziendale</p>
                  <span className="absolute top-1 left-1 text-slate-400">
                    <Bell className="w-3 h-3" />
                  </span>
                </CardContent>
              </Card>
            </Link>
            <Card 
              className="bg-slate-700 border-slate-600 hover:bg-slate-600 h-20 cursor-pointer relative"
              onClick={() => setShowAdminMessages(true)}
            >
              <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                <MessageSquare className="w-5 h-5 text-lime-400 mb-1" />
                <p className="text-white text-[10px] text-center leading-tight">Gestione<br/>Messaggi</p>
                <span className="absolute top-1 right-1 bg-lime-400 text-slate-900 text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {allAdminMessages.length}
                </span>
                {unreadAdminMessages.length > 0 ? (
                  <span className="absolute top-1 left-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                    <Bell className="w-2.5 h-2.5" />
                  </span>
                ) : (
                  <span className="absolute top-1 left-1 text-slate-400">
                    <Bell className="w-3 h-3" />
                  </span>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sezione Risposte Eventi (mostrata solo se ci sono notifiche) */}
        {eventResponseNotifications.length > 0 && (
          <Card className="bg-slate-800 border-slate-700 mb-4">
            <CardContent className="p-3">
              <h3 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-lime-400" />
                Risposte Eventi ({eventResponseNotifications.length})
              </h3>
              <div className="space-y-2">
                {eventResponseNotifications.slice(0, 5).map((notif) => {
                  const evento = allEvents.find(e => e.id === notif.reference_id);
                  return (
                    <div key={notif.id} className="bg-lime-400/10 border border-lime-400/30 rounded-lg p-3">
                      <p className="text-white text-sm">{notif.content}</p>
                      {evento && (
                        <p className="text-slate-400 text-xs mt-1">Evento: {evento.title}</p>
                      )}
                      <p className="text-slate-500 text-xs mt-1">
                        {notif.created_date ? new Date(notif.created_date).toLocaleDateString('it-IT', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : ''}
                      </p>
                    </div>
                  );
                })}
                {eventResponseNotifications.length > 5 && (
                  <Link to={createPageUrl('CalendarioIncontri')} className="block">
                    <p className="text-lime-400 text-xs text-center py-1 hover:underline">
                      Vedi tutti ({eventResponseNotifications.length})
                    </p>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}
          <TabsList className="w-full bg-slate-800 border border-slate-700 mb-4">
            <TabsTrigger value="richieste" className="flex-1 text-xs data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900">
              <div className="relative flex items-center gap-1">
                <Bell className="w-3.5 h-3.5" />
                Richieste
                {(pendingRequests.length + pendingVideoRequests.length + eventResponseNotifications.length) > 0 && (
                  <span className="bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                    {pendingRequests.length + pendingVideoRequests.length + eventResponseNotifications.length}
                  </span>
                )}
              </div>
            </TabsTrigger>
          </TabsList>

          {/* TAB RICHIESTE */}
          <TabsContent value="richieste" className="space-y-4">
            {/* Risposte Eventi */}
            {eventResponseNotifications.length > 0 && (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-3">
                  <h3 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-lime-400" />
                    Risposte Eventi ({eventResponseNotifications.length})
                  </h3>
                  <div className="space-y-2">
                    {eventResponseNotifications.slice(0, 5).map((notif) => {
                      const evento = allEvents.find(e => e.id === notif.reference_id);
                      return (
                        <div key={notif.id} className="bg-lime-400/10 border border-lime-400/30 rounded-lg p-3">
                          <p className="text-white text-sm">{notif.content}</p>
                          {evento && (
                            <p className="text-slate-400 text-xs mt-1">Evento: {evento.title}</p>
                          )}
                          <p className="text-slate-500 text-xs mt-1">
                            {notif.created_date ? new Date(notif.created_date).toLocaleDateString('it-IT', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : ''}
                          </p>
                        </div>
                      );
                    })}
                    {eventResponseNotifications.length > 5 && (
                      <Link to={createPageUrl('CalendarioIncontri')} className="block">
                        <p className="text-lime-400 text-xs text-center py-1 hover:underline">
                          Vedi tutti ({eventResponseNotifications.length})
                        </p>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}



      </main>

      <BottomNav currentPage="AdminPanel" unreadMessages={messages.length} />
      
      <ImpersonationDialog
        open={showImpersonationDialog}
        onClose={() => setShowImpersonationDialog(false)}
        onStart={(role, id, email, name) => {
          startImpersonation(role, id, email, name);
          navigate(createPageUrl('Home'));
        }}
      />

      {/* Dialog Messaggi Ricevuti */}
      <Dialog open={showAllMessages} onOpenChange={setShowAllMessages}>
        <DialogContent className="bg-slate-800 border-slate-700 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Messaggi da Utenti e Consulenti</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {allAdminMessages.length === 0 ? (
              <p className="text-slate-400 text-center py-8">Nessun messaggio ricevuto</p>
            ) : (
              allAdminMessages.map((msg) => (
                <Card key={msg.id} className={`border ${!msg.is_read ? 'bg-lime-400/10 border-lime-400/30' : 'bg-slate-900 border-slate-700'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="text-white font-bold">{msg.sender_name}</h3>
                        <p className="text-slate-400 text-xs">{msg.from_email}</p>
                        <p className="text-lime-400 text-xs">{msg.sender_type === 'consulente' ? '👔 Consulente' : '👤 Utente'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!msg.is_read && (
                          <span className="bg-lime-400 text-slate-900 text-xs font-bold px-2 py-1 rounded">NUOVO</span>
                        )}
                      </div>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3 mb-3">
                      <p className="text-white text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-slate-500 text-xs">
                        {msg.created_date ? new Date(msg.created_date).toLocaleDateString('it-IT', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </p>
                      <div className="flex gap-2">
                        {!msg.is_read && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-lime-400 text-lime-400 hover:bg-lime-400/20"
                            onClick={() => markMessageReadMutation.mutate(msg.id)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Segna letto
                          </Button>
                        )}
                        <Link to={createPageUrl('Messaggi')}>
                          <Button
                            size="sm"
                            className="bg-lime-400 hover:bg-lime-500 text-slate-900 [&>svg]:text-slate-900"
                          >
                            <Mail className="w-4 h-4 mr-1" />
                            Rispondi
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Messaggi Consulenze */}
      <Dialog open={showConsultationMessages} onOpenChange={setShowConsultationMessages}>
        <DialogContent className="bg-slate-800 border-slate-700 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Messaggi Consulenze (Utenti ↔ Consulenti)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {consultationMessages.length === 0 ? (
              <p className="text-slate-400 text-center py-8">Nessun messaggio tra utenti e consulenti</p>
            ) : (
              consultationMessages.map((msg) => (
                <Card key={msg.id} className={`border ${!msg.is_read ? 'bg-orange-400/10 border-orange-400/30' : 'bg-slate-900 border-slate-700'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${msg.from_type === 'consulente' ? 'bg-blue-500/20 text-blue-400' : 'bg-lime-400/20 text-lime-400'}`}>
                            {msg.from_type === 'consulente' ? '👔 Consulente' : '👤 Utente'}
                          </span>
                          <span className="text-slate-500">→</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${msg.to_type === 'consulente' ? 'bg-blue-500/20 text-blue-400' : 'bg-lime-400/20 text-lime-400'}`}>
                            {msg.to_type === 'consulente' ? '👔 Consulente' : '👤 Utente'}
                          </span>
                        </div>
                        <p className="text-white font-bold">{msg.from_name}</p>
                        <p className="text-slate-400 text-xs">→ {msg.to_name}</p>
                      </div>
                      {!msg.is_read && (
                        <span className="bg-orange-400 text-slate-900 text-xs font-bold px-2 py-1 rounded">NUOVO</span>
                      )}
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3 mb-3">
                      <p className="text-white text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-slate-500 text-xs">
                        {msg.created_date ? new Date(msg.created_date).toLocaleDateString('it-IT', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </p>
                      <Link to={`${createPageUrl('Messaggi')}?contact=${encodeURIComponent(msg.from_email)}`}>
                        <Button size="sm" className="bg-lime-400 hover:bg-lime-500 text-slate-900">
                          <Mail className="w-4 h-4 mr-1" />
                          Apri chat
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Richieste Video Interviste */}
      <Dialog open={showVideoRequests} onOpenChange={setShowVideoRequests}>
        <DialogContent className="bg-slate-800 border-slate-700 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Richieste Video Interviste</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {videoInterviewRequests.length === 0 ? (
              <p className="text-slate-400 text-center py-8">Nessuna richiesta ricevuta</p>
            ) : (
              videoInterviewRequests.map((request) => (
                <Card key={request.id} className={`border ${request.status === 'pending' ? 'bg-lime-400/10 border-lime-400/30' : 'bg-slate-900 border-slate-700'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-white font-bold">{request.requester_name}</h3>
                        <p className="text-slate-400 text-xs">{request.requester_email}</p>
                        {request.requester_phone && (
                          <p className="text-slate-400 text-xs">{request.requester_phone}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {request.status === 'pending' && (
                          <span className="bg-lime-400 text-slate-900 text-xs font-bold px-2 py-1 rounded">NUOVO</span>
                        )}
                        <button
                          onClick={() => {
                            if (confirm('Eliminare questa richiesta?')) {
                              deleteVideoRequestMutation.mutate(request.id);
                            }
                          }}
                          className="text-red-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3 mb-3">
                      <p className="text-white text-sm whitespace-pre-wrap">{request.message}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-slate-500 text-xs">
                        {request.created_date ? new Date(request.created_date).toLocaleDateString('it-IT', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </p>
                      {request.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-lime-400 text-lime-400 hover:bg-lime-400/20"
                          onClick={() => markVideoRequestReadMutation.mutate(request.id)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Segna come letto
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Consultant Dialog */}
      <Dialog open={showEditForm} onOpenChange={(open) => {
        setShowEditForm(open);
        if (!open) {
          setSelectedConsultant(null);
          setFormDataConsultant(null);
        }
      }}>
        <DialogContent className="bg-slate-800 border-slate-700 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Modifica Consulente</DialogTitle>
          </DialogHeader>
          
          {formDataConsultant && (
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-slate-300 text-sm">Nome/Studio *</Label>
                <Input
                  value={formDataConsultant.name}
                  onChange={(e) => setFormDataConsultant({...formDataConsultant, name: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                  placeholder="Nome consulente o studio"
                />
              </div>

              <div>
                <Label className="text-slate-300 text-sm">Categoria *</Label>
                <Select
                  value={formDataConsultant.category}
                  onValueChange={(value) => setFormDataConsultant({...formDataConsultant, category: value})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                    <SelectValue placeholder="Seleziona categoria..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSULTANT_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300 text-sm">Email</Label>
                <Input
                  type="email"
                  value={formDataConsultant.email}
                  onChange={(e) => setFormDataConsultant({...formDataConsultant, email: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                  placeholder="email@esempio.com"
                />
              </div>

              <div>
                <Label className="text-slate-300 text-sm">Telefono</Label>
                <Input
                  value={formDataConsultant.phone}
                  onChange={(e) => setFormDataConsultant({...formDataConsultant, phone: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                  placeholder="+39 02 1234567"
                />
              </div>

              <div>
                <Label className="text-slate-300 text-sm">Città</Label>
                <Input
                  value={formDataConsultant.city}
                  onChange={(e) => setFormDataConsultant({...formDataConsultant, city: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                  placeholder="Milano"
                />
              </div>

              <div>
                <Label className="text-slate-300 text-sm">Referente</Label>
                <Input
                  value={formDataConsultant.referente}
                  onChange={(e) => setFormDataConsultant({...formDataConsultant, referente: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                  placeholder="Nome referente"
                />
              </div>

              <div>
                <Label className="text-slate-300 text-sm">Cellulare Referente</Label>
                <Input
                  value={formDataConsultant.cellulare_referente}
                  onChange={(e) => setFormDataConsultant({...formDataConsultant, cellulare_referente: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                  placeholder="+39 333 1234567"
                />
              </div>

              <div>
                <Label className="text-lime-400 text-sm font-medium">Zona Assegnata *</Label>
                <Select
                  value={formDataConsultant.zona}
                  onValueChange={(value) => setFormDataConsultant({...formDataConsultant, zona: value})}
                >
                  <SelectTrigger className="bg-slate-900 border-lime-400 text-white mt-1">
                    <SelectValue placeholder="Seleziona zona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map(zone => (
                      <SelectItem key={zone.id} value={zone.name}>{zone.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-slate-500 text-xs mt-1">Il consulente sarà visibile solo agli utenti di questa zona</p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-700">
                <Button
                  variant="outline"
                  onClick={() => setShowEditForm(false)}
                  className="flex-1 border-slate-600 text-slate-400 hover:text-white"
                >
                  Annulla
                </Button>
                <Button
                  onClick={() => updateConsultantMutation.mutate({
                    consultantId: selectedConsultant.id,
                    data: formDataConsultant
                  })}
                  disabled={updateConsultantMutation.isPending || !formDataConsultant.name || !formDataConsultant.category}
                  className="flex-1 bg-lime-400 hover:bg-lime-500 text-slate-900"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateConsultantMutation.isPending ? 'Salvataggio...' : 'Salva Modifiche'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sections Dialog */}
      <Dialog open={showSections} onOpenChange={setShowSections}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Sezioni Visibili - {selectedConsultant?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">{sectionsData.length} sezioni selezionate</span>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={selectAllSections}
                  className="text-lime-400 text-xs hover:underline"
                >
                  Tutte
                </button>
                <span className="text-slate-600">|</span>
                <button 
                  type="button" 
                  onClick={deselectAllSections}
                  className="text-slate-400 text-xs hover:underline"
                >
                  Nessuna
                </button>
              </div>
            </div>
            
            <div className="bg-slate-900 rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
              {SECTIONS.map(section => (
                <div key={section.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`section-${section.id}`}
                    checked={sectionsData.includes(section.id)}
                    onCheckedChange={() => toggleSection(section.id)}
                    className="border-slate-600 data-[state=checked]:bg-lime-400 data-[state=checked]:border-lime-400"
                  />
                  <Label 
                    htmlFor={`section-${section.id}`} 
                    className="text-white text-sm cursor-pointer"
                  >
                    {section.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => updateSectionsMutation.mutate({ 
                consultantId: selectedConsultant.id, 
                sections: sectionsData 
              })}
              disabled={updateSectionsMutation.isPending}
              className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
            >
              {updateSectionsMutation.isPending ? 'Salvataggio...' : 'Salva Sezioni'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Consultant Dialog */}
      <Dialog open={showInviteForm} onOpenChange={setShowInviteForm}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-lime-400" />
              Invita Nuovo Consulente
            </DialogTitle>
          </DialogHeader>
          <InviteConsultantForm onSuccess={() => {
            setShowInviteForm(false);
            queryClient.invalidateQueries({ queryKey: ['consultants'] });
            queryClient.invalidateQueries({ queryKey: ['pending-invites-consultants'] });
          }} />
        </DialogContent>
      </Dialog>

      {/* Pannello Gestione Messaggi Admin */}
      <Dialog open={showAdminMessages} onOpenChange={setShowAdminMessages}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-lg max-h-[90vh] overflow-y-auto p-4">
          <AdminMessagesView onBack={() => setShowAdminMessages(false)} />
        </DialogContent>
      </Dialog>

      {/* Pannello Consulenze Full Screen */}
      <Dialog open={showConsulenzePanel} onOpenChange={setShowConsulenzePanel}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-lg max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
            <DialogTitle className="text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-lime-400" />
              Gestione Consulenze
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-4">
            {/* Tabs interne al pannello consulenze */}
            <Tabs defaultValue="consulenti" className="w-full">
              <TabsList className="w-full bg-slate-800 border border-slate-700 mb-4 grid grid-cols-4">
                <TabsTrigger value="consulenti" className="text-[10px] data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900">
                  Consulenti
                </TabsTrigger>
                <TabsTrigger value="prenotazioni" className="text-[10px] data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900 relative">
                  Prenotazioni
                  {pendingConsultationBookings > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center">
                      {pendingConsultationBookings}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="messaggi" className="text-[10px] data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900 relative">
                  Messaggi
                  {unreadConsultationMessages > 0 && (
                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center">
                      {unreadConsultationMessages}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="zone" className="text-[10px] data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900">
                  Zone
                </TabsTrigger>
              </TabsList>

              {/* TAB CONSULENTI */}
              <TabsContent value="consulenti" className="space-y-4">
                {/* Pulsante Invita */}
                <div className="flex justify-end">
                  <Button
                    onClick={() => setShowInviteForm(true)}
                    className="bg-lime-400 hover:bg-lime-500 text-slate-900"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invita
                  </Button>
                </div>

                {/* Search and Zone Filter */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Cerca consulenti..."
                      value={searchTermConsultant}
                      onChange={(e) => setSearchTermConsultant(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white pl-9 h-9 text-sm"
                    />
                  </div>
                  <Select value={selectedZoneConsultant} onValueChange={setSelectedZoneConsultant}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-9 text-sm">
                      <SelectValue placeholder="Filtra per zona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte le zone</SelectItem>
                      {zones.map(zone => (
                        <SelectItem key={zone.id} value={zone.name}>{zone.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Pending Invites */}
                {pendingInvitesConsultants.length > 0 && (
                  <Card className="bg-amber-500/10 border-amber-500/30">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <h3 className="text-amber-400 font-medium text-xs">Inviti in attesa ({pendingInvitesConsultants.length})</h3>
                      </div>
                      <div className="space-y-2">
                        {pendingInvitesConsultants.map((invite) => (
                          <div key={invite.id} className="bg-slate-900 rounded-lg p-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Mail className="w-3 h-3 text-amber-400" />
                              <div>
                                {invite.consultant_name && (
                                  <p className="text-white text-xs font-medium">{invite.consultant_name}</p>
                                )}
                                <p className={`text-xs ${invite.consultant_name ? 'text-slate-400' : 'text-white'}`}>{invite.email}</p>
                              </div>
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/20 h-6 w-6 p-0">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-slate-800 border-slate-700">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-white">Cancellare questo invito?</AlertDialogTitle>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600">Annulla</AlertDialogCancel>
                                  <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteInviteConsultantMutation.mutate(invite.id)}>Elimina</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Consultants List */}
                {isLoadingConsultants ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-lime-400 border-t-transparent rounded-full mx-auto"></div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredConsultants.length === 0 ? (
                      <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="p-4 text-center">
                          <Briefcase className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                          <p className="text-slate-400 text-sm">Nessun consulente trovato</p>
                        </CardContent>
                      </Card>
                    ) : (
                      filteredConsultants.map((consultant) => (
                        <Card key={consultant.id} className="bg-slate-800 border-slate-700">
                          <CardContent className="p-3">
                            <div className="flex items-start gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                consultant.is_blocked ? 'bg-red-500/20' : 'bg-lime-400/20'
                              }`}>
                                <Briefcase className={`w-4 h-4 ${consultant.is_blocked ? 'text-red-400' : 'text-lime-400'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <p className="text-white font-medium truncate text-xs">{consultant.name || 'N/A'}</p>
                                  {consultant.is_blocked && (
                                    <Badge className="bg-red-500/20 text-red-400 border-0 text-[10px]">Bloccato</Badge>
                                  )}
                                </div>
                                <p className="text-lime-400 text-[10px] truncate">{consultant.category}</p>
                                <p className="text-slate-400 text-[10px] truncate">{consultant.email}</p>
                                {consultant.zona && (
                                  <Badge className="bg-blue-500/20 text-blue-400 border-0 text-[10px] mt-0.5">{consultant.zona}</Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex gap-1 mt-2">
                              <Button variant="outline" size="sm" className="flex-1 border-lime-400 text-lime-400 hover:bg-lime-400/20 h-7 text-[10px]" onClick={() => handleEditConsultant(consultant)}>
                                <Edit className="w-3 h-3 mr-1" /> Modifica
                              </Button>
                              <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700 h-7 w-7 p-0" onClick={() => handleOpenSections(consultant)}>
                                <Settings className="w-3 h-3" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className={`h-7 w-7 p-0 ${consultant.is_blocked ? 'border-green-600 text-green-400 hover:bg-green-600/20' : 'border-red-600 text-red-400 hover:bg-red-600/20'}`}>
                                    {consultant.is_blocked ? <Phone className="w-3 h-3" /> : <PhoneOff className="w-3 h-3" />}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-slate-800 border-slate-700">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-white">{consultant.is_blocked ? 'Sbloccare?' : 'Bloccare?'}</AlertDialogTitle>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600">Annulla</AlertDialogCancel>
                                    <AlertDialogAction className={consultant.is_blocked ? "bg-green-600" : "bg-red-600"} onClick={() => toggleBlockConsultantMutation.mutate({ consultantId: consultant.id, isBlocked: consultant.is_blocked, consultantEmail: consultant.email })}>
                                      {consultant.is_blocked ? 'Sblocca' : 'Blocca'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="border-red-600 text-red-400 hover:bg-red-600/20 h-7 w-7 p-0">
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-slate-800 border-slate-700">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-white">Eliminare?</AlertDialogTitle>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600">Annulla</AlertDialogCancel>
                                    <AlertDialogAction className="bg-red-600" onClick={() => deleteConsultantMutation.mutate(consultant.id)}>Elimina</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                )}
              </TabsContent>

              {/* TAB PRENOTAZIONI */}
              <TabsContent value="prenotazioni" className="space-y-3">
                <h3 className="text-white font-medium text-sm">Prenotazioni Consulenze</h3>
                
                {/* Filtri */}
                <div className="grid grid-cols-3 gap-2">
                  <Select value={bookingStatusFilter} onValueChange={setBookingStatusFilter}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-8 text-[10px]">
                      <SelectValue placeholder="Stato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti gli stati</SelectItem>
                      <SelectItem value="pending">In attesa</SelectItem>
                      <SelectItem value="dates_proposed">Date proposte</SelectItem>
                      <SelectItem value="confirmed">Confermata</SelectItem>
                      <SelectItem value="completed">Completata</SelectItem>
                      <SelectItem value="cancelled">Annullata</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={bookingZoneFilter} onValueChange={setBookingZoneFilter}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-8 text-[10px]">
                      <SelectValue placeholder="Zona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte le zone</SelectItem>
                      {zones.map(zone => (
                        <SelectItem key={zone.id} value={zone.name}>{zone.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={bookingConsultantFilter} onValueChange={setBookingConsultantFilter}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-8 text-[10px]">
                      <SelectValue placeholder="Consulente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti</SelectItem>
                      {consultants.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(() => {
                  const filteredBookings = consultationBookings.filter(booking => {
                    const consultant = consultants.find(c => c.id === booking.consultant_id);
                    const matchesStatus = bookingStatusFilter === 'all' || booking.status === bookingStatusFilter;
                    const matchesZone = bookingZoneFilter === 'all' || consultant?.zona === bookingZoneFilter;
                    const matchesConsultant = bookingConsultantFilter === 'all' || booking.consultant_id === bookingConsultantFilter;
                    return matchesStatus && matchesZone && matchesConsultant;
                  });

                  if (filteredBookings.length === 0) {
                    return <p className="text-slate-400 text-xs text-center py-4">Nessuna prenotazione trovata</p>;
                  }

                  const statusColors = {
                    pending: 'bg-yellow-500',
                    dates_proposed: 'bg-blue-500',
                    confirmed: 'bg-green-600',
                    awaiting_user_confirmation: 'bg-purple-500',
                    completed: 'bg-slate-500',
                    cancelled: 'bg-red-500'
                  };
                  const statusLabels = {
                    pending: 'In attesa',
                    dates_proposed: 'Date proposte',
                    confirmed: 'Confermata',
                    awaiting_user_confirmation: 'Attesa conferma',
                    completed: 'Completata',
                    cancelled: 'Annullata'
                  };

                  return filteredBookings.map((booking) => {
                    const consultant = consultants.find(c => c.id === booking.consultant_id);
                    return (
                      <Card key={booking.id} className="bg-slate-800 border-slate-700">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <Badge className={`${statusColors[booking.status] || 'bg-slate-500'} text-white text-[10px]`}>
                              {statusLabels[booking.status] || booking.status}
                            </Badge>
                            <span className="text-slate-400 text-[10px]">
                              {new Date(booking.created_date).toLocaleDateString('it-IT')}
                            </span>
                          </div>
                          <p className="text-lime-400 font-medium text-xs">{consultant?.category || 'N/D'}</p>
                          <p className="text-white text-xs">{consultant?.name || 'N/D'}</p>
                          {consultant?.zona && (
                            <Badge className="bg-blue-500/20 text-blue-400 border-0 text-[10px] mt-1">{consultant.zona}</Badge>
                          )}
                          <p className="text-slate-400 text-[10px] mt-1">Utente: {booking.user_email}</p>
                          {booking.meeting_preference && (
                            <p className="text-slate-500 text-[10px]">Modalità: {booking.meeting_preference === 'online' ? '💻 Online' : booking.meeting_preference === 'sede_azienda' ? '🏢 Sede azienda' : '📍 Sede consulente'}</p>
                          )}
                          {booking.scheduled_date && (
                            <p className="text-green-400 text-[10px]">📅 {new Date(booking.scheduled_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                          )}
                          {booking.subject && (
                            <div className="bg-slate-900 rounded p-2 mt-2">
                              <p className="text-slate-300 text-[10px]">{booking.subject}</p>
                            </div>
                          )}
                          
                          {/* Azioni admin */}
                          <div className="flex gap-1 mt-2">
                            <Link to={`${createPageUrl('Messaggi')}?contact=${encodeURIComponent(booking.user_email)}`} className="flex-1">
                              <Button variant="outline" size="sm" className="w-full border-lime-400 text-lime-400 hover:bg-lime-400/20 h-6 text-[10px]">
                                <Mail className="w-3 h-3 mr-1" /> Utente
                              </Button>
                            </Link>
                            {consultant?.email && (
                              <Link to={`${createPageUrl('Messaggi')}?contact=${encodeURIComponent(consultant.email)}`} className="flex-1">
                                <Button variant="outline" size="sm" className="w-full border-blue-400 text-blue-400 hover:bg-blue-400/20 h-6 text-[10px]">
                                  <Mail className="w-3 h-3 mr-1" /> Consulente
                                </Button>
                              </Link>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="border-red-600 text-red-400 hover:bg-red-600/20 h-6 w-6 p-0">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-slate-800 border-slate-700">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-white">Eliminare questa prenotazione?</AlertDialogTitle>
                                  <AlertDialogDescription className="text-slate-400">
                                    La prenotazione verrà rimossa permanentemente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600">Annulla</AlertDialogCancel>
                                  <AlertDialogAction 
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={async () => {
                                      await base44.entities.ConsultationBooking.delete(booking.id);
                                      queryClient.invalidateQueries({ queryKey: ['consultation-bookings-admin'] });
                                    }}
                                  >
                                    Elimina
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  });
                })()}
              </TabsContent>

              {/* TAB MESSAGGI */}
              <TabsContent value="messaggi" className="space-y-3">
                <h3 className="text-white font-medium text-sm">Messaggi Utenti ↔ Consulenti</h3>
                {consultationMessages.length === 0 ? (
                  <p className="text-slate-400 text-xs text-center py-4">Nessun messaggio</p>
                ) : (
                  consultationMessages.slice(0, 20).map((msg) => (
                    <Card key={msg.id} className={`border ${!msg.is_read ? 'bg-orange-400/10 border-orange-400/30' : 'bg-slate-800 border-slate-700'}`}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-1 mb-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${msg.from_type === 'consulente' ? 'bg-blue-500/20 text-blue-400' : 'bg-lime-400/20 text-lime-400'}`}>
                            {msg.from_type === 'consulente' ? '👔' : '👤'}
                          </span>
                          <span className="text-slate-500 text-[10px]">→</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${msg.to_type === 'consulente' ? 'bg-blue-500/20 text-blue-400' : 'bg-lime-400/20 text-lime-400'}`}>
                            {msg.to_type === 'consulente' ? '👔' : '👤'}
                          </span>
                          {!msg.is_read && (
                            <Badge className="bg-orange-400 text-slate-900 text-[10px] ml-auto">NUOVO</Badge>
                          )}
                        </div>
                        <p className="text-white text-xs font-medium">{msg.from_name}</p>
                        <p className="text-slate-400 text-[10px]">→ {msg.to_name}</p>
                        <div className="bg-slate-900 rounded p-2 mt-1">
                          <p className="text-slate-300 text-[10px] line-clamp-2">{msg.content}</p>
                        </div>
                        <p className="text-slate-500 text-[10px] mt-1">
                          {msg.created_date ? new Date(msg.created_date).toLocaleDateString('it-IT', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          }) : ''}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* TAB ZONE CONSULENTI */}
              <TabsContent value="zone" className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-medium text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-lime-400" />
                    Zone Consulenti
                  </h3>
                  <Button
                    size="sm"
                    className="bg-lime-400 text-slate-900 h-7 text-xs"
                    onClick={() => navigate(createPageUrl('GestioneZone'))}
                  >
                    Gestisci Zone
                  </Button>
                </div>
                
                {/* Riepilogo consulenti per zona */}
                <div className="space-y-2">
                  {zones.map(zone => {
                    const zoneConsultants = consultants.filter(c => c.zona === zone.name);
                    return (
                      <Card key={zone.id} className="bg-slate-800 border-slate-700">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-lime-400" />
                              <span className="text-white text-sm font-medium">{zone.name}</span>
                            </div>
                            <Badge className="bg-lime-400/20 text-lime-400 text-xs">
                              {zoneConsultants.length} consulenti
                            </Badge>
                          </div>
                          {zoneConsultants.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {zoneConsultants.slice(0, 3).map(c => (
                                <p key={c.id} className="text-slate-400 text-[10px]">• {c.name} ({c.category})</p>
                              ))}
                              {zoneConsultants.length > 3 && (
                                <p className="text-slate-500 text-[10px]">+{zoneConsultants.length - 3} altri</p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                  
                  {/* Consulenti senza zona */}
                  {consultants.filter(c => !c.zona).length > 0 && (
                    <Card className="bg-red-500/10 border-red-500/30">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-red-400 text-sm font-medium">⚠️ Senza zona</span>
                          <Badge className="bg-red-500/20 text-red-400 text-xs">
                            {consultants.filter(c => !c.zona).length} consulenti
                          </Badge>
                        </div>
                        <div className="mt-2 space-y-1">
                          {consultants.filter(c => !c.zona).slice(0, 3).map(c => (
                            <p key={c.id} className="text-slate-400 text-[10px]">• {c.name}</p>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}