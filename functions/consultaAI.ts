import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ═══════════════════════════════════════════════════════════════
// PIPELINE: Gemini Flash (intro veloce) + Gemini Search → GPT-4o STREAMING
// Last deploy: 2026-03-05T20:00
// ═══════════════════════════════════════════════════════════════

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
    signal: AbortSignal.timeout(15000),
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
    'deepseek':    { input: 0.14 / 1_000_000, output: 0.28  / 1_000_000 },
  };
  const r = rates[model] || rates['gpt-4o-mini'];
  return (inputTokens * r.input) + (outputTokens * r.output);
}

async function callGeminiFlashQuickIntro(apiKey, userMessage, webContext) {
  const systemPrompt = `Sei ARIA, consulente strategico italiano. Genera SOLO la sezione "## Quadro Generale" (150-250 parole) per la domanda dell'utente. Scrivi in italiano professionale, con dati concreti e contesto attuale. Non aggiungere altre sezioni. Vai dritto al punto, niente frasi vuote.${webContext ? `\n\nDATI WEB AGGIORNATI:\n${webContext.substring(0, 2000)}` : ''}`;
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: userMessage }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.4, maxOutputTokens: 800 },
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini Flash error ${response.status}: ${err.substring(0, 200)}`);
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
// HANDLER — SSE STREAMING
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

    // ── Detect PROCEDURA OPERATIVA ──
    const msgLower = message.toLowerCase();
    const proceduralKeywords = [
      'procedura','iter','passaggi','fasi','step','workflow','processo','metodo','istruzioni','guida',
      'come fare','come si fa','come ottenere','come richiedere','come attivare','come configurare','come installare',
      'richiedere','ottenere','registrare','attivare','aprire','presentare','depositare','trasmettere',
      'inviare','compilare','configurare','installare','abilitare','verificare','validare','certificare',
      'integrare','implementare','aggiornare','avviare','eseguire',
      'autorizzazione','permesso','licenza','certificazione','conformità','adempimento','regolamento',
      'normativa','requisiti','documentazione','istanza','domanda',
      'prima','poi','successivamente','quindi','infine','fase','passaggio','livello','stadio'
    ];
    const hasKeyword = proceduralKeywords.some(kw => msgLower.includes(kw));
    // Detect intento operativo semantico anche senza parole chiave esplicite
    const operationalPatterns = [
      /come\s+(?:posso|faccio|devo|si\s+pu[oò])/,
      /(?:voglio|vorrei|devo|ho bisogno di|mi serve)\s+(?:\w+\s+){0,3}(?:aprire|creare|fare|ottenere|attivare|configurare|installare|registrare|avviare|inviare|risolvere|cambiare|modificare|impostare|settare|preparare|organizzare|gestire|completare|chiudere|trasferire|migrare|convertire|spostare)/,
      /(?:cosa\s+(?:serve|devo|mi\s+serve)\s+per)/,
      /(?:quali\s+(?:sono\s+(?:i\s+passaggi|le\s+fasi|gli\s+step)))/,
      /(?:aiut(?:ami|o)\s+(?:a|con))\s+/,
      /(?:dove|quando|a chi)\s+(?:devo|bisogna|si deve)\s+/,
      /(?:per\s+(?:aprire|creare|ottenere|attivare|registrare|avviare|richiedere|fare|configurare|installare))/,
    ];
    const hasOperationalIntent = operationalPatterns.some(rx => rx.test(msgLower));
    const isProcedural = hasKeyword || hasOperationalIntent;
    console.log(`[consultaAI] Procedural mode: ${isProcedural} (keyword=${hasKeyword}, intent=${hasOperationalIntent})`);

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!openaiKey) return Response.json({ error: 'OPENAI_API_KEY non configurata' }, { status: 500 });

    let totalInput = 0;
    let totalOutput = 0;
    let totalCost = 0;
    let webSearchUsed = false;
    let webContext = '';

    // ── STEP 1: Gemini Search (con timeout aggressivo, NON bloccante) ──
    // Context question DeepSeek viene lanciata in parallelo allo streaming
    let contextQuestion = '';
    
    // Lancia Gemini Search con timeout ridotto (12s) — non blocca se lento
    if (geminiKey) {
      console.log('[consultaAI] Gemini Search in corso...');
      try {
        const geminiResult = await callGeminiSearch(geminiKey, message);
        if (geminiResult && geminiResult.content && geminiResult.content.length > 50) {
          webContext = geminiResult.content;
          webSearchUsed = true;
          totalInput += geminiResult.inputTokens;
          totalOutput += geminiResult.outputTokens;
          totalCost += calcCost('gemini', geminiResult.inputTokens, geminiResult.outputTokens);
          console.log(`[consultaAI] Gemini Search OK: ${geminiResult.content.length} chars`);
        }
      } catch (e) {
        console.log('[consultaAI] Gemini Search fallito:', e.message);
      }
    }

    // ── STEP 2: Build messages ──
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

SEZIONE FINALE OBBLIGATORIA — SUGGERIMENTI
Alla fine di OGNI risposta, aggiungi SEMPRE questa sezione esatta:

---
**SUGGERIMENTI**

1. [suggerimento 1]
2. [suggerimento 2]

REGOLE per i suggerimenti:
- Esattamente 2 suggerimenti, mai di più, mai di meno
- Frasi brevi (max 15 parole), autosufficienti, scritte come richieste complete pronte all'uso come nuovo prompt
- Devono ampliare o approfondire l'argomento trattato in modo interessante e stimolante
- Evita domande generiche tipo "Dimmi di più" — sii specifico e concreto
- Ogni suggerimento deve poter generare autonomamente una risposta completa se usato come prompt

CONTESTO ITALIA / EUROPA
Quando pertinente: GDPR, normative AGID, fatturazione elettronica, PEC, SPID/CIE, regime forfettario, crediti d'imposta (Piano Transizione 4.0/5.0), PMI italiane, distretti industriali, PagoPA, ANAC, bandi regionali, digitalizzazione italiana vs media UE.

IMMAGINI, DIAGRAMMI E SCHEMI
Quando la risposta beneficerebbe di un supporto visivo (grafici, schemi, diagrammi di flusso, infografiche, mappe concettuali, immagini esplicative):
- Usa la sintassi markdown per immagini: ![descrizione dettagliata](URL)
- Per diagrammi e schemi, usa immagini da servizi pubblici come Mermaid Ink. Genera l'URL codificando il diagramma Mermaid in base64 e usa: ![descrizione](https://mermaid.ink/img/{base64})
- Per grafici semplici, usa tabelle markdown con indicatori visivi (█ ▓ ░ per barre, ↑↓→ per tendenze)
- Per confronti, usa SEMPRE tabelle markdown ben strutturate
- Se un concetto è complesso, aggiungi uno schema a blocchi con caratteri ASCII/Unicode (box drawing: ┌─┐│└─┘, frecce: →←↑↓⇒)
- Non forzare immagini dove non servono — usale solo quando aggiungono valore reale

FORMATTAZIONE — REGOLA CRITICA: SCHEMATICITÀ E GRASSETTO
- Usa **grassetto** MOLTO frequentemente: ogni concetto chiave, cifra importante, nome di legge, termine tecnico, conclusione, raccomandazione, deadline, percentuale — TUTTO in grassetto. Non essere parsimonioso: il grassetto guida l'occhio del lettore e rende la risposta scansionabile.
- Usa elenchi puntati e numerati il più possibile. Evita muri di testo. Ogni paragrafo lungo va spezzato in punti.
- Intestazioni ## per sezioni principali, ### per sotto-sezioni
- Tabelle markdown per confronti
- Blocchi di codice per snippet tecnici
- > per citazioni o note importanti
- Righe vuote tra sezioni per leggibilità
- Diagrammi ASCII/Unicode per flussi e processi quando appropriato
- Obiettivo: chi legge deve poter capire il 70% della risposta leggendo SOLO i grassetti e i titoli.`
    });

    // ── Iniezione prompt PROCEDURA OPERATIVA se rilevato ──
    if (isProcedural) {
      chatMessages.push({
        role: "system",
        content: `MODALITÀ PROCEDURA OPERATIVA ATTIVA — L'utente chiede un iter, una procedura o passaggi operativi concreti.

STRUTTURA OBBLIGATORIA DELLA RISPOSTA (rispetta ESATTAMENTE queste sezioni in questo ordine):

## Obiettivo
Descrizione chiara e concreta del risultato che l'utente vuole ottenere. Spiega cosa si ottiene al termine della procedura.

## Requisiti
Cosa serve PRIMA di iniziare la procedura:
- Documenti da procurare (con nomi esatti)
- Requisiti soggettivi (chi può fare domanda)
- Prerequisiti tecnici/legali
- Eventuali verifiche preventive

## Procedura Passo-Passo

1. **Primo passaggio operativo** — descrizione dettagliata dell'azione, dove farla, come farla
2. **Secondo passaggio operativo** — descrizione dettagliata
3. **Terzo passaggio operativo** — descrizione dettagliata
4. Continuare fino al completamento della procedura

Ogni passaggio deve essere autosufficiente: chi legge deve poter eseguirlo senza cercare altrove. Includi nomi esatti di moduli, piattaforme, portali, URL quando noti. Se esistono percorsi alternativi (online vs cartaceo, diretto vs tramite professionista), descrivili entrambi.

## Documenti o Strumenti Necessari
Elencare TUTTI i documenti, moduli, software o strumenti richiesti. Usa una tabella markdown se possibile: Documento | Dove ottenerlo | Costo | Validità

## Tempi e Costi
- **Tempi medi**: durata complessiva (best case / worst case)
- **Costi**: bolli, diritti, compensi professionali, eventuali spese accessorie. Usa tabella markdown se ci sono più voci.

## Errori Comuni da Evitare
Elenco dei problemi frequenti o passaggi critici, con spiegazione delle conseguenze e come evitarli.

REGOLE DI STILE PROCEDURA:
- **Evita spiegazioni teoriche lunghe** — vai dritto all'azione pratica
- **Frasi brevi e dirette** — ogni frase deve dire cosa fare, non perché
- **Ogni passaggio deve essere immediatamente eseguibile** dall'utente senza interpretazioni
- **Usa SEMPRE elenchi numerati** per i passaggi operativi
- Usa il **grassetto** per OGNI nome di documento, ente, scadenza, importo, termine tecnico
- Indica quando è consigliabile rivolgersi a un professionista e di che tipo
- Niente preamboli, niente introduzioni generiche — parti subito con l'Obiettivo

REGOLE PER AMBITI TECNICI, AMMINISTRATIVI O NORMATIVI:
- **Privilegia SEMPRE fonti ufficiali**: Gazzetta Ufficiale, siti istituzionali (.gov.it), normativa vigente, circolari ministeriali, FAQ ufficiali degli enti
- **Cita la base normativa**: indica articoli di legge, decreti, regolamenti UE, circolari specifiche quando disponibili
- **Evita informazioni speculative** — se un dato non è verificabile, non includerlo
- **Se non sei sicuro di un passaggio, dichiaralo esplicitamente**: usa formule come "⚠️ Da verificare con [ente competente]" oppure "Dato indicativo, confermare su [fonte ufficiale]"
- **Non inventare scadenze, importi o requisiti** — se non hai il dato aggiornato, scrivi "verificare sul sito ufficiale [nome ente]"
- **Distingui chiaramente** tra informazioni certe (da normativa) e stime/approssimazioni`
      });
    }

    if (webContext) {
      chatMessages.push({
        role: "system",
        content: `DATI AGGIORNATI DA RICERCA WEB (usa questi dati per arricchire la risposta con informazioni verificate e attuali — cita le fonti quando possibile):\n\n${webContext}`
      });
    }

    if (conversationHistory && conversationHistory.trim()) {
      chatMessages.push({
        role: "system",
        content: `CONTESTO CONVERSAZIONE PRECEDENTE (usa per coerenza, rispondi SOLO alla domanda corrente):\n${conversationHistory}`
      });
    }

    chatMessages.push({ role: "user", content: message });

    // ══════════════════════════════════════
    // STREAMING MODE
    // ══════════════════════════════════════
    if (stream) {
      const encoder = new TextEncoder();

      // Strategia: Gemini Flash genera il Quadro Generale veloce,
      // poi GPT-4o completa con l'analisi approfondita.
      // Entrambi partono in parallelo.

      const gptMessages = [...chatMessages];

      // Lancia TUTTO in parallelo: Gemini Flash intro + GPT-4o streaming + Context question
      const flashIntroPromise = geminiKey ? callGeminiFlashQuickIntro(geminiKey, message, webContext).catch(e => {
        console.log('[consultaAI] Gemini Flash intro fallito:', e.message);
        return null;
      }) : Promise.resolve(null);

      // Context question via Gemini Flash — parte in parallelo, arriverà durante lo streaming
      const contextPromise = geminiKey ? (async () => {
        try {
          const cqUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
          const cqResp = await fetch(cqUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `Domanda: "${message}"${conversationHistory ? `\nContesto: ${conversationHistory.substring(0, 300)}` : ''}` }] }],
              systemInstruction: { parts: [{ text: `Genera ESATTAMENTE 2 domande di approfondimento propositivo che offrano aiuto concreto all'utente, separate da |||.
TONO OBBLIGATORIO: inizia SEMPRE con formule come "Posso aiutarti a calcolare...", "Vuoi che approfondisca...", "Posso cercare...", "Ti serve sapere...", "Posso verificare...", "Vuoi che analizzi...".
REGOLE: collegate al tema, aspetti CONCRETI diversi tra loro (costi, tempistiche, normativa, procedure, calcoli), 10-20 parole ciascuna in italiano con "?", NON generiche, NON riformulare la domanda originale.
FORMATO ESATTO: domanda1|||domanda2
Rispondi SOLO con le due domande separate da |||, nient'altro.` }] },
              generationConfig: { temperature: 0.7, maxOutputTokens: 80 },
            }),
            signal: AbortSignal.timeout(8000),
          });
          if (cqResp.ok) {
            const cqData = await cqResp.json();
            return (cqData.candidates?.[0]?.content?.parts?.[0]?.text || '').trim().replace(/^["']|["']$/g, '');
          }
        } catch (e) {
          console.log('[consultaAI] Context question skip:', e.message);
        }
        return '';
      })() : Promise.resolve('');

      // GPT-4o streaming — parte subito senza aspettare nessuno
      const openaiResponsePromise = fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: gptMessages,
          temperature: 0.45,
          max_tokens: 16384,
          top_p: 0.95,
          frequency_penalty: 0.3,
          presence_penalty: 0.2,
          stream: true,
        }),
        signal: AbortSignal.timeout(120000),
      });

      // Aspetta Gemini Flash intro (veloce, ~1-3s)
      const flashResult = await flashIntroPromise;
      let flashSent = false;

      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();

      // Funzione helper per scrivere SSE
      const sendSSE = async (data) => {
        await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Processa tutto in background
      (async () => {
        try {
          // 1. Context question arriva async — la invia appena pronta
          contextPromise.then(async (cq) => {
            if (cq) {
              contextQuestion = cq;
              console.log(`[consultaAI] Context question: "${cq}"`);
              try { await sendSSE({ context_question: cq }); } catch {}
            }
          });

          // 2. Invia il Quadro Generale da Gemini Flash immediatamente
          if (flashResult && flashResult.content && flashResult.content.length > 50) {
            flashSent = true;
            totalInput += flashResult.inputTokens;
            totalOutput += flashResult.outputTokens;
            totalCost += calcCost('gemini', flashResult.inputTokens, flashResult.outputTokens);
            console.log(`[consultaAI] Gemini Flash intro OK: ${flashResult.content.length} chars`);
            
            // Invia il testo Gemini Flash come chunk di testo
            await sendSSE({ text: flashResult.content + '\n\n' });
          }

          // 3. Ora processa lo stream GPT-4o
          const openaiResponse = await openaiResponsePromise;
          if (!openaiResponse.ok) {
            const err = await openaiResponse.text();
            await sendSSE({ error: `OpenAI error ${openaiResponse.status}` });
            await writer.close();
            return;
          }

          const decoder = new TextDecoder();
          const reader = openaiResponse.body.getReader();
          let skipQuadroGenerale = flashSent;
          let skipping = false;
          let fullContent = flashSent ? flashResult.content + '\n\n' : '';
          let gptBuffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value, { stream: true });
            const lines = text.split('\n');
            
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                const elapsed = Date.now() - startTime;
                await sendSSE({ done: true, web_search_used: webSearchUsed, response_time_ms: elapsed });

                try {
                  await base44.asServiceRole.entities.UsageLog.create({
                    user_email: user.email,
                    action_type: 'chat_ai',
                    model_used: flashSent ? 'gemini-flash+gpt-4o' : 'gpt-4o',
                    provider: 'openai',
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
                continue;
              }
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  // Se DeepSeek ha già inviato il Quadro Generale,
                  // saltiamo quella sezione dal stream GPT-4o
                  if (skipQuadroGenerale) {
                    gptBuffer += delta;
                    // Aspetta di avere abbastanza testo per trovare la fine del Quadro Generale
                    if (!skipping && gptBuffer.includes('## Quadro Generale')) {
                      skipping = true;
                    }
                    if (skipping) {
                      // Cerca la prossima sezione ## dopo Quadro Generale
                      const afterQuadro = gptBuffer.indexOf('## Quadro Generale');
                      const restAfterQuadro = gptBuffer.substring(afterQuadro + 20);
                      const nextSection = restAfterQuadro.search(/\n## /);
                      if (nextSection !== -1) {
                        // Trovata la prossima sezione, inizia a inviare da lì
                        const toSend = restAfterQuadro.substring(nextSection);
                        fullContent += toSend;
                        await sendSSE({ text: toSend });
                        skipQuadroGenerale = false;
                        skipping = false;
                        gptBuffer = '';
                      }
                      // Altrimenti continua ad accumulare
                    } else {
                      // Non ancora trovato "## Quadro Generale", controlla se è passata abbastanza roba
                      if (gptBuffer.length > 2000) {
                        // Probabilmente GPT-4o non ha usato "## Quadro Generale", invia tutto
                        fullContent += gptBuffer;
                        await sendSSE({ text: gptBuffer });
                        skipQuadroGenerale = false;
                        gptBuffer = '';
                      }
                    }
                  } else {
                    fullContent += delta;
                    await sendSSE({ text: delta });
                  }
                }
                if (parsed.usage) {
                  totalInput += parsed.usage.prompt_tokens || 0;
                  totalOutput += parsed.usage.completion_tokens || 0;
                  totalCost += calcCost('gpt-4o', parsed.usage.prompt_tokens || 0, parsed.usage.completion_tokens || 0);
                }
              } catch {}
            }
          }

          // Se c'è buffer residuo non inviato, invialo
          if (gptBuffer) {
            fullContent += gptBuffer;
            await sendSSE({ text: gptBuffer });
          }

        } catch (e) {
          console.error('[consultaAI] Stream error:', e.message);
          try { await sendSSE({ error: e.message }); } catch {}
        } finally {
          try { await writer.close(); } catch {}
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
    // NON-STREAMING MODE (fallback)
    // ══════════════════════════════════════
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: chatMessages,
        temperature: 0.45,
        max_tokens: 16384,
        top_p: 0.95,
        frequency_penalty: 0.3,
        presence_penalty: 0.2,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!openaiResponse.ok) {
      const err = await openaiResponse.text();
      throw new Error(`OpenAI error ${openaiResponse.status}: ${err.substring(0, 300)}`);
    }

    const data = await openaiResponse.json();
    const response_data = data.choices?.[0]?.message?.content || '';
    totalInput += data.usage?.prompt_tokens || 0;
    totalOutput += data.usage?.completion_tokens || 0;
    totalCost += calcCost('gpt-4o', data.usage?.prompt_tokens || 0, data.usage?.completion_tokens || 0);

    const elapsed = Date.now() - startTime;
    console.log(`[consultaAI] Done in ${elapsed}ms | cost=$${totalCost.toFixed(5)}`);

    try {
      await base44.asServiceRole.entities.UsageLog.create({
        user_email: user.email,
        action_type: 'chat_ai',
        model_used: 'gpt-4o',
        provider: 'openai',
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
      model_used: 'gpt-4o',
      provider: 'openai',
      tokens: { input: totalInput, output: totalOutput },
      cost_usd: totalCost,
      response_time_ms: elapsed,
      web_search_used: webSearchUsed,
      context_question: contextQuestion || null,
    });

  } catch (e) {
    console.error('[consultaAI] Fatal:', e.message);
    return Response.json({ error: e.message, fallback: true }, { status: 500 });
  }
});