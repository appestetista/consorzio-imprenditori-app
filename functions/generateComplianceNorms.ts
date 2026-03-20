import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import OpenAI from 'npm:openai';

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { codice_ateco, tipo_attivita, tipo_attivita_categoria, numero_dipendenti, superficie_mq, data_attivazione, livello_rischio_inail, rischi } = await req.json();

    if (!codice_ateco) {
      return Response.json({ error: 'Codice ATECO obbligatorio' }, { status: 400 });
    }

    // data_attivazione può essere un anno (es: "2020") o una data completa
    const dataBase = data_attivazione 
      ? (String(data_attivazione).length === 4 ? `${data_attivazione}-01-01` : data_attivazione)
      : new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();

    const rischiAttivi = rischi ? Object.entries(rischi)
      .filter(([key, val]) => val === true && key !== 'lavoratori')
      .map(([key]) => key.replace(/_/g, ' '))
      .join(', ') : 'nessuno dichiarato';

    // ─── FASE 1 + FASE 2: Generazione con classificazione affidabilità ───
    const prompt = `Sei un consulente esperto di compliance aziendale italiana.

═══════════════════════════════
REGOLE ASSOLUTE
═══════════════════════════════

1. NON inventare mai normative, articoli di legge o sanzioni inesistenti
2. NON dichiarare mai certezza senza fonte ufficiale reale
3. È OBBLIGATORIO generare output (non lasciare vuoto)
4. Se NON trovi fonte ufficiale certa → segnala come "non_verificato"
5. NON bloccare l'output, ma CLASSIFICA ogni adempimento

═══════════════════════════════
FONTI UFFICIALI PRIORITARIE
═══════════════════════════════

Usa preferibilmente queste fonti:
- Normattiva (https://www.normattiva.it) → leggi ufficiali italiane
- INAIL (https://www.inail.it) → sicurezza lavoro
- INPS (https://www.inps.it) → previdenza
- Agenzia Entrate (https://www.agenziaentrate.gov.it) → fiscale
- Ministero del Lavoro (https://www.lavoro.gov.it)
- Garante Privacy (https://www.garanteprivacy.it) → GDPR

Puoi usare la tua conoscenza SOLO SE:
- è coerente con la normativa italiana nota
- è plausibile per il settore
- viene marcata come "non_verificato"

═══════════════════════════════
DATI AZIENDA
═══════════════════════════════

CODICE ATECO: ${codice_ateco}
TIPO ATTIVITÀ: ${tipo_attivita || 'da determinare in base al codice ATECO'}
CATEGORIA ATTIVITÀ: ${tipo_attivita_categoria || 'non specificata'}
LIVELLO RISCHIO INAIL: ${livello_rischio_inail || 'non classificato'} (Fonte: Allegato II Accordo Stato-Regioni 21/12/2011)
NUMERO DIPENDENTI: ${numero_dipendenti || 'non specificato'}
SUPERFICIE MQ: ${superficie_mq || 'non specificata'}
DATA INIZIO ATTIVITÀ: ${dataBase}
RISCHI DICHIARATI: Lavoratori: ${rischi?.lavoratori !== false ? 'SÌ' : 'NO'}, Specifici: ${rischiAttivi || 'nessuno'}

NOTA IMPORTANTE SUL LIVELLO RISCHIO:
- Se BASSO: formazione specifica 4h, aggiornamento quinquennale 6h, rischio incendio livello 1
- Se MEDIO: formazione specifica 8h, aggiornamento quinquennale 6h, rischio incendio livello 2
- Se ALTO: formazione specifica 12h, aggiornamento quinquennale 6h, rischio incendio livello 3
Calibra gli adempimenti di formazione e antincendio in base a questo livello.

═══════════════════════════════
PROCESSO OBBLIGATORIO
═══════════════════════════════

FASE 1 — GENERAZIONE:
Genera una lista COMPLETA di adempimenti normativi obbligatori in base a:
- codice ATECO e settore specifico
- numero dipendenti
- fattori di rischio dichiarati
- tipo attività (produttiva/servizi/commerciale)

Includi SEMPRE gli adempimenti fondamentali di:
- Sicurezza sul lavoro (D.Lgs. 81/08)
- Privacy e GDPR (Reg. UE 2016/679)
- Ambientale (D.Lgs. 152/06) se pertinente
- Antincendio se pertinente
- Formazione obbligatoria
- Settoriali specifici (HACCP per alimentare, POS per edilizia, ecc.)

FASE 2 — VERIFICA FONTI:
Per OGNI adempimento generato:
1. Cerca il riferimento normativo reale (legge, articolo, comma)
2. Se trovi riferimento certo e verificabile:
   → stato_affidabilita = "verificato"
   → indica riferimento_normativo, fonte_ufficiale, link_verifica
   → indica sanzione_prevista SOLO con importi certi
3. Se NON trovi riferimento certo:
   → stato_affidabilita = "non_verificato"
   → riferimento_normativo = "non disponibile"
   → fonte_ufficiale = "non verificata"
   → link_verifica = null
   → sanzione_prevista = "non verificata - consultare un professionista"

═══════════════════════════════
REGOLE DI SICUREZZA
═══════════════════════════════

- Se un adempimento è "non_verificato": NON presentare sanzioni come certe
- Se è "verificato": DEVE avere riferimento normativo preciso
- In caso di dubbio → classificare SEMPRE come "non_verificato"
- Le sanzioni verificate devono avere importi REALI e AGGIORNATI
- NON arrotondare o inventare cifre

Le categorie ammesse sono SOLO: "Sicurezza sul lavoro", "Privacy e GDPR", "Ambientale", "Fiscale", "Igiene e Sanità", "Antincendio", "Formazione obbligatoria", "Altro"

═══════════════════════════════
FORMATO OUTPUT JSON
═══════════════════════════════

Rispondi con un JSON con chiave "adempimenti" contenente un array di oggetti con ESATTAMENTE questi campi:

- "nome": nome specifico dell'adempimento (es: "DVR - Documento di Valutazione dei Rischi")
- "descrizione": descrizione tecnica con riferimento normativo
- "categoria": una delle categorie ammesse
- "frequenza_rinnovo_mesi": numero intero (0 se non ha scadenza periodica)
- "sanzione_prevista": importo e articolo REALI se verificato, oppure "non verificata - consultare un professionista"
- "priorita": "alta" (sanzioni penali), "media" (sanzioni amministrative), "bassa" (raccomandati)
- "stato_affidabilita": "verificato" o "non_verificato"
- "riferimento_normativo": articolo e legge esatti se verificato, oppure "non disponibile"
- "fonte_ufficiale": nome ente fonte se verificato, oppure "non verificata"
- "link_verifica": URL fonte ufficiale se disponibile, oppure null
- "ente_controllo": ente preposto al controllo (es: "ASL/Ispettorato del Lavoro", "ARPA", "Vigili del Fuoco", "Garante Privacy")

ESEMPIO verificato:
{"nome": "DVR - Documento di Valutazione dei Rischi", "descrizione": "Documento obbligatorio che analizza tutti i rischi presenti in azienda e le misure di prevenzione", "categoria": "Sicurezza sul lavoro", "frequenza_rinnovo_mesi": 0, "sanzione_prevista": "Art. 55 D.Lgs. 81/08: Arresto da 3 a 6 mesi o ammenda da €3.071,27 a €7.862,44", "priorita": "alta", "stato_affidabilita": "verificato", "riferimento_normativo": "Art. 17, 28, 29 D.Lgs. 81/2008", "fonte_ufficiale": "Normattiva", "link_verifica": "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2008-04-09;81", "ente_controllo": "ASL / Ispettorato del Lavoro"}

ESEMPIO non verificato:
{"nome": "Registro carico/scarico sostanze", "descrizione": "Possibile obbligo di tenuta registro per sostanze pericolose specifiche del settore", "categoria": "Ambientale", "frequenza_rinnovo_mesi": 12, "sanzione_prevista": "non verificata - consultare un professionista", "priorita": "media", "stato_affidabilita": "non_verificato", "riferimento_normativo": "non disponibile", "fonte_ufficiale": "non verificata", "link_verifica": null, "ente_controllo": "ARPA / Provincia"}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Sei un consulente di compliance aziendale italiano esperto in normativa vigente al ${currentYear}. 
Rispondi SOLO in formato JSON valido con la chiave 'adempimenti'. Non aggiungere testo fuori dal JSON.

REGOLA FONDAMENTALE: Per ogni adempimento DEVI classificare lo stato_affidabilita come "verificato" (se hai certezza del riferimento normativo) o "non_verificato" (se hai dubbi). NON inventare MAI riferimenti normativi falsi. È meglio classificare come "non_verificato" che inventare.`
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const content = response.choices[0].message.content;
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      return Response.json({ error: 'Errore parsing risposta AI', raw: content }, { status: 500 });
    }

    // Trova l'array di adempimenti nel JSON
    let adempimenti = parsed.adempimenti || parsed.lista || parsed.norms || parsed.items || parsed.obblighi || [];
    if (!Array.isArray(adempimenti)) {
      for (const key of Object.keys(parsed)) {
        if (Array.isArray(parsed[key])) {
          adempimenti = parsed[key];
          break;
        }
      }
    }

    if (!Array.isArray(adempimenti) || adempimenti.length === 0) {
      return Response.json({ error: 'Nessun adempimento generato', raw: parsed }, { status: 500 });
    }

    const validCategorie = ["Sicurezza sul lavoro", "Privacy e GDPR", "Ambientale", "Fiscale", "Igiene e Sanità", "Antincendio", "Formazione obbligatoria", "Altro"];

    const normalizedAdempimenti = adempimenti.map(a => {
      let categoria = a.categoria || 'Altro';
      const categoriaLower = categoria.toLowerCase().trim();
      const matched = validCategorie.find(c => c.toLowerCase() === categoriaLower);
      if (matched) {
        categoria = matched;
      } else {
        const partial = validCategorie.find(c =>
          categoriaLower.includes(c.toLowerCase()) || c.toLowerCase().includes(categoriaLower)
        );
        categoria = partial || 'Altro';
      }

      const frequenza = parseInt(a.frequenza_rinnovo_mesi) || 0;
      let dataScadenza = null;
      if (frequenza > 0) {
        const data = new Date(dataBase);
        data.setMonth(data.getMonth() + frequenza);
        dataScadenza = data.toISOString().split('T')[0];
      }

      // Determina stato affidabilità
      const statoAffidabilita = a.stato_affidabilita === 'verificato' ? 'verificato' : 'non_verificato';
      
      // Se non verificato, forza sanzione come non verificata
      let sanzione = a.sanzione_prevista || a.sanzione || '';
      if (statoAffidabilita === 'non_verificato' && sanzione && !sanzione.toLowerCase().includes('non verificata')) {
        sanzione = 'non verificata - consultare un professionista';
      }

      return {
        nome: a.nome || a.name || a.titolo || a.descrizione?.substring(0, 80) || 'Adempimento',
        descrizione: a.descrizione || a.description || '',
        categoria,
        frequenza_rinnovo_mesi: frequenza,
        sanzione_prevista: sanzione,
        priorita: a.priorita || a.priority || 'media',
        data_scadenza: dataScadenza,
        stato_affidabilita: statoAffidabilita,
        riferimento_normativo: statoAffidabilita === 'verificato' 
          ? (a.riferimento_normativo || 'non disponibile') 
          : 'non disponibile',
        fonte_ufficiale: statoAffidabilita === 'verificato' 
          ? (a.fonte_ufficiale || 'non verificata') 
          : 'non verificata',
        link_verifica: statoAffidabilita === 'verificato' 
          ? (a.link_verifica || null) 
          : null,
        ente_controllo: a.ente_controllo || '',
      };
    });

    return Response.json({
      success: true,
      adempimenti: normalizedAdempimenti,
      count: normalizedAdempimenti.length
    });

  } catch (error) {
    console.error('Errore generateComplianceNorms:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});