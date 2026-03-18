import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * POST /freightosEstimate
 * 
 * Stima costi spedizione marittima con approccio ibrido:
 * 1. Prova Freightos API pubblica
 * 2. Se non ha dati, usa LLM con web search per stime basate su indici reali
 *    (Xeneta XSI, Drewry WCI, dati di mercato aggiornati)
 */

const FREIGHTOS_BASE = 'https://ship.freightos.com/api/shippingCalculator';

function calculateUnitsNeeded(volumeM3, weightKg) {
  const vol = parseFloat(volumeM3) || 0;
  const wt = parseFloat(weightKg) || 0;

  const vehicles = [
    { id: 'container20', label: "Container 20'", volume: 33, maxWeight: 25000 },
    { id: 'container40', label: "Container 40' HC", volume: 76, maxWeight: 26480 },
    { id: 'truck', label: "Camion 13.6m", volume: 90, maxWeight: 24000 },
  ];

  return vehicles.map(v => {
    const byVolume = vol > 0 ? Math.ceil(vol / v.volume) : 1;
    const byWeight = wt > 0 ? Math.ceil(wt / v.maxWeight) : 1;
    const units = Math.max(byVolume, byWeight);
    const limitingFactor = byVolume >= byWeight ? 'volume' : 'peso';
    const fillPercent = vol > 0 ? Math.min((vol / (v.volume * units)) * 100, 100) : 0;
    const weightPercent = wt > 0 ? Math.min((wt / (v.maxWeight * units)) * 100, 100) : 0;

    return {
      vehicle_id: v.id,
      vehicle_label: v.label,
      vehicle_volume: v.volume,
      vehicle_max_weight: v.maxWeight,
      units_needed: units,
      limiting_factor: limitingFactor,
      fill_percent: Math.round(fillPercent * 10) / 10,
      weight_percent: Math.round(weightPercent * 10) / 10,
      residual_volume_m3: Math.round((v.volume * units - vol) * 10) / 10,
      residual_weight_kg: Math.round(v.maxWeight * units - wt),
    };
  });
}

async function fetchFreightosEstimate(origin, destination, loadtype, weight, quantity) {
  const url = new URL(FREIGHTOS_BASE);
  url.searchParams.set('loadtype', loadtype);
  url.searchParams.set('weight', String(Math.round(weight)));
  url.searchParams.set('origin', origin);
  url.searchParams.set('destination', destination);
  url.searchParams.set('quantity', String(quantity));

  console.log('[Freightos] Fetching:', url.toString());

  const resp = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
  });

  if (!resp.ok) return null;
  const data = await resp.json();
  return data;
}

function parseFreightosResponse(data) {
  if (!data?.response?.estimatedFreightRates) return null;
  const rates = data.response.estimatedFreightRates;
  if (!rates.numQuotes || rates.numQuotes === 0) return null;
  
  const modes = Array.isArray(rates.mode) ? rates.mode : (rates.mode ? [rates.mode] : []);

  return modes.map(m => {
    const priceMin = m.price?.min?.moneyAmount?.amount ? parseFloat(m.price.min.moneyAmount.amount) : null;
    const priceMax = m.price?.max?.moneyAmount?.amount ? parseFloat(m.price.max.moneyAmount.amount) : null;
    const currency = m.price?.min?.moneyAmount?.currency || 'USD';
    const transitMin = m.transitTimes?.min ? parseInt(m.transitTimes.min) : null;
    const transitMax = m.transitTimes?.max ? parseInt(m.transitTimes.max) : null;

    return { mode: m.mode || 'FCL', price_min: priceMin, price_max: priceMax, currency, transit_days_min: transitMin, transit_days_max: transitMax };
  }).filter(m => m.price_min || m.price_max);
}

/**
 * Fallback: usa LLM con web search per ottenere stime di prezzo
 * basate su indici di mercato reali (Xeneta, Drewry, fonti logistiche)
 */
async function fetchAIEstimate(base44, originCity, originCountry, destCity, destCountry, weightKg, volumeM3, units20, units40) {
  const prompt = `Sei un esperto di logistica internazionale. Devi stimare il costo di spedizione marittima FCL.

ROTTA: da ${originCity}, ${originCountry} a ${destCity}, ${destCountry}
CARICO: ${weightKg} kg, ${volumeM3} m³

Cerca i prezzi ATTUALI di mercato per container marittimi su questa rotta o rotte simili.
Usa come riferimento gli indici Xeneta XSI, Drewry World Container Index, e tariffe di mercato recenti.
Considera i prezzi spot del 2025-2026.

Restituisci le stime per:
1. Container 20' FCL (servono ${units20} unità) - prezzo per unità
2. Container 40' HC FCL (servono ${units40} unità) - prezzo per unità
3. Tempo di transito in giorni (min e max)

IMPORTANTE: I prezzi devono essere realistici e basati sui dati di mercato attuali.
Se non trovi dati esatti per questa rotta, usa rotte comparabili e indica che è una stima.`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: true,
    model: 'gemini_3_flash',
    response_json_schema: {
      type: "object",
      properties: {
        container_20: {
          type: "object",
          properties: {
            price_min_usd: { type: "number", description: "Prezzo minimo per 1x 20' in USD" },
            price_max_usd: { type: "number", description: "Prezzo massimo per 1x 20' in USD" },
            transit_days_min: { type: "number" },
            transit_days_max: { type: "number" },
          }
        },
        container_40hc: {
          type: "object",
          properties: {
            price_min_usd: { type: "number", description: "Prezzo minimo per 1x 40'HC in USD" },
            price_max_usd: { type: "number", description: "Prezzo massimo per 1x 40'HC in USD" },
            transit_days_min: { type: "number" },
            transit_days_max: { type: "number" },
          }
        },
        confidence: { type: "string", enum: ["high", "medium", "low"], description: "Affidabilità della stima" },
        sources_used: { type: "string", description: "Fonti usate per la stima (es. Xeneta XSI, Drewry WCI, tariffe carrier)" },
        notes: { type: "string", description: "Note sulla stima" }
      }
    }
  });

  return result;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      origin_city = '',
      origin_country = 'IT',
      origin_locode = '',
      dest_city = '',
      dest_country = '',
      dest_locode = '',
      weight_kg = 0,
      volume_m3 = 0,
    } = body;

    const originStr = origin_city ? `${origin_city},${origin_country}` : (origin_locode || origin_country);
    const destStr = dest_city ? `${dest_city},${dest_country}` : (dest_locode || dest_country);

    const wt = parseFloat(weight_kg) || 1000;
    const vol = parseFloat(volume_m3) || 0;

    // Calcola unità necessarie
    const unitsCalc = calculateUnitsNeeded(vol, wt);
    const units20 = unitsCalc.find(u => u.vehicle_id === 'container20');
    const units40 = unitsCalc.find(u => u.vehicle_id === 'container40');

    // Prepara scenari
    const scenarioConfigs = [
      { id: 'container20', label: `${units20.units_needed}x Container 20'`, loadtype: 'container20', quantity: units20.units_needed, weight_per_unit: Math.round(wt / units20.units_needed), calc: units20 },
      { id: 'container40', label: `${units40.units_needed}x Container 40' HC`, loadtype: 'container40', quantity: units40.units_needed, weight_per_unit: Math.round(wt / units40.units_needed), calc: units40 },
    ];

    // LCL solo se volume <= 15 m³
    if (vol > 0 && vol <= 15) {
      scenarioConfigs.push({ id: 'lcl', label: 'LCL (Groupage)', loadtype: 'boxes', quantity: 1, weight_per_unit: Math.round(wt), calc: null });
    }

    // STEP 1: Prova Freightos per tutti gli scenari in parallelo
    const freightosResults = await Promise.allSettled(
      scenarioConfigs.map(async (sc) => {
        const result = await fetchFreightosEstimate(originStr, destStr, sc.loadtype, sc.weight_per_unit, sc.quantity);
        const parsed = parseFreightosResponse(result);
        return { ...sc, rates: parsed };
      })
    );

    // Controlla se Freightos ha restituito dati per almeno uno scenario
    let hasFreightosData = false;
    const scenarios = freightosResults.map((r, i) => {
      if (r.status === 'fulfilled' && r.value.rates?.length > 0) {
        hasFreightosData = true;
        const sc = r.value;
        const bestRate = sc.rates[0];
        return {
          scenario_id: sc.id, scenario_label: sc.label, units_needed: sc.quantity, calc: sc.calc,
          price_per_unit_min: bestRate.price_min, price_per_unit_max: bestRate.price_max,
          total_price_min: bestRate.price_min ? bestRate.price_min * sc.quantity : null,
          total_price_max: bestRate.price_max ? bestRate.price_max * sc.quantity : null,
          currency: bestRate.currency, transit_days_min: bestRate.transit_days_min, transit_days_max: bestRate.transit_days_max,
          mode: bestRate.mode, available: true,
          source: 'Freightos Marketplace',
        };
      }
      return null; // da riempire con AI se necessario
    });

    // STEP 2: Se Freightos non ha dati, usa LLM con web search
    let aiSource = null;
    if (!hasFreightosData) {
      console.log('[freightosEstimate] Freightos senza dati, fallback AI con web search...');
      
      const aiResult = await fetchAIEstimate(
        base44, origin_city || 'Italia', origin_country, dest_city, dest_country,
        wt, vol, units20.units_needed, units40.units_needed
      );

      if (aiResult) {
        aiSource = {
          confidence: aiResult.confidence || 'medium',
          sources_used: aiResult.sources_used || 'Indici di mercato (Xeneta, Drewry)',
          notes: aiResult.notes || '',
        };

        // Popola scenario Container 20'
        if (aiResult.container_20?.price_min_usd) {
          const ai20 = aiResult.container_20;
          scenarios[0] = {
            scenario_id: 'container20', scenario_label: scenarioConfigs[0].label,
            units_needed: units20.units_needed, calc: units20,
            price_per_unit_min: ai20.price_min_usd, price_per_unit_max: ai20.price_max_usd,
            total_price_min: ai20.price_min_usd * units20.units_needed,
            total_price_max: ai20.price_max_usd * units20.units_needed,
            currency: 'USD', transit_days_min: ai20.transit_days_min, transit_days_max: ai20.transit_days_max,
            mode: 'FCL', available: true,
            source: 'Stima AI basata su indici di mercato',
          };
        }

        // Popola scenario Container 40' HC
        if (aiResult.container_40hc?.price_min_usd) {
          const ai40 = aiResult.container_40hc;
          scenarios[1] = {
            scenario_id: 'container40', scenario_label: scenarioConfigs[1].label,
            units_needed: units40.units_needed, calc: units40,
            price_per_unit_min: ai40.price_min_usd, price_per_unit_max: ai40.price_max_usd,
            total_price_min: ai40.price_min_usd * units40.units_needed,
            total_price_max: ai40.price_max_usd * units40.units_needed,
            currency: 'USD', transit_days_min: ai40.transit_days_min, transit_days_max: ai40.transit_days_max,
            mode: 'FCL', available: true,
            source: 'Stima AI basata su indici di mercato',
          };
        }
      }
    }

    // Riempi scenari mancanti
    const finalScenarios = scenarios.map((sc, i) => {
      if (sc) return sc;
      const cfg = scenarioConfigs[i];
      return {
        scenario_id: cfg.id, scenario_label: cfg.label, units_needed: cfg.quantity, calc: cfg.calc,
        available: false, error: 'Nessun dato disponibile per questa rotta',
        source: hasFreightosData ? 'Freightos Marketplace' : 'Non disponibile',
      };
    });

    // Trova il migliore
    const availableResults = finalScenarios.filter(r => r.available && r.total_price_min);
    let best_scenario = null;
    if (availableResults.length > 0) {
      availableResults.sort((a, b) => (a.total_price_min || Infinity) - (b.total_price_min || Infinity));
      best_scenario = availableResults[0].scenario_id;
    }

    return Response.json({
      origin: originStr,
      destination: destStr,
      cargo: { weight_kg: wt, volume_m3: vol },
      units_calculation: unitsCalc,
      scenarios: finalScenarios,
      best_scenario,
      ai_source: aiSource,
      disclaimer: hasFreightosData
        ? 'Prezzi indicativi da Freightos Marketplace. Non sono quotazioni vincolanti.'
        : 'Stime basate su indici di mercato (Xeneta XSI, Drewry WCI) e dati web aggiornati. Non sono quotazioni vincolanti. Per prezzi operativi contattare un freight forwarder.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[freightosEstimate] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});