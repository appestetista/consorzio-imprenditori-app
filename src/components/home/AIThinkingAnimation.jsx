import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const genericPhrases = [
  "Analizzo la tua richiesta…",
  "Cerco fonti aggiornate…",
  "Verifico i dati sul web…",
  "Incrocio le informazioni…",
  "Organizzo la risposta…",
  "Valuto le alternative…",
  "Quasi pronto…",
];

// Frasi contestuali basate su keyword nel messaggio utente
const contextRules = [
  { keywords: ['fattura', 'fatturazione', 'iva', 'scontrino', 'ricevuta'], phrases: ['Verifico la normativa fiscale…', 'Controllo le aliquote IVA…', 'Cerco le ultime circolari…'] },
  { keywords: ['dipendente', 'assunzione', 'stipendio', 'busta paga', 'tfr', 'personale'], phrases: ['Calcolo i costi del personale…', 'Verifico i contributi INPS…', 'Analizzo il CCNL di riferimento…'] },
  { keywords: ['srl', 'società', 'costituzione', 'statuto', 'socio'], phrases: ['Analizzo la forma societaria…', 'Verifico gli adempimenti…', 'Controllo la normativa…'] },
  { keywords: ['bando', 'finanziamento', 'agevolazione', 'contributo', 'fondo perduto'], phrases: ['Cerco i bandi attivi…', 'Verifico i requisiti…', 'Analizzo le opportunità…'] },
  { keywords: ['tasse', 'irpef', 'irap', 'regime', 'forfettario', 'fiscale'], phrases: ['Calcolo il carico fiscale…', 'Verifico le aliquote…', 'Confronto i regimi…'] },
  { keywords: ['contratto', 'clausola', 'penale', 'recesso'], phrases: ['Analizzo le clausole…', 'Verifico la normativa contrattuale…', 'Valuto i rischi legali…'] },
  { keywords: ['export', 'import', 'estero', 'dogana', 'internazionale'], phrases: ['Analizzo i mercati esteri…', 'Verifico le normative doganali…', 'Cerco dati commerciali…'] },
  { keywords: ['energia', 'bolletta', 'luce', 'gas', 'fotovoltaico'], phrases: ['Analizzo i consumi energetici…', 'Verifico le tariffe…', 'Cerco soluzioni di risparmio…'] },
];

function getContextualPhrases(userMessage) {
  if (!userMessage) return genericPhrases;
  const lower = userMessage.toLowerCase();
  for (const rule of contextRules) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      // Mescola frasi contestuali + alcune generiche
      return [...rule.phrases, 'Incrocio le informazioni…', 'Organizzo la risposta…', 'Quasi pronto…'];
    }
  }
  return genericPhrases;
}

/**
 * Animazione "sto pensando" — NON ha timer fisso.
 * Si chiude solo quando il parent chiama dismiss (via prop `dismiss`).
 * Fallback massimo a 30s per evitare blocchi.
 * `userMessage` opzionale per frasi contestuali.
 */
export default function AIThinkingAnimation({ onFinished, dismiss = false, userMessage = '' }) {
  const phrases = React.useMemo(() => getContextualPhrases(userMessage), [userMessage]);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  // Cicla le frasi ogni 2 secondi (più lento, più leggibile)
  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex(prev => (prev + 1) % thinkingPhrases.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Quando il parent dice di chiudere, fade-out e callback
  useEffect(() => {
    if (dismiss && visible) {
      setVisible(false);
      setTimeout(() => onFinished?.(), 300);
    }
  }, [dismiss]);

  // Fallback massimo 30s per evitare blocco infinito
  useEffect(() => {
    const timer = setTimeout(() => {
      if (visible) {
        setVisible(false);
        setTimeout(() => onFinished?.(), 300);
      }
    }, 30000);
    return () => clearTimeout(timer);
  }, []);

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