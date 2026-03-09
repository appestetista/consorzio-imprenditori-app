import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { UserCog, Plus, Edit, Trash2, Search, Clock, Mail, Settings, Phone, PhoneOff, UserPlus, Ban, CheckCircle, Save, MessageSquare, Lock, Unlock, Send, Building2, Eye } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import InviteConsultantForm from '../admin/InviteConsultantForm';

const CONSULTANT_CATEGORIES = [
  "Stampa Digitale e Cataloghi",
  "Assicurazioni Aziendali",
  "Agenzia di Comunicazione",
  "Commercialista",
  "Igiene e Sicurezza",
  "Export",
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

export default function AdminView({ consultants, adminEmail }) {
  const [showConsultantDialog, setShowConsultantDialog] = useState(false);
  const [editingConsultant, setEditingConsultant] = useState(null);
  const [activeTab, setActiveTab] = useState('consultants');
  const [consultantForm, setConsultantForm] = useState({
    name: '',
    category: '',
    city: '',
    phone: '',
    email: '',
    referente: '',
    cellulare_referente: '',
    zona: '',
    zone_assegnate: [],
    free_consultations_per_user: 1
  });
  
  // Stati per gestione consulenti avanzata
  const [searchTermConsultant, setSearchTermConsultant] = useState('');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState('all');
  const [showSections, setShowSections] = useState(false);
  const [selectedConsultant, setSelectedConsultant] = useState(null);
  const [sectionsData, setSectionsData] = useState([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [dialogViewMode, setDialogViewMode] = useState('admin'); // 'admin' o 'consultant'
  
  const queryClient = useQueryClient();



  const { data: allBookings = [] } = useQuery({
    queryKey: ['all-bookings-admin'],
    queryFn: () => base44.entities.ConsultationBooking.list('-created_date'),
  });

  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: () => base44.entities.Zone.filter({ is_active: true }),
  });

  // Fetch users to get names
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-admin'],
    queryFn: () => base44.entities.User.list(),
  });

  // Conta le notifiche di consulenza non lette per l'admin
  const { data: unreadConsultationNotifications = [] } = useQuery({
    queryKey: ['unread-consultation-notifications', adminEmail],
    queryFn: () => base44.entities.Notification.filter({
      user_email: adminEmail,
      type: 'consultation',
      is_read: false
    }),
    enabled: !!adminEmail,
  });

  const unreadConsultationCount = unreadConsultationNotifications.length;

  // Segna le notifiche come lette quando si apre il tab Richieste
  React.useEffect(() => {
    const markNotificationsAsRead = async () => {
      if (activeTab === 'bookings' && adminEmail && unreadConsultationNotifications.length > 0) {
        for (const notif of unreadConsultationNotifications) {
          await base44.entities.Notification.update(notif.id, { is_read: true });
        }
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['unread-consultation-notifications', adminEmail] });
      }
    };
    markNotificationsAsRead();
  }, [activeTab, adminEmail, queryClient, unreadConsultationNotifications]);

  const saveConsultantMutation = useMutation({
    mutationFn: async (data) => {
      if (editingConsultant) {
        await base44.entities.Consultant.update(editingConsultant.id, data);
      } else {
        await base44.entities.Consultant.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
      setShowConsultantDialog(false);
      setEditingConsultant(null);
      setConsultantForm({
        name: '',
        category: '',
        phone: '',
        email: '',
        referente: '',
        cellulare_referente: '',
        available_slots: 100
      });
    }
  });

  const deleteConsultantMutation = useMutation({
    mutationFn: (id) => base44.entities.Consultant.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    }
  });



  const deleteBookingMutation = useMutation({
    mutationFn: (bookingId) => base44.entities.ConsultationBooking.delete(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-bookings-admin'] });
    }
  });

  const handleEditConsultant = (consultant) => {
    setEditingConsultant(consultant);
    setConsultantForm({
      name: consultant.name || '',
      category: consultant.category || '',
      city: consultant.city || '',
      phone: consultant.phone || '',
      email: consultant.email || '',
      referente: consultant.referente || '',
      cellulare_referente: consultant.cellulare_referente || '',
      zona: consultant.zona || '',
      zone_assegnate: consultant.zone_assegnate || (consultant.zona ? [consultant.zona] : []),
      free_consultations_per_user: consultant.free_consultations_per_user ?? 1,
      // Campi admin
      is_blocked: consultant.is_blocked || false,
      block_calls_for_all: consultant.block_calls_for_all || false,
      sede_azienda_disabled: consultant.sede_azienda_disabled || false,
      rimborso_carburante: consultant.rimborso_carburante || 0,
      available_slots: consultant.available_slots || 100,
      assigned_sections: consultant.assigned_sections || [],
      communication_sections: consultant.communication_sections || [],
      blocked_users_calls: consultant.blocked_users_calls || []
    });
    setShowConsultantDialog(true);
  };

  return (
    <>
      <Tabs defaultValue="consultants" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-slate-800 mb-6">
          <TabsTrigger value="consultants" className="data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900">
            <UserCog className="w-4 h-4 mr-2" />
            Consulenti
          </TabsTrigger>
          <TabsTrigger value="bookings" className="data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900 relative">
            Richieste
            {unreadConsultationCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
                {unreadConsultationCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consultants">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-white text-xl font-bold">Gestione Consulenti</h2>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowInviteForm(!showInviteForm)}
                variant="outline"
                className="border-blue-500 text-blue-400 hover:bg-blue-500/20"
              >
                <Send className="w-4 h-4 mr-2" />
                Invita
              </Button>
              <Button
                onClick={() => {
                  setEditingConsultant(null);
                  setConsultantForm({
                    name: '',
                    category: '',
                    city: '',
                    phone: '',
                    email: '',
                    referente: '',
                    cellulare_referente: '',
                    zona: '',
                    zone_assegnate: [],
                    free_consultations_per_user: 1
                  });
                  setShowConsultantDialog(true);
                }}
                className="bg-lime-400 hover:bg-lime-500 text-slate-900"
              >
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi
              </Button>
            </div>
          </div>

          {/* Form Invita Consulente */}
          {showInviteForm && (
            <Card className="bg-slate-800 border-blue-500/30 mb-4">
              <CardContent className="p-4">
                <h3 className="text-blue-400 font-medium text-sm mb-3 flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Invita Consulente via Email
                </h3>
                <InviteConsultantForm onSuccess={() => {
                  setShowInviteForm(false);
                  queryClient.invalidateQueries({ queryKey: ['consultants'] });
                }} />
              </CardContent>
            </Card>
          )}

          {/* Filtri */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Cerca consulente..."
                value={searchTermConsultant}
                onChange={(e) => setSearchTermConsultant(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white pl-9 text-sm"
              />
            </div>
            <Select value={selectedZoneFilter} onValueChange={setSelectedZoneFilter}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white w-40">
                <SelectValue placeholder="Zona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le zone</SelectItem>
                {zones.map(zone => (
                  <SelectItem key={zone.id} value={zone.name}>{zone.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {consultants
              .filter(c => {
                const matchesSearch = !searchTermConsultant || 
                  c.name?.toLowerCase().includes(searchTermConsultant.toLowerCase()) ||
                  c.category?.toLowerCase().includes(searchTermConsultant.toLowerCase()) ||
                  c.email?.toLowerCase().includes(searchTermConsultant.toLowerCase());
                const matchesZone = selectedZoneFilter === 'all' || 
                  c.zone_assegnate?.includes(selectedZoneFilter) ||
                  c.zona === selectedZoneFilter;
                return matchesSearch && matchesZone;
              })
              .map((consultant) => (
              <Card key={consultant.id} className={`bg-slate-800 border-slate-700 ${consultant.is_blocked ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lime-400 font-bold text-base">{consultant.category}</h3>
                        {consultant.is_blocked && (
                          <Badge className="bg-red-500/20 text-red-400 border-0 text-xs">
                            <Lock className="w-3 h-3 mr-1" />
                            Bloccato
                          </Badge>
                        )}
                        {consultant.block_calls_for_all && (
                          <Badge className="bg-orange-500/20 text-orange-400 border-0 text-xs">
                            <PhoneOff className="w-3 h-3 mr-1" />
                            No chiamate
                          </Badge>
                        )}
                      </div>
                      <p className="text-white text-sm mt-1">{consultant.name}</p>
                      <p className="text-slate-400 text-xs mt-1">Email: {consultant.email || 'N/D'}</p>
                      <p className="text-slate-400 text-xs">Tel: {consultant.phone || 'N/D'}</p>
                      {consultant.zone_assegnate?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {consultant.zone_assegnate.map(z => (
                            <Badge key={z} className="bg-slate-700 text-slate-300 border-0 text-xs">{z}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
                        onClick={() => handleEditConsultant(consultant)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={consultant.is_blocked 
                          ? 'bg-green-900/50 hover:bg-green-900 text-green-400 border-green-800'
                          : 'bg-orange-900/50 hover:bg-orange-900 text-orange-400 border-orange-800'}
                        onClick={() => {
                          saveConsultantMutation.mutate({ ...consultant, is_blocked: !consultant.is_blocked });
                        }}
                      >
                        {consultant.is_blocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-red-900/50 hover:bg-red-900 text-red-400 border-red-800"
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>



        <TabsContent value="bookings">
          <h2 className="text-white text-xl font-bold mb-4">Tutte le Richieste</h2>
          <div className="space-y-3">
            {allBookings.map((booking) => {
              const consultant = consultants.find(c => c.id === booking.consultant_id);
              const user = allUsers.find(u => u.email === booking.user_email);
              const statusColors = {
                pending: 'bg-yellow-500',
                confirmed: 'bg-blue-500',
                completed: 'bg-green-600',
                cancelled: 'bg-red-500'
              };
              const statusLabels = {
                pending: 'In attesa',
                dates_proposed: 'Date proposte',
                confirmed: 'Confermato',
                awaiting_user_confirmation: 'In conferma',
                completed: 'Completato',
                cancelled: 'Annullato'
              };
              return (
                <Card key={booking.id} className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    {/* Riga 1: Status + Data/Zona a destra + Elimina */}
                    <div className="flex items-center justify-between mb-3">
                      <Badge className={statusColors[booking.status] || 'bg-slate-500'}>
                        {statusLabels[booking.status] || booking.status}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[10px]">
                          {new Date(booking.created_date).toLocaleDateString('it-IT')}
                        </span>
                        {(consultant?.zona || user?.zona) && (
                          <Badge className="bg-slate-700 text-slate-300 text-[10px]">
                            📍 {consultant?.zona || user?.zona}
                          </Badge>
                        )}
                        <button
                          onClick={() => {
                            if (confirm('Vuoi eliminare questa richiesta?')) {
                              deleteBookingMutation.mutate(booking.id);
                            }
                          }}
                          className="text-red-400 hover:text-red-500 transition-colors ml-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Riga 2: Consulente */}
                    <p className="text-lime-400 font-bold text-sm">{consultant?.category || 'Consulente N/D'}</p>
                    <p className="text-white text-xs">{consultant?.name}</p>

                    {/* Riga 3: Utente (solo nome azienda, NO email) */}
                    <div className="mt-2 p-2 bg-slate-900 rounded-lg">
                      <p className="text-white font-medium text-sm">
                        🏢 {user?.company_name || user?.full_name || 'Utente'}
                      </p>
                      {user?.full_name && user?.company_name && (
                        <p className="text-slate-400 text-xs">{user.full_name}</p>
                      )}
                    </div>

                    {/* Riga 4: Testo richiesta */}
                    {booking.subject && (
                      <div className="mt-2 p-2 bg-slate-700/50 rounded-lg">
                        <p className="text-slate-300 text-xs">"{booking.subject}"</p>
                      </div>
                    )}

                    {/* Riga 5: Vai alla chat */}
                    <Link 
                      to={createPageUrl('Messaggi') + `?source=consulenze&email=${booking.user_email}`}
                      className="mt-3 flex items-center justify-center gap-2 bg-lime-400 hover:bg-lime-500 text-slate-900 font-bold text-xs py-2 px-3 rounded-lg transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Vai alla Chat
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Consulente */}
      <Dialog open={showConsultantDialog} onOpenChange={(open) => {
        setShowConsultantDialog(open);
        if (!open) {
          setEditingConsultant(null);
          setConsultantForm({
            name: '',
            category: '',
            city: '',
            phone: '',
            email: '',
            referente: '',
            cellulare_referente: '',
            zona: '',
            zone_assegnate: [],
            free_consultations_per_user: 1
          });
          setDialogViewMode('admin');
        }
      }}>
        <DialogContent className="bg-slate-800 border-slate-700 max-h-[90vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center justify-between">
              <span>{editingConsultant ? 'Modifica Consulente' : 'Aggiungi Consulente'}</span>
              {editingConsultant && (
                <div className="flex bg-slate-900 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setDialogViewMode('admin')}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      dialogViewMode === 'admin' 
                        ? 'bg-amber-500 text-slate-900' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    👑 Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => setDialogViewMode('consultant')}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      dialogViewMode === 'consultant' 
                        ? 'bg-lime-400 text-slate-900' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    👤 Vista Consulente
                  </button>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {/* Vista Admin */}
          {dialogViewMode === 'admin' && (
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-slate-300">Nome *</Label>
              <Input
                value={consultantForm.name}
                onChange={(e) => setConsultantForm({...consultantForm, name: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Categoria *</Label>
              <Select value={consultantForm.category} onValueChange={(v) => setConsultantForm({...consultantForm, category: v})}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CONSULTANT_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Email</Label>
              <Input
                type="email"
                value={consultantForm.email}
                onChange={(e) => setConsultantForm({...consultantForm, email: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Città/Sede *</Label>
              <Input
                value={consultantForm.city}
                onChange={(e) => setConsultantForm({...consultantForm, city: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Telefono *</Label>
              <Input
                value={consultantForm.phone}
                onChange={(e) => setConsultantForm({...consultantForm, phone: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Referente</Label>
              <Input
                value={consultantForm.referente}
                onChange={(e) => setConsultantForm({...consultantForm, referente: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Cellulare Referente</Label>
              <Input
                value={consultantForm.cellulare_referente}
                onChange={(e) => setConsultantForm({...consultantForm, cellulare_referente: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-lime-400 font-medium">Zone Assegnate</Label>
              <div className="bg-slate-900 border border-slate-700 rounded-md p-3 mt-1 space-y-2 max-h-40 overflow-y-auto">
                {zones.map(zone => (
                  <div key={zone.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`zone-edit-${zone.id}`}
                      checked={consultantForm.zone_assegnate?.includes(zone.name)}
                      onCheckedChange={(checked) => {
                        const currentZones = consultantForm.zone_assegnate || [];
                        if (checked) {
                          setConsultantForm({...consultantForm, zone_assegnate: [...currentZones, zone.name], zona: zone.name});
                        } else {
                          const newZones = currentZones.filter(z => z !== zone.name);
                          setConsultantForm({...consultantForm, zone_assegnate: newZones, zona: newZones[0] || ''});
                        }
                      }}
                      className="border-slate-600 data-[state=checked]:bg-lime-400 data-[state=checked]:border-lime-400"
                    />
                    <Label htmlFor={`zone-edit-${zone.id}`} className="text-white text-sm cursor-pointer">
                      {zone.name}
                    </Label>
                  </div>
                ))}
              </div>
              {consultantForm.zone_assegnate?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {consultantForm.zone_assegnate.map(z => (
                    <Badge key={z} className="bg-lime-400/20 text-lime-400 border-0 text-xs">{z}</Badge>
                  ))}
                </div>
              )}
              <p className="text-slate-500 text-xs mt-1">Il consulente sarà visibile agli utenti delle zone selezionate</p>
            </div>
            <div>
              <Label className="text-slate-300">Consulenze gratuite per utente</Label>
              <Input
                type="number"
                min="0"
                value={consultantForm.free_consultations_per_user}
                onChange={(e) => setConsultantForm({...consultantForm, free_consultations_per_user: parseInt(e.target.value) || 0})}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            {/* Sezione Admin - Impostazioni avanzate */}
            {editingConsultant && (
              <div className="border-t border-slate-700 pt-4 mt-4">
                <h4 className="text-amber-400 font-semibold text-sm mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Impostazioni Admin
                </h4>
                
                {/* Blocco consulente */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label className="text-slate-300">Blocca Consulente</Label>
                    <p className="text-slate-500 text-xs">Il consulente non potrà accedere</p>
                  </div>
                  <Switch
                    checked={consultantForm.is_blocked || false}
                    onCheckedChange={(checked) => setConsultantForm({...consultantForm, is_blocked: checked})}
                    className="data-[state=checked]:bg-red-500"
                  />
                </div>

                {/* Blocca chiamate per tutti */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label className="text-slate-300">Blocca Chiamate</Label>
                    <p className="text-slate-500 text-xs">Blocca chiamate da tutti gli utenti</p>
                  </div>
                  <Switch
                    checked={consultantForm.block_calls_for_all || false}
                    onCheckedChange={(checked) => setConsultantForm({...consultantForm, block_calls_for_all: checked})}
                    className="data-[state=checked]:bg-orange-500"
                  />
                </div>

                {/* Disabilita sede azienda */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label className="text-slate-300">Disabilita Sede Azienda</Label>
                    <p className="text-slate-500 text-xs">Disabilita consulenze in sede aziendale</p>
                  </div>
                  <Switch
                    checked={consultantForm.sede_azienda_disabled || false}
                    onCheckedChange={(checked) => setConsultantForm({...consultantForm, sede_azienda_disabled: checked})}
                    className="data-[state=checked]:bg-orange-500"
                  />
                </div>

                {/* Rimborso carburante */}
                <div className="py-2">
                  <Label className="text-slate-300">Rimborso Carburante (€)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={consultantForm.rimborso_carburante || 0}
                    onChange={(e) => setConsultantForm({...consultantForm, rimborso_carburante: parseFloat(e.target.value) || 0})}
                    className="bg-slate-900 border-slate-700 text-white mt-1"
                    placeholder="0.00"
                  />
                  <p className="text-slate-500 text-xs mt-1">Per consulenze in sede aziendale</p>
                </div>

                {/* Slot disponibili */}
                <div className="py-2">
                  <Label className="text-slate-300">Slot Totali Disponibili</Label>
                  <Input
                    type="number"
                    min="0"
                    value={consultantForm.available_slots || 100}
                    onChange={(e) => setConsultantForm({...consultantForm, available_slots: parseInt(e.target.value) || 0})}
                    className="bg-slate-900 border-slate-700 text-white mt-1"
                  />
                </div>

                {/* Sezioni assegnate (tab che può consultare) */}
                <div className="py-2">
                  <Label className="text-slate-300 mb-2 block">Sezioni Visibili al Consulente (tab che può consultare)</Label>
                  <div className="bg-slate-900 border border-slate-700 rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                    {SECTIONS.map(section => (
                      <div key={section.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`section-${section.id}`}
                          checked={consultantForm.assigned_sections?.includes(section.id)}
                          onCheckedChange={(checked) => {
                            const currentSections = consultantForm.assigned_sections || [];
                            if (checked) {
                              setConsultantForm({...consultantForm, assigned_sections: [...currentSections, section.id]});
                            } else {
                              setConsultantForm({...consultantForm, assigned_sections: currentSections.filter(s => s !== section.id)});
                            }
                          }}
                          className="border-slate-600 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                        />
                        <Label htmlFor={`section-${section.id}`} className="text-white text-sm cursor-pointer">
                          {section.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sezioni comunicazione (dove appare agli utenti) */}
                <div className="py-2">
                  <Label className="text-amber-400 mb-2 block font-medium">Pannelli Comunicazione (dove appare agli utenti per interazione)</Label>
                  <p className="text-slate-500 text-xs mb-2">Seleziona in quali sezioni gli utenti potranno contattare questo consulente</p>
                  <div className="bg-slate-900 border border-amber-500/30 rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                    {SECTIONS.map(section => (
                      <div key={`comm-${section.id}`} className="flex items-center gap-2">
                        <Checkbox
                          id={`comm-section-${section.id}`}
                          checked={consultantForm.communication_sections?.includes(section.id)}
                          onCheckedChange={(checked) => {
                            const currentSections = consultantForm.communication_sections || [];
                            if (checked) {
                              setConsultantForm({...consultantForm, communication_sections: [...currentSections, section.id]});
                            } else {
                              setConsultantForm({...consultantForm, communication_sections: currentSections.filter(s => s !== section.id)});
                            }
                          }}
                          className="border-slate-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                        />
                        <Label htmlFor={`comm-section-${section.id}`} className="text-white text-sm cursor-pointer">
                          {section.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {consultantForm.communication_sections?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {consultantForm.communication_sections.map(s => {
                        const sectionLabel = SECTIONS.find(sec => sec.id === s)?.label || s;
                        return <Badge key={s} className="bg-amber-500/20 text-amber-400 border-0 text-xs">{sectionLabel}</Badge>;
                      })}
                    </div>
                  )}
                </div>

                {/* Blocca chiamate da utenti specifici */}
                <div className="py-2">
                  <Label className="text-slate-300 mb-2 block">Blocca Chiamate da Utenti Specifici</Label>
                  <div className="bg-slate-900 border border-slate-700 rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                    {allUsers
                      .filter(u => u.user_type !== 'consulente')
                      .map(user => (
                        <div key={user.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`block-user-${user.id}`}
                            checked={consultantForm.blocked_users_calls?.includes(user.email)}
                            onCheckedChange={(checked) => {
                              const currentBlocked = consultantForm.blocked_users_calls || [];
                              if (checked) {
                                setConsultantForm({...consultantForm, blocked_users_calls: [...currentBlocked, user.email]});
                              } else {
                                setConsultantForm({...consultantForm, blocked_users_calls: currentBlocked.filter(e => e !== user.email)});
                              }
                            }}
                            className="border-slate-600 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                          />
                          <Label htmlFor={`block-user-${user.id}`} className="text-white text-sm cursor-pointer">
                            {user.company_name || user.full_name} <span className="text-slate-500 text-xs">({user.email})</span>
                          </Label>
                        </div>
                      ))}
                  </div>
                  {consultantForm.blocked_users_calls?.length > 0 && (
                    <p className="text-red-400 text-xs mt-1">
                      {consultantForm.blocked_users_calls.length} utente/i bloccato/i
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowConsultantDialog(false)}
                className="flex-1 border-slate-600 text-slate-400 hover:text-white"
              >
                Annulla
              </Button>
              <Button
                onClick={() => saveConsultantMutation.mutate(consultantForm)}
                disabled={!consultantForm.name || !consultantForm.category || !consultantForm.city || !consultantForm.phone || saveConsultantMutation.isPending}
                className="flex-1 bg-lime-400 hover:bg-lime-500 text-slate-900"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveConsultantMutation.isPending ? 'Salvataggio...' : 'Salva Modifiche'}
              </Button>
            </div>
          </div>
          )}

          {/* Vista Consulente (quello che vede il consulente nel suo profilo) */}
          {dialogViewMode === 'consultant' && editingConsultant && (
            <ConsultantReadOnlyView 
              consultant={{...editingConsultant, ...consultantForm}} 
              zones={zones} 
              allUsers={allUsers} 
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}


// Componente per mostrare la vista read-only del consulente
function ConsultantReadOnlyView({ consultant, zones, allUsers }) {
  // Trova utente correlato al consulente
  const consultantUser = allUsers.find(u => u.email?.toLowerCase() === consultant.email?.toLowerCase());
  
  return (
    <div className="space-y-4 mt-4">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
        <p className="text-blue-400 text-sm">
          👁️ Questa è la vista che il consulente vede nel suo profilo "Il Mio Profilo"
        </p>
      </div>

      {/* Profilo Studio */}
      <div className="bg-slate-900 rounded-lg p-4">
        <h3 className="text-lime-400 font-semibold text-sm mb-3 flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Profilo Studio
        </h3>
        
        <div className="space-y-3">
          <div>
            <Label className="text-slate-500 text-xs">Nome Studio</Label>
            <p className="text-white">{consultant.name || '-'}</p>
          </div>
          <div>
            <Label className="text-slate-500 text-xs">Specializzazione (assegnata dall'admin)</Label>
            <p className="text-slate-400">{consultant.category || '-'}</p>
          </div>
          <div>
            <Label className="text-slate-500 text-xs">Email</Label>
            <p className="text-white">{consultant.email || '-'}</p>
          </div>
          <div>
            <Label className="text-slate-500 text-xs">Telefono</Label>
            <p className="text-white">{consultant.phone || '-'}</p>
          </div>
          <div>
            <Label className="text-slate-500 text-xs">Sede</Label>
            <p className="text-white">{consultant.city || '-'}</p>
          </div>
          <div>
            <Label className="text-slate-500 text-xs">Referente</Label>
            <p className="text-white">{consultant.referente || '-'}</p>
          </div>
          <div>
            <Label className="text-slate-500 text-xs">Cellulare Referente</Label>
            <p className="text-white">{consultant.cellulare_referente || '-'}</p>
          </div>
          <div>
            <Label className="text-slate-500 text-xs">Zone Assegnate (dall'admin)</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {consultant.zone_assegnate?.length > 0 ? (
                consultant.zone_assegnate.map(z => (
                  <Badge key={z} className="bg-slate-700 text-slate-300 text-xs">{z}</Badge>
                ))
              ) : consultant.zona ? (
                <Badge className="bg-slate-700 text-slate-300 text-xs">{consultant.zona}</Badge>
              ) : (
                <p className="text-slate-500">-</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Consulenze Gratuite */}
      <div className="bg-slate-900 rounded-lg p-4">
        <h3 className="text-lime-400 font-semibold text-sm mb-3 flex items-center gap-2">
          🎁 Consulenze Gratuite
        </h3>
        
        <div className="space-y-3">
          <div>
            <Label className="text-slate-500 text-xs">Consulenze gratuite per utente</Label>
            <p className="text-lime-400 text-2xl font-bold">{consultant.free_consultations_per_user ?? 1}</p>
          </div>
          
          {consultant.sede_azienda_disabled && (
            <div className="bg-amber-500/10 rounded-lg p-2">
              <p className="text-amber-400 text-xs">⚠️ Consulenze in sede aziendale disabilitate</p>
            </div>
          )}
          
          {!consultant.sede_azienda_disabled && consultant.rimborso_carburante > 0 && (
            <div>
              <Label className="text-slate-500 text-xs">Rimborso carburante</Label>
              <p className="text-white">€{consultant.rimborso_carburante}</p>
            </div>
          )}
        </div>
      </div>

      {/* Gestione Chiamate */}
      <div className="bg-slate-900 rounded-lg p-4">
        <h3 className="text-lime-400 font-semibold text-sm mb-3 flex items-center gap-2">
          📞 Gestione Chiamate
        </h3>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Blocca chiamate da tutti</span>
            <Badge className={consultant.block_calls_for_all ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}>
              {consultant.block_calls_for_all ? 'Attivo' : 'Disattivo'}
            </Badge>
          </div>
          
          {consultant.blocked_users_calls?.length > 0 && (
            <div>
              <Label className="text-slate-500 text-xs">Utenti bloccati individualmente</Label>
              <p className="text-red-400 text-sm">{consultant.blocked_users_calls.length} utenti bloccati</p>
            </div>
          )}
        </div>
      </div>

      {/* Dati Utente (se presente) */}
      {consultantUser && (
        <div className="bg-slate-900 rounded-lg p-4">
          <h3 className="text-blue-400 font-semibold text-sm mb-3 flex items-center gap-2">
            👤 Dati Account Utente
          </h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Nome completo</span>
              <span className="text-white">{consultantUser.full_name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Email</span>
              <span className="text-white">{consultantUser.email || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ruolo</span>
              <Badge className={consultantUser.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-300'}>
                {consultantUser.role === 'admin' ? 'Admin' : 'Utente'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tipo utente</span>
              <span className="text-lime-400">{consultantUser.user_type || 'consulente'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Sezioni Visibili */}
      {consultant.assigned_sections?.length > 0 && (
        <div className="bg-slate-900 rounded-lg p-4">
          <h3 className="text-lime-400 font-semibold text-sm mb-3 flex items-center gap-2">
            📋 Sezioni Visibili (tab consultabili)
          </h3>
          <div className="flex flex-wrap gap-1">
            {consultant.assigned_sections.map(s => (
              <Badge key={s} className="bg-blue-500/20 text-blue-400 text-xs">{s}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Pannelli Comunicazione */}
      {consultant.communication_sections?.length > 0 && (
        <div className="bg-slate-900 rounded-lg p-4">
          <h3 className="text-amber-400 font-semibold text-sm mb-3 flex items-center gap-2">
            📣 Pannelli Comunicazione (dove appare agli utenti)
          </h3>
          <div className="flex flex-wrap gap-1">
            {consultant.communication_sections.map(s => (
              <Badge key={s} className="bg-amber-500/20 text-amber-400 text-xs">{s}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}