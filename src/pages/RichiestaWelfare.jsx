import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Heart, Send, Loader2, Calculator } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle } from 'lucide-react';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';

export default function RichiestaWelfare() {
  const [user, setUser] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    num_dipendenti: '',
    settore: '',
    benefit_attuali: '',
    budget_mensile: '',
    note: ''
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', user?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: user?.email, is_read: false }),
    enabled: !!user?.email,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      setIsUploading(true);

      const noteFinali = `
RICHIESTA ANALISI WELFARE AZIENDALE

📊 DATI AZIENDA:
- Numero dipendenti: ${form.num_dipendenti || 'Non specificato'}
- Settore: ${form.settore || 'Non specificato'}
- Budget mensile indicativo per dipendente: ${form.budget_mensile || 'Non specificato'}

🎁 BENEFIT ATTUALI:
${form.benefit_attuali || 'Nessuno specificato'}

📝 NOTE AGGIUNTIVE:
${form.note || 'Nessuna'}
      `.trim();

      // Crea la richiesta
      await base44.entities.RichiestaRisparmio.create({
        user_email: user.email,
        user_name: user.company_name || user.full_name,
        user_phone: user.telefono_referente || '',
        categoria: 'Welfare Aziendale',
        note: noteFinali,
        status: 'pending'
      });

      // Notifica admin
      const adminUsers = await base44.entities.User.filter({ role: 'admin' });
      await Promise.all(adminUsers.map(admin =>
        base44.entities.Notification.create({
          user_email: admin.email,
          type: 'message',
          title: 'Nuova richiesta Welfare Aziendale',
          content: `${user.company_name || user.full_name} ha richiesto un'analisi welfare`,
          reference_id: 'Welfare Aziendale'
        })
      ));

      // Invia email
      await base44.integrations.Core.SendEmail({
        to: 'consorzioimprenditori@gmail.com',
        subject: '🔔 Nuova Richiesta Welfare Aziendale',
        body: `
          <h2>Nuova Richiesta di Analisi Welfare Aziendale</h2>
          <p><strong>Azienda:</strong> ${user.company_name || user.full_name}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Telefono:</strong> ${user.telefono_referente || 'Non specificato'}</p>
          <hr/>
          <pre style="white-space: pre-wrap; font-family: inherit;">${noteFinali}</pre>
        `
      });
    },
    onSuccess: () => {
      setSuccess(true);
      setForm({
        num_dipendenti: '',
        settore: '',
        benefit_attuali: '',
        budget_mensile: '',
        note: ''
      });
      queryClient.invalidateQueries({ queryKey: ['mie-richieste-risparmio'] });
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('RisparmioDettaglio') + '?categoria=Welfare%20Aziendale'} className="text-pink-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-white text-xl font-bold">Richiedi Analisi Welfare</h1>
        </div>

        {/* Hero Card */}
        <Card className="bg-gradient-to-br from-pink-500 to-rose-500 border-0 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Calculator className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-white text-xl font-bold">Quanto puoi risparmiare?</h2>
                <p className="text-white/80 text-sm">Analisi gratuita personalizzata</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Success Message */}
        {success && (
          <Alert className="mb-6 bg-green-500/20 border-green-500/30">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-400">
              Richiesta inviata con successo! Ti contatteremo al più presto.
            </AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4 space-y-4">
            <p className="text-slate-400 text-sm">
              Compila il form per ricevere un'analisi gratuita del potenziale risparmio con il welfare aziendale.
            </p>

            {/* Numero dipendenti */}
            <div className="space-y-2">
              <Label className="text-slate-300">Numero dipendenti *</Label>
              <Select 
                value={form.num_dipendenti} 
                onValueChange={(v) => setForm({...form, num_dipendenti: v})}
              >
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                  <SelectValue placeholder="Seleziona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-5">1 - 5 dipendenti</SelectItem>
                  <SelectItem value="6-10">6 - 10 dipendenti</SelectItem>
                  <SelectItem value="11-20">11 - 20 dipendenti</SelectItem>
                  <SelectItem value="21-50">21 - 50 dipendenti</SelectItem>
                  <SelectItem value="oltre-50">Oltre 50 dipendenti</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Settore */}
            <div className="space-y-2">
              <Label className="text-slate-300">Settore aziendale</Label>
              <Input
                placeholder="Es. Manifatturiero, Servizi, Commercio..."
                value={form.settore}
                onChange={(e) => setForm({...form, settore: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            {/* Budget mensile */}
            <div className="space-y-2">
              <Label className="text-slate-300">Budget mensile indicativo per dipendente</Label>
              <Select 
                value={form.budget_mensile} 
                onValueChange={(v) => setForm({...form, budget_mensile: v})}
              >
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                  <SelectValue placeholder="Seleziona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fino-50">Fino a €50/mese</SelectItem>
                  <SelectItem value="50-100">€50 - €100/mese</SelectItem>
                  <SelectItem value="100-200">€100 - €200/mese</SelectItem>
                  <SelectItem value="oltre-200">Oltre €200/mese</SelectItem>
                  <SelectItem value="da-valutare">Da valutare insieme</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Benefit attuali */}
            <div className="space-y-2">
              <Label className="text-slate-300">Benefit già attivi (se presenti)</Label>
              <Textarea
                placeholder="Es. Buoni pasto, assicurazione sanitaria, convenzioni..."
                value={form.benefit_attuali}
                onChange={(e) => setForm({...form, benefit_attuali: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
                rows={2}
              />
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label className="text-slate-300">Note aggiuntive</Label>
              <Textarea
                placeholder="Altre informazioni utili o domande specifiche..."
                value={form.note}
                onChange={(e) => setForm({...form, note: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
                rows={3}
              />
            </div>

            {/* Submit */}
            <Button
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold"
              onClick={() => submitMutation.mutate()}
              disabled={isUploading || submitMutation.isPending || !form.num_dipendenti}
            >
              {isUploading || submitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Invio in corso...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Richiedi Analisi Gratuita
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>

      <BottomNav currentPage="RisparmioEnergetico" unreadMessages={messages.length} />
    </div>
  );
}