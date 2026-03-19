import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Backend function: Recupera dati commerciali da API REALI multiple:
 * 1) UN Comtrade (Public + Premium se chiave disponibile)
 * 2) OEC (BACI data)
 * 3) WITS Trade Stats (World Bank)
 * 4) WITS TRAINS (Tariffe MFN + Preferenziali)
 * 5) Eurostat Comext (EU trade data)
 * 6) World Bank (Macro indicators)
 * 
 * Payload:
 *   reporter_code: string (ISO2, es. "IT")
 *   partner_codes: string[] (ISO2, es. ["US","DE","CN"])
 *   hs_code: string (4 o 6 cifre)
 *   flow_type: "import" | "export"
 *   period_years: number (default 5)
 *   skip_cache: boolean (default false)
 *   include_tariffs: boolean (default true)
 *   include_eurostat: boolean (default true)
 *   include_freight: boolean (default true) — stima trasporto Freightos
 *   include_prices: boolean (default true) — ricerca prezzi B2B via LLM
 *   origin_city: string (es. "Milan") — città origine per stima trasporto
 *   dest_cities: object (es. {"FR":"Paris","US":"New York"}) — città dest per trasporto
 *   product_description: string — descrizione prodotto per ricerca prezzi
 *   shipment_weight_kg: number — peso spedizione per stima trasporto
 */

// ===== COUNTRY CODE MAPPINGS =====

const ISO2_TO_OEC = {
  AF:'asafg',AL:'eualb',DZ:'afdza',AO:'afago',AR:'saarg',AM:'asarm',AU:'ocaus',AT:'euaut',AZ:'asaze',
  BH:'asbhr',BD:'asbgd',BY:'eublr',BE:'eubel',BJ:'afben',BO:'sabol',BA:'eubih',BW:'afbwa',BR:'sabra',
  BN:'asbrn',BG:'eubgr',BF:'afbfa',KH:'askhm',CM:'afcmr',CA:'nacan',CL:'sachl',CN:'aschn',CO:'sacol',
  CG:'afcog',CR:'nacri',CI:'afciv',HR:'euhrv',CU:'nacub',CY:'eucyp',CZ:'eucze',DK:'eudnk',DO:'nadom',
  EC:'saecu',EG:'afegy',SV:'naslv',EE:'euest',ET:'afeth',FI:'eufin',FR:'eufra',GA:'afgab',GE:'asgeo',
  DE:'eudeu',GH:'afgha',GR:'eugrc',GT:'nagtm',GN:'afgin',HN:'nahnd',HK:'ashkg',HU:'euhun',IS:'euisl',
  IN:'asind',ID:'asidn',IR:'asirn',IQ:'asirq',IE:'euirl',IL:'asisr',IT:'euita',JM:'najam',JP:'asjpn',
  JO:'asjor',KZ:'askaz',KE:'afken',KR:'askor',KW:'askwt',LV:'eulva',LB:'aslbn',LY:'aflby',LT:'eultu',
  LU:'eulux',MO:'asmac',MG:'afmdg',MY:'asmys',ML:'afmli',MT:'eumlt',MX:'namex',MD:'eumda',MN:'asmng',
  ME:'eumne',MA:'afmar',MZ:'afmoz',MM:'asmmr',NA:'afnam',NP:'asnpl',NL:'eunld',NZ:'ocnzl',NI:'nanic',
  NE:'afner',NG:'afnga',NO:'eunor',OM:'asomn',PK:'aspak',PA:'napan',PY:'sapry',PE:'saper',PH:'asphl',
  PL:'eupol',PT:'euprt',QA:'asqat',RO:'eurou',RU:'eurus',RW:'afrwa',SA:'assau',SN:'afsen',RS:'eusrb',
  SG:'assgp',SK:'eusvk',SI:'eusvn',ZA:'afzaf',ES:'euesp',LK:'aslka',SD:'afsdn',SE:'euswe',CH:'euche',
  TW:'astwn',TZ:'aftza',TH:'astha',TN:'aftun',TR:'astur',UA:'euukr',AE:'asare',GB:'eugbr',US:'nausa',
  UY:'saury',UZ:'asuzb',VE:'saven',VN:'asvnm',ZM:'afzmb',ZW:'afzwe'
};

const ISO2_TO_ISO3 = {
  AF:'AFG',AL:'ALB',DZ:'DZA',AO:'AGO',AR:'ARG',AM:'ARM',AU:'AUS',AT:'AUT',AZ:'AZE',
  BH:'BHR',BD:'BGD',BY:'BLR',BE:'BEL',BJ:'BEN',BO:'BOL',BA:'BIH',BW:'BWA',BR:'BRA',
  BN:'BRN',BG:'BGR',BF:'BFA',KH:'KHM',CM:'CMR',CA:'CAN',CL:'CHL',CN:'CHN',CO:'COL',
  CG:'COG',CR:'CRI',CI:'CIV',HR:'HRV',CU:'CUB',CY:'CYP',CZ:'CZE',DK:'DNK',DO:'DOM',
  EC:'ECU',EG:'EGY',SV:'SLV',EE:'EST',ET:'ETH',FI:'FIN',FR:'FRA',GA:'GAB',GE:'GEO',
  DE:'DEU',GH:'GHA',GR:'GRC',GT:'GTM',GN:'GIN',HN:'HND',HK:'HKG',HU:'HUN',IS:'ISL',
  IN:'IND',ID:'IDN',IR:'IRN',IQ:'IRQ',IE:'IRL',IL:'ISR',IT:'ITA',JM:'JAM',JP:'JPN',
  JO:'JOR',KZ:'KAZ',KE:'KEN',KR:'KOR',KW:'KWT',LV:'LVA',LB:'LBN',LY:'LBY',LT:'LTU',
  LU:'LUX',MO:'MAC',MG:'MDG',MY:'MYS',ML:'MLI',MT:'MLT',MX:'MEX',MD:'MDA',MN:'MNG',
  ME:'MNE',MA:'MAR',MZ:'MOZ',MM:'MMR',NA:'NAM',NP:'NPL',NL:'NLD',NZ:'NZL',NI:'NIC',
  NE:'NER',NG:'NGA',NO:'NOR',OM:'OMN',PK:'PAK',PA:'PAN',PY:'PRY',PE:'PER',PH:'PHL',
  PL:'POL',PT:'PRT',QA:'QAT',RO:'ROU',RU:'RUS',RW:'RWA',SA:'SAU',SN:'SEN',RS:'SRB',
  SG:'SGP',SK:'SVK',SI:'SVN',ZA:'ZAF',ES:'ESP',LK:'LKA',SD:'SDN',SE:'SWE',CH:'CHE',
  TW:'TWN',TZ:'TZA',TH:'THA',TN:'TUN',TR:'TUR',UA:'UKR',AE:'ARE',GB:'GBR',US:'USA',
  UY:'URY',UZ:'UZB',VE:'VEN',VN:'VNM',ZM:'ZMB',ZW:'ZWE'
};

const ISO2_TO_M49 = {
  AF:4,AL:8,DZ:12,AO:24,AR:32,AM:51,AU:36,AT:40,AZ:31,
  BH:48,BD:50,BY:112,BE:56,BJ:204,BO:68,BA:70,BW:72,BR:76,
  BN:96,BG:100,BF:854,KH:116,CM:120,CA:124,CL:152,CN:156,CO:170,
  CG:178,CR:188,CI:384,HR:191,CU:192,CY:196,CZ:203,DK:208,DO:214,
  EC:218,EG:818,SV:222,EE:233,ET:231,FI:246,FR:251,GA:266,GE:268,
  DE:276,GH:288,GR:300,GT:320,GN:324,HN:340,HK:344,HU:348,IS:352,
  IN:356,ID:360,IR:364,IQ:368,IE:372,IL:376,IT:380,JM:388,JP:392,
  JO:400,KZ:398,KE:404,KR:410,KW:414,LV:428,LB:422,LY:434,LT:440,
  LU:442,MO:446,MG:450,MY:458,ML:466,MT:470,MX:484,MD:498,MN:496,
  ME:499,MA:504,MZ:508,MM:104,NA:516,NP:524,NL:528,NZ:554,NI:558,
  NE:562,NG:566,NO:578,OM:512,PK:586,PA:591,PY:600,PE:604,PH:608,
  PL:616,PT:620,QA:634,RO:642,RU:643,RW:646,SA:682,SN:686,RS:688,
  SG:702,SK:703,SI:705,ZA:710,ES:724,LK:144,SD:729,SE:752,CH:757,
  TW:490,TZ:834,TH:764,TN:788,TR:792,UA:804,AE:784,GB:826,US:842,
  UY:858,UZ:860,VE:862,VN:704,ZM:894,ZW:716
};

// Eurostat country codes (ISO2 → Eurostat partner code)
const EU_MEMBERS = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];

// ISO2 → Country name (English) for LLM web enrichment
const ISO2_TO_NAME = {
  AF:'Afghanistan',AL:'Albania',DZ:'Algeria',AO:'Angola',AR:'Argentina',AM:'Armenia',AU:'Australia',AT:'Austria',AZ:'Azerbaijan',
  BH:'Bahrain',BD:'Bangladesh',BY:'Belarus',BE:'Belgium',BJ:'Benin',BO:'Bolivia',BA:'Bosnia',BW:'Botswana',BR:'Brazil',
  BN:'Brunei',BG:'Bulgaria',BF:'Burkina Faso',KH:'Cambodia',CM:'Cameroon',CA:'Canada',CL:'Chile',CN:'China',CO:'Colombia',
  CG:'Congo',CR:'Costa Rica',CI:'Ivory Coast',HR:'Croatia',CU:'Cuba',CY:'Cyprus',CZ:'Czech Republic',DK:'Denmark',DO:'Dominican Republic',
  EC:'Ecuador',EG:'Egypt',SV:'El Salvador',EE:'Estonia',ET:'Ethiopia',FI:'Finland',FR:'France',GA:'Gabon',GE:'Georgia',
  DE:'Germany',GH:'Ghana',GR:'Greece',GT:'Guatemala',GN:'Guinea',HN:'Honduras',HK:'Hong Kong',HU:'Hungary',IS:'Iceland',
  IN:'India',ID:'Indonesia',IR:'Iran',IQ:'Iraq',IE:'Ireland',IL:'Israel',IT:'Italy',JM:'Jamaica',JP:'Japan',
  JO:'Jordan',KZ:'Kazakhstan',KE:'Kenya',KR:'South Korea',KW:'Kuwait',LV:'Latvia',LB:'Lebanon',LY:'Libya',LT:'Lithuania',
  LU:'Luxembourg',MO:'Macao',MG:'Madagascar',MY:'Malaysia',ML:'Mali',MT:'Malta',MX:'Mexico',MD:'Moldova',MN:'Mongolia',
  ME:'Montenegro',MA:'Morocco',MZ:'Mozambique',MM:'Myanmar',NA:'Namibia',NP:'Nepal',NL:'Netherlands',NZ:'New Zealand',NI:'Nicaragua',
  NE:'Niger',NG:'Nigeria',NO:'Norway',OM:'Oman',PK:'Pakistan',PA:'Panama',PY:'Paraguay',PE:'Peru',PH:'Philippines',
  PL:'Poland',PT:'Portugal',QA:'Qatar',RO:'Romania',RU:'Russia',RW:'Rwanda',SA:'Saudi Arabia',SN:'Senegal',RS:'Serbia',
  SG:'Singapore',SK:'Slovakia',SI:'Slovenia',ZA:'South Africa',ES:'Spain',LK:'Sri Lanka',SD:'Sudan',SE:'Sweden',CH:'Switzerland',
  TW:'Taiwan',TZ:'Tanzania',TH:'Thailand',TN:'Tunisia',TR:'Turkey',UA:'Ukraine',AE:'UAE',GB:'United Kingdom',US:'United States',
  UY:'Uruguay',UZ:'Uzbekistan',VE:'Venezuela',VN:'Vietnam',ZM:'Zambia',ZW:'Zimbabwe'
};

// ===== SOURCE 1: OEC (BACI data) =====

async function fetchFromOEC(reporterISO2, partnerISO2, hsCode, flowType, startYear, endYear) {
  const hs4 = String(hsCode).replace(/\D/g, '').substring(0, 4);
  const cube = 'trade_i_baci_a_22';
  const reporterOEC = ISO2_TO_OEC[reporterISO2];
  const partnerOEC = ISO2_TO_OEC[partnerISO2];
  if (!reporterOEC || !partnerOEC) return null;

  const yearRange = [];
  for (let y = startYear; y <= endYear; y++) yearRange.push(y);
  const yearsStr = yearRange.join(',');

  let exporterVal, importerVal;
  if (flowType === 'export') {
    exporterVal = reporterOEC;
    importerVal = partnerOEC;
  } else {
    exporterVal = partnerOEC;
    importerVal = reporterOEC;
  }

  const url = `https://api-v2.oec.world/tesseract/data.jsonrecords?cube=${cube}&drilldowns=Year,HS4,Exporter+Country,Importer+Country&measures=Trade+Value&include=Year:${yearsStr};Exporter+Country:${exporterVal};Importer+Country:${importerVal}&limit=500,0`;
  console.log(`[OEC] Fetching: ${reporterISO2}->${partnerISO2} HS${hs4} ${flowType}`);

  const resp = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(15000) });
  if (!resp.ok) { console.log(`[OEC] HTTP ${resp.status}`); return null; }

  const json = await resp.json();
  const records = json?.data || [];
  if (records.length === 0) return null;

  const filtered = records.filter(r => {
    const id = String(r['HS4 ID'] || r['HS4'] || '');
    return id.endsWith(hs4) || id.includes(hs4);
  });
  const dataToUse = filtered.length > 0 ? filtered : records;

  const byYear = {};
  for (const r of dataToUse) {
    const year = r.Year;
    if (!byYear[year]) byYear[year] = { trade_value: 0 };
    byYear[year].trade_value += (r['Trade Value'] || 0);
  }

  return Object.entries(byYear)
    .map(([year, data]) => ({ year: parseInt(year), trade_value_usd: Math.round(data.trade_value), source: 'oec', source_detail: cube }))
    .sort((a, b) => a.year - b.year);
}

// ===== SOURCE 2: UN Comtrade Public API =====

async function fetchFromComtradePublic(reporterISO2, partnerISO2, hsCode, flowType, startYear, endYear) {
  const reporterM49 = ISO2_TO_M49[reporterISO2];
  const partnerM49 = ISO2_TO_M49[partnerISO2];
  if (!reporterM49 || !partnerM49) return null;

  const hs4 = String(hsCode).replace(/\D/g, '').substring(0, 4);
  const flowCode = flowType === 'export' ? 'X' : 'M';

  const years = [];
  for (let y = startYear; y <= endYear; y++) years.push(y);

  console.log(`[Comtrade-Public] Fetching: ${reporterISO2}(${reporterM49})->${partnerISO2}(${partnerM49}) HS${hs4} ${flowType}`);

  const yearPromises = years.map(async (year) => {
    const url = `https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=${reporterM49}&partnerCode=${partnerM49}&cmdCode=${hs4}&flowCode=${flowCode}&period=${year}`;
    const resp = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(12000) });
    if (!resp.ok) return null;

    const json = await resp.json();
    const records = json?.data || [];
    if (records.length === 0) return null;

    let totalValue = 0, totalNetWgt = 0, totalQty = 0, qtyUnit = null;
    for (const r of records) {
      if (r.primaryValue != null) totalValue += r.primaryValue;
      if (r.netWgt) totalNetWgt += r.netWgt;
      if (r.qty) totalQty += r.qty;
      if (r.qtyUnitAbbr && !qtyUnit) qtyUnit = r.qtyUnitAbbr;
    }
    if (totalValue <= 0) return null;

    return {
      year, trade_value_usd: Math.round(totalValue),
      net_weight_kg: totalNetWgt > 0 ? Math.round(totalNetWgt) : null,
      quantity: totalQty > 0 ? Math.round(totalQty) : null,
      quantity_unit: qtyUnit,
      source: 'comtrade', source_detail: `public-${reporterM49}-${partnerM49}-${hs4}`
    };
  });

  const results = await Promise.allSettled(yearPromises);
  const data = results.filter(r => r.status === 'fulfilled' && r.value != null).map(r => r.value).sort((a, b) => a.year - b.year);
  return data.length > 0 ? data : null;
}

// ===== SOURCE 2b: UN Comtrade — Top suppliers for a market =====

async function fetchComtradeTopSuppliers(importerISO2, hsCode, year) {
  const importerM49 = ISO2_TO_M49[importerISO2];
  if (!importerM49) return null;

  const hs4 = String(hsCode).replace(/\D/g, '').substring(0, 4);

  // Try the target year first, then fall back to year-1
  for (const tryYear of [year, year - 1]) {
    const url = `https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=${importerM49}&partnerCode=0&cmdCode=${hs4}&flowCode=M&period=${tryYear}`;
    console.log(`[Comtrade-TopSuppliers] Fetching top suppliers for ${importerISO2} HS${hs4} year=${tryYear}`);

    try {
      const resp = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(15000) });
      if (!resp.ok) { console.log(`[Comtrade-TopSuppliers] HTTP ${resp.status} for year ${tryYear}`); continue; }

      const json = await resp.json();
      const records = json?.data || [];
      if (records.length === 0) { console.log(`[Comtrade-TopSuppliers] No data for year ${tryYear}`); continue; }

      // Aggregate by partner
      const byPartner = {};
      let totalImport = 0;
      for (const r of records) {
        const partnerCode = r.partnerCode;
        const partnerDesc = r.partnerDesc || r.partner || `M49:${partnerCode}`;
        if (partnerCode === 0) continue; // Skip "World" aggregate
        const val = r.primaryValue || 0;
        if (val <= 0) continue;
        if (!byPartner[partnerCode]) byPartner[partnerCode] = { name: partnerDesc, value: 0 };
        byPartner[partnerCode].value += val;
        totalImport += val;
      }

      if (totalImport <= 0) continue;

      const sorted = Object.values(byPartner).sort((a, b) => b.value - a.value);
      const top10 = sorted.slice(0, 10).map(s => ({
        paese: s.name,
        valore_usd: Math.round(s.value),
        quota_percentuale: totalImport > 0 ? ((s.value / totalImport) * 100).toFixed(1) + '%' : 'N/D',
        fonte: 'UN Comtrade'
      }));

      return { top_fornitori: top10, import_totale_usd: Math.round(totalImport), fonte: 'UN Comtrade', anno: tryYear };
    } catch (e) {
      console.log(`[Comtrade-TopSuppliers] Error year ${tryYear}: ${e.message}`);
      continue;
    }
  }

  return null;
}

// ===== SOURCE 3: UN Comtrade Premium =====

async function fetchFromComtradePremium(reporterISO2, partnerISO2, hsCode, flowType, startYear, endYear) {
  // Premium API key is optional — skip if not available
  const envVars = Deno.env.toObject();
  const apiKey = envVars['COMTRADE_API_KEY'] || '';
  if (!apiKey || apiKey.length < 10) return null;

  const reporterM49 = ISO2_TO_M49[reporterISO2];
  const partnerM49 = ISO2_TO_M49[partnerISO2];
  if (!reporterM49 || !partnerM49) return null;

  const hs4 = String(hsCode).replace(/\D/g, '').substring(0, 4);
  const flowCode = flowType === 'export' ? 'X' : 'M';
  const years = [];
  for (let y = startYear; y <= endYear; y++) years.push(y);

  const url = `https://comtradeapi.un.org/data/v1/get/C/A/HS?reporterCode=${reporterM49}&partnerCode=${partnerM49}&cmdCode=${hs4}&flowCode=${flowCode}&period=${years.join(',')}&subscription-key=${apiKey}`;
  console.log(`[Comtrade-Premium] Fetching: ${reporterISO2}->${partnerISO2} HS${hs4}`);

  const resp = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(20000) });
  if (!resp.ok) return null;

  const json = await resp.json();
  const records = json?.data || [];
  if (records.length === 0) return null;

  return records.filter(r => r.primaryValue != null).map(r => ({
    year: parseInt(r.period || r.refYear),
    trade_value_usd: Math.round(r.primaryValue || 0),
    net_weight_kg: r.netWgt ? Math.round(r.netWgt) : null,
    quantity: r.qty ? Math.round(r.qty) : null,
    quantity_unit: r.qtyUnitAbbr || null,
    source: 'comtrade', source_detail: `premium`
  })).sort((a, b) => a.year - b.year);
}

// ===== SOURCE 4: WITS Trade Stats =====

async function fetchFromWITS(reporterISO3, partnerISO3, hsCode, flowType, startYear, endYear) {
  const indicator = flowType === 'export' ? 'XPRT-TRD-VL' : 'MPRT-TRD-VL';
  const hs6 = String(hsCode).replace(/\D/g, '').substring(0, 6);

  const results = [];
  for (let year = startYear; year <= endYear; year++) {
    const url = `https://wits.worldbank.org/API/V1/SDMX/V21/rest/data/DF_WITS_TradeStats_Trade/${reporterISO3}.${partnerISO3}.${hs6}.${year}.${indicator}?format=JSON`;
    console.log(`[WITS-Trade] ${reporterISO3}->${partnerISO3} HS${hs6} ${year}`);

    try {
      const resp = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(10000) });
      if (!resp.ok) continue;

      const json = await resp.json();
      const observations = json?.dataSets?.[0]?.observations || json?.dataSets?.[0]?.series;
      if (!observations) continue;

      let value = null;
      if (typeof observations === 'object') {
        const keys = Object.keys(observations);
        if (keys.length > 0) {
          const obs = observations[keys[0]];
          value = Array.isArray(obs) ? obs[0] : obs?.observations?.['0']?.[0];
        }
      }
      if (value != null && !isNaN(value) && value > 0) {
        results.push({ year, trade_value_usd: Math.round(value), source: 'wits', source_detail: indicator });
      }
    } catch (e) {
      console.log(`[WITS-Trade] Error year ${year}: ${e.message}`);
    }
  }

  return results.length > 0 ? results : null;
}

// ===== SOURCE 5: WITS TRAINS — Tariffe (MFN + Preferenziali) =====
// Usa 3 endpoint in cascata per massima affidabilità:
// 1) WITS URL-based API (più stabile)
// 2) WITS SDMX tradestats-tariff
// 3) WITS SDMX TRAINS

async function fetchWITSTariffs(importerISO3, hsCode, year) {
  const hs6 = String(hsCode).replace(/\D/g, '').substring(0, 6);

  // === Tentativo 1: WITS URL-based API (più stabile) ===
  for (const tryYear of [year, year - 1]) {
    const urlBased = `https://wits.worldbank.org/API/V1/wits/datasource/tradestats-tariff/reporter/${importerISO3}/year/${tryYear}/partner/000/product/${hs6}`;
    console.log(`[WITS-Tariff-URL] ${importerISO3} HS${hs6} year=${tryYear}`);
    try {
      const resp = await fetch(urlBased, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(12000) });
      if (resp.ok) {
        const json = await resp.json();
        const parsed = parseWITSUrlResponse(json, tryYear);
        if (parsed) { console.log(`[WITS-Tariff-URL] OK: MFN=${parsed.dazio_mfn}`); return parsed; }
      }
    } catch (e) { console.log(`[WITS-Tariff-URL] Error y${tryYear}: ${e.message}`); }
  }

  // === Tentativo 2: SDMX tradestats-tariff ===
  for (const tryYear of [year, year - 1]) {
    const url = `https://wits.worldbank.org/API/V1/SDMX/V21/datasource/tradestats-tariff/reporter/${importerISO3}/year/${tryYear}/partner/000/product/${hs6}?format=JSON`;
    console.log(`[WITS-Tariff-SDMX] ${importerISO3} HS${hs6} year=${tryYear}`);
    try {
      const resp = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(12000) });
      if (resp.ok) {
        const json = await resp.json();
        const parsed = parseTariffResponse(json, tryYear);
        if (parsed) { console.log(`[WITS-Tariff-SDMX] OK: MFN=${parsed.dazio_mfn}`); return parsed; }
      }
    } catch (e) { console.log(`[WITS-Tariff-SDMX] Error y${tryYear}: ${e.message}`); }
  }

  // === Tentativo 3: SDMX TRAINS ===
  for (const tryYear of [year, year - 1]) {
    const urlTrains = `https://wits.worldbank.org/API/V1/SDMX/V21/rest/data/DF_WITS_Tariff_TRAINS/${importerISO3}.000.${hs6}.${tryYear}?format=JSON`;
    console.log(`[WITS-Tariff-TRAINS] ${importerISO3} HS${hs6} year=${tryYear}`);
    try {
      const resp = await fetch(urlTrains, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(12000) });
      if (resp.ok) {
        const json = await resp.json();
        const parsed = parseTariffResponse(json, tryYear);
        if (parsed) { console.log(`[WITS-Tariff-TRAINS] OK: MFN=${parsed.dazio_mfn}`); return parsed; }
      }
    } catch (e) { console.log(`[WITS-Tariff-TRAINS] Error y${tryYear}: ${e.message}`); }
  }

  console.log(`[WITS-Tariff] All attempts failed for ${importerISO3} HS${hs6}`);
  return null;
}

function parseWITSUrlResponse(json, year) {
  try {
    // L'API URL-based restituisce un array di oggetti con SimpleAverage, etc.
    const records = Array.isArray(json) ? json : json?.data || json?.dataSets?.[0]?.observations || [];
    if (!records || (Array.isArray(records) && records.length === 0)) return null;

    let mfnRate = null, prefRate = null, mfnMin = null, mfnMax = null;

    const extractFromArray = (arr) => {
      for (const rec of arr) {
        const tariffType = rec.TariffType || rec.TARIFFTYPE || rec.tariff_type || '';
        const avg = parseFloat(rec.SimpleAverage ?? rec.OBS_VALUE ?? rec.Value ?? rec.simpleAverage ?? NaN);
        const min = parseFloat(rec.MIN_RATE ?? rec.MinRate ?? NaN);
        const max = parseFloat(rec.MAX_RATE ?? rec.MaxRate ?? NaN);
        if (isNaN(avg)) continue;
        if (tariffType === 'MFN' || tariffType === '' || !tariffType) {
          if (mfnRate === null) { mfnRate = avg; mfnMin = isNaN(min) ? null : min; mfnMax = isNaN(max) ? null : max; }
        }
        if (tariffType === 'PREF' || tariffType === 'Preferential') {
          if (prefRate === null) prefRate = avg;
        }
      }
    };

    if (Array.isArray(records)) { extractFromArray(records); }
    else if (typeof records === 'object') {
      // SDMX-like nested structure
      for (const key of Object.keys(records)) {
        const obs = records[key]?.observations || records[key];
        if (obs && typeof obs === 'object') {
          const vals = Object.values(obs);
          if (vals.length > 0) {
            const v = Array.isArray(vals[0]) ? vals[0][0] : vals[0];
            if (v != null && !isNaN(v)) { if (mfnRate === null) mfnRate = v; else if (prefRate === null) prefRate = v; }
          }
        }
      }
    }

    if (mfnRate === null && prefRate === null) return null;

    return {
      dazio_mfn: mfnRate !== null ? `${mfnRate}%` : null,
      dazio_mfn_valore: mfnRate,
      dazio_mfn_min: mfnMin !== null ? `${mfnMin}%` : null,
      dazio_mfn_max: mfnMax !== null ? `${mfnMax}%` : null,
      dazio_preferenziale: prefRate !== null ? `${prefRate}%` : null,
      dazio_preferenziale_valore: prefRate,
      anno: year,
      fonte: 'WITS/TRAINS'
    };
  } catch (e) { return null; }
}

function parseTariffResponse(json, year) {
  try {
    const series = json?.dataSets?.[0]?.series || json?.dataSets?.[0]?.observations;
    if (!series) return null;

    let mfnRate = null, prefRate = null;
    for (const key of Object.keys(series)) {
      const obs = series[key]?.observations || series[key];
      if (!obs) continue;
      const values = Object.values(obs);
      if (values.length > 0) {
        const val = Array.isArray(values[0]) ? values[0][0] : values[0];
        if (val != null && !isNaN(val)) {
          if (mfnRate === null) mfnRate = val;
          else if (prefRate === null) prefRate = val;
        }
      }
    }

    if (mfnRate === null && prefRate === null) return null;

    return {
      dazio_mfn: mfnRate !== null ? `${mfnRate}%` : null,
      dazio_mfn_valore: mfnRate,
      dazio_preferenziale: prefRate !== null ? `${prefRate}%` : null,
      dazio_preferenziale_valore: prefRate,
      anno: year,
      fonte: 'WITS/TRAINS'
    };
  } catch (e) {
    return null;
  }
}

// ===== SOURCE 6: WTO Timeseries API (Tariff data) =====

async function fetchWTOTariffs(importerISO3, hsCode, year) {
  const apiKey = Deno.env.get('WTO_API_KEY') || '';
  if (!apiKey || apiKey.length < 5) return null;

  const hs4 = String(hsCode).replace(/\D/g, '').substring(0, 4);
  // WTO Timeseries: indicator HS_M_0010 = MFN Applied, HS_M_0020 = MFN Bound
  const indicators = ['HS_M_0010', 'HS_M_0020'];
  const results = { mfn_applied: null, mfn_bound: null, anno: year, fonte: 'WTO Timeseries' };

  for (let i = 0; i < indicators.length; i++) {
    const indicator = indicators[i];
    const url = `https://api.wto.org/timeseries/v1/data?i=${indicator}&r=${importerISO3}&ps=${year}&pc=${hs4}&fmt=json&mode=codes&lang=1&max=100`;
    console.log(`[WTO-TS] Fetching ${indicator} for ${importerISO3} HS${hs4} year=${year}`);

    try {
      const resp = await fetch(url, {
        headers: { 'Ocp-Apim-Subscription-Key': apiKey, 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000)
      });
      if (!resp.ok) { console.log(`[WTO-TS] HTTP ${resp.status} for ${indicator}`); continue; }

      const json = await resp.json();
      const dataset = json?.Dataset || [];
      if (dataset.length === 0) continue;

      // Average the values for HS4 aggregation
      let sum = 0, count = 0;
      for (const rec of dataset) {
        const val = parseFloat(rec.Value);
        if (!isNaN(val) && val >= 0) { sum += val; count++; }
      }
      if (count > 0) {
        const avg = (sum / count).toFixed(2);
        if (i === 0) results.mfn_applied = `${avg}%`;
        else results.mfn_bound = `${avg}%`;
      }
    } catch (e) {
      console.log(`[WTO-TS] Error ${indicator}: ${e.message}`);
    }
  }

  return (results.mfn_applied || results.mfn_bound) ? results : null;
}

// ===== SOURCE 7: LLM Web Enrichment (Access2Markets, Trade Map, ICE) =====

async function fetchLLMWebEnrichment(base44, importerISO2, importerName, hsCode, exporterISO2) {
  const hs4 = String(hsCode).replace(/\D/g, '').substring(0, 4);
  const hs6 = String(hsCode).replace(/\D/g, '').substring(0, 6);
  const exporterName = ISO2_TO_NAME[exporterISO2] || exporterISO2;
  const isEUExporter = EU_MEMBERS.includes(exporterISO2);
  const isEUImporter = EU_MEMBERS.includes(importerISO2);

  console.log(`[LLM-Web] Enrichment for ${importerName} (${importerISO2}) HS${hs6} exporter=${exporterISO2}`);

  try {
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `SEI UN ESPERTO DI COMMERCIO INTERNAZIONALE. Devi trovare DATI REALI, VERIFICATI e AGGIORNATI per l'export da ${exporterName} (${exporterISO2}) verso ${importerName} (${importerISO2}) per il codice HS ${hs6} (heading HS ${hs4}).

FONTI DA CONSULTARE (in ordine di priorità per dazi):

1. **Access2Markets** (https://trade.ec.europa.eu/access-to-markets/it/search?product=${hs6}&origin=${exporterISO2}&destination=${importerISO2}):
   - Cerca: "Tariffs" → dazio MFN (third country duty), dazio preferenziale (se esiste FTA)
   - Cerca: "Taxes" → IVA/GST/VAT del paese importatore
   - Cerca: "Requirements" → certificazioni, standard, etichettatura obbligatoria
   - Cerca: "Anti-dumping/countervailing" → dazi anti-dumping specifici
   - Cerca: "Rules of origin" → regole per ottenere il dazio preferenziale

2. **ITC MacMap** (https://www.macmap.org/en/query/results?exporter=${exporterISO2}&importer=${importerISO2}&product=${hs6}):
   - Dazio MFN applicato (Applied MFN), dazio bound (WTO ceiling)
   - Dazi preferenziali per accordi specifici (nome accordo + aliquota)
   - Other Duties and Charges (ODC): sovrattasse, tasse statistiche, diritti di licenza
   - Trade remedies attivi: anti-dumping, misure compensative, salvaguardie

3. **WTO TTD** (https://ttd.wto.org/en): profilo tariffario del paese, tariff actions recenti
4. **Trade Map** (https://trademap.org): flussi commerciali, top fornitori, trend
5. **ICE Italia** (https://www.ice.it): opportunità, fiere, guide paese per esportatori italiani

ISTRUZIONI CRITICHE PER I DAZI:
- Il dazio MFN è quello che paga chi NON ha accordo preferenziale.${isEUExporter ? `\n- L'${exporterName} è membro UE: verifica se ${importerName} ha un FTA con l'UE. Se sì, il dazio preferenziale è spesso 0% o ridotto.` : ''}${isEUImporter ? `\n- ${importerName} è membro UE: usa il TARIC (dazio comune UE). Verifica se ci sono accordi preferenziali con ${exporterName}.` : ''}
- DISTINGUI SEMPRE tra: dazio ad valorem (%), dazio specifico (€/kg), dazio misto (% + €/kg).
- Se il dazio è "specifico" (es. 5.1 EUR/100 kg), riportalo ESATTAMENTE così, NON convertirlo in %.
- Cerca ANCHE: tasse portuali, sovrattasse doganali, tasse di ispezione, tasse ambientali.

NON INVENTARE DATI. Se un dato non è trovato, scrivi esattamente "Non trovato su [nome fonte]".`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: "object",
        properties: {
          access2markets: {
            type: "object",
            properties: {
              dazio_convenzionale: { type: "string", description: "Dazio MFN/convenzionale: valore esatto con tipo (ad valorem %, specifico €/kg, misto)" },
              dazio_convenzionale_valore: { type: "number", description: "Valore numerico del dazio ad valorem (solo il numero %). Null se specifico." },
              dazio_convenzionale_tipo: { type: "string", description: "Tipo: 'ad_valorem', 'specifico', 'misto'. Es: 'specifico' se 5.1 EUR/100kg" },
              dazio_preferenziale: { type: "string", description: "Dazio preferenziale: valore + nome accordo FTA (es: '0% - EU-Japan EPA')" },
              dazio_preferenziale_valore: { type: "number", description: "Valore numerico dazio preferenziale %. Null se non esiste accordo." },
              accordo_commerciale: { type: "string", description: "Nome dell'accordo FTA/EPA se esiste (es: 'EU-Canada CETA', 'EU-Japan EPA')" },
              anti_dumping: { type: "string", description: "Dazio anti-dumping: valore e regolamento (es: '12.5% - Reg. EU 2020/1336')" },
              anti_dumping_valore: { type: "number", description: "Valore numerico anti-dumping %" },
              misure_compensative: { type: "string", description: "Misure compensative/salvaguardie se presenti" },
              iva_locale: { type: "string", description: "IVA/GST/VAT standard del paese importatore con nome locale (es: 'VAT 20%', 'GST 10%')" },
              iva_locale_valore: { type: "number", description: "Valore numerico IVA/GST %" },
              iva_ridotta: { type: "string", description: "Aliquota IVA ridotta se applicabile a questo prodotto" },
              altre_tasse_doganali: { type: "array", items: { type: "object", properties: { nome: { type: "string", description: "Nome tassa (es: 'Statistical Tax', 'Port Surcharge', 'Inspection Fee')" }, valore: { type: "string", description: "Valore (es: '1.5%', '€25 per spedizione')" }, tipo: { type: "string", description: "'percentuale' o 'fisso'" } } }, description: "Altre tasse/sovrattasse doganali (ODC)" },
              certificazioni_obbligatorie: { type: "array", items: { type: "string" }, description: "Lista COMPLETA certificazioni obbligatorie per questo HS" },
              standard_tecnici: { type: "array", items: { type: "string" }, description: "Standard tecnici/normativi richiesti (ISO, EN, locali)" },
              etichettatura: { type: "string", description: "Requisiti etichettatura obbligatori (lingue, informazioni, formati)" },
              documenti_doganali: { type: "array", items: { type: "string" }, description: "TUTTI i documenti richiesti per lo sdoganamento" },
              regole_origine: { type: "string", description: "Regole di origine per ottenere dazio preferenziale" },
              restrizioni: { type: "string", description: "Restrizioni, quote, embargo, licenze import" },
              contingenti_tariffari: { type: "string", description: "Contingenti tariffari (TRQ) se applicabili" },
              nota_landed_cost: { type: "string", description: "Calcolo indicativo: su €10.000 FOB, quanto si paga IN TOTALE di dazi+tasse (escluso trasporto)" },
              fonte: { type: "string" },
              url_consultazione: { type: "string", description: "URL diretto Access2Markets per questo prodotto/paese" }
            }
          },
          trade_map: {
            type: "object",
            properties: {
              import_totale_usd: { type: "string", description: "Import totale del paese per questo HS in USD" },
              export_italia_usd: { type: "string", description: "Export Italia verso questo paese per questo HS" },
              crescita_import_5y: { type: "string", description: "Crescita % import ultimi 5 anni" },
              top_esportatori: { type: "array", items: { type: "object", properties: { paese: { type: "string" }, quota: { type: "string" }, valore_usd: { type: "string" } } }, description: "Top 5-10 esportatori verso questo mercato" },
              trend: { type: "string", description: "Trend crescita/decrescita ultimi anni con %" },
              prezzo_medio_import_usd_kg: { type: "string", description: "Prezzo medio all'import USD/kg se disponibile" },
              anno_dati: { type: "string" },
              fonte: { type: "string" }
            }
          },
          ice_italia: {
            type: "object",
            properties: {
              opportunita: { type: "string", description: "Opportunità specifiche segnalate da ICE" },
              fiere_rilevanti: { type: "array", items: { type: "string" }, description: "Fiere di settore REALI nel paese (nome + città + periodo)" },
              guide_paese: { type: "string", description: "Link guida ICE se esistente" },
              ufficio_ice_locale: { type: "string", description: "Sede ICE nel paese destinazione" },
              programmi_supporto: { type: "string", description: "Programmi/bandi ICE attivi per questo mercato" },
              fonte: { type: "string" }
            }
          },
          riepilogo_costi_export: {
            type: "object",
            properties: {
              dazio_totale_stimato: { type: "string", description: "Somma dazi (MFN o pref + anti-dumping + ODC) come % o valore" },
              iva_gst_totale: { type: "string", description: "IVA/GST applicabile" },
              costo_aggiuntivo_stimato: { type: "string", description: "Stima costi aggiuntivi (ispezioni, certificazioni, sdoganamento)" },
              esempio_10k_eur: { type: "string", description: "Su €10.000 FOB: totale stimato dazi+tasse in EUR (escluso trasporto)" },
              livello_complessita: { type: "string", description: "'facile' (UE/FTA), 'medio' (MFN standard), 'complesso' (dazi alti, certificazioni, quote)" },
              nota_per_imprenditore: { type: "string", description: "Spiegazione IN ITALIANO SEMPLICE per un imprenditore non esperto: cosa significa tutto questo per lui, quanto gli costa e cosa deve fare" }
            }
          },
          data_quality: {
            type: "object",
            properties: {
              fonti_consultate: { type: "array", items: { type: "string" } },
              affidabilita: { type: "string", enum: ["alta", "media", "bassa"] },
              dati_mancanti: { type: "array", items: { type: "string" }, description: "Lista specifica dei dati NON trovati" },
              note: { type: "string" }
            }
          }
        }
      }
    });
    console.log(`[LLM-Web] Enrichment completato per ${importerISO2}`);
    return result;
  } catch (e) {
    console.log(`[LLM-Web] Error: ${e.message}`);
    return null;
  }
}

// ===== SOURCE 9: Freightos Freight Rate Estimator (FREE, no API key) =====

async function fetchFreightosEstimate(originCity, originCountryISO2, destCity, destCountryISO2, weightKg, volumeCbm) {
  // Costruisci origin e destination come "City,Country"
  const originName = ISO2_TO_NAME[originCountryISO2] || originCountryISO2;
  const destName = ISO2_TO_NAME[destCountryISO2] || destCountryISO2;
  const origin = originCity ? `${originCity},${originName}` : originName;
  const dest = destCity ? `${destCity},${destName}` : destName;

  const weight = weightKg || 500; // default 500kg (mezza tonnellata)
  // Stima dimensioni cubiche da volume o default
  const side = volumeCbm ? Math.round(Math.cbrt(volumeCbm * 1e6)) : 80; // cm

  const url = `https://ship.freightos.com/api/shippingCalculator?loadtype=boxes&weight=${weight}&width=${side}&length=${side}&height=${side}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&quantity=1`;
  console.log(`[Freightos] Fetching estimate: ${origin} -> ${dest}, ${weight}kg`);

  try {
    const resp = await fetch(url, { 
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000) 
    });
    if (!resp.ok) {
      console.log(`[Freightos] HTTP ${resp.status}`);
      return null;
    }

    const json = await resp.json();
    const rates = json?.response?.estimatedFreightRates;
    if (!rates) { console.log('[Freightos] No rates in response'); return null; }

    // Può essere un singolo oggetto o array
    const modes = Array.isArray(rates.mode) ? rates.mode : (rates.mode ? [rates.mode] : []);
    if (modes.length === 0) return null;

    const results = modes.map(m => {
      const minPrice = parseFloat(m?.price?.min?.moneyAmount?.amount || 0);
      const maxPrice = parseFloat(m?.price?.max?.moneyAmount?.amount || 0);
      const currency = m?.price?.min?.moneyAmount?.currency || 'USD';
      const minTransit = parseInt(m?.transitTimes?.min || 0);
      const maxTransit = parseInt(m?.transitTimes?.max || 0);
      const mode = m?.mode || 'unknown';

      return {
        modalita: mode,
        prezzo_min: minPrice,
        prezzo_max: maxPrice,
        prezzo_medio: Math.round((minPrice + maxPrice) / 2),
        valuta: currency,
        transito_giorni_min: minTransit,
        transito_giorni_max: maxTransit
      };
    }).filter(r => r.prezzo_min > 0 || r.prezzo_max > 0);

    if (results.length === 0) return null;

    // Preferisci LTL/FCL/LCL per B2B, non express (più costoso)
    const preferredOrder = ['FCL', 'LCL', 'LTL', 'express', 'air'];
    const sorted = [...results].sort((a, b) => {
      const aIdx = preferredOrder.findIndex(m => a.modalita.toLowerCase().includes(m.toLowerCase()));
      const bIdx = preferredOrder.findIndex(m => b.modalita.toLowerCase().includes(m.toLowerCase()));
      return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
    });

    return {
      origine: origin,
      destinazione: dest,
      peso_kg: weight,
      stime: results,
      stima_migliore: sorted[0],
      fonte: 'Freightos Freight Estimator',
      nota: 'Stime indicative basate su tariffe reali di mercato'
    };
  } catch (e) {
    console.log(`[Freightos] Error: ${e.message}`);
    return null;
  }
}

// ===== SOURCE 10: LLM B2B Price Search (Alibaba/Amazon/TradeMap) =====

async function fetchLLMPriceSearch(base44, hsCode, productDesc, destCountryISO2, destCountryName) {
  const hs6 = String(hsCode).replace(/\D/g, '').substring(0, 6);
  const hs4 = hs6.substring(0, 4);

  console.log(`[LLM-Prices] Searching B2B prices for HS${hs6} in ${destCountryName}`);

  try {
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Find REAL B2B/wholesale prices for: HS ${hs6}${productDesc ? ` (${productDesc})` : ''}. Search Alibaba.com, Made-in-China.com, GlobalSources. Report exact prices found with source, product name, price, seller. Do NOT invent prices.`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: "object",
        properties: {
          prezzi_b2b: {
            type: "array",
            items: {
              type: "object",
              properties: {
                fonte: { type: "string", description: "Nome sito (Alibaba, Made-in-China, ecc.)" },
                prodotto: { type: "string", description: "Nome/descrizione del prodotto trovato" },
                prezzo: { type: "string", description: "Prezzo come appare (es. $2.50-5.00/piece)" },
                prezzo_min_usd: { type: "number", description: "Prezzo minimo in USD (se convertibile)" },
                prezzo_max_usd: { type: "number", description: "Prezzo massimo in USD" },
                unita: { type: "string", description: "Unità di misura (piece, kg, ton, set)" },
                tipo_prezzo: { type: "string", enum: ["FOB", "CIF", "EXW", "retail", "wholesale", "altro"], description: "Tipo di prezzo" },
                moq: { type: "string", description: "Minimum Order Quantity se indicata" },
                venditore: { type: "string", description: "Nome venditore/azienda" }
              }
            }
          },
          prezzi_retail: {
            type: "array",
            items: {
              type: "object",
              properties: {
                fonte: { type: "string", description: "Nome sito (Amazon, eBay, ecc.)" },
                prodotto: { type: "string", description: "Nome prodotto" },
                prezzo: { type: "string", description: "Prezzo come appare" },
                prezzo_usd: { type: "number", description: "Prezzo in USD" },
                valuta_originale: { type: "string", description: "Valuta originale se non USD" },
                url: { type: "string", description: "URL o riferimento" }
              }
            }
          },
          riepilogo: {
            type: "object",
            properties: {
              range_fob_usd: { type: "string", description: "Range FOB medio trovato (es. $2.50-8.00/kg)" },
              range_retail_usd: { type: "string", description: "Range retail medio trovato" },
              num_fonti: { type: "number", description: "Numero fonti consultate con risultati" },
              affidabilita: { type: "string", enum: ["alta", "media", "bassa"], description: "Affidabilità prezzi trovati" },
              note: { type: "string" }
            }
          }
        }
      }
    });
    console.log(`[LLM-Prices] Price search completed for HS${hs6}`);
    return result;
  } catch (e) {
    console.log(`[LLM-Prices] Error: ${e.message}`);
    return null;
  }
}

// ===== SOURCE 8: Eurostat Comext API =====

async function fetchFromEurostat(reporterISO2, partnerISO2, hsCode, flowType, startYear, endYear) {
  // Eurostat Comext is only for EU member states as reporters
  if (!EU_MEMBERS.includes(reporterISO2) && !EU_MEMBERS.includes(partnerISO2)) return null;

  const hs4 = String(hsCode).replace(/\D/g, '').substring(0, 4);
  // Use CN8 (Combined Nomenclature) which starts with HS digits
  const flow = flowType === 'export' ? '2' : '1'; // 1=import, 2=export
  
  // Eurostat dataset: DS-045409 (EU trade since 1988 by HS2-4-6)
  // API endpoint: https://ec.europa.eu/eurostat/api/comext/dissemination/sdmx/2.1/data/DS-045409/...
  const reporter = reporterISO2;
  const partner = partnerISO2;

  const years = [];
  for (let y = startYear; y <= endYear; y++) years.push(y);

  console.log(`[Eurostat] Fetching: ${reporter}->${partner} HS${hs4} ${flowType} years=${years.join(',')}`);

  const results = [];
  for (const year of years) {
    // Use annual frequency (A), trade flow, reporter, partner, product
    const url = `https://ec.europa.eu/eurostat/api/comext/dissemination/sdmx/2.1/data/DS-045409/A.${flow}.${reporter}.${partner}.${hs4}?format=JSON&startPeriod=${year}&endPeriod=${year}`;
    
    try {
      const resp = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(12000) });
      if (!resp.ok) {
        // Try alternative dataset DS-059268 (monthly data aggregated)
        const url2 = `https://ec.europa.eu/eurostat/api/comext/dissemination/sdmx/2.1/data/DS-059268/M.${flow}.${reporter}.${partner}.${hs4}?format=JSON&startPeriod=${year}-01&endPeriod=${year}-12`;
        const resp2 = await fetch(url2, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(12000) });
        if (!resp2.ok) continue;
        const json2 = await resp2.json();
        const val2 = extractEurostatValue(json2);
        if (val2 !== null) {
          results.push({ year, trade_value_eur: Math.round(val2), source: 'eurostat', source_detail: 'DS-059268' });
        }
        continue;
      }
      const json = await resp.json();
      const val = extractEurostatValue(json);
      if (val !== null) {
        results.push({ year, trade_value_eur: Math.round(val), source: 'eurostat', source_detail: 'DS-045409' });
      }
    } catch (e) {
      console.log(`[Eurostat] Error year ${year}: ${e.message}`);
    }
  }

  return results.length > 0 ? results : null;
}

function extractEurostatValue(json) {
  try {
    // SDMX-JSON format
    const observations = json?.dataSets?.[0]?.observations || json?.dataSets?.[0]?.series;
    if (!observations) {
      // Try flat observations
      const obs = json?.value;
      if (obs && typeof obs === 'object') {
        let total = 0;
        for (const v of Object.values(obs)) {
          if (v != null && !isNaN(v)) total += v;
        }
        return total > 0 ? total : null;
      }
      return null;
    }

    let total = 0;
    for (const key of Object.keys(observations)) {
      const obs = observations[key];
      if (typeof obs === 'object' && obs.observations) {
        for (const v of Object.values(obs.observations)) {
          const val = Array.isArray(v) ? v[0] : v;
          if (val != null && !isNaN(val)) total += val;
        }
      } else if (Array.isArray(obs)) {
        if (obs[0] != null && !isNaN(obs[0])) total += obs[0];
      }
    }
    return total > 0 ? total : null;
  } catch (e) {
    return null;
  }
}

// ===== SOURCE 7: World Bank Macro =====

async function fetchWorldBankMacro(iso2) {
  const iso3 = ISO2_TO_ISO3[iso2];
  if (!iso3) return null;

  const indicators = {
    population: 'SP.POP.TOTL',
    gdp: 'NY.GDP.MKTP.CD',
    gdp_per_capita: 'NY.GDP.PCAP.CD',
    inflation: 'FP.CPI.TOTL.ZG',
    lpi: 'LP.LPI.OVRL.XQ',
    doing_business: 'IC.BUS.EASE.XQ',
    current_account: 'BN.CAB.XOKA.CD',
    exchange_rate: 'PA.NUS.FCRF'
  };

  const results = {};
  const promises = Object.entries(indicators).map(async ([key, code]) => {
    const url = `https://api.worldbank.org/v2/country/${iso3}/indicator/${code}?format=json&per_page=5&mrv=3`;
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!resp.ok) return;
      const json = await resp.json();
      const records = json?.[1];
      if (!Array.isArray(records)) return;
      for (const rec of records) {
        if (rec.value !== null) {
          results[key] = { value: rec.value, year: String(rec.date) };
          return;
        }
      }
    } catch (e) { /* skip */ }
  });

  await Promise.allSettled(promises);
  return Object.keys(results).length > 0 ? results : null;
}

// ===== DEDUPLICATION & MERGE =====

function deduplicateAndMerge(oecData, comtradeData, witsData, eurostatData) {
  const merged = {};

  // Layer 1: OEC
  if (oecData) {
    for (const d of oecData) {
      merged[d.year] = { ...d, sources: [{ source: 'oec', value_usd: d.trade_value_usd }] };
    }
  }

  // Layer 2: WITS (higher priority than OEC)
  if (witsData) {
    for (const d of witsData) {
      if (merged[d.year]) {
        merged[d.year].sources.push({ source: 'wits', value_usd: d.trade_value_usd });
        merged[d.year].trade_value_usd = d.trade_value_usd;
        merged[d.year].source = 'wits';
      } else {
        merged[d.year] = { ...d, sources: [{ source: 'wits', value_usd: d.trade_value_usd }] };
      }
    }
  }

  // Layer 3: Comtrade (highest priority for USD values)
  if (comtradeData) {
    for (const d of comtradeData) {
      if (merged[d.year]) {
        merged[d.year].sources.push({ source: 'comtrade', value_usd: d.trade_value_usd });
        const existing = merged[d.year].trade_value_usd;
        const diff = Math.abs(d.trade_value_usd - existing) / Math.max(existing, 1);
        merged[d.year].trade_value_usd = d.trade_value_usd;
        merged[d.year].source = 'comtrade';
        if (diff > 0.1) {
          merged[d.year].discrepancy = true;
          merged[d.year].alt_value_usd = existing;
        }
        if (d.net_weight_kg) merged[d.year].net_weight_kg = d.net_weight_kg;
        if (d.quantity) merged[d.year].quantity = d.quantity;
        if (d.quantity_unit) merged[d.year].quantity_unit = d.quantity_unit;
      } else {
        merged[d.year] = { ...d, sources: [{ source: 'comtrade', value_usd: d.trade_value_usd }] };
      }
    }
  }

  // Layer 4: Eurostat (EUR values, complementary — don't override USD)
  if (eurostatData) {
    for (const d of eurostatData) {
      if (merged[d.year]) {
        merged[d.year].trade_value_eur_eurostat = d.trade_value_eur;
        merged[d.year].sources.push({ source: 'eurostat', value_eur: d.trade_value_eur });
      } else {
        // Only Eurostat has data for this year — store EUR value
        merged[d.year] = {
          year: d.year, trade_value_usd: null, trade_value_eur_eurostat: d.trade_value_eur,
          source: 'eurostat', source_detail: d.source_detail,
          sources: [{ source: 'eurostat', value_eur: d.trade_value_eur }]
        };
      }
    }
  }

  return Object.values(merged).sort((a, b) => a.year - b.year);
}

// ===== MAIN HANDLER =====

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await req.json();
  const {
    reporter_code = 'IT',
    partner_codes = [],
    hs_code,
    flow_type = 'export',
    period_years = 5,
    skip_cache = false,
    include_tariffs = true,
    include_eurostat = true,
    include_freight = true,
    include_prices = true,
    origin_city = null,
    dest_cities = {},
    product_description = null,
    shipment_weight_kg = null
  } = payload;

  if (!hs_code || partner_codes.length === 0) {
    return Response.json({ error: 'hs_code and partner_codes are required' }, { status: 400 });
  }

  const currentYear = new Date().getFullYear();
  const startYear = currentYear - period_years;
  const endYear = currentYear - 1;
  const timestamp = new Date().toISOString();
  const reporterISO3 = ISO2_TO_ISO3[reporter_code] || reporter_code;

  const results = {};
  const errors = [];
  const sourceStatus = { oec: 'pending', comtrade: 'pending', wits: 'pending', eurostat: 'pending', wits_tariff: 'pending', wto_tariff: 'pending', llm_web: 'pending', freightos: 'pending', llm_prices: 'pending' };
  const include_web_enrichment = payload.include_web_enrichment !== false; // default true

  // Process each partner
  const partnerPromises = partner_codes.map(async (partnerCode) => {
    const cacheKey = `${reporter_code}|${partnerCode}|${hs_code}|${startYear}-${endYear}|${flow_type}`;
    const partnerISO3 = ISO2_TO_ISO3[partnerCode] || partnerCode;

    // Check cache first
    if (!skip_cache) {
      try {
        const cached = await base44.entities.TradeDataCache.filter({ cache_key: cacheKey });
        if (cached && cached.length > 0) {
          const freshEnough = cached.some(c => {
            const retrievedAt = new Date(c.retrieved_at);
            return (Date.now() - retrievedAt.getTime()) / (1000 * 60 * 60 * 24) < 7;
          });
          if (freshEnough) {
            console.log(`[Cache] Hit for ${cacheKey}`);
            const serieData = cached.filter(c => !c.is_stale).map(c => ({
              year: parseInt(c.period), trade_value_usd: c.trade_value_usd,
              net_weight_kg: c.net_weight_kg, quantity: c.quantity, quantity_unit: c.quantity_unit,
              price_per_kg_usd: c.price_per_kg_usd, source: c.source, source_detail: c.source_detail, from_cache: true
            })).sort((a, b) => a.year - b.year);
            return { partnerCode, data: serieData, from_cache: true, tariffs: null, top_suppliers: null };
          }
        }
      } catch (e) { console.log(`[Cache] Error: ${e.message}`); }
    }

    // Fetch from ALL sources in parallel
    const fetchPromises = [
      fetchFromOEC(reporter_code, partnerCode, hs_code, flow_type, startYear, endYear).catch(e => { console.log(`[OEC] Error: ${e.message}`); return null; }),
      fetchFromComtradePublic(reporter_code, partnerCode, hs_code, flow_type, startYear, endYear).catch(e => { console.log(`[Comtrade] Error: ${e.message}`); return null; }),
      fetchFromComtradePremium(reporter_code, partnerCode, hs_code, flow_type, startYear, endYear).catch(e => null),
      fetchFromWITS(reporterISO3, partnerISO3, hs_code, flow_type, startYear, endYear).catch(e => { console.log(`[WITS] Error: ${e.message}`); return null; }),
    ];

    // Add Eurostat if applicable (EU reporter or EU partner)
    if (include_eurostat) {
      fetchPromises.push(
        fetchFromEurostat(reporter_code, partnerCode, hs_code, flow_type, startYear, endYear).catch(e => { console.log(`[Eurostat] Error: ${e.message}`); return null; })
      );
    } else {
      fetchPromises.push(Promise.resolve(null));
    }

    // Add tariff fetch
    if (include_tariffs) {
      fetchPromises.push(
        fetchWITSTariffs(partnerISO3, hs_code, endYear).catch(e => { console.log(`[WITS-Tariff] Error: ${e.message}`); return null; })
      );
    } else {
      fetchPromises.push(Promise.resolve(null));
    }

    // Add top suppliers fetch (who exports to this market?)
    fetchPromises.push(
      fetchComtradeTopSuppliers(partnerCode, hs_code, endYear).catch(e => { console.log(`[TopSuppliers] Error: ${e.message}`); return null; })
    );

    // Add WTO tariff fetch
    if (include_tariffs) {
      fetchPromises.push(
        fetchWTOTariffs(partnerISO3, hs_code, endYear).catch(e => { console.log(`[WTO-TS] Error: ${e.message}`); return null; })
      );
    } else {
      fetchPromises.push(Promise.resolve(null));
    }

    // Add LLM Web Enrichment (Access2Markets, Trade Map, ICE)
    const partnerName = ISO2_TO_NAME[partnerCode] || partnerCode;
    if (include_web_enrichment) {
      fetchPromises.push(
        fetchLLMWebEnrichment(base44, partnerCode, partnerName, hs_code, reporter_code).catch(e => { console.log(`[LLM-Web] Error: ${e.message}`); return null; })
      );
    } else {
      fetchPromises.push(Promise.resolve(null));
    }

    // Add Freightos freight estimate
    if (include_freight) {
      const destCity = dest_cities[partnerCode] || null;
      const reporterName = ISO2_TO_NAME[reporter_code] || reporter_code;
      fetchPromises.push(
        fetchFreightosEstimate(origin_city, reporter_code, destCity, partnerCode, shipment_weight_kg, null).catch(e => { console.log(`[Freightos] Error: ${e.message}`); return null; })
      );
    } else {
      fetchPromises.push(Promise.resolve(null));
    }

    // Add LLM B2B Price Search
    if (include_prices) {
      fetchPromises.push(
        fetchLLMPriceSearch(base44, hs_code, product_description, partnerCode, partnerName).catch(e => { console.log(`[LLM-Prices] Error: ${e.message}`); return null; })
      );
    } else {
      fetchPromises.push(Promise.resolve(null));
    }

    const [oecData, comtradePublicData, comtradePremiumData, witsData, eurostatData, tariffData, topSuppliersData, wtoTariffData, llmWebData, freightData, priceData] = await Promise.allSettled(fetchPromises).then(r => r.map(p => p.status === 'fulfilled' ? p.value : null));

    // Update source status
    if (oecData) sourceStatus.oec = 'ok';
    const comtradeData = comtradePremiumData || comtradePublicData;
    if (comtradePremiumData) sourceStatus.comtrade = 'ok (premium)';
    else if (comtradePublicData) sourceStatus.comtrade = 'ok (public)';
    if (witsData) sourceStatus.wits = 'ok';
    if (eurostatData) sourceStatus.eurostat = 'ok';
    if (tariffData) sourceStatus.wits_tariff = 'ok';
    if (wtoTariffData) sourceStatus.wto_tariff = 'ok';
    if (llmWebData) sourceStatus.llm_web = 'ok';
    if (freightData) sourceStatus.freightos = 'ok';
    if (priceData) sourceStatus.llm_prices = 'ok';

    // Merge all sources
    const merged = deduplicateAndMerge(oecData, comtradeData, witsData, eurostatData);

    // Calculate price per kg
    for (const d of merged) {
      if (d.net_weight_kg && d.net_weight_kg > 0 && d.trade_value_usd > 0) {
        d.price_per_kg_usd = Math.round((d.trade_value_usd / d.net_weight_kg) * 100) / 100;
      }
    }

    // Save to cache (don't await)
    try {
      const cacheRecords = merged.filter(d => d.trade_value_usd != null).map(d => ({
        cache_key: `${reporter_code}|${partnerCode}|${hs_code}|${d.year}|${flow_type}`,
        reporter_code, partner_code: partnerCode, hs_code,
        hs_depth: String(hs_code).replace(/\D/g, '').length,
        period: String(d.year), flow_type,
        trade_value_usd: d.trade_value_usd,
        net_weight_kg: d.net_weight_kg || null,
        quantity: d.quantity || null, quantity_unit: d.quantity_unit || null,
        price_per_kg_usd: d.price_per_kg_usd || null,
        source: d.source, source_detail: d.source_detail || null,
        retrieved_at: timestamp, is_stale: false
      }));
      if (cacheRecords.length > 0) {
        await base44.asServiceRole.entities.TradeDataCache.bulkCreate(cacheRecords);
      }
    } catch (e) { console.log(`[Cache] Save error: ${e.message}`); }

    // Merge tariff data: prefer WTO if available, fallback to WITS
    let mergedTariffs = tariffData || null;
    if (wtoTariffData) {
      mergedTariffs = mergedTariffs || {};
      if (wtoTariffData.mfn_applied) mergedTariffs.dazio_mfn_wto = wtoTariffData.mfn_applied;
      if (wtoTariffData.mfn_bound) mergedTariffs.dazio_bound_wto = wtoTariffData.mfn_bound;
      mergedTariffs.fonte_wto = wtoTariffData.fonte;
    }

    return { partnerCode, data: merged, from_cache: false, tariffs: mergedTariffs, top_suppliers: topSuppliersData, web_enrichment: llmWebData || null, freight: freightData || null, market_prices: priceData || null };
  });

  const partnerResults = await Promise.allSettled(partnerPromises);

  for (const pr of partnerResults) {
    if (pr.status === 'fulfilled' && pr.value) {
      const v = pr.value;
      results[v.partnerCode] = {
        serie_storica: v.data,
        from_cache: v.from_cache,
        records_count: v.data.length,
        tariffs: v.tariffs,
        top_suppliers: v.top_suppliers,
        web_enrichment: v.web_enrichment || null,
        freight: v.freight || null,
        market_prices: v.market_prices || null
      };
    } else if (pr.status === 'rejected') {
      errors.push(`Partner error: ${pr.reason}`);
    }
  }

  // Fetch macro data for all partners
  const macroPromises = partner_codes.map(async (code) => {
    const macro = await fetchWorldBankMacro(code);
    return { code, macro };
  });
  const macroResults = await Promise.allSettled(macroPromises);
  const macroData = {};
  for (const mr of macroResults) {
    if (mr.status === 'fulfilled' && mr.value?.macro) {
      macroData[mr.value.code] = mr.value.macro;
    }
  }

  return Response.json({
    success: true,
    reporter: reporter_code,
    hs_code,
    flow_type,
    period: `${startYear}-${endYear}`,
    partners: results,
    macro_data: macroData,
    source_status: sourceStatus,
    errors: errors.length > 0 ? errors : null,
    timestamp
  });
});