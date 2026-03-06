import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

/**
 * Progress bar elastica dorata — avanza veloce fino al 70%, poi rallenta.
 * Quando `complete` diventa true → salta al 100% e scompare.
 */
export default function ThinkingProgressBar({ complete = false }) {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (complete) {
      clearInterval(intervalRef.current);
      setProgress(100);
      // Sparisce dopo animazione
      const t = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(t);
    }

    // Avanzamento elastico: veloce all'inizio, rallenta progressivamente
    let elapsed = 0;
    intervalRef.current = setInterval(() => {
      elapsed += 100;
      // Curva logaritmica: veloce fino a ~70%, poi quasi fermo
      // 2s → 70%, 5s → 85%, 10s → 92%, 20s → 96%
      const p = Math.min(96, 70 * (1 - Math.exp(-elapsed / 1500)) + 26 * (1 - Math.exp(-elapsed / 8000)));
      setProgress(p);
    }, 100);

    return () => clearInterval(intervalRef.current);
  }, [complete]);

  if (!visible) return null;

  return (
    <div className="w-full h-0.5 bg-slate-700/30 rounded-full overflow-hidden mt-1">
      <motion.div
        className="h-full bg-gradient-to-r from-[#d4af37] to-[#b8860b] rounded-full"
        animate={{ width: `${progress}%` }}
        transition={{ duration: complete ? 0.3 : 0.15, ease: 'easeOut' }}
      />
    </div>
  );
}