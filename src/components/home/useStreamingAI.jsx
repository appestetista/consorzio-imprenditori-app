import { useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * useStreamingAI v5 — TYPEWRITER
 *
 * Flusso:
 * 1. Chiama consultaAI via SDK (non-streaming, affidabile)
 * 2. Simula typewriter effect nel frontend (feedback visivo immediato)
 * 3. ~3-6 secondi per la risposta completa
 */

export default function useStreamingAI() {
  const abortRef = useRef(null);
  const typewriterRef = useRef(null);

  const streamAI = useCallback(async ({
    message,
    conversationHistory,
    onChunk,
    onDone,
    onError,
    onStarted,
    // onContextQuestion e onEntertainQuestions mantenuti per compatibilità
    onContextQuestion,
    onEntertainQuestions,
  }) => {
    const controller = new AbortController();
    abortRef.current = controller;

    onStarted?.();

    try {
      const aiResponse = await base44.functions.invoke('consultaAI', {
        message,
        conversationHistory: conversationHistory || '',
      });

      if (controller.signal.aborted) return;

      if (aiResponse.data?.success && aiResponse.data?.data) {
        const fullText = aiResponse.data.data;
        const metadata = {
          response_time_ms: aiResponse.data.response_time_ms,
          generated_title: aiResponse.data.generated_title || null,
        };

        // Typewriter: rivela il testo progressivamente
        // Velocità adattiva: più è lungo, più veloce per parola
        const words = fullText.split(/(\s+)/); // mantiene gli spazi
        const totalWords = words.filter(w => w.trim()).length;
        // Tempo totale typewriter: min 0.8s, max 2.5s
        const totalTime = Math.min(2500, Math.max(800, totalWords * 30));
        const intervalMs = Math.max(10, totalTime / words.length);

        let currentIndex = 0;
        let revealed = '';

        await new Promise((resolve) => {
          typewriterRef.current = setInterval(() => {
            if (controller.signal.aborted) {
              clearInterval(typewriterRef.current);
              resolve();
              return;
            }

            // Rivela 1-3 parole alla volta per fluidità
            const batch = Math.min(3, words.length - currentIndex);
            for (let i = 0; i < batch; i++) {
              if (currentIndex < words.length) {
                revealed += words[currentIndex];
                currentIndex++;
              }
            }

            onChunk(revealed, '');

            if (currentIndex >= words.length) {
              clearInterval(typewriterRef.current);
              resolve();
            }
          }, intervalMs);
        });

        // Fine: invia il testo completo + metadata
        onChunk(fullText, '');
        onDone(fullText, metadata);
      } else {
        throw new Error(aiResponse.data?.error || 'Risposta vuota dal server');
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      onError?.(e);
    }
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    if (typewriterRef.current) {
      clearInterval(typewriterRef.current);
    }
  }, []);

  return { streamAI, abort };
}