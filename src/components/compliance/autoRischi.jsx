/**
 * Calcola automaticamente i rischi da pre-selezionare
 * in base al codice ATECO, tipo attività e numero dipendenti.
 * 
 * Logica:
 * - Rischi UNIVERSALI (quasi tutte le aziende con dipendenti): lavoratori, videoterminali
 * - Rischi per SETTORE (dedotti dal codice ATECO / categoria)
 */

export function calcolaRischiAutomatici({ codice_ateco, tipo_attivita_categoria, numero_dipendenti }) {
  const n = parseInt(numero_dipendenti) || 0;
  const ateco = (codice_ateco || '').trim();
  const cat = (tipo_attivita_categoria || '').toLowerCase();
  
  // Divisione ATECO (prime 2 cifre)
  const divisione = ateco.split('.')[0] || '';

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

  // === RISCHI UNIVERSALI (quasi tutte le aziende) ===
  if (n > 0) {
    rischi.presenza_lavoratori = true;
    // Quasi tutte le aziende oggi usano PC/sistemi IT
    rischi.presenza_videoterminali = true;
    rischi.presenza_sistemi_it_cloud = true;
  }

  // === SETTORI PRODUTTIVI / MANIFATTURIERI (ATECO 10-33) ===
  const divNum = parseInt(divisione);
  const isManufacturing = divNum >= 10 && divNum <= 33;
  
  if (isManufacturing || cat === 'produttiva' || cat === 'produzione_industriale') {
    rischi.presenza_macchinari = true;
    rischi.presenza_rumore = true;
    rischi.presenza_movimentazione_carichi = true;
    rischi.presenza_rifiuti_speciali = true;
    rischi.presenza_rischio_incendio_non_basso = true;
    rischi.presenza_emissioni_atmosfera = true;
  }

  // === EDILIZIA / COSTRUZIONI (ATECO 41-43) ===
  const isEdilizia = divNum >= 41 && divNum <= 43;
  if (isEdilizia || cat === 'edile' || cat === 'cantiere_edile') {
    rischi.presenza_macchinari = true;
    rischi.presenza_rumore = true;
    rischi.presenza_vibrazioni = true;
    rischi.presenza_movimentazione_carichi = true;
    rischi.presenza_lavori_quota = true;
    rischi.presenza_sostanze_chimiche = true;
    rischi.presenza_rischio_incendio_non_basso = true;
    rischi.presenza_rifiuti_speciali = true;
    rischi.presenza_microclima_severo = true;
  }

  // === RISTORAZIONE / BAR (ATECO 56) ===
  if (divisione === '56' || cat === 'ristorante_bar') {
    rischi.presenza_rischio_biologico = true;
    rischi.presenza_rischio_incendio_non_basso = true;
    rischi.presenza_movimentazione_carichi = true;
    rischi.presenza_sostanze_chimiche = true; // detergenti, sanificanti
    rischi.presenza_microclima_severo = true; // cucine calde, celle frigo
  }

  // === COMMERCIO (ATECO 45-47) ===
  const isCommercio = divNum >= 45 && divNum <= 47;
  if (isCommercio || cat === 'commerciale' || cat === 'negozio_retail') {
    rischi.presenza_movimentazione_carichi = true;
  }

  // === LOGISTICA / MAGAZZINO (ATECO 49-53) ===
  const isLogistica = divNum >= 49 && divNum <= 53;
  if (isLogistica || cat === 'magazzino_logistica' || cat === 'trasporti') {
    rischi.presenza_macchinari = true; // carrelli elevatori
    rischi.presenza_rumore = true;
    rischi.presenza_movimentazione_carichi = true;
    rischi.presenza_vibrazioni = true;
    rischi.presenza_rischio_incendio_non_basso = true;
  }

  // === ARTIGIANALE / LABORATORIO ===
  if (cat === 'artigianale' || cat === 'laboratorio_artigianale') {
    rischi.presenza_macchinari = true;
    rischi.presenza_rumore = true;
    rischi.presenza_movimentazione_carichi = true;
    rischi.presenza_rifiuti_speciali = true;
  }

  // === SANITÀ (ATECO 86-88) ===
  const isSanita = divNum >= 86 && divNum <= 88;
  if (isSanita || cat === 'struttura_sanitaria') {
    rischi.presenza_rischio_biologico = true;
    rischi.trattamento_dati_sensibili = true;
    rischi.presenza_sostanze_chimiche = true;
    rischi.presenza_rifiuti_speciali = true;
  }

  // === AGRICOLTURA (ATECO 01-03) ===
  const isAgricoltura = divNum >= 1 && divNum <= 3;
  if (isAgricoltura || cat === 'agricola' || cat === 'agricoltura') {
    rischi.presenza_macchinari = true;
    rischi.presenza_rumore = true;
    rischi.presenza_vibrazioni = true;
    rischi.presenza_sostanze_chimiche = true; // fitosanitari
    rischi.presenza_rischio_biologico = true;
    rischi.presenza_microclima_severo = true;
    rischi.presenza_movimentazione_carichi = true;
  }

  // === UFFICI / STUDI PROFESSIONALI (ATECO 69-75) ===
  const isUffici = divNum >= 69 && divNum <= 75;
  if (isUffici || cat === 'ufficio' || cat === 'studio_professionale' || cat === 'servizi') {
    // Principalmente videoterminali e IT (già settati sopra)
    // Aggiungi trattamento dati se professionale
    if (cat === 'studio_professionale' || divisione === '69' || divisione === '70') {
      rischi.trattamento_dati_sensibili = true;
    }
  }

  // === ALLOGGIO / RICETTIVO (ATECO 55) ===
  if (divisione === '55' || cat === 'struttura_ricettiva') {
    rischi.presenza_rischio_incendio_non_basso = true;
    rischi.presenza_movimentazione_carichi = true;
    rischi.presenza_rischio_biologico = true;
  }

  // === CHIMICO / FARMACEUTICO (ATECO 20-21) ===
  if (divisione === '20' || divisione === '21') {
    rischi.presenza_sostanze_chimiche = true;
    rischi.presenza_atmosfere_esplosive = true;
    rischi.presenza_emissioni_atmosfera = true;
    rischi.presenza_scarichi_industriali = true;
    rischi.presenza_rifiuti_speciali = true;
  }

  // === METALLURGIA / SALDATURA (ATECO 24-25) ===
  if (divisione === '24' || divisione === '25') {
    rischi.presenza_campi_elettromagnetici = true;
    rischi.presenza_radiazioni_ottiche = true;
    rischi.presenza_microclima_severo = true;
  }

  // === GRANDI AZIENDE (>15 dipendenti) — rischio incendio quasi sempre medio/alto ===
  if (n > 15) {
    rischi.presenza_rischio_incendio_non_basso = true;
  }

  return rischi;
}