import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as cheerio from 'npm:cheerio@1.0.0';

// Configurazione
const CONFIG = {
  giorniMassimiAllaAsta: 180,
  maxPaginePerPortale: 10,
};

// Parole chiave per ESCLUDERE
const ESCLUSIONI = [
  'moto', 'motocicletta', 'scooter', 'ciclomotore',
  'terreno agricolo', 'terreno seminativo', 'terreno boschivo', 'fondo agricolo', 'fondo rustico',
  'terreno edificabile', 'lotto edificabile', 'area edificabile',
  'quota indivisa', 'quota di', 'pro quota', 'usufrutto', 'nuda proprietà'
];

function deveEssereEsclusa(titolo) {
  const t = titolo.toLowerCase();
  return ESCLUSIONI.some(kw => t.includes(kw));
}

// Determina tipologia dal titolo
function determinaTipologia(titolo, categoria = '') {
  const t = (titolo + ' ' + categoria).toLowerCase();
  
  // Casa/Abitativo
  if (t.includes('abitazione') || t.includes('appartamento') || t.includes('villa') || 
      t.includes('casa') || t.includes('villino') || t.includes('villetta') ||
      t.includes('bilocale') || t.includes('trilocale') || t.includes('monolocale')) {
    return 'Casa';
  }
  
  // Capannone/Industriale
  if (t.includes('capannone') || t.includes('industriale') || t.includes('magazzino') || 
      t.includes('opificio') || t.includes('laboratorio') || t.includes('deposito')) {
    return 'Capannone';
  }
  
  // Azienda
  if (t.includes('azienda') || t.includes('attività commerciale') || t.includes('ramo d\'azienda') ||
      t.includes('complesso aziendale')) {
    return 'Azienda';
  }
  
  // Commerciale
  if (t.includes('negozio') || t.includes('ufficio') || t.includes('locale commerciale') || 
      t.includes('commerciale') || t.includes('bottega') || t.includes('bar') || t.includes('ristorante')) {
    return 'Commerciale';
  }
  
  // Macchinario industriale
  if (t.includes('macchinario') || t.includes('macchina industriale') || t.includes('impianto') ||
      t.includes('tornio') || t.includes('fresa') || t.includes('pressa') || t.includes('cnc') ||
      t.includes('linea di produzione') || t.includes('macchinari per')) {
    return 'Macchinario industriale';
  }
  
  // Mezzo/Veicolo
  if (t.includes('autocarro') || t.includes('furgone') || t.includes('camion') || 
      t.includes('trattore') || t.includes('escavatore') || t.includes('muletto') ||
      t.includes('carrello elevatore') || t.includes('veicolo') || t.includes('auto') ||
      t.includes('rimorchio') || t.includes('semirimorchio') || t.includes('gru')) {
    return 'Mezzo';
  }
  
  // Attrezzatura
  if (t.includes('attrezzatura') || t.includes('attrezzi') || t.includes('utensili') ||
      t.includes('strumenti') || t.includes('apparecchiature')) {
    return 'Attrezzatura';
  }
  
  // Arredo negozio
  if (t.includes('arredamento') || t.includes('arredi') || t.includes('mobili') ||
      t.includes('scaffalature') || t.includes('bancone') || t.includes('vetrina')) {
    return 'Arredo negozio';
  }
  
  return 'Altro';
}

// Calcola interesse
function calcolaInteresse(asta) {
  let punteggio = 0;
  
  if (asta.prezzo_base < 30000) punteggio += 3;
  else if (asta.prezzo_base < 70000) punteggio += 2;
  else if (asta.prezzo_base < 150000) punteggio += 1;
  
  if (asta.giorni_alla_asta >= 30 && asta.giorni_alla_asta <= 90) punteggio += 2;
  else if (asta.giorni_alla_asta > 90) punteggio += 1;
  
  if (['Casa', 'Commerciale', 'Capannone'].includes(asta.tipologia)) punteggio += 2;
  if (['Macchinario industriale', 'Mezzo'].includes(asta.tipologia)) punteggio += 1;
  
  if (punteggio >= 5) return 'Molto interessante';
  if (punteggio >= 3) return 'Interessante';
  return 'Da valutare';
}

function generaMotivoInteresse(asta) {
  const motivi = [];
  
  if (asta.prezzo_base < 30000) motivi.push('💰 Prezzo molto basso');
  else if (asta.prezzo_base < 70000) motivi.push('💰 Prezzo contenuto');
  else if (asta.prezzo_base < 150000) motivi.push('💰 Prezzo accessibile');
  
  if (asta.tipologia === 'Casa') motivi.push('🏠 Immobile residenziale');
  else if (asta.tipologia === 'Commerciale') motivi.push('🏪 Potenziale reddito');
  else if (asta.tipologia === 'Capannone') motivi.push('🏭 Spazio industriale');
  else if (asta.tipologia === 'Macchinario industriale') motivi.push('⚙️ Macchinario');
  else if (asta.tipologia === 'Mezzo') motivi.push('🚚 Veicolo/Mezzo');
  
  if (asta.giorni_alla_asta >= 45) motivi.push('⏰ Tempo per analisi');
  
  return motivi.length > 0 ? motivi.join(' • ') : 'Opportunità da valutare';
}

// ============================================
// SCRAPER ASTEANNUNCI.IT
// ============================================
async function fetchAsteAnnunci(regione = 'Marche') {
  const aste = [];
  let pagina = 1;
  
  const regioneSlug = regione.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '-');
  
  while (pagina <= CONFIG.maxPaginePerPortale) {
    try {
      // Prova prima la ricerca per regione
      const url = `https://www.asteannunci.it/ricerca?regione=${encodeURIComponent(regione)}&page=${pagina}`;
      console.log(`[AsteAnnunci] Fetching: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'it-IT,it;q=0.9',
        }
      });
      
      if (!response.ok) {
        console.log(`[AsteAnnunci] Response not ok: ${response.status}`);
        break;
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      const risultatiPagina = [];
      
      // Cerca i risultati - adatta i selettori al sito
      $('article, .card, .tile-result, .annuncio, .risultato, [class*="result"], [class*="listing"]').each((i, el) => {
        try {
          const $el = $(el);
          
          // Cerca link
          const linkEl = $el.find('a[href*="/asta/"], a[href*="/annuncio/"], a[href*="/dettaglio/"]').first();
          let link = linkEl.attr('href') || $el.find('a').first().attr('href') || '';
          
          if (!link || link === '#') return;
          if (!link.startsWith('http')) {
            link = link.startsWith('/') ? `https://www.asteannunci.it${link}` : `https://www.asteannunci.it/${link}`;
          }
          
          // Cerca titolo
          const titolo = $el.find('h2, h3, h4, .titolo, .title, [class*="title"]').first().text().trim() ||
                        linkEl.text().trim() ||
                        $el.find('a').first().text().trim();
          
          if (!titolo || titolo.length < 5) return;
          if (deveEssereEsclusa(titolo)) return;
          
          // Cerca prezzo
          const prezzoText = $el.find('.prezzo, .price, [class*="price"], [class*="prezzo"]').text() ||
                            $el.text().match(/€\s*[\d.,]+|[\d.,]+\s*€/)?.[0] || '';
          const prezzoMatch = prezzoText.match(/[\d.,]+/);
          let prezzoNum = 0;
          if (prezzoMatch) {
            prezzoNum = parseFloat(prezzoMatch[0].replace(/\./g, '').replace(',', '.')) || 0;
          }
          
          // Cerca data
          const dataText = $el.find('.data, .date, [class*="data"]').text() ||
                          $el.text().match(/\d{2}\/\d{2}\/\d{4}/)?.[0] || '';
          let dataAsta = null;
          const dateMatch = dataText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
          if (dateMatch) {
            dataAsta = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
          }
          
          // Cerca località
          const localitaText = $el.find('.localita, .location, [class*="location"], [class*="citta"]').text().trim() ||
                              $el.find('small, .small').text().trim();
          const localita = localitaText.split(',')[0]?.trim() || regione;
          
          // Cerca tribunale
          const tribunaleMatch = $el.text().match(/Tribunale\s+di\s+(\w+)/i);
          const tribunale = tribunaleMatch ? tribunaleMatch[1] : '';
          
          // ID univoco
          const idMatch = link.match(/\/(\d+)(?:\/|$|\?)|id[=\/](\d+)/i);
          const externalId = `asteannunci_${idMatch ? (idMatch[1] || idMatch[2]) : Date.now()}_${i}`;
          
          // Immagine
          const imgUrl = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';
          
          risultatiPagina.push({
            titolo: titolo.substring(0, 200),
            localita,
            provincia: tribunale || localita,
            regione,
            prezzo_base: prezzoNum,
            data_asta: dataAsta || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            link_ufficiale: link,
            fonte: 'asteannunci',
            external_id: externalId,
            tribunale,
            immagine_url: imgUrl.startsWith('http') ? imgUrl : ''
          });
          
        } catch (e) {
          console.log('[AsteAnnunci] Parse error:', e.message);
        }
      });
      
      console.log(`[AsteAnnunci] Pag ${pagina}: ${risultatiPagina.length} risultati`);
      
      if (risultatiPagina.length === 0) break;
      
      aste.push(...risultatiPagina);
      pagina++;
      await new Promise(r => setTimeout(r, 1000));
      
    } catch (e) {
      console.log(`[AsteAnnunci] Error:`, e.message);
      break;
    }
  }
  
  return aste;
}

// ============================================
// SCRAPER GOBID.IT (Beni mobili)
// ============================================
async function fetchGobid() {
  const aste = [];
  
  // Categorie interessanti su Gobid
  const categorie = [
    'Meccanica',
    'Logistica', 
    'Trasporti',
    'Edilizia',
    'Movimento-terra',
    'Arredi-e-ufficio',
    'Alimentare-e-ristorazione',
    'Legno',
    'Plastica',
    'Immobili'
  ];
  
  for (const categoria of categorie) {
    try {
      const url = `https://www.gobid.it/it/categorie/${categoria}/`;
      console.log(`[Gobid] Fetching: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      });
      
      if (!response.ok) continue;
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Gobid usa card-asta
      $('article.card-asta, .card-asta, article.card').each((i, el) => {
        try {
          const $el = $(el);
          
          const linkEl = $el.find('a[href*="/aste/"]').first();
          let link = linkEl.attr('href') || '';
          if (!link) return;
          if (!link.startsWith('http')) link = `https://www.gobid.it${link}`;
          
          const titolo = $el.find('h1, h2, .h1, .h2').first().text().trim();
          if (!titolo || deveEssereEsclusa(titolo)) return;
          
          // Estrai tribunale/info
          const tribunaleText = $el.find('h4').text().trim();
          const tribunaleMatch = tribunaleText.match(/Tribunale\s+di\s+(\w+)/i);
          const tribunale = tribunaleMatch ? tribunaleMatch[1] : '';
          
          // Estrai data fine asta
          const dataText = $el.find('.absTime.fine span, [class*="fine"] span').text().trim();
          let dataAsta = null;
          const dateMatch = dataText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
          if (dateMatch) {
            dataAsta = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
          }
          
          // ID asta
          const astaId = $el.attr('data-id') || '';
          const externalId = `gobid_${astaId || Date.now()}_${i}`;
          
          // Su Gobid il prezzo è spesso nel dettaglio, mettiamo 0 e si aggiorna dopo
          aste.push({
            titolo: titolo.substring(0, 200),
            localita: tribunale || 'Italia',
            provincia: tribunale || '',
            regione: '',
            prezzo_base: 0,
            data_asta: dataAsta || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            link_ufficiale: link,
            fonte: 'gobid',
            external_id: externalId,
            tribunale,
            categoria_originale: categoria
          });
          
        } catch (e) {
          console.log('[Gobid] Parse error:', e.message);
        }
      });
      
      await new Promise(r => setTimeout(r, 800));
      
    } catch (e) {
      console.log(`[Gobid] Error ${categoria}:`, e.message);
    }
  }
  
  console.log(`[Gobid] Totale: ${aste.length} aste`);
  return aste;
}

// ============================================
// PROCESSAMENTO FINALE
// ============================================
function processaAste(aste) {
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  
  // Deduplica
  const seen = new Map();
  const deduplicate = aste.filter(a => {
    if (seen.has(a.external_id)) return false;
    seen.set(a.external_id, true);
    return true;
  });
  
  return deduplicate
    .filter(asta => {
      // Ricalcola giorni
      if (asta.data_asta) {
        const dataAsta = new Date(asta.data_asta);
        const giorni = Math.ceil((dataAsta - oggi) / (1000 * 60 * 60 * 24));
        if (giorni < -7 || giorni > CONFIG.giorniMassimiAllaAsta) return false;
      }
      return true;
    })
    .map(asta => {
      const tipologia = determinaTipologia(asta.titolo, asta.categoria_originale || '');
      const dataAsta = new Date(asta.data_asta);
      const giorniAllaAsta = Math.ceil((dataAsta - oggi) / (1000 * 60 * 60 * 24));
      const cauzioneStimata = Math.round(asta.prezzo_base * 0.10);
      
      const astaArricchita = {
        ...asta,
        tipologia,
        cauzione_stimata: cauzioneStimata,
        giorni_alla_asta: giorniAllaAsta,
        is_active: true
      };
      
      delete astaArricchita.categoria_originale;
      
      astaArricchita.livello_interesse = calcolaInteresse(astaArricchita);
      astaArricchita.motivo_interesse = generaMotivoInteresse(astaArricchita);
      
      return astaArricchita;
    });
}

// ============================================
// HANDLER PRINCIPALE
// ============================================
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }
    
    console.log('[fetchAste] Avvio scraping multi-portale...');
    
    // Fetch in parallelo da tutti i portali
    const [asteAnnunci, asteGobid] = await Promise.all([
      fetchAsteAnnunci('Marche'),
      fetchGobid()
    ]);
    
    console.log(`[fetchAste] AsteAnnunci: ${asteAnnunci.length}, Gobid: ${asteGobid.length}`);
    
    // Combina tutto
    const tutteAste = [...asteAnnunci, ...asteGobid];
    console.log(`[fetchAste] Totale raw: ${tutteAste.length}`);
    
    // Processa
    const asteProcessate = processaAste(tutteAste);
    console.log(`[fetchAste] Dopo processing: ${asteProcessate.length}`);
    
    // Recupera esistenti
    const asteEsistenti = await base44.asServiceRole.entities.AstaImmobiliare.list();
    const externalIdsEsistenti = new Set(asteEsistenti.map(a => a.external_id));
    
    // Disattiva vecchie
    const externalIdsNuovi = new Set(asteProcessate.map(a => a.external_id));
    let disattivate = 0;
    for (const astaEsistente of asteEsistenti) {
      if (astaEsistente.is_active && !externalIdsNuovi.has(astaEsistente.external_id)) {
        await base44.asServiceRole.entities.AstaImmobiliare.update(astaEsistente.id, { is_active: false });
        disattivate++;
      }
    }
    
    // Inserisci nuove
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
    
    // Statistiche per fonte
    const statsFonte = {};
    asteProcessate.forEach(a => {
      statsFonte[a.fonte] = (statsFonte[a.fonte] || 0) + 1;
    });
    
    // Statistiche per tipologia
    const statsTipologia = {};
    asteProcessate.forEach(a => {
      statsTipologia[a.tipologia] = (statsTipologia[a.tipologia] || 0) + 1;
    });
    
    console.log(`[fetchAste] Completato: ${inserite} nuove, ${disattivate} disattivate`);
    
    return Response.json({
      success: true,
      riepilogo: {
        totali_raw: tutteAste.length,
        dopo_processing: asteProcessate.length,
        nuove_inserite: inserite,
        disattivate: disattivate,
        gia_presenti: asteProcessate.length - inserite
      },
      per_fonte: statsFonte,
      per_tipologia: statsTipologia
    });
    
  } catch (error) {
    console.log('[fetchAste] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});