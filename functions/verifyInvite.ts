import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, email } = await req.json();

    if (!token || !email) {
      return Response.json({ valid: false, error: 'Missing token or email' });
    }

    // Usa service role per leggere gli inviti (l'utente non è ancora autenticato)
    const invites = await base44.asServiceRole.entities.PendingInvite.filter({ 
      invite_token: token,
      email: email.toLowerCase()
    });

    const invite = invites[0];

    if (!invite) {
      return Response.json({ valid: false, error: 'Invite not found' });
    }

    if (invite.is_registered) {
      return Response.json({ valid: false, already_registered: true });
    }

    return Response.json({ 
      valid: true, 
      invite: {
        email: invite.email,
        user_type: invite.user_type,
        zona: invite.zona
      }
    });

  } catch (error) {
    console.error('Errore verifyInvite:', error);
    return Response.json({ valid: false, error: error.message });
  }
});