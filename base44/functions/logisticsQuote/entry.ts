import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * POST /logisticsQuote
 * 
 * Modulo Logistica: usa LLM + ricerca web per trovare dati logistici reali.
 * NON inventa dati. Se un dato non è trovabile, restituisce "Non disponibile".
 * 
 * Ogni output include: fonte, timestamp, confidence level.
 * Confidence: "medium" (dati da fonti web pubbliche), "low" (stime LLM).
 */

Deno.serve(async (req) => {
  const requestId = 'lq-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
  const timestampUtc = new Date().toISOString();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Normalizzazione input
    const normalized = {
      incoterm: (body.incoterm || 'FOB').toUpperCase(),
      origin: {
        country: (body.origin_country || '').toUpperCase(),
        city: body.origin_city || '',
        locode: (body.origin_locode || '').toUpperCase(),
      },
      destination: {
        country: (body.dest_country || '').toUpperCase(),
        city: body.dest_city || '',
        locode: (body.dest_locode || '').toUpperCase(),
      },
      preferred_port: body.preferred_port || null,
      cargo: {
        description: body.product_description || '',
        hs_code: (body.hs_code || '').replace(/\s/g, ''),
        weight_kg: parseFloat(body.weight_kg) || 0,
        volume_m3: parseFloat(body.volume_m3) || 0,
        colli: parseInt(body.colli) || 0,
        container_type: body.container_type || "20' Standard",
        dangerous_goods: body.dangerous_goods === true,
      },
      urgency_days: parseInt(body.urgency_days) || null,
      ready_date: body.ready_date || null,
      cargo_value_eur: parseFloat(body.cargo_value_eur) || 0,
      preferred_currency: (body.preferred_currency || 'EUR').toUpperCase(),
      last_mile: {
        address: body.last_mile_address || null,
        zip: body.last_mile_zip || null,
        delivery_type: body.last_mile_delivery_type || null,
      },
    };

    // Costruisci prompt per LLM con ricerca web
    const originStr = `${normalized.origin.city}, ${normalized.origin.country}${normalized.origin.locode ? ' (' + normalized.origin.locode + ')' : ''}`;
    const destStr = `${normalized.destination.city}, ${normalized.destination.country}${normalized.destination.locode ? ' (' + normalized.destination.locode + ')' : ''}`;

    const prompt = `Sei un esperto di logistica internazionale. Devi trovare dati REALI e ATTUALI per questa spedizione. 
NON INVENTARE MAI numeri. Se un dato non è verificabile da fonti pubbliche, scrivi "Non disponibile (fonte non raggiungibile)".

SPEDIZIONE:
- Origine: ${originStr}
- Destinazione: ${destStr}
- Porto/aeroporto preferito: ${normalized.preferred_port || 'nessuna preferenza'}
- Incoterm: ${normalized.incoterm}
- Merce: ${normalized.cargo.description} (HS: ${normalized.cargo.hs_code})
- Peso: ${normalized.cargo.weight_kg} kg, Volume: ${normalized.cargo.volume_m3 || 'N/D'} m³
- Container: ${normalized.cargo.container_type}
- Merce pericolosa: ${normalized.cargo.dangerous_goods ? 'SÌ' : 'NO'}
- Valore merce: €${normalized.cargo_value_eur}
- Urgenza: ${normalized.urgency_days ? normalized.urgency_days + ' giorni' : 'nessuna'}

ISTRUZIONI:
1. NOLO MARITTIMO: Cerca tariffe spot/container ATTUALI per la rotta indicata. Usa fonti come Freightos Baltic Index (FBX), Drewry World Container Index, Xeneta, portali pubblici carrier. Indica range di prezzo per container ${normalized.cargo.container_type}. Se non trovi dati specifici per la rotta, indica l'indice di riferimento più vicino.

2. NOLO AEREO: Cerca tariffe cargo aereo per kg per la rotta indicata. Usa fonti come TAC Index, WorldACD (dati pubblici), Freightos Air Index. Se non disponibili, indica chiaramente.

3. TRANSIT TIME: Cerca transit time reali per entrambe le modalità sulla rotta specifica.

4. CONGESTIONE PORTUALE: Cerca dati attuali sulla congestione dei porti di destinazione/origine. Usa fonti come Port Report, UNCTAD, notizie recenti.

5. SURCHARGES NOTI: BAF, CAF, THC, ISPS se trovabili per la rotta.

6. Per ogni dato indica OBBLIGATORIAMENTE la fonte (nome sito/indice + URL se disponibile).

Rispondi SOLO con il JSON richiesto, senza markdown.`;

    const responseSchema = {
      type: "object",
      properties: {
        ocean_freight: {
          type: "object",
          properties: {
            available: { type: "boolean" },
            price_range_min: { type: ["number", "null"], description: "Prezzo minimo container in USD" },
            price_range_max: { type: ["number", "null"], description: "Prezzo massimo container in USD" },
            currency: { type: "string" },
            container_type: { type: "string" },
            transit_time_days_min: { type: ["number", "null"] },
            transit_time_days_max: { type: ["number", "null"] },
            main_carriers: { type: "array", items: { type: "string" } },
            surcharges: { type: "array", items: { type: "object", properties: { name: { type: "string" }, amount: { type: ["string", "null"] }, note: { type: "string" } } } },
            source_name: { type: "string", description: "Nome della fonte (es. Freightos Baltic Index)" },
            source_url: { type: ["string", "null"], description: "URL della fonte" },
            source_date: { type: ["string", "null"], description: "Data del dato" },
            notes: { type: ["string", "null"] },
            confidence: { type: "string", enum: ["high", "medium", "low", "unavailable"] }
          }
        },
        air_freight: {
          type: "object",
          properties: {
            available: { type: "boolean" },
            price_per_kg_min: { type: ["number", "null"] },
            price_per_kg_max: { type: ["number", "null"] },
            total_estimate: { type: ["number", "null"] },
            currency: { type: "string" },
            transit_time_days_min: { type: ["number", "null"] },
            transit_time_days_max: { type: ["number", "null"] },
            main_carriers: { type: "array", items: { type: "string" } },
            source_name: { type: "string" },
            source_url: { type: ["string", "null"] },
            source_date: { type: ["string", "null"] },
            notes: { type: ["string", "null"] },
            confidence: { type: "string", enum: ["high", "medium", "low", "unavailable"] }
          }
        },
        port_congestion: {
          type: "object",
          properties: {
            origin_port: { type: "string" },
            origin_congestion_level: { type: ["string", "null"], enum: ["low", "medium", "high", null] },
            origin_notes: { type: ["string", "null"] },
            dest_port: { type: "string" },
            dest_congestion_level: { type: ["string", "null"], enum: ["low", "medium", "high", null] },
            dest_notes: { type: ["string", "null"] },
            source_name: { type: "string" },
            source_url: { type: ["string", "null"] },
            source_date: { type: ["string", "null"] },
            confidence: { type: "string", enum: ["high", "medium", "low", "unavailable"] }
          }
        },
        customs_duties: {
          type: "object",
          properties: {
            hs_code: { type: "string" },
            duty_rate: { type: ["string", "null"] },
            vat_gst: { type: ["string", "null"] },
            anti_dumping: { type: ["string", "null"] },
            source_name: { type: "string" },
            source_url: { type: ["string", "null"] },
            notes: { type: ["string", "null"] },
            confidence: { type: "string", enum: ["high", "medium", "low", "unavailable"] }
          }
        },
        comparison_summary: { type: "string", description: "Breve riepilogo comparativo mare vs aereo" },
        warnings: { type: "array", items: { type: "string" } }
      }
    };

    const llmResult = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: responseSchema,
    });

    // Trasforma in formato quote standard
    const quotes = [];
    const errors = [];
    const data = llmResult;

    // Ocean quote
    if (data.ocean_freight) {
      const of = data.ocean_freight;
      if (of.available && (of.price_range_min || of.price_range_max)) {
        quotes.push({
          mode: 'ocean',
          provider: of.source_name || 'Ricerca web',
          carrier: of.main_carriers?.length > 0 ? of.main_carriers.join(', ') : null,
          total_price: of.price_range_min ? {
            amount: of.price_range_min,
            amount_max: of.price_range_max || null,
            currency: of.currency || 'USD',
            is_range: !!(of.price_range_max && of.price_range_max !== of.price_range_min),
          } : null,
          line_items: (of.surcharges || []).filter(s => s.amount).map(s => ({
            description: s.name,
            amount_text: s.amount,
            note: s.note || '',
          })),
          transit_time_days: of.transit_time_days_min || null,
          transit_time_days_max: of.transit_time_days_max || null,
          valid_until: null,
          source: {
            type: 'web_search',
            name: of.source_name || 'Fonti web pubbliche',
            endpoint: of.source_url || null,
            retrieved_at: timestampUtc,
            data_date: of.source_date || null,
          },
          confidence: of.confidence || 'medium',
          notes: of.notes || null,
        });
      } else {
        errors.push({
          area: 'ocean_freight',
          message: of.notes || 'Nessuna quotazione marittima trovata da fonti web pubbliche per questa rotta.',
        });
      }
    }

    // Air quote
    if (data.air_freight) {
      const af = data.air_freight;
      if (af.available && (af.price_per_kg_min || af.total_estimate)) {
        quotes.push({
          mode: 'air',
          provider: af.source_name || 'Ricerca web',
          carrier: af.main_carriers?.length > 0 ? af.main_carriers.join(', ') : null,
          total_price: af.total_estimate ? {
            amount: af.total_estimate,
            currency: af.currency || 'USD',
            is_range: false,
          } : null,
          price_per_kg: af.price_per_kg_min ? {
            min: af.price_per_kg_min,
            max: af.price_per_kg_max || null,
            currency: af.currency || 'USD',
          } : null,
          line_items: [],
          transit_time_days: af.transit_time_days_min || null,
          transit_time_days_max: af.transit_time_days_max || null,
          valid_until: null,
          source: {
            type: 'web_search',
            name: af.source_name || 'Fonti web pubbliche',
            endpoint: af.source_url || null,
            retrieved_at: timestampUtc,
            data_date: af.source_date || null,
          },
          confidence: af.confidence || 'low',
          notes: af.notes || null,
        });
      } else {
        errors.push({
          area: 'air_freight',
          message: af.notes || 'Tariffe aeree non disponibili da fonti web pubbliche per questa rotta.',
        });
      }
    }

    // Port congestion
    let portCongestion = null;
    if (data.port_congestion) {
      const pc = data.port_congestion;
      portCongestion = {
        provider: pc.source_name || 'Ricerca web',
        origin: {
          port: pc.origin_port,
          congestion_level: pc.origin_congestion_level,
          notes: pc.origin_notes,
        },
        destination: {
          port: pc.dest_port,
          congestion_level: pc.dest_congestion_level,
          notes: pc.dest_notes,
        },
        source: {
          type: 'web_search',
          name: pc.source_name || 'Fonti web pubbliche',
          endpoint: pc.source_url || null,
          retrieved_at: timestampUtc,
          data_date: pc.source_date || null,
        },
        confidence: pc.confidence || 'low',
      };
    }

    // Customs
    let customs = null;
    if (data.customs_duties) {
      const cd = data.customs_duties;
      customs = {
        hs_code: cd.hs_code,
        duty_rate: cd.duty_rate,
        vat_gst: cd.vat_gst,
        anti_dumping: cd.anti_dumping,
        source: {
          type: 'web_search',
          name: cd.source_name || 'Fonti web pubbliche',
          endpoint: cd.source_url || null,
          retrieved_at: timestampUtc,
        },
        confidence: cd.confidence || 'medium',
        notes: cd.notes || null,
      };
    }

    if (data.warnings?.length > 0) {
      data.warnings.forEach(w => {
        errors.push({ area: 'warning', message: w });
      });
    }

    const response = {
      request_id: requestId,
      timestamp_utc: timestampUtc,
      inputs_normalized: normalized,
      quotes,
      port_congestion: portCongestion,
      customs: customs,
      comparison_summary: data.comparison_summary || null,
      last_mile: {
        message: 'Ultimo miglio non disponibile: integrazione corriere/aggregatore mancante. Per quotazioni precise serve API contrattuale con corriere (DHL, FedEx, UPS).',
      },
      errors,
      data_disclaimer: 'I dati provengono da fonti web pubbliche (indici di mercato, portali informativi) interrogate tramite AI con ricerca internet. NON sono quotazioni vincolanti da carrier. Per quotazioni operative contattare direttamente i carrier o un freight forwarder.',
    };

    return Response.json(response);
  } catch (error) {
    return Response.json({
      request_id: requestId,
      timestamp_utc: timestampUtc,
      inputs_normalized: null,
      quotes: [],
      port_congestion: null,
      customs: null,
      last_mile: null,
      errors: [{ area: 'system', message: error.message }],
      data_disclaimer: null,
    }, { status: 500 });
  }
});