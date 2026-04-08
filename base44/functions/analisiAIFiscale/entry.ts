import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
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

    const { simulazione_id } = await req.json();
    if (!simulazione_id) {
      return Response.json({ error: 'simulazione_id obbligatorio' }, { status: 400 });
    }

    // Carica la simulazione dal DB
    const simulazioni = await base44.asServiceRole.entities.SimulazioneFiscale.filter({ id: simulazione_id });
    if (simulazioni.length === 0) {
      return Response.json({ error: 'Simulazione non trovata' }, { status: 404 });
    }
    const sim = simulazioni[0];

    if (sim.user_email && sim.user_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: accesso non autorizzato a questa simulazione' }, { status: 403 });
    }

    const prompt = `Sei un consulente fiscale italiano esperto.

Ti vengono forniti i RISULTATI GIÀ CALCOLATI di una simulazione fiscale. I numeri sono DEFINITIVI e NON devono essere ricalcolati né modificati.

REGOLE TASSATIVE:
1. NON ricalcolare le imposte. I numeri forniti sono corretti.
2. NON modificare nessun importo.
3. Fornisci SOLO interpretazione tecnica e suggerimenti generali.
4. NON inventare norme o leggi inesistenti.

DATI DELLA SIMULAZIONE:
- Regime: ${sim.regime}
- Fatturato: €${sim.fatturato}
- Costi deducibili: €${sim.costi_deducibili || 0}
- Utile: €${sim.utile}
- Reddito imponibile: €${sim.reddito_imponibile}
- Imposte totali: €${sim.imposte_totali}
- Netto finale: €${sim.netto_finale}
- Distribuzione dividendi: ${sim.distribuzione_dividendi ? 'Sì' : 'No'}

DETTAGLIO CALCOLO:
${sim.dettaglio_calcolo}

RISPONDI IN ITALIANO con:
1. Una breve interpretazione dei risultati (2-3 frasi)
2. Eventuali osservazioni sulla pressione fiscale
3. 2-3 suggerimenti generali per ottimizzare il carico fiscale (senza inventare norme)
4. Se il regime scelto sembra adatto o se potrebbe essere utile valutare alternative

Mantieni il tono professionale ma comprensibile.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Sei un consulente fiscale italiano. NON ricalcolare mai i numeri forniti. Fornisci solo interpretazione e suggerimenti. Rispondi in italiano."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
    });

    const analisi = response.choices[0].message.content;

    // Salva l'analisi sulla simulazione
    await base44.asServiceRole.entities.SimulazioneFiscale.update(simulazione_id, {
      analisi_ai: analisi
    });

    return Response.json({
      success: true,
      analisi
    });

  } catch (error) {
    console.error('Errore analisiAIFiscale:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});