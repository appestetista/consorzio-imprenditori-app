import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * POST /logisticsQuote
 * 
 * Modulo Logistica: interroga API reali di carrier marittimi/aerei + congestione portuale.
 * 
 * POLICY: Se un'API non è configurata o non risponde, restituisce errore strutturato.
 * MAI inventare dati. Ogni output include fonte, timestamp, e confidence level.
 * 
 * API supportate (richiedono chiave in env):
 * - CMACGM_API_KEY: CMA CGM Pricing/Quotation API
 * - HAPAG_API_KEY: Hapag-Lloyd Pricing API  
 * - MAERSK_API_KEY: Maersk API (tracking/location)
 * - MARINETRAFFIC_API_KEY: MarineTraffic Port Congestion
 * - IATA_API_KEY: IATA Cargo (tracking only)
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
        container_type: body.container_type || '20\' Standard',
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
      email: body.email || null,
    };

    const quotes = [];
    const errors = [];

    // ======== 1) OCEAN FREIGHT — CMA CGM ========
    const cmacgmKey = Deno.env.get('CMACGM_API_KEY');
    if (cmacgmKey) {
      try {
        // CMA CGM SpotOn / Quotation API
        // Docs: https://api-portal.cma-cgm.com/
        const cmacgmResponse = await fetch('https://apis.cma-cgm.net/pricing/v1/spotrates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cmacgmKey}`,
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            originLocation: normalized.origin.locode || `${normalized.origin.country}${normalized.origin.city.substring(0, 3).toUpperCase()}`,
            destinationLocation: normalized.destination.locode || `${normalized.destination.country}${normalized.destination.city.substring(0, 3).toUpperCase()}`,
            containerType: normalized.cargo.container_type.includes('40') ? '40ST' : '20ST',
            commodity: normalized.cargo.hs_code,
            weight: normalized.cargo.weight_kg,
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (cmacgmResponse.ok) {
          const cmacgmData = await cmacgmResponse.json();
          // Parse CMA CGM response — structure varies per API version
          const rate = cmacgmData?.rates?.[0] || cmacgmData;
          quotes.push({
            mode: 'ocean',
            provider: 'CMA CGM',
            carrier: 'CMA CGM',
            total_price: rate?.totalAmount ? {
              amount: rate.totalAmount,
              currency: rate.currency || 'USD',
            } : null,
            line_items: Array.isArray(rate?.charges) ? rate.charges.map(c => ({
              description: c.chargeName || c.description || 'Charge',
              amount: c.amount || 0,
              currency: c.currency || 'USD',
            })) : [],
            transit_time_days: rate?.transitTimeDays || rate?.transitTime || null,
            valid_until: rate?.validityEnd || rate?.validUntil || null,
            source: {
              type: 'api',
              name: 'CMA CGM API Portal',
              endpoint: 'https://apis.cma-cgm.net/pricing/v1/spotrates',
              retrieved_at: timestampUtc,
            },
            confidence: 'high',
            notes: null,
          });
        } else {
          const errText = await cmacgmResponse.text().catch(() => '');
          errors.push({
            area: 'ocean_cmacgm',
            message: `CMA CGM API ha risposto con status ${cmacgmResponse.status}. ${errText.substring(0, 200)}`,
          });
        }
      } catch (e) {
        errors.push({
          area: 'ocean_cmacgm',
          message: `CMA CGM API non raggiungibile: ${e.message}`,
        });
      }
    } else {
      errors.push({
        area: 'ocean_cmacgm',
        message: 'CMA CGM API non configurata. Richiede chiave CMACGM_API_KEY (ottenibile su https://api-portal.cma-cgm.com/).',
      });
    }

    // ======== 2) OCEAN FREIGHT — Hapag-Lloyd ========
    const hapagKey = Deno.env.get('HAPAG_API_KEY');
    if (hapagKey) {
      try {
        const hapagResponse = await fetch('https://api.hlag.com/hlag/v1/quotations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-IBM-Client-Id': hapagKey,
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            origin: normalized.origin.locode || normalized.origin.city,
            destination: normalized.destination.locode || normalized.destination.city,
            containerSize: normalized.cargo.container_type.includes('40') ? '40' : '20',
            commodity: normalized.cargo.hs_code,
            weight: normalized.cargo.weight_kg,
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (hapagResponse.ok) {
          const hapagData = await hapagResponse.json();
          const rate = hapagData?.quotation || hapagData;
          quotes.push({
            mode: 'ocean',
            provider: 'Hapag-Lloyd',
            carrier: 'Hapag-Lloyd',
            total_price: rate?.totalPrice ? {
              amount: rate.totalPrice,
              currency: rate.currency || 'USD',
            } : null,
            line_items: Array.isArray(rate?.lineItems) ? rate.lineItems.map(li => ({
              description: li.name || li.description || 'Item',
              amount: li.amount || 0,
              currency: li.currency || 'USD',
            })) : [],
            transit_time_days: rate?.transitTimeDays || null,
            valid_until: rate?.validUntil || null,
            source: {
              type: 'api',
              name: 'Hapag-Lloyd API Portal',
              endpoint: 'https://api.hlag.com/hlag/v1/quotations',
              retrieved_at: timestampUtc,
            },
            confidence: 'high',
            notes: null,
          });
        } else {
          const errText = await hapagResponse.text().catch(() => '');
          errors.push({
            area: 'ocean_hapag',
            message: `Hapag-Lloyd API ha risposto con status ${hapagResponse.status}. ${errText.substring(0, 200)}`,
          });
        }
      } catch (e) {
        errors.push({
          area: 'ocean_hapag',
          message: `Hapag-Lloyd API non raggiungibile: ${e.message}`,
        });
      }
    } else {
      errors.push({
        area: 'ocean_hapag',
        message: 'Hapag-Lloyd API non configurata. Richiede chiave HAPAG_API_KEY (ottenibile su https://api.hlag.com/).',
      });
    }

    // ======== 3) AIR CARGO ========
    const iataKey = Deno.env.get('IATA_API_KEY');
    if (iataKey) {
      // IATA Open API Hub fornisce tracking, NON tariffe spot
      errors.push({
        area: 'air_rates',
        message: 'IATA API disponibile solo per tracking, non per tariffe spot. Per quotazioni aeree reali è necessario un contratto con provider tariffe (TACT, WorldACD, Freightos).',
      });
    } else {
      errors.push({
        area: 'air_rates',
        message: 'Tariffe aeree non disponibili: manca provider tariffe/contratto. IATA Open API Hub (https://developer.iata.org/) fornisce solo tracking. Per rate reali servono TACT, WorldACD o aggregatore con API.',
      });
    }

    // ======== 4) PORT CONGESTION — MarineTraffic ========
    let portCongestion = null;
    const mtKey = Deno.env.get('MARINETRAFFIC_API_KEY');
    if (mtKey) {
      try {
        // MarineTraffic EV07 — Expected Arrivals / Port Congestion
        const portCode = normalized.destination.locode || normalized.destination.city;
        const mtUrl = `https://services.marinetraffic.com/api/expectedarrivals/${mtKey}/portid:0/port_target_id:${encodeURIComponent(portCode)}/protocol:jsono`;
        
        const mtResponse = await fetch(mtUrl, {
          signal: AbortSignal.timeout(15000),
        });

        if (mtResponse.ok) {
          const mtData = await mtResponse.json();
          const vessels = Array.isArray(mtData) ? mtData : [];
          portCongestion = {
            provider: 'MarineTraffic',
            port_id: portCode,
            metrics: {
              vessels_in_port: vessels.length,
              congestion_level: vessels.length > 50 ? 'high' : vessels.length > 20 ? 'medium' : 'low',
              description: `${vessels.length} navi attese/presenti nel porto di ${normalized.destination.city}`,
            },
            source: {
              type: 'api',
              name: 'MarineTraffic',
              endpoint: 'services.marinetraffic.com/api/expectedarrivals',
              retrieved_at: timestampUtc,
            },
          };
        } else {
          portCongestion = {
            provider: 'MarineTraffic',
            port_id: portCode,
            metrics: null,
            error: `MarineTraffic API ha risposto con status ${mtResponse.status}`,
            source: {
              type: 'api',
              name: 'MarineTraffic',
              endpoint: 'services.marinetraffic.com/api/expectedarrivals',
              retrieved_at: timestampUtc,
            },
          };
        }
      } catch (e) {
        portCongestion = {
          provider: 'MarineTraffic',
          port_id: normalized.destination.locode || normalized.destination.city,
          metrics: null,
          error: `MarineTraffic API non raggiungibile: ${e.message}`,
          source: null,
        };
      }
    } else {
      portCongestion = {
        provider: 'MarineTraffic',
        port_id: null,
        metrics: null,
        error: 'MarineTraffic API non configurata. Richiede chiave MARINETRAFFIC_API_KEY (ottenibile su https://www.marinetraffic.com/en/ais/api-services).',
        source: null,
      };
    }

    // ======== 5) ULTIMO MIGLIO ========
    const lastMile = {
      message: 'Ultimo miglio non disponibile: integrazione corriere/aggregatore mancante. Richiede API contrattuale con provider di spedizioni locali (es. DHL, FedEx, UPS API con chiave commerciale).',
    };

    // ======== RESPONSE ========
    const response = {
      request_id: requestId,
      timestamp_utc: timestampUtc,
      inputs_normalized: normalized,
      quotes,
      port_congestion: portCongestion,
      last_mile: lastMile,
      errors,
    };

    return Response.json(response);
  } catch (error) {
    return Response.json({
      request_id: requestId,
      timestamp_utc: timestampUtc,
      inputs_normalized: null,
      quotes: [],
      port_congestion: null,
      last_mile: null,
      errors: [{ area: 'system', message: error.message }],
    }, { status: 500 });
  }
});