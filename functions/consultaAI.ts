import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPTS
// ═══════════════════════════════════════════════════════════════
const SYSTEM_PROMPT = `Sei un assistente esperto e affidabile. Rispondi in modo completo, dettagliato e accurato. Regole: 1. Ogni numero che citi deve essere reale e verificabile. Se non sei sicuro, scrivi un range o "dato da verificare" — mai inventare. 2. Non arrotondare cifre ufficiali. 3. Non citare articoli di legge o fonti se non sei certo che esistano. 4. Rispondi nella lingua della domanda. 5. Non menzionare mai di essere un'intelligenza artificiale.`;

const SYSTEM_GEMINI = `Cerca su internet dati aggiornati e verificati per rispondere alla domanda. Trova numeri concreti, aliquote, soglie, importi, scadenze. Trova fonti ufficiali: siti .gov.it, Agenzia Entrate, INPS, Gazzetta Ufficiale. Per ogni dato indica la fonte e il link. Se trovi dati contrastanti riporta entrambi. Non riassumere, dai tutti i dettagli.`;

const SYSTEM_MERGE = `Hai due testi: un'analisi di consulenza e dei dati trovati su internet. Fondili in un'unica risposta completa e naturale. Se i dati internet sono più aggiornati, usa quelli. Se ci sono contraddizioni, segnalale. Non rivelare mai che hai usato due fonti separate. Mantieni il tono di un consulente che parla al suo cliente. Includi i link alle fonti dove rilevante.`;

// ═══════════════════════════════════════════════════════════════
// API CALLS
// ═══════════════════════════════════════════════════════════════
async function callOpenAI(apiKey, model, systemPrompt, userPrompt, maxTokens, temperature) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature,
      max_tokens: maxTokens,
    }),
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
      systemInstruction: { parts: [{ text: SYSTEM_GEMINI }] },
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

// ═══════════════════════════════════════════════════════════════
// COSTI
// ═══════════════════════════════════════════════════════════════
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
// HANDLER — SEMPRE GPT-4o + Gemini Search → Merge
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

    const fullUserPrompt = `${conversationHistory || ''}Domanda: ${message}`;

    let response_data = '';
    let model_used = '';
    let provider = '';
    let totalInput = 0;
    let totalOutput = 0;
    let totalCost = 0;
    let web_search_used = false;

    // SEMPRE: GPT-4o + Gemini in parallelo → Merge
    console.log('[consultaAI] GPT-4o + Gemini → Merge');

    const [gptResult, geminiResult] = await Promise.allSettled([
      callOpenAI(openaiKey, 'gpt-4o', SYSTEM_PROMPT, fullUserPrompt, 12000, 0.7),
      geminiKey ? callGeminiSearch(geminiKey, fullUserPrompt) : Promise.reject(new Error('No Gemini key')),
    ]);

    const gptOk = gptResult.status === 'fulfilled';
    const geminiOk = geminiResult.status === 'fulfilled';

    if (!gptOk) console.error('[consultaAI] GPT-4o fallito:', gptResult.reason?.message);
    if (!geminiOk) console.error('[consultaAI] Gemini fallito:', geminiResult.reason?.message);

    if (!gptOk && !geminiOk) {
      throw new Error('Sia GPT-4o che Gemini sono falliti');
    }

    const gptData = gptOk ? gptResult.value : null;
    const geminiData = geminiOk ? geminiResult.value : null;

    if (gptData) {
      totalInput += gptData.inputTokens;
      totalOutput += gptData.outputTokens;
      totalCost += calcCost('gpt-4o', gptData.inputTokens, gptData.outputTokens);
    }
    if (geminiData) {
      totalInput += geminiData.inputTokens;
      totalOutput += geminiData.outputTokens;
      totalCost += calcCost('gemini', geminiData.inputTokens, geminiData.outputTokens);
      web_search_used = true;
    }

    if (gptOk && geminiOk) {
      // Merge
      const mergePrompt = `ANALISI CONSULENTE:\n${gptData.content}\n\n---\n\nDATI INTERNET:\n${geminiData.content}\n\n---\n\nDomanda originale: ${message}`;
      const mergeResult = await callOpenAI(openaiKey, 'gpt-4o-mini', SYSTEM_MERGE, mergePrompt, 12000, 0.5);
      response_data = mergeResult.content;
      model_used = 'gpt-4o+gemini+merge';
      provider = 'openai+gemini';
      totalInput += mergeResult.inputTokens;
      totalOutput += mergeResult.outputTokens;
      totalCost += calcCost('gpt-4o-mini', mergeResult.inputTokens, mergeResult.outputTokens);
    } else if (gptOk) {
      response_data = gptData.content;
      model_used = 'gpt-4o';
      provider = 'openai';
    } else {
      response_data = geminiData.content;
      model_used = 'gemini-2.5-flash';
      provider = 'gemini';
    }

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