import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, QrCode, Search, Check, X, Gift, User, AlertTriangle, Camera, TrendingUp, Clock, ScanLine } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
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
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef(null);
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
        // Apri automaticamente lo scanner all'avvio
        setTimeout(() => setScannerActive(true), 300);
      }
    };
    loadUser();
  }, [impersonation]);

  // Gestione scanner QR con fotocamera - avvio diretto senza UI di selezione
  useEffect(() => {
    if (scannerActive && !scannerRef.current) {
      const html5Qrcode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5Qrcode;

      // Avvia direttamente la fotocamera posteriore
      html5Qrcode.start(
        { facingMode: "environment" }, // Usa fotocamera posteriore
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          // Successo scansione
          setManualCode(decodedText.toUpperCase());
          html5Qrcode.stop().then(() => {
            scannerRef.current = null;
            setScannerActive(false);
            // Avvia automaticamente la ricerca
            setTimeout(() => {
              document.getElementById('search-btn')?.click();
            }, 100);
          }).catch(() => {});
        },
        () => {
          // Errore silenzioso durante scansione
        }
      ).catch((err) => {
        console.error("Errore avvio fotocamera:", err);
        toast.error("Impossibile accedere alla fotocamera");
        setScannerActive(false);
        scannerRef.current = null;
      });
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [scannerActive]);

  // Cleanup quando si chiude lo scanner
  const closeScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScannerActive(false);
  };

  // I miei vantaggi (per chi sta usando lo scanner)
  const { data: mieVantaggi = [] } = useQuery({
    queryKey: ['miei-vantaggi-scanner', user?.email],
    queryFn: () => base44.entities.Vantaggio.filter({ creator_email: user?.email, is_active: true }),
    enabled: !!user?.email,
  });

  // Mutation per validare utilizzo
  const validateMutation = useMutation({
    mutationFn: async ({ prenotazioneId, vantaggioId, isProgressivo }) => {
      const prenotazioni = await base44.entities.PrenotazioneVantaggio.filter({ id: prenotazioneId });
      const prenotazione = prenotazioni[0];
      const vantaggi = await base44.entities.Vantaggio.filter({ id: vantaggioId });
      const vantaggio = vantaggi[0];

      if (isProgressivo && vantaggio?.step_progressivi?.length > 0) {
        // Vantaggio progressivo: avanza allo step successivo
        const currentStep = prenotazione.step_corrente || 1;
        const maxSteps = vantaggio.step_progressivi.length;
        const stepData = vantaggio.step_progressivi[currentStep - 1];
        
        const newStoricoStep = [
          ...(prenotazione.storico_step || []),
          {
            step: currentStep,
            data_utilizzo: new Date().toISOString(),
            validato_da: user.email
          }
        ];

        if (currentStep >= maxSteps) {
          // Ultimo step: segna come completato
          await base44.entities.PrenotazioneVantaggio.update(prenotazioneId, {
            status: 'utilizzata',
            data_utilizzo: new Date().toISOString(),
            validato_da: user.email,
            storico_step: newStoricoStep
          });
        } else {
          // Avanza allo step successivo
          const nextStep = vantaggio.step_progressivi[currentStep];
          const giorniValidita = nextStep?.giorni_validita || 30;
          const scadenzaStep = new Date();
          scadenzaStep.setDate(scadenzaStep.getDate() + giorniValidita);

          await base44.entities.PrenotazioneVantaggio.update(prenotazioneId, {
            step_corrente: currentStep + 1,
            step_sbloccato_il: new Date().toISOString(),
            data_scadenza_utilizzo: scadenzaStep.toISOString(),
            storico_step: newStoricoStep
          });
        }
      } else {
        // Vantaggio normale
        await base44.entities.PrenotazioneVantaggio.update(prenotazioneId, {
          status: 'utilizzata',
          data_utilizzo: new Date().toISOString(),
          validato_da: user.email
        });
      }

      // Incrementa utilizzi sul vantaggio
      if (vantaggio) {
        await base44.entities.Vantaggio.update(vantaggioId, {
          utilizzi_effettuati: (vantaggio.utilizzi_effettuati || 0) + 1
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
    <div className="min-h-screen bg-slate-900 pb-64">
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
            Scansiona il QR code dell'utente con la fotocamera oppure inserisci il codice manualmente.
          </p>
        </div>

        {/* Scanner con fotocamera */}
        {scannerActive ? (
          <Card className="bg-slate-800 border-lime-400 mb-6 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-lime-400">
                  <ScanLine className="w-5 h-5 animate-pulse" />
                  <span className="font-medium">Scansiona QR Code</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeScanner}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div id="qr-reader" className="rounded-lg overflow-hidden" />
              <p className="text-slate-400 text-xs text-center mt-3">
                Inquadra il QR code dell'utente
              </p>
            </CardContent>
          </Card>
        ) : (
          <Button
            onClick={() => setScannerActive(true)}
            className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 font-bold h-14 mb-4"
          >
            <Camera className="w-6 h-6 mr-2" />
            Apri Fotocamera per Scansionare
          </Button>
        )}

        {/* Divisore */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-slate-700"></div>
          <span className="text-slate-500 text-sm">oppure</span>
          <div className="flex-1 h-px bg-slate-700"></div>
        </div>

        {/* Input manuale */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardContent className="p-4">
            <p className="text-slate-400 text-xs mb-2">Inserisci codice manualmente:</p>
            <div className="flex gap-2">
              <Input
                placeholder="Es: ABC123XY..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                className="bg-slate-900 border-slate-600 text-white font-mono"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button
                id="search-btn"
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
                        const isProgressivo = vantaggio?.is_progressivo && vantaggio?.step_progressivi?.length > 0;
                        const currentStep = pren.step_corrente || 1;
                        const stepData = isProgressivo ? vantaggio.step_progressivi[currentStep - 1] : null;
                        
                        // Verifica scadenza
                        const isScaduto = pren.data_scadenza_utilizzo && new Date(pren.data_scadenza_utilizzo) < new Date();
                        
                        return (
                          <div key={pren.id} className={`rounded-lg p-3 ${isScaduto ? 'bg-red-500/20 border border-red-500/50' : 'bg-slate-700/50'}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-white font-bold text-sm">{vantaggio?.titolo}</p>
                                  {isProgressivo && (
                                    <Badge className="bg-purple-500 text-white text-[10px]">
                                      <TrendingUp className="w-3 h-3 mr-1" />
                                      Step {currentStep}/{vantaggio.step_progressivi.length}
                                    </Badge>
                                  )}
                                </div>
                                
                                {isProgressivo && stepData ? (
                                  <p className="text-lime-400 text-sm font-bold">{stepData.valore}</p>
                                ) : vantaggio?.valore && (
                                  <p className="text-lime-400 text-sm">{vantaggio.valore}</p>
                                )}
                                
                                {isProgressivo && stepData?.descrizione && (
                                  <p className="text-slate-400 text-xs mt-1">{stepData.descrizione}</p>
                                )}

                                {pren.data_scadenza_utilizzo && (
                                  <div className={`flex items-center gap-1 mt-2 text-xs ${isScaduto ? 'text-red-400' : 'text-slate-500'}`}>
                                    <Clock className="w-3 h-3" />
                                    {isScaduto ? (
                                      <span>Scaduto il {new Date(pren.data_scadenza_utilizzo).toLocaleDateString('it-IT')}</span>
                                    ) : (
                                      <span>Scade il {new Date(pren.data_scadenza_utilizzo).toLocaleDateString('it-IT')}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              {isScaduto ? (
                                <Badge className="bg-red-500 text-white">
                                  <X className="w-3 h-3 mr-1" />
                                  Scaduto
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleValidate(pren)}
                                  className="bg-green-500 hover:bg-green-600 text-white"
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  {isProgressivo ? 'Sblocca' : 'Valida'}
                                </Button>
                              )}
                            </div>
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
                vantaggioId: confirmDialog.prenotazione?.vantaggio_id,
                isProgressivo: confirmDialog.vantaggio?.is_progressivo 
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