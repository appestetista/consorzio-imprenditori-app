import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as cheerio from 'npm:cheerio@1.0.0';

// Configurazione soglie di filtraggio
const CONFIG = {
  // Esclude beni sotto questo prezzo (probabilmente box/micro-unità)
  prezzoMinimo: 10000,
  // Esclude beni sopra questo prezzo
  prezzoMassimo: 2000000,
  // Esclude aste che scadono entro X giorni (troppo poco tempo per decidere)
  giorniMinimiAllaAsta: 3,
  // Massimo giorni in avanti per considerare l'asta
  giorniMassimiAllaAsta: 90,
  // Tipologie da escludere automaticamente
  tipologieEscluse: ['Terreno', 'Box/Garage'],
};

// Determina la tipologia dal titolo
function determinaTipologia(titolo) {
  const t = titolo.toLowerCase();
  if (t.includes('appartamento') || t.includes('abitazione') || t.includes('villa') || t.includes('casa')) return 'Abitativo';
  if (t.includes('negozio') || t.includes('ufficio') || t.includes('locale commerciale')) return 'Commerciale';
  if (t.includes('capannone') || t.includes('industriale') || t.includes('magazzino')) return 'Industriale';
  if (t.includes('camion') || t.includes('furgone') || t.includes('ruspa') || t.includes('escavatore') || t.includes('veicolo') || t.includes('auto')) return 'Mezzi';
  if (t.includes('attrezzatura') || t.includes('macchinario')) return 'Attrezzatura';
  if (t.includes('arredamento') || t.includes('mobili') || t.includes('arredi')) return 'Arredamento attività';
  if (t.includes('terreno')) return 'Terreno';
  if (t.includes('box') || t.includes('garage') || t.includes('posto auto')) return 'Box/Garage';
  return 'Altro';
}

// Calcola livello di interesse
function calcolaInteresse(asta) {
  let punteggio = 0;
  const oggi = new Date();
  const dataAsta = new Date(asta.data_asta);
  const giorniAllaAsta = Math.ceil((dataAsta - oggi) / (1000 * 60 * 60 * 24));

  // Prezzo vantaggioso
  if (asta.prezzo_base < 50000) punteggio += 3;
  else if (asta.prezzo_base < 100000) punteggio += 2;
  else if (asta.prezzo_base < 200000) punteggio += 1;

  // Tempistica ideale (15-45 giorni = tempo per valutare senza fretta)
  if (giorniAllaAsta >= 15 && giorniAllaAsta <= 45) punteggio += 2;
  else if (giorniAllaAsta > 45) punteggio += 1;

  // Tipologia preferita
  if (['Abitativo', 'Commerciale', 'Industriale'].includes(asta.tipologia)) punteggio += 1;

  // Determina livello
  if (punteggio >= 5) return 'Molto interessante';
  if (punteggio >= 3) return 'Interessante';
  return 'Da valutare';
}

// Genera motivo interesse
function generaMotivoInteresse(asta) {
  const motivi = [];
  const oggi = new Date();
  const dataAsta = new Date(asta.data_asta);
  const giorniAllaAsta = Math.ceil((dataAsta - oggi) / (1000 * 60 * 60 * 24));

  if (asta.prezzo_base < 50000) motivi.push('Prezzo molto accessibile');
  else if (asta.prezzo_base < 100000) motivi.push('Prezzo contenuto');

  if (giorniAllaAsta >= 15 && giorniAllaAsta <= 45) motivi.push('Tempistica ideale per valutazione');
  else if (giorniAllaAsta > 45) motivi.push('Ampio tempo per decidere');

  if (['Abitativo', 'Commerciale'].includes(asta.tipologia)) motivi.push(`${asta.tipologia} - alta domanda`);

  return motivi.length > 0 ? motivi.join(' • ') : 'Opportunità da analizzare';
}

// Parsing IVG Marche
async function fetchIVGMarche() {
  const aste = [];
  try {
    // Pagina principale aste
    const response = await fetch('https://www.ivgmarche.it/vendite-all/?_paged=1', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.log('[fetchAste] IVG Marche response not ok:', response.status);
      return aste;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Parsing degli elementi asta (struttura da verificare sul sito reale)
    $('.vendita-item, .asta-item, article.vendita').each((i, el) => {
      try {
        const titolo = $(el).find('.titolo, h2, h3').first().text().trim();
        const prezzo = $(el).find('.prezzo, .price').first().text().trim();
        const localita = $(el).find('.localita, .location, .comune').first().text().trim();
        const dataText = $(el).find('.data, .date, .data-asta').first().text().trim();
        const link = $(el).find('a').first().attr('href');

        if (titolo && link) {
          // Estrai prezzo numerico
          const prezzoNum = parseFloat(prezzo.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
          
          // Estrai data
          let dataAsta = null;
          const dateMatch = dataText.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
          if (dateMatch) {
            dataAsta = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
          }

          aste.push({
            titolo,
            localita: localita || 'Marche',
            provincia: determinaProvincia(localita, 'marche'),
            prezzo_base: prezzoNum,
            data_asta: dataAsta || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            link_ufficiale: link.startsWith('http') ? link : `https://www.ivgmarche.it${link}`,
            fonte: 'ivgmarche',
            external_id: `marche_${link.split('/').pop() || i}`
          });
        }
      } catch (e) {
        console.log('[fetchAste] Error parsing IVG Marche item:', e.message);
      }
    });
  } catch (e) {
    console.log('[fetchAste] Error fetching IVG Marche:', e.message);
  }
  return aste;
}

// Parsing IVG Rimini
async function fetchIVGRimini() {
  const aste = [];
  try {
    const response = await fetch('https://www.ivgrimini.it/vendite-all/?_paged=1', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.log('[fetchAste] IVG Rimini response not ok:', response.status);
      return aste;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    $('.vendita-item, .asta-item, article.vendita').each((i, el) => {
      try {
        const titolo = $(el).find('.titolo, h2, h3').first().text().trim();
        const prezzo = $(el).find('.prezzo, .price').first().text().trim();
        const localita = $(el).find('.localita, .location, .comune').first().text().trim();
        const dataText = $(el).find('.data, .date, .data-asta').first().text().trim();
        const link = $(el).find('a').first().attr('href');

        if (titolo && link) {
          const prezzoNum = parseFloat(prezzo.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
          
          let dataAsta = null;
          const dateMatch = dataText.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
          if (dateMatch) {
            dataAsta = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
          }

          aste.push({
            titolo,
            localita: localita || 'Rimini',
            provincia: 'Rimini',
            prezzo_base: prezzoNum,
            data_asta: dataAsta || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            link_ufficiale: link.startsWith('http') ? link : `https://www.ivgrimini.it${link}`,
            fonte: 'ivgrimini',
            external_id: `rimini_${link.split('/').pop() || i}`
          });
        }
      } catch (e) {
        console.log('[fetchAste] Error parsing IVG Rimini item:', e.message);
      }
    });
  } catch (e) {
    console.log('[fetchAste] Error fetching IVG Rimini:', e.message);
  }
  return aste;
}

// Determina provincia dalla località
function determinaProvincia(localita, fonte) {
  const loc = localita.toLowerCase();
  if (fonte === 'ivgrimini' || loc.includes('rimini')) return 'Rimini';
  if (loc.includes('pesaro') || loc.includes('urbino') || loc.includes('fano')) return 'Pesaro-Urbino';
  if (loc.includes('ancona') || loc.includes('jesi') || loc.includes('senigallia')) return 'Ancona';
  if (loc.includes('macerata') || loc.includes('civitanova') || loc.includes('tolentino')) return 'Macerata';
  if (loc.includes('fermo') || loc.includes('porto san giorgio')) return 'Fermo';
  if (loc.includes('ascoli') || loc.includes('san benedetto')) return 'Ascoli Piceno';
  return 'Ancona'; // Default per Marche
}

// Filtra aste secondo le regole
function filtraAste(aste) {
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);

  return aste.filter(asta => {
    // Prezzo nei limiti
    if (asta.prezzo_base < CONFIG.prezzoMinimo || asta.prezzo_base > CONFIG.prezzoMassimo) {
      return false;
    }

    // Data asta valida
    const dataAsta = new Date(asta.data_asta);
    const giorniAllaAsta = Math.ceil((dataAsta - oggi) / (1000 * 60 * 60 * 24));
    
    if (giorniAllaAsta < CONFIG.giorniMinimiAllaAsta || giorniAllaAsta > CONFIG.giorniMassimiAllaAsta) {
      return false;
    }

    // Tipologia non esclusa
    const tipologia = determinaTipologia(asta.titolo);
    if (CONFIG.tipologieEscluse.includes(tipologia)) {
      return false;
    }

    return true;
  });
}

// Arricchisci aste con analisi
function arricchisciAste(aste) {
  return aste.map(asta => {
    const tipologia = determinaTipologia(asta.titolo);
    const astaArricchita = {
      ...asta,
      tipologia
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
      gia_presenti: asteArricchite.length - inserite
    });

  } catch (error) {
    console.log('[fetchAste] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});