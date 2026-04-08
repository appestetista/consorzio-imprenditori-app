import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * fetchGrantsFromIncentivi v3 — FETCH MANUALE ADMIN
 * Stessa architettura di scheduledGrantFetch v3:
 * 1. Scarica HTML reale da fonti istituzionali
 * 2. LLM analizza SOLO il contenuto scaricato
 * 3. Validazione URL per ogni bando
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const sourceUrl = body.source_url; // URL opzionale per fetch mirato

    const today = new Date().toISOString().split('T')[0];

    // Fonti da scansionare
    const sources = sourceUrl
      ? [{ name: 'Custom', url: sourceUrl, livello: 'Nazionale', ente: 'Stato' }]
      : [
          { name: 'Incentivi.gov.it', url: 'https://www.incentivi.gov.it/it/incentivi', livello: 'Nazionale', ente: 'Stato' },
          { name: 'Invitalia', url: 'https://www.invitalia.it/cosa-facciamo/creiamo-nuove-aziende', livello: 'Nazionale', ente: 'Stato' },
          { name: 'MIMIT', url: 'https://www.mimit.gov.it/it/incentivi', livello: 'Nazionale', ente: 'Stato' },
          { name: 'SIMEST', url: 'https://www.simest.it/prodotti', livello: 'Nazionale', ente: 'Stato' },
        ];

    // Bandi esistenti per dedup
    const activeGrants = await base44.asServiceRole.entities.FinancialGrant.filter({ is_archived: false }, '-created_date', 300);
    const activeTitlesNorm = activeGrants.map(g => normalizeTitle(g.title));

    let totalCreated = 0, totalSkipped = 0, totalErrors = 0;
    const results = [];

    for (const source of sources) {
      console.log(`Fetching: ${source.name} (${source.url})`);

      // Fetch HTML reale
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
          results.push({ source: source.name, error: `HTTP ${resp.status}` });
          totalErrors++;
          continue;
        }

        const html = await resp.text();
        pageContent = extractTextFromHtml(html);
        if (pageContent.length < 100) {
          results.push({ source: source.name, error: 'Contenuto troppo breve' });
          totalErrors++;
          continue;
        }
        if (pageContent.length > 12000) pageContent = pageContent.substring(0, 12000);
      } catch (fetchErr) {
        results.push({ source: source.name, error: fetchErr.message });
        totalErrors++;
        continue;
      }

      // LLM analizza SOLO il contenuto scaricato
      let grants = [];
      try {
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Analizza il seguente contenuto HTML estratto dal sito "${source.name}" (${source.url}).

REGOLE:
1. Estrai SOLO bandi/incentivi ESPLICITAMENTE presenti nel testo
2. NON inventare — se un dato non è nel testo, metti null
3. Titoli ESATTI come appaiono
4. Date solo se esplicitamente presenti (YYYY-MM-DD)
5. Importi solo se esplicitamente presenti

CONTENUTO:
---
${pageContent}
---`,
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
                    confidence_level: { type: "string" }
                  }
                }
              }
            }
          }
        });

        if (result?.grants) grants = result.grants;
      } catch (llmErr) {
        results.push({ source: source.name, error: `LLM: ${llmErr.message}` });
        totalErrors++;
        continue;
      }

      let sourceCreated = 0;
      for (const grant of grants) {
        if (!grant.title || grant.title.trim().length < 5) continue;
        if (grant.deadline && grant.deadline < today) continue;

        const normTitle = normalizeTitle(grant.title);
        if (activeTitlesNorm.some(ex => titleOverlap(ex, normTitle) > 0.70)) {
          totalSkipped++;
          continue;
        }

        // Verifica URL
        let urlVerified = false;
        if (grant.website_url) {
          urlVerified = await verifyUrl(grant.website_url);
        }

        const grantData = {
          title: grant.title.trim(),
          description: (grant.description || '').substring(0, 500),
          ente_erogatore: source.ente,
          livello: source.livello,
          grant_type: validateEnum(grant.grant_type, ['Digitalizzazione', 'Innovazione', 'Ricerca e Sviluppo', 'Energia/Sostenibilità', 'Internazionalizzazione', 'Altro'], 'Altro'),
          funding_type: validateEnum(grant.funding_type, ['Contributo a fondo perduto', 'Finanziamento agevolato', "Credito d'imposta", 'Misto'], 'Contributo a fondo perduto'),
          coverage_percentage: (typeof grant.coverage_percentage === 'number' && grant.coverage_percentage > 0 && grant.coverage_percentage <= 100) ? grant.coverage_percentage : null,
          min_amount: (typeof grant.min_amount === 'number' && grant.min_amount > 0) ? grant.min_amount : null,
          max_amount: (typeof grant.max_amount === 'number' && grant.max_amount > 0) ? grant.max_amount : null,
          status: 'Aperto',
          deadline: isValidDate(grant.deadline) ? grant.deadline : null,
          access_mode: 'Sportello',
          requires_cofinancing: false,
          eligible_company_sizes: sanitizeStringArray(grant.eligible_company_sizes),
          eligible_regions: sanitizeStringArray(grant.eligible_regions),
          website_url: urlVerified ? grant.website_url : source.url,
          is_archived: false,
          is_national: source.livello !== 'Regionale',
          confidence_level: urlVerified ? 'alto' : 'medio',
          extraction_notes: `Fonte: ${source.name}. URL ${urlVerified ? 'verificato ✓' : 'non verificato'}.`,
          created_by_email: user.email
        };

        await base44.asServiceRole.entities.FinancialGrant.create(grantData);
        sourceCreated++;
        activeTitlesNorm.push(normTitle);
      }

      totalCreated += sourceCreated;
      results.push({ source: source.name, extracted: grants.length, created: sourceCreated });
    }

    return Response.json({
      success: true,
      version: 3,
      total_created: totalCreated,
      total_skipped: totalSkipped,
      total_errors: totalErrors,
      sources: results
    });

  } catch (error) {
    console.error('Error in fetchGrantsFromIncentivi:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function extractTextFromHtml(html) {
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>/gi, ' [LINK: $1] ');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  text = text.replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  text = text.replace(/&euro;/g, '€');
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

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