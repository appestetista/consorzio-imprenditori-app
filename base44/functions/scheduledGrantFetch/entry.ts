import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Ricerca bandi con web search reale — 12 query ottimizzate per rientrare nel timeout

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
        // Mappa parallela: stessi indici tra activeGrants e activeTitlesNormalized
        const activeTitlesNormalized = activeGrants.map(g => normalizeTitle(g.title));
        // Mappa title → grant per lookup sicuro
        const activeGrantsByNormTitle = {};
        activeGrants.forEach((g, idx) => { activeGrantsByNormTitle[activeTitlesNormalized[idx]] = g; });

        // FASE 2: 12 query ottimizzate — nazionali, europee, tematiche, regionali accorpate
        const searchQueries = [
            // 1. Portale incentivi.gov.it + Invitalia
            {
                query: `Cerca su incentivi.gov.it e invitalia.it TUTTI i bandi e incentivi per imprese attualmente APERTI in Italia nel 2026. Includi Resto al Sud, Smart&Start, ON Oltre Nuove Imprese, Cultura Crea, e ogni altro incentivo attivo. Per ognuno: titolo ufficiale esatto, scadenza (YYYY-MM-DD), importo minimo e massimo in euro, percentuale copertura, tipo agevolazione, link diretto. SOLO bandi con scadenza dopo ${today} o senza scadenza. NON inventare. Restituisci il MASSIMO numero possibile.`,
                livello: 'Nazionale', ente_default: 'Stato'
            },
            // 2. MIMIT + Nuova Sabatini + crediti d'imposta
            {
                query: `Cerca su mise.gov.it e mimit.gov.it TUTTI i bandi aperti 2026: Nuova Sabatini, Patent Box, Marchi+, Disegni+, contratti di sviluppo, credito d'imposta ricerca e sviluppo, credito d'imposta beni strumentali 4.0, Transizione 5.0. Per ognuno: titolo esatto, scadenza (YYYY-MM-DD), importi min/max euro, link. NON inventare.`,
                livello: 'Nazionale', ente_default: 'Stato'
            },
            // 3. SIMEST internazionalizzazione
            {
                query: `Cerca su simest.it TUTTI i finanziamenti agevolati SIMEST aperti nel 2026 per PMI italiane: fiere internazionali, e-commerce estero, inserimento mercati, patrimonializzazione, transizione digitale ecologica, temporary manager export. Per ognuno: titolo, scadenza, importo max, percentuale fondo perduto, link. NON inventare.`,
                livello: 'Nazionale', ente_default: 'Stato'
            },
            // 4. Europei Horizon + EIC + COSME + LIFE
            {
                query: `Cerca TUTTI i bandi europei aperti nel 2026 per PMI italiane: Horizon Europe (EIC Accelerator, EIC Pathfinder, EIC Transition, MSCA), COSME, Digital Europe Programme, LIFE programme, programmi Interreg, fondi strutturali. Per ognuno: titolo ufficiale, scadenza (YYYY-MM-DD), importo max, percentuale copertura, link ec.europa.eu. SOLO aperti dopo ${today}. NON inventare.`,
                livello: 'Europeo', ente_default: 'UE'
            },
            // 5. Tematici: startup, giovani, donne + PNRR
            {
                query: `Cerca TUTTI i bandi aperti 2026 in Italia per: startup innovative, imprenditoria giovanile under 35, imprenditoria femminile (Fondo Impresa Donna), Smart Money, SELFIEmployment, bandi PNRR per imprese, Decontribuzione Sud, ZES Unica Mezzogiorno. Per ognuno: titolo, scadenza, importi, link. NON inventare.`,
                livello: 'Nazionale', ente_default: 'Stato'
            },
            // 6. Tematici: digitalizzazione, energia, formazione
            {
                query: `Cerca TUTTI i bandi aperti 2026 in Italia per: digitalizzazione PMI, voucher digitali, industria 4.0, efficientamento energetico, conto termico, comunità energetiche, Fondo Nuove Competenze, formazione aziendale, fondi interprofessionali. Per ognuno: titolo, scadenza, importi, ente, link. NON inventare.`,
                livello: 'Nazionale', ente_default: 'Stato'
            },
            // 7. Tematici: agricoltura, turismo, commercio, artigianato + Camere di Commercio
            {
                query: `Cerca TUTTI i bandi aperti 2026 in Italia per agricoltura, agroalimentare, turismo, ristorazione, commercio, artigianato. Includi anche bandi Camere di Commercio (voucher PID, voucher internazionalizzazione, Unioncamere). Per ognuno: titolo, scadenza, importi, link. NON inventare.`,
                livello: 'Nazionale', ente_default: 'Altro'
            },
            // 8. Regionali Nord-Ovest: Lombardia, Piemonte, Liguria, Valle d'Aosta
            {
                query: `Cerca TUTTI i bandi regionali aperti nel 2026 per imprese in Lombardia, Piemonte, Liguria e Valle d'Aosta. Cerca sui siti ufficiali delle regioni. Per ogni bando: titolo ufficiale, regione, scadenza (YYYY-MM-DD), importi min/max euro, percentuale copertura, link. SOLO aperti dopo ${today}. NON inventare.`,
                livello: 'Regionale', ente_default: 'Regione'
            },
            // 9. Regionali Nord-Est: Veneto, Emilia-Romagna, FVG, Trentino-Alto Adige
            {
                query: `Cerca TUTTI i bandi regionali aperti nel 2026 per imprese in Veneto, Emilia-Romagna, Friuli Venezia Giulia e Trentino-Alto Adige. Per ogni bando: titolo, regione, scadenza, importi, link. NON inventare.`,
                livello: 'Regionale', ente_default: 'Regione'
            },
            // 10. Regionali Centro: Toscana, Lazio, Marche, Umbria, Abruzzo
            {
                query: `Cerca TUTTI i bandi regionali aperti nel 2026 per imprese in Toscana, Lazio, Marche, Umbria e Abruzzo. Per ogni bando: titolo, regione, scadenza, importi, link. NON inventare.`,
                livello: 'Regionale', ente_default: 'Regione'
            },
            // 11. Regionali Sud: Campania, Puglia, Calabria
            {
                query: `Cerca TUTTI i bandi regionali aperti nel 2026 per imprese in Campania, Puglia e Calabria. Per ogni bando: titolo, regione, scadenza, importi, link. NON inventare.`,
                livello: 'Regionale', ente_default: 'Regione'
            },
            // 12. Regionali Isole + Basilicata + Molise: Sicilia, Sardegna, Basilicata, Molise
            {
                query: `Cerca TUTTI i bandi regionali aperti nel 2026 per imprese in Sicilia, Sardegna, Basilicata e Molise. Per ogni bando: titolo, regione, scadenza, importi, link. NON inventare.`,
                livello: 'Regionale', ente_default: 'Regione'
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
                            description: { type: "string", description: "Descrizione breve (max 200 char)" },
                            ente_erogatore: { type: "string", enum: ["UE", "Stato", "Regione", "Altro"] },
                            livello: { type: "string", enum: ["Europeo", "Nazionale", "Regionale"] },
                            grant_type: { type: "string", enum: ["Digitalizzazione", "Innovazione", "Ricerca e Sviluppo", "Energia/Sostenibilità", "Internazionalizzazione", "Altro"] },
                            funding_type: { type: "string", enum: ["Contributo a fondo perduto", "Finanziamento agevolato", "Credito d'imposta", "Misto"] },
                            coverage_percentage: { type: "number" },
                            min_amount: { type: "number" },
                            max_amount: { type: "number" },
                            status: { type: "string", enum: ["Aperto", "In apertura"] },
                            deadline: { type: "string", description: "YYYY-MM-DD o null" },
                            access_mode: { type: "string", enum: ["Sportello", "Graduatoria"] },
                            eligible_company_sizes: { type: "array", items: { type: "string", enum: ["Micro", "Piccola", "Media", "Grande"] } },
                            eligible_regions: { type: "array", items: { type: "string" } },
                            website_url: { type: "string" },
                            confidence_level: { type: "string", enum: ["alto", "medio", "basso"] },
                            extraction_notes: { type: "string" }
                        }
                    }
                }
            }
        };

        const allNewGrants = [];

        for (let i = 0; i < searchQueries.length; i++) {
            const sq = searchQueries[i];
            console.log(`[GrantFetch] Query ${i + 1}/${searchQueries.length}: ${sq.livello}`);

            let result = null;
            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    result = await base44.asServiceRole.integrations.Core.InvokeLLM({
                        prompt: sq.query + `\n\nRestituisci il MASSIMO numero di bandi reali trovati. confidence_level: "alto" se pagina ufficiale, "medio" se info parziali, "basso" se incerto. Se non trovi bandi: {"grants": []}.`,
                        add_context_from_internet: true,
                        response_json_schema: jsonSchema
                    });
                    break;
                } catch (err) {
                    console.error(`[GrantFetch] Error query ${i + 1} attempt ${attempt + 1}:`, err.message);
                    if (attempt === 0) await new Promise(r => setTimeout(r, 2000));
                }
            }

            if (result?.grants && Array.isArray(result.grants)) {
                for (const g of result.grants) {
                    g.livello = g.livello || sq.livello;
                    g.ente_erogatore = g.ente_erogatore || sq.ente_default;
                    allNewGrants.push(g);
                }
                console.log(`[GrantFetch] Found ${result.grants.length} from query ${i + 1}`);
            }

            if (i < searchQueries.length - 1) await new Promise(r => setTimeout(r, 1500));
        }

        console.log(`[GrantFetch] Total raw: ${allNewGrants.length}`);

        // FASE 3: Filtra, deduplica, salva
        let created = 0, updated = 0, skippedExpired = 0, skippedDuplicate = 0, skippedNoTitle = 0, skippedLowConf = 0;
        const batchNormTitles = [];

        for (const grant of allNewGrants) {
            if (!grant.title || grant.title.trim().length < 5) { skippedNoTitle++; continue; }
            if (grant.deadline && grant.deadline < today) { skippedExpired++; continue; }
            if (grant.confidence_level === 'basso') { skippedLowConf++; continue; }

            const normTitle = normalizeTitle(grant.title);

            // Duplicato in DB?
            const dbDupTitle = activeTitlesNormalized.find(ex => titleOverlap(ex, normTitle) > 0.75);

            if (dbDupTitle) {
                const existing = activeGrantsByNormTitle[dbDupTitle];
                if (!existing) { skippedDuplicate++; continue; }
                const updates = {};
                if (grant.deadline && !existing.deadline) updates.deadline = grant.deadline;
                if (grant.max_amount && !existing.max_amount) updates.max_amount = grant.max_amount;
                if (grant.min_amount && !existing.min_amount) updates.min_amount = grant.min_amount;
                if (grant.website_url && !existing.website_url) updates.website_url = grant.website_url;
                if (grant.coverage_percentage && !existing.coverage_percentage) updates.coverage_percentage = grant.coverage_percentage;
                if (grant.description && (!existing.description || existing.description.length < (grant.description || '').length)) updates.description = grant.description;

                if (Object.keys(updates).length > 0) {
                    await base44.asServiceRole.entities.FinancialGrant.update(existing.id, updates);
                    updated++;
                } else {
                    skippedDuplicate++;
                }
                continue;
            }

            // Duplicato nel batch?
            if (batchNormTitles.some(bt => titleOverlap(bt, normTitle) > 0.75)) {
                skippedDuplicate++;
                continue;
            }

            const grantData = {
                title: grant.title.trim(),
                description: (grant.description || '').substring(0, 500),
                ente_erogatore: validateEnum(grant.ente_erogatore, ['UE', 'Stato', 'Regione', 'Altro'], 'Stato'),
                livello: validateEnum(grant.livello, ['Europeo', 'Nazionale', 'Regionale'], 'Nazionale'),
                grant_type: validateEnum(grant.grant_type, ['Digitalizzazione', 'Innovazione', 'Ricerca e Sviluppo', 'Energia/Sostenibilità', 'Internazionalizzazione', 'Altro'], 'Altro'),
                funding_type: validateEnum(grant.funding_type, ['Contributo a fondo perduto', 'Finanziamento agevolato', "Credito d'imposta", 'Misto'], 'Contributo a fondo perduto'),
                coverage_percentage: (typeof grant.coverage_percentage === 'number' && grant.coverage_percentage > 0 && grant.coverage_percentage <= 100) ? grant.coverage_percentage : null,
                min_amount: (typeof grant.min_amount === 'number' && grant.min_amount > 0) ? grant.min_amount : null,
                max_amount: (typeof grant.max_amount === 'number' && grant.max_amount > 0) ? grant.max_amount : null,
                status: validateEnum(grant.status, ['Aperto', 'In apertura'], 'Aperto'),
                opening_date: null,
                deadline: isValidDate(grant.deadline) ? grant.deadline : null,
                access_mode: validateEnum(grant.access_mode, ['Sportello', 'Graduatoria'], 'Sportello'),
                requires_cofinancing: false,
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
                batchNormTitles.push(normTitle);
                activeTitlesNormalized.push(normTitle);
                console.log(`[GrantFetch] Created: ${grant.title}`);
            } catch (e) {
                console.error(`[GrantFetch] Error creating "${grant.title}":`, e.message);
            }
        }

        const result = {
            success: true, date: today,
            archived_expired: archivedCount,
            total_extracted: allNewGrants.length,
            created, updated,
            skipped_expired: skippedExpired,
            skipped_duplicate: skippedDuplicate,
            skipped_no_title: skippedNoTitle,
            skipped_low_confidence: skippedLowConf,
            active_grants_total: activeGrants.length + created
        };

        console.log('[GrantFetch] Done:', JSON.stringify(result));
        return Response.json(result);

    } catch (error) {
        console.error('[GrantFetch] Fatal:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

function normalizeTitle(t) {
    return (t || '').toLowerCase().replace(/[^a-z0-9àèéìòùç]/g, ' ').replace(/\s+/g, ' ').trim();
}

function titleOverlap(a, b) {
    if (a === b) return 1;
    const wa = a.split(' ').filter(w => w.length > 2);
    const wb = b.split(' ').filter(w => w.length > 2);
    if (!wa.length || !wb.length) return 0;
    const common = wa.filter(w => wb.includes(w));
    return common.length / Math.max(wa.length, wb.length);
}

function validateEnum(v, allowed, def) {
    if (!v) return def;
    if (allowed.includes(v)) return v;
    const vl = v.toLowerCase();
    for (const o of allowed) { if (vl.includes(o.toLowerCase()) || o.toLowerCase().includes(vl)) return o; }
    return def;
}

function isValidDate(s) {
    if (!s || typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    return !isNaN(new Date(s).getTime());
}

function extractTags(title, desc) {
    const t = `${title || ''} ${desc || ''}`.toLowerCase();
    const tags = [];
    const r = {
        'startup': ['start-up', 'startup', 'start up', 'nuove imprese'],
        'femminile': ['femminile', 'donne', 'imprenditrici', 'impresa donna'],
        'giovanile': ['giovanile', 'giovani', 'under 35'],
        'mezzogiorno': ['mezzogiorno', 'zes', 'decontribuzione sud'],
        'digitalizzazione': ['digital', 'industria 4.0', '4.0', 'e-commerce'],
        'innovazione': ['innovazion', 'brevett', 'transizione 5.0'],
        'energia': ['energia', 'energetic', 'fotovoltaic', 'rinnovabil', 'conto termico'],
        'sostenibilita': ['sostenibil', 'green', 'circolare', 'ecologic'],
        'export': ['export', 'internazional', 'estero', 'fiere', 'simest'],
        'formazione': ['formazione', 'competenze', 'nuove competenze'],
        'fondo_perduto': ['fondo perduto'],
        'credito_imposta': ["credito d'imposta", 'credito di imposta', 'tax credit'],
        'agricoltura': ['agricol', 'agroalimentar', 'rurale', 'psr'],
        'turismo': ['turism', 'albergh', 'ristorazion'],
        'commercio': ['commerc', 'negozio', 'retail', 'artigian'],
        'pnrr': ['pnrr', 'piano nazionale ripresa'],
        'ricerca': ['ricerca', 'sviluppo', 'r&s'],
    };
    for (const [tag, kws] of Object.entries(r)) { if (kws.some(k => t.includes(k))) tags.push(tag); }
    return [...new Set(tags)];
}