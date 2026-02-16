import { base44 } from '@/api/base44Client';

/**
 * STEP 2 — Recupera dati di prezzo unitario e marginalità per ciascun mercato target.
 * 
 * FONTI OBBLIGATORIE:
 * - UN Comtrade: Valore import (USD) e Quantità (kg o unità) → prezzo unitario
 * - BCE: Tasso di cambio EUR/USD per conversione
 * - World Bank: eventuale indice prezzi al consumo per contesto
 * 
 * NON inventa nulla. Se un dato non è disponibile → null.
 */
export async function fetchPriceData(hsCode6, mercatiCodes, mercatiNames, exporterCode = 'IT', periodoAnni = 5) {
  const hs4 = String(hsCode6).replace(/\D/g, '').substring(0, 4);
  const currentYear = new Date().getFullYear();
  const periodoStart = currentYear - periodoAnni;
  const periodoEnd = currentYear - 1;
  const timestamp = new Date().toISOString();

  const exporterLabel = exporterCode === 'IT' ? 'Italia' : exporterCode;
  const mercatiNomi = mercatiCodes.map((code, i) => {
    const name = mercatiNames?.[i] || code;
    return `${name} (${code})`;
  }).join(', ');

  let result;
  try {
    result = await base44.integrations.Core.InvokeLLM({
      prompt: `Sei un analista di dati commerciali internazionali. Anno corrente: ${currentYear}.

COMPITO: Recupera ESCLUSIVAMENTE dati numerici ufficiali di EXPORT dal database UN Comtrade per il codice HS ${hs4} (heading 4 cifre).

PARAMETRI QUERY UN COMTRADE:
- Reporter = ${exporterLabel} (${exporterCode}) — il Paese esportatore
- Flow = Export (X)
- CmdCode = ${hs4} (HS heading 4 cifre)
- Periodo = ${periodoStart}-${periodoEnd} (ultimi ${periodoAnni} anni)

QUERY PER CIASCUN MERCATO TARGET (${mercatiNomi}):

QUERY A — Partner = Paese target specifico:
- Reporter: ${exporterCode}, Partner: ciascun Paese target, Flow: Export, HS: ${hs4}
- Recuperare per OGNI ANNO del periodo ${periodoStart}-${periodoEnd}:
  * TradeValue (USD) — valore totale export
  * NetWeight (kg) — quantità totale
  * Prezzo unitario = TradeValue / NetWeight (USD/kg)

SE QUERY A restituisce dataset VUOTO per un Paese:
→ QUERY B — Ripetere con Partner = World:
  - Reporter: ${exporterCode}, Partner: World, Flow: Export, HS: ${hs4}
  - Stessi dati: TradeValue, NetWeight, serie storica

SE ANCHE QUERY B è vuota:
→ Segnalare in dati_non_disponibili: "Dati commerciali non disponibili per [Paese] nel periodo ${periodoStart}-${periodoEnd}"

DATI AGGIUNTIVI:
- Top 5 Paesi destinatari per valore export da ${exporterCode} per HS ${hs4} (con prezzo unitario)
- Se NetWeight non disponibile, usare Qty (unità supplementari) e specificare l'unità di misura

DA BCE (ecb.europa.eu) — TASSI DI CAMBIO MEDI ANNUALI:
- Tasso medio annuale EUR/USD per ${periodoEnd}
- Per CIASCUN Paese target: tasso medio annuale EUR → valuta locale del Paese per ${periodoEnd}
  (es. EUR/GBP per UK, EUR/JPY per Giappone, EUR/CNY per Cina, EUR/USD per USA, ecc.)
  Usa SOLO i tassi medi annuali (annual average) dalla BCE, NON tassi giornalieri.
  Se un Paese usa EUR (es. Germania, Francia), indicare tasso = 1.0 e valuta = EUR.
  Se la valuta locale NON è disponibile nella BCE, restituisci null.

REGOLE INDEROGABILI:
- OGNI numero deve provenire da UN Comtrade o BCE. Nessuna stima, nessuna approssimazione.
- Se TradeValue o NetWeight non sono disponibili, restituisci null per quel dato.
- Indica SEMPRE fonte esatta e anno per ogni dato.
- Il prezzo unitario si calcola SOLO come rapporto TradeValue/NetWeight (o Qty). Mai inventarlo.
- Per ogni mercato, indicare se i dati provengono da Query A (partner specifico) o Query B (World) tramite il campo query_fallback_world.

OUTPUT: JSON strutturato.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          hs_code: { type: "string" },
          reporter: { type: "string", description: "Paese esportatore (Reporter)" },
          flow: { type: "string", description: "Export" },
          periodo: { type: "string" },
          mercati: {
            type: "array",
            items: {
              type: "object",
              properties: {
                paese_code: { type: "string" },
                paese_nome: { type: "string" },
                query_fallback_world: { type: "boolean", description: "true se dati ottenuti con Partner=World invece che partner specifico" },
                export_to_partner: {
                  type: "object",
                  properties: {
                    trade_value_usd: { type: "number", description: "Valore totale export USD verso il partner" },
                    net_weight_kg: { type: "number", description: "Peso netto totale kg" },
                    prezzo_unitario_usd_kg: { type: "number", description: "TradeValue / NetWeight" },
                    unita_misura: { type: "string", description: "kg o altra unità se NetWeight non disponibile" },
                    anno: { type: "string" },
                    fonte: { type: "string" }
                  }
                },
                serie_storica: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      anno: { type: "number" },
                      trade_value_usd: { type: "number" },
                      net_weight_kg: { type: "number" },
                      prezzo_unitario_usd_kg: { type: "number" },
                      fonte: { type: "string" }
                    }
                  },
                  description: "Serie storica annuale export per ciascun anno del periodo"
                },
                top_destinatari_prezzo: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      paese: { type: "string" },
                      prezzo_unitario_usd_kg: { type: "number" },
                      trade_value_usd: { type: "number" },
                      net_weight_kg: { type: "number" },
                      fonte: { type: "string" }
                    }
                  },
                  description: "Top 5 Paesi destinatari per valore export con prezzo unitario"
                }
              }
            }
          },
          export_world: {
            type: "object",
            properties: {
              trade_value_usd: { type: "number", description: "Export totale (Partner=World) per HS heading" },
              net_weight_kg: { type: "number" },
              prezzo_unitario_usd_kg: { type: "number" },
              anno: { type: "string" },
              fonte: { type: "string" }
            },
            description: "Export totale del Reporter verso World per benchmark"
          },
          tasso_cambio_eur_usd: {
            type: "object",
            properties: {
              tasso: { type: "number" },
              anno: { type: "string" },
              fonte: { type: "string" }
            }
          },
          dati_non_disponibili: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });
  } catch (err) {
    console.error('[PriceMarginFetcher] fetchPriceData API error:', err);
    return { _api_error: true, _error_message: err?.message || 'Unknown error' };
  }

  if (!result || typeof result !== 'object') {
    return { _api_error: true, _error_message: 'Risposta API non valida' };
  }

  result._timestamp = timestamp;
  result._query_log = { hs4, hsCode6, exporterCode, mercatiCodes, periodo: `${periodoStart}-${periodoEnd}` };
  return result;
}

/**
 * Calcola metriche di prezzo e marginalità lato client (zero AI).
 * Tutti i calcoli sono aritmetici puri su dati ufficiali.
 */
export function computePriceMetrics(priceData) {
  if (priceData?._api_error) return { _api_error: true };
  if (!priceData?.mercati) return null;

  const tasso = priceData.tasso_cambio_eur_usd?.tasso;
  const tassoValid = tasso && !isNaN(tasso) && tasso > 0;

  // Prezzo unitario export globale (World) come benchmark
  const prezzoWorldGlobal = priceData.export_world?.prezzo_unitario_usd_kg || null;

  // Validazione benchmark World: ricalcola prezzo come TradeValue/NetWeight
  const worldTV = priceData.export_world?.trade_value_usd;
  const worldNW = priceData.export_world?.net_weight_kg;
  const prezzoWorldValid = worldTV > 0 && worldNW > 0;
  const prezzoWorldCalcolato = prezzoWorldValid ? parseFloat((worldTV / worldNW).toFixed(4)) : null;
  const worldUnitaMisura = priceData.export_world?.unita_misura || 'kg';

  const avvisi = [];
  if (!prezzoWorldValid && prezzoWorldGlobal) {
    avvisi.push(`Prezzo medio globale (World) non calcolabile: ${!worldTV || worldTV <= 0 ? 'Valore export = 0 o non disponibile' : 'Quantità (NetWeight) = 0 o non disponibile'}.`);
  }

  const metriche = priceData.mercati.map(m => {
    const rawTradeValue = m.export_to_partner?.trade_value_usd;
    const rawNetWeight = m.export_to_partner?.net_weight_kg;
    const rawPrezzo = m.export_to_partner?.prezzo_unitario_usd_kg;
    const unita = m.export_to_partner?.unita_misura || 'kg';
    const fallbackWorld = m.query_fallback_world || false;

    // Validazione: TradeValue > 0 AND NetWeight > 0 per calcolare prezzo medio
    const tradeValueOk = typeof rawTradeValue === 'number' && rawTradeValue > 0;
    const netWeightOk = typeof rawNetWeight === 'number' && rawNetWeight > 0;
    const prezzoCalcolabile = tradeValueOk && netWeightOk;

    const tradeValue = tradeValueOk ? rawTradeValue : null;
    const netWeight = netWeightOk ? rawNetWeight : null;
    const annoRiferimento = m.export_to_partner?.anno || null;
    const fonteRiferimento = m.export_to_partner?.fonte || 'UN Comtrade';

    // Prezzo partner: SEMPRE ricalcolato come TradeValue / NetWeight (mai fidarsi del valore LLM)
    let prezzoPartner = null;
    let avviso_prezzo = null;
    if (prezzoCalcolabile) {
      prezzoPartner = parseFloat((rawTradeValue / rawNetWeight).toFixed(4));
    } else if (tradeValueOk && !netWeightOk) {
      avviso_prezzo = 'Quantità non disponibile per calcolo prezzo medio.';
    } else if (!tradeValueOk && netWeightOk) {
      avviso_prezzo = 'Valore export non disponibile per calcolo prezzo medio.';
    } else {
      avviso_prezzo = 'Valore e quantità non disponibili per calcolo prezzo medio.';
    }

    // Verifica coerenza unità di misura con benchmark World
    let avviso_unita = null;
    if (prezzoCalcolabile && prezzoWorldCalcolato && unita !== worldUnitaMisura) {
      avviso_unita = `Unità di misura non coerente: partner=${unita}, World=${worldUnitaMisura}. Confronto prezzo non affidabile.`;
    }

    // Premium/discount: calcola SOLO se entrambi i prezzi sono calcolabili e unità coerenti
    let premium_pct = null;
    if (prezzoWorldCalcolato && prezzoPartner && prezzoWorldCalcolato > 0 && !avviso_unita) {
      premium_pct = parseFloat((((prezzoPartner - prezzoWorldCalcolato) / prezzoWorldCalcolato) * 100).toFixed(1));
    }

    // Conversione EUR
    const prezzoPartnerEur = tassoValid && prezzoPartner ? parseFloat((prezzoPartner / tasso).toFixed(2)) : null;
    const prezzoWorldEur = tassoValid && prezzoWorldCalcolato ? parseFloat((prezzoWorldCalcolato / tasso).toFixed(2)) : null;
    const tradeValueEur = tassoValid && tradeValue ? Math.round(tradeValue / tasso) : null;

    // Top destinatari: filtra solo quelli con TradeValue > 0 E NetWeight > 0, ricalcola prezzo
    const topDestinatari = (m.top_destinatari_prezzo || [])
      .filter(f => f.trade_value_usd > 0 && f.net_weight_kg > 0)
      .map(f => {
        const prezzoRicalcolato = parseFloat((f.trade_value_usd / f.net_weight_kg).toFixed(4));
        return {
          ...f,
          prezzo_unitario_usd_kg: prezzoRicalcolato,
          prezzo_eur: tassoValid ? parseFloat((prezzoRicalcolato / tasso).toFixed(4)) : null
        };
      })
      .sort((a, b) => a.prezzo_unitario_usd_kg - b.prezzo_unitario_usd_kg);

    // Ranking: solo se prezzo partner è calcolabile
    let rankingPrezzo = null;
    if (prezzoPartner && topDestinatari.length > 0) {
      const allPrices = [...topDestinatari.map(f => f.prezzo_unitario_usd_kg), prezzoPartner].sort((a, b) => a - b);
      rankingPrezzo = allPrices.indexOf(prezzoPartner) + 1;
    }

    // Serie storica: filtra solo record con TradeValue > 0 E NetWeight > 0, ricalcola prezzo
    const serie = (m.serie_storica || [])
      .filter(s => s.trade_value_usd > 0 && s.net_weight_kg > 0)
      .map(s => ({
        ...s,
        prezzo_unitario_usd_kg: parseFloat((s.trade_value_usd / s.net_weight_kg).toFixed(4))
      }));
    let trendPrezzo = null;
    if (serie.length >= 2) {
      const primo = serie[0].prezzo_unitario_usd_kg;
      const ultimo = serie[serie.length - 1].prezzo_unitario_usd_kg;
      if (primo > 0) {
        trendPrezzo = parseFloat((((ultimo - primo) / primo) * 100).toFixed(1));
      }
    }

    // Serie in EUR
    const serieEur = tassoValid
      ? serie.map(s => ({
          ...s,
          prezzo_unitario_eur: parseFloat((s.prezzo_unitario_usd_kg / tasso).toFixed(2)),
          trade_value_eur: s.trade_value_usd ? Math.round(s.trade_value_usd / tasso) : null
        }))
      : serie;

    return {
      paese_code: m.paese_code,
      paese_nome: m.paese_nome,
      unita_misura: unita,
      query_fallback_world: fallbackWorld,
      trade_value_usd: tradeValue,
      trade_value_eur: tradeValueEur,
      net_weight_kg: netWeight,
      prezzo_partner_usd: prezzoPartner,
      prezzo_partner_eur: prezzoPartnerEur,
      prezzo_world_usd: prezzoWorldCalcolato,
      prezzo_world_eur: prezzoWorldEur,
      premium_pct,
      top_destinatari: topDestinatari,
      ranking_prezzo: rankingPrezzo,
      ranking_totale: topDestinatari.length + (prezzoPartner ? 1 : 0),
      trend_prezzo_pct: trendPrezzo,
      serie_prezzo: serie,
      serie_prezzo_eur: serieEur,
      dati_completi: prezzoPartner !== null && tradeValue !== null,
      anno_riferimento: annoRiferimento,
      fonte: fonteRiferimento,
      avviso_prezzo,
      avviso_unita
    };
  });

  return {
    metriche,
    tasso_cambio: tassoValid ? {
      tasso,
      anno: priceData.tasso_cambio_eur_usd.anno,
      fonte: priceData.tasso_cambio_eur_usd.fonte,
      nota: `Tasso medio BCE ${priceData.tasso_cambio_eur_usd.anno}: 1 EUR = ${tasso} USD`
    } : null,
    dati_non_disponibili: priceData.dati_non_disponibili || [],
    avvisi_validazione: avvisi.length > 0 ? avvisi : null
  };
}

/**
 * STEP AI: Interpretazione strategica sui dati di prezzo/marginalità.
 * Riceve SOLO dati calcolati, NON inventa numeri.
 */
export async function interpretPriceData(priceMetrics, hsCode, hsDescrizione, profiloAzienda) {
  if (priceMetrics?._api_error) return { _api_error: true };
  if (!priceMetrics?.metriche) return null;

  const currentYear = new Date().getFullYear();

  const riepilogo = priceMetrics.metriche.map(m => {
    const topStr = m.top_destinatari.map(f =>
      `${f.paese}: $${f.prezzo_unitario_usd_kg?.toFixed(2)}/${m.unita_misura}${f.prezzo_eur ? ` (€${f.prezzo_eur}/${m.unita_misura})` : ''}`
    ).join(', ');

    return `
MERCATO: ${m.paese_nome} (${m.paese_code})${m.query_fallback_world ? ' [dati da Partner=World]' : ''}
- Valore export verso partner: ${m.trade_value_usd !== null ? `$${m.trade_value_usd.toLocaleString('en-US')}` : 'Non disponibile'}${m.trade_value_eur ? ` (€${m.trade_value_eur.toLocaleString('it-IT')})` : ''}
- Quantità: ${m.net_weight_kg !== null ? `${m.net_weight_kg.toLocaleString('en-US')} ${m.unita_misura}` : 'Non disponibile'}
- Prezzo unitario export verso partner: ${m.prezzo_partner_usd !== null ? `$${m.prezzo_partner_usd.toFixed(2)}/${m.unita_misura}` : 'Non disponibile'}${m.prezzo_partner_eur ? ` (€${m.prezzo_partner_eur}/${m.unita_misura})` : ''}
- Prezzo unitario export medio globale (World): ${m.prezzo_world_usd !== null ? `$${m.prezzo_world_usd.toFixed(2)}/${m.unita_misura}` : 'Non disponibile'}${m.prezzo_world_eur ? ` (€${m.prezzo_world_eur}/${m.unita_misura})` : ''}
- Premium/Discount vs media globale: ${m.premium_pct !== null ? `${m.premium_pct > 0 ? '+' : ''}${m.premium_pct}%` : 'Non calcolabile'}
- Ranking prezzo tra top destinatari: ${m.ranking_prezzo !== null ? `#${m.ranking_prezzo} su ${m.ranking_totale}` : 'Non calcolabile'}
- Trend prezzo unitario nel periodo: ${m.trend_prezzo_pct !== null ? `${m.trend_prezzo_pct > 0 ? '+' : ''}${m.trend_prezzo_pct}%` : 'Non calcolabile'}
- Top destinatari per prezzo: ${topStr || 'Non disponibile'}
- Dati completi: ${m.dati_completi ? 'Sì' : 'Parziali/Insufficienti'}`;
  }).join('\n');

  const datiMancanti = priceMetrics.dati_non_disponibili?.length > 0
    ? `\nDATI NON DISPONIBILI:\n${priceMetrics.dati_non_disponibili.join('\n')}`
    : '';

  const notaCambio = priceMetrics.tasso_cambio
    ? `\nTASSO DI CAMBIO: ${priceMetrics.tasso_cambio.nota} (${priceMetrics.tasso_cambio.fonte})`
    : '';

  let result;
  try {
    result = await base44.integrations.Core.InvokeLLM({
      prompt: `Sei un esperto di pricing internazionale e trade intelligence. Anno: ${currentYear}.

COMPITO: Interpreta i seguenti DATI DI PREZZO E MARGINALITÀ GIÀ VERIFICATI e fornisci una valutazione strategica sul posizionamento di prezzo.

REGOLE:
- NON inventare numeri. Usa SOLO i dati forniti sotto.
- Se un dato è "Non disponibile" o "Non calcolabile", dillo esplicitamente.
- Le tue conclusioni DEVONO essere coerenti con i numeri.

CODICE HS: ${hsCode}
DESCRIZIONE: ${hsDescrizione}

PROFILO AZIENDA:
- Settore: ${profiloAzienda.settore}
- Prodotto: ${profiloAzienda.prodotto}
- Fatturato: ${profiloAzienda.fatturato_annuo || 'Non specificato'}

DATI DI PREZZO VERIFICATI:
${riepilogo}
${datiMancanti}${notaCambio}

PER CIASCUN MERCATO RISPONDI:
1. POSIZIONAMENTO PREZZO: l'esportatore è premium, allineato o sotto media? Motivazione con numeri.
2. COMPETITIVITA: confronto con top fornitori — chi è più economico, chi più caro?
3. TREND: il prezzo medio sta salendo o scendendo? Cosa implica per i margini?
4. STRATEGIA PREZZO CONSIGLIATA: penetrazione, allineamento, premium? Con motivazione numerica.
5. RISCHIO MARGINE: se il prezzo medio cala, quanto è vulnerabile il posizionamento?

Fornisci anche una valutazione complessiva del potenziale di marginalità.`,
      response_json_schema: {
        type: "object",
        properties: {
          valutazione_generale: { type: "string", description: "Sintesi complessiva sul posizionamento prezzo e marginalità" },
          punteggio_marginalita: { type: "number", description: "Score 1-10 sul potenziale di marginalità" },
          mercati: {
            type: "array",
            items: {
              type: "object",
              properties: {
                paese_code: { type: "string" },
                paese_nome: { type: "string" },
                posizionamento: { type: "string", description: "premium / allineato / sotto_media / dati_insufficienti" },
                analisi_posizionamento: { type: "string" },
                analisi_competitivita: { type: "string" },
                analisi_trend: { type: "string" },
                strategia_prezzo: { type: "string" },
                rischio_margine: { type: "string" },
                dati_insufficienti: { type: "boolean" }
              }
            }
          },
          raccomandazione_pricing: { type: "string", description: "Consiglio operativo sul pricing" },
          rischi_pricing: { type: "array", items: { type: "string" } }
        }
      }
    });
  } catch (err) {
    console.error('[PriceMarginFetcher] interpretPriceData error:', err);
    return { _api_error: true };
  }

  return result;
}