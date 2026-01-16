import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
            // Usa InvokeLLM con contesto internet per estrarre i bandi
            const result = await base44.integrations.Core.InvokeLLM({
                prompt: `Analizza il sito ${source.url} e estrai TUTTI i bandi e incentivi attualmente disponibili per le imprese italiane.

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
Restituisci un array di oggetti JSON.`,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        grants: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    title: { type: "string" },
                                    description: { type: "string" },
                                    ente_erogatore: { type: "string", enum: ["UE", "Stato", "Regione", "Altro"] },
                                    livello: { type: "string", enum: ["Europeo", "Nazionale", "Regionale"] },
                                    grant_type: { type: "string" },
                                    funding_type: { type: "string" },
                                    coverage_percentage: { type: "number" },
                                    min_amount: { type: "number" },
                                    max_amount: { type: "number" },
                                    status: { type: "string", enum: ["Aperto", "In apertura", "Chiuso"] },
                                    opening_date: { type: "string" },
                                    deadline: { type: "string" },
                                    eligible_company_sizes: { type: "array", items: { type: "string" } },
                                    eligible_regions: { type: "array", items: { type: "string" } },
                                    access_mode: { type: "string" },
                                    requires_cofinancing: { type: "boolean" }
                                }
                            }
                        }
                    }
                }
            });

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

        const grantData = {
            title: grant.title,
            description: grant.description || '',
            ente_erogatore: grant.ente_erogatore || 'Stato',
            livello: grant.livello || 'Nazionale',
            grant_type: mapGrantType(grant.grant_type),
            funding_type: mapFundingType(grant.funding_type),
            coverage_percentage: grant.coverage_percentage || null,
            min_amount: grant.min_amount || null,
            max_amount: grant.max_amount || null,
            status: grant.status || 'Aperto',
            opening_date: grant.opening_date || null,
            deadline: grant.deadline || null,
            eligible_company_sizes: grant.eligible_company_sizes || ['Micro', 'Piccola', 'Media', 'Grande'],
            eligible_regions: grant.eligible_regions || [],
            access_mode: grant.access_mode || 'Sportello',
            requires_cofinancing: grant.requires_cofinancing || false,
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