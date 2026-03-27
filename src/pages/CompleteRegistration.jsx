import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle, User, Mail } from 'lucide-react';

export default function CompleteRegistration() {
  const [step, setStep] = useState('loading'); // loading, invalid, form, already_registered

  // Leggi i parametri URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const email = urlParams.get('email');

  // Verifica l'invito tramite backend function (non richiede autenticazione)
  const { data: inviteData, isLoading, error } = useQuery({
    queryKey: ['verify-invite', token],
    queryFn: async () => {
      if (!token || !email) return { valid: false };
      const response = await base44.functions.invoke('verifyInvite', { token, email: email.toLowerCase() });
      return response.data;
    },
    enabled: !!token && !!email,
  });

  const invite = inviteData?.valid ? inviteData.invite : null;
  const alreadyRegistered = inviteData?.already_registered;

  useEffect(() => {
    if (isLoading) {
      setStep('loading');
    } else if (!token || !email || !inviteData?.valid) {
      if (alreadyRegistered) {
        setStep('already_registered');
      } else {
        setStep('invalid');
      }
    } else {
      setStep('form');
    }
  }, [isLoading, token, email, inviteData, alreadyRegistered]);

  const handleComplete = () => {
    base44.auth.redirectToLogin('/');
  };

  // Loading state
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="bg-slate-800 border-slate-700 w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 text-lime-400 animate-spin mx-auto mb-4" />
            <p className="text-white">Verifica invito in corso...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid invite
  if (step === 'invalid') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="bg-slate-800 border-slate-700 w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-white text-xl font-bold mb-2">Link non valido</h2>
            <p className="text-slate-400 mb-4">
              Questo link di invito non è valido o è scaduto. Contatta l'amministratore per ricevere un nuovo invito.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already registered
  if (step === 'already_registered') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="bg-slate-800 border-slate-700 w-full max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-lime-400 mx-auto mb-4" />
            <h2 className="text-white text-xl font-bold mb-2">Già registrato</h2>
            <p className="text-slate-400 mb-4">
              Questo invito è già stato utilizzato. Se hai già un account, puoi accedere direttamente.
            </p>
            <Button 
              onClick={() => window.location.href = '/'}
              className="bg-lime-400 text-slate-900 hover:bg-lime-500"
            >
              Vai al Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Registration info page
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="bg-slate-800 border-slate-700 w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-lime-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-lime-400" />
          </div>
          <CardTitle className="text-white text-xl">Completa la Registrazione</CardTitle>
          <p className="text-slate-400 text-sm mt-2">
            Benvenuto nel Consorzio Imprenditori come {invite?.user_type === 'consulente' ? 'Consulente' : 'Membro'}
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="bg-slate-900 rounded-lg p-3 mb-6 flex items-center gap-3">
            <Mail className="w-5 h-5 text-lime-400" />
            <div>
              <p className="text-slate-400 text-xs">Email invito</p>
              <p className="text-white font-medium">{email}</p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <p className="text-slate-300 text-sm">
              Cliccando il pulsante qui sotto verrai reindirizzato alla pagina di registrazione Base44 dove potrai creare il tuo account e impostare la password.
            </p>
            <p className="text-amber-400 text-sm font-medium">
              ⚠️ Importante: usa esattamente questa email per registrarti: <strong>{email}</strong>
            </p>
          </div>

          <Button
            onClick={handleComplete}
            className="w-full bg-lime-400 text-slate-900 hover:bg-lime-500"
          >
            Completa Registrazione
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}