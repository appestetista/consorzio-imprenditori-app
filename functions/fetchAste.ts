import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as cheerio from 'npm:cheerio@1.0.0';

// Configurazione soglie di filtraggio
const CONFIG = {
  giorniMassimiAllaAsta: 90, // Max 90 giorni dalla data corrente
  // Province Marche + Rimini
  provinceTarget: ['Pesaro-Urbino', 'Ancona', 'Macerata', 'Fermo', 'Ascoli Piceno', 'Rimini'],
};

// Parole chiave per escludere aste NON a proprietà intera o terreni agricoli
const ESCLUSIONI = {
  titolo: [
    // Quote frazionate - NO proprietà intera
    'quota indivisa',
    'quota di',
    'quota pari',
    '1/2 di',
    '1/3 di',
    '1/4 di',
    '1/5 di',
    '1/6 di',
    '1/8 di',
    '1/10 di',
    '50% di',
    '50 % di',
    '33% di',
    '25% di',
    'pro quota',
    'comproprietà',
    'usufrutto',
    'nuda proprietà',
    'diritto di',
    // Terreni agricoli
    'terreno agricolo',
    'terreno seminativo', 
    'terreno boschivo',
    'fondo agricolo',
    'fondo rustico',
    'appezzamento',
  ],
};

function determinaTipologia(titolo) {
  const t = titolo.toLowerCase();
  if (t.includes('abitazione') || t.includes('appartamento') || t.includes('villa') || t.includes('casa')) return 'Abitativo';
  if (t.includes('negozio') || t.includes('ufficio') || t.includes('locale commerciale') || t.includes('commerciale')) return 'Commerciale';
  if (t.includes('capannone') || t.includes('industriale') || t.includes('magazzino') || t.includes('opifici') || t.includes('laboratorio')) return 'Industriale';
  if (t.includes('camion') || t.includes('furgone') || t.includes('veicolo') || t.includes('auto') || t.includes('moto')) return 'Mezzi';
  if (t.includes('attrezzatura') || t.includes('macchinario')) return 'Attrezzatura';
  if (t.includes('arredamento') || t.includes('mobili') || t.includes('arredi')) return 'Arredamento attività';
  if (t.includes('terreno')) return 'Terreno';
  if (t.includes('box') || t.includes('garage') || t.includes('posto auto') || t.includes('autorimessa')) return 'Box/Garage';
  return 'Altro';
}

// Verifica se l'asta contiene parole chiave da escludere
function deveEssereEsclusa(titolo, descrizione = '') {
  const testo = `${titolo} ${descrizione}`.toLowerCase();
  return ESCLUSIONI.titolo.some(keyword => testo.includes(keyword.toLowerCase()));
}

function calcolaInteresse(asta) {
  let punteggio = 0;
  const oggi = new Date();
  const dataAsta = new Date(asta.data_asta);
  const giorniAllaAsta = Math.ceil((dataAsta - oggi) / (1000 * 60 * 60 * 24));

  // Prezzo accessibile
  if (asta.prezzo_base < 30000) punteggio += 3;
  else if (asta.prezzo_base < 70000) punteggio += 2;
  else if (asta.prezzo_base < 120000) punteggio += 1;

  // Tempistica ideale (più tempo = meglio per analizzare)
  if (giorniAllaAsta >= 45 && giorniAllaAsta <= 70) punteggio += 2;
  else if (giorniAllaAsta > 70) punteggio += 1;

  // Tipologia appetibile
  if (['Abitativo', 'Commerciale'].includes(asta.tipologia)) punteggio += 2;
  if (asta.tipologia === 'Industriale') punteggio += 1;

  if (punteggio >= 5) return 'Molto interessante';
  if (punteggio >= 3) return 'Interessante';
  return 'Da valutare';
}

function generaMotivoInteresse(asta) {
  const motivi = [];
  const oggi = new Date();
  const dataAsta = new Date(asta.data_asta);
  const giorniAllaAsta = Math.ceil((dataAsta - oggi) / (1000 * 60 * 60 * 24));

  // Perché aprirla?
  if (asta.prezzo_base < 50000) {
    motivi.push('💰 Investimento contenuto');
  } else if (asta.prezzo_base < 100000) {
    motivi.push('💰 Prezzo sotto i 100k');
  }

  if (['Abitativo'].includes(asta.tipologia)) {
    motivi.push('🏠 Immobile residenziale - alta domanda affitto/vendita');
  } else if (asta.tipologia === 'Commerciale') {
    motivi.push('🏪 Locale commerciale - potenziale reddito');
  }

  if (giorniAllaAsta >= 50) {
    motivi.push('⏰ Tempo sufficiente per perizia e sopralluogo');
  }

  return motivi.length > 0 ? motivi.join(' • ') : 'Opportunità da analizzare con attenzione';
}

function normalizzaProvincia(tribunale) {
  const t = tribunale.toLowerCase();
  if (t.includes('pesaro')) return 'Pesaro-Urbino';
  if (t.includes('urbino')) return 'Pesaro-Urbino';
  if (t.includes('ancona')) return 'Ancona';
  if (t.includes('macerata')) return 'Macerata';
  if (t.includes('fermo')) return 'Fermo';
  if (t.includes('ascoli')) return 'Ascoli Piceno';
  if (t.includes('rimini')) return 'Rimini';
  return null; // Non nelle Marche/Rimini
}

// Parsing IVG Marche - URL: https://www.ivgmarche.it/Beni/Immobili
async function fetchIVGMarche() {
  const aste = [];
  try {
    const response = await fetch('https://www.ivgmarche.it/Beni/Immobili', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
      }
    });
    
    if (!response.ok) {
      console.log('[fetchAste] IVG Marche response not ok:', response.status);
      return aste;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Struttura trovata: div.tile-result con link, h2 per titolo, .tile-price, .tile-data
    $('.tile-result').each((i, el) => {
      try {
        const link = $(el).find('a.tile-url-container').attr('href') || '';
        const titolo = $(el).find('h2.font-size-larger').text().trim();
        const prezzoText = $(el).find('.tile-price strong').text().trim();
        const dataAstaText = $(el).find('.tile-data strong').first().text().trim();
        const tribunaleText = $(el).find('.tile-data').text();

        if (!titolo || !link) return;

        // Estrai prezzo - formato "€ € 216.352,00"
        const prezzoMatch = prezzoText.match(/[\d.,]+/);
        let prezzoNum = 0;
        if (prezzoMatch) {
          prezzoNum = parseFloat(prezzoMatch[0].replace(/\./g, '').replace(',', '.')) || 0;
        }

        // Estrai data asta - formato "04/02/2026 - 09:00"
        let dataAsta = null;
        const dateMatch = dataAstaText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (dateMatch) {
          dataAsta = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
        }

        // Estrai tribunale per determinare provincia
        const tribunaleMatch = tribunaleText.match(/Tribunale di ([^\n]+)/);
        const tribunale = tribunaleMatch ? tribunaleMatch[1].trim() : '';
        const provincia = normalizzaProvincia(tribunale);

        // Se non è nelle province target, skip
        if (!provincia) return;

        // ID univoco dal link (es: B2386177)
        const idMatch = link.match(/Detail\/([A-Z0-9]+)/i);
        const externalId = idMatch ? `marche_${idMatch[1]}` : `marche_${i}_${Date.now()}`;

        aste.push({
          titolo,
          localita: titolo.split(' - ')[1] || tribunale,
          provincia,
          prezzo_base: prezzoNum,
          data_asta: dataAsta || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          link_ufficiale: link.startsWith('http') ? link : `https://www.ivgmarche.it${link}`,
          fonte: 'ivgmarche',
          external_id: externalId
        });
      } catch (e) {
        console.log('[fetchAste] Error parsing IVG Marche item:', e.message);
      }
    });
    
    console.log(`[fetchAste] IVG Marche parsed ${aste.length} items`);
  } catch (e) {
    console.log('[fetchAste] Error fetching IVG Marche:', e.message);
  }
  return aste;
}

// Parsing IVG Rimini - URL: https://www.ivgrimini.it/ricerca/immobili
// Il sito usa Nuxt.js con SSR, i dati potrebbero essere in JSON dentro la pagina
async function fetchIVGRimini() {
  const aste = [];
  try {
    const response = await fetch('https://www.ivgrimini.it/ricerca/immobili', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
      }
    });
    
    if (!response.ok) {
      console.log('[fetchAste] IVG Rimini response not ok:', response.status);
      return aste;
    }

    const html = await response.text();
    
    // IVG Rimini usa Nuxt.js - i dati sono spesso in window.__NUXT__ o caricati via API
    // Proviamo a estrarre i dati dal JSON embedded
    const nuxtDataMatch = html.match(/window\.__NUXT__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/);
    
    if (nuxtDataMatch) {
      try {
        // Prova a parsare i dati Nuxt
        const nuxtStr = nuxtDataMatch[1];
        // Il formato Nuxt è complesso, cerchiamo i lotti direttamente nel testo
        console.log('[fetchAste] Found Nuxt data, attempting extraction...');
      } catch (e) {
        console.log('[fetchAste] Could not parse Nuxt data:', e.message);
      }
    }

    // Alternativa: prova con API diretta di IVG Rimini
    // Basandosi sulla struttura, potrebbero esserci API REST
    const apiResponse = await fetch('https://www.ivgrimini.it/api/search?type=immobili&page=1&limit=50', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    });
    
    if (apiResponse.ok) {
      try {
        const data = await apiResponse.json();
        console.log('[fetchAste] IVG Rimini API response:', JSON.stringify(data).substring(0, 200));
        
        if (data.items || data.data || data.results) {
          const items = data.items || data.data || data.results || [];
          items.forEach((item, i) => {
            aste.push({
              titolo: item.title || item.titolo || item.nome || 'Immobile Rimini',
              localita: item.location || item.comune || 'Rimini',
              provincia: 'Rimini',
              prezzo_base: item.price || item.prezzo || item.prezzo_base || 0,
              data_asta: item.date || item.data_asta || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              link_ufficiale: item.url || item.link || `https://www.ivgrimini.it/inserzioni/${item.id || item.slug || i}`,
              fonte: 'ivgrimini',
              external_id: `rimini_${item.id || item.slug || i}`
            });
          });
        }
      } catch (e) {
        console.log('[fetchAste] IVG Rimini API parse error:', e.message);
      }
    }

    // Se API non funziona, parsing HTML standard
    if (aste.length === 0) {
      const $ = cheerio.load(html);
      
      // Cerca card/tile degli immobili nella pagina
      $('[class*="card"], [class*="item"], [class*="inserzione"]').each((i, el) => {
        try {
          const link = $(el).find('a[href*="inserzioni"]').attr('href') || '';
          if (!link) return;
          
          const titolo = $(el).find('h2, h3, h4, .title, .titolo').first().text().trim();
          const prezzoText = $(el).find('[class*="prezzo"], [class*="price"]').first().text().trim();
          
          if (!titolo) return;

          const prezzoMatch = prezzoText.match(/[\d.,]+/);
          const prezzoNum = prezzoMatch ? parseFloat(prezzoMatch[0].replace(/\./g, '').replace(',', '.')) : 0;

          const idMatch = link.match(/inserzioni\/([^/]+)/);
          const externalId = idMatch ? `rimini_${idMatch[1]}` : `rimini_${i}_${Date.now()}`;

          aste.push({
            titolo,
            localita: 'Rimini',
            provincia: 'Rimini',
            prezzo_base: prezzoNum,
            data_asta: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            link_ufficiale: link.startsWith('http') ? link : `https://www.ivgrimini.it${link}`,
            fonte: 'ivgrimini',
            external_id: externalId
          });
        } catch (e) {
          console.log('[fetchAste] Error parsing IVG Rimini item:', e.message);
        }
      });
    }

    console.log(`[fetchAste] IVG Rimini parsed ${aste.length} items`);
  } catch (e) {
    console.log('[fetchAste] Error fetching IVG Rimini:', e.message);
  }
  return aste;
}

function filtraAste(aste) {
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);

  return aste.filter(asta => {
    // Escludi per parole chiave problematiche (quote frazionate, terreni agricoli)
    if (deveEssereEsclusa(asta.titolo, asta.descrizione)) {
      console.log(`[fetchAste] Esclusa per keyword: ${asta.titolo.substring(0, 50)}`);
      return false;
    }

    // Filtra per data asta (max 90 giorni, incluse immediate <30)
    if (asta.data_asta) {
      const dataAsta = new Date(asta.data_asta);
      const giorniAllaAsta = Math.ceil((dataAsta - oggi) / (1000 * 60 * 60 * 24));
      
      // Escludi aste già passate o oltre 90 giorni
      if (giorniAllaAsta < 0 || giorniAllaAsta > CONFIG.giorniMassimiAllaAsta) {
        return false;
      }
    }

    return true;
  });
}

function arricchisciAste(aste) {
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);

  return aste.map(asta => {
    const tipologia = determinaTipologia(asta.titolo);
    const dataAsta = new Date(asta.data_asta);
    const giorniAllaAsta = Math.ceil((dataAsta - oggi) / (1000 * 60 * 60 * 24));
    
    // Calcola cauzione stimata (solitamente 10% del prezzo base)
    const cauzioneStimata = Math.round(asta.prezzo_base * 0.10);

    const astaArricchita = {
      ...asta,
      tipologia,
      cauzione_stimata: cauzioneStimata,
      giorni_alla_asta: giorniAllaAsta
    };
    
    astaArricchita.livello_interesse = calcolaInteresse(astaArricchita);
    astaArricchita.motivo_interesse = generaMotivoInteresse(astaArricchita);
    astaArricchita.is_active = true;

    return astaArricchita;
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verifica autenticazione (solo admin può lanciare manualmente)
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    console.log('[fetchAste] Starting fetch...');

    // Recupera aste da entrambe le fonti
    const [asteMarche, asteRimini] = await Promise.all([
      fetchIVGMarche(),
      fetchIVGRimini()
    ]);

    console.log(`[fetchAste] Raw: Marche=${asteMarche.length}, Rimini=${asteRimini.length}`);

    // Combina e filtra
    const tutteLeAste = [...asteMarche, ...asteRimini];
    const asteFiltrate = filtraAste(tutteLeAste);
    const asteArricchite = arricchisciAste(asteFiltrate);

    console.log(`[fetchAste] After filter: ${asteArricchite.length}`);

    // Recupera aste esistenti per evitare duplicati
    const asteEsistenti = await base44.asServiceRole.entities.AstaImmobiliare.list();
    const externalIdsEsistenti = new Set(asteEsistenti.map(a => a.external_id));

    // Marca le vecchie aste come non attive se non più presenti
    const externalIdsNuovi = new Set(asteArricchite.map(a => a.external_id));
    for (const astaEsistente of asteEsistenti) {
      if (astaEsistente.is_active && !externalIdsNuovi.has(astaEsistente.external_id)) {
        await base44.asServiceRole.entities.AstaImmobiliare.update(astaEsistente.id, { is_active: false });
      }
    }

    // Inserisci solo nuove aste
    const nuoveAste = asteArricchite.filter(a => !externalIdsEsistenti.has(a.external_id));
    
    let inserite = 0;
    for (const asta of nuoveAste) {
      try {
        await base44.asServiceRole.entities.AstaImmobiliare.create(asta);
        inserite++;
      } catch (e) {
        console.log('[fetchAste] Error inserting:', e.message);
      }
    }

    console.log(`[fetchAste] Inserted ${inserite} new auctions`);

    return Response.json({
      success: true,
      totali_trovate: tutteLeAste.length,
      dopo_filtro: asteArricchite.length,
      nuove_inserite: inserite,
      gia_presenti: asteArricchite.length - inserite,
      dettaglio: {
        marche_raw: asteMarche.length,
        rimini_raw: asteRimini.length
      }
    });

  } catch (error) {
    console.log('[fetchAste] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});