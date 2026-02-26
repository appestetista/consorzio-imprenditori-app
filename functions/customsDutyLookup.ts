import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { country_code, country_name, hs_code, product_description } = await req.json();

    if (!country_code || !hs_code) {
      return Response.json({ error: 'country_code and hs_code are required' }, { status: 400 });
    }

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Sei un esperto doganale internazionale. Devi fornire una GUIDA OPERATIVA REALE per trovare dazi doganali, IVA/GST e imposte di importazione per il paese ${country_name} (${country_code}), codice HS ${hs_code}${product_description ? ` (${product_description})` : ''}.

REGOLE TASSATIVE:
- Cerca DIRETTAMENTE sui siti ufficiali governativi/istituzionali del paese.
- ESCLUDI: siti commerciali, blog, marketplace, fonti non governative.
- NON inventare URL. Fornisci SOLO URL che sai ESISTERE REALMENTE e che sono governativi/istituzionali.
- NON stimare, approssimare o inventare percentuali di dazi/IVA. Se non trovi il dato esatto, scrivi "Consultare direttamente il sito indicato".
- NON usare frasi come "di solito", "generalmente", "in media".
- Se un dato non e reperibile, dichiaralo esplicitamente.

STRUTTURA OBBLIGATORIA DELLA RISPOSTA:

1. FONTE UFFICIALE:
- Nome esatto dell ente doganale/fiscale nazionale (es. Customs Authority, Revenue Service, Ministry of Finance)
- URL diretto alla sezione tariffaria (SOLO se governativo e VERIFICATO)
- URL diretto alla homepage dell ente
- Classificazione: "Ufficiale governativo" o "Istituzionale"
- Se esiste un portale specifico per la ricerca tariffe online, indicalo

2. COME TROVARE I DAZI (percorso di navigazione):
- Elenco NUMERATO dei passaggi ESATTI per navigare il sito
- Dove inserire il codice HS
- Dove leggere il dazio applicabile (MFN, preferenziale)
- Dove leggere IVA/GST
- Dove trovare eventuali imposte aggiuntive (excise duty, cess, ecc.)
- Se esiste anche il portale Access2Markets EU (https://trade.ec.europa.eu/access-to-markets/), indicare come usarlo come fonte complementare

3. DATI TROVATI (solo se visibili CHIARAMENTE sul sito ufficiale):
- Dazio MFN per HS ${hs_code} (solo se trovato con certezza)
- Dazio preferenziale EU (se applicabile accordo commerciale)
- IVA/GST standard
- Altre imposte (excise, cess, countervailing duty)
- Fonte esatta del dato (URL specifico o sezione del sito)
- Se NON trovato: scrivere "Non reperito - consultare direttamente [sito]"

4. AGGIORNAMENTI:
- URL della sezione aggiornamenti/notices/circolari del sito doganale
- Dove vengono pubblicati i cambi tariffari (gazzetta ufficiale, sezione specifica)
- Frequenza tipica di aggiornamento (solo se dichiarata dal sito)
- Data ultimo aggiornamento visibile (se disponibile, altrimenti "Non indicata")

5. LIMITI E AVVERTENZE:
- Cosa il sito NON mostra (es. dazi anti-dumping specifici, accordi bilaterali)
- Se servono calcoli manuali aggiuntivi
- Se e necessario un broker doganale o importatore locale per completare l informazione
- Se il sistema tariffario e complesso (sottovoci, eccezioni)
- Lingue disponibili sul sito

6. RISORSE COMPLEMENTARI:
- Portali internazionali utili (WTO Tariff Download Facility, Access2Markets, UNCTAD TRAINS)
- Camera di commercio italiana nel paese (se esistente)
- ICE ufficio locale (se esistente)

Per il paese ${country_name}: cerca il VERO sito dell autorita doganale nazionale.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          fonte_ufficiale: {
            type: "object",
            properties: {
              ente_nome: { type: "string" },
              ente_nome_locale: { type: ["string", "null"] },
              url_tariffario: { type: ["string", "null"] },
              url_homepage: { type: ["string", "null"] },
              classificazione: { type: "string", enum: ["Ufficiale governativo", "Istituzionale", "Non trovato"] },
              portale_ricerca_tariffe: { type: ["string", "null"] },
              note: { type: ["string", "null"] }
            }
          },
          percorso_navigazione: {
            type: "object",
            properties: {
              passaggi: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    step: { type: "number" },
                    azione: { type: "string" },
                    dettaglio: { type: ["string", "null"] }
                  }
                }
              },
              dove_inserire_hs: { type: ["string", "null"] },
              dove_leggere_dazio: { type: ["string", "null"] },
              dove_leggere_iva: { type: ["string", "null"] },
              dove_imposte_aggiuntive: { type: ["string", "null"] },
              access2markets_guida: { type: ["string", "null"] }
            }
          },
          dati_trovati: {
            type: "object",
            properties: {
              dazio_mfn: { type: ["string", "null"] },
              dazio_mfn_fonte: { type: ["string", "null"] },
              dazio_preferenziale_eu: { type: ["string", "null"] },
              dazio_preferenziale_fonte: { type: ["string", "null"] },
              accordo_commerciale: { type: ["string", "null"] },
              iva_gst: { type: ["string", "null"] },
              iva_gst_tipo: { type: ["string", "null"] },
              iva_gst_fonte: { type: ["string", "null"] },
              altre_imposte: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    nome: { type: "string" },
                    valore: { type: ["string", "null"] },
                    fonte: { type: ["string", "null"] }
                  }
                }
              },
              dato_verificato: { type: "boolean" },
              nota_verifica: { type: ["string", "null"] }
            }
          },
          aggiornamenti: {
            type: "object",
            properties: {
              url_aggiornamenti: { type: ["string", "null"] },
              sezione_nome: { type: ["string", "null"] },
              dove_pubblicati: { type: ["string", "null"] },
              frequenza: { type: ["string", "null"] },
              ultimo_aggiornamento: { type: ["string", "null"] },
              gazzetta_ufficiale: { type: ["string", "null"] }
            }
          },
          limiti: {
            type: "object",
            properties: {
              cosa_non_mostra: { type: "array", items: { type: "string" } },
              calcoli_manuali_necessari: { type: ["string", "null"] },
              broker_necessario: { type: "boolean" },
              broker_nota: { type: ["string", "null"] },
              complessita_tariffaria: { type: ["string", "null"] },
              lingue_disponibili: { type: "array", items: { type: "string" } }
            }
          },
          risorse_complementari: {
            type: "array",
            items: {
              type: "object",
              properties: {
                nome: { type: "string" },
                url: { type: ["string", "null"] },
                tipo: { type: "string" }
              }
            }
          },
          country_code: { type: "string" },
          hs_code: { type: "string" },
          timestamp: { type: "string" }
        }
      }
    });

    result.country_code = country_code;
    result.hs_code = hs_code;
    result.timestamp = new Date().toISOString();

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});