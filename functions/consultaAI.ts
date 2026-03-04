import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const SYSTEM_PROMPT = `Sei un consulente strategico senior specializzato in PMI italiane con 20 anni di esperienza. Rispondi SEMPRE con dati concreti e specifici.

REGOLE FONDAMENTALI:
1. INIZIA SEMPRE la sintesi_decisionale con il NUMERO più importante per l'utente
2. Per ogni dato numerico: INDICA la fonte [VERIFICATO — Nome Fonte, art. X]
3. Se NON trovi un dato: scrivi "⚠️ Dato non disponibile — verificare con commercialista" — NON INVENTARE MAI
4. Se fonti contrastanti: [⚠️ FONTI DISCORDANTI — fonte1 dice X, fonte2 dice Y]
5. NON arrotondare MAI aliquote fiscali, soglie INPS, importi di legge
6. Distingui tra: norma vigente 2025-2026, proposta, scaduta
7. Ogni numero in impatto_economico DEVE avere la fonte
8. NON dare consigli generici SENZA numeri concreti prima

OBBLIGO DI SPECIFICITÀ:
- Costi: CALCOLA range con cifre reali e mostra TUTTI i passaggi del calcolo
- Fiscale: USA aliquote e soglie ESATTE vigenti con scaglioni corretti
- Contratti: CITA articoli esatti del Codice Civile o legge specifica
- Bandi: NOMINA bandi reali con importi e scadenze
- Se conosci settore/fatturato/dipendenti: PERSONALIZZA i calcoli
- Ogni sezione: ALMENO un dato numerico o riferimento normativo
- La sintesi deve essere MOLTO LUNGA e ULTRA-DETTAGLIATA (almeno 500 parole). Copri OGNI aspetto con numeri, calcoli, confronti, esempi pratici, scadenze e riferimenti normativi
- Anche impatto_economico, rischi_criticita e raccomandazione_finale devono essere LUNGHI (almeno 100 parole ciascuno) con calcoli dettagliati

DATI WEB FORNITI:
Ti verranno forniti dati trovati su internet da un altro sistema. USA quei dati come base per la tua analisi, verificali e integra con le tue conoscenze. Se i dati web contrastano con le tue conoscenze, segnalalo.

PERSONALIZZAZIONE:
- Regime fiscale noto: calcola con quello specifico
- Settore noto: usa CCNL di settore con livelli e importi reali
- Fatturato noto: applica scaglioni corretti

FOLLOWUP QUESTIONS (OBBLIGATORIO):
- Le 3 followup_questions NON sono domande generiche ma PROPOSTE OPERATIVE con azione concreta
- Formato: "Vuoi che ti [AZIONE SPECIFICA]? [DETTAGLIO CONCRETO]"
- Esempi corretti: "Vuoi che ti calcoli il costo netto di un'assunzione con contratto di apprendistato?", "Posso cercarti i bandi regionali aperti per digitalizzazione nella tua zona?", "Ti simulo il risparmio fiscale passando a regime forfettario con il tuo fatturato?"
- Esempi SBAGLIATI (troppo vaghi): "Hai bisogno di altre informazioni?", "Vuoi sapere di più?", "Ti interessa approfondire?"
- Ogni proposta deve far capire COSA farai tu concretamente per l'utente

STILE:
- Linguaggio diretto, usa "tu" e "la tua azienda"
- Spiega termini tecnici la prima volta
- Raccomandazione finale = azione concreta domani mattina alle 9
- Non menzionare mai di essere un'AI
- Scrivi come un parere professionale completo, non un riassunto`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    categoria: { type: "string" },
    sintesi_decisionale: { type: "string", description: "INIZIA con numero più importante. Almeno 500 parole con [VERIFICATO] o [STIMA]" },
    impatto_economico: { type: "string", description: "Cifre EUR con fonte e calcoli dettagliati, almeno 100 parole" },
    rischi_criticita: { type: "string", description: "Rischi con norme esatte, almeno 100 parole" },
    tempo_attuazione: { type: "string", description: "Timeline con date concrete" },
    raccomandazione_finale: { type: "string", description: "Azione concreta domani alle 9, almeno 100 parole" },
    fonti: { type: "array", items: { type: "object", properties: { nome: { type: "string" }, url: { type: "string" }, tipo: { type: "string", enum: ["legge", "circolare", "sito_istituzionale", "articolo", "stima"] } }, required: ["nome", "tipo"] } },
    affidabilita: { type: "object", properties: { verificati: { type: "number" }, stimati: { type: "number" }, da_confermare: { type: "number" }, punteggio: { type: "number" } }, required: ["verificati", "stimati", "da_confermare", "punteggio"] },
    followup_questions: { type: "array", items: { type: "string" }, description: "3 proposte operative con azione concreta. NON domande generiche. Formato: 'Vuoi che ti [azione]? Ad esempio [dettaglio]'. Es: 'Vuoi che ti calcoli il costo esatto di un dipendente part-time nel tuo settore?', 'Posso cercarti i bandi attivi per la tua regione con scadenza nei prossimi 90 giorni?', 'Ti analizzo le differenze fiscali tra SRL e ditta individuale per il tuo fatturato?'" },
    disclaimer_dati: { type: "string" }
  },
  required: ["categoria", "sintesi_decisionale", "impatto_economico", "rischi_criticita", "tempo_attuazione", "raccomandazione_finale", "fonti", "affidabilita", "followup_questions", "disclaimer_dati"]
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

    // STEP 2: GPT-4o elabora risposta finale con dati Gemini
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