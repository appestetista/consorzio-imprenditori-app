import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function InviteUserForm({ onSuccess }) {
  const [email, setEmail] = useState('');
  
  const queryClient = useQueryClient();

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const emailLower = email.toLowerCase().trim();

      await base44.functions.invoke('sendInviteEmail', {
        email: emailLower,
        userType: 'utente',
        zona: null,
        consultantCategory: null,
        assignedSections: []
      });

      return { email: emailLower };
    },
    onSuccess: ({ email }) => {
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      queryClient.invalidateQueries({ queryKey: ['all-members'] });
      toast.success(`Invito inviato a ${email}!`);
      setEmail('');
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Errore invito:', error);
      toast.error('Errore nell\'invio dell\'invito: ' + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    inviteMutation.mutate();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label className="text-slate-400 text-xs">Email *</Label>
          <Input
            type="email"
            placeholder="email@esempio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-slate-900 border-slate-700 text-white mt-1"
            required
          />
        </div>

        <Button
          type="submit"
          disabled={inviteMutation.isPending || !email}
          className="w-full bg-lime-400 text-slate-900 hover:bg-lime-500"
        >
          {inviteMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Invio in corso...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Invia Invito
            </>
          )}
        </Button>

        <p className="text-slate-500 text-xs text-center">
          L'email verrà inviata da app.consorzio.imprenditori@gmail.com
        </p>
      </form>
    </div>
  );
}