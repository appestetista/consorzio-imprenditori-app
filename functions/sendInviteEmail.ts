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

    // 1. Crea il PendingInvite per salvare i dati extra (tipo utente, zona, sezioni)
    await base44.asServiceRole.entities.PendingInvite.create({
      email: email.toLowerCase(),
      user_type: userType,
      invited_by: user.email,
      zona: zona || null,
      consultant_category: consultantCategory || null,
      assigned_sections: assignedSections || []
    });

    // 2. Usa l'invito nativo Base44 per generare il link di registrazione
    const inviteResult = await base44.users.inviteUser(email, "user");
    
    // Il link di registrazione è nel risultato dell'invito
    const registrationLink = inviteResult?.invite_url || inviteResult?.url || `https://app.base44.io/register`;

    // 3. Invia email personalizzata con il link di registrazione
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("gmail");
    const tipoUtente = userType === 'consulente' ? 'Consulente' : 'Membro';

    // Corpo email HTML con pulsante di registrazione
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1e293b; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { color: #a3e635; margin: 0; font-size: 24px; }
    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #a3e635; color: #1e293b !important; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Consorzio Imprenditori</h1>
    </div>
    <div class="content">
      <h2>Benvenuto!</h2>
      <p>Sei stato invitato a iscriverti all'app <strong>Consorzio Imprenditori</strong> come <strong>${tipoUtente}</strong>.</p>
      
      <p>Clicca sul pulsante qui sotto per completare la registrazione:</p>
      
      <p style="text-align: center;">
        <a href="${registrationLink}" class="button">REGISTRATI ORA</a>
      </p>
      
      <p><strong>Importante:</strong></p>
      <ul>
        <li>Usa questa email (${email}) per registrarti</li>
        <li>Scegli una password sicura</li>
        <li>Se usi un'email diversa, non potrai accedere</li>
      </ul>
      
      <p>Se il pulsante non funziona, copia e incolla questo link nel browser:</p>
      <p style="word-break: break-all; color: #64748b; font-size: 12px;">${registrationLink}</p>
    </div>
    <div class="footer">
      <p>Questa email è stata inviata automaticamente. Non rispondere.</p>
      <p>© ${new Date().getFullYear()} Consorzio Imprenditori</p>
    </div>
  </div>
</body>
</html>
    `;

    // Costruisci email in formato RFC 2822
    const emailLines = [
      `From: Consorzio Imprenditori <app.consorzio.imprenditori@gmail.com>`,
      `To: ${email}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent("Benvenuto nel Consorzio Imprenditori!")))}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      htmlBody
    ];
    
    const rawEmail = emailLines.join('\r\n');
    const encodedEmail = btoa(unescape(encodeURIComponent(rawEmail)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Invia via Gmail API
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: encodedEmail
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gmail API error:', errorData);
      throw new Error(`Gmail API error: ${response.status}`);
    }

    return Response.json({ 
      success: true, 
      message: `Email inviata a ${email}` 
    });

  } catch (error) {
    console.error('Errore sendInviteEmail:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});