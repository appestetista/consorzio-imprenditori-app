import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Volume2 } from 'lucide-react';

export default function SoundPermissionPopup({ onComplete }) {
  const [open, setOpen] = useState(false);
  const [audioContext, setAudioContext] = useState(null);

  useEffect(() => {
    // Controlla se l'utente ha già fatto la scelta
    const soundChoice = localStorage.getItem('soundNotificationsEnabled');
    console.log('[SOUND POPUP] soundNotificationsEnabled:', soundChoice);
    if (soundChoice === null) {
      // Prima visita - mostra popup
      console.log('[SOUND POPUP] Prima visita, mostro popup');
      setOpen(true);
    }
  }, []);

  const playTestSound = (ctx) => {
    try {
      const now = ctx.currentTime;
      
      const playBell = (frequency, startTime, duration, volume) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.setValueAtTime(frequency, startTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(volume * 0.4, startTime + 0.15);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      // Suono di conferma
      playBell(1200, now, 0.3, 0.5);
      playBell(1500, now + 0.15, 0.3, 0.6);
    } catch (e) {
      console.log('[AUDIO] Errore test sound:', e);
    }
  };

  const handleEnable = () => {
    // Crea e sblocca AudioContext con il click dell'utente
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    setAudioContext(ctx);
    
    // Suona un breve suono di conferma
    playTestSound(ctx);
    
    // Salva la preferenza
    localStorage.setItem('soundNotificationsEnabled', 'true');
    
    setOpen(false);
    onComplete?.();
  };

  const handleDisable = () => {
    localStorage.setItem('soundNotificationsEnabled', 'false');
    setOpen(false);
    onComplete?.();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-sm" hideClose>
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-lime-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Volume2 className="w-8 h-8 text-lime-400" />
          </div>
          
          <h3 className="text-white text-lg font-bold mb-2">Notifiche Sonore</h3>
          <p className="text-slate-400 text-sm mb-6">
            Vuoi ricevere un suono quando arrivano nuovi eventi o messaggi?
          </p>
          
          <div className="space-y-3">
            <Button 
              onClick={handleEnable}
              className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 font-bold"
            >
              <Bell className="w-5 h-5 mr-2" />
              Sì, attiva i suoni
            </Button>
            
            <Button 
              onClick={handleDisable}
              variant="outline"
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <BellOff className="w-5 h-5 mr-2" />
              No, grazie
            </Button>
          </div>
          
          <p className="text-slate-500 text-xs mt-4">
            Puoi cambiare questa impostazione in qualsiasi momento dal tuo profilo.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}