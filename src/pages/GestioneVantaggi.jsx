import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Gift, Plus, Edit, Trash2, QrCode, Eye, EyeOff, Calendar, Upload, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import { toast } from 'sonner';

const TIPI_VANTAGGIO = [
  "Sconto percentuale",
  "Sconto fisso",
  "Consulenza gratuita",
  "Omaggio",
  "Promozione speciale",
  "Prova gratuita",
  "Altro"
];

export default function GestioneVantaggi() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVantaggio, setEditingVantaggio] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const { impersonation } = useImpersonation();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    tipo_vantaggio: '',
    titolo: '',
    descrizione: '',
    foto_url: '',
    valore: '',
    utilizzi_massimi: '',
    data_scadenza: '',
    richiede_prenotazione: true,
    is_active: true
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (impersonation.active && impersonation.targetEmail) {
          const users = await base44.entities.User.filter({ email: impersonation.targetEmail });
          setUser(users[0] || currentUser);
        } else {
          setUser(currentUser);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [impersonation]);

  // Miei vantaggi
  const { data: mieVantaggi = [], isLoading: loadingVantaggi } = useQuery({
    queryKey: ['miei-vantaggi', user?.email],
    queryFn: () => base44.entities.Vantaggio.filter({ creator_email: user?.email }),
    enabled: !!user?.email,
  });

  // Determina tipo creatore
  const { data: isConsulente = false } = useQuery({
    queryKey: ['is-consulente', user?.email],
    queryFn: async () => {
      const consultants = await base44.entities.Consultant.filter({ email: user?.email });
      return consultants.length > 0;
    },
    enabled: !!user?.email,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Vantaggio.create({
        ...data,
        creator_email: user.email,
        creator_type: isConsulente ? 'consulente' : 'azienda',
        utilizzi_massimi: data.utilizzi_massimi ? parseInt(data.utilizzi_massimi) : null,
        utilizzi_effettuati: 0
      });
    },
    onSuccess: () => {
      toast.success('Vantaggio creato!');
      queryClient.invalidateQueries({ queryKey: ['miei-vantaggi'] });
      resetForm();
    },
    onError: () => toast.error('Errore durante la creazione')
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.Vantaggio.update(id, {
        ...data,
        utilizzi_massimi: data.utilizzi_massimi ? parseInt(data.utilizzi_massimi) : null
      });
    },
    onSuccess: () => {
      toast.success('Vantaggio aggiornato!');
      queryClient.invalidateQueries({ queryKey: ['miei-vantaggi'] });
      resetForm();
    },
    onError: () => toast.error('Errore durante l\'aggiornamento')
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }) => {
      await base44.entities.Vantaggio.update(id, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miei-vantaggi'] });
    }
  });

  const resetForm = () => {
    setFormData({
      tipo_vantaggio: '',
      titolo: '',
      descrizione: '',
      foto_url: '',
      valore: '',
      utilizzi_massimi: '',
      data_scadenza: '',
      richiede_prenotazione: true,
      is_active: true
    });
    setEditingVantaggio(null);
    setShowForm(false);
  };

  const handleEdit = (vantaggio) => {
    setFormData({
      tipo_vantaggio: vantaggio.tipo_vantaggio || '',
      titolo: vantaggio.titolo || '',
      descrizione: vantaggio.descrizione || '',
      foto_url: vantaggio.foto_url || '',
      valore: vantaggio.valore || '',
      utilizzi_massimi: vantaggio.utilizzi_massimi?.toString() || '',
      data_scadenza: vantaggio.data_scadenza || '',
      richiede_prenotazione: vantaggio.richiede_prenotazione ?? true,
      is_active: vantaggio.is_active ?? true
    });
    setEditingVantaggio(vantaggio);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formData.tipo_vantaggio || !formData.titolo) {
      toast.error('Compila tipo e titolo');
      return;
    }
    
    if (editingVantaggio) {
      updateMutation.mutate({ id: editingVantaggio.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, foto_url: file_url });
    } catch (error) {
      toast.error('Errore durante il caricamento');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const vantaggiAttivi = mieVantaggi.filter(v => v.is_active);
  const vantaggiDisattivati = mieVantaggi.filter(v => !v.is_active);

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />

      <main className="px-4 py-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('MyProfile')} className="text-lime-400">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <Gift className="w-6 h-6 text-lime-400" />
            <h1 className="text-white text-xl font-bold">Vantaggi che Offro</h1>
          </div>
          <Link to={createPageUrl('ScannerQRVantaggi')}>
            <Button variant="outline" size="sm" className="border-lime-400 text-lime-400">
              <QrCode className="w-4 h-4 mr-1" />
              Scanner
            </Button>
          </Link>
        </div>

        {/* Pulsante Nuovo */}
        <Button
          onClick={() => setShowForm(true)}
          className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 mb-6"
        >
          <Plus className="w-5 h-5 mr-2" />
          Crea Nuovo Vantaggio
        </Button>

        {/* Lista vantaggi attivi */}
        <div className="mb-6">
          <h2 className="text-white font-bold mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-lime-400" />
            Vantaggi Attivi ({vantaggiAttivi.length})
          </h2>
          
          {loadingVantaggi ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : vantaggiAttivi.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6 text-center">
                <Gift className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Nessun vantaggio attivo</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {vantaggiAttivi.map(vantaggio => (
                <Card key={vantaggio.id} className="bg-slate-800 border-slate-700">
                  <CardContent className="p-3">
                    <div className="flex gap-3">
                      {vantaggio.foto_url ? (
                        <img src={vantaggio.foto_url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                      ) : (
                        <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center">
                          <Gift className="w-6 h-6 text-slate-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <Badge className="bg-lime-500 text-white text-[10px] mb-1">{vantaggio.tipo_vantaggio}</Badge>
                            <h3 className="text-white font-bold text-sm">{vantaggio.titolo}</h3>
                            {vantaggio.valore && <p className="text-lime-400 font-bold">{vantaggio.valore}</p>}
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                              onClick={() => handleEdit(vantaggio)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                              onClick={() => toggleActiveMutation.mutate({ id: vantaggio.id, is_active: false })}
                            >
                              <EyeOff className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-1 text-xs text-slate-500">
                          <span>{vantaggio.utilizzi_effettuati || 0} utilizzi</span>
                          {vantaggio.utilizzi_massimi && (
                            <span>/ {vantaggio.utilizzi_massimi} max</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Vantaggi disattivati */}
        {vantaggiDisattivati.length > 0 && (
          <div>
            <h2 className="text-slate-400 font-bold mb-3 flex items-center gap-2">
              <EyeOff className="w-4 h-4" />
              Disattivati ({vantaggiDisattivati.length})
            </h2>
            <div className="space-y-2">
              {vantaggiDisattivati.map(vantaggio => (
                <Card key={vantaggio.id} className="bg-slate-800/50 border-slate-700/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm">{vantaggio.titolo}</p>
                      <p className="text-slate-500 text-xs">{vantaggio.tipo_vantaggio}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-lime-400 text-lime-400"
                      onClick={() => toggleActiveMutation.mutate({ id: vantaggio.id, is_active: true })}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Attiva
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      <BottomNav currentPage="GestioneVantaggi" />

      {/* Dialog Form */}
      <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="bg-slate-800 border-slate-700 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-lime-400" />
              {editingVantaggio ? 'Modifica Vantaggio' : 'Nuovo Vantaggio'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Tipo */}
            <div>
              <Label className="text-lime-400">Tipo Vantaggio *</Label>
              <Select
                value={formData.tipo_vantaggio}
                onValueChange={(value) => setFormData({ ...formData, tipo_vantaggio: value })}
              >
                <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                  <SelectValue placeholder="Seleziona tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {TIPI_VANTAGGIO.map(tipo => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Titolo */}
            <div>
              <Label className="text-lime-400">Titolo *</Label>
              <Input
                value={formData.titolo}
                onChange={(e) => setFormData({ ...formData, titolo: e.target.value })}
                placeholder="Es: 10% di sconto su tutti i servizi"
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>

            {/* Descrizione */}
            <div>
              <Label className="text-slate-400">Descrizione</Label>
              <Textarea
                value={formData.descrizione}
                onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                placeholder="Descrizione dettagliata del vantaggio..."
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>

            {/* Foto */}
            <div>
              <Label className="text-slate-400">Foto</Label>
              {formData.foto_url ? (
                <div className="flex items-center gap-3 bg-slate-900 rounded-lg p-3">
                  <img src={formData.foto_url} alt="" className="w-16 h-16 object-cover rounded" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({ ...formData, foto_url: '' })}
                    className="border-red-600 text-red-400"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Rimuovi
                  </Button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 bg-slate-900 border-2 border-dashed border-slate-700 rounded-lg p-4 cursor-pointer hover:border-lime-400">
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
                  {uploadingPhoto ? (
                    <div className="animate-spin w-5 h-5 border-2 border-lime-400 border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-lime-400" />
                      <span className="text-slate-300">Carica foto</span>
                    </>
                  )}
                </label>
              )}
            </div>

            {/* Valore */}
            <div>
              <Label className="text-slate-400">Valore/Quantità</Label>
              <Input
                value={formData.valore}
                onChange={(e) => setFormData({ ...formData, valore: e.target.value })}
                placeholder="Es: 20%, €50, 1 consulenza gratuita"
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>

            {/* Utilizzi massimi */}
            <div>
              <Label className="text-slate-400">Numero utilizzi massimi (opzionale)</Label>
              <Input
                type="number"
                value={formData.utilizzi_massimi}
                onChange={(e) => setFormData({ ...formData, utilizzi_massimi: e.target.value })}
                placeholder="Lascia vuoto per illimitato"
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>

            {/* Scadenza */}
            <div>
              <Label className="text-slate-400">Data scadenza (opzionale)</Label>
              <Input
                type="date"
                value={formData.data_scadenza}
                onChange={(e) => setFormData({ ...formData, data_scadenza: e.target.value })}
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>

            {/* Richiede prenotazione */}
            <div className="flex items-center justify-between bg-slate-900 rounded-lg p-3">
              <div>
                <p className="text-white text-sm font-medium">Richiede prenotazione</p>
                <p className="text-slate-400 text-xs">L'utente deve prenotare prima di usarlo</p>
              </div>
              <Switch
                checked={formData.richiede_prenotazione}
                onCheckedChange={(checked) => setFormData({ ...formData, richiede_prenotazione: checked })}
              />
            </div>

            {/* Bottoni */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={resetForm} className="flex-1 border-slate-600 text-slate-400">
                Annulla
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 bg-lime-400 hover:bg-lime-500 text-slate-900"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <div className="animate-spin w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    {editingVantaggio ? 'Salva' : 'Crea'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}