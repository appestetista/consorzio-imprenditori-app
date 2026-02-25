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
 * Helper: prepara il contesto dati comune per tutti i moduli LLM
 */
function buildDataContext(tradeData, metricsResult, hsCode, hsDescrizione, profiloAzienda, macroDataMap) {
  const currentYear = new Date().getFullYear();
  const metrics = metricsResult?.metriche || metricsResult || [];
  const tassoCambio = metricsResult?.tasso_cambio;

  const riepilogoDati = tradeData.mercati.map((m, i) => {
    const met = Array.isArray(metrics) ? metrics[i] : null;
    const macro = macroDataMap[m.paese_code];
    let base = `\nMERCATO: ${m.paese_nome} (${m.paese_code})
- Import totale HS ${hsCode}: ${m.import_totale?.valore_usd || 'N/D'}${met?.import_totale_eur ? ` (≈ €${met.import_totale_eur.toLocaleString('it-IT')})` : ''} (${m.import_totale?.anno || 'N/D'}, ${m.import_totale?.fonte || 'N/D'})
- Export Italia→${m.paese_nome}: ${m.export_from_exporter?.valore_usd || m.export_italia?.valore_usd || 'N/D'}${met?.export_italia_eur ? ` (≈ €${met.export_italia_eur.toLocaleString('it-IT')})` : ''} (${m.export_from_exporter?.anno || m.export_italia?.anno || 'N/D'})
- Quota Italia: ${m.quota_exporter || m.quota_italia || 'N/D'}, Posizione: ${m.posizione_exporter || m.posizione_italia || 'N/D'}
- CAGR: ${met?.cagr ? met.cagr + '%' : 'N/C'}, Crescita 3a: ${met?.crescita_3_anni ? met.crescita_3_anni + '%' : 'N/C'}, Volatilità: ${met?.volatilita ? met.volatilita + '%' : 'N/C'}
- Top fornitori: ${(m.top_fornitori || []).map(f => `${f.paese} ${f.quota_percentuale}`).join(', ') || 'N/D'}
- Dazio MFN: ${m.dazi?.dazio_mfn || 'N/D'}, Anti-dumping: ${m.dazi?.anti_dumping || 'Nessuna'}`;
    if (met?.consumo_apparente) base += `\n- Consumo Apparente proxy: $${met.consumo_apparente.toLocaleString('en-US')}`;
    if (met?.demand_score) base += `, Demand Score: ${met.demand_score}`;
    if (met?.import_pro_capite) base += `, Import pc: $${met.import_pro_capite.toFixed(2)}`;
    if (met?.coerenza_nota) base += `\n- ⚠ ${met.coerenza_nota}`;
    if (macro) {
      const parts = [];
      if (macro.inflazione !== null) parts.push(`Inflaz: ${macro.inflazione}%`);
      if (macro.lpi_score !== null) parts.push(`LPI: ${macro.lpi_score}/5`);
      if (macro.volatilita_cambio !== null) parts.push(`Volat.cambio: ${macro.volatilita_cambio}%`);
      if (macro.partite_correnti_usd !== null) parts.push(`Part.corr: $${Math.round(macro.partite_correnti_usd).toLocaleString('en-US')}`);
      if (macro.doing_business_score !== null) parts.push(`DoingBiz: ${macro.doing_business_score}/100`);
      if (parts.length > 0) base += `\n- Macro WB: ${parts.join(', ')}`;
    }
    return base;
  }).join('\n');

  const datiNonDisponibili = tradeData.dati_non_disponibili?.length > 0
    ? `\nDATI MANCANTI: ${tradeData.dati_non_disponibili.join('; ')}` : '';
  const notaCambio = tassoCambio ? `\nCambio: 1EUR=${tassoCambio.tasso}USD (${tassoCambio.fonte})` : '';

  const header = `Anno ${currentYear}. HS: ${hsCode} — ${hsDescrizione}
AZIENDA: Settore=${profiloAzienda.settore}, Prodotto=${profiloAzienda.prodotto}, Fatturato=${profiloAzienda.fatturato_annuo || 'N/S'}, Export=${profiloAzienda.esperienza_export || 'Nessuna'}, Cert=${profiloAzienda.certificazioni || 'N/S'}, Capacità=${profiloAzienda.capacita_produttiva || 'N/S'}, Posiz=${profiloAzienda.posizionamento || 'N/S'}, Model=${profiloAzienda.business_model || 'N/S'}, Canale=${profiloAzienda.canale_preferito || 'N/S'}
DATI:${riepilogoDati}${datiNonDisponibili}${notaCambio}`;

  const paeseNames = tradeData.mercati.map(m => `${m.paese_nome} (${m.paese_code})`).join(', ');
  return { header, paeseNames, currentYear };
}

/**
 * Helper: chiama LLM per un singolo modulo con schema ridotto
 */
async function callModule(moduleName, prompt, schema) {
  try {
    console.log(`[ExportModular] Avvio modulo: ${moduleName}`);
    const result = await base44.integrations.Core.InvokeLLM({
      add_context_from_internet: true,
      prompt,
      response_json_schema: schema
    });
    console.log(`[ExportModular] Modulo ${moduleName} completato`);
    return result;
  } catch (err) {
    console.error(`[ExportModular] Errore modulo ${moduleName}:`, err);
    return null;
  }
}

/**
 * STEP 4: Interpretazione strategica AI — MODULARE
 * Divide l'analisi in 5 chiamate LLM parallele, ciascuna focalizzata su 1-2 sezioni.
 * Poi assembla il risultato finale.
 */
export async function interpretData(tradeData, metricsResult, hsCode, hsDescrizione, profiloAzienda, macroDataMap = {}) {
  if (tradeData?._api_error || metricsResult?._api_error) {
    console.error('[ExportDataFetcher] interpretData skipped: upstream API error');
    return { _api_error: true };
  }

  const ctx = buildDataContext(tradeData, metricsResult, hsCode, hsDescrizione, profiloAzienda, macroDataMap);
  const rules = `Regole: ogni numero con fonte e anno. Se N/D scrivi "Non disponibile". No frasi generiche. Rispondi per OGNI Paese: ${ctx.paeseNames}`;

  // === MODULO A: Market Screening + Domanda Locale + Flussi Commerciali ===
  const modA = callModule('MarketScreening+Domanda', `${rules}\n${ctx.header}\n\nAnalizza per ogni Paese:\n1) MARKET SCREENING: import totale, CAGR, dazi, barriere non tariffarie, ranking motivato\n2) DOMANDA LOCALE: consumo apparente C=(P+M)-X, produzione locale, dipendenza import, demand score, segmentazione, canali distributivi, trend con %\n3) FLUSSI COMMERCIALI: import annuo, export IT→paese, trend YoY, quota Italia, principali fornitori`, {
    type: "object",
    properties: {
      mercati: {
        type: "array",
        items: {
          type: "object",
          properties: {
            paese_code: { type: "string" }, paese_nome: { type: "string" },
            market_screening: { type: "object", properties: { import_totale: { type: "string" }, cagr: { type: "string" }, dazi: { type: "string" }, barriere_non_tariffarie: { type: "string" }, ranking_motivazione: { type: "string" } } },
            domanda_locale: { type: "object", properties: { consumo_apparente: { type: "string" }, produzione_locale: { type: "string" }, import_value: { type: "string" }, export_value: { type: "string" }, dipendenza_import: { type: "string" }, import_pro_capite: { type: "string" }, demand_score: { type: "string", enum: ["Low","Medium","High"] }, validazione_coerenza: { type: "string" }, segmentazione: { type: "string" }, volumi_consumo: { type: "string" }, canali_distributivi: { type: "array", items: { type: "string" } }, trend: { type: "string" } } },
            flussi_commerciali: { type: "object", properties: { valore_import_annuo: { type: "string" }, export_italia_verso_paese: { type: "string" }, trend_yoy_percentuale: { type: "string" }, crescita_o_calo: { type: "string", enum: ["crescita","calo","stabile"] }, quota_italia: { type: "string" }, principali_fornitori: { type: "array", items: { type: "object", properties: { paese: { type: "string" }, quota_percentuale: { type: "string" } } } } } }
          }
        }
      }
    }
  });

  // === MODULO B: Competitive Intelligence ===
  const modB = callModule('CompetitiveIntelligence', `${rules}\n${ctx.header}\n\nPer ogni Paese, analisi competitiva:\n- Competitor mapping (3-5 player, origine Local/International, posizionamento Premium/Value/Mass Market)\n- Pricing benchmark (range min-max con valuta locale)\n- Distribution channels (online share %, offline key players, trade margin)\n- Differentiation factors\n- Entry barriers (brand loyalty, certificazioni)\n- SWOT dell'azienda nel contesto\nFiltra per posizionamento azienda: ${profiloAzienda.posizionamento || 'generico'}`, {
    type: "object",
    properties: {
      mercati: {
        type: "array",
        items: {
          type: "object",
          properties: {
            paese_code: { type: "string" }, paese_nome: { type: "string" },
            analisi_competitiva: { type: "object", properties: {
              competitive_landscape: { type: "object", properties: { market_concentration: { type: "string", enum: ["High","Medium","Low"] }, top_competitors: { type: "array", items: { type: "object", properties: { name: { type: "string" }, origin: { type: "string", enum: ["Local","International"] }, positioning: { type: "string", enum: ["Premium","Value","Mass Market"] }, value_proposition: { type: "string" }, estimated_market_share: { type: "string" } } } } } },
              pricing_intelligence: { type: "object", properties: { local_price_range_min: { type: "string" }, local_price_range_max: { type: "string" }, benchmark_product: { type: "string" }, notes: { type: "string" } } },
              distribution_channels: { type: "object", properties: { online_share: { type: "string" }, offline_key_players: { type: "array", items: { type: "string" } }, standard_trade_margin: { type: "string" }, primary_entry_mode: { type: "string" } } },
              differentiation_factors: { type: "array", items: { type: "string" } },
              entry_barriers: { type: "object", properties: { brand_loyalty_level: { type: "string", enum: ["High","Medium","Low"] }, required_certifications: { type: "array", items: { type: "string" } }, notes: { type: "string" } } },
              posizionamento_italia: { type: "string" },
              swot: { type: "object", properties: { strengths: { type: "array", items: { type: "string" } }, weaknesses: { type: "array", items: { type: "string" } }, opportunities: { type: "array", items: { type: "string" } }, threats: { type: "array", items: { type: "string" } } } },
              sources: { type: "array", items: { type: "string" } }
            } }
          }
        }
      }
    }
  });

  // === MODULO C: Regulatory Compliance + Dazi ===
  const modC = callModule('RegulatoryCompliance', `${rules}\n${ctx.header}\n\nPer ogni Paese, regulatory compliance:\n- Dazi MFN e preferenziali, IVA/GST\n- Certificazioni obbligatorie per HS ${hsCode} (confronta con cert. azienda: ${profiloAzienda.certificazioni || 'nessuna'}. Se mancano cert obbligatorie segnala ⛔ Blocco Operativo)\n- Standard tecnici, etichettatura\n- Documenti doganali, licenze import\n- SPS/TBT alerts`, {
    type: "object",
    properties: {
      mercati: {
        type: "array",
        items: {
          type: "object",
          properties: {
            paese_code: { type: "string" }, paese_nome: { type: "string" },
            requisiti_normativi: { type: "object", properties: {
              regulatory_framework: { type: "object", properties: { import_tariffs: { type: "object", properties: { standard_rate: { type: "string" }, preferential_rate: { type: "string" }, source: { type: "string" } } }, internal_taxes: { type: "object", properties: { vat_gst: { type: "string" }, tax_type: { type: "string" }, other_taxes: { type: "string" } } } } },
              product_compliance: { type: "object", properties: { mandatory_certifications: { type: "array", items: { type: "string" } }, technical_standards: { type: "array", items: { type: "string" } }, labeling_requirements: { type: "string" }, source: { type: "string" } } },
              customs_logistics: { type: "object", properties: { required_documents: { type: "array", items: { type: "string" } }, import_licenses: { type: "string", enum: ["Required","Not Required","Da verificare"] }, packaging_regulations: { type: "string" } } },
              compliance_alerts: { type: "object", properties: { sps_measures: { type: "string" }, tbt_notifications: { type: "string" } } },
              tempi_autorizzazioni: { type: "string" }, costi: { type: "string" },
              official_sources: { type: "array", items: { type: "string" } }
            } },
            dazi_taric: { type: "object", properties: { dazio_mfn: { type: "string" }, dazio_preferenziale: { type: "string" }, anti_dumping: { type: "string" }, restrizioni: { type: "string" } } }
          }
        }
      }
    }
  });

  // === MODULO D: Logistica + Rischio Paese ===
  const modD = callModule('Logistica+Rischio', `${rules}\n${ctx.header}\n\nPer ogni Paese:\n1) LOGISTICA: LPI rank, porti/aeroporti ingresso, porti transito se landlocked, costi nolo mare/aereo, tempi transito, infrastrutture, zone franche, incoterms, rischi logistici\n2) RISCHIO PAESE: politico, economico (inflazione, partite correnti), cambio (volatilità), credito — con indicatori numerici dai dati World Bank`, {
    type: "object",
    properties: {
      mercati: {
        type: "array",
        items: {
          type: "object",
          properties: {
            paese_code: { type: "string" }, paese_nome: { type: "string" },
            logistica: { type: "object", properties: {
              logistics_performance: { type: "object", properties: { lpi_global_rank: { type: "string" }, customs_efficiency_score: { type: "string" }, infrastructure_quality: { type: "string", enum: ["High","Medium","Low"] } } },
              shipping_routes: { type: "object", properties: { main_entry_ports: { type: "array", items: { type: "string" } }, main_cargo_airports: { type: "array", items: { type: "string" } }, transit_ports: { type: "array", items: { type: "string" } }, transit_time_sea: { type: "string" }, transit_time_air: { type: "string" } } },
              estimated_costs: { type: "object", properties: { sea_freight_range: { type: "string" }, air_freight_per_kg: { type: "string" }, last_mile_complexity: { type: "string", enum: ["Low","Medium","High"] } } },
              infrastructure_details: { type: "object", properties: { rail_connection: { type: "string", enum: ["Available","Not Available","Limited"] }, major_logistics_hubs: { type: "array", items: { type: "string" } }, free_trade_zones: { type: "array", items: { type: "string" } } } },
              incoterms_consigliati: { type: "string" }, logistics_risks: { type: "array", items: { type: "string" } }, data_sources: { type: "array", items: { type: "string" } }
            } },
            rischio_paese: { type: "object", properties: { rischio_politico: { type: "string" }, rischio_economico: { type: "string" }, rischio_cambio: { type: "string" }, rischio_credito: { type: "string" } } }
          }
        }
      }
    }
  });

  // === MODULO E: GTM + Economia + Roadmap + Sintesi ===
  const modE = callModule('GTM+Economia+Roadmap', `${rules}\n${ctx.header}\n\nPer ogni Paese:\n1) CANALI INGRESSO (coerenti con model=${profiloAzienda.business_model || 'N/S'}, canale=${profiloAzienda.canale_preferito || 'N/S'}): modello entry, marketplace B2C/B2B, GDO/distributori, fiere, raccomandazioni\n2) OPPORTUNITÀ e SFIDE\n\nGLOBALE:\n3) ANALISI ECONOMICA: simulazione prezzo, margine, break even, investimento iniziale\n4) ROADMAP 12 MESI: timeline, KPI, budget\n5) SINTESI: readiness score 1-10, raccomandazione, mercati prioritari, rischi, primi passi, risorse`, {
    type: "object",
    properties: {
      mercati: {
        type: "array",
        items: {
          type: "object",
          properties: {
            paese_code: { type: "string" }, paese_nome: { type: "string" }, punteggio_opportunita: { type: "number" },
            canali_ingresso: { type: "object", properties: {
              entry_strategy: { type: "object", properties: { recommended_model: { type: "string" }, model_justification: { type: "string" }, estimated_entry_complexity: { type: "string", enum: ["Low","Medium","High"] } } },
              digital_channels: { type: "object", properties: { top_b2c_marketplaces: { type: "array", items: { type: "string" } }, top_b2b_platforms: { type: "array", items: { type: "string" } }, ecommerce_penetration_rate: { type: "string" } } },
              physical_distribution: { type: "object", properties: { key_retailers_gdo: { type: "array", items: { type: "string" } }, wholesale_networks: { type: "array", items: { type: "string" } }, typical_distribution_margins: { type: "string" } } },
              partnership_opportunities: { type: "object", properties: { relevant_trade_fairs: { type: "array", items: { type: "string" } }, industrial_associations: { type: "array", items: { type: "string" } } } },
              strategic_recommendations: { type: "array", items: { type: "string" } }, verified_sources: { type: "array", items: { type: "string" } }
            } },
            opportunita: { type: "array", items: { type: "string" } },
            sfide: { type: "array", items: { type: "string" } },
            conclusione_operativa: { type: "string" }
          }
        }
      },
      readiness_score: { type: "number" }, readiness_commento: { type: "string" },
      analisi_economica: { type: "object", properties: { simulazione_prezzo: { type: "string" }, margine_lordo: { type: "string" }, break_even: { type: "string" }, investimento_iniziale: { type: "string" }, note: { type: "string" } } },
      roadmap_12_mesi: { type: "array", items: { type: "object", properties: { mese: { type: "string" }, attivita: { type: "string" }, kpi: { type: "string" }, budget_stimato: { type: "string" } } } },
      mercati_prioritari: { type: "array", items: { type: "string" } },
      raccomandazione_generale: { type: "string" }, timeline_consigliata: { type: "string" },
      rischi_principali: { type: "array", items: { type: "string" } },
      primi_passi: { type: "array", items: { type: "string" } },
      risorse_utili: { type: "array", items: { type: "object", properties: { nome: { type: "string" }, url: { type: "string" } } } }
    }
  });

  // Attendi tutti i moduli in parallelo
  const [resA, resB, resC, resD, resE] = await Promise.all([modA, modB, modC, modD, modE]);

  // === ASSEMBLAGGIO RISULTATO FINALE ===
  // Usa i Paesi dal modulo E come base, poi arricchisci con gli altri
  const mercatiE = resE?.mercati || [];
  const mercatiMap = {};

  // Inizializza con modulo E (GTM + sintesi)
  mercatiE.forEach(m => {
    mercatiMap[m.paese_code] = { ...m, mercato: m.paese_nome };
  });

  // Merge modulo A (screening + domanda + flussi)
  (resA?.mercati || []).forEach(m => {
    if (!mercatiMap[m.paese_code]) mercatiMap[m.paese_code] = { paese_code: m.paese_code, paese_nome: m.paese_nome, mercato: m.paese_nome };
    Object.assign(mercatiMap[m.paese_code], {
      market_screening: m.market_screening,
      domanda_locale: m.domanda_locale,
      flussi_commerciali: m.flussi_commerciali
    });
  });

  // Merge modulo B (competitive)
  (resB?.mercati || []).forEach(m => {
    if (!mercatiMap[m.paese_code]) mercatiMap[m.paese_code] = { paese_code: m.paese_code, paese_nome: m.paese_nome, mercato: m.paese_nome };
    mercatiMap[m.paese_code].analisi_competitiva = m.analisi_competitiva;
  });

  // Merge modulo C (regulatory)
  (resC?.mercati || []).forEach(m => {
    if (!mercatiMap[m.paese_code]) mercatiMap[m.paese_code] = { paese_code: m.paese_code, paese_nome: m.paese_nome, mercato: m.paese_nome };
    mercatiMap[m.paese_code].requisiti_normativi = m.requisiti_normativi;
    mercatiMap[m.paese_code].dazi_taric = m.dazi_taric;
  });

  // Merge modulo D (logistica + rischio)
  (resD?.mercati || []).forEach(m => {
    if (!mercatiMap[m.paese_code]) mercatiMap[m.paese_code] = { paese_code: m.paese_code, paese_nome: m.paese_nome, mercato: m.paese_nome };
    mercatiMap[m.paese_code].logistica = m.logistica;
    mercatiMap[m.paese_code].rischio_paese = m.rischio_paese;
  });

  const mercati_analisi = Object.values(mercatiMap);

  return {
    readiness_score: resE?.readiness_score || 5,
    readiness_commento: resE?.readiness_commento || '',
    mercati_analisi,
    analisi_economica: resE?.analisi_economica || null,
    roadmap_12_mesi: resE?.roadmap_12_mesi || [],
    mercati_prioritari: resE?.mercati_prioritari || [],
    raccomandazione_generale: resE?.raccomandazione_generale || '',
    timeline_consigliata: resE?.timeline_consigliata || '',
    rischi_principali: resE?.rischi_principali || [],
    primi_passi: resE?.primi_passi || [],
    risorse_utili: resE?.risorse_utili || []
  };
}