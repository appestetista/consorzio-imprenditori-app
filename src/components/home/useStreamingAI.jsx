import { useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { detectWebTrigger } from './webSearchTriggers';

/**
 * useStreamingAI v6 — TYPEWRITER + RICERCA WEB PARALLELA
 *
 * Flusso:
 * 1. Chiama consultaAI via SDK (non-streaming, affidabile)
 * 2. Simula typewriter effect nel frontend (feedback visivo immediato)
 * 3. Se rilevato trigger web → lancia ricerca web in parallelo
 * 4. Il risultato web arriva dopo via onWebSearchStart/onWebSearchDone
 */

export default function useStreamingAI() {
  const abortRef = useRef(null);
  const typewriterRef = useRef(null);

  const streamAI = useCallback(async ({
    message,
    conversationHistory,
    userEmail,
    onChunk,
    onDone,
    onError,
    onStarted,
    // onContextQuestion e onEntertainQuestions mantenuti per compatibilità
    onContextQuestion,
    onEntertainQuestions,
    // Nuove callback per ricerca web parallela
    onWebSearchStart,
    onWebSearchDone,
  }) => {
    const controller = new AbortController();
    abortRef.current = controller;

    onStarted?.();

    // Rileva se serve ricerca web parallela
    const needsWebSearch = detectWebTrigger(message);
    let webSearchPromise = null;

    if (needsWebSearch) {
      onWebSearchStart?.();
      const webStartTime = Date.now();
      // Lancia ricerca web in parallelo — non blocca la risposta LLM
      webSearchPromise = base44.integrations.Core.InvokeLLM({
        prompt: `Rispondi in italiano. Cerca informazioni aggiornate e affidabili su: ${message}\n\nFornisci dati concreti con **fonti** e **link** quando disponibili. Usa grassetto per i dati chiave. MAX 300 parole.`,
        add_context_from_internet: true,
      }).then(result => {
        // Log consumo ricerca web (stima: ~0.002 USD per InvokeLLM con web)
        base44.entities.UsageLog.create({
          user_email: userEmail || '',
          action_type: 'web_search',
          model_used: 'invoke_llm_web',
          provider: 'base44',
          input_tokens: 0,
          output_tokens: 0,
          cost_usd: 0.002,
          response_time_ms: Date.now() - webStartTime,
          timestamp: new Date().toISOString(),
          category: 'web_search',
        }).catch(() => {});
        return result;
      }).catch(err => {
        console.warn('[WebSearch] Fallita:', err?.message);
        return null;
      });
    }

    try {
      const aiResponse = await base44.functions.invoke('consultaAI', {
        message,
        conversationHistory: conversationHistory || '',
      });

      if (controller.signal.aborted) return;

      if (aiResponse.data?.success && aiResponse.data?.data) {
        const fullText = aiResponse.data.data;
        
        // Genera titolo localmente dalle prime parole del messaggio
        const autoTitle = message.length > 40 
          ? message.substring(0, 40).trim() + '...' 
          : message;
        
        const metadata = {
          response_time_ms: aiResponse.data.response_time_ms,
          generated_title: autoTitle,
        };

        // Typewriter con "primo paragrafo rapido":
        // Le prime ~30 parole appaiono velocissime (dare subito qualcosa da leggere),
        // poi il resto rallenta leggermente per un effetto naturale.
        const words = fullText.split(/(\s+)/); // mantiene gli spazi
        const totalWords = words.filter(w => w.trim()).length;
        
        // Soglia primo paragrafo: ~30 parole reali
        const fastThreshold = Math.min(60, Math.floor(words.length * 0.3)); // ~30 parole (inclusi spazi)
        const fastIntervalMs = 8;  // Molto veloce per il primo blocco
        // Resto: tempo adattivo
        const remainingWords = words.length - fastThreshold;
        const slowTotalTime = Math.min(2000, Math.max(600, remainingWords * 25));
        const slowIntervalMs = remainingWords > 0 ? Math.max(12, slowTotalTime / remainingWords) : 12;

        let currentIndex = 0;
        let revealed = '';

        await new Promise((resolve) => {
          typewriterRef.current = setInterval(() => {
            if (controller.signal.aborted) {
              clearInterval(typewriterRef.current);
              resolve();
              return;
            }

            const isFastPhase = currentIndex < fastThreshold;
            // Fase veloce: 4-5 parole alla volta; fase lenta: 2-3
            const batch = isFastPhase ? Math.min(5, words.length - currentIndex) : Math.min(3, words.length - currentIndex);
            for (let i = 0; i < batch; i++) {
              if (currentIndex < words.length) {
                revealed += words[currentIndex];
                currentIndex++;
              }
            }

            onChunk(revealed, '');

            // Quando passiamo dalla fase veloce a quella lenta, cambia intervallo
            if (!isFastPhase && currentIndex >= fastThreshold + 1) {
              clearInterval(typewriterRef.current);
              if (currentIndex >= words.length) { resolve(); return; }
              typewriterRef.current = setInterval(() => {
                if (controller.signal.aborted) { clearInterval(typewriterRef.current); resolve(); return; }
                const b = Math.min(3, words.length - currentIndex);
                for (let i = 0; i < b; i++) { if (currentIndex < words.length) { revealed += words[currentIndex]; currentIndex++; } }
                onChunk(revealed, '');
                if (currentIndex >= words.length) { clearInterval(typewriterRef.current); resolve(); }
              }, slowIntervalMs);
            }

            if (currentIndex >= words.length) {
              clearInterval(typewriterRef.current);
              resolve();
            }
          }, fastIntervalMs);
        });

        // Fine: invia il testo completo + metadata
        onChunk(fullText, '');
        onDone(fullText, metadata);

        // Se c'è una ricerca web in corso, attendi il risultato
        if (webSearchPromise) {
          const webResult = await webSearchPromise;
          if (webResult && !controller.signal.aborted) {
            const webText = typeof webResult === 'string' ? webResult : webResult?.toString?.() || '';
            onWebSearchDone?.(webText);
          } else {
            onWebSearchDone?.(null);
          }
        }
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