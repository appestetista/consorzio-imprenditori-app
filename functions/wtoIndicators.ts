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

  const apiKey = Deno.env.get('WTO_API_KEY') || '';
  if (!apiKey) {
    return Response.json({ error: 'WTO_API_KEY not set' }, { status: 500 });
  }

  const baseUrl = 'https://api.wto.org/timeseries/v1';
  const headers = {
    'Ocp-Apim-Subscription-Key': apiKey,
    'Accept': 'application/json'
  };

  // Endpoint: /metadata (per indicatore specifico)
  if (endpoint === 'metadata') {
    const indicatorCode = (body.indicator_code || '').trim();
    if (!indicatorCode) {
      return Response.json({ error: 'indicator_code required for metadata endpoint' }, { status: 400 });
    }
    const resp = await fetch(`${baseUrl}/metadata`, { headers, signal: AbortSignal.timeout(20000) });
    if (!resp.ok) {
      const text = await resp.text();
      return Response.json({ error: `WTO API HTTP ${resp.status}`, detail: text }, { status: resp.status });
    }
    const data = await resp.json();
    // Cerca l'indicatore richiesto nei metadata
    let match = null;
    if (Array.isArray(data)) {
      match = data.find(function(m) {
        return (m.code || '').toLowerCase() === indicatorCode.toLowerCase() ||
               (m.indicatorCode || '').toLowerCase() === indicatorCode.toLowerCase();
      });
    }
    return Response.json({
      success: true,
      endpoint: 'metadata',
      indicator_code: indicatorCode,
      match: match || null,
      raw_sample: Array.isArray(data) ? data.slice(0, 3) : data,
      raw_type: typeof data,
      raw_is_array: Array.isArray(data),
      raw_length: Array.isArray(data) ? data.length : null
    });
  }

  // Endpoint: /years
  if (endpoint === 'years') {
    const resp = await fetch(`${baseUrl}/years`, { headers, signal: AbortSignal.timeout(20000) });
    if (!resp.ok) {
      const text = await resp.text();
      return Response.json({ error: `WTO API HTTP ${resp.status}`, detail: text }, { status: resp.status });
    }
    const data = await resp.json();
    return Response.json({
      success: true,
      endpoint: 'years',
      count: Array.isArray(data) ? data.length : null,
      years: data
    });
  }

  // Endpoint: /indicators (default)
  const resp = await fetch(`${baseUrl}/indicators`, { headers, signal: AbortSignal.timeout(20000) });
  if (!resp.ok) {
    const text = await resp.text();
    return Response.json({ error: `WTO API HTTP ${resp.status}`, detail: text }, { status: resp.status });
  }

  const data = await resp.json();

  let indicators = Array.isArray(data) ? data.map(function(i) {
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