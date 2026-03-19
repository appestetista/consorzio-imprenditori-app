import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Calcola la volatilità del cambio EUR/valuta target usando i tassi giornalieri BCE.
 * 
 * Input: { country_code: "US" } (ISO Alpha-2)
 * Output: {
 *   currency: "USD",
 *   volatilita_annualizzata_pct: 7.2,     // 1-3 anni
 *   volatilita_recente_pct: 5.1,           // 3-6 mesi
 *   livello: "media",                       // bassa/media/alta/molto_alta
 *   livello_recente: "media",
 *   trend: "stabile",                       // in_aumento/stabile/in_calo
 *   tasso_corrente: 1.0832,
 *   periodo_lungo: "2023-01-01 / 2026-02-26",
 *   periodo_breve: "2025-09-01 / 2026-02-26",
 *   fonte: "BCE - Euro foreign exchange reference rates",
 *   n_osservazioni_lungo: 780,
 *   n_osservazioni_breve: 120
 * }
 */

// Mappa ISO Alpha-2 paese → codice valuta ISO 4217
const COUNTRY_TO_CURRENCY = {
  US:'USD',GB:'GBP',JP:'JPY',CN:'CNY',CH:'CHF',CA:'CAD',AU:'AUD',NZ:'NZD',
  SE:'SEK',NO:'NOK',DK:'DKK',PL:'PLN',CZ:'CZK',HU:'HUF',RO:'RON',BG:'BGN',
  HR:'EUR',RU:'RUB',TR:'TRY',IN:'INR',BR:'BRL',MX:'MXN',ZA:'ZAR',KR:'KRW',
  SG:'SGD',HK:'HKD',TW:'TWD',TH:'THB',MY:'MYR',ID:'IDR',PH:'PHP',
  IL:'ILS',SA:'SAR',AE:'AED',EG:'EGP',NG:'NGN',KE:'KES',MA:'MAD',
  AR:'ARS',CL:'CLP',CO:'COP',PE:'PEN',
  UA:'UAH',PK:'PKR',BD:'BDT',VN:'VND',
  QA:'QAR',KW:'KWD',OM:'OMR',BH:'BHD',JO:'JOD',
  // Eurozona → null (stessa valuta)
  AT:null,BE:null,CY:null,DE:null,EE:null,ES:null,FI:null,FR:null,
  GR:null,IE:null,IT:null,LT:null,LU:null,LV:null,MT:null,NL:null,
  PT:null,SI:null,SK:null,
};

// Valute disponibili nell'API BCE EXR
const BCE_CURRENCIES = new Set([
  'USD','JPY','GBP','CHF','AUD','CAD','SEK','NOK','DKK','PLN','CZK','HUF',
  'RON','BGN','TRY','BRL','MXN','ZAR','KRW','SGD','HKD','CNY','INR','IDR',
  'MYR','PHP','THB','NZD','ILS','RUB',
]);

function classifyVolatility(pct) {
  if (pct < 4) return 'bassa';
  if (pct < 8) return 'media';
  if (pct < 15) return 'alta';
  return 'molto_alta';
}

function classifyTrend(volLungo, volBreve) {
  if (volBreve === null || volLungo === null) return 'non_disponibile';
  const ratio = volBreve / volLungo;
  if (ratio > 1.3) return 'in_aumento';
  if (ratio < 0.7) return 'in_calo';
  return 'stabile';
}

/**
 * Fetch tassi giornalieri BCE per una valuta in un periodo.
 * Usa l'API SDMX dell'ECB Data Portal (formato CSV per semplicità di parsing).
 */
async function fetchECBRates(currency, startDate, endDate) {
  // D.{currency}.EUR.SP00.A = tasso giornaliero EUR/{currency}
  const url = `https://data-api.ecb.europa.eu/service/data/EXR/D.${currency}.EUR.SP00.A?startPeriod=${startDate}&endPeriod=${endDate}&format=csvdata`;
  
  const resp = await fetch(url);
  if (!resp.ok) {
    console.error(`[ECB API] HTTP ${resp.status} per ${currency}`);
    return [];
  }
  
  const text = await resp.text();
  const lines = text.split('\n');
  if (lines.length < 2) return [];
  
  // Parse CSV correttamente gestendo campi tra doppi apici con virgole interne
  function parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { fields.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    fields.push(current.trim());
    return fields;
  }
  
  const header = parseCSVLine(lines[0]);
  const timeIdx = header.findIndex(h => h === 'TIME_PERIOD');
  const valueIdx = header.findIndex(h => h === 'OBS_VALUE');
  
  if (timeIdx < 0 || valueIdx < 0) {
    console.error('[ECB API] Colonne TIME_PERIOD/OBS_VALUE non trovate. Header:', header.slice(0, 10));
    return [];
  }
  
  const rates = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCSVLine(lines[i]);
    if (cols.length <= Math.max(timeIdx, valueIdx)) continue;
    const date = cols[timeIdx];
    const value = parseFloat(cols[valueIdx]);
    if (date && !isNaN(value) && value > 0) {
      rates.push({ date, value });
    }
  }
  
  return rates.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calcola volatilità annualizzata da rendimenti log giornalieri.
 * Formula: σ_annualizzata = σ_giornaliera × √252
 */
function computeAnnualizedVolatility(rates) {
  if (rates.length < 20) return null; // minimo 20 osservazioni
  
  // Rendimenti logaritmici giornalieri
  const logReturns = [];
  for (let i = 1; i < rates.length; i++) {
    if (rates[i].value > 0 && rates[i - 1].value > 0) {
      logReturns.push(Math.log(rates[i].value / rates[i - 1].value));
    }
  }
  
  if (logReturns.length < 20) return null;
  
  // Media e deviazione standard
  const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
  const variance = logReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (logReturns.length - 1);
  const dailyVol = Math.sqrt(variance);
  
  // Annualizzata (252 giorni di trading)
  const annualizedVol = dailyVol * Math.sqrt(252) * 100; // in percentuale
  
  return parseFloat(annualizedVol.toFixed(1));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const countryCode = (body.country_code || '').toUpperCase();
    
    if (!countryCode) {
      return Response.json({ error: 'country_code richiesto' }, { status: 400 });
    }

    const currency = COUNTRY_TO_CURRENCY[countryCode];
    
    // Eurozona: stessa valuta
    if (currency === null || currency === undefined && ['AT','BE','CY','DE','EE','ES','FI','FR','GR','IE','IT','LT','LU','LV','MT','NL','PT','SI','SK','HR'].includes(countryCode)) {
      return Response.json({
        currency: 'EUR',
        volatilita_annualizzata_pct: 0,
        volatilita_recente_pct: 0,
        livello: 'nessuna',
        livello_recente: 'nessuna',
        trend: 'stabile',
        tasso_corrente: 1.0,
        periodo_lungo: null,
        periodo_breve: null,
        fonte: 'Eurozona (stessa valuta EUR)',
        n_osservazioni_lungo: 0,
        n_osservazioni_breve: 0,
        eurozona: true
      });
    }

    if (!currency) {
      return Response.json({ 
        error: `Valuta non mappata per il paese ${countryCode}`,
        currency: null,
        volatilita_annualizzata_pct: null,
        volatilita_recente_pct: null,
        livello: 'non_disponibile',
        livello_recente: 'non_disponibile',
        trend: 'non_disponibile',
        fonte: null
      });
    }

    // Controlla se la valuta è disponibile nell'API BCE
    if (!BCE_CURRENCIES.has(currency)) {
      return Response.json({
        error: `La valuta ${currency} non è disponibile nell'API BCE`,
        currency,
        volatilita_annualizzata_pct: null,
        volatilita_recente_pct: null,
        livello: 'non_disponibile',
        livello_recente: 'non_disponibile',
        trend: 'non_disponibile',
        fonte: null,
        nota: `La BCE pubblica tassi solo per ~30 valute principali. ${currency} non è tra queste.`
      });
    }

    // Date
    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    
    // Periodo lungo: 3 anni indietro
    const longStart = new Date(now);
    longStart.setFullYear(longStart.getFullYear() - 3);
    const longStartDate = longStart.toISOString().split('T')[0];
    
    // Periodo breve: 6 mesi indietro
    const shortStart = new Date(now);
    shortStart.setMonth(shortStart.getMonth() - 6);
    const shortStartDate = shortStart.toISOString().split('T')[0];

    // Fetch tassi BCE (periodo lungo include quello breve)
    const allRates = await fetchECBRates(currency, longStartDate, endDate);
    
    if (allRates.length < 20) {
      return Response.json({
        currency,
        volatilita_annualizzata_pct: null,
        volatilita_recente_pct: null,
        livello: 'non_disponibile',
        livello_recente: 'non_disponibile',
        trend: 'non_disponibile',
        tasso_corrente: allRates.length > 0 ? allRates[allRates.length - 1].value : null,
        fonte: 'BCE - Euro foreign exchange reference rates',
        nota: `Solo ${allRates.length} osservazioni disponibili, insufficienti per calcolare la volatilità.`
      });
    }

    // Filtra per periodo breve (ultimi 6 mesi)
    const shortRates = allRates.filter(r => r.date >= shortStartDate);
    
    // Calcola volatilità
    const volLungo = computeAnnualizedVolatility(allRates);
    const volBreve = computeAnnualizedVolatility(shortRates);
    
    const tassoCorrente = allRates[allRates.length - 1].value;
    const periodoLungo = `${allRates[0].date} / ${allRates[allRates.length - 1].date}`;
    const periodoBreve = shortRates.length > 0 
      ? `${shortRates[0].date} / ${shortRates[shortRates.length - 1].date}` 
      : null;

    return Response.json({
      currency,
      volatilita_annualizzata_pct: volLungo,
      volatilita_recente_pct: volBreve,
      livello: volLungo !== null ? classifyVolatility(volLungo) : 'non_disponibile',
      livello_recente: volBreve !== null ? classifyVolatility(volBreve) : 'non_disponibile',
      trend: classifyTrend(volLungo, volBreve),
      tasso_corrente: tassoCorrente,
      periodo_lungo: periodoLungo,
      periodo_breve: periodoBreve,
      fonte: 'BCE - Euro foreign exchange reference rates',
      n_osservazioni_lungo: allRates.length,
      n_osservazioni_breve: shortRates.length
    });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});