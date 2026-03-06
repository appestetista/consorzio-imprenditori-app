import { useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * useStreamingAI v4 — CLEAN
 *
 * Rimosso:
 * ✗ Doppio URL candidato (provava 2 URL in serie = potenziale +30s)
 * ✗ Typewriter simulato nel fallback (aggiungeva 3-5s finti)
 *
 * Flusso:
 * 1. Tenta SSE streaming via fetch diretto
 * 2. Se fallisce → fallback SDK classico (risposta immediata, no typewriter)
 */

function getAuthToken() {
  try {
    const keys = Object.keys(localStorage);
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

  const streamAI = useCallback(async ({
    message,
    conversationHistory,
    onChunk,
    onDone,
    onError,
    onContextQuestion,
    onEntertainQuestions,
    onStarted,
  }) => {
    const controller = new AbortController();
    abortRef.current = controller;

    // Usa direttamente l'SDK (non-streaming) — lo streaming SSE
    // supera i limiti CPU di Deno Deploy e causa 502 timeout.
    onStarted?.();
    try {
      const aiResponse = await base44.functions.invoke('consultaAI', {
        message,
        conversationHistory: conversationHistory || '',
      });

      if (aiResponse.data?.success && aiResponse.data?.data) {
        const fullText = aiResponse.data.data;
        onChunk(fullText, fullText);
        onDone(fullText, {
          response_time_ms: aiResponse.data.response_time_ms,
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


async function tryStreaming({
  message, conversationHistory, token, controller,
  onChunk, onDone, onContextQuestion, onEntertainQuestions, onStarted,
}) {
  // Un solo URL — Base44 espone le functions qui
  const url = `${window.location.origin}/functions/consultaAI`;

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

    // Se non funziona, fallback
    if (!response.ok) {
      console.log(`[streaming] ${url} returned ${response.status}, falling back`);
      return false;
    }

    const contentType = response.headers.get('content-type') || '';

    // Se il backend risponde con JSON classico (non SSE)
    if (contentType.includes('application/json')) {
      const json = await response.json();
      if (json.success && json.data) {
        onChunk(json.data, json.data);
        onDone(json.data, { response_time_ms: json.response_time_ms });
        return true;
      }
      return false;
    }

    // ── Stream SSE ──
    if (!response.body) return false;

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

          if (parsed.started) {
            onStarted?.();
          } else if (parsed.done) {
            metadata = parsed;
          } else if (parsed.generated_title) {
            // Titolo: salvato nei metadata, gestito dal chiamante
            if (!metadata) metadata = {};
            metadata.generated_title = parsed.generated_title;
          } else if (parsed.context_question) {
            onContextQuestion?.(parsed.context_question);
          } else if (parsed.entertain_questions) {
            onEntertainQuestions?.(parsed.entertain_questions);
          } else if (parsed.error) {
            console.error('[streaming] Server error:', parsed.error);
            // Non interrompere — potrebbe arrivare altro
          } else if (parsed.text) {
            fullText += parsed.text;
            onChunk(fullText, parsed.text);
          }
        } catch {}
      }
    }

    if (fullText) {
      onDone(fullText, metadata);
      return true;
    }

    return false;
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    console.log(`[streaming] ${url} failed:`, e.message);
    return false;
  }
}