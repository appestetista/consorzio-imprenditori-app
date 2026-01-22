import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Shield, Upload, FileText, AlertTriangle, CheckCircle, Clock, Plus, X, ChevronDown, ChevronUp, Trash2, Calendar, Sparkles, Loader2, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const CATEGORIE = [
  "Sicurezza sul lavoro",
  "Privacy e GDPR", 
  "Ambientale",
  "Fiscale",
  "Igiene e Sanità",
  "Antincendio",
  "Formazione obbligatoria",
  "Altro"
];

const STATO_COLORS = {
  conforme: '#22c55e',
  da_migliorare: '#f97316',
  non_conforme: '#ef4444',
  non_verificato: '#6b7280'
};

const STATO_LABELS = {
  conforme: 'Conforme',
  da_migliorare: 'Da migliorare',
  non_conforme: 'Non conforme',
  non_verificato: 'Non verificato'
};

export default function ComplianceAziendale() {
  const [user, setUser] = useState(null);
  const [effectiveUser, setEffectiveUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddNorm, setShowAddNorm] = useState(false);
  const [expandedNorm, setExpandedNorm] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState('all');
  const [newNorm, setNewNorm] = useState({
    nome: '',
    descrizione: '',
    categoria: 'Sicurezza sul lavoro',
    data_scadenza: '',
    frequenza_rinnovo_mesi: 12,
    sanzione_prevista: '',
    priorita: 'media',
    stato: 'non_verificato',
    documenti_urls: [],
    documenti_nomi: []
  });
  const [showAutoGenerate, setShowAutoGenerate] = useState(false);
  const [generatingNorms, setGeneratingNorms] = useState(false);
  const [activityType, setActivityType] = useState('');
  const [employeesCount, setEmployeesCount] = useState('');
  const { impersonation, appMode } = useImpersonation();
  const queryClient = useQueryClient();

  useEffect(() => {
    window.scrollTo(0, 0);
    const loadUser = async () => {
      setLoading(true);
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        if (appMode === 'user-preview' && impersonation.previewUserId) {
          const users = await base44.entities.User.filter({ id: impersonation.previewUserId });
          setEffectiveUser(users[0] || currentUser);
        } else {
          setEffectiveUser(currentUser);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [appMode, impersonation.previewUserId]);

  const { data: norms = [], isLoading: loadingNorms } = useQuery({
    queryKey: ['compliance-norms', effectiveUser?.email],
    queryFn: () => base44.entities.ComplianceNorm.filter({ user_email: effectiveUser?.email }),
    enabled: !!effectiveUser?.email,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', effectiveUser?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: effectiveUser?.email, is_read: false }),
    enabled: !!effectiveUser?.email,
  });

  const createNormMutation = useMutation({
    mutationFn: (data) => base44.entities.ComplianceNorm.create({
      ...data,
      user_email: effectiveUser?.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-norms'] });
      setShowAddNorm(false);
      setNewNorm({
        nome: '',
        descrizione: '',
        categoria: 'Sicurezza sul lavoro',
        data_scadenza: '',
        frequenza_rinnovo_mesi: 12,
        sanzione_prevista: '',
        priorita: 'media',
        stato: 'non_verificato',
        documenti_urls: [],
        documenti_nomi: []
      });
    }
  });

  const updateNormMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ComplianceNorm.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-norms'] });
    }
  });

  const deleteNormMutation = useMutation({
    mutationFn: (id) => base44.entities.ComplianceNorm.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-norms'] });
      setExpandedNorm(null);
    }
  });

  // Genera automaticamente le normative tramite AI
  const handleAutoGenerate = async () => {
    if (!activityType.trim()) return;
    
    setGeneratingNorms(true);
    try {
      const prompt = `Sei un esperto di compliance aziendale italiana. 
Genera una lista di adempimenti obbligatori per legge per un'azienda con queste caratteristiche:
- Tipo di attività: ${activityType}
- Numero dipendenti: ${employeesCount || 'non specificato'}

Per ogni adempimento obbligatorio, fornisci:
1. nome: Nome dell'adempimento (es: "DVR - Documento Valutazione Rischi")
2. descrizione: Breve descrizione di cosa richiede
3. categoria: Una tra: "Sicurezza sul lavoro", "Privacy e GDPR", "Ambientale", "Fiscale", "Igiene e Sanità", "Antincendio", "Formazione obbligatoria", "Altro"
4. frequenza_rinnovo_mesi: Ogni quanti mesi va rinnovato/aggiornato (numero)
5. sanzione_prevista: Descrizione della sanzione in caso di mancato rispetto
6. priorita: "alta", "media" o "bassa"

Includi SOLO adempimenti realmente obbligatori per legge italiana per questo tipo di attività.
NON includere adempimenti facoltativi o raccomandati.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            adempimenti: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nome: { type: "string" },
                  descrizione: { type: "string" },
                  categoria: { type: "string" },
                  frequenza_rinnovo_mesi: { type: "number" },
                  sanzione_prevista: { type: "string" },
                  priorita: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result?.adempimenti && result.adempimenti.length > 0) {
        // Crea le normative nel database
        for (const adempimento of result.adempimenti) {
          await base44.entities.ComplianceNorm.create({
            user_email: effectiveUser?.email,
            nome: adempimento.nome,
            descrizione: adempimento.descrizione,
            categoria: adempimento.categoria || 'Altro',
            frequenza_rinnovo_mesi: adempimento.frequenza_rinnovo_mesi || 12,
            sanzione_prevista: adempimento.sanzione_prevista,
            priorita: adempimento.priorita || 'media',
            stato: 'non_verificato',
            documenti_urls: [],
            documenti_nomi: []
          });
        }
        
        queryClient.invalidateQueries({ queryKey: ['compliance-norms'] });
        setShowAutoGenerate(false);
        setActivityType('');
      }
    } catch (error) {
      console.error('Errore generazione:', error);
      alert('Errore nella generazione. Riprova.');
    } finally {
      setGeneratingNorms(false);
    }
  };

  const handleDocumentUpload = async (e, normId = null) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      if (normId) {
        // Aggiorna norma esistente
        const norm = norms.find(n => n.id === normId);
        const newUrls = [...(norm.documenti_urls || []), file_url];
        const newNames = [...(norm.documenti_nomi || []), file.name];
        await updateNormMutation.mutateAsync({ 
          id: normId, 
          data: { documenti_urls: newUrls, documenti_nomi: newNames }
        });
      } else {
        // Nuova norma
        setNewNorm({
          ...newNorm,
          documenti_urls: [...newNorm.documenti_urls, file_url],
          documenti_nomi: [...newNorm.documenti_nomi, file.name]
        });
      }
    } catch (error) {
      console.error('Errore upload:', error);
    } finally {
      setUploadingDoc(false);
    }
  };

  const removeDocument = (index, normId = null) => {
    if (normId) {
      const norm = norms.find(n => n.id === normId);
      const newUrls = norm.documenti_urls.filter((_, i) => i !== index);
      const newNames = norm.documenti_nomi.filter((_, i) => i !== index);
      updateNormMutation.mutate({ id: normId, data: { documenti_urls: newUrls, documenti_nomi: newNames }});
    } else {
      setNewNorm({
        ...newNorm,
        documenti_urls: newNorm.documenti_urls.filter((_, i) => i !== index),
        documenti_nomi: newNorm.documenti_nomi.filter((_, i) => i !== index)
      });
    }
  };

  // Calcola statistiche per il grafico a torta
  const stats = {
    conforme: norms.filter(n => n.stato === 'conforme').length,
    da_migliorare: norms.filter(n => n.stato === 'da_migliorare').length,
    non_conforme: norms.filter(n => n.stato === 'non_conforme').length,
    non_verificato: norms.filter(n => n.stato === 'non_verificato').length,
  };

  const pieData = [
    { name: 'Conforme', value: stats.conforme, color: STATO_COLORS.conforme },
    { name: 'Da migliorare', value: stats.da_migliorare, color: STATO_COLORS.da_migliorare },
    { name: 'Non conforme', value: stats.non_conforme, color: STATO_COLORS.non_conforme },
    { name: 'Non verificato', value: stats.non_verificato, color: STATO_COLORS.non_verificato },
  ].filter(d => d.value > 0);

  // Calcola posizione nella barra temporale
  const getTimelinePosition = (norm) => {
    if (!norm.data_scadenza) return null;
    
    const oggi = new Date();
    const scadenza = new Date(norm.data_scadenza);
    const frequenzaGiorni = (norm.frequenza_rinnovo_mesi || 12) * 30;
    const inizioPeriodo = new Date(scadenza);
    inizioPeriodo.setDate(inizioPeriodo.getDate() - frequenzaGiorni);
    
    const totale = scadenza - inizioPeriodo;
    const trascorso = oggi - inizioPeriodo;
    const percentuale = Math.min(Math.max((trascorso / totale) * 100, 0), 100);
    
    // Determina colore: verde (0-60%), arancione (60-85%), rosso (85-100%)
    let color = 'green';
    if (percentuale > 85) color = 'red';
    else if (percentuale > 60) color = 'orange';
    
    const giorniMancanti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
    
    return { percentuale, color, giorniMancanti, scadenza };
  };

  const filteredNorms = selectedCategoria === 'all' 
    ? norms 
    : norms.filter(n => n.categoria === selectedCategoria);

  if (loading || !effectiveUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={effectiveUser || user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Home')} className="text-lime-400">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-lime-400 text-xl font-bold">Compliance Aziendale</h1>
          </div>
          {norms.length > 0 && (
            <Button 
              onClick={() => setShowAutoGenerate(true)}
              className="bg-blue-500 text-white hover:bg-blue-600"
              size="sm"
            >
              <Sparkles className="w-4 h-4 mr-1" /> Genera
            </Button>
          )}
        </div>

        {/* Banner Genera Automaticamente */}
        {norms.length === 0 && (
          <Card 
            className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/30 mb-6 cursor-pointer hover:border-blue-400/50 transition-colors"
            onClick={() => setShowAutoGenerate(true)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/30 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold">Genera Automaticamente</h3>
                  <p className="text-slate-400 text-sm">Inserisci il tipo di attività e generiamo gli adempimenti obbligatori</p>
                </div>
                <ChevronDown className="w-5 h-5 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Grafico a torta */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardContent className="p-4">
            <h3 className="text-white font-semibold mb-4 text-center">Stato Conformità</h3>
            
            {norms.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="w-16 h-16 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Nessuna normativa inserita</p>
                <p className="text-slate-500 text-sm">Usa "Genera Automaticamente" o aggiungi manualmente</p>
              </div>
            ) : (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Legenda */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-slate-300 text-sm">Conforme ({stats.conforme})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-slate-300 text-sm">Da migliorare ({stats.da_migliorare})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-slate-300 text-sm">Non conforme ({stats.non_conforme})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                    <span className="text-slate-300 text-sm">Non verificato ({stats.non_verificato})</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Filtro categoria */}
        {norms.length > 0 && (
          <div className="mb-4 overflow-x-auto pb-2">
            <div className="flex gap-2 min-w-max">
              <Button
                variant={selectedCategoria === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategoria('all')}
                className={selectedCategoria === 'all' ? 'bg-lime-400 text-slate-900' : 'border-slate-600 text-slate-300'}
              >
                Tutte
              </Button>
              {CATEGORIE.map((cat) => {
                const count = norms.filter(n => n.categoria === cat).length;
                if (count === 0) return null;
                return (
                  <Button
                    key={cat}
                    variant={selectedCategoria === cat ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategoria(cat)}
                    className={selectedCategoria === cat ? 'bg-lime-400 text-slate-900' : 'border-slate-600 text-slate-300'}
                  >
                    {cat} ({count})
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Lista normative */}
        <div className="space-y-3">
          {filteredNorms.map((norm) => {
            const timeline = getTimelinePosition(norm);
            const isExpanded = expandedNorm === norm.id;
            
            return (
              <Card key={norm.id} className="bg-slate-800 border-slate-700 overflow-hidden">
                <CardContent className="p-0">
                  {/* Header norma */}
                  <button
                    onClick={() => setExpandedNorm(isExpanded ? null : norm.id)}
                    className="w-full p-4 flex items-start gap-3 text-left"
                  >
                    {/* Pallino stato */}
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                      style={{ backgroundColor: STATO_COLORS[norm.stato] }}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-white font-medium truncate">{norm.nome}</h4>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-slate-400 text-sm">{norm.categoria}</p>
                      <p className="text-xs mt-1" style={{ color: STATO_COLORS[norm.stato] }}>
                        {STATO_LABELS[norm.stato]}
                      </p>
                    </div>
                  </button>

                  {/* Barra temporale scadenza */}
                  {timeline && (
                    <div className="px-4 pb-3">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Inizio periodo</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Scadenza: {new Date(timeline.scadenza).toLocaleDateString('it-IT')}
                        </span>
                      </div>
                      <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden">
                        {/* Barra colorata gradiente */}
                        <div 
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{
                            width: `${timeline.percentuale}%`,
                            background: timeline.color === 'green' 
                              ? 'linear-gradient(90deg, #22c55e, #22c55e)'
                              : timeline.color === 'orange'
                                ? 'linear-gradient(90deg, #22c55e, #f97316)'
                                : 'linear-gradient(90deg, #22c55e, #f97316, #ef4444)'
                          }}
                        />
                        {/* Cursore posizione attuale */}
                        <div 
                          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-slate-900 shadow-lg"
                          style={{ left: `calc(${timeline.percentuale}% - 8px)` }}
                        />
                      </div>
                      <p className={`text-xs mt-1 text-right ${
                        timeline.color === 'red' ? 'text-red-400' :
                        timeline.color === 'orange' ? 'text-orange-400' : 'text-green-400'
                      }`}>
                        {timeline.giorniMancanti > 0 
                          ? `${timeline.giorniMancanti} giorni alla scadenza`
                          : timeline.giorniMancanti === 0 
                            ? 'Scade oggi!'
                            : `Scaduto da ${Math.abs(timeline.giorniMancanti)} giorni`
                        }
                      </p>
                    </div>
                  )}

                  {/* Dettagli espansi */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-slate-700 pt-4 space-y-4">
                      {norm.descrizione && (
                        <div>
                          <p className="text-slate-400 text-xs mb-1">Descrizione</p>
                          <p className="text-white text-sm">{norm.descrizione}</p>
                        </div>
                      )}

                      {norm.sanzione_prevista && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                            <p className="text-red-400 text-xs font-medium">Sanzione prevista</p>
                          </div>
                          <p className="text-red-300 text-sm">{norm.sanzione_prevista}</p>
                        </div>
                      )}

                      {/* Modifica stato */}
                      <div>
                        <Label className="text-slate-400 text-xs">Stato conformità</Label>
                        <Select
                          value={norm.stato}
                          onValueChange={(value) => updateNormMutation.mutate({ id: norm.id, data: { stato: value }})}
                        >
                          <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="conforme">✅ Conforme</SelectItem>
                            <SelectItem value="da_migliorare">🟠 Da migliorare</SelectItem>
                            <SelectItem value="non_conforme">🔴 Non conforme</SelectItem>
                            <SelectItem value="non_verificato">⚪ Non verificato</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Documenti */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-slate-400 text-xs">Documenti allegati</Label>
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => handleDocumentUpload(e, norm.id)}
                              disabled={uploadingDoc}
                            />
                            <span className="text-lime-400 text-xs flex items-center gap-1 hover:underline">
                              <Upload className="w-3 h-3" />
                              {uploadingDoc ? 'Caricamento...' : 'Carica documento'}
                            </span>
                          </label>
                        </div>
                        
                        {norm.documenti_urls?.length > 0 ? (
                          <div className="space-y-2">
                            {norm.documenti_urls.map((url, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-slate-900 rounded-lg p-2">
                                <a 
                                  href={url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-lime-400 text-sm flex items-center gap-2 truncate hover:underline"
                                >
                                  <FileText className="w-4 h-4 flex-shrink-0" />
                                  <span className="truncate">{norm.documenti_nomi?.[idx] || `Documento ${idx + 1}`}</span>
                                </a>
                                <button
                                  onClick={() => removeDocument(idx, norm.id)}
                                  className="text-red-400 hover:text-red-300 p-1"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-500 text-sm">Nessun documento caricato</p>
                        )}
                      </div>

                      {/* Azioni */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Eliminare questa normativa?')) {
                              deleteNormMutation.mutate(norm.id);
                            }
                          }}
                          className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Elimina
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      {/* Dialog aggiungi norma */}
      <Dialog open={showAddNorm} onOpenChange={setShowAddNorm}>
        <DialogContent className="bg-slate-800 border-slate-700 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Aggiungi Normativa</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-slate-300">Nome normativa *</Label>
              <Input
                value={newNorm.nome}
                onChange={(e) => setNewNorm({ ...newNorm, nome: e.target.value })}
                className="bg-slate-900 border-slate-700 text-white mt-1"
                placeholder="Es: DVR - Documento Valutazione Rischi"
              />
            </div>

            <div>
              <Label className="text-slate-300">Categoria *</Label>
              <Select
                value={newNorm.categoria}
                onValueChange={(value) => setNewNorm({ ...newNorm, categoria: value })}
              >
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIE.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-300">Descrizione</Label>
              <Textarea
                value={newNorm.descrizione}
                onChange={(e) => setNewNorm({ ...newNorm, descrizione: e.target.value })}
                className="bg-slate-900 border-slate-700 text-white mt-1"
                placeholder="Descrizione della normativa e requisiti..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Data scadenza</Label>
                <Input
                  type="date"
                  value={newNorm.data_scadenza}
                  onChange={(e) => setNewNorm({ ...newNorm, data_scadenza: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-300">Frequenza rinnovo (mesi)</Label>
                <Input
                  type="number"
                  value={newNorm.frequenza_rinnovo_mesi}
                  onChange={(e) => setNewNorm({ ...newNorm, frequenza_rinnovo_mesi: parseInt(e.target.value) || 12 })}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-300">Sanzione in caso di non conformità</Label>
              <Textarea
                value={newNorm.sanzione_prevista}
                onChange={(e) => setNewNorm({ ...newNorm, sanzione_prevista: e.target.value })}
                className="bg-slate-900 border-slate-700 text-white mt-1"
                placeholder="Es: Multa da €2.000 a €6.600..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Priorità</Label>
                <Select
                  value={newNorm.priorita}
                  onValueChange={(value) => setNewNorm({ ...newNorm, priorita: value })}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">🔴 Alta</SelectItem>
                    <SelectItem value="media">🟠 Media</SelectItem>
                    <SelectItem value="bassa">🟢 Bassa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Stato attuale</Label>
                <Select
                  value={newNorm.stato}
                  onValueChange={(value) => setNewNorm({ ...newNorm, stato: value })}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conforme">✅ Conforme</SelectItem>
                    <SelectItem value="da_migliorare">🟠 Da migliorare</SelectItem>
                    <SelectItem value="non_conforme">🔴 Non conforme</SelectItem>
                    <SelectItem value="non_verificato">⚪ Non verificato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Upload documenti */}
            <div>
              <Label className="text-slate-300">Documenti</Label>
              <div className="mt-2 space-y-2">
                {newNorm.documenti_urls.map((url, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-900 rounded-lg p-2">
                    <span className="text-lime-400 text-sm truncate flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {newNorm.documenti_nomi[idx]}
                    </span>
                    <button
                      onClick={() => removeDocument(idx)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <label className="flex items-center justify-center gap-2 bg-slate-900 border-2 border-dashed border-slate-700 rounded-lg p-4 cursor-pointer hover:border-lime-400 transition-colors">
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => handleDocumentUpload(e)}
                    disabled={uploadingDoc}
                  />
                  <Upload className="w-5 h-5 text-lime-400" />
                  <span className="text-slate-300">
                    {uploadingDoc ? 'Caricamento...' : 'Carica documento'}
                  </span>
                </label>
              </div>
            </div>

            <Button
              onClick={() => createNormMutation.mutate(newNorm)}
              disabled={!newNorm.nome || createNormMutation.isPending}
              className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
            >
              {createNormMutation.isPending ? 'Salvataggio...' : 'Aggiungi Normativa'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Genera Automaticamente */}
      <Dialog open={showAutoGenerate} onOpenChange={setShowAutoGenerate}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              Genera Adempimenti Automaticamente
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-blue-300 text-sm">
                Inserisci il tipo di attività della tua azienda e genereremo automaticamente tutti gli adempimenti obbligatori per legge che devi rispettare.
              </p>
            </div>

            <div>
              <Label className="text-slate-300">Tipo di attività *</Label>
              <Textarea
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white mt-1"
                placeholder="Es: Ristorante con 10 dipendenti, Officina meccanica, Negozio al dettaglio, Studio di consulenza, Azienda manifatturiera metalmeccanica..."
                rows={3}
              />
            </div>

            <div>
              <Label className="text-slate-300">Numero dipendenti</Label>
              <Input
                type="number"
                value={employeesCount}
                onChange={(e) => setEmployeesCount(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white mt-1"
                placeholder="Es: 5, 15, 50..."
                min="0"
              />
            </div>

            <Button
              onClick={handleAutoGenerate}
              disabled={!activityType.trim() || generatingNorms}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              {generatingNorms ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generazione in corso...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Genera Adempimenti
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav currentPage="ComplianceAziendale" unreadMessages={messages.length} />
    </div>
  );
}