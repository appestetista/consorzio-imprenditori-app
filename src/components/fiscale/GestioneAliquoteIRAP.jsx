import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, History, Save, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import LogAliquoteViewer from './LogAliquoteViewer';

const REGIONI = ['Marche', 'Emilia-Romagna'];

export default function GestioneAliquoteIRAP({ user }) {
  const [filterRegione, setFilterRegione] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form, setForm] = useState({ anno: 2026, regione: '', categoria: '', aliquota: '', agevolazione: false, descrizione: '' });

  const queryClient = useQueryClient();

  const { data: aliquote = [], isLoading } = useQuery({
    queryKey: ['aliquote-irap-admin'],
    queryFn: () => base44.entities.AliquoteIRAPRegionali.list('-regione'),
  });

  const filtered = aliquote.filter(a => filterRegione === 'all' || a.regione === filterRegione);

  const openCreate = () => {
    setEditingRecord(null);
    setForm({ anno: 2026, regione: '', categoria: '', aliquota: '', agevolazione: false, descrizione: '' });
    setShowForm(true);
  };

  const openEdit = (record) => {
    setEditingRecord(record);
    setForm({
      anno: record.anno,
      regione: record.regione,
      categoria: record.categoria,
      aliquota: String((record.aliquota * 100).toFixed(2)),
      agevolazione: record.agevolazione || false,
      descrizione: record.descrizione || ''
    });
    setShowForm(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const aliquotaDec = parseFloat(form.aliquota) / 100;
      const data = {
        anno: form.anno,
        regione: form.regione,
        categoria: form.categoria.trim(),
        aliquota: aliquotaDec,
        agevolazione: form.agevolazione,
        descrizione: form.descrizione
      };

      if (editingRecord) {
        await base44.entities.AliquoteIRAPRegionali.update(editingRecord.id, data);
        await base44.entities.LogModificaAliquota.create({
          user_email: user.email,
          user_name: user.full_name || user.company_name || user.email,
          tipo_operazione: 'modifica',
          entita: 'AliquoteIRAPRegionali',
          record_id: editingRecord.id,
          regione: form.regione,
          categoria: form.categoria.trim(),
          valore_precedente: editingRecord.aliquota,
          valore_nuovo: aliquotaDec,
          note: `Aliquota ${editingRecord.regione} - ${editingRecord.categoria}: ${(editingRecord.aliquota * 100).toFixed(2)}% → ${form.aliquota}%`
        });
      } else {
        const created = await base44.entities.AliquoteIRAPRegionali.create(data);
        await base44.entities.LogModificaAliquota.create({
          user_email: user.email,
          user_name: user.full_name || user.company_name || user.email,
          tipo_operazione: 'creazione',
          entita: 'AliquoteIRAPRegionali',
          record_id: created.id,
          regione: form.regione,
          categoria: form.categoria.trim(),
          valore_nuovo: aliquotaDec,
          note: `Nuova aliquota ${form.regione} - ${form.categoria.trim()}: ${form.aliquota}%`
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aliquote-irap-admin'] });
      setShowForm(false);
      toast.success(editingRecord ? 'Aliquota aggiornata' : 'Aliquota creata');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (record) => {
      await base44.entities.AliquoteIRAPRegionali.delete(record.id);
      await base44.entities.LogModificaAliquota.create({
        user_email: user.email,
        user_name: user.full_name || user.company_name || user.email,
        tipo_operazione: 'eliminazione',
        entita: 'AliquoteIRAPRegionali',
        record_id: record.id,
        regione: record.regione,
        categoria: record.categoria,
        valore_precedente: record.aliquota,
        note: `Eliminata aliquota ${record.regione} - ${record.categoria}: ${(record.aliquota * 100).toFixed(2)}%`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aliquote-irap-admin'] });
      toast.success('Aliquota eliminata');
    }
  });

  const canSave = form.regione && form.categoria.trim() && form.aliquota && !isNaN(parseFloat(form.aliquota));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-lg">Aliquote IRAP Regionali</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowLog(true)} className="border-slate-600 text-slate-400 hover:text-white">
            <History className="w-4 h-4 mr-1" /> Log
          </Button>
          <Button size="sm" onClick={openCreate} className="bg-[#d4af37] hover:bg-[#c49b2f] text-slate-900">
            <Plus className="w-4 h-4 mr-1" /> Nuova
          </Button>
        </div>
      </div>

      {/* Filtro regione */}
      <Select value={filterRegione} onValueChange={setFilterRegione}>
        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
          <SelectValue placeholder="Filtra per regione" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tutte le regioni</SelectItem>
          {REGIONI.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Lista */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-[#d4af37] border-t-transparent rounded-full mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-slate-400 text-center py-8 text-sm">Nessuna aliquota trovata</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(record => (
            <Card key={record.id} className="bg-slate-800 border-slate-700">
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium text-sm">{record.categoria}</span>
                      {record.agevolazione && <Badge className="bg-green-500/20 text-green-400 border-0 text-[10px]">Agevolata</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-blue-500/20 text-blue-400 border-0 text-[10px]">{record.regione}</Badge>
                      <span className="text-[#d4af37] font-bold text-sm">{(record.aliquota * 100).toFixed(2)}%</span>
                      <span className="text-slate-500 text-[10px]">Anno {record.anno}</span>
                    </div>
                    {record.descrizione && <p className="text-slate-500 text-[10px] mt-1 truncate">{record.descrizione}</p>}
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(record)} className="h-7 w-7 p-0 text-slate-400 hover:text-white">
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm(`Eliminare ${record.categoria} (${record.regione})?`)) deleteMutation.mutate(record); }} className="h-7 w-7 p-0 text-red-400 hover:text-red-300">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Crea/Modifica */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">{editingRecord ? 'Modifica Aliquota' : 'Nuova Aliquota'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-slate-300 text-sm">Regione *</Label>
              <Select value={form.regione} onValueChange={(v) => setForm(f => ({ ...f, regione: v }))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
                  <SelectValue placeholder="Seleziona regione" />
                </SelectTrigger>
                <SelectContent>
                  {REGIONI.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300 text-sm">Categoria IRAP *</Label>
              <Input
                value={form.categoria}
                onChange={(e) => setForm(f => ({ ...f, categoria: e.target.value }))}
                placeholder="es. Impresa Ordinaria, Banche, ..."
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-sm">Aliquota (%) *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.aliquota}
                onChange={(e) => setForm(f => ({ ...f, aliquota: e.target.value }))}
                placeholder="es. 3.90"
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
              {form.aliquota && <p className="text-slate-500 text-[10px] mt-1">= {form.aliquota}% → {(parseFloat(form.aliquota) / 100).toFixed(4)} decimale</p>}
            </div>
            <div>
              <Label className="text-slate-300 text-sm">Anno</Label>
              <Select value={String(form.anno)} onValueChange={(v) => setForm(f => ({ ...f, anno: parseInt(v) }))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300 text-sm">Descrizione (opzionale)</Label>
              <Input
                value={form.descrizione}
                onChange={(e) => setForm(f => ({ ...f, descrizione: e.target.value }))}
                placeholder="Note sulla categoria"
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.agevolazione}
                onChange={(e) => setForm(f => ({ ...f, agevolazione: e.target.checked }))}
                className="rounded"
              />
              <Label className="text-slate-300 text-sm">Aliquota agevolata</Label>
            </div>
            {editingRecord && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-900/20 border border-yellow-600/30">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-yellow-300 text-[10px]">
                  Valore attuale: {(editingRecord.aliquota * 100).toFixed(2)}%. La modifica verrà tracciata nel log.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)} className="border-slate-600 text-slate-400">
              <X className="w-4 h-4 mr-1" /> Annulla
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!canSave || saveMutation.isPending} className="bg-[#d4af37] hover:bg-[#c49b2f] text-slate-900">
              <Save className="w-4 h-4 mr-1" /> {saveMutation.isPending ? 'Salvataggio...' : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Log */}
      <Dialog open={showLog} onOpenChange={setShowLog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <History className="w-5 h-5 text-[#d4af37]" /> Log Modifiche Aliquote
            </DialogTitle>
          </DialogHeader>
          <LogAliquoteViewer />
        </DialogContent>
      </Dialog>
    </div>
  );
}