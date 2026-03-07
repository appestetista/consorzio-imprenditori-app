import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ═══════════════════════════════════════════════════════════════
// consultaAI v7 — ZERO FAILURE
//
// Strategia a 3 livelli: se un tentativo fallisce, scala automaticamente
// Livello 1: gpt-4o-mini con history (normale)
// Livello 2: gpt-4o-mini senza history, prompt ridotto (leggero)
// Livello 3: gpt-4o-mini domanda diretta, 150 token (ultra-leggero)
//
// L'utente riceve SEMPRE una risposta, mai un errore.
// ═══════════════════════════════════════════════════════════════

const SYSTEM_PROMPT_FULL = `Sei ARIA, advisor strategico per imprenditori italiani. 20 anni esperienza PMI/startup.

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

const SYSTEM_PROMPT_LIGHT = `Sei ARIA, advisor per imprenditori italiani. Rispondi in modo breve e pratico. Usa **grassetto** per i dati chiave. MAX 120 parole.`;

const SYSTEM_PROMPT_MINIMAL = `Rispondi brevemente da esperto di impresa italiana. MAX 80 parole, vai dritto al punto.`;

async function callOpenAI(apiKey, messages, maxTokens, timeoutMs) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.4,
      max_tokens: maxTokens,
      top_p: 0.9,
      frequency_penalty: 0.2,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI ${response.status}: ${errText.substring(0, 200)}`);
  }

  return response.json();
}

Deno.serve(async (req) => {
  const startTime = Date.now();

  let base44, user;
  try {
    base44 = createClientFromRequest(req);
    user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Non autorizzato' }, { status: 401 });
  } catch (e) {
    return Response.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return Response.json({ error: 'Payload non valido' }, { status: 400 });
  }

  const { message, conversationHistory } = body;
  if (!message) return Response.json({ error: 'Messaggio mancante' }, { status: 400 });

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) return Response.json({ error: 'Configurazione server mancante' }, { status: 500 });

  // ── Controllo limite token mensile ──
  const DEFAULT_TOKEN_LIMIT = 500000;
  const userTokenLimit = user.monthly_token_limit;
  // 0 = illimitato, null/undefined = default
  const effectiveLimit = (userTokenLimit === null || userTokenLimit === undefined) 
    ? DEFAULT_TOKEN_LIMIT 
    : (userTokenLimit === 0 ? Infinity : userTokenLimit);

  if (effectiveLimit !== Infinity) {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const logs = await base44.asServiceRole.entities.UsageLog.filter({ user_email: user.email }, '-created_date', 500);
      const monthLogs = logs.filter(log => {
        const logDate = new Date(log.timestamp || log.created_date);
        return logDate >= monthStart;
      });
      const usedTokens = monthLogs.reduce((sum, log) => sum + (log.input_tokens || 0) + (log.output_tokens || 0), 0);
      if (usedTokens >= effectiveLimit) {
        return Response.json({
          success: false,
          error: 'token_limit_reached',
          data: `Hai raggiunto il limite mensile di ${(effectiveLimit / 1000).toFixed(0)}k token AI. Il contatore si resetterà il 1° del prossimo mese.\n\nContatta l'amministratore per aumentare il tuo limite.`,
          used: usedTokens,
          limit: effectiveLimit,
        });
      }
    } catch (e) {
      console.warn('[consultaAI] Errore controllo limite token:', e.message);
      // Non bloccare se il controllo fallisce
    }
  }

  // ── Definizione dei 3 livelli di tentativo ──
  const attempts = [
    {
      label: 'L1-full',
      messages: () => {
        const msgs = [{ role: "system", content: SYSTEM_PROMPT_FULL }];
        if (conversationHistory?.trim()) {
          msgs.push({ role: "system", content: `CONTESTO:\n${conversationHistory.substring(0, 2000)}` });
        }
        msgs.push({ role: "user", content: message });
        return msgs;
      },
      maxTokens: 600,
      timeout: 14000,
    },
    {
      label: 'L2-light',
      messages: () => [
        { role: "system", content: SYSTEM_PROMPT_LIGHT },
        { role: "user", content: message },
      ],
      maxTokens: 350,
      timeout: 12000,
    },
    {
      label: 'L3-minimal',
      messages: () => [
        { role: "system", content: SYSTEM_PROMPT_MINIMAL },
        { role: "user", content: message.substring(0, 300) },
      ],
      maxTokens: 150,
      timeout: 10000,
    },
  ];

  let responseText = '';
  let inputTokens = 0;
  let outputTokens = 0;
  let usedLevel = '';

  for (const attempt of attempts) {
    try {
      const data = await callOpenAI(openaiKey, attempt.messages(), attempt.maxTokens, attempt.timeout);
      responseText = data.choices?.[0]?.message?.content || '';
      inputTokens = data.usage?.prompt_tokens || 0;
      outputTokens = data.usage?.completion_tokens || 0;
      usedLevel = attempt.label;

      if (responseText.trim()) break; // Successo — esci dal loop
    } catch (err) {
      console.warn(`[consultaAI] ${attempt.label} fallito: ${err.message}`);
      // Continua al prossimo livello
    }
  }

  // Se anche L3 ha fallito, genera risposta statica contestuale
  if (!responseText.trim()) {
    usedLevel = 'L4-static';
    responseText = `Ottima domanda. Al momento sto riscontrando un carico elevato — per darti una risposta precisa, ti suggerisco di riformulare in modo più specifico. Ad esempio:\n\n- Specifica **importi** o **scadenze** se la domanda è fiscale\n- Indica il **settore** o la **dimensione aziendale** se è strategica\n- Aggiungi il **contesto normativo** se è legale\n\n---\n**Approfondisci:**\n1. Come posso riformulare la mia domanda?\n2. Quali informazioni servono per una risposta precisa?`;
    console.warn('[consultaAI] Tutti i livelli falliti — risposta statica');
  }

  const elapsed = Date.now() - startTime;
  console.log(`[consultaAI] ${usedLevel} | ${elapsed}ms | ${inputTokens}+${outputTokens}tok`);

  // Log costi — fire-and-forget
  if (inputTokens > 0) {
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
      category: usedLevel,
    }).catch(() => {});
  }

  return Response.json({
    success: true,
    data: responseText,
    response_time_ms: elapsed,
  });
});