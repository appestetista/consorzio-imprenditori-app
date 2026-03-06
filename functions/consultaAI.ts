import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ═══════════════════════════════════════════════════════════════
// consultaAI v5 — FAST & PRACTICAL
//
// Strategia: GPT-4o-mini (3-4x più veloce di GPT-4o, qualità eccellente)
// Target: risposta completa in < 6 secondi
// ═══════════════════════════════════════════════════════════════

function calcCost(model, inputTokens, outputTokens) {
  const rates = {
    'gpt-4o':       { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
    'gpt-4o-mini':  { input: 0.15 / 1_000_000, output: 0.60  / 1_000_000 },
    'gemini-flash': { input: 0.15 / 1_000_000, output: 0.60  / 1_000_000 },
  };
  const r = rates[model] || rates['gpt-4o-mini'];
  return (inputTokens * r.input) + (outputTokens * r.output);
}

function buildSystemPrompt() {
  return `Sei ARIA, consulente strategico d'elite per imprenditori italiani (PMI, startup, professionisti).

IDENTITÀ:
- Parli come un advisor che ha 20 anni di esperienza con centinaia di aziende
- Tono autorevole ma accessibile, diretto, zero fuffa
- Dai del "tu" professionale

FORMATO RISPOSTA:
- Apri con la risposta diretta alla domanda (max 2 frasi)
- Poi sviluppa con dettagli pratici usando **grassetto** per numeri e concetti chiave
- Usa elenchi puntati per azioni concrete o confronti
- Chiudi con un'azione specifica che l'imprenditore può fare OGGI
- Lunghezza ideale: 200-400 parole (mai oltre 500)

COMPETENZE CORE:
- Fiscalità italiana: regimi, IVA, crediti d'imposta, incentivi, scadenze
- Gestione aziendale: cash flow, pricing, margini, break-even
- Normativa: contratti, GDPR, sicurezza lavoro, CCNL
- Digital: fatturazione elettronica, PEC, SPID/CIE, strumenti digitali
- Finanza agevolata: bandi, contributi, Transizione 5.0
- HR: costo del lavoro, assunzioni, TFR, welfare

REGOLE ASSOLUTE:
- Mai frasi vuote ("Ottima domanda!", "Certo!", "Con piacere!")
- Numeri concreti sempre (aliquote, importi, scadenze, percentuali)
- Se un dato potrebbe essere cambiato, avvisa di verificare
- Mai inventare normative o numeri — se non sei sicuro, dillo
- Niente emoji nel testo

Alla fine di ogni risposta, aggiungi esattamente questo blocco:

---
**Vuoi approfondire?**
1. [domanda specifica correlata]
2. [domanda specifica correlata]`;
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
    const { message, conversationHistory } = body;
    if (!message) return Response.json({ error: 'Messaggio mancante' }, { status: 400 });

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return Response.json({ error: 'OPENAI_API_KEY non configurata' }, { status: 500 });

    // ── Prepara i messaggi ──
    const systemPrompt = buildSystemPrompt();
    const chatMessages = [{ role: "system", content: systemPrompt }];

    // History troncata a 4000 char — sufficiente per contesto, meno token = più veloce
    const truncatedHistory = conversationHistory ? conversationHistory.substring(0, 4000) : '';
    if (truncatedHistory.trim()) {
      chatMessages.push({
        role: "system",
        content: `CONVERSAZIONE PRECEDENTE (sintesi):\n${truncatedHistory}`
      });
    }
    chatMessages.push({ role: "user", content: message });

    // ── Chiamata GPT-4o-mini (velocissima, ~3-5s) ──
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: chatMessages,
        temperature: 0.4,
        max_tokens: 1200,
        top_p: 0.9,
        frequency_penalty: 0.2,
        presence_penalty: 0.1,
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!openaiResponse.ok) {
      const err = await openaiResponse.text();
      throw new Error(`OpenAI error ${openaiResponse.status}: ${err.substring(0, 200)}`);
    }

    const data = await openaiResponse.json();
    const responseText = data.choices?.[0]?.message?.content || '';
    const totalInput = data.usage?.prompt_tokens || 0;
    const totalOutput = data.usage?.completion_tokens || 0;
    const totalCost = calcCost('gpt-4o-mini', totalInput, totalOutput);

    const elapsed = Date.now() - startTime;
    console.log(`[consultaAI] Complete in ${elapsed}ms (${responseText.length} chars, ${totalInput}+${totalOutput} tokens)`);

    // Genera titolo inline (estrai dalle prime parole della risposta)
    const titleMatch = message.length > 50 ? message.substring(0, 50) + '...' : message;
    let generatedTitle = '';
    try {
      // Titolo veloce con Gemini Flash (non bloccante, con timeout stretto)
      const geminiKey = Deno.env.get("GEMINI_API_KEY");
      if (geminiKey) {
        const titleUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
        const titleResp = await fetch(titleUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Genera un titolo breve (max 6 parole) per questa domanda: "${titleMatch}". Solo il titolo.` }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 20 },
          }),
          signal: AbortSignal.timeout(3000),
        });
        if (titleResp.ok) {
          const titleData = await titleResp.json();
          generatedTitle = titleData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        }
      }
    } catch {}

    // Log costi (fire-and-forget)
    base44.asServiceRole.entities.UsageLog.create({
      user_email: user.email,
      action_type: 'chat_ai',
      model_used: 'gpt-4o-mini',
      provider: 'openai',
      input_tokens: totalInput,
      output_tokens: totalOutput,
      cost_usd: Math.round(totalCost * 100000) / 100000,
      response_time_ms: elapsed,
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    return Response.json({
      success: true,
      data: responseText,
      response_time_ms: elapsed,
      generated_title: generatedTitle || null,
    });

  } catch (e) {
    console.error('[consultaAI] Fatal:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
});