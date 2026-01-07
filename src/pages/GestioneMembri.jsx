import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, User, Lock, Unlock, Trash2, Settings, Search, Shield, ShieldOff, Edit, X, Plus, Upload, Image } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';

const PERMISSIONS_LIST = [
  { key: 'calendario', label: 'Calendario Incontri' },
  { key: 'video_interviste', label: 'Video Interviste' },
  { key: 'cultura_aziendale', label: 'Cultura Aziendale' },
  { key: 'consulenze', label: 'Consulenze' },
  { key: 'finanziamenti', label: 'Finanziamenti Agevolati' },
  { key: 'contatta_membri', label: 'Contatta Membri' },
  { key: 'marketplace', label: 'Marketplace' },
  { key: 'risparmio_energetico', label: 'Risparmio Energetico' }
];

export default function GestioneMembri() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [formData, setFormData] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
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

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['all-members'],
    queryFn: () => base44.entities.User.list(),
  });

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
      queryClient.invalidateQueries({ queryKey: ['all-members'] });
    }
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ memberId, data }) => {
      return base44.entities.User.update(memberId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-members'] });
      setShowMemberForm(false);
      setFormData(null);
    }
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ memberId, permissions }) => {
      return base44.entities.User.update(memberId, { permissions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-members'] });
      setShowPermissions(false);
      setSelectedMember(null);
    }
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId) => {
      return base44.entities.User.delete(memberId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-members'] });
    }
  });

  const filteredMembers = members.filter(member => {
    const searchLower = searchTerm.toLowerCase();
    return (
      member.company_name?.toLowerCase().includes(searchLower) ||
      member.full_name?.toLowerCase().includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower)
    );
  });

  const handleEditMember = (member) => {
    setFormData({
      company_name: member.company_name || '',
      email: member.email || '',
      phone: member.phone || '',
      website: member.website || '',
      logo_url: member.logo_url || '',
      full_name: member.full_name || '',
      referente_cellulare: member.referente_cellulare || '',
      referente_email: member.referente_email || '',
      ragione_sociale_fatturazione: member.ragione_sociale_fatturazione || '',
      partita_iva: member.partita_iva || '',
      codice_fiscale: member.codice_fiscale || '',
      codice_sdi: member.codice_sdi || '',
      indirizzo: member.indirizzo || '',
      citta: member.citta || '',
      provincia: member.provincia || '',
      regione: member.regione || '',
      cap: member.cap || '',
      paese: member.paese || ''
    });
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
        
        queryClient.invalidateQueries({ queryKey: ['all-members'] });
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
            <h1 className="text-white text-xl font-bold">Gestione Membri</h1>
          </div>
          <Button
            onClick={() => {
              setFormData({
                company_name: '',
                email: '',
                phone: '',
                website: '',
                logo_url: '',
                full_name: '',
                referente_cellulare: '',
                referente_email: '',
                ragione_sociale_fatturazione: '',
                partita_iva: '',
                codice_fiscale: '',
                codice_sdi: '',
                indirizzo: '',
                citta: '',
                provincia: '',
                regione: '',
                cap: '',
                paese: ''
              });
              setSelectedMember(null);
              setShowMemberForm(true);
            }}
            className="bg-lime-400 hover:bg-lime-500 text-slate-900"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuovo Membro
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Cerca membri..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white pl-10"
          />
        </div>

        {/* Members List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMembers.map((member) => (
              <Card key={member.id} className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      member.is_blocked ? 'bg-red-500/20' : 'bg-lime-400/20'
                    }`}>
                      <User className={`w-6 h-6 ${member.is_blocked ? 'text-red-400' : 'text-lime-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-medium truncate">
                          {member.company_name || member.full_name || 'N/A'}
                        </p>
                        {member.role === 'admin' && (
                          <Badge className="bg-purple-500/20 text-purple-400 border-0">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                        {member.is_blocked && (
                          <Badge className="bg-red-500/20 text-red-400 border-0">
                            Bloccato
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-400 text-sm truncate">{member.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-lime-400 text-lime-400 hover:bg-lime-400/20"
                      onClick={() => handleEditMember(member)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Modifica
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      onClick={() => {
                        setSelectedMember(member);
                        setShowPermissions(true);
                      }}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className={member.is_blocked 
                        ? 'border-green-600 text-green-400 hover:bg-green-600/20'
                        : 'border-red-600 text-red-400 hover:bg-red-600/20'}
                      onClick={() => toggleBlockMutation.mutate({ memberId: member.id, isBlocked: member.is_blocked })}
                      disabled={toggleBlockMutation.isPending}
                    >
                      {member.is_blocked ? (
                        <Unlock className="w-4 h-4" />
                      ) : (
                        <Lock className="w-4 h-4" />
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
                          <AlertDialogTitle className="text-white">Eliminare questo membro?</AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400">
                            Questa azione non può essere annullata. Il membro verrà rimosso permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-slate-700 text-white border-slate-600">Annulla</AlertDialogCancel>
                          <AlertDialogAction 
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deleteMemberMutation.mutate(member.id)}
                          >
                            Elimina
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Member Form Dialog */}
      <Dialog open={showMemberForm} onOpenChange={(open) => {
        setShowMemberForm(open);
        if (!open) {
          setEditingMember(null);
          setFormData(null);
        }
      }}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedMember ? 'Modifica Dati Azienda' : 'Nuovo Membro Azienda'}
            </DialogTitle>
          </DialogHeader>
          <button
            onClick={() => setShowMemberForm(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
          
          {formData && (
            <div className="space-y-6 mt-4">
              {/* Dati Aziendali */}
              <div className="space-y-4">
                <h3 className="text-lime-400 font-semibold text-sm">Dati Aziendali</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label className="text-slate-300 text-sm">Ragione Sociale *</Label>
                    <Input
                      value={formData.company_name}
                      onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white mt-1"
                      placeholder="Es: Acme S.r.l."
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
                    <Label className="text-slate-300 text-sm">Email Aziendale * {!selectedMember && <span className="text-xs text-slate-500">(usata per login)</span>}</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white mt-1"
                      placeholder="info@azienda.it"
                      disabled={!!selectedMember}
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
                </div>
              </div>

              {/* Referente Aziendale */}
              <div className="space-y-4">
                <h3 className="text-lime-400 font-semibold text-sm">Referente Aziendale</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label className="text-slate-300 text-sm">Nome e Cognome Referente *</Label>
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white mt-1"
                      placeholder="Mario Rossi"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm">Cellulare Referente</Label>
                    <Input
                      value={formData.referente_cellulare}
                      onChange={(e) => setFormData({...formData, referente_cellulare: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white mt-1"
                      placeholder="+39 333 1234567"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm">Email Referente</Label>
                    <Input
                      type="email"
                      value={formData.referente_email}
                      onChange={(e) => setFormData({...formData, referente_email: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white mt-1"
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
                    <Label className="text-slate-300 text-sm">Regione</Label>
                    <Input
                      value={formData.regione}
                      onChange={(e) => setFormData({...formData, regione: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white mt-1"
                      placeholder="Lombardia"
                    />
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
                  className="flex-1 border-slate-600 text-slate-300"
                >
                  Annulla
                </Button>
                <Button
                  onClick={handleSaveMember}
                  disabled={updateMemberMutation.isPending || !formData.company_name || !formData.email || !formData.full_name}
                  className="flex-1 bg-lime-400 hover:bg-lime-500 text-slate-900"
                >
                  {updateMemberMutation.isPending 
                    ? 'Salvataggio...' 
                    : selectedMember 
                      ? 'Salva Modifiche' 
                      : 'Crea Membro e Invia Invito'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={showPermissions} onOpenChange={setShowPermissions}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Permessi - {selectedMember?.company_name || selectedMember?.full_name}</DialogTitle>
          </DialogHeader>
          <button
            onClick={() => setShowPermissions(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
          <div className="space-y-4 mt-4">
            {PERMISSIONS_LIST.map((perm) => {
              const isEnabled = selectedMember?.permissions?.[perm.key] !== false;
              return (
                <div key={perm.key} className="flex items-center justify-between">
                  <Label className="text-slate-300">{perm.label}</Label>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => handlePermissionChange(perm.key, checked)}
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

      <BottomNav currentPage="GestioneMembri" unreadMessages={messages.length} />
    </div>
  );
}