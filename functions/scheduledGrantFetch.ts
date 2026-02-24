import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Ricerca bandi con web search reale — molte query tematiche per massimizzare i risultati

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const today = new Date().toISOString().split('T')[0];
        console.log(`[GrantFetch] Started at ${today}`);

        // FASE 1: Pulizia bandi scaduti
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

        const activeGrants = allExisting.filter(g =>
            !g.is_archived && g.status !== 'Chiuso' && (!g.deadline || g.deadline >= today)
        );
        const activeTitlesNormalized = activeGrants.map(g => normalizeTitle(g.title));

        // FASE 2: Query multiple — tematiche + territoriali + fonti diverse
        const searchQueries = [
            // === NAZIONALI ===
            {
                query: `Cerca su incentivi.gov.it tutti i bandi e incentivi per imprese attualmente aperti nel 2026 in Italia. Elenca OGNI bando presente sul portale con: titolo ufficiale esatto, ente erogatore, scadenza (YYYY-MM-DD), importo minimo e massimo in euro, percentuale copertura, tipo agevolazione, link diretto. SOLO bandi con scadenza dopo ${today} o senza scadenza. NON inventare.`,
                livello: 'Nazionale', ente_default: 'Stato'
            },
            {
                query: `Cerca su invitalia.it tutti gli incentivi e bandi attualmente aperti nel 2026 per creare imprese, startup, PMI in Italia. Includi: Resto al Sud, Smart&Start, ON - Oltre Nuove Imprese, Cultura Crea, e qualsiasi altro bando Invitalia attivo. Per ognuno: titolo esatto, scadenza, importi, percentuale copertura, link. SOLO aperti dopo ${today}. NON inventare.`,
                livello: 'Nazionale', ente_default: 'Stato'
            },
            {
                query: `Cerca su mise.gov.it e mimit.gov.it (Ministero Imprese Made in Italy) tutti i bandi aperti 2026 per imprese italiane: Nuova Sabatini, Patent Box, Marchi+, Disegni+, contratti di sviluppo, credito d'imposta ricerca e sviluppo, transizione 5.0. Per ognuno: titolo esatto, scadenza, importi, link. NON inventare.`,
                livello: 'Nazionale', ente_default: 'Stato'
            },
            // === INTERNAZIONALIZZAZIONE ===
            {
                query: `Cerca su simest.it tutti i finanziamenti agevolati SIMEST attualmente aperti nel 2026 per internazionalizzazione PMI italiane: fiere internazionali, e-commerce, inserimento mercati esteri, patrimonializzazione, transizione digitale ed ecologica, temporary manager. Per ognuno: titolo esatto, scadenza, importo max, percentuale fondo perduto, link. NON inventare.`,
                livello: 'Nazionale', ente_default: 'Stato'
            },
            // === EUROPEI ===
            {
                query: `Cerca bandi europei Horizon Europe aperti nel 2026 per PMI e imprese innovative italiane. Includi: EIC Accelerator, EIC Pathfinder, EIC Transition, MSCA, EIT bandi. Per ognuno: titolo, scadenza (YYYY-MM-DD), importo massimo, percentuale copertura, link ec.europa.eu. SOLO aperti dopo ${today}. NON inventare.`,
                livello: 'Europeo', ente_default: 'UE'
            },
            {
                query: `Cerca bandi europei COSME, Digital Europe Programme, LIFE programme, programmi interreg, e fondi strutturali europei aperti nel 2026 per PMI italiane. Per ognuno: titolo ufficiale, scadenza, importi, link. NON inventare.`,
                livello: 'Europeo', ente_default: 'UE'
            },
            // === TEMATICI NAZIONALI ===
            {
                query: `Cerca tutti i bandi e incentivi aperti nel 2026 in Italia per digitalizzazione, industria 4.0, transizione digitale delle imprese: voucher digitalizzazione, credito d'imposta beni strumentali 4.0, bandi camere di commercio per digitale. Per ognuno: titolo esatto, scadenza, importi, ente, link. NON inventare.`,
                livello: 'Nazionale', ente_default: 'Stato'
            },
            {
                query: `Cerca tutti i bandi e incentivi aperti nel 2026 in Italia per energia, efficientamento energetico, transizione ecologica, fotovoltaico, comunità energetiche: conto termico, bandi GSE, incentivi PNRR energia. Per ognuno: titolo, scadenza, importi, link. NON inventare.`,
                livello: 'Nazionale', ente_default: 'Stato'
            },
            {
                query: `Cerca bandi aperti 2026 in Italia per startup innovative, imprenditoria giovanile under 35, imprenditoria femminile: Fondo Impresa Donna, bandi per giovani imprenditori, Smart Money, SELFIEmployment. Per ognuno: titolo, scadenza, importi, link. NON inventare.`,
                livello: 'Nazionale', ente_default: 'Stato'
            },
            {
                query: `Cerca bandi aperti 2026 in Italia per formazione aziendale, competenze digitali, Fondo Nuove Competenze, bandi ANPAL, fondi interprofessionali per formazione dipendenti. Per ognuno: titolo, scadenza, importi, link. NON inventare.`,
                livello: 'Nazionale', ente_default: 'Stato'
            },
            {
                query: `Cerca bandi aperti 2026 in Italia per agricoltura, agroalimentare, turismo, commercio, artigianato: PSR regionali, bandi GAL, bandi per turismo e ristorazione, Decontribuzione Sud, ZES Unica Mezzogiorno. Per ognuno: titolo, scadenza, importi, link. NON inventare.`,
                livello: 'Nazionale', ente_default: 'Stato'
            },
            // === REGIONALI — ogni macro-area con regioni specifiche ===
            {
                query: `Cerca TUTTI i bandi regionali aperti nel 2026 per imprese in Lombardia. Cerca su regione.lombardia.it e su bandi.servizirl.it. Per ogni bando: titolo ufficiale esatto, scadenza (YYYY-MM-DD), importi min/max euro, percentuale copertura, link ufficiale. SOLO aperti dopo ${today}. NON inventare.`,
                livello: 'Regionale', ente_default: 'Regione'
            },
            {
                query: `Cerca TUTTI i bandi regionali aperti nel 2026 per imprese in Veneto e Emilia-Romagna. Cerca su regione.veneto.it e imprese.regione.emilia-romagna.it. Per ogni bando: titolo, scadenza, importi, link. NON inventare.`,
                livello: 'Regionale', ente_default: 'Regione'
            },
            {
                query: `Cerca TUTTI i bandi regionali aperti nel 2026 per imprese in Piemonte, Liguria, Friuli Venezia Giulia e Trentino-Alto Adige. Per ogni bando: titolo, regione, scadenza, importi, link. NON inventare.`,
                livello: 'Regionale', ente_default: 'Regione'
            },
            {
                query: `Cerca TUTTI i bandi regionali aperti nel 2026 per imprese in Toscana e Lazio. Cerca su regione.toscana.it e regione.lazio.it. Per ogni bando: titolo, regione, scadenza, importi, link. NON inventare.`,
                livello: 'Regionale', ente_default: 'Regione'
            },
            {
                query: `Cerca TUTTI i bandi regionali aperti nel 2026 per imprese in Marche, Umbria e Abruzzo. Per ogni bando: titolo, regione, scadenza, importi, link. NON inventare.`,
                livello: 'Regionale', ente_default: 'Regione'
            },
            {
                query: `Cerca TUTTI i bandi regionali aperti nel 2026 per imprese in Campania e Puglia. Cerca sui portali regionali ufficiali. Per ogni bando: titolo, regione, scadenza, importi, link. NON inventare.`,
                livello: 'Regionale', ente_default: 'Regione'
            },
            {
                query: `Cerca TUTTI i bandi regionali aperti nel 2026 per imprese in Sicilia, Sardegna, Calabria, Basilicata e Molise. Per ogni bando: titolo, regione, scadenza, importi, link. NON inventare.`,
                livello: 'Regionale', ente_default: 'Regione'
            },
            // === CAMERE DI COMMERCIO ===
            {
                query: `Cerca bandi delle Camere di Commercio italiane aperti nel 2026 per PMI: voucher digitali, bandi PID (Punto Impresa Digitale), voucher internazionalizzazione, contributi export, bandi Unioncamere. Per ognuno: titolo, camera di commercio, scadenza, importi, link. NON inventare.`,
                livello: 'Nazionale', ente_default: 'Altro'
            },
            // === PNRR ===
            {
                query: `Cerca bandi PNRR (Piano Nazionale Ripresa e Resilienza) ancora aperti nel 2026 per imprese italiane: bandi per ricerca e sviluppo, innovazione, infrastrutture digitali, transizione verde, partenariati estesi. Per ognuno: titolo, scadenza, importi, link. NON inventare.`,
                livello: 'Nazionale', ente_default: 'Stato'
            },
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
                            extraction_notes: { type: "string", description: "Fonte dati e note" }
                        }
                    }
                }
            }
        };

        const allNewGrants = [];

        // Esegui ricerche in sequenza con pausa
        for (let i = 0; i < searchQueries.length; i++) {
            const sq = searchQueries[i];
            console.log(`[GrantFetch] Query ${i + 1}/${searchQueries.length}: ${sq.livello}`);

            try {
                const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
                    prompt: sq.query + `\n\nIMPORTANTE: Restituisci il MASSIMO numero possibile di bandi reali trovati. Per ogni bando indica confidence_level: "alto" se hai la pagina ufficiale, "medio" se info parziali, "basso" se incerto. Se non trovi bandi, restituisci {"grants": []}.`,
                    add_context_from_internet: true,
                    response_json_schema: jsonSchema
                });

                if (result?.grants && Array.isArray(result.grants)) {
                    for (const g of result.grants) {
                        g.livello = g.livello || sq.livello;
                        g.ente_erogatore = g.ente_erogatore || sq.ente_default;
                        allNewGrants.push(g);
                    }
                    console.log(`[GrantFetch] Found ${result.grants.length} grants from query ${i + 1}`);
                }
            } catch (err) {
                console.error(`[GrantFetch] Error in query ${i + 1}:`, err.message);
            }

            // Pausa 2s tra ricerche
            if (i < searchQueries.length - 1) {
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        console.log(`[GrantFetch] Total raw grants: ${allNewGrants.length}`);

        // FASE 3: Filtra, deduplica, salva
        let created = 0, updated = 0, skippedExpired = 0, skippedDuplicate = 0, skippedNoTitle = 0, skippedLowConf = 0;

        for (const grant of allNewGrants) {
            if (!grant.title || grant.title.trim().length < 5) { skippedNoTitle++; continue; }
            if (grant.deadline && grant.deadline < today) { skippedExpired++; continue; }
            if (grant.confidence_level === 'basso') { skippedLowConf++; continue; }

            const normTitle = normalizeTitle(grant.title);

            // Cerca duplicato tra bandi attivi in DB
            const duplicateIdx = activeTitlesNormalized.findIndex(existing => {
                if (existing === normTitle) return true;
                const wordsNew = normTitle.split(' ').filter(w => w.length > 2);
                const wordsExisting = existing.split(' ').filter(w => w.length > 2);
                if (wordsNew.length === 0 || wordsExisting.length === 0) return false;
                const common = wordsNew.filter(w => wordsExisting.includes(w));
                return (common.length / Math.max(wordsNew.length, wordsExisting.length)) > 0.75;
            });

            if (duplicateIdx >= 0) {
                // Se il duplicato esiste ma il nuovo ha più dati → aggiorna
                const existingGrant = activeGrants[duplicateIdx];
                const hasMoreData = (grant.deadline && !existingGrant.deadline) ||
                    (grant.max_amount && !existingGrant.max_amount) ||
                    (grant.website_url && !existingGrant.website_url) ||
                    (grant.coverage_percentage && !existingGrant.coverage_percentage);

                if (hasMoreData) {
                    const updateData = {};
                    if (grant.deadline && !existingGrant.deadline) updateData.deadline = grant.deadline;
                    if (grant.max_amount && !existingGrant.max_amount) updateData.max_amount = grant.max_amount;
                    if (grant.min_amount && !existingGrant.min_amount) updateData.min_amount = grant.min_amount;
                    if (grant.website_url && !existingGrant.website_url) updateData.website_url = grant.website_url;
                    if (grant.coverage_percentage && !existingGrant.coverage_percentage) updateData.coverage_percentage = grant.coverage_percentage;
                    if (grant.description && (!existingGrant.description || existingGrant.description.length < grant.description.length)) updateData.description = grant.description;

                    if (Object.keys(updateData).length > 0) {
                        await base44.asServiceRole.entities.FinancialGrant.update(existingGrant.id, updateData);
                        updated++;
                        console.log(`[GrantFetch] Updated: ${existingGrant.title}`);
                    }
                } else {
                    skippedDuplicate++;
                }
                continue;
            }

            // Cerca duplicato nello stesso batch
            const batchDup = allNewGrants.slice(0, allNewGrants.indexOf(grant)).some(prev => {
                if (!prev.title || prev.title.trim().length < 5) return false;
                const prevNorm = normalizeTitle(prev.title);
                if (prevNorm === normTitle) return true;
                const w1 = normTitle.split(' ').filter(w => w.length > 2);
                const w2 = prevNorm.split(' ').filter(w => w.length > 2);
                if (w1.length === 0 || w2.length === 0) return false;
                const c = w1.filter(w => w2.includes(w));
                return (c.length / Math.max(w1.length, w2.length)) > 0.75;
            });

            if (batchDup) { skippedDuplicate++; continue; }

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
            updated,
            skipped_expired: skippedExpired,
            skipped_duplicate: skippedDuplicate,
            skipped_no_title: skippedNoTitle,
            skipped_low_confidence: skippedLowConf,
            active_grants_total: activeGrants.length + created
        };

        console.log('[GrantFetch] Completed:', JSON.stringify(result));
        return Response.json(result);

    } catch (error) {
        console.error('[GrantFetch] Fatal error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

function normalizeTitle(title) {
    if (!title) return '';
    return title.toLowerCase().replace(/[^a-z0-9àèéìòùç]/g, ' ').replace(/\s+/g, ' ').trim();
}

function validateEnum(value, allowed, defaultValue) {
    if (!value) return defaultValue;
    if (allowed.includes(value)) return value;
    const vl = value.toLowerCase();
    for (const opt of allowed) {
        if (vl.includes(opt.toLowerCase()) || opt.toLowerCase().includes(vl)) return opt;
    }
    return defaultValue;
}

function isValidDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    return !isNaN(new Date(dateStr).getTime());
}

function extractTags(title, description) {
    const text = `${title || ''} ${description || ''}`.toLowerCase();
    const tags = [];
    const rules = {
        'startup': ['start-up', 'startup', 'start up', 'nuove imprese', 'nuova impresa'],
        'femminile': ['femminile', 'donne', 'imprenditrici', 'impresa donna'],
        'giovanile': ['giovanile', 'giovani', 'under 35', 'under35'],
        'mezzogiorno': ['mezzogiorno', 'sud italia', 'zes', 'zona economica speciale', 'decontribuzione sud'],
        'digitalizzazione': ['digital', 'industria 4.0', '4.0', 'software', 'e-commerce', 'transizione digitale'],
        'innovazione': ['innovazion', 'innovativ', 'brevett', 'transizione 5.0'],
        'energia': ['energia', 'energetic', 'fotovoltaic', 'rinnovabil', 'conto termico'],
        'sostenibilita': ['sostenibil', 'green', 'circolare', 'ecologic', 'transizione ecologica'],
        'export': ['export', 'internazional', 'estero', 'fiere', 'simest'],
        'formazione': ['formazione', 'competenze', 'training', 'nuove competenze'],
        'fondo_perduto': ['fondo perduto'],
        'credito_imposta': ["credito d'imposta", 'credito di imposta', 'tax credit'],
        'agricoltura': ['agricol', 'agroalimentar', 'rurale', 'psr'],
        'turismo': ['turism', 'albergh', 'ristorazion'],
        'commercio': ['commerc', 'negozio', 'retail', 'artigian'],
        'pnrr': ['pnrr', 'piano nazionale ripresa', 'next generation'],
        'ricerca': ['ricerca', 'sviluppo', 'r&s', 'r&d'],
    };
    for (const [tag, keywords] of Object.entries(rules)) {
        if (keywords.some(kw => text.includes(kw))) tags.push(tag);
    }
    return [...new Set(tags)];
}