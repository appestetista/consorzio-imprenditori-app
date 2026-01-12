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
        const { videoId, companyEmail, source = 'video' } = await req.json();

        if (!companyEmail) {
            return Response.json({ 
                success: false, 
                error: 'Email azienda non disponibile' 
            }, { status: 400 });
        }

        // 2b. Recupera i dati dell'azienda target per WhatsApp
        const targetUsers = await base44.asServiceRole.entities.User.filter({ email: companyEmail });
        const targetUser = targetUsers[0];
        
        if (!targetUser) {
            return Response.json({ 
                success: false, 
                error: 'Azienda non trovata' 
            }, { status: 404 });
        }

        // 3. Verifica se esiste già una richiesta di contatto recente
        const existingRequests = await base44.asServiceRole.entities.ContactRequest.filter({
            requester_email: user.email,
            target_company_email: companyEmail,
            source: source
        });

        // Controlla se c'è una richiesta recente (ultime 24 ore)
        const recentRequest = existingRequests.find(req => {
            const requestDate = new Date(req.created_date);
            const now = new Date();
            const hoursDiff = (now - requestDate) / (1000 * 60 * 60);
            return hoursDiff < 24;
        });

        if (recentRequest) {
            return Response.json({ 
                success: false, 
                message: 'Hai già inviato una richiesta di contatto a questa azienda nelle ultime 24 ore',
                alreadyExists: true
            });
        }

        const conversationId = [user.email, companyEmail].sort().join('-');

        // 4. Crea record ContactRequest
        const contactRequest = await base44.asServiceRole.entities.ContactRequest.create({
            requester_email: user.email,
            requester_name: user.company_name || user.full_name,
            target_company_email: companyEmail,
            target_company_name: targetUser.company_name || targetUser.full_name,
            source: source,
            message: `Richiesta di contatto da ${user.company_name || user.full_name}`,
            email_sent: false,
            whatsapp_sent: false
        });

        // 5. Invia email al referente dell'azienda
        const referenteEmail = targetUser.email || companyEmail;
        const emailBody = `Gentile ${targetUser.referente || 'Azienda'},

l'utente ${user.company_name || user.full_name} desidera essere contattato dalla vostra azienda.

Siete pregati di ricontattarlo al più presto al seguente numero:
${user.phone || 'Non disponibile'}

Referente aziendale:
${user.full_name || 'Non disponibile'}

Per rispondere, accedi alla piattaforma Consorzio Imprenditori.

Cordiali saluti,
Consorzio Imprenditori`;

        let emailSent = false;
        try {
            await base44.asServiceRole.integrations.Core.SendEmail({
                from_name: 'Consorzio Imprenditori',
                to: referenteEmail,
                subject: `${user.company_name || user.full_name} ti vuole contattare`,
                body: emailBody
            });
            emailSent = true;
        } catch (emailError) {
            console.error('Errore invio email:', emailError);
        }

        // 6. Aggiorna ContactRequest con lo stato invio email
        await base44.asServiceRole.entities.ContactRequest.update(contactRequest.id, {
            email_sent: emailSent,
            whatsapp_sent: false
        });

        // 8. Crea messaggio in-app (service role = permessi admin)
        await base44.asServiceRole.entities.Message.create({
            from_email: user.email,
            to_email: companyEmail,
            content: `Richiesta di contatto da ${user.company_name || user.full_name}\n\nHo visto la vostra video intervista e vorrei essere contattato.\n\nAzienda: ${user.company_name || 'N/A'}\nReferente: ${user.full_name || 'N/A'}\nTelefono: ${user.phone || 'N/A'}`,
            conversation_id: conversationId
        });

        return Response.json({ 
            success: true, 
            message: 'Richiesta inviata! L\'azienda ti contatterà al più presto.',
            emailSent
        });

    } catch (error) {
        console.error('Errore contatto azienda:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});