import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { email, userType, zona, consultantCategory, assignedSections } = await req.json();

    if (!email || !userType) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Genera un token univoco per l'invito
    const inviteToken = crypto.randomUUID();

    // 1. Crea il PendingInvite per salvare i dati extra (tipo utente, zona, sezioni)
    await base44.asServiceRole.entities.PendingInvite.create({
      email: email.toLowerCase(),
      user_type: userType,
      invited_by: user.email,
      zona: zona || null,
      consultant_category: consultantCategory || null,
      assigned_sections: assignedSections || [],
      invite_token: inviteToken
    });

    // 2. Usa l'invito nativo di Base44 per la registrazione
    const appUrl = "https://app.consorzioimprenditori.com";
    
    // Invita l'utente tramite Base44 SDK - questo crea l'utente e invia l'email di invito nativa
    await base44.users.inviteUser(email.toLowerCase(), 'user');
    
    // Il link per completare il profilo dopo la registrazione
    const completeProfileLink = `${appUrl}/CompleteRegistration?token=${inviteToken}`;

    // L'email viene inviata automaticamente da Base44 con il link di registrazione nativo
    // che porta alla schermata "Create your account" (immagine 3)

    return Response.json({ 
      success: true, 
      message: `Invito inviato a ${email}`,
      completeProfileLink: completeProfileLink
    });

  } catch (error) {
    console.error('Errore sendInviteEmail:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});