import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const endpoint = (body.endpoint || 'indicators').trim().toLowerCase();
  const searchTerm = (body.search || '').trim().toLowerCase();

  console.log('[wtoIndicators] endpoint requested:', endpoint, 'body:', JSON.stringify(body));

  const apiKey = Deno.env.get('WTO_API_KEY') || '';
  if (!apiKey) {
    return Response.json({ error: 'WTO_API_KEY not set' }, { status: 500 });
  }

  const baseUrl = 'https://api.wto.org/timeseries/v1';
  const reqHeaders = {
    'Ocp-Apim-Subscription-Key': apiKey,
    'Accept': 'application/json'
  };

  // === METADATA ===
  if (endpoint === 'metadata') {
    const indicatorCode = (body.indicator_code || '').trim();
    if (!indicatorCode) {
      return Response.json({ error: 'indicator_code required for metadata endpoint' }, { status: 400 });
    }

    // Prova prima /indicators per ottenere info base
    const indResp = await fetch(baseUrl + '/indicators', { headers: reqHeaders, signal: AbortSignal.timeout(20000) });
    if (!indResp.ok) {
      const text = await indResp.text();
      return Response.json({ error: 'WTO indicators HTTP ' + indResp.status, detail: text }, { status: indResp.status });
    }
    const allIndicators = await indResp.json();

    var indicatorMatch = null;
    if (Array.isArray(allIndicators)) {
      indicatorMatch = allIndicators.find(function(item) {
        return (item.code || '').toLowerCase() === indicatorCode.toLowerCase();
      });
    }

    // /metadata?i={indicatorCode}
    var metadataResult = null;
    try {
      const metaResp = await fetch(baseUrl + '/metadata?i=' + encodeURIComponent(indicatorCode), { headers: reqHeaders, signal: AbortSignal.timeout(20000) });
      if (metaResp.ok) {
        metadataResult = await metaResp.json();
      } else {
        metadataResult = { _http_status: metaResp.status, _body: await metaResp.text() };
      }
    } catch (e) {
      metadataResult = { _error: e.message };
    }

    return Response.json({
      success: true,
      endpoint: 'metadata',
      indicator_code: indicatorCode,
      indicator_from_list: indicatorMatch ? {
        code: indicatorMatch.code,
        name: indicatorMatch.name || indicatorMatch.description,
        unit: indicatorMatch.unitCode || indicatorMatch.unit,
        category: indicatorMatch.categoryCode || indicatorMatch.category,
        frequency: indicatorMatch.frequencyCode || indicatorMatch.frequency || null,
        definition: indicatorMatch.definition || indicatorMatch.longDescription || null,
        raw: indicatorMatch
      } : null,
      metadata_raw: metadataResult
    });
  }

  // === DATA_COUNT ===
  if (endpoint === 'data_count') {
    const i = (body.i || body.indicator_code || '').trim();
    const r = (body.r || body.reporter || '').trim();
    const p = body.p !== undefined ? String(body.p).trim() : '0';
    const pc = (body.pc || body.product_code || '').trim();
    const ps = (body.ps || body.years || '').trim();

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

    const resp = await fetch(url, { headers: reqHeaders, signal: AbortSignal.timeout(20000) });
    if (!resp.ok) {
      const text = await resp.text();
      return Response.json({ error: 'WTO API HTTP ' + resp.status, detail: text, url: url }, { status: resp.status });
    }

    const data = await resp.json();
    const count = typeof data === 'number' ? data : (data.count !== undefined ? data.count : data);

    if (count === 0) {
      return Response.json({
        success: true,
        endpoint: 'data_count',
        data_count: 0,
        message: 'Nessun dato disponibile WTO',
        query: { i, r, p, pc, ps }
      });
    }

    return Response.json({
      success: true,
      endpoint: 'data_count',
      data_count: count,
      query: { i, r, p, pc, ps },
      raw: data
    });
  }

  // === YEARS ===
  if (endpoint === 'years') {
    const resp = await fetch(baseUrl + '/years', { headers: reqHeaders, signal: AbortSignal.timeout(20000) });
    if (!resp.ok) {
      const text = await resp.text();
      return Response.json({ error: 'WTO API HTTP ' + resp.status, detail: text }, { status: resp.status });
    }
    const data = await resp.json();
    return Response.json({
      success: true,
      endpoint: 'years',
      count: Array.isArray(data) ? data.length : null,
      years: data
    });
  }

  // === INDICATORS (default) ===
  const resp = await fetch(baseUrl + '/indicators', { headers: reqHeaders, signal: AbortSignal.timeout(20000) });
  if (!resp.ok) {
    const text = await resp.text();
    return Response.json({ error: 'WTO API HTTP ' + resp.status, detail: text }, { status: resp.status });
  }

  const data = await resp.json();

  var indicators = Array.isArray(data) ? data.map(function(i) {
    return {
      indicator_code: i.code || null,
      description: i.name || i.description || null,
      unit: i.unitCode || i.unit || null,
      category: i.categoryCode || i.category || null
    };
  }) : [];

  if (searchTerm) {
    indicators = indicators.filter(function(i) {
      var code = (i.indicator_code || '').toLowerCase();
      var desc = (i.description || '').toLowerCase();
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