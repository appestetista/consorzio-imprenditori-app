import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Users, Video, Calendar, Briefcase, Settings, Bell, CheckCircle, XCircle, Clock, Trash2, Mail, Eye, MessageSquare, CalendarDays, MapPin, DollarSign, Sparkles, Euro, ShoppingBag, BookOpen, Handshake, Truck, Heart, FileSearch, Globe, Shield, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import ImpersonationDialog from '../components/admin/ImpersonationDialog';
import RisparmioRequestsAdmin from '../components/admin/RisparmioRequestsAdmin';

export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [showImpersonationDialog, setShowImpersonationDialog] = useState(false);
  const { impersonation, startImpersonation, appMode } = useImpersonation();

  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

  const { data: consultants = [] } = useQuery({
    queryKey: ['consultants'],
    queryFn: () => base44.entities.Consultant.list(),
  });

  const { data: consultationBookings = [] } = useQuery({
    queryKey: ['consultation-bookings-admin'],
    queryFn: () => base44.entities.ConsultationBooking.filter({ status: 'pending' }),
  });

  const pendingConsultationBookings = consultationBookings.length;

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
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(createPageUrl('Home'))} className="text-lime-400">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-white text-xl font-bold">Pannello Admin</h1>
          </div>
          <p className="text-slate-400 text-xs">
            {new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
          </p>
        </div>

        {/* Stats Grid compatto */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <Link to={createPageUrl('GestioneMembri')}>
            <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700">
              <CardContent className="p-2 text-center">
                <Users className="w-5 h-5 text-lime-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{stats?.activeUsers || 0}</p>
                <p className="text-slate-400 text-[10px]">Utenti</p>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('VideoInterviste')}>
            <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 relative">
              <CardContent className="p-2 text-center">
                <Video className="w-5 h-5 text-lime-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{stats?.totalVideos || 0}</p>
                <p className="text-slate-400 text-[10px]">Video</p>
                {pendingVideoRequests.length > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {pendingVideoRequests.length}
                  </span>
                )}
              </CardContent>
            </Card>
          </Link>
          <Link to={createPageUrl('GestioneConsulenti')}>
            <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 relative">
              <CardContent className="p-2 text-center">
                <Briefcase className="w-5 h-5 text-lime-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{stats?.totalConsultants || 0}</p>
                <p className="text-slate-400 text-[10px]">Consulenti</p>
                {pendingConsultationBookings > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {pendingConsultationBookings}
                  </span>
                )}
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
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('VideoInterviste')}>
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20 relative">
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <Video className="w-5 h-5 text-lime-400 mb-1" />
                  <p className="text-white text-[10px] text-center leading-tight">Video<br/>interviste</p>
                  {pendingVideoRequests.length > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {pendingVideoRequests.length}
                    </span>
                  )}
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('CulturaAziendale')}>
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20">
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <BookOpen className="w-5 h-5 text-lime-400 mb-1" />
                  <p className="text-white text-[10px] text-center leading-tight">Academy</p>
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('Consulenze')}>
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20 relative">
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <Briefcase className="w-5 h-5 text-lime-400 mb-1" />
                  <p className="text-white text-[10px] text-center leading-tight">Consulenze</p>
                  {pendingConsultationBookings > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {pendingConsultationBookings}
                    </span>
                  )}
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('FinanziamentiAgevolati')}>
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20">
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <Sparkles className="w-5 h-5 text-lime-400 mb-1" />
                  <p className="text-white text-[10px] text-center leading-tight">Finanziamenti<br/>agevolati</p>
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('GestioneMembri')}>
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20">
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <User className="w-5 h-5 text-lime-400 mb-1" />
                  <p className="text-white text-[10px] text-center leading-tight">Contatta<br/>Imprenditori</p>
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('RisparmioEnergetico')}>
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20">
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <Euro className="w-5 h-5 text-lime-400 mb-1" />
                  <p className="text-white text-[10px] text-center leading-tight">Risparmio</p>
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('Marketplace')}>
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20">
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <ShoppingBag className="w-5 h-5 text-lime-400 mb-1" />
                  <p className="text-white text-[10px] text-center leading-tight">Market<br/>place</p>
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('Imprenditori')}>
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20">
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <Handshake className="w-5 h-5 text-lime-400 mb-1" />
                  <p className="text-white text-[10px] text-center leading-tight">Consigli da<br/>Imprenditori</p>
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('Fornitori')}>
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20">
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <Truck className="w-5 h-5 text-lime-400 mb-1" />
                  <p className="text-white text-[10px] text-center leading-tight">Ricerca<br/>Fornitori</p>
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('WelfareAziendale')}>
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20">
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <Heart className="w-5 h-5 text-pink-400 mb-1" />
                  <p className="text-white text-[10px] text-center leading-tight">Welfare<br/>Aziendale</p>
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('AnalisiContratti')}>
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20">
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <FileSearch className="w-5 h-5 text-lime-400 mb-1" />
                  <p className="text-white text-[10px] text-center leading-tight">Analisi<br/>Contratti</p>
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('ImportExport')}>
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20">
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <Globe className="w-5 h-5 text-lime-400 mb-1" />
                  <p className="text-white text-[10px] text-center leading-tight">Import /<br/>Export</p>
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('ComplianceAziendale')}>
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-20">
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <Shield className="w-5 h-5 text-blue-400 mb-1" />
                  <p className="text-white text-[10px] text-center leading-tight">Compliance<br/>Aziendale</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Tabs per organizzare le sezioni */}
        <Tabs defaultValue="richieste" className="w-full">
          <TabsList className="w-full bg-slate-800 border border-slate-700 mb-4">
            <TabsTrigger value="richieste" className="flex-1 text-xs data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900">
              <div className="relative flex items-center gap-1">
                <Bell className="w-3.5 h-3.5" />
                Richieste
                {(pendingRequests.length + pendingVideoRequests.length + unreadAdminMessages.length + eventResponseNotifications.length + unreadConsultationMessages) > 0 && (
                  <span className="bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                    {pendingRequests.length + pendingVideoRequests.length + unreadAdminMessages.length + eventResponseNotifications.length + unreadConsultationMessages}
                  </span>
                )}
              </div>
            </TabsTrigger>
            <TabsTrigger value="risparmio" className="flex-1 text-xs data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900">
                              <div className="flex items-center gap-1">
                                <Settings className="w-3.5 h-3.5" />
                                Welfare
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

            {/* Messaggi */}
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className={`w-4 h-4 ${unreadAdminMessages.length > 0 ? 'text-lime-400' : 'text-slate-400'}`} />
                    <span className="text-white font-medium text-sm">Messaggi ({unreadAdminMessages.length} nuovi)</span>
                  </div>
                  <Button size="sm" variant="ghost" className="text-lime-400 h-7 text-xs" onClick={() => setShowAllMessages(true)}>
                    Vedi tutti
                  </Button>
                </div>
                {unreadAdminMessages.length > 0 && (
                  <div className="space-y-1">
                    {unreadAdminMessages.slice(0, 2).map((msg) => (
                      <div key={msg.id} className="bg-slate-900 rounded p-2 text-xs">
                        <p className="text-white font-medium truncate">{msg.sender_name}</p>
                        <p className="text-slate-400 truncate">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Messaggi Consulenze (utenti <-> consulenti) */}
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Briefcase className={`w-4 h-4 ${unreadConsultationMessages > 0 ? 'text-orange-400' : 'text-slate-400'}`} />
                    <span className="text-white font-medium text-sm">Messaggi Consulenze ({unreadConsultationMessages} nuovi)</span>
                  </div>
                  <Button size="sm" variant="ghost" className="text-lime-400 h-7 text-xs" onClick={() => setShowConsultationMessages(true)}>
                    Vedi tutti
                  </Button>
                </div>
                {unreadConsultationMessages > 0 && (
                  <div className="space-y-1">
                    {consultationMessages.filter(m => !m.is_read).slice(0, 2).map((msg) => (
                      <div key={msg.id} className="bg-slate-900 rounded p-2 text-xs">
                        <div className="flex items-center gap-1 mb-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${msg.from_type === 'consulente' ? 'bg-blue-500/20 text-blue-400' : 'bg-lime-400/20 text-lime-400'}`}>
                            {msg.from_type === 'consulente' ? '👔 Cons.' : '👤 Utente'}
                          </span>
                          <span className="text-slate-500">→</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${msg.to_type === 'consulente' ? 'bg-blue-500/20 text-blue-400' : 'bg-lime-400/20 text-lime-400'}`}>
                            {msg.to_type === 'consulente' ? '👔 Cons.' : '👤 Utente'}
                          </span>
                        </div>
                        <p className="text-white font-medium truncate">{msg.from_name} → {msg.to_name}</p>
                        <p className="text-slate-400 truncate">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                )}
                {unreadConsultationMessages === 0 && (
                  <p className="text-slate-400 text-xs">Nessun messaggio non letto</p>
                )}
              </CardContent>
            </Card>

            {/* Richieste Consulenza Bandi */}
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-3">
                <h3 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
                  <Bell className={`w-4 h-4 ${pendingRequests.length > 0 ? 'text-red-500' : 'text-slate-400'}`} />
                  Consulenza Bandi ({pendingRequests.length})
                </h3>
                {pendingRequests.length === 0 ? (
                  <p className="text-slate-400 text-xs">Nessuna richiesta pendente</p>
                ) : (
                  <div className="space-y-2">
                    {pendingRequests.slice(0, 3).map((request) => (
                      <div key={request.id} className="bg-lime-400/10 border border-lime-400/30 rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-white font-medium text-sm">{request.user?.company_name || request.user?.full_name}</p>
                            <p className="text-slate-400 text-xs">{request.grant?.title}</p>
                          </div>
                          <button onClick={() => deleteConsultationRequestMutation.mutate(request.id)} className="text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1 bg-lime-400 text-slate-900 h-7 text-xs [&>svg]:text-slate-900"
                            onClick={() => updateConsultationStatusMutation.mutate({ requestId: request.id, status: 'accepted', userEmail: request.user?.email, grantTitle: request.grant?.title })}>
                            <CheckCircle className="w-3 h-3 mr-1" /> Accetta
                          </Button>
                          <Button size="sm" variant="destructive" className="flex-1 h-7 text-xs"
                            onClick={() => updateConsultationStatusMutation.mutate({ requestId: request.id, status: 'rejected', userEmail: request.user?.email, grantTitle: request.grant?.title })}>
                            <XCircle className="w-3 h-3 mr-1" /> Rifiuta
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Richieste Video */}
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-medium text-sm flex items-center gap-2">
                    <Video className={`w-4 h-4 ${pendingVideoRequests.length > 0 ? 'text-red-500' : 'text-slate-400'}`} />
                    Video Interviste ({pendingVideoRequests.length})
                  </h3>
                  {pendingVideoRequests.length > 0 && (
                    <Button size="sm" variant="ghost" className="text-lime-400 h-7 text-xs" onClick={() => setShowVideoRequests(true)}>
                      Vedi
                    </Button>
                  )}
                </div>
                {pendingVideoRequests.length === 0 ? (
                  <p className="text-slate-400 text-xs">Nessuna richiesta pendente</p>
                ) : (
                  <p className="text-lime-400 text-xs">{pendingVideoRequests.length} nuove richieste</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB RISPARMIO */}
          <TabsContent value="risparmio">
            <RisparmioRequestsAdmin />
          </TabsContent>
        </Tabs>
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
    </div>
  );
}