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
    
    // Ottieni tutti gli utenti
    const users = await base44.asServiceRole.entities.User.list();
    
    let notificheInviate = 0;
    let emailInviate = 0;
    
    const titolo = '🏛️ Nuove Aste Disponibili';
    const contenuto = message || 'Sono state caricate nuove aste giudiziarie. Consulta la sezione Aste per scoprirle!';
    const appUrl = Deno.env.get('APP_URL') || '';
    
    for (const u of users) {
      // Se l'utente ha preferenze salvate, controlla se ha notifiche attive
      // Altrimenti invia di default a tutti
      const pref = preferenze.find(p => p.user_email === u.email);
      if (pref && !pref.notifiche_nuove_aste) continue;
      
      // Notifica in-app
      await base44.asServiceRole.entities.Notification.create({
        user_email: u.email,
        type: 'event',
        title: titolo,
        content: contenuto,
        is_read: false
      });
      
      notificheInviate++;
      
      // Invia email
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: u.email,
          subject: titolo,
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #d4af37;">🏛️ Nuove Aste Disponibili</h2>
              <p style="font-size: 16px; color: #333;">${contenuto}</p>
              <p style="margin-top: 20px;">
                <a href="${appUrl}/AsteImmobiliari" style="background: #d4af37; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Scopri le nuove aste</a>
              </p>
              <p style="color: #888; font-size: 12px; margin-top: 30px;">Questa email è stata inviata automaticamente dal sistema di notifiche.</p>
            </div>
          `
        });
        emailInviate++;
      } catch (emailErr) {
        console.error('Errore invio email a', u.email, ':', emailErr);
      }
    }
    
    return Response.json({ 
      success: true, 
      message: `Notifica inviata a ${notificheInviate} utenti, ${emailInviate} email inviate` 
    });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});