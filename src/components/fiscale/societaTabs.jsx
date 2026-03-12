// Mappa immagini per tab ID
const TAB_IMAGES = {
  bilancio: 'https://media.base44.com/images/public/695e2f74bb7d2636b5606a98/a94b3d1cb_ChatGPT_Image_12_mar_2026__10_04_08-removebg-preview.png',
  iva: 'https://media.base44.com/images/public/695e2f74bb7d2636b5606a98/d2d3e22d6_ChatGPT_Image_12_mar_2026__09_49_04-removebg-preview.png',
  iva_ue: 'https://media.base44.com/images/public/695e2f74bb7d2636b5606a98/d2d3e22d6_ChatGPT_Image_12_mar_2026__09_49_04-removebg-preview.png',
  ires: 'https://media.base44.com/images/public/695e2f74bb7d2636b5606a98/82ed1b886_Icona_IRES_con_edifici_e_documenti-removebg-preview.png',
  irap: 'https://media.base44.com/images/public/695e2f74bb7d2636b5606a98/32ecc4391_ChatGPT_Image_12_mar_2026__09_41_01-removebg-preview.png',
  irpef: 'https://media.base44.com/images/public/695e2f74bb7d2636b5606a98/32ecc4391_ChatGPT_Image_12_mar_2026__09_41_01-removebg-preview.png',
  compenso: 'https://media.base44.com/images/public/695e2f74bb7d2636b5606a98/bdd8d6560_ChatGPT_Image_12_mar_2026__09_55_39-removebg-preview.png',
  dividendi: 'https://media.base44.com/images/public/695e2f74bb7d2636b5606a98/c7199eeca_ChatGPT_Image_12_mar_2026__09_53_11-removebg-preview.png',
  ristorni: 'https://media.base44.com/images/public/695e2f74bb7d2636b5606a98/c7199eeca_ChatGPT_Image_12_mar_2026__09_53_11-removebg-preview.png',
  inps: 'https://media.base44.com/images/public/695e2f74bb7d2636b5606a98/edcb1599c_ChatGPT_Image_12_mar_2026__09_58_35-removebg-preview.png',
  netto: 'https://media.base44.com/images/public/695e2f74bb7d2636b5606a98/bdd9c6cd6_ChatGPT_Image_12_mar_2026__10_00_53-removebg-preview.png',
  ricavi: 'https://media.base44.com/images/public/695e2f74bb7d2636b5606a98/a94b3d1cb_ChatGPT_Image_12_mar_2026__10_04_08-removebg-preview.png',
  coefficiente: 'https://media.base44.com/images/public/695e2f74bb7d2636b5606a98/a94b3d1cb_ChatGPT_Image_12_mar_2026__10_04_08-removebg-preview.png',
  imposta_sost: 'https://media.base44.com/images/public/695e2f74bb7d2636b5606a98/32ecc4391_ChatGPT_Image_12_mar_2026__09_41_01-removebg-preview.png',
};

// Configurazione tab per tipo di società
const SOCIETA_TABS = {
  SS: [
    { id: 'bilancio', label: 'Bilancio', sub: 'Conto Economico' },
    { id: 'irpef', label: 'IRPEF soci', sub: 'Imposta Reddito Persone Fisiche' },
    { id: 'inps', label: 'Contributi INPS', sub: 'Contributi previdenziali' },
    { id: 'netto', label: 'Reddito netto soci', sub: 'Disponibile dopo imposte' },
  ],
  SNC: [
    { id: 'bilancio', label: 'Bilancio', sub: 'Conto Economico' },
    { id: 'iva', label: 'IVA', sub: 'Imposta Valore Aggiunto' },
    { id: 'irpef', label: 'IRPEF soci', sub: 'Imposta Reddito Persone Fisiche' },
    { id: 'inps', label: 'Contributi INPS soci', sub: 'Gestione commercianti/artigiani' },
    { id: 'netto', label: 'Reddito netto soci', sub: 'Disponibile dopo imposte' },
  ],
  SAS: [
    { id: 'bilancio', label: 'Bilancio', sub: 'Conto Economico' },
    { id: 'iva', label: 'IVA', sub: 'Imposta Valore Aggiunto' },
    { id: 'irpef', label: 'IRPEF soci', sub: 'Imposta Reddito Persone Fisiche' },
    { id: 'inps', label: 'INPS accomandatari', sub: 'Contributi previdenziali' },
    { id: 'netto', label: 'Reddito netto soci', sub: 'Disponibile dopo imposte' },
  ],
  SRL: [
    { id: 'bilancio', label: 'Bilancio', sub: 'Conto Economico' },
    { id: 'iva', label: 'IVA', sub: 'Imposta Valore Aggiunto' },
    { id: 'ires', label: 'IRES', sub: 'Imposta Reddito Società' },
    { id: 'irap', label: 'IRAP', sub: 'Imposta Regionale Attività' },
    { id: 'compenso', label: 'Compenso amm.', sub: 'Tassazione IRPEF' },
    { id: 'dividendi', label: 'Dividendi', sub: 'Distribuzione utili ai soci' },
    { id: 'inps', label: 'Contributi INPS', sub: 'Gestione separata/commercianti' },
    { id: 'netto', label: 'Reddito netto socio', sub: 'Disponibile dopo imposte' },
  ],
  SRLU: [
    { id: 'bilancio', label: 'Bilancio', sub: 'Conto Economico' },
    { id: 'iva', label: 'IVA', sub: 'Imposta Valore Aggiunto' },
    { id: 'ires', label: 'IRES', sub: 'Imposta Reddito Società' },
    { id: 'irap', label: 'IRAP', sub: 'Imposta Regionale Attività' },
    { id: 'compenso', label: 'Compenso amm.', sub: 'IRPEF' },
    { id: 'dividendi', label: 'Dividendi socio unico', sub: 'Distribuzione utili' },
    { id: 'inps', label: 'Contributi INPS', sub: 'Contributi previdenziali' },
    { id: 'netto', label: 'Reddito netto socio', sub: 'Disponibile dopo imposte' },
  ],
  SPA: [
    { id: 'bilancio', label: 'Bilancio', sub: 'Conto Economico' },
    { id: 'iva', label: 'IVA', sub: 'Imposta Valore Aggiunto' },
    { id: 'ires', label: 'IRES', sub: 'Imposta Reddito Società' },
    { id: 'irap', label: 'IRAP', sub: 'Imposta Regionale Attività' },
    { id: 'dividendi', label: 'Dividendi azionisti', sub: 'Distribuzione utili' },
    { id: 'netto', label: 'Reddito netto azionista', sub: 'Disponibile dopo imposte' },
  ],
  SAPA: [
    { id: 'bilancio', label: 'Bilancio', sub: 'Conto Economico' },
    { id: 'iva', label: 'IVA', sub: 'Imposta Valore Aggiunto' },
    { id: 'ires', label: 'IRES', sub: 'Imposta Reddito Società' },
    { id: 'irap', label: 'IRAP', sub: 'Imposta Regionale Attività' },
    { id: 'dividendi', label: 'Dividendi soci', sub: 'Distribuzione utili' },
    { id: 'netto', label: 'Reddito netto soci', sub: 'Disponibile dopo imposte' },
  ],
  COOP: [
    { id: 'bilancio', label: 'Bilancio', sub: 'Conto Economico' },
    { id: 'iva', label: 'IVA', sub: 'Imposta Valore Aggiunto' },
    { id: 'ires', label: 'IRES agevolata', sub: 'Imposta Reddito Società' },
    { id: 'ristorni', label: 'Ristorni soci', sub: 'Distribuzione utili soci lavoratori' },
    { id: 'inps', label: 'Contributi INPS soci', sub: 'Contributi previdenziali' },
    { id: 'netto', label: 'Reddito netto soci', sub: 'Disponibile dopo imposte' },
  ],
  RF: [
    { id: 'ricavi', label: 'Ricavi', sub: 'Fatturato annuo' },
    { id: 'coefficiente', label: 'Coeff. redditività', sub: '% reddito imponibile' },
    { id: 'imposta_sost', label: 'Imposta sostitutiva', sub: '5% o 15%' },
    { id: 'inps', label: 'Contributi INPS', sub: 'Gestione artigiani/commercianti' },
    { id: 'netto', label: 'Reddito netto', sub: 'Disponibile dopo imposte' },
  ],
  SE: [
    { id: 'bilancio', label: 'Bilancio', sub: 'Conto Economico' },
    { id: 'iva_ue', label: 'IVA UE', sub: 'IVA intracomunitaria' },
    { id: 'ires', label: 'IRES', sub: 'Imposta Reddito Società' },
    { id: 'irap', label: 'IRAP', sub: 'Imposta Regionale Attività' },
    { id: 'dividendi', label: 'Dividendi soci', sub: 'Distribuzione utili' },
    { id: 'netto', label: 'Reddito netto', sub: 'Disponibile dopo imposte' },
  ],
};

// Tabs di default per forme giuridiche non mappate
const DEFAULT_TABS = [
  { id: 'bilancio', label: 'Bilancio', sub: 'Conto Economico' },
  { id: 'iva', label: 'IVA', sub: 'Imposta Valore Aggiunto' },
  { id: 'irpef', label: 'Tasse personali', sub: 'IRPEF' },
  { id: 'inps', label: 'Contributi INPS', sub: 'Contributi previdenziali' },
  { id: 'netto', label: 'Reddito netto', sub: 'Disponibile dopo imposte' },
];

export function getTabsForSocieta(formaGiuridica) {
  return SOCIETA_TABS[formaGiuridica] || DEFAULT_TABS;
}

export function getTabImage(tabId) {
  return TAB_IMAGES[tabId] || null;
}

export default SOCIETA_TABS;