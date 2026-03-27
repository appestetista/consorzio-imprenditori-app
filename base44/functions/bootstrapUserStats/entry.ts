/**
 * Funzione one-shot per generare i record UserStats per tutti gli utenti
 * che hanno conversazioni con categoria ma non hanno ancora un UserStats.
 * Va eseguita UNA SOLA VOLTA dall'admin.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Prendi tutti gli utenti che hanno già uno UserStats
    const existingStats = await base44.asServiceRole.entities.UserStats.filter({}, '-updated_date', 5000);
    const existingEmails = new Set(existingStats.map(s => s.user_email));

    // Prendi tutte le conversazioni con categoria (max 5000)
    const conversations = await base44.asServiceRole.entities.ChatConversation.filter(
      { categoria: { $ne: null } },
      '-created_date',
      5000
    );

    // Raggruppa per email
    const byUser = {};
    for (const conv of conversations) {
      if (!conv.user_email || !conv.categoria) continue;
      if (!byUser[conv.user_email]) byUser[conv.user_email] = [];
      byUser[conv.user_email].push(conv);
    }

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let created = 0;
    let updated = 0;

    for (const [email, convs] of Object.entries(byUser)) {
      const totalAnalyses = convs.length;
      const catCounts = {};
      let totalRatings = 0;
      let ratingsCount = 0;
      let thisMonthCount = 0;

      for (const c of convs) {
        catCounts[c.categoria] = (catCounts[c.categoria] || 0) + 1;
        if (c.rating > 0) {
          totalRatings += c.rating;
          ratingsCount++;
        }
        const cDate = new Date(c.created_date);
        const cKey = `${cDate.getFullYear()}-${String(cDate.getMonth() + 1).padStart(2, '0')}`;
        if (cKey === currentMonthKey) thisMonthCount++;
      }

      // Ultime 5 (convs è già ordinato per -created_date)
      const recent = convs.slice(0, 5).map(c => ({
        id: c.id,
        titolo: c.titolo,
        categoria: c.categoria,
        rating: c.rating || 0,
        created_date: c.created_date
      }));

      const statsData = {
        user_email: email,
        total_analyses: totalAnalyses,
        this_month_count: thisMonthCount,
        this_month_key: currentMonthKey,
        total_ratings: totalRatings,
        ratings_count: ratingsCount,
        category_counts: catCounts,
        recent_analyses: recent,
        last_computed_at: now.toISOString()
      };

      if (existingEmails.has(email)) {
        const existing = existingStats.find(s => s.user_email === email);
        await base44.asServiceRole.entities.UserStats.update(existing.id, statsData);
        updated++;
      } else {
        await base44.asServiceRole.entities.UserStats.create(statsData);
        created++;
      }
    }

    return Response.json({ success: true, created, updated, total_users: Object.keys(byUser).length });
    
  } catch (error) {
    console.error('bootstrapUserStats error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});