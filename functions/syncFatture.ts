import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { DOMParser } from 'npm:xmldom@0.6.0';

const OPENAPI_TOKEN = Deno.env.get("OPENAPI_IT_TOKEN");
const BASE_URL = "https://sdi.openapi.it";

// ── XML FatturaPA Parser ──────────────────────────────────────────
function getTagText(parent, tagName) {
  if (!parent) return "";
  const nodes = parent.getElementsByTagName(tagName);
  if (nodes.length === 0) return "";
  return nodes[0].textContent?.trim() || "";
}

function parseFatturaPA(xmlString) {
  const doc = new DOMParser().parseFromString(xmlString, "text/xml");
  
  // CedentePrestatore (fornitore/mittente)
  const cedente = doc.getElementsByTagName("CedentePrestatore")[0];
  const cedenteAnagrafica = cedente?.getElementsByTagName("DatiAnagrafici")[0];
  const cedenteSede = cedente?.getElementsByTagName("Sede")[0];
  
  const supplier_name = getTagText(cedenteAnagrafica, "Denominazione") || 
    (getTagText(cedenteAnagrafica, "Nome") + " " + getTagText(cedenteAnagrafica, "Cognome")).trim();
  const supplier_vat = getTagText(cedenteAnagrafica, "IdCodice");
  const supplier_cf = getTagText(cedenteAnagrafica, "CodiceFiscale");

  // CessionarioCommittente (cliente/destinatario)
  const cessionario = doc.getElementsByTagName("CessionarioCommittente")[0];
  const cessionarioAnagrafica = cessionario?.getElementsByTagName("DatiAnagrafici")[0];
  
  const customer_name = getTagText(cessionarioAnagrafica, "Denominazione") ||
    (getTagText(cessionarioAnagrafica, "Nome") + " " + getTagText(cessionarioAnagrafica, "Cognome")).trim();
  const customer_vat = getTagText(cessionarioAnagrafica, "IdCodice");
  const customer_cf = getTagText(cessionarioAnagrafica, "CodiceFiscale");

  // DatiGeneraliDocumento
  const datiGenerali = doc.getElementsByTagName("DatiGeneraliDocumento")[0];
  const tipo_documento = getTagText(datiGenerali, "TipoDocumento");
  const valuta = getTagText(datiGenerali, "Divisa");
  const data_emissione = getTagText(datiGenerali, "Data");
  const numero_documento = getTagText(datiGenerali, "Numero");
  const importo_totale_doc = parseFloat(getTagText(datiGenerali, "ImportoTotaleDocumento")) || 0;
  const causale = getTagText(datiGenerali, "Causale");

  // DatiBeniServizi — righe
  const dettaglioLinee = doc.getElementsByTagName("DettaglioLinee");
  const lines = [];
  for (let i = 0; i < dettaglioLinee.length; i++) {
    const linea = dettaglioLinee[i];
    lines.push({
      numero_linea: parseInt(getTagText(linea, "NumeroLinea")) || (i + 1),
      descrizione: getTagText(linea, "Descrizione"),
      quantita: parseFloat(getTagText(linea, "Quantita")) || 1,
      prezzo_unitario: parseFloat(getTagText(linea, "PrezzoUnitario")) || 0,
      prezzo_totale: parseFloat(getTagText(linea, "PrezzoTotale")) || 0,
      aliquota_iva: parseFloat(getTagText(linea, "AliquotaIVA")) || 0,
      natura: getTagText(linea, "Natura"),
      unita_misura: getTagText(linea, "UnitaMisura")
    });
  }

  // DatiRiepilogo — riepilogo IVA
  const riepilogoNodes = doc.getElementsByTagName("DatiRiepilogo");
  let totalImponibile = 0;
  let totalImposta = 0;
  let aliquotaPrincipale = 0;
  for (let i = 0; i < riepilogoNodes.length; i++) {
    const r = riepilogoNodes[i];
    const imp = parseFloat(getTagText(r, "ImponibileImporto")) || 0;
    const imposta = parseFloat(getTagText(r, "Imposta")) || 0;
    const aliq = parseFloat(getTagText(r, "AliquotaIVA")) || 0;
    totalImponibile += imp;
    totalImposta += imposta;
    if (imp > 0 && aliq > aliquotaPrincipale) aliquotaPrincipale = aliq;
  }

  return {
    tipo_documento,
    numero_documento,
    data_emissione,
    valuta: valuta || "EUR",
    causale,
    importo_totale: importo_totale_doc || (totalImponibile + totalImposta),
    imponibile: Math.round(totalImponibile * 100) / 100,
    iva: Math.round(totalImposta * 100) / 100,
    aliquota_iva: aliquotaPrincipale,
    mittente_nome: supplier_name,
    mittente_piva: supplier_vat,
    mittente_cf: supplier_cf,
    destinatario_nome: customer_name,
    destinatario_piva: customer_vat,
    destinatario_cf: customer_cf,
    lines
  };
}

// ── Main Handler ──────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { azienda_id, fiscal_id, action, date_from, date_to } = body;

    if (!azienda_id || !fiscal_id) {
      return Response.json({ error: 'azienda_id e fiscal_id sono obbligatori' }, { status: 400 });
    }

    // ── Check configurazione OpenAPI (SDI) ──
    if (action === "check_config") {
      const configRes = await fetch(`${BASE_URL}/business_registry_configurations/${fiscal_id}`, {
        headers: { "Authorization": `Bearer ${OPENAPI_TOKEN}` }
      });
      if (configRes.ok) {
        const config = await configRes.json();
        return Response.json({ configured: true, config });
      } else if (configRes.status === 404) {
        return Response.json({ configured: false });
      } else {
        const errText = await configRes.text();
        return Response.json({ error: `Errore OpenAPI SDI: ${configRes.status} - ${errText}` }, { status: 500 });
      }
    }

    // ── Sincronizzazione fatture ──
    if (action === "sync") {
      // 1) Recupera fatture esistenti per dedup
      const existingFatture = await base44.asServiceRole.entities.FatturaElettronica.filter({ azienda_id });
      const existingOpenApiIds = new Set(existingFatture.map(f => f.openapi_id).filter(Boolean));
      // Set dedup basato su numero+piva+data
      const existingKeys = new Set(existingFatture.map(f => 
        `${f.numero_documento}|${f.mittente_piva}|${f.data_emissione}`
      ).filter(k => k !== "||"));

      // 2) Fetch fatture da OpenAPI con paginazione e filtri date
      let allInvoices = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        // SDI API: GET /invoices con fiscal_id, type, page, per_page
        let url = `${BASE_URL}/invoices?fiscal_id=${fiscal_id}&page=${page}&per_page=100`;
        if (date_from) url += `&date_from=${date_from}`;
        if (date_to) url += `&date_to=${date_to}`;

        console.log(`[syncFatture] Fetching page ${page}: ${url}`);

        const res = await fetch(url, {
          headers: { "Authorization": `Bearer ${OPENAPI_TOKEN}` }
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(`[syncFatture] Errore API page ${page}: ${res.status} - ${errText}`);
          return Response.json({ error: `Errore fetch fatture: ${res.status} - ${errText}` }, { status: 500 });
        }

        const data = await res.json();
        const invoices = data.data || data;

        if (!Array.isArray(invoices) || invoices.length === 0) {
          hasMore = false;
        } else {
          allInvoices = allInvoices.concat(invoices);
          page++;
          if (invoices.length < 100) hasMore = false;
        }
      }

      console.log(`[syncFatture] Totale fatture da API: ${allInvoices.length}`);

      // 3) Filtra duplicati (per openapi_id o per chiave numero+piva+data)
      const newInvoices = allInvoices.filter(inv => {
        // SDI usa "uuid" come identificativo
        const invId = inv.uuid || inv.id;
        if (existingOpenApiIds.has(String(invId))) return false;
        // Dedup per chiave composta dal payload
        const payload = inv.payload?.fattura_elettronica_body?.[0];
        const docNum = payload?.dati_generali?.dati_generali_documento?.numero || "";
        const senderVat = inv.payload?.fattura_elettronica_header?.cedente_prestatore?.dati_anagrafici?.id_fiscale_iva?.id_codice || "";
        const docDate = payload?.dati_generali?.dati_generali_documento?.data || "";
        const key = `${docNum}|${senderVat}|${docDate}`;
        if (key !== "||" && existingKeys.has(key)) return false;
        return true;
      });

      console.log(`[syncFatture] Nuove fatture da processare: ${newInvoices.length}`);

      // 4) Per ogni nuova fattura: scarica XML, parsa, salva
      let created = 0;
      let xmlParsed = 0;
      let xmlErrors = 0;
      const allRighe = [];

      for (const inv of newInvoices) {
        let parsedData = null;
        let xmlUrl = null;

        // Scarica dettaglio fattura con XML dal endpoint GET /IT-invoices/{id}
        if (inv.id) {
          try {
            const detailRes = await fetch(`${BASE_URL}/IT-invoices/${inv.id}`, {
              headers: { "Authorization": `Bearer ${OPENAPI_TOKEN}` }
            });
            
            if (detailRes.ok) {
              const detail = await detailRes.json();
              // L'XML può essere in detail.invoice (base64 o raw) o detail.xml
              let xmlString = "";
              const rawXml = detail.invoice || detail.xml || detail.content || detail.data?.invoice || "";
              
              if (rawXml) {
                if (rawXml.startsWith("<?xml") || rawXml.startsWith("<")) {
                  xmlString = rawXml;
                } else {
                  // Base64 encoded
                  try {
                    xmlString = atob(rawXml);
                  } catch (e) {
                    console.warn(`[syncFatture] Base64 decode fallito per inv ${inv.id}`);
                  }
                }
              }

              if (xmlString && xmlString.includes("<")) {
                // Upload XML come file
                try {
                  const blob = new Blob([xmlString], { type: "application/xml" });
                  const file = new File([blob], `fattura_${inv.id}.xml`, { type: "application/xml" });
                  const uploadRes = await base44.asServiceRole.integrations.Core.UploadFile({ file });
                  xmlUrl = uploadRes.file_url;
                } catch (upErr) {
                  console.warn(`[syncFatture] Upload XML fallito per inv ${inv.id}: ${upErr.message}`);
                }

                // Parse XML FatturaPA
                try {
                  parsedData = parseFatturaPA(xmlString);
                  xmlParsed++;
                } catch (parseErr) {
                  console.warn(`[syncFatture] Parse XML fallito per inv ${inv.id}: ${parseErr.message}`);
                  xmlErrors++;
                }
              }
            } else {
              console.warn(`[syncFatture] Dettaglio fattura fallito per inv ${inv.id}: ${detailRes.status}`);
            }
          } catch (xmlErr) {
            console.warn(`[syncFatture] Errore fetch dettaglio inv ${inv.id}: ${xmlErr.message}`);
            xmlErrors++;
          }
        }

        // Costruisci record fattura — dati da XML hanno priorità, fallback su dati API
        const p = parsedData || {};
        const imponibileFallback = inv.total_gross_amount ? Math.round(inv.total_gross_amount / 1.22 * 100) / 100 : 0;
        const ivaFallback = inv.total_gross_amount ? Math.round((inv.total_gross_amount - imponibileFallback) * 100) / 100 : 0;

        const fatturaRecord = {
          azienda_id,
          openapi_id: String(inv.id),
          direction: inv.direction || "outgoing",
          state: inv.state || "NEW",
          tipo_documento: p.tipo_documento || inv.type || "",
          numero_documento: p.numero_documento || inv.document_number || "",
          data_emissione: p.data_emissione || inv.issue_date || "",
          importo_totale: p.importo_totale || inv.total_gross_amount || 0,
          imponibile: p.imponibile || imponibileFallback,
          iva: p.iva || ivaFallback,
          aliquota_iva: p.aliquota_iva || 22,
          valuta: p.valuta || "EUR",
          causale: p.causale || "",
          mittente_nome: p.mittente_nome || inv.sender?.name || "",
          mittente_piva: p.mittente_piva || inv.sender?.vat_id || "",
          mittente_cf: p.mittente_cf || "",
          destinatario_nome: p.destinatario_nome || inv.recipient?.name || "",
          destinatario_piva: p.destinatario_piva || inv.recipient?.vat_id || "",
          destinatario_cf: p.destinatario_cf || "",
          sdi_id: inv.details?.sdi_id || "",
          sdi_status: inv.details?.sdi_status || "",
          sdi_filename: inv.details?.sdi_filename || "",
          fiscal_id: inv.fiscal_id || fiscal_id,
          xml_raw: xmlUrl || "",
          has_parsed_lines: !!(parsedData && parsedData.lines?.length > 0)
        };

        // Crea fattura
        const createdFattura = await base44.asServiceRole.entities.FatturaElettronica.create(fatturaRecord);
        created++;

        // Salva righe se parsate
        if (parsedData?.lines?.length > 0) {
          const righeToCreate = parsedData.lines.map(l => ({
            fattura_id: createdFattura.id,
            numero_linea: l.numero_linea,
            descrizione: l.descrizione,
            quantita: l.quantita,
            prezzo_unitario: l.prezzo_unitario,
            prezzo_totale: l.prezzo_totale,
            aliquota_iva: l.aliquota_iva,
            natura: l.natura,
            unita_misura: l.unita_misura
          }));
          allRighe.push(...righeToCreate);
        }
      }

      // Bulk create righe in batch da 50
      for (let i = 0; i < allRighe.length; i += 50) {
        const batch = allRighe.slice(i, i + 50);
        await base44.asServiceRole.entities.RigaFattura.bulkCreate(batch);
      }

      // 5) Aggiorna conteggi sull'azienda
      const allFatture = await base44.asServiceRole.entities.FatturaElettronica.filter({ azienda_id });
      const totAttive = allFatture.filter(f => f.direction === "outgoing").length;
      const totPassive = allFatture.filter(f => f.direction === "incoming").length;

      await base44.asServiceRole.entities.AziendaFiscale.update(azienda_id, {
        ultima_sincronizzazione: new Date().toISOString(),
        configurazione_openapi: true,
        totale_fatture_attive: totAttive,
        totale_fatture_passive: totPassive
      });

      return Response.json({
        success: true,
        total_from_api: allInvoices.length,
        new_created: created,
        already_existing: allInvoices.length - newInvoices.length,
        xml_parsed: xmlParsed,
        xml_errors: xmlErrors,
        righe_create: allRighe.length,
        totale_attive: totAttive,
        totale_passive: totPassive
      });
    }

    return Response.json({ error: 'Azione non riconosciuta. Usa action: "sync" o "check_config"' }, { status: 400 });

  } catch (error) {
    console.error(`[syncFatture] Errore critico: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});