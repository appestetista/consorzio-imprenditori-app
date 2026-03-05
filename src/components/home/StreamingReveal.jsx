import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Rivela i figli uno alla volta con effetto streaming (come ChatGPT).
 * Ogni figlio appare dopo `delay` ms dal precedente.
 */
export default function StreamingReveal({ children, delay = 120, enabled = true }) {
  const [visibleCount, setVisibleCount] = useState(enabled ? 0 : React.Children.count(children));
  const childArray = React.Children.toArray(children).filter(Boolean);

  useEffect(() => {
    if (!enabled || childArray.length === 0) {
      setVisibleCount(childArray.length);
      return;
    }
    setVisibleCount(0);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleCount(i);
      if (i >= childArray.length) clearInterval(interval);
    }, delay);
    return () => clearInterval(interval);
  }, [enabled, childArray.length, delay]);

  return (
    <>
      {childArray.map((child, idx) => (
        idx < visibleCount ? (
          <motion.div
            key={idx}
            initial={enabled ? { opacity: 0, y: 12 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ touchAction: 'pan-y' }}
          >
            {child}
          </motion.div>
        ) : null
      ))}
    </>
  );
}