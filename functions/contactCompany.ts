import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // 1. Autentica l'utente (funziona per TUTTI gli utenti loggati, non solo admin)
        const user = await base44.auth.me();
        if (!user || !user.email) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Leggi i parametri
        const { videoId, companyEmail } = await req.json();

        if (!companyEmail) {
            return Response.json({ 
                success: false, 
                error: 'Email azienda non disponibile' 
            }, { status: 400 });
        }

        // 3. Verifica se esiste già una richiesta di contatto
        const conversationId = [user.email, companyEmail].sort().join('-');
        
        const existingMessages = await base44.asServiceRole.entities.Message.filter({
            from_email: user.email,
            to_email: companyEmail,
            conversation_id: conversationId
        });

        const hasContactRequest = existingMessages.some(msg => 
            msg.content.includes('Ho visto la vostra video intervista') ||
            msg.content.includes('Richiesta di contatto')
        );

        if (hasContactRequest) {
            return Response.json({ 
                success: false, 
                message: 'Hai già inviato una richiesta di contatto a questa azienda',
                alreadyExists: true
            });
        }

        // 4. Invia email all'azienda (service role = permessi admin)
        const emailBody = `Gentile Azienda,

l'utente ${user.company_name || user.full_name} desidera essere contattato dalla vostra azienda.

Siete pregati di ricontattarlo al più presto al seguente numero:
${user.phone || 'Non disponibile'}

Referente aziendale:
${user.full_name || 'Non disponibile'}

Cordiali saluti,
Consorzio Imprenditori`;

        await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'Consorzio Imprenditori',
            to: companyEmail,
            subject: `${user.company_name || user.full_name} ti vuole contattare`,
            body: emailBody
        });

        // 5. Crea messaggio in-app (service role = permessi admin)
        await base44.asServiceRole.entities.Message.create({
            from_email: user.email,
            to_email: companyEmail,
            content: `Richiesta di contatto da ${user.company_name || user.full_name}\n\nHo visto la vostra video intervista e vorrei essere contattato.\n\nAzienda: ${user.company_name || 'N/A'}\nReferente: ${user.full_name || 'N/A'}\nTelefono: ${user.phone || 'N/A'}`,
            conversation_id: conversationId
        });

        return Response.json({ 
            success: true, 
            message: 'Richiesta inviata! L\'azienda ti contatterà al più presto.' 
        });

    } catch (error) {
        console.error('Errore contatto azienda:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});