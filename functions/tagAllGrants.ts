import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Lista completa delle regioni italiane
const REGIONI_ITALIA = [
  'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna', 'Emilia Romagna',
  'Friuli Venezia Giulia', 'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche',
  'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana',
  'Trentino-Alto Adige', 'Trentino Alto Adige', 'Umbria', "Valle d'Aosta", 'Valle d Aosta', 'Veneto'
];

const normalizeRegion = (region) => {
  const mapping = {
    'emilia romagna': 'Emilia-Romagna',
    'emilia-romagna': 'Emilia-Romagna',
    'friuli venezia giulia': 'Friuli Venezia Giulia',
    'friuli-venezia giulia': 'Friuli Venezia Giulia',
    'trentino alto adige': 'Trentino-Alto Adige',
    'trentino-alto adige': 'Trentino-Alto Adige',
    'valle d\'aosta': "Valle d'Aosta",
    'valle d aosta': "Valle d'Aosta",
  };
  const lower = region.toLowerCase();
  return mapping[lower] || region;
};

const extractRegionsFromText = (text) => {
  if (!text) return [];
  const lowerText = text.toLowerCase();
  const found = [];
  
  for (const region of REGIONI_ITALIA) {
    if (lowerText.includes(region.toLowerCase())) {
      found.push(normalizeRegion(region));
    }
  }
  
  return [...new Set(found)];
};

const extractTagsFromText = (title, description) => {
  const text = `${title || ''} ${description || ''}`.toLowerCase();
  const tags = [];
  
  if (text.includes('start-up') || text.includes('startup') || text.includes('start up') || text.includes('nuove imprese')) {
    tags.push('startup');
  }
  if (text.includes('femminile') || text.includes('donne') || text.includes('imprenditoria femminile') || text.includes('imprenditrici')) {
    tags.push('femminile');
  }
  if (text.includes('giovanile') || text.includes('giovani') || text.includes('under 35') || text.includes('under35')) {
    tags.push('giovanile');
  }
  if (text.includes('mezzogiorno') || text.includes('sud italia') || text.includes('zes') || text.includes('zona economica speciale')) {
    tags.push('mezzogiorno');
  }
  if (text.includes('pmi') || text.includes('piccole e medie') || text.includes('piccole medie')) {
    tags.push('pmi');
  }
  if (text.includes('artigian') || text.includes('bottega') || text.includes('mestieri')) {
    tags.push('artigianato');
  }
  if (text.includes('cooperativ') || text.includes('coop')) {
    tags.push('cooperative');
  }
  if (text.includes('sociale') || text.includes('terzo settore') || text.includes('no profit') || text.includes('nonprofit')) {
    tags.push('sociale');
  }
  if (text.includes('digital') || text.includes('industria 4.0') || text.includes('4.0') || text.includes('software') || text.includes('e-commerce') || text.includes('ecommerce')) {
    tags.push('digitalizzazione');
  }
  if (text.includes('innovazion') || text.includes('innovativ') || text.includes('brevett')) {
    tags.push('innovazione');
  }
  if (text.includes('ricerca') || text.includes('sviluppo') || text.includes('r&s') || text.includes('r&d')) {
    tags.push('ricerca_sviluppo');
  }
  if (text.includes('energia') || text.includes('energetic') || text.includes('fotovoltaic') || text.includes('rinnovabil') || text.includes('efficienza energetica')) {
    tags.push('energia');
  }
  if (text.includes('sostenibil') || text.includes('green') || text.includes('ambiente') || text.includes('ecologic') || text.includes('circolare')) {
    tags.push('sostenibilita');
  }
  if (text.includes('export') || text.includes('internazional') || text.includes('estero') || text.includes('fiere')) {
    tags.push('export');
  }
  if (text.includes('formazione') || text.includes('competenze') || text.includes('training') || text.includes('aggiornamento')) {
    tags.push('formazione');
  }
  if (text.includes('assunzion') || text.includes('occupazion') || text.includes('lavoro') || text.includes('dipendenti')) {
    tags.push('occupazione');
  }
  if (text.includes('turism') || text.includes('albergh') || text.includes('ristorazion') || text.includes('ospitalità')) {
    tags.push('turismo');
  }
  if (text.includes('agricol') || text.includes('agroalimentar') || text.includes('psr') || text.includes('rurale')) {
    tags.push('agricoltura');
  }
  if (text.includes('commerc') || text.includes('negozio') || text.includes('retail')) {
    tags.push('commercio');
  }
  if (text.includes('manifattur') || text.includes('produzion') || text.includes('industrial')) {
    tags.push('manifatturiero');
  }
  if (text.includes('fondo perduto') || text.includes('a fondo perduto')) {
    tags.push('fondo_perduto');
  }
  if (text.includes('credito d\'imposta') || text.includes('credito di imposta') || text.includes('tax credit')) {
    tags.push('credito_imposta');
  }
  if (text.includes('finanziamento agevolato') || text.includes('tasso agevolato') || text.includes('mutuo agevolato')) {
    tags.push('finanziamento_agevolato');
  }
  if (text.includes('garanzia') || text.includes('fondo garanzia')) {
    tags.push('garanzia');
  }
  
  return [...new Set(tags)];
};

const isNationalGrant = (title, description, livello, eligible_regions) => {
  const text = `${title || ''} ${description || ''}`.toLowerCase();
  
  if (livello === 'Europeo' || livello === 'Nazionale') {
    return true;
  }
  
  if (text.includes('tutte le regioni') || text.includes('tutto il territorio') || 
      text.includes('intero territorio nazionale') || text.includes('su tutto il territorio')) {
    return true;
  }
  
  if (livello === 'Regionale' && (!eligible_regions || eligible_regions.length === 0)) {
    return false;
  }
  
  if (!eligible_regions || eligible_regions.length === 0) {
    return true;
  }
  
  return false;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    // Recupera tutti i bandi
    const grants = await base44.asServiceRole.entities.FinancialGrant.list();
    
    let updated = 0;
    let errors = [];
    
    for (const grant of grants) {
      try {
        const tags = extractTagsFromText(grant.title, grant.description);
        
        let regions = grant.eligible_regions || [];
        if (regions.length === 0) {
          regions = extractRegionsFromText(`${grant.title} ${grant.description}`);
        }
        
        const is_national = isNationalGrant(grant.title, grant.description, grant.livello, regions);
        
        // Aggiorna solo se ci sono modifiche
        const updateData = {};
        
        if (!grant.tags || grant.tags.length === 0) {
          updateData.tags = tags;
        }
        
        if ((!grant.eligible_regions || grant.eligible_regions.length === 0) && regions.length > 0) {
          updateData.eligible_regions = regions;
        }
        
        if (grant.is_national === undefined || grant.is_national === null) {
          updateData.is_national = is_national;
        }
        
        if (Object.keys(updateData).length > 0) {
          await base44.asServiceRole.entities.FinancialGrant.update(grant.id, updateData);
          updated++;
        }
      } catch (e) {
        errors.push({ grant_id: grant.id, title: grant.title, error: e.message });
      }
    }

    return Response.json({
      total: grants.length,
      updated,
      errors: errors.length,
      error_details: errors
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});