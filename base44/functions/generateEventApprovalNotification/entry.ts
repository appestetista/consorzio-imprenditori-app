import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import OpenAI from 'npm:openai';

const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { event } = await req.json();

        if (!event || !event.title || !event.date || !event.time || !event.location) {
            return Response.json({ error: 'Dati evento incompleti' }, { status: 400 });
        }

        const prompt = `Sei un redattore istituzionale del Consorzio.

CONTESTO:
Un evento è stato approvato dall'amministrazione ed è ora ufficialmente confermato nel calendario del Consorzio.

INPUT:
${JSON.stringify({
    title: event.title,
    date: event.date,
    time: event.time,
    location: event.location
})}

ISTRUZIONI:
1. Scrivi una notifica informativa per gli utenti destinatari
2. Massimo 300 caratteri
3. Linguaggio chiaro, professionale e istituzionale
4. Nessuna enfasi commerciale o promozionale
5. Includi titolo, data, orario e luogo

OUTPUT:
Restituisci ESCLUSIVAMENTE il testo della notifica, senza virgolette, senza JSON, senza formattazione aggiuntiva.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "Sei un redattore istituzionale. Rispondi solo con il testo richiesto, nient'altro." },
                { role: "user", content: prompt }
            ],
            max_tokens: 150,
            temperature: 0.3
        });

        const notificationText = response.choices[0].message.content.trim();

        return Response.json({ 
            success: true, 
            notification: notificationText 
        });

    } catch (error) {
        console.error('Error generating notification:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});