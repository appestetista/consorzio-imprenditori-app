import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ═══════════════════════════════════════════════════════════════
// ROUTING: determina se serve GPT-4o (domanda complessa) o mini
// ═══════════════════════════════════════════════════════════════
const FORCE_GPT4O_PATTERNS = [
  /aliquot[ae]/i, /irpef|ires|irap/i, /ccnl/i, /contribut[io]/i,
  /busta\s*paga/i, /bilancio/i, /fatturato/i, /sanzi/i,
  /bando/i, /contratto/i, /dipendent[ei]/i,
  /(\d[\d,.]*)\s*(?:€|eur(?:o|i)?)/i,
  /inps|inail/i, /tfr/i, /scaglion/i, /detrazi|deduz/i,
  /art\.?\s*\d+|comma\s*\d+|legge\s+\d+/i,
];

function needsGpt4o(category, message) {
  const forced = ['Fiscale','Legale','Personale/HR','Investimenti','Contratti','Confronto','Strategica','Bandi'];
  if (forced.includes(category)) return true;
  if (FORCE_GPT4O_PATTERNS.some(p => p.test(message))) return true;
  return false;
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPTS
// ═══════════════════════════════════════════════════════════════
const SYSTEM_GPT4O = `Sei un consulente strategico senior specializzato in PMI italiane con 20 anni di esperienza.

COME RISPONDERE:
- Rispondi in modo DISCORSIVO e COMPLETO, minimo 600 parole
- Scrivi un testo fluido in markdown con paragrafi, elenchi puntati, numeri concreti e riferimenti normativi
- Personalizza la risposta sul profilo dell'utente se disponibile
- Spiega i termini tecnici la prima volta che li usi
- Usa "tu" e "la tua azienda", non menzionare mai di essere un'AI
- Includi calcoli dettagliati con cifre concrete
- Usa markdown: **grassetto** per concetti chiave, elenchi puntati, titoletti con ##

REGOLE ANTI-ALLUCINAZIONE (TASSATIVE):
- Se NON sei sicuro di un dato, scrivi esplicitamente "da verificare con il tuo commercialista/consulente"
- NON inventare MAI leggi, articoli, aliquote o importi
- Se non conosci un valore esatto, dai un RANGE realistico, non un numero inventato
- NON arrotondare dati fiscali: aliquote, soglie INPS, scaglioni devono essere ESATTI o non citati
- Se un bando/norma potrebbe essere scaduto, segnalalo

STRUTTURA FINALE OBBLIGATORIA:
Termina SEMPRE la risposta con una sezione:
## COSA FARE SUBITO:
(elenco di 3-5 azioni concrete e immediate che l'imprenditore può intraprendere)

Alla fine suggerisci 2-3 domande di approfondimento operative.`;

const SYSTEM_GPT4O_MINI_SIMPLE = `Sei un consulente strategico per PMI italiane. Rispondi in modo chiaro e utile.
Scrivi in markdown, usa dati concreti quando possibile. Se non sei sicuro di un dato scrivi "da verificare".
Non menzionare mai di essere un'AI. Usa "tu" e "la tua azienda".
Termina con 2-3 domande di approfondimento.`;

const SYSTEM_GEMINI_SEARCH = `Sei un ricercatore specializzato in normativa e fiscalità italiana per PMI.

IL TUO COMPITO:
Cerca su internet dati AGGIORNATI e VERIFICATI per rispondere alla domanda dell'imprenditore.

COSA CERCARE:
- Numeri concreti: aliquote, soglie, importi, scadenze
- Fonti ufficiali: siti .gov.it, Agenzia delle Entrate, INPS, INAIL, Gazzetta Ufficiale
- Bandi aperti con date di scadenza reali
- Normative vigenti con riferimenti esatti (articolo, comma, legge)
- Dati di mercato da fonti istituzionali (ISTAT, Camere di Commercio, Eurostat)

REGOLE:
- NON riassumere: dai TUTTI i dettagli trovati
- Cita SEMPRE la fonte e l'URL
- Se trovi dati contrastanti, riporta entrambe le versioni con le rispettive fonti
- NON inventare dati: se non trovi qualcosa, scrivi "non trovato"
- Preferisci fonti del 2025-2026, segnala se i dati sono più vecchi`;

const SYSTEM_MERGE = `Sei un editor esperto che fonde due analisi in una risposta unica e professionale per un imprenditore italiano.

RICEVI:
1. ANALISI CONSULENTE: un'analisi approfondita di un consulente strategico
2. DATI INTERNET: dati aggiornati trovati su internet con fonti

IL TUO COMPITO:
- Fondi le due fonti in UNA SOLA risposta fluida e coerente in markdown
- Se i dati internet CORREGGONO o AGGIORNANO l'analisi del consulente, USA I DATI INTERNET (sono più recenti)
- Se ci sono CONTRADDIZIONI, segnalale brevemente: "Nota: i dati più recenti indicano..."
- NON rivelare MAI che hai usato due fonti separate — scrivi come se fosse un'unica analisi
- Mantieni lo stile discorsivo e diretto ("tu", "la tua azienda")
- Conserva TUTTI i calcoli e i numeri concreti da entrambe le fonti
- Conserva i riferimenti normativi e le fonti web
- Mantieni la sezione "COSA FARE SUBITO:" alla fine
- Termina con 2-3 domande di approfondimento operative
- La risposta deve essere LUNGA e COMPLETA (minimo 600 parole)`;

// ═══════════════════════════════════════════════════════════════
// CHIAMATE API
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
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: SYSTEM_GEMINI_SEARCH }] },
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
// HANDLER PRINCIPALE
// ═══════════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  const startTime = Date.now();

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

    const useGpt4o = needsGpt4o(category || '', message);
    const fullUserPrompt = `${conversationHistory || ''}${kbContent || ''}${userContext || ''}Categoria: ${category || 'Generale'} — ${sottocategoria || ''}.\nDomanda: ${message}`;

    let response_data = '';
    let model_used = '';
    let provider = '';
    let totalInput = 0;
    let totalOutput = 0;
    let totalCost = 0;
    let web_search_used = false;

    // ─────────────────────────────────────────────
    // CASO 1: Domanda semplice → solo GPT-4o-mini
    // ─────────────────────────────────────────────
    if (!useGpt4o) {
      console.log('[consultaAI] Caso 1: GPT-4o-mini (domanda semplice)');
      const result = await callOpenAI(openaiKey, 'gpt-4o-mini', SYSTEM_GPT4O_MINI_SIMPLE, fullUserPrompt, 6000, 0.4);
      response_data = result.content;
      model_used = 'gpt-4o-mini';
      provider = 'openai';
      totalInput = result.inputTokens;
      totalOutput = result.outputTokens;
      totalCost = calcCost('gpt-4o-mini', result.inputTokens, result.outputTokens);
    }

    // ─────────────────────────────────────────────
    // CASO 2: Complessa + Gemini → PARALLELO + MERGE
    // ─────────────────────────────────────────────
    else if (geminiKey) {
      console.log('[consultaAI] Caso 2: Parallelo GPT-4o + Gemini → Merge');

      // Lancio parallelo
      const [gptResult, geminiResult] = await Promise.allSettled([
        callOpenAI(openaiKey, 'gpt-4o', SYSTEM_GPT4O, fullUserPrompt, 8000, 0.4),
        callGeminiSearch(geminiKey, fullUserPrompt),
      ]);

      const gptOk = gptResult.status === 'fulfilled';
      const geminiOk = geminiResult.status === 'fulfilled';

      if (!gptOk) console.error('[consultaAI] GPT-4o fallito:', gptResult.reason?.message);
      if (!geminiOk) console.error('[consultaAI] Gemini fallito:', geminiResult.reason?.message);

      // Entrambi falliti → errore
      if (!gptOk && !geminiOk) {
        throw new Error('Sia GPT-4o che Gemini sono falliti');
      }

      const gptData = gptOk ? gptResult.value : null;
      const geminiData = geminiOk ? geminiResult.value : null;

      // Accumula token delle chiamate parallele
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

      // Se entrambi OK → merge con GPT-4o-mini
      if (gptOk && geminiOk) {
        console.log('[consultaAI] Merge: GPT-4o-mini fonde le due risposte');
        const mergePrompt = `ANALISI CONSULENTE:\n${gptData.content}\n\n---\n\nDATI INTERNET (con fonti):\n${geminiData.content}\n\n---\n\nDomanda originale: ${message}`;
        
        const mergeResult = await callOpenAI(openaiKey, 'gpt-4o-mini', SYSTEM_MERGE, mergePrompt, 10000, 0.3);
        response_data = mergeResult.content;
        model_used = 'gpt-4o+gemini+merge';
        provider = 'openai+gemini';
        totalInput += mergeResult.inputTokens;
        totalOutput += mergeResult.outputTokens;
        totalCost += calcCost('gpt-4o-mini', mergeResult.inputTokens, mergeResult.outputTokens);
      }
      // Solo GPT-4o OK → usa quello
      else if (gptOk) {
        console.log('[consultaAI] Fallback: solo GPT-4o (Gemini fallito)');
        response_data = gptData.content;
        model_used = 'gpt-4o';
        provider = 'openai';
      }
      // Solo Gemini OK → usa quello
      else {
        console.log('[consultaAI] Fallback: solo Gemini (GPT-4o fallito)');
        response_data = geminiData.content;
        model_used = 'gemini-2.5-flash';
        provider = 'gemini';
      }
    }

    // ─────────────────────────────────────────────
    // CASO 3: Complessa senza Gemini → solo GPT-4o
    // ─────────────────────────────────────────────
    else {
      console.log('[consultaAI] Caso 3: Solo GPT-4o (no Gemini key)');
      const result = await callOpenAI(openaiKey, 'gpt-4o', SYSTEM_GPT4O, fullUserPrompt, 8000, 0.4);
      response_data = result.content;
      model_used = 'gpt-4o';
      provider = 'openai';
      totalInput = result.inputTokens;
      totalOutput = result.outputTokens;
      totalCost = calcCost('gpt-4o', result.inputTokens, result.outputTokens);
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
        category: category || 'Generale',
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