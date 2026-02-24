import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Questa function viene chiamata dall'automazione schedulata settimanale
// Usa ricerca web reale (add_context_from_internet) per trovare bandi verificati

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        console.log(`[GrantFetch] Started at ${today}`);

        // =============================================
        // FASE 1: Pulizia bandi scaduti
        // =============================================
        const allExisting = await base44.asServiceRole.entities.FinancialGrant.list();
        let archivedCount = 0;

        for (const grant of allExisting) {
            if (grant.deadline && grant.deadline < today) {
                await base44.asServiceRole.entities.FinancialGrant.update(grant.id, {
                    status: 'Chiuso',
                    is_archived: true
                });
                archivedCount++;
            }
        }
        console.log(`[GrantFetch] Archived ${archivedCount} expired grants`);

        // Bandi attivi rimasti (per deduplicazione)
        const activeGrants = allExisting.filter(g => 
            !g.is_archived && g.status !== 'Chiuso' && (!g.deadline || g.deadline >= today)
        );
        const activeTitlesNormalized = activeGrants.map(g => normalizeTitle(g.title));

        // =============================================
        // FASE 2: Ricerca nuovi bandi con web search reale
        // =============================================
        const searchQueries = [
            // Nazionali
            {
                query: `Cerca su incentivi.gov.it, invitalia.it e mise.gov.it tutti i bandi di finanziamento agevolato per imprese attualmente APERTI in Italia nel 2026. Per ogni bando trovato fornisci: titolo ufficiale esatto, ente erogatore, data scadenza (YYYY-MM-DD), importo minimo e massimo finanziabile in euro, percentuale di copertura, tipologia (fondo perduto/finanziamento agevolato/credito d'imposta/misto), dimensioni aziendali ammesse, link diretto alla pagina ufficiale del bando. INCLUDI SOLO bandi con scadenza successiva al ${today} o senza scadenza indicata. NON inventare nessun dato.`,
                livello: 'Nazionale',
                ente_default: 'Stato'
            },
            // SIMEST / Internazionalizzazione
            {
                query: `Cerca su simest.it e sace.it tutti i finanziamenti agevolati per internazionalizzazione ed export delle PMI italiane attualmente APERTI nel 2026. Per ogni bando: titolo ufficiale esatto, scadenza (YYYY-MM-DD), importi min/max in euro, percentuale copertura, link pagina ufficiale. SOLO bandi con scadenza dopo il ${today} o senza scadenza. NON inventare dati.`,
                livello: 'Nazionale',
                ente_default: 'Stato'
            },
            // Europei
            {
                query: `Cerca bandi europei aperti nel 2026 per PMI italiane su ec.europa.eu e horizon-europe.it. Per ogni bando: titolo ufficiale, scadenza (YYYY-MM-DD), importi, percentuale copertura, link ufficiale. SOLO bandi con deadline dopo ${today}. NON inventare.`,
                livello: 'Europeo',
                ente_default: 'UE'
            },
            // Regioni Nord
            {
                query: `Cerca bandi regionali aperti nel 2026 per imprese in Lombardia, Veneto, Emilia-Romagna, Piemonte, Liguria, Friuli Venezia Giulia, Trentino-Alto Adige, Valle d'Aosta. Per ogni bando: titolo ufficiale, regione, scadenza (YYYY-MM-DD), importi min/max euro, percentuale copertura, link ufficiale. SOLO bandi con scadenza dopo ${today}. NON inventare.`,
                livello: 'Regionale',
                ente_default: 'Regione'
            },
            // Regioni Centro
            {
                query: `Cerca bandi regionali aperti nel 2026 per imprese in Toscana, Lazio, Marche, Umbria, Abruzzo. Per ogni bando: titolo ufficiale, regione, scadenza (YYYY-MM-DD), importi min/max euro, percentuale copertura, link ufficiale. SOLO bandi con scadenza dopo ${today}. NON inventare.`,
                livello: 'Regionale',
                ente_default: 'Regione'
            },
            // Regioni Sud e Isole
            {
                query: `Cerca bandi regionali aperti nel 2026 per imprese in Campania, Puglia, Calabria, Sicilia, Sardegna, Basilicata, Molise. Per ogni bando: titolo ufficiale, regione, scadenza (YYYY-MM-DD), importi min/max euro, percentuale copertura, link ufficiale. SOLO bandi con scadenza dopo ${today}. NON inventare.`,
                livello: 'Regionale',
                ente_default: 'Regione'
            }
        ];

        const jsonSchema = {
            type: "object",
            properties: {
                grants: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            title: { type: "string", description: "Titolo ufficiale esatto del bando" },
                            description: { type: "string", description: "Descrizione breve (max 300 char)" },
                            ente_erogatore: { type: "string", enum: ["UE", "Stato", "Regione", "Altro"] },
                            livello: { type: "string", enum: ["Europeo", "Nazionale", "Regionale"] },
                            grant_type: { type: "string", enum: ["Digitalizzazione", "Innovazione", "Ricerca e Sviluppo", "Energia/Sostenibilità", "Internazionalizzazione", "Altro"] },
                            funding_type: { type: "string", enum: ["Contributo a fondo perduto", "Finanziamento agevolato", "Credito d'imposta", "Misto"] },
                            coverage_percentage: { type: "number", description: "Percentuale copertura 0-100 o null" },
                            min_amount: { type: "number", description: "Importo minimo euro o null" },
                            max_amount: { type: "number", description: "Importo massimo euro o null" },
                            status: { type: "string", enum: ["Aperto", "In apertura"] },
                            opening_date: { type: "string", description: "YYYY-MM-DD o null" },
                            deadline: { type: "string", description: "YYYY-MM-DD o null" },
                            access_mode: { type: "string", enum: ["Sportello", "Graduatoria"] },
                            requires_cofinancing: { type: "boolean" },
                            eligible_company_sizes: { type: "array", items: { type: "string", enum: ["Micro", "Piccola", "Media", "Grande"] } },
                            eligible_regions: { type: "array", items: { type: "string" }, description: "Regioni ammesse, vuoto se nazionale" },
                            website_url: { type: "string", description: "URL diretto pagina ufficiale del bando" },
                            confidence_level: { type: "string", enum: ["alto", "medio", "basso"] },
                            extraction_notes: { type: "string", description: "Note su incertezze o fonte dei dati" }
                        }
                    }
                }
            }
        };

        const allNewGrants = [];

        // Esegui ricerche in sequenza (per evitare rate limiting)
        for (let i = 0; i < searchQueries.length; i++) {
            const sq = searchQueries[i];
            console.log(`[GrantFetch] Query ${i + 1}/${searchQueries.length}: ${sq.livello}`);

            try {
                const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
                    prompt: sq.query + `\n\nIMPORTANTE: Restituisci SOLO bandi che hai EFFETTIVAMENTE trovato online con fonte verificabile. Per ogni bando indica il confidence_level: "alto" se hai trovato la pagina ufficiale con tutti i dati, "medio" se hai trovato info parziali, "basso" se sei incerto. Se non trovi bandi reali, restituisci {"grants": []}.`,
                    add_context_from_internet: true,
                    response_json_schema: jsonSchema
                });

                if (result?.grants && Array.isArray(result.grants)) {
                    for (const g of result.grants) {
                        // Applica defaults dal gruppo di ricerca
                        g.livello = g.livello || sq.livello;
                        g.ente_erogatore = g.ente_erogatore || sq.ente_default;
                        allNewGrants.push(g);
                    }
                    console.log(`[GrantFetch] Found ${result.grants.length} grants from query ${i + 1}`);
                }
            } catch (err) {
                console.error(`[GrantFetch] Error in query ${i + 1}:`, err.message);
            }

            // Pausa tra ricerche
            await new Promise(r => setTimeout(r, 3000));
        }

        console.log(`[GrantFetch] Total raw grants: ${allNewGrants.length}`);

        // =============================================
        // FASE 3: Filtra, deduplica, salva
        // =============================================
        let created = 0;
        let skippedExpired = 0;
        let skippedDuplicate = 0;
        let skippedNoTitle = 0;

        for (const grant of allNewGrants) {
            // Skip senza titolo
            if (!grant.title || grant.title.trim().length < 5) {
                skippedNoTitle++;
                continue;
            }

            // Skip bandi con deadline passata
            if (grant.deadline && grant.deadline < today) {
                skippedExpired++;
                continue;
            }

            // Skip bandi con confidence basso
            if (grant.confidence_level === 'basso') {
                console.log(`[GrantFetch] Skipped low confidence: ${grant.title}`);
                continue;
            }

            // Deduplica: confronta titolo normalizzato con bandi attivi
            const normTitle = normalizeTitle(grant.title);
            const isDuplicate = activeTitlesNormalized.some(existing => {
                // Match esatto
                if (existing === normTitle) return true;
                // Match parziale (>80% sovrapposizione parole)
                const wordsNew = normTitle.split(' ').filter(w => w.length > 2);
                const wordsExisting = existing.split(' ').filter(w => w.length > 2);
                if (wordsNew.length === 0 || wordsExisting.length === 0) return false;
                const common = wordsNew.filter(w => wordsExisting.includes(w));
                const overlap = common.length / Math.max(wordsNew.length, wordsExisting.length);
                return overlap > 0.75;
            });

            if (isDuplicate) {
                skippedDuplicate++;
                continue;
            }

            // Crea il bando
            const grantData = {
                title: grant.title.trim(),
                description: grant.description || '',
                ente_erogatore: validateEnum(grant.ente_erogatore, ['UE', 'Stato', 'Regione', 'Altro'], 'Stato'),
                livello: validateEnum(grant.livello, ['Europeo', 'Nazionale', 'Regionale'], 'Nazionale'),
                grant_type: validateEnum(grant.grant_type, ['Digitalizzazione', 'Innovazione', 'Ricerca e Sviluppo', 'Energia/Sostenibilità', 'Internazionalizzazione', 'Altro'], 'Altro'),
                funding_type: validateEnum(grant.funding_type, ['Contributo a fondo perduto', 'Finanziamento agevolato', "Credito d'imposta", 'Misto'], 'Contributo a fondo perduto'),
                coverage_percentage: (typeof grant.coverage_percentage === 'number' && grant.coverage_percentage > 0 && grant.coverage_percentage <= 100) ? grant.coverage_percentage : null,
                min_amount: (typeof grant.min_amount === 'number' && grant.min_amount > 0) ? grant.min_amount : null,
                max_amount: (typeof grant.max_amount === 'number' && grant.max_amount > 0) ? grant.max_amount : null,
                status: validateEnum(grant.status, ['Aperto', 'In apertura'], 'Aperto'),
                opening_date: isValidDate(grant.opening_date) ? grant.opening_date : null,
                deadline: isValidDate(grant.deadline) ? grant.deadline : null,
                access_mode: validateEnum(grant.access_mode, ['Sportello', 'Graduatoria'], 'Sportello'),
                requires_cofinancing: grant.requires_cofinancing === true,
                eligible_company_sizes: Array.isArray(grant.eligible_company_sizes) ? grant.eligible_company_sizes : null,
                eligible_regions: Array.isArray(grant.eligible_regions) && grant.eligible_regions.length > 0 ? grant.eligible_regions : null,
                website_url: grant.website_url || null,
                is_archived: false,
                is_national: grant.livello !== 'Regionale',
                confidence_level: validateEnum(grant.confidence_level, ['alto', 'medio', 'basso'], 'medio'),
                extraction_notes: grant.extraction_notes || null,
                created_by_email: 'system@scheduled',
                tags: extractTags(grant.title, grant.description)
            };

            try {
                await base44.asServiceRole.entities.FinancialGrant.create(grantData);
                created++;
                // Aggiungi il titolo normalizzato per evitare duplicati nello stesso batch
                activeTitlesNormalized.push(normTitle);
                console.log(`[GrantFetch] Created: ${grant.title}`);
            } catch (createErr) {
                console.error(`[GrantFetch] Error creating "${grant.title}":`, createErr.message);
            }
        }

        const result = {
            success: true,
            date: today,
            archived_expired: archivedCount,
            total_extracted: allNewGrants.length,
            created,
            skipped_expired: skippedExpired,
            skipped_duplicate: skippedDuplicate,
            skipped_no_title: skippedNoTitle,
            active_grants_total: activeGrants.length + created
        };

        console.log('[GrantFetch] Completed:', JSON.stringify(result));
        return Response.json(result);

    } catch (error) {
        console.error('[GrantFetch] Fatal error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

// === UTILITY FUNCTIONS ===

function normalizeTitle(title) {
    if (!title) return '';
    return title
        .toLowerCase()
        .replace(/[^a-z0-9àèéìòùç]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function validateEnum(value, allowed, defaultValue) {
    if (!value) return defaultValue;
    if (allowed.includes(value)) return value;
    const valueLower = value.toLowerCase();
    for (const opt of allowed) {
        if (valueLower.includes(opt.toLowerCase()) || opt.toLowerCase().includes(valueLower)) {
            return opt;
        }
    }
    return defaultValue;
}

function isValidDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return false;
    const match = dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
    if (!match) return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime());
}

function extractTags(title, description) {
    const text = `${title || ''} ${description || ''}`.toLowerCase();
    const tags = [];
    
    const tagRules = {
        'startup': ['start-up', 'startup', 'start up', 'nuove imprese', 'nuova impresa'],
        'femminile': ['femminile', 'donne', 'imprenditrici'],
        'giovanile': ['giovanile', 'giovani', 'under 35', 'under35'],
        'mezzogiorno': ['mezzogiorno', 'sud italia', 'zes', 'zona economica speciale'],
        'digitalizzazione': ['digital', 'industria 4.0', '4.0', 'software', 'e-commerce'],
        'innovazione': ['innovazion', 'innovativ', 'brevett'],
        'energia': ['energia', 'energetic', 'fotovoltaic', 'rinnovabil'],
        'sostenibilita': ['sostenibil', 'green', 'circolare', 'ecologic'],
        'export': ['export', 'internazional', 'estero', 'fiere'],
        'formazione': ['formazione', 'competenze', 'training'],
        'fondo_perduto': ['fondo perduto'],
        'credito_imposta': ["credito d'imposta", 'credito di imposta', 'tax credit'],
        'agricoltura': ['agricol', 'agroalimentar', 'rurale'],
        'turismo': ['turism', 'albergh', 'ristorazion'],
        'commercio': ['commerc', 'negozio', 'retail'],
    };

    for (const [tag, keywords] of Object.entries(tagRules)) {
        if (keywords.some(kw => text.includes(kw))) {
            tags.push(tag);
        }
    }

    return [...new Set(tags)];
}