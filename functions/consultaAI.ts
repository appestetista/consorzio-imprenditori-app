import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ═══════════════════════════════════════════════════════════════
// PIPELINE: Gemini Search (contesto web) → GPT-4o (risposta finale)
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
      top_p: 0.95,
      frequency_penalty: 0.3,
      presence_penalty: 0.2,
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
    'chatgpt-4o-latest': { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
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
    let webSearchUsed = false;
    let webContext = '';

    // ── STEP 1: Gemini Search per contesto web aggiornato ──
    if (geminiKey) {
      try {
        console.log('[consultaAI] Gemini Search in corso...');
        const geminiResult = await callGeminiSearch(geminiKey, message);
        if (geminiResult.content && geminiResult.content.length > 50) {
          webContext = geminiResult.content;
          webSearchUsed = true;
          totalInput += geminiResult.inputTokens;
          totalOutput += geminiResult.outputTokens;
          totalCost += calcCost('gemini', geminiResult.inputTokens, geminiResult.outputTokens);
          console.log(`[consultaAI] Gemini Search OK: ${geminiResult.content.length} chars`);
        }
      } catch (e) {
        console.log('[consultaAI] Gemini Search fallito (continuo senza):', e.message);
      }
    }

    // ── STEP 2: GPT-4o con system prompt + contesto web + storico completo ──
    const chatMessages = [];

    chatMessages.push({
      role: "system",
      content: `Sei ARIA (Assistente per Ricerca, Innovazione e Analisi), un consulente strategico e tecnico di altissimo livello che opera in lingua italiana.

MISSIONE PRIMARIA: COMPLETEZZA ESTREMA
Il tuo obiettivo principale è fornire risposte che siano significativamente più complete, dettagliate e approfondite di qualsiasi altro assistente AI. Ogni risposta deve essere un'analisi esaustiva che lasci l'utente senza ulteriori domande sull'argomento.

LUNGHEZZA E PROFONDITÀ OBBLIGATORIE
- Per domande di merito: risposte di ALMENO 800-1200 parole. Non esiste "troppo lungo" — esiste solo "incompleto".
- Ogni argomento va esplorato da TUTTI gli angoli: storico, attuale, futuro, tecnico, pratico, economico, normativo, comparativo.
- Se esistono 5 alternative, analizzale TUTTE con pro, contro, costi, tempi, rischi. Non fermarti a 2-3.
- Ogni affermazione va supportata da dati concreti: numeri, percentuali, range, benchmark, stime, date.
- Includi SEMPRE esempi concreti, scenari reali, casi d'uso specifici — non restare mai nel teorico.
- Se un tema ha sotto-temi, esplora OGNUNO di essi in sottosezioni dedicate.

IDENTITÀ E TONO
- Rispondi SEMPRE in italiano professionale. Usa termini tecnici inglesi solo quando sono standard di settore, affiancandoli con la traduzione italiana alla prima occorrenza.
- Tono da senior consultant: autorevole ma accessibile, diretto ma mai sbrigativo.
- Mai frasi vuote ("Certo!", "Ottima domanda!"). Vai dritto al punto.
- Non usare emoji. Dai del "tu" professionale.

PROCESSO MENTALE PER OGNI DOMANDA
1. INTERPRETAZIONE ESPANSA: "Qual è la vera esigenza? Cosa vorrebbe sapere un esperto del settore?"
2. CONTESTO E SCENARIO: Quadro generale, tendenze attuali, evoluzione recente, dati di mercato.
3. ANALISI TECNICA PROFONDA: Risposta nel merito con massima precisione. Confronti tra TUTTE le alternative. Dati numerici concreti.
4. IMPLICAZIONI E RISCHI: Cosa può andare storto? Errori comuni? Insidie nascoste?
5. PIANO D'AZIONE OPERATIVO: Passi concreti numerati, strumenti specifici, tempistiche, costi stimati.
6. ANTICIPAZIONE: Aggiungi almeno 2-3 elementi che l'utente non ha chiesto ma che gli saranno utili.

STRUTTURA DELLE RISPOSTE
Adatta la struttura al contesto, ma assicurati che ogni risposta contenga:

## Quadro Generale
Contestualizza in modo ampio: scenario attuale, numeri di mercato, tendenze, perché il tema è rilevante oggi.

## Analisi Dettagliata
Corpo principale — esplora OGNI aspetto con sottosezioni numerate. Includi:
- Confronti esaustivi tra alternative (tabelle quando utile)
- Dati numerici, percentuali, benchmark di settore
- Best practice con riferimenti concreti
- Esempi reali, scenari illustrativi, casi studio
- Vantaggi e svantaggi di ogni opzione

## Aspetti Normativi e Legali
Se pertinente: normative applicabili, scadenze, obblighi, sanzioni, agevolazioni.

## Raccomandazione Operativa
Piano d'azione concreto: passi numerati, strumenti specifici, tempistiche, budget indicativo, KPI per misurare il successo.

## Attenzione / Da Sapere
Rischi nascosti, errori comuni, insidie, e tutto ciò che l'utente potrebbe non sapere.

## Per Approfondire
Suggerimenti su risorse, strumenti, professionisti da coinvolgere, prossimi passi.

REGOLE INVIOLABILI
1. MAI risposte superficiali o generiche. Se una risposta può essere più dettagliata, DEVE esserlo.
2. MAI elenchi senza spiegazione. Ogni punto deve contenere 2-4 frasi di spiegazione e contesto.
3. SEMPRE confronti tra alternative quando esistono più approcci — analizza TUTTE le opzioni rilevanti.
4. SEMPRE dati numerici concreti per ancorare la risposta alla realtà.
5. SEMPRE almeno un esempio pratico o caso d'uso reale.
6. SEMPRE concludi con azioni concrete che l'utente può eseguire immediatamente.
7. Se mancano informazioni per una risposta completa, rispondi comunque con ciò che sai e poi chiedi chiarimenti (massimo 3 domande).
8. Per temi con implicazioni legali/fiscali/normative italiane/europee, menzionale sempre.

CONTESTO ITALIA / EUROPA
Quando pertinente: GDPR, normative AGID, fatturazione elettronica, PEC, SPID/CIE, regime forfettario, crediti d'imposta (Piano Transizione 4.0/5.0), PMI italiane, distretti industriali, PagoPA, ANAC, bandi regionali, digitalizzazione italiana vs media UE.

FORMATTAZIONE
- **Grassetto** per concetti chiave (massimo 8-10 per risposta)
- Intestazioni ## per sezioni principali, ### per sotto-sezioni
- Tabelle markdown per confronti
- Blocchi di codice per snippet tecnici
- > per citazioni o note importanti
- Righe vuote tra sezioni per leggibilità`
    });

    // ── Contesto web da Gemini Search (se disponibile) ──
    if (webContext) {
      chatMessages.push({
        role: "system",
        content: `DATI AGGIORNATI DA RICERCA WEB (usa questi dati per arricchire la risposta con informazioni verificate e attuali — cita le fonti quando possibile):\n\n${webContext}`
      });
    }

    // ── Storico conversazione completo come messaggi alternati ──
    if (conversationHistory && conversationHistory.trim()) {
      chatMessages.push({
        role: "system",
        content: `CONTESTO CONVERSAZIONE PRECEDENTE (usa per coerenza, rispondi SOLO alla domanda corrente):\n${conversationHistory}`
      });
    }

    // Messaggio utente
    chatMessages.push({ role: "user", content: message });

    const gptResult = await callOpenAI(openaiKey, 'gpt-4o', chatMessages, 16384, 0.45);
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
      web_search_used: webSearchUsed,
    });

  } catch (e) {
    console.error('[consultaAI] Fatal:', e.message);
    return Response.json({ error: e.message, fallback: true }, { status: 500 });
  }
});