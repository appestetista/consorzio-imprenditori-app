import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all data in parallel using service role
    const [users, events, videos, consultants, vantaggi] = await Promise.all([
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.Event.list(),
      base44.asServiceRole.entities.Video.list(),
      base44.asServiceRole.entities.Consultant.list(),
      base44.asServiceRole.entities.Vantaggio.list(),
    ]);

    // Compute stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureApprovedEvents = events.filter(e => {
      if (!e.date) return false;
      const d = new Date(e.date);
      if (isNaN(d.getTime())) return false;
      d.setHours(0, 0, 0, 0);
      return d >= today && e.approval_status === 'approved' && !e.is_cancelled;
    });

    const statsData = {
      stat_key: 'global_counts',
      total_users: users.length,
      active_users: users.filter(u => !u.is_blocked).length,
      total_events: futureApprovedEvents.length,
      total_videos: videos.length,
      total_consultants: consultants.length,
      total_vantaggi: vantaggi.filter(v => v.is_active).length,
      last_computed_at: new Date().toISOString(),
    };

    // Upsert: find existing record or create
    const existing = await base44.asServiceRole.entities.AppStats.filter({ stat_key: 'global_counts' });
    if (existing.length > 0) {
      await base44.asServiceRole.entities.AppStats.update(existing[0].id, statsData);
    } else {
      await base44.asServiceRole.entities.AppStats.create(statsData);
    }

    return Response.json({ success: true, stats: statsData });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});