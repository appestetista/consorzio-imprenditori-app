import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

/**
 * Mostra una domanda di chiarimento con 2 opzioni cliccabili.
 * Props:
 *   question: JSON string '{"question":"...","options":["a","b"]}' oppure vecchio formato "q1|||q2"
 *   onSelect: callback con il testo dell'opzione selezionata
 *   visible: boolean
 */
export default function ContextFollowup({ question, onSelect, visible }) {
  const parsed = useMemo(() => {
    if (!question) return null;
    // Prova a parsare come nuovo JSON format
    try {
      const obj = JSON.parse(question);
      if (obj.question && obj.options && obj.options.length >= 2) {
        return obj;
      }
    } catch {}
    // Fallback vecchio formato "q1|||q2"
    if (question.includes('|||')) {
      const parts = question.split('|||').map(q => q.trim()).filter(Boolean);
      return { question: 'Per rendere la risposta ancora più utile:', options: parts };
    }
    return { question: 'Per rendere la risposta ancora più utile:', options: [question.trim()] };
  }, [question]);

  if (!question || !visible || !parsed?.question || !parsed?.options?.length) return null;

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
          <div className="rounded-xl border border-[#d4af37]/30 bg-[#151c2e] p-3.5 shadow-lg">
            <div className="flex items-center gap-1.5 mb-2.5">
              <HelpCircle className="w-3.5 h-3.5 text-[#d4af37]" />
              <span className="text-xs text-[#d4af37]/80 font-medium">
                {parsed.question}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {parsed.options.slice(0, 2).map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelect(opt)}
                  className="w-full text-left px-3.5 py-2.5 rounded-lg border border-slate-600/50 bg-slate-800/60 hover:bg-slate-700/60 hover:border-[#d4af37]/50 transition-all group"
                >
                  <span className="text-sm text-slate-300 leading-relaxed group-hover:text-white transition-colors">
                    {opt}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}