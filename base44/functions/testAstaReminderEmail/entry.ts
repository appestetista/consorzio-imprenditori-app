import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verifica che sia un admin
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    
    const appUrl = Deno.env.get('APP_URL') || '';
    const giorni = 3;
    
    // Dati di test
    const asta = {
      titolo: "Appartamento Via Roma 123 - Test",
      localita: "Pesaro (PU)",
      data_asta: new Date(Date.now() + giorni * 24 * 60 * 60 * 1000).toISOString(),
      prezzo_base: 85000
    };
    
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      subject: `⏰ Promemoria Asta - Scadenza tra ${giorni} giorni`,
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
            <p style="margin: 5px 0;"><strong>📍 Località:</strong> ${asta.localita}</p>
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
    
    return Response.json({ 
      success: true, 
      message: `Email di test inviata a ${user.email}` 
    });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});