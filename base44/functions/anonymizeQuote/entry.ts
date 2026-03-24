import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, request_id, user_company_name, user_address, user_vat } = await req.json();
    if (!file_url) {
      return Response.json({ error: 'file_url required' }, { status: 400 });
    }

    // Step 1: Use AI vision to analyze the document and identify ALL sensitive data
    const analysisResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Analizza questo documento (preventivo/fattura/offerta commerciale) come immagine.

OBIETTIVO: Identificare TUTTE le informazioni sensibili da censurare visivamente con rettangoli neri.

DATI AGGIUNTIVI DELL'UTENTE CHE HA CARICATO IL DOCUMENTO (da cercare e censurare anche questi):
- Nome azienda utente: ${user_company_name || 'non fornito'}
- Indirizzo utente: ${user_address || 'non fornito'}
- P.IVA utente: ${user_vat || 'non fornita'}

IDENTIFICA E ELENCA TUTTI i seguenti elementi presenti nel documento:
1. Nomi di aziende/società (sia emittente che destinatario)
2. Loghi aziendali (descrivi posizione: es. "in alto a sinistra", "intestazione centrale")
3. Indirizzi completi (via, città, CAP, provincia)
4. Partite IVA e codici fiscali
5. Numeri di telefono e fax
6. Indirizzi email
7. Siti web / URL
8. Nomi di persone (referenti, firmatari)
9. Codici cliente/fornitore
10. IBAN e dati bancari
11. PEC
12. Codice SDI / codice destinatario

NON censurare: importi, prezzi, descrizioni servizi/prodotti, quantità, date, condizioni pagamento.

Restituisci l'elenco COMPLETO di ogni singolo testo sensibile trovato.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          sensitive_texts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { type: "string", description: "Il testo esatto da censurare come appare nel documento" },
                type: { type: "string", description: "Tipo: nome_azienda, logo, indirizzo, partita_iva, telefono, email, sito_web, nome_persona, codice_cliente, iban, pec, codice_sdi" },
                position_hint: { type: "string", description: "Posizione approssimativa nel documento (es: intestazione, piè di pagina, corpo, alto-sinistra)" }
              }
            },
            description: "Lista di tutti i testi sensibili trovati"
          },
          has_logo: {
            type: "boolean",
            description: "Se è presente un logo aziendale visibile"
          },
          logo_position: {
            type: "string",
            description: "Posizione del logo (es: alto-sinistra, intestazione-centro)"
          },
          document_type: {
            type: "string",
            description: "Tipo di documento (preventivo, fattura, offerta)"
          },
          total_amount: {
            type: "string",
            description: "Importo totale del documento se presente"
          }
        }
      }
    });

    // Step 2: Now generate the redacted image using AI image generation
    // Build the redaction instructions for the image generator
    const sensitiveTexts = analysisResult.sensitive_texts || [];
    const redactionList = sensitiveTexts.map(s => `"${s.text}" (${s.type})`).join('\n- ');
    
    // Step 3: Use InvokeLLM to create an HTML representation with redactions, then convert to image
    const htmlResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Guarda attentamente questo documento e ricrealo FEDELMENTE in HTML, ma con le parti sensibili censurate.

ISTRUZIONI CRITICHE:
1. Ricrea il layout del documento il più fedelmente possibile (intestazione, corpo, piè di pagina)
2. Usa lo STESSO stile visivo (font simili, allineamenti, tabelle se presenti)
3. Le seguenti informazioni devono essere COPERTE con un rettangolo nero solido (usa <span style="background-color:black;color:black;padding:2px 8px;">██████</span>):

LISTA ELEMENTI DA CENSURARE:
- ${redactionList}
${analysisResult.has_logo ? `- Il logo aziendale in posizione ${analysisResult.logo_position} (sostituisci con un rettangolo nero)` : ''}

4. MANTIENI VISIBILI: tutti gli importi, prezzi, descrizioni prodotti/servizi, quantità, date, condizioni di pagamento, numeri documento
5. Il risultato deve sembrare un documento reale con le parti sensibili oscurate da barre nere, come in un documento declassificato

Genera HTML completo e autocontenuto (con <style> inline). Dimensione pagina A4 (210mm x 297mm circa, usa max-width: 800px).
NON includere <html>, <head>, <body> tags - solo il contenuto del div principale.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          html_content: {
            type: "string",
            description: "HTML del documento con redazioni nere. Solo il contenuto, senza html/head/body tags."
          }
        }
      }
    });

    const htmlContent = htmlResult.html_content || '';

    // Step 4: Create a full HTML page and upload it
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    font-family: Arial, Helvetica, sans-serif; 
    background: white; 
    padding: 40px; 
    max-width: 800px; 
    margin: 0 auto;
    color: #333;
  }
  .redacted {
    background-color: #000 !important;
    color: #000 !important;
    padding: 2px 10px;
    border-radius: 2px;
    display: inline-block;
    min-width: 80px;
    user-select: none;
  }
  .redacted-block {
    background-color: #000;
    width: 150px;
    height: 60px;
    display: block;
  }
  table { border-collapse: collapse; width: 100%; }
  td, th { padding: 6px 10px; border: 1px solid #ddd; text-align: left; }
  .watermark {
    position: fixed;
    bottom: 20px;
    right: 20px;
    font-size: 10px;
    color: #999;
    opacity: 0.6;
  }
</style>
</head>
<body>
${htmlContent}
<div class="watermark">Documento anonimizzato - Consorzio Imprenditori</div>
</body>
</html>`;

    // Upload the HTML as a file
    const htmlBlob = new Blob([fullHtml], { type: 'text/html' });
    const htmlFile = new File([htmlBlob], 'preventivo_anonimizzato.html', { type: 'text/html' });
    const { file_url: anonymized_html_url } = await base44.integrations.Core.UploadFile({ file: htmlFile });

    // Step 5: If we have a request_id, save the anonymized quote URL
    if (request_id) {
      await base44.entities.SupplierRequest.update(request_id, {
        existing_quote_url: anonymized_html_url
      });
    }

    return Response.json({
      success: true,
      anonymized_url: anonymized_html_url,
      original_url: file_url,
      sensitive_items_found: sensitiveTexts.length,
      has_logo_redacted: analysisResult.has_logo || false,
      document_type: analysisResult.document_type,
      total_amount: analysisResult.total_amount
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});