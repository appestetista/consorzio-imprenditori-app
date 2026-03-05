import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ═══════════════════════════════════════════════════════════════
// PIPELINE PULITA: GPT-4o diretto (no Gemini)
// ═══════════════════════════════════════════════════════════════

async function callOpenAI(apiKey, model, messages, maxTokens, temperature) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ 
      model, 
      messages, 
      temperature, 
      max_tokens: maxTokens,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI ${model} error ${response.status}: ${err.substring(0, 300)}`);
  }
  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0,
  };
}

async function callGeminiSearch(apiKey, userPrompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: `Cerca su internet i dati più aggiornati e verificati per rispondere alla domanda. Trova numeri concreti, fonti ufficiali, link. Non riassumere, dai tutti i dettagli trovati.` }] },
      generationConfig: { temperature: 0.2, maxOutputTokens: 4000 },
      tools: [{ googleSearch: {} }],
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini error ${response.status}: ${err.substring(0, 300)}`);
  }
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const usage = data.usageMetadata || {};
  return {
    content: text,
    inputTokens: usage.promptTokenCount || 0,
    outputTokens: usage.candidatesTokenCount || 0,
  };
}

function calcCost(model, inputTokens, outputTokens) {
  const rates = {
    'gpt-4o':      { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
    'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.60  / 1_000_000 },
    'gemini':      { input: 0.15 / 1_000_000, output: 0.60  / 1_000_000 },
  };
  const r = rates[model] || rates['gpt-4o-mini'];
  return (inputTokens * r.input) + (outputTokens * r.output);
}

// ═══════════════════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════════════════
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
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!openaiKey) return Response.json({ error: 'OPENAI_API_KEY non configurata' }, { status: 500 });

    let totalInput = 0;
    let totalOutput = 0;
    let totalCost = 0;

    // GPT-4o diretto con system prompt per qualità massima
    const chatMessages = [];

    chatMessages.push({
      role: "system",
      content: `Sei un assistente esperto e professionale. Rispondi sempre in italiano.

Regole fondamentali:
- Fornisci risposte COMPLETE, ESAUSTIVE e DETTAGLIATE. Non abbreviare, non riassumere, non tagliare.
- Quando fai elenchi o liste, includi TUTTI gli elementi rilevanti, non solo i principali.
- Usa formattazione markdown chiara: titoli ##, elenchi puntati, **grassetto** per concetti chiave.
- Organizza la risposta in sezioni logiche se l'argomento lo richiede.
- Fornisci esempi concreti, dati numerici e riferimenti quando possibile.
- Non dire "ecco alcuni esempi" e poi darne solo 3-4. Dai una lista completa e approfondita.
- La qualità e completezza della risposta è la priorità assoluta. Rispondi come farebbe il miglior esperto del settore.`
    });

    // Storico conversazione (se presente)
    if (conversationHistory && conversationHistory.trim()) {
      chatMessages.push({
        role: "system",
        content: `Storico conversazione precedente (per contesto):\n${conversationHistory}`
      });
    }

    // Messaggio utente
    chatMessages.push({ role: "user", content: message });

    const gptResult = await callOpenAI(openaiKey, 'gpt-4o', chatMessages, 16000, 0.7);
    totalInput += gptResult.inputTokens;
    totalOutput += gptResult.outputTokens;
    totalCost += calcCost('gpt-4o', gptResult.inputTokens, gptResult.outputTokens);

    const response_data = gptResult.content;
    const model_used = 'gpt-4o';
    const provider = 'openai';

    const elapsed = Date.now() - startTime;
    console.log(`[consultaAI] Done in ${elapsed}ms | model=${model_used} | cost=$${totalCost.toFixed(5)}`);

    // Log utilizzo
    try {
      await base44.asServiceRole.entities.UsageLog.create({
        user_email: user.email,
        action_type: 'chat_ai',
        model_used,
        provider,
        input_tokens: totalInput,
        output_tokens: totalOutput,
        cost_usd: Math.round(totalCost * 100000) / 100000,
        category: 'Generale',
        response_time_ms: elapsed,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.log('[consultaAI] UsageLog error:', e.message);
    }

    return Response.json({
      success: true,
      data: response_data,
      model_used,
      provider,
      tokens: { input: totalInput, output: totalOutput },
      cost_usd: totalCost,
      response_time_ms: elapsed,
      web_search_used: false,
    });

  } catch (e) {
    console.error('[consultaAI] Fatal:', e.message);
    return Response.json({ error: e.message, fallback: true }, { status: 500 });
  }
});