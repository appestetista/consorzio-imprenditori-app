import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const country_code = body.country_code;
    const country_name = body.country_name;
    const hs_code = body.hs_code;
    const product_description = body.product_description || '';

    if (!country_code || !hs_code) {
      return Response.json({ error: 'country_code and hs_code are required' }, { status: 400 });
    }

    const promptText = 'Guida doganale operativa per ' + country_name + ' (' + country_code + '), HS ' + hs_code + (product_description ? ' (' + product_description + ')' : '') + '. Trova: 1) Sito ufficiale autorita doganale nazionale (nome ente, URL homepage e tariffario, solo governativi reali). 2) Passaggi navigazione numerati per trovare dazi e IVA sul sito. 3) Dazio MFN, dazio preferenziale EU, IVA/GST, altre imposte con fonti (se non trovato scrivi Non reperito). 4) Dove controllare aggiornamenti tariffari. 5) Limiti del sito e se serve broker. 6) Risorse complementari (WTO, Access2Markets, ICE). NON inventare URL o percentuali. Solo dati verificati.';

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: promptText,
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
              classificazione: { type: "string" },
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
          }
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