import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Usa service role per listare tutti gli utenti
    const users = await base44.asServiceRole.entities.User.list();
    
    // Restituisci solo i campi necessari per la directory (no dati sensibili)
    const safeUsers = users.map(u => ({
      id: u.id,
      company_name: u.company_name,
      full_name: u.full_name,
      email: u.email,
      city: u.city,
      province: u.province,
      business_sector: u.business_sector,
      specializzazione: u.specializzazione,
      logo_url: u.logo_url,
      referente: u.referente,
      role: u.role,
      zona: u.zona,
      user_type: u.user_type,
      is_blocked: u.is_blocked,
      phone: u.phone || u.cellulare_referente,
      cellulare_referente: u.cellulare_referente,
      settore: u.settore
    }));

    return Response.json({ users: safeUsers });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});