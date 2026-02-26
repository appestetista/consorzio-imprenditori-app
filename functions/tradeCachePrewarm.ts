import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Pre-warming automatico della cache trade.
 * Recupera le 50 combinazioni più richieste (hit_count più alto) negli ultimi 30 giorni.
 * Rigenera la cache se expires_at < 3 giorni da ora.
 * Chiamato da automazione schedulata giornaliera.
 */

Deno.serve(async (req) => {
  var base44 = createClientFromRequest(req);
  var user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  var now = new Date();
  var thresholdDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
  var thresholdISO = thresholdDate.toISOString();

  console.log('[PreWarm] Starting. Threshold: ' + thresholdISO);

  // Get top 50 most-hit AGGREGATED cache records
  var allAggregated = await base44.asServiceRole.entities.TradeCache.filter(
    { source_type: 'AGGREGATED' },
    '-hit_count',
    50
  );

  if (!allAggregated || allAggregated.length === 0) {
    console.log('[PreWarm] No AGGREGATED cache records found');
    return Response.json({ refreshed: 0, skipped: 0, message: 'No records to pre-warm' });
  }

  var refreshed = 0;
  var skipped = 0;
  var errors = 0;

  for (var i = 0; i < allAggregated.length; i++) {
    var record = allAggregated[i];

    // Check if expires_at < 3 days from now
    if (new Date(record.expires_at) > thresholdDate) {
      skipped++;
      continue;
    }

    console.log('[PreWarm] Refreshing: ' + record.cache_key);

    // Parse cache_key to extract parameters: {reporter}_{hsCode}_{years}_{sourceType}
    var parts = record.cache_key.split('_');
    if (parts.length < 4) { skipped++; continue; }

    var reporterCode = parts[0];
    var hsCode = parts[1];
    // years part can contain commas: everything between parts[1] and last part
    var sourceType = parts[parts.length - 1];
    var yearsPart = parts.slice(2, parts.length - 1).join('_');

    // Call wtoTradeIntelligence with skip_cache=true to force refresh
    try {
      var resp = await base44.asServiceRole.functions.invoke('wtoTradeIntelligence', {
        country_name: reporterCode,
        product_description: hsCode,
        years_range: yearsPart,
        skip_cache: true
      });
      refreshed++;
      console.log('[PreWarm] Refreshed: ' + record.cache_key);
    } catch (e) {
      console.log('[PreWarm] Error refreshing ' + record.cache_key + ': ' + e.message);
      errors++;
    }
  }

  console.log('[PreWarm] Done. Refreshed=' + refreshed + ' Skipped=' + skipped + ' Errors=' + errors);
  return Response.json({ refreshed: refreshed, skipped: skipped, errors: errors, total_checked: allAggregated.length });
});