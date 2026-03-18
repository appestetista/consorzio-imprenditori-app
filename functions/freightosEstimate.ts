import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * POST /freightosEstimate
 * 
 * Chiama l'API pubblica Freightos Shipping Calculator per ottenere stime di prezzo
 * per spedizioni marittime (FCL) e aeree.
 * API gratuita, nessuna API key richiesta per le stime marketplace.
 * 
 * Input: { origin, destination, weight_kg, volume_m3, container_type }
 * Output: array di scenari con prezzi stimati
 */

const FREIGHTOS_BASE = 'https://ship.freightos.com/api/shippingCalculator';

// Mappa container type dal form al parametro Freightos
function mapLoadType(containerType) {
  if (!containerType) return 'container20';
  const ct = containerType.toLowerCase();
  if (ct.includes('40')) return 'container40';
  if (ct.includes('20')) return 'container20';
  if (ct.includes('lcl') || ct.includes('groupage')) return 'boxes';
  return 'container20';
}

// Calcola quanti container/camion servono
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

  if (!resp.ok) {
    const text = await resp.text();
    console.error('[Freightos] Error response:', resp.status, text);
    return null;
  }

  const data = await resp.json();
  console.log('[Freightos] Response:', JSON.stringify(data));
  return data;
}

function parseFreightosResponse(data) {
  if (!data?.response?.estimatedFreightRates) return null;

  const rates = data.response.estimatedFreightRates;
  const modes = Array.isArray(rates.mode) ? rates.mode : (rates.mode ? [rates.mode] : []);

  return modes.map(m => {
    const priceMin = m.price?.min?.moneyAmount?.amount ? parseFloat(m.price.min.moneyAmount.amount) : null;
    const priceMax = m.price?.max?.moneyAmount?.amount ? parseFloat(m.price.max.moneyAmount.amount) : null;
    const currency = m.price?.min?.moneyAmount?.currency || m.price?.max?.moneyAmount?.currency || 'USD';
    const transitMin = m.transitTimes?.min ? parseInt(m.transitTimes.min) : null;
    const transitMax = m.transitTimes?.max ? parseInt(m.transitTimes.max) : null;

    return {
      mode: m.mode || 'unknown',
      price_min: priceMin,
      price_max: priceMax,
      currency,
      transit_days_min: transitMin,
      transit_days_max: transitMax,
    };
  }).filter(m => m.price_min || m.price_max);
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
      container_type = "20' Standard",
    } = body;

    // Costruisci stringhe per Freightos
    // Freightos funziona meglio con "City,Country" che con LOCODE
    // Usiamo LOCODE solo come fallback
    const originStr = origin_city ? `${origin_city},${origin_country}` : (origin_locode || origin_country);
    const destStr = dest_city ? `${dest_city},${dest_country}` : (dest_locode || dest_country);

    const wt = parseFloat(weight_kg) || 1000;
    const vol = parseFloat(volume_m3) || 0;

    // Calcola unità necessarie
    const unitsCalc = calculateUnitsNeeded(vol, wt);

    // Prepara scenari da quotare su Freightos
    const scenarios = [];

    // Scenario 1: Container 20'
    const units20 = unitsCalc.find(u => u.vehicle_id === 'container20');
    scenarios.push({
      id: 'container20',
      label: `${units20.units_needed}x Container 20'`,
      loadtype: 'container20',
      quantity: units20.units_needed,
      weight_per_unit: Math.round(wt / units20.units_needed),
      calc: units20,
    });

    // Scenario 2: Container 40' HC
    const units40 = unitsCalc.find(u => u.vehicle_id === 'container40');
    scenarios.push({
      id: 'container40',
      label: `${units40.units_needed}x Container 40' HC`,
      loadtype: 'container40',
      quantity: units40.units_needed,
      weight_per_unit: Math.round(wt / units40.units_needed),
      calc: units40,
    });

    // Scenario 3: LCL (solo se volume < 15 m³, altrimenti non ha senso)
    if (vol > 0 && vol <= 15) {
      scenarios.push({
        id: 'lcl',
        label: 'LCL (Groupage)',
        loadtype: 'boxes',
        quantity: 1,
        weight_per_unit: Math.round(wt),
        // Per boxes servono dimensioni. Usiamo un cubo equivalente
        volume_param: vol,
        calc: null,
      });
    }

    // Chiama Freightos per ogni scenario in parallelo
    const freightosResults = await Promise.allSettled(
      scenarios.map(async (sc) => {
        const result = await fetchFreightosEstimate(
          originStr,
          destStr,
          sc.loadtype,
          sc.weight_per_unit,
          sc.quantity
        );
        const parsed = parseFreightosResponse(result);
        return { ...sc, freightos_raw: result, rates: parsed };
      })
    );

    // Assembla risultati
    const results = freightosResults.map((r, i) => {
      if (r.status === 'fulfilled' && r.value.rates?.length > 0) {
        const sc = r.value;
        const bestRate = sc.rates[0]; // primo rate disponibile

        // Calcola prezzo totale per tutti i container
        const totalMin = bestRate.price_min ? bestRate.price_min * sc.quantity : null;
        const totalMax = bestRate.price_max ? bestRate.price_max * sc.quantity : null;

        return {
          scenario_id: sc.id,
          scenario_label: sc.label,
          units_needed: sc.quantity,
          calc: sc.calc,
          price_per_unit_min: bestRate.price_min,
          price_per_unit_max: bestRate.price_max,
          total_price_min: totalMin,
          total_price_max: totalMax,
          currency: bestRate.currency,
          transit_days_min: bestRate.transit_days_min,
          transit_days_max: bestRate.transit_days_max,
          mode: bestRate.mode,
          available: true,
          source: 'Freightos Marketplace (API pubblica)',
        };
      } else {
        const sc = r.status === 'fulfilled' ? r.value : scenarios[i];
        return {
          scenario_id: sc.id,
          scenario_label: sc.label,
          units_needed: sc.quantity,
          calc: sc.calc,
          available: false,
          error: r.status === 'rejected' ? r.reason?.message : 'Nessun dato disponibile per questa rotta',
          source: 'Freightos Marketplace (API pubblica)',
        };
      }
    });

    // Trova il migliore (prezzo totale più basso)
    const availableResults = results.filter(r => r.available && r.total_price_min);
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
      scenarios: results,
      best_scenario,
      disclaimer: 'Prezzi indicativi da Freightos Marketplace (API pubblica). Non sono quotazioni vincolanti. Per prezzi operativi contattare un freight forwarder.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[freightosEstimate] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});