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
          // Invia notifica
          await base44.asServiceRole.entities.Notification.create({
            user_email: salvata.user_email,
            type: 'event',
            title: `⏰ Promemoria Asta - ${giorni} ${giorni === 1 ? 'giorno' : 'giorni'}`,
            content: `L'asta "${asta.titolo}" scade tra ${giorni} ${giorni === 1 ? 'giorno' : 'giorni'}! Prezzo base: ${new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(asta.prezzo_base)}`,
            reference_id: asta.id,
            is_read: false
          });
          
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
      checked: asteSalvate.length
    });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});