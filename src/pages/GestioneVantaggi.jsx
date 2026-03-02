import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Gift, Plus, Edit, Trash2, QrCode, Eye, EyeOff, Calendar, Upload, X, Check, TrendingUp, Clock, Minus, AlertTriangle, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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
  "Vantaggio progressivo",
  "Altro"
];

export default function GestioneVantaggi() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVantaggio, setEditingVantaggio] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, vantaggio: null, prenotazioniAttive: 0 });
  const { impersonation } = useImpersonation();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    tipo_vantaggio: '',
    titolo: '',
    descrizione: '',
    foto_url: '',
    valore: '',
    valore_sconto: '',
    omaggio_descrizione: '',
    durata_consulenza: '',
    durata_prova: '',
    is_progressivo: false,
    step_progressivi: [{ step: 1, valore: '', descrizione: '', giorni_validita: 30 }],
    utilizzi_massimi: '',
    data_scadenza: '',
    giorni_validita_utilizzo: '',
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

  // Prenotazioni ricevute sui miei vantaggi
  const { data: prenotazioniRicevute = [], isLoading: loadingPrenotazioni } = useQuery({
    queryKey: ['prenotazioni-ricevute', mieVantaggi],
    queryFn: async () => {
      if (mieVantaggi.length === 0) return [];
      const vantaggiIds = mieVantaggi.map(v => v.id);
      const allPrenotazioni = await base44.entities.PrenotazioneVantaggio.filter({ status: 'attiva' });
      return allPrenotazioni.filter(p => vantaggiIds.includes(p.vantaggio_id));
    },
    enabled: mieVantaggi.length > 0,
  });

  // Utenti per mostrare i nomi
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-prenotazioni'],
    queryFn: async () => {
      const response = await base44.functions.invoke('listMembers');
      return response.data?.users || [];
    },
    enabled: prenotazioniRicevute.length > 0,
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
      const cleanData = {
        ...data,
        creator_email: user.email,
        creator_type: isConsulente ? 'consulente' : 'azienda',
        utilizzi_massimi: data.utilizzi_massimi ? parseInt(data.utilizzi_massimi) : null,
        utilizzi_effettuati: 0,
        valore_sconto: data.valore_sconto ? parseFloat(data.valore_sconto) : null,
        giorni_validita_utilizzo: data.giorni_validita_utilizzo ? parseInt(data.giorni_validita_utilizzo) : null,
        is_progressivo: data.tipo_vantaggio === 'Vantaggio progressivo',
        step_progressivi: data.tipo_vantaggio === 'Vantaggio progressivo' ? data.step_progressivi : null
      };
      await base44.entities.Vantaggio.create(cleanData);
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
      const cleanData = {
        ...data,
        utilizzi_massimi: data.utilizzi_massimi ? parseInt(data.utilizzi_massimi) : null,
        valore_sconto: data.valore_sconto ? parseFloat(data.valore_sconto) : null,
        giorni_validita_utilizzo: data.giorni_validita_utilizzo ? parseInt(data.giorni_validita_utilizzo) : null,
        is_progressivo: data.tipo_vantaggio === 'Vantaggio progressivo',
        step_progressivi: data.tipo_vantaggio === 'Vantaggio progressivo' ? data.step_progressivi : null
      };
      await base44.entities.Vantaggio.update(id, cleanData);
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

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Vantaggio.delete(id);
    },
    onSuccess: () => {
      toast.success('Vantaggio eliminato');
      queryClient.invalidateQueries({ queryKey: ['miei-vantaggi'] });
      setDeleteDialog({ open: false, vantaggio: null, prenotazioniAttive: 0 });
    },
    onError: () => toast.error('Errore durante l\'eliminazione')
  });

  const handleDeleteClick = async (vantaggio) => {
    // Conta prenotazioni attive per questo vantaggio
    const prenotazioni = await base44.entities.PrenotazioneVantaggio.filter({
      vantaggio_id: vantaggio.id,
      status: 'attiva'
    });
    setDeleteDialog({ open: true, vantaggio, prenotazioniAttive: prenotazioni.length });
  };

  const resetForm = () => {
    setFormData({
      tipo_vantaggio: '',
      titolo: '',
      descrizione: '',
      foto_url: '',
      valore: '',
      valore_sconto: '',
      omaggio_descrizione: '',
      durata_consulenza: '',
      durata_prova: '',
      is_progressivo: false,
      step_progressivi: [{ step: 1, valore: '', descrizione: '', giorni_validita: 30 }],
      utilizzi_massimi: '',
      data_scadenza: '',
      giorni_validita_utilizzo: '',
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
      valore_sconto: vantaggio.valore_sconto?.toString() || '',
      omaggio_descrizione: vantaggio.omaggio_descrizione || '',
      durata_consulenza: vantaggio.durata_consulenza || '',
      durata_prova: vantaggio.durata_prova || '',
      is_progressivo: vantaggio.is_progressivo || false,
      step_progressivi: vantaggio.step_progressivi?.length > 0 
        ? vantaggio.step_progressivi 
        : [{ step: 1, valore: '', descrizione: '', giorni_validita: 30 }],
      utilizzi_massimi: vantaggio.utilizzi_massimi?.toString() || '',
      data_scadenza: vantaggio.data_scadenza || '',
      giorni_validita_utilizzo: vantaggio.giorni_validita_utilizzo?.toString() || '',
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
    <div className="min-h-screen bg-slate-900 pb-64">
      <Header user={user} />

      <main className="px-4 py-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('VantaggiIscritti')} className="text-lime-400">
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

        {/* Prenotazioni Ricevute */}
        {prenotazioniRicevute.length > 0 && (
          <div className="mb-6">
            <h2 className="text-white font-bold mb-3 flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-400" />
              Prenotazioni Ricevute ({prenotazioniRicevute.length})
            </h2>
            <div className="space-y-2">
              {prenotazioniRicevute.slice(0, 5).map(prenotazione => {
                const vantaggio = mieVantaggi.find(v => v.id === prenotazione.vantaggio_id);
                const utente = allUsers.find(u => u.email === prenotazione.user_email);
                return (
                  <Card key={prenotazione.id} className="bg-amber-500/10 border-amber-500/30">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {utente?.company_name || utente?.full_name || prenotazione.user_email}
                        </p>
                        <p className="text-amber-400 text-xs truncate">
                          ha prenotato: {vantaggio?.titolo || 'Vantaggio'}
                        </p>
                        <p className="text-slate-500 text-[10px]">
                          {new Date(prenotazione.created_date).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                      <Badge className="bg-amber-500 text-white text-[10px]">Attiva</Badge>
                    </CardContent>
                  </Card>
                );
              })}
              {prenotazioniRicevute.length > 5 && (
                <p className="text-slate-500 text-xs text-center">
                  +{prenotazioniRicevute.length - 5} altre prenotazioni
                </p>
              )}
            </div>
          </div>
        )}

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
                              className="h-8 w-8 p-0 text-slate-400 hover:text-amber-400"
                              onClick={() => toggleActiveMutation.mutate({ id: vantaggio.id, is_active: false })}
                            >
                              <EyeOff className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                              onClick={() => handleDeleteClick(vantaggio)}
                            >
                              <Trash2 className="w-4 h-4" />
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
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-lime-400 text-lime-400"
                        onClick={() => toggleActiveMutation.mutate({ id: vantaggio.id, is_active: true })}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Attiva
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500 text-red-400"
                        onClick={() => handleDeleteClick(vantaggio)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
            {/* STEP 1: Selezione Tipo */}
            {!formData.tipo_vantaggio && !editingVantaggio ? (
              <div className="space-y-3">
                <p className="text-slate-400 text-sm text-center mb-4">Che tipo di vantaggio vuoi offrire?</p>
                <div className="grid grid-cols-2 gap-3">
                  {TIPI_VANTAGGIO.map(tipo => (
                    <button
                      key={tipo}
                      onClick={() => setFormData({ ...formData, tipo_vantaggio: tipo })}
                      className="bg-slate-700 hover:bg-slate-600 border-2 border-slate-600 hover:border-lime-400 rounded-xl p-4 text-left transition-all"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {tipo === 'Sconto percentuale' && <span className="text-2xl">%</span>}
                        {tipo === 'Sconto fisso' && <span className="text-2xl">€</span>}
                        {tipo === 'Consulenza gratuita' && <span className="text-2xl">💬</span>}
                        {tipo === 'Omaggio' && <span className="text-2xl">🎁</span>}
                        {tipo === 'Promozione speciale' && <span className="text-2xl">⭐</span>}
                        {tipo === 'Prova gratuita' && <span className="text-2xl">🆓</span>}
                        {tipo === 'Vantaggio progressivo' && <TrendingUp className="w-6 h-6 text-purple-400" />}
                        {tipo === 'Altro' && <span className="text-2xl">📋</span>}
                      </div>
                      <p className="text-white font-medium text-sm">{tipo}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* STEP 2: Form dedicato al tipo selezionato */
              <>
                {/* Header tipo selezionato */}
                <div className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    {formData.tipo_vantaggio === 'Sconto percentuale' && <span className="text-xl">%</span>}
                    {formData.tipo_vantaggio === 'Sconto fisso' && <span className="text-xl">€</span>}
                    {formData.tipo_vantaggio === 'Consulenza gratuita' && <span className="text-xl">💬</span>}
                    {formData.tipo_vantaggio === 'Omaggio' && <span className="text-xl">🎁</span>}
                    {formData.tipo_vantaggio === 'Promozione speciale' && <span className="text-xl">⭐</span>}
                    {formData.tipo_vantaggio === 'Prova gratuita' && <span className="text-xl">🆓</span>}
                    {formData.tipo_vantaggio === 'Vantaggio progressivo' && <TrendingUp className="w-5 h-5 text-purple-400" />}
                    {formData.tipo_vantaggio === 'Altro' && <span className="text-xl">📋</span>}
                    <span className="text-lime-400 font-bold">{formData.tipo_vantaggio}</span>
                  </div>
                  {!editingVantaggio && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData({ ...formData, tipo_vantaggio: '' })}
                      className="text-slate-400 hover:text-white h-8 px-2"
                    >
                      Cambia
                    </Button>
                  )}
                </div>

                {/* Titolo */}
                <div>
                  <Label className="text-lime-400">Titolo *</Label>
                  <Input
                    value={formData.titolo}
                    onChange={(e) => setFormData({ ...formData, titolo: e.target.value })}
                    placeholder={
                      formData.tipo_vantaggio === 'Sconto percentuale' ? "Es: Sconto 20% su tutti i servizi" :
                      formData.tipo_vantaggio === 'Sconto fisso' ? "Es: Buono sconto €50" :
                      formData.tipo_vantaggio === 'Consulenza gratuita' ? "Es: Prima consulenza gratuita" :
                      formData.tipo_vantaggio === 'Omaggio' ? "Es: Omaggio di benvenuto" :
                      formData.tipo_vantaggio === 'Prova gratuita' ? "Es: Prova gratuita 7 giorni" :
                      formData.tipo_vantaggio === 'Vantaggio progressivo' ? "Es: Fidelity Card - Sconti crescenti" :
                      "Es: Promozione esclusiva membri"
                    }
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
                    rows={2}
                  />
                </div>

                {/* Foto */}
                <div>
                  <Label className="text-slate-400">Foto (opzionale)</Label>
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
                    <label className="flex items-center justify-center gap-2 bg-slate-900 border-2 border-dashed border-slate-700 rounded-lg p-3 cursor-pointer hover:border-lime-400">
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
                      {uploadingPhoto ? (
                        <div className="animate-spin w-5 h-5 border-2 border-lime-400 border-t-transparent rounded-full" />
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-lime-400" />
                          <span className="text-slate-300 text-sm">Carica foto</span>
                        </>
                      )}
                    </label>
                  )}
                </div>

                {/* CAMPI SPECIFICI PER TIPO */}
                
                {/* Sconto percentuale */}
                {formData.tipo_vantaggio === 'Sconto percentuale' && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-3">
                    <Label className="text-green-400">Percentuale di sconto *</Label>
                    <Input
                      value={formData.valore}
                      onChange={(e) => setFormData({ ...formData, valore: e.target.value })}
                      placeholder="Es: 20%, 15% su tutto, 10% sui servizi..."
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>
                )}

                {/* Sconto fisso */}
                {formData.tipo_vantaggio === 'Sconto fisso' && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-3">
                    <Label className="text-blue-400">Valore dello sconto *</Label>
                    <Input
                      value={formData.valore}
                      onChange={(e) => setFormData({ ...formData, valore: e.target.value })}
                      placeholder="Es: €50, €100, €25 di sconto..."
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>
                )}

                {/* Consulenza gratuita */}
                {formData.tipo_vantaggio === 'Consulenza gratuita' && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-3">
                    <Label className="text-purple-400">Dettagli consulenza *</Label>
                    <Input
                      value={formData.valore}
                      onChange={(e) => setFormData({ ...formData, valore: e.target.value })}
                      placeholder="Es: 1 consulenza 30 min, 2 ore di consulenza..."
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>
                )}

                {/* Omaggio */}
                {formData.tipo_vantaggio === 'Omaggio' && (
                  <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-4 space-y-3">
                    <Label className="text-pink-400">Cosa regali? *</Label>
                    <Input
                      value={formData.valore}
                      onChange={(e) => setFormData({ ...formData, valore: e.target.value })}
                      placeholder="Es: Gadget aziendale, Prodotto campione, Kit benvenuto..."
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>
                )}

                {/* Prova gratuita */}
                {formData.tipo_vantaggio === 'Prova gratuita' && (
                  <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 space-y-3">
                    <Label className="text-cyan-400">Durata della prova *</Label>
                    <Input
                      value={formData.valore}
                      onChange={(e) => setFormData({ ...formData, valore: e.target.value })}
                      placeholder="Es: 7 giorni gratis, 1 mese di prova, 14 giorni..."
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>
                )}

                {/* Promozione speciale / Altro */}
                {(formData.tipo_vantaggio === 'Promozione speciale' || formData.tipo_vantaggio === 'Altro') && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-3">
                    <Label className="text-amber-400">Descrivi il vantaggio *</Label>
                    <Input
                      value={formData.valore}
                      onChange={(e) => setFormData({ ...formData, valore: e.target.value })}
                      placeholder="Es: 2x1, Spedizione gratuita, Accesso VIP..."
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>
                )}

                {/* Vantaggio Progressivo */}
                {formData.tipo_vantaggio === 'Vantaggio progressivo' && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-purple-400" />
                      <Label className="text-purple-400 text-base">Step Progressivi</Label>
                    </div>
                    <p className="text-slate-400 text-xs">
                      Ogni scansione QR sblocca lo step successivo. Crea sconti/vantaggi crescenti per fidelizzare!
                    </p>

                    {formData.step_progressivi.map((step, index) => (
                      <div key={index} className="bg-slate-800 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-purple-400 font-bold text-sm">Step {step.step}</span>
                          {formData.step_progressivi.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                              onClick={() => {
                                const newSteps = formData.step_progressivi.filter((_, i) => i !== index);
                                setFormData({ ...formData, step_progressivi: newSteps.map((s, i) => ({ ...s, step: i + 1 })) });
                              }}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        <Input
                          value={step.valore}
                          onChange={(e) => {
                            const newSteps = [...formData.step_progressivi];
                            newSteps[index].valore = e.target.value;
                            setFormData({ ...formData, step_progressivi: newSteps });
                          }}
                          placeholder="Es: 5%, 10%, €20..."
                          className="bg-slate-900 border-slate-600 text-white text-sm"
                        />
                        <Input
                          value={step.descrizione}
                          onChange={(e) => {
                            const newSteps = [...formData.step_progressivi];
                            newSteps[index].descrizione = e.target.value;
                            setFormData({ ...formData, step_progressivi: newSteps });
                          }}
                          placeholder="Descrizione (opzionale)"
                          className="bg-slate-900 border-slate-600 text-white text-sm"
                        />
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-500" />
                          <Input
                            type="number"
                            value={step.giorni_validita}
                            onChange={(e) => {
                              const newSteps = [...formData.step_progressivi];
                              newSteps[index].giorni_validita = parseInt(e.target.value) || 30;
                              setFormData({ ...formData, step_progressivi: newSteps });
                            }}
                            className="bg-slate-900 border-slate-600 text-white text-sm flex-1"
                          />
                          <span className="text-slate-400 text-xs">giorni per usarlo</span>
                        </div>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full border-purple-400 text-purple-400"
                      onClick={() => {
                        const newStep = {
                          step: formData.step_progressivi.length + 1,
                          valore: '',
                          descrizione: '',
                          giorni_validita: 30
                        };
                        setFormData({ ...formData, step_progressivi: [...formData.step_progressivi, newStep] });
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Aggiungi Step
                    </Button>
                  </div>
                )}

                {/* IMPOSTAZIONI COMUNI */}
                <div className="border-t border-slate-700 pt-4 space-y-4">
                  <p className="text-slate-500 text-xs font-medium">IMPOSTAZIONI</p>

                  {/* Utilizzi massimi - solo per non progressivi */}
                  {formData.tipo_vantaggio !== 'Vantaggio progressivo' && (
                    <div>
                      <Label className="text-slate-400">Utilizzi massimi</Label>
                      <Input
                        type="number"
                        value={formData.utilizzi_massimi}
                        onChange={(e) => setFormData({ ...formData, utilizzi_massimi: e.target.value })}
                        placeholder="Lascia vuoto per illimitato"
                        className="bg-slate-900 border-slate-600 text-white"
                      />
                    </div>
                  )}

                  {/* Giorni validità utilizzo */}
                  <div>
                    <Label className="text-slate-400">Giorni per utilizzare dopo prenotazione</Label>
                    <Input
                      type="number"
                      value={formData.giorni_validita_utilizzo}
                      onChange={(e) => setFormData({ ...formData, giorni_validita_utilizzo: e.target.value })}
                      placeholder="Lascia vuoto per nessun limite"
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                    <p className="text-slate-500 text-xs mt-1">Se scade, il QR non sarà più valido</p>
                  </div>

                  {/* Scadenza */}
                  <div>
                    <Label className="text-slate-400">Data scadenza offerta</Label>
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
                      <p className="text-slate-400 text-xs">L'utente deve prenotare prima</p>
                    </div>
                    <Switch
                      checked={formData.richiede_prenotazione}
                      onCheckedChange={(checked) => setFormData({ ...formData, richiede_prenotazione: checked })}
                    />
                  </div>
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
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog conferma eliminazione */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, vantaggio: null, prenotazioniAttive: 0 })}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              {deleteDialog.prenotazioniAttive > 0 ? (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              ) : (
                <Trash2 className="w-5 h-5 text-red-400" />
              )}
              Elimina Vantaggio
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              {deleteDialog.prenotazioniAttive > 0 ? (
                <>
                  <span className="text-amber-400 font-bold">Attenzione!</span> Ci sono{' '}
                  <span className="text-white font-bold">{deleteDialog.prenotazioniAttive} utenti</span> che hanno già prenotato questo vantaggio.
                  <br /><br />
                  Se elimini il vantaggio, questi utenti potranno comunque consumarlo mostrando il loro QR code.
                  <br /><br />
                  Vuoi procedere con l'eliminazione di <span className="text-lime-400 font-bold">"{deleteDialog.vantaggio?.titolo}"</span>?
                </>
              ) : (
                <>
                  Sei sicuro di voler eliminare il vantaggio <span className="text-lime-400 font-bold">"{deleteDialog.vantaggio?.titolo}"</span>?
                  <br /><br />
                  Questa azione non può essere annullata.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white hover:bg-slate-600 border-slate-600">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={() => deleteMutation.mutate(deleteDialog.vantaggio?.id)}
            >
              {deleteMutation.isPending ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>Elimina</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}