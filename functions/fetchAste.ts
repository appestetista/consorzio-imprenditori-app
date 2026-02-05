import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as cheerio from 'npm:cheerio@1.0.0';

// Configurazione
const CONFIG = {
  giorniMassimiAllaAsta: 120, // Max 120 giorni
  // Province target: Marche + Rimini
  provinceTarget: ['Pesaro', 'Urbino', 'PU', 'Ancona', 'AN', 'Macerata', 'MC', 'Fermo', 'FM', 'Ascoli Piceno', 'AP', 'Rimini', 'RN'],
  // Parole chiave località per Marche e Rimini
  localitaMarche: [
    'pesaro', 'urbino', 'fano', 'senigallia', 'jesi', 'fabriano', 'ancona', 'osimo',
    'macerata', 'civitanova', 'tolentino', 'recanati', 'fermo', 'porto san giorgio',
    'ascoli piceno', 'san benedetto', 'grottammare', 'rimini', 'riccione', 'cattolica',
    'misano', 'santarcangelo', 'bellaria', 'coriano', 'verucchio'
  ]
};

// Parole chiave per escludere aste
const ESCLUSIONI = {
  titolo: [
    'quota indivisa', 'quota di', 'quota pari', '1/2 di', '1/3 di', '1/4 di',
    'pro quota', 'comproprietà', 'usufrutto', 'nuda proprietà',
    'terreno agricolo', 'terreno seminativo', 'terreno boschivo', 'fondo agricolo'
  ]
};

// Normalizza provincia da testo località
function normalizzaProvincia(localita) {
  const loc = (localita || '').toLowerCase();
  
  // Cerca codice provincia nel testo (es. "67051 Avezzano AQ")
  const matchPU = loc.match(/\bpu\b|pesaro|urbino|fano/);
  if (matchPU) return 'Pesaro-Urbino';
  
  const matchAN = loc.match(/\ban\b|ancona|senigallia|jesi|fabriano|osimo/);
  if (matchAN) return 'Ancona';
  
  const matchMC = loc.match(/\bmc\b|macerata|civitanova|tolentino|recanati/);
  if (matchMC) return 'Macerata';
  
  const matchFM = loc.match(/\bfm\b|fermo|porto san giorgio/);
  if (matchFM) return 'Fermo';
  
  const matchAP = loc.match(/\bap\b|ascoli piceno|san benedetto|grottammare/);
  if (matchAP) return 'Ascoli Piceno';
  
  const matchRN = loc.match(/\brn\b|rimini|riccione|cattolica|misano|santarcangelo|bellaria/);
  if (matchRN) return 'Rimini';
  
  return null;
}

// Determina tipologia dal titolo/categoria
function determinaTipologia(titolo, categoria = '', macroCategoria = '') {
  const t = (titolo + ' ' + categoria).toLowerCase();
  const macro = macroCategoria.toLowerCase();
  
  // Macro categoria Mobili
  if (macro.includes('mobil')) {
    if (t.includes('arredament') || t.includes('mobili') || t.includes('arredi') || t.includes('elettrodomestic')) return 'Arredamento attività';
    if (t.includes('macchinar') || t.includes('utensil') || t.includes('attrezzatur')) return 'Attrezzatura';
    if (t.includes('camion') || t.includes('furgon') || t.includes('autocarro') || t.includes('escavator') || t.includes('ruspa') || t.includes('trattore')) return 'Mezzi';
    return 'Attrezzatura';
  }
  
  // Macro categoria Aziende
  if (macro.includes('aziend')) return 'Commerciale';
  
  // Immobili
  if (t.includes('residenziale') || t.includes('abitazione') || t.includes('appartamento') || t.includes('villa') || t.includes('casa') || t.includes('abitativ') || t.includes('villino')) return 'Abitativo';
  if (t.includes('commerciale') || t.includes('negozio') || t.includes('ufficio') || t.includes('botteg')) return 'Commerciale';
  if (t.includes('industriale') || t.includes('capannone') || t.includes('magazzino') || t.includes('opifici') || t.includes('laboratorio') || t.includes('deposito')) return 'Industriale';
  if (t.includes('terreno')) return 'Terreno';
  
  return 'Altro';
}

// Verifica se deve essere esclusa
function deveEssereEsclusa(titolo, descrizione = '') {
  const testo = `${titolo} ${descrizione}`.toLowerCase();
  
  // Esclusione globale: posti auto, garage
  const escludiSempre = ['posto auto', 'posti auto', 'box auto', 'garage', 'autorimessa'];
  if (escludiSempre.some(kw => testo.includes(kw))) return true;
  
  // Esclusione quote frazionate
  return ESCLUSIONI.titolo.some(kw => testo.includes(kw.toLowerCase()));
}

// Calcola livello interesse
function calcolaInteresse(asta) {
  let punteggio = 0;
  
  if (asta.prezzo_base < 30000) punteggio += 3;
  else if (asta.prezzo_base < 70000) punteggio += 2;
  else if (asta.prezzo_base < 120000) punteggio += 1;
  
  if (asta.giorni_alla_asta >= 45 && asta.giorni_alla_asta <= 80) punteggio += 2;
  else if (asta.giorni_alla_asta > 80) punteggio += 1;
  
  if (['Abitativo', 'Commerciale'].includes(asta.tipologia)) punteggio += 2;
  if (asta.tipologia === 'Industriale') punteggio += 1;
  
  if (punteggio >= 5) return 'Molto interessante';
  if (punteggio >= 3) return 'Interessante';
  return 'Da valutare';
}

// Genera motivo interesse
function generaMotivoInteresse(asta) {
  const motivi = [];
  
  if (asta.prezzo_base < 50000) motivi.push('💰 Investimento contenuto');
  else if (asta.prezzo_base < 100000) motivi.push('💰 Prezzo sotto i 100k');
  
  if (asta.tipologia === 'Abitativo') motivi.push('🏠 Residenziale - alta domanda');
  else if (asta.tipologia === 'Commerciale') motivi.push('🏪 Commerciale - potenziale reddito');
  
  if (asta.giorni_alla_asta >= 50) motivi.push('⏰ Tempo per perizia e sopralluogo');
  
  return motivi.length > 0 ? motivi.join(' • ') : 'Opportunità da analizzare';
}

// Fetch dal Portale Vendite Pubbliche (pvp.giustizia.it)
async function fetchPVP(macroCategoria = 'Immobili', pagina = 1) {
  const aste = [];
  
  try {
    // URL di ricerca PVP
    const url = `https://pvp.giustizia.it/pvp/it/lista_annunci.page?macro_categoria=${encodeURIComponent(macroCategoria)}&page=${pagina}`;
    console.log(`[fetchAste] Fetching PVP: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9',
      }
    });
    
    if (!response.ok) {
      console.log(`[fetchAste] PVP response not ok: ${response.status}`);
      return aste;
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Cerca gli annunci nella pagina
    // Struttura tipica: card con titolo, località, prezzo, data vendita
    $('a[href*="detail_annuncio"]').each((i, el) => {
      try {
        const $card = $(el).closest('.card, [class*="annuncio"], [class*="item"]');
        if ($card.length === 0) return;
        
        const link = $(el).attr('href') || '';
        const fullLink = link.startsWith('http') ? link : `https://pvp.giustizia.it${link}`;
        
        // Estrai ID annuncio dal link
        const idMatch = link.match(/idAnnuncio=(\d+)/);
        const externalId = idMatch ? `pvp_${idMatch[1]}` : `pvp_${i}_${Date.now()}`;
        
        // Estrai info dalla card
        const titoloEl = $card.find('h2, h3, h4, [class*="title"], [class*="titolo"]').first();
        const titolo = titoloEl.text().trim() || $(el).text().trim();
        
        // Cerca località nel testo della card
        const cardText = $card.text();
        const localita = cardText.match(/\d{5}\s+([^,\n]+)/)?.[1]?.trim() || 
                        cardText.match(/([A-Za-z\s]+)\s+[A-Z]{2},/)?.[1]?.trim() || '';
        
        // Cerca prezzo
        const prezzoMatch = cardText.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*€?/);
        let prezzoNum = 0;
        if (prezzoMatch) {
          prezzoNum = parseFloat(prezzoMatch[1].replace(/\./g, '').replace(',', '.')) || 0;
        }
        
        // Cerca data vendita
        const dataMatch = cardText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        let dataAsta = null;
        if (dataMatch) {
          dataAsta = `${dataMatch[3]}-${dataMatch[2]}-${dataMatch[1]}`;
        }
        
        // Cerca categoria
        const categoria = $card.find('[class*="categoria"], [class*="type"]').text().trim() || '';
        
        if (titolo && fullLink) {
          aste.push({
            titolo,
            localita,
            prezzo_base: prezzoNum,
            data_asta: dataAsta || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            link_ufficiale: fullLink,
            fonte: 'pvp',
            external_id: externalId,
            _categoria: categoria,
            _macroCategoria: macroCategoria
          });
        }
      } catch (e) {
        console.log('[fetchAste] Error parsing PVP item:', e.message);
      }
    });
    
    console.log(`[fetchAste] PVP ${macroCategoria} pagina ${pagina}: ${aste.length} annunci`);
    
  } catch (e) {
    console.log('[fetchAste] Error fetching PVP:', e.message);
  }
  
  return aste;
}

// Fetch homepage PVP per ultimi annunci
async function fetchPVPHomepage() {
  const aste = [];
  
  try {
    const response = await fetch('https://pvp.giustizia.it/pvp/it/homepage.page', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9',
      }
    });
    
    if (!response.ok) {
      console.log('[fetchAste] PVP homepage not ok:', response.status);
      return aste;
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Estrai annunci dalla homepage
    // Gli annunci sono in card con link a detail_annuncio
    $('a[href*="detail_annuncio"]').each((i, el) => {
      try {
        const link = $(el).attr('href') || '';
        const fullLink = link.startsWith('http') ? link : `https://pvp.giustizia.it${link}`;
        
        const idMatch = link.match(/idAnnuncio=(\d+)/);
        const externalId = idMatch ? `pvp_${idMatch[1]}` : null;
        if (!externalId) return;
        
        // Parent container
        const $parent = $(el).parent().parent();
        const parentText = $parent.text();
        
        // Estrai titolo (es. "Lotto n. 1", "Lotto unico")
        const lottoMatch = parentText.match(/(Lotto\s+(?:n\.\s*)?\d+|Lotto\s+unico)/i);
        const titolo = lottoMatch ? lottoMatch[1] : '';
        
        // Estrai tipo (es. "Immobile Residenziale")
        const tipoMatch = parentText.match(/(Immobile\s+\w+|Altra\s+Categoria|Arredamento|Macchinari|Azienda)/i);
        const tipo = tipoMatch ? tipoMatch[1] : '';
        
        // Estrai località
        const localitaMatch = parentText.match(/(\d{5}\s+[^,\n]+|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+[A-Z]{2},?\s+Italia)/);
        const localita = localitaMatch ? localitaMatch[1].replace(/,?\s*Italia/, '').trim() : '';
        
        // Estrai prezzo
        const prezzoMatch = parentText.match(/Prezzo\s+base[^€]*€?\s*([\d.,]+)/i) || parentText.match(/([\d.,]+)\s*€/);
        let prezzoNum = 0;
        if (prezzoMatch) {
          prezzoNum = parseFloat(prezzoMatch[1].replace(/\./g, '').replace(',', '.')) || 0;
        }
        
        // Estrai data vendita
        const dataMatch = parentText.match(/Data\s+vendita[^\d]*(\d{2})\/(\d{2})\/(\d{4})/i);
        let dataAsta = null;
        if (dataMatch) {
          dataAsta = `${dataMatch[3]}-${dataMatch[2]}-${dataMatch[1]}`;
        }
        
        // Estrai descrizione breve
        const descrizione = parentText.replace(/Data\s+(?:vendita|Pubblicazione)[^\n]*/gi, '')
                                      .replace(/Prezzo[^\n]*/gi, '')
                                      .replace(/VAI ALL'ANNUNCIO/gi, '')
                                      .substring(0, 300).trim();
        
        if (titolo || tipo) {
          aste.push({
            titolo: `${tipo} - ${titolo}`.trim().replace(/^-\s*/, '').replace(/\s*-$/, ''),
            localita,
            prezzo_base: prezzoNum,
            data_asta: dataAsta || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            link_ufficiale: fullLink,
            fonte: 'pvp',
            external_id: externalId,
            _descrizione: descrizione,
            _macroCategoria: tipo.includes('Immobile') ? 'Immobili' : (tipo.includes('Azienda') ? 'Aziende' : 'Mobili')
          });
        }
      } catch (e) {
        console.log('[fetchAste] Error parsing PVP homepage item:', e.message);
      }
    });
    
    console.log(`[fetchAste] PVP homepage: ${aste.length} annunci estratti`);
    
  } catch (e) {
    console.log('[fetchAste] Error fetching PVP homepage:', e.message);
  }
  
  return aste;
}

// Filtra aste per regione Marche + Rimini
function filtraPerRegione(aste) {
  return aste.filter(asta => {
    const localita = (asta.localita || '').toLowerCase();
    const titolo = (asta.titolo || '').toLowerCase();
    const descrizione = (asta._descrizione || '').toLowerCase();
    const testo = `${localita} ${titolo} ${descrizione}`;
    
    // Cerca corrispondenza con località target
    const trovato = CONFIG.localitaMarche.some(loc => testo.includes(loc));
    
    // O cerca codici provincia
    const hasCodice = /\b(pu|an|mc|fm|ap|rn)\b/i.test(testo);
    
    return trovato || hasCodice;
  });
}

// Filtra e arricchisci aste
function processaAste(aste) {
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  
  return aste
    .filter(asta => {
      // Escludi per parole chiave
      if (deveEssereEsclusa(asta.titolo, asta._descrizione)) return false;
      
      // Filtra per data
      if (asta.data_asta) {
        const dataAsta = new Date(asta.data_asta);
        const giorni = Math.ceil((dataAsta - oggi) / (1000 * 60 * 60 * 24));
        if (giorni < 0 || giorni > CONFIG.giorniMassimiAllaAsta) return false;
      }
      
      return true;
    })
    .map(asta => {
      const provincia = normalizzaProvincia(asta.localita) || 'Altro';
      const tipologia = determinaTipologia(asta.titolo, asta._categoria, asta._macroCategoria);
      const dataAsta = new Date(asta.data_asta);
      const giorniAllaAsta = Math.ceil((dataAsta - oggi) / (1000 * 60 * 60 * 24));
      const cauzioneStimata = Math.round(asta.prezzo_base * 0.10);
      
      // Rimuovi campi interni
      const { _categoria, _macroCategoria, _descrizione, ...astaClean } = asta;
      
      const astaArricchita = {
        ...astaClean,
        provincia,
        tipologia,
        cauzione_stimata: cauzioneStimata,
        giorni_alla_asta: giorniAllaAsta,
        is_active: true
      };
      
      astaArricchita.livello_interesse = calcolaInteresse(astaArricchita);
      astaArricchita.motivo_interesse = generaMotivoInteresse(astaArricchita);
      
      return astaArricchita;
    });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verifica autenticazione admin
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }
    
    console.log('[fetchAste] Starting fetch from PVP...');
    
    // Fetch da homepage PVP (ultimi annunci)
    const astePVP = await fetchPVPHomepage();
    
    console.log(`[fetchAste] Raw PVP: ${astePVP.length} annunci`);
    
    // Filtra per regione Marche + Rimini
    const asteRegione = filtraPerRegione(astePVP);
    console.log(`[fetchAste] Filtered for Marche/Rimini: ${asteRegione.length}`);
    
    // Processa e arricchisci
    const asteProcessate = processaAste(asteRegione);
    console.log(`[fetchAste] After processing: ${asteProcessate.length}`);
    
    // Recupera aste esistenti
    const asteEsistenti = await base44.asServiceRole.entities.AstaImmobiliare.list();
    const externalIdsEsistenti = new Set(asteEsistenti.map(a => a.external_id));
    
    // Marca vecchie aste come non attive
    const externalIdsNuovi = new Set(asteProcessate.map(a => a.external_id));
    let disattivate = 0;
    for (const astaEsistente of asteEsistenti) {
      if (astaEsistente.is_active && !externalIdsNuovi.has(astaEsistente.external_id)) {
        await base44.asServiceRole.entities.AstaImmobiliare.update(astaEsistente.id, { is_active: false });
        disattivate++;
      }
    }
    
    // Inserisci nuove aste
    const nuoveAste = asteProcessate.filter(a => !externalIdsEsistenti.has(a.external_id));
    let inserite = 0;
    for (const asta of nuoveAste) {
      try {
        await base44.asServiceRole.entities.AstaImmobiliare.create(asta);
        inserite++;
      } catch (e) {
        console.log('[fetchAste] Error inserting:', e.message);
      }
    }
    
    console.log(`[fetchAste] Completed: ${inserite} new, ${disattivate} deactivated`);
    
    return Response.json({
      success: true,
      fonte: 'pvp.giustizia.it',
      totali_trovate: astePVP.length,
      filtrate_regione: asteRegione.length,
      dopo_processing: asteProcessate.length,
      nuove_inserite: inserite,
      disattivate: disattivate,
      gia_presenti: asteProcessate.length - inserite
    });
    
  } catch (error) {
    console.log('[fetchAste] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});