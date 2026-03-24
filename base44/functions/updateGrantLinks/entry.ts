import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const allGrants = await base44.asServiceRole.entities.FinancialGrant.list();
        
        // Filtra bandi senza website_url
        const grantsToUpdate = allGrants.filter(g => !g.website_url);

        console.log(`Found ${grantsToUpdate.length} grants without website_url`);

        let updated = 0;
        let notFound = 0;
        const results = [];

        for (const grant of grantsToUpdate) {
            console.log(`Searching link for: ${grant.title}`);
            
            try {
                const searchResult = await base44.integrations.Core.InvokeLLM({
                    prompt: `TROVA IL LINK UFFICIALE per il bando italiano: "${grant.title}"

ISTRUZIONI:
1. Cerca su siti ufficiali italiani (.gov.it, regioni, invitalia, simest, incentivi.gov.it, camere di commercio)
2. Trova l'URL DIRETTO alla pagina del bando

REGOLE:
- Restituisci SOLO l'URL della pagina ufficiale del bando
- Se non trovi il link esatto, usa null
- NON inventare URL

Restituisci il link ufficiale al bando.`,
                    add_context_from_internet: true,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            website_url: { type: "string", description: "URL pagina ufficiale del bando" },
                            found: { type: "boolean", description: "true se trovato" }
                        }
                    }
                });

                if (searchResult?.found && searchResult?.website_url) {
                    await base44.asServiceRole.entities.FinancialGrant.update(grant.id, {
                        website_url: searchResult.website_url
                    });
                    updated++;
                    results.push({
                        title: grant.title,
                        status: 'updated',
                        url: searchResult.website_url
                    });
                    console.log(`✓ Updated: ${grant.title} -> ${searchResult.website_url}`);
                } else {
                    notFound++;
                    results.push({ title: grant.title, status: 'not_found' });
                    console.log(`✗ No link for: ${grant.title}`);
                }

                // Pausa per evitare rate limiting
                await new Promise(resolve => setTimeout(resolve, 1500));

            } catch (err) {
                console.error(`Error for ${grant.title}:`, err.message);
                results.push({ title: grant.title, status: 'error', error: err.message });
            }
        }

        return Response.json({
            success: true,
            total: grantsToUpdate.length,
            updated,
            not_found: notFound,
            results
        });

    } catch (error) {
        console.error('Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});