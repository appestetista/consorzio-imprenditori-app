import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// WTO Timeseries v1 multi-endpoint handler v2
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const endpoint = String(body.endpoint || 'indicators').trim().toLowerCase();
  const searchTerm = String(body.search || '').trim().toLowerCase();

  console.log('[wtoInd v2] endpoint=' + endpoint + ' body=' + JSON.stringify(body));

  const apiKey = Deno.env.get('WTO_API_KEY') || '';
  if (!apiKey) {
    return Response.json({ error: 'WTO_API_KEY not set' }, { status: 500 });
  }

  const BASE = 'https://api.wto.org/timeseries/v1';
  const H = {
    'Ocp-Apim-Subscription-Key': apiKey,
    'Accept': 'application/json'
  };

  // ========== data_count ==========
  if (endpoint === 'data_count') {
    var dc_i = String(body.i || body.indicator_code || '').trim();
    var dc_r = String(body.r || body.reporter || '').trim();
    var dc_p = body.p !== undefined ? String(body.p).trim() : '0';
    var dc_pc = String(body.pc || body.product_code || '').trim();
    var dc_ps = String(body.ps || body.years || '').trim();

    if (!dc_i) return Response.json({ error: 'i (indicator) required' }, { status: 400 });
    if (!dc_r) return Response.json({ error: 'r (reporter) required' }, { status: 400 });

    var qp = new URLSearchParams();
    qp.set('i', dc_i);
    qp.set('r', dc_r);
    qp.set('p', dc_p);
    if (dc_pc) qp.set('pc', dc_pc);
    if (dc_ps) qp.set('ps', dc_ps);

    var dcUrl = BASE + '/data_count?' + qp.toString();
    console.log('[wtoInd v2] fetching: ' + dcUrl);

    var dcResp = await fetch(dcUrl, { headers: H, signal: AbortSignal.timeout(20000) });
    if (!dcResp.ok) {
      var dcErr = await dcResp.text();
      return Response.json({ error: 'WTO HTTP ' + dcResp.status, detail: dcErr, url: dcUrl }, { status: dcResp.status });
    }

    var dcRaw = await dcResp.text();
    console.log('[wtoInd v2] data_count raw: ' + dcRaw);

    var dcCount = null;
    try {
      var dcParsed = JSON.parse(dcRaw);
      if (typeof dcParsed === 'number') dcCount = dcParsed;
      else if (dcParsed && typeof dcParsed.count === 'number') dcCount = dcParsed.count;
      else if (dcParsed && typeof dcParsed.DataCount === 'number') dcCount = dcParsed.DataCount;
      else dcCount = dcParsed;
    } catch (_e) {
      var dcNum = parseInt(dcRaw, 10);
      dcCount = isNaN(dcNum) ? dcRaw : dcNum;
    }

    if (dcCount === 0) {
      return Response.json({
        success: true,
        endpoint: 'data_count',
        data_count: 0,
        message: 'Nessun dato disponibile WTO',
        query: { i: dc_i, r: dc_r, p: dc_p, pc: dc_pc, ps: dc_ps }
      });
    }

    return Response.json({
      success: true,
      endpoint: 'data_count',
      data_count: dcCount,
      query: { i: dc_i, r: dc_r, p: dc_p, pc: dc_pc, ps: dc_ps }
    });
  }

  // ========== metadata ==========
  if (endpoint === 'metadata') {
    var mdCode = String(body.indicator_code || '').trim();
    if (!mdCode) return Response.json({ error: 'indicator_code required' }, { status: 400 });

    var mdResp = await fetch(BASE + '/indicators', { headers: H, signal: AbortSignal.timeout(20000) });
    if (!mdResp.ok) {
      var mdErr = await mdResp.text();
      return Response.json({ error: 'WTO HTTP ' + mdResp.status, detail: mdErr }, { status: mdResp.status });
    }
    var mdAll = await mdResp.json();
    var mdMatch = null;
    if (Array.isArray(mdAll)) {
      mdMatch = mdAll.find(function(x) {
        return (x.code || '').toLowerCase() === mdCode.toLowerCase();
      });
    }

    return Response.json({
      success: true,
      endpoint: 'metadata',
      indicator_code: mdCode,
      indicator_info: mdMatch ? {
        code: mdMatch.code,
        name: mdMatch.name || mdMatch.description,
        unit: mdMatch.unitCode,
        unitLabel: mdMatch.unitLabel,
        category: mdMatch.categoryCode,
        categoryLabel: mdMatch.categoryLabel,
        subcategory: mdMatch.subcategoryCode,
        subcategoryLabel: mdMatch.subcategoryLabel,
        frequency: mdMatch.frequencyCode,
        frequencyLabel: mdMatch.frequencyLabel,
        startYear: mdMatch.startYear,
        endYear: mdMatch.endYear,
        numberReporters: mdMatch.numberReporters,
        numberDatapoints: mdMatch.numberDatapoints,
        productClassification: mdMatch.productSectorClassificationLabel,
        updateFrequency: mdMatch.updateFrequency,
        description: mdMatch.description
      } : null
    });
  }

  // ========== years ==========
  if (endpoint === 'years') {
    var yrResp = await fetch(BASE + '/years', { headers: H, signal: AbortSignal.timeout(20000) });
    if (!yrResp.ok) {
      var yrErr = await yrResp.text();
      return Response.json({ error: 'WTO HTTP ' + yrResp.status, detail: yrErr }, { status: yrResp.status });
    }
    var yrData = await yrResp.json();
    return Response.json({
      success: true,
      endpoint: 'years',
      count: Array.isArray(yrData) ? yrData.length : null,
      years: yrData
    });
  }

  // ========== indicators (default) ==========
  var indResp = await fetch(BASE + '/indicators', { headers: H, signal: AbortSignal.timeout(20000) });
  if (!indResp.ok) {
    var indErr = await indResp.text();
    return Response.json({ error: 'WTO HTTP ' + indResp.status, detail: indErr }, { status: indResp.status });
  }
  var indData = await indResp.json();

  var indicators = Array.isArray(indData) ? indData.map(function(x) {
    return {
      indicator_code: x.code || null,
      description: x.name || x.description || null,
      unit: x.unitCode || x.unit || null,
      category: x.categoryCode || x.category || null
    };
  }) : [];

  if (searchTerm) {
    indicators = indicators.filter(function(x) {
      return (x.indicator_code || '').toLowerCase().includes(searchTerm) ||
             (x.description || '').toLowerCase().includes(searchTerm);
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