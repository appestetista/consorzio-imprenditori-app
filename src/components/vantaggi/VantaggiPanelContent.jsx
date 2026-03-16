import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Gift, Tag, Calendar, MapPin, Check, Clock, Building2, User, Plus, X, Upload, TrendingUp, Minus, QrCode, ChevronLeft, ArrowLeft } from 'lucide-react';
import VantaggiCategoryFilter, { CATEGORIES } from './VantaggiCategoryFilter';
import VantaggiExamplesCollapsible from './VantaggiExamplesCollapsible';
import InlineMyQRCode from './InlineMyQRCode';
import InlineQRScanner from './InlineQRScanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useImpersonation } from '../admin/ImpersonationContext';
import { toast } from 'sonner';

const TIPI_VANTAGGIO = [
  "Sconto percentuale", "Sconto fisso", "Consulenza gratuita", "Omaggio",
  "Promozione speciale", "Prova gratuita", "Vantaggio progressivo", "Altro"
];

export default function VantaggiPanelContent({ onClose }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState({
    tipo_vantaggio: '', categoria_vantaggio: '', titolo: '', descrizione: '', foto_url: '',
    valore: '', is_progressivo: false, step_progressivi: [{ step: 1, valore: '', descrizione: '', giorni_validita: 30 }],
    utilizzi_massimi: '', data_scadenza: '', giorni_validita_utilizzo: '', richiede_prenotazione: true, is_active: true
  });
  const [selectedCategory, setSelectedCategory] = useState(null);
  const { impersonation } = useImpersonation();
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (impersonation.active && impersonation.targetEmail) {
          const users = await base44.entities.User.filter({ email: impersonation.targetEmail });
          setUser(users[0] || currentUser);
        } else {
          setUser(currentUser);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    loadUser();
  }, [impersonation]);

  const { data: vantaggiAttivi = [], isLoading: loadingVantaggi } = useQuery({
    queryKey: ['vantaggi-attivi'],
    queryFn: async () => {
      const all = await base44.entities.Vantaggio.filter({ is_active: true });
      const oggi = new Date(); oggi.setHours(0,0,0,0);
      return all.filter(v => {
        if (v.data_scadenza) { const s = new Date(v.data_scadenza); if (s < oggi) return false; }
        if (v.utilizzi_massimi && v.utilizzi_effettuati >= v.utilizzi_massimi) return false;
        return true;
      });
    },
  });

  const { data: tuttiVantaggi = [] } = useQuery({ queryKey: ['tutti-vantaggi'], queryFn: () => base44.entities.Vantaggio.list() });
  const { data: miePrenotazioni = [] } = useQuery({
    queryKey: ['mie-prenotazioni-vantaggi', user?.email],
    queryFn: () => base44.entities.PrenotazioneVantaggio.filter({ user_email: user?.email, status: 'attiva' }),
    enabled: !!user?.email,
  });
  const { data: tuttePrenotazioni = [] } = useQuery({
    queryKey: ['tutte-mie-prenotazioni', user?.email],
    queryFn: () => base44.entities.PrenotazioneVantaggio.filter({ user_email: user?.email }),
    enabled: !!user?.email,
  });
  const { data: consultants = [] } = useQuery({ queryKey: ['consultants-vantaggi'], queryFn: () => base44.entities.Consultant.list() });
  const isConsulente = consultants.some(c => c.email === user?.email);
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-vantaggi'],
    queryFn: async () => { const r = await base44.functions.invoke('listMembers'); return r.data?.users || []; },
  });

  const prenotaMutation = useMutation({
    mutationFn: async (vantaggioId) => {
      await base44.entities.PrenotazioneVantaggio.create({ user_email: user.email, vantaggio_id: vantaggioId, status: 'attiva' });
      const vantaggio = vantaggiAttivi.find(v => v.id === vantaggioId);
      if (vantaggio?.creator_email) {
        const userName = user?.company_name || user?.full_name || user?.email;
        await base44.entities.Notification.create({ user_email: vantaggio.creator_email, type: 'message', title: '🎁 Nuova prenotazione vantaggio', content: `${userName} ha prenotato il tuo vantaggio "${vantaggio.titolo}"`, reference_id: vantaggioId, is_read: false });
        await base44.entities.Message.create({ from_email: user.email, to_email: vantaggio.creator_email, content: `Ho prenotato il vantaggio "${vantaggio.titolo}". Verrò in negozio per utilizzarlo!`, source: 'vantaggi', source_reference: vantaggio.titolo });
      }
    },
    onSuccess: () => { toast.success('Vantaggio prenotato!'); queryClient.invalidateQueries({ queryKey: ['mie-prenotazioni-vantaggi'] }); },
    onError: () => { toast.error('Errore durante la prenotazione'); }
  });

  const createVantaggioMutation = useMutation({
    mutationFn: async (data) => {
      const cleanData = { ...data, creator_email: user.email, creator_type: isConsulente ? 'consulente' : 'utente', utilizzi_massimi: data.utilizzi_massimi ? parseInt(data.utilizzi_massimi) : null, utilizzi_effettuati: 0, giorni_validita_utilizzo: data.giorni_validita_utilizzo ? parseInt(data.giorni_validita_utilizzo) : null, is_progressivo: data.tipo_vantaggio === 'Vantaggio progressivo', step_progressivi: data.tipo_vantaggio === 'Vantaggio progressivo' ? data.step_progressivi : null };
      await base44.entities.Vantaggio.create(cleanData);
    },
    onSuccess: () => { toast.success('Vantaggio creato!'); queryClient.invalidateQueries({ queryKey: ['vantaggi-attivi'] }); resetForm(); setShowCreatePanel(false); },
    onError: () => toast.error('Errore durante la creazione')
  });

  const resetForm = () => setFormData({ tipo_vantaggio: '', categoria_vantaggio: '', titolo: '', descrizione: '', foto_url: '', valore: '', is_progressivo: false, step_progressivi: [{ step: 1, valore: '', descrizione: '', giorni_validita: 30 }], utilizzi_massimi: '', data_scadenza: '', giorni_validita_utilizzo: '', richiede_prenotazione: true, is_active: true });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingPhoto(true);
    try { const { file_url } = await base44.integrations.Core.UploadFile({ file }); setFormData({ ...formData, foto_url: file_url }); }
    catch { toast.error('Errore durante il caricamento'); }
    finally { setUploadingPhoto(false); }
  };

  const handleSubmitVantaggio = () => {
    if (!formData.tipo_vantaggio || !formData.titolo || !formData.categoria_vantaggio) { toast.error('Compila tipo, categoria e titolo'); return; }
    createVantaggioMutation.mutate(formData);
  };

  const getCreatorInfo = (vantaggio) => {
    if (vantaggio.creator_type === 'consulente') { const c = consultants.find(c => c.email === vantaggio.creator_email); return { name: c?.name || 'Consulente', logo: c?.logo_url, type: 'consulente' }; }
    const a = allUsers.find(u => u.email === vantaggio.creator_email); return { name: a?.company_name || 'Azienda', logo: a?.logo_url, type: 'azienda' };
  };

  const isPrenotato = (id) => miePrenotazioni.some(p => p.vantaggio_id === id);
  const isBloccato = miePrenotazioni.length >= 5;
  const isConsumato = (id) => tuttePrenotazioni.some(p => p.vantaggio_id === id && p.status === 'utilizzata');

  const vantaggi = React.useMemo(() => {
    const prenotatiIds = miePrenotazioni.map(p => p.vantaggio_id);
    const nonAttivi = tuttiVantaggi.filter(v => prenotatiIds.includes(v.id) && !vantaggiAttivi.some(va => va.id === v.id));
    return [...vantaggiAttivi, ...nonAttivi];
  }, [vantaggiAttivi, tuttiVantaggi, miePrenotazioni]);

  const getTipoColor = (tipo) => {
    const map = { 'Sconto percentuale': 'bg-green-500', 'Sconto fisso': 'bg-blue-500', 'Consulenza gratuita': 'bg-purple-500', 'Omaggio': 'bg-pink-500', 'Promozione speciale': 'bg-amber-500', 'Prova gratuita': 'bg-cyan-500', 'Vantaggio progressivo': 'bg-purple-600' };
    return map[tipo] || 'bg-slate-500';
  };

  if (loading) return <div className="flex-1 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full" /></div>;

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Header pannello */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-[#d4af37]/20">
        <Gift className="w-5 h-5 text-[#d4af37]" />
        <h1 className="text-white text-lg font-bold flex-1">Vantaggi Iscritti</h1>
      </div>

      {/* Contenuto scrollabile */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ paddingBottom: '220px' }}>
        {/* Pulsanti Crea e Storico */}
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={() => setShowCreatePanel(true)} className="bg-[#d4af37] hover:bg-[#b8860b] text-black font-bold h-11 text-sm">
            <Plus className="w-5 h-5 mr-2" /> Crea Vantaggio
          </Button>
          <Link to={createPageUrl('MiePrenotazioniVantaggi')} onClick={onClose} className="flex items-center justify-center gap-2 h-11 rounded-md border-2 border-[#d4af37]/50 bg-[#d4af37]/10 hover:bg-[#d4af37]/20 transition-all active:scale-95">
            <Clock className="w-4 h-4 text-[#d4af37]" />
            <span className="text-[#d4af37] text-sm font-bold">Storico Vantaggi</span>
          </Link>
        </div>

        {/* QR Code + Scanner affiancati */}
        {user && (
          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              <InlineMyQRCode user={user} compact />
            </div>
            <div className="flex-1 min-w-0">
              <InlineQRScanner user={user} compact />
            </div>
          </div>
        )}

        {/* Filtro */}
        <VantaggiCategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} vantaggi={vantaggi} />

        {/* Lista vantaggi */}
        {loadingVantaggi ? (
          <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full mx-auto" /></div>
        ) : (() => {
          const filtered = vantaggi.filter(v => !selectedCategory || v.categoria_vantaggio === selectedCategory);
          return filtered.length === 0 ? (
            <div className="py-4" />
          ) : (
            <div className="grid gap-4 pb-4">
              {filtered.map((vantaggio) => {
                const creator = getCreatorInfo(vantaggio);
                const prenotato = isPrenotato(vantaggio.id);
                const consumato = isConsumato(vantaggio.id);
                const utilizziRimasti = vantaggio.utilizzi_massimi ? vantaggio.utilizzi_massimi - (vantaggio.utilizzi_effettuati || 0) : null;
                const esauritoPerUtente = consumato && vantaggio.utilizzi_massimi === 1;

                return (
                  <Card key={vantaggio.id} className={`overflow-hidden relative ${esauritoPerUtente ? 'border-red-500/50 bg-red-900/30' : 'border-slate-700 bg-slate-800'}`}>
                    <CardContent className="p-0">
                      <div className="flex">
                        <div className="relative w-28 h-28 flex-shrink-0">
                          {vantaggio.foto_url ? (
                            <img src={vantaggio.foto_url} alt={vantaggio.titolo} className={`w-full h-full object-cover ${esauritoPerUtente ? 'opacity-40 grayscale' : ''}`} />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center ${esauritoPerUtente ? 'bg-red-900/50' : 'bg-slate-700'}`}>
                              <Gift className={`w-10 h-10 ${esauritoPerUtente ? 'text-red-400' : 'text-slate-500'}`} />
                            </div>
                          )}
                          {esauritoPerUtente && <div className="absolute inset-0 flex items-center justify-center bg-red-900/70"><span className="text-red-300 font-bold text-xs text-center px-2 rotate-[-15deg]">CONSUMATO</span></div>}
                        </div>
                        <div className="flex-1 p-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex flex-wrap gap-1">
                              <Badge className={`${getTipoColor(vantaggio.tipo_vantaggio)} text-white text-[10px]`}>{vantaggio.tipo_vantaggio}</Badge>
                              {vantaggio.categoria_vantaggio && <Badge variant="outline" className="text-slate-300 border-slate-600 text-[10px]">{vantaggio.categoria_vantaggio}</Badge>}
                            </div>
                            <div className="flex items-center gap-1 text-slate-400 text-xs">
                              {creator.logo ? <img src={creator.logo} alt="" className="w-4 h-4 rounded-full object-cover" /> : creator.type === 'consulente' ? <User className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                              <span className="truncate max-w-[80px]">{creator.name}</span>
                            </div>
                          </div>
                          <h3 className="text-white font-bold text-sm mb-1">{vantaggio.titolo}</h3>
                          {vantaggio.valore && <p className="text-[#d4af37] font-bold text-lg">{vantaggio.valore}</p>}
                          {vantaggio.descrizione && <p className="text-slate-400 text-xs mt-1 line-clamp-2">{vantaggio.descrizione}</p>}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {vantaggio.data_scadenza && <span className="text-slate-500 text-[10px] flex items-center gap-1"><Calendar className="w-3 h-3" />Scade: {new Date(vantaggio.data_scadenza).toLocaleDateString('it-IT')}</span>}
                            {utilizziRimasti !== null && <span className="text-slate-500 text-[10px] flex items-center gap-1"><Clock className="w-3 h-3" />{utilizziRimasti} rimasti</span>}
                          </div>
                        </div>
                      </div>
                      <div className="px-3 pb-3">
                        {esauritoPerUtente ? (
                          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-2 flex items-center justify-center gap-2"><X className="w-4 h-4 text-red-400" /><span className="text-red-400 text-sm font-medium">Già utilizzato</span></div>
                        ) : prenotato ? (
                          <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-2 flex items-center justify-center gap-2"><Check className="w-4 h-4 text-green-400" /><span className="text-green-400 text-sm font-medium">Prenotato</span></div>
                        ) : vantaggio.richiede_prenotazione ? (
                          <Button onClick={() => prenotaMutation.mutate(vantaggio.id)} disabled={prenotaMutation.isPending || consumato || isBloccato} className="w-full bg-[#d4af37] hover:bg-[#b8860b] text-slate-900 font-bold disabled:opacity-50" size="sm"><Gift className="w-4 h-4 mr-2" />{isBloccato ? 'Bloccato' : 'Prenota'}</Button>
                        ) : (
                          <div className="bg-amber-500/20 border border-amber-500/50 rounded-lg p-2 text-center"><span className="text-amber-400 text-sm">Mostra il QR in negozio</span></div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Pannello Crea Vantaggio - slide-in interno (versione completa come VantaggiIscritti) */}
      {showCreatePanel && (
        <div className="absolute inset-0 z-10 bg-slate-900 flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-[#d4af37]/20">
            <button onClick={() => { resetForm(); setShowCreatePanel(false); }} className="text-[#d4af37] p-1">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <Gift className="w-5 h-5 text-[#d4af37]" />
            <h1 className="text-white text-lg font-bold flex-1">Crea Nuovo Vantaggio</h1>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-4">
              {/* STEP 1: Selezione Tipo */}
              {!formData.tipo_vantaggio ? (
                <div className="space-y-3">
                  <p className="text-slate-400 text-sm text-center mb-4">Che tipo di vantaggio vuoi offrire?</p>
                  <div className="grid grid-cols-2 gap-3">
                    {TIPI_VANTAGGIO.map(tipo => (
                      <button key={tipo} onClick={() => setFormData({ ...formData, tipo_vantaggio: tipo })} className="bg-slate-700 hover:bg-slate-600 border-2 border-slate-600 hover:border-[#d4af37] rounded-xl p-4 text-left transition-all">
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
                      <span className="text-[#d4af37] font-bold">{formData.tipo_vantaggio}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setFormData({ ...formData, tipo_vantaggio: '' })} className="text-slate-400 hover:text-white h-8 px-2">Cambia</Button>
                  </div>

                  {/* Categoria */}
                  <div>
                    <Label className="text-[#d4af37]">Categoria *</Label>
                    <Select value={formData.categoria_vantaggio} onValueChange={(val) => setFormData({ ...formData, categoria_vantaggio: val })}>
                      <SelectTrigger className="bg-slate-900 border-slate-600 text-white"><SelectValue placeholder="Seleziona categoria..." /></SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700 z-[70]">{CATEGORIES.map(cat => <SelectItem key={cat.id} value={cat.id} className="text-white hover:bg-slate-700">{cat.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  {/* Titolo */}
                  <div>
                    <Label className="text-[#d4af37]">Titolo *</Label>
                    <Input value={formData.titolo} onChange={(e) => setFormData({ ...formData, titolo: e.target.value })} placeholder={
                      formData.tipo_vantaggio === 'Sconto percentuale' ? "Es: Sconto 20% su tutti i servizi" :
                      formData.tipo_vantaggio === 'Sconto fisso' ? "Es: Buono sconto €50" :
                      formData.tipo_vantaggio === 'Consulenza gratuita' ? "Es: Prima consulenza gratuita" :
                      formData.tipo_vantaggio === 'Omaggio' ? "Es: Omaggio di benvenuto" :
                      formData.tipo_vantaggio === 'Prova gratuita' ? "Es: Prova gratuita 7 giorni" :
                      formData.tipo_vantaggio === 'Vantaggio progressivo' ? "Es: Fidelity Card - Sconti crescenti" :
                      "Es: Promozione esclusiva membri"
                    } className="bg-slate-900 border-slate-600 text-white" />
                  </div>

                  {/* Descrizione */}
                  <div>
                    <Label className="text-slate-400">Descrizione</Label>
                    <Textarea value={formData.descrizione} onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })} placeholder="Descrizione dettagliata del vantaggio..." className="bg-slate-900 border-slate-600 text-white" rows={2} />
                  </div>

                  {/* Foto */}
                  <div>
                    <Label className="text-slate-400">Foto (opzionale)</Label>
                    {formData.foto_url ? (
                      <div className="flex items-center gap-3 bg-slate-900 rounded-lg p-3"><img src={formData.foto_url} alt="" className="w-16 h-16 object-cover rounded" /><Button variant="outline" size="sm" onClick={() => setFormData({ ...formData, foto_url: '' })} className="border-red-600 text-red-400"><X className="w-4 h-4 mr-1" />Rimuovi</Button></div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 bg-slate-900 border-2 border-dashed border-slate-700 rounded-lg p-3 cursor-pointer hover:border-[#d4af37]"><input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />{uploadingPhoto ? <div className="animate-spin w-5 h-5 border-2 border-[#d4af37] border-t-transparent rounded-full" /> : <><Upload className="w-5 h-5 text-[#d4af37]" /><span className="text-slate-300 text-sm">Carica foto</span></>}</label>
                    )}
                  </div>

                  {/* CAMPI SPECIFICI PER TIPO */}
                  {formData.tipo_vantaggio === 'Sconto percentuale' && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-3">
                      <Label className="text-green-400">Percentuale di sconto *</Label>
                      <Input value={formData.valore} onChange={(e) => setFormData({ ...formData, valore: e.target.value })} placeholder="Es: 20%, 15% su tutto, 10% sui servizi..." className="bg-slate-900 border-slate-600 text-white" />
                    </div>
                  )}

                  {formData.tipo_vantaggio === 'Sconto fisso' && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-3">
                      <Label className="text-blue-400">Valore dello sconto *</Label>
                      <Input value={formData.valore} onChange={(e) => setFormData({ ...formData, valore: e.target.value })} placeholder="Es: €50, €100, €25 di sconto..." className="bg-slate-900 border-slate-600 text-white" />
                    </div>
                  )}

                  {formData.tipo_vantaggio === 'Consulenza gratuita' && (
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-3">
                      <Label className="text-purple-400">Dettagli consulenza *</Label>
                      <Input value={formData.valore} onChange={(e) => setFormData({ ...formData, valore: e.target.value })} placeholder="Es: 1 consulenza 30 min, 2 ore di consulenza..." className="bg-slate-900 border-slate-600 text-white" />
                    </div>
                  )}

                  {formData.tipo_vantaggio === 'Omaggio' && (
                    <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-4 space-y-3">
                      <Label className="text-pink-400">Cosa regali? *</Label>
                      <Input value={formData.valore} onChange={(e) => setFormData({ ...formData, valore: e.target.value })} placeholder="Es: Gadget aziendale, Prodotto campione, Kit benvenuto..." className="bg-slate-900 border-slate-600 text-white" />
                    </div>
                  )}

                  {formData.tipo_vantaggio === 'Prova gratuita' && (
                    <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 space-y-3">
                      <Label className="text-cyan-400">Durata della prova *</Label>
                      <Input value={formData.valore} onChange={(e) => setFormData({ ...formData, valore: e.target.value })} placeholder="Es: 7 giorni gratis, 1 mese di prova, 14 giorni..." className="bg-slate-900 border-slate-600 text-white" />
                    </div>
                  )}

                  {(formData.tipo_vantaggio === 'Promozione speciale' || formData.tipo_vantaggio === 'Altro') && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-3">
                      <Label className="text-amber-400">Descrivi il vantaggio *</Label>
                      <Input value={formData.valore} onChange={(e) => setFormData({ ...formData, valore: e.target.value })} placeholder="Es: 2x1, Spedizione gratuita, Accesso VIP..." className="bg-slate-900 border-slate-600 text-white" />
                    </div>
                  )}

                  {/* Vantaggio Progressivo */}
                  {formData.tipo_vantaggio === 'Vantaggio progressivo' && (
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-purple-400" />
                        <Label className="text-purple-400 text-base">Step Progressivi</Label>
                      </div>
                      <p className="text-slate-400 text-xs">Ogni scansione QR sblocca lo step successivo. Crea sconti/vantaggi crescenti per fidelizzare!</p>
                      {formData.step_progressivi.map((step, index) => (
                        <div key={index} className="bg-slate-800 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-purple-400 font-bold text-sm">Step {step.step}</span>
                            {formData.step_progressivi.length > 1 && (
                              <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-300" onClick={() => {
                                const newSteps = formData.step_progressivi.filter((_, i) => i !== index);
                                setFormData({ ...formData, step_progressivi: newSteps.map((s, i) => ({ ...s, step: i + 1 })) });
                              }}><Minus className="w-4 h-4" /></Button>
                            )}
                          </div>
                          <Input value={step.valore} onChange={(e) => { const ns = [...formData.step_progressivi]; ns[index].valore = e.target.value; setFormData({ ...formData, step_progressivi: ns }); }} placeholder="Es: 5%, 10%, €20..." className="bg-slate-900 border-slate-600 text-white text-sm" />
                          <Input value={step.descrizione} onChange={(e) => { const ns = [...formData.step_progressivi]; ns[index].descrizione = e.target.value; setFormData({ ...formData, step_progressivi: ns }); }} placeholder="Descrizione (opzionale)" className="bg-slate-900 border-slate-600 text-white text-sm" />
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-500" />
                            <Input type="number" value={step.giorni_validita} onChange={(e) => { const ns = [...formData.step_progressivi]; ns[index].giorni_validita = parseInt(e.target.value) || 30; setFormData({ ...formData, step_progressivi: ns }); }} className="bg-slate-900 border-slate-600 text-white text-sm flex-1" />
                            <span className="text-slate-400 text-xs">giorni per usarlo</span>
                          </div>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" className="w-full border-purple-400 text-purple-400" onClick={() => {
                        setFormData({ ...formData, step_progressivi: [...formData.step_progressivi, { step: formData.step_progressivi.length + 1, valore: '', descrizione: '', giorni_validita: 30 }] });
                      }}><Plus className="w-4 h-4 mr-1" />Aggiungi Step</Button>
                    </div>
                  )}

                  {/* IMPOSTAZIONI COMUNI */}
                  <div className="border-t border-slate-700 pt-4 space-y-4">
                    <p className="text-slate-500 text-xs font-medium">IMPOSTAZIONI</p>
                    {formData.tipo_vantaggio !== 'Vantaggio progressivo' && (
                      <div>
                        <Label className="text-slate-400">Utilizzi massimi</Label>
                        <Input type="number" value={formData.utilizzi_massimi} onChange={(e) => setFormData({ ...formData, utilizzi_massimi: e.target.value })} placeholder="Lascia vuoto per illimitato" className="bg-slate-900 border-slate-600 text-white" />
                      </div>
                    )}
                    <div>
                      <Label className="text-slate-400">Giorni per utilizzare dopo prenotazione</Label>
                      <Input type="number" value={formData.giorni_validita_utilizzo} onChange={(e) => setFormData({ ...formData, giorni_validita_utilizzo: e.target.value })} placeholder="Lascia vuoto per nessun limite" className="bg-slate-900 border-slate-600 text-white" />
                      <p className="text-slate-500 text-xs mt-1">Se scade, il QR non sarà più valido</p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Data scadenza offerta</Label>
                      <Input type="date" value={formData.data_scadenza} onChange={(e) => setFormData({ ...formData, data_scadenza: e.target.value })} className="bg-slate-900 border-slate-600 text-white" />
                    </div>
                    <div className="flex items-center justify-between bg-slate-900 rounded-lg p-3">
                      <div><p className="text-white text-sm font-medium">Richiede prenotazione</p><p className="text-slate-400 text-xs">L'utente deve prenotare prima</p></div>
                      <Switch checked={formData.richiede_prenotazione} onCheckedChange={(c) => setFormData({ ...formData, richiede_prenotazione: c })} />
                    </div>
                  </div>

                  {/* Bottoni */}
                  <div className="flex gap-3 pt-4 pb-8">
                    <Button variant="outline" onClick={() => { resetForm(); setShowCreatePanel(false); }} className="flex-1 border-slate-600 text-slate-400">Annulla</Button>
                    <Button onClick={handleSubmitVantaggio} disabled={createVantaggioMutation.isPending} className="flex-1 bg-[#d4af37] hover:bg-[#b8860b] text-slate-900">{createVantaggioMutation.isPending ? <div className="animate-spin w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full" /> : <><Check className="w-4 h-4 mr-1" />Crea</>}</Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}