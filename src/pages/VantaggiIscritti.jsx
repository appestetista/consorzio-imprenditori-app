import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Gift, Tag, Calendar, MapPin, Check, Clock, Building2, User, Plus, X, Upload, TrendingUp, Minus, QrCode } from 'lucide-react';
import VantaggiCategoryFilter, { CATEGORIES } from '../components/vantaggi/VantaggiCategoryFilter';
import VantaggiExamplesCollapsible from '../components/vantaggi/VantaggiExamplesCollapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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

export default function VantaggiIscritti() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState({
    tipo_vantaggio: '',
    categoria_vantaggio: '',
    titolo: '',
    descrizione: '',
    foto_url: '',
    valore: '',
    is_progressivo: false,
    step_progressivi: [{ step: 1, valore: '', descrizione: '', giorni_validita: 30 }],
    utilizzi_massimi: '',
    data_scadenza: '',
    giorni_validita_utilizzo: '',
    richiede_prenotazione: true,
    is_active: true
  });
  const [selectedCategory, setSelectedCategory] = useState(null);
  const { impersonation } = useImpersonation();
  const queryClient = useQueryClient();

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

  // Vantaggi attivi
  const { data: vantaggiAttivi = [], isLoading: loadingVantaggi } = useQuery({
    queryKey: ['vantaggi-attivi'],
    queryFn: async () => {
      const all = await base44.entities.Vantaggio.filter({ is_active: true });
      const oggi = new Date();
      oggi.setHours(0, 0, 0, 0);
      // Filtra: non scaduti e con utilizzi disponibili
      return all.filter(v => {
        if (v.data_scadenza) {
          const scadenza = new Date(v.data_scadenza);
          if (scadenza < oggi) return false;
        }
        if (v.utilizzi_massimi && v.utilizzi_effettuati >= v.utilizzi_massimi) return false;
        return true;
      });
    },
  });

  // Tutti i vantaggi (inclusi eliminati) per recuperare quelli prenotati dall'utente
  const { data: tuttiVantaggi = [] } = useQuery({
    queryKey: ['tutti-vantaggi'],
    queryFn: () => base44.entities.Vantaggio.list(),
  });

  // Prenotazioni attive dell'utente
  const { data: miePrenotazioni = [] } = useQuery({
    queryKey: ['mie-prenotazioni-vantaggi', user?.email],
    queryFn: () => base44.entities.PrenotazioneVantaggio.filter({ 
      user_email: user?.email, 
      status: 'attiva' 
    }),
    enabled: !!user?.email,
  });

  // Tutte le prenotazioni dell'utente (per vedere quelle già consumate)
  const { data: tuttePrenotazioni = [] } = useQuery({
    queryKey: ['tutte-mie-prenotazioni', user?.email],
    queryFn: () => base44.entities.PrenotazioneVantaggio.filter({ user_email: user?.email }),
    enabled: !!user?.email,
  });

  // Consulenti (per nome/logo)
  const { data: consultants = [] } = useQuery({
    queryKey: ['consultants-vantaggi'],
    queryFn: () => base44.entities.Consultant.list(),
  });

  // Verifica se utente è consulente
  const isConsulente = consultants.some(c => c.email === user?.email);

  // Utenti (per aziende)
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-vantaggi'],
    queryFn: async () => {
      const response = await base44.functions.invoke('listMembers');
      return response.data?.users || [];
    },
  });

  // Mutation per prenotare
  const prenotaMutation = useMutation({
    mutationFn: async (vantaggioId) => {
      // Crea la prenotazione
      await base44.entities.PrenotazioneVantaggio.create({
        user_email: user.email,
        vantaggio_id: vantaggioId,
        status: 'attiva'
      });
      
      // Trova il vantaggio per notificare il creatore
      const vantaggio = vantaggiAttivi.find(v => v.id === vantaggioId);
      if (vantaggio && vantaggio.creator_email) {
        // Crea notifica per il creatore del vantaggio (il suono viene gestito automaticamente dalla subscription real-time nell'Header)
        const userName = user?.company_name || user?.full_name || user?.email;
        await base44.entities.Notification.create({
          user_email: vantaggio.creator_email,
          type: 'message',
          title: '🎁 Nuova prenotazione vantaggio',
          content: `${userName} ha prenotato il tuo vantaggio "${vantaggio.titolo}"`,
          reference_id: vantaggioId,
          is_read: false
        });
        
        // Crea messaggio per il creatore
        await base44.entities.Message.create({
          from_email: user.email,
          to_email: vantaggio.creator_email,
          content: `Ho prenotato il vantaggio "${vantaggio.titolo}". Verrò in negozio per utilizzarlo!`,
          source: 'vantaggi',
          source_reference: vantaggio.titolo
        });
      }
    },
    onSuccess: () => {
      toast.success('Vantaggio prenotato! Mostra il tuo QR in negozio per utilizzarlo.');
      queryClient.invalidateQueries({ queryKey: ['mie-prenotazioni-vantaggi'] });
    },
    onError: () => {
      toast.error('Errore durante la prenotazione');
    }
  });

  // Mutation per creare vantaggio
  const createVantaggioMutation = useMutation({
    mutationFn: async (data) => {
      const cleanData = {
        ...data,
        creator_email: user.email,
        creator_type: isConsulente ? 'consulente' : 'utente',
        utilizzi_massimi: data.utilizzi_massimi ? parseInt(data.utilizzi_massimi) : null,
        utilizzi_effettuati: 0,
        giorni_validita_utilizzo: data.giorni_validita_utilizzo ? parseInt(data.giorni_validita_utilizzo) : null,
        is_progressivo: data.tipo_vantaggio === 'Vantaggio progressivo',
        step_progressivi: data.tipo_vantaggio === 'Vantaggio progressivo' ? data.step_progressivi : null
      };
      await base44.entities.Vantaggio.create(cleanData);
    },
    onSuccess: () => {
      toast.success('Vantaggio creato!');
      queryClient.invalidateQueries({ queryKey: ['vantaggi-attivi'] });
      resetForm();
      setShowCreatePanel(false);
    },
    onError: () => toast.error('Errore durante la creazione')
  });

  const resetForm = () => {
    setFormData({
      tipo_vantaggio: '',
      categoria_vantaggio: '',
      titolo: '',
      descrizione: '',
      foto_url: '',
      valore: '',
      is_progressivo: false,
      step_progressivi: [{ step: 1, valore: '', descrizione: '', giorni_validita: 30 }],
      utilizzi_massimi: '',
      data_scadenza: '',
      giorni_validita_utilizzo: '',
      richiede_prenotazione: true,
      is_active: true
    });
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

  const handleSubmitVantaggio = () => {
    if (!formData.tipo_vantaggio || !formData.titolo || !formData.categoria_vantaggio) {
      toast.error('Compila tipo, categoria e titolo');
      return;
    }
    createVantaggioMutation.mutate(formData);
  };

  const getCreatorInfo = (vantaggio) => {
    if (vantaggio.creator_type === 'consulente') {
      const consultant = consultants.find(c => c.email === vantaggio.creator_email);
      return {
        name: consultant?.name || 'Consulente',
        logo: consultant?.logo_url,
        type: 'consulente'
      };
    } else {
      const azienda = allUsers.find(u => u.email === vantaggio.creator_email);
      return {
        name: azienda?.company_name || 'Azienda',
        logo: azienda?.logo_url,
        type: 'azienda'
      };
    }
  };

  const isPrenotato = (vantaggioId) => {
    return miePrenotazioni.some(p => p.vantaggio_id === vantaggioId);
  };

  // Blocco: se l'utente ha >= 5 prenotazioni attive senza match QR
  const isBloccato = miePrenotazioni.length >= 5;

  // Verifica se l'utente ha già consumato questo vantaggio
  const isConsumato = (vantaggioId) => {
    return tuttePrenotazioni.some(p => p.vantaggio_id === vantaggioId && p.status === 'utilizzata');
  };

  // Combina vantaggi attivi + vantaggi prenotati dall'utente (anche se eliminati/disattivati)
  const vantaggi = React.useMemo(() => {
    // IDs dei vantaggi prenotati dall'utente (solo prenotazioni attive, non ancora consumate)
    const prenotatiIds = miePrenotazioni.map(p => p.vantaggio_id);
    
    // Vantaggi prenotati ma non più attivi (eliminati o disattivati)
    const vantaggiPrenotatiNonAttivi = tuttiVantaggi.filter(v => 
      prenotatiIds.includes(v.id) && !vantaggiAttivi.some(va => va.id === v.id)
    );
    
    // Combina: vantaggi attivi + vantaggi prenotati non più attivi
    return [...vantaggiAttivi, ...vantaggiPrenotatiNonAttivi];
  }, [vantaggiAttivi, tuttiVantaggi, miePrenotazioni]);

  // Conta quante volte l'utente può ancora usare questo vantaggio
  const getUtilizziRimanentiPerUtente = (vantaggio) => {
    if (!vantaggio.utilizzi_massimi) return null; // Illimitato
    
    const prenotazioniUtente = tuttePrenotazioni.filter(p => 
      p.vantaggio_id === vantaggio.id && 
      (p.status === 'utilizzata' || p.status === 'attiva')
    );
    
    // Se il vantaggio è "1 per utente" e l'utente l'ha già usato/prenotato
    if (vantaggio.utilizzi_massimi === 1 && prenotazioniUtente.length > 0) {
      return 0;
    }
    
    return null; // Per altri casi, non limitiamo per utente
  };

  const getTipoVantaggioColor = (tipo) => {
    switch (tipo) {
      case 'Sconto percentuale': return 'bg-green-500';
      case 'Sconto fisso': return 'bg-blue-500';
      case 'Consulenza gratuita': return 'bg-purple-500';
      case 'Omaggio': return 'bg-pink-500';
      case 'Promozione speciale': return 'bg-amber-500';
      case 'Prova gratuita': return 'bg-cyan-500';
      case 'Vantaggio progressivo': return 'bg-purple-600';
      default: return 'bg-slate-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900" style={{ paddingBottom: '280px' }}>
      <main className="px-4 py-6 max-w-4xl mx-auto">
        {/* Pulsante Crea Vantaggio */}
        <Button
          onClick={() => setShowCreatePanel(true)}
          className="w-full bg-lime-400 hover:bg-lime-500 text-black font-bold h-12 text-sm mb-3"
        >
          <Plus className="w-5 h-5 mr-2" />
          Crea un vantaggio per gli altri
        </Button>

        {/* Pulsante Storico Vantaggi */}
        <Link to={createPageUrl('MiePrenotazioniVantaggi')} className="block mb-4">
          <Button
            variant="outline"
            className="w-full border-amber-400/60 text-amber-400 hover:bg-amber-400/10 font-bold h-12 text-sm"
          >
            <Gift className="w-5 h-5 mr-2" />
            Storico Vantaggi
          </Button>
        </Link>

        <VantaggiExamplesCollapsible />

        {/* Info box */}
        <div className="bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 border border-emerald-400/40 rounded-xl p-3 mb-4">
          <p className="text-emerald-300 text-xs font-medium">
            💡 Prenota un vantaggio e mostra il tuo QR code in negozio per utilizzarlo!
          </p>
        </div>

        {/* Filtro categorie dinamico */}
        <VantaggiCategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} vantaggi={vantaggi} />

        {/* Lista vantaggi */}
        {loadingVantaggi ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : (() => {
          const filtered = vantaggi.filter(v => !selectedCategory || v.categoria_vantaggio === selectedCategory);
          return filtered.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-8 text-center">
              <Gift className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">
                {selectedCategory ? `Nessun vantaggio nella categoria "${selectedCategory}"` : 'Nessun vantaggio disponibile al momento'}
              </p>
              {selectedCategory && (
                <Button variant="ghost" size="sm" className="text-lime-400 mt-2" onClick={() => setSelectedCategory(null)}>
                  Mostra tutti
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filtered.map((vantaggio) => {
              const creator = getCreatorInfo(vantaggio);
              const prenotato = isPrenotato(vantaggio.id);
              const consumato = isConsumato(vantaggio.id);
              const utilizziRimasti = vantaggio.utilizzi_massimi 
                ? vantaggio.utilizzi_massimi - (vantaggio.utilizzi_effettuati || 0)
                : null;
              // Vantaggio esaurito per questo utente (già consumato e era solo 1 utilizzo)
              const esauritoPerUtente = consumato && vantaggio.utilizzi_massimi === 1;

              return (
                <Card key={vantaggio.id} className={`overflow-hidden relative ${esauritoPerUtente ? 'border-red-500/50' : 'border-slate-700'} ${esauritoPerUtente ? 'bg-red-900/30' : 'bg-slate-800'}`}>
                  <CardContent className="p-0">
                    <div className="flex">
                      {/* Foto con overlay se consumato */}
                      <div className="relative w-28 h-28 flex-shrink-0">
                        {vantaggio.foto_url ? (
                          <img 
                            src={vantaggio.foto_url} 
                            alt={vantaggio.titolo}
                            className={`w-full h-full object-cover ${esauritoPerUtente ? 'opacity-40 grayscale' : ''}`}
                          />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${esauritoPerUtente ? 'bg-red-900/50' : 'bg-slate-700'}`}>
                            <Gift className={`w-10 h-10 ${esauritoPerUtente ? 'text-red-400' : 'text-slate-500'}`} />
                          </div>
                        )}
                        {esauritoPerUtente && (
                          <div className="absolute inset-0 flex items-center justify-center bg-red-900/70">
                            <span className="text-red-300 font-bold text-xs text-center px-2 rotate-[-15deg]">
                              CONSUMATO
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Contenuto */}
                      <div className="flex-1 p-3">
                        {/* Header con tipo e creator */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex flex-wrap gap-1">
                            <Badge className={`${getTipoVantaggioColor(vantaggio.tipo_vantaggio)} text-white text-[10px]`}>
                              {vantaggio.tipo_vantaggio}
                            </Badge>
                            {vantaggio.categoria_vantaggio && (
                              <Badge variant="outline" className="text-slate-300 border-slate-600 text-[10px]">
                                {vantaggio.categoria_vantaggio}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-slate-400 text-xs">
                            {creator.logo ? (
                              <img src={creator.logo} alt="" className="w-4 h-4 rounded-full object-cover" />
                            ) : (
                              creator.type === 'consulente' ? <User className="w-3 h-3" /> : <Building2 className="w-3 h-3" />
                            )}
                            <span className="truncate max-w-[80px]">{creator.name}</span>
                          </div>
                        </div>

                        {/* Titolo e valore */}
                        <h3 className="text-white font-bold text-sm mb-1">{vantaggio.titolo}</h3>
                        {vantaggio.valore && (
                          <p className="text-lime-400 font-bold text-lg">{vantaggio.valore}</p>
                        )}

                        {/* Descrizione */}
                        {vantaggio.descrizione && (
                          <p className="text-slate-400 text-xs mt-1 line-clamp-2">{vantaggio.descrizione}</p>
                        )}

                        {/* Info aggiuntive */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {vantaggio.data_scadenza && (
                            <span className="text-slate-500 text-[10px] flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Scade: {new Date(vantaggio.data_scadenza).toLocaleDateString('it-IT')}
                            </span>
                          )}
                          {utilizziRimasti !== null && (
                            <span className="text-slate-500 text-[10px] flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {utilizziRimasti} rimasti
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer con azione */}
                    <div className="px-3 pb-3">
                      {esauritoPerUtente ? (
                        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-2 flex items-center justify-center gap-2">
                          <X className="w-4 h-4 text-red-400" />
                          <span className="text-red-400 text-sm font-medium">Già utilizzato</span>
                        </div>
                      ) : prenotato ? (
                        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-2 flex items-center justify-center gap-2">
                          <Check className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 text-sm font-medium">Prenotato</span>
                        </div>
                      ) : vantaggio.richiede_prenotazione ? (
                        <Button
                          onClick={() => prenotaMutation.mutate(vantaggio.id)}
                          disabled={prenotaMutation.isPending || consumato || isBloccato}
                          className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 font-bold disabled:opacity-50"
                          size="sm"
                        >
                          <Gift className="w-4 h-4 mr-2" />
                          {isBloccato ? 'Bloccato' : 'Prenota'}
                        </Button>
                      ) : (
                        <div className="bg-amber-500/20 border border-amber-500/50 rounded-lg p-2 text-center">
                          <span className="text-amber-400 text-sm">Mostra il QR in negozio</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );
        })()}


      </main>

      <BottomNav currentPage="VantaggiIscritti" />

      {/* Sheet Crea Vantaggio */}
      <Sheet open={showCreatePanel} onOpenChange={(open) => {
        if (!open && formData.tipo_vantaggio) {
          setFormData({ ...formData, tipo_vantaggio: '' });
        } else {
          setShowCreatePanel(open);
        }
      }}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-slate-800 border-slate-700 overflow-y-auto z-[60]">
          <SheetHeader>
            <SheetTitle className="text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-lime-400" />
              Crea Nuovo Vantaggio
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            {/* STEP 1: Selezione Tipo */}
            {!formData.tipo_vantaggio ? (
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData({ ...formData, tipo_vantaggio: '' })}
                    className="text-slate-400 hover:text-white h-8 px-2"
                  >
                    Cambia
                  </Button>
                </div>

                {/* Categoria merceologica */}
                <div>
                  <Label className="text-lime-400">Categoria *</Label>
                  <Select
                    value={formData.categoria_vantaggio}
                    onValueChange={(val) => setFormData({ ...formData, categoria_vantaggio: val })}
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                      <SelectValue placeholder="Seleziona categoria..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.id} value={cat.id} className="text-white hover:bg-slate-700">
                          {cat.label}
                        </SelectItem>
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
                  <Button 
                    variant="outline" 
                    onClick={() => { resetForm(); setShowCreatePanel(false); }} 
                    className="flex-1 border-slate-600 text-slate-400"
                  >
                    Annulla
                  </Button>
                  <Button 
                    onClick={handleSubmitVantaggio} 
                    disabled={createVantaggioMutation.isPending}
                    className="flex-1 bg-lime-400 hover:bg-lime-500 text-slate-900"
                  >
                    {createVantaggioMutation.isPending ? (
                      <div className="animate-spin w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Crea
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}