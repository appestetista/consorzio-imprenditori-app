import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as cheerio from 'npm:cheerio@1.0.0';

// Configurazione
const CONFIG = {
  giorniMassimiAllaAsta: 365,
  maxPaginePerPortale: 5,
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
  
  if (t.includes('abitazione') || t.includes('appartamento') || t.includes('villa') || 
      t.includes('casa') || t.includes('villino') || t.includes('villetta') ||
      t.includes('bilocale') || t.includes('trilocale') || t.includes('monolocale')) {
    return 'Casa';
  }
  
  if (t.includes('capannone') || t.includes('industriale') || t.includes('magazzino') || 
      t.includes('opificio') || t.includes('laboratorio') || t.includes('deposito')) {
    return 'Capannone';
  }
  
  if (t.includes('azienda') || t.includes('attività commerciale') || t.includes('ramo d\'azienda') ||
      t.includes('complesso aziendale')) {
    return 'Azienda';
  }
  
  if (t.includes('negozio') || t.includes('ufficio') || t.includes('locale commerciale') || 
      t.includes('commerciale') || t.includes('bottega') || t.includes('bar') || t.includes('ristorante')) {
    return 'Commerciale';
  }
  
  if (t.includes('macchinario') || t.includes('macchina industriale') || t.includes('impianto') ||
      t.includes('tornio') || t.includes('fresa') || t.includes('pressa') || t.includes('cnc') ||
      t.includes('linea di produzione') || t.includes('macchinari per') || t.includes('cella frigorifera')) {
    return 'Macchinario industriale';
  }
  
  if (t.includes('autocarro') || t.includes('furgone') || t.includes('camion') || 
      t.includes('trattore') || t.includes('escavatore') || t.includes('muletto') ||
      t.includes('carrello elevatore') || t.includes('veicolo') || t.includes('iveco') ||
      t.includes('rimorchio') || t.includes('semirimorchio') || t.includes('gru') || t.includes('scania')) {
    return 'Mezzo';
  }
  
  if (t.includes('attrezzatura') || t.includes('attrezzi') || t.includes('utensili') ||
      t.includes('strumenti') || t.includes('apparecchiature') || t.includes('pulizia')) {
    return 'Attrezzatura';
  }
  
  if (t.includes('arredamento') || t.includes('arredi') || t.includes('mobili') ||
      t.includes('scaffalature') || t.includes('bancone') || t.includes('vetrina') || t.includes('benessere')) {
    return 'Arredo negozio';
  }
  
  return 'Altro';
}

// Calcola interesse
function calcolaInteresse(asta) {
  let punteggio = 0;
  
  if (asta.prezzo_base > 0) {
    if (asta.prezzo_base < 30000) punteggio += 3;
    else if (asta.prezzo_base < 70000) punteggio += 2;
    else if (asta.prezzo_base < 150000) punteggio += 1;
  }
  
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
  
  if (asta.prezzo_base > 0) {
    if (asta.prezzo_base < 30000) motivi.push('💰 Prezzo molto basso');
    else if (asta.prezzo_base < 70000) motivi.push('💰 Prezzo contenuto');
    else if (asta.prezzo_base < 150000) motivi.push('💰 Prezzo accessibile');
  }
  
  if (asta.tipologia === 'Casa') motivi.push('🏠 Immobile residenziale');
  else if (asta.tipologia === 'Commerciale') motivi.push('🏪 Potenziale reddito');
  else if (asta.tipologia === 'Capannone') motivi.push('🏭 Spazio industriale');
  else if (asta.tipologia === 'Macchinario industriale') motivi.push('⚙️ Macchinario');
  else if (asta.tipologia === 'Mezzo') motivi.push('🚚 Veicolo/Mezzo');
  else if (asta.tipologia === 'Attrezzatura') motivi.push('🔧 Attrezzatura');
  else if (asta.tipologia === 'Arredo negozio') motivi.push('🪑 Arredamento');
  
  if (asta.giorni_alla_asta >= 45) motivi.push('⏰ Tempo per analisi');
  
  return motivi.length > 0 ? motivi.join(' • ') : 'Opportunità da valutare';
}

// Parsa data italiana (es: "mar 21/10/2025 ore 15:00")
function parsaDataItaliana(dataText) {
  if (!dataText) return null;
  
  // Formato: "mar 21/10/2025 ore 15:00" o "21/10/2025"
  const match = dataText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [_, giorno, mese, anno] = match;
    return `${anno}-${mese.padStart(2, '0')}-${giorno.padStart(2, '0')}`;
  }
  return null;
}

// ============================================
// SCRAPER GOBID.IT - Pagina principale aste
// ============================================
async function fetchGobid() {
  const aste = [];
  
  try {
    // Fetch pagina principale con tutte le aste
    const url = 'https://www.gobid.it/it/aste/';
    console.log(`[Gobid] Fetching: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9',
      }
    });
    
    if (!response.ok) {
      console.log(`[Gobid] Response error: ${response.status}`);
      return aste;
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Selettore preciso per le card asta
    $('article.card-asta').each((i, el) => {
      try {
        const $el = $(el);
        
        // ID asta dal data attribute
        const astaId = $el.attr('data-id');
        if (!astaId) return;
        
        // Link
        const linkEl = $el.find('a[href*="/aste/"]').first();
        let link = linkEl.attr('href') || '';
        if (!link) return;
        if (!link.startsWith('http')) link = `https://www.gobid.it${link}`;
        
        // Titolo
        const titolo = $el.find('h2.h1, .titolo h2').first().text().trim();
        if (!titolo || deveEssereEsclusa(titolo)) return;
        
        // Tribunale e info procedura
        const h4Text = $el.find('h4').text().trim();
        const tribunaleMatch = h4Text.match(/Tribunale\s+di\s+([^\s-]+)/i);
        const tribunale = tribunaleMatch ? tribunaleMatch[1] : '';
        
        // Data fine asta
        const dataFineText = $el.find('.absTime.fine span').text().trim();
        const dataAsta = parsaDataItaliana(dataFineText);
        
        // Numero asta
        const h3Text = $el.find('h3.h2').text().trim();
        const astaNumero = h3Text.match(/Asta\s+(\d+)/i)?.[1] || astaId;
        
        const externalId = `gobid_${astaId}`;
        
        aste.push({
          titolo: titolo.substring(0, 200),
          localita: tribunale || 'Italia',
          provincia: tribunale || '',
          regione: '',
          prezzo_base: 0, // Gobid non mostra prezzo in lista
          data_asta: dataAsta,
          link_ufficiale: link,
          fonte: 'gobid',
          external_id: externalId,
          tribunale: tribunale,
          procedura: h4Text.substring(0, 100)
        });
        
      } catch (e) {
        console.log('[Gobid] Parse error:', e.message);
      }
    });
    
    console.log(`[Gobid] Trovate: ${aste.length} aste`);
    
  } catch (e) {
    console.log(`[Gobid] Error:`, e.message);
  }
  
  return aste;
}

// ============================================
// SCRAPER ASTEANNUNCI.IT - Lista immobili Marche
// ============================================
async function fetchAsteAnnunci() {
  const aste = [];
  
  // URL diretto per regione Marche
  const regioni = [
    { nome: 'Marche', url: 'https://www.asteannunci.it/aste-immobiliari/marche' },
    { nome: 'Emilia Romagna', url: 'https://www.asteannunci.it/aste-immobiliari/emilia-romagna' },
  ];
  
  for (const regione of regioni) {
    try {
      console.log(`[AsteAnnunci] Fetching: ${regione.url}`);
      
      const response = await fetch(regione.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'it-IT,it;q=0.9',
        }
      });
      
      if (!response.ok) {
        console.log(`[AsteAnnunci] ${regione.nome} - Error: ${response.status}`);
        continue;
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Cerca gli annunci - vari selettori possibili
      $('.card, article, .annuncio, [class*="listing"], [class*="result"]').each((i, el) => {
        try {
          const $el = $(el);
          
          // Cerca link dettaglio
          const linkEl = $el.find('a[href*="/asta/"], a[href*="/dettaglio/"], a[href*="/annuncio/"]').first();
          let link = linkEl.attr('href') || $el.find('a').first().attr('href') || '';
          
          if (!link || link === '#' || link.length < 10) return;
          if (!link.startsWith('http')) {
            link = link.startsWith('/') ? `https://www.asteannunci.it${link}` : `https://www.asteannunci.it/${link}`;
          }
          
          // Titolo
          const titolo = $el.find('h2, h3, h4, .titolo, .title').first().text().trim() ||
                        linkEl.attr('title') || linkEl.text().trim();
          
          if (!titolo || titolo.length < 5 || deveEssereEsclusa(titolo)) return;
          
          // Prezzo
          let prezzoNum = 0;
          const prezzoText = $el.text();
          const prezzoMatch = prezzoText.match(/€\s*([\d.,]+)|prezzo[:\s]*([\d.,]+)/i);
          if (prezzoMatch) {
            const prezzoStr = (prezzoMatch[1] || prezzoMatch[2] || '').replace(/\./g, '').replace(',', '.');
            prezzoNum = parseFloat(prezzoStr) || 0;
          }
          
          // Data
          const dataMatch = $el.text().match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          let dataAsta = null;
          if (dataMatch) {
            dataAsta = `${dataMatch[3]}-${dataMatch[2].padStart(2, '0')}-${dataMatch[1].padStart(2, '0')}`;
          }
          
          // Località
          const localitaMatch = $el.text().match(/(?:a|in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
          const localita = localitaMatch ? localitaMatch[1] : regione.nome;
          
          // ID univoco
          const idMatch = link.match(/\/(\d+)(?:\/|$|\?)|[-_](\d+)(?:\.|\?|$)/);
          const externalId = `asteannunci_${idMatch ? (idMatch[1] || idMatch[2]) : i}_${Date.now()}`;
          
          aste.push({
            titolo: titolo.substring(0, 200),
            localita,
            provincia: localita,
            regione: regione.nome,
            prezzo_base: prezzoNum,
            data_asta: dataAsta,
            link_ufficiale: link,
            fonte: 'asteannunci',
            external_id: externalId,
            tribunale: ''
          });
          
        } catch (e) {
          console.log('[AsteAnnunci] Parse error:', e.message);
        }
      });
      
      console.log(`[AsteAnnunci] ${regione.nome}: ${aste.filter(a => a.regione === regione.nome).length} aste`);
      
      await new Promise(r => setTimeout(r, 1000));
      
    } catch (e) {
      console.log(`[AsteAnnunci] Error ${regione.nome}:`, e.message);
    }
  }
  
  return aste;
}

// ============================================
// PROCESSAMENTO FINALE
// ============================================
function processaAste(aste) {
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  
  // Deduplica per external_id
  const seen = new Map();
  const deduplicate = aste.filter(a => {
    if (!a.external_id) return false;
    if (seen.has(a.external_id)) return false;
    seen.set(a.external_id, true);
    return true;
  });
  
  return deduplicate
    .map(asta => {
      // Data default se mancante
      if (!asta.data_asta) {
        asta.data_asta = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }
      
      const tipologia = determinaTipologia(asta.titolo, asta.procedura || '');
      const dataAsta = new Date(asta.data_asta);
      const giorniAllaAsta = Math.ceil((dataAsta - oggi) / (1000 * 60 * 60 * 24));
      
      // Filtra date troppo passate o troppo future
      if (giorniAllaAsta < -30 || giorniAllaAsta > CONFIG.giorniMassimiAllaAsta) {
        return null;
      }
      
      const cauzioneStimata = Math.round(asta.prezzo_base * 0.10);
      
      const astaArricchita = {
        titolo: asta.titolo,
        localita: asta.localita,
        provincia: asta.provincia,
        regione: asta.regione,
        tipologia,
        prezzo_base: asta.prezzo_base,
        data_asta: asta.data_asta,
        link_ufficiale: asta.link_ufficiale,
        fonte: asta.fonte,
        external_id: asta.external_id,
        cauzione_stimata: cauzioneStimata,
        giorni_alla_asta: giorniAllaAsta,
        is_active: true,
        tribunale: asta.tribunale || ''
      };
      
      astaArricchita.livello_interesse = calcolaInteresse(astaArricchita);
      astaArricchita.motivo_interesse = generaMotivoInteresse(astaArricchita);
      
      return astaArricchita;
    })
    .filter(a => a !== null);
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
    
    // Fetch in parallelo
    const [asteAnnunci, asteGobid] = await Promise.all([
      fetchAsteAnnunci(),
      fetchGobid()
    ]);
    
    console.log(`[fetchAste] AsteAnnunci: ${asteAnnunci.length}, Gobid: ${asteGobid.length}`);
    
    // Combina
    const tutteAste = [...asteAnnunci, ...asteGobid];
    console.log(`[fetchAste] Totale raw: ${tutteAste.length}`);
    
    // Processa
    const asteProcessate = processaAste(tutteAste);
    console.log(`[fetchAste] Dopo processing: ${asteProcessate.length}`);
    
    // Recupera esistenti
    const asteEsistenti = await base44.asServiceRole.entities.AstaImmobiliare.list();
    const externalIdsEsistenti = new Set(asteEsistenti.map(a => a.external_id));
    
    // Disattiva vecchie non più presenti
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
    
    // Stats
    const statsFonte = {};
    const statsTipologia = {};
    const statsLocalita = {};
    
    asteProcessate.forEach(a => {
      statsFonte[a.fonte] = (statsFonte[a.fonte] || 0) + 1;
      statsTipologia[a.tipologia] = (statsTipologia[a.tipologia] || 0) + 1;
      const loc = a.localita || 'Sconosciuta';
      statsLocalita[loc] = (statsLocalita[loc] || 0) + 1;
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
      per_tipologia: statsTipologia,
      per_localita: statsLocalita
    });
    
  } catch (error) {
    console.log('[fetchAste] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});