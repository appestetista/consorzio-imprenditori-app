import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        // Solo admin può eseguire questa funzione
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Recupera conversazioni con service role
        let conversations = [];
        let errors = [];
        
        // Prova prima senza filtro agent_name per vedere tutte le conversazioni
        try {
            const allConvs = await base44.asServiceRole.agents.listConversations({ limit: 100 });
            console.log(`All conversations (no filter): ${allConvs?.length || 0}`);
            if (allConvs?.length > 0) {
                allConvs.forEach(c => console.log(`  - agent: ${c.agent_name}, id: ${c.id}`));
            }
            conversations = allConvs || [];
        } catch (e) {
            errors.push(`listConversations (all) error: ${e.message}`);
            console.log('listConversations (all) failed:', e.message);
        }
        
        // Prova anche con filtro specifico
        try {
            const filtered = await base44.asServiceRole.agents.listConversations({
                agent_name: 'event_notifier',
                limit: 100
            });
            console.log(`Filtered by event_notifier: ${filtered?.length || 0}`);
        } catch (e) {
            errors.push(`listConversations (filtered) error: ${e.message}`);
        }

        // Log dettagliato delle conversazioni trovate
        if (conversations?.length > 0) {
            conversations.forEach((conv, i) => {
                console.log(`Conv ${i}:`, JSON.stringify({
                    id: conv.id,
                    user_email: conv.user_email,
                    metadata: conv.metadata,
                    created_date: conv.created_date
                }));
            });
        }

        // Recupera tutti gli utenti
        const allUsers = await base44.asServiceRole.entities.User.list();
        const results = [];

        for (const conv of conversations) {
            // Cerca l'email dell'utente in vari campi
            const userEmail = conv.user_email || conv.metadata?.user_email || conv.metadata?.email;
            
            console.log(`Processing conv ${conv.id}, user_email: ${userEmail}`);
            
            if (userEmail) {
                const matchingUser = allUsers.find(u => u.email === userEmail);
                if (matchingUser && !matchingUser.data?.whatsapp_conversation_id) {
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
                } else if (matchingUser?.data?.whatsapp_conversation_id) {
                    results.push({ 
                        email: matchingUser.email, 
                        status: 'already_linked' 
                    });
                }
            }
        }

        return Response.json({ 
            success: true, 
            conversationsFound: conversations?.length || 0,
            totalUsers: allUsers.length,
            errors,
            results 
        });

    } catch (error) {
        console.error('Error syncing WhatsApp conversations:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});