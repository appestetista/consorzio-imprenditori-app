import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CheckCircle, XCircle, AlertTriangle, Trash2, Edit, Plus, RefreshCw, Shield, Database, Clock, FileText } from 'lucide-react';
import { toast } from 'sonner';

const ANNO = 2026;
const fmt = (n) => n?.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00';

const TABELLA_TYPES = [
  { value: 'inps_datore_dipendente', label: 'INPS Datore Dipendente' },
  { value: 'inps_dipendente', label: 'INPS Dipendente' },
  { value: 'inps_gestione_separata_totale', label: 'Gest. Separata Totale' },
  { value: 'inps_gestione_separata_quota_datore', label: 'Gest. Separata Quota Datore' },
  { value: 'inps_gestione_separata_quota_iscritto', label: 'Gest. Separata Quota Iscritto' },
  { value: 'inail_operaio_generico', label: 'INAIL Operaio Generico' },
  { value: 'inail_operaio_qualificato', label: 'INAIL Operaio Qualificato' },
  { value: 'inail_impiegato', label: 'INAIL Impiegato' },
  { value: 'inail_quadro', label: 'INAIL Quadro' },
  { value: 'inail_dirigente', label: 'INAIL Dirigente' },
  { value: 'inail_amministratore', label: 'INAIL Amministratore' },
  { value: 'tfr_divisore', label: 'TFR Divisore' },
  { value: 'fondo_garanzia_tfr', label: 'Fondo Garanzia TFR' },
  { value: 'irpef_scaglione_1', label: 'IRPEF Scaglione 1' },
  { value: 'irpef_scaglione_2', label: 'IRPEF Scaglione 2' },
  { value: 'irpef_scaglione_3', label: 'IRPEF Scaglione 3' },
  { value: 'irpef_soglia_1', label: 'IRPEF Soglia 1' },
  { value: 'irpef_soglia_2', label: 'IRPEF Soglia 2' },
  { value: 'addizionali_media', label: 'Addizionali Media' },
  { value: 'ires', label: 'IRES' },
  { value: 'irap_media', label: 'IRAP Media' },
  { value: 'contributo_td_addizionale', label: 'Contributo TD Addizionale' },
  { value: 'contributo_apprendistato_datore', label: 'Contributo Apprendistato' },
];

const GESTIONI_INPS = ['Artigiani', 'Commercianti', 'GestioneSeparata', 'AmministratoreSRL'];

const VERSIONING_TABLES = [
  { value: 'inps_aliquote', label: 'INPS Aliquote' },
  { value: 'inail_tassi', label: 'INAIL Tassi' },
  { value: 'irpef_scaglioni', label: 'IRPEF Scaglioni' },
  { value: 'agevolazioni_2026', label: 'Agevolazioni 2026' },
];

export default function CostoPersonaleAdmin({ user }) {
  const queryClient = useQueryClient();
  const [editingRecord, setEditingRecord] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editType, setEditType] = useState(null); // 'tabella', 'contributi', 'versioning'

  // Fetch data
  const { data: tabelleContributive = [], isLoading: loadingTabelle } = useQuery({
    queryKey: ['admin-tabelle', ANNO],
    queryFn: () => base44.entities.TabellaContributiva.filter({ anno: ANNO }),
  });

  const { data: contributiINPS = [], isLoading: loadingContributi } = useQuery({
    queryKey: ['admin-contributi', ANNO],
    queryFn: () => base44.entities.ContributiINPS.filter({ anno: ANNO }),
  });

  const { data: versioning = [], isLoading: loadingVersioning } = useQuery({
    queryKey: ['admin-versioning', ANNO],
    queryFn: () => base44.entities.VersioningNormativo.filter({ anno_normativo: ANNO }),
  });

  const { data: logAggiornamenti = [] } = useQuery({
    queryKey: ['admin-log-aggiornamenti', ANNO],
    queryFn: () => base44.entities.LogAggiornamentoTabelle.filter({ anno_normativo: ANNO }),
  });

  // Mutations
  const updateTabellaMutation = useMutation({
    mutationFn: async ({ id, data }) => base44.entities.TabellaContributiva.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tabelle'] });
      setShowEditDialog(false);
      toast.success('Tabella aggiornata');
    },
  });

  const createTabellaMutation = useMutation({
    mutationFn: async (data) => base44.entities.TabellaContributiva.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tabelle'] });
      setShowEditDialog(false);
      toast.success('Record creato');
    },
  });

  const deleteTabellaMutation = useMutation({
    mutationFn: async (id) => base44.entities.TabellaContributiva.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tabelle'] });
      toast.success('Record eliminato');
    },
  });

  const updateContributiMutation = useMutation({
    mutationFn: async ({ id, data }) => base44.entities.ContributiINPS.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contributi'] });
      setShowEditDialog(false);
      toast.success('Contributo aggiornato');
    },
  });

  const createContributiMutation = useMutation({
    mutationFn: async (data) => base44.entities.ContributiINPS.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contributi'] });
      setShowEditDialog(false);
      toast.success('Contributo creato');
    },
  });

  const deleteContributiMutation = useMutation({
    mutationFn: async (id) => base44.entities.ContributiINPS.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contributi'] });
      toast.success('Contributo eliminato');
    },
  });

  const updateVersioningMutation = useMutation({
    mutationFn: async ({ id, data }) => base44.entities.VersioningNormativo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-versioning'] });
      setShowEditDialog(false);
      toast.success('Versioning aggiornato');
    },
  });

  const createVersioningMutation = useMutation({
    mutationFn: async (data) => base44.entities.VersioningNormativo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-versioning'] });
      setShowEditDialog(false);
      toast.success('Versioning creato');
    },
  });

  const deleteVersioningMutation = useMutation({
    mutationFn: async (id) => base44.entities.VersioningNormativo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-versioning'] });
      toast.success('Versioning eliminato');
    },
  });

  // Verifica completezza
  const verificaCompletezza = () => {
    const tipiPresenti = new Set(tabelleContributive.map(t => t.tipo));
    const tipiMancanti = TABELLA_TYPES.filter(t => !tipiPresenti.has(t.value));
    const gestioniPresenti = new Set(contributiINPS.map(c => c.gestione));
    const gestioniMancanti = GESTIONI_INPS.filter(g => !gestioniPresenti.has(g));
    const versioningPresenti = new Set(versioning.filter(v => v.esito === 'successo').map(v => v.tabella));
    const versioningMancanti = VERSIONING_TABLES.filter(v => !versioningPresenti.has(v.value));
    return { tipiMancanti, gestioniMancanti, versioningMancanti };
  };

  const { tipiMancanti, gestioniMancanti, versioningMancanti } = verificaCompletezza();
  const isComplete = tipiMancanti.length === 0 && gestioniMancanti.length === 0 && versioningMancanti.length === 0;

  const openCreate = (type) => {
    setEditType(type);
    if (type === 'tabella') {
      setEditingRecord({ anno: ANNO, tipo: '', valore: '', descrizione: '', fonte_normativa: '', note: '' });
    } else if (type === 'contributi') {
      setEditingRecord({ anno: ANNO, gestione: '', aliquota_percentuale: '', minimale_annuo: '', contributo_fisso_annuo: '', massimale_reddito: '' });
    } else if (type === 'versioning') {
      setEditingRecord({ tabella: '', anno_normativo: ANNO, utente: user?.email || '', utente_nome: user?.full_name || '', fonte: '', esito: 'successo', data_import: new Date().toISOString() });
    }
    setShowEditDialog(true);
  };

  const openEdit = (type, record) => {
    setEditType(type);
    setEditingRecord({ ...record });
    setShowEditDialog(true);
  };

  const handleSave = () => {
    if (editType === 'tabella') {
      const data = { ...editingRecord, valore: parseFloat(editingRecord.valore) };
      if (editingRecord.id) {
        updateTabellaMutation.mutate({ id: editingRecord.id, data });
      } else {
        createTabellaMutation.mutate(data);
      }
    } else if (editType === 'contributi') {
      const data = {
        ...editingRecord,
        aliquota_percentuale: parseFloat(editingRecord.aliquota_percentuale) || 0,
        minimale_annuo: parseFloat(editingRecord.minimale_annuo) || 0,
        contributo_fisso_annuo: parseFloat(editingRecord.contributo_fisso_annuo) || 0,
        massimale_reddito: parseFloat(editingRecord.massimale_reddito) || 0,
      };
      if (editingRecord.id) {
        updateContributiMutation.mutate({ id: editingRecord.id, data });
      } else {
        createContributiMutation.mutate(data);
      }
    } else if (editType === 'versioning') {
      const data = { ...editingRecord };
      if (editingRecord.id) {
        updateVersioningMutation.mutate({ id: editingRecord.id, data });
      } else {
        createVersioningMutation.mutate(data);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Stato Generale */}
      <Card className={`border ${isComplete ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            {isComplete ? (
              <CheckCircle className="w-6 h-6 text-green-400" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-red-400" />
            )}
            <div>
              <h3 className={`font-bold text-sm ${isComplete ? 'text-green-400' : 'text-red-400'}`}>
                {isComplete ? 'Database Normativo Completo' : 'Database Normativo Incompleto'}
              </h3>
              <p className="text-slate-400 text-xs">Anno {ANNO}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-800 rounded-lg p-2 text-center">
              <p className="text-white font-bold text-lg">{tabelleContributive.length}</p>
              <p className="text-slate-400 text-[10px]">Tabelle Contrib.</p>
              {tipiMancanti.length > 0 && <p className="text-red-400 text-[10px]">{tipiMancanti.length} mancanti</p>}
            </div>
            <div className="bg-slate-800 rounded-lg p-2 text-center">
              <p className="text-white font-bold text-lg">{contributiINPS.length}</p>
              <p className="text-slate-400 text-[10px]">Contributi INPS</p>
              {gestioniMancanti.length > 0 && <p className="text-red-400 text-[10px]">{gestioniMancanti.length} mancanti</p>}
            </div>
            <div className="bg-slate-800 rounded-lg p-2 text-center">
              <p className="text-white font-bold text-lg">{versioning.filter(v => v.esito === 'successo').length}</p>
              <p className="text-slate-400 text-[10px]">Versioning OK</p>
              {versioningMancanti.length > 0 && <p className="text-red-400 text-[10px]">{versioningMancanti.length} mancanti</p>}
            </div>
          </div>

          {/* Dettaglio mancanti */}
          {!isComplete && (
            <div className="mt-3 space-y-1">
              {tipiMancanti.length > 0 && (
                <div className="bg-red-500/10 rounded p-2">
                  <p className="text-red-400 text-[10px] font-bold mb-1">Tabelle mancanti:</p>
                  <div className="flex flex-wrap gap-1">
                    {tipiMancanti.map(t => <Badge key={t.value} className="bg-red-500/20 text-red-300 border-0 text-[9px]">{t.label}</Badge>)}
                  </div>
                </div>
              )}
              {gestioniMancanti.length > 0 && (
                <div className="bg-red-500/10 rounded p-2">
                  <p className="text-red-400 text-[10px] font-bold mb-1">Gestioni INPS mancanti:</p>
                  <div className="flex flex-wrap gap-1">
                    {gestioniMancanti.map(g => <Badge key={g} className="bg-red-500/20 text-red-300 border-0 text-[9px]">{g}</Badge>)}
                  </div>
                </div>
              )}
              {versioningMancanti.length > 0 && (
                <div className="bg-red-500/10 rounded p-2">
                  <p className="text-red-400 text-[10px] font-bold mb-1">Versioning mancanti:</p>
                  <div className="flex flex-wrap gap-1">
                    {versioningMancanti.map(v => <Badge key={v.value} className="bg-red-500/20 text-red-300 border-0 text-[9px]">{v.label}</Badge>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="tabelle" className="w-full">
        <TabsList className="w-full bg-slate-800 border border-slate-700 mb-3 grid grid-cols-4 h-auto p-1">
          <TabsTrigger value="tabelle" className="text-[10px] data-[state=active]:bg-violet-500 data-[state=active]:text-white py-1.5">
            Tabelle
          </TabsTrigger>
          <TabsTrigger value="contributi" className="text-[10px] data-[state=active]:bg-violet-500 data-[state=active]:text-white py-1.5">
            INPS
          </TabsTrigger>
          <TabsTrigger value="versioning" className="text-[10px] data-[state=active]:bg-violet-500 data-[state=active]:text-white py-1.5">
            Versioning
          </TabsTrigger>
          <TabsTrigger value="log" className="text-[10px] data-[state=active]:bg-violet-500 data-[state=active]:text-white py-1.5">
            Log
          </TabsTrigger>
        </TabsList>

        {/* TAB TABELLE CONTRIBUTIVE */}
        <TabsContent value="tabelle" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-medium text-sm">TabellaContributiva ({tabelleContributive.length})</h3>
            <Button size="sm" onClick={() => openCreate('tabella')} className="bg-violet-500 hover:bg-violet-600 text-white h-7 text-xs">
              <Plus className="w-3 h-3 mr-1" /> Aggiungi
            </Button>
          </div>
          {loadingTabelle ? (
            <div className="text-center py-4"><div className="animate-spin w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full mx-auto" /></div>
          ) : (
            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
              {tabelleContributive.sort((a, b) => a.tipo.localeCompare(b.tipo)).map(record => {
                const typeInfo = TABELLA_TYPES.find(t => t.value === record.tipo);
                const isPercentage = record.valore < 1 && record.valore > 0;
                return (
                  <Card key={record.id} className="bg-slate-800 border-slate-700">
                    <CardContent className="p-2 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{typeInfo?.label || record.tipo}</p>
                        <p className="text-violet-400 text-xs font-bold">
                          {isPercentage ? `${(record.valore * 100).toFixed(2)}%` : record.valore > 100 ? `€${fmt(record.valore)}` : record.valore}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-white" onClick={() => openEdit('tabella', record)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-300">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-slate-800 border-slate-700">
                            <AlertDialogHeader><AlertDialogTitle className="text-white">Eliminare?</AlertDialogTitle></AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600">Annulla</AlertDialogCancel>
                              <AlertDialogAction className="bg-red-600" onClick={() => deleteTabellaMutation.mutate(record.id)}>Elimina</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB CONTRIBUTI INPS */}
        <TabsContent value="contributi" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-medium text-sm">ContributiINPS ({contributiINPS.length})</h3>
            <Button size="sm" onClick={() => openCreate('contributi')} className="bg-violet-500 hover:bg-violet-600 text-white h-7 text-xs">
              <Plus className="w-3 h-3 mr-1" /> Aggiungi
            </Button>
          </div>
          {loadingContributi ? (
            <div className="text-center py-4"><div className="animate-spin w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full mx-auto" /></div>
          ) : (
            <div className="space-y-2">
              {contributiINPS.map(record => (
                <Card key={record.id} className="bg-slate-800 border-slate-700">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white text-sm font-bold">{record.gestione}</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-xs">
                          <span className="text-slate-400">Aliquota:</span>
                          <span className="text-violet-400 font-bold">{(record.aliquota_percentuale * 100).toFixed(2)}%</span>
                          {record.minimale_annuo > 0 && <><span className="text-slate-400">Minimale:</span><span className="text-white">€{fmt(record.minimale_annuo)}</span></>}
                          {record.contributo_fisso_annuo > 0 && <><span className="text-slate-400">Fisso annuo:</span><span className="text-white">€{fmt(record.contributo_fisso_annuo)}</span></>}
                          {record.massimale_reddito > 0 && <><span className="text-slate-400">Massimale:</span><span className="text-white">€{fmt(record.massimale_reddito)}</span></>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-white" onClick={() => openEdit('contributi', record)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-300"><Trash2 className="w-3 h-3" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-slate-800 border-slate-700">
                            <AlertDialogHeader><AlertDialogTitle className="text-white">Eliminare?</AlertDialogTitle></AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600">Annulla</AlertDialogCancel>
                              <AlertDialogAction className="bg-red-600" onClick={() => deleteContributiMutation.mutate(record.id)}>Elimina</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB VERSIONING */}
        <TabsContent value="versioning" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-medium text-sm">VersioningNormativo ({versioning.length})</h3>
            <Button size="sm" onClick={() => openCreate('versioning')} className="bg-violet-500 hover:bg-violet-600 text-white h-7 text-xs">
              <Plus className="w-3 h-3 mr-1" /> Aggiungi
            </Button>
          </div>
          {loadingVersioning ? (
            <div className="text-center py-4"><div className="animate-spin w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full mx-auto" /></div>
          ) : (
            <div className="space-y-2">
              {versioning.map(record => (
                <Card key={record.id} className={`border ${record.esito === 'successo' ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          {record.esito === 'successo' ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                          <p className="text-white text-sm font-bold">{VERSIONING_TABLES.find(v => v.value === record.tabella)?.label || record.tabella}</p>
                        </div>
                        <p className="text-slate-400 text-xs mt-1">Fonte: {record.fonte}</p>
                        <p className="text-slate-500 text-[10px]">Utente: {record.utente_nome || record.utente}</p>
                        {record.data_import && <p className="text-slate-500 text-[10px]">{new Date(record.data_import).toLocaleDateString('it-IT')}</p>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-white" onClick={() => openEdit('versioning', record)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-300"><Trash2 className="w-3 h-3" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-slate-800 border-slate-700">
                            <AlertDialogHeader><AlertDialogTitle className="text-white">Eliminare?</AlertDialogTitle></AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600">Annulla</AlertDialogCancel>
                              <AlertDialogAction className="bg-red-600" onClick={() => deleteVersioningMutation.mutate(record.id)}>Elimina</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB LOG */}
        <TabsContent value="log" className="space-y-3">
          <h3 className="text-white font-medium text-sm">Log Aggiornamenti ({logAggiornamenti.length})</h3>
          {logAggiornamenti.length === 0 ? (
            <p className="text-slate-400 text-xs text-center py-4">Nessun log di aggiornamento</p>
          ) : (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {logAggiornamenti.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map(log => (
                <Card key={log.id} className="bg-slate-800 border-slate-700">
                  <CardContent className="p-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`text-[9px] border-0 ${log.esito === 'successo' ? 'bg-green-500/20 text-green-400' : log.esito === 'parziale' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                        {log.esito}
                      </Badge>
                      <span className="text-white text-xs font-medium">{log.tipo_tabella}</span>
                    </div>
                    <p className="text-slate-400 text-[10px]">{log.user_name || log.user_email}</p>
                    {log.nome_file && <p className="text-slate-500 text-[10px]">{log.nome_file}</p>}
                    <p className="text-slate-500 text-[10px]">{new Date(log.created_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit/Create Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingRecord?.id ? 'Modifica' : 'Nuovo'} {editType === 'tabella' ? 'Tabella Contributiva' : editType === 'contributi' ? 'Contributo INPS' : 'Versioning'}
            </DialogTitle>
          </DialogHeader>

          {editingRecord && editType === 'tabella' && (
            <div className="space-y-3 mt-2">
              <div>
                <Label className="text-slate-300 text-sm">Tipo *</Label>
                <Select value={editingRecord.tipo} onValueChange={(v) => setEditingRecord({ ...editingRecord, tipo: v })}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TABELLA_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300 text-sm">Valore *</Label>
                <Input type="number" step="any" value={editingRecord.valore} onChange={(e) => setEditingRecord({ ...editingRecord, valore: e.target.value })} className="bg-slate-900 border-slate-700 text-white mt-1" />
              </div>
              <div>
                <Label className="text-slate-300 text-sm">Descrizione *</Label>
                <Input value={editingRecord.descrizione} onChange={(e) => setEditingRecord({ ...editingRecord, descrizione: e.target.value })} className="bg-slate-900 border-slate-700 text-white mt-1" />
              </div>
              <div>
                <Label className="text-slate-300 text-sm">Fonte normativa *</Label>
                <Input value={editingRecord.fonte_normativa} onChange={(e) => setEditingRecord({ ...editingRecord, fonte_normativa: e.target.value })} className="bg-slate-900 border-slate-700 text-white mt-1" />
              </div>
              <div>
                <Label className="text-slate-300 text-sm">Note</Label>
                <Input value={editingRecord.note || ''} onChange={(e) => setEditingRecord({ ...editingRecord, note: e.target.value })} className="bg-slate-900 border-slate-700 text-white mt-1" />
              </div>
            </div>
          )}

          {editingRecord && editType === 'contributi' && (
            <div className="space-y-3 mt-2">
              <div>
                <Label className="text-slate-300 text-sm">Gestione *</Label>
                <Select value={editingRecord.gestione} onValueChange={(v) => setEditingRecord({ ...editingRecord, gestione: v })}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GESTIONI_INPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300 text-sm">Aliquota % (decimale, es. 0.2607) *</Label>
                <Input type="number" step="any" value={editingRecord.aliquota_percentuale} onChange={(e) => setEditingRecord({ ...editingRecord, aliquota_percentuale: e.target.value })} className="bg-slate-900 border-slate-700 text-white mt-1" />
              </div>
              <div>
                <Label className="text-slate-300 text-sm">Minimale annuo (€)</Label>
                <Input type="number" step="any" value={editingRecord.minimale_annuo} onChange={(e) => setEditingRecord({ ...editingRecord, minimale_annuo: e.target.value })} className="bg-slate-900 border-slate-700 text-white mt-1" />
              </div>
              <div>
                <Label className="text-slate-300 text-sm">Contributo fisso annuo (€)</Label>
                <Input type="number" step="any" value={editingRecord.contributo_fisso_annuo} onChange={(e) => setEditingRecord({ ...editingRecord, contributo_fisso_annuo: e.target.value })} className="bg-slate-900 border-slate-700 text-white mt-1" />
              </div>
              <div>
                <Label className="text-slate-300 text-sm">Massimale reddito (€)</Label>
                <Input type="number" step="any" value={editingRecord.massimale_reddito} onChange={(e) => setEditingRecord({ ...editingRecord, massimale_reddito: e.target.value })} className="bg-slate-900 border-slate-700 text-white mt-1" />
              </div>
            </div>
          )}

          {editingRecord && editType === 'versioning' && (
            <div className="space-y-3 mt-2">
              <div>
                <Label className="text-slate-300 text-sm">Tabella *</Label>
                <Select value={editingRecord.tabella} onValueChange={(v) => setEditingRecord({ ...editingRecord, tabella: v })}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VERSIONING_TABLES.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300 text-sm">Fonte *</Label>
                <Input value={editingRecord.fonte} onChange={(e) => setEditingRecord({ ...editingRecord, fonte: e.target.value })} className="bg-slate-900 border-slate-700 text-white mt-1" placeholder="es. Circolare INPS n. XX/2026" />
              </div>
              <div>
                <Label className="text-slate-300 text-sm">Esito *</Label>
                <Select value={editingRecord.esito} onValueChange={(v) => setEditingRecord({ ...editingRecord, esito: v })}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="successo">Successo</SelectItem>
                    <SelectItem value="parziale">Parziale</SelectItem>
                    <SelectItem value="errore">Errore</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="border-slate-600 text-slate-400">Annulla</Button>
            <Button onClick={handleSave} className="bg-violet-500 hover:bg-violet-600 text-white">
              {editingRecord?.id ? 'Salva' : 'Crea'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}