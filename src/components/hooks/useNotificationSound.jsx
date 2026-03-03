import { useCallback, useRef } from 'react';

// Suono di notifica tipo campanello usando Web Audio API
export default function useNotificationSound() {
  const audioContextRef = useRef(null);

  // Controlla se l'utente ha abilitato i suoni
  const isSoundEnabled = () => {
    return localStorage.getItem('soundNotificationsEnabled') === 'true';
  };

  // Nessun listener globale — l'AudioContext viene creato/sbloccato
  // direttamente dentro playSound, che è già chiamato in risposta
  // a un evento utente (notifica real-time), quindi non servono
  // listener globali che possono interferire con tap su mobile.

  const getOrCreateContext = () => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }
    return audioContextRef.current;
  };

  const playSound = useCallback(() => {
    if (!isSoundEnabled()) return;

    try {
      const audioContext = getOrCreateContext();

      const now = audioContext.currentTime;
      
      // Suono campanello più forte e distintivo
      const playBell = (frequency, startTime, duration, volume) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, startTime);
        oscillator.type = 'sine';
        
        // Attack rapido, decay naturale
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(volume * 0.4, startTime + 0.15);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      // Sequenza tripla "ding-ding-ding" - più udibile
      playBell(1200, now, 0.5, 0.7);           // Prima nota
      playBell(1500, now + 0.2, 0.5, 0.8);     // Seconda nota
      playBell(1800, now + 0.4, 0.6, 0.9);     // Terza nota più alta
      
      console.log('[AUDIO] Suono riprodotto');
      
    } catch (error) {
      console.log('[AUDIO] Errore riproduzione:', error);
    }
  }, []);

  return { playSound };
}