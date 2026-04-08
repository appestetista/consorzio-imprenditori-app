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

    const {
      fatturato_annuo,
      costi_deducibili,
      regime_fiscale,
      forma_giuridica,
      numero_dipendenti,
      settore,
      regione,
      codice_ateco
    } = await req.json();

    if (!fatturato_annuo || !regime_fiscale || !forma_giuridica) {
      return Response.json({ error: 'Fatturato, regime fiscale e forma giuridica sono obbligatori' }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();

    const prompt = `Sei un commercialista italiano esperto di fiscalità aziendale.

REGOLE FONDAMENTALI TASSATIVE:
- Basa i calcoli ESCLUSIVAMENTE sulla normativa fiscale italiana VIGENTE al ${currentYear}.
- NON INVENTARE MAI aliquote, scaglioni, importi o norme che non esistono nella legislazione italiana reale.
- Usa SOLO aliquote e scaglioni fiscali REALI e AGGIORNATI (IRPEF, IRES, IRAP, contributi INPS, ecc.).
- Se non sei sicuro al 100% di un dato fiscale, NON includerlo. Meglio omettere che inventare.
- I calcoli devono essere matematicamente corretti e verificabili.
- Indica SEMPRE la fonte normativa di ogni aliquota o parametro usato.

DATI AZIENDA:
- Fatturato annuo: €${fatturato_annuo}
- Costi deducibili stimati: €${costi_deducibili || 0}
- Regime fiscale: ${regime_fiscale}
- Forma giuridica: ${forma_giuridica}
- Numero dipendenti: ${numero_dipendenti || 'non specificato'}
- Settore/Codice ATECO: ${codice_ateco || settore || 'non specificato'}
- Regione: ${regione || 'non specificata'}

ISTRUZIONI:
1. Calcola il reddito imponibile in base al regime fiscale scelto
2. Per il regime forfettario: usa il coefficiente di redditività REALE associato al codice ATECO
3. Per il regime ordinario: calcola ricavi - costi deducibili
4. Calcola TUTTE le imposte applicabili: IRPEF (con scaglioni reali ${currentYear}), IRES (se società), IRAP, addizionali regionali e comunali stimate
5. Calcola i contributi previdenziali INPS applicabili alla forma giuridica
6. Calcola il carico fiscale TOTALE e la pressione fiscale percentuale
7. Se il regime è forfettario, indica anche l'imposta sostitutiva (5% o 15%) e quando si applica ciascuna
8. Fornisci suggerimenti concreti e reali per ottimizzare il carico fiscale

FORMATO OUTPUT - Rispondi con un JSON con questa struttura ESATTA:
{
  "reddito_imponibile": numero,
  "dettaglio_calcolo_reddito": "stringa che spiega come è stato calcolato il reddito imponibile",
  "imposte": [
    {
      "nome": "nome imposta (es: IRPEF, IRES, IRAP, Imposta sostitutiva)",
      "base_imponibile": numero,
      "aliquota_info": "dettaglio aliquota o scaglioni applicati con riferimento normativo",
      "importo": numero,
      "note": "eventuali note"
    }
  ],
  "contributi_inps": {
    "tipo_gestione": "stringa (es: Gestione Separata, Artigiani/Commercianti, ecc.)",
    "base_imponibile": numero,
    "aliquota": "percentuale con riferimento normativo",
    "importo": numero,
    "note": "eventuali note"
  },
  "totale_imposte": numero,
  "totale_contributi": numero,
  "totale_carico_fiscale": numero,
  "pressione_fiscale_percentuale": numero,
  "reddito_netto_stimato": numero,
  "suggerimenti": ["array di suggerimenti concreti per ottimizzare"],
  "avvertenze": ["array di avvertenze importanti (es: questa è una stima, consultare un commercialista)"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Sei un commercialista italiano esperto. Rispondi SOLO in formato JSON valido. NON INVENTARE dati fiscali. Usa solo aliquote e norme REALI vigenti al " + currentYear + ". I calcoli devono essere matematicamente corretti."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const content = response.choices[0].message.content;
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      return Response.json({ error: 'Errore parsing risposta AI', raw: content }, { status: 500 });
    }

    return Response.json({
      success: true,
      simulazione: parsed
    });

  } catch (error) {
    console.error('Errore simulateFiscal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});