import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Questa function viene chiamata dall'automazione schedulata
// Non richiede autenticazione utente perché è un task di sistema

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        console.log('Scheduled grant fetch started at:', new Date().toISOString());

        // Fonti da monitorare
        const sources = [
            'https://www.incentivi.gov.it/it/incentivi',
            'https://www.invitalia.it/cosa-facciamo/creiamo-nuove-aziende'
        ];

        const allGrants = [];

        for (const url of sources) {
            console.log(`Fetching from: ${url}`);
            
            try {
                const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
                    prompt: `Analizza il sito ${url} e estrai TUTTI i bandi e incentivi attualmente disponibili per le imprese italiane.

Per ogni bando trovato, estrai:
- title: Titolo completo
- description: Descrizione dettagliata
- ente_erogatore: UE, Stato, Regione o Altro
- livello: Europeo, Nazionale o Regionale
- grant_type: Digitalizzazione, Innovazione, Ricerca e Sviluppo, Energia/Sostenibilità, Internazionalizzazione o Altro
- funding_type: Contributo a fondo perduto, Finanziamento agevolato, Credito d'imposta o Misto
- coverage_percentage: Percentuale copertura (0-100)
- min_amount: Importo minimo euro
- max_amount: Importo massimo euro
- status: Aperto, In apertura o Chiuso
- opening_date: Data apertura YYYY-MM-DD
- deadline: Scadenza YYYY-MM-DD
- eligible_company_sizes: Array ["Micro", "Piccola", "Media", "Grande"]
- eligible_regions: Array regioni (vuoto se nazionale)
- access_mode: Sportello o Graduatoria
- requires_cofinancing: true/false

Estrai SOLO bandi reali. Se un dato non è disponibile, usa null.`,
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
                                        ente_erogatore: { type: "string" },
                                        livello: { type: "string" },
                                        grant_type: { type: "string" },
                                        funding_type: { type: "string" },
                                        coverage_percentage: { type: "number" },
                                        min_amount: { type: "number" },
                                        max_amount: { type: "number" },
                                        status: { type: "string" },
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

                if (result?.grants) {
                    allGrants.push(...result.grants);
                }
            } catch (err) {
                console.error(`Error fetching ${url}:`, err.message);
            }
        }

        console.log(`Total grants extracted: ${allGrants.length}`);

        // Salva i bandi
        const existingGrants = await base44.asServiceRole.entities.FinancialGrant.list();
        const existingTitles = new Map(existingGrants.map(g => [g.title?.toLowerCase().trim(), g]));

        let created = 0;
        let updated = 0;

        for (const grant of allGrants) {
            if (!grant.title) continue;

            const titleKey = grant.title.toLowerCase().trim();
            const existing = existingTitles.get(titleKey);

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
                eligible_company_sizes: grant.eligible_company_sizes || ['Micro', 'Piccola', 'Media', 'Grande'],
                eligible_regions: grant.eligible_regions || [],
                access_mode: validateEnum(grant.access_mode, ['Sportello', 'Graduatoria'], 'Sportello'),
                requires_cofinancing: grant.requires_cofinancing || false,
                is_archived: false
            };

            if (existing) {
                // Aggiorna se status o deadline sono cambiati
                if (existing.status !== grantData.status || existing.deadline !== grantData.deadline) {
                    await base44.asServiceRole.entities.FinancialGrant.update(existing.id, {
                        status: grantData.status,
                        deadline: grantData.deadline,
                        description: grantData.description,
                        last_modified_by_email: 'system@scheduled'
                    });
                    updated++;
                }
            } else {
                grantData.created_by_email = 'system@scheduled';
                await base44.asServiceRole.entities.FinancialGrant.create(grantData);
                created++;
            }
        }

        const result = {
            success: true,
            extracted: allGrants.length,
            created,
            updated,
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