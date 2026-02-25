import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const searchTerm = (body.search || '').trim().toLowerCase();

  const apiKey = Deno.env.get('WTO_API_KEY') || '';
  if (!apiKey) {
    return Response.json({ error: 'WTO_API_KEY not set' }, { status: 500 });
  }

  const resp = await fetch('https://api.wto.org/timeseries/v1/indicators', {
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Accept': 'application/json'
    },
    signal: AbortSignal.timeout(20000)
  });

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
    count: indicators.length,
    search: searchTerm || null,
    indicators: indicators
  });
});