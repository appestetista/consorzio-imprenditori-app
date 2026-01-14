import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, UserCog, Plus, Edit, Trash2, RotateCcw, Ban, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

export default function AdminView({ consultants }) {
  const [showConsultantDialog, setShowConsultantDialog] = useState(false);
  const [editingConsultant, setEditingConsultant] = useState(null);
  const [consultantForm, setConsultantForm] = useState({
    name: '',
    category: '',
    phone: '',
    email: '',
    referente: '',
    cellulare_referente: '',
    available_slots: 100
  });
  const queryClient = useQueryClient();

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-admin'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: allBookings = [] } = useQuery({
    queryKey: ['all-bookings-admin'],
    queryFn: () => base44.entities.ConsultationBooking.list('-created_date'),
  });

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

  const [consultationCredits, setConsultationCredits] = useState({});

  const updateUserConsultationsMutation = useMutation({
    mutationFn: async ({ userId, credits }) => {
      await base44.entities.User.update(userId, { consulenze_disponibili: credits });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users-admin'] });
      setConsultationCredits({});
    }
  });

  const deleteBookingMutation = useMutation({
    mutationFn: (bookingId) => base44.entities.ConsultationBooking.delete(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-bookings-admin'] });
    }
  });

  const members = allUsers.filter(u => u.role === 'user');

  const handleEditConsultant = (consultant) => {
    setEditingConsultant(consultant);
    setConsultantForm({
      name: consultant.name || '',
      category: consultant.category || '',
      phone: consultant.phone || '',
      email: consultant.email || '',
      referente: consultant.referente || '',
      cellulare_referente: consultant.cellulare_referente || '',
      available_slots: consultant.available_slots || 100
    });
    setShowConsultantDialog(true);
  };

  return (
    <>
      <Tabs defaultValue="consultants" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-800 mb-6">
          <TabsTrigger value="consultants" className="data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900">
            <UserCog className="w-4 h-4 mr-2" />
            Consulenti
          </TabsTrigger>
          <TabsTrigger value="members" className="data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900">
            <Users className="w-4 h-4 mr-2" />
            Membri
          </TabsTrigger>
          <TabsTrigger value="bookings" className="data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900">
            Richieste
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

        <TabsContent value="members">
          <h2 className="text-white text-xl font-bold mb-4">Gestione Membri</h2>
          <div className="space-y-3">
            {members.map((member) => {
              return (
                <Card key={member.id} className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="text-white font-bold">{member.company_name || member.full_name}</h3>
                        <p className="text-slate-400 text-sm">{member.email}</p>
                        {member.is_blocked && (
                          <Badge className="bg-red-600 mt-2">Bloccato</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="bookings">
          <h2 className="text-white text-xl font-bold mb-4">Tutte le Richieste</h2>
          <div className="space-y-3">
            {allBookings.map((booking) => {
              const consultant = consultants.find(c => c.id === booking.consultant_id);
              const statusColors = {
                pending: 'bg-yellow-500',
                confirmed: 'bg-blue-500',
                completed: 'bg-green-600',
                cancelled: 'bg-red-500'
              };
              return (
                <Card key={booking.id} className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors[booking.status]}>
                          {booking.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">
                          {new Date(booking.created_date).toLocaleDateString('it-IT')}
                        </span>
                        <button
                          onClick={() => {
                            if (confirm('Vuoi eliminare questa richiesta?')) {
                              deleteBookingMutation.mutate(booking.id);
                            }
                          }}
                          className="text-red-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-lime-400 font-bold text-sm">{consultant?.category || 'N/D'}</p>
                    <p className="text-white text-sm mt-1">Membro: {booking.user_email}</p>
                    <div className="bg-slate-900 rounded-lg p-2 mt-2">
                      <p className="text-slate-300 text-xs">{booking.subject}</p>
                    </div>
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
            phone: '',
            email: '',
            referente: '',
            cellulare_referente: '',
            available_slots: 100
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
              <Label className="text-slate-300">Telefono</Label>
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
              <Label className="text-slate-300">Slot Disponibili</Label>
              <Input
                type="number"
                value={consultantForm.available_slots}
                onChange={(e) => setConsultantForm({...consultantForm, available_slots: parseInt(e.target.value) || 0})}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <Button
              onClick={() => saveConsultantMutation.mutate(consultantForm)}
              disabled={!consultantForm.name || !consultantForm.category || saveConsultantMutation.isPending}
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