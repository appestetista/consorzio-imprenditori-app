import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Gift, Tag, Calendar, Check, Clock, Building2, User, Plus, X, Upload, TrendingUp, Minus } from 'lucide-react';
import VantaggiCategoryFilter, { CATEGORIES } from '../vantaggi/VantaggiCategoryFilter';
import VantaggiExamplesCollapsible from '../vantaggi/VantaggiExamplesCollapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';

const TIPI_VANTAGGIO = [
  "Sconto percentuale", "Sconto fisso", "Consulenza gratuita", "Omaggio",
  "Promozione speciale", "Prova gratuita", "Vantaggio progressivo", "Altro"
];

export default function QRCodeVantaggiTab({ user }) {
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({
    tipo_vantaggio: '', categoria_vantaggio: '', titolo: '', descrizione: '', foto_url: '', valore: '',
    is_progressivo: false, step_progressivi: [{ step: 1, valore: '', descrizione: '', giorni_validita: 30 }],
    utilizzi_massimi: '', data_scadenza: '', giorni_validita_utilizzo: '', richiede_prenotazione: true, is_active: true
  });
  const queryClient = useQueryClient();

  const { data: vantaggiAttivi = [], isLoading: loadingVantaggi } = useQuery({
    queryKey: ['vantaggi-attivi'],
    queryFn: async () => {
      const all = await base44.entities.Vantaggio.filter({ is_active: true });
      const oggi = new Date(); oggi.setHours(0, 0, 0, 0);
      return all.filter(v => {
        if (v.data_scadenza && new Date(v.data_scadenza) < oggi) return false;
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
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-vantaggi'],
    queryFn: async () => { const r = await base44.functions.invoke('listMembers'); return r.data?.users || []; },
  });

  const isConsulente = consultants.some(c => c.email === user?.email);

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
    onSuccess: () => { toast.success('Vantaggio prenotato! Mostra il tuo QR in negozio.'); queryClient.invalidateQueries({ queryKey: ['mie-prenotazioni-vantaggi'] }); },
    onError: () => toast.error('Errore durante la prenotazione')
  });

  const createVantaggioMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Vantaggio.create({
        ...data, creator_email: user.email, creator_type: isConsulente ? 'consulente' : 'utente',
        utilizzi_massimi: data.utilizzi_massimi ? parseInt(data.utilizzi_massimi) : null, utilizzi_effettuati: 0,
        giorni_validita_utilizzo: data.giorni_validita_utilizzo ? parseInt(data.giorni_validita_utilizzo) : null,
        is_progressivo: data.tipo_vantaggio === 'Vantaggio progressivo',
        step_progressivi: data.tipo_vantaggio === 'Vantaggio progressivo' ? data.step_progressivi : null
      });
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

  const vantaggi = useMemo(() => {
    const prenotatiIds = miePrenotazioni.map(p => p.vantaggio_id);
    const nonAttivi = tuttiVantaggi.filter(v => prenotatiIds.includes(v.id) && !vantaggiAttivi.some(va => va.id === v.id));
    return [...vantaggiAttivi, ...nonAttivi];
  }, [vantaggiAttivi, tuttiVantaggi, miePrenotazioni]);

  const isPrenotato = (id) => miePrenotazioni.some(p => p.vantaggio_id === id);
  const isConsumato = (id) => tuttePrenotazioni.some(p => p.vantaggio_id === id && p.status === 'utilizzata');
  const isBloccato = miePrenotazioni.length >= 5;

  const getCreatorInfo = (v) => {
    if (v.creator_type === 'consulente') { const c = consultants.find(x => x.email === v.creator_email); return { name: c?.name || 'Consulente', logo: c?.logo_url, type: 'consulente' }; }
    const a = allUsers.find(x => x.email === v.creator_email); return { name: a?.company_name || 'Azienda', logo: a?.logo_url, type: 'azienda' };
  };

  const getTipoColor = (t) => ({ 'Sconto percentuale': 'bg-green-500', 'Sconto fisso': 'bg-blue-500', 'Consulenza gratuita': 'bg-purple-500', 'Omaggio': 'bg-pink-500', 'Promozione speciale': 'bg-amber-500', 'Prova gratuita': 'bg-cyan-500', 'Vantaggio progressivo': 'bg-purple-600' }[t] || 'bg-slate-500');

  const filtered = vantaggi.filter(v => !selectedCategory || v.categoria_vantaggio === selectedCategory);

  return (
    <div>
      <Button onClick={() => setShowCreatePanel(true)} className="w-full bg-[#d4af37] hover:bg-[#b8960b] text-slate-900 font-bold h-11 text-sm rounded-b-none">
        <Plus className="w-5 h-5 mr-2" />Crea nuovo vantaggio
      </Button>
      <VantaggiExamplesCollapsible />

      <div className="bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 border border-emerald-400/40 rounded-xl p-3 mb-4">
        <p className="text-emerald-300 text-xs font-medium">💡 Prenota un vantaggio e mostra il tuo QR code in negozio per utilizzarlo!</p>
      </div>

      <VantaggiCategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} vantaggi={vantaggi} />

      {loadingVantaggi ? (
        <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full mx-auto"></div></div>
      ) : filtered.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700"><CardContent className="p-8 text-center"><Gift className="w-16 h-16 text-slate-600 mx-auto mb-4" /><p className="text-slate-400">{selectedCategory ? `Nessun vantaggio in "${selectedCategory}"` : 'Nessun vantaggio disponibile'}</p>{selectedCategory && <Button variant="ghost" size="sm" className="text-[#d4af37] mt-2" onClick={() => setSelectedCategory(null)}>Mostra tutti</Button>}</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map(v => {
            const creator = getCreatorInfo(v);
            const prenotato = isPrenotato(v.id);
            const consumato = isConsumato(v.id);
            const utilizziRimasti = v.utilizzi_massimi ? v.utilizzi_massimi - (v.utilizzi_effettuati || 0) : null;
            const esauritoPerUtente = consumato && v.utilizzi_massimi === 1;
            return (
              <Card key={v.id} className={`overflow-hidden relative ${esauritoPerUtente ? 'border-red-500/50 bg-red-900/30' : 'border-slate-700 bg-slate-800'}`}>
                <CardContent className="p-0">
                  <div className="flex">
                    <div className="relative w-28 h-28 flex-shrink-0">
                      {v.foto_url ? <img src={v.foto_url} alt={v.titolo} className={`w-full h-full object-cover ${esauritoPerUtente ? 'opacity-40 grayscale' : ''}`} /> : <div className={`w-full h-full flex items-center justify-center ${esauritoPerUtente ? 'bg-red-900/50' : 'bg-slate-700'}`}><Gift className={`w-10 h-10 ${esauritoPerUtente ? 'text-red-400' : 'text-slate-500'}`} /></div>}
                      {esauritoPerUtente && <div className="absolute inset-0 flex items-center justify-center bg-red-900/70"><span className="text-red-300 font-bold text-xs text-center px-2 rotate-[-15deg]">CONSUMATO</span></div>}
                    </div>
                    <div className="flex-1 p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex flex-wrap gap-1">
                          <Badge className={`${getTipoColor(v.tipo_vantaggio)} text-white text-[10px]`}>{v.tipo_vantaggio}</Badge>
                          {v.categoria_vantaggio && <Badge variant="outline" className="text-slate-300 border-slate-600 text-[10px]">{v.categoria_vantaggio}</Badge>}
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 text-xs">
                          {creator.logo ? <img src={creator.logo} alt="" className="w-4 h-4 rounded-full object-cover" /> : creator.type === 'consulente' ? <User className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                          <span className="truncate max-w-[80px]">{creator.name}</span>
                        </div>
                      </div>
                      <h3 className="text-white font-bold text-sm mb-1">{v.titolo}</h3>
                      {v.valore && <p className="text-[#d4af37] font-bold text-lg">{v.valore}</p>}
                      {v.descrizione && <p className="text-slate-400 text-xs mt-1 line-clamp-2">{v.descrizione}</p>}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {v.data_scadenza && <span className="text-slate-500 text-[10px] flex items-center gap-1"><Calendar className="w-3 h-3" />Scade: {new Date(v.data_scadenza).toLocaleDateString('it-IT')}</span>}
                        {utilizziRimasti !== null && <span className="text-slate-500 text-[10px] flex items-center gap-1"><Clock className="w-3 h-3" />{utilizziRimasti} rimasti</span>}
                      </div>
                    </div>
                  </div>
                  <div className="px-3 pb-3">
                    {esauritoPerUtente ? (
                      <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-2 flex items-center justify-center gap-2"><X className="w-4 h-4 text-red-400" /><span className="text-red-400 text-sm font-medium">Già utilizzato</span></div>
                    ) : prenotato ? (
                      <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-2 flex items-center justify-center gap-2"><Check className="w-4 h-4 text-green-400" /><span className="text-green-400 text-sm font-medium">Prenotato</span></div>
                    ) : v.richiede_prenotazione ? (
                      <Button onClick={() => prenotaMutation.mutate(v.id)} disabled={prenotaMutation.isPending || consumato || isBloccato} className="w-full bg-[#d4af37] hover:bg-[#b8960b] text-slate-900 font-bold disabled:opacity-50" size="sm">
                        <Gift className="w-4 h-4 mr-2" />{isBloccato ? 'Bloccato' : 'Prenota'}
                      </Button>
                    ) : (
                      <div className="bg-amber-500/20 border border-amber-500/50 rounded-lg p-2 text-center"><span className="text-amber-400 text-sm">Mostra il QR in negozio</span></div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={showCreatePanel} onOpenChange={(open) => { if (!open && formData.tipo_vantaggio) setFormData({ ...formData, tipo_vantaggio: '' }); else setShowCreatePanel(open); }}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-slate-800 border-slate-700 overflow-y-auto">
          <SheetHeader><SheetTitle className="text-white flex items-center gap-2"><Gift className="w-5 h-5 text-[#d4af37]" />Crea Nuovo Vantaggio</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
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
              <>
                <div className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3">
                  <span className="text-[#d4af37] font-bold">{formData.tipo_vantaggio}</span>
                  <Button variant="ghost" size="sm" onClick={() => setFormData({ ...formData, tipo_vantaggio: '' })} className="text-slate-400 hover:text-white h-8 px-2">Cambia</Button>
                </div>

                <div><Label className="text-[#d4af37]">Categoria *</Label>
                  <Select value={formData.categoria_vantaggio} onValueChange={(val) => setFormData({ ...formData, categoria_vantaggio: val })}>
                    <SelectTrigger className="bg-slate-900 border-slate-600 text-white"><SelectValue placeholder="Seleziona categoria..." /></SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">{CATEGORIES.map(cat => <SelectItem key={cat.id} value={cat.id} className="text-white hover:bg-slate-700">{cat.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div><Label className="text-[#d4af37]">Titolo *</Label><Input value={formData.titolo} onChange={(e) => setFormData({ ...formData, titolo: e.target.value })} placeholder="Titolo del vantaggio" className="bg-slate-900 border-slate-600 text-white" /></div>
                <div><Label className="text-slate-400">Descrizione</Label><Textarea value={formData.descrizione} onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })} placeholder="Descrizione dettagliata..." className="bg-slate-900 border-slate-600 text-white" rows={2} /></div>

                <div><Label className="text-slate-400">Foto (opzionale)</Label>
                  {formData.foto_url ? (
                    <div className="flex items-center gap-3 bg-slate-900 rounded-lg p-3"><img src={formData.foto_url} alt="" className="w-16 h-16 object-cover rounded" /><Button variant="outline" size="sm" onClick={() => setFormData({ ...formData, foto_url: '' })} className="border-red-600 text-red-400"><X className="w-4 h-4 mr-1" />Rimuovi</Button></div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 bg-slate-900 border-2 border-dashed border-slate-700 rounded-lg p-3 cursor-pointer hover:border-[#d4af37]">
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
                      {uploadingPhoto ? <div className="animate-spin w-5 h-5 border-2 border-[#d4af37] border-t-transparent rounded-full" /> : <><Upload className="w-5 h-5 text-[#d4af37]" /><span className="text-slate-300 text-sm">Carica foto</span></>}
                    </label>
                  )}
                </div>

                {formData.tipo_vantaggio !== 'Vantaggio progressivo' && (
                  <div><Label className="text-[#d4af37]">Valore *</Label><Input value={formData.valore} onChange={(e) => setFormData({ ...formData, valore: e.target.value })} placeholder="Es: 20%, €50, 1 consulenza..." className="bg-slate-900 border-slate-600 text-white" /></div>
                )}

                {formData.tipo_vantaggio === 'Vantaggio progressivo' && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-purple-400" /><Label className="text-purple-400 text-base">Step Progressivi</Label></div>
                    {formData.step_progressivi.map((step, index) => (
                      <div key={index} className="bg-slate-800 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between"><span className="text-purple-400 font-bold text-sm">Step {step.step}</span>{formData.step_progressivi.length > 1 && <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400" onClick={() => { const ns = formData.step_progressivi.filter((_, i) => i !== index); setFormData({ ...formData, step_progressivi: ns.map((s, i) => ({ ...s, step: i + 1 })) }); }}><Minus className="w-4 h-4" /></Button>}</div>
                        <Input value={step.valore} onChange={(e) => { const ns = [...formData.step_progressivi]; ns[index].valore = e.target.value; setFormData({ ...formData, step_progressivi: ns }); }} placeholder="Es: 5%, 10%..." className="bg-slate-900 border-slate-600 text-white text-sm" />
                        <Input value={step.descrizione} onChange={(e) => { const ns = [...formData.step_progressivi]; ns[index].descrizione = e.target.value; setFormData({ ...formData, step_progressivi: ns }); }} placeholder="Descrizione (opzionale)" className="bg-slate-900 border-slate-600 text-white text-sm" />
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" className="w-full border-purple-400 text-purple-400" onClick={() => setFormData({ ...formData, step_progressivi: [...formData.step_progressivi, { step: formData.step_progressivi.length + 1, valore: '', descrizione: '', giorni_validita: 30 }] })}><Plus className="w-4 h-4 mr-1" />Aggiungi Step</Button>
                  </div>
                )}

                <div className="border-t border-slate-700 pt-4 space-y-4">
                  <p className="text-slate-500 text-xs font-medium">IMPOSTAZIONI</p>
                  {formData.tipo_vantaggio !== 'Vantaggio progressivo' && <div><Label className="text-slate-400">Utilizzi massimi</Label><Input type="number" value={formData.utilizzi_massimi} onChange={(e) => setFormData({ ...formData, utilizzi_massimi: e.target.value })} placeholder="Vuoto = illimitato" className="bg-slate-900 border-slate-600 text-white" /></div>}
                  <div><Label className="text-slate-400">Giorni per utilizzare dopo prenotazione</Label><Input type="number" value={formData.giorni_validita_utilizzo} onChange={(e) => setFormData({ ...formData, giorni_validita_utilizzo: e.target.value })} placeholder="Vuoto = nessun limite" className="bg-slate-900 border-slate-600 text-white" /></div>
                  <div><Label className="text-slate-400">Data scadenza offerta</Label><Input type="date" value={formData.data_scadenza} onChange={(e) => setFormData({ ...formData, data_scadenza: e.target.value })} className="bg-slate-900 border-slate-600 text-white" /></div>
                  <div className="flex items-center justify-between bg-slate-900 rounded-lg p-3">
                    <div><p className="text-white text-sm font-medium">Richiede prenotazione</p><p className="text-slate-400 text-xs">L'utente deve prenotare prima</p></div>
                    <Switch checked={formData.richiede_prenotazione} onCheckedChange={(c) => setFormData({ ...formData, richiede_prenotazione: c })} />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => { resetForm(); setShowCreatePanel(false); }} className="flex-1 border-slate-600 text-slate-400">Annulla</Button>
                  <Button onClick={() => { if (!formData.tipo_vantaggio || !formData.titolo || !formData.categoria_vantaggio) { toast.error('Compila tipo, categoria e titolo'); return; } createVantaggioMutation.mutate(formData); }} disabled={createVantaggioMutation.isPending} className="flex-1 bg-[#d4af37] hover:bg-[#b8960b] text-slate-900">
                    {createVantaggioMutation.isPending ? <div className="animate-spin w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full" /> : <><Check className="w-4 h-4 mr-1" />Crea</>}
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