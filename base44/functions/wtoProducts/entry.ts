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

  const resp = await fetch('https://api.wto.org/timeseries/v1/products', {
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

  let products = Array.isArray(data) ? data.map(p => ({
    product_code: p.code ?? p.productCode ?? null,
    description: p.name ?? p.description ?? null,
    classification: p.productClassification ?? p.classification ?? null
  })) : [];

  // Se l'utente ha fornito un termine di ricerca, filtra per matching sul nome
  if (searchTerm) {
    products = products.filter(p => {
      const desc = (p.description || '').toLowerCase();
      return desc.includes(searchTerm);
    });
  }

  return Response.json({
    success: true,
    count: products.length,
    search: searchTerm || null,
    products
  });
});