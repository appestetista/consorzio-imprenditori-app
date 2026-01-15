import { useCallback } from 'react';

// Suono di notifica semplice usando Web Audio API
export default function useNotificationSound() {
  const playSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Crea un oscillatore per il suono
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configurazione del suono (tono piacevole)
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // La5
      oscillator.type = 'sine';
      
      // Fade in e fade out per un suono più morbido
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
      // Secondo tono (più alto) per un suono più riconoscibile
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        
        osc2.frequency.setValueAtTime(1100, audioContext.currentTime); // Do#6
        osc2.type = 'sine';
        
        gain2.gain.setValueAtTime(0, audioContext.currentTime);
        gain2.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
        gain2.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
        
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.3);
      }, 150);
      
    } catch (error) {
      console.log('Audio non supportato:', error);
    }
  }, []);

  return { playSound };
}