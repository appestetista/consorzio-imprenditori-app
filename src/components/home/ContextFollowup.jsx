import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb } from 'lucide-react';

/**
 * Mostra 1 o 2 domande propositives generate dall'AI.
 * question può essere "domanda1|||domanda2" oppure una singola stringa.
 */
export default function ContextFollowup({ question, onSelect, visible }) {
  if (!question || !visible) return null;

  const questions = question.includes('|||') 
    ? question.split('|||').map(q => q.trim()).filter(Boolean)
    : [question.trim()];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 5, scale: 0.97 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full max-w-2xl mx-auto mb-2"
        >
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <Lightbulb className="w-3.5 h-3.5 text-[#d4af37]" />
            <span className="text-[10px] uppercase tracking-wider text-[#d4af37]/70 font-semibold">
              Intanto posso anche…
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {questions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => onSelect(q)}
                className="w-full text-left px-3.5 py-2.5 rounded-xl border border-[#d4af37]/40 bg-[#151c2e] hover:bg-[#1a2338] hover:border-[#d4af37]/60 transition-all group shadow-lg"
              >
                <span className="text-sm text-slate-300 leading-relaxed group-hover:text-white transition-colors">
                  {q}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}