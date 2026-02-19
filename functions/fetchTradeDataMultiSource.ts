import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Backend function: Recupera dati commerciali da API reali (OEC, UN Comtrade, WITS)
 * e li salva/restituisce in formato normalizzato.
 * 
 * Payload:
 *   reporter_code: string (ISO2, es. "IT")
 *   partner_codes: string[] (ISO2, es. ["US","DE","CN"])
 *   hs_code: string (4 o 6 cifre)
 *   flow_type: "import" | "export"
 *   period_years: number (default 5)
 *   skip_cache: boolean (default false)
 */

// OEC country code mapping: ISO2 → OEC prefix+iso3
const ISO2_TO_OEC = {
  AF:'asafg',AL:'eualb',DZ:'afdza',AO:'afago',AR:'saarg',AM:'asarm',AU:'ocaus',AT:'euaut',AZ:'asaze',
  BH:'asbhr',BD:'asbgd',BY:'eublr',BE:'eubel',BJ:'afben',BO:'sabol',BA:'eubih',BW:'afbwa',BR:'sabra',
  BN:'asbrn',BG:'eubgr',BF:'afbfa',KH:'askhm',CM:'afcmr',CA:'nacan',CL:'sachl',CN:'aschn',CO:'sacol',
  CG:'afcog',CR:'nacri',CI:'afciv',HR:'euhrv',CU:'nacub',CY:'eucyp',CZ:'eucze',DK:'eudnk',DO:'nadom',
  EC:'saecu',EG:'afegy',SV:'naslv',EE:'euest',ET:'afeth',FI:'eufin',FR:'eufra',GA:'afgab',GE:'asgeo',
  DE:'eudeu',GH:'afgha',GR:'eugrc',GT:'nagtm',GN:'afgin',HN:'nahnd',HK:'ashkg',HU:'euhun',IS:'euisl',
  IN:'asind',ID:'asidn',IR:'asirn',IQ:'asirq',IE:'euirl',IL:'asisr',IT:'euita',JM:'najam',JP:'asjpn',
  JO:'asjor',KZ:'askaz',KE:'afken',KR:'askor',KW:'askwt',LV:'eulva',LB:'aslbn',LY:'aflby',LT:'eultu',
  LU:'eulux',MO:'asmac',MG:'afmdg',MY:'asmys',ML:'afmli',MT:'eumlt',MX:'namex',MD:'eumda',MN:'asmng',
  ME:'eumne',MA:'afmar',MZ:'afmoz',MM:'asmmr',NA:'afnam',NP:'asnpl',NL:'eunld',NZ:'ocnzl',NI:'nanic',
  NE:'afner',NG:'afnga',NO:'eunor',OM:'asomn',PK:'aspak',PA:'napan',PY:'sapry',PE:'saper',PH:'asphl',
  PL:'eupol',PT:'euprt',QA:'asqat',RO:'eurou',RU:'eurus',RW:'afrwa',SA:'assau',SN:'afsen',RS:'eusrb',
  SG:'assgp',SK:'eusvk',SI:'eusvn',ZA:'afzaf',ES:'euesp',LK:'aslka',SD:'afsdn',SE:'euswe',CH:'euche',
  TW:'astwn',TZ:'aftza',TH:'astha',TN:'aftun',TR:'astur',UA:'euukr',AE:'asare',GB:'eugbr',US:'nausa',
  UY:'saury',UZ:'asuzb',VE:'saven',VN:'asvnm',ZM:'afzmb',ZW:'afzwe'
};

const ISO2_TO_ISO3 = {
  AF:'AFG',AL:'ALB',DZ:'DZA',AO:'AGO',AR:'ARG',AM:'ARM',AU:'AUS',AT:'AUT',AZ:'AZE',
  BH:'BHR',BD:'BGD',BY:'BLR',BE:'BEL',BJ:'BEN',BO:'BOL',BA:'BIH',BW:'BWA',BR:'BRA',
  BN:'BRN',BG:'BGR',BF:'BFA',KH:'KHM',CM:'CMR',CA:'CAN',CL:'CHL',CN:'CHN',CO:'COL',
  CG:'COG',CR:'CRI',CI:'CIV',HR:'HRV',CU:'CUB',CY:'CYP',CZ:'CZE',DK:'DNK',DO:'DOM',
  EC:'ECU',EG:'EGY',SV:'SLV',EE:'EST',ET:'ETH',FI:'FIN',FR:'FRA',GA:'GAB',GE:'GEO',
  DE:'DEU',GH:'GHA',GR:'GRC',GT:'GTM',GN:'GIN',HN:'HND',HK:'HKG',HU:'HUN',IS:'ISL',
  IN:'IND',ID:'IDN',IR:'IRN',IQ:'IRQ',IE:'IRL',IL:'ISR',IT:'ITA',JM:'JAM',JP:'JPN',
  JO:'JOR',KZ:'KAZ',KE:'KEN',KR:'KOR',KW:'KWT',LV:'LVA',LB:'LBN',LY:'LBY',LT:'LTU',
  LU:'LUX',MO:'MAC',MG:'MDG',MY:'MYS',ML:'MLI',MT:'MLT',MX:'MEX',MD:'MDA',MN:'MNG',
  ME:'MNE',MA:'MAR',MZ:'MOZ',MM:'MMR',NA:'NAM',NP:'NPL',NL:'NLD',NZ:'NZL',NI:'NIC',
  NE:'NER',NG:'NGA',NO:'NOR',OM:'OMN',PK:'PAK',PA:'PAN',PY:'PRY',PE:'PER',PH:'PHL',
  PL:'POL',PT:'PRT',QA:'QAT',RO:'ROU',RU:'RUS',RW:'RWA',SA:'SAU',SN:'SEN',RS:'SRB',
  SG:'SGP',SK:'SVK',SI:'SVN',ZA:'ZAF',ES:'ESP',LK:'LKA',SD:'SDN',SE:'SWE',CH:'CHE',
  TW:'TWN',TZ:'TZA',TH:'THA',TN:'TUN',TR:'TUR',UA:'UKR',AE:'ARE',GB:'GBR',US:'USA',
  UY:'URY',UZ:'UZB',VE:'VEN',VN:'VNM',ZM:'ZMB',ZW:'ZWE'
};

/**
 * Fetch from OEC API (BACI data, no auth required)
 * Returns array of { year, trade_value, net_weight_kg }
 */
async function fetchFromOEC(reporterISO2, partnerISO2, hsCode, flowType, startYear, endYear) {
  const hs4 = String(hsCode).replace(/\D/g, '').substring(0, 4);
  const cube = 'trade_i_baci_a_22'; // HS 2022 revision for recent data
  
  // Build OEC drilldowns based on flow
  const reporterOEC = ISO2_TO_OEC[reporterISO2];
  const partnerOEC = ISO2_TO_OEC[partnerISO2];
  if (!reporterOEC || !partnerOEC) return null;
  
  // Map HS4 to OEC format (section prefix + hs4)
  // OEC HS4 IDs have a section prefix, we need to search without it
  const yearRange = [];
  for (let y = startYear; y <= endYear; y++) yearRange.push(y);
  const yearsStr = yearRange.join(',');
  
  let exporterKey, importerKey, exporterVal, importerVal;
  if (flowType === 'export') {
    exporterKey = 'Exporter+Country';
    importerKey = 'Importer+Country';
    exporterVal = reporterOEC;
    importerVal = partnerOEC;
  } else {
    exporterKey = 'Exporter+Country';
    importerKey = 'Importer+Country';
    exporterVal = partnerOEC;
    importerVal = reporterOEC;
  }
  
  const url = `https://api-v2.oec.world/tesseract/data.jsonrecords?cube=${cube}&drilldowns=Year,HS4,${exporterKey},${importerKey}&measures=Trade+Value&include=Year:${yearsStr};${exporterKey}:${exporterVal};${importerKey}:${importerVal}&limit=500,0`;
  
  console.log(`[OEC] Fetching: ${reporterISO2}->${partnerISO2} HS${hs4} ${flowType}`);
  
  const resp = await fetch(url, { 
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(15000)
  });
  
  if (!resp.ok) {
    console.log(`[OEC] HTTP ${resp.status} for ${url}`);
    return null;
  }
  
  const json = await resp.json();
  const records = json?.data || [];
  
  if (records.length === 0) {
    console.log(`[OEC] No data for ${reporterISO2}->${partnerISO2} HS${hs4}`);
    return null;
  }
  
  // Filter by HS4 code (OEC IDs have section prefix, so check if code ends with our hs4)
  const filtered = records.filter(r => {
    const id = String(r['HS4 ID'] || r['HS4'] || '');
    return id.endsWith(hs4) || id.includes(hs4);
  });
  
  // If no filtered results, try aggregating all HS4 results (OEC might return all)
  const dataToUse = filtered.length > 0 ? filtered : records;
  
  // Aggregate by year
  const byYear = {};
  for (const r of dataToUse) {
    const year = r.Year;
    if (!byYear[year]) byYear[year] = { trade_value: 0 };
    byYear[year].trade_value += (r['Trade Value'] || 0);
  }
  
  const result = Object.entries(byYear)
    .map(([year, data]) => ({
      year: parseInt(year),
      trade_value_usd: Math.round(data.trade_value),
      source: 'oec',
      source_detail: cube
    }))
    .sort((a, b) => a.year - b.year);
  
  return result.length > 0 ? result : null;
}

/**
 * Fetch from UN Comtrade API (requires API key)
 */
async function fetchFromComtrade(reporterISO2, partnerISO2, hsCode, flowType, startYear, endYear) {
  const apiKey = Deno.env.get('COMTRADE_API_KEY');
  if (!apiKey) {
    console.log('[Comtrade] No API key configured, skipping');
    return null;
  }
  
  const reporterISO3 = ISO2_TO_ISO3[reporterISO2];
  const partnerISO3 = ISO2_TO_ISO3[partnerISO2];
  if (!reporterISO3 || !partnerISO3) return null;
  
  const hs4 = String(hsCode).replace(/\D/g, '').substring(0, 4);
  const flowCode = flowType === 'export' ? 'X' : 'M';
  
  const url = `https://comtradeapi.un.org/data/v1/get/C/A/${reporterISO3}/${partnerISO3}/${hs4}?flowCode=${flowCode}&period=${startYear},${endYear}&subscription-key=${apiKey}`;
  
  console.log(`[Comtrade] Fetching: ${reporterISO3}->${partnerISO3} HS${hs4} ${flowType}`);
  
  const resp = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(20000)
  });
  
  if (!resp.ok) {
    console.log(`[Comtrade] HTTP ${resp.status}`);
    return null;
  }
  
  const json = await resp.json();
  const records = json?.data || [];
  
  if (records.length === 0) return null;
  
  const result = records
    .filter(r => r.primaryValue != null)
    .map(r => ({
      year: parseInt(r.period || r.refPeriodId),
      trade_value_usd: Math.round(r.primaryValue || 0),
      net_weight_kg: r.netWgt || null,
      quantity: r.qty || null,
      quantity_unit: r.qtyUnitAbbr || null,
      source: 'comtrade',
      source_detail: `${r.reporterCode}-${r.partnerCode}-${r.cmdCode}`
    }))
    .sort((a, b) => a.year - b.year);
  
  return result.length > 0 ? result : null;
}

/**
 * Fetch from WITS API (World Bank, no auth)
 */
async function fetchFromWITS(reporterISO3, partnerISO3, hsCode, flowType, year) {
  const indicator = flowType === 'export' ? 'XPRT-TRD-VL' : 'MPRT-TRD-VL';
  const hs4 = String(hsCode).replace(/\D/g, '').substring(0, 4);
  
  const url = `https://wits.worldbank.org/API/V1/SDMX/V21/rest/data/DF_WITS_TradeStats_Trade/${reporterISO3}.${partnerISO3}.${hs4}.${year}.${indicator}?format=JSON`;
  
  console.log(`[WITS] Fetching: ${reporterISO3}->${partnerISO3} HS${hs4} ${year}`);
  
  const resp = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(15000)
  });
  
  if (!resp.ok) {
    console.log(`[WITS] HTTP ${resp.status}`);
    return null;
  }
  
  const json = await resp.json();
  // WITS SDMX response parsing
  const observations = json?.dataSets?.[0]?.observations || json?.dataSets?.[0]?.series;
  if (!observations) return null;
  
  // Extract value from SDMX structure
  let value = null;
  if (typeof observations === 'object') {
    const keys = Object.keys(observations);
    if (keys.length > 0) {
      const obs = observations[keys[0]];
      value = Array.isArray(obs) ? obs[0] : obs?.observations?.['0']?.[0];
    }
  }
  
  if (value == null || isNaN(value)) return null;
  
  return {
    year: parseInt(year),
    trade_value_usd: Math.round(value),
    source: 'wits',
    source_detail: `${indicator}`
  };
}

/**
 * Fetch macro data from World Bank API
 */
async function fetchWorldBankMacro(iso2) {
  const iso3 = ISO2_TO_ISO3[iso2];
  if (!iso3) return null;
  
  const indicators = {
    population: 'SP.POP.TOTL',
    gdp: 'NY.GDP.MKTP.CD',
    gdp_per_capita: 'NY.GDP.PCAP.CD'
  };
  
  const results = {};
  const promises = Object.entries(indicators).map(async ([key, code]) => {
    const url = `https://api.worldbank.org/v2/country/${iso3}/indicator/${code}?format=json&per_page=5&mrv=3`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return;
    const json = await resp.json();
    const records = json?.[1];
    if (!Array.isArray(records)) return;
    for (const rec of records) {
      if (rec.value !== null) {
        results[key] = { value: rec.value, year: String(rec.date) };
        return;
      }
    }
  });
  
  await Promise.allSettled(promises);
  return results;
}

/**
 * Deduplication: merge data from multiple sources
 * Priority: comtrade > oec > wits (comtrade is the primary source, OEC uses BACI which is derived from Comtrade)
 */
function deduplicateAndMerge(oecData, comtradeData, witsData) {
  const merged = {};
  
  // Start with OEC (usually most complete)
  if (oecData) {
    for (const d of oecData) {
      merged[d.year] = { ...d, sources: [{ source: 'oec', value: d.trade_value_usd }] };
    }
  }
  
  // Overlay Comtrade (higher priority)
  if (comtradeData) {
    for (const d of comtradeData) {
      if (merged[d.year]) {
        merged[d.year].sources.push({ source: 'comtrade', value: d.trade_value_usd });
        // If values differ significantly (>10%), keep both; otherwise prefer comtrade
        const existing = merged[d.year].trade_value_usd;
        const diff = Math.abs(d.trade_value_usd - existing) / Math.max(existing, 1);
        if (diff < 0.1) {
          // Similar values, use comtrade
          merged[d.year].trade_value_usd = d.trade_value_usd;
          merged[d.year].source = 'comtrade';
        } else {
          // Keep comtrade as primary, note discrepancy
          merged[d.year].trade_value_usd = d.trade_value_usd;
          merged[d.year].source = 'comtrade';
          merged[d.year].discrepancy = true;
          merged[d.year].alt_value_usd = existing;
        }
        // Add weight/quantity from comtrade
        if (d.net_weight_kg) merged[d.year].net_weight_kg = d.net_weight_kg;
        if (d.quantity) merged[d.year].quantity = d.quantity;
        if (d.quantity_unit) merged[d.year].quantity_unit = d.quantity_unit;
      } else {
        merged[d.year] = { ...d, sources: [{ source: 'comtrade', value: d.trade_value_usd }] };
      }
    }
  }
  
  return Object.values(merged).sort((a, b) => a.year - b.year);
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await req.json();
  const {
    reporter_code = 'IT',
    partner_codes = [],
    hs_code,
    flow_type = 'export',
    period_years = 5,
    skip_cache = false
  } = payload;

  if (!hs_code || partner_codes.length === 0) {
    return Response.json({ error: 'hs_code and partner_codes are required' }, { status: 400 });
  }

  const currentYear = new Date().getFullYear();
  const startYear = currentYear - period_years;
  const endYear = currentYear - 1; // Most recent complete year
  const timestamp = new Date().toISOString();

  const results = {};
  const errors = [];
  const sourceStatus = { oec: 'unknown', comtrade: 'unknown', wits: 'unknown' };

  // Process each partner in parallel
  const partnerPromises = partner_codes.map(async (partnerCode) => {
    const cacheKey = `${reporter_code}|${partnerCode}|${hs_code}|${startYear}-${endYear}|${flow_type}`;
    
    // Check cache first
    if (!skip_cache) {
      try {
        const cached = await base44.entities.TradeDataCache.filter({ cache_key: cacheKey });
        if (cached && cached.length > 0) {
          const freshEnough = cached.some(c => {
            const retrievedAt = new Date(c.retrieved_at);
            const daysSince = (Date.now() - retrievedAt.getTime()) / (1000 * 60 * 60 * 24);
            return daysSince < 7; // Cache valid for 7 days
          });
          
          if (freshEnough) {
            console.log(`[Cache] Hit for ${cacheKey}`);
            const serieData = cached
              .filter(c => !c.is_stale)
              .map(c => ({
                year: parseInt(c.period),
                trade_value_usd: c.trade_value_usd,
                net_weight_kg: c.net_weight_kg,
                quantity: c.quantity,
                quantity_unit: c.quantity_unit,
                price_per_kg_usd: c.price_per_kg_usd,
                source: c.source,
                source_detail: c.source_detail,
                from_cache: true
              }))
              .sort((a, b) => a.year - b.year);
            
            return { partnerCode, data: serieData, from_cache: true };
          }
        }
      } catch (e) {
        console.log(`[Cache] Error checking cache: ${e.message}`);
      }
    }

    // Fetch from APIs in parallel
    let oecData = null, comtradeData = null;
    
    try {
      const [oecResult, comtradeResult] = await Promise.allSettled([
        fetchFromOEC(reporter_code, partnerCode, hs_code, flow_type, startYear, endYear),
        fetchFromComtrade(reporter_code, partnerCode, hs_code, flow_type, startYear, endYear)
      ]);
      
      oecData = oecResult.status === 'fulfilled' ? oecResult.value : null;
      comtradeData = comtradeResult.status === 'fulfilled' ? comtradeResult.value : null;
      
      if (oecData) sourceStatus.oec = 'ok';
      if (comtradeData) sourceStatus.comtrade = 'ok';
      
      if (oecResult.status === 'rejected') {
        console.log(`[OEC] Error for ${partnerCode}: ${oecResult.reason}`);
        sourceStatus.oec = 'error';
      }
      if (comtradeResult.status === 'rejected') {
        console.log(`[Comtrade] Error for ${partnerCode}: ${comtradeResult.reason}`);
        sourceStatus.comtrade = 'error';
      }
    } catch (e) {
      errors.push(`Fetch error for ${partnerCode}: ${e.message}`);
    }

    // Deduplicate and merge
    const merged = deduplicateAndMerge(oecData, comtradeData, null);
    
    // Calculate price per kg where possible
    for (const d of merged) {
      if (d.net_weight_kg && d.net_weight_kg > 0 && d.trade_value_usd > 0) {
        d.price_per_kg_usd = Math.round((d.trade_value_usd / d.net_weight_kg) * 100) / 100;
      }
    }

    // Save to cache (async, don't await)
    try {
      const cacheRecords = merged.map(d => ({
        cache_key: `${reporter_code}|${partnerCode}|${hs_code}|${d.year}|${flow_type}`,
        reporter_code: reporter_code,
        partner_code: partnerCode,
        hs_code: hs_code,
        hs_depth: String(hs_code).replace(/\D/g, '').length,
        period: String(d.year),
        flow_type: flow_type,
        trade_value_usd: d.trade_value_usd,
        net_weight_kg: d.net_weight_kg || null,
        quantity: d.quantity || null,
        quantity_unit: d.quantity_unit || null,
        price_per_kg_usd: d.price_per_kg_usd || null,
        source: d.source,
        source_detail: d.source_detail || null,
        retrieved_at: timestamp,
        is_stale: false
      }));
      
      if (cacheRecords.length > 0) {
        await base44.asServiceRole.entities.TradeDataCache.bulkCreate(cacheRecords);
        console.log(`[Cache] Saved ${cacheRecords.length} records for ${partnerCode}`);
      }
    } catch (e) {
      console.log(`[Cache] Error saving: ${e.message}`);
    }

    return { partnerCode, data: merged, from_cache: false };
  });

  const partnerResults = await Promise.allSettled(partnerPromises);
  
  for (const pr of partnerResults) {
    if (pr.status === 'fulfilled' && pr.value) {
      results[pr.value.partnerCode] = {
        serie_storica: pr.value.data,
        from_cache: pr.value.from_cache,
        records_count: pr.value.data.length
      };
    } else if (pr.status === 'rejected') {
      errors.push(`Partner error: ${pr.reason}`);
    }
  }

  // Fetch macro data for all partners in parallel
  const macroPromises = partner_codes.map(async (code) => {
    const macro = await fetchWorldBankMacro(code);
    return { code, macro };
  });
  
  const macroResults = await Promise.allSettled(macroPromises);
  const macroData = {};
  for (const mr of macroResults) {
    if (mr.status === 'fulfilled' && mr.value?.macro) {
      macroData[mr.value.code] = mr.value.macro;
    }
  }

  return Response.json({
    success: true,
    reporter: reporter_code,
    hs_code: hs_code,
    flow_type: flow_type,
    period: `${startYear}-${endYear}`,
    partners: results,
    macro_data: macroData,
    source_status: sourceStatus,
    errors: errors.length > 0 ? errors : null,
    timestamp
  });
});