import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb } from 'lucide-react';

/**
 * Riquadro che mostra una domanda di contesto generata dall'AI
 * mentre la risposta principale è ancora in streaming.
 * L'utente può cliccarci per accodarla come prossima domanda.
 */
export default function ContextFollowup({ question, onSelect, visible }) {
  if (!question || !visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 5, scale: 0.97 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full max-w-2xl mx-auto mb-1.5"
        >
          <button
            onClick={() => onSelect(question)}
            className="w-full text-left flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 hover:bg-[#d4af37]/10 hover:border-[#d4af37]/50 transition-all group"
          >
            <Lightbulb className="w-4 h-4 text-[#d4af37] mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-[#d4af37]/70 font-semibold block mb-0.5">
                Vuoi approfondire?
              </span>
              <span className="text-sm text-slate-300 leading-relaxed">
                {question}
              </span>
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}