import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cerca se c'è un invito pendente per questa email
    const pendingInvites = await base44.asServiceRole.entities.PendingInvite.filter({
      email: user.email.toLowerCase(),
      is_registered: false
    });

    if (pendingInvites.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'Nessun invito pendente trovato',
        user_type: user.user_type || 'utente'
      });
    }

    const invite = pendingInvites[0];
    
    // Aggiorna l'utente con il tipo corretto
    await base44.asServiceRole.entities.User.update(user.id, {
      user_type: invite.user_type
    });

    // Segna l'invito come completato
    await base44.asServiceRole.entities.PendingInvite.update(invite.id, {
      is_registered: true
    });

    return Response.json({ 
      success: true, 
      message: 'Tipo utente assegnato',
      user_type: invite.user_type
    });

  } catch (error) {
    console.error('Errore assignUserType:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});