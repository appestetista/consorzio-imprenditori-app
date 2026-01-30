import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        // Solo admin può eseguire questa funzione
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Prova diversi metodi per recuperare le conversazioni
        let conversations = [];
        
        // Metodo 1: listConversations con agent_name
        try {
            conversations = await base44.agents.listConversations({
                agent_name: 'event_notifier'
            });
            console.log(`Method 1 (listConversations): Found ${conversations?.length || 0} conversations`);
        } catch (e) {
            console.log('Method 1 failed:', e.message);
        }

        // Metodo 2: prova senza parametri
        if (!conversations || conversations.length === 0) {
            try {
                conversations = await base44.agents.listConversations();
                console.log(`Method 2 (no params): Found ${conversations?.length || 0} conversations`);
            } catch (e) {
                console.log('Method 2 failed:', e.message);
            }
        }

        // Metodo 3: prova con asServiceRole
        if (!conversations || conversations.length === 0) {
            try {
                conversations = await base44.asServiceRole.agents.listConversations({
                    agent_name: 'event_notifier'
                });
                console.log(`Method 3 (asServiceRole): Found ${conversations?.length || 0} conversations`);
            } catch (e) {
                console.log('Method 3 failed:', e.message);
            }
        }

        console.log(`Total found: ${conversations?.length || 0} conversations`);
        if (conversations?.length > 0) {
            console.log('First conversation:', JSON.stringify(conversations[0], null, 2));
        }

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