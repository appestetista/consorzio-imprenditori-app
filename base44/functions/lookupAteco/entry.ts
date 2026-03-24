import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { descrizione_attivita, ragione_sociale, partita_iva } = await req.json();

    if (!descrizione_attivita && !ragione_sociale) {
      return Response.json({ error: 'Serve almeno descrizione_attivita o ragione_sociale' }, { status: 400 });
    }

    // 1) Carica TUTTI i codici ATECO dal database (solo sottocategorie = massimo dettaglio)
    let allAteco = [];
    let skip = 0;
    const batchSize = 100;
    while (true) {
      const batch = await base44.asServiceRole.entities.CodiceATECO.filter(
        { livello: 'sottocategoria' },
        'codice',
        batchSize,
        skip
      );
      if (!batch || batch.length === 0) break;
      allAteco = allAteco.concat(batch);
      skip += batchSize;
      if (batch.length < batchSize) break;
    }

    console.log(`[lookupAteco] Caricati ${allAteco.length} codici ATECO sottocategoria dal DB`);

    if (allAteco.length === 0) {
      return Response.json({ codice_ateco: '', descrizione_ateco: '', error: 'Nessun codice ATECO nel database' });
    }

    // 2) Costruisci lista compatta codice|descrizione
    const atecoList = allAteco.map(a => `${a.codice}|${a.descrizione}`).join('\n');

    // 3) Chiedi alla LLM di trovare il match migliore
    const searchQuery = [
      descrizione_attivita ? `Attività: ${descrizione_attivita}` : '',
      ragione_sociale ? `Ragione sociale: ${ragione_sociale}` : '',
      partita_iva ? `P.IVA: ${partita_iva}` : ''
    ].filter(Boolean).join(', ');

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Sei un esperto di classificazione ATECO 2007 ISTAT.

DATI AZIENDA DA CLASSIFICARE:
${searchQuery}

LISTA COMPLETA DEI CODICI ATECO DISPONIBILI (formato: codice|descrizione):
${atecoList}

ISTRUZIONI RIGOROSE:
1. Analizza attentamente la descrizione dell'attività aziendale
2. Cerca nella lista sopra il codice ATECO che corrisponde MEGLIO all'attività descritta
3. DEVI scegliere SOLO un codice presente nella lista sopra — NON inventare codici
4. Se l'attività è ambigua, scegli il codice più specifico e pertinente
5. ATTENZIONE alle parole simili: "ristrutturazione" ≠ "ristorazione", "edilizia" ≠ "editoria", ecc.
6. Se non trovi un match ragionevole, restituisci stringa vuota

RISPONDI SOLO con il codice scelto dalla lista e la sua descrizione esatta dalla lista.`,
      response_json_schema: {
        type: "object",
        properties: {
          codice_ateco: { type: "string", description: "Codice ATECO scelto dalla lista (es: 43.31.00). Vuoto se nessun match." },
          descrizione_ateco: { type: "string", description: "Descrizione esatta dalla lista." },
          confidence: { type: "string", enum: ["alta", "media", "bassa"], description: "Livello di confidenza del match" },
          reasoning: { type: "string", description: "Breve spiegazione del perché questo codice è stato scelto" }
        }
      }
    });

    // 4) Verifica che il codice restituito esista davvero nella lista
    const matchedCode = allAteco.find(a => a.codice === result.codice_ateco);
    if (!matchedCode) {
      console.log(`[lookupAteco] Codice ${result.codice_ateco} non trovato nel DB, invalido`);
      return Response.json({ codice_ateco: '', descrizione_ateco: '', confidence: 'bassa', reasoning: 'Codice non trovato nel database' });
    }

    console.log(`[lookupAteco] Match: ${result.codice_ateco} - ${matchedCode.descrizione} (${result.confidence})`);

    return Response.json({
      codice_ateco: matchedCode.codice,
      descrizione_ateco: matchedCode.descrizione,
      confidence: result.confidence || 'media',
      reasoning: result.reasoning || ''
    });

  } catch (error) {
    console.error('[lookupAteco] Errore:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});