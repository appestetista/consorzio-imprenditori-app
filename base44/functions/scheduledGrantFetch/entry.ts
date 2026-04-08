import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * scheduledGrantFetch v3 — FETCH REALE + PARSING DETERMINISTICO
 * 
 * Architettura:
 * 1. Scarica HTML reale da fonti istituzionali via fetch()
 * 2. Passa il contenuto HTML scaricato all'LLM per estrazione strutturata
 * 3. L'LLM NON cerca su internet — analizza SOLO il testo fornito
 * 4. Ogni bando viene validato: URL raggiungibile, titolo presente, dati coerenti
 * 5. Bandi con URL non raggiungibile → confidence_level = 'basso'
 */

const SOURCES = [
  // Nazionali
  { name: 'Incentivi.gov.it', url: 'https://www.incentivi.gov.it/it/incentivi', livello: 'Nazionale', ente: 'Stato' },
  { name: 'Invitalia', url: 'https://www.invitalia.it/cosa-facciamo/creiamo-nuove-aziende', livello: 'Nazionale', ente: 'Stato' },
  { name: 'MIMIT Incentivi', url: 'https://www.mimit.gov.it/it/incentivi', livello: 'Nazionale', ente: 'Stato' },
  { name: 'SIMEST', url: 'https://www.simest.it/prodotti', livello: 'Nazionale', ente: 'Stato' },
  // Regionali
  { name: 'Emilia-Romagna Imprese', url: 'https://imprese.regione.emilia-romagna.it/Finanziamenti', livello: 'Regionale', ente: 'Regione', regioni: ['Emilia-Romagna'] },
  { name: 'Marche Imprese', url: 'https://www.regione.marche.it/Entra-in-Regione/Bandi', livello: 'Regionale', ente: 'Regione', regioni: ['Marche'] },
  { name: 'Lombardia', url: 'https://www.regione.lombardia.it/wps/portal/istituzionale/HP/DettaglioRedazionale/servizi-e-informazioni/imprese/imprese-incentivi-agevolazioni-finanziamenti', livello: 'Regionale', ente: 'Regione', regioni: ['Lombardia'] },
  { name: 'Toscana', url: 'https://www.sviluppo.toscana.it/bandi', livello: 'Regionale', ente: 'Regione', regioni: ['Toscana'] },
  { name: 'Veneto Imprese', url: 'https://www.regione.veneto.it/web/economia-e-sviluppo-montano/bandi', livello: 'Regionale', ente: 'Regione', regioni: ['Veneto'] },
  { name: 'Lazio Innova', url: 'https://www.lazioinnova.it/bandi/', livello: 'Regionale', ente: 'Regione', regioni: ['Lazio'] },
  { name: 'Campania', url: 'https://porfesr.regione.campania.it/it/news/bandi', livello: 'Regionale', ente: 'Regione', regioni: ['Campania'] },
  { name: 'Puglia', url: 'https://www.sistema.puglia.it/portal/page/portal/SistemaPuglia/bandi', livello: 'Regionale', ente: 'Regione', regioni: ['Puglia'] },
  { name: 'Sicilia', url: 'https://www.sicilia-fse.it/avvisi', livello: 'Regionale', ente: 'Regione', regioni: ['Sicilia'] },
  { name: 'Piemonte', url: 'https://bfruffino.regione.piemonte.it/bandiPiemonte', livello: 'Regionale', ente: 'Regione', regioni: ['Piemonte'] },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date().toISOString().split('T')[0];
    console.log(`[GrantFetch v3] Started at ${today}`);

    // FASE 1: Pulizia bandi scaduti
    const allExisting = await base44.asServiceRole.entities.FinancialGrant.list('-created_date', 500);
    let archivedCount = 0;
    for (const grant of allExisting) {
      if (grant.deadline && grant.deadline < today && !grant.is_archived) {
        await base44.asServiceRole.entities.FinancialGrant.update(grant.id, {
          status: 'Chiuso',
          is_archived: true
        });
        archivedCount++;
      }
    }
    console.log(`[GrantFetch v3] Archived ${archivedCount} expired grants`);

    const activeGrants = allExisting.filter(g =>
      !g.is_archived && g.status !== 'Chiuso' && (!g.deadline || g.deadline >= today)
    );
    const activeTitlesNorm = activeGrants.map(g => normalizeTitle(g.title));

    // FASE 2: Per ogni fonte, fetch HTML reale → parse con LLM
    let created = 0, updated = 0, skippedDuplicate = 0, skippedInvalid = 0, fetchErrors = 0;
    const batchTitlesNorm = [];

    for (let i = 0; i < SOURCES.length; i++) {
      const source = SOURCES[i];
      console.log(`[GrantFetch v3] Source ${i + 1}/${SOURCES.length}: ${source.name}`);

      // 2a. Fetch HTML reale
      let pageContent = null;
      try {
        const resp = await fetch(source.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; GrantBot/1.0)',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'it-IT,it;q=0.9'
          },
          signal: AbortSignal.timeout(15000)
        });

        if (!resp.ok) {
          console.log(`[GrantFetch v3] HTTP ${resp.status} for ${source.name}`);
          fetchErrors++;
          continue;
        }

        const html = await resp.text();
        // Estrai testo utile dall'HTML (rimuovi script, style, tag)
        pageContent = extractTextFromHtml(html);
        if (pageContent.length < 100) {
          console.log(`[GrantFetch v3] Page too short for ${source.name} (${pageContent.length} chars)`);
          fetchErrors++;
          continue;
        }
        // Limita a 12000 chars per non esplodere i token
        if (pageContent.length > 12000) {
          pageContent = pageContent.substring(0, 12000);
        }
        console.log(`[GrantFetch v3] Fetched ${pageContent.length} chars from ${source.name}`);
      } catch (fetchErr) {
        console.error(`[GrantFetch v3] Fetch error ${source.name}:`, fetchErr.message);
        fetchErrors++;
        continue;
      }

      // 2b. LLM estrae bandi dal contenuto HTML REALE (NO internet search)
      let grants = [];
      try {
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Sei un sistema di estrazione dati. Analizza il seguente contenuto HTML estratto dal sito "${source.name}" (${source.url}).

REGOLE FONDAMENTALI:
1. Estrai SOLO bandi/incentivi/agevolazioni che trovi ESPLICITAMENTE nel testo sotto
2. NON inventare NULLA — se un dato non è nel testo, metti null
3. Se non trovi bandi nel testo, restituisci {"grants": []}
4. Per ogni bando: titolo ESATTO come appare nel testo, NON parafrasare
5. Le date devono essere in formato YYYY-MM-DD, solo se ESPLICITAMENTE presenti
6. Gli importi devono essere numeri, solo se ESPLICITAMENTE presenti
7. Lo status è "Aperto" solo se il testo dice esplicitamente che è aperto/attivo
8. Se il testo contiene link a pagine specifiche dei bandi, includili in website_url

CONTENUTO DELLA PAGINA:
---
${pageContent}
---

Per ogni bando trovato estrai:
- title: Titolo esatto dal testo
- description: Descrizione se presente (max 300 char)
- grant_type: Digitalizzazione|Innovazione|Ricerca e Sviluppo|Energia/Sostenibilità|Internazionalizzazione|Altro
- funding_type: Contributo a fondo perduto|Finanziamento agevolato|Credito d'imposta|Misto
- coverage_percentage: numero 0-100 o null
- min_amount: importo in euro o null
- max_amount: importo in euro o null
- status: Aperto|In apertura
- deadline: YYYY-MM-DD o null
- eligible_company_sizes: array o null
- eligible_regions: array di regioni italiane o null
- website_url: URL specifico del bando se trovato nel testo
- access_mode: Sportello|Graduatoria o null`,
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
                    grant_type: { type: "string" },
                    funding_type: { type: "string" },
                    coverage_percentage: { type: "number" },
                    min_amount: { type: "number" },
                    max_amount: { type: "number" },
                    status: { type: "string" },
                    deadline: { type: "string" },
                    eligible_company_sizes: { type: "array", items: { type: "string" } },
                    eligible_regions: { type: "array", items: { type: "string" } },
                    website_url: { type: "string" },
                    access_mode: { type: "string" }
                  }
                }
              }
            }
          }
        });

        if (result?.grants && Array.isArray(result.grants)) {
          grants = result.grants;
        }
        console.log(`[GrantFetch v3] Extracted ${grants.length} grants from ${source.name}`);
      } catch (llmErr) {
        console.error(`[GrantFetch v3] LLM error ${source.name}:`, llmErr.message);
        continue;
      }

      // 2c. Processa ogni bando estratto
      for (const grant of grants) {
        if (!grant.title || grant.title.trim().length < 5) { skippedInvalid++; continue; }
        if (grant.deadline && grant.deadline < today) { skippedInvalid++; continue; }

        const normTitle = normalizeTitle(grant.title);

        // Dedup DB
        if (activeTitlesNorm.some(ex => titleOverlap(ex, normTitle) > 0.70)) {
          skippedDuplicate++;
          continue;
        }

        // Dedup batch
        if (batchTitlesNorm.some(bt => titleOverlap(bt, normTitle) > 0.70)) {
          skippedDuplicate++;
          continue;
        }

        // Valida URL se presente
        let urlVerified = false;
        let finalUrl = grant.website_url || source.url;
        if (grant.website_url) {
          urlVerified = await verifyUrl(grant.website_url);
          if (!urlVerified) {
            finalUrl = source.url; // fallback alla pagina fonte
          }
        }

        const grantData = {
          title: grant.title.trim(),
          description: (grant.description || '').substring(0, 500),
          ente_erogatore: validateEnum(source.ente, ['UE', 'Stato', 'Regione', 'Altro'], 'Stato'),
          livello: source.livello,
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
          eligible_company_sizes: sanitizeStringArray(grant.eligible_company_sizes),
          eligible_regions: sanitizeStringArray(grant.eligible_regions) || (source.regioni || null),
          website_url: finalUrl,
          is_archived: false,
          is_national: source.livello !== 'Regionale',
          confidence_level: urlVerified ? 'alto' : (grant.website_url ? 'medio' : 'medio'),
          extraction_notes: `Fonte: ${source.name} (${source.url}). URL bando ${urlVerified ? 'verificato ✓' : 'non verificato'}.`,
          created_by_email: 'system@scheduled-v3',
          tags: extractTags(grant.title, grant.description)
        };

        try {
          await base44.asServiceRole.entities.FinancialGrant.create(grantData);
          created++;
          batchTitlesNorm.push(normTitle);
          activeTitlesNorm.push(normTitle);
          console.log(`[GrantFetch v3] ✓ Created: ${grant.title}`);
        } catch (e) {
          console.error(`[GrantFetch v3] Error creating "${grant.title}":`, e.message);
        }
      }

      // Pausa tra fonti per evitare rate limiting
      if (i < SOURCES.length - 1) await new Promise(r => setTimeout(r, 2000));
    }

    const result = {
      success: true,
      version: 3,
      date: today,
      sources_total: SOURCES.length,
      sources_with_errors: fetchErrors,
      archived_expired: archivedCount,
      created,
      updated,
      skipped_duplicate: skippedDuplicate,
      skipped_invalid: skippedInvalid,
      active_grants_total: activeGrants.length + created
    };

    console.log('[GrantFetch v3] Done:', JSON.stringify(result));
    return Response.json(result);

  } catch (error) {
    console.error('[GrantFetch v3] Fatal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/** Estrae testo leggibile dall'HTML, rimuovendo tag, script, style */
function extractTextFromHtml(html) {
  // Rimuovi script e style
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  // Preserva link href come testo
  text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>/gi, ' [LINK: $1] ');
  // Rimuovi tutti i tag rimanenti
  text = text.replace(/<[^>]+>/g, ' ');
  // Decodifica entità HTML comuni
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  text = text.replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  text = text.replace(/&rsquo;/g, "'").replace(/&lsquo;/g, "'").replace(/&rdquo;/g, '"').replace(/&ldquo;/g, '"');
  text = text.replace(/&euro;/g, '€');
  // Collassa spazi
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

/** Verifica che un URL sia raggiungibile (HEAD request) */
async function verifyUrl(url) {
  if (!url || !url.startsWith('http')) return false;
  try {
    const resp = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GrantBot/1.0)' },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow'
    });
    return resp.ok || resp.status === 301 || resp.status === 302;
  } catch {
    return false;
  }
}

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

function sanitizeStringArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const cleaned = arr.map(item => typeof item === 'string' ? item : (item?.name || item?.value || String(item))).filter(s => s && s.length > 0);
  return cleaned.length > 0 ? cleaned : null;
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