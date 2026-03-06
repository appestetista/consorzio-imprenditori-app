import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const thinkingPhrases = [
  "Analizzo la tua richiesta…",
  "Cerco fonti aggiornate…",
  "Verifico i dati…",
  "Organizzo le informazioni…",
  "Preparo la risposta…",
];

export default function AIThinkingAnimation({ onFinished }) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  // Cicla le frasi ogni 1.5 secondi
  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex(prev => (prev + 1) % thinkingPhrases.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Dopo 3 secondi scompare e chiama onFinished (max fallback)
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onFinished?.(), 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onFinished]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, y: -10 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="flex flex-col items-center justify-center py-10"
        >
          {/* Cerchi pulsanti concentrici */}
          <div className="relative w-20 h-20 mb-5">
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.05, 0.15] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full bg-[#d4af37]"
            />
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.1, 0.25] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
              className="absolute inset-2 rounded-full bg-[#d4af37]"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#d4af37] to-[#b8860b] flex items-center justify-center shadow-lg shadow-[#d4af37]/30"
              >
                <Sparkles className="w-6 h-6 text-white" />
              </motion.div>
            </div>
          </div>

          {/* Frase rotante */}
          <AnimatePresence mode="wait">
            <motion.p
              key={phraseIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="text-sm text-slate-400 font-medium text-center"
            >
              {thinkingPhrases[phraseIndex]}
            </motion.p>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}