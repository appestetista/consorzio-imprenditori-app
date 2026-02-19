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

    // Get Gmail access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("gmail");

    const results = [];
    const updatedSuppliers = [...foundSuppliers];

    for (const idx of selected_supplier_indices) {
      const supplier = foundSuppliers[idx];
      if (!supplier || supplier.email === 'non_trovata' || !supplier.email) {
        results.push({ index: idx, status: 'skipped', reason: 'email non disponibile' });
        continue;
      }

      // Build the anonymous email - NO mention of the requesting company
      const subject = `Richiesta di preventivo - Consorzio Imprenditori`;
      const body = `Gentile ${supplier.name},

Vi contattiamo a nome del Consorzio Imprenditori per conto di un nostro membro associato.

Stiamo ricercando un fornitore qualificato per la seguente esigenza:

📋 CATEGORIA: ${category}
📝 DESCRIZIONE ESIGENZA: ${supplierRequest.problem_to_solve}
📍 ZONA: ${supplierRequest.locality || 'Italia'}
⏰ URGENZA: ${supplierRequest.urgency === 'immediata' ? 'Immediata' : supplierRequest.urgency === 'entro_1_mese' ? 'Entro 1 mese' : supplierRequest.urgency === 'entro_3_mesi' ? 'Entro 3 mesi' : 'Nessuna fretta'}${budgetLabel}

Il nostro membro desidera ricevere un preventivo indicativo per valutare una possibile collaborazione.

🔒 NOTA PRIVACY: Per tutela del nostro associato, i suoi dati identificativi verranno condivisi solo in caso di reciproco interesse e dopo valutazione del preventivo.

Per inviare il vostro preventivo o per qualsiasi informazione, rispondete direttamente a questa email.

Cordiali saluti,
Consorzio Imprenditori
Ricerca Fornitori Intelligente`;

      // Send email via Gmail API
      const emailContent = [
        `To: ${supplier.email}`,
        `Subject: ${subject}`,
        `Content-Type: text/plain; charset=utf-8`,
        ``,
        body
      ].join('\r\n');

      const encodedEmail = btoa(unescape(encodeURIComponent(emailContent)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          raw: encodedEmail
        })
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
      results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});