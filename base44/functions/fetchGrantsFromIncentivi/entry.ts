import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import OpenAI from 'npm:openai';

const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Solo admin può eseguire manualmente
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        return await fetchAndSaveGrants(base44);
    } catch (error) {
        console.error('Error in fetchGrantsFromIncentivi:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

async function fetchAndSaveGrants(base44) {
    const MAX_GRANTS_PER_RUN = 5;
    console.log('Starting grant extraction from Incentivi.gov.it...');

    // Fonti da monitorare
    const sources = [
        {
            name: 'Incentivi.gov.it - Imprese',
            url: 'https://www.incentivi.gov.it/it/incentivi',
            category: 'Nazionale'
        },
        {
            name: 'Invitalia - Agevolazioni',
            url: 'https://www.invitalia.it/cosa-facciamo/creiamo-nuove-aziende',
            category: 'Nazionale'
        }
    ];

    const allGrants = [];

    for (const source of sources) {
        console.log(`Extracting from: ${source.name}`);
        
        try {
            // Usa OpenAI direttamente
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
                        content: `Analizza il sito ${source.url} ed estrai i bandi di finanziamento agevolato.

REGOLE DI ESTRAZIONE:
1. Estrai al massimo 10 bandi distinti.
2. Ogni bando deve avere almeno: titolo ufficiale, ente erogatore, stato (Aperto/In apertura/Chiuso).
3. Se una informazione NON è presente o NON è chiara, imposta il campo a null.
4. Se non sei sicuro che un elemento sia un bando, NON estrarlo.
5. NON dedurre deadline, importi o percentuali.

Per ogni bando estrai:
- title: Titolo ufficiale completo
- description: Descrizione dettagliata (cosa finanzia, obiettivi) o null
- ente_erogatore: UE/Stato/Regione/Altro
- livello: Europeo/Nazionale/Regionale
- grant_type: Digitalizzazione/Innovazione/Ricerca e Sviluppo/Energia/Sostenibilità/Internazionalizzazione/Altro
- funding_type: Contributo a fondo perduto/Finanziamento agevolato/Credito d'imposta/Misto
- coverage_percentage: numero 0-100 o null
- min_amount, max_amount: importi euro o null
- status: Aperto/In apertura/Chiuso
- opening_date: YYYY-MM-DD o null
- deadline: YYYY-MM-DD o null
- eligible_company_sizes: ["Micro","Piccola","Media","Grande"] o null
- eligible_regions: array regioni o null (null se nazionale)
- access_mode: Sportello/Graduatoria o null
- requires_cofinancing: true/false o null
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
            const result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

            if (result?.grants && Array.isArray(result.grants)) {
                allGrants.push(...result.grants.map(g => ({
                    ...g,
                    source: source.name,
                    livello: g.livello || source.category
                })));
            }
        } catch (sourceError) {
            console.error(`Error extracting from ${source.name}:`, sourceError.message);
        }
    }

    const totalExtractedBeforeTruncation = allGrants.length;
    const wasTruncated = totalExtractedBeforeTruncation > MAX_GRANTS_PER_RUN;
    if (wasTruncated) {
        allGrants.splice(MAX_GRANTS_PER_RUN);
    }
    console.log(`Extracted ${totalExtractedBeforeTruncation} grants total, processing ${allGrants.length}`);

    // Recupera solo bandi attivi per deduplicazione (ottimizzazione)
    const allExistingGrants = await base44.asServiceRole.entities.FinancialGrant.list();
    const activeGrants = allExistingGrants.filter(g => g.status !== 'Chiuso');
    console.log(`Active grants for deduplication: ${activeGrants.length}`);

    let newGrantsCount = 0;
    let updatedGrantsCount = 0;
    let skippedCount = 0;

    for (const grant of allGrants) {
        if (!grant.title) continue;

        await new Promise(r => setTimeout(r, 500));

        // Se mancano dati importanti (importo, copertura), cerca su altre fonti
        let enrichedGrant = { ...grant };
        if (!grant.min_amount && !grant.max_amount && !grant.coverage_percentage) {
            console.log(`Enriching data for: ${grant.title}`);
            try {
                const enrichResponse = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content: "Sei un esperto di bandi italiani. Rispondi SOLO con JSON valido. NON INVENTARE dati."
                        },
                        {
                            role: "user",
                            content: `Cerca informazioni dettagliate sul bando/incentivo italiano: "${grant.title}"

Trova:
1. min_amount: Importo minimo finanziabile (euro, solo numero)
2. max_amount: Importo massimo finanziabile (euro, solo numero)  
3. coverage_percentage: Percentuale di copertura (0-100)
4. requires_cofinancing: true/false
5. website_url: URL del bando ufficiale
6. source_verified: true se dati verificati, false se incerti

Rispondi con JSON: {"min_amount": null, "max_amount": null, "coverage_percentage": null, "requires_cofinancing": false, "website_url": null, "source_verified": false}`
                        }
                    ],
                    max_tokens: 500,
                    temperature: 0.2
                });

                const enrichText = enrichResponse.choices[0].message.content;
                const enrichMatch = enrichText.match(/\{[\s\S]*\}/);
                const enrichResult = enrichMatch ? JSON.parse(enrichMatch[0]) : null;

                if (enrichResult?.source_verified) {
                    enrichedGrant.min_amount = enrichResult.min_amount || grant.min_amount;
                    enrichedGrant.max_amount = enrichResult.max_amount || grant.max_amount;
                    enrichedGrant.coverage_percentage = enrichResult.coverage_percentage || grant.coverage_percentage;
                    enrichedGrant.requires_cofinancing = enrichResult.requires_cofinancing ?? grant.requires_cofinancing;
                    enrichedGrant.website_url = enrichResult.website_url || grant.website_url;
                    console.log(`Enriched ${grant.title} with verified data`);
                }
            } catch (enrichError) {
                console.error(`Error enriching ${grant.title}:`, enrichError.message);
            }
        }

        const grantData = {
            title: enrichedGrant.title,
            description: enrichedGrant.description || '',
            ente_erogatore: enrichedGrant.ente_erogatore || 'Stato',
            livello: enrichedGrant.livello || 'Nazionale',
            grant_type: mapGrantType(enrichedGrant.grant_type),
            funding_type: mapFundingType(enrichedGrant.funding_type),
            coverage_percentage: enrichedGrant.coverage_percentage || null,
            min_amount: enrichedGrant.min_amount || null,
            max_amount: enrichedGrant.max_amount || null,
            status: enrichedGrant.status || 'Aperto',
            opening_date: enrichedGrant.opening_date || null,
            deadline: enrichedGrant.deadline || null,
            eligible_company_sizes: enrichedGrant.eligible_company_sizes || null,
            eligible_regions: enrichedGrant.eligible_regions || null,
            access_mode: enrichedGrant.access_mode || 'Sportello',
            requires_cofinancing: enrichedGrant.requires_cofinancing || false,
            website_url: enrichedGrant.website_url || null,
            is_archived: false,
            created_by_email: 'system@auto-import',
            confidence_level: enrichedGrant.confidence_level || 'medio',
            extraction_notes: enrichedGrant.extraction_notes || null
        };

        // Filtra bandi esistenti per stesso ente erogatore
        const candidatesForMatch = activeGrants.filter(g => g.ente_erogatore === grantData.ente_erogatore);
        
        // Esegui deduplicazione intelligente con LLM
        const dedupResult = await checkDuplicateWithLLM(enrichedGrant, candidatesForMatch);
        console.log(`Dedup result for "${grant.title}": ${dedupResult.match_type} (${dedupResult.confidence_score}%)`);

        if (dedupResult.match_type === 'identico' && dedupResult.confidence_score >= 80) {
            // Bando identico trovato - aggiorna solo se deadline o status sono cambiati
            const matchedGrant = candidatesForMatch.find(g => g.id === dedupResult.matched_grant_id);
            if (matchedGrant) {
                if (matchedGrant.status !== grantData.status || matchedGrant.deadline !== grantData.deadline) {
                    await base44.asServiceRole.entities.FinancialGrant.update(matchedGrant.id, {
                        status: grantData.status,
                        deadline: grantData.deadline,
                        last_modified_by_email: 'system@auto-import'
                    });
                    updatedGrantsCount++;
                    console.log(`Updated existing grant: ${matchedGrant.title}`);
                } else {
                    skippedCount++;
                    console.log(`Skipped identical grant: ${grant.title}`);
                }
            } else {
                skippedCount++;
            }
        } else {
            // Bando nuovo o simile - crea nuovo record
            await base44.asServiceRole.entities.FinancialGrant.create(grantData);
            newGrantsCount++;
            console.log(`Created new grant: ${grant.title}`);
        }
    }

    const summary = {
        success: true,
        totalExtracted: totalExtractedBeforeTruncation,
        totalProcessed: allGrants.length,
        newGrants: newGrantsCount,
        updatedGrants: updatedGrantsCount,
        skipped: skippedCount,
        was_truncated: wasTruncated,
        timestamp: new Date().toISOString()
    };

    console.log('Grant import completed:', summary);

    return Response.json(summary);
}

function mapGrantType(type) {
    const mapping = {
        'digitalizzazione': 'Digitalizzazione',
        'innovazione': 'Innovazione',
        'ricerca': 'Ricerca e Sviluppo',
        'r&d': 'Ricerca e Sviluppo',
        'energia': 'Energia/Sostenibilità',
        'sostenibilità': 'Energia/Sostenibilità',
        'green': 'Energia/Sostenibilità',
        'internazionalizzazione': 'Internazionalizzazione',
        'export': 'Internazionalizzazione'
    };
    
    if (!type) return 'Altro';
    const typeLower = type.toLowerCase();
    
    for (const [key, value] of Object.entries(mapping)) {
        if (typeLower.includes(key)) return value;
    }
    
    return type || 'Altro';
}

function mapFundingType(type) {
    if (!type) return 'Contributo a fondo perduto';
    
    const typeLower = type.toLowerCase();
    if (typeLower.includes('fondo perduto')) return 'Contributo a fondo perduto';
    if (typeLower.includes('agevolato')) return 'Finanziamento agevolato';
    if (typeLower.includes('credito') || typeLower.includes('imposta')) return "Credito d'imposta";
    if (typeLower.includes('misto')) return 'Misto';
    
    return 'Contributo a fondo perduto';
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