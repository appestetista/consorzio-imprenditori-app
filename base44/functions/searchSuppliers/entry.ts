import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { request_id } = await req.json();
    if (!request_id) {
      return Response.json({ error: 'request_id required' }, { status: 400 });
    }

    // Fetch the supplier request
    const requests = await base44.entities.SupplierRequest.filter({ id: request_id });
    const supplierRequest = requests[0];
    if (!supplierRequest) {
      return Response.json({ error: 'Request not found' }, { status: 404 });
    }

    // Only the author can search
    if (supplierRequest.author_email !== user.email) {
      return Response.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Update status to searching
    await base44.entities.SupplierRequest.update(request_id, {
      status: 'ricerca_in_corso'
    });

    const locality = supplierRequest.locality || 'Italia';
    const category = supplierRequest.category || supplierRequest.service_type;
    const radiusKm = supplierRequest.radius_km || 50;

    // Use LLM with internet to find real suppliers
    const searchPrompt = `Sei un esperto di ricerca fornitori aziendali in Italia.

OBIETTIVO: Trova da 5 a 10 fornitori REALI nella categoria "${category}" nella zona di ${locality} (raggio ${radiusKm} km).

CONTESTO RICHIESTA:
- Categoria: ${category}
- Settore: ${supplierRequest.macro_sector || 'Non specificato'}
- Problema dell'imprenditore: ${supplierRequest.problem_to_solve}
- Budget indicativo: ${supplierRequest.budget_range || 'Non specificato'}
- Urgenza: ${supplierRequest.urgency}

ISTRUZIONI CRITICHE:
1. Cerca aziende REALI che operano in Italia nella categoria specificata
2. Per ogni azienda trova il SITO WEB ufficiale e l'EMAIL di contatto aziendale
3. Cerca recensioni Google, rating, e informazioni sulla reputazione
4. Valuta l'affidabilità su scala 1-10 basandoti su: presenza web, recensioni, anni di attività, dimensione
5. NON inventare aziende - cerca solo quelle che esistono davvero
6. Cerca preferibilmente nella zona indicata ma se non trovi abbastanza, allarga a tutta Italia

Per ogni fornitore restituisci:
- name: nome completo dell'azienda
- website: URL del sito web (se trovato)
- email: email di contatto aziendale (se trovata, altrimenti "non_trovata")
- phone: telefono (se trovato)
- city: città sede
- description: breve descrizione di cosa fanno (1-2 frasi)
- rating: rating Google/Trustpilot se disponibile (numero)
- reviews_count: numero recensioni trovate
- years_active: anni stimati di attività
- affidabilita_score: punteggio affidabilità da 1 a 10
- affidabilita_reason: motivazione breve del punteggio`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: searchPrompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          suppliers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                website: { type: "string" },
                email: { type: "string" },
                phone: { type: "string" },
                city: { type: "string" },
                description: { type: "string" },
                rating: { type: "number" },
                reviews_count: { type: "number" },
                years_active: { type: "number" },
                affidabilita_score: { type: "number" },
                affidabilita_reason: { type: "string" }
              }
            }
          },
          search_summary: { type: "string" },
          suggestions: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    // TEST MODE: override all emails for testing
    const TEST_EMAIL_OVERRIDE = 'bertulli.giacomo@gmail.com';

    // Map suppliers to the entity format
    const foundSuppliers = (result.suppliers || []).map(s => ({
      name: s.name,
      website: s.website || '',
      email: TEST_EMAIL_OVERRIDE,
      phone: s.phone || '',
      city: s.city || '',
      description: s.description || '',
      rating: s.rating || 0,
      reviews_count: s.reviews_count || 0,
      years_active: s.years_active || 0,
      affidabilita_score: s.affidabilita_score || 5,
      affidabilita_reason: s.affidabilita_reason || '',
      selected: false,
      quote_sent: false,
      quote_received: false
    }));

    // Update request with found suppliers
    await base44.entities.SupplierRequest.update(request_id, {
      status: 'fornitori_trovati',
      found_suppliers: foundSuppliers,
      ai_suggestions: result.suggestions || []
    });

    return Response.json({
      success: true,
      suppliers_count: foundSuppliers.length,
      suppliers: foundSuppliers,
      search_summary: result.search_summary,
      suggestions: result.suggestions || []
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});