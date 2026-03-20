/**
 * Sistema classificazione rischi basato su fonti ufficiali:
 * 
 * 1. INAIL / Accordo Stato-Regioni 21/12/2011 Allegato II
 *    → Livello rischio BASSO / MEDIO / ALTO per ogni divisione ATECO
 * 
 * 2. D.Lgs. 81/2008 (Testo Unico Sicurezza) + INAPP
 *    → Rischi specifici per settore (Titoli VI-XI del D.Lgs. 81/08)
 * 
 * 3. DPR 151/2011 + DM 03/08/2015
 *    → Classificazione rischio incendio
 * 
 * Fonte tabella rischio INAIL: Allegato II Accordo Stato-Regioni 21/12/2011
 * aggiornato con Accordo 07/07/2016 e corrispondenze ATECO 2007-2025
 */

// ============================================================
// TABELLA INAIL: Livello rischio per SEZIONE/DIVISIONE ATECO
// Fonte: Allegato II Accordo Stato-Regioni 21/12/2011
// ============================================================
const RISCHIO_INAIL_DIVISIONE = {
  // SEZIONE A — Agricoltura, silvicoltura e pesca → MEDIO
  '01': 'medio', '02': 'medio', '03': 'medio',
  
  // SEZIONE B — Estrazione minerali → ALTO
  '05': 'alto', '06': 'alto', '07': 'alto', '08': 'alto', '09': 'alto',
  
  // SEZIONE C — Attività manifatturiere → ALTO
  '10': 'alto', '11': 'alto', '12': 'alto', // Alimentari, bevande, tabacco
  '13': 'alto', '14': 'alto', '15': 'alto', // Tessile, abbigliamento, pelle
  '16': 'alto', '17': 'alto', '18': 'alto', // Legno, carta, stampa
  '19': 'alto',                              // Coke e petroliferi
  '20': 'alto', '21': 'alto',               // Chimica, farmaceutica
  '22': 'alto', '23': 'alto',               // Gomma/plastica, minerali non metalliferi
  '24': 'alto', '25': 'alto',               // Metallurgia, prodotti in metallo
  '26': 'alto', '27': 'alto', '28': 'alto', // Elettronica, elettrica, meccanica
  '29': 'alto', '30': 'alto',               // Autoveicoli, altri mezzi trasporto
  '31': 'alto', '32': 'alto', '33': 'alto', // Mobili, altre manifatturiere, riparazione
  
  // SEZIONE D — Energia elettrica, gas → MEDIO
  '35': 'medio',
  
  // SEZIONE E — Acqua, rifiuti, risanamento → ALTO
  '36': 'alto', '37': 'alto', '38': 'alto', '39': 'alto',
  
  // SEZIONE F — Costruzioni → ALTO
  '41': 'alto', '42': 'alto', '43': 'alto',
  
  // SEZIONE G — Commercio → BASSO
  '45': 'basso', '46': 'basso', '47': 'basso',
  
  // SEZIONE H — Trasporto e magazzinaggio → MEDIO
  '49': 'medio', '50': 'medio', '51': 'medio', '52': 'medio', '53': 'medio',
  
  // SEZIONE I — Alloggio e ristorazione → BASSO
  '55': 'basso', '56': 'basso',
  
  // SEZIONE J — Informazione e comunicazione → BASSO
  '58': 'basso', '59': 'basso', '60': 'basso', '61': 'basso', '62': 'basso', '63': 'basso',
  
  // SEZIONE K — Finanza e assicurazioni → BASSO
  '64': 'basso', '65': 'basso', '66': 'basso',
  
  // SEZIONE L — Attività immobiliari → BASSO
  '68': 'basso',
  
  // SEZIONE M — Attività professionali, scientifiche → BASSO
  '69': 'basso', '70': 'basso', '71': 'basso', '72': 'basso', '73': 'basso', '74': 'basso', '75': 'basso',
  
  // SEZIONE N — Noleggio, agenzie viaggio, servizi → BASSO
  '77': 'basso', '78': 'basso', '79': 'basso', '80': 'basso', '81': 'basso', '82': 'basso',
  
  // SEZIONE O — PA e Difesa → MEDIO
  '84': 'medio',
  
  // SEZIONE P — Istruzione → MEDIO
  '85': 'medio',
  
  // SEZIONE Q — Sanità e assistenza sociale → ALTO
  '86': 'alto', '87': 'alto', '88': 'alto',
  
  // SEZIONE R — Attività artistiche, sportive → BASSO
  '90': 'basso', '91': 'basso', '92': 'basso', '93': 'basso',
  
  // SEZIONE S — Altri servizi → BASSO
  '94': 'basso', '95': 'basso', '96': 'basso',
  
  // SEZIONE T — Famiglie come datori → BASSO
  '97': 'basso',
  
  // SEZIONE U — Organismi extraterritoriali → BASSO
  '99': 'basso',
};

/**
 * Restituisce il livello rischio INAIL (basso/medio/alto)
 * basato sull'Allegato II Accordo Stato-Regioni 21/12/2011
 */
export function getLivelloRischioINAIL(codice_ateco) {
  const divisione = (codice_ateco || '').split('.')[0] || '';
  return RISCHIO_INAIL_DIVISIONE[divisione] || 'medio';
}

// ============================================================
// RISCHI SPECIFICI PER DIVISIONE ATECO
// Fonte: D.Lgs. 81/2008 Titoli VI-XI + indagini INAPP + prassi INAIL
//
// Ogni divisione ha i rischi TIPICI del settore, ricavati da:
// - Titolo VI (MMC), Titolo VII (VDT), Titolo VIII (Agenti fisici),
//   Titolo IX (Sostanze pericolose), Titolo X (Biologico), Titolo XI (Atmosfere esplosive)
// - Profili di rischio INAIL per comparto produttivo
// - Indagini INAPP sulle condizioni di lavoro per settore
// ============================================================
const RISCHI_SETTORE = {
  // --- AGRICOLTURA (01-03) - D.Lgs 81/08 + DM Agricoltura ---
  '01': { macchinari: true, rumore: true, vibrazioni: true, chimiche: true, mmc: true, biologico: true, microclima: true },
  '02': { macchinari: true, rumore: true, vibrazioni: true, mmc: true, quota: true, microclima: true, chimiche: true },
  '03': { biologico: true, microclima: true, mmc: true },
  
  // --- ESTRAZIONE (05-09) - Rischio molto alto ---
  '05': { macchinari: true, rumore: true, vibrazioni: true, chimiche: true, mmc: true, spazi_confinati: true, atmosfere_esplosive: true, microclima: true, emissioni: true, rifiuti: true, incendio: true },
  '06': { macchinari: true, rumore: true, vibrazioni: true, chimiche: true, atmosfere_esplosive: true, spazi_confinati: true, incendio: true, emissioni: true },
  '07': { macchinari: true, rumore: true, vibrazioni: true, chimiche: true, mmc: true, spazi_confinati: true, rifiuti: true },
  '08': { macchinari: true, rumore: true, vibrazioni: true, mmc: true, chimiche: true, rifiuti: true },
  '09': { macchinari: true, rumore: true, vibrazioni: true, chimiche: true, spazi_confinati: true, atmosfere_esplosive: true },
  
  // --- INDUSTRIA ALIMENTARE (10-12) ---
  '10': { macchinari: true, rumore: true, mmc: true, biologico: true, chimiche: true, microclima: true, rifiuti: true, incendio: true },
  '11': { macchinari: true, rumore: true, mmc: true, chimiche: true, biologico: true, microclima: true, rifiuti: true },
  '12': { macchinari: true, rumore: true, chimiche: true, atmosfere_esplosive: true, incendio: true },
  
  // --- TESSILE / ABBIGLIAMENTO / PELLE (13-15) ---
  '13': { macchinari: true, rumore: true, chimiche: true, mmc: true, rifiuti: true, emissioni: true },
  '14': { macchinari: true, rumore: true, mmc: true, chimiche: true },
  '15': { macchinari: true, rumore: true, chimiche: true, mmc: true, rifiuti: true },
  
  // --- LEGNO / CARTA / STAMPA (16-18) ---
  '16': { macchinari: true, rumore: true, vibrazioni: true, mmc: true, chimiche: true, atmosfere_esplosive: true, incendio: true, rifiuti: true, emissioni: true },
  '17': { macchinari: true, rumore: true, chimiche: true, mmc: true, rifiuti: true, emissioni: true, scarichi: true },
  '18': { macchinari: true, chimiche: true, rifiuti: true },
  
  // --- COKE E PETROLIFERO (19) ---
  '19': { macchinari: true, rumore: true, chimiche: true, atmosfere_esplosive: true, incendio: true, emissioni: true, scarichi: true, rifiuti: true, microclima: true },
  
  // --- CHIMICA / FARMACEUTICA (20-21) ---
  '20': { macchinari: true, rumore: true, chimiche: true, atmosfere_esplosive: true, incendio: true, emissioni: true, scarichi: true, rifiuti: true, biologico: true },
  '21': { macchinari: true, chimiche: true, biologico: true, rifiuti: true, emissioni: true },
  
  // --- GOMMA/PLASTICA / MINERALI NON METALLIFERI (22-23) ---
  '22': { macchinari: true, rumore: true, chimiche: true, mmc: true, rifiuti: true, emissioni: true, incendio: true },
  '23': { macchinari: true, rumore: true, vibrazioni: true, chimiche: true, mmc: true, microclima: true, rifiuti: true, emissioni: true },
  
  // --- METALLURGIA / PRODOTTI IN METALLO (24-25) ---
  '24': { macchinari: true, rumore: true, vibrazioni: true, chimiche: true, mmc: true, microclima: true, cem: true, radiazioni_ottiche: true, rifiuti: true, emissioni: true, scarichi: true, incendio: true },
  '25': { macchinari: true, rumore: true, vibrazioni: true, chimiche: true, mmc: true, cem: true, radiazioni_ottiche: true, rifiuti: true, emissioni: true, incendio: true },
  
  // --- ELETTRONICA / ELETTRICA / MECCANICA (26-28) ---
  '26': { macchinari: true, chimiche: true, rifiuti: true, cem: true },
  '27': { macchinari: true, rumore: true, chimiche: true, mmc: true, cem: true, rifiuti: true },
  '28': { macchinari: true, rumore: true, vibrazioni: true, chimiche: true, mmc: true, rifiuti: true, emissioni: true },
  
  // --- AUTOVEICOLI / ALTRI MEZZI TRASPORTO (29-30) ---
  '29': { macchinari: true, rumore: true, vibrazioni: true, chimiche: true, mmc: true, radiazioni_ottiche: true, cem: true, rifiuti: true, emissioni: true },
  '30': { macchinari: true, rumore: true, vibrazioni: true, chimiche: true, mmc: true, rifiuti: true },
  
  // --- MOBILI / ALTRE MANIFATTURIERE / RIPARAZIONE (31-33) ---
  '31': { macchinari: true, rumore: true, chimiche: true, mmc: true, rifiuti: true, emissioni: true },
  '32': { macchinari: true, chimiche: true, rifiuti: true },
  '33': { macchinari: true, rumore: true, vibrazioni: true, chimiche: true, mmc: true, rifiuti: true },
  
  // --- ENERGIA (35) ---
  '35': { macchinari: true, rumore: true, cem: true, incendio: true, chimiche: true },
  
  // --- ACQUA / RIFIUTI / RISANAMENTO (36-39) ---
  '36': { chimiche: true, biologico: true, spazi_confinati: true, mmc: true },
  '37': { chimiche: true, biologico: true, spazi_confinati: true, mmc: true, rifiuti: true, atmosfere_esplosive: true },
  '38': { macchinari: true, rumore: true, chimiche: true, biologico: true, mmc: true, rifiuti: true, emissioni: true, incendio: true },
  '39': { chimiche: true, biologico: true, rifiuti: true, emissioni: true },
  
  // --- COSTRUZIONI (41-43) ---
  '41': { macchinari: true, rumore: true, vibrazioni: true, chimiche: true, mmc: true, quota: true, spazi_confinati: true, microclima: true, rifiuti: true, incendio: true },
  '42': { macchinari: true, rumore: true, vibrazioni: true, chimiche: true, mmc: true, quota: true, spazi_confinati: true, microclima: true, rifiuti: true },
  '43': { macchinari: true, rumore: true, vibrazioni: true, chimiche: true, mmc: true, quota: true, microclima: true, rifiuti: true, incendio: true },
  
  // --- COMMERCIO (45-47) ---
  '45': { mmc: true, chimiche: true, rumore: true }, // Commercio autoveicoli - officine
  '46': { mmc: true },  // Commercio ingrosso
  '47': { mmc: true },  // Commercio dettaglio
  
  // --- TRASPORTO E MAGAZZINAGGIO (49-53) ---
  '49': { macchinari: true, rumore: true, vibrazioni: true, mmc: true, incendio: true },
  '50': { macchinari: true, rumore: true, vibrazioni: true, mmc: true, biologico: true },
  '51': { rumore: true, vibrazioni: true },
  '52': { macchinari: true, rumore: true, mmc: true, incendio: true },
  '53': { mmc: true },
  
  // --- ALLOGGIO (55) ---
  '55': { mmc: true, biologico: true, incendio: true, chimiche: true },
  
  // --- RISTORAZIONE (56) ---
  '56': { biologico: true, chimiche: true, mmc: true, microclima: true, incendio: true },
  
  // --- INFORMAZIONE E COMUNICAZIONE (58-63) ---
  '58': {}, '59': {}, '60': {}, '61': {}, '62': {}, '63': {},
  
  // --- FINANZA (64-66) ---
  '64': { dati_sensibili: true }, '65': { dati_sensibili: true }, '66': { dati_sensibili: true },
  
  // --- IMMOBILIARE (68) ---
  '68': {},
  
  // --- ATTIVITÀ PROFESSIONALI (69-75) ---
  '69': { dati_sensibili: true }, // Legale, contabilità
  '70': { dati_sensibili: true }, // Consulenza gestionale
  '71': {},  // Architettura, ingegneria
  '72': { chimiche: true, biologico: true }, // R&S scientifica
  '73': {},  // Pubblicità
  '74': {},  // Altre attività professionali
  '75': {},  // Veterinaria (rischio biologico gestito dalla normativa specifica)
  
  // --- NOLEGGIO E SERVIZI (77-82) ---
  '77': {},
  '78': {},
  '79': {},
  '80': {},  // Vigilanza
  '81': { chimiche: true, mmc: true, quota: true }, // Pulizie, giardinaggio
  '82': {},
  
  // --- PA (84) ---
  '84': {},
  
  // --- ISTRUZIONE (85) ---
  '85': { biologico: true }, // Rischio biologico in scuole/asili
  
  // --- SANITÀ (86-88) ---
  '86': { biologico: true, chimiche: true, rifiuti: true, dati_sensibili: true, radiazioni_ottiche: true, cem: true, mmc: true },
  '87': { biologico: true, chimiche: true, mmc: true, dati_sensibili: true },
  '88': { biologico: true, mmc: true, dati_sensibili: true },
  
  // --- ARTE, SPORT, INTRATTENIMENTO (90-93) ---
  '90': { rumore: true },
  '91': {},
  '92': {},
  '93': { mmc: true, rumore: true },
  
  // --- ALTRI SERVIZI (94-96) ---
  '94': {},
  '95': { chimiche: true }, // Riparazione
  '96': { chimiche: true, biologico: true }, // Parrucchieri, estetica, lavanderie
};


/**
 * Calcola automaticamente i rischi da pre-selezionare.
 * 
 * Combina:
 * 1. INAIL Allegato II → livello rischio BASSO/MEDIO/ALTO
 * 2. D.Lgs. 81/08 + INAPP → rischi specifici per divisione ATECO
 * 3. Regole dimensionali → numero dipendenti
 * 4. Tipo attività (categoria) → raffinamento aggiuntivo
 * 
 * L'utente può sempre modificare manualmente le spunte dopo l'auto-fill.
 */
export function calcolaRischiAutomatici({ codice_ateco, tipo_attivita_categoria, numero_dipendenti }) {
  const n = parseInt(numero_dipendenti) || 0;
  const ateco = (codice_ateco || '').trim();
  const cat = (tipo_attivita_categoria || '').toLowerCase();
  const divisione = ateco.split('.')[0] || '';
  const divNum = parseInt(divisione) || 0;

  // Livello rischio INAIL
  const livelloRischio = getLivelloRischioINAIL(ateco);
  
  // Rischi specifici dalla tabella settoriale
  const rischiSettore = RISCHI_SETTORE[divisione] || {};

  // Inizializza tutto a false
  const rischi = {
    presenza_lavoratori: n > 0,
    presenza_macchinari: false,
    presenza_rumore: false,
    presenza_vibrazioni: false,
    presenza_sostanze_chimiche: false,
    presenza_movimentazione_carichi: false,
    presenza_videoterminali: false,
    presenza_lavori_quota: false,
    presenza_spazi_confinati: false,
    presenza_rischio_biologico: false,
    presenza_campi_elettromagnetici: false,
    presenza_radiazioni_ottiche: false,
    presenza_microclima_severo: false,
    presenza_atmosfere_esplosive: false,
    presenza_rifiuti_speciali: false,
    presenza_emissioni_atmosfera: false,
    presenza_scarichi_industriali: false,
    presenza_rischio_incendio_non_basso: false,
    presenza_sistemi_it_cloud: false,
    trattamento_dati_sensibili: false,
  };

  // ============================================================
  // 1. RISCHI UNIVERSALI (tutte le aziende con dipendenti)
  //    Fonte: Art. 17, 28, 37 D.Lgs. 81/08
  // ============================================================
  if (n > 0) {
    rischi.presenza_lavoratori = true;
    rischi.presenza_videoterminali = true;  // Quasi tutte le aziende oggi usano VDT
    rischi.presenza_sistemi_it_cloud = true; // Quasi tutte le aziende hanno IT
  }

  // ============================================================
  // 2. RISCHI DA TABELLA SETTORIALE (INAIL + INAPP + D.Lgs. 81/08)
  // ============================================================
  if (rischiSettore.macchinari) rischi.presenza_macchinari = true;
  if (rischiSettore.rumore) rischi.presenza_rumore = true;
  if (rischiSettore.vibrazioni) rischi.presenza_vibrazioni = true;
  if (rischiSettore.chimiche) rischi.presenza_sostanze_chimiche = true;
  if (rischiSettore.mmc) rischi.presenza_movimentazione_carichi = true;
  if (rischiSettore.quota) rischi.presenza_lavori_quota = true;
  if (rischiSettore.spazi_confinati) rischi.presenza_spazi_confinati = true;
  if (rischiSettore.biologico) rischi.presenza_rischio_biologico = true;
  if (rischiSettore.cem) rischi.presenza_campi_elettromagnetici = true;
  if (rischiSettore.radiazioni_ottiche) rischi.presenza_radiazioni_ottiche = true;
  if (rischiSettore.microclima) rischi.presenza_microclima_severo = true;
  if (rischiSettore.atmosfere_esplosive) rischi.presenza_atmosfere_esplosive = true;
  if (rischiSettore.rifiuti) rischi.presenza_rifiuti_speciali = true;
  if (rischiSettore.emissioni) rischi.presenza_emissioni_atmosfera = true;
  if (rischiSettore.scarichi) rischi.presenza_scarichi_industriali = true;
  if (rischiSettore.incendio) rischi.presenza_rischio_incendio_non_basso = true;
  if (rischiSettore.dati_sensibili) rischi.trattamento_dati_sensibili = true;

  // ============================================================
  // 3. REGOLE DIMENSIONALI (DPR 151/2011 + DM 03/08/2015)
  //    Rischio incendio medio/alto se >15 dipendenti o rischio INAIL alto
  // ============================================================
  if (n > 15 || livelloRischio === 'alto') {
    rischi.presenza_rischio_incendio_non_basso = true;
  }

  // ============================================================
  // 4. RAFFINAMENTO PER TIPO ATTIVITÀ (categoria dall'utente)
  //    Override/integrazione basata su dichiarazione utente
  // ============================================================
  if (cat === 'cantiere_edile' || cat === 'edile') {
    rischi.presenza_macchinari = true;
    rischi.presenza_rumore = true;
    rischi.presenza_vibrazioni = true;
    rischi.presenza_lavori_quota = true;
    rischi.presenza_movimentazione_carichi = true;
    rischi.presenza_sostanze_chimiche = true;
    rischi.presenza_microclima_severo = true;
    rischi.presenza_rifiuti_speciali = true;
    rischi.presenza_rischio_incendio_non_basso = true;
  }

  if (cat === 'produzione_industriale' || cat === 'produttiva') {
    rischi.presenza_macchinari = true;
    rischi.presenza_rumore = true;
    rischi.presenza_movimentazione_carichi = true;
    rischi.presenza_rifiuti_speciali = true;
    rischi.presenza_rischio_incendio_non_basso = true;
  }

  if (cat === 'laboratorio_artigianale' || cat === 'artigianale') {
    rischi.presenza_macchinari = true;
    rischi.presenza_rumore = true;
    rischi.presenza_movimentazione_carichi = true;
    rischi.presenza_rifiuti_speciali = true;
  }

  if (cat === 'magazzino_logistica' || cat === 'trasporti') {
    rischi.presenza_macchinari = true;
    rischi.presenza_rumore = true;
    rischi.presenza_vibrazioni = true;
    rischi.presenza_movimentazione_carichi = true;
    rischi.presenza_rischio_incendio_non_basso = true;
  }

  if (cat === 'ristorante_bar') {
    rischi.presenza_rischio_biologico = true;
    rischi.presenza_movimentazione_carichi = true;
    rischi.presenza_sostanze_chimiche = true;
    rischi.presenza_microclima_severo = true;
    rischi.presenza_rischio_incendio_non_basso = true;
  }

  if (cat === 'struttura_sanitaria') {
    rischi.presenza_rischio_biologico = true;
    rischi.trattamento_dati_sensibili = true;
    rischi.presenza_sostanze_chimiche = true;
    rischi.presenza_rifiuti_speciali = true;
    rischi.presenza_movimentazione_carichi = true;
  }

  if (cat === 'struttura_ricettiva') {
    rischi.presenza_rischio_incendio_non_basso = true;
    rischi.presenza_movimentazione_carichi = true;
    rischi.presenza_rischio_biologico = true;
  }

  if (cat === 'agricoltura' || cat === 'agricola') {
    rischi.presenza_macchinari = true;
    rischi.presenza_rumore = true;
    rischi.presenza_vibrazioni = true;
    rischi.presenza_sostanze_chimiche = true;
    rischi.presenza_rischio_biologico = true;
    rischi.presenza_microclima_severo = true;
    rischi.presenza_movimentazione_carichi = true;
  }

  if (cat === 'studio_professionale' || cat === 'ufficio' || cat === 'servizi') {
    // Principalmente VDT (già settato sopra). Dati sensibili per studi legali/contabili
    if (cat === 'studio_professionale') {
      rischi.trattamento_dati_sensibili = true;
    }
  }

  return rischi;
}