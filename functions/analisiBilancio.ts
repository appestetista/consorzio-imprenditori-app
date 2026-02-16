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

    return Response.json({ 
      success: true, 
      analisi: result,
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