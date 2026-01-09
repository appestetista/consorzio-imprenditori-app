import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        console.log('[Reminder Eventi] Job avviato:', new Date().toISOString());
        
        // 1. Recupera data e ora attuali
        const now = new Date();
        const bloccoLimite = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        const treGiorniFa = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        
        console.log('[Reminder Eventi] Now:', now.toISOString());
        console.log('[Reminder Eventi] Blocco limite (now + 48h):', bloccoLimite.toISOString());
        console.log('[Reminder Eventi] Tre giorni fa:', treGiorniFa.toISOString());
        
        // 2. Recupera tutti gli eventi futuri
        const tuttiEventi = await base44.asServiceRole.entities.Event.list('-date');
        
        const eventiFuturi = tuttiEventi.filter(evento => {
            const dataEvento = new Date(evento.date + 'T' + evento.time);
            return dataEvento > bloccoLimite;
        });
        
        console.log(`[Reminder Eventi] Eventi futuri (oltre 48h): ${eventiFuturi.length}`);
        
        if (eventiFuturi.length === 0) {
            return Response.json({ 
                success: true, 
                message: 'Nessun evento futuro oltre le 48 ore',
                eventi_processati: 0,
                reminder_inviati: 0
            });
        }
        
        let reminderInviati = 0;
        
        // 3. Per ogni evento futuro, trova partecipazioni pending
        for (const evento of eventiFuturi) {
            console.log(`[Reminder Eventi] Elaboro evento: ${evento.title} (${evento.date} ${evento.time})`);
            
            // Trova partecipazioni con stato "nessuna_risposta" (pending)
            const partecipazioniPending = await base44.asServiceRole.entities.PartecipazioniEvento.filter({
                evento_id: evento.id,
                stato: 'nessuna_risposta'
            });
            
            console.log(`[Reminder Eventi] Partecipazioni pending: ${partecipazioniPending.length}`);
            
            for (const partecipazione of partecipazioniPending) {
                try {
                    // 3. Controlla se deve inviare reminder
                    const lastReminder = partecipazione.last_reminder_sent_at 
                        ? new Date(partecipazione.last_reminder_sent_at) 
                        : null;
                    
                    // Se last_reminder_sent_at è NULL OPPURE last_reminder_sent_at <= now - 3 giorni
                    const deveInviare = !lastReminder || lastReminder <= treGiorniFa;
                    
                    if (!deveInviare) {
                        console.log(`[Reminder Eventi] Skip ${partecipazione.user_email}: ultimo reminder troppo recente`);
                        continue;
                    }
                    
                    // Recupera dati utente
                    const users = await base44.asServiceRole.entities.User.filter({ 
                        email: partecipazione.user_email 
                    });
                    const user = users[0];
                    
                    if (!user) {
                        console.log(`[Reminder Eventi] Utente non trovato: ${partecipazione.user_email}`);
                        continue;
                    }
                    
                    const nomeUtente = user.company_name || user.full_name || partecipazione.user_email;
                    
                    // 4. CREA notifica in-app con sound
                    await base44.asServiceRole.entities.Notification.create({
                        user_email: partecipazione.user_email,
                        type: 'event_reminder',
                        title: 'Conferma partecipazione evento',
                        content: `Conferma o meno la tua partecipazione all'evento "${evento.title}" del ${new Date(evento.date).toLocaleDateString('it-IT')} alle ore ${evento.time}.`,
                        reference_id: evento.id,
                        is_read: false
                    });
                    
                    // 5. INVIA email automatica
                    await base44.asServiceRole.integrations.Core.SendEmail({
                        to: partecipazione.user_email,
                        from_name: 'Consorzio Imprenditori',
                        subject: 'Conferma partecipazione evento Consorzio',
                        body: `
Gentile ${nomeUtente},

Ti ricordiamo di confermare o meno la tua partecipazione al prossimo evento del Consorzio.

📅 Evento: ${evento.title}
📍 Luogo: ${evento.location}
🕐 Data: ${new Date(evento.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })} alle ore ${evento.time}

Accedi all'app per confermare la presenza.

Cordiali saluti,
Consorzio Imprenditori
                        `.trim()
                    });
                    
                    // 6. AGGIORNA la partecipazione
                    await base44.asServiceRole.entities.PartecipazioniEvento.update(partecipazione.id, {
                        last_reminder_sent_at: now.toISOString(),
                        reminder_count: (partecipazione.reminder_count || 0) + 1
                    });
                    
                    reminderInviati++;
                    
                    console.log(`[Reminder Eventi] ✅ Reminder inviato a: ${partecipazione.user_email} (count: ${(partecipazione.reminder_count || 0) + 1})`);
                    
                } catch (error) {
                    console.error(`[Reminder Eventi] ❌ Errore per ${partecipazione.user_email}:`, error.message);
                }
            }
        }
        
        const risultato = {
            success: true,
            timestamp: now.toISOString(),
            eventi_processati: eventiFuturi.length,
            reminder_inviati: reminderInviati
        };
        
        console.log('[Reminder Eventi] ✅ Job completato:', risultato);
        
        return Response.json(risultato);
        
    } catch (error) {
        console.error('[Reminder Eventi] ❌ Errore generale:', error);
        return Response.json({ 
            success: false, 
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});