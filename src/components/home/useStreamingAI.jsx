import { useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Hook per streaming delle risposte AI via SSE.
 * 
 * Strategia:
 * 1. Tenta fetch diretto con SSE streaming
 * 2. Se fallisce → fallback su base44.functions.invoke + typewriter simulato
 */

function getAuthToken() {
  try {
    const keys = Object.keys(localStorage);
    // Cerca JWT tokens (iniziano con "ey", hanno 3 parti separate da ".")
    for (const key of keys) {
      const val = localStorage.getItem(key);
      if (val && typeof val === 'string' && val.startsWith('ey') && val.includes('.') && val.length > 50) {
        return val;
      }
    }
  } catch {}
  return null;
}

export default function useStreamingAI() {
  const abortRef = useRef(null);

  const streamAI = useCallback(async ({ message, conversationHistory, onChunk, onDone, onError, onContextQuestion, onEntertainQuestions, onStarted }) => {
    const controller = new AbortController();
    abortRef.current = controller;

    const token = getAuthToken();
    
    // Prova lo streaming diretto via fetch
    const streamingSuccess = await tryStreaming({ 
      message, conversationHistory, token, controller, onChunk, onDone, onContextQuestion, onEntertainQuestions, onStarted 
    });
    
    if (streamingSuccess) return;

    // Fallback: usa SDK classico + typewriter
    console.log('[streaming] Fallback to SDK invoke + typewriter');
    try {
      const aiResponse = await base44.functions.invoke('consultaAI', {
        message,
        conversationHistory: conversationHistory || '',
      });
      if (aiResponse.data?.success && aiResponse.data?.data) {
        if (aiResponse.data.context_question) onContextQuestion?.(aiResponse.data.context_question);
        const fullText = aiResponse.data.data;
        await typewriterReveal(fullText, onChunk);
        onDone(fullText, { 
          web_search_used: aiResponse.data.web_search_used, 
          response_time_ms: aiResponse.data.response_time_ms 
        });
      } else {
        throw new Error(aiResponse.data?.error || 'Risposta vuota');
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
      onError?.(e);
    }
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { streamAI, abort };
}

async function tryStreaming({ message, conversationHistory, token, controller, onChunk, onDone, onContextQuestion, onEntertainQuestions, onStarted }) {
  // Lista di URL candidati per raggiungere la funzione
  const origin = window.location.origin;
  const urls = [
    `${origin}/functions/consultaAI`,
    `${origin}/api/functions/consultaAI`,
  ];

  for (const url of urls) {
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

      if (response.status === 404 || response.status === 401 || response.status === 403) continue;
      if (!response.ok) continue;

      const contentType = response.headers.get('content-type') || '';

      // Se è JSON classico (non SSE), usa typewriter
      if (contentType.includes('application/json')) {
        const json = await response.json();
        if (json.success && json.data) {
          if (json.context_question) onContextQuestion?.(json.context_question);
          await typewriterReveal(json.data, onChunk);
          onDone(json.data, { web_search_used: json.web_search_used, response_time_ms: json.response_time_ms });
          return true;
        }
        continue;
      }

      // Stream SSE
      if (contentType.includes('text/event-stream') || response.body) {
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
            const payload = line.slice(6).trim();
            if (!payload) continue;

            try {
              const parsed = JSON.parse(payload);
              if (parsed.done) {
                metadata = parsed;
              } else if (parsed.generated_title) {
                // Title is part of done event, handled in metadata
              } else if (parsed.started) {
                // Backend is alive and processing — notify frontend immediately
                onStarted?.();
              } else if (parsed.context_question) {
                onContextQuestion?.(parsed.context_question);
              } else if (parsed.entertain_questions) {
                onEntertainQuestions?.(parsed.entertain_questions);
              } else if (parsed.self_check_replace) {
                // SELF_CHECK ha migliorato la risposta: sostituisci tutto il contenuto
                fullText = parsed.self_check_replace;
                onChunk(fullText, '');
              } else if (parsed.text) {
                fullText += parsed.text;
                onChunk(fullText, parsed.text);
              }
            } catch {}
          }
        }

        // Se abbiamo ricevuto testo, è andato a buon fine
        if (fullText) {
          onDone(fullText, metadata);
          return true;
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      console.log(`[streaming] ${url} failed:`, e.message);
      continue;
    }
  }

  return false;
}

/**
 * Simula typewriter: rivela il testo gradualmente dividendolo per sezioni.
 * Usato come fallback quando lo streaming SSE non è disponibile.
 */
function typewriterReveal(text, onChunk) {
  return new Promise((resolve) => {
    const lines = text.split('\n');
    const chunks = [];
    let current = '';
    
    for (const line of lines) {
      current += line + '\n';
      // Emetti chunk ogni 2-3 righe o ai titoli di sezione
      const lineCount = current.split('\n').length;
      if (lineCount >= 3 || line.startsWith('##') || line.startsWith('---') || line === '') {
        if (current.trim()) chunks.push(current);
        current = '';
      }
    }
    if (current.trim()) chunks.push(current);
    
    // Se pochi chunks, risolvi subito
    if (chunks.length <= 1) {
      onChunk(text, text);
      resolve();
      return;
    }

    let revealed = '';
    let i = 0;
    const interval = setInterval(() => {
      if (i >= chunks.length) {
        clearInterval(interval);
        resolve();
        return;
      }
      revealed += chunks[i];
      onChunk(revealed, chunks[i]);
      i++;
    }, 60);
  });
}