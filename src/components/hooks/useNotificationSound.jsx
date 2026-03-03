import { useCallback, useRef, useEffect } from 'react';

// Suono di notifica tipo campanello usando Web Audio API
export default function useNotificationSound() {
  const audioContextRef = useRef(null);
  const isUnlockedRef = useRef(false);

  // Controlla se l'utente ha abilitato i suoni
  const isSoundEnabled = () => {
    return localStorage.getItem('soundNotificationsEnabled') === 'true';
  };

  // Controlla se una specifica sezione ha le notifiche abilitate
  // Le preferenze sono salvate nell'utente, ma per semplicità qui controlliamo solo il suono globale
  // Il filtro per sezione viene fatto a livello di componente che chiama playSound

  // Sblocca AudioContext al primo click/touch dell'utente (solo se suoni abilitati)
  // Usa { once: true, passive: true } per non interferire con altri click handler
  useEffect(() => {
    const unlockAudio = () => {
      if (isUnlockedRef.current) return;
      if (!isSoundEnabled()) return;
      
      try {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().then(() => {
            isUnlockedRef.current = true;
          }).catch(() => {});
        } else {
          isUnlockedRef.current = true;
        }
      } catch (e) {}
    };

    // once: true — sblocca solo al primo tocco, poi si rimuove automaticamente
    document.addEventListener('click', unlockAudio, { once: true, passive: true });
    document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
    
    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  const playSound = useCallback(() => {
    // Non suonare se l'utente ha disabilitato i suoni
    const enabled = isSoundEnabled();
    console.log('[AUDIO] playSound chiamato, suoni abilitati:', enabled);
    if (!enabled) {
      console.log('[AUDIO] Suoni disabilitati dall\'utente');
      return;
    }

    try {
      // Crea o riusa AudioContext
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      
      // Resume se sospeso
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

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