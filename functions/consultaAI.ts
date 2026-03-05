import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const SYSTEM_PROMPT = `Sei un consulente strategico senior specializzato in PMI italiane con 20 anni di esperienza.

COME RISPONDERE:
Rispondi in modo DISCORSIVO e COMPLETO, come una risposta lunga e dettagliata di un esperto.
Scrivi un testo fluido in markdown con paragrafi, elenchi puntati, numeri concreti e riferimenti normativi dove necessario.
NON usare un formato a sezioni rigide. Scrivi come parleresti a un imprenditore nel tuo studio.

REGOLE:
1. Usa dati concreti: cifre, aliquote, articoli di legge, nomi di bandi reali
2. Se NON trovi un dato, dillo chiaramente — NON inventare MAI
3. Aliquote fiscali, soglie INPS, importi di legge: usa valori ESATTI, non arrotondare
4. Se conosci il profilo dell'utente (settore, fatturato, dipendenti): personalizza la risposta
5. Spiega i termini tecnici la prima volta che li usi

DATI WEB FORNITI:
Ti verranno forniti dati trovati su internet da un altro sistema. USA quei dati come base, verificali e integra con le tue conoscenze.

STILE:
- Linguaggio diretto, usa "tu" e "la tua azienda"
- Non menzionare mai di essere un'AI
- La risposta deve essere LUNGA e DETTAGLIATA (almeno 400-600 parole)
- Usa markdown: **grassetto** per concetti chiave, elenchi puntati, titoletti con ##
- Alla fine suggerisci 2-3 domande di approfondimento operative`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    risposta: { type: "string", description: "Testo completo in markdown, discorsivo, dettagliato, almeno 400 parole" },
    followup_questions: { type: "array", items: { type: "string" }, description: "2-3 proposte operative concrete" },
    categoria: { type: "string" }
  },
  required: ["risposta", "followup_questions", "categoria"]
};

const FORCE_GPT4O_PATTERNS = [
  /quant[oi]\s+(cost|pag|risparmi|vers)/i,
  /aliquot[ae]/i, /irpef|ires|irap|inps|inail/i,
  /scaglion[ei]/i, /detrazi|deduz/i,
  /contribut[io]/i, /busta\s*paga/i,
  /ccnl|livello\s+\d/i, /tfr|trattamento/i,
  /sanzi|multa|penal/i,
  /\d+[\.,]?\d*\s*€/i,
  /art\.?\s*\d+|comma\s*\d+|legge\s+\d+/i,
  /bilancio|fatturato|utile|perdita/i,
];

function needsGpt4o(category, message) {
  const forcedCategories = ['Fiscale','Legale','Personale/HR','Investimenti','Contratti','Confronto','Strategica'];
  if (forcedCategories.includes(category)) return true;
  if (FORCE_GPT4O_PATTERNS.some(p => p.test(message))) return true;
  return false;
}

async function callGeminiSearch(apiKey, question, userContext) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
  const searchPrompt = `Cerca su internet dati aggiornati per rispondere a questa domanda di un imprenditore italiano.
${userContext}
Domanda: ${question}

Restituisci SOLO i dati trovati in formato JSON:
{
  "dati_trovati": [
    { "dato": "descrizione del dato", "valore": "il valore trovato", "fonte": "nome fonte", "url": "link", "data_aggiornamento": "quando" }
  ],
  "normative_rilevanti": [
    { "nome": "nome legge/norma", "riferimento": "art. X legge Y", "contenuto_chiave": "cosa dice" }
  ],
  "bandi_aperti": [
    { "nome": "nome bando", "importo": "cifra", "scadenza": "data", "url": "link" }
  ]
}
Se non trovi dati per una sezione, lascia l'array vuoto. NON inventare dati.`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: searchPrompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 3000, responseMimeType: "application/json" },
      tools: [{ googleSearch: {} }]
    }),
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) {
    console.error('[consultaAI] Gemini search error:', response.status);
    return null;
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const usage = data.usageMetadata || {};
  return { content: text, inputTokens: usage.promptTokenCount || 0, outputTokens: usage.candidatesTokenCount || 0 };
}

async function callOpenAI(apiKey, model, systemPrompt, userPrompt, maxTokens, temperature) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      temperature: temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_schema", json_schema: { name: "consulenza_response", strict: false, schema: RESPONSE_SCHEMA } }
    }),
    signal: AbortSignal.timeout(90000)
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error('OpenAI error: ' + response.status + ' - ' + errText.substring(0, 200));
  }
  const data = await response.json();
  return { content: data.choices?.[0]?.message?.content || '', inputTokens: data.usage?.prompt_tokens || 0, outputTokens: data.usage?.completion_tokens || 0 };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Non autorizzato' }, { status: 401 });

    const body = await req.json();
    const { message, category, sottocategoria, userContext, kbContent, conversationHistory } = body;
    if (!message) return Response.json({ error: 'Messaggio mancante' }, { status: 400 });

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!openaiKey) return Response.json({ error: 'OPENAI_API_KEY non configurata' }, { status: 500 });

    const startTime = Date.now();
    const useGpt4o = needsGpt4o(category || 'default', message);
    let geminiData = null;
    let geminiTokens = { input: 0, output: 0 };

    // STEP 1: Gemini cerca dati web (se la key esiste)
    if (geminiKey) {
      try {
        console.log('[consultaAI] Step 1: Gemini web search...');
        const geminiResult = await callGeminiSearch(geminiKey, message, userContext || '');
        if (geminiResult && geminiResult.content) {
          geminiData = geminiResult.content;
          geminiTokens = { input: geminiResult.inputTokens, output: geminiResult.outputTokens };
          console.log('[consultaAI] Gemini trovato dati:', geminiData.substring(0, 200));
        }
      } catch (e) {
        console.log('[consultaAI] Gemini search fallito (non bloccante):', e.message);
      }
    }

    // STEP 2: GPT elabora risposta finale con dati Gemini
    const webDataBlock = geminiData ? `\n\nDATI TROVATI SU INTERNET (verificati da Google):\n${geminiData}\n\nUsa questi dati come base per la tua analisi. Verifica che siano coerenti con le tue conoscenze e integra dove necessario.\n` : '';
    const model = useGpt4o ? 'gpt-4o' : 'gpt-4o-mini';
    const maxTokens = useGpt4o ? 8000 : 6000;
    const temperature = 0.5;

    const userPrompt = `${conversationHistory || ''}${kbContent || ''}${userContext || ''}${webDataBlock}Categoria: ${category || 'Generale'} — ${sottocategoria || ''}.\nDomanda: ${message}`;

    console.log('[consultaAI] Step 2: ' + model + ' analisi finale...');
    const gptResult = await callOpenAI(openaiKey, model, SYSTEM_PROMPT, userPrompt, maxTokens, temperature);
    const elapsed = Date.now() - startTime;

    // Parse risposta
    let parsed;
    try {
      let content = gptResult.content.trim();
      if (content.startsWith('```')) content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      parsed = JSON.parse(content);
    } catch (e) { parsed = null; }

    // Calcola costo totale (Gemini + GPT)
    const geminiCost = (geminiTokens.input * 0.00000015) + (geminiTokens.output * 0.0000006);
    const gptCost = model === 'gpt-4o' ? (gptResult.inputTokens * 0.0000025) + (gptResult.outputTokens * 0.00001) : (gptResult.inputTokens * 0.00000015) + (gptResult.outputTokens * 0.0000006);
    const totalCost = geminiCost + gptCost;

    // Log utilizzo
    try {
      await base44.asServiceRole.entities.UsageLog.create({
        user_email: user.email, action_type: 'chat_ai', model_used: model, provider: geminiData ? 'gemini+openai' : 'openai',
        input_tokens: geminiTokens.input + gptResult.inputTokens, output_tokens: geminiTokens.output + gptResult.outputTokens,
        cost_usd: Math.round(totalCost * 100000) / 100000, category: category || 'Generale', response_time_ms: elapsed, timestamp: new Date().toISOString(),
      });
    } catch (e) { console.log('[consultaAI] UsageLog skip:', e.message); }

    return Response.json({
      success: true, data: parsed || gptResult.content, model_used: model, provider: geminiData ? 'gemini+openai' : 'openai',
      tokens: { input: geminiTokens.input + gptResult.inputTokens, output: geminiTokens.output + gptResult.outputTokens },
      cost_usd: totalCost, response_time_ms: elapsed, web_search_used: !!geminiData,
    });

  } catch (e) {
    console.error('[consultaAI] Error:', e.message);
    return Response.json({ error: e.message, fallback: true }, { status: 500 });
  }
});