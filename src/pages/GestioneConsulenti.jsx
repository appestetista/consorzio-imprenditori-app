import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, User, Lock, Unlock, Trash2, Settings, Search, Edit, UserPlus, Save, Briefcase, Clock, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import InviteConsultantForm from '../components/admin/InviteConsultantForm';

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

const ZONES = [
  "Nord Italia",
  "Centro Italia", 
  "Sud Italia",
  "Isole",
  "Nazionale"
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

export default function GestioneConsulenti() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedConsultant, setSelectedConsultant] = useState(null);
  const [showSections, setShowSections] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [formData, setFormData] = useState(null);
  const [sectionsData, setSectionsData] = useState([]);
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

  const { data: consultants = [], isLoading } = useQuery({
    queryKey: ['consultants'],
    queryFn: () => base44.entities.Consultant.list(),
  });

  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: () => base44.entities.Zone.filter({ is_active: true }),
  });

  const { data: pendingInvites = [] } = useQuery({
    queryKey: ['pending-invites-consultants'],
    queryFn: async () => {
      const invites = await base44.entities.PendingInvite.filter({ user_type: 'consulente' });
      return invites.filter(i => !i.is_registered);
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', user?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: user?.email, is_read: false }),
    enabled: !!user?.email,
  });

  const toggleBlockMutation = useMutation({
    mutationFn: async ({ consultantId, isBlocked }) => {
      return base44.entities.Consultant.update(consultantId, { is_blocked: !isBlocked });
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
      setFormData(null);
      setSelectedConsultant(null);
    }
  });

  const updateSectionsMutation = useMutation({
    mutationFn: async ({ consultantId, sections }) => {
      // Aggiorna sia nel Consultant che nel PendingInvite (se esiste)
      await base44.entities.Consultant.update(consultantId, { assigned_sections: sections });
      
      // Trova e aggiorna anche il PendingInvite collegato
      const invite = pendingInvites.find(i => i.email === selectedConsultant?.email);
      if (invite) {
        await base44.entities.PendingInvite.update(invite.id, { assigned_sections: sections });
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

  const filteredConsultants = consultants.filter(consultant => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      consultant.name?.toLowerCase().includes(searchLower) ||
      consultant.email?.toLowerCase().includes(searchLower) ||
      consultant.category?.toLowerCase().includes(searchLower)
    );
    const matchesZone = selectedZone === 'all' || consultant.zona === selectedZone;
    return matchesSearch && matchesZone;
  });

  const handleEditConsultant = (consultant) => {
    setFormData({
      name: consultant.name || '',
      category: consultant.category || '',
      email: consultant.email || '',
      phone: consultant.phone || '',
      city: consultant.city || '',
      referente: consultant.referente || '',
      cellulare_referente: consultant.cellulare_referente || '',
    });
    setSelectedConsultant(consultant);
    setShowEditForm(true);
  };

  const handleOpenSections = (consultant) => {
    // Prendi le sezioni dal Consultant o dal PendingInvite
    const invite = pendingInvites.find(i => i.email === consultant.email);
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

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('AdminPanel')} className="text-lime-400">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-white text-xl font-bold">Gestione Consulenti</h1>
          </div>
          <Button
            onClick={() => setShowInviteForm(true)}
            className="bg-lime-400 hover:bg-lime-500 text-slate-900"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Invita
          </Button>
        </div>

        {/* Search and Zone Filter */}
        <div className="space-y-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Cerca consulenti..."
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
                        {invite.consultant_name && (
                          <p className="text-white text-sm font-medium">{invite.consultant_name}</p>
                        )}
                        <p className={`text-sm ${invite.consultant_name ? 'text-slate-400' : 'text-white'}`}>{invite.email}</p>
                        {invite.consultant_category && (
                          <p className="text-lime-400 text-xs">{invite.consultant_category}</p>
                        )}
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

        {/* Consultants List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredConsultants.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-6 text-center">
                  <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Nessun consulente trovato</p>
                </CardContent>
              </Card>
            ) : (
              filteredConsultants.map((consultant) => (
                <Card key={consultant.id} className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        consultant.is_blocked ? 'bg-red-500/20' : 'bg-lime-400/20'
                      }`}>
                        <Briefcase className={`w-6 h-6 ${consultant.is_blocked ? 'text-red-400' : 'text-lime-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-medium truncate">
                            {consultant.name || 'N/A'}
                          </p>
                          {consultant.is_blocked && (
                            <Badge className="bg-red-500/20 text-red-400 border-0">
                              Bloccato
                            </Badge>
                          )}
                        </div>
                        <p className="text-lime-400 text-sm truncate">{consultant.category}</p>
                        <p className="text-slate-400 text-xs truncate">{consultant.email}</p>
                        {consultant.city && (
                          <p className="text-slate-500 text-xs">{consultant.city}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-lime-400 text-lime-400 hover:bg-lime-400/20"
                        onClick={() => handleEditConsultant(consultant)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Modifica
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        onClick={() => handleOpenSections(consultant)}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className={consultant.is_blocked 
                          ? 'border-red-600 text-red-400 hover:bg-red-600/20'
                          : 'border-green-600 text-green-400 hover:bg-green-600/20'}
                        onClick={() => toggleBlockMutation.mutate({ consultantId: consultant.id, isBlocked: consultant.is_blocked })}
                        disabled={toggleBlockMutation.isPending}
                      >
                        {consultant.is_blocked ? (
                          <Lock className="w-4 h-4" />
                        ) : (
                          <Unlock className="w-4 h-4" />
                        )}
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-600 text-red-400 hover:bg-red-600/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-800 border-slate-700">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">Eliminare questo consulente?</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400">
                              Questa azione non può essere annullata. Il consulente verrà rimosso permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600 hover:text-white">Annulla</AlertDialogCancel>
                            <AlertDialogAction 
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => deleteConsultantMutation.mutate(consultant.id)}
                            >
                              Elimina
                            </AlertDialogAction>
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
      </main>

      {/* Edit Consultant Dialog */}
      <Dialog open={showEditForm} onOpenChange={(open) => {
        setShowEditForm(open);
        if (!open) {
          setSelectedConsultant(null);
          setFormData(null);
        }
      }}>
        <DialogContent className="bg-slate-800 border-slate-700 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Modifica Consulente</DialogTitle>
          </DialogHeader>
          
          {formData && (
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-slate-300 text-sm">Nome/Studio *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                  placeholder="Nome consulente o studio"
                />
              </div>

              <div>
                <Label className="text-slate-300 text-sm">Categoria *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({...formData, category: value})}
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
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                  placeholder="email@esempio.com"
                />
              </div>

              <div>
                <Label className="text-slate-300 text-sm">Telefono</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                  placeholder="+39 02 1234567"
                />
              </div>

              <div>
                <Label className="text-slate-300 text-sm">Città</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                  placeholder="Milano"
                />
              </div>

              <div>
                <Label className="text-slate-300 text-sm">Referente</Label>
                <Input
                  value={formData.referente}
                  onChange={(e) => setFormData({...formData, referente: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                  placeholder="Nome referente"
                />
              </div>

              <div>
                <Label className="text-slate-300 text-sm">Cellulare Referente</Label>
                <Input
                  value={formData.cellulare_referente}
                  onChange={(e) => setFormData({...formData, cellulare_referente: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                  placeholder="+39 333 1234567"
                />
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
                    data: formData
                  })}
                  disabled={updateConsultantMutation.isPending || !formData.name || !formData.category}
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
          }} />
        </DialogContent>
      </Dialog>

      <BottomNav currentPage="GestioneConsulenti" unreadMessages={messages.length} />
    </div>
  );
}