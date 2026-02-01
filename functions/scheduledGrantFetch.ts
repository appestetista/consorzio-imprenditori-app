import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import OpenAI from 'npm:openai';

const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY"),
});

// Questa function viene chiamata dall'automazione schedulata
// Non richiede autenticazione utente perché è un task di sistema

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        console.log('Scheduled grant fetch started at:', new Date().toISOString());

        // Fonti ufficiali da monitorare
        const sources = [
            // Nazionali
            'https://www.incentivi.gov.it/it/incentivi',
            'https://www.invitalia.it/cosa-facciamo/creiamo-nuove-aziende',
            'https://www.mise.gov.it/it/incentivi',
            'https://www.simest.it/prodotti-e-servizi',
            'https://www.sace.it/soluzioni',
            // Europei
            'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/programmes',
            'https://www.horizon-europe.it/bandi',
            // Camere di Commercio
            'https://www.unioncamere.gov.it/bandi-e-finanziamenti',
            // Regioni - Nord
            'https://www.regione.lombardia.it/wps/portal/istituzionale/HP/servizi-e-informazioni/imprese/Imprese-incentivi-agevolazioni-contributi',
            'https://www.regione.veneto.it/web/economia-e-sviluppo-montano/contributi-e-finanziamenti',
            'https://imprese.regione.emilia-romagna.it/finanziamenti',
            'https://www.regione.piemonte.it/web/temi/fondi-progetti-europei/fondo-europeo-sviluppo-regionale-fesr/bandi-finanziamenti-imprese',
            'https://www.regione.liguria.it/homepage/economia/bandi-e-contributi.html',
            'https://www.regione.fvg.it/rafvg/cms/RAFVG/economia-imprese/imprese/',
            'https://www.provincia.tn.it/Servizi/Incentivi-e-finanziamenti-per-imprese',
            'https://www.provincia.bz.it/economia-finanze/economia/contributi-agevolazioni-imprese.asp',
            // Regioni - Centro
            'https://www.regione.toscana.it/bandi',
            'https://www.regione.lazio.it/cittadini/attivita-produttive-e-imprese',
            'https://www.regione.marche.it/Regione-Utile/Attivit%C3%A0-Produttive/Bandi-e-Contributi',
            'https://www.regione.umbria.it/imprese/incentivi-e-agevolazioni',
            'https://www.regione.abruzzo.it/content/bandi-imprese',
            // Regioni - Sud e Isole
            'https://www.regione.campania.it/regione/it/tematiche/bandi-gare-contratti',
            'https://www.regione.puglia.it/web/economia-e-sviluppo/-bandi',
            'https://www.regione.calabria.it/website/organizzazione/dipartimento6/bandi/',
            'https://pti.regione.sicilia.it/portal/page/portal/PIR_PORTALE/PIR_ArchivioLaRegioneInforma/PIR_BandiAvvisi',
            'https://www.regione.sardegna.it/argomenti/incentivi/',
            'https://www.regione.basilicata.it/giunta/site/giunta/department.jsp?dep=100066&area=109501',
            'https://www.regione.molise.it/web/bandi/',
            'https://www.regione.vda.it/economia/aiuti_stato/default_i.aspx'
        ];

        const allGrants = [];
        
        // Processa in batch paralleli di 5 siti alla volta per velocizzare
        const batchSize = 5;
        for (let i = 0; i < sources.length; i += batchSize) {
            const batch = sources.slice(i, i + batchSize);
            console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(sources.length/batchSize)}: ${batch.length} sources`);
            
            const batchPromises = batch.map(async (url) => {
                console.log(`Fetching from: ${url}`);
                try {
                    const response = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                    {
                        role: "system",
                        content: `Sei un sistema di estrazione dati strutturati da fonti pubbliche istituzionali.
                    Il tuo compito è estrarre bandi di finanziamento agevolato in modo rigoroso.

                    NON devi:
                    - inventare bandi
                    - completare dati mancanti
                    - fare supposizioni

                    DEVI:
                    - dichiarare ogni incertezza
                    - restituire solo informazioni esplicitamente presenti nella fonte
                    - rispondere SOLO con JSON valido`
                    },
                    {
                        role: "user",
                        content: `Analizza il sito ${url} ed estrai i bandi di finanziamento agevolato.

                    REGOLE DI ESTRAZIONE:
                    1. Estrai al massimo 10 bandi distinti.
                    2. Ogni bando deve avere almeno: titolo ufficiale, ente erogatore, stato (Aperto/In apertura/Chiuso).
                    3. Se una informazione NON è presente o NON è chiara, imposta il campo a null.
                    4. Se non sei sicuro che un elemento sia un bando, NON estrarlo.
                    5. NON dedurre deadline, importi o percentuali.

                    Per ogni bando estrai:
                    - title: Titolo ufficiale completo
                    - description: Descrizione breve (max 200 caratteri) o null
                    - ente_erogatore: UE/Stato/Regione/Altro
                    - livello: Europeo/Nazionale/Regionale
                    - grant_type: Digitalizzazione/Innovazione/Ricerca e Sviluppo/Energia/Sostenibilità/Internazionalizzazione/Altro
                    - funding_type: Contributo a fondo perduto/Finanziamento agevolato/Credito d'imposta/Misto
                    - coverage_percentage: numero 0-100 o null
                    - min_amount, max_amount: importi euro o null
                    - status: Aperto/In apertura/Chiuso
                    - deadline: YYYY-MM-DD o null
                    - eligible_company_sizes: ["Micro","Piccola","Media","Grande"] o null
                    - eligible_regions: array regioni o null (null se nazionale)
                    - website_url: URL DIRETTO alla pagina ufficiale o null
                    - confidence_level: "alto" (dati certi e verificabili), "medio" (alcuni dati incerti), "basso" (molte incertezze)
                    - extraction_notes: breve nota su eventuali incertezze o problemi

                    Se NON trovi bandi validi, restituisci: {"grants": []}
                    Altrimenti: {"grants": [...]}`
                    }
                    ],
                    max_tokens: 4096,
                    temperature: 0.2
                    });

                    const text = response.choices[0].message.content;
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        return parsed?.grants || [];
                    }
                    return [];
                } catch (err) {
                    console.error(`Error fetching ${url}:`, err.message);
                    return [];
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            for (const grants of batchResults) {
                allGrants.push(...grants);
            }
        }

        console.log(`Total grants extracted: ${allGrants.length}`);

        // Deduplica i bandi estratti PRIMA di salvare
        const uniqueGrants = deduplicateGrants(allGrants);
        console.log(`After deduplication: ${uniqueGrants.length} unique grants`);

        // Recupera solo bandi attivi con stesso ente per confronto (ottimizzazione)
        const allExistingGrants = await base44.asServiceRole.entities.FinancialGrant.list();
        const activeGrants = allExistingGrants.filter(g => g.status !== 'Chiuso');
        console.log(`Active grants for deduplication: ${activeGrants.length}`);

        let created = 0;
        let updated = 0;
        let skipped = 0;

        for (const grant of uniqueGrants) {
            if (!grant.title) continue;

            const grantData = {
                title: grant.title,
                description: grant.description || '',
                ente_erogatore: validateEnum(grant.ente_erogatore, ['UE', 'Stato', 'Regione', 'Altro'], 'Stato'),
                livello: validateEnum(grant.livello, ['Europeo', 'Nazionale', 'Regionale'], 'Nazionale'),
                grant_type: validateEnum(grant.grant_type, ['Digitalizzazione', 'Innovazione', 'Ricerca e Sviluppo', 'Energia/Sostenibilità', 'Internazionalizzazione', 'Altro'], 'Altro'),
                funding_type: validateEnum(grant.funding_type, ['Contributo a fondo perduto', 'Finanziamento agevolato', "Credito d'imposta", 'Misto'], 'Contributo a fondo perduto'),
                coverage_percentage: grant.coverage_percentage || null,
                min_amount: grant.min_amount || null,
                max_amount: grant.max_amount || null,
                status: validateEnum(grant.status, ['Aperto', 'In apertura', 'Chiuso'], 'Aperto'),
                opening_date: grant.opening_date || null,
                deadline: grant.deadline || null,
                eligible_company_sizes: grant.eligible_company_sizes || null,
                eligible_regions: grant.eligible_regions || null,
                access_mode: validateEnum(grant.access_mode, ['Sportello', 'Graduatoria'], 'Sportello'),
                requires_cofinancing: grant.requires_cofinancing || false,
                website_url: grant.website_url || null,
                is_archived: false,
                confidence_level: validateEnum(grant.confidence_level, ['alto', 'medio', 'basso'], 'medio'),
                extraction_notes: grant.extraction_notes || null
            };

            // Filtra bandi esistenti per stesso ente erogatore
            const candidatesForMatch = activeGrants.filter(g => g.ente_erogatore === grantData.ente_erogatore);
            
            // Esegui deduplicazione intelligente con LLM
            const dedupResult = await checkDuplicateWithLLM(grant, candidatesForMatch);
            console.log(`Dedup result for "${grant.title}": ${dedupResult.match_type} (${dedupResult.confidence_score}%)`);

            if (dedupResult.match_type === 'identico' && dedupResult.confidence_score >= 80) {
                // Bando identico trovato - aggiorna solo se deadline o status sono cambiati
                const matchedGrant = candidatesForMatch.find(g => g.id === dedupResult.matched_grant_id);
                if (matchedGrant) {
                    if (matchedGrant.status !== grantData.status || matchedGrant.deadline !== grantData.deadline) {
                        await base44.asServiceRole.entities.FinancialGrant.update(matchedGrant.id, {
                            status: grantData.status,
                            deadline: grantData.deadline,
                            last_modified_by_email: 'system@scheduled'
                        });
                        updated++;
                        console.log(`Updated existing grant: ${matchedGrant.title}`);
                    } else {
                        skipped++;
                        console.log(`Skipped identical grant: ${grant.title}`);
                    }
                } else {
                    skipped++;
                }
            } else {
                // Bando nuovo o simile - crea nuovo record
                grantData.created_by_email = 'system@scheduled';
                await base44.asServiceRole.entities.FinancialGrant.create(grantData);
                created++;
                console.log(`Created new grant: ${grant.title}`);
            }
        }

        const result = {
            success: true,
            extracted: allGrants.length,
            afterDedup: uniqueGrants.length,
            created,
            updated,
            skipped,
            timestamp: new Date().toISOString()
        };

        console.log('Scheduled fetch completed:', result);
        return Response.json(result);

    } catch (error) {
        console.error('Scheduled grant fetch error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

function validateEnum(value, allowed, defaultValue) {
    if (!value) return defaultValue;
    if (allowed.includes(value)) return value;
    
    // Prova matching parziale
    const valueLower = value.toLowerCase();
    for (const opt of allowed) {
        if (valueLower.includes(opt.toLowerCase()) || opt.toLowerCase().includes(valueLower)) {
            return opt;
        }
    }
    return defaultValue;
}

// Normalizza titolo per confronto
function normalizeTitle(title) {
    if (!title) return '';
    return title
        .toLowerCase()
        .replace(/[^a-z0-9àèéìòù]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Deduplica array di bandi estratti
function deduplicateGrants(grants) {
    const seen = new Map();
    
    for (const grant of grants) {
        if (!grant.title) continue;
        
        const key = normalizeTitle(grant.title);
        
        // Se già visto, tieni quello con più dati
        if (seen.has(key)) {
            const existing = seen.get(key);
            const existingScore = countFields(existing);
            const newScore = countFields(grant);
            if (newScore > existingScore) {
                seen.set(key, grant);
            }
        } else {
            seen.set(key, grant);
        }
    }
    
    return Array.from(seen.values());
}

// Conta campi compilati per determinare quale record è più completo
function countFields(obj) {
    let count = 0;
    for (const value of Object.values(obj)) {
        if (value !== null && value !== undefined && value !== '') {
            count++;
        }
    }
    return count;
}

// Deduplicazione intelligente con LLM
async function checkDuplicateWithLLM(newGrant, existingGrants) {
    // Se non ci sono bandi esistenti, è sicuramente nuovo
    if (!existingGrants || existingGrants.length === 0) {
        return { match_type: 'nuovo', matched_grant_id: null, confidence_score: 100, reasoning: 'Nessun bando esistente per confronto' };
    }

    // Prepara lista bandi esistenti per il prompt (max 20 per evitare token limit)
    const grantsForComparison = existingGrants.slice(0, 20).map(g => ({
        id: g.id,
        title: g.title,
        ente_erogatore: g.ente_erogatore,
        description: g.description?.substring(0, 100),
        deadline: g.deadline,
        status: g.status,
        grant_type: g.grant_type
    }));

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `Sei un sistema di confronto e deduplicazione di bandi di finanziamento.

Il tuo compito è stabilire se il nuovo bando è:
- lo stesso di uno esistente (identico)
- simile ma distinto
- completamente nuovo

REGOLE:
1. Confronta su: ente erogatore, obiettivo del bando, beneficiari, periodo temporale
2. Il titolo da solo NON è sufficiente
3. Se il livello di confidenza è < 80%, considera il bando come nuovo
4. NON eliminare nulla
5. NON fondere record

Rispondi SOLO con JSON valido.`
                },
                {
                    role: "user",
                    content: `NUOVO BANDO DA VERIFICARE:
${JSON.stringify({
    title: newGrant.title,
    ente_erogatore: newGrant.ente_erogatore,
    description: newGrant.description?.substring(0, 200),
    deadline: newGrant.deadline,
    grant_type: newGrant.grant_type
}, null, 2)}

BANDI ESISTENTI NEL DATABASE:
${JSON.stringify(grantsForComparison, null, 2)}

OUTPUT RICHIESTO (JSON):
{
  "match_type": "identico" | "simile" | "nuovo",
  "matched_grant_id": "string o null",
  "confidence_score": numero 0-100,
  "reasoning": "breve spiegazione"
}`
                }
            ],
            max_tokens: 500,
            temperature: 0.1
        });

        const text = response.choices[0].message.content;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            return {
                match_type: result.match_type || 'nuovo',
                matched_grant_id: result.matched_grant_id || null,
                confidence_score: result.confidence_score || 0,
                reasoning: result.reasoning || ''
            };
        }
    } catch (err) {
        console.error('LLM deduplication error:', err.message);
    }

    // In caso di errore, considera come nuovo (safe default)
    return { match_type: 'nuovo', matched_grant_id: null, confidence_score: 0, reasoning: 'Errore durante deduplicazione' };
}