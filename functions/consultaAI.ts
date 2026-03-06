import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ═══════════════════════════════════════════════════════════════
// consultaAI v6 — ULTRA FAST
//
// Obiettivo: risposta completa in < 5 secondi
// Modello: gpt-4o-mini (3-5x più veloce, costo 15x inferiore)
// Nessun post-processing: titolo generato lato frontend
// ═══════════════════════════════════════════════════════════════

function buildSystemPrompt() {
  return `Sei ARIA, advisor strategico per imprenditori italiani. 20 anni esperienza PMI/startup.

REGOLE ASSOLUTE:
- Risposta diretta in 1-2 frasi iniziali
- Dettagli pratici con **grassetto** su cifre chiave
- Elenchi puntati per azioni/confronti
- Chiudi con 1 AZIONE CONCRETA da fare oggi
- MAX 200 parole, denso e preciso
- Tono diretto, dai del "tu", zero fuffa/emoji
- Numeri concreti sempre. Se incerti, segnalalo
- Competenze: fiscalità IT, gestione aziendale, normativa, FE/PEC, finanza agevolata, HR

Alla fine:
---
**Approfondisci:**
1. [domanda]
2. [domanda]`;
}

Deno.serve(async (req) => {
  const startTime = Date.now();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Non autorizzato' }, { status: 401 });

    const body = await req.json();
    const { message, conversationHistory } = body;
    if (!message) return Response.json({ error: 'Messaggio mancante' }, { status: 400 });

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return Response.json({ error: 'OPENAI_API_KEY non configurata' }, { status: 500 });

    const chatMessages = [{ role: "system", content: buildSystemPrompt() }];

    // History compatta: 2000 char max per ridurre token e latenza
    if (conversationHistory?.trim()) {
      const trimmedHistory = conversationHistory.substring(0, 2000);
      chatMessages.push({
        role: "system",
        content: `CONTESTO:\n${trimmedHistory}`
      });
    }
    chatMessages.push({ role: "user", content: message });

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: chatMessages,
        temperature: 0.4,
        max_tokens: 600,
        top_p: 0.9,
        frequency_penalty: 0.2,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!openaiResponse.ok) {
      const err = await openaiResponse.text();
      throw new Error(`OpenAI ${openaiResponse.status}: ${err.substring(0, 200)}`);
    }

    const data = await openaiResponse.json();
    const responseText = data.choices?.[0]?.message?.content || '';
    const inputTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;

    const elapsed = Date.now() - startTime;
    console.log(`[consultaAI] ${elapsed}ms | ${inputTokens}+${outputTokens}tok | ${responseText.length}ch`);

    // Log costi — fire-and-forget, non rallenta la risposta
    const cost = (inputTokens * 0.15 + outputTokens * 0.60) / 1_000_000;
    base44.asServiceRole.entities.UsageLog.create({
      user_email: user.email,
      action_type: 'chat_ai',
      model_used: 'gpt-4o-mini',
      provider: 'openai',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: Math.round(cost * 100000) / 100000,
      response_time_ms: elapsed,
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    return Response.json({
      success: true,
      data: responseText,
      response_time_ms: elapsed,
    });

  } catch (e) {
    console.error('[consultaAI] Fatal:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
});