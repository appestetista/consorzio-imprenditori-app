import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as cheerio from 'npm:cheerio@1.0.0';

// Configurazione
const CONFIG = {
  giorniMassimiAllaAsta: 120,
  provinceTarget: ['Pesaro-Urbino', 'Ancona', 'Macerata', 'Fermo', 'Ascoli Piceno', 'Rimini'],
};

// Parole chiave per escludere aste
const ESCLUSIONI = {
  titolo: [
    'quota indivisa', 'quota di', 'quota pari', '1/2 di', '1/3 di', '1/4 di',
    '1/5 di', '1/6 di', '1/8 di', '50% di', '33% di', '25% di',
    'pro quota', 'comproprietà', 'usufrutto', 'nuda proprietà', 'diritto di',
    'terreno agricolo', 'terreno seminativo', 'terreno boschivo', 'fondo agricolo', 'fondo rustico',
    'posto auto', 'posti auto', 'box auto', 'garage', 'autorimessa'
  ]
};

function determinaTipologia(titolo, isMobile = false, isMezzo = false) {
  const t = titolo.toLowerCase();
  
  if (isMezzo) return 'Mezzi';
  if (isMobile) return 'Attrezzatura';
  
  if (t.includes('abitazione') || t.includes('appartamento') || t.includes('villa') || t.includes('casa') || t.includes('villino')) return 'Abitativo';
  if (t.includes('negozio') || t.includes('ufficio') || t.includes('locale commerciale') || t.includes('commerciale')) return 'Commerciale';
  if (t.includes('capannone') || t.includes('industriale') || t.includes('magazzino') || t.includes('opifici') || t.includes('laboratorio')) return 'Industriale';
  if (t.includes('arredamento') || t.includes('mobili') || t.includes('arredi')) return 'Arredamento attività';
  if (t.includes('terreno')) return 'Terreno';
  
  return 'Altro';
}

function deveEssereEsclusa(titolo, descrizione = '') {
  const testo = `${titolo} ${descrizione}`.toLowerCase();
  return ESCLUSIONI.titolo.some(kw => testo.includes(kw.toLowerCase()));
}

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

function generaMotivoInteresse(asta) {
  const motivi = [];
  
  if (asta.prezzo_base < 50000) motivi.push('💰 Investimento contenuto');
  else if (asta.prezzo_base < 100000) motivi.push('💰 Prezzo sotto i 100k');
  
  if (asta.tipologia === 'Abitativo') motivi.push('🏠 Residenziale - alta domanda');
  else if (asta.tipologia === 'Commerciale') motivi.push('🏪 Commerciale - potenziale reddito');
  
  if (asta.giorni_alla_asta >= 50) motivi.push('⏰ Tempo per perizia');
  
  return motivi.length > 0 ? motivi.join(' • ') : 'Opportunità da analizzare';
}

// Fetch IVG Marche - Immobili
async function fetchIVGMarcheImmobili(tribunaleSlug, provinciaNome) {
  const aste = [];
  let pagina = 1;
  const maxPagine = 8;
  
  while (pagina <= maxPagine) {
    try {
      const url = `https://www.ivgmarche.it/Beni/Immobili?SelectedTribunaleId=${tribunaleSlug}&page=${pagina}`;
      console.log(`[fetchAste] Fetching: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      });
      
      if (!response.ok) break;
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      const risultati = [];
      
      $('.tile-result').each((i, el) => {
        try {
          const link = $(el).find('a.tile-url-container').attr('href') || '';
          const titolo = $(el).find('h2.font-size-larger').text().trim();
          const prezzoText = $(el).find('.tile-price strong').text().trim();
          const dataAstaText = $(el).find('.tile-data strong').first().text().trim();
          
          if (!titolo || !link) return;
          
          const prezzoMatch = prezzoText.match(/[\d.,]+/);
          let prezzoNum = 0;
          if (prezzoMatch) {
            prezzoNum = parseFloat(prezzoMatch[0].replace(/\./g, '').replace(',', '.')) || 0;
          }
          
          let dataAsta = null;
          const dateMatch = dataAstaText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
          if (dateMatch) {
            dataAsta = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
          }
          
          const titoloParti = titolo.split(' - ');
          const localita = titoloParti[1] || provinciaNome;
          
          const idMatch = link.match(/Detail\/([A-Z0-9]+)/i);
          const externalId = idMatch ? `ivg_${idMatch[1]}` : `ivg_${tribunaleSlug}_${i}_${Date.now()}`;
          
          risultati.push({
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
          console.log('[fetchAste] Error parsing item:', e.message);
        }
      });
      
      if (risultati.length === 0) break;
      
      aste.push(...risultati);
      console.log(`[fetchAste] ${tribunaleSlug} pag ${pagina}: ${risultati.length} aste`);
      
      pagina++;
      await new Promise(r => setTimeout(r, 500));
      
    } catch (e) {
      console.log(`[fetchAste] Error ${tribunaleSlug}:`, e.message);
      break;
    }
  }
  
  return aste;
}

// Fetch tutti i tribunali Marche
async function fetchTuttiTribunaliMarche() {
  const tribunali = [
    { slug: 'pesaro', provincia: 'Pesaro-Urbino' },
    { slug: 'ancona', provincia: 'Ancona' },
    { slug: 'macerata', provincia: 'Macerata' },
    { slug: 'fermo', provincia: 'Fermo' },
    { slug: 'ascoli-piceno', provincia: 'Ascoli Piceno' },
  ];
  
  const tutteLeAste = [];
  
  for (const tribunale of tribunali) {
    const asteT = await fetchIVGMarcheImmobili(tribunale.slug, tribunale.provincia);
    tutteLeAste.push(...asteT);
    console.log(`[fetchAste] ${tribunale.provincia}: ${asteT.length} aste`);
    await new Promise(r => setTimeout(r, 1000));
  }
  
  return tutteLeAste;
}

// Filtra e arricchisci
function processaAste(aste) {
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  
  // Deduplica per external_id
  const seen = new Map();
  const deduplicate = aste.filter(a => {
    if (seen.has(a.external_id)) return false;
    seen.set(a.external_id, true);
    return true;
  });
  
  return deduplicate
    .filter(asta => {
      if (deveEssereEsclusa(asta.titolo)) return false;
      
      if (asta.data_asta) {
        const dataAsta = new Date(asta.data_asta);
        const giorni = Math.ceil((dataAsta - oggi) / (1000 * 60 * 60 * 24));
        if (giorni < 0 || giorni > CONFIG.giorniMassimiAllaAsta) return false;
      }
      
      return true;
    })
    .map(asta => {
      const tipologia = determinaTipologia(asta.titolo);
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
      
      astaArricchita.livello_interesse = calcolaInteresse(astaArricchita);
      astaArricchita.motivo_interesse = generaMotivoInteresse(astaArricchita);
      
      return astaArricchita;
    });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }
    
    console.log('[fetchAste] Starting fetch from IVG Marche...');
    
    // Fetch da IVG Marche
    const asteRaw = await fetchTuttiTribunaliMarche();
    console.log(`[fetchAste] Raw: ${asteRaw.length} aste`);
    
    // Processa
    const asteProcessate = processaAste(asteRaw);
    console.log(`[fetchAste] After processing: ${asteProcessate.length}`);
    
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
    
    console.log(`[fetchAste] Done: ${inserite} new, ${disattivate} deactivated`);
    
    return Response.json({
      success: true,
      fonte: 'ivgmarche',
      totali_raw: asteRaw.length,
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