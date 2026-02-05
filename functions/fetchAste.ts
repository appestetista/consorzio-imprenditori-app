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
  
  if (t.includes('macchinario') || t.includes('macchina') || t.includes('impianto') ||
      t.includes('tornio') || t.includes('fresa') || t.includes('pressa') || t.includes('cnc') ||
      t.includes('linea di produzione') || t.includes('cella frigorifera')) {
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

// Genera data futura
function dataFutura(giorniDaOggi) {
  const d = new Date();
  d.setDate(d.getDate() + giorniDaOggi);
  return d.toISOString().split('T')[0];
}

// ============================================
// DATI ESEMPIO REALISTICI
// ============================================
function getAsteDiEsempio() {
  return [
    // CASE
    { titolo: "Appartamento trilocale con garage", localita: "Pesaro", provincia: "Pesaro-Urbino", prezzo_base: 45000, data_asta: dataFutura(45), link_ufficiale: "https://www.asteannunci.it/asta/esempio-1", fonte: "asteannunci", tribunale: "Pesaro" },
    { titolo: "Villa bifamiliare con giardino", localita: "Fano", provincia: "Pesaro-Urbino", prezzo_base: 120000, data_asta: dataFutura(60), link_ufficiale: "https://www.asteannunci.it/asta/esempio-2", fonte: "asteannunci", tribunale: "Pesaro" },
    { titolo: "Appartamento bilocale centro storico", localita: "Ancona", provincia: "Ancona", prezzo_base: 35000, data_asta: dataFutura(30), link_ufficiale: "https://www.asteannunci.it/asta/esempio-3", fonte: "asteannunci", tribunale: "Ancona" },
    { titolo: "Casa colonica ristrutturata", localita: "Macerata", provincia: "Macerata", prezzo_base: 85000, data_asta: dataFutura(75), link_ufficiale: "https://www.asteannunci.it/asta/esempio-4", fonte: "asteannunci", tribunale: "Macerata" },
    { titolo: "Appartamento con terrazzo panoramico", localita: "Ascoli Piceno", provincia: "Ascoli Piceno", prezzo_base: 52000, data_asta: dataFutura(55), link_ufficiale: "https://www.asteannunci.it/asta/esempio-5", fonte: "asteannunci", tribunale: "Ascoli Piceno" },
    
    // COMMERCIALI
    { titolo: "Locale commerciale fronte strada", localita: "Pesaro", provincia: "Pesaro-Urbino", prezzo_base: 65000, data_asta: dataFutura(40), link_ufficiale: "https://www.asteannunci.it/asta/esempio-6", fonte: "asteannunci", tribunale: "Pesaro" },
    { titolo: "Negozio con vetrina centro città", localita: "Ancona", provincia: "Ancona", prezzo_base: 48000, data_asta: dataFutura(35), link_ufficiale: "https://www.asteannunci.it/asta/esempio-7", fonte: "asteannunci", tribunale: "Ancona" },
    { titolo: "Ufficio direzionale piano terra", localita: "Rimini", provincia: "Rimini", prezzo_base: 72000, data_asta: dataFutura(50), link_ufficiale: "https://www.asteannunci.it/asta/esempio-8", fonte: "asteannunci", tribunale: "Rimini" },
    
    // CAPANNONI
    { titolo: "Capannone industriale 800mq", localita: "Fano", provincia: "Pesaro-Urbino", prezzo_base: 180000, data_asta: dataFutura(90), link_ufficiale: "https://www.asteannunci.it/asta/esempio-9", fonte: "asteannunci", tribunale: "Pesaro" },
    { titolo: "Magazzino con area carico/scarico", localita: "Jesi", provincia: "Ancona", prezzo_base: 95000, data_asta: dataFutura(65), link_ufficiale: "https://www.asteannunci.it/asta/esempio-10", fonte: "asteannunci", tribunale: "Ancona" },
    { titolo: "Deposito industriale zona artigianale", localita: "Civitanova Marche", provincia: "Macerata", prezzo_base: 110000, data_asta: dataFutura(70), link_ufficiale: "https://www.asteannunci.it/asta/esempio-11", fonte: "asteannunci", tribunale: "Macerata" },
    
    // MACCHINARI (GOBID)
    { titolo: "Centro di lavoro CNC Mazak", localita: "Milano", provincia: "Milano", prezzo_base: 25000, data_asta: dataFutura(20), link_ufficiale: "https://www.gobid.it/asta/esempio-12", fonte: "gobid", tribunale: "Milano" },
    { titolo: "Cella frigorifera industriale", localita: "Latina", provincia: "Latina", prezzo_base: 8500, data_asta: dataFutura(15), link_ufficiale: "https://www.gobid.it/asta/esempio-13", fonte: "gobid", tribunale: "Latina" },
    { titolo: "Linea di produzione packaging", localita: "Bologna", provincia: "Bologna", prezzo_base: 45000, data_asta: dataFutura(45), link_ufficiale: "https://www.gobid.it/asta/esempio-14", fonte: "gobid", tribunale: "Bologna" },
    { titolo: "Tornio parallelo industriale", localita: "Perugia", provincia: "Perugia", prezzo_base: 12000, data_asta: dataFutura(25), link_ufficiale: "https://www.gobid.it/asta/esempio-15", fonte: "gobid", tribunale: "Perugia" },
    { titolo: "Impianto di verniciatura automatico", localita: "Modena", provincia: "Modena", prezzo_base: 35000, data_asta: dataFutura(55), link_ufficiale: "https://www.gobid.it/asta/esempio-16", fonte: "gobid", tribunale: "Modena" },
    
    // MEZZI (GOBID)
    { titolo: "Furgone isotermico IVECO Daily", localita: "Roma", provincia: "Roma", prezzo_base: 18000, data_asta: dataFutura(22), link_ufficiale: "https://www.gobid.it/asta/esempio-17", fonte: "gobid", tribunale: "Roma" },
    { titolo: "Autocarro Scania con cassone", localita: "Firenze", provincia: "Firenze", prezzo_base: 32000, data_asta: dataFutura(40), link_ufficiale: "https://www.gobid.it/asta/esempio-18", fonte: "gobid", tribunale: "Firenze" },
    { titolo: "Escavatore cingolato Caterpillar", localita: "Torino", provincia: "Torino", prezzo_base: 55000, data_asta: dataFutura(60), link_ufficiale: "https://www.gobid.it/asta/esempio-19", fonte: "gobid", tribunale: "Torino" },
    { titolo: "Carrello elevatore Toyota elettrico", localita: "Verona", provincia: "Verona", prezzo_base: 8000, data_asta: dataFutura(18), link_ufficiale: "https://www.gobid.it/asta/esempio-20", fonte: "gobid", tribunale: "Verona" },
    { titolo: "Muletto Linde diesel 3.5 ton", localita: "Vicenza", provincia: "Vicenza", prezzo_base: 12500, data_asta: dataFutura(28), link_ufficiale: "https://www.gobid.it/asta/esempio-21", fonte: "gobid", tribunale: "Vicenza" },
    
    // ATTREZZATURE (GOBID)
    { titolo: "Attrezzature per centro benessere", localita: "Vicenza", provincia: "Vicenza", prezzo_base: 15000, data_asta: dataFutura(35), link_ufficiale: "https://www.gobid.it/asta/esempio-22", fonte: "gobid", tribunale: "Vicenza" },
    { titolo: "Macchinari per pulizia professionale", localita: "Bolzano", provincia: "Bolzano", prezzo_base: 6500, data_asta: dataFutura(30), link_ufficiale: "https://www.gobid.it/asta/esempio-23", fonte: "gobid", tribunale: "Bolzano" },
    { titolo: "Attrezzature per officina meccanica", localita: "Brescia", provincia: "Brescia", prezzo_base: 22000, data_asta: dataFutura(45), link_ufficiale: "https://www.gobid.it/asta/esempio-24", fonte: "gobid", tribunale: "Brescia" },
    
    // ARREDI (GOBID)
    { titolo: "Arredamento completo ristorante", localita: "Napoli", provincia: "Napoli", prezzo_base: 28000, data_asta: dataFutura(38), link_ufficiale: "https://www.gobid.it/asta/esempio-25", fonte: "gobid", tribunale: "Napoli" },
    { titolo: "Scaffalature industriali magazzino", localita: "Padova", provincia: "Padova", prezzo_base: 9500, data_asta: dataFutura(25), link_ufficiale: "https://www.gobid.it/asta/esempio-26", fonte: "gobid", tribunale: "Padova" },
    { titolo: "Arredi e attrezzature per ufficio", localita: "Genova", provincia: "Genova", prezzo_base: 7800, data_asta: dataFutura(32), link_ufficiale: "https://www.gobid.it/asta/esempio-27", fonte: "gobid", tribunale: "Genova" },
    { titolo: "Bancone bar con retrobanco frigorifero", localita: "Bari", provincia: "Bari", prezzo_base: 11000, data_asta: dataFutura(42), link_ufficiale: "https://www.gobid.it/asta/esempio-28", fonte: "gobid", tribunale: "Bari" },
    
    // AZIENDE
    { titolo: "Ramo d'azienda ristorazione", localita: "Rimini", provincia: "Rimini", prezzo_base: 75000, data_asta: dataFutura(80), link_ufficiale: "https://www.asteannunci.it/asta/esempio-29", fonte: "asteannunci", tribunale: "Rimini" },
    { titolo: "Attività commerciale abbigliamento", localita: "Pesaro", provincia: "Pesaro-Urbino", prezzo_base: 42000, data_asta: dataFutura(50), link_ufficiale: "https://www.asteannunci.it/asta/esempio-30", fonte: "asteannunci", tribunale: "Pesaro" },
  ];
}

// ============================================
// PROCESSAMENTO
// ============================================
function processaAste(aste) {
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  
  return aste.map((asta, idx) => {
    const tipologia = determinaTipologia(asta.titolo);
    const dataAsta = new Date(asta.data_asta);
    const giorniAllaAsta = Math.ceil((dataAsta - oggi) / (1000 * 60 * 60 * 24));
    const cauzioneStimata = Math.round(asta.prezzo_base * 0.10);
    const externalId = `${asta.fonte}_esempio_${idx + 1}`;
    
    const astaArricchita = {
      titolo: asta.titolo,
      localita: asta.localita,
      provincia: asta.provincia,
      regione: '',
      tipologia,
      prezzo_base: asta.prezzo_base,
      data_asta: asta.data_asta,
      link_ufficiale: asta.link_ufficiale,
      fonte: asta.fonte,
      external_id: externalId,
      cauzione_stimata: cauzioneStimata,
      giorni_alla_asta: giorniAllaAsta,
      is_active: true,
      tribunale: asta.tribunale
    };
    
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
    
    console.log('[fetchAste] Caricamento aste di esempio...');
    
    // Usa dati di esempio (i portali reali hanno protezioni anti-scraping)
    const asteRaw = getAsteDiEsempio();
    console.log(`[fetchAste] Aste generate: ${asteRaw.length}`);
    
    // Processa
    const asteProcessate = processaAste(asteRaw);
    console.log(`[fetchAste] Dopo processing: ${asteProcessate.length}`);
    
    // Recupera esistenti
    const asteEsistenti = await base44.asServiceRole.entities.AstaImmobiliare.list();
    const externalIdsEsistenti = new Set(asteEsistenti.map(a => a.external_id));
    
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
      if (a.localita) statsLocalita[a.localita] = (statsLocalita[a.localita] || 0) + 1;
    });
    
    console.log(`[fetchAste] Completato: ${inserite} nuove inserite`);
    
    return Response.json({
      success: true,
      nota: "Dati di esempio - I portali reali (gobid.it, asteannunci.it) hanno protezioni anti-scraping",
      riepilogo: {
        totali: asteProcessate.length,
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