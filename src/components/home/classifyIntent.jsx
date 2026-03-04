/**
 * Classificazione intento utente lato client — zero chiamate AI.
 * Mappa keyword → categoria con confidenza alta.
 * Restituisce { categoria, sottocategoria, confidenza }
 */

const RULES = [
  // Fiscale
  {
    categoria: 'Fiscale',
    keywords: ['tasse', 'imposte', 'iva', 'irpef', 'ires', 'irap', 'f24', 'dichiarazione', 'regime forfettario', 'regime ordinario', 'regime semplificato', 'credito d\'imposta', 'detrazioni', 'deduzioni', 'fattura', 'fatturazione', 'scontrino', 'corrispettivi', 'agenzia entrate', 'fisco', 'fiscale', 'tribut', 'acconto', 'saldo', 'ravvedimento', 'sanzione fiscale', 'cartella esattoriale', 'equitalia', 'agenzia riscossione', 'codice tributo', 'modello unico', 'redditi', '730', 'cedolare', 'imu', 'tari', 'tasi', 'bollo', 'imposta di registro', 'ritenuta', 'sostituto d\'imposta', 'split payment', 'reverse charge', 'autofattura', 'nota di credito', 'scadenza fiscale', 'adempimento', 'contributi inps'],
    sottocategoria: 'Adempimenti e imposte',
  },
  // Legale
  {
    categoria: 'Legale',
    keywords: ['contratto', 'clausola', 'causa', 'tribunale', 'avvocato', 'legale', 'gdpr', 'privacy', 'responsabilità', 'risarcimento', 'diritto', 'normativa', 'legge', 'decreto', 'regolamento', 'codice civile', 'codice penale', 'contenzioso', 'arbitrato', 'mediazione', 'brevetto', 'marchio', 'proprietà intellettuale', 'licenza', 'statuto', 'atto costitutivo', 'visura', 'camera di commercio', 'pec', 'firma digitale', 'notaio', 'procura', 'mandato', 'diffida', 'inadempimento', 'penale', 'recesso', 'disdetta', 'preavviso'],
    sottocategoria: 'Contratti e normativa',
  },
  // Personale/HR
  {
    categoria: 'Personale/HR',
    keywords: ['dipendente', 'dipendenti', 'assunzione', 'assumere', 'licenziamento', 'licenziare', 'stipendio', 'busta paga', 'ccnl', 'contratto lavoro', 'tfr', 'ferie', 'permessi', 'malattia', 'maternità', 'paternità', 'inps', 'inail', 'contributi previdenziali', 'welfare', 'buoni pasto', 'fringe benefit', 'straordinario', 'part-time', 'full-time', 'apprendista', 'apprendistato', 'tirocinio', 'stage', 'collaboratore', 'cococo', 'partita iva collaboratore', 'somministrazione', 'agenzia interinale', 'costo del personale', 'costo dipendente', 'costo aziendale', 'dimissioni', 'preavviso lavoro', 'sicurezza lavoro', 'rspp', 'rls', 'formazione obbligatoria', 'sorveglianza sanitaria', 'medico competente', 'hr', 'risorse umane', 'personale'],
    sottocategoria: 'Gestione risorse umane',
  },
  // Investimenti / Finanza
  {
    categoria: 'Investimenti',
    keywords: ['bando', 'bandi', 'finanziamento', 'finanziamenti', 'agevolazione', 'agevolazioni', 'contributo a fondo perduto', 'fondo perduto', 'credito agevolato', 'garanzia', 'mcc', 'mediocredito', 'simest', 'sace', 'invitalia', 'industria 4.0', 'transizione 4.0', 'transizione 5.0', 'pnrr', 'investimento', 'investire', 'prestito', 'mutuo', 'leasing', 'noleggio operativo', 'business plan', 'piano finanziario', 'rating bancario', 'centrale rischi', 'merito creditizio', 'crowdfunding', 'venture capital', 'startup', 'incubatore', 'acceleratore', 'fondi europei', 'por fesr', 'horizon', 'erasmus', 'mise', 'mimit'],
    sottocategoria: 'Finanziamenti e bandi',
  },
  // Marketing
  {
    categoria: 'Marketing',
    keywords: ['marketing', 'pubblicità', 'social media', 'instagram', 'facebook', 'linkedin', 'tiktok', 'google ads', 'seo', 'sem', 'brand', 'branding', 'logo', 'comunicazione', 'campagna', 'lead', 'funnel', 'conversione', 'e-commerce', 'ecommerce', 'sito web', 'landing page', 'newsletter', 'email marketing', 'crm', 'cliente', 'clienti', 'acquisizione clienti', 'fidelizzazione', 'reputazione', 'recensione', 'google my business', 'posizionamento', 'content marketing', 'influencer', 'storytelling', 'packaging', 'catalogo'],
    sottocategoria: 'Promozione e vendite',
  },
  // Operativa
  {
    categoria: 'Operativa',
    keywords: ['magazzino', 'logistica', 'fornitore', 'fornitura', 'preventivo', 'inventario', 'scorte', 'produzione', 'qualità', 'certificazione', 'iso', 'processo', 'procedura', 'efficienza', 'automazione', 'digitalizzazione', 'software', 'gestionale', 'erp', 'fatturazione elettronica', 'pos', 'cassa', 'trasporto', 'spedizione', 'corriere', 'import', 'export', 'dogana', 'dazio', 'codice hs', 'incoterms', 'compliance', 'haccp', 'sicurezza alimentare', 'energia', 'fotovoltaico', 'efficientamento energetico', 'bolletta', 'utenza', 'affitto', 'locazione', 'immobile'],
    sottocategoria: 'Processi e operations',
  },
  // Strategica (catch-all più ampio)
  {
    categoria: 'Strategica',
    keywords: ['strategia', 'crescita', 'espansione', 'mercato', 'concorrenza', 'competitor', 'analisi swot', 'piano strategico', 'obiettivo', 'vision', 'mission', 'partnership', 'fusione', 'acquisizione', 'cessione', 'passaggio generazionale', 'successione', 'governance', 'soci', 'socio', 'quote', 'assemblea', 'consiglio', 'cda', 'amministratore', 'procuratore', 'delega', 'organizzazione', 'ristrutturazione', 'crisi', 'turnaround', 'internazionalizzazione', 'estero', 'franchising'],
    sottocategoria: 'Decisioni strategiche',
  },
];

export function classifyIntent(message) {
  if (!message) return { categoria: 'Strategica', sottocategoria: 'Decisioni strategiche', confidenza: 50 };

  const msgLower = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  let bestMatch = null;
  let bestScore = 0;

  for (const rule of RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      const kwNorm = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (msgLower.includes(kwNorm)) {
        score += kw.length; // keyword più lunghe = più specifiche = peso maggiore
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = rule;
    }
  }

  if (!bestMatch || bestScore === 0) {
    return { categoria: 'Strategica', sottocategoria: 'Decisioni strategiche', confidenza: 50 };
  }

  // Confidenza proporzionale al punteggio (cap a 95)
  const confidenza = Math.min(95, 60 + bestScore);

  return {
    categoria: bestMatch.categoria,
    sottocategoria: bestMatch.sottocategoria,
    confidenza,
  };
}

// Mappa: per ogni categoria, domande di approfondimento
const SMART_QUESTIONS = {
  'Fiscale': {
    indicatori_specifici: ['forfettario', 'ordinario', 'semplificato', 'srl', 'srls', 'spa', 'sas', 'snc', 'ditta individuale', 'partita iva', 'regime', 'aliquota', 'scaglion', 'dichiarazione', 'f24', 'fattura', 'iva', 'irpef', 'ires', 'irap'],
    domande: [
      { id: 'regime', testo: 'Che regime fiscale hai?', opzioni: ['Forfettario', 'Ordinario/Semplificato', 'Non so ancora'] },
      { id: 'tipo_operazione', testo: 'Cosa devi fare nello specifico?', opzioni: ['Calcolare le tasse che pago', 'Capire quale regime conviene', 'Una scadenza/adempimento specifico', 'Altro'] },
    ],
    soglia_parole: 6,
  },
  'Personale/HR': {
    indicatori_specifici: ['tempo determinato', 'tempo indeterminato', 'indeterminato', 'determinato', 'apprendistato', 'apprendista', 'part-time', 'full-time', 'ccnl', 'livello', 'busta paga', 'tfr', 'licenziamento', 'dimissioni', 'malattia', 'maternità', 'inps', 'inail', 'stage', 'tirocinio', 'cococo', 'collaboratore'],
    domande: [
      { id: 'tipo_contratto', testo: 'Che tipo di contratto ti interessa?', opzioni: ['Tempo indeterminato', 'Tempo determinato', 'Apprendistato', 'Collaborazione/P.IVA', 'Non so ancora'] },
      { id: 'obiettivo_hr', testo: 'Cosa vuoi sapere esattamente?', opzioni: ['Quanto mi costa', 'Quale contratto conviene', 'Obblighi e adempimenti', 'Agevolazioni per assunzione'] },
    ],
    soglia_parole: 5,
  },
  'Legale': {
    indicatori_specifici: ['contratto', 'clausola', 'recesso', 'disdetta', 'inadempimento', 'gdpr', 'privacy', 'sicurezza lavoro', '81/08', 'responsabilità', 'causa', 'tribunale', 'brevetto', 'marchio', 'statuto'],
    domande: [
      { id: 'ambito_legale', testo: 'In quale ambito legale?', opzioni: ['Contratti e clausole', 'Privacy e GDPR', 'Sicurezza sul lavoro', 'Proprietà intellettuale', 'Altro'] },
    ],
    soglia_parole: 5,
  },
  'Investimenti': {
    indicatori_specifici: ['bando', 'bandi', 'pnrr', 'transizione 5.0', 'transizione 4.0', 'credito imposta', 'fondo perduto', 'simest', 'invitalia', 'mcc', 'garanzia', 'business plan', 'crowdfunding'],
    domande: [
      { id: 'tipo_investimento', testo: 'Che tipo di finanziamento cerchi?', opzioni: ['Bandi a fondo perduto', 'Credito d\'imposta', 'Prestiti agevolati', 'Voglio capire le opzioni'] },
      { id: 'importo', testo: 'Ordine di grandezza dell\'investimento?', opzioni: ['Sotto 50.000€', '50K - 200K€', 'Oltre 200K€', 'Non ho ancora un budget'] },
    ],
    soglia_parole: 5,
  },
  'Operativa': {
    indicatori_specifici: ['fornitore', 'fornitura', 'preventivo', 'magazzino', 'logistica', 'import', 'export', 'dogana', 'dazio', 'certificazione', 'iso', 'haccp', 'energia', 'bolletta', 'fotovoltaico', 'software', 'gestionale', 'erp'],
    domande: [
      { id: 'ambito_operativo', testo: 'In quale area operativa?', opzioni: ['Fornitori e acquisti', 'Import/Export', 'Certificazioni e qualità', 'Energia e risparmio', 'Software e digitalizzazione'] },
    ],
    soglia_parole: 5,
  },
  'Marketing': {
    indicatori_specifici: ['seo', 'google ads', 'facebook', 'instagram', 'linkedin', 'tiktok', 'social', 'campagna', 'lead', 'funnel', 'e-commerce', 'ecommerce', 'sito web', 'newsletter', 'crm', 'brand'],
    domande: [
      { id: 'canale', testo: 'Su quale canale vuoi lavorare?', opzioni: ['Social media', 'Google / SEO / Ads', 'Sito web / E-commerce', 'Strategia generale'] },
      { id: 'budget_mkt', testo: 'Hai un budget mensile in mente?', opzioni: ['Sotto 500€/mese', '500€ - 2.000€/mese', 'Oltre 2.000€/mese', 'Non ancora'] },
    ],
    soglia_parole: 5,
  },
  'Strategica': {
    indicatori_specifici: ['crescita', 'espansione', 'fusione', 'acquisizione', 'cessione', 'passaggio generazionale', 'franchising', 'internazionalizzazione', 'crisi', 'ristrutturazione', 'soci', 'governance'],
    domande: [
      { id: 'obiettivo_strategico', testo: 'Qual è il tuo obiettivo principale?', opzioni: ['Crescere / espandermi', 'Risolvere un problema urgente', 'Valutare un\'opportunità', 'Pianificare il futuro dell\'azienda'] },
    ],
    soglia_parole: 6,
  },
};

export function detectVagueness(message, categoria, userProfile) {
  if (!message || !categoria) return null;
  
  const config = SMART_QUESTIONS[categoria];
  if (!config) return null;
  
  const msgLower = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const parole = msgLower.split(/\s+/).filter(w => w.length > 2);
  
  // Se contiene indicatori specifici del dominio → non è vago
  const haSpecifici = config.indicatori_specifici.some(ind => msgLower.includes(ind));
  if (haSpecifici) return null;
  
  // Se è lungo (più del doppio della soglia) → probabilmente ha abbastanza dettagli
  if (parole.length > config.soglia_parole * 2) return null;
  
  // Filtra domande: rimuovi quelle a cui il profilo utente già risponde
  let domandeFiltrate = config.domande;
  if (userProfile) {
    domandeFiltrate = config.domande.filter(d => {
      if (d.id === 'regime' && userProfile.regime_fiscale && userProfile.regime_fiscale !== 'Non so') return false;
      return true;
    });
  }
  
  if (domandeFiltrate.length === 0) return null;
  
  return {
    domande: domandeFiltrate,
    messaggioOriginale: message,
    categoria: categoria,
  };
}