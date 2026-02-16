import { base44 } from '@/api/base44Client';

/**
 * STEP 2: Recupera dati ufficiali da TARIC + flussi Comtrade per Import Cina→Italia
 */
export async function fetchImportData(hsCode, hsDescrizione) {
  const currentYear = new Date().getFullYear();
  const timestamp = new Date().toISOString();

  let result;
  try {
    result = await base44.integrations.Core.InvokeLLM({
      prompt: `Sei un analista doganale. Siamo nel ${currentYear}.

COMPITO: Recupera ESCLUSIVAMENTE dati numerici ufficiali per l'import in un Paese UE dalla Cina del codice HS ${hsCode} (${hsDescrizione}).

FONTE PRIMARIA E OBBLIGATORIA — TARIC (Commissione Europea):
URL: ec.europa.eu/taxation_customs/dds2/taric
Codice HS: ${hsCode}, Origine: CN (Cina)

Recupera da TARIC:
1. Dazio MFN applicabile (aliquota % esatta)
2. Eventuali dazi anti-dumping attivi (regolamento UE + aliquota %)
3. Eventuali misure compensative (regolamento UE + aliquota %)
4. Contingenti tariffari
5. Restrizioni/licenze richieste (certificazioni obbligatorie, norme tecniche)

FONTE SECONDARIA — UN Comtrade (comtradeplus.un.org):
Reporter: Italy, Partner: China, HS ${hsCode}
- Valore import Italia dalla Cina (USD) ultimo anno disponibile
- Serie storica 5 anni

NORMATIVA UE:
- IVA standard e ridotta del Paese UE di destinazione (default: Italia 22%)

REGOLE INDEROGABILI:
- Restituisci SOLO dati verificati da TARIC. NESSUNA interpretazione, NESSUN commento.
- Se un dato NON è reperibile, restituisci null. NON inventare, NON stimare, NON usare dazi generici.
- Per aliquote: numero esatto (es. "6.5" per 6.5%). MAI scrivere "circa" o "stimato".
- Per anti-dumping: se non attivo scrivi "Nessuno". Se attivo: regolamento UE + aliquota esatta.
- Per misure compensative: se non attive scrivi "Nessuna". Se attive: regolamento UE + aliquota esatta.
- Se il dazio non è disponibile in TARIC per origine CN: restituisci null per dazio_mfn_percentuale.
- CONVERSIONE VALUTA: Fornisci tasso cambio medio annuale EUR/USD dalla BCE per ultimo anno disponibile.`,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        hs_code: { type: "string" },
        taric: {
          type: "object",
          properties: {
            dazio_mfn_percentuale: { type: "string", description: "Aliquota dazio MFN in %, es: 6.5. null se non disponibile." },
            anti_dumping_percentuale: { type: "string", description: "Aliquota anti-dumping in %, o 'Nessuno'" },
            anti_dumping_regolamento: { type: "string", description: "Regolamento UE se anti-dumping attivo" },
            misure_compensative_percentuale: { type: "string", description: "Aliquota misure compensative in %, o 'Nessuna'" },
            misure_compensative_regolamento: { type: "string", description: "Regolamento UE se misura compensativa attiva" },
            contingenti: { type: "string", description: "Contingenti tariffari se presenti, altrimenti null" },
            restrizioni: { type: "array", items: { type: "string" }, description: "Certificazioni/norme obbligatorie (CE, REACH, etc.)" },
            licenze_richieste: { type: "string", description: "Licenze di importazione richieste, o null" },
            fonte: { type: "string" }
          }
        },
        iva: {
          type: "object",
          properties: {
            aliquota_standard: { type: "string", description: "IVA standard Italia %, es: 22" },
            aliquota_ridotta: { type: "string", description: "IVA ridotta se applicabile, altrimenti null" },
            base_normativa: { type: "string" }
          }
        },
        flussi_comtrade: {
          type: "object",
          properties: {
            import_italia_da_cina_usd: { type: "string", description: "Valore USD ultimo anno" },
            anno: { type: "string" },
            serie_storica: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  anno: { type: "number" },
                  valore_usd: { type: "string" }
                }
              }
            },
            fonte: { type: "string" }
          }
        },
        tasso_cambio_eur_usd: {
          type: "object",
          properties: {
            tasso: { type: "string", description: "Tasso medio annuale EUR/USD BCE, es: 1.08" },
            anno: { type: "string", description: "Anno di riferimento del tasso" },
            fonte: { type: "string", description: "Es: BCE (ECB Statistical Data Warehouse)" }
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
    console.error('[ImportDataFetcher] fetchImportData API error:', err);
    return { _api_error: true, _error_message: err?.message || 'Unknown error' };
  }

  if (!result || typeof result !== 'object') {
    console.error('[ImportDataFetcher] fetchImportData: risposta vuota o non valida', result);
    return { _api_error: true, _error_message: 'Risposta API non valida' };
  }

  // Aggiunge timestamp recupero
  result._timestamp_recupero = timestamp;

  return result;
}

/**
 * STEP 3: Calcola Landed Cost lato client (nessuna AI)
 * 
 * Landed Cost = Valore merce + Trasporto + Dazio + IVA + Sdoganamento
 */
export function computeLandedCost(importData, quantitaRange, budgetRange, valoreMerceInput) {
  if (importData?._api_error) return { _api_error: true, _error_message: importData._error_message };
  const taric = importData?.taric;
  const iva = importData?.iva;

  // Tasso di cambio EUR/USD dalla BCE
  const tassoRaw = importData?.tasso_cambio_eur_usd?.tasso;
  const tassoEurUsd = tassoRaw ? parseFloat(String(tassoRaw).replace(/[^0-9.]/g, '')) : null;
  const tassoAnno = importData?.tasso_cambio_eur_usd?.anno || null;
  const tassoFonte = importData?.tasso_cambio_eur_usd?.fonte || 'BCE';

  // Parse dazio
  const dazioMfn = taric?.dazio_mfn_percentuale
    ? parseFloat(String(taric.dazio_mfn_percentuale).replace(/[^0-9.]/g, ''))
    : null;

  const antiDumping = taric?.anti_dumping_percentuale && taric.anti_dumping_percentuale !== 'Nessuno'
    ? parseFloat(String(taric.anti_dumping_percentuale).replace(/[^0-9.]/g, ''))
    : 0;

  // Parse misure compensative
  const misureComp = taric?.misure_compensative_percentuale && taric.misure_compensative_percentuale !== 'Nessuna'
    ? parseFloat(String(taric.misure_compensative_percentuale).replace(/[^0-9.]/g, ''))
    : 0;

  const ivaPerc = iva?.aliquota_standard
    ? parseFloat(String(iva.aliquota_standard).replace(/[^0-9.]/g, ''))
    : null;

  // Costi standard sdoganamento (fissi, non inventati — range tipico)
  const COSTI_SDOGANAMENTO_MIN = 150; // EUR, costo minimo pratica doganale
  const COSTI_SDOGANAMENTO_MAX = 400; // EUR

  // Stima trasporto container: solo se NON disponibile da fonte ufficiale
  // Non lo calcoliamo — lo lasciamo come "Da richiedere preventivo"
  const trasportoDisponibile = false;

  // Conversione flussi Comtrade USD → EUR
  const flussiComtrade = importData?.flussi_comtrade;
  let flussiConvertiti = null;
  if (flussiComtrade && tassoEurUsd && !isNaN(tassoEurUsd) && tassoEurUsd > 0) {
    const parseUsd = (str) => {
      if (!str) return null;
      const n = parseFloat(String(str).replace(/[^0-9.]/g, ''));
      return isNaN(n) ? null : n;
    };
    const importUsd = parseUsd(flussiComtrade.import_italia_da_cina_usd);
    flussiConvertiti = {
      import_italia_da_cina_eur: importUsd ? Math.round(importUsd / tassoEurUsd) : null,
      serie_storica_eur: (flussiComtrade.serie_storica || []).map(s => ({
        anno: s.anno,
        valore_eur: Math.round((parseUsd(s.valore_usd) || 0) / tassoEurUsd)
      }))
    };
  }

  const conversionePossibile = tassoEurUsd && !isNaN(tassoEurUsd) && tassoEurUsd > 0;

  const dazioTotale = dazioMfn !== null && !isNaN(dazioMfn) ? dazioMfn + antiDumping + misureComp : null;

  const result = {
    dazio_mfn_perc: dazioMfn !== null && !isNaN(dazioMfn) ? dazioMfn : null,
    anti_dumping_perc: antiDumping > 0 ? antiDumping : null,
    misure_compensative_perc: misureComp > 0 ? misureComp : null,
    dazio_totale_perc: dazioTotale,
    iva_perc: ivaPerc !== null && !isNaN(ivaPerc) ? ivaPerc : null,
    costi_sdoganamento_range: { min: COSTI_SDOGANAMENTO_MIN, max: COSTI_SDOGANAMENTO_MAX },
    trasporto_disponibile: trasportoDisponibile,
    calcolo_possibile: dazioMfn !== null && !isNaN(dazioMfn) && ivaPerc !== null && !isNaN(ivaPerc),
    fonti: {
      dazio: taric?.fonte || 'TARIC',
      iva: iva?.base_normativa || 'DPR 633/1972',
      sdoganamento: 'Costi standard pratica doganale (range di mercato)'
    },
    tasso_cambio: conversionePossibile ? {
      tasso: tassoEurUsd,
      anno: tassoAnno,
      fonte: tassoFonte,
      nota: `Valori convertiti in EUR al tasso medio BCE anno ${tassoAnno}.`
    } : null,
    flussi_convertiti_eur: flussiConvertiti
  };

  // === VALIDAZIONE ANOMALIE serie storica import ===
  const anomalie = [];
  const serieStorica = flussiComtrade?.serie_storica || [];
  const valoriSerie = serieStorica
    .map(s => ({ anno: s.anno, val: parseFloat(String(s.valore_usd).replace(/[^0-9.]/g, '')) }))
    .filter(v => !isNaN(v.val));

  // 1. Valori negativi
  valoriSerie.forEach(v => {
    if (v.val < 0) {
      anomalie.push(`Valore negativo (${v.val}) per anno ${v.anno}`);
    }
  });

  // 2. Crescita YoY > 500%
  for (let i = 1; i < valoriSerie.length; i++) {
    if (valoriSerie[i - 1].val > 0) {
      const crescitaYoY = ((valoriSerie[i].val - valoriSerie[i - 1].val) / valoriSerie[i - 1].val) * 100;
      if (crescitaYoY > 500) {
        anomalie.push(`Crescita anomala ${valoriSerie[i - 1].anno}→${valoriSerie[i].anno} (+${crescitaYoY.toFixed(0)}%)`);
      }
    }
  }

  // 3. Anni mancanti nei 5 anni attesi
  const currentYear = new Date().getFullYear();
  const anniAttesi = Array.from({ length: 5 }, (_, i) => currentYear - 5 + i);
  const anniPresenti = valoriSerie.map(v => v.anno);
  const anniMancanti = anniAttesi.filter(a => !anniPresenti.includes(a));
  if (anniMancanti.length > 0 && valoriSerie.length > 0) {
    anomalie.push(`Anni mancanti nella serie storica: ${anniMancanti.join(', ')}`);
  }

  result.anomalie = anomalie.length > 0 ? anomalie : null;
  result.anomalie_presenti = anomalie.length > 0;

  // === CALCOLO LIVELLO RISCHIO IMPORT (basato su dati tariffari reali) ===
  const rischi = [];
  let livello_rischio = 'basso';

  if (antiDumping > 0) {
    rischi.push(`Misure anti-dumping attive: ${antiDumping}%${taric?.anti_dumping_regolamento ? ' (' + taric.anti_dumping_regolamento + ')' : ''}`);
    livello_rischio = 'alto';
  }
  if (misureComp > 0) {
    rischi.push(`Misure compensative attive: ${misureComp}%${taric?.misure_compensative_regolamento ? ' (' + taric.misure_compensative_regolamento + ')' : ''}`);
    livello_rischio = 'alto';
  }
  if (dazioMfn !== null && dazioMfn > 10 && livello_rischio !== 'alto') {
    rischi.push(`Dazio MFN elevato: ${dazioMfn}%`);
    livello_rischio = 'medio';
  }
  if (taric?.restrizioni?.length > 0) {
    rischi.push(`Restrizioni normative: ${taric.restrizioni.join(', ')}`);
    if (livello_rischio === 'basso') livello_rischio = 'medio';
  }
  if (taric?.licenze_richieste && taric.licenze_richieste !== 'null') {
    rischi.push(`Licenze richieste: ${taric.licenze_richieste}`);
    if (livello_rischio === 'basso') livello_rischio = 'medio';
  }
  if (rischi.length === 0) {
    rischi.push('Nessuna misura restrittiva rilevata');
  }

  result.livello_rischio = livello_rischio;
  result.dettagli_rischio = rischi;

  // Calcolo Landed Cost
  const valoreMerceBase = valoreMerceInput && !isNaN(parseFloat(valoreMerceInput)) ? parseFloat(valoreMerceInput) : 10000;
  if (result.calcolo_possibile) {
    const valoreMerce = valoreMerceBase;
    const dazio = valoreMerce * (result.dazio_totale_perc / 100);
    const baseIva = valoreMerce + dazio; // IVA si calcola su valore + dazio
    const ivaImporto = baseIva * (result.iva_perc / 100);
    const sdoganamentoMedio = (COSTI_SDOGANAMENTO_MIN + COSTI_SDOGANAMENTO_MAX) / 2;

    result.esempio_calcolo = {
      valore_merce: valoreMerce,
      dazio: Math.round(dazio * 100) / 100,
      base_imponibile_iva: Math.round(baseIva * 100) / 100,
      iva: Math.round(ivaImporto * 100) / 100,
      sdoganamento: sdoganamentoMedio,
      totale_senza_trasporto: Math.round((valoreMerce + dazio + ivaImporto + sdoganamentoMedio) * 100) / 100,
      nota: 'Escluso trasporto (da richiedere preventivo spedizioniere)'
    };
  }

  return result;
}

/**
 * STEP 4: Interpretazione AI — riceve SOLO dati calcolati
 */
export async function interpretImportData(importData, landedCost, hsCode, hsDescrizione, importForm) {
  if (importData?._api_error || landedCost?._api_error) {
    console.error('[ImportDataFetcher] interpretImportData skipped: upstream API error');
    return { _api_error: true };
  }
  const taric = importData?.taric;
  const flussi = importData?.flussi_comtrade;

  const prompt = `Sei un esperto di import dalla Cina. Siamo nel ${new Date().getFullYear()}.

COMPITO: Interpreta i seguenti DATI GIÀ VERIFICATI per valutare la fattibilità di un import.

IMPORTANTE:
- NON inventare nuovi dati. Usa SOLO i numeri forniti.
- Se un dato è null o "N/D", dillo — NON lo sostituire con stime.

CODICE HS: ${hsCode}
DESCRIZIONE: ${hsDescrizione}

DATI TARIC VERIFICATI:
- Dazio MFN: ${taric?.dazio_mfn_percentuale || 'Non disponibile'}% (${taric?.fonte || 'N/D'})
- Anti-dumping: ${taric?.anti_dumping_percentuale || 'Nessuno'} ${taric?.anti_dumping_regolamento || ''}
- Misure compensative: ${taric?.misure_compensative_percentuale || 'Nessuna'} ${taric?.misure_compensative_regolamento || ''}
- Restrizioni: ${(taric?.restrizioni || []).join(', ') || 'Nessuna'}
- Licenze richieste: ${taric?.licenze_richieste || 'Nessuna'}
- IVA: ${importData?.iva?.aliquota_standard || 'N/D'}%

LIVELLO RISCHIO CALCOLATO: ${landedCost.livello_rischio || 'N/D'}
DETTAGLI RISCHIO: ${(landedCost.dettagli_rischio || []).join('; ')}

LANDED COST CALCOLATO (su €10.000 di merce):
${landedCost.calcolo_possibile ? `- Dazio: €${landedCost.esempio_calcolo.dazio} (${landedCost.dazio_totale_perc}%)
- Base IVA: €${landedCost.esempio_calcolo.base_imponibile_iva}
- IVA: €${landedCost.esempio_calcolo.iva} (${landedCost.iva_perc}%)
- Sdoganamento: ~€${landedCost.esempio_calcolo.sdoganamento}
- Totale (escluso trasporto): €${landedCost.esempio_calcolo.totale_senza_trasporto}` : 'Non calcolabile — dati insufficienti'}

FLUSSI COMMERCIALI:
- Import Italia da Cina HS ${hsCode}: ${flussi?.import_italia_da_cina_usd || 'N/D'}${landedCost.flussi_convertiti_eur?.import_italia_da_cina_eur ? ` (≈ €${landedCost.flussi_convertiti_eur.import_italia_da_cina_eur.toLocaleString('it-IT')})` : ''} (${flussi?.anno || 'N/D'})
${landedCost.tasso_cambio ? `- Tasso cambio: ${landedCost.tasso_cambio.nota}` : ''}

RICHIESTA UTENTE:
- Tipo: ${importForm.tipo_richiesta === 'produzione_custom' ? 'Produzione su misura' : 'Prodotto esistente'}
- Prodotto: ${importForm.descrizione_prodotto}
- Quantità: ${importForm.quantita}
- Frequenza: ${importForm.frequenza || 'Non specificata'}
- Budget: ${importForm.budget || 'Non specificato'}
- Esperienza import: ${importForm.esperienza_import || 'Non specificata'}
- Requisiti: ${importForm.requisiti || 'Nessuno'}

${importData?.dati_non_disponibili?.length > 0 ? `DATI NON DISPONIBILI: ${importData.dati_non_disponibili.join(', ')}` : ''}

Fornisci:
1. Punteggio fattibilità (1-10) basato sui dati sopra
2. Se consigliato o meno e perché
3. Criticità specifiche (basate su dazi, restrizioni, requisiti reali)
4. Tempi realistici (produzione + spedizione)
5. Requisiti normativi (dalle restrizioni TARIC + normativa UE)
6. Prossimi passi concreti
7. Vantaggi specifici`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        punteggio_fattibilita: { type: "number" },
        motivazione_punteggio: { type: "string" },
        consigliato: { type: "boolean" },
        valutazione_generale: { type: "string" },
        raccomandazione: { type: "string" },
        moq_tipico: { type: "string" },
        tempi_produzione: { type: "string" },
        tempi_spedizione_mare: { type: "string" },
        tempi_spedizione_aerea: { type: "string" },
        tempo_totale: { type: "string" },
        vantaggi: { type: "array", items: { type: "string" } },
        criticita: { type: "array", items: { type: "string" } },
        requisiti_necessari: { type: "array", items: { type: "string" } },
        prossimi_passi: { type: "array", items: { type: "string" } }
      }
    }
  });

  return result;
}