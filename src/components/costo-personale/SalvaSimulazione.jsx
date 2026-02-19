import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SalvaSimulazione({ tipo, result, profiloLavoratore }) {
  const [etichetta, setEtichetta] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showForm, setShowForm] = useState(false);

  if (!result) return null;

  const handleSave = async () => {
    setSaving(true);
    const record = {
      tipo_simulazione: tipo,
      etichetta: etichetta.trim() || `${result.ccnl || tipo} — ${result.livello || ''} ${new Date().toLocaleDateString('it-IT')}`,
      ccnl: result.ccnl || '',
      livello: result.livello || '',
      tipo_contratto: result.tipo_contratto || '',
      ral: result.ral || result.compenso || 0,
      regione: result.regione || '',
      mensilita: result.mensilita || 0,
      costo_totale_annuo: result.costo_totale_annuo || result.costo_totale_srl || 0,
      costo_mensile: result.costo_mensile_datore || result.costo_mensile_srl || 0,
      netto_annuo: result.netto_annuo || result.netto_collaboratore || 0,
      netto_mensile: result.netto_mensile || 0,
      profilo_lavoratore: profiloLavoratore || {},
      risultato_completo: result,
      anno_normativo: result.anno || 2026,
      note: note.trim(),
    };

    await base44.entities.StoricoSimulazioneCosto.create(record);
    toast.success('Simulazione salvata nello storico');
    setSaving(false);
    setSaved(true);
  };

  if (saved) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
        <Check className="w-4 h-4 text-green-400" />
        <span className="text-green-400 text-sm">Salvata nello storico</span>
      </div>
    );
  }

  if (!showForm) {
    return (
      <Button
        onClick={() => setShowForm(true)}
        variant="outline"
        className="w-full border-lime-500/50 text-lime-400 hover:bg-lime-500/10"
      >
        <Save className="w-4 h-4 mr-2" /> Salva nello storico
      </Button>
    );
  }

  return (
    <div className="space-y-3 p-4 bg-slate-800 border border-slate-700 rounded-lg">
      <p className="text-white text-sm font-semibold">Salva simulazione</p>
      <Input
        placeholder="Nome/etichetta (es. Magazziniere Roma)"
        value={etichetta}
        onChange={e => setEtichetta(e.target.value)}
        className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
      />
      <Input
        placeholder="Note (facoltativo)"
        value={note}
        onChange={e => setNote(e.target.value)}
        className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
      />
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 border-slate-600 text-slate-400 hover:bg-slate-700"
          onClick={() => setShowForm(false)}
        >
          Annulla
        </Button>
        <Button
          className="flex-1 bg-lime-500 hover:bg-lime-600 text-black"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
          Salva
        </Button>
      </div>
    </div>
  );
}