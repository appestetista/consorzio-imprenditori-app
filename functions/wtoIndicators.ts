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

  // ========== data ==========
  if (endpoint === 'data') {
    var d_i = String(body.i || body.indicator_code || '').trim();
    var d_r = String(body.r || body.reporter || '').trim();
    var d_p = body.p !== undefined ? String(body.p).trim() : '000';
    var d_pc = String(body.pc || body.product_code || '').trim();
    var d_ps = String(body.ps || body.years || '').trim();

    if (!d_i) return Response.json({ error: 'i (indicator) required' }, { status: 400 });
    if (!d_r) return Response.json({ error: 'r (reporter) required' }, { status: 400 });

    // Ensure p is 3-digit format
    if (d_p === '0') d_p = '000';

    var dqp = new URLSearchParams();
    dqp.set('i', d_i);
    dqp.set('r', d_r);
    dqp.set('p', d_p);
    if (d_pc) dqp.set('pc', d_pc);
    if (d_ps) dqp.set('ps', d_ps);
    dqp.set('fmt', 'json');
    dqp.set('mode', 'full');
    dqp.set('dec', '2');
    dqp.set('max', '500');
    dqp.set('head', 'H');
    dqp.set('lang', '1');

    var dUrl = BASE + '/data?' + dqp.toString();
    console.log('[wtoInd v2] data fetch: ' + dUrl);

    var dResp = await fetch(dUrl, { headers: H, signal: AbortSignal.timeout(30000) });
    if (!dResp.ok) {
      var dErr = await dResp.text();
      return Response.json({ error: 'WTO HTTP ' + dResp.status, detail: dErr, url: dUrl }, { status: dResp.status });
    }

    var dData = await dResp.json();
    console.log('[wtoInd v2] data records: ' + (Array.isArray(dData) ? dData.length : 'non-array'));

    if (!Array.isArray(dData) || dData.length === 0) {
      return Response.json({
        success: true,
        endpoint: 'data',
        records: 0,
        data: [],
        metrics: null,
        message: 'Nessun dato disponibile WTO per questi parametri',
        query: { i: d_i, r: d_r, p: d_p, pc: d_pc, ps: d_ps }
      });
    }

    // Parse records and build yearly series
    var yearlyMap = {};
    var records = dData.map(function(rec) {
      var yr = parseInt(rec.Year || rec.year || rec.Period || rec.period, 10);
      var val = parseFloat(rec.Value || rec.value);
      var parsed = {
        year: yr,
        value: isNaN(val) ? null : val,
        indicator: rec.IndicatorCode || rec.Indicator || d_i,
        reporter: rec.ReportingEconomyCode || rec.ReportingEconomy || d_r,
        reporter_name: rec.ReportingEconomy || rec.ReporterName || null,
        partner: rec.PartnerEconomyCode || rec.PartnerEconomy || d_p,
        partner_name: rec.PartnerEconomy || rec.PartnerName || null,
        product_code: rec.ProductOrSectorCode || rec.ProductCode || d_pc,
        product_name: rec.ProductOrSector || rec.ProductName || null,
        unit: rec.Unit || rec.UnitCode || null,
        frequency: rec.FrequencyCode || rec.Frequency || null
      };
      if (!isNaN(yr) && parsed.value !== null) {
        if (!yearlyMap[yr] || parsed.value > yearlyMap[yr]) {
          yearlyMap[yr] = parsed.value;
        }
      }
      return parsed;
    });

    // Build sorted yearly series
    var years_sorted = Object.keys(yearlyMap).map(Number).sort(function(a, b) { return a - b; });
    var serie = years_sorted.map(function(yr) { return { year: yr, value: yearlyMap[yr] }; });

    // === METRICS CALCULATION ===
    var metrics = null;
    if (serie.length > 0) {
      // Import totale: sum of all yearly values
      var import_totale = serie.reduce(function(s, x) { return s + x.value; }, 0);

      // Latest year value
      var latest = serie[serie.length - 1];

      // Year-on-year growth
      var yoy = [];
      for (var idx = 1; idx < serie.length; idx++) {
        var prev = serie[idx - 1].value;
        var curr = serie[idx].value;
        var growth_pct = prev > 0 ? ((curr - prev) / prev * 100) : null;
        yoy.push({
          from_year: serie[idx - 1].year,
          to_year: serie[idx].year,
          from_value: prev,
          to_value: curr,
          growth_pct: growth_pct !== null ? parseFloat(growth_pct.toFixed(2)) : null
        });
      }

      // CAGR
      var cagr = null;
      if (serie.length >= 2) {
        var first_val = serie[0].value;
        var last_val = serie[serie.length - 1].value;
        var n_years = serie[serie.length - 1].year - serie[0].year;
        if (first_val > 0 && n_years > 0) {
          cagr = parseFloat(((Math.pow(last_val / first_val, 1 / n_years) - 1) * 100).toFixed(2));
        }
      }

      // Trend: average annual growth
      var avg_growth = null;
      var valid_yoy = yoy.filter(function(x) { return x.growth_pct !== null; });
      if (valid_yoy.length > 0) {
        avg_growth = parseFloat((valid_yoy.reduce(function(s, x) { return s + x.growth_pct; }, 0) / valid_yoy.length).toFixed(2));
      }

      // Volatility (coefficient of variation)
      var volatility = null;
      if (serie.length >= 3) {
        var mean = import_totale / serie.length;
        if (mean > 0) {
          var variance = serie.reduce(function(s, x) { return s + Math.pow(x.value - mean, 2); }, 0) / serie.length;
          volatility = parseFloat(((Math.sqrt(variance) / mean) * 100).toFixed(2));
        }
      }

      metrics = {
        import_totale_cumulato: parseFloat(import_totale.toFixed(2)),
        ultimo_anno: { year: latest.year, value: latest.value },
        primo_anno: { year: serie[0].year, value: serie[0].value },
        numero_anni: serie.length,
        trend_annuale: yoy,
        crescita_media_annua_pct: avg_growth,
        cagr_pct: cagr,
        volatilita_pct: volatility,
        serie_storica: serie
      };
    }

    return Response.json({
      success: true,
      endpoint: 'data',
      records: records.length,
      data: records,
      metrics: metrics,
      query: { i: d_i, r: d_r, p: d_p, pc: d_pc, ps: d_ps }
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