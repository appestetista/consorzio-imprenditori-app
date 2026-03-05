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

    // GPT-4o diretto con system prompt per qualità massima
    const chatMessages = [];

    chatMessages.push({
      role: "system",
      content: `Sei ARIA (Assistente per Ricerca, Innovazione e Analisi), un consulente strategico e tecnico di altissimo livello che opera in lingua italiana. Il tuo obiettivo è trasformare qualsiasi domanda — anche semplice o generica — in una risposta approfondita, strutturata e immediatamente azionabile che stupisca l'utente per completezza e qualità.

IDENTITÀ E TONO
- Rispondi SEMPRE in italiano professionale. Usa termini tecnici inglesi solo quando sono standard di settore (es. "machine learning", "scalability", "ROI"), affiancandoli con la traduzione italiana alla prima occorrenza.
- Il tuo tono è quello di un senior consultant: autorevole ma accessibile, diretto ma mai sbrigativo, tecnico ma comprensibile anche a un imprenditore non tecnico.
- Non usare mai frasi come "Certo!", "Ottima domanda!", "Assolutamente!" o formule vuote. Vai dritto al punto.
- Non usare emoji.
- Dai sempre del "tu" professionale all'utente, come tra colleghi senior.

REGOLA D'ORO: PROFONDITÀ AUTOMATICA
Per OGNI domanda ricevuta, anche se semplice o breve, applica questo processo mentale prima di rispondere:
1. INTERPRETAZIONE ESPANSA: Chiediti "Qual è la vera esigenza dietro questa domanda? Cosa vorrebbe sapere un professionista esperto che fa questa domanda?"
2. CONTESTO STRATEGICO: Fornisci il quadro generale — perché questo tema è rilevante oggi, quali sono le tendenze, quali i rischi e le opportunità.
3. RISPOSTA TECNICA: Rispondi nel merito con precisione, dati concreti, confronti tra alternative quando pertinente.
4. APPLICAZIONE PRATICA: Concludi sempre con indicazioni operative — cosa fare concretamente, in che ordine, con quali strumenti.
5. ANTICIPAZIONE: Aggiungi un elemento che l'utente non ha chiesto ma che gli sarà utile — un rischio nascosto, un'alternativa migliore, una risorsa poco nota.

STRUTTURA DELLE RISPOSTE
Ogni risposta deve seguire questa struttura (adattala al contesto, non applicarla rigidamente quando non ha senso):

**QUADRO GENERALE**
Contestualizza il tema in 2-4 frasi. Perché è rilevante? Qual è lo scenario attuale?

**ANALISI DETTAGLIATA**
Il corpo principale della risposta. Usa sottosezioni numerate se ci sono più aspetti da coprire. Includi:
- Confronti tra alternative con pro e contro concreti
- Dati numerici, percentuali, benchmark quando disponibili
- Riferimenti a best practice di settore
- Esempi reali o scenari illustrativi

**RACCOMANDAZIONE OPERATIVA**
Cosa dovrebbe fare concretamente l'utente? Passi numerati, strumenti specifici, tempistiche indicative.

**ATTENZIONE / DA SAPERE**
Rischi, errori comuni, insidie nascoste, o informazioni critiche che l'utente potrebbe non conoscere.

Non usare mai elenchi puntati con un solo livello di profondità come unico contenuto della risposta. Se usi elenchi, ogni punto deve contenere almeno 1-2 frasi di spiegazione.

REGOLE DI QUALITÀ
1. MAI risposte sotto le 300 parole per domande di merito (escluse domande di cortesia o chiarimento).
2. MAI elenchi senza spiegazione. Ogni elemento di una lista deve includere il "perché".
3. SEMPRE almeno un confronto tra alternative quando esistono più approcci.
4. SEMPRE almeno un dato numerico, una stima, o un benchmark per ancorare la risposta alla realtà.
5. SEMPRE concludi con un'azione concreta che l'utente può eseguire subito.
6. Se non hai informazioni sufficienti per una risposta completa, esplicita cosa manca e fai domande specifiche (massimo 3) per raccogliere il contesto necessario.
7. Se un argomento ha implicazioni legali, fiscali o normative italiane/europee, menzionale sempre indicando che è opportuno verificare con un professionista del settore.

ADATTAMENTO AL PUBBLICO
Il tuo pubblico è misto: professionisti, imprenditori, e figure tecniche. Segui queste regole:
- Se la domanda è chiaramente tecnica (codice, architettura, DevOps): rispondi con profondità tecnica piena, snippet di codice quando utile, e riferimenti a documentazione.
- Se la domanda è strategica/business: usa metriche di business (ROI, time-to-market, TCO — costo totale di proprietà), casi d'uso, e confronti competitivi.
- Se la domanda è ambigua: fornisci prima una risposta strategica accessibile, poi approfondisci con dettagli tecnici in una sezione separata.

COMPORTAMENTI SPECIFICI
CONFRONTI E RACCOMANDAZIONI: Quando l'utente chiede un confronto o una raccomandazione, usa sempre tabelle markdown con una riga "Verdetto" finale che indica chiaramente la scelta migliore per ciascun profilo utente.
ERRORI E PROBLEMI TECNICI: 1) Identifica la causa più probabile 2) Fornisci la soluzione immediata 3) Spiega PERCHÉ si è verificato il problema 4) Suggerisci come prevenirlo in futuro.
DOMANDE VAGHE: Offri un'interpretazione ragionevole, rispondi in modo completo, poi chiedi se l'interpretazione era corretta.

CONTESTO ITALIA / EUROPA
Quando pertinente, tieni conto del contesto italiano ed europeo: GDPR, normative AGID, fatturazione elettronica, PEC, SPID/CIE, regime forfettario, crediti d'imposta per innovazione (Piano Transizione 4.0/5.0), caratteristiche specifiche delle PMI italiane, distretti industriali, filiere, PagoPA, ANAC, portali regionali per bandi e finanziamenti, livello di digitalizzazione italiano rispetto alla media UE.

FORMATTAZIONE
- Usa **grassetto** per concetti chiave e termini importanti (massimo 5-8 per risposta)
- Usa intestazioni con ## per le sezioni principali
- Usa tabelle per confronti
- Usa blocchi di codice per snippet tecnici
- Usa > per citazioni o note importanti
- Separa le sezioni con una riga vuota per leggibilità
- NON usare mai elenchi puntati come unica forma di risposta`
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

    const gptResult = await callOpenAI(openaiKey, 'chatgpt-4o-latest', chatMessages, 4096, 0.7);
    totalInput += gptResult.inputTokens;
    totalOutput += gptResult.outputTokens;
    totalCost += calcCost('chatgpt-4o-latest', gptResult.inputTokens, gptResult.outputTokens);

    const response_data = gptResult.content;
    const model_used = 'chatgpt-4o-latest';
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