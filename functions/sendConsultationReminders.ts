import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Usa service role per accedere a tutti i dati
    const bookings = await base44.asServiceRole.entities.ConsultationBooking.filter({
      status: 'confirmed'
    });
    
    const consultants = await base44.asServiceRole.entities.Consultant.list();
    
    const now = new Date();
    const results = {
      reminders_24h_sent: 0,
      reminders_1h_sent: 0,
      errors: []
    };
    
    for (const booking of bookings) {
      if (!booking.scheduled_date) continue;
      
      const scheduledDate = new Date(booking.scheduled_date);
      const hoursUntil = (scheduledDate - now) / (1000 * 60 * 60);
      
      const consultant = consultants.find(c => c.id === booking.consultant_id);
      const consultantName = consultant?.name || 'Consulente';
      const consultantCategory = consultant?.category || '';
      
      try {
        // Promemoria 24 ore prima (tra 23 e 25 ore)
        if (hoursUntil >= 23 && hoursUntil <= 25 && !booking.reminder_24h_sent) {
          // Notifica all'utente
          await base44.asServiceRole.entities.Notification.create({
            user_email: booking.user_email,
            type: 'consultation',
            title: 'Promemoria: consulenza domani',
            content: `La tua consulenza con ${consultantName} (${consultantCategory}) è programmata per domani alle ${scheduledDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}.`,
            is_read: false,
            reference_id: booking.id
          });
          
          // Notifica al consulente
          if (consultant?.email) {
            await base44.asServiceRole.entities.Notification.create({
              user_email: consultant.email,
              type: 'consultation',
              title: 'Promemoria: consulenza domani',
              content: `Hai una consulenza programmata per domani alle ${scheduledDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} con un cliente.`,
              is_read: false,
              reference_id: booking.id
            });
          }
          
          await base44.asServiceRole.entities.ConsultationBooking.update(booking.id, {
            reminder_24h_sent: true
          });
          
          results.reminders_24h_sent++;
        }
        
        // Promemoria 1 ora prima (tra 0.5 e 1.5 ore)
        if (hoursUntil >= 0.5 && hoursUntil <= 1.5 && !booking.reminder_1h_sent) {
          // Notifica all'utente
          await base44.asServiceRole.entities.Notification.create({
            user_email: booking.user_email,
            type: 'consultation',
            title: 'Promemoria: consulenza tra 1 ora',
            content: `La tua consulenza con ${consultantName} (${consultantCategory}) inizia tra circa 1 ora.`,
            is_read: false,
            reference_id: booking.id
          });
          
          // Notifica al consulente
          if (consultant?.email) {
            await base44.asServiceRole.entities.Notification.create({
              user_email: consultant.email,
              type: 'consultation',
              title: 'Promemoria: consulenza tra 1 ora',
              content: `La tua consulenza con un cliente inizia tra circa 1 ora.`,
              is_read: false,
              reference_id: booking.id
            });
          }
          
          await base44.asServiceRole.entities.ConsultationBooking.update(booking.id, {
            reminder_1h_sent: true
          });
          
          results.reminders_1h_sent++;
        }
      } catch (error) {
        results.errors.push({ bookingId: booking.id, error: error.message });
      }
    }
    
    return Response.json({ 
      success: true, 
      ...results,
      processed: bookings.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});