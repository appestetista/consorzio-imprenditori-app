import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Users, Video, Calendar, Briefcase, Plus, Settings } from 'lucide-react';
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
  const [newConsultant, setNewConsultant] = useState({ name: '', category: '', phone: '', email: '' });
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser.role !== 'admin') {
          navigate(createPageUrl('Home'));
          return;
        }
        setUser(currentUser);
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, [navigate]);

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
      setNewConsultant({ name: '', category: '', phone: '', email: '' });
    }
  });

  const inviteUserMutation = useMutation({
    mutationFn: async () => {
      await base44.users.inviteUser(inviteEmail, inviteRole);
    },
    onSuccess: () => {
      setShowInvite(false);
      setInviteEmail('');
      setInviteRole('user');
    }
  });

  if (!user || user.role !== 'admin') {
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
            <h1 className="text-white text-xl font-bold">Pannello Admin</h1>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 text-lime-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{stats?.activeUsers || 0}</p>
              <p className="text-slate-400 text-sm">Membri Attivi</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <Calendar className="w-8 h-8 text-lime-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{stats?.totalEvents || 0}</p>
              <p className="text-slate-400 text-sm">Eventi</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <Video className="w-8 h-8 text-lime-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{stats?.totalVideos || 0}</p>
              <p className="text-slate-400 text-sm">Video</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <Briefcase className="w-8 h-8 text-lime-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{stats?.totalConsultants || 0}</p>
              <p className="text-slate-400 text-sm">Consulenti</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3 mb-6">
          <Link to={createPageUrl('GestioneMembri')}>
            <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <Users className="w-6 h-6 text-lime-400" />
                <span className="text-white font-medium">Gestione Membri</span>
              </CardContent>
            </Card>
          </Link>
          
          <Dialog open={showInvite} onOpenChange={setShowInvite}>
            <DialogTrigger asChild>
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <Plus className="w-6 h-6 text-lime-400" />
                  <span className="text-white font-medium">Invita Nuovo Membro</span>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Invita Nuovo Membro</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Input
                  placeholder="Email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                />
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Membro</SelectItem>
                    <SelectItem value="admin">Amministratore</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={() => inviteUserMutation.mutate()}
                  disabled={inviteUserMutation.isPending || !inviteEmail}
                  className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
                >
                  {inviteUserMutation.isPending ? 'Invio...' : 'Invia Invito'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Consultants Management */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Gestione Consulenti</CardTitle>
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
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {consultants.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">Nessun consulente</p>
              ) : (
                consultants.map((consultant) => (
                  <div key={consultant.id} className="bg-slate-700/50 rounded-lg p-3">
                    <p className="text-white font-medium">{consultant.name}</p>
                    <p className="text-lime-400 text-sm">{consultant.category}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNav currentPage="AdminPanel" unreadMessages={messages.length} />
    </div>
  );
}