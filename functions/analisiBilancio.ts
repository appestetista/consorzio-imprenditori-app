import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url } = await req.json();
    if (!file_url) {
      return Response.json({ error: 'file_url è obbligatorio' }, { status: 400 });
    }

    // STEP 1: Normalizzazione OCR – pulisce il testo senza alterare dati
    const normalizzato = await base44.integrations.Core.InvokeLLM({
      prompt: `Sei un sistema di normalizzazione testo OCR.

Ricevi testo estratto tramite OCR da un documento PDF.
Il tuo compito è ESCLUSIVAMENTE:
- Pulire errori tipografici evidenti causati dall'OCR (es: "Stoto" → "Stato", "Patr1moniale" → "Patrimoniale", "C0nto" → "Conto")
- Correggere spazi mancanti o doppi
- Mantenere numeri e intestazioni ESATTAMENTE come appaiono
- NON correggere valori numerici
- NON interpretare significati
- NON unire tabelle separate
- NON fare deduzioni o aggiunte

Se una riga è ambigua, mantienila così com'è.

Restituisci il testo normalizzato, pronto per l'analisi strutturale.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          testo_normalizzato: {
            type: "string",
            description: "Testo del documento normalizzato e pulito da errori OCR"
          },
          correzioni_applicate: {
            type: "number",
            description: "Numero approssimativo di correzioni tipografiche applicate"
          },
          qualita_ocr: {
            type: "string",
            enum: ["buona", "media", "scarsa"],
            description: "Valutazione della qualità del testo OCR originale"
          }
        }
      }
    });

    const testoNormalizzato = normalizzato?.testo_normalizzato || '';
    const qualitaOcr = normalizzato?.qualita_ocr || 'media';
    const correzioniOcr = normalizzato?.correzioni_applicate || 0;

    // STEP 2: Analisi strutturale del bilancio sul testo normalizzato
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Sei un commercialista esperto in fiscalità italiana.

Analizza il seguente testo (già normalizzato) ESCLUSIVAMENTE per verificare se si tratta di un bilancio di esercizio italiano.

Verifica la presenza di ciascuno dei seguenti elementi:
1. Stato Patrimoniale
2. Conto Economico
3. Nota Integrativa
4. Rendiconto Finanziario

REGOLE TASSATIVE:
- NON interpretare i dati numerici.
- NON calcolare nulla.
- NON stimare informazioni mancanti.
- Rispondi SOLO con la struttura JSON richiesta.
- Per ogni parte, indica true se è presente nel documento, false se assente.
- Il documento è idoneo se contiene ALMENO Stato Patrimoniale e Conto Economico.

TESTO DEL DOCUMENTO:
${testoNormalizzato.substring(0, 30000)}`,
      response_json_schema: {
        type: "object",
        properties: {
          tipo_documento: {
            type: "string",
            description: "Tipo di documento rilevato (es: Bilancio di esercizio, Bilancio abbreviato, Documento non riconosciuto, ecc.)"
          },
          anno_riferimento: {
            type: "string",
            description: "Anno di riferimento del bilancio se rilevabile, altrimenti 'Non rilevato'"
          },
          ragione_sociale: {
            type: "string",
            description: "Ragione sociale dell'azienda se rilevabile, altrimenti 'Non rilevata'"
          },
          parti_presenti: {
            type: "object",
            properties: {
              stato_patrimoniale: { type: "boolean" },
              conto_economico: { type: "boolean" },
              nota_integrativa: { type: "boolean" },
              rendiconto_finanziario: { type: "boolean" }
            }
          },
          esito: {
            type: "string",
            enum: ["Documento idoneo", "Documento non idoneo"],
            description: "Esito finale della verifica"
          },
          note: {
            type: "string",
            description: "Eventuali osservazioni sulla completezza del documento (es: manca il rendiconto finanziario, bilancio in forma abbreviata, ecc.)"
          }
        }
      }
    });

    // STEP 3: Estrazione dati strutturati (solo se documento idoneo)
    let dati_estratti = null;
    if (result?.esito === 'Documento idoneo') {
      dati_estratti = await base44.integrations.Core.InvokeLLM({
        prompt: `Sei un analista di bilancio esperto.

Usa SOLO il testo fornito. Estrai ESCLUSIVAMENTE i valori esplicitamente presenti.

Campi da cercare:

STATO PATRIMONIALE:
- Totale Attivo
- Totale Passivo
- Patrimonio Netto
- Debiti
- Disponibilità liquide

CONTO ECONOMICO:
- Ricavi (Valore della produzione / Ricavi delle vendite)
- Costi totali (Costi della produzione)
- EBITDA (solo se esplicitamente indicato)
- Ammortamenti
- Utile o Perdita (Risultato di esercizio)

IMPOSTE:
- IRES
- IRAP

REGOLE TASSATIVE:
- Se un dato NON è chiaramente presente nel testo → il valore DEVE essere null.
- NON stimare valori mancanti.
- NON ricostruire voci calcolandole.
- NON inventare dati.
- I valori devono essere numeri (senza simbolo €, senza punti migliaia). Usa il segno negativo per le perdite.

TESTO DEL DOCUMENTO:
${testoNormalizzato.substring(0, 30000)}`,
        response_json_schema: {
          type: "object",
          properties: {
            stato_patrimoniale: {
              type: "object",
              properties: {
                totale_attivo: { type: ["number", "null"] },
                totale_passivo: { type: ["number", "null"] },
                patrimonio_netto: { type: ["number", "null"] },
                debiti: { type: ["number", "null"] },
                disponibilita_liquide: { type: ["number", "null"] }
              }
            },
            conto_economico: {
              type: "object",
              properties: {
                ricavi: { type: ["number", "null"] },
                costi_totali: { type: ["number", "null"] },
                ebitda: { type: ["number", "null"] },
                ammortamenti: { type: ["number", "null"] },
                utile_perdita: { type: ["number", "null"] }
              }
            },
            imposte: {
              type: "object",
              properties: {
                ires: { type: ["number", "null"] },
                irap: { type: ["number", "null"] }
              }
            },
            dati_mancanti: {
              type: "array",
              items: { type: "string" },
              description: "Elenco dei campi non trovati nel documento"
            }
          }
        }
      });
    }

    // STEP 4: Revisione contabile – controlli matematici oggettivi
    let revisione = null;
    if (dati_estratti) {
      const sp = dati_estratti.stato_patrimoniale || {};
      const ce = dati_estratti.conto_economico || {};
      const imp = dati_estratti.imposte || {};
      const controlli = [];

      // Controllo 1: Attivo = Passivo + Patrimonio Netto
      if (sp.totale_attivo != null && sp.totale_passivo != null && sp.patrimonio_netto != null) {
        const atteso = sp.totale_passivo + sp.patrimonio_netto;
        const diff = Math.abs(sp.totale_attivo - atteso);
        const tolleranza = Math.max(Math.abs(sp.totale_attivo) * 0.01, 1);
        controlli.push({
          nome: 'Equilibrio patrimoniale (Attivo = Passivo + PN)',
          esito: diff <= tolleranza ? 'coerente' : 'potenzialmente_incoerente',
          dettaglio: `Attivo: ${sp.totale_attivo}, Passivo + PN: ${atteso}, Differenza: ${Math.round(diff)}`
        });
      } else {
        controlli.push({
          nome: 'Equilibrio patrimoniale (Attivo = Passivo + PN)',
          esito: 'non_verificabile',
          dettaglio: 'Dati insufficienti per il controllo'
        });
      }

      // Controllo 2: Coerenza utile CE con PN
      if (ce.utile_perdita != null && sp.patrimonio_netto != null) {
        const coerente = (ce.utile_perdita >= 0 && sp.patrimonio_netto >= 0) ||
                         (ce.utile_perdita < 0 && sp.patrimonio_netto < sp.totale_attivo) ||
                         true; // segno non è sufficiente per incoerenza diretta senza dati precedenti
        // Controllo: se perdita > patrimonio netto → potenziale problema
        let esito = 'coerente';
        let dettaglio = `Utile/Perdita CE: ${ce.utile_perdita}, Patrimonio Netto: ${sp.patrimonio_netto}`;
        if (ce.utile_perdita < 0 && Math.abs(ce.utile_perdita) > Math.abs(sp.patrimonio_netto)) {
          esito = 'potenzialmente_incoerente';
          dettaglio += ' — Perdita superiore al Patrimonio Netto';
        }
        controlli.push({
          nome: 'Coerenza Utile CE / Patrimonio Netto',
          esito,
          dettaglio
        });
      } else {
        controlli.push({
          nome: 'Coerenza Utile CE / Patrimonio Netto',
          esito: 'non_verificabile',
          dettaglio: 'Dati insufficienti per il controllo'
        });
      }

      // Controllo 3: Imposte non superiori all'utile
      if (ce.utile_perdita != null && (imp.ires != null || imp.irap != null)) {
        const totaleImposte = (imp.ires || 0) + (imp.irap || 0);
        let esito = 'coerente';
        let dettaglio = `Imposte totali (IRES+IRAP): ${totaleImposte}, Utile/Perdita: ${ce.utile_perdita}`;
        if (ce.utile_perdita > 0 && totaleImposte > ce.utile_perdita) {
          esito = 'potenzialmente_incoerente';
          dettaglio += ' — Imposte superiori all\'utile lordo';
        }
        if (ce.utile_perdita <= 0 && totaleImposte > 0) {
          esito = 'potenzialmente_incoerente';
          dettaglio += ' — Imposte positive con risultato negativo o nullo';
        }
        controlli.push({
          nome: 'Imposte ≤ Utile lordo',
          esito,
          dettaglio
        });
      } else {
        controlli.push({
          nome: 'Imposte ≤ Utile lordo',
          esito: 'non_verificabile',
          dettaglio: 'Dati insufficienti per il controllo'
        });
      }

      // Controllo 4: Ricavi - Costi coerente con Utile (se tutti disponibili)
      if (ce.ricavi != null && ce.costi_totali != null && ce.utile_perdita != null) {
        const margine = ce.ricavi - ce.costi_totali;
        const diff = Math.abs(margine - ce.utile_perdita);
        const tolleranza = Math.max(Math.abs(ce.ricavi) * 0.05, 1);
        controlli.push({
          nome: 'Coerenza Ricavi - Costi ≈ Utile',
          esito: diff <= tolleranza ? 'coerente' : 'potenzialmente_incoerente',
          dettaglio: `Ricavi - Costi: ${Math.round(margine)}, Utile dichiarato: ${ce.utile_perdita}, Differenza: ${Math.round(diff)}`
        });
      }

      revisione = { controlli };
    }

    return Response.json({ 
      success: true, 
      analisi: result,
      dati_estratti,
      revisione,
      ocr_info: {
        qualita: qualitaOcr,
        correzioni: correzioniOcr
      }
    });

  } catch (error) {
    console.error('Errore analisiBilancio:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});