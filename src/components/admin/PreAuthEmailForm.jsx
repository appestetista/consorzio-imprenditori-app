import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { UserPlus, Loader2 } from 'lucide-react';

const ZONE_OPTIONS = [
  'PROVINCIA DI PESARO',
  'PROVINCIA DI ANCONA', 
  'PROVINCIA DI MACERATA',
  'PROVINCIA DI FERMO',
  'PROVINCIA DI ASCOLI PICENO'
];

export default function PreAuthEmailForm({ zones = [], onSuccess }) {
  const [email, setEmail] = useState('');
  const [userType, setUserType] = useState('utente');
  const [zona, setZona] = useState('');
  const queryClient = useQueryClient();

  const addEmailMutation = useMutation({
    mutationFn: async (data) => {
      // Crea un PendingInvite senza inviare email
      await base44.entities.PendingInvite.create({
        email: data.email.toLowerCase().trim(),
        user_type: data.userType,
        zona: data.zona || null,
        is_registered: false,
        invited_by: 'pre-auth'
      });
    },
    onSuccess: () => {
      toast.success('Email autorizzata aggiunta con successo');
      setEmail('');
      setZona('');
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error('Errore: ' + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Inserisci una email');
      return;
    }
    addEmailMutation.mutate({ email, userType, zona });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="text-slate-300">Email da autorizzare</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@esempio.com"
          className="bg-slate-900 border-slate-700 text-white mt-1"
        />
      </div>

      <div>
        <Label className="text-slate-300">Tipo Utente</Label>
        <Select value={userType} onValueChange={setUserType}>
          <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="utente">Membro</SelectItem>
            <SelectItem value="consulente">Consulente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-slate-300">Zona Assegnata</Label>
        <Select value={zona} onValueChange={setZona}>
          <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
            <SelectValue placeholder="Seleziona zona (opzionale)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>Nessuna zona</SelectItem>
            {(zones.length > 0 ? zones.map(z => z.name) : ZONE_OPTIONS).map((z) => (
              <SelectItem key={z} value={z}>{z}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button 
        type="submit" 
        disabled={addEmailMutation.isPending}
        className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
      >
        {addEmailMutation.isPending ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <UserPlus className="w-4 h-4 mr-2" />
        )}
        Aggiungi Email Autorizzata
      </Button>
    </form>
  );
}