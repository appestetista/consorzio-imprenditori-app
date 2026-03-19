/**
 * PALLET & CARGO VALIDATOR + DATA TABLES
 * 
 * Tabella pallet di riferimento (dati certificati):
 * ┌───────────────────────┬────────────┬──────────┬────────────┬────────────┬──────────────────┬──────────────────────┐
 * │ Tipo pallet           │ Dim. (cm)  │ Alt. (cm)│ Port. din. │ Port. stat.│ Alt. max camion  │ Alt. max container   │
 * ├───────────────────────┼────────────┼──────────┼────────────┼────────────┼──────────────────┼──────────────────────┤
 * │ Europallet (EPAL 1)   │ 120 × 80   │ 14.4     │ 1.500 kg   │ 4.000 kg   │ 240–260 cm       │ 220–235 cm           │
 * │ Industriale (EUR 2)   │ 120 × 100  │ ~14      │ 1.500–2.000│ 4.000 kg   │ 240–260 cm       │ 220–235 cm           │
 * │ EUR 3                 │ 100 × 120  │ ~14      │ 1.500 kg   │ 4.000 kg   │ 240–260 cm       │ 220–235 cm           │
 * │ Mezzo pallet          │ 80 × 60    │ ~14      │ 500–1.000  │ 2.000 kg   │ 200–240 cm       │ 200–220 cm           │
 * │ Pallet USA (GMA)      │ 121.9×101.6│ ~14      │ 1.500 kg   │ 4.000 kg   │ 240–260 cm       │ 220–235 cm           │
 * │ Pallet leggero        │ variabile  │ 12–15    │ 500–1.000  │ 1.500–2.500│ 180–220 cm       │ 180–220 cm           │
 * └───────────────────────┴────────────┴──────────┴────────────┴────────────┴──────────────────┴──────────────────────┘
 */

export const PALLET_DB = [
  { id: 'epal1', name: 'Europallet (EPAL 1)', l_cm: 120, w_cm: 80,    h_cm: 14.4, dynamic_kg: 1500, static_kg: 4000, max_h_truck_cm: 260, max_h_container_cm: 235 },
  { id: 'eur2',  name: 'Industriale (EUR 2)', l_cm: 120, w_cm: 100,   h_cm: 14,   dynamic_kg: 2000, static_kg: 4000, max_h_truck_cm: 260, max_h_container_cm: 235 },
  { id: 'eur3',  name: 'EUR 3',               l_cm: 100, w_cm: 120,   h_cm: 14,   dynamic_kg: 1500, static_kg: 4000, max_h_truck_cm: 260, max_h_container_cm: 235 },
  { id: 'half',  name: 'Mezzo pallet',        l_cm: 80,  w_cm: 60,    h_cm: 14,   dynamic_kg: 1000, static_kg: 2000, max_h_truck_cm: 240, max_h_container_cm: 220 },
  { id: 'gma',   name: 'Pallet USA (GMA)',    l_cm: 121.9, w_cm: 101.6, h_cm: 14, dynamic_kg: 1500, static_kg: 4000, max_h_truck_cm: 260, max_h_container_cm: 235 },
  { id: 'oneway',name: 'Pallet leggero',      l_cm: 120, w_cm: 80,    h_cm: 13,   dynamic_kg: 1000, static_kg: 2500, max_h_truck_cm: 220, max_h_container_cm: 220 },
];

/** Dimensioni interne veicoli standard (cm) */
export const VEHICLE_DB = [
  { id: 'container20',  name: "Container 20'",    l_cm: 590,  w_cm: 235, h_cm: 239, max_kg: 25000 },
  { id: 'container40hc',name: "Container 40' HC",  l_cm: 1203, w_cm: 235, h_cm: 269, max_kg: 26480 },
  { id: 'truck13',      name: "Camion 13.6 m",     l_cm: 1360, w_cm: 245, h_cm: 270, max_kg: 24000 },
];

/**
 * Valida e normalizza tutti gli input del cargo.
 * @returns {{ valid: boolean, errors: string[], data: object }}
 */
export function validateCargoInputs(raw) {
  const errors = [];

  const fields = [
    { key: 'lunghezza_collo',    label: 'Lunghezza collo (cm)' },
    { key: 'larghezza_collo',    label: 'Larghezza collo (cm)' },
    { key: 'altezza_collo',      label: 'Altezza collo (cm)' },
    { key: 'peso_collo',         label: 'Peso collo (kg)' },
    { key: 'quantita',           label: 'Quantità colli' },
  ];

  // Opzionali: pallet e mezzo (se forniti devono essere > 0)
  const palletFields = [
    { key: 'lunghezza_pallet',   label: 'Lunghezza pallet (cm)' },
    { key: 'larghezza_pallet',   label: 'Larghezza pallet (cm)' },
    { key: 'altezza_max_pallet', label: 'Altezza max pallet (cm)' },
  ];

  const mezzoFields = [
    { key: 'lunghezza_mezzo',    label: 'Lunghezza mezzo (cm)' },
    { key: 'larghezza_mezzo',    label: 'Larghezza mezzo (cm)' },
    { key: 'altezza_mezzo',      label: 'Altezza mezzo (cm)' },
    { key: 'peso_max_mezzo',     label: 'Peso max mezzo (kg)' },
  ];

  const data = {};

  // Valida campi obbligatori
  for (const f of fields) {
    const val = parseFloat(raw[f.key]);
    if (isNaN(val) || val <= 0) {
      errors.push(`${f.label}: valore obbligatorio e > 0`);
    } else {
      data[f.key] = val;
    }
  }

  // Quantità deve essere intero
  if (data.quantita) {
    data.quantita = Math.round(data.quantita);
  }

  // Valida pallet (se almeno un campo compilato, tutti obbligatori)
  const hasPallet = palletFields.some(f => raw[f.key] && parseFloat(raw[f.key]) > 0);
  data.has_pallet_custom = hasPallet;
  if (hasPallet) {
    for (const f of palletFields) {
      const val = parseFloat(raw[f.key]);
      if (isNaN(val) || val <= 0) {
        errors.push(`${f.label}: obbligatorio se si specificano dimensioni pallet`);
      } else {
        data[f.key] = val;
      }
    }
  }

  // Valida mezzo (se almeno un campo compilato, tutti obbligatori)
  const hasMezzo = mezzoFields.some(f => raw[f.key] && parseFloat(raw[f.key]) > 0);
  data.has_mezzo_custom = hasMezzo;
  if (hasMezzo) {
    for (const f of mezzoFields) {
      const val = parseFloat(raw[f.key]);
      if (isNaN(val) || val <= 0) {
        errors.push(`${f.label}: obbligatorio se si specificano dimensioni mezzo`);
      } else {
        data[f.key] = val;
      }
    }
  }

  // Calcoli derivati se validazione OK
  if (errors.length === 0 && data.lunghezza_collo) {
    const vol_collo_cm3 = data.lunghezza_collo * data.larghezza_collo * data.altezza_collo;
    data.volume_collo_m3 = Math.round((vol_collo_cm3 / 1e6) * 10000) / 10000;
    data.volume_totale_m3 = Math.round(data.volume_collo_m3 * data.quantita * 10000) / 10000;
    data.peso_totale_kg = Math.round(data.peso_collo * data.quantita * 100) / 100;
  }

  return { valid: errors.length === 0, errors, data };
}

/**
 * Genera tutte le 6 rotazioni possibili di un collo.
 * Ogni rotazione è { l, w, h } dove l=lunghezza base, w=larghezza base, h=altezza.
 * @param {number} L - lunghezza_collo (cm)
 * @param {number} W - larghezza_collo (cm)
 * @param {number} H - altezza_collo (cm)
 * @returns {Array<{l: number, w: number, h: number, label: string}>}
 */
export function generateBoxRotations(L, W, H) {
  return [
    { l: L, w: W, h: H, label: `${L}×${W}×${H}` },
    { l: L, w: H, h: W, label: `${L}×${H}×${W}` },
    { l: W, w: L, h: H, label: `${W}×${L}×${H}` },
    { l: W, w: H, h: L, label: `${W}×${H}×${L}` },
    { l: H, w: L, h: W, label: `${H}×${L}×${W}` },
    { l: H, w: W, h: L, label: `${H}×${W}×${L}` },
  ];
}

/**
 * Calcola quanti colli entrano su un pallet provando tutti gli orientamenti.
 * @param {Array<{l,w,h,label}>} orientamenti - da generateBoxRotations
 * @param {number} lunghezza_pallet - cm
 * @param {number} larghezza_pallet - cm
 * @param {number} altezza_max_pallet - cm (altezza utile sopra il pallet)
 * @returns {{ capacita_pallet: number, orientamento_scelto: object|null, flag_no_pallet: boolean, dettaglio: Array }}
 */
export function calcPalletCapacity(orientamenti, lunghezza_pallet, larghezza_pallet, altezza_max_pallet) {
  const dettaglio = [];

  for (const o of orientamenti) {
    const nx = Math.floor(lunghezza_pallet / o.l);
    const ny = Math.floor(larghezza_pallet / o.w);
    const nz = Math.floor(altezza_max_pallet / o.h);
    const capacita = nx * ny * nz;

    if (capacita > 0) {
      dettaglio.push({ ...o, nx, ny, nz, capacita });
    }
  }

  if (dettaglio.length === 0) {
    return { capacita_pallet: 0, orientamento_scelto: null, flag_no_pallet: true, dettaglio: [] };
  }

  dettaglio.sort((a, b) => b.capacita - a.capacita);
  const best = dettaglio[0];

  return {
    capacita_pallet: best.capacita,
    orientamento_scelto: best,
    flag_no_pallet: false,
    dettaglio,
  };
}

/**
 * Calcola quanti pallet servono per una data quantità di colli.
 * @param {number} quantita - numero totale di colli
 * @param {number} capacita_pallet - colli per pallet (da calcPalletCapacity)
 * @returns {{ pallet_necessari: number }}
 */
export function calcPalletCount(quantita, capacita_pallet) {
  if (!capacita_pallet || capacita_pallet <= 0) return { pallet_necessari: 0 };
  return { pallet_necessari: Math.ceil(quantita / capacita_pallet) };
}

/**
 * Calcola quanti pallet entrano nel mezzo (piano singolo).
 * @param {number} lunghezza_mezzo - cm
 * @param {number} larghezza_mezzo - cm
 * @param {number} lunghezza_pallet - cm
 * @param {number} larghezza_pallet - cm
 * @returns {{ pallet_per_mezzo: number }}
 */
export function calcPalletsPerMezzo(lunghezza_mezzo, larghezza_mezzo, lunghezza_pallet, larghezza_pallet) {
  const px = Math.floor(lunghezza_mezzo / lunghezza_pallet);
  const py = Math.floor(larghezza_mezzo / larghezza_pallet);
  return { pallet_per_mezzo: px * py };
}