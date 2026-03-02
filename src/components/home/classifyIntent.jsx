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