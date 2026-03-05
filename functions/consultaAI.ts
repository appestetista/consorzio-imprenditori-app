import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ═══════════════════════════════════════════════════════════════
// PIPELINE PULITA: GPT-4o diretto + Gemini per dati web → merge
// Obiettivo: risposte identiche a ChatGPT
// ═══════════════════════════════════════════════════════════════

async function callOpenAI(apiKey, model, messages, maxTokens, temperature) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
    signal: AbortSignal.timeout(90000),
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
    let web_search_used = false;

    // Step 1: Gemini cerca dati web aggiornati (in parallelo, non blocca)
    let webData = '';
    if (geminiKey) {
      try {
        const geminiResult = await callGeminiSearch(geminiKey, message);
        if (geminiResult.content && geminiResult.content.length > 50) {
          webData = geminiResult.content;
          totalInput += geminiResult.inputTokens;
          totalOutput += geminiResult.outputTokens;
          totalCost += calcCost('gemini', geminiResult.inputTokens, geminiResult.outputTokens);
          web_search_used = true;
        }
      } catch (e) {
        console.log('[consultaAI] Gemini search skipped:', e.message);
      }
    }

    // Step 2: GPT-4o — stessa chiamata che farebbe ChatGPT
    // Costruisco i messages esattamente come ChatGPT: nessun system prompt artificioso,
    // solo lo storico conversazione + la domanda, con eventuale contesto web iniettato
    const chatMessages = [];

    // Se Gemini ha trovato dati web, li inietto come contesto di sistema
    if (webData) {
      chatMessages.push({
        role: "system",
        content: `Di seguito trovi dati aggiornati trovati su internet relativi alla domanda dell'utente. Usali per arricchire e verificare la tua risposta, includi i link alle fonti dove rilevante. Non menzionare che ti sono stati forniti separatamente.\n\n${webData}`
      });
    }

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
    const model_used = web_search_used ? 'gpt-4o+web' : 'gpt-4o';
    const provider = web_search_used ? 'openai+gemini' : 'openai';

    const elapsed = Date.now() - startTime;
    console.log(`[consultaAI] Done in ${elapsed}ms | model=${model_used} | cost=$${totalCost.toFixed(5)} | web=${web_search_used}`);

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
      web_search_used,
    });

  } catch (e) {
    console.error('[consultaAI] Fatal:', e.message);
    return Response.json({ error: e.message, fallback: true }, { status: 500 });
  }
});