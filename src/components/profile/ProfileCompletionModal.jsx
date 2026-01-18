import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

const REGIONS = [
  "Abruzzo", "Basilicata", "Calabria", "Campania", "Emilia-Romagna",
  "Friuli-Venezia Giulia", "Lazio", "Liguria", "Lombardia", "Marche",
  "Molise", "Piemonte", "Puglia", "Sardegna", "Sicilia", "Toscana",
  "Trentino-Alto Adige", "Umbria", "Valle d'Aosta", "Veneto"
];

const REQUIRED_FIELDS = [
  { key: 'company_name', label: 'Nome Azienda' },
  { key: 'company_email', label: 'Email Azienda' },
  { key: 'referente', label: 'Nome Referente' },
  { key: 'cellulare_referente', label: 'Cellulare Referente' },
  { key: 'referente_email', label: 'Email Referente' },
  { key: 'region', label: 'Regione' }
];

export default function ProfileCompletionModal({ user, onProfileComplete }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [missingFields, setMissingFields] = useState([]);

  useEffect(() => {
    console.log('[ProfileCompletionModal] useEffect triggered with user:', user);
    console.log('[ProfileCompletionModal] user.role:', user?.role);
    
    if (!user) {
      console.log('[ProfileCompletionModal] No user, returning');
      return;
    }
    
    if (user.role === 'admin') {
      console.log('[ProfileCompletionModal] User is admin, returning');
      return;
    }

    // Verifica campi mancanti
    const missing = REQUIRED_FIELDS.filter(field => {
      const value = user[field.key];
      const isMissing = !value || (typeof value === 'string' && value.trim() === '');
      console.log(`[ProfileCompletionModal] Field ${field.key}: value="${value}", isMissing=${isMissing}`);
      return isMissing;
    });

    console.log('[ProfileCompletionModal] Missing fields:', missing.map(f => f.key));
    setMissingFields(missing);
    
    if (missing.length > 0) {
      console.log('[ProfileCompletionModal] Opening modal - missing fields found');
      setOpen(true);
      // Inizializza form con dati esistenti
      const initialData = {};
      REQUIRED_FIELDS.forEach(field => {
        initialData[field.key] = user[field.key] || '';
      });
      setFormData(initialData);
    } else {
      console.log('[ProfileCompletionModal] All fields complete, not opening modal');
      setOpen(false);
    }
  }, [user]);

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const isFormComplete = () => {
    return REQUIRED_FIELDS.every(field => {
      const value = formData[field.key];
      return value && value.trim() !== '';
    });
  };

  const handleSave = async () => {
    if (!isFormComplete()) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    setSaving(true);
    try {
      await base44.auth.updateMe(formData);
      toast.success('Profilo completato!');
      setOpen(false);
      if (onProfileComplete) onProfileComplete();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="bg-slate-800 border-slate-700 text-white max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lime-400">
            <AlertTriangle className="w-5 h-5" />
            Completa il tuo profilo
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Per continuare, compila i seguenti campi obbligatori
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {REQUIRED_FIELDS.map(field => {
            const isMissing = missingFields.some(f => f.key === field.key);
            const isEmpty = !formData[field.key] || formData[field.key].trim() === '';
            
            return (
              <div key={field.key} className="space-y-1">
                <Label className={`text-sm ${isMissing ? 'text-lime-400' : 'text-slate-300'}`}>
                  {field.label} *
                </Label>
                {field.key === 'region' ? (
                  <Select
                    value={formData[field.key] || ''}
                    onValueChange={(value) => handleChange(field.key, value)}
                  >
                    <SelectTrigger className={`bg-slate-700 border-slate-600 text-white ${isEmpty ? 'border-lime-400/50 bg-lime-400/10' : ''}`}>
                      <SelectValue placeholder="Seleziona regione" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {REGIONS.map(region => (
                        <SelectItem key={region} value={region} className="text-white">
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={field.key.includes('email') ? 'email' : field.key.includes('cellulare') ? 'tel' : 'text'}
                    value={formData[field.key] || ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className={`bg-slate-700 border-slate-600 text-white ${isEmpty ? 'border-lime-400/50 bg-lime-400/10' : ''}`}
                    placeholder={`Inserisci ${field.label.toLowerCase()}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <Button 
          onClick={handleSave} 
          disabled={saving || !isFormComplete()}
          className="w-full mt-4 bg-lime-400 text-slate-900 hover:bg-lime-500 disabled:opacity-50"
        >
          {saving ? 'Salvataggio...' : 'Salva e continua'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}