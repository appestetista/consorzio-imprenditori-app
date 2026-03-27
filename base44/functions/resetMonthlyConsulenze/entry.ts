import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Calcola il mese corrente in formato YYYY-MM
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Recupera tutti gli utenti
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 5000);

    let resetCount = 0;
    for (const u of allUsers) {
      // Resetta solo se il mese è diverso o non è mai stato impostato
      if (u.mese_reset_consulenze !== currentMonth) {
        await base44.asServiceRole.entities.User.update(u.id, {
          consulenze_usate_mese: 0,
          mese_reset_consulenze: currentMonth,
        });
        resetCount++;
      }
    }

    return Response.json({
      success: true,
      month: currentMonth,
      users_reset: resetCount,
      total_users: allUsers.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});