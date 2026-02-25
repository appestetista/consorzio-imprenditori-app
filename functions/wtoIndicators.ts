import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// WTO Timeseries v1 multi-endpoint handler v3 (fresh deploy)
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const endpoint = String(body.endpoint || 'indicators').trim().toLowerCase();

  console.log('[wto v3] ep=' + endpoint);

  const apiKey = Deno.env.get('WTO_API_KEY') || '';
  if (!apiKey) {
    return Response.json({ error: 'WTO_API_KEY not set' }, { status: 500 });
  }

  const BASE = 'https://api.wto.org/timeseries/v1';
  const HEADERS = { 'Ocp-Apim-Subscription-Key': apiKey, 'Accept': 'application/json' };

  // Helper: ensure partner code is 3-digit
  function fixP(val) {
    var s = String(val || '000').trim();
    if (s === '0') return '000';
    return s;
  }

  // ==================== DATA ====================
  if (endpoint === 'data') {
    var i = String(body.i || '').trim();
    var r = String(body.r || '').trim();
    var p = fixP(body.p);
    var pc = String(body.pc || '').trim();
    var ps = String(body.ps || '').trim();

    if (!i) return Response.json({ error: 'i (indicator) required' }, { status: 400 });
    if (!r) return Response.json({ error: 'r (reporter) required' }, { status: 400 });

    var params = new URLSearchParams();
    params.set('i', i);
    params.set('r', r);
    params.set('p', p);
    if (pc) params.set('pc', pc);
    if (ps) params.set('ps', ps);
    params.set('fmt', 'json');
    params.set('mode', 'full');
    params.set('dec', '2');
    params.set('max', '500');
    params.set('head', 'H');
    params.set('lang', '1');

    var url = BASE + '/data?' + params.toString();
    console.log('[wto v3] GET ' + url);

    var resp = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30000) });
    if (!resp.ok) {
      var errText = await resp.text();
      console.log('[wto v3] data error: ' + resp.status + ' ' + errText);
      return Response.json({ error: 'WTO HTTP ' + resp.status, detail: errText, url: url }, { status: resp.status });
    }

    var rawBody = await resp.text();
    console.log('[wto v3] data raw preview: ' + rawBody.substring(0, 500));
    var rawData;
    try { rawData = JSON.parse(rawBody); } catch (_e) {
      return Response.json({ success: false, error: 'JSON parse failed', raw: rawBody.substring(0, 1000) }, { status: 500 });
    }

    // WTO /data may return { Dataset: [...] } or array directly
    var dataArray = null;
    if (Array.isArray(rawData)) {
      dataArray = rawData;
    } else if (rawData && Array.isArray(rawData.Dataset)) {
      dataArray = rawData.Dataset;
    } else if (rawData && typeof rawData === 'object') {
      // Try to find the first array property
      var keys = Object.keys(rawData);
      console.log('[wto v3] response keys: ' + keys.join(', '));
      for (var ki = 0; ki < keys.length; ki++) {
        if (Array.isArray(rawData[keys[ki]])) {
          dataArray = rawData[keys[ki]];
          console.log('[wto v3] using key: ' + keys[ki] + ' (' + dataArray.length + ' items)');
          break;
        }
      }
    }

    if (!dataArray || dataArray.length === 0) {
      return Response.json({
        success: true, endpoint: 'data', records: 0, data: [], metrics: null,
        message: 'Nessun dato disponibile WTO', query: { i: i, r: r, p: p, pc: pc, ps: ps }
      });
    }

    // Log first record keys for debugging
    if (dataArray.length > 0) {
      console.log('[wto v3] first record keys: ' + Object.keys(dataArray[0]).join(', '));
      console.log('[wto v3] first record sample: ' + JSON.stringify(dataArray[0]).substring(0, 500));
    }

    // Parse records — WTO field names: PeriodCode/Period, Value, IndicatorCode, etc.
    var yearlyMap = {};
    var records = [];
    for (var ri = 0; ri < dataArray.length; ri++) {
      var rec = dataArray[ri];
      // Year: WTO uses Year field directly. PeriodCode is "A" (Annual), not the year.
      var yrStr = rec.Year || rec.year || '';
      var yr = parseInt(String(yrStr), 10);
      var val = parseFloat(rec.Value != null ? rec.Value : (rec.value != null ? rec.value : NaN));
      var parsed = {
        year: yr,
        value: isNaN(val) ? null : val,
        indicator: rec.IndicatorCode || rec.Indicator || i,
        reporter_code: rec.ReportingEconomyCode || r,
        reporter_name: rec.ReportingEconomy || null,
        partner_code: rec.PartnerEconomyCode || p,
        partner_name: rec.PartnerEconomy || null,
        product_code: rec.ProductOrSectorCode || pc,
        product_name: rec.ProductOrSector || null,
        unit: rec.Unit || null,
        frequency: rec.FrequencyCode || null
      };
      records.push(parsed);
      if (!isNaN(yr) && parsed.value !== null) {
        if (!yearlyMap[yr] || parsed.value > yearlyMap[yr]) {
          yearlyMap[yr] = parsed.value;
        }
      }
    }

    // Sorted series
    var sortedYears = Object.keys(yearlyMap).map(Number).sort(function(a, b) { return a - b; });
    var serie = sortedYears.map(function(y) { return { year: y, value: yearlyMap[y] }; });

    // === METRICS ===
    var metrics = null;
    if (serie.length > 0) {
      var total = 0;
      for (var si = 0; si < serie.length; si++) total += serie[si].value;

      // YoY growth
      var yoy = [];
      for (var yi = 1; yi < serie.length; yi++) {
        var prevV = serie[yi - 1].value;
        var currV = serie[yi].value;
        var gPct = prevV > 0 ? ((currV - prevV) / prevV * 100) : null;
        yoy.push({
          from_year: serie[yi - 1].year,
          to_year: serie[yi].year,
          from_value: prevV,
          to_value: currV,
          growth_pct: gPct !== null ? parseFloat(gPct.toFixed(2)) : null
        });
      }

      // CAGR
      var cagr = null;
      if (serie.length >= 2) {
        var fVal = serie[0].value;
        var lVal = serie[serie.length - 1].value;
        var nY = serie[serie.length - 1].year - serie[0].year;
        if (fVal > 0 && nY > 0) {
          cagr = parseFloat(((Math.pow(lVal / fVal, 1 / nY) - 1) * 100).toFixed(2));
        }
      }

      // Average annual growth
      var avgG = null;
      var validYoy = yoy.filter(function(x) { return x.growth_pct !== null; });
      if (validYoy.length > 0) {
        var sumG = 0;
        for (var gi = 0; gi < validYoy.length; gi++) sumG += validYoy[gi].growth_pct;
        avgG = parseFloat((sumG / validYoy.length).toFixed(2));
      }

      // Volatility
      var volat = null;
      if (serie.length >= 3) {
        var mean = total / serie.length;
        if (mean > 0) {
          var sumSq = 0;
          for (var vi = 0; vi < serie.length; vi++) sumSq += Math.pow(serie[vi].value - mean, 2);
          volat = parseFloat(((Math.sqrt(sumSq / serie.length) / mean) * 100).toFixed(2));
        }
      }

      metrics = {
        import_totale_cumulato: parseFloat(total.toFixed(2)),
        ultimo_anno: { year: serie[serie.length - 1].year, value: serie[serie.length - 1].value },
        primo_anno: { year: serie[0].year, value: serie[0].value },
        numero_anni: serie.length,
        trend_annuale: yoy,
        crescita_media_annua_pct: avgG,
        cagr_pct: cagr,
        volatilita_pct: volat,
        serie_storica: serie
      };
    }

    console.log('[wto v3] data OK, records=' + records.length + ' metrics=' + (metrics ? 'yes' : 'null'));
    return Response.json({
      success: true, endpoint: 'data', records: records.length,
      data: records, metrics: metrics, query: { i: i, r: r, p: p, pc: pc, ps: ps }
    });
  }

  // ==================== TOP_SUPPLIERS (Ranking fornitori) ====================
  if (endpoint === 'top_suppliers') {
    var tsI = String(body.i || 'ITS_MTV_AM').trim();
    var tsR = String(body.r || '').trim(); // reporter = importing country
    var tsPc = String(body.pc || '').trim(); // product code
    var tsPs = String(body.ps || '').trim(); // period (latest year)

    if (!tsR) return Response.json({ error: 'r (reporter/importing country) required' }, { status: 400 });
    if (!tsPs) return Response.json({ error: 'ps (year) required' }, { status: 400 });

    // Step 1: Get import from World (p=000) to have the total
    var totalParams = new URLSearchParams();
    totalParams.set('i', tsI);
    totalParams.set('r', tsR);
    totalParams.set('p', '000'); // World
    if (tsPc) totalParams.set('pc', tsPc);
    totalParams.set('ps', tsPs);
    totalParams.set('fmt', 'json');
    totalParams.set('mode', 'full');
    totalParams.set('dec', '2');
    totalParams.set('max', '100');
    totalParams.set('head', 'H');
    totalParams.set('lang', '1');

    var totalUrl = BASE + '/data?' + totalParams.toString();
    console.log('[wto v3] top_suppliers total GET ' + totalUrl);

    var totalResp = await fetch(totalUrl, { headers: HEADERS, signal: AbortSignal.timeout(30000) });
    var importTotal = null;
    if (totalResp.ok) {
      var totalRaw = await totalResp.json();
      var totalArr = Array.isArray(totalRaw) ? totalRaw : (totalRaw?.Dataset || []);
      // Find the record for the requested year
      for (var ti = 0; ti < totalArr.length; ti++) {
        var tYear = parseInt(String(totalArr[ti].Year || ''), 10);
        var tVal = parseFloat(totalArr[ti].Value);
        if (!isNaN(tVal) && (String(tYear) === String(tsPs) || totalArr.length === 1)) {
          importTotal = tVal;
          break;
        }
      }
      // If single year requested and no exact match, take first valid
      if (importTotal === null) {
        for (var ti2 = 0; ti2 < totalArr.length; ti2++) {
          var tVal2 = parseFloat(totalArr[ti2].Value);
          if (!isNaN(tVal2)) { importTotal = tVal2; break; }
        }
      }
    }
    console.log('[wto v3] top_suppliers importTotal=' + importTotal);

    // Step 2: Get all partners. WTO does not support p=* wildcard easily,
    // so we use the "reporters" approach — query with specific known top trading partners.
    // Better approach: use the WTO API with a large list of economies.
    // The WTO API supports comma-separated partner codes.
    
    // Fetch list of WTO reporting economies to use as partner codes
    var partnersUrl = BASE + '/reporters';
    var partnersResp = await fetch(partnersUrl, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
    var partnerCodes = [];
    if (partnersResp.ok) {
      var partnersData = await partnersResp.json();
      if (Array.isArray(partnersData)) {
        // Collect all economy codes, exclude "000" (World) and groups
        for (var pi = 0; pi < partnersData.length; pi++) {
          var pCode = String(partnersData[pi].code || '').trim();
          // Skip World, groups (codes starting with letters or > 900 typically)
          if (pCode && pCode !== '000' && pCode !== tsR) {
            partnerCodes.push(pCode);
          }
        }
      }
    }
    console.log('[wto v3] top_suppliers found ' + partnerCodes.length + ' partner codes');

    // Step 3: Query in batches (WTO limits comma-separated params)
    // Split partner codes into batches of 50
    var BATCH_SIZE = 50;
    var allPartnerRecords = [];

    for (var bi = 0; bi < partnerCodes.length; bi += BATCH_SIZE) {
      var batch = partnerCodes.slice(bi, bi + BATCH_SIZE);
      var batchP = batch.join(',');

      var bParams = new URLSearchParams();
      bParams.set('i', tsI);
      bParams.set('r', tsR);
      bParams.set('p', batchP);
      if (tsPc) bParams.set('pc', tsPc);
      bParams.set('ps', tsPs);
      bParams.set('fmt', 'json');
      bParams.set('mode', 'full');
      bParams.set('dec', '2');
      bParams.set('max', '1000');
      bParams.set('head', 'H');
      bParams.set('lang', '1');

      var bUrl = BASE + '/data?' + bParams.toString();
      console.log('[wto v3] top_suppliers batch ' + Math.floor(bi / BATCH_SIZE + 1) + ' GET ' + bUrl.substring(0, 200) + '...');

      var bResp = await fetch(bUrl, { headers: HEADERS, signal: AbortSignal.timeout(30000) });
      if (bResp.ok) {
        var bRaw = await bResp.json();
        var bArr = Array.isArray(bRaw) ? bRaw : (bRaw?.Dataset || []);
        for (var bri = 0; bri < bArr.length; bri++) {
          allPartnerRecords.push(bArr[bri]);
        }
      } else {
        console.log('[wto v3] top_suppliers batch error: ' + bResp.status);
      }
    }

    console.log('[wto v3] top_suppliers total records fetched: ' + allPartnerRecords.length);

    // Step 4: Aggregate by partner — pick latest year value per partner
    var partnerMap = {};
    for (var ari = 0; ari < allPartnerRecords.length; ari++) {
      var arec = allPartnerRecords[ari];
      var aPartnerCode = arec.PartnerEconomyCode || '';
      var aPartnerName = arec.PartnerEconomy || aPartnerCode;
      var aYear = parseInt(String(arec.Year || ''), 10);
      var aVal = parseFloat(arec.Value);

      if (!aPartnerCode || aPartnerCode === '000' || isNaN(aVal)) continue;

      // Keep highest value if multiple records per partner (e.g. different sub-years)
      if (!partnerMap[aPartnerCode] || aVal > partnerMap[aPartnerCode].value) {
        partnerMap[aPartnerCode] = {
          partner_code: aPartnerCode,
          partner_name: aPartnerName,
          value: aVal,
          year: aYear
        };
      }
    }

    // Step 5: Sort by value descending, take top 10
    var sortedPartners = Object.values(partnerMap).sort(function(a, b) { return b.value - a.value; });
    var top10 = sortedPartners.slice(0, 10);

    // Step 6: Calculate market share
    // If importTotal from World query is available, use it; otherwise sum all partners as fallback
    var sumAll = 0;
    for (var si2 = 0; si2 < sortedPartners.length; si2++) sumAll += sortedPartners[si2].value;
    var denominator = importTotal || sumAll;

    var topSuppliers = top10.map(function(s) {
      var share = denominator > 0 ? parseFloat(((s.value / denominator) * 100).toFixed(2)) : null;
      return {
        rank: 0, // will set below
        partner_code: s.partner_code,
        partner_name: s.partner_name,
        import_value: s.value,
        year: s.year,
        market_share_pct: share
      };
    });
    for (var ri2 = 0; ri2 < topSuppliers.length; ri2++) topSuppliers[ri2].rank = ri2 + 1;

    // "Others" aggregation
    var top10Sum = 0;
    for (var ts2 = 0; ts2 < top10.length; ts2++) top10Sum += top10[ts2].value;
    var othersValue = denominator > 0 ? parseFloat((denominator - top10Sum).toFixed(2)) : null;
    var othersShare = denominator > 0 ? parseFloat((((denominator - top10Sum) / denominator) * 100).toFixed(2)) : null;

    return Response.json({
      success: true,
      endpoint: 'top_suppliers',
      reporter_code: tsR,
      product_code: tsPc || null,
      year: tsPs,
      import_total: importTotal,
      import_total_source: importTotal ? 'WTO (World)' : 'sum_partners',
      total_partners_found: sortedPartners.length,
      top_suppliers: topSuppliers,
      others: { value: othersValue, market_share_pct: othersShare },
      unit: top10.length > 0 ? allPartnerRecords[0]?.Unit || null : null,
      query: { i: tsI, r: tsR, pc: tsPc, ps: tsPs }
    });
  }

  // ==================== DATA_COUNT ====================
  if (endpoint === 'data_count') {
    var dci = String(body.i || '').trim();
    var dcr = String(body.r || '').trim();
    var dcp = fixP(body.p);
    var dcpc = String(body.pc || '').trim();
    var dcps = String(body.ps || '').trim();

    if (!dci) return Response.json({ error: 'i required' }, { status: 400 });
    if (!dcr) return Response.json({ error: 'r required' }, { status: 400 });

    var dcParams = new URLSearchParams();
    dcParams.set('i', dci);
    dcParams.set('r', dcr);
    dcParams.set('p', dcp);
    if (dcpc) dcParams.set('pc', dcpc);
    if (dcps) dcParams.set('ps', dcps);

    var dcUrl = BASE + '/data_count?' + dcParams.toString();
    console.log('[wto v3] GET ' + dcUrl);

    var dcResp = await fetch(dcUrl, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
    if (!dcResp.ok) {
      var dcErr = await dcResp.text();
      return Response.json({ error: 'WTO HTTP ' + dcResp.status, detail: dcErr, url: dcUrl }, { status: dcResp.status });
    }

    var dcRaw = await dcResp.text();
    console.log('[wto v3] data_count raw: ' + dcRaw);
    var dcCount = parseInt(dcRaw, 10);
    if (isNaN(dcCount)) dcCount = dcRaw;

    return Response.json({
      success: true, endpoint: 'data_count', data_count: dcCount,
      message: dcCount === 0 ? 'Nessun dato disponibile' : null,
      query: { i: dci, r: dcr, p: dcp, pc: dcpc, ps: dcps }
    });
  }

  // ==================== YEARS ====================
  if (endpoint === 'years') {
    var yrResp = await fetch(BASE + '/years', { headers: HEADERS, signal: AbortSignal.timeout(20000) });
    if (!yrResp.ok) {
      var yrErr = await yrResp.text();
      return Response.json({ error: 'WTO HTTP ' + yrResp.status, detail: yrErr }, { status: yrResp.status });
    }
    var yrData = await yrResp.json();
    return Response.json({ success: true, endpoint: 'years', count: Array.isArray(yrData) ? yrData.length : null, years: yrData });
  }

  // ==================== METADATA ====================
  if (endpoint === 'metadata') {
    var mdCode = String(body.indicator_code || '').trim();
    if (!mdCode) return Response.json({ error: 'indicator_code required' }, { status: 400 });

    var mdResp = await fetch(BASE + '/indicators', { headers: HEADERS, signal: AbortSignal.timeout(20000) });
    if (!mdResp.ok) {
      var mdErr = await mdResp.text();
      return Response.json({ error: 'WTO HTTP ' + mdResp.status, detail: mdErr }, { status: mdResp.status });
    }
    var mdAll = await mdResp.json();
    var mdMatch = null;
    if (Array.isArray(mdAll)) {
      for (var mi = 0; mi < mdAll.length; mi++) {
        if ((mdAll[mi].code || '').toLowerCase() === mdCode.toLowerCase()) { mdMatch = mdAll[mi]; break; }
      }
    }
    return Response.json({
      success: true, endpoint: 'metadata', indicator_code: mdCode,
      indicator_info: mdMatch ? {
        code: mdMatch.code, name: mdMatch.name || mdMatch.description,
        unit: mdMatch.unitCode, category: mdMatch.categoryCode,
        frequency: mdMatch.frequencyCode, startYear: mdMatch.startYear, endYear: mdMatch.endYear,
        numberDatapoints: mdMatch.numberDatapoints, description: mdMatch.description
      } : null
    });
  }

  // ==================== INDICATORS (default) ====================
  var searchTerm = String(body.search || '').trim().toLowerCase();
  var indResp = await fetch(BASE + '/indicators', { headers: HEADERS, signal: AbortSignal.timeout(20000) });
  if (!indResp.ok) {
    var indErr = await indResp.text();
    return Response.json({ error: 'WTO HTTP ' + indResp.status, detail: indErr }, { status: indResp.status });
  }
  var indData = await indResp.json();
  var indicators = [];
  if (Array.isArray(indData)) {
    for (var ii = 0; ii < indData.length; ii++) {
      var x = indData[ii];
      var item = {
        indicator_code: x.code || null,
        description: x.name || x.description || null,
        unit: x.unitCode || null,
        category: x.categoryCode || null
      };
      if (!searchTerm || (item.indicator_code || '').toLowerCase().includes(searchTerm) || (item.description || '').toLowerCase().includes(searchTerm)) {
        indicators.push(item);
      }
    }
  }

  return Response.json({ success: true, endpoint: 'indicators', count: indicators.length, search: searchTerm || null, indicators: indicators });
});