import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Estrae provincia dall'indirizzo
function estraiProvincia(indirizzo) {
  if (!indirizzo) return 'Pesaro-Urbino';
  const ind = indirizzo.toUpperCase();
  
  if (ind.includes('PESARO') || ind.includes('FANO') || ind.includes('URBINO') || 
      ind.includes('TAVULLIA') || ind.includes('VALLEFOGLIA') || ind.includes('MONTE PORZIO') ||
      ind.includes('PETRIANO') || ind.includes('TERRE ROVERESCHE') || ind.includes('SAN COSTANZO') ||
      ind.includes('GABICCE') || ind.includes('MONDOLFO')) {
    return 'Pesaro-Urbino';
  }
  if (ind.includes('ANCONA') || ind.includes('JESI') || ind.includes('SENIGALLIA')) return 'Ancona';
  if (ind.includes('MACERATA') || ind.includes('CIVITANOVA')) return 'Macerata';
  if (ind.includes('FERMO')) return 'Fermo';
  if (ind.includes('ASCOLI')) return 'Ascoli Piceno';
  if (ind.includes('RIMINI') || ind.includes('CATTOLICA') || ind.includes('SAN GIOVANNI IN MARIGNANO')) return 'Rimini';
  
  return 'Altra';
}

// Estrae ID annuncio dall'URL
function estraiExternalId(url) {
  if (!url) return null;
  const match = url.match(/idAnnuncio=(\d+)/);
  return match ? `pvp_${match[1]}` : null;
}

// Converte data da DD/MM/YYYY a YYYY-MM-DD
function convertiData(dataStr) {
  if (!dataStr) return null;
  const parts = dataStr.trim().split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts; // Formato italiano DD/MM/YYYY
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// Calcola giorni alla asta
function calcolaGiorniAllaAsta(dataAsta) {
  if (!dataAsta) return 999;
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  const data = new Date(dataAsta);
  return Math.ceil((data - oggi) / (1000 * 60 * 60 * 24));
}

// Calcola interesse
function calcolaInteresse(prezzo, giorni, tipologia) {
  let punteggio = 0;
  
  if (prezzo > 0) {
    if (prezzo < 50000) punteggio += 3;
    else if (prezzo < 100000) punteggio += 2;
    else if (prezzo < 200000) punteggio += 1;
  }
  
  if (giorni >= 14 && giorni <= 90) punteggio += 2;
  else if (giorni > 90) punteggio += 1;
  
  if (tipologia === 'Immobile Residenziale') punteggio += 2;
  if (tipologia === 'Immobile Commerciale') punteggio += 1;
  
  if (punteggio >= 5) return 'Molto interessante';
  if (punteggio >= 3) return 'Interessante';
  return 'Da valutare';
}

function generaMotivoInteresse(prezzo, tipologia, giorni) {
  const motivi = [];
  
  if (prezzo > 0) {
    if (prezzo < 50000) motivi.push('💰 Prezzo molto basso');
    else if (prezzo < 100000) motivi.push('💰 Prezzo contenuto');
    else if (prezzo < 200000) motivi.push('💰 Prezzo accessibile');
  }
  
  if (tipologia === 'Immobile Residenziale') motivi.push('🏠 Residenziale');
  else if (tipologia === 'Immobile Commerciale') motivi.push('🏪 Commerciale');
  else if (tipologia === 'Immobile Industriale') motivi.push('🏭 Industriale');
  
  if (giorni >= 30) motivi.push('⏰ Tempo per analisi');
  
  return motivi.length > 0 ? motivi.join(' • ') : 'Opportunità da valutare';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }
    
    const { aste: asteRaw } = await req.json();
    
    if (!asteRaw || !Array.isArray(asteRaw)) {
      return Response.json({ error: 'Dati non validi. Atteso array di aste.' }, { status: 400 });
    }
    
    console.log(`[importAste] Ricevute ${asteRaw.length} aste da importare`);
    
    // Recupera aste esistenti per evitare duplicati
    const asteEsistenti = await base44.asServiceRole.entities.AstaImmobiliare.list();
    const externalIdsEsistenti = new Set(asteEsistenti.map(a => a.external_id).filter(Boolean));
    
    let inserite = 0;
    let aggiornate = 0;
    let scartate = 0;
    const errori = [];
    
    for (const asta of asteRaw) {
      try {
        // Supporta sia formato "pronto" (già processato dal frontend) che formato raw
        let externalId, prezzoBase, dataAsta, localita, titolo, linkUfficiale, lotto, tipologia;
        
        let offertaMinima = 0, rilancioMinimo = 0, dataOraVendita = '', rawData = null;

        // Se l'asta ha già external_id, è stata pre-processata dal frontend
        if (asta.external_id) {
          externalId = asta.external_id;
          prezzoBase = asta.prezzo_base || 0;
          offertaMinima = asta.offerta_minima || 0;
          rilancioMinimo = asta.rilancio_minimo || 0;
          dataOraVendita = asta.data_ora_vendita || '';
          dataAsta = asta.data_asta || null;
          localita = asta.localita || '';
          titolo = asta.titolo || 'Asta immobiliare';
          linkUfficiale = asta.link_ufficiale || '';
          lotto = asta.lotto || 'Lotto unico';
          tipologia = asta.tipologia || 'Altra Categoria';
          rawData = asta.raw_data || null; // Dati grezzi dal CSV
        } else {
          // Formato vecchio (legacy)
          externalId = estraiExternalId(asta['URL Annuncio']);
          prezzoBase = parseFloat(asta['Prezzo Base d\'Asta (EUR)']) || 0;
          dataAsta = convertiData(asta['Data Vendita']);
          localita = asta['Indirizzo'] || '';
          titolo = asta['Descrizione Breve'] || asta['Lotto'] || 'Asta immobiliare';
          linkUfficiale = asta['URL Annuncio'] || '';
          lotto = asta['Lotto'] || 'Lotto unico';
          tipologia = asta['Tipo Immobile'] || asta.tipologia || 'Altra Categoria';
        }
        
        if (!externalId) {
          console.log('[importAste] Scartata - no external_id:', JSON.stringify(asta).substring(0, 200));
          scartate++;
          continue;
        }

        if (prezzoBase <= 0) {
          console.log('[importAste] Scartata - prezzo <= 0:', externalId, prezzoBase);
          scartate++;
          continue;
        }
        
        const giorniAllaAsta = calcolaGiorniAllaAsta(dataAsta);
        
        const astaProcessata = {
          titolo: titolo,
          tipologia: tipologia,
          localita: localita,
          provincia: estraiProvincia(localita),
          prezzo_base: prezzoBase,
          offerta_minima: offertaMinima,
          rilancio_minimo: rilancioMinimo,
          data_ora_vendita: dataOraVendita,
          data_asta: dataAsta,
          data_pubblicazione: null,
          link_ufficiale: linkUfficiale,
          lotto: lotto,
          external_id: externalId,
          fonte: 'pvp.giustizia.it',
          cauzione_stimata: Math.round(prezzoBase * 0.10),
          livello_interesse: calcolaInteresse(prezzoBase, giorniAllaAsta, tipologia),
          motivo_interesse: generaMotivoInteresse(prezzoBase, tipologia, giorniAllaAsta),
          is_active: giorniAllaAsta >= 0,
          raw_data: rawData // Salva tutti i dati originali dal CSV
        };
        
        console.log('[importAste] Processando:', externalId, 'prezzo:', prezzoBase, 'data:', dataAsta);
        
        if (externalIdsEsistenti.has(externalId)) {
          // Aggiorna esistente
          const esistente = asteEsistenti.find(a => a.external_id === externalId);
          if (esistente) {
            await base44.asServiceRole.entities.AstaImmobiliare.update(esistente.id, astaProcessata);
            aggiornate++;
          }
        } else {
          // Inserisci nuova
          await base44.asServiceRole.entities.AstaImmobiliare.create(astaProcessata);
          inserite++;
          externalIdsEsistenti.add(externalId);
        }
        
      } catch (e) {
        console.log('[importAste] Errore su asta:', e.message);
        errori.push({ asta: asta.external_id || 'unknown', errore: e.message });
        scartate++;
      }
    }
    
    // Disattiva aste non più presenti nel file (opzionale)
    // Per ora lasciamo attive le vecchie aste
    
    console.log(`[importAste] Completato: ${inserite} inserite, ${aggiornate} aggiornate, ${scartate} scartate`);
    
    return Response.json({
      success: true,
      riepilogo: {
        totali_ricevute: asteRaw.length,
        nuove_inserite: inserite,
        aggiornate: aggiornate,
        scartate: scartate
      },
      errori: errori.length > 0 ? errori.slice(0, 10) : []
    });
    
  } catch (error) {
    console.log('[importAste] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});