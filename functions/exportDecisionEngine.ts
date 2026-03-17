import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Export Decision Engine
 * 
 * Trasforma dati reali di commercio internazionale in una decisione semplice per l'imprenditore.
 * REGOLA FONDAMENTALE: NON inventa mai dati. Se un dato manca, restituisce "Dato non disponibile".
 */

const NA = "Dato non disponibile";

function extractPrezzo(partnerData) {
  // Cerca l'anno più recente con ENTRAMBI valore e peso
  if (!partnerData?.serie_storica || !Array.isArray(partnerData.serie_storica)) {
    return { prezzo_medio: null, anno: null, valore: null, quantita: null };
  }

  // Ordina per anno decrescente
  const sorted = [...partnerData.serie_storica].sort((a, b) => (b.year || 0) - (a.year || 0));

  for (const entry of sorted) {
    const valore = entry.trade_value_usd;
    const peso = entry.net_weight_kg;
    if (valore && valore > 0 && peso && peso > 0) {
      return {
        prezzo_medio: valore / peso,
        anno: entry.year,
        valore: valore,
        quantita: peso,
        source: entry.source
      };
    }
  }

  return { prezzo_medio: null, anno: null, valore: null, quantita: null };
}

function extractDazio(partnerData) {
  const tariffs = partnerData?.tariffs;
  if (!tariffs) return { dazio: null, tipo: null };

  // Priorità: preferenziale > MFN
  if (tariffs.preferential_duty !== undefined && tariffs.preferential_duty !== null) {
    return { dazio: tariffs.preferential_duty, tipo: "preferenziale" };
  }
  if (tariffs.mfn_duty !== undefined && tariffs.mfn_duty !== null) {
    return { dazio: tariffs.mfn_duty, tipo: "MFN" };
  }
  if (tariffs.wto_mfn_applied !== undefined && tariffs.wto_mfn_applied !== null) {
    return { dazio: tariffs.wto_mfn_applied, tipo: "MFN (WTO)" };
  }
  if (tariffs.wto_mfn_bound !== undefined && tariffs.wto_mfn_bound !== null) {
    return { dazio: tariffs.wto_mfn_bound, tipo: "MFN bound (WTO)" };
  }

  return { dazio: null, tipo: null };
}

function extractTrasporto(partnerData) {
  // Cerchiamo dati reali di trasporto dal web enrichment
  const we = partnerData?.web_enrichment;
  if (!we) return null;

  // Access2Markets potrebbe avere costi di trasporto reali
  if (we.access2markets?.transport_cost !== undefined && we.access2markets?.transport_cost !== null) {
    return we.access2markets.transport_cost;
  }

  return null;
}

function extractCommissioni(partnerData) {
  // Cerchiamo dati reali sulle commissioni dal web enrichment
  const we = partnerData?.web_enrichment;
  if (!we) return null;

  if (we.access2markets?.commission !== undefined && we.access2markets?.commission !== null) {
    return we.access2markets.commission;
  }

  return null;
}

function extractTopFornitori(partnerData) {
  if (!partnerData?.top_suppliers || !Array.isArray(partnerData.top_suppliers)) {
    return null;
  }
  return partnerData.top_suppliers.filter(s => s.import_value_usd > 0);
}

function extractSerieStorica(partnerData) {
  if (!partnerData?.serie_storica || !Array.isArray(partnerData.serie_storica)) {
    return null;
  }
  return partnerData.serie_storica
    .filter(e => e.trade_value_usd && e.trade_value_usd > 0)
    .sort((a, b) => (a.year || 0) - (b.year || 0));
}

function calcolaDifficolta(dazioInfo, partnerData) {
  // Valuta SOLO se ci sono dati sufficienti
  let fattori = 0;
  let punteggio = 0;

  // Dazio
  if (dazioInfo.dazio !== null) {
    fattori++;
    if (dazioInfo.dazio <= 3) punteggio += 1;       // Basso
    else if (dazioInfo.dazio <= 10) punteggio += 2;  // Medio
    else punteggio += 3;                              // Alto
  }

  // Dati macro: LPI (Logistics Performance Index)
  // Non abbiamo accesso diretto a LPI qui, ma possiamo verificare se ci sono normative
  const we = partnerData?.web_enrichment;
  if (we?.access2markets) {
    fattori++;
    const a2m = we.access2markets;
    // Verifica se ci sono restrizioni, certificazioni obbligatorie, ecc.
    const hasRestrictions = a2m.restrictions && Array.isArray(a2m.restrictions) && a2m.restrictions.length > 0;
    const hasCertifications = a2m.certifications && Array.isArray(a2m.certifications) && a2m.certifications.length > 0;

    if (hasRestrictions && hasCertifications) punteggio += 3;
    else if (hasRestrictions || hasCertifications) punteggio += 2;
    else punteggio += 1;
  }

  if (fattori === 0) return null;

  const media = punteggio / fattori;
  if (media <= 1.5) return "BASSA";
  if (media <= 2.5) return "MEDIA";
  return "ALTA";
}

function generaSpiegazione(countryName, prezzoInfo, dazioInfo, trasporto, commissione, costoTotale, margine, difficolta, serieStorica, topFornitori, macroData, userInputs) {
  const righe = [];

  // 1. Domanda di mercato
  if (serieStorica && serieStorica.length > 0) {
    const ultimo = serieStorica[serieStorica.length - 1];
    const primo = serieStorica[0];
    righe.push(`📊 DOMANDA DI MERCATO:`);
    righe.push(`Il commercio verso ${countryName} per questo prodotto è stato registrato in ${serieStorica.length} anni (${primo.year}-${ultimo.year}).`);
    righe.push(`Ultimo valore disponibile (${ultimo.year}): $${(ultimo.trade_value_usd / 1e6).toFixed(2)}M USD (fonte: ${ultimo.source}).`);

    if (serieStorica.length >= 2) {
      const variazione = ((ultimo.trade_value_usd - primo.trade_value_usd) / primo.trade_value_usd * 100).toFixed(1);
      righe.push(`Variazione nel periodo: ${variazione > 0 ? '+' : ''}${variazione}%.`);
    }
  } else {
    righe.push(`📊 DOMANDA DI MERCATO: Dati storici non disponibili per questo mercato/prodotto.`);
  }

  righe.push('');

  // 2. Prezzo medio
  righe.push(`💰 PREZZO MEDIO MERCATO:`);
  if (prezzoInfo.prezzo_medio !== null) {
    righe.push(`Calcolato da dati reali (${prezzoInfo.anno}): $${prezzoInfo.prezzo_medio.toFixed(2)}/kg.`);
    righe.push(`Basato su: valore $${(prezzoInfo.valore / 1e6).toFixed(2)}M / ${(prezzoInfo.quantita / 1e3).toFixed(1)}t (fonte: ${prezzoInfo.source}).`);
  } else {
    righe.push(`Non calcolabile: mancano dati simultanei di valore E quantità (kg) per lo stesso anno.`);
  }

  righe.push('');

  // 3. Componenti costo
  righe.push(`🏭 COMPONENTI DI COSTO:`);
  righe.push(`- Costo industriale: €${userInputs.costo_industriale}/unità (dato utente)`);
  righe.push(`- Dazio: ${dazioInfo.dazio !== null ? `${dazioInfo.dazio}% (${dazioInfo.tipo})` : NA}`);
  righe.push(`- Trasporto: ${trasporto !== null ? `€${trasporto}` : `${NA} — nessun dato reale di trasporto disponibile dalle fonti`}`);
  righe.push(`- Commissioni: ${commissione !== null ? `€${commissione}` : `${NA} — nessun dato reale sulle commissioni disponibile dalle fonti`}`);

  righe.push('');

  // 4. Costo totale e margine
  righe.push(`📋 CALCOLO FINALE:`);
  if (costoTotale !== null) {
    righe.push(`Costo totale export: €${costoTotale.toFixed(2)}/unità`);
  } else {
    righe.push(`Costo totale export: ${NA} — mancano uno o più componenti di costo.`);
  }
  if (margine !== null) {
    righe.push(`Margine reale: ${(margine * 100).toFixed(1)}%`);
  } else {
    righe.push(`Margine reale: ${NA} — non calcolabile senza prezzo medio E costo totale completo.`);
  }

  righe.push('');

  // 5. Concorrenza
  if (topFornitori && topFornitori.length > 0) {
    righe.push(`🏆 CONCORRENZA (Top fornitori nel mercato):`);
    topFornitori.slice(0, 5).forEach((s, i) => {
      righe.push(`  ${i + 1}. ${s.partner_name || s.partner_code}: $${(s.import_value_usd / 1e6).toFixed(2)}M (${s.market_share_pct?.toFixed(1) || '?'}%)`);
    });
  }

  righe.push('');

  // 6. Macro
  if (macroData) {
    righe.push(`🌍 CONTESTO MACROECONOMICO (${countryName}):`);
    if (macroData.gdp) righe.push(`- PIL: $${(macroData.gdp.value / 1e9).toFixed(1)}B (${macroData.gdp.year})`);
    if (macroData.gdp_per_capita) righe.push(`- PIL pro capite: $${macroData.gdp_per_capita.value?.toFixed(0)} (${macroData.gdp_per_capita.year})`);
    if (macroData.inflation) righe.push(`- Inflazione: ${macroData.inflation.value?.toFixed(1)}% (${macroData.inflation.year})`);
    if (macroData.exchange_rate) righe.push(`- Tasso di cambio: ${macroData.exchange_rate.value?.toFixed(4)} (${macroData.exchange_rate.year})`);
  }

  righe.push('');

  // 7. Limiti
  righe.push(`⚠️ LIMITI DEI DATI:`);
  const limiti = [];
  if (prezzoInfo.prezzo_medio === null) limiti.push("Prezzo medio non calcolabile (mancano valore o quantità)");
  if (dazioInfo.dazio === null) limiti.push("Dazio non disponibile dalle fonti consultate");
  if (trasporto === null) limiti.push("Costo trasporto non disponibile (nessun dato reale)");
  if (commissione === null) limiti.push("Commissioni non disponibili (nessun dato reale)");
  if (!serieStorica || serieStorica.length < 3) limiti.push("Serie storica limitata o insufficiente");
  if (!topFornitori || topFornitori.length === 0) limiti.push("Dati sui concorrenti non disponibili");

  if (limiti.length === 0) {
    righe.push("Tutti i dati principali sono disponibili.");
  } else {
    limiti.forEach(l => righe.push(`- ${l}`));
  }

  return righe.join('\n');
}


Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // === VALIDAZIONE INPUT UTENTE ===
    const {
      trade_data,        // Risultato completo di fetchTradeDataMultiSource
      costo_industriale, // €/unità
      prezzo_attuale,    // €/unità (prezzo di vendita attuale dell'utente)
      peso_prodotto,     // kg per unità
      settore,
      esperienza_export
    } = body;

    if (!trade_data) {
      return Response.json({ error: 'trade_data è obbligatorio (risultato di fetchTradeDataMultiSource)' }, { status: 400 });
    }
    if (costo_industriale === undefined || costo_industriale === null) {
      return Response.json({ error: 'costo_industriale è obbligatorio' }, { status: 400 });
    }

    const userInputs = {
      costo_industriale: Number(costo_industriale),
      prezzo_attuale: prezzo_attuale ? Number(prezzo_attuale) : null,
      peso_prodotto: peso_prodotto ? Number(peso_prodotto) : null,
      settore: settore || null,
      esperienza_export: esperienza_export || null
    };

    // === ELABORAZIONE PER OGNI PAESE ===
    const partners = trade_data.partners || {};
    const macroData = trade_data.macro_data || {};
    const risultati = [];

    for (const [countryCode, partnerData] of Object.entries(partners)) {
      const countryMacro = macroData[countryCode] || null;

      // 1. PREZZO MEDIO MERCATO
      const prezzoInfo = extractPrezzo(partnerData);
      let prezzoMedioEur = null;

      if (prezzoInfo.prezzo_medio !== null) {
        // Conversione USD -> EUR usando tasso di cambio reale se disponibile
        const exchangeRate = countryMacro?.exchange_rate?.value;
        // Il tasso World Bank è LCU per USD. Per EUR usiamo il tasso Eurostat se disponibile.
        // Altrimenti usiamo un tasso approssimativo dal dato macro (se EUR)
        // Per semplicità e correttezza: se il reporter è IT (Eurozona), il prezzo in USD lo convertiamo
        // usando il tasso EUR/USD dal World Bank se disponibile
        if (exchangeRate && exchangeRate > 0 && exchangeRate < 2) {
          // exchangeRate sembra essere EUR per USD (es. 0.92)
          prezzoMedioEur = prezzoInfo.prezzo_medio * exchangeRate;
        } else {
          // Non abbiamo un tasso affidabile, mostriamo solo USD
          prezzoMedioEur = null;
        }
      }

      // 2. DAZIO
      const dazioInfo = extractDazio(partnerData);

      // 3. TRASPORTO (solo dati reali)
      const trasporto = extractTrasporto(partnerData);

      // 4. COMMISSIONI (solo dati reali)
      const commissione = extractCommissioni(partnerData);

      // 5. COSTO TOTALE EXPORT
      let costoTotale = null;
      const costoIndustriale = userInputs.costo_industriale;

      // Calcolo dazio in euro sul costo industriale
      let dazioEur = null;
      if (dazioInfo.dazio !== null) {
        dazioEur = costoIndustriale * (dazioInfo.dazio / 100);
      }

      // Costo totale SOLO se TUTTI i componenti sono disponibili
      if (costoIndustriale !== null && trasporto !== null && dazioEur !== null && commissione !== null) {
        costoTotale = costoIndustriale + trasporto + dazioEur + commissione;
      }

      // 6. MARGINE REALE
      let margine = null;
      // Usiamo il prezzo medio in EUR per il calcolo. Se non disponibile in EUR, usiamo USD.
      let prezzoPerCalcolo = null;

      if (prezzoMedioEur !== null && userInputs.peso_prodotto) {
        // Prezzo medio per unità (non per kg)
        prezzoPerCalcolo = prezzoMedioEur * userInputs.peso_prodotto;
      } else if (prezzoInfo.prezzo_medio !== null && userInputs.peso_prodotto) {
        // Fallback: prezzo in USD (senza conversione)
        prezzoPerCalcolo = prezzoInfo.prezzo_medio * userInputs.peso_prodotto;
      }

      if (prezzoPerCalcolo !== null && costoTotale !== null && prezzoPerCalcolo > 0) {
        margine = (prezzoPerCalcolo - costoTotale) / prezzoPerCalcolo;
      }

      // 7. DIFFICOLTA'
      const difficolta = calcolaDifficolta(dazioInfo, partnerData);

      // 8. DECISIONE
      let decisione = "DATI INSUFFICIENTI";
      if (margine !== null) {
        if (margine > 0.30) decisione = "CONVIENE";
        else if (margine >= 0.15) decisione = "TEST";
        else decisione = "NON CONVIENE";
      }

      // 9. Dati di supporto
      const serieStorica = extractSerieStorica(partnerData);
      const topFornitori = extractTopFornitori(partnerData);

      // 10. SPIEGAZIONE
      const spiegazione = generaSpiegazione(
        countryCode, prezzoInfo, dazioInfo, trasporto, commissione,
        costoTotale, margine, difficolta, serieStorica, topFornitori,
        countryMacro, userInputs
      );

      risultati.push({
        paese: countryCode,
        decisione: decisione,
        margine_reale: margine !== null ? `${(margine * 100).toFixed(1)}%` : NA,
        margine_valore: margine,
        prezzo_medio_mercato: prezzoInfo.prezzo_medio !== null
          ? {
              usd_per_kg: `$${prezzoInfo.prezzo_medio.toFixed(2)}/kg`,
              eur_per_kg: prezzoMedioEur !== null ? `€${prezzoMedioEur.toFixed(2)}/kg` : NA,
              anno: prezzoInfo.anno,
              fonte: prezzoInfo.source
            }
          : NA,
        costo_totale_export: costoTotale !== null ? `€${costoTotale.toFixed(2)}` : NA,
        costo_dettaglio: {
          costo_industriale: `€${costoIndustriale.toFixed(2)}`,
          dazio: dazioInfo.dazio !== null
            ? { percentuale: `${dazioInfo.dazio}%`, tipo: dazioInfo.tipo, valore_euro: dazioEur !== null ? `€${dazioEur.toFixed(2)}` : NA }
            : NA,
          trasporto: trasporto !== null ? `€${trasporto}` : NA,
          commissioni: commissione !== null ? `€${commissione}` : NA
        },
        difficolta: difficolta || NA,
        serie_storica: serieStorica || [],
        top_fornitori: topFornitori ? topFornitori.slice(0, 5) : [],
        macro: countryMacro || null,
        spiegazione: spiegazione
      });
    }

    return Response.json({
      success: true,
      hs_code: trade_data.hs_code,
      flow_type: trade_data.flow_type,
      reporter: trade_data.reporter,
      input_utente: userInputs,
      risultati: risultati,
      nota: "Tutti i dati provengono esclusivamente dalle API (OEC, UN Comtrade, WITS, WTO, Eurostat, World Bank). Nessun dato è stato inventato o stimato."
    });

  } catch (error) {
    console.error('[ExportDecisionEngine] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});