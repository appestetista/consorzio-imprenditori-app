import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Lookup deterministico del coefficiente di redditività forfettario
// Fonte: Allegato 4, art.1 comma 64, L.190/2014 (Agenzia delle Entrate)
//
// Algoritmo: dato un codice ATECO (es. "62.01.00"), estrae la divisione (prime 2 cifre, es. "62")
// e il gruppo (es. "62.0" o "47.81") e li confronta con i 9 gruppi ufficiali caricati in DB.
// La priorità è: match su codici_specifici (es. "47.81") > match su codici_divisione (es. "62").

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { codice_ateco } = await req.json();
    if (!codice_ateco) {
      return Response.json({ error: 'codice_ateco obbligatorio' }, { status: 400 });
    }

    // Carica tutti i 9 gruppi dal DB
    const gruppi = await base44.asServiceRole.entities.CoefficienteRedditivita.filter({});
    if (gruppi.length === 0) {
      return Response.json({ error: 'Tabella CoefficienteRedditivita vuota nel DB' }, { status: 500 });
    }

    // Estrai parti del codice ATECO: "62.01.00" → divisione="62", gruppo="62.0", sottogruppo="62.01"
    const parts = codice_ateco.replace(/\s/g, '').split('.');
    const divisione = parts[0]; // "62"
    const gruppo = parts.length > 1 ? `${parts[0]}.${parts[1]}` : null; // "62.01"
    const gruppoCorto = parts.length > 1 ? `${parts[0]}.${parts[1][0]}` : null; // "62.0"
    
    // Cerca match specifico prima (es. 47.81, 47.82)
    let matchedGruppo = null;
    
    // Priorità 1: match esatto su codici_specifici (es. "47.81")
    for (const g of gruppi) {
      const specifici = g.codici_specifici || [];
      for (const spec of specifici) {
        // Match esatto o prefisso (es. "46.1" matcha "46.11", "46.12", ecc.)
        if (codice_ateco.startsWith(spec) || (gruppo && gruppo.startsWith(spec))) {
          matchedGruppo = g;
          break;
        }
      }
      if (matchedGruppo) break;
    }

    // Priorità 2: match su codici_divisione (es. "62")
    if (!matchedGruppo) {
      for (const g of gruppi) {
        const divisioni = g.codici_divisione || [];
        if (divisioni.includes(divisione)) {
          matchedGruppo = g;
          break;
        }
      }
    }

    // Priorità 3: fallback al gruppo 9 "Altre attività economiche" (67%)
    if (!matchedGruppo) {
      matchedGruppo = gruppi.find(g => g.gruppo === 9);
    }

    if (!matchedGruppo) {
      return Response.json({ error: 'Impossibile determinare il coefficiente' }, { status: 500 });
    }

    return Response.json({
      success: true,
      codice_ateco,
      coefficiente: matchedGruppo.coefficiente,
      coefficiente_percentuale: `${(matchedGruppo.coefficiente * 100).toFixed(0)}%`,
      gruppo: matchedGruppo.gruppo,
      settore: matchedGruppo.settore,
      fonte_normativa: matchedGruppo.fonte_normativa
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});