import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ═══════════════════════════════════════════════════════════════
// PIPELINE v2 — 8-Step Architecture
// 1. Cache Normalization (Gemini Flash)
// 2. Cache Lookup
// 3. Cache Hit → immediate response
// 4. Router Prompt (Gemini Flash) — SIMPLE/STANDARD/ADVANCED + category
// 5. Clarification Question (Gemini Flash) — parallel
// 6. Fast Response (Gemini Flash) — parallel
// 7. Main Response (GPT-4o streaming)
// 8. Final Suggestions + Title (Gemini Flash) — post-stream
// 9. Cache Save
// ═══════════════════════════════════════════════════════════════

// ── Gemini Flash helper ──
async function geminiFlash(apiKey, systemPrompt, userPrompt, opts = {}) {
  const { temperature = 0.3, maxOutputTokens = 200, timeout = 8000 } = opts;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature, maxOutputTokens },
    }),
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini Flash error ${response.status}: ${err.substring(0, 200)}`);
  }
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const usage = data.usageMetadata || {};
  return { text: text.trim(), inputTokens: usage.promptTokenCount || 0, outputTokens: usage.candidatesTokenCount || 0 };
}

// ── Cost calculation ──
function calcCost(model, inputTokens, outputTokens) {
  const rates = {
    'gpt-4o':      { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
    'gemini-flash': { input: 0.15 / 1_000_000, output: 0.60  / 1_000_000 },
  };
  const r = rates[model] || rates['gemini-flash'];
  return (inputTokens * r.input) + (outputTokens * r.output);
}

// ── STEP 1: Normalize query ──
async function normalizeQuery(geminiKey, message) {
  const result = await geminiFlash(geminiKey,
    `Riscrivi la richiesta dell'utente in una forma standardizzata e sintetica che rappresenti il vero significato della domanda.
Regole:
- massimo 15 parole
- elimina parole inutili
- mantieni il significato principale
- usa linguaggio neutro
- tutto in minuscolo
- niente punteggiatura finale
- niente spiegazioni
Restituisci solo la frase normalizzata.`,
    message,
    { temperature: 0, maxOutputTokens: 60, timeout: 5000 }
  );
  return result;
}

// ── STEP 4: Router ──
async function routeQuery(geminiKey, message, conversationHistory) {
  const result = await geminiFlash(geminiKey,
    `Classifica questa domanda. Rispondi SOLO con un JSON valido, nient'altro.
Formato: {"complexity":"SIMPLE|STANDARD|ADVANCED","category":"PROCEDURA|SPIEGAZIONE|DECISIONE|CONFRONTO|IDEA"}

Regole:
- SIMPLE: saluti, ringraziamenti, domande banali con risposta in 1-2 frasi
- STANDARD: domande specifiche con risposta strutturata (80% dei casi)
- ADVANCED: analisi multi-variabile, scenari complessi, confronti dettagliati
- PROCEDURA: l'utente chiede come fare qualcosa, iter, passaggi
- SPIEGAZIONE: l'utente vuole capire un concetto, cos'è qualcosa
- DECISIONE: l'utente deve scegliere tra opzioni
- CONFRONTO: l'utente chiede un paragone esplicito
- IDEA: l'utente cerca ispirazione, suggerimenti, brainstorming`,
    `${conversationHistory ? `Contesto: ${conversationHistory.substring(0, 300)}\n` : ''}Domanda: "${message}"`,
    { temperature: 0, maxOutputTokens: 60, timeout: 5000 }
  );
  try {
    const parsed = JSON.parse(result.text.replace(/```json\n?/g, '').replace(/```/g, '').trim());
    return { ...parsed, inputTokens: result.inputTokens, outputTokens: result.outputTokens };
  } catch {
    return { complexity: 'STANDARD', category: 'SPIEGAZIONE', inputTokens: result.inputTokens, outputTokens: result.outputTokens };
  }
}

// ── STEP 5: Clarification question ──
async function generateClarification(geminiKey, message, conversationHistory) {
  const result = await geminiFlash(geminiKey,
    `Analizza la domanda. Se può essere interpretata in più modi o manca un'informazione chiave, genera una domanda di chiarimento con 3 opzioni.
FORMATO JSON: {"question":"domanda breve max 12 parole","options":["opzione 1","opzione 2","opzione 3"]}
Se la domanda è già chiara, rispondi: {"question":"","options":[]}
Regole: ogni opzione max 8 parole. Rispondi SOLO con JSON.`,
    `${conversationHistory ? `Contesto: ${conversationHistory.substring(0, 300)}\n` : ''}Domanda: "${message}"`,
    { temperature: 0.5, maxOutputTokens: 120, timeout: 6000 }
  );
  try {
    const parsed = JSON.parse(result.text.replace(/```json\n?/g, '').replace(/```/g, '').trim());
    if (parsed.question && parsed.options?.length >= 2) return JSON.stringify(parsed);
  } catch {}
  return '';
}

// ── STEP 6: Fast response (preview) ──
async function generateFastResponse(geminiKey, message, category) {
  const categoryHint = category === 'PROCEDURA' ? 'Anticipa brevemente cosa serve per iniziare.' :
    category === 'DECISIONE' ? 'Anticipa brevemente il criterio chiave per decidere.' :
    category === 'CONFRONTO' ? 'Anticipa brevemente la differenza principale.' :
    'Anticipa brevemente il concetto chiave.';
  
  const result = await geminiFlash(geminiKey,
    `Genera un'anteprima della risposta in ESATTAMENTE 2 frasi (max 40 parole totali).
${categoryHint}
Regole:
- Prima frase: inquadra il tema in modo diretto
- Seconda frase: anticipa la soluzione o il punto chiave
- Tono professionale, italiano, niente emoji
- Vai dritto al punto, niente preamboli
Restituisci solo le 2 frasi.`,
    message,
    { temperature: 0.4, maxOutputTokens: 100, timeout: 5000 }
  );
  return result;
}

// ── STEP 8a: Final suggestions ──
async function generateSuggestions(geminiKey, message, responseText) {
  const result = await geminiFlash(geminiKey,
    `Genera ESATTAMENTE 2 suggerimenti di approfondimento basati sulla domanda e risposta.
Formato: una riga per suggerimento, separati da |||
Regole:
- Ogni suggerimento max 10 parole
- Frasi complete pronte come nuovo prompt
- Specifici e curiosi, NON generici
- Devono ampliare l'argomento in modo stimolante
Rispondi SOLO con: suggerimento1|||suggerimento2`,
    `Domanda: "${message}"\nRisposta (estratto): "${responseText.substring(0, 500)}"`,
    { temperature: 0.5, maxOutputTokens: 80, timeout: 5000 }
  );
  return result;
}

// ── STEP 8b: Cache title ──
async function generateTitle(geminiKey, message, responseText) {
  const result = await geminiFlash(geminiKey,
    `Genera un titolo breve che descriva la domanda e la risposta.
Regole:
- massimo 10 parole
- deve rappresentare il tema principale
- niente punteggiatura inutile
Restituisci solo il titolo.`,
    `Domanda: "${message}"\nRisposta (estratto): "${responseText.substring(0, 300)}"`,
    { temperature: 0.3, maxOutputTokens: 40, timeout: 5000 }
  );
  return result;
}

// ── Build system prompt based on router result ──
function buildSystemPrompt(routerResult) {
  const { category } = routerResult;

  const baseIdentity = `Sei ARIA (Assistente per Ricerca, Innovazione e Analisi), un consulente strategico italiano.

REGOLE DI COMUNICAZIONE:
- Rispondi SEMPRE in italiano professionale
- Tono autorevole ma accessibile, diretto, mai sbrigativo
- Mai frasi vuote ("Certo!", "Ottima domanda!"). Vai dritto al punto
- Non usare emoji. Dai del "tu" professionale
- Usa **grassetto** molto frequentemente per concetti chiave, cifre, termini tecnici
- Paragrafi brevi (max 3-4 frasi), poi vai a capo
- Elenchi puntati/numerati il più possibile`;

  const structurePrompt = `

STRUTTURA OBBLIGATORIA — 5 SEZIONI (rispetta ESATTAMENTE questo ordine):

## Risposta Rapida
2-3 frasi che rispondono direttamente alla domanda. Sintesi immediata del punto chiave.

## Come Funziona
Spiega il meccanismo, il concetto o il processo. Usa sotto-sezioni ### se servono. Dati concreti, numeri, percentuali.

## Applicazione Pratica
Esempio concreto, caso d'uso reale, configurazione pratica. Numeri reali, scenari plausibili, nomi di strumenti. Tabelle markdown per confronti.

## Passi Operativi
Elenco numerato di azioni concrete da fare. Ogni passo deve essere immediatamente eseguibile.

## Attenzione
Rischi, errori comuni, avvertenze legali/fiscali se pertinenti. Cosa NON fare.`;

  const proceduralOverride = category === 'PROCEDURA' ? `

OVERRIDE PROCEDURA — adatta le sezioni così:
- "Risposta Rapida" → obiettivo della procedura e chi può farla
- "Come Funziona" → requisiti e documenti necessari
- "Applicazione Pratica" → la procedura passo-passo dettagliata con nomi esatti di moduli, portali, URL
- "Passi Operativi" → tempi, costi, scadenze in formato tabella
- "Attenzione" → errori comuni e quando serve un professionista` : '';

  const decisionOverride = category === 'DECISIONE' ? `

OVERRIDE DECISIONE — adatta le sezioni così:
- "Risposta Rapida" → la raccomandazione diretta
- "Come Funziona" → criteri di valutazione
- "Applicazione Pratica" → confronto pro/contro in tabella
- "Passi Operativi" → come procedere con l'opzione consigliata
- "Attenzione" → rischi della scelta sbagliata` : '';

  const confrontoOverride = category === 'CONFRONTO' ? `

OVERRIDE CONFRONTO — adatta le sezioni così:
- "Risposta Rapida" → quale opzione è migliore e perché (1 frase)
- "Come Funziona" → tabella comparativa con metriche (costo, tempo, rischio, ROI)
- "Applicazione Pratica" → scenario reale per ciascuna opzione
- "Passi Operativi" → come implementare l'opzione raccomandata
- "Attenzione" → condizioni in cui la scelta opposta sarebbe migliore` : '';

  return `${baseIdentity}${structurePrompt}${proceduralOverride}${decisionOverride}${confrontoOverride}

CONTESTO ITALIA/EUROPA: GDPR, normative AGID, fatturazione elettronica, PEC, SPID/CIE, regime forfettario, crediti d'imposta, PMI italiane.

REGOLE INVIOLABILI:
1. MAI risposte superficiali — ogni affermazione va supportata da dati concreti
2. SEMPRE elenchi con spiegazione (2-4 frasi per punto)
3. SEMPRE confronti tra alternative quando esistono
4. Per temi legali/fiscali/normativi, menziona sempre le implicazioni`;
}


// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
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

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!openaiKey) return Response.json({ error: 'OPENAI_API_KEY non configurata' }, { status: 500 });
    if (!geminiKey) return Response.json({ error: 'GEMINI_API_KEY non configurata' }, { status: 500 });

    let totalInput = 0;
    let totalOutput = 0;
    let totalCost = 0;

    // ══════════════════════════════════════
    // STEP 1: Normalize query for cache
    // ══════════════════════════════════════
    let normalizedQuery = '';
    try {
      const normResult = await normalizeQuery(geminiKey, message);
      normalizedQuery = normResult.text.toLowerCase().replace(/[.!?;:,]$/g, '').trim();
      totalInput += normResult.inputTokens;
      totalOutput += normResult.outputTokens;
      totalCost += calcCost('gemini-flash', normResult.inputTokens, normResult.outputTokens);
      console.log(`[consultaAI] Normalized: "${normalizedQuery}"`);
    } catch (e) {
      console.log('[consultaAI] Normalization failed:', e.message);
      normalizedQuery = message.toLowerCase().substring(0, 100).trim();
    }

    // ══════════════════════════════════════
    // STEP 2-3: Cache lookup
    // ══════════════════════════════════════
    let cacheHit = null;
    // Only use cache for first message in conversation (no history)
    const isFirstMessage = !conversationHistory || conversationHistory.trim() === '';
    if (isFirstMessage && normalizedQuery.length > 5) {
      try {
        const cached = await base44.asServiceRole.entities.AIResponseCache.filter({ normalized_query: normalizedQuery });
        if (cached.length > 0) {
          const entry = cached[0];
          // Check TTL (30 days)
          if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
            console.log(`[consultaAI] Cache EXPIRED, deleting id=${entry.id}`);
            base44.asServiceRole.entities.AIResponseCache.delete(entry.id).catch(() => {});
          } else {
            cacheHit = entry;
            console.log(`[consultaAI] CACHE HIT! id=${cacheHit.id}, hits=${cacheHit.hit_count || 0}`);
          }
          // Update hit count async
          base44.asServiceRole.entities.AIResponseCache.update(cacheHit.id, {
            hit_count: (cacheHit.hit_count || 0) + 1,
            last_hit_at: new Date().toISOString(),
          }).catch(() => {});
        }
      } catch (e) {
        console.log('[consultaAI] Cache lookup error:', e.message);
      }
    }

    // ══════════════════════════════════════
    // STEP 3: Cache hit → immediate response
    // ══════════════════════════════════════
    if (cacheHit) {
      const elapsed = Date.now() - startTime;

      if (stream) {
        const encoder = new TextEncoder();
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();

        (async () => {
          try {
            // Send suggestions if available
            if (cacheHit.suggestions) {
              try {
                const sugs = JSON.parse(cacheHit.suggestions);
                if (sugs.length > 0) {
                  await writer.write(encoder.encode(`data: ${JSON.stringify({ entertain_questions: sugs.join('|||') })}\n\n`));
                }
              } catch {}
            }
            // Send cached text
            await writer.write(encoder.encode(`data: ${JSON.stringify({ text: cacheHit.response_text })}\n\n`));
            await writer.write(encoder.encode(`data: ${JSON.stringify({ done: true, web_search_used: false, response_time_ms: elapsed, cache_hit: true })}\n\n`));
          } catch {} finally {
            try { await writer.close(); } catch {}
          }
        })();

        // Log usage
        base44.asServiceRole.entities.UsageLog.create({
          user_email: user.email, action_type: 'chat_ai_cache', model_used: 'cache',
          provider: 'cache', input_tokens: 0, output_tokens: 0, cost_usd: 0,
          category: cacheHit.category || 'Generale', response_time_ms: elapsed,
          timestamp: new Date().toISOString(),
        }).catch(() => {});

        return new Response(readable, {
          headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
        });
      }

      // Non-streaming cache hit
      return Response.json({
        success: true, data: cacheHit.response_text, model_used: 'cache',
        provider: 'cache', tokens: { input: 0, output: 0 }, cost_usd: 0,
        response_time_ms: elapsed, web_search_used: false, cache_hit: true,
      });
    }

    // ══════════════════════════════════════
    // STREAMING MODE (cache miss)
    // ══════════════════════════════════════
    if (stream) {
      const encoder = new TextEncoder();
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();

      const sendSSE = async (data) => {
        await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      (async () => {
        try {
          // ── STEP 4+5+6: Launch router, clarification, fast response IN PARALLEL ──
          const routerPromise = routeQuery(geminiKey, message, conversationHistory).catch(e => {
            console.log('[consultaAI] Router failed:', e.message);
            return { complexity: 'STANDARD', category: 'SPIEGAZIONE', inputTokens: 0, outputTokens: 0 };
          });

          const clarificationPromise = generateClarification(geminiKey, message, conversationHistory).catch(() => '');

          const fastResponsePromise = (async () => {
            // We need router result for category, but start with default
            try {
              return await generateFastResponse(geminiKey, message, 'SPIEGAZIONE');
            } catch (e) {
              console.log('[consultaAI] Fast response failed:', e.message);
              return null;
            }
          })();

          // Wait for all parallel tasks
          const [routerResult, clarification, fastResult] = await Promise.all([
            routerPromise, clarificationPromise, fastResponsePromise
          ]);

          // Track costs
          totalInput += routerResult.inputTokens || 0;
          totalOutput += routerResult.outputTokens || 0;
          totalCost += calcCost('gemini-flash', routerResult.inputTokens || 0, routerResult.outputTokens || 0);

          console.log(`[consultaAI] Router: ${routerResult.complexity}/${routerResult.category}`);

          // ── Send clarification question ──
          if (clarification) {
            console.log(`[consultaAI] Clarification: ${clarification}`);
            await sendSSE({ context_question: clarification });
          }

          // ── Send fast response as initial text ──
          let fullContent = '';
          if (fastResult && fastResult.text && fastResult.text.length > 20) {
            totalInput += fastResult.inputTokens;
            totalOutput += fastResult.outputTokens;
            totalCost += calcCost('gemini-flash', fastResult.inputTokens, fastResult.outputTokens);
            console.log(`[consultaAI] Fast response: ${fastResult.text.length} chars`);
            fullContent = fastResult.text + '\n\n';
            await sendSSE({ text: fullContent });
          }

          // ── STEP 7: GPT-4o streaming (main response) ──
          const systemPrompt = buildSystemPrompt(routerResult);
          const chatMessages = [{ role: "system", content: systemPrompt }];

          if (conversationHistory && conversationHistory.trim()) {
            chatMessages.push({
              role: "system",
              content: `CONTESTO CONVERSAZIONE PRECEDENTE (rispondi SOLO alla domanda corrente):\n${conversationHistory}`
            });
          }

          chatMessages.push({ role: "user", content: message });

          const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: chatMessages,
              temperature: 0.3,
              max_tokens: 1000,
              top_p: 0.9,
              frequency_penalty: 0.2,
              presence_penalty: 0.1,
              stream: true,
            }),
            signal: AbortSignal.timeout(120000),
          });

          if (!openaiResponse.ok) {
            const err = await openaiResponse.text();
            await sendSSE({ error: `OpenAI error ${openaiResponse.status}` });
            await writer.close();
            return;
          }

          // Process GPT-4o stream
          const decoder = new TextDecoder();
          const reader = openaiResponse.body.getReader();
          let skipFastSection = !!fastResult?.text;
          let skipping = false;
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
                // Stream complete — now do post-processing

                // Flush any remaining buffer
                if (gptBuffer) {
                  fullContent += gptBuffer;
                  await sendSSE({ text: gptBuffer });
                  gptBuffer = '';
                }

                // ── STEP 8: Suggestions + Title (parallel, post-stream) ──
                const suggestionsPromise = generateSuggestions(geminiKey, message, fullContent).catch(() => null);
                const titlePromise = generateTitle(geminiKey, message, fullContent).catch(() => null);

                const [sugResult, titleResult] = await Promise.all([suggestionsPromise, titlePromise]);

                let suggestionsText = '';
                if (sugResult?.text) {
                  totalInput += sugResult.inputTokens;
                  totalOutput += sugResult.outputTokens;
                  totalCost += calcCost('gemini-flash', sugResult.inputTokens, sugResult.outputTokens);
                  suggestionsText = sugResult.text;

                  // Append suggestions to content
                  const sugLines = suggestionsText.split('|||').map(s => s.trim()).filter(s => s.length > 3);
                  if (sugLines.length > 0) {
                    const sugBlock = '\n\n---\n**SUGGERIMENTI**\n\n' + sugLines.map((s, i) => `${i + 1}. ${s}`).join('\n');
                    fullContent += sugBlock;
                    await sendSSE({ text: sugBlock });
                  }
                }

                let generatedTitle = '';
                if (titleResult?.text) {
                  totalInput += titleResult.inputTokens;
                  totalOutput += titleResult.outputTokens;
                  totalCost += calcCost('gemini-flash', titleResult.inputTokens, titleResult.outputTokens);
                  generatedTitle = titleResult.text;
                }

                const elapsed = Date.now() - startTime;
                await sendSSE({ 
                  done: true, web_search_used: false, response_time_ms: elapsed,
                  generated_title: generatedTitle || null,
                });

                // ── STEP 9: Save to cache ──
                if (isFirstMessage && normalizedQuery.length > 5 && fullContent.length > 100) {
                  const sugArray = suggestionsText ? suggestionsText.split('|||').map(s => s.trim()).filter(s => s.length > 3) : [];
                  base44.asServiceRole.entities.AIResponseCache.create({
                    normalized_query: normalizedQuery,
                    response_text: fullContent,
                    suggestions: JSON.stringify(sugArray),
                    title: generatedTitle || '',
                    category: routerResult.category || 'SPIEGAZIONE',
                    complexity: routerResult.complexity || 'STANDARD',
                    hit_count: 0,
                  }).catch(e => console.log('[consultaAI] Cache save error:', e.message));
                }

                // Log usage
                base44.asServiceRole.entities.UsageLog.create({
                  user_email: user.email, action_type: 'chat_ai',
                  model_used: 'gemini-flash+gpt-4o', provider: 'multi',
                  input_tokens: totalInput, output_tokens: totalOutput,
                  cost_usd: Math.round(totalCost * 100000) / 100000,
                  category: routerResult.category || 'Generale',
                  response_time_ms: elapsed, timestamp: new Date().toISOString(),
                }).catch(e => console.log('[consultaAI] UsageLog error:', e.message));

                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  // Skip the "Risposta Rapida" section from GPT-4o if we already sent fast response
                  if (skipFastSection) {
                    gptBuffer += delta;
                    // Look for "## Risposta Rapida" in buffer
                    if (!skipping && gptBuffer.includes('## Risposta Rapida')) {
                      skipping = true;
                    }
                    if (skipping) {
                      // Look for the NEXT ## section after Risposta Rapida
                      const introIdx = gptBuffer.indexOf('## Risposta Rapida');
                      if (introIdx !== -1) {
                        const afterIntro = gptBuffer.substring(introIdx + 20);
                        const nextSection = afterIntro.search(/\n## /);
                        if (nextSection !== -1) {
                          const toSend = afterIntro.substring(nextSection);
                          fullContent += toSend;
                          await sendSSE({ text: toSend });
                          skipFastSection = false;
                          skipping = false;
                          gptBuffer = '';
                        }
                      }
                    } else {
                      // No section header found yet — if buffer gets too large, send it all
                      if (gptBuffer.length > 1500) {
                        fullContent += gptBuffer;
                        await sendSSE({ text: gptBuffer });
                        skipFastSection = false;
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

          // Flush residual buffer
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
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
      });
    }

    // ══════════════════════════════════════
    // NON-STREAMING MODE (fallback)
    // ══════════════════════════════════════
    const routerResult = await routeQuery(geminiKey, message, conversationHistory).catch(() => ({
      complexity: 'STANDARD', category: 'SPIEGAZIONE', inputTokens: 0, outputTokens: 0
    }));
    totalInput += routerResult.inputTokens || 0;
    totalOutput += routerResult.outputTokens || 0;
    totalCost += calcCost('gemini-flash', routerResult.inputTokens || 0, routerResult.outputTokens || 0);

    const systemPrompt = buildSystemPrompt(routerResult);
    const chatMessages = [{ role: "system", content: systemPrompt }];
    if (conversationHistory && conversationHistory.trim()) {
      chatMessages.push({ role: "system", content: `CONTESTO CONVERSAZIONE:\n${conversationHistory}` });
    }
    chatMessages.push({ role: "user", content: message });

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o', messages: chatMessages,
        temperature: 0.3, max_tokens: 1000, top_p: 0.9,
        frequency_penalty: 0.2, presence_penalty: 0.1,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!openaiResponse.ok) {
      const err = await openaiResponse.text();
      throw new Error(`OpenAI error ${openaiResponse.status}: ${err.substring(0, 300)}`);
    }

    const data = await openaiResponse.json();
    const responseData = data.choices?.[0]?.message?.content || '';
    totalInput += data.usage?.prompt_tokens || 0;
    totalOutput += data.usage?.completion_tokens || 0;
    totalCost += calcCost('gpt-4o', data.usage?.prompt_tokens || 0, data.usage?.completion_tokens || 0);

    const elapsed = Date.now() - startTime;

    base44.asServiceRole.entities.UsageLog.create({
      user_email: user.email, action_type: 'chat_ai', model_used: 'gpt-4o',
      provider: 'openai', input_tokens: totalInput, output_tokens: totalOutput,
      cost_usd: Math.round(totalCost * 100000) / 100000, category: routerResult.category || 'Generale',
      response_time_ms: elapsed, timestamp: new Date().toISOString(),
    }).catch(() => {});

    return Response.json({
      success: true, data: responseData, model_used: 'gpt-4o', provider: 'openai',
      tokens: { input: totalInput, output: totalOutput }, cost_usd: totalCost,
      response_time_ms: elapsed, web_search_used: false,
    });

  } catch (e) {
    console.error('[consultaAI] Fatal:', e.message);
    return Response.json({ error: e.message, fallback: true }, { status: 500 });
  }
});