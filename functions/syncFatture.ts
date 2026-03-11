import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const OPENAPI_TOKEN = Deno.env.get("OPENAPI_IT_TOKEN");
const BASE_URL = "https://invoice.openapi.com";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { azienda_id, fiscal_id, action } = body;

    if (!azienda_id || !fiscal_id) {
      return Response.json({ error: 'azienda_id e fiscal_id sono obbligatori' }, { status: 400 });
    }

    // Azione: configurazione azienda su OpenAPI.it
    if (action === "check_config") {
      const configRes = await fetch(`${BASE_URL}/IT-configurations/${fiscal_id}`, {
        headers: { "Authorization": `Bearer ${OPENAPI_TOKEN}` }
      });
      if (configRes.ok) {
        const config = await configRes.json();
        return Response.json({ configured: true, config });
      } else if (configRes.status === 404) {
        return Response.json({ configured: false });
      } else {
        const errText = await configRes.text();
        return Response.json({ error: `Errore OpenAPI: ${configRes.status} - ${errText}` }, { status: 500 });
      }
    }

    // Azione: sincronizza fatture
    if (action === "sync") {
      // Recupera fatture esistenti per evitare duplicati
      const existingFatture = await base44.asServiceRole.entities.FatturaElettronica.filter({ azienda_id });
      const existingOpenApiIds = new Set(existingFatture.map(f => f.openapi_id).filter(Boolean));

      // Fetch fatture da OpenAPI.it (paginazione)
      let allInvoices = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const url = `${BASE_URL}/IT-invoices?fiscal_id=${fiscal_id}&page=${page}&per_page=100`;
        const res = await fetch(url, {
          headers: { "Authorization": `Bearer ${OPENAPI_TOKEN}` }
        });

        if (!res.ok) {
          const errText = await res.text();
          return Response.json({ error: `Errore fetch fatture: ${res.status} - ${errText}` }, { status: 500 });
        }

        const data = await res.json();
        const invoices = data.data || data;

        if (!Array.isArray(invoices) || invoices.length === 0) {
          hasMore = false;
        } else {
          allInvoices = allInvoices.concat(invoices);
          page++;
          // Se meno di 100, siamo all'ultima pagina
          if (invoices.length < 100) hasMore = false;
        }
      }

      // Filtra solo le nuove fatture
      const newInvoices = allInvoices.filter(inv => !existingOpenApiIds.has(inv.id));

      // Mappa e salva le nuove fatture
      const fattureToCreate = newInvoices.map(inv => {
        const imponibile = inv.total_gross_amount ? Math.round(inv.total_gross_amount / 1.22 * 100) / 100 : 0;
        const iva = inv.total_gross_amount ? Math.round((inv.total_gross_amount - imponibile) * 100) / 100 : 0;

        return {
          azienda_id,
          openapi_id: inv.id,
          direction: inv.direction || "outgoing",
          state: inv.state || "NEW",
          tipo_documento: inv.type || "",
          numero_documento: inv.document_number || "",
          data_emissione: inv.issue_date || "",
          importo_totale: inv.total_gross_amount || 0,
          imponibile,
          iva,
          aliquota_iva: 22,
          mittente_nome: inv.sender?.name || "",
          mittente_piva: inv.sender?.vat_id || "",
          destinatario_nome: inv.recipient?.name || "",
          destinatario_piva: inv.recipient?.vat_id || "",
          sdi_id: inv.details?.sdi_id || "",
          sdi_status: inv.details?.sdi_status || "",
          sdi_filename: inv.details?.sdi_filename || "",
          fiscal_id: inv.fiscal_id || fiscal_id
        };
      });

      let created = 0;
      if (fattureToCreate.length > 0) {
        // Crea in batch da 50
        for (let i = 0; i < fattureToCreate.length; i += 50) {
          const batch = fattureToCreate.slice(i, i + 50);
          await base44.asServiceRole.entities.FatturaElettronica.bulkCreate(batch);
          created += batch.length;
        }
      }

      // Aggiorna conteggio e timestamp sull'azienda
      const allFatture = await base44.asServiceRole.entities.FatturaElettronica.filter({ azienda_id });
      const totAttive = allFatture.filter(f => f.direction === "outgoing").length;
      const totPassive = allFatture.filter(f => f.direction === "incoming").length;

      await base44.asServiceRole.entities.AziendaFiscale.update(azienda_id, {
        ultima_sincronizzazione: new Date().toISOString(),
        totale_fatture_attive: totAttive,
        totale_fatture_passive: totPassive
      });

      return Response.json({
        success: true,
        total_from_api: allInvoices.length,
        new_created: created,
        already_existing: allInvoices.length - created,
        totale_attive: totAttive,
        totale_passive: totPassive
      });
    }

    return Response.json({ error: 'Azione non riconosciuta. Usa action: "sync" o "check_config"' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});