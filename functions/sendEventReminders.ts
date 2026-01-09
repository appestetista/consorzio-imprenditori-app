import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        console.log('[Promemoria Eventi] Job avviato:', new Date().toISOString());
        
        // Calcola data limite: oggi + 48 ore
        const now = new Date();
        const bloccoLimite = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        
        console.log('[Promemoria Eventi] Cerca eventi dopo:', bloccoLimite.toISOString());
        
        // 1. Recupera tutti gli eventi futuri (dopo le 48 ore)
        const tuttiEventi = await base44.asServiceRole.entities.Event.list('-date');
        
        const eventiFuturi = tuttiEventi.filter(evento => {
            const dataEvento = new Date(evento.date + 'T' + evento.time);
            return dataEvento > bloccoLimite;
        });
        
        console.log(`[Promemoria Eventi] Eventi futuri trovati: ${eventiFuturi.length}`);
        
        if (eventiFuturi.length === 0) {
            return Response.json({ 
                success: true, 
                message: 'Nessun evento futuro da processare',
                eventi_processati: 0,
                notifiche_inviate: 0
            });
        }
        
        let notificheInviate = 0;
        let emailInviate = 0;
        
        // 2. Per ogni evento, trova utenti senza risposta
        for (const evento of eventiFuturi) {
            console.log(`[Promemoria Eventi] Processo evento: ${evento.title} (${evento.date})`);
            
            // Trova tutte le partecipazioni per questo evento
            const partecipazioni = await base44.asServiceRole.entities.PartecipazioniEvento.filter({
                evento_id: evento.id,
                stato: 'nessuna_risposta'
            });
            
            console.log(`[Promemoria Eventi] Utenti senza risposta: ${partecipazioni.length}`);
            
            // 3. Per ogni utente senza risposta, invia notifica ed email
            for (const partecipazione of partecipazioni) {
                try {
                    const userEmail = partecipazione.user_email;
                    
                    // Recupera informazioni utente per email personalizzata
                    const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
                    const user = users[0];
                    
                    if (!user) {
                        console.log(`[Promemoria Eventi] Utente non trovato: ${userEmail}`);
                        continue;
                    }
                    
                    const nomeUtente = user.company_name || user.full_name || userEmail;
                    const dataEventoFormattata = new Date(evento.date).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                    });
                    
                    // Crea notifica in-app
                    await base44.asServiceRole.entities.Notification.create({
                        user_email: userEmail,
                        type: 'event',
                        title: 'Promemoria: Conferma presenza',
                        content: `Non hai ancora risposto all'evento "${evento.title}" del ${dataEventoFormattata} alle ore ${evento.time}. Ti ricordiamo di confermare la tua partecipazione.`,
                        reference_id: evento.id,
                        is_read: false
                    });
                    
                    notificheInviate++;
                    
                    // Invia email
                    await base44.asServiceRole.integrations.Core.SendEmail({
                        to: userEmail,
                        from_name: 'Consorzio Imprenditori',
                        subject: `Promemoria: Conferma presenza evento "${evento.title}"`,
                        body: `
Gentile ${nomeUtente},

Non hai ancora confermato la tua presenza all'evento:

📅 **${evento.title}**
📍 ${evento.location}
🕐 ${dataEventoFormattata} alle ore ${evento.time}

Ti ricordiamo che potrai confermare o rifiutare la partecipazione fino a 48 ore prima dell'evento.

Accedi all'app per confermare la tua presenza.

Cordiali saluti,
Consorzio Imprenditori
                        `.trim()
                    });
                    
                    emailInviate++;
                    
                    console.log(`[Promemoria Eventi] Notifica inviata a: ${userEmail}`);
                    
                } catch (error) {
                    console.error(`[Promemoria Eventi] Errore invio a ${partecipazione.user_email}:`, error.message);
                }
            }
        }
        
        const risultato = {
            success: true,
            timestamp: new Date().toISOString(),
            eventi_processati: eventiFuturi.length,
            notifiche_inviate: notificheInviate,
            email_inviate: emailInviate
        };
        
        console.log('[Promemoria Eventi] Completato:', risultato);
        
        return Response.json(risultato);
        
    } catch (error) {
        console.error('[Promemoria Eventi] Errore generale:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});