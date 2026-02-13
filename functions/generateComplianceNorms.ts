import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
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

    const { codice_ateco, tipo_attivita, tipo_attivita_categoria, numero_dipendenti, superficie_mq, data_attivazione, rischi } = await req.json();

    if (!codice_ateco) {
      return Response.json({ error: 'Codice ATECO obbligatorio' }, { status: 400 });
    }

    const dataBase = data_attivazione || new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();

    const rischiAttivi = rischi ? Object.entries(rischi)
      .filter(([key, val]) => val === true && key !== 'lavoratori')
      .map(([key]) => key.replace(/_/g, ' '))
      .join(', ') : 'nessuno dichiarato';

    const prompt = `Sei un consulente esperto di compliance aziendale italiana.

REGOLE FONDAMENTALI CHE DEVI RISPETTARE TASSATIVAMENTE:
- Rispondi ESCLUSIVAMENTE basandoti sulla normativa italiana VIGENTE e IN VIGORE al ${currentYear}. Non fare riferimento a norme abrogate, scadute o non ancora in vigore.
- NON INVENTARE MAI nomi di leggi, articoli, decreti, importi di sanzioni o obblighi che non esistono realmente nella legislazione italiana.
- Se non sei sicuro al 100% dell'esistenza di un obbligo o del riferimento normativo esatto, NON includerlo. È meglio omettere un adempimento dubbio che inventarne uno falso.
- Cita SOLO articoli e commi che esistono realmente nei testi normativi italiani (D.Lgs. 81/08, D.Lgs. 196/03 e Reg. UE 2016/679, D.Lgs. 152/06, ecc.).
- Gli importi delle sanzioni devono corrispondere a quelli REALI e AGGIORNATI della normativa vigente, non a importi inventati o approssimati.
- NON generalizzare: ogni adempimento deve essere specifico e verificabile su un testo di legge reale.

Devi generare la lista COMPLETA e ESAUSTIVA di TUTTI gli adempimenti normativi obbligatori per un'azienda italiana con queste caratteristiche:

CODICE ATECO: ${codice_ateco}
TIPO ATTIVITÀ: ${tipo_attivita || 'da determinare in base al codice ATECO'}
CATEGORIA ATTIVITÀ: ${tipo_attivita_categoria || 'non specificata'}
NUMERO DIPENDENTI: ${numero_dipendenti || 'non specificato'}
SUPERFICIE MQ: ${superficie_mq || 'non specificata'}
DATA INIZIO ATTIVITÀ: ${dataBase}
RISCHI DICHIARATI: Lavoratori: ${rischi?.lavoratori !== false ? 'SÌ' : 'NO'}, Specifici: ${rischiAttivi || 'nessuno'}

ISTRUZIONI:
1. Analizza il codice ATECO e determina TUTTI gli obblighi normativi specifici per quel settore
2. Includi SEMPRE gli adempimenti di: Sicurezza sul lavoro (D.Lgs. 81/08), Privacy e GDPR (Reg. UE 2016/679), Ambientale (D.Lgs. 152/06), Antincendio, Formazione obbligatoria
3. Se il settore è alimentare: includi HACCP, registrazione OSA, formazione alimentaristi
4. Se il settore è edilizia: includi POS, notifica cantiere, formazione ponteggi
5. Includi adempimenti specifici per i rischi dichiarati (rumore, vibrazioni, chimico, ecc.)
6. Per OGNI adempimento fornisci il RIFERIMENTO NORMATIVO ESATTO (articolo e decreto/legge)
7. Per OGNI adempimento fornisci la SANZIONE ESATTA prevista dalla legge italiana
8. frequenza_rinnovo_mesi = 0 se il documento non ha scadenza periodica, altrimenti il numero di mesi
9. priorita: "alta" per obblighi con sanzioni penali, "media" per sanzioni amministrative, "bassa" per raccomandati
10. NON INVENTARE MAI adempimenti inesistenti. Solo obblighi REALI della normativa italiana VIGENTE al ${currentYear}.
11. Sii esaustivo ma ACCURATO: includi solo obblighi che esistono VERAMENTE. Se hai dubbi, ometti.
12. Verifica mentalmente ogni riferimento normativo: l'articolo che citi esiste davvero in quel decreto/legge?
13. Le sanzioni devono essere quelle REALI previste dalla legge, con gli importi corretti e aggiornati. Non arrotondare e non inventare cifre.
14. Per i codici ATECO: basa la tua analisi sulle attività REALMENTE coperte da quel codice secondo la classificazione ISTAT.

Le categorie ammesse sono SOLO: "Sicurezza sul lavoro", "Privacy e GDPR", "Ambientale", "Fiscale", "Igiene e Sanità", "Antincendio", "Formazione obbligatoria", "Altro"

FORMATO OUTPUT:
Rispondi con un JSON con chiave "adempimenti" contenente un array di oggetti con ESATTAMENTE questi campi:
- "nome": stringa con il NOME SPECIFICO dell'adempimento (es: "DVR - Documento di Valutazione dei Rischi", "Manuale HACCP", "Nomina RSPP"). NON usare nomi generici come "Adempimento".
- "descrizione": stringa con il riferimento normativo e la descrizione (es: "Art. 17, 28 D.Lgs. 81/08 - Documento obbligatorio che analizza tutti i rischi...")
- "categoria": una delle categorie ammesse
- "frequenza_rinnovo_mesi": numero intero (0 se non ha scadenza periodica)
- "sanzione_prevista": stringa con articolo e importo esatto della sanzione
- "priorita": "alta", "media" o "bassa"

ESEMPIO di un elemento:
{"nome": "DVR - Documento di Valutazione dei Rischi", "descrizione": "Art. 17, 28 D.Lgs. 81/08 - Documento obbligatorio che analizza tutti i rischi presenti in azienda", "categoria": "Sicurezza sul lavoro", "frequenza_rinnovo_mesi": 0, "sanzione_prevista": "Art. 55 D.Lgs. 81/08: Arresto da 3 a 6 mesi o ammenda da €3.071 a €7.862", "priorita": "alta"}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Sei un consulente di compliance aziendale italiano esperto in normativa vigente al " + currentYear + ". Rispondi SOLO in formato JSON valido con la chiave 'adempimenti'. Non aggiungere testo fuori dal JSON. NON INVENTARE MAI riferimenti normativi, articoli di legge o importi di sanzioni. Cita solo norme reali e verificabili. Se non sei certo di un dato, omettilo."
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

      return {
        nome: a.nome || a.name || a.titolo || a.descrizione?.substring(0, 80) || 'Adempimento',
        descrizione: a.descrizione || a.description || '',
        categoria,
        frequenza_rinnovo_mesi: frequenza,
        sanzione_prevista: a.sanzione_prevista || a.sanzione || '',
        priorita: a.priorita || a.priority || 'media',
        data_scadenza: dataScadenza,
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