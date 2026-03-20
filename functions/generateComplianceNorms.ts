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

    const dataBase = data_attivazione 
      ? (String(data_attivazione).length === 4 ? `${data_attivazione}-01-01` : data_attivazione)
      : new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();

    const rischiAttivi = rischi ? Object.entries(rischi)
      .filter(([key, val]) => val === true && key !== 'lavoratori')
      .map(([key]) => key.replace(/_/g, ' '))
      .join(', ') : 'nessuno dichiarato';

    // ─── FASE 1: Generazione adempimenti con GPT-4o ───
    const prompt = `Sei un consulente esperto di compliance aziendale italiana. Devi generare la lista COMPLETA e MANIACALE di TUTTI gli adempimenti normativi obbligatori.

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

═══════════════════════════════
CALIBRAZIONE PER LIVELLO RISCHIO INAIL
═══════════════════════════════

${livello_rischio_inail === 'basso' ? `RISCHIO BASSO:
- Formazione specifica lavoratori: 4 ore (+ 4 ore generali = 8 ore totali)
- Aggiornamento quinquennale: 6 ore
- Rischio incendio: Livello 1 (ex basso) - DM 02/09/2021
- Primo soccorso: Gruppo C (aziende <3 dipendenti senza rischi particolari) o Gruppo B
- RSPP datore di lavoro: 16 ore (Accordo Stato-Regioni)` : 
livello_rischio_inail === 'medio' ? `RISCHIO MEDIO:
- Formazione specifica lavoratori: 8 ore (+ 4 ore generali = 12 ore totali)
- Aggiornamento quinquennale: 6 ore
- Rischio incendio: Livello 2 (ex medio) - DM 02/09/2021
- Primo soccorso: Gruppo B
- RSPP datore di lavoro: 32 ore (Accordo Stato-Regioni)` :
`RISCHIO ALTO:
- Formazione specifica lavoratori: 12 ore (+ 4 ore generali = 16 ore totali)
- Aggiornamento quinquennale: 6 ore
- Rischio incendio: Livello 3 (ex alto) - DM 02/09/2021 → richiede CPI (Certificato Prevenzione Incendi)
- Primo soccorso: Gruppo A
- RSPP datore di lavoro: 48 ore (Accordo Stato-Regioni)
- Sorveglianza sanitaria OBBLIGATORIA`}

═══════════════════════════════
REGOLE DIMENSIONALI (numero dipendenti: ${numero_dipendenti || 0})
═══════════════════════════════

${parseInt(numero_dipendenti) > 0 ? `- DVR obbligatorio (Art. 17 D.Lgs. 81/08) — NON procedure standardizzate se >10 dipendenti
- Nomina RSPP obbligatoria (Art. 17 D.Lgs. 81/08)
- Nomina RLS (Art. 47 D.Lgs. 81/08) — 1 RLS fino a 200 dip., 3 RLS 201-1000 dip.
- Designazione addetti emergenza e primo soccorso (Art. 18 D.Lgs. 81/08)
- Sorveglianza sanitaria se rischi specifici (Art. 41 D.Lgs. 81/08)
- Formazione obbligatoria tutti i lavoratori (Art. 37 D.Lgs. 81/08)` : '- Titolare senza dipendenti: obblighi ridotti ma DVR comunque necessario se impresa'}
${parseInt(numero_dipendenti) > 15 ? `- Riunione periodica OBBLIGATORIA (Art. 35 D.Lgs. 81/08) — almeno annuale
- Piano di emergenza ed evacuazione OBBLIGATORIO (DM 02/09/2021)` : ''}
${parseInt(numero_dipendenti) > 50 ? `- Registro infortuni con comunicazione INAIL
- Possibile obbligo DUVRI per appalti interni` : ''}

═══════════════════════════════
REGOLE SUPERFICIE (${superficie_mq || 0} mq)
═══════════════════════════════

${parseInt(superficie_mq) > 400 ? `- Superficie >400 mq: possibile obbligo CPI (DPR 151/2011 - Attività 69-70)
- Verifica assoggettabilità a controllo VVF` : ''}
${parseInt(superficie_mq) > 1000 ? `- Superficie >1000 mq: molto probabile obbligo CPI
- Piano di emergenza ed evacuazione OBBLIGATORIO
- Segnaletica di sicurezza estesa (D.Lgs. 81/08 Titolo V)` : ''}

═══════════════════════════════
RISCHI SPECIFICI DICHIARATI → ADEMPIMENTI OBBLIGATORI
═══════════════════════════════

${rischi?.macchinari ? '- MACCHINARI: Marcatura CE, libretto uso/manutenzione, registro verifiche periodiche (DPR 459/96, All. VII D.Lgs. 81/08)' : ''}
${rischi?.rumore ? '- RUMORE: Valutazione rischio rumore (Titolo VIII Capo II D.Lgs. 81/08), audiometria se >80 dB(A), DPI uditivi se >85 dB(A)' : ''}
${rischi?.vibrazioni ? '- VIBRAZIONI: Valutazione rischio vibrazioni HAV/WBV (Titolo VIII Capo III D.Lgs. 81/08)' : ''}
${rischi?.sostanze_chimiche ? '- CHIMICO: Valutazione rischio chimico (Titolo IX D.Lgs. 81/08), schede SDS, registro esposizione se cancerogeni' : ''}
${rischi?.movimentazione_carichi ? '- MMC: Valutazione rischio MMC (Titolo VI D.Lgs. 81/08), formazione specifica' : ''}
${rischi?.videoterminali ? '- VDT: Valutazione rischio VDT (Titolo VII D.Lgs. 81/08), sorveglianza sanitaria se >20h/sett' : ''}
${rischi?.lavori_quota ? '- QUOTA: Piano operativo sicurezza, DPI anticaduta III cat., formazione specifica (Art. 111 D.Lgs. 81/08)' : ''}
${rischi?.spazi_confinati ? '- SPAZI CONFINATI: DPR 177/2011, procedura specifica, formazione, personale qualificato' : ''}
${rischi?.rischio_biologico ? '- BIOLOGICO: Valutazione rischio biologico (Titolo X D.Lgs. 81/08), protocollo sanitario specifico' : ''}
${rischi?.campi_elettromagnetici ? '- CEM: Valutazione rischio CEM (Titolo VIII Capo IV D.Lgs. 81/08)' : ''}
${rischi?.radiazioni_ottiche ? '- ROA: Valutazione rischio radiazioni ottiche (Titolo VIII Capo V D.Lgs. 81/08)' : ''}
${rischi?.microclima_severo ? '- MICROCLIMA: Valutazione rischio microclima severo caldo/freddo' : ''}
${rischi?.atmosfere_esplosive ? '- ATEX: Documento protezione esplosioni (Titolo XI D.Lgs. 81/08, Direttive ATEX)' : ''}
${rischi?.rifiuti_speciali ? '- RIFIUTI: Registro carico/scarico, MUD annuale, formulari trasporto (D.Lgs. 152/06 Parte IV)' : ''}
${rischi?.emissioni_atmosfera ? '- EMISSIONI: AUA o AIA (D.Lgs. 152/06 Parte V), monitoraggio emissioni' : ''}
${rischi?.scarichi_industriali ? '- SCARICHI: Autorizzazione scarichi (D.Lgs. 152/06 Parte III), analisi periodiche' : ''}
${rischi?.rischio_incendio_non_basso ? '- INCENDIO: CPI se attività in DPR 151/2011, SCIA antincendio, registro controlli, manutenzione estintori/idranti' : ''}
${rischi?.sistemi_it_cloud ? '- IT: Misure sicurezza informatica, backup, policy password' : ''}
${rischi?.dati_sensibili ? '- PRIVACY: DPIA obbligatoria (Art. 35 GDPR), DPO se trattamento su larga scala, registro trattamenti' : ''}

═══════════════════════════════
ADEMPIMENTI TRASVERSALI SEMPRE OBBLIGATORI
═══════════════════════════════

Includi SEMPRE:
1. DVR (Art. 17 D.Lgs. 81/08)
2. Nomina RSPP (Art. 17 D.Lgs. 81/08)
3. Formazione lavoratori base + specifica (Art. 37 + Accordo Stato-Regioni)
4. Registro Privacy / GDPR base (Reg. UE 2016/679 Art. 30)
5. Informativa privacy dipendenti e clienti
6. Nomina addetti primo soccorso (DM 388/2003)
7. Nomina addetti antincendio (DM 02/09/2021)
8. Cassetta primo soccorso (DM 388/2003)
9. Estintori e segnaletica emergenza

Se pertinenti al settore, aggiungi ANCHE:
- HACCP (Reg. CE 852/2004) per alimentare
- POS (Art. 89 D.Lgs. 81/08) per edilizia
- CPI per attività soggette (DPR 151/2011)
- SCIA commerciale per commercio
- Autorizzazione sanitaria per sanità
- Libro unico del lavoro (D.L. 112/2008)
- Comunicazione lavoratori all'INAIL

═══════════════════════════════
FORMATO OUTPUT
═══════════════════════════════

Genera un JSON con chiave "adempimenti" contenente un array. Per OGNI adempimento:

- "nome": nome specifico (es: "DVR - Documento di Valutazione dei Rischi")
- "descrizione": descrizione tecnica completa con cosa deve contenere il documento
- "categoria": SOLO tra "Sicurezza sul lavoro", "Privacy e GDPR", "Ambientale", "Fiscale", "Igiene e Sanità", "Antincendio", "Formazione obbligatoria", "Altro"
- "frequenza_rinnovo_mesi": intero (0 = nessuna scadenza periodica)
- "sanzione_prevista": importo e articolo REALI da fonti certe, o "non verificata - consultare un professionista"
- "priorita": "alta" (sanzioni penali/arresto), "media" (sanzioni amministrative), "bassa" (raccomandati)
- "stato_affidabilita": "verificato" se hai certezza assoluta del riferimento, "non_verificato" altrimenti
- "riferimento_normativo": articolo e legge esatti (es: "Art. 17, 28 D.Lgs. 81/2008")
- "fonte_ufficiale": nome ente (es: "Normattiva", "INAIL")
- "link_verifica": URL fonte ufficiale o null
- "ente_controllo": ente preposto (es: "ASL / Ispettorato del Lavoro")

REGOLE ASSOLUTE:
- NON inventare mai articoli di legge o importi sanzioni inesistenti
- Se non sei CERTO → stato_affidabilita = "non_verificato"
- Sii ESAUSTIVO: meglio 30 adempimenti completi che 10 generici
- Ogni rischio dichiarato DEVE generare almeno un adempimento specifico`;

    console.log('[generateComplianceNorms] Generazione per ATECO:', codice_ateco, '| Dipendenti:', numero_dipendenti, '| Superficie:', superficie_mq, '| Rischio INAIL:', livello_rischio_inail);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Sei un consulente di compliance aziendale italiano esperto in normativa vigente al ${currentYear}. Rispondi SOLO in formato JSON valido con la chiave 'adempimenti'. Non aggiungere testo fuori dal JSON.

REGOLA FONDAMENTALE: Per ogni adempimento DEVI classificare lo stato_affidabilita come "verificato" (se hai certezza del riferimento normativo) o "non_verificato" (se hai dubbi). NON inventare MAI riferimenti normativi falsi. È meglio classificare come "non_verificato" che inventare.

Sii MANIACALMENTE preciso e completo. Genera TUTTI gli adempimenti obbligatori per questa specifica combinazione di ATECO + dipendenti + superficie + rischi dichiarati.`
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

    console.log('[generateComplianceNorms] Fase 1 completata:', adempimenti.length, 'adempimenti generati');

    // ─── FASE 2: Cross-check con ricerca web su fonti ufficiali ───
    // Verifica i riferimenti normativi cercando su internet
    const nomiAdempimenti = adempimenti.map(a => `- ${a.nome}: ${a.riferimento_normativo || 'da verificare'}`).join('\n');

    let verifica = {};
    try {
      verifica = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Verifica la CORRETTEZZA dei seguenti adempimenti normativi italiani per un'azienda con codice ATECO ${codice_ateco} (${tipo_attivita || ''}).

ADEMPIMENTI DA VERIFICARE:
${nomiAdempimenti}

Per OGNI adempimento, verifica su fonti ufficiali (normattiva.it, INAIL, Ministero Lavoro, Garante Privacy):
1. Il riferimento normativo è CORRETTO? (articolo, legge, anno)
2. La sanzione indicata è REALE e AGGIORNATA al ${currentYear}?
3. L'adempimento è EFFETTIVAMENTE obbligatorio per ATECO ${codice_ateco}?
4. Manca qualche adempimento FONDAMENTALE che non è stato generato?

Rispondi con un JSON:
- "correzioni": oggetto dove la chiave è il nome dell'adempimento e il valore è un oggetto con { "corretto": bool, "riferimento_corretto": string, "sanzione_corretta": string, "nota": string }
- "adempimenti_mancanti": array di nomi di adempimenti fondamentali mancanti`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            correzioni: { 
              type: "object",
              description: "Per ogni adempimento, correzioni trovate"
            },
            adempimenti_mancanti: { 
              type: "array", 
              items: { type: "string" },
              description: "Adempimenti fondamentali mancanti dalla lista" 
            }
          }
        }
      });
      console.log('[generateComplianceNorms] Fase 2 verifica completata. Correzioni:', Object.keys(verifica.correzioni || {}).length, '| Mancanti:', (verifica.adempimenti_mancanti || []).length);
    } catch (e) {
      console.warn('[generateComplianceNorms] Fase 2 verifica fallita, continuo senza:', e.message);
    }

    // Applica correzioni dalla verifica
    if (verifica.correzioni) {
      for (const a of adempimenti) {
        const corr = verifica.correzioni[a.nome];
        if (corr) {
          if (corr.corretto === false) {
            // Riferimento errato → marca come non verificato
            a.stato_affidabilita = 'non_verificato';
            if (corr.nota) a.descrizione = (a.descrizione || '') + ' [Nota verifica: ' + corr.nota + ']';
          }
          if (corr.riferimento_corretto && corr.corretto !== false) {
            a.riferimento_normativo = corr.riferimento_corretto;
            a.stato_affidabilita = 'verificato';
          }
          if (corr.sanzione_corretta && corr.corretto !== false) {
            a.sanzione_prevista = corr.sanzione_corretta;
          }
        }
      }
    }

    // Normalizzazione finale
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

      const statoAffidabilita = a.stato_affidabilita === 'verificato' ? 'verificato' : 'non_verificato';
      
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

    console.log('[generateComplianceNorms] Completato:', normalizedAdempimenti.length, 'adempimenti finali');

    return Response.json({
      success: true,
      adempimenti: normalizedAdempimenti,
      count: normalizedAdempimenti.length,
      adempimenti_mancanti_segnalati: verifica.adempimenti_mancanti || []
    });

  } catch (error) {
    console.error('Errore generateComplianceNorms:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});