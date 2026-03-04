// ============================================
// BACKEND FUNCTION: consultaAI
// Sistema combinato OpenAI + Gemini
// Routing intelligente per tipo di domanda
// ============================================

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ===== CONFIGURAZIONE MODELLI =====
const MODELS = {
  'gpt-4o': { provider: 'openai', model: 'gpt-4o', maxTokens: 4000, temperature: 0.3 },
  'gpt-4o-mini': { provider: 'openai', model: 'gpt-4o-mini', maxTokens: 3000, temperature: 0.3 },
  'gemini-flash': { provider: 'gemini', model: 'gemini-2.5-flash-preview-05-20', maxTokens: 4000, temperature: 0.3 },
  'gemini-pro': { provider: 'gemini', model: 'gemini-2.5-pro-preview-05-06', maxTokens: 4000, temperature: 0.3 },
};

// ===== ROUTING: quale modello per quale categoria =====
const CATEGORY_MODEL_MAP = {
  'Fiscale': 'gpt-4o',
  'Legale': 'gpt-4o',
  'Personale/HR': 'gpt-4o',
  'Investimenti': 'gpt-4o',
  'Contratti': 'gpt-4o',
  'Confronto': 'gpt-4o',
  'Operativa': 'gpt-4o-mini',
  'Marketing': 'gpt-4o-mini',
  'Strategica': 'gpt-4o',
  'Bandi': 'gemini-flash',
  'Import/Export': 'gemini-pro',
  'default': 'gpt-4o-mini',
};

// ===== REGEX per forzare modello potente =====
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

function selectModel(category, message) {
  if (FORCE_GPT4O_PATTERNS.some(p => p.test(message))) {
    return { ...MODELS['gpt-4o'], key: 'gpt-4o' };
  }
  const modelKey = CATEGORY_MODEL_MAP[category] || CATEGORY_MODEL_MAP['default'];
  return { ...MODELS[modelKey], key: modelKey };
}

// ===== SYSTEM PROMPT OTTIMIZZATO =====
const SYSTEM_PROMPT = `Sei un consulente strategico senior specializzato in PMI italiane con 20 anni di esperienza. Rispondi SEMPRE con dati concreti e specifici.

REGOLE FONDAMENTALI — VIOLARNE UNA È INACCETTABILE:
1. INIZIA SEMPRE la sintesi_decisionale con il NUMERO più importante per l'utente (costo, risparmio, scadenza, aliquota esatta)
2. Per ogni dato numerico citato: INDICA la fonte tra parentesi. Formato: [VERIFICATO — Nome Fonte, art. X] oppure [VERIFICATO — URL]
3. Se NON trovi un dato specifico: scrivi "⚠️ Dato non disponibile — verificare con il proprio commercialista" — NON INVENTARE MAI
4. Se trovi fonti contrastanti: segnala con [⚠️ FONTI DISCORDANTI — fonte1 dice X, fonte2 dice Y]
5. NON arrotondare MAI aliquote fiscali, soglie INPS, importi di legge — sono numeri ESATTI per legge
6. Distingui SEMPRE tra: norma vigente 2025-2026, norma in discussione/proposta, norma scaduta/abrogata
7. Ogni numero nel campo impatto_economico DEVE avere la fonte tra parentesi
8. NON dare MAI consigli generici tipo "consulta un professionista" SENZA aver PRIMA fornito numeri concreti e calcoli specifici

OBBLIGO DI SPECIFICITÀ:
- Per domande su costi: CALCOLA il range con cifre reali (es. "Un dipendente CCNL Commercio livello 4 costa tra 28.000€ e 32.000€ lordi annui")
- Per domande fiscali: USA le aliquote e soglie ESATTE vigenti con gli scaglioni corretti
- Per domande su contratti: CITA gli articoli esatti del Codice Civile o la legge specifica
- Per domande su bandi: CERCA e NOMINA bandi reali attualmente aperti con importi e scadenze
- Se il profilo utente contiene settore, fatturato, n. dipendenti: USA quei dati per PERSONALIZZARE i calcoli
- Ogni sezione della risposta deve contenere ALMENO un dato numerico concreto o riferimento normativo
- La sintesi deve essere LUNGA e DETTAGLIATA (almeno 200 parole), non riassunti di 2 righe

PERSONALIZZAZIONE OBBLIGATORIA:
- Se conosci il regime fiscale dell'utente, calcola con quello specifico
- Se conosci il settore, usa il CCNL di settore con livelli e importi reali
- Se conosci il fatturato, applica gli scaglioni corretti a quell'importo

STILE DI RISPOSTA:
- Linguaggio diretto, come un consulente che parla al suo cliente imprenditore
- Usa "tu" e "la tua azienda", mai "il contribuente" o "l'impresa"
- Spiega i termini tecnici la PRIMA volta che li usi (es. "IRPEF (l'imposta sul reddito delle persone fisiche)")
- La raccomandazione finale deve essere un'AZIONE CONCRETA da fare domani mattina alle 9
- Non menzionare mai di essere un'intelligenza artificiale o un chatbot
- Scrivi come se stessi parlando faccia a faccia con il tuo cliente`;

// ===== SCHEMA RISPOSTA JSON =====
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    categoria: { type: "string" },
    sintesi_decisionale: { type: "string", description: "INIZIA con il numero più importante. Almeno 200 parole con dati reali e tag [VERIFICATO — fonte] o [STIMA]" },
    impatto_economico: { type: "string", description: "Cifre EUR concrete con fonte. Range minimo-massimo se necessario." },
    rischi_criticita: { type: "string", description: "Rischi specifici con norme di riferimento esatte (legge + articolo)" },
    tempo_attuazione: { type: "string", description: "Timeline realistica con date concrete" },
    raccomandazione_finale: { type: "string", description: "Azione CONCRETA da fare domani mattina alle 9 come primo passo" },
    fonti: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nome: { type: "string" },
          url: { type: "string" },
          tipo: { type: "string", enum: ["legge", "circolare", "sito_istituzionale", "articolo", "stima"] }
        },
        required: ["nome", "tipo"]
      }
    },
    affidabilita: {
      type: "object",
      properties: {
        verificati: { type: "number", description: "Numero dati verificati con fonte" },
        stimati: { type: "number", description: "Numero dati stimati senza fonte certa" },
        da_confermare: { type: "number", description: "Numero dati da confermare con professionista" },
        punteggio: { type: "number", description: "Punteggio 0-100 di affidabilità complessiva" }
      },
      required: ["verificati", "stimati", "da_confermare", "punteggio"]
    },
    followup_questions: { type: "array", items: { type: "string" }, description: "3 domande di approfondimento pertinenti" },
    disclaimer_dati: { type: "string", description: "Se qualche dato non è stato verificato, elencalo. Se tutto OK: 'Tutti i dati citati sono stati verificati con fonti ufficiali'" }
  },
  required: ["categoria", "sintesi_decisionale", "impatto_economico", "rischi_criticita", "tempo_attuazione", "raccomandazione_finale", "fonti", "affidabilita", "followup_questions", "disclaimer_dati"]
};

// ===== CHIAMATA OPENAI =====
async function callOpenAI(apiKey, model, systemPrompt, userPrompt, maxTokens, temperature) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: temperature,
      max_tokens: maxTokens,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "consulenza_response",
          strict: false,
          schema: RESPONSE_SCHEMA
        }
      }
    }),
    signal: AbortSignal.timeout(90000)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[consultaAI] OpenAI error:', response.status, errText);
    throw new Error('OpenAI API error: ' + response.status + ' - ' + errText.substring(0, 200));
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0,
  };
}

// ===== CHIAMATA GEMINI =====
async function callGemini(apiKey, model, systemPrompt, userPrompt, maxTokens, temperature) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: maxTokens,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    }),
    signal: AbortSignal.timeout(90000)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[consultaAI] Gemini error:', response.status, errText);
    throw new Error('Gemini API error: ' + response.status + ' - ' + errText.substring(0, 200));
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

// ===== HANDLER PRINCIPALE =====
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const body = await req.json();
    const {
      message,
      category,
      sottocategoria,
      userContext,
      kbContent,
      conversationHistory,
    } = body;

    if (!message) {
      return Response.json({ error: 'Messaggio mancante' }, { status: 400 });
    }

    // 1. Seleziona modello
    const selectedModel = selectModel(category || 'default', message);
    
    // 2. Recupera API keys
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    if (selectedModel.provider === 'openai' && !openaiKey) {
      return Response.json({ error: 'OPENAI_API_KEY non configurata' }, { status: 500 });
    }
    if (selectedModel.provider === 'gemini' && !geminiKey) {
      if (openaiKey) {
        selectedModel.provider = 'openai';
        selectedModel.model = 'gpt-4o-mini';
      } else {
        return Response.json({ error: 'Nessuna API key configurata' }, { status: 500 });
      }
    }

    // 3. Costruisci prompt utente completo
    const userPrompt = `${conversationHistory || ''}${kbContent || ''}${userContext || ''}Categoria: ${category || 'Generale'} — ${sottocategoria || ''}.
Domanda: ${message}`;

    // 4. Chiama il modello selezionato
    let result;
    const startTime = Date.now();

    if (selectedModel.provider === 'openai') {
      result = await callOpenAI(
        openaiKey, selectedModel.model, SYSTEM_PROMPT, userPrompt,
        selectedModel.maxTokens, selectedModel.temperature
      );
    } else {
      result = await callGemini(
        geminiKey, selectedModel.model, SYSTEM_PROMPT, userPrompt,
        selectedModel.maxTokens, selectedModel.temperature
      );
    }

    const elapsed = Date.now() - startTime;

    // 5. Parse risposta
    let parsed;
    try {
      let content = result.content.trim();
      if (content.startsWith('```')) content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('[consultaAI] JSON parse error:', e.message);
      parsed = null;
    }

    // 6. Post-validazione qualità
    if (parsed) {
      const warnings = [];
      if (!parsed.fonti || parsed.fonti.length === 0) {
        warnings.push('Nessuna fonte citata nella risposta');
      } else {
        const senzaUrl = parsed.fonti.filter(f => !f.url || f.url === '');
        if (senzaUrl.length > 0) warnings.push(senzaUrl.length + ' fonte/i senza link verificabile');
      }
      if (parsed.affidabilita?.punteggio < 50) {
        warnings.push('Punteggio affidabilità basso (' + parsed.affidabilita.punteggio + '/100)');
      }
      if (parsed.affidabilita?.stimati > parsed.affidabilita?.verificati) {
        warnings.push('Più dati stimati che verificati — consigliata verifica con un professionista');
      }
      if (warnings.length > 0) parsed._quality_warnings = warnings;
    }

    // 7. Calcola costo reale
    let costUsd = 0;
    if (selectedModel.provider === 'openai') {
      if (selectedModel.model === 'gpt-4o') {
        costUsd = (result.inputTokens * 0.0000025) + (result.outputTokens * 0.00001);
      } else {
        costUsd = (result.inputTokens * 0.00000015) + (result.outputTokens * 0.0000006);
      }
    } else {
      if (selectedModel.model.includes('pro')) {
        costUsd = (result.inputTokens * 0.00000125) + (result.outputTokens * 0.00001);
      } else {
        costUsd = (result.inputTokens * 0.00000015) + (result.outputTokens * 0.0000006);
      }
    }

    // 8. Logga utilizzo (non bloccante)
    try {
      await base44.asServiceRole.entities.UsageLog.create({
        user_email: user.email,
        action_type: 'chat_ai',
        model_used: selectedModel.model,
        provider: selectedModel.provider,
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        cost_usd: Math.round(costUsd * 100000) / 100000,
        category: category || 'Generale',
        response_time_ms: elapsed,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.log('[consultaAI] UsageLog error (non bloccante):', e.message);
    }

    // 9. Restituisci risposta
    return Response.json({
      success: true,
      data: parsed || result.content,
      model_used: selectedModel.model,
      provider: selectedModel.provider,
      tokens: { input: result.inputTokens, output: result.outputTokens },
      cost_usd: costUsd,
      response_time_ms: elapsed,
    });

  } catch (e) {
    console.error('[consultaAI] Error:', e.message);
    return Response.json({ 
      error: e.message,
      fallback: true 
    }, { status: 500 });
  }
});