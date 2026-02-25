import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const endpoint = String(body.endpoint || 'indicators').trim().toLowerCase();
  const searchTerm = String(body.search || '').trim().toLowerCase();

  console.log('[wtoIndicators] endpoint:', endpoint, 'body:', JSON.stringify(body));

  const apiKey = Deno.env.get('WTO_API_KEY') || '';
  if (!apiKey) {
    return Response.json({ error: 'WTO_API_KEY not set' }, { status: 500 });
  }

  const baseUrl = 'https://api.wto.org/timeseries/v1';
  const apiHeaders = {
    'Ocp-Apim-Subscription-Key': apiKey,
    'Accept': 'application/json'
  };

  // ========================
  // ENDPOINT: data_count
  // ========================
  if (endpoint === 'data_count') {
    const i = String(body.i || body.indicator_code || '').trim();
    const r = String(body.r || body.reporter || '').trim();
    const p = body.p !== undefined ? String(body.p).trim() : '0';
    const pc = String(body.pc || body.product_code || '').trim();
    const ps = String(body.ps || body.years || '').trim();

    if (!i) {
      return Response.json({ error: 'i (indicator_code) is required' }, { status: 400 });
    }
    if (!r) {
      return Response.json({ error: 'r (reporter country code) is required' }, { status: 400 });
    }

    const params = new URLSearchParams();
    params.set('i', i);
    params.set('r', r);
    params.set('p', p);
    if (pc) params.set('pc', pc);
    if (ps) params.set('ps', ps);

    const url = baseUrl + '/data_count?' + params.toString();
    console.log('[wtoIndicators] data_count URL:', url);

    const resp = await fetch(url, { headers: apiHeaders, signal: AbortSignal.timeout(20000) });
    if (!resp.ok) {
      const text = await resp.text();
      return Response.json({ error: 'WTO API HTTP ' + resp.status, detail: text, url: url }, { status: resp.status });
    }

    const raw = await resp.text();
    console.log('[wtoIndicators] data_count raw response:', raw);

    var count = null;
    try {
      var parsed = JSON.parse(raw);
      if (typeof parsed === 'number') {
        count = parsed;
      } else if (parsed && typeof parsed.count === 'number') {
        count = parsed.count;
      } else if (parsed && typeof parsed.DataCount === 'number') {
        count = parsed.DataCount;
      } else {
        count = parsed;
      }
    } catch (e) {
      var num = parseInt(raw, 10);
      count = isNaN(num) ? raw : num;
    }

    if (count === 0) {
      return Response.json({
        success: true,
        endpoint: 'data_count',
        data_count: 0,
        message: 'Nessun dato disponibile WTO',
        query: { i: i, r: r, p: p, pc: pc, ps: ps }
      });
    }

    return Response.json({
      success: true,
      endpoint: 'data_count',
      data_count: count,
      query: { i: i, r: r, p: p, pc: pc, ps: ps }
    });
  }

  // ========================
  // ENDPOINT: metadata
  // ========================
  if (endpoint === 'metadata') {
    var indicatorCode = String(body.indicator_code || '').trim();
    if (!indicatorCode) {
      return Response.json({ error: 'indicator_code required for metadata endpoint' }, { status: 400 });
    }

    var indResp = await fetch(baseUrl + '/indicators', { headers: apiHeaders, signal: AbortSignal.timeout(20000) });
    if (!indResp.ok) {
      var text = await indResp.text();
      return Response.json({ error: 'WTO indicators HTTP ' + indResp.status, detail: text }, { status: indResp.status });
    }
    var allIndicators = await indResp.json();

    var indicatorMatch = null;
    if (Array.isArray(allIndicators)) {
      indicatorMatch = allIndicators.find(function(item) {
        return (item.code || '').toLowerCase() === indicatorCode.toLowerCase();
      });
    }

    return Response.json({
      success: true,
      endpoint: 'metadata',
      indicator_code: indicatorCode,
      indicator_info: indicatorMatch ? {
        code: indicatorMatch.code,
        name: indicatorMatch.name || indicatorMatch.description,
        unit: indicatorMatch.unitCode || indicatorMatch.unit,
        unitLabel: indicatorMatch.unitLabel,
        category: indicatorMatch.categoryCode || indicatorMatch.category,
        categoryLabel: indicatorMatch.categoryLabel,
        subcategory: indicatorMatch.subcategoryCode,
        subcategoryLabel: indicatorMatch.subcategoryLabel,
        frequency: indicatorMatch.frequencyCode || indicatorMatch.frequency,
        frequencyLabel: indicatorMatch.frequencyLabel,
        startYear: indicatorMatch.startYear,
        endYear: indicatorMatch.endYear,
        numberReporters: indicatorMatch.numberReporters,
        numberDatapoints: indicatorMatch.numberDatapoints,
        productClassification: indicatorMatch.productSectorClassificationLabel,
        updateFrequency: indicatorMatch.updateFrequency,
        description: indicatorMatch.description
      } : null
    });
  }

  // ========================
  // ENDPOINT: years
  // ========================
  if (endpoint === 'years') {
    var resp = await fetch(baseUrl + '/years', { headers: apiHeaders, signal: AbortSignal.timeout(20000) });
    if (!resp.ok) {
      var text = await resp.text();
      return Response.json({ error: 'WTO API HTTP ' + resp.status, detail: text }, { status: resp.status });
    }
    var data = await resp.json();
    return Response.json({
      success: true,
      endpoint: 'years',
      count: Array.isArray(data) ? data.length : null,
      years: data
    });
  }

  // ========================
  // ENDPOINT: indicators (default)
  // ========================
  var resp2 = await fetch(baseUrl + '/indicators', { headers: apiHeaders, signal: AbortSignal.timeout(20000) });
  if (!resp2.ok) {
    var text2 = await resp2.text();
    return Response.json({ error: 'WTO API HTTP ' + resp2.status, detail: text2 }, { status: resp2.status });
  }

  var data2 = await resp2.json();

  var indicators = Array.isArray(data2) ? data2.map(function(item) {
    return {
      indicator_code: item.code || null,
      description: item.name || item.description || null,
      unit: item.unitCode || item.unit || null,
      category: item.categoryCode || item.category || null
    };
  }) : [];

  if (searchTerm) {
    indicators = indicators.filter(function(item) {
      var code = (item.indicator_code || '').toLowerCase();
      var desc = (item.description || '').toLowerCase();
      return code.includes(searchTerm) || desc.includes(searchTerm);
    });
  }

  return Response.json({
    success: true,
    endpoint: 'indicators',
    count: indicators.length,
    search: searchTerm || null,
    indicators: indicators
  });
});