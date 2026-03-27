import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_email } = await req.json();

    if (user_email && user_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: non puoi accedere ai dati di altri utenti' }, { status: 403 });
    }

    const emailToCheck = user_email || user.email;

    // Carica tutti gli ordini welfare dell'utente
    const requests = await base44.entities.WelfareRequest.filter({ user_email: emailToCheck });

    // Filtra quelli con Excel caricato
    const withExcel = requests.filter(r => r.excel_url && r.excel_url.trim() !== '');

    // Per ogni Excel, estrai i dati dei dipendenti
    const allEmployees = []; // { nome, cognome, codice_fiscale, email, importo, tipo_buono, request_id, created_date }

    for (const req of withExcel) {
      try {
        // Determina lo schema in base al tipo di buono
        let jsonSchema;
        if (req.tipo_buono === 'buoni_pasto') {
          jsonSchema = {
            type: "object",
            properties: {
              dipendenti: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    matricola: { type: "string" },
                    nome: { type: "string" },
                    cognome: { type: "string" },
                    codice_fiscale: { type: "string" },
                    email: { type: "string" },
                    valore_buono: { type: "number" },
                    quantita_buoni: { type: "number" }
                  }
                }
              }
            }
          };
        } else {
          // buoni_spesa e buoni_omaggio hanno lo stesso formato
          jsonSchema = {
            type: "object",
            properties: {
              dipendenti: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    nome: { type: "string" },
                    cognome: { type: "string" },
                    email: { type: "string" },
                    importo: { type: "number" },
                    codice_fiscale: { type: "string" }
                  }
                }
              }
            }
          };
        }

        const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url: req.excel_url,
          json_schema: jsonSchema
        });

        if (extracted.status === 'success' && extracted.output?.dipendenti) {
          for (const dip of extracted.output.dipendenti) {
            let importo = 0;
            if (req.tipo_buono === 'buoni_pasto') {
              importo = (dip.valore_buono || 0) * (dip.quantita_buoni || 0);
            } else {
              importo = dip.importo || 0;
            }

            allEmployees.push({
              nome: (dip.nome || '').trim(),
              cognome: (dip.cognome || '').trim(),
              codice_fiscale: (dip.codice_fiscale || '').trim().toUpperCase(),
              email: (dip.email || '').trim().toLowerCase(),
              importo,
              tipo_buono: req.tipo_buono,
              request_id: req.id,
              created_date: req.created_date,
              valore_buono: dip.valore_buono || null,
              quantita_buoni: dip.quantita_buoni || null,
            });
          }
        }
      } catch (e) {
        console.error(`Errore estrazione Excel per request ${req.id}:`, e.message);
      }
    }

    // Aggrega per dipendente (chiave: codice_fiscale se presente, altrimenti nome+cognome)
    const aggregated = {};
    for (const emp of allEmployees) {
      const key = emp.codice_fiscale || `${emp.nome}_${emp.cognome}`.toLowerCase();
      if (!key || key === '_') continue;

      if (!aggregated[key]) {
        aggregated[key] = {
          nome: emp.nome,
          cognome: emp.cognome,
          codice_fiscale: emp.codice_fiscale,
          email: emp.email,
          totali: { buoni_pasto: 0, buoni_spesa: 0, buoni_omaggio: 0 },
          dettagli: []
        };
      }
      aggregated[key].totali[emp.tipo_buono] = (aggregated[key].totali[emp.tipo_buono] || 0) + emp.importo;
      aggregated[key].dettagli.push({
        tipo_buono: emp.tipo_buono,
        importo: emp.importo,
        request_id: emp.request_id,
        created_date: emp.created_date
      });
    }

    // Verifica superamenti soglie
    const SOGLIA_FRINGE = 1000; // senza figli
    const SOGLIA_FRINGE_FIGLI = 2000; // con figli
    const SOGLIA_OMAGGIO = 50; // per singolo omaggio

    const alerts = [];
    const employeeSummary = [];

    for (const [key, data] of Object.entries(aggregated)) {
      const nomeCompleto = `${data.nome} ${data.cognome}`.trim() || data.codice_fiscale || data.email;
      
      const summary = {
        nome: nomeCompleto,
        codice_fiscale: data.codice_fiscale,
        email: data.email,
        totale_buoni_spesa: data.totali.buoni_spesa,
        totale_buoni_pasto: data.totali.buoni_pasto,
        totale_buoni_omaggio: data.totali.buoni_omaggio,
        alerts: []
      };

      // Check fringe benefit (buoni spesa): soglia €1.000 / €2.000
      if (data.totali.buoni_spesa > SOGLIA_FRINGE) {
        const alert = {
          tipo: 'fringe_superamento',
          dipendente: nomeCompleto,
          codice_fiscale: data.codice_fiscale,
          totale: data.totali.buoni_spesa,
          soglia: SOGLIA_FRINGE,
          messaggio: `${nomeCompleto} ha ricevuto €${data.totali.buoni_spesa.toLocaleString('it-IT', {minimumFractionDigits:2})} in buoni spesa — SUPERA la soglia di €${SOGLIA_FRINGE} (senza figli). Se non ha figli a carico, l'INTERO importo diventa tassabile (art. 51, c.3 TUIR).`
        };
        // Se supera anche la soglia con figli
        if (data.totali.buoni_spesa > SOGLIA_FRINGE_FIGLI) {
          alert.messaggio = `${nomeCompleto} ha ricevuto €${data.totali.buoni_spesa.toLocaleString('it-IT', {minimumFractionDigits:2})} in buoni spesa — SUPERA ANCHE la soglia di €${SOGLIA_FRINGE_FIGLI} (con figli a carico). L'INTERO importo diventa tassabile.`;
          alert.soglia = SOGLIA_FRINGE_FIGLI;
          alert.severity = 'critical';
        } else {
          alert.severity = 'warning';
        }
        alerts.push(alert);
        summary.alerts.push(alert);
      }

      // Check buoni omaggio: singolo omaggio > €50
      for (const det of data.dettagli) {
        if (det.tipo_buono === 'buoni_omaggio' && det.importo > SOGLIA_OMAGGIO) {
          const alert = {
            tipo: 'omaggio_superamento',
            dipendente: nomeCompleto,
            importo: det.importo,
            soglia: SOGLIA_OMAGGIO,
            severity: 'warning',
            messaggio: `${nomeCompleto} ha ricevuto un buono omaggio di €${det.importo.toLocaleString('it-IT', {minimumFractionDigits:2})} — supera il limite di €50 per singolo omaggio (art. 108, c.2 TUIR). L'IVA diventa indetraibile e la deducibilità è limitata.`
          };
          alerts.push(alert);
          summary.alerts.push(alert);
        }
      }

      employeeSummary.push(summary);
    }

    // Ordina: prima quelli con alert
    employeeSummary.sort((a, b) => b.alerts.length - a.alerts.length);

    return Response.json({
      total_requests: requests.length,
      total_with_excel: withExcel.length,
      total_employees_found: allEmployees.length,
      employees: employeeSummary,
      alerts,
      totals: {
        buoni_pasto: allEmployees.filter(e => e.tipo_buono === 'buoni_pasto').reduce((s, e) => s + e.importo, 0),
        buoni_spesa: allEmployees.filter(e => e.tipo_buono === 'buoni_spesa').reduce((s, e) => s + e.importo, 0),
        buoni_omaggio: allEmployees.filter(e => e.tipo_buono === 'buoni_omaggio').reduce((s, e) => s + e.importo, 0),
      }
    });
  } catch (error) {
    console.error('analyzeWelfareExcel error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});