import { base44 } from '@/api/base44Client';

/**
 * STEP 2: Recupera dati ufficiali da TARIC + flussi Comtrade per Import Cina→Italia
 */
export async function fetchImportData(hsCode, hsDescrizione) {
  const currentYear = new Date().getFullYear();

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Sei un analista doganale. Siamo nel ${currentYear}.

COMPITO: Recupera ESCLUSIVAMENTE dati numerici ufficiali per l'import in Italia dalla Cina del codice HS ${hsCode} (${hsDescrizione}).

FONTI DA CONSULTARE (OBBLIGATORIE):
1) TARIC (ec.europa.eu/taxation_customs/dds2/taric) — Codice HS ${hsCode}, origine CN (Cina):
   - Dazio MFN (aliquota %)
   - Eventuali dazi anti-dumping (regolamento UE se attivi)
   - Contingenti tariffari
   - Restrizioni merceologiche (certificazioni obbligatorie, norme tecniche)
2) UN Comtrade (comtradeplus.un.org) — Reporter: Italy, Partner: China, HS ${hsCode}:
   - Valore import Italia dalla Cina (USD) ultimo anno disponibile
   - Serie storica 5 anni
3) Normativa UE — IVA italiana standard e ridotta applicabile a questa merce

REGOLE:
- Restituisci SOLO dati numerici verificati. NESSUNA interpretazione, NESSUN commento.
- Se un dato NON è reperibile, restituisci null. NON inventare, NON stimare.
- Per aliquote dazio: restituisci il numero esatto (es. "6.5" per 6.5%). NON scrivere "circa".
- Per anti-dumping: se non attivo, scrivi "Nessuno". Se attivo, indica regolamento UE e aliquota.
- CONVERSIONE VALUTA: I valori Comtrade sono in USD. Fornisci anche il tasso di cambio medio annuale EUR/USD dalla BCE (ECB Statistical Data Warehouse) per l'ultimo anno disponibile, indicando l'anno di riferimento.`,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        hs_code: { type: "string" },
        taric: {
          type: "object",
          properties: {
            dazio_mfn_percentuale: { type: "string", description: "Aliquota dazio MFN in %, es: 6.5" },
            anti_dumping_percentuale: { type: "string", description: "Aliquota anti-dumping in %, o 'Nessuno'" },
            anti_dumping_regolamento: { type: "string", description: "Regolamento UE se anti-dumping attivo" },
            contingenti: { type: "string", description: "Contingenti tariffari se presenti, altrimenti null" },
            restrizioni: { type: "array", items: { type: "string" }, description: "Certificazioni/norme obbligatorie (CE, REACH, etc.)" },
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

  return result;
}

/**
 * STEP 3: Calcola Landed Cost lato client (nessuna AI)
 * 
 * Landed Cost = Valore merce + Trasporto + Dazio + IVA + Sdoganamento
 */
export function computeLandedCost(importData, quantitaRange, budgetRange) {
  const taric = importData?.taric;
  const iva = importData?.iva;

  // Parse dazio
  const dazioMfn = taric?.dazio_mfn_percentuale
    ? parseFloat(String(taric.dazio_mfn_percentuale).replace(/[^0-9.]/g, ''))
    : null;

  const antiDumping = taric?.anti_dumping_percentuale && taric.anti_dumping_percentuale !== 'Nessuno'
    ? parseFloat(String(taric.anti_dumping_percentuale).replace(/[^0-9.]/g, ''))
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

  const result = {
    dazio_mfn_perc: dazioMfn !== null && !isNaN(dazioMfn) ? dazioMfn : null,
    anti_dumping_perc: antiDumping > 0 ? antiDumping : null,
    dazio_totale_perc: dazioMfn !== null && !isNaN(dazioMfn) ? dazioMfn + antiDumping : null,
    iva_perc: ivaPerc !== null && !isNaN(ivaPerc) ? ivaPerc : null,
    costi_sdoganamento_range: { min: COSTI_SDOGANAMENTO_MIN, max: COSTI_SDOGANAMENTO_MAX },
    trasporto_disponibile: trasportoDisponibile,
    calcolo_possibile: dazioMfn !== null && !isNaN(dazioMfn) && ivaPerc !== null && !isNaN(ivaPerc),
    fonti: {
      dazio: taric?.fonte || 'TARIC',
      iva: iva?.base_normativa || 'DPR 633/1972',
      sdoganamento: 'Costi standard pratica doganale (range di mercato)'
    }
  };

  // Esempio di calcolo su valore merce ipotetico (per mostrare le percentuali)
  // Su 10.000 EUR di merce:
  if (result.calcolo_possibile) {
    const valoreMerce = 10000;
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
- Restrizioni: ${(taric?.restrizioni || []).join(', ') || 'Nessuna'}
- IVA: ${importData?.iva?.aliquota_standard || 'N/D'}%

LANDED COST CALCOLATO (su €10.000 di merce):
${landedCost.calcolo_possibile ? `- Dazio: €${landedCost.esempio_calcolo.dazio} (${landedCost.dazio_totale_perc}%)
- Base IVA: €${landedCost.esempio_calcolo.base_imponibile_iva}
- IVA: €${landedCost.esempio_calcolo.iva} (${landedCost.iva_perc}%)
- Sdoganamento: ~€${landedCost.esempio_calcolo.sdoganamento}
- Totale (escluso trasporto): €${landedCost.esempio_calcolo.totale_senza_trasporto}` : 'Non calcolabile — dati insufficienti'}

FLUSSI COMMERCIALI:
- Import Italia da Cina HS ${hsCode}: ${flussi?.import_italia_da_cina_usd || 'N/D'} (${flussi?.anno || 'N/D'})

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