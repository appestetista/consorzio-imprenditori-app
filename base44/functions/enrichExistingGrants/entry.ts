import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const allGrants = await base44.asServiceRole.entities.FinancialGrant.filter({ is_archived: false }, '-created_date', 200);
        
        // Filtra bandi senza importo, copertura O senza website_url
        const grantsToEnrich = allGrants.filter(g => 
            (!g.min_amount && !g.max_amount) || !g.coverage_percentage || !g.website_url
        );

        const MAX_TO_ENRICH = 20;
        const totalToEnrich = grantsToEnrich.length;
        const wasTruncated = totalToEnrich > MAX_TO_ENRICH;
        if (wasTruncated) {
            grantsToEnrich.splice(MAX_TO_ENRICH);
        }

        console.log(`Found ${totalToEnrich} grants to enrich, processing ${grantsToEnrich.length}`);

        let enriched = 0;
        let notFound = 0;
        const results = [];

        for (const grant of grantsToEnrich) {
            console.log(`Searching data for: ${grant.title}`);
            
            try {
                const searchResult = await base44.integrations.Core.InvokeLLM({
                    prompt: `RICERCA DATI UFFICIALI per il bando italiano: "${grant.title}"

ISTRUZIONI CRITICHE:
1. Cerca SOLO su fonti ufficiali italiane (siti .gov.it, regioni, camere di commercio, invitalia, simest, incentivi.gov.it)
2. Trova i seguenti dati SOLO SE PRESENTI nelle fonti ufficiali:
   - Importo minimo finanziabile (numero in euro)
   - Importo massimo finanziabile (numero in euro)
   - Percentuale di copertura/contributo a fondo perduto (numero 0-100)
   - URL della pagina ufficiale del bando

REGOLE FONDAMENTALI:
- Se NON trovi un dato con CERTEZZA ASSOLUTA da fonte ufficiale, restituisci null
- NON INVENTARE MAI dati
- NON STIMARE o APPROSSIMARE
- Se trovi range generici tipo "fino a 50%" ma non il dato esatto per questo bando, usa null
- Indica la fonte esatta dove hai trovato i dati

Restituisci SOLO dati che puoi citare con fonte precisa.`,
                    add_context_from_internet: true,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            min_amount: { type: "number", description: "Importo minimo in euro, null se non trovato" },
                            max_amount: { type: "number", description: "Importo massimo in euro, null se non trovato" },
                            coverage_percentage: { type: "number", description: "Percentuale copertura 0-100, null se non trovato" },
                            website_url: { type: "string", description: "URL fonte ufficiale" },
                            source_name: { type: "string", description: "Nome della fonte ufficiale" },
                            data_found: { type: "boolean", description: "true solo se hai trovato almeno un dato verificato" },
                            confidence: { type: "string", enum: ["verified", "uncertain", "not_found"], description: "Livello di certezza dei dati" }
                        }
                    }
                });

                // Aggiorna SOLO se i dati sono verificati con certezza
                if (searchResult?.data_found && searchResult?.confidence === "verified") {
                    const updateData = {};
                    let hasUpdates = false;

                    if (searchResult.min_amount && !grant.min_amount) {
                        updateData.min_amount = searchResult.min_amount;
                        hasUpdates = true;
                    }
                    if (searchResult.max_amount && !grant.max_amount) {
                        updateData.max_amount = searchResult.max_amount;
                        hasUpdates = true;
                    }
                    if (searchResult.coverage_percentage && !grant.coverage_percentage) {
                        updateData.coverage_percentage = searchResult.coverage_percentage;
                        hasUpdates = true;
                    }
                    if (searchResult.website_url && !grant.website_url) {
                        updateData.website_url = searchResult.website_url;
                        hasUpdates = true;
                    }

                    if (hasUpdates) {
                        await base44.asServiceRole.entities.FinancialGrant.update(grant.id, updateData);
                        enriched++;
                        results.push({
                            title: grant.title,
                            status: 'enriched',
                            source: searchResult.source_name,
                            data: updateData
                        });
                        console.log(`✓ Enriched: ${grant.title} from ${searchResult.source_name}`);
                    } else {
                        notFound++;
                        results.push({ title: grant.title, status: 'no_new_data' });
                    }
                } else {
                    notFound++;
                    results.push({ 
                        title: grant.title, 
                        status: 'not_verified',
                        reason: searchResult?.confidence || 'no_data'
                    });
                    console.log(`✗ No verified data for: ${grant.title}`);
                }

                // Pausa per evitare rate limiting
                await new Promise(resolve => setTimeout(resolve, 800));

            } catch (err) {
                console.error(`Error enriching ${grant.title}:`, err.message);
                results.push({ title: grant.title, status: 'error', error: err.message });
            }
        }

        const response = {
            success: true,
            total_to_enrich: totalToEnrich,
            total_processed: grantsToEnrich.length,
            enriched: enriched,
            not_found: notFound,
            results: results
        };
        if (wasTruncated) {
            response.note = 'Processati i primi 20 bandi. Riesegui per i successivi.';
        }
        return Response.json(response);

    } catch (error) {
        console.error('Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});