import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, User, Lock, Unlock, Trash2, Settings, Search, Shield, ShieldOff, Edit, X, UserPlus, Upload, Image, Save, FileText, Clock, Mail, Briefcase, Users, Send, MapPin } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProfiloBandiForm from '../components/profile/ProfiloBandiForm';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Header from '../components/layout/Header';
import BottomNavWithMenu from '../components/layout/BottomNavWithMenu';
import MembersDirectory from '../components/members/MembersDirectory';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import InviteUserForm from '../components/admin/InviteUserForm';
import PreAuthEmailForm from '../components/admin/PreAuthEmailForm';
import ConsultantAssignmentManager from '../components/admin/ConsultantAssignmentManager';
import ZoneAssignmentManager from '../components/admin/ZoneAssignmentManager';
import AdminGuard from '../components/admin/AdminGuard';

const PERMISSIONS_LIST = [
  { key: 'calendario', label: 'Calendario Incontri' },
  { key: 'video_interviste', label: 'Video Interviste' },
  { key: 'cultura_aziendale', label: 'Academy' },
  { key: 'consulenze', label: 'Consulenze' },
  { key: 'finanziamenti', label: 'Finanziamenti Agevolati' },
  { key: 'contatta_membri', label: 'Utenti' },
  { key: 'marketplace', label: 'Marketplace' },
  { key: 'risparmio_energetico', label: 'Risparmio Energetico' }
];

// Sub-component per la lista utenti per zona
function ZoneUsersListInline({ selectedZone }) {
  const { data: zoneData, isLoading } = useQuery({
    queryKey: ['zone-users', selectedZone],
    queryFn: async () => {
      const res = await base44.functions.invoke('listMembers', {
        page: 1,
        pageSize: 500,
        zone: selectedZone,
        excludeConsulenti: true,
        entityType: 'User'
      });
      return res.data;
    },
  });

  const zoneMembers = zoneData?.records || [];

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin w-6 h-6 border-2 border-lime-400 border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {zoneMembers.map(member => (
        <div key={member.id} className="bg-slate-900 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              member.user_type === 'consulente' ? 'bg-blue-500/20' : 'bg-lime-400/20'
            }`}>
              <User className={`w-4 h-4 ${
                member.user_type === 'consulente' ? 'text-blue-400' : 'text-lime-400'
              }`} />
            </div>
            <div>
              <p className="text-white text-sm">{member.company_name || member.full_name}</p>
              <p className="text-slate-500 text-xs">{member.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {member.zona && (
              <Badge className="bg-slate-700 text-slate-300 border-0 text-xs">
                {member.zona}
              </Badge>
            )}
            <Badge className={`border-0 text-xs ${
              member.user_type === 'consulente' 
                ? 'bg-blue-500/20 text-blue-400' 
                : 'bg-lime-400/20 text-lime-400'
            }`}>
              {member.user_type === 'consulente' ? 'Consulente' : 'Utente'}
            </Badge>
          </div>
        </div>
      ))}
      {zoneMembers.length === 0 && (
        <p className="text-slate-500 text-sm text-center py-4">Nessun utente in questa zona</p>
      )}
    </div>
  );
}

export default function GestioneMembri() {
  return (
    <AdminGuard>
      {(user) => <GestioneMembriContent user={user} />}
    </AdminGuard>
  );
}

function GestioneMembriContent({ user }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedMember, setSelectedMember] = useState(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const [formData, setFormData] = useState(null);
  const [initialFormData, setInitialFormData] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [selectedZoneRegistrati, setSelectedZoneRegistrati] = useState('all');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { impersonation } = useImpersonation();

  // Debounce searchTerm to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to page 1 on search change
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when zone changes
  useEffect(() => {
    setPage(1);
  }, [selectedZone]);

  const { data: membersData, isLoading } = useQuery({
    queryKey: ['all-members-paginated', page, pageSize, debouncedSearch, selectedZone],
    queryFn: async () => {
      const res = await base44.functions.invoke('listMembers', {
        page,
        pageSize,
        searchTerm: debouncedSearch,
        zone: selectedZone,
        excludeConsulenti: true,
        entityType: 'User'
      });
      return res.data;
    },
  });

  const members = membersData?.records || [];
  const totalPages = membersData?.totalPages || 1;
  const totalCount = membersData?.totalCount || 0;

  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: () => base44.entities.Zone.filter({ is_active: true }),
  });

  const { data: pendingInvites = [] } = useQuery({
    queryKey: ['pending-invites-users'],
    queryFn: async () => {
      const invites = await base44.entities.PendingInvite.filter({ user_type: 'utente' });
      return invites.filter(i => !i.is_registered);
    },
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Apri automaticamente il dialog se c'è memberId nell'URL
  useEffect(() => {
    if (isLoading || !members || members.length === 0 || formData) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const memberId = urlParams.get('memberId');
    
    if (memberId) {
      const memberToEdit = members.find(m => m.id === memberId);
      if (memberToEdit) {
        const data = {
          company_name: memberToEdit.company_name || '',
          specializzazione: memberToEdit.specializzazione || '',
          email: memberToEdit.email || '',
          phone: memberToEdit.phone || '',
          website: memberToEdit.website || '',
          logo_url: memberToEdit.logo_url || '',
          full_name: memberToEdit.full_name || '',
          referente: memberToEdit.referente || '',
          cellulare_referente: memberToEdit.cellulare_referente || '',
          referente_cellulare: memberToEdit.referente_cellulare || '',
          referente_email: memberToEdit.referente_email || '',
          vat_number: memberToEdit.vat_number || '',
          ateco_code: memberToEdit.ateco_code || '',
          company_size: memberToEdit.company_size || 'Piccola',
          address: memberToEdit.address || '',
          city: memberToEdit.city || '',
          province: memberToEdit.province || '',
          postal_code: memberToEdit.postal_code || '',
          ragione_sociale_fatturazione: memberToEdit.ragione_sociale_fatturazione || '',
          partita_iva: memberToEdit.partita_iva || '',
          codice_fiscale: memberToEdit.codice_fiscale || '',
          codice_sdi: memberToEdit.codice_sdi || '',
          indirizzo: memberToEdit.indirizzo || '',
          citta: memberToEdit.citta || '',
          regione: memberToEdit.regione || '',
          cap: memberToEdit.cap || '',
          paese: memberToEdit.paese || '',
          region: memberToEdit.region || ''
        };
        setFormData(data);
        setInitialFormData(data);
        setSelectedMember(memberToEdit);
        setShowMemberForm(true);
      }
    }
  }, [members, isLoading, formData]);

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', user?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: user?.email, is_read: false }),
    enabled: !!user?.email,
  });

  const toggleBlockMutation = useMutation({
    mutationFn: async ({ memberId, isBlocked }) => {
      return base44.entities.User.update(memberId, { is_blocked: !isBlocked });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-members-paginated'] });
    }
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ memberId, data }) => {
      return base44.entities.User.update(memberId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-members-paginated'] });
      setShowMemberForm(false);
      setFormData(null);
    }
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ memberId, permissions }) => {
      return base44.entities.User.update(memberId, { permissions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-members-paginated'] });
      setShowPermissions(false);
      setSelectedMember(null);
    }
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId) => {
      return base44.entities.User.delete(memberId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-members-paginated'] });
    },
    onError: (error) => {
      console.error('Errore eliminazione:', error);
      alert('Impossibile eliminare questo utente. Gli utenti devono essere eliminati dalla dashboard Base44.');
    }
  });

  const unblockAllMutation = useMutation({
    mutationFn: async () => {
      const blockedUsers = members.filter(m => m.is_blocked);
      for (const member of blockedUsers) {
        await base44.entities.User.update(member.id, { is_blocked: false });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-members-paginated'] });
    }
  });

  // Filtering is done server-side via listMembers function

  const handleEditMember = (member) => {
    const data = {
      company_name: member.company_name || '',
      specializzazione: member.specializzazione || '',
      email: member.email || '',
      phone: member.phone || '',
      website: member.website || '',
      logo_url: member.logo_url || '',
      full_name: member.full_name || '',
      referente: member.referente || '',
      cellulare_referente: member.cellulare_referente || '',
      referente_cellulare: member.referente_cellulare || '',
      referente_email: member.referente_email || '',
      vat_number: member.vat_number || '',
      ateco_code: member.ateco_code || '',
      company_size: member.company_size || 'Piccola',
      address: member.address || '',
      city: member.city || '',
      province: member.province || '',
      postal_code: member.postal_code || '',
      ragione_sociale_fatturazione: member.ragione_sociale_fatturazione || '',
      partita_iva: member.partita_iva || '',
      codice_fiscale: member.codice_fiscale || '',
      codice_sdi: member.codice_sdi || '',
      indirizzo: member.indirizzo || '',
      citta: member.citta || '',
      regione: member.regione || '',
      cap: member.cap || '',
      paese: member.paese || '',
      region: member.region || ''
    };
    setFormData(data);
    setInitialFormData(data);
    setSelectedMember(member);
    setShowMemberForm(true);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, logo_url: file_url });
    } catch (error) {
      alert('Errore durante il caricamento del logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveMember = async () => {
    if (!formData || !formData.email || !formData.company_name || !formData.full_name) return;
    
    if (selectedMember) {
      // Modifica membro esistente
      updateMemberMutation.mutate({
        memberId: selectedMember.id,
        data: formData
      });
    } else {
      // Creazione nuovo membro
      try {
        // 1. Invia invito
        await base44.users.inviteUser(formData.email, 'user');
        
        // 2. Attendi un attimo per permettere la creazione
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 3. Trova l'utente appena creato
        const users = await base44.entities.User.filter({ email: formData.email });
        const newUser = users[0];
        
        if (newUser) {
          // 4. Aggiorna con tutti i dati
          await base44.entities.User.update(newUser.id, formData);
        }
        
        queryClient.invalidateQueries({ queryKey: ['all-members-paginated'] });
        setShowMemberForm(false);
        setFormData(null);
      } catch (error) {
        alert('Errore durante la creazione del membro');
      }
    }
  };

  const handlePermissionChange = (key, value) => {
    if (!selectedMember) return;
    const currentPermissions = selectedMember.permissions || {};
    setSelectedMember({
      ...selectedMember,
      permissions: {
        ...currentPermissions,
        [key]: value
      }
    });
  };

  // Se impersonation è attiva con ruolo 'user', mostra la vista utente
  const isAdmin = user?.role === 'admin' && !impersonation.active;

  // Vista per utenti normali (non admin) — impersonation mode
  if (!isAdmin) {
    return (
      <div className="min-h-screen pb-64" style={{ backgroundColor: 'var(--app-bg)' }}>
            <Header user={user} />

            <main className="px-4 py-6 max-w-md mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <Link to={createPageUrl('Esplora?tab=strumenti')} className="text-lime-400 p-3 -m-3 rounded-full back-arrow-tap">
                  <ArrowLeft className="w-7 h-7" />
                </Link>
                <h1 className="text-white text-xl font-bold">Utenti del Consorzio</h1>
              </div>

          <MembersDirectory currentUserEmail={impersonation.active ? impersonation.targetEmail : user?.email} />
        </main>

        <BottomNavWithMenu currentPage="GestioneMembri" unreadMessages={messages.length} />
      </div>
    );
  }

  // Vista Admin
  return (
    <div className="min-h-screen pb-64" style={{ backgroundColor: 'var(--app-bg)' }}>
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('AdminPanel')} className="text-lime-400 p-3 -m-3 rounded-full back-arrow-tap">
              <ArrowLeft className="w-7 h-7" />
            </Link>
            <h1 className="text-white text-xl font-bold">Gestione Utenti</h1>
          </div>
        </div>

        {/* Tabs principali */}
        <Tabs defaultValue="utenti" className="w-full">
          <TabsList className="w-full bg-slate-800 border border-slate-700 mb-4 grid grid-cols-4">
            <TabsTrigger value="utenti" className="text-[10px] data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900">
              <Users className="w-3 h-3 mr-0.5" />
              Utenti
            </TabsTrigger>
            <TabsTrigger value="registrazioni" className="text-[10px] data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900">
              <UserPlus className="w-3 h-3 mr-0.5" />
              Inviti
            </TabsTrigger>
            <TabsTrigger value="consulenti" className="text-[10px] data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900">
              <Briefcase className="w-3 h-3 mr-0.5" />
              Assegna
            </TabsTrigger>
            <TabsTrigger value="zone" className="text-[10px] data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900">
              <MapPin className="w-3 h-3 mr-0.5" />
              Zone
            </TabsTrigger>
          </TabsList>

          {/* TAB UTENTI */}
          <TabsContent value="utenti" className="space-y-4">

        {members.some(m => m.is_blocked) && (
          <div className="mb-4">
            <Button
              onClick={() => {
                if (confirm('Sbloccare tutti gli utenti bloccati?')) {
                  unblockAllMutation.mutate();
                }
              }}
              disabled={unblockAllMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <Unlock className="w-4 h-4 mr-2" />
              Sblocca Utenti Bloccati
            </Button>
          </div>
        )}

        {/* Conteggio totale */}
        <p className="text-slate-500 text-xs mb-2">Totale: {totalCount} utenti</p>

        {/* Search and Zone Filter */}
        <div className="space-y-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Cerca utenti..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white pl-10"
            />
          </div>
          <Select value={selectedZone} onValueChange={setSelectedZone}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
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
        {pendingInvites.length > 0 && (
          <Card className="bg-amber-500/10 border-amber-500/30 mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-amber-400" />
                <h3 className="text-amber-400 font-medium text-sm">Inviti in attesa ({pendingInvites.length})</h3>
              </div>
              <div className="space-y-2">
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="bg-slate-900 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-amber-400" />
                      <div>
                        <p className="text-white text-sm">{invite.email}</p>
                        <p className="text-slate-500 text-xs">
                          Invitato il {new Date(invite.created_date).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-amber-500/20 text-amber-400 border-0 text-xs">
                      In attesa
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Members List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-xs">{totalCount} utenti trovati — Pagina {page}/{totalPages}</p>
            </div>
            {members.map((member) => (
              <Card key={member.id} className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
...
                  </div>
                </CardContent>
              </Card>
            ))}
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  ← Precedente
                </Button>
                <span className="text-slate-400 text-sm">{page} / {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Successiva →
                </Button>
              </div>
            )}
          </div>
        )}
          </TabsContent>

          {/* TAB REGISTRAZIONI */}
          <TabsContent value="registrazioni" className="space-y-4">
            {/* Invita Utente */}
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <h3 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
                  <Send className="w-4 h-4 text-lime-400" />
                  Invita Utente
                </h3>
                <p className="text-slate-400 text-xs mb-3">
                  Invia subito un invito via email. Solo per utenti (membri del consorzio).
                </p>
                <InviteUserForm onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ['all-members-paginated'] });
                  queryClient.invalidateQueries({ queryKey: ['pending-invites-users'] });
                }} />
              </CardContent>
            </Card>

            {/* Pre-autorizza */}
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <h3 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-400" />
                  Pre-autorizza Email
                </h3>
                <p className="text-slate-400 text-xs mb-3">
                  Inserisci email in whitelist. Funziona per utenti e consulenti. L'utente non riceve email, ma quando si registra viene riconosciuto.
                </p>
                <PreAuthEmailForm />
              </CardContent>
            </Card>

            {/* Lista Registrati per Zona */}
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <h3 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-400" />
                  Utenti Registrati per Zona
                </h3>
                
                <Select value={selectedZoneRegistrati} onValueChange={setSelectedZoneRegistrati}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white mb-4">
                    <SelectValue placeholder="Seleziona zona..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte le zone</SelectItem>
                    {zones.map(zone => (
                      <SelectItem key={zone.id} value={zone.name}>{zone.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedZoneRegistrati && (
                  <ZoneUsersListInline selectedZone={selectedZoneRegistrati} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB ASSEGNA CONSULENTI */}
          <TabsContent value="consulenti" className="space-y-4">
            <ConsultantAssignmentManager />
          </TabsContent>

          {/* TAB ZONE UTENTI */}
          <TabsContent value="zone" className="space-y-4">
            <ZoneAssignmentManager />
          </TabsContent>
        </Tabs>
      </main>

      {/* Member Form Dialog */}
      <Dialog open={showMemberForm} onOpenChange={(open) => {
        setShowMemberForm(open);
        if (!open) {
          setSelectedMember(null);
          setFormData(null);
          setInitialFormData(null);
          // Rimuovi memberId dall'URL per evitare che il dialog si riapra
          const url = new URL(window.location.href);
          if (url.searchParams.has('memberId')) {
            url.searchParams.delete('memberId');
            window.history.replaceState({}, '', url.pathname);
          }
        }
      }}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedMember ? 'Modifica Dati Azienda' : 'Nuovo Membro Azienda'}
            </DialogTitle>
          </DialogHeader>
          
          {formData && (
            <Tabs defaultValue="profilo" className="w-full mt-4">
              <TabsList className="w-full bg-slate-900 border border-slate-700 mb-4">
                <TabsTrigger value="profilo" className="flex-1 data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900">
                  <User className="w-4 h-4 mr-2" />
                  Profilo
                </TabsTrigger>
                {selectedMember?.role !== 'consulente' && (
                  <TabsTrigger value="bandi" className="flex-1 data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900">
                    <FileText className="w-4 h-4 mr-2" />
                    Profilo Bandi
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="profilo">
            <div className="space-y-6">
              {/* Dati Aziendali */}
              <div className="space-y-4">
                <h3 className="text-lime-400 font-semibold text-sm">Dati Aziendali</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label className="text-lime-400 text-sm font-medium">Nome Azienda (obbligatorio)</Label>
                    <Input
                      value={formData.company_name}
                      onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                      className="bg-lime-400/10 border-lime-400 text-white mt-1 placeholder:text-lime-400/50"
                      placeholder="Es: Acme S.r.l."
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-lime-400 text-sm font-medium">Specializzazione (obbligatorio)</Label>
                    <Input
                      value={formData.specializzazione || ''}
                      onChange={(e) => setFormData({...formData, specializzazione: e.target.value})}
                      className="bg-lime-400/10 border-lime-400 text-white mt-1 placeholder:text-lime-400/50"
                      placeholder="Es: Produzione industriale, Servizi IT, Consulenza..."
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-slate-300 text-sm">Logo Aziendale</Label>
                    <div className="mt-2 space-y-3">
                      {formData.logo_url && (
                        <div className="flex items-center gap-3 bg-slate-900 rounded-lg p-3">
                          <img 
                            src={formData.logo_url} 
                            alt="Logo" 
                            className="w-16 h-16 object-contain rounded"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setFormData({...formData, logo_url: ''})}
                            className="border-red-600 text-red-400"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Rimuovi
                          </Button>
                        </div>
                      )}
                      <label className="flex items-center justify-center gap-2 bg-slate-900 border-2 border-dashed border-slate-700 rounded-lg p-4 cursor-pointer hover:border-lime-400 transition-colors">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg"
                          onChange={handleLogoUpload}
                          className="hidden"
                          disabled={uploadingLogo}
                        />
                        {uploadingLogo ? (
                          <>
                            <div className="animate-spin w-5 h-5 border-2 border-lime-400 border-t-transparent rounded-full"></div>
                            <span className="text-slate-400">Caricamento...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-lime-400" />
                            <span className="text-slate-300">Carica logo (JPG, PNG)</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                  <div>
                    <Label className="text-lime-400 text-sm font-medium">Email Aziendale (obbligatorio) {!selectedMember && <span className="text-xs text-slate-500">(usata per login)</span>}</Label>
                    <Input
                      type="email"
                      value={formData.company_email || formData.email}
                      onChange={(e) => setFormData({...formData, company_email: e.target.value, email: selectedMember ? formData.email : e.target.value})}
                      className="bg-lime-400/10 border-lime-400 text-white mt-1 placeholder:text-lime-400/50"
                      placeholder="info@azienda.it"
                      disabled={!!selectedMember && !formData.company_email}
                    />
                    {!selectedMember && (
                      <p className="text-xs text-slate-500 mt-1">L'azienda riceverà una mail per impostare la password</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm">Telefono Aziendale</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white mt-1"
                      placeholder="+39 02 1234567"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-slate-300 text-sm">Sito Web</Label>
                    <Input
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white mt-1"
                      placeholder="https://www.azienda.it"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm">Partita IVA</Label>
                    <Input
                      value={formData.vat_number}
                      onChange={(e) => setFormData({...formData, vat_number: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white mt-1"
                      placeholder="IT12345678901"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm">Codice ATECO</Label>
                    <Input
                      value={formData.ateco_code}
                      onChange={(e) => setFormData({...formData, ateco_code: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white mt-1"
                      placeholder="47.91.10"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-slate-300 text-sm">Dimensione Azienda</Label>
                    <Select
                      value={formData.company_size || 'Piccola'}
                      onValueChange={(value) => setFormData({...formData, company_size: value})}
                    >
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Micro">Micro</SelectItem>
                        <SelectItem value="Piccola">Piccola</SelectItem>
                        <SelectItem value="Media">Media</SelectItem>
                        <SelectItem value="Grande">Grande</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-slate-300 text-sm">Indirizzo</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white mt-1"
                      placeholder="Via Roma, 123"
                    />
                  </div>
                  <div>
                    <Label className="text-lime-400 text-sm font-medium">Città (obbligatorio)</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className="bg-lime-400/10 border-lime-400 text-white mt-1 placeholder:text-lime-400/50"
                      placeholder="Milano"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm">Provincia</Label>
                    <Input
                      value={formData.province}
                      onChange={(e) => setFormData({...formData, province: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white mt-1"
                      placeholder="MI"
                      maxLength={2}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-slate-300 text-sm">CAP</Label>
                    <Input
                      value={formData.postal_code}
                      onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white mt-1"
                      placeholder="20100"
                    />
                  </div>
                </div>
              </div>

              {/* Referente Aziendale */}
              <div className="space-y-4">
                <h3 className="text-lime-400 font-semibold text-sm">Referente Aziendale</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label className="text-lime-400 text-sm font-medium">Nome Referente (obbligatorio)</Label>
                    <Input
                      value={formData.referente || formData.full_name}
                      onChange={(e) => setFormData({...formData, referente: e.target.value, full_name: selectedMember ? formData.full_name : e.target.value})}
                      className="bg-lime-400/10 border-lime-400 text-white mt-1 placeholder:text-lime-400/50"
                      placeholder="Mario Rossi"
                    />
                  </div>
                  <div>
                    <Label className="text-lime-400 text-sm font-medium">Cellulare Referente (obbligatorio)</Label>
                    <Input
                      value={formData.cellulare_referente || formData.referente_cellulare}
                      onChange={(e) => setFormData({...formData, cellulare_referente: e.target.value, referente_cellulare: e.target.value})}
                      className="bg-lime-400/10 border-lime-400 text-white mt-1 placeholder:text-lime-400/50"
                      placeholder="+39 333 1234567"
                    />
                  </div>
                  <div>
                    <Label className="text-lime-400 text-sm font-medium">Email Referente (obbligatorio)</Label>
                    <Input
                      type="email"
                      value={formData.referente_email}
                      onChange={(e) => setFormData({...formData, referente_email: e.target.value})}
                      className="bg-lime-400/10 border-lime-400 text-white mt-1 placeholder:text-lime-400/50"
                      placeholder="mario.rossi@azienda.it"
                    />
                  </div>
                </div>
              </div>

              {/* Dati Fatturazione */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-blue-400 font-semibold text-sm">Dati di Fatturazione (Facoltativi)</h3>
                  <span className="text-slate-500 text-xs">Tutti i campi sono opzionali</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label className="text-slate-300 text-sm">Ragione Sociale Fatturazione</Label>
                    <Input
                      value={formData.ragione_sociale_fatturazione}
                      onChange={(e) => setFormData({...formData, ragione_sociale_fatturazione: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white mt-1"
                      placeholder="Se diversa dalla ragione sociale"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm">Partita IVA</Label>
                    <Input
                      value={formData.partita_iva}
                      onChange={(e) => setFormData({...formData, partita_iva: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white mt-1"
                      placeholder="IT12345678901"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm">Codice Fiscale</Label>
                    <Input
                      value={formData.codice_fiscale}
                      onChange={(e) => setFormData({...formData, codice_fiscale: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white mt-1"
                      placeholder="12345678901"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-slate-300 text-sm">Codice SDI</Label>
                    <Input
                      value={formData.codice_sdi}
                      onChange={(e) => setFormData({...formData, codice_sdi: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white mt-1"
                      placeholder="Sistema di Interscambio - es: ABCDEFG"
                    />
                    <p className="text-xs text-slate-500 mt-1">Codice per fatturazione elettronica</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-slate-300 text-sm">Indirizzo</Label>
                    <Input
                      value={formData.indirizzo}
                      onChange={(e) => setFormData({...formData, indirizzo: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white mt-1"
                      placeholder="Via Roma, 123"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm">Città</Label>
                    <Input
                      value={formData.citta}
                      onChange={(e) => setFormData({...formData, citta: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white mt-1"
                      placeholder="Milano"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm">Provincia</Label>
                    <Input
                      value={formData.provincia}
                      onChange={(e) => setFormData({...formData, provincia: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white mt-1"
                      placeholder="MI"
                    />
                  </div>
                  <div>
                    <Label className="text-lime-400 text-sm font-medium">Regione (obbligatorio)</Label>
                    <Select
                      value={formData.region || formData.regione || ''}
                      onValueChange={(value) => setFormData({...formData, region: value, regione: value})}
                    >
                      <SelectTrigger className="bg-lime-400/10 border-lime-400 text-white mt-1">
                        <SelectValue placeholder="Seleziona regione" />
                      </SelectTrigger>
                      <SelectContent>
                        {['Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna',
                          'Friuli Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche',
                          'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana',
                          'Trentino-Alto Adige', 'Umbria', "Valle d'Aosta", 'Veneto'].map((regione) => (
                          <SelectItem key={regione} value={regione}>{regione}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm">CAP</Label>
                    <Input
                      value={formData.cap}
                      onChange={(e) => setFormData({...formData, cap: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white mt-1"
                      placeholder="20100"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-slate-300 text-sm">Paese</Label>
                    <Input
                      value={formData.paese}
                      onChange={(e) => setFormData({...formData, paese: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white mt-1"
                      placeholder="Italia"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-700">
                <Button
                  variant="outline"
                  onClick={() => setShowMemberForm(false)}
                  className="flex-1 border-slate-600 text-slate-400 hover:text-white"
                >
                  Annulla
                </Button>
                <Button
                  onClick={handleSaveMember}
                  disabled={
                    updateMemberMutation.isPending || 
                    !formData.company_name || 
                    !formData.email || 
                    !formData.full_name ||
                    (selectedMember && JSON.stringify(formData) === JSON.stringify(initialFormData))
                  }
                  className="flex-1 bg-lime-400 hover:bg-lime-500 text-slate-900"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateMemberMutation.isPending 
                    ? 'Salvataggio...' 
                    : selectedMember 
                      ? 'Salva Modifiche' 
                      : 'Crea Membro e Invia Invito'}
                </Button>
              </div>
            </div>
              </TabsContent>

              {selectedMember?.role !== 'consulente' && (
                <TabsContent value="bandi">
                  <ProfiloBandiForm user={selectedMember} />
                </TabsContent>
              )}
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={showPermissions} onOpenChange={setShowPermissions}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Permessi - {selectedMember?.company_name || selectedMember?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {PERMISSIONS_LIST.map((perm) => {
              const isEnabled = selectedMember?.permissions?.[perm.key] !== false;
              return (
                <div key={perm.key} className="flex items-center justify-between">
                  <Label className={isEnabled ? "text-slate-300" : "text-red-400"}>{perm.label}</Label>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => handlePermissionChange(perm.key, checked)}
                    className={isEnabled 
                      ? "data-[state=checked]:bg-green-500" 
                      : "data-[state=unchecked]:bg-red-500"
                    }
                  />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button 
              onClick={() => updatePermissionsMutation.mutate({ 
                memberId: selectedMember.id, 
                permissions: selectedMember.permissions 
              })}
              disabled={updatePermissionsMutation.isPending}
              className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
            >
              {updatePermissionsMutation.isPending ? 'Salvataggio...' : 'Salva Permessi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNavWithMenu currentPage="GestioneMembri" unreadMessages={messages.length} />
    </div>
  );
}