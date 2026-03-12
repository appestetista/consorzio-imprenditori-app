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
    { id: 'bilancio', label: 'Bilancio', sub: 'Entrate e uscite' },
    { id: 'irpef', label: 'IRPEF soci', sub: 'Tasse sui guadagni personali' },
    { id: 'inps', label: 'Contributi INPS', sub: 'Pensione e previdenza' },
    { id: 'netto', label: 'Netto soci', sub: 'Quanto resta in tasca' },
  ],
  SNC: [
    { id: 'bilancio', label: 'Bilancio', sub: 'Entrate e uscite' },
    { id: 'iva', label: 'IVA', sub: 'Tassa su vendite e acquisti' },
    { id: 'irpef', label: 'IRPEF soci', sub: 'Tasse sui guadagni personali' },
    { id: 'inps', label: 'INPS soci', sub: 'Pensione e previdenza' },
    { id: 'netto', label: 'Netto soci', sub: 'Quanto resta in tasca' },
  ],
  SAS: [
    { id: 'bilancio', label: 'Bilancio', sub: 'Entrate e uscite' },
    { id: 'iva', label: 'IVA', sub: 'Tassa su vendite e acquisti' },
    { id: 'irpef', label: 'IRPEF soci', sub: 'Tasse sui guadagni personali' },
    { id: 'inps', label: 'INPS accomandatari', sub: 'Pensione e previdenza' },
    { id: 'netto', label: 'Netto soci', sub: 'Quanto resta in tasca' },
  ],
  SRL: [
    { id: 'bilancio', label: 'Bilancio', sub: 'Entrate e uscite' },
    { id: 'iva', label: 'IVA', sub: 'Tassa su vendite e acquisti' },
    { id: 'ires', label: 'IRES', sub: 'Tassa sugli utili aziendali' },
    { id: 'irap', label: 'IRAP', sub: 'Tassa regionale' },
    { id: 'compenso', label: 'Compenso amm.', sub: 'Stipendio amministratore' },
    { id: 'dividendi', label: 'Dividendi', sub: 'Utili distribuiti ai soci' },
    { id: 'inps', label: 'Contributi INPS', sub: 'Pensione e previdenza' },
    { id: 'netto', label: 'Netto socio', sub: 'Quanto resta in tasca' },
  ],
  SRLU: [
    { id: 'bilancio', label: 'Bilancio', sub: 'Entrate e uscite' },
    { id: 'iva', label: 'IVA', sub: 'Tassa su vendite e acquisti' },
    { id: 'ires', label: 'IRES', sub: 'Tassa sugli utili aziendali' },
    { id: 'irap', label: 'IRAP', sub: 'Tassa regionale' },
    { id: 'compenso', label: 'Compenso amm.', sub: 'Stipendio amministratore' },
    { id: 'dividendi', label: 'Dividendi', sub: 'Utili socio unico' },
    { id: 'inps', label: 'Contributi INPS', sub: 'Pensione e previdenza' },
    { id: 'netto', label: 'Netto socio', sub: 'Quanto resta in tasca' },
  ],
  SPA: [
    { id: 'bilancio', label: 'Bilancio', sub: 'Entrate e uscite' },
    { id: 'iva', label: 'IVA', sub: 'Tassa su vendite e acquisti' },
    { id: 'ires', label: 'IRES', sub: 'Tassa sugli utili aziendali' },
    { id: 'irap', label: 'IRAP', sub: 'Tassa regionale' },
    { id: 'dividendi', label: 'Dividendi', sub: 'Utili per gli azionisti' },
    { id: 'netto', label: 'Netto azionista', sub: 'Quanto resta in tasca' },
  ],
  SAPA: [
    { id: 'bilancio', label: 'Bilancio', sub: 'Entrate e uscite' },
    { id: 'iva', label: 'IVA', sub: 'Tassa su vendite e acquisti' },
    { id: 'ires', label: 'IRES', sub: 'Tassa sugli utili aziendali' },
    { id: 'irap', label: 'IRAP', sub: 'Tassa regionale' },
    { id: 'dividendi', label: 'Dividendi soci', sub: 'Utili distribuiti' },
    { id: 'netto', label: 'Netto soci', sub: 'Quanto resta in tasca' },
  ],
  COOP: [
    { id: 'bilancio', label: 'Bilancio', sub: 'Entrate e uscite' },
    { id: 'iva', label: 'IVA', sub: 'Tassa su vendite e acquisti' },
    { id: 'ires', label: 'IRES agevolata', sub: 'Tassa utili con sconti' },
    { id: 'ristorni', label: 'Ristorni soci', sub: 'Utili per i soci lavoratori' },
    { id: 'inps', label: 'INPS soci', sub: 'Pensione e previdenza' },
    { id: 'netto', label: 'Netto soci', sub: 'Quanto resta in tasca' },
  ],
  RF: [
    { id: 'ricavi', label: 'Ricavi', sub: 'Quanto fatturi all\'anno' },
    { id: 'coefficiente', label: 'Coefficiente', sub: '% su cui paghi le tasse' },
    { id: 'imposta_sost', label: 'Imposta', sub: 'Tassa fissa 5% o 15%' },
    { id: 'inps', label: 'Contributi INPS', sub: 'Pensione e previdenza' },
    { id: 'netto', label: 'Netto', sub: 'Quanto resta in tasca' },
  ],
  SE: [
    { id: 'bilancio', label: 'Bilancio', sub: 'Entrate e uscite' },
    { id: 'iva_ue', label: 'IVA UE', sub: 'IVA tra paesi europei' },
    { id: 'ires', label: 'IRES', sub: 'Tassa sugli utili aziendali' },
    { id: 'irap', label: 'IRAP', sub: 'Tassa regionale' },
    { id: 'dividendi', label: 'Dividendi soci', sub: 'Utili distribuiti' },
    { id: 'netto', label: 'Netto', sub: 'Quanto resta in tasca' },
  ],
};

// Tabs di default per forme giuridiche non mappate
const DEFAULT_TABS = [
  { id: 'bilancio', label: 'Bilancio', sub: 'Entrate e uscite' },
  { id: 'iva', label: 'IVA', sub: 'Tassa su vendite e acquisti' },
  { id: 'irpef', label: 'Tasse personali', sub: 'Tasse sui tuoi guadagni' },
  { id: 'inps', label: 'Contributi INPS', sub: 'Pensione e previdenza' },
  { id: 'netto', label: 'Netto', sub: 'Quanto resta in tasca' },
];

export function getTabsForSocieta(formaGiuridica) {
  return SOCIETA_TABS[formaGiuridica] || DEFAULT_TABS;
}

export function getTabImage(tabId) {
  return TAB_IMAGES[tabId] || null;
}

export default SOCIETA_TABS;