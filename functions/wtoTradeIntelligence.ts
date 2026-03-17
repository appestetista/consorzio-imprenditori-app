import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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

// ===== CACHE HELPERS =====

function buildCacheKey(reporterCode, hsCode, year, sourceType) {
  return reporterCode + '_' + hsCode + '_' + year + '_' + sourceType;
}

function computeTTLDays(year) {
  var currentYear = new Date().getFullYear();
  var y = parseInt(year, 10);
  if (y < currentYear - 1) return 90;
  if (y === currentYear - 1) return 30;
  return 7; // current year
}

function computeExpiresAt(year) {
  var ttlDays = computeTTLDays(year);
  var d = new Date();
  d.setDate(d.getDate() + ttlDays);
  return d.toISOString();
}

async function getCacheRecord(base44, cacheKey) {
  var records = await base44.asServiceRole.entities.TradeCache.filter({ cache_key: cacheKey }, '-created_at', 1);
  if (records && records.length > 0) return records[0];
  return null;
}

async function setCacheRecord(base44, cacheKey, reporterCode, hsCode, year, sourceType, responseJson) {
  // Delete old record with same key if exists
  var existing = await getCacheRecord(base44, cacheKey);
  if (existing) {
    await base44.asServiceRole.entities.TradeCache.update(existing.id, {
      response_json: responseJson,
      created_at: new Date().toISOString(),
      expires_at: computeExpiresAt(year),
      hit_count: 0
    });
  } else {
    await base44.asServiceRole.entities.TradeCache.create({
      cache_key: cacheKey,
      reporter_code: reporterCode,
      hs_code: hsCode,
      year: String(year),
      response_json: responseJson,
      source_type: sourceType,
      created_at: new Date().toISOString(),
      expires_at: computeExpiresAt(year),
      hit_count: 0
    });
  }
}

async function incrementHit(base44, record) {
  await base44.asServiceRole.entities.TradeCache.update(record.id, {
    hit_count: (record.hit_count || 0) + 1,
    last_hit_at: new Date().toISOString()
  });
}

// ===== METRICS HELPERS =====

async function getOrCreateTodayMetrics(base44) {
  var today = new Date().toISOString().substring(0, 10);
  var records = await base44.asServiceRole.entities.TradeCacheMetrics.filter({ date: today }, '-created_date', 1);
  if (records && records.length > 0) return records[0];
  var created = await base44.asServiceRole.entities.TradeCacheMetrics.create({
    date: today, cache_hits: 0, cache_misses: 0, api_calls_wto: 0, api_calls_comtrade: 0, stale_cache_served: 0, hit_rate_pct: 0
  });
  return created;
}

async function trackMetric(base44, field, increment) {
  var m = await getOrCreateTodayMetrics(base44);
  var update = {};
  update[field] = (m[field] || 0) + (increment || 1);
  // Recalc hit rate
  var hits = field === 'cache_hits' ? update[field] : (m.cache_hits || 0);
  var misses = field === 'cache_misses' ? update[field] : (m.cache_misses || 0);
  var total = hits + misses;
  update.hit_rate_pct = total > 0 ? parseFloat(((hits / total) * 100).toFixed(1)) : 0;
  await base44.asServiceRole.entities.TradeCacheMetrics.update(m.id, update);
}

// ===== MAIN HANDLER =====

Deno.serve(async (req) => {
  var base44 = createClientFromRequest(req);
  var user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  var payload = await req.json().catch(function() { return {}; });
  var countryName = payload.country_name || '';
  var productDescription = payload.product_description || '';
  var yearsRange = payload.years_range || '';
  var skipCache = payload.skip_cache || false;

  if (!countryName || !productDescription) {
    return Response.json({ error: 'country_name and product_description required' }, { status: 400 });
  }

  var apiKey = Deno.env.get('WTO_API_KEY') || '';
  if (!apiKey) return Response.json({ error: 'WTO_API_KEY not set' }, { status: 500 });

  var HEADERS = { 'Ocp-Apim-Subscription-Key': apiKey, 'Accept': 'application/json' };
  var notes = [];
  var timestamp = new Date().toISOString();
  var now = new Date();

  // FASE 1 — Normalizzazione (reporters + products always fetched, lightweight)
  console.log('[TI] F1 country=' + countryName + ' product=' + productDescription);

  var reporterCode = null;
  var reporterName = null;
  var rResp = await fetch(WTO_BASE + '/reporters', { headers: HEADERS, signal: AbortSignal.timeout(15000) });
  if (rResp.ok) {
    var reporters = await rResp.json();
    if (Array.isArray(reporters)) {
      var sL = countryName.toLowerCase().trim();
      for (var ri = 0; ri < reporters.length; ri++) {
        if ((reporters[ri].name || '').toLowerCase() === sL) { reporterCode = String(reporters[ri].code); reporterName = reporters[ri].name; break; }
      }
      if (!reporterCode) {
        for (var ri3 = 0; ri3 < reporters.length; ri3++) {
          if (String(reporters[ri3].code) === countryName.trim()) { reporterCode = String(reporters[ri3].code); reporterName = reporters[ri3].name; break; }
        }
      }
      if (!reporterCode) {
        var candidates = [];
        for (var ri2 = 0; ri2 < reporters.length; ri2++) {
          var rName = (reporters[ri2].name || '').toLowerCase();
          if (rName.indexOf(sL) >= 0) candidates.push(reporters[ri2]);
        }
        candidates.sort(function(a, b) { return (a.name || '').length - (b.name || '').length; });
        if (candidates.length > 0) { reporterCode = String(candidates[0].code); reporterName = candidates[0].name; }
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

  // Detect HS product
  var cleanPCForWto = String(productCode).replace(/\D/g, '');
  var isHSProduct = /^\d{2,6}$/.test(cleanPCForWto);
  var iso2 = WTO_TO_ISO2[reporterCode] || null;
  var m49 = iso2 ? ISO2_TO_M49[iso2] : null;

  // ===== FASE 2 — CACHE LAYER =====
  // Build aggregated key for the full request
  var aggYear = yearsArray.join(',');
  var aggKey = buildCacheKey(reporterCode, productCode, aggYear, 'AGGREGATED');

  // Check aggregated cache first
  if (!skipCache) {
    var aggCached = await getCacheRecord(base44, aggKey);
    if (aggCached && new Date(aggCached.expires_at) > now) {
      console.log('[TI] AGGREGATED cache HIT: ' + aggKey);
      await incrementHit(base44, aggCached);
      await trackMetric(base44, 'cache_hits', 1);
      var cachedResponse = aggCached.response_json;
      cachedResponse.data_origin = 'cache';
      cachedResponse.cache_expiration = aggCached.expires_at;
      return Response.json(cachedResponse);
    }
  }

  // Check per-source caches
  var wtoFromCache = false;
  var comtradeFromCache = false;
  var wtoCacheData = null;
  var comtradeCacheData = null;

  if (!skipCache) {
    // WTO cache (per year range)
    var wtoKey = buildCacheKey(reporterCode, productCode, aggYear, 'WTO');
    var wtoCached = await getCacheRecord(base44, wtoKey);
    if (wtoCached && new Date(wtoCached.expires_at) > now) {
      console.log('[TI] WTO cache HIT');
      wtoFromCache = true;
      wtoCacheData = wtoCached.response_json;
      await incrementHit(base44, wtoCached);
    }

    // COMTRADE cache
    var ctCacheYear = String(yearsArray[yearsArray.length - 1]);
    var ctKey = buildCacheKey(reporterCode, productCode, ctCacheYear, 'COMTRADE');
    var ctCached = await getCacheRecord(base44, ctKey);
    if (ctCached && new Date(ctCached.expires_at) > now) {
      console.log('[TI] COMTRADE cache HIT');
      comtradeFromCache = true;
      comtradeCacheData = ctCached.response_json;
      await incrementHit(base44, ctCached);
    }
  }

  // If both cached, aggregate directly without API calls
  if (wtoFromCache && comtradeFromCache) {
    console.log('[TI] Both sources cached, aggregating');
    await trackMetric(base44, 'cache_hits', 1);
    var result = buildAggregatedResponse(wtoCacheData, comtradeCacheData, reporterName, countryName, reporterCode, iso2, productName, productDescription, productCode, yearsArray, notes, timestamp);
    result.data_origin = 'cache';
    result.cache_expiration = computeExpiresAt(String(yearsArray[yearsArray.length - 1]));
    // Save aggregated cache
    await setCacheRecord(base44, aggKey, reporterCode, productCode, aggYear, 'AGGREGATED', result);
    return Response.json(result);
  }

  await trackMetric(base44, 'cache_misses', 1);

  // ===== FASE 3 — WTO MACRO (only if not cached) =====
  var wtoResult = null;
  if (wtoFromCache) {
    wtoResult = wtoCacheData;
    console.log('[TI] Using WTO from cache');
  } else {
    console.log('[TI] F2 WTO macro — LIVE');
    wtoResult = { ok: false, trend: [], marketSize: null, cagr: null, unit: null, freq: null };

    if (isHSProduct) {
      notes.push('WTO ITS_MTV_AM does not support HS codes (only product groups like AG, TO, MA). WTO macro data skipped for HS ' + productCode + '.');
      console.log('[TI] HS product detected, skipping WTO macro');
    } else {
      await trackMetric(base44, 'api_calls_wto', 1);
      var dataCount = 0;
      var dcP = new URLSearchParams();
      dcP.set('i', 'ITS_MTV_AM'); dcP.set('r', reporterCode); dcP.set('p', '000');
      dcP.set('pc', productCode); dcP.set('ps', yearsParam);
      try {
        var dcResp = await fetch(WTO_BASE + '/data_count?' + dcP.toString(), { headers: HEADERS, signal: AbortSignal.timeout(20000) });
        if (dcResp.ok) { var dcRaw = await dcResp.text(); dataCount = parseInt(dcRaw, 10) || 0; }
        console.log('[TI] data_count=' + dataCount);
      } catch (e) {
        console.log('[TI] WTO data_count error: ' + e.message);
      }

      if (dataCount === 0) {
        notes.push('WTO: no data for ITS_MTV_AM p=World');
      } else {
        await trackMetric(base44, 'api_calls_wto', 1);
        var dP = new URLSearchParams();
        dP.set('i', 'ITS_MTV_AM'); dP.set('r', reporterCode); dP.set('p', '000');
        dP.set('pc', productCode); dP.set('ps', yearsParam);
        dP.set('fmt', 'json'); dP.set('mode', 'full'); dP.set('dec', '2');
        dP.set('max', '500'); dP.set('head', 'H'); dP.set('lang', '1');
        try {
          var dResp = await fetch(WTO_BASE + '/data?' + dP.toString(), { headers: HEADERS, signal: AbortSignal.timeout(30000) });
          if (dResp.ok) {
            var rawBody = await dResp.text();
            var rawData = null;
            try { rawData = JSON.parse(rawBody); } catch (_) {}
            if (rawData) {
              var arr = null;
              if (Array.isArray(rawData)) arr = rawData;
              else if (rawData.Dataset) arr = rawData.Dataset;
              else { var ks = Object.keys(rawData); for (var ki = 0; ki < ks.length; ki++) { if (Array.isArray(rawData[ks[ki]])) { arr = rawData[ks[ki]]; break; } } }
              if (arr && arr.length > 0) {
                wtoResult.ok = true;
                var ym = {};
                for (var ai = 0; ai < arr.length; ai++) {
                  var yr = parseInt(String(arr[ai].Year || ''), 10);
                  var vl = parseFloat(arr[ai].Value);
                  if (!isNaN(yr) && !isNaN(vl) && vl >= 0) ym[yr] = vl;
                  if (!wtoResult.unit && arr[ai].Unit) wtoResult.unit = arr[ai].Unit;
                  if (!wtoResult.freq && arr[ai].Frequency) wtoResult.freq = arr[ai].Frequency;
                }
                var sk = Object.keys(ym).map(Number).sort(function(a, b) { return a - b; });
                for (var si = 0; si < sk.length; si++) {
                  wtoResult.trend.push({ year: sk[si], value: ym[sk[si]], unit: wtoResult.unit || 'Million US dollar', source: 'WTO Timeseries API v1' });
                }
                if (wtoResult.trend.length > 0) {
                  var lt = wtoResult.trend[wtoResult.trend.length - 1];
                  wtoResult.marketSize = { value: lt.value, unit: wtoResult.unit || 'Million US dollar', year: lt.year, source: 'WTO Timeseries API v1' };
                }
                if (wtoResult.trend.length >= 2) {
                  var ft = wtoResult.trend[0]; var lt2 = wtoResult.trend[wtoResult.trend.length - 1];
                  var n = lt2.year - ft.year;
                  if (ft.value > 0 && n > 0) wtoResult.cagr = parseFloat(((Math.pow(lt2.value / ft.value, 1 / n) - 1) * 100).toFixed(2)) + '%';
                }
              }
            }
          }
        } catch (wtoErr) {
          console.log('[TI] WTO API error: ' + wtoErr.message);
          // Fallback: check stale cache
          var wtoKeyStale = buildCacheKey(reporterCode, productCode, aggYear, 'WTO');
          var staleCached = await getCacheRecord(base44, wtoKeyStale);
          if (staleCached) {
            console.log('[TI] WTO API failed, serving stale cache');
            wtoResult = staleCached.response_json;
            wtoFromCache = true;
            notes.push('WTO data from stale cache — API unavailable');
            await trackMetric(base44, 'stale_cache_served', 1);
          } else {
            notes.push('WTO API unavailable, no cache available');
          }
        }
      }
    }

    // Save WTO cache
    if (!wtoFromCache) {
      var wtoSaveKey = buildCacheKey(reporterCode, productCode, aggYear, 'WTO');
      await setCacheRecord(base44, wtoSaveKey, reporterCode, productCode, aggYear, 'WTO', wtoResult);
    }
  }

  // ===== FASE 4 — COMTRADE (only if not cached) =====
  var comtradeResult = null;
  if (comtradeFromCache) {
    comtradeResult = comtradeCacheData;
    console.log('[TI] Using COMTRADE from cache');
  } else {
    console.log('[TI] F3 Comtrade — LIVE');
    comtradeResult = { ok: false, topSuppliers: [], marketShare: [], importTotal: null, year: null };

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
            comtradeResult.ok = true;
            comtradeResult.importTotal = Math.round(tot);
            comtradeResult.year = year;
            var srt = Object.values(byP).sort(function(a, b) { return b.value - a.value; });
            var t10 = srt.slice(0, 10);
            for (var j = 0; j < t10.length; j++) {
              comtradeResult.topSuppliers.push({ rank: j + 1, partner_name: t10[j].name, import_value_usd: Math.round(t10[j].value), market_share_pct: parseFloat(((t10[j].value / tot) * 100).toFixed(2)), source: 'UN Comtrade' });
              comtradeResult.marketShare.push({ partner_name: t10[j].name, share_pct: parseFloat(((t10[j].value / tot) * 100).toFixed(2)) });
            }
          }
        };

        await trackMetric(base44, 'api_calls_comtrade', 1);
        var ctUrl = 'https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=' + m49 + '&cmdCode=' + hs4 + '&flowCode=M&period=' + cqY;
        console.log('[TI] ' + ctUrl);
        try {
          var ctR = await fetch(ctUrl, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(20000) });
          if (ctR.ok) {
            var ctJ = await ctR.json();
            var ctRecs = (ctJ && ctJ.data) ? ctJ.data : [];
            console.log('[TI] Comtrade recs=' + ctRecs.length);
            if (ctRecs.length > 1) { doProcess(ctRecs, cqY); }
            else {
              notes.push('No Comtrade bilateral for HS' + hs4 + ' y=' + cqY);
              await trackMetric(base44, 'api_calls_comtrade', 1);
              var pY = cqY - 1;
              var rUrl = 'https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=' + m49 + '&cmdCode=' + hs4 + '&flowCode=M&period=' + pY;
              var rR = await fetch(rUrl, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(20000) });
              if (rR.ok) {
                var rJ = await rR.json();
                var rRecs = (rJ && rJ.data) ? rJ.data : [];
                if (rRecs.length > 1) { notes.push('Using year ' + pY); doProcess(rRecs, pY); }
              }
            }
          }
        } catch (ctErr) {
          console.log('[TI] Comtrade API error: ' + ctErr.message);
          // Fallback: stale cache
          var ctKeyStale = buildCacheKey(reporterCode, productCode, String(cqY), 'COMTRADE');
          var ctStaleCached = await getCacheRecord(base44, ctKeyStale);
          if (ctStaleCached) {
            console.log('[TI] Comtrade API failed, serving stale cache');
            comtradeResult = ctStaleCached.response_json;
            comtradeFromCache = true;
            notes.push('Comtrade data from stale cache — API unavailable');
            await trackMetric(base44, 'stale_cache_served', 1);
          } else {
            notes.push('Comtrade API unavailable, no cache available');
          }
        }

        // Save COMTRADE cache
        if (!comtradeFromCache) {
          var ctSaveKey = buildCacheKey(reporterCode, productCode, String(comtradeResult.year || cqY), 'COMTRADE');
          await setCacheRecord(base44, ctSaveKey, reporterCode, productCode, String(comtradeResult.year || cqY), 'COMTRADE', comtradeResult);
        }
      }
    }
  }

  // ===== FASE 5 — BUILD & CACHE AGGREGATED =====
  var dataOrigin = 'live';
  if (wtoFromCache && comtradeFromCache) dataOrigin = 'cache';
  else if (wtoFromCache || comtradeFromCache) dataOrigin = 'partial_cache';

  // Check stale flags
  var isStale = false;
  for (var ni = 0; ni < notes.length; ni++) {
    if (notes[ni].indexOf('stale cache') >= 0) { isStale = true; break; }
  }
  if (isStale) dataOrigin = 'stale_cache';

  var finalResult = buildAggregatedResponse(wtoResult, comtradeResult, reporterName, countryName, reporterCode, iso2, productName, productDescription, productCode, yearsArray, notes, timestamp);
  finalResult.data_origin = dataOrigin;
  finalResult.cache_expiration = computeExpiresAt(String(yearsArray[yearsArray.length - 1]));

  if (isStale) {
    finalResult.warning = 'External API unavailable, data served from stale cache';
  }

  // Save aggregated cache
  await setCacheRecord(base44, aggKey, reporterCode, productCode, aggYear, 'AGGREGATED', finalResult);

  return Response.json(finalResult);
});

// ===== BUILD AGGREGATED RESPONSE =====

function buildAggregatedResponse(wtoResult, comtradeResult, reporterName, countryName, reporterCode, iso2, productName, productDescription, productCode, yearsArray, notes, timestamp) {
  var wto = wtoResult || { ok: false, trend: [], marketSize: null, cagr: null, unit: null, freq: null };
  var ct = comtradeResult || { ok: false, topSuppliers: [], marketShare: [], importTotal: null, year: null };

  var uMap = { 'USM': 'Million US dollar', 'USD': 'US dollar', 'PCT': 'Percentage' };
  var unitR = uMap[wto.unit] || wto.unit || 'Million US dollar';
  var fMap = { 'A': 'Annual', 'Q': 'Quarterly', 'M': 'Monthly' };
  var freqR = fMap[wto.freq] || wto.freq || 'Annual';

  return {
    country: reporterName || countryName,
    country_code_wto: reporterCode,
    country_code_iso2: iso2 || null,
    product: productName || productDescription,
    product_code: productCode,
    years_requested: yearsArray,
    market_size: wto.marketSize || { value: null, unit: unitR, year: null, source: 'WTO Timeseries API v1', note: 'No data available' },
    trend: wto.trend || [],
    cagr: wto.cagr || null,
    top_suppliers: ct.topSuppliers || [],
    market_share: ct.marketShare || [],
    comtrade_import_total: ct.importTotal ? { value_usd: ct.importTotal, year: ct.year, source: 'UN Comtrade' } : null,
    unit: unitR,
    frequency: freqR,
    sources: { macro: 'WTO Timeseries API v1', bilateral: ct.ok ? 'UN Comtrade' : 'UN Comtrade (no data)' },
    data_availability: { wto_macro: wto.ok || false, comtrade_bilateral: ct.ok || false },
    notes: notes,
    timestamp: timestamp
  };
}