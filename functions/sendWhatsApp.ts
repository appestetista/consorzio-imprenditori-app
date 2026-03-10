import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, message } = await req.json();

    if (!to || !message) {
      return Response.json({ error: 'Parametri mancanti: to, message' }, { status: 400 });
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      return Response.json({ error: 'Twilio non configurato' }, { status: 500 });
    }

    // Normalizza il numero: rimuovi spazi e aggiungi whatsapp: prefix
    let cleanNumber = to.replace(/\s+/g, '').replace(/[^+\d]/g, '');
    // Se non inizia con +, aggiungi +39 (Italia)
    if (!cleanNumber.startsWith('+')) {
      cleanNumber = '+39' + cleanNumber;
    }
    const whatsappTo = `whatsapp:${cleanNumber}`;
    const whatsappFrom = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`;

    // Invia via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const body = new URLSearchParams({
      To: whatsappTo,
      From: whatsappFrom,
      Body: message
    });

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Twilio error:', result);
      return Response.json({ error: result.message || 'Errore invio WhatsApp', details: result }, { status: response.status });
    }

    return Response.json({ success: true, sid: result.sid });
  } catch (error) {
    console.error('sendWhatsApp error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});