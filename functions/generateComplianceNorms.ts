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

    if (!tipo_attivita || !codice_ateco) {
      return Response.json({ error: 'Tipo attività e codice ATECO sono obbligatori' }, { status: 400 });
    }

    const dataBase = data_attivazione || new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();

    // Costruisci il prompt dettagliato per GPT
    const rischiAttivi = rischi ? Object.entries(rischi)
      .filter(([key, val]) => val === true && key !== 'lavoratori')
      .map(([key]) => key.replace(/_/g, ' '))
      .join(', ') : 'nessuno dichiarato';

    const prompt = `Sei un esperto di compliance aziendale italiana, aggiornato al ${currentYear}. 
Devi generare la lista COMPLETA di TUTTI gli adempimenti obbligatori per legge per un'azienda con queste caratteristiche:

CODICE ATECO: ${codice_ateco}
TIPO ATTIVITÀ: ${tipo_attivita}
CATEGORIA: ${tipo_attivita_categoria || 'non specificata'}
NUMERO DIPENDENTI: ${numero_dipendenti || 'non specificato'}
SUPERFICIE MQ: ${superficie_mq || 'non specificata'}
DATA INIZIO ATTIVITÀ: ${dataBase}

RISCHI DICHIARATI DALL'AZIENDA:
- Presenza lavoratori: ${rischi?.lavoratori !== false ? 'SÌ' : 'NO'}
- Rischi specifici attivi: ${rischiAttivi || 'nessuno'}

ISTRUZIONI CRITICHE:
1. Genera TUTTI gli adempimenti obbligatori per questo specifico codice ATECO e tipo di attività
2. Includi SEMPRE: sicurezza sul lavoro, privacy/GDPR, ambientale, antincendio, formazione obbligatoria, igiene/sanità (se applicabile), fiscale (se applicabile)
3. Per ogni adempimento indica il RIFERIMENTO NORMATIVO ESATTO (articolo, decreto, legge)
4. Per ogni adempimento indica la SANZIONE ESATTA prevista dalla legge
5. Se il codice ATECO è del settore alimentare (10.xx, 11.xx, 47.2x, 55.xx, 56.xx), includi HACCP e tutti gli adempimenti igienico-sanitari
6. Se il codice ATECO è del settore edilizia (41.xx, 42.xx, 43.xx), includi POS, notifica preliminare, formazione ponteggi
7. Includi gli adempimenti legati ai rischi specifici dichiarati
8. La frequenza_rinnovo_mesi deve essere 0 se il documento non ha scadenza periodica
9. La data_scadenza va calcolata a partire dalla data di inizio attività (${dataBase}) + i mesi di frequenza_rinnovo_mesi. Se frequenza_rinnovo_mesi è 0, data_scadenza deve essere null
10. NON INVENTARE adempimenti. Cita solo obblighi reali previsti dalla normativa italiana vigente.
11. Sii ESAUSTIVO: è meglio includere un adempimento in più che dimenticarne uno obbligatorio.

Le categorie ammesse sono SOLO queste: "Sicurezza sul lavoro", "Privacy e GDPR", "Ambientale", "Fiscale", "Igiene e Sanità", "Antincendio", "Formazione obbligatoria", "Altro"

Restituisci un JSON con la lista di adempimenti.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Sei un consulente di compliance aziendale italiano esperto. Rispondi SOLO in formato JSON valido. Non aggiungere commenti o testo fuori dal JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = response.choices[0].message.content;
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      return Response.json({ error: 'Errore parsing risposta AI', raw: content }, { status: 500 });
    }

    // Normalizza: il risultato potrebbe essere { adempimenti: [...] } o { lista: [...] } o direttamente [...]
    let adempimenti = parsed.adempimenti || parsed.lista || parsed.norms || parsed.items || parsed.obblighi || [];
    if (!Array.isArray(adempimenti)) {
      // Prova a trovare il primo array nel JSON
      for (const key of Object.keys(parsed)) {
        if (Array.isArray(parsed[key])) {
          adempimenti = parsed[key];
          break;
        }
      }
    }

    if (!Array.isArray(adempimenti) || adempimenti.length === 0) {
      return Response.json({ error: 'Nessun adempimento generato dall\'AI', raw: parsed }, { status: 500 });
    }

    const validCategorie = ["Sicurezza sul lavoro", "Privacy e GDPR", "Ambientale", "Fiscale", "Igiene e Sanità", "Antincendio", "Formazione obbligatoria", "Altro"];

    // Normalizza e calcola date scadenza
    const normalizedAdempimenti = adempimenti.map(a => {
      // Normalizza categoria
      let categoria = a.categoria || 'Altro';
      const categoriaLower = categoria.toLowerCase().trim();
      const matchedCategoria = validCategorie.find(c => c.toLowerCase() === categoriaLower);
      if (matchedCategoria) {
        categoria = matchedCategoria;
      } else {
        const partialMatch = validCategorie.find(c =>
          categoriaLower.includes(c.toLowerCase()) || c.toLowerCase().includes(categoriaLower)
        );
        categoria = partialMatch || 'Altro';
      }

      // Calcola data scadenza
      const frequenza = parseInt(a.frequenza_rinnovo_mesi) || 0;
      let dataScadenza = null;
      if (frequenza > 0) {
        const data = new Date(dataBase);
        data.setMonth(data.getMonth() + frequenza);
        dataScadenza = data.toISOString().split('T')[0];
      }
      // Se l'AI ha fornito una data_scadenza specifica, usa quella
      if (a.data_scadenza && a.data_scadenza !== 'null' && a.data_scadenza !== '') {
        dataScadenza = a.data_scadenza;
      }

      return {
        nome: a.nome || a.name || a.titolo || 'Adempimento',
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