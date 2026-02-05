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

function determinaTipologia(titolo, isMobile = false, isMezzo = false) {
  const t = titolo.toLowerCase();
  
  // Se è un mezzo da lavoro, categoria Mezzi
  if (isMezzo) {
    return 'Mezzi';
  }
  
  // Se è un bene mobile generico, va sotto "Attrezzatura"
  if (isMobile) {
    return 'Attrezzatura';
  }
  
  // Immobili
  if (t.includes('abitazione') || t.includes('appartamento') || t.includes('villa') || t.includes('casa')) return 'Abitativo';
  if (t.includes('negozio') || t.includes('ufficio') || t.includes('locale commerciale') || t.includes('commerciale')) return 'Commerciale';
  if (t.includes('capannone') || t.includes('industriale') || t.includes('magazzino') || t.includes('opifici') || t.includes('laboratorio')) return 'Industriale';
  if (t.includes('camion') || t.includes('furgone') || t.includes('veicolo') || t.includes('auto') || t.includes('moto')) return 'Mezzi';
  if (t.includes('attrezzatura') || t.includes('macchinario')) return 'Attrezzatura';
  if (t.includes('arredamento') || t.includes('mobili') || t.includes('arredi')) return 'Arredamento attività';
  if (t.includes('terreno')) return 'Terreno';
  // Box/Garage esclusi dal filtro deveEssereEsclusa, questa riga non dovrebbe mai matchare
  // if (t.includes('box') || t.includes('garage') || t.includes('posto auto') || t.includes('autorimessa')) return 'Box/Garage';
  return 'Altro';
}

// Verifica se un bene mobile è auto/moto (da escludere dalla categoria Attrezzatura)
function isAutoMoto(titolo, descrizione = '') {
  const testo = `${titolo} ${descrizione}`.toLowerCase();
  const keywords = [
    'autovettura', 'autovetture', 'automobile', 'auto ',
    'motoveicolo', 'motociclo', 'moto ', 'scooter', 'ciclomotore',
    'furgone', 'furgoni', 'camion', 'autocarro', 'autocarri',
    'automezzo', 'automezzi', 'veicolo', 'veicoli',
    'ruspa', 'escavatore', 'trattore', 'carrello elevatore'
  ];
  return keywords.some(kw => testo.includes(kw));
}

// Verifica se è un mezzo da lavoro (da INCLUDERE in categoria Mezzi)
function isMezzoDaLavoro(titolo, descrizione = '') {
  const testo = `${titolo} ${descrizione}`.toLowerCase();
  // Keywords INCLUSE (mezzi da lavoro)
  const includeKeywords = [
    'furgone', 'furgoni', 'camion', 'autocarro', 'autocarri',
    'automezzo commerciale', 'automezzi commerciali',
    'ruspa', 'escavatore', 'escavatrici', 'pala meccanica',
    'trattore', 'carrello elevatore', 'muletto',
    'rimorchio', 'semirimorchio', 'motrice',
    'betoniera', 'gru', 'sollevatore', 'piattaforma elevatrice',
    'minipala', 'terna', 'dumper', 'rullo compressore'
  ];
  // Keywords ESCLUSE (auto, moto, posti auto)
  const excludeKeywords = [
    'autovettura', 'autovetture', 'automobile', 'auto ',
    'motoveicolo', 'motociclo', 'moto ', 'scooter', 'ciclomotore',
    'posto auto', 'posti auto', 'box auto', 'garage'
  ];
  
  const hasInclude = includeKeywords.some(kw => testo.includes(kw));
  const hasExclude = excludeKeywords.some(kw => testo.includes(kw));
  
  return hasInclude && !hasExclude;
}

// Verifica se l'asta contiene parole chiave da escludere
function deveEssereEsclusa(titolo, descrizione = '') {
  const testo = `${titolo} ${descrizione}`.toLowerCase();
  
  // Esclusione globale: posti auto, garage, autorimesse
  const escludiSempre = [
    'posto auto', 'posti auto', 'box auto', 'garage', 'autorimessa', 'autorimesse'
  ];
  if (escludiSempre.some(kw => testo.includes(kw))) {
    return true;
  }
  
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

// Parsing IVG Marche - URL con filtro per tribunale specifico
// Tribunali Marche: pesaro, ancona, macerata, fermo, ascoli-piceno
async function fetchIVGMarcheSingoloTribunale(tribunaleSlug, provinciaNome) {
  const aste = [];
  let pagina = 1;
  const maxPagine = 10; // Massimo 10 pagine per tribunale
  
  while (pagina <= maxPagine) {
    try {
      const url = `https://www.ivgmarche.it/Beni/Immobili?SelectedTribunaleId=${tribunaleSlug}&page=${pagina}`;
      console.log(`[fetchAste] Fetching: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
        }
      });
      
      if (!response.ok) {
        console.log(`[fetchAste] ${tribunaleSlug} page ${pagina} not ok:`, response.status);
        break;
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      
      const risultatiPagina = [];

      $('.tile-result').each((i, el) => {
        try {
          const link = $(el).find('a.tile-url-container').attr('href') || '';
          const titolo = $(el).find('h2.font-size-larger').text().trim();
          const prezzoText = $(el).find('.tile-price strong').text().trim();
          const dataAstaText = $(el).find('.tile-data strong').first().text().trim();

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

          // Estrai località dal titolo (secondo segmento)
          const titoloParti = titolo.split(' - ');
          const localita = titoloParti[1] || provinciaNome;

          // ID univoco dal link (es: B2386177)
          const idMatch = link.match(/Detail\/([A-Z0-9]+)/i);
          const externalId = idMatch ? `marche_${idMatch[1]}` : `marche_${tribunaleSlug}_${i}_${Date.now()}`;

          risultatiPagina.push({
            titolo,
            localita,
            provincia: provinciaNome,
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

      // Se non ci sono risultati, abbiamo finito le pagine
      if (risultatiPagina.length === 0) {
        console.log(`[fetchAste] ${tribunaleSlug} - nessun risultato a pagina ${pagina}, stop`);
        break;
      }

      aste.push(...risultatiPagina);
      console.log(`[fetchAste] ${tribunaleSlug} pagina ${pagina}: ${risultatiPagina.length} aste`);
      
      pagina++;
      
      // Piccola pausa per non sovraccaricare il server
      await new Promise(r => setTimeout(r, 300));
      
    } catch (e) {
      console.log(`[fetchAste] Error fetching ${tribunaleSlug} page ${pagina}:`, e.message);
      break;
    }
  }
  
  return aste;
}

// Parsing IVG Marche - Tutti i tribunali delle Marche (IMMOBILI)
async function fetchIVGMarcheImmobili() {
  const tribunaliMarche = [
    { slug: 'pesaro', provincia: 'Pesaro-Urbino' },
    { slug: 'ancona', provincia: 'Ancona' },
    { slug: 'macerata', provincia: 'Macerata' },
    { slug: 'fermo', provincia: 'Fermo' },
    { slug: 'ascoli-piceno', provincia: 'Ascoli Piceno' },
  ];

  const tutteLeAste = [];

  for (const tribunale of tribunaliMarche) {
    const asteT = await fetchIVGMarcheSingoloTribunale(tribunale.slug, tribunale.provincia);
    tutteLeAste.push(...asteT);
    console.log(`[fetchAste] Immobili ${tribunale.provincia}: ${asteT.length}`);
  }

  console.log(`[fetchAste] IVG Marche IMMOBILI TOTALE: ${tutteLeAste.length} aste`);
  return tutteLeAste;
}

// Categorie mobili da ESCLUDERE (auto e moto)
const CATEGORIE_MOBILI_ESCLUSE = [
  'autovetture',
  'motoveicolo-o-ciclomotore',
  'automezzi-commerciali' // anche furgoni/camion escludiamo
];

// Parsing IVG Marche - Beni MOBILI (attrezzature, macchinari, arredi, etc.)
async function fetchIVGMarcheMobiliSingoloTribunale(tribunaleSlug, provinciaNome) {
  const aste = [];
  let pagina = 1;
  const maxPagine = 5; // Meno pagine per mobili
  
  while (pagina <= maxPagine) {
    try {
      const url = `https://www.ivgmarche.it/Beni/Mobili?SelectedTribunaleId=${tribunaleSlug}&page=${pagina}`;
      console.log(`[fetchAste] Fetching Mobili: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
        }
      });
      
      if (!response.ok) {
        console.log(`[fetchAste] Mobili ${tribunaleSlug} page ${pagina} not ok:`, response.status);
        break;
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      
      const risultatiPagina = [];

      $('.tile-result').each((i, el) => {
        try {
          const link = $(el).find('a.tile-url-container').attr('href') || '';
          const titolo = $(el).find('h2.font-size-larger').text().trim();
          const prezzoText = $(el).find('.tile-price strong').text().trim();
          const dataAstaText = $(el).find('.tile-data strong').first().text().trim();
          const descrizione = $(el).find('.tile-desc-desc').text().trim();

          if (!titolo || !link) return;

          // Estrai prezzo - gestisci "OFFERTA LIBERA"
          let prezzoNum = 0;
          if (!prezzoText.toLowerCase().includes('offerta libera')) {
            const prezzoMatch = prezzoText.match(/[\d.,]+/);
            if (prezzoMatch) {
              prezzoNum = parseFloat(prezzoMatch[0].replace(/\./g, '').replace(',', '.')) || 0;
            }
          }

          // Estrai data asta
          let dataAsta = null;
          const dateMatch = dataAstaText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
          if (dateMatch) {
            dataAsta = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
          }

          // ID univoco dal link
          const idMatch = link.match(/Detail\/([A-Z0-9]+)/i);
          const externalId = idMatch ? `marche_mob_${idMatch[1]}` : `marche_mob_${tribunaleSlug}_${i}_${Date.now()}`;

          risultatiPagina.push({
            titolo,
            localita: provinciaNome,
            provincia: provinciaNome,
            prezzo_base: prezzoNum,
            data_asta: dataAsta || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            link_ufficiale: link.startsWith('http') ? link : `https://www.ivgmarche.it${link}`,
            fonte: 'ivgmarche',
            external_id: externalId,
            _isMobile: true, // Flag per identificare beni mobili
            _descrizione: descrizione
          });
        } catch (e) {
          console.log('[fetchAste] Error parsing IVG Marche Mobili item:', e.message);
        }
      });

      if (risultatiPagina.length === 0) {
        console.log(`[fetchAste] Mobili ${tribunaleSlug} - nessun risultato a pagina ${pagina}, stop`);
        break;
      }

      aste.push(...risultatiPagina);
      console.log(`[fetchAste] Mobili ${tribunaleSlug} pagina ${pagina}: ${risultatiPagina.length} aste`);
      
      pagina++;
      await new Promise(r => setTimeout(r, 300));
      
    } catch (e) {
      console.log(`[fetchAste] Error fetching Mobili ${tribunaleSlug} page ${pagina}:`, e.message);
      break;
    }
  }
  
  return aste;
}

// Parsing IVG Marche - Tutti i tribunali delle Marche (MOBILI)
async function fetchIVGMarcheMobili() {
  const tribunaliMarche = [
    { slug: 'pesaro', provincia: 'Pesaro-Urbino' },
    { slug: 'ancona', provincia: 'Ancona' },
    { slug: 'macerata', provincia: 'Macerata' },
    { slug: 'fermo', provincia: 'Fermo' },
    { slug: 'ascoli-piceno', provincia: 'Ascoli Piceno' },
  ];

  const tutteLeAste = [];

  for (const tribunale of tribunaliMarche) {
    const asteT = await fetchIVGMarcheMobiliSingoloTribunale(tribunale.slug, tribunale.provincia);
    tutteLeAste.push(...asteT);
    console.log(`[fetchAste] Mobili ${tribunale.provincia}: ${asteT.length}`);
  }

  console.log(`[fetchAste] IVG Marche MOBILI TOTALE: ${tutteLeAste.length} aste`);
  return tutteLeAste;
}

// Parsing IVG Marche - Beni MOBILI categoria AUTOMEZZI (mezzi da lavoro)
async function fetchIVGMarcheMezziSingoloTribunale(tribunaleSlug, provinciaNome) {
  const aste = [];
  let pagina = 1;
  const maxPagine = 3;
  
  while (pagina <= maxPagine) {
    try {
      // Categoria automezzi-commerciali
      const url = `https://www.ivgmarche.it/Beni/Mobili?SelectedTribunaleId=${tribunaleSlug}&SelectedCategoriaId=automezzi-commerciali&page=${pagina}`;
      console.log(`[fetchAste] Fetching Mezzi: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
        }
      });
      
      if (!response.ok) break;

      const html = await response.text();
      const $ = cheerio.load(html);
      
      const risultatiPagina = [];

      $('.tile-result').each((i, el) => {
        try {
          const link = $(el).find('a.tile-url-container').attr('href') || '';
          const titolo = $(el).find('h2.font-size-larger').text().trim();
          const prezzoText = $(el).find('.tile-price strong').text().trim();
          const dataAstaText = $(el).find('.tile-data strong').first().text().trim();
          const descrizione = $(el).find('.tile-desc-desc').text().trim();

          if (!titolo || !link) return;

          let prezzoNum = 0;
          if (!prezzoText.toLowerCase().includes('offerta libera')) {
            const prezzoMatch = prezzoText.match(/[\d.,]+/);
            if (prezzoMatch) {
              prezzoNum = parseFloat(prezzoMatch[0].replace(/\./g, '').replace(',', '.')) || 0;
            }
          }

          let dataAsta = null;
          const dateMatch = dataAstaText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
          if (dateMatch) {
            dataAsta = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
          }

          const idMatch = link.match(/Detail\/([A-Z0-9]+)/i);
          const externalId = idMatch ? `marche_mezzi_${idMatch[1]}` : `marche_mezzi_${tribunaleSlug}_${i}_${Date.now()}`;

          risultatiPagina.push({
            titolo,
            localita: provinciaNome,
            provincia: provinciaNome,
            prezzo_base: prezzoNum,
            data_asta: dataAsta || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            link_ufficiale: link.startsWith('http') ? link : `https://www.ivgmarche.it${link}`,
            fonte: 'ivgmarche',
            external_id: externalId,
            _isMezzo: true,
            _descrizione: descrizione
          });
        } catch (e) {
          console.log('[fetchAste] Error parsing Mezzi item:', e.message);
        }
      });

      if (risultatiPagina.length === 0) break;

      aste.push(...risultatiPagina);
      console.log(`[fetchAste] Mezzi ${tribunaleSlug} pagina ${pagina}: ${risultatiPagina.length}`);
      
      pagina++;
      await new Promise(r => setTimeout(r, 300));
      
    } catch (e) {
      console.log(`[fetchAste] Error fetching Mezzi ${tribunaleSlug}:`, e.message);
      break;
    }
  }
  
  return aste;
}

// Parsing IVG Marche - Tutti i tribunali (MEZZI DA LAVORO)
async function fetchIVGMarcheMezzi() {
  const tribunaliMarche = [
    { slug: 'pesaro', provincia: 'Pesaro-Urbino' },
    { slug: 'ancona', provincia: 'Ancona' },
    { slug: 'macerata', provincia: 'Macerata' },
    { slug: 'fermo', provincia: 'Fermo' },
    { slug: 'ascoli-piceno', provincia: 'Ascoli Piceno' },
  ];

  const tutteLeAste = [];

  for (const tribunale of tribunaliMarche) {
    const asteT = await fetchIVGMarcheMezziSingoloTribunale(tribunale.slug, tribunale.provincia);
    tutteLeAste.push(...asteT);
  }

  console.log(`[fetchAste] IVG Marche MEZZI TOTALE: ${tutteLeAste.length}`);
  return tutteLeAste;
}

// Funzione combinata per tutti i beni IVG Marche
async function fetchIVGMarche() {
  const [immobili, mobili, mezzi] = await Promise.all([
    fetchIVGMarcheImmobili(),
    fetchIVGMarcheMobili(),
    fetchIVGMarcheMezzi()
  ]);
  
  console.log(`[fetchAste] IVG Marche TOTALE: ${immobili.length} immobili + ${mobili.length} mobili + ${mezzi.length} mezzi`);
  return [...immobili, ...mobili, ...mezzi];
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

    // Se è bene mobile (non mezzo), escludi auto/moto/furgoni
    if (asta._isMobile && !asta._isMezzo && isAutoMoto(asta.titolo, asta._descrizione)) {
      console.log(`[fetchAste] Esclusa auto/moto: ${asta.titolo.substring(0, 50)}`);
      return false;
    }

    // Se è mezzo, escludi auto/moto/posti auto ma includi furgoni/camion/ruspe
    if (asta._isMezzo && !isMezzoDaLavoro(asta.titolo, asta._descrizione)) {
      console.log(`[fetchAste] Escluso non-mezzo-lavoro: ${asta.titolo.substring(0, 50)}`);
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
    const tipologia = determinaTipologia(asta.titolo, asta._isMobile, asta._isMezzo);
    const dataAsta = new Date(asta.data_asta);
    const giorniAllaAsta = Math.ceil((dataAsta - oggi) / (1000 * 60 * 60 * 24));
    
    // Calcola cauzione stimata (solitamente 10% del prezzo base)
    const cauzioneStimata = Math.round(asta.prezzo_base * 0.10);

    // Rimuovi campi interni prima di salvare
    const { _isMobile, _isMezzo, _descrizione, ...astaClean } = asta;

    const astaArricchita = {
      ...astaClean,
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