import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, QrCode, Search, Check, X, Gift, User, AlertTriangle, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function ScannerQRVantaggi() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, prenotazione: null, vantaggio: null });
  const { impersonation } = useImpersonation();
  const queryClient = useQueryClient();

  useEffect(() => {
    window.scrollTo(0, 0);
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (impersonation.active && impersonation.targetEmail) {
          const users = await base44.entities.User.filter({ email: impersonation.targetEmail });
          setUser(users[0] || currentUser);
        } else {
          setUser(currentUser);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [impersonation]);

  // I miei vantaggi (per chi sta usando lo scanner)
  const { data: mieVantaggi = [] } = useQuery({
    queryKey: ['miei-vantaggi-scanner', user?.email],
    queryFn: () => base44.entities.Vantaggio.filter({ creator_email: user?.email, is_active: true }),
    enabled: !!user?.email,
  });

  // Mutation per validare utilizzo
  const validateMutation = useMutation({
    mutationFn: async ({ prenotazioneId, vantaggioId }) => {
      // Aggiorna prenotazione
      await base44.entities.PrenotazioneVantaggio.update(prenotazioneId, {
        status: 'utilizzata',
        data_utilizzo: new Date().toISOString(),
        validato_da: user.email
      });
      // Incrementa utilizzi sul vantaggio
      const vantaggio = await base44.entities.Vantaggio.filter({ id: vantaggioId });
      if (vantaggio.length > 0) {
        await base44.entities.Vantaggio.update(vantaggioId, {
          utilizzi_effettuati: (vantaggio[0].utilizzi_effettuati || 0) + 1
        });
      }
    },
    onSuccess: () => {
      toast.success('Vantaggio validato con successo!');
      setSearchResult(null);
      setManualCode('');
      setConfirmDialog({ open: false, prenotazione: null, vantaggio: null });
    },
    onError: () => {
      toast.error('Errore durante la validazione');
    }
  });

  const handleSearch = async () => {
    if (!manualCode.trim()) return;
    
    setSearching(true);
    setSearchResult(null);
    
    try {
      // Cerca QR code
      const qrCodes = await base44.entities.UserQRCode.filter({ qr_token: manualCode.trim().toUpperCase() });
      
      if (qrCodes.length === 0) {
        setSearchResult({ error: 'Codice QR non trovato' });
        setSearching(false);
        return;
      }

      const qrCode = qrCodes[0];
      
      // Cerca utente
      const users = await base44.entities.User.filter({ email: qrCode.user_email });
      const foundUser = users[0];

      // Cerca prenotazioni attive per questo utente sui miei vantaggi
      const prenotazioni = await base44.entities.PrenotazioneVantaggio.filter({
        user_email: qrCode.user_email,
        status: 'attiva'
      });

      // Filtra solo quelle relative ai miei vantaggi
      const miePrenotazioni = prenotazioni.filter(p => 
        mieVantaggi.some(v => v.id === p.vantaggio_id)
      );

      setSearchResult({
        user: foundUser,
        qrCode,
        prenotazioni: miePrenotazioni,
        vantaggi: mieVantaggi
      });
    } catch (e) {
      console.error(e);
      setSearchResult({ error: 'Errore durante la ricerca' });
    } finally {
      setSearching(false);
    }
  };

  const handleValidate = (prenotazione) => {
    const vantaggio = mieVantaggi.find(v => v.id === prenotazione.vantaggio_id);
    setConfirmDialog({ open: true, prenotazione, vantaggio });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />

      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('GestioneVantaggi')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <QrCode className="w-6 h-6 text-lime-400" />
          <h1 className="text-white text-xl font-bold">Scanner QR</h1>
        </div>

        {/* Info */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
          <p className="text-slate-300 text-sm">
            Inserisci il codice QR dell'utente per validare l'utilizzo di un vantaggio.
          </p>
        </div>

        {/* Input manuale */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Inserisci codice QR..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                className="bg-slate-900 border-slate-600 text-white font-mono"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button
                onClick={handleSearch}
                disabled={searching || !manualCode.trim()}
                className="bg-lime-400 hover:bg-lime-500 text-slate-900"
              >
                {searching ? (
                  <div className="animate-spin w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Risultato ricerca */}
        {searchResult && (
          <>
            {searchResult.error ? (
              <Card className="bg-red-500/20 border-red-500/50">
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-2" />
                  <p className="text-red-400 font-bold">{searchResult.error}</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-800 border-lime-400/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <User className="w-4 h-4 text-lime-400" />
                    Utente trovato
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Info utente */}
                  <div className="flex items-center gap-3 bg-slate-700/50 rounded-lg p-3 mb-4">
                    {searchResult.user?.logo_url ? (
                      <img src={searchResult.user.logo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 bg-lime-400 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-slate-900" />
                      </div>
                    )}
                    <div>
                      <p className="text-white font-bold">{searchResult.user?.company_name || searchResult.user?.full_name}</p>
                      <p className="text-slate-400 text-sm">{searchResult.user?.email}</p>
                    </div>
                  </div>

                  {/* Prenotazioni attive */}
                  {searchResult.prenotazioni.length === 0 ? (
                    <div className="text-center py-4">
                      <Gift className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">Nessuna prenotazione attiva per i tuoi vantaggi</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-lime-400 text-xs font-medium">Prenotazioni da validare:</p>
                      {searchResult.prenotazioni.map(pren => {
                        const vantaggio = mieVantaggi.find(v => v.id === pren.vantaggio_id);
                        return (
                          <div key={pren.id} className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-between">
                            <div>
                              <p className="text-white font-bold text-sm">{vantaggio?.titolo}</p>
                              {vantaggio?.valore && (
                                <p className="text-lime-400 text-sm">{vantaggio.valore}</p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleValidate(pren)}
                              className="bg-green-500 hover:bg-green-600 text-white"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Valida
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Stats vantaggi */}
        {mieVantaggi.length > 0 && (
          <Card className="bg-slate-800/50 border-slate-700 mt-6">
            <CardContent className="p-4">
              <p className="text-slate-400 text-xs mb-2">I tuoi vantaggi attivi: {mieVantaggi.length}</p>
              <div className="space-y-2">
                {mieVantaggi.slice(0, 3).map(v => (
                  <div key={v.id} className="flex items-center justify-between text-sm">
                    <span className="text-white truncate">{v.titolo}</span>
                    <Badge className="bg-slate-700 text-slate-300 text-xs">
                      {v.utilizzi_effettuati || 0} utilizzi
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav currentPage="ScannerQRVantaggi" />

      {/* Dialog conferma */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, prenotazione: null, vantaggio: null })}>
        <AlertDialogContent className="bg-slate-800 border-lime-400/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <Check className="w-5 h-5 text-green-400" />
              Conferma Utilizzo
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              Stai per validare l'utilizzo del vantaggio:
              <br /><br />
              <span className="text-lime-400 font-bold">{confirmDialog.vantaggio?.titolo}</span>
              {confirmDialog.vantaggio?.valore && (
                <span className="block text-white mt-1">{confirmDialog.vantaggio.valore}</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white hover:bg-slate-600 border-slate-600">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-500 text-white hover:bg-green-600"
              onClick={() => validateMutation.mutate({ 
                prenotazioneId: confirmDialog.prenotazione?.id, 
                vantaggioId: confirmDialog.prenotazione?.vantaggio_id 
              })}
            >
              Conferma Utilizzo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}