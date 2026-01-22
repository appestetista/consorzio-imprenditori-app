import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { tipo, subject, body } = await req.json();

        // Usa il servizio email interno per inviare notifica
        await base44.asServiceRole.integrations.Core.SendEmail({
            to: user.email, // Invia a se stesso come conferma
            subject: `[CONFERMA] ${subject}`,
            body: `<p>La tua richiesta è stata inviata con successo.</p>${body}`
        });

        // Per email esterne, logghiamo i dati per elaborazione manuale
        // In produzione si potrebbe usare un servizio email esterno (SendGrid, etc.)
        console.log('=== NUOVA RICHIESTA WELFARE ===');
        console.log('Destinatario: app.consorzio.imprenditori@gmail.com');
        console.log('Oggetto:', subject);
        console.log('Da:', user.email);
        console.log('Contenuto:', body);
        console.log('===============================');

        return Response.json({ 
            success: true, 
            message: 'Richiesta inviata con successo' 
        });
    } catch (error) {
        console.error('Errore invio email:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});