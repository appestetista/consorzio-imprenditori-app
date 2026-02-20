import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { request_id, selected_supplier_indices } = await req.json();
    if (!request_id || !selected_supplier_indices || selected_supplier_indices.length === 0) {
      return Response.json({ error: 'request_id and selected_supplier_indices required' }, { status: 400 });
    }

    // Fetch the supplier request
    const requests = await base44.entities.SupplierRequest.filter({ id: request_id });
    const supplierRequest = requests[0];
    if (!supplierRequest) {
      return Response.json({ error: 'Request not found' }, { status: 404 });
    }

    if (supplierRequest.author_email !== user.email) {
      return Response.json({ error: 'Not authorized' }, { status: 403 });
    }

    const foundSuppliers = supplierRequest.found_suppliers || [];
    const category = supplierRequest.category || supplierRequest.service_type;
    const budgetLabel = supplierRequest.budget_range ? ` con un budget indicativo di ${supplierRequest.budget_range.replace('_', ' ')} €` : '';
    const anonymizedQuoteUrl = supplierRequest.existing_quote_url || null;

    // Get Gmail access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("gmail");

    // If there's an anonymized quote, fetch the HTML content for attachment
    let quoteHtmlContent = null;
    if (anonymizedQuoteUrl) {
      try {
        const quoteResponse = await fetch(anonymizedQuoteUrl);
        if (quoteResponse.ok) {
          quoteHtmlContent = await quoteResponse.text();
        }
      } catch (e) {
        console.log('Could not fetch anonymized quote:', e.message);
      }
    }

    const results = [];
    const updatedSuppliers = [...foundSuppliers];

    for (const idx of selected_supplier_indices) {
      const supplier = foundSuppliers[idx];
      if (!supplier || supplier.email === 'non_trovata' || !supplier.email) {
        results.push({ index: idx, status: 'skipped', reason: 'email non disponibile' });
        continue;
      }

      const hasQuote = !!quoteHtmlContent;

      const bodyText = `Gentile ${supplier.name},

Vi contattiamo a nome del Consorzio Imprenditori per conto di un nostro membro associato.

Stiamo ricercando un fornitore qualificato per la seguente esigenza:

📋 CATEGORIA: ${category}
📝 DESCRIZIONE ESIGENZA: ${supplierRequest.problem_to_solve}
📍 ZONA: ${supplierRequest.locality || 'Italia'}
⏰ URGENZA: ${supplierRequest.urgency === 'immediata' ? 'Immediata' : supplierRequest.urgency === 'entro_1_mese' ? 'Entro 1 mese' : supplierRequest.urgency === 'entro_3_mesi' ? 'Entro 3 mesi' : 'Nessuna fretta'}${budgetLabel}
${hasQuote ? `
📎 PREVENTIVO DI RIFERIMENTO: In allegato trovate un preventivo ricevuto dal nostro associato (anonimizzato). Cerchiamo un'offerta competitiva, possibilmente migliorativa rispetto a questa.
` : ''}
Il nostro membro desidera ricevere un preventivo indicativo per valutare una possibile collaborazione.

🔒 NOTA PRIVACY: Per tutela del nostro associato, i suoi dati identificativi verranno condivisi solo in caso di reciproco interesse e dopo valutazione del preventivo.

Per inviare il vostro preventivo o per qualsiasi informazione, rispondete direttamente a questa email.

Cordiali saluti,
Consorzio Imprenditori
Ricerca Fornitori Intelligente`;

      let rawEmail;

      if (hasQuote) {
        // MIME multipart email with HTML attachment
        const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        // Encode the HTML attachment in base64
        const encoder = new TextEncoder();
        const htmlBytes = encoder.encode(quoteHtmlContent);
        const base64Html = btoa(String.fromCharCode(...htmlBytes));
        
        const mimeMessage = [
          `To: ${supplier.email}`,
          `Subject: Richiesta di preventivo - Consorzio Imprenditori`,
          `MIME-Version: 1.0`,
          `Content-Type: multipart/mixed; boundary="${boundary}"`,
          ``,
          `--${boundary}`,
          `Content-Type: text/plain; charset=utf-8`,
          `Content-Transfer-Encoding: base64`,
          ``,
          btoa(unescape(encodeURIComponent(bodyText))),
          ``,
          `--${boundary}`,
          `Content-Type: text/html; charset=utf-8; name="preventivo_riferimento.html"`,
          `Content-Disposition: attachment; filename="preventivo_riferimento.html"`,
          `Content-Transfer-Encoding: base64`,
          ``,
          base64Html,
          ``,
          `--${boundary}--`
        ].join('\r\n');

        rawEmail = btoa(unescape(encodeURIComponent(mimeMessage)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
      } else {
        // Simple text email without attachment
        const emailContent = [
          `To: ${supplier.email}`,
          `Subject: Richiesta di preventivo - Consorzio Imprenditori`,
          `Content-Type: text/plain; charset=utf-8`,
          ``,
          bodyText
        ].join('\r\n');

        rawEmail = btoa(unescape(encodeURIComponent(emailContent)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
      }

      const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: rawEmail })
      });

      if (gmailResponse.ok) {
        updatedSuppliers[idx] = { ...supplier, selected: true, quote_sent: true };
        results.push({ index: idx, status: 'sent', email: supplier.email });
      } else {
        const errText = await gmailResponse.text();
        results.push({ index: idx, status: 'error', email: supplier.email, error: errText });
      }
    }

    // Update the request with sent status
    await base44.entities.SupplierRequest.update(request_id, {
      found_suppliers: updatedSuppliers,
      status: 'preventivi_inviati'
    });

    const sentCount = results.filter(r => r.status === 'sent').length;

    return Response.json({
      success: true,
      sent_count: sentCount,
      total_selected: selected_supplier_indices.length,
      has_quote_attached: !!quoteHtmlContent,
      results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});