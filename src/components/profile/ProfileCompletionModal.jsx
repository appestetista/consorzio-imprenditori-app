import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from 'lucide-react';
import { createPageUrl } from '@/utils';

const REQUIRED_FIELDS = ['company_name', 'company_email', 'referente', 'cellulare_referente', 'referente_email', 'region'];

export default function ProfileCompletionModal({ user, onProfileComplete }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'admin') return;

    // Verifica campi mancanti
    const hasMissingFields = REQUIRED_FIELDS.some(field => {
      const value = user[field];
      return !value || (typeof value === 'string' && value.trim() === '');
    });

    setOpen(hasMissingFields);
  }, [user]);

  const goToProfile = () => {
    window.location.href = createPageUrl('MyProfile');
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="bg-slate-800 border-slate-700 text-white max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lime-400">
            <AlertTriangle className="w-5 h-5" />
            Completa il tuo profilo
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Per accedere all'app devi prima completare i dati del tuo profilo aziendale.
          </DialogDescription>
        </DialogHeader>

        <Button 
          onClick={goToProfile}
          className="w-full mt-4 bg-lime-400 text-slate-900 hover:bg-lime-500"
        >
          Vai al Profilo
        </Button>
      </DialogContent>
    </Dialog>
  );
}