import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Copy, Check, Send, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function InviteUserForm() {
  const [email, setEmail] = useState('');
  const [userType, setUserType] = useState('utente');
  const [copied, setCopied] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState('');
  
  const queryClient = useQueryClient();

  const inviteMutation = useMutation({
    mutationFn: async ({ email, userType }) => {
      // 1. Salva l'invito pendente
      await base44.entities.PendingInvite.create({
        email: email.toLowerCase().trim(),
        user_type: userType,
        invited_by: (await base44.auth.me()).email,
        is_registered: false
      });

      // 2. Invia l'invito via Base44
      await base44.users.inviteUser(email.toLowerCase().trim(), 'user');

      return { email, userType };
    },
    onSuccess: ({ email, userType }) => {
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      setInviteSent(true);
      
      // Genera messaggio WhatsApp
      const tipoUtente = userType === 'consulente' ? 'Consulente' : 'Membro';
      const message = `Ciao! Sei stato invitato come ${tipoUtente} nel Consorzio.\n\nRiceverai un'email all'indirizzo ${email} con il link per completare la registrazione.\n\nControlla anche la cartella spam!`;
      setWhatsappMessage(message);
      
      toast.success('Invito inviato con successo!');
    },
    onError: (error) => {
      console.error('Errore invito:', error);
      toast.error('Errore nell\'invio dell\'invito: ' + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !userType) return;
    inviteMutation.mutate({ email, userType });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openWhatsApp = () => {
    const encodedMessage = encodeURIComponent(whatsappMessage);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const resetForm = () => {
    setEmail('');
    setUserType('utente');
    setInviteSent(false);
    setWhatsappMessage('');
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-lime-400" />
          Invita Nuovo Utente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!inviteSent ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white"
              required
            />
            <Select value={userType} onValueChange={setUserType}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                <SelectValue placeholder="Tipo utente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="utente">👤 Utente (Membro)</SelectItem>
                <SelectItem value="consulente">👔 Consulente</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="submit"
              disabled={inviteMutation.isPending || !email}
              className="w-full bg-lime-400 text-slate-900 hover:bg-lime-500"
            >
              {inviteMutation.isPending ? (
                'Invio in corso...'
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Invia Invito
                </>
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3">
              <p className="text-green-400 text-sm font-medium flex items-center gap-2">
                <Check className="w-4 h-4" />
                Invito inviato a {email}!
              </p>
            </div>
            
            <div className="bg-slate-900 rounded-lg p-3">
              <p className="text-slate-400 text-xs mb-2">Messaggio per WhatsApp:</p>
              <p className="text-white text-sm whitespace-pre-wrap mb-3">{whatsappMessage}</p>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyToClipboard}
                  className="flex-1 border-slate-600 text-white hover:bg-slate-700"
                >
                  {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                  {copied ? 'Copiato!' : 'Copia'}
                </Button>
                <Button
                  size="sm"
                  onClick={openWhatsApp}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <MessageCircle className="w-4 h-4 mr-1" />
                  WhatsApp
                </Button>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={resetForm}
              className="w-full text-slate-400 hover:text-white"
            >
              Invita altro utente
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}