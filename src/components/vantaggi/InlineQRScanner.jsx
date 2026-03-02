import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QrCode, Search, Check, X, Gift, User, AlertTriangle, Camera, TrendingUp, Clock, ScanLine } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function InlineQRScanner({ user, compact = false }) {
  const [manualCode, setManualCode] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, prenotazione: null, vantaggio: null });
  const [scannerActive, setScannerActive] = useState(true);
  const scannerRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: mieVantaggi = [] } = useQuery({
    queryKey: ['miei-vantaggi-scanner', user?.email],
    queryFn: () => base44.entities.Vantaggio.filter({ creator_email: user?.email, is_active: true }),
    enabled: !!user?.email,
  });

  // Scanner QR
  useEffect(() => {
    if (scannerActive && !scannerRef.current) {
      const html5Qrcode = new Html5Qrcode("qr-reader-inline");
      scannerRef.current = html5Qrcode;

      html5Qrcode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
        (decodedText) => {
          html5Qrcode.stop().then(() => {
            scannerRef.current = null;
            setScannerActive(false);
            handleQRScanned(decodedText.toUpperCase());
          }).catch(() => {});
        },
        () => {}
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

  const closeScanner = () => {
    if (scannerRef.current) { scannerRef.current.stop().catch(() => {}); scannerRef.current = null; }
    setScannerActive(false);
  };

  const restartScanner = () => {
    setSearchResult(null);
    setManualCode('');
    setScannerActive(true);
  };

  const handleQRScanned = async (code) => {
    setSearching(true);
    setSearchResult(null);
    try {
      const qrCodes = await base44.entities.UserQRCode.filter({ qr_token: code });
      if (qrCodes.length === 0) {
        setSearchResult({ error: 'Codice QR non valido' });
        setTimeout(restartScanner, 2000);
        return;
      }
      const qrCode = qrCodes[0];
      const users = await base44.entities.User.filter({ email: qrCode.user_email });
      const foundUser = users[0];
      const prenotazioni = await base44.entities.PrenotazioneVantaggio.filter({ user_email: qrCode.user_email, status: 'attiva' });
      const miePrenotazioni = prenotazioni.filter(p => mieVantaggi.some(v => v.id === p.vantaggio_id));

      if (miePrenotazioni.length === 0) {
        setSearchResult({ error: 'Nessuna prenotazione attiva per i tuoi vantaggi' });
        setTimeout(restartScanner, 2000);
        return;
      }

      // Mostra risultato con prenotazioni da validare
      setSearchResult({ user: foundUser, qrCode, prenotazioni: miePrenotazioni, vantaggi: mieVantaggi });
    } catch (e) {
      setSearchResult({ error: 'Errore durante la ricerca' });
      setTimeout(restartScanner, 2000);
    } finally {
      setSearching(false);
    }
  };

  const validateMutation = useMutation({
    mutationFn: async ({ prenotazioneId, vantaggioId, isProgressivo }) => {
      const prenotazioni = await base44.entities.PrenotazioneVantaggio.filter({ id: prenotazioneId });
      const prenotazione = prenotazioni[0];
      const vantaggi = await base44.entities.Vantaggio.filter({ id: vantaggioId });
      const vantaggio = vantaggi[0];

      if (isProgressivo && vantaggio?.step_progressivi?.length > 0) {
        const currentStep = prenotazione.step_corrente || 1;
        const maxSteps = vantaggio.step_progressivi.length;
        const newStoricoStep = [...(prenotazione.storico_step || []), { step: currentStep, data_utilizzo: new Date().toISOString(), validato_da: user.email }];
        if (currentStep >= maxSteps) {
          await base44.entities.PrenotazioneVantaggio.update(prenotazioneId, { status: 'utilizzata', data_utilizzo: new Date().toISOString(), validato_da: user.email, storico_step: newStoricoStep });
        } else {
          const nextStep = vantaggio.step_progressivi[currentStep];
          const scadenzaStep = new Date();
          scadenzaStep.setDate(scadenzaStep.getDate() + (nextStep?.giorni_validita || 30));
          await base44.entities.PrenotazioneVantaggio.update(prenotazioneId, { step_corrente: currentStep + 1, step_sbloccato_il: new Date().toISOString(), data_scadenza_utilizzo: scadenzaStep.toISOString(), storico_step: newStoricoStep });
        }
      } else {
        await base44.entities.PrenotazioneVantaggio.update(prenotazioneId, { status: 'utilizzata', data_utilizzo: new Date().toISOString(), validato_da: user.email });
      }
      if (vantaggio) {
        await base44.entities.Vantaggio.update(vantaggioId, { utilizzi_effettuati: (vantaggio.utilizzi_effettuati || 0) + 1 });
      }
    },
    onSuccess: () => {
      toast.success('Vantaggio validato con successo!');
      setConfirmDialog({ open: false, prenotazione: null, vantaggio: null });
      queryClient.invalidateQueries({ queryKey: ['miei-vantaggi-scanner'] });
      setTimeout(restartScanner, 2000);
    },
    onError: () => toast.error('Errore durante la validazione')
  });

  const handleSearch = async () => {
    if (!manualCode.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const qrCodes = await base44.entities.UserQRCode.filter({ qr_token: manualCode.trim().toUpperCase() });
      if (qrCodes.length === 0) { setSearchResult({ error: 'Codice QR non trovato' }); return; }
      const qrCode = qrCodes[0];
      const users = await base44.entities.User.filter({ email: qrCode.user_email });
      const foundUser = users[0];
      const prenotazioni = await base44.entities.PrenotazioneVantaggio.filter({ user_email: qrCode.user_email, status: 'attiva' });
      const miePrenotazioni = prenotazioni.filter(p => mieVantaggi.some(v => v.id === p.vantaggio_id));
      setSearchResult({ user: foundUser, qrCode, prenotazioni: miePrenotazioni, vantaggi: mieVantaggi });
    } catch (e) {
      setSearchResult({ error: 'Errore durante la ricerca' });
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className={`bg-slate-800 border border-[#d4af37]/30 rounded-xl ${compact ? 'p-2 h-full flex flex-col' : 'p-4'}`}>
      <div className={`flex items-center gap-${compact ? '1' : '2'} mb-${compact ? '1' : '3'}`}>
        <ScanLine className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-[#d4af37] flex-shrink-0`} />
        <h3 className={`text-white font-bold ${compact ? 'text-[10px] leading-tight' : 'text-sm'}`}>{compact ? 'Scanner' : 'Scansiona il QR code di chi ti sta venendo a prenotare un vantaggio'}</h3>
      </div>

      {/* Scanner fotocamera - sempre aperto */}
      <div className={compact ? 'flex-1 min-h-0' : 'mb-3'}>
        {scannerActive && (
          <>
            <div id="qr-reader-inline" className="rounded-lg overflow-hidden" style={compact ? { maxHeight: '140px' } : {}} />
            {!compact && <p className="text-slate-500 text-[10px] text-center mt-2">Inquadra il QR code</p>}
          </>
        )}
        {!scannerActive && (
          <div className={`bg-slate-700 rounded-lg ${compact ? 'p-3' : 'p-6'} flex flex-col items-center justify-center`}>
            <Camera className={`${compact ? 'w-5 h-5' : 'w-8 h-8'} text-slate-500 mb-1`} />
            <p className="text-slate-400 text-[10px]">Caricamento...</p>
          </div>
        )}
      </div>

      {searching && (
        <div className="flex items-center justify-center py-3">
          <div className="animate-spin w-5 h-5 border-2 border-[#d4af37] border-t-transparent rounded-full mr-2" />
          <span className="text-slate-400 text-xs">Verifica in corso...</span>
        </div>
      )}

      {/* Risultato */}
      {searchResult && (
        <>
          {searchResult.error ? (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-center">
              <AlertTriangle className="w-6 h-6 text-red-400 mx-auto mb-1" />
              <p className="text-red-400 text-sm font-bold">{searchResult.error}</p>
            </div>
          ) : (
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-3">
                {searchResult.user?.logo_url ? (
                  <img src={searchResult.user.logo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 bg-[#d4af37] rounded-full flex items-center justify-center"><User className="w-4 h-4 text-slate-900" /></div>
                )}
                <div>
                  <p className="text-white font-bold text-sm">{searchResult.user?.company_name || searchResult.user?.full_name}</p>
                  <p className="text-slate-400 text-[10px]">{searchResult.user?.email}</p>
                </div>
              </div>

              {searchResult.prenotazioni.length === 0 ? (
                <div className="text-center py-2">
                  <p className="text-slate-400 text-xs">Nessuna prenotazione attiva per i tuoi vantaggi</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResult.prenotazioni.map(pren => {
                    const vantaggio = mieVantaggi.find(v => v.id === pren.vantaggio_id);
                    const isProgressivo = vantaggio?.is_progressivo && vantaggio?.step_progressivi?.length > 0;
                    const currentStep = pren.step_corrente || 1;
                    const stepData = isProgressivo ? vantaggio.step_progressivi[currentStep - 1] : null;
                    const isScaduto = pren.data_scadenza_utilizzo && new Date(pren.data_scadenza_utilizzo) < new Date();
                    return (
                      <div key={pren.id} className={`rounded-lg p-2 ${isScaduto ? 'bg-red-500/20' : 'bg-slate-800'}`}>
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-white font-bold text-xs truncate">{vantaggio?.titolo}</p>
                            {isProgressivo && stepData && <p className="text-[#d4af37] text-xs font-bold">{stepData.valore}</p>}
                            {!isProgressivo && vantaggio?.valore && <p className="text-[#d4af37] text-xs">{vantaggio.valore}</p>}
                          </div>
                          {isScaduto ? (
                            <Badge className="bg-red-500 text-white text-[10px]">Scaduto</Badge>
                          ) : (
                            <Button size="sm" onClick={() => { setConfirmDialog({ open: true, prenotazione: pren, vantaggio }); }} className="bg-green-500 hover:bg-green-600 text-white h-7 text-[10px] px-2">
                              <Check className="w-3 h-3 mr-1" />{isProgressivo ? 'Sblocca' : 'Valida'}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Stats */}
      {mieVantaggi.length > 0 && !searchResult && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <p className="text-slate-500 text-[10px] mb-1">I tuoi vantaggi attivi: {mieVantaggi.length}</p>
          {mieVantaggi.slice(0, 2).map(v => (
            <div key={v.id} className="flex items-center justify-between text-[11px] py-0.5">
              <span className="text-slate-300 truncate">{v.titolo}</span>
              <span className="text-slate-500">{v.utilizzi_effettuati || 0} utilizzi</span>
            </div>
          ))}
        </div>
      )}

      {/* Dialog conferma */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, prenotazione: null, vantaggio: null })}>
        <AlertDialogContent className="bg-slate-800 border-[#d4af37]/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2"><Check className="w-5 h-5 text-green-400" />Conferma Utilizzo</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              Stai per validare: <span className="text-[#d4af37] font-bold">{confirmDialog.vantaggio?.titolo}</span>
              {confirmDialog.vantaggio?.valore && <span className="block text-white mt-1">{confirmDialog.vantaggio.valore}</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white hover:bg-slate-600 border-slate-600">Annulla</AlertDialogCancel>
            <AlertDialogAction className="bg-green-500 text-white hover:bg-green-600" onClick={() => validateMutation.mutate({ prenotazioneId: confirmDialog.prenotazione?.id, vantaggioId: confirmDialog.prenotazione?.vantaggio_id, isProgressivo: confirmDialog.vantaggio?.is_progressivo })}>
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}