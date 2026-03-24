import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verifica autenticazione admin (per chiamate manuali) o scheduled
    const isScheduled = req.headers.get('x-scheduled-task') === 'true';
    
    if (!isScheduled) {
      const user = await base44.auth.me();
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    const now = new Date();
    const hours48Ago = new Date(now.getTime() - (48 * 60 * 60 * 1000));

    // Ottieni tutti gli eventi futuri con reminder abilitato
    const events = await base44.asServiceRole.entities.Event.filter({});
    const futureEvents = events.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate >= now && e.reminder_enabled === true;
    });

    let remindersSent = 0;

    for (const event of futureEvents) {
      // Ottieni tutte le partecipazioni per questo evento che non hanno risposto
      const partecipazioni = await base44.asServiceRole.entities.PartecipazioniEvento.filter({
        evento_id: event.id,
        stato: 'nessuna_risposta'
      });

      for (const partecipazione of partecipazioni) {
        // Verifica se sono passate 48 ore dall'ultimo reminder (o dalla creazione)
        const lastReminderDate = partecipazione.last_reminder_sent_at 
          ? new Date(partecipazione.last_reminder_sent_at)
          : new Date(partecipazione.created_date);
        
        if (lastReminderDate <= hours48Ago) {
          // Elimina eventuali notifiche esistenti per questo evento/utente
          const existingNotifications = await base44.asServiceRole.entities.Notification.filter({
            user_email: partecipazione.user_email,
            type: 'event',
            reference_id: event.id
          });

          for (const notif of existingNotifications) {
            await base44.asServiceRole.entities.Notification.delete(notif.id);
          }

          // Crea nuova notifica
          await base44.asServiceRole.entities.Notification.create({
            user_email: partecipazione.user_email,
            type: 'event',
            title: 'Promemoria: Conferma partecipazione',
            content: `Non hai ancora risposto all'invito per "${event.title}". Conferma la tua partecipazione!`,
            reference_id: event.id,
            is_read: false
          });

          // Aggiorna la partecipazione con la data dell'ultimo reminder
          await base44.asServiceRole.entities.PartecipazioniEvento.update(partecipazione.id, {
            last_reminder_sent_at: now.toISOString(),
            reminder_count: (partecipazione.reminder_count || 0) + 1
          });

          remindersSent++;
        }
      }
    }

    return Response.json({ 
      success: true, 
      remindersSent,
      message: `Inviati ${remindersSent} promemoria`
    });

  } catch (error) {
    console.error('Error sending reminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});