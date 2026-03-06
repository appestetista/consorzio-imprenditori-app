import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ═══════════════════════════════════════════════════════════════
// consultaAI v4 — CLEAN & FAST
//
// Obiettivo: risposta in < 5 secondi (first token < 2s)
//
// Rimosso (ogni voce aggiungeva 2-15 sec):
// ✗ SELF_CHECK (riscriveva la risposta con GPT-4o-mini)
// ✗ normalizeQuery (normalizzava con Gemini)
// ✗ Cache lookup (Gemini + DB)
// ✗ Entertain questions (Gemini)
// ✗ Clarification (Gemini)
// ✗ Router (Gemini)
//
// Resta:
// ✓ GPT-4o streaming diretto
// ✓ System prompt snello
// ✓ Titolo + suggerimenti via Gemini (DOPO lo stream, non bloccanti)
// ✓ UsageLog (fire-and-forget)
// ✓ Fallback non-streaming
// ═══════════════════════════════════════════════════════════════


// ── Gemini Flash: usato SOLO per titolo e suggerimenti post-risposta ──
async function geminiFlash(apiKey, systemPrompt, userPrompt, opts = {}) {
  const { temperature = 0.3, maxOutputTokens = 100, timeout = 5000 } = opts;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature, maxOutputTokens },
    }),
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) throw new Error(`Gemini error ${response.status}`);
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const usage = data.usageMetadata || {};
  return { text: text.trim(), inputTokens: usage.promptTokenCount || 0, outputTokens: usage.candidatesTokenCount || 0 };
}


// ── Calcolo costo per UsageLog ──
function calcCost(model, inputTokens, outputTokens) {
  const rates = {
    'gpt-4o':       { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
    'gemini-flash': { input: 0.15 / 1_000_000, output: 0.60  / 1_000_000 },
  };
  const r = rates[model] || rates['gemini-flash'];
  return (inputTokens * r.input) + (outputTokens * r.output);
}


// ── System prompt snello (~600 char invece di ~2000) ──
function buildSystemPrompt() {
  return `Sei ARIA, consulente strategico per PMI italiane.

REGOLE:
- Italiano professionale, tono diretto e autorevole
- Vai dritto al punto, mai frasi vuote ("Certo!", "Ottima domanda!")
- Dai del "tu" professionale, niente emoji
- **Grassetto** per concetti chiave, cifre, termini importanti
- Paragrafi brevi (max 3-4 frasi), elenchi puntati quando utili
- Dati concreti, numeri reali, nomi di strumenti/portali
- Per temi legali/fiscali: menziona sempre le implicazioni pratiche
- Se non sai qualcosa con certezza, dillo chiaramente

CONTESTO: normativa italiana ed europea, GDPR, fatturazione elettronica, PEC, SPID/CIE, regime forfettario, crediti d'imposta.`;
}


// ── Titolo conversazione (post-stream, non bloccante) ──
async function generateTitle(geminiKey, message, responseText) {
  return await geminiFlash(geminiKey,
    `Genera un titolo breve (max 8 parole) che descriva il tema della domanda. Solo il titolo, nient'altro.`,
    `Domanda: "${message}"\nRisposta: "${responseText.substring(0, 200)}"`,
    { temperature: 0.2, maxOutputTokens: 30, timeout: 4000 }
  );
}


// ── Suggerimenti di approfondimento (post-stream, non bloccanti) ──
async function generateSuggestions(geminiKey, message, responseText) {
  return await geminiFlash(geminiKey,
    `Genera 2 suggerimenti di approfondimento. Formato: suggerimento1|||suggerimento2
Regole: max 10 parole ciascuno, specifici, pronti come nuovo prompt. Solo il testo.`,
    `Domanda: "${message}"\nRisposta: "${responseText.substring(0, 400)}"`,
    { temperature: 0.5, maxOutputTokens: 60, timeout: 4000 }
  );
}


// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  const startTime = Date.now();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Non autorizzato' }, { status: 401 });

    const body = await req.json();
    const { message, conversationHistory, stream } = body;
    if (!message) return Response.json({ error: 'Messaggio mancante' }, { status: 400 });

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!openaiKey) return Response.json({ error: 'OPENAI_API_KEY non configurata' }, { status: 500 });

    let totalInput = 0;
    let totalOutput = 0;
    let totalCost = 0;

    // ── Prepara i messaggi per GPT-4o ──
    const systemPrompt = buildSystemPrompt();
    const chatMessages = [{ role: "system", content: systemPrompt }];

    // History troncata a 6000 char (era 12000 — meno token = più veloce)
    const truncatedHistory = conversationHistory ? conversationHistory.substring(0, 6000) : '';
    if (truncatedHistory.trim()) {
      chatMessages.push({
        role: "system",
        content: `CONVERSAZIONE PRECEDENTE:\n${truncatedHistory}`
      });
    }
    chatMessages.push({ role: "user", content: message });


    // ══════════════════════════════════════
    // STREAMING MODE (path principale)
    // ══════════════════════════════════════
    if (stream) {
      const encoder = new TextEncoder();
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      let writerClosed = false;

      const sendSSE = async (data) => {
        if (writerClosed) return;
        try {
          await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { writerClosed = true; }
      };

      const closeWriter = async () => {
        if (writerClosed) return;
        writerClosed = true;
        try { await writer.close(); } catch {}
      };

      // Processa in background — la Response viene restituita subito
      (async () => {
        try {
          // STEP 1: SSE "started" immediato
          await sendSSE({ started: true });
          console.log(`[consultaAI] SSE started in ${Date.now() - startTime}ms`);

          // STEP 2: Lancia GPT-4o streaming SUBITO
          const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: chatMessages,
              temperature: 0.3,
              max_tokens: 1000,
              top_p: 0.85,
              frequency_penalty: 0.3,
              presence_penalty: 0.15,
              stream: true,
            }),
            signal: AbortSignal.timeout(30000),
          });

          if (!openaiResponse.ok) {
            const err = await openaiResponse.text().catch(() => 'Unknown error');
            console.error(`[consultaAI] OpenAI error: ${openaiResponse.status}`);
            await sendSSE({ error: `Errore AI (${openaiResponse.status})` });
            await closeWriter();
            return;
          }

          // STEP 3: Leggi lo stream GPT-4o e inoltra i token al frontend
          const decoder = new TextDecoder();
          const reader = openaiResponse.body.getReader();
          let fullContent = '';
          let firstTokenSent = false;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value, { stream: true });
            const lines = text.split('\n');

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const payload = line.slice(6).trim();
              if (payload === '[DONE]') continue;

              try {
                const parsed = JSON.parse(payload);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  if (!firstTokenSent) {
                    console.log(`[consultaAI] First token in ${Date.now() - startTime}ms`);
                    firstTokenSent = true;
                  }
                  fullContent += delta;
                  await sendSSE({ text: delta });
                }
                if (parsed.usage) {
                  totalInput += parsed.usage.prompt_tokens || 0;
                  totalOutput += parsed.usage.completion_tokens || 0;
                }
              } catch {}
            }
          }

          // STEP 4: Stream GPT-4o finito — invia "done" SUBITO
          const elapsed = Date.now() - startTime;
          console.log(`[consultaAI] Stream complete in ${elapsed}ms (${fullContent.length} chars)`);
          await sendSSE({ done: true, response_time_ms: elapsed });

          // STEP 5: Titolo + suggerimenti in parallelo (non bloccano l'utente)
          if (geminiKey) {
            try {
              const [titleResult, sugResult] = await Promise.all([
                generateTitle(geminiKey, message, fullContent).catch(() => null),
                generateSuggestions(geminiKey, message, fullContent).catch(() => null),
              ]);

              if (titleResult?.text) {
                totalInput += titleResult.inputTokens;
                totalOutput += titleResult.outputTokens;
                totalCost += calcCost('gemini-flash', titleResult.inputTokens, titleResult.outputTokens);
                await sendSSE({ generated_title: titleResult.text });
              }

              if (sugResult?.text) {
                totalInput += sugResult.inputTokens;
                totalOutput += sugResult.outputTokens;
                totalCost += calcCost('gemini-flash', sugResult.inputTokens, sugResult.outputTokens);
                const sugLines = sugResult.text.split('|||').map(s => s.trim()).filter(s => s.length > 3);
                if (sugLines.length > 0) {
                  const sugBlock = '\n\n---\n**SUGGERIMENTI**\n\n' + sugLines.map((s, i) => `${i + 1}. ${s}`).join('\n');
                  await sendSSE({ text: sugBlock });
                }
              }
            } catch {}
          }

          // Log costi (fire-and-forget)
          totalCost += calcCost('gpt-4o', totalInput, totalOutput);
          base44.asServiceRole.entities.UsageLog.create({
            user_email: user.email,
            action_type: 'chat_ai',
            model_used: 'gpt-4o',
            provider: 'openai',
            input_tokens: totalInput,
            output_tokens: totalOutput,
            cost_usd: Math.round(totalCost * 100000) / 100000,
            response_time_ms: Date.now() - startTime,
            timestamp: new Date().toISOString(),
          }).catch(() => {});

        } catch (e) {
          console.error('[consultaAI] Stream error:', e.message);
          await sendSSE({ error: e.message }).catch(() => {});
        } finally {
          await closeWriter();
        }
      })();

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }


    // ══════════════════════════════════════
    // NON-STREAMING MODE (fallback SDK)
    // ══════════════════════════════════════
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: chatMessages,
        temperature: 0.3,
        max_tokens: 1000,
        top_p: 0.85,
        frequency_penalty: 0.3,
        presence_penalty: 0.15,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!openaiResponse.ok) {
      const err = await openaiResponse.text();
      throw new Error(`OpenAI error ${openaiResponse.status}: ${err.substring(0, 200)}`);
    }

    const data = await openaiResponse.json();
    const responseData = data.choices?.[0]?.message?.content || '';
    totalInput = data.usage?.prompt_tokens || 0;
    totalOutput = data.usage?.completion_tokens || 0;
    totalCost = calcCost('gpt-4o', totalInput, totalOutput);

    const elapsed = Date.now() - startTime;
    console.log(`[consultaAI] Non-stream complete in ${elapsed}ms`);

    // Log costi (fire-and-forget)
    base44.asServiceRole.entities.UsageLog.create({
      user_email: user.email,
      action_type: 'chat_ai',
      model_used: 'gpt-4o',
      provider: 'openai',
      input_tokens: totalInput,
      output_tokens: totalOutput,
      cost_usd: Math.round(totalCost * 100000) / 100000,
      response_time_ms: elapsed,
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    return Response.json({
      success: true,
      data: responseData,
      response_time_ms: elapsed,
    });

  } catch (e) {
    console.error('[consultaAI] Fatal:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
});
