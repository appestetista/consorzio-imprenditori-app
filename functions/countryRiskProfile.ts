import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Scheda Stato completa: governance, corruzione, fragilità, rating, macro, demografici.
 * 
 * Fonti:
 * - World Bank API: WGI (governance), macro, demografici
 * - Eurostat API: dati UE (se applicabile)
 * - InvokeLLM + internet: CPI, FSI, Rating sovrano (no API pubblica disponibile)
 * 
 * Input: { country_code: "US" } (ISO Alpha-2)
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

// Paesi UE per decidere se fetchare Eurostat
const EU_COUNTRIES = new Set([
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT',
  'LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'
]);

// Mapping alpha2 → eurostat country code (lowercase)
const ALPHA2_TO_EUROSTAT = {
  AT:'AT',BE:'BE',BG:'BG',HR:'HR',CY:'CY',CZ:'CZ',DK:'DK',EE:'EE',FI:'FI',
  FR:'FR',DE:'DE',GR:'EL',HU:'HU',IE:'IE',IT:'IT',LV:'LV',LT:'LT',LU:'LU',
  MT:'MT',NL:'NL',PL:'PL',PT:'PT',RO:'RO',SK:'SK',SI:'SI',ES:'ES',SE:'SE'
};

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
  } catch {
    return { value: null, year: null };
  }
}

/**
 * Fetch Eurostat JSON data for EU countries
 */
async function fetchEurostatIndicator(geoCode, datasetCode, params = {}) {
  try {
    let url = `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${datasetCode}?geo=${geoCode}&format=JSON`;
    for (const [k, v] of Object.entries(params)) {
      url += `&${k}=${v}`;
    }
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const json = await resp.json();
    
    // Eurostat JSON format: values are indexed, dimensions have categories
    const timeIdx = json.dimension?.time?.category?.index;
    const values = json.value;
    if (!timeIdx || !values) return null;
    
    // Get most recent non-null value
    const times = Object.entries(timeIdx).sort((a, b) => b[1] - a[1]);
    for (const [timePeriod, idx] of times) {
      if (values[String(idx)] !== undefined && values[String(idx)] !== null) {
        return { value: values[String(idx)], year: timePeriod };
      }
    }
    return null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const code2 = (body.country_code || '').toUpperCase();
    if (!code2) return Response.json({ error: 'country_code richiesto' }, { status: 400 });

    const alpha3 = ALPHA2_TO_ALPHA3[code2] || code2;
    const isEU = EU_COUNTRIES.has(code2);
    const eurostatGeo = ALPHA2_TO_EUROSTAT[code2];
    const timestamp = new Date().toISOString();

    // ============================================
    // PARALLELO 1: World Bank API (tutti gli indicatori)
    // ============================================
    const wbPromises = {
      // WGI - Worldwide Governance Indicators (estimate -2.5 to +2.5)
      gov_effectiveness: fetchWBIndicator(alpha3, 'GE.EST'),
      rule_of_law: fetchWBIndicator(alpha3, 'RL.EST'),
      control_corruption: fetchWBIndicator(alpha3, 'CC.EST'),
      political_stability: fetchWBIndicator(alpha3, 'PV.EST'),
      voice_accountability: fetchWBIndicator(alpha3, 'VA.EST'),
      regulatory_quality: fetchWBIndicator(alpha3, 'RQ.EST'),
      // WGI - Percentile Rank (0-100)
      gov_effectiveness_pctile: fetchWBIndicator(alpha3, 'GE.PER.RNK'),
      rule_of_law_pctile: fetchWBIndicator(alpha3, 'RL.PER.RNK'),
      control_corruption_pctile: fetchWBIndicator(alpha3, 'CC.PER.RNK'),
      political_stability_pctile: fetchWBIndicator(alpha3, 'PV.PER.RNK'),
      voice_accountability_pctile: fetchWBIndicator(alpha3, 'VA.PER.RNK'),
      regulatory_quality_pctile: fetchWBIndicator(alpha3, 'RQ.PER.RNK'),
      // Macro
      pil_nominale: fetchWBIndicator(alpha3, 'NY.GDP.MKTP.CD'),
      pil_pro_capite: fetchWBIndicator(alpha3, 'NY.GDP.PCAP.CD'),
      crescita_pil: fetchWBIndicator(alpha3, 'NY.GDP.MKTP.KD.ZG'),
      inflazione: fetchWBIndicator(alpha3, 'FP.CPI.TOTL.ZG'),
      disoccupazione: fetchWBIndicator(alpha3, 'SL.UEM.TOTL.ZS'),
      debito_pil: fetchWBIndicator(alpha3, 'GC.DOD.TOTL.GD.ZS'),
      partite_correnti_pil: fetchWBIndicator(alpha3, 'BN.CAB.XOKA.GD.ZS'),
      // Demografici
      popolazione: fetchWBIndicator(alpha3, 'SP.POP.TOTL'),
      tasso_natalita: fetchWBIndicator(alpha3, 'SP.DYN.CBRT.IN'),
      tasso_mortalita: fetchWBIndicator(alpha3, 'SP.DYN.CDRT.IN'),
      speranza_vita: fetchWBIndicator(alpha3, 'SP.DYN.LE00.IN'),
      popolazione_urbana_pct: fetchWBIndicator(alpha3, 'SP.URB.TOTL.IN.ZS'),
      eta_mediana: fetchWBIndicator(alpha3, 'SP.POP.1564.TO.ZS'), // proxy: working age pop %
    };

    // ============================================
    // PARALLELO 2: Eurostat (solo per paesi UE)
    // ============================================
    const eurostatPromises = isEU && eurostatGeo ? {
      pil_eurostat: fetchEurostatIndicator(eurostatGeo, 'nama_10_gdp', { unit: 'CP_MEUR', na_item: 'B1GQ' }),
      disoccupazione_eurostat: fetchEurostatIndicator(eurostatGeo, 'une_rt_a', { sex: 'T', age: 'Y15-74', unit: 'PC_ACT' }),
    } : {};

    // ============================================
    // PARALLELO 3: LLM + Internet per dati senza API pubblica
    // (CPI, FSI, Rating Sovrano)
    // ============================================
    const llmPromise = base44.integrations.Core.InvokeLLM({
      prompt: `Cerca i dati UFFICIALI VERIFICATI per il paese ${code2} (${alpha3}):

1) RATING SOVRANO:
- S&P Global sovereign credit rating attuale
- Moody's sovereign rating attuale  
- Outlook (positivo/stabile/negativo)
- Data ultimo aggiornamento

2) CORRUPTION PERCEPTIONS INDEX (CPI):
- Score CPI Transparency International più recente (scala 0-100)
- Rank mondiale
- Anno di riferimento
- IMPORTANTE: fornisci anche la classifica completa dei TOP 100 paesi per CPI (dal rank 1 al rank 100), con nome paese e score CPI per ciascuno. Ordina dal rank 1 (migliore) al rank 100. Usa i dati ufficiali Transparency International dell'anno più recente.

3) FRAGILE STATES INDEX (FSI):
- Score totale FSI Fund for Peace più recente
- Rank mondiale
- Anno di riferimento
- Categoria (Sustainable/Stable/Warning/Alert)

REGOLE CRITICHE:
- Restituisci SOLO dati verificati e pubblicati ufficialmente
- Se un dato non è trovabile con certezza, metti null
- Specifica SEMPRE la fonte esatta e l'anno
- Non inventare MAI dati
- Per i rating, usa la notazione ufficiale (AAA, AA+, Baa1, ecc.)
- Per la classifica CPI top 100 usa i nomi dei paesi in italiano`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          sovereign_rating: {
            type: "object",
            properties: {
              sp_rating: { type: ["string", "null"] },
              sp_outlook: { type: ["string", "null"] },
              sp_last_update: { type: ["string", "null"] },
              moodys_rating: { type: ["string", "null"] },
              moodys_outlook: { type: ["string", "null"] },
              moodys_last_update: { type: ["string", "null"] },
              source: { type: "string" }
            }
          },
          cpi: {
            type: "object",
            properties: {
              score: { type: ["number", "null"] },
              rank: { type: ["number", "null"] },
              total_countries: { type: ["number", "null"] },
              year: { type: ["string", "null"] },
              source: { type: "string" },
              top_100: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    rank: { type: "number" },
                    country: { type: "string" },
                    score: { type: "number" }
                  }
                }
              }
            }
          },
          fsi: {
            type: "object",
            properties: {
              score: { type: ["number", "null"] },
              rank: { type: ["number", "null"] },
              category: { type: ["string", "null"] },
              year: { type: ["string", "null"] },
              source: { type: "string" }
            }
          }
        }
      }
    });

    // Attendi tutti in parallelo
    const wbKeys = Object.keys(wbPromises);
    const wbValues = await Promise.all(Object.values(wbPromises));
    const wb = {};
    wbKeys.forEach((k, i) => { wb[k] = wbValues[i]; });

    let eurostat = {};
    if (Object.keys(eurostatPromises).length > 0) {
      const esKeys = Object.keys(eurostatPromises);
      const esValues = await Promise.all(Object.values(eurostatPromises));
      esKeys.forEach((k, i) => { eurostat[k] = esValues[i]; });
    }

    let llmData = null;
    try {
      llmData = await llmPromise;
    } catch (e) {
      console.error('[countryRiskProfile] LLM fallito:', e);
    }

    // ============================================
    // CALCOLO INDICE COMPOSITO
    // ============================================
    
    // Normalizza rating S&P a 0-100
    const ratingScale = {
      'AAA':100,'AA+':95,'AA':90,'AA-':85,'A+':80,'A':75,'A-':70,
      'BBB+':65,'BBB':60,'BBB-':55,'BB+':50,'BB':45,'BB-':40,
      'B+':35,'B':30,'B-':25,'CCC+':20,'CCC':15,'CCC-':10,'CC':8,'C':5,'D':0,
      // Moody's mapping
      'Aaa':100,'Aa1':95,'Aa2':90,'Aa3':85,'A1':80,'A2':75,'A3':70,
      'Baa1':65,'Baa2':60,'Baa3':55,'Ba1':50,'Ba2':45,'Ba3':40,
      'B1':35,'B2':30,'B3':25,'Caa1':20,'Caa2':15,'Caa3':10,'Ca':8
    };

    const spRating = llmData?.sovereign_rating?.sp_rating;
    const moodysRating = llmData?.sovereign_rating?.moodys_rating;
    const ratingScore = ratingScale[spRating] ?? ratingScale[moodysRating] ?? null;
    
    // Media WGI percentile (0-100)
    const wgiPctiles = [
      wb.gov_effectiveness_pctile?.value,
      wb.rule_of_law_pctile?.value,
      wb.control_corruption_pctile?.value,
      wb.political_stability_pctile?.value,
      wb.voice_accountability_pctile?.value,
      wb.regulatory_quality_pctile?.value,
    ].filter(v => v !== null && v !== undefined);
    const wgiAvg = wgiPctiles.length > 0 
      ? parseFloat((wgiPctiles.reduce((a, b) => a + b, 0) / wgiPctiles.length).toFixed(1)) 
      : null;

    // CPI score (0-100)
    const cpiScore = llmData?.cpi?.score ?? null;

    // FSI: inverso normalizzato. FSI va da ~15 (best) a ~120 (worst). Normalizziamo: 100 - (FSI/120*100)
    const fsiScore = llmData?.fsi?.score ?? null;
    const fsiNormalized = fsiScore !== null ? parseFloat((100 - (fsiScore / 120) * 100).toFixed(1)) : null;

    // Financial Reliability Index
    let reliabilityIndex = null;
    const components = [ratingScore, wgiAvg, cpiScore, fsiNormalized].filter(v => v !== null);
    if (components.length >= 2) {
      reliabilityIndex = parseFloat((components.reduce((a, b) => a + b, 0) / components.length).toFixed(1));
    }

    // Classificazione
    let reliabilityLevel = null;
    if (reliabilityIndex !== null) {
      if (reliabilityIndex >= 75) reliabilityLevel = 'Eccellente';
      else if (reliabilityIndex >= 60) reliabilityLevel = 'Buono';
      else if (reliabilityIndex >= 45) reliabilityLevel = 'Medio';
      else if (reliabilityIndex >= 30) reliabilityLevel = 'Basso';
      else reliabilityLevel = 'Critico';
    }

    // ============================================
    // FORMAT RISULTATO
    // ============================================
    const result = {
      country_code: code2,
      country_alpha3: alpha3,
      is_eu: isEU,
      timestamp,

      // === INDICE COMPOSITO ===
      financial_reliability_index: {
        score: reliabilityIndex,
        level: reliabilityLevel,
        components: {
          rating_normalized: ratingScore,
          wgi_average: wgiAvg,
          cpi_score: cpiScore,
          fsi_normalized: fsiNormalized,
        },
        formula: '(Rating norm. + WGI media + CPI + inverso FSI) / n',
        fonte: 'Calcolo composito da S&P/Moody\'s, World Bank WGI, Transparency Int., Fund for Peace'
      },

      // === RATING SOVRANO ===
      sovereign_rating: llmData?.sovereign_rating ? {
        sp: {
          rating: llmData.sovereign_rating.sp_rating,
          outlook: llmData.sovereign_rating.sp_outlook,
          last_update: llmData.sovereign_rating.sp_last_update,
        },
        moodys: {
          rating: llmData.sovereign_rating.moodys_rating,
          outlook: llmData.sovereign_rating.moodys_outlook,
          last_update: llmData.sovereign_rating.moodys_last_update,
        },
        fonte: llmData.sovereign_rating.source || 'S&P Global, Moody\'s (via web)'
      } : null,

      // === SOLIDITÀ ISTITUZIONALE (WGI) ===
      governance: {
        government_effectiveness: {
          estimate: wb.gov_effectiveness?.value !== null ? parseFloat(wb.gov_effectiveness.value.toFixed(2)) : null,
          percentile: wb.gov_effectiveness_pctile?.value !== null ? parseFloat(wb.gov_effectiveness_pctile.value.toFixed(1)) : null,
          year: wb.gov_effectiveness?.year,
        },
        rule_of_law: {
          estimate: wb.rule_of_law?.value !== null ? parseFloat(wb.rule_of_law.value.toFixed(2)) : null,
          percentile: wb.rule_of_law_pctile?.value !== null ? parseFloat(wb.rule_of_law_pctile.value.toFixed(1)) : null,
          year: wb.rule_of_law?.year,
        },
        control_of_corruption: {
          estimate: wb.control_corruption?.value !== null ? parseFloat(wb.control_corruption.value.toFixed(2)) : null,
          percentile: wb.control_corruption_pctile?.value !== null ? parseFloat(wb.control_corruption_pctile.value.toFixed(1)) : null,
          year: wb.control_corruption?.year,
        },
        political_stability: {
          estimate: wb.political_stability?.value !== null ? parseFloat(wb.political_stability.value.toFixed(2)) : null,
          percentile: wb.political_stability_pctile?.value !== null ? parseFloat(wb.political_stability_pctile.value.toFixed(1)) : null,
          year: wb.political_stability?.year,
        },
        voice_accountability: {
          estimate: wb.voice_accountability?.value !== null ? parseFloat(wb.voice_accountability.value.toFixed(2)) : null,
          percentile: wb.voice_accountability_pctile?.value !== null ? parseFloat(wb.voice_accountability_pctile.value.toFixed(1)) : null,
          year: wb.voice_accountability?.year,
        },
        regulatory_quality: {
          estimate: wb.regulatory_quality?.value !== null ? parseFloat(wb.regulatory_quality.value.toFixed(2)) : null,
          percentile: wb.regulatory_quality_pctile?.value !== null ? parseFloat(wb.regulatory_quality_pctile.value.toFixed(1)) : null,
          year: wb.regulatory_quality?.year,
        },
        wgi_average_percentile: wgiAvg,
        fonte: 'World Bank - Worldwide Governance Indicators (WGI)'
      },

      // === CORRUZIONE ===
      corruption: llmData?.cpi ? {
        cpi_score: llmData.cpi.score,
        rank: llmData.cpi.rank,
        total_countries: llmData.cpi.total_countries,
        year: llmData.cpi.year,
        top_100: Array.isArray(llmData.cpi.top_100) ? llmData.cpi.top_100 : [],
        fonte: llmData.cpi.source || 'Transparency International - CPI'
      } : null,

      // === FRAGILITÀ ===
      fragility: llmData?.fsi ? {
        fsi_score: llmData.fsi.score,
        rank: llmData.fsi.rank,
        category: llmData.fsi.category,
        fsi_normalized_score: fsiNormalized,
        year: llmData.fsi.year,
        fonte: llmData.fsi.source || 'Fund for Peace - Fragile States Index'
      } : null,

      // === MACRO ===
      macro: {
        pil_nominale_usd: wb.pil_nominale?.value, pil_nominale_anno: wb.pil_nominale?.year,
        pil_pro_capite_usd: wb.pil_pro_capite?.value, pil_pro_capite_anno: wb.pil_pro_capite?.year,
        crescita_pil_pct: wb.crescita_pil?.value !== null ? parseFloat(wb.crescita_pil.value.toFixed(2)) : null, crescita_pil_anno: wb.crescita_pil?.year,
        inflazione_pct: wb.inflazione?.value !== null ? parseFloat(wb.inflazione.value.toFixed(2)) : null, inflazione_anno: wb.inflazione?.year,
        disoccupazione_pct: wb.disoccupazione?.value !== null ? parseFloat(wb.disoccupazione.value.toFixed(2)) : null, disoccupazione_anno: wb.disoccupazione?.year,
        debito_pil_pct: wb.debito_pil?.value !== null ? parseFloat(wb.debito_pil.value.toFixed(2)) : null, debito_pil_anno: wb.debito_pil?.year,
        partite_correnti_pil_pct: wb.partite_correnti_pil?.value !== null ? parseFloat(wb.partite_correnti_pil.value.toFixed(2)) : null, partite_correnti_pil_anno: wb.partite_correnti_pil?.year,
        fonte: 'World Bank API'
      },

      // === EUROSTAT (solo UE) ===
      eurostat: isEU ? {
        pil_meur: eurostat.pil_eurostat?.value || null, pil_meur_anno: eurostat.pil_eurostat?.year || null,
        disoccupazione_pct: eurostat.disoccupazione_eurostat?.value || null, disoccupazione_anno: eurostat.disoccupazione_eurostat?.year || null,
        fonte: 'Eurostat API'
      } : null,

      // === DEMOGRAFICI ===
      demographics: {
        popolazione: wb.popolazione?.value, popolazione_anno: wb.popolazione?.year,
        tasso_natalita: wb.tasso_natalita?.value !== null ? parseFloat(wb.tasso_natalita.value.toFixed(2)) : null, tasso_natalita_anno: wb.tasso_natalita?.year,
        tasso_mortalita: wb.tasso_mortalita?.value !== null ? parseFloat(wb.tasso_mortalita.value.toFixed(2)) : null, tasso_mortalita_anno: wb.tasso_mortalita?.year,
        speranza_vita: wb.speranza_vita?.value !== null ? parseFloat(wb.speranza_vita.value.toFixed(1)) : null, speranza_vita_anno: wb.speranza_vita?.year,
        popolazione_urbana_pct: wb.popolazione_urbana_pct?.value !== null ? parseFloat(wb.popolazione_urbana_pct.value.toFixed(1)) : null, popolazione_urbana_anno: wb.popolazione_urbana_pct?.year,
        eta_lavorativa_pct: wb.eta_mediana?.value !== null ? parseFloat(wb.eta_mediana.value.toFixed(1)) : null, eta_lavorativa_anno: wb.eta_mediana?.year,
        fonte: 'World Bank API'
      },

      // === FONTI ===
      sources: {
        world_bank: 'https://api.worldbank.org/v2/',
        wgi: 'https://info.worldbank.org/governance/wgi/',
        transparency_international: 'https://www.transparency.org/cpi',
        fund_for_peace: 'https://fragilestatesindex.org/',
        eurostat: isEU ? 'https://ec.europa.eu/eurostat' : null,
        sp_global: 'https://www.spglobal.com/ratings/',
        moodys: 'https://www.moodys.com/'
      }
    };

    return Response.json(result);

  } catch (error) {
    console.error('[countryRiskProfile] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});