import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_email, action_type, month_year, meta } = await req.json();

    if (!user_email || !action_type || !month_year) {
      return Response.json({ error: 'Missing required fields: user_email, action_type, month_year' }, { status: 400 });
    }

    // 1) Recupera il limite dalla entity AILimitsConfig (service role per leggere la config)
    const configs = await base44.asServiceRole.entities.AILimitsConfig.filter({ action_type });
    
    // Fallback ai limiti di default se non c'è config in DB
    const DEFAULT_LIMITS = {
      contract_analysis: 5,
      contract_comparison: 2,
      export_analysis: 5,
      import_analysis: 5,
      grant_match: 5,
    };
    
    let limit;
    if (configs.length > 0 && configs[0].is_active !== false) {
      limit = configs[0].monthly_limit;
    } else {
      limit = DEFAULT_LIMITS[action_type] ?? 5;
    }

    // Controlla anche limiti custom dall'utente (ai_limits_override nel profilo)
    const userCustomLimit = user.ai_limits_override?.[action_type];
    if (userCustomLimit !== undefined && userCustomLimit !== null) {
      limit = userCustomLimit;
    }

    // 2) Conta i record esistenti per questo utente/azione/periodo
    const existingLogs = await base44.asServiceRole.entities.UsageLog.filter({
      user_email,
      action_type,
      month_year,
    });
    const currentCount = existingLogs.length;

    // 3) Se il limite è raggiunto, blocca
    if (currentCount >= limit) {
      return Response.json({
        allowed: false,
        reason: 'limit_reached',
        current_count: currentCount,
        limit,
      });
    }

    // 4) Crea il record di utilizzo
    const record = {
      user_email,
      action_type,
      month_year,
      timestamp: new Date().toISOString(),
    };
    if (meta?.search_label) record.search_label = meta.search_label;
    if (meta?.search_meta) record.search_meta = meta.search_meta;

    const created = await base44.asServiceRole.entities.UsageLog.create(record);

    return Response.json({
      allowed: true,
      current_count: currentCount + 1,
      limit,
      record_id: created.id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});