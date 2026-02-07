import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verifica che sia un admin
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    
    const { message } = await req.json();
    
    // Ottieni tutti gli utenti con notifiche aste attive
    const preferenze = await base44.asServiceRole.entities.AstaPreferenze.filter({ notifiche_nuove_aste: true });
    const emailsConPreferenze = new Set(preferenze.map(p => p.user_email));
    
    // Ottieni tutti gli utenti
    const users = await base44.asServiceRole.entities.User.list();
    
    let notificheInviate = 0;
    
    for (const u of users) {
      // Se l'utente ha preferenze salvate, controlla se ha notifiche attive
      // Altrimenti invia di default a tutti
      const pref = preferenze.find(p => p.user_email === u.email);
      if (pref && !pref.notifiche_nuove_aste) continue;
      
      await base44.asServiceRole.entities.Notification.create({
        user_email: u.email,
        type: 'event',
        title: '🏛️ Nuove Aste Disponibili',
        content: message || 'Sono state caricate nuove aste giudiziarie. Consulta la sezione Aste per scoprirle!',
        is_read: false
      });
      
      notificheInviate++;
    }
    
    return Response.json({ 
      success: true, 
      message: `Notifica inviata a ${notificheInviate} utenti` 
    });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});