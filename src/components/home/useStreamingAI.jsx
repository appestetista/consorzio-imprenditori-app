import { useRef, useCallback } from 'react';

/**
 * Hook per chiamare consultaAI in modalità streaming SSE.
 * Restituisce una funzione `streamAI` che invoca il backend e chiama `onChunk` 
 * per ogni pezzo di testo ricevuto, e `onDone` al termine.
 *
 * NOTA: base44.functions.invoke usa axios che non supporta streaming,
 * quindi usiamo fetch diretto verso l'endpoint della funzione.
 */
export default function useStreamingAI() {
  const abortRef = useRef(null);

  const streamAI = useCallback(async ({ message, conversationHistory, onChunk, onDone, onError }) => {
    // Prendi il token di autenticazione dal localStorage (base44 lo salva lì)
    let authToken = null;
    try {
      // Base44 SDK stores auth info - try common storage keys
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.includes('token') || key.includes('auth') || key.includes('session')) {
          const val = localStorage.getItem(key);
          if (val && val.startsWith('ey')) { // JWT tokens start with "ey"
            authToken = val;
            break;
          }
        }
      }
      // Fallback: try to get from cookie
      if (!authToken) {
        const cookies = document.cookie.split(';');
        for (const c of cookies) {
          const [name, val] = c.trim().split('=');
          if (val && val.startsWith('ey')) {
            authToken = val;
            break;
          }
        }
      }
    } catch (e) {
      console.warn('[streaming] Could not find auth token');
    }

    // Costruisci URL della funzione — l'app URL è relativo
    const functionUrl = '/api/functions/consultaAI';

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message,
          conversationHistory: conversationHistory || '',
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Errore ${response.status}: ${errText.substring(0, 200)}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let metadata = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Processa linee SSE complete
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // l'ultima riga potrebbe essere incompleta

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data) continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.done) {
              metadata = parsed;
            } else if (parsed.text) {
              fullText += parsed.text;
              onChunk(fullText, parsed.text);
            }
          } catch {
            // chunk non-JSON, ignora
          }
        }
      }

      onDone(fullText, metadata);
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error('[streaming] Error:', e.message);
      onError?.(e);
    }
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { streamAI, abort };
}