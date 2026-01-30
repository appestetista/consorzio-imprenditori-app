import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { conversation_id } = await req.json();
        
        if (!conversation_id) {
            return Response.json({ error: 'conversation_id required' }, { status: 400 });
        }

        // Aggiorna l'utente con il conversation_id WhatsApp
        await base44.asServiceRole.entities.User.update(user.id, {
            whatsapp_conversation_id: conversation_id,
            whatsapp_enabled: true
        });

        return Response.json({ 
            success: true, 
            message: 'WhatsApp notifications enabled' 
        });

    } catch (error) {
        console.error('Error registering WhatsApp user:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});