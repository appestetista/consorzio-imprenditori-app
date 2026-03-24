import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

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
    const exporter_code = body.exporter_code || 'IT';

    if (!country_code || !hs_code) {
      return Response.json({ error: 'country_code and hs_code are required' }, { status: 400 });
    }

    const hs6 = String(hs_code).replace(/\D/g, '').substring(0, 6);
    const hs4 = hs6.substring(0, 4);

    // Determine context
    const EU_MEMBERS = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];
    const isExporterEU = EU_MEMBERS.includes(exporter_code);
    const isImporterEU = EU_MEMBERS.includes(country_code);

    const promptText = `SEI UN CONSULENTE DOGANALE ESPERTO. Devo esportare da ${exporter_code}${isExporterEU ? ' (membro UE)' : ''} verso ${country_name} (${country_code})${isImporterEU ? ' (membro UE)' : ''}.
Prodotto: HS ${hs6}${product_description ? ` — ${product_description}` : ''}.

CERCA SU QUESTE FONTI REALI (in ordine di priorità):

1. **Access2Markets** (https://trade.ec.europa.eu/access-to-markets): portale ufficiale UE
   → Cerca: tariffs per HS ${hs6}, origin ${exporter_code}, destination ${country_code}
   → Dazi, IVA, requisiti prodotto, regole origine, anti-dumping

2. **ITC MacMap** (https://www.macmap.org): portale ITC/UNCTAD gratuito
   → Applied MFN duty, preferential duties, Other Duties and Charges (ODC)
   → Trade remedies: anti-dumping, salvaguardie, misure compensative

3. **WTO TTD** (https://ttd.wto.org): dati tariffari ufficiali WTO
   → MFN applied rates, bound rates, tariff actions recenti

4. **Sito autorità doganale di ${country_name}**: cerca il nome dell'ente doganale nazionale
   → URL del tariffario online se disponibile
   → Procedure di sdoganamento specifiche

5. **WITS World Bank** (https://wits.worldbank.org): dati TRAINS/UNCTAD
   → Tariffe MFN e preferenziali a livello HS6

ISTRUZIONI CRITICHE:
- DISTINGUI tra: dazio ad valorem (%), specifico (€/kg o USD/unit), misto (% + quota fissa)
- Se il dazio è specifico, riportalo ESATTAMENTE (es. "5.1 EUR per 100 kg net"), NON convertirlo
- Cerca TUTTE le tasse: dazio base + anti-dumping + ODC + IVA/GST + tasse portuali + accise
- Per i dazi preferenziali: specifica QUALE accordo (es. "EU-Japan EPA", "EU-Canada CETA")
- Se ${country_name} ha un FTA con ${isExporterEU ? "l'UE" : exporter_code}, il dazio preferenziale può essere 0% — VERIFICALO
- Cerca se ci sono contingenti tariffari (TRQ) per questo prodotto
- NON INVENTARE MAI dati. Se non trovi un dato, scrivi "Non reperito su [nome fonte]"
- Spiega TUTTO in modo comprensibile per un imprenditore NON esperto di dogane`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: promptText,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
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
              dazio_mfn: { type: ["string", "null"], description: "Dazio MFN: valore + tipo (ad valorem %, specifico, misto)" },
              dazio_mfn_valore: { type: ["number", "null"], description: "Valore numerico % se ad valorem" },
              dazio_mfn_tipo: { type: ["string", "null"], description: "'ad_valorem', 'specifico', 'misto'" },
              dazio_mfn_fonte: { type: ["string", "null"] },
              dazio_preferenziale_eu: { type: ["string", "null"], description: "Dazio pref. con nome accordo FTA" },
              dazio_preferenziale_valore: { type: ["number", "null"] },
              dazio_preferenziale_fonte: { type: ["string", "null"] },
              accordo_commerciale: { type: ["string", "null"], description: "Nome FTA/EPA se esiste" },
              anti_dumping: { type: ["string", "null"], description: "Dazio anti-dumping + regolamento" },
              anti_dumping_valore: { type: ["number", "null"] },
              misure_compensative: { type: ["string", "null"] },
              salvaguardie: { type: ["string", "null"] },
              iva_gst: { type: ["string", "null"] },
              iva_gst_valore: { type: ["number", "null"] },
              iva_gst_tipo: { type: ["string", "null"], description: "Nome locale: VAT, GST, TVA, IVA, etc." },
              iva_gst_fonte: { type: ["string", "null"] },
              iva_ridotta: { type: ["string", "null"], description: "Aliquota ridotta se applicabile" },
              altre_imposte: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    nome: { type: "string", description: "Es: 'Statistical Tax', 'Port Surcharge', 'Excise Duty', 'Inspection Fee'" },
                    valore: { type: ["string", "null"] },
                    tipo: { type: ["string", "null"], description: "'percentuale', 'fisso', 'variabile'" },
                    fonte: { type: ["string", "null"] }
                  }
                }
              },
              contingenti_tariffari: { type: ["string", "null"], description: "TRQ: quota, periodo, dazio within-quota e over-quota" },
              dazio_totale_stimato: { type: ["string", "null"], description: "Somma di tutti i dazi (MFN/pref + AD + ODC), esclusa IVA" },
              dato_verificato: { type: "boolean" },
              nota_verifica: { type: ["string", "null"] }
            }
          },
          esempio_calcolo: {
            type: "object",
            properties: {
              valore_merce_fob_eur: { type: "number", description: "Sempre 10000" },
              dazio_importazione_eur: { type: ["number", "null"], description: "Dazio calcolato su 10.000€" },
              anti_dumping_eur: { type: ["number", "null"] },
              altre_tasse_eur: { type: ["number", "null"] },
              base_imponibile_iva: { type: ["number", "null"] },
              iva_eur: { type: ["number", "null"] },
              totale_tasse_eur: { type: ["number", "null"], description: "Totale dazi+tasse (escluso trasporto)" },
              nota: { type: "string", description: "Spiegazione del calcolo per un non esperto" }
            }
          },
          spiegazione_semplice: {
            type: "object",
            properties: {
              cosa_significa: { type: "string", description: "In 2-3 frasi: cosa significano questi dazi PER L'IMPRENDITORE. Es: 'Per ogni €100 di merce che spedisci, il tuo cliente pagherà €X in più di tasse doganali'" },
              quanto_costa: { type: "string", description: "Esempio concreto: 'Su una spedizione da €10.000, il costo aggiuntivo è circa €X'" },
              cosa_fare: { type: "string", description: "Consigli pratici: 'Per pagare meno dazi puoi...' o 'Devi assicurarti di avere...' " },
              livello_difficolta: { type: "string", description: "'facile' (UE interno o FTA 0%), 'medio' (dazi moderati <10%), 'complesso' (dazi alti o anti-dumping)" },
              attenzione: { type: "string", description: "Avvertenza principale: rischi, certificazioni mancanti, possibili problemi" }
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
                tipo: { type: "string" },
                utilita: { type: "string", description: "Breve spiegazione di PERCHÉ questa risorsa è utile" }
              }
            }
          }
        }
      }
    });

    result.country_code = country_code;
    result.hs_code = hs_code;
    result.exporter_code = exporter_code;
    result.timestamp = new Date().toISOString();

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});