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

    const [pop, gdp, gdpPc, inflazione, doingBusiness, lpi, partiteCorrenti, tassoUfficiale, ecbVolResult, riskProfile] = await Promise.all([
      fetchWBIndicator(alpha3, 'SP.POP.TOTL'),
      fetchWBIndicator(alpha3, 'NY.GDP.MKTP.CD'),
      fetchWBIndicator(alpha3, 'NY.GDP.PCAP.CD'),
      fetchWBIndicator(alpha3, 'FP.CPI.TOTL.ZG'),
      fetchWBIndicator(alpha3, 'IC.BUS.EASE.XQ'),
      fetchWBIndicator(alpha3, 'LP.LPI.OVRL.XQ'),
      fetchWBIndicator(alpha3, 'BN.CAB.XOKA.CD'),
      fetchWBIndicator(alpha3, 'PA.NUS.FCRF'),
      // Volatilità cambio da BCE via backend function
      (async () => {
        try {
          const resp = await base44.functions.invoke('ecbVolatility', { country_code: code2 });
          return resp.data;
        } catch (e) {
          console.warn(`[fetchMacroData] ecbVolatility per ${code2} fallito:`, e);
          return null;
        }
      })(),
      // Profilo rischio paese (governance, rating, CPI, FSI, macro avanzati, demografici)
      (async () => {
        try {
          const resp = await base44.functions.invoke('countryRiskProfile', { country_code: code2 });
          return resp.data;
        } catch (e) {
          console.warn(`[fetchMacroData] countryRiskProfile per ${code2} fallito:`, e);
          return null;
        }
      })(),
    ]);

    // Volatilità cambio da BCE (backend)
    const volatilita_cambio = ecbVolResult?.volatilita_annualizzata_pct ?? null;
    const volatilita_cambio_recente = ecbVolResult?.volatilita_recente_pct ?? null;
    const volatilita_livello = ecbVolResult?.livello || null;
    const volatilita_livello_recente = ecbVolResult?.livello_recente || null;
    const volatilita_trend = ecbVolResult?.trend || null;
    const volatilita_valuta = ecbVolResult?.currency || null;
    const volatilita_tasso_corrente = ecbVolResult?.tasso_corrente || null;
    const volatilita_fonte = ecbVolResult?.fonte || null;
    const volatilita_periodo = ecbVolResult?.periodo_lungo || null;

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
      volatilita_cambio_recente,
      volatilita_livello,
      volatilita_livello_recente,
      volatilita_trend,
      volatilita_valuta,
      volatilita_tasso_corrente,
      volatilita_cambio_fonte: volatilita_fonte,
      volatilita_periodo: volatilita_periodo,
      // Profilo rischio paese completo
      risk_profile: riskProfile || null,
      fonte: 'World Bank API + BCE',
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
/**
 * Costruisce l'oggetto dazi combinando API (WITS/WTO) e web enrichment (Access2Markets/MacMap).
 * REGOLA CHIAVE: se le API restituiscono 0% o null ma il web enrichment ha un dazio diverso,
 * usa il web enrichment (che cerca su Access2Markets/MacMap e distingue dazi specifici).
 * Questo risolve il caso di dazi specifici (es. olio d'oliva USA: 0% ad valorem ma 5 cents/kg).
 */
function buildDaziObject(tariffs, webEnrichment) {
  const empty = { dazio_mfn: null, dazio_mfn_valore: null, dazio_preferenziale: null, dazio_preferenziale_valore: null, dazio_mfn_wto: null, dazio_bound_wto: null, fonte_wto: null, anti_dumping: null, restrizioni: null, fonte: null, duty_type: null, dazio_specifico: null };
  
  if (!tariffs && !webEnrichment) return empty;
  
  // Base: dati dalle API WITS/WTO
  const result = tariffs ? {
    dazio_mfn: tariffs.dazio_mfn,
    dazio_mfn_valore: tariffs.dazio_mfn_valore || null,
    dazio_preferenziale: tariffs.dazio_preferenziale,
    dazio_preferenziale_valore: tariffs.dazio_preferenziale_valore || null,
    dazio_mfn_wto: tariffs.dazio_mfn_wto || null,
    dazio_bound_wto: tariffs.dazio_bound_wto || null,
    fonte_wto: tariffs.fonte_wto || null,
    anti_dumping: null,
    restrizioni: null,
    fonte: tariffs.fonte || 'WITS/TRAINS',
    duty_type: tariffs.duty_type || null,
    dazio_specifico: tariffs.dazio_specifico || null
  } : { ...empty };

  // Override con web enrichment se disponibile e più completo
  const a2m = webEnrichment?.access2markets;
  if (!a2m) return result;

  const apiMfnIsZeroOrNull = !result.dazio_mfn || result.dazio_mfn_valore === 0 || result.dazio_mfn === '0%';
  const webHasDazio = a2m.dazio_convenzionale && a2m.dazio_convenzionale !== 'Non trovato' && !a2m.dazio_convenzionale.toLowerCase().includes('non trovato');
  const webDazioIsSpecific = a2m.dazio_convenzionale_tipo === 'specifico' || a2m.dazio_convenzionale_tipo === 'misto';
  
  // CASO 1: API dice 0% ma web enrichment ha un dazio specifico (es. olio d'oliva USA)
  // CASO 2: API non ha dati ma web enrichment sì
  if ((apiMfnIsZeroOrNull && webHasDazio) || (!result.dazio_mfn && webHasDazio)) {
    console.log(`[buildDazi] Override API dazio (${result.dazio_mfn}) con web enrichment: ${a2m.dazio_convenzionale} (tipo: ${a2m.dazio_convenzionale_tipo})`);
    result.dazio_mfn = a2m.dazio_convenzionale;
    result.dazio_mfn_valore = a2m.dazio_convenzionale_valore || null;
    result.duty_type = a2m.dazio_convenzionale_tipo || (webDazioIsSpecific ? 'specifico' : 'ad_valorem');
    result.fonte = (result.fonte || '') + ' + Access2Markets';
  }
  
  // Dazio preferenziale dal web enrichment (più affidabile: include nome FTA)
  if (a2m.dazio_preferenziale && !a2m.dazio_preferenziale.toLowerCase().includes('non trovato')) {
    result.dazio_preferenziale = a2m.dazio_preferenziale;
    result.dazio_preferenziale_valore = a2m.dazio_preferenziale_valore || result.dazio_preferenziale_valore;
  }
  
  // Anti-dumping dal web enrichment
  if (a2m.anti_dumping && !a2m.anti_dumping.toLowerCase().includes('non trovato') && !a2m.anti_dumping.toLowerCase().includes('nessun')) {
    result.anti_dumping = a2m.anti_dumping;
  }
  
  // Restrizioni dal web enrichment
  if (a2m.restrizioni && !a2m.restrizioni.toLowerCase().includes('non trovato') && !a2m.restrizioni.toLowerCase().includes('nessun')) {
    result.restrizioni = a2m.restrizioni;
  }

  return result;
}

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
    // NON bloccare: procedi con dati vuoti, l'analisi LLM userà solo macro + web
    backendResult = { success: true, partners: {}, _partial: true, _error_detail: err?.message };
  }

  if (!backendResult || !backendResult.success) {
    console.warn('[ExportDataFetcher] Backend returned error, proceeding with empty data:', backendResult?.error);
    // NON bloccare: procedi con struttura vuota
    backendResult = { success: true, partners: {}, _partial: true, _error_detail: backendResult?.error || 'Backend error' };
  }

  // Trasforma il risultato backend nel formato atteso dal frontend
  const mercati = mercatiCodes.filter(c => c !== 'WLD').map((code, i) => {
    const partnerData = backendResult.partners?.[code];
    const serie = partnerData?.serie_storica || [];
    const tariffs = partnerData?.tariffs;
    const topSuppliers = partnerData?.top_suppliers;
    const webEnrichment = partnerData?.web_enrichment || null;
    const name = mercatiNames?.[i] || code;

    // Ultimo anno con dati dalla serie storica (= export IT→paese)
    const lastYearData = serie.length > 0 ? serie[serie.length - 1] : null;

    // === IMPORT TOTALE del paese da TUTTO IL MONDO ===
    // Fonte primaria: topSuppliers.import_totale_usd (Comtrade con reporter=paese, partner=0)
    // Fallback: web_enrichment.trade_map.import_totale_usd
    // MAI usare lastYearData che è export IT→paese
    let importTotaleVal = null;
    let importTotaleAnno = null;
    let importTotaleFonte = null;

    if (topSuppliers?.import_totale_usd && topSuppliers.import_totale_usd > 0) {
      importTotaleVal = `$${topSuppliers.import_totale_usd.toLocaleString('en-US')}`;
      importTotaleAnno = String(topSuppliers.anno || '');
      importTotaleFonte = topSuppliers.fonte || 'UN Comtrade';
    } else if (webEnrichment?.trade_map?.import_totale_usd) {
      importTotaleVal = webEnrichment.trade_map.import_totale_usd;
      importTotaleAnno = webEnrichment.trade_map.anno_dati || '';
      importTotaleFonte = webEnrichment.trade_map.fonte || 'Trade Map (web)';
    }

    // === EXPORT IT→PAESE (dalla serie storica) ===
    let exportExporterVal = null;
    let exportExporterAnno = null;
    let exportExporterFonte = null;

    if (lastYearData?.trade_value_usd > 0) {
      exportExporterVal = `$${lastYearData.trade_value_usd.toLocaleString('en-US')}`;
      exportExporterAnno = String(lastYearData.year);
      exportExporterFonte = lastYearData.source || 'multi-source';
    } else if (webEnrichment?.trade_map?.export_italia_usd) {
      exportExporterVal = webEnrichment.trade_map.export_italia_usd;
      exportExporterAnno = webEnrichment.trade_map.anno_dati || '';
      exportExporterFonte = webEnrichment.trade_map.fonte || 'Trade Map (web)';
    }

    // === TOP FORNITORI ===
    // Fonte primaria: topSuppliers.top_fornitori (Comtrade)
    // Fallback: web_enrichment.trade_map.top_esportatori
    let topFornitoriArr = [];
    if (topSuppliers?.top_fornitori?.length > 0) {
      topFornitoriArr = topSuppliers.top_fornitori.map(f => ({
        paese: f.paese,
        valore_usd: `$${f.valore_usd?.toLocaleString('en-US') || '0'}`,
        quota_percentuale: f.quota_percentuale,
        fonte: f.fonte || 'UN Comtrade'
      }));
    } else if (webEnrichment?.trade_map?.top_esportatori?.length > 0) {
      topFornitoriArr = webEnrichment.trade_map.top_esportatori.map(f => ({
        paese: f.paese || f.name || '',
        valore_usd: null,
        quota_percentuale: f.quota || f.share || 'N/D',
        fonte: 'Trade Map (web)'
      }));
    }

    // === QUOTA ITALIA e POSIZIONE ===
    let posizioneExporter = null;
    let quotaExporter = null;

    // Da topSuppliers Comtrade
    if (topSuppliers?.top_fornitori?.length > 0) {
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

    // Fallback: calcola quota da export_IT / import_totale
    if (!quotaExporter && lastYearData?.trade_value_usd > 0 && topSuppliers?.import_totale_usd > 0) {
      const quotaPct = (lastYearData.trade_value_usd / topSuppliers.import_totale_usd * 100);
      if (quotaPct > 0 && quotaPct <= 100) {
        quotaExporter = `${quotaPct.toFixed(1)}%`;
      }
    }

    return {
      paese_code: code,
      paese_nome: name,
      import_totale: {
        valore_usd: importTotaleVal,
        anno: importTotaleAnno,
        fonte: importTotaleFonte
      },
      export_from_exporter: {
        valore_usd: exportExporterVal,
        anno: exportExporterAnno,
        fonte: exportExporterFonte
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
      top_fornitori: topFornitoriArr,
      posizione_exporter: posizioneExporter,
      quota_exporter: quotaExporter,
      dazi: buildDaziObject(tariffs, webEnrichment),
      riepilogo_costi: webEnrichment?.riepilogo_costi_export || null,
      web_enrichment: webEnrichment,
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
  if (!tradeData?.mercati || tradeData.mercati.length === 0) return { metriche: [], _partial: tradeData?._partial || false };

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

    // Trend medio annuo (CAGR) — calcolabile con almeno 2 valori
    let cagr = null;
    if (valori.length >= 2) {
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

  const riepilogoDati = (tradeData.mercati || []).map((m, i) => {
    const met = Array.isArray(metrics) ? metrics[i] : null;
    const macro = macroDataMap[m.paese_code];
    let base = `\nMERCATO: ${m.paese_nome} (${m.paese_code})
- Import totale del PAESE da tutto il mondo HS ${hsCode}: ${m.import_totale?.valore_usd || 'N/D'}${met?.import_totale_eur ? ` (≈ €${met.import_totale_eur.toLocaleString('it-IT')})` : ''} (${m.import_totale?.anno || 'N/D'}, fonte: ${m.import_totale?.fonte || 'N/D'})
- Export ITALIA→${m.paese_nome} (bilaterale): ${m.export_from_exporter?.valore_usd || m.export_italia?.valore_usd || 'N/D'}${met?.export_italia_eur ? ` (≈ €${met.export_italia_eur.toLocaleString('it-IT')})` : ''} (${m.export_from_exporter?.anno || m.export_italia?.anno || 'N/D'}, fonte: ${m.export_from_exporter?.fonte || m.export_italia?.fonte || 'N/D'})
- Quota Italia: ${m.quota_exporter || m.quota_italia || 'N/D'}, Posizione: ${m.posizione_exporter || m.posizione_italia || 'N/D'}
- CAGR: ${met?.cagr ? met.cagr + '%' : 'N/C'}, Crescita 3a: ${met?.crescita_3_anni ? met.crescita_3_anni + '%' : 'N/C'}, Volatilità: ${met?.volatilita ? met.volatilita + '%' : 'N/C'}
- Top fornitori: ${(m.top_fornitori || []).map(f => `${f.paese} ${f.quota_percentuale}`).join(', ') || 'N/D'}
- Dazio MFN: ${m.dazi?.dazio_mfn || 'N/D'}, Dazio pref: ${m.dazi?.dazio_preferenziale || 'N/D'}, Anti-dumping: ${m.dazi?.anti_dumping || 'Nessuna'}`;
    if (m.riepilogo_costi) {
      const rc = m.riepilogo_costi;
      const rcParts = [];
      if (rc.dazio_totale_stimato) rcParts.push(`Dazio totale: ${rc.dazio_totale_stimato}`);
      if (rc.iva_gst_totale) rcParts.push(`IVA/GST: ${rc.iva_gst_totale}`);
      if (rc.esempio_10k_eur) rcParts.push(`Su €10k: ${rc.esempio_10k_eur}`);
      if (rc.livello_complessita) rcParts.push(`Complessità: ${rc.livello_complessita}`);
      if (rcParts.length > 0) base += `\n- Riepilogo costi export: ${rcParts.join('; ')}`;
      if (rc.nota_per_imprenditore) base += `\n- Nota imprenditore: ${rc.nota_per_imprenditore}`;
    }
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
      // Risk profile avanzato
      const rp = macro.risk_profile;
      if (rp) {
        const rpParts = [];
        if (rp.financial_reliability_index?.score) rpParts.push(`Affidabilità: ${rp.financial_reliability_index.score}/100 (${rp.financial_reliability_index.level})`);
        if (rp.sovereign_rating?.sp?.rating) rpParts.push(`S&P: ${rp.sovereign_rating.sp.rating}`);
        if (rp.sovereign_rating?.moodys?.rating) rpParts.push(`Moody's: ${rp.sovereign_rating.moodys.rating}`);
        if (rp.governance?.wgi_average_percentile) rpParts.push(`WGI: ${rp.governance.wgi_average_percentile}/100`);
        if (rp.corruption?.cpi_score) rpParts.push(`CPI: ${rp.corruption.cpi_score}/100 (#${rp.corruption.rank})`);
        if (rp.macro?.crescita_pil_pct !== null && rp.macro?.crescita_pil_pct !== undefined) rpParts.push(`Crescita PIL: ${rp.macro.crescita_pil_pct}%`);
        if (rp.macro?.debito_pil_pct !== null && rp.macro?.debito_pil_pct !== undefined) rpParts.push(`Debito/PIL: ${rp.macro.debito_pil_pct}%`);
        if (rp.macro?.disoccupazione_pct !== null && rp.macro?.disoccupazione_pct !== undefined) rpParts.push(`Disocc: ${rp.macro.disoccupazione_pct}%`);
        if (rpParts.length > 0) base += `\n- Risk Profile: ${rpParts.join(', ')}`;
      }
    }
    // Web enrichment data (Access2Markets, Trade Map, ICE)
    const webE = m.web_enrichment;
    if (webE) {
      if (webE.access2markets) {
        const a2m = webE.access2markets;
        const a2mParts = [];
        if (a2m.dazio_convenzionale) a2mParts.push(`Dazio conv: ${a2m.dazio_convenzionale}`);
        if (a2m.dazio_preferenziale) a2mParts.push(`Dazio pref: ${a2m.dazio_preferenziale}`);
        if (a2m.iva_locale) a2mParts.push(`IVA: ${a2m.iva_locale}`);
        if (a2m.certificazioni_obbligatorie?.length > 0) a2mParts.push(`Cert.obbl: ${a2m.certificazioni_obbligatorie.join(', ')}`);
        if (a2m.restrizioni) a2mParts.push(`Restrizioni: ${a2m.restrizioni}`);
        if (a2mParts.length > 0) base += `\n- Access2Markets: ${a2mParts.join('; ')}`;
      }
      if (webE.trade_map) {
        const tm = webE.trade_map;
        const tmParts = [];
        if (tm.import_totale_usd) tmParts.push(`Import totale: ${tm.import_totale_usd}`);
        if (tm.export_italia_usd) tmParts.push(`Export IT: ${tm.export_italia_usd}`);
        if (tm.trend) tmParts.push(`Trend: ${tm.trend}`);
        if (tmParts.length > 0) base += `\n- Trade Map: ${tmParts.join('; ')}`;
      }
      if (webE.ice_italia) {
        const ice = webE.ice_italia;
        const iceParts = [];
        if (ice.opportunita) iceParts.push(`Opp: ${ice.opportunita}`);
        if (ice.fiere_rilevanti?.length > 0) iceParts.push(`Fiere: ${ice.fiere_rilevanti.join(', ')}`);
        if (iceParts.length > 0) base += `\n- ICE Italia: ${iceParts.join('; ')}`;
      }
    }
    return base;
  }).join('\n');

  const datiNonDisponibili = tradeData?.dati_non_disponibili?.length > 0
    ? `\nDATI MANCANTI: ${tradeData.dati_non_disponibili.join('; ')}` : '';
  const partialWarning = tradeData?._partial ? '\nATTENZIONE: i dati commerciali (serie storica, dazi, top fornitori) non sono stati reperiti dalle API. Usa ESCLUSIVAMENTE il tuo contesto internet per arricchire l\'analisi con dati reali disponibili online.' : '';
  const notaCambio = tassoCambio ? `\nCambio: 1EUR=${tassoCambio.tasso}USD (${tassoCambio.fonte})` : '';

  const header = `Anno ${currentYear}. HS: ${hsCode} — ${hsDescrizione}
AZIENDA: Settore=${profiloAzienda.settore}, Prodotto=${profiloAzienda.prodotto}, Fatturato=${profiloAzienda.fatturato_annuo || 'N/S'}, Export=${profiloAzienda.esperienza_export || 'Nessuna'}, Cert=${profiloAzienda.certificazioni || 'N/S'}, Capacità=${profiloAzienda.capacita_produttiva || 'N/S'}${profiloAzienda.unita_capacita ? ` (${profiloAzienda.unita_capacita})` : ''}, Posiz=${profiloAzienda.posizionamento || 'N/S'}, PrezzoMedio=${profiloAzienda.prezzo_medio ? `€${profiloAzienda.prezzo_medio}` : 'N/S'}, Model=${profiloAzienda.business_model || 'N/S'}, Canale=${profiloAzienda.canale_preferito || 'N/S'}
DATI:${riepilogoDati}${datiNonDisponibili}${notaCambio}${partialWarning}`;

  const paeseNames = (tradeData.mercati || []).map(m => `${m.paese_nome} (${m.paese_code})`).join(', ');
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
  // Non bloccare mai: anche con dati parziali o vuoti, procedi con l'analisi LLM
  // L'LLM userà i dati macro e il web enrichment per generare l'analisi

  const ctx = buildDataContext(tradeData, metricsResult, hsCode, hsDescrizione, profiloAzienda, macroDataMap);
  const antiInventionRules = `REGOLE ANTI-INVENZIONE (TASSATIVE):
- NON INVENTARE MAI dati, nomi, numeri, percentuali o qualsiasi informazione specifica se non sei CERTO della sua veridicità.
- Se un dato non è disponibile o non sei sicuro, scrivi "Non disponibile" o "Da verificare".
- Usa SOLO i dati forniti nel contesto qui sotto. Non aggiungere dati che non sono presenti.
- Per nomi di aziende, fiere, certificazioni, marketplace: inserisci SOLO quelli che sai ESISTERE REALMENTE. Se non sei sicuro, ometti.
- Meglio un campo "Non disponibile" che un dato inventato.

REGOLA CITAZIONE FONTI (OBBLIGATORIA PER OGNI DATO NUMERICO):
- OGNI dato numerico (dazi %, IVA %, valori in $, crescita %, margini %, volumi) DEVE essere accompagnato da: FONTE + ANNO di riferimento.
- Formato obbligatorio: "valore% (fonte: NomeFonte, anno)" — es: "1.2% MFN (fonte: WITS/TRAINS, 2023)" oppure "$1.15 miliardi (fonte: UN Comtrade, 2022)"
- Se citi un range (es. "1%-2%"), specifica COMUNQUE fonte e anno: "1%-2% ad valorem (fonte: Access2Markets, 2024)"
- Se il dato viene dai DATI forniti sopra, riportalo con la stessa fonte e anno indicati nei dati.
- Se il dato viene dalla tua conoscenza/ricerca web, indica chiaramente la fonte.
- MAI scrivere percentuali o numeri "nudi" senza fonte e anno. È inaccettabile.`;
  const rules = `${antiInventionRules}\nRegole formato: OGNI numero con fonte e anno (OBBLIGATORIO). Se N/D scrivi "Non disponibile". No frasi generiche. Rispondi per OGNI Paese: ${ctx.paeseNames}`;

  // === MODULO A: Market Screening + Domanda Locale + Flussi Commerciali ===
  const modA = callModule('MarketScreening+Domanda', `${rules}\n${ctx.header}\n\nATTENZIONE CRITICA: I dati forniti distinguono CHIARAMENTE due valori DIVERSI:
- "Import totale del PAESE da tutto il mondo": quanto il paese target importa in TOTALE da TUTTI i fornitori mondiali
- "Export ITALIA→Paese (bilaterale)": quanto l'Italia esporta SPECIFICAMENTE verso quel paese
Questi DUE valori sono QUASI SEMPRE DIVERSI. L'export Italia è una FRAZIONE dell'import totale. NON COPIARE lo stesso numero per entrambi.

Analizza per ogni Paese:
1) MARKET SCREENING: import totale (del paese da tutto il mondo), CAGR, dazi, barriere non tariffarie DETTAGLIATE (elenca specificamente: certificazioni obbligatorie, standard SPS/TBT, requisiti etichettatura, licenze import, quote, registrazioni prodotto — NON frasi generiche), accessibilità del mercato (valutazione complessiva: Bassa/Media/Alta difficoltà di ingresso con motivazione concreta)
2) DOMANDA LOCALE — ISTRUZIONI DETTAGLIATE:
   La formula è C = P + M − X dove P=Produzione locale, M=Import totale, X=Export del paese.
   
   Per OGNI campo segui questa procedura:
   a) PRODUZIONE LOCALE (P): cerca su fonti web (FAOSTAT per alimentari, UNIDO per manifattura, Eurostat per UE, statistiche nazionali). Se trovi il dato, indicalo con fonte e anno. Se NON disponibile, scrivi una stima qualitativa: "Il paese [produce/non produce] significativamente questo prodotto perché [motivo concreto]". NON scrivere solo "Non disponibile".
   b) IMPORT (M): usa il valore "Import totale del PAESE da tutto il mondo" fornito nei dati sopra. Se presente, riportalo.
   c) EXPORT (X): cerca l'export del PAESE verso il mondo per questo HS (Trade Map, Comtrade). Se non trovi il dato numerico, stima: "Il paese è/non è un esportatore rilevante di questo prodotto perché [motivo]".
   d) CONSUMO APPARENTE (C): se hai P, M e X numerici, calcola C=P+M-X. Se P non è disponibile, usa C≈M come proxy e spiega: "Stima basata solo sull'import; la produzione locale [aumenterebbe/non cambierebbe significativamente] il valore perché [motivo]".
   e) DIPENDENZA IMPORT: calcola M/(C) × 100 se possibile. Altrimenti stima: Alta (>70%), Media (30-70%), Bassa (<30%) con motivazione.
   f) Per OGNI campo: se il dato esatto non è reperibile, fornisci SEMPRE una spiegazione contestuale di 1-2 frasi che aiuti a capire la situazione. MAI rispondere solo "Non disponibile".
   
   Poi: demand score, import pro capite, segmentazione, canali distributivi, trend con %
3) FLUSSI COMMERCIALI:
   - valore_import_annuo: import TOTALE del paese da TUTTO il mondo per questo HS (NON l'export bilaterale Italia)
   - export_italia_verso_paese: export BILATERALE dell'Italia verso questo paese (è una PARTE dell'import totale)
   - trend_yoy_percentuale: variazione % anno su anno
   - quota_italia: percentuale = (export Italia / import totale) × 100. Se hai i due valori, CALCOLA il rapporto. Se non disponibili, cerca su Trade Map o fonti web.
   - principali_fornitori: i TOP 5-10 paesi che esportano di più verso questo mercato per questo HS. Cerca su Trade Map, UN Comtrade, fonti ufficiali. Per ogni fornitore indica paese e quota %.
4) CONFRONTO GLOBALE: indica UN paese che importa SIGNIFICATIVAMENTE DI PIÙ dello stesso prodotto HS e UN paese che importa MENO. Usa dati REALI da UN Comtrade o fonti ufficiali. Indica nome paese, valore import in USD e anno/fonte. NON INVENTARE.`, {
    type: "object",
    properties: {
      mercati: {
        type: "array",
        items: {
          type: "object",
          properties: {
            paese_code: { type: "string" }, paese_nome: { type: "string" },
            market_screening: { type: "object", properties: { import_totale: { type: "string" }, cagr: { type: "string" }, dazi: { type: "string" }, barriere_non_tariffarie: { type: "string", description: "Elenco SPECIFICO delle barriere non tariffarie: certificazioni obbligatorie, standard SPS/TBT, requisiti etichettatura, licenze, quote, registrazioni. NO frasi generiche." }, accessibilita_mercato: { type: "string", description: "Valutazione complessiva accessibilità: Bassa/Media/Alta difficoltà + motivazione concreta" } } },
            domanda_locale: { type: "object", properties: { consumo_apparente: { type: "string", description: "Valore calcolato C=P+M-X oppure stima con spiegazione metodologica" }, produzione_locale: { type: "string", description: "Valore numerico con fonte, oppure stima qualitativa dettagliata (mai solo 'Non disponibile')" }, import_value: { type: "string", description: "Import totale del paese per questo HS (= M nella formula)" }, export_value: { type: "string", description: "Export del paese verso il mondo per questo HS (= X nella formula), oppure stima qualitativa" }, dipendenza_import: { type: "string", description: "Percentuale o livello (Alta/Media/Bassa) con motivazione" }, import_pro_capite: { type: "string" }, demand_score: { type: "string", enum: ["Low","Medium","High"] }, validazione_coerenza: { type: "string" }, nota_metodologica: { type: "string", description: "Spiega brevemente quali dati sono reali, quali stimati, e quali fonti hai usato per questa sezione" }, segmentazione: { type: "string" }, volumi_consumo: { type: "string" }, canali_distributivi: { type: "array", items: { type: "string" } }, trend: { type: "string" } } },
            flussi_commerciali: { type: "object", properties: { valore_import_annuo: { type: "string", description: "Import TOTALE del paese da TUTTO il mondo per questo HS — NON l'export bilaterale Italia" }, export_italia_verso_paese: { type: "string", description: "Export BILATERALE Italia verso questo paese — è una PARTE dell'import totale, quasi sempre MINORE" }, trend_yoy_percentuale: { type: "string" }, crescita_o_calo: { type: "string", enum: ["crescita","calo","stabile"] }, quota_italia: { type: "string", description: "Percentuale = (export Italia / import totale) × 100. Calcola o cerca su Trade Map." }, principali_fornitori: { type: "array", items: { type: "object", properties: { paese: { type: "string" }, quota_percentuale: { type: "string" }, valore_usd: { type: "string" } } }, description: "Top 5-10 paesi fornitori con quota %. Cerca su Trade Map, UN Comtrade." } } },
            confronto_import_globale: { type: "object", properties: {
              paese_importa_di_piu: { type: "object", properties: { nome: { type: "string" }, valore_usd: { type: "string" }, anno: { type: "string" }, fonte: { type: "string" } } },
              paese_importa_di_meno: { type: "object", properties: { nome: { type: "string" }, valore_usd: { type: "string" }, anno: { type: "string" }, fonte: { type: "string" } } }
            } }
          }
        }
      }
    }
  });

  // === MODULO B: Competitive Intelligence ===
  const modB = callModule('CompetitiveIntelligence', `${rules}\n${ctx.header}\n\nPer ogni Paese, analisi competitiva:\n- Competitor mapping (3-5 player, origine Local/International, posizionamento Premium/Value/Mass Market)\n- Pricing benchmark (range min-max con valuta locale, specificando price_unit e currency)\n- Distribution channels (online share %, offline key players, trade margin)\n- Differentiation factors\n- Entry barriers: brand loyalty (High/Medium/Low), certificazioni OBBLIGATORIE (senza le quali non si può operare), certificazioni FACOLTATIVE (consigliate per competitività), confronto rispetto ai competitor già presenti (sono avvantaggiati? perché?)\n- SWOT dell'azienda nel contesto\nFiltra per posizionamento azienda: ${profiloAzienda.posizionamento || 'generico'}`, {
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
              pricing_intelligence: { type: "object", properties: { local_price_range_min: { type: "string" }, local_price_range_max: { type: "string" }, price_unit: { type: "string", description: "Unità di misura del prezzo, es: kg, L, pezzo, 100g, bottiglia, confezione" }, currency: { type: "string", description: "Valuta locale, es: EUR, USD, GBP, JPY" }, benchmark_product: { type: "string" }, notes: { type: "string" } } },
              distribution_channels: { type: "object", properties: { online_share: { type: "string" }, offline_key_players: { type: "array", items: { type: "string" } }, standard_trade_margin: { type: "string" }, primary_entry_mode: { type: "string" } } },
              differentiation_factors: { type: "array", items: { type: "string" } },
              entry_barriers: { type: "object", properties: { brand_loyalty_level: { type: "string", enum: ["High","Medium","Low"] }, required_certifications: { type: "array", items: { type: "string" }, description: "Certificazioni OBBLIGATORIE per operare nel mercato" }, recommended_certifications: { type: "array", items: { type: "string" }, description: "Certificazioni FACOLTATIVE ma consigliate per competitività" }, competitor_comparison: { type: "string", description: "Confronto barriere rispetto ai competitor già presenti: sono avvantaggiati? Perché?" }, notes: { type: "string" } } },
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
  const modC = callModule('RegulatoryCompliance', `${rules}\n${ctx.header}\n\nPer ogni Paese, regulatory compliance DETTAGLIATA:

DAZI E IMPOSTE (SEZIONE CRITICA — sii PRECISO):
- Dazio MFN applicato: valore esatto %, specifico o misto. Fonte: Access2Markets, MacMap, WITS
- Dazio preferenziale: se esiste FTA/EPA con l'UE o il paese esportatore, indica valore + nome accordo
- Anti-dumping: se esistono dazi anti-dumping per questo HS nel paese target, indica valore + regolamento
- IVA/GST locale: aliquota standard e ridotta se applicabile
- Altre tasse: statistical tax, port surcharge, excise, inspection fees, ODC (Other Duties and Charges)
- DISTINGUI tra: dazi ad valorem (%), specifici (€/kg), misti (% + quota fissa)
- Se il dato è nei DATI forniti sopra (sezione "Riepilogo costi export"), USALO come base e confermalo/corregilo

CERTIFICAZIONI per HS ${hsCode}:
- Confronta con cert. azienda: ${profiloAzienda.certificazioni || 'nessuna'}
- Se mancano cert OBBLIGATORIE → segnala ⛔ Blocco Operativo
- Standard tecnici, etichettatura, SPS/TBT, licenze import

SPIEGAZIONE PER L'IMPRENDITORE:
- Aggiungi una nota chiara: "Cosa significa per te: su €10.000 di merce, pagherai circa €X di dazi e €Y di IVA"
- Spiega la differenza tra dazio MFN e preferenziale in modo semplice`, {
    type: "object",
    properties: {
      mercati: {
        type: "array",
        items: {
          type: "object",
          properties: {
            paese_code: { type: "string" }, paese_nome: { type: "string" },
            requisiti_normativi: { type: "object", properties: {
              regulatory_framework: { type: "object", properties: { import_tariffs: { type: "object", properties: { standard_rate: { type: "string", description: "Dazio MFN con %, tipo e fonte" }, preferential_rate: { type: "string", description: "Dazio preferenziale + nome accordo FTA" }, tariff_type: { type: "string", description: "'ad_valorem', 'specifico', 'misto'" }, anti_dumping: { type: "string", description: "Dazio anti-dumping se esiste" }, altre_tasse_doganali: { type: "string", description: "ODC, statistical tax, etc." }, dazio_totale_su_10k: { type: "string", description: "Calcolo: su €10.000 FOB quanto si paga di dazi totali" }, source: { type: "string" } } }, internal_taxes: { type: "object", properties: { vat_gst: { type: "string" }, vat_gst_valore: { type: "string", description: "Valore numerico IVA %" }, tax_type: { type: "string", description: "Nome locale: VAT, GST, TVA, IVA" }, reduced_rate: { type: "string", description: "Aliquota ridotta se applicabile" }, other_taxes: { type: "string" }, iva_su_10k: { type: "string", description: "IVA calcolata su €10.000+dazi" } } }, nota_imprenditore: { type: "string", description: "Spiegazione SEMPLICE per l'imprenditore: cosa paga e perché" } } },
              product_compliance: { type: "object", properties: { mandatory_certifications: { type: "array", items: { type: "string" } }, technical_standards: { type: "array", items: { type: "string" } }, labeling_requirements: { type: "string" }, source: { type: "string" } } },
              customs_logistics: { type: "object", properties: { required_documents: { type: "array", items: { type: "string" } }, import_licenses: { type: "string", enum: ["Required","Not Required","Da verificare"] }, packaging_regulations: { type: "string" } } },
              compliance_alerts: { type: "object", properties: { sps_measures: { type: "string" }, tbt_notifications: { type: "string" } } },
              tempi_autorizzazioni: { type: "string" }, costi: { type: "string" },
              official_sources: { type: "array", items: { type: "string" } }
            } },
            dazi_taric: { type: "object", properties: { dazio_mfn: { type: "string" }, dazio_mfn_valore: { type: "number", description: "Valore numerico % se ad valorem" }, dazio_preferenziale: { type: "string" }, dazio_preferenziale_valore: { type: "number" }, accordo_fta: { type: "string", description: "Nome accordo commerciale" }, anti_dumping: { type: "string" }, anti_dumping_valore: { type: "number" }, iva_gst: { type: "string" }, iva_gst_valore: { type: "number" }, altre_tasse: { type: "string", description: "ODC, sovrattasse, etc." }, restrizioni: { type: "string" }, contingenti: { type: "string" }, dazio_totale_stimato_pct: { type: "string", description: "Somma % di tutti i dazi (MFN/pref + AD + ODC)" }, esempio_10k_eur: { type: "string", description: "Su €10.000 FOB: totale dazi+IVA in EUR" } } }
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

  // === MODULO E: GTM universale + Economia + Roadmap + Sintesi ===
  // Prompt strutturato per 6 FASI universali, adattivo a QUALSIASI prodotto/paese
  const modE = callModule('GTM+Economia+Roadmap', `${rules}\n${ctx.header}\n\nREGOLE ANTI-INVENZIONE (TASSATIVE):
1. NON INVENTARE MAI nomi di aziende, distributori, retailer, marketplace, fiere, associazioni, certificazioni o qualsiasi altro dato specifico se non sei CERTO che esistano realmente.
2. Se non hai dati verificati, scrivi esplicitamente "Non disponibile — verificare con fonti locali" oppure "Dato da confermare".
3. NON inserire percentuali, range di margini, tempi o costi inventati. Se non hai dati reali, scrivi "Non disponibile".
4. Per marketplace e piattaforme: inserisci SOLO quelli che sai ESISTERE REALMENTE e che operano nel Paese specifico per questa categoria merceologica. Se non sei sicuro, NON inserirli.
5. Per fiere: inserisci SOLO fiere che sai esistere realmente con nome verificabile. Se non sei sicuro, scrivi "Verificare calendario fiere di settore nel Paese".
6. Per certificazioni e normative: indica SOLO requisiti che sai essere reali per il codice HS ${hsCode} nel Paese target. Se non sei sicuro, scrivi "Da verificare con ente normativo locale".
7. Ogni dato deve essere accompagnato da una indicazione se è VERIFICATO o DA CONFERMARE.
8. Meglio un campo vuoto/non disponibile che un dato inventato.

IMPORTANTE: L'analisi deve essere CONCRETA e SPECIFICA per il prodotto HS ${hsCode} e il Paese target. Elimina canali non compatibili con la categoria merceologica.

Per ogni Paese, analizza secondo queste 6 FASI:

FASE 1 – VERIFICA NORMATIVA OBBLIGATORIA
- Normative di importazione specifiche del Paese per HS ${hsCode}
- Autorizzazioni sanitarie/tecniche necessarie
- Certificazioni obbligatorie (marchi, standard locali) — confronta con cert. azienda: ${profiloAzienda.certificazioni || 'nessuna'}
- Restrizioni o divieti attivi
- Requisiti etichettatura/conformità tecnica
- Necessità di rappresentante o importatore locale registrato
- Per ogni requisito specifica se è: OBBLIGATORIO, CONSIGLIATO, OPZIONALE, NON APPLICABILE

FASE 2 – STRUTTURA DI INGRESSO NEL MERCATO (coerente con model=${profiloAzienda.business_model || 'N/S'}, canale=${profiloAzienda.canale_preferito || 'N/S'})
- Modello entry raccomandato con giustificazione
- Ruolo e necessità di importatore/distributore locale
- Confronto: vendita diretta vs distributore esclusivo vs agente commerciale vs e-commerce cross-border
- Vincoli contrattuali e fiscali specifici del Paese
- Complessità stimata di ingresso

FASE 3 – CANALI REALISTICI DI VENDITA
- Retail fisico (SOLO se coerente con la categoria)
- Foodservice (SOLO se prodotto alimentare/HoReCa)
- B2B industriale (SOLO se prodotto tecnico/industriale)
- Marketplace digitali (SOLO se verificati e compatibili — NO nomi generici)
- Per ogni canale: giustificazione inclusione/esclusione
- Distribuzione fisica: GDO/retailer, grossisti, reti wholesale (SOLO verificati)
- Partnership: fiere di settore, associazioni industriali, camere di commercio

FASE 4 – STRUTTURA DEI MARGINI
- Margine importatore (range % realistico per questa categoria)
- Margine distributore (range %)
- Margine retail (range %)
- Impatto cumulativo sul prezzo finale (moltiplicatore dalla fabbrica al consumatore)
- Analisi di sostenibilità economica: il prezzo finale è competitivo nel mercato?

FASE 5 – LOGISTICA E DOGANE (complementare al Modulo D)
- HS code e classificazione confermata
- Dazi applicabili (MFN, preferenziali)
- IVA/GST locale
- Incoterms consigliati per questa combinazione
- Tempi medi sdoganamento

FASE 6 – VALIDAZIONE COMMERCIALE
- Domanda locale reale per questo prodotto
- Livello concorrenza (alta/media/bassa)
- Barriere culturali o di adattamento prodotto
- Necessità di adattamento (packaging, formulazione, denominazione)
- Canali non applicabili e perché

Poi: OPPORTUNITÀ, SFIDE, CONCLUSIONE OPERATIVA per ogni Paese.

GLOBALE:
- ANALISI ECONOMICA: simulazione prezzo, margine, break even, investimento iniziale
- ROADMAP 12 MESI: timeline, KPI, budget
- SINTESI: readiness score 1-10, raccomandazione, mercati prioritari, rischi, primi passi, risorse`, {
    type: "object",
    properties: {
      mercati: {
        type: "array",
        items: {
          type: "object",
          properties: {
            paese_code: { type: "string" }, paese_nome: { type: "string" }, punteggio_opportunita: { type: "number" },
            verifica_normativa: { type: "object", properties: {
              normative_importazione: { type: "string" },
              autorizzazioni_necessarie: { type: "array", items: { type: "object", properties: { requisito: { type: "string" }, tipo: { type: "string", enum: ["obbligatorio","consigliato","opzionale","non_applicabile"] }, dettaglio: { type: "string" } } } },
              restrizioni_divieti: { type: "string" },
              etichettatura_conformita: { type: "string" },
              rappresentante_locale: { type: "object", properties: { necessario: { type: "string", enum: ["obbligatorio","consigliato","non_necessario"] }, dettaglio: { type: "string" } } },
              blocchi_operativi: { type: "array", items: { type: "string" } }
            } },
            canali_ingresso: { type: "object", properties: {
              entry_strategy: { type: "object", properties: { recommended_model: { type: "string" }, model_justification: { type: "string" }, estimated_entry_complexity: { type: "string", enum: ["Low","Medium","High"] } } },
              struttura_ingresso: { type: "object", properties: {
                importatore_locale: { type: "object", properties: { necessario: { type: "boolean" }, ruolo: { type: "string" } } },
                confronto_modelli: { type: "array", items: { type: "object", properties: { modello: { type: "string" }, pro: { type: "string" }, contro: { type: "string" }, applicabile: { type: "boolean" } } } },
                vincoli_contrattuali: { type: "string" },
                vincoli_fiscali: { type: "string" }
              } },
              canali_vendita: { type: "object", properties: {
                retail_fisico: { type: "object", properties: { applicabile: { type: "boolean" }, dettaglio: { type: "string" }, operatori: { type: "array", items: { type: "string" } } } },
                foodservice: { type: "object", properties: { applicabile: { type: "boolean" }, dettaglio: { type: "string" } } },
                b2b_industriale: { type: "object", properties: { applicabile: { type: "boolean" }, dettaglio: { type: "string" } } },
                marketplace_digitali: { type: "object", properties: { applicabile: { type: "boolean" }, piattaforme_verificate: { type: "array", items: { type: "string" } }, note: { type: "string" } } },
                canali_esclusi: { type: "array", items: { type: "object", properties: { canale: { type: "string" }, motivo: { type: "string" } } } }
              } },
              digital_channels: { type: "object", properties: { top_b2c_marketplaces: { type: "array", items: { type: "string" } }, top_b2b_platforms: { type: "array", items: { type: "string" } }, ecommerce_penetration_rate: { type: "string" } } },
              physical_distribution: { type: "object", properties: { key_retailers_gdo: { type: "array", items: { type: "string" } }, wholesale_networks: { type: "array", items: { type: "string" } }, typical_distribution_margins: { type: "string" } } },
              partnership_opportunities: { type: "object", properties: { relevant_trade_fairs: { type: "array", items: { type: "string" } }, industrial_associations: { type: "array", items: { type: "string" } } } },
              strategic_recommendations: { type: "array", items: { type: "string" } }, verified_sources: { type: "array", items: { type: "string" } }
            } },
            struttura_margini: { type: "object", properties: {
              margine_importatore: { type: "string" },
              margine_distributore: { type: "string" },
              margine_retail: { type: "string" },
              moltiplicatore_prezzo: { type: "string" },
              sostenibilita_economica: { type: "string" }
            } },
            logistica_dogane_gtm: { type: "object", properties: {
              hs_confermato: { type: "string" },
              dazi_applicabili: { type: "string", description: "Dazio MFN o preferenziale con %, tipo e fonte" },
              dazio_preferenziale: { type: "string", description: "Dazio pref. + nome accordo FTA se esiste" },
              anti_dumping: { type: "string", description: "Dazi anti-dumping se presenti" },
              iva_gst_locale: { type: "string" },
              altre_tasse: { type: "string", description: "ODC, sovrattasse, accise" },
              incoterms_consigliati: { type: "string" },
              tempi_sdoganamento: { type: "string" },
              costo_doganale_su_10k: { type: "string", description: "Su €10.000 FOB: totale dazi+tasse" }
            } },
            validazione_commerciale: { type: "object", properties: {
              domanda_locale: { type: "string" },
              livello_concorrenza: { type: "string", enum: ["alta","media","bassa"] },
              barriere_culturali: { type: "string" },
              adattamento_prodotto: { type: "string" },
              canali_non_applicabili: { type: "array", items: { type: "object", properties: { canale: { type: "string" }, motivo: { type: "string" } } } }
            } },
            opportunita: { type: "array", items: { type: "string" } },
            sfide: { type: "array", items: { type: "string" } },
            conclusione_operativa: { type: "string" },
            dati_mancanti: { type: "array", items: { type: "string" } }
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

  console.log('[ExportModular] Risultati moduli:', {
    A: resA ? `${resA.mercati?.length || 0} mercati` : 'NULL',
    B: resB ? `${resB.mercati?.length || 0} mercati` : 'NULL',
    C: resC ? `${resC.mercati?.length || 0} mercati` : 'NULL',
    D: resD ? `${resD.mercati?.length || 0} mercati` : 'NULL',
    E: resE ? `${resE.mercati?.length || 0} mercati, score=${resE.readiness_score}` : 'NULL'
  });

  // === ASSEMBLAGGIO RISULTATO FINALE ===
  // Usa i Paesi noti dal tradeData come base — così non dipendiamo dall'LLM per la struttura
  const expectedCountries = (tradeData.mercati || []).map(m => ({ paese_code: m.paese_code, paese_nome: m.paese_nome }));
  // Se tradeData era vuoto (errore API), ricostruisci la lista paesi dal prompt
  if (expectedCountries.length === 0) {
    const allMercati = [...(resE?.mercati || []), ...(resA?.mercati || []), ...(resB?.mercati || []), ...(resC?.mercati || []), ...(resD?.mercati || [])];
    const seen = new Set();
    allMercati.forEach(m => {
      const code = m.paese_code;
      if (code && !seen.has(code)) { seen.add(code); expectedCountries.push({ paese_code: code, paese_nome: m.paese_nome || code }); }
    });
  }
  const mercatiMap = {};

  // Inizializza con i paesi attesi
  expectedCountries.forEach(c => {
    mercatiMap[c.paese_code] = { paese_code: c.paese_code, paese_nome: c.paese_nome, mercato: c.paese_nome };
  });

  // Helper: trova la chiave corretta nel mercatiMap per un risultato LLM
  // L'LLM potrebbe usare paese_code diversi (es. "SE" vs "SWE", o nome invece di codice)
  function findKey(item) {
    if (!item) return null;
    // Match diretto per paese_code
    if (item.paese_code && mercatiMap[item.paese_code]) return item.paese_code;
    // Match per nome
    const byName = Object.values(mercatiMap).find(m => 
      m.paese_nome?.toLowerCase() === (item.paese_nome || item.mercato || '').toLowerCase()
    );
    if (byName) return byName.paese_code;
    // Se un solo paese, usa quello
    if (Object.keys(mercatiMap).length === 1) return Object.keys(mercatiMap)[0];
    // Fallback: crea nuova entry
    if (item.paese_code) {
      mercatiMap[item.paese_code] = { paese_code: item.paese_code, paese_nome: item.paese_nome || item.paese_code, mercato: item.paese_nome || item.paese_code };
      return item.paese_code;
    }
    return null;
  }

  // Merge modulo E (GTM universale + sintesi) — ha punteggio_opportunita + nuove sezioni fase 1-6
  (resE?.mercati || []).forEach(m => {
    const key = findKey(m);
    if (key) Object.assign(mercatiMap[key], m, { paese_code: key });
  });

  // Merge modulo A (screening + domanda + flussi)
  (resA?.mercati || []).forEach(m => {
    const key = findKey(m);
    if (key) {
      mercatiMap[key].market_screening = m.market_screening;
      mercatiMap[key].domanda_locale = m.domanda_locale;
      mercatiMap[key].flussi_commerciali = m.flussi_commerciali;
      mercatiMap[key].confronto_import_globale = m.confronto_import_globale;
    }
  });

  // Merge modulo B (competitive)
  (resB?.mercati || []).forEach(m => {
    const key = findKey(m);
    if (key) mercatiMap[key].analisi_competitiva = m.analisi_competitiva;
  });

  // Merge modulo C (regulatory)
  (resC?.mercati || []).forEach(m => {
    const key = findKey(m);
    if (key) {
      mercatiMap[key].requisiti_normativi = m.requisiti_normativi;
      mercatiMap[key].dazi_taric = m.dazi_taric;
    }
  });

  // Merge modulo D (logistica + rischio)
  (resD?.mercati || []).forEach(m => {
    const key = findKey(m);
    if (key) {
      mercatiMap[key].logistica = m.logistica;
      mercatiMap[key].rischio_paese = m.rischio_paese;
    }
  });

  // === NORMALIZZAZIONE COERENZA DATI ===
  // I dati API (tradeData) sono la fonte di verità. Se un modulo LLM ha dato un valore
  // diverso per lo stesso campo, sovrascriviamo con il dato API per evitare incoerenze.
  const mercati_analisi = Object.values(mercatiMap);
  (tradeData.mercati || []).forEach(apiM => {
    const assembled = mercati_analisi.find(m => m.paese_code === apiM.paese_code);
    if (!assembled) return;

    // --- Import totale: fonte API ha priorità ---
    const apiImport = apiM.import_totale?.valore_usd;
    const apiImportAnno = apiM.import_totale?.anno;
    const apiImportFonte = apiM.import_totale?.fonte;
    if (apiImport) {
      const importLabel = `${apiImport}${apiImportAnno ? ` (${apiImportAnno}` : ''}${apiImportFonte ? `, fonte: ${apiImportFonte}` : ''}${apiImportAnno || apiImportFonte ? ')' : ''}`;
      // Normalizza in market_screening
      if (assembled.market_screening) {
        assembled.market_screening.import_totale = importLabel;
      }
      // Normalizza in flussi_commerciali
      if (assembled.flussi_commerciali) {
        assembled.flussi_commerciali.valore_import_annuo = importLabel;
      }
    }

    // --- Export bilaterale Italia: fonte API ha priorità ---
    const apiExport = apiM.export_from_exporter?.valore_usd || apiM.export_italia?.valore_usd;
    const apiExportAnno = apiM.export_from_exporter?.anno || apiM.export_italia?.anno;
    const apiExportFonte = apiM.export_from_exporter?.fonte || apiM.export_italia?.fonte;
    if (apiExport) {
      const exportLabel = `${apiExport}${apiExportAnno ? ` (${apiExportAnno}` : ''}${apiExportFonte ? `, fonte: ${apiExportFonte}` : ''}${apiExportAnno || apiExportFonte ? ')' : ''}`;
      if (assembled.flussi_commerciali) {
        assembled.flussi_commerciali.export_italia_verso_paese = exportLabel;
      }
    }

    // --- Quota Italia: fonte API ha priorità ---
    const apiQuota = apiM.quota_exporter || apiM.quota_italia;
    if (apiQuota && assembled.flussi_commerciali) {
      assembled.flussi_commerciali.quota_italia = apiQuota;
    }

    // --- Dazi: normalizza tra modulo C (dazi_taric) e modulo E (logistica_dogane_gtm) ---
    // Il modulo C è specializzato sui dazi → ha priorità su modulo E
    const daziC = assembled.dazi_taric;
    const daziE = assembled.logistica_dogane_gtm;
    if (daziC && daziE) {
      // Sovrascrivi i campi dazi del modulo E con quelli del modulo C se presenti
      if (daziC.dazio_mfn) daziE.dazi_applicabili = daziC.dazio_mfn;
      if (daziC.dazio_preferenziale) daziE.dazio_preferenziale = daziC.dazio_preferenziale;
      if (daziC.anti_dumping) daziE.anti_dumping = daziC.anti_dumping;
      if (daziC.iva_gst) daziE.iva_gst_locale = daziC.iva_gst;
      if (daziC.altre_tasse) daziE.altre_tasse = daziC.altre_tasse;
      if (daziC.esempio_10k_eur) daziE.costo_doganale_su_10k = daziC.esempio_10k_eur;
    }

    // --- Dazi dal market_screening: normalizza con dato più preciso ---
    if (assembled.market_screening && daziC) {
      const daziLabel = daziC.dazio_preferenziale || daziC.dazio_mfn;
      if (daziLabel) assembled.market_screening.dazi = daziLabel;
    }

    // --- Se API ha dazi strutturati, usa quelli come base ---
    const apiDazi = apiM.dazi;
    if (apiDazi) {
      const apiDazioMfn = apiDazi.dazio_mfn;
      const apiDazioPref = apiDazi.dazio_preferenziale;
      // Se i moduli LLM non hanno dazi ma l'API sì, propagali
      if (assembled.market_screening && !assembled.market_screening.dazi) {
        assembled.market_screening.dazi = apiDazioPref || apiDazioMfn || assembled.market_screening.dazi;
      }
    }
  });

  console.log('[ExportModular] Mercati assemblati e normalizzati:', mercati_analisi.length, mercati_analisi.map(m => m.paese_code));

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