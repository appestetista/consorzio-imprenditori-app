import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { email, userType, zona, consultantCategory, consultantName, assignedSections } = await req.json();

    if (!email || !userType) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Genera un token univoco per l'invito
    const inviteToken = crypto.randomUUID();

    // 0. Elimina eventuali inviti precedenti per questa email (evita duplicati)
    const existingInvites = await base44.asServiceRole.entities.PendingInvite.filter({
      email: email.toLowerCase()
    });
    
    for (const oldInvite of existingInvites) {
      await base44.asServiceRole.entities.PendingInvite.delete(oldInvite.id);
    }

    // 1. Crea il PendingInvite per salvare i dati extra (tipo utente, zona, sezioni)
    await base44.asServiceRole.entities.PendingInvite.create({
      email: email.toLowerCase(),
      user_type: userType,
      invited_by: user.email,
      zona: zona || null,
      consultant_category: consultantCategory || null,
      consultant_name: consultantName || null,
      assigned_sections: assignedSections || [],
      invite_token: inviteToken
    });

    // 2. Costruisci il link di registrazione - porta direttamente all'app
    // Base44 gestisce automaticamente il redirect al login se non autenticato
    const appUrl = "https://app.consorzioimprenditori.com";
    const registrationLink = appUrl;

    // 3. Invia email personalizzata con il link di registrazione via Gmail API
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("gmail");
    const tipoUtente = userType === 'consulente' ? 'Consulente' : 'Membro';

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
    .instructions-box { background: #fef3c7; border: 2px solid #f59e0b; border-radius: 10px; padding: 20px; margin: 20px 0; }
    .step { display: flex; align-items: flex-start; margin: 15px 0; }
    .step-number { background: #1e293b; color: #a3e635; width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0; text-align: center; line-height: 30px; }
    .arrow { font-size: 24px; color: #f59e0b; text-align: center; margin: 10px 0; }
    .highlight { background: #a3e635; color: #1e293b; padding: 2px 8px; border-radius: 4px; font-weight: bold; }
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
      
      <p style="text-align: center;">
        <a href="${registrationLink}" class="button">ACCEDI ALL'APP</a>
      </p>
      
      <div class="instructions-box">
        <h3 style="margin-top: 0; color: #92400e;">📋 ISTRUZIONI PER LA REGISTRAZIONE</h3>
        <p><strong>La pagina sarà in inglese, segui questi passaggi:</strong></p>
        
        <div class="step">
          <span class="step-number">1</span>
          <div>
            <strong>Non hai ancora un account?</strong><br>
            Clicca su <span class="highlight">"Sign up"</span> (significa "Registrati")
          </div>
        </div>
        
        <p class="arrow">⬇️ ⬇️ ⬇️</p>
        
        <div class="step">
          <span class="step-number">2</span>
          <div>
            <strong>Email:</strong> Inserisci <span class="highlight">${email}</span><br>
            <em style="color: #dc2626;">⚠️ IMPORTANTE: Usa esattamente questa email!</em>
          </div>
        </div>
        
        <div class="step">
          <span class="step-number">3</span>
          <div>
            <strong>Password:</strong> Inventane una a tua scelta
          </div>
        </div>
        
        <div class="step">
          <span class="step-number">4</span>
          <div>
            Clicca su <span class="highlight">"Create account"</span> (significa "Crea account")
          </div>
        </div>
        
        <p class="arrow">⬇️ ⬇️ ⬇️</p>
        
        <div class="step">
          <span class="step-number">5</span>
          <div>
            <strong>Riceverai subito una seconda email</strong> con un <span class="highlight">codice numerico a 6 cifre</span><br>
            Inseriscilo nelle caselle che appariranno:
          </div>
        </div>
        
        <div style="text-align: center; margin: 15px 0;">
          <div style="display: inline-flex; gap: 8px;">
            <div style="width: 40px; height: 50px; border: 2px solid #1e293b; border-radius: 8px; background: white; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #1e293b;">1</div>
            <div style="width: 40px; height: 50px; border: 2px solid #1e293b; border-radius: 8px; background: white; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #1e293b;">2</div>
            <div style="width: 40px; height: 50px; border: 2px solid #1e293b; border-radius: 8px; background: white; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #1e293b;">3</div>
            <div style="width: 40px; height: 50px; border: 2px solid #1e293b; border-radius: 8px; background: white; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #1e293b;">4</div>
            <div style="width: 40px; height: 50px; border: 2px solid #1e293b; border-radius: 8px; background: white; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #1e293b;">5</div>
            <div style="width: 40px; height: 50px; border: 2px solid #1e293b; border-radius: 8px; background: white; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #1e293b;">6</div>
          </div>
        </div>
      </div>
      
      <p style="text-align: center; color: #64748b; font-size: 14px;">
        Se il pulsante non funziona, copia e incolla questo link nel browser:<br>
        <span style="word-break: break-all; font-size: 11px;">${registrationLink}</span>
      </p>
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
      `From: Consorzio Imprenditori <consorzioimprenditori@gmail.com>`,
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
      message: `Email inviata a ${email}`,
      registrationLink: registrationLink
    });

  } catch (error) {
    console.error('Errore sendInviteEmail:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});