import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, CheckCircle2, AlertCircle, Building2, Plus, Calendar, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import MissingDataDialog from './MissingDataDialog';

export default function SyncPanel({ azienda, onSyncComplete, onAziendaCreated, userEmail }) {
  const [syncing, setSyncing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [lastSyncResult, setLastSyncResult] = useState(null);
  const [formData, setFormData] = useState({ nome: '', partita_iva: '', codice_fiscale: '' });
  const [creating, setCreating] = useState(false);
  const [showMissingData, setShowMissingData] = useState(false);

  // Controlla se mancano dati obbligatori sull'azienda
  const checkMissingData = () => {
    if (!azienda) return false;
    return !azienda.partita_iva || !azienda.codice_fiscale || !userEmail;
  };

  const handleSyncClick = () => {
    if (!azienda) return;
    if (checkMissingData()) {
      setShowMissingData(true);
      return;
    }
    handleSync();
  };

  // Callback dal dialog: salva i dati mancanti, aggiorna l'azienda e poi sincronizza
  const handleMissingDataCompleted = async (completedData) => {
    try {
      const updatePayload = {};
      if (!azienda.partita_iva && completedData.partita_iva) updatePayload.partita_iva = completedData.partita_iva;
      if (!azienda.codice_fiscale && completedData.codice_fiscale) updatePayload.codice_fiscale = completedData.codice_fiscale;

      if (Object.keys(updatePayload).length > 0) {
        await base44.entities.AziendaFiscale.update(azienda.id, updatePayload);
        // Aggiorna l'azienda localmente per il sync
        Object.assign(azienda, updatePayload);
      }
      setShowMissingData(false);
      toast.success('Dati aggiornati. Avvio sincronizzazione...');
      handleSync();
    } catch (err) {
      toast.error('Errore aggiornamento dati: ' + err.message);
    }
  };

  const handleSync = async () => {
    if (!azienda) return;
    setSyncing(true);
    setLastSyncResult(null);
    try {
      // Se l'azienda non è ancora registrata su SDI, registrala prima
      if (!azienda.configurazione_openapi) {
        toast.info('Registrazione su SDI in corso...');
        await registerOnSDI(azienda.id, azienda.partita_iva, userEmail);
      }

      const payload = {
        azienda_id: azienda.id,
        fiscal_id: azienda.partita_iva,
        action: 'sync'
      };
      if (dateFrom) payload.date_from = dateFrom;
      if (dateTo) payload.date_to = dateTo;

      const res = await base44.functions.invoke('syncFatture', payload);
      const data = res.data;
      if (data.error) {
        toast.error(data.error);
      } else {
        setLastSyncResult(data);
        toast.success(`Sync: ${data.new_created} nuove fatture, ${data.xml_parsed || 0} XML parsati, ${data.righe_create || 0} righe estratte`);
        onSyncComplete?.();
      }
    } catch (err) {
      toast.error('Errore durante la sincronizzazione: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  // Registra l'azienda su OpenAPI SDI
  const registerOnSDI = async (azId, piva, email) => {
    try {
      const res = await base44.functions.invoke('syncFatture', {
        azienda_id: azId,
        fiscal_id: piva,
        action: 'register',
        email: email
      });
      const data = res.data;
      if (data.error) {
        console.warn('Registrazione SDI non riuscita:', data.error);
        return false;
      }
      if (data.already_registered) {
        console.log('Azienda già registrata su SDI');
      } else {
        console.log('Azienda registrata su SDI con successo');
      }
      return true;
    } catch (err) {
      console.warn('Errore registrazione SDI:', err.message);
      return false;
    }
  };

  const handleCreate = async () => {
    if (!formData.nome || !formData.partita_iva) {
      toast.error('Nome e Partita IVA sono obbligatori');
      return;
    }
    setCreating(true);
    try {
      const newAzienda = await base44.entities.AziendaFiscale.create({
        ...formData,
        user_email: userEmail
      });
      
      // Registra automaticamente su SDI
      toast.info('Registrazione azienda su SDI in corso...');
      const registered = await registerOnSDI(newAzienda.id, formData.partita_iva, userEmail);
      if (registered) {
        toast.success('Azienda aggiunta e registrata su SDI');
      } else {
        toast.success('Azienda aggiunta (registrazione SDI da completare)');
      }
      
      setShowForm(false);
      setFormData({ nome: '', partita_iva: '', codice_fiscale: '' });
      onAziendaCreated?.(newAzienda);
    } catch (err) {
      toast.error('Errore: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  if (!azienda && !showForm) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 border-dashed">
        <CardContent className="p-6 text-center">
          <Building2 className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400 text-sm mb-4">Nessuna azienda configurata. Aggiungi la tua azienda per iniziare a sincronizzare le fatture.</p>
          <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-1" /> Aggiungi Azienda
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (showForm) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4 space-y-3">
          <p className="text-white font-medium text-sm">Nuova Azienda</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-slate-400 text-xs">Ragione Sociale *</Label>
              <Input value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="bg-slate-900 border-slate-600 text-white text-sm mt-1" />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Partita IVA *</Label>
              <Input value={formData.partita_iva} onChange={e => setFormData({...formData, partita_iva: e.target.value})} className="bg-slate-900 border-slate-600 text-white text-sm mt-1" placeholder="IT01234567890" />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Codice Fiscale</Label>
              <Input value={formData.codice_fiscale} onChange={e => setFormData({...formData, codice_fiscale: e.target.value})} className="bg-slate-900 border-slate-600 text-white text-sm mt-1" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowForm(false)} className="border-slate-600 text-slate-300 text-xs">Annulla</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-blue-600 hover:bg-blue-700 text-xs">
              {creating ? 'Salvataggio...' : 'Salva'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-white font-medium text-sm">{azienda.nome}</p>
              <p className="text-slate-500 text-xs">P.IVA: {azienda.partita_iva}</p>
            </div>
            {azienda.ultima_sincronizzazione && (
              <div className="flex items-center gap-1 ml-4">
                <CheckCircle2 className="w-3 h-3 text-green-400" />
                <span className="text-slate-500 text-xs">
                  Ultimo sync: {new Date(azienda.ultima_sincronizzazione).toLocaleString('it-IT')}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowDateFilter(!showDateFilter)} className="border-slate-600 text-slate-300 text-xs">
              <Calendar className="w-3.5 h-3.5 mr-1" />
              Filtri
            </Button>
            <Button onClick={handleSyncClick} disabled={syncing} size="sm" className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizzazione...' : 'Sincronizza'}
            </Button>
          </div>
        </div>

        {/* Filtri data */}
        {showDateFilter && (
          <div className="flex items-end gap-3 pt-2 border-t border-slate-700">
            <div className="flex-1">
              <Label className="text-slate-400 text-xs">Data da</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-slate-900 border-slate-600 text-white text-xs mt-1" />
            </div>
            <div className="flex-1">
              <Label className="text-slate-400 text-xs">Data a</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-slate-900 border-slate-600 text-white text-xs mt-1" />
            </div>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-slate-400 text-xs">
                Reset
              </Button>
            )}
          </div>
        )}

        {/* Risultato ultima sync */}
        {lastSyncResult && (
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700 space-y-1">
            <p className="text-green-400 text-xs font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Sincronizzazione completata
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div><span className="text-slate-500">Da API:</span> <span className="text-white">{lastSyncResult.total_from_api}</span></div>
              <div><span className="text-slate-500">Nuove:</span> <span className="text-blue-400">{lastSyncResult.new_created}</span></div>
              <div><span className="text-slate-500">XML parsati:</span> <span className="text-emerald-400">{lastSyncResult.xml_parsed || 0}</span></div>
              <div><span className="text-slate-500">Righe estratte:</span> <span className="text-amber-400">{lastSyncResult.righe_create || 0}</span></div>
              {lastSyncResult.xml_errors > 0 && (
                <div className="col-span-2"><span className="text-red-400">⚠ XML non parsabili: {lastSyncResult.xml_errors}</span></div>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <MissingDataDialog
        open={showMissingData}
        onClose={setShowMissingData}
        azienda={azienda}
        userEmail={userEmail}
        onDataCompleted={handleMissingDataCompleted}
      />
    </Card>
  );
}