import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook che carica tutte le tabelle contributive per un dato anno.
 * Restituisce un dizionario { tipo: { valore, descrizione, fonte_normativa } }
 */
export function useTabelleContributive(anno = 2026) {
  const { data: tabelle, isLoading, error } = useQuery({
    queryKey: ['tabelle-contributive', anno],
    queryFn: async () => {
      const records = await base44.entities.TabellaContributiva.filter({ anno });
      const map = {};
      let ultimoAggiornamento = null;
      records.forEach(r => {
        map[r.tipo] = {
          valore: r.valore,
          descrizione: r.descrizione,
          fonte_normativa: r.fonte_normativa,
          note: r.note || '',
        };
        // Traccia la data più recente di aggiornamento tra tutti i record
        const d = r.updated_date || r.created_date;
        if (d && (!ultimoAggiornamento || new Date(d) > new Date(ultimoAggiornamento))) {
          ultimoAggiornamento = d;
        }
      });
      return { map, ultimoAggiornamento };
    },
  });

  const tabelleMap = tabelle?.map;
  const dataAggiornamento = tabelle?.ultimoAggiornamento || null;

  const get = (tipo) => tabelleMap?.[tipo]?.valore ?? null;
  const getFonte = (tipo) => tabelleMap?.[tipo]?.fonte_normativa ?? '';
  const getDescrizione = (tipo) => tabelleMap?.[tipo]?.descrizione ?? '';

  // Raccoglie tutte le fonti normative usate in un calcolo
  const raccogliFonti = (tipiUsati) => {
    if (!tabelleMap) return [];
    const fontiSet = new Set();
    tipiUsati.forEach(tipo => {
      if (tabelleMap[tipo]?.fonte_normativa) {
        fontiSet.add(tabelleMap[tipo].fonte_normativa);
      }
    });
    return Array.from(fontiSet);
  };

  return {
    tabelle: tabelleMap,
    isLoading,
    error,
    get,
    getFonte,
    getDescrizione,
    raccogliFonti,
    anno,
    dataAggiornamento,
  };
}

/**
 * Motore di calcolo deterministico dipendente subordinato.
 * Nessuna AI, solo aritmetica su tabelle normative.
 */
export function calcolaCostoDipendente(params, tab) {
  const { ral, qualifica, mensilita, tfr_destinazione } = params;

  const inps_datore_aliquota = tab.get('inps_datore_dipendente');
  const inps_dip_aliquota = tab.get('inps_dipendente');
  const inail_aliquota = tab.get(`inail_${qualifica}`);
  const tfr_divisore = tab.get('tfr_divisore');
  const fondo_garanzia = tab.get('fondo_garanzia_tfr');
  const irpef_1 = tab.get('irpef_scaglione_1');
  const irpef_2 = tab.get('irpef_scaglione_2');
  const irpef_3 = tab.get('irpef_scaglione_3');
  const soglia_1 = tab.get('irpef_soglia_1');
  const soglia_2 = tab.get('irpef_soglia_2');
  const addizionali = tab.get('addizionali_media');

  if ([inps_datore_aliquota, inps_dip_aliquota, inail_aliquota, tfr_divisore, irpef_1, soglia_1].some(v => v === null)) {
    return null; // tabelle incomplete
  }

  const inps_datore = ral * inps_datore_aliquota;
  const inail = ral * inail_aliquota;
  const tfr_annuo = ral / tfr_divisore;
  const tfr_fondo_garanzia_costo = tfr_destinazione === 'fondo' ? ral * fondo_garanzia : 0;
  const costo_totale_annuo = ral + inps_datore + inail + tfr_annuo + tfr_fondo_garanzia_costo;
  const costo_mensile_datore = costo_totale_annuo / 12;

  // Netto dipendente
  const inps_dipendente = ral * inps_dip_aliquota;
  const imponibile_irpef = ral - inps_dipendente;

  let irpef = 0;
  if (imponibile_irpef <= soglia_1) {
    irpef = imponibile_irpef * irpef_1;
  } else if (imponibile_irpef <= soglia_2) {
    irpef = soglia_1 * irpef_1 + (imponibile_irpef - soglia_1) * irpef_2;
  } else {
    irpef = soglia_1 * irpef_1 + (soglia_2 - soglia_1) * irpef_2 + (imponibile_irpef - soglia_2) * irpef_3;
  }

  const addiz = imponibile_irpef * addizionali;
  const netto_annuo = ral - inps_dipendente - irpef - addiz;
  const netto_mensile = netto_annuo / mensilita;

  const tipi_usati = [
    'inps_datore_dipendente', 'inps_dipendente', `inail_${qualifica}`,
    'tfr_divisore', 'irpef_scaglione_1', 'irpef_scaglione_2', 'irpef_scaglione_3',
    'irpef_soglia_1', 'irpef_soglia_2', 'addizionali_media',
  ];
  if (tfr_destinazione === 'fondo') tipi_usati.push('fondo_garanzia_tfr');

  return {
    ral,
    inps_datore, aliquota_inps_datore: inps_datore_aliquota,
    inail, aliquota_inail: inail_aliquota,
    tfr_annuo, tfr_divisore,
    tfr_fondo_garanzia_costo, fondo_garanzia,
    costo_totale_annuo, costo_mensile_datore,
    inps_dipendente, aliquota_inps_dip: inps_dip_aliquota,
    irpef, addizionali: addiz, aliquota_addizionali: addizionali,
    netto_annuo, netto_mensile, mensilita,
    qualifica,
    fonti: tab.raccogliFonti(tipi_usati),
    anno: tab.anno,
    dataAggiornamento: tab.dataAggiornamento,
  };
}

/**
 * Motore di calcolo deterministico amministratore SRL.
 * Supporta: gestione_separata, commercianti, artigiani, nessuna.
 * Per Commercianti/Artigiani: minimale fisso + eccedenza da entity ContributiINPS.
 */
export function calcolaCostoAmministratore(params, tab) {
  const { compenso, tipo_rapporto, inail_applicabile, contributiINPS } = params;

  const gs_totale = tab.get('inps_gestione_separata_totale');
  const gs_quota_datore = tab.get('inps_gestione_separata_quota_datore');
  const gs_quota_iscritto = tab.get('inps_gestione_separata_quota_iscritto');
  const inail_amm = tab.get('inail_amministratore');
  const irpef_1 = tab.get('irpef_scaglione_1');
  const irpef_2 = tab.get('irpef_scaglione_2');
  const irpef_3 = tab.get('irpef_scaglione_3');
  const soglia_1 = tab.get('irpef_soglia_1');
  const soglia_2 = tab.get('irpef_soglia_2');
  const addizionali_val = tab.get('addizionali_media');
  const ires_val = tab.get('ires');
  const irap_val = tab.get('irap_media');

  if ([irpef_1, soglia_1, ires_val].some(v => v === null)) {
    return null;
  }

  let inps_datore = 0, inps_amministratore = 0, aliquota_totale_inps = 0, label_gestione = '';
  let dettaglio_contributi = null;
  const tipi_usati = ['irpef_scaglione_1', 'irpef_scaglione_2', 'irpef_scaglione_3', 'irpef_soglia_1', 'irpef_soglia_2', 'addizionali_media', 'ires', 'irap_media'];
  let fonti_extra = [];

  if (tipo_rapporto === 'gestione_separata') {
    if (!gs_totale || !gs_quota_datore) return null;
    const aliq_datore = gs_totale * gs_quota_datore;
    const aliq_amm = gs_totale * gs_quota_iscritto;
    inps_datore = compenso * aliq_datore;
    inps_amministratore = compenso * aliq_amm;
    aliquota_totale_inps = gs_totale;
    label_gestione = 'Gestione Separata INPS';
    tipi_usati.push('inps_gestione_separata_totale', 'inps_gestione_separata_quota_datore', 'inps_gestione_separata_quota_iscritto');
    dettaglio_contributi = {
      tipo: 'gestione_separata',
      aliquota_totale: gs_totale,
      quota_datore_pct: gs_quota_datore,
      quota_iscritto_pct: gs_quota_iscritto,
    };
  } else if (tipo_rapporto === 'commercianti' || tipo_rapporto === 'artigiani') {
    // Usa entity ContributiINPS per minimale, aliquota, massimale
    const gestKey = tipo_rapporto === 'commercianti' ? 'Commercianti' : 'Artigiani';
    const datiGestione = contributiINPS?.find(c => c.gestione === gestKey);
    if (!datiGestione) return null;

    const { aliquota_percentuale, minimale_annuo, contributo_fisso_annuo, massimale_reddito } = datiGestione;
    const compenso_capped = Math.min(compenso, massimale_reddito);

    let contributo_totale = 0;
    if (compenso_capped <= minimale_annuo) {
      // Sotto il minimale: si paga il contributo fisso
      contributo_totale = contributo_fisso_annuo;
    } else {
      // Fisso sul minimale + aliquota sull'eccedenza
      contributo_totale = contributo_fisso_annuo + (compenso_capped - minimale_annuo) * aliquota_percentuale;
    }

    // Per artigiani/commercianti l'intero contributo è a carico del titolare
    // La SRL deduce come costo il compenso (non i contributi personali)
    inps_datore = 0; // La SRL non versa INPS per il socio-amministratore artigiano/commerciante
    inps_amministratore = contributo_totale;
    aliquota_totale_inps = aliquota_percentuale;
    label_gestione = tipo_rapporto === 'commercianti' ? 'Gestione Commercianti INPS' : 'Gestione Artigiani INPS';
    fonti_extra.push(`Circ. INPS Artigiani e Commercianti 2026 — Minimale €${minimale_annuo.toLocaleString('it-IT')}, Massimale €${massimale_reddito.toLocaleString('it-IT')}`);
    dettaglio_contributi = {
      tipo: tipo_rapporto,
      aliquota_percentuale,
      minimale_annuo,
      contributo_fisso_annuo,
      massimale_reddito,
      contributo_totale,
      eccedenza: Math.max(0, compenso_capped - minimale_annuo),
      contributo_su_eccedenza: Math.max(0, compenso_capped - minimale_annuo) * aliquota_percentuale,
    };
  } else {
    // 'nessuna' — nessun contributo INPS
    inps_datore = 0;
    inps_amministratore = 0;
    aliquota_totale_inps = 0;
    label_gestione = 'Nessuna gestione previdenziale';
    dettaglio_contributi = { tipo: 'nessuna' };
  }

  const inail = inail_applicabile ? compenso * inail_amm : 0;
  if (inail_applicabile) tipi_usati.push('inail_amministratore');

  const costo_totale_srl = compenso + inps_datore + inail;
  const deducibile_ires = compenso + inps_datore;
  const risparmio_ires = deducibile_ires * ires_val;
  const deducibile_irap = compenso;
  const risparmio_irap = deducibile_irap * irap_val;
  const costo_netto_srl = costo_totale_srl - risparmio_ires - risparmio_irap;

  const imponibile_irpef = compenso - inps_amministratore;
  let irpef = 0;
  if (imponibile_irpef <= 0) {
    irpef = 0;
  } else if (imponibile_irpef <= soglia_1) {
    irpef = imponibile_irpef * irpef_1;
  } else if (imponibile_irpef <= soglia_2) {
    irpef = soglia_1 * irpef_1 + (imponibile_irpef - soglia_1) * irpef_2;
  } else {
    irpef = soglia_1 * irpef_1 + (soglia_2 - soglia_1) * irpef_2 + (imponibile_irpef - soglia_2) * irpef_3;
  }

  const addiz = Math.max(0, imponibile_irpef) * addizionali_val;
  const netto_amministratore = compenso - inps_amministratore - irpef - addiz;

  const fonti = [...tab.raccogliFonti(tipi_usati), ...fonti_extra];

  return {
    compenso, tipo_rapporto, label_gestione,
    inps_datore, inps_amministratore, aliquota_totale_inps,
    dettaglio_contributi,
    inail, aliquota_inail: inail_amm,
    costo_totale_srl,
    deducibile_ires, risparmio_ires, aliquota_ires: ires_val,
    deducibile_irap, risparmio_irap, aliquota_irap: irap_val,
    costo_netto_srl,
    irpef, addizionali: addiz, aliquota_addizionali: addizionali_val,
    imponibile_irpef: Math.max(0, imponibile_irpef),
    netto_amministratore,
    fonti,
    anno: tab.anno,
    dataAggiornamento: tab.dataAggiornamento,
  };
}

/**
 * Motore di calcolo deterministico Socio Lavoratore di cooperativa / SRL.
 * Il socio lavoratore è iscritto come dipendente della cooperativa o come
 * artigiano/commerciante. Il compenso è soggetto a contributi INPS (gestione
 * autonoma: commercianti o artigiani) + INAIL + IRPEF.
 */
export function calcolaCostoSocioLavoratore(params, tab) {
  const { compenso, gestione_inps, inail_applicabile, contributiINPS } = params;

  const irpef_1 = tab.get('irpef_scaglione_1');
  const irpef_2 = tab.get('irpef_scaglione_2');
  const irpef_3 = tab.get('irpef_scaglione_3');
  const soglia_1 = tab.get('irpef_soglia_1');
  const soglia_2 = tab.get('irpef_soglia_2');
  const addizionali_val = tab.get('addizionali_media');
  const inail_val = tab.get('inail_operaio_generico');

  if ([irpef_1, soglia_1].some(v => v === null)) return null;

  let contributo_inps = 0;
  let aliquota_inps = 0;
  let label_gestione = '';
  let dettaglio_contributi = null;
  const fonti_extra = [];
  const tipi_usati = ['irpef_scaglione_1', 'irpef_scaglione_2', 'irpef_scaglione_3', 'irpef_soglia_1', 'irpef_soglia_2', 'addizionali_media'];

  if (gestione_inps === 'commercianti' || gestione_inps === 'artigiani') {
    const gestKey = gestione_inps === 'commercianti' ? 'Commercianti' : 'Artigiani';
    const dati = contributiINPS?.find(c => c.gestione === gestKey);
    if (!dati) return null;

    const { aliquota_percentuale, minimale_annuo, contributo_fisso_annuo, massimale_reddito } = dati;
    const compenso_capped = Math.min(compenso, massimale_reddito);

    if (compenso_capped <= minimale_annuo) {
      contributo_inps = contributo_fisso_annuo;
    } else {
      contributo_inps = contributo_fisso_annuo + (compenso_capped - minimale_annuo) * aliquota_percentuale;
    }
    aliquota_inps = aliquota_percentuale;
    label_gestione = gestione_inps === 'commercianti' ? 'Gestione Commercianti' : 'Gestione Artigiani';
    fonti_extra.push(`Circ. INPS ${gestKey} 2026`);
    dettaglio_contributi = {
      tipo: gestione_inps,
      aliquota_percentuale,
      minimale_annuo,
      contributo_fisso_annuo,
      massimale_reddito,
      contributo_totale: contributo_inps,
      eccedenza: Math.max(0, compenso_capped - minimale_annuo),
      contributo_su_eccedenza: Math.max(0, compenso_capped - minimale_annuo) * aliquota_percentuale,
    };
  } else {
    // Dipendente della cooperativa — usa aliquote standard
    const inps_datore_aliq = tab.get('inps_datore_dipendente');
    const inps_lav_aliq = tab.get('inps_dipendente');
    if (inps_datore_aliq === null || inps_lav_aliq === null) return null;
    contributo_inps = compenso * inps_lav_aliq;
    aliquota_inps = inps_lav_aliq;
    label_gestione = 'Dipendente Cooperativa';
    tipi_usati.push('inps_datore_dipendente', 'inps_dipendente');
    dettaglio_contributi = {
      tipo: 'dipendente_coop',
      aliquota_datore: inps_datore_aliq,
      aliquota_lavoratore: inps_lav_aliq,
      inps_datore: compenso * inps_datore_aliq,
      inps_lavoratore: contributo_inps,
    };
  }

  const inail = inail_applicabile && inail_val ? compenso * inail_val : 0;
  if (inail_applicabile) tipi_usati.push('inail_operaio_generico');

  const imponibile_irpef_raw = compenso - contributo_inps;
  const imponibile_irpef = Math.max(0, imponibile_irpef_raw);

  // Calcolo IRPEF lorda per scaglione
  let irpef_scaglione_1_importo = 0;
  let irpef_scaglione_2_importo = 0;
  let irpef_scaglione_3_importo = 0;

  if (imponibile_irpef > 0) {
    irpef_scaglione_1_importo = Math.min(imponibile_irpef, soglia_1) * irpef_1;
  }
  if (imponibile_irpef > soglia_1) {
    irpef_scaglione_2_importo = (Math.min(imponibile_irpef, soglia_2) - soglia_1) * irpef_2;
  }
  if (imponibile_irpef > soglia_2) {
    irpef_scaglione_3_importo = (imponibile_irpef - soglia_2) * irpef_3;
  }

  const irpef_lorda = irpef_scaglione_1_importo + irpef_scaglione_2_importo + irpef_scaglione_3_importo;

  // Detrazione lavoro autonomo art. 13 TUIR (per redditi da lavoro autonomo/socio)
  // 2026: detrazione base 1.265€ per redditi fino a 15.000€, decresce fino a 0 a 55.000€
  let detrazione_lavoro = 0;
  if (imponibile_irpef <= 15000 && imponibile_irpef > 0) {
    detrazione_lavoro = 1265;
  } else if (imponibile_irpef <= 28000) {
    detrazione_lavoro = 1265 * (28000 - imponibile_irpef) / (28000 - 15000);
  } else if (imponibile_irpef <= 55000) {
    detrazione_lavoro = 1265 * (55000 - imponibile_irpef) / (55000 - 28000);
  }
  detrazione_lavoro = Math.max(0, Math.round(detrazione_lavoro * 100) / 100);

  const irpef_netta = Math.max(0, irpef_lorda - detrazione_lavoro);

  const addiz = imponibile_irpef * addizionali_val;
  const netto_annuo = compenso - contributo_inps - irpef_netta - addiz;

  // Costo azienda: compenso + INPS datore (se dipendente coop) + INAIL
  const inps_datore_coop = dettaglio_contributi?.tipo === 'dipendente_coop' ? dettaglio_contributi.inps_datore : 0;
  const costo_azienda = compenso + inps_datore_coop + inail;

  const fonti = [...tab.raccogliFonti(tipi_usati), ...fonti_extra];

  return {
    compenso,
    gestione_inps,
    label_gestione,
    contributo_inps,
    aliquota_inps,
    dettaglio_contributi,
    inail,
    costo_azienda,
    imponibile_irpef,
    // Dettaglio IRPEF per scaglione
    irpef_lorda,
    irpef_scaglione_1_importo,
    irpef_scaglione_2_importo,
    irpef_scaglione_3_importo,
    aliquota_scaglione_1: irpef_1,
    aliquota_scaglione_2: irpef_2,
    aliquota_scaglione_3: irpef_3,
    soglia_1,
    soglia_2,
    detrazione_lavoro,
    irpef: irpef_netta,
    addizionali: addiz,
    aliquota_addizionali: addizionali_val,
    netto_annuo,
    netto_mensile: netto_annuo / 12,
    fonti,
    anno: tab.anno,
    dataAggiornamento: tab.dataAggiornamento,
  };
}

/**
 * Motore di calcolo deterministico Gestione Separata INPS.
 * Per collaboratori/professionisti senza cassa. Aliquota piena su compenso lordo.
 * Non c'è INAIL obbligatorio (salvo eccezioni), non c'è TFR.
 */
export function calcolaCostoGestioneSeparata(params, tab) {
  const { compenso, ha_altra_copertura, contributiINPS } = params;

  const gs_totale = tab.get('inps_gestione_separata_totale'); // 35.03% aliquota piena da TabellaContributiva
  const gs_quota_datore = tab.get('inps_gestione_separata_quota_datore');
  const gs_quota_iscritto = tab.get('inps_gestione_separata_quota_iscritto');
  const irpef_1 = tab.get('irpef_scaglione_1');
  const irpef_2 = tab.get('irpef_scaglione_2');
  const irpef_3 = tab.get('irpef_scaglione_3');
  const soglia_1 = tab.get('irpef_soglia_1');
  const soglia_2 = tab.get('irpef_soglia_2');
  const addizionali_val = tab.get('addizionali_media');

  if ([gs_totale, gs_quota_datore, gs_quota_iscritto, irpef_1, soglia_1].some(v => v === null)) return null;

  const tipi_usati = [
    'inps_gestione_separata_totale', 'inps_gestione_separata_quota_datore', 'inps_gestione_separata_quota_iscritto',
    'irpef_scaglione_1', 'irpef_scaglione_2', 'irpef_scaglione_3',
    'irpef_soglia_1', 'irpef_soglia_2', 'addizionali_media',
  ];

  // Aliquota ridotta: usa entity ContributiINPS se disponibile (26.07% ufficiale), fallback 75% della piena
  const datiGS = contributiINPS?.find(c => c.gestione === 'GestioneSeparata');
  const aliquota_ridotta = datiGS?.aliquota_percentuale || gs_totale * 0.75;
  const massimale_reddito = datiGS?.massimale_reddito || null;
  const aliquota_effettiva = ha_altra_copertura ? aliquota_ridotta : gs_totale;
  const fonte_gs = tab.getFonte('inps_gestione_separata_totale');
  const contributo_totale = compenso * aliquota_effettiva;
  const quota_committente = contributo_totale * gs_quota_datore;
  const quota_collaboratore = contributo_totale * gs_quota_iscritto;

  // Costo committente
  const costo_committente = compenso + quota_committente;

  // Netto collaboratore — IRPEF per scaglione
  const imponibile_irpef_raw = compenso - quota_collaboratore;
  const imponibile_irpef = Math.max(0, imponibile_irpef_raw);

  let irpef_scaglione_1_importo = 0;
  let irpef_scaglione_2_importo = 0;
  let irpef_scaglione_3_importo = 0;

  if (imponibile_irpef > 0) {
    irpef_scaglione_1_importo = Math.min(imponibile_irpef, soglia_1) * irpef_1;
  }
  if (imponibile_irpef > soglia_1) {
    irpef_scaglione_2_importo = (Math.min(imponibile_irpef, soglia_2) - soglia_1) * irpef_2;
  }
  if (imponibile_irpef > soglia_2) {
    irpef_scaglione_3_importo = (imponibile_irpef - soglia_2) * irpef_3;
  }

  const irpef_lorda = irpef_scaglione_1_importo + irpef_scaglione_2_importo + irpef_scaglione_3_importo;

  // Detrazione lavoro art. 13 TUIR
  let detrazione_lavoro = 0;
  if (imponibile_irpef <= 15000 && imponibile_irpef > 0) {
    detrazione_lavoro = 1265;
  } else if (imponibile_irpef <= 28000) {
    detrazione_lavoro = 1265 * (28000 - imponibile_irpef) / (28000 - 15000);
  } else if (imponibile_irpef <= 55000) {
    detrazione_lavoro = 1265 * (55000 - imponibile_irpef) / (55000 - 28000);
  }
  detrazione_lavoro = Math.max(0, Math.round(detrazione_lavoro * 100) / 100);

  const irpef_netta = Math.max(0, irpef_lorda - detrazione_lavoro);
  const addiz = imponibile_irpef * addizionali_val;
  const netto_annuo = compenso - quota_collaboratore - irpef_netta - addiz;

  return {
    compenso,
    ha_altra_copertura,
    aliquota_effettiva,
    aliquota_piena: gs_totale,
    contributo_totale,
    quota_committente,
    quota_collaboratore,
    costo_committente,
    imponibile_irpef,
    irpef_lorda,
    irpef_scaglione_1_importo,
    irpef_scaglione_2_importo,
    irpef_scaglione_3_importo,
    aliquota_scaglione_1: irpef_1,
    aliquota_scaglione_2: irpef_2,
    aliquota_scaglione_3: irpef_3,
    soglia_1,
    soglia_2,
    detrazione_lavoro,
    irpef: irpef_netta,
    addizionali: addiz,
    aliquota_addizionali: addizionali_val,
    netto_annuo,
    netto_mensile: netto_annuo / 12,
    fonti: tab.raccogliFonti(tipi_usati),
    anno: tab.anno,
    dataAggiornamento: tab.dataAggiornamento,
  };
}