import { useCallback } from 'react';

// Suono di notifica brillante e chiaro usando Web Audio API
export default function useNotificationSound() {
  const playSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Primo tono - brillante e alto
      const playTone = (frequency, startTime, duration, volume) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, startTime);
        oscillator.type = 'sine';
        
        // Volume più alto e brillante
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      
      const now = audioContext.currentTime;
      
      // Sequenza di 3 toni ascendenti - più brillanti e riconoscibili
      playTone(1200, now, 0.15, 0.5);          // Do6 - primo tono
      playTone(1500, now + 0.12, 0.15, 0.5);   // Mi6 - secondo tono  
      playTone(1800, now + 0.24, 0.25, 0.6);   // Sol6 - terzo tono più lungo
      
    } catch (error) {
      console.log('Audio non supportato:', error);
    }
  }, []);

  return { playSound };
}