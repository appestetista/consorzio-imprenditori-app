/**
 * Struttura voci di costo — Art. 2425 c.c., sezione B (Costi della produzione)
 * 29 voci in 6 gruppi. Nessun riferimento normativo visibile in UI.
 */

export const COST_GROUPS = [
  {
    id: 'acquisti',
    label: 'Acquisti e Produzione',
    icon: '🏭',
    color: '#EF4444',
    items: [
      { id: 'materie_prime', label: 'Materie prime e componenti' },
      { id: 'semilavorati', label: 'Semilavorati e lavorazioni c/terzi' },
      { id: 'imballaggi', label: 'Imballaggi e confezionamento' },
      { id: 'materiali_consumo', label: 'Materiali di consumo, utensileria e DPI' },
      { id: 'smaltimento', label: 'Smaltimento rifiuti e oneri ambientali' },
    ]
  },
  {
    id: 'personale',
    label: 'Personale Dipendente',
    icon: '👷',
    color: '#3B82F6',
    items: [
      { id: 'stipendi', label: 'Salari e stipendi lordi dipendenti' },
      { id: 'oneri_sociali', label: 'Oneri sociali: contributi INPS e INAIL' },
      { id: 'tfr', label: 'TFR accantonato nell\'esercizio' },
      { id: 'interinale', label: 'Lavoro interinale e somministrato' },
      { id: 'formazione', label: 'Formazione obbligatoria e sicurezza' },
    ]
  },
  {
    id: 'struttura',
    label: 'Struttura e Utenze',
    icon: '🏢',
    color: '#8B5CF6',
    items: [
      { id: 'affitto', label: 'Affitto capannone e uffici' },
      { id: 'energia', label: 'Energia elettrica' },
      { id: 'gas', label: 'Gas e riscaldamento' },
      { id: 'acqua', label: 'Acqua' },
      { id: 'manutenzione', label: 'Manutenzione ordinaria impianti e fabbricato' },
      { id: 'pulizie', label: 'Pulizie, vigilanza e smaltimento' },
    ]
  },
  {
    id: 'servizi',
    label: 'Servizi Esterni',
    icon: '📋',
    color: '#F59E0B',
    items: [
      { id: 'trasporti', label: 'Trasporti, spedizioni e logistica' },
      { id: 'commercialista', label: 'Compenso commercialista e consulenze' },
      { id: 'legali', label: 'Spese legali e notarili' },
      { id: 'telefonia', label: 'Telefonia, internet e connettività' },
      { id: 'software', label: 'Software, licenze e abbonamenti digitali' },
      { id: 'marketing', label: 'Marketing, pubblicità e fiere' },
    ]
  },
  {
    id: 'ammortamenti',
    label: 'Ammortamenti e Oneri Finanziari',
    icon: '🏦',
    color: '#10B981',
    items: [
      { id: 'amm_macchinari', label: 'Ammortamento macchinari e attrezzature' },
      { id: 'amm_fabbricato', label: 'Ammortamento fabbricato e migliorie' },
      { id: 'leasing', label: 'Canoni leasing e noleggio operativo' },
      { id: 'interessi', label: 'Interessi passivi su mutui e finanziamenti' },
    ]
  },
  {
    id: 'diversi',
    label: 'Oneri Diversi di Gestione',
    icon: '📦',
    color: '#6B7280',
    items: [
      { id: 'assicurazioni', label: 'Assicurazioni aziendali' },
      { id: 'tributi', label: 'IMU, TARI e tributi locali' },
      { id: 'viaggi', label: 'Viaggi, trasferte e rimborsi piè di lista' },
      { id: 'rappresentanza', label: 'Spese di rappresentanza e omaggi' },
      { id: 'varie', label: 'Varie e imprevisti' },
    ]
  }
];

// Tutti gli ID delle 29 voci in ordine piatto
export const ALL_ITEM_IDS = COST_GROUPS.flatMap(g => g.items.map(i => i.id));

/**
 * Preset ATECO — distribuzione % dei costi operativi per macro-settore.
 * Ogni preset somma a 100 (viene poi moltiplicato per il totale costi).
 * Valori arrotondati a €500 in fase di applicazione.
 */
export const ATECO_PRESETS = {
  'Manifattura': {
    materie_prime: 28, semilavorati: 8, imballaggi: 3, materiali_consumo: 2, smaltimento: 1,
    stipendi: 18, oneri_sociali: 6, tfr: 2, interinale: 1, formazione: 0.5,
    affitto: 5, energia: 4, gas: 1.5, acqua: 0.5, manutenzione: 2, pulizie: 0.5,
    trasporti: 3, commercialista: 1.5, legali: 0.5, telefonia: 0.5, software: 1, marketing: 1.5,
    amm_macchinari: 3, amm_fabbricato: 1.5, leasing: 1, interessi: 1,
    assicurazioni: 1, tributi: 0.5, viaggi: 0.5, rappresentanza: 0.3, varie: 0.2,
  },
  'Commercio': {
    materie_prime: 40, semilavorati: 0, imballaggi: 2, materiali_consumo: 1, smaltimento: 0.5,
    stipendi: 12, oneri_sociali: 4, tfr: 1.5, interinale: 1, formazione: 0.5,
    affitto: 8, energia: 2, gas: 1, acqua: 0.3, manutenzione: 1, pulizie: 0.5,
    trasporti: 5, commercialista: 1.5, legali: 0.5, telefonia: 0.5, software: 1.5, marketing: 3,
    amm_macchinari: 1, amm_fabbricato: 1, leasing: 2, interessi: 1,
    assicurazioni: 1.5, tributi: 1, viaggi: 2, rappresentanza: 1, varie: 1.7,
  },
  'Servizi': {
    materie_prime: 2, semilavorati: 0, imballaggi: 0, materiali_consumo: 1, smaltimento: 0.5,
    stipendi: 30, oneri_sociali: 10, tfr: 3, interinale: 2, formazione: 1.5,
    affitto: 8, energia: 2, gas: 1, acqua: 0.3, manutenzione: 1, pulizie: 0.7,
    trasporti: 1, commercialista: 2, legali: 1, telefonia: 1.5, software: 4, marketing: 5,
    amm_macchinari: 1, amm_fabbricato: 1, leasing: 2, interessi: 1,
    assicurazioni: 2, tributi: 1, viaggi: 3, rappresentanza: 2, varie: 9.5,
  },
  'Edilizia': {
    materie_prime: 25, semilavorati: 10, imballaggi: 0.5, materiali_consumo: 3, smaltimento: 3,
    stipendi: 15, oneri_sociali: 5.5, tfr: 2, interinale: 3, formazione: 1,
    affitto: 3, energia: 2, gas: 0.5, acqua: 0.3, manutenzione: 2, pulizie: 0.5,
    trasporti: 5, commercialista: 1.5, legali: 1, telefonia: 0.5, software: 0.5, marketing: 1,
    amm_macchinari: 4, amm_fabbricato: 1, leasing: 3, interessi: 1.5,
    assicurazioni: 2, tributi: 0.5, viaggi: 1, rappresentanza: 0.5, varie: 0.7,
  },
  'Ristorazione': {
    materie_prime: 30, semilavorati: 2, imballaggi: 2, materiali_consumo: 2, smaltimento: 1,
    stipendi: 18, oneri_sociali: 6, tfr: 2, interinale: 1, formazione: 0.5,
    affitto: 10, energia: 3, gas: 2, acqua: 0.5, manutenzione: 1.5, pulizie: 1,
    trasporti: 1, commercialista: 1.5, legali: 0.5, telefonia: 0.5, software: 1, marketing: 2,
    amm_macchinari: 2, amm_fabbricato: 1, leasing: 1.5, interessi: 1,
    assicurazioni: 1.5, tributi: 1, viaggi: 0.5, rappresentanza: 1, varie: 1.5,
  },
  'Tech / Digitale': {
    materie_prime: 0, semilavorati: 0, imballaggi: 0, materiali_consumo: 0.5, smaltimento: 0,
    stipendi: 35, oneri_sociali: 12, tfr: 3, interinale: 2, formazione: 2,
    affitto: 5, energia: 1.5, gas: 0.5, acqua: 0.2, manutenzione: 0.5, pulizie: 0.3,
    trasporti: 0.5, commercialista: 2, legali: 1.5, telefonia: 2, software: 8, marketing: 6,
    amm_macchinari: 1.5, amm_fabbricato: 0.5, leasing: 1, interessi: 0.5,
    assicurazioni: 1.5, tributi: 0.5, viaggi: 3, rappresentanza: 2, varie: 6.5,
  },
};

/**
 * Dato un totale costi e un preset, restituisce le 29 voci con valori arrotondati a €500.
 * Ricalibra alla fine per far quadrare il totale.
 */
export function applyPreset(totaleCosti, presetName) {
  const preset = ATECO_PRESETS[presetName];
  if (!preset) return null;

  const values = {};
  let sum = 0;
  for (const id of ALL_ITEM_IDS) {
    const perc = preset[id] || 0;
    const raw = totaleCosti * (perc / 100);
    const rounded = Math.round(raw / 500) * 500;
    values[id] = rounded;
    sum += rounded;
  }

  // Aggiusta la differenza sulla voce più grande
  const diff = totaleCosti - sum;
  if (diff !== 0) {
    const maxId = ALL_ITEM_IDS.reduce((a, b) => (values[a] >= values[b] ? a : b));
    values[maxId] += diff;
  }

  return values;
}

/**
 * Dato un oggetto {id: valore}, riscala proporzionalmente per ottenere newTotal.
 * Arrotonda a €500. 
 */
export function rescaleItems(items, newTotal) {
  const currentTotal = ALL_ITEM_IDS.reduce((s, id) => s + (items[id] || 0), 0);
  if (currentTotal === 0) return items;
  const ratio = newTotal / currentTotal;
  const scaled = {};
  let sum = 0;
  for (const id of ALL_ITEM_IDS) {
    const v = Math.round(((items[id] || 0) * ratio) / 500) * 500;
    scaled[id] = v;
    sum += v;
  }
  const diff = newTotal - sum;
  if (diff !== 0) {
    const maxId = ALL_ITEM_IDS.reduce((a, b) => ((scaled[a] || 0) >= (scaled[b] || 0) ? a : b));
    scaled[maxId] = (scaled[maxId] || 0) + diff;
  }
  return scaled;
}

/**
 * Dato un oggetto {id: valore}, calcola il totale.
 */
export function totalFromItems(items) {
  return ALL_ITEM_IDS.reduce((s, id) => s + (items[id] || 0), 0);
}

/**
 * Crea item values di default da un totale e un preset (default: Servizi).
 */
export function defaultItemValues(totaleCosti, presetName = 'Servizi') {
  return applyPreset(totaleCosti, presetName) || {};
}