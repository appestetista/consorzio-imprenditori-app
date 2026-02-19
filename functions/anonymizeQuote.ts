import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, request_id } = await req.json();
    if (!file_url) {
      return Response.json({ error: 'file_url required' }, { status: 400 });
    }

    // Use LLM with the file to extract and anonymize
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analizza questo documento (preventivo/fattura/offerta commerciale).

OBIETTIVO: Estrarre il contenuto e ANONIMIZZARLO completamente.

REGOLE DI ANONIMIZZAZIONE:
1. RIMUOVI il nome dell'azienda che ha EMESSO il preventivo → sostituisci con "Fornitore Attuale"
2. RIMUOVI il nome dell'azienda DESTINATARIA → sostituisci con "Azienda Richiedente"  
3. RIMUOVI qualsiasi partita IVA, codice fiscale, indirizzo specifico, numero di telefono, email, nomi di persone
4. MANTIENI INTATTI: importi, prezzi, descrizioni dei servizi/prodotti, quantità, condizioni di pagamento, tempistiche
5. Se ci sono loghi o riferimenti grafici, segnalali come "[Logo rimosso]"

Restituisci il contenuto anonimizzato in formato testuale leggibile, mantenendo la struttura del documento originale.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          anonymized_content: {
            type: "string",
            description: "Contenuto del preventivo completamente anonimizzato"
          },
          original_issuer: {
            type: "string",
            description: "Nome dell'azienda emittente trovata (per log interno, non mostrato)"
          },
          original_recipient: {
            type: "string",
            description: "Nome dell'azienda destinataria trovata (per log interno, non mostrato)"
          },
          document_type: {
            type: "string",
            description: "Tipo di documento (preventivo, fattura, offerta, etc.)"
          },
          total_amount: {
            type: "string",
            description: "Importo totale se presente"
          },
          items_summary: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: { type: "string" },
                amount: { type: "string" }
              }
            },
            description: "Riepilogo voci principali"
          },
          warnings: {
            type: "array",
            items: { type: "string" },
            description: "Eventuali avvisi (es. dati non completamente anonimizzabili)"
          }
        }
      }
    });

    // If we have a request_id, save the anonymized quote URL info
    if (request_id) {
      await base44.entities.SupplierRequest.update(request_id, {
        existing_quote_url: file_url
      });
    }

    return Response.json({
      success: true,
      ...result
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});