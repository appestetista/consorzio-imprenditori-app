import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Gift, Plus, Edit, Trash2, QrCode, Eye, EyeOff, Calendar, Upload, X, Check, TrendingUp, Clock, Minus, AlertTriangle } from 'lucide-react';
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
  "Vantaggio progressivo",
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

            {/* Campo valore - visibile per tutti tranne progressivo */}
            {formData.tipo_vantaggio && formData.tipo_vantaggio !== 'Vantaggio progressivo' && (
              <div>
                <Label className="text-lime-400">Valore del Vantaggio *</Label>
                <Input
                  value={formData.valore}
                  onChange={(e) => setFormData({ ...formData, valore: e.target.value })}
                  placeholder={
                    formData.tipo_vantaggio === 'Sconto percentuale' ? "Es: 20%, 15% su tutto..." :
                    formData.tipo_vantaggio === 'Sconto fisso' ? "Es: €50, €100 di sconto..." :
                    formData.tipo_vantaggio === 'Consulenza gratuita' ? "Es: 1 consulenza 30 min, 2 ore gratis..." :
                    formData.tipo_vantaggio === 'Omaggio' ? "Es: Gadget aziendale, Prodotto campione..." :
                    formData.tipo_vantaggio === 'Prova gratuita' ? "Es: 7 giorni gratis, 1 mese prova..." :
                    "Es: 2x1, Spedizione gratuita..."
                  }
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>
            )}

            {/* Vantaggio Progressivo */}
            {formData.tipo_vantaggio === 'Vantaggio progressivo' && (
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-lime-400" />
                  <Label className="text-lime-400 text-base">Step Progressivi</Label>
                </div>
                <p className="text-slate-400 text-xs mb-3">
                  Crea sconti crescenti: ogni volta che l'utente scansiona il QR sblocca lo step successivo.
                </p>

                {formData.step_progressivi.map((step, index) => (
                  <div key={index} className="bg-slate-800 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-lime-400 font-bold text-sm">Step {step.step}</span>
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
                  className="w-full border-lime-400 text-lime-400"
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

            {/* Utilizzi massimi - solo per non progressivi */}
            {formData.tipo_vantaggio !== 'Vantaggio progressivo' && (
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
            )}

            {/* Giorni validità utilizzo */}
            <div>
              <Label className="text-slate-400">Giorni per utilizzare dopo prenotazione</Label>
              <Input
                type="number"
                value={formData.giorni_validita_utilizzo}
                onChange={(e) => setFormData({ ...formData, giorni_validita_utilizzo: e.target.value })}
                placeholder="Es: 30 (lascia vuoto per nessun limite)"
                className="bg-slate-900 border-slate-600 text-white"
              />
              <p className="text-slate-500 text-xs mt-1">Se scade, il QR non sarà più valido</p>
            </div>

            {/* Scadenza */}
            <div>
              <Label className="text-slate-400">Data scadenza offerta (opzionale)</Label>
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