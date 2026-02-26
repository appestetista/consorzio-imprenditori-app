import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
    return Response.json({ error: 'country_name and product_description required' }, { status: 400 });
  }

  var apiKey = Deno.env.get('WTO_API_KEY') || '';
  if (!apiKey) return Response.json({ error: 'WTO_API_KEY not set' }, { status: 500 });

  var HEADERS = { 'Ocp-Apim-Subscription-Key': apiKey, 'Accept': 'application/json' };
  var notes = [];
  var timestamp = new Date().toISOString();

  // FASE 1 — Normalizzazione
  console.log('[TI] F1 country=' + countryName + ' product=' + productDescription);

  var reporterCode = null;
  var reporterName = null;
  var rResp = await fetch(WTO_BASE + '/reporters', { headers: HEADERS, signal: AbortSignal.timeout(15000) });
  if (rResp.ok) {
    var reporters = await rResp.json();
    if (Array.isArray(reporters)) {
      var sL = countryName.toLowerCase().trim();
      // 1) Exact name match
      for (var ri = 0; ri < reporters.length; ri++) {
        if ((reporters[ri].name || '').toLowerCase() === sL) { reporterCode = String(reporters[ri].code); reporterName = reporters[ri].name; break; }
      }
      // 2) Exact code match
      if (!reporterCode) {
        for (var ri3 = 0; ri3 < reporters.length; ri3++) {
          if (String(reporters[ri3].code) === countryName.trim()) { reporterCode = String(reporters[ri3].code); reporterName = reporters[ri3].name; break; }
        }
      }
      // 3) Partial match — prefer shortest name (most specific match)
      if (!reporterCode) {
        var candidates = [];
        for (var ri2 = 0; ri2 < reporters.length; ri2++) {
          var rName = (reporters[ri2].name || '').toLowerCase();
          if (rName.indexOf(sL) >= 0) {
            candidates.push(reporters[ri2]);
          }
        }
        // Sort by name length ascending — shortest name = most likely the country itself
        candidates.sort(function(a, b) { return (a.name || '').length - (b.name || '').length; });
        if (candidates.length > 0) {
          reporterCode = String(candidates[0].code);
          reporterName = candidates[0].name;
        }
      }
    }
  }
  if (!reporterCode) return Response.json({ error: 'Reporter not found: ' + countryName }, { status: 400 });
  console.log('[TI] Reporter=' + reporterCode + ' ' + reporterName);

  var productCode = productDescription.trim();
  var productName = null;
  var pResp = await fetch(WTO_BASE + '/products', { headers: HEADERS, signal: AbortSignal.timeout(15000) });
  if (pResp.ok) {
    var products = await pResp.json();
    if (Array.isArray(products)) {
      var pL = productDescription.toLowerCase().trim();
      for (var pi = 0; pi < products.length; pi++) {
        if ((products[pi].code || '').toLowerCase() === pL) { productCode = products[pi].code; productName = products[pi].name; break; }
      }
      if (!productName) {
        for (var pi2 = 0; pi2 < products.length; pi2++) {
          if ((products[pi2].name || '').toLowerCase().indexOf(pL) >= 0) { productCode = products[pi2].code; productName = products[pi2].name; break; }
        }
      }
    }
  }
  console.log('[TI] Product=' + productCode + ' ' + productName);

  var yearsArray = [];
  if (yearsRange) {
    var yrStr = String(yearsRange).trim();
    if (yrStr.indexOf('-') >= 0 && yrStr.indexOf(',') < 0) {
      var pts = yrStr.split('-').map(Number);
      if (pts.length === 2) for (var y1 = pts[0]; y1 <= pts[1]; y1++) yearsArray.push(y1);
    } else {
      var yrP = yrStr.split(',');
      for (var yp = 0; yp < yrP.length; yp++) { var pv = parseInt(yrP[yp], 10); if (!isNaN(pv)) yearsArray.push(pv); }
    }
  }
  if (yearsArray.length === 0) {
    var cY = new Date().getFullYear();
    for (var y2 = cY - 5; y2 <= cY - 1; y2++) yearsArray.push(y2);
    notes.push('Default years: ' + yearsArray[0] + '-' + yearsArray[yearsArray.length - 1]);
  }
  var yearsParam = yearsArray.join(',');

  // FASE 2 — WTO MACRO
  console.log('[TI] F2 WTO macro');
  var wtoMarketSize = null;
  var wtoTrend = [];
  var wtoCagr = null;
  var wtoUnit = null;
  var wtoFreq = null;
  var wtoOk = false;

  // WTO ITS_MTV_AM only supports product groups (AG, TO, MA, MI, etc.) not HS codes
  var cleanPCForWto = String(productCode).replace(/\D/g, '');
  var isHSProduct = /^\d{2,6}$/.test(cleanPCForWto);
  
  if (isHSProduct) {
    notes.push('WTO ITS_MTV_AM does not support HS codes (only product groups like AG, TO, MA). WTO macro data skipped for HS ' + productCode + '.');
    console.log('[TI] HS product detected, skipping WTO macro');
  }

  var dataCount = 0;
  if (!isHSProduct) {
    var dcP = new URLSearchParams();
    dcP.set('i', 'ITS_MTV_AM'); dcP.set('r', reporterCode); dcP.set('p', '000');
    dcP.set('pc', productCode); dcP.set('ps', yearsParam);
    var dcResp = await fetch(WTO_BASE + '/data_count?' + dcP.toString(), { headers: HEADERS, signal: AbortSignal.timeout(20000) });
    if (dcResp.ok) { var dcRaw = await dcResp.text(); dataCount = parseInt(dcRaw, 10) || 0; }
    console.log('[TI] data_count=' + dataCount);
  }

  if (dataCount === 0 && !isHSProduct) {
    notes.push('WTO: no data for ITS_MTV_AM p=World');
  } else if (dataCount > 0) {
    var dP = new URLSearchParams();
    dP.set('i', 'ITS_MTV_AM'); dP.set('r', reporterCode); dP.set('p', '000');
    dP.set('pc', productCode); dP.set('ps', yearsParam);
    dP.set('fmt', 'json'); dP.set('mode', 'full'); dP.set('dec', '2');
    dP.set('max', '500'); dP.set('head', 'H'); dP.set('lang', '1');
    var dResp = await fetch(WTO_BASE + '/data?' + dP.toString(), { headers: HEADERS, signal: AbortSignal.timeout(30000) });
    if (dResp.ok) {
      var rawBody = await dResp.text();
      console.log('[TI] raw len=' + rawBody.length + ' preview=' + rawBody.substring(0, 200));
      var rawData = null;
      try { rawData = JSON.parse(rawBody); } catch (_) {}
      if (rawData) {
        var arr = null;
        if (Array.isArray(rawData)) arr = rawData;
        else if (rawData.Dataset) arr = rawData.Dataset;
        else { var ks = Object.keys(rawData); for (var ki = 0; ki < ks.length; ki++) { if (Array.isArray(rawData[ks[ki]])) { arr = rawData[ks[ki]]; break; } } }
        if (arr && arr.length > 0) {
          wtoOk = true;
          var ym = {};
          for (var ai = 0; ai < arr.length; ai++) {
            var yr = parseInt(String(arr[ai].Year || ''), 10);
            var vl = parseFloat(arr[ai].Value);
            if (!isNaN(yr) && !isNaN(vl) && vl >= 0) ym[yr] = vl;
            if (!wtoUnit && arr[ai].Unit) wtoUnit = arr[ai].Unit;
            if (!wtoFreq && arr[ai].Frequency) wtoFreq = arr[ai].Frequency;
          }
          var sk = Object.keys(ym).map(Number).sort(function(a, b) { return a - b; });
          for (var si = 0; si < sk.length; si++) wtoTrend.push({ year: sk[si], value: ym[sk[si]], unit: wtoUnit || 'Million US dollar', source: 'WTO Timeseries API v1' });
          if (wtoTrend.length > 0) { var lt = wtoTrend[wtoTrend.length - 1]; wtoMarketSize = { value: lt.value, unit: wtoUnit || 'Million US dollar', year: lt.year, source: 'WTO Timeseries API v1' }; }
          if (wtoTrend.length >= 2) { var ft = wtoTrend[0]; var lt2 = wtoTrend[wtoTrend.length - 1]; var n = lt2.year - ft.year; if (ft.value > 0 && n > 0) wtoCagr = parseFloat(((Math.pow(lt2.value / ft.value, 1 / n) - 1) * 100).toFixed(2)) + '%'; }
        }
      }
    }
  }

  var uMap = { 'USM': 'Million US dollar', 'USD': 'US dollar', 'PCT': 'Percentage' };
  var unitR = uMap[wtoUnit] || wtoUnit || 'Million US dollar';
  var fMap = { 'A': 'Annual', 'Q': 'Quarterly', 'M': 'Monthly' };
  var freqR = fMap[wtoFreq] || wtoFreq || 'Annual';

  // FASE 3 — COMTRADE
  console.log('[TI] F3 Comtrade');
  var topSuppliers = [];
  var marketShare = [];
  var ctImportTotal = null;
  var ctYear = null;
  var ctOk = false;

  var iso2 = WTO_TO_ISO2[reporterCode] || null;
  var m49 = iso2 ? ISO2_TO_M49[iso2] : null;

  if (!m49) {
    notes.push('No M49 for WTO ' + reporterCode);
  } else {
    var cleanPC = String(productCode).replace(/\D/g, '');
    if (!/^\d{2,6}$/.test(cleanPC)) {
      notes.push('Product "' + productCode + '" not HS code. Bilateral skipped.');
    } else {
      var hs4 = cleanPC.substring(0, 4);
      var cqY = yearsArray[yearsArray.length - 1];

      var doProcess = function(recs, year) {
        var byP = {};
        var tot = 0;
        for (var i = 0; i < recs.length; i++) {
          var r = recs[i];
          if (r.partnerCode === 0 || r.partnerCode === '0') continue;
          var v = r.primaryValue || 0;
          if (v <= 0) continue;
          var k = r.partnerCode;
          if (!byP[k]) byP[k] = { name: r.partnerDesc || ('M49:' + k), value: 0 };
          byP[k].value += v;
          tot += v;
        }
        if (tot > 0) {
          ctOk = true; ctImportTotal = Math.round(tot); ctYear = year;
          var srt = Object.values(byP).sort(function(a, b) { return b.value - a.value; });
          var t10 = srt.slice(0, 10);
          for (var j = 0; j < t10.length; j++) {
            topSuppliers.push({ rank: j + 1, partner_name: t10[j].name, import_value_usd: Math.round(t10[j].value), market_share_pct: parseFloat(((t10[j].value / tot) * 100).toFixed(2)), source: 'UN Comtrade' });
            marketShare.push({ partner_name: t10[j].name, share_pct: parseFloat(((t10[j].value / tot) * 100).toFixed(2)) });
          }
        }
      };

      var ctUrl = 'https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=' + m49 + '&partnerCode=0&cmdCode=' + hs4 + '&flowCode=M&period=' + cqY;
      console.log('[TI] ' + ctUrl);
      try {
        var ctR = await fetch(ctUrl, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(20000) });
        if (ctR.ok) {
          var ctJ = await ctR.json();
          var ctRecs = (ctJ && ctJ.data) ? ctJ.data : [];
          console.log('[TI] Comtrade recs=' + ctRecs.length);
          if (ctRecs.length > 0) { doProcess(ctRecs, cqY); }
          else {
            notes.push('No Comtrade for HS' + hs4 + ' y=' + cqY);
            var pY = cqY - 1;
            var rUrl = 'https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=' + m49 + '&partnerCode=0&cmdCode=' + hs4 + '&flowCode=M&period=' + pY;
            var rR = await fetch(rUrl, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(20000) });
            if (rR.ok) { var rJ = await rR.json(); var rRecs = (rJ && rJ.data) ? rJ.data : []; if (rRecs.length > 0) { notes.push('Using year ' + pY); doProcess(rRecs, pY); } }
          }
        }
      } catch (e) { notes.push('Comtrade err: ' + e.message); }
    }
  }

  // FASE 4 — OUTPUT
  return Response.json({
    country: reporterName || countryName,
    country_code_wto: reporterCode,
    country_code_iso2: iso2 || null,
    product: productName || productDescription,
    product_code: productCode,
    years_requested: yearsArray,
    market_size: wtoMarketSize || { value: null, unit: unitR, year: null, source: 'WTO Timeseries API v1', note: 'No data available' },
    trend: wtoTrend,
    cagr: wtoCagr || null,
    top_suppliers: topSuppliers,
    market_share: marketShare,
    comtrade_import_total: ctImportTotal ? { value_usd: ctImportTotal, year: ctYear, source: 'UN Comtrade' } : null,
    unit: unitR,
    frequency: freqR,
    sources: { macro: 'WTO Timeseries API v1', bilateral: ctOk ? 'UN Comtrade' : 'UN Comtrade (no data)' },
    data_availability: { wto_macro: wtoOk, comtrade_bilateral: ctOk },
    notes: notes,
    timestamp: timestamp
  });
});