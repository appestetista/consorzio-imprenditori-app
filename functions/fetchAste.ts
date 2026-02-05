import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Configurazione
const CONFIG = {
  giorniMassimiAllaAsta: 365,
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
function determinaTipologia(titolo) {
  const t = titolo.toLowerCase();
  
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

// ============================================
// FETCH CON LLM - Estrae dati da internet
// ============================================
async function fetchAsteConLLM(base44) {
  console.log('[fetchAste] Usando LLM per estrarre dati da portali aste...');
  
  const prompt = `Cerca su internet le aste giudiziarie attive in Italia dai portali:
- gobid.it
- asteannunci.it

Estrai SOLO aste di:
- Case/appartamenti
- Capannoni industriali
- Locali commerciali
- Macchinari industriali
- Veicoli/mezzi (camion, furgoni, escavatori)
- Attrezzature
- Arredi per attività

ESCLUDI: moto, terreni agricoli, terreni edificabili, quote indivise.

Per ogni asta trovata, estrai:
- titolo: descrizione del bene
- localita: città o comune
- provincia: provincia italiana
- prezzo_base: prezzo in euro (numero)
- data_asta: data in formato YYYY-MM-DD
- link_ufficiale: URL completo della pagina asta
- fonte: "gobid" o "asteannunci"
- tribunale: tribunale di riferimento se presente

Trova almeno 30-50 aste reali e attive.`;

  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          aste: {
            type: "array",
            items: {
              type: "object",
              properties: {
                titolo: { type: "string" },
                localita: { type: "string" },
                provincia: { type: "string" },
                prezzo_base: { type: "number" },
                data_asta: { type: "string" },
                link_ufficiale: { type: "string" },
                fonte: { type: "string" },
                tribunale: { type: "string" }
              },
              required: ["titolo", "link_ufficiale", "fonte"]
            }
          }
        },
        required: ["aste"]
      }
    });
    
    console.log(`[fetchAste] LLM ha restituito ${result?.aste?.length || 0} aste`);
    return result?.aste || [];
    
  } catch (e) {
    console.log('[fetchAste] LLM error:', e.message);
    return [];
  }
}

// ============================================
// PROCESSAMENTO FINALE
// ============================================
function processaAste(aste) {
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  
  // Deduplica per link
  const seen = new Map();
  const deduplicate = aste.filter(a => {
    if (!a.link_ufficiale) return false;
    const key = a.link_ufficiale.toLowerCase();
    if (seen.has(key)) return false;
    seen.set(key, true);
    return true;
  });
  
  return deduplicate
    .filter(a => !deveEssereEsclusa(a.titolo || ''))
    .map((asta, idx) => {
      // Data default se mancante
      if (!asta.data_asta) {
        asta.data_asta = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }
      
      const tipologia = determinaTipologia(asta.titolo || '');
      const dataAsta = new Date(asta.data_asta);
      const giorniAllaAsta = Math.ceil((dataAsta - oggi) / (1000 * 60 * 60 * 24));
      
      // Filtra date troppo passate o troppo future
      if (giorniAllaAsta < -30 || giorniAllaAsta > CONFIG.giorniMassimiAllaAsta) {
        return null;
      }
      
      const prezzoBase = Number(asta.prezzo_base) || 0;
      const cauzioneStimata = Math.round(prezzoBase * 0.10);
      
      // Genera external_id univoco
      const urlHash = asta.link_ufficiale.split('/').pop() || '';
      const externalId = `${asta.fonte || 'unknown'}_${urlHash}_${idx}`;
      
      const astaArricchita = {
        titolo: (asta.titolo || '').substring(0, 200),
        localita: asta.localita || '',
        provincia: asta.provincia || '',
        regione: '',
        tipologia,
        prezzo_base: prezzoBase,
        data_asta: asta.data_asta,
        link_ufficiale: asta.link_ufficiale,
        fonte: asta.fonte || 'unknown',
        external_id: externalId,
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
    
    console.log('[fetchAste] Avvio ricerca aste con AI...');
    
    // Usa LLM con ricerca internet
    const asteRaw = await fetchAsteConLLM(base44);
    console.log(`[fetchAste] Totale raw: ${asteRaw.length}`);
    
    // Processa
    const asteProcessate = processaAste(asteRaw);
    console.log(`[fetchAste] Dopo processing: ${asteProcessate.length}`);
    
    if (asteProcessate.length === 0) {
      return Response.json({
        success: false,
        message: 'Nessuna asta trovata. I portali potrebbero avere protezioni anti-scraping.',
        suggerimento: 'Prova inserimento manuale dalla pagina Aste Immobiliari.'
      });
    }
    
    // Recupera esistenti
    const asteEsistenti = await base44.asServiceRole.entities.AstaImmobiliare.list();
    const externalIdsEsistenti = new Set(asteEsistenti.map(a => a.external_id));
    const linksEsistenti = new Set(asteEsistenti.map(a => a.link_ufficiale?.toLowerCase()));
    
    // Inserisci nuove (check sia external_id che link)
    const nuoveAste = asteProcessate.filter(a => 
      !externalIdsEsistenti.has(a.external_id) && 
      !linksEsistenti.has(a.link_ufficiale?.toLowerCase())
    );
    
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
    
    console.log(`[fetchAste] Completato: ${inserite} nuove inserite`);
    
    return Response.json({
      success: true,
      riepilogo: {
        totali_raw: asteRaw.length,
        dopo_processing: asteProcessate.length,
        nuove_inserite: inserite,
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