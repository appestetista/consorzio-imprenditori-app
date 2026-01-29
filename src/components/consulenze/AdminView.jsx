import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { UserCog, Plus, Edit, Trash2, Search, Clock, Mail, Settings, Phone, PhoneOff, UserPlus, Ban, CheckCircle, Save, MessageSquare } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import InviteConsultantForm from '../admin/InviteConsultantForm';

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
      free_consultations_per_user: consultant.free_consultations_per_user ?? 1
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
            <Button
              onClick={() => setShowConsultantDialog(true)}
              className="bg-lime-400 hover:bg-lime-500 text-slate-900"
            >
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Consulente
            </Button>
          </div>

          <div className="space-y-3">
            {consultants.map((consultant) => (
              <Card key={consultant.id} className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lime-400 font-bold text-base">{consultant.category}</h3>
                      <p className="text-white text-sm mt-1">{consultant.name}</p>
                      <p className="text-slate-400 text-xs mt-1">Email: {consultant.email || 'N/D'}</p>
                      <p className="text-slate-400 text-xs">Tel: {consultant.phone || 'N/D'}</p>
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
                        className="bg-red-900/50 hover:bg-red-900 text-red-400 border-red-800"
                        onClick={() => {
                          if (confirm('Eliminare questo consulente?')) {
                            deleteConsultantMutation.mutate(consultant.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
            free_consultations_per_user: 1
          });
        }
      }}>
        <DialogContent className="bg-slate-800 border-slate-700 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingConsultant ? 'Modifica Consulente' : 'Aggiungi Consulente'}
            </DialogTitle>
          </DialogHeader>
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
              <Label className="text-slate-300">Zona</Label>
              <Select value={consultantForm.zona} onValueChange={(v) => setConsultantForm({...consultantForm, zona: v})}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                  <SelectValue placeholder="Seleziona zona" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map(zone => (
                    <SelectItem key={zone.id} value={zone.name}>{zone.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button
              onClick={() => saveConsultantMutation.mutate(consultantForm)}
              disabled={!consultantForm.name || !consultantForm.category || !consultantForm.city || !consultantForm.phone || saveConsultantMutation.isPending}
              className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
            >
              {saveConsultantMutation.isPending ? 'Salvataggio...' : 'Salva'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}