import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Ottieni tutte le aste salvate con promemoria attivo
    const asteSalvate = await base44.asServiceRole.entities.AstaSalvata.filter({ promemoria_attivo: true });
    
    if (asteSalvate.length === 0) {
      return Response.json({ message: 'Nessuna asta con promemoria attivo', sent: 0 });
    }
    
    // Ottieni tutte le aste per avere i dettagli
    const allAste = await base44.asServiceRole.entities.AstaImmobiliare.filter({ is_active: true });
    const asteMap = new Map(allAste.map(a => [a.id, a]));
    
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    
    let notificheInviate = 0;
    let emailInviate = 0;
    
    for (const salvata of asteSalvate) {
      const asta = asteMap.get(salvata.asta_id);
      if (!asta || !asta.data_asta) continue;
      
      const dataAsta = new Date(asta.data_asta);
      dataAsta.setHours(0, 0, 0, 0);
      
      const giorniMancanti = Math.ceil((dataAsta - oggi) / (1000 * 60 * 60 * 24));
      
      // Skip se l'asta è già passata
      if (giorniMancanti < 0) continue;
      
      const giorniPromemoria = salvata.giorni_promemoria || [7, 3, 1];
      const promemoriaInviati = salvata.promemoria_inviati || [];
      
      // Controlla se dobbiamo inviare un promemoria per oggi
      for (const giorni of giorniPromemoria) {
        if (giorniMancanti === giorni && !promemoriaInviati.includes(giorni)) {
          const titolo = `⏰ Promemoria Asta - ${giorni} ${giorni === 1 ? 'giorno' : 'giorni'}`;
          const contenuto = `L'asta "${asta.titolo}" scade tra ${giorni} ${giorni === 1 ? 'giorno' : 'giorni'}! Prezzo base: ${new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(asta.prezzo_base)}`;
          
          // Invia notifica in-app
          await base44.asServiceRole.entities.Notification.create({
            user_email: salvata.user_email,
            type: 'event',
            title: titolo,
            content: contenuto,
            reference_id: asta.id,
            is_read: false
          });
          
          // Invia email
          const appUrl = Deno.env.get('APP_URL') || '';
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: salvata.user_email,
              subject: `⏰ Promemoria Asta - Scadenza tra ${giorni} ${giorni === 1 ? 'giorno' : 'giorni'}`,
              body: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #d4af37;">⏰ Promemoria Asta</h2>
                  <p style="font-size: 16px; color: #333;">
                    Si sta avvicinando la scadenza dell'asta immobiliare da te salvata nel pannello aste dentro il <strong>Consorzio Imprenditori</strong>.
                  </p>
                  <p style="font-size: 16px; color: #333;">
                    Se sei interessato a partecipare, attivati per la partecipazione guardando i documenti necessari.
                  </p>
                  <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>🏠 Asta:</strong> ${asta.titolo}</p>
                    <p style="margin: 5px 0;"><strong>📍 Località:</strong> ${asta.localita || 'N/D'}</p>
                    <p style="margin: 5px 0;"><strong>📅 Data asta:</strong> ${new Date(asta.data_asta).toLocaleDateString('it-IT')}</p>
                    <p style="margin: 5px 0;"><strong>⏳ Giorni rimanenti:</strong> ${giorni}</p>
                    <p style="margin: 5px 0;"><strong>💰 Prezzo base:</strong> ${new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(asta.prezzo_base)}</p>
                  </div>
                  <p style="margin-top: 20px;">
                    <a href="https://695e2f74bb7d2636b5606a98.base44.app/AsteSalvate" style="background: #d4af37; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Vai alle Aste</a>
                  </p>
                  <p style="color: #888; font-size: 12px; margin-top: 30px;">Questa email è stata inviata automaticamente dal sistema di notifiche del Consorzio Imprenditori.</p>
                </div>
              `
            });
            emailInviate++;
          } catch (emailErr) {
            console.error('Errore invio email:', emailErr);
          }
          
          // Aggiorna i promemoria inviati
          await base44.asServiceRole.entities.AstaSalvata.update(salvata.id, {
            promemoria_inviati: [...promemoriaInviati, giorni]
          });
          
          notificheInviate++;
        }
      }
    }
    
    return Response.json({ 
      message: `Promemoria aste completato`, 
      sent: notificheInviate,
      emailSent: emailInviate,
      checked: asteSalvate.length
    });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});