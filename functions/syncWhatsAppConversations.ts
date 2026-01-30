import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        // Solo admin può eseguire questa funzione
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Recupera tutte le conversazioni dell'agente event_notifier
        const conversations = await base44.agents.listConversations({
            agent_name: 'event_notifier'
        });

        console.log(`Found ${conversations.length} conversations`);

        // Recupera tutti gli utenti
        const allUsers = await base44.asServiceRole.entities.User.list();
        const results = [];

        for (const conv of conversations) {
            // Cerca l'email dell'utente nei messaggi o metadata
            const userMessage = conv.messages?.find(m => m.role === 'user');
            
            // Cerca l'utente tramite email dalla metadata o dal numero di telefono
            // Base44 salva l'email dell'utente loggato nelle conversazioni
            const userEmail = conv.user_email || conv.metadata?.user_email;
            
            if (userEmail) {
                const matchingUser = allUsers.find(u => u.email === userEmail);
                if (matchingUser && !matchingUser.whatsapp_conversation_id) {
                    // Aggiorna l'utente con il conversation_id
                    await base44.asServiceRole.entities.User.update(matchingUser.id, {
                        whatsapp_conversation_id: conv.id,
                        whatsapp_enabled: true
                    });
                    results.push({ 
                        email: matchingUser.email, 
                        conversation_id: conv.id,
                        status: 'linked' 
                    });
                    console.log(`Linked ${matchingUser.email} to conversation ${conv.id}`);
                } else if (matchingUser?.whatsapp_conversation_id) {
                    results.push({ 
                        email: matchingUser.email, 
                        status: 'already_linked' 
                    });
                }
            }
        }

        return Response.json({ 
            success: true, 
            conversationsFound: conversations.length,
            results 
        });

    } catch (error) {
        console.error('Error syncing WhatsApp conversations:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});