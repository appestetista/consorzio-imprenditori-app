import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Users, Video, Calendar, Briefcase, Plus, Settings, Bell, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import CulturaAziendaleAdmin from '../components/admin/CulturaAziendaleAdmin';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import ImpersonationDialog from '../components/admin/ImpersonationDialog';
import ConsultantAssignmentManager from '../components/admin/ConsultantAssignmentManager';

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

export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [showAddConsultant, setShowAddConsultant] = useState(false);
  const [newConsultant, setNewConsultant] = useState({ name: '', category: '', phone: '', email: '', referente: '', cellulare_referente: '' });
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
      return {
        totalUsers: users.length,
        activeUsers: users.filter(u => !u.is_blocked).length,
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

  const pendingRequests = consultationRequests.filter(r => r.consultation_status === 'pending');

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', user?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: user?.email, is_read: false }),
    enabled: !!user?.email,
  });

  const createConsultantMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Consultant.create({
        ...data,
        available_slots: 100
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setShowAddConsultant(false);
      setNewConsultant({ name: '', category: '', phone: '', email: '', referente: '', cellulare_referente: '' });
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Home')} className="text-lime-400">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-white text-xl font-bold">Gestione Utenti</h1>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
         <Link to={createPageUrl('ContattaMembriAdmin')}>
           <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer">
             <CardContent className="p-4 text-center">
               <Users className="w-8 h-8 text-lime-400 mx-auto mb-2" />
               <p className="text-2xl font-bold text-white">{stats?.activeUsers || 0}</p>
               <p className="text-slate-400 text-sm">Utenti</p>
             </CardContent>
           </Card>
         </Link>
         <Link to={createPageUrl('CalendarioIncontri')}>
            <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <Calendar className="w-8 h-8 text-lime-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{stats?.totalEvents || 0}</p>
                <p className="text-slate-400 text-sm">Eventi</p>
              </CardContent>
            </Card>
          </Link>
          <Link to={createPageUrl('VideoInterviste')}>
            <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <Video className="w-8 h-8 text-lime-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{stats?.totalVideos || 0}</p>
                <p className="text-slate-400 text-sm">Video Interviste</p>
              </CardContent>
            </Card>
          </Link>
          <Link to={createPageUrl('Consulenze')}>
            <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <Briefcase className="w-8 h-8 text-lime-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{stats?.totalConsultants || 0}</p>
                <p className="text-slate-400 text-sm">Consulenti</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Richieste Consulenza Pendenti */}
        <div className="mb-6 space-y-4">
          <h2 className="text-white text-lg font-bold flex items-center gap-2">
            <div className="relative">
              <Bell className={`w-5 h-5 ${pendingRequests.length > 0 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {pendingRequests.length}
                </span>
              )}
            </div>
            Richieste Consulenza Bandi ({pendingRequests.length})
          </h2>
          {pendingRequests.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6 text-center">
                <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Nessuna richiesta di consulenza pendente</p>
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map((request) => (
              <Card key={request.id} className="bg-gradient-to-br from-orange-500/20 to-lime-400/20 border-lime-400/30">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-lime-400 rounded-full p-4 flex-shrink-0">
                      <Bell className="w-8 h-8 text-slate-900" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-white font-bold text-lg">{request.user?.company_name || request.user?.full_name}</h3>
                          <p className="text-lime-400 text-sm">{request.user?.email}</p>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm('Vuoi eliminare questa richiesta?')) {
                              deleteConsultationRequestMutation.mutate(request.id);
                            }
                          }}
                          className="text-red-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-3 mb-3">
                        <p className="text-white font-medium text-sm mb-2">{request.grant?.title}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {request.grant?.grant_type && (
                            <div>
                              <span className="text-slate-400">Tipo:</span>
                              <span className="text-lime-400 ml-1">{request.grant.grant_type}</span>
                            </div>
                          )}
                          {request.grant?.funding_type && (
                            <div>
                              <span className="text-slate-400">Forma:</span>
                              <span className="text-lime-400 ml-1">{request.grant.funding_type}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-lime-400 mb-4">
                        <Clock className="w-4 h-4" />
                        <span className="font-semibold">{new Date(request.created_date).toLocaleDateString('it-IT', { 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric'
                        })}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="bg-lime-400 hover:bg-lime-500 text-slate-900 flex-1 font-bold"
                          onClick={() => updateConsultationStatusMutation.mutate({ 
                            requestId: request.id, 
                            status: 'accepted',
                            userEmail: request.user?.email,
                            grantTitle: request.grant?.title
                          })}
                          disabled={updateConsultationStatusMutation.isPending}
                        >
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Accetta
                        </Button>
                        <Button
                          variant="outline"
                          className="bg-red-600 hover:bg-red-700 text-white border-red-600 flex-1 font-bold"
                          onClick={() => updateConsultationStatusMutation.mutate({ 
                            requestId: request.id, 
                            status: 'rejected',
                            userEmail: request.user?.email,
                            grantTitle: request.grant?.title
                          })}
                          disabled={updateConsultationStatusMutation.isPending}
                        >
                          <XCircle className="w-5 h-5 mr-2" />
                          Rifiuta
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-3 mb-6">
          <Link to={createPageUrl('GestioneBandi')}>
            <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <Briefcase className="w-6 h-6 text-lime-400" />
                <span className="text-white font-medium">Gestione Bandi</span>
              </CardContent>
            </Card>
          </Link>
          

        </div>

        {/* Cultura Aziendale Management */}
        <CulturaAziendaleAdmin />

        {/* Consultant Assignment Manager */}
        <ConsultantAssignmentManager />

        {/* Consultants Management */}
        <div className="mb-6 space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-white text-lg font-bold flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-lime-400" />
              Gestione Consulenti ({consultants.length})
            </h2>
            <Dialog open={showAddConsultant} onOpenChange={setShowAddConsultant}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-lime-400 hover:bg-lime-500 text-slate-900">
                  <Plus className="w-4 h-4 mr-1" />
                  Aggiungi
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Nuovo Consulente</DialogTitle>
                </DialogHeader>
                <button
                  onClick={() => setShowAddConsultant(false)}
                  className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
                >
                  <XCircle className="h-4 w-4 text-white" />
                </button>
                <div className="space-y-4 mt-4">
                  <Input
                    placeholder="Nome/Studio"
                    value={newConsultant.name}
                    onChange={(e) => setNewConsultant({...newConsultant, name: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                  <Select
                    value={newConsultant.category}
                    onValueChange={(value) => setNewConsultant({...newConsultant, category: value})}
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                      <SelectValue placeholder="Seleziona categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONSULTANT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Telefono"
                    value={newConsultant.phone}
                    onChange={(e) => setNewConsultant({...newConsultant, phone: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={newConsultant.email}
                    onChange={(e) => setNewConsultant({...newConsultant, email: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                  <Input
                    placeholder="Nome Referente"
                    value={newConsultant.referente}
                    onChange={(e) => setNewConsultant({...newConsultant, referente: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                  <Input
                    placeholder="Cellulare Referente"
                    value={newConsultant.cellulare_referente}
                    onChange={(e) => setNewConsultant({...newConsultant, cellulare_referente: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                  <Button 
                    onClick={() => createConsultantMutation.mutate(newConsultant)}
                    disabled={createConsultantMutation.isPending || !newConsultant.name || !newConsultant.category}
                    className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
                  >
                    {createConsultantMutation.isPending ? 'Creazione...' : 'Aggiungi Consulente'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          {consultants.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6 text-center">
                <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Nessun consulente registrato</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {consultants.map((consultant) => (
                <Card key={consultant.id} className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-400 text-xs mb-0.5">Consulente:</p>
                            <p className="text-white font-medium truncate">{consultant.name}</p>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="text-lime-400 text-lg font-bold">{consultant.available_slots || 1}</p>
                            <p className="text-slate-400 text-xs">consulenze</p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-slate-400 text-xs">Referente:</p>
                          <p className="text-lime-400 text-sm">{consultant.referente || 'N/A'}</p>
                        </div>
                        <p className="text-slate-500 text-xs mt-1">{consultant.category}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-slate-900 hover:bg-slate-700 text-lime-400 border-lime-400/30 flex-shrink-0"
                        onClick={() => {
                          startImpersonation('consulente', consultant.id, consultant.email, consultant.name);
                          navigate(createPageUrl('Consulenze'));
                        }}
                      >
                        Visualizza
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
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
    </div>
  );
}