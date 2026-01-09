import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { messageId } = await req.json();

        if (!messageId) {
            return Response.json({ error: 'messageId è richiesto' }, { status: 400 });
        }

        // Recupera il messaggio
        const messages = await base44.asServiceRole.entities.Message.filter({ id: messageId });
        const message = messages[0];

        if (!message) {
            return Response.json({ error: 'Messaggio non trovato' }, { status: 404 });
        }

        // Verifica permessi: autore del messaggio o admin
        const canDelete = message.from_email === user.email || user.role === 'admin';

        if (!canDelete) {
            return Response.json({ error: 'Non hai i permessi per eliminare questo messaggio' }, { status: 403 });
        }

        // Elimina il messaggio con privilegi service role
        await base44.asServiceRole.entities.Message.delete(messageId);

        return Response.json({ success: true, message: 'Messaggio eliminato' });

    } catch (error) {
        console.error('Errore eliminazione messaggio:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});