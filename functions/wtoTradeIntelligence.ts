import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Trade Intelligence Engine
 * 
 * FASE 1: Normalizzazione input (WTO reporters, products, years)
 * FASE 2: WTO macro data (market_size, trend, CAGR) — solo p=000 (World)
 * FASE 3: Comtrade bilateral data (top suppliers, market share)
 * FASE 4: Output strutturato
 * 
 * Payload:
 *   country_name: string (es. "United States", "Germany")
 *   product_description: string (es. "AG" = Agriculture, "TO" = Total, HS heading)
 *   years_range: string (es. "2019,2020,2021,2022,2023" o "2019-2023")
 */

const WTO_BASE = 'https://api.wto.org/timeseries/v1';

// ISO2 → M49 for Comtrade
const ISO2_TO_M49 = {
  AF:4,AL:8,DZ:12,AO:24,AR:32,AM:51,AU:36,AT:40,AZ:31,
  BH:48,BD:50,BY:112,BE:56,BJ:204,BO:68,BA:70,BW:72,BR:76,
  BN:96,BG:100,BF:854,KH:116,CM:120,CA:124,CL:152,CN:156,CO:170,
  CG:178,CR:188,CI:384,HR:191,CU:192,CY:196,CZ:203,DK:208,DO:214,
  EC:218,EG:818,SV:222,EE:233,ET:231,FI:246,FR:251,GA:266,GE:268,
  DE:276,GH:288,GR:300,GT:320,GN:324,HN:340,HK:344,HU:348,IS:352,
  IN:356,ID:360,IR:364,IQ:368,IE:372,IL:376,IT:380,JM:388,JP:392,
  JO:400,KZ:398,KE:404,KR:410,KW:414,LV:428,LB:422,LY:434,LT:440,
  LU:442,MO:446,MG:450,MY:458,ML:466,MT:470,MX:484,MD:498,MN:496,
  ME:499,MA:504,MZ:508,MM:104,NA:516,NP:524,NL:528,NZ:554,NI:558,
  NE:562,NG:566,NO:578,OM:512,PK:586,PA:591,PY:600,PE:604,PH:608,
  PL:616,PT:620,QA:634,RO:642,RU:643,RW:646,SA:682,SN:686,RS:688,
  SG:702,SK:703,SI:705,ZA:710,ES:724,LK:144,SD:729,SE:752,CH:757,
  TW:490,TZ:834,TH:764,TN:788,TR:792,UA:804,AE:784,GB:826,US:842,
  UY:858,UZ:860,VE:862,VN:704,ZM:894,ZW:716
};

// WTO reporter code → ISO2 (reverse mapping, built at runtime from reporters API)
// WTO uses 3-digit numeric codes for reporters (e.g. 840=USA, 276=Germany)
const WTO_TO_ISO2 = {
  '840':'US','276':'DE','250':'FR','826':'GB','156':'CN','392':'JP',
  '356':'IN','076':'BR','380':'IT','724':'ES','528':'NL','056':'BE',
  '040':'AT','616':'PL','620':'PT','756':'CH','752':'SE','578':'NO',
  '208':'DK','246':'FI','372':'IE','203':'CZ','348':'HU','642':'RO',
  '300':'GR','100':'BG','191':'HR','703':'SK','705':'SI','440':'LT',
  '428':'LV','233':'EE','196':'CY','470':'MT','442':'LU',
  '643':'RU','792':'TR','682':'SA','784':'AE','410':'KR','036':'AU',
  '124':'CA','484':'MX','032':'AR','152':'CL','170':'CO','604':'PE',
  '710':'ZA','818':'EG','566':'NG','404':'KE','504':'MA',
  '764':'TH','704':'VN','360':'ID','458':'MY','608':'PH','702':'SG',
  '158':'TW','344':'HK','554':'NZ','376':'IL','804':'UA','586':'PK',
  '050':'BD','012':'DZ','788':'TN','288':'GH','634':'QA','414':'KW',
  '512':'OM','048':'BH','400':'JO','422':'LB','368':'IQ','364':'IR'
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await req.json().catch(() => ({}));
  const { country_name, product_description, years_range } = payload;

  if (!country_name || !product_description) {
    return Response.json({ error: 'country_name and product_description are required' }, { status: 400 });
  }

  const apiKey = Deno.env.get('WTO_API_KEY') || '';
  if (!apiKey) return Response.json({ error: 'WTO_API_KEY not set' }, { status: 500 });

  const HEADERS = { 'Ocp-Apim-Subscription-Key': apiKey, 'Accept': 'application/json' };
  const notes = [];
  const timestamp = new Date().toISOString();

  // ===========================
  // FASE 1 — Normalizzazione input
  // ===========================
  console.log(`[TI] FASE 1 — Input: country="${country_name}" product="${product_description}" years="${years_range}"`);

  // 1a) Converti country_name → WTO reporter code
  let reporterCode = null;
  let reporterName = null;
  try {
    const rResp = await fetch(`${WTO_BASE}/reporters`, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
    if (!rResp.ok) throw new Error(`WTO reporters HTTP ${rResp.status}`);
    const reporters = await rResp.json();
    if (Array.isArray(reporters)) {
      const searchLower = country_name.toLowerCase().trim();
      // Exact match first
      let match = reporters.find(r => (r.name || '').toLowerCase() === searchLower);
      // Partial match
      if (!match) match = reporters.find(r => (r.name || '').toLowerCase().includes(searchLower));
      // Code match (user passed code directly)
      if (!match) match = reporters.find(r => String(r.code) === country_name.trim());
      if (match) {
        reporterCode = String(match.code);
        reporterName = match.name;
        console.log(`[TI] Reporter resolved: "${country_name}" → code=${reporterCode} name="${reporterName}"`);
      }
    }
  } catch (e) {
    console.log(`[TI] Reporters error: ${e.message}`);
  }

  if (!reporterCode) {
    return Response.json({
      error: `Reporter non trovato per "${country_name}". Usa un nome paese in inglese (es. "United States", "Germany", "China").`,
      phase: 'FASE 1 — Normalizzazione'
    }, { status: 400 });
  }

  // 1b) Converti product_description → product code
  // WTO product codes: AG=Agriculture, MA=Manufactures, MI=Mining, TO=Total, etc.
  // Or HS headings if numeric
  let productCode = product_description.trim();
  let productName = null;
  try {
    const pResp = await fetch(`${WTO_BASE}/products`, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
    if (!pResp.ok) throw new Error(`WTO products HTTP ${pResp.status}`);
    const products = await pResp.json();
    if (Array.isArray(products)) {
      const searchLower = product_description.toLowerCase().trim();
      // Exact code match
      let match = products.find(p => (p.code || '').toLowerCase() === searchLower);
      // Name match
      if (!match) match = products.find(p => (p.name || '').toLowerCase().includes(searchLower));
      if (match) {
        productCode = match.code;
        productName = match.name;
        console.log(`[TI] Product resolved: "${product_description}" → code=${productCode} name="${productName}"`);
      } else {
        notes.push(`Product code "${product_description}" used as-is (no match in WTO product list).`);
        console.log(`[TI] Product not found in list, using raw: "${productCode}"`);
      }
    }
  } catch (e) {
    console.log(`[TI] Products error: ${e.message}`);
    notes.push(`Products API error: ${e.message}. Using raw product code.`);
  }

  // 1c) Verifica anni disponibili
  let availableYears = [];
  try {
    const yResp = await fetch(`${WTO_BASE}/years`, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
    if (yResp.ok) {
      availableYears = await yResp.json();
      console.log(`[TI] Available years: ${Array.isArray(availableYears) ? availableYears.length + ' years' : 'N/A'}`);
    }
  } catch (e) {
    console.log(`[TI] Years error: ${e.message}`);
  }

  // Parse years_range
  let yearsArray = [];
  if (years_range) {
    const yr = String(years_range).trim();
    if (yr.includes('-') && !yr.includes(',')) {
      // Range format: "2019-2023"
      const parts = yr.split('-').map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        for (let y = parts[0]; y <= parts[1]; y++) yearsArray.push(y);
      }
    } else {
      // Comma-separated: "2019,2020,2021"
      yearsArray = yr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    }
  }

  // Default: last 5 years
  if (yearsArray.length === 0) {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 5; y <= currentYear - 1; y++) yearsArray.push(y);
    notes.push(`No years_range provided. Defaulting to ${yearsArray[0]}-${yearsArray[yearsArray.length - 1]}.`);
  }

  // Validate against available years
  if (Array.isArray(availableYears) && availableYears.length > 0) {
    const avSet = new Set(availableYears.map(y => typeof y === 'object' ? y.year || y.code : y).map(Number));
    const invalidYears = yearsArray.filter(y => avSet.size > 0 && !avSet.has(y));
    if (invalidYears.length > 0) {
      notes.push(`Years not in WTO catalog: ${invalidYears.join(', ')}.`);
    }
  }

  const yearsParam = yearsArray.join(',');
  console.log(`[TI] Normalized: reporter=${reporterCode}(${reporterName}) product=${productCode}(${productName}) years=${yearsParam}`);

  // ===========================
  // FASE 2 — WTO (MACRO DATA)
  // ===========================
  console.log(`[TI] FASE 2 — WTO macro data`);

  let wtoMarketSize = null;
  let wtoTrend = [];
  let wtoCagr = null;
  let wtoUnit = null;
  let wtoFrequency = null;
  let wtoDataAvailable = false;

  // 2a) data_count check
  let dataCount = 0;
  try {
    const dcParams = new URLSearchParams({
      i: 'ITS_MTV_AM', r: reporterCode, p: '000', pc: productCode, ps: yearsParam
    });
    const dcUrl = `${WTO_BASE}/data_count?${dcParams.toString()}`;
    console.log(`[TI] GET ${dcUrl}`);
    const dcResp = await fetch(dcUrl, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
    if (dcResp.ok) {
      const dcRaw = await dcResp.text();
      dataCount = parseInt(dcRaw, 10);
      if (isNaN(dataCount)) dataCount = 0;
      console.log(`[TI] data_count = ${dataCount}`);
    }
  } catch (e) {
    console.log(`[TI] data_count error: ${e.message}`);
  }

  if (dataCount === 0) {
    notes.push('WTO data not available for selected combination (ITS_MTV_AM, p=World).');
  } else {
    // 2b) Fetch data
    try {
      const dParams = new URLSearchParams({
        i: 'ITS_MTV_AM', r: reporterCode, p: '000', pc: productCode, ps: yearsParam,
        fmt: 'json', mode: 'full', dec: '2', max: '500', head: 'H', lang: '1'
      });
      const dUrl = `${WTO_BASE}/data?${dParams.toString()}`;
      console.log(`[TI] GET ${dUrl}`);
      const dResp = await fetch(dUrl, { headers: HEADERS, signal: AbortSignal.timeout(30000) });

      if (dResp.ok) {
        const rawBody = await dResp.text();
        let rawData;
        try { rawData = JSON.parse(rawBody); } catch (_e) { rawData = null; }

        if (rawData) {
          // Extract data array
          let dataArray = Array.isArray(rawData) ? rawData : (rawData.Dataset || null);
          if (!dataArray && rawData && typeof rawData === 'object') {
            for (const k of Object.keys(rawData)) {
              if (Array.isArray(rawData[k])) { dataArray = rawData[k]; break; }
            }
          }

          if (dataArray && dataArray.length > 0) {
            wtoDataAvailable = true;
            console.log(`[TI] WTO data records: ${dataArray.length}`);

            // Parse into yearly series
            const yearlyMap = {};
            for (const rec of dataArray) {
              const yr = parseInt(String(rec.Year || ''), 10);
              const val = parseFloat(rec.Value);
              if (!isNaN(yr) && !isNaN(val) && val >= 0) {
                yearlyMap[yr] = val;
              }
              // Capture unit and frequency from first valid record
              if (!wtoUnit && rec.Unit) wtoUnit = rec.Unit;
              if (!wtoFrequency && rec.Frequency) wtoFrequency = rec.Frequency;
            }

            const sortedYears = Object.keys(yearlyMap).map(Number).sort((a, b) => a - b);
            wtoTrend = sortedYears.map(y => ({
              year: y,
              value: yearlyMap[y],
              unit: wtoUnit || 'Million US dollar',
              source: 'WTO Timeseries API v1'
            }));

            // Market size = last available year
            if (wtoTrend.length > 0) {
              const last = wtoTrend[wtoTrend.length - 1];
              wtoMarketSize = {
                value: last.value,
                unit: wtoUnit || 'Million US dollar',
                year: last.year,
                source: 'WTO Timeseries API v1'
              };
            }

            // CAGR
            if (wtoTrend.length >= 2) {
              const first = wtoTrend[0];
              const last = wtoTrend[wtoTrend.length - 1];
              const n = last.year - first.year;
              if (first.value > 0 && n > 0) {
                const cagrVal = (Math.pow(last.value / first.value, 1 / n) - 1) * 100;
                wtoCagr = parseFloat(cagrVal.toFixed(2)) + '%';
              }
            }
          } else {
            notes.push('WTO /data returned empty dataset.');
          }
        } else {
          notes.push('WTO /data response could not be parsed as JSON.');
        }
      } else {
        notes.push(`WTO /data HTTP ${dResp.status}.`);
      }
    } catch (e) {
      console.log(`[TI] WTO data error: ${e.message}`);
      notes.push(`WTO data fetch error: ${e.message}`);
    }
  }

  // 2c) Metadata (unit, frequency) — confirm from indicator metadata
  if (!wtoUnit || !wtoFrequency) {
    try {
      const mdResp = await fetch(`${WTO_BASE}/indicators`, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
      if (mdResp.ok) {
        const mdAll = await mdResp.json();
        if (Array.isArray(mdAll)) {
          const match = mdAll.find(x => (x.code || '').toLowerCase() === 'its_mtv_am');
          if (match) {
            if (!wtoUnit) wtoUnit = match.unitCode || 'USM';
            if (!wtoFrequency) wtoFrequency = match.frequencyCode || 'A';
          }
        }
      }
    } catch (_e) { /* skip */ }
  }

  // Map unit codes to human-readable
  const unitMap = { 'USM': 'Million US dollar', 'USD': 'US dollar', 'PCT': 'Percentage', 'NUM': 'Number' };
  const unitReadable = unitMap[wtoUnit] || wtoUnit || 'Million US dollar';
  const freqMap = { 'A': 'Annual', 'Q': 'Quarterly', 'M': 'Monthly' };
  const freqReadable = freqMap[wtoFrequency] || wtoFrequency || 'Annual';

  // ===========================
  // FASE 3 — COMTRADE (BILATERAL DATA)
  // ===========================
  console.log(`[TI] FASE 3 — Comtrade bilateral data`);

  let topSuppliers = [];
  let marketShare = [];
  let comtradeImportTotal = null;
  let comtradeYear = null;
  let comtradeAvailable = false;

  // Determine ISO2 code for Comtrade query
  const iso2 = WTO_TO_ISO2[reporterCode] || null;
  const m49 = iso2 ? ISO2_TO_M49[iso2] : null;

  if (!m49) {
    notes.push(`Cannot map WTO reporter ${reporterCode} to M49 code for Comtrade. Bilateral data skipped.`);
    console.log(`[TI] No M49 mapping for WTO code ${reporterCode}`);
  } else {
    // Use last year in range for Comtrade query
    const comtradeQueryYear = yearsArray[yearsArray.length - 1];
    const hs4 = String(productCode).replace(/\D/g, '').substring(0, 4);

    // Only query Comtrade if product code is numeric (HS code)
    // WTO product groups like "AG", "TO", "MA" don't have direct HS mapping
    const isHSCode = /^\d{2,6}$/.test(productCode.replace(/\D/g, ''));

    if (!isHSCode) {
      notes.push(`Product "${productCode}" is a WTO product group, not an HS code. Comtrade bilateral query requires HS code. Top suppliers not available.`);
      console.log(`[TI] Product "${productCode}" not numeric HS, skipping Comtrade`);
    } else {
      // Query Comtrade: all partners exporting to this reporter
      const comtradeUrl = `https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=${m49}&partnerCode=0&cmdCode=${hs4}&flowCode=M&period=${comtradeQueryYear}`;
      console.log(`[TI] Comtrade GET ${comtradeUrl}`);

      try {
        const ctResp = await fetch(comtradeUrl, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(20000)
        });

        if (ctResp.ok) {
          const ctJson = await ctResp.json();
          const ctRecords = ctJson?.data || [];
          console.log(`[TI] Comtrade records: ${ctRecords.length}`);

          if (ctRecords.length === 0) {
            notes.push(`No Comtrade data for ${iso2}(M49:${m49}) HS${hs4} year=${comtradeQueryYear}.`);

            // Retry with previous year
            const prevYear = comtradeQueryYear - 1;
            const retryUrl = `https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=${m49}&partnerCode=0&cmdCode=${hs4}&flowCode=M&period=${prevYear}`;
            console.log(`[TI] Comtrade retry year ${prevYear}`);
            const retryResp = await fetch(retryUrl, {
              headers: { 'Accept': 'application/json' },
              signal: AbortSignal.timeout(20000)
            });
            if (retryResp.ok) {
              const retryJson = await retryResp.json();
              const retryRecords = retryJson?.data || [];
              if (retryRecords.length > 0) {
                notes.push(`Comtrade data found for year ${prevYear} instead.`);
                processComtradeRecords(retryRecords, prevYear);
              }
            }
          } else {
            processComtradeRecords(ctRecords, comtradeQueryYear);
          }
        } else {
          notes.push(`Comtrade HTTP ${ctResp.status}.`);
          console.log(`[TI] Comtrade HTTP ${ctResp.status}`);
        }
      } catch (e) {
        console.log(`[TI] Comtrade error: ${e.message}`);
        notes.push(`Comtrade fetch error: ${e.message}`);
      }
    }
  }

  function processComtradeRecords(records, year) {
    const byPartner = {};
    let totalImport = 0;

    for (const r of records) {
      const partnerCodeVal = r.partnerCode;
      const partnerDesc = r.partnerDesc || r.partner || `M49:${partnerCodeVal}`;
      if (partnerCodeVal === 0 || partnerCodeVal === '0') continue; // Skip "World"
      const val = r.primaryValue || 0;
      if (val <= 0) continue;
      if (!byPartner[partnerCodeVal]) byPartner[partnerCodeVal] = { name: partnerDesc, value: 0 };
      byPartner[partnerCodeVal].value += val;
      totalImport += val;
    }

    if (totalImport > 0) {
      comtradeAvailable = true;
      comtradeImportTotal = Math.round(totalImport);
      comtradeYear = year;

      const sorted = Object.values(byPartner).sort((a, b) => b.value - a.value);
      const top10 = sorted.slice(0, 10);

      topSuppliers = top10.map((s, idx) => ({
        rank: idx + 1,
        partner_name: s.name,
        import_value_usd: Math.round(s.value),
        market_share_pct: parseFloat(((s.value / totalImport) * 100).toFixed(2)),
        source: 'UN Comtrade'
      }));

      marketShare = top10.map(s => ({
        partner_name: s.name,
        share_pct: parseFloat(((s.value / totalImport) * 100).toFixed(2))
      }));

      console.log(`[TI] Comtrade: ${sorted.length} partners, total=$${totalImport}, top=${top10[0]?.name}`);
    } else {
      notes.push(`Comtrade returned records but total import = 0 for year ${year}.`);
    }
  }

  // ===========================
  // FASE 4 — Output strutturato
  // ===========================
  console.log(`[TI] FASE 4 — Building output`);

  const output = {
    country: reporterName || country_name,
    country_code_wto: reporterCode,
    country_code_iso2: iso2 || null,
    product: productName || product_description,
    product_code: productCode,
    years_requested: yearsArray,
    market_size: wtoMarketSize || {
      value: null,
      unit: unitReadable,
      year: null,
      source: 'WTO Timeseries API v1',
      note: 'No data available'
    },
    trend: wtoTrend,
    cagr: wtoCagr || null,
    top_suppliers: topSuppliers,
    market_share: marketShare,
    comtrade_import_total: comtradeImportTotal ? {
      value_usd: comtradeImportTotal,
      year: comtradeYear,
      source: 'UN Comtrade'
    } : null,
    unit: unitReadable,
    frequency: freqReadable,
    sources: {
      macro: 'WTO Timeseries API v1',
      bilateral: comtradeAvailable ? 'UN Comtrade' : 'UN Comtrade (no data available)'
    },
    data_availability: {
      wto_macro: wtoDataAvailable,
      comtrade_bilateral: comtradeAvailable
    },
    notes: notes.length > 0 ? notes : [],
    timestamp
  };

  console.log(`[TI] Done. WTO=${wtoDataAvailable} Comtrade=${comtradeAvailable} trend=${wtoTrend.length} suppliers=${topSuppliers.length}`);

  return Response.json(output);
});