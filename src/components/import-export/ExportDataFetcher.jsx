import { base44 } from '@/api/base44Client';

/**
 * Tronca codice HS a 4 cifre per analisi domanda globale
 */
function toHS4(hsCode) {
  const clean = String(hsCode).replace(/\D/g, '');
  return clean.substring(0, 4);
}

/**
 * Mappa ISO Alpha-2 → ISO Alpha-3 (World Bank usa Alpha-3)
 */
const ALPHA2_TO_ALPHA3 = {
  US:'USA',DE:'DEU',FR:'FRA',GB:'GBR',CN:'CHN',JP:'JPN',IN:'IND',BR:'BRA',IT:'ITA',
  ES:'ESP',NL:'NLD',BE:'BEL',AT:'AUT',PL:'POL',PT:'PRT',CH:'CHE',SE:'SWE',NO:'NOR',
  DK:'DNK',FI:'FIN',IE:'IRL',CZ:'CZE',HU:'HUN',RO:'ROU',GR:'GRC',BG:'BGR',HR:'HRV',
  SK:'SVK',SI:'SVN',LT:'LTU',LV:'LVA',EE:'EST',CY:'CYP',MT:'MLT',LU:'LUX',
  RU:'RUS',TR:'TUR',SA:'SAU',AE:'ARE',KR:'KOR',AU:'AUS',CA:'CAN',MX:'MEX',AR:'ARG',
  CL:'CHL',CO:'COL',PE:'PER',ZA:'ZAF',EG:'EGY',NG:'NGA',KE:'KEN',MA:'MAR',
  TH:'THA',VN:'VNM',ID:'IDN',MY:'MYS',PH:'PHL',SG:'SGP',TW:'TWN',HK:'HKG',
  NZ:'NZL',IL:'ISR',UA:'UKR',PK:'PAK',BD:'BGD',DZ:'DZA',TN:'TUN',GH:'GHA',
  QA:'QAT',KW:'KWT',OM:'OMN',BH:'BHR',JO:'JOR',LB:'LBN',IQ:'IRQ',IR:'IRN',
};

/**
 * Recupera un singolo indicatore World Bank per un Paese.
 * Ritorna { value, year } con l'ultimo anno disponibile, oppure { value: null, year: null }.
 */
async function fetchWBIndicator(alpha3, indicatorCode) {
  try {
    const url = `https://api.worldbank.org/v2/country/${alpha3}/indicator/${indicatorCode}?format=json&per_page=10&mrv=5`;
    const resp = await fetch(url);
    if (!resp.ok) return { value: null, year: null };
    const json = await resp.json();
    const records = json?.[1];
    if (!Array.isArray(records) || records.length === 0) return { value: null, year: null };
    for (const rec of records) {
      if (rec.value !== null && rec.value !== undefined) {
        return { value: rec.value, year: String(rec.date) };
      }
    }
    return { value: null, year: null };
  } catch (err) {
    console.error(`[WB API] Errore fetch ${indicatorCode} per ${alpha3}:`, err);
    return { value: null, year: null };
  }
}

/**
 * Recupera serie storica di un indicatore World Bank (ultimi N anni).
 * Ritorna array [{ year, value }] ordinato per anno crescente.
 */
async function fetchWBSeries(alpha3, indicatorCode, years = 5) {
  try {
    const url = `https://api.worldbank.org/v2/country/${alpha3}/indicator/${indicatorCode}?format=json&per_page=${years + 2}&mrv=${years + 2}`;
    const resp = await fetch(url);
    if (!resp.ok) return [];
    const json = await resp.json();
    const records = json?.[1];
    if (!Array.isArray(records)) return [];
    return records
      .filter(r => r.value !== null && r.value !== undefined)
      .map(r => ({ year: parseInt(r.date), value: r.value }))
      .sort((a, b) => a.year - b.year);
  } catch (err) {
    return [];
  }
}

/**
 * Recupera dati macro World Bank per i Paesi selezionati.
 * TUTTI i dati provengono da World Bank API — nessuna AI, nessuna stima.
 * 
 * Indicatori:
 * - SP.POP.TOTL: Popolazione totale
 * - NY.GDP.MKTP.CD: PIL nominale USD
 * - NY.GDP.PCAP.CD: PIL pro capite USD
 * - FP.CPI.TOTL.ZG: Inflazione (CPI % annuo)
 * - IC.BUS.EASE.XQ: Ease of Doing Business score (0-100)
 * - LP.LPI.OVRL.XQ: Logistics Performance Index (1-5)
 * - BN.CAB.XOKA.CD: Saldo partite correnti (USD)
 * - PA.NUS.FCRF: Tasso di cambio ufficiale (LCU per USD)
 */
export async function fetchMacroData(countryCodes) {
  const codes = countryCodes.filter(c => c !== 'WLD');
  if (codes.length === 0) return {};

  const map = {};

  const promises = codes.map(async (code2) => {
    const alpha3 = ALPHA2_TO_ALPHA3[code2] || code2;

    const [pop, gdp, gdpPc, inflazione, doingBusiness, lpi, partiteCorrenti, tassoUfficiale, infSerie] = await Promise.all([
      fetchWBIndicator(alpha3, 'SP.POP.TOTL'),
      fetchWBIndicator(alpha3, 'NY.GDP.MKTP.CD'),
      fetchWBIndicator(alpha3, 'NY.GDP.PCAP.CD'),
      fetchWBIndicator(alpha3, 'FP.CPI.TOTL.ZG'),
      fetchWBIndicator(alpha3, 'IC.BUS.EASE.XQ'),
      fetchWBIndicator(alpha3, 'LP.LPI.OVRL.XQ'),
      fetchWBIndicator(alpha3, 'BN.CAB.XOKA.CD'),
      fetchWBIndicator(alpha3, 'PA.NUS.FCRF'),
      fetchWBSeries(alpha3, 'PA.NUS.FCRF', 5),
    ]);

    // Calcola volatilità cambio dagli ultimi 5 anni di tasso ufficiale
    let volatilita_cambio = null;
    if (infSerie.length >= 3) {
      const valori = infSerie.map(s => s.value).filter(v => v > 0);
      if (valori.length >= 3) {
        const media = valori.reduce((a, b) => a + b, 0) / valori.length;
        const varianza = valori.reduce((sum, v) => sum + Math.pow(v - media, 2), 0) / valori.length;
        volatilita_cambio = parseFloat(((Math.sqrt(varianza) / media) * 100).toFixed(1));
      }
    }

    const datiMancanti = [];
    if (pop.value === null) datiMancanti.push('Popolazione');
    if (gdp.value === null) datiMancanti.push('PIL nominale');
    if (gdpPc.value === null) datiMancanti.push('PIL pro capite');

    map[code2] = {
      codice: code2,
      nome: null,
      popolazione: pop.value,
      popolazione_anno: pop.year,
      pil_nominale: gdp.value,
      pil_nominale_anno: gdp.year,
      pil_pro_capite: gdpPc.value,
      pil_pro_capite_anno: gdpPc.year,
      // Nuovi indicatori stabilità economica
      inflazione: inflazione.value !== null ? parseFloat(inflazione.value.toFixed(1)) : null,
      inflazione_anno: inflazione.year,
      doing_business_score: doingBusiness.value !== null ? parseFloat(doingBusiness.value.toFixed(1)) : null,
      doing_business_anno: doingBusiness.year,
      lpi_score: lpi.value !== null ? parseFloat(lpi.value.toFixed(2)) : null,
      lpi_anno: lpi.year,
      partite_correnti_usd: partiteCorrenti.value,
      partite_correnti_anno: partiteCorrenti.year,
      tasso_cambio_ufficiale: tassoUfficiale.value,
      tasso_cambio_anno: tassoUfficiale.year,
      volatilita_cambio,
      fonte: 'World Bank API',
      dati_mancanti: datiMancanti.length > 0 ? datiMancanti : null
    };
  });

  try {
    await Promise.all(promises);
  } catch (err) {
    console.error('[ExportDataFetcher] fetchMacroData error:', err);
  }

  return map;
}

/**
 * STEP 1-2: Recupera dati ufficiali da UN Comtrade / Eurostat / TARIC
 * Usa HS a 4 cifre per analisi domanda globale.
 * Fallback: se dataset vuoto, riprova con Partner=World.
 */
export async function fetchTradeData(hsCode6, mercatiCodes, mercatiNames, exporterCode = 'IT', periodoAnni = 5) {
  const hs4 = toHS4(hsCode6);
  const currentYear = new Date().getFullYear();
  const periodoStart = currentYear - periodoAnni;
  const periodoEnd = currentYear - 1;
  const timestamp = new Date().toISOString();

  const mercatiNomi = mercatiCodes.map((code, i) => {
    const name = mercatiNames?.[i] || code;
    return `${name} (${code})`;
  }).join(', ');

  const exporterLabel = exporterCode === 'IT' ? 'Italia' : exporterCode;

  let result;
  try {
    result = await base44.integrations.Core.InvokeLLM({
      prompt: `Sei un analista di dati commerciali. Siamo nel ${currentYear}.

COMPITO: Recupera ESCLUSIVAMENTE dati numerici ufficiali per il codice HS ${hs4} (livello 4 cifre, heading) esportato da ${exporterLabel} (${exporterCode}) verso i seguenti mercati target: ${mercatiNomi}.

PARAMETRI QUERY:
- Codice HS: ${hs4} (4 cifre — livello heading per analisi domanda globale)
- Codice HS originale 6 cifre: ${hsCode6} (per riferimento dazi/normative specifiche)
- Reporter (importatore): ciascun Paese target
- Partner (esportatore): ${exporterLabel} (${exporterCode})
- Periodo: ${periodoStart}-${periodoEnd} (${periodoAnni} anni)

FONTI DA CONSULTARE (OBBLIGATORIE):
1) UN Comtrade (comtradeplus.un.org) — Reporter: ciascun Paese target, Partner: ${exporterCode}, HS heading ${hs4}, serie annuale ${periodoStart}-${periodoEnd}.
   - Se dati vuoti per un Paese con Partner=${exporterCode}: RIPETERE query con Partner=World per quel Paese.
   - Se ancora vuoti: segnalare in dati_non_disponibili.
2) Eurostat Comext (ec.europa.eu/eurostat) — Export ${exporterLabel} verso ciascun paese per HS ${hs4}.
3) TARIC (ec.europa.eu/taxation_customs/dds2/taric) — Dazi MFN per HS ${hsCode6}, misure anti-dumping.

REGOLE INDEROGABILI:
- Restituisci SOLO dati numerici verificati. NESSUNA interpretazione.
- Per ogni dato indica la fonte esatta e l'anno.
- Se un dato NON è reperibile dopo doppia verifica (partner specifico + World), restituisci null.
- NON inventare, NON stimare, NON approssimare.
- Per la serie storica: array con anno e valore per ogni anno disponibile nel periodo ${periodoStart}-${periodoEnd}.
- Per i fornitori: top 5 Paesi esportatori verso ciascun Paese target per HS ${hs4}.
- CONVERSIONE VALUTA: Tasso cambio medio annuale EUR/USD dalla BCE per ultimo anno disponibile.

OUTPUT: JSON strutturato con dati grezzi per ciascun mercato.`,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        hs_code_heading: { type: "string", description: "Codice HS 4 cifre usato per query" },
        hs_code_full: { type: "string", description: "Codice HS 6 cifre originale" },
        exporter: { type: "string", description: "Paese esportatore (Reporter)" },
        periodo: { type: "string", description: "Periodo analizzato" },
        data_retrieval_date: { type: "string" },
        mercati: {
          type: "array",
          items: {
            type: "object",
            properties: {
              paese_code: { type: "string" },
              paese_nome: { type: "string" },
              import_totale: {
                type: "object",
                properties: {
                  valore_usd: { type: "string" },
                  anno: { type: "string" },
                  fonte: { type: "string" }
                }
              },
              export_from_exporter: {
                type: "object",
                properties: {
                  valore_usd: { type: "string", description: "Valore export dall'exporter verso Paese target, USD" },
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
                    valore_usd: { type: "string" },
                    fonte: { type: "string" }
                  }
                }
              },
              top_fornitori: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    paese: { type: "string" },
                    valore_usd: { type: "string" },
                    quota_percentuale: { type: "string" },
                    fonte: { type: "string" }
                  }
                }
              },
              posizione_exporter: { type: "string", description: "Ranking dell'exporter tra i fornitori" },
              quota_exporter: { type: "string", description: "Quota % dell'exporter sul totale import" },
              dazi: {
                type: "object",
                properties: {
                  dazio_mfn: { type: "string" },
                  dazio_preferenziale: { type: "string" },
                  anti_dumping: { type: "string" },
                  restrizioni: { type: "string" },
                  fonte: { type: "string" }
                }
              },
              query_fallback_world: { type: "boolean", description: "true se dati ottenuti con Partner=World" }
            }
          }
        },
        tasso_cambio_eur_usd: {
          type: "object",
          properties: {
            tasso: { type: "string" },
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
    console.error('[ExportDataFetcher] fetchTradeData API error:', err);
    return { _api_error: true, _error_message: err?.message || 'Unknown error' };
  }

  if (!result || typeof result !== 'object') {
    console.error('[ExportDataFetcher] fetchTradeData: risposta vuota o non valida', result);
    return { _api_error: true, _error_message: 'Risposta API non valida' };
  }

  // Aggiunge metadata di query per trasparenza
  result._query_log = {
    hs_code_heading: hs4,
    hs_code_full: hsCode6,
    exporter: exporterCode,
    partners: mercatiCodes,
    periodo: `${periodoStart}-${periodoEnd}`,
    timestamp,
    records_returned: result.mercati?.length || 0
  };
  result._timestamp_recupero = timestamp;

  return result;
}

/**
 * STEP 3: Calcola metriche dai dati grezzi (lato client, nessuna AI)
 */
export function computeMetrics(tradeData) {
  if (tradeData?._api_error) return { _api_error: true, _error_message: tradeData._error_message };
  if (!tradeData?.mercati) return null;

  const currentYearForMetrics = new Date().getFullYear();

  // Tasso di cambio EUR/USD dalla BCE
  const tassoRaw = tradeData.tasso_cambio_eur_usd?.tasso;
  const tassoEurUsd = tassoRaw ? parseFloat(String(tassoRaw).replace(/[^0-9.]/g, '')) : null;
  const tassoAnno = tradeData.tasso_cambio_eur_usd?.anno || null;
  const tassoFonte = tradeData.tasso_cambio_eur_usd?.fonte || 'BCE';
  const conversionePossibile = tassoEurUsd && !isNaN(tassoEurUsd) && tassoEurUsd > 0;

  // Determina periodo dal log di query se disponibile
  const periodoAnni = tradeData._query_log?.periodo ? 
    parseInt(tradeData._query_log.periodo.split('-')[1]) - parseInt(tradeData._query_log.periodo.split('-')[0]) + 1 : 5;

  const risultati = tradeData.mercati.map(mercato => {
    const serie = mercato.serie_storica || [];
    const valori = serie
      .map(s => parseFloat(String(s.valore_usd).replace(/[^0-9.]/g, '')))
      .filter(v => !isNaN(v) && v > 0);

    const anniPresenti = serie.map(s => s.anno).filter(a => typeof a === 'number');
    const anniAttesi = Array.from({ length: periodoAnni }, (_, i) => currentYearForMetrics - periodoAnni + i);
    const anniMancanti = anniAttesi.filter(a => !anniPresenti.includes(a));
    const datasetCompleto = anniMancanti.length <= 1 && valori.length >= Math.max(periodoAnni - 1, 3);

    // Crescita % ultimi 3 anni — solo se dataset completo
    let crescita_3_anni = null;
    if (datasetCompleto && valori.length >= 4) {
      const inizio = valori[valori.length - 4];
      const fine = valori[valori.length - 1];
      if (inizio > 0) {
        crescita_3_anni = ((fine - inizio) / inizio * 100).toFixed(1);
      }
    }

    // Trend medio annuo (CAGR) — solo se dataset completo
    let cagr = null;
    if (datasetCompleto && valori.length >= 2) {
      const primo = valori[0];
      const ultimo = valori[valori.length - 1];
      const anni = valori.length - 1;
      if (primo > 0 && anni > 0) {
        cagr = ((Math.pow(ultimo / primo, 1 / anni) - 1) * 100).toFixed(1);
      }
    }

    // Volatilità (deviazione standard / media) — solo se dataset completo
    let volatilita = null;
    if (datasetCompleto && valori.length >= 3) {
      const media = valori.reduce((a, b) => a + b, 0) / valori.length;
      if (media > 0) {
        const varianza = valori.reduce((sum, v) => sum + Math.pow(v - media, 2), 0) / valori.length;
        volatilita = ((Math.sqrt(varianza) / media) * 100).toFixed(1);
      }
    }

    // Ranking per volume (import totale)
    const importTotale = mercato.import_totale?.valore_usd 
      ? parseFloat(String(mercato.import_totale.valore_usd).replace(/[^0-9.]/g, ''))
      : null;

    // Conversione USD → EUR
    const importTotaleEur = conversionePossibile && importTotale ? Math.round(importTotale / tassoEurUsd) : null;
    
    // Support both old and new field names
    const exportRaw = mercato.export_from_exporter?.valore_usd || mercato.export_italia?.valore_usd;
    const exportItalia = exportRaw
      ? parseFloat(String(exportRaw).replace(/[^0-9.]/g, ''))
      : null;
    const exportItaliaEur = conversionePossibile && exportItalia ? Math.round(exportItalia / tassoEurUsd) : null;

    // Converti serie storica in EUR
    const serieEur = conversionePossibile
      ? serie.map(s => ({
          ...s,
          valore_eur: Math.round(
            (parseFloat(String(s.valore_usd).replace(/[^0-9.]/g, '')) || 0) / tassoEurUsd
          )
        }))
      : serie;

    return {
      paese_code: mercato.paese_code,
      paese_nome: mercato.paese_nome,
      import_totale_raw: importTotale,
      import_totale_eur: importTotaleEur,
      export_italia_raw: exportItalia,
      export_italia_eur: exportItaliaEur,
      crescita_3_anni,
      cagr,
      volatilita,
      serie_storica: serie,
      serie_storica_eur: serieEur,
      dati_completi: datasetCompleto,
      anni_mancanti: anniMancanti.length > 0 ? anniMancanti : null,
      posizione_exporter: mercato.posizione_exporter || mercato.posizione_italia,
      quota_exporter: mercato.quota_exporter || mercato.quota_italia,
      query_fallback_world: mercato.query_fallback_world || false
    };
  });

  // === VALIDAZIONE ANOMALIE ===
  const currentYear = new Date().getFullYear();
  const anniAttesi = Array.from({ length: 5 }, (_, i) => currentYear - 5 + i);
  const anomalie = [];

  risultati.forEach(m => {
    const serie = m.serie_storica || [];
    const valori = serie
      .map(s => ({ anno: s.anno, val: parseFloat(String(s.valore_usd).replace(/[^0-9.]/g, '')) }))
      .filter(v => !isNaN(v.val));

    // 1. Valori negativi
    valori.forEach(v => {
      if (v.val < 0) {
        anomalie.push(`${m.paese_nome}: valore negativo (${v.val}) per anno ${v.anno}`);
      }
    });

    // 2. Crescita YoY > 500%
    for (let i = 1; i < valori.length; i++) {
      if (valori[i - 1].val > 0) {
        const crescitaYoY = ((valori[i].val - valori[i - 1].val) / valori[i - 1].val) * 100;
        if (crescitaYoY > 500) {
          anomalie.push(`${m.paese_nome}: crescita anomala ${valori[i - 1].anno}→${valori[i].anno} (+${crescitaYoY.toFixed(0)}%)`);
        }
      }
    }

    // 3. Anni mancanti nei 5 anni attesi
    const anniPresenti = valori.map(v => v.anno);
    const anniMancanti = anniAttesi.filter(a => !anniPresenti.includes(a));
    if (anniMancanti.length > 0 && valori.length > 0) {
      anomalie.push(`${m.paese_nome}: anni mancanti nella serie storica: ${anniMancanti.join(', ')}`);
    }
  });

  return {
    metriche: risultati,
    tasso_cambio: conversionePossibile ? {
      tasso: tassoEurUsd,
      anno: tassoAnno,
      fonte: tassoFonte,
      nota: `Valori convertiti in EUR al tasso medio BCE anno ${tassoAnno}.`
    } : null,
    anomalie: anomalie.length > 0 ? anomalie : null,
    anomalie_presenti: anomalie.length > 0
  };
}

/**
 * STEP 4: Interpretazione strategica AI (riceve SOLO dati calcolati, produce SOLO interpretazione)
 */
export async function interpretData(tradeData, metricsResult, hsCode, hsDescrizione, profiloAzienda, macroDataMap = {}) {
  if (tradeData?._api_error || metricsResult?._api_error) {
    console.error('[ExportDataFetcher] interpretData skipped: upstream API error');
    return { _api_error: true };
  }
  const currentYear = new Date().getFullYear();
  const metrics = metricsResult?.metriche || metricsResult || [];
  const tassoCambio = metricsResult?.tasso_cambio;

  // Prepara il riepilogo dati per l'AI
  const riepilogoDati = tradeData.mercati.map((m, i) => {
    const met = Array.isArray(metrics) ? metrics[i] : null;
    return `
MERCATO: ${m.paese_nome} (${m.paese_code})
- Import totale HS ${hsCode}: ${m.import_totale?.valore_usd || 'N/D'}${met?.import_totale_eur ? ` (≈ €${met.import_totale_eur.toLocaleString('it-IT')})` : ''} (${m.import_totale?.anno || 'N/D'}, ${m.import_totale?.fonte || 'N/D'})
- Export Italia→${m.paese_nome}: ${m.export_italia?.valore_usd || 'N/D'}${met?.export_italia_eur ? ` (≈ €${met.export_italia_eur.toLocaleString('it-IT')})` : ''} (${m.export_italia?.anno || 'N/D'}, ${m.export_italia?.fonte || 'N/D'})
- Quota Italia: ${m.quota_italia || 'N/D'}
- Posizione Italia tra fornitori: ${m.posizione_italia || 'N/D'}
- CAGR serie storica: ${met?.cagr ? met.cagr + '%' : 'Non calcolabile'}
- Crescita ultimi 3 anni: ${met?.crescita_3_anni ? met.crescita_3_anni + '%' : 'Non calcolabile'}
- Volatilità serie storica: ${met?.volatilita ? met.volatilita + '%' : 'Non calcolabile'}
- Top fornitori: ${(m.top_fornitori || []).map(f => `${f.paese} ${f.quota_percentuale} (${f.valore_usd})`).join(', ') || 'N/D'}
- Dazio MFN: ${m.dazi?.dazio_mfn || 'N/D'} (${m.dazi?.fonte || 'N/D'})
- Anti-dumping: ${m.dazi?.anti_dumping || 'Nessuna'}
- Dati completi: ${met?.dati_completi ? 'Sì' : 'Parziali/Insufficienti'}`;
  }).join('\n');

  const datiNonDisponibili = tradeData.dati_non_disponibili?.length > 0
    ? `\nDATI NON DISPONIBILI:\n${tradeData.dati_non_disponibili.join('\n')}`
    : '';

  const notaCambio = tassoCambio
    ? `\nNOTA CONVERSIONE: ${tassoCambio.nota} (1 EUR = ${tassoCambio.tasso} USD, ${tassoCambio.fonte})`
    : '';

  let result;
  try {
  result = await base44.integrations.Core.InvokeLLM({
    prompt: `Sei un Export Manager con 20 anni di esperienza. Siamo nel ${currentYear}.

COMPITO: Interpreta i seguenti DATI GIÀ VERIFICATI e fornisci una valutazione strategica.

IMPORTANTE:
- NON inventare nuovi dati. Usa SOLO i numeri forniti sotto.
- Se un dato è "N/D" o "Non calcolabile", dillo esplicitamente — NON lo sostituire con stime.
- La tua analisi DEVE essere coerente con i numeri forniti.
- Se i dati sono insufficienti per un mercato, scrivi "Dati insufficienti per una valutazione affidabile di questo mercato."

CODICE HS: ${hsCode}
DESCRIZIONE: ${hsDescrizione}

PROFILO AZIENDA:
- Settore: ${profiloAzienda.settore}
- Prodotto: ${profiloAzienda.prodotto}
- Fatturato: ${profiloAzienda.fatturato_annuo || 'Non specificato'}
- Esperienza export: ${profiloAzienda.esperienza_export || 'Nessuna'}
- Certificazioni: ${profiloAzienda.certificazioni || 'Non specificate'}
- Capacità produttiva export: ${profiloAzienda.capacita_produttiva || 'Non specificata'}

DATI COMMERCIALI VERIFICATI:
${riepilogoDati}
${datiNonDisponibili}${notaCambio}

STRUTTURA RICHIESTA per ogni mercato:
1. DOMANDA REALE: commenta il valore import totale — c'è domanda reale? Quanto è grande?
2. TREND STORICO: commenta CAGR e crescita 3 anni — mercato in crescita, stabile, o in calo?
3. STABILITÀ: commenta la volatilità — mercato stabile o volatile?
4. COERENZA CON AZIENDA: questa azienda ha le caratteristiche per competere in questo mercato?
5. CONCLUSIONE OPERATIVA: consiglio concreto (entrare, attendere, evitare) con motivazione basata sui numeri.

Fornisci anche una classifica dei mercati per priorità e i primi passi concreti.`,
    response_json_schema: {
      type: "object",
      properties: {
        readiness_score: { type: "number", description: "Punteggio readiness export 1-10" },
        readiness_commento: { type: "string" },
        mercati_analisi: {
          type: "array",
          items: {
            type: "object",
            properties: {
              paese_code: { type: "string" },
              paese_nome: { type: "string" },
              punteggio_opportunita: { type: "number" },
              domanda_reale: { type: "string", description: "Commento sulla domanda reale del mercato basato su import totale" },
              trend_storico: { type: "string", description: "Commento su CAGR e trend basato sui numeri" },
              stabilita: { type: "string", description: "Commento sulla volatilità della serie storica" },
              coerenza_azienda: { type: "string", description: "Compatibilità azienda-mercato" },
              conclusione_operativa: { type: "string", description: "Consiglio concreto: entrare/attendere/evitare" },
              opportunita: { type: "array", items: { type: "string" } },
              sfide: { type: "array", items: { type: "string" } },
              documenti_necessari: { type: "array", items: { type: "string" } },
              certificazioni_richieste: { type: "array", items: { type: "string" } },
              canali_distribuzione: { type: "array", items: { type: "string" } },
              dati_insufficienti: { type: "boolean", description: "true se dati insufficienti per analisi affidabile" }
            }
          }
        },
        classifica_mercati: {
          type: "array",
          items: {
            type: "object",
            properties: {
              posizione: { type: "number" },
              paese: { type: "string" },
              motivazione: { type: "string" }
            }
          }
        },
        raccomandazione_generale: { type: "string" },
        timeline_consigliata: { type: "string" },
        rischi_principali: { type: "array", items: { type: "string" } },
        primi_passi: { type: "array", items: { type: "string" } }
      }
    }
  });
  } catch (err) {
    console.error('[ExportDataFetcher] interpretData API error:', err);
    return { _api_error: true, _error_message: err?.message || 'Unknown error' };
  }

  if (!result || typeof result !== 'object') {
    console.error('[ExportDataFetcher] interpretData: risposta vuota o non valida');
    return { _api_error: true, _error_message: 'Risposta API non valida' };
  }

  return result;
}