import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Trade Intelligence Engine
 * 
 * FASE 1: Normalizzazione input (WTO reporters, products, years)
 * FASE 2: WTO macro data (market_size, trend, CAGR) — solo p=000 (World)
 * FASE 3: Comtrade bilateral data (top suppliers, market share)
 * FASE 4: Output strutturato
 */

var WTO_BASE = 'https://api.wto.org/timeseries/v1';

var ISO2_TO_M49 = {
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

var WTO_TO_ISO2 = {
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
  var base44 = createClientFromRequest(req);
  var user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  var payload = await req.json().catch(function() { return {}; });
  var countryName = payload.country_name || '';
  var productDescription = payload.product_description || '';
  var yearsRange = payload.years_range || '';

  if (!countryName || !productDescription) {
    return Response.json({ error: 'country_name and product_description are required' }, { status: 400 });
  }

  var apiKey = Deno.env.get('WTO_API_KEY') || '';
  if (!apiKey) return Response.json({ error: 'WTO_API_KEY not set' }, { status: 500 });

  var HEADERS = { 'Ocp-Apim-Subscription-Key': apiKey, 'Accept': 'application/json' };
  var notes = [];
  var timestamp = new Date().toISOString();

  // ===========================
  // FASE 1
  // ===========================
  console.log('[TI] FASE 1 — country=' + countryName + ' product=' + productDescription + ' years=' + yearsRange);

  var reporterCode = null;
  var reporterName = null;
  try {
    var rResp = await fetch(WTO_BASE + '/reporters', { headers: HEADERS, signal: AbortSignal.timeout(15000) });
    if (!rResp.ok) throw new Error('HTTP ' + rResp.status);
    var reporters = await rResp.json();
    if (Array.isArray(reporters)) {
      var sL = countryName.toLowerCase().trim();
      var rMatch = null;
      for (var ri = 0; ri < reporters.length; ri++) {
        if ((reporters[ri].name || '').toLowerCase() === sL) { rMatch = reporters[ri]; break; }
      }
      if (!rMatch) {
        for (var ri2 = 0; ri2 < reporters.length; ri2++) {
          if ((reporters[ri2].name || '').toLowerCase().indexOf(sL) >= 0) { rMatch = reporters[ri2]; break; }
        }
      }
      if (!rMatch) {
        for (var ri3 = 0; ri3 < reporters.length; ri3++) {
          if (String(reporters[ri3].code) === countryName.trim()) { rMatch = reporters[ri3]; break; }
        }
      }
      if (rMatch) {
        reporterCode = String(rMatch.code);
        reporterName = rMatch.name;
        console.log('[TI] Reporter: ' + reporterCode + ' = ' + reporterName);
      }
    }
  } catch (e) {
    console.log('[TI] Reporters err: ' + e.message);
  }

  if (!reporterCode) {
    return Response.json({ error: 'Reporter non trovato per "' + countryName + '"', phase: 'FASE 1' }, { status: 400 });
  }

  var productCode = productDescription.trim();
  var productName = null;
  try {
    var pResp = await fetch(WTO_BASE + '/products', { headers: HEADERS, signal: AbortSignal.timeout(15000) });
    if (pResp.ok) {
      var products = await pResp.json();
      if (Array.isArray(products)) {
        var pL = productDescription.toLowerCase().trim();
        var pMatch = null;
        for (var pi = 0; pi < products.length; pi++) {
          if ((products[pi].code || '').toLowerCase() === pL) { pMatch = products[pi]; break; }
        }
        if (!pMatch) {
          for (var pi2 = 0; pi2 < products.length; pi2++) {
            if ((products[pi2].name || '').toLowerCase().indexOf(pL) >= 0) { pMatch = products[pi2]; break; }
          }
        }
        if (pMatch) {
          productCode = pMatch.code;
          productName = pMatch.name;
          console.log('[TI] Product: ' + productCode + ' = ' + productName);
        } else {
          notes.push('Product "' + productDescription + '" used as-is.');
        }
      }
    }
  } catch (e) {
    notes.push('Products API error.');
  }

  var availableYears = [];
  try {
    var yResp = await fetch(WTO_BASE + '/years', { headers: HEADERS, signal: AbortSignal.timeout(15000) });
    if (yResp.ok) availableYears = await yResp.json();
  } catch (e) { /* skip */ }

  var yearsArray = [];
  if (yearsRange) {
    var yrStr = String(yearsRange).trim();
    if (yrStr.indexOf('-') >= 0 && yrStr.indexOf(',') < 0) {
      var pts = yrStr.split('-').map(Number);
      if (pts.length === 2 && !isNaN(pts[0]) && !isNaN(pts[1])) {
        for (var yy1 = pts[0]; yy1 <= pts[1]; yy1++) yearsArray.push(yy1);
      }
    } else {
      var yrParts = yrStr.split(',');
      for (var yp = 0; yp < yrParts.length; yp++) {
        var parsed = parseInt(yrParts[yp].trim(), 10);
        if (!isNaN(parsed)) yearsArray.push(parsed);
      }
    }
  }
  if (yearsArray.length === 0) {
    var cY = new Date().getFullYear();
    for (var yy2 = cY - 5; yy2 <= cY - 1; yy2++) yearsArray.push(yy2);
    notes.push('No years_range. Default ' + yearsArray[0] + '-' + yearsArray[yearsArray.length - 1] + '.');
  }

  var yearsParam = yearsArray.join(',');

  // ===========================
  // FASE 2 — WTO MACRO
  // ===========================
  console.log('[TI] FASE 2 — WTO macro');

  var wtoMarketSize = null;
  var wtoTrend = [];
  var wtoCagr = null;
  var wtoUnit = null;
  var wtoFrequency = null;
  var wtoDataAvailable = false;

  var dataCount = 0;
  try {
    var dcP = new URLSearchParams();
    dcP.set('i', 'ITS_MTV_AM'); dcP.set('r', reporterCode); dcP.set('p', '000');
    dcP.set('pc', productCode); dcP.set('ps', yearsParam);
    var dcUrl = WTO_BASE + '/data_count?' + dcP.toString();
    console.log('[TI] ' + dcUrl);
    var dcR = await fetch(dcUrl, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
    if (dcR.ok) {
      var dcRaw = await dcR.text();
      dataCount = parseInt(dcRaw, 10);
      if (isNaN(dataCount)) dataCount = 0;
      console.log('[TI] data_count=' + dataCount);
    }
  } catch (e) {
    console.log('[TI] data_count err: ' + e.message);
  }

  if (dataCount === 0) {
    notes.push('WTO data not available for selected combination (ITS_MTV_AM, p=World).');
  } else {
    try {
      var dP = new URLSearchParams();
      dP.set('i', 'ITS_MTV_AM'); dP.set('r', reporterCode); dP.set('p', '000');
      dP.set('pc', productCode); dP.set('ps', yearsParam);
      dP.set('fmt', 'json'); dP.set('mode', 'full'); dP.set('dec', '2');
      dP.set('max', '500'); dP.set('head', 'H'); dP.set('lang', '1');
      var dUrl = WTO_BASE + '/data?' + dP.toString();
      console.log('[TI] ' + dUrl);
      var dResp = await fetch(dUrl, { headers: HEADERS, signal: AbortSignal.timeout(30000) });

      if (dResp.ok) {
        var rawBody = await dResp.text();
        console.log('[TI] raw len=' + rawBody.length + ' preview=' + rawBody.substring(0, 200));
        var rawData = null;
        try { rawData = JSON.parse(rawBody); } catch (_e) {}

        if (rawData) {
          var dataArray = null;
          if (Array.isArray(rawData)) dataArray = rawData;
          else if (rawData.Dataset && Array.isArray(rawData.Dataset)) dataArray = rawData.Dataset;
          else if (typeof rawData === 'object') {
            var oKeys = Object.keys(rawData);
            for (var oki = 0; oki < oKeys.length; oki++) {
              if (Array.isArray(rawData[oKeys[oki]])) { dataArray = rawData[oKeys[oki]]; break; }
            }
          }

          if (dataArray && dataArray.length > 0) {
            wtoDataAvailable = true;
            console.log('[TI] WTO records=' + dataArray.length);
            var yearlyMap = {};
            for (var dai = 0; dai < dataArray.length; dai++) {
              var rec = dataArray[dai];
              var yrV = parseInt(String(rec.Year || ''), 10);
              var valV = parseFloat(rec.Value);
              if (!isNaN(yrV) && !isNaN(valV) && valV >= 0) yearlyMap[yrV] = valV;
              if (!wtoUnit && rec.Unit) wtoUnit = rec.Unit;
              if (!wtoFrequency && rec.Frequency) wtoFrequency = rec.Frequency;
            }
            var sYears = Object.keys(yearlyMap).map(Number).sort(function(a, b) { return a - b; });
            for (var si = 0; si < sYears.length; si++) {
              wtoTrend.push({ year: sYears[si], value: yearlyMap[sYears[si]], unit: wtoUnit || 'Million US dollar', source: 'WTO Timeseries API v1' });
            }
            if (wtoTrend.length > 0) {
              var last = wtoTrend[wtoTrend.length - 1];
              wtoMarketSize = { value: last.value, unit: wtoUnit || 'Million US dollar', year: last.year, source: 'WTO Timeseries API v1' };
            }
            if (wtoTrend.length >= 2) {
              var f = wtoTrend[0]; var l = wtoTrend[wtoTrend.length - 1];
              var nY = l.year - f.year;
              if (f.value > 0 && nY > 0) {
                wtoCagr = parseFloat(((Math.pow(l.value / f.value, 1 / nY) - 1) * 100).toFixed(2)) + '%';
              }
            }
          } else {
            notes.push('WTO /data returned empty dataset.');
          }
        } else {
          notes.push('WTO /data response not parseable.');
        }
      } else {
        notes.push('WTO /data HTTP ' + dResp.status);
      }
    } catch (e) {
      notes.push('WTO data error: ' + e.message);
    }
  }

  if (!wtoUnit || !wtoFrequency) {
    try {
      var mdR = await fetch(WTO_BASE + '/indicators', { headers: HEADERS, signal: AbortSignal.timeout(15000) });
      if (mdR.ok) {
        var mdAll = await mdR.json();
        if (Array.isArray(mdAll)) {
          for (var mdi = 0; mdi < mdAll.length; mdi++) {
            if ((mdAll[mdi].code || '').toLowerCase() === 'its_mtv_am') {
              if (!wtoUnit) wtoUnit = mdAll[mdi].unitCode || 'USM';
              if (!wtoFrequency) wtoFrequency = mdAll[mdi].frequencyCode || 'A';
              break;
            }
          }
        }
      }
    } catch (_e) {}
  }

  var uMap = { 'USM': 'Million US dollar', 'USD': 'US dollar', 'PCT': 'Percentage' };
  var unitReadable = uMap[wtoUnit] || wtoUnit || 'Million US dollar';
  var fMap = { 'A': 'Annual', 'Q': 'Quarterly', 'M': 'Monthly' };
  var freqReadable = fMap[wtoFrequency] || wtoFrequency || 'Annual';

  // ===========================
  // FASE 3 — COMTRADE
  // ===========================
  console.log('[TI] FASE 3 — Comtrade');

  var topSuppliers = [];
  var marketShare = [];
  var comtradeImportTotal = null;
  var comtradeYear = null;
  var comtradeAvailable = false;

  var iso2 = WTO_TO_ISO2[reporterCode] || null;
  var m49 = iso2 ? ISO2_TO_M49[iso2] : null;

  if (!m49) {
    notes.push('No M49 mapping for WTO ' + reporterCode + '. Bilateral data skipped.');
  } else {
    var cqYear = yearsArray[yearsArray.length - 1];
    var cleanPC = String(productCode).replace(/\D/g, '');
    var isHS = /^\d{2,6}$/.test(cleanPC);

    if (!isHS) {
      notes.push('Product "' + productCode + '" is not HS code. Top suppliers not available.');
    } else {
      var hs4 = cleanPC.substring(0, 4);

      var processRecords = function(records, year) {
        var byP = {};
        var totImp = 0;
        for (var ci = 0; ci < records.length; ci++) {
          var r = records[ci];
          var pc = r.partnerCode;
          var pd = r.partnerDesc || ('M49:' + pc);
          if (pc === 0 || pc === '0') continue;
          var v = r.primaryValue || 0;
          if (v <= 0) continue;
          if (!byP[pc]) byP[pc] = { name: pd, value: 0 };
          byP[pc].value += v;
          totImp += v;
        }
        if (totImp > 0) {
          comtradeAvailable = true;
          comtradeImportTotal = Math.round(totImp);
          comtradeYear = year;
          var sorted = Object.values(byP).sort(function(a, b) { return b.value - a.value; });
          var top10 = sorted.slice(0, 10);
          for (var ti = 0; ti < top10.length; ti++) {
            topSuppliers.push({
              rank: ti + 1,
              partner_name: top10[ti].name,
              import_value_usd: Math.round(top10[ti].value),
              market_share_pct: parseFloat(((top10[ti].value / totImp) * 100).toFixed(2)),
              source: 'UN Comtrade'
            });
            marketShare.push({
              partner_name: top10[ti].name,
              share_pct: parseFloat(((top10[ti].value / totImp) * 100).toFixed(2))
            });
          }
          console.log('[TI] Comtrade: ' + sorted.length + ' partners, $' + totImp);
        } else {
          notes.push('Comtrade total=0 for year ' + year);
        }
      };

      var ctUrl = 'https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=' + m49 + '&partnerCode=0&cmdCode=' + hs4 + '&flowCode=M&period=' + cqYear;
      console.log('[TI] ' + ctUrl);
      try {
        var ctR = await fetch(ctUrl, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(20000) });
        if (ctR.ok) {
          var ctJ = await ctR.json();
          var ctRecs = (ctJ && ctJ.data) ? ctJ.data : [];
          console.log('[TI] Comtrade records=' + ctRecs.length);
          if (ctRecs.length === 0) {
            notes.push('No Comtrade data for HS' + hs4 + ' year=' + cqYear);
            var prevY = cqYear - 1;
            try {
              var retUrl = 'https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=' + m49 + '&partnerCode=0&cmdCode=' + hs4 + '&flowCode=M&period=' + prevY;
              var retR = await fetch(retUrl, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(20000) });
              if (retR.ok) {
                var retJ = await retR.json();
                var retRecs = (retJ && retJ.data) ? retJ.data : [];
                if (retRecs.length > 0) {
                  notes.push('Using Comtrade year ' + prevY + ' instead.');
                  processRecords(retRecs, prevY);
                }
              }
            } catch (re) {}
          } else {
            processRecords(ctRecs, cqYear);
          }
        } else {
          notes.push('Comtrade HTTP ' + ctR.status);
        }
      } catch (e) {
        notes.push('Comtrade error: ' + e.message);
      }
    }
  }

  // ===========================
  // FASE 4 — OUTPUT
  // ===========================
  var output = {
    country: reporterName || countryName,
    country_code_wto: reporterCode,
    country_code_iso2: iso2 || null,
    product: productName || productDescription,
    product_code: productCode,
    years_requested: yearsArray,
    market_size: wtoMarketSize || { value: null, unit: unitReadable, year: null, source: 'WTO Timeseries API v1', note: 'No data available' },
    trend: wtoTrend,
    cagr: wtoCagr || null,
    top_suppliers: topSuppliers,
    market_share: marketShare,
    comtrade_import_total: comtradeImportTotal ? { value_usd: comtradeImportTotal, year: comtradeYear, source: 'UN Comtrade' } : null,
    unit: unitReadable,
    frequency: freqReadable,
    sources: { macro: 'WTO Timeseries API v1', bilateral: comtradeAvailable ? 'UN Comtrade' : 'UN Comtrade (no data available)' },
    data_availability: { wto_macro: wtoDataAvailable, comtrade_bilateral: comtradeAvailable },
    notes: notes,
    timestamp: timestamp
  };

  return Response.json(output);
});