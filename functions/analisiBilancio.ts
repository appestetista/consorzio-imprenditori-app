import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url } = await req.json();
    if (!file_url) {
      return Response.json({ error: 'file_url è obbligatorio' }, { status: 400 });
    }

    // STEP 1: Normalizzazione OCR – pulisce il testo senza alterare dati
    const normalizzato = await base44.integrations.Core.InvokeLLM({
      prompt: `Sei un sistema di normalizzazione testo OCR.

Ricevi testo estratto tramite OCR da un documento PDF.
Il tuo compito è ESCLUSIVAMENTE:
- Pulire errori tipografici evidenti causati dall'OCR (es: "Stoto" → "Stato", "Patr1moniale" → "Patrimoniale", "C0nto" → "Conto")
- Correggere spazi mancanti o doppi
- Mantenere numeri e intestazioni ESATTAMENTE come appaiono
- NON correggere valori numerici
- NON interpretare significati
- NON unire tabelle separate
- NON fare deduzioni o aggiunte

Se una riga è ambigua, mantienila così com'è.

Restituisci il testo normalizzato, pronto per l'analisi strutturale.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          testo_normalizzato: {
            type: "string",
            description: "Testo del documento normalizzato e pulito da errori OCR"
          },
          correzioni_applicate: {
            type: "number",
            description: "Numero approssimativo di correzioni tipografiche applicate"
          },
          qualita_ocr: {
            type: "string",
            enum: ["buona", "media", "scarsa"],
            description: "Valutazione della qualità del testo OCR originale"
          }
        }
      }
    });

    const testoNormalizzato = normalizzato?.testo_normalizzato || '';
    const qualitaOcr = normalizzato?.qualita_ocr || 'media';
    const correzioniOcr = normalizzato?.correzioni_applicate || 0;

    // STEP 2: Analisi strutturale del bilancio sul testo normalizzato
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Sei un commercialista esperto in fiscalità italiana.

Analizza il seguente testo (già normalizzato) ESCLUSIVAMENTE per verificare se si tratta di un bilancio di esercizio italiano.

Verifica la presenza di ciascuno dei seguenti elementi:
1. Stato Patrimoniale
2. Conto Economico
3. Nota Integrativa
4. Rendiconto Finanziario

REGOLE TASSATIVE:
- NON interpretare i dati numerici.
- NON calcolare nulla.
- NON stimare informazioni mancanti.
- Rispondi SOLO con la struttura JSON richiesta.
- Per ogni parte, indica true se è presente nel documento, false se assente.
- Il documento è idoneo se contiene ALMENO Stato Patrimoniale e Conto Economico.

TESTO DEL DOCUMENTO:
${testoNormalizzato.substring(0, 30000)}`,
      response_json_schema: {
        type: "object",
        properties: {
          tipo_documento: {
            type: "string",
            description: "Tipo di documento rilevato (es: Bilancio di esercizio, Bilancio abbreviato, Documento non riconosciuto, ecc.)"
          },
          anno_riferimento: {
            type: "string",
            description: "Anno di riferimento del bilancio se rilevabile, altrimenti 'Non rilevato'"
          },
          ragione_sociale: {
            type: "string",
            description: "Ragione sociale dell'azienda se rilevabile, altrimenti 'Non rilevata'"
          },
          parti_presenti: {
            type: "object",
            properties: {
              stato_patrimoniale: { type: "boolean" },
              conto_economico: { type: "boolean" },
              nota_integrativa: { type: "boolean" },
              rendiconto_finanziario: { type: "boolean" }
            }
          },
          esito: {
            type: "string",
            enum: ["Documento idoneo", "Documento non idoneo"],
            description: "Esito finale della verifica"
          },
          note: {
            type: "string",
            description: "Eventuali osservazioni sulla completezza del documento (es: manca il rendiconto finanziario, bilancio in forma abbreviata, ecc.)"
          }
        }
      }
    });

    // STEP 3: Estrazione dati strutturati (solo se documento idoneo)
    let dati_estratti = null;
    if (result?.esito === 'Documento idoneo') {
      dati_estratti = await base44.integrations.Core.InvokeLLM({
        prompt: `Sei un analista di bilancio esperto.

Usa SOLO il testo fornito. Estrai ESCLUSIVAMENTE i valori esplicitamente presenti.

Campi da cercare:

STATO PATRIMONIALE:
- Totale Attivo
- Totale Passivo
- Patrimonio Netto
- Debiti
- Disponibilità liquide

CONTO ECONOMICO:
- Ricavi (Valore della produzione / Ricavi delle vendite)
- Costi totali (Costi della produzione)
- EBITDA (solo se esplicitamente indicato)
- Ammortamenti
- Utile o Perdita (Risultato di esercizio)

IMPOSTE:
- IRES
- IRAP

REGOLE TASSATIVE:
- Se un dato NON è chiaramente presente nel testo → il valore DEVE essere null.
- NON stimare valori mancanti.
- NON ricostruire voci calcolandole.
- NON inventare dati.
- I valori devono essere numeri (senza simbolo €, senza punti migliaia). Usa il segno negativo per le perdite.

TESTO DEL DOCUMENTO:
${testoNormalizzato.substring(0, 30000)}`,
        response_json_schema: {
          type: "object",
          properties: {
            stato_patrimoniale: {
              type: "object",
              properties: {
                totale_attivo: { type: ["number", "null"] },
                totale_passivo: { type: ["number", "null"] },
                patrimonio_netto: { type: ["number", "null"] },
                debiti: { type: ["number", "null"] },
                disponibilita_liquide: { type: ["number", "null"] }
              }
            },
            conto_economico: {
              type: "object",
              properties: {
                ricavi: { type: ["number", "null"] },
                costi_totali: { type: ["number", "null"] },
                ebitda: { type: ["number", "null"] },
                ammortamenti: { type: ["number", "null"] },
                utile_perdita: { type: ["number", "null"] }
              }
            },
            imposte: {
              type: "object",
              properties: {
                ires: { type: ["number", "null"] },
                irap: { type: ["number", "null"] }
              }
            },
            dati_mancanti: {
              type: "array",
              items: { type: "string" },
              description: "Elenco dei campi non trovati nel documento"
            }
          }
        }
      });
    }

    // STEP 4: Revisione contabile – controlli matematici oggettivi
    let revisione = null;
    if (dati_estratti) {
      const sp = dati_estratti.stato_patrimoniale || {};
      const ce = dati_estratti.conto_economico || {};
      const imp = dati_estratti.imposte || {};
      const controlli = [];

      // Controllo 1: Attivo = Passivo + Patrimonio Netto
      if (sp.totale_attivo != null && sp.totale_passivo != null && sp.patrimonio_netto != null) {
        const atteso = sp.totale_passivo + sp.patrimonio_netto;
        const diff = Math.abs(sp.totale_attivo - atteso);
        const tolleranza = Math.max(Math.abs(sp.totale_attivo) * 0.01, 1);
        controlli.push({
          nome: 'Equilibrio patrimoniale (Attivo = Passivo + PN)',
          esito: diff <= tolleranza ? 'coerente' : 'potenzialmente_incoerente',
          dettaglio: `Attivo: ${sp.totale_attivo}, Passivo + PN: ${atteso}, Differenza: ${Math.round(diff)}`
        });
      } else {
        controlli.push({
          nome: 'Equilibrio patrimoniale (Attivo = Passivo + PN)',
          esito: 'non_verificabile',
          dettaglio: 'Dati insufficienti per il controllo'
        });
      }

      // Controllo 2: Coerenza utile CE con PN
      if (ce.utile_perdita != null && sp.patrimonio_netto != null) {
        const coerente = (ce.utile_perdita >= 0 && sp.patrimonio_netto >= 0) ||
                         (ce.utile_perdita < 0 && sp.patrimonio_netto < sp.totale_attivo) ||
                         true; // segno non è sufficiente per incoerenza diretta senza dati precedenti
        // Controllo: se perdita > patrimonio netto → potenziale problema
        let esito = 'coerente';
        let dettaglio = `Utile/Perdita CE: ${ce.utile_perdita}, Patrimonio Netto: ${sp.patrimonio_netto}`;
        if (ce.utile_perdita < 0 && Math.abs(ce.utile_perdita) > Math.abs(sp.patrimonio_netto)) {
          esito = 'potenzialmente_incoerente';
          dettaglio += ' — Perdita superiore al Patrimonio Netto';
        }
        controlli.push({
          nome: 'Coerenza Utile CE / Patrimonio Netto',
          esito,
          dettaglio
        });
      } else {
        controlli.push({
          nome: 'Coerenza Utile CE / Patrimonio Netto',
          esito: 'non_verificabile',
          dettaglio: 'Dati insufficienti per il controllo'
        });
      }

      // Controllo 3: Imposte non superiori all'utile
      if (ce.utile_perdita != null && (imp.ires != null || imp.irap != null)) {
        const totaleImposte = (imp.ires || 0) + (imp.irap || 0);
        let esito = 'coerente';
        let dettaglio = `Imposte totali (IRES+IRAP): ${totaleImposte}, Utile/Perdita: ${ce.utile_perdita}`;
        if (ce.utile_perdita > 0 && totaleImposte > ce.utile_perdita) {
          esito = 'potenzialmente_incoerente';
          dettaglio += ' — Imposte superiori all\'utile lordo';
        }
        if (ce.utile_perdita <= 0 && totaleImposte > 0) {
          esito = 'potenzialmente_incoerente';
          dettaglio += ' — Imposte positive con risultato negativo o nullo';
        }
        controlli.push({
          nome: 'Imposte ≤ Utile lordo',
          esito,
          dettaglio
        });
      } else {
        controlli.push({
          nome: 'Imposte ≤ Utile lordo',
          esito: 'non_verificabile',
          dettaglio: 'Dati insufficienti per il controllo'
        });
      }

      // Controllo 4: Ricavi - Costi coerente con Utile (se tutti disponibili)
      if (ce.ricavi != null && ce.costi_totali != null && ce.utile_perdita != null) {
        const margine = ce.ricavi - ce.costi_totali;
        const diff = Math.abs(margine - ce.utile_perdita);
        const tolleranza = Math.max(Math.abs(ce.ricavi) * 0.05, 1);
        controlli.push({
          nome: 'Coerenza Ricavi - Costi ≈ Utile',
          esito: diff <= tolleranza ? 'coerente' : 'potenzialmente_incoerente',
          dettaglio: `Ricavi - Costi: ${Math.round(margine)}, Utile dichiarato: ${ce.utile_perdita}, Differenza: ${Math.round(diff)}`
        });
      }

      revisione = { controlli };
    }

    // STEP 5: Analisi finanziaria – indicatori calcolati SOLO se dati sufficienti
    let indicatori_finanziari = null;
    if (dati_estratti) {
      const sp = dati_estratti.stato_patrimoniale || {};
      const ce = dati_estratti.conto_economico || {};
      const lista = [];

      // ROS = Utile / Ricavi × 100
      if (ce.utile_perdita != null && ce.ricavi != null && ce.ricavi !== 0) {
        lista.push({
          nome: 'ROS (Return on Sales)',
          formula: 'Utile / Ricavi × 100',
          valore: Math.round((ce.utile_perdita / ce.ricavi) * 10000) / 100,
          unita: '%',
          dettaglio: `${ce.utile_perdita} / ${ce.ricavi} × 100`
        });
      } else {
        const mancanti = [];
        if (ce.utile_perdita == null) mancanti.push('Utile/Perdita');
        if (ce.ricavi == null) mancanti.push('Ricavi');
        if (ce.ricavi === 0) mancanti.push('Ricavi = 0');
        lista.push({ nome: 'ROS (Return on Sales)', formula: 'Utile / Ricavi × 100', valore: null, motivo: `Dato mancante: ${mancanti.join(', ')}` });
      }

      // ROI = Utile / Totale Attivo × 100
      if (ce.utile_perdita != null && sp.totale_attivo != null && sp.totale_attivo !== 0) {
        lista.push({
          nome: 'ROI (Return on Investment)',
          formula: 'Utile / Totale Attivo × 100',
          valore: Math.round((ce.utile_perdita / sp.totale_attivo) * 10000) / 100,
          unita: '%',
          dettaglio: `${ce.utile_perdita} / ${sp.totale_attivo} × 100`
        });
      } else {
        const mancanti = [];
        if (ce.utile_perdita == null) mancanti.push('Utile/Perdita');
        if (sp.totale_attivo == null) mancanti.push('Totale Attivo');
        if (sp.totale_attivo === 0) mancanti.push('Totale Attivo = 0');
        lista.push({ nome: 'ROI (Return on Investment)', formula: 'Utile / Totale Attivo × 100', valore: null, motivo: `Dato mancante: ${mancanti.join(', ')}` });
      }

      // Current Ratio = Totale Attivo / Debiti (approssimazione con dati disponibili)
      if (sp.totale_attivo != null && sp.debiti != null && sp.debiti !== 0) {
        lista.push({
          nome: 'Indice di Indebitamento',
          formula: 'Debiti / Totale Attivo × 100',
          valore: Math.round((sp.debiti / sp.totale_attivo) * 10000) / 100,
          unita: '%',
          dettaglio: `${sp.debiti} / ${sp.totale_attivo} × 100`
        });
      } else {
        const mancanti = [];
        if (sp.totale_attivo == null) mancanti.push('Totale Attivo');
        if (sp.debiti == null) mancanti.push('Debiti');
        if (sp.debiti === 0) mancanti.push('Debiti = 0');
        lista.push({ nome: 'Indice di Indebitamento', formula: 'Debiti / Totale Attivo × 100', valore: null, motivo: `Dato mancante: ${mancanti.join(', ')}` });
      }

      // PFN stimata = Debiti - Disponibilità liquide
      if (sp.debiti != null && sp.disponibilita_liquide != null) {
        const pfn = sp.debiti - sp.disponibilita_liquide;
        lista.push({
          nome: 'PFN stimata (Posizione Finanziaria Netta)',
          formula: 'Debiti − Disponibilità liquide',
          valore: pfn,
          unita: '€',
          dettaglio: `${sp.debiti} − ${sp.disponibilita_liquide}`
        });
      } else {
        const mancanti = [];
        if (sp.debiti == null) mancanti.push('Debiti');
        if (sp.disponibilita_liquide == null) mancanti.push('Disponibilità liquide');
        lista.push({ nome: 'PFN stimata (Posizione Finanziaria Netta)', formula: 'Debiti − Disponibilità liquide', valore: null, motivo: `Dato mancante: ${mancanti.join(', ')}` });
      }

      indicatori_finanziari = { indicatori: lista };
    }

    // STEP 6: Coerenza fiscale – aliquote effettive e scostamenti
    let coerenza_fiscale = null;
    if (dati_estratti) {
      const ce = dati_estratti.conto_economico || {};
      const imp = dati_estratti.imposte || {};
      const verifiche = [];

      const IRES_STANDARD = 0.24;
      const IRAP_STANDARD_MIN = 0.039;
      const IRAP_STANDARD_MAX = 0.049;
      const TOLLERANZA_PUNTI = 5; // punti percentuali di tolleranza

      // Aliquota IRES effettiva
      if (imp.ires != null && ce.utile_perdita != null && ce.utile_perdita > 0) {
        const aliqEffettiva = Math.round((imp.ires / ce.utile_perdita) * 10000) / 100;
        const scostamento = Math.abs(aliqEffettiva - IRES_STANDARD * 100);
        let esito = 'coerente';
        let nota = `Aliquota IRES nominale: 24%. Aliquota effettiva rilevata: ${aliqEffettiva}%.`;
        if (scostamento > TOLLERANZA_PUNTI) {
          esito = 'da_verificare';
          nota += ` Scostamento di ${Math.round(scostamento * 100) / 100} punti percentuali rispetto all'aliquota nominale. Lo scostamento può dipendere da riprese fiscali, deduzioni extracontabili o differenze temporanee.`;
        } else {
          nota += ' Aliquota effettiva in linea con il valore nominale.';
        }
        verifiche.push({ nome: 'Aliquota IRES effettiva', aliquota_effettiva: aliqEffettiva, aliquota_nominale: 24, esito, nota, formula: 'IRES / Utile lordo × 100', dettaglio: `${imp.ires} / ${ce.utile_perdita} × 100 = ${aliqEffettiva}%` });
      } else {
        const mancanti = [];
        if (imp.ires == null) mancanti.push('IRES');
        if (ce.utile_perdita == null) mancanti.push('Utile/Perdita');
        if (ce.utile_perdita != null && ce.utile_perdita <= 0) mancanti.push('Utile ≤ 0');
        verifiche.push({ nome: 'Aliquota IRES effettiva', aliquota_effettiva: null, esito: 'non_verificabile', nota: `Dato mancante: ${mancanti.join(', ')}` });
      }

      // Aliquota IRAP apparente (su ricavi come proxy del valore della produzione)
      if (imp.irap != null && ce.ricavi != null && ce.ricavi > 0) {
        const aliqApparente = Math.round((imp.irap / ce.ricavi) * 10000) / 100;
        let esito = 'coerente';
        let nota = `Aliquota IRAP standard: 3.9%–4.9% (variabile per regione). Aliquota apparente su ricavi: ${aliqApparente}%.`;
        if (aliqApparente > IRAP_STANDARD_MAX * 100 + TOLLERANZA_PUNTI) {
          esito = 'da_verificare';
          nota += ' Valore significativamente superiore all\'intervallo standard. Potrebbe dipendere da base imponibile ridotta rispetto ai ricavi, o da maggiorazioni regionali.';
        } else if (aliqApparente < IRAP_STANDARD_MIN * 100 - 2) {
          esito = 'da_verificare';
          nota += ' Valore significativamente inferiore all\'intervallo standard. Potrebbe dipendere da deduzioni IRAP (costo del lavoro, cuneo fiscale) o agevolazioni regionali.';
        } else {
          nota += ' Valore nell\'intervallo atteso.';
        }
        verifiche.push({ nome: 'Aliquota IRAP apparente', aliquota_effettiva: aliqApparente, aliquota_nominale_min: 3.9, aliquota_nominale_max: 4.9, esito, nota, formula: 'IRAP / Ricavi × 100', dettaglio: `${imp.irap} / ${ce.ricavi} × 100 = ${aliqApparente}%` });
      } else {
        const mancanti = [];
        if (imp.irap == null) mancanti.push('IRAP');
        if (ce.ricavi == null) mancanti.push('Ricavi');
        if (ce.ricavi != null && ce.ricavi <= 0) mancanti.push('Ricavi ≤ 0');
        verifiche.push({ nome: 'Aliquota IRAP apparente', aliquota_effettiva: null, esito: 'non_verificabile', nota: `Dato mancante: ${mancanti.join(', ')}` });
      }

      // Incidenza fiscale complessiva
      if (imp.ires != null && imp.irap != null && ce.utile_perdita != null && ce.utile_perdita > 0) {
        const totImposte = imp.ires + imp.irap;
        const incidenza = Math.round((totImposte / ce.utile_perdita) * 10000) / 100;
        let esito = 'coerente';
        let nota = `Incidenza fiscale complessiva (IRES+IRAP) su utile: ${incidenza}%.`;
        if (incidenza > 40) {
          esito = 'da_verificare';
          nota += ' Valore elevato. Può derivare da indeducibilità di costi, riprese fiscali in aumento o base IRAP più ampia dell\'utile.';
        } else if (incidenza < 20) {
          esito = 'da_verificare';
          nota += ' Valore contenuto. Può derivare da agevolazioni, crediti d\'imposta, patent box o deduzioni extra-contabili.';
        } else {
          nota += ' Valore nell\'intervallo tipico per una società di capitali italiana (20%–40%).';
        }
        verifiche.push({ nome: 'Incidenza fiscale complessiva', aliquota_effettiva: incidenza, esito, nota, formula: '(IRES + IRAP) / Utile lordo × 100', dettaglio: `(${imp.ires} + ${imp.irap}) / ${ce.utile_perdita} × 100 = ${incidenza}%` });
      }

      coerenza_fiscale = { verifiche };
    }

    return Response.json({ 
      success: true, 
      analisi: result,
      dati_estratti,
      revisione,
      indicatori_finanziari,
      coerenza_fiscale,
      ocr_info: {
        qualita: qualitaOcr,
        correzioni: correzioniOcr
      }
    });

  } catch (error) {
    console.error('Errore analisiBilancio:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});