/**
 * MOTORE DI CALCOLO FISCALE DETERMINISTICO
 * ==========================================
 * Logica fedele alla normativa fiscale italiana 2025-2026 per ogni tipo di società.
 * 
 * Fonti normative:
 * - IRPEF: art. 11 TUIR, Legge di Bilancio 2025 (3 scaglioni: 23%, 33%, 43%)
 * - IRES: art. 75 TUIR, aliquota 24%
 * - IRAP: D.Lgs. 446/1997, aliquota base 3.9% (variabile per regione)
 * - INPS Artigiani/Commercianti: circ. INPS n. 19/2025
 * - INPS Gestione Separata: circ. INPS n. 27/2025
 * - Forfettario: L. 190/2014, commi 54-89
 * - Dividendi: art. 27 DPR 600/73, ritenuta 26% (qualificati post 2018)
 * - Cooperative: art. 12 L. 904/77, art. 1 co. 460-bis L. 311/2004
 */

// ═══════════════════════════════════════
// COSTANTI FISCALI 2025/2026
// ═══════════════════════════════════════

const IRPEF_SCAGLIONI = [
  { fino: 28000, aliquota: 0.23 },
  { fino: 50000, aliquota: 0.33 },
  { fino: Infinity, aliquota: 0.43 }
];

// Detrazione lavoro dipendente (no tax area) per redditi da compenso amm.re assimilati
const DETRAZIONE_LAVORO_DIP_MAX = 1955; // fino a 15000
const DETRAZIONE_LAVORO_DIP_MEDIA = 1190; // 15001-28000 (semplificata)

const IRES_ALIQUOTA = 0.24;
const IRAP_ALIQUOTA_BASE = 0.039;

// INPS Artigiani 2025 (IVS)
const INPS_ARTIGIANI = {
  aliquota_fino_52190: 0.24,
  aliquota_oltre_52190: 0.25,
  minimale: 18555, // reddito minimale 2025
  contributo_minimo_annuo: 4460, // approssimativo (24% su minimale)
  massimale: 91680,
};

// INPS Commercianti 2025 (IVS)
const INPS_COMMERCIANTI = {
  aliquota_fino_52190: 0.2448,
  aliquota_oltre_52190: 0.2548,
  minimale: 18555,
  contributo_minimo_annuo: 4549, // approssimativo
  massimale: 91680,
};

// INPS Gestione Separata 2026 (collaboratori/amministratori)
// Fonte: Circolare INPS n. 8 del 3 febbraio 2026
// IVS 33,00% + maternità/malattia/ANF 0,50% + maternità DM 12/07/2007 0,22% + DIS-COLL 1,31% = 35,03%
const INPS_GS = {
  aliquota_senza_altra_cassa: 0.3503, // 35.03% totale
  aliquota_con_altra_cassa: 0.24,
  aliquota_pensionati: 0.24,
  aliquota_amm_srl: 0.3503, // quota 2/3 a carico azienda (23.35%), 1/3 a carico amm. (11.68%)
  quota_azienda: 2 / 3,
  quota_amministratore: 1 / 3,
  massimale: 122295 // massimale 2026
};

// Forfettario
const FORFETTARIO = {
  aliquota_ordinaria: 0.15,
  aliquota_startup: 0.05,
  soglia_ricavi: 85000,
  soglia_flat_exit: 100000, // uscita immediata
  riduzione_inps_35: 0.35
};

// Dividendi
const RITENUTA_DIVIDENDI = 0.26; // 26% a titolo definitivo (per partecipazioni qualificate e non dal 2018)

// Addizionali IRPEF medie (semplificazione)
const ADDIZIONALE_REGIONALE_MEDIA = 0.0173; // media nazionale
const ADDIZIONALE_COMUNALE_MEDIA = 0.008;  // media nazionale


// ═══════════════════════════════════════
// FUNZIONI DI CALCOLO BASE
// ═══════════════════════════════════════

function calcolaIRPEF(redditoImponibile) {
  if (redditoImponibile <= 0) return { irpef: 0, scaglioni: [] };
  let imposta = 0;
  let precedente = 0;
  const scaglioni = [];
  
  for (const s of IRPEF_SCAGLIONI) {
    const imponibileScaglione = Math.min(redditoImponibile, s.fino) - precedente;
    if (imponibileScaglione <= 0) break;
    const tassa = imponibileScaglione * s.aliquota;
    imposta += tassa;
    scaglioni.push({
      da: precedente,
      a: Math.min(redditoImponibile, s.fino),
      aliquota: s.aliquota,
      imponibile: imponibileScaglione,
      imposta: tassa
    });
    precedente = s.fino;
  }
  
  return { irpef: Math.round(imposta), scaglioni };
}

function calcolaDetrazioniLavoroDip(reddito) {
  // Detrazione semplificata per compensi amministratore (assimilati a lavoro dipendente)
  if (reddito <= 0) return 0;
  if (reddito <= 15000) return DETRAZIONE_LAVORO_DIP_MAX;
  if (reddito <= 28000) return DETRAZIONE_LAVORO_DIP_MEDIA;
  if (reddito <= 50000) return Math.max(0, 1190 * ((50000 - reddito) / 22000));
  return 0;
}

function calcolaAddizionali(redditoImponibile) {
  if (redditoImponibile <= 0) return { regionale: 0, comunale: 0, totale: 0 };
  const regionale = Math.round(redditoImponibile * ADDIZIONALE_REGIONALE_MEDIA);
  const comunale = Math.round(redditoImponibile * ADDIZIONALE_COMUNALE_MEDIA);
  return { regionale, comunale, totale: regionale + comunale };
}

function calcolaINPSArtigianiCommercianti(reddito, tipo = 'commercianti', riduzione35 = false) {
  const params = tipo === 'artigiani' ? INPS_ARTIGIANI : INPS_COMMERCIANTI;
  const redditoEffettivo = Math.min(Math.max(reddito, 0), params.massimale);
  
  let contributo = 0;
  if (redditoEffettivo <= params.minimale) {
    // Contributo fisso sul minimale
    contributo = params.minimale * params.aliquota_fino_52190;
  } else if (redditoEffettivo <= 52190) {
    contributo = redditoEffettivo * params.aliquota_fino_52190;
  } else {
    contributo = 52190 * params.aliquota_fino_52190 + (redditoEffettivo - 52190) * params.aliquota_oltre_52190;
  }
  
  if (riduzione35) {
    contributo = contributo * (1 - FORFETTARIO.riduzione_inps_35);
  }
  
  return Math.round(contributo);
}

function calcolaINPSGestioneSeparata(compenso, haAltraCassa = false) {
  if (compenso <= 0) return { totale: 0, quotaAzienda: 0, quotaAmministratore: 0 };
  const base = Math.min(compenso, INPS_GS.massimale);
  const aliquota = haAltraCassa ? INPS_GS.aliquota_con_altra_cassa : INPS_GS.aliquota_amm_srl;
  const totale = Math.round(base * aliquota);
  const quotaAzienda = Math.round(totale * INPS_GS.quota_azienda);
  const quotaAmministratore = totale - quotaAzienda;
  return { totale, quotaAzienda, quotaAmministratore, aliquota };
}


// ═══════════════════════════════════════
// CALCOLO PER TIPO SOCIETÀ
// ═══════════════════════════════════════

/**
 * SRL / SRLU - Società a responsabilità limitata
 * Tassazione: IRES 24% + IRAP 3.9% sull'utile (val. produzione per IRAP)
 * Compenso amm.: IRPEF + addizionali + INPS GS (2/3 azienda, 1/3 amm.)
 * Dividendi: ritenuta 26%
 * La quota INPS GS a carico azienda è costo deducibile.
 */
function calcolaSRL(params) {
  const { fatturato, costiPerc, compensoAmm, percDividendi } = params;
  const costiOperativi = Math.round(fatturato * (costiPerc / 100));
  
  // INPS gestione separata su compenso: quota a carico azienda è costo per la società
  const inpsGS = calcolaINPSGestioneSeparata(compensoAmm, false);
  
  // Costo totale del compenso per la società = compenso lordo + quota INPS azienda
  const costoCompensoPerSocieta = compensoAmm + inpsGS.quotaAzienda;
  
  // Valore della produzione IRAP = fatturato - costi (NO compenso amm., NO INPS -- IRAP ha base diversa)
  // Base IRAP = differenza A-B bilancio (semplificato: fatturato - costi materie - servizi, ESCLUDE costo personale)
  const baseIRAP = Math.max(0, fatturato - costiOperativi);
  const irap = Math.round(baseIRAP * IRAP_ALIQUOTA_BASE);
  
  // Utile ante imposte = fatturato - costi - compenso - quota INPS azienda
  const utileAnteImposte = Math.max(0, fatturato - costiOperativi - costoCompensoPerSocieta);
  
  // IRES su utile
  const ires = Math.round(utileAnteImposte * IRES_ALIQUOTA);
  
  // Utile netto società
  const utileNetto = Math.max(0, utileAnteImposte - ires - irap);
  
  // --- Tassazione compenso amministratore ---
  const { irpef: irpefLorda, scaglioni } = calcolaIRPEF(compensoAmm);
  const detrazioni = calcolaDetrazioniLavoroDip(compensoAmm);
  const irpefNetta = Math.max(0, irpefLorda - detrazioni);
  const addizionali = calcolaAddizionali(compensoAmm);
  const totaleIrpefAmm = irpefNetta + addizionali.totale;
  
  // Netto in tasca da compenso = lordo - IRPEF - addizionali - quota INPS amm.
  const nettoCompenso = Math.max(0, compensoAmm - totaleIrpefAmm - inpsGS.quotaAmministratore);
  
  // --- Dividendi ---
  const dividendiLordi = Math.round(utileNetto * (percDividendi / 100));
  const ritenutaDividendi = Math.round(dividendiLordi * RITENUTA_DIVIDENDI);
  const dividendiNetti = dividendiLordi - ritenutaDividendi;
  const utileRitenuto = utileNetto - dividendiLordi;
  
  // --- Totali ---
  const totaleTasseSocieta = ires + irap;
  const totaleTasseSocio = totaleIrpefAmm + inpsGS.quotaAmministratore + ritenutaDividendi;
  const totaleTasseComplessivo = totaleTasseSocieta + inpsGS.quotaAzienda + totaleTasseSocio;
  const inTascaSocio = nettoCompenso + dividendiNetti;
  const pressioneFiscale = fatturato > 0 ? (totaleTasseComplessivo / fatturato) * 100 : 0;
  
  return {
    tipo: 'capitale',
    forma: params.forma || 'SRL',
    fatturato, costiOperativi, compensoAmm,
    costoCompensoPerSocieta,
    baseIRAP, irap,
    utileAnteImposte, ires, utileNetto,
    // Compenso
    irpefLorda, detrazioni, irpefNetta: irpefNetta, addizionali,
    totaleIrpefAmm, inpsGS, nettoCompenso,
    // Dividendi
    dividendiLordi, ritenutaDividendi, dividendiNetti, utileRitenuto,
    // Totali
    totaleTasseSocieta, totaleTasseSocio, totaleTasseComplessivo,
    inTascaSocio, pressioneFiscale,
    // Alias retrocompatibilità
    costi: costiOperativi, utile: utileAnteImposte, irpefAmm: totaleIrpefAmm,
    inpsAmm: inpsGS.totale, nettoAmm: nettoCompenso,
    impostaDividendi: ritenutaDividendi, totaleTasse: totaleTasseComplessivo,
  };
}

/**
 * SPA - Società per azioni
 * Identica a SRL per tassazione (IRES+IRAP), ma:
 * - Obbligo consiglio di amministrazione → più compensi
 * - Collegio sindacale obbligatorio → costo aggiuntivo
 * - Stesso trattamento fiscale dividendi
 */
function calcolaSPA(params) {
  // Stessa logica SRL
  return { ...calcolaSRL(params), forma: 'SPA' };
}

/**
 * SAPA - Società in accomandita per azioni
 * Ibrida: tassazione della società come SPA (IRES+IRAP)
 * Accomandatari: responsabilità illimitata, possono essere amministratori
 * Accomandanti: solo capitale, dividendi tassati 26%
 */
function calcolaSAPA(params) {
  return { ...calcolaSRL(params), forma: 'SAPA' };
}

/**
 * Ditta Individuale - Impresa individuale in contabilità ordinaria/semplificata
 * Tassazione per trasparenza: IRPEF progressiva + addizionali + IRAP + INPS IVS
 * IRAP: dovuta se c'è autonoma organizzazione (dipendenti, beni strumentali rilevanti)
 * INPS: Artigiani o Commercianti in base ad ATECO, con minimale
 */
function calcolaDittaIndividuale(params) {
  const { fatturato, costiPerc, gestioneINPS = 'commercianti', haIRAP = true, riduzione35 = false } = params;
  const costiOperativi = Math.round(fatturato * (costiPerc / 100));
  
  // Reddito d'impresa = fatturato - costi
  let redditoLordo = Math.max(0, fatturato - costiOperativi);
  
  // INPS IVS artigiani/commercianti (deducibile dal reddito IRPEF)
  const inps = calcolaINPSArtigianiCommercianti(redditoLordo, gestioneINPS, riduzione35);
  
  // Reddito imponibile IRPEF = reddito - contributi INPS (deducibili)
  const redditoImponibile = Math.max(0, redditoLordo - inps);
  
  // IRPEF
  const { irpef: irpefLorda, scaglioni } = calcolaIRPEF(redditoImponibile);
  // Detrazioni lavoro autonomo/impresa (ridotte)
  const irpefNetta = irpefLorda; // Le detrazioni impresa sono molto basse, semplifico
  const addizionali = calcolaAddizionali(redditoImponibile);
  const totaleIRPEF = irpefNetta + addizionali.totale;
  
  // IRAP (se dovuta)
  const baseIRAP = Math.max(0, fatturato - costiOperativi);
  const irap = haIRAP ? Math.round(baseIRAP * IRAP_ALIQUOTA_BASE) : 0;
  
  const totaleTasse = totaleIRPEF + inps + irap;
  const netto = Math.max(0, fatturato - costiOperativi - totaleTasse);
  const pressioneFiscale = fatturato > 0 ? (totaleTasse / fatturato) * 100 : 0;
  
  return {
    tipo: 'personale',
    forma: 'Ditta individuale',
    fatturato, costiOperativi, costi: costiOperativi,
    redditoLordo, redditoImponibile, inps,
    irpefLorda, irpefNetta, addizionali, totaleIRPEF,
    irap, baseIRAP, haIRAP,
    totaleTasse, inTascaSocio: netto, pressioneFiscale,
    scaglioni, gestioneINPS,
    // Alias
    irpefAmm: totaleIRPEF, inpsAmm: inps, utile: redditoLordo,
    compensoAmm: 0, nettoAmm: 0, ires: 0,
    dividendiLordi: 0, impostaDividendi: 0, dividendiNetti: 0, utileRitenuto: 0,
    utileNetto: 0,
  };
}

/**
 * SNC - Società in nome collettivo
 * Tassazione per trasparenza: la società NON paga IRES
 * Il reddito è imputato ai soci in proporzione alle quote → IRPEF personale
 * IRAP: sì, a carico della società
 * INPS: ogni socio paga IVS come artigiano/commerciante sulla propria quota
 * Semplificazione: calcoliamo per 1 socio (quota 50% di default)
 */
function calcolaSNC(params) {
  const { fatturato, costiPerc, numSoci = 2, quotaSocio = null, gestioneINPS = 'commercianti' } = params;
  const costiOperativi = Math.round(fatturato * (costiPerc / 100));
  const redditoSocieta = Math.max(0, fatturato - costiOperativi);
  
  // IRAP sulla società
  const irap = Math.round(redditoSocieta * IRAP_ALIQUOTA_BASE);
  
  // Quota reddito per socio (il reddito NON si riduce dell'IRAP per trasparenza)
  const quota = quotaSocio || (1 / numSoci);
  const redditoSocio = Math.round(redditoSocieta * quota);
  
  // INPS IVS per socio
  const inpsSocio = calcolaINPSArtigianiCommercianti(redditoSocio, gestioneINPS);
  
  // IRPEF su reddito socio (dedotti contributi INPS)
  const redditoImponibileSocio = Math.max(0, redditoSocio - inpsSocio);
  const { irpef: irpefLorda, scaglioni } = calcolaIRPEF(redditoImponibileSocio);
  const addizionali = calcolaAddizionali(redditoImponibileSocio);
  const totaleIRPEFSocio = irpefLorda + addizionali.totale;
  
  // Netto per socio
  const nettoSocio = Math.max(0, redditoSocio - totaleIRPEFSocio - inpsSocio);
  
  // Totale tasse (prospettiva socio singolo + quota IRAP)
  const quotaIRAP = Math.round(irap * quota);
  const totaleTasseSocio = totaleIRPEFSocio + inpsSocio + quotaIRAP;
  const pressioneFiscale = fatturato > 0 ? ((totaleTasseSocio / quota) / fatturato) * 100 : 0;
  
  return {
    tipo: 'personale',
    forma: 'SNC',
    fatturato, costiOperativi, costi: costiOperativi,
    redditoSocieta, irap, numSoci, quota,
    redditoSocio, inpsSocio, redditoImponibileSocio,
    irpefLorda, addizionali, totaleIRPEFSocio,
    nettoSocio, quotaIRAP, totaleTasseSocio,
    pressioneFiscale,
    // Netto "in tasca" = netto del singolo socio
    inTascaSocio: nettoSocio,
    totaleTasse: totaleTasseSocio,
    // Alias
    irpefAmm: totaleIRPEFSocio, inpsAmm: inpsSocio, utile: redditoSocieta,
    compensoAmm: 0, nettoAmm: 0, ires: 0,
    dividendiLordi: 0, impostaDividendi: 0, dividendiNetti: 0, utileRitenuto: 0,
    utileNetto: 0, inps: inpsSocio, scaglioni, gestioneINPS,
  };
}

/**
 * SAS - Società in accomandita semplice
 * Come SNC per trasparenza ma con 2 categorie di soci:
 * - Accomandatari: resp. illimitata, pagano INPS IVS
 * - Accomandanti: resp. limitata, NON pagano INPS (reddito di capitale o partecipazione)
 * Semplificazione: calcoliamo per accomandatario
 */
function calcolaSAS(params) {
  const { fatturato, costiPerc, numSoci = 2, quotaAccomandatario = 0.5,
    gestioneINPS = 'commercianti', tipoSocio = 'accomandatario' } = params;
  const costiOperativi = Math.round(fatturato * (costiPerc / 100));
  const redditoSocieta = Math.max(0, fatturato - costiOperativi);
  
  const irap = Math.round(redditoSocieta * IRAP_ALIQUOTA_BASE);
  
  const quota = quotaAccomandatario;
  const redditoSocio = Math.round(redditoSocieta * quota);
  
  if (tipoSocio === 'accomandatario') {
    // Come SNC: IRPEF + INPS IVS
    const inpsSocio = calcolaINPSArtigianiCommercianti(redditoSocio, gestioneINPS);
    const redditoImponibile = Math.max(0, redditoSocio - inpsSocio);
    const { irpef, scaglioni } = calcolaIRPEF(redditoImponibile);
    const addizionali = calcolaAddizionali(redditoImponibile);
    const totIRPEF = irpef + addizionali.totale;
    const quotaIRAP = Math.round(irap * quota);
    const netto = Math.max(0, redditoSocio - totIRPEF - inpsSocio);
    const totaleTasse = totIRPEF + inpsSocio + quotaIRAP;
    
    return {
      tipo: 'personale', forma: 'SAS', tipoSocio: 'accomandatario',
      fatturato, costiOperativi, costi: costiOperativi,
      redditoSocieta, irap, numSoci, quota,
      redditoSocio, inpsSocio, redditoImponibile,
      irpefLorda: irpef, addizionali, totaleIRPEFSocio: totIRPEF,
      nettoSocio: netto, quotaIRAP, totaleTasseSocio: totaleTasse,
      pressioneFiscale: fatturato > 0 ? ((totaleTasse / quota) / fatturato) * 100 : 0,
      inTascaSocio: netto, totaleTasse,
      irpefAmm: totIRPEF, inpsAmm: inpsSocio, utile: redditoSocieta,
      compensoAmm: 0, nettoAmm: 0, ires: 0,
      dividendiLordi: 0, impostaDividendi: 0, dividendiNetti: 0, utileRitenuto: 0,
      utileNetto: 0, inps: inpsSocio, scaglioni, gestioneINPS,
    };
  }
  
  // Accomandante: solo IRPEF (no INPS IVS)
  const { irpef, scaglioni } = calcolaIRPEF(redditoSocio);
  const addizionali = calcolaAddizionali(redditoSocio);
  const totIRPEF = irpef + addizionali.totale;
  const quotaIRAP = Math.round(irap * quota);
  const netto = Math.max(0, redditoSocio - totIRPEF);
  
  return {
    tipo: 'personale', forma: 'SAS', tipoSocio: 'accomandante',
    fatturato, costiOperativi, costi: costiOperativi,
    redditoSocieta, irap, numSoci, quota,
    redditoSocio, inpsSocio: 0, redditoImponibile: redditoSocio,
    irpefLorda: irpef, addizionali, totaleIRPEFSocio: totIRPEF,
    nettoSocio: netto, quotaIRAP, totaleTasseSocio: totIRPEF + quotaIRAP,
    pressioneFiscale: fatturato > 0 ? (((totIRPEF + quotaIRAP) / quota) / fatturato) * 100 : 0,
    inTascaSocio: netto, totaleTasse: totIRPEF + quotaIRAP,
    irpefAmm: totIRPEF, inpsAmm: 0, utile: redditoSocieta,
    compensoAmm: 0, nettoAmm: 0, ires: 0,
    dividendiLordi: 0, impostaDividendi: 0, dividendiNetti: 0, utileRitenuto: 0,
    utileNetto: 0, inps: 0, scaglioni, gestioneINPS: null,
  };
}

/**
 * SS - Società semplice
 * Tassazione per trasparenza come SNC
 * NON esercita attività commerciale → NIENTE IRAP, NIENTE INPS commercianti
 * I soci pagano IRPEF sulla quota di reddito
 * Se i soci sono professionisti → eventuale cassa privata (non simulabile genericamente)
 */
function calcolaSS(params) {
  const { fatturato, costiPerc, numSoci = 2 } = params;
  const costiOperativi = Math.round(fatturato * (costiPerc / 100));
  const redditoSocieta = Math.max(0, fatturato - costiOperativi);
  
  const quota = 1 / numSoci;
  const redditoSocio = Math.round(redditoSocieta * quota);
  
  const { irpef, scaglioni } = calcolaIRPEF(redditoSocio);
  const addizionali = calcolaAddizionali(redditoSocio);
  const totIRPEF = irpef + addizionali.totale;
  const netto = Math.max(0, redditoSocio - totIRPEF);
  
  return {
    tipo: 'personale', forma: 'SS',
    fatturato, costiOperativi, costi: costiOperativi,
    redditoSocieta, irap: 0, numSoci, quota,
    redditoSocio, redditoImponibile: redditoSocio,
    irpefLorda: irpef, addizionali, totaleIRPEFSocio: totIRPEF,
    nettoSocio: netto, totaleTasseSocio: totIRPEF,
    pressioneFiscale: fatturato > 0 ? ((totIRPEF / quota) / fatturato) * 100 : 0,
    inTascaSocio: netto, totaleTasse: totIRPEF,
    irpefAmm: totIRPEF, inpsAmm: 0, utile: redditoSocieta,
    compensoAmm: 0, nettoAmm: 0, ires: 0, inps: 0,
    dividendiLordi: 0, impostaDividendi: 0, dividendiNetti: 0, utileRitenuto: 0,
    utileNetto: 0, scaglioni, gestioneINPS: null,
  };
}

/**
 * COOP - Società cooperativa
 * IRES: ridotta — solo sul 30% degli utili netti a riserva (art. 12 L. 904/77)
 * Mutualità prevalente: esenzione IRES su quota utili a riserva obbligatoria
 * IRAP: sì
 * Ristorni: tassati come reddito dei soci (IRPEF)
 * Semplificazione: calcoliamo IRES agevolata + IRAP
 */
function calcolaCOOP(params) {
  const { fatturato, costiPerc, mutualitaPrevalente = true, percRistorni = 0 } = params;
  const costiOperativi = Math.round(fatturato * (costiPerc / 100));
  const utileAnteImposte = Math.max(0, fatturato - costiOperativi);
  
  // IRAP
  const irap = Math.round(utileAnteImposte * IRAP_ALIQUOTA_BASE);
  
  // IRES agevolata cooperative
  // Riserva obbligatoria: 30% utili (non tassata se mutualità prevalente)
  // Quota soggetta IRES: tipicamente il restante 70% (o meno con mutualità prevalente)
  let baseIRES;
  if (mutualitaPrevalente) {
    // Solo 30% degli utili netti sono soggetti a IRES (grande agevolazione)
    baseIRES = Math.round(utileAnteImposte * 0.30);
  } else {
    // Senza mutualità prevalente: 70% soggetto
    baseIRES = Math.round(utileAnteImposte * 0.70);
  }
  const ires = Math.round(baseIRES * IRES_ALIQUOTA);
  
  // Ristorni ai soci (tassati IRPEF al socio, qui calcoliamo solo l'impatto sulla coop)
  const utileNetto = Math.max(0, utileAnteImposte - ires - irap);
  const ristorni = Math.round(utileNetto * (percRistorni / 100));
  const utileRitenuto = utileNetto - ristorni;
  
  const totaleTasse = ires + irap;
  const pressioneFiscale = fatturato > 0 ? (totaleTasse / fatturato) * 100 : 0;
  
  return {
    tipo: 'cooperativa', forma: 'COOP',
    fatturato, costiOperativi, costi: costiOperativi,
    utileAnteImposte, utile: utileAnteImposte,
    baseIRES, ires, irap,
    utileNetto, ristorni, utileRitenuto,
    mutualitaPrevalente, percRistorni,
    totaleTasse, pressioneFiscale,
    // In tasca = utile netto disponibile dopo imposte (non distribuito come dividendi)
    inTascaSocio: utileNetto,
    // Alias
    irpefAmm: 0, inpsAmm: 0, compensoAmm: 0, nettoAmm: 0,
    dividendiLordi: ristorni, impostaDividendi: 0, dividendiNetti: ristorni,
  };
}

/**
 * RF - Regime forfettario
 * Imposta sostitutiva 15% (o 5% startup) su reddito forfettario
 * Reddito = ricavi × coefficiente di redditività (in base ATECO)
 * INPS: artigiani/commercianti con possibile riduzione 35%
 * NO IRAP, NO addizionali IRPEF, NO ritenute
 */
function calcolaForfettario(params) {
  const { fatturato, coefficiente = 0.78, aliquotaForfettario = 'ordinario',
    gestioneINPS = 'commercianti', riduzione35 = false } = params;
  
  const redditoForfettario = Math.round(fatturato * coefficiente);
  const aliquota = aliquotaForfettario === 'startup' ? FORFETTARIO.aliquota_startup : FORFETTARIO.aliquota_ordinaria;
  
  // INPS (deducibile ai fini dell'imposta sostitutiva)
  const inps = calcolaINPSArtigianiCommercianti(redditoForfettario, gestioneINPS, riduzione35);
  
  // Reddito imponibile ai fini imposta sostitutiva = reddito forfettario - contributi INPS versati
  const redditoImponibile = Math.max(0, redditoForfettario - inps);
  const impostaSostitutiva = Math.round(redditoImponibile * aliquota);
  
  const totaleTasse = impostaSostitutiva + inps;
  const netto = fatturato - totaleTasse; // In forfettario i costi reali non rilevano fiscalmente
  const pressioneFiscale = fatturato > 0 ? (totaleTasse / fatturato) * 100 : 0;
  
  return {
    tipo: 'forfettario', forma: 'RF',
    fatturato, coefficiente, redditoForfettario,
    inps, gestioneINPS, riduzione35,
    redditoImponibile, aliquota, impostaSostitutiva,
    totaleTasse, inTascaSocio: netto, pressioneFiscale,
    // Warning se supera soglia
    superaSoglia: fatturato > FORFETTARIO.soglia_ricavi,
    uscitaImmediata: fatturato > FORFETTARIO.soglia_flat_exit,
    // Alias
    imposta: impostaSostitutiva,
    irpefAmm: 0, inpsAmm: 0, compensoAmm: 0, nettoAmm: 0,
    ires: 0, irap: 0, utile: redditoForfettario,
    dividendiLordi: 0, impostaDividendi: 0, dividendiNetti: 0, utileRitenuto: 0,
    utileNetto: 0, costi: 0,
  };
}


// ═══════════════════════════════════════
// DISPATCHER PRINCIPALE
// ═══════════════════════════════════════

export function calcolaImposteLocale(params) {
  const { regime } = params;
  
  switch (regime) {
    case 'SRL':
    case 'SRLU':
      return calcolaSRL({ ...params, forma: regime });
    case 'SPA':
      return calcolaSPA(params);
    case 'SAPA':
      return calcolaSAPA(params);
    case 'SE':
      return calcolaSRL({ ...params, forma: 'SE' }); // Società Europea = come SRL/SPA
    case 'Ditta individuale':
      return calcolaDittaIndividuale(params);
    case 'SNC':
      return calcolaSNC(params);
    case 'SAS':
      return calcolaSAS(params);
    case 'SS':
      return calcolaSS(params);
    case 'COOP':
      return calcolaCOOP(params);
    case 'RF':
      return calcolaForfettario(params);
    default:
      return calcolaSRL(params);
  }
}

// Utility per determinare le features UI in base alla forma giuridica
export function getRegimeFeatures(forma) {
  const capitali = ['SRL', 'SRLU', 'SPA', 'SAPA', 'SE'];
  const personaliConINPS = ['Ditta individuale', 'SNC', 'SAS'];
  
  if (forma === 'RF') return {
    hasCosti: false, hasCompenso: false, hasDividendi: false,
    hasCoeffRedditivita: true, hasGestioneINPS: true, hasRiduzione35: true,
    hasNumSoci: false, hasIRAP: false, hasTipoSocio: false,
  };
  if (capitali.includes(forma)) return {
    hasCosti: true, hasCompenso: true, hasDividendi: true,
    hasCoeffRedditivita: false, hasGestioneINPS: false, hasRiduzione35: false,
    hasNumSoci: false, hasIRAP: true, hasTipoSocio: false,
  };
  if (forma === 'COOP') return {
    hasCosti: true, hasCompenso: false, hasDividendi: false,
    hasCoeffRedditivita: false, hasGestioneINPS: false, hasRiduzione35: false,
    hasNumSoci: false, hasIRAP: true, hasTipoSocio: false,
    hasRistorni: true, hasMutualita: true,
  };
  if (forma === 'SS') return {
    hasCosti: true, hasCompenso: false, hasDividendi: false,
    hasCoeffRedditivita: false, hasGestioneINPS: false, hasRiduzione35: false,
    hasNumSoci: true, hasIRAP: false, hasTipoSocio: false,
  };
  if (forma === 'SAS') return {
    hasCosti: true, hasCompenso: false, hasDividendi: false,
    hasCoeffRedditivita: false, hasGestioneINPS: true, hasRiduzione35: false,
    hasNumSoci: true, hasIRAP: true, hasTipoSocio: true,
  };
  if (forma === 'SNC') return {
    hasCosti: true, hasCompenso: false, hasDividendi: false,
    hasCoeffRedditivita: false, hasGestioneINPS: true, hasRiduzione35: false,
    hasNumSoci: true, hasIRAP: true, hasTipoSocio: false,
  };
  // Ditta individuale
  return {
    hasCosti: true, hasCompenso: false, hasDividendi: false,
    hasCoeffRedditivita: false, hasGestioneINPS: true, hasRiduzione35: false,
    hasNumSoci: false, hasIRAP: true, hasTipoSocio: false,
  };
}

export function mapFormaToRegime(fg) {
  if (fg === 'RF') return 'RF';
  if (['SRL', 'SRLU', 'SPA', 'SAPA', 'SE'].includes(fg)) return fg;
  if (fg === 'COOP') return 'COOP';
  if (fg === 'SNC') return 'SNC';
  if (fg === 'SAS') return 'SAS';
  if (fg === 'SS') return 'SS';
  if (fg === 'Ditta individuale') return 'Ditta individuale';
  return fg || 'SRL';
}