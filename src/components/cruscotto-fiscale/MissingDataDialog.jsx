import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

/**
 * Popup che appare quando mancano dati obbligatori sull'azienda per procedere con la sync.
 * Campi controllati: partita_iva, codice_fiscale, userEmail (per registrazione SDI).
 */
export default function MissingDataDialog({ open, onClose, azienda, userEmail, onDataCompleted }) {
  const [fields, setFields] = useState({ partita_iva: '', codice_fiscale: '', email: '' });
  const [saving, setSaving] = useState(false);

  // Calcola quali campi mancano
  const missingFields = [];
  if (!azienda?.partita_iva && !fields.partita_iva) missingFields.push('partita_iva');
  if (!azienda?.codice_fiscale && !fields.codice_fiscale) missingFields.push('codice_fiscale');
  if (!userEmail && !fields.email) missingFields.push('email');

  useEffect(() => {
    if (open) {
      setFields({
        partita_iva: azienda?.partita_iva || '',
        codice_fiscale: azienda?.codice_fiscale || '',
        email: userEmail || ''
      });
    }
  }, [open, azienda, userEmail]);

  const labels = {
    partita_iva: 'Partita IVA',
    codice_fiscale: 'Codice Fiscale',
    email: 'Email'
  };

  const handleSave = async () => {
    // Ricontrolla
    const stillMissing = [];
    if (!fields.partita_iva) stillMissing.push('Partita IVA');
    if (!fields.codice_fiscale) stillMissing.push('Codice Fiscale');
    if (!fields.email) stillMissing.push('Email');
    if (stillMissing.length > 0) return;

    setSaving(true);
    try {
      await onDataCompleted({
        partita_iva: fields.partita_iva,
        codice_fiscale: fields.codice_fiscale,
        email: fields.email
      });
    } finally {
      setSaving(false);
    }
  };

  // Determina quali campi mostrare (solo quelli effettivamente mancanti sull'azienda)
  const showPartitaIva = !azienda?.partita_iva;
  const showCodiceFiscale = !azienda?.codice_fiscale;
  const showEmail = !userEmail;

  const canSave = fields.partita_iva && fields.codice_fiscale && fields.email;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            Dati mancanti
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Per poter sincronizzare le fatture con il Sistema di Interscambio, abbiamo bisogno di completare questi dati. Compila i campi mancanti per procedere.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {showPartitaIva && (
            <div>
              <Label className="text-slate-400 text-xs">Partita IVA *</Label>
              <Input
                value={fields.partita_iva}
                onChange={e => setFields({ ...fields, partita_iva: e.target.value })}
                placeholder="es. 01234567890"
                className="bg-slate-800 border-slate-600 text-white text-sm mt-1"
              />
            </div>
          )}
          {showCodiceFiscale && (
            <div>
              <Label className="text-slate-400 text-xs">Codice Fiscale *</Label>
              <Input
                value={fields.codice_fiscale}
                onChange={e => setFields({ ...fields, codice_fiscale: e.target.value })}
                placeholder="es. 01234567890 o RSSMRA80A01H501U"
                className="bg-slate-800 border-slate-600 text-white text-sm mt-1"
              />
            </div>
          )}
          {showEmail && (
            <div>
              <Label className="text-slate-400 text-xs">Email *</Label>
              <Input
                type="email"
                value={fields.email}
                onChange={e => setFields({ ...fields, email: e.target.value })}
                placeholder="email@azienda.it"
                className="bg-slate-800 border-slate-600 text-white text-sm mt-1"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onClose(false)} className="border-slate-600 text-slate-300 text-xs">
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={!canSave || saving} className="bg-blue-600 hover:bg-blue-700 text-xs">
            {saving ? 'Salvataggio...' : 'Salva e procedi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}