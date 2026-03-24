import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { to, subject, body } = await req.json();

        // Ottieni access token Gmail
        const accessToken = await base44.asServiceRole.connectors.getAccessToken("gmail");

        // Crea il messaggio email in formato MIME
        const emailContent = [
            `To: ${to}`,
            `Subject: ${subject}`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=utf-8',
            '',
            body
        ].join('\r\n');

        // Codifica in base64 URL-safe
        const encodedMessage = btoa(unescape(encodeURIComponent(emailContent)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        // Invia tramite Gmail API
        const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                raw: encodedMessage
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Gmail API error:', error);
            return Response.json({ error: 'Failed to send email' }, { status: 500 });
        }

        return Response.json({ success: true });
    } catch (error) {
        console.error('Errore invio email:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});