import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, X, Gift, User, AlertTriangle, Camera, TrendingUp, Clock, ScanLine, Check } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function QRCodeScannerTab({ user }) {
  const [manualCode, setManualCode] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, prenotazione: null, vantaggio: null });
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef(null);

  const { data: mieVantaggi = [] } = useQuery({
    queryKey: ['miei-vantaggi-scanner', user?.email],
    queryFn: () => base44.entities.Vantaggio.filter({ creator_email: user?.email, is_active: true }),
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (scannerActive && !scannerRef.current) {
      const html5Qrcode = new Html5Qrcode("qr-reader-hub");
      scannerRef.current = html5Qrcode;
      html5Qrcode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText) => {
          setManualCode(decodedText.toUpperCase());
          html5Qrcode.stop().then(() => {
            scannerRef.current = null;
            setScannerActive(false);
            setTimeout(() => document.getElementById('search-btn-hub')?.click(), 100);
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
      if (vantaggio) await base44.entities.Vantaggio.update(vantaggioId, { utilizzi_effettuati: (vantaggio.utilizzi_effettuati || 0) + 1 });
    },
    onSuccess: () => { toast.success('Vantaggio validato!'); setSearchResult(null); setManualCode(''); setConfirmDialog({ open: false, prenotazione: null, vantaggio: null }); },
    onError: () => toast.error('Errore durante la validazione')
  });

  const handleSearch = async () => {
    if (!manualCode.trim()) return;
    setSearching(true); setSearchResult(null);
    try {
      const qrCodes = await base44.entities.UserQRCode.filter({ qr_token: manualCode.trim().toUpperCase() });
      if (qrCodes.length === 0) { setSearchResult({ error: 'Codice QR non trovato' }); setSearching(false); return; }
      const qrCode = qrCodes[0];
      const users = await base44.entities.User.filter({ email: qrCode.user_email });
      const prenotazioni = await base44.entities.PrenotazioneVantaggio.filter({ user_email: qrCode.user_email, status: 'attiva' });
      setSearchResult({ user: users[0], qrCode, prenotazioni: prenotazioni.filter(p => mieVantaggi.some(v => v.id === p.vantaggio_id)), vantaggi: mieVantaggi });
    } catch (e) { setSearchResult({ error: 'Errore durante la ricerca' }); }
    finally { setSearching(false); }
  };

  return (
    <div>
      <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4 mb-5">
        <p className="text-slate-300 text-sm">Scansiona il QR code dell'utente con la fotocamera oppure inserisci il codice manualmente.</p>
      </div>

      {scannerActive ? (
        <Card className="bg-slate-800/60 border-[#d4af37]/40 mb-5 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-[#d4af37]"><ScanLine className="w-5 h-5 animate-pulse" /><span className="font-medium text-sm">Scansiona QR Code</span></div>
              <Button variant="ghost" size="sm" onClick={closeScanner} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></Button>
            </div>
            <div id="qr-reader-hub" className="rounded-lg overflow-hidden" />
            <p className="text-slate-400 text-xs text-center mt-3">Inquadra il QR code dell'utente</p>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setScannerActive(true)} className="w-full bg-[#d4af37] hover:bg-[#b8960b] text-slate-900 font-bold h-14 mb-4">
          <Camera className="w-6 h-6 mr-2" />Apri Fotocamera per Scansionare
        </Button>
      )}

      <div className="flex items-center gap-3 mb-4"><div className="flex-1 h-px bg-slate-700"></div><span className="text-slate-500 text-sm">oppure</span><div className="flex-1 h-px bg-slate-700"></div></div>

      <Card className="bg-slate-800/60 border-slate-700/40 mb-5">
        <CardContent className="p-4">
          <p className="text-slate-400 text-xs mb-2">Inserisci codice manualmente:</p>
          <div className="flex gap-2">
            <Input placeholder="Es: ABC123XY..." value={manualCode} onChange={(e) => setManualCode(e.target.value.toUpperCase())} className="bg-slate-900/60 border-slate-600 text-white font-mono" onKeyPress={(e) => e.key === 'Enter' && handleSearch()} />
            <Button id="search-btn-hub" onClick={handleSearch} disabled={searching || !manualCode.trim()} className="bg-[#d4af37] hover:bg-[#b8960b] text-slate-900">
              {searching ? <div className="animate-spin w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {searchResult && (
        searchResult.error ? (
          <Card className="bg-red-500/20 border-red-500/50"><CardContent className="p-4 text-center"><AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-2" /><p className="text-red-400 font-bold">{searchResult.error}</p></CardContent></Card>
        ) : (
          <Card className="bg-slate-800/60 border-[#d4af37]/20">
            <CardHeader className="pb-2"><CardTitle className="text-white text-sm flex items-center gap-2"><User className="w-4 h-4 text-[#d4af37]" />Utente trovato</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 bg-slate-700/30 rounded-lg p-3 mb-4">
                {searchResult.user?.logo_url ? <img src={searchResult.user.logo_url} alt="" className="w-12 h-12 rounded-full object-cover" /> : <div className="w-12 h-12 bg-[#d4af37] rounded-full flex items-center justify-center"><User className="w-6 h-6 text-slate-900" /></div>}
                <div><p className="text-white font-bold">{searchResult.user?.company_name || searchResult.user?.full_name}</p><p className="text-slate-400 text-sm">{searchResult.user?.email}</p></div>
              </div>
              {searchResult.prenotazioni.length === 0 ? (
                <div className="text-center py-4"><Gift className="w-10 h-10 text-slate-600 mx-auto mb-2" /><p className="text-slate-400 text-sm">Nessuna prenotazione attiva per i tuoi vantaggi</p></div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[#d4af37] text-xs font-medium">Prenotazioni da validare:</p>
                  {searchResult.prenotazioni.map(pren => {
                    const vantaggio = mieVantaggi.find(v => v.id === pren.vantaggio_id);
                    const isProgressivo = vantaggio?.is_progressivo && vantaggio?.step_progressivi?.length > 0;
                    const currentStep = pren.step_corrente || 1;
                    const stepData = isProgressivo ? vantaggio.step_progressivi[currentStep - 1] : null;
                    const isScaduto = pren.data_scadenza_utilizzo && new Date(pren.data_scadenza_utilizzo) < new Date();
                    return (
                      <div key={pren.id} className={`rounded-lg p-3 ${isScaduto ? 'bg-red-500/20 border border-red-500/50' : 'bg-slate-700/30'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-white font-bold text-sm">{vantaggio?.titolo}</p>
                              {isProgressivo && <Badge className="bg-purple-500 text-white text-[10px]"><TrendingUp className="w-3 h-3 mr-1" />Step {currentStep}/{vantaggio.step_progressivi.length}</Badge>}
                            </div>
                            {isProgressivo && stepData ? <p className="text-[#d4af37] text-sm font-bold">{stepData.valore}</p> : vantaggio?.valore && <p className="text-[#d4af37] text-sm">{vantaggio.valore}</p>}
                            {pren.data_scadenza_utilizzo && <div className={`flex items-center gap-1 mt-2 text-xs ${isScaduto ? 'text-red-400' : 'text-slate-500'}`}><Clock className="w-3 h-3" /><span>{isScaduto ? 'Scaduto' : 'Scade'} il {new Date(pren.data_scadenza_utilizzo).toLocaleDateString('it-IT')}</span></div>}
                          </div>
                          {isScaduto ? <Badge className="bg-red-500 text-white"><X className="w-3 h-3 mr-1" />Scaduto</Badge> : (
                            <Button size="sm" onClick={() => { const v = mieVantaggi.find(x => x.id === pren.vantaggio_id); setConfirmDialog({ open: true, prenotazione: pren, vantaggio: v }); }} className="bg-green-500 hover:bg-green-600 text-white">
                              <Check className="w-4 h-4 mr-1" />{isProgressivo ? 'Sblocca' : 'Valida'}
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
        )
      )}

      {mieVantaggi.length > 0 && (
        <Card className="bg-slate-800/30 border-slate-700/40 mt-5">
          <CardContent className="p-4">
            <p className="text-slate-400 text-xs mb-2">I tuoi vantaggi attivi: {mieVantaggi.length}</p>
            <div className="space-y-2">
              {mieVantaggi.slice(0, 3).map(v => (
                <div key={v.id} className="flex items-center justify-between text-sm">
                  <span className="text-white truncate">{v.titolo}</span>
                  <Badge className="bg-slate-700 text-slate-300 text-xs">{v.utilizzi_effettuati || 0} utilizzi</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, prenotazione: null, vantaggio: null })}>
        <AlertDialogContent className="bg-slate-800 border-[#d4af37]/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2"><Check className="w-5 h-5 text-green-400" />Conferma Utilizzo</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              Stai per validare l'utilizzo del vantaggio:<br /><br />
              <span className="text-[#d4af37] font-bold">{confirmDialog.vantaggio?.titolo}</span>
              {confirmDialog.vantaggio?.valore && <span className="block text-white mt-1">{confirmDialog.vantaggio.valore}</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white hover:bg-slate-600 border-slate-600">Annulla</AlertDialogCancel>
            <AlertDialogAction className="bg-green-500 text-white hover:bg-green-600" onClick={() => validateMutation.mutate({ prenotazioneId: confirmDialog.prenotazione?.id, vantaggioId: confirmDialog.prenotazione?.vantaggio_id, isProgressivo: confirmDialog.vantaggio?.is_progressivo })}>
              Conferma Utilizzo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}