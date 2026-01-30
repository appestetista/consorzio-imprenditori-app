import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { event } = await req.json();
        
        if (!event) {
            return Response.json({ error: 'Event data required' }, { status: 400 });
        }

        // Trova tutti gli utenti che devono ricevere la notifica
        const allUsers = await base44.asServiceRole.entities.User.list();
        
        // Filtra utenti in base alla zona dell'evento
        const targetUsers = allUsers.filter(user => {
            // Salta utenti senza zona o bloccati
            if (user.is_blocked || !user.zona) return false;
            
            // Se l'evento è per tutte le zone
            if (!event.zone_visibility || event.zone_visibility.length === 0) {
                return true;
            }
            
            // Controlla se c'è configurazione per tutte le zone
            const allZonesConfig = event.zone_visibility.find(zv => zv.zone === '__all__');
            if (allZonesConfig) {
                const target = allZonesConfig.target || 'all';
                if (target === 'all') return true;
                if (target === 'users' && user.user_type === 'utente') return true;
                if (target === 'consultants' && user.user_type === 'consulente') return true;
                return false;
            }
            
            // Controlla la zona specifica dell'utente
            const zoneConfig = event.zone_visibility.find(zv => zv.zone === user.zona);
            if (!zoneConfig) return false;
            
            const target = zoneConfig.target || 'all';
            if (target === 'all') return true;
            if (target === 'users' && user.user_type === 'utente') return true;
            if (target === 'consultants' && user.user_type === 'consulente') return true;
            
            return false;
        });

        // Prepara il messaggio
        const eventDate = new Date(event.date).toLocaleDateString('it-IT', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
        });
        
        const message = `🗓️ *Nuovo Evento del Consorzio*\n\n*${event.title}*\n📅 ${eventDate} ore ${event.time}\n📍 ${event.location}\n\n${event.description || ''}\n\nAccedi all'app per confermare la tua partecipazione!`;

        // Invia notifica a ogni utente che ha una conversazione WhatsApp attiva
        const results = [];
        for (const user of targetUsers) {
            if (user.whatsapp_conversation_id) {
                try {
                    // Recupera la conversazione esistente
                    const conversation = await base44.agents.getConversation(user.whatsapp_conversation_id);
                    if (conversation) {
                        await base44.agents.addMessage(conversation, {
                            role: "assistant",
                            content: message
                        });
                        results.push({ email: user.email, status: 'sent' });
                    }
                } catch (e) {
                    results.push({ email: user.email, status: 'error', error: e.message });
                }
            }
        }

        return Response.json({ 
            success: true, 
            targetUsers: targetUsers.length,
            notificationsSent: results.filter(r => r.status === 'sent').length,
            results 
        });

    } catch (error) {
        console.error('Error sending WhatsApp notifications:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});