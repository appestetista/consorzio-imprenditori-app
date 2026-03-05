import { useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Hook per streaming delle risposte AI.
 * 
 * Strategia:
 * 1. Tenta fetch diretto con streaming SSE verso l'endpoint della funzione
 * 2. Se lo streaming fallisce (401, 404, no SSE), cade sul classico base44.functions.invoke
 * 
 * Il token auth viene estratto da localStorage dove il Base44 SDK lo salva automaticamente.
 */

function getAuthToken() {
  // Il Base44 SDK salva il token JWT in localStorage
  // Cerchiamo qualsiasi chiave che contenga un JWT valido
  try {
    const keys = Object.keys(localStorage);
    // Ordina per priorità: chiavi con "token" prima
    const sorted = keys.sort((a, b) => {
      const aScore = (a.toLowerCase().includes('token') ? 2 : 0) + (a.toLowerCase().includes('auth') ? 1 : 0);
      const bScore = (b.toLowerCase().includes('token') ? 2 : 0) + (b.toLowerCase().includes('auth') ? 1 : 0);
      return bScore - aScore;
    });
    
    for (const key of sorted) {
      const val = localStorage.getItem(key);
      if (val && typeof val === 'string' && val.startsWith('ey') && val.length > 50) {
        return val;
      }
    }
  } catch {}
  return null;
}

function getFunctionURL() {
  // Costruisci l'URL della funzione basandoci sull'URL corrente dell'app
  const origin = window.location.origin;
  // Base44 espone le funzioni su vari path possibili
  // Proviamo nell'ordine: /functions/, /api/functions/
  return [
    `${origin}/functions/consultaAI`,
    `${origin}/api/functions/consultaAI`,
  ];
}

export default function useStreamingAI() {
  const abortRef = useRef(null);

  const streamAI = useCallback(async ({ message, conversationHistory, onChunk, onDone, onError }) => {
    const controller = new AbortController();
    abortRef.current = controller;
    
    const token = getAuthToken();
    const urls = getFunctionURL();
    
    // Tenta streaming via fetch diretto
    let streamingWorked = false;
    
    for (const url of urls) {
      if (streamingWorked) break;
      
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

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

        // Se 404 o 401, prova il prossimo URL
        if (response.status === 404 || response.status === 401 || response.status === 403) {
          console.log(`[streaming] ${url} returned ${response.status}, trying next...`);
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errText.substring(0, 200)}`);
        }

        const contentType = response.headers.get('content-type') || '';
        
        // Se non è SSE, trattalo come JSON classico
        if (!contentType.includes('text/event-stream')) {
          const json = await response.json();
          if (json.success && json.data) {
            streamingWorked = true;
            // Simula un effetto typewriter sul testo ricevuto tutto insieme
            const fullText = json.data;
            simulateTypewriter(fullText, onChunk, () => {
              onDone(fullText, { web_search_used: json.web_search_used, response_time_ms: json.response_time_ms });
            });
            return;
          }
          throw new Error(json.error || 'Risposta non valida');
        }

        // Stream SSE reale
        streamingWorked = true;
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
        return;

      } catch (e) {
        if (e.name === 'AbortError') return;
        console.log(`[streaming] ${url} failed:`, e.message);
        continue;
      }
    }

    // Fallback: usa base44.functions.invoke classica (nessuno streaming)
    if (!streamingWorked) {
      console.log('[streaming] Falling back to SDK invoke');
      try {
        const aiResponse = await base44.functions.invoke('consultaAI', {
          message,
          conversationHistory: conversationHistory || '',
        });
        if (aiResponse.data?.success && aiResponse.data?.data) {
          const fullText = aiResponse.data.data;
          // Simula typewriter anche sul fallback
          simulateTypewriter(fullText, onChunk, () => {
            onDone(fullText, { 
              web_search_used: aiResponse.data.web_search_used, 
              response_time_ms: aiResponse.data.response_time_ms 
            });
          });
        } else {
          throw new Error(aiResponse.data?.error || 'Risposta vuota');
        }
      } catch (e) {
        if (e.name === 'AbortError') return;
        onError?.(e);
      }
    }
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { streamAI, abort };
}

/**
 * Simula un effetto typewriter: rivela il testo blocco per blocco.
 * Usato come fallback quando il backend risponde tutto insieme.
 */
function simulateTypewriter(text, onChunk, onComplete) {
  // Dividi per paragrafi/sezioni per un reveal naturale
  const chunks = [];
  const lines = text.split('\n');
  let current = '';
  
  for (const line of lines) {
    current += line + '\n';
    // Ogni 3-5 righe o a fine sezione (##), emetti un chunk
    if (current.split('\n').length >= 4 || line.startsWith('##') || line.startsWith('---')) {
      chunks.push(current);
      current = '';
    }
  }
  if (current) chunks.push(current);

  let revealed = '';
  let i = 0;
  
  const interval = setInterval(() => {
    if (i >= chunks.length) {
      clearInterval(interval);
      onComplete();
      return;
    }
    revealed += chunks[i];
    onChunk(revealed, chunks[i]);
    i++;
  }, 80); // 80ms tra i chunk per un effetto veloce ma visibile
}