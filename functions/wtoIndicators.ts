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