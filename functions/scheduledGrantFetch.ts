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
                    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
                    prompt: `Analizza il sito ${url} e estrai i bandi/incentivi APERTI per imprese italiane. Max 10 bandi principali.

                    Per ogni bando estrai (usa null se non disponibile):
                    - title: Titolo
                    - description: Descrizione breve (max 200 caratteri)  
                    - ente_erogatore: UE/Stato/Regione/Altro
                    - livello: Europeo/Nazionale/Regionale
                    - grant_type: Digitalizzazione/Innovazione/Ricerca e Sviluppo/Energia/Sostenibilità/Internazionalizzazione/Altro
                    - funding_type: Contributo a fondo perduto/Finanziamento agevolato/Credito d'imposta/Misto
                    - coverage_percentage: numero 0-100
                    - min_amount, max_amount: importi euro
                    - status: Aperto/In apertura/Chiuso
                    - deadline: YYYY-MM-DD
                    - eligible_company_sizes: ["Micro","Piccola","Media","Grande"]
                    - eligible_regions: array regioni (vuoto se nazionale)
                    - website_url: URL DIRETTO alla pagina ufficiale del bando (IMPORTANTE: deve essere il link specifico al bando, non generico)

                    Solo bandi REALI e ATTUALI. IMPORTANTE: includi SEMPRE il website_url con il link diretto al bando ufficiale.`,
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
                                        deadline: { type: "string" },
                                        eligible_company_sizes: { type: "array", items: { type: "string" } },
                                        eligible_regions: { type: "array", items: { type: "string" } },
                                        website_url: { type: "string" }
                                    }
                                }
                            }
                        }
                    }
                    });
                    return result?.grants || [];
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

        // Salva i bandi
        const existingGrants = await base44.asServiceRole.entities.FinancialGrant.list();
        
        // Crea indice per matching più robusto (titolo normalizzato + ente)
        const existingIndex = new Map();
        for (const g of existingGrants) {
            const key = normalizeTitle(g.title);
            existingIndex.set(key, g);
        }

        let created = 0;
        let updated = 0;
        let skipped = 0;

        for (const grant of uniqueGrants) {
            if (!grant.title) continue;

            const titleKey = normalizeTitle(grant.title);
            const existing = existingIndex.get(titleKey);
            
            // Verifica duplicato anche con similarità
            const isDuplicate = checkSimilarExists(grant.title, existingGrants);
            if (isDuplicate && !existing) {
                skipped++;
                continue;
            }

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
                website_url: grant.website_url || null,
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

// Verifica se esiste un bando simile (> 80% similarità)
function checkSimilarExists(newTitle, existingGrants) {
    const normalizedNew = normalizeTitle(newTitle);
    const newWords = new Set(normalizedNew.split(' ').filter(w => w.length > 2));
    
    for (const existing of existingGrants) {
        const normalizedExisting = normalizeTitle(existing.title);
        const existingWords = new Set(normalizedExisting.split(' ').filter(w => w.length > 2));
        
        // Calcola overlap
        let matches = 0;
        for (const word of newWords) {
            if (existingWords.has(word)) matches++;
        }
        
        const similarity = matches / Math.max(newWords.size, existingWords.size);
        if (similarity > 0.8) return true;
    }
    
    return false;
}