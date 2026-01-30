import { useCallback, useRef } from 'react';

// Suono di notifica tipo campanello usando Web Audio API
export default function useNotificationSound() {
  const audioContextRef = useRef(null);

  const playSound = useCallback(() => {
    try {
      // Riusa l'AudioContext esistente o creane uno nuovo
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      
      // Resume AudioContext se sospeso (necessario per policy autoplay browser)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const now = audioContext.currentTime;
      
      // Crea un suono tipo "ding dong" elegante
      const playBell = (frequency, startTime, duration, volume) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, startTime);
        oscillator.type = 'sine';
        
        // Attack rapido, decay naturale tipo campanello
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(volume * 0.3, startTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      // Sequenza "ding-ding" - due note alte e chiare
      playBell(1400, now, 0.4, 0.4);           // Prima nota
      playBell(1800, now + 0.15, 0.5, 0.5);    // Seconda nota più alta
      
    } catch (error) {
      console.log('Audio non supportato:', error);
    }
  }, []);

  return { playSound };
}