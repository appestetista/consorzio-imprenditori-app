import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, CheckCircle2, AlertCircle, Building2, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function SyncPanel({ azienda, onSyncComplete, onAziendaCreated, userEmail }) {
  const [syncing, setSyncing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ nome: '', partita_iva: '', codice_fiscale: '' });
  const [creating, setCreating] = useState(false);

  const handleSync = async () => {
    if (!azienda) return;
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('syncFatture', {
        azienda_id: azienda.id,
        fiscal_id: azienda.partita_iva,
        action: 'sync'
      });
      const data = res.data;
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(`Sincronizzazione completata: ${data.new_created} nuove fatture su ${data.total_from_api} totali`);
        onSyncComplete?.();
      }
    } catch (err) {
      toast.error('Errore durante la sincronizzazione: ' + err.message);
    } finally {
      setSyncing(false);
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
      toast.success('Azienda aggiunta');
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
      <CardContent className="p-4">
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
          <Button onClick={handleSync} disabled={syncing} size="sm" className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizzazione...' : 'Sincronizza'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}