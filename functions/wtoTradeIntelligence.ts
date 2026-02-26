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
  const countryName = payload.country_name || '';
  const productDescription = payload.product_description || '';
  const yearsRange = payload.years_range || '';

  if (!countryName || !productDescription) {
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
  console.log('[TI] FASE 1 — Input: country="' + countryName + '" product="' + productDescription + '" years="' + yearsRange + '"');

  // 1a) Converti country_name → WTO reporter code
  var reporterCode = null;
  var reporterName = null;
  try {
    var rResp = await fetch(WTO_BASE + '/reporters', { headers: HEADERS, signal: AbortSignal.timeout(15000) });
    if (!rResp.ok) throw new Error('WTO reporters HTTP ' + rResp.status);
    var reporters = await rResp.json();
    if (Array.isArray(reporters)) {
      var searchLower = countryName.toLowerCase().trim();
      var match = reporters.find(function(r) { return (r.name || '').toLowerCase() === searchLower; });
      if (!match) match = reporters.find(function(r) { return (r.name || '').toLowerCase().includes(searchLower); });
      if (!match) match = reporters.find(function(r) { return String(r.code) === countryName.trim(); });
      if (match) {
        reporterCode = String(match.code);
        reporterName = match.name;
        console.log('[TI] Reporter resolved: "' + countryName + '" → code=' + reporterCode + ' name="' + reporterName + '"');
      }
    }
  } catch (e) {
    console.log('[TI] Reporters error: ' + e.message);
  }

  if (!reporterCode) {
    return Response.json({
      error: 'Reporter non trovato per "' + countryName + '". Usa un nome paese in inglese (es. "United States", "Germany", "China").',
      phase: 'FASE 1'
    }, { status: 400 });
  }

  // 1b) Converti product_description → product code
  var productCode = productDescription.trim();
  var productName = null;
  try {
    var pResp = await fetch(WTO_BASE + '/products', { headers: HEADERS, signal: AbortSignal.timeout(15000) });
    if (!pResp.ok) throw new Error('WTO products HTTP ' + pResp.status);
    var products = await pResp.json();
    if (Array.isArray(products)) {
      var pSearchLower = productDescription.toLowerCase().trim();
      var pMatch = products.find(function(p) { return (p.code || '').toLowerCase() === pSearchLower; });
      if (!pMatch) pMatch = products.find(function(p) { return (p.name || '').toLowerCase().includes(pSearchLower); });
      if (pMatch) {
        productCode = pMatch.code;
        productName = pMatch.name;
        console.log('[TI] Product resolved: "' + productDescription + '" → code=' + productCode + ' name="' + productName + '"');
      } else {
        notes.push('Product code "' + productDescription + '" used as-is (no match in WTO product list).');
      }
    }
  } catch (e) {
    notes.push('Products API error: ' + e.message + '. Using raw product code.');
  }

  // 1c) Verifica anni disponibili
  var availableYears = [];
  try {
    var yResp = await fetch(WTO_BASE + '/years', { headers: HEADERS, signal: AbortSignal.timeout(15000) });
    if (yResp.ok) {
      availableYears = await yResp.json();
    }
  } catch (e) { /* skip */ }

  // Parse years_range
  var yearsArray = [];
  if (yearsRange) {
    var yr = String(yearsRange).trim();
    if (yr.includes('-') && !yr.includes(',')) {
      var parts = yr.split('-').map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        for (var y = parts[0]; y <= parts[1]; y++) yearsArray.push(y);
      }
    } else {
      yearsArray = yr.split(',').map(function(s) { return parseInt(s.trim(), 10); }).filter(function(n) { return !isNaN(n); });
    }
  }

  if (yearsArray.length === 0) {
    var currentYear = new Date().getFullYear();
    for (var yy = currentYear - 5; yy <= currentYear - 1; yy++) yearsArray.push(yy);
    notes.push('No years_range provided. Defaulting to ' + yearsArray[0] + '-' + yearsArray[yearsArray.length - 1] + '.');
  }

  var yearsParam = yearsArray.join(',');
  console.log('[TI] Normalized: reporter=' + reporterCode + '(' + reporterName + ') product=' + productCode + '(' + productName + ') years=' + yearsParam);

  // ===========================
  // FASE 2 — WTO (MACRO DATA)
  // ===========================
  console.log('[TI] FASE 2 — WTO macro data');

  var wtoMarketSize = null;
  var wtoTrend = [];
  var wtoCagr = null;
  var wtoUnit = null;
  var wtoFrequency = null;
  var wtoDataAvailable = false;

  // 2a) data_count check
  var dataCount = 0;
  try {
    var dcParams = new URLSearchParams();
    dcParams.set('i', 'ITS_MTV_AM');
    dcParams.set('r', reporterCode);
    dcParams.set('p', '000');
    dcParams.set('pc', productCode);
    dcParams.set('ps', yearsParam);
    var dcUrl = WTO_BASE + '/data_count?' + dcParams.toString();
    console.log('[TI] GET ' + dcUrl);
    var dcResp = await fetch(dcUrl, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
    if (dcResp.ok) {
      var dcRaw = await dcResp.text();
      dataCount = parseInt(dcRaw, 10);
      if (isNaN(dataCount)) dataCount = 0;
      console.log('[TI] data_count = ' + dataCount);
    }
  } catch (e) {
    console.log('[TI] data_count error: ' + e.message);
  }

  if (dataCount === 0) {
    notes.push('WTO data not available for selected combination (ITS_MTV_AM, p=World).');
  } else {
    // 2b) Fetch data
    try {
      var dParams = new URLSearchParams();
      dParams.set('i', 'ITS_MTV_AM');
      dParams.set('r', reporterCode);
      dParams.set('p', '000');
      dParams.set('pc', productCode);
      dParams.set('ps', yearsParam);
      dParams.set('fmt', 'json');
      dParams.set('mode', 'full');
      dParams.set('dec', '2');
      dParams.set('max', '500');
      dParams.set('head', 'H');
      dParams.set('lang', '1');
      var dUrl = WTO_BASE + '/data?' + dParams.toString();
      console.log('[TI] GET ' + dUrl);
      var dResp = await fetch(dUrl, { headers: HEADERS, signal: AbortSignal.timeout(30000) });

      if (dResp.ok) {
        var rawBody = await dResp.text();
        console.log('[TI] WTO raw len=' + rawBody.length + ' preview=' + rawBody.substring(0, 200));
        var rawData = null;
        try { rawData = JSON.parse(rawBody); } catch (_e) { rawData = null; }

        if (rawData) {
          var dataArray = null;
          if (Array.isArray(rawData)) {
            dataArray = rawData;
          } else if (rawData.Dataset && Array.isArray(rawData.Dataset)) {
            dataArray = rawData.Dataset;
          } else if (rawData && typeof rawData === 'object') {
            var objKeys = Object.keys(rawData);
            for (var ki = 0; ki < objKeys.length; ki++) {
              if (Array.isArray(rawData[objKeys[ki]])) {
                dataArray = rawData[objKeys[ki]];
                break;
              }
            }
          }

          if (dataArray && dataArray.length > 0) {
            wtoDataAvailable = true;
            console.log('[TI] WTO data records: ' + dataArray.length);

            var yearlyMap = {};
            for (var di = 0; di < dataArray.length; di++) {
              var rec = dataArray[di];
              var yrVal = parseInt(String(rec.Year || ''), 10);
              var valNum = parseFloat(rec.Value);
              if (!isNaN(yrVal) && !isNaN(valNum) && valNum >= 0) {
                yearlyMap[yrVal] = valNum;
              }
              if (!wtoUnit && rec.Unit) wtoUnit = rec.Unit;
              if (!wtoFrequency && rec.Frequency) wtoFrequency = rec.Frequency;
            }

            var sortedYears = Object.keys(yearlyMap).map(Number).sort(function(a, b) { return a - b; });
            wtoTrend = sortedYears.map(function(yKey) {
              return {
                year: yKey,
                value: yearlyMap[yKey],
                unit: wtoUnit || 'Million US dollar',
                source: 'WTO Timeseries API v1'
              };
            });

            if (wtoTrend.length > 0) {
              var lastItem = wtoTrend[wtoTrend.length - 1];
              wtoMarketSize = {
                value: lastItem.value,
                unit: wtoUnit || 'Million US dollar',
                year: lastItem.year,
                source: 'WTO Timeseries API v1'
              };
            }

            if (wtoTrend.length >= 2) {
              var firstItem = wtoTrend[0];
              var lastItem2 = wtoTrend[wtoTrend.length - 1];
              var nYears = lastItem2.year - firstItem.year;
              if (firstItem.value > 0 && nYears > 0) {
                var cagrVal = (Math.pow(lastItem2.value / firstItem.value, 1 / nYears) - 1) * 100;
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
        notes.push('WTO /data HTTP ' + dResp.status + '.');
      }
    } catch (e) {
      console.log('[TI] WTO data error: ' + e.message);
      notes.push('WTO data fetch error: ' + e.message);
    }
  }

  // 2c) Metadata
  if (!wtoUnit || !wtoFrequency) {
    try {
      var mdResp = await fetch(WTO_BASE + '/indicators', { headers: HEADERS, signal: AbortSignal.timeout(15000) });
      if (mdResp.ok) {
        var mdAll = await mdResp.json();
        if (Array.isArray(mdAll)) {
          var mdMatch = null;
          for (var mi = 0; mi < mdAll.length; mi++) {
            if ((mdAll[mi].code || '').toLowerCase() === 'its_mtv_am') { mdMatch = mdAll[mi]; break; }
          }
          if (mdMatch) {
            if (!wtoUnit) wtoUnit = mdMatch.unitCode || 'USM';
            if (!wtoFrequency) wtoFrequency = mdMatch.frequencyCode || 'A';
          }
        }
      }
    } catch (_e) { /* skip */ }
  }

  var unitMap = { 'USM': 'Million US dollar', 'USD': 'US dollar', 'PCT': 'Percentage', 'NUM': 'Number' };
  var unitReadable = unitMap[wtoUnit] || wtoUnit || 'Million US dollar';
  var freqMap = { 'A': 'Annual', 'Q': 'Quarterly', 'M': 'Monthly' };
  var freqReadable = freqMap[wtoFrequency] || wtoFrequency || 'Annual';

  // ===========================
  // FASE 3 — COMTRADE (BILATERAL DATA)
  // ===========================
  console.log('[TI] FASE 3 — Comtrade bilateral data');

  var topSuppliers = [];
  var marketShare = [];
  var comtradeImportTotal = null;
  var comtradeYear = null;
  var comtradeAvailable = false;

  var iso2 = WTO_TO_ISO2[reporterCode] || null;
  var m49 = iso2 ? ISO2_TO_M49[iso2] : null;

  if (!m49) {
    notes.push('Cannot map WTO reporter ' + reporterCode + ' to M49 code for Comtrade. Bilateral data skipped.');
  } else {
    var comtradeQueryYear = yearsArray[yearsArray.length - 1];
    var cleanProductCode = String(productCode).replace(/\D/g, '');
    var isHSCode = /^\d{2,6}$/.test(cleanProductCode);

    if (!isHSCode) {
      notes.push('Product "' + productCode + '" is a WTO product group, not an HS code. Comtrade bilateral query requires HS code. Top suppliers not available.');
    } else {
      var hs4 = cleanProductCode.substring(0, 4);
      var comtradeUrl = 'https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=' + m49 + '&partnerCode=0&cmdCode=' + hs4 + '&flowCode=M&period=' + comtradeQueryYear;
      console.log('[TI] Comtrade GET ' + comtradeUrl);

      try {
        var ctResp = await fetch(comtradeUrl, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(20000)
        });

        if (ctResp.ok) {
          var ctJson = await ctResp.json();
          var ctRecords = ctJson.data || [];
          console.log('[TI] Comtrade records: ' + ctRecords.length);

          if (ctRecords.length === 0) {
            notes.push('No Comtrade data for ' + iso2 + '(M49:' + m49 + ') HS' + hs4 + ' year=' + comtradeQueryYear + '.');

            // Retry previous year
            var prevYear = comtradeQueryYear - 1;
            var retryUrl = 'https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=' + m49 + '&partnerCode=0&cmdCode=' + hs4 + '&flowCode=M&period=' + prevYear;
            console.log('[TI] Comtrade retry year ' + prevYear);
            try {
              var retryResp = await fetch(retryUrl, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(20000) });
              if (retryResp.ok) {
                var retryJson = await retryResp.json();
                var retryRecords = retryJson.data || [];
                if (retryRecords.length > 0) {
                  notes.push('Comtrade data found for year ' + prevYear + ' instead.');
                  doProcessComtrade(retryRecords, prevYear);
                }
              }
            } catch (re) {
              console.log('[TI] Comtrade retry error: ' + re.message);
            }
          } else {
            doProcessComtrade(ctRecords, comtradeQueryYear);
          }
        } else {
          notes.push('Comtrade HTTP ' + ctResp.status + '.');
        }
      } catch (e) {
        console.log('[TI] Comtrade error: ' + e.message);
        notes.push('Comtrade fetch error: ' + e.message);
      }
    }
  }

  function doProcessComtrade(records, year) {
    var byPartner = {};
    var totalImport = 0;

    for (var ci = 0; ci < records.length; ci++) {
      var r = records[ci];
      var partnerCodeVal = r.partnerCode;
      var partnerDesc = r.partnerDesc || r.partner || ('M49:' + partnerCodeVal);
      if (partnerCodeVal === 0 || partnerCodeVal === '0') continue;
      var val = r.primaryValue || 0;
      if (val <= 0) continue;
      if (!byPartner[partnerCodeVal]) byPartner[partnerCodeVal] = { name: partnerDesc, value: 0 };
      byPartner[partnerCodeVal].value += val;
      totalImport += val;
    }

    if (totalImport > 0) {
      comtradeAvailable = true;
      comtradeImportTotal = Math.round(totalImport);
      comtradeYear = year;

      var sortedP = Object.values(byPartner).sort(function(a, b) { return b.value - a.value; });
      var top10 = sortedP.slice(0, 10);

      topSuppliers = top10.map(function(s, idx) {
        return {
          rank: idx + 1,
          partner_name: s.name,
          import_value_usd: Math.round(s.value),
          market_share_pct: parseFloat(((s.value / totalImport) * 100).toFixed(2)),
          source: 'UN Comtrade'
        };
      });

      marketShare = top10.map(function(s) {
        return {
          partner_name: s.name,
          share_pct: parseFloat(((s.value / totalImport) * 100).toFixed(2))
        };
      });

      console.log('[TI] Comtrade: ' + sortedP.length + ' partners, total=$' + totalImport + ', top=' + (top10[0] ? top10[0].name : 'N/A'));
    } else {
      notes.push('Comtrade returned records but total import = 0 for year ' + year + '.');
    }
  }

  // ===========================
  // FASE 4 — Output strutturato
  // ===========================
  console.log('[TI] FASE 4 — Building output');

  var output = {
    country: reporterName || countryName,
    country_code_wto: reporterCode,
    country_code_iso2: iso2 || null,
    product: productName || productDescription,
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
    timestamp: timestamp
  };

  console.log('[TI] Done. WTO=' + wtoDataAvailable + ' Comtrade=' + comtradeAvailable + ' trend=' + wtoTrend.length + ' suppliers=' + topSuppliers.length);

  return Response.json(output);
});