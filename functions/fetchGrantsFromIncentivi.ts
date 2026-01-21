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
                        content: "Sei un esperto di bandi e finanziamenti per imprese italiane. Rispondi SOLO con JSON valido."
                    },
                    {
                        role: "user",
                        content: `Analizza il sito ${source.url} e estrai TUTTI i bandi e incentivi attualmente disponibili per le imprese italiane.

Per ogni bando trovato, estrai:
1. title: Titolo completo del bando
2. description: Descrizione dettagliata (cosa finanzia, obiettivi)
3. ente_erogatore: Chi eroga il finanziamento (UE, Stato, Regione, Altro)
4. livello: Europeo, Nazionale o Regionale
5. grant_type: Tipo (Digitalizzazione, Innovazione, Ricerca e Sviluppo, Energia/Sostenibilità, Internazionalizzazione, Altro)
6. funding_type: Forma agevolazione (Contributo a fondo perduto, Finanziamento agevolato, Credito d'imposta, Misto)
7. coverage_percentage: Percentuale copertura stimata (numero 0-100)
8. min_amount: Importo minimo in euro (solo numero)
9. max_amount: Importo massimo in euro (solo numero)
10. status: Stato (Aperto, In apertura, Chiuso)
11. opening_date: Data apertura formato YYYY-MM-DD (se disponibile)
12. deadline: Scadenza formato YYYY-MM-DD (se disponibile)
13. eligible_company_sizes: Array con dimensioni ammesse ["Micro", "Piccola", "Media", "Grande"]
14. eligible_regions: Array regioni ammesse (vuoto se nazionale)
15. access_mode: Sportello o Graduatoria
16. requires_cofinancing: true/false se richiede cofinanziamento

Estrai SOLO bandi reali e attuali. Non inventare dati. Se un campo non è disponibile, usa null.
Rispondi con: {"grants": [...]}`
                    }
                ],
                max_tokens: 4096,
                temperature: 0.3
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

    console.log(`Extracted ${allGrants.length} grants total`);

    // Recupera bandi esistenti per evitare duplicati
    const existingGrants = await base44.asServiceRole.entities.FinancialGrant.list();
    const existingTitles = new Set(existingGrants.map(g => g.title?.toLowerCase().trim()));

    let newGrantsCount = 0;
    let updatedGrantsCount = 0;

    for (const grant of allGrants) {
        if (!grant.title) continue;

        const titleLower = grant.title.toLowerCase().trim();
        
        // Controlla se esiste già
        const existing = existingGrants.find(g => 
            g.title?.toLowerCase().trim() === titleLower
        );

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
            eligible_company_sizes: enrichedGrant.eligible_company_sizes || ['Micro', 'Piccola', 'Media', 'Grande'],
            eligible_regions: enrichedGrant.eligible_regions || [],
            access_mode: enrichedGrant.access_mode || 'Sportello',
            requires_cofinancing: enrichedGrant.requires_cofinancing || false,
            website_url: enrichedGrant.website_url || null,
            is_archived: false,
            created_by_email: 'system@auto-import'
        };

        if (existing) {
            // Aggiorna solo se ci sono cambiamenti significativi (es. status, deadline)
            if (existing.status !== grantData.status || existing.deadline !== grantData.deadline) {
                await base44.asServiceRole.entities.FinancialGrant.update(existing.id, {
                    status: grantData.status,
                    deadline: grantData.deadline,
                    last_modified_by_email: 'system@auto-import'
                });
                updatedGrantsCount++;
            }
        } else {
            // Crea nuovo bando
            await base44.asServiceRole.entities.FinancialGrant.create(grantData);
            newGrantsCount++;
        }
    }

    const summary = {
        success: true,
        totalExtracted: allGrants.length,
        newGrants: newGrantsCount,
        updatedGrants: updatedGrantsCount,
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