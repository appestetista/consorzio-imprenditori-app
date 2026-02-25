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
 * STEP 1-2: Recupera dati ufficiali da API REALI multiple:
 * - UN Comtrade (Public + Premium)
 * - OEC (BACI data)
 * - WITS Trade Stats + TRAINS (Tariffe)
 * - Eurostat Comext (EU trade data)
 * - World Bank (Macro)
 * 
 * Usa la backend function fetchTradeDataMultiSource per chiamate API dirette.
 * NESSUNA AI per il recupero dati — solo API ufficiali.
 */
export async function fetchTradeData(hsCode6, mercatiCodes, mercatiNames, exporterCode = 'IT', periodoAnni = 5) {
  const hs4 = toHS4(hsCode6);
  const currentYear = new Date().getFullYear();
  const periodoStart = currentYear - periodoAnni;
  const periodoEnd = currentYear - 1;
  const timestamp = new Date().toISOString();

  let backendResult;
  try {
    const response = await base44.functions.invoke('fetchTradeDataMultiSource', {
      reporter_code: exporterCode,
      partner_codes: mercatiCodes.filter(c => c !== 'WLD'),
      hs_code: hsCode6,
      flow_type: 'export',
      period_years: periodoAnni,
      include_tariffs: true,
      include_eurostat: true
    });
    backendResult = response.data;
  } catch (err) {
    console.error('[ExportDataFetcher] fetchTradeDataMultiSource error:', err);
    return { _api_error: true, _error_message: err?.message || 'Backend function error' };
  }

  if (!backendResult || !backendResult.success) {
    console.error('[ExportDataFetcher] Backend returned error:', backendResult);
    return { _api_error: true, _error_message: backendResult?.error || 'Backend error' };
  }

  // Trasforma il risultato backend nel formato atteso dal frontend
  const mercati = mercatiCodes.filter(c => c !== 'WLD').map((code, i) => {
    const partnerData = backendResult.partners?.[code];
    const serie = partnerData?.serie_storica || [];
    const tariffs = partnerData?.tariffs;
    const topSuppliers = partnerData?.top_suppliers;
    const name = mercatiNames?.[i] || code;

    // Ultimo anno con dati per import totale
    const lastYearData = serie.length > 0 ? serie[serie.length - 1] : null;

    // Trova posizione e quota dell'esportatore dai top suppliers
    let posizioneExporter = null;
    let quotaExporter = null;
    if (topSuppliers?.top_fornitori) {
      const exporterName = exporterCode === 'IT' ? 'Italy' : exporterCode;
      const idx = topSuppliers.top_fornitori.findIndex(f =>
        f.paese?.toLowerCase().includes(exporterName.toLowerCase()) ||
        f.paese?.toLowerCase().includes('ital')
      );
      if (idx >= 0) {
        posizioneExporter = `#${idx + 1}`;
        quotaExporter = topSuppliers.top_fornitori[idx].quota_percentuale;
      }
    }

    return {
      paese_code: code,
      paese_nome: name,
      import_totale: topSuppliers ? {
        valore_usd: topSuppliers.import_totale_usd ? `$${topSuppliers.import_totale_usd.toLocaleString('en-US')}` : (lastYearData ? `$${lastYearData.trade_value_usd.toLocaleString('en-US')}` : null),
        anno: String(topSuppliers.anno || (lastYearData?.year)),
        fonte: topSuppliers.fonte || lastYearData?.source || 'N/D'
      } : (lastYearData ? {
        valore_usd: `$${lastYearData.trade_value_usd.toLocaleString('en-US')}`,
        anno: String(lastYearData.year),
        fonte: lastYearData.source || 'N/D'
      } : { valore_usd: null, anno: null, fonte: null }),
      export_from_exporter: {
        valore_usd: lastYearData ? `$${lastYearData.trade_value_usd.toLocaleString('en-US')}` : null,
        anno: lastYearData ? String(lastYearData.year) : null,
        fonte: lastYearData?.source || 'N/D'
      },
      serie_storica: serie.map(s => ({
        anno: s.year,
        valore_usd: `$${s.trade_value_usd?.toLocaleString('en-US') || '0'}`,
        fonte: s.source || 'multi-source',
        sources: s.sources,
        trade_value_eur_eurostat: s.trade_value_eur_eurostat || null,
        net_weight_kg: s.net_weight_kg || null,
        quantity: s.quantity || null,
        quantity_unit: s.quantity_unit || null,
        price_per_kg_usd: s.price_per_kg_usd || null,
        discrepancy: s.discrepancy || false
      })),
      top_fornitori: (topSuppliers?.top_fornitori || []).map(f => ({
        paese: f.paese,
        valore_usd: `$${f.valore_usd?.toLocaleString('en-US') || '0'}`,
        quota_percentuale: f.quota_percentuale,
        fonte: f.fonte || 'UN Comtrade'
      })),
      posizione_exporter: posizioneExporter,
      quota_exporter: quotaExporter,
      dazi: tariffs ? {
        dazio_mfn: tariffs.dazio_mfn,
        dazio_preferenziale: tariffs.dazio_preferenziale,
        anti_dumping: null,
        restrizioni: null,
        fonte: tariffs.fonte || 'WITS/TRAINS'
      } : { dazio_mfn: null, dazio_preferenziale: null, anti_dumping: null, restrizioni: null, fonte: null },
      query_fallback_world: false
    };
  });

  const result = {
    hs_code_heading: hs4,
    hs_code_full: hsCode6,
    exporter: exporterCode,
    periodo: `${periodoStart}-${periodoEnd}`,
    data_retrieval_date: timestamp,
    mercati,
    tasso_cambio_eur_usd: null, // Verrà calcolato se Eurostat ha dati EUR
    dati_non_disponibili: [],
    source_status: backendResult.source_status,
    errors_backend: backendResult.errors
  };

  // Identifica dati non disponibili
  mercati.forEach(m => {
    if (!m.import_totale?.valore_usd) result.dati_non_disponibili.push(`${m.paese_nome}: import totale non disponibile`);
    if (m.serie_storica.length < 3) result.dati_non_disponibili.push(`${m.paese_nome}: serie storica incompleta (${m.serie_storica.length} anni)`);
    if (!m.dazi?.dazio_mfn) result.dati_non_disponibili.push(`${m.paese_nome}: dazi MFN non disponibili`);
  });

  // Metadata di query per trasparenza
  result._query_log = {
    hs_code_heading: hs4,
    hs_code_full: hsCode6,
    exporter: exporterCode,
    partners: mercatiCodes,
    periodo: `${periodoStart}-${periodoEnd}`,
    timestamp,
    records_returned: mercati.length,
    sources_used: backendResult.source_status
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

    // === MARKET SIZING: Consumo Apparente ===
    // C = (P + M) - X → se P non disponibile, C ≈ M - X (dipendenza import)
    // M = import totale del paese per questo HS (da top_suppliers)
    // X = export del paese per questo HS (non disponibile direttamente, usiamo proxy)
    // Per ora: import totale netto da top_suppliers, export_italia = export IT→paese
    const importTotaleMercato = mercato.import_totale?.valore_usd
      ? parseFloat(String(mercato.import_totale.valore_usd).replace(/[^0-9.]/g, ''))
      : null;
    
    // Nota: "Produzione Locale" (P) non è disponibile da queste API
    // Calcola dipendenza import come proxy
    let consumo_apparente = null;
    let produzione_locale_disponibile = false;
    let dipendenza_import = null;
    
    if (importTotaleMercato && importTotaleMercato > 0) {
      // Senza P, il consumo apparente minimo è almeno M (import totale)
      consumo_apparente = importTotaleMercato;
      dipendenza_import = 'alta'; // 100% del consumo misurato è import
      produzione_locale_disponibile = false;
    }

    // Demand score basato su PIL pro capite e volume import
    // Validazione coerenza: import / popolazione = import pro capite
    let demand_score = null;

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
      query_fallback_world: mercato.query_fallback_world || false,
      // Market Sizing
      consumo_apparente,
      produzione_locale_disponibile,
      dipendenza_import,
      demand_score,
      import_totale_mercato: importTotaleMercato
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
 * Arricchisce le metriche con demand_score e validazione coerenza usando dati macro.
 * Chiamato dopo computeMetrics + fetchMacroData.
 */
export function enrichMetricsWithDemand(metricsResult, macroDataMap) {
  if (!metricsResult?.metriche || !macroDataMap) return metricsResult;

  const enriched = metricsResult.metriche.map(m => {
    const macro = macroDataMap[m.paese_code];
    if (!macro) return m;

    const pop = macro.popolazione;
    const gdpPc = macro.pil_pro_capite;
    const importVal = m.import_totale_raw;

    // Import pro capite (validazione coerenza)
    let import_pro_capite = null;
    if (importVal && pop && pop > 0) {
      import_pro_capite = parseFloat((importVal / pop).toFixed(2));
    }

    // Demand Score: Low / Medium / High
    // Basato su: 1) Volume import (>$100M=alto), 2) PIL pro capite (>$20k=medio/alto), 3) Crescita (CAGR>5=alto)
    let demand_score = 'Low';
    let demandPoints = 0;

    if (importVal) {
      if (importVal > 500000000) demandPoints += 3;      // >$500M
      else if (importVal > 100000000) demandPoints += 2;  // >$100M
      else if (importVal > 10000000) demandPoints += 1;   // >$10M
    }

    if (gdpPc) {
      if (gdpPc > 40000) demandPoints += 2;
      else if (gdpPc > 20000) demandPoints += 1;
    }

    const cagrVal = m.cagr ? parseFloat(m.cagr) : null;
    if (cagrVal !== null) {
      if (cagrVal > 10) demandPoints += 2;
      else if (cagrVal > 5) demandPoints += 1;
      else if (cagrVal < -5) demandPoints -= 1;
    }

    if (demandPoints >= 5) demand_score = 'High';
    else if (demandPoints >= 3) demand_score = 'Medium';
    else demand_score = 'Low';

    // Validazione coerenza: se import pro capite > GDP pro capite → anomalia
    let coerenza_ok = true;
    let coerenza_nota = null;
    if (import_pro_capite && gdpPc && import_pro_capite > gdpPc * 0.05) {
      coerenza_ok = false;
      coerenza_nota = `Import pro capite ($${import_pro_capite.toFixed(2)}) elevato rispetto a PIL pc ($${Math.round(gdpPc)})`;
    }

    return {
      ...m,
      demand_score,
      import_pro_capite,
      coerenza_ok,
      coerenza_nota,
      consumo_apparente: m.consumo_apparente || m.import_totale_raw,
      produzione_locale_disponibile: m.produzione_locale_disponibile || false,
      dipendenza_import: m.dipendenza_import || (m.import_totale_raw ? 'alta' : null)
    };
  });

  return { ...metricsResult, metriche: enriched };
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
    const macro = macroDataMap[m.paese_code];
    let base = `
MERCATO: ${m.paese_nome} (${m.paese_code})
- Import totale HS ${hsCode}: ${m.import_totale?.valore_usd || 'N/D'}${met?.import_totale_eur ? ` (≈ €${met.import_totale_eur.toLocaleString('it-IT')})` : ''} (${m.import_totale?.anno || 'N/D'}, ${m.import_totale?.fonte || 'N/D'})
- Export Italia→${m.paese_nome}: ${m.export_from_exporter?.valore_usd || m.export_italia?.valore_usd || 'N/D'}${met?.export_italia_eur ? ` (≈ €${met.export_italia_eur.toLocaleString('it-IT')})` : ''} (${m.export_from_exporter?.anno || m.export_italia?.anno || 'N/D'}, ${m.export_from_exporter?.fonte || m.export_italia?.fonte || 'N/D'})
- Quota Italia: ${m.quota_exporter || m.quota_italia || 'N/D'}
- Posizione Italia tra fornitori: ${m.posizione_exporter || m.posizione_italia || 'N/D'}
- CAGR serie storica: ${met?.cagr ? met.cagr + '%' : 'Non calcolabile'}
- Crescita ultimi 3 anni: ${met?.crescita_3_anni ? met.crescita_3_anni + '%' : 'Non calcolabile'}
- Volatilità serie storica: ${met?.volatilita ? met.volatilita + '%' : 'Non calcolabile'}
- Top fornitori: ${(m.top_fornitori || []).map(f => `${f.paese} ${f.quota_percentuale} (${f.valore_usd})`).join(', ') || 'N/D'}
- Dazio MFN: ${m.dazi?.dazio_mfn || 'N/D'} (${m.dazi?.fonte || 'N/D'})
- Anti-dumping: ${m.dazi?.anti_dumping || 'Nessuna'}
- Dati completi: ${met?.dati_completi ? 'Sì' : 'Parziali/Insufficienti'}`;
    // --- MARKET SIZING & DOMANDA LOCALE ---
    base += '\n--- MARKET SIZING (calcolato) ---';
    if (met?.consumo_apparente) base += `\n- Consumo Apparente (proxy): $${met.consumo_apparente.toLocaleString('en-US')} [Nota: P non disponibile, C ≈ Import totale]`;
    base += `\n- Produzione Locale (P): ${met?.produzione_locale_disponibile ? 'Disponibile' : 'Non rilevata — dato non reperibile da API disponibili'}`;
    base += `\n- Dipendenza dall'Import: ${met?.dipendenza_import || 'N/D'}`;
    if (met?.demand_score) base += `\n- Demand Score: ${met.demand_score} [basato su: volume import, PIL pc, CAGR]`;
    if (met?.import_pro_capite) base += `\n- Import pro capite: $${met.import_pro_capite.toFixed(2)}`;
    if (met?.coerenza_nota) base += `\n- ⚠ Validazione coerenza: ${met.coerenza_nota}`;
    if (macro) {
      base += '\n--- STABILITÀ ECONOMICA (World Bank API) ---';
      if (macro.inflazione !== null) base += `\n- Inflazione CPI: ${macro.inflazione}% (${macro.inflazione_anno})`;
      if (macro.doing_business_score !== null) base += `\n- Ease of Doing Business: ${macro.doing_business_score}/100 (${macro.doing_business_anno})`;
      if (macro.lpi_score !== null) base += `\n- Logistics Performance Index: ${macro.lpi_score}/5 (${macro.lpi_anno})`;
      if (macro.volatilita_cambio !== null) base += `\n- Volatilità cambio (5 anni): ${macro.volatilita_cambio}%`;
      if (macro.partite_correnti_usd !== null) base += `\n- Saldo partite correnti: $${Math.round(macro.partite_correnti_usd).toLocaleString('en-US')} (${macro.partite_correnti_anno})`;
    }
    return base;
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
    prompt: `Agisci come consulente senior di internazionalizzazione con metodologia conforme a ICE, SACE, World Bank, International Trade Centre. Siamo nel ${currentYear}.

REGOLE ANTI-ALLUCINAZIONE INDEROGABILI:
- Usa ESCLUSIVAMENTE i dati numerici forniti sotto. NON inventare dati.
- Ogni dato numerico deve avere: fonte e anno.
- Se un dato è "N/D" o "Non calcolabile", scrivi: "Dato non disponibile da fonti ufficiali verificabili". NON stimare, NON dedurre, NON interpolare.
- NON usare espressioni generiche come "in forte crescita" senza numero.
- Separa chiaramente: dati oggettivi vs analisi interpretativa.
- Se il livello di affidabilità è basso, indicarlo esplicitamente.

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

STRUTTURA OBBLIGATORIA DELL'OUTPUT (9 sezioni):

1️⃣ MARKET SCREENING — Per ogni Paese:
   - Valore import totale del prodotto (ultimo anno, €) con fonte e anno
   - CAGR 3-5 anni (tasso annuo composto di crescita)
   - Dazi applicati (%)
   - Barriere non tariffarie (certificazioni obbligatorie)
   - Ranking finale con punteggio motivato
   Se mancano dati → dichiararlo esplicitamente.

2️⃣ ANALISI DOMANDA LOCALE & MARKET SIZING — Per ogni Paese:
   PROTOCOLLO MARKET SIZING:
   - Consumo Apparente C = (P + M) - X dove:
     • P = Produzione Locale (indica se disponibile o "Non rilevata")
     • M = Import totale (dai dati Comtrade forniti)
     • X = Export del paese (dai dati forniti)
   - Se P non disponibile: calcola Dipendenza Import = M / (M - X), indica "Produzione Locale non rilevata"
   - Import pro capite (import / popolazione): confronta con PIL pro capite per validazione coerenza
   - Demand Score (fornito nei dati): Low/Medium/High
   
   ANALISI QUALITATIVA:
   - Segmentazione mercato (premium / medio / entry level)
   - Volumi di consumo ufficiali (se disponibili nei dati)
   - Canali distributivi dominanti
   - Trend misurabili con percentuali
   No frasi descrittive senza dati numerici. Ogni valore con [Fonte, Anno].

3️⃣ ANALISI COMPETITIVA (Competitive Intelligence & Rivalry Analyzer) — Per ogni Paese:
   Agisci come Analista Strategico specializzato in Competitive Intelligence e Market Entry Strategy.
   
   PROTOCOLLO OBBLIGATORIO:
   a) COMPETITOR MAPPING: Identifica i primi 3-5 player (locali e internazionali) operanti nel Paese Target per la categoria merceologica HS ${hsCode}. Per ognuno definisci:
      - Nome azienda o "Cluster di competitor" se dato granulare non pubblico
      - Origine (Local/International)
      - Posizionamento (Premium / Value / Mass Market)
      - Value proposition sintetica
   
   b) PRICING BENCHMARKING: Rileva i prezzi medi di vendita (retail o wholesale) nel Paese Target per prodotti della stessa categoria HS. Indica range min-max con valuta locale e fonte.
   
   c) DISTRIBUTION ANALYSIS: Identifica i principali canali di vendita (e-commerce, GDO, distributori specializzati) e le modalità comuni di accesso al mercato. Stima % online vs offline se possibile.
   
   d) DIFFERENTIATION FACTORS: Individua le leve competitive più efficaci (certificazioni qualità, post-vendita, sostenibilità, packaging, prezzo).
   
   e) ENTRY BARRIERS: Brand loyalty level (High/Medium/Low), concentrazione mercato (HHI proxy da top_fornitori), certificazioni obbligatorie per competere.
   
   f) SWOT dell'azienda nel contesto competitivo specifico del Paese.
   
   INTEGRITY CONSTRAINTS:
   - NON generare nomi di aziende o prezzi fittizi. Se dati granulari non pubblici, descrivi il "Cluster di competitor".
   - Ogni dato numerico con anno e fonte.
   - I dati top_fornitori (Paesi esportatori) sono GIÀ forniti sotto — usali come base per il competitive mapping dei Paesi fornitori concorrenti.
   - Usa i dati Comtrade forniti + conoscenza del settore per il posizionamento.

4️⃣ REQUISITI NORMATIVI (Regulatory Compliance & Market Access Specialist) — Per ogni Paese:
   Agisci come Agente di Trade Compliance specializzato in barriere tecniche (TBT), misure sanitarie (SPS) e procedure doganali.
   
   PROTOCOLLO OBBLIGATORIO:
   a) TARIFFS & TAXES:
      - Dazio MFN e preferenziale (da Access2Markets / MacMap / dati già forniti)
      - IVA/GST/tasse interne nazionali con aliquota %
      - Fonte API/URL per ogni dato
   
   b) PRODUCT COMPLIANCE:
      - Certificazioni obbligatorie per il prodotto HS ${hsCode} nel Paese Target
      - Standard tecnici (ISO, EN, norme nazionali)
      - Requisiti di etichettatura (lingua, contenuto obbligatorio, normativa)
      - Fonte: WTO ePing / portali nazionali (FDA, CEN/CENELEC, ecc.)
   
   c) CUSTOMS & LOGISTICS DOCUMENTATION:
      - Documenti doganali richiesti (certificato origine, fattura commerciale, packing list, ecc.)
      - Licenze di importazione: Required / Not Required
      - Regolamenti packaging (materiali ammessi, fitosanitari per legno, ISPM-15, ecc.)
   
   d) COMPLIANCE ALERTS:
      - Misure SPS attive (sanitarie/fitosanitarie)
      - Notifiche TBT (barriere tecniche al commercio)
   
   INTEGRITY CONSTRAINTS:
   - NON inventare requisiti normativi. Se dato non verificabile, scrivi "Informazione da verificare con broker doganale".
   - Ogni requisito deve citare la fonte ufficiale (URL o ente).
   - Converti i termini tecnici in istruzioni chiare per l'utente.

5️⃣ ANALISI LOGISTICA — Per ogni Paese:
   - Incoterms consigliati
   - Costo medio spedizione (se disponibile)
   - Tempo medio transito
   - LPI (Logistics Performance Index) dal dato World Bank fornito
   No stime non supportate.

6️⃣ ANALISI ECONOMICA EXPORT:
   - Simulazione prezzo export (se dati sufficienti)
   - Margine lordo stimato con formula esplicitata
   - Break even point
   - Investimento iniziale stimato con suddivisione costi
   Se non calcolabile → spiegare perché.

7️⃣ CANALI DI INGRESSO — Per ogni Paese:
   - Importatori/distributori (tipologia)
   - Fiere di settore ufficiali rilevanti
   - Marketplace dominanti

8️⃣ ANALISI RISCHIO PAESE — Per ogni Paese (basata su dati World Bank/SACE forniti):
   - Rischio politico
   - Rischio economico (inflazione, partite correnti)
   - Rischio cambio (volatilità cambio)
   - Rischio credito
   Con indicatori numerici dai dati forniti.

9️⃣ ROADMAP OPERATIVA 12 MESI:
   - Timeline mensile con milestone
   - KPI misurabili
   - Budget allocato stimato

FORMATO: paragrafi brevi e tecnici, nessun linguaggio motivazionale, nessuna narrativa generica.`,
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
              mercato: { type: "string", description: "Nome mercato per display" },
              punteggio_opportunita: { type: "number", description: "1-10" },
              market_screening: {
                type: "object",
                properties: {
                  import_totale: { type: "string", description: "Valore import totale con fonte e anno" },
                  cagr: { type: "string", description: "CAGR con percentuale e periodo" },
                  dazi: { type: "string", description: "Dazi applicati %" },
                  barriere_non_tariffarie: { type: "string" },
                  ranking_motivazione: { type: "string" }
                }
              },
              domanda_locale: {
                type: "object",
                properties: {
                  consumo_apparente: { type: "string", description: "Valore C = (P + M) - X con formula, fonte e anno" },
                  produzione_locale: { type: "string", description: "'Non rilevata' se assente, altrimenti valore con fonte" },
                  import_value: { type: "string", description: "Valore M (import totale) con fonte e anno" },
                  export_value: { type: "string", description: "Valore X (export dal paese) con fonte e anno, o N/D" },
                  dipendenza_import: { type: "string", description: "Alta/Media/Bassa con calcolo M/(M-X) se possibile" },
                  import_pro_capite: { type: "string", description: "Import / Popolazione con validazione vs PIL pc" },
                  demand_score: { type: "string", enum: ["Low", "Medium", "High"], description: "Score basato su volume, PIL pc, CAGR" },
                  validazione_coerenza: { type: "string", description: "Confronto import pc vs PIL pc — coerente o anomalia" },
                  segmentazione: { type: "string", description: "premium/medio/entry level" },
                  volumi_consumo: { type: "string" },
                  canali_distributivi: { type: "array", items: { type: "string" } },
                  trend: { type: "string", description: "Con percentuali" }
                }
              },
              analisi_competitiva: {
                type: "object",
                properties: {
                  competitive_landscape: {
                    type: "object",
                    properties: {
                      market_concentration: { type: "string", enum: ["High", "Medium", "Low"], description: "Concentrazione mercato basata su HHI proxy" },
                      top_competitors: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string", description: "Nome azienda o Cluster di competitor" },
                            origin: { type: "string", enum: ["Local", "International"], description: "Origine" },
                            positioning: { type: "string", enum: ["Premium", "Value", "Mass Market"], description: "Posizionamento" },
                            value_proposition: { type: "string" },
                            estimated_market_share: { type: "string", description: "Quota stimata o N/D" }
                          }
                        }
                      }
                    }
                  },
                  pricing_intelligence: {
                    type: "object",
                    properties: {
                      local_price_range_min: { type: "string", description: "Prezzo minimo con valuta" },
                      local_price_range_max: { type: "string", description: "Prezzo massimo con valuta" },
                      benchmark_product: { type: "string", description: "Prodotto di riferimento per il range" },
                      notes: { type: "string" }
                    }
                  },
                  distribution_channels: {
                    type: "object",
                    properties: {
                      online_share: { type: "string", description: "% vendite online stimata" },
                      offline_key_players: { type: "array", items: { type: "string" }, description: "Principali distributori/retailer offline" },
                      standard_trade_margin: { type: "string", description: "Margine trade standard stimato" },
                      primary_entry_mode: { type: "string", description: "Modalità principale di accesso al mercato" }
                    }
                  },
                  differentiation_factors: {
                    type: "array",
                    items: { type: "string" },
                    description: "Leve competitive più efficaci nel mercato specifico"
                  },
                  entry_barriers: {
                    type: "object",
                    properties: {
                      brand_loyalty_level: { type: "string", enum: ["High", "Medium", "Low"] },
                      required_certifications: { type: "array", items: { type: "string" } },
                      notes: { type: "string" }
                    }
                  },
                  posizionamento_italia: { type: "string" },
                  swot: {
                    type: "object",
                    properties: {
                      strengths: { type: "array", items: { type: "string" } },
                      weaknesses: { type: "array", items: { type: "string" } },
                      opportunities: { type: "array", items: { type: "string" } },
                      threats: { type: "array", items: { type: "string" } }
                    }
                  },
                  sources: { type: "array", items: { type: "string" }, description: "Fonti utilizzate per l'analisi competitiva" }
                }
              },
              requisiti_normativi: {
                type: "object",
                properties: {
                  certificazioni: { type: "array", items: { type: "string" } },
                  tempi_autorizzazioni: { type: "string" },
                  costi: { type: "string" }
                }
              },
              logistica: {
                type: "object",
                properties: {
                  incoterms_consigliati: { type: "string" },
                  costo_spedizione: { type: "string" },
                  tempo_transito: { type: "string" },
                  lpi_score: { type: "string" }
                }
              },
              rischio_paese: {
                type: "object",
                properties: {
                  rischio_politico: { type: "string" },
                  rischio_economico: { type: "string" },
                  rischio_cambio: { type: "string" },
                  rischio_credito: { type: "string" }
                }
              },
              canali_ingresso: {
                type: "object",
                properties: {
                  importatori: { type: "string" },
                  fiere_settore: { type: "array", items: { type: "string" } },
                  marketplace: { type: "array", items: { type: "string" } }
                }
              },
              flussi_commerciali: {
                type: "object",
                properties: {
                  valore_import_annuo: { type: "string" },
                  export_italia_verso_paese: { type: "string" },
                  trend_yoy_percentuale: { type: "string" },
                  crescita_o_calo: { type: "string", enum: ["crescita", "calo", "stabile"] },
                  quota_italia: { type: "string" },
                  principali_fornitori: { type: "array", items: { type: "object", properties: { paese: { type: "string" }, quota_percentuale: { type: "string" } } } }
                }
              },
              dazi_taric: {
                type: "object",
                properties: {
                  dazio_mfn: { type: "string" },
                  dazio_preferenziale: { type: "string" },
                  anti_dumping: { type: "string" },
                  restrizioni: { type: "string" }
                }
              },
              opportunita: { type: "array", items: { type: "string" } },
              sfide: { type: "array", items: { type: "string" } },
              certificazioni_richieste: { type: "array", items: { type: "string" } },
              conclusione_operativa: { type: "string" },
              dati_insufficienti: { type: "boolean" }
            }
          }
        },
        analisi_economica: {
          type: "object",
          properties: {
            simulazione_prezzo: { type: "string" },
            margine_lordo: { type: "string", description: "Con formula esplicitata" },
            break_even: { type: "string" },
            investimento_iniziale: { type: "string", description: "Con suddivisione costi" },
            note: { type: "string" }
          }
        },
        roadmap_12_mesi: {
          type: "array",
          items: {
            type: "object",
            properties: {
              mese: { type: "string", description: "Es. Mese 1-2, Mese 3-4, etc." },
              attivita: { type: "string" },
              kpi: { type: "string" },
              budget_stimato: { type: "string" }
            }
          }
        },
        mercati_prioritari: { type: "array", items: { type: "string" } },
        raccomandazione_generale: { type: "string" },
        timeline_consigliata: { type: "string" },
        rischi_principali: { type: "array", items: { type: "string" } },
        primi_passi: { type: "array", items: { type: "string" } },
        risorse_utili: { type: "array", items: { type: "object", properties: { nome: { type: "string" }, url: { type: "string" } } } }
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