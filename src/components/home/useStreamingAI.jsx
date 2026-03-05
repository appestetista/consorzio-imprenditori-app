import { useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Hook per chiamare consultaAI in modalità streaming SSE.
 * Usa fetch diretto per leggere lo stream chunk-by-chunk.
 * Il token viene preso dal base44 SDK interno.
 */
export default function useStreamingAI() {
  const abortRef = useRef(null);

  const streamAI = useCallback(async ({ message, conversationHistory, onChunk, onDone, onError }) => {
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Primo tentativo: usa base44.functions.invoke in modalità non-streaming come fallback test
      // Ma per lo streaming vero, dobbiamo fare fetch diretto.
      
      // Ottieni URL base dalla configurazione base44 SDK
      // L'SDK usa internamente axios con un baseURL — lo estraiamo
      let baseURL = '';
      let authHeader = '';
      
      // Il modo più affidabile: chiama una funzione dummy per intercettare headers
      // Ma più semplice: il base44 client espone internamente i dati
      try {
        // base44 internamente ha un httpClient con defaults
        const client = base44._httpClient || base44.httpClient;
        if (client?.defaults) {
          baseURL = client.defaults.baseURL || '';
          const authH = client.defaults.headers?.common?.['Authorization'] || 
                        client.defaults.headers?.['Authorization'] || '';
          authHeader = authH;
        }
      } catch {}
      
      // Fallback: prova localStorage
      if (!authHeader) {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          const val = localStorage.getItem(key);
          if (val && typeof val === 'string' && val.startsWith('ey') && val.length > 100) {
            authHeader = `Bearer ${val}`;
            break;
          }
        }
      }

      // Costruisci URL — il backend function endpoint
      // Su base44, le funzioni sono accessibili via /api/functions/<name>
      const functionPath = '/api/functions/consultaAI';
      const url = baseURL ? `${baseURL}${functionPath}` : functionPath;

      const headers = { 'Content-Type': 'application/json' };
      if (authHeader) headers['Authorization'] = authHeader;

      const response = await fetch(url, {
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
        throw new Error(`HTTP ${response.status}: ${errText.substring(0, 200)}`);
      }

      // Controlla se effettivamente è uno stream SSE
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/event-stream')) {
        // Fallback: il backend ha risposto in modalità JSON classica
        const json = await response.json();
        if (json.success && json.data) {
          onDone(json.data, { web_search_used: json.web_search_used, response_time_ms: json.response_time_ms });
        } else {
          throw new Error(json.error || 'Risposta non valida');
        }
        return;
      }

      // Leggi lo stream SSE
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let metadata = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

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
          } catch {}
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